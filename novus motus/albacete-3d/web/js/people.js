// Personas en pixel art (estilo HD-2D): figuras de 16x32 px dibujadas en un lienzo, con 3 vistas
// (frente, espalda, perfil) y 4 fotogramas de paso. Son figuras genéricas: no representan a nadie real.
import * as THREE from 'three';

const FW = 16, FH = 32, DIRS = 3, FRAMES = 4;
const SKINS = ['#f1c9a5', '#e8b996', '#d9a882', '#c28d68', '#a8744f', '#7d5236'];
const HAIRS = ['#2b211c', '#3d2a1e', '#5a3b22', '#8a5a2b', '#b98a4a', '#d6c19a', '#9a9a9a', '#e6e6e6', '#1a1a1a'];
const SHIRTS = ['#3c6e9e', '#b3122e', '#2d7a46', '#e0b54a', '#6b4f9a', '#444444', '#d96c3b', '#7a8c99', '#f2efe6', '#8a5a44', '#1f4e79', '#c9c2b0', '#5e7d4a', '#d4a5a5'];
const LEGS = ['#2f3b52', '#3a3a3a', '#5a4a3a', '#6b6b6b', '#1f2a44', '#8a7a5a', '#2b2b2b'];
const SHOES = ['#1a1a1a', '#3a2a1a', '#f2f2f2', '#5a3a2a'];

function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];

export function makeVariants(n, seed = 26092026) {
  const r = rnd(seed), out = [];
  for (let i = 0; i < n; i++) {
    const old = r() < 0.2, kid = !old && r() < 0.12;
    out.push({
      skin: pick(r, SKINS), hair: old ? pick(r, ['#9a9a9a', '#e6e6e6', '#bdbdbd']) : pick(r, HAIRS.slice(0, 6).concat(['#1a1a1a'])),
      hairStyle: old && r() < 0.4 ? 2 : Math.floor(r() * 4) === 3 ? 3 : r() < 0.4 ? 1 : 0,
      shirt: pick(r, SHIRTS), jacket: r() < 0.35 ? pick(r, ['#2b2b2b', '#5a4632', '#1f3550', '#6b2a2a', '#4a4a3a']) : null,
      legs: pick(r, LEGS), skirt: !kid && r() < 0.22 ? pick(r, ['#2b2b2b', '#6b2a4a', '#2f3b52', '#8a6a4a']) : null,
      shoes: pick(r, SHOES), bag: r() < 0.25 ? pick(r, ['#8a5a2b', '#2b2b2b', '#b3122e', '#c9a86a']) : null,
      kid,
    });
  }
  return out;
}
// avatar del jugador: camiseta blanca y pantalón negro; figura genérica
export const PLAYER_VARIANT = { skin: '#d9a882', hair: '#2b211c', hairStyle: 0, shirt: '#f4f4f4', jacket: null, legs: '#1c1c1c', skirt: null, shoes: '#1a1a1a', bag: null, kid: false };

function drawPerson(ctx, ox, oy, v, dir, frame) {
  const R = (x, y, w, h, c) => { if (!c) return; ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
  const dark = (c, f = 0.78) => { const n = parseInt(c.slice(1), 16); const r = ((n >> 16) & 255) * f, g = ((n >> 8) & 255) * f, b = (n & 255) * f; return `rgb(${r | 0},${g | 0},${b | 0})`; };
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const top = v.jacket || v.shirt;
  if (dir === 0 || dir === 1) {
    // piernas
    const lUp = step === 1 ? 1 : 0, rUp = step === -1 ? 1 : 0;
    if (v.skirt) {
      R(6, 25, 2, 5 - lUp, v.skin); R(8, 25, 2, 5 - rUp, v.skin);
      R(4, 20, 8, 5, v.skirt); R(4, 24, 8, 1, dark(v.skirt));
    } else {
      R(5, 20, 3, 10 - lUp, v.legs); R(8, 20, 3, 10 - rUp, v.legs); R(7, 20, 1, 8, dark(v.legs));
    }
    R(5, 30 - lUp, 3, 2, v.shoes); R(8, 30 - rUp, 3, 2, v.shoes);
    // torso y brazos (balanceo)
    R(4, 10, 8, 10, top); R(4, 10, 1, 10, dark(top)); R(11, 10, 1, 10, dark(top));
    if (v.jacket && dir === 0) { R(7, 10, 2, 9, v.shirt); }
    R(4, 19, 8, 1, dark(v.legs, 0.6));
    const aL = step, aR = -step;
    R(3, 10 + Math.max(0, aL), 1, 8, dark(top, 0.9)); R(3, 18 + Math.max(0, aL), 1, 1, v.skin);
    R(12, 10 + Math.max(0, aR), 1, 8, dark(top, 0.9)); R(12, 18 + Math.max(0, aR), 1, 1, v.skin);
    if (v.bag) { R(dir === 0 ? 12 : 3, 16, 2, 4, v.bag); R(dir === 0 ? 11 : 4, 10, 1, 6, dark(v.bag)); }
    // cabeza
    R(7, 9, 2, 1, v.skin);
    R(5, 2, 6, 7, dir === 0 ? v.skin : v.hair);
    if (v.hairStyle !== 2) { R(5, 1, 6, 2, v.hair); R(5, 3, 1, 2, v.hair); R(10, 3, 1, 2, v.hair); }
    else { R(5, 2, 6, 1, v.hair); R(5, 3, 1, 3, v.hair); R(10, 3, 1, 3, v.hair); }
    if (v.hairStyle === 1) { R(4, 3, 1, 7, v.hair); R(11, 3, 1, 7, v.hair); if (dir === 1) R(5, 8, 6, 2, v.hair); }
    if (v.hairStyle === 3 && dir === 1) R(7, 9, 2, 3, v.hair);
    if (dir === 0) { R(6, 5, 1, 1, '#2a1d18'); R(9, 5, 1, 1, '#2a1d18'); R(7, 7, 2, 1, dark(v.skin, 0.85)); }
  } else {
    // perfil (mirando a la derecha)
    const f = step;
    if (v.skirt) {
      R(6, 20, 6, 5, v.skirt);
      R(7 + f, 25, 2, 5, v.skin); R(8 - f, 25, 2, 5, dark(v.skin, 0.9));
    } else {
      R(7 + f, 20, 3, 10, v.legs); R(7 - f, 20, 3, 10, dark(v.legs, 0.85));
    }
    R(7 + f, 30, 4, 2, v.shoes); if (f) R(7 - f, 30, 3, 2, dark(v.shoes, 0.8));
    R(6, 10, 5, 10, top); R(6, 19, 5, 1, dark(v.legs, 0.6));
    R(8 + f, 11, 2, 7, dark(top, 0.85)); R(8 + f, 18, 2, 1, v.skin);
    if (v.bag) R(5, 15, 2, 4, v.bag);
    R(8, 9, 2, 1, v.skin);
    R(6, 2, 5, 7, v.skin); R(11, 5, 1, 1, v.skin);
    R(6, 1, 5, 2, v.hair); R(6, 3, 2, 3, v.hair);
    if (v.hairStyle === 1) R(5, 3, 2, 7, v.hair);
    if (v.hairStyle === 3) R(4, 4, 2, 3, v.hair);
    R(9, 5, 1, 1, '#2a1d18');
  }
}

function outline(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data, out = new Uint8ClampedArray(d);
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] > 0) continue;
    if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) { out[i] = 34; out[i + 1] = 28; out[i + 2] = 28; out[i + 3] = 255; }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

