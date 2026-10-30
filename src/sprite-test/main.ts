import Phaser from 'phaser';
import { CHARACTERS, FOOT_PAD, FRAME_H, FRAME_W, HAND } from '../game/art/characters';
import { drinkIcon } from '../game/art/props';
import { tileCanvas } from '../game/art/tiles';
import { addProceduralSheet, registerCharacterAnims, SHEET_H, SHEET_W } from '../game/art/sprites';
import { facingFromWorld, HALF_H, HALF_W, screenDirToWorld, toScreen, type Facing } from '../game/iso';

// Entorno independiente para revisar hojas de personaje antes de integrarlas en el juego.
// No usa partidas, misiones ni escenas del juego: solo los mismos formatos y animaciones.

const KEY = 'test_sprite';
const PNG_URL = 'assets/characters/player.png';
const ANIMS = ['idle', 'walk', 'carryIdle', 'carryWalk', 'sit'] as const;
type AnimName = (typeof ANIMS)[number];
const DIRS: { facing: Facing; label: string }[] = [
  { facing: 'SE', label: 'SE · frente' },
  { facing: 'SW', label: 'SW · frente (espejo)' },
  { facing: 'NE', label: 'NE · espalda' },
  { facing: 'NW', label: 'NW · espalda (espejo)' },
];
const FOOT_Y = FRAME_H - FOOT_PAD; // 86
const FOOT_X = FRAME_W / 2; // 24

const ui = {
  status: document.getElementById('status')!,
  anims: document.getElementById('anims')!,
  markers: document.getElementById('markers') as HTMLInputElement,
  held: document.getElementById('held') as HTMLInputElement,
  file: document.getElementById('file') as HTMLInputElement,
  reload: document.getElementById('reload')!,
  drop: document.getElementById('drop')!,
};

function setStatus(text: string, kind: 'ok' | 'warn' | 'err') {
  ui.status.textContent = text;
  ui.status.className = kind;
}

/** Comprueba que la URL devuelve de verdad un PNG (el servidor de desarrollo responde HTML si falta). */
async function fetchPng(url: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('image/png')) return null;
    const blob = await res.blob();
    return await loadImage(URL.createObjectURL(blob));
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

