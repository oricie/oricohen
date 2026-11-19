// Kindergarten classroom simulation: emits pose skeletons in the same format as MediaPipe Pose,
// so the analysis engine can be demoed and tested without a camera or real children.

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export const SIM_W = 1280, SIM_H = 720, SIM_A = SIM_W / SIM_H;

// Projection: floor (x 0..1 across, z 0..1 from back wall toward camera) => image
const imgY = z => 0.36 + 0.6 * z;
const scaleZ = z => 0.5 + 0.62 * z;
const imgX = (x, z) => 0.5 + (x - 0.5) * (0.62 + 0.38 * z);
export function project(x, z) { return { x: imgX(x, z), y: imgY(z), s: scaleZ(z) }; }

const PROP = {
  adult: { an: .04, kn: .28, hip: .52, sh: .81, nose: .92, eye: .935, ear: .925, shW: .23, hipW: .16, headW: .085, ua: .17, fa: .16, H: .40 },
  child: { an: .04, kn: .26, hip: .48, sh: .73, nose: .87, eye: .89, ear: .875, shW: .22, hipW: .16, headW: .125, ua: .14, fa: .13, H: .40 * .62 },
};

// Builds 33 landmarks. All coordinates in frame-height units; x is multiplied by A.
export function skeleton({ fx, fy, H, kind, posture, yaw, arms, phase, time }) {
  const P = PROP[kind];
  const c = Math.cos(yaw), s = Math.sin(yaw), w = Math.max(0.3, Math.abs(c)), side = c >= 0 ? 1 : -1;
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0.9 }));
  const set = (i, x, h, v = 0.95) => { lm[i] = { x, y: fy - h * H, z: 0, visibility: v }; };

  let hip = P.hip, kn = P.kn, an = P.an, knX = 0, anX = 0, knSpread = 1, lean = 0;
  if (posture === 'crouch') { hip = P.hip * .42; kn = P.hip * .58; knX = s * .1; knSpread = 1.4; lean = s * .04; }
  if (posture === 'sit') { hip = .06; kn = .09; an = .05; knSpread = 3.2; }
  if (posture === 'kneel') { hip = P.hip * .6; kn = .04; an = .04; anX = -s * .12; }
  const up = hip - P.hip; // shift of the upper body
  const walk = posture === 'walk' ? Math.sin(phase) : 0;

  const hx = P.hipW / 2 * w * side, sx = P.shW / 2 * w * side;
  // (MediaPipe: left = the person's left, which appears on the image right when facing the camera)
  set(23, fx + hx * H, hip); set(24, fx - hx * H, hip);
  set(25, fx + (hx * knSpread + knX + walk * .05) * H, kn); set(26, fx - (hx * knSpread - knX + walk * .05) * H, kn);
  set(27, fx + (hx * .8 + anX + walk * .09) * H, an); set(28, fx - (hx * .8 - anX + walk * .09) * H, an);
  [29, 31].forEach(i => set(i, lm[27].x, an - .02)); [30, 32].forEach(i => set(i, lm[28].x, an - .02));
  const cx = fx + lean * H;
  set(11, cx + sx * H, P.sh + up); set(12, cx - sx * H, P.sh + up);
  const faceV = c > 0 ? 0.95 : 0.12, nx = cx + s * P.headW * .45 * H;
  set(0, nx, P.nose + up, faceV);
  for (const [i, dx] of [[1, .12], [2, .17], [3, .22], [4, -.12], [5, -.17], [6, -.22]])
    set(i, nx + dx * P.headW * w * side * H * 1.15, P.eye + up, faceV);
  set(7, cx + P.headW / 2 * w * side * H + s * P.headW * .2 * H, P.ear + up, s < -.7 ? 0.2 : 0.9);
  set(8, cx - P.headW / 2 * w * side * H + s * P.headW * .2 * H, P.ear + up, s > .7 ? 0.2 : 0.9);
  set(9, nx + .1 * P.headW * side * H, P.nose + up - .02, faceV); set(10, nx - .1 * P.headW * side * H, P.nose + up - .02, faceV);

  // arms
  const arm = (shI, elI, wrI, sd, mode) => {
    const sh = lm[shI], shh = (fy - sh.y) / H;
    let ex, eh, wx, wh;
    if (mode === 'gesture') {
      const wave = Math.sin(time * 5 + sd) * .05;
      ex = sh.x + sd * .1 * H; eh = shh + .03; wx = ex + (sd * .03 + wave) * H; wh = shh + .15;
    } else if (mode === 'reach') {
      const d = Math.sign(s) || sd;
      ex = sh.x + d * P.ua * .9 * H; eh = shh - .04; wx = ex + d * P.fa * .95 * H; wh = shh - .06;
    } else {
      const sw = posture === 'walk' ? Math.sin(phase + (sd > 0 ? 0 : Math.PI)) * .05 : 0;
      ex = sh.x + (sd * .025 + sw * .5) * H; eh = shh - P.ua; wx = ex + (sd * .015 + sw) * H; wh = shh - P.ua - P.fa;
    }
    set(elI, ex, eh); set(wrI, wx, wh);
  };
  const [la, ra] = Array.isArray(arms) ? arms : [arms, arms];
  arm(11, 13, 15, side, la); arm(12, 14, 16, -side, ra);
  [[17, 15], [19, 15], [21, 15], [18, 16], [20, 16], [22, 16]].forEach(([i, j]) => { lm[i] = { ...lm[j], y: lm[j].y + .012 * H }; });

  // measurement noise + normalize x back to 0..1
  for (const p of lm) { p.x = (p.x + gauss() * .0025) / SIM_A; p.y += gauss() * .0025; }
  return lm;
}

