/* A pixel-art Freiburg seeps through the portrait under the pointer.
 *
 * The photograph stays as it is. On hover the illustration underneath comes
 * through it, cell by cell: near the pointer every cell has turned, further
 * out they turn at random, and past that none have. The edge is a scatter
 * rather than a line, and because each cell's noise is fixed the scatter
 * holds still instead of crawling.
 *
 * The reach is lopsided too — a handful of sine lobes at random phases,
 * redrawn on every hover, drifting slowly so the outline never sits still.
 * It holds its size and simply follows the pointer.
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

  var RADIUS = 185;    // how far the reveal reaches
  var FEATHER = 0.34;  // fraction of the reach the scatter spans
  var ARCS = 168;      // angular resolution of the outline
  var CELL = 4;        // css px per cell of the dissolve
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
  var born = 0;
  var drewX = -1, drewY = -1;

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

    // Nothing but the pointer changes the picture now, so a frame where it
    // has not moved would redraw the same thing.
    if (pxc === drewX && pyc === drewY) {
      if (over) schedule();
      return;
    }
    drewX = pxc; drewY = pyc;

    outline(now - born);

    var px = pxc * dpr, py = pyc * dpr;
    var live = RADIUS * dpr;

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

  banner.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'touch') return;
    if (!measure()) return;
    over = true;
    banner.classList.add('is-rastered');
    at(e);
    born = Date.now();
    drewX = drewY = -1;
    reshape();
    schedule();
  });

  banner.addEventListener('pointermove', function (e) {
    if (!over) return;
    at(e);
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
