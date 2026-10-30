import { buildingArt, flatTop, isoBox, type BuildingSpec } from '../art/buildings';
import { pixelText, textWidth } from '../art/font';
import { FACADES, PAL } from '../art/palette';
import { makeCanvas, poly, px, rect, shade } from '../art/pixel';
import { depthOf, HALF_H, HALF_W, TILE_H, TILE_W, toScreen } from '../iso';
import { GameState } from '../state/GameState';
import { Actor } from '../world/Actor';
import { BenchBrain, ChatBrain, PatrolBrain, StaticBrain, type Brain } from '../world/Npc';
import { WorldScene } from './WorldScene';

// Manzana compacta de Kreuzberg: una fila de edificios, calle adoquinada, plaza con U-Bahn y canal.
const MAP_W = 24;
const MAP_H = 15;

interface PlacedBuilding extends BuildingSpec {
  x0: number;
  y0: number;
  /** desplazamiento en px (dentro de la fachada) del centro de la puerta */
  doorPx: number;
}

const BUILDINGS: PlacedBuilding[] = [
  { kind: 'apartment', x0: 0, y0: 0, wx: 6, wy: 4, floors: 2, color: FACADES[0], seed: 11, doorBay: 3, doorPx: 3 * 32 + 16 },
  { kind: 'buergeramt', x0: 6, y0: 0, wx: 6, wy: 4, floors: 3, color: '#e2d6c0', seed: 23, doorBay: 1, doorPx: 32 + 32 },
  { kind: 'bar', x0: 12, y0: 0, wx: 6, wy: 4, floors: 2, color: FACADES[3], seed: 41, doorBay: 2, doorPx: 2 * 32 + 16 },
  { kind: 'club', x0: 18, y0: 0, wx: 6, wy: 4, floors: 2, color: '#4a4258', seed: 67, doorBay: 1, doorPx: 32 + 18 },
];

function doorPos(b: PlacedBuilding) {
  return { x: b.x0 + b.doorPx / HALF_W, y: b.y0 + b.wy + 0.5 };
}

export class StreetScene extends WorldScene {
  readonly displayName = 'Kreuzberg';
  private brains: Brain[] = [];
  private anna: Actor | null = null;

  constructor() {
    super('Street');
  }

