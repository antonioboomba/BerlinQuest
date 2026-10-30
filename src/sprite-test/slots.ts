import { FRAME_H, FRAME_W } from '../game/art/characters';
import { FRAMES_N, opaqueBox, SOLE_Y } from './analyze';

// Los 20 espacios de la hoja final. Cada espacio guarda su fotograma original intacto (sin escalar)
// y la posición en la que se dibuja dentro de su celda de 48×88.

export interface Slot {
  src: HTMLCanvasElement;
  name: string;
  x: number;
  y: number;
}

export const slots: (Slot | null)[] = Array.from({ length: FRAMES_N }, () => null);

export const SHEET_W = FRAME_W * FRAMES_N;

export function toCanvas(img: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0);
  return c;
}

/** Reparte una hoja de 960×88 (formato exacto) en los 20 espacios, píxel a píxel. */
export function fillFromSheet(sheet: HTMLCanvasElement, name: string) {
  for (let i = 0; i < FRAMES_N; i++) {
    const c = document.createElement('canvas');
    c.width = FRAME_W;
    c.height = FRAME_H;
    c.getContext('2d')!.drawImage(sheet, i * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
    slots[i] = { src: c, name: `${name} #${i}`, x: 0, y: 0 };
  }
}

/**
 * Prepara un fotograma suelto: nunca lo escala ni lo recorta. Las suelas (fila visible más baja) se
 * colocan en y = 85 (o se dejan si ya están en 85–86) y el lienzo se centra en x = 24, lo que
 * conserva la posición relativa entre fotogramas exportados con el mismo tamaño de lienzo. Devuelve un texto de error si no cabe.
 */
export function prepareFrame(img: HTMLCanvasElement, name: string, alignFeet: boolean): Slot | string {
  const d = img.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, img.width, img.height).data;
  const b = opaqueBox(d, img.width, img.height);
  if (!b) return `${name}: la imagen es totalmente transparente.`;
  const bw = b.x1 - b.x0 + 1;
  const bh = b.y1 - b.y0 + 1;
  if (bw > FRAME_W || bh > FRAME_H)
    return `${name}: el dibujo mide ${bw}×${bh} px y no cabe en ${FRAME_W}×${FRAME_H}. No se escala ni se recorta: prepara el fotograma a escala 1×.`;
  let x = Math.floor((FRAME_W - img.width) / 2);
  // lienzo apoyado en el borde inferior; solo se mueve si las suelas no quedan ya en y 85–86
  let y = FRAME_H - img.height;
  if (alignFeet && Math.abs(y + b.y1 - SOLE_Y - 0.5) > 0.5) y = SOLE_Y - b.y1;
  // si el centrado deja parte del dibujo fuera de la celda, se desplaza lo justo (sin cambiar tamaño)
  if (x + b.x0 < 0) x = -b.x0;
  if (x + b.x1 > FRAME_W - 1) x = FRAME_W - 1 - b.x1;
  if (y + b.y0 < 0) y = -b.y0;
  if (y + b.y1 > FRAME_H - 1) y = FRAME_H - 1 - b.y1;
  return { src: img, name, x, y };
}

/** Dibuja el contenido de un espacio en (dx, dy), recortado a su celda de 48×88. */
export function drawSlot(ctx: CanvasRenderingContext2D, s: Slot, dx: number, dy: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, FRAME_W, FRAME_H);
  ctx.clip();
  ctx.drawImage(s.src, dx + s.x, dy + s.y);
  ctx.restore();
}

/** Hoja final de 960×88 con fondo transparente. */
export function compose(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SHEET_W;
  c.height = FRAME_H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  slots.forEach((s, i) => s && drawSlot(ctx, s, i * FRAME_W, 0));
  return c;
}

/** ¿Parte del fotograma queda fuera de la celda tras moverlo? */
export function isClipped(s: Slot): boolean {
  const d = s.src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, s.src.width, s.src.height).data;
  const b = opaqueBox(d, s.src.width, s.src.height);
  return !!b && (s.x + b.x0 < 0 || s.y + b.y0 < 0 || s.x + b.x1 > FRAME_W - 1 || s.y + b.y1 > FRAME_H - 1);
}

/** Orden natural por nombre de archivo (frame2 < frame10). */
export const naturalSort = (a: File, b: File) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
