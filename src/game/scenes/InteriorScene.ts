import Phaser from 'phaser';
import { boxCells, type BoxPaint } from '../art/furni';
import { makeCanvas, rect, shearFace, type Ctx } from '../art/pixel';
import { depthOf, HALF_H, HALF_W, toScreen } from '../iso';
import { GameState } from '../state/GameState';
import { Actor } from '../world/Actor';
import type { Pt } from '../world/Collision';
import type { Brain } from '../world/Npc';
import { WorldScene } from './WorldScene';

// Base de los interiores de la Fase 3: paredes del fondo y lateral con su decoración, suelo por
// baldosas, borde frontal recortado con hueco de puerta, salida y jugador.

export interface RoomSpec {
  key: string;
  w: number;
  h: number;
  wallH: number;
  door: Pt;
  floor: (x: number, y: number) => string;
  back: (ctx: Ctx, w: number, h: number) => void;
  side: (ctx: Ctx, w: number, h: number) => void;
  wallTop?: string;
  edge?: string;
  background?: string;
}

export abstract class InteriorScene extends WorldScene {
  protected brains: Brain[] = [];
  protected room!: RoomSpec;

  /** Construye la sala completa y deja listo el mundo (colisiones, cámara pendiente). */
  protected buildRoom(spec: RoomSpec) {
    this.room = spec;
    this.brains = [];
    this.initWorld({ x0: 0.35, y0: 0.35, x1: spec.w - 0.35, y1: spec.h - 0.3 });
    this.cameras.main.setBackgroundColor(spec.background ?? '#0d1220');
    this.paintGround(spec.w, spec.h, spec.floor, `ground_${spec.key}`);

    const backW = spec.w * HALF_W;
    const sideW = spec.h * HALF_W;
    const key = `${spec.key}_walls`;
    if (!this.textures.exists(key)) {
      const back = makeCanvas(backW, spec.wallH);
      spec.back(back.ctx, backW, spec.wallH);
      const side = makeCanvas(sideW, spec.wallH);
      spec.side(side.ctx, sideW, spec.wallH);
      const { canvas, ctx } = makeCanvas(backW + sideW, spec.wallH + spec.w * HALF_H + 2);
      shearFace(ctx, back.canvas, sideW, 0, 'right');
      shearFace(ctx, side.canvas, sideW, 0, 'left');
      rect(ctx, sideW - 1, 0, 2, spec.wallH, '#00000055');
      const top = spec.wallTop ?? '#f2ece4';
      for (let u = 0; u < backW; u++) rect(ctx, sideW + u, Math.floor(u / 2) - 1, 1, 3, top);
      for (let u = 0; u < sideW; u++) rect(ctx, sideW - u - 1, Math.floor(u / 2) - 1, 1, 3, top);
      this.textures.addCanvas(key, canvas);
    }
    this.add.image(-sideW, -spec.wallH, key).setOrigin(0, 0).setDepth(-60000);

    // borde frontal (muro delantero recortado) con hueco de puerta
    const ekey = `${spec.key}_edge`;
    if (!this.textures.exists(ekey)) {
      const edgeC = makeCanvas((spec.w + spec.h) * HALF_W, (spec.w + spec.h) * HALF_H + 12);
      const e = edgeC.ctx;
      const edge = spec.edge ?? '#7a6a5e';
      for (let u = 0; u < spec.w * HALF_W; u++) {
        if (Math.abs(u / HALF_W - spec.door.x) < 0.9) continue;
        rect(e, u, spec.h * HALF_H + Math.floor(u / 2), 1, 8, edge);
        rect(e, u, spec.h * HALF_H + Math.floor(u / 2), 1, 2, spec.wallTop ?? '#f2ece4');
      }
      for (let u = 0; u < spec.h * HALF_W; u++) {
        rect(e, sideW + spec.w * HALF_W - u - 1, spec.w * HALF_H + Math.floor(u / 2), 1, 8, edge);
        rect(e, sideW + spec.w * HALF_W - u - 1, spec.w * HALF_H + Math.floor(u / 2), 1, 2, spec.wallTop ?? '#f2ece4');
      }
      this.textures.addCanvas(ekey, edgeC.canvas);
    }
    this.add.image(toScreen(0, spec.h).x, 0, ekey).setOrigin(0, 0).setDepth(-90000);
    const d = toScreen(spec.door.x, spec.h);
    this.addGlow(d.x, d.y, '#ffe9b8', 60, 0.3, -90000);
  }

