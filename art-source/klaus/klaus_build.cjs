// Hoja de Klaus (960x88, 20 fotogramas de 48x88) a partir de klaus_referencia.png (misma maqueta que la de Anna:
// fila 1 de pie en 5 vistas, fila 2 andando de perfil, fila 3 sentado en un banco). El fondo de esta hoja ya es
// transparente (el halo es semitransparente), así que cada figura se recorta por alfa.
// Correspondencia (frente = mira a la derecha de la pantalla, SE; espalda = de espaldas hacia arriba a la derecha, NE):
//   0-1 reposo -> 3/4 de frente (r1_1), el 1 respirando · 2-5 andar -> perfil (r2_0..r2_3)
//   6-7 (y 16-17) -> otras poses sentado: fumando (r3_1), periódico (r3_2); 8/18 = sentado normal (las figuras
//   r3_3 y r3_4 llevan un bocadillo pegado a la cabeza y no se usan)
//   9 sentado -> r3_0 sin el banco pintado (el juego pone su propio banco) · 10-11 reposo esp. -> r1_3
//   12-15 andar esp. -> paso de espaldas (r2_4), paso intermedio, el otro pie, paso intermedio · 19 sentado -> r3_0
// Igual que con Anna: paso acortado (parecía correr), borde de la referencia teñido en vez de doble contorno negro,
// y ojos/gafas reforzados desde la referencia.
// uso: node klaus_build.cjs
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;
const REF = P.read(path.join(here, 'klaus_referencia.png'));
const figDir = path.join(here, 'figuras');
const tmp = path.join(figDir, 'tmp');
fs.rmSync(figDir, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

// 1 · recorte por alfa
const ROWS = {
  r1: { y0: 15, y1: 330, xs: [[528, 673], [739, 863], [952, 1056], [1144, 1260], [1340, 1481]] },
  r2: { y0: 340, y1: 600, xs: [[525, 653], [713, 848], [909, 1050], [1110, 1255], [1333, 1468]] },
  r3: { y0: 610, y1: 910, xs: [[512, 697], [715, 896], [911, 1095], [1110, 1295], [1310, 1496]] },
};
const fig = (n) => path.join(figDir, `fig_${n}.png`);
const isWood = (c) => c[3] >= 200 && c[0] > 140 && c[1] > 70 && c[1] < 135 && c[2] < 90 && c[0] - c[2] > 80;
// listones del respaldo en la fila y = 770: el primero y el último tramo de madera de la figura
const slatMemo = {};
const slats = (x0, x1) => {
  if (slatMemo[x0]) return slatMemo[x0];
  const runs = [];
  let st = -1;
  for (let x = x0; x <= x1 + 1; x++) {
    const w = x <= x1 && isWood(P.get(REF, x, 770));
    if (w && st < 0) st = x;
    if (!w && st >= 0) { if (x - st > 3) runs.push([st, x - 1]); st = -1; }
  }
  return (slatMemo[x0] = { L: runs[0][1], R: runs[runs.length - 1][0] });
};
// extremos visibles del asiento en la fila y = 835: fin del primer tramo de madera y comienzo del primero que hay
// a la derecha de las piernas (más allá de L + 90)
const seatMemo = {};
const seatEnds = (x0, x1, L) => {
  if (seatMemo[x0]) return seatMemo[x0];
  const runs = [];
  let st = -1;
  for (let x = x0; x <= x1 + 1; x++) {
    const w = x <= x1 && isWood(P.get(REF, x, 835));
    if (w && st < 0) st = x;
    if (!w && st >= 0) { if (x - st > 3) runs.push([st, x - 1]); st = -1; }
  }
  const right = runs.find(([a]) => a > L + 90);
  return (seatMemo[x0] = { l: runs[0][1], r: right ? right[0] : x1 });
};
// tabla del asiento vista entre las piernas: filas (y 815-860) con más de 6 px de madera en x L+40..L+90 (sin el
// bastón), y su extensión horizontal
const boardMemo = {};
const seatBoard = (L) => {
  if (L in boardMemo) return boardMemo[L];
  let top = -1, bot = -1, x0 = 1e9, x1 = -1;
  for (let y = 815; y <= 860; y++) {
    let n = 0;
    for (let x = L + 40; x <= L + 90; x++) if (!caneCols(L).has(x) && isWood(P.get(REF, x, y))) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    if (n > 6) { if (top < 0) top = y; bot = y; }
  }
  return (boardMemo[L] = top < 0 ? null : { top, bot, x0, x1 });
};
// columnas del bastón en una figura sentada: madera por debajo del asiento (y 850-895), con su contorno (±3 px)
const caneMemo = {};
const caneCols = (L) => {
  if (caneMemo[L]) return caneMemo[L];
  const set = new Set();
  for (let x = L + 40; x <= L + 90; x++) {
    let n = 0;
    for (let y = 850; y <= 895; y++) { const c = P.get(REF, x, y); if (c[3] >= 200 && c[0] > 140 && c[1] > 70 && c[2] < 100 && c[0] - c[2] > 70) n++; }
    if (n > 8) for (let d = -3; d <= 3; d++) set.add(x + d);
  }
  return (caneMemo[L] = set);
};
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
for (const [row, f] of Object.entries(ROWS)) f.xs.forEach(([x0, x1], n) => {
  const w = x1 - x0 + 1, h = f.y1 - f.y0 + 1;
  const out = P.blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = P.get(REF, x0 + x, f.y0 + y);
    if (c[3] < 200) continue;
    const rx = x0 + x, ry = f.y0 + y;
    if (row === 'r3') {
      // banco pintado (Klaus no se sienta en el mismo sitio del banco en cada figura, así que se mide en cada una
      // dónde acaban los listones del respaldo, L = fin del izquierdo y R = inicio del derecho): fuera lo que queda a
      // los lados del cuerpo, los listones junto al abrigo y la tabla del asiento entre las piernas, salvo el bastón
      const { L, R } = slats(x0, x1);
      if (ry < 660) continue; // bocadillo «…» encima de la cabeza
      if (rx < L + 5 || rx > R + 5) continue;
      if (ry >= 745 && ry <= 815 && (rx < L + 9 || rx > R - 6)) continue;
      // tabla del asiento entre las piernas: se localiza en cada figura (filas con madera entre las piernas) y se
      // quita solo la madera, su contorno justo encima y debajo, y la sombra casi negra que queda por debajo; nada por
      // encima de la tabla (la sombra entre los muslos es parte de las piernas) ni la tela del pantalón
      if (rx >= L + 40 && rx <= L + 90 && !caneCols(L).has(rx)) {
        const sb = seatBoard(L);
        if (sb) {
          if (ry >= sb.top && ry <= sb.bot && isWood(c)) continue;
          if (ry >= sb.top - 4 && ry <= sb.bot + 4 && lum(c) < 40 && rx >= sb.x0 - 2 && rx <= sb.x1 + 2) continue;
          if (ry > sb.bot + 4 && ry <= 872 && lum(c) < 30) continue;
          // astillas de la tabla con madera más apagada (rojiza), que la regla de madera no pilla
          if (ry >= sb.top - 4 && ry <= sb.bot + 4 && rx >= sb.x0 - 2 && rx <= sb.x1 + 2 && c[0] > 100 && c[0] - c[2] > 45) continue;
        }
      }
      // asiento y patas del banco a los lados de las piernas: desde el asiento hacia abajo, solo entre sus extremos
      const seat = seatEnds(x0, x1, L);
      if (ry >= 815 && (rx < seat.l + 4 || rx > seat.r - 4)) continue;
    }
    P.set(out, x, y, [c[0], c[1], c[2], 255]);
  }
  // quitar islas sueltas (restos del banco o del halo): solo queda el componente conectado más grande
  const seen = new Int32Array(w * h).fill(-1);
  let bestId = -1, bestN = 0, id = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (seen[y * w + x] >= 0 || P.get(out, x, y)[3] < 128) continue;
    const st = [[x, y]];
    let cnt = 0;
    seen[y * w + x] = id;
    while (st.length) {
      const [a, b] = st.pop();
      cnt++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = a + dx, yy = b + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h || seen[yy * w + xx] >= 0 || P.get(out, xx, yy)[3] < 128) continue;
        seen[yy * w + xx] = id;
        st.push([xx, yy]);
      }
    }
    if (cnt > bestN) { bestN = cnt; bestId = id; }
    id++;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (seen[y * w + x] !== bestId) P.set(out, x, y, [0, 0, 0, 0]);
  P.write(fig(`${row}_${n}`), out);
});

