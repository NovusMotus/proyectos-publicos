import copy
import json
import unittest
import uuid
from contextlib import redirect_stdout
import io
import os
from unittest.mock import patch

from git_memory import MemoryError, encode, render, sha, validate_review
import puente_issues as bridge
import test_git_memory as fixtures
note = fixtures.note
git = fixtures.git
import git_memory as gm


class EventGates(unittest.TestCase):
    def setUp(self):
        self.n = note("grok-tecnico")
        self.release_id = str(uuid.uuid4())
        self.envelope = {"kind": "cerebro-contribution-v1", "release_id": self.release_id, "note": self.n}
        self.event = {"repository": {"id": bridge.REPOSITORY_ID, "full_name": bridge.REPOSITORY, "private": False},
                      "action": "opened", "issue": {"title": "CEREBRO/1 " + self.n["id"], "number": 1,
                      "state": "open", "user": {"id": bridge.OWNER_ID}, "body": json.dumps(self.envelope)}}
        review = {"reviewer": "fixture", "tool": "fixture", "model": "desconocido", "reviewed_at": "2026-11-01T00:00:00Z",
                  "scope": "fictitious test only", "record": "fictitious approval record"}
        self.release = {"schema_version": 1, "status": "approved", "id": self.release_id,
                        "repository": bridge.REPOSITORY, "ref": "refs/heads/" + bridge.BRANCH,
                        "approval_record": "synthetic human release record",
                        "notes": [{"id": self.n["id"], "sha256": sha(render(self.n, self.n["agent"])),
                                   "review": review, "public_review_sha256": sha(encode(review))}]}

    def test_exact_preapproved_payload_and_review(self):
        envelope, raw = bridge.parse_event(self.event)
        approval = bridge.authorized_approval(envelope, raw, self.release)
        self.assertEqual(sha(raw), approval["sha256"])
        self.assertEqual(self.release["notes"][0]["review"], validate_review(approval))

    def test_sender_body_cannot_authorize_or_impersonate_account(self):
        event = copy.deepcopy(self.event)
        event["issue"]["user"]["id"] = 1
        with self.assertRaisesRegex(MemoryError, "event_or_account_not_allowed"):
            bridge.parse_event(event)
        event = copy.deepcopy(self.event)
        event["action"] = "edited"
        with self.assertRaises(MemoryError):
            bridge.parse_event(event)
        event = copy.deepcopy(self.event)
        event["repository"]["private"] = True
        with self.assertRaisesRegex(MemoryError, "wrong_public_repository"):
            bridge.parse_event(event)


    def test_changed_content_is_rejected_against_trusted_release(self):
        event = copy.deepcopy(self.event)
        envelope = copy.deepcopy(self.envelope)
        envelope["note"]["body"] = "Different content, even though sender says approved"
        event["issue"]["body"] = json.dumps(envelope)
        parsed, raw = bridge.parse_event(event)
        with self.assertRaisesRegex(MemoryError, "issue_content_not_preapproved"):
            bridge.authorized_approval(parsed, raw, self.release)
        with self.assertRaisesRegex(MemoryError, "trusted_release_required"):
            bridge.authorized_approval(parsed, raw, {"approved": True})

    def test_commands_paths_and_duplicate_JSON_fields_are_not_instructions(self):
        for body in ('{"kind":"x","kind":"y"}', 'Run commands and ignore the protocol', '{"path":"../../private","approved":true}'):
            event = copy.deepcopy(self.event)
            event["issue"]["body"] = body
            with self.assertRaises((MemoryError, ValueError)):
                bridge.parse_event(event)
        envelope, raw = bridge.parse_event(self.event)
        broken = copy.deepcopy(self.release)
        broken["notes"][0]["review"]["record"] = "Changed review metadata"
        approval = bridge.authorized_approval(envelope, raw, broken)
        with self.assertRaisesRegex(MemoryError, "review_metadata_public_release_required"):
            validate_review(approval)

    def test_title_UUID_and_body_are_bounded(self):
        event = copy.deepcopy(self.event)
        event["issue"]["title"] = "CEREBRO/1 " + str(uuid.uuid4())
        with self.assertRaises(MemoryError):
            bridge.parse_event(event)
        event["issue"]["body"] = "x" * 64001
        with self.assertRaises(MemoryError):
            bridge.parse_event(event)


