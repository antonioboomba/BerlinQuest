// Retoque a mano de la farola berlinesa a escala de juego (30×131): pegatinas del fuste legibles
// (oso de Berlín, pegatina roja y blanca, papel roto) y núcleo de la llama más brillante.
// uso: node farola_touch.cjs entrada.png salida.png
const P = require('../tony/corregidos/png.cjs');
const [inF, outF] = process.argv.slice(2);
const im = P.read(inF);
const C = { W: [236, 232, 222], w: [190, 184, 172], k: [16, 14, 18], R: [200, 40, 40], Y: [255, 248, 210], y: [255, 214, 120] };
const grid = (x0, y0, rows) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (C[ch]) P.set(im, x0 + i, y0 + j, [...C[ch], 255]); }));
grid(13, 66, ['WWWW', 'WkkW', 'kkkW', 'WkkW', 'WkWk', 'wwww']); // oso de Berlín
grid(13, 77, ['WWRR', 'WRRR', 'WWWR', 'Ww  ']); // pegatina roja y blanca
grid(14, 84, ['WW', 'Ww', 'w ']); // papel roto
grid(14, 29, [' Y ', 'YYY', 'yYy', ' y ']); // llama
P.write(outF, im);