// 2 · escala: las tres filas están dibujadas a la misma escala (el gorro mide lo mismo a igual profundidad), así
// que se usa una sola: Klaus mide 80 px de pie; andando va encorvado y sentado, más bajo, como en la referencia
const H1 = 80;
const heightOf = (f) => { const im = P.read(f); let y0 = im.h, y1 = -1; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return y1 - y0 + 1; };
const S1 = H1 / Math.max(...[0, 1, 2, 3, 4].map((i) => heightOf(fig(`r1_${i}`))));
const scaleOf = () => S1;

// 3 · paso acortado en las figuras de andar (por debajo de la cadera, x se acerca al centro del torso).
// Variantes por nombre: «r2_4~pass» = piernas casi juntas (paso intermedio), «r2_4~flip» = piernas reflejadas
// (el otro pie delante). Con ellas se arma el andar de espaldas a partir del único paso de espaldas de la hoja,
// sin mezclarlo con la pose erguida (que mide 16 px más y hacía que pareciera quieto dando saltitos).
const STRIDE = 0.6;
const srcOf = (n) => {
  const [base, mod] = n.split('~');
  if (!base.startsWith('r2')) return fig(base);
  const out = path.join(tmp, `${n.replace('~', '_')}_paso.png`);
  if (fs.existsSync(out)) return out;
  const im = P.read(fig(base));
  let y0 = im.h, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  let tx0 = im.w, tx1 = -1;
  for (let y = Math.round(y0 + (y1 - y0) * 0.35); y <= Math.round(y0 + (y1 - y0) * 0.5); y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); }
  const cx = (tx0 + tx1) / 2, hip = y0 + (y1 - y0) * 0.55;
  const stride = mod === 'pass' ? 0.35 : STRIDE;
  const flip = mod === 'flip' ? -1 : 1;
  const res = P.blank(im.w, im.h);
  for (let y = 0; y < im.h; y++) {
    const legs = y > hip;
    const k = legs ? 1 - (1 - stride) * ((y - hip) / (y1 - hip)) : 1;
    const f = legs ? flip : 1;
    for (let x = 0; x < im.w; x++) P.set(res, x, y, P.get(im, Math.round(cx + (f * (x - cx)) / k), y));
  }
  P.write(out, res);
  return out;
};

