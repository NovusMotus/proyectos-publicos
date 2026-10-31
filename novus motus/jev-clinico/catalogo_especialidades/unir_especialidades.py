"""Une los TSV de raw/ en un catálogo jerárquico y valida el formato."""
import csv, json, glob, os, re, unicodedata, collections, sys

BASE = os.path.dirname(os.path.abspath(__file__))
COLS = ["categoria","subcategoria","enfermedad","cie10","frecuencia_es","origen",
        "no_pasar_por_alto","pistas_clave","dato_clave","fuente"]
FREC = {"alta","media","baja","rara"}
ORIG = {"autoctona","importada_inmigracion","importada_viajero","autoctona_e_importada","emergente_autoctona"}
MAX_BLOQUE = 25

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+","_",s).strip("_")

EXCL = {l.strip() for l in open(os.path.join(BASE, "excluir.txt"), encoding="utf-8") if l.strip() and not l.startswith("#")} if os.path.exists(os.path.join(BASE, "excluir.txt")) else set()
excl_usadas = set()
rows, avisos = [], []
for path in sorted(glob.glob(os.path.join(BASE,"raw","*.tsv"))):
    with open(path, encoding="utf-8-sig", newline="") as f:
        rd = csv.DictReader(f, delimiter="\t")
        if rd.fieldnames is None or [c.strip() for c in rd.fieldnames] != COLS:
            avisos.append(f"{os.path.basename(path)}: cabecera distinta -> {rd.fieldnames}")
        for i, r in enumerate(rd, start=2):
            r = {k.strip(): (v or "").strip() for k, v in r.items() if k}
            r["_archivo"] = os.path.basename(path); r["_linea"] = i
            r["especialidad"] = os.path.basename(path).split("_")[0].replace(".tsv", "")
            for k in ("categoria","subcategoria"): r[k] = slug(r.get(k,""))
            if not r.get("enfermedad"): continue
            if r["enfermedad"] in EXCL:
                excl_usadas.add(r["enfermedad"]); continue
            if r.get("frecuencia_es") not in FREC: avisos.append(f"{r['_archivo']}:{i} frecuencia '{r.get('frecuencia_es')}'")
            if r.get("origen") not in ORIG: avisos.append(f"{r['_archivo']}:{i} origen '{r.get('origen')}'")
            if r.get("no_pasar_por_alto") not in ("si","no"): avisos.append(f"{r['_archivo']}:{i} no_pasar_por_alto '{r.get('no_pasar_por_alto')}'")
            rows.append(r)

# duplicados por nombre normalizado
vistos, unicos, dups = {}, [], []
for r in rows:
    k = r["especialidad"] + "|" + slug(r["enfermedad"])
    if k in vistos:
        dups.append(f"{r['enfermedad']} ({r['_archivo']}) duplica a ({vistos[k]['_archivo']})")
        continue
    vistos[k] = r; r["id"] = slug(r["enfermedad"]); unicos.append(r)


# correcciones de códigos CIE-10-ES (6ª ed., 2026), revisadas fila a fila
CORR = {}
_cf = os.path.join(BASE, "..", "cie10es", "correcciones_cie10.tsv")
if os.path.exists(_cf):
    for c in csv.DictReader(open(_cf, encoding="utf-8"), delimiter="	"):
        if c["catalogo"] == "especialidades":
            CORR[(c["especialidad"], c["enfermedad"])] = c["cie10_corregido"].strip()
n_corr = 0
for r in unicos:
    k = (r.get("especialidad", "medicina_interna"), r["enfermedad"])
    if k in CORR and CORR[k] != r["cie10"]:
        r["cie10"] = CORR[k]; n_corr += 1

# jerarquía y bloques
arbol = collections.OrderedDict()
for r in unicos:
    arbol.setdefault(r["especialidad"] + "/" + r["categoria"], collections.OrderedDict()).setdefault(r["subcategoria"], []).append(r)
grandes = [(c, s, len(v)) for c, subs in arbol.items() for s, v in subs.items() if len(v) > MAX_BLOQUE]

catalogo = {"version": "0.1", "max_opciones_por_bloque": MAX_BLOQUE, "categorias": {}}
for c, subs in arbol.items():
    catalogo["categorias"][c] = {s: [{k: r[k] for k in ["id"] + COLS[2:]} for r in v] for s, v in subs.items()}
json.dump(catalogo, open(os.path.join(BASE,"catalogo_especialidades.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=1)
with open(os.path.join(BASE,"catalogo_especialidades.tsv"),"w",encoding="utf-8",newline="") as f:
    w = csv.writer(f, delimiter="\t"); w.writerow(["especialidad", "id"] + COLS)
    for r in unicos: w.writerow([r["especialidad"], r["id"]] + [r.get(k,"") for k in COLS])

import collections as _c
print("por especialidad:", dict(_c.Counter(r["especialidad"] for r in unicos)))
print("códigos CIE-10-ES corregidos:", n_corr)
print("filas leídas:", len(rows), "| únicas:", len(unicos), "| duplicadas:", len(dups))
print("categorías:", len(arbol), "| subcategorías:", sum(len(s) for s in arbol.values()))
for c, subs in arbol.items():
    print(f"  {c:32s} {sum(len(v) for v in subs.values()):4d} enf. en {len(subs)} subcat.")
cnt = lambda k: dict(collections.Counter(r.get(k) for r in unicos))
print("frecuencia:", cnt("frecuencia_es")); print("origen:", cnt("origen")); print("no_pasar_por_alto:", cnt("no_pasar_por_alto"))
print("bloques > 25:", grandes)
print("avisos de formato:", len(avisos)); [print("  ", a) for a in avisos[:40]]
print("exclusiones aplicadas:", len(excl_usadas), "de", len(EXCL), "| no encontradas:", sorted(EXCL - excl_usadas))
print("duplicados:"); [print("  ", d) for d in dups[:60]]
