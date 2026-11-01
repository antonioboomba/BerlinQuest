import Phaser from 'phaser';
import { flatTop, isoBox } from '../art/buildings';
import { pixelText, textWidth } from '../art/font';
import { makeCanvas, rect, type Ctx } from '../art/pixel';
import { trainCab, trainSide } from '../art/props';
import { TICKETS } from '../data/unterwegs';
import { toScreen } from '../iso';
import { GameState, speakDe } from '../state/GameState';
import { Actor } from '../world/Actor';
import type { Pt } from '../world/Collision';
import { StaticBrain } from '../world/Npc';
import { InteriorScene } from './InteriorScene';

// Misión 04 — estación subterránea de la U8 en Moritzplatz.
// Gleis 1 (vía del fondo): Richtung Wittenau. Gleis 2 (vía lateral): Richtung Hermannstraße.

const W = 16;
const H = 11;
const DOOR: Pt = { x: 12, y: 10.6 };
const PLAN: Pt = { x: 13.4, y: 3.9 };
const MACHINE: Pt = { x: 14.3, y: 6.1 };
const BENCH1 = { seat: { x: 8, y: 2.45 }, at: { x: 8, y: 3.05 } };
const BENCH2 = { seat: { x: 2.45, y: 7 }, at: { x: 3.05, y: 7 } };
const STOP_X = 4; // el tren de Gleis 1 ocupa x 4..12 al detenerse

/**
 * Suelo del andén reproducido de la referencia: vía, borde con franja táctil y losas, con una guía táctil a lo largo
 * de Gleis 1 (y = 3) y otra a lo largo de Gleis 2 (x = 3) que se cruzan en (3, 3).
 */
function platformFloor(x: number, y: number): string {
  if (y === 0) return 'pfTrackX';
  if (x === 0) return 'pfTrackY';
  if (x === 1 && y === 1) return 'pfEdgeCorner';
  if (y === 1) return 'pfEdgeX';
  if (x === 1) return 'pfEdgeY';
  if (x === 3 && y === 3) return 'pfGuideCross';
  if (y === 3) return 'pfGuideX';
  if (x === 3) return 'pfGuideY';
  return 'pfSlab';
}

export class UBahnScene extends InteriorScene {
  readonly displayName = 'U-Bahnhof Moritzplatz (U8)';
  private train!: Phaser.GameObjects.Image;
  private trainX = -12;
  private doorsOpen = false;
  private arriving = false;
  private display!: Phaser.Textures.CanvasTexture;
  private mask!: Phaser.Display.Masks.GeometryMask;

  constructor() {
    super('UBahn');
  }

  create(data?: { x?: number; y?: number; from?: string }) {
    this.trainX = -12;
    this.doorsOpen = false;
    this.arriving = false;
    this.buildRoom({
      key: this.registry.get('ground:platform_ref') ? 'ubahn_ref' : 'ubahn',
      w: W,
      h: H,
      wallH: 160,
      door: DOOR,
      background: '#0a0e18',
      wallTop: '#cfd8e0',
      edge: '#5a6278',
      floor: this.registry.get('ground:platform_ref') ? platformFloor : (x, y) => (y === 0 ? 'trackX' : x === 0 ? 'trackY' : y === 1 ? 'edgeX' : x === 1 ? 'edgeY' : 'slab'),
      back: (ctx, w, h) => this.paintWall(ctx, w, h, 'GLEIS 1'),
      side: (ctx, w, h) => this.paintWall(ctx, w, h, 'GLEIS 2'),
    });
    this.collision.add(0, 0, W, 1.05);
    this.collision.add(0, 0, 1.05, H);

    // recorte: los trenes solo se ven dentro de la estación
    const pts = [toScreen(0, H), toScreen(0, 0), toScreen(W, 0)];
    const shape = this.make.graphics({}, false);
    shape.fillStyle(0xffffff).fillPoints(
      [
        { x: pts[0].x, y: pts[0].y - 400 },
        { x: pts[1].x, y: pts[1].y - 400 },
        { x: pts[2].x, y: pts[2].y - 400 },
        toScreen(W, 0),
        toScreen(W, H),
        toScreen(0, H),
      ],
      true,
    );
    this.mask = shape.createGeometryMask();

    this.buildTrains();
    this.buildFurniture();
    this.spawnPlayer(data);
    this.addExit('Subir a la calle', 'Street', { from: 'UBahn' });

    // viajeros esperando
    const p1 = this.addActor(new Actor(this, 'citizen1', 'Fahrgast', 10.5, 2.6));
    this.brains.push(new StaticBrain(this, p1, 'NE', ['Hallo!', '¡Hola!']));
    const p2 = this.addActor(new Actor(this, 'guest4', 'Fahrgast', 3.4, 9));
    this.brains.push(new StaticBrain(this, p2, 'NW'));

    if (GameState.isActive('unterwegs', 'station')) GameState.setQuest('map');
    // si volvió a entrar estando ya en el andén, el tren vuelve a venir
    if (GameState.isActive('unterwegs', 'wait', 'board')) {
      GameState.setQuest('platform');
    }
    this.drawDisplay('U8 WITTENAU', GameState.isActive('unterwegs') ? '-' : '3 MIN');
    // tren de servicio regular (después de la misión, o como ambiente)
    this.time.addEvent({ delay: 26000, loop: true, callback: () => !GameState.isActive('unterwegs') && this.trainArrives(12000) });
    this.time.addEvent({ delay: 19000, loop: true, callback: () => this.otherTrainPasses() });
    this.objectivePoi = () => this.objective();
  }

