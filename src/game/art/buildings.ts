import { HALF_H, HALF_W } from '../iso';
import { pixelText, textWidth } from './font';
import { PAL } from './palette';
import { fillEllipse, line, makeCanvas, mix, poly, px, rect, ring, rng, shade, shearFace, type Ctx } from './pixel';

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

export type BuildingKind = 'apartment' | 'buergeramt' | 'bar' | 'club' | 'office' | 'spaeti';

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

/** Planta baja más alta en el edificio del Späti: puertas de ~80 px para un Tony de ~75 px. */
export const SPAETI_GROUND_H = 120;

function heightOf(spec: BuildingSpec) {
  return (spec.kind === 'spaeti' ? SPAETI_GROUND_H : GROUND_H) + spec.floors * FLOOR_H + ATTIC_H;
}

function wallColor(spec: BuildingSpec) {
  return spec.kind === 'club' ? '#4a4258' : spec.kind === 'buergeramt' ? '#e2d6c0' : spec.kind === 'spaeti' ? '#e6d8bf' : spec.color;
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
  const H = heightOf(spec);
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
  if (spec.kind === 'spaeti') {
    ivy(ctx, 0, ATTIC_H, 7, H - ATTIC_H - 10, r);
    ivy(ctx, W - 9, ATTIC_H + 20, 9, H - ATTIC_H - 30, r);
  }
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
  if (spec.kind === 'spaeti') return isoBox(spec.wx, spec.wy, heightOf(spec), spaetiFacade(spec), sideFacade(spec), spaetiRoof(spec));
  return isoBox(spec.wx, spec.wy, buildingHeight(spec.floors), mainFacade(spec), sideFacade(spec), roof(spec));
}

// ───────────── Edificio del Späti (casa de Tony) ─────────────
// Vivienda berlinesa de 2 plantas sobre un Späti turco de neones. Planta baja (de oeste a este):
// vanos 0–2 = Späti (neveras, puerta de cristal en el vano 1, escaparate), vano 3 = portal de la vivienda,
// vanos 4–5 = carta de neón, buzones y cajero.

/** Hiedra trepadora en una franja vertical. */
function ivy(ctx: Ctx, x: number, y: number, w: number, h: number, r: () => number) {
  for (let yy = y; yy < y + h; yy += 3) {
    if (r() < 0.25) continue;
    const cx = x + Math.floor(r() * w);
    fillEllipse(ctx, cx, yy, 2 + Math.floor(r() * 2), 2, r() < 0.5 ? PAL.leafDark : PAL.leaf);
    if (r() < 0.4) px(ctx, cx + 1, yy - 1, PAL.leafLight);
  }
}

/** Jardinera con flores bajo una ventana. */
function flowerBox(ctx: Ctx, x: number, y: number, w: number, r: () => number) {
  for (let i = 0; i < w; i += 3) {
    fillEllipse(ctx, x + i + 1, y - 2, 2, 2, r() < 0.5 ? PAL.leaf : PAL.leafDark);
    if (r() < 0.6) px(ctx, x + i + 1, y - 3, r() < 0.5 ? '#ff4f6a' : '#ff9ad0');
  }
  rect(ctx, x - 1, y, w + 2, 4, '#9a5a32');
  rect(ctx, x - 1, y + 3, w + 2, 1, '#6a3a20');
}

