// Personajes de tebeo dibujados por código, en homenaje al lenguaje gráfico de Francisco Ibáñez y la escuela
// Bruguera: cabeza grande y adelantada, narizota, ojos de punto bajo cejas gordas, piernas finas con rodillas
// flexionadas, zapatones y manos grandes, ropa con arrugas de tinta. Son tipos costumbristas genéricos: ninguno
// reproduce a un personaje existente, y se excluyen a propósito los rasgos que definen a los más conocidos
// (calvo con gafas y levita negra; dos pelos con camisa blanca y pantalón rojo; barba enorme con bata de
// laboratorio; señora gruesa de rojo; hombrecillo diminuto con gafas de culo de vaso; pintores con gorro y brocha).
import * as THREE from 'three';

const W = 96, H = 168, GROUND = 162, INK = '#18120e';

// ------------------------------------------------------------------ tipos
const PALETA = {
  piel: ['#f7d2b0', '#f0c29c', '#e2ab85', '#c98e66', '#a8704c', '#7d5236'],
  pelo: ['#2a1d16', '#4a3222', '#7a4a24', '#b67c3a', '#d9b76c', '#1b1b1b'],
  canas: ['#9a9a9a', '#cfcac2', '#e9e5de'],
  tela: ['#2f6db3', '#2f8f4e', '#f0b92e', '#7b4fa0', '#ef7f2c', '#4d9aa6', '#8a5a3a', '#1f4f7a', '#6b7a3a', '#c75c8a', '#e9e4d4', '#3b3b3b'],
  pantalon: ['#2d3b5a', '#3a3a3a', '#6b5238', '#4b6b3a', '#1f2a44', '#8a7a5a', '#556070'],
  zapato: ['#1b120d', '#4a2e1c', '#2b2b2b', '#6b3a22'],
};
const TIPOS = ['senorBoina', 'senoraMono', 'abueloBaston', 'oficinista', 'chaval', 'chica', 'vecinaBata', 'deportista', 'senorSombrero', 'abuela'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];

export function makeTipos(n, seed = 1936) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const tipo = TIPOS[i % TIPOS.length];
    const v = { tipo, piel: pick(r, PALETA.piel), pelo: pick(r, PALETA.pelo), ropa: pick(r, PALETA.tela), ropa2: pick(r, PALETA.tela),
      pantalon: pick(r, PALETA.pantalon), zapato: pick(r, PALETA.zapato), nariz: pick(r, ['patata', 'porra', 'gancho']),
      gafas: false, bigote: false, barriga: false, flaco: false, alto: 1, nino: false };
    switch (tipo) {
      case 'senorBoina': Object.assign(v, { barriga: true, bigote: r() < 0.6, boina: pick(r, ['#1c1c24', '#3a2a22', '#2a3a5a']), alto: 0.95 }); break;
      case 'senoraMono': Object.assign(v, { vestido: true, mono: true, bolso: pick(r, PALETA.tela), gafas: r() < 0.35, alto: 0.93 }); break;
      case 'abueloBaston': Object.assign(v, { flaco: true, pelo: pick(r, PALETA.canas), gorraPlana: pick(r, ['#5a4a3a', '#3a3a3a', '#6b6b5a']), baston: true, encorvado: true, bigote: r() < 0.5, alto: 0.92 }); break;
      case 'oficinista': Object.assign(v, { flaco: true, corbata: pick(r, ['#b3122e', '#1f4f7a', '#2f8f4e']), ropa: pick(r, ['#bcd4ea', '#e9e4d4', '#d8e2c8']), maletin: true, raya: true, alto: 1.06 }); break;
      case 'chaval': Object.assign(v, { nino: true, gorra: pick(r, ['#d6332b', '#2f6db3', '#f0b92e']), corto: true, pecas: r() < 0.6, alto: 0.7 }); break;
      case 'chica': Object.assign(v, { coleta: true, mochila: pick(r, PALETA.tela), alto: 0.96, zapato: '#f2f2f2' }); break;
      case 'vecinaBata': Object.assign(v, { bata: true, rulos: true, cesta: true, zapato: pick(r, ['#c75c8a', '#6b8ec9']), barriga: r() < 0.5, alto: 0.9 }); break;
      case 'deportista': Object.assign(v, { chandal: true, cinta: pick(r, ['#f2f2f2', '#d6332b']), flaco: true, zapato: '#f2f2f2', alto: 1.02 }); break;
      case 'senorSombrero': Object.assign(v, { sombrero: pick(r, ['#5a4632', '#3a3a3a', '#6b6b5a']), bigote: true, corbata: pick(r, ['#b3122e', '#1f4f7a']), barriga: r() < 0.5, alto: 1.0 }); break;
      case 'abuela': Object.assign(v, { vestido: true, pelo: pick(r, PALETA.canas), permanente: true, gafas: r() < 0.5, bolso: '#2b2b2b', encorvado: true, alto: 0.86 }); break;
      default: break;
    }
    if (v.vestido && v.barriga && ['#d6332b', '#c75c8a'].includes(v.ropa)) v.ropa = '#2f6db3'; // evitar la señora gruesa de rojo
    out.push(v);
  }
  return out;
}
// el avatar: tipo genérico, camiseta blanca y pantalón oscuro
export const AVATAR = { tipo: 'avatar', piel: '#efc19b', pelo: '#2a1d16', ropa: '#f4f4f4', pantalon: '#22262e', zapato: '#1b120d', nariz: 'patata', alto: 1, tupe: true };

