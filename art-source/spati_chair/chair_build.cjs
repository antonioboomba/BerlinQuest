// Silla de café (Späti) desde «Silla de café berlinesa en pixel art.png» (1278x1230, píxel de arte ≈ G px).
// 1) alfa >= 200 = silla (la sombra horneada, alfa 112-160, se descarta: el juego pone la suya)
// 2) NEAREST por celdas: el color es la mediana del centro de cada celda de GxG (desfase de rejilla elegido por
//    alineación con los bordes); celda opaca si >= 50 % de su centro es silla. 3) recorte + 1 px de margen.
// uso: node chair_build.cjs src.png out.png [G]
const path = require('path');
const fs = require('fs'); const near = path.resolve(__dirname, '../tony/corregidos/png.cjs');
const P = require(fs.existsSync(near) ? near : path.resolve('art-source/tony/corregidos/png.cjs'));
const s = P.read(process.argv[2]);
const OUT = process.argv[3];
const G = +(process.argv[4] || 13);
const isObj = (x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h && s.data[(y * s.w + x) * 4 + 3] >= 200;
// desfase: maximiza los cambios de color fuertes justo en las líneas de la rejilla
const edge = (x, y) => { const a = P.get(s, x, y), b = P.get(s, x - 1, y); return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); };
const edgeV = (x, y) => { const a = P.get(s, x, y), b = P.get(s, x, y - 1); return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); };
let bx = 0, by = 0, best = -1, bestY = -1;
for (let o = 0; o < G; o++) { let e = 0, f = 0;
  for (let y = 260; y < 1000; y += 3) for (let x = 350 + o; x < 900; x += G) if (isObj(x, y)) e += edge(x, y);
  for (let x = 350; x < 900; x += 3) for (let y = 260 + o; y < 1000; y += G) if (isObj(x, y)) f += edgeV(x, y);
  if (e > best) { best = e; bx = o; } if (f > bestY) { bestY = f; by = o; } }
const ox = 350 + bx - G * Math.ceil((350 + bx) / G), oy = 260 + by - G * Math.ceil((260 + by) / G);
const cw = Math.ceil((s.w - ox) / G), ch = Math.ceil((s.h - oy) / G);
const cells = [];
const m = Math.floor(G / 4); // centro de la celda: se ignora 1/4 por lado
for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
  const px = []; let tot = 0;
  for (let y = oy + cy * G + m; y < oy + (cy + 1) * G - m; y++) for (let x = ox + cx * G + m; x < ox + (cx + 1) * G - m; x++) { tot++; if (isObj(x, y)) px.push(P.get(s, x, y)); }
  if (px.length * 2 >= tot && tot) { const med = (k) => px.map((c) => c[k]).sort((a, b) => a - b)[px.length >> 1]; cells.push([cx, cy, [med(0), med(1), med(2), 255]]); }
}
let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
for (const [cx, cy] of cells) { x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy); }
const W = x1 - x0 + 3, H = y1 - y0 + 3;
const im = P.blank(W, H);
for (const [cx, cy, c] of cells) P.set(im, cx - x0 + 1, cy - y0 + 1, c);
P.write(OUT, im);
console.log(JSON.stringify({ G, offset: [ox, oy], size: [W, H] }));
