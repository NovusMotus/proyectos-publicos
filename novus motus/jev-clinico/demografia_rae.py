"""Edad, sexo, estancia y comorbilidades del RAE-CMBD 2024 incorporadas a los catálogos.

Por entidad (vía su categoría CIE-10-ES de 3 caracteres, en el servicio correspondiente):
  pct_mujer, edad_p25 / edad_mediana / edad_p75 (a partir de grupos quinquenales), estancia_media
  y demografia_fuente = 'codigo' o 'servicio' (si la categoría tiene < 30 altas con edad y sexo conocidos,
  se usa la distribución global del servicio).
Además: distribución edad × sexo por código (para muestrear casos) y prevalencia aproximada de
comorbilidades por servicio.
"""
import csv, os, re, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
B = os.path.dirname(os.path.abspath(__file__))
DD = os.path.join(B, "rae_cmbd_demografia")
MIN_N = 30
ALTAS = {"mi": 948184, "cardiologia": 232357, "geriatria": 71979, "infecciosas": 26518, "dermatologia": 2734}

def rango(g):
    if g.startswith("Menos de 1"): return (0, 1)
    m = re.match(r"(\d+)-(\d+)", g)
    if m: return (int(m[1]), int(m[2]) + 1)
    m = re.match(r"(\d+) o más", g)
    if m: return (int(m[1]), int(m[1]) + 5)
    return None

def cargar_edad_sexo(path):
    d = collections.defaultdict(collections.Counter)   # codigo -> Counter((rango, sexo))
    for r in csv.DictReader(open(path, encoding="utf-8-sig"), delimiter="\t"):
        g = rango(r["grupo_edad"]); s = r["sexo"]
        if g is None or s not in ("Hombre", "Mujer") or not r["altas"].strip(): continue
        d[r["codigo"]][(g, s)] += int(r["altas"])
    return d

def percentil(cnt, q):
    tot = sum(cnt.values()); acc = 0
    for (a, b), n in sorted(((g, n) for (g, s), n in cnt.items()), key=lambda x: x[0]):
        pass
    por_edad = collections.Counter()
    for (g, s), n in cnt.items(): por_edad[g] += n
    for (a, b) in sorted(por_edad):
        n = por_edad[(a, b)]
        if acc + n >= q * tot:
            return round(a + (q * tot - acc) / n * (b - a), 1)
        acc += n
    return None

def resumen(cnt):
    tot = sum(cnt.values())
    muj = sum(n for (g, s), n in cnt.items() if s == "Mujer")
    return {"pct_mujer": round(100 * muj / tot, 1), "edad_p25": percentil(cnt, .25),
            "edad_mediana": percentil(cnt, .5), "edad_p75": percentil(cnt, .75), "n_demografia": tot}

