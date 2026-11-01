'use strict';
// Behavioural tests for motion preferences; browser layout is verified separately.
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const script=readFileSync('web/app.js','utf8').replace('  init();','  globalThis.motionTest = { setupMotion, animate };');
function environment(reduced=false, saved=null) {
  const listeners={}, mediaListeners={}, store=new Map(saved?[['portfolio-motion',saved]]:[]);
  const button={textContent:'',disabled:false,attributes:{},handlers:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this.handlers[k]=f;}};
  const nodes={'motion-toggle':button,'reading-progress':{style:{}},'area-mosaic':{},'project-detail':{},'answer-region':{},graph:{}};
  const media={matches:reduced,addEventListener(k,f){mediaListeners[k]=f;}};
  const document={hidden:false,documentElement:{dataset:{},scrollHeight:2000},getElementById(id){return nodes[id];},addEventListener(k,f){listeners[k]=f;}};
  const context={document,window:{},matchMedia:()=>media,sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},innerHeight:800,scrollY:0,addEventListener(){},requestAnimationFrame:f=>{f();return 1;},cancelAnimationFrame(){},MutationObserver:class {observe(){}},console};
  vm.createContext(context);vm.runInContext(script,context);context.motionTest.setupMotion();
  return {context,button,media,mediaListeners,document,listeners,store};
}
const normal=environment();assert.equal(normal.document.documentElement.dataset.motion,'on');
let cancelled=false;
normal.context.motionTest.animate({animate(){return {finished:new Promise(()=>{}),cancel(){cancelled=true;}};}},[{opacity:0},{opacity:1}]);
normal.button.handlers.click();assert.equal(normal.document.documentElement.dataset.motion,'off');assert.equal(cancelled,true);assert.equal(normal.button.attributes['aria-pressed'],'false');assert.equal(normal.store.get('portfolio-motion'),'paused');
let invoked=false;normal.context.motionTest.animate({animate(){invoked=true;}},[]);assert.equal(invoked,false);
normal.button.handlers.click();assert.equal(normal.document.documentElement.dataset.motion,'on');
normal.media.matches=true;normal.mediaListeners.change();assert.equal(normal.document.documentElement.dataset.motion,'off');assert.equal(normal.button.disabled,true);assert.equal(normal.button.textContent,'Movimiento reducido');
const reduced=environment(true);assert.equal(reduced.document.documentElement.dataset.motion,'off');assert.equal(reduced.button.disabled,true);
const persisted=environment(false,'paused');assert.equal(persisted.document.documentElement.dataset.motion,'off');
const hidden=environment();hidden.document.hidden=true;hidden.listeners.visibilitychange();assert.equal(hidden.document.documentElement.dataset.pageHidden,'true');
console.log('PASS: default, pause/cancel, resume, reduced-motion initial/change, persisted pause, hidden page.');
