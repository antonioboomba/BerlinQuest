import { CHARACTERS, drawCharacterSheet, FRAME_H, FRAME_W, HAND } from '../game/art/characters';
import { analyzeSheet, FOOT_X, FRAMES_N, level, type SheetReport } from './analyze';
import { compose, drawSlot, fillFromSheet, isClipped, naturalSort, prepareFrame, SHEET_W, slots, toCanvas } from './slots';

// Interfaz del laboratorio (DOM): carga de hojas y fotogramas, los 20 espacios, análisis y exportación.
// La vista previa animada la pinta la escena Phaser de main.ts a partir de la hoja montada.

const PNG_URL = 'assets/characters/player.png';
const FOOT_Y = FRAME_H - 2; // punto de apoyo (y = 86), como en el juego
const NAMES = ['quieto', 'quieto', 'caminar', 'caminar', 'caminar', 'caminar', 'carga', 'carga camina', 'carga camina', 'sentado'];
const CELL_S = 2;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const ui = {
  status: $('status'),
  report: $('report'),
  file: $<HTMLInputElement>('file'),
  frames: $<HTMLInputElement>('frames'),
  procedural: $('procedural'),
  reload: $('reload'),
  clear: $('clear'),
  exportBtn: $('export'),
  align: $<HTMLInputElement>('align'),
  markers: $<HTMLInputElement>('markers'),
  sheetView: $<HTMLCanvasElement>('sheetView'),
  srcBox: $('srcBox'),
  srcInfo: $('srcInfo'),
  srcView: $<HTMLCanvasElement>('srcView'),
  slots: $('slots'),
  drop: $('drop'),
};

type Kind = 'ok' | 'warn' | 'err';
function setStatus(text: string, kind: Kind) {
  ui.status.textContent = text;
  ui.status.className = kind;
}

let selected = 0;
let report: SheetReport;
let onSheet: (sheet: HTMLCanvasElement) => void = () => {};
const cells: { root: HTMLDivElement; canvas: HTMLCanvasElement; msg: HTMLDivElement; name: HTMLDivElement }[] = [];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
const readFile = async (f: File) => toCanvas(await loadImage(URL.createObjectURL(f)));

/** Comprueba que la URL devuelve de verdad un PNG (el servidor de desarrollo responde HTML si falta). */
async function fetchPng(url: string): Promise<HTMLCanvasElement | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('image/png')) return null;
    return toCanvas(await loadImage(URL.createObjectURL(await res.blob())));
  } catch {
    return null;
  }
}

// ───────────── Cargas ─────────────

/** Hoja completa: solo se reparte en los 20 espacios si mide exactamente 960×88. */
function useSheet(img: HTMLCanvasElement, name: string): boolean {
  if (img.width !== SHEET_W || img.height !== FRAME_H) {
    showSource(img, name);
    setStatus(
      `✗ ${name}: mide ${img.width}×${img.height} px; se esperaba ${SHEET_W}×${FRAME_H}. El juego lo rechazaría. ` +
        'No se recorta ni se escala automáticamente: carga fotogramas sueltos de 48×88 en los espacios.',
      'err',
    );
    return false;
  }
  ui.srcBox.hidden = true;
  fillFromSheet(img, name);
  refresh();
  const errs = level(report.sheet) === 'err' || report.frames.some((f) => level(f.issues) === 'err');
  if (errs) setStatus(`✗ ${name}: mide ${SHEET_W}×${FRAME_H}, pero el análisis indica que está mal preparado (ver detalles).`, 'err');
  else setStatus(`✓ ${name}: ${SHEET_W}×${FRAME_H} px, 20 frames de ${FRAME_W}×${FRAME_H}.`, 'ok');
  return true;
}

function useProcedural(note: string, kind: Kind) {
  ui.srcBox.hidden = true;
  fillFromSheet(drawCharacterSheet(CHARACTERS.player), 'procedural');
  refresh();
  setStatus(note, kind);
}

export async function loadDefault() {
  const img = await fetchPng(PNG_URL);
  if (img) useSheet(img, `public/${PNG_URL}`);
  else useProcedural(`No hay ${PNG_URL} — se muestra el arte procedural actual del protagonista (respaldo).`, 'warn');
}

