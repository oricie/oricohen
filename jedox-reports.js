/* Jedox Reports, alive, inside the Jedox sheet.
 *
 * The report browser at the screenshots' own size, 2000 by 1156, scaled to
 * its frame. Icons are Lucide's, drawn inline.
 *
 * It plays once each time the sheet opens: the list fills in, the pointer
 * goes to the view toggle, "Grid view" is asked for, and every row flies to
 * its place as a card — the same fourteen items, rearranged, not swapped.
 * Then it rests on the grid and answers hover. Nothing opens or navigates.
 */
(function () {
  var W = 2000, H = 1156;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, css, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function put(p, c) { p.appendChild(c); return c; }
  function at(x, y, w, h) {
    return 'left:' + x + 'px;top:' + y + 'px;' + (w != null ? 'width:' + w + 'px;' : '') + (h != null ? 'height:' + h + 'px;' : '');
  }

  // Lucide (24x24, 2px stroke, round caps).
  var L = {
    chart:   '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><rect x="7" y="13" width="3" height="5" rx="1"/><rect x="12" y="9" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>',
    bars:    '<rect x="4" y="12" width="4" height="8" rx="1.5"/><rect x="10" y="8" width="4" height="12" rx="1.5"/><rect x="16" y="4" width="4" height="16" rx="1.5"/>',
    scatter: '<circle cx="7.5" cy="7.5" r="3.5"/><path d="M4 21v-5M9 21v-3M14 21v-8M19 21V9"/>',
    folder:  '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    frame:   '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
    grid:    '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    list:    '<path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13"/>',
    menu:    '<path d="M4 12h16M4 18h16M4 6h16"/>',
    home:    '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    fileeye: '<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M4 22V4a2 2 0 0 1 2-2h8l6 6v4"/><circle cx="16" cy="17" r="3"/><path d="M22 17s-2-3-6-3-6 3-6 3 2 3 6 3 6-3 6-3"/>',
    down:    '<path d="m6 9 6 6 6-6"/>',
    right:   '<path d="m9 18 6-6-6-6"/>',
    x:       '<path d="M18 6 6 18M6 6l12 12"/>',
    more:    '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    table:   '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18"/>',
    sheet:   '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    db:      '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    flow:    '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
    gear:    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'
  };
  // The rail's glyphs, shared with the other Jedox screens.
  L.pen   = '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/><circle cx="11" cy="13" r="1.3"/>';
  L.chart = '<path d="M4 20h16"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-4"/>';
  L.doc   = '<path d="M6 3h8l4 4v14H6z"/><path d="M9 11h2M13 11h2M9 14h2M13 14h2M9 17h2M13 17h2"/>';
  L.cal   = '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>';
  L.fold  = '<path d="M3 6h7l2 2h9v11H3z"/><path d="M9 14v3M12 12v5M15 13v4"/>';
  L.users = '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6"/>';
  L.cam   = '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>';
  L.bell  = '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>';
  L.spark = '<path d="M12 3c.5 4.5 3.5 7.5 8 8-4.5.5-7.5 3.5-8 8-.5-4.5-3.5-7.5-8-8 4.5-.5 7.5-3.5 8-8z"/><path d="M19 3v3M17.5 4.5h3"/>';
  L.gear2 = '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 2.6 3-.6.9 2.9 2.8 1.2-.9 2.9 1.6 2.5-2.4 1.9.1 3-3 .4-1.6 2.6L12 19.8l-2.9 2.1-1.6-2.6-3-.4.1-3-2.4-1.9 1.6-2.5-.9-2.9 2.8-1.2.9-2.9 3 .6z"/>';
  L.home2 = '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>';

  function icon(name, size, color, css, sw) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;fill:none;stroke:' + color +
      ';stroke-width:' + (sw || 2) + ';stroke-linecap:round;stroke-linejoin:round;' + (css || '');
    s.innerHTML = L[name];
    return s;
  }

  var ITEMS = [
    ['Home', 'bars', 'c'], ['Bikers Best', 'folder', 'f'], ['MIS Cockpit', 'folder', 'f'], ['ETL Tools', 'folder', 'f'],
    ['Resources', 'folder', 'f'], ['02', 'scatter', 'c'], ['Spreadsheet 01', 'bars', 'c'], ['Dashboard-Light-Grey-Mode', 'bars', 'c'],
    ['Crazy List', 'bars', 'c'], ['New folder (2)', 'folder', 'f'], ['Test for Support Frameset', 'frame', 'c'],
    ['Biker_Navigation_JedoxTest', 'frame', 'c'], ['New folder (3)', 'folder', 'f'], ['New folder (4)', 'folder', 'f']
  ];
  var TREE_FOLDERS = { 'Bikers Best': 1, 'MIS Cockpit': 1, 'ETL Tools': 1, 'Resources': 1, 'New folder (2)': 1 };
  var TONE = { f: ['#e0f2f1', '#2f6e6b'], c: ['#fbe8de', '#98583a'] };
  // Grid paths are cut from the front, as the product does.
  // (Cut by width in CSS; the marks keep the bidi ellipsis from flipping brackets.)
  function shortPath(p) { return '\u200E' + p + '\u200E'; }
  var THUMB = { 'Home': 'images/jr-home.webp', 'Crazy List': 'images/jr-crazy.webp' };

  function build(host) {
    host.innerHTML = '';
    var ui = put(host, el('span', 'jr'));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'jr-stage', 'width:' + W + 'px;height:' + H + 'px'));

    // Rail: the same as the other Jedox screens, scaled to this one's width.
    var rail = put(st, el('span', 'jr-rail', at(0, 0, 53, H)));
    put(rail, el('span', 'jr-rail-on', at(6.5, 102.5, 40, 43)));
    ['home2', 'pen', 'chart', 'doc', 'cal', 'fold', 'db', 'users', 'cam'].forEach(function (n, i) {
      put(rail, icon(n, 19, i === 2 ? '#3f6fd6' : '#7b8aa0', 'left:17px;top:' + (30 + i * 47 - 9.5) + 'px', 1.6));
    });
    put(rail, el('span', 'jr-rule jr-rule--rail', at(0, 991, 53, 0)));
    [['bell', 1025], ['spark', 1066], ['gear2', 1109]].forEach(function (r) {
      put(rail, icon(r[0], 19, '#7b8aa0', 'left:17px;top:' + (r[1] - 9.5) + 'px', 1.6));
    });

    // Top bar.
    var top = put(st, el('span', 'jr-top', at(53, 0, W - 53, 53)));
    put(top, icon('menu', 18, '#3b4046', 'left:14px;top:17px', 1.8));
    put(top, el('span', 'jr-top-t', at(65, 0, null, 52), 'Reports'));
    put(top, el('span', 'jr-vr', at(148, 12, 0, 28)));
    put(top, icon('bars', 17, '#2a2e33', 'left:175px;top:17px', 1.8));
    put(top, el('span', 'jr-tab', at(203, 0, null, 52), 'Welcome'));
    put(top, icon('x', 13, '#555a60', 'left:277px;top:20px', 1.8));

    // Tree.
    var tree = put(st, el('span', 'jr-tree', at(53, 53, 295, H - 53)));
    var sel = put(tree, el('span', 'jr-select', at(10, 11, 186, 36)));
    put(sel, el('span', 'jr-t', at(18, 0, null, 34), 'Reports'));
    put(sel, icon('down', 16, '#2a2e33', 'left:158px;top:10px', 2));
    put(tree, icon('home', 19, '#2a2e33', 'left:215px;top:20px', 1.8));
    put(tree, icon('fileeye', 19, '#2a2e33', 'left:258px;top:20px', 1.8));
    put(tree, el('span', 'jr-rule', at(10, 57, 276, 0)));
    ITEMS.forEach(function (it, i) {
      var y = 82 + i * 30.2;
      if (TREE_FOLDERS[it[0]]) put(tree, icon('right', 14, '#2a2e33', 'left:18px;top:' + (y - 7) + 'px', 2));
      put(tree, icon(it[1], 18, '#2a2e33', 'left:43px;top:' + (y - 9) + 'px', 1.7));
      put(tree, el('span', 'jr-tree-t', 'left:71px;top:' + (y - 12) + 'px', it[0]));
    });

    // Main.
    put(st, el('span', 'jr-h', at(367, 78, null, 30), 'Reports'));
    var tog = put(st, el('span', 'jr-toggle', at(1913, 73, 72, 40)));
    var bGrid = put(tog, el('span', 'jr-tbtn jr-tbtn--grid', at(5, 5, 30, 30)));
    put(bGrid, icon('grid', 18, 'currentColor', 'left:6px;top:6px', 1.8));
    var bList = put(tog, el('span', 'jr-tbtn jr-tbtn--list', at(37, 5, 30, 30)));
    put(bList, icon('list', 18, 'currentColor', 'left:6px;top:6px', 1.8));
    var tip = put(st, el('span', 'jr-tip', at(1898, 117, 74, 37), 'Grid view'));

    var table = put(st, el('span', 'jr-table', at(368, 131, 1617, 820)));
    put(table, el('span', 'jr-th', at(12, 0, null, 39), 'Name'));
    put(table, el('span', 'jr-th', at(602, 0, null, 39), 'Path'));
    put(table, el('span', 'jr-head-rule', at(0, 39, 1617, 0)));

    var items = ITEMS.map(function (it, i) {
      var path = 'Demo Reports/Reports/' + it[0];
      var n = put(st, el('span', 'jr-item', '--i:' + i + ';' +
        '--lx:368px;--ly:' + (171 + i * 55.7).toFixed(1) + 'px;' +
        '--gx:' + [368, 777, 1187, 1596][i % 4] + 'px;--gy:' + (130 + Math.floor(i / 4) * 107) + 'px'));
      var tile = put(n, el('span', 'jr-ic', 'background:' + TONE[it[2]][0]));
      put(tile, icon(it[1], 24, TONE[it[2]][1], 'left:50%;top:50%;width:58%;height:58%;transform:translate(-50%,-50%)', 1.8));
      // In the grid, two reports show a preview instead of their icon.
      if (THUMB[it[0]]) { var im = put(tile, el('img', 'jr-thumb')); im.src = THUMB[it[0]]; im.alt = ''; }
      put(n, el('span', 'jr-name', null, it[0]));
      put(n, el('span', 'jr-path jr-path--l', null, path));
      put(n, el('span', 'jr-path jr-path--g', null, shortPath(path)));
      put(n, icon('more', 22, '#1e1e1e', '', 2.6)).setAttribute('class', 'jr-more');
      return n;
    });

    var cur = put(st, el('span', 'jr-cursor'));
    cur.innerHTML = '<svg viewBox="0 0 24 36" width="24" height="36"><path d="M2 2v26l6.5-6 4.2 10 4.3-1.9-4.2-9.7H21z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';

    // Fit.
    function fit() { st.style.transform = 'scale(' + (host.clientWidth / W) + ')'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

    // Play once.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function later(ms, fn) { setTimeout(fn, ms); }
    function point(x, y, ms) {
      cur.style.transitionDuration = ms + 'ms';
      cur.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
    if (reduce) { ui.className = 'jr is-in is-grid is-idle'; return; }
    function play() {
      point(1500, 700, 0);
      later(150,  function () { ui.classList.add('is-in'); });
      later(1600, function () { ui.classList.add('is-cursor'); point(1926, 86, 700); });
      later(2400, function () { ui.classList.add('is-press', 'is-tip'); });
      later(2560, function () { ui.classList.remove('is-press'); ui.classList.add('is-grid'); });
      later(3600, function () { ui.classList.remove('is-tip'); point(1290, 283, 650); });
      later(4300, function () { items[6].classList.add('is-hover'); });
      later(5300, function () { items[6].classList.remove('is-hover'); ui.classList.remove('is-cursor'); });
      later(5600, function () { ui.classList.add('is-idle'); });
    }
    if (window.IntersectionObserver) {
      var seen = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); play(); }
      // A close-up in the grid view shows a small part of the screen, so
      // any of it being in view is enough.
      }, { threshold: host.closest('.mo-chunk') ? 0.01 : 0.25 });
      seen.observe(host);
    } else play();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-reports:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', ''); build(h);
    });
  }
  scan(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
