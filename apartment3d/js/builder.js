// Turns a plan (metres, y-down) into a three.js scene graph.
// World mapping: plan x -> world x, plan y -> world z, up is +y.

import * as THREE from 'three';
import {
  wallLength, wallPointAt, subtractIntervals, polygonCentroid, polygonArea,
  pointInPolygon, offsetPolygon, ensureCCW, dedupe, removeCollinear,
} from './geom.js';
import { material, flat, glass } from './textures.js';
import * as furniture from './furniture.js';

const DEFAULTS = {
  wallHeight: 2.7,
  wallMaterial: 'wall',
  ceiling: true,
  baseboards: true,
  furnish: true,
};

// Rewrite box UVs so textures tile at a real-world size instead of stretching.
function worldUV(geo, w, h, d, tile) {
  const uv = geo.attributes.uv;
  const spans = [
    [d, h], [d, h],   // +x, -x
    [w, d], [w, d],   // +y, -y
    [w, h], [w, h],   // +z, -z
  ];
  for (let face = 0; face < 6; face++) {
    const [su, sv] = spans[face];
    for (let i = 0; i < 4; i++) {
      const idx = face * 4 + i;
      uv.setXY(idx, uv.getX(idx) * (su / tile), uv.getY(idx) * (sv / tile));
    }
  }
  uv.needsUpdate = true;
  return geo;
}

function texturedBox(w, h, d, mat, tile) {
  const geo = new THREE.BoxGeometry(w, h, d);
  worldUV(geo, w, h, d, tile || mat.userData.tile || 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function wallAngle(wall) {
  return Math.atan2(-(wall.y2 - wall.y1), wall.x2 - wall.x1);
}

// Place a piece of wall: `s` metres along the wall, spanning y0..y1 vertically.
function placePiece(group, wall, s0, s1, y0, y1, mat) {
  const w = s1 - s0;
  const h = y1 - y0;
  if (w <= 0.005 || h <= 0.005) return;
  const mid = wallPointAt(wall, (s0 + s1) / 2);
  const mesh = texturedBox(w, h, wall.t, mat);
  mesh.position.set(mid.x, (y0 + y1) / 2, mid.y);
  mesh.rotation.y = wallAngle(wall);
  mesh.userData.wallId = wall.id;
  group.add(mesh);
}

function doorLeaf(width, height, openAngle) {
  const g = new THREE.Group();
  const leafW = width - 0.04;
  const panel = texturedBox(leafW, height - 0.03, 0.04, material('ash'), 1.2);
  panel.position.set(leafW / 2, (height - 0.03) / 2, 0);
  g.add(panel);
  const handleMat = flat(0xb8bcc0, { roughness: 0.25, metalness: 0.85 });
  for (const z of [-0.035, 0.035]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.11, 10), handleMat);
    h.rotation.x = Math.PI / 2;
    h.position.set(leafW - 0.07, 1.05, z);
    g.add(h);
  }
  g.rotation.y = openAngle;
  return g;
}

function openingFrame(group, wall, s0, s1, y0, y1, mat) {
  const depth = wall.t + 0.03;
  const jamb = 0.05;
  const angle = wallAngle(wall);
  const add = (s, w, y, h) => {
    const mid = wallPointAt(wall, s);
    const mesh = texturedBox(w, h, depth, mat, 1.0);
    mesh.position.set(mid.x, y, mid.y);
    mesh.rotation.y = angle;
    group.add(mesh);
  };
  add(s0 + jamb / 2, jamb, (y0 + y1) / 2, y1 - y0);
  add(s1 - jamb / 2, jamb, (y0 + y1) / 2, y1 - y0);
  add((s0 + s1) / 2, s1 - s0, y1 - jamb / 2, jamb);
}

function windowUnit(group, wall, s0, s1, y0, y1) {
  const angle = wallAngle(wall);
  const width = s1 - s0;
  const height = y1 - y0;
  const frameMat = flat(0xf2f0ec, { roughness: 0.35 });
  const depth = wall.t + 0.02;
  const bar = 0.055;

  const put = (mesh, s, y) => {
    const mid = wallPointAt(wall, s);
    mesh.position.set(mid.x, y, mid.y);
    mesh.rotation.y = angle;
    group.add(mesh);
  };

  put(new THREE.Mesh(new THREE.BoxGeometry(bar, height, depth), frameMat), s0 + bar / 2, (y0 + y1) / 2);
  put(new THREE.Mesh(new THREE.BoxGeometry(bar, height, depth), frameMat), s1 - bar / 2, (y0 + y1) / 2);
  put(new THREE.Mesh(new THREE.BoxGeometry(width, bar, depth), frameMat), (s0 + s1) / 2, y0 + bar / 2);
  put(new THREE.Mesh(new THREE.BoxGeometry(width, bar, depth), frameMat), (s0 + s1) / 2, y1 - bar / 2);
  // centre mullion on wide windows
  if (width > 1.3) {
    put(new THREE.Mesh(new THREE.BoxGeometry(bar * 0.8, height, depth), frameMat), (s0 + s1) / 2, (y0 + y1) / 2);
  }
  const pane = new THREE.Mesh(new THREE.BoxGeometry(width - bar * 2, height - bar * 2, 0.012), glass());
  pane.renderOrder = 2;
  put(pane, (s0 + s1) / 2, (y0 + y1) / 2);

  const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.03, wall.t + 0.14), frameMat);
  sill.castShadow = true;
  sill.receiveShadow = true;
  put(sill, (s0 + s1) / 2, y0 - 0.015);
}

