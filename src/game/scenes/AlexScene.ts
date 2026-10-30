import { buildingArt, type BuildingSpec } from '../art/buildings';
import { PAL } from '../art/palette';
import { makeCanvas, poly, rect, shade } from '../art/pixel';
import { depthOf, HALF_H, HALF_W, toScreen } from '../iso';
import { GameState } from '../state/GameState';
import { Actor } from '../world/Actor';
import type { Pt } from '../world/Collision';
import { PatrolBrain, StaticBrain, type Brain } from '../world/Npc';
import { WorldScene } from './WorldScene';

// Segunda zona: Alexanderplatz (Mitte). Plaza con la Weltzeituhr, fuente, Fernsehturm de fondo y la U8.

const MAP_W = 20;
const MAP_H = 14;
const UHR: Pt = { x: 10, y: 8.5 };
const UBAHN: Pt = { x: 15.5, y: 10.2 };

const BLOCKS: (BuildingSpec & { x0: number; y0: number })[] = [
  { kind: 'office', x0: 0, y0: 0, wx: 7, wy: 4, floors: 3, color: '#c9cfdc', seed: 81, doorBay: 3, sign: 'KAUFHAUS' },
  { kind: 'office', x0: 7, y0: 0, wx: 6, wy: 4, floors: 4, color: '#b8c4d8', seed: 83, doorBay: 2, sign: 'HOTEL' },
  { kind: 'office', x0: 13, y0: 0, wx: 7, wy: 4, floors: 3, color: '#d8cfc0', seed: 87, doorBay: 3, sign: 'CAFE' },
];

export class AlexScene extends WorldScene {
  readonly displayName = 'Alexanderplatz';
  private brains: Brain[] = [];
  private emre: Actor | null = null;

  constructor() {
    super('Alex');
  }

