import { pixelText, textWidth } from './font';
import { PAL } from './palette';
import { fillEllipse, line, makeCanvas, outline, px, rect, ring, rng, shade, type Ctx } from './pixel';

// Objetos sueltos («furni»). Cada uno devuelve un canvas cuyo punto de apoyo es el centro inferior.
// Estilo: colores planos, luz desde arriba a la izquierda, contorno oscuro de 1 px.

export interface PropArt {
  canvas: HTMLCanvasElement;
  /** puntos de luz relativos al centro inferior (para halos aditivos) */
  lights?: { x: number; y: number; color: string; r: number }[];
}

// Las sombras se dibujan al final, por debajo y sin contorno.
let pendingShadows: [number, number, number, number][] = [];

function done(canvas: HTMLCanvasElement, ctx: Ctx, lights?: PropArt['lights']): PropArt {
  outline(ctx, canvas.width, canvas.height, PAL.outline);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 0.28;
  for (const [cx, cy, rx, ry] of pendingShadows) fillEllipse(ctx, cx, cy, rx, ry, '#1c1726');
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  pendingShadows = [];
  return { canvas, lights };
}

/** Sombra suave en el suelo (se aplica en done()). */
function groundShadow(_ctx: Ctx, cx: number, cy: number, rx: number, ry: number) {
  pendingShadows.push([cx, cy, rx, ry]);
}

/** Farola berlinesa (Gaslaterne) verde con farol de cristal. */
export function lamp(): PropArt {
  const { canvas, ctx } = makeCanvas(30, 124);
  const g = '#2f5a48';
  const gl = '#4f8a6a';
  const gd = '#1f4034';
  rect(ctx, 8, 112, 14, 10, g);
  rect(ctx, 8, 112, 3, 10, gl);
  rect(ctx, 19, 112, 3, 10, gd);
  rect(ctx, 6, 120, 18, 3, gd);
  rect(ctx, 12, 40, 6, 72, g);
  rect(ctx, 12, 40, 2, 72, gl);
  rect(ctx, 16, 40, 2, 72, gd);
  rect(ctx, 10, 70, 10, 4, gl); // anillos decorativos
  rect(ctx, 10, 96, 10, 3, gl);
  rect(ctx, 9, 34, 12, 6, g);
  // farol
  rect(ctx, 5, 12, 20, 22, PAL.lamp);
  rect(ctx, 7, 14, 16, 18, PAL.windowLitHot);
  rect(ctx, 5, 12, 2, 22, g);
  rect(ctx, 23, 12, 2, 22, gd);
  rect(ctx, 14, 12, 2, 22, '#e8b860');
  rect(ctx, 5, 22, 20, 1, '#e8b860');
  rect(ctx, 3, 8, 24, 4, g);
  rect(ctx, 3, 8, 24, 1, gl);
  rect(ctx, 7, 4, 16, 4, g);
  rect(ctx, 12, 0, 6, 4, g);
  rect(ctx, 5, 34, 20, 2, gd);
  return done(canvas, ctx, [{ x: 0, y: -100, color: PAL.lampGlow, r: 90 }]);
}

/** Árbol de calle con copa redonda y alcorque. */
export function tree(seed: number): PropArt {
  const W = 100;
  const H = 150;
  const { canvas, ctx } = makeCanvas(W, H);
  const r = rng(seed);
  groundShadow(ctx, 50, 142, 26, 7);
  // alcorque
  fillEllipse(ctx, 50, 140, 16, 6, '#6b4a34');
  fillEllipse(ctx, 50, 139, 14, 5, '#7d5a40');
  // tronco
  rect(ctx, 45, 80, 10, 60, PAL.trunk);
  rect(ctx, 45, 80, 3, 60, shade(PAL.trunk, 1.2));
  rect(ctx, 52, 80, 3, 60, PAL.trunkDark);
  line(ctx, 54, 96, 64, 86, PAL.trunk, 3);
  line(ctx, 46, 100, 38, 92, PAL.trunk, 3);
  // copa: grupos de bolas con tres tonos
  const balls: [number, number, number][] = [
    [50, 46, 34],
    [28, 60, 22],
    [72, 58, 22],
    [40, 26, 20],
    [62, 28, 20],
    [50, 70, 22],
  ];
  for (const [x, y, rad] of balls) fillEllipse(ctx, x + 2, y + 3, rad, rad * 0.9, PAL.leafDark);
  for (const [x, y, rad] of balls) fillEllipse(ctx, x, y, rad, rad * 0.9, PAL.leaf);
  for (const [x, y, rad] of balls) fillEllipse(ctx, x - rad * 0.25, y - rad * 0.3, rad * 0.55, rad * 0.45, PAL.leafLight);
  for (const [x, y, rad] of balls) fillEllipse(ctx, x - rad * 0.35, y - rad * 0.45, rad * 0.18, rad * 0.14, '#b4e07a');
  // hojas sueltas que rompen el borde
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const x = 50 + Math.cos(a) * 44;
    const y = 50 + Math.sin(a) * 38;
    if (y < 92) rect(ctx, x, y, 4, 3, Math.sin(a) < 0 ? PAL.leafLight : PAL.leaf);
  }
  return done(canvas, ctx);
}