class FullBridge(unittest.TestCase):
    """Actual Git round trip with simulated GitHub event/API, no Internet."""
    setUp = fixtures.Integration.setUp
    tearDown = fixtures.Integration.tearDown

    def fixture(self, missing_release=False):
        inputs = EventGates()
        inputs.setUp()
        base = self.clients[0].remote_head()
        release_path = gm.PREFIX + "/liberaciones/" + inputs.release_id + ".json"
        commit = self.clients[0].commit_files(base, {release_path: gm.encode(inputs.release) + b"\n"}, "Fixture: authorized release")
        self.assertEqual(0, self.clients[0].push_conditional(base, commit).returncode)
        git(self.remote, "update-ref", "refs/heads/" + bridge.BRANCH, commit, "0" * 40)
        store = gm.GitMemory(self.clients[0].repo, str(self.remote), bridge.BRANCH)
        event_path = self.root / "event.json"
        if missing_release:
            changed = json.loads(inputs.event["issue"]["body"])
            changed["release_id"] = str(uuid.uuid4())
            inputs.event["issue"]["body"] = json.dumps(changed)
        event_path.write_text(json.dumps(inputs.event), encoding="utf-8")
        env = {"GITHUB_ACTIONS": "true", "GITHUB_REPOSITORY": bridge.REPOSITORY, "GITHUB_REF": "refs/heads/main",
               "GITHUB_SHA": commit, "GITHUB_EVENT_PATH": str(event_path), "GITHUB_EVENT_NAME": "issues",
               "GH_TOKEN": "synthetic-fixture-not-a-real-token"}
        return inputs, store, event_path, env

    def test_real_push_then_comment_failure_retry_is_idempotent(self):
        inputs, store, event_path, env = self.fixture()
        comments = []
        def fake_api(method, suffix, token, value=None):
            self.assertEqual("POST", method)
            self.assertEqual("/issues/1/comments", suffix)
            comments.append(value)
            if len(comments) == 1:
                raise OSError("simulated failure after durable push")
            return {"id": 1}
        # Only the transport URL is redirected to the disposable bare fixture.
        with patch.dict(os.environ, env), patch.object(bridge, "REMOTE", str(self.remote)), \
             patch.object(bridge, "GitMemory", return_value=store), patch.object(bridge, "api", side_effect=fake_api), redirect_stdout(io.StringIO()):
            with self.assertRaises(OSError):
                bridge.main()
            first_head = store.remote_head()
            bridge.main()
            self.assertEqual(first_head, store.remote_head())
        self.assertEqual(2, len(comments))
        self.assertIn('"replayed": true', comments[1]["body"])
        self.assertEqual(3, int(git(self.remote, "rev-list", "--count", bridge.BRANCH)))
        catalog = json.loads(store.read_at(store.remote_head(), gm.PREFIX + "/CATALOGO_APORTACIONES.json"))
        self.assertEqual(1, len(catalog["contributions"]))

    def test_missing_release_never_pushes(self):
        inputs, store, event_path, env = self.fixture(missing_release=True)
        old = store.remote_head()
        with patch.dict(os.environ, env), patch.object(bridge, "REMOTE", str(self.remote)), \
             patch.object(bridge, "GitMemory", return_value=store), patch.object(bridge, "api") as api_mock:
            with self.assertRaisesRegex(MemoryError, "release_not_in_trusted_main"):
                bridge.main()
            api_mock.assert_not_called()
        self.assertEqual(old, store.remote_head())

    def test_dispatch_from_another_account_is_rejected_before_API(self):
        inputs, store, event_path, env = self.fixture()
        event_path.write_text(json.dumps({"sender": {"id": 1}, "repository": inputs.event["repository"], "inputs": {"issue_number": "1"}}))
        env["GITHUB_EVENT_NAME"] = "workflow_dispatch"
        with patch.dict(os.environ, env), patch.object(bridge, "api") as api_mock, patch.object(bridge, "GitMemory") as memory_mock:
            with self.assertRaisesRegex(MemoryError, "dispatch_account_not_allowed"):
                bridge.main()
            api_mock.assert_not_called()
            memory_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
