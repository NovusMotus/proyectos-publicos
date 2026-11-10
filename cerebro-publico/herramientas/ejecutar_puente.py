"""Trusted entry point for isolated Python; only load adjacent approved modules."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from puente_issues import main

if __name__ == "__main__":
    try:
        main()
    except Exception:
        raise SystemExit("Recepcion no confirmada: conservar UUID y revisar estado de la rama antes de reintentar.") from None
