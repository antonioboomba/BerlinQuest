// Carlo (Türsteher) desde «Tursteher - Sprite.png» (2172x724, 22 figuras en fila: 11 de frente, 11 de espaldas,
// la última de cada grupo sentada). Escala uniforme H=80 (pies en fila 85, cabeza centrada en x=24), muestreo por
// área con alfa, alfa binario, paleta común k-means de 32 colores. uso: node carlo_build.cjs src.png png.cjs out.png
const P = require(process.argv[3] || "../tony/corregidos/png.cjs");
const src = P.read(process.argv[2]);
const OUT = process.argv[4];
const { w, h } = src;
const A = (x, y) => src.data[(y * w + x) * 4 + 3];
// 1 · figuras = rachas de columnas con alfa > 128
const runs = []; let st = -1;
for (let x = 0; x <= w; x++) { let on = false; if (x < w) for (let y = 0; y < h; y++) if (A(x, y) > 128) { on = true; break; }
  if (on && st < 0) st = x; if (!on && st >= 0) { runs.push([st, x - 1]); st = -1; } }
if (runs.length !== 22) throw new Error('esperaba 22 figuras, hay ' + runs.length);
const figs = runs.map(([a, b]) => { let y0 = h, y1 = -1; for (let y = 0; y < h; y++) for (let x = a; x <= b; x++) if (A(x, y) > 128) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  // centro de la cabeza: media de x opaca en las 30 filas superiores
  let sx = 0, n = 0; for (let y = y0; y < y0 + 30; y++) for (let x = a; x <= b; x++) if (A(x, y) > 128) { sx += x; n++; }
  return { a, b, y0, y1, hx: sx / n }; });
const BASE = Math.max(...figs.map((f) => f.y1));
const standH = Math.max(...figs.filter((f, i) => i !== 10 && i !== 21).map((f) => f.y1 - f.y0 + 1));
const H = 80, S = H / standH, FW = 48, FH = 88, FEET = 85;
// 2 · asignación de frames: f = frente (0-10), b = espaldas (11-21)
const f = (i) => i, b = (i) => 11 + i;
const MAP = [f(0), f(1), f(3), f(2), f(4), f(5), f(7), f(8), f(9), f(10),
             b(0), b(1), b(3), b(2), b(5), b(6), b(7), b(8), b(4), b(10)];
// 3 · muestreo por área
function sample(fig) {
  const out = []; const inv = 1 / S; let lost = 0;
  for (let Y = 0; Y < FH; Y++) for (let X = 0; X < FW; X++) {
    const sx0 = fig.hx + (X - 24) * inv, sy0 = BASE + 1 + (Y - FEET - 1) * inv, sx1 = sx0 + inv, sy1 = sy0 + inv;
    let r = 0, g = 0, bl = 0, al = 0, area = 0;
    for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
      const wy = Math.min(y + 1, sy1) - Math.max(y, sy0), wx = Math.min(x + 1, sx1) - Math.max(x, sx0); const wgt = wx * wy; area += wgt;
      if (x < fig.a - 1 || x > fig.b + 1 || y < 0 || y >= h) continue; // solo la figura propia
      const i = (y * w + x) * 4, a = src.data[i + 3] / 255 * wgt; r += src.data[i] * a; g += src.data[i + 1] * a; bl += src.data[i + 2] * a; al += a; }
    const cov = al / area;
    out.push(cov >= 0.5 ? [r / al, g / al, bl / al] : null);
  }
  // ¿se sale algo del fotograma?
  const lx = fig.hx + (0 - 24) * inv, rx = fig.hx + (FW - 24) * inv;
  for (let y = fig.y0; y <= fig.y1; y++) for (let x = fig.a; x <= fig.b; x++) if (A(x, y) > 128 && (x < lx || x >= rx)) lost++;
  return { px: out, lost };
}
const frames = MAP.map((i) => sample(figs[i]));
// 4 · paleta común
const samples = []; for (const fr of frames) for (const c of fr.px) if (c) samples.push(c);
samples.sort((p, q) => p[0] + p[1] + p[2] - (q[0] + q[1] + q[2]));
const K = 32; let cent = Array.from({ length: K }, (_, k) => samples[Math.floor(((k + 0.5) / K) * samples.length)].slice());
const near = (c) => { let bi = 0, bd = 1e9; for (let k = 0; k < K; k++) { const q = cent[k]; const d = (c[0] - q[0]) ** 2 * 0.3 + (c[1] - q[1]) ** 2 * 0.59 + (c[2] - q[2]) ** 2 * 0.11; if (d < bd) { bd = d; bi = k; } } return bi; };
for (let it = 0; it < 15; it++) { const acc = cent.map(() => [0, 0, 0, 0]);
  for (const c of samples) { const k = near(c); acc[k][0] += c[0]; acc[k][1] += c[1]; acc[k][2] += c[2]; acc[k][3]++; }
  cent = cent.map((q, k) => (acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : q)); }
cent = cent.map((q) => q.map(Math.round));
// 5 · hoja
const sheet = P.blank(FW * 20, FH);
frames.forEach((fr, k) => fr.px.forEach((c, j) => { if (c) P.set(sheet, k * FW + (j % FW), Math.floor(j / FW), [...cent[near(c)], 255]); }));
// limpieza: píxeles sueltos sin vecinos opacos
const op = (x, y) => x >= 0 && y >= 0 && x < FW * 20 && y < FH && P.get(sheet, x, y)[3] > 0;
for (let y = 0; y < FH; y++) for (let x = 0; x < FW * 20; x++) if (op(x, y) && !op(x - 1, y) && !op(x + 1, y) && !op(x, y - 1) && !op(x, y + 1)) P.set(sheet, x, y, [0, 0, 0, 0]);
P.write(OUT, sheet);
console.log(JSON.stringify({ src: [w, h], figuras: runs.length, S: +S.toFixed(4), standH, BASE, perdidos: frames.map((x) => x.lost) }));