class SpriteTestScene extends Phaser.Scene {
  private anim: AnimName = 'walk';
  private previews: { sprite: Phaser.GameObjects.Sprite; held: Phaser.GameObjects.Image; facing: Facing; foot: { x: number; y: number } }[] = [];
  private strip: Phaser.GameObjects.Image[] = [];
  /** objetos que se rehacen al cambiar de hoja */
  private extras: Phaser.GameObjects.GameObject[] = [];
  private overlay!: Phaser.GameObjects.Graphics;
  private walker!: Phaser.GameObjects.Sprite;
  private walkerHeld!: Phaser.GameObjects.Image;
  private walkerPos = { x: 2.5, y: 2.5 };
  private walkerFacing: Facing = 'SE';
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private sandbox = { ox: 1240, oy: 250, scale: 1.5, size: 5 };

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
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.overlay = this.add.graphics().setDepth(10);
    this.buildLabels();
    this.buildSandboxFloor();
    this.buildAnimButtons();
    ui.markers.onchange = () => this.drawOverlay();
    ui.held.onchange = () => this.refreshAnims();
    ui.reload.onclick = () => void this.loadDefault();
    ui.file.onchange = () => ui.file.files?.[0] && void this.loadFile(ui.file.files[0]);
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      ui.drop.style.display = 'flex';
    });
    window.addEventListener('dragleave', () => (ui.drop.style.display = 'none'));
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      ui.drop.style.display = 'none';
      const f = e.dataTransfer?.files?.[0];
      if (f) void this.loadFile(f);
    });
    void this.loadDefault();
  }

  // ───────────── Carga de la hoja ─────────────

  private async loadDefault() {
    const img = await fetchPng(PNG_URL);
    if (img) this.useImage(img, `public/${PNG_URL}`);
    else {
      this.useProcedural();
      setStatus(`No hay ${PNG_URL} — se muestra el arte procedural actual del protagonista (respaldo).`, 'warn');
    }
  }

  private async loadFile(f: File) {
    try {
      const img = await loadImage(URL.createObjectURL(f));
      this.useImage(img, f.name);
    } catch {
      setStatus(`${f.name}: no se pudo leer como imagen.`, 'err');
    }
  }

  private resetTexture() {
    if (this.textures.exists(KEY)) {
      for (const p of this.previews) p.sprite.destroy(), p.held.destroy();
      this.walker?.destroy();
      this.walkerHeld?.destroy();
      this.strip.forEach((s) => s.destroy());
      this.extras.forEach((o) => o.destroy());
      this.extras = [];
      this.textures.remove(KEY);
    }
  }

  private useImage(img: HTMLImageElement, name: string) {
    this.resetTexture();
    const okSize = img.width === SHEET_W && img.height === SHEET_H;
    this.textures.addSpriteSheet(KEY, img, { frameWidth: FRAME_W, frameHeight: FRAME_H });
    this.afterTexture();
    if (okSize) setStatus(`✓ ${name}: ${img.width}×${img.height} px, 20 frames de ${FRAME_W}×${FRAME_H}.`, 'ok');
    else setStatus(`✗ ${name}: mide ${img.width}×${img.height} px; se esperaba ${SHEET_W}×${SHEET_H}. El juego lo rechazaría y usaría el arte procedural.`, 'err');
  }

  private useProcedural() {
    this.resetTexture();
    addProceduralSheet(this.textures, KEY, CHARACTERS.player);
    this.afterTexture();
  }

  private afterTexture() {
    registerCharacterAnims(this.anims, KEY);
    this.buildStrip();
    this.buildPreviews();
    this.buildWalker();
    this.refreshAnims();
  }

  // ───────────── Hoja completa (20 frames) ─────────────

  private buildLabels() {
    const t = (x: number, y: number, s: string, c = '#b8c4de') => this.add.text(x, y, s, { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: c });
    t(20, 8, 'FRENTE · frames 0–9', '#ffd77a');
    t(20, 228, 'ESPALDA · frames 10–19', '#ffd77a');
    t(20, 470, 'ANIMACIÓN EN LAS 4 DIRECCIONES', '#ffd77a');
    t(this.sandbox.ox - 230, 8, 'PASEO (WASD / flechas)', '#ffd77a');
    const names = ['quieto', 'quieto', 'caminar', 'caminar', 'caminar', 'caminar', 'carga', 'carga camina', 'carga camina', 'sentado'];
    for (let i = 0; i < 20; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      t(20 + col * 98, 28 + row * 222, `${i} · ${names[col]}`, '#e8edf7').setFontSize(12);
    }
  }

  private buildStrip() {
    const S = 2;
    this.strip = [];
    for (let i = 0; i < 20; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      const x = 20 + col * 98;
      const y = 46 + row * 222;
      this.strip.push(this.add.image(x, y, KEY, i).setOrigin(0, 0).setScale(S));
    }
    this.drawOverlay();
  }

  // ───────────── Vistas previas ─────────────

  private buildPreviews() {
    const S = 3;
    this.previews = DIRS.map((d, i) => {
      const foot = { x: 110 + i * 230, y: 800 };
      const tile = this.add.image(foot.x, foot.y - HALF_H * S, 'tile_preview').setScale(S).setOrigin(0.5, 0);
      tile.setDepth(0);
      const sh = this.add.image(foot.x, foot.y, 'shadow').setScale(S * 0.9).setAlpha(0.6).setDepth(1);
      const sprite = this.add.sprite(foot.x, foot.y + FOOT_PAD * S, KEY, 0).setOrigin(0.5, 1).setScale(S).setDepth(2);
      sprite.setFlipX(d.facing.endsWith('W'));
      const held = this.add.image(0, 0, 'drink_bier').setOrigin(0.5, 1).setScale(S).setDepth(3);
      const label = this.add.text(foot.x, foot.y + 56, d.label, { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#e8edf7' }).setOrigin(0.5, 0);
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
    const S = 2;
    for (let i = 0; i < 20; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      const x = 20 + col * 98;
      const y = 46 + row * 222;
      g.lineStyle(1, 0x4a74c9, 0.7).strokeRect(x, y, FRAME_W * S, FRAME_H * S);
      // pies
      g.lineStyle(2, 0xff5a6a, 1);
      g.lineBetween(x + (FOOT_X - 4) * S, y + FOOT_Y * S, x + (FOOT_X + 4) * S, y + FOOT_Y * S);
      g.lineBetween(x + FOOT_X * S, y + (FOOT_Y - 4) * S, x + FOOT_X * S, y + (FOOT_Y + 2) * S);
      // mano en las poses de cargar
      const local = i % 10;
      if (local >= 6 && local <= 8) g.fillStyle(0x5fa8ff, 1).fillCircle(x + (FOOT_X + HAND.x) * S, y + (FOOT_Y + HAND.y) * S, 4);
      // retrato (frame 0 y 10)
      if (local === 0) g.lineStyle(2, 0x6dffa8, 1).strokeRect(x + 6 * S, y, 36 * S, 36 * S);
      // altura del bocadillo (82 px sobre los pies)
      g.lineStyle(1, 0xffd77a, 0.8).lineBetween(x, y + (FOOT_Y - 82) * S, x + FRAME_W * S, y + (FOOT_Y - 82) * S);
    }
    for (const p of this.previews) {
      g.lineStyle(2, 0xff5a6a, 1);
      g.lineBetween(p.foot.x - 10, p.foot.y, p.foot.x + 10, p.foot.y);
      g.lineBetween(p.foot.x, p.foot.y - 10, p.foot.x, p.foot.y + 6);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1600,
  height: 880,
  backgroundColor: '#1a2238',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: [SpriteTestScene],
});
