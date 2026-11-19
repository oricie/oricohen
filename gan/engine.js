// Analysis engine: turns pose skeletons (33 landmarks, MediaPipe Pose format) into tracked people,
// role classification (staff / child / parent) and cumulative behavior metrics. No audio and no face processing here.

export const ROLE = { STAFF: 'staff', CHILD: 'child', PARENT: 'parent', UNKNOWN: 'unknown' };
export const ROLE_LABEL = { staff: 'Staff', child: 'Child', parent: 'Parent', unknown: 'Identifying…' };

export const DEFAULTS = {
  interactR: 2.4,     // interaction radius, in "adult body" units (~0.5 m each) => ~1.2 m
  groupR: 2.2,        // distance between children to count as the same group
  contactR: 0.3,      // hand-to-body distance that counts as touch
  childThr: 1.0,      // "child" score threshold (head/body proportions)
  aloneSec: 30,       // child alone for more than X seconds => event
  huddleSec: 20,      // staff clustered without children for more than X seconds => event
  greetSec: 5,        // a parent with at least X seconds near staff counts as "greeted"
};

const I = { NOSE: 0, LEYE: 2, REYE: 5, LEAR: 7, REAR: 8, LSH: 11, RSH: 12, LWR: 15, RWR: 16,
  LHIP: 23, RHIP: 24, LKN: 25, RKN: 26, LAN: 27, RAN: 28 };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function angle(a, b, c) { // angle at b
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const d = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1;
  return Math.acos(clamp((v1.x * v2.x + v1.y * v2.y) / d, -1, 1)) * 180 / Math.PI;
}

// A = image width/height ratio. All distances are in units of frame height.
export function extractFeatures(lm, A) {
  const P = i => ({ x: lm[i].x * A, y: lm[i].y, v: lm[i].visibility ?? 1 });
  const nose = P(I.NOSE), leye = P(I.LEYE), reye = P(I.REYE), lear = P(I.LEAR), rear = P(I.REAR);
  const ls = P(I.LSH), rs = P(I.RSH), lh = P(I.LHIP), rh = P(I.RHIP);
  const lk = P(I.LKN), rk = P(I.RKN), la = P(I.LAN), ra = P(I.RAN), lw = P(I.LWR), rw = P(I.RWR);
  const sh = mid(ls, rs), hip = mid(lh, rh);
  const torso = Math.max(dist(sh, hip), 1e-3);
  const shoulderW = dist(ls, rs);

  // "Child" score: children have a large head relative to the torso. Both ratios are independent of camera distance.
  const r1 = dist(nose, sh) / torso;                       // neck+head relative to torso
  const headW = dist(lear, rear);
  const r2 = headW / torso;                                // head width relative to torso
  const r3 = headW / Math.max(shoulderW, 1e-3);           // head width relative to shoulder width
  // Head width is only reliable when the person roughly faces the camera (wide shoulders in the image).
  // Calibration: a real toddler measured r2 0.35 / r3 0.49; adult references ~0.26-0.30 / ~0.36.
  // A head cut off by the frame edge gives made-up points, so it never counts as a measurement.
  const inFrame = i => lm[i].x > 0.01 && lm[i].x < 0.99 && lm[i].y > 0.01 && lm[i].y < 0.99;
  const headOk = [0, 7, 8].every(inFrame);
  // "frontal" = shoulders square to the camera (from the front or the back) with both ears found
  const frontal = headOk && shoulderW / torso > 0.6 && lear.v > 0.5 && rear.v > 0.5;
  // Side views only have neck length, which barely separates adults from children (real toddler 0.48,
  // adults ~0.45-0.5), so it is scaled to lean adult and frontal frames decide.
  const childScore = frontal ? (r2 / 0.31 + r3 / 0.42) / 2 : headOk ? Math.min(r1 / 0.55, 0.97) : 0.9;

  // posture: crouching / sitting / kneeling = "at the child's level"
  let low = null, posture = 'unknown';
  const ank = mid(la, ra), kn = mid(lk, rk);
  if (ank.v > 0.45) {
    const legRatio = (ank.y - hip.y) / torso;
    const kneeAng = Math.min(angle(lh, lk, la), angle(rh, rk, ra));
    low = legRatio < 1.05 || kneeAng < 105;
    posture = legRatio < 0.45 ? 'sitting' : low ? 'crouching' : 'standing';
  } else if (kn.v > 0.45) {
    low = (kn.y - hip.y) / torso < 0.4;
    posture = low ? 'sitting' : 'standing';
  }

  // floor point: ankle midpoint, or estimated from the hips
  const feet = ank.v > 0.45 ? { x: ank.x, y: ank.y } : { x: hip.x, y: hip.y + torso * 1.6 };

  // facing direction (2D, rough): nose offset from shoulder center + whether the face is visible
  const yaw = shoulderW > 1e-3 ? clamp((nose.x - sh.x) / shoulderW, -1.5, 1.5) : 0;
  const faceVisible = nose.v > 0.55 && (leye.v > 0.5 || reye.v > 0.5);
  let fx = yaw * 1.6, fy = faceVisible ? 0.5 : -0.5;
  const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;

  // active hands: hand above the shoulder or extended far from the body (gesture / pointing / reaching)
  const handsActive = [lw, rw].some(w => w.v > 0.5 && (w.y < sh.y || Math.abs(w.x - sh.x) > torso * 0.95));

  const pts = lm.map(p => ({ x: p.x * A, y: p.y }));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  lm.forEach((p, i) => { if ((p.visibility ?? 1) > 0.3 && i !== 17 && i !== 18) { const q = pts[i]; x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); } });
  y1 = Math.max(y1, feet.y);

  return {
    feet, sh, hip, nose, torso, childScore, frontal, low, posture, facing: { x: fx, y: fy },
    wrists: [lw, rw].filter(w => w.v > 0.5), body: [nose, ls, rs, lh, rh, sh, hip].filter(p => p.v > 0.4),
    handsActive, bbox: { x0, y0, x1, y1 }, lm,
  };
}

