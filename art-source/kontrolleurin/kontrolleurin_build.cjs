// Kontrolleurin (personaje quieto del andén del U-Bahn) a partir de kontrolleurin_referencia.png.
// 1) El fondo blanco se vuelve transparente por relleno desde los bordes (solo blancos conectados con el borde).
// 2) Reducción a la escala de Tony (≈78 px de alto, pies en la fila 85) con la paleta de la propia imagen
//    (bikepix.cjs, MODE=avg) y contorno de 1 px.
// 3) Hoja de 960x88: el mismo fotograma en los 20 huecos (es un personaje quieto; en el 2.º fotograma del reposo
//    el cuerpo baja 1 px para que respire). Mira hacia la derecha de la pantalla (SE); hacia SW el juego la refleja.
// uso: node kontrolleurin_build.cjs
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const src = P.read(path.join(here, 'kontrolleurin_referencia.png'));
const { w, h } = src;

// 1 · fondo fuera
const bg = new Uint8Array(w * h);
const isWhite = (x, y) => { const c = P.get(src, x, y); return c[3] < 20 || (c[0] > 225 && c[1] > 225 && c[2] > 225); };
const stack = [];
for (let x = 0; x < w; x++) stack.push([x, 0], [x, h - 1]);
for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= w || y >= h || bg[y * w + x] || !isWhite(x, y)) continue;
  bg[y * w + x] = 1;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
const cut = P.blank(w, h);
let y0 = h, y1 = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!bg[y * w + x]) { const c = P.get(src, x, y); P.set(cut, x, y, [c[0], c[1], c[2], 255]); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
P.write(path.join(here, 'kontrolleurin_recorte.png'), cut);

// 2 · reducción
const TARGET_H = 82; // 5 % más que Tony (78) para que se lea bien
const SCALE = TARGET_H / (y1 - y0 + 1);
const log = execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), path.join(here, 'kontrolleurin_recorte.png'), path.join(here, 'kontrolleurin.png'), '0', '0', '32', String(SCALE)], { env: { ...process.env, MODE: 'avg' } }).toString();
const im = P.read(path.join(here, 'kontrolleurin.png'));

// 2b · rasgos de la cara: el promedio los diluye (ojos de 3-4 px), así que en la caja de la cara se mira la
// referencia directamente: bloque con bastante negro → ojo/pestaña; con blanco → brillo del ojo; rojizo → boca.
{
  let rx0 = w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!bg[y * w + x]) rx0 = Math.min(rx0, x);
  const FACE = { x0: 595, x1: 715, y0: 240, y1: 345 }; // en píxeles de la referencia
  const refX = (x) => rx0 + (x - 2) / SCALE, refY = (y) => y0 + (y - 1) / SCALE; // inverso de bikepix (margen 2 / 1)
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const sx0 = Math.round(refX(x)), sx1 = Math.round(refX(x + 1)), sy0 = Math.round(refY(y)), sy1 = Math.round(refY(y + 1));
    if (sx0 < FACE.x0 || sx1 > FACE.x1 || sy0 < FACE.y0 || sy1 > FACE.y1) continue;
    let n = 0, dark = 0, white = 0, red = 0;
    for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) {
      const [r, g, b] = P.get(src, xx, yy); n++;
      if (0.3 * r + 0.59 * g + 0.11 * b < 60) dark++;
      else if (r > 225 && g > 215 && b > 205) white++;
      else if (r > 150 && g < 115 && b < 100 && r - g > 60) red++;
    }
    if (!n) continue;
    if (dark / n > 0.35) P.set(im, x, y, [26, 18, 24, 255]);
    else if (white / n > 0.2) P.set(im, x, y, [244, 236, 226, 255]);
    else if (red / n > 0.3) P.set(im, x, y, [176, 92, 72, 255]);
  }
}
let bx0 = im.w, bx1 = -1, by0 = im.h, by1 = -1;
for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }

// 3 · hoja: pies (sin contorno) en la fila 85 como Tony, centrada en el ancho de 48
const FW = 48, FH = 88, FEET = 86; // la fila del contorno bajo los pies queda en 86
const sheet = P.blank(FW * 20, FH);
const dx = Math.round((FW - (bx1 - bx0 + 1)) / 2) - bx0;
const dy = FEET - by1;
const IDLE2 = new Set([1, 11]);
for (let f = 0; f < 20; f++) {
  const bob = IDLE2.has(f) ? 1 : 0;
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const c = P.get(im, x, y);
    if (c[3] < 128) continue;
    // respiración: todo lo que está por encima de la cintura baja 1 px; piernas fijas
    const yy = y + dy + (bob && y < by0 + (by1 - by0) * 0.55 ? 1 : 0);
    P.set(sheet, f * FW + x + dx, yy, c);
  }
}
P.write(path.join(here, 'kontrolleurin_960x88.png'), sheet);
console.log(log.trim(), JSON.stringify({ scale: SCALE, size: [bx1 - bx0 + 1, by1 - by0 + 1] }));
