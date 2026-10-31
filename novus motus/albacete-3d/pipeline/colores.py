# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Colores reales de edificios para "Albacete a escala".

- Fachadas: color mediano de la zona central de la foto oficial de fachada del Catastro
  (servicio OVCFotoFachada), descartando cielo, vegetación y sombras. Solo edificios a
  <= RADIO_FACHADAS m de la Plaza Altozano. Las fotos no se guardan: solo el color resultante.
- Cubiertas: color mediano de la ortofoto PNOA máxima actualidad (IGN, CC BY 4.0 scne.es)
  dentro de la huella de cada parte, con un margen hacia dentro para evitar bordes y sombras.

Salida: web/data/colores.json alineado con web/data/buildings.json (mismo orden de b y parts).
"""
import io
import json
import math
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True  # algunas fotos del Catastro llegan con los últimos bytes cortados

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web" / "data"
CACHE = ROOT / "data" / "build"
CACHE.mkdir(parents=True, exist_ok=True)
PNOA_DIR = ROOT / "data" / "raw" / "pnoa"
PNOA_DIR.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "albacete-a-escala-demo/0.1"}

RADIO_FACHADAS = float(sys.argv[1]) if len(sys.argv) > 1 else 1000.0  # m desde la Plaza Altozano (99999 = toda la zona)
ALTOZANO = (522.0, 389.0)  # m relativos al origen (este, norte), según OSM "Plaza Altozano"
FOTO = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfLibres/OVCFotoFachada.svc/RecuperarFotoFachadaGet?ReferenciaCatastral={}"
WMS = ("https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage"
       "&STYLES=&CRS=EPSG:25830&BBOX={},{},{},{}&WIDTH={}&HEIGHT={}&FORMAT=image/jpeg")
RES = 0.5  # m/píxel de la ortofoto descargada
TILE_M = 1000


def get(url, tries=3):
    for t in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read(), r.headers.get("Content-Type", "")
        except Exception as e:  # noqa: BLE001
            if t == tries - 1:
                raise
            time.sleep(2 + 3 * t)


# ---------------------------------------------------------------- fachadas
MINI = CACHE / "fachadas_mini"  # miniaturas 128x96 de la foto, solo caché local (no se publican)
MINI.mkdir(parents=True, exist_ok=True)
METODO = "moda-luz v3: franja x 30-70 %, y 22-58 %; sin cielo, vegetación, sombras ni blancos saturados; bins de 24 niveles; entre los bins con al menos la mitad de frecuencia que el mayor (máx. 3), el más luminoso"


def facade_color(im):
    """Color de pared: sin cielo, vegetación ni sombras; entre los 3 colores más frecuentes, el más luminoso
    (las ventanas y sombras son más oscuras que el paramento). Validado a ojo con una hoja de contactos."""
    w, h = im.size
    px = np.asarray(im.crop((int(w * 0.30), int(h * 0.22), int(w * 0.70), int(h * 0.58))), dtype=np.float32).reshape(-1, 3)
    r, g, b = px[:, 0], px[:, 1], px[:, 2]
    mx = px.max(axis=1); mn = px.min(axis=1)
    v = mx / 255.0
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    sky = (b > r + 12) & (b > g) & (v > 0.45)
    veg = (g > r + 8) & (g > b + 8)
    dark = v < 0.22
    blown = mn >= 238  # cielo quemado / reflejos saturados
    keep = ~(sky | veg | dark | blown) & (sat < 0.75)
    frac = float(keep.mean())
    if frac < 0.15:
        return None, frac
    k = px[keep]
    q = (k // 24).astype(int)
    keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
    vals, cnt = np.unique(keys, return_counts=True)
    lum = k @ np.array([0.299, 0.587, 0.114])
    top = [i for i in np.argsort(-cnt)[:3] if cnt[i] >= 0.5 * cnt.max()]  # solo colores realmente abundantes
    best = max(top, key=lambda i: lum[keys == vals[i]].mean())
    col = np.median(k[keys == vals[best]], axis=0)
    return [int(round(x)) for x in col], frac


def run_facades(bdata, centroids):
    cache_f = CACHE / "fachadas_cache.json"
    cache = json.loads(cache_f.read_text(encoding="utf-8")) if cache_f.exists() else {}
    todo = []
    for bi, (ref, *_rest) in enumerate(bdata["b"]):
        c = centroids.get(bi)
        if c is None:
            continue
        d = math.hypot(c[0] - ALTOZANO[0], c[1] - ALTOZANO[1])
        if d <= RADIO_FACHADAS and ref not in cache:
            todo.append((d, ref))
    todo.sort()
    print(f"fachadas: {len(todo)} por procesar ({len(cache)} en caché)", file=sys.stderr)

    def job(ref):
        try:
            mini = MINI / f"{ref}.jpg"
            if mini.exists():
                im = Image.open(mini).convert("RGB")
            else:
                data, ctype = get(FOTO.format(ref))
                if "image" not in ctype or len(data) < 5000:
                    return ref, {"estado": "sin_foto"}
                im = Image.open(io.BytesIO(data)).convert("RGB").resize((256, 192), Image.LANCZOS)
                im.save(mini, quality=90)
            col, frac = facade_color(im)
            if col is None:
                return ref, {"estado": "no_fiable", "frac": round(frac, 2)}
            return ref, {"estado": "ok", "rgb": col, "frac": round(frac, 2)}
        except Exception as e:  # noqa: BLE001
            return ref, {"estado": "error", "msg": str(e)[:80]}

    done = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = [ex.submit(job, ref) for _, ref in todo]
        for f in as_completed(futs):
            ref, res = f.result()
            if res["estado"] != "error":
                cache[ref] = res
            done += 1
            if done % 200 == 0:
                cache_f.write_text(json.dumps(cache), encoding="utf-8")
                print(f"  {done}/{len(todo)}", file=sys.stderr)
    cache_f.write_text(json.dumps(cache), encoding="utf-8")
    return cache


# ---------------------------------------------------------------- cubiertas (PNOA)
def pnoa_tiles(meta):
    e0, n0, e1, n1 = meta["bbox_epsg25830"]
    tiles = []
    E = math.floor(e0 / TILE_M) * TILE_M
    while E < e1:
        N = math.floor(n0 / TILE_M) * TILE_M
        while N < n1:
            f = PNOA_DIR / f"pnoa_{E}_{N}.jpg"
            if not f.exists():
                px = int(TILE_M / RES)
                data, ctype = get(WMS.format(E, N, E + TILE_M, N + TILE_M, px, px))
                if "image" not in ctype:
                    raise RuntimeError(f"PNOA {E},{N}: {ctype} {data[:200]!r}")
                f.write_bytes(data)
                print(f"  PNOA {E},{N} {len(data)/1e6:.1f} MB", file=sys.stderr)
            tiles.append((E, N, f))
            N += TILE_M
        E += TILE_M
    return tiles


def run_roofs(meta, bdata):
    oe, on = meta["origin_epsg25830"]
    tiles = {(E, N): f for E, N, f in pnoa_tiles(meta)}
    imgs = {}
    out = []
    for bi, floors, outer, holes in bdata["parts"]:
        if not floors or floors <= 0:
            out.append(None); continue
        pts = [(oe + outer[i] / 10, on + outer[i + 1] / 10) for i in range(0, len(outer), 2)]
        cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
        key = (math.floor(cx / TILE_M) * TILE_M, math.floor(cy / TILE_M) * TILE_M)
        if key not in tiles:
            out.append(None); continue
        if key not in imgs:
            imgs[key] = np.asarray(Image.open(tiles[key]).convert("RGB"))
        arr = imgs[key]
        E, N = key
        # polígono en píxeles de la tesela, encogido un 15 % hacia el centroide
        pp = [((cx + (x - cx) * 0.85 - E) / RES, (N + TILE_M - (cy + (y - cy) * 0.85)) / RES) for x, y in pts]
        xs = [p[0] for p in pp]; ys = [p[1] for p in pp]
        x0, x1 = max(0, int(min(xs))), min(arr.shape[1] - 1, int(max(xs)) + 1)
        y0, y1 = max(0, int(min(ys))), min(arr.shape[0] - 1, int(max(ys)) + 1)
        if x1 <= x0 or y1 <= y0:
            out.append(None); continue
        mask = Image.new("L", (x1 - x0 + 1, y1 - y0 + 1), 0)
        ImageDraw.Draw(mask).polygon([(x - x0, y - y0) for x, y in pp], fill=1)
        m = np.asarray(mask, dtype=bool)
        sub = arr[y0:y1 + 1, x0:x1 + 1][m]
        if len(sub) < 4:
            out.append(None); continue
        lum = sub.mean(axis=1)
        lit = sub[lum > np.percentile(lum, 25)]  # descarta la parte más oscura (sombras)
        med = np.median(lit if len(lit) >= 4 else sub, axis=0)
        out.append([int(round(x)) for x in med])
    return out


def main():
    meta = json.loads((WEB / "meta.json").read_text(encoding="utf-8"))
    bdata = json.loads((WEB / "buildings.json").read_text(encoding="utf-8"))
    centroids = {}
    for bi, floors, outer, holes in bdata["parts"]:
        n = len(outer) // 2
        c = (sum(outer[0::2]) / n / 10, sum(outer[1::2]) / n / 10)
        prev = centroids.get(bi)
        centroids[bi] = c if prev is None else prev
    print("Cubiertas (PNOA)…", file=sys.stderr)
    roofs = run_roofs(meta, bdata)
    print("Fachadas (Catastro)…", file=sys.stderr)
    cache = run_facades(bdata, centroids)
    fac = []
    stats = {"ok": 0, "sin_foto": 0, "no_fiable": 0, "fuera_de_radio": 0}
    for bi, (ref, *_r) in enumerate(bdata["b"]):
        c = cache.get(ref)
        if c is None:
            fac.append(None); stats["fuera_de_radio"] += 1
        elif c["estado"] == "ok":
            fac.append(c["rgb"]); stats["ok"] += 1
        else:
            fac.append(None); stats[c["estado"]] = stats.get(c["estado"], 0) + 1
    out = {
        "alineado_con": {"edificios": len(bdata["b"]), "partes": len(bdata["parts"]), "primera_ref": bdata["b"][0][0]},
        "fachada_rgb": fac,
        "cubierta_rgb": roofs,
        "fuentes": {
            "fachadas": "Foto de fachada del Catastro (OVCFotoFachada, Dirección General del Catastro); " + METODO + ". Fecha de cada foto no publicada; el color depende de la luz de la foto.",
            "cubiertas": "Ortofoto PNOA máxima actualidad, IGN (CC BY 4.0 scne.es), 0,5 m/píxel; mediana dentro de la huella.",
        },
        "radio_fachadas_m": RADIO_FACHADAS,
        "recuentos_fachadas": stats,
        "cubiertas_con_color": sum(1 for r in roofs if r),
    }
    (WEB / "colores.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"fachadas": stats, "cubiertas": out["cubiertas_con_color"]}), file=sys.stderr)


if __name__ == "__main__":
    main()
