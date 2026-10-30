// Banco berlinés para Kreuzberg a partir de banco_referencia.png (el asiento mira al canal, como los de antes).
// 1) Reflejo horizontal; los textos («BERLIN QUEST», placa «B.Q.») se vuelven a invertir en su propia tabla.
// 2) Cizallado vertical por lado para que la base caiga en la cuadrícula 2:1 (las verticales no cambian).
// 3) Reducción a escala de juego con la paleta de la propia imagen (bikepix.cjs, MODE=avg) y contorno de 1 px.
// uso: node banco_build.cjs   (genera banco_iso.png y banco.png, e imprime el anclaje)
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const src = P.read(path.join(here, 'banco_referencia.png'));
const W = src.w;

const mir = P.blank(W, src.h);
for (let y = 0; y < src.h; y++) for (let x = 0; x < W; x++) P.set(mir, W - 1 - x, y, P.get(src, x, y));
const TEXTS = [
  { a0: 330, b0: 700, k0: -0.19, y0: 300, y1: 412 }, // BERLIN QUEST con corona y chorreones
  { a0: 995, b0: 1135, k0: -0.17, y0: 178, y1: 252 }, // placa B.Q.
];
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

// esquina delantera (pie más bajo) tras el reflejo; a la izquierda el lado largo (pendiente 0,25 → 0,5),
// a la derecha el corto (0,55 → 0,5)
const XC = W - 1 - 400, KL = 0.5 - 0.25, KR = 0.5 - 0.55;
const PAD = Math.ceil(Math.max(KL * XC, Math.abs(KR) * (W - XC))) + 2;
const out = P.blank(W, src.h + 2 * PAD);
for (let x = 0; x < W; x++) {
  const d = PAD - Math.round(x < XC ? KL * (XC - x) : KR * (x - XC));
  for (let y = 0; y < src.h; y++) {
    const c = P.get(fixed, x, y);
    if (c[3] >= 128) P.set(out, x, y + d, [c[0], c[1], c[2], 255]);
  }
}
P.write(path.join(here, 'banco_iso.png'), out);

const SCALE = 0.06;
const log = execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), path.join(here, 'banco_iso.png'), path.join(here, 'banco.png'), '0', '0', '28', String(SCALE)], { env: { ...process.env, MODE: 'avg' } }).toString();
const im = P.read(path.join(here, 'banco.png'));
let fx = 0, fy = -1;
for (let x = 0; x < im.w; x++) for (let y = 0; y < im.h; y++) if (P.get(im, x, y)[3] > 127 && y > fy) { fy = y; fx = x; }
// anclaje = centro de la base: desde la esquina delantera, media longitud (1,85 casillas) hacia −x y medio fondo hacia −y
const anchor = [Math.round(fx - 0.92 * 32 + 0.25 * 32), Math.round(fy - 0.92 * 16 - 0.25 * 16)];
console.log(log.trim(), JSON.stringify({ front: [fx, fy], anchor, size: [im.w, im.h] }));