function buildWalls(plan, opts, out) {
  const group = new THREE.Group();
  group.name = 'walls';
  const mat = material(opts.wallMaterial);
  const H = plan.wallHeight || opts.wallHeight;

  for (const wall of plan.walls) {
    const L = wallLength(wall);
    if (L < 0.05) continue;
    const openings = (plan.openings || [])
      .filter((o) => o.wallId === wall.id)
      .map((o) => {
        const half = o.width / 2;
        return {
          ...o,
          s0: Math.max(0, Math.min(L - 0.05, o.pos - half)),
          s1: Math.min(L, Math.max(0.05, o.pos + half)),
        };
      })
      .filter((o) => o.s1 - o.s0 > 0.1)
      .sort((a, b) => a.s0 - b.s0);

    // full-height stretches between openings
    for (const [s0, s1] of subtractIntervals(L, openings.map((o) => [o.s0, o.s1]))) {
      placePiece(group, wall, s0, s1, 0, H, mat);
    }

    for (const o of openings) {
      const sill = o.type === 'window' ? (o.sill ?? 0.9) : 0;
      const top = Math.min(H, sill + o.height);
      if (sill > 0.01) placePiece(group, wall, o.s0, o.s1, 0, sill, mat);
      if (top < H - 0.01) placePiece(group, wall, o.s0, o.s1, top, H, mat);

      if (o.type === 'window') {
        const before = group.children.length;
        windowUnit(group, wall, o.s0, o.s1, sill, top);
        for (let i = before; i < group.children.length; i++) {
          group.children[i].userData.openingId = o.id;
        }
      } else {
        openingFrame(group, wall, o.s0, o.s1, 0, top, material('ash'));
        const hingeAt = o.hinge === 'end' ? o.s1 : o.s0;
        const dirSign = o.hinge === 'end' ? -1 : 1;
        const leaf = doorLeaf(o.width - 0.06, top - 0.02, wallAngle(wall) + dirSign * (Math.PI * 0.62));
        const p = wallPointAt(wall, hingeAt + dirSign * 0.03);
        const holder = new THREE.Group();
        holder.position.set(p.x, 0, p.y);
        holder.userData.openingId = o.id;
        holder.add(leaf);
        group.add(holder);
      }

      // door openings are walkable, windows are not
      if (o.type !== 'window') {
        out.doorSpans.push({ wallId: wall.id, s0: o.s0, s1: o.s1 });
      }
    }

    // collision uses the solid stretches only, so doorways are passable
    const passable = openings.filter((o) => o.type !== 'window').map((o) => [o.s0, o.s1]);
    for (const [s0, s1] of subtractIntervals(L, passable)) {
      const a = wallPointAt(wall, s0);
      const b = wallPointAt(wall, s1);
      out.collision.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, t: wall.t });
    }
  }
  return group;
}

function shapeFromPolygon(poly) {
  const shape = new THREE.Shape();
  poly.forEach(([x, y], i) => {
    // negate plan y, then rotateX(-90) puts it back on +z with the face up
    if (i === 0) shape.moveTo(x, -y);
    else shape.lineTo(x, -y);
  });
  shape.closePath();
  return shape;
}

