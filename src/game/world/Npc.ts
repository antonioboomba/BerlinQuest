import type { Facing } from '../iso';
import type { WorldScene } from '../scenes/WorldScene';
import type { Actor } from './Actor';
import type { Pt } from './Collision';

// «Cerebros» de NPC: pequeñas máquinas de estados que dan rutinas visibles a los personajes.

export interface Waypoint extends Pt {
  /** segundos de pausa al llegar */
  wait?: number;
  /** desaparece dentro de un edificio/estación durante N segundos */
  hide?: number;
  /** frase al llegar */
  say?: [string, string];
  face?: Facing;
}

const GREETINGS: [string, string][] = [
  ['Hallo!', '¡Hola!'],
  ['Na?', '¿Qué tal?'],
  ['Guten Abend!', '¡Buenas noches!'],
  ['Moin!', '¡Buenas!'],
  ['Hi!', '¡Hola!'],
];

/** Segundos mínimos entre dos mensajes espontáneos (saludos, comentarios, charlas) de un mismo personaje. */
export const AMBIENT_GAP = 20;

export abstract class Brain {
  greetCooldown = 0;
  engaged = false;
  /** momento (ms del reloj de la escena) del último mensaje espontáneo */
  private lastAmbient = -Infinity;

  constructor(
    protected scene: WorldScene,
    public actor: Actor,
  ) {}

  /** Mensaje espontáneo: solo sale si han pasado AMBIENT_GAP segundos desde el anterior de este personaje. */
  protected ambientSay(de: string, es: string, ms: number) {
    const now = this.scene.time.now;
    if (now - this.lastAmbient < AMBIENT_GAP * 1000) return false;
    this.lastAmbient = now;
    this.actor.say(de, es, ms);
    return true;
  }

  /** Reacción al acercarse el jugador: se para, le mira y saluda. */
  protected react(dt: number): boolean {
    const p = this.scene.player;
    const d = this.actor.distTo(p.pos);
    this.greetCooldown -= dt;
    if (!this.actor.visible) return false;
    if (d < 1.7) {
      if (!this.engaged) {
        this.engaged = true;
        this.onEngage();
        if (this.greetCooldown <= 0) {
          const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
          this.ambientSay(g[0], g[1], 2500);
          this.greetCooldown = AMBIENT_GAP;
        }
      }
      if (!this.actor.sitting) {
        this.actor.face(p.pos);
        this.actor.play();
      }
      return true;
    }
    if (this.engaged && d > 2.4) {
      this.engaged = false;
      this.onRelease();
    }
    return this.engaged;
  }

  protected onEngage() {}
  protected onRelease() {}
  abstract update(dt: number): void;
}

/** Recorre una ruta en bucle; puede entrar en edificios (desaparece) y hacer pausas. */
export class PatrolBrain extends Brain {
  private i = 0;
  private wait = 0;
  private hidden = 0;
  private pausedPath: Pt[] | null = null;

  constructor(scene: WorldScene, actor: Actor, private route: Waypoint[]) {
    super(scene, actor);
    this.goNext();
  }

  private goNext() {
    const wp = this.route[this.i];
    const path = this.scene.collision.findPath(this.actor.pos, wp) ?? [wp];
    this.actor.walkPath(path, () => this.arrived());
  }

  private arrived() {
    const wp = this.route[this.i];
    if (wp.face) this.actor.facing = wp.face;
    if (wp.say) this.ambientSay(wp.say[0], wp.say[1], 3000);
    if (wp.hide) {
      this.hidden = wp.hide;
      this.actor.setVisible(false);
    }
    this.wait = wp.wait ?? 0;
    this.i = (this.i + 1) % this.route.length;
  }

  protected onEngage() {
    if (this.actor.path.length) {
      this.pausedPath = this.actor.path;
      this.actor.stop();
    }
  }

  protected onRelease() {
    if (this.pausedPath) {
      this.actor.walkPath(this.pausedPath, () => this.arrived());
      this.pausedPath = null;
    }
  }

  update(dt: number) {
    if (this.hidden > 0) {
      this.hidden -= dt;
      if (this.hidden <= 0) {
        this.actor.setVisible(true);
        this.goNext();
      }
      return;
    }
    if (this.react(dt)) return;
    if (!this.actor.path.length && !this.pausedPath) {
      this.wait -= dt;
      if (this.wait <= 0) this.goNext();
    }
  }
}

/** Sentado en un banco; de vez en cuando se levanta, pasea y vuelve. */
export class BenchBrain extends Brain {
  private timer = 8 + Math.random() * 10;
  private state: 'sit' | 'away' | 'back' = 'sit';

  constructor(scene: WorldScene, actor: Actor, private seat: Pt, private seatFacing: Facing, private stroll: Pt) {
    super(scene, actor);
    actor.setPos(seat.x, seat.y);
    actor.sit(seatFacing);
  }

  update(dt: number) {
    this.react(dt);
    if (this.state === 'sit') {
      this.timer -= dt;
      if (this.timer <= 0 && !this.engaged) {
        this.state = 'away';
        this.actor.stand();
        this.actor.walkPath(this.scene.collision.findPath(this.actor.pos, this.stroll) ?? [this.stroll], () => {
          this.ambientSay('Hach ja…', 'Ay, sí…', 2000);
          this.scene.time.delayedCall(2500, () => {
            this.state = 'back';
            this.actor.walkPath(this.scene.collision.findPath(this.actor.pos, this.seat) ?? [this.seat], () => {
              this.actor.sit(this.seatFacing);
              this.state = 'sit';
              this.timer = 20 + Math.random() * 20;
            });
          });
        });
      }
    }
  }
}

/** Dos personajes charlando entre ellos con frases alternas. */
export class ChatBrain extends Brain {
  private t = 2;
  private idx = 0;

  constructor(scene: WorldScene, actor: Actor, private partner: Actor, private lines: [string, string][], speaksFirst: boolean) {
    super(scene, actor);
    actor.face(partner.pos);
    actor.play();
    // los dos hablan por turnos (frases pares el primero, impares el segundo), una frase cada AMBIENT_GAP s entre
    // los dos: cada uno habla cada 2 × AMBIENT_GAP, desfasados
    this.idx = speaksFirst ? 0 : 1;
    this.t = speaksFirst ? 1.5 : 1.5 + AMBIENT_GAP;
  }

  update(dt: number) {
    if (this.react(dt)) return;
    this.actor.face(this.partner.pos);
    this.actor.play();
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 2 * AMBIENT_GAP;
      const line = this.lines[this.idx % this.lines.length];
      this.actor.say(line[0], line[1], 3000);
      this.idx += 2;
    }
  }
}

/** Personaje fijo (portero, camarero…) que solo reacciona. */
export class StaticBrain extends Brain {
  constructor(scene: WorldScene, actor: Actor, private facing: Facing, private greet?: [string, string]) {
    super(scene, actor);
    actor.facing = facing;
    actor.play();
  }

  protected onEngage() {
    if (this.greet) {
      this.ambientSay(this.greet[0], this.greet[1], 2500);
      this.greetCooldown = AMBIENT_GAP;
    }
  }

  update(dt: number) {
    if (!this.react(dt)) {
      this.actor.facing = this.facing;
      this.actor.play();
    }
  }
}
