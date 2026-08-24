// Wiring: upload -> trace -> plan -> editor + 3D viewer.

import { Editor } from './editor.js';
import { Viewer } from './viewer.js';
import { trace, DEFAULT_OPTIONS } from './tracer.js';
import { autoFurnish } from './builder.js';
import { polygonArea, polygonBounds, polygonCentroid, pointInPolygon, uid } from './geom.js';
import * as textures from './textures.js';
import * as furniture from './furniture.js';
import { sampleFloorPlan } from './sample.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const state = {
  image: null,
  trace: null,
  plan: emptyPlan(),
  options: { ...DEFAULT_OPTIONS },
  rebuildTimer: null,
};

function emptyPlan() {
  return {
    version: 1,
    name: 'Apartment',
    scale: 60,                 // image pixels per metre
    wallHeight: 2.7,
    defaultThickness: 0.12,
    wallMaterial: 'wall',
    walls: [],
    openings: [],
    rooms: [],
    items: [],
  };
}

// --------------------------------------------------------------- boot

const editor = new Editor($('#plan-canvas'), state.plan);
const viewer = new Viewer($('#view-canvas'));

editor.addEventListener('change', () => {
  renderRoomList();
  renderStats();
  scheduleRebuild();
});
editor.addEventListener('select', () => renderRoomList());
editor.addEventListener('notice', (e) => toast(e.detail));
editor.addEventListener('calibrate', (e) => showCalibration(e.detail.measured));
viewer.onModeChange = (mode) => {
  $$('#view-modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  $('#walk-hint').hidden = mode !== 'walk';
};

function scheduleRebuild() {
  clearTimeout(state.rebuildTimer);
  state.rebuildTimer = setTimeout(rebuild3D, 220);
}

function rebuild3D() {
  viewer.setPlan(state.plan, {
    wallMaterial: state.plan.wallMaterial,
    baseboards: $('#toggle-baseboards').checked,
  });
  const biggest = [...(state.plan.rooms || [])]
    .sort((a, b) => Math.abs(polygonArea(b.poly)) - Math.abs(polygonArea(a.poly)))[0];
  if (biggest) viewer.setSpawn(...standingSpot(biggest.poly));
}

// Stand back along the room's long axis and look down it, so the walkthrough
// opens on the room rather than on the wall 40 cm from your nose.
function standingSpot(poly) {
  const c = polygonCentroid(poly);
  const b = polygonBounds(poly);
  const horizontal = b.w >= b.h;
  const back = Math.min(horizontal ? b.w : b.h, 6) * 0.32;
  const candidates = horizontal
    ? [[c.x - back, c.y, -Math.PI / 2], [c.x + back, c.y, Math.PI / 2]]
    : [[c.x, c.y - back, 0], [c.x, c.y + back, Math.PI]];
  for (const [x, y, yaw] of candidates) {
    if (pointInPolygon({ x, y }, poly)) return [x, y, yaw];
  }
  return [c.x, c.y, 0];
}

// --------------------------------------------------------------- ingest

async function loadImage(source) {
  const img = source instanceof Image ? source : await fileToImage(source);
  state.image = img;
  $('#drop-zone').classList.add('has-image');
  $('#image-name').textContent = img.dataset.name || 'sample-plan.png';
  runDetection();
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => { img.dataset.name = file.name; resolve(img); };
      img.onerror = () => reject(new Error('Could not read that image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

function runDetection() {
  if (!state.image) return;
  busy(true);
  // let the browser paint the spinner before the synchronous trace
  setTimeout(() => {
    try {
      const result = trace(state.image, state.options);
      state.trace = result;
      state.plan = planFromTrace(result);
      editor.setPlan(state.plan);
      editor.setImage(state.image);
      editor.fit();
      rebuild3D();
      renderRoomList();
      renderStats();
      toast(`Found ${state.plan.walls.length} walls, ${state.plan.rooms.length} rooms`);
    } catch (err) {
      console.error(err);
      toast(`Detection failed: ${err.message}`);
    } finally {
      busy(false);
    }
  }, 16);
}

// Turn traced pixels into a metric plan.
function planFromTrace(result) {
  const plan = emptyPlan();
  plan.wallHeight = parseFloat($('#wall-height').value) || 2.7;
  plan.wallMaterial = $('#wall-material').value;

  // Assume the plan is as wide as the target width until the user calibrates.
  const pts = result.segments.flatMap((s) => [[s.x1, s.y1], [s.x2, s.y2]]);
  const bounds = pts.length ? polygonBounds(pts) : { w: result.width, h: result.height };
  const targetWidth = parseFloat($('#input-width').value) || 11;
  const pxPerMetre = Math.max(4, (bounds.w || result.width) / targetWidth);
  plan.scale = pxPerMetre;

  const toM = (v) => v / pxPerMetre;

  result.segments.forEach((s, i) => {
    plan.walls.push({
      id: `w${i}`,
      x1: toM(s.x1), y1: toM(s.y1),
      x2: toM(s.x2), y2: toM(s.y2),
      t: Math.min(0.45, Math.max(0.07, toM(s.t))),
    });
  });

  for (const door of result.doors) {
    const wall = plan.walls[door.segment];
    if (!wall) continue;
    const width = Math.min(2.4, Math.max(0.65, toM(door.width)));
    plan.openings.push({
      id: uid('o'),
      wallId: wall.id,
      pos: toM((door.from + door.to) / 2),
      width,
      height: 2.05,
      sill: 0,
      type: 'door',
      hinge: 'start',
    });
  }

  const rooms = result.rooms.map((r) => ({
    poly: r.poly.map(([x, y]) => [toM(x), toM(y)]),
  }));
  nameRooms(rooms).forEach((room, i) => {
    plan.rooms.push({
      id: `r${i}`,
      name: room.name,
      poly: room.poly,
      floor: room.floor,
    });
  });

  return plan;
}

// A first guess at what each room is, from size and shape. Always editable.
function nameRooms(rooms) {
  const scored = rooms.map((r) => {
    const area = Math.abs(polygonArea(r.poly));
    const b = polygonBounds(r.poly);
    const aspect = Math.max(b.w, b.h) / Math.max(0.1, Math.min(b.w, b.h));
    return { ...r, area, aspect };
  }).sort((a, b) => b.area - a.area);

  let bedrooms = 0;
  return scored.map((r, i) => {
    let name;
    if (r.aspect > 3.2 && r.area < 14) name = 'Hallway';
    else if (r.area < 5.5) name = 'Bathroom';
    else if (i === 0) name = 'Living room';
    else if (r.area > 9) name = `Bedroom ${++bedrooms || ''}`.trim();
    else name = 'Kitchen';

    const floor = /bath|hall|kitchen/i.test(name) ? 'tile' : 'oak';
    return { ...r, name, floor };
  });
}

// --------------------------------------------------------------- scale

function rescale(factor) {
  if (!isFinite(factor) || factor <= 0) return;
  const p = state.plan;
  for (const w of p.walls) {
    w.x1 *= factor; w.y1 *= factor; w.x2 *= factor; w.y2 *= factor;
    w.t = Math.min(0.5, Math.max(0.06, w.t * factor));
  }
  for (const o of p.openings) { o.pos *= factor; o.width *= factor; }
  for (const r of p.rooms) r.poly = r.poly.map(([x, y]) => [x * factor, y * factor]);
  for (const it of p.items) { it.x *= factor; it.y *= factor; }
  p.scale /= factor;
  editor.fit();
  editor.emit();
}

function showCalibration(measured) {
  $('#calib-row').hidden = false;
  $('#calib-measured').textContent = `${measured.toFixed(2)} m`;
  $('#calib-real').value = measured.toFixed(2);
  $('#calib-real').focus();
  $('#calib-real').select();
  state.calibMeasured = measured;
}

// --------------------------------------------------------------- panels

function renderRoomList() {
  const list = $('#room-list');
  list.innerHTML = '';
  const rooms = state.plan.rooms || [];
  if (!rooms.length) {
    list.innerHTML = '<p class="empty">No rooms yet. Use the Room tool and click inside an enclosed area.</p>';
    return;
  }
  const selectedId = editor.selection && editor.selection.kind === 'room' ? editor.selection.id : null;

  for (const room of rooms) {
    const area = Math.abs(polygonArea(room.poly));
    const row = document.createElement('div');
    row.className = `room-row${room.id === selectedId ? ' selected' : ''}`;

    const name = document.createElement('input');
    name.value = room.name || '';
    name.setAttribute('aria-label', 'Room name');
    name.addEventListener('input', () => { room.name = name.value; editor.draw(); });
    name.addEventListener('change', () => editor.emit());

    const floor = document.createElement('select');
    floor.setAttribute('aria-label', 'Floor material');
    for (const key of textures.FLOOR_MATERIALS) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = textures.label(key);
      floor.appendChild(opt);
    }
    floor.value = room.floor || 'oak';
    floor.addEventListener('change', () => { room.floor = floor.value; editor.emit(); });

    const meta = document.createElement('span');
    meta.className = 'area';
    meta.textContent = `${area.toFixed(1)} m²`;

    row.append(name, floor, meta);
    row.addEventListener('click', (e) => {
      if (e.target === name || e.target === floor) return;
      editor.selection = { kind: 'room', id: room.id };
      editor.draw();
      renderRoomList();
    });
    list.appendChild(row);
  }
}

function renderStats() {
  const p = state.plan;
  const area = (p.rooms || []).reduce((s, r) => s + Math.abs(polygonArea(r.poly)), 0);
  $('#stats').textContent =
    `${p.walls.length} walls · ${p.openings.length} openings · ${p.rooms.length} rooms · ${area.toFixed(1)} m² floor area`;
}

function renderPalette() {
  const wrap = $('#furniture-palette');
  wrap.innerHTML = '';
  const groups = new Map();
  for (const item of furniture.catalog()) {
    if (!groups.has(item.room)) groups.set(item.room, []);
    groups.get(item.room).push(item);
  }
  for (const [room, items] of groups) {
    const h = document.createElement('h4');
    h.textContent = room === 'any' ? 'Extras' : room;
    wrap.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'palette-grid';
    for (const item of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = item.label;
      b.title = `${item.w.toFixed(2)} × ${item.d.toFixed(2)} m`;
      b.addEventListener('click', () => {
        editor.itemType = item.key;
        setTool('item');
        $$('#furniture-palette button').forEach((x) => x.classList.toggle('active', x === b));
      });
      grid.appendChild(b);
    }
    wrap.appendChild(grid);
  }
}

// --------------------------------------------------------------- ui helpers

function setTool(tool) {
  editor.setTool(tool);
  $$('.tool-btn').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
  setView(tool === 'select' ? currentView : (currentView === '3d' ? 'split' : currentView));
}

let currentView = 'split';
function setView(view) {
  currentView = view;
  document.body.dataset.view = view;
  $$('#view-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.viewTab === view));
  requestAnimationFrame(() => { editor.resize(); viewer._resize(); });
}

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function busy(on) {
  $('#busy').hidden = !on;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// --------------------------------------------------------------- events

function bindUI() {
  $('#file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadImage(file).catch((err) => toast(err.message));
  });
  $('#drop-zone').addEventListener('click', () => $('#file-input').click());
  $('#drop-zone').addEventListener('dragover', (e) => {
    e.preventDefault();
    $('#drop-zone').classList.add('drag');
  });
  $('#drop-zone').addEventListener('dragleave', () => $('#drop-zone').classList.remove('drag'));
  $('#drop-zone').addEventListener('drop', (e) => {
    e.preventDefault();
    $('#drop-zone').classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file).catch((err) => toast(err.message));
  });

  $('#btn-sample').addEventListener('click', async () => {
    busy(true);
    const img = await sampleFloorPlan();
    img.dataset.name = 'sample-plan.png';
    busy(false);
    loadImage(img);
  });

  // detection sliders
  const sliders = [
    ['#opt-threshold', 'threshold'],
    ['#opt-minrun', 'minRun'],
    ['#opt-thickness', 'maxWallThickness'],
    ['#opt-doorgap', 'maxDoorGap'],
  ];
  for (const [sel, key] of sliders) {
    const input = $(sel);
    const out = $(`${sel}-value`);
    const sync = () => {
      state.options[key] = parseFloat(input.value);
      if (out) out.textContent = key === 'threshold' && +input.value === 0 ? 'auto' : input.value;
    };
    input.addEventListener('input', sync);
    input.addEventListener('change', () => { sync(); runDetection(); });
    sync();
  }
  $('#btn-detect').addEventListener('click', runDetection);

  // scale
  $('#input-width').addEventListener('change', () => {
    const target = parseFloat($('#input-width').value);
    if (!target || !state.plan.walls.length) return;
    const pts = state.plan.walls.flatMap((w) => [[w.x1, w.y1], [w.x2, w.y2]]);
    const b = polygonBounds(pts);
    if (b.w > 0.01) rescale(target / b.w);
  });
  $('#calib-apply').addEventListener('click', () => {
    const real = parseFloat($('#calib-real').value);
    if (real > 0 && state.calibMeasured > 0) rescale(real / state.calibMeasured);
    $('#calib-row').hidden = true;
    editor.calibration = null;
    setTool('select');
  });

  // model settings
  $('#wall-height').addEventListener('change', () => {
    state.plan.wallHeight = parseFloat($('#wall-height').value) || 2.7;
    rebuild3D();
  });
  $('#wall-material').addEventListener('change', () => {
    state.plan.wallMaterial = $('#wall-material').value;
    rebuild3D();
  });
  $('#toggle-baseboards').addEventListener('change', rebuild3D);
  $('#toggle-ceiling').addEventListener('change', (e) => viewer.toggleCeiling(e.target.checked));
  $('#toggle-night').addEventListener('change', (e) => viewer.setNight(e.target.checked));
  $('#toggle-image').addEventListener('change', (e) => {
    editor.showImage = e.target.checked;
    editor.draw();
  });

  // furniture
  $('#btn-furnish').addEventListener('click', () => {
    if (!state.plan.rooms.length) return toast('Detect or draw some rooms first');
    state.plan.items = autoFurnish(state.plan);
    editor.emit();
    toast(`Placed ${state.plan.items.length} pieces from the room names`);
  });
  $('#btn-clear-furniture').addEventListener('click', () => {
    state.plan.items = [];
    editor.emit();
  });

  // tools + views
  $$('.tool-btn').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $$('#view-tabs button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.viewTab)));
  $$('#view-modes button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.mode === 'walk' && currentView === 'plan') setView('split');
    viewer.setMode(b.dataset.mode);
  }));
  $('#btn-frame').addEventListener('click', () => { viewer.setMode('orbit'); viewer.frameAll(); });

  // file actions
  $('#btn-save').addEventListener('click', () => {
    const data = JSON.stringify({ ...state.plan, savedAt: new Date().toISOString() }, null, 2);
    download(new Blob([data], { type: 'application/json' }), `${state.plan.name || 'apartment'}.plan.json`);
  });
  $('#btn-load').addEventListener('click', () => $('#load-input').click());
  $('#load-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      state.plan = { ...emptyPlan(), ...parsed };
      editor.setPlan(state.plan);
      editor.fit();
      $('#wall-height').value = state.plan.wallHeight;
      $('#wall-material').value = state.plan.wallMaterial || 'wall';
      rebuild3D();
      renderRoomList();
      renderStats();
      toast('Plan loaded');
    } catch (err) {
      toast(`Could not read that plan: ${err.message}`);
    }
  });
  $('#btn-glb').addEventListener('click', async () => {
    try {
      busy(true);
      const blob = await viewer.exportGLB();
      download(blob, `${state.plan.name || 'apartment'}.glb`);
      toast('Exported .glb — open it in Blender, Windows 3D Viewer or macOS Preview');
    } catch (err) {
      toast(`Export failed: ${err.message}`);
    } finally {
      busy(false);
    }
  });
  $('#btn-shot').addEventListener('click', () => {
    const url = viewer.screenshot();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apartment.png';
    a.click();
  });

  window.addEventListener('keydown', (e) => {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    const map = { v: 'select', w: 'wall', d: 'door', n: 'window', b: 'room', f: 'item', e: 'erase', h: 'pan' };
    if (map[e.key]) { setTool(map[e.key]); e.preventDefault(); }
    if (e.key === '1') setView('plan');
    if (e.key === '2') setView('split');
    if (e.key === '3') setView('3d');
  });
}

renderPalette();
bindUI();
setView('split');
setTool('select');
renderStats();

// expose for the smoke test
window.__apartment = { state, editor, viewer, loadImage, runDetection, rebuild3D };
