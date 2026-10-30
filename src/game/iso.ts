// Proyección isométrica 2:1.
// El mundo se simula en coordenadas cartesianas (unidades = baldosas); solo el render es isométrico.
//   eje x del mundo → abajo-derecha en pantalla
//   eje y del mundo → abajo-izquierda en pantalla

// Escala tipo «social sim»: baldosas de 64×32 y avatares de ~80 px de alto.
export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

/** Zoom de cámara en pasos de 0,5 (2 en 1600×900): avatares grandes y legibles, píxeles casi uniformes. */
export function zoomFor(w: number, h: number): number {
  return Math.max(1, Math.min(3, Math.floor(Math.min(w / 780, h / 440) * 2) / 2));
}

export function toScreen(x: number, y: number): { x: number; y: number } {
  return { x: (x - y) * HALF_W, y: (x + y) * HALF_H };
}

export function toWorld(sx: number, sy: number): { x: number; y: number } {
  return { x: (sx / HALF_W + sy / HALF_H) / 2, y: (sy / HALF_H - sx / HALF_W) / 2 };
}

/** Profundidad de dibujo: lo que está más "abajo" en pantalla se dibuja encima. */
export function depthOf(x: number, y: number): number {
  return (x + y) * HALF_H;
}

/** Convierte una dirección deseada en pantalla (p. ej. W = arriba) en un vector del mundo. */
export function screenDirToWorld(dx: number, dy: number): { x: number; y: number } {
  if (dx === 0 && dy === 0) return { x: 0, y: 0 };
  const len = Math.hypot(dx, dy);
  const sx = dx / len;
  const sy = dy / len;
  // Movimiento uniforme en pantalla: invertimos la proyección con píxeles 1:1.
  const w = toWorld(sx * HALF_W, sy * HALF_W);
  return w;
}

export type Facing = 'SE' | 'SW' | 'NE' | 'NW';

/** Dirección visual a partir de un vector en el mundo. */
export function facingFromWorld(dx: number, dy: number, prev: Facing): Facing {
  const s = { x: dx - dy, y: dx + dy };
  if (Math.abs(s.x) < 1e-4 && Math.abs(s.y) < 1e-4) return prev;
  const down = s.y > 0 || (Math.abs(s.y) < 1e-4 && prev.startsWith('S'));
  const right = s.x > 0 || (Math.abs(s.x) < 1e-4 && prev.endsWith('E'));
  return `${down ? 'S' : 'N'}${right ? 'E' : 'W'}` as Facing;
}