def procesar(servicio, archivo_es, archivo_est, catalogos):
    es = cargar_edad_sexo(os.path.join(DD, archivo_es))
    glob_cnt = collections.Counter()
    for c in es.values(): glob_cnt.update(c)
    est = {}
    if archivo_est and os.path.exists(os.path.join(DD, archivo_est)):
        for r in csv.DictReader(open(os.path.join(DD, archivo_est), encoding="utf-8-sig"), delimiter="\t"):
            if r["estancia_media"].strip(): est[r["codigo"]] = r["estancia_media"]
    # distribución por código para muestreo
    with open(os.path.join(DD, f"distribucion_edad_sexo_{servicio}.tsv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t"); w.writerow(["codigo", "edad_desde", "edad_hasta", "sexo", "prob", "n_codigo"])
        for cod, cnt in es.items():
            base = cnt if sum(cnt.values()) >= MIN_N else glob_cnt
            t = sum(base.values())
            for ((a, b), s), n in sorted(base.items()):
                w.writerow([cod, a, b - 1, s, f"{n/t:.5f}", sum(cnt.values())])
    g = resumen(glob_cnt)
    print(f"\n## {servicio}: {len(es)} códigos con edad/sexo | global: mujer {g['pct_mujer']} %, edad mediana {g['edad_mediana']} (p25 {g['edad_p25']}, p75 {g['edad_p75']})")
    for path, filtro in catalogos:
        rows = list(csv.DictReader(open(path, encoding="utf-8"), delimiter="\t"))
        cols = list(rows[0].keys())
        nuevos = [f"{k}_{servicio}" for k in ("pct_mujer", "edad_p25", "edad_mediana", "edad_p75", "estancia_media", "demografia_fuente")]
        n_cod = n_srv = 0
        for r in rows:
            if filtro and r.get("especialidad") != filtro: continue
            c3 = re.sub(r"[^A-Z0-9]", "", r["cie10"].upper())[:3]
            cnt = es.get(c3)
            if cnt and sum(cnt.values()) >= MIN_N: res, fuente = resumen(cnt), "codigo"; n_cod += 1
            else: res, fuente = g, "servicio"; n_srv += 1
            for k in ("pct_mujer", "edad_p25", "edad_mediana", "edad_p75"): r[f"{k}_{servicio}"] = res[k]
            r[f"estancia_media_{servicio}"] = est.get(c3, "")
            r[f"demografia_fuente_{servicio}"] = fuente
        cols += [c for c in nuevos if c not in cols]
        with open(path, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols, delimiter="\t", extrasaction="ignore"); w.writeheader()
            for r in rows: w.writerow({c: r.get(c, "") for c in cols})
        print(f"   {os.path.basename(path)}{' / ' + filtro if filtro else ''}: {n_cod} entidades con demografía propia, {n_srv} con la del servicio")

def comorbilidades(servicio, archivo):
    rows = list(csv.DictReader(open(os.path.join(DD, archivo), encoding="utf-8-sig"), delimiter="\t"))
    alt = ALTAS[servicio]
    out = []
    for r in rows:
        if not r["n_diagnosticos_secundarios"].strip(): continue
        n = int(r["n_diagnosticos_secundarios"])
        out.append((n, r["codigo"], r["descripcion"], min(1.0, n / alt)))
    out.sort(reverse=True)
    with open(os.path.join(DD, f"comorbilidades_{servicio}.tsv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t"); w.writerow(["codigo", "descripcion", "n_codigos_secundarios", "prevalencia_aprox_por_alta", "tipo"])
        for n, c, d, p in out:
            w.writerow([c, d, n, f"{p:.4f}", "administrativo_Z" if c[0] == "Z" else "sintoma_R" if c[0] == "R" else "enfermedad"])
    enf = [x for x in out if x[1][0] not in "ZR"][:12]
    print(f"   comorbilidades más frecuentes en {servicio}: " + "; ".join(f"{d[:32]} {100*p:.0f}%" for n, c, d, p in enf))

CMI = os.path.join(B, "catalogo", "catalogo_medicina_interna_con_prior.tsv")
CES = os.path.join(B, "catalogo_especialidades", "catalogo_especialidades_con_prior.tsv")
procesar("mi", "edad_sexo_mi_hosp.tsv", "estancia_mi_hosp.tsv", [(CMI, None)])
procesar("geriatria", "edad_sexo_geriatria_hosp.tsv", "estancia_geriatria_hosp.tsv", [(CMI, None), (CES, "geriatria")])
procesar("cardiologia", "edad_sexo_cardiologia_hosp.tsv", "estancia_cardiologia_hosp.tsv", [(CES, "cardiologia")])
procesar("infecciosas", "edad_sexo_infecciosas_hosp.tsv", "estancia_infecciosas_hosp.tsv", [(CES, "infecciosas")])
procesar("dermatologia", "edad_sexo_dermatologia_ambulatorio.tsv", "estancia_dermatologia_hosp.tsv", [(CES, "dermatologia")])
for s in ("mi", "geriatria", "cardiologia", "infecciosas", "dermatologia"):
    comorbilidades(s, f"secundarios_{s}_hosp.tsv")
