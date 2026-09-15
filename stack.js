/* The project deck.
 *
 * Cards sit stacked on top of one another. Dragging the front card sideways
 * throws it off and brings the next one forward; a sideways or vertical
 * scroll over the deck does the same. At either end the deck stops
 * consuming the scroll, so the page carries on as normal.
 */
(function () {
  var stack = document.querySelector('.work-stack');
  if (!stack) return;

  var cards = Array.prototype.slice.call(stack.querySelectorAll('.work-item'));
  if (!cards.length) return;

  var DEPTH = 3;          // how many cards are visible behind the front one
  var THROW = 90;         // px of drag that commits to a change
  var TAP = 6;            // px below which a pointer gesture is still a click

  var index = 0;
  var dragging = null;
  var justDragged = false;
  var wheelLock = false;

  function render(skipTransition) {
    cards.forEach(function (card, i) {
      var depth = i - index;
      card.classList.toggle('is-front', depth === 0);
      card.classList.toggle('no-transition', !!skipTransition);
      card.style.setProperty('--depth', Math.max(depth, 0));
      card.style.setProperty('--x', '0px');
      card.style.setProperty('--rot', '0deg');

      // Cards already passed sit off to the left; deep ones fade out.
      var gone = depth < 0;
      card.classList.toggle('is-gone', gone);
      card.style.zIndex = String(cards.length - Math.abs(depth));
      card.style.opacity = gone ? '0' : (depth > DEPTH ? '0' : '1');
      card.hidden = false;

      var btn = card.querySelector('.work-card');
      btn.tabIndex = depth === 0 ? 0 : -1;
      btn.setAttribute('aria-hidden', depth === 0 ? 'false' : 'true');
    });
  }

  function go(delta) {
    var next = Math.min(Math.max(index + delta, 0), cards.length - 1);
    if (next === index) return false;
    index = next;
    render();
    return true;
  }

  function front() { return cards[index]; }

  /* ── Drag ─────────────────────────────────────────────── */
  stack.addEventListener('pointerdown', function (e) {
    var card = e.target.closest('.work-item');
    if (!card || card !== front() || e.button !== 0) return;

    // Every gesture starts out as a potential click.
    justDragged = false;
    dragging = { id: e.pointerId, x0: e.clientX, dx: 0, card: card };
    card.classList.add('no-transition');
    card.setPointerCapture(e.pointerId);
  });

  stack.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== dragging.id) return;
    dragging.dx = e.clientX - dragging.x0;
    dragging.card.style.setProperty('--x', dragging.dx + 'px');
    dragging.card.style.setProperty('--rot', (dragging.dx / 36).toFixed(2) + 'deg');
  });

  function endDrag(e) {
    if (!dragging || e.pointerId !== dragging.id) return;
    var dx = dragging.dx;
    var card = dragging.card;
    card.classList.remove('no-transition');
    dragging = null;

    // Pointer capture retargets the click that follows, so let it go before
    // the browser dispatches one.
    if (card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) {
      card.releasePointerCapture(e.pointerId);
    }

    justDragged = Math.abs(dx) > TAP;

    if (dx <= -THROW && index < cards.length - 1) {
      go(1);
    } else if (dx >= THROW && index > 0) {
      go(-1);
    } else {
      // Snap back.
      card.style.setProperty('--x', '0px');
      card.style.setProperty('--rot', '0deg');
    }
  }

  stack.addEventListener('pointerup', endDrag);
  stack.addEventListener('pointercancel', endDrag);

  // A drag must not also register as a click on the card.
  stack.addEventListener('click', function (e) {
    if (justDragged) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  /* ── Scroll ───────────────────────────────────────────── */
  stack.addEventListener('wheel', function (e) {
    var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 2) return;

    var wanted = delta > 0 ? 1 : -1;
    var canMove = wanted > 0 ? index < cards.length - 1 : index > 0;
    if (!canMove) return;          // let the page scroll on at either end

    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    setTimeout(function () { wheelLock = false; }, 320);
    go(wanted);
  }, { passive: false });

  /* ── Keyboard ─────────────────────────────────────────── */
  stack.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (go(-1)) e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (go(1)) e.preventDefault();
    }
  });

  render(true);
  requestAnimationFrame(function () {
    cards.forEach(function (c) { c.classList.remove('no-transition'); });
  });
})();