/** Bicicleta aparcada en diagonal. */
export function bike(color: string): PropArt {
  const { canvas, ctx } = makeCanvas(56, 40);
  groundShadow(ctx, 28, 34, 22, 4);
  const wheel = (cx: number, cy: number) => {
    ring(ctx, cx, cy, 10, 8, '#2b2b36', 2);
    ring(ctx, cx, cy, 7, 5, '#9a9aaa', 1);
    rect(ctx, cx - 1, cy - 1, 3, 3, '#c9c9d6');
  };
  wheel(13, 26);
  wheel(42, 17);
  line(ctx, 13, 26, 24, 15, color, 2);
  line(ctx, 24, 15, 40, 17, color, 2);
  line(ctx, 24, 15, 28, 25, color, 2);
  line(ctx, 28, 25, 13, 26, color, 2);
  line(ctx, 28, 25, 37, 8, color, 2);
  line(ctx, 42, 17, 38, 6, '#5a5a6a', 2);
  rect(ctx, 19, 10, 9, 3, '#2b2b36'); // sillín
  rect(ctx, 34, 4, 8, 2, '#5a5a6a'); // manillar
  rect(ctx, 36, 10, 6, 4, shade(color, 0.7)); // cesta
  rect(ctx, 44, 8, 2, 2, PAL.windowLitHot); // luz
  return done(canvas, ctx);
}

export function bollard(): PropArt {
  const { canvas, ctx } = makeCanvas(14, 30);
  groundShadow(ctx, 7, 27, 6, 2);
  rect(ctx, 3, 4, 8, 24, '#3a3346');
  rect(ctx, 3, 4, 2, 24, '#5a5266');
  rect(ctx, 3, 9, 8, 3, '#e6e1ea');
  rect(ctx, 4, 1, 6, 3, '#3a3346');
  return done(canvas, ctx);
}

/** Papelera naranja de la BSR. */
export function bin(): PropArt {
  const { canvas, ctx } = makeCanvas(24, 36);
  groundShadow(ctx, 12, 33, 10, 3);
  const o = PAL.bsrOrange;
  rect(ctx, 3, 8, 18, 22, o);
  rect(ctx, 3, 8, 4, 22, shade(o, 1.18));
  rect(ctx, 17, 8, 4, 22, shade(o, 0.78));
  rect(ctx, 1, 5, 22, 4, shade(o, 0.85));
  rect(ctx, 1, 5, 22, 1, shade(o, 1.2));
  rect(ctx, 7, 12, 10, 4, '#3a2418');
  rect(ctx, 8, 20, 8, 1, shade(o, 0.7));
  rect(ctx, 10, 30, 4, 4, '#3a3346');
  return done(canvas, ctx);
}

/** Banco de madera a lo largo del eje x del mundo. */
export function bench(): PropArt {
  const { canvas, ctx } = makeCanvas(60, 44);
  groundShadow(ctx, 30, 36, 26, 6);
  for (let i = 0; i < 50; i++) {
    const y = 14 + Math.floor(i / 2);
    rect(ctx, 5 + i, y, 1, 3, PAL.woodLight);
    rect(ctx, 5 + i, y + 3, 1, 1, PAL.woodDark);
    rect(ctx, 5 + i, y - 10, 1, 3, PAL.wood);
    rect(ctx, 5 + i, y - 6, 1, 3, PAL.woodLight);
  }
  for (const x of [8, 48]) {
    const y = 14 + Math.floor((x - 5) / 2);
    rect(ctx, x, y - 12, 3, 26, '#3a3346');
  }
  return done(canvas, ctx);
}

