// Estilo «tebeo»: homenaje al trazo de la escuela Bruguera y de Francisco Ibáñez (tinta gruesa, color plano,
// narizotas y zapatones). Figuras, cielo y rótulos genéricos: no reproduce ningún personaje ni obra concreta.
import * as THREE from 'three';

// ------------------------------------------------------------------ cielo de viñeta
export function makeSkyTexture(night) {
  const W = 2048, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H / 2);
  if (night) { g.addColorStop(0, '#0e1a36'); g.addColorStop(1, '#2d3f6b'); }
  else { g.addColorStop(0, '#5aa6dc'); g.addColorStop(0.7, '#a9d4ee'); g.addColorStop(1, '#f3ead2'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H / 2);
  ctx.fillStyle = night ? '#2d3f6b' : '#f3ead2'; ctx.fillRect(0, H / 2, W, H / 2);
  let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (night) {
    ctx.fillStyle = '#fff8d8';
    for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H * 0.42, s = r() < 0.1 ? 3 : 1.6; ctx.fillRect(x, y, s, s); }
    ctx.lineWidth = 5; ctx.strokeStyle = '#141018'; ctx.fillStyle = '#fff4c2';
    ctx.beginPath(); ctx.arc(W * 0.3, H * 0.16, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    return finish(cv);
  }
  // nubes de algodón con contorno de tinta
  for (let i = 0; i < 16; i++) {
    const cx = r() * W, cy = H * (0.2 + r() * 0.22), s = 40 + r() * 60, n = 4 + Math.floor(r() * 4);
    const blobs = [];
    for (let k = 0; k < n; k++) blobs.push([cx + (k - n / 2) * s * 0.7 + r() * s * 0.3, cy - Math.sin((k / (n - 1 || 1)) * Math.PI) * s * 0.45, s * (0.55 + r() * 0.35)]);
    for (const [pass, lw] of [['stroke', 9], ['fill', 0]]) {
      for (const [x, y, rr] of blobs) {
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2);
        if (pass === 'stroke') { ctx.lineWidth = lw; ctx.strokeStyle = '#1b1612'; ctx.stroke(); } else { ctx.fillStyle = '#ffffff'; ctx.fill(); }
      }
      if (pass === 'fill') { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - n * s * 0.4, cy - 2, n * s * 0.8, s * 0.5); }
    }
    ctx.lineWidth = 5; ctx.strokeStyle = '#1b1612'; ctx.beginPath(); ctx.moveTo(cx - n * s * 0.45, cy + s * 0.48); ctx.lineTo(cx + n * s * 0.45, cy + s * 0.48); ctx.stroke();
    ctx.fillStyle = '#dfe9f2'; ctx.fillRect(cx - n * s * 0.4, cy + s * 0.3, n * s * 0.8, s * 0.16);
  }
  return finish(cv);
}
function finish(cv) {
  const t = new THREE.CanvasTexture(cv);
  t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------ figuras caricaturescas genéricas
// Proporciones de tebeo: cabeza grande, nariz grande, zapatones. Se evitan combinaciones que recuerden a
// personajes conocidos (p. ej. calvo con gafas, o dos pelos con camisa blanca y pantalón rojo).
const SKIN = ['#f6cfae', '#efc19b', '#e3ad86', '#c98e66', '#a8704c', '#7d5236'];
const HAIR = ['#2b211c', '#4a3322', '#7a4b26', '#b27a3e', '#d8b56a', '#1b1b1b', '#8c8c8c', '#e7e2da'];
const CLOTH = ['#d6332b', '#2f6db3', '#2f8f4e', '#f0b92e', '#7b4fa0', '#ef7f2c', '#3b3b3b', '#e9e4d4', '#8a5a3a', '#1f4f7a', '#c75c8a', '#4d9aa6'];
const PANTS = ['#2d3b5a', '#3a3a3a', '#6b5238', '#4b6b3a', '#1f2a44', '#8a7a5a', '#5a2f2f'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const pickR = (r, a) => a[Math.floor(r() * a.length)];

export function makeCartoonVariants(n, seed = 1957) {
  const r = rng(seed), out = [];
  while (out.length < n) {
    const old = r() < 0.25, kid = !old && r() < 0.12, fem = r() < 0.5;
    const hair = old ? pickR(r, ['#8c8c8c', '#e7e2da', '#b9b4ac']) : pickR(r, HAIR.slice(0, 6));
    const hairStyle = fem ? pickR(r, ['moño', 'melena', 'rizos', 'coleta']) : old ? pickR(r, ['calvo', 'coronilla', 'pelado']) : pickR(r, ['pelado', 'tupe', 'rizos', 'gorra']);
    const shirt = pickR(r, CLOTH), pants = pickR(r, PANTS);
    const glasses = r() < 0.18, mustache = !fem && !kid && r() < 0.3, belly = !kid && r() < 0.3, skirt = fem && !kid && r() < 0.5;
    // evitar parecidos con personajes conocidos
    if ((hairStyle === 'calvo' || hairStyle === 'coronilla') && (glasses || mustache)) continue;
    if (shirt === '#e9e4d4' && pants === '#5a2f2f') continue;
    out.push({ skin: pickR(r, SKIN), hair, hairStyle, shirt, pants, glasses, mustache, belly, skirt, kid, shoes: pickR(r, ['#1b1612', '#5a3a22', '#2b2b2b']), bag: r() < 0.25 ? pickR(r, CLOTH) : null });
  }
  return out;
}
export const PLAYER_CARTOON = { skin: '#efc19b', hair: '#2b211c', hairStyle: 'tupe', shirt: '#f4f4f4', pants: '#1c1c1c', glasses: false, mustache: false, belly: false, skirt: false, kid: false, shoes: '#1b1612', bag: null };

const CW = 64, CH = 112; // celda de fotograma
function drawCartoon(ctx, ox, oy, v, dir, frame) {
  const LW = 2.6, INK = '#1b1612';
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const bob = step ? -1.5 : 0;
  ctx.save(); ctx.translate(ox, oy + bob); ctx.lineWidth = LW; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK;
  const shape = (fill, fn) => { ctx.beginPath(); fn(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const ell = (x, y, rx, ry, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  const cx = 32;
  // piernas y zapatones
  if (dir === 2) {
    const a = step * 5;
    for (const [dx, back] of [[-a, true], [a, false]]) {
      shape(back ? shade(v.pants) : v.pants, () => { ctx.moveTo(cx - 4 + dx * 0.4, 70); ctx.lineTo(cx - 5 + dx, 96); ctx.lineTo(cx + 3 + dx, 96); ctx.lineTo(cx + 4 + dx * 0.4, 70); ctx.closePath(); });
      shape(v.shoes, ell(cx + 5 + dx, 99, 11, 5.5));
    }
  } else {
    for (const side of [-1, 1]) {
      const lift = step === side ? 3 : 0;
      if (!v.skirt) shape(v.pants, () => { ctx.moveTo(cx + side * 2, 70); ctx.lineTo(cx + side * 3, 96 - lift); ctx.lineTo(cx + side * 11, 96 - lift); ctx.lineTo(cx + side * 10, 70); ctx.closePath(); });
      else shape(v.skin, () => { ctx.rect(cx + side * 4 - (side < 0 ? 4 : 0), 80, 4, 16 - lift); });
      shape(v.shoes, ell(cx + side * 8, 99 - lift, 9, 5.5));
    }
  }
  // cuerpo (con barriga opcional)
  const bw = v.belly ? 17 : 13;
  if (v.skirt && dir !== 2) shape(v.pants, () => { ctx.moveTo(cx - 12, 64); ctx.lineTo(cx - 16, 84); ctx.lineTo(cx + 16, 84); ctx.lineTo(cx + 12, 64); ctx.closePath(); });
  shape(v.shirt, () => { ctx.moveTo(cx - 10, 44); ctx.quadraticCurveTo(cx - bw - 2, 58, cx - bw + 2, 72); ctx.lineTo(cx + bw - 2, 72); ctx.quadraticCurveTo(cx + bw + 2, 58, cx + 10, 44); ctx.closePath(); });
  if (v.bag) shape(v.bag, () => ctx.rect(dir === 2 ? cx - 16 : cx + 12, 60, 9, 11));
  // brazos que se balancean, manos redondas
  const arm = (sx, swing) => {
    ctx.beginPath(); ctx.moveTo(cx + sx * 9, 47); ctx.lineTo(cx + sx * 15 + swing, 66); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = v.shirt; ctx.stroke(); ctx.lineWidth = LW; ctx.strokeStyle = INK;
    shape(v.skin, ell(cx + sx * 15 + swing, 68, 3.8, 3.8));
  };
  if (dir === 2) arm(0.3, step * 6); else { arm(-1, step * 3); arm(1, -step * 3); }
  // cabeza grande
  const hy = 26;
  shape(v.skin, ell(cx, hy, 15, 16));
  // pelo
  const hair = () => {
    const st = v.hairStyle;
    if (st === 'calvo') { shape(v.hair, () => { ctx.ellipse(cx - 14, hy, 3, 5, 0, 0, Math.PI * 2); }); shape(v.hair, () => { ctx.ellipse(cx + 14, hy, 3, 5, 0, 0, Math.PI * 2); }); return; }
    if (st === 'coronilla') { shape(v.hair, () => { ctx.ellipse(cx, hy - 11, 12, 6, 0, Math.PI, Math.PI * 2); ctx.closePath(); }); return; }
    if (st === 'gorra') { shape('#2f6db3', () => { ctx.ellipse(cx, hy - 9, 15, 9, 0, Math.PI, Math.PI * 2); ctx.closePath(); }); shape('#2f6db3', () => ctx.rect(dir === 2 ? cx : cx - 16, hy - 10, dir === 2 ? 20 : 32, 4)); return; }
    shape(v.hair, () => { ctx.ellipse(cx, hy - 8, 16, 10, 0, Math.PI, Math.PI * 2); ctx.closePath(); });
    if (st === 'melena' || st === 'rizos') { shape(v.hair, ell(cx - 14, hy + 2, 5, 11)); if (dir !== 2) shape(v.hair, ell(cx + 14, hy + 2, 5, 11)); }
    if (st === 'moño') shape(v.hair, ell(cx + (dir === 2 ? -10 : 0), hy - 18, 7, 6));
    if (st === 'coleta') shape(v.hair, ell(cx + (dir === 2 ? -15 : 0), hy + (dir === 1 ? 4 : -2), 5, 9));
    if (st === 'tupe') shape(v.hair, ell(cx + 4, hy - 16, 9, 5, -0.3));
    if (st === 'rizos') for (let k = -2; k <= 2; k++) shape(v.hair, ell(cx + k * 6, hy - 15, 4, 4));
  };
  if (dir === 1) { shape(v.hair === '#e7e2da' ? '#d8d2c8' : v.hair, ell(cx, hy - 2, 15, 15)); hair(); }
  else {
    hair();
    const nx = dir === 2 ? cx + 14 : cx;
    // narizota
    shape(v.skin, ell(nx + (dir === 2 ? 3 : 0), hy + 5, dir === 2 ? 8 : 6.5, 5.5));
    // ojos de punto
    ctx.fillStyle = INK;
    if (dir === 0) { ctx.beginPath(); ctx.ellipse(cx - 6, hy - 1, 2, 3, 0, 0, Math.PI * 2); ctx.ellipse(cx + 6, hy - 1, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(cx + 7, hy - 2, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    if (v.glasses) { ctx.beginPath(); if (dir === 0) { ctx.arc(cx - 6, hy - 1, 5, 0, Math.PI * 2); ctx.moveTo(cx + 11, hy - 1); ctx.arc(cx + 6, hy - 1, 5, 0, Math.PI * 2); } else ctx.arc(cx + 7, hy - 2, 5, 0, Math.PI * 2); ctx.stroke(); }
    if (v.mustache) shape(v.hair === '#e7e2da' ? '#cfc9bf' : v.hair, ell(nx + (dir === 2 ? 1 : 0), hy + 11, 8, 3));
    // boca
    ctx.beginPath(); ctx.arc(nx + (dir === 2 ? -1 : 0), hy + 12, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  ctx.restore();
}
function shade(c) { const n = parseInt(c.slice(1), 16); return `rgb(${((n >> 16) & 255) * 0.8 | 0},${((n >> 8) & 255) * 0.8 | 0},${(n & 255) * 0.8 | 0})`; }

export function buildCartoonAtlas(variants) {
  const vpr = 2, cols = 12 * vpr, rows = Math.ceil(variants.length / vpr);
  const cv = document.createElement('canvas'); cv.width = cols * CW; cv.height = rows * CH;
  const ctx = cv.getContext('2d');
  variants.forEach((v, i) => {
    const bx = (i % vpr) * 12, by = Math.floor(i / vpr);
    for (let d = 0; d < 3; d++) for (let f = 0; f < 4; f++) drawCartoon(ctx, (bx + d * 4 + f) * CW, by * CH, v, d, f);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.anisotropy = 4;
  return { tex, cols, rows, vpr, canvas: cv, aspect: CW / CH, variants };
}

// ------------------------------------------------------------------ rótulos de los locales (nombres reales de OSM)
export class SignPool {
  constructor(scene, n = 18) {
    this.items = Array.from({ length: n }, () => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      m.visible = false; scene.add(m);
      return { cv, tex, m, key: null };
    });
  }
  draw(it, name, color) {
    const ctx = it.cv.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 128);
    ctx.lineWidth = 10; ctx.strokeStyle = '#1b1612'; ctx.strokeRect(5, 5, 502, 118);
    let size = 64; ctx.font = `${size}px Bangers, "Comic Neue", sans-serif`;
    const text = name.toUpperCase();
    while (ctx.measureText(text).width > 460 && size > 24) { size -= 4; ctx.font = `${size}px Bangers, "Comic Neue", sans-serif`; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = '#1b1612'; ctx.strokeText(text, 256, 68);
    ctx.fillStyle = '#fffbe8'; ctx.fillText(text, 256, 68);
    it.tex.needsUpdate = true;
  }
  update(list) { // list: [{key, name, color, x, z, nx, nz}]
    const want = new Map(list.map((s) => [s.key, s]));
    for (const it of this.items) if (it.key && !want.has(it.key)) { it.key = null; it.m.visible = false; }
    for (const s of list) {
      if (this.items.some((it) => it.key === s.key)) continue;
      const it = this.items.find((x) => !x.key); if (!it) break;
      it.key = s.key; this.draw(it, s.name, s.color);
      it.m.position.set(s.x, 3.3, s.z); it.m.rotation.set(0, Math.atan2(s.nx, s.nz), 0); it.m.visible = true;
    }
  }
  setVisible(v) { for (const it of this.items) it.m.visible = v && !!it.key; }
}
