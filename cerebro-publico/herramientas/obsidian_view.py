"""Publish a complete versioned public view without changing any existing note.

The Git repository is authoritative; this is an Obsidian reading snapshot.
An edited snapshot causes a conflict, never an overwrite or automatic discard.
"""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import tempfile


class ViewConflict(Exception):
    pass


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def safe_relative(path):
    p = PurePosixPath(path)
    if not p.parts or p.is_absolute() or "\\" in path or ":" in path or any(x in {".", ".."} or x.startswith(".") for x in p.parts):
        raise ViewConflict("unsafe_public_path")
    if p.suffix not in {".md", ".json"}:
        raise ViewConflict("unsupported_public_document")
    return p


def publish_view(destination, commit, documents):
    if not re.fullmatch(r"[0-9a-f]{40}", commit) or not isinstance(documents, dict) or not documents:
        raise ViewConflict("exact_commit_and_documents_required")
    if len(documents) > 5000 or sum(len(v) for v in documents.values()) > 64 * 1024 * 1024:
        raise ViewConflict("view_size_limit")
    root = Path(destination).absolute()
    for part in (root, *root.parents):
        if part.is_symlink() or (hasattr(part, "is_junction") and part.is_junction()):
            raise ViewConflict("linked_view_root")
    root.mkdir(parents=True, exist_ok=True)
    expected = {}
    for name, raw in documents.items():
        safe_relative(name)
        if not isinstance(raw, bytes):
            raise ViewConflict("raw_document_bytes_required")
        raw.decode("utf-8")
        expected[name] = digest(raw)
    # Portable collision checks: Windows is case insensitive and disallows trailing dots/spaces.
    if len({n.casefold() for n in expected}) != len(expected) or any(any(p.endswith((".", " ")) for p in PurePosixPath(n).parts) for n in expected):
        raise ViewConflict("ambiguous_portable_path")
    components = {}
    for name in expected:
        parts = PurePosixPath(name).parts
        for i in range(1, len(parts) + 1):
            component = "/".join(parts[:i])
            key = component.casefold()
            role = "file" if i == len(parts) else "directory"
            if key in components and components[key] != (component, role):
                raise ViewConflict("ambiguous_portable_components")
            components[key] = (component, role)
    manifest_name = "VISTA_PUBLICA.json"
    if manifest_name.casefold() in {n.casefold() for n in expected}:
        raise ViewConflict("manifest_name_reserved")
    manifest = {"source": "NovusMotus/proyectos-publicos", "type": "git_commit", "version": commit,
                "role": "derived_public_reading_snapshot_not_a_second_authority", "files": expected}
    data = dict(documents)
    data[manifest_name] = (json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    target = root / commit
    def verify_existing():
        if target.is_symlink() or (hasattr(target, "is_junction") and target.is_junction()):
            raise ViewConflict("linked_snapshot")
        actual = {str(p.relative_to(target)).replace("\\", "/"): p for p in target.rglob("*") if p.is_file() or p.is_symlink()}
        if set(actual) != set(data):
            raise ViewConflict("existing_view_edited_keep_local_changes")
        for name, raw in data.items():
            path = actual[name]
            if path.is_symlink() or any(part.is_symlink() or (hasattr(part, "is_junction") and part.is_junction()) for part in (path, *path.parents) if part != root.parent):
                raise ViewConflict("linked_existing_document")
            if path.read_bytes() != raw:
                raise ViewConflict("existing_view_edited_keep_local_changes")
    if target.exists():
        verify_existing()
        return {"version": commit, "files": len(documents), "replayed": True}
    with tempfile.TemporaryDirectory(prefix=".preparando-", dir=root) as tmp:
        staging = Path(tmp) / "snapshot"
        staging.mkdir()
        for name, raw in data.items():
            path = staging.joinpath(*safe_relative(name).parts)
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as f:
                f.write(raw)
                f.flush()
                os.fsync(f.fileno())
        try:
            # Same filesystem directory rename. Existing nonempty snapshots are never replaced.
            os.rename(staging, target)
        except OSError:
            if not target.exists():
                raise
            verify_existing()
    return {"version": commit, "files": len(documents), "replayed": False}


def publish_git_view(store, commit, destination):
    """Bind the view to bytes read from an actual, identified Git commit."""
    if not re.fullmatch(r"[0-9a-f]{40}", commit) or store.git("cat-file", "-t", commit).strip() != b"commit":
        raise ViewConflict("Git_commit_required")
    prefix = "cerebro-publico/"
    documents = {}
    for raw_path in store.git("ls-tree", "-r", "--name-only", "-z", commit, "--", prefix).decode().split("\0"):
        if not raw_path:
            continue
        relative = raw_path.removeprefix(prefix)
        # Code is deployed separately; Obsidian presents documentation and receipts.
        if PurePosixPath(relative).suffix not in {".md", ".json"}:
            continue
        safe_relative(relative)
        documents[relative] = store.read_at(commit, raw_path)
    return publish_view(destination, commit, documents)
