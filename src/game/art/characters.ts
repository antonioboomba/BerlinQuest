import { makeCanvas, outline, rect, shade, type Ctx } from './pixel';
import { PAL } from './palette';

// Avatares estilo «social sim»: 48×88 px por frame, cabeza grande, siluetas claras.
// «front» mira abajo-derecha (SE) y «back» arriba-derecha (NE); las izquierdas se obtienen volteando.
// Para usar arte dibujado a mano: una hoja PNG de 20 frames de 48×88 en fila con el mismo orden.

export const FRAME_W = 48;
export const FRAME_H = 88;
/** Distancia del pie al borde inferior del frame. */
export const FOOT_PAD = 2;
/** Posición de la mano que sujeta objetos, relativa al centro de los pies. */
export const HAND = { x: 19, y: -40 };

export type HairStyle = 'short' | 'long' | 'bun' | 'curly' | 'cap' | 'beanie' | 'bald' | 'mohawk' | 'bob';

export interface CharStyle {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  accent?: string;
  sleeves?: 'short' | 'long';
  /** chaqueta abierta: muestra «accent» como camiseta interior */
  jacket?: boolean;
  pants: string;
  shoes: string;
  beard?: boolean;
  glasses?: boolean;
  backpack?: string;
  apron?: string;
  headphones?: boolean;
  skirt?: boolean;
}

interface Pose {
  leg: -1 | 0 | 1;
  bob: 0 | 1;
  carry?: boolean;
  sit?: boolean;
}

/** Índices de frame dentro de cada hoja (front = +0, back = +10). */
export const FRAMES = { idle: [0, 1], walk: [2, 3, 4, 5], carryIdle: [6], carryWalk: [7, 6, 8, 6], sit: [9] } as const;
const POSES: Pose[] = [
  { leg: 0, bob: 0 },
  { leg: 0, bob: 1 },
  { leg: 1, bob: 0 },
  { leg: 0, bob: 1 },
  { leg: -1, bob: 0 },
  { leg: 0, bob: 1 },
  { leg: 0, bob: 0, carry: true },
  { leg: 1, bob: 0, carry: true },
  { leg: -1, bob: 0, carry: true },
  { leg: 0, bob: 0, sit: true },
];

export function drawCharacterSheet(style: CharStyle): HTMLCanvasElement {
  const n = POSES.length * 2;
  const { canvas, ctx } = makeCanvas(FRAME_W * n, FRAME_H);
  POSES.forEach((pose, i) => {
    drawAvatar(ctx, i * FRAME_W, style, pose, false);
    drawAvatar(ctx, (i + POSES.length) * FRAME_W, style, pose, true);
  });
  for (let i = 0; i < n; i++) outline(ctx, FRAME_W, FRAME_H, PAL.outline, i * FRAME_W, 0);
  return canvas;
}

