# /// script
# requires-python = ">=3.11"
# dependencies = ["pyproj>=3.6"]
# ///
"""Prepara los textos verificados para la web: vocabulario, agenda de eventos y tardeo.

Entradas (data/raw/): vocabulario.json, eventos.json, lugares.json, tardeo.json (si existen)
Salidas (web/data/):  vocabulario.json, eventos.json, tardeo.json

Reglas de rigor:
- Frases de vecinos: solo términos con confianza media/alta y aptos para saludo; se excluyen
  expresiones malsonantes o eufemismos de tacos ("odo"). Las frases que afirman algo sobre el
  tiempo o la hora llevan una condición y la web solo las usa cuando la condición se cumple.
- Eventos: solo los que traen url_fuente. La ubicación se toma de un elemento OSM identificado
  por nombre/dirección; si no hay coincidencia clara, el evento queda sin ubicación (no se inventa).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
WEB = ROOT / "web" / "data"

EXCLUIR_TERMINOS = {"odo"}  # eufemismo de "joder": no apto para un producto municipal

CONDICIONES = [  # (patrón en el texto, condición)
    (r"\bcalor\b", "calor"),
    (r"frío de verdad|\bfrío\b", "frio"),
    (r"refresca", "fresco"),
    (r"día estupendo", "buen_tiempo"),
    (r"^buenos días", "manana"),
    (r"^buenas tardes", "tarde"),
    (r"^buenas noches", "noche"),
    (r"del cole", "cole"),
    (r"después de comer", "sobremesa"),
    (r"el sol pega", "sol"),
]


# Temas sensibles: cada personaje puede vetarlos (personajes.json → 'no_dice'). Se detectan en el texto normalizado.
TEMAS = [
    (r"\b(cerdo|jamon|chorizo|morcilla|tocino|panceta|lomo|matanza|embutido|salchich|torrezn|chicharr|manteca|cochinillo|oreja)", "cerdo"),
    (r"\b(cerveza|cana|canas|vino|copa|copas|cubata|tercio|vermu|chato|licor|chupito|sangria|tinto|cazalla|mistela)\b", "alcohol"),
]


def norm(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s.lower()).strip()


def build_vocab():
    f = RAW / "vocabulario.json"
    if not f.exists():
        return None
    v = json.loads(f.read_text(encoding="utf-8"))
    validos = {t["termo"] for t in v["terminos"] if t.get("apto_saludo") and t.get("confianza") in ("alta", "media")
               and t["termo"] not in EXCLUIR_TERMINOS}
    frases, descartadas = [], []
    for fr in v["frases"]:
        usados = fr.get("terminos_usados", [])
        if any(u not in validos for u in usados):
            # términos de comida o lugar documentados como sustantivos propios se aceptan si están en el glosario
            if not all(u in {t["termo"] for t in v["terminos"]} and u not in EXCLUIR_TERMINOS for u in usados):
                descartadas.append(fr["texto"]); continue
        conds = sorted({c for pat, c in CONDICIONES if re.search(norm(pat), norm(fr["texto"]))})
        temas = sorted({t for pat, t in TEMAS if re.search(pat, norm(fr["texto"]))})
        frases.append({**fr, "cond": conds, "temas": temas})
    terminos = [t for t in v["terminos"] if t["termo"] not in EXCLUIR_TERMINOS]
    out = {"terminos": terminos, "frases": frases, "fecha_consulta": v.get("fecha_consulta"),
           "excluidos": sorted(EXCLUIR_TERMINOS), "frases_descartadas": descartadas}
    (WEB / "vocabulario.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"vocabulario: {len(terminos)} términos, {len(frases)} frases ({len(descartadas)} descartadas)", file=sys.stderr)
    return out


def load_pois():
    p = json.loads((WEB / "pois.json").read_text(encoding="utf-8"))
    b = json.loads((WEB / "bares.json").read_text(encoding="utf-8")) if (WEB / "bares.json").exists() else {"bares": []}
    cands = p["pois"] + [{**x, "c": f"amenity={x['a']}"} for x in b["bares"] if x.get("n")]
    return cands


STOP = {"de", "del", "la", "el", "los", "las", "y", "en", "albacete", "sala", "centro", "municipal", "teatro", "plaza", "calle", "c/"}


def tokens(s):
    return {w for w in re.findall(r"[a-z0-9]+", norm(s)) if w not in STOP and len(w) > 2}


# Reglas manuales documentadas (lugar normalizado → elemento OSM). Solo cuando hay base para la equivalencia.
MANUAL = {
    "recinto ferial": ("way", 448690859, "Puerta de Hierros, acceso principal del recinto ferial (inferencia: el evento no da dirección)", "media"),
}
CARTO = "https://www.cartociudad.es/geocoder/api/geocoder/find?q={}"


def _to_dm(lat, lon):
    from pyproj import Transformer
    meta = json.loads((WEB / "meta.json").read_text(encoding="utf-8"))
    oe, on = meta["origin_epsg25830"]
    e, n = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True).transform(lon, lat)
    return round((e - oe) * 10), round((n - on) * 10)


def cartociudad(direccion):
    """Geocodifica un portal con número con CartoCiudad (IGN). Devuelve (lat, lon, texto) o None."""
    import urllib.parse, urllib.request
    if not direccion or not re.search(r"\d", direccion.split(",")[0] + (direccion.split(",")[1] if "," in direccion else "")):
        return None
    q = direccion if "albacete" in norm(direccion) else direccion + ", Albacete"
    try:
        req = urllib.request.Request(CARTO.format(urllib.parse.quote(q)), headers={"User-Agent": "albacete-a-escala-demo/0.1"})
        j = json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))
    except Exception:  # noqa: BLE001
        return None
    if j.get("type") == "portal" and j.get("muni") == "Albacete" and j.get("lat"):
        return j["lat"], j["lng"], f"{j.get('tip_via','')} {j.get('address','')} {j.get('portalNumber','')} (ref. catastral {j.get('refCatastral')})"
    return None


def street_midpoint(direccion, streets):
    """Para direcciones s/n: punto medio de la calle homónima en OSM (confianza baja)."""
    if not direccion:
        return None
    via = norm(re.split(r"[,(]| s/n| s\/n", direccion, flags=re.I)[0])
    via = re.sub(r"^(c/|calle|callejon|avenida|av\.|avda\.|plaza|paseo)\s+", "", via)
    via = re.sub(r"^(de las |de los |de la |del |de |las |los |la |el )", "", via).strip()
    if len(via) < 4:
        return None
    cands = [s for s in streets if s.get("n") and via in norm(s["n"])]
    if not cands:
        return None
    pts = [(c["p"][i], c["p"][i + 1], c["id"], c["n"]) for c in cands for i in range(0, len(c["p"]), 2)]
    mx = sum(p[0] for p in pts) / len(pts); my = sum(p[1] for p in pts) / len(pts)
    best = min(pts, key=lambda p: (p[0] - mx) ** 2 + (p[1] - my) ** 2)
    return best[0], best[1], f"calle OSM «{best[3]}» (way {best[2]}); dirección sin número: punto de la calle, no del recinto"


def locate(lugar, direccion, pois, streets):
    """Ubica un lugar. Orden: nombre exacto OSM → regla manual → portal CartoCiudad → nombre parecido OSM → calle (s/n)."""
    ln = norm(lugar or "")
    if ln in ("albacete", "albacete capital"):
        ln, lugar = "", None  # nombre genérico de la ciudad: no identifica un recinto
    if re.match(r"^(calle|avenida|paseo|plaza|callejon|ronda|carretera)\b", ln):
        sm = street_midpoint(lugar, streets)  # el "lugar" es una vía: se ubica como vía, no como un edificio de esa vía
        if sm:
            return sm[0], sm[1], {"fuente": "OSM (calle)", "detalle": sm[2].replace("dirección sin número", "el evento indica solo la vía"), "confianza": "baja"}
    if ln:
        exact = [p for p in pois if norm(p["n"]) == ln]
        if exact:
            p = exact[0]
            return p["x"], p["y"], {"fuente": f"OSM {p['o']}/{p['id']}", "detalle": f"nombre exacto: {p['n']}", "confianza": "alta"}
        if ln in MANUAL:
            o, i, det, conf = MANUAL[ln]
            p = next((q for q in pois if q["o"] == o and q["id"] == i), None)
            if p:
                return p["x"], p["y"], {"fuente": f"OSM {o}/{i}", "detalle": det, "confianza": conf}
    cc = cartociudad(direccion)
    if cc:
        x, y = _to_dm(cc[0], cc[1])
        return x, y, {"fuente": "CartoCiudad (IGN)", "detalle": f"portal: {cc[2]}", "confianza": "alta"}
    if ln:
        lt = tokens(lugar)
        best, score = None, 0.0
        for p in pois:
            pt = tokens(p["n"])
            if not pt or not lt:
                continue
            sc = len(lt & pt) / max(len(lt), len(pt))
            if sc > score:
                best, score = p, sc
        if best and score >= 0.67:
            return best["x"], best["y"], {"fuente": f"OSM {best['o']}/{best['id']}", "detalle": f"coincidencia de nombre ({score:.0%}): {best['n']}", "confianza": "media"}
    sm = street_midpoint(direccion, streets)
    if sm:
        return sm[0], sm[1], {"fuente": "OSM (calle)", "detalle": sm[2], "confianza": "baja"}
    return None, None, None


def build_eventos():
    f = RAW / "eventos.json"
    if not f.exists():
        return None
    ev = json.loads(f.read_text(encoding="utf-8"))
    lugares = {}
    if (RAW / "lugares.json").exists():
        for l in json.loads((RAW / "lugares.json").read_text(encoding="utf-8")):
            lugares[norm(l.get("lugar_nombre"))] = l
    pois = load_pois()
    streets = json.loads((WEB / "streets.json").read_text(encoding="utf-8"))
    out, sin_url, sin_geo = [], 0, 0
    for e in ev:
        if not e.get("url_fuente"):
            sin_url += 1; continue
        dirc = e.get("direccion") or (lugares.get(norm(e.get("lugar_nombre"))) or {}).get("direccion")
        x, y, geo = locate(e.get("lugar_nombre"), dirc, pois, streets)
        if x is None:
            sin_geo += 1
        out.append({**e, "x": x, "y": y, "geo": geo})
    (WEB / "eventos.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"eventos: {len(out)} con fuente ({sin_url} descartados sin URL); {len(out) - sin_geo} ubicados, {sin_geo} sin ubicación", file=sys.stderr)
    for e in out:
        print(f"  {e['fecha_inicio']} {e['titulo'][:50]:50s} | {(e.get('lugar_nombre') or '—')[:30]:30s} | {e['geo']['detalle'] if e['geo'] else 'SIN UBICAR'}", file=sys.stderr)
    return out


def build_tardeo():
    f = RAW / "tardeo.json"
    if not f.exists():
        return None
    t = json.loads(f.read_text(encoding="utf-8"))
    sys.path.insert(0, str(Path(__file__).parent))
    from verificar import status, wayback  # noqa: E402
    for fu in t.get("fuentes", []):
        st = status(fu["url"]) if fu.get("url") else None
        if st == 200:
            fu["enlace"] = {"estado": "ok"}
        elif st in (401, 403, 406, 429):
            wb = wayback(fu["url"])
            fu["enlace"] = {"estado": "copia archivada", "url": wb} if wb else {"estado": "no comprobado", "motivo": f"la web rechaza robots ({st}) y no hay copia en Wayback"}
        else:
            fu["enlace"] = {"estado": "no comprobado", "motivo": f"respuesta {st}"}
    (WEB / "tardeo.json").write_text(json.dumps(t, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"tardeo: veredicto «{t.get('veredicto')}» ({t.get('confianza')}), {len(t.get('fuentes', []))} fuentes", file=sys.stderr)
    return t


if __name__ == "__main__":
    build_vocab()
    build_eventos()
    build_tardeo()
