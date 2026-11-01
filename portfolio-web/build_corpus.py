"""Compile only the 82 public-candidate theses. Never read private project sources."""
import hashlib, json, re, shutil, os
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE=Path(__file__).resolve().parent
SOURCE=Path(os.environ.get('PORTFOLIO_TESIS_REPO',str(BASE.parent.parent/'portfolio-tesis')))
AREA_LABELS={'clinicos':'Clínicos','creacion':'Creación','desarrollo-profesional':'Desarrollo profesional','educacion':'Educación','finanzas':'Finanzas','gobierno':'Gobierno','metodologia':'Metodología','negocios':'Negocios','tecnologicos':'Tecnología'}
BACKMATTER=('herramientas','atribuciones históricas','fuentes y alcance','procedencia de las posiciones','fechas, versiones','origen y propósito')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def dump(p,d): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sectionize(text,id):
    lines=text.splitlines(); starts=[i for i,l in enumerate(lines) if l.startswith('## ')]
    sections=[]
    for n,i in enumerate(starts):
        end=starts[n+1] if n+1<len(starts) else len(lines)
        heading=lines[i][3:].strip();body_start=i+1
        while body_start<end and not lines[body_start].strip():body_start+=1
        body_end=end
        while body_end>body_start and not lines[body_end-1].strip():body_end-=1
        raw='\n'.join(lines[body_start:body_end]).rstrip()
        sections.append({'id':f'{id}-s{n+1:02d}','heading':heading,'text':raw,'start_line':body_start+1,'end_line':body_end,'searchable':not any(heading.casefold().startswith(t) for t in BACKMATTER),'attribution':'asistente' if heading.casefold().startswith('cómo podría comprobarse') else 'mixed_documentary'})
    return sections

def main():
    notes=load(BASE/'content/annotations.json');paths=sorted(SOURCE.glob('*/*/TESIS.md'))
    assert len(paths)==82 and len(notes['projects'])==82
    ann={p['id']:p for p in notes['projects']}; assert len(ann)==82
    out=BASE/'web/data'; projects=[];nodes=[];edges=[];source_hashes=[]
    caps={c['id']:c for c in notes['capabilities']};topics={t['id']:t for t in notes['topics']}
    for path in paths:
        id=path.parent.name; area=path.parent.parent.name;text=path.read_text(encoding='utf-8');metadata=load(path.with_name('VERSION.json'))
        assert metadata['id']==id and area in AREA_LABELS
        sections=sectionize(text,id); assert sections
        summary={}
        for key,span in [('purpose','Propósito'),('contribution','Aportación y enfoque'),('evidence','Trabajo y evidencia'),('limits','Resultados y límites')]:
            m=re.search(r'^- \*\*'+re.escape(span)+r':\*\* (.+)$',text,re.M);assert m,(id,key);summary[key]=m[1]
        caption=re.search(r'\(proyecto\.png\)\s*\n\s*\*([^\n]+)\*',text);assert caption,id
        project={'id':id,'title':text.splitlines()[0][2:],'area':area,'area_label':AREA_LABELS[area],'version':metadata['version'],'source_sha256':sha(path),'image_url':f'/media/{id}.png','image_caption':caption[1],'source_url':f'/tesis/{id}','summary':summary,'sections':sections,'capability_ids':[c['id'] for c in ann[id]['capabilities']],'topic_ids':[t['id'] for t in ann[id]['topics']]}
        projects.append(project);nodes.append({'id':'project:'+id,'kind':'project','label':project['title'],'project_id':id,'area':area})
        source_hashes.extend({'id':id,'file':name,'sha256':sha(path.with_name(name))} for name in ('TESIS.md','VERSION.json','proyecto.png'))
        for kind,items,lookup,prefix,typ in [('capability',ann[id]['capabilities'],caps,'capability:','explora_capacidad'),('topic',ann[id]['topics'],topics,'topic:','trata_idea')]:
            for index,item in enumerate(items):
                assert item['id'] in lookup
                sec=next((s for s in sections if s['heading']==item['section'] and item['quote'] in s['text']),None)
                assert sec and item['quote'].strip(),(id,item['id'],'quote_not_in_section')
                assert sec['searchable'],(id,item['id'],'editorial_relation')
                start=sec['start_line']+sec['text'][:sec['text'].index(item['quote'])].count('\n')
                ev={'project_id':id,'section_id':sec['id'],'quote':item['quote'],'source_version':project['version'],'source_sha256':project['source_sha256'],'start_line':start,'end_line':start+item['quote'].count('\n')}
                edges.append({'id':f'{id}-{kind}-{index}','source':'project:'+id,'target':prefix+item['id'],'type':typ,'label':item['reason'],'origin':'interpretacion_ia','user_review':'pending','claim_type':item.get('claim_type','relacion_tematica'),'attribution':item.get('attribution','no_confirmado'),'evidence':[ev]})
    byid={p['id']:p for p in projects}; assert set(byid)==set(ann)
    for kind,items in [('capability',notes['capabilities']),('topic',notes['topics'])]:
        nodes.extend({'id':kind+':'+r['id'],'kind':kind,'label':r['label'],'description':r.get('description','')} for r in items)
    for i,rel in enumerate(notes['cross_relations']):
        assert rel['source'] in byid and rel['target'] in byid and rel['source']!=rel['target']
        evs=[]
        for ev in rel['evidence']:
            p=byid[ev['project_id']];s=next((s for s in p['sections'] if s['heading']==ev['section'] and ev['quote'] in s['text']),None);assert s and s['searchable'],rel
            line=s['start_line']+s['text'][:s['text'].index(ev['quote'])].count('\n')
            evs.append({'project_id':p['id'],'section_id':s['id'],'quote':ev['quote'],'source_version':p['version'],'source_sha256':p['source_sha256'],'start_line':line,'end_line':line+ev['quote'].count('\n')})
        assert {e['project_id'] for e in evs}=={rel['source'],rel['target']}
        edges.append({'id':f'cross-{i}','source':'project:'+rel['source'],'target':'project:'+rel['target'],'type':rel['type'],'label':rel['label'],'origin':'interpretacion_ia','user_review':'pending','claim_type':'comparacion_propuesta','attribution':'asistente','evidence':evs})
    now=datetime.now(ZoneInfo('Europe/Madrid')).isoformat()
    common={'schema_version':1,'generated_at':now,'annotation_model':notes['model'],'edition_id':now[:10]+'-rag-v1','publication_approved':False}
    dump(out/'corpus.json',{**common,'projects':projects,'capabilities':notes['capabilities'],'topics':notes['topics']})
    dump(out/'graph.json',{**common,'nodes':nodes,'edges':edges})
    # Portable copies are derivatives of the public candidate, never original/private sources.
    target=BASE/'public-sources'
    for path in paths:
        dest=target/path.parent.name;dest.mkdir(parents=True,exist_ok=True)
        for name in ('TESIS.md','VERSION.json','proyecto.png'):shutil.copy2(path.with_name(name),dest/name)
    dump(BASE/'build_manifest.json',{'created_at':now,'source_count':82,'areas':dict(Counter(p['area'] for p in projects)),'source_files':source_hashes,'compiled':{'corpus_sha256':sha(out/'corpus.json'),'graph_sha256':sha(out/'graph.json')},'relations':len(edges),'capabilities':len(caps),'topics':len(topics),'originals_modified':False,'publication_approved':False,'annotation_model':notes['model']})
    print(json.dumps({'projects':82,'areas':9,'nodes':len(nodes),'edges':len(edges),'all_quotes_exact':True}))
if __name__=='__main__': main()