function surfaceGeometry(poly, tile) {
  const geo = new THREE.ShapeGeometry(shapeFromPolygon(poly));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildFloors(plan, opts, out) {
  const group = new THREE.Group();
  group.name = 'floors';
  const H = plan.wallHeight || opts.wallHeight;

  for (const room of plan.rooms || []) {
    const poly = removeCollinear(room.poly.map((p) => p.slice()));
    if (poly.length < 3) continue;
    // grow under the walls so no seam shows at the skirting
    const grown = offsetPolygon(poly, 0.1);

    const floorMat = material(room.floor || 'oak');
    const floor = new THREE.Mesh(surfaceGeometry(grown, floorMat.userData.tile), floorMat);
    floor.receiveShadow = true;
    floor.position.y = 0.002;
    floor.userData.room = room.id;
    group.add(floor);

    if (opts.ceiling) {
      const ceilMat = material('ceiling').clone();
      ceilMat.side = THREE.BackSide;   // visible from inside, see-through from above
      const ceil = new THREE.Mesh(surfaceGeometry(grown, ceilMat.userData.tile || 3), ceilMat);
      ceil.position.y = H - 0.002;
      ceil.name = 'ceiling';
      group.add(ceil);
    }

    if (opts.baseboards) buildBaseboards(group, plan, room, poly, out);
  }
  return group;
}

function buildBaseboards(group, plan, room, poly, out) {
  const mat = flat(0xf7f5f1, { roughness: 0.55 });
  const height = 0.09;
  const thickness = 0.018;
  const ring = ensureCCW(poly);

  for (let i = 0; i < ring.length; i++) {
    const a = { x: ring[i][0], y: ring[i][1] };
    const b = { x: ring[(i + 1) % ring.length][0], y: ring[(i + 1) % ring.length][1] };
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    if (L < 0.12) continue;
    const ux = dx / L, uy = dy / L;
    let nx = -uy, ny = ux;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (!pointInPolygon({ x: mid.x + nx * 0.05, y: mid.y + ny * 0.05 }, ring)) { nx = -nx; ny = -ny; }

    // skip the stretches taken up by doorways
    const holes = [];
    for (const span of out.doorSpans) {
      const wall = plan.walls.find((w) => w.id === span.wallId);
      if (!wall) continue;
      const p0 = wallPointAt(wall, span.s0);
      const p1 = wallPointAt(wall, span.s1);
      const proj = (p) => ((p.x - a.x) * ux + (p.y - a.y) * uy);
      const perp = (p) => Math.abs((p.x - a.x) * nx + (p.y - a.y) * ny);
      if (perp(p0) > wall.t + 0.12 || perp(p1) > wall.t + 0.12) continue;
      const t0 = proj(p0), t1 = proj(p1);
      holes.push([Math.min(t0, t1) - 0.03, Math.max(t0, t1) + 0.03]);
    }

    for (const [s0, s1] of subtractIntervals(L, holes)) {
      const w = s1 - s0;
      if (w < 0.06) continue;
      const cx = a.x + ux * (s0 + w / 2) + nx * (thickness / 2);
      const cy = a.y + uy * (s0 + w / 2) + ny * (thickness / 2);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, thickness), mat);
      mesh.position.set(cx, height / 2 + 0.004, cy);
      mesh.rotation.y = Math.atan2(-uy, ux);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}

function buildLights(plan, opts) {
  const group = new THREE.Group();
  group.name = 'roomLights';
  const H = plan.wallHeight || opts.wallHeight;
  const shadeMat = flat(0xfffaf0, {
    roughness: 0.9,
    opts: { emissive: 0xfff0d0, emissiveIntensity: 1.0 },
  });

  for (const room of plan.rooms || []) {
    const area = Math.abs(polygonArea(room.poly));
    if (area < 1.2) continue;
    const c = polygonCentroid(room.poly);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.07, 20), shadeMat);
    disc.position.set(c.x, H - 0.09, c.y);
    group.add(disc);

    const light = new THREE.PointLight(0xffe9c4, 0, Math.max(4, Math.sqrt(area) * 3.2), 1.6);
    light.position.set(c.x, H - 0.35, c.y);
    light.userData.baseIntensity = Math.min(9, 3.5 + area * 0.22);
    group.add(light);
  }
  return group;
}

// --------------------------------------------------------------- furnishing