/** Jardinera con flores (caja isométrica pequeña). */
export function planter(seed: number): PropArt {
  const { canvas, ctx } = makeCanvas(36, 40);
  const r = rng(seed);
  groundShadow(ctx, 18, 36, 16, 4);
  rect(ctx, 4, 22, 28, 14, '#a06a4a');
  rect(ctx, 4, 22, 28, 3, '#c48a64');
  rect(ctx, 24, 22, 8, 14, '#86532f');
  for (let i = 0; i < 14; i++) fillEllipse(ctx, 7 + r() * 22, 12 + r() * 10, 4, 3, r() < 0.5 ? PAL.leaf : PAL.leafLight);
  const flowers = ['#ff6b8a', '#ffd77a', '#ffffff', '#a77bff'];
  for (let i = 0; i < 8; i++) {
    const x = 7 + r() * 22;
    const y = 8 + r() * 12;
    rect(ctx, x, y, 3, 3, flowers[Math.floor(r() * flowers.length)]);
    px(ctx, x + 1, y + 1, '#fff6c8');
  }
  return done(canvas, ctx);
}

/** Señal de U-Bahn: cuadrado azul con «U» blanca sobre poste. */
export function ubahnSign(): PropArt {
  const { canvas, ctx } = makeCanvas(40, 104);
  groundShadow(ctx, 20, 101, 8, 2);
  rect(ctx, 18, 36, 5, 66, '#5a5a6a');
  rect(ctx, 18, 36, 2, 66, '#7a7a8a');
  rect(ctx, 2, 0, 36, 36, '#ffffff');
  rect(ctx, 4, 2, 32, 32, PAL.ubahnBlue);
  rect(ctx, 4, 2, 32, 3, '#5a86ff');
  rect(ctx, 11, 8, 5, 17, '#ffffff');
  rect(ctx, 24, 8, 5, 17, '#ffffff');
  rect(ctx, 13, 23, 14, 5, '#ffffff');
  rect(ctx, 11, 22, 3, 3, '#ffffff');
  rect(ctx, 26, 22, 3, 3, '#ffffff');
  return done(canvas, ctx, [{ x: 0, y: -84, color: PAL.neonBlue, r: 46 }]);
}

/** Columna de anuncios (Litfaßsäule). */
export function litfass(): PropArt {
  const { canvas, ctx } = makeCanvas(40, 84);
  groundShadow(ctx, 20, 80, 18, 4);
  rect(ctx, 5, 14, 30, 62, '#4a4a5a');
  const posters: [string, string][] = [
    ['#ff6b8a', 'TECHNO'],
    ['#ffd77a', 'KUNST'],
    ['#5fc2ff', 'KINO'],
  ];
  posters.forEach(([c, t], i) => {
    const y = 16 + i * 20;
    rect(ctx, 6, y, 28, 18, c);
    rect(ctx, 6, y, 28, 2, shade(c, 1.2));
    pixelText(ctx, t, 20 - textWidth(t) / 2, y + 7, '#2a2238');
  });
  rect(ctx, 27, 14, 8, 62, 'rgba(0,0,0,0.18)');
  rect(ctx, 2, 8, 36, 6, '#2f5a48');
  rect(ctx, 2, 8, 36, 2, '#4f8a6a');
  rect(ctx, 9, 2, 22, 6, '#2f5a48');
  rect(ctx, 16, 0, 8, 2, '#2f5a48');
  rect(ctx, 3, 76, 34, 5, '#2f5a48');
  return done(canvas, ctx);
}

/** Caballete de pizarra con precios. */
export function chalkboard(lines: string[]): PropArt {
  const { canvas, ctx } = makeCanvas(40, 52);
  groundShadow(ctx, 20, 49, 16, 3);
  line(ctx, 6, 50, 10, 2, PAL.woodDark, 3);
  line(ctx, 34, 50, 30, 2, PAL.woodDark, 3);
  rect(ctx, 6, 3, 28, 36, PAL.wood);
  rect(ctx, 8, 5, 24, 32, '#2f3f38');
  lines.forEach((l, i) => pixelText(ctx, l, 10, 8 + i * 9, i % 2 ? PAL.lamp : '#f2ece4'));
  return done(canvas, ctx);
}

/** Placa de calle sobre poste. */
export function streetSign(name: string): PropArt {
  const w = textWidth(name, 2) + 14;
  const { canvas, ctx } = makeCanvas(w + 2, 86);
  groundShadow(ctx, w / 2, 83, 6, 2);
  rect(ctx, Math.floor(w / 2) - 2, 20, 5, 64, '#5a5a6a');
  rect(ctx, 1, 1, w, 20, '#ffffff');
  rect(ctx, 3, 3, w - 4, 16, '#2a2238');
  pixelText(ctx, name, 8, 6, '#ffffff', 2);
  return done(canvas, ctx);
}

