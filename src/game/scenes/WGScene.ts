import { cabinets, plain, shelfFront, woodPanels } from '../art/furni';
import { pixelText, textWidth } from '../art/font';
import { PAL } from '../art/palette';
import { rect, type Ctx } from '../art/pixel';
import { GameState } from '../state/GameState';
import type { Actor } from '../world/Actor';
import type { Pt } from '../world/Collision';
import { PatrolBrain } from '../world/Npc';
import { InteriorScene } from './InteriorScene';

// Misión 03 — Die WG: piso compartido con cocina, baño, salón y la habitación del jugador.

const W = 14;
const H = 10;
const DOOR: Pt = { x: 7, y: 9.6 };

/** Objetos de la mudanza: caja, dónde va y cómo se dice. */
const ITEMS_WG = [
  { id: 'lampe', label: 'LAMPE', box: { x: 4.4, y: 8.6 }, target: 'desk', de: 'die Lampe', rule: 'Die Lampe kommt auf den Schreibtisch (auf + acusativo).' },
  { id: 'buecher', label: 'BÜCHER', box: { x: 5.3, y: 8.9 }, target: 'shelf', de: 'die Bücher', rule: 'Die Bücher kommen ins Regal (in + das = ins).' },
  { id: 'kissen', label: 'KISSEN', box: { x: 4.6, y: 7.6 }, target: 'bed', de: 'das Kissen', rule: 'Das Kissen kommt aufs Bett (auf + das = aufs).' },
];
const TARGETS: Record<string, { at: Pt; name: string; place: { key: string; x: number; y: number; h: number } }> = {
  desk: { at: { x: 11, y: 8.05 }, name: 'el escritorio (der Schreibtisch)', place: { key: 'placed_lampe', x: 10.6, y: 9.0, h: 30 } },
  shelf: { at: { x: 9.5, y: 6.95 }, name: 'la estantería (das Regal)', place: { key: 'placed_buecher', x: 9.5, y: 6.38, h: 34 } },
  bed: { at: { x: 11.85, y: 6.7 }, name: 'la cama (das Bett)', place: { key: 'placed_kissen', x: 12.9, y: 6.1, h: 24 } },
};
const SINK: Pt = { x: 3.5, y: 2.0 };
const PLAN: Pt = { x: 5.1, y: 2.0 };

export class WGScene extends InteriorScene {
  readonly displayName = 'Tu WG · Oranienstraße 25';
  private sophie!: Actor;
  private emre!: Actor;
  private dishesImg: Phaser.GameObjects.Image | null = null;

  constructor() {
    super('WG');
  }

  create(data?: { x?: number; y?: number; from?: string }) {
    this.buildRoom({
      key: 'wg',
      w: W,
      h: H,
      wallH: 140,
      door: DOOR,
      background: '#121626',
      wallTop: '#fff6e8',
      edge: '#b08a6a',
      floor: (x, y) => (x < 6 && y < 4 ? 'tiles' : x >= 10 && y < 4 ? 'lino' : x >= 9 && y >= 5 ? 'carpetBlue' : x >= 6 && x <= 8 && y >= 2 && y <= 3 ? 'carpet' : 'wood'),
      back: (ctx, w, h) => this.paintBack(ctx, w, h),
      side: (ctx, w, h) => this.paintSide(ctx, w, h),
    });
    this.buildFurniture();
    this.spawnPlayer(data);
    this.addExit('Salir a la calle', 'Street', { from: 'WG' });
    this.spawnRoommates();

    if (GameState.isActive('wg', 'enter')) {
      GameState.setQuest('meet');
      this.time.delayedCall(600, () => this.sophie.say('Hallo! Du musst {name} sein!'.replace('{name}', GameState.data.name), '¡Hola! ¡Tú debes de ser {name}!'.replace('{name}', GameState.data.name), 3500));
    }
    this.objectivePoi = () => this.objective();
  }

  // ───────────── Arte ─────────────