// 4 · ojos y gafas: píxel muy oscuro con piel a ambos lados en la parte de arriba -> bloque casi negro
function enhance(n, im, scale) {
  const src = P.read(srcOf(n));
  let bx0 = src.w, by0 = src.h, by1 = -1;
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (P.get(src, x, y)[3] > 127) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
  const skin = (c) => c[3] > 127 && c[0] > 170 && c[1] > 100 && c[1] < 180 && c[2] < 150 && c[0] - c[2] > 55;
  const top = by0 + (by1 - by0) * (n.startsWith('r3') ? 0.4 : 0.3);
  const eye = (x, y) => {
    const c = P.get(src, x, y);
    if (y > top || c[3] < 128 || lum(c) > 55) return false;
    let l = false, r = false;
    for (let d = 1; d < 9; d++) { if (skin(P.get(src, x - d, y))) l = true; if (skin(P.get(src, x + d, y))) r = true; }
    return l && r;
  };
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    if (P.get(im, x, y)[3] < 128) continue;
    const sx0 = Math.round(bx0 + (x - 2) / scale), sx1 = Math.round(bx0 + (x - 1) / scale);
    const sy0 = Math.round(by0 + (y - 1) / scale), sy1 = Math.round(by0 + y / scale);
    let k = 0, e = 0;
    for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) { k++; if (eye(xx, yy)) e++; }
    if (k && e / k >= 0.3) P.set(im, x, y, [30, 22, 26, 255]);
  }
  return im;
}