const CENTERS = [
  { name: 'Blocks', x: .32, z: .22, r: .07 },
  { name: 'Art', x: .7, z: .28, r: .07 },
  { name: 'Library', x: .82, z: .72, r: .06 },
  { name: 'Dolls', x: .42, z: .7, r: .07 },
];
const CIRCLE = { x: .58, z: .5, r: .14 };
const DOOR = { x: -.04, z: .5 };
const ENTRY = { x: .1, z: .5 };
const SHIRTS = ['#e8a33d', '#d9625b', '#5b9bd9', '#7fbf6a', '#b07fd0', '#e3c34b', '#4fb3a9', '#e889b0', '#8d9bd6'];

class Agent {
  constructor(kind, role, x, z) {
    Object.assign(this, { kind, role, x, z, tx: x, tz: z, yaw: 0, posture: 'stand', arms: 'down', phase: Math.random() * 6,
      state: 'idle', timer: rnd(1, 6), speed: kind === 'adult' ? rnd(.1, .13) : rnd(.08, .14), lookAt: null });
    this.shirt = role === 'staff' ? '#3f6f9e' : role === 'parent' ? '#5f8f6a' : pick(SHIRTS);
    this.skin = pick(['#e9c4a6', '#c99a76', '#8d5f43', '#f1d3bd', '#a87554']);
  }
  goto(x, z) { this.tx = Math.min(.97, Math.max(-.1, x)); this.tz = Math.min(.95, Math.max(.05, z)); }
  arrived() { return Math.hypot(this.tx - this.x, this.tz - this.z) < .015; }
}

export class Sim {
  constructor() { this.reset(); }
  reset() {
    this.time = 0; this.agents = []; this.nextParent = rnd(12, 25); this.nextCircle = rnd(120, 160); this.circleUntil = 0;
    for (let i = 0; i < 3; i++) {
      const a = new Agent('adult', 'staff', rnd(.3, .8), rnd(.3, .7));
      a.persona = [.75, .25, .5][i]; // tendency to get down to the children's level
      this.agents.push(a);
    }
    for (let i = 0; i < 12; i++) {
      const c = pick(CENTERS), k = new Agent('child', 'child', c.x + rnd(-.06, .06), c.z + rnd(-.05, .05));
      k.center = c; k.loner = i === 0;
      this.agents.push(k);
    }
  }
  get kids() { return this.agents.filter(a => a.role === 'child'); }
  get staff() { return this.agents.filter(a => a.role === 'staff'); }