/** Fotogramas sueltos a partir del espacio `start`, en orden natural de nombre. */
async function loadFrames(files: File[], start: number) {
  files = [...files].sort(naturalSort);
  const msgs: string[] = [];
  let placed = 0;
  let i = start;
  for (const [k, f] of files.entries()) {
    if (i >= FRAMES_N) {
      msgs.push(`${files.length - k} archivo(s) sin espacio: no hay más allá del 19.`);
      break;
    }
    let img: HTMLCanvasElement;
    try {
      img = await readFile(f);
    } catch {
      msgs.push(`${f.name}: no se pudo leer como imagen.`);
      continue;
    }
    const s = prepareFrame(img, f.name, ui.align.checked);
    if (typeof s === 'string') {
      msgs.push(s);
      continue;
    }
    slots[i++] = s;
    placed++;
  }
  selected = Math.min(i, FRAMES_N - 1);
  refresh();
  const where = placed ? `${placed} fotograma(s) colocados en los espacios ${start}–${start + placed - 1}.` : 'Ningún fotograma colocado.';
  setStatus([where, ...msgs].join(' '), msgs.length ? (placed ? 'warn' : 'err') : 'ok');
}

/** Archivo soltado en la página: hoja si mide 960×88, fotograma si cabe en 48×88, error si no. */
async function dropAnywhere(files: File[]) {
  if (files.length > 1) return loadFrames(files, selected);
  const f = files[0];
  let img: HTMLCanvasElement;
  try {
    img = await readFile(f);
  } catch {
    return setStatus(`${f.name}: no se pudo leer como imagen.`, 'err');
  }
  if (img.width <= FRAME_W && img.height <= FRAME_H) return loadFrames([f], selected);
  useSheet(img, f.name);
}

// ───────────── Vistas ─────────────

function checker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size: number, a: string, b: string) {
  for (let yy = 0; yy < h; yy += size)
    for (let xx = 0; xx < w; xx += size) {
      ctx.fillStyle = ((xx + yy) / size) % 2 ? a : b;
      ctx.fillRect(x + xx, y + yy, Math.min(size, w - xx), Math.min(size, h - yy));
    }
}

const ISSUE_TINT = { err: 'rgba(255,70,90,0.28)', warn: 'rgba(255,215,122,0.18)' };
const ISSUE_LINE = { err: '#ff5a6a', warn: '#ffd77a' };

/** Hoja final a escala ×2, con cada celda de 48×88 delimitada y numerada. */
function drawSheetView(sheet: HTMLCanvasElement) {
  const S = 2;
  const top = 18;
  const c = ui.sheetView;
  c.width = SHEET_W * S;
  c.height = FRAME_H * S + top;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < FRAMES_N; i++) {
    const even = i % 2 === 0;
    checker(ctx, i * FRAME_W * S, top, FRAME_W * S, FRAME_H * S, 8, even ? '#2a3350' : '#323c5c', even ? '#222a44' : '#2a3350');
  }
  ctx.drawImage(sheet, 0, top, SHEET_W * S, FRAME_H * S);
  ctx.font = '12px Segoe UI, sans-serif';
  for (let i = 0; i < FRAMES_N; i++) {
    const x = i * FRAME_W * S;
    const lv = level(report.frames[i].issues);
    if (lv) {
      ctx.fillStyle = ISSUE_TINT[lv];
      ctx.fillRect(x, top, FRAME_W * S, FRAME_H * S);
    }
    ctx.fillStyle = lv ? ISSUE_LINE[lv] : '#b8c4de';
    ctx.fillText(`${i}${lv === 'err' ? ' ✗' : lv === 'warn' ? ' !' : ''}`, x + 4, 13);
    if (ui.markers.checked) {
      ctx.fillStyle = '#ff5a6a';
      ctx.fillRect(x + (FOOT_X - 4) * S, top + FOOT_Y * S - 1, 8 * S, 2);
    }
  }
  // límites de frame: líneas gruesas de dos colores, visibles sobre cualquier dibujo
  for (let i = 0; i <= FRAMES_N; i++) {
    const x = Math.min(i * FRAME_W * S, c.width - 2);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(x - 1, 0, 3, c.height);
    ctx.fillStyle = '#5fa8ff';
    ctx.fillRect(x, top, 1, FRAME_H * S);
  }
  ctx.fillStyle = '#5fa8ff';
  ctx.fillRect(0, top, c.width, 1);
  ctx.fillRect(0, c.height - 1, c.width, 1);
}

/** Imagen con formato erróneo: se muestra tal cual, con la rejilla de 48×88 que le aplicaría el juego. */
function showSource(img: HTMLCanvasElement, name: string) {
  ui.srcBox.hidden = false;
  const fit = Math.min(2, 1500 / img.width, 600 / img.height);
  const c = ui.srcView;
  c.width = Math.max(1, Math.round(img.width * fit));
  c.height = Math.max(1, Math.round(img.height * fit));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  checker(ctx, 0, 0, c.width, c.height, 8, '#2a3350', '#222a44');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(95,168,255,0.9)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= img.width; x += FRAME_W) ctx.strokeRect(Math.round(x * fit) + 0.5, 0, 0, c.height);
  for (let y = 0; y <= img.height; y += FRAME_H) ctx.strokeRect(0, Math.round(y * fit) + 0.5, c.width, 0);
  ui.srcInfo.textContent =
    `${name}: ${img.width}×${img.height} px. La rejilla azul marca cómo la trocearía el juego en celdas de ${FRAME_W}×${FRAME_H}` +
    ` (${Math.floor(img.width / FRAME_W)}×${Math.floor(img.height / FRAME_H)} celdas). No se usa: el laboratorio no recorta ilustraciones.`;
}

