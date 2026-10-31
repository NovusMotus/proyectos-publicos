export function numberCatalog(items){const counts={};return items.map(item=>({...item,ref:`${/^d[1-5]$/.test(item.location)?item.location.slice(1):item.location==='fluids'?'S':item.location==='other'?'M':item.location==='top'?'T':'L'}.${String(counts[item.location]=(counts[item.location]||0)+1).padStart(2,'0')}`}));}
export function materialSprite(item,extra=''){
 if(item.sprite===null)return `<span class="sprite fallback ${extra}" aria-hidden="true">?</span>`;
 const index=item.sprite;return `<span class="sprite material-art ${extra}" aria-hidden="true" data-art="${item.id}" style="--sx:${index%4*100/3}%;--sy:${Math.floor(index/4)*100/3}%"></span>`;
}
export const materialRef=item=>`<span class="material-ref">${item.ref}</span>`;
