// Mesa de terraza para Kreuzberg a partir de mesa_referencia.png. La mesa es redonda y la referencia ya está
// en una vista compatible con la isométrica del juego, así que basta con reducirla al 5 % con la paleta de la
// propia imagen (bikepix.cjs, MODE=avg) y contorno de 1 px. El anclaje es el centro de las cuatro patas.
// uso: node mesa_build.cjs
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const SCALE = 0.05;
const log = execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), path.join(here, 'mesa_referencia.png'), path.join(here, 'mesa.png'), '0', '0', '28', String(SCALE)], { env: { ...process.env, MODE: 'avg' } }).toString();
const im = P.read(path.join(here, 'mesa.png'));
// caja del objeto en la referencia: x 117–1133, y 36–1199; centro de las patas ≈ (612, 1085)
const th = Math.round((1199 - 36 + 1) * SCALE);
const anchor = [Math.round((612 - 117) * SCALE) + 2, im.h - 2 - th + Math.round((1085 - 36) * SCALE)];
console.log(log.trim(), JSON.stringify({ anchor, size: [im.w, im.h] }));
