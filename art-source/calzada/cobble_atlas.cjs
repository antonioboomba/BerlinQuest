// Adoquines de la calzada reproducidos de la referencia (adoquines_referencia.png: 4 baldosas en rombo con 4×4
// adoquines cada una). Cada píxel de una baldosa del juego (64×32) se corresponde con el mismo punto (u, v) del
// rombo de la referencia: arriba + u·(derecha − arriba) + v·(izquierda − arriba). Promedia 4×4 muestras y reduce
// el resultado a los colores de la propia referencia. Salida: atlas de 4 baldosas en fila (256×32).
// uso: node cobble_atlas.cjs adoquines_referencia.png cobble_ref.png
const P = require('../tony/corregidos/png.cjs');
const [inF, outF] = process.argv.slice(2);
const ref = P.read(inF);

// esquinas medidas de los 4 rombos (izquierda, derecha, arriba, abajo)
const TILES = [
  { L: [10, 362], R: [616, 362], T: [314, 186], B: [313, 559] },
  { L: [638, 363], R: [1243, 362], T: [941, 186], B: [940, 559] },
  { L: [10, 912], R: [616, 912], T: [313, 734], B: [313, 1109] },
  { L: [637, 920], R: [1243, 912], T: [940, 733], B: [940, 1109] },
];
const TW = 64, TH = 32, K = 24;
const tileUV = (px, py) => { const sx = px - TW / 2; return [(sx / (TW / 2) + py / (TH / 2)) / 2, (py / (TH / 2) - sx / (TW / 2)) / 2]; };

const raw = [];
TILES.forEach((d, i) => {
  // u va de arriba a la derecha, v de arriba a la izquierda (como los ejes de la baldosa del juego)
  const U = [d.R[0] - d.T[0], d.R[1] - d.T[1]];
  const V = [d.L[0] - d.T[0], d.L[1] - d.T[1]];
  for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
    const [u, v] = tileUV(px + 0.5, py + 0.5);
    if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
    let r = 0, g = 0, b = 0, n = 0;
    for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
      // muestras dentro del rombo (un pelo hacia dentro del borde para no leer el antialias exterior)
      const [uu, vv] = tileUV(px + (k + 0.5) / 4, py + (j + 0.5) / 4).map((w) => Math.min(0.995, Math.max(0.005, w)));
      const c = P.get(ref, Math.round(d.T[0] + uu * U[0] + vv * V[0]), Math.round(d.T[1] + uu * U[1] + vv * V[1]));
      if (c[3] < 128) continue;
      r += c[0]; g += c[1]; b += c[2]; n++;
    }
    if (n) raw.push({ x: i * TW + px, y: py, c: [r / n, g / n, b / n] });
  }
});

let cent = raw.filter((_, i) => i % Math.floor(raw.length / K) === 0).slice(0, K).map((p) => p.c.slice());
const near = (c) => { let bi = 0, bd = 1e9; cent.forEach((q, k) => { const dd = (c[0] - q[0]) ** 2 * 0.3 + (c[1] - q[1]) ** 2 * 0.59 + (c[2] - q[2]) ** 2 * 0.11; if (dd < bd) { bd = dd; bi = k; } }); return bi; };
for (let it = 0; it < 12; it++) {
  const acc = cent.map(() => [0, 0, 0, 0]);
  for (const p of raw) { const k = near(p.c); acc[k][0] += p.c[0]; acc[k][1] += p.c[1]; acc[k][2] += p.c[2]; acc[k][3]++; }
  cent = cent.map((q, k) => (acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : q));
}
const atlas = P.blank(TILES.length * TW, TH);
for (const p of raw) P.set(atlas, p.x, p.y, [...cent[near(p.c)].map(Math.round), 255]);
P.write(outF, atlas);
console.log(JSON.stringify({ atlas: [atlas.w, atlas.h], baldosas: TILES.length, colores: K }));
