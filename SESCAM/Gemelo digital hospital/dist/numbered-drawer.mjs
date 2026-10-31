import {items} from './catalog.mjs';
import {materialSprite,materialRef} from './illustrations.mjs';
import {photoZones} from './photo-zones.mjs';
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function numberedDrawer(loc){
 if(!loc.number)return '';
 const materials=items.filter(i=>i.location===loc.id),zones=photoZones[loc.id],known=new Set(zones.flatMap(z=>z.ids));
 return `<section class="drawer-visual-section" aria-label="Interior numerado de ${loc.short}">
 <h3>Fotografía · zonas numeradas</h3><p class="diagram-note">F1… identifica cada zona visual, no el número del material ni una numeración oficial. Toca una zona para ver su leyenda. En móvil puedes desplazar la foto lateralmente.</p>
 <div class="photo-scroll" tabindex="0" role="region" aria-label="Fotografía ampliada; desplazamiento horizontal"><div class="drawer-visual protocol-photo numbered-photo" data-drawer-art="${loc.id}" style="aspect-ratio:700/${loc.number===1?536:858}"><img src="assets/protocolo-cajon-${loc.number}.jpg" alt="Fotografía completa del cajón ${loc.number}, CHUA">${zones.map((z,n)=>`<button class="interior-point" style="left:${z.x}%;top:${z.y}%" data-photo-zone="${n}" aria-label="F${n+1}: ${safe(z.label)}" aria-controls="photo-zone-${n}">F${n+1}</button>`).join('')}</div></div>
 <p class="interior-note">Fotografía: CHUA / SESCAM. <a href="https://www.chospab.es/enfermeria/protocolos/carros_paradas/contenido_cajon${loc.number}.htm" target="_blank" rel="noopener">Fuente original</a>. No acredita existencias actuales.</p>
 <details class="photo-legend"><summary>Leyenda de todas las zonas</summary><div>${zones.map((z,n)=>`<article id="photo-zone-${n}" tabindex="-1" class="zone-entry"><button class="zone-label" data-highlight-zone="${n}"><b>F${n+1}</b> ${safe(z.label)}</button>${z.ids.length?z.ids.map(id=>{const i=items.find(i=>i.id===id);return `<button class="zone-material" data-item="${id}">${materialRef(i)}${safe(i.name)}</button>`;}).join(''):'<p>Contenido individual sin identificar.</p>'}${z.note?`<p>${safe(z.note)}</p>`:''}</article>`).join('')}</div></details>
 <h3>Materiales ilustrados</h3><p class="diagram-note">Referencias ${loc.number}.01…: identifican las fichas. Este esquema organiza el catálogo; no reproduce la posición física de cada objeto.</p>
 <div class="illustrated-tray">${materials.map(i=>`<button class="tray-slot" data-item="${i.id}" aria-label="Referencia ${i.ref}: ${safe(i.name)}">${materialRef(i)}${materialSprite(i)}<strong>${safe(i.name)}</strong>${i.sprite===null?'<small>Ilustración pendiente</small>':''}<small>${known.has(i.id)?'Identificado en la foto':i.id==='medcase'?'Caja visible como conjunto':'Sin identificación individual en la foto'}</small></button>`).join('')}</div>
 <button class="text-button drawer-close" id="close-drawer">Cerrar cajón</button></section>`;
}


