// Rata de Kreuzberg (4 fotogramas andando, mirando a la derecha) a partir de rata_referencia.png (fondo transparente).
// Cada fotograma se reduce a escala de juego (≈ 30 px de largo; Tony mide 80 de alto) con la paleta de la propia
// imagen (bikepix.cjs, MODE=avg) y contorno oscuro de 1 px (el de la referencia desaparece a este tamaño y sin él
// la rata no se distingue de noche). Hoja horizontal de fotogramas iguales, patas en la última fila, cuerpo alineado.
// uso: node rata_build.cjs → rata_sheet.png (y copia en public/assets/animals/rat.png) e imprime el tamaño de fotograma
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const src = P.read(path.join(here, 'rata_referencia.png'));
const FRAMES = [[22, 528], [578, 1061], [1114, 1606], [1657, 2152]]; // columnas de cada rata (con sus bigotes)
const Y0 = 200, Y1 = 480;
const LEN = 30;
const tmp = path.join(here, 'tmp');
fs.mkdirSync(tmp, { recursive: true });
const SCALE = LEN / (FRAMES[0][1] - FRAMES[0][0] + 1);
const smalls = FRAMES.map(([x0, x1], i) => {
  const cut = P.blank(x1 - x0 + 1, Y1 - Y0 + 1);
  for (let y = Y0; y <= Y1; y++) for (let x = x0; x <= x1; x++) { const c = P.get(src, x, y); if (c[3] >= 160) P.set(cut, x - x0, y - Y0, [c[0], c[1], c[2], 255]); }
  const a = path.join(tmp, `f${i}.png`), b = path.join(tmp, `f${i}_s.png`);
  P.write(a, cut);
  execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), a, b, '0', '0', '24', String(SCALE)], { env: { ...process.env, MODE: 'avg' } });
  return P.read(b);
});
const box = (im) => { let x0 = im.w, x1 = -1, y0 = im.h, y1 = -1, sx = 0, n = 0; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } for (let y = y0; y <= y0 + (y1 - y0) * 0.6; y++) for (let x = x0; x <= x1; x++) if (P.get(im, x, y)[3] > 127) { sx += x; n++; } return { x0, x1, y0, y1, cx: sx / n }; };
const boxes = smalls.map(box);
// alineación: centro del cuerpo (mitad de arriba: lomo y cabeza, sin patas ni cola) y patas abajo
const left = Math.max(...boxes.map((b) => b.cx - b.x0)), right = Math.max(...boxes.map((b) => b.x1 - b.cx));
const FW = Math.ceil(left + right) + 3, FH = Math.max(...boxes.map((b) => b.y1 - b.y0 + 1)) + 1;
const sheet = P.blank(FW * FRAMES.length, FH);
smalls.forEach((im, i) => {
  const b = boxes[i];
  const dx = Math.round(1 + left - b.cx), dy = FH - 1 - b.y1;
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { const c = P.get(im, x, y); if (c[3] > 127) P.set(sheet, i * FW + x + dx, y + dy, c); }
});
P.write(path.join(here, 'rata_sheet.png'), sheet);
fs.copyFileSync(path.join(here, 'rata_sheet.png'), path.join(here, '../../public/assets/animals/rat.png'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ frame: [FW, FH], frames: FRAMES.length, scale: +SCALE.toFixed(4) }));
