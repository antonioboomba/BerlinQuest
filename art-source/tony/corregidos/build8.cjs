// Corrige los fotogramas 6–8 y 16–18 de Tony solo con píxeles existentes del propio personaje.
// uso: node build8.cjs tony_fixed.png salida.png
const P = require('./png.cjs');
const [src, out] = process.argv.slice(2);
const sheet = P.read(src); const res = P.read(src);
const at = (img, f, x, y) => P.get(img, f * 48 + x, y);
const put = (f, x, y, c) => P.set(res, f * 48 + x, y, c);
const T = [0, 0, 0, 0];
const neutralDark = (c) => c[3] > 127 && Math.max(c[0], c[1], c[2]) < 115 && Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) < 30;
const light = (c) => c[3] > 127 && Math.min(c[0], c[1], c[2]) > 120 && Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) < 70;
const log = [];

// ── Frente: torso y brazo libre (detrás de la jarra) tomados de un fotograma de caminar/quieto alineado ──
const FRONT = [
  { f: 6, d: 0, dx: -1, dy: 0 },
  { f: 7, d: 5, dx: -1, dy: 0 },
  { f: 8, d: 2, dx: 0, dy: 0 },
];
for (const { f, d, dx, dy } of FRONT) {
  let n = 0;
  for (let y = 37; y <= 57; y++) for (let x = 29; x <= 40; x++) { put(f, x, y, at(sheet, d, x - dx, y - dy)); n++; }
  // asa de la jarra que asoma junto al puño (píxeles claros) → lo que hay detrás en el donante
  let h = 0;
  for (let y = 38; y <= 55; y++) for (let x = 23; x <= 28; x++) if (light(at(sheet, f, x, y))) { put(f, x, y, at(sheet, d, x - dx, y - dy)); h++; }
  log.push(`F${f}: torso ${n} px desde F${d} (dx ${dx}), asa ${h} px`);
}

// ── Espalda: borrar la jarra; el hombro que tapaba la espuma sale del fotograma de espalda alineado ──
const BACK = [
  { f: 16, d: 15, dx: -2, dy: 0 },
  { f: 17, d: 15, dx: -1, dy: 0 },
  { f: 18, d: 15, dx: -2, dy: 0 },
];
for (const { f, d, dx, dy } of BACK) {
  // jarra = píxeles no neutros oscuros de la zona, más 1 px alrededor (su contorno)
  const X0 = 31, X1 = 44, Y0 = 32, Y1 = 54;
  const mug = new Set();
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const c = at(sheet, f, x, y); if (c[3] > 127 && !neutralDark(c)) mug.add(x + ',' + y); }
  const mask = new Set(mug);
  for (const k of mug) { const [x, y] = k.split(',').map(Number); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) if (x + ax >= X0 && x + ax <= X1 && y + ay >= Y0 && y + ay <= Y1) mask.add((x + ax) + ',' + (y + ay)); }
  // a la derecha de la jarra no queda nada del cuerpo
  for (let y = Y0; y <= Y1; y++) { let mx = -1; for (let x = X0; x <= X1; x++) if (mug.has(x + ',' + y)) mx = x; if (mx >= 0) for (let x = mx; x <= X1; x++) mask.add(x + ',' + y); }
  let er = 0, sh = 0;
  for (const k of mask) { const [x, y] = k.split(',').map(Number); if (at(sheet, f, x, y)[3] > 127) er++; put(f, x, y, T); }
  // hombro tapado por la espuma: se recupera del fotograma de espalda alineado
  for (const k of mask) { const [x, y] = k.split(',').map(Number); if (y > 41) continue; const c = at(sheet, d, x - dx, y - dy); if (neutralDark(c)) { put(f, x, y, c); sh++; } }
  // píxeles sueltos que hayan quedado
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    if (P.get(res, f * 48 + x, y)[3] < 128) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([ax, ay]) => P.get(res, f * 48 + x + ax, y + ay)[3] > 127).length;
    if (nb <= 1) put(f, x, y, T);
  }
  log.push(`F${f}: jarra borrada ${er} px, hombro ${sh} px desde F${d} (dx ${dx})`);
}
// contorno: el último píxel opaco de cada fila del brazo debe ser contorno negro
for (const { f } of BACK) for (let y = 33; y <= 54; y++) {
  let last = -1; for (let x = 28; x <= 44; x++) if (P.get(res, f * 48 + x, y)[3] > 127) last = x;
  if (last >= 30) { const c = P.get(res, f * 48 + last, y); if (Math.max(c[0], c[1], c[2]) > 40) put(f, last + 1, y, [12, 12, 14, 255]); }
}

