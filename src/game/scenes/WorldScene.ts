import Phaser from 'phaser';
import type { Light } from '../art/buildings';
import type { PropInfo } from '../art/sprites';
import { depthOf, HALF_H, HALF_W, screenDirToWorld, TILE_H, TILE_W, toScreen, zoomFor, type Facing } from '../iso';
import { GameState } from '../state/GameState';
import { Actor } from '../world/Actor';
import { CollisionMap, type Pt, type Rect } from '../world/Collision';
import { getDPR, logicalSize } from '../display';
import { touchInput } from '../ui/touch';
import type { UIScene } from './UIScene';

export interface Interactable {
  x: number;
  y: number;
  radius: number;
  /** texto del aviso «[E] …»; null = no disponible ahora */
  label: () => string | null;
  action: () => void;
}

export interface MiniFeature {
  rect: Rect;
  color: number;
}

export interface Poi {
  x: number;
  y: number;
  icon: string;
  label: string;
}

/** Base común de las escenas jugables (calle, interiores). */
export abstract class WorldScene extends Phaser.Scene {
  collision!: CollisionMap;
  player!: Actor;
  actors: Actor[] = [];
  interactables: Interactable[] = [];
  minimap: MiniFeature[] = [];
  pois: Poi[] = [];
  objectivePoi: () => Pt | null = () => null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private currentTarget: Interactable | null = null;
  private transitioning = false;
  private flicker: { img: Phaser.GameObjects.Image; base: number }[] = [];
  private marker: Phaser.GameObjects.Image | null = null;
  private standPos: Pt | null = null;

  abstract readonly displayName: string;

  get ui(): UIScene {
    return this.scene.get('UI') as UIScene;
  }