  private paintBack(ctx: Ctx, w: number, h: number) {
    rect(ctx, 0, 0, w, h, '#f2e6d0');
    for (let x = 0; x < w; x += 16) rect(ctx, x, 0, 1, h - 30, '#eadbc0');
    rect(ctx, 0, h - 30, w, 30, '#d9c6a8');
    rect(ctx, 0, h - 32, w, 3, '#ffffff');
    // azulejos de cocina (u 0..192)
    for (let y = 40; y < h - 30; y += 10) for (let x = 0; x < 190; x += 10) rect(ctx, x, y, 9, 9, (x + y) % 20 ? '#e6f4f4' : '#cfeaea');
    // azulejos de baño (u 320..448)
    for (let y = 20; y < h - 30; y += 10) for (let x = 320; x < w; x += 10) rect(ctx, x, y, 9, 9, '#d8ecff');
    // ventana del salón
    rect(ctx, 220, 24, 60, 70, '#ffffff');
    rect(ctx, 224, 28, 52, 62, '#a8d4ff');
    rect(ctx, 224, 28, 52, 20, '#d8ecff');
    rect(ctx, 249, 28, 2, 62, '#ffffff');
    rect(ctx, 214, 22, 72, 4, '#e0675a'); // barra de cortina
    rect(ctx, 214, 26, 8, 70, '#e0675a');
    rect(ctx, 278, 26, 8, 70, '#e0675a');
    // póster
    rect(ctx, 296, 34, 20, 28, '#2a2238');
    rect(ctx, 298, 36, 16, 24, '#a77bff');
    rect(ctx, 302, 42, 8, 8, '#ffd77a');
    // rótulos de habitaciones
    const plate = (text: string, cx: number, y: number) => {
      const tw = textWidth(text, 2);
      rect(ctx, cx - tw / 2 - 6, y, tw + 12, 18, '#2a2238');
      pixelText(ctx, text, cx - tw / 2, y + 4, '#ffd77a', 2);
    };
    plate('KÜCHE', 96, 10);
    plate('WOHNZIMMER', 250, 4);
    plate('BAD', 384, 6);
  }

  private paintSide(ctx: Ctx, w: number, h: number) {
    rect(ctx, 0, 0, w, h, '#ead9bc');
    rect(ctx, 0, h - 30, w, 30, '#d9c6a8');
    rect(ctx, 0, h - 32, w, 3, '#ffffff');
    for (let y = 40; y < h - 30; y += 10) for (let x = 192; x < w; x += 10) rect(ctx, x, y, 9, 9, (x + y) % 20 ? '#e6f4f4' : '#cfeaea');
    // fotos y planta colgante
    for (const [x, c] of [[40, '#5fc2c0'], [80, '#e0675a'], [120, '#ffd77a']] as [number, string][]) {
      rect(ctx, x, 40, 28, 22, '#ffffff');
      rect(ctx, x + 2, 42, 24, 18, c);
    }
    rect(ctx, 30, 74, 130, 4, PAL.woodDark); // perchero
    for (const x of [50, 90, 130]) rect(ctx, x, 78, 4, 10, '#9aa4b8');
    rect(ctx, 84, 82, 14, 26, '#3b5bdb'); // chaqueta colgada
  }

