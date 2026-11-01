"""Loopback-only RAG server. All resources come from a fixed public allowlist."""
import argparse, hashlib, html, json, mimetypes, re, socket, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
from rag_engine import Engine,BASE
from generation import Generator,GenerationError,BusyError

def e(s):return html.escape(str(s),quote=True)
def inline(s):
    # Escape before applying a small, non-HTML Markdown subset.
    s=html.escape(s);s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
    s=re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)',r'<a href="\2" rel="noreferrer noopener">\1</a>',s)
    return s
def blocks(text):
    out=[]
    for p in text.split('\n\n'):
        p=p.strip()
        if not p or p.startswith('!['):continue
        if all(l.startswith('- ') for l in p.splitlines()):out.append('<ul>'+''.join('<li>'+inline(l[2:])+'</li>' for l in p.splitlines())+'</ul>')
        else:out.append('<p>'+inline(p).replace('\n','<br>')+'</p>')
    return ''.join(out)
def thesis_page(engine,id):
    rec=engine.project(id);p=rec['project'];graph={n['id']:n for n in engine.graph['nodes']};connections=[]
    for edge in rec['edges']:
        other=edge['target'] if edge['source']=='project:'+id else edge['source'];node=graph[other]
        href='/tesis/'+node['project_id'] if node['kind']=='project' else '/?'+node['kind']+'='+node['id'].split(':',1)[1]
        citations=''.join('<blockquote>'+e(x['quote'])+'<br><a href="/tesis/'+e(x['project_id'])+'#'+e(x['section_id'])+'">Pasaje · '+e(x['source_version'])+'</a></blockquote>' for x in edge['evidence'])
        connections.append('<article class="connection"><h3><a href="'+href+'">'+e(node['label'])+'</a></h3><p>'+e(edge['label'])+'</p><small>Interpretación de IA · revisión de Javier pendiente · '+e(edge['type'].replace('_',' '))+'</small>'+citations+'</article>')
    section_html=''.join('<section id="'+e(s['id'])+'"><h2>'+e(s['heading'])+'</h2>'+blocks(s['text'])+'</section>' for s in p['sections'])
    return '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+e(p['title'])+'</title><link rel="stylesheet" href="/reader.css"><body><main><a href="/?project='+e(id)+'">← Explorar el mapa</a><p class="eyebrow">'+e(p['area_label'])+' · fuente '+e(p['version'])+'</p><h1>'+e(p['title'])+'</h1><figure><img src="'+e(p['image_url'])+'" alt="Ilustración conceptual del proyecto"><figcaption>'+e(p['image_caption'])+'</figcaption></figure><p>Edición de lectura con conexiones del 15 de octubre de 2026. Se conserva la tesis fuente; los vínculos añadidos son interpretaciones que no acreditan competencias ni resultados.</p>'+section_html+'<section id="conexiones"><h2>Capacidades e ideas relacionadas</h2><p>Estas conexiones invitan a comparar planteamientos y consultar evidencias. La afinidad entre textos no demuestra por sí sola una habilidad personal.</p>'+''.join(connections)+'</section></main></body></html>'

READER_CSS='body{margin:0;background:#f5f8f7;color:#183c3d;font:17px/1.65 system-ui}main{max-width:860px;margin:auto;padding:36px 22px}a{color:#087c79}h1{font-size:clamp(28px,5vw,44px);line-height:1.15}h2{margin-top:2em}figure{margin:28px 0}img{width:100%;border-radius:12px}figcaption,small{font-size:14px;color:#53656b}blockquote{margin:18px 0;padding:12px 18px;border-left:3px solid #099890;background:#e8f1ee;overflow-wrap:anywhere}.connection{padding:20px 0;border-top:1px solid #ccdcd6}.eyebrow{font-size:14px;text-transform:uppercase;letter-spacing:.08em}section{scroll-margin-top:24px}'

