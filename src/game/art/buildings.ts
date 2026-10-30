import { HALF_H, HALF_W } from '../iso';
import { pixelText, textWidth } from './font';
import { PAL } from './palette';
import { fillEllipse, makeCanvas, mix, poly, px, rect, rng, shade, shearFace, type Ctx } from './pixel';

// ───────────── Caja isométrica genérica ─────────────
// Ancla = esquina trasera (x0, y0) a nivel del suelo. Cara izquierda = plano y = y1 (baja a la derecha),
// cara derecha = plano x = x1 (baja a la izquierda).

export interface Light {
  x: number;
  y: number;
  color: string;
  r: number;
  alpha?: number;
}

export interface BoxArt {
  canvas: HTMLCanvasElement;
  anchorX: number;
  anchorY: number;
  lights: Light[];
}

export interface FaceTex {
  canvas: HTMLCanvasElement;
  lights?: Light[];
}

export function isoBox(
  wx: number,
  wy: number,
  H: number,
  left: FaceTex | null,
  right: FaceTex | null,
  top: (ctx: Ctx, pts: [number, number][]) => void,
): BoxArt {
  const W = (wx + wy) * HALF_W;
  const Hc = (wx + wy) * HALF_H + H;
  const { canvas, ctx } = makeCanvas(W, Hc);
  const lights: Light[] = [];
  if (left) {
    shearFace(ctx, left.canvas, 0, wy * HALF_H, 'right');
    for (const l of left.lights ?? []) lights.push({ ...l, y: wy * HALF_H + Math.floor(l.x / 2) + l.y });
  }
  if (right) {
    shearFace(ctx, right.canvas, W, wx * HALF_H, 'left');
    const rw = right.canvas.width;
    for (const l of right.lights ?? []) {
      const u = rw - 1 - l.x;
      lights.push({ ...l, x: W - u - 1, y: wx * HALF_H + Math.floor(u / 2) + l.y });
    }
  }
  const pts: [number, number][] = [
    [wy * HALF_W, 0],
    [W, wx * HALF_H],
    [wx * HALF_W, (wx + wy) * HALF_H],
    [0, wy * HALF_H],
  ];
  top(ctx, pts);
  // arista vertical frontal (luz) y contorno exterior
  edge(ctx, pts[3][0], pts[3][1], pts[3][0], pts[3][1] + H, PAL.outline);
  edge(ctx, W - 1, pts[1][1], W - 1, pts[1][1] + H, PAL.outline);
  edge(ctx, pts[2][0], pts[2][1], pts[2][0], pts[2][1] + H, 'rgba(255,255,255,0.35)');
  return { canvas, anchorX: wy * HALF_W, anchorY: H, lights };
}

export function flatTop(color: string, edgeColor?: string) {
  return (ctx: Ctx, pts: [number, number][]) => {
    poly(ctx, pts, color);
    if (edgeColor) {
      const [d, c, b, a] = pts;
      edge(ctx, a[0], a[1], b[0], b[1], edgeColor);
      edge(ctx, b[0], b[1], c[0], c[1], edgeColor);
      edge(ctx, a[0], a[1], d[0], d[1], PAL.outline);
      edge(ctx, d[0], d[1], c[0], c[1], PAL.outline);
    }
  };
}

function edge(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, c: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px(ctx, Math.floor(x0 + ((x1 - x0) * i) / n), Math.floor(y0 + ((y1 - y0) * i) / n), c);
}

// ───────────── Fachadas ─────────────

export type BuildingKind = 'apartment' | 'buergeramt' | 'bar' | 'club' | 'office';

export interface BuildingSpec {
  kind: BuildingKind;
  wx: number;
  wy: number;
  floors: number;
  color: string;
  seed: number;
  /** vano (baldosa) de la puerta en la fachada principal */
  doorBay: number;
  /** rótulo de la planta baja (edificios «office») */
  sign?: string;
}

const BAY = HALF_W; // anchura de un vano = una baldosa a lo largo de la fachada
export const GROUND_H = 64;
export const FLOOR_H = 48;
export const ATTIC_H = 16;

export function buildingHeight(floors: number) {
  return GROUND_H + floors * FLOOR_H + ATTIC_H;
}

function wallColor(spec: BuildingSpec) {
  return spec.kind === 'club' ? '#4a4258' : spec.kind === 'buergeramt' ? '#e2d6c0' : spec.color;
}

