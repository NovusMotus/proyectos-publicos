# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Datos reales para las fachadas ilustradas (estilo tebeo/anime).

1. Paleta de 4 colores por edificio a partir de su foto de fachada del Catastro (miniaturas en caché):
   k-medias sobre la zona de fachada sin cielo ni vegetación → [pared, oscuro (huecos), acento (el más saturado), claro].
2. Bajos comerciales: cada local con nombre de OSM (tiendas, bares, servicios) se asigna al edificio catastral
   que lo contiene o que está a menos de 4 m (los nodos de OSM suelen ir en la puerta).
Salida: web/data/paletas.json y web/data/bajos.json, alineados con buildings.json.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True
ROOT = Path(__file__).resolve().parent.parent
MINI = ROOT / "data" / "build" / "fachadas_mini"
WEB = ROOT / "web" / "data"


def kmeans(px, k=4, it=10, seed=1):
    rng = np.random.default_rng(seed)
    c = px[rng.choice(len(px), size=min(k, len(px)), replace=False)].astype(np.float32)
    for _ in range(it):
        d = ((px[:, None, :] - c[None, :, :]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(len(c)):
            m = px[lab == j]
            if len(m):
                c[j] = m.mean(0)
    cnt = np.bincount(lab, minlength=len(c))
    return c, cnt


def palette(im):
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    h, w = a.shape[:2]
    px = a[int(h * 0.18):int(h * 0.88), int(w * 0.28):int(w * 0.72)].reshape(-1, 3)
    r, g, b = px[:, 0], px[:, 1], px[:, 2]
    mx = px.max(1); mn = px.min(1)
    sky = ((b > r + 10) & (b >= g) & (mx > 110)) | (mn >= 236)
    veg = (g > r + 8) & (g > b + 8)
    px = px[~(sky | veg)]
    if len(px) < 200:
        return None
    c, cnt = kmeans(px, 4)
    lum = c @ np.array([0.299, 0.587, 0.114])
    sat = (c.max(1) - c.min(1)) / np.maximum(c.max(1), 1)
    order = np.argsort(-cnt)
    wall = max(order[:2], key=lambda i: lum[i])  # de los 2 más frecuentes, el más claro = paramento
    dark = int(np.argmin(lum))
    rest = [i for i in range(len(c)) if i not in (wall, dark)]
    accent = max(rest, key=lambda i: sat[i]) if rest else dark
    light = max(range(len(c)), key=lambda i: lum[i])
    return [[int(v) for v in c[i]] for i in (wall, dark, accent, light)]


def main():
    b = json.loads((WEB / "buildings.json").read_text(encoding="utf-8"))
    refs = [x[0] for x in b["b"]]
    pal, ok = [], 0
    for i, ref in enumerate(refs):
        f = MINI / f"{ref}.jpg"
        p = palette(Image.open(f)) if f.exists() else None
        pal.append(p)
        ok += p is not None
        if i % 2000 == 0:
            print(f"  paletas {i}/{len(refs)}", file=sys.stderr)
    (WEB / "paletas.json").write_text(json.dumps({"alineado_con": {"edificios": len(refs), "primera_ref": refs[0]},
        "orden": ["pared", "oscuro", "acento", "claro"], "paleta": pal,
        "metodo": "k-medias (k=4) sobre la zona de fachada de la foto del Catastro, sin cielo ni vegetación"}, separators=(",", ":")), encoding="utf-8")
    print(f"paletas: {ok}/{len(refs)}", file=sys.stderr)

    # ----- bajos comerciales
    parts = b["parts"]
    grid = {}
    for pi, (bi, fl, outer, holes) in enumerate(parts):
        if not fl:
            continue
        xs, ys = outer[0::2], outer[1::2]
        for gx in range(min(xs) // 500, max(xs) // 500 + 1):
            for gy in range(min(ys) // 500, max(ys) // 500 + 1):
                grid.setdefault((gx, gy), []).append(pi)

    def inside(x, y, r):
        c = False
        n = len(r) // 2
        for i in range(n):
            x1, y1, x2, y2 = r[2 * i], r[2 * i + 1], r[2 * ((i + 1) % n)], r[2 * ((i + 1) % n) + 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
        return c

    def dist_edge(x, y, r):
        best = 1e18
        n = len(r) // 2
        for i in range(n):
            x1, y1, x2, y2 = r[2 * i], r[2 * i + 1], r[2 * ((i + 1) % n)], r[2 * ((i + 1) % n) + 1]
            dx, dy = x2 - x1, y2 - y1
            L2 = dx * dx + dy * dy or 1
            t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / L2))
            best = min(best, math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)))
        return best

    pois = json.loads((WEB / "pois.json").read_text(encoding="utf-8"))["pois"]
    bares = json.loads((WEB / "bares.json").read_text(encoding="utf-8"))["bares"] if (WEB / "bares.json").exists() else []
    items = [(p["n"], p["c"], p["x"], p["y"], f"{p['o']}/{p['id']}") for p in pois if p["c"].split("=")[0] in ("shop", "amenity")]
    seen = {x[4] for x in items}
    items += [(x["n"], f"amenity={x['a']}", x["x"], x["y"], f"{x['o']}/{x['id']}") for x in bares if x.get("n") and f"{x['o']}/{x['id']}" not in seen]
    bajos, asignados = {}, 0
    for name, cat, x, y, oid in items:
        best, bd = None, 40  # 4 m en decímetros
        for pi in grid.get((x // 500, y // 500), []):
            outer = parts[pi][2]
            if inside(x, y, outer):
                best, bd = pi, 0
                break
            d = dist_edge(x, y, outer)
            if d < bd:
                best, bd = pi, d
        if best is not None:
            bi = parts[best][0]
            bajos.setdefault(str(bi), []).append([name, cat, x, y, oid])
            asignados += 1
    (WEB / "bajos.json").write_text(json.dumps({"bajos": bajos, "asignados": asignados, "total": len(items),
        "nota": "Locales con nombre de OSM asignados al edificio que los contiene o a < 4 m."}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"bajos: {asignados}/{len(items)} locales en {len(bajos)} edificios", file=sys.stderr)


if __name__ == "__main__":
    main()
