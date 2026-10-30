import { HALF_W } from '../iso';
import { flatTop, isoBox } from './buildings';
import { PAL } from './palette';
import { makeCanvas, rect, shade, type Ctx } from './pixel';

// Muebles como cajas isométricas troceadas en celdas de 1×1 baldosa, para que el orden de profundidad
// con los personajes sea correcto aunque el mueble ocupe varias baldosas.

export interface BoxPaint {
  /** cara frontal izquierda (plano y = y1), ancho wx·32 */
  front: (ctx: Ctx, w: number, h: number) => void;
  /** cara lateral derecha (plano x = x1), ancho wy·32 */
  side: (ctx: Ctx, w: number, h: number) => void;
  top: string;
  edge?: string;
}

export interface BoxCell {
  cx: number;
  cy: number;
  canvas: HTMLCanvasElement;
  anchorX: number;
  anchorY: number;
}

export function boxCells(wx: number, wy: number, H: number, paint: BoxPaint): BoxCell[] {
  const front = makeCanvas(wx * HALF_W, H);
  paint.front(front.ctx, wx * HALF_W, H);
  const side = makeCanvas(wy * HALF_W, H);
  paint.side(side.ctx, wy * HALF_W, H);
  const cells: BoxCell[] = [];
  for (let cy = 0; cy < wy; cy++)
    for (let cx = 0; cx < wx; cx++) {
      const lastRow = cy === wy - 1;
      const lastCol = cx === wx - 1;
      let f: HTMLCanvasElement | null = null;
      if (lastRow) {
        const c = makeCanvas(HALF_W, H);
        c.ctx.drawImage(front.canvas, cx * HALF_W, 0, HALF_W, H, 0, 0, HALF_W, H);
        f = c.canvas;
      }
      let s: HTMLCanvasElement | null = null;
      if (lastCol) {
        const c = makeCanvas(HALF_W, H);
        c.ctx.drawImage(side.canvas, cy * HALF_W, 0, HALF_W, H, 0, 0, HALF_W, H);
        s = c.canvas;
      }
      const art = isoBox(1, 1, H, f ? { canvas: f } : null, s ? { canvas: s } : null, flatTop(paint.top, lastRow || lastCol ? paint.edge : undefined));
      cells.push({ cx, cy, canvas: art.canvas, anchorX: art.anchorX, anchorY: art.anchorY });
    }
  return cells;
}

// ───────────── Pinturas reutilizables ─────────────

export const plain = (c: string, trim = shade(c, 1.2)) => (ctx: Ctx, w: number, h: number) => {
  rect(ctx, 0, 0, w, h, c);
  rect(ctx, 0, 0, w, 3, trim);
  rect(ctx, 0, h - 3, w, 3, shade(c, 0.75));
};

export function woodPanels(ctx: Ctx, w: number, h: number) {
  rect(ctx, 0, 0, w, h, PAL.wood);
  for (let x = 3; x < w; x += 16) {
    rect(ctx, x, 6, 12, h - 12, PAL.woodLight);
    rect(ctx, x + 10, 6, 2, h - 12, PAL.woodDark);
  }
  rect(ctx, 0, 0, w, 4, PAL.woodLight);
}

/** Armarios de cocina con puertas y tiradores. */
export function cabinets(color: string) {
  return (ctx: Ctx, w: number, h: number) => {
    rect(ctx, 0, 0, w, h, color);
    rect(ctx, 0, 0, w, 4, '#f2ece4');
    for (let x = 2; x < w - 2; x += 16) {
      rect(ctx, x, 7, 13, h - 11, shade(color, 1.08));
      rect(ctx, x + 11, 7, 2, h - 11, shade(color, 0.8));
      rect(ctx, x + 5, 12, 4, 2, '#9aa4b8');
    }
  };
}

/** Estantería frontal con productos de colores. */
export function shelfFront(products: string[][]) {
  return (ctx: Ctx, w: number, h: number) => {
    rect(ctx, 0, 0, w, h, '#e6e1ea');
    const rows = products.length;
    const rh = Math.floor((h - 6) / rows);
    products.forEach((cols, r) => {
      const y = 4 + r * rh;
      rect(ctx, 2, y, w - 4, rh - 3, '#c9c3cf');
      let x = 4;
      let i = 0;
      while (x < w - 6) {
        const c = cols[i % cols.length];
        const ph = rh - 7 - ((i * 3) % 4);
        rect(ctx, x, y + rh - 4 - ph, 5, ph, c);
        rect(ctx, x, y + rh - 4 - ph, 5, 2, shade(c, 1.3));
        x += 7;
        i++;
      }
      rect(ctx, 0, y + rh - 3, w, 3, '#9aa4b8');
    });
  };
}