  protected initWorld(bounds: Rect) {
    this.actors = [];
    this.interactables = [];
    this.minimap = [];
    this.pois = [];
    this.flicker = [];
    this.transitioning = false;
    this.marker = null;
    this.standPos = null;
    this.collision = new CollisionMap(bounds);
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', () => this.tryInteract());
    kb.on('keydown-SPACE', () => this.tryInteract());
    touchInput.onInteract = () => this.tryInteract();
    this.events.once('shutdown', () => {
      kb.removeAllListeners();
      touchInput.onInteract = null;
    });
    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyZoom, this));
  }

  protected setupCamera(target: Actor) {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    cam.startFollow(target.sprite, true, 0.12, 0.12, 0, 40);
    this.applyZoom();
    cam.fadeIn(350, 7, 10, 18);
    this.scene.bringToTop('UI');
    // flecha de objetivo flotando sobre el destino actual
    this.marker = this.add.image(0, 0, 'marker').setOrigin(0.5, 1).setDepth(2e5).setVisible(false);
  }

  /** Sienta al jugador; al moverse se levanta y vuelve a standPos. */
  sitPlayer(seat: Pt, facing: Facing, standPos: Pt) {
    this.player.setPos(seat.x, seat.y);
    this.player.sit(facing);
    this.standPos = standPos;
  }

  private applyZoom() {
    const { w, h } = logicalSize(this.scale);
    this.cameras.main.setZoom(zoomFor(w, h) * getDPR());
  }

  /** Posición inicial válida: si la guardada cae fuera del mapa o dentro de algo, usa la de reserva. */
  protected safeStart(p: Pt | null, fallback: Pt): Pt {
    return p && !this.collision.blocked(p.x, p.y, 0.24) ? p : fallback;
  }

  protected addActor(a: Actor) {
    this.actors.push(a);
    return a;
  }

  /** Halo de luz aditivo en coordenadas de pantalla del mundo. */
  addGlow(x: number, y: number, color: string, radius: number, alpha = 0.5, depth = 1e6, flicker = false) {
    const img = this.add
      .image(x, y, 'glow_white')
      .setTint(Phaser.Display.Color.HexStringToColor(color).color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(alpha)
      .setScale(radius / 64)
      .setDepth(depth);
    if (flicker) this.flicker.push({ img, base: alpha });
    return img;
  }

  /** Coloca un objeto con su punto de apoyo en (x, y) del mundo y sus luces. */
  /** Clave del objeto externo si está cargado y es válido; si no, la del arte procedural de respaldo. */
  propKey(external: string, fallback: string) {
    return this.registry.get(`prop:${external}`) ? external : fallback;
  }

  placeProp(key: string, x: number, y: number, opts: { block?: number | [number, number]; flip?: boolean; glow?: boolean } = {}) {
    const s = toScreen(x, y);
    const img = this.add.image(Math.round(s.x), Math.round(s.y), key).setOrigin(0.5, 1).setDepth(depthOf(x, y));
    if (opts.flip) img.setFlipX(true);
    // objeto externo (manifiesto): se apoya en su anclaje y lleva la sombra del juego debajo
    const ext = this.registry.get(`prop:${key}`) as PropInfo | undefined;
    if (ext) {
      const ax = opts.flip ? img.width - ext.anchor.x : ext.anchor.x;
      img.setOrigin(ax / img.width, ext.anchor.y / img.height);
      if (ext.shadow)
        this.add
          .image(Math.round(s.x), Math.round(s.y), 'shadow')
          .setDisplaySize(ext.shadow.w, ext.shadow.h)
          .setAngle(opts.flip ? -ext.shadow.angle : ext.shadow.angle)
          .setAlpha(0.35)
          .setDepth(depthOf(x, y) - 0.01);
    }
    if (opts.block !== undefined) {
      const [w, h] = Array.isArray(opts.block) ? opts.block : [opts.block, opts.block];
      this.collision.addAt(x, y, w, h);
    }
    const lights = (this.registry.get(`lights:${key}`) as Light[] | undefined) ?? [];
    if (opts.glow !== false)
      for (const l of lights) this.addGlow(s.x + (opts.flip ? -l.x : l.x), s.y + l.y, l.color, l.r, 0.45, depthOf(x, y) + 0.2, true);
    return img;
  }

  /** Suelo como una sola textura compuesta (rápido de dibujar). */
  protected paintGround(
    w: number,
    h: number,
    kindAt: (x: number, y: number) => string | null,
    key: string,
    /** capa opcional sobre el suelo ya montado; (ox, oy) = posición del lienzo en pantalla */
    decorate?: (ctx: CanvasRenderingContext2D, ox: number, oy: number) => void,
  ) {
    const minX = toScreen(0, h).x - HALF_W;
    const minY = 0;
    const width = (w + h) * HALF_W + TILE_W;
    const height = (w + h) * HALF_H + TILE_H;
    if (!this.textures.exists(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const k = kindAt(x, y);
          if (!k) continue;
          const v = (x * 7 + y * 13) % 3;
          const src = this.textures.get(`tile_${k}_${v}`).getSourceImage() as HTMLCanvasElement;
          const s = toScreen(x, y);
          ctx.drawImage(src, s.x - HALF_W - minX, s.y - minY);
        }
      decorate?.(ctx, minX, minY);
      this.textures.addCanvas(key, canvas);
    }
    this.add.image(minX, minY, key).setOrigin(0, 0).setDepth(-100000);
  }

  // ───────────── Bucle ─────────────

  update(_t: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const blocking = this.ui?.isBlocking() ?? false;

    // movimiento del jugador
    let mx = 0;
    let my = 0;
    if (!blocking && !this.transitioning) {
      const k = this.keys;
      if (k.A.isDown || k.LEFT.isDown) mx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) mx += 1;
      if (k.W.isDown || k.UP.isDown) my -= 1;
      if (k.S.isDown || k.DOWN.isDown) my += 1;
      if (touchInput.active) {
        mx += touchInput.x;
        my += touchInput.y;
      }
    }
    const p = this.player;
    if ((mx || my) && p.sitting) {
      p.stand();
      if (this.standPos) p.setPos(this.standPos.x, this.standPos.y);
      this.standPos = null;
    }
    if (mx || my) {
      const len = Math.min(1, Math.hypot(mx, my));
      const dir = screenDirToWorld(mx, my);
      const speed = (this.keys.SHIFT.isDown ? 4.9 : 3.1) * HALF_W * len; // píxeles de pantalla por segundo
      const next = this.collision.move(p.pos, (dir.x * speed * dt) / HALF_W, (dir.y * speed * dt) / HALF_W, 0.24);
      p.facing = next.x !== p.wx || next.y !== p.wy ? facingTo(p, next) : facingTo(p, { x: p.wx + dir.x, y: p.wy + dir.y });
      p.moving = next.x !== p.wx || next.y !== p.wy;
      p.wx = next.x;
      p.wy = next.y;
    } else p.moving = false;
    p.sync();
    p.play();

    for (const a of this.actors) if (a !== p) a.update(dt);
    for (const a of this.actors) if (a.bubble && a.bubble.until < this.time.now) a.bubble = null;

    // interacción más cercana
    let best: Interactable | null = null;
    let bestD = Infinity;
    if (!blocking)
      for (const it of this.interactables) {
        const d = Math.hypot(it.x - p.wx, it.y - p.wy);
        if (d < it.radius && d < bestD && it.label()) {
          best = it;
          bestD = d;
        }
      }
    this.currentTarget = best;

    // parpadeo sutil de luces
    for (const f of this.flicker) f.img.setAlpha(f.base * (0.92 + Math.random() * 0.08));

    this.worldUpdate(dt);

    // marcador de objetivo
    if (this.marker) {
      const poi = this.objectivePoi();
      if (poi && !blocking) {
        const s = toScreen(poi.x, poi.y);
        this.marker.setPosition(Math.round(s.x), Math.round(s.y - 104 + Math.sin(this.time.now / 220) * 6)).setVisible(true);
      } else this.marker.setVisible(false);
    }
  }

  protected worldUpdate(_dt: number) {}

  private tryInteract() {
    if (this.ui?.isBlocking() || this.transitioning) {
      this.ui?.advance();
      return;
    }
    this.currentTarget?.action();
  }

  // ───────────── API para el HUD ─────────────

  getPrompt(): { label: string; x: number; y: number } | null {
    const t = this.currentTarget;
    const label = t?.label();
    if (!t || !label) return null;
    const s = toScreen(t.x, t.y);
    return { label, x: s.x, y: s.y };
  }

  getBubbles() {
    return this.actors
      .filter((a) => a.bubble && a.visible)
      .map((a) => ({ id: a.id, x: a.sprite.x, y: a.sprite.y - (a.sitting ? 70 : 82), bubble: a.bubble!, name: a.name, key: a.key }));
  }

  /** Cambia de escena con fundido. */
  goTo(scene: string, data?: object) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(300, 7, 10, 18);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(scene, data);
    });
  }

  savePosition() {
    GameState.setLocation(this.scene.key, this.player.wx, this.player.wy);
  }
}

function facingTo(a: Actor, p: Pt) {
  a.face(p);
  return a.facing;
}
