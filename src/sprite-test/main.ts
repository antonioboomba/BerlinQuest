import Phaser from 'phaser';
import { FOOT_PAD, FRAME_H, FRAME_W, HAND } from '../game/art/characters';
import { drinkIcon } from '../game/art/props';
import { tileCanvas } from '../game/art/tiles';
import { registerCharacterAnims } from '../game/art/sprites';
import { facingFromWorld, HALF_H, HALF_W, screenDirToWorld, toScreen, type Facing } from '../game/iso';
import { initLab, loadDefault } from './lab';

// Laboratorio independiente para preparar y revisar hojas de personaje antes de integrarlas en el juego.
// No usa partidas, misiones ni escenas del juego: solo los mismos formatos y animaciones.
// lab.ts monta la hoja (20 espacios); esta escena la anima en las 4 direcciones y en un paseo.

const KEY = 'test_sprite';
const ANIMS = ['idle', 'walk', 'carryIdle', 'carryWalk', 'sit'] as const;
type AnimName = (typeof ANIMS)[number];
const DIRS: { facing: Facing; label: string }[] = [
  { facing: 'SE', label: 'SE · frente' },
  { facing: 'SW', label: 'SW · frente (espejo)' },
  { facing: 'NE', label: 'NE · espalda' },
  { facing: 'NW', label: 'NW · espalda (espejo)' },
];

const ui = {
  anims: document.getElementById('anims')!,
  markers: document.getElementById('markers') as HTMLInputElement,
  held: document.getElementById('held') as HTMLInputElement,
};

class SpriteTestScene extends Phaser.Scene {
  private anim: AnimName = 'walk';
  private previews: { sprite: Phaser.GameObjects.Sprite; held: Phaser.GameObjects.Image; facing: Facing; foot: { x: number; y: number } }[] = [];
  /** objetos que se rehacen al cambiar de hoja */
  private extras: Phaser.GameObjects.GameObject[] = [];
  private overlay!: Phaser.GameObjects.Graphics;
  private walker?: Phaser.GameObjects.Sprite;
  private walkerHeld!: Phaser.GameObjects.Image;
  private walkerPos = { x: 2.5, y: 2.5 };
  private walkerFacing: Facing = 'SE';
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private sandbox = { ox: 1240, oy: 150, scale: 1.5, size: 5 };

  constructor() {
    super('SpriteTest');
  }

