import Phaser from 'phaser';
import { CHARACTERS, drawCharacterSheet, FRAME_H, FRAME_W, FRAMES } from '../art/characters';
import { PAL } from '../art/palette';
import { glowCanvas, makeCanvas, rect } from '../art/pixel';
import * as P from '../art/props';
import { TILE_VARIANTS, tileCanvas, type TileKind } from '../art/tiles';
import { DRINKS } from '../data/bar';
import { GameState } from '../state/GameState';

/** Genera todas las texturas procedurales y registra las animaciones. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    GameState.load();
    const tex = this.textures;

    // ── Personajes: hoja de 20 frames + animaciones ──
    for (const [key, style] of Object.entries(CHARACTERS)) {
      const canvas = drawCharacterSheet(style);
      const t = tex.addCanvas(key, canvas)!;
      const n = canvas.width / FRAME_W;
      for (let i = 0; i < n; i++) t.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
      for (const [side, off] of [['front', 0], ['back', 10]] as const) {
        const mk = (name: string, frames: readonly number[], rate: number) =>
          this.anims.create({
            key: `${key}:${side}:${name}`,
            frames: frames.map((f) => ({ key, frame: f + off })),
            frameRate: rate,
            repeat: -1,
          });
        mk('idle', FRAMES.idle, 2);
        mk('walk', FRAMES.walk, 8);
        mk('carryIdle', FRAMES.carryIdle, 1);
        mk('carryWalk', FRAMES.carryWalk, 8);
        mk('sit', FRAMES.sit, 1);
      }
    }

    // ── Suelos ──
    const kinds: TileKind[] = ['cobble', 'slab', 'curb', 'grass', 'water', 'wood', 'tiles', 'carpet', 'asphaltDark', 'lino', 'carpetBlue'];
    for (const k of kinds) for (let v = 0; v < TILE_VARIANTS; v++) tex.addCanvas(`tile_${k}_${v}`, tileCanvas(k, v));

    // ── Objetos ──
    const add = (key: string, art: P.PropArt) => {
      tex.addCanvas(key, art.canvas);
      this.registry.set(`lights:${key}`, art.lights ?? []);
    };
    add('lamp', P.lamp());
    for (let i = 0; i < 3; i++) add(`tree${i}`, P.tree(31 + i * 17));
    add('bike_red', P.bike('#c0392b'));
    add('bike_blue', P.bike('#2b6cb0'));
    add('bike_green', P.bike('#3a8a4a'));
    add('bollard', P.bollard());
    add('bin', P.bin());
    add('bench', P.bench());
    for (let i = 0; i < 3; i++) add(`planter${i}`, P.planter(5 + i * 9));
    add('ubahn_sign', P.ubahnSign());
    add('litfass', P.litfass());
    add('chalkboard', P.chalkboard(['BIER 3€', 'WEIN 4€', 'LIMO 2€']));
    add('mailbox', P.mailbox());
    add('amt_seat', P.waitSeat());
    add('amt_seat_back', P.waitSeatBack());
    add('form_rack', P.formRack());
    add('pult', P.pult());
    add('cooler', P.waterCooler());
    add('monitor', P.monitor());
    tex.addCanvas('marker', P.marker());
    // Misión 03: piso compartido
    add('karton_lampe', P.umzugskarton('LAMPE'));
    add('karton_buecher', P.umzugskarton('BÜCHER'));
    add('karton_kissen', P.umzugskarton('KISSEN'));
    for (const id of Object.keys(P.CARRY_ART)) tex.addCanvas(`carry_${id}`, P.carryIcon(id));
    add('placed_lampe', P.deskLamp());
    add('placed_buecher', P.bookRow());
    add('placed_kissen', P.pillow());
    add('toilet', P.toilet());
    add('washbasin', P.washbasin());
    add('dishes', P.dishes());
    add('stove_top', P.stoveTop());
    add('faucet', P.faucet());
    add('putzplan', P.putzplanSheet());
    add('plate_zimmer', P.roomPlate('DEIN ZIMMER'));
    add('floor_lamp', P.floorLamp());
    add('street_sign', P.streetSign('KREUZBERG'));
    add('railing', P.railingX());
    add('terrace_table', P.terraceTable());
    add('chair', P.chair());
    add('bar_stool', P.barStool());
    add('round_table', P.roundTable());
    add('hanging_lamp', P.hangingLamp());
    for (let i = 0; i < 2; i++) add(`plant${i}`, P.pottedPlant(11 + i * 5));
    for (const d of DRINKS) tex.addCanvas(`drink_${d.id}`, P.drinkIcon(d.id));
    tex.addCanvas('cash', P.cashIcon());

    // ── Luces y utilidades ──
    tex.addCanvas('glow_warm', glowCanvas(64, PAL.lampGlow));
    tex.addCanvas('glow_white', glowCanvas(64, '#ffffff'));
    const shadow = makeCanvas(40, 14);
    shadow.ctx.fillStyle = 'rgba(28,23,38,0.8)';
    shadow.ctx.beginPath();
    shadow.ctx.ellipse(20, 7, 18, 6, 0, 0, Math.PI * 2);
    shadow.ctx.fill();
    tex.addCanvas('shadow', shadow.canvas);
    const dot = makeCanvas(4, 2);
    rect(dot.ctx, 0, 0, 4, 2, '#ffffff');
    tex.addCanvas('dot', dot.canvas);

    const loc = GameState.data.location;
    this.scene.launch('UI');
    const known = loc && loc.scene !== 'Boot' && loc.scene !== 'UI' && this.scene.manager.keys[loc.scene];
    this.scene.start(known ? loc!.scene : 'Street', loc ? { x: loc.x, y: loc.y } : undefined);
  }
}
