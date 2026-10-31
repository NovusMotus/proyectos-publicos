"""Valida los códigos CIE-10 de los catálogos contra la tabla oficial CIE-10-ES vigente."""
import csv, os, sys, re, difflib, unicodedata, collections
sys.stdout.reconfigure(encoding="utf-8")
D = os.path.dirname(os.path.abspath(__file__))
ofi = {}
for r in csv.DictReader(open(os.path.join(D, "cie10es_diagnosticos.tsv"), encoding="utf-8-sig"), delimiter="\t"):
    ofi[r["codigo"].strip().upper()] = (r["descripcion"], r.get("facturable", "").strip().lower() == "si")
por_cat = collections.defaultdict(list)
for c in ofi: por_cat[c.replace(".", "")[:3]].append(c)
low = lambda s: re.sub(r"[^a-z0-9 ]", " ", unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode())
def fmt(c):
    c = re.sub(r"[^A-Z0-9]", "", (c or "").upper())
    return c if len(c) <= 3 else c[:3] + "." + c[3:]
def sugerir(nombre, cat3):
    cands = por_cat.get(cat3) or []
    pool = [(c, ofi[c][0]) for c in cands if ofi[c][1]] or [(c, ofi[c][0]) for c in cands]
    if not pool: return ""
    best = max(pool, key=lambda x: difflib.SequenceMatcher(None, low(nombre), low(x[1])).ratio())
    return f"{best[0]} {best[1]}"
fuentes = [("medicina_interna", os.path.join(D, "..", "catalogo", "catalogo_medicina_interna.tsv")),
           ("especialidades", os.path.join(D, "..", "catalogo_especialidades", "catalogo_especialidades.tsv"))]
out = open(os.path.join(D, "validacion_codigos.tsv"), "w", encoding="utf-8", newline="")
w = csv.writer(out, delimiter="\t"); w.writerow(["catalogo", "especialidad", "enfermedad", "cie10_original", "estado", "descripcion_oficial", "sugerencia"])
for nombre_cat, path in fuentes:
    est = collections.Counter()
    for r in csv.DictReader(open(path, encoding="utf-8"), delimiter="\t"):
        c = fmt(r["cie10"]); cat3 = c[:3]
        if c in ofi:
            estado = "valido_final" if ofi[c][1] else "valido_incompleto"
            desc = ofi[c][0]; sug = "" if ofi[c][1] else sugerir(r["enfermedad"], cat3)
        elif cat3 in por_cat:
            estado, desc, sug = "no_existe_categoria_valida", "", sugerir(r["enfermedad"], cat3)
        else:
            estado, desc, sug = "no_existe", "", ""
        est[estado] += 1
        w.writerow([nombre_cat, r.get("especialidad", "medicina_interna"), r["enfermedad"], r["cie10"], estado, desc, sug])
    tot = sum(est.values())
    print(f"\n## {nombre_cat}: {tot} códigos")
    for k, v in est.most_common(): print(f"  {k:28s} {v:5d} ({100*v/tot:.1f} %)")
out.close()
print("\nDetalle en validacion_codigos.tsv")
