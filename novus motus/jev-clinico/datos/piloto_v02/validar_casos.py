"""Valida los casos generados (casos/*.jsonl) contra el esquema v0.2 y su plan."""
import csv, json, glob, os, re, sys, collections, unicodedata
sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
plan = {}
for f in glob.glob(os.path.join(H, "plan_*.tsv")):
    for r in csv.DictReader(open(f, encoding="utf-8"), delimiter="\t"): plan[r["id"]] = r
TRI = {"si", "no", "no_consta"}
CONC = {"alerta", "confusion_nueva", "responde_voz", "responde_dolor", "no_responde", "no_consta"}
ALARMAS = ["A1_hipoperfusion", "A2_respiratoria", "A3_conciencia", "A4_news_moderado", "A5_analitica_disfuncion_organica",
           "A6_neutropenia_o_quimio", "A7_inmunosupresion", "A8_zona_paludismo_12m", "A9_riesgo_fiebre_hemorragica",
           "A10_aislamiento_sarampion_tb", "A11_meningitis_o_purpura", "A12_toxicodermia_grave", "A13_partes_blandas_necrosante",
           "A14a_acg_con_sintomas_visuales", "A14b_endocarditis_de_riesgo", "A14c_pulmon_rinon", "A15_anciano_deterioro_agudo",
           "A16_sospecha_hemofagocitico"]
low = lambda s: unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
STOP = set("de del la el y o en por con sin a al los las tipo aguda agudo cronica cronico enfermedad sindrome infeccion".split())

def errores_caso(c):
    e, avisos = [], []
    p = plan.get(c.get("id"))
    if not p: return [f"id desconocido {c.get('id')}"], []
    for k in ("paciente", "texto", "estructurado", "etiquetas", "dificultad", "razon", "generador"):
        if k not in c: e.append(f"falta {k}")
    if e: return e, avisos
    pa, es, et, tx = c["paciente"], c["estructurado"], c["etiquetas"], c["texto"]
    if pa.get("edad") != int(p["edad"]): e.append(f"edad {pa.get('edad')} != plan {p['edad']}")
    if pa.get("sexo") != p["sexo"]: e.append(f"sexo {pa.get('sexo')} != plan {p['sexo']}")
    if c["dificultad"] != p["dificultad"]: e.append("dificultad distinta del plan")
    fuera = p["enfermedad"] == "FUERA_CATALOGO"
    dp = et.get("diagnostico_principal", "")
    if fuera:
        if not dp.startswith("otra:") or not et.get("fuera_catalogo"): e.append("fuera de catálogo mal etiquetado")
    elif dp != p["enfermedad"]: e.append(f"diagnóstico '{dp[:40]}' != plan")
    for k in ("motivo", "antecedentes", "exploracion", "analitica_inicial"):
        if not tx.get(k): e.append(f"texto.{k} vacío")
    k_ = es.get("constantes", {})
    if k_.get("conciencia") not in CONC: e.append("conciencia inválida")
    for sec in ("contexto", "anamnesis", "estudio_inicial"):
        for kk, v in es.get(sec, {}).items():
            if isinstance(v, str) and kk not in ("viaje_detalle", "farmacos_detalle") and v not in TRI | {"si", "no"}:
                e.append(f"{sec}.{kk}='{v}'")
    al = et.get("alarmas", {})
    faltan = [a for a in ALARMAS if a not in al]
    if faltan: e.append(f"faltan alarmas {faltan[:3]}")
    # coherencia de alarmas con constantes
    tas, fc, fr, spo2 = k_.get("tas"), k_.get("fc"), k_.get("fr"), k_.get("spo2")
    if (tas is not None and tas <= 90) or (fc is not None and fc > 130):
        if not al.get("A1_hipoperfusion"): avisos.append("A1 debería ser true (TAS≤90 o FC>130)")
    if (fr is not None and fr >= 25) or (spo2 is not None and spo2 < 92):
        if not al.get("A2_respiratoria"): avisos.append("A2 debería ser true (FR≥25 o SpO2<92)")
    if k_.get("conciencia") in ("confusion_nueva", "responde_voz", "responde_dolor", "no_responde") and not al.get("A3_conciencia"):
        avisos.append("A3 debería ser true (conciencia alterada)")
    # plan: faltan constantes y dato clave
    nulas = sum(1 for x in ("fr", "spo2", "tas", "fc") if k_.get(x) is None) + (k_.get("conciencia") == "no_consta")
    if p["faltan_constantes"] == "si" and nulas < 2: e.append("plan pide faltan_constantes y hay < 2 nulas")
    if p["falta_dato_clave"] == "si" and not et.get("falta_dato_diagnostico"): e.append("plan pide falta_dato_clave")
    # fuga: palabras distintivas del diagnóstico en el texto
    if not fuera:
        base = re.sub(r"\(.*?\)", "", p["enfermedad"])
        pal = [w for w in re.findall(r"[a-záéíóúñü0-9-]{5,}", low(base)) if w not in STOP]
        t = low(" ".join(tx.values()))
        if pal and all(w in t for w in pal): avisos.append(f"posible fuga: el texto contiene '{base.strip()[:40]}'")
    n_pal = len(" ".join(tx.values()).split())
    if n_pal < 80 or n_pal > 320: avisos.append(f"longitud {n_pal} palabras")
    return e, avisos

casos, err, av, ids = [], collections.Counter(), collections.Counter(), collections.Counter()
detalle = []
for f in sorted(glob.glob(os.path.join(H, "casos", "*.jsonl"))):
    for i, l in enumerate(open(f, encoding="utf-8"), 1):
        if not l.strip(): continue
        try: c = json.loads(l)
        except Exception as ex: err["json inválido"] += 1; detalle.append(f"{os.path.basename(f)}:{i} JSON inválido"); continue
        ids[c.get("id")] += 1; casos.append(c)
        e, a = errores_caso(c)
        for x in e: err[x.split(" ")[0] + " " + " ".join(x.split(" ")[1:3])] += 1; detalle.append(f"{c.get('id')} ERROR {x}")
        for x in a: av[x.split("(")[0][:40]] += 1; detalle.append(f"{c.get('id')} aviso {x}")
dup = [k for k, v in ids.items() if v > 1]
faltan = sorted(set(plan) - set(ids))
print(f"casos: {len(casos)} de {len(plan)} planificados | duplicados: {len(dup)} | sin generar: {len(faltan)}")
print("por servicio:", dict(collections.Counter(c.get('servicio') for c in casos)))
print("errores:", sum(err.values()), dict(err.most_common(10)))
print("avisos:", sum(av.values()), dict(av.most_common(10)))
if casos:
    al = collections.Counter(k for c in casos for k, v in c["etiquetas"].get("alarmas", {}).items() if v)
    print("alarmas activas:", dict(al.most_common()))
    print("con alguna alarma:", sum(any(c["etiquetas"]["alarmas"].values()) for c in casos),
          "| falta dato diagnóstico:", sum(bool(c["etiquetas"].get("falta_dato_diagnostico")) for c in casos),
          "| atípicos:", sum(bool(c["etiquetas"].get("presentacion_atipica")) for c in casos))
open(os.path.join(H, "validacion_detalle.txt"), "w", encoding="utf-8").write("\n".join(detalle + ["", "sin generar: " + ", ".join(faltan)]))
