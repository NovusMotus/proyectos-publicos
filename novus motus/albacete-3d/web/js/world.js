// Construcción del mundo a partir de datos abiertos: edificios (Catastro), calles y áreas (OSM),
// rejilla de colisiones y grafo peatonal para rutas. Coordenadas: X = este (m), Z = -norte (m).
import * as THREE from 'three';
import { RAMP } from './render.js';

export const FLOOR_H = 3.0; // supuesto declarado: altura media por planta

export const toX = (x) => x / 10;
export const toZ = (y) => -y / 10;

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const USE_LABEL = {
  '1_residential': 'Residencial',
  '2_agriculture': 'Agrario',
  '3_industrial': 'Industrial',
  '4_1_office': 'Oficinas',
  '4_2_retail': 'Comercial',
  '4_3_publicServices': 'Servicios públicos',
  desconocido: 'Sin dato',
};
export const useLabel = (u) => USE_LABEL[u] || u;

const PALETTE = {
  '1_residential': [0xe9dcc3, 0xe3d2b4, 0xd9c7a7, 0xefe6d6, 0xd8b894, 0xc9a37f, 0xe6d9c9],
  '4_2_retail': [0xe6d5bf, 0xdcc8ae, 0xe9e1d3],
  '4_1_office': [0xcfd6dc, 0xd9d9d4, 0xc4ccd2],
  '4_3_publicServices': [0xc8906e, 0xd8b48c, 0xe6dac4, 0xbfa287],
  '3_industrial': [0xb9b9b4, 0xa9adb0, 0xc2beb6],
  '2_agriculture': [0xc9b896],
  desconocido: [0xd0c8bc],
};
const ROOF = [0xb5b0a8, 0xaaa59d, 0xbdb6ab, 0xa89e94];

function ringXZ(flat) {
  const out = new Float64Array(flat.length);
  for (let i = 0; i < flat.length; i += 2) { out[i] = flat[i] / 10; out[i + 1] = -flat[i + 1] / 10; }
  return out;
}

// ------------------------------------------------------------------ edificios
// Cada muro recibe un "modo" (atributo tex.x):
//   >= 0  índice de tesela de la foto de fachada del Catastro (muro que da a la calle)
//   -2    muro a la calle sin foto → ventanas genéricas (una fila por planta del Catastro)
//   -3    medianera o patio → liso con el color del edificio
// Las cubiertas (wallUV = -1) toman la ortofoto PNOA.
function facesStreet(x0, z0, x1, z1, grid, index) {
  const L = Math.hypot(x1 - x0, z1 - z0);
  if (L < 2.2) return false;
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
  for (const sg of [1, -1]) {
    const px = mx + nx * sg * 1.0, pz = mz + nz * sg * 1.0;
    if (grid.blockedXZ(px, pz)) continue;
    const seg = index.nearestSegment(mx + nx * sg * 5, mz + nz * sg * 5, 14, false);
    if (!seg) continue;
    // el tramo entre el muro y la calle tiene que estar libre de edificios
    let free = true;
    for (let t = 0.2; t <= 1.0; t += 0.2) {
      if (grid.blockedXZ(px + (seg.x - px) * t, pz + (seg.z - pz) * t)) { free = false; break; }
    }
    if (free) return true;
  }
  return false;
}

