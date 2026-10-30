import { flatTop, isoBox, type Light } from '../art/buildings';
import { pixelText, textWidth } from '../art/font';
import { PAL } from '../art/palette';
import { makeCanvas, rect, shearFace } from '../art/pixel';
import { anmeldeFormular, DOC_REQUESTS } from '../data/quests';
import { ITEMS } from '../../data/items';
import { depthOf, HALF_H, HALF_W, toScreen } from '../iso';
import { GameState, speakDe } from '../state/GameState';
import { Actor } from '../world/Actor';
import type { Pt } from '../world/Collision';
import { StaticBrain, type Brain } from '../world/Npc';
import { WorldScene } from './WorldScene';

// Interior del Bürgeramt (Misión 02): recepción, sala de espera con turnos, formularios y tres puestos.

const ROOM_W = 14;
const ROOM_H = 11;
const WALL_H = 150;
const DOOR: Pt = { x: 7, y: 10.4 };
const PLAYER_NUMBER = 127;
const NUM_WORD = ['eins', 'zwei', 'drei'];

const RECEPTION = { x0: 9.5, y0: 7, wx: 2 };
const DESKS: { key: string; name: string; x0: number }[] = [
  { key: 'becker', name: 'Herr Becker', x0: 1.5 },
  { key: 'schmidt', name: 'Frau Schmidt', x0: 5.5 },
  { key: 'yilmaz', name: 'Frau Yilmaz', x0: 9.5 },
];
const DESK_Y0 = 1.6;
const SEAT_ROWS = [5.4, 6.7];
const SEAT_XS = [2, 3, 4, 5, 6];
const SEATS: { p: Pt; stand: Pt }[] = SEAT_ROWS.flatMap((y) => SEAT_XS.map((x) => ({ p: { x, y }, stand: { x, y: y + 0.65 } })));
const RACK: Pt = { x: 1.0, y: 8.7 };
const PULT: Pt = { x: 3.0, y: 9.0 };
const CITIZEN_KEYS = ['citizen1', 'citizen2', 'guest1', 'guest3', 'guest4', 'guest2'];

interface Citizen {
  actor: Actor;
  num: number;
  state: 'arrive' | 'seated' | 'called' | 'desk' | 'leave';
  seat: number;
  desk: number;
}

const CITIZEN_LINES: [string, string][] = [
  ['Ich möchte mich ummelden.', 'Quiero cambiar mi domicilio.'],
  ['Ich brauche einen neuen Personalausweis.', 'Necesito un DNI nuevo.'],
  ['Ich habe meinen Pass verloren…', 'He perdido mi pasaporte…'],
  ['Ich möchte mich abmelden.', 'Quiero darme de baja.'],
];

export class AmtScene extends WorldScene {
  readonly displayName = 'Bürgeramt Kreuzberg';
  private brains: Brain[] = [];
  private officials: Actor[] = [];
  private receptionist!: Actor;
  private citizens: Citizen[] = [];
  private seats: (Citizen | 'player' | null)[] = [];
  private deskBusy: (Citizen | 'player' | null)[] = [];
  private calls: { num: number; desk: number }[] = [];
  private nextNum = 128;
  private callTimer = 4;
  private spawnTimer = 10;
  private playerSitTime = 0;
  private board!: Phaser.Textures.CanvasTexture;
  private boardImg!: Phaser.GameObjects.Image;

  constructor() {
    super('Amt');
  }

