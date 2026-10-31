# /// script
# requires-python = ">=3.11"
# dependencies = ["pyproj>=3.6", "lxml>=5.0"]
# ///
"""Prepara los datos de "Albacete a escala" a partir de fuentes abiertas.

Entradas (data/raw/):
  - catastro/A.ES.SDGC.BU.02900.building.gml y .buildingpart.gml
    (Catastro INSPIRE, Dirección General del Catastro)
  - osm_highways.json, osm_rest.json (Overpass API, © OpenStreetMap contributors, ODbL)

Salidas (web/data/):
  - buildings.json  huellas transformadas + plantas sobre rasante + uso/año por edificio
  - streets.json    calles OSM con nombre, tipo y anchura estimada
  - areas.json      parques, zonas verdes, agua, vías de tren
  - pois.json       lugares con nombre (OSM) y lista curada de hitos
  - meta.json       fuentes, fechas, origen de coordenadas y recuentos

Coordenadas: ETRS89 / UTM 30N (EPSG:25830), en decímetros enteros relativos a ORIGIN.
"""
import json
import math
import sys
from pathlib import Path

from lxml import etree
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "web" / "data"
OUT.mkdir(parents=True, exist_ok=True)

BBOX_WGS84 = (38.970, -1.890, 39.012, -1.830)  # sur, oeste, norte, este
TO_UTM = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True)

corners = [TO_UTM.transform(lon, lat) for lat in BBOX_WGS84[0::2] for lon in BBOX_WGS84[1::2]]
E_MIN = min(c[0] for c in corners); E_MAX = max(c[0] for c in corners)
N_MIN = min(c[1] for c in corners); N_MAX = max(c[1] for c in corners)
ORIGIN = (round((E_MIN + E_MAX) / 2 / 10) * 10, round((N_MIN + N_MAX) / 2 / 10) * 10)

NS = {
    "gml": "http://www.opengis.net/gml/3.2",
    "bu-core2d": "http://inspire.jrc.ec.europa.eu/schemas/bu-core2d/2.0",
    "bu-ext2d": "http://inspire.jrc.ec.europa.eu/schemas/bu-ext2d/2.0",
    "base": "urn:x-inspire:specification:gmlas:BaseTypes:3.2",
}


def dm(e, n):
    return [round((e - ORIGIN[0]) * 10), round((n - ORIGIN[1]) * 10)]


def in_bbox(e, n):
    return E_MIN <= e <= E_MAX and N_MIN <= n <= N_MAX


def parse_poslist(text):
    v = [float(t) for t in text.split()]
    pts = list(zip(v[0::2], v[1::2]))
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return pts


def ring_to_flat(pts):
    flat = []
    for e, n in pts:
        flat.extend(dm(e, n))
    return flat


def text_of(el, path):
    r = el.find(path, NS)
    return r.text.strip() if r is not None and r.text else None


# ---------------------------------------------------------------- Catastro
def parse_catastro():
    bdir = RAW / "catastro"
    bfile = bdir / "A.ES.SDGC.BU.02900.building.gml"
    pfile = bdir / "A.ES.SDGC.BU.02900.buildingpart.gml"

    uses = []
    use_idx = {}
    buildings = []  # [refcat, useIdx, year, dwellings, floorsDeclared]
    bindex = {}

    tag_b = "{%s}Building" % NS["bu-ext2d"]
    for _, el in etree.iterparse(str(bfile), events=("end",), tag=tag_b, huge_tree=True):
        lc = text_of(el, "gml:boundedBy/gml:Envelope/gml:lowerCorner")
        uc = text_of(el, "gml:boundedBy/gml:Envelope/gml:upperCorner")
        keep = False
        if lc and uc:
            e1, n1 = map(float, lc.split()); e2, n2 = map(float, uc.split())
            keep = in_bbox((e1 + e2) / 2, (n1 + n2) / 2)
        if keep:
            ref = text_of(el, "bu-core2d:inspireId/base:Identifier/base:localId")
            use = text_of(el, "bu-ext2d:currentUse") or "desconocido"
            if use not in use_idx:
                use_idx[use] = len(uses); uses.append(use)
            yb = text_of(el, "bu-core2d:dateOfConstruction/bu-core2d:DateOfEvent/bu-core2d:beginning")
            year = int(yb[:4]) if yb and yb[:4].isdigit() else None  # Catastro usa "--01-01" si falta
            dw = text_of(el, "bu-ext2d:numberOfDwellings")
            dwell = int(dw) if dw and dw.isdigit() else None
            bindex[ref] = len(buildings)
            buildings.append([ref, use_idx[use], year, dwell])
        el.clear()
        while el.getprevious() is not None:
            del el.getparent()[0]

    parts = []  # [bIdx, floors, outerFlat, [holes...]]
    stats = {"parts_total_bbox": 0, "parts_floors_missing": 0, "parts_floors_zero": 0}
    tag_p = "{%s}BuildingPart" % NS["bu-ext2d"]
    for _, el in etree.iterparse(str(pfile), events=("end",), tag=tag_p, huge_tree=True):
        lid = text_of(el, "bu-core2d:inspireId/base:Identifier/base:localId")
        ref = lid.split("_part")[0] if lid else None
        if ref in bindex:
            fl = text_of(el, "bu-ext2d:numberOfFloorsAboveGround")
            floors = int(fl) if fl and fl.lstrip("-").isdigit() else None
            for patch in el.iterfind(".//gml:PolygonPatch", NS):
                ext = patch.find("gml:exterior/gml:LinearRing/gml:posList", NS)
                if ext is None or not ext.text:
                    continue
                outer = parse_poslist(ext.text)
                if len(outer) < 3:
                    continue
                holes = []
                for it in patch.iterfind("gml:interior/gml:LinearRing/gml:posList", NS):
                    h = parse_poslist(it.text or "")
                    if len(h) >= 3:
                        holes.append(ring_to_flat(h))
                parts.append([bindex[ref], floors, ring_to_flat(outer), holes])
                stats["parts_total_bbox"] += 1
                if floors is None:
                    stats["parts_floors_missing"] += 1
                elif floors == 0:
                    stats["parts_floors_zero"] += 1
        el.clear()
        while el.getprevious() is not None:
            del el.getparent()[0]
    return uses, buildings, parts, stats