function buildCells() {
  ui.slots.innerHTML = '';
  for (let i = 0; i < FRAMES_N; i++) {
    const root = document.createElement('div');
    root.className = 'slot';
    root.dataset.i = String(i);
    const head = document.createElement('div');
    head.className = 'head';
    head.textContent = `${i} · ${NAMES[i % 10]} · ${i < 10 ? 'frente' : 'espalda'}`;
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W * CELL_S;
    canvas.height = FRAME_H * CELL_S;
    canvas.draggable = true;
    canvas.title = 'Arrastra a otro espacio para intercambiarlos';
    const name = document.createElement('div');
    name.className = 'name';
    const tools = document.createElement('div');
    tools.className = 'tools';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/png';
    file.multiple = true;
    file.hidden = true;
    file.onchange = () => file.files?.length && void loadFrames([...file.files], i).then(() => (file.value = ''));
    const btn = (label: string, title: string, fn: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.onclick = (e) => {
        e.stopPropagation();
        fn();
      };
      tools.appendChild(b);
    };
    btn('📂', 'Cargar fotograma(s) desde este espacio', () => file.click());
    btn('◀', 'Mover 1 px a la izquierda', () => nudge(i, -1, 0));
    btn('▶', 'Mover 1 px a la derecha', () => nudge(i, 1, 0));
    btn('▲', 'Subir 1 px', () => nudge(i, 0, -1));
    btn('▼', 'Bajar 1 px', () => nudge(i, 0, 1));
    btn('✕', 'Vaciar este espacio', () => {
      slots[i] = null;
      refresh();
    });
    tools.appendChild(file);
    const msg = document.createElement('div');
    msg.className = 'msg';
    root.append(head, canvas, name, tools, msg);
    root.onclick = () => {
      selected = i;
      refresh();
    };
    canvas.ondragstart = (e) => e.dataTransfer?.setData('application/x-slot', String(i));
    root.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      root.classList.add('over');
    };
    root.ondragleave = () => root.classList.remove('over');
    root.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      root.classList.remove('over');
      ui.drop.style.display = 'none';
      const from = e.dataTransfer?.getData('application/x-slot');
      if (from) return swap(Number(from), i);
      const files = [...(e.dataTransfer?.files ?? [])];
      if (files.length) void loadFrames(files, i);
    };
    ui.slots.appendChild(root);
    cells.push({ root, canvas, msg, name });
  }
}

