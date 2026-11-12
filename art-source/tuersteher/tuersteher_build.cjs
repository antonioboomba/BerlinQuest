// Türsteher (portero del club, quieto en la puerta) a partir de tuersteher_referencia.png (hoja 4x4: columnas =
// reposo + 3 pasos; filas = frente, perfil izq., perfil der., espaldas). Solo se usan las poses quietas:
// columna 0 de la fila de frente y de la de espaldas.
// 1) Recorte de cada celda (fondo ya transparente; alfa > 128 es figura).
// 2) Reducción a 80 px de alto con la paleta de la propia imagen (bikepix.cjs, MODE=avg);
//    se quita el anillo casi negro que añade bikepix: la referencia ya trae su propio contorno.
// 3) Hoja de 960x88: frente en los huecos 0-9 y espaldas en 10-19 (en el 2.º fotograma del reposo, 1 y 11, el cuerpo
//    baja 1 px para que respire). Pies en la fila 85.
// uso: node tuersteher_build.cjs
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const src = P.read(path.join(here, 'tuersteher_referencia.png'));
const CELL = src.w / 4;
const tmp = path.join(here, 'tmp');
fs.mkdirSync(tmp, { recursive: true });

function cutCell(col, row) {
  const ox = Math.round(col * CELL), oy = Math.round(row * CELL), n = Math.round(CELL);
  let x0 = n, x1 = -1, y0 = n, y1 = -1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (P.get(src, ox + x, oy + y)[3] > 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const im = P.blank(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = P.get(src, ox + x, oy + y); if (c[3] > 128) P.set(im, x - x0, y - y0, [c[0], c[1], c[2], 255]); }
  return im;
}

const H = 80; // con 82 el ancho (manos) llenaba los 48 px del fotograma y se cortaba
const front = cutCell(0, 0), back = cutCell(0, 3);
const S = H / front.h;
function small(im, name) {
  const a = path.join(tmp, `${name}_big.png`), b = path.join(tmp, `${name}.png`);
  P.write(a, im);
  execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), a, b, '0', '0', '32', String(S)], { env: { ...process.env, MODE: 'avg' } });
  const out = P.read(b);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) { const c = P.get(out, x, y); if (c[3] > 127 && c[0] === 20 && c[1] === 16 && c[2] === 24) P.set(out, x, y, [0, 0, 0, 0]); }
  return out;
}
const F = small(front, 'front'), B = small(back, 'back');

const FW = 48, FH = 88, FEET = 85;
const sheet = P.blank(FW * 20, FH);
function offset(im) {
  let x0 = im.w, x1 = -1, y0 = im.h, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1, dx: Math.round((FW - (x1 - x0 + 1)) / 2) - x0, dy: FEET - y1 };
}

// 2b · retoques de la cara de frente (coordenadas del fotograma 0 de la hoja de 48x88):
// - ojos: al reducir quedaban manchas grises; se pintan cejas inclinadas hacia el centro (gesto serio, como en la
//   referencia) y el ojo negro debajo; el resto de la franja de los ojos vuelve al tono de piel
// - auricular con cable en espiral (a la derecha de la cabeza; en el juego, reflejado, a la izquierda): fuera
{
  const { dx, dy } = offset(F);
  const at = (x, y) => [x - dx, y - dy];
  const skin = P.get(F, ...at(23, 15));
  for (let y = 16; y <= 18; y++) for (let x = 17; x <= 30; x++) {
    const c = P.get(F, ...at(x, y));
    if (c[3] > 127 && 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2] < 120) P.set(F, ...at(x, y), skin);
  }
  const INK = [26, 18, 24, 255];
  for (const [x, y] of [[17, 16], [18, 16], [19, 16], [19, 17], [20, 17], [21, 17], [22, 17], [20, 18], [21, 18],
    [20, 19], [21, 19], [28, 16], [29, 16], [30, 16], [25, 17], [26, 17], [27, 17], [28, 17], [26, 18], [27, 18], [26, 19], [27, 19]]) P.set(F, ...at(x, y), INK);
  for (let y = 16; y <= 27; y++) for (let x = 34; x < FW; x++) { const [a, b] = at(x, y); if (a >= 0 && a < F.w && b >= 0 && b < F.h) P.set(F, a, b, [0, 0, 0, 0]); }
  // oreja derecha: al quitar el auricular quedaba dentro de la cabeza; se dibuja simétrica a la izquierda
  // (sobresale 1 px, con su contorno y la sombra del hueco), con los colores de esa oreja
  const g = (x, y) => P.get(F, ...at(x, y));
  const OUT = g(12, 19), SK = g(14, 19), SH = g(15, 20), HOLE = g(15, 21);
  const ear = [[34, 17, OUT], [34, 18, SH], [34, 19, HOLE], [34, 20, HOLE], [34, 21, SH], [34, 22, SH], [34, 23, OUT],
    [35, 18, OUT], [35, 19, OUT], [35, 20, OUT], [35, 21, OUT], [35, 22, OUT], [33, 19, SK], [33, 20, SH], [33, 21, SK]];
  for (const [x, y, c] of ear) P.set(F, ...at(x, y), c);
}

function put(f, im, bob) {
  const { x0, x1, y0, y1, dx, dy } = offset(im);
  const waist = y0 + (y1 - y0) * 0.55;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = P.get(im, x, y);
    if (c[3] < 128) continue;
    const X = x + dx, Y = y + dy + (bob && y < waist ? 1 : 0);
    if (X >= 0 && X < FW && Y >= 0) P.set(sheet, f * FW + X, Y, c);
  }
}
for (let f = 0; f < 20; f++) put(f, f < 10 ? F : B, f === 1 || f === 11);
P.write(path.join(here, 'tuersteher_960x88.png'), sheet);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ S: +S.toFixed(4), front: [F.w, F.h], back: [B.w, B.h] }));