  private buildFurniture() {
    // cocina
    this.addBox('wg_counter', 0.4, 0.4, 4, 1, 40, { front: cabinets('#5fc2c0'), side: cabinets('#4aa8a6'), top: '#e6e1ea', edge: '#ffffff' });
    this.placeOnTop('stove_top', 1.9, 0.95, 40);
    this.placeOnTop('faucet', 3.75, 0.85, 40);
    if (!GameState.flag('dishes_clean')) this.dishesImg = this.placeOnTop('dishes', 3.3, 0.95, 40, 2);
    this.addBox('wg_fridge', 4.6, 0.4, 1, 1, 84, {
      front: (c, w, h) => {
        rect(c, 0, 0, w, h, '#f2f4f8');
        rect(c, 0, 30, w, 2, '#c9cfdc');
        rect(c, w - 6, 8, 2, 16, '#9aa4b8');
        rect(c, w - 6, 38, 2, 24, '#9aa4b8');
      },
      side: plain('#d8dde8'),
      top: '#e6e9f0',
      edge: '#ffffff',
    });
    this.placeOnTop('putzplan', 5.15, 1.45, 46, 3);
    this.placeProp('round_table', 2.4, 3.0, { block: 0.9 });
    this.placeProp('chair', 1.6, 3.0);
    this.placeProp('chair', 3.2, 3.1, { flip: true });

    // salón
    this.addBox('wg_sofa', 6.2, 0.5, 3, 1, 28, {
      front: (c, w, h) => {
        rect(c, 0, 0, w, h, '#7a4ab8');
        rect(c, 0, 0, w, 10, '#9a6ad8');
        for (let x = 8; x < w - 8; x += 26) rect(c, x, 2, 22, 7, '#b48af0');
        rect(c, 0, h - 4, w, 4, '#5a3290');
      },
      side: plain('#6a3aa8'),
      top: '#8a5ac8',
      edge: '#b48af0',
    });
    this.addBox('wg_ctable', 6.8, 2.4, 2, 1, 14, { front: woodPanels, side: plain(PAL.woodDark), top: PAL.woodLight, edge: '#e6b07a' });
    this.placeProp('floor_lamp', 9.3, 0.9, { block: 0.4 });

    // baño
    // tabiques bajos alicatados (no tapan el baño)
    const tiles = (c: Ctx, w: number, h: number) => {
      rect(c, 0, 0, w, h, '#d8ecff');
      for (let y = 6; y < h; y += 8) for (let x = (y / 8) % 2 ? 0 : 4; x < w; x += 8) rect(c, x, y, 7, 7, '#e8f4ff');
      rect(c, 0, 0, w, 4, '#ffffff');
    };
    this.addBox('wg_bathwall_side', 9.6, 0.4, 1, 3, 40, { front: tiles, side: tiles, top: '#ffffff', edge: '#ffffff' });
    this.addBox('wg_bathwall', 10.6, 3.4, 2, 1, 40, { front: tiles, side: tiles, top: '#ffffff', edge: '#ffffff' });
    this.placeProp('toilet', 11.2, 0.9, { block: 0.6 });
    this.placeProp('washbasin', 12.9, 0.7, { block: 0.5 });
    this.addBox('wg_tub', 11.0, 2.0, 2, 1, 24, {
      front: plain('#f2f4f8'),
      side: plain('#d8dde8'),
      top: '#8fd0ff',
      edge: '#ffffff',
    });

    // habitación del jugador
    this.addBox('wg_bed', 12.4, 5.8, 1, 2, 22, {
      front: (c, w, h) => {
        rect(c, 0, 0, w, h, PAL.woodDark);
        rect(c, 0, 0, w, 8, '#5fc2c0');
      },
      side: (c, w, h) => {
        rect(c, 0, 0, w, h, PAL.wood);
        rect(c, 0, 0, w, 8, '#5fc2c0');
        rect(c, 0, 0, 20, 8, '#ffffff');
      },
      top: '#5fc2c0',
      edge: '#8fe0dc',
    });
    this.addBox('wg_shelf', 9, 5.4, 1, 1, 70, { front: shelfFront([['#c94a4a'], ['#e6e1ea'], ['#3b5bdb', '#f0c95a']]), side: plain(PAL.wood), top: PAL.woodLight, edge: '#e6b07a' });
    this.placeOnTop('plate_zimmer', 9.5, 5.9, 70, 40);
    this.addBox('wg_desk', 10, 8.6, 2, 1, 30, { front: woodPanels, side: plain(PAL.woodDark), top: PAL.woodLight, edge: '#e6b07a' });
    this.addBox('wg_wardrobe', 12.6, 8.6, 1, 1, 84, {
      front: (c, w, h) => {
        rect(c, 0, 0, w, h, '#e6d6c0');
        rect(c, w / 2 - 1, 4, 2, h - 8, '#b0987a');
        rect(c, w / 2 - 5, h / 2, 2, 8, '#7a6a5e');
        rect(c, w / 2 + 3, h / 2, 2, 8, '#7a6a5e');
      },
      side: plain('#c9b89e'),
      top: '#f2e6d0',
      edge: '#ffffff',
    });
    this.placeProp('plant1', 13.2, 4.6, { block: 0.5 });

    // cajas de la mudanza en el pasillo y objetos ya colocados
    for (const it of ITEMS_WG) {
      const placed = GameState.flag(`placed_${it.id}`);
      if (placed) this.showPlaced(it.target);
      else {
        const img = this.placeProp(`karton_${it.id}`, it.box.x, it.box.y, { block: 0.6 });
        img.setData('wgItem', it.id);
        this.interactables.push({
          x: it.box.x + 0.7,
          y: it.box.y + 0.3,
          radius: 1.0,
          label: () => {
            if (GameState.flag(`placed_${it.id}`) || this.player.heldId === it.id) return null;
            if (!GameState.isActive('wg', 'unpack')) return 'Caja de la mudanza (habla primero con Sophie)';
            return this.player.heldId ? null : `Coger: ${it.de}`;
          },
          action: () => {
            if (!GameState.isActive('wg', 'unpack')) {
              this.ui.toast({ title: 'Todavía no', lines: ['Primero conoce a tus compañeros de piso.'], tone: 'gold' });
              return;
            }
            this.player.hold(it.id);
            GameState.learn([it.id === 'buecher' ? 'buch' : it.id]);
            this.ui.toast({ title: `Llevas: ${it.de}`, lines: [`Sophie dijo: «${it.rule.split(' (')[0]}»`], icon: `carry_${it.id}`, tone: 'blue' });
          },
        });
      }
    }
    for (const [tid, t] of Object.entries(TARGETS)) {
      this.interactables.push({
        x: t.at.x,
        y: t.at.y,
        radius: 1.0,
        label: () => {
          const held = this.player.heldId;
          if (!held || !ITEMS_WG.some((i) => i.id === held)) return null;
          return `Dejar aquí: ${ITEMS_WG.find((i) => i.id === held)!.de}`;
        },
        action: () => this.placeItem(tid),
      });
    }

    // fregadero y Putzplan
    this.interactables.push(
      {
        x: SINK.x,
        y: SINK.y,
        radius: 1.1,
        label: () => (GameState.isActive('wg', 'wash') ? 'Fregar los platos (spülen)' : null),
        action: () => this.wash(),
      },
      {
        x: PLAN.x,
        y: PLAN.y,
        radius: 1.0,
        label: () => (GameState.isActive('wg', 'putzplan') ? 'Apuntarte en el Putzplan' : 'Leer el Putzplan'),
        action: () =>
          GameState.isActive('wg', 'putzplan')
            ? this.ui.openDialog('wg_putzplan', undefined, (a) => a === 'wg:signed' && this.finish())
            : this.ui.toast({ title: 'PUTZPLAN', lines: ['Sophie: Bad · Emre: Küche · ' + GameState.data.name + ': ' + (GameState.flag('putzplan_signed') ? 'Müll / Bad' : '—')], tone: 'blue' }),
      },
    );
    this.pois.push({ x: 2.4, y: 2.4, icon: '🍳', label: 'Küche' }, { x: 7.5, y: 2.6, icon: '🛋️', label: 'Wohnzimmer' }, { x: 12, y: 1.6, icon: '🛁', label: 'Bad' }, { x: 11, y: 7, icon: '🛏️', label: 'Dein Zimmer' });
  }

