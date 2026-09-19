/* The portrait resolves into 1-bit pixel art under the pointer.
 *
 * On hover the photo is redrawn as black dots on white, ordered-dithered
 * with a Bayer matrix so it keeps its tones without any greys. The cursor
 * acts as a light: dots thin out around it, so moving the mouse pushes the
 * picture in and out of legibility.
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

  var BLOCK = 5;       // css px per dot
  var RADIUS = 170;    // reach of the cursor light
  var LIFT = 150;      // how much that light brightens, 0-255

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
  var cols = 0, rows = 0;
  var w = 0, h = 0, dpr = 1;
  var pointer = { x: -9999, y: -9999 };
  var raf = 0, over = false;

  function measure() {
    var r = banner.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.max(1, Math.round(w / BLOCK));
    rows = Math.max(1, Math.round(h / BLOCK));
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
        lum[i] = Math.max(0, Math.min(255, (y - 128) * 1.25 + 128));
      }
    } catch (e) {
      lum = null;            // cross-origin image: leave the photo alone
      return false;
    }
    return true;
  }

  function draw() {
    raf = 0;
    if (!lum) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    var px = pointer.x, py = pointer.y;
    var r2 = RADIUS * RADIUS;

    ctx.beginPath();
    for (var y = 0; y < rows; y++) {
      var cy = y * BLOCK;
      for (var x = 0; x < cols; x++) {
        var v = lum[y * cols + x];
        var cx = x * BLOCK;

        // The cursor lights the picture locally, thinning the dots.
        var dx = cx - px, dy = cy - py;
        var d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          var f = 1 - Math.sqrt(d2) / RADIUS;
          v += LIFT * f * f;
        }

        if (v < BAYER[y & 3][x & 3]) {
          ctx.rect(cx, cy, BLOCK, BLOCK);
        }
      }
    }
    ctx.fillStyle = '#121212';
    ctx.fill();
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
