// Papelera naranja de la BSR para Kreuzberg a partir de papelera_referencia.png. La referencia es frontal, como
// las papeleras de antes, así que basta con reducirla con la paleta de la propia imagen (bikepix.cjs, MODE=avg)
// y contorno de 1 px. El anclaje es el pie del poste.
// uso: node papelera_build.cjs
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const SCALE = 0.042;
const log = execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), path.join(here, 'papelera_referencia.png'), path.join(here, 'papelera.png'), '0', '0', '28', String(SCALE)], { env: { ...process.env, MODE: 'avg' } }).toString();
const im = P.read(path.join(here, 'papelera.png'));
// caja del objeto en la referencia: x 376–870, y 154–1151; pie del poste ≈ (615, 1151)
const th = Math.round((1151 - 154 + 1) * SCALE);
const anchor = [Math.round((615 - 376) * SCALE) + 2, im.h - 2 - th + Math.round((1151 - 154) * SCALE)];
console.log(log.trim(), JSON.stringify({ anchor, size: [im.w, im.h] }));
