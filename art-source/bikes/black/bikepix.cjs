// Convierte una ilustración de alta resolución en pixel art a un lienzo fijo:
// paleta limitada (k-means), reducción por color dominante de cada bloque (no promedio: conserva colores
// puros de pegatinas), alfa binario, limpieza de píxeles sueltos y contorno oscuro de 1 px.
// uso: node bikepix.cjs entrada.png salida.png [W=128] [H=112] [colores=32] [escala]
// Con «escala» el lienzo se calcula a partir de ella (objeto + 2 px por lado) y W/H se ignoran.
// MODE=avg: cada píxel es el promedio de su bloque cuantizado después a la paleta (menos ruido a tamaños pequeños).
const P = require('../../tony/corregidos/png.cjs');
const [inF, outF, Ws, Hs, Ks, Ss] = process.argv.slice(2);
let CW = +(Ws || 128), CH = +(Hs || 112);
const K = +(Ks || 32);
const src = P.read(inF);
const { w, h, data } = src;

// 1 · caja del objeto (alfa ≥ 128)
let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] >= 128) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
// cabe en el lienzo dejando 1 px para el contorno y 1 px abajo
const s = Ss ? +Ss : Math.min((CW - 4) / bw, (CH - 3) / bh);
if (Ss) { CW = Math.round(bw * s) + 4; CH = Math.round(bh * s) + 3; }
const tw = Math.round(bw * s), th = Math.round(bh * s);

// 2 · paleta por k-means sobre píxeles opacos (muestreo)
const samples = [];
for (let y = by0; y <= by1; y += 2) for (let x = bx0; x <= bx1; x += 2) { const i = (y * w + x) * 4; if (data[i + 3] >= 200) samples.push([data[i], data[i + 1], data[i + 2]]); }
let cent = [];
for (let k = 0; k < K; k++) cent.push(samples[Math.floor(((k + 0.5) / K) * samples.length)].slice());
// inicio k-means++ simplificado: repartir por luminancia
samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
cent = Array.from({ length: K }, (_, k) => samples[Math.floor(((k + 0.5) / K) * samples.length)].slice());
// añadir semillas de colores saturados (pegatinas) para que no se pierdan
const sat = samples.filter((c) => Math.max(...c) - Math.min(...c) > 90);
for (let k = 0; k < Math.min(8, sat.length); k++) cent[K - 1 - k] = sat[Math.floor(((k + 0.5) / 8) * sat.length)].slice();
const near = (c) => { let bi = 0, bd = 1e9; for (let k = 0; k < cent.length; k++) { const q = cent[k]; const d = (c[0] - q[0]) ** 2 * 0.3 + (c[1] - q[1]) ** 2 * 0.59 + (c[2] - q[2]) ** 2 * 0.11; if (d < bd) { bd = d; bi = k; } } return bi; };
for (let it = 0; it < 12; it++) {
  const acc = cent.map(() => [0, 0, 0, 0]);
  for (const c of samples) { const k = near(c); acc[k][0] += c[0]; acc[k][1] += c[1]; acc[k][2] += c[2]; acc[k][3]++; }
  cent = cent.map((q, k) => (acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : q));
}
cent = cent.map((q) => q.map(Math.round));

// 3 · reducción: cada píxel de destino toma el color de paleta dominante de su bloque (ponderado por alfa)
const out = P.blank(CW, CH);
const ox = Math.floor((CW - tw) / 2), oy = CH - 2 - th; // base del objeto en la fila CH-2
const idx = new Int16Array(CW * CH).fill(-1);
for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
  const sx0 = bx0 + Math.floor(x / s), sx1 = Math.min(bx1 + 1, bx0 + Math.floor((x + 1) / s));
  const sy0 = by0 + Math.floor(y / s), sy1 = Math.min(by1 + 1, by0 + Math.floor((y + 1) / s));
  const votes = new Float32Array(K); let cover = 0, n = 0;
  for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) {
    const i = (yy * w + xx) * 4; const a = data[i + 3] / 255; n++;
    if (a < 0.5) continue; cover++;
    const k = near([data[i], data[i + 1], data[i + 2]]);
    // los colores saturados (pegatinas, óxido, reflectores) pesan más para sobrevivir a la reducción
    const c = cent[k]; votes[k] += Math.max(...c) - Math.min(...c) > 90 ? 2.2 : 1;
  }
  if (cover / n < 0.42) continue;
  let bk = 0; for (let k = 1; k < K; k++) if (votes[k] > votes[bk]) bk = k;
  if (process.env.MODE === 'avg') {
    let r = 0, g = 0, b = 0, m = 0;
    for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) { const i = (yy * w + xx) * 4; if (data[i + 3] < 128) continue; r += data[i]; g += data[i + 1]; b += data[i + 2]; m++; }
    bk = near([r / m, g / m, b / m]);
  }
  idx[(oy + y) * CW + ox + x] = bk;
}
// 4 · limpieza: píxeles sueltos (≤ 1 vecino opaco) fuera
const opq = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH && idx[y * CW + x] >= 0;
for (let pass = 0; pass < 2; pass++) for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
  if (!opq(x, y)) continue;
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => opq(x + a, y + b)).length;
  if (nb <= 1 && ![[1, 1], [1, -1], [-1, 1], [-1, -1]].some(([a, b]) => opq(x + a, y + b))) idx[y * CW + x] = -1;
}
for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const k = idx[y * CW + x]; if (k >= 0) P.set(out, x, y, [...cent[k], 255]); }
// 5 · contorno oscuro de 1 px por fuera (4 vecinos), como el de Tony
const OUT = [20, 16, 24, 255];
const edge = [];
for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (!opq(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => opq(x + a, y + b))) edge.push([x, y]);
for (const [x, y] of edge) P.set(out, x, y, OUT);
P.write(outF, out);
console.log(JSON.stringify({ escala: +s.toFixed(4), objeto: [tw, th], lienzo: [CW, CH], base_y: CH - 2, colores: K + 1 }));