class Track {
  constructor(id, f, t) {
    this.id = id; this.f = f; this.feet = { ...f.feet }; this.vel = { x: 0, y: 0 };
    this.torso = f.torso; this.score = f.frontal ? f.childScore : 0.95; this.n = 1;
    this.born = t; this.lastSeen = t; this.manualRole = null; this.role = ROLE.UNKNOWN;
    this.bornInEntrance = false; this.speed = 0;
    this.st = { present: 0, moving: 0, low: 0, lowNear: 0, near: 0, facing: 0, contact: 0, hands: 0,
      huddle: 0, parent: 0, path: 0, nearStaff: 0, alone: 0, small: 0, large: 0, solo: 0, greeted: 0 };
    this.kids = new Map(); this.ep = {}; this.trail = [];
  }
  get refScale() { // estimated adult body size at the same image depth
    return this.role === ROLE.CHILD ? this.torso / 0.56 : this.torso;
  }
}

export class Engine {
  constructor(settings = {}) {
    this.settings = { ...DEFAULTS, ...settings };
    this.zones = [];
    this.reset();
  }

  reset() {
    this.tracks = []; this.closed = []; this.nextId = 1; this.t0 = null; this.t = 0; this.lastT = null;
    this.events = []; this.series = []; this.lastSample = -1;
    this.room = { time: 0, childTime: 0, staffTime: 0, coveredChildTime: 0, ratioSum: 0,
      small: 0, large: 0, solo: 0, huddleStaffTime: 0, lowNear: 0, near: 0, contact: 0, moving: 0,
      hands: 0, facing: 0, parentsSeen: 0, parentsGreeted: 0, aloneTime: 0, nearChild: 0 };
    this.heat = { W: 64, H: 36 };
    for (const r of [ROLE.STAFF, ROLE.CHILD, ROLE.PARENT]) this.heat[r] = new Float32Array(64 * 36);
    this.zoneTime = new Map();
    this.frame = { people: [], links: [] };
  }

