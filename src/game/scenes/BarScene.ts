import { flatTop, isoBox, type Light } from '../art/buildings';
import { pixelText, textWidth } from '../art/font';
import { PAL } from '../art/palette';
import { makeCanvas, outline, px, rect, rng, shade, shearFace } from '../art/pixel';
import { DRINK_BY_ID, indefAkk, keinAkk, ORDERS, THANKS, THANKS_ES, type Order } from '../data/bar';
import { depthOf, HALF_H, HALF_W, toScreen, type Facing } from '../iso';
import { GameState, QUEST_SERVE_TARGET, speakDe } from '../state/GameState';
import { Actor } from '../world/Actor';
import type { Pt } from '../world/Collision';
import { ChatBrain, PatrolBrain, type Brain } from '../world/Npc';
import { WorldScene } from './WorldScene';

const ROOM_W = 11;
const ROOM_H = 9;
const WALL_H = 150;

const DOOR: Pt = { x: 5.5, y: 8.4 };
const FRIDGE = { x: 9.65 };
const SPOTS: Pt[] = [
  { x: 2.1, y: 3.85 },
  { x: 3.5, y: 3.85 },
  { x: 4.9, y: 3.85 },
];
const SEATS: { p: Pt; facing: Facing }[] = [
  { p: { x: 2.7, y: 6.2 }, facing: 'SE' },
  { p: { x: 6.7, y: 6.6 }, facing: 'SE' },
  { p: { x: 8.5, y: 6.5 }, facing: 'NW' },
];
const GUEST_KEYS = ['guest1', 'guest2', 'guest3', 'guest4'];

interface Customer {
  actor: Actor;
  state: 'entering' | 'waiting' | 'served' | 'sitting' | 'leaving';
  order: Order;
  spot: number;
  seat: number;
}

export class BarScene extends WorldScene {
  readonly displayName = 'Bar «Kater Karlo»';
  private mehmet!: Actor;
  private brains: Brain[] = [];
  private customers: Customer[] = [];
  private spawnTimer = 0;
  private guestIdx = 0;
  private orderIdx = 0;

  constructor() {
    super('Bar');
  }

