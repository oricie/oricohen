import { Engine, ROLE, ROLE_LABEL, fmtDur, fmtClock } from './engine.js';
import { Sim, SIM_W, SIM_H, DEFAULT_ZONES } from './sim.js';

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

const $ = s => document.querySelector(s);
const IN_CLAUDE = typeof window.claude?.use === 'function';   // running as a Claude artifact: no camera, no print
const canvas = $('#stage'), ctx = canvas.getContext('2d');
const engine = new Engine();
const state = { src: null, paused: false, speed: 10, privacy: 'full', heat: '', drawing: false, drag: null,
  showScore: false, evFilter: 'all', tab: 'overview', lastPanel: 0 };

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const roleColor = r => r === ROLE.STAFF ? css('--staff') : r === ROLE.CHILD ? css('--child') : r === ROLE.PARENT ? css('--parent') : '#9aa3ad';

// ---------------- sources ----------------
class SimSource {
  constructor() { this.kind = 'sim'; this.sim = new Sim(); this.w = SIM_W; this.h = SIM_H; }
  tick(dt) {
    let rem = Math.min(dt, 0.1) * state.speed;
    while (rem > 1e-6) {
      const s = Math.min(rem, 1 / 20); rem -= s;
      this.sim.step(s);
      engine.update(this.sim.poses(), this.sim.time, this.w / this.h);
    }
  }
  draw(c, W, H) { this.sim.drawScene(c, W, H); }
  stop() {}
}

let landmarkerP = null;
// Use a local copy of the model next to the page when there is one (needed inside Claude), else the CDN.
async function mpPaths() {
  const abs = p => new URL(p, location.href).href;
  try {
    const r = await fetch('mp/pose_model.wasm', { method: 'HEAD' });
    // scripts stay on the CDN (allowed everywhere); the large binaries come from next to the page
    if (r.ok) return { bundle: `${MP}/vision_bundle.mjs`, wasm: `${MP}/wasm`, wasmBinary: abs('mp/vision_wasm_internal.wasm'), model: abs('mp/pose_model.wasm') };
  } catch {}
  return { bundle: `${MP}/vision_bundle.mjs`, wasm: `${MP}/wasm`, model: MODEL };
}
function getLandmarker() {
  if (!landmarkerP) landmarkerP = (async () => {
    const base = await mpPaths();
    const { PoseLandmarker, FilesetResolver } = await import(base.bundle);
    const fs = await FilesetResolver.forVisionTasks(base.wasm);
    if (base.wasmBinary) fs.wasmBinaryPath = base.wasmBinary;
    const opts = d => ({ baseOptions: { modelAssetPath: base.model, delegate: d }, runningMode: 'VIDEO', numPoses: 12,
      minPoseDetectionConfidence: 0.35, minPosePresenceConfidence: 0.35, minTrackingConfidence: 0.35 });
    try { return await PoseLandmarker.createFromOptions(fs, opts('GPU')); }
    catch { return await PoseLandmarker.createFromOptions(fs, opts('CPU')); }
  })();
  landmarkerP.catch(() => { landmarkerP = null; });
  return landmarkerP;
}

class VideoSource {
  constructor(kind, video, stream) {
    Object.assign(this, { kind, video, stream, lastVT: -1, lastDetect: 0, lm: null });
  }
  get w() { return this.video.videoWidth || 1280; }
  get h() { return this.video.videoHeight || 720; }
  async init() { this.lm = await getLandmarker(); }
  tick() {
    const v = this.video, now = performance.now();
    if (!this.lm || v.readyState < 2) return;
    if (this.kind === 'file') v.playbackRate = Math.min(state.speed, 4);
    const minGap = this.kind === 'camera' ? 66 : 0;               // camera: ~15 analyses per second
    if (v.currentTime === this.lastVT || now - this.lastDetect < minGap) return;
    this.lastVT = v.currentTime; this.lastDetect = now;
    const res = this.lm.detectForVideo(v, now);
    const t = this.kind === 'file' ? v.currentTime : now / 1000;
    engine.update(res.landmarks || [], t, this.w / this.h);
    if (this.kind === 'file' && engine.t0 !== null) this.t0 = engine.t0;
  }
  draw(c, W, H) { c.drawImage(this.video, 0, 0, W, H); }
  stop() {
    this.video.pause();
    this.stream?.getTracks().forEach(t => t.stop());
    if (this.kind === 'file') URL.revokeObjectURL(this.video.src);
  }
}

