// Floor-plan tracer: turns a raster floor plan into wall segments, doorways
// and room polygons.
//
// Pipeline
//   1. downscale + greyscale + Otsu threshold  -> ink mask
//   2. run-length filtering                    -> long strokes only (drops text)
//   3. band grouping                           -> axis-aligned wall segments
//   4. snapping / collinear merge              -> clean segments, gaps become doors
//   5. raster of merged walls + flood fill     -> room regions
//   6. contour trace + simplify                -> room polygons
//
// Everything here works in pixel space; app.js converts to metres via the scale.

import { simplify, rectilinearize, polygonArea, dedupe } from './geom.js';

export const DEFAULT_OPTIONS = {
  maxSize: 1200,        // longest edge after downscale
  threshold: 0,         // 0 = auto (Otsu), otherwise 1..254
  minRun: 10,           // px: a stroke must be this long to be looked at
  minWallThickness: 5,  // px: anything thinner than this is not a wall
  minWallLength: 26,    // px: drop wall segments shorter than this
  maxWallThickness: 40, // px: bands thicker than this are hatching/solids
  snap: 9,              // px: endpoint + collinear snapping radius
  maxDoorGap: 90,       // px: collinear gap bridged as a doorway
  minRoomArea: 900,     // px^2: ignore closets smaller than this
};

// ---------------------------------------------------------------- raster prep

export function imageToMask(image, opts) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const scale = Math.min(1, o.maxSize / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const grey = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3] / 255;
    // composite over white so transparent PNGs read as background
    const r = data[i] * a + 255 * (1 - a);
    const g = data[i + 1] * a + 255 * (1 - a);
    const b = data[i + 2] * a + 255 * (1 - a);
    grey[p] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }

  const threshold = o.threshold > 0 ? o.threshold : otsu(grey);
  let ink = new Uint8Array(w * h);
  let inkCount = 0;
  for (let i = 0; i < grey.length; i++) {
    // Otsu returns the last level of the dark class, so the test has to
    // include it: on a pure two-tone plan the threshold lands exactly on the
    // ink value, and a strict `<` would find no ink at all.
    if (grey[i] <= threshold) { ink[i] = 1; inkCount++; }
  }
  // Inverted plans (white lines on dark paper): flip so ink is the minority.
  let inverted = false;
  if (inkCount > grey.length * 0.5) {
    inverted = true;
    for (let i = 0; i < ink.length; i++) ink[i] = ink[i] ? 0 : 1;
  }

  return { width: w, height: h, ink, grey, threshold, inverted, scale };
}

function otsu(grey) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < grey.length; i++) hist[grey[i]]++;
  const total = grey.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
}

// ------------------------------------------------------------ thickness map

// Chamfer distance transform: every ink pixel gets its distance to the nearest
// background pixel. On a floor plan that distance IS half the local stroke
// thickness, which is the one measurement that separates a wall from
// everything else drawn on the page.
function distanceTransform(ink, width, height) {
  const INF = 1e9;
  const d = new Float32Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = ink[i] ? INF : 0;
  const DIAG = Math.SQRT2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) v = Math.min(v, d[i - width] + 1);
      if (x > 0 && y > 0) v = Math.min(v, d[i - width - 1] + DIAG);
      if (x < width - 1 && y > 0) v = Math.min(v, d[i - width + 1] + DIAG);
      d[i] = v;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x < width - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < height - 1) v = Math.min(v, d[i + width] + 1);
      if (x < width - 1 && y < height - 1) v = Math.min(v, d[i + width + 1] + DIAG);
      if (x > 0 && y < height - 1) v = Math.min(v, d[i + width - 1] + DIAG);
      d[i] = v;
    }
  }
  return d;
}

