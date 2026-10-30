// Guía ampliada para redibujar solo el frame 19 (sentado de espaldas, sin asiento).
// uso: PPTR=<puppeteer-core> node guide19.cjs tony_fixed.png tony_frame_19_base.png procedural.png salida.png
const puppeteer = require(process.env.PPTR);
const fs = require('fs');
const [sheetF, baseF, procF, out] = process.argv.slice(2);
const enc = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  const url = await p.evaluate(async (us, ub, up) => {
    const img = async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; };
    const sheet = await img(us), base = await img(ub), proc = await img(up);
    const Z = 8, FW = 48 * Z, FH = 88 * Z, TOP = 70, PAD = 40;
    const c = document.createElement('canvas'); c.width = PAD + 2 * (FW + PAD) + 470; c.height = TOP + FH + 170;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#141a2e'; g.fillRect(0, 0, c.width, c.height);
    const checker = (ox, oy) => { for (let y = 0; y < 88; y++) for (let x = 0; x < 48; x++) { g.fillStyle = (x + y) % 2 ? '#2b3350' : '#242b45'; g.fillRect(ox + x * Z, oy + y * Z, Z, Z); } };
    const grid = (ox, oy) => {
      g.lineWidth = 1;
      for (let x = 0; x <= 48; x++) { g.strokeStyle = x % 4 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(ox + x * Z + 0.5, oy); g.lineTo(ox + x * Z + 0.5, oy + FH); g.stroke(); }
      for (let y = 0; y <= 88; y++) { g.strokeStyle = y % 4 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(ox, oy + y * Z + 0.5); g.lineTo(ox + FW, oy + y * Z + 0.5); g.stroke(); }
      g.fillStyle = '#8392b3'; g.font = '11px monospace';
      for (let x = 0; x < 48; x += 4) g.fillText(String(x), ox + x * Z + 2, oy - 4);
      for (let y = 0; y < 88; y += 4) g.fillText(String(y), ox - 22, oy + y * Z + 10);
    };
    const R = (ox, oy, x0, y0, x1, y1) => [ox + x0 * Z, oy + y0 * Z, (x1 - x0 + 1) * Z, (y1 - y0 + 1) * Z];
    const hatch = (ox, oy, x0, y0, x1, y1, col) => {
      const [X, Y, W, H] = R(ox, oy, x0, y0, x1, y1);
      g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip();
      g.strokeStyle = col; g.lineWidth = 2; for (let k = -H; k < W; k += 10) { g.beginPath(); g.moveTo(X + k, Y + H); g.lineTo(X + k + H, Y); g.stroke(); }
      g.restore(); g.setLineDash([7, 5]); g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(X, Y, W, H); g.setLineDash([]);
    };
    const label = (t, x, y, col = '#e8edf7', size = 13) => { g.font = `${size}px Segoe UI, sans-serif`; g.fillStyle = 'rgba(20,26,46,0.85)'; const w = g.measureText(t).width; g.fillRect(x - 3, y - size, w + 6, size + 5); g.fillStyle = col; g.fillText(t, x, y); };
    const title = (t, sub, x) => { g.fillStyle = '#ffd77a'; g.font = 'bold 17px Segoe UI, sans-serif'; g.fillText(t, x, 30); g.font = '13px Segoe UI, sans-serif'; g.fillStyle = '#a9b6d3'; g.fillText(sub, x, 50); };

    // 1 · original con la caja atenuada
    let ox = PAD, oy = TOP;
    title('1 · Original (tony_fixed, frame 19)', 'Silueta de referencia. La caja (atenuada) desaparece.', ox);
    checker(ox, oy); g.globalAlpha = 0.3; g.drawImage(sheet, 19 * 48, 0, 48, 88, ox, oy, FW, FH); g.globalAlpha = 1;
    g.drawImage(base, 0, 0, 48, 88, ox, oy, FW, FH); grid(ox, oy);
    g.strokeStyle = '#5fa8ff'; g.lineWidth = 2; g.strokeRect(ox - 1, oy - 1, FW + 2, FH + 2);

    // 2 · base editable + zonas
    ox = PAD + FW + PAD + 10;
    title('2 · Base editable + zonas a dibujar', 'tony_frame_19_base.png (48×88). Lo que ya hay se conserva.', ox);
    checker(ox, oy); g.drawImage(base, 0, 0, 48, 88, ox, oy, FW, FH); grid(ox, oy);
    g.setLineDash([4, 4]); g.strokeStyle = '#ffd77a'; g.lineWidth = 2; g.strokeRect(...R(ox, oy, 12, 40, 31, 66)); g.setLineDash([]);
    g.fillStyle = 'rgba(109,255,168,0.22)'; g.fillRect(...R(ox, oy, 0, 66, 47, 70));
    g.strokeStyle = '#6dffa8'; g.lineWidth = 2; g.strokeRect(...R(ox, oy, 0, 66, 47, 70));
    hatch(ox, oy, 8, 63, 37, 70, '#ff4f6a');
    hatch(ox, oy, 9, 71, 16, 79, '#ff8a3d');
    hatch(ox, oy, 30, 71, 37, 79, '#ff8a3d');
    hatch(ox, oy, 7, 79, 17, 85, '#ff8a3d');
    hatch(ox, oy, 29, 79, 39, 85, '#ff8a3d');
    g.strokeStyle = '#5fd0ff'; g.lineWidth = 2; g.strokeRect(...R(ox, oy, 6, 58, 11, 62)); g.strokeRect(...R(ox, oy, 32, 58, 37, 62));
    g.fillStyle = '#ff2840'; g.fillRect(ox, oy + 86 * Z - 2, FW, 3);
    g.fillStyle = 'rgba(255,90,106,0.45)'; g.fillRect(ox + 24 * Z - 1, oy, 2, FH);
    label('mochila: se queda donde está (fondo y≈64–66)', ox + 6 * Z, oy + 39 * Z, '#ffd77a');
    label('muslos (ya existen)', ox + 33 * Z, oy + 57 * Z, '#5fd0ff');
    label('asiento del juego · y 66–70', ox + 2, oy + 66 * Z - 4, '#6dffa8');
    label('NUEVO: cadera / vaqueros', ox + 12 * Z, oy + 69 * Z + 4, '#ff4f6a');
    label('NUEVO: pantorrillas', ox + 17 * Z + 4, oy + 76 * Z, '#ff8a3d');
    label('NUEVO: talones', ox + 17 * Z + 4, oy + 83 * Z, '#ff8a3d');
    label('suelas y = 85', ox + FW - 100, oy + 85 * Z - 4, '#ff5a6a');
    g.strokeStyle = '#5fa8ff'; g.lineWidth = 2; g.strokeRect(ox - 1, oy - 1, FW + 2, FH + 2);

    // 3 · referencias y paleta
    ox = PAD + 2 * (FW + PAD) + 20; const z3 = 3.4;
    g.fillStyle = '#ffd77a'; g.font = 'bold 17px Segoe UI, sans-serif'; g.fillText('3 · Referencias (×3,4)', ox, 30);
    const refs = [[sheet, 10, 'F10 · espalda: vaqueros y talones'], [sheet, 9, 'F9 · sentado frente: rodillas'], [proc, 19, 'Juego actual · sentado espalda']];
    refs.forEach(([im, f, t], k) => {
      const rx = ox + (k % 2) * (48 * z3 + 40), ry = TOP + Math.floor(k / 2) * (88 * z3 + 40);
      for (let y = 0; y < 88; y++) for (let x = 0; x < 48; x++) { g.fillStyle = (x + y) % 2 ? '#2b3350' : '#242b45'; g.fillRect(rx + x * z3, ry + y * z3, z3 + 0.5, z3 + 0.5); }
      g.drawImage(im, f * 48, 0, 48, 88, rx, ry, 48 * z3, 88 * z3);
      g.fillStyle = 'rgba(109,255,168,0.25)'; g.fillRect(rx, ry + 66 * z3, 48 * z3, 5 * z3);
      g.fillStyle = '#ff2840'; g.fillRect(rx, ry + 86 * z3 - 1, 48 * z3, 2);
      g.fillStyle = '#c9d3ea'; g.font = '12px Segoe UI, sans-serif'; g.fillText(t, rx, ry + 88 * z3 + 16);
    });
    const tmp = document.createElement('canvas'); tmp.width = 960; tmp.height = 88; const tg = tmp.getContext('2d'); tg.drawImage(sheet, 0, 0);
    const d = tg.getImageData(0, 0, 960, 88).data;
    const groups = {
      'Vaqueros': (r, gg, bb) => bb > r + 25 && gg > 50,
      'Zapatillas': (r, gg, bb) => Math.min(r, gg, bb) > 150,
      'Chaqueta': (r, gg, bb) => Math.max(r, gg, bb) < 90 && Math.max(r, gg, bb) > 30 && Math.max(r, gg, bb) - Math.min(r, gg, bb) < 22,
      'Contorno': (r, gg, bb) => Math.max(r, gg, bb) <= 30,
      'Detalle rojo': (r, gg, bb, y) => y >= 72 && r > 150 && gg < 100 && bb < 100,
    };
    let py = TOP + 88 * z3 + 40 + 10;
    const px = ox + 48 * z3 + 40;
    g.fillStyle = '#ffd77a'; g.font = 'bold 14px Segoe UI, sans-serif'; g.fillText('Paleta (otros 19 fotogramas)', px, py);
    py += 10;
    for (const [name, test] of Object.entries(groups)) {
      const h = new Map();
      for (let f = 0; f < 19; f++) for (let y = 0; y < 88; y++) for (let x = 0; x < 48; x++) {
        const i = (y * 960 + f * 48 + x) * 4; if (d[i + 3] < 255 || !test(d[i], d[i + 1], d[i + 2], y)) continue;
        const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; h.set(k, (h.get(k) || 0) + 1);
      }
      const top = [];
      for (const e of [...h.entries()].sort((a, b2) => b2[1] - a[1])) {
        const [r1, g1, b1] = [e[0] >> 16, (e[0] >> 8) & 255, e[0] & 255];
        if (top.every(([k]) => Math.abs((k >> 16) - r1) + Math.abs(((k >> 8) & 255) - g1) + Math.abs((k & 255) - b1) > 24)) top.push(e);
        if (top.length === 4) break;
      }
      g.fillStyle = '#c9d3ea'; g.font = '12px Segoe UI, sans-serif'; g.fillText(name, px, py + 14);
      top.forEach(([k], j) => { const hx = '#' + k.toString(16).padStart(6, '0'); g.fillStyle = hx; g.fillRect(px + j * 46, py + 20, 40, 16); g.fillStyle = '#8392b3'; g.font = '9px monospace'; g.fillText(hx, px + j * 46, py + 46); });
      py += 54;
    }

    const notes = [
      'Redibujar SOLO las zonas rayadas. No tocar cabeza, pelo, capucha, chaqueta ni mochila: son los píxeles originales.',
      'Postura: sentado de espaldas, cadera apoyada en y 66–70 (la silla o el banco los dibuja el juego). Rodillas hacia delante, tapadas por el cuerpo;',
      'solo se ven las pantorrillas bajando desde los muslos azules de los lados y los talones de las zapatillas. Rectángulos naranjas = posición aproximada.',
      'Suelas en y = 85, pies separados como las rodillas del F9. Sin silla, caja, tronco ni sombra. Estilo de los otros 19: 1×, contorno negro de 1 px,',
      'colores de la paleta, píxeles 100 % opacos, sin suavizado.',
    ];
    g.fillStyle = '#ffd77a'; g.font = 'bold 15px Segoe UI, sans-serif'; g.fillText('Frame 19 · Tony sentado de espaldas · guía de redibujo', PAD, TOP + FH + 34);
    g.fillStyle = '#e8edf7'; g.font = '14px Segoe UI, sans-serif';
    notes.forEach((t, i) => g.fillText(t, PAD, TOP + FH + 58 + i * 21));
    return c.toDataURL('image/png');
  }, enc(sheetF), enc(baseF), enc(procF));
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  await b.close();
})();