function spaetiFacade(spec: BuildingSpec): FaceTex {
  const r = rng(spec.seed);
  const W = spec.wx * BAY;
  const H = heightOf(spec);
  const { canvas, ctx } = makeCanvas(W, H);
  const lights: Light[] = [];
  const wall = wallColor(spec);
  rect(ctx, 0, 0, W, H, wall);
  for (let y = 0; y < H; y += 8) rect(ctx, 0, y, W, 1, shade(wall, 0.97));
  // manchas y desgaste del revoco
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W);
    const y = ATTIC_H + Math.floor(r() * (H - ATTIC_H - SPAETI_GROUND_H));
    rect(ctx, x, y, 1 + Math.floor(r() * 4), 1 + Math.floor(r() * 3), shade(wall, 0.9 + r() * 0.05));
  }

  // cornisa con dentículos
  rect(ctx, 0, 0, W, ATTIC_H, shade(wall, 0.9));
  rect(ctx, 0, ATTIC_H - 6, W, 4, shade(wall, 1.12));
  rect(ctx, 0, ATTIC_H - 2, W, 2, shade(wall, 0.7));
  for (let x = 2; x < W; x += 8) rect(ctx, x, ATTIC_H - 10, 4, 4, shade(wall, 1.1));

  // plantas de viviendas: ventanas grandes, algunas iluminadas, jardineras
  for (let f = 0; f < spec.floors; f++) {
    const top = ATTIC_H + f * FLOOR_H;
    rect(ctx, 0, top + FLOOR_H - 3, W, 3, shade(wall, 1.1));
    rect(ctx, 0, top + FLOOR_H, W, 1, shade(wall, 0.78));
    for (let b = 0; b < spec.wx; b++) {
      const l = windowAt(ctx, b * BAY + 8, top + 8, 16, 28, r() < 0.6, r, wall);
      if (l) lights.push(l);
      if (r() < 0.55) flowerBox(ctx, b * BAY + 6, top + 44, 20, r);
    }
  }
  // grafitis de las plantas altas: firma lila, corazón y oso de Berlín
  const gy = ATTIC_H + FLOOR_H + 30;
  pixelText(ctx, 'KIEZ', 37, gy + 1, PAL.ink, 2);
  pixelText(ctx, 'KIEZ', 36, gy, '#b07ae8', 2);
  for (const [x, y] of [[0, 1], [1, 0], [2, 1], [3, 0], [4, 1], [1, 2], [3, 2], [2, 3]]) px(ctx, 156 + x, ATTIC_H + 37 + y, '#d23a4a');
  const bx = 132;
  const by = ATTIC_H + FLOOR_H + 26;
  rect(ctx, bx + 2, by, 5, 4, '#1c1726'); // oso
  rect(ctx, bx, by + 4, 8, 7, '#1c1726');
  rect(ctx, bx + 6, by + 2, 3, 2, '#1c1726');
  rect(ctx, bx + 1, by + 11, 2, 3, '#1c1726');
  rect(ctx, bx + 5, by + 11, 2, 3, '#1c1726');
  rect(ctx, bx + 2, by - 2, 4, 1, '#f0c95a'); // corona

  // ── planta baja ──
  const gTop = H - SPAETI_GROUND_H;
  rect(ctx, 0, gTop, W, 4, shade(wall, 1.15));
  rect(ctx, 0, gTop + 4, W, 2, shade(wall, 0.72));
  rect(ctx, 0, gTop + 6, 96, SPAETI_GROUND_H - 6, '#3a3346'); // frente del comercio
  rect(ctx, 0, H - 6, W, 6, shade(wall, 0.68)); // zócalo
  const shopTop = gTop + 48;

  // rótulo luminoso: SPÄTI en neón rojo, líneas rosa y verde, media luna
  rect(ctx, 2, gTop + 8, 92, 26, '#16121c');
  rect(ctx, 2, gTop + 8, 92, 1, '#4a4258');
  rect(ctx, 6, gTop + 11, 84, 1, PAL.neonPink);
  rect(ctx, 6, gTop + 30, 84, 1, '#5fe39a');
  lights.push({ ...neonText(ctx, 'SPÄTI', 14, gTop + 14, PAL.neonRed, 3), r: 40, alpha: 0.28 }); // halo suave: el rótulo se lee
  ring(ctx, 80, gTop + 21, 6, 6, PAL.neonRed, 1);
  fillEllipse(ctx, 83, gTop + 20, 5, 5, '#16121c');
  px(ctx, 85, gTop + 20, PAL.neonRed);
  px(ctx, 86, gTop + 21, PAL.neonRed);
  px(ctx, 85, gTop + 22, PAL.neonRed);
  for (let i = 0; i < 6; i++) px(ctx, 6 + i, gTop + 26 - Math.abs(3 - i) * 2, PAL.neonRed); // Fernsehturm en neón
  lights.push({ x: 48, y: gTop + 9, color: PAL.neonPink, r: 30, alpha: 0.16 }, { x: 48, y: gTop + 32, color: '#5fe39a', r: 30, alpha: 0.16 });

  // toldo de rayas rojas y blancas con festón
  for (let x = 0; x < 96; x++) {
    const c = Math.floor(x / 6) % 2 ? '#c8283c' : '#f2ece4';
    rect(ctx, x, gTop + 36, 1, 10, c);
    if (x % 6 > 0 && x % 6 < 5) rect(ctx, x, gTop + 46, 1, 2, c);
  }
  rect(ctx, 0, gTop + 35, 96, 2, '#7a1020');

  // vano 0: dos neveras iluminadas llenas de bebidas
  for (const fx of [3, 18]) {
    rect(ctx, fx, shopTop, 14, H - 6 - shopTop, '#cfd8e8');
    rect(ctx, fx + 1, shopTop + 1, 12, H - 8 - shopTop, '#e8f6ff');
    for (let y = shopTop + 3; y < H - 20; y += 7) {
      for (let x = fx + 2; x < fx + 12; x += 3) rect(ctx, x, y, 2, 5, ['#3fa04a', '#c0392b', '#f0c95a', '#5fc2ff', '#ff9a4a'][Math.floor(r() * 5)]);
      rect(ctx, fx + 1, y + 5, 12, 1, '#9fb4cc');
    }
    rect(ctx, fx + 12, shopTop + 20, 1, 8, '#7a8296');
  }
  lights.push({ x: 18, y: shopTop + 24, color: '#bfe8ff', r: 36, alpha: 0.3 });

  // vano 1: puerta de cristal del Späti (iluminada por dentro)
  const dx = 38;
  const dTop = H - 82;
  rect(ctx, dx - 2, dTop, 24, 82, '#2a2430');
  rect(ctx, dx, dTop + 2, 20, 80, '#ffe6a8');
  for (let y = dTop + 10; y < H - 10; y += 9) {
    rect(ctx, dx + 2, y, 16, 1, '#c9a070');
    for (let x = dx + 3; x < dx + 17; x += 3) rect(ctx, x, y - 4, 2, 4, ['#e8333a', '#5fc2ff', '#ffd77a', '#5fe39a'][Math.floor(r() * 4)]);
  }
  rect(ctx, dx - 3, dTop - 1, 26, 3, '#1c1726'); // marco marcado: se distingue de los escaparates
  rect(ctx, dx - 3, dTop, 3, 82, '#1c1726');
  rect(ctx, dx + 20, dTop, 3, 82, '#1c1726');
  rect(ctx, dx, H - 14, 20, 8, '#4a4258'); // zócalo de la puerta
  rect(ctx, dx + 3, dTop + 6, 14, 7, '#16121c'); // cartel OFFEN
  pixelText(ctx, 'OFFEN', dx + 4, dTop + 7, '#5fe39a', 1);
  rect(ctx, dx + 15, dTop + 40, 2, 8, '#f0c95a'); // tirador
  rect(ctx, dx - 4, H - 3, 28, 3, '#5a4a3a'); // felpudo
  lights.push({ x: dx + 10, y: H - 36, color: PAL.lampGlow, r: 44, alpha: 0.5 });

  // vano 2: escaparate con estanterías, carteles y pegatinas
  rect(ctx, 62, shopTop, 32, H - 6 - shopTop, '#2a2430');
  rect(ctx, 64, shopTop + 2, 28, H - 10 - shopTop, '#ffd9a0');
  for (let y = shopTop + 8; y < H - 12; y += 8) {
    rect(ctx, 64, y, 28, 1, '#a8804a');
    for (let x = 65; x < 91; x += 3) if (r() < 0.85) rect(ctx, x, y - 4, 2, 4, ['#c0392b', '#3fa04a', '#f0c95a', '#7a4ab8', '#ff9a4a', '#5fc2ff'][Math.floor(r() * 6)]);
  }
  rect(ctx, 67, shopTop + 6, 9, 11, '#f2ece4'); // cartel de Döner
  rect(ctx, 70, shopTop + 8, 3, 7, '#c8742a');
  rect(ctx, 69, shopTop + 8, 5, 1, '#e0a050');
  rect(ctx, 80, shopTop + 5, 8, 8, '#1c1726'); // pegatina con corazón
  px(ctx, 83, shopTop + 8, '#e8333a');
  px(ctx, 85, shopTop + 8, '#e8333a');
  rect(ctx, 83, shopTop + 9, 3, 1, '#e8333a');
  px(ctx, 84, shopTop + 10, '#e8333a');
  lights.push({ x: 78, y: shopTop + 30, color: PAL.windowLitHot, r: 44, alpha: 0.45 });
  // pilares con pegatinas
  for (const x of [34, 59, 94]) for (let i = 0; i < 4; i++) rect(ctx, x + Math.floor(r() * 2), shopTop + 8 + Math.floor(r() * 50), 2, 3, ['#ff5fd6', '#5fe39a', '#ffd77a', '#f2ece4'][i]);

  // cajas de fruta y de bebidas delante del comercio (pegadas a la fachada)
  const crate = (x: number, y: number, w: number, c: string, fill: string[]) => {
    rect(ctx, x, y, w, 9, c);
    rect(ctx, x, y, w, 1, shade(c, 1.3));
    rect(ctx, x + 1, y + 4, w - 2, 1, shade(c, 0.7));
    for (let i = x + 1; i < x + w - 1; i += 2) rect(ctx, i, y - 2, 2, 2, fill[Math.floor(r() * fill.length)]);
  };
  crate(2, H - 25, 12, '#2b6cb0', ['#c9e6f0', '#3fa04a']);
  crate(2, H - 15, 12, '#c0392b', ['#c9e6f0', '#f0c95a']);
  crate(15, H - 15, 12, '#c0392b', ['#e8f6ff', '#c0392b']);
  crate(63, H - 15, 14, '#3a7a3a', ['#ff9a4a', '#ff8a2a', '#f0c95a']);
  crate(78, H - 15, 14, '#8a5a32', ['#f0e060', '#d8c040', '#3fa04a']);
  fillEllipse(ctx, 70, H - 4, 4, 3, '#3a8a3a'); // sandía
  rect(ctx, 68, H - 5, 4, 1, '#5fbf5f');

  // vano 3: portal de la vivienda (casa de Tony): madera, montante, número, timbres y farolillo
  const hx = 3 * BAY + 6;
  const hTop = H - 84;
  rect(ctx, hx - 4, hTop - 4, 28, 88, shade(wall, 0.78));
  rect(ctx, hx, hTop, 20, 12, PAL.windowLit);
  rect(ctx, hx + 9, hTop, 2, 12, PAL.frame);
  rect(ctx, hx, hTop + 14, 20, 70, PAL.woodDark);
  for (const [px0, py0] of [[2, 17], [11, 17], [2, 50], [11, 50]]) {
    rect(ctx, hx + px0, hTop + py0, 7, 30, PAL.wood);
    rect(ctx, hx + px0, hTop + py0, 7, 1, PAL.woodLight);
  }
  rect(ctx, hx + 15, hTop + 46, 2, 4, PAL.lamp); // pomo
  rect(ctx, hx + 3, hTop - 13, 14, 8, '#22356b'); // número de portal
  pixelText(ctx, '36', hx + 4, hTop - 12, '#ffffff', 1);
  rect(ctx, hx + 23, hTop + 34, 5, 12, '#b08a3a'); // placa de timbres
  for (let i = 0; i < 4; i++) px(ctx, hx + 25, hTop + 36 + i * 3, '#f2ece4');
  rect(ctx, hx + 23, hTop + 4, 5, 5, PAL.lamp); // farolillo
  rect(ctx, hx + 24, hTop + 9, 3, 1, PAL.iron);
  lights.push({ x: hx + 25, y: hTop + 6, color: PAL.lampGlow, r: 30, alpha: 0.5 });

  // vanos 4–5: carta de neón, Döner, buzones y cajero
  rect(ctx, 132, gTop + 8, 56, 40, '#16121c');
  rect(ctx, 132, gTop + 8, 56, 1, '#4a4258');
  const menu: [string, string][] = [['GETRÄNKE', '#ff5fd6'], ['SNACKS', '#5fc2ff'], ['TABAK', '#ffb84a'], ['SÜSSWAREN', '#c46bff'], ['OBST GEMÜSE', '#5fe39a']];
  menu.forEach(([t, c], i) => pixelText(ctx, t, 136, gTop + 11 + i * 7, c, 1));
  lights.push({ x: 160, y: gTop + 28, color: '#ff5fd6', r: 36, alpha: 0.18 });
  rect(ctx, 136, gTop + 54, 6, 14, '#c8742a'); // Döner en neón
  rect(ctx, 135, gTop + 54, 8, 2, '#ffb84a');
  rect(ctx, 138, gTop + 52, 2, 18, '#ffd77a');
  rect(ctx, 148, gTop + 58, 6, 7, '#ff4f6a'); // vaso de té
  rect(ctx, 146, gTop + 66, 10, 1, '#5fc2ff');
  lights.push({ x: 145, y: gTop + 60, color: '#ff9a4a', r: 30, alpha: 0.4 });
  rect(ctx, 134, H - 52, 22, 20, '#7a8296'); // buzones
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) rect(ctx, 136 + i * 7, H - 49 + j * 9, 5, 2, '#2a2430');
  rect(ctx, 168, H - 62, 20, 56, '#8a8f9a'); // cajero
  rect(ctx, 168, H - 62, 20, 2, '#b8bcc6');
  rect(ctx, 171, H - 54, 14, 10, '#5fc2ff');
  rect(ctx, 172, H - 53, 12, 3, '#bfe8ff');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rect(ctx, 172 + i * 4, H - 40 + j * 4, 3, 2, '#3a3346');
  lights.push({ x: 178, y: H - 50, color: '#5fc2ff', r: 22, alpha: 0.45 });
  graffiti(ctx, 156, H - 40, 12, 28, r, ['36']);

  // hiedra en las esquinas
  ivy(ctx, 0, ATTIC_H, 6, H - ATTIC_H - SPAETI_GROUND_H + 4, r);
  ivy(ctx, W - 7, ATTIC_H + 10, 7, H - ATTIC_H - 20, r);
  return { canvas, lights };
}

