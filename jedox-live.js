/* The Jedox card plays a slice of the product rather than showing a still.
 *
 * One pass: the chart fills in, the figures count up, a question goes to
 * JedoxAI, it thinks, and it types its answer. Then it fades and starts
 * again. It only runs while the card is on screen.
 */
(function () {
  var ui = document.querySelector('.work-screen--live .ui');
  if (!ui) return;

  var figures = Array.prototype.slice.call(ui.querySelectorAll('.ui-kpi b'));
  var typed = ui.querySelector('.ui-type');
  var ANSWER = 'Revenue is up 18% on 2023, carried by Q3 in North America. ' +
               'Opex held flat, so margin widened four points.';

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var timers = [];
  var running = false;

  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    running = false;
  }

  function label(el, v) {
    el.textContent = (el.dataset.pre || '') + v.toLocaleString('en-US') + (el.dataset.post || '');
  }

  function countUp(el, ms) {
    var to = +el.dataset.to, t0 = performance.now();
    (function tick(now) {
      if (!running) return;
      var k = Math.min(1, (now - t0) / ms);
      k = 1 - Math.pow(1 - k, 3);                  // ease out
      label(el, Math.round(to * k));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function type(text, i) {
    if (!running) return;
    typed.textContent = text.slice(0, i);
    if (i < text.length) later(22 + Math.random() * 28, function () { type(text, i + 1); });
  }

  // The finished frame, for anyone who has asked for less motion.
  function settle() {
    ui.classList.add('is-grown', 'is-asked', 'is-answering');
    figures.forEach(function (f) { label(f, +f.dataset.to); });
    typed.textContent = ANSWER;
  }

  function play() {
    stop();
    running = true;

    // Snap back to the start while it is invisible, then fade in.
    ui.className = 'ui is-resetting is-leaving';
    figures.forEach(function (f) { label(f, 0); });
    typed.textContent = '';
    void ui.offsetWidth;
    ui.classList.remove('is-resetting');
    later(60, function () { ui.classList.remove('is-leaving'); });

    later(250,  function () { ui.classList.add('is-grown'); });
    later(450,  function () { figures.forEach(function (f) { countUp(f, 1300); }); });
    later(1700, function () { ui.classList.add('is-asked'); });
    later(2300, function () { ui.classList.add('is-thinking'); });
    later(3700, function () { ui.classList.add('is-answering'); type(ANSWER, 0); });
    later(9800, function () { ui.classList.add('is-leaving'); });
    later(10400, play);
  }

  if (reduce) { settle(); return; }

  // Only while it can be seen: no point typing to an empty room.
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !running) play();
        else if (!e.isIntersecting && running) stop();
      });
    }, { threshold: 0.2 }).observe(ui);
  } else {
    play();
  }
})();
