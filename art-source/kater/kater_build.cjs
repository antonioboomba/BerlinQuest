// Fachada del bar «Kater» a partir de kater_referencia.png, como textura plana de la cara frontal del edificio
// (6 casillas = 192 px de ancho). La fachada de la referencia es un paralelogramo: arista superior del muro
// y(x) = TOP0 + K·(x − X0) y base y(x) = BOT0 + K·(x − X0). Cada píxel de la textura promedia 4×4 muestras de
// la referencia y se reduce a 48 colores de la propia imagen. Las mesas, sillas, jardineras y pizarra de la
// referencia no se usan (el juego tiene las suyas delante del bar): el tramo reproducido (x 265–1225) y la base
// (por encima de la mesa) las dejan fuera, y las últimas filas del muro se completan con el zócalo rojo de la
// referencia (la puerta sigue hasta el suelo).
// uso: node kater_build.cjs   → kater_fachada.png (192 × 150) y las luces en coordenadas de la textura
const path = require('path');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const ref = P.read(path.join(here, 'kater_referencia.png'));

const W = 192; // 6 casillas × 32 px
const H = 150; // alto del muro en el juego
const HI = 136; // filas sacadas de la referencia; el resto, zócalo
const X0 = 140, K = 0.234; // pendiente de la fachada en la referencia (medida en las ventanas)
const TOP0 = 35, BOT0 = 615;
const XA = 265, XB = 1225; // tramo horizontal reproducido
const toRef = (u, v) => {
  const x = XA + (u / W) * (XB - XA);
  const top = TOP0 + K * (x - X0), bot = BOT0 + K * (x - X0);
  return [x, top + (v / HI) * (bot - top)];
};
const fromRef = (x, y) => {
  const top = TOP0 + K * (x - X0), bot = BOT0 + K * (x - X0);
  return [Math.round(((x - XA) / (XB - XA)) * W), Math.round(((y - top) / (bot - top)) * HI)];
};

// El toldo sobresale de la pared, así que su borde inferior no sigue la pendiente de la fachada. Se mide ese borde
// en cada columna (última fila roja o crema entre v 50 y 112), se ajusta una recta por tramo (a la izquierda y a la
// derecha de la puerta) y las filas se redistribuyen para que quede horizontal en AWN: 52 px sobre el suelo, la
// altura de la puerta del Bürgeramt (las filas de arriba, hasta las ventanas, no se tocan).
const AWN = H - 52, FIX = 42;
const isAwning = (c) => (c[0] > 130 && c[1] < 75 && c[2] < 85) || (c[0] > 190 && c[1] > 170 && c[2] > 150 && c[0] - c[2] < 70);
const edge = [];
for (let u = 0; u < W; u++) {
  let last = -1;
  for (let v = 50; v < 112; v++) {
    const [x, y] = toRef(u + 0.5, v + 0.5);
    if (isAwning(P.get(ref, Math.round(x), Math.round(y)))) last = v;
  }
  edge.push(last);
}
const fit = (u0, u1) => {
  const pts = [];
  for (let u = u0; u < u1; u++) if (edge[u] > 60) pts.push([u, edge[u]]);
  const med = pts.map((p) => p[1]).sort((a, b) => a - b)[Math.floor(pts.length / 2)];
  const ok = pts.filter((p) => Math.abs(p[1] - med) < 8);
  const n = ok.length, sx = ok.reduce((a, p) => a + p[0], 0), sy = ok.reduce((a, p) => a + p[1], 0);
  const sxx = ok.reduce((a, p) => a + p[0] * p[0], 0), sxy = ok.reduce((a, p) => a + p[0] * p[1], 0);
  const k = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return (u) => (sy - k * sx) / n + k * u;
};
const DOOR_U = fromRef(515, 700)[0];
const leftLine = fit(0, DOOR_U - 10), rightLine = fit(DOOR_U + 10, W);
const awningBottom = (u) => (u < DOOR_U ? leftLine(u) : rightLine(u));
/** fila de la referencia rectificada para la fila v de la textura final */
const remap = (u, v) => {
  const b = awningBottom(u);
  if (v <= FIX) return v;
  if (v <= AWN) return FIX + ((v - FIX) * (b - FIX)) / (AWN - FIX);
  return b + ((v - AWN) * (HI - b)) / (HI - AWN);
};
console.error(JSON.stringify({ borde_izq: [leftLine(0), leftLine(DOOR_U)].map(Math.round), borde_der: [rightLine(DOOR_U), rightLine(W)].map(Math.round), destino: AWN }));