/** Tramo de barandilla del canal a lo largo del eje x (una baldosa). */
export function railingX(): PropArt {
  const { canvas, ctx } = makeCanvas(34, 36);
  for (let i = 0; i < 33; i++) {
    const y = 4 + Math.floor(i / 2);
    rect(ctx, i, y, 1, 2, '#5f9a78');
    rect(ctx, i, y + 10, 1, 1, PAL.railGreen);
    if (i % 8 === 0) rect(ctx, i, y, 2, 18, PAL.railGreen);
  }
  return { canvas };
}

/** Mesa de terraza con mantel a cuadros y vela. */
export function terraceTable(): PropArt {
  const { canvas, ctx } = makeCanvas(40, 40);
  groundShadow(ctx, 20, 36, 14, 4);
  rect(ctx, 18, 18, 4, 18, '#3a3346');
  rect(ctx, 12, 34, 16, 2, '#3a3346');
  fillEllipse(ctx, 20, 15, 17, 7, '#ffffff');
  for (let x = 4; x < 37; x += 4) rect(ctx, x, 10, 2, 11, '#e0675a');
  rect(ctx, 3, 18, 34, 2, '#c94a4a');
  rect(ctx, 18, 5, 4, 7, '#fff0d8');
  rect(ctx, 19, 2, 2, 3, PAL.lamp);
  return done(canvas, ctx, [{ x: 0, y: -34, color: PAL.lampGlow, r: 28 }]);
}

export function chair(): PropArt {
  const { canvas, ctx } = makeCanvas(24, 40);
  rect(ctx, 4, 2, 4, 22, PAL.woodDark);
  rect(ctx, 4, 2, 4, 3, PAL.woodLight);
  rect(ctx, 8, 6, 2, 12, PAL.wood);
  rect(ctx, 4, 20, 16, 5, PAL.wood);
  rect(ctx, 4, 20, 16, 2, PAL.woodLight);
  rect(ctx, 5, 25, 2, 13, PAL.woodDark);
  rect(ctx, 17, 25, 2, 13, PAL.woodDark);
  return done(canvas, ctx);
}

export function barStool(): PropArt {
  const { canvas, ctx } = makeCanvas(24, 44);
  groundShadow(ctx, 12, 41, 9, 3);
  fillEllipse(ctx, 12, 8, 10, 4, '#c94a4a');
  fillEllipse(ctx, 12, 7, 8, 2, '#e8707a');
  rect(ctx, 2, 8, 20, 4, '#9e3a3a');
  rect(ctx, 10, 12, 4, 26, '#9a9aaa');
  rect(ctx, 10, 12, 1, 26, '#e6e1ea');
  rect(ctx, 6, 26, 12, 2, '#9a9aaa');
  fillEllipse(ctx, 12, 39, 8, 3, '#6a6a7a');
  return done(canvas, ctx);
}

/** Mesa redonda de bar con vela. */
export function roundTable(): PropArt {
  const { canvas, ctx } = makeCanvas(52, 46);
  groundShadow(ctx, 26, 42, 18, 4);
  rect(ctx, 23, 20, 6, 20, '#3a3346');
  fillEllipse(ctx, 26, 41, 12, 3, '#3a3346');
  fillEllipse(ctx, 26, 19, 23, 9, PAL.woodDark);
  fillEllipse(ctx, 26, 17, 23, 9, PAL.wood);
  fillEllipse(ctx, 22, 15, 14, 5, PAL.woodLight);
  rect(ctx, 23, 6, 6, 9, '#fff0d8');
  rect(ctx, 23, 6, 2, 9, '#ffffff');
  rect(ctx, 25, 2, 2, 4, PAL.lamp);
  px(ctx, 25, 1, PAL.windowLitHot);
  return done(canvas, ctx, [{ x: 0, y: -42, color: PAL.lampGlow, r: 40 }]);
}

/** Lámpara colgante de interior (pantalla cónica). */
export function hangingLamp(): PropArt {
  const { canvas, ctx } = makeCanvas(36, 64);
  rect(ctx, 17, 0, 2, 40, '#3a3346');
  for (let y = 0; y < 14; y++) rect(ctx, 18 - 4 - y, 40 + y, 8 + y * 2, 1, y < 2 ? '#e0675a' : '#c94a4a');
  rect(ctx, 4, 53, 28, 2, '#9e3a3a');
  fillEllipse(ctx, 18, 56, 7, 3, PAL.windowLitHot);
  return { canvas, lights: [{ x: 0, y: -8, color: PAL.lampGlow, r: 70 }] };
}

