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

  // [project, what it is, live class or image, tile shape]
  var SNIPPETS = [
    ['Jedox', 'Reports', 'live-reports'],
    ['Lucky Card', 'A video review app', 'live-video', 'mo-tall'],
    ['SAP Signavio', 'Hub', 'live-sghub'],
    ['Jedox', 'Integrator', 'live-flow'],
    ['Lucky Card', 'Beehive', 'live-hive', 'mo-square'],
    ['SAP Signavio', 'Process Insights', 'live-sgrec'],
    ['Lucky Card', 'TechWars', 'live-tech', 'mo-wide'],
    ['Jedox', 'Workspace home', 'live-home'],
    ['SAP Signavio', 'Galaxy Viewer', 'img:images/signavio-04-galaxy-viewer.webp'],
    ['Lucky Card', 'Exam dashboard', 'live-dash', 'mo-tall'],
    ['Jedox', 'Canvas', 'live-canvas'],
    ['SAP Signavio', 'My Inbox', 'live-sginbox'],
    ['Lucky Card', 'A hotel page', 'live-hotel', 'mo-wide'],
    ['Jedox', 'Financial review', 'img:images/jedox-01-financial-review.webp'],
    ['SAP Signavio', 'Process explorer', 'img:images/signavio-03-process-explorer.webp'],
    ['Jedox', 'Dynatable', 'img:images/jedox-03-dynatable.webp']
  ];

  function cardFor(project) {
    var items = stack.querySelectorAll('.work-item');
    for (var i = 0; i < items.length; i++) {
      var t = items[i].querySelector('.work-title');
      if (t && t.textContent.trim() === project) return items[i].querySelector('.work-card');
    }
    return null;
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
      shot.className = 'mo-shot ' + (s[3] || '');
      if (s[2].indexOf('img:') === 0) {
        var img = document.createElement('img');
        img.src = s[2].slice(4); img.alt = ''; img.loading = 'lazy'; img.draggable = false;
        shot.appendChild(img);
      } else {
        var live = document.createElement('div');
        live.className = s[2];
        live.setAttribute('aria-hidden', 'true');
        shot.appendChild(live);
      }
      tile.appendChild(shot);

      var cap = document.createElement('span');
      cap.className = 'mo-cap';
      cap.innerHTML = '<b></b><span></span>';
      cap.firstChild.textContent = s[0];
      cap.lastChild.textContent = s[1];
      tile.appendChild(cap);

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
