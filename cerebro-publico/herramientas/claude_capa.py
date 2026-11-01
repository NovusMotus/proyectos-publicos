"""Capa de Claude sobre el transporte común git_memory.py, que no modifica ni sustituye.

  read     Recepción por programa: lee un commit exacto con GitMemory.read_at, comprueba el SHA-256 de
           cada documento y EXPORTA sus bytes a una carpeta nueva junto con recibo.json. Que el programa
           reciba un texto no prueba que el agente lo haya leído; el recibo no lo afirma.
  prepare  Lectura declarada por el agente: solo admite documentos que el agente declara haber leído de
           esa exportación. Antes de formar read_versions valida esquema, destino público y versión del
           transporte del recibo, comprueba los bytes exportados y los vuelve a leer de Git: el JSON no se
           toma como prueba. Un recibo con documentos ausentes exige --accept-partial. Construye el sobre
           común (gm.FIELDS) con el modelo ACTUAL indicado y un UUID nuevo, guardado antes del primer
           envío, y deja la solicitud de aprobación con approved=false: la capa no aprueba.
  send     Ejecuta el CLI del propio módulo (destino fijo y main bloqueado allí) con la nota guardada y la
           aprobación que firme quien corresponda. Un reenvío usa la misma nota, nunca otro UUID.

Versión portable. El transporte es git_memory.py junto a este archivo o el que indique --transport (archivo
o carpeta); no se busca en ningún otro sitio. En ambos casos solo se ejecuta si su SHA-256 coincide con
MODULE_SHA256. El clon va fuera de OneDrive.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import types
import uuid

TRANSPORT_FILE = "git_memory.py"
MODULE_SHA256 = "8ad16b956813331a849d66325b70d0f6e15257f4ddf0a98711146b0271767925"
READ_DESTINATION = "https://github.com/NovusMotus/proyectos-publicos.git"
ACTOR = "claude"
RECEIPT_SCHEMA = "claude-recepcion/2"
RECEIPT_KEYS = {"schema", "version", "destination", "transport_module_sha256", "program_reception",
                "agent_reading", "identity"}
RECEPTION_KEYS = {"documents", "missing", "received_at_utc_client"}
NOT_DECLARED = "not_declared_program_reception_only"


def transport_path(explicit=None):
    if explicit is None:
        return Path(__file__).resolve().with_name(TRANSPORT_FILE)
    path = Path(explicit)
    return path / TRANSPORT_FILE if path.is_dir() else path


def load_transport(explicit=None, expected=MODULE_SHA256):
    # Se ejecutan exactamente los bytes comprobados: ni un cambio posterior ni caché .pyc.
    source = transport_path(explicit)
    try:
        data = source.read_bytes()
    except OSError:
        raise SystemExit("No se encuentra git_memory.py junto a la capa ni en --transport.") from None
    if hashlib.sha256(data).hexdigest() != expected:
        raise SystemExit("git_memory.py no coincide con la versión revisada; no se usa.")
    module = types.ModuleType("git_memory")
    module.__file__ = str(source)
    exec(compile(data, str(source), "exec"), module.__dict__)
    return module


def check_repo(path):
    repo = Path(path).resolve()
    if "onedrive" in str(repo).lower():
        raise SystemExit("El clon debe estar fuera de OneDrive.")
    return repo


def safe_relative(gm, path):
    p = PurePosixPath(path)
    if not path or p.is_absolute() or "\\" in path or ":" in path or "\0" in path or any(x in {".", ".."} for x in p.parts):
        raise gm.MemoryError("unsafe_document_path")
    return p


def ensure_commit(gm, store, commit):
    if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise gm.MemoryError("exact_commit_required")
    if store.git("cat-file", "-e", commit + "^{commit}", allow_failure=True).returncode:
        store.guard_destination()
        store.git("fetch", "--no-tags", "--no-write-fetch-head", store.remote_url, commit)
    if store.git("cat-file", "-t", commit).strip() != b"commit":
        raise gm.MemoryError("exact_commit_required")


def read_commit(gm, store, commit, paths, identity, out_dir):
    ensure_commit(gm, store, commit)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=False)
    documents, missing = [], []
    for path in paths:
        names = [n for n in store.git("ls-tree", "-r", "--name-only", "-z", commit, "--", path).decode().split("\0") if n]
        if not names:
            missing.append(path)
        for name in names:
            raw = store.read_at(commit, name)
            target = out.joinpath("textos", *safe_relative(gm, name).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as f:
                f.write(raw)
            if gm.sha(target.read_bytes()) != gm.sha(raw):
                raise gm.MemoryError("export_verification_failed")
            documents.append({"path": name, "sha256": gm.sha(raw), "bytes": len(raw)})
    receipt = {"schema": RECEIPT_SCHEMA, "version": {"type": "git_commit", "id": commit},
               "destination": store.remote_url, "transport_module_sha256": MODULE_SHA256,
               "program_reception": {"documents": documents, "missing": missing, "received_at_utc_client": gm.utc()},
               "agent_reading": NOT_DECLARED, "identity": identity}
    write_new(out / "recibo.json", receipt)
    return receipt


def verified_read_versions(gm, store, read_dir, declared, destination, accept_partial=False):
    """read_versions solo a partir de bytes exportados que coinciden con Git, no del JSON por sí solo."""
    read_dir = Path(read_dir)
    receipt = json.loads((read_dir / "recibo.json").read_text(encoding="utf-8"))
    if not isinstance(receipt, dict) or set(receipt) != RECEIPT_KEYS or receipt["schema"] != RECEIPT_SCHEMA:
        raise gm.MemoryError("read_receipt_schema")
    if receipt["transport_module_sha256"] != MODULE_SHA256:
        raise gm.MemoryError("read_receipt_transport_version")
    if receipt["destination"] != destination or store.remote_url != destination:
        raise gm.MemoryError("read_receipt_destination")
    version, reception = receipt["version"], receipt["program_reception"]
    if (not isinstance(version, dict) or set(version) != {"type", "id"} or version["type"] != "git_commit"
            or not isinstance(reception, dict) or set(reception) != RECEPTION_KEYS
            or not isinstance(reception["documents"], list) or not isinstance(reception["missing"], list)
            or any(not isinstance(d, dict) or set(d) != {"path", "sha256", "bytes"} for d in reception["documents"])):
        raise gm.MemoryError("read_receipt_schema")
    if reception["missing"] and not accept_partial:
        raise gm.MemoryError("partial_read_requires_explicit_acceptance")
    received = {d["path"]: d["sha256"] for d in reception["documents"]}
    if not declared or len(set(declared)) != len(declared):
        raise gm.MemoryError("agent_read_declaration_required")
    commit = version["id"]
    ensure_commit(gm, store, commit)
    for path in declared:
        if path not in received:
            raise gm.MemoryError("declared_document_not_received")
        exported = read_dir.joinpath("textos", *safe_relative(gm, path).parts).read_bytes()
        if gm.sha(exported) != received[path]:
            raise gm.MemoryError("exported_text_changed")
        if store.read_at(commit, path) != exported:
            raise gm.MemoryError("exported_text_differs_from_git")
    return [{"type": "git_commit", "id": commit, "documents": sorted(declared)}]


def build_note(gm, read_versions, *, title, body, kind, authored_at, origin_at, information_cutoff, sources,
               tool, model, model_evidence, note_id=None):
    # read_versions debe venir de verified_read_versions.
    note = {"id": note_id or str(uuid.uuid4()), "agent": ACTOR, "provider": "Anthropic", "tool": tool,
            "model": model, "model_evidence": model_evidence, "title": title, "body": body,
            "authored_at": authored_at, "origin_at": origin_at, "information_cutoff": information_cutoff,
            "sources": sources, "read_versions": read_versions, "kind": kind, "visibility": "public"}
    return note, gm.render(note, ACTOR)


def approval_request(gm, note, raw, destination, branch=None):
    if branch == "main":
        raise gm.MemoryError("reviewed_staging_branch_required_no_direct_main_push")
    # Plantilla para quien aprueba: la capa nunca pone approved=true ni inventa la revisión.
    return {"approved": False, "destination": destination, "ref": "refs/heads/" + branch if branch else None,
            "path": gm.PREFIX + "/aportaciones/" + note["id"] + ".md", "sha256": gm.sha(raw),
            "review": None, "public_review_sha256": None}


def write_new(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main(argv=None):
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Capa de Claude sobre git_memory.py")
    parser.add_argument("--transport", help="git_memory.py o su carpeta; por defecto, junto a esta capa")
    sub = parser.add_subparsers(dest="cmd", required=True)
    read, prepare, send = sub.add_parser("read"), sub.add_parser("prepare"), sub.add_parser("send")
    read.add_argument("--commit", required=True)
    read.add_argument("--path", action="append")
    read.add_argument("--out-dir", required=True)
    prepare.add_argument("--read-dir", required=True)
    prepare.add_argument("--read-document", action="append", required=True)
    prepare.add_argument("--accept-partial", action="store_true")
    prepare.add_argument("--branch")
    prepare.add_argument("--title", required=True)
    prepare.add_argument("--body-file", required=True)
    prepare.add_argument("--kind", required=True)
    prepare.add_argument("--authored-at", required=True)
    prepare.add_argument("--origin-at", default="desconocido")
    prepare.add_argument("--information-cutoff", default="desconocido")
    prepare.add_argument("--sources-file")
    prepare.add_argument("--out-dir", required=True)
    for p in (read, prepare):
        p.add_argument("--repo", required=True)
        p.add_argument("--tool", required=True)
        p.add_argument("--model", required=True)
        p.add_argument("--model-evidence", required=True)
    for name in ("--repo", "--branch", "--note", "--approval", "--receipt"):
        send.add_argument(name, required=True)
    a = parser.parse_args(argv)
    gm = load_transport(a.transport)
    try:
        if a.cmd == "read":
            store = gm.GitMemory(check_repo(a.repo), READ_DESTINATION, "main")
            identity = {"agent": ACTOR, "provider": "Anthropic", "tool": a.tool, "model": a.model,
                        "model_evidence": a.model_evidence}
            receipt = read_commit(gm, store, a.commit, a.path or ["cerebro-publico"], identity, a.out_dir)
            reception = receipt["program_reception"]
            print(json.dumps({"version": receipt["version"], "exported": [d["path"] for d in reception["documents"]],
                              "missing": reception["missing"], "agent_reading": NOT_DECLARED}, ensure_ascii=False))
        elif a.cmd == "prepare":
            store = gm.GitMemory(check_repo(a.repo), READ_DESTINATION, "main")
            versions = verified_read_versions(gm, store, a.read_dir, a.read_document, READ_DESTINATION, a.accept_partial)
            body = Path(a.body_file).read_text(encoding="utf-8-sig").replace("\r\n", "\n").strip()
            sources = json.loads(Path(a.sources_file).read_text(encoding="utf-8")) if a.sources_file else []
            note, raw = build_note(gm, versions, title=a.title, body=body, kind=a.kind, authored_at=a.authored_at,
                                   origin_at=a.origin_at, information_cutoff=a.information_cutoff,
                                   sources=sources, tool=a.tool, model=a.model, model_evidence=a.model_evidence)
            request = approval_request(gm, note, raw, READ_DESTINATION, a.branch)
            write_new(Path(a.out_dir) / f"nota-{note['id']}.json", note)
            write_new(Path(a.out_dir) / f"aprobacion-pendiente-{note['id']}.json", request)
            print(json.dumps({"id": note["id"], "path": request["path"], "sha256": request["sha256"],
                              "ref": request["ref"], "approved": False}, ensure_ascii=False))
        else:
            check_repo(a.repo)
            saved, sys.argv = sys.argv, ["git_memory.py", "--repo", a.repo, "--branch", a.branch, "--actor", ACTOR,
                                         "--note", a.note, "--approval", a.approval, "--receipt", a.receipt]
            try:
                gm.main()
            finally:
                sys.argv = saved
    except FileExistsError:
        raise SystemExit("Ya existe la carpeta o el archivo de salida; no se sobrescribe.") from None
    except (gm.MemoryError, subprocess.TimeoutExpired) as e:
        code = e if isinstance(e, gm.MemoryError) else "timeout"
        raise SystemExit(f"Operación no confirmada ({code}). Conservar el UUID y consultar el estado antes de reintentar.") from None


if __name__ == "__main__":
    main()