/** Tejado plano con parabólica, aire acondicionado, chimenea y ventilaciones. */
function spaetiRoof(spec: BuildingSpec) {
  const base = roof(spec);
  return (ctx: Ctx, pts: [number, number][]) => {
    base(ctx, pts);
    const [d, c, b] = pts;
    // aire acondicionado
    const ax = Math.round((d[0] + b[0]) / 2) + 26;
    const ay = Math.round((d[1] + b[1]) / 2) - 2;
    rect(ctx, ax, ay - 10, 18, 12, '#d8dce6');
    rect(ctx, ax, ay - 10, 18, 2, '#f2f4f8');
    ring(ctx, ax + 6, ay - 4, 3, 3, '#7a8296', 1);
    rect(ctx, ax + 12, ay - 7, 4, 6, '#a8aeba');
    // parabólica
    const sx = d[0] + 30;
    const sy = d[1] + 18;
    fillEllipse(ctx, sx, sy - 10, 7, 8, '#e6e9f0');
    ring(ctx, sx, sy - 10, 7, 8, '#9aa4b8', 1);
    line(ctx, sx, sy - 10, sx + 4, sy, '#5a5266');
    // tubos de ventilación
    for (const [vx, vy] of [[Math.round((c[0] + b[0]) / 2) - 20, Math.round((c[1] + b[1]) / 2) - 4], [ax - 18, ay + 8]]) {
      rect(ctx, vx, vy - 8, 4, 8, '#6a6a7a');
      rect(ctx, vx - 1, vy - 9, 6, 2, '#8a8a9a');
    }
  };
}
