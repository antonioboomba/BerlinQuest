// Retoque a mano de la bici negra 84×74: cesta de alambre redibujada con la pegatina de la calavera y la (A).
// Colores tomados de la paleta de la propia bici. uso: node bike84_touch.cjs entrada.png salida.png
const P = require('../../tony/corregidos/png.cjs');
const [inF, outF] = process.argv.slice(2);
const im = P.read(inF);
const C = {
  o: [20, 16, 24, 255], // contorno
  r: [170, 158, 143, 255], // borde de la cesta, luz
  R: [109, 98, 89, 255], // borde de la cesta, sombra
  d: [14, 11, 11, 255], // fondo oscuro
  m: [64, 58, 56, 255], // alambre
  M: [90, 80, 73, 255], // alambre con luz
  P: [218, 211, 198, 255], // papel
  s: [170, 158, 143, 255], // papel en sombra
  k: [1, 0, 1, 255], // tinta
  A: [229, 42, 41, 255], // rojo
  S: [178, 55, 36, 255], // rojo en sombra
  x: [135, 88, 61, 255], // óxido
};
const set = (x, y, k) => P.set(im, x, y, C[k]);
const grid = (x0, y0, rows) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ' ') set(x0 + i, y0 + j, ch); }));

// cesta: x 8–28, y 14–30 (el faro de debajo, x 11–13 y 31–34, se conserva)
for (let y = 14; y <= 30; y++) for (let x = 8; x <= 28; x++) {
  let k = 'd';
  if (y === 14 || x === 28) k = 'o';
  else if (y === 15) k = 'R'; // borde trasero
  else if (y === 16) k = 'd'; // interior
  else if (y === 17) k = 'r'; // borde delantero con luz
  else if (y === 30) k = 'R';
  else if (x === 8) k = 'r';
  else if (x === 27) k = 'R';
  else if (x % 3 === 1 || y % 3 === 2) k = (x + y) % 2 ? 'M' : 'm'; // malla de alambre
  set(x, y, k);
}
for (const x of [8, 9, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]) set(x, 31, 'o');
// óxido en el borde
for (const [x, y] of [[12, 17], [21, 17], [22, 17], [26, 30], [8, 24]]) set(x, y, 'x');

// pegatina de la calavera (7×8)
grid(10, 19, [
  'PPPPPPP',
  'PPkkkPP',
  'PkkkkkP',
  'PkPkPkP',
  'PkkkkkP',
  'PPkPkPs',
  'PPkPkss',
  'Psssss ',
]);
// (A) anarquista (7×7)
grid(19, 20, [
  '  AAA  ',
  ' A A A ',
  'A A A A',
  'A AAA A',
  'AA   AS',
  ' A   S ',
  '  SSS  ',
]);
P.write(outF, im);