function drawAvatar(ctx: Ctx, ox: number, s: CharStyle, p: Pose, back: boolean) {
  const r = (x: number, y: number, w: number, h: number, c: string) => rect(ctx, ox + x, y, w, h, c);
  const sit = !!p.sit;
  const dy = p.bob + (sit ? 12 : 0); // torso y cabeza bajan al sentarse
  const skinD = shade(s.skin, 0.82);
  const skinL = shade(s.skin, 1.08);
  const top = s.top;
  const topD = shade(top, 0.78);
  const topL = shade(top, 1.14);
  const pants = s.pants;
  const pantsD = shade(pants, 0.75);
  const shoeD = shade(s.shoes, 0.75);

  // ── Piernas ──
  if (sit) {
    r(16, 63, 22, 9, pants); // muslos hacia delante
    r(16, 70, 22, 2, pantsD);
    r(31, 70, 8, 12, pants); // espinillas
    r(36, 70, 3, 12, pantsD);
    r(30, 81, 12, 5, s.shoes);
    r(30, 84, 12, 2, shoeD);
  } else {
    const off = (side: -1 | 1) => (p.leg === 0 ? 0 : p.leg === side ? 2 : -2);
    const lift = (side: -1 | 1) => (p.leg === -side ? 3 : 0);
    const leg = (x: number, side: -1 | 1) => {
      const lx = x + off(side);
      const h = 22 - lift(side);
      if (s.skirt) {
        r(lx + 1, 58, 6, h, s.skin);
        r(lx + 5, 58, 2, h, skinD);
      } else {
        r(lx, 58, 8, h, pants);
        r(lx + 6, 58, 2, h, pantsD);
      }
      r(lx - 1, 80 - lift(side), 11, 4, s.shoes);
      r(lx - 1, 83 - lift(side), 11, 2, shoeD);
      r(lx, 80 - lift(side), 4, 1, shade(s.shoes, 1.25));
    };
    leg(15, -1);
    leg(25, 1);
    if (s.skirt) {
      r(13, 54, 22, 10, pants);
      r(31, 54, 4, 10, pantsD);
    } else {
      r(15, 56, 18, 4, pants); // cadera
    }
  }

  // ── Torso ──
  const ty = 33 + dy;
  r(14, ty, 20, 24, top);
  r(14, ty, 2, 24, topL);
  r(30, ty, 4, 24, topD);
  r(14, ty + 22, 20, 2, topD);
  if (!back) {
    if (s.jacket) {
      r(20, ty + 1, 8, 22, s.accent ?? '#f2ece4');
      r(26, ty + 1, 2, 22, shade(s.accent ?? '#f2ece4', 0.85));
      r(19, ty, 1, 23, topD);
      r(28, ty, 1, 23, topD);
    } else {
      r(19, ty, 10, 3, s.accent ?? topL); // cuello
      r(20, ty + 3, 8, 1, topD);
    }
    if (s.apron) {
      r(16, ty + 9, 16, 16, s.apron);
      r(16, ty + 9, 16, 2, shade(s.apron, 1.3));
      r(28, ty + 9, 4, 16, shade(s.apron, 0.8));
      r(22, ty + 15, 5, 4, shade(s.apron, 1.2)); // bolsillo
    }
  } else if (s.backpack) {
    r(16, ty + 3, 16, 19, s.backpack);
    r(16, ty + 3, 16, 3, shade(s.backpack, 1.25));
    r(28, ty + 3, 4, 19, shade(s.backpack, 0.78));
    r(19, ty + 11, 10, 6, shade(s.backpack, 0.88));
    r(19, ty + 11, 10, 1, shade(s.backpack, 1.2));
  }
  if (!back && s.backpack) {
    r(16, ty + 1, 3, 14, shade(s.backpack, 0.85)); // tirante
  }

  // ── Brazos ──
  const sleeveLen = s.sleeves === 'short' ? 8 : 20;
  const arm = (x: number, yOff: number, dark: boolean) => {
    const c = dark ? topD : top;
    r(x, ty + 1 + yOff, 5, sleeveLen, c);
    if (sleeveLen < 20) r(x, ty + 1 + yOff + sleeveLen, 5, 20 - sleeveLen, dark ? skinD : s.skin);
    r(x, ty + 21 + yOff, 5, 5, dark ? skinD : s.skin); // mano
  };
  if (p.carry) {
    arm(9, 0, false);
    // brazo derecho flexionado hacia delante
    r(33, ty + 1, 5, 10, topD);
    r(34, ty + 9, 10, 5, s.sleeves === 'short' ? skinD : topD);
    r(42, ty + 8, 5, 6, s.skin);
  } else {
    const swing = sit ? 0 : p.leg;
    arm(9, swing === 1 ? -2 : swing === -1 ? 1 : 0, false);
    arm(34, swing === -1 ? -2 : swing === 1 ? 1 : 0, true);
  }

  // ── Cabeza ──
  const hy = 8 + dy;
  r(21, hy + 21, 6, 4, skinD); // cuello
  r(13, hy + 2, 22, 19, s.skin);
  r(14, hy, 20, 2, s.skin);
  r(14, hy + 21, 20, 2, s.skin);
  r(15, hy + 23, 16, 1, skinD);
  r(31, hy + 2, 4, 19, skinD);
  if (!back) {
    r(13, hy + 2, 2, 19, skinL);
    // oreja
    r(12, hy + 10, 4, 6, skinD);
    r(13, hy + 11, 2, 4, shade(s.skin, 0.7));
    // ojos con brillo
    for (const ex of [21, 28]) {
      r(ex, hy + 10, 3, 4, PAL.ink);
      r(ex, hy + 10, 1, 1, '#ffffff');
    }
    r(20, hy + 8, 4, 1, shade(s.hair, 0.9)); // cejas
    r(27, hy + 8, 4, 1, shade(s.hair, 0.9));
    r(26, hy + 15, 2, 2, skinD); // nariz
    r(23, hy + 19, 6, 1, shade(s.skin, 0.6)); // boca
    r(24, hy + 20, 4, 1, '#d9707a');
    r(30, hy + 16, 3, 2, shade('#ff9a8a', 1)); // mejilla
    if (s.beard) {
      r(15, hy + 15, 18, 8, s.hair);
      r(15, hy + 22, 16, 2, shade(s.hair, 0.8));
      r(22, hy + 18, 7, 2, shade(s.skin, 0.6));
    }
    if (s.glasses) {
      r(19, hy + 9, 7, 6, PAL.ink);
      r(27, hy + 9, 7, 6, PAL.ink);
      r(20, hy + 10, 5, 4, '#bfe3ff');
      r(28, hy + 10, 5, 4, '#bfe3ff');
      r(20, hy + 10, 2, 1, '#ffffff');
      r(28, hy + 10, 2, 1, '#ffffff');
      r(26, hy + 10, 1, 1, PAL.ink);
    }
  } else {
    r(32, hy + 10, 4, 6, skinD); // oreja visible por detrás
  }
  drawHair(r, s, hy, back);
  if (s.headphones) {
    const c = s.accent ?? PAL.neonPink;
    r(13, hy - 2, 22, 3, '#2b2b36');
    r(11, hy + 8, 5, 9, c);
    r(11, hy + 8, 5, 2, shade(c, 1.3));
    if (!back) r(33, hy + 8, 4, 9, shade(c, 0.8));
  }
}