const raw = [];
for (let v = 0; v < HI; v++) for (let u = 0; u < W; u++) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const [x, y] = toRef(u + (i + 0.5) / 4, remap(u + (i + 0.5) / 4, v + (j + 0.5) / 4));
    const c = P.get(ref, Math.round(x), Math.round(y));
    r += c[0]; g += c[1]; b += c[2]; n++;
  }
  raw.push({ u, v, c: [r / n, g / n, b / n] });
}
const K_COL = 48;
const sorted = raw.map((p) => p.c).sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
let cent = Array.from({ length: K_COL }, (_, k) => sorted[Math.floor(((k + 0.5) / K_COL) * sorted.length)].slice());
const near = (c) => { let bi = 0, bd = 1e9; cent.forEach((q, k) => { const d = (c[0] - q[0]) ** 2 * 0.3 + (c[1] - q[1]) ** 2 * 0.59 + (c[2] - q[2]) ** 2 * 0.11; if (d < bd) { bd = d; bi = k; } }); return bi; };
for (let it = 0; it < 10; it++) {
  const acc = cent.map(() => [0, 0, 0, 0]);
  for (const p of raw) { const k = near(p.c); acc[k][0] += p.c[0]; acc[k][1] += p.c[1]; acc[k][2] += p.c[2]; acc[k][3]++; }
  cent = cent.map((q, k) => (acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : q));
}
const out = P.blank(W, H);
for (const p of raw) P.set(out, p.u, p.v, [...cent[near(p.c)].map(Math.round), 255]);
// zócalo: rojo oscuro de la referencia con moldura arriba y sombra abajo; la puerta continúa hasta el suelo
const [d0, d1] = [fromRef(470, 700)[0], fromRef(560, 700)[0]];
const red = cent[near([92, 22, 26])], redLight = cent[near([128, 40, 38])], dark = cent[near([30, 14, 16])];
for (let v = HI; v < H; v++) for (let u = 0; u < W; u++) {
  if (u >= d0 && u <= d1) { P.set(out, u, v, P.get(out, u, HI - 1)); continue; }
  const c = v === HI ? redLight : v >= H - 2 ? dark : u % 24 === 0 ? dark : red;
  P.set(out, u, v, [...c.map(Math.round), 255]);
}
P.write(path.join(here, 'kater_fachada.png'), out);

// luces de la fachada (posiciones medidas en la referencia) → coordenadas de la textura
const LIGHTS = [
  { at: [750, 420], color: '#ff4f8a', r: 70, alpha: 0.5 }, // neón KATER
  { at: [1055, 480], color: '#ff4f8a', r: 40, alpha: 0.45 }, // gato de neón
  { at: [130, 365], color: '#ffcf6a', r: 30, alpha: 0.5 }, // aplique izquierdo
  { at: [490, 305], color: '#ffcf6a', r: 30, alpha: 0.5 }, // foco sobre el rótulo
  { at: [1160, 505], color: '#ffcf6a', r: 30, alpha: 0.5 }, // aplique derecho
  { at: [330, 610], color: '#ffb85c', r: 40, alpha: 0.45 }, // ventanas de la planta baja
  { at: [515, 680], color: '#ffb85c', r: 36, alpha: 0.45 }, // puerta
  { at: [700, 690], color: '#ffb85c', r: 40, alpha: 0.45 },
  { at: [910, 730], color: '#ffb85c', r: 40, alpha: 0.45 },
  { at: [440, 220], color: '#ffcf6a', r: 24, alpha: 0.35 }, // ventanas iluminadas de arriba
  { at: [765, 300], color: '#ffcf6a', r: 24, alpha: 0.35 },
];
const unmap = (u, vs) => { let best = 0, bd = 1e9; for (let v = 0; v < HI; v += 0.5) { const d = Math.abs(remap(u, v) - vs); if (d < bd) { bd = d; best = v; } } return Math.round(best); };
const lights = LIGHTS.map((l) => { const [x, y0] = fromRef(...l.at); const y = unmap(x, y0); return { x, y, color: l.color, r: l.r, alpha: l.alpha }; }).filter((l) => l.x >= 0 && l.x < W && l.y >= 0);
console.log(JSON.stringify({ size: [W, H], door_px: fromRef(515, 760)[0], lights }));
