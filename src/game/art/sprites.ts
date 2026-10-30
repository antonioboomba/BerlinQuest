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

export interface AssetManifest {
  characters?: Record<string, ManifestEntry>;
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
