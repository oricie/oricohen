/* The card with nothing in it yet runs a departure board.
 *
 * Nine cells roll through letters and settle on a word, the way a split-flap
 * display does: each cell stops a beat after the one before it, so the word
 * lands left to right. Underneath, a strip of the same vocabulary scrolls by.
 */
(function () {
  var board = document.querySelector('.flap');
  if (!board) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cells = Array.prototype.slice.call(board.querySelectorAll('.flap-cell'));
  var WORDS = ['ARRIVING', 'MOTION', 'FRAGMENTS', 'ARCHIVE', 'SKETCHES', 'SOON'];
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  var word = 0;
  var timers = [];

  function clear() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function set(cell, ch) {
    cell.textContent = ch;
    cell.classList.toggle('is-blank', ch === ' ');
    cell.classList.remove('is-turning');
    void cell.offsetWidth;
    if (ch !== ' ') cell.classList.add('is-turning');
  }

  function show(text) {
    var padded = text.padEnd(cells.length, ' ').slice(0, cells.length);

    cells.forEach(function (cell, i) {
      var target = padded[i];

      if (reduce) { set(cell, target); return; }

      // Roll this cell, then let it settle — later cells roll longer.
      var rolls = 5 + i * 2;
      var n = 0;
      (function step() {
        if (n++ >= rolls) { set(cell, target); return; }
        set(cell, GLYPHS[(Math.random() * GLYPHS.length) | 0]);
        timers.push(setTimeout(step, 55));
      })();
    });
  }

  function next() {
    clear();
    show(WORDS[word % WORDS.length]);
    word++;
    timers.push(setTimeout(next, 3400));
  }

  next();
})();
