"""Pruebas de la capa portable de Claude. Sin red ni GitHub: remoto bare desechable.

Se ejecutan desde la carpeta empaquetada, con git_memory.py junto a claude_capa.py."""
import concurrent.futures
import json
import os
import shutil
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest

import claude_capa as cc

gm = cc.load_transport()
IDENTITY = {"agent": "claude", "provider": "Anthropic", "tool": "fixture: claude_capa",
            "model": "desconocido", "model_evidence": "Fixture sintética; no se invoca ningún modelo"}
SEED = {"cerebro-publico/README.md": "Núcleo ficticio de prueba.\n",
        "cerebro-publico/PROTOCOLO_MEMORIA.md": "Protocolo ficticio de prueba.\n"}
README = "cerebro-publico/README.md"


def git(repo, *args):
    command = ["git", "-c", "safe.directory=" + str(repo), "-c", "core.hooksPath=" + os.devnull,
               "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-C", str(repo), *args]
    p = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
    if p.returncode:
        raise RuntimeError("fixture_git_failed_" + args[0])
    return p.stdout


class ClaudeLayer(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="cc-")
        self.root = Path(self.tmp.name).resolve()
        self.remote = self.root / "remote.git"
        self.remote.mkdir()
        git(self.remote, "init", "--bare", "--initial-branch=main")
        seed = self.root / "seed"
        seed.mkdir()
        git(seed, "init", "--initial-branch=main")
        for name, text in SEED.items():
            (seed / name).parent.mkdir(parents=True, exist_ok=True)
            (seed / name).write_bytes(text.encode("utf-8"))
        git(seed, "add", ".")
        git(seed, "commit", "-m", "fixture")
        git(seed, "push", str(self.remote), "HEAD:refs/heads/main", "HEAD:refs/heads/claude-staging")
        self.commit = git(seed, "rev-parse", "HEAD").decode().strip()
        self.clients = [self.client("c" + str(i)) for i in range(2)]
        self.reads = 0

    def client(self, name):
        path = self.root / name
        path.mkdir()
        git(path, "init", "--initial-branch=main")
        git(path, "fetch", str(self.remote), "main")
        git(path, "checkout", "-b", "fixture", "FETCH_HEAD")
        return gm.GitMemory(cc.check_repo(path), str(self.remote), "claude-staging")

    def tearDown(self):
        self.tmp.cleanup()

    def read(self, store=None, paths=("cerebro-publico",)):
        self.reads += 1
        out = self.root / ("lectura-" + str(self.reads))
        return out, cc.read_commit(gm, store or self.clients[0], self.commit, list(paths), IDENTITY, out)

    def versions(self, out, declared=(README,), **kwargs):
        return cc.verified_read_versions(gm, self.clients[0], out, list(declared), str(self.remote), **kwargs)

    def note(self, versions, **changes):
        fields = dict(title="Observación ficticia", body="Contenido inventado para la prueba.", kind="observation",
                      authored_at="2026-11-01T00:00:00Z", origin_at="desconocido", information_cutoff="desconocido",
                      sources=[], tool=IDENTITY["tool"], model=IDENTITY["model"],
                      model_evidence=IDENTITY["model_evidence"])
        fields.update(changes)
        return cc.build_note(gm, versions, **fields)

    def approve(self, note, raw):
        # Aprobación SINTÉTICA de prueba: en uso real la firma quien Javier designe, no la capa.
        request = cc.approval_request(gm, note, raw, str(self.remote), "claude-staging")
        review = {"reviewer": "fixture-reviewer", "tool": "test", "model": "desconocido",
                  "reviewed_at": "2026-11-01T00:00:00Z", "scope": "synthetic fixture", "record": "synthetic test approval only"}
        return {**request, "approved": True, "review": review, "public_review_sha256": gm.sha(gm.encode(review))}

    def edit_receipt(self, out, change):
        path = out / "recibo.json"
        receipt = json.loads(path.read_text(encoding="utf-8"))
        change(receipt)
        path.write_text(json.dumps(receipt), encoding="utf-8")

    def test_read_exports_exact_bytes_and_does_not_claim_agent_reading(self):
        out, r = self.read()
        self.assertEqual({"type": "git_commit", "id": self.commit}, r["version"])
        for name, text in SEED.items():
            self.assertEqual(text.encode("utf-8"), out.joinpath("textos", *name.split("/")).read_bytes())
        self.assertEqual({d["path"]: d["sha256"] for d in r["program_reception"]["documents"]},
                         {n: gm.sha(t.encode("utf-8")) for n, t in SEED.items()})
        self.assertEqual(cc.NOT_DECLARED, r["agent_reading"])
        self.assertEqual(r, json.loads((out / "recibo.json").read_text(encoding="utf-8")))
        with self.assertRaises(FileExistsError):
            cc.read_commit(gm, self.clients[0], self.commit, ["cerebro-publico"], IDENTITY, out)

    def test_read_rejects_branch_names_and_unknown_commits(self):
        with self.assertRaisesRegex(gm.MemoryError, "exact_commit_required"):
            cc.read_commit(gm, self.clients[0], "main", ["cerebro-publico"], IDENTITY, self.root / "x1")
        with self.assertRaisesRegex(gm.MemoryError, "git_fetch_failed"):
            cc.read_commit(gm, self.clients[0], "1" * 40, ["cerebro-publico"], IDENTITY, self.root / "x2")

    def test_versions_contain_only_documents_the_agent_declares(self):
        out, _ = self.read()
        self.assertEqual([{"type": "git_commit", "id": self.commit, "documents": [README]}], self.versions(out))
        with self.assertRaisesRegex(gm.MemoryError, "agent_read_declaration_required"):
            self.versions(out, declared=())
        with self.assertRaisesRegex(gm.MemoryError, "declared_document_not_received"):
            self.versions(out, declared=("cerebro-publico/OTRO.md",))

    def test_partial_reception_requires_explicit_acceptance(self):
        out, r = self.read(paths=(README, "cerebro-publico/NO_EXISTE.md"))
        self.assertEqual(["cerebro-publico/NO_EXISTE.md"], r["program_reception"]["missing"])
        with self.assertRaisesRegex(gm.MemoryError, "partial_read_requires_explicit_acceptance"):
            self.versions(out)
        self.assertEqual([README], self.versions(out, accept_partial=True)[0]["documents"])

    def test_receipt_json_is_not_taken_as_proof(self):
        out, _ = self.read()
        exported = out / "textos" / "cerebro-publico" / "README.md"
        exported.write_bytes(b"Texto alterado.\n")
        with self.assertRaisesRegex(gm.MemoryError, "exported_text_changed"):
            self.versions(out)
        # Alterar texto y recibo a la vez tampoco basta: se vuelve a leer de Git.
        self.edit_receipt(out, lambda r: r["program_reception"]["documents"][[d["path"] for d in r["program_reception"]["documents"]].index(README)].update(sha256=gm.sha(b"Texto alterado.\n")))
        with self.assertRaisesRegex(gm.MemoryError, "exported_text_differs_from_git"):
            self.versions(out)

    def test_receipt_schema_destination_and_transport_are_validated(self):
        cases = [(lambda r: r.update(destination="https://example.invalid/otro.git"), "read_receipt_destination"),
                 (lambda r: r.update(transport_module_sha256="0" * 64), "read_receipt_transport_version"),
                 (lambda r: r.update(extra=True), "read_receipt_schema"),
                 (lambda r: r["version"].update(type="bundle_sha256"), "read_receipt_schema")]
        for change, error in cases:
            out, _ = self.read()
            self.edit_receipt(out, change)
            with self.assertRaisesRegex(gm.MemoryError, error):
                self.versions(out)
        out, _ = self.read()
        with self.assertRaisesRegex(gm.MemoryError, "read_receipt_destination"):
            cc.verified_read_versions(gm, self.clients[0], out, [README], cc.READ_DESTINATION)

    def test_prepare_builds_common_envelope_and_pending_request(self):
        out, _ = self.read()
        note, raw = self.note(self.versions(out), model="modelo-actual-de-la-sesion")
        self.assertEqual(gm.FIELDS, set(note))
        self.assertEqual(("claude", "Anthropic", "modelo-actual-de-la-sesion"), (note["agent"], note["provider"], note["model"]))
        request = cc.approval_request(gm, note, raw, str(self.remote))
        self.assertEqual((False, None, None), (request["approved"], request["ref"], request["review"]))
        self.assertEqual(gm.sha(gm.render(note, "claude")), request["sha256"])
        with self.assertRaisesRegex(gm.MemoryError, "no_direct_main_push"):
            cc.approval_request(gm, note, raw, str(self.remote), "main")
        before = self.clients[0].remote_head()
        with self.assertRaisesRegex(gm.MemoryError, "exact_release_approval_required"):
            self.clients[0].append(note, "claude", request)
        self.assertEqual(before, self.clients[0].remote_head())

    def test_send_replay_and_conflict_through_the_common_module(self):
        out, _ = self.read()
        versions = self.versions(out)
        note, raw = self.note(versions)
        first = self.clients[0].append(note, "claude", self.approve(note, raw))
        saved = json.loads(json.dumps(note))  # la nota guardada es la que se reenvía: mismo UUID
        second = self.clients[1].append(saved, "claude", self.approve(saved, raw))
        self.assertEqual((False, True), (first["replayed"], second["replayed"]))
        changed, changed_raw = self.note(versions, note_id=note["id"], body="Otro contenido, mismo UUID.")
        with self.assertRaisesRegex(gm.MemoryError, "immutable_UUID_conflict"):
            self.clients[1].append(changed, "claude", self.approve(changed, changed_raw))
        self.assertEqual(raw, self.clients[0].read_at(self.clients[0].remote_head(), first["path"]))

    def test_invalid_dates_and_foreign_actor_rejected(self):
        out, _ = self.read()
        versions = self.versions(out)
        with self.assertRaisesRegex(gm.MemoryError, "invalid_date"):
            self.note(versions, authored_at="2026-02-30T00:00:00Z")
        note, _ = self.note(versions)
        with self.assertRaisesRegex(gm.MemoryError, "actor_mismatch"):
            gm.render({**note, "agent": "codex"}, "claude")

    def test_concurrent_claude_and_other_actor_from_same_base(self):
        barrier = threading.Barrier(2)
        def gate(attempt, base):
            if attempt == 1:
                barrier.wait(timeout=30)
        out, _ = self.read()
        claude_note, claude_raw = self.note(self.versions(out))
        other = {**claude_note, "id": "00000000-0000-4000-8000-000000000001", "agent": "fixture-other", "provider": "fixture"}
        other_raw = gm.render(other, "fixture-other")
        other_approval = {**self.approve(claude_note, claude_raw), "path": gm.PREFIX + "/aportaciones/" + other["id"] + ".md",
                          "sha256": gm.sha(other_raw)}
        jobs = [(self.clients[0], claude_note, "claude", self.approve(claude_note, claude_raw)),
                (self.clients[1], other, "fixture-other", other_approval)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = [f.result(timeout=90) for f in [pool.submit(c.append, n, a, ap, after_base=gate) for c, n, a, ap in jobs]]
        self.assertTrue(any(r["attempts"] > 1 for r in results))
        catalog = json.loads(self.clients[0].read_at(self.clients[0].remote_head(), gm.PREFIX + "/CATALOGO_APORTACIONES.json"))
        self.assertEqual(2, len(catalog["contributions"]))

    def test_long_clone_path_reads_after_transport_fix(self):
        store = self.client("l" * (170 - len(str(self.root))))
        self.assertGreater(len(str(store.repo)), 150)
        out, r = self.read(store=store)
        self.assertEqual(len(SEED), len(r["program_reception"]["documents"]))

    def test_cli_send_blocks_main_before_any_transmission(self):
        before = self.clients[0].remote_head()
        with self.assertRaises(SystemExit) as stop:
            cc.main(["send", "--repo", str(self.clients[0].repo), "--branch", "main", "--note", "n.json",
                     "--approval", "a.json", "--receipt", str(self.root / "r.json")])
        self.assertIn("no_direct_main_push", str(stop.exception))
        self.assertEqual(before, self.clients[0].remote_head())

    def test_guards_on_clone_location_and_transport_version(self):
        with self.assertRaisesRegex(SystemExit, "OneDrive"):
            cc.check_repo(Path.home() / "OneDrive" / "clon")
        with self.assertRaisesRegex(SystemExit, "no coincide"):
            cc.load_transport(expected="0" * 64)


class TransportLoading(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="cc-t-")
        self.root = Path(self.tmp.name).resolve()

    def tearDown(self):
        self.tmp.cleanup()

    def copy_transport(self, folder):
        target = self.root / folder / "git_memory.py"
        target.parent.mkdir()
        shutil.copyfile(cc.transport_path(), target)
        return target

    def test_adjacent_transport_by_default_with_pinned_hash(self):
        self.assertEqual(Path(cc.__file__).resolve().with_name("git_memory.py"), cc.transport_path())
        self.assertEqual(cc.MODULE_SHA256, gm.sha(cc.transport_path().read_bytes()))

    def test_explicit_transport_as_file_or_folder(self):
        target = self.copy_transport("otra-ubicacion")
        for explicit in (target, target.parent):
            module = cc.load_transport(explicit)
            self.assertEqual(str(target), module.__file__)
            self.assertEqual(gm.FIELDS, module.FIELDS)

    def test_missing_or_altered_transport_is_never_executed(self):
        with self.assertRaisesRegex(SystemExit, "No se encuentra"):
            cc.load_transport(self.root / "no-existe")
        target = self.copy_transport("alterado")
        target.write_bytes(target.read_bytes() + b"\nraise SystemExit('ejecutado')\n")
        with self.assertRaisesRegex(SystemExit, "no coincide"):
            cc.load_transport(target)

    def test_cli_uses_the_explicit_transport(self):
        target = self.copy_transport("cli")
        with self.assertRaises(SystemExit) as stop:
            cc.main(["--transport", str(target), "send", "--repo", str(self.root), "--branch", "main",
                     "--note", "n.json", "--approval", "a.json", "--receipt", str(self.root / "r.json")])
        self.assertIn("no_direct_main_push", str(stop.exception))
        with self.assertRaisesRegex(SystemExit, "No se encuentra"):
            cc.main(["--transport", str(self.root / "nada"), "send", "--repo", str(self.root), "--branch", "x",
                     "--note", "n.json", "--approval", "a.json", "--receipt", str(self.root / "r.json")])

    def test_no_dependency_on_the_development_tree(self):
        source = Path(cc.__file__).read_text(encoding="utf-8")
        self.assertNotIn("activacion-cerebro", source)
        self.assertNotIn("parents[", source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