// Ink thick enough to be structural. Text, dimension lines, hatching, door
// swings, furniture outlines and room-fill borders all fail this test, which
// is why they stop turning into walls.
function thickInk(dist, ink, minThickness) {
  const half = minThickness / 2;
  const core = new Uint8Array(ink.length);
  for (let i = 0; i < ink.length; i++) core[i] = dist[i] >= half ? 1 : 0;
  return core;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// -------------------------------------------------------------- wall segments

// Collect horizontal runs of ink per row (or per column when transposed).
function runsAlong(mask, width, height, horizontal, minRun) {
  const rows = horizontal ? height : width;
  const cols = horizontal ? width : height;
  const out = [];
  for (let r = 0; r < rows; r++) {
    let start = -1;
    for (let c = 0; c <= cols; c++) {
      const on = c < cols && mask[horizontal ? r * width + c : c * width + r] === 1;
      if (on && start < 0) start = c;
      else if (!on && start >= 0) {
        if (c - start >= minRun) out.push({ r, a: start, b: c - 1 });
        start = -1;
      }
    }
  }
  return out;
}

// Group runs on adjacent rows that overlap into thick bands.
function groupBands(runs, maxThickness) {
  const byRow = new Map();
  for (const run of runs) {
    if (!byRow.has(run.r)) byRow.set(run.r, []);
    byRow.get(run.r).push(run);
  }
  const rowsSorted = [...byRow.keys()].sort((x, y) => x - y);
  const bands = [];
  let open = [];

  for (const r of rowsSorted) {
    const next = [];
    for (const run of byRow.get(r)) {
      let merged = null;
      for (const band of open) {
        if (band.lastRow !== r - 1 && band.lastRow !== r) continue;
        const overlap = Math.min(band.b, run.b) - Math.max(band.a, run.a) + 1;
        const bandLen = band.b - band.a + 1;
        const runLen = run.b - run.a + 1;
        // Compare against the LONGER run: a wall crossing this one contributes
        // a short run that overlaps fully, and must not be absorbed here --
        // otherwise one band swallows the whole drawing row by row.
        if (overlap > 0.6 * Math.max(bandLen, runLen)) { merged = band; break; }
      }
      if (merged && merged.r1 - merged.r0 + 1 < maxThickness) {
        merged.a = Math.min(merged.a, run.a);
        merged.b = Math.max(merged.b, run.b);
        merged.r1 = r;
        merged.lastRow = r;
        if (!next.includes(merged)) next.push(merged);
      } else {
        const band = { a: run.a, b: run.b, r0: r, r1: r, lastRow: r };
        bands.push(band);
        next.push(band);
      }
    }
    open = next;
  }
  return bands;
}

function bandsToSegments(bands, horizontal, opts, dist, width, height) {
  const segs = [];
  for (const band of bands) {
    const spread = band.r1 - band.r0 + 1;
    const length = band.b - band.a + 1;
    if (length < opts.minWallLength) continue;
    if (spread > opts.maxWallThickness) continue;
    if (spread > length * 0.9) continue; // blob, not a stroke
    const centre = (band.r0 + band.r1) / 2;

    // Thickness comes from the distance map along the band's centre line, not
    // from how tall the band is. At a T or a corner the band swells where the
    // other wall meets it; the median ignores that, so a junction no longer
    // invents a wall three times too thick.
    const samples = [];
    const step = Math.max(1, Math.floor(length / 40));
    const row = Math.round(centre);
    for (let s = band.a; s <= band.b; s += step) {
      const x = horizontal ? s : row;
      const y = horizontal ? row : s;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const value = dist[y * width + x];
      if (value > 0) samples.push(value);
    }
    const thickness = samples.length ? median(samples) * 2 : spread;
    if (thickness > opts.maxWallThickness) continue;

    segs.push(horizontal
      ? { x1: band.a, y1: centre, x2: band.b, y2: centre, t: thickness, dir: 'h' }
      : { x1: centre, y1: band.a, x2: centre, y2: band.b, t: thickness, dir: 'v' });
  }
  return segs;
}

// A staircase is drawn as a ladder: several short parallel lines of similar
// length, evenly spaced about a tread apart. Those are treads, not walls, so
// pull them out before anything else looks at them.
function findStairs(segs, opts) {
  const axisOf = (s) => (s.dir === 'h' ? s.y1 : s.x1);
  const startOf = (s) => (s.dir === 'h' ? s.x1 : s.y1);
  const endOf = (s) => (s.dir === 'h' ? s.x2 : s.y2);
  const lengthOf = (s) => endOf(s) - startOf(s);

  const flights = [];
  const claimed = new Set();

  for (const dir of ['h', 'v']) {
    const list = segs
      .map((s, i) => ({ s, i }))
      .filter((e) => e.s.dir === dir)
      .sort((a, b) => axisOf(a.s) - axisOf(b.s));

    let i = 0;
    while (i < list.length) {
      const run = [list[i]];
      let pitch = 0;
      let j = i + 1;

      while (j < list.length) {
        const prev = run[run.length - 1].s;
        const next = list[j].s;
        const gap = axisOf(next) - axisOf(prev);
        // treads sit closer together than rooms do, and further apart than
        // the two faces of one wall
        if (gap < 5 || gap > opts.maxWallThickness * 1.4) break;
        if (pitch && Math.abs(gap - pitch) > pitch * 0.45) break;
        // and they are the same length, side by side
        const overlap = Math.min(endOf(prev), endOf(next)) - Math.max(startOf(prev), startOf(next));
        const shorter = Math.min(lengthOf(prev), lengthOf(next));
        if (overlap < shorter * 0.55) break;
        if (Math.abs(lengthOf(next) - lengthOf(prev)) > shorter * 0.5) break;
        if (!pitch) pitch = gap;
        run.push(list[j]);
        j++;
      }

      if (run.length >= 4) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const e of run) {
          claimed.add(e.i);
          minX = Math.min(minX, e.s.x1, e.s.x2);
          maxX = Math.max(maxX, e.s.x1, e.s.x2);
          minY = Math.min(minY, e.s.y1, e.s.y2);
          maxY = Math.max(maxY, e.s.y1, e.s.y2);
        }
        flights.push({ dir, minX, minY, maxX, maxY, treads: run.length, pitch });
        i = j;
      } else {
        i++;
      }
    }
  }

  // The stringers drawn down the sides of a flight sit inside its outline;
  // they belong to the staircase, not to the walls.
  const pad = 4;
  segs.forEach((seg, i) => {
    if (claimed.has(i)) return;
    for (const f of flights) {
      const inside =
        Math.min(seg.x1, seg.x2) >= f.minX - pad && Math.max(seg.x1, seg.x2) <= f.maxX + pad &&
        Math.min(seg.y1, seg.y2) >= f.minY - pad && Math.max(seg.y1, seg.y2) <= f.maxY + pad;
      if (inside) { claimed.add(i); return; }
    }
  });

  return { flights, rest: segs.filter((_, i) => !claimed.has(i)) };
}

