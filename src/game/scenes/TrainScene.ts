import Phaser from 'phaser';
import { plain } from '../art/furni';
import { pixelText, textWidth } from '../art/font';
import { makeCanvas, rect, shearFace, type Ctx } from '../art/pixel';
import { U8_STOPS } from '../data/unterwegs';
import { HALF_W, toScreen } from '../iso';
import { GameState, speakDe } from '../state/GameState';
import { Actor } from '../world/Actor';
import type { Pt } from '../world/Collision';
import { StaticBrain } from '../world/Npc';
import { InteriorScene } from './InteriorScene';

// Interior del vagón de la U8. El trayecto pasa por 3 estaciones; solo se puede bajar con el tren parado.

const W = 12;
const H = 5;
const WALL_H = 130;
const DOORS: Pt[] = [
  { x: 2.5, y: 0.75 },
  { x: 9.5, y: 0.75 },
];
const BAND = { v: 30, h: 44 }; // franja de ventanas en la pared del fondo
const STATION_SIGNS = ['MORITZPLATZ', 'HEINRICH-HEINE-STR.', 'JANNOWITZBRÜCKE', 'ALEXANDERPLATZ'];

export class TrainScene extends InteriorScene {
  readonly displayName = 'U8 Richtung Wittenau';
  private stopIdx = 0;
  private stopped = false;
  private view!: Phaser.Textures.CanvasTexture;
  private info!: Phaser.Textures.CanvasTexture;
  private tunnelOffset = 0;

  constructor() {
    super('Train');
  }

