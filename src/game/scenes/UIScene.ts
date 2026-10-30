import Phaser from 'phaser';
import { ITEMS } from '../../data/items';
import { VOCAB, vocabLabel } from '../../data/vocabulary';
import { resolveLevelText } from '../../engine/dialogue';
import { mastery } from '../../engine/srs';
import { CEFR_LEVELS } from '../../engine/types';
import { DRINKS, type DChoice, type DNode } from '../data/bar';
import { DIALOGS } from '../data/dialogs';
import { SPEAKERS } from '../data/npcs';
import { toScreen } from '../iso';
import { QUESTS, type FormField } from '../data/quests';
import { GameState, speakDe, type QuestCompletion } from '../state/GameState';
import { touchInput } from '../ui/touch';
import type { Actor } from '../world/Actor';
import type { WorldScene } from './WorldScene';
import { uiZoom } from '../display';

// ───────────── Sistema visual del HUD ─────────────
// Fuente única: DotGothic16 (OFL), pixel muy legible con «ß», umlauts y «€» inequívocos.
// Tamaños múltiplos de 4 para que la rejilla de píxeles quede nítida. La jerarquía se marca con
// tamaño y color (la fuente tiene un solo peso; la negrita sintética emborrona los glifos).
// No se usa letterSpacing de Phaser: dibuja carácter a carácter, rompe emojis y deforma glifos.
const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';
export const UI_FONT = `"DotGothic16", ${EMOJI}, "Segoe UI", sans-serif`;
// Tamaños múltiplos de 8 (1×, 1,5× y 2× la rejilla nativa de 16 px de la fuente).
const T = {
  xs: 16,
  sm: 16,
  md: 24,
  lg: 24,
  xl: 32,
};
const C = {
  panel: 0x111a2e,
  panelHi: 0x1a2742,
  border: 0x4a74c9,
  borderSoft: 0x2c4270,
  white: '#ffffff',
  text: '#f2f5fb',
  muted: '#b8c4de',
  acid: '#6dffa8',
  gold: '#ffd77a',
  red: '#ff8a96',
  blue: 0x5fa8ff,
  ink: '#1c1726',
};
/** Tamaño nativo de la rejilla de DotGothic16: a 16 px cada píxel del diseño cae en un píxel real. */
const NATIVE = 16;
const PAD = 18;

type Tone = 'acid' | 'gold' | 'red' | 'blue';

export interface ToastSpec {
  title: string;
  lines: string[];
  icon?: string;
  tone?: Tone;
}

interface BubbleView {
  box: Phaser.GameObjects.Graphics;
  name: Phaser.GameObjects.Text;
  de: Phaser.GameObjects.Text;
  es: Phaser.GameObjects.Text;
  head: Phaser.GameObjects.Image;
  key: string;
}

export class UIScene extends Phaser.Scene {
  private hud!: Phaser.GameObjects.Container;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private objective!: Phaser.GameObjects.Container;
  private mini!: Phaser.GameObjects.Graphics;
  private miniFrame!: Phaser.GameObjects.Graphics;
  private miniLabels!: Phaser.GameObjects.Container;
  private miniTitle!: Phaser.GameObjects.Text;
  private nav!: Phaser.GameObjects.Container;
  private hints!: Phaser.GameObjects.Container;
  private prompt!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private bubbles = new Map<number, BubbleView>();
  /** la escena activa tiene niebla: diálogos ligeramente velados */
  private fogDialogs = false;
  private toasts: Phaser.GameObjects.Container[] = [];

  private dialog: Phaser.GameObjects.Container | null = null;
  private dialogState: {
    id: string;
    node: string;
    sel: number;
    feedback?: { text: string; ok: boolean };
    onAction?: (a: string) => void;
    actor?: Actor;
    firstTry: boolean;
  } | null = null;
  private fridge: { box: Phaser.GameObjects.Container; sel: number; cb: (id: string | null) => void } | null = null;
  private modal: Phaser.GameObjects.Container | null = null;
  private miniRect = { x: 0, y: 0, w: 200, h: 150 };
  private toastTop = 120;
  private touchUi: Phaser.GameObjects.Container | null = null;
  private speakerOverride: string | null = null;
  private afterDialogQueue: (() => void)[] = [];
  private bannerQueue: QuestCompletion[] = [];
  private banner: Phaser.GameObjects.Container | null = null;
  private form: { box: Phaser.GameObjects.Container; fields: FormField[]; idx: number; values: string[]; feedback?: { text: string; ok: boolean }; done: () => void } | null = null;
  private picker: {
    box: Phaser.GameObjects.Container;
    title: string;
    sub: string;
    items: { id: string; label: string; sub: string; icon: string }[];
    sel: number;
    onPick: (id: string) => void;
  } | null = null;

  constructor() {
    super('UI');
  }

  get world(): WorldScene | null {
    // la escena de mundo activa es la que tiene jugador (todas excepto Boot y UI)
    for (const s of this.scene.manager.getScenes(true)) {
      const w = s as WorldScene;
      if (s !== this && w.player && w.collision) return w;
    }
    return null;
  }

  isBlocking() {
    return !!(this.dialog || this.fridge || this.modal || this.form || this.picker || this.banner);
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(uiZoom());
    this.buildHud();
    this.buildPrompt();
    if (this.sys.game.device.input.touch) this.touchUi = this.add.container(0, 0).setDepth(15);
    if (this.touchUi) this.buildTouch();

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => {
      if (this.banner) return this.closeBanner();
      if (this.picker) return this.closePicker();
      if (this.form) return this.closeForm();
      if (this.fridge) return this.closeFridge(null);
      if (this.modal) return this.closeModal();
      if (this.dialog) return this.closeDialog();
      this.openModal('pause');
    });
    kb.on('keydown-M', () => this.toggleModal('map'));
    kb.on('keydown-I', () => this.toggleModal('inv'));
    kb.on('keydown-P', () => this.toggleModal('progress'));
    kb.on('keydown-T', () => GameState.setSetting('translations', !GameState.data.settings.translations));
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-UP', () => this.moveSel(-1));
    kb.on('keydown-DOWN', () => this.moveSel(1));
    kb.on('keydown-W', () => this.isBlocking() && this.moveSel(-1));
    kb.on('keydown-S', () => this.isBlocking() && this.moveSel(1));
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((k, i) => kb.on(`keydown-${k}`, () => this.pick(i)));

