// Placa «KREUZBERG» sobre poste (sustituye a la placa procedural de la plaza) a partir de placa_referencia.png.
// La referencia es frontal, como la placa a la que sustituye: se reduce con la paleta de la propia imagen
// (bikepix.cjs, MODE=avg) y contorno de 1 px. Después, dentro de la placa, las letras se vuelven nítidas mirando la
// referencia directamente (bloque con bastante tinta → negro; si no → fondo crema), para que se lean a 8 px.
// El anclaje es el centro de la base del poste.
// uso: node placa_build.cjs
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const src = P.read(path.join(here, 'placa_referencia.png'));
const { w, h } = src;
let rx0 = w, ry0 = h, rx1 = 0, ry1 = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (P.get(src, x, y)[3] >= 128) { rx0 = Math.min(rx0, x); ry0 = Math.min(ry0, y); rx1 = Math.max(rx1, x); ry1 = Math.max(ry1, y); }
const TARGET_H = 108;
const SCALE = TARGET_H / (ry1 - ry0 + 1);
const out = path.join(here, 'placa.png');
const log = execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), path.join(here, 'placa_referencia.png'), out, '0', '0', '32', String(SCALE)], { env: { ...process.env, MODE: 'avg' } }).toString();
const im = P.read(out);
const refX = (x) => rx0 + (x - 2) / SCALE, refY = (y) => ry0 + (y - 1) / SCALE; // inverso de bikepix (margen 2 / 1)
// Las letras reducidas desde la referencia salen desiguales (la K más fina que el resto según caiga la rejilla),
// así que el rótulo se vacía a crema y se escribe con una fuente propia de 5x7, trazo vertical de 2 px y 1 px de
// separación, centrada en la caja de las letras de la referencia.
const TEXT = { x0: 315, x1: 945, y0: 262, y1: 372 }; // caja de las letras en la referencia
const INK = [24, 22, 26, 255], CREAM = [226, 218, 200, 255];
const GLYPHS = {
  K: ['##..#', '##.##', '####.', '###..', '####.', '##.##', '##..#'],
  R: ['####.', '##.##', '##.##', '####.', '###..', '##.##', '##..#'],
  E: ['#####', '##...', '##...', '####.', '##...', '##...', '#####'],
  U: ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##', '.###.'],
  Z: ['#####', '....#', '...##', '..##.', '.##..', '##...', '#####'],
  B: ['####.', '##.##', '##.##', '####.', '##.##', '##.##', '####.'],
  G: ['.####', '##...', '##...', '##.##', '##..#', '##..#', '.####'],
};
let tx0 = im.w, tx1 = -1, ty0 = im.h, ty1 = -1;
for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
  const sx0 = Math.round(refX(x)), sx1 = Math.round(refX(x + 1)), sy0 = Math.round(refY(y)), sy1 = Math.round(refY(y + 1));
  if (sx0 < TEXT.x0 || sx1 > TEXT.x1 || sy0 < TEXT.y0 || sy1 > TEXT.y1) continue;
  P.set(im, x, y, CREAM);
  tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); ty0 = Math.min(ty0, y); ty1 = Math.max(ty1, y);
}
const WORD = 'KREUZBERG';
const tw = WORD.length * 6 - 1, th = 7;
const ox = tx0 + Math.floor((tx1 - tx0 + 1 - tw) / 2), oy = ty0 + Math.floor((ty1 - ty0 + 1 - th) / 2);
[...WORD].forEach((ch, i) => GLYPHS[ch].forEach((row, r) => [...row].forEach((c, k) => { if (c === '#') P.set(im, ox + i * 6 + k, oy + r, INK); })));
P.write(out, im);
let fx0 = im.w, fx1 = 0;
const by = im.h - 2; // fila de la base
for (let x = 0; x < im.w; x++) if (P.get(im, x, by)[3] > 127) { fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); }
const anchor = [Math.round((fx0 + fx1) / 2), by];
console.log(log.trim(), JSON.stringify({ anchor, size: [im.w, im.h] }));