export function pottedPlant(seed: number): PropArt {
  const { canvas, ctx } = makeCanvas(40, 64);
  const r = rng(seed);
  groundShadow(ctx, 20, 60, 13, 3);
  rect(ctx, 10, 44, 20, 16, '#e8e1d6');
  rect(ctx, 10, 44, 20, 3, '#ffffff');
  rect(ctx, 24, 44, 6, 16, '#c9bfb4');
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
    const len = 26 + r() * 14;
    for (let d = 0; d < len; d++) {
      const x = 20 + Math.cos(a) * d * 0.7;
      const y = 44 + Math.sin(a) * d;
      rect(ctx, x - 1, y, 3, 2, d > len * 0.6 ? PAL.leafLight : PAL.leaf);
    }
  }
  return done(canvas, ctx);
}

/** Buzón amarillo. */
export function mailbox(): PropArt {
  const { canvas, ctx } = makeCanvas(26, 50);
  groundShadow(ctx, 13, 47, 9, 2);
  rect(ctx, 11, 30, 4, 18, '#5a5a6a');
  rect(ctx, 3, 4, 20, 28, '#ffcc33');
  rect(ctx, 3, 4, 4, 28, '#ffe07a');
  rect(ctx, 19, 4, 4, 28, '#d9a020');
  rect(ctx, 3, 1, 20, 4, '#e6b020');
  rect(ctx, 7, 10, 12, 3, '#3a3346');
  rect(ctx, 8, 18, 10, 8, '#ffe07a');
  return done(canvas, ctx);
}

// ───────────── Bebidas (iconos 20×24, también se llevan en la mano) ─────────────

export const DRINK_ART: Record<string, (ctx: Ctx) => void> = {
  bier: (ctx) => {
    rect(ctx, 3, 6, 11, 16, '#f2a93b');
    rect(ctx, 3, 6, 3, 16, '#ffd27a');
    rect(ctx, 11, 6, 3, 16, '#d9861e');
    rect(ctx, 2, 2, 13, 6, '#fff6e0');
    rect(ctx, 4, 0, 6, 3, '#fff6e0');
    rect(ctx, 14, 9, 4, 9, '#e6e1ea');
    rect(ctx, 15, 11, 2, 5, '#f2a93b');
    px(ctx, 7, 12, '#fff0bf');
    px(ctx, 9, 16, '#fff0bf');
  },
  wein: (ctx) => {
    fillEllipse(ctx, 10, 6, 7, 6, '#e6eef8');
    rect(ctx, 4, 6, 13, 6, '#9e1f3a');
    fillEllipse(ctx, 10, 11, 6, 2, '#9e1f3a');
    rect(ctx, 6, 7, 2, 3, '#e0507a');
    rect(ctx, 9, 13, 2, 7, '#e6eef8');
    rect(ctx, 5, 20, 10, 2, '#e6eef8');
  },
  cola: (ctx) => {
    rect(ctx, 8, 0, 4, 4, '#e6e1ea');
    rect(ctx, 7, 4, 6, 3, '#4a2a1e');
    rect(ctx, 5, 7, 10, 16, '#4a2a1e');
    rect(ctx, 5, 11, 10, 6, '#e8333a');
    rect(ctx, 5, 13, 10, 1, '#ffffff');
    rect(ctx, 5, 7, 2, 16, '#7a4a3a');
  },
  wasser: (ctx) => {
    rect(ctx, 8, 0, 4, 3, '#2a7ad8');
    rect(ctx, 7, 3, 6, 3, '#bfe3ff');
    rect(ctx, 5, 6, 10, 17, '#bfe3ff');
    rect(ctx, 5, 11, 10, 5, '#2a7ad8');
    rect(ctx, 5, 6, 2, 17, '#ffffff');
    px(ctx, 11, 18, '#ffffff');
    px(ctx, 9, 20, '#ffffff');
  },
  schorle: (ctx) => {
    rect(ctx, 4, 4, 12, 18, '#f0c95a');
    rect(ctx, 4, 4, 12, 2, '#fff6e0');
    rect(ctx, 4, 4, 3, 18, '#ffe7a8');
    rect(ctx, 13, 4, 3, 18, '#d9a83a');
    for (const [x, y] of [[8, 9], [11, 13], [9, 17], [12, 8]]) px(ctx, x, y, '#ffffff');
    rect(ctx, 13, 0, 2, 8, '#5fe39a'); // pajita
  },
};

export function drinkIcon(id: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(20, 24);
  DRINK_ART[id]?.(ctx);
  outline(ctx, 20, 24, PAL.outline);
  return canvas;
}