  step(dt) {
    this.time += dt;
    const T = this.time;
    // whole-group circle time, now and then
    if (T > this.nextCircle) {
      this.circleUntil = T + rnd(40, 60); this.nextCircle = T + rnd(150, 210);
      this.kids.forEach((k, i, all) => { const a = i / all.length * Math.PI * 2; k.state = 'circle'; k.goto(CIRCLE.x + Math.cos(a) * CIRCLE.r, CIRCLE.z + Math.sin(a) * CIRCLE.r * .6); k.timer = 999; });
      const lead = this.staff.find(s => s.state !== 'greet');
      if (lead) { lead.state = 'lead'; lead.goto(CIRCLE.x, CIRCLE.z - CIRCLE.r * .6 - .03); lead.timer = 999; }
    }
    if (this.circleUntil && T > this.circleUntil) {
      this.circleUntil = 0;
      this.agents.forEach(a => { if (a.state === 'circle' || a.state === 'lead') { a.state = 'idle'; a.timer = 0; } });
    }
    // parents
    if (T > this.nextParent) {
      this.nextParent = T + rnd(35, 75);
      const pickup = this.kids.length > 15 || (this.kids.length > 9 && Math.random() < .35);
      const p = new Agent('adult', 'parent', DOOR.x, DOOR.z + rnd(-.08, .08));
      p.state = 'enter'; p.goto(ENTRY.x + rnd(0, .05), ENTRY.z + rnd(-.08, .08)); p.stay = rnd(18, 40); p.pickup = pickup;
      this.agents.push(p);
      if (!pickup) {
        const k = new Agent('child', 'child', DOOR.x - .03, p.z + .04); k.state = 'follow'; k.with = p; k.center = pick(CENTERS);
        this.agents.push(k);
      } else {
        const k = pick(this.kids.filter(k => k.state !== 'follow' && !k.loner));
        if (k) { k.state = 'toParent'; k.with = p; }
      }
      if (Math.random() < .75) {
        const free = this.staff.filter(s => s.state !== 'lead' && s.state !== 'greet');
        const s = free.sort((a, b) => Math.hypot(a.x - ENTRY.x, a.z - ENTRY.z) - Math.hypot(b.x - ENTRY.x, b.z - ENTRY.z))[0];
        if (s) { s.state = 'greet'; s.with = p; }
      }
    }

    for (const a of this.agents) this.think(a, dt);
    // keep people apart
    for (let i = 0; i < this.agents.length; i++) for (let j = i + 1; j < this.agents.length; j++) {
      const a = this.agents[i], b = this.agents[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < .035 && d > 1e-4) { const f = (.035 - d) * .5; a.x -= dx / d * f; a.z -= dz / d * f; b.x += dx / d * f; b.z += dz / d * f; }
    }
    for (const a of this.agents) {
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
      if (d > .015) {
        const v = Math.min(d, a.speed * dt); a.x += dx / d * v; a.z += dz / d * v;
        a.posture = 'walk'; a.phase += dt * 9; a.yaw = Math.atan2(dx, dz);
        if (a.arms !== 'reach') a.arms = 'down';
      } else if (a.lookAt) {
        a.yaw = Math.atan2(a.lookAt.x - a.x, a.lookAt.z - a.z);
      }
      if (a.posture === 'walk' && d <= .015) a.posture = a.rest || 'stand';
    }
    this.agents = this.agents.filter(a => !a.gone);
  }