type R = (x: number, y: number, w: number, h: number, c: string) => void;

function drawHair(r: R, s: CharStyle, hy: number, back: boolean) {
  const h = s.hair;
  const hl = shade(h, 1.3);
  const hd = shade(h, 0.75);
  const hat = s.accent ?? '#3b5bdb';
  switch (s.hairStyle) {
    case 'bald':
      r(16, hy + 1, 8, 2, shade(s.skin, 1.15));
      return;
    case 'cap':
      r(12, hy - 3, 24, 9, hat);
      r(14, hy - 3, 12, 2, shade(hat, 1.3));
      r(32, hy - 3, 4, 9, shade(hat, 0.75));
      if (!back) {
        r(28, hy + 4, 12, 3, shade(hat, 0.7)); // visera
      } else r(13, hy + 6, 22, 8, h);
      r(12, hy + 6, 3, 6, h);
      return;
    case 'beanie':
      r(12, hy - 6, 24, 12, hat);
      r(12, hy + 3, 24, 4, shade(hat, 0.75));
      for (let x = 13; x < 36; x += 3) r(x, hy + 3, 1, 4, shade(hat, 0.6));
      r(14, hy - 5, 8, 2, shade(hat, 1.25));
      r(21, hy - 9, 6, 4, shade(hat, 1.1)); // pompón
      r(12, hy + 7, 3, 7, h);
      if (back) r(13, hy + 7, 22, 6, h);
      return;
  }
  // base común: casquete
  r(12, hy - 2, 24, 9, h);
  r(14, hy - 3, 18, 2, h);
  r(15, hy - 2, 10, 2, hl);
  r(32, hy - 1, 4, 8, hd);
  if (back) {
    r(12, hy + 6, 24, 13, h);
    r(12, hy + 17, 24, 2, hd);
    r(32, hy + 6, 4, 13, hd);
  } else {
    r(12, hy + 6, 4, 9, h); // patilla trasera
    r(26, hy + 6, 10, 3, h); // flequillo
    r(30, hy + 9, 6, 2, h);
  }
  switch (s.hairStyle) {
    case 'long':
      r(10, hy + 4, 5, 26, h);
      r(10, hy + 28, 5, 2, hd);
      if (back) r(12, hy + 17, 24, 13, h), r(12, hy + 28, 24, 2, hd);
      else r(34, hy + 6, 3, 18, hd);
      break;
    case 'bob':
      r(10, hy + 4, 5, 16, h);
      if (back) r(12, hy + 17, 24, 4, hd);
      else r(33, hy + 6, 4, 14, hd);
      break;
    case 'bun':
      r(17, hy - 10, 13, 9, h);
      r(19, hy - 10, 6, 2, hl);
      r(26, hy - 9, 4, 8, hd);
      break;
    case 'curly':
      r(9, hy - 6, 30, 10, h);
      r(9, hy + 2, 6, 14, h);
      for (const [x, y] of [[11, hy - 5], [18, hy - 7], [26, hy - 6], [33, hy - 3], [10, hy + 6]]) r(x, y, 4, 3, hl);
      if (!back) r(34, hy + 3, 5, 8, hd);
      else r(9, hy + 4, 30, 16, h);
      break;
    case 'mohawk':
      r(20, hy - 11, 8, 10, h);
      r(21, hy - 11, 3, 10, hl);
      break;
  }
}