function drawCell(i: number) {
  const { root, canvas, msg, name } = cells[i];
  const ctx = canvas.getContext('2d')!;
  const S = CELL_S;
  ctx.imageSmoothingEnabled = false;
  checker(ctx, 0, 0, canvas.width, canvas.height, 8, '#2a3350', '#222a44');
  const s = slots[i];
  if (s) {
    // se dibuja a 1× en un lienzo intermedio y se amplía sin suavizado
    const tmp = document.createElement('canvas');
    tmp.width = FRAME_W;
    tmp.height = FRAME_H;
    drawSlot(tmp.getContext('2d')!, s, 0, 0);
    ctx.drawImage(tmp, 0, 0, FRAME_W * S, FRAME_H * S);
  }
  if (ui.markers.checked) {
    ctx.fillStyle = '#ff5a6a';
    ctx.fillRect((FOOT_X - 4) * S, FOOT_Y * S - 1, 8 * S, 2);
    ctx.fillRect(FOOT_X * S - 1, (FOOT_Y - 4) * S, 2, 6 * S);
    const local = i % 10;
    if (local >= 6 && local <= 8) {
      ctx.fillStyle = '#5fa8ff';
      ctx.beginPath();
      ctx.arc((FOOT_X + HAND.x) * S, (FOOT_Y + HAND.y) * S, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (local === 0) {
      ctx.strokeStyle = '#6dffa8';
      ctx.strokeRect(6 * S + 0.5, 0.5, 36 * S - 1, 36 * S - 1);
    }
    ctx.fillStyle = 'rgba(255,215,122,0.8)';
    ctx.fillRect(0, (FOOT_Y - 82) * S, FRAME_W * S, 1);
  }
  const issues = [...report.frames[i].issues];
  if (s && isClipped(s)) issues.unshift({ level: 'warn', text: 'parte del fotograma queda fuera de la celda' });
  const lv = level(issues);
  root.className = `slot${lv ? ' ' + lv : ''}${i === selected ? ' sel' : ''}${s ? '' : ' empty'}`;
  name.textContent = s ? `${s.name}${s.x || s.y ? ` (desplazado ${s.x}, ${s.y})` : ''}` : 'vacío — suelta un PNG aquí';
  const shown = issues.filter((x) => x.text !== 'vacío').sort((a, b) => (a.level === b.level ? 0 : a.level === 'err' ? -1 : 1));
  msg.innerHTML =
    shown
      .slice(0, 4)
      .map((x) => `<span class="${x.level}">${x.level === 'err' ? '✗' : '!'} ${x.text}</span>`)
      .join('') + (shown.length > 4 ? `<span class="warn">… y ${shown.length - 4} aviso(s) más</span>` : '');
}

function drawReport() {
  const lines = [...report.sheet];
  const bad = report.frames.filter((f) => level(f.issues) === 'err').map((f) => f.index);
  const warn = report.frames.filter((f) => level(f.issues) === 'warn' && f.bbox).map((f) => f.index);
  if (bad.length) lines.push({ level: 'err', text: `frames con errores: ${bad.join(', ')}` });
  if (warn.length) lines.push({ level: 'warn', text: `frames con avisos: ${warn.join(', ')}` });
  ui.report.innerHTML = lines.length
    ? lines.map((l) => `<li class="${l.level}">${l.text}</li>`).join('')
    : '<li class="ok">Análisis: sin problemas detectados (límites, pies, escala y transparencia correctos).</li>';
}

let current: HTMLCanvasElement;
function refresh() {
  current = compose();
  report = analyzeSheet(current);
  drawSheetView(current);
  for (let i = 0; i < FRAMES_N; i++) drawCell(i);
  drawReport();
  onSheet(current);
}

function nudge(i: number, dx: number, dy: number) {
  const s = slots[i];
  if (!s) return;
  s.x += dx;
  s.y += dy;
  refresh();
}

function swap(a: number, b: number) {
  if (a === b) return;
  [slots[a], slots[b]] = [slots[b], slots[a]];
  selected = b;
  refresh();
}

// ───────────── Exportación ─────────────

function exportPng() {
  const sheet = compose();
  const empty = slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  const r = analyzeSheet(sheet);
  const errs = r.frames.filter((f) => level(f.issues) === 'err').length + r.sheet.filter((x) => x.level === 'err').length;
  const url = sheet.toDataURL('image/png');
  (window as unknown as { __LAB: Record<string, unknown> }).__LAB.lastExport = url;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'player.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  const notes: string[] = [];
  if (empty.length) notes.push(`espacios vacíos: ${empty.join(', ')}`);
  if (errs) notes.push(`${errs} error(es) en el análisis`);
  setStatus(
    `Exportado player.png (${sheet.width}×${sheet.height}, fondo transparente). Cópialo a public/assets/characters/player.png.` +
      (notes.length ? ` Atención: ${notes.join('; ')}.` : ''),
    notes.length ? 'warn' : 'ok',
  );
}

// ───────────── Arranque ─────────────

export function initLab(sheetCallback: (sheet: HTMLCanvasElement) => void) {
  onSheet = sheetCallback;
  buildCells();
  ui.file.onchange = async () => {
    const f = ui.file.files?.[0];
    if (!f) return;
    try {
      useSheet(await readFile(f), f.name);
    } catch {
      setStatus(`${f.name}: no se pudo leer como imagen.`, 'err');
    }
    ui.file.value = '';
  };
  ui.frames.onchange = () => ui.frames.files?.length && void loadFrames([...ui.frames.files], selected).then(() => (ui.frames.value = ''));
  ui.procedural.onclick = () => useProcedural('Base: arte procedural actual del protagonista (sustituye los espacios que quieras).', 'warn');
  ui.reload.onclick = () => void loadDefault();
  ui.clear.onclick = () => {
    slots.fill(null);
    selected = 0;
    ui.srcBox.hidden = true;
    refresh();
    setStatus('Los 20 espacios están vacíos. Carga fotogramas sueltos (empiezan en el espacio seleccionado).', 'warn');
  };
  ui.exportBtn.onclick = exportPng;
  ui.markers.addEventListener('change', () => refresh());
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.types.includes('Files')) ui.drop.style.display = 'flex';
  });
  window.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) ui.drop.style.display = 'none';
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    ui.drop.style.display = 'none';
    const files = [...(e.dataTransfer?.files ?? [])];
    if (files.length) void dropAnywhere(files);
  });
  (window as unknown as { __LAB: unknown }).__LAB = { slots, compose, analyze: () => analyzeSheet(compose()), lastExport: null, select: (i: number) => ((selected = i), refresh()) };
}
