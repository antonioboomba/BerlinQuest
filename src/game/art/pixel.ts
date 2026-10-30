// Utilidades para generar pixel art en canvas (sin suavizado).

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function px(ctx: Ctx, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Generador pseudoaleatorio determinista (mismos edificios en cada partida). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Oscurece (f < 1) o aclara (f > 1) un color. */
export function shade(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (f <= 1) return rgbToHex(r * f, g * f, b * f);
  const t = f - 1;
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Añade un contorno de 1 px alrededor de los píxeles opacos (estilo sprite clásico). */
export function outline(ctx: Ctx, w: number, h: number, color: string, x0 = 0, y0 = 0) {
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const marks: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!opaque(x, y) && (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1))) marks.push(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < marks.length; i += 2) ctx.fillRect(x0 + marks[i], y0 + marks[i + 1], 1, 1);
}

/**
 * Proyecta una textura rectangular sobre una cara isométrica.
 * dir = 'right': la cara baja hacia la derecha (1 px abajo cada 2 px).
 * dir = 'left':  la cara baja hacia la izquierda.
 * (dx, dy) = esquina superior del borde inicial de la cara en el canvas destino.
 */
export function shearFace(dst: Ctx, src: HTMLCanvasElement, dx: number, dy: number, dir: 'right' | 'left') {
  for (let u = 0; u < src.width; u++) {
    const off = Math.floor(u / 2);
    const x = dir === 'right' ? dx + u : dx - u - 1;
    dst.drawImage(src, dir === 'right' ? u : src.width - 1 - u, 0, 1, src.height, x, dy + off, 1, src.height);
  }
}

/** Rombo isométrico relleno (suelos, tejados). Centro superior en (cx, top). */
export function diamond(ctx: Ctx, cx: number, top: number, halfW: number, halfH: number, color: string) {
  ctx.fillStyle = color;
  for (let row = 0; row < halfH * 2; row++) {
    const t = row < halfH ? row + 1 : halfH * 2 - row;
    const w = t * (halfW / halfH);
    ctx.fillRect(Math.round(cx - w), top + row, Math.round(w * 2), 1);
  }
}

/** Polígono isométrico relleno a partir de 4 esquinas (para tejados de cualquier tamaño). */
export function poly(ctx: Ctx, pts: [number, number][], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fill();
}

/** Gradiente radial suave para luces (se usa con mezcla aditiva). */
export function glowCanvas(radius: number, color: string, intensity = 1): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(radius * 2, radius * 2);
  const [r, g, b] = hexToRgb(color);
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${0.9 * intensity})`);
  grad.addColorStop(0.35, `rgba(${r},${g},${b},${0.35 * intensity})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, radius * 2, radius * 2);
  return canvas;
}

export function fillEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, w = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  ctx.fillStyle = color;
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), w, w);
}

export function ring(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, w = 1) {
  ctx.fillStyle = color;
  const steps = Math.ceil((rx + ry) * 4);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), w, w);
  }
}
