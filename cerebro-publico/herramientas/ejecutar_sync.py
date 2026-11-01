"""Isolated scheduled entry point, pinned to an explicitly reviewed code bundle."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import types


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--bundle-manifest-sha256", required=True)
    p.add_argument("--runtime", required=True)
    args = p.parse_args()
    root = Path(__file__).resolve().parent
    raw = (root / "bundle.json").read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.bundle_manifest_sha256:
        raise RuntimeError("installed_bundle_manifest_changed")
    manifest = json.loads(raw)
    expected = {"ejecutar_sync.py", "git_memory.py", "obsidian_view.py", "sync_obsidian.py"}
    if set(manifest) != {"files"} or set(manifest["files"]) != expected:
        raise RuntimeError("installed_bundle_scope_changed")
    checked = {}
    for name, wanted in manifest["files"].items():
        data = (root / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != wanted:
            raise RuntimeError("installed_code_changed")
        checked[name] = data
    # Execute the checked bytes, without a later source read or a .pyc shortcut.
    for name in ("git_memory", "obsidian_view", "sync_obsidian"):
        module = types.ModuleType(name)
        module.__file__ = str(root / (name + ".py"))
        sys.modules[name] = module
        exec(compile(checked[name + ".py"], module.__file__, "exec"), module.__dict__)
    result = sys.modules["sync_obsidian"].sync_once(args.runtime)
    return 0 if result["state"] in {"complete", "another_sync_running"} else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        # Task Scheduler records failure. No raw paths, configuration or Git stderr.
        raise SystemExit(2) from None
