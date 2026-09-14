/* Version switcher. Swaps the theme stylesheet and remembers the choice.
   No build step, no framework — one <link> href and a localStorage key. */
(function () {
  var KEY = 'oc-version';
  var VERSIONS = ['serif', 'grid'];
  var DEFAULT = 'serif';

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return VERSIONS.indexOf(v) > -1 ? v : DEFAULT;
    } catch (e) {
      return DEFAULT;
    }
  }

  function apply(name, persist) {
    var link = document.getElementById('theme-css');
    if (link) link.href = 'themes/' + name + '.css';

    var buttons = document.querySelectorAll('.version-switch button');
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute('data-version') === name;
      buttons[i].classList.toggle('is-active', on);
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    if (persist) {
      try { localStorage.setItem(KEY, name); } catch (e) {}
    }
  }

  apply(read(), false);

  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.tagName === 'BUTTON' && el.getAttribute('data-version')) {
        apply(el.getAttribute('data-version'), true);
        return;
      }
      el = el.parentNode;
    }
  });
})();