  create(data?: { x?: number; y?: number; from?: string }) {
    this.initWorld({ x0: 0.35, y0: 0.35, x1: ROOM_W - 0.35, y1: ROOM_H - 0.3 });
    this.brains = [];
    this.officials = [];
    this.citizens = [];
    this.seats = SEATS.map(() => null);
    this.deskBusy = DESKS.map(() => null);
    this.calls = [
      { num: 121, desk: 1 },
      { num: 122, desk: 2 },
    ];
    this.nextNum = 128;
    this.callTimer = 4;
    this.spawnTimer = 10;
    this.playerSitTime = 0;
    this.cameras.main.setBackgroundColor('#0d1220');

    this.paintGround(ROOM_W, ROOM_H, (x, y) => (x >= 1 && x <= 6 && y >= 5 && y <= 6 ? 'carpetBlue' : 'lino'), 'ground_amt');
    this.buildWalls();
    this.buildFurniture();
    this.buildBoard();

    const start = this.safeStart(data?.x !== undefined && data.from !== 'Street' ? { x: data.x, y: data.y! } : null, { x: DOOR.x, y: DOOR.y - 0.4 });
    this.player = this.addActor(new Actor(this, 'player', GameState.data.name, start.x, start.y));
    this.player.facing = 'NW';
    this.setupCamera(this.player);
    const tl = toScreen(0, ROOM_H);
    const br = toScreen(ROOM_W, 0);
    this.cameras.main.setBounds(tl.x - 400, -WALL_H - 300, br.x - tl.x + 800, toScreen(ROOM_W, ROOM_H).y + WALL_H + 600);

    this.spawnStaff();
    // ciudadanos que ya esperan
    [0, 2, 6, 8].forEach((seat, i) => this.addCitizen(CITIZEN_KEYS[i], 123 + i, seat));

    // si el jugador ya fue llamado (volvió a entrar a mitad de misión), reservar su puesto
    const q = GameState.data.quest;
    if (GameState.isActive('anmeldung', 'desk', 'docs', 'questions', 'sign') && q.desk) {
      this.deskBusy[q.desk - 1] = 'player';
      this.calls.push({ num: PLAYER_NUMBER, desk: q.desk });
    }
    this.drawBoard();

    if (GameState.isActive('anmeldung', 'go_amt')) GameState.setQuest('ticket');

    this.interactables.push({ x: DOOR.x, y: DOOR.y, radius: 1.1, label: () => 'Salir a la calle', action: () => this.goTo('Street', { from: 'Amt' }) });
    this.pois.push(
      { x: RECEPTION.x0 + 1, y: RECEPTION.y0 + 1.6, icon: '🛎️', label: 'Empfang' },
      { x: RACK.x + 0.6, y: RACK.y, icon: '📝', label: 'Formulare' },
      { x: 4, y: 6, icon: '🪑', label: 'Wartebereich' },
      { x: DOOR.x, y: DOOR.y, icon: '🚪', label: 'Ausgang' },
    );
    this.minimap.push(
      { rect: { x0: 0, y0: 0, x1: ROOM_W, y1: ROOM_H }, color: 0xccd4dc },
      { rect: { x0: 1, y0: 5, x1: 7, y1: 7 }, color: 0x3b5a94 },
      ...DESKS.map((d) => ({ rect: { x0: d.x0, y0: DESK_Y0, x1: d.x0 + 2, y1: DESK_Y0 + 1 }, color: 0xcf9461 })),
      { rect: { x0: RECEPTION.x0, y0: RECEPTION.y0, x1: RECEPTION.x0 + 2, y1: RECEPTION.y0 + 1 }, color: 0x3b5bdb },
    );
    this.objectivePoi = () => this.objective();
    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.savePosition() });
    this.events.once('shutdown', () => this.savePosition());
  }

  private objective(): Pt | null {
    const q = GameState.data.quest;
    if (q.id !== 'anmeldung') return q.id === 'none' ? null : DOOR;
    switch (q.step) {
      case 'get_wgb':
        return DOOR; // falta el documento de la casera
      case 'ticket':
        return { x: RECEPTION.x0 + 1, y: RECEPTION.y0 + 1.6 };
      case 'form':
        return GameState.hasItem('formular_leer') ? { x: PULT.x, y: PULT.y + 0.6 } : { x: RACK.x + 0.7, y: RACK.y + 0.2 };
      case 'wait': {
        if (this.player.sitting) return null;
        const i = this.seats.findIndex((s) => s === null);
        return i >= 0 ? SEATS[i].p : null;
      }
      default:
        return q.desk ? this.deskSpot(q.desk - 1) : null;
    }
  }

  private deskSpot(i: number): Pt {
    return { x: DESKS[i].x0 + 1, y: DESK_Y0 + 1.6 };
  }

  // ───────────── Arte ─────────────

  private buildWalls() {
    const backW = ROOM_W * HALF_W;
    const sideW = ROOM_H * HALF_W;
    const backLights: Light[] = [];

    const back = makeCanvas(backW, WALL_H);
    const b = back.ctx;
    rect(b, 0, 0, backW, WALL_H, '#dfe7e2');
    rect(b, 0, 0, backW, 6, '#9fb3c8');
    rect(b, 0, WALL_H - 44, backW, 44, '#9fb3c8');
    rect(b, 0, WALL_H - 46, backW, 3, '#ffffff');
    rect(b, 0, WALL_H - 6, backW, 6, '#7a8ea6');
    // ventanas con luz de día entre los puestos
    for (const u of [16, 144, 272, 400]) {
      rect(b, u, 22, 34, 64, '#ffffff');
      rect(b, u + 3, 25, 28, 58, '#a8d4ff');
      rect(b, u + 3, 25, 28, 18, '#d8ecff');
      rect(b, u + 16, 25, 2, 58, '#ffffff');
      backLights.push({ x: u + 17, y: 54, color: '#d8ecff', r: 40, alpha: 0.25 });
    }
    // placas de número sobre cada puesto
    DESKS.forEach((d, i) => {
      const u = Math.round((d.x0 + 1) * HALF_W) - 26;
      rect(b, u, 30, 52, 44, '#22356b');
      rect(b, u, 30, 52, 3, '#4a6ab8');
      pixelText(b, 'PLATZ', u + 8, 36, '#ffd77a');
      pixelText(b, String(i + 1), u + 20, 46, '#ffffff', 5);
    });
    // reloj
    const cx = 116;
    for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) if (x * x + y * y <= 121) rect(b, cx + x, 40 + y, 1, 1, x * x + y * y > 90 ? '#2a2238' : '#ffffff');
    rect(b, cx, 32, 1, 8, '#2a2238');
    rect(b, cx, 40, 6, 1, '#2a2238');

    const side = makeCanvas(sideW, WALL_H);
    const s = side.ctx;
    rect(s, 0, 0, sideW, WALL_H, '#ece4d4');
    rect(s, 0, 0, sideW, 6, '#c9b98f');
    rect(s, 0, WALL_H - 44, sideW, 44, '#c9b98f');
    rect(s, 0, WALL_H - 46, sideW, 3, '#ffffff');
    // letrero institucional
    const title = 'BÜRGERAMT KREUZBERG';
    rect(s, 60, 20, textWidth(title, 2) + 20, 26, '#22356b');
    rect(s, 60, 20, textWidth(title, 2) + 20, 3, '#4a6ab8');
    pixelText(s, title, 70, 28, '#ffffff', 2);
    // carteles
    rect(s, 40, 64, 96, 40, '#ffe9a8');
    rect(s, 40, 64, 96, 4, '#e8c060');
    pixelText(s, 'BITTE', 50, 74, '#2a2238', 2);
    pixelText(s, 'NUMMER ZIEHEN', 50, 88, '#c8283c', 1);
    rect(s, 160, 64, 70, 46, '#ffffff');
    rect(s, 160, 64, 70, 4, '#5fa8ff');
    pixelText(s, 'ANMELDUNG', 166, 74, '#22356b');
    for (let l = 0; l < 4; l++) rect(s, 166, 84 + l * 5, 50 - l * 6, 2, '#9aa4b8');
    // tablón de anuncios
    rect(s, 250, 56, 80, 52, '#c48a58');
    for (const [x, y, c] of [[256, 62, '#ffffff'], [280, 66, '#ffe9a8'], [304, 60, '#d8ecff'], [262, 84, '#ffd0d8'], [296, 86, '#ffffff']] as [number, number, string][]) {
      rect(s, x, y, 20, 16, c);
      rect(s, x + 8, y, 3, 3, '#c8283c');
    }

    const { canvas, ctx } = makeCanvas(backW + sideW, WALL_H + ROOM_W * HALF_H + 2);
    shearFace(ctx, back.canvas, sideW, 0, 'right');
    shearFace(ctx, side.canvas, sideW, 0, 'left');
    rect(ctx, sideW - 1, 0, 2, WALL_H, '#7a8ea6');
    for (let u = 0; u < backW; u++) rect(ctx, sideW + u, Math.floor(u / 2) - 1, 1, 3, '#ffffff');
    for (let u = 0; u < sideW; u++) rect(ctx, sideW - u - 1, Math.floor(u / 2) - 1, 1, 3, '#f2ece4');
    if (!this.textures.exists('amt_walls')) this.textures.addCanvas('amt_walls', canvas);
    this.add.image(-sideW, -WALL_H, 'amt_walls').setOrigin(0, 0).setDepth(-60000);
    for (const l of backLights) this.addGlow(l.x, Math.floor(l.x / 2) - WALL_H + l.y, l.color, l.r, l.alpha ?? 0.3, -59000);

    // borde frontal recortado con hueco de puerta
    const edgeC = makeCanvas((ROOM_W + ROOM_H) * HALF_W, (ROOM_W + ROOM_H) * HALF_H + 12);
    const e = edgeC.ctx;
    for (let u = 0; u < ROOM_W * HALF_W; u++) {
      if (Math.abs(u / HALF_W - DOOR.x) < 0.9) continue;
      rect(e, u, ROOM_H * HALF_H + Math.floor(u / 2), 1, 8, '#7a8ea6');
      rect(e, u, ROOM_H * HALF_H + Math.floor(u / 2), 1, 2, '#ffffff');
    }
    for (let u = 0; u < ROOM_H * HALF_W; u++) {
      rect(e, sideW + ROOM_W * HALF_W - u - 1, ROOM_W * HALF_H + Math.floor(u / 2), 1, 8, '#6a7e96');
      rect(e, sideW + ROOM_W * HALF_W - u - 1, ROOM_W * HALF_H + Math.floor(u / 2), 1, 2, '#f2ece4');
    }
    if (!this.textures.exists('amt_edge')) this.textures.addCanvas('amt_edge', edgeC.canvas);
    this.add.image(toScreen(0, ROOM_H).x, 0, 'amt_edge').setOrigin(0, 0).setDepth(-90000);
    const d = toScreen(DOOR.x, ROOM_H);
    this.addGlow(d.x, d.y, '#ffe9b8', 60, 0.35, -90000);
  }

  /** Caja isométrica troceada en segmentos de 1 baldosa (orden de profundidad correcto). */
  private addSegmentedBox(key: string, x0: number, y0: number, wx: number, H: number, front: HTMLCanvasElement, side: HTMLCanvasElement, top: string, edge: string) {
    for (let i = 0; i < wx; i++) {
      const seg = makeCanvas(HALF_W, H);
      seg.ctx.drawImage(front, i * HALF_W, 0, HALF_W, H, 0, 0, HALF_W, H);
      const art = isoBox(1, 1, H, { canvas: seg.canvas }, i === wx - 1 ? { canvas: side } : null, flatTop(top, edge));
      const k = `${key}_${i}`;
      if (!this.textures.exists(k)) this.textures.addCanvas(k, art.canvas);
      const s = toScreen(x0 + i, y0);
      this.add.image(s.x - art.anchorX, s.y - art.anchorY, k).setOrigin(0, 0).setDepth(depthOf(x0 + i + 0.5, y0 + 0.9));
    }
    this.collision.add(x0, y0, x0 + wx, y0 + 1);
  }

  private buildFurniture() {
    // puestos de atención
    DESKS.forEach((d, i) => {
      const H = 30;
      const f = makeCanvas(2 * HALF_W, H);
      rect(f.ctx, 0, 0, 2 * HALF_W, H, '#cf9461');
      rect(f.ctx, 0, 0, 2 * HALF_W, 4, '#e6b07a');
      rect(f.ctx, 0, 4, 2 * HALF_W, 2, PAL.woodDark);
      rect(f.ctx, 14, 9, 36, 16, '#22356b');
      pixelText(f.ctx, `PLATZ ${i + 1}`, 17, 14, '#ffffff');
      const sd = makeCanvas(HALF_W, H);
      rect(sd.ctx, 0, 0, HALF_W, H, '#a87448');
      rect(sd.ctx, 0, 0, HALF_W, 4, '#e6b07a');
      this.addSegmentedBox(`amt_desk${i}`, d.x0, DESK_Y0, 2, H, f.canvas, sd.canvas, '#e6c9a0', '#f2dcb8');
      const m = toScreen(d.x0 + 1.4, DESK_Y0 + 0.4);
      this.add.image(m.x, m.y - H + 8, 'monitor').setOrigin(0.5, 1).setDepth(depthOf(d.x0 + 1.5, DESK_Y0 + 0.95) + 1);
    });

    // recepción
    const RH = 40;
    const rf = makeCanvas(2 * HALF_W, RH);
    rect(rf.ctx, 0, 0, 2 * HALF_W, RH, '#3b5bdb');
    rect(rf.ctx, 0, 0, 2 * HALF_W, 5, '#ffffff');
    rect(rf.ctx, 6, 12, 52, 14, '#ffffff');
    pixelText(rf.ctx, 'EMPFANG', 32 - textWidth('EMPFANG') / 2, 17, '#22356b');
    const rs = makeCanvas(HALF_W, RH);
    rect(rs.ctx, 0, 0, HALF_W, RH, '#2a46b0');
    rect(rs.ctx, 0, 0, HALF_W, 5, '#ffffff');
    this.addSegmentedBox('amt_reception', RECEPTION.x0, RECEPTION.y0, RECEPTION.wx, RH, rf.canvas, rs.canvas, '#e6e9f0', '#ffffff');

    // sala de espera: asientos con respaldo delante (lado de la cámara)
    for (const st of SEATS) {
      this.placeProp('amt_seat', st.p.x, st.p.y);
      this.placeProp('amt_seat_back', st.p.x - 0.05, st.p.y + 0.32);
    }
    for (const y of SEAT_ROWS) this.collision.add(SEAT_XS[0] - 0.4, y - 0.25, SEAT_XS[SEAT_XS.length - 1] + 0.4, y + 0.3);

    // formularios y atril
    this.placeProp('form_rack', RACK.x, RACK.y, { block: 0.6 });
    this.placeProp('pult', PULT.x, PULT.y, { block: 0.6 });
    this.interactables.push(
      {
        x: RACK.x + 0.7,
        y: RACK.y + 0.2,
        radius: 1.1,
        label: () => (GameState.isActive('anmeldung', 'form') && !GameState.hasItem('formular_leer') && !GameState.hasItem('anmeldeformular') ? 'Coger un formulario' : null),
        action: () => {
          GameState.addItem('formular_leer');
          const fresh = GameState.learn(['formular', 'ausfuellen']);
          this.ui.toast({ title: 'Has cogido: das Anmeldeformular', lines: ['Rellénalo en el atril de al lado.', ...fresh.map((id) => GameState.vocabText(id))], tone: 'blue' });
        },
      },
      {
        x: PULT.x,
        y: PULT.y + 0.6,
        radius: 1.1,
        label: () => (GameState.hasItem('formular_leer') ? 'Rellenar el formulario' : GameState.isActive('anmeldung', 'form') ? 'Atril (primero coge un formulario)' : null),
        action: () => {
          if (!GameState.hasItem('formular_leer')) {
            this.ui.toast({ title: 'Necesitas un formulario', lines: ['Cógelo del expositor «FORM», a la izquierda.'], tone: 'gold' });
            return;
          }
          this.player.face({ x: PULT.x, y: PULT.y });
          this.ui.openForm(anmeldeFormular(GameState.data.name), () => {
            GameState.removeItem('formular_leer');
            GameState.addItem('anmeldeformular');
            const xp = GameState.addXp(15);
            GameState.setQuest('wait');
            this.ui.toast({ title: `+${xp} XP · Formular ausgefüllt!`, lines: ['Ahora siéntate en la sala de espera y mira la pantalla.'], tone: 'acid' });
          });
        },
      },
    );

    // asientos: el jugador puede sentarse en cualquiera libre
    SEATS.forEach((st, i) =>
      this.interactables.push({
        x: st.p.x,
        y: st.p.y,
        radius: 0.85,
        label: () => (!this.player.sitting && this.seats[i] === null ? 'Sentarse' : null),
        action: () => {
          this.seats[i] = 'player';
          this.sitPlayer(st.p, 'NE', st.stand);
        },
      }),
    );

    // decoración
    this.placeProp('cooler', 13.2, 4.0, { block: 0.5 });
    this.placeProp('plant0', 13.2, 9.8, { block: 0.5 });
    this.placeProp('plant1', 0.7, 4.3, { block: 0.5 });
    this.placeProp('plant0', 8.3, 4.0, { block: 0.5 });
    // lámparas de techo
    for (const [x, y] of [
      [3.5, 3],
      [10.5, 3],
      [4, 7.5],
      [10, 9],
    ]) {
      const s = toScreen(x, y);
      this.addGlow(s.x, s.y, '#fff4d8', 120, 0.18, -90000);
    }
  }

  // ───────────── Pantalla de turnos ─────────────

  private buildBoard() {
    const key = 'amt_board';
    this.board = (this.textures.exists(key) ? this.textures.get(key) : this.textures.createCanvas(key, 132, 92)) as Phaser.Textures.CanvasTexture;
    // colgada sobre la sala de espera: se lee desde los asientos sin que la tape el HUD
    const s = toScreen(4.2, 4.3);
    const chain = this.add.graphics().setDepth(3e5 - 1);
    chain.lineStyle(2, 0x5a5266, 1).lineBetween(s.x - 40, s.y - 260, s.x - 40, s.y - 214).lineBetween(s.x + 40, s.y - 260, s.x + 40, s.y - 214);
    // por encima de la flecha de objetivo para que el número siempre se lea
    this.boardImg = this.add.image(s.x, s.y - 214, key).setOrigin(0.5, 0).setDepth(3e5);
    this.addGlow(s.x, s.y - 170, '#6dffa8', 60, 0.18, 1e5 + 2);
  }

  private drawBoard() {
    const ctx = this.board.getContext();
    ctx.imageSmoothingEnabled = false;
    rect(ctx, 0, 0, 132, 92, '#2a2238');
    rect(ctx, 3, 3, 126, 86, '#121826');
    pixelText(ctx, 'AUFRUF', 6, 8, '#ffd77a', 2);
    rect(ctx, 6, 22, 120, 1, '#3a4258');
    const last = this.calls.slice(-3).reverse();
    last.forEach((c, i) => {
      const col = i === 0 ? '#6dffa8' : '#8a96b0';
      pixelText(ctx, `B${c.num}`, 6, 30 + i * 20, col, 2);
      pixelText(ctx, `PLATZ ${c.desk}`, 66, 30 + i * 20, col, 2);
    });
    this.board.refresh();
  }

  // ───────────── Personal y ciudadanos ─────────────

  private spawnStaff() {
    this.receptionist = this.addActor(new Actor(this, 'empfang', 'Frau Lange', RECEPTION.x0 + 1, RECEPTION.y0 - 0.55));
    this.brains.push(new StaticBrain(this, this.receptionist, 'SW', ['Guten Morgen!', '¡Buenos días!']));
    this.interactables.push({
      x: RECEPTION.x0 + 1,
      y: RECEPTION.y0 + 1.6,
      radius: 1.3,
      label: () => 'Hablar con la recepción',
      action: () => this.talkReception(),
    });

    DESKS.forEach((d, i) => {
      const a = this.addActor(new Actor(this, d.key, d.name, d.x0 + 1, DESK_Y0 - 0.55));
      a.sit('SW');
      this.officials.push(a);
      this.brains.push(new StaticBrain(this, a, 'SW'));
      const spot = this.deskSpot(i);
      this.interactables.push({
        x: spot.x,
        y: spot.y,
        radius: 1.2,
        label: () => this.deskLabel(i),
        action: () => this.talkDesk(i),
      });
    });
  }

  private addCitizen(key: string, num: number, seat: number, arriving = false) {
    const a = this.addActor(new Actor(this, key, 'Bürger', arriving ? DOOR.x : SEATS[seat].p.x, arriving ? ROOM_H - 0.4 : SEATS[seat].p.y));
    a.speed = 1.6;
    const c: Citizen = { actor: a, num, state: arriving ? 'arrive' : 'seated', seat, desk: -1 };
    this.seats[seat] = c;
    this.citizens.push(c);
    if (!arriving) a.sit('NE');
    else {
      // pasa por recepción y luego se sienta
      const rec = { x: RECEPTION.x0 + 1 + (Math.random() - 0.5), y: RECEPTION.y0 + 1.5 };
      a.walkPath(this.collision.findPath(a.pos, rec) ?? [rec], () => {
        a.facing = 'NE';
        a.say('Guten Tag, ich möchte eine Nummer.', 'Buenos días, quiero un número.', 2500);
        this.time.delayedCall(2600, () => {
          const st = SEATS[seat].stand;
          a.walkPath(this.collision.findPath(a.pos, st) ?? [st], () => {
            a.setPos(SEATS[seat].p.x, SEATS[seat].p.y);
            a.sit('NE');
            c.state = 'seated';
          });
        });
      });
    }
    return c;
  }

  private callCitizen(c: Citizen, desk: number) {
    c.state = 'called';
    c.desk = desk;
    this.deskBusy[desk] = c;
    this.seats[c.seat] = null;
    this.calls.push({ num: c.num, desk: desk + 1 });
    this.drawBoard();
    const a = c.actor;
    a.stand();
    a.setPos(SEATS[c.seat].stand.x, SEATS[c.seat].stand.y);
    const spot = this.deskSpot(desk);
    a.walkPath(this.collision.findPath(a.pos, spot) ?? [spot], () => {
      c.state = 'desk';
      a.facing = 'NE';
      const off = this.officials[desk];
      off.say('Guten Tag! Was kann ich für Sie tun?', '¡Buenos días! ¿En qué puedo ayudarle?', 3000);
      const line = CITIZEN_LINES[c.num % CITIZEN_LINES.length];
      this.time.delayedCall(2500, () => a.say(line[0], line[1], 3000));
      this.time.delayedCall(6000, () => off.say('So, fertig. Auf Wiedersehen!', 'Listo. ¡Adiós!', 2500));
      this.time.delayedCall(7500, () => {
        c.state = 'leave';
        this.deskBusy[desk] = null;
        const out = { x: DOOR.x, y: ROOM_H - 0.4 };
        a.walkPath(this.collision.findPath(a.pos, out) ?? [out], () => {
          a.destroy();
          this.actors = this.actors.filter((x) => x !== a);
          this.citizens = this.citizens.filter((x) => x !== c);
        });
      });
    });
  }

  private callPlayer(desk: number) {
    const q = GameState.data.quest;
    q.desk = desk + 1;
    this.deskBusy[desk] = 'player';
    this.calls.push({ num: PLAYER_NUMBER, desk: desk + 1 });
    this.drawBoard();
    this.tweens.add({ targets: this.boardImg, alpha: { from: 1, to: 0.3 }, duration: 250, yoyo: true, repeat: 3 });
    const de = `Die Nummer B ${PLAYER_NUMBER}, bitte zu Platz ${NUM_WORD[desk]}.`;
    speakDe(de);
    this.receptionist.say(de, `El número B-${PLAYER_NUMBER}, al puesto ${desk + 1}, por favor.`, 6000);
    const fresh = GameState.learn(['aufrufen', 'platz', 'bildschirm']);
    this.ui.toast({ title: `📢  ${de}`, lines: ['¡Es tu número! Mira la pantalla y ve al puesto indicado.', ...fresh.map((id) => GameState.vocabText(id))], tone: 'gold' });
    GameState.setQuest('desk');
  }

  // ───────────── Interacciones ─────────────

  private talkReception() {
    this.receptionist.face(this.player.pos);
    if (GameState.isActive('anmeldung', 'get_wgb') || (GameState.isActive('anmeldung', 'ticket') && !GameState.hasItem('wgb'))) {
      this.receptionist.say(
        'Ohne Wohnungsgeberbestätigung geht es leider nicht. Die bekommen Sie von Ihrer Vermieterin.',
        'Sin la confirmación del casero no es posible. Se la da su casera.',
        5000,
      );
      this.ui.toast({ title: 'Te falta un documento', lines: ['Pide a Anna (tu casera) la Wohnungsgeberbestätigung. Está en la calle.'], tone: 'gold' });
      return;
    }
    if (GameState.isActive('anmeldung', 'ticket')) {
      this.ui.openDialog('amt_empfang', this.receptionist, (a) => {
        if (a === 'get_ticket') {
          GameState.addItem('wartenummer');
          GameState.setQuest('form');
        }
      });
      return;
    }
    this.ui.openDialog('amt_empfang_wait', this.receptionist);
  }

  private deskLabel(i: number): string | null {
    const q = GameState.data.quest;
    const mine = q.id === 'anmeldung' && q.desk === i + 1 && ['desk', 'docs', 'questions', 'sign'].includes(q.step);
    if (mine && q.step === 'sign') return `Firmar (unterschreiben) · Platz ${i + 1}`;
    if (mine) return `Hablar con ${DESKS[i].name} · Platz ${i + 1}`;
    return `Platz ${i + 1} · ${DESKS[i].name}`;
  }

  private talkDesk(i: number) {
    const q = GameState.data.quest;
    const off = this.officials[i];
    const key = DESKS[i].key;
    const busy = this.deskBusy[i];
    const mine = q.id === 'anmeldung' && q.desk === i + 1;
    if (busy && busy !== 'player') {
      off.say('Moment, bitte. Ich habe gerade einen Kunden.', 'Un momento, por favor. Estoy atendiendo a alguien.', 3000);
      return;
    }
    if (q.id !== 'anmeldung' || ['get_wgb', 'go_amt', 'ticket', 'form', 'wait'].includes(q.step)) {
      off.say('Bitte warten Sie, bis Ihre Nummer aufgerufen wird.', 'Espere, por favor, a que llamen a su número.', 3500);
      if (GameState.isActive('anmeldung', 'wait')) this.ui.toast({ title: 'Aún no es tu turno', lines: ['Siéntate en la sala de espera (E en un asiento) y mira la pantalla.'], tone: 'gold' });
      return;
    }
    if (!mine) {
      off.say('Nummer B 127? Nicht bei mir. Schauen Sie auf den Bildschirm: Welcher Platz?', '¿Número B-127? No conmigo. Mire la pantalla: ¿qué puesto?', 4500);
      this.ui.toast({ title: 'Puesto equivocado', lines: [`Escucha bien: «Platz ${NUM_WORD[(q.desk ?? 1) - 1]}» = puesto ${q.desk}.`], tone: 'red' });
      return;
    }
    this.player.face({ x: DESKS[i].x0 + 1, y: DESK_Y0 });
    if (q.step === 'desk') {
      this.ui.openDialog('amt_desk', off, (a) => {
        if (a === 'start_docs') {
          GameState.setQuest('docs');
          this.ui.afterDialog(() => this.nextDocument(i));
        }
      }, key);
    } else if (q.step === 'docs') this.nextDocument(i);
    else if (q.step === 'questions') this.askQuestions(i);
    else if (q.step === 'sign') this.sign(i);
  }

  /** Entrega física de documentos: la funcionaria pide uno, el jugador lo elige del inventario. */
  private nextDocument(i: number) {
    const q = GameState.data.quest;
    const idx = q.docs ?? 0;
    const off = this.officials[i];
    if (idx >= DOC_REQUESTS.length) {
      GameState.setQuest('questions');
      this.askQuestions(i);
      return;
    }
    const req = DOC_REQUESTS[idx];
    off.say(req.de, req.es, 8000);
    speakDe(req.de);
    const items = GameState.data.inventory
      .map((id) => ITEMS[id])
      .filter(Boolean)
      .map((it) => ({ id: it.id, label: it.de, sub: it.name, icon: it.emoji }));
    this.ui.openPicker(req.de, req.es, items, (id) => {
      this.ui.closePicker();
      if (id === req.item) {
        q.docs = idx + 1;
        const xp = GameState.addXp(5);
        off.say('Danke schön.', 'Muchas gracias.', 2000);
        this.ui.toast({ title: `+${xp} XP · ${ITEMS[id].de}`, lines: ['Documento correcto.'], tone: 'acid' });
        GameState.learn(id === 'reisepass' ? ['reisepass', 'ausweis'] : id === 'wgb' ? ['wgb'] : ['formular']);
        this.time.delayedCall(900, () => this.nextDocument(i));
      } else {
        GameState.bumpStat('wrong');
        off.say(req.wrong, '', 4000);
        this.ui.toast({ title: `Eso es: ${ITEMS[id]?.de ?? id}`, lines: [`Te ha pedido: ${req.es}`], tone: 'red' });
        this.time.delayedCall(1400, () => this.nextDocument(i));
      }
    });
  }

  private askQuestions(i: number) {
    this.ui.openDialog('amt_questions', this.officials[i], (a) => {
      if (a === 'ready_to_sign') GameState.setQuest('sign');
    }, DESKS[i].key);
  }

  private sign(i: number) {
    const off = this.officials[i];
    this.player.say('✍️  *unterschreibt*', '*firma*', 1500);
    this.time.delayedCall(800, () => off.say('*Stempel* – Zack!', '*sello*', 1500));
    ['wartenummer', 'anmeldeformular', 'wgb'].forEach((it) => GameState.removeItem(it));
    this.deskBusy[i] = null;
    this.time.delayedCall(1700, () =>
      this.ui.openDialog('amt_done', off, (a) => {
        if (a === 'quest:complete_anmeldung' && GameState.isActive('anmeldung')) GameState.completeQuest();
      }, DESKS[i].key),
    );
  }

  // ───────────── Bucle ─────────────

  protected worldUpdate(dt: number) {
    for (const b of this.brains) b.update(dt);

    // el jugador se levantó: liberar su asiento
    const ps = this.seats.indexOf('player');
    if (ps >= 0 && !this.player.sitting) this.seats[ps] = null;
    this.playerSitTime = this.player.sitting ? this.playerSitTime + dt : 0;

    this.callTimer -= dt;
    if (this.callTimer <= 0) {
      this.callTimer = 5;
      this.tryCall();
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 14;
      const seated = this.citizens.filter((c) => c.state === 'seated' || c.state === 'arrive').length;
      const free = this.seats.findIndex((s, i) => s === null && i % 2 === 1);
      const seat = free >= 0 ? free : this.seats.findIndex((s) => s === null);
      if (seated < 5 && seat >= 0) this.addCitizen(CITIZEN_KEYS[this.nextNum % CITIZEN_KEYS.length], this.nextNum++, seat, true);
    }
  }

  private tryCall() {
    const desk = this.deskBusy.findIndex((d) => d === null);
    if (desk < 0) return;
    if (GameState.isActive('anmeldung', 'wait') && this.player.sitting && this.playerSitTime > 2.5) return this.callPlayer(desk);
    const playerPassed = !GameState.isActive('anmeldung') || !['get_wgb', 'go_amt', 'ticket', 'form', 'wait'].includes(GameState.data.quest.step);
    const next = this.citizens
      .filter((c) => c.state === 'seated' && (c.num < PLAYER_NUMBER || playerPassed))
      .sort((a, b) => a.num - b.num)[0];
    if (next) this.callCitizen(next, desk);
  }
}

