import {numberedDrawer} from './numbered-drawer.mjs';
const $=s=>document.querySelector(s);
const views=['front','fluids','back','bag'];
const titles={front:'VISTA FRONTAL',fluids:'LATERAL · SUEROS',back:'VISTA POSTERIOR',bag:'LATERAL · MOCHILA'};
let view='front',sound=true,audio=null,screen=false,tapTime=-Infinity,tour=-1,api;
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
export const drawerInterior=numberedDrawer;
export function playSound(kind='tap'){
 if(!sound)return;
 try{
  audio??=new (window.AudioContext||window.webkitAudioContext)();
  audio.resume().catch(()=>{});
  const t=audio.currentTime,gain=audio.createGain();gain.connect(audio.destination);
  gain.gain.setValueAtTime(0.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.012);
  const duration=kind==='drawer'?.28:kind==='plastic'?.13:.12;
  gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  if(kind==='drawer'||kind==='plastic'){
   const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(kind==='plastic'?Math.exp(-i/data.length*5):1);
   const source=audio.createBufferSource(),filter=audio.createBiquadFilter();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=kind==='plastic'?650:1200;filter.Q.value=kind==='plastic'?3:.7;source.connect(filter);filter.connect(gain);source.start(t);source.stop(t+duration);
  }else{
   const oscillator=audio.createOscillator();oscillator.type='sine';oscillator.frequency.setValueAtTime(kind==='electronic'?620:360,t);oscillator.frequency.exponentialRampToValueAtTime(kind==='electronic'?930:220,t+duration);oscillator.connect(gain);oscillator.start(t);oscillator.stop(t+duration);
  }
 }catch{/* Audio is optional; visual interaction always remains available. */}
}
function animate(el,name){
 if(!el||reduced())return;
 el.classList.remove(name);void el.offsetWidth;el.classList.add(name);
 el.addEventListener('animationend',()=>el.classList.remove(name),{once:true});
}
function renderObjects(){
 const host=$('#object-hotspots');
 host.innerHTML=view==='front'?`<button class="object-hit defib-hit ${screen?'screen-on':''}" data-object="defib" aria-label="Desfibrilador: un toque ilumina la pantalla; doble toque abre el detalle" aria-pressed="${screen}"><span class="screen-glow" aria-hidden="true"></span></button><button class="object-hit sharps-hit" data-object="sharps" aria-label="Animar contenedor de punzantes"></button>`:view==='fluids'?'<button class="object-hit side-hit" data-object="fluids" aria-label="Ver botellas del compartimento lateral">Ver sueros</button>':view==='bag'?'<button class="object-hit side-hit" data-object="bag" aria-label="Ver mochila de emergencias">Ver mochila</button>':'<button class="object-hit side-hit" data-object="board" aria-label="Ver tabla posterior de reanimación">Ver tabla</button>';
}
export function setView(next,{feedback=true}={}){
 if(!views.includes(next))return;
 view=next;tapTime=-Infinity;
 const stage=$('#cart-stage');stage.dataset.view=view;
 $('#view-label').textContent=titles[view];
 $('#cart-hotspots').hidden=view!=='front';
 stage.querySelector('.cart-art').hidden=view!=='front';
 $('#explore-equipment').hidden=view!=='front';
 document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 $('#interaction-hint').textContent=view==='front'?'Toca un objeto o abre un cajón':'Explora el lateral o gira el carro';
 renderObjects();animate(stage,'turn-in');if(feedback)playSound('tap');
}
export function locationOpened(id){
 const target=id.startsWith('d')||id==='top'?'front':id==='back'?'back':id==='other'?view:view==='bag'?'bag':'fluids';
 if(view!==target)setView(target,{feedback:false});
 $('#cart-stage').dataset.openDrawer=id.startsWith('d')?id:'';
 const pull=$('#drawer-pull-layer');if(pull){
  const n=Number(id.slice(1))-1,starts=[29.1,38.2,47.3,56.5,66.1],height=n===4?13.7:8.3;
  pull.hidden=!id.startsWith('d');
  if(id.startsWith('d')){pull.style.setProperty('--drawer-top',`${starts[n]}%`);pull.style.setProperty('--drawer-bottom',`${100-starts[n]-height}%`);animate(pull,'pull-out');}
 }
 animate($('#drawer-panel'),'drawer-enter');
}
export function goToMaterial(id){
 const item=api.getItem(id);if(!item)return;
 api.explore(item.location);
 setView(id==='bag'?'bag':item.location==='fluids'?'fluids':id==='board'?'back':'front',{feedback:false});
 const card=document.querySelector(`#drawer-panel [data-item="${id}"]`);
 if(card){card.classList.add('located-material');card.focus({preventScroll:true});card.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'nearest'});}
 playSound(item.location.startsWith('d')?'drawer':'tap');
}
function equipment(){tapTime=-Infinity;api.openDialog($('#equipment-dialog'));}
const steps=[
 {title:'Un toque, una respuesta',text:'Toca el desfibrilador para iluminarlo. Un doble toque o «Explorar desfibrilador» abre su detalle.',view:'front',location:'top'},
 {title:'Abre y reconoce',text:'Los cajones muestran fotografías del protocolo. Las zonas F abren su leyenda; las referencias de material abren fichas.',view:'front',location:'d2'},
 {title:'También por fuera',text:'Puedes recorrer ambos laterales y la parte posterior con las flechas o los botones de vista.',view:'back',location:'back'},
 {title:'Encuentra lo que necesitas',text:'En «Buscar material», escribe un nombre. Abre su ficha y pulsa «Llévame» para señalar su ubicación.',view:'front',location:'top'}
];
function renderTour(){
 const step=steps[tour];if(!step)return;
 api.explore(step.location);setView(step.view,{feedback:false});
 const host=$('#tour-card');host.hidden=false;
 host.innerHTML=`<p class="eyebrow">VISITA GUIADA · ${tour+1} / ${steps.length}</p><h2 id="tour-title" tabindex="-1">${step.title}</h2><p>${step.text}</p><div><button id="tour-next" class="primary-button">${tour===steps.length-1?'Terminar visita':'Siguiente'}</button><button id="tour-close" class="text-button">Cerrar visita</button></div>`;
 $('#tour-title').focus({preventScroll:true});host.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'nearest'});
}
function endTour(){tour=-1;$('#tour-card').hidden=true;$('#tour-start').focus();}
export function setupInteractions(callbacks){
 api=callbacks;
 $('#cart-stage').insertAdjacentHTML('beforeend','<div class="sharps-art" aria-hidden="true"><img src="assets/cart-protocol.png" alt=""></div><div id="drawer-pull-layer" aria-hidden="true" hidden><div class="drawer-gap"></div><img src="assets/cart-protocol.png" alt=""></div>');
 setView('front',{feedback:false});
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.photoZone!==undefined||b.dataset.highlightZone!==undefined){
 const n=b.dataset.photoZone??b.dataset.highlightZone;
 document.querySelectorAll('.zone-entry,.interior-point').forEach(el=>el.classList.remove('zone-active'));
 const entry=document.getElementById(`photo-zone-${n}`),point=document.querySelector(`[data-photo-zone="${n}"]`);
 entry?.classList.add('zone-active');point?.classList.add('zone-active');
 const target=b.dataset.photoZone!==undefined?entry:point;
 if(entry)entry.closest('details').open=true;
 target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest',inline:'center',behavior:reduced()?'auto':'smooth'});
 }
 if(b.dataset.view)setView(b.dataset.view);
  if(b.dataset.rotate)setView(views[(views.indexOf(view)+Number(b.dataset.rotate)+4)%4]);
  if(b.dataset.loc||b.dataset.cycle)playSound(b.dataset.loc?.startsWith('d')||b.dataset.cycle?'drawer':'tap');
  if(b.dataset.object){
   if(b.dataset.object==='defib'){
    const now=performance.now();
    if(now-tapTime<450){equipment();return;}
    tapTime=now;screen=!screen;b.classList.toggle('screen-on',screen);b.setAttribute('aria-pressed',String(screen));playSound('electronic');
   }else if(b.dataset.object==='sharps'){animate($('.sharps-art'),'plastic-wiggle');playSound('plastic');}
   else{playSound('plastic');if(b.dataset.object==='fluids')api.explore('fluids');else api.itemDetail(b.dataset.object);}
  }
  if(b.id==='explore-equipment')equipment();
  if(b.id==='equipment-power'){
   const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.textContent=on?'Apagar pantalla':'Iluminar pantalla';$('.equipment-preview').classList.toggle('powered',on);playSound('electronic');
  }
  if(b.id==='sound-toggle'){sound=!sound;b.setAttribute('aria-pressed',String(sound));b.textContent=sound?'Sonido: activado':'Sonido: silenciado';if(sound)playSound('tap');}
  if(b.id==='close-drawer'){
   $('#cart-stage').dataset.openDrawer='';$('.drawer-visual-section').hidden=true;
   $('#drawer-pull-layer').hidden=true;
   $('#drawer-title').focus({preventScroll:true});playSound('drawer');
  }
  if(b.id==='tour-start'){tour=0;renderTour();}
  if(b.id==='tour-next'){if(++tour>=steps.length)endTour();else renderTour();}
  if(b.id==='tour-close')endTour();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tour>=0&&!document.querySelector('dialog[open]'))endTour();});
}


