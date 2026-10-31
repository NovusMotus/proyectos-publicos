# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10"]
# ///
"""Mosaico de la ortofoto PNOA (IGN, CC BY 4.0 scne.es) recortado a la zona de la demo → web/data/ortofoto.jpg.

Se usa como textura de cubiertas y suelo. Es una ortofoto, no una ortoimagen verdadera: los edificios altos aparecen
ligeramente desplazados (desplome por perspectiva), por lo que el borde de algunas cubiertas no coincide al metro.
"""
import json
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PNOA = ROOT / "data" / "raw" / "pnoa"
WEB = ROOT / "web" / "data"
RES_SRC = 0.5
MAX_PX = 4096


def main():
    meta = json.loads((WEB / "meta.json").read_text(encoding="utf-8"))
    e0, n0, e1, n1 = meta["bbox_epsg25830"]
    E0, N0 = math.floor(e0 / 1000) * 1000, math.floor(n0 / 1000) * 1000
    E1, N1 = math.ceil(e1 / 1000) * 1000, math.ceil(n1 / 1000) * 1000
    W, H = int((E1 - E0) / RES_SRC), int((N1 - N0) / RES_SRC)
    mosaic = Image.new("RGB", (W, H))
    for f in PNOA.glob("pnoa_*_*.jpg"):
        _, E, N = f.stem.split("_")
        E, N = int(E), int(N)
        tile = Image.open(f).convert("RGB")
        mosaic.paste(tile, (int((E - E0) / RES_SRC), int((N1 - (N + 1000)) / RES_SRC)))
    crop = mosaic.crop((int((e0 - E0) / RES_SRC), int((N1 - n1) / RES_SRC), int((e1 - E0) / RES_SRC), int((N1 - n0) / RES_SRC)))
    scale = max(crop.width, crop.height) / MAX_PX
    out = crop.resize((round(crop.width / scale), round(crop.height / scale)), Image.LANCZOS)
    out.save(WEB / "ortofoto.jpg", quality=86, optimize=True)
    info = {"bbox_epsg25830": [e0, n0, e1, n1], "px": [out.width, out.height], "m_por_px": round((e1 - e0) / out.width, 3),
            "fuente": "Ortofoto PNOA máxima actualidad, IGN (CC BY 4.0 scne.es), WMS pnoa-ma, consulta 26-09-2026",
            "nota": "Ortofoto (no ortoimagen verdadera): los edificios altos aparecen desplazados unos metros."}
    (WEB / "ortofoto.json").write_text(json.dumps(info, ensure_ascii=False), encoding="utf-8")
    print(info, f"{(WEB / 'ortofoto.jpg').stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