// 5 · borde: fuera el anillo negro de bikepix; el borde que queda se tiñe del vecino interior oscurecido
function softEdge(im) {
  const OUT = [20, 16, 24];
  const op = (x, y) => x >= 0 && y >= 0 && x < im.w && y < im.h && P.get(im, x, y)[3] > 127;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const c = P.get(im, x, y); if (c[3] > 127 && c[0] === OUT[0] && c[1] === OUT[1] && c[2] === OUT[2]) P.set(im, x, y, [0, 0, 0, 0]); }
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const ring = [];
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (op(x, y) && N4.some(([a, b]) => !op(x + a, y + b))) ring.push([x, y]);
  const isRing = new Set(ring.map(([x, y]) => y * im.w + x));
  for (const [x, y] of ring) {
    let best = null;
    for (const [a, b] of [...N4, [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const xx = x + a, yy = y + b; if (op(xx, yy) && !isRing.has(yy * im.w + xx)) { best = P.get(im, xx, yy); break; } }
    if (!best) continue;
    P.set(im, x, y, [Math.round(best[0] * 0.45 + 12), Math.round(best[1] * 0.45 + 9), Math.round(best[2] * 0.45 + 14), 255]);
  }
  return im;
}

const cache = {};
const small = (n) => {
  if (cache[n]) return cache[n];
  const out = path.join(tmp, `${n}.png`);
  execFileSync('node', [path.join(here, '../bikes/black/bikepix.cjs'), srcOf(n), out, '0', '0', '32', String(scaleOf(n))], { env: { ...process.env, MODE: 'avg' } });
  return (cache[n] = softEdge(enhance(n, P.read(out), scaleOf(n))));
};

// 6 · hoja: pies en la fila 85 como Tony, torso centrado
const FW = 48, FH = 88, FEET = 85;
const sheet = P.blank(FW * 20, FH);
const put = (f, n, bob = 0) => {
  const im = small(n);
  let x0 = im.w, x1 = -1, y0 = im.h, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const t0 = Math.round(y0 + (y1 - y0) * 0.35), t1 = Math.round(y0 + (y1 - y0) * 0.6);
  let tx0 = im.w, tx1 = -1;
  for (let y = t0; y <= t1; y++) for (let x = 0; x < im.w; x++) if (P.get(im, x, y)[3] > 127) { tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); }
  const dx = Math.round(FW / 2 - (tx0 + tx1 + 1) / 2), dy = FEET - y1;
  const waist = y0 + (y1 - y0) * 0.55;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = P.get(im, x, y);
    if (c[3] < 128) continue;
    const X = x + dx;
    if (X < 0 || X >= FW) continue;
    P.set(sheet, f * FW + X, y + dy + (bob && y < waist ? 1 : 0), c);
  }
};
const FRONT = { idle: 'r1_1', walk: ['r2_0', 'r2_1', 'r2_2', 'r2_3'], sit: 'r3_0' };
const BACK = { idle: 'r1_3', step: 'r2_4' };
put(0, FRONT.idle); put(1, FRONT.idle, 1);
FRONT.walk.forEach((n, i) => put(2 + i, n));
// Klaus nunca lleva nada: los huecos de «llevar» (6-8 y 16-18) guardan las otras poses sentadas, que el
// manifiesto encadena en su animación de sentado (fumando, leyendo el periódico)
put(6, 'r3_1'); put(7, 'r3_2'); put(8, FRONT.sit); put(9, FRONT.sit);
put(10, BACK.idle); put(11, BACK.idle, 1);
put(12, BACK.step); put(13, `${BACK.step}~pass`); put(14, `${BACK.step}~flip`); put(15, `${BACK.step}~pass`);
put(16, 'r3_1'); put(17, 'r3_2'); put(18, FRONT.sit); put(19, FRONT.sit);
P.write(path.join(here, 'klaus_960x88.png'), sheet);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ S1: +S1.toFixed(4) }));
