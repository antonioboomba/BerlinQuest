// Fachada del Späti (spaeti.png, 192x176): quita las mesas, sillas y la papelera dibujadas (el juego ya las pone
// como objetos) sin tapar con rectángulos planos:
// 1) bajo los escaparates (y 151-164): paneles rehundidos de zócalo de tienda con los colores del propio marco y tramado
// 2) acera (y 165-170): las patas se sustituyen por el píxel de acera limpio más cercano de la misma fila
// 3) papelera (x 175-187, y 144-167): estuco muestreado de las mismas filas; la franja de base continúa la de la izquierda
// uso: node spaeti_clean.cjs entrada.png salida.png
const path = require('path'), fs = require('fs');
const near = path.resolve(__dirname, '../tony/corregidos/png.cjs');
const P = require(fs.existsSync(near) ? near : path.resolve('art-source/tony/corregidos/png.cjs'));
const s = P.read(process.argv[2]);
const out = P.read(process.argv[2]);
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const mul = (c, k) => [Math.min(255, Math.round(c[0] * k)), Math.min(255, Math.round(c[1] * k)), Math.min(255, Math.round(c[2] * k)), 255];
const median = (arr) => [0, 1, 2].map((k) => arr.map((c) => c[k]).sort((a, b) => a - b)[arr.length >> 1]).concat(255);

// ── 1 · zócalo de los escaparates
const ZONES = [[9, 45], [66, 101]];
const Y0 = 151, Y1 = 164;
// colores: marco = columnas oscuras de la puerta (x 45-47) ; relleno = oscuros poco saturados del zócalo visible
const frameS = []; for (let y = Y0; y <= Y1; y++) for (const x of [45, 46, 47, 64, 65]) frameS.push(P.get(s, x, y));
const darkS = []; for (const [a, b] of ZONES) for (let y = 153; y <= 162; y++) for (let x = a; x <= b; x++) { const c = P.get(s, x, y); const sat = Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3)); if (lum(c) < 70 && lum(c) > 18 && sat < 40) darkS.push(c); }
const FRAME = median(frameS), FILL = median(darkS);
const HI = mul(FILL, 1.45), SH = mul(FILL, 0.62), FR = mul(FRAME, 1.0);
const fillTone = () => { const r = rnd(); return r < 0.12 ? mul(FILL, 1.12) : r < 0.22 ? mul(FILL, 0.9) : FILL; };
for (const [a, b] of ZONES) {
  const mid = Math.round((a + b) / 2);
  for (let y = Y0; y <= Y1; y++) for (let x = a; x <= b; x++) {
    let c;
    const edgeX = x === a || x === b || x === mid;
    if (y === Y0 || y === Y1 - 1 || edgeX) c = FR; // marco
    else if (y === Y1) c = mul(FR, 0.8); // zócalo inferior
    else {
      // panel rehundido: sombra arriba/izquierda, luz abajo/derecha
      const left = x === a + 1 || x === mid + 1, right = x === b - 1 || x === mid - 1;
      if (y === Y0 + 1 || left) c = SH;
      else if (y === Y1 - 2 || right) c = HI;
      else c = fillTone();
    }
    P.set(out, x, y, c);
  }
}
// ── 2 · acera: patas oscuras → píxel limpio más cercano de la fila
for (let y = 165; y <= 170; y++) {
  const row = []; for (let x = 0; x < s.w; x++) row.push(P.get(s, x, y));
  const ref = median(row.filter((c, x) => x < 9 || (x > 101 && x < 175)));
  const bad = (x) => { const inZone = ZONES.some(([a, b]) => x >= a - 1 && x <= b + 1); return inZone && lum(row[x]) < lum(ref) * 0.72; };
  for (let x = 0; x < s.w; x++) if (bad(x)) { for (let d = 1; d < 40; d++) { for (const xx of [x - d, x + d]) if (xx >= 0 && xx < s.w && !bad(xx)) { P.set(out, x, y, row[xx]); d = 99; break; } } }
}
// ── 3 · papelera
const BX0 = 175, BX1 = 187, BY0 = 144, BY1 = 167;
const stuccoRef = (() => { const a = []; for (let y = 20; y < 60; y++) for (let x = 140; x < 160; x++) a.push(P.get(s, x, y)); return median(a); })();
const isStucco = (c) => Math.abs(c[0] - stuccoRef[0]) + Math.abs(c[1] - stuccoRef[1]) + Math.abs(c[2] - stuccoRef[2]) < 55 && c[0] - c[1] < stuccoRef[0] - stuccoRef[1] + 12;
for (let y = BY0; y <= BY1; y++) for (let x = BX0; x <= BX1; x++) {
  if (y >= 163) { P.set(out, x, y, P.get(s, x - 13, y)); continue; } // franja de base con hierbas
  const pool = []; for (let yy = y - 4; yy <= y + 4; yy++) for (let xx = 130; xx < BX0; xx++) { const c = P.get(s, xx, yy); if (isStucco(c)) pool.push(c); }
  // brillo de la fila igual al de los bordes de la papelera (x 172-174 de estuco)
  const edge = []; for (let yy = y - 2; yy <= y + 2; yy++) for (const xx of [170, 171, 172, 173, 174]) { const c = P.get(s, xx, yy); if (isStucco(c)) edge.push(lum(c)); }
  const pm = pool.length ? pool.reduce((a, c) => a + lum(c), 0) / pool.length : lum(stuccoRef);
  const k = edge.length ? edge.reduce((a, b) => a + b, 0) / edge.length / pm : 1;
  const c = pool.length ? pool[Math.floor(rnd() * pool.length)] : stuccoRef;
  P.set(out, x, y, mul(c, Math.max(0.75, Math.min(1.1, k))));
}
P.write(process.argv[3], out);
console.log(JSON.stringify({ FRAME, FILL, stuccoRef }));
