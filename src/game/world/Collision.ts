// Colisiones en coordenadas del mundo (cartesianas) + rejilla para que los NPC busquen caminos.

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Pt {
  x: number;
  y: number;
}

const GRID = 2; // celdas por baldosa en la rejilla de caminos

export class CollisionMap {
  rects: Rect[] = [];
  private grid: boolean[][] | null = null;

  constructor(public bounds: Rect) {}

  add(x0: number, y0: number, x1: number, y1: number) {
    this.rects.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) });
    this.grid = null;
  }

  /** Bloquea un cuadrado centrado en (x, y). */
  addAt(x: number, y: number, w: number, h = w) {
    this.add(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  }

  /** ¿Un círculo (aprox. cuadrado) de radio r en (x, y) choca con algo? */
  blocked(x: number, y: number, r = 0.22): boolean {
    const b = this.bounds;
    if (x - r < b.x0 || y - r < b.y0 || x + r > b.x1 || y + r > b.y1) return true;
    for (const q of this.rects) if (x + r > q.x0 && x - r < q.x1 && y + r > q.y0 && y - r < q.y1) return true;
    return false;
  }

  /** Movimiento con deslizamiento: prueba cada eje por separado. */
  move(p: Pt, dx: number, dy: number, r = 0.22): Pt {
    let { x, y } = p;
    if (!this.blocked(x + dx, y, r)) x += dx;
    if (!this.blocked(x, y + dy, r)) y += dy;
    return { x, y };
  }

  private buildGrid() {
    const b = this.bounds;
    const w = Math.ceil((b.x1 - b.x0) * GRID);
    const h = Math.ceil((b.y1 - b.y0) * GRID);
    this.grid = [];
    for (let gy = 0; gy < h; gy++) {
      const row: boolean[] = [];
      for (let gx = 0; gx < w; gx++) row.push(this.blocked(b.x0 + (gx + 0.5) / GRID, b.y0 + (gy + 0.5) / GRID, 0.2));
      this.grid.push(row);
    }
  }

  private cell(p: Pt): [number, number] {
    return [Math.floor((p.x - this.bounds.x0) * GRID), Math.floor((p.y - this.bounds.y0) * GRID)];
  }

  private free(gx: number, gy: number) {
    const g = this.grid!;
    return gy >= 0 && gy < g.length && gx >= 0 && gx < g[0].length && !g[gy][gx];
  }

  /** A* sobre la rejilla (8 direcciones, sin cortar esquinas). Devuelve puntos del mundo. */
  findPath(from: Pt, to: Pt): Pt[] | null {
    if (!this.grid) this.buildGrid();
    const [sx, sy] = this.cell(from);
    let [tx, ty] = this.cell(to);
    if (!this.free(tx, ty)) {
      // destino bloqueado: buscar la celda libre más cercana
      let best: [number, number] | null = null;
      for (let r = 1; r < 6 && !best; r++)
        for (let dy = -r; dy <= r && !best; dy++)
          for (let dx = -r; dx <= r && !best; dx++) if (this.free(tx + dx, ty + dy)) best = [tx + dx, ty + dy];
      if (!best) return null;
      [tx, ty] = best;
    }
    const W = this.grid![0].length;
    const key = (x: number, y: number) => y * W + x;
    const open: { x: number; y: number; f: number }[] = [{ x: sx, y: sy, f: 0 }];
    const g = new Map<number, number>([[key(sx, sy), 0]]);
    const came = new Map<number, number>();
    const h = (x: number, y: number) => Math.hypot(x - tx, y - ty);
    let iter = 0;
    while (open.length && iter++ < 6000) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift()!;
      if (cur.x === tx && cur.y === ty) {
        const pts: Pt[] = [];
        let k = key(tx, ty);
        while (k !== key(sx, sy)) {
          const cx = k % W;
          const cy = Math.floor(k / W);
          pts.unshift({ x: this.bounds.x0 + (cx + 0.5) / GRID, y: this.bounds.y0 + (cy + 0.5) / GRID });
          k = came.get(k)!;
        }
        if (pts.length) pts[pts.length - 1] = { ...to };
        return simplify(pts);
      }
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (!this.free(nx, ny)) continue;
          if (dx && dy && (!this.free(cur.x + dx, cur.y) || !this.free(cur.x, cur.y + dy))) continue;
          const ng = g.get(key(cur.x, cur.y))! + (dx && dy ? 1.414 : 1);
          const nk = key(nx, ny);
          if (ng < (g.get(nk) ?? Infinity)) {
            g.set(nk, ng);
            came.set(nk, key(cur.x, cur.y));
            const existing = open.find((o) => o.x === nx && o.y === ny);
            if (existing) existing.f = ng + h(nx, ny);
            else open.push({ x: nx, y: ny, f: ng + h(nx, ny) });
          }
        }
    }
    return null;
  }
}

/** Quita puntos intermedios colineales para un movimiento más natural. */
function simplify(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const d1 = { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
    const d2 = { x: Math.sign(c.x - b.x), y: Math.sign(c.y - b.y) };
    if (d1.x !== d2.x || d1.y !== d2.y) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
