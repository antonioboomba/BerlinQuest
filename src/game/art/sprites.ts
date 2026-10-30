import type Phaser from 'phaser';
import { drawCharacterSheet, FRAME_H, FRAME_W, FRAMES, type CharStyle } from './characters';

// Hojas de personaje: el juego acepta un PNG externo (public/assets/...) o genera el arte procedural.
// Formato oficial: PNG transparente de 960×88 = 20 frames de 48×88 en una fila
// ([0-9] de frente, [10-19] de espaldas; ver FRAMES en characters.ts).

export const SHEET_FRAMES = 20;
export const SHEET_W = FRAME_W * SHEET_FRAMES; // 960
export const SHEET_H = FRAME_H; // 88

/** Entrada del manifiesto de recursos externos (public/assets/manifest.json). */
export interface ManifestEntry {
  file: string;
  /** solo se usa en el juego cuando está aprobado (enabled: true) */
  enabled: boolean;
  /**
   * Opcional: dónde va el objeto que lleva en la mano (centro de su base), en píxeles del frame de 48×88,
   * de frente y de espaldas. Sin él se usa la posición del arte procedural (HAND).
   */
  hand?: { front: [number, number]; back: [number, number] };
}

/** Posición del objeto en la mano en píxeles del frame (x, y), de frente y de espaldas. */
export interface HandAnchor {
  front: { x: number; y: number };
  back: { x: number; y: number };
}

/** Valida la posición de mano del manifiesto. Devuelve null si falta o no es válida. */
export function handAnchor(entry: ManifestEntry): HandAnchor | null {
  const h = entry.hand;
  if (!h) return null;
  const pt = (v: unknown) =>
    Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n)) && v[0] >= 0 && v[0] < FRAME_W && v[1] >= 0 && v[1] < FRAME_H
      ? { x: v[0] as number, y: v[1] as number }
      : null;
  const front = pt(h.front);
  const back = pt(h.back);
  return front && back ? { front, back } : null;
}

/** Objeto de la ciudad dibujado a mano (public/assets/props/...), a escala 1 como los personajes. */
export interface PropEntry {
  file: string;
  enabled: boolean;
  /** punto del PNG que se apoya en la posición del mundo (píxeles), p. ej. el centro entre las ruedas */
  anchor: [number, number];
  /** sombra del juego bajo el objeto, centrada en el anclaje (px; ángulo en grados) */
  shadow?: { w: number; h: number; angle?: number };
}

/** Datos ya validados de un objeto externo cargado (se guardan en el registro como `prop:<clave>`). */
export interface PropInfo {
  anchor: { x: number; y: number };
  shadow: { w: number; h: number; angle: number } | null;
}

export interface AssetManifest {
  characters?: Record<string, ManifestEntry>;
  props?: Record<string, PropEntry>;
}

/** Tamaño máximo de un objeto externo (evita cargar ilustraciones a alta resolución por error). */
export const PROP_MAX = 160;

/** Valida un objeto externo ya cargado. Devuelve el error o los datos para colocarlo. */
export function propInfo(tex: Phaser.Textures.Texture, entry: PropEntry): string | PropInfo {
  const src = tex.getSourceImage() as { width: number; height: number };
  if (src.width > PROP_MAX || src.height > PROP_MAX) return `mide ${src.width}×${src.height} px; máximo ${PROP_MAX}×${PROP_MAX} (pixel art a escala 1)`;
  const [ax, ay] = entry.anchor ?? [];
  if (!Number.isInteger(ax) || !Number.isInteger(ay) || ax < 0 || ay < 0 || ax > src.width || ay > src.height) return 'anclaje no válido';
  const s = entry.shadow;
  const shadow = s && s.w > 0 && s.h > 0 ? { w: s.w, h: s.h, angle: s.angle ?? 0 } : null;
  return { anchor: { x: ax, y: ay }, shadow };
}

/** Comprueba que una textura cargada tiene el formato de hoja esperado. Devuelve el error o null. */
export function sheetError(tex: Phaser.Textures.Texture): string | null {
  const src = tex.getSourceImage() as { width: number; height: number };
  if (src.width !== SHEET_W || src.height !== SHEET_H) return `mide ${src.width}×${src.height} px; se esperaba ${SHEET_W}×${SHEET_H}`;
  return null;
}

/** Registra el arte procedural de un personaje como hoja de 20 frames con nombres 0..19. */
export function addProceduralSheet(textures: Phaser.Textures.TextureManager, key: string, style: CharStyle) {
  const canvas = drawCharacterSheet(style);
  const t = textures.addCanvas(key, canvas)!;
  for (let i = 0; i < SHEET_FRAMES; i++) t.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  return t;
}

/** Animaciones «clave:front|back:anim» que usa el juego (Actor.play). */
export function registerCharacterAnims(anims: Phaser.Animations.AnimationManager, key: string) {
  for (const [side, off] of [['front', 0], ['back', 10]] as const) {
    const mk = (name: string, frames: readonly number[], rate: number) => {
      const k = `${key}:${side}:${name}`;
      if (anims.exists(k)) anims.remove(k);
      anims.create({ key: k, frames: frames.map((f) => ({ key, frame: f + off })), frameRate: rate, repeat: -1 });
    };
    mk('idle', FRAMES.idle, 2);
    mk('walk', FRAMES.walk, 8);
    mk('carryIdle', FRAMES.carryIdle, 1);
    mk('carryWalk', FRAMES.carryWalk, 8);
    mk('sit', FRAMES.sit, 1);
  }
}
