"""Grounded retrieval over a fixed public corpus. Standard library, no remote index."""
import collections, hashlib, json, math, re, unicodedata
from pathlib import Path

BASE=Path(__file__).resolve().parent
STOP=set('a al algo algunas algunos ante antes asi aunque cada como con cual cuando de del desde donde el ella ellos en entre era es esa ese eso esta estas este esto estos fue ha hay la las le les lo los mas me mi muy ni no nos o otra otro para pero por porque puede que quien se ser si sin sobre son su sus te tiene tu un una uno unos unas y ya yo proyecto proyectos tesis javier mostrar muestra ensename ejemplos ejemplo'.split())
SYNONYMS={'habilidad':['capacidad','competencia'],'habilidades':['capacidades','competencias'],'soft':['capacidad','comunicacion','analisis'],'skills':['capacidad'],'procesos':['flujo','flujos','tareas'],'comunicar':['comprension','comunicacion','explicar'],'aprender':['aprendizaje','formacion'],'riesgos':['limites','control','riesgo'],'organizar':['organizacion','ordenar','estructurar'],'auditoria':['revision','evidencia'],'liderazgo':['responsabilidad','coordinacion'],'programacion':['codigo','construccion'],'autonoma':['autonomo','asistida'],'resultados':['resultados','validacion','evaluacion','acredita','medidos'],'medidos':['medidas','acredita','evaluacion'],'docente':['docentes','profesor'],'docentes':['docente','evaluacion'],'clinicos':['clinico','asistencial'],'informe':['informacion','documentacion']}
META=re.compile(r'\b(fecha|fechas|cuando|version|versiones|modelo|modelos|herramientas|empezo|comenzo|inicio|cronologia)\b')
PRIVATE_REQUEST=re.compile(r'(?i)(?:lee|muestra|revela|extrae|dame|accede|ejecuta|abre).{0,100}(?:credencial|contrase[ñn]a|clave.api|auth\.json|\.env\b|iban\b|frase.semilla|C:\\|/etc/|OneDrive)')
def norm(s): return ''.join(c for c in unicodedata.normalize('NFKD',s.casefold()) if not unicodedata.combining(c))
def tokens(s):return [w for w in re.findall(r'[a-z0-9]+',norm(s)) if len(w)>1 and w not in STOP]
def load(p):return json.loads(p.read_text(encoding='utf-8'))

