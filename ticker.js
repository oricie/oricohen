/* The card with nothing written up yet runs a reel of older interface work.
 *
 * The frames cut from one to the next. A cross-fade would dissolve two
 * different interfaces through each other, which reads as a ghost rather
 * than as a change.
 */
(function () {
  var reel = document.querySelector('.reel');
  if (!reel) return;

  var frames = Array.prototype.slice.call(reel.querySelectorAll('img'));
  if (frames.length < 2) return;

  var HOLD = 1300;  // ms a frame stays up
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