  private showPlaced(target: string) {
    const p = TARGETS[target].place;
    this.placeOnTop(p.key, p.x, p.y, p.h, 3);
  }

  private placeItem(target: string) {
    const held = this.player.heldId;
    const it = ITEMS_WG.find((i) => i.id === held);
    if (!it) return;
    if (it.target !== target) {
      GameState.bumpStat('wrong');
      this.sophie.say('Nein, nicht dahin!', '¡No, ahí no!', 2000);
      this.ui.toast({ title: `Ahí no va ${it.de}`, lines: [it.rule], tone: 'red' });
      return;
    }
    this.player.hold(null);
    GameState.setFlag(`placed_${it.id}`);
    this.showPlaced(target);
    // la caja ya vacía desaparece
    this.children.list.filter((o) => o.getData && o.getData('wgItem') === it.id).forEach((o) => o.destroy());
    const xp = GameState.addXp(5);
    const n = GameState.bump();
    const fresh = GameState.learn(target === 'desk' ? ['schreibtisch', 'lampe'] : target === 'shelf' ? ['regal', 'buch'] : ['bett', 'kissen']);
    this.ui.toast({ title: `+${xp} XP · ${it.de} ✓`, lines: [it.rule, ...fresh.map((id) => GameState.vocabText(id))], tone: 'acid' });
    if (n >= ITEMS_WG.length) {
      GameState.setQuest('conflict');
      this.time.delayedCall(900, () => this.emre.say(`Hey ${GameState.data.name}! Komm mal in die Küche!`, `¡Eh, ${GameState.data.name}! ¡Ven a la cocina!`, 4000));
    }
  }