export function cashIcon(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(28, 20);
  rect(ctx, 3, 5, 24, 13, '#3f8f4a');
  rect(ctx, 1, 2, 24, 13, '#5ab565');
  rect(ctx, 1, 2, 24, 2, '#8fd99a');
  fillEllipse(ctx, 13, 8, 4, 3, '#2f6b38');
  rect(ctx, 4, 6, 2, 4, '#8fd99a');
  rect(ctx, 20, 6, 2, 4, '#8fd99a');
  outline(ctx, 28, 20, PAL.outline);
  return canvas;
}

// ───────────── Bürgeramt ─────────────

/** Asiento de la sala de espera (la persona sentada mira al NE, hacia los puestos). */
export function waitSeat(): PropArt {
  const { canvas, ctx } = makeCanvas(40, 40);
  groundShadow(ctx, 20, 36, 14, 4);
  rect(ctx, 18, 18, 4, 18, '#9aa4b8');
  rect(ctx, 18, 18, 1, 18, '#d8dde8');
  fillEllipse(ctx, 20, 36, 8, 2, '#7a8296');
  // cojín romboidal
  for (let row = 0; row < 14; row++) {
    const t = row < 7 ? row + 1 : 14 - row;
    rect(ctx, 20 - t * 2, 8 + row, t * 4, 1, row < 7 ? '#5a7ae0' : '#3b5bdb');
  }
  rect(ctx, 6, 15, 28, 4, '#2a46b0');
  return done(canvas, ctx);
}

/** Respaldo del asiento: va delante de la persona sentada (lado de la cámara). */
export function waitSeatBack(): PropArt {
  const { canvas, ctx } = makeCanvas(40, 44);
  for (let u = 0; u < 30; u++) {
    const y = 6 + Math.floor(u / 2);
    rect(ctx, 5 + u, y, 1, 20, u < 2 ? '#5a7ae0' : '#3b5bdb');
    rect(ctx, 5 + u, y, 1, 2, '#7a96f0');
  }
  rect(ctx, 6, 22, 2, 18, '#9aa4b8');
  rect(ctx, 32, 34, 2, 8, '#9aa4b8');
  return done(canvas, ctx);
}

/** Expositor de formularios. */
export function formRack(): PropArt {
  const { canvas, ctx } = makeCanvas(40, 86);
  groundShadow(ctx, 20, 82, 14, 4);
  rect(ctx, 6, 14, 28, 66, '#7a8296');
  rect(ctx, 6, 14, 28, 2, '#c9cfdc');
  rect(ctx, 8, 2, 24, 12, '#22356b');
  pixelText(ctx, 'FORM', 12, 5, '#ffffff');
  const papers = ['#ffffff', '#ffe9a8', '#d8ecff', '#ffd0d8'];
  for (let i = 0; i < 4; i++) {
    const y = 20 + i * 15;
    rect(ctx, 9, y, 22, 11, papers[i]);
    rect(ctx, 9, y, 22, 2, '#e6e1ea');
    for (let l = 0; l < 3; l++) rect(ctx, 12, y + 4 + l * 2, 14, 1, '#9aa4b8');
    rect(ctx, 8, y + 11, 24, 3, '#5a6278');
  }
  return done(canvas, ctx);
}

/** Atril para rellenar formularios de pie. */
export function pult(): PropArt {
  const { canvas, ctx } = makeCanvas(44, 64);
  groundShadow(ctx, 22, 60, 14, 4);
  rect(ctx, 19, 24, 6, 36, '#7a8296');
  rect(ctx, 19, 24, 2, 36, '#c9cfdc');
  fillEllipse(ctx, 22, 60, 12, 3, '#5a6278');
  for (let u = 0; u < 38; u++) rect(ctx, 3 + u, 10 + Math.floor(u / 3), 1, 10, u < 2 ? PAL.woodLight : PAL.wood);
  rect(ctx, 12, 12, 14, 9, '#ffffff');
  rect(ctx, 28, 15, 8, 2, '#22356b'); // bolígrafo
  return done(canvas, ctx);
}

export function waterCooler(): PropArt {
  const { canvas, ctx } = makeCanvas(28, 66);
  groundShadow(ctx, 14, 62, 10, 3);
  rect(ctx, 5, 26, 18, 36, '#e6e9f0');
  rect(ctx, 5, 26, 4, 36, '#ffffff');
  rect(ctx, 19, 26, 4, 36, '#b9c2cc');
  rect(ctx, 11, 36, 6, 4, '#5fa8ff');
  fillEllipse(ctx, 14, 14, 9, 12, '#8fd0ff');
  fillEllipse(ctx, 11, 10, 3, 5, '#d8f0ff');
  rect(ctx, 10, 24, 8, 3, '#5fa8ff');
  return done(canvas, ctx);
}

