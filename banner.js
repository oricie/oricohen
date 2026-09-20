/* A patch of the portrait turns to pixel art under the pointer.
 *
 * Only what the cursor covers is redrawn — black dots on white, ordered-
 * dithered with a Bayer matrix so it keeps its tones without any greys.
 * Everywhere else the canvas stays transparent and the photograph shows
 * through, so the pixel art travels with the mouse.
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

  var BLOCK = 1.5;     // target css px per dot
  var RADIUS = 165;    // the patch while the pointer is moving
  var FEATHER = 0.22;  // fraction of the radius the patch fades over
  var SETTLE = 140;    // ms of stillness before the patch starts spreading
  var SPREAD = 0.007;  // how fast it opens out
  var PULL = 0.30;     // how fast it draws back once the pointer moves
  var GRAIN = 62;      // noise added to the threshold, 0-255

  // 4x4 ordered dither, normalised to 0-255.
  var BAYER = [
    [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
  ].map(function (row) {
    return row.map(function (v) { return (v + 0.5) / 16 * 255; });
  });

  var canvas = document.createElement('canvas');
  canvas.className = 'banner-fx';
  canvas.setAttribute('aria-hidden', 'true');
  banner.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var small = document.createElement('canvas');
  var lum = null;            // luminance per cell
  var grain = null;          // fixed noise per cell, so it never crawls
  var bits = null;           // the 1-bit frame, one pixel per cell
  var bitsCtx = null;
  var bitmap = document.createElement('canvas');
  var cols = 0, rows = 0;
  var cell = 3, step = 1.5;  // dot size, in device px and in css px
  var w = 0, h = 0, dpr = 1;
  var pointer = { x: -9999, y: -9999 };
  var raf = 0, over = false;
  var radius = RADIUS;   // the live radius, eased toward its target
  var reach = RADIUS;    // the widest the patch can open to
  var moved = 0;         // when the pointer last moved

  function measure() {
    var r = banner.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    // Far enough to reach every corner from anywhere in the frame.
    reach = Math.sqrt(w * w + h * h);
    small.width = cols;
    small.height = rows;

    var sc = small.getContext('2d', { willReadFrequently: true });
    sc.imageSmoothingEnabled = true;
    sc.drawImage(img, 0, 0, cols, rows);

    try {
      var data = sc.getImageData(0, 0, cols, rows).data;
      lum = new Float32Array(cols * rows);
      grain = new Float32Array(cols * rows);
      for (var i = 0, p = 0; i < lum.length; i++, p += 4) {
        // Rec. 601 luma, then a little contrast so 1-bit has something to bite on.
        var y = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        lum[i] = Math.max(0, Math.min(255, (y - 128) * 1.3 + 128));

        // Noise breaks up the Bayer crosshatch into something closer to a
        // stochastic screen. Averaging two draws pulls it toward the middle.
        grain[i] = ((Math.random() + Math.random()) - 1) * GRAIN;
      }
    } catch (e) {
      lum = null;            // cross-origin image: leave the photo alone
      return false;
    }

    // The frame is composed one pixel per dot, then scaled up with smoothing
    // off — far cheaper than painting tens of thousands of rectangles.
    bitmap.width = cols;
    bitmap.height = rows;
    bitsCtx = bitmap.getContext('2d');
    bits = bitsCtx.createImageData(cols, rows);
    return true;
  }

  function draw() {
    raf = 0;
    if (!lum) return;

    // Still pointer: the patch keeps opening out. Moving pointer: it draws
    // back to its travelling size.
    var idle = Date.now() - moved > SETTLE;
    var target = idle ? reach : RADIUS;
    radius += (target - radius) * (idle ? SPREAD : PULL);

    var px = pointer.x, py = pointer.y;
    var r2 = radius * radius;
    var inner = radius * (1 - FEATHER);
    var d = bits.data;

    // Everything starts clear, and only the cells the patch can reach are
    // worked out — so the cost follows the patch, not the frame.
    d.fill(0);

    var x0 = Math.max(0, Math.floor((px - radius) / step));
    var x1 = Math.min(cols - 1, Math.ceil((px + radius) / step));
    var y0 = Math.max(0, Math.floor((py - radius) / step));
    var y1 = Math.min(rows - 1, Math.ceil((py + radius) / step));

    for (var y = y0; y <= y1; y++) {
      var cy = (y + 0.5) * step;
      var by = y & 3;
      var row = y * cols;
      for (var x = x0; x <= x1; x++) {
        var cx = (x + 0.5) * step;
        var dx = cx - px, dy = cy - py;
        var d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;

        var i = row + x, p = i * 4;
        var dist = Math.sqrt(d2);
        var a = dist <= inner ? 1 : 1 - (dist - inner) / (radius - inner);

        if (lum[i] < BAYER[by][x & 3] + grain[i]) {
          d[p] = d[p + 1] = d[p + 2] = 18;
        } else {
          d[p] = d[p + 1] = d[p + 2] = 255;
        }
        d[p + 3] = (a * 255) | 0;
      }
    }

    bitsCtx.putImageData(bits, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, cols * cell, rows * cell);

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
    radius = RADIUS;
    moved = Date.now();
    schedule();
  });

  banner.addEventListener('pointermove', function (e) {
    if (!over) return;
    at(e);
    moved = Date.now();
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