  think(a, dt) {
    a.timer -= dt;
    const T = this.time;
    if (a.role === 'parent') {
      if (a.state === 'enter' && a.arrived()) { a.state = 'wait'; a.timer = a.stay; a.rest = 'stand'; a.lookAt = { x: .5, z: .5 }; }
      if (a.state === 'wait') {
        const s = this.staff.find(s => s.with === a);
        if (s) a.lookAt = s; a.arms = s && Math.sin(T * .7) > .4 ? ['gesture', 'down'] : 'down';
        if (a.timer < 0) { a.state = 'leave'; a.goto(DOOR.x - .06, a.z); a.lookAt = null; }
      }
      if (a.state === 'leave' && a.arrived()) a.gone = true;
      return;
    }
    if (a.role === 'child') {
      if (a.state === 'follow') {
        const p = a.with;
        if (p.state === 'leave' || p.gone || (p.state === 'wait' && p.timer < p.stay - 8)) { a.state = 'idle'; a.timer = 0; a.with = null; }
        else { a.goto(p.x + .02, p.z + .045); a.lookAt = p; }
        return;
      }
      if (a.state === 'toParent') {
        const p = a.with;
        if (!p || p.gone) { a.state = 'idle'; return; }
        if (p.state === 'leave') { a.goto(p.x, p.z + .04); if (a.x < -.03) a.gone = true; }
        else a.goto(p.x + .03, p.z + .045);
        a.lookAt = p; return;
      }
      if (a.state === 'circle') { a.rest = 'sit'; a.lookAt = { x: CIRCLE.x, z: CIRCLE.z - CIRCLE.r }; a.arms = Math.random() < .002 ? 'gesture' : a.arms; return; }
      if (a.timer < 0) {
        a.timer = rnd(15, 55);
        if (a.loner && Math.random() < .7) { a.goto(rnd(.15, .25), rnd(.1, .2)); a.rest = 'sit'; a.lookAt = { x: a.tx, z: a.tz + 1 }; return; }
        if (Math.random() < .08) { a.goto(rnd(.15, .9), rnd(.1, .9)); a.rest = 'stand'; a.timer = rnd(4, 10); a.lookAt = null; return; }
        if (Math.random() < .45) a.center = pick(CENTERS);
        const c = a.center, ang = rnd(0, Math.PI * 2);
        a.goto(c.x + Math.cos(ang) * c.r, c.z + Math.sin(ang) * c.r * .7);
        a.rest = pick(['sit', 'sit', 'kneel', 'stand']); a.lookAt = c; a.arms = 'down';
      }
      if (!a.arrived()) return;
      a.arms = Math.random() < .004 ? (a.arms === 'down' ? pick(['gesture', 'reach']) : 'down') : a.arms;
      return;
    }
    // staff
    if (a.state === 'lead') { a.rest = Math.random() < a.persona ? 'sit' : 'stand'; a.lookAt = CIRCLE; a.arms = Math.sin(T * .9) > .3 ? 'gesture' : 'down'; return; }
    if (a.state === 'greet') {
      const p = a.with;
      if (!p || p.gone || p.state === 'leave') { a.state = 'idle'; a.timer = 0; a.with = null; return; }
      if (p.state !== 'enter') a.goto(p.x + .07, p.z + .02);
      a.rest = 'stand'; a.lookAt = p; a.arms = Math.sin(T * 1.1 + 1) > .5 ? ['down', 'gesture'] : 'down';
      return;
    }
    if (a.state === 'huddle' && a.arrived()) { a.rest = 'stand'; a.lookAt = a.partner; a.arms = Math.sin(T) > .6 ? 'gesture' : 'down'; }
    if (a.state === 'engage' && a.arrived()) {
      a.lookAt = a.center;
      if (!a.settled) { a.settled = true; a.rest = Math.random() < a.persona ? pick(['crouch', 'sit', 'kneel']) : 'stand'; a.posture = a.rest; }
      a.arms = Math.random() < .01 ? pick(['down', 'gesture', 'reach', 'down']) : a.arms;
    }
    if (a.timer < 0) {
      a.settled = false; a.arms = 'down'; a.lookAt = null;
      const r = Math.random();
      const other = this.staff.find(s => s !== a && (s.state === 'circulate' || s.state === 'idle' || s.state === 'engage'));
      if (r < .12 && other) {
        const mx = rnd(.9, .93), mz = rnd(.05, .09);
        a.state = 'huddle'; a.goto(mx, mz); a.timer = rnd(15, 30); a.partner = other;
        other.state = 'huddle'; other.goto(mx + .04, mz + .02); other.timer = a.timer; other.partner = a;
      } else if (r < .35) {
        a.state = 'circulate'; a.goto(rnd(.2, .9), rnd(.2, .85)); a.timer = rnd(6, 12); a.rest = 'stand';
      } else {
        const counts = CENTERS.map(c => ({ c, n: this.kids.filter(k => Math.hypot(k.x - c.x, k.z - c.z) < .15).length - 3 * this.staff.filter(s => s !== a && s.center === c && s.state === 'engage').length }));
        counts.sort((p, q) => q.n - p.n);
        const c = Math.random() < .7 ? counts[0].c : pick(CENTERS);
        a.state = 'engage'; a.center = c; const ang = rnd(0, Math.PI * 2);
        a.goto(c.x + Math.cos(ang) * c.r * .7, c.z + Math.sin(ang) * c.r * .5); a.timer = rnd(25, 60);
      }
    }
  }

  poses() {
    return this.visible().map(a => a.lm);
  }
  visible() {
    const out = [];
    for (const a of this.agents) {
      const p = project(a.x, a.z);
      if (p.x < -.03 || p.x > 1.03) continue;
      a.lm = skeleton({ fx: p.x * SIM_A, fy: p.y, H: PROP[a.kind].H * p.s, kind: a.kind, posture: a.posture,
        yaw: a.yaw, arms: a.arms, phase: a.phase, time: this.time });
      out.push(a);
    }
    return out.sort((a, b) => a.z - b.z);
  }