// Drop a kit into a room: big pieces against the longest walls, the rest
// around the centre. Good enough to read as a furnished flat.
export function autoFurnish(plan) {
  const items = [];
  for (const room of plan.rooms || []) {
    const kit = furniture.kitFor(room.name || '');
    if (!kit) continue;
    const ring = ensureCCW(dedupe(room.poly.map((p) => p.slice())));
    const c = polygonCentroid(ring);
    const area = Math.abs(polygonArea(ring));
    if (area < 1.4) continue;

    // candidate wall slots, longest first
    const slots = [];
    for (let i = 0; i < ring.length; i++) {
      const a = { x: ring[i][0], y: ring[i][1] };
      const b = { x: ring[(i + 1) % ring.length][0], y: ring[(i + 1) % ring.length][1] };
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L < 0.7) continue;
      const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
      let nx = -uy, ny = ux;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (!pointInPolygon({ x: mid.x + nx * 0.05, y: mid.y + ny * 0.05 }, ring)) { nx = -nx; ny = -ny; }
      slots.push({ a, ux, uy, nx, ny, L, used: [] });
    }
    slots.sort((p, q) => q.L - p.L);
    if (!slots.length) continue;

    let slotIndex = 0;
    for (const type of kit) {
      const spec = furniture.spec(type);
      if (!spec) continue;
      const centred = type === 'rug' || type === 'coffee_table' ||
                      type === 'dining_table' || type === 'kitchen_island';

      if (centred) {
        if (spec.w > Math.sqrt(area) * 1.6) continue;
        items.push({
          id: `f_${Math.random().toString(36).slice(2, 8)}`,
          type, x: c.x, y: c.y, rot: 0, level: room.level || 0,
        });
        continue;
      }

      // find a slot with room left
      let placed = false;
      for (let attempt = 0; attempt < slots.length && !placed; attempt++) {
        const slot = slots[(slotIndex + attempt) % slots.length];
        const need = spec.w + 0.12;
        if (slot.L < need) continue;
        const taken = slot.used.reduce((s, u) => s + u, 0);
        if (taken + need > slot.L) continue;
        const along = taken + need / 2;
        slot.used.push(need);
        const depth = spec.d / 2 + 0.06;
        items.push({
          id: `f_${Math.random().toString(36).slice(2, 8)}`,
          type,
          x: slot.a.x + slot.ux * along + slot.nx * depth,
          y: slot.a.y + slot.uy * along + slot.ny * depth,
          // furniture faces -Z by default; turn its back to the wall
          rot: Math.atan2(-slot.ny, slot.nx) + Math.PI / 2,
          level: room.level || 0,
        });
        placed = true;
        slotIndex = (slotIndex + attempt + 1) % slots.length;
      }
    }
  }
  return items;
}

function buildFurniture(plan) {
  const group = new THREE.Group();
  group.name = 'furniture';
  for (const item of plan.items || []) {
    const mesh = furniture.build(item.type, item);
    if (!mesh) continue;
    const spec = mesh.userData.spec;
    // a traced staircase carries the size it was found at; furniture the user
    // resized carries a plain scale
    if (item.fit) {
      mesh.scale.set(
        Math.max(0.2, item.fit.w / spec.w),
        item.fit.h ? item.fit.h / spec.h : 1,
        Math.max(0.2, item.fit.d / spec.d)
      );
    } else if (item.scale && item.scale !== 1) {
      mesh.scale.setScalar(item.scale);
    }
    const mountY = spec.mountY || 0;
    mesh.position.set(item.x, mountY, item.y);
    mesh.rotation.y = item.rot || 0;
    mesh.userData.itemId = item.id;
    group.add(mesh);
  }
  return group;
}

// -------------------------------------------------------------------- entry

// Split a plan into one sub-plan per level. Drawings that sit side by side on
// the sheet are shifted so their footprints line up, then stacked.
function splitLevels(plan) {
  const groups = new Map();
  const push = (level, key, value) => {
    if (!groups.has(level)) groups.set(level, { walls: [], rooms: [], items: [] });
    groups.get(level)[key].push(value);
  };
  for (const wall of plan.walls || []) push(wall.level || 0, 'walls', wall);
  for (const room of plan.rooms || []) push(room.level || 0, 'rooms', room);
  for (const item of plan.items || []) push(item.level || 0, 'items', item);

  const offsets = plan.levelOffsets || {};
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, parts]) => {
      const ids = new Set(parts.walls.map((w) => w.id));
      const off = offsets[level] || { dx: 0, dy: 0 };
      return {
        level,
        dx: off.dx || 0,
        dy: off.dy || 0,
        sub: {
          ...plan,
          walls: parts.walls,
          rooms: parts.rooms,
          items: parts.items,
          openings: (plan.openings || []).filter((o) => ids.has(o.wallId)),
        },
      };
    });
}

export function buildApartment(plan, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const root = new THREE.Group();
  root.name = 'apartment';
  const H = plan.wallHeight || opts.wallHeight;
  const collision = [];

  for (const { level, dx, dy, sub } of splitLevels(plan)) {
    const out = { collision: [], doorSpans: [] };
    const group = new THREE.Group();
    group.name = `level-${level}`;

    // walls first: it records the door spans that the skirting needs to skip
    group.add(buildWalls(sub, opts, out));
    group.add(buildFloors(sub, opts, out));
    group.add(buildLights(sub, opts));
    if (opts.furnish !== false) group.add(buildFurniture(sub));

    const yBase = level * H;
    group.position.set(dx, yBase, dy);
    group.userData.level = level;
    root.add(group);

    // collision lives in world coordinates so the walkthrough can use it directly
    for (const c of out.collision) {
      collision.push({
        x1: c.x1 + dx, y1: c.y1 + dy,
        x2: c.x2 + dx, y2: c.y2 + dy,
        t: c.t, level, yBase,
      });
    }
  }

  const bounds = new THREE.Box3().setFromObject(root);
  return { root, collision, bounds, height: H };
}
