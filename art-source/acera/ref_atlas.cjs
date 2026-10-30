// Acera repetible a partir de la referencia (acera_referencia.png), sin texturas inventadas.
// La superficie de losas de la referencia (paralelogramo L-T-R) se trata en coordenadas (s, t): s a lo largo,
// t a lo ancho (0 = lado de la fachada, 1 = arista del bordillo). Se recortan sus piezas reales de junta a junta:
//   · 6 columnas de losas (las dos hileras comparten juntas, como en la referencia),
//   · 4 bloques de bordillo (juntas propias, más largos que las losas).
// Cada hilera se recompone encadenando piezas en un orden variado (semilla fija), así que todas las uniones caen
// en una junta y no hay cortes, reflejos ni periodos evidentes. En x = 0 va el remate del extremo de la referencia.
// Cada píxel del juego promedia 4×4 muestras y se reduce a 28 colores de la propia referencia.
// Salida: atlas de COLS × 3 baldosas de 64×32 (filas: y = 4, y = 5, cara del bordillo en y = 6); con «sur», 2 filas
// más para la acera sur (y = 9 con el bordillo hacia la calzada, y = 10), con su propia secuencia de piezas.
// uso: node ref_atlas.cjs acera_referencia.png sidewalk_ref.png [columnas=12] [semilla=7] [sur]
const P = require('../tony/corregidos/png.cjs');
const [inF, outF, colsArg, seedArg, southArg] = process.argv.slice(2);
const WITH_SOUTH = southArg === 'sur';
const ref = P.read(inF);
const COLS = +(colsArg || 12);
let seed = +(seedArg || 7);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// geometría medida en la referencia
const L = [27, 672], T = [972, 158], R = [1421, 413];
const A = [T[0] - L[0], T[1] - L[1]]; // eje largo (s)
const B = [R[0] - T[0], R[1] - T[1]]; // eje corto (t)
const SKEW = -0.039; // corrección: las juntas de la referencia se desvían un poco a lo largo de t
const LEN = 4.1; // la referencia mide 4,1 casillas de largo (2 de ancho)
const FACE_REF = 56; // alto de la cara del bordillo en la referencia (px)
const FACE_PX = Math.round((FACE_REF * 64) / B[0]); // en el juego (el ancho B mide 64 px de pantalla)
const ROW_SPLIT = 0.383; // junta entre las dos hileras de losas
const CURB_SPLIT = 0.888; // junta entre la segunda hilera y el bordillo
const SLAB_J = [0.035, 0.19, 0.358, 0.515, 0.673, 0.84, 0.995]; // juntas de las columnas de losas
const CURB_J = [0.025, 0.255, 0.478, 0.671, 0.837]; // juntas del bordillo

// ── secuencias (posiciones en casillas a lo largo de la acera) ──
const pieces = (J) => J.slice(0, -1).map((a, i) => [a, J[i + 1]]);
const SLABS = pieces(SLAB_J);
const CURBS = pieces(CURB_J);
function sequence(list, head) {
  const out = [{ x: 0, len: head * LEN, s0: 0, s1: head }]; // remate del extremo
  let x = head * LEN;
  const last = [-1, -1]; // ni la misma pieza seguida ni alternancias del tipo «a b a b»
  while (x < COLS + 1) {
    let k;
    do k = Math.floor(rnd() * list.length); while (list.length > 2 ? last.includes(k) : k === last[0]);
    last.unshift(k);
    last.length = 2;
    const [s0, s1] = list[k];
    out.push({ x, len: (s1 - s0) * LEN, s0, s1, k });
    x += (s1 - s0) * LEN;
  }
  return out;
}
/** Secuencias de una acera: columnas de losas, contenido de la 2.ª hilera y bloques de bordillo. */
function strip() {
  const slabSeq = sequence(SLABS, SLAB_J[0]);
  // la segunda hilera usa la misma columna (juntas alineadas) o, a veces, el contenido de otra columna
  const row2Src = slabSeq.map((p) => (p.k !== undefined && rnd() < 0.4 ? SLABS[(p.k + 1 + Math.floor(rnd() * (SLABS.length - 1))) % SLABS.length] : [p.s0, p.s1]));
  const curbSeq = sequence(CURBS, CURB_J[0]);
  return { slabSeq, row2Src, curbSeq };
}
const NORTH = strip();
const SOUTH = strip();
const PLAZA = strip(); // losas de la plaza sur (y = 11, y = 12)
const at = (seq, X) => { let i = 0; while (i + 1 < seq.length && seq[i + 1].x <= X) i++; return i; };

