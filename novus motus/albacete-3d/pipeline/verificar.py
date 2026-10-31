"""Comprobaciones automáticas de los datos publicados en web/data/. Escribe data/build/verificacion.md.

No sustituye a la revisión independiente requerida (gpt-6-astra, pendiente): solo detecta errores mecánicos.
"""
import datetime as dt
import json
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web" / "data"
UA = {"User-Agent": "albacete-a-escala-demo/0.1"}
HOY = "2026-09-26"


def load(name):
    f = WEB / name
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else None


def status(url):
    try:
        req = urllib.request.Request(url, headers=UA, method="GET")
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # noqa: BLE001
        return f"error: {type(e).__name__}"


def wayback(url):
    """Para webs que bloquean robots (403/406/429): ¿hay copia en el Internet Archive?"""
    try:
        q = "https://archive.org/wayback/available?url=" + urllib.parse.quote(url, safe="")
        with urllib.request.urlopen(urllib.request.Request(q, headers=UA), timeout=25) as r:
            snap = json.loads(r.read().decode("utf-8")).get("archived_snapshots", {}).get("closest")
        return snap["url"] if snap and snap.get("available") else None
    except Exception:  # noqa: BLE001
        return None


def main():
    out = [f"# Verificación automática ({dt.datetime.now().strftime('%Y-%m-%d %H:%M')})", "",
           "Comprobaciones mecánicas. La revisión independiente con gpt-6-astra sigue pendiente.", ""]
    problemas = 0

    meta = load("meta.json")
    out += ["## Recuentos", "", "```", json.dumps(meta["recuentos"], ensure_ascii=False, indent=1), "```", ""]
    if meta.get("hitos_incidencias"):
        problemas += len(meta["hitos_incidencias"])
        out += ["**Incidencias en hitos:**"] + [f"- {x}" for x in meta["hitos_incidencias"]] + [""]

    ev = load("eventos.json")
    if ev is not None:
        out += ["## Agenda", ""]
        urls = sorted({e["url_fuente"] for e in ev})
        with ThreadPoolExecutor(6) as ex:
            st = dict(zip(urls, ex.map(status, urls)))
        for e in ev:
            flags = []
            try:
                dt.date.fromisoformat(e["fecha_inicio"])
                if e.get("fecha_fin"):
                    dt.date.fromisoformat(e["fecha_fin"])
            except Exception:  # noqa: BLE001
                flags.append("fecha no ISO")
            if (e.get("fecha_fin") or e["fecha_inicio"]) < HOY:
                flags.append("ya pasado")
            s = st.get(e["url_fuente"])
            if s != 200:
                flags.append(f"URL {s}")
            if e.get("x") is None:
                flags.append("sin ubicación")
            if flags:
                problemas += 1 if any(f.startswith(("URL", "fecha")) for f in flags) else 0
            out.append(f"- {e['fecha_inicio']} · {e['titulo'][:70]} · {(e.get('lugar_nombre') or '—')[:40]} · "
                       f"{'OK' if not flags else ', '.join(flags)}")
        out.append("")

    vo = load("vocabulario.json")
    if vo is not None:
        terms = {t["termo"] for t in vo["terminos"]}
        malas = [f["texto"] for f in vo["frases"] if any(u not in terms for u in f.get("terminos_usados", []))]
        sin_fuente = [t["termo"] for t in vo["terminos"] if not t.get("fuentes")]
        out += ["## Vocabulario", "", f"- {len(terms)} términos, {len(vo['frases'])} frases",
                f"- Frases con términos fuera del glosario: {malas or 'ninguna'}",
                f"- Términos sin fuente: {sin_fuente or 'ninguno'}", ""]
        problemas += len(malas) + len(sin_fuente)

    ta = load("tardeo.json")
    if ta is not None:
        out += ["## Tardeo", "", f"- Veredicto: {ta.get('veredicto')} ({ta.get('confianza')})"]
        urls = [f["url"] for f in ta.get("fuentes", []) if f.get("url")]
        with ThreadPoolExecutor(6) as ex:
            for u, s in zip(urls, ex.map(status, urls)):
                if s in (401, 403, 406, 429):
                    wb = wayback(u)
                    out.append(f"- {s} (bloqueo a robots) {u}" + (f" · copia en Wayback: {wb}" if wb else " · SIN copia en Wayback"))
                    problemas += 0 if wb else 1
                else:
                    out.append(f"- {s} {u}")
                    problemas += 0 if s == 200 else 1
        out.append("")

    co = load("colores.json")
    if co is not None:
        b = load("buildings.json")
        ok = co["alineado_con"]["partes"] == len(b["parts"]) and co["alineado_con"]["primera_ref"] == b["b"][0][0]
        out += ["## Colores", "", f"- Alineado con buildings.json: {'sí' if ok else 'NO'}",
                f"- Fachadas: {co['recuentos_fachadas']}", f"- Cubiertas con color: {co['cubiertas_con_color']}", ""]
        problemas += 0 if ok else 1

    ft = load("fachadas_tiles.json")
    if ft is not None:
        b = load("buildings.json")
        ok = ft["alineado_con"]["edificios"] == len(b["b"]) and ft["alineado_con"]["primera_ref"] == b["b"][0][0]
        n = sum(1 for x in ft["tile_por_edificio"] if x >= 0)
        out += ["## Texturas de fachada", "", f"- Alineadas con buildings.json: {'sí' if ok else 'NO'}",
                f"- Edificios con textura de foto: {n} de {len(b['b'])}; descartes: {ft['recuentos']}",
                f"- Atlas: {ft['atlas_px']} px (necesita GPU con texturas de {max(ft['atlas_px'])} px)", ""]
        problemas += 0 if ok else 1
        h = b.get("h_osm", {})
        out += ["## Alturas medidas (OSM)", "", f"- Partes con altura OSM: {len(h)}"] + [f"  - parte {k}: {v[0]} m ({v[1]}, {v[2]})" for k, v in list(h.items())[:30]] + [""]
    mo = load("mobiliario.json")
    if mo is not None:
        out += ["## Mobiliario (OSM)", "", f"- {mo['recuentos']} · instantánea {mo['timestamp']}", ""]
    jc = load("bares_jccm.json")
    if jc is not None:
        r = jc["recuentos"]
        cuadra = r["filas"] == r["sin_portal"] + r["fuera_de_zona"] + r["confirmados_osm"] + r["misma_direccion_otro_nombre"] + r["solo_registro"]
        out += ["## Registro JCCM", "", f"- {r}", f"- Suma de categorías = filas: {'sí' if cuadra else 'NO'}", ""]
        problemas += 0 if cuadra else 1

    out += [f"**Problemas detectados: {problemas}**", ""]
    (ROOT / "data" / "build" / "verificacion.md").write_text("\n".join(out), encoding="utf-8")
    print("\n".join(out))
    return problemas


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
