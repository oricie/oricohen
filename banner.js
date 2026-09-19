/* The portrait rasterises under the pointer.
 *
 * On hover the whole photo takes on a light pixel grid, and a softer-edged
 * lens of much coarser blocks follows the cursor. Both are drawn on a canvas
 * over the image; the image itself is never touched.
 */
(function () {
  var banner = document.querySelector('.banner');
  if (!banner) return;

  var img = banner.querySelector('img');
  if (!img || !window.requestAnimationFrame) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia &&
    window.matchMedia('(hover: none)').matches;
  if (reduce || coarse) return;

  var FINE = 5;        // px per block across the whole photo
  var COARSE = 22;     // px per block inside the lens
  var RADIUS = 150;    // lens radius

  var canvas = document.createElement('canvas');
  canvas.className = 'banner-fx';
  canvas.setAttribute('aria-hidden', 'true');
  banner.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var fine = document.createElement('canvas');
  var chunky = document.createElement('canvas');
  var w = 0, h = 0, dpr = 1;
  var pointer = { x: 0, y: 0 };
  var raf = 0, over = false;

  function sample(target, block) {
    var cw = Math.max(1, Math.round(w / block));
    var ch = Math.max(1, Math.round(h / block));
    target.width = cw;
    target.height = ch;
    var c = target.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.drawImage(img, 0, 0, cw, ch);
  }

  function measure() {
    var r = banner.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sample(fine, FINE);
    sample(chunky, COARSE);
    return true;
  }

  function draw() {
    raf = 0;
    if (!w) return;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // The whole photo, lightly rasterised.
    ctx.drawImage(fine, 0, 0, w, h);

    // A lens of much bigger blocks, soft at its edge.
    ctx.save();
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(chunky, 0, 0, w, h);
    ctx.restore();

    // Feather that lens edge by punching a soft ring back out.
    var g = ctx.createRadialGradient(
      pointer.x, pointer.y, RADIUS * 0.55,
      pointer.x, pointer.y, RADIUS
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // …and re-lay the fine grid where the lens was feathered away.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fine, 0, 0, w, h);
    ctx.restore();
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  banner.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'touch') return;
    if (!measure()) return;
    over = true;
    banner.classList.add('is-rastered');
    var r = banner.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    schedule();
  });

  banner.addEventListener('pointermove', function (e) {
    if (!over) return;
    var r = banner.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
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
