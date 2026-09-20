/* iOS-style sheet. A work card or the "Read more" link opens its content
 * in a sheet that slides up from the bottom — no navigation, no second page.
 *
 * Built on <dialog> so focus trapping, Esc and inertness come from the
 * platform; the CSS only handles how it moves.
 */
(function () {
  var sheet = document.querySelector('.sheet');
  if (!sheet || typeof sheet.showModal !== 'function') return;

  var panel = sheet.querySelector('.sheet-panel');
  var eyebrow = sheet.querySelector('.sheet-eyebrow');
  var title = sheet.querySelector('#sheet-title');
  var body = sheet.querySelector('.sheet-body');
  var closing = false;

  /* A trigger's content is the nearest <template> above it in the tree —
   * a card's sits beside the button, the bio's beside the paragraph. Titles
   * come from the template's data attributes, or from the card's own head. */
  function findTemplate(trigger) {
    for (var el = trigger; el && el !== document.body; el = el.parentNode) {
      if (!el.querySelector) continue;
      var tpl = el.querySelector(':scope > template');
      if (tpl) return tpl;
    }
    return null;
  }

  /* A card lends its colour to the page while its sheet is open. */
  function tint(trigger) {
    var card = trigger.closest ? trigger.closest('.work-item') : null;
    var accent = card
      ? getComputedStyle(card).getPropertyValue('--panel').trim()
      : '';
    var root = document.documentElement;

    if (accent) {
      root.style.setProperty('--accent', accent);
      root.classList.add('has-accent');
    } else {
      root.style.removeProperty('--accent');
      root.classList.remove('has-accent');
    }
  }

  function open(trigger) {
    var tpl = findTemplate(trigger);
    if (!tpl) return;

    tint(trigger);

    var head = trigger.querySelector('.work-title');
    eyebrow.textContent = tpl.dataset.eyebrow ||
      (trigger.querySelector('.work-sub') || {}).textContent || '';
    title.textContent = tpl.dataset.title || (head ? head.textContent : '');

    body.replaceChildren(tpl.content.cloneNode(true));
    sheet.querySelector('.sheet-scroll').scrollTop = 0;

    document.body.classList.add('sheet-open');
    sheet.showModal();

    // Restart the slide now that the panel is actually rendered.
    sheet.classList.remove('is-opening');
    void panel.offsetWidth;
    sheet.classList.add('is-opening');
  }

  function close() {
    if (closing) return;
    closing = true;
    sheet.classList.remove('is-opening');
    sheet.classList.add('is-closing');

    var done = function () {
      sheet.classList.remove('is-closing');
      sheet.classList.remove('is-opening');
      document.body.classList.remove('sheet-open');
      document.documentElement.classList.remove('has-accent');
      closing = false;
      sheet.close();
    };

    // Wait for the slide-down, but never hang if the animation is suppressed.
    var fallback = setTimeout(done, 400);
    panel.addEventListener('animationend', function handler() {
      panel.removeEventListener('animationend', handler);
      clearTimeout(fallback);
      done();
    });
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('.work-card, .work-item, .read-more');
    if (trigger) { open(trigger); return; }

    if (e.target.closest && e.target.closest('.sheet-close')) { close(); return; }

    // A click on the dialog itself is a click on the backdrop: the panel
    // stops its own clicks from reaching here.
    if (e.target === sheet) close();
  });

  sheet.addEventListener('click', function (e) {
    if (e.target.closest('.sheet-panel') && !e.target.closest('.sheet-close')) {
      e.stopPropagation();
    }
  });

  // Esc fires cancel; run it through the same closing animation.
  sheet.addEventListener('cancel', function (e) {
    e.preventDefault();
    close();
  });

  /* The sheets hold their screenshots in a <template>, so nothing is fetched
   * until one opens — which is a wait of a few hundred kilobytes at exactly
   * the wrong moment. Once the page itself has settled, pull them into the
   * cache in the background, one at a time so they never compete with what
   * is on screen. */
  function warm() {
    var srcs = [];
    document.querySelectorAll('template').forEach(function (t) {
      t.content.querySelectorAll('img[src]').forEach(function (img) {
        var src = img.getAttribute('src');
        if (srcs.indexOf(src) === -1) srcs.push(src);
      });
    });

    (function next() {
      var src = srcs.shift();
      if (!src) return;
      var probe = new Image();
      probe.onload = probe.onerror = next;
      probe.src = src;
    })();
  }

  window.addEventListener('load', function () {
    if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 2500 });
    else setTimeout(warm, 1200);
  });
})();