  create(data?: { x?: number; y?: number; from?: string }) {
    this.initWorld({ x0: 0.35, y0: 0.35, x1: ROOM_W - 0.35, y1: ROOM_H - 0.25 });
    this.brains = [];
    this.customers = [];
    this.spawnTimer = 2;
    this.cameras.main.setBackgroundColor('#05060b');

    this.paintGround(ROOM_W, ROOM_H, (x, y) => (y < 2 && x < 7 ? 'tiles' : x >= 2 && x <= 8 && y >= 5 && y <= 7 ? 'carpet' : 'wood'), 'ground_bar');
    this.buildWalls();
    this.buildFurniture();

    const start = this.safeStart(data?.x !== undefined && data.from !== 'Street' ? { x: data.x, y: data.y! } : null, { x: DOOR.x, y: DOOR.y - 0.3 });
    this.player = this.addActor(new Actor(this, 'player', GameState.data.name, start.x, start.y));
    this.player.facing = 'NW';
    this.setupCamera(this.player);
    const tl = toScreen(0, ROOM_H);
    const br = toScreen(ROOM_W, 0);
    this.cameras.main.setBounds(tl.x - 400, -WALL_H - 300, br.x - tl.x + 800, toScreen(ROOM_W, ROOM_H).y + WALL_H + 600);

    // Mehmet detrás de la barra, yendo y viniendo
    this.mehmet = this.addActor(new Actor(this, 'mehmet', 'Mehmet', 3.5, 1.15));
    this.mehmet.speed = 1.2;
    this.brains.push(
      new PatrolBrain(this, this.mehmet, [
        { x: 1.6, y: 1.15, wait: 4, face: 'SW', say: ['Gläser polieren…', 'Pulir vasos…'] },
        { x: 5.5, y: 1.15, wait: 6, face: 'SW' },
        { x: 3.5, y: 1.15, wait: 5, face: 'SW' },
      ]),
    );
    const boss = this.mehmet;
    // se puede hablar con Mehmet por encima de la barra o desde detrás de ella
    this.interactables.push(
      {
        get x() {
          return boss.wx;
        },
        y: 3.85,
        radius: 1.5,
        label: () => 'Hablar con Mehmet',
        action: () => this.talkBoss(),
      },
      {
        get x() {
          return boss.wx;
        },
        get y() {
          return boss.wy;
        },
        radius: 1.3,
        label: () => 'Hablar con Mehmet',
        action: () => this.talkBoss(),
      },
    );

    // clientes habituales sentados
    const r1 = this.addActor(new Actor(this, 'guest3', 'Paul', SEATS[1].p.x, SEATS[1].p.y));
    const r2 = this.addActor(new Actor(this, 'guest2', 'Tarek', SEATS[2].p.x, SEATS[2].p.y));
    r1.sit(SEATS[1].facing);
    r2.sit(SEATS[2].facing);
    const toast: [string, string][] = [
      ['Prost!', '¡Salud!'],
      ['Zum Wohl!', '¡A tu salud!'],
      ['Wie war dein Tag?', '¿Qué tal tu día?'],
      ['Lang. Aber jetzt: Feierabend!', 'Largo. Pero ahora: ¡a descansar!'],
    ];
    this.brains.push(new ChatBrain(this, r1, r2, toast, true), new ChatBrain(this, r2, r1, toast, false));
    this.occupiedSeats = new Set([1, 2]);

    // salida
    this.interactables.push({ x: DOOR.x, y: DOOR.y, radius: 1.1, label: () => 'Salir a la calle', action: () => this.goTo('Street', { from: 'Bar' }) });
    this.pois.push({ x: FRIDGE.x + 0.5, y: 1.9, icon: '🧊', label: 'Nevera' }, { x: DOOR.x, y: DOOR.y, icon: '🚪', label: 'Salida' });
    this.minimap.push(
      { rect: { x0: 0, y0: 0, x1: ROOM_W, y1: ROOM_H }, color: 0xc48a58 },
      { rect: { x0: 1, y0: 2, x1: 6, y1: 3 }, color: 0xcf9461 },
      { rect: { x0: FRIDGE.x, y0: 0.2, x1: FRIDGE.x + 1, y1: 1.2 }, color: 0x3fa9ff },
    );

    // insignia «!» sobre Mehmet cuando hay que hablar con él (el objetivo es el sitio delante de la barra)
    this.objectiveActor = () => (GameState.isActive('shift', 'talk_boss', 'get_paid') ? this.mehmet : null);
    this.objectivePoi = () => {
      const q = GameState.data.quest;
      if (q.id === 'shift') {
        if (q.step === 'talk_boss' || q.step === 'get_paid') return { x: this.mehmet.wx, y: 3.9 };
        if (q.step === 'serve') {
          const waiting = this.customers.find((c) => c.state === 'waiting');
          if (!waiting) return null;
          return this.player.heldId ? waiting.actor.pos : { x: FRIDGE.x + 0.5, y: 1.9 };
        }
      }
      // la misión siguiente transcurre fuera: señalar la salida
      return q.id === 'none' ? null : DOOR;
    };

    if (GameState.isActive('shift', 'go_bar')) {
      GameState.setQuest('talk_boss');
      this.time.delayedCall(700, () => this.mehmet.say('Hey, du! Komm mal her!', '¡Eh, tú! ¡Ven aquí!', 3500));
    }
    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.savePosition() });
    this.events.once('shutdown', () => this.savePosition());
  }

  private occupiedSeats = new Set<number>();

  // ───────────── Arte del interior ─────────────

  private buildWalls() {
    const backW = ROOM_W * HALF_W;
    const sideW = ROOM_H * HALF_W;
    const backLights: Light[] = [];
    const sideLights: Light[] = [];
    const r = rng(77);

    // pared del fondo (plano y = 0): papel pintado, zócalo, botellero tras la barra y pizarra
    const back = makeCanvas(backW, WALL_H);
    const b = back.ctx;
    rect(b, 0, 0, backW, WALL_H, '#9e3a4a');
    for (let x = 0; x < backW; x += 12) rect(b, x, 0, 5, WALL_H, '#a8445a');
    for (let x = 6; x < backW; x += 24) for (let y = 20; y < WALL_H - 44; y += 18) rect(b, x, y, 2, 2, '#c4687a');
    rect(b, 0, 0, backW, 6, '#5a2030');
    rect(b, 0, 6, backW, 3, '#d9a070');
    rect(b, 0, WALL_H - 44, backW, 44, PAL.woodDark);
    for (let x = 4; x < backW; x += 22) {
      rect(b, x, WALL_H - 38, 18, 32, PAL.wood);
      rect(b, x, WALL_H - 38, 18, 2, PAL.woodLight);
    }
    rect(b, 0, WALL_H - 46, backW, 4, PAL.woodLight);
    // botellero iluminado tras la barra
    rect(b, 34, 30, 156, 72, '#4a2418');
    rect(b, 38, 34, 148, 64, '#f2c07a');
    rect(b, 38, 34, 148, 10, '#ffe0a0');
    for (const sy of [56, 80, 98]) {
      rect(b, 36, sy, 152, 4, PAL.woodLight);
      rect(b, 36, sy + 4, 152, 1, PAL.woodDark);
      if (sy === 98) continue;
      for (let x = 41; x < 182; x += 6 + Math.floor(r() * 3)) {
        const c = ['#3fa04a', '#c0802a', '#e6eef8', '#9e1f3a', '#f0c95a', '#3b5bdb'][Math.floor(r() * 6)];
        const h = 12 + Math.floor(r() * 6);
        rect(b, x, sy - h, 4, h, c);
        rect(b, x + 1, sy - h - 3, 2, 3, shade(c, 0.6));
        rect(b, x, sy - h + 2, 1, h - 4, shade(c, 1.35));
      }
    }
    backLights.push({ x: 112, y: 60, color: PAL.lampGlow, r: 90, alpha: 0.3 });
    // pizarra de precios
    rect(b, 204, 36, 88, 76, PAL.woodDark);
    rect(b, 208, 40, 80, 68, '#2f3f38');
    const menu: [string, string][] = [
      ['BIER', '3€'],
      ['WEIN', '4€'],
      ['COLA', '2€'],
      ['WASSER', '2€'],
    ];
    menu.forEach(([d, p], i) => {
      pixelText(b, d, 214, 46 + i * 15, i % 2 ? PAL.lamp : '#f2ece4', 2);
      pixelText(b, p, 282 - textWidth(p, 2), 46 + i * 15, '#ff9aa8', 2);
    });
    // cuadro
    rect(b, 300, 40, 30, 38, '#d9a070');
    rect(b, 303, 43, 24, 32, '#5fc2ff');
    rect(b, 303, 62, 24, 13, '#5fe39a');
    rect(b, 310, 50, 8, 8, '#ffd77a');
    // guirnalda
    for (let x = 4; x < backW; x += 10) {
      const y = 16 + Math.round(Math.sin(x / 18) * 3);
      rect(b, x, y, 3, 3, PAL.windowLitHot);
      if (x % 40 === 4) backLights.push({ x: x + 1, y, color: PAL.lampGlow, r: 20, alpha: 0.5 });
    }

    // pared lateral (plano x = 0): ladrillo visto, ventana, neón y diana
    const side = makeCanvas(sideW, WALL_H);
    const sc = side.ctx;
    rect(sc, 0, 0, sideW, WALL_H, '#b0583e');
    for (let y = 0; y < WALL_H; y += 8) {
      rect(sc, 0, y, sideW, 1, '#8a3f2c');
      for (let x = (y / 8) % 2 ? 0 : 10; x < sideW; x += 20) rect(sc, x, y, 1, 8, '#8a3f2c');
      for (let x = (y / 8) % 2 ? 2 : 12; x < sideW; x += 20) rect(sc, x, y + 1, 16, 1, '#c46a4e');
    }
    rect(sc, 0, 0, sideW, 6, '#5a2030');
    rect(sc, 0, WALL_H - 30, sideW, 30, PAL.woodDark);
    rect(sc, 0, WALL_H - 32, sideW, 3, PAL.woodLight);
    // ventana con la calle de noche
    rect(sc, 150, 36, 90, 72, '#f2ece4');
    rect(sc, 154, 40, 82, 64, '#2a3a6a');
    rect(sc, 154, 80, 82, 24, '#3a4a7a');
    const winLights: [number, number, string][] = [
      [162, 50, PAL.windowLit],
      [178, 56, PAL.windowLit],
      [214, 48, PAL.windowLit],
      [224, 62, PAL.neonRed],
    ];
    for (const [x, y, c] of winLights) rect(sc, x, y, 5, 7, c);
    rect(sc, 193, 40, 4, 64, '#f2ece4');
    rect(sc, 154, 70, 82, 3, '#f2ece4');
    rect(sc, 146, 106, 98, 5, '#e6e1ea');
    sideLights.push({ x: 195, y: 72, color: '#8fb0ff', r: 50, alpha: 0.3 });
    // neón «PROST»
    pixelText(sc, 'PROST', 26, 52, shade(PAL.neonPink, 0.35), 4);
    pixelText(sc, 'PROST', 24, 50, PAL.neonPink, 4);
    pixelText(sc, 'PROST', 25, 51, '#ffd0f0', 2);
    sideLights.push({ x: 62, y: 60, color: PAL.neonPink, r: 80, alpha: 0.5 });
    // diana
    for (let k = 14; k > 0; k -= 4) {
      const c = k === 14 ? '#2a2238' : k === 10 ? '#e8333a' : k === 6 ? '#f2ece4' : '#3fa04a';
      for (let y = -k; y <= k; y++) for (let x = -k; x <= k; x++) if (x * x + y * y <= k * k) px(sc, 80 + x, 92 + y, c);
    }

    const minX = -sideW;
    const minY = -WALL_H;
    const { canvas, ctx } = makeCanvas(backW + sideW, WALL_H + ROOM_W * HALF_H + 2);
    shearFace(ctx, back.canvas, -minX, 0, 'right');
    shearFace(ctx, side.canvas, -minX, 0, 'left');
    rect(ctx, -minX - 1, 0, 2, WALL_H, '#3a1418');
    // canto superior de las paredes (grosor del muro)
    for (let u = 0; u < backW; u++) rect(ctx, -minX + u, Math.floor(u / 2) - 1, 1, 3, '#e6d6c8');
    for (let u = 0; u < sideW; u++) rect(ctx, -minX - u - 1, Math.floor(u / 2) - 1, 1, 3, '#d9c6b6');
    if (!this.textures.exists('bar_walls')) this.textures.addCanvas('bar_walls', canvas);
    this.add.image(minX, minY, 'bar_walls').setOrigin(0, 0).setDepth(-60000);
    backLights.forEach((l) => this.glowOnWall(l, 'back'));
    sideLights.forEach((l) => this.glowOnWall(l, 'side'));

    // borde frontal (corte del muro delantero) con hueco de puerta
    const edgeC = makeCanvas((ROOM_W + ROOM_H) * HALF_W, (ROOM_W + ROOM_H) * HALF_H + 12);
    const e = edgeC.ctx;
    const ex0 = ROOM_H * HALF_W;
    for (let u = 0; u < ROOM_W * HALF_W; u++) {
      if (Math.abs(u / HALF_W - DOOR.x) < 0.8) continue;
      rect(e, u, ROOM_H * HALF_H + Math.floor(u / 2), 1, 8, '#7a3a2a');
      rect(e, u, ROOM_H * HALF_H + Math.floor(u / 2), 1, 2, '#e6d6c8');
    }
    for (let u = 0; u < ROOM_H * HALF_W; u++) {
      rect(e, ex0 + ROOM_W * HALF_W - u - 1, ROOM_W * HALF_H + Math.floor(u / 2), 1, 8, '#6a3022');
      rect(e, ex0 + ROOM_W * HALF_W - u - 1, ROOM_W * HALF_H + Math.floor(u / 2), 1, 2, '#d9c6b6');
    }
    if (!this.textures.exists('bar_edge')) this.textures.addCanvas('bar_edge', edgeC.canvas);
    this.add.image(toScreen(0, ROOM_H).x, 0, 'bar_edge').setOrigin(0, 0).setDepth(-90000);
    const d = toScreen(DOOR.x, ROOM_H);
    this.addGlow(d.x, d.y, '#8fb0ff', 50, 0.35, -90000);
  }

  private glowOnWall(l: Light, wall: 'back' | 'side') {
    if (wall === 'back') {
      this.addGlow(l.x, Math.floor(l.x / 2) - WALL_H + l.y, l.color, l.r, l.alpha ?? 0.4, -59000, true);
    } else {
      const u = ROOM_H * HALF_W - 1 - l.x;
      this.addGlow(-u - 1, Math.floor(u / 2) - WALL_H + l.y, l.color, l.r, l.alpha ?? 0.4, -59000, true);
    }
  }

  private buildFurniture() {
    // barra segmentada (un sprite por baldosa para ordenar bien la profundidad)
    const CX0 = 1;
    const CY0 = 2;
    const LEN = 5;
    const H = 44;
    const W1 = HALF_W;
    const front = makeCanvas(LEN * W1, H);
    const f = front.ctx;
    rect(f, 0, 0, LEN * W1, H, '#7a3a24');
    for (let x = 3; x < LEN * W1; x += 16) {
      rect(f, x, 8, 12, 26, '#8e4a2e');
      rect(f, x, 8, 12, 2, '#a85c3a');
      rect(f, x + 10, 8, 2, 26, '#6a2e1c');
    }
    rect(f, 0, 0, LEN * W1, 5, PAL.woodLight);
    rect(f, 0, 5, LEN * W1, 2, PAL.woodDark);
    rect(f, 0, H - 7, LEN * W1, 2, '#ffd27a'); // reposapiés de latón
    rect(f, 0, H - 5, LEN * W1, 1, '#b08a3a');
    const sideTex = makeCanvas(W1, H);
    rect(sideTex.ctx, 0, 0, W1, H, '#5e2c1a');
    rect(sideTex.ctx, 0, 0, W1, 5, PAL.woodLight);
    for (let i = 0; i < LEN; i++) {
      const seg = makeCanvas(W1, H);
      seg.ctx.drawImage(front.canvas, i * W1, 0, W1, H, 0, 0, W1, H);
      const art = isoBox(1, 1, H, { canvas: seg.canvas }, i === LEN - 1 ? { canvas: sideTex.canvas } : null, flatTop('#cf9461', '#e6b07a'));
      const key = `counter_${i}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, art.canvas);
      const s = toScreen(CX0 + i, CY0);
      this.add.image(s.x - art.anchorX, s.y - art.anchorY, key).setOrigin(0, 0).setDepth(depthOf(CX0 + i + 0.5, CY0 + 0.9));
    }
    this.collision.add(CX0, CY0, CX0 + LEN, CY0 + 1);
    // grifos y vasos sobre la barra
    const taps = makeCanvas(48, 44);
    const t = taps.ctx;
    for (let i = 0; i < 3; i++) {
      rect(t, 8 + i * 12, 10, 4, 28, '#c9c9d6');
      rect(t, 8 + i * 12, 10, 1, 28, '#ffffff');
      rect(t, 6 + i * 12, 0, 8, 11, ['#e8333a', '#f0c95a', '#3b5bdb'][i]);
      rect(t, 6 + i * 12, 0, 8, 2, '#ffffff');
    }
    rect(t, 2, 38, 44, 4, '#9a9aaa');
    rect(t, 2, 38, 44, 1, '#e6e1ea');
    outline(t, 48, 44, PAL.outline);
    if (!this.textures.exists('taps')) this.textures.addCanvas('taps', taps.canvas);
    const ts = toScreen(3.5, 2.5);
    this.add.image(ts.x, ts.y - H + 6, 'taps').setOrigin(0.5, 1).setDepth(depthOf(3.5, 2.9) + 1);
    const glasses = makeCanvas(30, 20);
    for (let i = 0; i < 3; i++) {
      rect(glasses.ctx, 2 + i * 9, 4, 7, 14, '#e6eef8');
      rect(glasses.ctx, 2 + i * 9, 4, 2, 14, '#ffffff');
    }
    outline(glasses.ctx, 30, 20, PAL.outline);
    if (!this.textures.exists('glasses')) this.textures.addCanvas('glasses', glasses.canvas);
    const gs = toScreen(5.4, 2.5);
    this.add.image(gs.x, gs.y - H + 6, 'glasses').setOrigin(0.5, 1).setDepth(depthOf(5.4, 2.9) + 1);

    // nevera con puerta de cristal iluminada
    const FH = 88;
    const fr = makeCanvas(W1, FH);
    const c = fr.ctx;
    rect(c, 0, 0, W1, FH, '#f2f4f8');
    rect(c, 2, 2, W1 - 4, FH - 10, '#7a8aa8');
    rect(c, 4, 4, W1 - 8, FH - 14, '#cfeaff');
    for (const y of [22, 40, 58, 74]) {
      rect(c, 4, y, W1 - 8, 2, '#ffffff');
      for (let x = 6; x < W1 - 6; x += 4) {
        const col = ['#f2a93b', '#9e1f3a', '#4a2a1e', '#2a7ad8', '#f0c95a'][(x + y) % 5];
        rect(c, x, y - 12, 3, 12, col);
        rect(c, x, y - 14, 3, 2, shade(col, 0.6));
      }
    }
    rect(c, W1 - 7, 30, 2, 22, '#9aa4b8');
    rect(c, 0, FH - 6, W1, 6, '#9aa4b8');
    const frSide = makeCanvas(W1, FH);
    rect(frSide.ctx, 0, 0, W1, FH, '#c9cfdc');
    rect(frSide.ctx, 0, 0, W1, 2, '#ffffff');
    const fridge = isoBox(1, 1, FH, { canvas: fr.canvas }, { canvas: frSide.canvas }, flatTop('#e6e9f0', '#ffffff'));
    if (!this.textures.exists('fridge')) this.textures.addCanvas('fridge', fridge.canvas);
    const fs = toScreen(FRIDGE.x, 0.2);
    this.add.image(fs.x - fridge.anchorX, fs.y - fridge.anchorY, 'fridge').setOrigin(0, 0).setDepth(depthOf(FRIDGE.x + 0.5, 1));
    this.collision.add(FRIDGE.x, 0.2, FRIDGE.x + 1, 1.2);
    const fg = toScreen(FRIDGE.x + 0.4, 1.3);
    this.addGlow(fg.x, fg.y - 46, PAL.neonBlue, 70, 0.4, depthOf(FRIDGE.x + 0.5, 1) + 0.1, true);
    this.addGlow(fg.x, fg.y + 8, PAL.neonBlue, 60, 0.25, -90000);
    this.interactables.push({
      x: FRIDGE.x + 0.5,
      y: 1.75,
      radius: 1.2,
      label: () => (this.player.heldId ? 'Cambiar bebida' : 'Abrir nevera'),
      action: () =>
        this.ui.openFridge((id) => {
          this.player.hold(id);
          if (id) GameState.learn([DRINK_BY_ID[id].vocab, 'kuehlschrank']);
        }),
    });

    // taburetes, mesas, sillas, plantas
    for (const x of [1.5, 2.8, 4.1, 5.4]) this.placeProp('bar_stool', x, 3.4);
    this.placeProp('round_table', 3.6, 6.2, { block: 0.9 });
    this.placeProp('round_table', 7.6, 6.6, { block: 0.9 });
    for (const st of SEATS) this.placeProp('chair', st.p.x, st.p.y - 0.05, { flip: st.facing === 'NW' });
    this.placeProp('chair', 4.5, 6.25, { flip: true });
    this.placeProp('plant0', 10.4, 3.6, { block: 0.5 });
    this.placeProp('plant1', 0.7, 8.3, { block: 0.5 });
    this.placeProp('plant0', 0.7, 4.4, { block: 0.5 });

    // lámparas colgantes
    const lamps: [number, number][] = [
      [2.2, 2.5],
      [4.8, 2.5],
      [3.6, 6.2],
      [7.6, 6.6],
    ];
    for (const [x, y] of lamps) {
      const s = toScreen(x, y);
      this.add.image(s.x, s.y - 150, 'hanging_lamp').setOrigin(0.5, 1).setDepth(1e5);
      this.addGlow(s.x, s.y - 154, PAL.lampGlow, 50, 0.5, 1e5 + 1, true);
      this.addGlow(s.x, s.y, PAL.lampGlow, 90, 0.2, -90000);
    }
  }

  // ───────────── Misión: servir bebidas ─────────────

  private talkBoss() {
    const q = GameState.data.quest;
    let dialog = 'boss_free';
    if (q.id === 'shift') dialog = ({ talk_boss: 'boss_intro', serve: 'boss_busy', get_paid: 'boss_pay' } as Record<string, string>)[q.step] ?? 'boss_free';
    else if (q.id === 'anmeldung') dialog = 'boss_reminder';
    else if (GameState.isDone('anmeldung')) dialog = GameState.isDone('wg') ? 'boss_memory' : 'boss_proud';
    this.mehmet.face(this.player.pos);
    this.ui.openDialog(dialog, this.mehmet, (action) => this.onBossAction(action));
  }

  private onBossAction(action: string) {
    if (action === 'quest:serve') {
      GameState.setQuest('serve');
      this.spawnTimer = 1;
    }
    // tras pagar, Mehmet encarga la Anmeldung (Misión 02) en cuanto se cierra el diálogo
    if (action === 'quest:pay') this.ui.afterDialog(() => this.ui.openDialog('boss_amt', this.mehmet, (a) => this.onBossAction(a)));
    // recompensa (30 € + XP), aviso de misión completada y arranque de la Misión 02
    if (action === 'quest:complete_shift' && GameState.isActive('shift')) GameState.completeQuest();
  }

  private nextOrder(): Order {
    const list = ORDERS[GameState.data.settings.level];
    return list[this.orderIdx++ % list.length];
  }

  private spawnCustomer() {
    const spot = SPOTS.findIndex((_, i) => !this.customers.some((c) => c.spot === i && c.state !== 'sitting' && c.state !== 'leaving'));
    if (spot < 0) return;
    const key = GUEST_KEYS[this.guestIdx++ % GUEST_KEYS.length];
    const actor = this.addActor(new Actor(this, key, 'Gast', DOOR.x, ROOM_H - 0.4));
    actor.speed = 1.8;
    const cust: Customer = { actor, state: 'entering', order: this.nextOrder(), spot, seat: -1 };
    this.customers.push(cust);
    const target = SPOTS[spot];
    actor.walkPath(this.collision.findPath(actor.pos, target) ?? [target], () => {
      cust.state = 'waiting';
      actor.facing = 'NE';
      this.sayOrder(cust);
    });
    this.interactables.push({
      get x() {
        return actor.wx;
      },
      get y() {
        return actor.wy;
      },
      radius: 1.4,
      label: () => {
        if (cust.state !== 'waiting') return null;
        const held = this.player.heldId;
        return held ? `Entregar ${DRINK_BY_ID[held].de}` : 'Escuchar pedido';
      },
      action: () => this.serve(cust),
    });
  }

  private sayOrder(c: Customer) {
    c.actor.say(c.order.de, c.order.es, 1e9, 'order');
    speakDe(c.order.de);
  }

  private serve(c: Customer) {
    const held = this.player.heldId;
    c.actor.face(this.player.pos);
    if (!held) {
      this.sayOrder(c);
      return;
    }
    const want = DRINK_BY_ID[c.order.drink];
    const got = DRINK_BY_ID[held];
    this.player.hold(null);

    if (held === c.order.drink) {
      const i = Math.floor(Math.random() * THANKS.length);
      c.actor.say(THANKS[i], THANKS_ES[i], 2600, 'happy');
      speakDe(THANKS[i]);
      const xp = GameState.addXp(10);
      const tip = Math.round((0.5 + Math.random() * 1.5) * 2) / 2;
      GameState.addMoney(want.price + tip);
      const freshWords = GameState.learn([want.vocab, 'danke_schoen', 'trinkgeld', ...(c.order.vocab ?? [])]);
      GameState.bumpStat('served');
      this.ui.toast({
        title: `+${xp} XP`,
        lines: [`Vocabulario aprendido:`, freshWords.length ? GameState.vocabText(want.vocab) : `${GameState.vocabText(want.vocab)} ✓ repasado`, `Propina: +${(want.price + tip).toFixed(2)} €`],
        icon: `drink_${want.id}`,
        tone: 'acid',
      });
      const q = GameState.data.quest;
      if (GameState.isActive('shift', 'serve')) {
        q.served++;
        if (q.served >= QUEST_SERVE_TARGET) {
          GameState.setQuest('get_paid');
          this.time.delayedCall(1500, () => this.mehmet.say('Super! Komm mal zu mir!', '¡Genial! ¡Ven un momento!', 4000));
        } else GameState.setQuest('serve');
      }
      c.state = 'served';
      this.time.delayedCall(1800, () => this.goSit(c));
    } else {
      GameState.bumpStat('wrong');
      const de = `Nein, ich wollte ${indefAkk(want)}, ${keinAkk(got)}!`;
      const es = `¡No, quería ${want.es}, no ${got.es}!`;
      c.actor.say(de, es, 4000, 'angry');
      speakDe(de);
      this.ui.toast({
        title: 'Pedido equivocado',
        lines: [
          `Pidió ${indefAkk(want)} (${want.es}).`,
          `Negación: der → keinen · die → keine · das → kein`,
          'Vuelve a la nevera y trae la bebida correcta.',
        ],
        icon: `drink_${got.id}`,
        tone: 'red',
      });
      this.time.delayedCall(4200, () => c.state === 'waiting' && this.sayOrder(c));
    }
  }

  private goSit(c: Customer) {
    const free = SEATS.findIndex((_, i) => !this.occupiedSeats.has(i));
    if (free < 0) return this.leave(c);
    this.occupiedSeats.add(free);
    c.seat = free;
    c.state = 'sitting';
    const seat = SEATS[free];
    c.actor.walkPath(this.collision.findPath(c.actor.pos, seat.p) ?? [seat.p], () => {
      c.actor.sit(seat.facing);
      this.time.delayedCall(2000, () => c.actor.say('Prost!', '¡Salud!', 2000));
      this.time.delayedCall(22000 + Math.random() * 10000, () => this.leave(c));
    });
  }

  private leave(c: Customer) {
    if (c.seat >= 0) this.occupiedSeats.delete(c.seat);
    c.state = 'leaving';
    c.actor.stand();
    const out = { x: DOOR.x, y: ROOM_H - 0.4 };
    c.actor.walkPath(this.collision.findPath(c.actor.pos, out) ?? [out], () => {
      c.actor.say('Tschüss!', '¡Adiós!', 1200);
      this.time.delayedCall(400, () => {
        c.actor.destroy();
        this.actors = this.actors.filter((a) => a !== c.actor);
        this.customers = this.customers.filter((x) => x !== c);
      });
    });
  }

  protected worldUpdate(dt: number) {
    for (const b of this.brains) b.update(dt);
    const serving = GameState.isActive('shift', 'serve');
    if (serving || GameState.isActive('shift', 'get_paid') || GameState.isDone('shift')) {
      this.spawnTimer -= dt;
      const active = this.customers.filter((c) => c.state === 'entering' || c.state === 'waiting').length;
      // durante la misión, de uno en uno; después, hasta dos a la vez
      const max = serving ? 1 : 2;
      if (this.spawnTimer <= 0 && active < max) {
        this.spawnCustomer();
        this.spawnTimer = serving ? 3 : 10 + Math.random() * 8;
      }
    }
    // los clientes que esperan miran al jugador si está cerca
    for (const c of this.customers)
      if (c.state === 'waiting') {
        if (c.actor.distTo(this.player.pos) < 2.5) c.actor.face(this.player.pos);
        else c.actor.facing = 'NE';
      }
  }
}
