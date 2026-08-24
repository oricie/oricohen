// The little plan in the corner of the walkthrough. North-up, showing the
// storey you are standing on, with your position and field of view on it.

import { wallLength, wallPointAt, polygonCentroid, polygonBounds, clamp } from './geom.js';
import * as furniture from './furniture.js';

const PAD = 10;

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.plan = null;
    this.level = 0;
    this.player = { x: 0, y: 0, yaw: 0 };
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.onTeleport = () => {};

    canvas.addEventListener('click', (e) => {
      if (!this.view) return;
      const r = canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      this.onTeleport(
        (sx - this.view.ox) / this.view.k,
        (sy - this.view.oy) / this.view.k
      );
    });
  }

  setPlan(plan, level = 0) {
    this.plan = plan;
    this.level = level;
    this.view = null;
    this.draw();
  }

  setPlayer(x, y, yaw) {
    this.player.x = x;
    this.player.y = y;
    this.player.yaw = yaw;
    this.draw();
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || 220;
    const h = this.canvas.clientHeight || 170;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.dpr = dpr;
    this.view = null;
    this.draw();
  }

  // Fit the current storey into the canvas.
  fit() {
    const walls = (this.plan.walls || []).filter((w) => (w.level || 0) === this.level);
    if (!walls.length) return null;
    const pts = walls.flatMap((w) => [[w.x1, w.y1], [w.x2, w.y2]]);
    const b = polygonBounds(pts);
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const k = Math.min((w - PAD * 2) / Math.max(0.5, b.w), (h - PAD * 2) / Math.max(0.5, b.h));
    // the canvas has no size until it is laid out and resize() has run
    if (!Number.isFinite(k) || k <= 0) return null;
    return {
      k,
      ox: w / 2 - (b.minX + b.w / 2) * k,
      oy: h / 2 - (b.minY + b.h / 2) * k,
    };
  }

  draw() {
    if (!this.plan || !this.ctx) return;
    if (!this.canvas.width || !this.canvas.height) return;
    if (!this.view) this.view = this.fit();
    const view = this.view;
    const ctx = this.ctx;
    const w = this.canvas.width / (this.dpr || 1);
    const h = this.canvas.height / (this.dpr || 1);

    ctx.save();
    ctx.scale(this.dpr || 1, this.dpr || 1);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(247, 245, 241, 0.94)';
    ctx.fillRect(0, 0, w, h);
    if (!view) { ctx.restore(); return; }

    const S = (x, y) => [x * view.k + view.ox, y * view.k + view.oy];
    const onLevel = (el) => (el.level || 0) === this.level;

    // rooms
    ctx.fillStyle = 'rgba(139, 163, 190, 0.22)';
    for (const room of (this.plan.rooms || []).filter(onLevel)) {
      ctx.beginPath();
      room.poly.forEach((p, i) => {
        const [sx, sy] = S(p[0], p[1]);
        i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
      });
      ctx.closePath();
      ctx.fill();
    }

    // furniture footprints
    ctx.fillStyle = 'rgba(110, 116, 122, 0.3)';
    for (const item of (this.plan.items || []).filter(onLevel)) {
      const spec = furniture.footprint(item);
      if (!spec) continue;
      const [sx, sy] = S(item.x, item.y);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(item.rot || 0);
      ctx.fillRect(-spec.w * view.k / 2, -spec.d * view.k / 2, spec.w * view.k, spec.d * view.k);
      ctx.restore();
    }

    // walls
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineCap = 'butt';
    for (const wall of (this.plan.walls || []).filter(onLevel)) {
      ctx.lineWidth = Math.max(1.5, wall.t * view.k);
      const [ax, ay] = S(wall.x1, wall.y1);
      const [bx, by] = S(wall.x2, wall.y2);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // doorways punched back out, so the route through the flat reads
    const wallsById = new Map((this.plan.walls || []).map((wl) => [wl.id, wl]));
    for (const op of this.plan.openings || []) {
      const wall = wallsById.get(op.wallId);
      if (!wall || !onLevel(wall)) continue;
      const L = wallLength(wall);
      const a = wallPointAt(wall, clamp(op.pos - op.width / 2, 0, L));
      const b = wallPointAt(wall, clamp(op.pos + op.width / 2, 0, L));
      const [ax, ay] = S(a.x, a.y);
      const [bx, by] = S(b.x, b.y);
      ctx.strokeStyle = op.type === 'door' ? 'rgba(247, 245, 241, 1)' : '#5b8fc9';
      ctx.lineWidth = Math.max(1.5, wall.t * view.k) * (op.type === 'door' ? 1.1 : 0.7);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // room names, if there is room for them
    if (view.k > 12) {
      ctx.fillStyle = 'rgba(49, 64, 79, 0.75)';
      ctx.font = '600 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const room of (this.plan.rooms || []).filter(onLevel)) {
        const c = polygonCentroid(room.poly);
        const [sx, sy] = S(c.x, c.y);
        ctx.fillText(room.name || '', sx, sy + 3);
      }
    }

    // the viewer: field of view, then the dot
    const [px, py] = S(this.player.x, this.player.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) { ctx.restore(); return; }
    const fov = Math.PI / 3;
    const reach = Math.max(26, 3.5 * view.k);
    // yaw 0 looks towards -z (up on the plan)
    const heading = this.player.yaw + Math.PI / 2;
    const grad = ctx.createRadialGradient(px, py, 2, px, py, reach);
    grad.addColorStop(0, 'rgba(194, 65, 12, 0.38)');
    grad.addColorStop(1, 'rgba(194, 65, 12, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, reach, -heading - fov / 2, -heading + fov / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#c2410c';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // north marker
    ctx.fillStyle = 'rgba(49, 64, 79, 0.5)';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('N', 8, 15);
    ctx.beginPath();
    ctx.moveTo(17, 14);
    ctx.lineTo(20, 8);
    ctx.lineTo(23, 14);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