  // ───────────── Arte ─────────────

  private paintWall(ctx: Ctx, w: number, h: number, gleis: string) {
    rect(ctx, 0, 0, w, h, '#5fa89a');
    for (let y = 0; y < h; y += 10) for (let x = (y / 10) % 2 ? 0 : 6; x < w; x += 12) rect(ctx, x, y, 11, 9, '#6fb8aa');
    rect(ctx, 0, h - 40, w, 40, '#3a3a44');
    rect(ctx, 0, 0, w, 8, '#2a2238');
    // rótulos de estación
    for (let x = 30; x < w - 120; x += 200) {
      const t = 'MORITZPLATZ';
      rect(ctx, x, 46, textWidth(t, 2) + 16, 22, '#ffffff');
      rect(ctx, x + 2, 48, textWidth(t, 2) + 12, 18, '#22356b');
      pixelText(ctx, t, x + 8, 52, '#ffffff', 2);
    }
    // carteles publicitarios
    for (let x = 140; x < w - 40; x += 200) {
      rect(ctx, x, 30, 40, 54, '#ffffff');
      rect(ctx, x + 3, 33, 34, 48, ['#e0675a', '#a77bff', '#5fc2ff'][(x / 200) % 3 | 0]);
      pixelText(ctx, 'KINO', x + 12, 70, '#ffffff');
    }
    pixelText(ctx, gleis, 8, 14, '#ffd77a', 2);
  }

  private buildTrains() {
    const make = (key: string, open: boolean) => {
      if (this.textures.exists(key)) return;
      const art = isoBox(8, 1, 70, { canvas: trainSide(256, open) }, { canvas: trainCab(32) }, flatTop('#9aa4b8', '#c9cfdc'));
      this.textures.addCanvas(key, art.canvas);
      this.registry.set(`${key}:anchor`, [art.anchorX, art.anchorY]);
    };
    make('train_x_closed', false);
    make('train_x_open', true);
    this.train = this.add.image(0, 0, 'train_x_closed').setOrigin(0, 0).setDepth(-1000).setMask(this.mask);
    this.positionTrain();

    // tren de la otra dirección (Gleis 2), solo de paso
    if (!this.textures.exists('train_y')) {
      const art = isoBox(1, 8, 70, { canvas: trainCab(32) }, { canvas: trainSide(256, false) }, flatTop('#9aa4b8', '#c9cfdc'));
      this.textures.addCanvas('train_y', art.canvas);
      this.registry.set('train_y:anchor', [art.anchorX, art.anchorY]);
    }
  }

  private positionTrain() {
    const [ax, ay] = this.registry.get('train_x_closed:anchor') as number[];
    const s = toScreen(this.trainX, 0);
    this.train.setPosition(Math.round(s.x - ax), Math.round(s.y - ay));
  }

