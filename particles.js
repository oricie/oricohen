(function () {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W, H, particles;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -Math.random() * 0.2 - 0.05,
      alpha: Math.random() * 0.25 + 0.05,
      flicker: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 55 }, makeParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = performance.now() / 1000;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.phase += p.flicker;

      if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -4) p.x = W + 4;
      if (p.x > W + 4) p.x = -4;

      const a = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
      ctx.beginPath();
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
      grad.addColorStop(0, `rgba(255,248,220,${a})`);
      grad.addColorStop(1, `rgba(255,248,220,0)`);
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
})();
