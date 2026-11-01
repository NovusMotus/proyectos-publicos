"""Read-only public Git -> versioned Obsidian snapshots. No upload or deletion.

Runs once, so a scheduler can retry after offline periods or restart. Installed
code is local and reviewed; code fetched from the repository is never executed.
"""
import argparse
from contextlib import contextmanager
import json
import os
import subprocess
from pathlib import Path
import tempfile

from git_memory import GitMemory, MemoryError, utc
from obsidian_view import publish_git_view, ViewConflict

REMOTE = "https://github.com/NovusMotus/proyectos-publicos.git"
BRANCHES = {"incorporado": "main", "recibido": "cerebro/recepcion-publica"}


@contextmanager
def process_lock(path):
    # OS lock is released after process termination, unlike a stale mkdir lock.
    with Path(path).open("a+b") as stream:
        if os.fstat(stream.fileno()).st_size == 0:
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            yield False
            return
        try:
            yield True
        finally:
            stream.seek(0)
            if os.name == "nt":
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def atomic_json(path, value):
    path = Path(path)
    fd, name = tempfile.mkstemp(prefix=".estado-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False, indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def sync_once(runtime, store_factory=GitMemory):
    runtime = Path(runtime).resolve()
    config = json.loads((runtime / "config.json").read_text(encoding="utf-8"))
    if set(config) != {"public_clone", "view_root"}:
        raise MemoryError("sync_config_schema")
    clone = Path(config["public_clone"]).resolve()
    view_root = Path(config["view_root"]).absolute()
    drive_roots = [Path(value).resolve() for key in ("OneDrive", "OneDriveConsumer", "OneDriveCommercial") if (value := os.environ.get(key))]
    if "onedrive" in str(clone).lower() or any(clone == root or root in clone.parents for root in drive_roots):
        raise MemoryError("public_reader_clone_must_be_outside_OneDrive")
    if clone == view_root or clone in view_root.parents or view_root in clone.parents:
        raise MemoryError("Git_clone_and_Obsidian_view_must_be_separate")
    state_path = runtime / "estado.json"
    with process_lock(runtime / "sync.lock") as acquired:
        if not acquired:
            return {"state": "another_sync_running", "changed": False}
        previous = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
        result = {"attempted_at_utc_client": utc(), "state": "complete", "branches": {},
                  "last_complete_success_utc_client": previous.get("last_complete_success_utc_client")}
        for role, branch in BRANCHES.items():
            last_available = previous.get("branches", {}).get(role, {}).get("last_successfully_published")
            try:
                store = store_factory(clone, REMOTE, branch)
                if store.git("rev-parse", "--is-bare-repository").strip() != b"true":
                    raise MemoryError("dedicated_bare_public_reader_required")
                if store.git("config", "--local", "--get", "cerebro.role").strip() != b"obsidian-public-reader":
                    raise MemoryError("public_reader_role_missing")
                if store.git("config", "--local", "--get", "cerebro.allowedRemote").decode().strip() != REMOTE:
                    raise MemoryError("public_reader_destination_marker_mismatch")
                commit = store.remote_head()
                published = publish_git_view(store, commit, view_root / role)
                result["branches"][role] = {"state": "available", "branch": branch, **published,
                                           "last_successfully_published": {"version": commit, "files": published["files"]}}
            except (MemoryError, ViewConflict, OSError, ValueError, subprocess.TimeoutExpired):
                result["state"] = "needs_attention_retry_preserving_existing_views"
                result["branches"][role] = {"state": "not_updated_existing_files_preserved", "branch": branch,
                                           "last_successfully_published": last_available,
                                           "existing_view_revalidated_in_this_attempt": False}
        if result["state"] == "complete":
            result["last_complete_success_utc_client"] = utc()
        atomic_json(state_path, result)
        return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--runtime", required=True)
    args = p.parse_args()
    result = sync_once(args.runtime)
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["state"] in {"complete", "another_sync_running"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