  private trainArrives(dwellMs: number) {
    if (this.arriving || this.doorsOpen) return;
    this.arriving = true;
    this.trainX = -12;
    this.train.setTexture('train_x_closed');
    const proxy = { x: -12 };
    this.drawDisplay('U8 WITTENAU', 'ZUG FAHRT EIN');
    this.tweens.add({
      targets: proxy,
      x: STOP_X,
      duration: 3200,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.trainX = proxy.x;
        this.positionTrain();
      },
      onComplete: () => {
        this.arriving = false;
        this.doorsOpen = true;
        this.train.setTexture('train_x_open');
        this.drawDisplay('U8 WITTENAU', 'EINSTEIGEN');
        if (GameState.isActive('unterwegs', 'wait')) {
          GameState.setQuest('board');
          speakDe('Bitte einsteigen!');
        }
        if (dwellMs > 0) this.time.delayedCall(dwellMs, () => this.trainDeparts());
      },
    });
  }

  private trainDeparts() {
    if (!this.doorsOpen) return;
    this.doorsOpen = false;
    this.train.setTexture('train_x_closed');
    speakDe('Zurückbleiben, bitte!');
    const proxy = { x: this.trainX };
    this.tweens.add({
      targets: proxy,
      x: 24,
      duration: 3000,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        this.trainX = proxy.x;
        this.positionTrain();
      },
      onComplete: () => this.drawDisplay('U8 WITTENAU', '5 MIN'),
    });
  }

  private otherTrainPasses() {
    const [ax, ay] = this.registry.get('train_y:anchor') as number[];
    const img = this.add.image(0, 0, 'train_y').setOrigin(0, 0).setDepth(-1000).setMask(this.mask);
    const proxy = { y: -12 };
    const place = () => {
      const s = toScreen(0, proxy.y);
      img.setPosition(Math.round(s.x - ax), Math.round(s.y - ay));
    };
    place();
    this.tweens.add({ targets: proxy, y: 14, duration: 5000, ease: 'Sine.easeInOut', onUpdate: place, onComplete: () => img.destroy() });
  }

  private drawDisplay(line: string, info: string) {
    const ctx = this.display.getContext();
    ctx.imageSmoothingEnabled = false;
    rect(ctx, 0, 0, 150, 40, '#2a2238');
    rect(ctx, 2, 2, 146, 36, '#0a0e18');
    pixelText(ctx, line, 6, 7, '#ffb000', 2);
    pixelText(ctx, info, 6, 23, '#ffd77a', 2);
    this.display.refresh();
  }

  private buildFurniture() {
    // indicador de llegadas y carteles de andén, colgados del techo
    this.display = (this.textures.exists('ubahn_display') ? this.textures.get('ubahn_display') : this.textures.createCanvas('ubahn_display', 150, 40)) as Phaser.Textures.CanvasTexture;
    const d = toScreen(6, 2.4);
    this.add.image(d.x, d.y - 170, 'ubahn_display').setOrigin(0.5, 1).setDepth(1e5);
    for (const [key, text, x, y] of [
      ['sign_g1', 'GLEIS 1 - U8 WITTENAU', 10.5, 2.4],
      ['sign_g2', 'GLEIS 2 - U8 HERMANNSTR.', 2.4, 5.5],
    ] as [string, string, number, number][]) {
      if (!this.textures.exists(key)) {
        const w = textWidth(text, 2) + 16;
        const c = makeCanvas(w, 24);
        rect(c.ctx, 0, 0, w, 24, '#ffffff');
        rect(c.ctx, 2, 2, w - 4, 20, '#22356b');
        pixelText(c.ctx, text, 8, 7, '#ffffff', 2);
        this.textures.addCanvas(key, c.canvas);
      }
      const s = toScreen(x, y);
      this.add.image(s.x, s.y - 160, key).setOrigin(0.5, 1).setDepth(1e5);
    }

    this.placeProp('platform_bench', BENCH1.seat.x, BENCH1.seat.y, { block: [1.6, 0.5] });
    this.placeProp('platform_bench', BENCH2.seat.x, BENCH2.seat.y, { block: [0.5, 1.6] });
    this.placeProp('netzplan', PLAN.x, PLAN.y - 0.6, { block: 0.8 });
    this.placeProp('ticket_machine', MACHINE.x + 0.6, MACHINE.y - 0.4, { block: 0.6 });
    this.placeProp(this.propKey('bin_berlin', 'bin'), 9.6, 4.2, { block: 0.4 });
    this.placeProp('plant0', 15.2, 9.8, { block: 0.5 });
    for (const [x, y] of [[4, 4], [11, 4], [6, 8], [12, 8]]) {
      const s = toScreen(x, y);
      this.addGlow(s.x, s.y, '#fff4d8', 110, 0.16, -90000);
    }

    this.interactables.push(
      {
        x: PLAN.x,
        y: PLAN.y,
        radius: 1.1,
        label: () => 'Consultar el plano (Liniennetzplan)',
        action: () =>
          this.ui.openDialog('ubahn_plan', undefined, (a) => {
            if (a === 'trip:planned' && GameState.isActive('unterwegs', 'map')) GameState.setQuest('ticket');
          }),
      },
      {
        x: MACHINE.x,
        y: MACHINE.y,
        radius: 1.1,
        label: () => (GameState.isActive('unterwegs', 'ticket') ? 'Comprar billete (Fahrkartenautomat)' : 'Fahrkartenautomat'),
        action: () => this.useMachine(),
      },
      {
        x: BENCH1.at.x,
        y: BENCH1.at.y,
        radius: 1.1,
        label: () => (this.player.sitting ? null : GameState.isActive('unterwegs', 'platform') ? 'Esperar aquí · Gleis 1' : 'Sentarse'),
        action: () => this.waitAt(1),
      },
      {
        x: BENCH2.at.x,
        y: BENCH2.at.y,
        radius: 1.1,
        label: () => (this.player.sitting ? null : GameState.isActive('unterwegs', 'platform') ? 'Esperar aquí · Gleis 2' : 'Sentarse'),
        action: () => this.waitAt(2),
      },
    );
    // puertas del tren
    for (let k = 0; k < 4; k++) {
      const dx = STOP_X + 1.03 + 2 * k;
      this.interactables.push({
        x: dx,
        y: 1.4,
        radius: 0.9,
        label: () => (this.doorsOpen && this.canBoard() ? 'Subir al tren (einsteigen)' : null),
        action: () => this.board(),
      });
    }
    this.pois.push({ x: PLAN.x, y: PLAN.y, icon: '🗺️', label: 'Plan' }, { x: MACHINE.x, y: MACHINE.y, icon: '🎟️', label: 'Tickets' }, { x: 8, y: 2.6, icon: '1', label: 'Gleis 1' }, { x: 2.6, y: 7, icon: '2', label: 'Gleis 2' });
  }

  // ───────────── Mecánicas ─────────────

  private useMachine() {
    if (!GameState.isActive('unterwegs', 'ticket')) {
      this.ui.toast({ title: 'Fahrkartenautomat', lines: [GameState.hasItem('fahrkarte') ? 'Ya tienes billete.' : 'Kurzstrecke · Einzelfahrschein AB · ermäßigt · Fahrrad'], tone: 'blue' });
      return;
    }
    const items = TICKETS.map((t) => ({ id: t.id, label: t.label, sub: t.sub, icon: '🎟️' }));
    this.ui.openPicker('Welche Fahrkarte möchten Sie?', '¿Qué billete quiere? (precios orientativos del juego)', items, (id) => {
      const t = TICKETS.find((x) => x.id === id)!;
      this.ui.closePicker();
      if (!t.ok) {
        GameState.bumpStat('wrong');
        this.ui.toast({ title: `${t.label}: no es válido para ti`, lines: [t.feedback], tone: 'red' });
        this.time.delayedCall(1200, () => this.useMachine());
        return;
      }
      if (GameState.data.money < t.price) {
        this.ui.toast({ title: 'No tienes suficiente dinero', lines: [`Cuesta ${t.price.toFixed(2)} €.`], tone: 'red' });
        return;
      }
      GameState.addMoney(-t.price);
      GameState.addItem('fahrkarte');
      const xp = GameState.addXp(t.best ? 15 : 5);
      GameState.learn(['fahrkartenautomat', 'fahrkarte', 'kurzstrecke']);
      GameState.setQuest('platform');
      this.ui.toast({ title: `+${xp} XP · ${t.label} (−${t.price.toFixed(2)} €)`, lines: [t.feedback, 'Ahora busca el andén Richtung Wittenau.'], tone: t.best ? 'acid' : 'gold' });
    });
  }

  private waitAt(gleis: 1 | 2) {
    const b = gleis === 1 ? BENCH1 : BENCH2;
    if (GameState.isActive('unterwegs', 'platform') && gleis === 2) {
      GameState.bumpStat('wrong');
      this.ui.toast({ title: 'Andén equivocado', lines: ['Gleis 2 va Richtung Hermannstraße (al sur). Alexanderplatz está Richtung Wittenau: Gleis 1.'], tone: 'red' });
      return;
    }
    this.sitPlayer(b.seat, gleis === 1 ? 'NE' : 'NW', b.at);
    if (GameState.isActive('unterwegs', 'platform')) {
      GameState.setQuest('wait');
      GameState.learn(['gleis', 'minute']);
      // el indicador cuenta los minutos y el tren entra
      this.drawDisplay('U8 WITTENAU', '2 MIN');
      this.time.delayedCall(2500, () => this.drawDisplay('U8 WITTENAU', '1 MIN'));
      this.time.delayedCall(5000, () => {
        speakDe('Zug nach Wittenau fährt ein.');
        this.trainArrives(0);
      });
    }
  }

  private canBoard() {
    return GameState.isActive('unterwegs', 'board') || GameState.isDone('unterwegs');
  }

  private board() {
    if (!this.doorsOpen || !this.canBoard()) return;
    GameState.learn(['einsteigen']);
    this.goTo('Train', { from: 'UBahn' });
  }

  private objective(): Pt | null {
    const q = GameState.data.quest;
    if (q.id !== 'unterwegs') return q.id === 'none' ? null : DOOR;
    switch (q.step) {
      case 'map':
        return PLAN;
      case 'ticket':
        return MACHINE;
      case 'platform':
        return BENCH1.at;
      case 'wait':
        return null;
      case 'board':
        return { x: STOP_X + 3.03, y: 1.4 };
      default:
        return null;
    }
  }
}

