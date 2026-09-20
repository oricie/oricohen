/* The portrait resolves into a grid of geometric shapes under the pointer.
 *
 * The grid is perfectly regular. Tone is carried by what sits in each cell
 * rather than by dithering: light areas get a small triangle, mid tones a
 * circle, dark areas a square, and each shape grows with the ink it stands
 * for. No noise, no threshold — the same tone always draws the same mark.
 * The cursor is a light: shapes under it take the photo's own colour.
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

  var BLOCK = 11;      // target css px per cell
  var RADIUS = 165;    // reach of the cursor
  var FLOOR = 0.10;    // below this much ink the cell stays empty
  var INK = '#121212';

  var canvas = document.createElement('canvas');
  canvas.className = 'banner-fx';
  canvas.setAttribute('aria-hidden', 'true');
  banner.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var small = document.createElement('canvas');
  var lum = null;            // luminance per cell
  var rgb = null;            // the photo's own colour per cell
  var cols = 0, rows = 0;
  var cell = 3, step = 1.5;  // dot size, in device px and in css px
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

    // Every dot has to land on a whole number of device pixels, or the
    // nearest-neighbour scale rounds some cells wider than others and the
    // grid reads as uneven. So the cell is sized in device px and the canvas
    // is painted untransformed, at 1:1.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    cell = Math.max(4, Math.round(BLOCK * dpr));
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
      rgb = new Uint8ClampedArray(cols * rows * 3);
      for (var i = 0, p = 0; i < lum.length; i++, p += 4) {
        // Keep the photo's colour, pushed a little to hold up as ink.
        var sr = data[p], sg = data[p + 1], sb = data[p + 2];
        var mid = (sr + sg + sb) / 3;
        rgb[i * 3]     = mid + (sr - mid) * 3.2;
        rgb[i * 3 + 1] = mid + (sg - mid) * 3.2;
        rgb[i * 3 + 2] = mid + (sb - mid) * 3.2;

        // Rec. 601 luma, then a little contrast so 1-bit has something to bite on.
        var y = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        lum[i] = Math.max(0, Math.min(255, (y - 128) * 1.3 + 128));

      }
    } catch (e) {
      lum = null;            // cross-origin image: leave the photo alone
      return false;
    }

    return true;
  }

  /* Tone decides both the mark and how big it is. The bands are wide enough
     that a face reads as bands of shape, not as a gradient of one. */
  function mark(ctx, cx, cy, ink, half) {
    if (ink < 0.42) {                       // light: a triangle
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy + half);
      ctx.lineTo(cx - half, cy + half);
      ctx.closePath();
    } else if (ink < 0.74) {                // mid: a circle
      ctx.moveTo(cx + half, cy);
      ctx.arc(cx, cy, half, 0, 6.2831853);
    } else {                                // dark: a square
      ctx.rect(cx - half, cy - half, half * 2, half * 2);
    }
  }

  function draw() {
    raf = 0;
    if (!lum) return;

    var px = pointer.x * dpr, py = pointer.y * dpr;
    var reach = RADIUS * dpr, r2 = reach * reach;
    var maxHalf = cell * 0.5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Everything outside the cursor is the same ink, so it goes down as one
    // path per shape — three fills for the whole picture.
    var plain = [new Path2D(), new Path2D(), new Path2D()];
    var lit = [];

    for (var y = 0, i = 0; y < rows; y++) {
      var cy = (y + 0.5) * cell;
      for (var x = 0; x < cols; x++, i++) {
        var ink = 1 - lum[i] / 255;
        if (ink < FLOOR) continue;

        var cx = (x + 0.5) * cell;
        var half = maxHalf * (0.20 + 0.76 * ink);

        var dx = cx - px, dy = cy - py;
        if (dx * dx + dy * dy < r2) {
          lit.push(cx, cy, ink, half, 1 - Math.sqrt(dx * dx + dy * dy) / reach, i);
        } else {
          mark(plain[ink < 0.42 ? 0 : ink < 0.74 ? 1 : 2], cx, cy, ink, half);
        }
      }
    }

    ctx.fillStyle = INK;
    ctx.fill(plain[0]);
    ctx.fill(plain[1]);
    ctx.fill(plain[2]);

    // Under the cursor each mark carries the photo's own colour instead.
    for (var k = 0; k < lit.length; k += 6) {
      var t = lit[k + 4], j = lit[k + 5] * 3;
      ctx.fillStyle = 'rgb(' +
        Math.round(18 + (rgb[j] - 18) * t) + ',' +
        Math.round(18 + (rgb[j + 1] - 18) * t) + ',' +
        Math.round(18 + (rgb[j + 2] - 18) * t) + ')';
      ctx.beginPath();
      mark(ctx, lit[k], lit[k + 1], lit[k + 2], lit[k + 3]);
      ctx.fill();
    }
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
