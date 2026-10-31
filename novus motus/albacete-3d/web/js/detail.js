// Mobiliario urbano real de OpenStreetMap en su posición: árboles, farolas, bancos, pasos de peatones, semáforos,
// paradas, fuentes, papeleras y aparcabicis. Tamaños genéricos declarados (OSM casi nunca trae altura).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hashStr } from './world.js';
import { RAMP } from './render.js';

const ROADS = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'service',
  'trunk', 'primary_link', 'secondary_link', 'tertiary_link']);

function roadDir(index, X, Z, maxD = 10) {
  const seg = index.nearestSegment(X, Z, maxD, false);
  if (!seg) return null;
  const s = seg.street, p = s.xz;
  // dirección del tramo más cercano
  let best = null, bd = Infinity;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const mx = (p[i] + p[i + 2]) / 2, mz = (p[i + 1] + p[i + 3]) / 2, d = Math.hypot(mx - seg.x, mz - seg.z);
    if (d < bd) { bd = d; best = i; }
  }
  const dx = p[best + 2] - p[best], dz = p[best + 3] - p[best + 1], L = Math.hypot(dx, dz) || 1;
  return { dx: dx / L, dz: dz / L, street: s, x: seg.x, z: seg.z };
}

function instanced(geo, mat, pts, place) {
  const n = pts.length / 2;
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  const d = new THREE.Object3D(), c = new THREE.Color();
  let k = 0;
  for (let i = 0; i < n; i++) {
    const X = pts[2 * i] / 10, Z = -pts[2 * i + 1] / 10;
    d.position.set(X, 0, Z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
    const col = place ? place(d, X, Z, i, c) : null;
    if (col === false) continue;
    d.updateMatrix(); m.setMatrixAt(k, d.matrix);
    if (col) m.setColorAt(k, col);
    k++;
  }
  m.count = k; m.computeBoundingSphere();
  return m;
}

export function buildFurniture(mob, index) {
  const group = new THREE.Group(), zebraGroup = new THREE.Group();
  const flat = (c, extra = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: RAMP.tex, ...extra });
  const greens = [0x4f7a3a, 0x5b8a40, 0x456e34, 0x6a9146, 0x3f6a33];

  // árboles de hoja ancha: copa poligonal + tronco (tamaño variable ±15 %, determinista por posición)
  const canopy = new THREE.IcosahedronGeometry(2.3, 0); canopy.scale(1, 0.85, 1); canopy.translate(0, 5.0, 0);
  const trunk = new THREE.CylinderGeometry(0.16, 0.24, 3.4, 5); trunk.translate(0, 1.7, 0);
  const sizeOf = (i, X, Z) => 0.85 + (hashStr(`${X.toFixed(1)},${Z.toFixed(1)}`) % 300) / 1000;
  group.add(instanced(canopy, flat(0xffffff), mob.arbol_frondoso, (d, X, Z, i, c) => { const s = sizeOf(i, X, Z); d.scale.set(s, s, s); d.rotation.y = (i % 7) * 0.9; return c.setHex(greens[i % greens.length]); }));
  group.add(instanced(trunk, flat(0x5a4230), mob.arbol_frondoso, (d, X, Z, i) => { const s = sizeOf(i, X, Z); d.scale.set(s, s, s); }));
  const cone = new THREE.ConeGeometry(1.7, 6.5, 7); cone.translate(0, 4.6, 0);
  group.add(instanced(cone, flat(0x2f5a36), mob.arbol_conifera, (d, X, Z, i) => { const s = sizeOf(i, X, Z); d.scale.set(s, s, s); }));
  group.add(instanced(trunk, flat(0x4a3526), mob.arbol_conifera));

  // farolas: báculo + luminaria (la luminaria se enciende de noche)
  const pole = new THREE.CylinderGeometry(0.06, 0.09, 5.2, 5); pole.translate(0, 2.6, 0);
  const arm = new THREE.BoxGeometry(0.9, 0.08, 0.08); arm.translate(0.4, 5.1, 0);
  const lampGeo = mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed()]);
  const lampHead = new THREE.BoxGeometry(0.45, 0.18, 0.28); lampHead.translate(0.85, 5.0, 0);
  const headMat = flat(0xdedbd0, { emissive: 0x000000 });
  const orient = (d, X, Z) => { const r = roadDir(index, X, Z, 14); if (r) d.rotation.y = Math.atan2(-(r.z - Z), r.x - X); }; // brazo (+x local) hacia la calzada
  group.add(instanced(lampGeo, flat(0x3b3f44), mob.farola, orient));
  group.add(instanced(lampHead, headMat, mob.farola, orient));

  // bancos, paralelos a la calle más cercana
  const bench = mergeGeometries([new THREE.BoxGeometry(1.8, 0.08, 0.45).translate(0, 0.45, 0).toNonIndexed(),
    new THREE.BoxGeometry(1.8, 0.4, 0.07).translate(0, 0.72, -0.2).toNonIndexed(),
    new THREE.BoxGeometry(0.08, 0.45, 0.4).translate(-0.8, 0.22, 0).toNonIndexed(),
    new THREE.BoxGeometry(0.08, 0.45, 0.4).translate(0.8, 0.22, 0).toNonIndexed()]);
  group.add(instanced(bench, flat(0x7a5a3a), mob.banco, (d, X, Z) => { const r = roadDir(index, X, Z, 20); if (r) d.rotation.y = Math.atan2(r.dx, r.dz) + Math.PI / 2; }));

  // semáforos, paradas, fuentes, papeleras, aparcabicis
  const sem = mergeGeometries([new THREE.CylinderGeometry(0.06, 0.06, 3.2, 5).translate(0, 1.6, 0).toNonIndexed(),
    new THREE.BoxGeometry(0.28, 0.85, 0.25).translate(0, 3.1, 0).toNonIndexed()]);
  group.add(instanced(sem, flat(0x2b2b2b), mob.semaforo));
  const bus = mergeGeometries([new THREE.CylinderGeometry(0.05, 0.05, 2.6, 5).translate(0, 1.3, 0).toNonIndexed(),
    new THREE.BoxGeometry(0.5, 0.5, 0.05).translate(0, 2.55, 0).toNonIndexed()]);
  group.add(instanced(bus, flat(0x1f5c9e), mob.parada_bus));
  group.add(instanced(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8).translate(0, 0.45, 0), flat(0x8a9aa6), mob.fuente));
  group.add(instanced(new THREE.CylinderGeometry(0.2, 0.18, 0.8, 6).translate(0, 0.4, 0), flat(0x3d5a3a), mob.papelera));
  group.add(instanced(new THREE.TorusGeometry(0.35, 0.03, 4, 8, Math.PI).translate(0, 0.05, 0), flat(0x9aa0a6), mob.bicis));

  // pasos de peatones: franjas blancas orientadas con la calle (solo en el plano; en la ortofoto se ven los reales)
  const stripe = new THREE.PlaneGeometry(0.5, 2.8); stripe.rotateX(-Math.PI / 2); stripe.translate(0, 0.1, 0);
  const zebraPts = [], zebraRot = [];
  const addZebra = (X, Z, ux, uz, width) => { // u: dirección de cruce (perpendicular al tráfico)
    const nStripes = Math.max(3, Math.round(width / 1.0));
    for (let s2 = 0; s2 < nStripes; s2++) {
      const t = (s2 - (nStripes - 1) / 2) * 1.0;
      zebraPts.push(X + ux * t, Z + uz * t); zebraRot.push(Math.atan2(ux, uz) + Math.PI / 2);
    }
  };
  const viaPts = new Map();
  for (let i = 0; i + 3 < mob.paso_via.length; i += 4) {
    const x0 = mob.paso_via[i] / 10, z0 = -mob.paso_via[i + 1] / 10, x1 = mob.paso_via[i + 2] / 10, z1 = -mob.paso_via[i + 3] / 10;
    const L = Math.hypot(x1 - x0, z1 - z0); if (L < 2 || L > 40) continue;
    addZebra((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / L, (z1 - z0) / L, L);
    viaPts.set(`${Math.round((x0 + x1) / 10)},${Math.round((z0 + z1) / 10)}`, 1);
  }
  for (let i = 0; i + 1 < mob.paso.length; i += 2) {
    const X = mob.paso[i] / 10, Z = -mob.paso[i + 1] / 10;
    if (viaPts.has(`${Math.round(X / 5)},${Math.round(Z / 5)}`)) continue; // ya dibujado por su vía
    const r = roadDir(index, X, Z, 6);
    if (!r || !ROADS.has(r.street.t)) continue;
    addZebra(X, Z, -r.dz, r.dx, r.street.w);
  }
  const zm = new THREE.InstancedMesh(stripe, new THREE.MeshBasicMaterial({ color: 0xf2f2ee }), Math.max(1, zebraPts.length / 2));
  const d = new THREE.Object3D();
  for (let k = 0; k < zebraPts.length / 2; k++) {
    d.position.set(zebraPts[2 * k], 0, zebraPts[2 * k + 1]); d.rotation.set(0, zebraRot[k], 0); d.updateMatrix(); zm.setMatrixAt(k, d.matrix);
  }
  zm.count = zebraPts.length / 2; zm.computeBoundingSphere();
  zebraGroup.add(zm);

  return { group, zebraGroup, headMat };
}
