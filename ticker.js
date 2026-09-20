/* Reels of older interface work — one on the third card, one inside its
 * sheet.
 *
 * The frames cut from one to the next. A cross-fade would dissolve two
 * different interfaces through each other, which reads as a ghost rather
 * than as a change.
 */
(function () {
  function mount(reel, hold) {
    if (reel.dataset.reel) return;      // already running
    reel.dataset.reel = '1';

    var frames = Array.prototype.slice.call(reel.querySelectorAll('img'));
    if (frames.length < 2) return;

    // Dots, when the markup provides them, sit right after the reel.
    var dots = [];
    var after = reel.nextElementSibling;
    if (after && after.classList.contains('reel-dots')) {
      dots = Array.prototype.slice.call(after.querySelectorAll('.reel-dot'));
    }

    var at = 0;
    var timer = 0;

    function show(next) {
      frames[at].classList.remove('is-on');
      if (dots[at]) dots[at].classList.remove('is-on');
      at = (next + frames.length) % frames.length;
      frames[at].classList.add('is-on');
      if (dots[at]) dots[at].classList.add('is-on');
    }

    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function run() {
      if (reduce) return;
      timer = setInterval(function () { show(at + 1); }, hold);
    }

    // Pull them all in before the first turn, so no frame arrives blank.
    frames.forEach(function (f) { new Image().src = f.src; });

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        clearInterval(timer);
        show(i);
        run();                          // a nudge restarts the clock
      });
    });

    run();
  }

  function scan() {
    var card = document.querySelector('.work-screen--soon .reel');
    if (card) mount(card, 1300);

    // The sheet's copy only exists once the sheet has been opened.
    var sheet = document.querySelector('.sheet .reel--sheet');
    if (sheet) mount(sheet, 2400);
  }

  scan();

  var dialog = document.querySelector('.sheet');
  if (dialog && window.MutationObserver) {
    new MutationObserver(scan).observe(dialog, { childList: true, subtree: true });
  }
})();