  /** Coloca al jugador y la cámara. */
  protected spawnPlayer(data: { x?: number; y?: number; from?: string } | undefined, fromStreet: string[] = ['Street']) {
    const door = this.room.door;
    const saved = data?.x !== undefined && !fromStreet.includes(data.from ?? '') ? { x: data.x, y: data.y! } : null;
    const start = this.safeStart(saved, { x: door.x, y: door.y - 0.4 });
    this.player = this.addActor(new Actor(this, 'player', GameState.data.name, start.x, start.y));
    this.player.facing = 'NW';
    this.setupCamera(this.player);
    const tl = toScreen(0, this.room.h);
    const br = toScreen(this.room.w, 0);
    this.cameras.main.setBounds(tl.x - 400, -this.room.wallH - 300, br.x - tl.x + 800, toScreen(this.room.w, this.room.h).y + this.room.wallH + 600);
    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.savePosition() });
    this.events.once('shutdown', () => this.savePosition());
  }

  protected addExit(label: string, scene: string, data: object) {
    const door = this.room.door;
    this.interactables.push({ x: door.x, y: door.y, radius: 1.1, label: () => label, action: () => this.goTo(scene, data) });
    this.pois.push({ x: door.x, y: door.y, icon: '🚪', label: 'Salida' });
  }

  /** Mueble como caja isométrica; devuelve las imágenes por si hay que animarlas. */
  protected addBox(key: string, x0: number, y0: number, wx: number, wy: number, H: number, paint: BoxPaint, block = true) {
    const images: Phaser.GameObjects.Image[] = [];
    boxCells(wx, wy, H, paint).forEach((c) => {
      const k = `${key}_${c.cx}_${c.cy}`;
      if (!this.textures.exists(k)) this.textures.addCanvas(k, c.canvas);
      const s = toScreen(x0 + c.cx, y0 + c.cy);
      images.push(this.add.image(s.x - c.anchorX, s.y - c.anchorY, k).setOrigin(0, 0).setDepth(depthOf(x0 + c.cx + 0.5, y0 + c.cy + 0.9)));
    });
    if (block) this.collision.add(x0, y0, x0 + wx, y0 + wy);
    this.minimap.push({ rect: { x0, y0, x1: x0 + wx, y1: y0 + wy }, color: Phaser.Display.Color.HexStringToColor(paint.top).color });
    return images;
  }

  /** Objeto pequeño encima de un mueble (altura en px sobre el suelo). */
  protected placeOnTop(key: string, x: number, y: number, height: number, depthBoost = 1) {
    const s = toScreen(x, y);
    return this.add.image(Math.round(s.x), Math.round(s.y - height), key).setOrigin(0.5, 1).setDepth(depthOf(x, y) + depthBoost);
  }

  /** Personaje no jugador con interacción de diálogo. */
  protected addNpc(key: string, name: string, x: number, y: number, onTalk: (a: Actor) => void, radius = 1.3) {
    const a = this.addActor(new Actor(this, key, name, x, y));
    a.speed = 1.5;
    this.interactables.push({
      get x() {
        return a.wx;
      },
      get y() {
        return a.wy;
      },
      radius,
      label: () => (a.visible ? `Hablar con ${name}` : null),
      action: () => {
        a.face(this.player.pos);
        onTalk(a);
      },
    });
    return a;
  }

  protected worldUpdate(dt: number) {
    for (const b of this.brains) b.update(dt);
  }
}
