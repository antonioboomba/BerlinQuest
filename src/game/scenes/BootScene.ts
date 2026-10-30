import Phaser from 'phaser';
import { CHARACTERS, FRAME_H, FRAME_W } from '../art/characters';
import { PAL } from '../art/palette';
import { glowCanvas, makeCanvas, rect } from '../art/pixel';
import * as P from '../art/props';
import { addProceduralSheet, handAnchor, propInfo, registerCharacterAnims, sheetError, type AssetManifest } from '../art/sprites';
import { TILE_VARIANTS, tileCanvas, type TileKind } from '../art/tiles';
import { DRINKS } from '../data/bar';
import { GameState } from '../state/GameState';

/**
 * Carga los sprites externos aprobados (public/assets/manifest.json), genera el resto de texturas
 * de forma procedural y registra las animaciones.
 */
export class BootScene extends Phaser.Scene {
  private manifest: AssetManifest = {};

  constructor() {
    super('Boot');
  }

  preload() {
    // si el manifiesto falta, el juego sigue con el arte procedural
    this.load.json('asset_manifest', 'assets/manifest.json');
  }

  create() {
    this.manifest = (this.cache.json.get('asset_manifest') ?? {}) as AssetManifest;
    let queued = 0;
    for (const [key, entry] of Object.entries(this.manifest.characters ?? {})) {
      if (!entry?.enabled || !CHARACTERS[key]) continue;
      this.load.spritesheet(key, `assets/${entry.file}`, { frameWidth: FRAME_W, frameHeight: FRAME_H });
      queued++;
    }
    // objetos de la ciudad dibujados a mano (bicis…): se cargan con su nombre del manifiesto
    for (const [key, entry] of Object.entries(this.manifest.props ?? {})) {
      if (!entry?.enabled) continue;
      this.load.image(key, `assets/${entry.file}`);
      queued++;
    }
    // acera reproducida de la referencia (atlas de baldosas)
    const ref = this.manifest.ground?.sidewalk_ref;
    if (ref?.enabled) {
      this.load.image('sidewalk_ref', `assets/${ref.file}`);
      queued++;
    }
    const cob = this.manifest.ground?.cobble_ref;
    if (cob?.enabled) {
      this.load.image('cobble_ref', `assets/${cob.file}`);
      queued++;
    }
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`[sprites] No se pudo cargar ${file.src}; se usa el arte procedural.`));
    if (!queued) return this.build();
    this.load.once('complete', () => this.build());
    this.load.start();
  }

  private build() {
    GameState.load();
    const tex = this.textures;

    // ── Personajes: PNG externo aprobado y válido, o arte procedural de respaldo ──
    for (const [key, style] of Object.entries(CHARACTERS)) {
      if (tex.exists(key)) {
        const err = sheetError(tex.get(key));
        if (err) {
          console.warn(`[sprites] ${key}.png ${err}; se usa el arte procedural.`);
          tex.remove(key);
        } else {
          console.info(`[sprites] ${key}: usando PNG externo.`);
          // la posición de la mano solo vale para el PNG que la define, no para el respaldo procedural
          const entry = this.manifest.characters?.[key];
          const hand = entry ? handAnchor(entry) : null;
          if (hand) this.registry.set(`hand:${key}`, hand);
          else if (entry?.hand) console.warn(`[sprites] ${key}: posición de mano no válida en el manifiesto; se usa la predeterminada.`);
        }
      }
      if (!tex.exists(key)) addProceduralSheet(tex, key, style);
      registerCharacterAnims(this.anims, key);
    }

    // ── Objetos externos: válidos → se registran; si no, se descartan y se usa el arte procedural ──
    for (const [key, entry] of Object.entries(this.manifest.props ?? {})) {
      if (!entry?.enabled || !tex.exists(key)) continue;
      const info = propInfo(tex.get(key), entry);
      if (typeof info === 'string') {
        console.warn(`[sprites] ${entry.file} ${info}; se usa el arte procedural.`);
        tex.remove(key);
      } else {
        this.registry.set(`prop:${key}`, info);
        // halo opcional: usa el mismo sistema de luces que los objetos procedurales
        if (entry.glow) this.registry.set(`lights:${key}`, [{ x: entry.glow.x, y: entry.glow.y, r: entry.glow.r, color: entry.glow.color ?? PAL.lampGlow }]);
        console.info(`[sprites] ${key}: usando PNG externo.`);
      }
    }

    // ── Suelos ──
    const kinds: TileKind[] = ['cobble', 'slab', 'curb', 'grass', 'water', 'wood', 'tiles', 'carpet', 'asphaltDark', 'lino', 'carpetBlue', 'trackX', 'trackY', 'edgeX', 'edgeY', 'plaza'];
    for (const k of kinds) for (let v = 0; v < TILE_VARIANTS; v++) tex.addCanvas(`tile_${k}_${v}`, tileCanvas(k, v));
    // acera reproducida de la referencia (atlas)
    const ref = this.manifest.ground?.sidewalk_ref;
    // solo si el atlas cargó y tiene filas completas de 64×32; si no, se queda el suelo de antes
    if (ref?.enabled && tex.exists('sidewalk_ref')) {
      const img = tex.get('sidewalk_ref').getSourceImage() as { width: number; height: number };
      // 3 filas = acera norte (y 4, y 5, cara del bordillo en y 6); 5 filas = además la acera sur (y 9, y 10)
      if (img.width % 64 === 0 && (img.height === 96 || img.height === 160))
        this.registry.set('ground:sidewalk_ref', { x0: ref.x0 ?? 0, cols: img.width / 64, south: img.height === 160 });
      else console.warn(`[sprites] ${ref.file} mide ${img.width}×${img.height}; se esperaba N×64 × 96 o 160. Se usa la acera de antes.`);
    }
    // adoquines de la calzada: N baldosas de 64×32 en fila; si no, los adoquines procedurales de antes
    const cob = this.manifest.ground?.cobble_ref;
    if (cob?.enabled && tex.exists('cobble_ref')) {
      const img = tex.get('cobble_ref').getSourceImage() as { width: number; height: number };
      if (img.width % 64 === 0 && img.width > 0 && img.height === 32) this.registry.set('ground:cobble_ref', img.width / 64);
      else console.warn(`[sprites] ${cob.file} mide ${img.width}×${img.height}; se esperaba N×64 × 32. Se usan los adoquines de antes.`);
    }

    // ── Objetos ──
    const add = (key: string, art: P.PropArt) => {
      if (tex.exists(key)) return; // ya lo sustituye un PNG externo válido
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
    // Misión 04: U-Bahn y Alexanderplatz
    add('ticket_machine', P.ticketMachine());
    add('netzplan', P.netzplan(['Moritzplatz', 'Heinrich-Heine-Straße', 'Jannowitzbrücke', 'Alexanderplatz'], 0));
    add('weltzeituhr', P.weltzeituhr());
    add('fountain', P.fountain());
    tex.addCanvas('fernsehturm', P.fernsehturm());
    add('platform_bench', P.platformBench());
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
