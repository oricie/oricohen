/* A pixel-art Freiburg seeps through the portrait under the pointer.
 *
 * The photograph stays as it is. On hover a stain opens over it and shows
 * the illustration underneath — lopsided, differently shaped each time,
 * creeping outward while the pointer rests and drawing back when it moves.
 * Its rim fades rather than cuts, so the two pictures meet without an edge.
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

    // Then keep only the stain: the lobed outline carries the shape, the
    // gradient inside it carries the soft rim.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    for (var i = 0; i < ARCS; i++) {
      var a = i / ARCS * TAU;
      var r = live * arc[i];
      var x = px + Math.cos(a) * r, y = py + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();

    var g = ctx.createRadialGradient(
      px, py, Math.max(0, live * arcMin * (1 - FEATHER)), px, py, live * arcMax);
    g.addColorStop(0, 'rgba(0, 0, 0, 1)');
    g.addColorStop(0.72, 'rgba(0, 0, 0, 0.92)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fill();

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
