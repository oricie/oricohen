/* A field of colour behind the fourth card, meshed horizontally.
 *
 * The colour runs in seven bands stacked top to bottom, and each band's
 * height, width and colour change smoothly from left to right. That is what
 * lets them pinch together at one point and fan out towards the edges, the
 * way long exposures of light do — a blend of points can only make blobs.
 *
 * The bands, their softness and their colours were fitted to the reference
 * image by least squares, so the first frame is that image's structure.
 * From there the bands sway together, a little differently at each point
 * across, and each strays slightly on its own. Moving together keeps them
 * in order: two bands that crossed would expose a colour the fit only ever
 * used between them. The periods are prime numbers of seconds, so the field
 * never comes back to where it was.
 *
 * It is computed at a few dozen samples across and scaled up with smoothing
 * on, which is both what makes it cheap and what keeps it soft.
 */
(function () {
  var host = document.querySelector('.field');
  if (!host || !window.requestAnimationFrame) return;

  var GRID = 48;          // longest side of the field, in samples
  var SWAY = 0.05;        // how far the bands move together, as a share of the height
  var WANDER = 0.012;     // how far each one strays from the others

  // Band centres at five points across (rows: bands top to bottom).
  var Y = [[-3.6464, -0.067, 0.0958, 0.0621, -0.5047], [0.3284, 0.3091, 0.4979, 0.3206, 0.4226], [0.4437, 0.4013, 0.1543, 0.2926, 0.2994], [2.3748, 0.803, 0.4151, 0.4647, 0.496], [0.7849, 0.5872, 0.5656, 0.6337, 0.5716], [0.8265, 0.7549, 0.6431, 0.6581, 0.6029], [3.5892, 0.9521, 0.7377, 0.7451, 0.6823]];
  // Softness of each band.
  var S = [0.1675, 0.1213, 0.1528, 0.0673, 0.1021, 0.076, 0.0799];
  // Each band's colour at the same five points.
  var C = [[[0, 160, 235], [220, 174, 192], [53, 109, 168], [65, 119, 171], [65, 118, 172]], [[192, 207, 212], [198, 203, 206], [191, 163, 198], [103, 129, 170], [58, 116, 172]], [[201, 172, 201], [202, 181, 210], [214, 175, 193], [59, 113, 169], [67, 120, 172]], [[197, 150, 147], [220, 170, 166], [108, 117, 146], [49, 88, 136], [15, 81, 147]], [[230, 55, 0], [214, 99, 80], [21, 41, 77], [31, 39, 74], [255, 217, 204]], [[216, 134, 111], [206, 175, 179], [221, 168, 163], [220, 239, 255], [41, 82, 126]], [[255, 255, 153], [158, 149, 164], [130, 141, 165], [140, 147, 168], [129, 140, 165]]];

  var K = Y.length, J = Y[0].length;
  var KX = [];
  for (var j = 0; j < J; j++) KX.push(j / (J - 1));
  var HX = 0.7 / (J - 1);
  var PERIOD = [17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73];

  var canvas = document.createElement('canvas');
  canvas.className = 'field-canvas';
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var small = document.createElement('canvas');
  var sctx = small.getContext('2d');
  var pix = null, cols = 0, rows = 0, raf = 0;
  var bx = null;          // horizontal weights per column, fixed per size

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function measure() {
    var r = host.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    canvas.width = Math.max(1, Math.round(r.width));
    canvas.height = Math.max(1, Math.round(r.height));
    var ratio = r.width / r.height;
    cols = ratio >= 1 ? GRID : Math.max(8, Math.round(GRID * ratio));
    rows = ratio >= 1 ? Math.max(8, Math.round(GRID / ratio)) : GRID;
    small.width = cols; small.height = rows;
    pix = sctx.createImageData(cols, rows);
    bx = new Float32Array(cols * J);
    for (var x = 0; x < cols; x++) {
      var u = (x + 0.5) / cols, sum = 0;
      for (var j = 0; j < J; j++) {
        var d = (u - KX[j]) / HX;
        sum += (bx[x * J + j] = Math.exp(-d * d));
      }
      for (j = 0; j < J; j++) bx[x * J + j] /= sum;
    }
    return true;
  }

  // Only bands that are actually on the card move; the fit parks a few far
  // outside it, and moving those would bring in colours nobody chose.
  function centre(k, j, t) {
    var y = Y[k][j];
    if (y < -0.3 || y > 1.3) return y;
    return y + SWAY * Math.sin(2 * Math.PI * t / PERIOD[j]) +
               WANDER * Math.sin(2 * Math.PI * t / PERIOD[5 + (k * J + j) % 10]);
  }

  var yc = new Float32Array(K), rc = new Float32Array(K), gc = new Float32Array(K), bc = new Float32Array(K);
  function paint(t) {
    var d = pix.data;
    var yk = new Float32Array(K * J);
    for (var k = 0; k < K; k++) for (var j = 0; j < J; j++) yk[k * J + j] = centre(k, j, t);

    for (var x = 0; x < cols; x++) {
      // This column's band centres and colours.
      for (k = 0; k < K; k++) {
        var yy = 0, r = 0, g = 0, b = 0;
        for (j = 0; j < J; j++) {
          var w = bx[x * J + j], c = C[k][j];
          yy += w * yk[k * J + j]; r += w * c[0]; g += w * c[1]; b += w * c[2];
        }
        yc[k] = yy; rc[k] = r; gc[k] = g; bc[k] = b;
      }
      for (var y = 0; y < rows; y++) {
        var v = (y + 0.5) / rows, R = 0, G = 0, B = 0, W = 0;
        for (k = 0; k < K; k++) {
          var q = (v - yc[k]) / S[k];
          var wk = Math.exp(-q * q) + 1e-9;
          R += wk * rc[k]; G += wk * gc[k]; B += wk * bc[k]; W += wk;
        }
        var p = (y * cols + x) * 4;
        d[p] = R / W; d[p + 1] = G / W; d[p + 2] = B / W; d[p + 3] = 255;
      }
    }
    sctx.putImageData(pix, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  }

  var t0 = 0;
  function frame(now) {
    raf = 0;
    if (!t0) t0 = now;
    paint((now - t0) / 1000);
    if (!reduce) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!measure()) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (reduce) paint(0); else raf = requestAnimationFrame(frame);
  }

  if (window.ResizeObserver) new ResizeObserver(function () { start(); }).observe(host);
  window.addEventListener('resize', start);
  start();
})();