export function monitor(): PropArt {
  const { canvas, ctx } = makeCanvas(34, 34);
  rect(ctx, 3, 2, 28, 20, '#2a2238');
  rect(ctx, 5, 4, 24, 16, '#5fa8ff');
  rect(ctx, 5, 4, 24, 4, '#a8d4ff');
  rect(ctx, 8, 11, 14, 2, '#d8ecff');
  rect(ctx, 8, 15, 10, 2, '#d8ecff');
  rect(ctx, 15, 22, 4, 6, '#5a5266');
  rect(ctx, 9, 28, 16, 3, '#5a5266');
  return done(canvas, ctx, [{ x: 0, y: -20, color: PAL.neonBlue, r: 22 }]);
}

/** Flecha de objetivo que flota sobre el destino. */
export function marker(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(32, 40);
  for (let y = 0; y < 14; y++) rect(ctx, 10, 2 + y, 12, 1, y < 2 ? '#fff4c8' : '#ffd23a');
  for (let y = 0; y < 18; y++) {
    const w = 28 - y * 1.55;
    rect(ctx, 16 - w / 2, 16 + y, w, 1, y < 2 ? '#fff4c8' : '#ffc21a');
  }
  rect(ctx, 11, 3, 3, 12, '#fffbe8');
  outline(ctx, 32, 40, PAL.outline);
  return canvas;
}

// ───────────── WG (piso compartido) ─────────────

export function umzugskarton(label: string): PropArt {
  const { canvas, ctx } = makeCanvas(40, 40);
  groundShadow(ctx, 20, 36, 16, 4);
  for (let row = 0; row < 12; row++) {
    const t = row < 6 ? row + 1 : 12 - row;
    rect(ctx, 20 - t * 3, 4 + row, t * 6, 1, '#d9a86a');
  }
  rect(ctx, 2, 10, 18, 22, '#c4884a');
  rect(ctx, 20, 10, 18, 22, '#a86e38');
  rect(ctx, 2, 10, 18, 2, '#e6b880');
  rect(ctx, 19, 4, 2, 28, '#e8d6a8'); // cinta
  pixelText(ctx, label, 4, 18, '#2a2238');
  return done(canvas, ctx);
}

/** Objetos que se llevan en la mano (20×24, como las bebidas). */
export const CARRY_ART: Record<string, (ctx: Ctx) => void> = {
  lampe: (ctx) => {
    for (let y = 0; y < 8; y++) rect(ctx, 6 - y / 2, 2 + y, 8 + y, 1, y < 2 ? '#fff0bf' : '#ffd77a');
    rect(ctx, 9, 10, 2, 9, '#5a5266');
    rect(ctx, 5, 19, 10, 3, '#3a3346');
  },
  buecher: (ctx) => {
    rect(ctx, 2, 6, 5, 16, '#c94a4a');
    rect(ctx, 7, 4, 5, 18, '#3b5bdb');
    rect(ctx, 12, 8, 5, 14, '#3fa04a');
    for (const x of [3, 8, 13]) rect(ctx, x, 10, 3, 1, '#ffd77a');
  },
  kissen: (ctx) => {
    fillEllipse(ctx, 10, 13, 9, 7, '#e0675a');
    fillEllipse(ctx, 8, 11, 5, 3, '#f0907a');
    rect(ctx, 9, 12, 2, 2, '#ffffff');
  },
};

export function carryIcon(id: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(20, 24);
  CARRY_ART[id]?.(ctx);
  outline(ctx, 20, 24, PAL.outline);
  return canvas;
}

export function deskLamp(): PropArt {
  const { canvas, ctx } = makeCanvas(26, 34);
  rect(ctx, 6, 28, 14, 4, '#3a3346');
  rect(ctx, 12, 12, 2, 16, '#5a5266');
  for (let y = 0; y < 10; y++) rect(ctx, 6 - y / 3, 2 + y, 14 + y / 1.5, 1, y < 2 ? '#fff0bf' : '#ffd77a');
  return done(canvas, ctx, [{ x: 0, y: -20, color: PAL.lampGlow, r: 40 }]);
}

export function bookRow(): PropArt {
  const { canvas, ctx } = makeCanvas(30, 20);
  const cols = ['#c94a4a', '#3b5bdb', '#3fa04a', '#f0c95a', '#7a4ab8', '#e0675a'];
  cols.forEach((c, i) => rect(ctx, 2 + i * 4, 2 + (i % 3), 4, 16 - (i % 3), c));
  return done(canvas, ctx);
}

export function pillow(): PropArt {
  const { canvas, ctx } = makeCanvas(30, 18);
  fillEllipse(ctx, 15, 9, 13, 6, '#e0675a');
  fillEllipse(ctx, 12, 7, 7, 3, '#f0907a');
  return done(canvas, ctx);
}

