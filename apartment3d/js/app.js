// Wiring: upload -> trace -> plan -> editor + 3D viewer.

import { Editor } from './editor.js';
import { Viewer } from './viewer.js';
import { trace, DEFAULT_OPTIONS } from './tracer.js';
import { autoFurnish } from './builder.js';
import { polygonArea, polygonBounds, polygonCentroid, pointInPolygon, levelAt, clamp, uid } from './geom.js';
import * as textures from './textures.js';
import * as furniture from './furniture.js';
import { sampleFloorPlan } from './sample.js';
import { Minimap } from './minimap.js';
import * as storage from './storage.js';

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
const minimap = new Minimap($('#minimap-canvas'));

minimap.onTeleport = (x, y) => {
  if (viewer.mode !== 'walk') return;
  viewer.walk.object.position.set(x, viewer.walkYBase + 1.65, y);
};

// the minimap follows the camera while walking
viewer.onFrame = (camera) => {
  if (viewer.mode !== 'walk' || $('#minimap').hidden) return;
  const yaw = Math.atan2(
    -(camera.matrixWorld.elements[8]),
    -(camera.matrixWorld.elements[10])
  );
  minimap.setPlayer(camera.position.x, camera.position.z, yaw);
};

editor.addEventListener('change', () => {
  renderRoomList();
  renderStats();
  renderSelection();
  scheduleRebuild();
});
editor.addEventListener('select', () => { renderRoomList(); renderSelection(); });
editor.addEventListener('notice', (e) => toast(e.detail));
editor.addEventListener('calibrate', (e) => showCalibration(e.detail.measured));
viewer.onPick = (selection, additive) => {
  if (additive && selection) editor.toggleSelected(selection);
  else editor.selection = selection;
  editor.draw();
  viewer.setHighlight(editor.selected);
  renderSelection();
  renderRoomList();
};
// Furniture dragged in the 3D view writes straight back to the plan.
viewer.onItemChange = (id, change) => {
  const item = state.plan.items.find((i) => i.id === id);
  if (!item) return;
  const level = item.level || 0;
  const offset = (state.plan.levelOffsets || {})[level] || { dx: 0, dy: 0 };
  if (change.x !== undefined) item.x = change.x - (offset.dx || 0);
  if (change.y !== undefined) item.y = change.y - (offset.dy || 0);
  if (change.rot !== undefined) item.rot = change.rot;
  if (change.scale !== undefined) {
    if (item.fit) {
      const base = furniture.spec(item.type);
      item.fit = { w: base.w * change.scale, d: base.d * change.scale, h: item.fit.h };
    } else {
      item.scale = change.scale;
    }
  }
  editor.selection = { kind: 'item', id };
  editor.emit();
  renderSelection();
};