  create() {
    this.textures.addCanvas('drink_bier', drinkIcon('bier'));
    const shadow = this.textures.createCanvas('shadow', 40, 14)!;
    const sc = shadow.getContext();
    sc.fillStyle = 'rgba(28,23,38,0.6)';
    sc.beginPath();
    sc.ellipse(20, 7, 18, 6, 0, 0, Math.PI * 2);
    sc.fill();
    shadow.refresh();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.overlay = this.add.graphics().setDepth(10);
    const t = (x: number, y: number, s: string) => this.add.text(x, y, s, { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#ffd77a' });
    t(20, 8, 'ANIMACIÓN EN LAS 4 DIRECCIONES');
    t(this.sandbox.ox - 230, 8, 'PASEO (WASD / flechas)');
    this.buildSandboxFloor();
    this.buildAnimButtons();
    ui.markers.addEventListener('change', () => this.drawOverlay());
    ui.held.onchange = () => this.refreshAnims();
    initLab((sheet) => this.setSheet(sheet));
    void loadDefault();
  }

  // ───────────── Hoja montada → textura ─────────────

  private resetTexture() {
    if (!this.textures.exists(KEY)) return;
    for (const p of this.previews) p.sprite.destroy(), p.held.destroy();
    this.previews = [];
    this.walker?.destroy();
    this.walkerHeld?.destroy();
    this.extras.forEach((o) => o.destroy());
    this.extras = [];
    this.textures.remove(KEY);
  }

  setSheet(sheet: HTMLCanvasElement) {
    this.resetTexture();
    const copy = document.createElement('canvas');
    copy.width = sheet.width;
    copy.height = sheet.height;
    copy.getContext('2d')!.drawImage(sheet, 0, 0);
    const t = this.textures.addCanvas(KEY, copy)!;
    for (let i = 0; i < 20; i++) t.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
    registerCharacterAnims(this.anims, KEY);
    this.buildPreviews();
    this.buildWalker();
    this.refreshAnims();
  }

  // ───────────── Vistas previas ─────────────

  private buildPreviews() {
    const S = 3;
    this.previews = DIRS.map((d, i) => {
      const foot = { x: 110 + i * 230, y: 330 };
      const tile = this.add.image(foot.x, foot.y - HALF_H * S, 'tile_preview').setScale(S).setOrigin(0.5, 0);
      tile.setDepth(0);
      const sh = this.add.image(foot.x, foot.y, 'shadow').setScale(S * 0.9).setAlpha(0.6).setDepth(1);
      const sprite = this.add.sprite(foot.x, foot.y + FOOT_PAD * S, KEY, 0).setOrigin(0.5, 1).setScale(S).setDepth(2);
      sprite.setFlipX(d.facing.endsWith('W'));
      const held = this.add.image(0, 0, 'drink_bier').setOrigin(0.5, 1).setScale(S).setDepth(3);
      const label = this.add.text(foot.x, foot.y + 48, d.label, { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#e8edf7' }).setOrigin(0.5, 0);
      this.extras.push(tile, sh, label);
      return { sprite, held, facing: d.facing, foot };
    });
  }

  private buildAnimButtons() {
    ui.anims.innerHTML = '';
    for (const a of ANIMS) {
      const b = document.createElement('button');
      b.textContent = a;
      b.className = a === this.anim ? 'on' : '';
      b.onclick = () => {
        this.anim = a;
        this.buildAnimButtons();
        this.refreshAnims();
      };
      ui.anims.appendChild(b);
    }
  }

  private refreshAnims() {
    const carrying = ui.held.checked;
    const name = carrying && (this.anim === 'idle' || this.anim === 'walk') ? (this.anim === 'idle' ? 'carryIdle' : 'carryWalk') : this.anim;
    for (const p of this.previews) {
      const side = p.facing.startsWith('S') ? 'front' : 'back';
      p.sprite.play(`${KEY}:${side}:${name}`, true);
      this.placeHeld(p.held, p.foot, p.facing, 3, carrying || name.startsWith('carry'));
    }
    this.drawOverlay();
  }

  /** Objeto en la mano: misma fórmula que Actor.sync() en el juego. */
  private placeHeld(img: Phaser.GameObjects.Image, foot: { x: number; y: number }, facing: Facing, S: number, visible: boolean) {
    const front = facing.startsWith('S');
    const flip = facing.endsWith('W');
    const ox = (front ? HAND.x : HAND.x - 4) * (flip ? -1 : 1);
    img.setPosition(foot.x + ox * S, foot.y + (HAND.y + 12) * S).setVisible(visible);
    img.setDepth(3);
  }

  // ───────────── Paseo ─────────────

  private buildSandboxFloor() {
    const { size, scale } = this.sandbox;
    if (!this.textures.exists('tile_preview')) this.textures.addCanvas('tile_preview', tileCanvas('slab', 0));
    if (!this.textures.exists('tile_wood')) this.textures.addCanvas('tile_wood', tileCanvas('wood', 0));
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const s = toScreen(x, y);
        this.add
          .image(this.sandbox.ox + s.x * scale, this.sandbox.oy + s.y * scale, (x + y) % 2 ? 'tile_wood' : 'tile_preview')
          .setOrigin(0.5, 0)
          .setScale(scale);
      }
  }

  private buildWalker() {
    const { scale } = this.sandbox;
    this.walker = this.add.sprite(0, 0, KEY, 0).setOrigin(0.5, 1).setScale(scale).setDepth(5);
    this.walkerHeld = this.add.image(0, 0, 'drink_bier').setOrigin(0.5, 1).setScale(scale).setDepth(6);
    this.syncWalker(false);
  }

  private syncWalker(moving: boolean) {
    if (!this.walker) return;
    const { ox, oy, scale } = this.sandbox;
    const s = toScreen(this.walkerPos.x, this.walkerPos.y);
    const foot = { x: ox + s.x * scale, y: oy + s.y * scale };
    this.walker.setPosition(foot.x, foot.y + FOOT_PAD * scale);
    const carrying = ui.held.checked;
    const side = this.walkerFacing.startsWith('S') ? 'front' : 'back';
    const name = carrying ? (moving ? 'carryWalk' : 'carryIdle') : moving ? 'walk' : 'idle';
    this.walker.play(`${KEY}:${side}:${name}`, true).setFlipX(this.walkerFacing.endsWith('W'));
    this.placeHeld(this.walkerHeld, foot, this.walkerFacing, scale, carrying);
    this.walkerHeld.setDepth(this.walkerFacing.startsWith('S') ? 6 : 4);
  }

  update(_t: number, dms: number) {
    if (!this.walker) return;
    const k = this.keys;
    let mx = 0;
    let my = 0;
    if (k.A.isDown || k.LEFT.isDown) mx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) mx += 1;
    if (k.W.isDown || k.UP.isDown) my -= 1;
    if (k.S.isDown || k.DOWN.isDown) my += 1;
    const moving = !!(mx || my);
    if (moving) {
      const dir = screenDirToWorld(mx, my);
      const step = (3.1 * HALF_W * Math.min(0.05, dms / 1000)) / HALF_W;
      const max = this.sandbox.size - 0.3;
      this.walkerPos.x = Phaser.Math.Clamp(this.walkerPos.x + dir.x * step, 0.3, max);
      this.walkerPos.y = Phaser.Math.Clamp(this.walkerPos.y + dir.y * step, 0.3, max);
      this.walkerFacing = facingFromWorld(dir.x, dir.y, this.walkerFacing);
    }
    this.syncWalker(moving);
  }

  // ───────────── Marcadores ─────────────

  private drawOverlay() {
    const g = this.overlay;
    g.clear();
    if (!ui.markers.checked) return;
    for (const p of this.previews) {
      g.lineStyle(2, 0xff5a6a, 1);
      g.lineBetween(p.foot.x - 10, p.foot.y, p.foot.x + 10, p.foot.y);
      g.lineBetween(p.foot.x, p.foot.y - 10, p.foot.x, p.foot.y + 6);
    }
  }
}

// accesible desde la consola y las pruebas automáticas
(window as unknown as { __GAME: Phaser.Game }).__GAME = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1600,
  height: 410,
  backgroundColor: '#1a2238',
  pixelArt: true,
  scene: [SpriteTestScene],
});
