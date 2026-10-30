import Phaser from 'phaser';
import { FOOT_PAD, FRAME_H, FRAME_W, HAND } from '../art/characters';
import type { HandAnchor } from '../art/sprites';
import { depthOf, facingFromWorld, toScreen, type Facing } from '../iso';
import type { Pt } from './Collision';

export interface Bubble {
  de: string;
  es?: string;
  until: number;
  tone?: 'normal' | 'happy' | 'angry' | 'order';
}

let nextId = 1;

/**
 * Personaje en el mundo: posición cartesiana (wx, wy), sprite animado proyectado en isométrico,
 * sombra, objeto en las manos y bocadillo de diálogo.
 */
export class Actor {
  readonly id = nextId++;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  held: Phaser.GameObjects.Image | null = null;
  heldId: string | null = null;
  facing: Facing = 'SE';
  moving = false;
  sitting = false;
  visible = true;
  bubble: Bubble | null = null;
  path: Pt[] = [];
  speed = 2.2; // baldosas por segundo
  onArrive: (() => void) | null = null;

  constructor(
    public scene: Phaser.Scene,
    public key: string,
    public name: string,
    public wx: number,
    public wy: number,
  ) {
    this.shadow = scene.add.image(0, 0, 'shadow').setAlpha(0.35);
    this.sprite = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, 1);
    this.sync();
    this.play();
  }

  get pos(): Pt {
    return { x: this.wx, y: this.wy };
  }

  distTo(p: Pt) {
    return Math.hypot(this.wx - p.x, this.wy - p.y);
  }

  setPos(x: number, y: number) {
    this.wx = x;
    this.wy = y;
    this.sync();
  }

  face(target: Pt) {
    this.facing = facingFromWorld(target.x - this.wx, target.y - this.wy, this.facing);
  }

  say(de: string, es?: string, ms = 3500, tone: Bubble['tone'] = 'normal') {
    this.bubble = { de, es, until: this.scene.time.now + ms, tone };
  }

  hold(drinkId: string | null) {
    this.held?.destroy();
    this.held = null;
    this.heldId = drinkId;
    // bebidas (drink_*) u objetos de la mudanza/compra (carry_*)
    if (drinkId) this.held = this.scene.add.image(0, 0, this.scene.textures.exists(`drink_${drinkId}`) ? `drink_${drinkId}` : `carry_${drinkId}`).setOrigin(0.5, 1);
    this.play();
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
    this.held?.setVisible(v);
    if (!v) this.bubble = null;
  }

  /** Camina siguiendo una lista de puntos. */
  walkPath(points: Pt[], onArrive?: () => void) {
    this.path = [...points];
    this.onArrive = onArrive ?? null;
    this.sitting = false;
  }

  stop() {
    this.path = [];
    this.moving = false;
    this.play();
  }

  sit(facing: Facing) {
    this.path = [];
    this.moving = false;
    this.sitting = true;
    this.facing = facing;
    this.play();
  }

  stand() {
    this.sitting = false;
    this.play();
  }

  update(dt: number) {
    if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - this.wx;
      const dy = t.y - this.wy;
      const d = Math.hypot(dx, dy);
      const step = this.speed * dt;
      if (d <= step) {
        this.wx = t.x;
        this.wy = t.y;
        this.path.shift();
        if (!this.path.length) {
          this.moving = false;
          const cb = this.onArrive;
          this.onArrive = null;
          cb?.();
        }
      } else {
        this.wx += (dx / d) * step;
        this.wy += (dy / d) * step;
        this.facing = facingFromWorld(dx, dy, this.facing);
        this.moving = true;
      }
    }
    this.sync();
    this.play();
  }

  /** Elige la animación según dirección, movimiento, si lleva algo y si está sentado. */
  play() {
    const front = this.facing.startsWith('S');
    const side = front ? 'front' : 'back';
    let anim = 'idle';
    if (this.sitting) anim = 'sit';
    else if (this.heldId) anim = this.moving ? 'carryWalk' : 'carryIdle';
    else if (this.moving) anim = 'walk';
    const key = `${this.key}:${side}:${anim}`;
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
    this.sprite.setFlipX(this.facing.endsWith('W'));
  }

  sync() {
    const s = toScreen(this.wx, this.wy);
    const d = depthOf(this.wx, this.wy);
    this.sprite.setPosition(Math.round(s.x), Math.round(s.y) + FOOT_PAD).setDepth(d + 0.5);
    this.shadow.setPosition(Math.round(s.x), Math.round(s.y)).setDepth(d + 0.1);
    if (this.held) {
      const front = this.facing.startsWith('S');
      const flip = this.facing.endsWith('W');
      // posición de la mano del PNG externo (manifiesto), en píxeles del frame; si no, la del arte procedural
      const hand = this.scene.registry.get(`hand:${this.key}`) as HandAnchor | undefined;
      const a = hand ? (front ? hand.front : hand.back) : null;
      const ox = (a ? a.x - FRAME_W / 2 : front ? HAND.x : HAND.x - 4) * (flip ? -1 : 1);
      const oy = a ? a.y - (FRAME_H - FOOT_PAD) : HAND.y + 12;
      this.held.setPosition(Math.round(s.x + ox), Math.round(s.y + oy));
      // siempre visible: también de espaldas se ve lo que lleva en la mano
      this.held.setDepth(d + 0.6);
    }
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.held?.destroy();
  }
}
