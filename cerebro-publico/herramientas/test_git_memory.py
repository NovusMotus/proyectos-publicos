"""Integration tests against a real disposable bare Git remote, no network."""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
import uuid

import git_memory as gm


def git(repo, *args):
    command = ["git", "-c", "safe.directory=" + str(repo), "-c", "core.hooksPath=" + os.devnull,
               "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-C", str(repo), *args]
    p = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
    if p.returncode:
        raise RuntimeError("fixture_git_failed_" + args[0])
    return p.stdout


def note(actor="fixture-a", ident=None):
    return {"id": ident or str(uuid.uuid4()), "agent": actor, "provider": "fixture", "tool": "test client",
            "model": "desconocido", "model_evidence": "Synthetic fixture; no model invocation claimed",
            "title": "Aportación ficticia", "body": "Contenido inventado para comprobar el transporte.",
            "authored_at": "2026-11-01T00:00:00Z", "origin_at": "desconocido", "information_cutoff": "desconocido",
            "sources": [], "read_versions": [], "kind": "observation", "visibility": "public"}


class Integration(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="cerebro-git-tests-")
        self.root = Path(self.tmp.name).resolve()
        self.remote = self.root / "remote.git"
        self.remote.mkdir()
        git(self.remote, "init", "--bare", "--initial-branch=main")
        self.clients = []
        seed = self.root / "seed"
        seed.mkdir()
        git(seed, "init", "--initial-branch=main")
        (seed / "README.md").write_text("Fixture, no real project.\n", encoding="utf-8")
        git(seed, "add", "README.md")
        git(seed, "commit", "-m", "fixture")
        git(seed, "push", str(self.remote), "HEAD:refs/heads/main")
        for i in range(4):
            client = self.root / ("client-" + str(i))
            client.mkdir()
            git(client, "init", "--initial-branch=main")
            git(client, "fetch", str(self.remote), "main")
            git(client, "checkout", "-b", "fixture", "FETCH_HEAD")
            self.clients.append(gm.GitMemory(client, str(self.remote), "main"))

    def tearDown(self):
        self.tmp.cleanup()

    def approval(self, n):
        raw = gm.render(n, n["agent"])
        review = {"reviewer": "fixture-reviewer", "tool": "test", "model": "desconocido",
                  "reviewed_at": "2026-11-01T00:00:00Z", "scope": "synthetic fixture", "record": "synthetic test approval only"}
        return {"approved": True, "destination": str(self.remote), "ref": "refs/heads/main",
                "path": gm.PREFIX + "/aportaciones/" + n["id"] + ".md", "sha256": gm.sha(raw),
                "review": review, "public_review_sha256": gm.sha(gm.encode(review))}

    def send(self, client, n, **kwargs):
        return client.append(n, n["agent"], self.approval(n), **kwargs)

    def test_replay_conflict_from_another_working_copy(self):
        n = note()
        first = self.send(self.clients[0], n)
        # Fresh store from another working copy, modelling a lost receipt / restart.
        second = self.send(self.clients[1], n)
        self.assertFalse(first["replayed"])
        self.assertTrue(second["replayed"])
        self.assertEqual(first["sha256"], second["sha256"])
        changed = {**n, "body": "Otro contenido bajo el mismo ID"}
        with self.assertRaisesRegex(gm.MemoryError, "immutable_UUID_conflict"):
            self.send(self.clients[2], changed)
        self.assertEqual(first["commit"], self.clients[0].remote_head())

    def test_concurrent_distinct_ids_from_exact_same_base(self):
        barrier = threading.Barrier(4)
        def gate(attempt, base):
            if attempt == 1:
                barrier.wait(timeout=30)
        notes = [note("fixture-" + str(i)) for i in range(4)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(self.send, c, n, after_base=gate) for c, n in zip(self.clients, notes)]
            receipts = [f.result(timeout=90) for f in futures]
        self.assertTrue(any(r["attempts"] > 1 for r in receipts))
        head = self.clients[0].remote_head()
        for n in notes:
            self.assertEqual(gm.render(n, n["agent"]), self.clients[0].read_at(head, gm.PREFIX + "/aportaciones/" + n["id"] + ".md"))
        catalog = json.loads(self.clients[0].read_at(head, gm.PREFIX + "/CATALOGO_APORTACIONES.json"))
        self.assertEqual(4, len(catalog["contributions"]))
        self.assertEqual(5, int(git(self.remote, "rev-list", "--count", head)))
        for item in catalog["contributions"]:
            self.assertEqual(item["sha256"], gm.sha(self.clients[0].read_at(head, item["path"])))

    def test_concurrent_same_id_is_stored_once(self):
        barrier = threading.Barrier(2)
        def gate(attempt, base):
            if attempt == 1:
                barrier.wait(timeout=30)
        n = note()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            fs = [pool.submit(self.send, c, n, after_base=gate) for c in self.clients[:2]]
            receipts = [f.result(timeout=90) for f in fs]
        self.assertEqual(1, sum(r["replayed"] for r in receipts))
        self.assertEqual(2, int(git(self.remote, "rev-list", "--count", "main")))

    def test_dirty_user_checkout_and_index_untouched(self):
        c = self.clients[0]
        readme = c.repo / "README.md"
        readme.write_text("User edit, preserve.\n", encoding="utf-8")
        (c.repo / "draft.md").write_text("User staged work.\n", encoding="utf-8")
        git(c.repo, "add", "draft.md")
        before = git(c.repo, "status", "--porcelain", "-z")
        old_head = git(c.repo, "rev-parse", "HEAD")
        self.send(c, note())
        self.assertEqual(before, git(c.repo, "status", "--porcelain", "-z"))
        self.assertEqual(old_head, git(c.repo, "rev-parse", "HEAD"))
        self.assertEqual("User edit, preserve.\n", readme.read_text())

    def test_unapproved_or_private_never_sent(self):
        c = self.clients[0]
        old = c.remote_head()
        n = note()
        approval = self.approval(n)
        approval["sha256"] = "0" * 64
        with self.assertRaisesRegex(gm.MemoryError, "exact_release_approval_required"):
            c.append(n, n["agent"], approval)
        private = {**n, "visibility": "private"}
        with self.assertRaisesRegex(gm.MemoryError, "public_transport_only"):
            gm.render(private, private["agent"])
        self.assertEqual(old, c.remote_head())

    def test_push_only_URL_rewrite_is_rejected_before_transmission(self):
        c = self.clients[0]
        alternate = self.root / "alternate.git"
        alternate.mkdir()
        git(alternate, "init", "--bare", "--initial-branch=main")
        git(c.repo, "config", "url." + str(alternate) + ".pushInsteadOf", str(self.remote))
        with self.assertRaisesRegex(gm.MemoryError, "URL_rewrite_configuration_not_allowed"):
            self.send(c, note())
        self.assertEqual(b"", git(alternate, "for-each-ref", "refs/heads"))

    def test_obsidian_view_is_bound_to_exact_Git_bytes(self):
        from obsidian_view import publish_git_view
        c = self.clients[0]
        n = note()
        receipt = self.send(c, n)
        destination = self.root / "view"
        published = publish_git_view(c, receipt["commit"], destination)
        path = destination / receipt["commit"] / "aportaciones" / (n["id"] + ".md")
        self.assertEqual(gm.render(n, n["agent"]), path.read_bytes())
        self.assertEqual(3, published["files"])

    def test_exact_blob_read_from_long_Windows_clone_path(self):
        c = self.clients[0]
        n = note()
        receipt = self.send(c, n)
        long_path = self.root / ("a" * 40) / ("b" * 40) / ("c" * 35)
        long_path.mkdir(parents=True)
        git(long_path, "init", "--initial-branch=main")
        client = gm.GitMemory(long_path, str(self.remote), "main")
        head = client.remote_head()
        self.assertGreater(len(str(long_path)), 150)
        self.assertEqual(gm.render(n, n["agent"]), client.read_at(head, receipt["path"]))

    def test_ambiguous_push_result_does_not_duplicate(self):
        c = self.clients[0]
        original_git = c.git
        injected = []
        def lost_ack(*args, **kwargs):
            result = original_git(*args, **kwargs)
            if args[0] == "push" and not injected:
                self.assertEqual(0, result.returncode)
                injected.append(True)
                return subprocess.CompletedProcess(args, 128, b"", b"simulated response loss after real push")
            return result
        c.git = lost_ack
        n = note()
        receipt = self.send(c, n)
        self.assertTrue(injected)
        self.assertTrue(receipt["replayed"])
        self.assertEqual(2, int(git(self.remote, "rev-list", "--count", "main")))

    def test_concurrent_same_UUID_different_content_conflicts(self):
        barrier = threading.Barrier(2)
        def gate(attempt, base):
            if attempt == 1:
                barrier.wait(timeout=30)
        n = note()
        variants = [n, {**n, "body": "Different content, same UUID"}]
        def attempt(i):
            try:
                return self.send(self.clients[i], variants[i], after_base=gate)
            except gm.MemoryError as e:
                return str(e)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt, range(2)))
        self.assertEqual(1, sum(isinstance(x, dict) for x in results))
        self.assertIn("immutable_UUID_conflict", results)
        self.assertEqual(2, int(git(self.remote, "rev-list", "--count", "main")))

    def test_replay_rejects_catalog_tampering(self):
        c = self.clients[0]
        n = note()
        receipt = self.send(c, n)
        git(c.repo, "checkout", "-B", "tamper-fixture", receipt["commit"])
        catalog = c.repo / gm.PREFIX / "CATALOGO_APORTACIONES.json"
        catalog.write_text("{}\n", encoding="utf-8")
        git(c.repo, "add", str(catalog.relative_to(c.repo)))
        git(c.repo, "commit", "-m", "fixture: broken catalog")
        git(c.repo, "push", str(self.remote), "HEAD:refs/heads/main")
        with self.assertRaisesRegex(gm.MemoryError, "remote_catalog_inconsistent"):
            self.send(c, n)

    def test_invalid_dates_and_identity(self):
        n = note()
        with self.assertRaisesRegex(gm.MemoryError, "invalid_date"):
            gm.render({**n, "origin_at": "2026-02-30T00:00:00Z"}, n["agent"])
        with self.assertRaisesRegex(gm.MemoryError, "actor_mismatch"):
            gm.render(n, "other-actor")
        with self.assertRaisesRegex(gm.MemoryError, "kind_not_allowed"):
            gm.render({**n, "kind": "decision"}, n["agent"])

    def canonical_request(self, base, text):
        request = {"id": str(uuid.uuid4()), "actor": "fixture-integrator", "expected_commit": base,
                   "expected_sha256": None, "path": gm.PREFIX + "/resumenes/fixture.md", "text": text}
        review = self.approval(note())["review"]
        approval = {"approved_request_sha256": gm.sha(gm.encode(request)), "destination": str(self.remote),
                    "ref": "refs/heads/main", "reviewed_base": base, "review": review,
                    "public_review_sha256": gm.sha(gm.encode(review))}
        return request, approval

    def test_canonical_update_replay_and_stale_base_rejection(self):
        c = self.clients[0]
        old = c.remote_head()
        request, approval = self.canonical_request(old, "# Reviewed fictional summary\n")
        result = c.update_canonical(request, approval)
        self.assertFalse(result["replayed"])
        self.assertTrue(self.clients[1].update_canonical(request, approval)["replayed"])
        stale, stale_approval = self.canonical_request(old, "# A competing stale summary\n")
        with self.assertRaisesRegex(gm.MemoryError, "stale_canonical_base"):
            self.clients[1].update_canonical(stale, stale_approval)
        self.assertEqual(request["text"].encode(), c.read_at(c.remote_head(), request["path"]))

    def test_two_canonical_updates_same_base_cannot_silently_overwrite(self):
        base = self.clients[0].remote_head()
        barrier = threading.Barrier(2)
        pairs = [self.canonical_request(base, "# Fictional version " + str(i) + "\n") for i in range(2)]
        def attempt(i):
            try:
                return self.clients[i].update_canonical(*pairs[i], before_push=lambda: barrier.wait(timeout=30))
            except gm.MemoryError as e:
                return str(e)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt, range(2)))
        self.assertEqual(1, sum(isinstance(x, dict) for x in results))
        self.assertIn("canonical_commit_not_confirmed_read_and_review_again", results)
        self.assertEqual(2, int(git(self.remote, "rev-list", "--count", "main")))


if __name__ == "__main__":
    unittest.main(verbosity=2)
