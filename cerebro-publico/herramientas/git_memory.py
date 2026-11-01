"""Append immutable reviewed contributions using an exact Git ref lease.

No daemon, shared checkout, credential files, shell execution, or force rewrite.
The lease option is used ONLY for a direct child of the expected remote commit.
This module is a transport, not an authentication or privacy-review boundary.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import re
import subprocess
import tempfile
import time
import uuid
from datetime import datetime, timezone


PREFIX = "cerebro-publico"
FIELDS = {"id", "agent", "provider", "tool", "model", "model_evidence", "title", "body",
          "authored_at", "origin_at", "information_cutoff", "sources", "read_versions", "kind", "visibility"}
SHA = re.compile(r"[0-9a-f]{40}(?:[0-9a-f]{24})?\Z")


class MemoryError(Exception):
    pass


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def utc():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def timestamp(value):
    from datetime import datetime
    if value == "desconocido":
        return
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z", value):
        raise MemoryError("UTC_or_unknown_required")
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise MemoryError("invalid_date") from None


def validate_review(approval):
    review = approval.get("review")
    if not isinstance(review, dict) or set(review) != {"reviewer", "tool", "model", "reviewed_at", "scope", "record"}:
        raise MemoryError("structured_review_required")
    if any(not isinstance(v, str) or not v.strip() for v in review.values()):
        raise MemoryError("review_field_required")
    timestamp(review["reviewed_at"])
    if review["reviewed_at"] == "desconocido":
        raise MemoryError("review_date_required")
    if approval.get("public_review_sha256") != sha(encode(review)):
        raise MemoryError("review_metadata_public_release_required")
    return review


def render(note, actor):
    if not isinstance(note, dict) or set(note) != FIELDS:
        raise MemoryError("contribution_schema")
    try:
        if str(uuid.UUID(note["id"])) != note["id"]:
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise MemoryError("UUID_required_before_first_send") from None
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", actor) or note["agent"] != actor:
        raise MemoryError("actor_mismatch")
    if note["visibility"] != "public":
        raise MemoryError("public_transport_only")
    if note["kind"] not in {"observation", "hypothesis", "proposal", "result", "review"}:
        raise MemoryError("kind_not_allowed_no_implicit_decisions")
    for key in FIELDS - {"sources", "read_versions"}:
        if not isinstance(note[key], str) or not note[key].strip() or len(note[key]) > 100000:
            raise MemoryError("invalid_text_field")
    if "\n" in note["title"] or "\r" in note["title"]:
        raise MemoryError("single_line_title_required")
    for key in ("authored_at", "origin_at", "information_cutoff"):
        timestamp(note[key])
    if not isinstance(note["sources"], list) or len(note["sources"]) > 100:
        raise MemoryError("sources_required")
    for source in note["sources"]:
        if not isinstance(source, dict) or set(source) != {"id", "locator", "date"}:
            raise MemoryError("source_schema")
        for key in ("id", "locator"):
            if not isinstance(source[key], str) or not source[key].strip() or len(source[key]) > 4000:
                raise MemoryError("source_field")
        timestamp(source["date"])
    if not isinstance(note["read_versions"], list) or len(note["read_versions"]) > 100:
        raise MemoryError("read_versions_required")
    for version in note["read_versions"]:
        if not isinstance(version, dict) or set(version) != {"type", "id", "documents"}:
            raise MemoryError("read_version_schema")
        if version["type"] not in {"git_commit", "bundle_sha256", "document_sha256"} or not isinstance(version["id"], str):
            raise MemoryError("version_type")
        pattern = r"[0-9a-f]{40}" if version["type"] == "git_commit" else r"[0-9a-f]{64}"
        if not re.fullmatch(pattern, version["id"]):
            raise MemoryError("version_identifier")
        if not isinstance(version["documents"], list) or any(not isinstance(x, str) or not x.strip() for x in version["documents"]):
            raise MemoryError("version_documents")
    header = {k: v for k, v in note.items() if k != "body"}
    lines = ["---"] + [k + ": " + json.dumps(v, ensure_ascii=False) for k, v in sorted(header.items())]
    raw = ("\n".join(lines) + "\n---\n\n# " + note["title"] + "\n\n" + note["body"] + "\n").encode("utf-8")
    if len(raw) > 256000:
        raise MemoryError("contribution_too_large")
    return raw


class GitMemory:
    def __init__(self, repo, remote_url, branch, authentication_header=None):
        self.repo = Path(repo).resolve()
        self.remote_url = remote_url
        self.authentication_header = authentication_header
        if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9/_-]{0,150}", branch) or "//" in branch:
            raise MemoryError("invalid_branch")
        self.ref = "refs/heads/" + branch
        # Explicit destination, never a possibly changed 'origin' or URL rewrite.
        if "\n" in remote_url or remote_url.startswith("-"):
            raise MemoryError("invalid_remote")
        self.env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GCM_INTERACTIVE="never")
        for key in list(self.env):
            if key.startswith("GIT_") and key not in {"GIT_TERMINAL_PROMPT"}:
                del self.env[key]
        self.gitrepo = self.git("rev-parse", "--absolute-git-dir").decode().strip()
        if self.git("rev-parse", "--show-object-format").strip() != b"sha1":
            raise MemoryError("sha1_git_repository_required")
        self.guard_destination()
        if self.git("ls-remote", "--get-url", remote_url).decode().strip() != remote_url:
            raise MemoryError("remote_URL_rewrite_not_allowed")

    def guard_destination(self):
        rewrites = self.git("config", "--get-regexp", r"^url\..*\.(insteadof|pushinsteadof)$", allow_failure=True)
        if rewrites.returncode not in (0, 1):
            raise MemoryError("cannot_verify_git_URL_configuration")
        if rewrites.returncode == 0:
            raise MemoryError("git_URL_rewrite_configuration_not_allowed")

    def git(self, *args, data=None, index=None, allow_failure=False):
        env = self.env.copy()
        if index is not None:
            env["GIT_INDEX_FILE"] = str(index)
        command = ["git", "-c", "safe.directory=" + str(self.repo), "-c", "core.hooksPath=" + os.devnull,
                   "-c", "core.autocrlf=false", "-c", "commit.gpgsign=false", "-c", "core.fsmonitor=false",
                   "-c", "http.followRedirects=false",
                   "-c", "user.name=Cerebro transport", "-c", "user.email=cerebro-transport@users.noreply.github.com",
                   "-C", str(self.repo)]
        if self.authentication_header is not None:
            if self.remote_url != "https://github.com/NovusMotus/proyectos-publicos.git":
                raise MemoryError("workflow_auth_destination_mismatch")
            # Passed in process memory by the job; never persisted in Git config or logs.
            command.extend(["-c", "credential.helper=", "-c", "http.extraheader=",
                            "-c", "http.https://github.com/.extraheader=" + self.authentication_header])
        command.extend(args)
        p = subprocess.run(command, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, timeout=60)
        if p.returncode and not allow_failure:
            # Git stderr may contain host credentials or private paths; retain no raw error output.
            raise MemoryError("git_" + args[0] + "_failed_" + str(p.returncode))
        return p if allow_failure else p.stdout

    def remote_head(self):
        self.guard_destination()
        result = self.git("ls-remote", "--exit-code", self.remote_url, self.ref).decode().splitlines()
        if len(result) != 1:
            raise MemoryError("remote_branch_required")
        oid, ref = result[0].split()
        if not SHA.fullmatch(oid) or ref != self.ref:
            raise MemoryError("unexpected_remote_head")
        self.git("fetch", "--no-tags", "--no-write-fetch-head", self.remote_url, oid)
        return oid

    def read_at(self, commit, path):
        entry = self.git("ls-tree", "-z", commit, "--", path)
        if not entry:
            return None
        fields = entry.removesuffix(b"\0").split(b"\t", 1)
        if len(fields) != 2 or fields[1].decode() != path or not fields[0].startswith(b"100644 blob "):
            raise MemoryError("regular_blob_required")
        blob = fields[0].split()[2].decode()
        if not re.fullmatch(r"[0-9a-f]{40}", blob):
            raise MemoryError("Git_blob_required")
        # A blob OID avoids Windows git-show path expansion / MAX_PATH failures.
        return self.git("cat-file", "blob", blob)

    def index_for(self, base, new_path=None, new_raw=None):
        root = PREFIX + "/aportaciones/"
        result = []
        paths = self.git("ls-tree", "-r", "--name-only", "-z", base, "--", root).decode().split("\0")
        for path in filter(None, paths):
            if not re.fullmatch(re.escape(root) + r"[0-9a-f-]{36}\.md", path):
                raise MemoryError("unrecognized_contribution_path")
            raw = self.read_at(base, path)
            result.append({"path": path, "sha256": sha(raw)})
        if new_path is not None:
            result.append({"path": new_path, "sha256": sha(new_raw)})
        return encode({"schema_version": 1, "contributions": sorted(result, key=lambda x: x["path"])}) + b"\n"

    def read_receipt(self, head, ident, content_hash):
        if self.read_at(head, PREFIX + "/CATALOGO_APORTACIONES.json") != self.index_for(head):
            raise MemoryError("remote_catalog_inconsistent")
        raw = self.read_at(head, PREFIX + "/recibos/" + ident + ".json")
        if raw is None:
            raise MemoryError("remote_receipt_missing")
        receipt = json.loads(raw)
        if receipt.get("id") != ident or receipt.get("sha256") != content_hash:
            raise MemoryError("remote_receipt_mismatch")
        return receipt

    def commit_files(self, base, files, message):
        with tempfile.TemporaryDirectory(prefix="cerebro-index-") as tmp:
            index = Path(tmp) / "index"
            self.git("read-tree", base, index=index)
            for name, content in files.items():
                blob = self.git("hash-object", "-w", "--stdin", data=content).decode().strip()
                self.git("update-index", "--add", "--cacheinfo", "100644", blob, name, index=index)
            tree = self.git("write-tree", index=index).decode().strip()
            commit = self.git("commit-tree", tree, "-p", base, data=(message + "\n").encode()).decode().strip()
        if self.git("rev-list", "--parents", "-n", "1", commit).decode().split() != [commit, base]:
            raise MemoryError("direct_child_required")
        return commit

    def push_conditional(self, base, commit):
        if self.git("rev-list", "--parents", "-n", "1", commit).decode().split() != [commit, base]:
            raise MemoryError("direct_child_required")
        self.guard_destination()
        return self.git("push", "--porcelain", "--force-with-lease=" + self.ref + ":" + base,
                        self.remote_url, commit + ":" + self.ref, allow_failure=True)

    def update_canonical(self, request, approval, before_push=None):
        """No semantic auto-merge: a competing commit requires reading/reviewing a new base."""
        required = {"id", "actor", "expected_commit", "expected_sha256", "path", "text"}
        if not isinstance(request, dict) or set(request) != required:
            raise MemoryError("canonical_request_schema")
        try:
            if str(uuid.UUID(request["id"])) != request["id"]:
                raise ValueError()
        except (ValueError, TypeError, AttributeError):
            raise MemoryError("canonical_UUID_required") from None
        path = request["path"]
        allowed = {PREFIX + "/" + n for n in ("README.md", "PROTOCOLO_MEMORIA.md", "INDICE_MEMORIA.md")}
        if not isinstance(path, str) or (path not in allowed and not re.fullmatch(PREFIX + r"/resumenes/[a-z0-9-]+\.md", path)):
            raise MemoryError("canonical_path_not_allowed")
        if not isinstance(request["actor"], str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", request["actor"]):
            raise MemoryError("canonical_actor")
        if not isinstance(request["expected_commit"], str) or not re.fullmatch(r"[0-9a-f]{40}", request["expected_commit"]):
            raise MemoryError("expected_commit_required")
        if not isinstance(request["text"], str) or not request["text"].strip() or len(request["text"].encode()) > 256000:
            raise MemoryError("canonical_content_required")
        request_hash = sha(encode(request))
        required_approval = {"approved_request_sha256": request_hash, "destination": self.remote_url,
                             "ref": self.ref, "reviewed_base": request["expected_commit"]}
        if not isinstance(approval, dict) or any(approval.get(k) != v for k, v in required_approval.items()):
            raise MemoryError("exact_canonical_review_approval_required")
        review = validate_review(approval)
        operation_path = PREFIX + "/cambios-canonicos/" + request["id"] + ".json"
        base = self.remote_head()
        existing = self.read_at(base, operation_path)
        if existing is not None:
            record = json.loads(existing)
            if record.get("request_sha256") != request_hash:
                raise MemoryError("immutable_operation_conflict")
            return {"replayed": True, "commit_observed": base, "record": record}
        if base != request["expected_commit"]:
            raise MemoryError("stale_canonical_base_read_and_review_again")
        current = self.read_at(base, path)
        if request["expected_sha256"] != (None if current is None else sha(current)):
            raise MemoryError("canonical_content_version_mismatch")
        record = {"id": request["id"], "actor_declared": request["actor"], "path": path,
                  "request_sha256": request_hash, "base_commit": base, "new_sha256": sha(request["text"].encode()),
                  "recorded_at_utc_client": utc(), "review": review, "approval_sha256": sha(encode(approval))}
        commit = self.commit_files(base, {path: request["text"].encode(), operation_path: encode(record) + b"\n"},
                                   "Cerebro: revision canonica " + request["id"])
        if before_push is not None:
            before_push()
        pushed = self.push_conditional(base, commit)
        head = self.remote_head()
        received = self.read_at(head, operation_path)
        if received is not None and json.loads(received).get("request_sha256") == request_hash:
            return {"replayed": pushed.returncode != 0, "commit_observed": head, "record": json.loads(received)}
        raise MemoryError("canonical_commit_not_confirmed_read_and_review_again")

    def append(self, note, actor, approval, max_attempts=12, after_base=None):
        raw = render(note, actor)
        path = PREFIX + "/aportaciones/" + note["id"] + ".md"
        content_hash = sha(raw)
        expected_approval = {"approved": True, "destination": self.remote_url, "ref": self.ref,
                             "path": path, "sha256": content_hash}
        if not isinstance(approval, dict) or any(approval.get(k) != v for k, v in expected_approval.items()):
            raise MemoryError("exact_release_approval_required")
        review = validate_review(approval)
        for attempt in range(1, max_attempts + 1):
            base = self.remote_head()
            existing = self.read_at(base, path)
            if existing is not None:
                if existing != raw:
                    raise MemoryError("immutable_UUID_conflict")
                stored_receipt = self.read_receipt(base, note["id"], content_hash)
                return {"id": note["id"], "path": path, "sha256": content_hash,
                        "commit": base, "replayed": True, "attempts": attempt,
                        "observed_at_utc_client": utc(), "stored_receipt": stored_receipt,
                        "identity": "actor_declared_by_client_not_cryptographically_attested"}
            if after_base is not None:
                after_base(attempt, base)
            stored_receipt = {"id": note["id"], "sha256": content_hash, "actor_declared": actor,
                              "submission_recorded_at_utc_client": utc(), "clock_source": "client_clock_not_GitHub_server",
                              "review": review, "release_approval_sha256": sha(encode(approval))}
            files = {path: raw, PREFIX + "/CATALOGO_APORTACIONES.json": self.index_for(base, path, raw),
                     PREFIX + "/recibos/" + note["id"] + ".json": encode(stored_receipt) + b"\n"}
            # An independent index leaves HEAD, the user's index and dirty worktree untouched.
            commit = self.commit_files(base, files, "Cerebro: aporte " + note["id"])
            # Exact old-OID lease, with a checked direct child. Cannot discard a competing commit.
            pushed = self.push_conditional(base, commit)
            if pushed.returncode == 0:
                head = self.remote_head()
                if self.read_at(head, path) != raw:
                    raise MemoryError("remote_readback_failed")
                stored_receipt = self.read_receipt(head, note["id"], content_hash)
                return {"id": note["id"], "path": path, "sha256": content_hash,
                        "commit": commit, "observed_head": head, "replayed": False, "attempts": attempt,
                        "observed_at_utc_client": utc(), "stored_receipt": stored_receipt,
                        "identity": "actor_declared_by_client_not_cryptographically_attested"}
            # Includes ambiguous lost responses. Re-read before retry; UUID remains unchanged.
            time.sleep(random.uniform(0.01, 0.06) * attempt)
        raise MemoryError("retry_limit_reached_retry_same_UUID_later")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--actor", required=True)
    parser.add_argument("--note", required=True)
    parser.add_argument("--approval", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()
    # Public transport only; no caller-supplied host or private repository.
    destination = "https://github.com/NovusMotus/proyectos-publicos.git"
    if args.branch == "main":
        raise MemoryError("reviewed_staging_branch_required_no_direct_main_push")
    store = GitMemory(args.repo, destination, args.branch)
    note = json.loads(Path(args.note).read_text(encoding="utf-8"))
    approval = json.loads(Path(args.approval).read_text(encoding="utf-8"))
    result = store.append(note, args.actor, approval)
    receipt = Path(args.receipt)
    receipt.parent.mkdir(parents=True, exist_ok=True)
    with receipt.open("xb") as f:
        f.write(encode(result) + b"\n")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (MemoryError, subprocess.TimeoutExpired):
        raise SystemExit("Operacion no confirmada: conservar UUID y consultar estado antes de reintentar.") from None
