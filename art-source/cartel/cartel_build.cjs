// Cartel «Techno Night» (soporte de póster con patas) para la plaza de Kreuzberg a partir de cartel_referencia.png.
// La referencia es frontal, como la columna de anuncios a la que sustituye: se reduce con la paleta de la propia
// imagen (bikepix.cjs, MODE=avg) y contorno de 1 px. El anclaje es el centro entre las patas.
// uso: node cartel_build.cjs
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const SCALE = 0.075;
const log = execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), path.join(here, 'cartel_referencia.png'), path.join(here, 'cartel.png'), '0', '0', '32', String(SCALE)], { env: { ...process.env, MODE: 'avg' } }).toString();
const im = P.read(path.join(here, 'cartel.png'));
// caja del objeto en la referencia: x 143–956, y 24–1402; centro entre las patas ≈ (551, 1402)
const th = Math.round((1402 - 24 + 1) * SCALE);
const anchor = [Math.round((551 - 143) * SCALE) + 2, im.h - 2 - th + Math.round((1402 - 24) * SCALE)];
console.log(log.trim(), JSON.stringify({ anchor, size: [im.w, im.h] }));