/** Ventana Altbau: marco blanco, parteluz en cruz, alféizar y dintel. */
function windowAt(ctx: Ctx, x: number, y: number, w: number, h: number, lit: boolean, r: () => number, wall: string): Light | null {
  rect(ctx, x - 3, y - 5, w + 6, 3, shade(wall, 1.12)); // dintel
  rect(ctx, x - 3, y - 2, w + 6, 1, shade(wall, 0.8));
  rect(ctx, x - 2, y - 2, w + 4, h + 4, PAL.frame);
  rect(ctx, x + w, y - 2, 2, h + 4, PAL.frameShade);
  if (lit) {
    const warm = r() < 0.35 ? PAL.windowWarm : PAL.windowLit;
    rect(ctx, x, y, w, h, warm);
    rect(ctx, x + 1, y + 1, w - 2, Math.floor(h * 0.45), mix(warm, PAL.windowLitHot, 0.6));
    const deco = r();
    if (deco < 0.3) {
      rect(ctx, x, y, 3, h, '#e0675a'); // cortinas
      rect(ctx, x + w - 3, y, 3, h, '#e0675a');
    } else if (deco < 0.55) {
      rect(ctx, x + 2, y + h - 5, w - 4, 4, PAL.leaf); // plantas
      rect(ctx, x + 3, y + h - 7, 3, 2, PAL.leafLight);
      rect(ctx, x + w - 6, y + h - 8, 3, 3, '#ff6b8a');
    }
  } else {
    rect(ctx, x, y, w, h, PAL.windowDark);
    for (let i = 0; i < 5; i++) px(ctx, x + w - 3 - i, y + 2 + i, PAL.windowDarkShine);
    for (let i = 0; i < 3; i++) px(ctx, x + w - 3 - i, y + 8 + i, PAL.windowDarkShine);
  }
  rect(ctx, x + Math.floor(w / 2) - 1, y, 2, h, PAL.frame);
  rect(ctx, x, y + Math.floor(h * 0.38), w, 2, PAL.frame);
  rect(ctx, x - 4, y + h + 2, w + 8, 3, shade(wall, 1.15)); // alféizar
  rect(ctx, x - 4, y + h + 5, w + 8, 1, shade(wall, 0.75));
  return lit ? { x: x + w / 2, y: y + h / 2, color: PAL.lampGlow, r: 26, alpha: 0.28 } : null;
}

function balcony(ctx: Ctx, x: number, yBase: number, w: number, r: () => number) {
  rect(ctx, x, yBase, w, 4, '#d9d2c8');
  rect(ctx, x, yBase + 4, w, 2, '#a89f94');
  for (let i = 0; i < w; i += 4) rect(ctx, x + i, yBase - 13, 2, 13, PAL.iron);
  rect(ctx, x, yBase - 14, w, 2, PAL.iron);
  for (let i = 0; i < w / 6; i++) {
    const fx = x + 2 + r() * (w - 8);
    fillEllipse(ctx, fx, yBase - 16, 4, 3, r() < 0.5 ? PAL.leaf : PAL.leafLight);
    if (r() < 0.5) rect(ctx, fx - 1, yBase - 19, 3, 3, r() < 0.5 ? '#ff6b8a' : '#ffd77a');
  }
}

function graffiti(ctx: Ctx, x: number, y: number, w: number, h: number, r: () => number, tags: string[]) {
  const cols = ['#ff5fd6', '#5fe39a', '#5fc2ff', '#ffd77a', '#ff4f6a'];
  tags.forEach((t, i) => {
    const c = cols[Math.floor(r() * cols.length)];
    const tx = x + 4 + r() * Math.max(1, w - textWidth(t, 2) - 8);
    const ty = y + 4 + (i * (h - 14)) / Math.max(1, tags.length);
    pixelText(ctx, t, tx + 1, ty + 1, PAL.ink, 2);
    pixelText(ctx, t, tx, ty, c, 2);
  });
}

function neonText(ctx: Ctx, text: string, x: number, y: number, color: string, scale: number): Light {
  pixelText(ctx, text, x + 2, y + 2, shade(color, 0.3), scale);
  pixelText(ctx, text, x, y, color, scale);
  pixelText(ctx, text, x + 1, y + 1, mix(color, '#ffffff', 0.6), Math.max(1, scale - 2));
  return { x: x + textWidth(text, scale) / 2, y: y + 2.5 * scale, color, r: 70, alpha: 0.55 };
}

