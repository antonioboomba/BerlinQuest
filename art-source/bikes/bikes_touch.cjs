// Retoque a mano de las 4 bicis a la escala final (factor 0.0841 del original, ~46–57 × 47–52 px):
// se redibujan píxel a píxel los rasgos que las identifican y que la reducción borra.
// uso: node bikes_touch.cjs <black_basket|turquoise|green_cargo|red_locked> entrada.png salida.png
const P = require('../tony/corregidos/png.cjs');
const [which, inF, outF] = process.argv.slice(2);
const im = P.read(inF);
const C = {
  o: [20, 16, 24], // contorno
  k: [1, 0, 1], // tinta
  d: [14, 11, 11], // fondo oscuro
  m: [64, 58, 56], // metal oscuro
  M: [109, 98, 89], // metal medio
  r: [170, 158, 143], // metal claro
  P: [218, 211, 198], // papel / blanco roto
  W: [240, 236, 228], // blanco
  A: [229, 42, 41], // rojo
  S: [150, 40, 34], // rojo sombra
  x: [135, 88, 61], // óxido
  X: [174, 121, 83], // óxido claro
  Y: [240, 200, 60], // amarillo
  y: [176, 130, 30], // amarillo sombra / latón
  p: [236, 110, 170], // rosa
  t: [168, 112, 62], // madera clara
  T: [112, 72, 40], // madera oscura
  g: [64, 72, 44], // verde oliva oscuro
  G: [104, 116, 70], // verde oliva
  q: [60, 200, 90], // verde pegatina
};
const set = (x, y, k) => P.set(im, x, y, [...C[k], 255]);
const grid = (x0, y0, rows) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ' ') set(x0 + i, y0 + j, ch); }));

const BIKES = {
  // negra: cesta de alambre con la calavera y la (A)
  black_basket() {
    for (let y = 10; y <= 22; y++) for (let x = 4; x <= 21; x++) {
      let k = 'd';
      if (y === 10 || x === 21) k = 'o';
      else if (y === 11) k = 'm';
      else if (y === 12) k = 'd';
      else if (y === 13) k = x < 12 ? 'M' : 'm'; // borde delantero, con luz a la izquierda
      else if (y === 22) k = 'm';
      else if (x === 4) k = 'M';
      else if (x === 20) k = 'm';
      else if (x % 3 === 0 || y % 3 === 1) k = (x + y) % 4 ? 'k' : 'm';
      set(x, y, k);
    }
    for (let x = 4; x <= 21; x++) if (x < 7 || x > 9) set(x, 23, 'o'); // el faro (x 7–9) queda debajo
    grid(6, 15, ['PkkkP', 'kPkPk', 'kkkkk', 'PkPkP', 'PPPPr']); // calavera
    grid(13, 15, [' AAA ', 'A A A', 'AAAAA', 'AA AA', ' SSS ']); // (A)
    for (const [x, y] of [[9, 13], [16, 13], [19, 22]]) set(x, y, 'x');
  },
  // turquesa: pegatinas en los tubos y arañazos de óxido
  turquoise() {
    grid(29, 16, ['pp', 'pW', 'pp']); // pegatina rosa en el tubo del sillín
    grid(29, 22, ['YY', 'kY']); // sonrisa amarilla
    grid(19, 21, ['AW', 'WA']); // pegatina roja y blanca en el tubo inferior
    set(15, 16, 'W'); set(15, 17, 'P'); // pegatina blanca bajo el manillar
    for (const [x, y] of [[24, 14], [33, 14], [22, 27], [26, 29], [36, 26], [17, 24]]) set(x, y, 'X');
  },
  // verde de carga: caja de madera con pulpo rojo, paloma blanca y pegatina verde
  green_cargo() {
    for (let y = 9; y <= 21; y++) for (let x = 3; x <= 23; x++) {
      let k = (y - 10) % 3 === 2 ? 'T' : (x + y) % 5 === 0 ? 'T' : 't'; // tablones
      if (y === 9 || y === 21 || x === 3 || x === 23 || x === 13) k = y === 9 || x === 3 ? 'G' : 'g'; // marco de metal
      set(x, y, k);
    }
    for (let x = 2; x <= 24; x++) { set(x, 8, 'o'); set(x, 22, 'o'); }
    for (let y = 8; y <= 22; y++) { set(2, y, 'o'); set(24, y, 'o'); }
    for (let x = 4; x <= 22; x++) set(x, 11, 'A'); // pulpo rojo
    for (let y = 9; y <= 15; y++) set(17, y, 'A');
    set(17, 11, 'S');
    grid(6, 14, ['W W', 'WWW', ' W ']); // paloma
    grid(15, 17, ['qq', 'qk']); // pegatina verde
    grid(3, 18, ['WW', 'Pr']); // faro en la esquina de la caja
  },
  // roja: cadena enrollada al tubo superior y candado de latón
  red_locked() {
    for (const [x, y, k] of [[30, 12, 'r'], [31, 13, 'M'], [31, 14, 'r'], [32, 15, 'M'], [32, 16, 'r'], [31, 17, 'M'], [33, 13, 'r'], [33, 14, 'M']]) set(x, y, k);
    grid(30, 18, [' oo ', 'oYYo', 'oYyo', 'oyyo', ' oo ']); // candado
    set(31, 19, 'W');
    grid(13, 15, ['WP', 'Pr']); // faro
    set(16, 12, 'W'); set(17, 12, 'P'); // pegatina blanca del tubo de dirección
    set(20, 18, 'Y'); set(21, 18, 'Y'); // pegatina amarilla
  },
};
if (!BIKES[which]) throw new Error('bici desconocida: ' + which);
BIKES[which]();
P.write(outF, im);