  private wash() {
    this.player.face({ x: SINK.x, y: 0.9 });
    this.player.say('🧽  *spült das Geschirr*', '*friega los platos*', 2200);
    const glow = this.addGlow(this.dishesImg?.x ?? 0, (this.dishesImg?.y ?? 0) - 10, '#8fd0ff', 40, 0.5, 1e5);
    this.time.delayedCall(2000, () => {
      glow.destroy();
      this.dishesImg?.destroy();
      this.dishesImg = null;
      GameState.setFlag('dishes_clean');
      const xp = GameState.addXp(10);
      GameState.learn(['spuelen', 'geschirr']);
      GameState.setQuest('putzplan');
      this.emre.say('Super, danke! Jetzt noch der Putzplan.', '¡Genial, gracias! Ahora el plan de limpieza.', 3500);
      this.ui.toast({ title: `+${xp} XP · Geschirr gespült`, lines: ['Ahora apúntate en el Putzplan de la nevera.'], tone: 'acid' });
    });
  }

  private finish() {
    GameState.setFlag('putzplan_signed');
    GameState.setFlag('wg_home');
    this.sophie.say('Willkommen in der WG!', '¡Bienvenido/a al piso!', 3500);
    this.time.delayedCall(700, () => this.emre.say('Jetzt bist du einer von uns!', '¡Ahora eres uno/a de los nuestros!', 3500));
    if (GameState.isActive('wg')) GameState.completeQuest();
  }

  // ───────────── Compañeros de piso ─────────────

  private spawnRoommates() {
    this.sophie = this.addNpc('sophie', 'Sophie', 7.8, 3.9, (a) => this.talkSophie(a));
    this.brains.push(
      new PatrolBrain(this, this.sophie, [
        { x: 7.6, y: 4.0, wait: 6, face: 'SW' },
        { x: 8.8, y: 4.4, wait: 5, face: 'SE' },
      ]),
    );
    this.emre = this.addNpc('emre', 'Emre', 3.0, 2.2, (a) => this.talkEmre(a));
    this.brains.push(
      new PatrolBrain(this, this.emre, [
        { x: 3.6, y: 2.0, wait: 6, face: 'NE' },
        { x: 1.6, y: 2.0, wait: 5, face: 'NW', say: ['Was koche ich heute?', '¿Qué cocino hoy?'] },
      ]),
    );
  }

  private metUpdate() {
    const met = ['met_sophie', 'met_emre'].filter((f) => GameState.flag(f)).length;
    if (met >= 2) {
      GameState.setQuest('unpack');
      return;
    }
    GameState.data.quest.count = met - 1;
    GameState.bump();
  }

  private talkSophie(a: Actor) {
    if (GameState.isActive('wg', 'meet') && !GameState.flag('met_sophie'))
      return this.ui.openDialog('wg_sophie_meet', a, (act) => {
        if (act === 'wg:met_sophie') {
          GameState.setFlag('met_sophie');
          this.metUpdate();
        }
      });
    if (GameState.isActive('wg', 'meet', 'unpack'))
      return a.say('Lampe → Schreibtisch, Bücher → Regal, Kissen → Bett!', 'Lámpara → escritorio, libros → estantería, cojín → cama', 4500);
    this.ui.openDialog('wg_sophie_idle', a);
  }

  private talkEmre(a: Actor) {
    if (GameState.isActive('wg', 'meet') && !GameState.flag('met_emre'))
      return this.ui.openDialog('wg_emre_meet', a, (act) => {
        if (act === 'wg:met_emre') {
          GameState.setFlag('met_emre');
          this.metUpdate();
        }
      });
    if (GameState.isActive('wg', 'conflict'))
      return this.ui.openDialog('wg_conflict', a, (act) => {
        if (act === 'wg:wash') GameState.setQuest('wash');
      });
    if (GameState.isActive('wg', 'wash', 'putzplan')) return a.say('Die Spüle ist da drüben!', '¡El fregadero está ahí!', 3000);
    this.ui.openDialog('wg_emre_idle', a);
  }

  private objective(): Pt | null {
    const q = GameState.data.quest;
    if (q.id !== 'wg') return q.id === 'none' ? null : DOOR;
    switch (q.step) {
      case 'meet':
        return GameState.flag('met_sophie') ? this.emre.pos : this.sophie.pos;
      case 'unpack': {
        const held = this.player.heldId;
        const it = ITEMS_WG.find((i) => i.id === held);
        if (it) return TARGETS[it.target].at;
        const next = ITEMS_WG.find((i) => !GameState.flag(`placed_${i.id}`));
        return next ? { x: next.box.x, y: next.box.y } : null;
      }
      case 'conflict':
        return this.emre.pos;
      case 'wash':
        return SINK;
      case 'putzplan':
        return PLAN;
      default:
        return null;
    }
  }
}

