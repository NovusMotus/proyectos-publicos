"""Cobertura de cada catálogo de especialidad frente a los diagnósticos del RAE-CMBD de su servicio."""
import csv, os, sys, re, glob
sys.stdout.reconfigure(encoding="utf-8")
D = os.path.dirname(os.path.abspath(__file__))
cat = list(csv.DictReader(open(os.path.join(D, "..", "catalogo_especialidades.tsv"), encoding="utf-8"), delimiter="\t"))
MI = list(csv.DictReader(open(os.path.join(D, "..", "..", "catalogo", "catalogo_medicina_interna.tsv"), encoding="utf-8"), delimiter="	"))
MI_EQ = {r["codigo"] for r in csv.DictReader(open(os.path.join(D, "..", "..", "catalogo", "rae_cmbd", "equivalencias.tsv"), encoding="utf-8"), delimiter="	")}
norm = lambda c: re.sub(r"[^A-Z0-9]", "", (c or "").upper())
for f in sorted(glob.glob(os.path.join(D, "diagnosticos_*.tsv"))):
    nombre = os.path.basename(f)[len("diagnosticos_"):-4]
    esp = nombre.split("_")[0]
    sub = [r for r in cat if r["especialidad"] == esp]
    if not sub: print(f"\n## {nombre}: sin catálogo '{esp}'"); continue
    pref = {norm(r["cie10"])[:3] for r in sub}
    eqf = os.path.join(D, f"equivalencias_{esp}.tsv")
    eq = {r["codigo"]: r["enfermedad_catalogo"] for r in csv.DictReader(open(eqf, encoding="utf-8"), delimiter="\t")} if os.path.exists(eqf) else {}
    nombres = {r["enfermedad"] for r in sub}
    rae = [r for r in csv.DictReader(open(f, encoding="utf-8-sig"), delimiter="\t") if r.get("nivel") == "cie10_3"]
    pref_mi = {norm(r["cie10"])[:3] for r in MI} | MI_EQ
    T = E = cod = eqv = comb = 0; resto = []
    for r in rae:
        n = int(r["altas"]) if (r.get("altas") or "").strip() else 0
        T += n
        if r["codigo"][0] in "RZ" or r["codigo"] == "ZZZ": continue
        E += n
        if r["codigo"] in pref or r["codigo"] in pref_mi or (r["codigo"] in eq and eq[r["codigo"]] in nombres): comb += n
        if r["codigo"] in pref: cod += n
        elif r["codigo"] in eq and eq[r["codigo"]] in nombres: eqv += n
        else: resto.append((n, r["codigo"], r["descripcion"]))
    resto.sort(reverse=True)
    print(f"\n## {nombre}  (catálogo {esp}: {len(sub)} entidades)")
    print(f"altas: {T} | con enfermedad: {E} ({100*E/max(T,1):.1f} %)")
    print(f"cobertura por código: {100*cod/max(E,1):.1f} % | + equivalencias: {100*(cod+eqv)/max(E,1):.1f} %")
    print(f"cobertura combinada con catálogo de medicina interna: {100*comb/max(E,1):.1f} %")
    print("primeras no cubiertas (solo especialidad):")
    for n, c, d in resto[:30]: print(f"  {n:6d} {c} {d[:80]}")