// Plans draw a wall's two faces as thin parallel lines, and draw a window as
// that same pair crossing an opening in the wall. Either way it is ONE wall,
// not two: fold each such pair into a single segment of the right thickness.
// A folded pair is flagged `glazed` — if it later merges with solid wall on
// either side, that stretch was a window symbol.
function absorbParallelPairs(segs, opts) {
  const taken = new Set();
  const out = [];

  const axisOf = (s) => (s.dir === 'h' ? s.y1 : s.x1);
  const startOf = (s) => (s.dir === 'h' ? s.x1 : s.y1);
  const endOf = (s) => (s.dir === 'h' ? s.x2 : s.y2);

  for (let i = 0; i < segs.length; i++) {
    if (taken.has(i)) continue;
    const a = segs[i];
    let best = -1;
    let bestSep = Infinity;

    for (let j = i + 1; j < segs.length; j++) {
      if (taken.has(j) || segs[j].dir !== a.dir) continue;
      const b = segs[j];
      const sep = Math.abs(axisOf(a) - axisOf(b));
      if (sep < 3 || sep > opts.maxWallThickness) continue;
      // there must be a cavity between them; two solid walls standing close
      // together are two walls and must stay that way
      if (a.t + b.t > sep * 0.9) continue;
      const overlap = Math.min(endOf(a), endOf(b)) - Math.max(startOf(a), startOf(b));
      const shorter = Math.min(endOf(a) - startOf(a), endOf(b) - startOf(b));
      if (overlap < 0.6 * shorter) continue;
      if (sep < bestSep) { bestSep = sep; best = j; }
    }

    if (best < 0) { out.push(a); continue; }
    const b = segs[best];
    taken.add(i);
    taken.add(best);

    const axis = (axisOf(a) + axisOf(b)) / 2;
    const lo = Math.min(startOf(a), startOf(b));
    const hi = Math.max(endOf(a), endOf(b));
    const t = bestSep + (a.t + b.t) / 2;
    out.push(a.dir === 'h'
      ? { x1: lo, y1: axis, x2: hi, y2: axis, t, dir: 'h', glazed: true }
      : { x1: axis, y1: lo, x2: axis, y2: hi, t, dir: 'v', glazed: true });
  }
  return out;
}