  // ---------- classroom drawing (stands in for the "video" in simulation) ----------
  drawScene(ctx, W, H) {
    const P = (x, z) => { const p = project(x, z); return [p.x * W, p.y * H]; };
    ctx.fillStyle = '#e9e2d6'; ctx.fillRect(0, 0, W, H);
    // walls
    ctx.fillStyle = '#f3ede3'; ctx.fillRect(0, 0, W, imgY(0) * H);
    ctx.fillStyle = '#e6dccb';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(...P(0, 0)); ctx.lineTo(...P(0, 1.1)); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8c6a8';
    ctx.beginPath(); ctx.moveTo(...P(0, 0)); ctx.lineTo(...P(1, 0)); ctx.lineTo(...P(1, 1.1)); ctx.lineTo(...P(0, 1.1)); ctx.closePath(); ctx.fill();
    // wooden floor
    ctx.strokeStyle = 'rgba(120,90,50,.12)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(...P(i / 14, 0)); ctx.lineTo(...P(i / 14, 1.1)); ctx.stroke(); }
    // door
    ctx.fillStyle = '#9c7b55';
    const d1 = P(0, .38), d2 = P(0, .62);
    ctx.beginPath(); ctx.moveTo(d1[0], d1[1]); ctx.lineTo(d2[0], d2[1]); ctx.lineTo(d2[0], d2[1] - .36 * H); ctx.lineTo(d1[0], d1[1] - .27 * H); ctx.closePath(); ctx.fill();
    // shelves and windows on the back wall
    ctx.fillStyle = '#c9b38f';
    for (const x of [.15, .55]) { const [a, b] = P(x, 0), [c] = P(x + .25, 0); ctx.fillRect(a, b - .12 * H, c - a, .12 * H); }
    ctx.fillStyle = '#cfe3ef';
    for (const x of [.25, .62]) { const [a, b] = P(x, 0), [c] = P(x + .16, 0); ctx.fillRect(a, b - .3 * H, c - a, .12 * H); }
    // rugs
    const rug = (c, color, r = c.r * 1.6) => {
      ctx.fillStyle = color; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 2; const [x, y] = P(c.x + Math.cos(t) * r, c.z + Math.sin(t) * r * .8); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.fill();
    };
    rug(CIRCLE, 'rgba(110,160,200,.35)', CIRCLE.r * 1.4);
    rug(CENTERS[0], 'rgba(230,170,80,.3)'); rug(CENTERS[2], 'rgba(160,200,120,.35)'); rug(CENTERS[3], 'rgba(220,130,150,.25)');
    // art table
    ctx.fillStyle = '#b08d62';
    const t1 = P(.64, .24), t2 = P(.76, .24), t3 = P(.76, .32), t4 = P(.64, .32);
    ctx.beginPath(); [t1, t2, t3, t4].forEach((p, i) => i ? ctx.lineTo(p[0], p[1] - 20) : ctx.moveTo(p[0], p[1] - 20)); ctx.fill();
    // people
    for (const a of this.visible()) drawBody(ctx, a.lm, W, H, a.shirt, a.skin, a.kind === 'adult' ? '#4a4f5c' : '#6b7a8f');
  }
}

const LIMBS = [[11, 13], [13, 15], [12, 14], [14, 16], [23, 25], [25, 27], [24, 26], [26, 28]];
export function drawBody(ctx, lm, W, H, shirt, skin, pants) {
  const X = i => lm[i].x * W, Y = i => lm[i].y * H;
  const tor = Math.hypot(X(11) - X(23), Y(11) - Y(23));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = pants; ctx.lineWidth = tor * .28;
  for (const [a, b] of LIMBS.slice(4)) { ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke(); }
  ctx.fillStyle = shirt; ctx.beginPath();
  ctx.moveTo(X(11), Y(11)); ctx.lineTo(X(12), Y(12)); ctx.lineTo(X(24), Y(24)); ctx.lineTo(X(23), Y(23)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shirt; ctx.lineWidth = tor * .45; ctx.stroke();
  ctx.lineWidth = tor * .2;
  for (const [a, b] of LIMBS.slice(0, 4)) { ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke(); }
  ctx.fillStyle = skin;
  const hr = Math.max(Math.hypot(X(7) - X(8), Y(7) - Y(8)) * .62, tor * .22);
  ctx.beginPath(); ctx.arc((X(7) + X(8)) / 2, Y(0) - hr * .25, hr, 0, Math.PI * 2); ctx.fill();
  for (const i of [15, 16]) { ctx.beginPath(); ctx.arc(X(i), Y(i), tor * .09, 0, Math.PI * 2); ctx.fill(); }
}

// Default zones in normalized image coordinates
export const DEFAULT_ZONES = [
  { id: 'z1', name: 'Entrance', type: 'entrance', x: 0, y: .44, w: .19, h: .46 },
  { id: 'z2', name: 'Circle', type: 'area', x: .42, y: .52, w: .26, h: .2 },
];