viewer.onPointerLockDenied = () => {
  $('#walk-hint').innerHTML =
    '<strong>W A S D</strong> to move · <strong>Shift</strong> to run · <strong>drag</strong> to look around';
};
viewer.onModeChange = (mode) => {
  $$('#view-modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  $('#walk-hint').hidden = mode !== 'walk';
  $('#minimap').hidden = mode !== 'walk' || !state.showMinimap;
  if (mode === 'walk') {
    minimap.setPlan(state.plan, viewer.walkLevel || 0);
    minimap.resize();
  }
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
  if (biggest) viewer.setSpawn(...standingSpot(biggest.poly), biggest.level || 0);
  viewer.setHighlight(editor.selected);
  renderLevels();
  minimap.setPlan(state.plan, viewer.walkLevel || 0);
  scheduleAutosave();
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
  state.packedImage = storage.packImage(img);
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
      const windows = state.plan.openings.filter((o) => o.type === 'window').length;
      const doors = state.plan.openings.length - windows;
      const stairs = (result.stairs || []).length;
      toast(`Found ${state.plan.walls.length} walls, ${doors} doors, ${windows} windows, ` +
            `${state.plan.rooms.length} rooms${stairs ? `, ${stairs} staircase${stairs > 1 ? 's' : ''}` : ''}`);
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

  // The tracer already split the sheet into separate drawings — usually the
  // floors of one flat, laid out side by side.
  const clusters = (result.sections || []).length
    ? result.sections
    : [{ minX: 0, minY: 0, maxX: result.width, maxY: result.height, w: result.width, h: result.height }];

  // Scale from the widest single drawing, not the whole sheet — otherwise two
  // floors side by side make every room half its real size.
  const widest = clusters.reduce((a, b) => (b.w > a.w ? b : a), clusters[0]);
  const targetWidth = parseFloat($('#input-width').value) || 11;
  const pxPerMetre = Math.max(4, (widest.w || result.width) / targetWidth);
  plan.scale = pxPerMetre;
  const toM = (v) => v / pxPerMetre;

  result.segments.forEach((s, i) => {
    plan.walls.push({
      id: `w${i}`,
      x1: toM(s.x1), y1: toM(s.y1),
      x2: toM(s.x2), y2: toM(s.y2),
      t: Math.min(0.45, Math.max(0.07, toM(s.t))),
      level: s.section || 0,
    });
  });

  plan.sections = clusters.map((c, i) => ({
    id: `s${i}`,
    level: i,
    minX: toM(c.minX), minY: toM(c.minY),
    maxX: toM(c.maxX), maxY: toM(c.maxY),
  }));

  for (const found of result.doors) {
    const wall = plan.walls[found.segment];
    if (!wall) continue;
    const isWindow = found.type === 'window';
    plan.openings.push({
      id: uid('o'),
      wallId: wall.id,
      pos: toM((found.from + found.to) / 2),
      width: Math.min(4.0, Math.max(isWindow ? 0.4 : 0.65, toM(found.width))),
      height: isWindow ? 1.4 : 2.05,
      sill: isWindow ? 0.9 : 0,
      type: isWindow ? 'window' : 'door',
      hinge: 'start',
    });
  }

  const rooms = result.rooms
    .map((r) => ({ poly: r.poly.map(([x, y]) => [toM(x), toM(y)]) }))
    .filter(isRealRoom);

  nameRooms(rooms).forEach((room, i) => {
    const c = polygonCentroid(room.poly);
    plan.rooms.push({
      id: `r${i}`,
      name: room.name,
      poly: room.poly,
      floor: room.floor,
      level: levelAt(plan, c.x, c.y),
    });
  });

  // Staircases read as a ladder of parallel lines; place a real flight where
  // each one was found instead of leaving a stack of phantom walls.
  for (const flight of result.stairs || []) {
    const acrossPx = flight.dir === 'h' ? flight.maxX - flight.minX : flight.maxY - flight.minY;
    const runPx = flight.dir === 'h' ? flight.maxY - flight.minY : flight.maxX - flight.minX;
    const across = toM(acrossPx);
    const run = toM(runPx);
    if (across < 0.5 || run < 0.9) continue;
    const x = toM((flight.minX + flight.maxX) / 2);
    const y = toM((flight.minY + flight.maxY) / 2);
    plan.items.push({
      id: uid('f'),
      type: 'stairs',
      x, y,
      rot: flight.dir === 'h' ? 0 : Math.PI / 2,
      fit: { w: across, d: run },
      level: levelAt(plan, x, y),
    });
  }

  updateLevelOffsets(plan);
  return plan;
}

// The cavity inside a window wall, the gap between a double-drawn partition:
// these enclose an area but are not rooms. A real room is wide, not just big.
function isRealRoom(room) {
  const area = Math.abs(polygonArea(room.poly));
  if (area < 1.2) return false;
  let perimeter = 0;
  for (let i = 0; i < room.poly.length; i++) {
    const a = room.poly[i];
    const b = room.poly[(i + 1) % room.poly.length];
    perimeter += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  if (perimeter < 0.01) return false;
  // 2A/P is the inscribed half-width: ~0.05 m for a glazing cavity, ~0.45 m
  // for a narrow hallway.
  return (2 * area) / perimeter > 0.32;
}

// Shift each level so the drawings stack on top of each other instead of
// standing side by side the way they are drawn on the sheet.
function updateLevelOffsets(plan) {
  const byLevel = new Map();
  for (const sec of plan.sections || []) {
    if (sec.level == null) continue;
    const b = byLevel.get(sec.level) || { minX: Infinity, minY: Infinity };
    byLevel.set(sec.level, {
      minX: Math.min(b.minX, sec.minX),
      minY: Math.min(b.minY, sec.minY),
    });
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const base = levels.length ? byLevel.get(levels[0]) : null;
  plan.levelOffsets = {};
  for (const level of levels) {
    const b = byLevel.get(level);
    plan.levelOffsets[level] = base
      ? { dx: base.minX - b.minX, dy: base.minY - b.minY }
      : { dx: 0, dy: 0 };
  }
}

// A first guess at what each room is, from size and shape. Deliberately
// cautious: a wrong confident label is worse than a neutral one, so only the
// shapes that are genuinely characteristic get a real name.
function nameRooms(rooms) {
  const scored = rooms.map((r) => {
    const area = Math.abs(polygonArea(r.poly));
    const b = polygonBounds(r.poly);
    const aspect = Math.max(b.w, b.h) / Math.max(0.1, Math.min(b.w, b.h));
    return { ...r, area, aspect };
  }).sort((a, b) => b.area - a.area);

  let plain = 0;
  return scored.map((r, i) => {
    let name;
    if (r.area < 2.2) name = 'Closet';
    else if (r.aspect > 3) name = 'Hallway';
    else if (i === 0 && r.area > 12) name = 'Living room';
    else if (r.area <= 6 && r.aspect < 2) name = 'Bathroom';
    else name = `Room ${++plain}`;

    const floor = /bath|hall|closet/i.test(name) ? 'tile' : 'oak';
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
    // the listed types are the ones auto-furnishing recognises
    name.setAttribute('list', 'room-types');
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

// One row per drawing found on the sheet, so two floors on one page can be
// stacked instead of standing side by side.
function renderLevels() {
  const panel = $('#levels-panel');
  const list = $('#level-list');
  const sections = state.plan.sections || [];
  panel.hidden = sections.length < 2;
  if (panel.hidden) {
    $('#walk-level-row').hidden = true;
    return;
  }

  list.innerHTML = '';
  sections.forEach((sec, i) => {
    const row = document.createElement('div');
    row.className = 'level-row';

    const label = document.createElement('span');
    label.className = 'level-name';
    label.textContent = `Drawing ${i + 1}`;

    const size = document.createElement('span');
    size.className = 'area';
    size.textContent = `${(sec.maxX - sec.minX).toFixed(1)} × ${(sec.maxY - sec.minY).toFixed(1)} m`;

    const select = document.createElement('select');
    select.setAttribute('aria-label', `Level for drawing ${i + 1}`);
    for (const [value, text] of [['0', 'Ground floor'], ['1', 'Upper floor'], ['2', 'Second floor'], ['', 'Not part of the flat']]) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      select.appendChild(opt);
    }
    select.value = sec.level == null ? '' : String(sec.level);
    select.addEventListener('change', () => {
      sec.level = select.value === '' ? null : parseInt(select.value, 10);
      reassignLevels();
    });

    row.append(label, select, size);
    list.appendChild(row);
  });

  const walkRow = $('#walk-level-row');
  const walkSelect = $('#walk-level');
  const levels = [...new Set(sections.filter((s2) => s2.level != null).map((s2) => s2.level))]
    .sort((a, b) => a - b);
  walkRow.hidden = levels.length < 2;
  if (!walkRow.hidden) {
    walkSelect.innerHTML = '';
    for (const level of levels) {
      const opt = document.createElement('option');
      opt.value = String(level);
      opt.textContent = ['Ground floor', 'Upper floor', 'Second floor'][level] || `Level ${level + 1}`;
      walkSelect.appendChild(opt);
    }
    walkSelect.value = String(viewer.walkLevel ?? levels[0]);
  }
}

// Re-stamp every wall, room and item with the level of the drawing it sits in.
function reassignLevels() {
  const p = state.plan;
  const hidden = new Set((p.sections || []).filter((s2) => s2.level == null).map((s2) => s2.id));
  const levelFor = (x, y) => {
    for (const sec of p.sections || []) {
      if (x >= sec.minX && x <= sec.maxX && y >= sec.minY && y <= sec.maxY) {
        return hidden.has(sec.id) ? null : sec.level;
      }
    }
    return 0;
  };
  const keep = (list, at) => list.filter((el) => {
    const level = levelFor(...at(el));
    if (level == null) return false;
    el.level = level;
    return true;
  });

  p.walls = keep(p.walls, (w) => [(w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2]);
  const alive = new Set(p.walls.map((w) => w.id));
  p.openings = p.openings.filter((o) => alive.has(o.wallId));
  p.rooms = keep(p.rooms, (r) => { const c = polygonCentroid(r.poly); return [c.x, c.y]; });
  p.items = keep(p.items, (it) => [it.x, it.y]);

  updateLevelOffsets(p);
  editor.emit();
}

// Whatever is selected — in the plan or by clicking it in 3D — gets an
// editable panel here, so "change this wall" doesn't depend on knowing a
// drag gesture exists.
function renderSelection() {
  const box = $('#selection-body');
  const sel = editor.selection;
  box.innerHTML = '';

  if (!sel) {
    box.innerHTML = '<p class="empty">Click anything in the plan or in the 3D view to edit it. ' +
      'Drag a wall to move it, drag its round end handles to resize it, ' +
      '<kbd>Shift</kbd>-click or sweep a box to select several, and press ' +
      '<kbd>Delete</kbd> to remove what is selected. In the 3D view, drag furniture ' +
      'to move it, <kbd>Shift</kbd>-drag to turn it and <kbd>Alt</kbd>-drag to resize it.</p>';
    return;
  }

  if (editor.selected.length > 1) {
    const counts = new Map();
    for (const s of editor.selected) counts.set(s.kind, (counts.get(s.kind) || 0) + 1);
    const parts = [...counts.entries()].map(([kind, n]) => `${n} ${kind}${n > 1 ? 's' : ''}`);
    const head = document.createElement('div');
    head.className = 'selection-head';
    head.textContent = `${editor.selected.length} selected`;
    const detail = document.createElement('p');
    detail.className = 'empty';
    detail.textContent = `${parts.join(', ')}. Shift-click to add or remove one.`;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'wide danger';
    del.textContent = `Delete all ${editor.selected.length}`;
    del.addEventListener('click', () => {
      editor.deleteSelection();
      viewer.setHighlight(null);
      renderSelection();
    });
    box.append(head, detail, del);
    return;
  }

  const field = (labelText, control) => {
    const row = document.createElement('label');
    row.className = 'field';
    const span = document.createElement('span');
    span.textContent = labelText;
    row.append(span, control);
    box.appendChild(row);
    return control;
  };

  const number = (value, { min, max, step }, onChange) => {
    const wrap = document.createElement('span');
    wrap.className = 'with-unit';
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value.toFixed(2);
    input.min = min; input.max = max; input.step = step;
    input.addEventListener('change', () => {
      const v = parseFloat(input.value);
      if (isFinite(v)) { onChange(clamp(v, min, max)); editor.emit(); }
    });
    const unit = document.createElement('em');
    unit.textContent = 'm';
    wrap.append(input, unit);
    return wrap;
  };

  const readout = (text) => {
    const span = document.createElement('span');
    span.className = 'readout';
    span.textContent = text;
    return span;
  };

  const heading = document.createElement('div');
  heading.className = 'selection-head';
  box.appendChild(heading);

  if (sel.kind === 'wall') {
    const wall = state.plan.walls.find((w) => w.id === sel.id);
    if (!wall) return;
    heading.textContent = 'Wall';
    field('Length', readout(`${Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1).toFixed(2)} m`));
    field('Thickness', number(wall.t, { min: 0.05, max: 0.6, step: 0.01 }, (v) => { wall.t = v; }));
    const openings = state.plan.openings.filter((o) => o.wallId === wall.id).length;
    field('Openings', readout(openings ? `${openings} in this wall` : 'none'));
  } else if (sel.kind === 'opening') {
    const op = state.plan.openings.find((o) => o.id === sel.id);
    if (!op) return;
    heading.textContent = op.type === 'door' ? 'Door' : 'Window';
    field('Width', number(op.width, { min: 0.4, max: 4, step: 0.05 }, (v) => { op.width = v; }));
    field('Height', number(op.height, { min: 0.4, max: 3, step: 0.05 }, (v) => { op.height = v; }));
    if (op.type === 'window') {
      field('Sill height', number(op.sill ?? 0.9, { min: 0, max: 2, step: 0.05 }, (v) => { op.sill = v; }));
    }
    const swap = document.createElement('button');
    swap.type = 'button';
    swap.textContent = op.type === 'door' ? 'Make it a window' : 'Make it a door';
    swap.addEventListener('click', () => {
      op.type = op.type === 'door' ? 'window' : 'door';
      op.sill = op.type === 'window' ? 0.9 : 0;
      op.height = op.type === 'window' ? 1.3 : 2.05;
      editor.emit();
    });
    const flip = document.createElement('button');
    flip.type = 'button';
    flip.textContent = 'Flip hinge';
    flip.disabled = op.type !== 'door';
    flip.addEventListener('click', () => {
      op.hinge = op.hinge === 'end' ? 'start' : 'end';
      editor.emit();
    });
    const row = document.createElement('div');
    row.className = 'row';
    row.append(swap, flip);
    box.appendChild(row);
  } else if (sel.kind === 'room') {
    const room = state.plan.rooms.find((r) => r.id === sel.id);
    if (!room) return;
    heading.textContent = 'Room';
    field('Area', readout(`${Math.abs(polygonArea(room.poly)).toFixed(1)} m²`));
    const name = document.createElement('input');
    name.type = 'text';
    name.value = room.name || '';
    name.addEventListener('change', () => { room.name = name.value; editor.emit(); });
    field('Name', name);
  } else if (sel.kind === 'item') {
    const item = state.plan.items.find((i) => i.id === sel.id);
    if (!item) return;
    const spec = furniture.spec(item.type);
    heading.textContent = spec ? spec.label : 'Furniture';
    const fp = furniture.footprint(item);
    if (fp) field('Footprint', readout(`${fp.w.toFixed(2)} × ${fp.d.toFixed(2)} m`));
    const rot = document.createElement('input');
    rot.type = 'range';
    rot.min = 0; rot.max = 360; rot.step = 5;
    rot.value = Math.round((((item.rot || 0) * 180) / Math.PI + 360) % 360);
    rot.addEventListener('input', () => {
      item.rot = (parseFloat(rot.value) * Math.PI) / 180;
      editor.draw();
    });
    rot.addEventListener('change', () => editor.emit());
    field('Rotation', rot);

    const size = document.createElement('input');
    size.type = 'range';
    size.min = 0.4; size.max = 2.5; size.step = 0.05;
    size.value = item.scale || 1;
    size.addEventListener('input', () => { item.scale = parseFloat(size.value); editor.draw(); });
    size.addEventListener('change', () => editor.emit());
    if (!item.fit) field('Size', size);

    if (spec && spec.fabric) {
      box.appendChild(swatches('Fabric', furniture.FABRICS, item.fabric || 'sand', (key) => {
        item.fabric = key;
        editor.emit();
      }));
    }
    box.appendChild(swatches('Wood', furniture.WOODS.map((wo) => ({
      ...wo, hex: wo.hex !== undefined ? wo.hex : { oak: 0xc08a52, walnut: 0x6b4429, ash: 0xd7c3a5 }[wo.key],
    })), item.wood || 'oak', (key) => {
      item.wood = key;
      editor.emit();
    }));
  }

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'wide danger';
  del.textContent = `Delete ${sel.kind}`;
  del.addEventListener('click', () => {
    editor.deleteSelection();
    viewer.setHighlight(null);
    renderSelection();
  });
  box.appendChild(del);
}

// -------------------------------------------------------------- persistence

let autosaveTimer = null;
function scheduleAutosave() {
  if (!storage.available()) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (!state.plan.walls.length && !state.plan.rooms.length) return;
    const ok = storage.writeAuto(state.plan, state.packedImage);
    const stamp = $('#autosave-stamp');
    if (stamp) {
      stamp.textContent = ok
        ? `Saved in this browser at ${new Date().toLocaleTimeString()}`
        : 'This browser refused to store the plan — use Save plan to download it.';
    }
  }, 900);
}

async function restoreSnapshot(snap, { announce = true } = {}) {
  state.plan = { ...emptyPlan(), ...snap.plan };
  state.packedImage = snap.image || null;
  const img = await storage.unpackImage(snap.image);
  state.image = img;
  editor.setPlan(state.plan);
  editor.setImage(img);
  editor.fit();
  $('#wall-height').value = state.plan.wallHeight;
  $('#wall-material').value = state.plan.wallMaterial || 'wall';
  if (img) {
    $('#drop-zone').classList.add('has-image');
    $('#image-name').textContent = snap.name || 'restored plan';
  }
  rebuild3D();
  renderRoomList();
  renderStats();
  renderSelection();
  if (announce) toast(`Restored “${snap.name || 'Apartment'}”`);
}

function renderProjects() {
  const list = $('#project-list');
  const note = $('#storage-note');
  if (!storage.available()) {
    list.innerHTML = '';
    note.textContent = 'This browser blocks local storage, so nothing is kept here. Use Save plan to download the file.';
    return;
  }
  const saved = storage.list();
  note.textContent = saved.length
    ? `${saved.length} saved here · ${(storage.usage() / 1024).toFixed(0)} KB used`
    : 'Nothing saved in this browser yet.';

  list.innerHTML = '';
  for (const entry of saved) {
    const row = document.createElement('div');
    row.className = 'project-row';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'project-open';
    open.innerHTML = `<strong></strong><span></span>`;
    open.querySelector('strong').textContent = entry.name;
    open.querySelector('span').textContent =
      `${entry.rooms} rooms · ${new Date(entry.savedAt).toLocaleDateString()}`;
    open.addEventListener('click', async () => {
      const snap = storage.load(entry.id);
      if (snap) await restoreSnapshot(snap);
      else toast('That project could not be read back');
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'project-delete';
    del.title = `Delete ${entry.name}`;
    del.textContent = '×';
    del.addEventListener('click', () => {
      storage.remove(entry.id);
      renderProjects();
      toast(`Deleted “${entry.name}”`);
    });

    row.append(open, del);
    list.appendChild(row);
  }
}

// A row of colour chips; the chosen one is ringed.
function swatches(title, options, current, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'swatches';
  const label = document.createElement('span');
  label.className = 'swatch-label';
  label.textContent = title;
  wrap.appendChild(label);
  const row = document.createElement('div');
  row.className = 'swatch-row';
  for (const opt of options) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `swatch${opt.key === current ? ' active' : ''}`;
    chip.style.background = `#${(opt.hex ?? 0xcccccc).toString(16).padStart(6, '0')}`;
    chip.title = opt.label;
    chip.setAttribute('aria-label', `${title}: ${opt.label}`);
    chip.addEventListener('click', () => onPick(opt.key));
    row.appendChild(chip);
  }
  wrap.appendChild(row);
  return wrap;
}

function renderStats() {
  const p = state.plan;
  const area = (p.rooms || []).reduce((s, r) => s + Math.abs(polygonArea(r.poly)), 0);
  $('#stats').textContent =
    `${p.walls.length} walls · ${p.openings.length} openings · ${p.rooms.length} rooms · ${area.toFixed(1)} m² floor area`;
}

function renderPalette(filter = '') {
  const wrap = $('#furniture-palette');
  wrap.innerHTML = '';
  const needle = filter.trim().toLowerCase();
  const groups = new Map();
  for (const item of furniture.catalog()) {
    if (needle && !item.label.toLowerCase().includes(needle) &&
        !(furniture.ROOM_LABELS[item.room] || '').toLowerCase().includes(needle)) continue;
    if (!groups.has(item.room)) groups.set(item.room, []);
    groups.get(item.room).push(item);
  }
  if (!groups.size) {
    wrap.innerHTML = '<p class="empty">Nothing matches that.</p>';
    return;
  }
  for (const room of furniture.ROOM_ORDER) {
    const items = groups.get(room);
    if (!items) continue;
    const h = document.createElement('h4');
    h.textContent = furniture.ROOM_LABELS[room] || room;
    wrap.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'palette-grid';
    for (const item of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = item.label;
      b.title = `${item.w.toFixed(2)} × ${item.d.toFixed(2)} m${item.mountY ? ' · wall mounted' : ''}`;
      b.classList.toggle('active', item.key === editor.itemType);
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
  // stay in whatever view the user chose; picking a tool is not a request to
  // move somewhere else
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

// Saving a file works two ways: a plain anchor when the tool is served from
// its own page, and the host's save prompt when it runs inside a viewer that
// blocks page-initiated downloads.
async function download(blob, filename) {
  const host = window.claude && typeof window.claude.use === 'function'
    ? await window.claude.use('downloads').catch(() => null)
    : null;

  if (!host) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  try {
    await host.save({ filename, data: blob });
    toast(`Saved ${filename}`);
  } catch (err) {
    const code = err && err.code;
    if (code === 'declined') return;
    if (code === 'rejected_extension' || code === 'extension_not_enabled') {
      toast(`This viewer cannot save ${filename.split('.').pop().toUpperCase()} files. Run the tool from the repository to export it.`);
      return;
    }
    if (code === 'too_large') {
      toast('That file is too large for the viewer to save (16 MB limit).');
      return;
    }
    toast(`Could not save the file: ${(err && err.message) || code || 'unknown error'}`);
  }
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
    if (state.plan.items.length) {
      toast(`Placed ${state.plan.items.length} pieces from the room names`);
    } else {
      toast('No room names matched a kit. Name a room Living room, Kitchen, Bedroom, Bathroom, Dining room or Office.');
    }
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
  $('#isolate-level').addEventListener('change', (e) => {
    const level = e.target.checked ? parseInt($('#walk-level').value, 10) : null;
    viewer.setVisibleLevel(Number.isFinite(level) ? level : null);
    viewer.frameAll();
  });
  $('#walk-level').addEventListener('change', (e) => {
    const level = parseInt(e.target.value, 10);
    const room = [...(state.plan.rooms || [])]
      .filter((r) => (r.level || 0) === level)
      .sort((a, b) => Math.abs(polygonArea(b.poly)) - Math.abs(polygonArea(a.poly)))[0];
    if (room) viewer.setSpawn(...standingSpot(room.poly), level);
    viewer.setWalkLevel(level);
    if ($('#isolate-level').checked) {
      viewer.setVisibleLevel(level);
      viewer.frameAll();
    }
  });

  // file actions
  $('#palette-search').addEventListener('input', (e) => renderPalette(e.target.value));

  $('#btn-project-save').addEventListener('click', () => {
    const name = ($('#project-name').value || '').trim() || state.plan.name || 'Apartment';
    state.plan.name = name;
    const result = storage.save(name, state.plan, state.packedImage);
    if (result.ok) {
      $('#project-name').value = '';
      renderProjects();
      toast(`Saved “${name}” in this browser`);
    } else {
      toast(result.error);
    }
  });

  $('#toggle-minimap').addEventListener('change', (e) => {
    state.showMinimap = e.target.checked;
    $('#minimap').hidden = !state.showMinimap || viewer.mode !== 'walk';
    if (state.showMinimap) minimap.resize();
  });

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
      // both a bare plan and a full snapshot (plan + image) are accepted
      const snap = parsed.format === 'apartment3d/1' ? parsed : { plan: parsed, name: parsed.name };
      await restoreSnapshot(snap, { announce: false });
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
  $('#btn-shot').addEventListener('click', async () => {
    const blob = await viewer.screenshotBlob();
    if (blob) download(blob, 'apartment.png');
    else toast('Could not capture the view');
  });

  window.addEventListener('keydown', (e) => {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    const map = { v: 'select', w: 'wall', d: 'door', n: 'window', b: 'room', f: 'item', e: 'erase', h: 'pan' };
    if (map[e.key]) { setTool(map[e.key]); e.preventDefault(); }
    if (e.key === 'm') $('#toggle-minimap').click();
    if (e.key === '1') setView('plan');
    if (e.key === '2') setView('split');
    if (e.key === '3') setView('3d');
  });
}

state.showMinimap = true;

renderPalette();
bindUI();
renderSelection();
renderProjects();
setView('split');
setTool('select');
renderStats();

// Pick up where the last visit left off.
(async () => {
  const auto = storage.readAuto();
  if (auto && auto.plan && (auto.plan.walls || []).length) {
    await restoreSnapshot(auto, { announce: false });
    toast('Picked up your last plan from this browser');
  }
})();

// expose for the smoke test
window.__apartment = { state, editor, viewer, loadImage, runDetection, rebuild3D };
