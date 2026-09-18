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

  var section = stack.closest('.work');
  var toggle = section && section.querySelector('.view-toggle');

  var view = 'stack';     // 'stack' | 'grid'
  var index = 0;
  var dragging = null;
  var justDragged = false;
  var wheelLock = false;

  function render(skipTransition) {
    if (view === 'grid') return;

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

  /* ── View ─────────────────────────────────────────────── */

  /* Stack and grid are different layouts, so the cards cannot simply
   * transition between them. Measure where each card is, switch the
   * layout, measure again, then play the difference back as one eased
   * move (a FLIP). */
  function morph(apply) {
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) { apply(); return; }

    var first = cards.map(function (c) { return c.getBoundingClientRect(); });
    apply();
    var last = cards.map(function (c) { return c.getBoundingClientRect(); });

    cards.forEach(function (card, i) {
      var a = first[i], b = last[i];
      if (!a.width || !b.width) return;

      var dx = a.left - b.left;
      var dy = a.top - b.top;
      var sx = a.width / b.width;
      var sy = a.height / b.height;
      if (!dx && !dy && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;

      card.style.transition = 'none';
      card.style.transformOrigin = 'top left';
      card.style.transform =
        'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
    });

    // One reflow, then let every card travel home together.
    void stack.offsetWidth;

    cards.forEach(function (card) {
      if (card.style.transform === '') return;
      card.style.transition = 'transform 0.55s cubic-bezier(0.22, 0.61, 0.36, 1)';
      card.style.transform = '';

      card.addEventListener('transitionend', function handler(e) {
        if (e.propertyName !== 'transform') return;
        card.removeEventListener('transitionend', handler);
        card.style.transition = '';
        card.style.transformOrigin = '';
        if (view === 'stack') render();
      });
    });
  }

  function setView(next) {
    if (next === view) return;
    view = next;

    morph(function () {
      section.classList.toggle('is-grid', view === 'grid');
      applyView();
    });

    if (toggle) {
      toggle.querySelectorAll('.view-btn').forEach(function (b) {
        var on = b.dataset.view === view;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
  }

  function applyView() {
    if (view === 'grid') {
      // Hand every card back to the grid: no stacking styles left behind.
      cards.forEach(function (card) {
        card.classList.remove('is-front', 'is-gone', 'no-transition');
        card.style.cssText = card.style.cssText.replace(/(^|;)\s*(transform|opacity|z-index)\s*:[^;]*/g, '');
        card.style.removeProperty('--x');
        card.style.removeProperty('--rot');
        card.style.removeProperty('--depth');
        card.style.opacity = '';
        card.style.zIndex = '';
        var btn = card.querySelector('.work-card');
        btn.tabIndex = 0;
        btn.setAttribute('aria-hidden', 'false');
      });
      stack.removeAttribute('tabindex');
    } else {
      stack.setAttribute('tabindex', '0');
      render(true);
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.view-btn');
      if (btn) setView(btn.dataset.view);
    });
  }

  /* ── Drag ─────────────────────────────────────────────── */
  stack.addEventListener('pointerdown', function (e) {
    if (view === 'grid') return;
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

  // Images inside a card would otherwise start a native drag mid-gesture.
  stack.addEventListener('dragstart', function (e) { e.preventDefault(); });

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
    if (view === 'grid') return;
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
    if (view === 'grid') return;
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