export function buildBuildings(bdata, material, colores, tiles, grid, index, extra = {}, onProgress) {
  const { uses, b, parts } = bdata;
  const CH = 600;
  const chunks = new Map();
  // altura máxima por edificio (para que un cuerpo bajo muestre la parte baja de su fachada)
  // altura efectiva: altura medida de OSM si existe y es mayor; si no, plantas del Catastro x 3 m
  const hOf = (pi) => (bdata.h_osm?.[pi] ? bdata.h_osm[pi][0] : parts[pi][1] * FLOOR_H);
  const maxH = new Float32Array(b.length);
  parts.forEach((pp, pi) => { const hh = hOf(pi); if (hh > maxH[pp[0]]) maxH[pp[0]] = hh; });
  for (let pi = 0; pi < parts.length; pi++) {
    const [bi, floors, outer, holes] = parts[pi];
    if (!floors || floors <= 0) continue;
    const o = ringXZ(outer);
    const hs = holes.map(ringXZ);
    const n = o.length / 2;
    let cx = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += o[2 * i]; cz += o[2 * i + 1]; }
    cx /= n; cz /= n;
    const contour = [];
    for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(o[2 * i], o[2 * i + 1]));
    const holeV = hs.map((h) => { const a = []; for (let i = 0; i < h.length / 2; i++) a.push(new THREE.Vector2(h[2 * i], h[2 * i + 1])); return a; });
    let tris = [];
    try { tris = THREE.ShapeUtils.triangulateShape(contour, holeV); } catch (e) { tris = []; }
    const ringVerts = n + holeV.reduce((s, h) => s + h.length, 0);
    const key = Math.floor(cx / CH) + ',' + Math.floor(cz / CH);
    let c = chunks.get(key);
    if (!c) { c = { items: [], nv: 0, ni: 0 }; chunks.set(key, c); }
    c.items.push({ pi, bi, floors, rings: [o, ...hs], outerCount: 1, contour, holeV, tris });
    c.nv += ringVerts * 4 + ringVerts; c.ni += ringVerts * 6 + tris.length * 3;
    if (onProgress && pi % 4000 === 0) onProgress(pi / parts.length);
  }

  const meshes = [];
  const col = new THREE.Color();
  const stats = { murosFoto: 0, murosGenericos: 0, medianeras: 0 };
  // datos reales para la fachada ilustrada: paleta de su foto, locales de OSM en el bajo, año del Catastro
  const lin = (rgb) => { col.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace); return [col.r * 255, col.g * 255, col.b * 255]; };
  const bInfo = b.map(([ref, ui, year], bi) => {
    const p = extra.paletas?.[bi];
    const wall = colores?.fachada_rgb?.[bi] || p?.[0] || [200, 190, 175];
    const dark = p?.[1] || [wall[0] * 0.35, wall[1] * 0.35, wall[2] * 0.35];
    const acc = p?.[2] || [150, 70, 45];
    const light = p?.[3] || [Math.min(255, wall[0] * 1.25), Math.min(255, wall[1] * 1.25), Math.min(255, wall[2] * 1.25)];
    // tipología por año de construcción (estilización): 0 antes de 1940, 1 hasta 1975, 2 hasta 2000, 3 después
    const h = hashStr(ref);
    const variant = year == null ? h % 4 : year < 1940 ? 0 : year < 1975 ? 1 : year < 2000 ? 2 : 3;
    const [r, g, bb] = wall, mx = Math.max(r, g, bb), mn = Math.min(r, g, bb);
    const brick = mx > 60 && (mx - mn) / mx > 0.22 && r >= g && g >= bb && r - bb > 35; // pared rojiza/anaranjada → ladrillo
    return { dark: lin(dark), acc: lin(acc), light: lin(light), variant, shop: !!extra.bajos?.[bi], brick };
  });
  for (const [key, c] of chunks) {
    const pos = new Float32Array(c.nv * 3), nor = new Float32Array(c.nv * 3);
    const colr = new Uint8Array(c.nv * 3), wuv = new Float32Array(c.nv * 2), tex = new Float32Array(c.nv * 3);
    const palD = new Uint8Array(c.nv * 3), palA = new Uint8Array(c.nv * 3), palL = new Uint8Array(c.nv * 3);
    const info = new Uint8Array(c.nv * 4), hPart = new Float32Array(c.nv);
    const idx = new Uint32Array(c.ni);
    const triStart = new Int32Array(c.items.length), triPart = new Int32Array(c.items.length);
    let v = 0, k = 0;
    c.items.forEach((it, ii) => {
      triStart[ii] = k / 3; triPart[ii] = it.pi;
      const [ref, ui] = b[it.bi];
      const use = uses[ui];
      const hh = hashStr(ref);
      const fac = colores?.fachada_rgb?.[it.bi];
      if (fac) col.setRGB(fac[0] / 255, fac[1] / 255, fac[2] / 255, THREE.SRGBColorSpace);
      else { const pal = PALETTE[use] || PALETTE.desconocido; col.setHex(pal[hh % pal.length]); }
      const wr = col.r * 255, wg = col.g * 255, wb = col.b * 255;
      const roofC = colores?.cubierta_rgb?.[it.pi];
      if (roofC) col.setRGB(roofC[0] / 255, roofC[1] / 255, roofC[2] / 255, THREE.SRGBColorSpace);
      else col.setHex(ROOF[(hh >>> 4) % ROOF.length]);
      const rr = col.r * 255, rg = col.g * 255, rb = col.b * 255;
      const h = hOf(it.pi);
      const hBuild = Math.max(h, maxH[it.bi]);
      const tile = tiles?.tile_por_edificio?.[it.bi] ?? -1;
      const style = (hh >>> 12) % 4; // variante de ventana genérica (solo sin foto)
      const bI = bInfo[it.bi];
      const rT = colores?.cubierta_rgb?.[it.pi];
      const roofTile = rT ? (rT[0] > rT[1] * 1.12 && rT[0] > rT[2] * 1.25 && rT[0] > 90) : false; // cubierta rojiza en la ortofoto → teja
      const setIll = (vv) => {
        palD.set(bI.dark, vv * 3); palA.set(bI.acc, vv * 3); palL.set(bI.light, vv * 3);
        info[vv * 4] = bI.variant; info[vv * 4 + 1] = bI.shop ? 255 : 0; info[vv * 4 + 2] = bI.brick ? 255 : 0; info[vv * 4 + 3] = roofTile ? 255 : 0;
        hPart[vv] = h;
      };
      it.rings.forEach((r, ri) => {
        const n = r.length / 2;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const x0 = r[2 * i], z0 = r[2 * i + 1], x1 = r[2 * j], z1 = r[2 * j + 1];
          const len = Math.hypot(x1 - x0, z1 - z0);
          const street = ri === 0 && grid && index ? facesStreet(x0, z0, x1, z1, grid, index) : false;
          let mode;
          if (street && tile >= 0) { mode = tile; stats.murosFoto++; }
          else if (street) { mode = -2 - style * 0.1; stats.murosGenericos++; }
          else { mode = -3; stats.medianeras++; }
          const rep = Math.min(14, Math.max(5, len));
          const wnx = len > 0 ? (z1 - z0) / len : 0, wnz = len > 0 ? -(x1 - x0) / len : 0;
          const base = v;
          const quad = [[x0, 0, z0, 0, 0], [x1, 0, z1, len, 0], [x1, h, z1, len, h], [x0, h, z0, 0, h]];
          for (const q of quad) {
            pos[v * 3] = q[0]; pos[v * 3 + 1] = q[1]; pos[v * 3 + 2] = q[2];
            nor[v * 3] = wnx; nor[v * 3 + 2] = wnz;
            colr[v * 3] = wr; colr[v * 3 + 1] = wg; colr[v * 3 + 2] = wb;
            wuv[v * 2] = q[3]; wuv[v * 2 + 1] = q[4];
            tex[v * 3] = mode; tex[v * 3 + 1] = rep; tex[v * 3 + 2] = hBuild;
            setIll(v);
            v++;
          }
          idx[k++] = base; idx[k++] = base + 1; idx[k++] = base + 2;
          idx[k++] = base; idx[k++] = base + 2; idx[k++] = base + 3;
        }
      });
      const rb0 = v;
      const allPts = [...it.contour, ...it.holeV.flat()];
      for (const p of allPts) {
        pos[v * 3] = p.x; pos[v * 3 + 1] = h; pos[v * 3 + 2] = p.y;
        nor[v * 3 + 1] = 1;
        colr[v * 3] = rr; colr[v * 3 + 1] = rg; colr[v * 3 + 2] = rb;
        wuv[v * 2] = -1; wuv[v * 2 + 1] = -1;
        tex[v * 3] = -9;
        setIll(v);
        v++;
      }
      for (const t of it.tris) { idx[k++] = rb0 + t[0]; idx[k++] = rb0 + t[1]; idx[k++] = rb0 + t[2]; }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, v * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, v * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(colr.subarray(0, v * 3), 3, true));
    g.setAttribute('wallUV', new THREE.BufferAttribute(wuv.subarray(0, v * 2), 2));
    g.setAttribute('tex', new THREE.BufferAttribute(tex.subarray(0, v * 3), 3));
    g.setAttribute('palD', new THREE.BufferAttribute(palD.subarray(0, v * 3), 3, true));
    g.setAttribute('palA', new THREE.BufferAttribute(palA.subarray(0, v * 3), 3, true));
    g.setAttribute('palL', new THREE.BufferAttribute(palL.subarray(0, v * 3), 3, true));
    g.setAttribute('info', new THREE.BufferAttribute(info.subarray(0, v * 4), 4, true));
    g.setAttribute('hPart', new THREE.BufferAttribute(hPart.subarray(0, v), 1));
    g.setIndex(new THREE.BufferAttribute(idx.subarray(0, k), 1));
    g.computeBoundingBox(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.userData = { kind: 'buildings', triStart, triPart, chunk: key };
    meshes.push(m);
  }
  meshes.stats = stats;
  return meshes;
}