// ───────────── Reparto ─────────────

export const CHARACTERS: Record<string, CharStyle> = {
  player: { skin: '#f2c19e', hair: '#7a4a2a', hairStyle: 'short', top: '#3a5bb8', accent: '#f2ece4', jacket: true, pants: '#2f3f6b', shoes: '#f2ece4', backpack: '#d9534f' },
  mehmet: { skin: '#d9a07a', hair: '#2a1d18', hairStyle: 'short', top: '#4a4a58', accent: '#f2ece4', sleeves: 'short', pants: '#2a2a38', shoes: '#3a2a22', beard: true, apron: '#2b2b38' },
  anna: { skin: '#f6caa6', hair: '#3a2418', hairStyle: 'bun', top: '#e0675a', accent: '#ffd77a', pants: '#3a4a7a', shoes: '#2b2b36', skirt: true },
  jonas: { skin: '#fbd9bf', hair: '#e8c06a', hairStyle: 'mohawk', top: '#4f9a5a', accent: '#ffd77a', sleeves: 'short', pants: '#4a4a5a', shoes: '#f2ece4', headphones: true, backpack: '#3b5bdb' },
  klaus: { skin: '#f0c4a2', hair: '#d6d6dc', hairStyle: 'cap', accent: '#3f5a7a', top: '#9a7a52', jacket: true, pants: '#5a5048', shoes: '#3a2a22', beard: true },
  lea: { skin: '#b07a52', hair: '#2a1d18', hairStyle: 'curly', top: '#a77bff', accent: '#5fe39a', pants: '#2b2b38', shoes: '#ff5fd6', glasses: true },
  guest1: { skin: '#f6caa6', hair: '#b06a3a', hairStyle: 'long', top: '#3fa08a', pants: '#3a3a4a', shoes: '#2b2b36' },
  guest2: { skin: '#8a5a3a', hair: '#1c1410', hairStyle: 'beanie', accent: '#ff7a2a', top: '#5a5a7a', jacket: true, pants: '#6a5a40', shoes: '#f2ece4' },
  guest3: { skin: '#f2c19e', hair: '#d9573a', hairStyle: 'short', top: '#f0c95a', accent: '#7a4a2a', sleeves: 'short', pants: '#3a4a7a', shoes: '#86532f', glasses: true },
  guest4: { skin: '#d9a07a', hair: '#5a3220', hairStyle: 'bob', top: '#c0507a', pants: '#2a2a38', shoes: '#2b2b36', skirt: true },
  bouncer: { skin: '#6a4028', hair: '#151018', hairStyle: 'bald', top: '#24242e', accent: '#3a3a48', jacket: true, pants: '#1c1c24', shoes: '#151018', beard: true, glasses: true },
};
