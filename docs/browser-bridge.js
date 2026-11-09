(function(root){
'use strict';
function create(onState){
  let worker=null,epoch=0,next=0,state='idle';
  const pending=new Map();
  const abort=()=>Object.assign(Error('Aborted'),{name:'AbortError'});
  function settle(id,error,value){const p=pending.get(id);if(!p)return;pending.delete(id);p.signal?.removeEventListener('abort',p.aborted);if(error)p.reject(error);else p.resolve(value);}
  function stop(){
    epoch++;if(worker)worker.terminate();worker=null;
    for(const id of [...pending.keys()])settle(id,abort());
    state='idle';onState(state);
  }
  function failure(code){
    stop();state='error';onState(state,code);
  }
  function connect(){
    if(state==='loading'||state==='ready')return;
    stop();state='loading';onState(state,'iniciando');const mine=epoch;
    try{worker=new root.Worker(new URL('browser/worker.mjs',root.location.href),{type:'module'});}
    catch(error){failure('worker_start_failed');return;}
    worker.onmessage=({data})=>{
      if(mine!==epoch)return;
      if(data.type==='progress'){onState(state,data.stage);return;}
      if(data.type==='ready'){state='ready';onState(state);return;}
      if(data.type==='error'){
        if(data.id===undefined){failure(data.code);return;}
        settle(data.id,Error(data.code));return;
      }
      if(data.type==='result')settle(data.id,null,data.response);
    };
    worker.onerror=()=>{if(mine===epoch)failure('worker_error');};
    worker.postMessage({type:'prepare'});
  }
  function retrieve(request,signal){
    if(state!=='ready'||!worker)return Promise.reject(Error('not_ready'));
    if(signal?.aborted)return Promise.reject(abort());
    const id=++next;
    return new Promise((resolve,reject)=>{
      const aborted=()=>{if(worker)worker.postMessage({type:'cancel',id});settle(id,abort());};
      pending.set(id,{resolve,reject,signal,aborted});
      signal?.addEventListener('abort',aborted,{once:true});
      worker.postMessage({type:'search',id,request:structuredClone(request)});
    });
  }
  return {connect,retrieve,stop};
}
root.CerebroBrowserTransport={create};
})(globalThis);