export function partFromFace(mesh, faceIndex) {
  const { triStart, triPart } = mesh.userData;
  let lo = 0, hi = triStart.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (triStart[mid] <= faceIndex) lo = mid; else hi = mid - 1; }
  return triPart[lo];
}

// Material: fachadas con la foto pixelada del Catastro, medianeras lisas, ventanas genéricas donde no hay foto
// (una fila por planta) y cubiertas con la ortofoto PNOA.
export function makeBuildingMaterial(atlasTex, tiles, orthoTex, ortho) {
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: RAMP.tex });
  const U = {
    uNight: { value: 0 }, uIllus: { value: 1 }, uInkCol: { value: new THREE.Vector3(0.07, 0.055, 0.05) },
    uAtlas: { value: atlasTex || null }, uHasAtlas: { value: atlasTex ? 1 : 0 },
    uTile: { value: new THREE.Vector2(tiles?.tw || 32, tiles?.th || 40) },
    uAtlasPx: { value: new THREE.Vector2(tiles?.atlas_px?.[0] || 1, tiles?.atlas_px?.[1] || 1) },
    uCols: { value: tiles?.cols || 1 },
    uOrtho: { value: orthoTex || null }, uHasOrtho: { value: orthoTex ? 1 : 0 },
    uOrthoMin: { value: new THREE.Vector2(ortho?.min?.[0] || 0, ortho?.min?.[1] || 0) },
    uOrthoSize: { value: new THREE.Vector2(ortho?.size?.[0] || 1, ortho?.size?.[1] || 1) },
  };
  mat.userData.uniforms = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 wallUV;\nattribute vec3 tex;\nattribute vec3 palD, palA, palL;\nattribute vec4 info;\nattribute float hPart;\nvarying vec2 vWallUV;\nvarying vec3 vTex;\nvarying vec3 vWorld;\nvarying vec3 vPalD, vPalA, vPalL;\nvarying vec4 vInfo;\nvarying float vHPart;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWallUV = wallUV;\nvTex = tex;\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPalD = palD; vPalA = palA; vPalL = palL; vInfo = info; vHPart = hPart;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vWallUV;
