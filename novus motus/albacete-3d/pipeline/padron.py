"""Frecuencia de cada vecino según la población real de Albacete (ciudad) → web/data/demografia.json.

Fuente: INE, Censo Anual de Población, tabla 68547 «Población por sexo, edad (grupos quinquenales) y país de nacimiento
(principales países) (Capitales de provincia y principales ciudades)», Albacete, ambos sexos, 1 de enero de 2025.
Descarga: https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/68547?nult=1&tv=19:559&tv=18:451
         (guardada en data/raw/ine_68547_albacete_2025.json).

Método:
- Se agrupan los países de nacimiento en los grupos de origen de los personajes y las edades en 4 franjas.
- La tabla cruza edad y país: el peso de cada casilla (origen, franja) se reparte a partes iguales entre los personajes
  de esa casilla; si una casilla no tiene personaje, su peso pasa a los personajes del mismo origen con la franja más
  próxima (se declara en 'reasignaciones').
Límites declarados: el país de nacimiento no es la etnia ni la religión. Los nacidos en España incluyen a hijos de
familias de origen extranjero, así que la diversidad entre los menores queda infraestimada. Los nacidos en otros países
de Europa, Norteamérica y Oceanía se asignan a los personajes «de aquí» (grupo 'espana_y_resto').
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
WEB = ROOT / "web" / "data"

GRUPOS = {
    "america_latina": ["México", "Cuba", "Honduras", "Nicaragua", "República Dominicana", "Otro país de Centro América y Caribe",
                       "Argentina", "Bolivia", "Brasil", "Colombia", "Chile", "Ecuador", "Paraguay", "Perú", "Uruguay",
                       "Venezuela", "Otros países de Sudamérica"],
    "magreb": ["Argelia", "Marruecos", "Mauritania"],
    "africa_subsahariana": ["Gambia", "Ghana", "Guinea", "Guinea Ecuatorial", "Mali", "Nigeria", "Senegal", "Otros países de África"],
    "asia_oriental": ["China", "Filipinas"],
    "asia_meridional": ["Bangladesh", "India", "Pakistán"],
    "asia_otros": ["Otros países de Asia"],  # sin desglose: se reparte entre los dos grupos asiáticos según su peso
}
FRANJAS = {"nino": (0, 14), "joven": (15, 29), "adulto": (30, 64), "mayor": (65, 200)}
ORDEN = ["nino", "joven", "adulto", "mayor"]


def edad_franja(nombre):
    if nombre.startswith("100"):
        return "mayor"
    a = int(nombre.split()[1])
    return next(k for k, (lo, hi) in FRANJAS.items() if lo <= a <= hi)


def main():
    series = json.loads((RAW / "ine_68547_albacete_2025.json").read_text(encoding="utf-8"))
    pais_grupo = {p: g for g, ps in GRUPOS.items() for p in ps}
    celdas, total, fecha = {}, None, None
    for s in series:
        partes = [x.strip() for x in s["Nombre"].split(".")]
        # el INE alterna el orden «<país>. <edad>» y «<edad>. <país>»: se identifican por el contenido
        a_, b_ = partes[2], partes[3]
        es_edad = lambda t: t == "Todas las edades" or t.startswith("De ") or t.startswith("100")
        edad, pais = (a_, b_) if es_edad(a_) else (b_, a_)
        val = s["Data"][0]["Valor"] if s["Data"] else None
        fecha = s["Data"][0]["Anyo"] if s["Data"] else fecha
        if pais == "Total" and edad == "Todas las edades":
            total = val
        if pais == "Total" or edad == "Todas las edades" or val is None:
            continue
        g = pais_grupo.get(pais, "espana_y_resto")
        f = edad_franja(edad)
        celdas[(g, f)] = celdas.get((g, f), 0) + val
    # «Otros países de Asia» se reparte entre asia_oriental y asia_meridional según su peso por franja
    for f in ORDEN:
        otros = celdas.pop(("asia_otros", f), 0)
        ao, am = celdas.get(("asia_oriental", f), 0), celdas.get(("asia_meridional", f), 0)
        tot = ao + am or 1
        celdas[("asia_oriental", f)] = ao + otros * ao / tot
        celdas[("asia_meridional", f)] = am + otros * am / tot
    suma = sum(celdas.values())

    at = json.loads((WEB / "personajes" / "atlas.json").read_text(encoding="utf-8"))
    pers = [(v["id"], "espana_y_resto" if v["origen"] == "espana" else v["origen"], v["edad"]) for v in at["variantes"]]
    pesos = {pid: 0.0 for pid, _, _ in pers}
    reasig = []
    for (g, f), m in sorted(celdas.items()):
        mismos = [p for p in pers if p[1] == g]
        if not mismos:
            reasig.append(f"{g}/{f}: sin personajes de ese origen ({m:.0f} personas) → no se representa")
            continue
        exactos = [p for p in mismos if p[2] == f]
        if not exactos:
            dmin = min(abs(ORDEN.index(p[2]) - ORDEN.index(f)) for p in mismos)
            exactos = [p for p in mismos if abs(ORDEN.index(p[2]) - ORDEN.index(f)) == dmin]
            reasig.append(f"{g}/{f} ({m:.0f} personas) → {', '.join(p[0] for p in exactos)}")
        for p in exactos:
            pesos[p[0]] += m / len(exactos)
    out = {
        "fuente": "INE, Censo Anual de Población, tabla 68547 (país de nacimiento x edad), Albacete ciudad, ambos sexos",
        "url": "https://www.ine.es/jaxiT3/Tabla.htm?t=68547", "fecha": f"1 de enero de {fecha}", "poblacion_total": total,
        "grupos": {f"{g}/{f}": round(m) for (g, f), m in sorted(celdas.items())},
        "pesos": {k: round(v / suma, 5) for k, v in pesos.items()},
        "reasignaciones": reasig,
        "limites": ("País de nacimiento, no etnia ni religión. Los nacidos en España incluyen hijos de familias de origen extranjero "
                    "(la diversidad de los menores queda infraestimada). Otros países de Europa, Norteamérica y Oceanía se asignan a los "
                    "personajes «de aquí». «Otros países de Asia» se reparte entre los dos grupos asiáticos."),
    }
    (WEB / "demografia.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"total {total} (suma celdas {suma:.0f}); fecha {fecha}", file=sys.stderr)
    for g in sorted({g for g, _ in celdas}):
        print(f"  {g:22s} {sum(m for (gg, _), m in celdas.items() if gg == g) / suma:6.2%}", file=sys.stderr)
    for k, v in sorted(out["pesos"].items(), key=lambda x: -x[1]):
        print(f"  {k:14s} {v:6.2%}  (~{v * 80:.1f} de 80 vecinos)", file=sys.stderr)
    for r in reasig:
        print("  reasignado:", r, file=sys.stderr)


if __name__ == "__main__":
    main()