class Engine:
    def __init__(self):
        self.corpus=load(BASE/'web/data/corpus.json');self.graph=load(BASE/'web/data/graph.json');self.projects={p['id']:p for p in self.corpus['projects']};assert len(self.projects)==82
        self.chunks=[]
        paragraphs=collections.Counter(re.sub(r'\s+',' ',p.strip()) for x in self.projects.values() for s in x['sections'] for p in s['text'].split('\n\n'))
        for p in self.projects.values():
            for s in p['sections']:
                for n,paragraph in enumerate(s['text'].split('\n\n')):
                    paragraph=paragraph.strip()
                    if not paragraph or paragraph.startswith(('![','*Ilustración','*Ilustracion')):continue
                    repeated=paragraphs[re.sub(r'\s+',' ',paragraph)]>10
                    if repeated and s['searchable']:continue
                    # No synthetic interpretation from common model/editorial notices.
                    editorial=paragraph.startswith(('Imagen conceptual vigente,','Apoyo visual añadido el','La redacción de esta versión utiliza','La redacción anterior se preparó','La documentación disponible permite describir esta línea'))
                    if editorial and s['searchable']:continue
                    count=collections.Counter(tokens(paragraph));line=s['start_line']+s['text'][:s['text'].find(paragraph)].count('\n')
                    self.chunks.append({'id':f"{s['id']}-p{n+1}",'project_id':p['id'],'section_id':s['id'],'heading':s['heading'],'text':paragraph,'start_line':line,'end_line':line+paragraph.count('\n'),'metadata':not s['searchable'],'counts':count,'length':sum(count.values()),'attribution':s['attribution']})
        self.df=collections.Counter(t for c in self.chunks for t in c['counts']);self.avg=sum(c['length'] for c in self.chunks)/len(self.chunks)
        self.capabilities={c['id']:c for c in self.corpus['capabilities']};self.topics={t['id']:t for t in self.corpus['topics']}

    def search(self,query,area='',capability='',limit=8):
        query=query.strip();limit=max(1,min(int(limit),12))
        if not query or PRIVATE_REQUEST.search(query):return {'query':query,'results':[],'has_evidence':False,'refused_private_request':bool(query and PRIVATE_REQUEST.search(query))}
        qterms=set(tokens(query)); expanded=set(qterms)
        qterms-={'idea','ideas','conecta','conectan','relaciona','relacionan'};expanded=set(qterms)
        for t in qterms:expanded.update(SYNONYMS.get(t,[]))
        area_words={'clinicos':{'salud','clinico','clinica','clinicos','asistencial'},'educacion':{'educacion','educativo','educativa'},'finanzas':{'finanzas','financiero','financiera'},'gobierno':{'gobierno','politica'},'tecnologicos':{'tecnologia','tecnologico'},'negocios':{'negocios','negocio'},'creacion':{'creacion','creativo'},'metodologia':{'metodologia'},'desarrollo-profesional':{'empleo','candidaturas'}}
        mentioned_areas={a for a,words in area_words.items() if words & qterms}
        comparison_areas=mentioned_areas if len(mentioned_areas)>1 else set()
        decision_terms={'decision','decisiones','decide','deciden','decidir','autoridad'}
        if qterms & decision_terms:expanded.update(decision_terms)
        raw=norm(query);metadata=bool(META.search(raw));named={id for id,p in self.projects.items() if id in raw or (id.replace('-',' ') in raw) or any(len(t)>5 and t in raw for t in tokens(id) if t not in ('metodo','analisis','personal','proyectos','historial','gobierno','educativa','clinico','clinicos','conexiones'))}
        if 'gobierno' in qterms:named.add('gobierno-ia')
        if 'reforma' in qterms:named.add('reforma-educativa')
        if 'fiscal' in qterms or 'fiscalidad' in qterms:named.add('consolidacion-fiscal')
        # Match complete skill names, including English and former labels. An
        # alias selects existing exact evidence; it never becomes source text.
        cap_matches={id for id,c in self.capabilities.items() if id==capability or any(
            set(tokens(label)) and set(tokens(label)) <= qterms
            for label in [c['label'],c.get('label_en',''),*c.get('aliases',[])])}
        topic_matches={id for id,t in self.topics.items() if len(set(tokens(t['label']+' '+id)).intersection(expanded))>=min(2,len(tokens(t['label'])))}
        connected=set()
        anchors=collections.Counter();cap_evidence=collections.defaultdict(list)
        for e in self.graph['edges']:
            if e['target'] in {'capability:'+x for x in cap_matches}|{'topic:'+x for x in topic_matches}:connected.add(e['source'].removeprefix('project:'))
            if e['target'] in {'capability:'+x for x in cap_matches}:
                for ev in e['evidence']:cap_evidence[(ev['project_id'],ev['section_id'])].append(ev['quote'])
            # Graph interpretations select source paragraphs, never become evidence themselves.
            paired={e['source'].removeprefix('project:'),e['target'].removeprefix('project:')}
            relevant=e['target'] in {'topic:'+x for x in topic_matches} or (len(named)>1 and paired <= named)
            if relevant and set(tokens(e['label'])).intersection(expanded):
                for ev in e['evidence']:anchors[(ev['project_id'],ev['section_id'])]+=1
        scored=[];N=len(self.chunks)
        for c in self.chunks:
            p=self.projects[c['project_id']]
            if area and p['area']!=area:continue
            if comparison_areas and p['area'] not in comparison_areas:continue
            if capability and capability not in p['capability_ids']:continue
            if c['metadata'] and not metadata:continue
            if named and c['project_id'] not in named:continue
            score=0;hits=set()
            for t in expanded:
                f=c['counts'].get(t,0)
                if f:
                    hits.add(t);idf=math.log(1+(N-self.df[t]+0.5)/(self.df[t]+0.5));score+=idf*f*2.2/(f+1.2*(0.25+0.75*c['length']/self.avg))*(1 if t in qterms else .4)
            cap_anchor=not c['metadata'] and any(quote in c['text'] for quote in cap_evidence[(c['project_id'],c['section_id'])])
            if not hits and c['project_id'] not in named and not cap_anchor:continue
            direct_hits=qterms.intersection(c['counts'])
            if not direct_hits and not (c['project_id'] in named) and not cap_anchor:continue
            score+=min(len(direct_hits),5)*1.1
            # A repeated project name must not outweigh the concept being compared.
            if named:
                names={t for project_id in named for t in tokens(project_id)}
                focused=qterms-names-{'mismo','misma','tipo','tipos','explica','explicar','propuesta','propuestas','suavizar'}
                focus_expanded=set(focused)
                for t in focused:focus_expanded.update(SYNONYMS.get(t,[]))
                if focused & decision_terms:focus_expanded.update(decision_terms)
                score+=sum(5 if t in focused else 2 for t in focus_expanded.intersection(c['counts']))
            if c['project_id'] in named:score+=6
            if c['project_id'] in connected:score+=1.8
            if cap_anchor:score+=12
            if anchors[(c['project_id'],c['section_id'])] and hits:score+=8
            if c['heading']=='TL;DR':score+=.5
            if score>2:scored.append((score,c))
        scored.sort(key=lambda x:x[0],reverse=True);selected=[];per=collections.Counter()
        for score,c in scored:
            if per[c['project_id']]>= (4 if named else 2):continue
            per[c['project_id']]+=1;p=self.projects[c['project_id']]
            selected.append({'citation_id':f'S{len(selected)+1}','project_id':p['id'],'title':p['title'],'area':p['area'],'heading':c['heading'],'quote':c['text'],'section_id':c['section_id'],'version':p['version'],'source_sha256':p['source_sha256'],'source_url':p['source_url']+'#'+c['section_id'],'start_line':c['start_line'],'end_line':c['end_line'],'attribution':c['attribution'],'retrieval_score':round(score,4)})
            if len(selected)>=limit:break
        return {'query':query,'results':selected,'has_evidence':bool(selected),'retrieval_method':'BM25 + vocabulario español + relaciones del grafo; sin embeddings remotos','refused_private_request':False}

    def project(self,id):
        p=self.projects.get(id)
        if not p:return None
        return {'project':p,'edges':[e for e in self.graph['edges'] if e['source']=='project:'+id or e['target']=='project:'+id]}
