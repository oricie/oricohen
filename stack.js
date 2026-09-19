/* The project cards.
 *
 * Cards can be picked up and left anywhere on the page — dragging moves a
 * card rather than throwing it away. The two buttons in the heading row
 * gather them back up: into the stack, or into the grid.
 */
(function () {
  var stack = document.querySelector('.work-stack');
  if (!stack) return;

  var cards = Array.prototype.slice.call(stack.querySelectorAll('.work-item'));
  if (!cards.length) return;

  var section = stack.closest('.work');
  var toggle = section && section.querySelector('.view-toggle');

  var TAP = 6;              // px below which a gesture is still a click
  var view = 'stack';       // 'stack' | 'grid'
  var offsets = cards.map(function () { return { x: 0, y: 0 }; });
  var dragging = null;
  var justDragged = false;
  var topZ = cards.length;

  function place(card, i) {
    card.style.setProperty('--x', offsets[i].x + 'px');
    card.style.setProperty('--y', offsets[i].y + 'px');
    card.classList.toggle('is-moved', !!(offsets[i].x || offsets[i].y));
  }

  function render(skipTransition) {
    cards.forEach(function (card, i) {
      card.classList.toggle('no-transition', !!skipTransition);
      card.style.setProperty('--depth', view === 'grid' ? 0 : i);
      place(card, i);
    });
  }

  /* ── Free drag ────────────────────────────────────────── */
  stack.addEventListener('pointerdown', function (e) {
    var card = e.target.closest('.work-item');
    if (!card || e.button !== 0) return;

    var i = cards.indexOf(card);
    justDragged = false;
    dragging = {
      id: e.pointerId, i: i, card: card,
      x0: e.clientX, y0: e.clientY,
      ox: offsets[i].x, oy: offsets[i].y,
      moved: 0
    };

    card.classList.add('no-transition', 'is-lifted');
    card.style.zIndex = String(++topZ);
    card.setPointerCapture(e.pointerId);
  });

  stack.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== dragging.id) return;

    var dx = e.clientX - dragging.x0;
    var dy = e.clientY - dragging.y0;
    dragging.moved = Math.max(dragging.moved, Math.abs(dx) + Math.abs(dy));

    offsets[dragging.i].x = dragging.ox + dx;
    offsets[dragging.i].y = dragging.oy + dy;
    place(dragging.card, dragging.i);
  });

  function endDrag(e) {
    if (!dragging || e.pointerId !== dragging.id) return;
    var card = dragging.card;

    justDragged = dragging.moved > TAP;
    card.classList.remove('no-transition', 'is-lifted');

    // Pointer capture retargets the click that follows, so let it go before
    // the browser dispatches one.
    if (card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) {
      card.releasePointerCapture(e.pointerId);
    }
    dragging = null;
  }

  stack.addEventListener('pointerup', endDrag);
  stack.addEventListener('pointercancel', endDrag);

  // Images inside a card would otherwise start a native drag mid-gesture.
  stack.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // A drag must not also register as a click on the card.
  stack.addEventListener('click', function (e) {
    if (justDragged) {
      e.stopPropagation();
      e.preventDefault();
      justDragged = false;
    }
  }, true);

  /* ── Gathering them back up ───────────────────────────── */

  /* Stack and grid are different layouts, and a moved card is somewhere
   * else again, so none of it can simply transition. Measure where every
   * card is, apply the new arrangement, measure again, and play the
   * difference back as one eased move. */
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
        card.style.transform = '';
        render();
      });
    });
  }

  function gather(next) {
    justDragged = false;

    morph(function () {
      view = next;
      section.classList.toggle('is-grid', view === 'grid');

      // Everything returns to its place in the arrangement.
      offsets = cards.map(function () { return { x: 0, y: 0 }; });
      topZ = cards.length;
      cards.forEach(function (card, i) {
        card.classList.remove('is-lifted', 'no-transition');
        card.style.zIndex = view === 'grid' ? '' : String(cards.length - i);
        card.style.setProperty('--depth', view === 'grid' ? 0 : i);
        place(card, i);
      });
    });

    if (toggle) {
      toggle.querySelectorAll('.view-btn').forEach(function (b) {
        var on = b.dataset.view === view;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.view-btn');
      if (btn) gather(btn.dataset.view);
    });
  }

  cards.forEach(function (card, i) { card.style.zIndex = String(cards.length - i); });
  render(true);
  requestAnimationFrame(function () {
    cards.forEach(function (c) { c.classList.remove('no-transition'); });
  });
})();
