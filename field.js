/* A mesh of colour behind the fourth card.
 *
 * Seven control points, each with its own colour, drift on their own slow
 * orbits. Every pixel takes a weighted blend of all seven by distance, so
 * the colour is interpolated across the whole field rather than layered —
 * there is no seam anywhere, because there are no separate shapes to seam.
 *
 * The field is computed at a fraction of the size and scaled up with
 * smoothing on, which is both what makes it cost nothing and what gives the
 * blend its softness.
 */
(function () {
  var host = document.querySelector('.field');
  if (!host || !window.requestAnimationFrame) return;

  var GRID = 34;       // longest side of the field, in samples
  var FALLOFF = 2.6;   // how tightly each point holds its own colour

  // The orbits are prime-numbered seconds, so the seven never come back
  // into the same arrangement and the field has no loop to find.
  var POINTS = [
    { c: [ 88,  62, 214], px: 0.22, py: 0.24, ax: 0.30, ay: 0.20, tx: 23, ty: 31 },
    { c: [214,  36, 118], px: 0.76, py: 0.20, ax: 0.26, ay: 0.24, tx: 29, ty: 19 },
    { c: [ 14, 158, 198], px: 0.30, py: 0.78, ax: 0.28, ay: 0.18, tx: 37, ty: 43 },
    { c: [232, 106,  32], px: 0.82, py: 0.74, ax: 0.22, ay: 0.26, tx: 41, ty: 17 },
    { c: [ 26, 152,  86], px: 0.50, py: 0.46, ax: 0.34, ay: 0.30, tx: 47, ty: 13 },
    { c: [250, 214, 120], px: 0.10, py: 0.54, ax: 0.20, ay: 0.22, tx: 53, ty: 37 },
    { c: [ 16,  16,  34], px: 0.62, py: 0.10, ax: 0.24, ay: 0.28, tx: 59, ty: 11 }
  ];

  var canvas = document.createElement('canvas');
  canvas.className = 'field-canvas';
  host.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var small = document.createElement('canvas');
  var sctx = small.getContext('2d');
  var pix = null;
  var cols = 0, rows = 0;
  var raf = 0;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function measure() {
    var r = host.getBoundingClientRect();
    if (!r.width || !r.height) return false;

    canvas.width = Math.max(1, Math.round(r.width));
    canvas.height = Math.max(1, Math.round(r.height));

    var ratio = r.width / r.height;
    cols = ratio >= 1 ? GRID : Math.max(6, Math.round(GRID * ratio));
    rows = ratio >= 1 ? Math.max(6, Math.round(GRID / ratio)) : GRID;
    small.width = cols;
    small.height = rows;
    pix = sctx.createImageData(cols, rows);
    return true;
  }

  function paint(t) {
    var d = pix.data;
    var n = POINTS.length;
    var xs = new Float32Array(n), ys = new Float32Array(n);

    for (var i = 0; i < n; i++) {
      var P = POINTS[i];
      xs[i] = P.px + Math.sin(t / P.tx) * P.ax;
      ys[i] = P.py + Math.cos(t / P.ty) * P.ay;
    }

    for (var y = 0, p = 0; y < rows; y++) {
      var v = rows > 1 ? y / (rows - 1) : 0.5;
      for (var x = 0; x < cols; x++, p += 4) {
        var u = cols > 1 ? x / (cols - 1) : 0.5;
        var r = 0, g = 0, b = 0, wsum = 0;

        for (var k = 0; k < n; k++) {
          var dx = u - xs[k], dy = v - ys[k];
          // Inverse distance, softened — every point contributes everywhere,
          // which is what stops any of them having an edge.
          var w = 1 / (Math.pow(dx * dx + dy * dy, FALLOFF / 2) + 0.0008);
          var C = POINTS[k].c;
          r += C[0] * w; g += C[1] * w; b += C[2] * w;
          wsum += w;
        }

        d[p]     = r / wsum;
        d[p + 1] = g / wsum;
        d[p + 2] = b / wsum;
        d[p + 3] = 255;
      }
    }

    sctx.putImageData(pix, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  }

  function frame() {
    raf = 0;
    paint(Date.now() / 1000);
    if (!reduce) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!measure()) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (reduce) paint(0); else frame();
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () { start(); }).observe(host);
  }
  window.addEventListener('resize', start);
  start();
})();
