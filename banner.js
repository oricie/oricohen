/* A patch of the portrait turns to a halftone of geometric marks under the
 * pointer.
 *
 * The grid is perfectly regular and there is no dithering and no noise:
 * tone is carried by how big each mark is and which shape it takes — a
 * triangle for light, a circle for mid, a square for dark. The same tone
 * always draws the same mark, which is what makes it read as a screen
 * rather than as static.
 *
 * The patch has no edge either. Marks simply shrink toward the rim until
 * there is nothing left of them, so the photograph comes back without a
 * boundary anywhere.
 */
(function () {
  var banner = document.querySelector('.banner');
  if (!banner) return;

  var img = banner.querySelector('img');
  if (!img || !window.requestAnimationFrame) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noHover = window.matchMedia &&
    window.matchMedia('(hover: none)').matches;
  if (reduce || noHover) return;

  var BLOCK = 7;       // target css px per cell
  var RADIUS = 165;    // the patch while the pointer is moving
  var FEATHER = 0.42;  // fraction of the radius the marks shrink away over
  var SETTLE = 140;    // ms of stillness before the patch starts seeping
  var SPREAD = 0.0075; // how fast it seeps outward
  var PULL = 0.26;     // how fast it draws back once the pointer moves
  var STIR = 1.6;      // px the pointer must travel to count as moving
  var ARCS = 168;      // angular resolution of the stain's outline
  var TAU = Math.PI * 2;
  var FLOOR = 0.10;    // below this much ink a cell stays empty
  var TONES = 20;      // grey steps the marks are drawn in
  var LIGHT = 196;     // the grey a barely-inked mark takes
  var DARK = 12;       // the grey a fully inked mark takes
  var SPR = 26;        // px a sprite is drawn at before being scaled down

  var canvas = document.createElement('canvas');
  canvas.className = 'banner-fx';
  canvas.setAttribute('aria-hidden', 'true');
  banner.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var small = document.createElement('canvas');
  var lum = null;            // luminance per cell
  var cols = 0, rows = 0;
  var cell = 3, step = 1.5;  // dot size, in device px and in css px
  var w = 0, h = 0, dpr = 1;
  var pointer = { x: -9999, y: -9999 };
  var raf = 0, over = false;
  var radius = RADIUS;   // the live radius, eased toward its target
  var reach = RADIUS;    // the widest the patch can open to
  var moved = 0;         // when the pointer last travelled
  var drewX = -1, drewY = -1, drewR = -1;   // what the last frame showed
  var born = 0;          // when this hover began
  var lastX = 0, lastY = 0;

  // The stain is not a disc. Its edge is a handful of sine lobes at random
  // phases, so it comes out lopsided, differently each time, and the lobes
  // drift as it grows — it creeps rather than inflates.
  var arc = new Float32Array(ARCS);
  var lobes = [];
  var arcMin = 1, arcMax = 1;

  function reshape() {
    lobes = [];
    var n = 3 + (Math.random() * 3 | 0);
    var budget = 0.42;
    for (var i = 0; i < n; i++) {
      var amp = budget * (0.25 + Math.random() * 0.6) / n;
      lobes.push({
        k: 2 + (Math.random() * 4 | 0),
        amp: amp,
        phase: Math.random() * TAU,
        drift: (Math.random() - 0.5) * 0.0009
      });
    }
  }

  function outline(t) {
    var lo = 9, hi = 0;
    for (var i = 0; i < ARCS; i++) {
      var a = i / ARCS * TAU, v = 1;
      for (var j = 0; j < lobes.length; j++) {
        var L = lobes[j];
        v += L.amp * Math.sin(L.k * a + L.phase + L.drift * t);
      }
      arc[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    arcMin = lo;
    arcMax = hi;
  }

  function measure() {
    var r = banner.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return false;

    // The marks are small and there are thousands of them; rasterising at
    // 1.5x rather than 2x costs nothing visible and nearly halves the work.
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    // Every dot has to land on a whole number of device pixels, or the
    // nearest-neighbour scale rounds some cells wider than others and the
    // grid reads as uneven. So the cell is sized in device px and the canvas
    // is painted untransformed, at 1:1.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    cell = Math.max(2, Math.round(BLOCK * dpr));
    step = cell / dpr;
    cols = Math.max(1, Math.ceil(canvas.width / cell));
    rows = Math.max(1, Math.ceil(canvas.height / cell));
    small.width = cols;
    small.height = rows;

    var sc = small.getContext('2d', { willReadFrequently: true });
    sc.imageSmoothingEnabled = true;
    sc.drawImage(img, 0, 0, cols, rows);

    try {
      var data = sc.getImageData(0, 0, cols, rows).data;
      lum = new Float32Array(cols * rows);
      for (var i = 0, p = 0; i < lum.length; i++, p += 4) {
        // Rec. 601 luma, then a little contrast so 1-bit has something to bite on.
        var y = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        lum[i] = Math.max(0, Math.min(255, (y - 128) * 1.3 + 128));

        // Noise breaks up the Bayer crosshatch into something closer to a
        // stochastic screen. Averaging two draws pulls it toward the middle.
      }
    } catch (e) {
      lum = null;            // cross-origin image: leave the photo alone
      return false;
    }

    buildSheet();
    return true;
  }

  /* Every shape in every grey, rendered once into a sheet. Stamping a
     scaled sprite is an order of magnitude cheaper than building and
     filling a path per mark, which is what caps how fine the grid can be
     and how many greys it can carry. */
  var sheet = document.createElement('canvas');

  function buildSheet() {
    sheet.width = 3 * SPR;
    sheet.height = TONES * SPR;
    var g = sheet.getContext('2d');
    var r = SPR / 2;

    for (var t = 0; t < TONES; t++) {
      var v = Math.round(LIGHT + (DARK - LIGHT) * (t / (TONES - 1)));
      g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
      var y = t * SPR;

      g.beginPath();                              // light: a triangle
      g.moveTo(r, y + 1.5);
      g.lineTo(SPR - 1.5, y + SPR - 2);
      g.lineTo(1.5, y + SPR - 2);
      g.closePath();
      g.fill();

      g.beginPath();                              // mid: a circle
      g.arc(SPR + r, y + r, r - 1, 0, TAU);
      g.fill();

      g.fillRect(2 * SPR + 1, y + 1, SPR - 2, SPR - 2);   // dark: a square
    }
  }

  function draw() {
    raf = 0;
    if (!lum) return;

    var now = Date.now();

    // Grow only as far as actually covers the frame from where the pointer
    // is — chasing the full diagonal meant it never arrived, and a patch
    // that never arrives can never stop being redrawn.
    var pxc = pointer.x, pyc = pointer.y;
    var far = Math.max(
      Math.sqrt(pxc * pxc + pyc * pyc),
      Math.sqrt((w - pxc) * (w - pxc) + pyc * pyc),
      Math.sqrt(pxc * pxc + (h - pyc) * (h - pyc)),
      Math.sqrt((w - pxc) * (w - pxc) + (h - pyc) * (h - pyc)));
    // A fixed divisor, not the live arcMin: the lobes drift, and a target
    // that drifts with them can never be reached, so the frame would never
    // go quiet.
    reach = far / 0.58;

    var idle = now - moved > SETTLE;
    var target = idle ? reach : RADIUS;
    radius += (target - radius) * (idle ? SPREAD : PULL);
    // The approach is asymptotic; past this the last of it shows nothing
    // new, so land it and let the frame go quiet.
    // Once the shortest lobe already reaches the furthest corner there is
    // nothing left to reveal, so land it rather than creep for another ten
    // seconds at full cost.
    if (radius * arcMin >= far || target - radius < target * 0.01) radius = target;
    if (radius > reach) radius = reach;

    // Arrived, and the pointer has not moved: the next frame would be the
    // same one. Don't spend it, and leave the lobes where they are — their
    // drift is what would otherwise keep nudging the target forever.
    if (Math.abs(radius - target) < 1 &&
        pxc === drewX && pyc === drewY && Math.abs(radius - drewR) < 1) {
      if (over) schedule();
      return;
    }
    drewX = pxc; drewY = pyc; drewR = radius;

    outline(now - born);

    var px = pointer.x * dpr, py = pointer.y * dpr;
    var live = radius * dpr;
    var rMax = live * arcMax, rMax2 = rMax * rMax;
    var rSolid = live * arcMin * (1 - FEATHER);
    var maxHalf = cell * 0.5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // A ground for the marks to sit on, fading out over the same distance
    // they shrink over — so the photograph returns without a boundary.
    var ground = ctx.createRadialGradient(px, py, rSolid * 0.9, px, py, rMax);
    ground.addColorStop(0, 'rgba(255, 255, 255, 1)');
    ground.addColorStop(0.55, 'rgba(255, 255, 255, 0.82)');
    ground.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = ground;
    // Only the part of it that lands on the canvas: once the patch is wide
    // the square around it is mostly off-screen.
    var gx = Math.max(0, px - rMax), gy = Math.max(0, py - rMax);
    ctx.fillRect(gx, gy,
                 Math.min(canvas.width, px + rMax) - gx,
                 Math.min(canvas.height, py + rMax) - gy);

    var x0 = Math.max(0, Math.floor((px - rMax) / cell));
    var x1 = Math.min(cols - 1, Math.ceil((px + rMax) / cell));
    var y0 = Math.max(0, Math.floor((py - rMax) / cell));
    var y1 = Math.min(rows - 1, Math.ceil((py + rMax) / cell));


    for (var y = y0; y <= y1; y++) {
      var cy = (y + 0.5) * cell;
      var row = y * cols;
      for (var x = x0; x <= x1; x++) {
        var cx = (x + 0.5) * cell;
        var dx = cx - px, dy = cy - py;
        var d2 = dx * dx + dy * dy;
        if (d2 > rMax2) continue;

        var ink = 1 - lum[row + x] / 255;
        if (ink < FLOOR) continue;

        // Toward the rim the marks shrink away, so the patch has no edge.
        var fade = 1;
        if (d2 > rSolid * rSolid) {
          var k = ((Math.atan2(dy, dx) + Math.PI) / TAU * ARCS) | 0;
          if (k < 0) k = 0; else if (k >= ARCS) k = ARCS - 1;
          var lr = live * arc[k];
          var inner = lr * (1 - FEATHER);
          var dist = Math.sqrt(d2);
          if (dist >= lr) continue;
          fade = dist <= inner ? 1 : 1 - (dist - inner) / (lr - inner);
          fade *= fade;                     // ease it out rather than ramp
        }

        // Spread the midtones, so a nearly flat background still varies.
        var t = ink * ink * (3 - 2 * ink);
        // Capped short of the cell: marks never quite touch, which is what
        // keeps dark areas reading as a screen rather than a solid mass.
        var half = maxHalf * (0.14 + 0.72 * t) * fade;
        if (half < 0.35) continue;

        var shape = t < 0.34 ? 0 : t < 0.70 ? 1 : 2;
        // Darkness follows the ink, not just the size — that is most of
        // what makes it read as a photograph rather than a pattern.
        var tone = (t * TONES) | 0;
        if (tone > TONES - 1) tone = TONES - 1;
        ctx.drawImage(sheet, shape * SPR, tone * SPR, SPR, SPR,
                      cx - half, cy - half, half * 2, half * 2);
      }
    }

    if (over) schedule();
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function at(e) {
    var r = banner.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  }

  // Sub-pixel jitter from a resting hand should not keep collapsing the
  // stain; only a real move counts as a move.
  function stirred() {
    var dx = pointer.x - lastX, dy = pointer.y - lastY;
    if (dx * dx + dy * dy < STIR * STIR) return false;
    lastX = pointer.x;
    lastY = pointer.y;
    return true;
  }

  banner.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'touch') return;
    if (!measure()) return;
    over = true;
    banner.classList.add('is-rastered');
    at(e);
    radius = RADIUS;
    born = moved = Date.now();
    lastX = pointer.x;
    lastY = pointer.y;
    reshape();
    schedule();
  });

  banner.addEventListener('pointermove', function (e) {
    if (!over) return;
    at(e);
    if (stirred()) moved = Date.now();
    schedule();
  });

  banner.addEventListener('pointerleave', function () {
    over = false;
    banner.classList.remove('is-rastered');
  });

  window.addEventListener('resize', function () {
    if (over && measure()) schedule();
  });
})();