function signPlate(ctx: Ctx, text: string, cx: number, y: number, bg: string, fg: string) {
  const tw = textWidth(text, 2);
  const x = Math.round(cx - tw / 2 - 6);
  rect(ctx, x, y, tw + 12, 16, bg);
  rect(ctx, x, y, tw + 12, 2, shade(bg, 1.3));
  rect(ctx, x, y + 14, tw + 12, 2, shade(bg, 0.7));
  pixelText(ctx, text, x + 6, y + 3, fg, 2);
}

function mainFacade(spec: BuildingSpec): FaceTex {
  const r = rng(spec.seed);
  const W = spec.wx * BAY;
  const H = buildingHeight(spec.floors);
  const { canvas, ctx } = makeCanvas(W, H);
  const lights: Light[] = [];
  const wall = wallColor(spec);
  rect(ctx, 0, 0, W, H, wall);
  // franjas sutiles de revoco
  for (let y = 0; y < H; y += 8) rect(ctx, 0, y, W, 1, shade(wall, 0.97));

  // cornisa superior
  rect(ctx, 0, 0, W, ATTIC_H, shade(wall, 0.9));
  rect(ctx, 0, ATTIC_H - 6, W, 4, shade(wall, 1.15));
  rect(ctx, 0, ATTIC_H - 2, W, 2, shade(wall, 0.7));
  for (let x = 2; x < W; x += 8) rect(ctx, x, ATTIC_H - 10, 4, 4, shade(wall, 1.1)); // dentículos

  // plantas superiores
  for (let f = 0; f < spec.floors; f++) {
    const top = ATTIC_H + f * FLOOR_H;
    rect(ctx, 0, top + FLOOR_H - 3, W, 3, shade(wall, 1.12));
    rect(ctx, 0, top + FLOOR_H, W, 1, shade(wall, 0.75));
    for (let b = 0; b < spec.wx; b++) {
      const litChance = spec.kind === 'club' ? 0.3 : spec.kind === 'buergeramt' ? 0.75 : 0.55;
      const l = windowAt(ctx, b * BAY + 9, top + 12, 14, 26, r() < litChance, r, wall);
      if (l) {
        if (spec.kind === 'club') l.color = PAL.neonPurple;
        lights.push(l);
      }
    }
    if (spec.kind === 'apartment' && f < spec.floors) {
      for (let b = 0; b + 1 < spec.wx; b += 3) if (r() < 0.7) balcony(ctx, b * BAY + 4, top + FLOOR_H - 4, BAY * 2 - 8, r);
    }
  }

  // planta baja
  const gTop = H - GROUND_H;
  rect(ctx, 0, gTop, W, 5, shade(wall, 1.15));
  rect(ctx, 0, gTop + 5, W, 2, shade(wall, 0.72));
  rect(ctx, 0, H - 6, W, 6, shade(wall, 0.7)); // zócalo
  const doorX = spec.doorBay * BAY + 6;

  if (spec.kind === 'apartment') {
    // Späti (tienda de barrio) en los vanos anteriores a la puerta
    const shopEnd = Math.max(1, spec.doorBay) * BAY;
    rect(ctx, 0, gTop + 10, shopEnd, GROUND_H - 16, '#2f6a52');
    rect(ctx, 4, gTop + 22, shopEnd - 8, GROUND_H - 30, '#fff0bf');
    for (let x = 6; x < shopEnd - 6; x += 5) {
      const c = ['#e8333a', '#ffd77a', '#5fc2ff', '#5fe39a', '#ff9a4a'][Math.floor(x / 5) % 5];
      rect(ctx, x, gTop + 28, 3, 7, c);
      rect(ctx, x + 1, gTop + 40, 3, 7, shade(c, 0.85));
    }
    rect(ctx, 4, gTop + 36, shopEnd - 8, 2, '#c9a070');
    rect(ctx, 4, gTop + 48, shopEnd - 8, 2, '#c9a070');
    // toldo verde y letrero
    for (let x = 0; x < shopEnd; x++) rect(ctx, x, gTop + 8, 1, 8, Math.floor(x / 6) % 2 ? '#3f8a5a' : '#f2ece4');
    signPlate(ctx, 'SPÄTI', shopEnd / 2, gTop - 14, '#2f6a52', '#ffffff');
    lights.push({ x: shopEnd / 2, y: gTop + 36, color: PAL.windowLitHot, r: 46, alpha: 0.45 });
    // otros vanos: grafitis y ventanas bajas
    for (let b = spec.doorBay + 1; b < spec.wx; b++) {
      if (r() < 0.5) {
        const l = windowAt(ctx, b * BAY + 8, gTop + 18, 16, 22, r() < 0.4, r, wall);
        if (l) lights.push(l);
      } else graffiti(ctx, b * BAY, gTop + 14, BAY, GROUND_H - 22, r, [['KIEZ', 'B36', 'XO'][Math.floor(r() * 3)]]);
    }
    // portal de madera con montante
    rect(ctx, doorX - 3, gTop + 8, 26, 56, shade(wall, 0.75));
    rect(ctx, doorX, gTop + 11, 20, 12, PAL.windowLit);
    rect(ctx, doorX + 9, gTop + 11, 2, 12, PAL.frame);
    rect(ctx, doorX, gTop + 25, 20, 39, PAL.woodDark);
    rect(ctx, doorX + 2, gTop + 28, 7, 32, PAL.wood);
    rect(ctx, doorX + 11, gTop + 28, 7, 32, PAL.wood);
    rect(ctx, doorX + 2, gTop + 28, 7, 2, PAL.woodLight);
    rect(ctx, doorX + 11, gTop + 28, 7, 2, PAL.woodLight);
    rect(ctx, doorX + 9, gTop + 44, 2, 3, PAL.lamp);
    lights.push({ x: doorX + 10, y: gTop + 16, color: PAL.lampGlow, r: 30, alpha: 0.45 });
  }

  if (spec.kind === 'buergeramt') {
    for (let y = gTop + 10; y < H - 6; y += 8) rect(ctx, 0, y, W, 2, shade(wall, 0.86)); // almohadillado
    for (let b = 0; b < spec.wx; b++) {
      if (b === spec.doorBay || b === spec.doorBay + 1) continue;
      const l = windowAt(ctx, b * BAY + 8, gTop + 18, 16, 28, true, r, wall);
      if (l) lights.push({ ...l, color: '#d8ecff' });
    }
    // puerta doble de cristal con escalones
    const dx = spec.doorBay * BAY + 12;
    rect(ctx, dx - 4, gTop + 12, 48, 52, '#6a6a7a');
    rect(ctx, dx, gTop + 16, 40, 48, '#cfe6ff');
    rect(ctx, dx + 2, gTop + 18, 16, 44, '#eaf5ff');
    rect(ctx, dx + 22, gTop + 18, 16, 44, '#dff0ff');
    rect(ctx, dx + 19, gTop + 16, 2, 48, '#6a6a7a');
    rect(ctx, dx + 15, gTop + 38, 2, 8, '#6a6a7a');
    rect(ctx, dx + 23, gTop + 38, 2, 8, '#6a6a7a');
    lights.push({ x: dx + 20, y: gTop + 40, color: '#bfe0ff', r: 60, alpha: 0.5 });
    signPlate(ctx, 'BÜRGERAMT', dx + 20, gTop - 12, '#22356b', '#ffffff');
    // bandera alemana
    const fx = dx + 54;
    const fy = ATTIC_H + 6;
    rect(ctx, fx, fy, 2, 34, '#c9c9d6');
    rect(ctx, fx + 2, fy + 2, 18, 5, '#2a2a2a');
    rect(ctx, fx + 2, fy + 7, 18, 5, '#dd2222');
    rect(ctx, fx + 2, fy + 12, 18, 5, '#ffcc00');
  }

  if (spec.kind === 'bar') {
    const wood = '#6a2a24';
    rect(ctx, 0, gTop + 8, W, GROUND_H - 8, wood);
    rect(ctx, 0, gTop + 8, W, 2, shade(wood, 1.4));
    for (let b = 0; b < spec.wx; b++) {
      if (b === spec.doorBay) continue;
      const x = b * BAY + 4;
      const y = gTop + 20;
      rect(ctx, x - 2, y - 2, 28, 34, '#3a1410');
      rect(ctx, x, y, 24, 30, '#ffb85c');
      rect(ctx, x, y, 24, 9, '#ffd77a');
      for (let i = 1; i < 23; i += 3) rect(ctx, x + i, y + 2, 2, 6, ['#3fa04a', '#c0392b', '#f0c95a', '#e6eef8'][Math.floor(i / 3) % 4]);
      rect(ctx, x, y + 9, 24, 2, '#8a4a2a');
      if (r() < 0.85) {
        // silueta de cliente con jarra
        const hx = x + 4 + Math.floor(r() * 10);
        fillEllipse(ctx, hx + 4, y + 17, 4, 4, '#7a3a24');
        rect(ctx, hx, y + 21, 9, 9, '#7a3a24');
      }
      rect(ctx, x + 11, y, 2, 30, '#3a1410');
      lights.push({ x: x + 12, y: y + 14, color: PAL.lampGlow, r: 40, alpha: 0.5 });
    }
    // puerta con cristal
    rect(ctx, doorX - 3, gTop + 14, 26, 50, '#3a1410');
    rect(ctx, doorX, gTop + 17, 20, 47, '#8a3a2a');
    rect(ctx, doorX + 4, gTop + 21, 12, 16, '#ffd77a');
    rect(ctx, doorX + 4, gTop + 21, 12, 3, PAL.windowLitHot);
    rect(ctx, doorX + 15, gTop + 42, 2, 4, PAL.lamp);
    // toldo rojo a rayas
    for (let x = 0; x < W; x++) {
      const c = Math.floor(x / 6) % 2 ? '#c8283c' : '#f2ece4';
      rect(ctx, x, gTop, 1, 12, c);
      if (x % 12 < 6) rect(ctx, x, gTop + 12, 1, 2, c);
    }
    rect(ctx, 0, gTop - 1, W, 2, '#7a1020');
    // guirnalda de bombillas
    for (let x = 2; x < W; x += 6) {
      const sag = Math.round(Math.sin((x / W) * Math.PI * 6) * 2);
      rect(ctx, x, gTop + 17 + sag, 2, 2, PAL.windowLitHot);
    }
    // neón «BAR» y jarra
    const nx = Math.floor(W / 2) - 40;
    lights.push(neonText(ctx, 'BAR', nx, gTop - 40, PAL.neonRed, 6));
    const mx = nx + 76;
    const my = gTop - 40;
    rect(ctx, mx, my + 6, 20, 24, shade(PAL.neonRed, 0.35));
    rect(ctx, mx + 2, my + 8, 16, 20, PAL.neonRed);
    rect(ctx, mx + 5, my + 11, 10, 14, '#ff9aa8');
    rect(ctx, mx + 18, my + 12, 6, 10, PAL.neonRed);
    rect(ctx, mx, my, 20, 7, '#ffffff');
    lights.push({ x: mx + 10, y: my + 16, color: PAL.neonRed, r: 50, alpha: 0.55 });
    signPlate(ctx, 'KATER KARLO', W / 2, H - 22, '#3a1410', PAL.lamp);
  }

  if (spec.kind === 'office') {
    // planta baja acristalada (grandes almacenes / oficinas)
    rect(ctx, 0, gTop + 8, W, GROUND_H - 14, '#8fb0d8');
    for (let x = 0; x < W; x += 24) rect(ctx, x, gTop + 8, 2, GROUND_H - 14, '#5a6278');
    rect(ctx, 0, gTop + 8, W, 8, '#cfe0f5');
    lights.push({ x: W / 2, y: gTop + 30, color: '#d8ecff', r: 70, alpha: 0.35 });
    if (spec.sign) signPlate(ctx, spec.sign, W / 2, gTop - 12, '#22356b', '#ffffff');
  }

  if (spec.kind === 'club') {
    graffiti(ctx, 0, gTop + 12, W, GROUND_H - 18, r, ['BERLIN', 'BLEIBT', 'BUNT']);
    rect(ctx, doorX - 3, gTop + 10, 30, 54, '#1c1726');
    rect(ctx, doorX, gTop + 13, 24, 51, '#3a3346');
    for (let y = gTop + 17; y < H; y += 6) rect(ctx, doorX + 2, y, 20, 2, '#2a2238');
    rect(ctx, doorX + 9, gTop + 4, 6, 4, PAL.neonRed);
    lights.push({ x: doorX + 12, y: gTop + 6, color: PAL.neonRed, r: 30, alpha: 0.6 });
    lights.push(neonText(ctx, 'CLUB', doorX + 36, gTop - 30, PAL.neonPink, 4));
    // carteles
    rect(ctx, doorX - 26, gTop + 18, 18, 24, '#f2ece4');
    rect(ctx, doorX - 24, gTop + 20, 14, 12, PAL.neonPurple);
    pixelText(ctx, 'SA', doorX - 22, gTop + 34, PAL.ink);
  }

  return { canvas, lights };
}