// ── Sentado: quitar el asiento incorporado ──
const OUTLINE = [14, 12, 16, 255];
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const blue = (c) => c[3] > 127 && c[2] > c[0] + 10;
const lite = (c) => c[3] > 127 && Math.min(c[0], c[1], c[2]) > 120;
const brownish = (c) => c[3] > 127 && c[0] > c[2] + 12 && c[0] >= c[1];
// cierra con contorno los bordes de ropa que quedan al aire y quita píxeles sueltos
function closeEdges(f, erased, zone) {
  let ol = 0;
  for (const k of erased) {
    const [x, y] = k.split(',').map(Number);
    if (N4.some(([ax, ay]) => { const c = P.get(res, f * 48 + x + ax, y + ay); return c[3] > 127 && Math.max(c[0], c[1], c[2]) > 50; })) { put(f, x, y, OUTLINE); ol++; }
  }
  const [x0, x1, y0, y1] = zone;
  for (let pass = 0; pass < 2; pass++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (P.get(res, f * 48 + x, y)[3] < 128) continue;
    if (N4.filter(([ax, ay]) => P.get(res, f * 48 + x + ax, y + ay)[3] > 127).length <= 1) put(f, x, y, T);
  }
  return ol;
}
// F9 (frente): el tronco está entre las piernas y a los lados. Se conserva solo lo que es vaquero (azul),
// zapatilla (claro, y su detalle rojo junto a lo claro) y el contorno negro pegado a ellos.
{
  const f = 9, zones = [[0, 8, 60, 87], [19, 34, 64, 87], [38, 47, 60, 87]];
  const keep = (x, y) => {
    const c = at(sheet, f, x, y); if (c[3] < 128) return false;
    if (blue(c) || lite(c)) return true;
    const near = (pred, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (pred(at(sheet, f, x + i, y + j))) return true; return false; };
    if (c[0] > 140 && c[1] < 110 && y >= 74) return near(lite, 2); // detalle rojo de la zapatilla
    if (Math.max(c[0], c[1], c[2]) < 45 && !brownish(c)) return N4.some(([ax, ay]) => { const n = at(sheet, f, x + ax, y + ay); return blue(n) || lite(n); });
    return false;
  };
  const erased = new Set();
  for (const [x0, x1, y0, y1] of zones) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(sheet, f, x, y)[3] > 127 && !keep(x, y)) { put(f, x, y, T); erased.add(x + ',' + y); }
  const ol = closeEdges(f, erased, [0, 47, 60, 87]);
  log.push(`F9: asiento borrado ${erased.size} px, contorno ${ol} px`);
}
// F19 (espalda): la caja tapa todo lo que hay por debajo de la chaqueta. Se borra columna a columna
// desde su borde superior.
{
  const f = 19, erased = new Set();
  for (let x = 0; x <= 47; x++) {
    let top = -1; for (let y = 58; y <= 87; y++) if (brownish(at(sheet, f, x, y))) { top = y; break; }
    if (top < 0) continue;
    if (top > 58 && Math.max(...at(sheet, f, x, top - 1).slice(0, 3)) < 40) top--; // su contorno superior
    for (let y = top; y <= 87; y++) if (at(sheet, f, x, y)[3] > 127) { put(f, x, y, T); erased.add(x + ',' + y); }
  }
  const ol = closeEdges(f, erased, [0, 47, 56, 87]);
  log.push(`F19: caja borrada ${erased.size} px, contorno ${ol} px`);
}

// ── F19: las piernas quedaban ocultas por la caja. PROPUESTA (no es reconstrucción, es un montaje):
// pantorrillas y zapatillas de espaldas tomadas de F10, sin escalar, acortando el muslo 6 filas
// y separando cada pierna 3 px hacia fuera; solo se pinta donde F19 está vacío.
let lp = 0;
for (let t = 60; t <= 87; t++) {
  const sy = t >= 72 ? t : t - 6;
  for (let sx = 13; sx <= 35; sx++) {
    const c = at(sheet, 10, sx, sy); if (c[3] < 128) continue;
    if (sy < 63 && (sx < 15 || sx > 33)) continue; // manos de F10
    // solo vaquero, zapatilla y su contorno (no el bajo de la chaqueta de F10)
    const isLeg = blue(c) || lite(c) || (c[0] > 140 && c[1] < 110 && sy >= 74) || (Math.max(c[0], c[1], c[2]) < 45 && N4.some(([ax, ay]) => { const n = at(sheet, 10, sx + ax, sy + ay); return blue(n) || lite(n); }));
    if (!isLeg) continue;
    const tx = sx <= 24 ? sx - 3 : sx + 3;
    if (P.get(res, 19 * 48 + tx, t)[3] < 128) { put(19, tx, t, c); lp++; }
  }
}
log.push(`F19: piernas de F10 (montaje) ${lp} px`);
P.write(out, res);
console.log(log.join('\n'));
