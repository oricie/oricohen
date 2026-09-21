/* A pixel-art Freiburg seeps through the portrait under the pointer.
 *
 * The photograph stays as it is. On hover the illustration underneath comes
 * through it, cell by cell: near the pointer every cell has turned, further
 * out they turn at random, and past that none have. The edge is a scatter
 * rather than a line, and because each cell's noise is fixed the scatter
 * holds still instead of crawling.
 *
 * The reach is lopsided too — a handful of sine lobes at random phases,
 * redrawn on every hover — and it creeps outward while the pointer rests.
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

  var RADIUS = 175;    // the stain while the pointer is moving
  var FEATHER = 0.34;  // fraction of the radius the rim fades over
  var SETTLE = 140;    // ms of stillness before it starts seeping
  var SPREAD = 0.0055; // how fast it seeps outward
  var PULL = 0.20;     // how fast it draws back once the pointer moves
  var STIR = 2;        // px the pointer must travel to count as moving
  var ARCS = 168;      // angular resolution of the stain's outline
  var CELL = 9;        // css px per cell of the dissolve
  var TAU = Math.PI * 2;

  var canvas = document.createElement('canvas');
  canvas.className = 'banner-fx';
  canvas.setAttribute('aria-hidden', 'true');
  banner.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var art = new Image();
  var ready = false;
  art.onload = function () { ready = true; };
  art.src = 'images/portrait-pixel.png';

  var w = 0, h = 0, dpr = 1;
  var mask = document.createElement('canvas');
  var maskCtx = null, maskData = null;
  var noise = null;          // fixed per cell, so the scatter never crawls
  var cols = 0, rows = 0, cell = 1;
  var pointer = { x: -9999, y: -9999 };
  var raf = 0, over = false;
  var radius = RADIUS, reach = RADIUS;
  var moved = 0, born = 0;
  var lastX = 0, lastY = 0;
  var drewX = -1, drewY = -1, drewR = -1;

  /* The stain is not a disc. Its edge is a handful of sine lobes at random
     phases, so it comes out lopsided, differently each time, and the lobes
     drift as it grows — it creeps rather than inflates. */
  var arc = new Float32Array(ARCS);
  var lobes = [];
  var arcMin = 1, arcMax = 1;

  function reshape() {
    lobes = [];
    var n = 3 + (Math.random() * 3 | 0);
    for (var i = 0; i < n; i++) {
      lobes.push({
        k: 2 + (Math.random() * 4 | 0),
        amp: 0.42 * (0.25 + Math.random() * 0.6) / n,
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
    if (!r.width || !ready) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // The dissolve is worked out one pixel per cell and blown up with
    // smoothing off, so it costs a few thousand values rather than a few
    // million.
    cell = Math.max(3, Math.round(CELL * dpr));
    cols = Math.max(1, Math.ceil(canvas.width / cell));
    rows = Math.max(1, Math.ceil(canvas.height / cell));
    mask.width = cols;
    mask.height = rows;
    maskCtx = mask.getContext('2d');
    maskData = maskCtx.createImageData(cols, rows);

    noise = new Float32Array(cols * rows);
    for (var i = 0; i < noise.length; i++) {
      // Two draws averaged: fewer cells turn very early or very late, so
      // the scatter reads as a dissolve rather than as salt and pepper.
      noise[i] = (Math.random() + Math.random()) * 0.5;
    }
    return true;
  }

  function draw() {
    raf = 0;
    if (!ready) return;

    var now = Date.now();
    var pxc = pointer.x, pyc = pointer.y;

    // Grow only as far as covers the frame from where the pointer is; a
    // target it can never reach is a frame that can never go quiet.
    var far = Math.max(
      Math.sqrt(pxc * pxc + pyc * pyc),
      Math.sqrt((w - pxc) * (w - pxc) + pyc * pyc),
      Math.sqrt(pxc * pxc + (h - pyc) * (h - pyc)),
      Math.sqrt((w - pxc) * (w - pxc) + (h - pyc) * (h - pyc)));
    reach = far / 0.58;

    var idle = now - moved > SETTLE;
    var target = idle ? reach : RADIUS;
    radius += (target - radius) * (idle ? SPREAD : PULL);
    if (radius * arcMin >= far || Math.abs(target - radius) < target * 0.01) {
      radius = target;
    }

    // Arrived, and the pointer has not moved: the next frame would be the
    // same one, so don't spend it.
    if (radius === target && pxc === drewX && pyc === drewY &&
        Math.abs(radius - drewR) < 0.5) {
      if (over) schedule();
      return;
    }
    drewX = pxc; drewY = pyc; drewR = radius;

    outline(now - born);

    var px = pxc * dpr, py = pyc * dpr;
    var live = radius * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // The illustration, framed exactly as the photograph beneath it.
    var scale = Math.max(canvas.width / art.width, canvas.height / art.height);
    var dw = art.width * scale, dh = art.height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, (canvas.width - dw) / 2, (canvas.height - dh) * 0.08, dw, dh);

    // Then keep only the cells that have turned. Every cell gets the same
    // fixed noise each frame, so the scatter stays put while the reach
    // moves through it.
    var d = maskData.data;
    var band = FEATHER;

    for (var y = 0, i = 0, p = 0; y < rows; y++) {
      var cy = (y + 0.5) * cell;
      for (var x = 0; x < cols; x++, i++, p += 4) {
        var cx = (x + 0.5) * cell;
        var dx = cx - px, dy = cy - py;
        var dist = Math.sqrt(dx * dx + dy * dy);

        var k = ((Math.atan2(dy, dx) + Math.PI) / TAU * ARCS) | 0;
        if (k < 0) k = 0; else if (k >= ARCS) k = ARCS - 1;
        var lr = live * arc[k];

        // 1 well inside, 0 well outside, and in between the chance that
        // this particular cell has turned yet.
        var f = (lr - dist) / (lr * band);
        d[p + 3] = f >= 1 ? 255 : (f <= 0 ? 0 : (f > noise[i] ? 255 : 0));
      }
    }

    maskCtx.putImageData(maskData, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mask, 0, 0, cols * cell, rows * cell);

    ctx.globalCompositeOperation = 'source-over';

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
    drewX = drewY = drewR = -1;
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