  create(data?: { x?: number; y?: number; from?: string }) {
    this.initWorld({ x0: 0.3, y0: 4.3, x1: MAP_W - 0.3, y1: MAP_H - 0.3 });
    this.brains = [];
    this.cameras.main.setBackgroundColor('#22304e');
    this.paintGround(MAP_W, MAP_H, (x, y) => (y <= 4 ? 'slab' : (x <= 1 || x >= 18) && y >= 11 ? 'grass' : 'plaza'), 'ground_alex');

    // Fernsehturm detrás de los edificios
    const t = toScreen(9, -3);
    this.add.image(t.x, t.y + 40, 'fernsehturm').setOrigin(0.5, 1).setDepth(-70000);
    for (const b of BLOCKS) {
      const art = buildingArt(b);
      const key = `alex_${b.x0}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, art.canvas);
      const s = toScreen(b.x0, b.y0);
      const ox = s.x - art.anchorX;
      const oy = s.y - art.anchorY;
      this.add.image(ox, oy, key).setOrigin(0, 0).setDepth(-50000 + b.x0);
      for (const l of art.lights) this.addGlow(ox + l.x, oy + l.y, l.color, l.r, l.alpha ?? 0.3, -40000);
      this.collision.add(b.x0, b.y0, b.x0 + b.wx, b.y0 + b.wy + 0.2);
      this.minimap.push({ rect: { x0: b.x0, y0: b.y0, x1: b.x0 + b.wx, y1: b.y0 + b.wy }, color: 0x9aa4b8 });
    }
    this.minimap.push({ rect: { x0: 0, y0: 4, x1: MAP_W, y1: MAP_H }, color: 0xd8d0dc });

    this.placeProp('weltzeituhr', UHR.x, UHR.y, { block: 1.1 });
    this.placeProp('fountain', 4.5, 10.8, { block: [3, 1.4] });
    this.buildUbahn();
    for (const [x, y] of [[2, 6.2], [18, 6.2], [1, 12.5], [18.6, 12.4]]) this.placeProp(`tree${(x + y) % 3 | 0}`, x, y, { block: 0.6 });
    for (const x of [6, 14]) {
      this.placeProp('lamp', x, 5.6, { block: 0.3 });
      const s = toScreen(x, 5.6);
      this.addGlow(s.x, s.y, PAL.lampGlow, 100, 0.25, -90000);
    }
    this.placeProp('bench', 12.5, 12.6, { block: [1.6, 0.5] });
    this.placeProp('litfass', 8, 12.4, { block: 0.8 });

    const start = this.safeStart(data?.from === 'Train' || data?.from === 'Street' ? null : data?.x !== undefined ? { x: data.x, y: data.y! } : null, {
      x: UBAHN.x - 0.5,
      y: UBAHN.y + 1.3,
    });
    this.player = this.addActor(new Actor(this, 'player', GameState.data.name, start.x, start.y));
    this.player.facing = 'NW';
    this.setupCamera(this.player);
    const tl = toScreen(0, MAP_H);
    const br = toScreen(MAP_W, 0);
    this.cameras.main.setBounds(tl.x - 64, -560, br.x - tl.x + 128, toScreen(MAP_W, MAP_H).y + 600);

    this.spawnPeople();
    if (GameState.isActive('unterwegs', 'ride')) GameState.setQuest('meet');
    if (data?.from === 'Train') this.time.delayedCall(500, () => this.ui.toast({ title: 'Alexanderplatz', lines: ['Bienvenido/a a Mitte. Busca la Weltzeituhr.'], tone: 'blue' }));

    this.interactables.push({
      x: UBAHN.x,
      y: UBAHN.y + 0.9,
      radius: 1.3,
      label: () => 'U8 Richtung Hermannstraße → Moritzplatz',
      action: () => {
        this.ui.toast({ title: '🚇 U8 → Moritzplatz', lines: ['Vuelves a Kreuzberg: Jannowitzbrücke, Heinrich-Heine-Straße, Moritzplatz.'], tone: 'blue' });
        this.goTo('Street', { from: 'UBahn' });
      },
    });
    this.pois.push({ ...UHR, icon: '🕰️', label: 'Weltzeituhr' }, { x: UBAHN.x, y: UBAHN.y, icon: 'U', label: 'U8' });
    this.objectivePoi = () => (GameState.isActive('unterwegs', 'meet') && this.emre ? this.emre.pos : null);
    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.savePosition() });
    this.events.once('shutdown', () => this.savePosition());
  }

  /** Boca de metro con escaleras y barandilla, como la de Kreuzberg. */
  private buildUbahn() {
    const x0 = UBAHN.x - 1;
    const y0 = UBAHN.y - 1;
    const wx = 2;
    const wy = 2;
    const top = 30;
    if (!this.textures.exists('alex_ubahn')) {
      const W = (wx + wy) * HALF_W;
      const { canvas, ctx } = makeCanvas(W, (wx + wy) * HALF_H + top + 2);
      const D: [number, number] = [wy * HALF_W, top];
      const C: [number, number] = [W, top + wx * HALF_H];
      const B: [number, number] = [wx * HALF_W, top + (wx + wy) * HALF_H];
      const A: [number, number] = [0, top + wy * HALF_H];
      poly(ctx, [D, C, B, A], '#2a2238');
      for (let i = 1; i < 9; i++) {
        const tt = i / 9;
        const ax = D[0] + (A[0] - D[0]) * tt;
        const ay = D[1] + (A[1] - D[1]) * tt;
        for (let u = 0; u < wx * HALF_W; u++) rect(ctx, ax + u, ay + u / 2 + i * 1.5, 1, 2, shade('#9a96aa', 1 - i * 0.07));
      }
      const rail = (a: [number, number], b: [number, number]) => {
        const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
        for (let i = 0; i <= n; i++) {
          const x = a[0] + ((b[0] - a[0]) * i) / n;
          const y = a[1] + ((b[1] - a[1]) * i) / n;
          rect(ctx, x, y - 22, 1, 2, '#9aa4b8');
          if (i % 10 === 0) rect(ctx, x, y - 22, 2, 22, '#5a6278');
        }
      };
      rail(D, A);
      rail(C, B);
      rail(D, C);
      this.textures.addCanvas('alex_ubahn', canvas);
    }
    const s = toScreen(x0, y0);
    this.add.image(s.x - wy * HALF_W, s.y - top, 'alex_ubahn').setOrigin(0, 0).setDepth(depthOf(x0 + wx, y0 + wy) - 16);
    this.collision.add(x0, y0, x0 + wx, y0 + wy - 0.1);
    this.placeProp('ubahn_sign', x0 + wx + 0.4, y0 + wy + 0.1, { block: 0.3 });
    this.minimap.push({ rect: { x0, y0, x1: x0 + wx, y1: y0 + wy }, color: 0x2a5ad8 });
  }

  private spawnPeople() {
    const tourist = this.addActor(new Actor(this, 'guest1', 'Touristin', 6, 7));
    tourist.speed = 1.3;
    this.brains.push(
      new PatrolBrain(this, tourist, [
        { x: 12, y: 7, wait: 3, say: ['Wow, der Fernsehturm!', '¡Guau, la torre de televisión!'] },
        { x: 7, y: 9.5, wait: 2 },
      ]),
    );
    const local = this.addActor(new Actor(this, 'citizen2', 'Berliner', 16, 7.5));
    local.speed = 1.6;
    this.brains.push(
      new PatrolBrain(this, local, [
        { x: 3, y: 7.2, wait: 1 },
        { x: 16, y: 7.5, wait: 1 },
      ]),
    );
    // Emre espera en el reloj durante la misión (y se queda un rato después)
    if (GameState.isActive('unterwegs') || !GameState.isDone('unterwegs') || GameState.flag('emre_at_alex')) {
      const e = this.addActor(new Actor(this, 'emre', 'Emre', UHR.x + 1.1, UHR.y + 0.7));
      this.emre = e;
      this.brains.push(new StaticBrain(this, e, 'SW', ['Hey! Hier drüben!', '¡Eh! ¡Aquí!']));
      this.interactables.push({
        x: e.wx,
        y: e.wy,
        radius: 1.3,
        label: () => 'Hablar con Emre',
        action: () => {
          e.face(this.player.pos);
          if (GameState.isActive('unterwegs', 'meet'))
            this.ui.openDialog('emre_alex', e, (a) => {
              if (a === 'quest:complete_unterwegs' && GameState.isActive('unterwegs')) {
                GameState.setFlag('alex_unlocked');
                GameState.setFlag('emre_at_alex');
                GameState.completeQuest();
              }
            });
          else this.ui.openDialog('emre_alex_idle', e);
        },
      });
    }
  }

  protected worldUpdate(dt: number) {
    for (const b of this.brains) b.update(dt);
  }
}
