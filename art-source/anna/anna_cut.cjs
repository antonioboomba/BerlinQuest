// Recorta cada figura de la hoja de referencia (fondo oscuro con halo) por relleno desde el borde de su caja:
// es fondo lo semitransparente o lo oscuro y poco saturado que NO es contorno (el contorno, más oscuro, frena el relleno).
// uso: node anna_cut.cjs → figuras/fig_<fila>_<n>.png
const fs = require('fs');
const path = require('path');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const src = P.read(path.join(here, 'anna_referencia.png'));
const FIGS = {
  r1: { y0: 20, y1: 372, xs: [[540, 684], [729, 877], [912, 1073], [1112, 1267], [1319, 1455]] },
  r2: { y0: 380, y1: 662, xs: [[540, 669], [710, 844], [875, 1008], [1038, 1185], [1209, 1343], [1369, 1497]] },
};
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const isBg = (c) => c[3] < 230 || (lum(c) >= 33 && lum(c) < 75 && Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) < 20);
fs.mkdirSync(path.join(here, 'figuras'), { recursive: true });
for (const [row, f] of Object.entries(FIGS)) f.xs.forEach(([x0, x1], n) => {
  const w = x1 - x0 + 1, h = f.y1 - f.y0 + 1;
  const bg = new Uint8Array(w * h);
  const st = [];
  for (let x = 0; x < w; x++) st.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) st.push([0, y], [w - 1, y]);
  while (st.length) {
    const [x, y] = st.pop();
    if (x < 0 || y < 0 || x >= w || y >= h || bg[y * w + x]) continue;
    if (!isBg(P.get(src, x0 + x, f.y0 + y))) continue;
    bg[y * w + x] = 1;
    st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // el contorno que queda pegado al fondo (muy oscuro) se quita: bikepix vuelve a poner uno de 1 px
  const out = P.blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (bg[y * w + x]) continue;
    const c = P.get(src, x0 + x, f.y0 + y);
    P.set(out, x, y, [c[0], c[1], c[2], 255]);
  }
  P.write(path.join(here, 'figuras', `fig_${row}_${n}.png`), out);
});
console.log('ok');
