"""Plan de muestreo del piloto v0.2: qué caso escribir, con qué paciente y qué dificultad.

Mezcla: 60 % proporcional a la probabilidad a priori del RAE-CMBD (realismo y calibración),
~32 % estratificado por categoría con más peso a lo que no se puede pasar por alto (cobertura),
~8 % enfermedades fuera del catálogo (para la opción "otra").
Edad y sexo: distribución RAE-CMBD de la categoría CIE-10 de 3 caracteres (o global del servicio).
Comorbilidades conocidas: prevalencia marginal por servicio (RAE-CMBD), ajustada por edad.
"""
import csv, os, random, re, collections, math, sys
sys.stdout.reconfigure(encoding="utf-8")
random.seed(20260923)
H = os.path.dirname(os.path.abspath(__file__)); B = os.path.abspath(os.path.join(H, "..", ".."))
DD = os.path.join(B, "rae_cmbd_demografia")
SOLO_HOMBRE = ("N40", "N41", "N42", "N43", "N44", "N45", "N46", "N47", "N48", "N49", "N50", "N51", "C60", "C61", "C62", "C63", "D07.4", "D29")
SOLO_MUJER = tuple(f"N{i}" for i in range(70, 99)) + ("C51", "C52", "C53", "C54", "C55", "C56", "C57", "C58", "O", "Z33", "Z34", "Z3A", "E28")
# edad mínima verosímil como comorbilidad crónica (prefijo CIE-10 -> años)
EDAD_MIN = {"F01": 60, "F02": 60, "F03": 60, "G30": 60, "G31": 60, "G20": 50, "I48": 45, "I50": 45, "I25": 40, "I35": 55,
            "N40": 45, "N18": 35, "M81": 50, "M80": 50, "H91": 50, "H25": 50, "J44": 40, "I69": 40, "Z95": 40, "C61": 50}
AGUDOS = set("J18 J15 J13 J69 N39 A41 J96 N17 E86 E87 F05 D62 B95 B96 B97 E83 R65 J98 K92 I95 E87".split())

def edad_sexo_rae(svc):
    d = collections.defaultdict(collections.Counter); g = collections.Counter()
    for r in csv.DictReader(open(os.path.join(DD, f"edad_sexo_{svc}.tsv"), encoding="utf-8-sig"), delimiter="\t"):
        m = re.match(r"(\d+)-(\d+)", r["grupo_edad"]); m2 = re.match(r"(\d+) o más", r["grupo_edad"])
        if r["sexo"] not in ("Hombre", "Mujer") or not r["altas"].strip(): continue
        if m: lo, hi = int(m[1]), int(m[2])
        elif m2: lo, hi = int(m2[1]), int(m2[1]) + 3
        else: continue
        if hi < 16: continue
        k = (max(lo, 16), hi, r["sexo"]); n = int(r["altas"])
        d[r["codigo"]][k] += n; g[k] += n
    return d, g

def elegir_paciente(cod3, dist, glob):
    c = dist.get(cod3); c = c if c and sum(c.values()) >= 30 else glob
    ks, ws = zip(*c.items()); lo, hi, s = random.choices(ks, ws)[0]
    return random.randint(lo, hi), "mujer" if s == "Mujer" else "hombre"

def comorbilidades(svc, edad, cod3, sexo="mujer"):
    rows = [r for r in csv.DictReader(open(os.path.join(DD, f"comorbilidades_{svc}.tsv"), encoding="utf-8"), delimiter="\t")
            if r["tipo"] == "enfermedad" and r["codigo"] not in AGUDOS and not r["codigo"][0] in "STUVWXY"
            and not r["codigo"].startswith(SOLO_HOMBRE if sexo == "mujer" else SOLO_MUJER)
            and edad >= EDAD_MIN.get(r["codigo"][:3], 0)][:60]
    f = 0.3 if edad < 50 else 0.7 if edad < 70 else 1.1
    out = [f'{r["descripcion"]} ({r["codigo"]})' for r in rows
           if r["codigo"] != cod3 and random.random() < min(0.9, float(r["prevalencia_aprox_por_alta"]) * f)]
    return out[:8]