function unionIntervals(list) {
  const sorted = list.filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

// The parts of `spans` that `holes` does not cover.
function subtractIntervals(spans, holes) {
  const out = [];
  for (const [a, b] of spans) {
    let cursor = a;
    for (const [hs, he] of holes) {
      if (he <= cursor || hs >= b) continue;
      if (hs > cursor) out.push([cursor, Math.min(hs, b)]);
      cursor = Math.max(cursor, he);
      if (cursor >= b) break;
    }
    if (cursor < b) out.push([cursor, b]);
  }
  return out;
}

// Merge segments that sit on the same line. Gaps narrower than maxDoorGap are
// bridged and reported as doorways; a glazed stretch between solid wall is
// reported as a window.
function mergeCollinear(segs, opts) {
  const out = [];
  const openings = [];
  const groups = new Map();

  for (const s of segs) {
    const axis = s.dir === 'h' ? s.y1 : s.x1;
    const key = `${s.dir}:${Math.round(axis / opts.snap)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  for (const group of groups.values()) {
    const horizontal = group[0].dir === 'h';
    group.sort((a, b) => (horizontal ? a.x1 - b.x1 : a.y1 - b.y1));
    let cur = null;

    const open = (s, a, b) => ({
      a, b,
      axis: (horizontal ? s.y1 : s.x1) * (b - a),
      weight: b - a,
      t: s.t,
      holes: [],
      pieces: [{ a, b, t: s.t, glazed: !!s.glazed }],
    });

    for (const s of group) {
      const a = horizontal ? s.x1 : s.y1;
      const b = horizontal ? s.x2 : s.y2;
      const axis = horizontal ? s.y1 : s.x1;
      if (!cur) { cur = open(s, a, b); continue; }

      const gap = a - cur.b;
      if (gap <= opts.maxDoorGap) {
        if (gap > opts.snap) cur.holes.push([cur.b, a]);
        cur.b = Math.max(cur.b, b);
        cur.axis += axis * (b - a);
        cur.weight += b - a;
        // a glazed piece is thinner than the wall it sits in; keep the wall's
        // thickness, not the window's
        cur.t = Math.max(cur.t, s.t);
        cur.pieces.push({ a, b, t: s.t, glazed: !!s.glazed });
      } else {
        flush(cur);
        cur = open(s, a, b);
      }
    }
    if (cur) flush(cur);

    function flush(c) {
      const axis = c.axis / (c.weight || 1);
      const solids = c.pieces.filter((p) => !p.glazed);
      // the folded outline pair measures a hair wider than the wall it sits
      // in, so take the thickness from the solid stretches when there are any
      const t = solids.length
        ? Math.max(...solids.map((p) => p.t))
        : Math.max(...c.pieces.map((p) => p.t));
      const seg = horizontal
        ? { x1: c.a, y1: axis, x2: c.b, y2: axis, t, dir: 'h' }
        : { x1: axis, y1: c.a, x2: axis, y2: c.b, t, dir: 'v' };
      const index = out.push(seg) - 1;

      // A wall drawn entirely as an outline pair is just a wall, not a window.
      let windows = [];
      if (solids.length) {
        // The wall's own two faces are drawn straight past a window symbol, so
        // the glazed run covers the whole wall. The window is the part of it
        // that no solid stretch covers.
        const glazed = unionIntervals(c.pieces.filter((p) => p.glazed).map((p) => [p.a, p.b]));
        const solid = unionIntervals(solids.map((p) => [p.a, p.b]));
        windows = subtractIntervals(glazed, solid)
          .filter(([s, e]) => e - s >= opts.minWallLength * 0.6);
      }

      for (const [s, e] of c.holes) {
        // a gap that a window already explains is not also a doorway
        if (windows.some(([ws, we]) => Math.min(e, we) - Math.max(s, ws) > (e - s) * 0.5)) continue;
        openings.push({ segment: index, from: s - c.a, to: e - c.a, width: e - s, type: 'door' });
      }
      for (const [s, e] of windows) {
        openings.push({ segment: index, from: s - c.a, to: e - c.a, width: e - s, type: 'window' });
      }
    }
  }
  return { segments: out, openings };
}

// Pull nearly-equal coordinates onto shared values so corners actually meet.
function snapCoordinates(segs, snap) {
  const xs = [], ys = [];
  for (const s of segs) { xs.push(s.x1, s.x2); ys.push(s.y1, s.y2); }
  const mapX = clusterMap(xs, snap);
  const mapY = clusterMap(ys, snap);
  for (const s of segs) {
    s.x1 = mapX(s.x1); s.x2 = mapX(s.x2);
    s.y1 = mapY(s.y1); s.y2 = mapY(s.y2);
  }
  return segs;
}

function clusterMap(values, snap) {
  const sorted = [...values].sort((a, b) => a - b);
  const centres = [];
  let group = [];
  for (const v of sorted) {
    if (group.length && v - group[group.length - 1] > snap) {
      centres.push(group.reduce((s, x) => s + x, 0) / group.length);
      group = [];
    }
    group.push(v);
  }
  if (group.length) centres.push(group.reduce((s, x) => s + x, 0) / group.length);
  return (v) => {
    let best = v, bestD = Infinity;
    for (const c of centres) {
      const d = Math.abs(c - v);
      if (d < bestD) { bestD = d; best = c; }
    }
    return bestD <= snap ? best : v;
  };
}

// Stretch segment ends to meet a crossing wall, closing pixel-sized corner gaps.
function extendToJunctions(segs, snap) {
  const hs = segs.filter((s) => s.dir === 'h');
  const vs = segs.filter((s) => s.dir === 'v');
  for (const h of hs) {
    for (const v of vs) {
      const withinY = v.y1 - snap <= h.y1 && h.y1 <= v.y2 + snap;
      if (!withinY) continue;
      if (Math.abs(h.x1 - v.x1) <= snap) h.x1 = v.x1;
      if (Math.abs(h.x2 - v.x1) <= snap) h.x2 = v.x1;
    }
  }
  for (const v of vs) {
    for (const h of hs) {
      const withinX = h.x1 - snap <= v.x1 && v.x1 <= h.x2 + snap;
      if (!withinX) continue;
      if (Math.abs(v.y1 - h.y1) <= snap) v.y1 = h.y1;
      if (Math.abs(v.y2 - h.y1) <= snap) v.y2 = h.y1;
    }
  }
  return segs;
}

// A sheet often carries several drawings separated by a band of blank paper.
// Find those gutters and cut the sheet into tiles, so walls in one drawing are
// never joined to walls in another.
function splitIntoTiles(segments, width, height, opts) {
  // A gutter has to be blank across the drawing's whole height (or width), so
  // it does not need to clear the doorway gap: a doorway is always covered by
  // the walls that run past it.
  const gutter = Math.max(20, Math.min(width, height) * 0.025);

  const cuts = (along) => {
    const horizontal = along === 'x';
    const size = horizontal ? width : height;
    const covered = new Uint8Array(size);
    for (const s of segments) {
      const lo = Math.floor(Math.max(0, horizontal ? Math.min(s.x1, s.x2) : Math.min(s.y1, s.y2)));
      const hi = Math.ceil(Math.min(size - 1, horizontal ? Math.max(s.x1, s.x2) : Math.max(s.y1, s.y2)));
      for (let i = lo; i <= hi; i++) covered[i] = 1;
    }
    const edges = [0];
    let runStart = -1;
    for (let i = 0; i <= size; i++) {
      const blank = i < size && !covered[i];
      if (blank && runStart < 0) runStart = i;
      else if (!blank && runStart >= 0) {
        // ignore the blank margins at either end of the sheet
        if (runStart > 0 && i < size && i - runStart >= gutter) {
          edges.push(Math.round((runStart + i) / 2));
        }
        runStart = -1;
      }
    }
    edges.push(size);
    return edges;
  };

  const xs = cuts('x');
  const ys = cuts('y');
  const tiles = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      tiles.push({ x0: xs[i], x1: xs[i + 1], y0: ys[j], y1: ys[j + 1], segments: [] });
    }
  }

  for (const s of segments) {
    const cx = (s.x1 + s.x2) / 2;
    const cy = (s.y1 + s.y2) / 2;
    const tile = tiles.find((t) => cx >= t.x0 && cx < t.x1 && cy >= t.y0 && cy < t.y1) || tiles[0];
    if (tile) tile.segments.push(s);
  }

  // A tile with almost nothing in it is a stray mark, not a drawing.
  const kept = tiles.filter((t) => {
    if (t.segments.length < 4) return false;
    const run = t.segments.reduce((sum, s) => sum + Math.hypot(s.x2 - s.x1, s.y2 - s.y1), 0);
    return run > Math.min(width, height) * 0.5;
  });
  return kept.length ? kept : [{ x0: 0, x1: width, y0: 0, y1: height, segments }];
}

export function detectWalls(mask, opts) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const { ink, width, height } = mask;

  const dist = distanceTransform(ink, width, height);
  const bands = (source, horizontal) => bandsToSegments(
    groupBands(runsAlong(source, width, height, horizontal, o.minRun), o.maxWallThickness),
    horizontal, o, dist, width, height
  );

  // Two readings of the page. The gated one keeps only ink thick enough to be
  // a wall; the raw one keeps everything, because the thin strokes are where
  // the stair treads and window symbols live.
  const core = thickInk(dist, ink, o.minWallThickness);
  const structural = [...bands(core, true), ...bands(core, false)];
  const strokes = [...bands(ink, true), ...bands(ink, false)];

  const stairs = findStairs(strokes, o);
  const thin = stairs.rest.filter((seg) => seg.t < o.minWallThickness);
  const tiles = splitIntoTiles([...structural, ...thin], width, height, o);
  const segments = [];
  const doors = [];
  const sections = [];

  tiles.forEach((tile, index) => {
    // Anything still thin after the window pairs are folded is not a wall.
    const usable = absorbParallelPairs(tile.segments, o)
      .filter((seg) => seg.glazed || seg.t >= o.minWallThickness * 0.8);
    const merged = mergeCollinear(usable, o);
    let segs = merged.segments;
    segs.forEach((seg, i) => { seg._i = i; seg.section = index; });

    segs = snapCoordinates(segs, o.snap);
    segs = extendToJunctions(segs, o.snap);

    const long = new Set();
    segs = segs.filter((seg) => {
      const keep = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) >= o.minWallLength;
      if (keep) long.add(seg._i);
      return keep;
    });
    if (!segs.length) return;

    // Re-point the doorways at their wall's final index; a doorway whose wall
    // was dropped as too short goes with it.
    const base = segments.length;
    const remap = new Map();
    segs.forEach((seg, i) => remap.set(seg._i, base + i));
    for (const op of merged.openings) {
      if (!long.has(op.segment)) continue;
      doors.push({ ...op, segment: remap.get(op.segment) });
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const seg of segs) {
      minX = Math.min(minX, seg.x1, seg.x2);
      maxX = Math.max(maxX, seg.x1, seg.x2);
      minY = Math.min(minY, seg.y1, seg.y2);
      maxY = Math.max(maxY, seg.y1, seg.y2);
      seg.section = sections.length;
      delete seg._i;
      segments.push(seg);
    }
    sections.push({ minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY });
  });

  return { segments, doors, sections, stairs: stairs.flights };
}

// ------------------------------------------------------------------ room find

// Paint the merged wall segments (at full thickness) into a fresh mask.
export function rasterizeWalls(segments, width, height, grow = 0) {
  const mask = new Uint8Array(width * height);
  for (const s of segments) {
    const half = Math.max(1, s.t / 2) + grow;
    const x0 = Math.max(0, Math.floor(Math.min(s.x1, s.x2) - (s.dir === 'v' ? half : 0)));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(s.x1, s.x2) + (s.dir === 'v' ? half : 0)));
    const y0 = Math.max(0, Math.floor(Math.min(s.y1, s.y2) - (s.dir === 'h' ? half : 0)));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(s.y1, s.y2) + (s.dir === 'h' ? half : 0)));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) mask[y * width + x] = 1;
    }
  }
  return mask;
}

export function findRooms(wallMask, width, height, opts) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const label = new Int32Array(width * height).fill(-1);
  const regions = [];

  for (let start = 0; start < label.length; start++) {
    if (wallMask[start] || label[start] >= 0) continue;
    const id = regions.length;
    const stack = [start];
    label[start] = id;
    let count = 0;
    let touchesBorder = false;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    while (stack.length) {
      const p = stack.pop();
      const x = p % width;
      const y = (p / width) | 0;
      count++;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (x > 0 && !wallMask[p - 1] && label[p - 1] < 0) { label[p - 1] = id; stack.push(p - 1); }
      if (x < width - 1 && !wallMask[p + 1] && label[p + 1] < 0) { label[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && !wallMask[p - width] && label[p - width] < 0) { label[p - width] = id; stack.push(p - width); }
      if (y < height - 1 && !wallMask[p + width] && label[p + width] < 0) { label[p + width] = id; stack.push(p + width); }
    }
    regions.push({ id, count, touchesBorder, minX, minY, maxX, maxY });
  }

  const rooms = [];
  for (const region of regions) {
    if (region.touchesBorder) continue;          // that is the outside
    if (region.count < o.minRoomArea) continue;  // dust and hatch gaps
    const contour = traceContour(label, width, height, region);
    if (!contour || contour.length < 4) continue;
    let poly = simplify(contour, 2.5);
    poly = rectilinearize(poly, 0.25);
    poly = dedupe(poly);
    if (poly.length < 3) continue;
    if (Math.abs(polygonArea(poly)) < o.minRoomArea * 0.5) continue;
    rooms.push({ poly, pixelArea: region.count });
  }
  rooms.sort((a, b) => b.pixelArea - a.pixelArea);
  return rooms;
}

// Moore-neighbour boundary tracing of one labelled region.
function traceContour(label, width, height, region) {
  const inRegion = (x, y) =>
    x >= 0 && y >= 0 && x < width && y < height && label[y * width + x] === region.id;

  let sx = -1, sy = -1;
  outer:
  for (let y = region.minY; y <= region.maxY; y++) {
    for (let x = region.minX; x <= region.maxX; x++) {
      if (inRegion(x, y)) { sx = x; sy = y; break outer; }
    }
  }
  if (sx < 0) return null;

  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const contour = [[sx, sy]];
  let cx = sx, cy = sy, dir = 6;
  const maxSteps = (region.maxX - region.minX + region.maxY - region.minY + 8) * 8;

  for (let step = 0; step < maxSteps; step++) {
    let moved = false;
    for (let i = 0; i < 8; i++) {
      const d = (dir + 6 + i) % 8;
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (inRegion(nx, ny)) {
        cx = nx; cy = ny; dir = d; moved = true;
        contour.push([cx, cy]);
        break;
      }
    }
    if (!moved) break;
    if (cx === sx && cy === sy && contour.length > 2) break;
  }
  return contour;
}

// ------------------------------------------------------------------ full pass

export function trace(image, opts) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const mask = imageToMask(image, o);
  const { segments, doors, sections, stairs } = detectWalls(mask, o);
  const wallMask = rasterizeWalls(segments, mask.width, mask.height, 1);
  const rooms = findRooms(wallMask, mask.width, mask.height, o);
  return { mask, segments, doors, sections, stairs, rooms, width: mask.width, height: mask.height };
}

// Flood one region starting at (sx, sy) and return its polygon, or null when
// the point is inside a wall or the region leaks to the border. Used by the
// editor's "pick a room" tool.
export function regionAt(wallMask, width, height, sx, sy, minArea = 200) {
  const start = sy * width + sx;
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;
  if (wallMask[start]) return null;

  const label = new Int32Array(width * height).fill(-1);
  const stack = [start];
  label[start] = 0;
  let count = 0, touchesBorder = false;
  let minX = width, minY = height, maxX = 0, maxY = 0;

  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    const y = (p / width) | 0;
    count++;
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (x > 0 && !wallMask[p - 1] && label[p - 1] < 0) { label[p - 1] = 0; stack.push(p - 1); }
    if (x < width - 1 && !wallMask[p + 1] && label[p + 1] < 0) { label[p + 1] = 0; stack.push(p + 1); }
    if (y > 0 && !wallMask[p - width] && label[p - width] < 0) { label[p - width] = 0; stack.push(p - width); }
    if (y < height - 1 && !wallMask[p + width] && label[p + width] < 0) { label[p + width] = 0; stack.push(p + width); }
  }

  if (touchesBorder || count < minArea) return null;
  const contour = traceContour(label, width, height, { id: 0, minX, minY, maxX, maxY });
  if (!contour || contour.length < 4) return null;
  let poly = simplify(contour, 2.0);
  poly = rectilinearize(poly, 0.22);
  poly = dedupe(poly);
  return poly.length >= 3 ? poly : null;
}

// Group wall segments into disconnected drawings. A plan sheet often holds
// several floors side by side; each one comes back as its own cluster.
export function findClusters(segments, gap = 40) {
  const parent = segments.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { parent[find(a)] = find(b); };

  const boxes = segments.map((s) => ({
    minX: Math.min(s.x1, s.x2) - s.t / 2,
    maxX: Math.max(s.x1, s.x2) + s.t / 2,
    minY: Math.min(s.y1, s.y2) - s.t / 2,
    maxY: Math.max(s.y1, s.y2) + s.t / 2,
  }));

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = boxes[i], b = boxes[j];
      const overlaps =
        a.minX - gap <= b.maxX && b.minX - gap <= a.maxX &&
        a.minY - gap <= b.maxY && b.minY - gap <= a.maxY;
      if (overlaps) union(i, j);
    }
  }

  const groups = new Map();
  segments.forEach((_, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });

  return [...groups.values()].map((indices) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const i of indices) {
      minX = Math.min(minX, boxes[i].minX);
      minY = Math.min(minY, boxes[i].minY);
      maxX = Math.max(maxX, boxes[i].maxX);
      maxY = Math.max(maxY, boxes[i].maxY);
    }
    return { indices, minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }).sort((a, b) => (b.w * b.h) - (a.w * a.h));
}
