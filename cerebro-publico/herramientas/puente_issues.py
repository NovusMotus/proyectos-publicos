"""Public, pre-approved GitHub issue -> durable intake branch. No main merge."""
import base64
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request
import uuid

from git_memory import GitMemory, MemoryError, PREFIX, encode, render, sha

REPOSITORY = "NovusMotus/proyectos-publicos"
REPOSITORY_ID = 1441323384
OWNER_ID = 288483969
REMOTE = "https://github.com/" + REPOSITORY + ".git"
BRANCH = "cerebro/recepcion-publica"


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise MemoryError("duplicate_JSON_field")
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=pairs)


def parse_event(event):
    repo = event.get("repository", {})
    issue = event.get("issue", {})
    if repo.get("id") != REPOSITORY_ID or repo.get("full_name") != REPOSITORY or repo.get("private") is not False:
        raise MemoryError("wrong_public_repository")
    if event.get("action") != "opened" or issue.get("user", {}).get("id") != OWNER_ID or "pull_request" in issue:
        raise MemoryError("event_or_account_not_allowed")
    if issue.get("state") != "open" or type(issue.get("number")) is not int or issue["number"] < 1:
        raise MemoryError("open_issue_required")
    body = issue.get("body")
    if not isinstance(body, str) or len(body.encode()) > 64000:
        raise MemoryError("bounded_JSON_body_required")
    envelope = strict_json(body)
    if not isinstance(envelope, dict) or set(envelope) != {"kind", "release_id", "note"} or envelope["kind"] != "cerebro-contribution-v1":
        raise MemoryError("issue_envelope_schema")
    try:
        if str(uuid.UUID(envelope["release_id"])) != envelope["release_id"]:
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise MemoryError("release_UUID_required") from None
    note = envelope["note"]
    if not isinstance(note, dict) or not isinstance(note.get("agent"), str):
        raise MemoryError("note_required")
    raw = render(note, note["agent"])
    if issue.get("title") != "CEREBRO/1 " + note["id"]:
        raise MemoryError("issue_title_UUID_mismatch")
    return envelope, raw


def authorized_approval(envelope, raw, release):
    # This release is read from trusted main, NEVER from the issue body or a PR checkout.
    expected = {"schema_version": 1, "status": "approved", "id": envelope["release_id"],
                "repository": REPOSITORY, "ref": "refs/heads/" + BRANCH}
    if not isinstance(release, dict) or any(release.get(k) != v for k, v in expected.items()):
        raise MemoryError("trusted_release_required")
    if not isinstance(release.get("approval_record"), str) or not release["approval_record"].strip():
        raise MemoryError("human_approval_record_required")
    records = release.get("notes")
    if not isinstance(records, list) or len(records) > 100:
        raise MemoryError("bounded_release_records_required")
    matches = [x for x in records if isinstance(x, dict) and x.get("id") == envelope["note"]["id"]]
    if len(matches) != 1 or matches[0].get("sha256") != sha(raw):
        raise MemoryError("issue_content_not_preapproved")
    entry = matches[0]
    return {"approved": True, "destination": REMOTE, "ref": "refs/heads/" + BRANCH,
            "path": PREFIX + "/aportaciones/" + entry["id"] + ".md", "sha256": entry["sha256"],
            "review": entry.get("review"), "public_review_sha256": entry.get("public_review_sha256")}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def api(method, suffix, token, value=None):
    request = urllib.request.Request("https://api.github.com/repos/" + REPOSITORY + suffix,
        data=None if value is None else encode(value), method=method,
        headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json", "User-Agent": "Cerebro-reviewed-issue-bridge"})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
        return json.load(response)


def main():
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_REPOSITORY") != REPOSITORY or os.environ.get("GITHUB_REF") != "refs/heads/main":
        raise MemoryError("approved_Actions_environment_required")
    approved_commit = os.environ.get("GITHUB_SHA", "")
    if not re.fullmatch(r"[0-9a-f]{40}", approved_commit):
        raise MemoryError("trusted_main_commit_required")
    token = os.environ.get("GH_TOKEN")
    if not token:
        raise MemoryError("job_token_missing")
    event = strict_json(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch":
        if event.get("sender", {}).get("id") != OWNER_ID:
            raise MemoryError("dispatch_account_not_allowed")
        number = event.get("inputs", {}).get("issue_number", "")
        if not re.fullmatch(r"[1-9][0-9]{0,9}", str(number)):
            raise MemoryError("issue_number_required")
        event = {"repository": event["repository"], "action": "opened", "issue": api("GET", "/issues/" + str(number), token)}
    elif os.environ.get("GITHUB_EVENT_NAME") != "issues":
        raise MemoryError("workflow_event_not_allowed")
    envelope, raw = parse_event(event)
    header = "Authorization: Basic " + base64.b64encode(("x-access-token:" + token).encode()).decode()
    store = GitMemory(Path.cwd(), REMOTE, BRANCH, authentication_header=header)
    if store.git("cat-file", "-t", approved_commit).strip() != b"commit":
        raise MemoryError("trusted_commit_not_fetched")
    release_path = PREFIX + "/liberaciones/" + envelope["release_id"] + ".json"
    release_bytes = store.read_at(approved_commit, release_path)
    if release_bytes is None:
        raise MemoryError("release_not_in_trusted_main")
    approval = authorized_approval(envelope, raw, strict_json(release_bytes))
    receipt = store.append(envelope["note"], envelope["note"]["agent"], approval)
    # A public receipt, not a declaration of integration/approval of the note's conclusions.
    summary = {"state": "received_in_intake_branch_not_merged", "id": receipt["id"],
               "sha256": receipt["sha256"], "commit": receipt["commit"], "replayed": receipt["replayed"],
               "source_issue_number": event["issue"]["number"], "account_id": OWNER_ID}
    api("POST", "/issues/" + str(event["issue"]["number"]) + "/comments", token,
        {"body": "Recepción de memoria: ```json\n" + json.dumps(summary, ensure_ascii=False, indent=2) + "\n```\nNo equivale a una PR fusionada."})
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (MemoryError, ValueError, KeyError, TypeError, OSError, urllib.error.HTTPError):
        # Do not print event bodies, headers, secret values, or raw API errors.
        raise SystemExit("Recepcion no confirmada. Conservar UUID; comprobar rama y reintentar el mismo envelope.") from None