def parse_height(v):
    try:
        return float(str(v).replace(",", ".").replace("m", "").strip().split()[0])
    except Exception:  # noqa: BLE001
        return None


def osm_heights(parts):
    """Altura medida de OSM (height, en m) para partes del Catastro cuyo centroide cae dentro de un edificio OSM
    con altura, cuando supera a la catastral (plantas x 3 m) en más de 3 m. No usa building:part (balcones, cuerpos)."""
    f = RAW / "osm_alturas.json"
    if not f.exists():
        return {}
    polys = []
    for e in json.loads(f.read_text(encoding="utf-8"))["elements"]:
        t = e.get("tags", {})
        if e["type"] != "way" or "geometry" not in e or not (t.get("building") or t.get("man_made") == "tower"):
            continue
        h = parse_height(t.get("height"))
        if not h or h <= 0 or h > 150:
            continue
        pts = [dm(*TO_UTM.transform(q["lon"], q["lat"])) for q in e["geometry"]]
        xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
        area = abs(sum(pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1] for i in range(len(pts) - 1))) / 2
        polys.append((min(xs), min(ys), max(xs), max(ys), pts, h, e["id"], t.get("name"), area))

    def inside(x, y, pts):
        c = False
        for i in range(len(pts) - 1):
            (x1, y1), (x2, y2) = pts[i], pts[i + 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
        return c

    grid = {}
    for k, P in enumerate(polys):
        for gx in range(int(P[0] // 1000), int(P[2] // 1000) + 1):
            for gy in range(int(P[1] // 1000), int(P[3] // 1000) + 1):
                grid.setdefault((gx, gy), []).append(k)
    out = {}
    for pi, (bi, floors, outer, holes) in enumerate(parts):
        n = len(outer) // 2
        cx = sum(outer[0::2]) / n; cy = sum(outer[1::2]) / n
        best = None
        for k in grid.get((int(cx // 1000), int(cy // 1000)), []):
            P = polys[k]
            if P[0] <= cx <= P[2] and P[1] <= cy <= P[3] and inside(cx, cy, P[4]):
                if best is None or P[8] < best[8]:
                    best = P
        if best and best[5] > (floors or 0) * 3.0 + 3.0:
            out[str(pi)] = [best[5], f"way/{best[6]}", best[7]]
    return out

# ---------------------------------------------------------------- OSM
def load_osm(name):
    with open(RAW / name, encoding="utf-8") as f:
        return json.load(f)


def geom_flat(geom):
    flat = []
    for p in geom:
        e, n = TO_UTM.transform(p["lon"], p["lat"])
        flat.extend(dm(e, n))
    return flat


# Anchura estimada de calzada/paso por tipo OSM (m). Se usa solo si la vía no trae "width".
WIDTH_BY_TYPE = {
    "motorway": 14, "trunk": 14, "primary": 12, "secondary": 10, "tertiary": 9,
    "motorway_link": 7, "trunk_link": 7, "primary_link": 7, "secondary_link": 7, "tertiary_link": 7,
    "residential": 7, "unclassified": 6, "living_street": 6, "pedestrian": 6, "service": 4,
    "footway": 2.5, "cycleway": 2, "path": 1.5, "steps": 2.5, "track": 3, "corridor": 2,
}
WALKABLE = {"residential", "unclassified", "living_street", "pedestrian", "service", "footway",
            "path", "steps", "tertiary", "secondary", "primary", "cycleway", "track", "corridor",
            "tertiary_link", "secondary_link", "primary_link"}


def parse_width(v):
    try:
        return float(str(v).replace(",", ".").split()[0])
    except Exception:
        return None


def build_streets(osm):
    streets = []
    for e in osm["elements"]:
        if e["type"] != "way" or "geometry" not in e:
            continue
        t = e.get("tags", {})
        hw = t.get("highway")
        if not hw or hw in ("construction", "proposed", "platform", "bus_stop", "elevator"):
            continue
        w = parse_width(t.get("width")) or WIDTH_BY_TYPE.get(hw, 4)
        streets.append({
            "id": e["id"],
            "n": t.get("name"),
            "t": hw,
            "w": w,
            "wsrc": "osm" if t.get("width") else "estimada",
            "walk": 1 if hw in WALKABLE and t.get("foot") != "no" and t.get("access") not in ("no", "private") else 0,
            "area": 1 if t.get("area") == "yes" else 0,
            "p": geom_flat(e["geometry"]),
        })
    return streets


def join_rings(ways):
    """Une segmentos de miembros 'outer' en anillos cerrados (listas de {lat,lon})."""
    segs = [list(w) for w in ways if len(w) >= 2]
    rings = []
    key = lambda p: (round(p["lat"], 7), round(p["lon"], 7))
    while segs:
        ring = segs.pop(0)
        changed = True
        while key(ring[0]) != key(ring[-1]) and changed:
            changed = False
            for i, s in enumerate(segs):
                if key(s[0]) == key(ring[-1]):
                    ring += s[1:]; segs.pop(i); changed = True; break
                if key(s[-1]) == key(ring[-1]):
                    ring += list(reversed(s))[1:]; segs.pop(i); changed = True; break
        if key(ring[0]) == key(ring[-1]) and len(ring) >= 4:
            rings.append(ring[:-1])
    return rings


def area_kind(t):
    if t.get("leisure") in ("park", "garden"):
        return "parque"
    if t.get("leisure") == "pitch":
        return "pista"
    if t.get("leisure") == "stadium":
        return "estadio"
    if t.get("leisure") == "playground":
        return "juegos"
    if t.get("landuse") in ("grass", "recreation_ground"):
        return "cesped"
    if t.get("natural") == "water":
        return "agua"
    return None


def build_areas_and_pois(osm):
    areas, lines, pois = [], [], []
    for e in osm["elements"]:
        t = e.get("tags", {})
        kind = area_kind(t)
        if e["type"] == "way" and "geometry" in e:
            g = e["geometry"]
            closed = len(g) >= 4 and g[0] == g[-1]
            if kind and closed:
                areas.append({"id": e["id"], "o": "way", "k": kind, "n": t.get("name"), "p": geom_flat(g[:-1])})
            elif t.get("railway") == "rail":
                lines.append({"id": e["id"], "k": "tren", "p": geom_flat(g)})
            elif t.get("waterway"):
                lines.append({"id": e["id"], "k": "agua", "n": t.get("name"), "p": geom_flat(g)})
        elif e["type"] == "relation" and kind:
            outers = [m["geometry"] for m in e.get("members", []) if m.get("role") == "outer" and "geometry" in m]
            for ring in join_rings(outers):
                areas.append({"id": e["id"], "o": "relation", "k": kind, "n": t.get("name"), "p": geom_flat(ring)})

        name = t.get("name")
        cat = next(((k, t[k]) for k in ("amenity", "tourism", "historic", "shop", "leisure", "place", "building", "landuse") if k in t), None)
        if name and cat:
            if e["type"] == "node":
                lat, lon = e["lat"], e["lon"]
            elif "bounds" in e:
                b = e["bounds"]; lat = (b["minlat"] + b["maxlat"]) / 2; lon = (b["minlon"] + b["maxlon"]) / 2
            elif "geometry" in e:
                lat = sum(p["lat"] for p in e["geometry"]) / len(e["geometry"])
                lon = sum(p["lon"] for p in e["geometry"]) / len(e["geometry"])
            else:
                continue
            x, y = dm(*TO_UTM.transform(lon, lat))
            poi = {"id": e["id"], "o": e["type"], "n": name, "c": f"{cat[0]}={cat[1]}", "x": x, "y": y}
            for k in ("wikidata", "wikipedia", "website", "addr:street", "addr:housenumber"):
                if k in t:
                    poi[k] = t[k]
            pois.append(poi)
    return areas, lines, pois


# Hitos reconocibles, identificados por su elemento OSM (verificable en openstreetmap.org).
LANDMARKS = [
    ("way", 449345576, "Catedral de San Juan Bautista"),
    ("way", 449699512, "Ayuntamiento de Albacete"),
    ("way", 111048083, "Diputación de Albacete"),
    ("way", 450306723, "Teatro Circo"),
    ("way", 141428090, "Estadio Carlos Belmonte"),
    ("way", 40971839, "Parque Abelardo Sánchez"),
    ("way", 1037845997, "Gran Hotel"),
    ("relation", 13905079, "Posada del Rosario"),
    ("way", 139797478, "Museo de la Cuchillería"),
    ("way", 141428437, "Mercado de Villacerrada"),
    ("way", 141428476, "Mercado de Carretas"),
    ("way", 142056271, "Iglesia de la Asunción"),
    ("way", 141428035, "Museo Provincial de Albacete Rubi Sanz Gamo"),
    ("way", 448690859, "Puerta de Hierros"),  # acceso al recinto ferial; el way 398654562 "Feria de Albacete" es un jardín de 29x29 m, no el recinto
    ("way", 228184955, "Jardinillos de la Feria"),
    ("way", 172912302, "Parque Fiesta del Árbol"),
    ("way", 141428163, "Estación de Autobuses de Albacete"),
    ("node", 11386507185, "Filmoteca Municipal"),
]


HOSTELERIA = {"bar", "pub", "cafe", "biergarten", "restaurant", "fast_food", "ice_cream", "nightclub"}
TERRAZA_SI = {"yes", "sidewalk", "pedestrian_zone", "street", "patio", "garden", "roof"}


def build_bares(osm):
    """Todos los locales de hostelería de OSM (con o sin nombre) y su marca de terraza (outdoor_seating)."""
    out = []
    for e in osm["elements"]:
        t = e.get("tags", {})
        am = t.get("amenity")
        if am not in HOSTELERIA and t.get("leisure") != "outdoor_seating":
            continue
        if e["type"] == "node":
            lat, lon = e["lat"], e["lon"]
        elif "center" in e:
            lat, lon = e["center"]["lat"], e["center"]["lon"]
        else:
            continue
        x, y = dm(*TO_UTM.transform(lon, lat))
        os_ = t.get("outdoor_seating")
        b = {"id": e["id"], "o": e["type"], "n": t.get("name"), "a": am or "outdoor_seating", "x": x, "y": y,
             "terraza": ("si" if os_ in TERRAZA_SI or t.get("leisure") == "outdoor_seating" else "no" if os_ == "no" else None),
             "terraza_tag": os_}
        for k in ("addr:street", "addr:housenumber", "opening_hours", "check_date", "website", "cuisine",
                  "contact:instagram", "contact:facebook", "contact:tiktok", "phone"):
            if k in t:
                b[k] = t[k]
        out.append(b)
    return out


def main():
    osm_h = load_osm("osm_highways.json")
    osm_r = load_osm("osm_rest.json")
    print("Catastro…", file=sys.stderr)
    uses, buildings, parts, cstats = parse_catastro()
    print(f"  edificios {len(buildings)}  partes {len(parts)}  {cstats}", file=sys.stderr)
    streets = build_streets(osm_h)
    areas, lines, pois = build_areas_and_pois(osm_r)

    by_key = {(p["o"], p["id"]): p for p in pois}
    landmarks, missing = [], []
    for o, i, label in LANDMARKS:
        p = by_key.get((o, i))
        if p is None:
            missing.append(f"{o}/{i} {label}")
            continue
        if p["n"] != label:
            missing.append(f"{o}/{i}: nombre OSM '{p['n']}' ≠ esperado '{label}'")
        landmarks.append({**p, "hito": 1})

    def dump(name, obj):
        with open(OUT / name, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  {name}: {(OUT / name).stat().st_size / 1e6:.2f} MB", file=sys.stderr)

    h_osm = osm_heights(parts)
    cstats["partes_altura_osm"] = len(h_osm)
    dump("buildings.json", {"uses": uses, "b": buildings, "parts": parts, "h_osm": h_osm})
    dump("streets.json", streets)
    dump("areas.json", {"areas": areas, "lines": lines})
    dump("pois.json", {"pois": pois, "landmarks": landmarks})
    bares = []
    if (RAW / "osm_bares.json").exists():
        osm_b = load_osm("osm_bares.json")
        bares = build_bares(osm_b)
        dump("bares.json", {"timestamp": osm_b["osm3s"]["timestamp_osm_base"], "bares": bares})

    # Ajuste afín local (este, norte relativos al origen, en m) → (lat, lon), para enlaces a visores externos.
    to_wgs = Transformer.from_crs("EPSG:25830", "EPSG:4326", always_xy=True)
    samples = []
    for fx in (0.0, 0.25, 0.5, 0.75, 1.0):
        for fy in (0.0, 0.25, 0.5, 0.75, 1.0):
            e = E_MIN + fx * (E_MAX - E_MIN); n = N_MIN + fy * (N_MAX - N_MIN)
            lon, lat = to_wgs.transform(e, n)
            samples.append((e - ORIGIN[0], n - ORIGIN[1], lat, lon))

    def fit(col):
        # mínimos cuadrados 3x3 sin numpy
        import itertools
        A = [[1.0, s[0], s[1]] for s in samples]; y = [s[col] for s in samples]
        AtA = [[sum(A[k][i] * A[k][j] for k in range(len(A))) for j in range(3)] for i in range(3)]
        Aty = [sum(A[k][i] * y[k] for k in range(len(A))) for i in range(3)]
        M = [row[:] + [Aty[i]] for i, row in enumerate(AtA)]
        for i in range(3):
            p = max(range(i, 3), key=lambda r: abs(M[r][i])); M[i], M[p] = M[p], M[i]
            for r in range(3):
                if r != i:
                    f = M[r][i] / M[i][i]
                    M[r] = [M[r][c] - f * M[i][c] for c in range(4)]
        return [M[i][3] / M[i][i] for i in range(3)]

    lat_c, lon_c = fit(2), fit(3)
    max_err_m = 0.0
    for s in samples:
        la = lat_c[0] + lat_c[1] * s[0] + lat_c[2] * s[1]; lo = lon_c[0] + lon_c[1] * s[0] + lon_c[2] * s[1]
        e2, n2 = TO_UTM.transform(lo, la)
        max_err_m = max(max_err_m, math.hypot(e2 - ORIGIN[0] - s[0], n2 - ORIGIN[1] - s[1]))

    meta = {
        "latlon_afin": {"lat": lat_c, "lon": lon_c, "error_max_m": round(max_err_m, 2),
                        "nota": "lat = a0 + a1*E + a2*N (E, N en m relativos al origen)"},
        "origin_epsg25830": ORIGIN,
        "bbox_wgs84": BBOX_WGS84,
        "bbox_epsg25830": [E_MIN, N_MIN, E_MAX, N_MAX],
        "unidades": "decímetros relativos al origen; x=este, y=norte",
        "altura_por_planta_m": 3.0,
        "fuentes": {
            "catastro": {
                "nombre": "Catastro INSPIRE Buildings, municipio 02900 Albacete",
                "url": "https://www.catastro.hacienda.gob.es/INSPIRE/Buildings/02/02900-ALBACETE/A.ES.SDGC.BU.02900.zip",
                "fecha_datos": "2026-08-21",
                "atribucion": "Dirección General del Catastro",
                "nota": "Información transformada (extrusión por plantas). No es cartografía catastral. Donde OSM trae una altura medida (height) mayor, se usa esa.",
            },
            "osm": {
                "nombre": "OpenStreetMap vía Overpass API",
                "timestamp": osm_h["osm3s"]["timestamp_osm_base"],
                "atribucion": "© OpenStreetMap contributors (ODbL)",
            },
        },
        "recuentos": {
            "edificios": len(buildings), "partes": len(parts), **cstats,
            "calles": len(streets), "calles_con_nombre": len({s["n"] for s in streets if s["n"]}),
            "areas": len(areas), "lineas": len(lines), "pois": len(pois), "hitos": len(landmarks),
            "hosteleria": len(bares), "hosteleria_con_terraza": sum(1 for b in bares if b["terraza"] == "si"),
            "hosteleria_sin_dato_terraza": sum(1 for b in bares if b["terraza"] is None),
        },
        "hitos_incidencias": missing,
        "usos_catastro": uses,
    }
    dump("meta.json", meta)
    print(json.dumps(meta["recuentos"], ensure_ascii=False), file=sys.stderr)
    if missing:
        print("Incidencias hitos:", missing, file=sys.stderr)


if __name__ == "__main__":
    main()
