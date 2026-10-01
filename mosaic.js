/* The grid view: snippets of work, in no particular order.
 *
 * Instead of laying the project cards out in rows, the grid view shows the
 * screens from inside them, mixed together, the way the Lucky Card's own
 * drawer does. Each snippet is the same live screen as in its sheet (the
 * page's scripts build anything with a live-* class as it is added), and a
 * click opens the project it comes from.
 *
 * Built the first time the grid is asked for, so the page does not start a
 * dozen screens it may never show.
 */
(function () {
  var section = document.querySelector('.work');
  var stack = section && section.querySelector('.work-stack');
  if (!stack) return;

  // [project, what it is, live class or image, tile shape, backdrop,
  //  [first column, columns, first row, rows] in the bento grid,
  //  and, for a close-up, the part of the screen it shows:
  //  [x, y, width, height, the screen's own width], in the screen's pixels,
  //  and anything the screen itself is told, as data attributes]
  // The grid is placed by hand in four bands that each pack the full width,
  // so it is uneven but has no holes.
  // A desktop screen sits on a coloured backdrop, the way the Lucky Card's
  // pieces bring their own.
  var SNIPPETS = [
    ['SAP Signavio', 'Hub', 'live-sghub', '', '#f7d9c4', [1, 7, 1, 5], [964, 473, 675, 339, 2000]],
    ['Jedox', 'Reports', 'live-reports', '', '#dfe3fb', [1, 5, 12, 5], [350, 112, 840, 340, 2000]],
    ['Lucky Card', 'A video review app', 'live-video', 'mo-tall', '', [1, 4, 17, 11]],
    ['Jedox', 'Integrator', 'live-flow', '', '#cfe6dc', [10, 3, 12, 5], [1040, 480, 1112, 1280, 2856]],
    ['Lucky Card', 'Beehive', 'live-hive', 'mo-square', '', [8, 5, 7, 5]],
    ['SAP Signavio', 'Process Insights', 'live-sgrec', '', '#e4dcf5', [1, 7, 6, 6], [40, 336, 1512, 608, 2000]],
    ['Lucky Card', 'TechWars', 'live-tech', 'mo-wide', '', [6, 4, 12, 5], null, { box: '200,246,695,560' }],
    ['Jedox', 'Workspace home', 'live-home', '', '#f3e6c4', [5, 8, 17, 5]],
    ['SAP Signavio', 'Galaxy Viewer', 'img:images/signavio-04-galaxy-viewer.webp', '', '#cfe3f3', [1, 7, 34, 5]],
    ['Lucky Card', 'Exam dashboard', 'live-dash', 'mo-tall', '', [8, 5, 1, 6]],
    ['Jedox', 'Canvas', 'live-canvas', '', '#f5d3d8', [5, 5, 22, 6]],
    ['SAP Signavio', 'My Inbox', 'live-sginbox', '', '#e9ddd0', [8, 5, 28, 5], [1430, 590, 565, 420, 2000]],
    ['Lucky Card', 'A hotel page', 'live-hotel', 'mo-wide', '', [10, 3, 22, 6]],
    ['Jedox', 'Financial review', 'img:images/jedox-01-financial-review.webp', '', '#c9cdf6', [1, 7, 28, 6]],
    ['Jedox', 'Dynatable', 'img:images/jedox-03-dynatable.webp', '', '#d7ecd0', [8, 5, 33, 6]]
  ];

  function cardFor(project) {
    var items = stack.querySelectorAll('.work-item');
    for (var i = 0; i < items.length; i++) {
      var t = items[i].querySelector('.work-title');
      if (t && t.textContent.trim() === project) return items[i].querySelector('.work-card');
    }
    return null;
  }

  // A close-up keeps its proportions and fits inside its tile, however wide
  // or tall the tile is.
  function fitChunk(shot, chunk, ar) {
    function fit() {
      var cs = getComputedStyle(shot);
      var w = shot.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var h = shot.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      chunk.style.width = (h > 0 ? Math.min(w, h * ar) : w) + 'px';
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(shot);
  }

  var mosaic = null;
  function build() {
    mosaic = document.createElement('div');
    mosaic.className = 'work-mosaic';
    SNIPPETS.forEach(function (s, i) {
      var tile = document.createElement('div');
      tile.className = 'mo-tile';
      tile.style.setProperty('--i', i);
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', s[0] + ': ' + s[1] + '. Open the project.');

      var shot = document.createElement('div');
      shot.className = 'mo-shot ' + (s[3] || '') + (s[4] ? ' mo-bg' : '');
      if (s[4]) shot.style.background = s[4];
      if (s[2].indexOf('img:') === 0) {
        var img = document.createElement('img');
        img.src = s[2].slice(4); img.alt = ''; img.loading = 'lazy'; img.draggable = false;
        shot.appendChild(img);
      } else {
        var live = document.createElement('div');
        live.className = s[2];
        live.setAttribute('aria-hidden', 'true');
        if (s[7]) for (var k in s[7]) live.dataset[k] = s[7][k];
        if (s[6]) {
          // A close-up: one piece of the screen, lifted out as a card of its
          // own. The whole screen is still there, just larger and moved, so
          // the piece fills the card and plays as it does in place.
          var c = s[6], chunk = document.createElement('div');
          chunk.className = 'mo-chunk';
          chunk.style.aspectRatio = c[2] + ' / ' + c[3];
          live.style.width = (c[4] / c[2] * 100) + '%';
          live.style.left = (-c[0] / c[2] * 100) + '%';
          live.style.top = (-c[1] / c[3] * 100) + '%';
          chunk.appendChild(live);
          shot.appendChild(chunk);
          shot.classList.add('mo-close');
          fitChunk(shot, chunk, c[2] / c[3]);
        } else shot.appendChild(live);
      }
      tile.appendChild(shot);

      tile.style.gridColumn = s[5][0] + ' / span ' + s[5][1];
      tile.style.gridRow = s[5][2] + ' / span ' + s[5][3];

      function open() { var c = cardFor(s[0]); if (c) c.click(); }
      tile.addEventListener('click', open);
      tile.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
      mosaic.appendChild(tile);
    });
    stack.parentNode.insertBefore(mosaic, stack.nextSibling);
  }

  // Follow the view the toggle sets on the section.
  var was = false;
  function sync() {
    var grid = section.classList.contains('is-grid');
    if (grid === was) return;
    was = grid;
    if (grid && !mosaic) build();
    if (!mosaic) return;
    if (grid) {
      mosaic.classList.remove('is-in');
      void mosaic.offsetWidth;
      mosaic.classList.add('is-in');
    }
  }
  new MutationObserver(sync).observe(section, { attributes: true, attributeFilter: ['class'] });
})();