  create(data?: { x?: number; y?: number; from?: string }) {
    this.stopIdx = 0;
    this.stopped = false;
    this.buildRoom({
      key: 'train',
      w: W,
      h: H,
      wallH: WALL_H,
      door: { x: 6, y: H - 0.4 },
      background: '#05070d',
      wallTop: '#d8dde8',
      edge: '#9aa4b8',
      floor: () => 'lino',
      back: (ctx, w, h) => this.paintBack(ctx, w, h),
      side: (ctx, w, h) => this.paintSide(ctx, w, h),
    });
    this.buildInterior();
    // en el vagón no hay «salida» por el borde frontal: se baja por las puertas del fondo
    this.spawnPlayer(data, ['UBahn']);
    this.player.setPos(6, 2.6);

    if (GameState.isActive('unterwegs', 'board')) GameState.setQuest('ride');
    this.drawView();
    this.drawInfo();
    this.depart();
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        if (this.stopped) return;
        this.tunnelOffset = (this.tunnelOffset + 18) % 120;
        this.drawView();
      },
    });
    this.objectivePoi = () => (this.stopped && this.stopIdx === U8_STOPS.length - 1 ? DOORS[0] : null);
  }

  // ───────────── Arte ─────────────

  private paintBack(ctx: Ctx, w: number, h: number) {
    rect(ctx, 0, 0, w, h, '#e6e1d6');
    rect(ctx, 0, h - 34, w, 34, '#c9b89e');
    rect(ctx, 0, 0, w, 10, '#9aa4b8');
    // puertas (amarillas, con ventanas)
    for (const d of DOORS) {
      const u = Math.round(d.x * HALF_W) - 24;
      rect(ctx, u, 18, 48, h - 18, '#f5c400');
      rect(ctx, u + 23, 18, 2, h - 18, '#3a3346');
      rect(ctx, u + 5, 26, 14, 40, '#2a3a6a');
      rect(ctx, u + 29, 26, 14, 40, '#2a3a6a');
    }
  }

  private paintSide(ctx: Ctx, w: number, h: number) {
    rect(ctx, 0, 0, w, h, '#e6e1d6');
    rect(ctx, 0, h - 34, w, 34, '#c9b89e');
    rect(ctx, 0, 0, w, 10, '#9aa4b8');
    // plano de la línea en el vagón
    rect(ctx, 30, 30, 100, 34, '#ffffff');
    rect(ctx, 34, 46, 92, 3, '#1f4fd1');
    for (let i = 0; i < 4; i++) rect(ctx, 38 + i * 28, 44, 6, 7, i === 3 ? '#e8333a' : '#ffffff');
    pixelText(ctx, 'U8', 36, 34, '#1f4fd1');
  }

  private buildInterior() {
    // asientos a lo largo de la pared del fondo, entre las puertas
    this.addBox('train_seats', 4, 0.4, 4, 1, 22, { front: plain('#3b5bdb'), side: plain('#2a46b0'), top: '#5a7ae0', edge: '#7a96f0' });
    this.addBox('train_seats_side', 0.4, 2, 1, 2, 22, { front: plain('#3b5bdb'), side: plain('#2a46b0'), top: '#5a7ae0', edge: '#7a96f0' });
    // barras verticales
    if (!this.textures.exists('pole')) {
      const c = makeCanvas(8, 130);
      rect(c.ctx, 3, 0, 3, 130, '#c9cfdc');
      rect(c.ctx, 3, 0, 1, 130, '#ffffff');
      this.textures.addCanvas('pole', c.canvas);
    }
    for (const x of [3.5, 8.5]) this.placeProp('pole', x, 2.6, { block: 0.2 });

    // franja de ventanas (se redibuja: túnel en marcha / andén parado)
    const backW = W * HALF_W;
    this.view = (this.textures.exists('train_view') ? this.textures.get('train_view') : this.textures.createCanvas('train_view', backW, backW / 2 + BAND.h)) as Phaser.Textures.CanvasTexture;
    this.add.image(0, -WALL_H + BAND.v, 'train_view').setOrigin(0, 0).setDepth(-59000);

    // pantalla de información colgada
    this.info = (this.textures.exists('train_info') ? this.textures.get('train_info') : this.textures.createCanvas('train_info', 180, 40)) as Phaser.Textures.CanvasTexture;
    const s = toScreen(6, 2.2);
    this.add.image(s.x, s.y - 150, 'train_info').setOrigin(0.5, 1).setDepth(1e5);

    // viajeros
    const a = this.addActor(new Actor(this, 'guest1', 'Fahrgast', 5, 1.55));
    a.sit('SE');
    const b = this.addActor(new Actor(this, 'citizen2', 'Fahrgast', 7, 1.55));
    b.sit('SW');
    const c = this.addActor(new Actor(this, 'guest3', 'Fahrgast', 9.5, 3.4));
    this.brains.push(new StaticBrain(this, c, 'NW', ['Moin!', '¡Buenas!']));

    // puertas para bajar
    for (const d of DOORS)
      this.interactables.push({
        x: d.x,
        y: d.y + 0.5,
        radius: 1.2,
        label: () => (this.stopped ? `Bajar (aussteigen) · ${STATION_SIGNS[this.stopIdx]}` : null),
        action: () => this.exit(),
      });
  }

  private drawView() {
    const backW = W * HALF_W;
    const flat = makeCanvas(backW, BAND.h);
    const f = flat.ctx;
    if (this.stopped) {
      rect(f, 0, 0, backW, BAND.h, '#6fb8aa');
      for (let x = 0; x < backW; x += 12) rect(f, x, 0, 11, BAND.h, '#7fc8ba');
      const name = STATION_SIGNS[this.stopIdx];
      for (const u of [70, 230]) {
        const tw = textWidth(name, 2);
        rect(f, u - 6, 10, tw + 12, 20, '#ffffff');
        rect(f, u - 4, 12, tw + 8, 16, '#22356b');
        pixelText(f, name, u, 15, '#ffffff', 2);
      }
    } else {
      rect(f, 0, 0, backW, BAND.h, '#141826');
      for (let x = -120 + this.tunnelOffset; x < backW; x += 120) {
        rect(f, x, 18, 40, 3, '#ffd77a');
        rect(f, x + 70, 30, 24, 2, '#5a6278');
      }
    }
    // marcos de ventana (huecos solo donde no hay puertas)
    for (const d of DOORS) {
      const u = Math.round(d.x * HALF_W) - 24;
      rect(f, u - 2, 0, 52, BAND.h, '#f5c400');
      rect(f, u + 5, 0, 14, BAND.h, this.stopped ? '#6fb8aa' : '#141826');
      rect(f, u + 29, 0, 14, BAND.h, this.stopped ? '#6fb8aa' : '#141826');
      rect(f, u + 23, 0, 2, BAND.h, '#3a3346');
    }
    for (let x = 0; x < backW; x += 64) rect(f, x, 0, 4, BAND.h, '#e6e1d6');
    const ctx = this.view.getContext();
    ctx.clearRect(0, 0, this.view.width, this.view.height);
    shearFace(ctx, flat.canvas, 0, 0, 'right');
    this.view.refresh();
  }

  private drawInfo(text?: string) {
    const ctx = this.info.getContext();
    ctx.imageSmoothingEnabled = false;
    rect(ctx, 0, 0, 180, 40, '#2a2238');
    rect(ctx, 2, 2, 176, 36, '#0a0e18');
    const next = U8_STOPS[Math.min(this.stopIdx + 1, U8_STOPS.length - 1)];
    pixelText(ctx, this.stopped ? 'HALT' : 'NÄCHSTER HALT', 6, 6, '#ffb000', 2);
    pixelText(ctx, (text ?? (this.stopped ? STATION_SIGNS[this.stopIdx] : STATION_SIGNS[this.stopIdx + 1] ?? next)).slice(0, 21), 6, 22, '#ffd77a', 2);
    this.info.refresh();
  }

  // ───────────── Trayecto ─────────────

  private announce(de: string, es: string) {
    speakDe(de);
    this.ui.toast({ title: `🔊  ${de}`, lines: [es], tone: 'gold' });
  }

  private depart() {
    this.stopped = false;
    this.drawView();
    this.drawInfo();
    this.cameras.main.shake(400, 0.0015);
    const next = U8_STOPS[this.stopIdx + 1];
    this.time.delayedCall(1500, () => {
      this.announce(`Nächster Halt: ${next}.`, `Próxima parada: ${next}.`);
      GameState.learn(['naechster_halt']);
    });
    this.time.delayedCall(6000, () => this.arrive());
  }

  private arrive() {
    this.stopIdx++;
    this.stopped = true;
    this.drawView();
    this.drawInfo();
    this.cameras.main.shake(300, 0.002);
    const name = U8_STOPS[this.stopIdx];
    const last = this.stopIdx === U8_STOPS.length - 1;
    if (last) {
      this.announce(`${name}. Übergang zur U2, U5 und zur S-Bahn.`, `${name}. Correspondencia con U2, U5 y S-Bahn.`);
      if (GameState.isActive('unterwegs', 'ride')) this.time.delayedCall(1200, () => this.ui.toast({ title: '¡Es tu parada!', lines: ['Bájate por una de las puertas (E).'], tone: 'acid' }));
      return; // en la última estación las puertas se quedan abiertas
    }
    this.announce(`${name}.`, `${name}.`);
    this.time.delayedCall(4500, () => {
      this.announce('Zurückbleiben, bitte!', '¡Apártense de las puertas, por favor!');
      GameState.learn(['zurueckbleiben']);
      this.time.delayedCall(1200, () => this.depart());
    });
  }

  private exit() {
    if (!this.stopped) return;
    const last = this.stopIdx === U8_STOPS.length - 1;
    if (!last) {
      GameState.bumpStat('wrong');
      this.ui.toast({
        title: `Esto es ${U8_STOPS[this.stopIdx]}`,
        lines: [`Todavía no: tu parada es Alexanderplatz (${U8_STOPS.length - 1 - this.stopIdx} más).`],
        tone: 'red',
      });
      return;
    }
    GameState.learn(['aussteigen']);
    GameState.removeItem('fahrkarte');
    this.goTo('Alex', { from: 'Train' });
  }
}