  event(type, text, ids = []) {
    this.events.push({ t: this.t, type, text, ids });
    if (this.events.length > 2000) this.events.shift();
  }

  // ---------- tracking ----------
  track(feats, t) {
    const pairs = [];
    for (const tr of this.tracks) {
      const dt = t - tr.lastSeen;
      const px = tr.feet.x + tr.vel.x * dt, py = tr.feet.y + tr.vel.y * dt;
      feats.forEach((f, j) => {
        const s = Math.max(tr.torso, f.torso);
        const d = Math.hypot(f.feet.x - px, f.feet.y - py) / s;
        const size = Math.abs(Math.log(f.torso / tr.torso));
        if (d < 2.2 && size < 0.6) pairs.push({ tr, j, c: d + size * 2 });
      });
    }
    pairs.sort((a, b) => a.c - b.c);
    const usedT = new Set(), usedD = new Set();
    for (const p of pairs) {
      if (usedT.has(p.tr) || usedD.has(p.j)) continue;
      usedT.add(p.tr); usedD.add(p.j);
      const f = feats[p.j], tr = p.tr, dt = Math.max(t - tr.lastSeen, 1e-3);
      const nx = tr.feet.x * 0.6 + f.feet.x * 0.4, ny = tr.feet.y * 0.6 + f.feet.y * 0.4;
      const step = Math.hypot(nx - tr.feet.x, ny - tr.feet.y);
      tr.vel = { x: tr.vel.x * 0.7 + (nx - tr.feet.x) / dt * 0.3, y: tr.vel.y * 0.7 + (ny - tr.feet.y) / dt * 0.3 };
      tr.speed = Math.hypot(tr.vel.x, tr.vel.y) / tr.torso;
      tr.feet = { x: nx, y: ny }; tr.st.path += step / tr.torso;
      tr.torso = tr.torso * 0.85 + f.torso * 0.15;
      // frontal frames carry the reliable head measurement, so they move the score much more
      const w = f.frontal ? 0.12 : 0.015;
      tr.score = tr.score * (1 - w) + f.childScore * w;
      tr.f = f; tr.n++; tr.lastSeen = t;
    }
    feats.forEach((f, j) => {
      if (usedD.has(j)) return;
      const tr = new Track(this.nextId++, f, t);
      tr.bornInEntrance = this.inZoneType(f.feet, 'entrance');
      this.tracks.push(tr);
    });
    const alive = [];
    for (const tr of this.tracks) {
      if (t - tr.lastSeen > 1.5) this.closeTrack(tr); else alive.push(tr);
    }
    this.tracks = alive;
  }

  closeTrack(tr) {
    if (tr.role === ROLE.PARENT && tr.st.present > 4) {
      const g = tr.st.greeted >= this.settings.greetSec;
      this.room.parentsSeen++; if (g) this.room.parentsGreeted++;
      this.event('parent_leave', `Parent #${tr.id} left after ${fmtDur(tr.st.present)} · ${g ? `greeted by staff: ${fmtDur(tr.st.greeted)}` : 'not greeted by staff'}`, [tr.id]);
    }
    if (tr.st.present > 3) this.closed.push(tr);
    if (this.closed.length > 300) this.closed.shift();
  }

  roleOf(tr) {
    if (tr.manualRole) return tr.manualRole;
    if (tr.n < 6) return ROLE.UNKNOWN;
    const thr = this.settings.childThr, prevChild = tr.role === ROLE.CHILD;
    const isChild = tr.score > thr + (prevChild ? -0.05 : 0.05);
    if (isChild) return ROLE.CHILD;
    if (tr.bornInEntrance && tr.born - this.t0 > 3) return ROLE.PARENT;
    return ROLE.STAFF;
  }

