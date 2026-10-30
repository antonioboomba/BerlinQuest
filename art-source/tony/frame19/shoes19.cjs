// Frame 19 v2: sustituye las zapatillas planas del redibujo por las del F10 (misma vista de talones, con su
// sombreado y el detalle rojo), alineadas bajo cada pantorrilla. No toca nada por encima de la fila 77.
// uso: node shoes19.cjs ../tony_fixed.png tony_frame_19_redibujado_48x88.png tony_frame_19_v2.png
const P = require('../corregidos/png.cjs');
const [sheetF, inF, out] = process.argv.slice(2);
const sheet = P.read(sheetF); const f10 = P.frame(sheet, 10); const img = P.read(inF);
const blue = (c) => c[3] > 127 && c[2] > c[0] + 10;
// [x0, x1 del F10, primera fila, desplazamiento x, zona a limpiar en el F19]
const SHOES = [
  { sx0: 13, sx1: 22, sy0: 78, dx: -2, clear: [7, 21] },
  { sx0: 24, sx1: 37, sy0: 77, dx: 5, clear: [28, 42] },
];
for (const s of SHOES) {
  for (let y = 79; y < 88; y++) for (let x = s.clear[0]; x <= s.clear[1]; x++) P.set(img, x, y, [0, 0, 0, 0]);
  for (let y = s.sy0; y < 88; y++) for (let x = s.sx0; x <= s.sx1; x++) {
    const c = P.get(f10, x, y);
    if (c[3] < 128 || blue(c)) continue;
    P.set(img, x + s.dx, y, c);
  }
}
// bajo de las perneras que queda al aire: contorno
for (let x = 0; x < 48; x++) for (let y = 74; y < 87; y++) {
  if (blue(P.get(img, x, y)) && P.get(img, x, y + 1)[3] < 128) P.set(img, x, y + 1, [14, 12, 16, 255]);
}
P.write(out, img);
