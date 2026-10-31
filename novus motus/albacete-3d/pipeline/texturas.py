# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Texturas pixel art de fachada a partir de la foto oficial del Catastro → web/data/fachadas_atlas.png + fachadas_tiles.json.

Para cada edificio con foto (miniatura en data/build/fachadas_mini):
  1. recorte central x 28-72 %; arriba, primera fila bajo el cielo (la cornisa); abajo, 88 % de la altura (arranque del bajo);
  2. reducción a TW x TH píxeles (promedio por bloques) y paleta de 12 colores → aspecto pixel art;
  3. si la vegetación tapa más del 35 % de la tesela, o el recorte es demasiado corto, no se usa (queda el color liso).
No corrige la perspectiva de la foto: es una aproximación del aspecto real de la fachada, no una ortoimagen.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MINI = ROOT / "data" / "build" / "fachadas_mini"
WEB = ROOT / "web" / "data"
TW, TH = 48, 60
COLS = 85  # teselas por fila del atlas (4080 px)


def sky_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    return ((b > r + 10) & (b >= g) & (mx > 110)) | (mn >= 236)


def veg_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (g > r + 8) & (g > b + 8)


def make_tile(im):
    a = np.asarray(im)
    h, w = a.shape[:2]
    x0, x1 = int(w * 0.28), int(w * 0.72)
    band = sky_mask(a[:, int(w * 0.40):int(w * 0.60)])
    frac = band.mean(axis=1)
    top = 0
    for y in range(int(h * 0.55)):
        if frac[y] > 0.3:
            top = y + 1
    bottom = int(h * 0.88)
    if bottom - top < h * 0.25:
        return None, "recorte_corto"
    crop = Image.fromarray(a[top:bottom, x0:x1])
    tile = crop.resize((TW, TH), Image.BOX)
    t = np.asarray(tile)
    if veg_mask(t).mean() > 0.35:
        return None, "vegetacion"
    q = tile.quantize(colors=12, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    return q, "ok"


def main(limit=None):
    b = json.loads((WEB / "buildings.json").read_text(encoding="utf-8"))["b"]
    refs = [x[0] for x in b]
    avail = [(i, r) for i, r in enumerate(refs) if (MINI / f"{r}.jpg").exists()]
    if limit:
        avail = avail[:limit]
    tiles, stats = {}, {"ok": 0, "vegetacion": 0, "recorte_corto": 0}
    imgs = []
    for i, r in avail:
        t, st = make_tile(Image.open(MINI / f"{r}.jpg").convert("RGB"))
        stats[st] += 1
        if t is not None:
            tiles[i] = len(imgs)
            imgs.append(t)
    rows = (len(imgs) + COLS - 1) // COLS
    atlas = Image.new("RGB", (COLS * TW, max(1, rows) * TH), (0, 0, 0))
    for k, t in enumerate(imgs):
        atlas.paste(t, ((k % COLS) * TW, (k // COLS) * TH))
    atlas.save(ROOT / "data" / "build" / f"fachadas_atlas_{TW}x{TH}.png", optimize=True)  # fuente sin pérdida (no se publica)
    atlas.save(WEB / "fachadas_atlas.webp", quality=92, method=6)  # la web carga el WebP (10 MB frente a 28 MB)
    out = {"tw": TW, "th": TH, "cols": COLS, "rows": rows, "atlas_px": [atlas.width, atlas.height],
           "tile_por_edificio": [tiles.get(i, -1) for i in range(len(refs))],
           "alineado_con": {"edificios": len(refs), "primera_ref": refs[0]}, "recuentos": stats,
           "metodo": "Foto de fachada del Catastro: recorte central desde la cornisa (primera fila sin cielo) hasta el 88 % de la altura, "
                     f"reducido a {TW}x{TH} px y 12 colores. Sin corrección de perspectiva."}
    (WEB / "fachadas_tiles.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(stats, f"atlas {atlas.width}x{atlas.height}, {(WEB / 'fachadas_atlas.webp').stat().st_size / 1e6:.1f} MB", file=sys.stderr)


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else None)
