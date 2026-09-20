/* The card with nothing written up yet runs a reel of older interface work.
 *
 * One frame is on at a time and they cross over quickly, so the card reads
 * as something still being sorted through rather than a finished gallery.
 */
(function () {
  var reel = document.querySelector('.reel');
  if (!reel) return;

  var frames = Array.prototype.slice.call(reel.querySelectorAll('img'));
  if (frames.length < 2) return;

  var HOLD = 900;   // ms a frame stays up
  var at = 0;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;   // leave the first frame showing

  // Pull them all in before the first turn, so no frame arrives blank.
  frames.forEach(function (f) { new Image().src = f.src; });

  setInterval(function () {
    frames[at].classList.remove('is-on');
    at = (at + 1) % frames.length;
    frames[at].classList.add('is-on');
  }, HOLD);
})();
