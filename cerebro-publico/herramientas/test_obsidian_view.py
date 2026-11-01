import concurrent.futures
from pathlib import Path
import tempfile
import unittest

from obsidian_view import publish_view, ViewConflict


class Views(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="cerebro-views-")
        self.root = Path(self.tmp.name) / "vista"
        self.version = "a" * 40
        self.docs = {"README.md": b"# Public fixture\n", "informes/nota.md": b"Invented content.\n"}

    def tearDown(self):
        self.tmp.cleanup()

    def test_complete_snapshot_replay_and_new_version_preserve_edits(self):
        first = publish_view(self.root, self.version, self.docs)
        self.assertFalse(first["replayed"])
        self.assertTrue(publish_view(self.root, self.version, self.docs)["replayed"])
        edited = self.root / self.version / "README.md"
        edited.write_text("My local edit\n")
        with self.assertRaisesRegex(ViewConflict, "existing_view_edited"):
            publish_view(self.root, self.version, self.docs)
        publish_view(self.root, "b" * 40, {**self.docs, "README.md": b"New public version\n"})
        self.assertEqual("My local edit\n", edited.read_text())

    def test_concurrent_same_snapshot_never_partial_or_duplicated(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            receipts = list(pool.map(lambda _: publish_view(self.root, self.version, self.docs), range(4)))
        self.assertTrue(any(not r["replayed"] for r in receipts))
        self.assertEqual(self.docs["README.md"], (self.root / self.version / "README.md").read_bytes())
        self.assertEqual(self.docs["informes/nota.md"], (self.root / self.version / "informes/nota.md").read_bytes())
        self.assertEqual([self.version], sorted(p.name for p in self.root.iterdir()))

    def test_public_view_rejects_escape_and_collisions(self):
        for name in ("../private.md", ".git/config.json", "C:/private.md", "x\\private.md"):
            with self.assertRaises(ViewConflict):
                publish_view(self.root, self.version, {name: b"fixture"})
        with self.assertRaises(ViewConflict):
            publish_view(self.root, self.version, {"A.md": b"a", "a.md": b"b"})
        with self.assertRaisesRegex(ViewConflict, "ambiguous_portable_components"):
            publish_view(self.root, self.version, {"a/x.md": b"a", "A/y.md": b"b"})


if __name__ == "__main__":
    unittest.main(verbosity=2)
