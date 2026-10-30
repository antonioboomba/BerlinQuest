import { FRAME_H, FRAME_W } from '../game/art/characters';

// Análisis heurístico de una hoja de 960×88: no modifica nada, solo señala lo que parece mal preparado.
// Calibrado con las hojas procedurales del juego (ninguna produce avisos).

export const FRAMES_N = 20;
/** fila de las suelas en el arte del juego (el punto de apoyo queda en y = 86) */
export const SOLE_Y = FRAME_H - 3; // 85
export const FOOT_X = FRAME_W / 2; // 24
/** alfa mínimo para considerar un píxel visible */
export const ALPHA_MIN = 16;

export type Level = 'err' | 'warn';
export interface Issue {
  level: Level;
  text: string;
}
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface FrameReport {
  index: number;
  bbox: Box | null;
  opaque: number;
  colors: number;
  issues: Issue[];
}
export interface SheetReport {
  frames: FrameReport[];
  sheet: Issue[];
  /** la hoja parece una ilustración grande troceada en tiras */
  fragmented: boolean;
}

export const level = (issues: Issue[]): Level | null =>
  issues.some((i) => i.level === 'err') ? 'err' : issues.length ? 'warn' : null;

/** Recuadro de los píxeles visibles de una imagen (o null si es transparente). */
export function opaqueBox(data: Uint8ClampedArray, w: number, h: number): Box | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] >= ALPHA_MIN) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

export function analyzeSheet(sheet: HTMLCanvasElement): SheetReport {
  const W = sheet.width;
  const d = sheet.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, FRAME_H).data;
  const alpha = (x: number, y: number) => d[(y * W + x) * 4 + 3];
  const frames: FrameReport[] = [];
  let transparent = 0;

  for (let f = 0; f < FRAMES_N; f++) {
    const issues: Issue[] = [];
    const ox = f * FRAME_W;
    let x0 = FRAME_W, y0 = FRAME_H, x1 = -1, y1 = -1, opaque = 0, soft = 0;
    let left = 0, right = 0, top = 0, bottom = 0;
    const colors = new Set<number>();
    for (let y = 0; y < FRAME_H; y++)
      for (let x = 0; x < FRAME_W; x++) {
        const i = (y * W + ox + x) * 4;
        const a = d[i + 3];
        if (a < ALPHA_MIN) {
          transparent++;
          continue;
        }
        opaque++;
        if (a < 240) soft++;
        colors.add(((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3));
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x === 0) left++;
        if (x === FRAME_W - 1) right++;
        if (y === 0) top++;
        if (y === FRAME_H - 1) bottom++;
      }
    const bbox = opaque ? { x0, y0, x1, y1 } : null;
    frames.push({ index: f, bbox, opaque, colors: colors.size, issues });
    if (!bbox) {
      issues.push({ level: 'warn', text: 'vacío' });
      continue;
    }
    const fill = opaque / (FRAME_W * FRAME_H);
    if (fill > 0.8) issues.push({ level: 'err', text: `ocupa el ${Math.round(fill * 100)} % del frame: parece un trozo ampliado, no un personaje entero` });
    if (left >= 16 || right >= 16) issues.push({ level: 'err', text: `la figura sale por el borde ${left >= 16 ? 'izquierdo' : 'derecho'} (cortada)` });
    if (top >= 20) issues.push({ level: 'warn', text: 'la figura sale por el borde superior (cabeza cortada)' });
    if (bottom >= 6) issues.push({ level: 'warn', text: 'la figura toca el borde inferior' });
    if (Math.abs(y1 - SOLE_Y) > 1) issues.push({ level: 'warn', text: `pies en y = ${y1}; deberían estar en y = ${SOLE_Y}–${SOLE_Y + 1}` });
    // centro de los pies: píxeles visibles de las 4 filas inferiores de la figura
    let sx = 0, n = 0;
    for (let y = Math.max(0, y1 - 3); y <= y1; y++)
      for (let x = 0; x < FRAME_W; x++)
        if (alpha(ox + x, y) >= ALPHA_MIN) (sx += x), n++;
    const cx = n ? sx / n : FOOT_X;
    // (en la pose sentada, 9 y 19, las piernas van hacia delante)
    if (f % 10 !== 9 && Math.abs(cx - FOOT_X) > 6) issues.push({ level: 'warn', text: `pies descentrados (x ≈ ${Math.round(cx)}; deberían rondar x = ${FOOT_X})` });
    if (colors.size > 64) issues.push({ level: 'warn', text: `${colors.size} colores: más propio de una ilustración reducida que de pixel art` });
    if (soft > opaque * 0.15) issues.push({ level: 'warn', text: 'muchos bordes semitransparentes (suavizado): posible imagen reescalada' });
  }

  // figura que continúa de un frame al siguiente → ilustración troceada
  const sheetIssues: Issue[] = [];
  let seams = 0;
  for (let b = 1; b < FRAMES_N; b++) {
    const xa = b * FRAME_W - 1;
    let rows = 0;
    for (let y = 0; y < FRAME_H; y++) if (alpha(xa, y) >= ALPHA_MIN && alpha(xa + 1, y) >= ALPHA_MIN) rows++;
    if (rows >= 4) {
      seams++;
      const t = `la figura continúa a través del límite entre los frames ${b - 1} y ${b} (${rows} filas)`;
      frames[b - 1].issues.push({ level: 'err', text: t });
      frames[b].issues.push({ level: 'err', text: t });
    }
  }

  // alturas muy distintas entre frames de pie (se excluyen los sentados 9 y 19)
  const standing = frames.filter((f) => f.bbox && f.index % 10 !== 9);
  if (standing.length >= 4) {
    const hs = standing.map((f) => f.bbox!.y1 - f.bbox!.y0 + 1).sort((a, b) => a - b);
    const med = hs[Math.floor(hs.length / 2)];
    for (const f of standing) {
      const h = f.bbox!.y1 - f.bbox!.y0 + 1;
      if (Math.abs(h - med) > med * 0.2) f.issues.push({ level: 'warn', text: `altura ${h} px, muy distinta del resto (${med} px): ¿otra escala?` });
    }
  }

  const transparentRatio = transparent / (FRAME_W * FRAME_H * FRAMES_N);
  if (transparentRatio < 0.2) sheetIssues.push({ level: 'err', text: `solo el ${Math.round(transparentRatio * 100)} % de la hoja es transparente: falta el fondo transparente o el personaje está ampliado` });
  const bigFrames = frames.filter((f) => f.opaque / (FRAME_W * FRAME_H) > 0.8).length;
  const fragmented = seams >= 3 || bigFrames >= 3;
  if (fragmented)
    sheetIssues.unshift({
      level: 'err',
      text: `Parece una ilustración grande cortada en tiras (${seams} cortes que atraviesan frames, ${bigFrames} frames casi llenos), no 20 fotogramas completos de ${FRAME_W}×${FRAME_H}. Hay que redibujar o preparar cada fotograma a escala 1×.`,
    });
  if (seams && !fragmented) sheetIssues.push({ level: 'err', text: `${seams} figura(s) cruzan el límite entre frames.` });
  const empty = frames.filter((f) => !f.bbox).map((f) => f.index);
  if (empty.length) sheetIssues.push({ level: 'warn', text: `frames vacíos: ${empty.join(', ')}` });
  return { frames, sheet: sheetIssues, fragmented };
}
