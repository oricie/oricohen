/* The Lucky Card's grid: each picture settles in, quickly and once, as it
 * comes into view, the tiles a beat apart. The two rebuilt screens run
 * their own entrances (misc-dash.js, misc-tech.js). */
(function () {
  function watch(root) {
    var tiles = root.querySelectorAll ? root.querySelectorAll('.lk-img:not([data-seen])') : [];
    if (!tiles.length) return;
    if (!window.IntersectionObserver) {
      tiles.forEach(function (t) { t.classList.add('is-seen'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--lk-delay', (k++ * 0.08) + 's');
        e.target.classList.add('is-seen');
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    tiles.forEach(function (t) { t.setAttribute('data-seen', ''); io.observe(t); });
  }
  watch(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) watch(n.parentNode || n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
