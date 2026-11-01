import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

import test_git_memory as fixtures
import sync_obsidian as sync
from git_memory import MemoryError


class Sync(unittest.TestCase):
    setUp = fixtures.Integration.setUp
    tearDown = fixtures.Integration.tearDown

    def config(self):
        runtime = self.root / "sync-runtime"
        runtime.mkdir()
        view = self.root / "Obsidian-view"
        reader = self.root / "public-reader.git"
        reader.mkdir()
        fixtures.git(reader, "init", "--bare")
        fixtures.git(reader, "config", "cerebro.role", "obsidian-public-reader")
        fixtures.git(reader, "config", "cerebro.allowedRemote", sync.REMOTE)
        (runtime / "config.json").write_text(json.dumps({"public_clone": str(reader), "view_root": str(view)}))
        return runtime, view

    def test_actual_Git_views_replay_conflict_and_offline_preserve_data(self):
        c = self.clients[0]
        n = fixtures.note()
        approval = fixtures.Integration.approval(self, n)
        receipt = c.append(n, n["agent"], approval)
        fixtures.git(self.remote, "update-ref", "refs/heads/cerebro/recepcion-publica", receipt["commit"], "0" * 40)
        runtime, view = self.config()
        def factory(repo, remote, branch):
            return fixtures.gm.GitMemory(repo, str(self.remote), branch)
        first = sync.sync_once(runtime, factory)
        self.assertEqual("complete", first["state"])
        last_success = sync.sync_once(runtime, factory)
        self.assertEqual("complete", last_success["state"])
        document = view / "incorporado" / receipt["commit"] / "aportaciones" / (n["id"] + ".md")
        document.write_text("Local edited note, must survive.\n")
        conflict = sync.sync_once(runtime, factory)
        self.assertEqual("needs_attention_retry_preserving_existing_views", conflict["state"])
        self.assertEqual("Local edited note, must survive.\n", document.read_text())
        def offline(*args):
            raise MemoryError("synthetic_offline")
        after = sync.sync_once(runtime, offline)
        self.assertEqual(last_success["last_complete_success_utc_client"], after["last_complete_success_utc_client"])
        self.assertEqual(receipt["commit"], after["branches"]["incorporado"]["last_successfully_published"]["version"])
        self.assertEqual("Local edited note, must survive.\n", document.read_text())

    def test_concurrent_job_is_skipped_without_deleting_stale_lock_file(self):
        runtime, view = self.config()
        with sync.process_lock(runtime / "sync.lock") as acquired:
            self.assertTrue(acquired)
            self.assertEqual("another_sync_running", sync.sync_once(runtime)["state"])
        # OS release, not deleting a file, makes the next lock available.
        with sync.process_lock(runtime / "sync.lock") as acquired:
            self.assertTrue(acquired)

    def test_lock_released_after_abrupt_process_termination(self):
        runtime, view = self.config()
        code = "import sys,time\nsys.path.insert(0,sys.argv[1])\nfrom sync_obsidian import process_lock\nwith process_lock(sys.argv[2]) as acquired:\n print(int(acquired),flush=True)\n time.sleep(60)\n"
        child = subprocess.Popen([sys.executable, "-c", code, str(Path(sync.__file__).parent), str(runtime / "sync.lock")],
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            self.assertEqual("1", child.stdout.readline().strip())
            child.kill()
            child.wait(timeout=10)
            with sync.process_lock(runtime / "sync.lock") as acquired:
                self.assertTrue(acquired)
        finally:
            if child.poll() is None:
                child.kill()
                child.wait(timeout=10)
            child.stdout.close()
            child.stderr.close()
