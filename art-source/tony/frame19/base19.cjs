// Base editable del frame 19: la espalda de Tony sentado sin la caja y sin piernas inventadas.
// Solo borra: no añade píxeles salvo el contorno negro donde la ropa queda cortada.
// uso: node base19.cjs ../tony_fixed.png tony_frame_19_base.png
const P = require('../corregidos/png.cjs');
const [src, out] = process.argv.slice(2);
const sheet = P.read(src); const f = P.frame(sheet, 19);
const T = [0, 0, 0, 0], OUTLINE = [14, 12, 16, 255];
const brown = (c) => c[3] > 127 && c[0] > c[2] + 12 && c[0] >= c[1];
// por columna: desde la primera madera (y ≥ 62, por debajo de la mochila) hacia abajo, todo es caja
for (let x = 0; x < 48; x++) {
  let top = -1; for (let y = 62; y < 88; y++) if (brown(P.get(f, x, y))) { top = y; break; }
  if (top >= 0) for (let y = top; y < 88; y++) P.set(f, x, y, T);
}
for (let y = 70; y < 88; y++) for (let x = 0; x < 48; x++) P.set(f, x, y, T); // restos sueltos
for (let y = 62; y < 70; y++) for (const x of [0, 1, 2, 3, 4, 5, 6, 39, 40, 41, 42, 43, 44, 45, 46, 47]) P.set(f, x, y, T); // canto de la caja
// la ropa cortada se cierra con contorno debajo
for (let x = 0; x < 48; x++) {
  let y1 = -1; for (let y = 0; y < 88; y++) if (P.get(f, x, y)[3] > 127) y1 = y;
  if (y1 >= 56 && Math.max(...P.get(f, x, y1).slice(0, 3)) > 45) P.set(f, x, y1 + 1, OUTLINE);
}
P.write(out, f);
