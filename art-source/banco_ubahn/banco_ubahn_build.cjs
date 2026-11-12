// Banco metálico del andén del U-Bahn a partir de banco_ubahn_referencia.png (cuatro asientos de chapa perforada,
// bastidor gris oscuro con desgaste amarillo, reposabrazos y patas con placa atornillada).
// En el andén los bancos miran a las vías (al fondo de la pantalla), así que la cámara los ve POR DETRÁS: la
// referencia solo muestra el frente, de modo que aquí se modela el banco en 3D (cajas) con sus medidas y colores,
// y se rasteriza en la proyección del juego (x → 32,16 px por casilla; altura en px) con búfer de profundidad.
// Eje largo = x del mundo, frente hacia −y (las vías), respaldo hacia +y (la cámara). Gleis 2 usa el reflejo.
// uso: node banco_ubahn_build.cjs   (genera banco_ubahn.png e imprime anclaje y tamaño)
const path = require('path');
const P = require('../tony/corregidos/png.cjs');
const here = __dirname;

const L = 51; // 1,6 casillas
const D = 15; // ~0,47 casillas
const hexc = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
// paleta tomada de la referencia
const FRAME = { top: '#76767a', left: '#5a5a5e', right: '#3e3e42' };
const STEEL = { top: '#bdb9b1', left: '#a6a29b', right: '#85827c' };
const HOLE = '#34323a';
const YEL = '#c9a23a';
const YEL_HI = '#e2bf58';
const RIVET = '#d8d8dc';
const OUT = '#1c1a20';

const boxes = [];
const box = (u0, u1, v0, v1, z0, z1, mat, extra = {}) => boxes.push({ u0, u1, v0, v1, z0, z1, mat, ...extra });

// patas con placa atornillada
for (const c of [8.5, L - 8.5]) {
  box(c - 4, c + 4, 2.5, 12, 0, 2, FRAME, { kind: 'foot' });
  box(c - 1.5, c + 1.5, 5.5, 9, 2, 12, FRAME, { kind: 'leg' });
}
// travesaño bajo el asiento
box(3, L - 3, 5.5, 9, 10, 13, FRAME, { kind: 'beam' });
// asientos y respaldos: 4 piezas de chapa perforada con 1 px de separación
const SW = (L - 6 - 3) / 4;
for (let i = 0; i < 4; i++) {
  const a = 3 + i * (SW + 1), b = a + SW;
  box(a, b, 0, 12, 13, 15, STEEL, { kind: 'seat' });
  box(a, b, 12, 13.5, 15, 29, STEEL, { kind: 'back', pu: a, pz: 15 });
}
// bastidor: postes traseros, barra superior, reposabrazos con poste delantero y larguero bajo
for (const [a, b] of [[0, 3], [L - 3, L]]) {
  box(a, b, 11, 15, 12, 32, FRAME, { kind: 'post' });
  box(a, b, 0, 11, 20, 23, FRAME, { kind: 'arm' });
  box(a, b, 0, 3, 12, 20, FRAME, { kind: 'armpost' });
  box(a, b, 0, 11, 12, 14.5, FRAME, { kind: 'side' });
}
box(0, L, 11.5, 15, 29, 32, FRAME, { kind: 'rail' });

// hash determinista para el desgaste
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const OX = D + 3, OY = 32 + 3;
const W = L + D + 6, H = Math.ceil((L + D) / 2) + 32 + 6;
const img = P.blank(W, H);
const zb = new Float32Array(W * H).fill(-1e9);
const plot = (u, v, z, col) => {
  const sx = Math.floor(u - v + OX), sy = Math.floor((u + v) / 2 - z + OY);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
  const n = u + v + z;
  const i = sy * W + sx;
  if (n < zb[i]) return;
  zb[i] = n;
  P.set(img, sx, sy, hexc(col(sx, sy)));
};
const ST = 0.2;
for (const b of boxes) {
  const wear = (base) => (sx, sy) => {
    if (b.mat !== FRAME) return base;
    const h = hash(sx, sy);
    return h < 0.022 ? YEL : base;
  };
  // tapa superior
  for (let u = b.u0; u <= b.u1; u += ST) for (let v = b.v0; v <= b.v1; v += ST)
    plot(u, v, b.z1, (sx, sy) => {
      if (b.kind === 'arm' && v < 3.5) return hash(sx, sy) < 0.5 ? YEL_HI : YEL; // desgaste en la punta del reposabrazos
      return wear(b.mat.top)(sx, sy);
    });
  // cara +y (hacia abajo a la izquierda en pantalla, iluminada)
  for (let u = b.u0; u <= b.u1; u += ST) for (let z = b.z0; z <= b.z1; z += ST)
    plot(u, b.v1, z, (sx, sy) => {
      if (b.kind === 'back') {
        const du = Math.floor(u - b.pu), dz = Math.floor(z - b.pz);
        if (du >= 2 && du <= SW - 2 && dz >= 2 && dz <= 12 && du % 2 === 0 && dz % 2 === 0) return HOLE;
        if (du === 0) return STEEL.right;
      }
      if (b.kind === 'post' && Math.floor(z) % 13 === 4 && Math.floor(u) % 3 === 1) return RIVET;
      if (b.kind === 'foot' && z > 1 && (Math.floor(u - b.u0) === 1 || Math.floor(b.u1 - u) === 1)) return RIVET;
      return wear(b.mat.left)(sx, sy);
    });
  // cara +x (hacia abajo a la derecha, en sombra)
  for (let v = b.v0; v <= b.v1; v += ST) for (let z = b.z0; z <= b.z1; z += ST)
    plot(b.u1, v, z, wear(b.mat.right));
}

// contorno oscuro de 1 px
const solid = (x, y) => P.get(img, x, y)[3] > 127;
const out = P.blank(W, H);
img.data.copy(out.data);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
  if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) P.set(out, x, y, hexc(OUT));

// recorte a la caja ocupada
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (P.get(out, x, y)[3] > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const fin = P.blank(x1 - x0 + 1, y1 - y0 + 1);
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P.set(fin, x - x0, y - y0, P.get(out, x, y));
P.write(path.join(here, 'banco_ubahn.png'), fin);
// anclaje = centro de la base (L/2, D/2, 0)
const anchor = [Math.round(L / 2 - D / 2 + OX - x0), Math.round((L + D) / 4 + OY - y0)];
console.log(JSON.stringify({ anchor, size: [fin.w, fin.h] }));