  create(data?: { x?: number; y?: number; from?: string }) {
    this.initWorld({ x0: 0.25, y0: 4.25, x1: MAP_W - 0.25, y1: 12.7 });
    this.brains = [];
    this.cameras.main.setBackgroundColor(PAL.night);

    const ref = this.registry.get('ground:sidewalk_ref') as { x0: number; cols: number; south: boolean } | undefined;
    const cobbles = this.registry.get('ground:cobble_ref') as number | undefined;
    this.paintGround(
      MAP_W,
      MAP_H,
      groundKind,
      `ground_street${cobbles ? `_cob${cobbles}` : ''}${ref ? `_ref${ref.x0}x${ref.cols}${ref.south ? 's' : ''}` : ''}`,
      ref || cobbles
        ? (ctx, ox, oy) => {
            if (cobbles) this.paintCobblesRef(ctx, ox, oy, cobbles); // primero la calzada…
            if (ref) this.paintSidewalkRef(ctx, ox, oy, ref); // …y encima la cara del bordillo
          }
        : undefined,
    );
    this.buildBuildings();
    this.buildStreetFurniture();
    this.buildUbahn(3, 10);
    this.buildImbiss(14, 10.2);
    this.buildCanal();
    this.spawnNpcs();

    const bar = BUILDINGS[2];
    const amt = BUILDINGS[1];
    const start = this.safeStart(
      data?.from === 'Bar'
        ? { x: doorPos(bar).x, y: doorPos(bar).y + 0.3 }
        : data?.from === 'Amt'
          ? { x: doorPos(amt).x, y: doorPos(amt).y + 0.3 }
          : data?.from === 'WG'
            ? { x: doorPos(BUILDINGS[0]).x, y: doorPos(BUILDINGS[0]).y + 0.3 }
            : data?.from === 'UBahn'
              ? { x: 4, y: 9.55 }
          : data?.x !== undefined
            ? { x: data.x, y: data.y! }
            : null,
      { x: 9, y: 7 },
    );
    this.player = this.addActor(new Actor(this, 'player', GameState.data.name, start.x, start.y));
    this.player.facing = 'SE';
    this.setupCamera(this.player);
    const tl = toScreen(0, MAP_H);
    const br = toScreen(MAP_W, 0);
    this.cameras.main.setBounds(tl.x - 64, -260, br.x - tl.x + 128, toScreen(MAP_W, MAP_H).y + 300);

    this.objectivePoi = () => {
      const q = GameState.data.quest;
      if (q.id === 'shift') return doorPos(BUILDINGS[2]);
      if (q.id === 'anmeldung') return q.step === 'get_wgb' && this.anna ? this.anna.pos : doorPos(BUILDINGS[1]);
      if (q.id === 'wg') return q.step === 'invite' && this.anna ? this.anna.pos : doorPos(BUILDINGS[0]);
      if (q.id === 'unterwegs') return q.step === 'invite' ? doorPos(BUILDINGS[0]) : { x: 4, y: 9.65 };
      return null;
    };
    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.savePosition() });
    this.events.once('shutdown', () => this.savePosition());
  }

  /**
   * Acera reproducida de la referencia: baldosas del atlas sobre la acera norte (y = 4 losas, y = 5 losas y
   * bordillo), la cara vertical del bordillo sobre la calzada (y = 6) y, si el atlas la trae, la acera sur
   * (y = 9 con el bordillo hacia la calzada, y = 10), desde la columna x0.
   */
  private paintSidewalkRef(ctx: CanvasRenderingContext2D, ox: number, oy: number, ref: { x0: number; cols: number; south: boolean }) {
    const atlas = this.textures.get('sidewalk_ref').getSourceImage() as HTMLImageElement;
    const rows = ref.south ? [[0, 4], [1, 5], [2, 6], [3, 9], [4, 10]] : [[0, 4], [1, 5], [2, 6]];
    for (let c = 0; c < ref.cols; c++)
      for (const [row, y] of rows) {
        const s = toScreen(ref.x0 + c, y);
        ctx.drawImage(atlas, c * TILE_W, row * TILE_H, TILE_W, TILE_H, s.x - HALF_W - ox, s.y - oy, TILE_W, TILE_H);
      }
  }

  /**
   * Adoquines reproducidos de la referencia en toda la calzada (casillas «cobble»): una de las N baldosas del atlas
   * por casilla, elegida sin repetir la de la izquierda ni la de arriba para que no se formen patrones.
   */
  private paintCobblesRef(ctx: CanvasRenderingContext2D, ox: number, oy: number, frames: number) {
    const atlas = this.textures.get('cobble_ref').getSourceImage() as HTMLImageElement;
    const pick: number[][] = [];
    for (let y = 0; y < MAP_H; y++) {
      pick[y] = [];
      for (let x = 0; x < MAP_W; x++) {
        if (groundKind(x, y) !== 'cobble') continue;
        let f = Math.floor((Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * frames);
        for (let i = 0; i < frames && (f === pick[y][x - 1] || f === pick[y - 1]?.[x]); i++) f = (f + 1) % frames;
        pick[y][x] = f;
        const s = toScreen(x, y);
        ctx.drawImage(atlas, f * TILE_W, 0, TILE_W, TILE_H, s.x - HALF_W - ox, s.y - oy, TILE_W, TILE_H);
      }
    }
  }

  // ───────────── Construcción ─────────────

  private buildBuildings() {
    for (const b of BUILDINGS) {
      const art = buildingArt(b);
      const key = `bld_${b.kind}_${b.x0}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, art.canvas);
      const s = toScreen(b.x0, b.y0);
      const ox = s.x - art.anchorX;
      const oy = s.y - art.anchorY;
      this.add.image(ox, oy, key).setOrigin(0, 0).setDepth(-50000 + b.x0);
      for (const l of art.lights) this.addGlow(ox + l.x, oy + l.y, l.color, l.r, l.alpha ?? 0.35, -40000, l.r > 40);
      this.collision.add(b.x0, b.y0, b.x0 + b.wx, b.y0 + b.wy + 0.2);
      this.minimap.push({
        rect: { x0: b.x0, y0: b.y0, x1: b.x0 + b.wx, y1: b.y0 + b.wy },
        color: b.kind === 'bar' ? 0xc8283c : b.kind === 'club' ? 0x7a4ab8 : b.kind === 'buergeramt' ? 0xc9b98f : 0xd9958a,
      });
    }
    // luz del bar y del club sobre la acera
    const bar = doorPos(BUILDINGS[2]);
    const bs = toScreen(bar.x, bar.y + 0.4);
    this.addGlow(bs.x, bs.y, PAL.lampGlow, 140, 0.22, -90000);
    this.addGlow(bs.x, bs.y, PAL.neonRed, 90, 0.18, -90000, true);
    const club = doorPos(BUILDINGS[3]);
    const cs = toScreen(club.x + 1, club.y + 0.5);
    this.addGlow(cs.x, cs.y, PAL.neonPink, 110, 0.22, -90000, true);

    const [home, amt, barB, clubB] = BUILDINGS;
    const hd = doorPos(home);
    // la puerta de casa abre el piso compartido desde la Misión 03
    const wgOpen = () => (GameState.isActive('wg') && !GameState.isActive('wg', 'invite')) || GameState.isDone('wg');
    this.interactables.push({
      x: hd.x,
      y: hd.y,
      radius: 1.1,
      label: () => (wgOpen() ? 'Entrar a casa (WG)' : 'Llamar al timbre'),
      action: () => (wgOpen() ? this.goTo('WG', { from: 'Street' }) : this.ui.openDialog('home_door')),
    });
    const sp = { x: 1.5, y: home.wy + 0.5 };
    this.interactables.push({ x: sp.x, y: sp.y, radius: 1.2, label: () => 'Mirar el Späti', action: () => this.ui.openDialog('spaeti') });
    const ad = doorPos(amt);
    // el Bürgeramt abre cuando Mehmet encarga la Anmeldung (al terminar la Misión 01)
    this.interactables.push({
      x: ad.x,
      y: ad.y,
      radius: 1.3,
      label: () => (GameState.isDone('shift') ? 'Entrar al Bürgeramt' : 'Bürgeramt (cerrado hoy)'),
      action: () => (GameState.isDone('shift') ? this.goTo('Amt', { from: 'Street' }) : this.ui.openDialog('buergeramt_door')),
    });
    const bd = doorPos(barB);
    this.interactables.push({ x: bd.x, y: bd.y, radius: 1.3, label: () => 'Entrar al bar', action: () => this.goTo('Bar', { from: 'Street' }) });
    const cd = doorPos(clubB);
    // cordón del club
    this.placeProp('bollard', cd.x - 0.7, cd.y + 0.35, { block: 0.25 });
    this.placeProp('bollard', cd.x + 0.8, cd.y + 0.35, { block: 0.25 });
    const a = toScreen(cd.x - 0.7, cd.y + 0.35);
    const b2 = toScreen(cd.x + 0.8, cd.y + 0.35);
    const rope = this.add.graphics().setDepth(depthOf(cd.x, cd.y + 0.36));
    rope.lineStyle(3, 0xc8283c, 1);
    rope.beginPath();
    rope.moveTo(a.x, a.y - 22);
    rope.lineTo((a.x + b2.x) / 2, (a.y + b2.y) / 2 - 14);
    rope.lineTo(b2.x, b2.y - 22);
    rope.strokePath();

    this.pois.push(
      { ...hd, icon: '🏠', label: 'Casa' },
      { ...ad, icon: '🏛️', label: 'Bürgeramt' },
      { ...bd, icon: '🍺', label: 'Bar' },
      { ...cd, icon: '🔒', label: 'Club' },
    );
  }

  private buildStreetFurniture() {
    // farolas berlinesas (PNG externo; sin él, la procedural). Sin farolas delante del Späti,
    // el Bürgeramt y el bar: solo la del club en la acera norte y las dos de la plaza.
    const lamp = this.propKey('lamp_berlin', 'lamp');
    for (const x of [21]) {
      this.placeProp(lamp, x, 5.75, { block: 0.3 });
      const s = toScreen(x, 5.75);
      this.addGlow(s.x, s.y, PAL.lampGlow, 110, 0.28, -90000);
    }
    for (const x of [7, 19]) {
      this.placeProp(lamp, x, 9.25, { block: 0.3 });
      const s = toScreen(x, 9.25);
      this.addGlow(s.x, s.y, PAL.lampGlow, 110, 0.28, -90000);
    }
    // árboles en los parterres
    this.placeProp('tree0', 1.4, 11.5, { block: 0.6 });
    this.placeProp('tree1', 10.6, 11.4, { block: 0.6 });
    this.placeProp('tree2', 22.4, 11.5, { block: 0.6 });
    // acera norte
    // bicis del Bike Pack 01 (PNG externos); sin ellos, las procedurales de siempre
    this.placeProp(this.propKey('bike_turquoise', 'bike_red'), 1.6, 4.75, { block: [0.9, 0.4] });
    this.placeProp(this.propKey('bike_black_basket', 'bike_blue'), 2.5, 4.75, { block: [0.9, 0.4] });
    this.placeProp('bin', 5.6, 4.6, { block: 0.4 });
    this.placeProp('planter0', 6.6, 4.55, { block: 0.5 });
    this.placeProp('planter1', 9.4, 4.55, { block: 0.5 });
    this.placeProp('terrace_table', 12.9, 4.75, { block: 0.6 });
    this.placeProp('chair', 13.5, 4.85);
    this.placeProp('terrace_table', 16.4, 4.75, { block: 0.6 });
    this.placeProp('chair', 15.8, 4.85, { flip: true });
    this.placeProp('chalkboard', 17.4, 5.0, { block: 0.4 });
    this.placeProp('bin', 23.4, 4.6, { block: 0.4 });
    // acera sur y plaza
    for (const x of [9.5, 10.5, 11.5]) this.placeProp('bollard', x, 9.2, { block: 0.25 });
    this.placeProp('street_sign', 12.6, 9.3, { block: 0.3 });
    this.placeProp('mailbox', 8.2, 9.4, { block: 0.4 });
    this.placeProp('litfass', 20.6, 10.4, { block: 0.8 });
    this.placeProp(this.propKey('bike_green_cargo', 'bike_green'), 17.2, 9.55, { block: [0.9, 0.4] });
    this.placeProp(this.propKey('bike_red_locked', 'bike_red'), 18.1, 9.55, { block: [0.9, 0.4] });
    this.placeProp('bench', 7.6, 12.2, { block: [1.6, 0.5] });
    this.placeProp('bench', 18.4, 12.2, { block: [1.6, 0.5] });
    this.placeProp('planter2', 12.4, 11.6, { block: 0.5 });
    this.placeProp('bin', 9.5, 12.3, { block: 0.4 });

    this.minimap.push(
      { rect: { x0: 0, y0: 6, x1: MAP_W, y1: 9 }, color: 0x8d8aa0 },
      { rect: { x0: 0, y0: 4, x1: MAP_W, y1: 6 }, color: 0xc9c3cf },
      { rect: { x0: 0, y0: 9, x1: MAP_W, y1: 13 }, color: 0xc9c3cf },
      { rect: { x0: 0, y0: 13, x1: MAP_W, y1: MAP_H }, color: 0x4f86c6 },
    );
  }

  /** Boca de metro: hueco con escaleras, barandillas verdes y dos señales. */
  private buildUbahn(x0: number, y0: number) {
    const wx = 2;
    const wy = 2;
    const top = 30;
    const W = (wx + wy) * HALF_W;
    const { canvas, ctx } = makeCanvas(W, (wx + wy) * HALF_H + top + 2);
    const D: [number, number] = [wy * HALF_W, top];
    const C: [number, number] = [W, top + wx * HALF_H];
    const B: [number, number] = [wx * HALF_W, top + (wx + wy) * HALF_H];
    const A: [number, number] = [0, top + wy * HALF_H];
    poly(ctx, [D, C, B, A], '#2a2238');
    // peldaños bajando desde el borde trasero
    for (let i = 1; i < 9; i++) {
      const t = i / 9;
      const ax = D[0] + (A[0] - D[0]) * t;
      const ay = D[1] + (A[1] - D[1]) * t;
      for (let u = 0; u < wx * HALF_W; u++) {
        rect(ctx, ax + u, ay + u / 2 + i * 1.5, 1, 2, shade('#9a96aa', 1 - i * 0.07));
        px(ctx, ax + u, ay + u / 2 + i * 1.5 + 2, '#5a5770');
      }
    }
    const rail = (a: [number, number], b: [number, number]) => {
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      for (let i = 0; i <= n; i++) {
        const x = a[0] + ((b[0] - a[0]) * i) / n;
        const y = a[1] + ((b[1] - a[1]) * i) / n;
        rect(ctx, x, y - 22, 1, 2, '#5f9a78');
        rect(ctx, x, y - 12, 1, 1, PAL.railGreen);
        if (i % 10 === 0) rect(ctx, x, y - 22, 2, 22, PAL.railGreen);
      }
    };
    rail(A, B);
    rail(D, A);
    rail(C, B);
    if (!this.textures.exists('ubahn_entrance')) this.textures.addCanvas('ubahn_entrance', canvas);
    const s = toScreen(x0, y0);
    this.add.image(s.x - wy * HALF_W, s.y - top, 'ubahn_entrance').setOrigin(0, 0).setDepth(depthOf(x0 + wx, y0 + wy) - 16);
    const g = toScreen(x0 + 1, y0 + 1);
    this.addGlow(g.x, g.y, '#ffe0b0', 50, 0.4, depthOf(x0, y0));
    this.collision.add(x0, y0 + 0.1, x0 + wx, y0 + wy);
    this.placeProp('ubahn_sign', x0 - 0.45, y0 - 0.2, { block: 0.3 });
    this.placeProp('ubahn_sign', x0 + wx + 0.35, y0 + wy - 0.2, { block: 0.3 });
    const entry = { x: x0 + 1, y: y0 - 0.35 };
    const ubahnOpen = () => (GameState.isActive('unterwegs') && !GameState.isActive('unterwegs', 'invite')) || GameState.isDone('unterwegs');
    this.interactables.push({
      x: entry.x,
      y: entry.y,
      radius: 1.3,
      label: () => (ubahnOpen() ? 'Bajar al U-Bahn (Moritzplatz)' : 'U-Bahnhof Moritzplatz'),
      action: () => (ubahnOpen() ? this.goTo('UBahn', { from: 'Street' }) : this.ui.openDialog('ubahn_before')),
    });
    this.pois.push({ ...entry, icon: 'U', label: 'U-Bahn' });
    this.minimap.push({ rect: { x0, y0, x1: x0 + wx, y1: y0 + wy }, color: 0x2a5ad8 });
  }

  /** Puesto de currywurst: caja isométrica con mostrador, toldo y letrero. */
  private buildImbiss(x0: number, y0: number) {
    const wx = 2;
    const wy = 1;
    const H = 70;
    const front = makeCanvas(wx * HALF_W, H);
    const f = front.ctx;
    rect(f, 0, 0, wx * HALF_W, H, '#ffd77a');
    rect(f, 0, 24, wx * HALF_W, 22, '#fff0bf');
    rect(f, 4, 28, wx * HALF_W - 8, 14, '#3a2418');
    for (let x = 6; x < wx * HALF_W - 6; x += 7) rect(f, x, 33, 4, 3, '#e8333a'); // salchichas
    rect(f, 0, 46, wx * HALF_W, 4, '#c94a4a');
    rect(f, 0, 50, wx * HALF_W, H - 50, '#e0675a');
    for (let x = 0; x < wx * HALF_W; x++) rect(f, x, 14, 1, 10, Math.floor(x / 6) % 2 ? '#c8283c' : '#ffffff');
    const label = 'CURRYWURST';
    rect(f, 2, 1, wx * HALF_W - 4, 12, '#2a2238');
    pixelText(f, label, Math.round((wx * HALF_W - textWidth(label)) / 2), 4, '#ffd77a');
    const side = makeCanvas(wy * HALF_W, H);
    rect(side.ctx, 0, 0, wy * HALF_W, H, shade('#ffd77a', 0.78));
    rect(side.ctx, 0, 50, wy * HALF_W, H - 50, shade('#e0675a', 0.78));
    const art = isoBox(wx, wy, H, { canvas: front.canvas }, { canvas: side.canvas }, flatTop('#e6e1ea', '#ffffff'));
    if (!this.textures.exists('imbiss')) this.textures.addCanvas('imbiss', art.canvas);
    const s = toScreen(x0, y0);
    this.add.image(s.x - art.anchorX, s.y - art.anchorY, 'imbiss').setOrigin(0, 0).setDepth(depthOf(x0 + wx / 2, y0 + wy));
    this.addGlow(toScreen(x0 + 1, y0 + 1).x, toScreen(x0 + 1, y0 + 1).y - 40, PAL.lampGlow, 60, 0.4, depthOf(x0 + 1, y0 + 1.1));
    this.collision.add(x0, y0, x0 + wx, y0 + wy);
    this.interactables.push({ x: x0 + 1, y: y0 + wy + 0.45, radius: 1.2, label: () => 'Pedir en el Imbiss', action: () => this.ui.openDialog('imbiss') });
    this.minimap.push({ rect: { x0, y0, x1: x0 + wx, y1: y0 + wy }, color: 0xffd77a });
  }

  private buildCanal() {
    for (let x = 0; x < MAP_W; x++) {
      const s = toScreen(x, 12.85);
      this.add.image(Math.round(s.x), Math.round(s.y) - 22, 'railing').setOrigin(0, 0).setDepth(depthOf(x + 0.5, 12.85));
    }
    for (let i = 0; i < 30; i++) {
      const s = toScreen(Math.random() * MAP_W, 13.3 + Math.random() * 1.6);
      const sp = this.add.image(Math.round(s.x), Math.round(s.y), 'dot').setTint(0xd8ecff).setAlpha(0).setDepth(-95000).setScale(2, 1);
      this.tweens.add({ targets: sp, alpha: { from: 0, to: 0.9 }, duration: 900 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 3000 });
    }
  }

  // ───────────── NPCs ─────────────

  private spawnNpcs() {
    const npc = (key: string, name: string, x: number, y: number, dialog: () => string, onAction?: (a: string) => void) => {
      const a = this.addActor(new Actor(this, key, name, x, y));
      a.speed = 1.6;
      this.interactables.push({
        get x() {
          return a.wx;
        },
        get y() {
          return a.wy;
        },
        radius: 1.3,
        label: () => (a.visible ? `Hablar con ${name}` : null),
        action: () => {
          a.face(this.player.pos);
          this.ui.openDialog(dialog(), a, onAction);
        },
      });
      return a;
    };

    const anna = npc(
      'anna',
      'Anna',
      2.5,
      5.3,
      () =>
        GameState.isActive('wg', 'invite')
          ? 'anna_wg_invite'
          : GameState.isActive('anmeldung', 'get_wgb')
            ? 'anna_wgb'
            : GameState.isDone('wg')
              ? 'anna_after_wg'
              : GameState.isActive('shift', 'go_bar')
                ? 'anna_new'
                : 'anna',
      (a) => {
        if (a === 'wg:invited' && GameState.isActive('wg', 'invite')) GameState.setQuest('enter');
        if (a !== 'give_wgb' || !GameState.isActive('anmeldung', 'get_wgb')) return;
        GameState.addItem('wgb');
        GameState.setQuest('go_amt');
        this.ui.toast({ title: 'Has recibido: die Wohnungsgeberbestätigung', lines: ['Llévala al Bürgeramt (edificio beige con bandera).'], tone: 'acid' });
      },
    );
    this.anna = anna;
    const home = doorPos(BUILDINGS[0]);
    // en la invitación de la Misión 03, Anna espera junto a la puerta de casa
    if (GameState.isActive('wg', 'invite')) {
      anna.setPos(home.x + 0.9, home.y + 0.5);
      this.brains.push(new StaticBrain(this, anna, 'SW', ['Hallo! Komm mal her!', '¡Hola! ¡Ven un momento!']));
    } else this.brains.push(
      new PatrolBrain(this, anna, [
        { x: 8, y: 5.2, wait: 2, say: ['Wieder geschlossen…', 'Otra vez cerrado…'] },
        { ...doorPos(BUILDINGS[2]), hide: 12 },
        { x: 10, y: 7.2, wait: 1 },
        { ...home, hide: 9 },
      ]),
    );

    const jonas = npc('jonas', 'Jonas', 20, 7.5, () => 'jonas');
    jonas.speed = 2;
    this.brains.push(
      new PatrolBrain(this, jonas, [
        { x: 22, y: 7.6, wait: 1 },
        { x: 4, y: 9.55, hide: 8 },
        { x: 15, y: 9.8, wait: 2, say: ['Wo ist mein Handy…?', '¿Dónde está mi móvil…?'] },
      ]),
    );

    const klaus = npc('klaus', 'Klaus', 7.6, 12.2, () => 'klaus');
    klaus.speed = 1;
    this.brains.push(new BenchBrain(this, klaus, { x: 7.6, y: 12.2 }, 'SW', { x: 8.6, y: 10.1 }));

    const lea = npc('lea', 'Lea', 14.2, 5.7, () => 'lea');
    const mia = npc('guest4', 'Mia', 15.1, 6.3, () => 'lea');
    const chat: [string, string][] = [
      ['Schön hier!', '¡Qué bonito!'],
      ['Ja, stimmt!', '¡Sí, es verdad!'],
      ['Gehen wir später in den Club?', '¿Vamos luego al club?'],
      ['Klar! Um Mitternacht.', '¡Claro! A medianoche.'],
    ];
    this.brains.push(new ChatBrain(this, lea, mia, chat, true), new ChatBrain(this, mia, lea, chat, false));

    const cd = doorPos(BUILDINGS[3]);
    const bouncer = npc('bouncer', 'Türsteher', cd.x + 0.05, cd.y + 0.05, () => 'bouncer');
    this.brains.push(new StaticBrain(this, bouncer, 'SW', ['Heute nicht.', 'Hoy no.']));
  }

  protected worldUpdate(dt: number) {
    for (const b of this.brains) b.update(dt);
  }
}

function groundKind(x: number, y: number): string | null {
  if (y <= 4) return 'slab';
  if (y === 5) return 'curb';
  if (y >= 6 && y <= 8) return 'cobble';
  if (y === 9 || y === 10 || y === 12) return 'slab';
  if (y === 11) return (x >= 2 && x <= 5) || (x >= 12 && x <= 17) ? 'slab' : 'grass';
  return 'water';
}