// ------------------------------------------------------------------ utilidades de dibujo
function darken(c, f = 0.78) { const n = parseInt(c.slice(1), 16); return `rgb(${((n >> 16) & 255) * f | 0},${((n >> 8) & 255) * f | 0},${(n & 255) * f | 0})`; }
function tube(ctx, pts, w, color) { // «tubo» entintado: trazo negro y color encima
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = INK; ctx.lineWidth = w + 5; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
function blob(ctx, fill, path, lw = 2.6) { ctx.beginPath(); path(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
const E = (ctx, x, y, rx, ry, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

// zapatón: patata alargada con suela; sentido (+1 derecha, -1 izquierda), ángulo de la punta
function zapato(ctx, x, y, dir, color, ang = 0, largo = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(dir, 1);
  blob(ctx, color, () => { ctx.moveTo(-7, -9); ctx.quadraticCurveTo(-9, 1, -5, 3); ctx.lineTo(18 * largo, 3); ctx.quadraticCurveTo(26 * largo, 2, 23 * largo, -6); ctx.quadraticCurveTo(15 * largo, -13, 2, -10); ctx.closePath(); });
  ctx.beginPath(); ctx.moveTo(-5, 1); ctx.lineTo(20 * largo, 1); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); // suela
  ctx.beginPath(); ctx.ellipse(12 * largo, -6, 5, 2, -0.2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(); // brillo
  ctx.restore();
}
function mano(ctx, x, y, piel, s = 1) { blob(ctx, piel, E(ctx, x, y, 5.5 * s, 5 * s)); ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 1); ctx.lineTo(x + 1.5 * s, y + 2.5 * s); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); }

// ------------------------------------------------------------------ figura completa
// dir: 0 de frente (tres cuartos), 1 de espaldas, 2 de perfil (mirando a la derecha); frame: 0..3 ciclo de paso
function dibujar(ctx, ox, oy, v, dir, frame) {
  ctx.save(); ctx.translate(ox, oy);
  ctx.beginPath(); ctx.rect(1, 1, W - 2, H - 2); ctx.clip(); // cada viñeta en su celda
  const k = v.alto * (v.nino ? 1 : 1);
  const paso = [1, 0, -1, 0][frame];           // pierna adelantada
  const sube = frame % 2 === 1 ? -3 : 0;        // en el paso de apoyo el cuerpo sube
  const incl = v.encorvado ? 0.16 : 0.07;       // inclinación hacia delante al andar
  const cabezaR = v.nino ? 26 : 24;             // cabezón
  const hipY = GROUND - (v.nino ? 40 : 54) * k + sube;
  const hombroY = hipY - (v.nino ? 30 : 38) * k;
  const cx = dir === 2 ? 40 : 48; // de perfil, algo a la izquierda para que quepa la narizota
  const ancho = v.barriga ? 22 : v.flaco ? 11 : 15;
  const lado = dir === 2;

  // ---------- piernas y zapatones
  const pierna = (sgn, delante) => {
    // sgn: +1 pierna adelantada en perfil / derecha en frente
    const col = v.corto ? v.piel : v.chandal ? v.ropa : v.pantalon;
    if (lado) {
      const a = paso * sgn * 0.45;
      const hx = cx - 2, kx = hx + Math.sin(a) * 26 * k + (a > 0 ? 4 : -2), ky = hipY + 26 * k;
      const ax = hx + Math.sin(a) * 50 * k, ay = GROUND - 8 - (a < 0 && frame % 2 === 0 ? 4 : 0);
      tube(ctx, [[hx, hipY], [kx + 3, ky], [ax, ay]], v.corto ? 7 : v.flaco ? 8 : 11, delante ? col : darken(col));
      if (v.corto) tube(ctx, [[hx, hipY], [hx + Math.sin(a) * 14, hipY + 14]], 13, v.pantalon);
      zapato(ctx, ax - 2, GROUND - 4, 1, v.zapato, a < 0 ? 0.25 : -0.12, v.nino ? 0.95 : 1.25);
    } else {
      const lift = paso === sgn ? 7 : 0;
      const hx = cx + sgn * 7, fx = cx + sgn * 12;
      tube(ctx, [[hx, hipY], [hx + sgn * 7, hipY + 24 * k - lift / 2], [fx, GROUND - 9 - lift]], v.corto ? 7 : v.flaco ? 8 : 11, col);
      if (v.corto) tube(ctx, [[hx, hipY], [hx + sgn * 2, hipY + 14]], 13, v.pantalon);
      if (dir === 1) blob(ctx, v.zapato, E(ctx, fx, GROUND - 5 - lift, 9, 6)); // talones
      else zapato(ctx, fx - sgn * 4, GROUND - 3 - lift, sgn, v.zapato, sgn * 0.35, v.nino ? 0.85 : 1.05);
    }
  };
  if (lado) { pierna(-1, false); } else { pierna(-1, true); pierna(1, true); }
  if (v.vestido || v.bata) { // falda / bata sobre las piernas
    blob(ctx, v.ropa, () => { ctx.moveTo(cx - ancho + 2, hipY - 10); ctx.quadraticCurveTo(cx - ancho - 6, hipY + 18, cx - ancho - 3, hipY + 24); ctx.lineTo(cx + ancho + 3, hipY + 24); ctx.quadraticCurveTo(cx + ancho + 6, hipY + 18, cx + ancho - 2, hipY - 10); ctx.closePath(); });
    if (v.bata) for (let q = -2; q <= 2; q++) { ctx.beginPath(); ctx.moveTo(cx + q * 7, hipY - 8); ctx.lineTo(cx + q * 8, hipY + 22); ctx.lineWidth = 1.2; ctx.strokeStyle = darken(v.ropa, 0.7); ctx.stroke(); }
  }
  if (lado) pierna(1, true);

  // ---------- tronco (pera o larguirucho), inclinado hacia delante en perfil
  ctx.save();
  if (lado) { ctx.translate(cx, hipY); ctx.rotate(incl); ctx.translate(-cx, -hipY); }
  const topCol = v.chandal ? v.ropa : v.bata ? v.ropa : v.ropa;
  blob(ctx, topCol, () => {
    ctx.moveTo(cx - ancho * 0.7, hombroY);
    ctx.quadraticCurveTo(cx - ancho - (v.barriga ? 8 : 2), hipY - 16, cx - ancho + 1, hipY + 2);
    ctx.lineTo(cx + ancho - 1, hipY + 2);
    ctx.quadraticCurveTo(cx + ancho + (v.barriga ? (lado ? 14 : 8) : 2), hipY - 16, cx + ancho * 0.7, hombroY);
    ctx.quadraticCurveTo(cx, hombroY - 5, cx - ancho * 0.7, hombroY);
  });
  // arrugas de tinta y detalles de ropa
  ctx.lineWidth = 1.6; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(cx - ancho + 4, hipY - 8); ctx.quadraticCurveTo(cx - ancho + 8, hipY - 14, cx - ancho + 12, hipY - 9); ctx.stroke();
  if (!v.vestido && !v.bata && !v.chandal && dir !== 1) { ctx.beginPath(); ctx.moveTo(cx - ancho + 1, hipY - 3); ctx.lineTo(cx + ancho - 1, hipY - 3); ctx.lineWidth = 3; ctx.strokeStyle = darken(v.pantalon, 0.6); ctx.stroke(); }
  if (v.corbata && dir === 0) blob(ctx, v.corbata, () => { ctx.moveTo(cx - 2, hombroY + 2); ctx.lineTo(cx + 2, hombroY + 2); ctx.lineTo(cx + 4, hombroY + 26); ctx.lineTo(cx, hombroY + 31); ctx.lineTo(cx - 4, hombroY + 26); ctx.closePath(); }, 1.8);
  if (v.bata && dir === 0) for (const [bx, by] of [[cx, hombroY + 12], [cx, hombroY + 24]]) blob(ctx, '#f2f2f2', E(ctx, bx, by, 2, 2), 1.2);
  if (v.chandal) { ctx.beginPath(); ctx.moveTo(cx - ancho + 2, hombroY + 6); ctx.lineTo(cx - ancho + 3, hipY); ctx.moveTo(cx + ancho - 2, hombroY + 6); ctx.lineTo(cx + ancho - 3, hipY); ctx.lineWidth = 3; ctx.strokeStyle = '#f2f2f2'; ctx.stroke(); }
  if (v.mochila && dir !== 0) blob(ctx, v.mochila, () => ctx.roundRect(lado ? cx - ancho - 10 : cx - 12, hombroY + 6, lado ? 10 : 24, 24, 4));

  // ---------- brazos que se balancean
  const brazo = (sgn, detras) => {
    const sw = (lado ? paso * sgn : -paso * sgn) * 0.6;
    const sx = lado ? cx + 2 : cx + sgn * (ancho * 0.75), sy = hombroY + 4;
    const ex = sx + (lado ? Math.sin(sw) * 16 : sgn * 6), ey = sy + 17;
    const hx = ex + (lado ? Math.sin(sw) * 16 + 3 : sgn * 3), hy = ey + 15;
    tube(ctx, [[sx, sy], [ex, ey], [hx, hy]], 7, detras ? darken(topCol) : topCol);
    mano(ctx, hx, hy + 3, v.piel);
    return [hx, hy + 3];
  };
  let manoDelante;
  if (lado) { brazo(-1, true); } else { brazo(-1, false); manoDelante = brazo(1, false); }
  ctx.restore();
  if (lado) {
    ctx.save(); ctx.translate(cx, hipY); ctx.rotate(incl); ctx.translate(-cx, -hipY);
    manoDelante = brazo(1, false); ctx.restore();
  }
  // objetos en la mano
  if (manoDelante) {
    const [hx, hy] = manoDelante;
    if (v.baston) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (lado ? 8 : 4), GROUND - 1); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a5a2a'; ctx.stroke(); }
    if (v.maletin) blob(ctx, '#5a3a22', () => ctx.roundRect(hx - 9, hy + 2, 18, 13, 2));
    if (v.cesta) { blob(ctx, '#c9a15a', () => { ctx.moveTo(hx - 11, hy + 6); ctx.lineTo(hx + 11, hy + 6); ctx.lineTo(hx + 8, hy + 18); ctx.lineTo(hx - 8, hy + 18); ctx.closePath(); }); ctx.beginPath(); ctx.arc(hx, hy + 6, 9, Math.PI, 0); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); blob(ctx, '#2f8f4e', E(ctx, hx + 4, hy + 4, 3, 5, 0.4), 1.5); }
    if (v.bolso) blob(ctx, v.bolso, () => ctx.roundRect(hx - 7, hy + 3, 14, 11, 3));
  }

  // ---------- cabeza grande, adelantada, con narizota
  const hx0 = cx + (lado ? 10 + (v.encorvado ? 6 : 0) : 2), hy0 = hombroY - cabezaR + 4;
  const cuello = () => tube(ctx, [[cx + (lado ? 5 : 0), hombroY + 2], [hx0 - (lado ? 3 : 0), hombroY - 4]], 7, v.piel);
  cuello();
  if (dir === 1) {
    // de espaldas: nuca, pelo, orejas
    blob(ctx, v.piel, E(ctx, hx0, hy0, cabezaR * 0.95, cabezaR));
    blob(ctx, v.piel, E(ctx, hx0 - cabezaR + 1, hy0 + 3, 4, 6)); blob(ctx, v.piel, E(ctx, hx0 + cabezaR - 1, hy0 + 3, 4, 6));
    peloDe(ctx, v, hx0, hy0, cabezaR, 1);
    ctx.restore(); return;
  }
  // oreja
  blob(ctx, v.piel, E(ctx, lado ? hx0 - cabezaR * 0.45 : hx0 - cabezaR + 1, hy0 + 3, 5, 7));
  // cráneo en forma de huevo (frente amplia)
  blob(ctx, v.piel, () => { ctx.ellipse(hx0, hy0, cabezaR * (lado ? 0.92 : 0.95), cabezaR * 1.05, lado ? 0.12 : 0, 0, Math.PI * 2); });
  if (!lado) blob(ctx, v.piel, E(ctx, hx0 + cabezaR - 2, hy0 + 3, 4, 6));
  if (v.pecas) { ctx.fillStyle = '#b5652f'; for (const [a, b] of [[-8, 8], [-5, 10], [-10, 11], [8, 9], [11, 11]]) { ctx.beginPath(); ctx.arc(hx0 + a + (lado ? 8 : 0), hy0 + b, 0.9, 0, 7); ctx.fill(); } }
  peloDe(ctx, v, hx0, hy0, cabezaR, lado ? 2 : 0);
  // ojos juntos, de punto, bajo cejas gordas
  const ex = lado ? hx0 + cabezaR * 0.5 : hx0 + 3, ey = hy0 - 1;
  ctx.fillStyle = INK;
  if (lado) { blob(ctx, '#ffffff', E(ctx, ex, ey, 3.8, 5.2), 1.6); ctx.beginPath(); ctx.arc(ex + 1.2, ey + 0.8, 2, 0, 7); ctx.fill(); }
  else for (const d of [-4.5, 4.5]) { blob(ctx, '#ffffff', E(ctx, ex + d, ey, 4.2, 5.6), 1.6); ctx.beginPath(); ctx.arc(ex + d + 1.2, ey + 1.2, 2.1, 0, 7); ctx.fill(); }
  ctx.lineWidth = 3.2; ctx.strokeStyle = v.pelo && !['#cfcac2', '#e9e5de'].includes(v.pelo) ? INK : '#6b6b6b';
  ctx.beginPath(); if (lado) { ctx.moveTo(ex - 5, ey - 7); ctx.lineTo(ex + 3, ey - 8); } else { ctx.moveTo(ex - 10, ey - 7); ctx.lineTo(ex - 2, ey - 8); ctx.moveTo(ex + 2, ey - 8); ctx.lineTo(ex + 10, ey - 7); } ctx.stroke();
  if (v.gafas) { ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.beginPath(); if (lado) ctx.arc(ex, ey, 5.5, 0, 7); else { ctx.arc(ex - 5.5, ey, 5.5, 0, 7); ctx.moveTo(ex + 11, ey); ctx.arc(ex + 5.5, ey, 5.5, 0, 7); } ctx.stroke(); }
  // narizota (patata, porra o gancho), la gran seña del estilo
  const nx = lado ? hx0 + cabezaR * 0.85 : hx0 + 4, ny = hy0 + 9;
  const narizCol = darken(v.piel, 0.97);
  if (v.nariz === 'gancho' && lado) blob(ctx, narizCol, () => { ctx.moveTo(nx - 7, ny - 12); ctx.quadraticCurveTo(nx + 24, ny - 9, nx + 16, ny + 11); ctx.quadraticCurveTo(nx + 3, ny + 13, nx - 5, ny + 6); ctx.closePath(); });
  else if (v.nariz === 'porra') blob(ctx, narizCol, E(ctx, nx + (lado ? 11 : 1), ny + 3, lado ? 14 : 11, 11.5));
  else blob(ctx, narizCol, E(ctx, nx + (lado ? 10 : 1), ny + 2, lado ? 16 : 12, 10.5, lado ? -0.25 : 0));
  ctx.beginPath(); ctx.arc(nx + (lado ? 3 : -3), ny + 4, 1.4, 0, 7); ctx.fillStyle = INK; ctx.fill();
  // bigote y boca (abierta, con dientes: los personajes siempre están hablando)
  const mx = lado ? hx0 + cabezaR * 0.5 : hx0 + 3, my = hy0 + 20;
  if (v.bigote) blob(ctx, ['#cfcac2', '#e9e5de', '#9a9a9a'].includes(v.pelo) ? '#d8d4cc' : v.pelo, () => { ctx.ellipse(mx + (lado ? 4 : 0), my - 3, lado ? 8 : 11, 3.6, 0, 0, Math.PI * 2); });
  blob(ctx, '#7a1d1d', () => { ctx.moveTo(mx - (lado ? 2 : 7), my); ctx.quadraticCurveTo(mx + (lado ? 3 : 0), my + 9, mx + (lado ? 8 : 7), my); ctx.closePath(); }, 2);
  ctx.beginPath(); ctx.rect(mx - (lado ? 1 : 5), my, lado ? 7 : 10, 2.2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
}

// pelo, gorras y sombreros por tipo (vista: 0 frente, 1 espalda, 2 perfil)
function peloDe(ctx, v, x, y, r, vista) {
  const lado = vista === 2, esp = vista === 1;
  if (v.boina) { blob(ctx, v.boina, () => { ctx.ellipse(x - (lado ? 2 : 0), y - r * 0.72, r * 1.02, r * 0.42, lado ? -0.15 : 0, 0, Math.PI * 2); }); ctx.beginPath(); ctx.moveTo(x, y - r * 1.12); ctx.lineTo(x + 1, y - r * 1.25); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); peloLados(ctx, v, x, y, r, vista); return; }
  if (v.sombrero) { blob(ctx, v.sombrero, () => ctx.ellipse(x, y - r * 0.62, r * 1.35, r * 0.2, 0, 0, Math.PI * 2)); blob(ctx, v.sombrero, () => { ctx.moveTo(x - r * 0.75, y - r * 0.64); ctx.lineTo(x - r * 0.62, y - r * 1.35); ctx.quadraticCurveTo(x, y - r * 1.5, x + r * 0.62, y - r * 1.35); ctx.lineTo(x + r * 0.75, y - r * 0.64); ctx.closePath(); }); ctx.fillStyle = INK; ctx.fillRect(x - r * 0.72, y - r * 0.82, r * 1.44, 3); return; }
  if (v.gorraPlana) { blob(ctx, v.gorraPlana, () => { ctx.ellipse(x + (lado ? 5 : 0), y - r * 0.7, r * 1.0, r * 0.38, lado ? 0.1 : 0, 0, Math.PI * 2); }); if (!esp) blob(ctx, darken(v.gorraPlana), () => ctx.ellipse(x + (lado ? r * 0.8 : 0), y - r * 0.5, lado ? r * 0.5 : r * 0.9, r * 0.14, 0, 0, Math.PI * 2)); peloLados(ctx, v, x, y, r, vista); return; }
  if (v.gorra) { blob(ctx, v.gorra, () => { ctx.ellipse(x, y - r * 0.55, r * 0.98, r * 0.62, 0, Math.PI, Math.PI * 2); ctx.closePath(); }); if (!esp) blob(ctx, v.gorra, () => ctx.ellipse(x + (lado ? r * 0.9 : 0), y - r * 0.52, lado ? r * 0.55 : r * 0.7, r * 0.14, 0, 0, Math.PI * 2)); peloLados(ctx, v, x, y, r, vista); return; }
  if (v.rulos) { blob(ctx, v.pelo, () => { ctx.ellipse(x, y - r * 0.45, r * 1.02, r * 0.72, 0, Math.PI, Math.PI * 2); ctx.closePath(); }); for (let q = -2; q <= 2; q++) blob(ctx, ['#f0b92e', '#c75c8a', '#6b8ec9'][(q + 3) % 3], () => ctx.roundRect(x + q * r * 0.36 - 4, y - r * 0.95 + Math.abs(q) * 3, 8, 11, 3), 1.8); return; }
  if (v.mono) { blob(ctx, v.pelo, () => { ctx.ellipse(x, y - r * 0.4, r * 1.06, r * 0.82, 0, Math.PI, Math.PI * 2); ctx.closePath(); }); blob(ctx, v.pelo, E(ctx, x - (lado ? r * 0.6 : 0), y - r * 1.12, r * 0.52, r * 0.42)); return; }
  if (v.permanente) { for (let q = 0; q < 9; q++) { const a = Math.PI + (q / 8) * Math.PI; blob(ctx, v.pelo, E(ctx, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.85 - 2, r * 0.32, r * 0.32), 2); } return; }
  if (v.coleta) { blob(ctx, v.pelo, () => { ctx.ellipse(x, y - r * 0.4, r * 1.03, r * 0.8, 0, Math.PI, Math.PI * 2); ctx.closePath(); }); blob(ctx, v.pelo, () => { ctx.moveTo(x - (lado ? r : 0), y - r * 0.6); ctx.quadraticCurveTo(x - r * (lado ? 1.8 : 0.2), y - r * 0.2, x - r * (lado ? 1.5 : 0.1), y + r * (esp ? 0.9 : 0.4)); ctx.quadraticCurveTo(x - r * (lado ? 1.1 : -0.2), y - r * 0.2, x - (lado ? r * 0.8 : -r * 0.2), y - r * 0.5); ctx.closePath(); }); return; }
  if (v.cinta) { blob(ctx, v.pelo, () => { ctx.ellipse(x, y - r * 0.5, r, r * 0.68, 0, Math.PI, Math.PI * 2); ctx.closePath(); }); blob(ctx, v.cinta, () => ctx.rect(x - r * 0.98, y - r * 0.62, r * 1.96, 6), 1.8); return; }
  if (v.raya || v.tupe) { // pelo peinado con raya o tupé: mechones de tinta
    blob(ctx, v.pelo, () => { ctx.ellipse(x - (lado ? 3 : 0), y - r * 0.5, r * 1.0, r * 0.66, 0, Math.PI, Math.PI * 2); ctx.closePath(); });
    if (v.tupe) blob(ctx, v.pelo, () => { ctx.ellipse(x + (lado ? 5 : 3), y - r * 1.0, r * 0.6, r * 0.3, -0.3, 0, Math.PI * 2); });
    ctx.lineWidth = 1.4; ctx.strokeStyle = INK; for (let q = -2; q <= 2; q++) { ctx.beginPath(); ctx.moveTo(x + q * 5, y - r * 0.95); ctx.quadraticCurveTo(x + q * 6 + 3, y - r * 0.7, x + q * 6 + 5, y - r * 0.55); ctx.stroke(); }
    return;
  }
  peloLados(ctx, v, x, y, r, vista);
}
function peloLados(ctx, v, x, y, r, vista) { // mechones sobre las orejas
  const lado = vista === 2;
  for (const s of lado ? [-1] : [-1, 1]) blob(ctx, v.pelo, () => { ctx.ellipse(x + s * r * 0.88 - (lado ? 2 : 0), y - 2, r * 0.22, r * 0.36, 0, 0, Math.PI * 2); }, 2);
}

// ------------------------------------------------------------------ atlas
export function buildIbanezAtlas(lista) {
  const vpr = 2, cols = 12 * vpr, rows = Math.ceil(lista.length / vpr);
  const cv = document.createElement('canvas'); cv.width = cols * W; cv.height = rows * H;
  const ctx = cv.getContext('2d');
  lista.forEach((v, i) => {
    const bx = (i % vpr) * 12, by = Math.floor(i / vpr);
    for (let d = 0; d < 3; d++) for (let f = 0; f < 4; f++) dibujar(ctx, (bx + d * 4 + f) * W, by * H, v, d, f);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { tex, cols, rows, vpr, canvas: cv, aspect: W / H };
}