function setStatus(msg) { const s = $('#status'); s.hidden = !msg; s.innerHTML = msg || ''; }
function setHint(msg) { const h = $('#hint'); h.hidden = !msg; h.textContent = msg || ''; }

async function useSource(kind, file) {
  state.src?.stop(); state.src = null;
  document.querySelectorAll('#sources button').forEach(b => b.classList.toggle('on', b.dataset.src === kind));
  engine.reset();
  setHint('');
  if (kind === 'sim') {
    engine.zones = DEFAULT_ZONES.map(z => ({ ...z }));
    state.src = new SimSource(); fitCanvas(); setStatus(''); renderZones(); return;
  }
  if (engine.zones.every(z => DEFAULT_ZONES.some(d => d.id === z.id))) engine.zones = [];
  renderZones();
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true;             // no audio, on purpose
  try {
    setStatus('Loading the pose-detection model… (the first time takes a few seconds)');
    let stream = null;
    if (kind === 'camera') {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = stream;
      if ($('#privacy').value === 'full') { $('#privacy').value = 'blur'; state.privacy = 'blur'; }
    } else {
      video.src = URL.createObjectURL(file); video.loop = false;
    }
    const src = new VideoSource(kind, video, stream);
    await Promise.all([src.init(), new Promise(r => { video.onloadeddata = r; })]);
    await video.play();
    state.src = src; fitCanvas(); setStatus('');
    if (!engine.zones.some(z => z.type === 'entrance')) setHint('Tip: mark an "Entrance" zone (+ Zone) to identify parents');
  } catch (e) {
    console.error(e);
    setStatus(kind === 'camera' ? 'No camera access. Check the browser permissions (HTTPS or localhost is required).' : `Could not load: ${e.message || e}`);
  }
}

function fitCanvas() {
  const s = state.src; if (!s) return;
  canvas.width = s.w; canvas.height = s.h;
  $('#stageWrap').style.aspectRatio = `${s.w} / ${s.h}`;
}

// ---------------- drawing ----------------
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

