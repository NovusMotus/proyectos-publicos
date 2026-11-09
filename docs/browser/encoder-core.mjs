// Same existing public model and literal query input; no network in this module.
export const MAX_RAW_TOKENS=118;
export const DIMENSION=384;

export function encodeQuery(tokenizer,text){
  if(typeof text!=='string'||!text.trim()||text.length>4096)throw Error('invalid_query');
  const raw=tokenizer.encode(text,{add_special_tokens:false,return_token_type_ids:true});
  if(raw.ids.length>MAX_RAW_TOKENS)throw Error('query_token_budget');
  const encoded=tokenizer.encode(text,{add_special_tokens:true,return_token_type_ids:true});
  const {ids,attention_mask:mask,token_type_ids:types}=encoded;
  if(!ids.length||ids.length>128||mask.length!==ids.length||types.length!==ids.length||
    !ids.every(x=>Number.isSafeInteger(x)&&x>=0)||!mask.every(x=>x===0||x===1)||
    !types.every(x=>Number.isSafeInteger(x)&&x>=0))throw Error('invalid_encoding');
  return {ids,mask,types,rawTokens:raw.ids.length};
}

export function meanPoolNormalize(tensor,mask){
  const dims=tensor.dims;
  if(dims.length!==3||dims[0]!==1||dims[1]!==mask.length||dims[2]!==DIMENSION||tensor.type!=='float32')throw Error('unexpected_output_shape');
  const count=mask.reduce((a,b)=>a+b,0);
  if(!count)throw Error('empty_attention');
  const pooled=new Float32Array(DIMENSION);
  for(let d=0;d<DIMENSION;d++){
    let sum=0;
    for(let t=0;t<mask.length;t++)sum+=tensor.data[t*DIMENSION+d]*mask[t];
    pooled[d]=sum/count;
  }
  let square=0;
  for(const x of pooled)square+=x*x;
  const norm=Math.sqrt(square);
  if(!Number.isFinite(norm)||norm<=0)throw Error('invalid_vector_norm');
  const normalized=Float32Array.from(pooled,x=>x/norm);
  if(!normalized.every(Number.isFinite))throw Error('nonfinite_vector');
  return normalized;
}

export async function embedQuery(session,tokenizer,ort,text){
  const encoded=encodeQuery(tokenizer,text),dims=[1,encoded.ids.length];
  const int64=values=>new ort.Tensor('int64',BigInt64Array.from(values,BigInt),dims);
  const feeds={input_ids:int64(encoded.ids),attention_mask:int64(encoded.mask),token_type_ids:int64(encoded.types)};
  let output;
  try{
    output=await session.run(feeds);
    if(!output.last_hidden_state)throw Error('missing_last_hidden_state');
    return {vector:meanPoolNormalize(output.last_hidden_state,encoded.mask),encoded};
  }finally{
    for(const tensor of [...Object.values(feeds),...Object.values(output||{})])if(typeof tensor.dispose==='function')tensor.dispose();
  }
}

export function rankVectors(query,vectors,ids,limit=6){
  if(query.length!==DIMENSION||vectors.length!==ids.length*DIMENSION||!Number.isInteger(limit)||limit<1||limit>50)throw Error('invalid_ranking_input');
  if(!query.every(Number.isFinite))throw Error('invalid_query_vector');
  const rows=[];
  for(let i=0;i<ids.length;i++){
    let score=0;
    for(let d=0;d<DIMENSION;d++)score+=query[d]*vectors[i*DIMENSION+d];
    if(!Number.isFinite(score))throw Error('invalid_index_vector');
    rows.push({id:ids[i],score,index:i});
  }
  return rows.sort((a,b)=>b.score-a.score||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,limit);
}
