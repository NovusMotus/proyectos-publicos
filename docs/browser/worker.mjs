import * as ort from './vendor/ort.wasm.min.mjs';
import {Tokenizer} from './vendor/tokenizers.mjs';
import {embedQuery,encodeQuery} from './encoder-core.mjs';
import {createRetriever} from './retrieval-core.mjs';
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
ort.env.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
const MODEL_URL='https://huggingface.co/Qdrant/paraphrase-multilingual-MiniLM-L12-v2-onnx-Q/resolve/faf4aa4225822f3bc6376869cb1164e8e3feedd0/model_optimized.onnx';
const MODEL_CDN_ORIGINS=new Set(['https://huggingface.co','https://us.aws.cdn.hf.co']);
let session,tokenizer,retriever,ready=false,preparing=false;
let queue=Promise.resolve();
const cancelled=new Set();
const active=new Set();
const hex=b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
async function pinned(path,pin,stage){
  const url=new URL(path,import.meta.url);
  const remoteModel=url.href===MODEL_URL&&pin.bytes===235052644&&pin.sha256==='634d0f66c29dc934c8fa72b8a4fe91dd4d420a22f1d82a241058d4316e659a99';
  if(!remoteModel&&url.origin!==self.location.origin)throw Error('asset_origin');
  postMessage({type:'progress',stage});
  const r=await fetch(url,{credentials:'omit',cache:'no-store',redirect:remoteModel?'follow':'error',referrerPolicy:'no-referrer'});
  if(!r.ok)throw Error('asset_response');
  if(remoteModel&&!MODEL_CDN_ORIGINS.has(new URL(r.url).origin))throw Error('model_redirect_origin');
  const data=await r.arrayBuffer();
  if(data.byteLength!==pin.bytes||hex(await crypto.subtle.digest('SHA-256',data))!==pin.sha256)throw Error('asset_integrity');
  postMessage({type:'progress',stage});
  return data;
}
const decode=b=>JSON.parse(new TextDecoder().decode(b));
async function prepare(){
  if(preparing||ready)throw Error('already_preparing');
  preparing=true;
  const pins=decode(await pinned('./ASSETS.json',{bytes:220,sha256:'061ca9754302addda4b2bae3ed0e788d2bce48d7290d0a32b051b169cc3a4177'},'comprobando índice'));
  const config=decode(await pinned('./RETRIEVAL.json',pins['RETRIEVAL.json'],'preparando filtros y relaciones'));
  const rawVectors=await pinned('./vectors.f32',pins['vectors.f32'],'comprobando vectores');
  if(new Uint8Array(new Float32Array([1]).buffer)[3]!==63)throw Error('unsupported_endian');
  retriever=createRetriever(config,new Float32Array(rawVectors));
  const tr=decode(await pinned('./model/tokenizer.json',{bytes:17083009,sha256:'fa685fc160bbdbab64058d4fc91b60e62d207e8dc60b9af5c002c5ab946ded00'},'preparando tokenizador'));
  const tc=decode(await pinned('./model/tokenizer_config.json',{bytes:1416,sha256:'0666eebf692422757e1dddf3c9fb1ded73ba3dc726c5828671fc89e45bf3609f'},'comprobando configuración'));
  tokenizer=new Tokenizer(tr,tc);
  const model=await pinned(MODEL_URL,{bytes:235052644,sha256:'634d0f66c29dc934c8fa72b8a4fe91dd4d420a22f1d82a241058d4316e659a99'},'descargando el modelo público desde Hugging Face (235 MB)');
  session=await ort.InferenceSession.create(new Uint8Array(model),{executionProviders:['wasm']});
  ready=true;postMessage({type:'ready'});
}
async function search(data){
  const id=data.id;
  try{
    if(cancelled.delete(id))return;
    if(!ready)throw Error('not_ready');
    const r=data.request;
    if(!r||Object.keys(r).sort().join(',')!=='kind,mode,query,skill'||typeof r.query!=='string'||!r.query.trim()||Array.from(r.query).length>2000||!['hybrid','dense','lexical'].includes(r.mode)||!['all','thesis','memory'].includes(r.kind)||r.skill!==null&&typeof r.skill!=='string')throw Error('invalid_query_parameters');
    // Lexical mode shares the exact tokenizer budget but never runs inference.
    let vector=null;
    if(r.mode==='lexical')encodeQuery(tokenizer,r.query);
    else vector=(await embedQuery(session,tokenizer,ort,r.query)).vector;
    if(cancelled.delete(id))return;
    const response=retriever.query(r,vector);
    if(!cancelled.delete(id))postMessage({type:'result',id,response});
  }catch(error){if(!cancelled.delete(id))postMessage({type:'error',id,code:error.message});}
  finally{active.delete(id);cancelled.delete(id);}
}
onmessage=({data})=>{
  if(data?.type==='cancel'){if(active.has(data.id))cancelled.add(data.id);return;}
  if(data?.type==='prepare'){
    prepare().catch(e=>postMessage({type:'error',code:e.message}));return;
  }
  if(data?.type==='search'&&Number.isSafeInteger(data.id)){
    if(active.has(data.id)||active.size>=10){postMessage({type:'error',id:data.id,code:'worker_queue_limit'});return;}
    active.add(data.id);
    queue=queue.then(()=>search(data)).catch(()=>{active.delete(data.id);cancelled.delete(data.id);postMessage({type:'error',id:data.id,code:'worker_dispatch'});});return;
  }
  postMessage({type:'error',id:data?.id,code:'unknown_operation'});
};
