// Andén del U-Bahn reproducido de la referencia (anden_referencia.png: textura vista desde arriba con vía, bordillo,
// franja táctil amarilla, losas y guías táctiles). Cada píxel de una baldosa isométrica del juego (64×32) toma el punto
// (u, v) de un rectángulo de la referencia: «a lo largo» del andén y «a lo ancho» (alejándose de la vía). Cada
// rectángulo empieza en una junta y su largo es un número entero de piezas, así las baldosas encadenan sin cortes.
// Promedia 4×4 muestras y reduce a los colores de la propia referencia.
// Salida: atlas de 9 filas × 12 columnas de 64×32; cada fila es un tipo, con sus variantes de izquierda a derecha:
//   0 vía X · 1 vía Y · 2 borde X · 3 borde Y · 4 esquina del borde · 5 losas · 6 guía X · 7 guía Y · 8 cruce de guías
// («X» = a lo largo del eje x del mundo, vía en v = 0; «Y» = a lo largo del eje y, vía en u = 0)
// uso: node platform_atlas.cjs anden_referencia.png platform_ref.png
const P = require('../tony/corregidos/png.cjs');
const [inF, outF] = process.argv.slice(2);
const ref = P.read(inF);
const TW = 64, TH = 32, K = 32, COLS = 12;

// juntas medidas en la referencia (perfiles de luminancia)
const PERIOD = 147.9; // traviesas, bordillo y franja amarilla
const RAIL0 = 75; // junta del bordillo
const SLAB_COLS = [69, 179, 294, 413, 500, 616, 731, 846, 964, 1072, 1182, 1295, 1411, 1527, 1631, 1742];
// a lo ancho: vía 0–156, borde (remate + bordillo + franja amarilla) 156–333, losas 333–549 y 638–851, guía 549–638
const TRACK = [0, 156], EDGE = [156, 333], SLAB_ROWS = [[333, 549], [638, 851]], GUIDE_ROW = [444, 638];
// pares de losas sin guía (la guía vertical va de 413 a 500) y el par con la guía a la derecha
const SLAB_PAIRS = [[69, 294], [500, 731], [616, 846], [731, 964], [846, 1072], [964, 1182], [1072, 1295], [1182, 1411], [1295, 1527], [1411, 1631], [1527, 1742]];
const GUIDE_COL = [294, 500];
const trackRuns = [0, 1, 2, 3, 4].map((k) => [RAIL0 + 2 * k * PERIOD, RAIL0 + 2 * (k + 1) * PERIOD]);

// (u, v) del punto (px, py) de la baldosa: u de arriba a la derecha (eje x del mundo), v de arriba a la izquierda (eje y)
const tileUV = (px, py) => { const sx = px - TW / 2; return [(sx / (TW / 2) + py / (TH / 2)) / 2, (py / (TH / 2) - sx / (TW / 2)) / 2]; };
const sample = (along, across, a, c) => P.get(ref, Math.min(ref.w - 1, Math.round(along[0] + a * (along[1] - along[0]))), Math.min(ref.h - 1, Math.round(across[0] + c * (across[1] - across[0]))));

// cada baldosa: f(u, v) → color; «X» lee along = u, across = v; «Y» al revés
const X = (along, across) => (u, v) => sample(along, across, u, v);
const Y = (along, across) => (u, v) => sample(along, across, v, u);
const rows = [
  trackRuns.map((r) => X(r, TRACK)),
  trackRuns.map((r) => Y(r, TRACK)),
  trackRuns.map((r) => X(r, EDGE)),
  trackRuns.map((r) => Y(r, EDGE)),
  // esquina: inglete por la diagonal, cada mitad con su borde
  [(u, v) => (v <= u ? sample(trackRuns[0], EDGE, u, v) : sample(trackRuns[1], EDGE, v, u))],
  SLAB_PAIRS.flatMap((p) => SLAB_ROWS.map((r) => X(p, r))).slice(0, COLS),
  SLAB_PAIRS.slice(1, 7).map((p) => X(p, GUIDE_ROW)),
  // la guía vertical de la referencia ya corre a lo largo de v: se lee tal cual (x de la referencia = u)
  SLAB_ROWS.map((r) => X(GUIDE_COL, r)),
  [X(GUIDE_COL, GUIDE_ROW)],
];

const raw = [];
rows.forEach((fns, row) =>
  fns.forEach((f, col) => {
    for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
      const [u, v] = tileUV(px + 0.5, py + 0.5);
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
        const [uu, vv] = tileUV(px + (k + 0.5) / 4, py + (j + 0.5) / 4).map((w) => Math.min(0.999, Math.max(0, w)));
        const c = f(uu, vv);
        r += c[0]; g += c[1]; b += c[2]; n++;
      }
      raw.push({ x: col * TW + px, y: row * TH + py, c: [r / n, g / n, b / n] });
    }
  }),
);

// paleta de la propia referencia (k-means sobre los píxeles generados)
let cent = raw.filter((_, i) => i % Math.floor(raw.length / K) === 0).slice(0, K).map((p) => p.c.slice());
const near = (c) => { let bi = 0, bd = 1e9; cent.forEach((q, k) => { const dd = (c[0] - q[0]) ** 2 * 0.3 + (c[1] - q[1]) ** 2 * 0.59 + (c[2] - q[2]) ** 2 * 0.11; if (dd < bd) { bd = dd; bi = k; } }); return bi; };
for (let it = 0; it < 12; it++) {
  const acc = cent.map(() => [0, 0, 0, 0]);
  for (const p of raw) { const k = near(p.c); acc[k][0] += p.c[0]; acc[k][1] += p.c[1]; acc[k][2] += p.c[2]; acc[k][3]++; }
  cent = cent.map((q, k) => (acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : q));
}
const atlas = P.blank(COLS * TW, rows.length * TH);
for (const p of raw) P.set(atlas, p.x, p.y, [...cent[near(p.c)].map(Math.round), 255]);
P.write(outF, atlas);
console.log(JSON.stringify({ atlas: [atlas.w, atlas.h], variantes: rows.map((r) => r.length), colores: K }));