function sideFacade(spec: BuildingSpec): FaceTex {
  const r = rng(spec.seed + 99);
  const W = spec.wy * BAY;
  const H = buildingHeight(spec.floors);
  const { canvas, ctx } = makeCanvas(W, H);
  const wall = shade(wallColor(spec), 0.78);
  rect(ctx, 0, 0, W, H, wall);
  rect(ctx, 0, ATTIC_H - 6, W, 4, shade(wall, 1.12));
  rect(ctx, 0, ATTIC_H - 2, W, 2, shade(wall, 0.72));
  const lights: Light[] = [];
  for (let f = 0; f < spec.floors; f++) {
    const top = ATTIC_H + f * FLOOR_H;
    rect(ctx, 0, top + FLOOR_H - 3, W, 3, shade(wall, 1.1));
    for (let b = 0; b < spec.wy; b++) {
      if (r() < 0.55) {
        const l = windowAt(ctx, b * BAY + 9, top + 12, 14, 26, r() < 0.4, r, wall);
        if (l) lights.push(l);
      }
    }
  }
  rect(ctx, 0, H - 6, W, 6, shade(wall, 0.75));
  return { canvas, lights };
}

function roof(spec: BuildingSpec) {
  const r = rng(spec.seed + 7);
  return (ctx: Ctx, pts: [number, number][]) => {
    poly(ctx, pts, PAL.roof);
    const [d, c, b, a] = pts;
    // pretil claro en las aristas frontales
    for (let i = 0; i < 3; i++) {
      edgeLine(ctx, a[0], a[1] + i, b[0], b[1] + i, i === 0 ? '#e6e1ea' : PAL.roofLight);
      edgeLine(ctx, b[0], b[1] + i, c[0], c[1] + i, i === 0 ? '#c9c3cf' : PAL.roofLight);
    }
    edgeLine(ctx, a[0], a[1], d[0], d[1], PAL.outline);
    edgeLine(ctx, d[0], d[1], c[0], c[1], PAL.outline);
    // chimeneas de ladrillo
    for (let i = 0; i < 2; i++) {
      const t = 0.2 + r() * 0.5;
      const s = 0.3 + r() * 0.35;
      const x = Math.round(d[0] + (c[0] - d[0]) * t + (a[0] - d[0]) * s);
      const y = Math.round(d[1] + (c[1] - d[1]) * t + (a[1] - d[1]) * s);
      rect(ctx, x, y - 18, 8, 18, '#c0634a');
      rect(ctx, x + 6, y - 18, 4, 18, '#94442f');
      rect(ctx, x - 2, y - 21, 14, 4, '#5a5266');
      rect(ctx, x - 2, y - 21, 14, 1, '#7a7286');
    }
    // claraboya
    const sx = Math.round((d[0] + b[0]) / 2) - 12;
    const sy = Math.round((d[1] + b[1]) / 2) + 2;
    rect(ctx, sx, sy, 24, 10, '#8fa3d6');
    rect(ctx, sx, sy, 24, 3, '#bfd0ff');
    rect(ctx, sx + 11, sy, 2, 10, '#5a5266');
  };
}

function edgeLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, c: string) {
  edge(ctx, x0, y0, x1, y1, c);
}

export function buildingArt(spec: BuildingSpec): BoxArt {
  return isoBox(spec.wx, spec.wy, buildingHeight(spec.floors), mainFacade(spec), sideFacade(spec), roof(spec));
}

/**
 * Edificio con la fachada frontal dibujada aparte (imagen externa del ancho de la fachada). El lateral se pinta
 * liso con el color medio de la propia fachada y el tejado es el procedural.
 */
export function facadeArt(spec: BuildingSpec, face: CanvasImageSource & { width: number; height: number }, lights: Light[]): BoxArt {
  const H = face.height;
  const front = makeCanvas(spec.wx * BAY, H);
  front.ctx.imageSmoothingEnabled = false;
  front.ctx.drawImage(face, 0, 0, spec.wx * BAY, H);
  // color del muro: media de la franja superior de la fachada
  const d = front.ctx.getImageData(0, ATTIC_H, spec.wx * BAY, 8).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  const wall = shade(`#${[r, g, b].map((c) => Math.round(c / n).toString(16).padStart(2, '0')).join('')}`, 0.72);
  const side = makeCanvas(spec.wy * BAY, H);
  rect(side.ctx, 0, 0, spec.wy * BAY, H, wall);
  rect(side.ctx, 0, ATTIC_H - 6, spec.wy * BAY, 4, shade(wall, 1.12));
  rect(side.ctx, 0, H - 6, spec.wy * BAY, 6, shade(wall, 0.75));
  return isoBox(spec.wx, spec.wy, H, { canvas: front.canvas, lights }, { canvas: side.canvas }, roof(spec));
}
