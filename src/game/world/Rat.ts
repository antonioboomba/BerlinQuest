import Phaser from 'phaser';
import { depthOf, toScreen } from '../iso';
import type { Pt } from './Collision';

/**
 * Rata callejera (art-source/rata): corretea entre puntos vecinos de una ruta, se para a olisquear y, si el jugador
 * se acerca, sale corriendo hacia el punto más alejado de él. Es decorado: no choca con nada ni bloquea el paso.
 * El dibujo mira a la derecha de la pantalla; hacia la izquierda se refleja.
 */
export class Rat {
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private x: number;
  private y: number;
  private i = 0;
  private target: Pt | null = null;
  private wait = 1 + Math.random() * 2;
  private fleeing = false;

  constructor(
    scene: Phaser.Scene,
    private route: Pt[],
    private player: () => Pt,
  ) {
    this.i = Math.floor(Math.random() * route.length);
    ({ x: this.x, y: this.y } = route[this.i]);
    this.shadow = scene.add.image(0, 0, 'shadow').setDisplaySize(20, 5).setAlpha(0.3);
    this.sprite = scene.add.sprite(0, 0, 'rat', 0).setOrigin(0.5, 1);
    this.sync();
  }

  update(dt: number) {
    const p = this.player();
    const near = Math.hypot(p.x - this.x, p.y - this.y) < 1.6;
    if (near && !this.fleeing) {
      // huye al punto de la ruta más lejano del jugador
      let best = this.route[0];
      for (const q of this.route) if (Math.hypot(q.x - p.x, q.y - p.y) > Math.hypot(best.x - p.x, best.y - p.y)) best = q;
      this.target = best;
      this.i = this.route.indexOf(best);
      this.fleeing = true;
      this.wait = 0;
    }
    if (!this.target) {
      this.wait -= dt;
      if (this.wait <= 0) {
        // siguiente punto vecino de la ruta (va y viene por la acera)
        const j = this.i === 0 ? 1 : this.i === this.route.length - 1 ? this.i - 1 : this.i + (Math.random() < 0.5 ? -1 : 1);
        this.i = j;
        this.target = this.route[j];
      }
    }
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const d = Math.hypot(dx, dy);
      const step = (this.fleeing ? 4.5 : 2.2) * dt;
      if (d <= step) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
        this.fleeing = false;
        this.wait = 1.5 + Math.random() * 4; // se para a olisquear
        this.sprite.anims.stop();
        this.sprite.setFrame(0);
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        const sdx = toScreen(dx, dy).x;
        if (Math.abs(sdx) > 0.01) this.sprite.setFlipX(sdx < 0);
        if (!this.sprite.anims.isPlaying) this.sprite.play('rat_walk');
        this.sprite.anims.timeScale = this.fleeing ? 1.8 : 1;
      }
    }
    this.sync();
  }

  private sync() {
    const s = toScreen(this.x, this.y);
    const d = depthOf(this.x, this.y);
    this.sprite.setPosition(Math.round(s.x), Math.round(s.y) + 1).setDepth(d + 0.4);
    this.shadow.setPosition(Math.round(s.x), Math.round(s.y)).setDepth(d + 0.05);
  }
}
