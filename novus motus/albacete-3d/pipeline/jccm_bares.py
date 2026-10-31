# /// script
# requires-python = ">=3.11"
# dependencies = ["pyproj>=3.6"]
# ///
"""Registro autonómico de restauración (JCCM) → web/data/bares_jccm.json.

Fuente: «Empresas de Restauración de Castilla-la Mancha», datos abiertos JCCM, CC BY-SA
(https://datosabiertos.castillalamancha.es/dataset/empresas-de-restauraci%C3%B3n-de-castilla-la-mancha).
El registro indica el año de alta («Campaña») pero no si el local sigue abierto.

Pasos: filtrar municipio Albacete → geocodificar la dirección con CartoCiudad (IGN), solo portales → cruzar con los
locales de OSM (≤ 35 m y nombre parecido = confirmado; ≤ 8 m, mismo tipo y otro nombre = otro negocio en el mismo sitio) → marcar confirmados en OSM o solo en registro.
"""
import csv
import io
import json
import math
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
WEB = ROOT / "web" / "data"
CACHE = ROOT / "data" / "build" / "cartociudad_cache.json"
UA = {"User-Agent": "albacete-a-escala-demo/0.1"}
TIPO = {"Bares": "bar", "Restaurantes": "restaurant", "Cafeterías": "cafe", "": None}


def norm(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s.lower())).strip()


def tokens(s):
    return {w for w in norm(s).split() if len(w) > 2 and w not in {"bar", "cafe", "cafeteria", "restaurante", "the", "los", "las", "del"}}


def geocode(addr, cache):
    if addr in cache:
        return cache[addr]
    q = f"{addr}, Albacete"
    url = "https://www.cartociudad.es/geocoder/api/geocoder/find?q=" + urllib.parse.quote(q)
    res = None
    for t in range(3):
        try:
            j = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8"))
            if j.get("type") == "portal" and j.get("muni") == "Albacete" and j.get("lat"):
                res = {"lat": j["lat"], "lon": j["lng"], "via": f"{j.get('tip_via', '')} {j.get('address', '')} {j.get('portalNumber', '')}".strip(),
                       "ref": j.get("refCatastral"), "portal_pedido_encontrado": j.get("noNumber") is False}
            else:
                res = {"sin_portal": True, "tipo": j.get("type")}
            break
        except Exception:  # noqa: BLE001
            time.sleep(2 + 2 * t)
    cache[addr] = res
    return res


def main():
    raw = (RAW / "jccm_restaurantes.csv").read_bytes().decode("cp1252")
    rows = [{k.replace("\n", " "): (v or "").strip() for k, v in r.items()} for r in csv.DictReader(io.StringIO(raw), delimiter=";")]
    alb = [r for r in rows if r.get("Municipio", "").upper() == "ALBACETE"]
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    addrs = sorted({r["Dirección Establecimiento"] for r in alb if r["Dirección Establecimiento"]})
    todo = [a for a in addrs if a not in cache]
    print(f"registro Albacete: {len(alb)} filas, {len(addrs)} direcciones ({len(todo)} por geocodificar)", file=sys.stderr)
    with ThreadPoolExecutor(3) as ex:
        for i, _ in enumerate(ex.map(lambda a: geocode(a, cache), todo)):
            if i % 100 == 99:
                CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
                print(f"  {i + 1}/{len(todo)}", file=sys.stderr)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

    meta = json.loads((WEB / "meta.json").read_text(encoding="utf-8"))
    oe, on = meta["origin_epsg25830"]
    e0, n0, e1, n1 = meta["bbox_epsg25830"]
    tr = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True)
    osm = json.loads((WEB / "bares.json").read_text(encoding="utf-8"))["bares"]

    out, stats = [], {"filas": len(alb), "sin_portal": 0, "fuera_de_zona": 0, "confirmados_osm": 0, "misma_direccion_otro_nombre": 0, "solo_registro": 0}
    for r in alb:
        g = cache.get(r["Dirección Establecimiento"])
        if not g or g.get("sin_portal"):
            stats["sin_portal"] += 1
            continue
        e, n = tr.transform(g["lon"], g["lat"])
        if not (e0 <= e <= e1 and n0 <= n <= n1):
            stats["fuera_de_zona"] += 1
            continue
        x, y = round((e - oe) * 10), round((n - on) * 10)
        tipo = TIPO.get(r["Tipo Establecimiento"])
        nt = tokens(r["Nombre Establecimiento"])
        by_name, by_addr = None, None
        for b in osm:
            d = math.hypot((b["x"] - x) / 10, (b["y"] - y) / 10)
            if d > 35:
                continue
            bt = tokens(b.get("n") or "")
            sim = len(nt & bt) / max(1, min(len(nt), len(bt))) if nt and bt else 0
            if sim >= 0.5 and (by_name is None or d < by_name[1]):
                by_name = (b, d)
            elif d <= 8 and tipo and b["a"] in ({tipo} | ({"pub"} if tipo == "bar" else set())) and (by_addr is None or d < by_addr[1]):
                by_addr = (b, d)
        match = by_name or by_addr
        item = {"n": r["Nombre Establecimiento"].title(), "tipo": tipo, "tipo_registro": r["Tipo Establecimiento"] or "sin tipo",
                "dir": r["Dirección Establecimiento"], "alta": r["Campaña"], "x": x, "y": y,
                "geo": f"CartoCiudad: {g['via']}" + (f" (ref. catastral {g['ref']})" if g.get("ref") else "")}
        if match:
            item["osm"] = f"{match[0]['o']}/{match[0]['id']}"
            item["osm_dist_m"] = round(match[1], 1)
            item["cruce"] = "nombre" if by_name else "direccion"
            stats["confirmados_osm" if by_name else "misma_direccion_otro_nombre"] += 1
        else:
            stats["solo_registro"] += 1
        out.append(item)
    res = {"fuente": "Empresas de Restauración de Castilla-la Mancha (JCCM), CC BY-SA",
           "url": "https://datosabiertos.castillalamancha.es/dataset/empresas-de-restauraci%C3%B3n-de-castilla-la-mancha",
           "fecha_datos": "2026-05-13", "nota": "El registro da el año de alta, no si el local sigue abierto.",
           "recuentos": stats, "locales": out}
    (WEB / "bares_jccm.json").write_text(json.dumps(res, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False), file=sys.stderr)


if __name__ == "__main__":
    main()