class Handler(BaseHTTPRequestHandler):
    server_version='PortfolioLocal/1.0'
    def log_message(self,fmt,*args):pass  # Do not log questions, names, user input or credential-like strings.
    def send(self,status,data,content='application/json; charset=utf-8'):
        if isinstance(data,dict):data=json.dumps(data,ensure_ascii=False).encode('utf-8')
        elif isinstance(data,str):data=data.encode('utf-8')
        self.send_response(status);self.send_header('Content-Type',content);self.send_header('Content-Length',str(len(data)));self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store');self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");self.end_headers()
        try:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
    def check(self):
        host=self.headers.get('Host','').lower();expected={f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
        if host not in expected:self.send(403,{'error':'host_not_allowed'});return False
        origin=self.headers.get('Origin')
        if origin and origin not in {'http://'+x for x in expected}:self.send(403,{'error':'origin_not_allowed'});return False
        if self.headers.get('Sec-Fetch-Site')=='cross-site':self.send(403,{'error':'cross_site_not_allowed'});return False
        return True
    def path_value(self):
        path=unquote(urlsplit(self.path).path)
        if '..' in path or '\\' in path or '\x00' in path or ':' in path:return None
        return path
    def do_GET(self):
        if not self.check():return
        p=self.path_value()
        if p is None:return self.send(400,{'error':'invalid_path'})
        engine=self.server.engine
        if p=='/api/status':return self.send(200,{'corpus_count':len(engine.projects),'areas':9,'generation':self.server.generator.status(),'publication_approved':False})
        if p.startswith('/api/project/'):
            rec=engine.project(p.removeprefix('/api/project/'))
            return self.send(200,rec) if rec else self.send(404,{'error':'project_not_found'})
        if p=='/reader.css':return self.send(200,READER_CSS,'text/css; charset=utf-8')
        if p.startswith('/media/thumb/') and p.endswith('.webp'):
            project_id=p.removeprefix('/media/thumb/').removesuffix('.webp')
            if project_id not in engine.projects:return self.send(404,{'error':'project_not_found'})
            thumbnail=BASE/'web/media/thumbnails'/(project_id+'.webp')
            if not thumbnail.is_file():return self.send(404,{'error':'thumbnail_not_found'})
            return self.send(200,thumbnail.read_bytes(),'image/webp')
        for prefix,suffix in [('/media/','.png'),('/tesis/','')]:
            if p.startswith(prefix):
                id=p[len(prefix):];id=id[:-4] if suffix and id.endswith(suffix) else id
                if id not in engine.projects:return self.send(404,{'error':'project_not_found'})
                if prefix=='/tesis/':return self.send(200,thesis_page(engine,id),'text/html; charset=utf-8')
                return self.send(200,(BASE/'public-sources'/id/'proyecto.png').read_bytes(),'image/png')
        allowed={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/intro.js':'intro.js','/styles.css':'styles.css','/data/corpus.json':'data/corpus.json','/data/graph.json':'data/graph.json'}
        if p not in allowed:return self.send(404,{'error':'resource_not_found'})
        f=BASE/'web'/allowed[p]
        if not f.is_file():return self.send(503,{'error':'frontend_not_ready'})
        return self.send(200,f.read_bytes(),(mimetypes.guess_type(str(f))[0] or 'application/octet-stream')+'; charset=utf-8')
    def do_POST(self):
        if not self.check():return
        p=self.path_value()
        if p not in ('/api/search','/api/ask'):return self.send(404,{'error':'resource_not_found'})
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.send(415,{'error':'json_required'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<=0 or size>8192:raise ValueError()
            req=json.loads(self.rfile.read(size));q=req['query']
            if not isinstance(q,str) or not q.strip() or len(q)>1600:raise ValueError()
            area=req.get('area','');cap=req.get('capability','')
            if not isinstance(area,str) or not isinstance(cap,str):raise ValueError()
            rec=self.server.engine.search(q,area,cap,req.get('limit',8))
        except (ValueError,TypeError,KeyError):return self.send(400,{'error':'invalid_request'})
        if p=='/api/search':return self.send(200,rec)
        if not rec['has_evidence']:
            return self.send(200,{'answer':'Esta aplicación solo consulta las tesis públicas candidatas. No accede a credenciales ni a fuentes privadas.' if rec['refused_private_request'] else 'No encuentro evidencia pertinente en el portfolio para responder a esa pregunta.','claims':[],'sources':[],'provider':'none','model':'not_invoked','grounded':False,'abstained':True})
        try:answer=self.server.generator.answer(q,rec['results'])
        except BusyError:return self.send(429,{'error':'generation_busy','message':'Hay otra respuesta en curso; puedes seguir explorando el mapa.','sources':rec['results']})
        except GenerationError as exc:return self.send(503,{'error':str(exc),'message':'No se pudo generar una respuesta verificada. Los pasajes recuperados siguen disponibles.','sources':rec['results']})
        return self.send(200,answer)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--port',type=int,default=8877);args=ap.parse_args()
    engine=Engine();generator=Generator();server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler);server.daemon_threads=True;server.engine=engine;server.generator=generator
    print(json.dumps({'url':f'http://127.0.0.1:{server.server_port}','corpus':len(engine.projects),'generation':generator.status()},ensure_ascii=False),flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
