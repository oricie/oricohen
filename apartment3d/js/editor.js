// The 2D plan editor: draws the plan over the uploaded image and handles
// every edit gesture. Emits 'change' whenever the plan is modified.

import {
  pointToWall, wallLength, wallPointAt, polygonCentroid, polygonArea,
  pointInPolygon, polygonBounds, levelAt, uid, clamp, dist,
} from './geom.js';
import { regionAt } from './tracer.js';
import * as furniture from './furniture.js';

const COLORS = {
  wall: '#2c2c2c',
  wallSel: '#c2410c',
  room: 'rgba(120, 150, 190, 0.16)',
  roomSel: 'rgba(194, 65, 12, 0.18)',
  roomLine: 'rgba(70, 90, 120, 0.55)',
  door: '#1d9a6c',
  window: '#2f7fd1',
  item: 'rgba(60, 60, 60, 0.5)',
  itemFill: 'rgba(150, 160, 170, 0.35)',
  guide: '#c2410c',
};

export class Editor extends EventTarget {
  constructor(canvas, plan) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.plan = plan;
    this.image = null;
    this.view = { ox: 40, oy: 40, zoom: 46 };  // px per metre
    this.tool = 'select';
    this.itemType = 'sofa';
    this.selected = [];         // [{kind:'wall'|'opening'|'room'|'item', id}]
    this.hover = null;
    this.drag = null;
    this.pointer = null;
    this.showImage = true;
    this.snapEnabled = true;
    this.calibration = null;

    this._bind();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  // Selection is a list, but most code only cares about the primary one.
  get selection() {
    return this.selected.length ? this.selected[this.selected.length - 1] : null;
  }

  set selection(value) {
    this.selected = value ? [value] : [];
  }

  isSelected(kind, id) {
    return this.selected.some((s) => s.kind === kind && s.id === id);
  }

  toggleSelected(entry) {
    const i = this.selected.findIndex((s) => s.kind === entry.kind && s.id === entry.id);
    if (i >= 0) this.selected.splice(i, 1);
    else this.selected.push(entry);
  }

  // --------------------------------------------------------------- plumbing

  emit() {
    this.dispatchEvent(new CustomEvent('change'));
    this.draw();
  }

  setPlan(plan) {
    this.plan = plan;
    this.selected = [];
    this.draw();
  }

  setImage(img) {
    this.image = img;
    this.draw();
  }