export function buildPeopleAtlas(variants) {
  const cols = DIRS * FRAMES, rows = variants.length;
  const cv = document.createElement('canvas'); cv.width = cols * FW; cv.height = rows * FH;
  const ctx = cv.getContext('2d');
  variants.forEach((v, r) => { for (let d = 0; d < DIRS; d++) for (let f = 0; f < FRAMES; f++) drawPerson(ctx, (d * FRAMES + f) * FW, r * FH, v, d, f); });
  outline(ctx, cv.width, cv.height);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, cols, rows, canvas: cv };
}

// Una figura = un Sprite con su propia copia de la textura (misma imagen, distinto recorte)
export class PixelPerson {
  constructor(atlas, variantRow, kid = false) {
    this.row = variantRow; this.kid = kid;
    this.mat = new THREE.SpriteMaterial({ alphaTest: 0.5, transparent: false });
    this.sprite = new THREE.Sprite(this.mat);
    this.sprite.center.set(0.5, 0);
    this.sprite.layers.set(1); // sin entintado de pantalla: la figura ya lleva su contorno
    this.setAtlas(atlas);
  }
  setAtlas(atlas, kid, alto) {
    this.atlas = atlas; if (kid !== undefined) this.kid = kid;
    this.alto = alto ?? 1;
    this.animado = atlas.variants?.[this.row - (atlas.playerRow0 ? 1 : 0)]?.animado ?? true;
    if (this.tex) this.tex.dispose();
    const t = atlas.tex.clone(); t.needsUpdate = true;
    this.tex = t; this.mat.map = t; this.mat.needsUpdate = true;
    this.setFrame(0, 0, false);
    if (this._s) this.setScale(this._s);
  }
  setFrame(dir, frame, flip) {
    const { cols, rows } = this.atlas, vpr = this.atlas.vpr || 1;
    const col = (this.row % vpr) * DIRS * FRAMES + dir * FRAMES + frame, rowIdx = Math.floor(this.row / vpr);
    this.tex.repeat.set((flip ? -1 : 1) / cols, 1 / rows);
    this.tex.offset.set((col + (flip ? 1 : 0)) / cols, 1 - (rowIdx + 1) / rows);
  }
  setRow(row, alto) { // cambia de personaje dentro del mismo atlas (al reaparecer un vecino)
    this.row = row; this.alto = alto ?? 1;
    this.animado = this.atlas.variants?.[row]?.animado ?? true;
    this.setFrame(0, 0, false); if (this._s) this.setScale(this._s);
  }
  setScale(s) { this._s = s; const k = (this.kid ? 0.72 : 1) * (this.alto || 1), hgt = 1.8 * s * k; this.sprite.scale.set(hgt * (this.atlas.aspect || 0.53), hgt, 1); }
}

// Vista según el ángulo entre la marcha de la figura y la cámara: 0 frente, 1 espalda, 2 perfil (con volteo)
export function viewFor(heading, camYaw) {
  // camYaw: dirección desde la que mira la cámara (la cámara está en +sin(yaw), +cos(yaw) respecto al objetivo)
  let rel = heading - camYaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  const a = Math.abs(rel);
  if (a < Math.PI / 4) return { dir: 0, flip: false };      // viene hacia la cámara
  if (a > (3 * Math.PI) / 4) return { dir: 1, flip: false }; // se aleja
  return { dir: 2, flip: rel < 0 };
}