    GameState.on('change', this.onStateChange, this);
    GameState.on('questComplete', (r: QuestCompletion) => this.bannerQueue.push(r));
    GameState.on('levelup', (lvl: number) => this.toast({ title: `¡Nivel ${lvl}!`, lines: ['Nuevas oportunidades te esperan.'], tone: 'gold' }));
    this.events.once('shutdown', () => GameState.off('change', this.onStateChange, this));
    this.events.once('shutdown', () => GameState.removeAllListeners('questComplete'));
    this.scale.on('resize', this.layout, this);
    this.layout();
  }

  private onStateChange() {
    this.refreshHud();
    if (this.dialog) this.renderDialog();
    if (this.fridge) this.renderFridge();
  }

  // ───────────── Primitivas ─────────────

  /**
   * Texto nítido: se dibuja SIEMPRE a 16 px nativos (sin suavizado de bordes) y se amplía por
   * factores de 1, 1,5, 2… píxeles físicos con filtro «nearest». «_emphasis»: el énfasis va por color y tamaño.
   */
  private text(x: number, y: number, s: string, size: number, color = C.text, _emphasis = false, wrap?: number) {
    const d = uiZoom();
    // píxeles físicos por píxel de fuente, redondeado a medios y nunca por encima del tamaño pedido
    const k = Math.max(1, Math.floor(((size * d) / NATIVE) * 2) / 2) / d; // escala lógica
    return this.add
      .text(Math.round(x * d) / d, Math.round(y * d) / d, s, {
        fontFamily: UI_FONT,
        fontSize: `${NATIVE}px`,
        color,
        wordWrap: wrap ? { width: Math.floor(wrap / k), useAdvancedWrap: true } : undefined,
        lineSpacing: 6,
        padding: { top: 2, bottom: 2, left: 1, right: 1 },
      })
      .setResolution(1)
      .setScale(k);
  }

  /** Ancho y alto lógicos de la pantalla (la cámara del HUD aplica el DPR como zoom). */
  private get W() {
    return this.scale.width / uiZoom();
  }

  private get H() {
    return this.scale.height / uiZoom();
  }

  /** Títulos: misma fuente, un escalón más grande. */
  private head(x: number, y: number, s: string, size: number, color = C.white) {
    return this.text(x, y, s, size, color);
  }

  /** Panel: sombra, fondo casi opaco, borde azul y brillo interior superior. */
  private panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r = 12, accent = C.border) {
    g.fillStyle(0x05070d, 0.45).fillRoundedRect(x + 3, y + 4, w, h, r);
    g.fillStyle(C.panel, 0.96).fillRoundedRect(x, y, w, h, r);
    g.fillStyle(0xffffff, 0.04).fillRoundedRect(x + 3, y + 3, w - 6, Math.min(24, h / 2), Math.max(2, r - 3));
    g.lineStyle(2, accent, 1).strokeRoundedRect(x, y, w, h, r);
  }

  private keyCap(c: Phaser.GameObjects.Container, x: number, y: number, label: string) {
    const w = Math.max(26, label.length * 11 + 12);
    const g = this.add.graphics();
    g.fillStyle(0xe8edf7, 1).fillRoundedRect(x, y, w, 26, 6);
    g.fillStyle(0xb8c4de, 1).fillRoundedRect(x, y + 22, w, 4, { tl: 0, tr: 0, bl: 6, br: 6 });
    c.add([g, this.text(x + w / 2, y + 12, label, T.xs, C.ink, true).setOrigin(0.5)]);
    return w;
  }

  // ───────────── HUD fijo ─────────────

  private buildHud() {
    this.hud = this.add.container(0, 0);
    this.hudGfx = this.add.graphics();
    const portrait = this.add.image(62, 62, 'player', 0).setScale(1.9).setOrigin(0.5, 0.28);
    portrait.setCrop(6, 0, 36, 36);
    this.nameText = this.text(118, 26, '', T.md, C.gold, true);
    this.levelText = this.head(118, 50, '', T.lg);
    this.xpText = this.text(118, 104, '', T.xs, C.muted);
    this.moneyText = this.text(0, 0, '', T.lg, C.white, true);
    const cash = this.add.image(0, 0, 'cash').setScale(1.4);
    this.hud.add([this.hudGfx, portrait, this.nameText, this.levelText, this.xpText, cash, this.moneyText]);
    this.hud.setData('cash', cash);

    this.objective = this.add.container(0, 0);
    this.mini = this.add.graphics();
    this.miniFrame = this.add.graphics();
    this.miniLabels = this.add.container(0, 0);
    this.miniTitle = this.text(0, 0, '', T.xs, C.muted, true);
    const maskShape = this.make.graphics({}, false);
    this.mini.setData('maskShape', maskShape);
    const mask = maskShape.createGeometryMask();
    this.mini.setMask(mask);
    this.miniLabels.setMask(mask);
    this.nav = this.add.container(0, 0).setDepth(41);
    this.hints = this.add.container(0, 0).setDepth(41);
  }

  private layout() {
    this.cameras.main.setOrigin(0, 0).setZoom(uiZoom());
    const H = this.H;
    const touch = !!this.touchUi;
    this.miniRect = touch ? { x: 16, y: 200, w: 180, h: 132 } : { x: 16, y: H - 196, w: 236, h: 180 };
    const ms = this.mini.getData('maskShape') as Phaser.GameObjects.Graphics;
    const m = this.miniRect;
    ms.clear().fillStyle(0xffffff).fillRoundedRect(m.x + 3, m.y + 31, m.w - 6, m.h - 34, 10);
    this.refreshHud();
    this.drawNav();
    this.drawHints();
    if (this.touchUi) this.layoutTouch();
    if (this.dialog) this.renderDialog();
    if (this.fridge) this.renderFridge();
    if (this.modal) this.openModal(this.modal.getData('id'));
  }

  private refreshHud() {
    const g = this.hudGfx;
    const lv = GameState.level;
    g.clear();
    // tarjeta de jugador
    this.panel(g, 16, 16, 330, 118, 14);
    g.fillStyle(C.panelHi, 1).fillRoundedRect(28, 28, 72, 72, 12);
    g.lineStyle(2, C.border, 1).strokeRoundedRect(28, 28, 72, 72, 12);
    this.nameText.setText(GameState.data.name);
    this.levelText.setText(`Nivel ${lv.level}`);
    // barra de XP segmentada
    const bx = 118;
    const by = 84;
    const bw = 212;
    g.fillStyle(0x0a1020, 1).fillRoundedRect(bx, by, bw, 14, 7);
    g.fillStyle(C.blue, 1).fillRoundedRect(bx, by, Math.max(14, bw * (lv.into / lv.needed)), 14, 7);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(bx + 3, by + 2, Math.max(8, (bw - 6) * (lv.into / lv.needed)), 4, 2);
    for (let i = 1; i < 10; i++) g.fillStyle(0x0a1020, 0.5).fillRect(bx + (bw * i) / 10, by + 2, 1, 10);
    this.xpText.setText(`XP ${lv.into} / ${lv.needed}   ·   Alemán ${GameState.data.settings.level}`);
    // dinero
    this.panel(g, 16, 142, 160, 46, 12);
    const cash = this.hud.getData('cash') as Phaser.GameObjects.Image;
    cash.setPosition(46, 165);
    this.moneyText.setPosition(70, 151).setText(`${GameState.data.money.toFixed(GameState.data.money % 1 ? 2 : 0)} €`);
    // indicador de traducción
    const tr = GameState.data.settings.translations;
    g.fillStyle(tr ? 0x1f5a3a : 0x3a2a3a, 1).fillRoundedRect(186, 150, 84, 30, 8);
    g.lineStyle(2, tr ? 0x6dffa8 : 0x8a6a8a, 1).strokeRoundedRect(186, 150, 84, 30, 8);
    let trLabel = this.hud.getData('trLabel') as Phaser.GameObjects.Text | undefined;
    if (!trLabel) {
      trLabel = this.text(228, 165, '', T.xs, C.white, true).setOrigin(0.5);
      this.hud.setData('trLabel', trLabel);
      this.hud.add(trLabel);
    }
    trLabel.setText(tr ? 'ES  ✓  T' : 'ES  ✗  T');
    this.drawObjective();
  }

  private drawObjective() {
    const W = this.W;
    const c = this.objective;
    c.removeAll(true);
    const o = GameState.objective();
    const w = Math.min(380, W - 380);
    const x = W - w - 16;
    const g = this.add.graphics();
    c.add(g);
    const body = this.text(x + PAD + 34, 62, o.text, T.md, C.white, true, w - PAD * 2 - 34);
    const h = Math.max(96, 62 + body.displayHeight + PAD);
    this.panel(g, x, 16, w, h, 14);
    g.fillStyle(C.blue, 1).fillCircle(x + PAD + 8, 37, 7);
    g.fillTriangle(x + PAD + 1, 39, x + PAD + 15, 39, x + PAD + 8, 51);
    g.fillStyle(C.panel, 1).fillCircle(x + PAD + 8, 37, 3);
    g.lineStyle(1, C.borderSoft, 1).lineBetween(x + PAD, 54, x + w - PAD, 54);
    c.add([this.head(x + PAD + 26, 22, 'Objetivo', T.md, C.gold), this.text(x + PAD, 60, o.icon, T.lg), body]);
    this.toastTop = 16 + h + 12;

    const def = GameState.questDef;
    if (def) {
      const q = GameState.data.quest;
      const cur = def.steps.findIndex((s) => s.id === q.step);
      // ventana de hasta 5 pasos alrededor del actual
      const start = Math.max(0, Math.min(cur - 1, def.steps.length - 5));
      const visible = def.steps.slice(start, start + 5);
      const cy = 16 + h + 10;
      const lg = this.add.graphics();
      c.add([lg, this.head(x + PAD, cy + 10, `${def.code} · ${def.title}`, T.sm, C.gold)]);
      let yy = cy + 48;
      visible.forEach((s, vi) => {
        const i = start + vi;
        const doneStep = i < cur;
        const active = i === cur;
        const label = s.id === 'serve' ? `${s.label} (${Math.min(q.served, 3)}/3)` : s.label;
        const t = this.text(x + PAD + 32, yy - 1, label, T.sm, active ? C.white : C.muted, active, w - PAD * 2 - 36);
        const rowH = Math.max(34, t.displayHeight + 12);
        const b = this.add.graphics();
        if (active) b.fillStyle(C.panelHi, 1).fillRoundedRect(x + 8, yy - 5, w - 16, rowH - 2, 8);
        b.lineStyle(2, doneStep ? 0x6dffa8 : active ? 0xffffff : 0x7a88a8, 1).strokeRoundedRect(x + PAD, yy, 20, 20, 5);
        if (doneStep) {
          b.fillStyle(0x6dffa8, 1).fillRoundedRect(x + PAD, yy, 20, 20, 5);
          b.lineStyle(3, 0x111a2e, 1).beginPath().moveTo(x + PAD + 4, yy + 10).lineTo(x + PAD + 9, yy + 15).lineTo(x + PAD + 16, yy + 5).strokePath();
        }
        c.add([b, t]);
        yy += rowH;
      });
      if (start + visible.length < def.steps.length) {
        c.add(this.text(x + PAD + 32, yy - 4, `… ${def.steps.length - start - visible.length} pasos más`, T.xs, C.muted));
        yy += 20;
      }
      const ch = yy - cy + 6;
      this.panel(lg, x, cy, w, ch, 14);
      this.toastTop = cy + ch + 12;
    }
    this.reflowToasts();
  }

  private drawNav() {
    const W = this.W;
    const H = this.H;
    const nav = this.nav;
    nav.removeAll(true);
    const items: [string, string, string][] = [
      ['map', '🗺', 'Mapa'],
      ['inv', '🎒', 'Inventario'],
      ['progress', '📊', 'Progreso'],
    ];
    const bw = 204;
    const nw = bw * items.length + 20;
    const nx = Math.round(W / 2 - nw / 2);
    const ny = H - 76;
    const g = this.add.graphics();
    this.panel(g, nx, ny, nw, 62, 16);
    nav.add(g);
    items.forEach(([id, icon, label], i) => {
      const x = nx + 10 + i * bw;
      const active = this.modal?.getData('id') === id;
      const bg = this.add.graphics();
      if (active) {
        bg.fillStyle(0x24407a, 1).fillRoundedRect(x, ny + 8, bw - 4, 46, 12);
        bg.lineStyle(2, C.blue, 1).strokeRoundedRect(x, ny + 8, bw - 4, 46, 12);
      }
      if (i > 0) bg.lineStyle(2, C.borderSoft, 1).lineBetween(x - 2, ny + 16, x - 2, ny + 46);
      const t = this.head(x + 16, ny + 17, `${icon}  ${label}`, T.md, active ? C.white : C.text);
      const hit = this.add.rectangle(x + (bw - 4) / 2, ny + 31, bw - 4, 46, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.toggleModal(id as 'map' | 'inv' | 'progress'));
      nav.add([bg, t, hit]);
    });
  }

  private drawHints() {
    const W = this.W;
    const H = this.H;
    this.hints.removeAll(true);
    if (this.touchUi || W < 1300) return;
    const g = this.add.graphics();
    this.hints.add(g);
    const keys: [string, string][] = [
      ['E', 'Usar'],
      ['T', 'Traducir'],
      ['ESC', 'Pausa'],
    ];
    const pw = 330;
    let x = W - 16 - pw + PAD;
    const y = H - 62;
    this.panel(g, W - 16 - pw, H - 76, pw, 62, 16);
    for (const [k, l] of keys) {
      const kw = this.keyCap(this.hints, x, y + 4, k);
      const t = this.text(x + kw + 8, y + 6, l, T.sm, C.text);
      this.hints.add(t);
      x += kw + 8 + t.displayWidth + 18;
    }
  }

  // ───────────── Bucle: minimapa, aviso, bocadillos ─────────────

  update() {
    const free = !this.dialog && !this.fridge && !this.form && !this.picker;
    if (free && this.afterDialogQueue.length) {
      const q = this.afterDialogQueue;
      this.afterDialogQueue = [];
      q.forEach((fn) => fn());
    }
    if (free && !this.modal && !this.banner && !this.dialog && this.bannerQueue.length) this.showBanner(this.bannerQueue.shift()!);
    const world = this.world;
    if (!world || !world.player) return;
    const cam = world.cameras.main;
    const d = uiZoom();
    const toUi = (x: number, y: number) => ({ x: ((x - cam.worldView.x) * cam.zoom) / d, y: ((y - cam.worldView.y) * cam.zoom) / d });

    const p = world.getPrompt();
    if (p && !this.isBlocking()) {
      const s = toUi(p.x, p.y);
      this.promptText.setText(p.label);
      const w = this.promptText.displayWidth + 64;
      const g = this.prompt.getData('bg') as Phaser.GameObjects.Graphics;
      g.clear();
      this.panel(g, 0, 0, w, 44, 12, C.blue);
      g.fillStyle(0xe8edf7, 1).fillRoundedRect(10, 8, 28, 28, 6);
      g.fillStyle(0xb8c4de, 1).fillRoundedRect(10, 32, 28, 4, { tl: 0, tr: 0, bl: 6, br: 6 });
      this.prompt.setPosition(Math.round(s.x - w / 2), Math.round(s.y + (14 * cam.zoom) / d)).setVisible(true);
    } else this.prompt.setVisible(false);

    this.drawBubbles(world, toUi);
    this.drawMinimap(world);
  }

  private buildPrompt() {
    const bg = this.add.graphics();
    const key = this.text(24, 21, 'E', T.md, C.ink, true).setOrigin(0.5);
    this.promptText = this.text(48, 10, '', T.md, C.white, true);
    this.prompt = this.add.container(0, 0, [bg, key, this.promptText]).setDepth(8).setVisible(false);
    this.prompt.setData('bg', bg);
  }

  /** Bocadillos tipo chat social: cabeza del hablante, nombre en negrita, texto y traducción. */
  private drawBubbles(world: WorldScene, toUi: (x: number, y: number) => { x: number; y: number }) {
    const seen = new Set<number>();
    const tr = GameState.data.settings.translations;
    // con niebla, los bocadillos se velan un poco (relleno gris azulado, borde y texto algo atenuados)
    const fog = world.foggy;
    if (fog !== this.fogDialogs) {
      this.fogDialogs = fog;
      if (this.dialog) this.renderDialog();
    }
    for (const b of world.getBubbles()) {
      seen.add(b.id);
      let v = this.bubbles.get(b.id);
      const key = `${b.bubble.de}|${b.bubble.es}|${tr}|${b.bubble.tone}`;
      if (!v) {
        const head = this.add.image(0, 0, b.key, 0).setScale(0.75).setOrigin(0, 0);
        head.setCrop(6, 0, 36, 34);
        v = {
          box: this.add.graphics(),
          name: this.text(0, 0, '', T.sm, '#3b5bdb', true),
          de: this.text(0, 0, '', T.md, C.ink, false, 320),
          es: this.text(0, 0, '', T.xs, '#5a5a70', false, 320),
          head,
          key: '',
        };
        for (const o of [v.box, v.name, v.de, v.es]) o.setDepth(5);
        v.head.setDepth(6);
        this.bubbles.set(b.id, v);
      }
      if (v.key !== key) {
        v.key = key;
        const nc = b.bubble.tone === 'angry' ? '#c8283c' : b.bubble.tone === 'happy' ? '#2a8a4a' : '#3b5bdb';
        v.name.setText(b.name).setColor(nc);
        v.de.setText(b.bubble.de);
        v.es.setText(tr && b.bubble.es ? b.bubble.es : '').setVisible(tr && !!b.bubble.es);
      }
      const s = toUi(b.x, b.y);
      const textW = Math.max(v.name.displayWidth, v.de.displayWidth, v.es.visible ? v.es.displayWidth : 0);
      const w = textW + 68;
      const h = Math.max(54, v.name.displayHeight + v.de.displayHeight + (v.es.visible ? v.es.displayHeight + 2 : 0) + 16);
      const bx = Math.round(s.x - w / 2);
      const by = Math.round(s.y - h - 16);
      const border = b.bubble.tone === 'angry' ? 0xe8333a : b.bubble.tone === 'order' ? 0xff9a2a : b.bubble.tone === 'happy' ? 0x2fbf6a : 0x2a2238;
      const g = v.box;
      g.clear();
      const fill = fog ? 0xe6eaf2 : 0xffffff;
      const fa = fog ? 0.9 : 1;
      if (fog) g.fillStyle(0xa3abc0, 0.14).fillRoundedRect(bx - 6, by - 6, w + 12, h + 12, 16); // halo de niebla
      g.fillStyle(0x000000, fog ? 0.18 : 0.25).fillRoundedRect(bx + 3, by + 4, w, h, 12);
      g.fillStyle(fill, fa).fillRoundedRect(bx, by, w, h, 12);
      g.fillTriangle(s.x - 9, by + h - 1, s.x + 9, by + h - 1, s.x, by + h + 12);
      g.lineStyle(3, border, fog ? 0.8 : 1).strokeRoundedRect(bx, by, w, h, 12);
      g.lineStyle(3, border, fog ? 0.8 : 1).lineBetween(s.x - 9, by + h + 1, s.x, by + h + 12).lineBetween(s.x + 9, by + h + 1, s.x, by + h + 12);
      g.fillStyle(fog ? 0xdfe4ee : 0xeef2fa, fa).fillRoundedRect(bx + 8, by + 8, 32, 32, 8);
      for (const o of [v.name, v.de, v.es, v.head]) o.setAlpha(fog ? 0.92 : 1);
      v.head.setPosition(bx + 11, by + 10);
      v.name.setPosition(bx + 48, by + 5);
      v.de.setPosition(bx + 48, by + 5 + v.name.displayHeight - 2);
      v.es.setPosition(bx + 48, by + 5 + v.name.displayHeight + v.de.displayHeight);
    }
    for (const [id, v] of this.bubbles)
      if (!seen.has(id)) {
        for (const o of [v.box, v.name, v.de, v.es, v.head]) o.destroy();
        this.bubbles.delete(id);
      }
  }

  private drawMinimap(world: WorldScene, big?: { g: Phaser.GameObjects.Graphics; cx: number; cy: number; scale: number; labels: Phaser.GameObjects.Container }) {
    const g = big?.g ?? this.mini;
    const m = this.miniRect;
    const cx = big ? big.cx : m.x + m.w / 2;
    const cy = big ? big.cy : m.y + 30 + (m.h - 30) / 2;
    const k = big?.scale ?? 7;
    const pl = world.player;
    const centre = big ? { x: 0, y: 0 } : toScreen(pl.wx, pl.wy);
    const proj = (x: number, y: number) => {
      const s = toScreen(x, y);
      return { x: cx + ((s.x - centre.x) / 32) * k, y: cy + ((s.y - centre.y) / 32) * k };
    };
    g.clear();
    if (!big) {
      g.fillStyle(0x0b1222, 1).fillRect(m.x, m.y, m.w, m.h);
      this.miniFrame.clear();
      this.panel(this.miniFrame, m.x, m.y, m.w, m.h, 14);
      this.miniFrame.lineStyle(1, C.borderSoft, 1).lineBetween(m.x + 12, m.y + 30, m.x + m.w - 12, m.y + 30);
      this.miniTitle.setPosition(m.x + 14, m.y + 6).setText(`📍 ${world.displayName}`);
      this.miniFrame.setDepth(1);
      this.mini.setDepth(2);
      this.miniLabels.setDepth(3);
      this.miniTitle.setDepth(3);
    }
    for (const f of world.minimap) {
      const q = f.rect;
      const pts = [proj(q.x0, q.y0), proj(q.x1, q.y0), proj(q.x1, q.y1), proj(q.x0, q.y1)];
      g.fillStyle(f.color, 0.95).fillPoints(pts, true);
      g.lineStyle(1, 0x000000, 0.25).strokePoints(pts, true);
    }
    const labels = big?.labels ?? this.miniLabels;
    labels.removeAll(true);
    for (const poi of world.pois) {
      const s = proj(poi.x, poi.y);
      const r = big ? 16 : 11;
      g.fillStyle(0xffffff, 1).fillCircle(s.x, s.y, r);
      g.lineStyle(2, 0x2a2238, 1).strokeCircle(s.x, s.y, r);
      labels.add(this.text(s.x, s.y, poi.icon, big ? T.sm : 12, poi.icon === 'U' ? '#2a5ad8' : C.ink, true).setOrigin(0.5));
      if (big) labels.add(this.text(s.x, s.y + 22, poi.label, T.sm, C.white, true).setOrigin(0.5, 0).setStroke('#111a2e', 4));
    }
    const obj = world.objectivePoi();
    if (obj) {
      const s = proj(obj.x, obj.y);
      const pulse = 6 + Math.sin(this.time.now / 180) * 3;
      g.lineStyle(3, 0xffd77a, 1).strokeCircle(s.x, s.y, pulse + 10);
    }
    const s = proj(pl.wx, pl.wy);
    const ang = { SE: Math.PI * 0.15, SW: Math.PI * 0.85, NE: -Math.PI * 0.15, NW: -Math.PI * 0.85 }[pl.facing];
    const tri = [0, 2.5, -2.5].map((d, i) => ({ x: s.x + Math.cos(ang + d) * (i ? 9 : 13), y: s.y + Math.sin(ang + d) * (i ? 9 : 13) }));
    g.fillStyle(0xff9a2a, 1).fillTriangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y);
    g.lineStyle(2, 0x2a2238, 1).strokeTriangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y);
  }

  // ───────────── Diálogos ─────────────

  /** «speaker»: sustituye al hablante genérico del funcionario (yilmaz/official) por el del puesto. */
  openDialog(id: string, actor?: Actor, onAction?: (a: string) => void, speaker?: string) {
    if (!DIALOGS[id]) return;
    this.speakerOverride = speaker ?? null;
    this.dialogState = { id, node: DIALOGS[id].start, sel: 0, onAction, actor, firstTry: true };
    GameState.bumpStat('talks');
    this.enterNode();
  }

  private fill(s: string) {
    return s.replace(/\{name\}/g, GameState.data.name);
  }

  private curNode(): DNode | null {
    const d = this.dialogState;
    return d ? DIALOGS[d.id].nodes[d.node] : null;
  }

  private enterNode() {
    const n = this.curNode();
    if (!n || !this.dialogState) return;
    const fresh = GameState.learn(n.vocab ?? []);
    if (fresh.length) this.toastWords(fresh);
    if (n.action) this.dialogState.onAction?.(n.action);
    const de = this.fill(resolveLevelText(n.de, GameState.data.settings.level));
    if (n.speaker !== 'sign') speakDe(de);
    this.renderDialog();
  }

  private renderDialog() {
    const d = this.dialogState;
    const n = this.curNode();
    this.dialog?.destroy();
    this.dialog = null;
    if (!d || !n) return;
    const level = GameState.data.settings.level;
    const tr = GameState.data.settings.translations;
    const W = this.W;
    const H = this.H;
    const w = Math.min(1000, W - 40);
    const x = Math.round((W - w) / 2);
    const box = this.add.container(0, 0).setDepth(20).setAlpha(this.fogDialogs ? 0.93 : 1); // con niebla, algo velado
    const g = this.add.graphics();
    box.add(g);
    const tx = x + 176;
    const tw = w - 176 - PAD - 10;

    const speakerKey = this.speakerOverride && (n.speaker === 'yilmaz' || n.speaker === 'official') ? this.speakerOverride : n.speaker;
    const sp = SPEAKERS[speakerKey] ?? { name: speakerKey, role: '' };
    const title = this.head(tx, 0, sp.role ? `${sp.name}  ·  ${sp.role}` : sp.name, T.md, C.gold);
    const de = this.text(tx, 0, this.fill(resolveLevelText(n.de, level)), T.lg, C.white, false, tw - 40);
    const es = tr ? this.text(tx, 0, this.fill(resolveLevelText(n.es, level)), T.md, C.muted, false, tw - 14) : null;
    const choices = n.choices ?? [];
    const choiceViews = choices.map((c, i) => {
      const label = this.text(0, 0, `${i + 1}.  ${this.fill(c.de)}`, T.md, C.white, false, tw - 30);
      const sub = tr ? this.text(0, 0, this.fill(c.es), T.sm, C.muted, false, tw - 52) : null;
      return { label, sub, h: label.displayHeight + (sub ? sub.displayHeight + 2 : 0) + 18 };
    });
    const fb = d.feedback ? this.text(tx, 0, d.feedback.text, T.md, d.feedback.ok ? C.acid : C.red, true, tw) : null;
    const contentH =
      title.displayHeight + 8 + de.displayHeight + (es ? es.displayHeight + 14 : 0) + 16 + (fb ? fb.displayHeight + 12 : 0) + choiceViews.reduce((a, v) => a + v.h + 8, 0) + (choices.length ? 0 : 40);
    const h = Math.max(176, contentH + PAD * 2);
    const y = Math.round(H - h - 92);
    this.panel(g, x, y, w, h, 16);

    // retrato
    g.fillStyle(C.panelHi, 1).fillRoundedRect(x + PAD, y + PAD, 136, 136, 14);
    g.lineStyle(2, C.border, 1).strokeRoundedRect(x + PAD, y + PAD, 136, 136, 14);
    if (this.textures.exists(speakerKey)) {
      const img = this.add.image(x + PAD + 68, y + PAD + 4, speakerKey, 0).setOrigin(0.5, 0).setScale(3.5);
      img.setCrop(6, 0, 36, 37);
      box.add(img);
    } else box.add(this.text(x + PAD + 68, y + PAD + 68, '🪧', 60).setOrigin(0.5));

    let cy = y + PAD;
    title.setY(cy);
    cy += title.displayHeight + 8;
    de.setY(cy);
    cy += de.displayHeight + 6;
    box.add([title, de]);
    if (es) {
      g.fillStyle(C.borderSoft, 1).fillRect(tx, cy + 2, 3, es.displayHeight);
      es.setPosition(tx + 14, cy + 2);
      box.add(es);
      cy += es.displayHeight + 14;
    }
    cy += 10;
    const audio = this.text(x + w - PAD - 30, y + PAD - 2, '🔊', T.xl).setInteractive({ useHandCursor: true });
    audio.on('pointerdown', () => speakDe(de.text));
    box.add(audio);

    if (fb) {
      fb.setY(cy);
      box.add(fb);
      cy += fb.displayHeight + 12;
    }
    choiceViews.forEach((v, i) => {
      const sel = i === d.sel;
      const cg = this.add.graphics();
      cg.fillStyle(sel ? 0x24407a : 0x18233c, 1).fillRoundedRect(tx - 6, cy, tw + 6, v.h, 10);
      cg.lineStyle(2, sel ? C.blue : C.borderSoft, 1).strokeRoundedRect(tx - 6, cy, tw + 6, v.h, 10);
      if (sel) cg.fillStyle(C.blue, 1).fillTriangle(tx - 20, cy + v.h / 2 - 7, tx - 20, cy + v.h / 2 + 7, tx - 12, cy + v.h / 2);
      v.label.setPosition(tx + 10, cy + 8);
      v.sub?.setPosition(tx + 38, cy + 10 + v.label.displayHeight);
      const hit = this.add.rectangle(tx - 6 + (tw + 6) / 2, cy + v.h / 2, tw + 6, v.h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        if (d.sel !== i) {
          d.sel = i;
          this.renderDialog();
        }
      });
      hit.on('pointerdown', () => this.pick(i));
      box.add([cg, v.label, ...(v.sub ? [v.sub] : []), hit]);
      cy += v.h + 8;
    });
    if (!choices.length) {
      const cont = this.add.container(0, 0);
      const kw = this.keyCap(cont, 0, 0, 'E');
      const lbl = this.head(kw + 10, 0, 'Continuar', T.md, C.gold);
      cont.add(lbl);
      cont.setPosition(x + w - PAD - kw - 10 - lbl.displayWidth, y + h - PAD - 28);
      const hit = this.add.rectangle(x + w - PAD - 70, y + h - PAD - 14, 150, 36, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.advance());
      box.add([cont, hit]);
    }
    this.dialog = box;
    this.reflowToasts();
  }

  private chooseInDialog(c: DChoice) {
    const d = this.dialogState!;
    if (c.vocab) {
      const fresh = GameState.learn(c.vocab);
      if (fresh.length) this.toastWords(fresh);
    }
    if (c.correct === false) {
      d.feedback = { text: `✗  ${c.feedback ?? 'Inténtalo de nuevo.'}`, ok: false };
      d.firstTry = false;
      this.renderDialog();
      return;
    }
    if (c.correct === true && d.firstTry) {
      const xp = GameState.addXp(5);
      this.toast({ title: `+${xp} XP`, lines: [c.feedback ?? '¡Respuesta correcta!'], tone: 'acid' });
    }
    d.feedback = undefined;
    d.firstTry = true;
    this.world?.player.say(this.fill(c.de), this.fill(c.es), 2200);
    if (c.action) d.onAction?.(c.action);
    if (c.next) {
      d.node = c.next;
      d.sel = 0;
      this.enterNode();
    } else this.closeDialog();
  }

  private closeDialog() {
    this.dialog?.destroy();
    this.dialog = null;
    this.dialogState = null;
    this.reflowToasts();
  }

  // ───────────── Nevera ─────────────

  openFridge(cb: (id: string | null) => void) {
    this.fridge = { box: this.add.container(0, 0), sel: 0, cb };
    GameState.learn(['kuehlschrank']);
    this.renderFridge();
  }

  private renderFridge() {
    if (!this.fridge) return;
    this.fridge.box.destroy();
    const W = this.W;
    const H = this.H;
    const tr = GameState.data.settings.translations;
    const w = 400;
    const rowH = 62;
    const h = 76 + DRINKS.length * rowH + 50;
    const x = Math.min(W - w - 20, Math.round(W / 2 + 60));
    const y = Math.max(20, Math.round(H / 2 - h / 2 - 30));
    const box = this.add.container(0, 0).setDepth(20);
    const g = this.add.graphics();
    this.panel(g, x, y, w, h, 16);
    g.lineStyle(1, C.borderSoft, 1).lineBetween(x + PAD, y + 58, x + w - PAD, y + 58);
    box.add([g, this.head(x + PAD, y + 14, '🧊  Selecciona una bebida', T.lg)]);
    DRINKS.forEach((d, i) => {
      const yy = y + 70 + i * rowH;
      const sel = i === this.fridge!.sel;
      const rg = this.add.graphics();
      rg.fillStyle(sel ? 0x24407a : 0x18233c, 1).fillRoundedRect(x + 12, yy, w - 24, rowH - 8, 10);
      rg.lineStyle(2, sel ? C.blue : C.borderSoft, 1).strokeRoundedRect(x + 12, yy, w - 24, rowH - 8, 10);
      rg.fillStyle(0xeef2fa, 1).fillRoundedRect(x + 20, yy + 6, 42, 42, 8);
      const icon = this.add.image(x + 41, yy + 27, `drink_${d.id}`).setScale(1.5);
      const label = this.text(x + 76, yy + (tr ? 3 : 12), `${d.article} ${d.de}`, T.lg, C.white, true);
      const sub = this.text(x + 76, yy + 29, tr ? d.es : '', T.sm, C.muted);
      const num = this.text(x + w - 44, yy + 14, `${i + 1}`, T.md, C.muted, true);
      const hit = this.add.rectangle(x + w / 2, yy + (rowH - 8) / 2, w - 24, rowH - 8, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        if (this.fridge && this.fridge.sel !== i) {
          this.fridge.sel = i;
          this.renderFridge();
        }
      });
      hit.on('pointerdown', () => this.pick(i));
      box.add([rg, icon, label, sub, num, hit]);
    });
    box.add(this.text(x + PAD, y + h - 38, '↑↓ elegir   ·   E coger   ·   ESC cerrar', T.sm, C.muted));
    this.fridge.box = box;
  }

  private closeFridge(id: string | null) {
    const f = this.fridge;
    if (!f) return;
    f.box.destroy();
    this.fridge = null;
    if (id) {
      f.cb(id);
      const d = DRINKS.find((x) => x.id === id)!;
      this.toast({ title: `Has cogido: ${d.article} ${d.de}`, lines: ['Llévasela al cliente y pulsa E.'], icon: `drink_${id}`, tone: 'blue' });
    }
  }

  // ───────────── Entrada común ─────────────

  advance() {
    if (this.banner) return this.closeBanner();
    if (this.picker) return this.pick(this.picker.sel);
    if (this.form) return;
    if (this.fridge) return this.pick(this.fridge.sel);
    const d = this.dialogState;
    const n = this.curNode();
    if (d && n) {
      if (n.choices?.length) return this.pick(d.sel);
      if (n.next) {
        d.node = n.next;
        d.sel = 0;
        return this.enterNode();
      }
      return this.closeDialog();
    }
  }

  private pick(i: number) {
    if (this.picker) {
      const it = this.picker.items[i];
      if (it) this.picker.onPick(it.id);
      return;
    }
    if (this.form) return this.pickFormOption(i);
    if (this.fridge) {
      if (i < DRINKS.length) this.closeFridge(DRINKS[i].id);
      return;
    }
    const n = this.curNode();
    if (n?.choices && i < n.choices.length) this.chooseInDialog(n.choices[i]);
  }

  private moveSel(dir: number) {
    if (this.picker) {
      this.picker.sel = (this.picker.sel + dir + this.picker.items.length) % this.picker.items.length;
      return this.renderPicker();
    }
    if (this.fridge) {
      this.fridge.sel = (this.fridge.sel + dir + DRINKS.length) % DRINKS.length;
      return this.renderFridge();
    }
    const n = this.curNode();
    if (this.dialogState && n?.choices?.length) {
      this.dialogState.sel = (this.dialogState.sel + dir + n.choices.length) % n.choices.length;
      this.renderDialog();
    }
  }

  // ───────────── Avisos (toasts) ─────────────

  toast(spec: ToastSpec) {
    const tone = { acid: 0x6dffa8, gold: 0xffd77a, red: 0xff6b7a, blue: C.blue }[spec.tone ?? 'blue'];
    const c = this.add.container(0, 0).setDepth(30);
    const w = 380;
    const tx = spec.icon ? 76 : PAD + 6;
    const title = this.text(tx, 14, spec.title, T.lg, C.white, true, w - tx - PAD);
    const lines = this.text(tx, 20 + title.displayHeight, spec.lines.join('\n'), T.sm, C.text, false, w - tx - PAD);
    const h = Math.max(76, 34 + title.displayHeight + lines.displayHeight);
    const g = this.add.graphics();
    this.panel(g, 0, 0, w, h, 14, tone);
    g.fillStyle(tone, 1).fillRoundedRect(0, 12, 5, h - 24, 2);
    c.add([g, title, lines]);
    if (spec.icon) {
      g.fillStyle(0xeef2fa, 1).fillRoundedRect(PAD, h / 2 - 22, 44, 44, 10);
      c.add(this.add.image(PAD + 22, h / 2, spec.icon).setScale(spec.icon === 'cash' ? 1.2 : 1.5));
    }
    c.setData('h', h);
    this.toasts.push(c);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 180 });
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: c,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          c.destroy();
          this.toasts = this.toasts.filter((t) => t !== c);
          this.reflowToasts();
        },
      });
    });
    while (this.toasts.length > 3) this.toasts.shift()!.destroy();
    this.reflowToasts();
  }

  private toastWords(ids: string[]) {
    this.toast({ title: '📚 Vocabulario nuevo', lines: ids.map((id) => GameState.vocabText(id)), tone: 'acid' });
  }

  private reflowToasts() {
    // con un diálogo abierto, los avisos van a la columna izquierda para no tapar la traducción
    const left = !!this.dialog;
    let y = left ? 204 : this.toastTop;
    // si no caben, se descartan los más antiguos
    const room = this.H - 96 - y;
    let total = this.toasts.reduce((a, t) => a + (t.getData('h') as number) + 10, 0);
    while (total > room && this.toasts.length > 1) {
      const old = this.toasts.shift()!;
      total -= (old.getData('h') as number) + 10;
      old.destroy();
    }
    for (const t of this.toasts) {
      t.setPosition(left ? 16 : this.W - 396, y);
      y += (t.getData('h') as number) + 10;
    }
  }

  // ───────────── Paneles modales ─────────────

  private toggleModal(id: 'map' | 'inv' | 'progress') {
    if (this.dialog || this.fridge) return;
    if (this.modal?.getData('id') === id) return this.closeModal();
    this.openModal(id);
  }

  private closeModal() {
    this.modal?.destroy();
    this.modal = null;
    this.drawNav();
  }

  private openModal(id: string) {
    this.modal?.destroy();
    const W = this.W;
    const H = this.H;
    const c = this.add.container(0, 0).setDepth(40);
    c.setData('id', id);
    const dim = this.add.rectangle(0, 0, W, H, 0x05070d, 0.72).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => this.closeModal());
    const w = Math.min(id === 'map' ? 1000 : 820, W - 40);
    const h = Math.min(id === 'map' ? 660 : 600, H - 130);
    const x = Math.round((W - w) / 2);
    const y = Math.max(16, Math.round((H - h) / 2 - 36));
    const g = this.add.graphics();
    this.panel(g, x, y, w, h, 18);
    g.lineStyle(1, C.borderSoft, 1).lineBetween(x + PAD, y + 62, x + w - PAD, y + 62);
    const block = this.add.rectangle(x, y, w, h, 0, 0.001).setOrigin(0).setInteractive();
    const titles: Record<string, string> = { map: '🗺  Mapa', inv: '🎒  Inventario', progress: '📊  Progreso', pause: '⏸  Pausa' };
    const close = this.text(x + w - 46, y + 16, '✕', T.xl, C.text, true).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeModal());
    c.add([dim, g, block, this.head(x + PAD + 4, y + 16, titles[id], T.xl), close]);
    this.modal = c;
    const inner = { x: x + PAD + 4, y: y + 80, w: w - PAD * 2 - 8, h: h - 96 };
    if (id === 'map') this.fillMap(c, inner);
    if (id === 'inv') this.fillInventory(c, inner);
    if (id === 'progress') this.fillProgress(c, inner);
    if (id === 'pause') this.fillPause(c, inner);
    this.drawNav();
  }

  private fillMap(c: Phaser.GameObjects.Container, r: { x: number; y: number; w: number; h: number }) {
    const world = this.world;
    if (!world) return;
    const g = this.add.graphics();
    const labels = this.add.container(0, 0);
    c.add([g, labels]);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const f of world.minimap)
      for (const [px, py] of [
        [f.rect.x0, f.rect.y0],
        [f.rect.x1, f.rect.y0],
        [f.rect.x0, f.rect.y1],
        [f.rect.x1, f.rect.y1],
      ]) {
        const s = toScreen(px, py);
        minX = Math.min(minX, s.x);
        maxX = Math.max(maxX, s.x);
        minY = Math.min(minY, s.y);
        maxY = Math.max(maxY, s.y);
      }
    const scale = Math.min((r.w - 40) / ((maxX - minX) / 32), (r.h - 80) / ((maxY - minY) / 32));
    const cx = r.x + r.w / 2 - ((minX + maxX) / 2 / 32) * scale;
    const cy = r.y + (r.h - 50) / 2 - ((minY + maxY) / 2 / 32) * scale;
    this.drawMinimap(world, { g, cx, cy, scale, labels });
    c.add(this.text(r.x, r.y + r.h - 34, `Estás en: ${world.displayName}     🟠 tú     🟡 objetivo`, T.sm, C.muted));
  }

  private fillInventory(c: Phaser.GameObjects.Container, r: { x: number; y: number; w: number; h: number }) {
    const items = GameState.data.inventory.map((id) => ITEMS[id]).filter(Boolean);
    const cw = 186;
    const cols = Math.max(2, Math.floor(r.w / cw));
    items.forEach((it, i) => {
      const cx = r.x + (i % cols) * cw;
      const cy = r.y + Math.floor(i / cols) * 140;
      const g = this.add.graphics();
      g.fillStyle(0x18233c, 1).fillRoundedRect(cx, cy, cw - 14, 128, 12);
      g.lineStyle(2, C.borderSoft, 1).strokeRoundedRect(cx, cy, cw - 14, 128, 12);
      c.add([g, this.text(cx + 14, cy + 10, it.emoji, 34), this.text(cx + 14, cy + 58, it.de, T.sm, C.white, true, cw - 40), this.text(cx + 14, cy + 88, it.name, T.xs, C.muted, false, cw - 40)]);
    });
    const by = r.y + Math.ceil(items.length / cols) * 140 + 8;
    c.add(this.text(r.x, by, `💶  Dinero: ${GameState.data.money.toFixed(2)} €`, T.lg, C.gold, true));
    const held = this.world?.player?.heldId;
    if (held) {
      const d = DRINKS.find((dd) => dd.id === held)!;
      c.add(this.text(r.x, by + 40, `🤲  En la mano: ${d.article} ${d.de} (${d.es})`, T.md, C.white, true));
    }
  }

  private fillProgress(c: Phaser.GameObjects.Container, r: { x: number; y: number; w: number; h: number }) {
    const d = GameState.data;
    const lv = GameState.level;
    c.add([
      this.text(r.x, r.y, `Nivel ${lv.level}   ·   ${d.xp} XP   ·   ${d.money.toFixed(2)} €   ·   Alemán ${d.settings.level}`, T.lg, C.white, true),
      this.text(r.x, r.y + 36, `Bebidas servidas: ${d.stats.served}     Errores: ${d.stats.wrong}     Conversaciones: ${d.stats.talks}`, T.sm, C.muted),
      this.head(r.x, r.y + 76, 'Misiones', T.md, C.gold),
    ]);
    QUESTS.forEach((qd, i) => {
      const done = GameState.isDone(qd.id);
      const active = d.quest.id === qd.id;
      const step = active ? qd.steps.find((st) => st.id === d.quest.step) : null;
      const status = done ? '✅  completada' : active ? `▶️  ${step?.label ?? ''}` : '🔒  bloqueada';
      c.add(this.text(r.x + 4, r.y + 112 + i * 30, `${qd.code} · ${qd.title}  —  ${status}`, T.sm, done ? C.muted : active ? C.white : C.muted, active));
    });
    if (d.quest.id === 'none') c.add(this.text(r.x + 4, r.y + 112 + QUESTS.length * 30, '🏆  Has completado todo el contenido disponible.', T.sm, C.gold));
    const ids = Object.keys(d.vocab);
    const vy = r.y + 112 + (QUESTS.length + 1) * 30 + 22;
    c.add(this.text(r.x, vy, `📚 Vocabulario aprendido: ${ids.length} palabras`, T.md, C.acid, true));
    const colW = r.w / 2;
    const rowH = 30;
    const maxRows = Math.max(1, Math.floor((r.y + r.h - vy - 50) / rowH));
    ids.slice(0, maxRows * 2).forEach((id, i) => {
      const v = VOCAB[id];
      if (!v) return;
      const dot = { new: '🔹', learning: '🔸', known: '🟣', mastered: '🟢' }[mastery(d.vocab[id])];
      c.add(this.text(r.x + (i % 2) * colW, vy + 38 + Math.floor(i / 2) * rowH, `${dot} ${vocabLabel(v)} — ${v.es}`, T.sm, C.text, false, colW - 16));
    });
    if (ids.length > maxRows * 2) c.add(this.text(r.x, r.y + r.h - 30, `… y ${ids.length - maxRows * 2} palabras más.`, T.xs, C.muted));
  }

  private fillPause(c: Phaser.GameObjects.Container, r: { x: number; y: number; w: number; h: number }) {
    const s = GameState.data.settings;
    const rows: [string, () => void, boolean][] = [
      ['▶   Continuar', () => this.closeModal(), false],
      [`🌐   Traducciones al español: ${s.translations ? 'SÍ' : 'NO'}      [T]`, () => GameState.setSetting('translations', !s.translations), true],
      [`🎓   Nivel de alemán: ${s.level}   (A1 → B2)`, () => GameState.setSetting('level', CEFR_LEVELS[(CEFR_LEVELS.indexOf(s.level) + 1) % CEFR_LEVELS.length]), true],
      [`🔊   Voz alemana: ${s.tts ? 'SÍ' : 'NO'}`, () => GameState.setSetting('tts', !s.tts), true],
      [
        `✏️   Cambiar nombre (${GameState.data.name})`,
        () => {
          const n = window.prompt('¿Cómo te llamas?', GameState.data.name)?.trim();
          if (n) {
            GameState.data.name = n.slice(0, 16);
            GameState.save();
            this.refreshHud();
          }
        },
        true,
      ],
      ['📚   Repaso de vocabulario y Bürgeramt (versión clásica)', () => window.open('/classic.html', '_blank'), false],
      [
        '🗑   Reiniciar partida',
        () => {
          if (window.confirm('¿Borrar la partida y empezar de cero?')) {
            GameState.reset();
            window.location.reload();
          }
        },
        false,
      ],
    ];
    const rowH = 52;
    rows.forEach(([label, fn, reopen], i) => {
      const yy = r.y + i * (rowH + 8);
      const g = this.add.graphics();
      const draw = (hover: boolean) =>
        g
          .clear()
          .fillStyle(hover ? 0x24407a : 0x18233c, 1)
          .fillRoundedRect(r.x, yy, r.w, rowH, 12)
          .lineStyle(2, hover ? C.blue : C.borderSoft, 1)
          .strokeRoundedRect(r.x, yy, r.w, rowH, 12);
      draw(false);
      const t = this.text(r.x + 20, yy + 13, label, T.md, C.white, true);
      const hit = this.add.rectangle(r.x + r.w / 2, yy + rowH / 2, r.w, rowH, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => draw(true));
      hit.on('pointerout', () => draw(false));
      hit.on('pointerdown', () => {
        fn();
        if (reopen && this.modal?.getData('id') === 'pause') this.openModal('pause');
      });
      c.add([g, t, hit]);
    });
    c.add(this.text(r.x, r.y + rows.length * (rowH + 8) + 6, 'WASD / flechas: caminar  ·  Shift: correr  ·  E: interactuar  ·  M I P: paneles', T.sm, C.muted, false, r.w));
  }

  // ───────────── Tras cerrar el diálogo ─────────────

  /** Ejecuta fn en cuanto no haya diálogo ni menú abierto. */
  afterDialog(fn: () => void) {
    this.afterDialogQueue.push(fn);
  }

  // ───────────── Aviso de misión completada ─────────────

  private showBanner(r: QuestCompletion) {
    const W = this.W;
    const H = this.H;
    const c = this.add.container(0, 0).setDepth(60);
    const dim = this.add.rectangle(0, 0, W, H, 0x05070d, 0.6).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => this.closeBanner());
    const w = Math.min(640, W - 40);
    const lines: [string, number, string][] = [
      [`${r.def.code} · ${r.def.title}`, T.lg, C.white],
      [r.def.outro, T.sm, C.muted],
      [[`+${r.xp} XP`, r.money ? `+${r.money} €` : '', ...(r.def.reward.items ?? []).map((i) => `📜 ${ITEMS[i]?.de ?? i}`)].filter(Boolean).join('     '), T.md, C.acid],
      [r.next ? `Nueva misión → ${r.next.code} · ${r.next.title}` : '🏆  Has completado todo el contenido disponible. ¡Pronto habrá más misiones!', T.sm, C.gold],
    ];
    const texts = lines.map(([t, size, col]) => this.text(0, 0, t, size, col, false, w - 60).setAlign('center'));
    const title = this.text(0, 0, '★  ¡MISIÓN COMPLETADA!  ★', T.xl, C.gold);
    const h = 60 + title.displayHeight + texts.reduce((a, t) => a + t.displayHeight + 14, 0) + 40;
    const x = Math.round((W - w) / 2);
    const y = Math.round((H - h) / 2 - 40);
    const g = this.add.graphics();
    this.panel(g, x, y, w, h, 18, 0xffd77a);
    g.lineStyle(2, 0xffd77a, 0.4).strokeRoundedRect(x + 8, y + 8, w - 16, h - 16, 12);
    title.setPosition(Math.round(x + (w - title.displayWidth) / 2), y + 28);
    let ty = y + 36 + title.displayHeight + 14;
    for (const t of texts) {
      t.setPosition(Math.round(x + (w - t.displayWidth) / 2), Math.round(ty));
      ty += t.displayHeight + 14;
    }
    const hint = this.text(0, 0, 'E / Enter para continuar', T.xs, C.muted);
    hint.setPosition(Math.round(x + (w - hint.displayWidth) / 2), y + h - 34);
    c.add(dim);
    // confeti (por detrás del panel, cae alrededor)
    for (let i = 0; i < 40; i++) {
      const side = i % 2 ? x - 30 - Math.random() * 120 : x + w + 30 + Math.random() * 120;
      const piece = this.add.rectangle(side, y - 20, 6, 10, [0xffd77a, 0x6dffa8, 0x5fa8ff, 0xff8a96][i % 4]);
      c.add(piece);
      this.tweens.add({ targets: piece, y: y + h + 60 + Math.random() * 80, angle: 360 * (Math.random() - 0.5) * 2, alpha: 0, duration: 1600 + Math.random() * 1200, delay: Math.random() * 400 });
    }
    c.add([g, title, ...texts, hint]);
    const panelParts = [g, title, ...texts, hint];
    for (const o of panelParts) o.setAlpha(0);
    this.tweens.add({ targets: panelParts, alpha: 1, duration: 300 });
    this.tweens.add({ targets: title, scale: { from: title.scale * 0.6, to: title.scale }, duration: 500, ease: 'Back.easeOut' });
    this.banner = c;
    this.time.delayedCall(7000, () => this.banner === c && this.closeBanner());
  }

  private closeBanner() {
    this.banner?.destroy();
    this.banner = null;
  }

  // ───────────── Formulario interactivo (documento) ─────────────

  openForm(fields: FormField[], done: () => void) {
    this.form = { box: this.add.container(0, 0), fields, idx: 0, values: [], done };
    this.renderForm();
  }

  private closeForm() {
    this.form?.box.destroy();
    this.form = null;
  }

  private pickFormOption(i: number) {
    const f = this.form;
    if (!f) return;
    const field = f.fields[f.idx];
    if (!field || i >= field.options.length) return;
    if (i !== field.correct) {
      f.feedback = { text: `✗  ${field.explain}`, ok: false };
      this.renderForm();
      return;
    }
    const fresh = GameState.learn(field.vocab ?? []);
    if (fresh.length) this.toastWords(fresh);
    f.values.push(field.options[i]);
    f.feedback = { text: `✓  ${field.label}: ${field.options[i]}`, ok: true };
    f.idx++;
    if (f.idx >= f.fields.length) {
      this.renderForm();
      this.time.delayedCall(900, () => {
        const cb = f.done;
        this.closeForm();
        cb();
      });
      return;
    }
    this.renderForm();
  }

  private renderForm() {
    const f = this.form;
    if (!f) return;
    f.box.destroy();
    const W = this.W;
    const H = this.H;
    const tr = GameState.data.settings.translations;
    const ink = '#2a2238';
    const w = Math.min(760, W - 40);
    const rowH = 34;
    const field = f.fields[f.idx];
    const h = 120 + f.fields.length * rowH + (field ? 128 : 60);
    const x = Math.round((W - w) / 2);
    const y = Math.max(16, Math.round((H - h) / 2 - 40));
    const box = this.add.container(0, 0).setDepth(25);
    const g = this.add.graphics();
    g.fillStyle(0x05070d, 0.45).fillRoundedRect(x + 4, y + 6, w, h, 6);
    g.fillStyle(0xf7f1e3, 1).fillRoundedRect(x, y, w, h, 6);
    g.lineStyle(3, 0xc9b98f, 1).strokeRoundedRect(x, y, w, h, 6);
    g.fillStyle(0x22356b, 1).fillRect(x, y, w, 8);
    box.add(g);
    box.add(this.text(x + PAD, y + 20, 'Anmeldung bei der Meldebehörde', T.lg, ink));
    box.add(this.text(x + PAD, y + 54, tr ? 'Declaración de empadronamiento · elige el dato correcto para cada casilla' : 'Bitte füllen Sie alle Felder aus.', T.xs, '#6a6070'));
    f.fields.forEach((fd, i) => {
      const yy = y + 88 + i * rowH;
      const active = i === f.idx;
      if (active) g.fillStyle(0xffe9a8, 1).fillRect(x + 10, yy - 4, w - 20, rowH - 2);
      g.lineStyle(1, 0xc9b98f, 1).lineBetween(x + 260, yy + rowH - 8, x + w - PAD, yy + rowH - 8);
      box.add(this.text(x + PAD, yy, fd.label + (tr ? `  (${fd.es})` : ''), T.xs, active ? ink : '#5a5060'));
      if (f.values[i]) box.add(this.text(x + 270, yy - 2, f.values[i], T.md, '#1f4fd1'));
    });
    const oy = y + 88 + f.fields.length * rowH + 10;
    if (f.feedback) box.add(this.text(x + PAD, oy, f.feedback.text, T.xs, f.feedback.ok ? '#2a8a4a' : '#c8283c', false, w - PAD * 2));
    if (field) {
      box.add(this.text(x + PAD, oy + 30, `¿Qué escribes en «${field.label}»?`, T.sm, ink));
      const bw = Math.floor((w - PAD * 2 - 20) / field.options.length);
      field.options.forEach((opt, i) => {
        const bx = x + PAD + i * (bw + 10);
        const by = oy + 62;
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1).fillRoundedRect(bx, by, bw, 44, 8);
        bg.lineStyle(2, 0x22356b, 1).strokeRoundedRect(bx, by, bw, 44, 8);
        const t = this.text(bx + 12, by + 10, `${i + 1}. ${opt}`, T.sm, ink, false, bw - 20);
        const hit = this.add.rectangle(bx + bw / 2, by + 22, bw, 44, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.pickFormOption(i));
        box.add([bg, t, hit]);
      });
    } else {
      box.add(this.text(x + PAD, oy + 30, '✓  Formular ausgefüllt!', T.md, '#2a8a4a'));
    }
    f.box = box;
  }

  // ───────────── Selector de objetos (entregar documentos) ─────────────

  openPicker(title: string, sub: string, items: { id: string; label: string; sub: string; icon: string }[], onPick: (id: string) => void) {
    this.picker = { box: this.add.container(0, 0), title, sub, items, sel: 0, onPick };
    this.renderPicker();
  }

  closePicker() {
    this.picker?.box.destroy();
    this.picker = null;
  }

  private renderPicker() {
    const p = this.picker;
    if (!p) return;
    p.box.destroy();
    const W = this.W;
    const H = this.H;
    const tr = GameState.data.settings.translations;
    const w = Math.min(560, W - 40);
    const rowH = 58;
    const title = this.text(0, 0, p.title, T.md, C.white, false, w - PAD * 2);
    const sub = tr ? this.text(0, 0, p.sub, T.sm, C.muted, false, w - PAD * 2) : null;
    const headH = 20 + title.displayHeight + (sub ? sub.displayHeight + 6 : 0) + 16;
    const h = headH + p.items.length * rowH + 50;
    const x = Math.round((W - w) / 2);
    const y = Math.max(16, Math.round((H - h) / 2 - 40));
    const box = this.add.container(0, 0).setDepth(25);
    const g = this.add.graphics();
    this.panel(g, x, y, w, h, 16);
    box.add(g);
    title.setPosition(x + PAD, y + 18);
    box.add(title);
    if (sub) {
      sub.setPosition(x + PAD, y + 22 + title.displayHeight);
      box.add(sub);
    }
    p.items.forEach((it, i) => {
      const yy = y + headH + i * rowH;
      const sel = i === p.sel;
      const rg = this.add.graphics();
      rg.fillStyle(sel ? 0x24407a : 0x18233c, 1).fillRoundedRect(x + 12, yy, w - 24, rowH - 8, 10);
      rg.lineStyle(2, sel ? C.blue : C.borderSoft, 1).strokeRoundedRect(x + 12, yy, w - 24, rowH - 8, 10);
      const icon = this.text(x + 26, yy + 8, it.icon, T.lg);
      const label = this.text(x + 70, yy + (tr ? 2 : 12), it.label, T.md, C.white);
      const s2 = this.text(x + 70, yy + 28, tr ? it.sub : '', T.xs, C.muted);
      const num = this.text(x + w - 44, yy + 12, `${i + 1}`, T.md, C.muted);
      const hit = this.add.rectangle(x + w / 2, yy + (rowH - 8) / 2, w - 24, rowH - 8, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        if (this.picker && this.picker.sel !== i) {
          this.picker.sel = i;
          this.renderPicker();
        }
      });
      hit.on('pointerdown', () => this.pick(i));
      box.add([rg, icon, label, s2, num, hit]);
    });
    box.add(this.text(x + PAD, y + h - 38, '↑↓ elegir   ·   E entregar   ·   ESC cerrar', T.sm, C.muted));
    p.box = box;
  }

  // ───────────── Controles táctiles ─────────────

  private buildTouch() {
    this.input.addPointer(2);
    let origin: { x: number; y: number; id: number } | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isBlocking() || p.x / uiZoom() > this.W * 0.45 || p.y / uiZoom() < 340) return;
      origin = { x: p.x, y: p.y, id: p.id };
      touchInput.active = true;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!origin || p.id !== origin.id) return;
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, len / 50);
      touchInput.x = (dx / len) * k;
      touchInput.y = (dy / len) * k;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (origin && p.id === origin.id) {
        origin = null;
        touchInput.active = false;
        touchInput.x = touchInput.y = 0;
      }
    });
  }

  private layoutTouch() {
    const t = this.touchUi!;
    t.removeAll(true);
    const W = this.W;
    const H = this.H;
    const g = this.add.graphics();
    g.fillStyle(C.panel, 0.6).fillCircle(96, H - 170, 60);
    g.lineStyle(2, C.border, 0.8).strokeCircle(96, H - 170, 60);
    const e = this.add.circle(W - 90, H - 170, 44, 0x24407a, 0.95).setStrokeStyle(3, C.blue).setInteractive();
    e.on('pointerdown', () => (this.isBlocking() ? this.advance() : touchInput.onInteract?.()));
    t.add([g, e, this.text(W - 90, H - 170, 'E', 30, C.white, true).setOrigin(0.5), this.text(96, H - 170, '✥', 34, C.muted).setOrigin(0.5)]);
  }
}
