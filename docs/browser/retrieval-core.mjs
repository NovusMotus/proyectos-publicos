// Port of the pinned public121 BM25/RRF/context policies; no generation or IO.
const cmp=(a,b)=>String(a)<String(b)?-1:String(a)>String(b)?1:0;
const copy=x=>structuredClone(x);
const STOP=new Set('a al algo ante como con cual cuando de del desde donde el ella ellas ellos en entre era es esa ese eso esta este esto ha hay la las le les lo los mas me mi muy no nos o para pero por porque que quien se sin sobre su sus te tu un una unas uno unos y ya the a an and are as at be by for from how in is it of on or our that the their them there these this to was we what when where which who with you your'.split(' '));
export function words(text,table){
  let normalized='';
  for(const ch of text){
    const cp=ch.codePointAt(0);
    normalized+=cp<128?ch.toLowerCase():(Object.hasOwn(table,cp)?table[cp]:' ');
  }
  return (normalized.match(/[a-z0-9]+/g)||[]).filter(w=>!STOP.has(w));
}
class BM25{
  constructor(texts,table){
    this.table=table;this.counts=texts.map(t=>{const m=new Map();for(const w of words(t,table))m.set(w,(m.get(w)||0)+1);return m;});
    this.lengths=this.counts.map(m=>[...m.values()].reduce((a,b)=>a+b,0));
    this.average=this.lengths.reduce((a,b)=>a+b,0)/Math.max(1,texts.length)||1;
    const df=new Map();for(const m of this.counts)for(const w of m.keys())df.set(w,(df.get(w)||0)+1);
    this.idf=new Map([...df].map(([w,n])=>[w,Math.log1p((texts.length-n+.5)/(n+.5))]));
  }
  score(query){
    const terms=new Set(words(query,this.table));
    return this.counts.map((row,i)=>{let score=0;for(const term of terms){const count=row.get(term)||0;if(count)score+=this.idf.get(term)*count*2.5/(count+1.5*(.25+.75*this.lengths[i]/this.average));}return score;});
  }
}
function fuse(rankings){
  const scores=new Map();
  for(const order of rankings){if(new Set(order).size!==order.length)throw Error('duplicate_ranked_identity');order.forEach((id,i)=>scores.set(id,(scores.get(id)||0)+1/(60+i)));}
  return {order:[...scores.keys()].sort((a,b)=>scores.get(b)-scores.get(a)||cmp(a,b)),scores};
}
export function createRetriever(config,vectors){
  const {documents,chunks,overlay,contract,normalization_table:table}=config;
  if(documents.length!==121||chunks.length!==2641||vectors.length!==2641*384||new Set(chunks.map(c=>c.id)).size!==2641)throw Error('retrieval_scope');
  for(let i=0;i<chunks.length;i++){let sq=0;for(let j=0;j<384;j++){const v=vectors[i*384+j];if(!Number.isFinite(v))throw Error('vector_nonfinite');sq+=v*v;}if(Math.abs(Math.sqrt(sq)-1)>1e-5)throw Error('vector_norm');}
  const docs=new Map(documents.map(d=>[d.id,d])),nodes=new Map(overlay.nodes.map(n=>[n.id,n]));
  const projects=new Map(documents.filter(d=>d.type==='thesis').map(d=>[d.project_id,d]));
  const projectEdges=pid=>overlay.edges.filter(e=>e.source_project===pid);
  const lexical=new BM25(chunks.map(c=>c.title+'\n'+c.text),table);
  const contextLexical=new BM25(chunks.map(c=>['preserved_body','full_document'].includes(c.selection_span)?c.text:''),table);
  function relations(sid){
    const doc=docs.get(sid);
    if(doc.type!=='thesis')return {project_id:null,candidate_associations:[],related_projects:[],limit:'No project/skill association assigned to this memory or excerpt document.'};
    const own=projectEdges(doc.project_id),related=new Map();
    for(const e of own)for(const other of overlay.edges)if(other.target_skill===e.target_skill&&other.source_project!==doc.project_id){
      if(!related.has(other.source_project))related.set(other.source_project,[]);
      related.get(other.source_project).push({skill:nodes.get(e.target_skill),origin_association:e,related_association:other});
    }
    const order=[...related.keys()].sort((a,b)=>new Set(related.get(b).map(p=>p.skill.id)).size-new Set(related.get(a).map(p=>p.skill.id)).size||cmp(a,b));
    return copy({project_id:doc.project_id,candidate_associations:own.map(e=>({skill:nodes.get(e.target_skill),association:e})),total_related_candidates:related.size,
      related_projects:order.slice(0,4).map(pid=>{const d=projects.get(pid);return {project_id:pid,title:d.title,source_url:d.source_url,source_sha256:d.sha256,paths:related.get(pid),relation:'shared_editorial_candidate_skill_association',personal_execution_or_collaboration_proven:false};}),
      limit:'Both legs have source passages, but shared editorial association is not proof of skills, execution, causality or collaboration.'});
  }
  const orderScores=(eligible,scores,channel)=>scores?eligible.filter(i=>channel==='dense'||scores[i]>0).sort((a,b)=>scores[b]-scores[a]||cmp(chunks[a].id,chunks[b].id)):[];
  const documentsIn=order=>[...new Set(order.map(i=>chunks[i].source_id))];
  function bodyContext(hit,mode,dense,bodyLexical){
    const available=chunks.map((c,i)=>i).filter(i=>chunks[i].source_id===hit.source_id&&(hit.type==='thesis'?chunks[i].selection_span==='preserved_body':chunks[i].selection_span==='full_document'));
    if(!available.length)throw Error('source_has_no_context_passage');
    const ordered=[...available].sort((a,b)=>chunks[a].char_start-chunks[b].char_start||cmp(chunks[a].id,chunks[b].id));
    let primary=available.find(i=>chunks[i].id===hit.id),strategy;
    if(primary!==undefined)strategy=hit.type==='thesis'?'winning_body_passage':'winning_document_passage';
    else{
      const dr=orderScores(available,dense,'dense'),lr=orderScores(available,bodyLexical,'lexical');
      const ranked=mode==='dense'?dr:mode==='lexical'?lr:fuse([dr,lr]).order;
      primary=ranked.length?ranked[0]:ordered[0];strategy=ranked.length?'query_ranked_same_source_body':'document_opening_no_positive_body_lexical_match';
    }
    const pos=ordered.indexOf(primary),after=pos+1<ordered.length,neighbor=after?ordered[pos+1]:(pos?ordered[pos-1]:null);
    const selected=[[primary,'primary']];if(neighbor!==null&&neighbor!==primary)selected.push([neighbor,after?'adjacent_after':'adjacent_before']);
    return selected.map(([i,role])=>({...copy(chunks[i]),context_selection:{role,strategy:role==='primary'?strategy:'adjacent_literal_passage_same_source',mode,answers_question_established:false}}));
  }
  function query(request,vector=null){
    const started=performance.now(),{query,mode,kind,skill=null}=request;
    if(typeof query!=='string'||!query.trim()||Array.from(query).length>2000||!['hybrid','dense','lexical'].includes(mode)||!['all','thesis','memory'].includes(kind)||skill!==null&&!nodes.has(skill))throw Error('invalid_query_parameters');
    if(mode!=='lexical'&&(!vector||vector.length!==384||[...vector].some(v=>!Number.isFinite(v))))throw Error('query_vector_invalid');
    if(mode==='lexical'&&vector!==null)throw Error('unexpected_lexical_inference');
    const eligible=chunks.map((c,i)=>i).filter(i=>{const c=chunks[i],d=docs.get(c.source_id);return (kind==='all'||kind==='thesis'&&c.type==='thesis'||kind==='memory'&&!['thesis','web_excerpt'].includes(c.type))&&(!skill||d.type==='thesis'&&projectEdges(d.project_id).some(e=>e.target_skill===skill));});
    let dense=null;
    if(vector){dense=chunks.map((_,i)=>{let x=0;for(let j=0;j<384;j++)x+=vectors[i*384+j]*vector[j];return x;});}
    const lex=mode!=='dense'?lexical.score(query):null,bodyLex=mode!=='dense'?contextLexical.score(query):null;
    const denseOrder=orderScores(eligible,dense,'dense'),lexOrder=orderScores(eligible,lex,'lexical');
    const dd=documentsIn(denseOrder),ld=documentsIn(lexOrder),dr=new Map(dd.map((id,i)=>[id,i+1])),lr=new Map(ld.map((id,i)=>[id,i+1]));
    const fused=mode==='hybrid'?fuse([dd,ld]):{order:mode==='dense'?dd:ld,scores:new Map()};
    const passage=mode==='hybrid'?fuse([denseOrder,lexOrder]).order:mode==='dense'?denseOrder:lexOrder;
    const best=new Map();for(const i of passage)if(!best.has(chunks[i].source_id))best.set(chunks[i].source_id,i);
    const annotate=(hit,channel)=>Object.assign(hit,{document_metadata:copy(contract.document_metadata[hit.source_id]),relations:relations(hit.source_id),supporting_passages:bodyContext(hit,channel,channel==='lexical'?null:dense,channel==='dense'?null:bodyLex)});
    const results=fused.order.slice(0,6).map(sid=>{
      const i=best.get(sid),hit=copy(chunks[i]);
      hit.retrieval={mode,dense_document_rank:dr.get(sid)??null,lexical_document_rank:lr.get(sid)??null,document_rrf_score:fused.scores.get(sid)??null,passage_cosine_similarity:dense?dense[i]:null,passage_bm25:lex?lex[i]:null};
      return annotate(hit,mode);
    });
    const alternatives=[],excluded=new Set(results.map(h=>h.source_id));
    if(mode==='hybrid')for(const [channel,order]of[['lexical',lexOrder],['dense',denseOrder]]){
      const sourceRanks=new Map(),bestPassage=new Map();
      order.forEach((i,rank)=>{const sid=chunks[i].source_id;if(!sourceRanks.has(sid)){sourceRanks.set(sid,sourceRanks.size+1);bestPassage.set(sid,[i,rank+1]);}});
      const sid=[...sourceRanks.keys()].find(s=>!excluded.has(s));if(sid===undefined)continue;
      excluded.add(sid);const [i,rank]=bestPassage.get(sid),hit=copy(chunks[i]);
      hit.retrieval={mode:channel,channel_document_rank:sourceRanks.get(sid),channel_passage_rank:rank,document_rrf_score:null,passage_cosine_similarity:channel==='dense'?dense[i]:null,passage_bm25:channel==='lexical'?lex[i]:null};
      hit.alternative_selection={channel,reason:'best_channel_document_omitted_from_primary_and_prior_alternatives',channel_rank_scope:'same_eligible_filtered_documents',primary_rank_not_replaced:true,relevance_or_answer_sufficiency_established:false};
      alternatives.push(annotate(hit,channel));
    }
    return {schema:contract.response_schema,primary_response_schema:contract.primary_response_schema,created_utc:new Date().toISOString(),query,mode,kind,skill_filter:skill,
      corpus_sha256:contract.corpus_sha256,source_documents_in_snapshot:121,eligible_source_documents:new Set(eligible.map(i=>chunks[i].source_id)).size,
      model:contract.model,model_revision:contract.model_revision,rrf:{zero_based_k:60,document_fusion:mode==='hybrid',passage_fusion:mode==='hybrid'},bm25:{k1:1.5,b:.75,title_included_once_per_chunk:true,stemming:false},
      graph:copy(contract.graph),elapsed_query_seconds:(performance.now()-started)/1000,embedding_inference_used:mode!=='lexical',python_socket_guard_enabled:false,execution_environment:'browser_worker_wasm',
      retrieved_context_is_untrusted_data:true,generative_answer:false,personal_skills_accredited:false,answerability_established:false,
      snapshot_mode:'public-memory-PR7-121',corpus_updated_without_new_Grok_execution:true,source_snapshots:copy(contract.source_snapshots),chunk_selection_policy:contract.chunk_selection_policy,
      context_policy:contract.context_policy,query_embedding_calls:mode==='lexical'?0:1,
      context_bm25_input:'literal_body_text_without_title_prefix',context_requires_extra_query_embedding:false,context_sufficiency_established:false,
      ranking_algorithm_preserved_from_115:true,ranking_unchanged_from_115:false,results,retrieval_alternatives:alternatives,alternative_policy:contract.alternative_policy,
      result_budget:{primary_requested:6,primary_returned:results.length,maximum_extra_sources:mode==='hybrid'?2:0,extra_sources_returned:alternatives.length,channels_returned:alternatives.map(h=>h.alternative_selection.channel),channel_selection_order:mode==='hybrid'?['lexical','dense']:[]},
      source_snapshot_notice:'Fixed public121 snapshot; source dates/models remain unchanged. Not live repository synchronization.',
      context_notice:'Literal same-source passages, candidate only; no generated answer or sufficiency finding.',
      alternatives_notice:'Separate optional channel sources; larger budget, no general relevance guarantee.',
      client_contract:'browser public121 with explicit WASM provenance; same retrieval policies, not a Python socket guard.'};
  }
  return {query};
}