  setTool(tool) {
    this.tool = tool;
    this.drag = null;
    this.calibration = null;
    this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    this.draw();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, parent.clientWidth * dpr);
    this.canvas.height = Math.max(1, parent.clientHeight * dpr);
    this.canvas.style.width = `${parent.clientWidth}px`;
    this.canvas.style.height = `${parent.clientHeight}px`;
    this.dpr = dpr;
    this.draw();
  }

  fit() {
    const bounds = this.planBounds();
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth, h = parent.clientHeight;
    const pad = 40;
    const zoom = Math.min(
      (w - pad * 2) / Math.max(0.5, bounds.w),
      (h - pad * 2) / Math.max(0.5, bounds.h)
    );
    this.view.zoom = clamp(zoom, 6, 300);
    this.view.ox = w / 2 - (bounds.minX + bounds.w / 2) * this.view.zoom;
    this.view.oy = h / 2 - (bounds.minY + bounds.h / 2) * this.view.zoom;
    this.draw();
  }

  planBounds() {
    const pts = [];
    for (const w of this.plan.walls) pts.push([w.x1, w.y1], [w.x2, w.y2]);
    for (const r of this.plan.rooms || []) pts.push(...r.poly);
    if (this.image) {
      pts.push([0, 0], [this.image.width / this.plan.scale, this.image.height / this.plan.scale]);
    }
    if (!pts.length) return { minX: 0, minY: 0, maxX: 10, maxY: 8, w: 10, h: 8 };
    return polygonBounds(pts);
  }

  toPlan(sx, sy) {
    return { x: (sx - this.view.ox) / this.view.zoom, y: (sy - this.view.oy) / this.view.zoom };
  }

  toScreen(p) {
    return { x: p.x * this.view.zoom + this.view.ox, y: p.y * this.view.zoom + this.view.oy };
  }

  // ------------------------------------------------------------------ input

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this._down(e));
    c.addEventListener('pointermove', (e) => this._move(e));
    c.addEventListener('pointerup', (e) => this._up(e));
    c.addEventListener('pointerleave', () => { this.pointer = null; this.draw(); });
    c.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this._key(e));
  }

  _localPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  }

  _wheel(e) {
    e.preventDefault();
    const { sx, sy } = this._localPoint(e);
    const before = this.toPlan(sx, sy);
    const factor = Math.exp(-e.deltaY * 0.0015);
    this.view.zoom = clamp(this.view.zoom * factor, 5, 400);
    const after = this.toPlan(sx, sy);
    this.view.ox += (after.x - before.x) * this.view.zoom;
    this.view.oy += (after.y - before.y) * this.view.zoom;
    this.draw();
  }

  _key(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selection) {
      e.preventDefault();
      this.deleteSelection();
    }
    if (e.key === 'r' && this.selection && this.selection.kind === 'item') {
      const item = this.plan.items.find((i) => i.id === this.selection.id);
      if (item) { item.rot = (item.rot || 0) + Math.PI / 2; this.emit(); }
    }
    if (e.key === 'Escape') { this.selected = []; this.drag = null; this.calibration = null; this.emit(); }
    if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.selected = [
        ...this.plan.walls.map((w) => ({ kind: 'wall', id: w.id })),
        ...this.plan.items.map((i) => ({ kind: 'item', id: i.id })),
      ];
      this.dispatchEvent(new CustomEvent('select', { detail: this.selection }));
      this.draw();
    }
  }

  _down(e) {
    this.canvas.setPointerCapture(e.pointerId);
    const { sx, sy } = this._localPoint(e);
    const p = this.toPlan(sx, sy);

    if (e.button === 1 || e.button === 2 || e.altKey || this.tool === 'pan') {
      this.drag = { kind: 'pan', sx, sy, ox: this.view.ox, oy: this.view.oy };
      return;
    }

    switch (this.tool) {
      case 'wall':
        this.drag = { kind: 'newWall', from: this.snapPoint(p), to: this.snapPoint(p) };
        break;
      case 'door':
      case 'window':
        this._insertOpening(p, this.tool);
        break;
      case 'room':
        this._pickRoom(p);
        break;
      case 'item':
        this._placeItem(p);
        break;
      case 'scale':
        this.calibration = { from: p, to: p };
        this.drag = { kind: 'calibrate' };
        break;
      case 'erase':
        this._eraseAt(p);
        break;
      case 'sketch':
        this.drag = { kind: 'sketch', points: [p] };
        break;
      default:
        this._selectAt(p, e.shiftKey);
    }
    this.draw();
  }

  _move(e) {
    const { sx, sy } = this._localPoint(e);
    const p = this.toPlan(sx, sy);
    this.pointer = p;

    if (this.drag) {
      switch (this.drag.kind) {
        case 'pan':
          this.view.ox = this.drag.ox + (sx - this.drag.sx);
          this.view.oy = this.drag.oy + (sy - this.drag.sy);
          break;
        case 'newWall':
          this.drag.to = this.snapPoint(this.orthoSnap(this.drag.from, p));
          break;
        case 'calibrate':
          this.calibration.to = p;
          break;
        case 'marquee':
          this.drag.to = p;
          break;
        case 'sketch': {
          const last = this.drag.points[this.drag.points.length - 1];
          if (!last || dist(last, p) > 0.08) this.drag.points.push(p);
          break;
        }
        case 'wallEnd': {
          const wall = this.plan.walls.find((w) => w.id === this.drag.id);
          if (wall) {
            const other = this.drag.end === 1
              ? { x: wall.x2, y: wall.y2 }
              : { x: wall.x1, y: wall.y1 };
            const q = this.snapPoint(this.orthoSnap(other, p), wall.id);
            if (this.drag.end === 1) { wall.x1 = q.x; wall.y1 = q.y; }
            else { wall.x2 = q.x; wall.y2 = q.y; }
          }
          break;
        }
        case 'wallMove': {
          const wall = this.plan.walls.find((w) => w.id === this.drag.id);
          if (wall) {
            const dx = p.x - this.drag.grab.x;
            const dy = p.y - this.drag.grab.y;
            wall.x1 = this.drag.orig.x1 + dx; wall.y1 = this.drag.orig.y1 + dy;
            wall.x2 = this.drag.orig.x2 + dx; wall.y2 = this.drag.orig.y2 + dy;
          }
          break;
        }
        case 'opening': {
          const op = this.plan.openings.find((o) => o.id === this.drag.id);
          const wall = op && this.plan.walls.find((w) => w.id === op.wallId);
          if (op && wall) {
            const hit = pointToWall(p, wall);
            const L = wallLength(wall);
            op.pos = clamp(hit.t * L, op.width / 2, L - op.width / 2);
          }
          break;
        }
        case 'item': {
          const item = this.plan.items.find((i) => i.id === this.drag.id);
          if (item) {
            item.x = this.drag.orig.x + (p.x - this.drag.grab.x);
            item.y = this.drag.orig.y + (p.y - this.drag.grab.y);
          }
          break;
        }
        case 'rotate': {
          const item = this.plan.items.find((i) => i.id === this.drag.id);
          if (item) {
            let a = Math.atan2(p.y - item.y, p.x - item.x) + Math.PI / 2;
            if (this.snapEnabled) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
            item.rot = a;
          }
          break;
        }
      }
      this.draw();
      return;
    }

    this.hover = this._hitTest(p, sx, sy);
    this.draw();
  }

  _up(e) {
    if (!this.drag) return;
    const drag = this.drag;
    this.drag = null;

    if (drag.kind === 'newWall') {
      const L = dist(drag.from, drag.to);
      if (L > 0.15) {
        const mid = { x: (drag.from.x + drag.to.x) / 2, y: (drag.from.y + drag.to.y) / 2 };
        const wall = {
          id: uid('w'),
          x1: drag.from.x, y1: drag.from.y,
          x2: drag.to.x, y2: drag.to.y,
          t: this.plan.defaultThickness || 0.12,
          level: levelAt(this.plan, mid.x, mid.y),
        };
        this.plan.walls.push(wall);
        this.selection = { kind: 'wall', id: wall.id };
        this.emit();
        return;
      }
    }

    if (drag.kind === 'sketch') {
      this.draw();
      if (drag.points.length >= 4) {
        this.dispatchEvent(new CustomEvent('sketch', { detail: { points: drag.points } }));
      }
      return;
    }

    if (drag.kind === 'marquee') {
      this._applyMarquee(drag);
      this.dispatchEvent(new CustomEvent('select', { detail: this.selection }));
      this.draw();
      return;
    }

    if (drag.kind === 'calibrate' && this.calibration) {
      const px = dist(this.calibration.from, this.calibration.to);
      if (px > 0.05) {
        this.dispatchEvent(new CustomEvent('calibrate', { detail: { measured: px } }));
      } else {
        this.calibration = null;
      }
    }

    if (['wallEnd', 'wallMove', 'opening', 'item', 'rotate'].includes(drag.kind)) this.emit();
    this.draw();
  }

  // ------------------------------------------------------------- operations

  snapPoint(p, ignoreWallId = null) {
    if (!this.snapEnabled) return p;
    const r = 14 / this.view.zoom;
    let best = null, bestD = r;
    for (const w of this.plan.walls) {
      if (w.id === ignoreWallId) continue;
      for (const end of [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]) {
        const d = dist(p, end);
        if (d < bestD) { bestD = d; best = { ...end }; }
      }
    }
    return best || p;
  }

  orthoSnap(from, to) {
    if (!this.snapEnabled) return to;
    const dx = to.x - from.x, dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy) * 3) return { x: to.x, y: from.y };
    if (Math.abs(dy) > Math.abs(dx) * 3) return { x: from.x, y: to.y };
    return to;
  }

  nearestWall(p, maxDist = 0.35) {
    let best = null, bestD = maxDist;
    for (const w of this.plan.walls) {
      const hit = pointToWall(p, w);
      if (hit.dist < bestD) { bestD = hit.dist; best = { wall: w, hit }; }
    }
    return best;
  }

  _insertOpening(p, type) {
    const near = this.nearestWall(p, 0.6);
    if (!near) return;
    const L = wallLength(near.wall);
    const width = type === 'door' ? 0.9 : 1.2;
    if (L < width + 0.2) return;
    const op = {
      id: uid('o'),
      wallId: near.wall.id,
      pos: clamp(near.hit.t * L, width / 2 + 0.05, L - width / 2 - 0.05),
      width,
      height: type === 'door' ? 2.05 : 1.3,
      sill: type === 'door' ? 0 : 0.9,
      type,
      hinge: 'start',
    };
    this.plan.openings.push(op);
    this.selection = { kind: 'opening', id: op.id };
    this.emit();
  }

  // Rasterise the current walls and flood fill from the clicked point.
  _pickRoom(p) {
    const existing = (this.plan.rooms || []).find((r) => pointInPolygon(p, r.poly));
    if (existing) {
      this.selection = { kind: 'room', id: existing.id };
      this.emit();
      return;
    }
    const poly = this.floodRoom(p);
    if (!poly) {
      this.dispatchEvent(new CustomEvent('notice', {
        detail: 'That area is not closed — the flood leaked out. Draw the missing wall first.',
      }));
      return;
    }
    const room = {
      id: uid('r'),
      name: `Room ${(this.plan.rooms.length + 1)}`,
      poly,
      floor: 'oak',
      level: levelAt(this.plan, p.x, p.y),
    };
    this.plan.rooms.push(room);
    this.selection = { kind: 'room', id: room.id };
    this.emit();
  }

  // Draw walls into an offscreen bitmap, then trace the region under `p`.
  floodRoom(p) {
    const res = 0.04;                       // metres per raster pixel
    const b = this.planBounds();
    const pad = 0.5;
    const minX = Math.min(b.minX, p.x) - pad;
    const minY = Math.min(b.minY, p.y) - pad;
    const w = Math.ceil((Math.max(b.maxX, p.x) + pad - minX) / res);
    const h = Math.ceil((Math.max(b.maxY, p.y) + pad - minY) / res);
    if (w < 4 || h < 4 || w * h > 6e6) return null;

    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'square';
    const level = levelAt(this.plan, p.x, p.y);
    for (const wall of this.plan.walls) {
      if ((wall.level || 0) !== level) continue;
      ctx.lineWidth = Math.max(1, wall.t / res);
      ctx.beginPath();
      ctx.moveTo((wall.x1 - minX) / res, (wall.y1 - minY) / res);
      ctx.lineTo((wall.x2 - minX) / res, (wall.y2 - minY) / res);
      ctx.stroke();
    }
    const data = ctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0, q = 0; i < data.length; i += 4, q++) mask[q] = data[i] > 100 ? 1 : 0;

    const sx = Math.round((p.x - minX) / res);
    const sy = Math.round((p.y - minY) / res);
    const poly = regionAt(mask, w, h, sx, sy, Math.round(0.6 / (res * res)));
    if (!poly) return null;
    return poly.map(([x, y]) => [x * res + minX, y * res + minY]);
  }

  _placeItem(p) {
    const spec = furniture.spec(this.itemType);
    if (!spec) return;
    const item = {
      id: uid('f'), type: this.itemType, x: p.x, y: p.y, rot: 0,
      level: levelAt(this.plan, p.x, p.y),
    };
    // face away from the nearest wall if we dropped it close to one
    const near = this.nearestWall(p, Math.max(spec.d, 0.9));
    if (near) {
      const w = near.wall;
      const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      item.rot = ang + Math.PI / 2;
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const side = ((p.x - near.hit.point.x) * nx + (p.y - near.hit.point.y) * ny) < 0 ? -1 : 1;
      item.x = near.hit.point.x + nx * side * (spec.d / 2 + w.t / 2 + 0.02);
      item.y = near.hit.point.y + ny * side * (spec.d / 2 + w.t / 2 + 0.02);
      if (side < 0) item.rot += Math.PI;
    }
    this.plan.items.push(item);
    this.selection = { kind: 'item', id: item.id };
    this.emit();
  }

  _eraseAt(p) {
    const hit = this._hitTest(p);
    if (!hit) return;
    this.selection = hit;
    this.deleteSelection();
  }

  deleteSelection() {
    if (!this.selected.length) return;
    const ids = (kind) => new Set(this.selected.filter((s) => s.kind === kind).map((s) => s.id));
    const walls = ids('wall');
    const openings = ids('opening');
    const rooms = ids('room');
    const items = ids('item');

    this.plan.walls = this.plan.walls.filter((w) => !walls.has(w.id));
    this.plan.openings = this.plan.openings.filter(
      (o) => !openings.has(o.id) && !walls.has(o.wallId)
    );
    this.plan.rooms = this.plan.rooms.filter((r) => !rooms.has(r.id));
    this.plan.items = this.plan.items.filter((i) => !items.has(i.id));

    this.selected = [];
    this.emit();
  }

  _hitTest(p) {
    const tol = 10 / this.view.zoom;
    for (const item of this.plan.items || []) {
      const spec = furniture.footprint(item);
      if (!spec) continue;
      if (this._inItem(p, item, spec)) return { kind: 'item', id: item.id };
    }
    for (const op of this.plan.openings || []) {
      const wall = this.plan.walls.find((w) => w.id === op.wallId);
      if (!wall) continue;
      const c = wallPointAt(wall, op.pos);
      if (dist(p, c) < Math.max(tol, op.width / 2)) return { kind: 'opening', id: op.id };
    }
    for (const wall of this.plan.walls) {
      if (pointToWall(p, wall).dist < Math.max(tol, wall.t / 2 + 0.03)) {
        return { kind: 'wall', id: wall.id };
      }
    }
    for (const room of this.plan.rooms || []) {
      if (pointInPolygon(p, room.poly)) return { kind: 'room', id: room.id };
    }
    return null;
  }

  _inItem(p, item, spec) {
    const c = Math.cos(-item.rot || 0), s = Math.sin(-item.rot || 0);
    const dx = p.x - item.x, dy = p.y - item.y;
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    return Math.abs(lx) <= spec.w / 2 && Math.abs(ly) <= spec.d / 2;
  }

  _selectAt(p, shift = false) {
    // wall endpoint handles win over everything else
    const grab = 11 / this.view.zoom;
    if (!shift) {
      for (const wall of this.plan.walls) {
        if (dist(p, { x: wall.x1, y: wall.y1 }) < grab) {
          this.selection = { kind: 'wall', id: wall.id };
          this.drag = { kind: 'wallEnd', id: wall.id, end: 1 };
          return;
        }
        if (dist(p, { x: wall.x2, y: wall.y2 }) < grab) {
          this.selection = { kind: 'wall', id: wall.id };
          this.drag = { kind: 'wallEnd', id: wall.id, end: 2 };
          return;
        }
      }
    }
    // rotation handle of the selected item
    if (this.selection && this.selection.kind === 'item') {
      const item = this.plan.items.find((i) => i.id === this.selection.id);
      const spec = item && furniture.footprint(item);
      if (item && spec) {
        const h = this._rotateHandle(item, spec);
        if (dist(p, h) < grab * 1.2) {
          this.drag = { kind: 'rotate', id: item.id };
          return;
        }
      }
    }

    const hit = this._hitTest(p);

    if (shift) {
      // shift adds to (or removes from) the selection, and never starts a drag
      if (hit) {
        this.toggleSelected(hit);
        this.dispatchEvent(new CustomEvent('select', { detail: this.selection }));
      }
      return;
    }

    if (!hit) {
      // dragging from empty space sweeps a box over the plan
      this.selected = [];
      this.drag = { kind: 'marquee', from: p, to: p };
      this.dispatchEvent(new CustomEvent('select', { detail: null }));
      return;
    }

    if (!this.isSelected(hit.kind, hit.id)) this.selection = hit;
    if (hit.kind === 'item') {
      const item = this.plan.items.find((i) => i.id === hit.id);
      this.drag = { kind: 'item', id: hit.id, grab: p, orig: { x: item.x, y: item.y } };
    } else if (hit.kind === 'opening') {
      this.drag = { kind: 'opening', id: hit.id };
    } else if (hit.kind === 'wall') {
      const wall = this.plan.walls.find((w) => w.id === hit.id);
      this.drag = {
        kind: 'wallMove', id: hit.id, grab: p,
        orig: { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 },
      };
    }
    this.dispatchEvent(new CustomEvent('select', { detail: this.selection }));
  }

  // Everything whose centre falls inside the swept box.
  _applyMarquee(drag) {
    const minX = Math.min(drag.from.x, drag.to.x);
    const maxX = Math.max(drag.from.x, drag.to.x);
    const minY = Math.min(drag.from.y, drag.to.y);
    const maxY = Math.max(drag.from.y, drag.to.y);
    if (maxX - minX < 0.05 && maxY - minY < 0.05) return;
    const inside = (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY;

    const picked = [];
    for (const wall of this.plan.walls) {
      if (inside((wall.x1 + wall.x2) / 2, (wall.y1 + wall.y2) / 2)) {
        picked.push({ kind: 'wall', id: wall.id });
      }
    }
    for (const item of this.plan.items || []) {
      if (inside(item.x, item.y)) picked.push({ kind: 'item', id: item.id });
    }
    for (const op of this.plan.openings || []) {
      const wall = this.plan.walls.find((w) => w.id === op.wallId);
      if (!wall) continue;
      const c = wallPointAt(wall, op.pos);
      if (inside(c.x, c.y)) picked.push({ kind: 'opening', id: op.id });
    }
    this.selected = picked;
  }

  _rotateHandle(item, spec) {
    const d = spec.d / 2 + 0.35;
    return {
      x: item.x + Math.sin(item.rot || 0) * -d,
      y: item.y + Math.cos(item.rot || 0) * -d,
    };
  }

  // --------------------------------------------------------------- drawing

  draw() {
    const ctx = this.ctx;
    const { zoom, ox, oy } = this.view;
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f7f5f1';
    ctx.fillRect(0, 0, W, H);

    this._drawGrid(ctx, W, H);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    if (this.image && this.showImage) {
      ctx.globalAlpha = 0.4;
      ctx.drawImage(this.image, 0, 0,
        this.image.width / this.plan.scale, this.image.height / this.plan.scale);
      ctx.globalAlpha = 1;
    }

    this._drawRooms(ctx);
    this._drawWalls(ctx);
    this._drawOpenings(ctx);
    this._drawItems(ctx);
    this._drawGuides(ctx);

    ctx.restore();
    this._drawScaleBar(ctx, W, H);
    ctx.restore();
  }

  _drawGrid(ctx, W, H) {
    const { zoom, ox, oy } = this.view;
    let step = 1;
    while (step * zoom < 26) step *= 2;
    while (step * zoom > 120) step /= 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = Math.floor(-ox / zoom / step) * step;
    for (let x = x0; x * zoom + ox < W; x += step) {
      const sx = Math.round(x * zoom + ox) + 0.5;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, H);
    }
    const y0 = Math.floor(-oy / zoom / step) * step;
    for (let y = y0; y * zoom + oy < H; y += step) {
      const sy = Math.round(y * zoom + oy) + 0.5;
      ctx.moveTo(0, sy); ctx.lineTo(W, sy);
    }
    ctx.stroke();
  }

  _drawRooms(ctx) {
    for (const room of this.plan.rooms || []) {
      const selected = this.isSelected('room', room.id);
      ctx.beginPath();
      room.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = selected ? COLORS.roomSel : COLORS.room;
      ctx.fill();
      ctx.strokeStyle = COLORS.roomLine;
      ctx.lineWidth = 1.5 / this.view.zoom;
      ctx.stroke();

      const c = polygonCentroid(room.poly);
      const area = Math.abs(polygonArea(room.poly));
      ctx.save();
      ctx.translate(c.x, c.y);
      const s = 1 / this.view.zoom;
      ctx.scale(s, s);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#31404f';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(room.name || 'Room', 0, -2);
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#6c7a88';
      ctx.fillText(`${area.toFixed(1)} m²`, 0, 13);
      ctx.restore();
    }
  }

  _drawWalls(ctx) {
    for (const wall of this.plan.walls) {
      const selected = this.isSelected('wall', wall.id);
      ctx.strokeStyle = selected ? COLORS.wallSel : COLORS.wall;
      ctx.lineWidth = Math.max(wall.t, 0.04);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();

      if (selected && this.selected.length === 1) {
        ctx.fillStyle = COLORS.wallSel;
        for (const e of [[wall.x1, wall.y1], [wall.x2, wall.y2]]) {
          ctx.beginPath();
          ctx.arc(e[0], e[1], 7 / this.view.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  _drawOpenings(ctx) {
    for (const op of this.plan.openings || []) {
      const wall = this.plan.walls.find((w) => w.id === op.wallId);
      if (!wall) continue;
      const L = wallLength(wall);
      const a = wallPointAt(wall, clamp(op.pos - op.width / 2, 0, L));
      const b = wallPointAt(wall, clamp(op.pos + op.width / 2, 0, L));
      const selected = this.isSelected('opening', op.id);

      ctx.strokeStyle = '#f7f5f1';
      ctx.lineWidth = Math.max(wall.t, 0.04) * 1.02;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.stroke();

      ctx.strokeStyle = selected ? COLORS.wallSel : (op.type === 'door' ? COLORS.door : COLORS.window);
      ctx.lineWidth = (op.type === 'door' ? 0.06 : 0.075);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.stroke();

      if (op.type === 'door') {
        // swing arc
        const dir = { x: (b.x - a.x) / op.width, y: (b.y - a.y) / op.width };
        const n = { x: -dir.y, y: dir.x };
        ctx.strokeStyle = selected ? COLORS.wallSel : 'rgba(29,154,108,0.6)';
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + n.x * op.width, a.y + n.y * op.width);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(a.x, a.y, op.width, Math.atan2(n.y, n.x), Math.atan2(dir.y, dir.x),
          Math.atan2(n.y, n.x) > Math.atan2(dir.y, dir.x));
        ctx.stroke();
      }
    }
  }

  _drawItems(ctx) {
    for (const item of this.plan.items || []) {
      const spec = furniture.footprint(item);
      if (!spec) continue;
      const selected = this.isSelected('item', item.id);
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot || 0);
      ctx.fillStyle = selected ? 'rgba(194,65,12,0.22)' : COLORS.itemFill;
      ctx.strokeStyle = selected ? COLORS.wallSel : COLORS.item;
      ctx.lineWidth = 1.4 / this.view.zoom;
      ctx.beginPath();
      ctx.rect(-spec.w / 2, -spec.d / 2, spec.w, spec.d);
      ctx.fill();
      ctx.stroke();
      // a tick on the facing side
      ctx.beginPath();
      ctx.moveTo(0, -spec.d / 2);
      ctx.lineTo(0, -spec.d / 2 - Math.min(0.18, spec.d * 0.3));
      ctx.stroke();
      ctx.restore();

      if (selected && this.selected.length === 1) {
        const h = this._rotateHandle(item, spec);
        ctx.fillStyle = COLORS.wallSel;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 6 / this.view.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawGuides(ctx) {
    const z = this.view.zoom;
    if (this.drag && this.drag.kind === 'newWall') {
      const { from, to } = this.drag;
      ctx.strokeStyle = COLORS.guide;
      ctx.lineWidth = Math.max(this.plan.defaultThickness || 0.12, 0.04);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      this._label(ctx, `${dist(from, to).toFixed(2)} m`, (from.x + to.x) / 2, (from.y + to.y) / 2);
    }
    if (this.drag && this.drag.kind === 'sketch') {
      const pts = this.drag.points;
      ctx.strokeStyle = COLORS.guide;
      ctx.fillStyle = 'rgba(194, 65, 12, 0.12)';
      ctx.lineWidth = 2.5 / z;
      ctx.setLineDash([7 / z, 5 / z]);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.drag && this.drag.kind === 'marquee') {
      const { from, to } = this.drag;
      ctx.fillStyle = 'rgba(194, 65, 12, 0.1)';
      ctx.strokeStyle = COLORS.guide;
      ctx.lineWidth = 1.2 / z;
      ctx.setLineDash([5 / z, 3 / z]);
      ctx.beginPath();
      ctx.rect(from.x, from.y, to.x - from.x, to.y - from.y);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.calibration) {
      const { from, to } = this.calibration;
      ctx.strokeStyle = COLORS.guide;
      ctx.lineWidth = 2 / z;
      ctx.setLineDash([6 / z, 4 / z]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      this._label(ctx, `${dist(from, to).toFixed(2)} m`, (from.x + to.x) / 2, (from.y + to.y) / 2);
    }
  }

  _label(ctx, text, x, y) {
    const s = 1 / this.view.zoom;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.font = '600 12px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(-w / 2, -22, w, 18);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -22, w, 18);
    ctx.fillStyle = '#2c2c2c';
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, -9);
    ctx.restore();
  }

  _drawScaleBar(ctx, W, H) {
    const zoom = this.view.zoom;
    let metres = 1;
    while (metres * zoom < 60) metres *= 2;
    while (metres * zoom > 160) metres /= 2;
    const px = metres * zoom;
    const x = 16, y = H - 22;
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 5); ctx.lineTo(x, y); ctx.lineTo(x + px, y); ctx.lineTo(x + px, y - 5);
    ctx.stroke();
    ctx.fillStyle = '#2c2c2c';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${metres} m`, x + px + 8, y + 1);
  }
}