function draw() {
  const W = canvas.width, H = canvas.height, A = W / H, src = state.src;
  ctx.save();
  ctx.fillStyle = '#16171a'; ctx.fillRect(0, 0, W, H);
  if (src) {
    if (state.privacy === 'full') src.draw(ctx, W, H);
    else if (state.privacy === 'blur') { ctx.filter = `blur(${Math.round(W / 70)}px) saturate(.6)`; src.draw(ctx, W, H); ctx.filter = 'none'; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H); }
  }
  ctx.restore();
  const X = x => x / A * W, Y = y => y * H; // analysis space to pixels
  const lw = Math.max(1.5, W / 640);

  // heatmap
  if (state.heat) {
    const h = engine.heat[state.heat], gw = engine.heat.W, gh = engine.heat.H;
    let max = 0; for (const v of h) max = Math.max(max, v);
    if (max > 0) {
      ctx.fillStyle = roleColor(state.heat);
      for (let i = 0; i < h.length; i++) if (h[i] > 0) {
        ctx.globalAlpha = Math.min(.75, Math.sqrt(h[i] / max) * .75);
        ctx.fillRect((i % gw) / gw * W, Math.floor(i / gw) / gh * H, W / gw + 1, H / gh + 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  // zones
  ctx.font = `500 ${Math.round(H / 40)}px Rubik, sans-serif`; ctx.direction = 'ltr'; ctx.textAlign = 'left';
  for (const z of engine.zones) {
    ctx.setLineDash([8, 6]); ctx.strokeStyle = z.type === 'entrance' ? roleColor(ROLE.PARENT) : 'rgba(255,255,255,.75)'; ctx.lineWidth = lw;
    ctx.strokeRect(z.x * W, z.y * H, z.w * W, z.h * H); ctx.setLineDash([]);
    label(z.name, z.x * W + 6, z.y * H + 6, 'rgba(0,0,0,.55)', '#fff');
  }
  if (state.drag) {
    const d = state.drag; ctx.strokeStyle = '#fff'; ctx.setLineDash([4, 4]);
    ctx.strokeRect(Math.min(d.x0, d.x1) * W, Math.min(d.y0, d.y1) * H, Math.abs(d.x1 - d.x0) * W, Math.abs(d.y1 - d.y0) * H); ctx.setLineDash([]);
  }

  const fr = engine.frame;
  // child groups
  for (const g of fr.groups || []) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const k of g.members) { x0 = Math.min(x0, k.feet.x); x1 = Math.max(x1, k.feet.x); y0 = Math.min(y0, k.feet.y); y1 = Math.max(y1, k.feet.y); }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = lw; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.ellipse(X((x0 + x1) / 2), Y((y0 + y1) / 2), (X(x1) - X(x0)) / 2 + W * .03, (Y(y1) - Y(y0)) / 2 + H * .025, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  // interaction lines
  for (const l of fr.links || []) {
    ctx.strokeStyle = l.type === 'parent' ? roleColor(ROLE.PARENT) : roleColor(ROLE.STAFF);
    ctx.globalAlpha = l.type === 'contact' ? 1 : .7; ctx.lineWidth = l.type === 'contact' ? lw * 2.2 : lw;
    ctx.setLineDash(l.type === 'contact' ? [] : [6, 5]);
    ctx.beginPath(); ctx.moveTo(X(l.a.feet.x), Y(l.a.feet.y)); ctx.lineTo(X(l.b.feet.x), Y(l.b.feet.y)); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // skeletons and labels
  for (const p of fr.people || []) {
    const c = roleColor(p.role), lm = p.f.lm, px = i => lm[i].x * W, py = i => lm[i].y * H;
    ctx.strokeStyle = c; ctx.lineWidth = lw * 1.6; ctx.lineCap = 'round';
    for (const [a, b] of BONES) if ((lm[a].visibility ?? 1) > .3 && (lm[b].visibility ?? 1) > .3) { ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke(); }
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px(0), py(0), lw * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(X(p.feet.x), Y(p.feet.y), lw * 7, lw * 2.5, 0, 0, Math.PI * 2); ctx.globalAlpha = .5; ctx.fill(); ctx.globalAlpha = 1;
    if (p.role !== ROLE.CHILD || state.showScore) {
      let t = `${ROLE_LABEL[p.role]} ${p.id}`;
      if (p.role === ROLE.STAFF && p.f.low) t += ' · at child level';
      if (p.manualRole) t += ' ✎';
      if (state.showScore) t += ` · ${p.score.toFixed(2)}`;
      label(t, X(p.f.bbox.x0), Y(p.f.bbox.y0) - H * .045, c, '#fff');
    }
  }
}

function label(text, x, y, bg, fg) {
  const m = ctx.measureText(text), pad = 5, h = parseInt(ctx.font.match(/(\d+)px/)[1]) + 6;
  x = Math.min(x, canvas.width - m.width - pad * 2);
  ctx.fillStyle = bg; roundRect(x, y, m.width + pad * 2, h, 5); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = 'top'; ctx.fillText(text, x + pad, y + 3);
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

// ---------------- loop ----------------
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000; last = now;
  if (state.src && !state.paused) {
    try { state.src.tick(dt); } catch (e) { console.error(e); }
  }
  draw();
  if (now - state.lastPanel > 400) { state.lastPanel = now; renderPanel(); }
  requestAnimationFrame(loop);
}

// ---------------- panel ----------------
const pctTxt = v => v === null || v === undefined ? '—' : `${v}%`;

function renderPanel() {
  const fr = engine.frame, c = fr.counts || { staff: 0, children: 0, parents: 0 };
  $('#kpis').innerHTML = [
    ['Analysis time', fmtClock(engine.t)],
    ['Staff in frame', c.staff], ['Children in frame', c.children], ['Parents in frame', c.parents],
    ['Coverage now', fr.coverage == null ? '—' : `${Math.round(fr.coverage * 100)}<small>%</small>`],
    ['Child groups', (fr.groups || []).length],
  ].map(([k, v]) => `<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  drawChart();
  if (state.tab === 'overview') renderOverview();
  if (state.tab === 'staff') renderStaff();
  if (state.tab === 'events') renderEvents();
}

function indicatorHTML(ind) {
  const isPct = !ind.unit && !ind.plain;
  const val = ind.value === null ? '—' : isPct ? `${ind.value}%` : `${ind.value} <small>${ind.unit}</small>`;
  const bar = isPct && ind.value !== null ? `<div class="bar"><i style="width:${ind.value}%"></i></div>` : '';
  return `<div class="ind"><div class="ind-top"><span class="ind-name">${ind.name}${ind.invert ? ' <small class="muted">(lower = better)</small>' : ''}</span>
    <span class="ind-val">${val}${ind.extra ? ` <small>(${ind.extra})</small>` : ''}</span></div>${bar}<p>${ind.desc}</p><span class="tag">${ind.frame}</span></div>`;
}

function groupStackHTML() {
  const r = engine.room, tot = r.solo + r.small + r.large;
  if (!tot) return '';
  const parts = [['Alone', r.solo, 'var(--g1)'], ['Small group (2–5)', r.small, 'var(--g2)'], ['Large group (6+)', r.large, 'var(--g3)']];
  return `<div class="card" style="margin-bottom:6px"><h3>Child configurations</h3><span class="muted">Split of "child-time" by group size</span>
    <div class="stack">${parts.map(([n, v, col]) => `<i title="${n}: ${Math.round(100 * v / tot)}%" style="width:${100 * v / tot}%;background:${col}"></i>`).join('')}</div>
    <div class="stack-legend">${parts.map(([n, v, col]) => `<span><i class="sw" style="background:${col}"></i>${n} ${Math.round(100 * v / tot)}%</span>`).join('')}</div></div>`;
}

function renderOverview() {
  const s = engine.summary();
  $('#tab-overview').innerHTML = groupStackHTML() + s.indicators.map(indicatorHTML).join('') +
    `<p class="muted" style="margin-top:10px">These indicators are descriptive only and are based on body posture and position. They are not a validated quality score, but a starting point for observation and research.</p>`;
}

function staffRows(tr) {
  const st = tr.st, p = st.present || 1, pct = v => Math.round(100 * v / p);
  const nearPct = st.near ? Math.round(100 * st.lowNear / st.near) : 0;
  const kids = [...tr.kids.values()].filter(v => v >= 5).length;
  const rows = [['Near children', pct(st.near)], ['At child level*', nearPct], ['Facing child*', st.near ? Math.round(100 * st.facing / st.near) : 0],
    ['Moving', pct(st.moving)], ['Active hands', pct(st.hands)], ['With staff, no children', pct(st.huddle)], ['With parents', pct(st.parent)]];
  return { rows, kids };
}

function renderStaff() {
  const live = new Set(engine.tracks.map(t => t.id));
  const list = engine.allTracks(ROLE.STAFF).filter(t => t.st.present > 8).sort((a, b) => b.st.present - a.st.present).slice(0, 12);
  if (!list.length) { $('#tab-staff').innerHTML = '<p class="muted">No staff detected yet.</p>'; return; }
  $('#tab-staff').innerHTML = `<p class="muted" style="margin-top:0">* Out of the time the staff member is near children. Numeric IDs are temporary; the system does not identify who a person is.</p>` +
    list.map(tr => {
      const { rows, kids } = staffRows(tr), on = live.has(tr.id);
      return `<div class="staff-card ${on ? '' : 'gone'}"><div class="staff-head"><b><i class="dot staff"></i>Staff ${tr.id}</b>
        <span class="muted">${fmtDur(tr.st.present)} · ${on ? tr.f.posture : 'not in frame'}</span></div>
        ${rows.map(([n, v]) => `<div class="row"><span>${n}</span><div class="bar"><i style="width:${v}%"></i></div><span>${v}%</span></div>`).join('')}
        <div class="row"><span>Distinct children (5s+)</span><span></span><span>${kids}</span></div>
        <div class="row"><span>Physical contact</span><span></span><span>${fmtDur(tr.st.contact)}</span></div></div>`;
    }).join('');
}

const EV_TYPES = { all: 'All', parent_arrive: 'Parents', eye_level: 'Eye level', contact: 'Touch', huddle: 'Staff huddling', alone: 'Child alone' };
const EV_GROUP = { parent_leave: 'parent_arrive', greet: 'parent_arrive' };
function renderEvents() {
  $('#evFilters').innerHTML = Object.entries(EV_TYPES).map(([k, v]) => `<button data-f="${k}" class="${state.evFilter === k ? 'on' : ''}">${v}</button>`).join('');
  const evs = engine.events.filter(e => state.evFilter === 'all' || (EV_GROUP[e.type] || e.type) === state.evFilter).slice(-200).reverse();
  const seek = state.src?.kind === 'file';
  $('#events').innerHTML = evs.length ? evs.map(e => `<li class="${seek ? 'seek' : ''}" data-t="${e.t}"><time>${fmtClock(e.t)}</time><div>${e.text}<span class="ty">${EV_TYPES[EV_GROUP[e.type] || e.type] || ''}</span></div></li>`).join('')
    : '<li><span></span><span class="muted">No events yet</span></li>';
}

// coverage chart (single series, no legend; the title names it)
function drawChart() {
  const cv = $('#chart'), wrap = $('#chartWrap'), dpr = window.devicePixelRatio || 1;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const data = engine.series.filter(d => d.coverage !== null);
  const padL = 34, padR = 8, padT = 8, padB = 20, iw = W - padL - padR, ih = H - padT - padB;
  c.font = '11px Rubik, sans-serif'; c.fillStyle = css('--ink-3'); c.strokeStyle = css('--line'); c.lineWidth = 1;
  c.textAlign = 'right'; c.direction = 'ltr';
  for (const v of [0, 50, 100]) { const y = padT + ih * (1 - v / 100); c.beginPath(); c.moveTo(padL, y); c.lineTo(W - padR, y); c.stroke(); c.fillText(v + '%', padL - 6, y + 4); }
  chartState.geom = null;
  if (data.length < 2) return;
  const t0 = data[0].t, t1 = data[data.length - 1].t || 1;
  // 10-second moving average so the line is readable
  const sm = data.map((d, i) => { const w = data.slice(Math.max(0, i - 9), i + 1); return { t: d.t, v: w.reduce((s, x) => s + x.coverage, 0) / w.length }; });
  const xs = t => padL + (t - t0) / Math.max(1, t1 - t0) * iw, ys = v => padT + ih * (1 - v / 100);
  c.strokeStyle = css('--staff'); c.lineWidth = 2; c.beginPath();
  sm.forEach((d, i) => i ? c.lineTo(xs(d.t), ys(d.v)) : c.moveTo(xs(d.t), ys(d.v))); c.stroke();
  c.textAlign = 'left'; c.fillStyle = css('--ink-3'); c.fillText(fmtClock(t0), padL, H - 4); c.textAlign = 'right'; c.fillText(fmtClock(t1), W - padR, H - 4);
  chartState.geom = { sm, xs, ys, padL, iw, t0, t1 };
  if (chartState.hx != null) {
    const g = chartState.geom, t = t0 + (chartState.hx - padL) / iw * (t1 - t0);
    const d = sm.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
    c.strokeStyle = css('--ink-3'); c.lineWidth = 1; c.beginPath(); c.moveTo(xs(d.t), padT); c.lineTo(xs(d.t), padT + ih); c.stroke();
    c.fillStyle = css('--staff'); c.strokeStyle = css('--surface'); c.lineWidth = 2; c.beginPath(); c.arc(xs(d.t), ys(d.v), 4.5, 0, Math.PI * 2); c.fill(); c.stroke();
    const tip = $('#tip'); tip.hidden = false; tip.style.left = xs(d.t) + 'px'; tip.style.top = ys(d.v) + 'px'; tip.style.transform = `translate(${xs(d.t) > W / 2 ? '-105%' : '5%'}, -110%)`;
    tip.textContent = `${fmtClock(d.t)} · coverage ${Math.round(d.v)}%`;
  } else $('#tip').hidden = true;
}
const chartState = { hx: null, geom: null };
$('#chartWrap').addEventListener('pointermove', e => { chartState.hx = e.clientX - $('#chartWrap').getBoundingClientRect().left; drawChart(); });
$('#chartWrap').addEventListener('pointerleave', () => { chartState.hx = null; drawChart(); });

// ---------------- report ----------------
function openReport() {
  const s = engine.summary();
  $('#repMeta').textContent = `Analysis length ${fmtDur(s.duration)} · ${new Date().toLocaleString('en-GB')} · Source: ${({ sim: 'simulation', camera: 'camera', file: 'video file' })[state.src?.kind] || ''}`;
  const staff = engine.allTracks(ROLE.STAFF).filter(t => t.st.present > 8).sort((a, b) => b.st.present - a.st.present).slice(0, 15);
  const zoneRows = engine.zones.map(z => { const zt = engine.zoneTime.get(z.id) || {}; return `<tr><td>${z.name}</td><td>${fmtDur(zt.staff || 0)}</td><td>${fmtDur(zt.child || 0)}</td><td>${fmtDur(zt.parent || 0)}</td></tr>`; }).join('');
  const counts = {}; engine.events.forEach(e => counts[e.type] = (counts[e.type] || 0) + 1);
  $('#repBody').innerHTML = `
    <div class="rep-grid"><div>${s.indicators.slice(0, 5).map(indicatorHTML).join('')}</div><div>${s.indicators.slice(5).map(indicatorHTML).join('')}</div></div>
    ${groupStackHTML()}
    <h4>Staff profile</h4>
    <table><thead><tr><th>Staff</th><th>Time</th><th>Near children</th><th>At child level*</th><th>Facing child*</th><th>Moving</th><th>Huddling</th><th>Distinct children</th><th>Touch</th></tr></thead>
    <tbody>${staff.map(t => { const { rows, kids } = staffRows(t); const v = n => rows.find(r => r[0] === n)[1] + '%';
      return `<tr><td>${t.id}</td><td>${fmtDur(t.st.present)}</td><td>${v('Near children')}</td><td>${v('At child level*')}</td><td>${v('Facing child*')}</td><td>${v('Moving')}</td><td>${v('With staff, no children')}</td><td>${kids}</td><td>${fmtDur(t.st.contact)}</td></tr>`; }).join('')}</tbody></table>
    ${zoneRows ? `<h4>Time in zones</h4><table><thead><tr><th>Zone</th><th>Staff</th><th>Children</th><th>Parents</th></tr></thead><tbody>${zoneRows}</tbody></table>` : ''}
    <h4>Events</h4>
    <table><tbody>${Object.entries(EV_TYPES).filter(([k]) => k !== 'all').map(([k, n]) => `<tr><td>${n}</td><td>${k === 'parent_arrive' ? (counts.parent_arrive || 0) + ' arrivals' : (counts[k] || 0)}</td></tr>`).join('')}</tbody></table>
    <p class="disclaimer">* Out of the time spent near children. Metrics are computed from body posture and position only (no audio, no face recognition) and do not replace professional observation.
    Person IDs are temporary and may change when someone leaves the frame or is occluded. The staff/child/parent classification is automatic and should be verified.</p>`;
  $('#report').showModal();
}

// ---------------- export ----------------
async function download(name, text, type) {
  if (IN_CLAUDE) {
    const dl = await window.claude.use('downloads').catch(() => null);
    if (!dl) { flash('Downloads are not available in this view'); return; }
    try { await dl.save({ filename: name, data: new Blob([text], { type }) }); }
    catch (e) { if (e?.code !== 'declined') flash('The file could not be saved'); }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const csv = rows => '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

$('#expEvents').onclick = () => download(`gan-events-${stamp()}.csv`, csv([['t_sec', 'clock', 'type', 'text', 'ids'], ...engine.events.map(e => [e.t.toFixed(1), fmtClock(e.t), e.type, e.text, e.ids.join(' ')])]), 'text/csv');
$('#expSeries').onclick = () => {
  const keys = ['t', 'staff', 'children', 'parents', 'coverage', 'staffLow', 'solo', 'groups'];
  download(`gan-series-${stamp()}.csv`, csv([keys, ...engine.series.map(d => keys.map(k => d[k]))]), 'text/csv');
};
$('#expJson').onclick = () => {
  const people = engine.allTracks().filter(t => t.st.present > 3).map(t => ({ id: t.id, role: t.role, manualRole: t.manualRole, childScore: +t.score.toFixed(3),
    stats: Object.fromEntries(Object.entries(t.st).map(([k, v]) => [k, +v.toFixed(2)])), childrenSeconds: Object.fromEntries([...t.kids].map(([k, v]) => [k, +v.toFixed(1)])) }));
  download(`gan-analysis-${stamp()}.json`, JSON.stringify({ source: state.src?.kind, settings: engine.settings, zones: engine.zones,
    summary: engine.summary(), zoneTime: Object.fromEntries(engine.zoneTime), people, events: engine.events, series: engine.series }, null, 1), 'application/json');
};

// ---------------- UI events ----------------
document.querySelectorAll('#sources button').forEach(b => b.onclick = () => {
  if (b.dataset.src === 'file') $('#fileInput').click(); else useSource(b.dataset.src);
});
$('#fileInput').onchange = e => { const f = e.target.files[0]; if (f) useSource('file', f); e.target.value = ''; };
$('#playBtn').onclick = () => {
  state.paused = !state.paused; $('#playBtn').textContent = state.paused ? '▶' : '❚❚';
  const v = state.src?.video; if (v) state.paused ? v.pause() : v.play();
};
$('#speed').onchange = e => state.speed = +e.target.value;
$('#privacy').onchange = e => state.privacy = e.target.value;
$('#heat').onchange = e => state.heat = e.target.value;
$('#zoneBtn').onclick = () => { state.drawing = !state.drawing; $('#zoneBtn').classList.toggle('active', state.drawing); $('#stageWrap').classList.toggle('drawing', state.drawing); setHint(state.drawing ? 'Drag a rectangle on the image to define a zone' : ''); };
$('#reportBtn').onclick = openReport;
$('#closeReport').onclick = () => $('#report').close();
$('#printBtn').onclick = () => window.print();
$('#resetBtn').onclick = () => { const z = engine.zones; engine.reset(); engine.zones = z; };
$('#showScore').onchange = e => state.showScore = e.target.checked;
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  state.tab = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(t => t.hidden = t.id !== 'tab-' + state.tab);
  renderPanel();
});
$('#evFilters').onclick = e => { const f = e.target.dataset?.f; if (f) { state.evFilter = f; renderEvents(); } };
$('#events').onclick = e => {
  const li = e.target.closest('li[data-t]'); const s = state.src;
  if (li && s?.kind === 'file') s.video.currentTime = +li.dataset.t + (s.t0 || 0);
};

const sliders = [['sInteract', 'interactR', v => `${v} (≈${(v * 0.5).toFixed(1)} m)`], ['sChild', 'childThr', v => v],
  ['sAlone', 'aloneSec', v => `${v}s`], ['sGreet', 'greetSec', v => `${v}s`]];
for (const [id, key, fmt] of sliders) {
  const el = $('#' + id), out = $('#v' + id.slice(1));
  el.value = engine.settings[key]; out.textContent = fmt(engine.settings[key]);
  el.oninput = () => { engine.settings[key] = +el.value; out.textContent = fmt(+el.value); };
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}
canvas.addEventListener('pointerdown', e => {
  const p = canvasPoint(e);
  if (state.drawing) { state.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; canvas.setPointerCapture(e.pointerId); return; }
  const A = canvas.width / canvas.height, q = { x: p.x * A, y: p.y };
  const hit = (engine.frame.people || []).filter(t => { const b = t.f.bbox; return q.x > b.x0 - .02 && q.x < b.x1 + .02 && q.y > b.y0 - .03 && q.y < b.y1 + .02; })
    .sort((a, b) => Math.hypot(a.feet.x - q.x, a.feet.y - q.y) - Math.hypot(b.feet.x - q.x, b.feet.y - q.y))[0];
  if (hit) { engine.cycleRole(hit); hit.role = engine.roleOf(hit); setHint(`#${hit.id} → ${hit.manualRole ? ROLE_LABEL[hit.manualRole] : 'automatic'}`); setTimeout(() => setHint(''), 1800); }
});
canvas.addEventListener('pointermove', e => { if (state.drag) { const p = canvasPoint(e); state.drag.x1 = p.x; state.drag.y1 = p.y; } });
canvas.addEventListener('pointerup', () => {
  const d = state.drag; state.drag = null; if (!d) return;
  const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
  if (w > .02 && h > .02) {
    state.pendingZone = { x: Math.min(d.x0, d.x1), y: Math.min(d.y0, d.y1), w, h };
    const hasEntrance = engine.zones.some(z => z.type === 'entrance');
    $('#zoneName').value = hasEntrance ? '' : 'Entrance';
    $('#zoneForm').hidden = false; $('#zoneName').focus(); $('#zoneName').select();
  }
  state.drawing = false; $('#zoneBtn').classList.remove('active'); $('#stageWrap').classList.remove('drawing'); setHint('');
});

$('#zoneForm').onsubmit = e => {
  e.preventDefault();
  const name = $('#zoneName').value.trim(), z = state.pendingZone;
  if (name && z) engine.zones.push({ id: 'z' + Date.now(), name, type: /entrance|entry|כניסה/i.test(name) ? 'entrance' : 'area', ...z });
  state.pendingZone = null; $('#zoneForm').hidden = true; renderZones();
};
$('#zoneCancel').onclick = () => { state.pendingZone = null; $('#zoneForm').hidden = true; };

function flash(msg) { setHint(msg); setTimeout(() => setHint(''), 2500); }

function renderZones() {
  $('#zones').innerHTML = engine.zones.map(z => `<li><span>${z.name}</span>
    <label class="check"><input type="checkbox" data-z="${z.id}" data-k="entrance" ${z.type === 'entrance' ? 'checked' : ''}/> Entrance</label>
    <button data-z="${z.id}" data-k="del">Delete</button></li>`).join('') || '<li class="muted">No zones</li>';
}
$('#zones').onclick = e => {
  const id = e.target.dataset?.z; if (!id) return;
  if (e.target.dataset.k === 'del') engine.zones = engine.zones.filter(z => z.id !== id);
  if (e.target.dataset.k === 'entrance') { const z = engine.zones.find(z => z.id === id); z.type = e.target.checked ? 'entrance' : 'area'; }
  renderZones();
};

if (IN_CLAUDE) { $('[data-src=camera]').hidden = true; $('#printBtn').hidden = true; }
window.__gan = { engine, state, getLandmarker }; // for debugging from the console
useSource('sim');
requestAnimationFrame(loop);
