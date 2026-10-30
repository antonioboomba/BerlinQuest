import { TILE_H, TILE_W } from '../iso';
import { PAL } from './palette';
import { makeCanvas, rng, shade } from './pixel';

// Baldosas isométricas de 64×32 con patrones limpios alineados a los ejes (u, v) de la baldosa.

export type TileKind = 'cobble' | 'slab' | 'curb' | 'grass' | 'water' | 'wood' | 'tiles' | 'carpet' | 'asphaltDark';

type Painter = (u: number, v: number, r: () => number) => string | null;

function paintTile(fn: Painter, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE_W, TILE_H);
  const r = rng(seed);
  for (let py = 0; py < TILE_H; py++) {
    for (let pxl = 0; pxl < TILE_W; pxl++) {
      const sx = pxl + 0.5 - TILE_W / 2;
      const sy = py + 0.5;
      const u = (sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2;
      const v = (sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      const c = fn(u, v, r);
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(pxl, py, 1, 1);
    }
  }
  return canvas;
}

const frac = (n: number) => n - Math.floor(n);
const hash = (a: number, b: number) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);

const PAINTERS: Record<TileKind, Painter> = {
  // Adoquines: 3 filas por baldosa, piedras con bisel claro arriba y sombra abajo.
  cobble: (u, v) => {
    const rows = 3;
    const row = Math.floor(v * rows);
    const cu = u * 3 + (row % 2) * 0.5;
    const col = Math.floor(cu);
    const fu = frac(cu);
    const fv = frac(v * rows);
    if (fu < 0.07 || fv < 0.09) return PAL.cobbleLine;
    const t = hash(row, col);
    const base = t < 0.4 ? PAL.cobble : t < 0.75 ? shade(PAL.cobble, 1.05) : shade(PAL.cobble, 0.95);
    if (fv < 0.22 || fu < 0.15) return PAL.cobbleLight;
    if (fv > 0.86 || fu > 0.92) return PAL.cobbleDark;
    return base;
  },
  slab: (u, v) => {
    const fu = frac(u * 2);
    const fv = frac(v * 2);
    if (fu < 0.03 || fv < 0.03) return PAL.slabLine;
    if (fu < 0.07 || fv < 0.07) return PAL.slabLight;
    return (Math.floor(u * 2) + Math.floor(v * 2)) % 2 ? PAL.slab : shade(PAL.slab, 1.03);
  },
  curb: (u, v) => {
    if (v > 0.8) return v > 0.93 ? PAL.slabLine : PAL.curb;
    const fu = frac(u * 2);
    if (fu < 0.03 || v < 0.03) return PAL.slabLine;
    if (fu < 0.07 || v < 0.07) return PAL.slabLight;
    return PAL.slab;
  },
  grass: (u, v, r) => {
    const t = r();
    if (t < 0.025) return PAL.grassLight;
    if (t < 0.04) return PAL.grassDark;
    // matas de hierba en «V»
    const g = hash(Math.floor(u * 6), Math.floor(v * 6));
    if (g > 0.8 && frac(u * 6) > 0.4 && frac(u * 6) < 0.6 && frac(v * 6) < 0.3) return PAL.grassDark;
    return PAL.grass;
  },
  water: (u, v) => {
    const w = Math.sin((u * 2 + v) * Math.PI * 2);
    if (w > 0.93 && frac(v * 4) < 0.25) return PAL.waterLight;
    if (w < -0.95 && frac(u * 3) < 0.4) return PAL.waterDark;
    return PAL.water;
  },
  // Parqué: tablones a lo largo de u con juntas desplazadas.
  wood: (u, v) => {
    const planks = 4;
    const p = Math.floor(v * planks);
    const fv = frac(v * planks);
    const off = (p % 2) * 0.5;
    const fu = frac(u * 2 + off);
    if (fv < 0.08) return PAL.floorWoodDark;
    if (fu < 0.025) return PAL.floorWoodDark;
    const t = hash(p, Math.floor(u * 2 + off));
    const base = t < 0.5 ? PAL.floorWood : PAL.floorWoodLight;
    if (fv < 0.2) return shade(base, 1.06);
    return base;
  },
  // Baldosa de bar en damero.
  tiles: (u, v) => {
    const fu = frac(u * 2);
    const fv = frac(v * 2);
    if (fu < 0.04 || fv < 0.04) return '#5a4a5e';
    const dark = (Math.floor(u * 2) + Math.floor(v * 2)) % 2;
    return dark ? '#6e5a72' : '#e9dccd';
  },
  carpet: (u, v) => {
    if (u < 0.04 || v < 0.04 || u > 0.96 || v > 0.96) return '#7a2e3e';
    const d = Math.abs(frac(u * 2 + v * 2) - 0.5);
    return d < 0.08 ? '#c06a5a' : '#9e3a4a';
  },
  asphaltDark: (_u, _v, r) => (r() < 0.05 ? '#4a4a5a' : '#3e3e4c'),
};

export function tileCanvas(kind: TileKind, variant = 0): HTMLCanvasElement {
  return paintTile(PAINTERS[kind], 1000 + variant * 77 + kind.length * 13);
}

export const TILE_VARIANTS = 3;