  // ---------- zones ----------
  inZone(p, z) { return p.x >= z.x * this.A && p.x <= (z.x + z.w) * this.A && p.y >= z.y && p.y <= z.y + z.h; }
  inZoneType(p, type) { return this.zones.some(z => z.type === type && this.inZone(p, z)); }

  // episode: tracks a sustained state, fires an event once after minDur seconds
  episode(tr, key, active, minDur, onFire) {
    const e = tr.ep[key] || (tr.ep[key] = { start: null, fired: false });
    if (!active) { e.start = null; e.fired = false; return; }
    if (e.start === null) e.start = this.t;
    if (!e.fired && this.t - e.start >= minDur) { e.fired = true; onFire(this.t - e.start); }
  }

  // ---------- per-frame update ----------
  update(poses, t, A) {
    this.A = A;
    if (this.t0 === null) { this.t0 = t; this.lastT = t; }
    const dt = clamp(t - this.lastT, 0, 0.5); this.lastT = t; this.t = t - this.t0;
    const S = this.settings;

    // The model sometimes reports one person twice: keep one of any two near-identical skeletons.
    const feats = [];
    for (const f of poses.filter(lm => lm && lm.length >= 33).map(lm => extractFeatures(lm, A))) {
      const dup = feats.find(g => dist(g.sh, f.sh) < 0.35 * Math.max(g.torso, f.torso) && dist(g.hip, f.hip) < 0.35 * Math.max(g.torso, f.torso));
      if (!dup) feats.push(f);
    }
    this.track(feats, t);
    const live = this.tracks.filter(tr => tr.lastSeen === t);
    for (const tr of live) {
      const prev = tr.role; tr.role = this.roleOf(tr);
      if (prev !== tr.role && tr.role === ROLE.PARENT) this.event('parent_arrive', `Parent #${tr.id} entered the classroom`, [tr.id]);
      tr.trail.push({ x: tr.feet.x, y: tr.feet.y }); if (tr.trail.length > 40) tr.trail.shift();
    }
    const staff = live.filter(p => p.role === ROLE.STAFF);
    const kids = live.filter(p => p.role === ROLE.CHILD);
    const parents = live.filter(p => p.role === ROLE.PARENT);
    const links = [];
    const near = (a, b, r) => dist(a.feet, b.feet) < r * (a.refScale + b.refScale) / 2;

    // child groups (union-find)
    const parent = kids.map((_, i) => i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++)
      if (near(kids[i], kids[j], S.groupR)) parent[find(i)] = find(j);
    const groupSize = new Map();
    kids.forEach((_, i) => groupSize.set(find(i), (groupSize.get(find(i)) || 0) + 1));
    const groups = [];
    kids.forEach((k, i) => {
      const size = groupSize.get(find(i));
      k.groupSize = size; k.groupKey = find(i);
      const cls = size === 1 ? 'solo' : size >= 6 ? 'large' : 'small';
      k.st[cls] += dt; this.room[cls] += dt;
    });
    for (const [key, size] of groupSize) if (size > 1) groups.push({ members: kids.filter((_, i) => find(i) === key) });

    // staff metrics
    let covered = 0;
    const kidNearStaff = new Set();
    for (const s of staff) {
      const st = s.st; st.present += dt; this.room.staffTime += dt;
      const nearKids = kids.filter(k => near(s, k, S.interactR));
      const isNear = nearKids.length > 0;
      const moving = s.speed > 0.6;
      if (moving) { st.moving += dt; this.room.moving += dt; }
      if (s.f.low) st.low += dt;
      if (isNear) { st.near += dt; this.room.near += dt; }
      if (isNear && s.f.low) { st.lowNear += dt; this.room.lowNear += dt; }
      if (s.f.handsActive) { st.hands += dt; this.room.hands += dt; }
      let facing = false, contact = false;
      for (const k of nearKids) {
        kidNearStaff.add(k);
        const dx = k.feet.x - s.feet.x, dy = k.feet.y - s.feet.y, dl = Math.hypot(dx, dy) || 1;
        if ((s.f.facing.x * dx + s.f.facing.y * dy) / dl > 0.25) facing = true;
        const c = s.f.wrists.some(w => k.f.body.some(b => dist(w, b) < S.contactR * s.refScale));
        if (c) contact = true;
        s.kids.set(k.id, (s.kids.get(k.id) || 0) + dt);
        links.push({ a: s, b: k, type: c ? 'contact' : 'near' });
      }
      if (facing) { st.facing += dt; this.room.facing += dt; }
      if (contact) { st.contact += dt; this.room.contact += dt; }

      const nearStaff = staff.filter(o => o !== s && near(s, o, S.interactR));
      const huddle = !isNear && nearStaff.length > 0 && nearStaff.every(o => !kids.some(k => near(o, k, S.interactR)));
      if (huddle) { st.huddle += dt; this.room.huddleStaffTime += dt; }
      const nearParents = parents.filter(p => near(s, p, S.interactR));
      if (nearParents.length) {
        st.parent += dt;
        for (const p of nearParents) { p.st.greeted += dt; links.push({ a: s, b: p, type: 'parent' }); }
      }

      this.episode(s, 'low', isNear && s.f.low, 6, () =>
        this.event('eye_level', `Staff #${s.id} got down to children's eye level (${nearKids.length} children nearby)`, [s.id]));
      this.episode(s, 'contact', contact, 2.5, () =>
        this.event('contact', `Physical contact: staff #${s.id} ↔ child #${nearKids[0].id}`, [s.id, nearKids[0].id]));
      this.episode(s, 'huddle', huddle, S.huddleSec, d =>
        this.event('huddle', `Staff #${s.id} with other staff, no children nearby (${fmtDur(d)}+)`, [s.id]));
    }
    for (const p of parents) {
      p.st.present += dt;
      this.episode(p, 'greet', p.st.greeted >= S.greetSec, 0, () =>
        this.event('greet', `Parent #${p.id} was greeted by staff`, [p.id]));
    }

    for (const k of kids) {
      k.st.present += dt; this.room.childTime += dt;
      const ns = kidNearStaff.has(k);
      if (ns) { k.st.nearStaff += dt; covered++; this.room.coveredChildTime += dt; }
      const alone = !ns && k.groupSize === 1;
      if (alone) { k.st.alone += dt; this.room.aloneTime += dt; }
      this.episode(k, 'alone', alone, S.aloneSec, d =>
        this.event('alone', `Child #${k.id} alone, no children or staff nearby (${fmtDur(d)}+)`, [k.id]));
    }
    if (staff.length && kids.length) { this.room.time += dt; this.room.ratioSum += dt * kids.length / staff.length; }

    // heatmaps and zones
    for (const tr of live) {
      const h = this.heat[tr.role]; if (!h) continue;
      const gx = clamp(Math.floor(tr.feet.x / A * this.heat.W), 0, this.heat.W - 1);
      const gy = clamp(Math.floor(tr.feet.y * this.heat.H), 0, this.heat.H - 1);
      h[gy * this.heat.W + gx] += dt;
      for (const z of this.zones) if (this.inZone(tr.feet, z)) {
        const zt = this.zoneTime.get(z.id) || { staff: 0, child: 0, parent: 0 };
        zt[tr.role] = (zt[tr.role] || 0) + dt; this.zoneTime.set(z.id, zt);
      }
    }

    const coverage = kids.length ? covered / kids.length : null;
    const sec = Math.floor(this.t);
    if (sec !== this.lastSample) {
      this.lastSample = sec;
      this.series.push({ t: sec, staff: staff.length, children: kids.length, parents: parents.length,
        coverage: coverage === null ? null : Math.round(coverage * 100),
        staffLow: staff.filter(s => s.f.low).length,
        solo: kids.filter(k => k.groupSize === 1).length, groups: groups.length });
      if (this.series.length > 7200) this.series.shift();
    }

    this.frame = { people: live, links, groups, coverage, counts: { staff: staff.length, children: kids.length, parents: parents.length } };
    return this.frame;
  }