export function toilet(): PropArt {
  const { canvas, ctx } = makeCanvas(30, 40);
  groundShadow(ctx, 15, 37, 11, 3);
  rect(ctx, 6, 2, 18, 14, '#f2f4f8');
  rect(ctx, 6, 2, 18, 3, '#ffffff');
  fillEllipse(ctx, 15, 24, 11, 6, '#e6e9f0');
  fillEllipse(ctx, 15, 23, 8, 4, '#c9d6e8');
  rect(ctx, 10, 26, 10, 10, '#e6e9f0');
  return done(canvas, ctx);
}

export function washbasin(): PropArt {
  const { canvas, ctx } = makeCanvas(30, 56);
  rect(ctx, 6, 0, 18, 20, '#bfe3ff'); // espejo
  rect(ctx, 6, 0, 18, 2, '#ffffff');
  rect(ctx, 8, 3, 4, 10, '#e6f4ff');
  fillEllipse(ctx, 15, 28, 12, 5, '#f2f4f8');
  fillEllipse(ctx, 15, 27, 8, 3, '#c9d6e8');
  rect(ctx, 14, 22, 2, 4, '#9aa4b8');
  rect(ctx, 12, 32, 6, 22, '#e6e9f0');
  return done(canvas, ctx);
}

export function dishes(): PropArt {
  const { canvas, ctx } = makeCanvas(32, 26);
  for (let i = 0; i < 4; i++) fillEllipse(ctx, 14, 20 - i * 3, 11, 4, i % 2 ? '#e6eef8' : '#ffffff');
  rect(ctx, 22, 6, 4, 12, '#e6eef8');
  rect(ctx, 3, 4, 5, 13, '#f0c95a');
  rect(ctx, 12, 10, 3, 2, '#a86e38'); // restos
  return done(canvas, ctx);
}

export function stoveTop(): PropArt {
  const { canvas, ctx } = makeCanvas(40, 22);
  for (const [x, y] of [[12, 6], [26, 6], [12, 15], [26, 15]]) {
    fillEllipse(ctx, x, y, 6, 3, '#2a2238');
    fillEllipse(ctx, x, y, 4, 2, '#4a4258');
  }
  rect(ctx, 30, 1, 8, 6, '#c94a4a'); // tetera
  return { canvas };
}

export function faucet(): PropArt {
  const { canvas, ctx } = makeCanvas(24, 26);
  fillEllipse(ctx, 12, 18, 10, 5, '#9aa4b8');
  fillEllipse(ctx, 12, 17, 8, 3, '#5a6278');
  rect(ctx, 16, 2, 3, 13, '#c9cfdc');
  rect(ctx, 11, 2, 7, 3, '#c9cfdc');
  return done(canvas, ctx);
}

export function putzplanSheet(): PropArt {
  const { canvas, ctx } = makeCanvas(26, 30);
  rect(ctx, 2, 2, 22, 26, '#ffffff');
  rect(ctx, 2, 2, 22, 5, '#5fc2c0');
  for (let r = 0; r < 4; r++) {
    rect(ctx, 4, 10 + r * 4, 18, 1, '#9aa4b8');
    rect(ctx, 14, 9 + r * 4, 1, 4, '#9aa4b8');
  }
  rect(ctx, 11, 0, 4, 4, '#c8283c'); // imán
  return done(canvas, ctx);
}

/** Placa con el nombre de una habitación (letrero en la pared o en un poste). */
export function roomPlate(text: string): PropArt {
  const w = textWidth(text, 2) + 14;
  const { canvas, ctx } = makeCanvas(w + 2, 22);
  rect(ctx, 1, 1, w, 20, '#ffffff');
  rect(ctx, 3, 3, w - 4, 16, '#2a2238');
  pixelText(ctx, text, 8, 6, '#ffd77a', 2);
  return done(canvas, ctx);
}

export function floorLamp(): PropArt {
  const { canvas, ctx } = makeCanvas(30, 96);
  groundShadow(ctx, 15, 92, 10, 3);
  fillEllipse(ctx, 15, 92, 9, 3, '#3a3346');
  rect(ctx, 14, 20, 3, 72, '#5a5266');
  for (let y = 0; y < 16; y++) rect(ctx, 7 - y / 4, 4 + y, 16 + y / 2, 1, y < 2 ? '#fff6e0' : '#f2dcb8');
  return done(canvas, ctx, [{ x: 0, y: -80, color: PAL.lampGlow, r: 60 }]);
}
