// Insignia de misión (bocadillo dorado con «!») a partir de insignia_referencia.png.
// La referencia ya es pixel art ampliado (~22 px por píxel): se recupera la rejilla original (23x24) tomando en
// cada celda el color más frecuente de su zona central (sin bordes de celda ni suavizado). Alfa binario.
// uso: node insignia_build.cjs → insignia.png (y copia en public/assets/ui/quest_badge.png)
const path = require('path');
const fs = require('fs');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const src = P.read(path.join(here, 'insignia_referencia.png'));
let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (P.get(src, x, y)[3] > 128) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const COLS = 23, ROWS = 24;
const cw = (x1 - x0 + 1) / COLS, ch = (y1 - y0 + 1) / ROWS;
const out = P.blank(COLS, ROWS);
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const votes = new Map();
  for (let y = Math.floor(y0 + (r + 0.25) * ch); y < y0 + (r + 0.75) * ch; y++) for (let x = Math.floor(x0 + (c + 0.25) * cw); x < x0 + (c + 0.75) * cw; x++) {
    const p = P.get(src, x, y);
    const k = p[3] < 128 ? 'none' : [p[0] >> 3, p[1] >> 3, p[2] >> 3].join();
    const v = votes.get(k) || { n: 0, s: [0, 0, 0] };
    v.n++; v.s[0] += p[0]; v.s[1] += p[1]; v.s[2] += p[2];
    votes.set(k, v);
  }
  let best = null, bk = null;
  for (const [k, v] of votes) if (!best || v.n > best.n) { best = v; bk = k; }
  if (bk !== 'none') P.set(out, c, r, [Math.round(best.s[0] / best.n), Math.round(best.s[1] / best.n), Math.round(best.s[2] / best.n), 255]);
}
P.write(path.join(here, 'insignia.png'), out);
fs.copyFileSync(path.join(here, 'insignia.png'), path.join(here, '../../public/assets/ui/quest_badge.png'));
console.log(JSON.stringify({ cell: [+cw.toFixed(2), +ch.toFixed(2)], size: [COLS, ROWS] }));

// Versión HD (quest_badge_hd.png, 128 px de alto): reducción por área de la referencia con alfa premultiplicado,
// para mostrarla grande y sin pixelado irregular (la interfaz la dibuja con filtrado suave a su tamaño exacto).
{
  const HD_H = 128;
  const M = 2; // margen transparente en la textura
  const sc = HD_H / (y1 - y0 + 1);
  const W = Math.round((x1 - x0 + 1) * sc) + 2 * M, H = HD_H + 2 * M;
  const hd = P.blank(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx0 = x0 + (x - M) / sc, sx1 = x0 + (x - M + 1) / sc, sy0 = y0 + (y - M) / sc, sy1 = y0 + (y - M + 1) / sc;
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = Math.floor(sy0); yy < Math.ceil(sy1); yy++) for (let xx = Math.floor(sx0); xx < Math.ceil(sx1); xx++) {
      const p = P.get(src, xx, yy); const al = p[3] / 255;
      r += p[0] * al; g += p[1] * al; b += p[2] * al; a += al; n++;
    }
    if (!n || a / n < 0.02) continue;
    P.set(hd, x, y, [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round((a / n) * 255)]);
  }
  P.write(path.join(here, 'insignia_hd.png'), hd);
  fs.copyFileSync(path.join(here, 'insignia_hd.png'), path.join(here, '../../public/assets/ui/quest_badge_hd.png'));
  console.log(JSON.stringify({ hd: [W, H] }));
}
