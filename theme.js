/* Version switcher.
 *
 * To add a new design version:
 *   1. drop the stylesheet in as themes/02.css (then 03, 04 …)
 *   2. add its number to VERSIONS below
 *   3. optionally set LATEST to it, to make it the default for new visitors
 *
 * Nothing else changes: the pills, the switching and the remembered
 * choice all follow from that list.
 */
(function () {
  var VERSIONS = ['01'];
  var LATEST = VERSIONS[VERSIONS.length - 1];
  var KEY = 'oc-version';

  var mount = document.querySelector('.version-switch');
  if (!mount) return;

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return VERSIONS.indexOf(v) > -1 ? v : LATEST;
    } catch (e) {
      return LATEST;
    }
  }

  function apply(version, persist) {
    var link = document.getElementById('theme-css');
    if (link) link.href = 'themes/' + version + '.css';

    var buttons = mount.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].value === version;
      buttons[i].classList.toggle('is-active', on);
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    if (persist) {
      try { localStorage.setItem(KEY, version); } catch (e) {}
    }
  }

  VERSIONS.forEach(function (version) {
    var b = document.createElement('button');
    b.type = 'button';
    b.value = version;
    b.textContent = version;
    b.setAttribute('aria-label', 'Version ' + version);
    b.addEventListener('click', function () { apply(version, true); });
    mount.appendChild(b);
  });

  apply(stored(), false);
})();