varying vec3 vTex;
varying vec3 vWorld;
uniform float uNight; uniform float uIllus; uniform vec3 uInkCol;
varying vec3 vPalD, vPalA, vPalL; varying vec4 vInfo; varying float vHPart;
float lineAt(float x, float w) { float a = fwidth(x) * 1.2; return 1.0 - smoothstep(w, w + a, abs(x)); }
float boxLine(vec2 p, vec2 hs, float w) { vec2 d = abs(p) - hs; float dist = max(d.x, d.y); float a = fwidth(dist) * 1.2; return 1.0 - smoothstep(w, w + a, abs(dist)); }
uniform sampler2D uAtlas; uniform float uHasAtlas; uniform vec2 uTile; uniform vec2 uAtlasPx; uniform float uCols;
uniform sampler2D uOrtho; uniform float uHasOrtho; uniform vec2 uOrthoMin; uniform vec2 uOrthoSize;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float litWin = 0.0;
vec3 photoEmit = vec3(0.0);
if (uIllus > 0.5) {
  vec3 dk = vPalD, ac = vPalA, lt = vPalL;
  if (vWallUV.x > -0.5) {
    // ---------------- fachada ilustrada (datos reales: plantas, paleta de la foto, locales OSM, año)
    // corrección de exposición fija (+30 %): las fotos del Catastro suelen estar subexpuestas; igual para todos
    diffuseColor.rgb = min(diffuseColor.rgb * 1.3 + 0.02, vec3(1.0)); dk *= 1.15; ac = min(ac * 1.3, vec3(1.0)); lt = min(lt * 1.3 + 0.03, vec3(1.0));
    vec3 wall = diffuseColor.rgb;
    float variant = floor(vInfo.x * 255.0 + 0.5);
    bool shop = vInfo.y > 0.5, brick = vInfo.z > 0.5;
    float u = vWallUV.x, v = vWallUV.y;
    float fl = floor(v / 3.0), fy = fract(v / 3.0) * 3.0;
    float farD = smoothstep(0.035, 0.11, fwidth(v));
    vec3 c = wall; float ink = 0.0;
    if (brick) {
      float row = v / 0.26; float bx = fract((u + mod(floor(row), 2.0) * 0.32) / 0.64);
      float mortar = max(lineAt(fract(row) - 0.5, 0.44), lineAt(bx - 0.5, 0.47));
      c = mix(c, c * 0.72 + 0.06, mortar * 0.55 * (1.0 - farD));
    }
    if (vTex.x > -2.5) {
      float colW = variant < 0.5 ? 2.5 : variant < 1.5 ? 3.0 : variant < 2.5 ? 3.6 : 4.4;
      float bay = floor(u / colW);
      float lx = (fract(u / colW) - 0.5) * colW;
      float hh = hash12(vec2(bay, fl) + vPalD.rg * 91.0);
      if (fl < 0.5) {
        if (shop) {
          float gw = colW * 0.42;
          vec2 p = vec2(lx, fy - 1.2);
          if (abs(p.x) < gw && abs(p.y) < 0.95) {
            c = mix(vec3(0.50, 0.62, 0.70), dk, 0.2);
            c = mix(c, vec3(0.97), step(0.87, fract((lx + fy) * 0.8)) * 0.65);
          }
          ink = max(ink, boxLine(p, vec2(gw, 0.95), 0.03));
          float scallop = 2.28 + 0.09 * abs(sin(u * 3.14159 / 0.5));
          if (fy > scallop && fy < 2.86) c = mix(ac, vec3(0.97, 0.95, 0.9), step(0.5, fract(u / 0.5)));
          ink = max(ink, lineAt(fy - scallop, 0.018)); ink = max(ink, lineAt(fy - 2.86, 0.018));
        } else {
          if (mod(bay, 3.0) < 0.5) {
            vec2 p = vec2(lx, fy - 1.1);
            if (abs(p.x) < 0.65 && abs(p.y) < 1.1) c = mix(mix(ac, dk, 0.55), dk, lineAt(lx, 0.03) * 0.8);
            ink = max(ink, boxLine(p, vec2(0.65, 1.1), 0.028));
          } else {
            vec2 p = vec2(lx, fy - 1.55);
            if (abs(p.x) < 0.55 && abs(p.y) < 0.6) c = mix(vec3(0.46, 0.56, 0.63), dk, lineAt(fract(lx / 0.18 + 0.5) - 0.5, 0.06) * (1.0 - farD));
            ink = max(ink, boxLine(p, vec2(0.55, 0.6), 0.028));
          }
        }
        if (fy < 0.34) c = mix(c, lt * 0.8, 0.6);
        ink = max(ink, lineAt(fy - 0.34, 0.016));
      } else {
        float ww = variant < 0.5 ? 0.52 : variant < 1.5 ? 0.62 : variant < 2.5 ? 0.85 : 1.35;
        float wh = variant < 0.5 ? 0.92 : variant < 1.5 ? 0.72 : variant < 2.5 ? 0.62 : 0.86;
        float wcy = 1.6;
        vec2 p = vec2(lx, fy - wcy);
        float fr = 0.09;
        bool inW = abs(p.x) < ww && abs(p.y) < wh;
        if (!inW && abs(p.x) < ww + fr && abs(p.y) < wh + fr) c = lt;
        if (inW) {
          float shut = mix(0.12, 0.78, hh);
          float yTop = wh - p.y;
          if (yTop < shut * 2.0 * wh) {
            c = mix(lt, ac, 0.4);
            c = mix(c, c * 0.72, lineAt(fract(yTop / 0.1) - 0.5, 0.08) * 0.5 * (1.0 - farD));
          } else {
            c = vec3(0.54, 0.66, 0.75);
            c = mix(c, vec3(0.98), step(0.88, fract((p.x + p.y) * 1.5 + hh)) * 0.7);
            c = mix(c, lt, lineAt(p.x, 0.03));
          }
        }
        ink = max(ink, boxLine(p, vec2(ww + fr, wh + fr), 0.025));
        ink = max(ink, boxLine(p, vec2(ww, wh), 0.016) * 0.7);
        bool balc = variant < 0.5 || (variant < 1.5 && hh > 0.5);
        bool terr = variant > 1.5 && variant < 2.5;
        float bw = terr ? colW * 0.5 : ww + 0.3;
        float slab = wcy - wh - 0.04;
        if ((balc || terr) && abs(lx) < bw) {
          if (fy > slab - 0.13 && fy < slab) c = lt * 0.9;
          if (fy > slab && fy < slab + 0.95) ink = max(ink, lineAt(fract(lx / 0.14) - 0.5, 0.07) * (1.0 - smoothstep(0.015, 0.05, fwidth(lx))) * 0.9);
          ink = max(ink, lineAt(fy - (slab + 0.95), 0.02));
          ink = max(ink, lineAt(fy - (slab - 0.13), 0.016));
        }
        if (fy < 0.12) c = mix(c, lt, 0.7);
        ink = max(ink, lineAt(fy - 0.12, 0.012) * 0.8);
      }
    } else {
      c *= 0.94; // medianera o patio: paramento liso
    }
    float top = vHPart - v;
    if (top < 0.45) c = mix(c, lt, 0.6);
    ink = max(ink, lineAt(top - 0.45, 0.016));
    c = mix(c, wall, farD * 0.75); ink *= 1.0 - farD;
    diffuseColor.rgb = mix(c, uInkCol, clamp(ink, 0.0, 1.0));
  } else {
    // ---------------- cubierta ilustrada: teja si la ortofoto es rojiza, azotea de baldosa si no
    vec3 rc = diffuseColor.rgb;
    vec2 w2 = vWorld.xz;
    float farR = smoothstep(0.05, 0.2, fwidth(w2.x));
    if (vInfo.w > 0.5) {
      float rowp = w2.y / 0.36;
      float wave = 0.12 * sin(w2.x * 3.14159 / 0.24);
      rc = mix(rc, rc * 0.6, lineAt(fract(rowp + wave) - 0.5, 0.06) * (1.0 - farR));
    } else {
      vec2 g = w2 / 1.2;
      rc = mix(rc, rc * 0.84, max(lineAt(fract(g.x) - 0.5, 0.47), lineAt(fract(g.y) - 0.5, 0.47)) * 0.6 * (1.0 - farR));
    }
    diffuseColor.rgb = rc;
  }
} else
{
if (vWallUV.x > -0.5) {
  float fl = floor(vWallUV.y / ${FLOOR_H.toFixed(1)});
  float fy = fract(vWallUV.y / ${FLOOR_H.toFixed(1)});
  if (vTex.x >= 0.0 && uHasAtlas > 0.5) {
    // foto de fachada del Catastro, pixelada
    float tu = clamp(fract(vWallUV.x / vTex.y), 0.5 / uTile.x, 1.0 - 0.5 / uTile.x);
    float tv = clamp(vWallUV.y / vTex.z, 0.5 / uTile.y, 1.0 - 0.5 / uTile.y);
    float cx = mod(vTex.x, uCols), cy = floor(vTex.x / uCols);
    vec2 px = vec2(cx * uTile.x + tu * uTile.x, cy * uTile.y + (1.0 - tv) * uTile.y);
    vec3 t = texture2D(uAtlas, vec2(px.x / uAtlasPx.x, 1.0 - px.y / uAtlasPx.y)).rgb;
    // de lejos (varios texeles por píxel) se funde con el color medio real de la fachada: evita el parpadeo
    vec2 tpp = fwidth(vec2(vWallUV.x / vTex.y * uTile.x, vWallUV.y / vTex.z * uTile.y));
    t = mix(t, diffuseColor.rgb, smoothstep(0.8, 2.5, max(tpp.x, tpp.y)));
    diffuseColor.rgb = t * 0.22; photoEmit = t;  // la foto ya trae su luz: se muestra casi tal cual
  } else if (vTex.x > -2.5) {
    // muro a la calle sin foto: ventanas genéricas, una fila por planta (variante por edificio)
    float st = floor((-2.0 - vTex.x) * 10.0 + 0.5);
    float colW = 2.8 + st * 0.45;
    float fx = fract(vWallUV.x / colW);
    bool ground = fl < 0.5;
    float ww = ground ? 0.38 : 0.16 + 0.04 * st;
    float wx = step(0.5 - ww, fx) * step(fx, 0.5 + ww);
    float wy = ground ? step(0.06, fy) * step(fy, 0.80) : step(0.28, fy) * step(fy, 0.82);
    float win = wx * wy;
    litWin = step(0.55, hash12(vec2(floor(vWallUV.x / colW), fl) + diffuseColor.rg * 57.0)) * win;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.23, 0.27), win * 0.85);
    diffuseColor.rgb *= 1.0 - 0.12 * (1.0 - step(0.035, fy));
  } else {
    // medianera o patio: paramento liso, algo más oscuro
    diffuseColor.rgb *= 0.9;
  }
} else if (uHasOrtho > 0.5) {
  // cubierta: ortofoto PNOA
  vec2 ouv = vec2((vWorld.x - uOrthoMin.x) / uOrthoSize.x, (-vWorld.z - uOrthoMin.y) / uOrthoSize.y);
  if (ouv.x > 0.0 && ouv.x < 1.0 && ouv.y > 0.0 && ouv.y < 1.0) { vec3 o = texture2D(uOrtho, ouv).rgb; diffuseColor.rgb = o * 0.22; photoEmit = o; }
}
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * litWin * uNight * 0.9;
totalEmissiveRadiance += photoEmit * 0.5 * (1.0 - 0.45 * uNight);`);
  };
  return mat;
}

// ------------------------------------------------------------------ calles y áreas
const ROAD_TYPES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'motorway_link', 'trunk_link',
  'primary_link', 'secondary_link', 'tertiary_link', 'residential', 'unclassified', 'living_street', 'service']);
const STREET_STYLE = (t) => {
  if (t === 'primary' || t === 'trunk' || t === 'motorway' || t.endsWith('_link')) return { c: 0x55585d, y: 0.06 };
  if (t === 'secondary' || t === 'tertiary') return { c: 0x5d6065, y: 0.06 };
  if (t === 'residential' || t === 'unclassified') return { c: 0x686b70, y: 0.06 };
  if (t === 'living_street') return { c: 0x9a8f80, y: 0.06 };
  if (t === 'service') return { c: 0x74777b, y: 0.055 };
  if (t === 'pedestrian') return { c: 0xcdbfa6, y: 0.07 };
  if (t === 'cycleway') return { c: 0xb56a58, y: 0.08 };
  if (t === 'track') return { c: 0xb9a27f, y: 0.05 };
  if (t === 'steps') return { c: 0xb3aca2, y: 0.085 };
  return { c: 0xe0d5bf, y: 0.08 }; // footway, path…
};
const AREA_COLOR = { parque: 0x8fb36a, pista: 0x6f9f58, estadio: 0x8aae66, juegos: 0xd6c39a, cesped: 0x9cc27a, agua: 0x6fa8c9 };

const LIN = new Map();
function linBytes(hex) {
  let v = LIN.get(hex);
  if (!v) { const c = new THREE.Color().setHex(hex); v = [c.r * 255, c.g * 255, c.b * 255]; LIN.set(hex, v); }
  return v;
}

class Geo {
  constructor() { this.p = []; this.c = []; this.i = []; }
  vert(x, y, z, col) { this.p.push(x, y, z); const l = linBytes(col); this.c.push(l[0], l[1], l[2]); return this.p.length / 3 - 1; }
  mesh(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.c), 3, true));
    g.setIndex(this.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return new THREE.Mesh(g, material);
  }
}

function ribbon(geo, pts, w, y, col, caps) {
  const hw = w / 2;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const x0 = pts[i], z0 = pts[i + 1], x1 = pts[i + 2], z1 = pts[i + 3];
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
    if (L < 0.01) continue;
    const nx = -dz / L * hw, nz = dx / L * hw;
    const a = geo.vert(x0 + nx, y, z0 + nz, col), b = geo.vert(x0 - nx, y, z0 - nz, col);
    const c = geo.vert(x1 - nx, y, z1 - nz, col), d = geo.vert(x1 + nx, y, z1 + nz, col);
    geo.i.push(a, c, b, a, d, c);
  }
  // uniones redondeadas para evitar huecos en los giros
  const n = pts.length / 2;
  for (let j = caps ? 0 : 1; j < (caps ? n : n - 1); j++) {
    const cx = pts[2 * j], cz = pts[2 * j + 1];
    const ctr = geo.vert(cx, y, cz, col);
    const S = 8;
    let prev = geo.vert(cx + hw, y, cz, col);
    const first = prev;
    for (let s = 1; s <= S; s++) {
      const ang = (s / S) * Math.PI * 2;
      const cur = s === S ? first : geo.vert(cx + Math.cos(ang) * hw, y, cz + Math.sin(ang) * hw, col);
      geo.i.push(ctr, cur, prev);
      prev = cur;
    }
  }
}

function polygon(geo, flatXZ, y, col) {
  const contour = [];
  for (let i = 0; i < flatXZ.length; i += 2) contour.push(new THREE.Vector2(flatXZ[i], flatXZ[i + 1]));
  let tris = [];
  try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { return; }
  const base = geo.p.length / 3;
  for (const p of contour) geo.vert(p.x, y, p.y, col);
  for (const t of tris) geo.i.push(base + t[0], base + t[1], base + t[2]);
}

export function toXZ(flat) {
  const out = new Array(flat.length);
  for (let i = 0; i < flat.length; i += 2) { out[i] = flat[i] / 10; out[i + 1] = -flat[i + 1] / 10; }
  return out;
}

export function buildGround(streets, areasData) {
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: RAMP.tex });
  const gA = new Geo(), gR = new Geo(), gF = new Geo();
  for (const a of areasData.areas) polygon(gA, toXZ(a.p), a.k === 'agua' ? 0.025 : 0.02, AREA_COLOR[a.k] || 0x9cc27a);
  for (const l of areasData.lines) ribbon(gA, toXZ(l.p), l.k === 'tren' ? 3.0 : 2.5, 0.09, l.k === 'tren' ? 0x6d6258 : 0x6fa8c9, false);
  for (const s of streets) {
    const pts = toXZ(s.p);
    const st = STREET_STYLE(s.t);
    if (s.area && s.p.length >= 6) { polygon(gF, pts, 0.045, st.c); continue; }
    ribbon(ROAD_TYPES.has(s.t) ? gR : gF, pts, s.w, st.y, st.c, !ROAD_TYPES.has(s.t));
  }
  const meshes = [gA.mesh(mat), gR.mesh(mat), gF.mesh(mat)];
  meshes.forEach((m) => { m.userData.kind = 'ground'; m.receiveShadow = false; });
  return meshes;
}

// ------------------------------------------------------------------ colisiones (rejilla de 1 m)
export class CollisionGrid {
  constructor(meta, parts, hOsmMap) {
    const [e0, n0, e1, n1] = meta.bbox_epsg25830;
    const [oe, on] = meta.origin_epsg25830;
    this.minX = Math.floor(e0 - oe); this.minN = Math.floor(n0 - on);
    this.W = Math.ceil(e1 - e0) + 2; this.H = Math.ceil(n1 - n0) + 2;
    this.cells = new Uint8Array(this.W * this.H);
    parts.forEach(([, floors, outer, holes], pi) => {
      if (!floors || floors <= 0) return;
      const hOsm = hOsmMap?.[pi]?.[0];
      this.fill([outer, ...holes], Math.min(255, hOsm ? Math.ceil(hOsm / FLOOR_H) : floors));
    });
  }
  fill(rings, val) {
    // relleno par-impar por filas; coordenadas en decímetros → metros
    let minN = Infinity, maxN = -Infinity;
    for (const r of rings) for (let i = 1; i < r.length; i += 2) { const n = r[i] / 10; if (n < minN) minN = n; if (n > maxN) maxN = n; }
    const r0 = Math.max(0, Math.floor(minN - this.minN)), r1 = Math.min(this.H - 1, Math.ceil(maxN - this.minN));
    const xs = [];
    for (let row = r0; row <= r1; row++) {
      const yc = this.minN + row + 0.5;
      xs.length = 0;
      for (const r of rings) {
        const n = r.length / 2;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const ya = r[2 * i + 1] / 10, yb = r[2 * j + 1] / 10;
          if ((ya <= yc) !== (yb <= yc)) {
            const xa = r[2 * i] / 10, xb = r[2 * j] / 10;
            xs.push(xa + (yc - ya) / (yb - ya) * (xb - xa));
          }
        }
      }
      xs.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const c0 = Math.max(0, Math.round(xs[q] - this.minX)), c1 = Math.min(this.W - 1, Math.round(xs[q + 1] - this.minX) - 1);
        for (let c = c0; c <= c1; c++) { const q = row * this.W + c; if (this.cells[q] < val) this.cells[q] = val; }
      }
    }
  }
  blockedXZ(X, Z) {
    const c = Math.floor(X - this.minX), r = Math.floor(-Z - this.minN);
    if (c < 0 || r < 0 || c >= this.W || r >= this.H) return true;
    return this.cells[r * this.W + c] > 0;
  }
  heightXZ(X, Z) { // altura (m) del edificio en la celda, según plantas del Catastro
    const c = Math.floor(X - this.minX), r = Math.floor(-Z - this.minN);
    if (c < 0 || r < 0 || c >= this.W || r >= this.H) return 0;
    return this.cells[r * this.W + c] * FLOOR_H;
  }
  blockedCircle(X, Z, rad) {
    if (this.blockedXZ(X, Z)) return true;
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      if (this.blockedXZ(X + Math.cos(ang) * rad, Z + Math.sin(ang) * rad)) return true;
    }
    return false;
  }
}

// ------------------------------------------------------------------ grafo peatonal y búsqueda de calles
export class StreetIndex {
  constructor(streets) {
    this.streets = streets;
    this.cell = 40;
    this.map = new Map();
    this.nodes = []; this.adj = []; this.nodeKey = new Map();
    this.nodeGrid = new Map();
    streets.forEach((s, si) => {
      const pts = toXZ(s.p);
      s.xz = pts;
      for (let i = 0; i + 3 < pts.length; i += 2) {
        this._addSeg(si, i, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
        if (s.walk) {
          const a = this._node(s.p[i], s.p[i + 1], pts[i], pts[i + 1]);
          const b = this._node(s.p[i + 2], s.p[i + 3], pts[i + 2], pts[i + 3]);
          if (a !== b) {
            const L = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
            this.adj[a].push(b, L, si); this.adj[b].push(a, L, si);
          }
        }
      }
    });
    this._components();
  }
  _node(xi, yi, X, Z) {
    const key = xi + ',' + yi;
    let id = this.nodeKey.get(key);
    if (id === undefined) {
      id = this.adj.length; this.nodeKey.set(key, id);
      this.nodes.push(X, Z); this.adj.push([]);
      const gk = Math.floor(X / 50) + ',' + Math.floor(Z / 50);
      let arr = this.nodeGrid.get(gk); if (!arr) { arr = []; this.nodeGrid.set(gk, arr); } arr.push(id);
    }
    return id;
  }
  _addSeg(si, i, x0, z0, x1, z1) {
    const c = this.cell;
    const ca = Math.floor(Math.min(x0, x1) / c), cb = Math.floor(Math.max(x0, x1) / c);
    const ra = Math.floor(Math.min(z0, z1) / c), rb = Math.floor(Math.max(z0, z1) / c);
    for (let cx = ca; cx <= cb; cx++) for (let cz = ra; cz <= rb; cz++) {
      const k = cx + ',' + cz;
      let arr = this.map.get(k); if (!arr) { arr = []; this.map.set(k, arr); } arr.push(si, i);
    }
  }
  _components() {
    const n = this.nodes.length / 2;
    this.comp = new Int32Array(n).fill(-1);
    const sizes = [];
    for (let s = 0; s < n; s++) {
      if (this.comp[s] !== -1) continue;
      const id = sizes.length; let size = 0;
      const st = [s]; this.comp[s] = id;
      while (st.length) {
        const u = st.pop(); size++;
        const a = this.adj[u];
        for (let q = 0; q < a.length; q += 3) { const w = a[q]; if (this.comp[w] === -1) { this.comp[w] = id; st.push(w); } }
      }
      sizes.push(size);
    }
    this.mainComp = sizes.indexOf(Math.max(...sizes));
    this.compSizes = sizes;
  }
  nearestSegment(X, Z, maxD = 30, namedOnly = true) {
    const c = this.cell, cx = Math.floor(X / c), cz = Math.floor(Z / c);
    let best = null, bd = maxD;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const arr = this.map.get((cx + dx) + ',' + (cz + dz)); if (!arr) continue;
      for (let q = 0; q < arr.length; q += 2) {
        const s = this.streets[arr[q]]; if (namedOnly && !s.n) continue;
        const i = arr[q + 1], p = s.xz;
        const d = distSeg(X, Z, p[i], p[i + 1], p[i + 2], p[i + 3]);
        if (d.d < bd) { bd = d.d; best = { street: s, d: d.d, x: d.x, z: d.z }; }
      }
    }
    return best;
  }
  nearestNode(X, Z, mainOnly = true) {
    let best = -1, bd = Infinity;
    for (let ring = 0; ring < 6 && best < 0; ring++) {
      const cx = Math.floor(X / 50), cz = Math.floor(Z / 50);
      for (let dx = -ring; dx <= ring; dx++) for (let dz = -ring; dz <= ring; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const arr = this.nodeGrid.get((cx + dx) + ',' + (cz + dz)); if (!arr) continue;
        for (const id of arr) {
          if (mainOnly && this.comp[id] !== this.mainComp) continue;
          const d = Math.hypot(this.nodes[2 * id] - X, this.nodes[2 * id + 1] - Z);
          if (d < bd) { bd = d; best = id; }
        }
      }
      if (best >= 0) {
        // una vuelta más para no quedarnos con un nodo lejano del primer anillo
        const cx2 = Math.floor(X / 50), cz2 = Math.floor(Z / 50);
        for (let dx = -ring - 1; dx <= ring + 1; dx++) for (let dz = -ring - 1; dz <= ring + 1; dz++) {
          const arr = this.nodeGrid.get((cx2 + dx) + ',' + (cz2 + dz)); if (!arr) continue;
          for (const id of arr) {
            if (mainOnly && this.comp[id] !== this.mainComp) continue;
            const d = Math.hypot(this.nodes[2 * id] - X, this.nodes[2 * id + 1] - Z);
            if (d < bd) { bd = d; best = id; }
          }
        }
      }
    }
    return best;
  }
  route(fromX, fromZ, toX_, toZ_) {
    const s = this.nearestNode(fromX, fromZ), t = this.nearestNode(toX_, toZ_);
    if (s < 0 || t < 0) return null;
    const N = this.nodes.length / 2, nd = this.nodes;
    const g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const h = (u) => Math.hypot(nd[2 * u] - nd[2 * t], nd[2 * u + 1] - nd[2 * t + 1]);
    const heap = new MinHeap();
    g[s] = 0; heap.push(h(s), s);
    const closed = new Uint8Array(N);
    while (heap.size) {
      const u = heap.pop();
      if (u === t) break;
      if (closed[u]) continue; closed[u] = 1;
      const a = this.adj[u];
      for (let q = 0; q < a.length; q += 3) {
        const w = a[q], ng = g[u] + a[q + 1];
        if (ng < g[w]) { g[w] = ng; prev[w] = u; heap.push(ng + h(w), w); }
      }
    }
    if (!isFinite(g[t])) return null;
    const path = [];
    for (let u = t; u !== -1; u = prev[u]) path.push(nd[2 * u], nd[2 * u + 1]);
    const pts = [];
    for (let i = path.length - 2; i >= 0; i -= 2) pts.push(path[i], path[i + 1]);
    return { pts, length: g[t], startNode: s, endNode: t };
  }
  randomNeighbor(u, avoid) {
    const a = this.adj[u]; const k = a.length / 3;
    if (!k) return -1;
    if (k === 1) return a[0];
    for (let tries = 0; tries < 4; tries++) { const w = a[3 * Math.floor(Math.random() * k)]; if (w !== avoid) return w; }
    return a[0];
  }
}

function distSeg(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz;
  let t = L2 > 0 ? ((px - x0) * dx + (pz - z0) * dz) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = x0 + t * dx, z = z0 + t * dz;
  return { d: Math.hypot(px - x, pz - z), x, z };
}

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v; const top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0; const n = k.length;
      while (true) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

// ------------------------------------------------------------------ mapa 2D base (1 px = 2 m)
export function renderBaseMap(meta, bdata, streets, areasData) {
  const [e0, n0, e1, n1] = meta.bbox_epsg25830;
  const [oe, on] = meta.origin_epsg25830;
  const S = 0.5; // px por metro
  const W = Math.ceil((e1 - e0) * S), H = Math.ceil((n1 - n0) * S);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const minX = e0 - oe, maxN = n1 - on;
  const px = (xdm) => (xdm / 10 - minX) * S;
  const py = (ydm) => (maxN - ydm / 10) * S;
  ctx.fillStyle = '#e8e2d6'; ctx.fillRect(0, 0, W, H);
  const colors = { parque: '#a9c98a', pista: '#8fbb77', estadio: '#9fc27f', juegos: '#dccaa2', cesped: '#b3d39a', agua: '#8fbfd9' };
  for (const a of areasData.areas) {
    ctx.fillStyle = colors[a.k] || '#b3d39a'; ctx.beginPath();
    for (let i = 0; i < a.p.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, px(a.p[i]), py(a.p[i + 1]));
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#c9bfae';
  for (const [, floors, outer] of bdata.parts) {
    if (!floors) continue;
    ctx.beginPath();
    for (let i = 0; i < outer.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, px(outer[i]), py(outer[i + 1]));
    ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of streets) {
    if (s.area) continue;
    const road = !['footway', 'path', 'steps', 'cycleway', 'track', 'corridor'].includes(s.t);
    ctx.strokeStyle = road ? '#ffffff' : '#f4efe4';
    ctx.lineWidth = Math.max(1, s.w * S * (road ? 1 : 0.8));
    ctx.beginPath();
    for (let i = 0; i < s.p.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, px(s.p[i]), py(s.p[i + 1]));
    ctx.stroke();
  }
  return { canvas: cv, S, minX, maxN, W, H };
}
