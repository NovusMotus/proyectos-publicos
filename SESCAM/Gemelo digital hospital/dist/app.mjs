import {materialSprite,materialRef} from './illustrations.mjs';
import {locations,items,practiceItems,searchItems} from './catalog.mjs';
import {drawerInterior,setupInteractions,locationOpened,goToMaterial} from './interactive.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getLoc=id=>locations.find(l=>l.id===id);
const evidenceText={protocol:'Según protocolo CHUA',visible:'Adicional observado en vídeo',label:'Solo etiqueta',uncertain:'Por confirmar'};
let mode='explore',selected='top',quiz=null,lastFocus=null;
const drawerPositions=[29.1,38.2,47.3,56.5,66.1];
const sprite=materialSprite;
function badge(item){return `<span class="evidence ${item.evidence}">${evidenceText[item.evidence]}</span>`;}
function cartButtons(action,active){return locations.filter(l=>l.number).map((l,i)=>`<button class="cart-hit ${active===l.id?'selected':''}" style="top:${drawerPositions[i]}%;height:${i===4?13.7:8.3}%" data-${action}="${l.id}" aria-label="${action==='answer'?'Cajón '+l.number:l.short+': '+l.name}" ${action==='loc'?`aria-pressed="${active===l.id}"`:''}><span>${l.number}</span></button>`).join('');}
function externalButtons(action,active){return locations.filter(l=>!l.number).map(l=>`<button class="external-button ${active===l.id?'active':''}" data-${action}="${l.id}" ${action==='loc'?`aria-pressed="${active===l.id}"`:''}>${esc(l.short)}</button>`).join('');}
function setMode(next){
 if(!['explore','search','practice'].includes(next))throw new Error('Sección desconocida');
 mode=next;
 for(const name of ['explore','search','practice'])$(`#${name}-view`).hidden=name!==next;
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===next);if(b.dataset.mode===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 if(next==='search'){renderSearch();$('#search-input').focus();}
 if(next==='practice'){renderPractice();}
}
function selectLocation(id,{scroll=false,focus=false}={}){
 if(!getLoc(id))throw new Error('Ubicación desconocida');
 selected=id;
 $('#cart-hotspots').innerHTML=cartButtons('loc',id);
 $('#external-locations').innerHTML=externalButtons('loc',id);
 renderDrawer();
 locationOpened(id);
 if(focus)$('#drawer-title').focus({preventScroll:true});
 if(scroll&&matchMedia('(max-width:720px)').matches)$('#drawer-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
}
function renderDrawer(){
 const loc=getLoc(selected),content=items.filter(i=>i.location===selected||(selected==='top'&&i.id==='defib')||(selected==='back'&&i.id==='board'));
 $('#drawer-panel').style.setProperty('--drawer-color',loc.color);
 $('#drawer-panel').innerHTML=`<div class="drawer-title"><div class="drawer-title-top"><span class="drawer-tag"><i class="swatch" aria-hidden="true"></i>${esc(loc.short.toUpperCase())}</span><div class="drawer-pager"><button data-cycle="-1" aria-label="Ubicación anterior">←</button><button data-cycle="1" aria-label="Ubicación siguiente">→</button></div></div><h2 id="drawer-title" tabindex="-1">${esc(loc.name)}</h2><p>${esc(loc.description)}</p></div>${drawerInterior(loc)}<div class="drawer-heading-extra"><span>CONTENIDO</span><small>Toca un material para ver su ficha</small></div><div class="item-grid">${content.map(i=>`<button class="item-card" data-item="${i.id}">${materialRef(i)}${sprite(i)}<strong>${esc(i.name)}</strong>${badge(i)}</button>`).join('')}</div><div class="drawer-bottom"><span>Distribución documental CHUA</span><button data-practice-loc="${loc.id}">Practicar ubicaciones ↗</button></div>`;
}
function openDialog(dialog){lastFocus=document.activeElement;dialog.showModal();dialog.querySelector('[data-close]')?.focus();}
function itemDetail(id){
 const item=items.find(i=>i.id===id);if(!item)return;
 const loc=getLoc(item.location);
 $('#item-detail').innerHTML=`<p class="eyebrow">FICHA DEL MATERIAL · ${item.ref}</p><div class="detail-hero">${sprite(item)}<div><h2 id="item-title">${esc(item.name)}</h2>${badge(item)}</div></div><div class="detail-location"><span class="swatch" style="--drawer-color:${loc.color}"></span>${esc(loc.number?loc.short+' · '+loc.name:loc.name)}</div><p class="detail-note">${esc(item.note)}</p>${item.observation?`<details class="observation"><summary>Observación separada del vídeo de Cardiología</summary><p>${esc(item.observation.note)}</p><p>Ubicación registrada en el vídeo: ${esc(getLoc(item.observation.location).name)}. Esta observación no modifica la respuesta del juego.</p></details>`:""}<button class="primary-button" data-show-location="${loc.id}" data-find-material="${item.id}">${loc.id==="other"?"Ver categoría documental":loc.id==="fluids"?"Ver fluidoterapia":"Llévame a su ubicación"} <span aria-hidden="true">↗</span></button><p class="source-note">Fuentes de la ficha${item.sources.map(s=>`<span>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`:`${esc(s.video)} · ${esc(s.time)}`}</span>`).join('')}</p>`;
 openDialog($('#item-dialog'));
}
function renderSearch(){
 const results=searchItems($('#search-input').value,$('#location-filter').value);
 $('#search-count').textContent=`${results.length} ${results.length===1?'referencia encontrada':'referencias encontradas'} · sin cantidades de existencias`;
 $('#search-results').innerHTML=results.length?results.map(i=>{const l=getLoc(i.location);return `<button class="result-card" data-item="${i.id}">${sprite(i)}<span>${materialRef(i)}<strong>${esc(i.name)}</strong><span class="where">${esc(l.number?l.short+' · '+l.name:l.name)}</span>${badge(i)}</span></button>`}).join(''):`<div class="empty"><h2>No encontramos ese material.</h2><p>Prueba con otro nombre o cambia la ubicación.</p><button class="secondary-button" id="clear-search">Limpiar búsqueda</button></div>`;
}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function focusPractice(){const el=$('#game-question-title')||$('#game-summary-title')||$('#practice-view h1');if(el){el.setAttribute('tabindex','-1');el.focus({preventScroll:true});}}
function startQuiz(kind){
 if(!['locate','reverse'].includes(kind))throw new Error('Modo de práctica desconocido');
 const pool=kind==='reverse'?practiceItems.filter(i=>getLoc(i.location).number):practiceItems;
 const questions=shuffle(pool).slice(0,6).map(item=>({item,options:shuffle([item,...shuffle(practiceItems.filter(i=>i.location!==item.location)).slice(0,3)])}));
 quiz={kind,questions,index:0,score:0,answer:null,mistakes:[]};setMode('practice');focusPractice();
}
function renderPractice(){
 const host=$('#practice-content');
 if(!quiz){host.innerHTML=`<div class="practice-choices"><article class="practice-choice"><span class="game-glyph" aria-hidden="true">[?]</span><h2>¿Dónde está?</h2><p>Te mostramos un material. Señala su cajón o su ubicación en el carro.</p><p class="game-rules">6 PREGUNTAS · SIN CRONÓMETRO</p><button class="primary-button" data-start="locate">Buscar en el carro <span aria-hidden="true">→</span></button></article><article class="practice-choice"><span class="game-glyph" aria-hidden="true">[+]</span><h2>¿Qué hay dentro?</h2><p>Te mostramos un cajón. Elige el material que corresponde según el protocolo.</p><p class="game-rules">6 PREGUNTAS · 4 OPCIONES</p><button class="primary-button" data-start="reverse">Reconocer materiales <span aria-hidden="true">→</span></button></article></div><p class="game-footnote">La práctica utiliza la distribución del protocolo CHUA publicado (PDF de 2008). No evalúa existencias ni particularidades de cada unidad. Vigencia pendiente de confirmar por el servicio.</p>`;return;}
 if(quiz.index>=quiz.questions.length){
  host.innerHTML=`<section class="summary"><p class="eyebrow">PRÁCTICA COMPLETADA</p><h2 id="game-summary-title" tabindex="-1">${quiz.score===6?'¡Bien ubicado!':'Cada cajón, un poco más cerca.'}</h2><div class="score">${quiz.score}<span class="score-outof"> / 6</span></div><p>Respuestas correctas en esta sesión.</p>${quiz.mistakes.length?`<div class="review-list"><h3>Para repasar</h3><ul>${quiz.mistakes.map(i=>`<li><strong>${esc(i.name)}</strong> → ${esc(getLoc(i.location).short)}</li>`).join('')}</ul></div>`:'<p>Has localizado todos los materiales de esta ronda.</p>'}<div class="summary-actions"><button class="primary-button" data-start="${quiz.kind}">Volver a practicar</button><button class="secondary-button" id="practice-home">Cambiar de juego</button><button class="secondary-button" data-explore>Explorar el carro</button></div></section>`;return;
 }
 const q=quiz.questions[quiz.index],loc=getLoc(q.item.location),done=quiz.answer!==null;
 const correct=done&&(quiz.kind==='locate'?quiz.answer===q.item.location:quiz.answer===q.item.id);
 const feedback=done?`<div class="feedback ${correct?'':'wrong'}" role="status"><strong>${correct?'¡Correcto!':'Lo encontrarás aquí:'}</strong><p>${esc(q.item.name)} · ${esc(loc.number?loc.short+' — '+loc.name:loc.name)}.</p><button class="primary-button" id="next-question">${quiz.index===5?'Ver resultado':'Siguiente pregunta'} →</button></div>`:'';
 const question=quiz.kind==='locate'?`${sprite(q.item,'large')}<p class="eyebrow">¿DÓNDE ESTÁ?</p><h2 id="game-question-title" tabindex="-1">${esc(q.item.name)}</h2><p>Señala el cajón indicado en el protocolo.</p>`:`<p class="eyebrow">¿QUÉ HAY DENTRO?</p><span class="game-drawer-tag" style="background:${loc.color}">${esc(loc.short)}</span><h2 id="game-question-title" tabindex="-1">${esc(loc.name)}</h2><p>¿Cuál de estos materiales corresponde a este cajón según el protocolo?</p>`;
 const options=quiz.kind==='locate'?`<div class="cart-panel game-cart"><div class="panel-top"><span class="tiny-label">SEÑALA LA UBICACIÓN</span><span class="pixel-label">${quiz.index+1}/6</span></div><div class="cart-stage"><img class="cart-art" src="assets/cart-protocol.png" alt="Carro ilustrado con cinco cajones numerados" width="1024" height="1536"><div class="cart-hotspots">${cartButtons('answer',null)}</div></div><div class="external-locations">${externalButtons('answer',null)}</div></div>`:`<div class="reverse-grid">${q.options.map(i=>`<button class="item-card" data-answer="${i.id}">${sprite(i)}<strong>${esc(i.name)}</strong></button>`).join('')}</div>`;
 host.innerHTML=`<div class="game-top"><p>Pregunta <strong>${quiz.index+1} de 6</strong> <span class="game-points">· ${quiz.score} aciertos</span></p><button class="text-button" id="practice-home">Salir de la práctica</button></div><div class="progress-track" role="progressbar" aria-label="Progreso de la práctica" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${quiz.index}"><div class="progress-fill" style="width:${quiz.index/6*100}%"></div></div><div class="game-layout"><article class="game-question" data-question-item="${q.item.id}" aria-labelledby="game-question-title">${question}${feedback}</article>${options}</div>`;
 if(done){host.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;const value=b.dataset.answer;const right=quiz.kind==='locate'?q.item.location:q.item.id;if(value===right)b.classList.add('answer-correct');else if(value===quiz.answer)b.classList.add('answer-wrong');else b.classList.add('answer-muted');});$('#next-question').focus();}
}
function answer(value){
 if(!quiz||quiz.answer!==null||quiz.index>=quiz.questions.length)return;
 const q=quiz.questions[quiz.index],valid=quiz.kind==='locate'?locations.some(l=>l.id===value):q.options.some(i=>i.id===value);if(!valid)return;
 quiz.answer=value;const ok=quiz.kind==='locate'?value===q.item.location:value===q.item.id;
 if(ok)quiz.score++;else quiz.mistakes.push(q.item);renderPractice();
}
function showQr(){
 const url='https://carro-paradas-javier.novus-motus-8203.chatgpt.site';
 $('#qr-content').innerHTML=`<img src="assets/access-qr.png" alt="Código QR para abrir esta maqueta" width="330" height="330"><p>Acceso público mediante este enlace o QR.</p><a href="${url}" target="_blank" rel="noopener">${url}</a><button id="copy-link" class="primary-button">Copiar enlace</button>`;
 openDialog($('#qr-dialog'));
}
document.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.dataset.mode)setMode(b.dataset.mode);
 if(b.dataset.loc)selectLocation(b.dataset.loc,{scroll:true,focus:true});
 if(b.dataset.item)itemDetail(b.dataset.item);
 if(b.dataset.cycle){const i=locations.findIndex(l=>l.id===selected);selectLocation(locations[(i+Number(b.dataset.cycle)+locations.length)%locations.length].id,{focus:true});}
 if(b.dataset.close!==undefined)b.closest('dialog').close();
 if(b.dataset.showLocation){lastFocus=null;$('#item-dialog').close();goToMaterial(b.dataset.findMaterial);}
 if(b.dataset.start)startQuiz(b.dataset.start);
 if(b.dataset.answer)answer(b.dataset.answer);
 if(b.dataset.practiceLoc){quiz=null;setMode('practice');focusPractice();}
 if(b.dataset.explore!==undefined){setMode('explore');selectLocation(selected,{focus:true});}
 if(b.id==='go-practice'){quiz=null;setMode('practice');focusPractice();}
 if(b.id==='next-question'&&quiz&&quiz.answer!==null){quiz.index++;quiz.answer=null;renderPractice();focusPractice();}
 if(b.id==='practice-home'){quiz=null;renderPractice();focusPractice();}
 if(b.id==='clear-search'){$('#search-input').value='';$('#location-filter').value='all';renderSearch();$('#search-input').focus();}
 if(b.id==='about-open')openDialog($('#about-dialog'));
 if(b.id==='qr-open')showQr();
 if(b.id==='copy-link'){try{await navigator.clipboard.writeText('https://carro-paradas-javier.novus-motus-8203.chatgpt.site');$('#toast').textContent='Enlace copiado';$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,2500);}catch{b.textContent='Selecciona y copia el enlace de arriba';}}
});
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>(lastFocus?.isConnected&&lastFocus.getClientRects().length)?lastFocus.focus():null);d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();setMode('search');}});
$('#location-filter').innerHTML+=[...locations].map(l=>`<option value="${l.id}">${esc(l.number?l.short+' · '+l.name:l.name)}</option>`).join('');
$('#search-input').addEventListener('input',renderSearch);$('#location-filter').addEventListener('change',renderSearch);
setupInteractions({itemName:id=>esc(items.find(i=>i.id===id)?.name||id),getItem:id=>items.find(i=>i.id===id),explore:id=>{setMode('explore');selectLocation(id,{focus:true});},openDialog,itemDetail});
selectLocation(selected);renderSearch();renderPractice();
// Optional WebMCP navigation: the same actions used by the visible interface.
const mc=document.modelContext;
if(mc?.registerTool){
 const controller=new AbortController();
 const tool={name:'search_cart_materials',title:'Buscar material en el carro',description:'Busca el catálogo y abre la sección de búsqueda con los mismos resultados que ve el usuario.',inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.query!=='string'||Object.keys(input).some(k=>k!=='query'))throw new Error('Se requiere un texto de búsqueda');$('#search-input').value=input.query;$('#location-filter').value='all';setMode('search');return {results:searchItems(input.query).map(i=>({name:i.name,location:getLoc(i.location).short,evidence:evidenceText[i.evidence]}))};}};
 try{Promise.resolve(mc.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>controller.abort(),{once:true});
}