  cycleRole(tr) {
    const order = [ROLE.STAFF, ROLE.CHILD, ROLE.PARENT, null];
    const cur = tr.manualRole ? order.indexOf(tr.manualRole) : -1;
    tr.manualRole = order[(cur + 1) % order.length];
  }

  // ---------- summary: indicators ----------
  summary() {
    const r = this.room, pct = (a, b) => b > 0 ? Math.round(100 * a / b) : null;
    const staffHours = r.staffTime / 3600;
    const indicators = [
      { key: 'eye', name: 'Eye level', value: pct(r.lowNear, r.near),
        desc: 'Of the time staff spend near children, how much is spent kneeling, sitting or crouching at the child\'s level.',
        frame: 'CLASS · Teacher sensitivity / Positive climate' },
      { key: 'near', name: 'Proximity & engagement', value: pct(r.near, r.staffTime),
        desc: 'Share of staff time spent within interaction distance of at least one child.',
        frame: 'CLASS · Emotional support' },
      { key: 'cover', name: 'Child coverage', value: pct(r.coveredChildTime, r.childTime),
        desc: 'Share of "child-time" in which the child is near a staff member. Reflects how attention and active supervision are spread.',
        frame: 'ECERS · Supervision / CLASS · Classroom organization' },
      { key: 'facing', name: 'Facing the child', value: pct(r.facing, r.near),
        desc: 'Of the time near children, how much the staff member\'s body/face is turned toward a child (rough estimate).',
        frame: 'CLASS · Regard for student perspectives' },
      { key: 'contact', name: 'Physical contact', value: staffHours > 0 ? Math.round(r.contact / 60 / staffHours * 10) / 10 : null, unit: 'min per staff-hour',
        desc: 'Time a staff member\'s hand is very close to a child\'s body (hug, holding hands, helping). Shown in minutes per staff-hour.',
        frame: 'Emotional support · Warmth & touch' },
      { key: 'huddle', name: 'Staff huddling', value: pct(r.huddleStaffTime, r.staffTime), invert: true,
        desc: 'Share of staff time in which staff stand together with no children nearby.',
        frame: 'ECERS · Staff–child interactions' },
      { key: 'small', name: 'Small-group work', value: pct(r.small, r.childTime),
        desc: 'Share of "child-time" in groups of 2–5 children (vs. whole group or alone).',
        frame: 'CLASS · Learning formats' },
      { key: 'alone', name: 'Children alone', value: pct(r.aloneTime, r.childTime), invert: true,
        desc: 'Share of "child-time" with no other children and no staff nearby. Not necessarily negative (independent play), but worth checking for patterns.',
        frame: 'Observation indicator' },
      { key: 'parents', name: 'Greeting parents', value: pct(r.parentsGreeted, r.parentsSeen), extra: `${r.parentsGreeted}/${r.parentsSeen}`,
        desc: `Share of departed parents who got at least ${this.settings.greetSec} seconds near a staff member.`,
        frame: 'Partnership with families' },
      { key: 'ratio', name: 'Children per staff member', value: r.time > 0 ? Math.round(r.ratioSum / r.time * 10) / 10 : null, unit: 'children', plain: true,
        desc: 'Time-weighted average of children in frame per staff member in frame.', frame: 'Structural' },
    ];
    return { duration: this.t, indicators, room: r };
  }

  allTracks(role) {
    const seen = new Map();
    for (const tr of [...this.closed, ...this.tracks]) if (!role || tr.role === role) seen.set(tr.id, tr);
    return [...seen.values()];
  }
}

export function fmtDur(s) {
  s = Math.round(s);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return `${m}m ${String(r).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
export function fmtClock(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}