def plan(nombre, svc_rae, svc_com, cat_path, col_prior, filtro, N, prefijo):
    rows = [r for r in csv.DictReader(open(cat_path, encoding="utf-8"), delimiter="\t") if not filtro or r.get("especialidad") == filtro]
    dist, glob = edad_sexo_rae(svc_rae)
    n_otra = max(2, round(N * 0.08)); n_prop = round(N * 0.6); n_strat = N - n_prop - n_otra
    elegidas, vistos = [], set()
    pool = rows[:]
    while len([e for e in elegidas if e[1] == "proporcional"]) < n_prop:
        r = random.choices(pool, [float(x[col_prior]) for x in pool])[0]
        if r["enfermedad"] in vistos and random.random() < 0.85: continue  # repetir las muy frecuentes, poco
        vistos.add(r["enfermedad"]); elegidas.append((r, "proporcional"))
    cats = collections.defaultdict(list)
    for r in rows: cats[r["categoria"]].append(r)
    orden = list(cats); random.shuffle(orden); i = 0
    while len([e for e in elegidas if e[1] == "estratificado"]) < n_strat:
        cand = [r for r in cats[orden[i % len(orden)]] if r["enfermedad"] not in vistos]; i += 1
        if not cand: continue
        r = random.choices(cand, [3 if x["no_pasar_por_alto"] == "si" else 1 for x in cand])[0]
        vistos.add(r["enfermedad"]); elegidas.append((r, "estratificado"))
    for _ in range(n_otra):
        r = random.choice(rows); elegidas.append(({**r, "enfermedad": "FUERA_CATALOGO"}, "fuera_catalogo"))
    random.shuffle(elegidas)
    out = []
    for k, (r, modo) in enumerate(elegidas, 1):
        cod3 = re.sub(r"[^A-Z0-9]", "", r["cie10"].upper())[:3]
        edad, sexo = elegir_paciente(cod3, dist, glob)
        dif = "fuera_catalogo" if modo == "fuera_catalogo" else random.choices(["tipico", "atipico", "dificil"], [45, 30, 25])[0]
        out.append({"id": f"{prefijo}-{k:04d}", "servicio": nombre, "modo_muestreo": modo, "enfermedad": r["enfermedad"],
                    "categoria": r["categoria"], "subcategoria": r["subcategoria"], "cie10": "" if modo == "fuera_catalogo" else r["cie10"],
                    "edad": edad, "sexo": sexo, "comorbilidades_conocidas": " | ".join(comorbilidades(svc_com, edad, cod3, sexo)),
                    "dificultad": dif,
                    "faltan_constantes": "si" if random.random() < (0.10 if nombre == "dermatologia" else 0.25) else "no",
                    "falta_dato_clave": "si" if random.random() < 0.2 else "no",
                    "dato_clave": "" if modo == "fuera_catalogo" else r["dato_clave"],
                    "pistas_clave": "" if modo == "fuera_catalogo" else r["pistas_clave"],
                    "no_pasar_por_alto": r["no_pasar_por_alto"], "origen_entidad": r["origen"]})
    cols = list(out[0])
    with open(os.path.join(H, f"plan_{nombre}.tsv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, delimiter="\t"); w.writeheader(); w.writerows(out)
    ed = sorted(o["edad"] for o in out)
    print(f"## {nombre}: {len(out)} casos | entidades distintas {len({o['enfermedad'] for o in out})} | categorías {len({o['categoria'] for o in out})}"
          f" | modo {dict(collections.Counter(o['modo_muestreo'] for o in out))}")
    print(f"   edad mediana {ed[len(ed)//2]} | mujeres {sum(o['sexo']=='mujer' for o in out)} | dificultad {dict(collections.Counter(o['dificultad'] for o in out))}"
          f" | no_pasar_por_alto {sum(o['no_pasar_por_alto']=='si' for o in out)}")
    return out

MI = os.path.join(B, "catalogo", "catalogo_medicina_interna_con_prior.tsv")
ES = os.path.join(B, "catalogo_especialidades", "catalogo_especialidades_con_prior.tsv")
p = {}
p["mi"] = plan("medicina_interna", "mi_hosp", "mi", MI, "prior_mi", None, 150, "MI")
p["inf"] = plan("infecciosas", "infecciosas_hosp", "infecciosas", ES, "prior_infecciosas", "infecciosas", 150, "INF")
p["der"] = plan("dermatologia", "dermatologia_ambulatorio", "dermatologia", ES, "prior_dermatologia", "dermatologia", 50, "DER")
# trocear en partes para la generación en paralelo
partes = [("mi", 0, 50), ("mi", 50, 100), ("mi", 100, 150),
          ("inf", 0, 50), ("inf", 50, 100), ("inf", 100, 150), ("der", 0, 50)]
for j, (k, a, b) in enumerate(partes, 1):
    sub = p[k][a:b]
    with open(os.path.join(H, "planes", f"parte_{j:02d}.tsv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(sub[0]), delimiter="\t"); w.writeheader(); w.writerows(sub)
print("partes:", len(partes))
