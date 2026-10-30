// Puesto de currywurst para Kreuzberg a partir de currywurst_referencia.png, a lo largo del canal y con el
// mostrador mirando al río.
// 1) Reflejo horizontal (el mostrador pasa a mirar a +y) y los textos se vuelven a invertir en su propia cara
//    (inversión a lo largo de la pendiente del letrero), para que se lean bien.
// 2) Cizallado vertical por cara (las verticales no cambian) para que la base caiga en la cuadrícula 2:1.
// 3) Reducción a escala de juego con la paleta de la propia imagen (bikepix.cjs, MODE=avg) y contorno de 1 px.
// uso: node currywurst_build.cjs   (genera currywurst_iso.png y currywurst.png, e imprime el anclaje)
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const src = P.read(path.join(here, 'currywurst_referencia.png'));
const W = src.w;

// 1 · reflejo
const mir = P.blank(W, src.h);
for (let y = 0; y < src.h; y++) for (let x = 0; x < W; x++) P.set(mir, W - 1 - x, y, P.get(src, x, y));
// zonas con texto, medidas en la referencia: x de a0 a b0, pendiente k0 del letrero y franja [y0, y1] en x = a0
const TEXTS = [
  { a0: 540, b0: 1290, k0: -0.18, y0: 318, y1: 462 }, // letrero CURRYWURST
  { a0: 196, b0: 376, k0: 0.3, y0: 330, y1: 612 }, // letrero lateral CURRY WURST
  { a0: 615, b0: 838, k0: -0.21, y0: 682, y1: 812 }, // carta con precios
  { a0: 378, b0: 434, k0: 0.15, y0: 810, y1: 848 }, // pegatina BERLIN
];
const snap = P.read(path.join(here, 'currywurst_referencia.png')); // solo para tamaño
const fixed = P.blank(W, src.h);
mir.data.copy(fixed.data);
for (const t of TEXTS) {
  const a = W - 1 - t.b0, b = W - 1 - t.a0, k = -t.k0;
  const y0 = t.y0 + t.k0 * (t.b0 - t.a0), y1 = t.y1 + t.k0 * (t.b0 - t.a0);
  for (let x = a; x <= b; x++) {
    const xs = a + b - x;
    for (let y = 0; y < src.h; y++) {
      const rel = y - k * (x - a);
      if (rel < y0 || rel > y1) continue;
      P.set(fixed, x, y, P.get(mir, xs, Math.round(rel + k * (xs - a))));
    }
  }
}
void snap;

// 2 · cizallado: esquina delantera en x = W − 1 − 560; ahora el lado largo es el izquierdo
const XC = W - 1 - 560, KL = 0.5 - 0.26, KR = 0.5 - 0.41;
const PAD = Math.ceil(Math.max(KL * XC, KR * (W - XC))) + 2;
const out = P.blank(W, src.h + PAD);
for (let x = 0; x < W; x++) {
  const d = PAD - Math.round(x < XC ? KL * (XC - x) : KR * (x - XC));
  for (let y = 0; y < src.h; y++) {
    const c = P.get(fixed, x, y);
    if (c[3] >= 128) P.set(out, x, y + d, [c[0], c[1], c[2], 255]);
  }
}
P.write(path.join(here, 'currywurst_iso.png'), out);

// 3 · escala de juego
const SCALE = 0.12;
const log = execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), path.join(here, 'currywurst_iso.png'), path.join(here, 'currywurst.png'), '0', '0', '48', String(SCALE)], { env: { ...process.env, MODE: 'avg' } }).toString();
// anclaje = esquina delantera de la base (columna con el píxel opaco más bajo)
const im = P.read(path.join(here, 'currywurst.png'));
let ax = 0, ay = -1;
for (let x = 0; x < im.w; x++) for (let y = 0; y < im.h; y++) if (P.get(im, x, y)[3] > 127 && y > ay) { ay = y; ax = x; }
console.log(log.trim(), JSON.stringify({ anchor: [ax, ay], size: [im.w, im.h] }));
