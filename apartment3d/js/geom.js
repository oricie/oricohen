// Geometry helpers. Plan space is metres: x to the right, y downwards
// (matching image coordinates). The 3D builder maps plan y onto world z.

export const EPS = 1e-6;

export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const cross = (a, b) => a.x * b.y - a.y * b.x;
export const len = (a) => Math.hypot(a.x, a.y);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function norm(a) {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
}

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function wallVec(w) {
  return { x: w.x2 - w.x1, y: w.y2 - w.y1 };
}

export function wallLength(w) {
  return Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
}

export function wallDir(w) {
  return norm(wallVec(w));
}

export function wallNormal(w) {
  const d = wallDir(w);
  return { x: -d.y, y: d.x };
}

export function wallPointAt(w, s) {
  const l = wallLength(w) || 1;
  const t = s / l;
  return { x: w.x1 + (w.x2 - w.x1) * t, y: w.y1 + (w.y2 - w.y1) * t };
}

// Distance from p to segment ab, plus the closest point and its parameter.
export function closestOnSegment(p, a, b) {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  let t = l2 < EPS ? 0 : dot(sub(p, a), ab) / l2;
  t = Math.max(0, Math.min(1, t));
  const c = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return { point: c, t, dist: dist(p, c) };
}

export function pointToWall(p, w) {
  return closestOnSegment(p, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
}

// Intersection of two infinite lines given as point + direction.
export function lineIntersect(p1, d1, p2, d2) {
  const den = cross(d1, d2);
  if (Math.abs(den) < 1e-9) return null;
  const t = cross(sub(p2, p1), d2) / den;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

export function polygonArea(poly) {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function polygonCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    const f = p[0] * q[1] - q[0] * p[1];
    a += f;
    cx += (p[0] + q[0]) * f;
    cy += (p[1] + q[1]) * f;
  }
  a /= 2;
  if (Math.abs(a) < EPS) return { x: poly[0][0], y: poly[0][1] };
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > pt.y) !== (yj > pt.y) &&
        pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + EPS) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonBounds(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function ensureCCW(poly) {
  return polygonArea(poly) < 0 ? poly.slice().reverse() : poly;
}

// Ramer-Douglas-Peucker on an array of [x, y] pairs.
export function simplify(points, tolerance) {
  if (points.length < 3) return points.slice();
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0, index = -1;
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      let t = l2 < EPS ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
      if (d > maxDist) { maxDist = d; index = i; }
    }
    if (maxDist > tolerance && index > 0) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Snap edges that are within `angle` radians of an axis to be exactly axial.
export function rectilinearize(poly, angle = 0.28) {
  const out = poly.map((p) => p.slice());
  for (let i = 0; i < out.length; i++) {
    const j = (i + 1) % out.length;
    const dx = out[j][0] - out[i][0];
    const dy = out[j][1] - out[i][1];
    const a = Math.atan2(Math.abs(dy), Math.abs(dx));
    if (a < angle) {
      const y = (out[i][1] + out[j][1]) / 2;
      out[i][1] = out[j][1] = y;
    } else if (a > Math.PI / 2 - angle) {
      const x = (out[i][0] + out[j][0]) / 2;
      out[i][0] = out[j][0] = x;
    }
  }
  return dedupe(out);
}

export function dedupe(poly, tol = 1e-4) {
  const out = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > tol) out.push(p);
  }
  while (out.length > 1 &&
         Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < tol) {
    out.pop();
  }
  return out;
}

// Drop vertices that sit (almost) on the line between their neighbours.
// Contour tracing leaves many of these, and they make edge offsetting explode.
export function removeCollinear(poly, tol = 1e-3) {
  const p = dedupe(poly);
  if (p.length < 4) return p;
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[(i - 1 + p.length) % p.length];
    const b = p[i];
    const c = p[(i + 1) % p.length];
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const bcx = c[0] - b[0], bcy = c[1] - b[1];
    const la = Math.hypot(abx, aby), lc = Math.hypot(bcx, bcy);
    if (la < EPS || lc < EPS) continue;
    // |sin| between the two edge directions
    const sin = Math.abs(abx * bcy - aby * bcx) / (la * lc);
    if (sin > tol) out.push(b);
  }
  return out.length >= 3 ? out : p;
}

// Offset a simple polygon outwards (positive d) by intersecting offset edges.
// Falls back to the input when the offset would self-destruct.
export function offsetPolygon(poly, d) {
  const p = ensureCCW(removeCollinear(poly));
  const n = p.length;
  if (n < 3) return poly;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = { x: p[i][0], y: p[i][1] };
    const b = { x: p[(i + 1) % n][0], y: p[(i + 1) % n][1] };
    const dir = norm(sub(b, a));
    // CCW polygon in a y-down space: outward normal is (dir.y, -dir.x).
    const nrm = { x: dir.y, y: -dir.x };
    lines.push({ p: add(a, mul(nrm, d)), d: dir });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = lines[(i - 1 + n) % n];
    const cur = lines[i];
    const hit = lineIntersect(prev.p, prev.d, cur.p, cur.d);
    const corner = hit || cur.p;
    // A near-parallel pair sends the intersection off to infinity; clamp it
    // back to the original vertex rather than growing a spike.
    if (dist(corner, { x: p[i][0], y: p[i][1] }) > Math.abs(d) * 4 + 0.05) {
      out.push([cur.p.x, cur.p.y]);
    } else {
      out.push([corner.x, corner.y]);
    }
  }
  const res = dedupe(out);
  if (res.length < 3) return poly;
  if (Math.sign(polygonArea(res)) !== Math.sign(polygonArea(p))) return poly;
  // a sane offset changes the area by roughly perimeter * d, never by 3x
  const a0 = Math.abs(polygonArea(p));
  const a1 = Math.abs(polygonArea(res));
  if (a0 > EPS && (a1 / a0 > 2.2 || a1 / a0 < 0.45)) return poly;
  return res;
}