/** Punto de la referencia para la posición X (casillas) y el ancho t de la acera. */
function refPoint(X, t, { slabSeq, row2Src, curbSeq } = NORTH) {
  let s;
  if (t >= CURB_SPLIT) {
    const p = curbSeq[at(curbSeq, X)];
    s = p.s0 + ((X - p.x) / p.len) * (p.s1 - p.s0);
  } else {
    const i = at(slabSeq, X);
    const p = slabSeq[i];
    const [s0, s1] = t < ROW_SPLIT ? [p.s0, p.s1] : row2Src[i];
    s = s0 + ((X - p.x) / p.len) * (s1 - s0);
  }
  s += SKEW * (t - 0.5);
  return [L[0] + s * A[0] + t * B[0], L[1] + s * A[1] + t * B[1]];
}
/** Cara del bordillo: dz píxeles (del juego) por debajo de la arista. */
function facePoint(X, dz) {
  const { curbSeq } = NORTH;
  const p = curbSeq[at(curbSeq, X)];
  const s = p.s0 + ((X - p.x) / p.len) * (p.s1 - p.s0) + SKEW * 0.5;
  return [L[0] + s * A[0] + B[0], L[1] + s * A[1] + B[1] + (dz / FACE_PX) * FACE_REF];
}

const TW = 64, TH = 32;
const sample = (x, y) => { const c = P.get(ref, Math.round(x), Math.round(y)); return c[3] > 127 ? c : null; };
function avg(mapper, px, py) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const p = mapper(px + (i + 0.5) / 4, py + (j + 0.5) / 4);
    const c = p && sample(p[0], p[1]);
    if (c) { r += c[0]; g += c[1]; b += c[2]; n++; }
  }
  return n >= 8 ? [r / n, g / n, b / n] : null;
}
const tileUV = (px, py) => { const sx = px - TW / 2; return [(sx / (TW / 2) + py / (TH / 2)) / 2, (py / (TH / 2) - sx / (TW / 2)) / 2]; };

const raw = [];
for (let col = 0; col < COLS; col++) {
  for (const [row, y] of [[0, 4], [1, 5]]) {
    for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
      const [u, v] = tileUV(px + 0.5, py + 0.5);
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      const c = avg((fx, fy) => { const [uu, vv] = tileUV(fx, fy); return refPoint(col + uu, (y + vv - 4) / 2); }, px, py);
      if (c) raw.push({ x: col * TW + px, y: row * TH + py, c });
    }
  }
  if (WITH_SOUTH)
    for (const [row, y] of [[3, 9], [4, 10]]) {
      for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
        const [u, v] = tileUV(px + 0.5, py + 0.5);
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        const c = avg((fx, fy) => { const [uu, vv] = tileUV(fx, fy); return refPoint(col + uu, (11 - (y + vv)) / 2, SOUTH); }, px, py);
        if (c) raw.push({ x: col * TW + px, y: row * TH + py, c });
      }
    }
  if (WITH_SOUTH)
    // plaza (y = 11, y = 12): solo las dos hileras de losas de la referencia, sin bordillo
    for (const [row, y] of [[5, 11], [6, 12]]) {
      for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
        const [u, v] = tileUV(px + 0.5, py + 0.5);
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        const c = avg((fx, fy) => { const [uu, vv] = tileUV(fx, fy); return refPoint(col + uu, ((y + vv - 11) / 2) * CURB_SPLIT, PLAZA); }, px, py);
        if (c) raw.push({ x: col * TW + px, y: row * TH + py, c });
      }
    }
  for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
    const [u, v] = tileUV(px + 0.5, py + 0.5);
    if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
    const c = avg((fx, fy) => {
      const [uu, vv] = tileUV(fx, fy);
      const ue = uu - vv; // punto de la arista (y = 6) en la misma vertical de pantalla
      const dz = 2 * vv * (TH / 2);
      return ue < 0 || ue > 1 || dz < 0 || dz > FACE_PX ? null : facePoint(col + ue, dz);
    }, px, py);
    if (c) raw.push({ x: col * TW + px, y: 2 * TH + py, c });
  }
}

// 28 colores de la propia referencia (k-means sobre todas las muestras)
const K = 28;
let cent = raw.filter((_, i) => i % Math.floor(raw.length / K) === 0).slice(0, K).map((p) => p.c.slice());
const near = (c) => { let bi = 0, bd = 1e9; cent.forEach((q, k) => { const d = (c[0] - q[0]) ** 2 * 0.3 + (c[1] - q[1]) ** 2 * 0.59 + (c[2] - q[2]) ** 2 * 0.11; if (d < bd) { bd = d; bi = k; } }); return bi; };
for (let it = 0; it < 12; it++) {
  const acc = cent.map(() => [0, 0, 0, 0]);
  for (const p of raw) { const k = near(p.c); acc[k][0] += p.c[0]; acc[k][1] += p.c[1]; acc[k][2] += p.c[2]; acc[k][3]++; }
  cent = cent.map((q, k) => (acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : q));
}
const atlas = P.blank(COLS * TW, (WITH_SOUTH ? 7 : 3) * TH);
for (const p of raw) P.set(atlas, p.x, p.y, [...cent[near(p.c)].map(Math.round), 255]);
P.write(outF, atlas);
console.log(JSON.stringify({
  atlas: [atlas.w, atlas.h], columnas: COLS, cara_bordillo_px: FACE_PX, colores: K,
  losas_norte: NORTH.slabSeq.filter((p) => p.k !== undefined && p.x < COLS).map((p) => p.k).join(''),
  losas_sur: WITH_SOUTH ? SOUTH.slabSeq.filter((p) => p.k !== undefined && p.x < COLS).map((p) => p.k).join('') : '-',
}));
