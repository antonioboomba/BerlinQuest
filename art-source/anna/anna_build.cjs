// Hoja de Anna (960x88, 20 fotogramas de 48x88) a partir de las figuras recortadas por anna_cut.cjs.
// Cada figura se reduce con su propia paleta (bikepix.cjs, MODE=avg) y contorno de 1 px; los pies quedan en la
// fila 85 como Tony y el torso centrado en el fotograma. La fila de andar de la referencia está dibujada más
// pequeña, así que se reduce con su propia escala para que Anna mida lo mismo parada y andando.
// Correspondencia (frente = mira a la derecha de la pantalla, SE; espalda = de espaldas hacia arriba a la derecha, NE):
//   0-1 reposo        → figura de 3/4 de frente (r1_1), el 1 respirando (torso 1 px abajo)
//   2-5 andar         → ciclo de perfil (r2_1..r2_4)
//   6-8 llevar algo   → como reposo / andar (Anna no lleva nada)
//   9   sentada       → reposo (no hay pose sentada en la referencia)
//   10-11 reposo esp. → 3/4 de espaldas (r1_3)
//   12-15 andar esp.  → paso de espaldas (r2_5) alternado con el reposo de espaldas
//   16-19             → como 10-15
// uso: node anna_cut.cjs && node anna_build.cjs
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const fig = (n) => path.join(here, 'figuras', `fig_${n}.png`);
const tmp = path.join(here, 'figuras', 'tmp');
fs.mkdirSync(tmp, { recursive: true });

const H1 = 80, H2 = 78; // alto de Anna parada (fila 1) y alto máximo de la fila de andar
const heightOf = (f) => { const im = P.read(f); let y0 = im.h, y1 = -1; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return y1 - y0 + 1; };
const S1 = H1 / Math.max(...[0, 1, 2, 3, 4].map((i) => heightOf(fig(`r1_${i}`))));
const S2 = H2 / Math.max(...[1, 2, 3, 4, 5].map((i) => heightOf(fig(`r2_${i}`))));

// La referencia anda a zancadas (pies a 40 px de distancia a escala de juego, Tony a ~22) y parece que corre:
// en las figuras de andar, por debajo de la cadera, x se acerca al centro del torso, cada vez más hacia los pies
// (factor 1 en la cadera → STRIDE en los pies). Así el paso es más corto sin tocar el cuerpo ni la cara.
const STRIDE = 0.55;
const srcOf = (n) => {
  if (!n.startsWith('r2')) return fig(n);
  const out = path.join(tmp, `${n}_paso.png`);
  if (fs.existsSync(out)) return out;
  const im = P.read(fig(n));
  let y0 = im.h, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  let tx0 = im.w, tx1 = -1;
  for (let y = Math.round(y0 + (y1 - y0) * 0.35); y <= Math.round(y0 + (y1 - y0) * 0.5); y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); }
  const cx = (tx0 + tx1) / 2, hip = y0 + (y1 - y0) * 0.55;
  const res = P.blank(im.w, im.h);
  for (let y = 0; y < im.h; y++) {
    const k = y <= hip ? 1 : 1 - (1 - STRIDE) * ((y - hip) / (y1 - hip));
    for (let x = 0; x < im.w; x++) P.set(res, x, y, P.get(im, Math.round(cx + (x - cx) / k), y));
  }
  P.write(out, res);
  return out;
};

const cache = {};
const small = (n) => {
  if (cache[n]) return cache[n];
  const out = path.join(tmp, `${n}.png`);
  execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), srcOf(n), out, '0', '0', '32', String(n.startsWith('r1') ? S1 : S2)], { env: { ...process.env, MODE: 'avg' } });
  return (cache[n] = softEdge(enhance(n, P.read(out), n.startsWith('r1') ? S1 : S2)));
};

