/* iOS-style sheet. Clicking a work card opens its content in a sheet that
 * slides up from the bottom — no navigation, no second page.
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

  function open(card) {
    var tpl = card.parentNode.querySelector('template');
    eyebrow.textContent = card.querySelector('.work-sub').textContent;
    title.textContent = card.querySelector('.work-title').textContent;
    body.replaceChildren(tpl.content.cloneNode(true));
    sheet.querySelector('.sheet-scroll').scrollTop = 0;

    document.body.classList.add('sheet-open');
    sheet.showModal();
  }

  function close() {
    if (closing) return;
    closing = true;
    sheet.classList.add('is-closing');

    var done = function () {
      sheet.classList.remove('is-closing');
      document.body.classList.remove('sheet-open');
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
    var card = e.target.closest && e.target.closest('.work-card');
    if (card) { open(card); return; }

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
})();