// Subtract a list of [start, end] intervals from [0, total].
export function subtractIntervals(total, holes) {
  const sorted = holes
    .map((h) => [Math.max(0, h[0]), Math.min(total, h[1])])
    .filter((h) => h[1] > h[0])
    .sort((a, b) => a[0] - b[0]);
  const spans = [];
  let cursor = 0;
  for (const [s, e] of sorted) {
    if (s > cursor + 1e-4) spans.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < total - 1e-4) spans.push([cursor, total]);
  return spans;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// A plan sheet can hold several drawings (the floors of one flat, side by
// side). Each is a "section" with a bounding box and the level it maps to;
// a section with level === null is excluded from the model.
export function sectionAt(plan, x, y) {
  for (const sec of plan.sections || []) {
    if (x >= sec.minX && x <= sec.maxX && y >= sec.minY && y <= sec.maxY) return sec;
  }
  return null;
}

export function levelAt(plan, x, y) {
  const sec = sectionAt(plan, x, y);
  return sec && sec.level != null ? sec.level : 0;
}

// Keep a point inside the flat. If it is already in one of the polygons it is
// returned untouched; otherwise it is pulled to the nearest spot just inside
// the closest one. Dropping a bed on the lawn is never what was meant.
export function snapIntoPolygons(pt, polys, inset = 0.25) {
  if (!polys || !polys.length) return { point: pt, moved: false };
  for (const poly of polys) {
    if (pointInPolygon(pt, poly)) return { point: pt, moved: false };
  }

  let best = null;
  let bestDist = Infinity;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = { x: poly[i][0], y: poly[i][1] };
      const b = { x: poly[(i + 1) % poly.length][0], y: poly[(i + 1) % poly.length][1] };
      const hit = closestOnSegment(pt, a, b);
      if (hit.dist < bestDist) { bestDist = hit.dist; best = { hit, poly }; }
    }
  }
  if (!best) return { point: pt, moved: false };

  // step in from the edge towards the middle of that room
  const centre = polygonCentroid(best.poly);
  const away = norm(sub(centre, best.hit.point));
  const inside = add(best.hit.point, mul(away, inset));
  return {
    point: pointInPolygon(inside, best.poly) ? inside : centre,
    moved: true,
  };
}

// The four corners of an item's footprint, in plan coordinates.
export function footprintCorners(centre, w, d, rot = 0) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const hw = w / 2;
  const hd = d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, ly]) => ({
    x: centre.x + lx * c - ly * s,
    y: centre.y + lx * s + ly * c,
  }));
}

// Slide a piece of furniture until its whole footprint sits inside a room,
// not just its centre. Snapping the centre alone leaves half a bed poking
// through the wall.
export function fitInsidePolygons(centre, w, d, rot, polys, margin = 0.03) {
  if (!polys || !polys.length) return { point: centre, moved: false, fits: true };

  // work against the room the piece is in, or the nearest one
  let room = polys.find((poly) => pointInPolygon(centre, poly));
  let point = { ...centre };
  if (!room) {
    const snapped = snapIntoPolygons(centre, polys, 0.3);
    point = snapped.point;
    room = polys.find((poly) => pointInPolygon(point, poly)) || polys[0];
  }

  let moved = point.x !== centre.x || point.y !== centre.y;
  for (let pass = 0; pass < 12; pass++) {
    const corners = footprintCorners(point, w, d, rot);
    let push = { x: 0, y: 0 };
    let worst = 0;

    for (const corner of corners) {
      if (pointInPolygon(corner, room)) continue;
      let best = null;
      let bestDist = Infinity;
      for (let i = 0; i < room.length; i++) {
        const a = { x: room[i][0], y: room[i][1] };
        const b = { x: room[(i + 1) % room.length][0], y: room[(i + 1) % room.length][1] };
        const hit = closestOnSegment(corner, a, b);
        if (hit.dist < bestDist) { bestDist = hit.dist; best = hit.point; }
      }
      if (!best) continue;
      const away = sub(best, corner);
      if (bestDist > worst) { worst = bestDist; push = away; }
    }

    if (worst < 1e-4) return { point, moved, fits: true };
    const step = add(push, mul(norm(push), margin));
    point = add(point, step);
    moved = true;
  }

  // too big for the room: sit it in the middle and say so
  const centreOfRoom = polygonCentroid(room);
  return { point: centreOfRoom, moved: true, fits: false };
}