// Borde: la figura recortada ya trae su propio contorno oscuro y bikepix añade otro casi negro por fuera, así que
// quedaba un borde doble demasiado marcado. Se quita el anillo de bikepix y el borde que queda (el de la
// referencia) se tiñe del color de su vecino interior oscurecido, en vez de negro puro.
function softEdge(im) {
  const OUT = [20, 16, 24];
  const op = (x, y) => x >= 0 && y >= 0 && x < im.w && y < im.h && P.get(im, x, y)[3] > 127;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const c = P.get(im, x, y); if (c[3] > 127 && c[0] === OUT[0] && c[1] === OUT[1] && c[2] === OUT[2]) P.set(im, x, y, [0, 0, 0, 0]); }
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const ring = [];
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (op(x, y) && N4.some(([a, b]) => !op(x + a, y + b))) ring.push([x, y]);
  const isRing = new Set(ring.map(([x, y]) => y * im.w + x));
  for (const [x, y] of ring) {
    let best = null;
    for (const [a, b] of [...N4, [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const xx = x + a, yy = y + b; if (op(xx, yy) && !isRing.has(yy * im.w + xx)) { best = P.get(im, xx, yy); break; } }
    if (!best) continue;
    const k = 0.45;
    P.set(im, x, y, [Math.round(best[0] * k + 12), Math.round(best[1] * k + 9), Math.round(best[2] * k + 14), 255]);
  }
  return im;
}

// Rasgos que el promedio diluye a esta escala (ojos de ~1,5 px, aros dorados): se miran en la figura original.
// Ojo = píxel muy oscuro con piel a ambos lados (en la misma fila, a menos de 9 px), en el tercio superior.
// Aro = dorado saturado. Bloque con ≥ 25 % de ojo → casi negro; con ≥ 25 % de aro → dorado.
function enhance(n, im, scale) {
  const src = P.read(srcOf(n));
  let bx0 = src.w, by0 = src.h, by1 = -1;
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (P.get(src, x, y)[3] > 127) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const skin = (c) => c[3] > 127 && c[0] > 170 && c[1] > 105 && c[1] < 175 && c[2] < 140 && c[0] - c[2] > 60;
  const gold = (c) => c[3] > 127 && c[0] > 170 && c[1] > 110 && c[2] < 70 && c[0] - c[2] > 120;
  const top = by0 + (by1 - by0) * 0.34;
  const eye = (x, y) => {
    const c = P.get(src, x, y);
    if (y > top || c[3] < 128 || lum(c) > 55) return false;
    let l = false, r = false;
    for (let d = 1; d < 9; d++) { if (skin(P.get(src, x - d, y))) l = true; if (skin(P.get(src, x + d, y))) r = true; }
    return l && r;
  };
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    if (P.get(im, x, y)[3] < 128) continue;
    const sx0 = Math.round(bx0 + (x - 2) / scale), sx1 = Math.round(bx0 + (x - 1) / scale);
    const sy0 = Math.round(by0 + (y - 1) / scale), sy1 = Math.round(by0 + y / scale);
    let k = 0, e = 0, g = 0;
    for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) { k++; if (eye(xx, yy)) e++; else if (gold(P.get(src, xx, yy))) g++; }
    if (!k) continue;
    if (e / k >= 0.25) P.set(im, x, y, [30, 20, 26, 255]);
    else if (g / k >= 0.25) P.set(im, x, y, [232, 176, 52, 255]);
  }
  return im;
}

const FW = 48, FH = 88, FEET = 85;
const sheet = P.blank(FW * 20, FH);
const put = (f, n, bob = 0) => {
  const im = small(n);
  let x0 = im.w, x1 = -1, y0 = im.h, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  // centro del torso (franja 35–60 % del alto) para que el cuerpo no baile al andar
  const t0 = Math.round(y0 + (y1 - y0) * 0.35), t1 = Math.round(y0 + (y1 - y0) * 0.6);
  let tx0 = im.w, tx1 = -1;
  for (let y = t0; y <= t1; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); }
  const dx = Math.round(FW / 2 - (tx0 + tx1 + 1) / 2), dy = FEET - y1;
  const waist = y0 + (y1 - y0) * 0.55;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = P.get(im, x, y);
    if (c[3] < 128) continue;
    P.set(sheet, f * FW + x + dx, y + dy + (bob && y < waist ? 1 : 0), c);
  }
};
const FRONT = { idle: 'r1_1', walk: ['r2_1', 'r2_2', 'r2_3', 'r2_4'] };
const BACK = { idle: 'r1_3', step: 'r2_5' };
put(0, FRONT.idle); put(1, FRONT.idle, 1);
FRONT.walk.forEach((n, i) => put(2 + i, n));
put(6, FRONT.idle); put(7, FRONT.walk[0]); put(8, FRONT.walk[2]); put(9, FRONT.idle);
put(10, BACK.idle); put(11, BACK.idle, 1);
put(12, BACK.step); put(13, BACK.idle, 1); put(14, BACK.step); put(15, BACK.idle, 1);
put(16, BACK.idle); put(17, BACK.step); put(18, BACK.step); put(19, BACK.idle);
// sin píxeles fuera de su fotograma
P.write(path.join(here, 'anna_960x88.png'), sheet);
console.log(JSON.stringify({ S1: +S1.toFixed(4), S2: +S2.toFixed(4) }));
