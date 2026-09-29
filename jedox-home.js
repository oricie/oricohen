/* The Jedox workspace home, alive, inside the Jedox sheet.
 *
 * Same method as the card covers: the screen is rebuilt at the size of the
 * original screenshot — 2880 by 2048, positions and colours measured off
 * it — and scaled to its frame. The people's photos and two small dashboard
 * previews are the screenshot's own pixels, as they are images in the
 * product too; everything else is built here.
 *
 * One pass: the greeting types itself, the quick starts and the workspace
 * come in, the list fills, the tabs are looked through, and a document
 * that has just gone into review arrives at the top of the list. It ends on
 * the screenshot's own frame, holds, and starts again.
 *
 * The sheet builds its content from a <template> each time it opens, so
 * this watches for the frame to appear rather than looking for it once.
 */
(function () {
  var STAGE_W = 2880, STAGE_H = 2048;

  function el(tag, cls, css, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function put(parent, child) { parent.appendChild(child); return child; }
  function at(x, y, w, h) {
    return 'left:' + x + 'px;top:' + y + 'px;' +
           (w != null ? 'width:' + w + 'px;' : '') + (h != null ? 'height:' + h + 'px;' : '');
  }
  var SVG = 'http://www.w3.org/2000/svg';
  function svg(w, h, inner, css) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('width', w); s.setAttribute('height', h);
    if (css) s.style.cssText = css;
    s.innerHTML = inner;
    return s;
  }

  var ICON = {
    home:   '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    pen:    '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/><circle cx="11" cy="13" r="1.3"/>',
    chart:  '<path d="M4 20h16"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-4"/>',
    doc:    '<path d="M6 3h8l4 4v14H6z"/><path d="M9 12h6M9 16h6"/>',
    sheet:  '<path d="M6 3h8l4 4v14H6z"/><path d="M9 11h2M13 11h2M9 14h2M13 14h2M9 17h2M13 17h2"/>',
    cal:    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    fold:   '<path d="M3 6h7l2 2h9v11H3z"/><path d="M9 14v3M12 12v5M15 13v4"/>',
    db:     '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    users:  '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6"/>',
    cam:    '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    bell:   '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
    spark:  '<path d="M12 3c.5 4.5 3.5 7.5 8 8-4.5.5-7.5 3.5-8 8-.5-4.5-3.5-7.5-8-8 4.5-.5 7.5-3.5 8-8z"/><path d="M19 3v3M17.5 4.5h3"/>',
    gear:   '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 2.6 3-.6.9 2.9 2.8 1.2-.9 2.9 1.6 2.5-2.4 1.9.1 3-3 .4-1.6 2.6L12 19.8l-2.9 2.1-1.6-2.6-3-.4.1-3-2.4-1.9 1.6-2.5-.9-2.9 2.8-1.2.9-2.9 3 .6z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    tools:  '<path d="M4 20l6-6M14 4l6 6-3 3-6-6zM4 4l4 1 11 11 1 4-4-1L5 8z"/>',
    integ:  '<ellipse cx="11" cy="6" rx="7" ry="3"/><path d="M4 6v10c0 1.7 3.1 3 7 3M18 6v5M4 11c0 1.7 3.1 3 7 3"/><path d="M14 18h7M18.5 15.5 21 18l-2.5 2.5"/>',
    dyna:   '<rect x="3.5" y="3.5" width="7" height="9" rx="1"/><rect x="13.5" y="3.5" width="7" height="5" rx="1"/><rect x="3.5" y="15.5" width="7" height="5" rx="1"/><rect x="13.5" y="11.5" width="7" height="9" rx="1"/>',
    canvas: '<rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke-dasharray="2.6 2.6"/>',
    pie:    '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3v9h9a9 9 0 0 0-9-9z"/>',
    flow:   '<circle cx="12" cy="6" r="3"/><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M10.5 8.6 7.5 14.4M13.5 8.6l3 5.8M9 17h6"/>',
    clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    grid:   '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M3.5 9.5h17M3.5 15h17M9.5 3.5v17M15 3.5v17"/>',
    star:   '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    tiles:  '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    cmt:    '<path d="M4 5h16v11H9l-5 4z"/>',
    more:   '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>'
  };
  function iconAt(name, cx, cy, size, color, sw, fill) {
    return svg(24, 24, ICON[name],
      'position:absolute;left:' + (cx - size / 2) + 'px;top:' + (cy - size / 2) + 'px;width:' + size +
      'px;height:' + size + 'px;fill:' + (fill || 'none') + ';stroke:' + color + ';stroke-width:' + (sw || 1.6) +
      ';stroke-linecap:round;stroke-linejoin:round');
  }

  var GREETING = 'Hi Dominik! have a quick start in Jedox CX';
  var AV = { SJ: '#90a1b9', MC: '#90a1b9', EW: '#314158', DM: '#155dfc' };
  var ROWS = [
    ['New Canvas (5)', 'grey', 'In review', 1, ['SJ', 'MC', 'EW'], 'Nov 18, 2024'],
    ['New Canvas (2)', 'grey', null, 0, ['MC', 'SJ'], 'Nov 17, 2024'],
    ['New Canvas', 'grey', null, 0, ['SJ'], 'Nov 16, 2024'],
    ['Jedox', 'purple', 'Published', 1, ['DM', 'SJ', 'MC'], 'Nov 15, 2024'],
    ['01Onboarding Test', 'grey', 'Draft', 0, ['EW'], 'Nov 14, 2024'],
    ['Bikers Best Navigation', 'purple', null, 1, ['MC', 'DM'], 'Nov 12, 2024'],
    ['365', 'navy', null, 0, ['SJ', 'MC', 'EW', 'DM'], 'Nov 10, 2024'],
    ['Finance Cockpit', 'purple', 'Published', 1, ['DM', 'SJ'], 'Nov 8, 2024'],
    ['Profit & Loss (DynamicRange)', 'navy', null, 0, ['EW', 'DM'], 'Nov 5, 2024']
  ];
  var DOC = { grey: ['doc', '#90a1b9'], purple: ['doc', '#5c3c8e'], navy: ['sheet', '#00355e'] };
  var BADGE = { 'In review': 'jh-badge--review', Published: 'jh-badge--pub', Draft: 'jh-badge--draft' };

  function build(host) {
    host.innerHTML = '';
    var ui = put(host, el('span', 'jh'));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'jh-stage', 'width:' + STAGE_W + 'px;height:' + STAGE_H + 'px'));

    // Rail.
    var rail = put(st, el('span', 'jh-rail', at(0, 0, 95, STAGE_H)));
    put(rail, el('span', 'jh-rail-on', at(12, 16, 70, 80)));
    ['home', 'pen', 'chart', 'doc', 'cal', 'fold', 'db', 'users', 'cam'].forEach(function (n, i) {
      put(rail, iconAt(n, 47, 55 + i * 84, 38, i === 0 ? '#155dfc' : '#62748e', 1.7));
    });
    put(rail, el('span', 'jh-rule', at(0, 1766, 95, 0)));
    [['bell', 1827], ['spark', 1904], ['gear', 1980]].forEach(function (r) {
      put(rail, iconAt(r[0], 47, r[1], 38, '#62748e', 1.7));
    });

    // Top bar.
    var top = put(st, el('span', 'jh-top', at(95, 0, STAGE_W - 95, 95)));
    put(top, el('span', 'jh-top-t', at(40, 0, null, 94), 'Home'));
    var sr = put(top, el('span', 'jh-search', at(951, 16, 860, 62)));
    put(sr, iconAt('search', 34, 31, 30, '#62748e', 1.8));
    put(sr, el('span', 'jh-ph', at(64, 0, null, 60), 'Search...'));
    var ai = put(top, el('span', 'jh-ai', at(2349, 16, 197, 64)));
    put(ai, iconAt('spark', 38, 32, 34, '#0042ae', 1.4, '#0042ae'));
    put(ai, el('span', null, at(70, 0, null, 64), 'JedoxAI'));
    put(top, iconAt('bell', 2595, 47, 34, '#45556c', 1.7));
    put(top, el('span', 'jh-dot', at(2602, 27, 12, 12)));
    put(top, el('span', 'jh-vr', at(2643, 32, 0, 30)));
    put(top, el('span', 'jh-avatar', at(2673, 23, 48, 48), 'JD'));

    // Everything below the bar is the part that plays.
    var cv = put(st, el('span', 'jh-canvas', at(96, 96, STAGE_W - 96, STAGE_H - 96)));
    function C(x, y) { return [x - 96, y - 96]; }

    // Quick start.
    var q = C(165, 149);
    var qs = put(cv, el('span', 'jh-card', at(q[0], q[1], 2602, 264)));
    var hi = put(qs, el('span', 'jh-h', at(33, 30, null, 50)));
    var TILES = [['Spreadsheet', 'tools'], ['Integration', 'integ'], ['Dynatable', 'dyna'],
                 ['Canvas', 'canvas'], ['Chart', 'pie'], ['Workflow', 'flow']];
    var TX = [197, 621, 1045, 1473, 1901, 2325], TW = [402, 402, 406, 406, 402, 402];
    var tiles = TILES.map(function (t, i) {
      var tl = put(qs, el('span', 'jh-tile', at(TX[i] - 165, 127, TW[i], 104) + '--i:' + i));
      put(tl, iconAt(t[1], 51, 52, 44, '#20355f', 1.6));
      put(tl, el('span', 'jh-tile-t', at(101, 0, null, 102), t[0]));
      return tl;
    });

    // From your workspace.
    var w = C(165, 441);
    var ws = put(cv, el('span', 'jh-card', at(w[0], w[1], 2602, 464)));
    put(ws, el('span', 'jh-h', at(32, 30, null, 50), 'From your workspace'));
    var wsr = put(ws, el('span', 'jh-search jh-search--sm', at(2321, 17, 245, 64)));
    put(wsr, el('span', 'jh-ph', at(15, 0, null, 60), 'Search'));
    var CARDS = [
      [197, 472, 'pie', 'woman', 'Product sales - Europe', null],
      [701, 490, 'sales', 'man', 'Sales Performance', 'Updated 1h ago'],
      [1223, 490, 'strategy', 'man', 'Product sales - Europe', 'Updated 2 days ago'],
      [1745, 472, 'table', 'man', 'Comparison 23/24', null],
      [2249, 472, 'table', 'man', 'Comparison 23/24', null]
    ];
    CARDS.forEach(function (c, i) {
      var k = put(ws, el('span', 'jh-wcard', at(c[0] - 165, 100, c[1], 330) + '--i:' + i));
      var th = put(k, el('span', 'jh-thumb', at(31, 31, c[1] - 62, 188)));
      if (c[2] === 'pie') pie(th);
      else if (c[2] === 'table') table(th);
      else put(th, el('img', null, 'position:absolute;left:0;top:0;width:100%;height:100%')).src =
        'images/home-th-' + c[2] + '.webp';
      var av = put(k, el('img', 'jh-face', at(32, 237, 64, 64)));
      av.src = 'images/home-av-' + c[3] + '.webp'; av.alt = '';
      put(k, el('span', c[5] ? 'jh-wt jh-wt--dark' : 'jh-wt', at(112, c[5] ? 236 : 252, null, 36), c[4]));
      if (c[5]) put(k, el('span', 'jh-ws', at(112, 274, null, 34), c[5]));
      put(k, iconAt('more', c[1] - 34, 270, 36, '#212b36', 1.8, '#212b36'));
    });

    // Tabs.
    var tabs = put(cv, el('span', 'jh-tabs', at(168 - 96, 930 - 96, 2599, 74)));
    [['clock', 'Recent', 56, 89], ['grid', 'Models', 276, 309], ['star', 'Pinned', 500, 533]].forEach(function (t, i) {
      put(tabs, iconAt(t[0], t[2], 30, 34, i === 0 ? '#0f172b' : '#45556c', 1.7));
      put(tabs, el('span', 'jh-tab' + (i === 0 ? ' is-on' : ''), at(t[3], 0, null, 60), t[1]));
    });
    put(tabs, iconAt('tiles', 719, 30, 34, '#45556c', 1.7));
    put(tabs, el('span', 'jh-tabline', at(0, 72, 2599, 0)));
    var ul = put(tabs, el('span', 'jh-ul', at(0, 68, 218, 5)));

    // Recent list.
    var t = C(169, 1044);
    var tb = put(cv, el('span', 'jh-table', at(t[0], t[1], 2598, 1010)));
    var th = put(tb, el('span', 'jh-thead', at(0, 0, 2598, 83)));
    put(th, el('span', 'jh-th', at(49, 0, null, 82), 'Name'));
    put(th, el('span', 'jh-th', at(1573, 0, null, 82), 'Collaborators'));
    put(th, el('span', 'jh-th', at(2101, 0, null, 82), 'Modified'));
    var body = put(tb, el('span', 'jh-tbody', at(0, 84, 2598, 1000)));
    var rows = ROWS.map(function (r, i) {
      var row = put(body, el('span', 'jh-tr' + (i === 0 ? ' jh-tr--new' : ''), at(0, i * 106, 2598, 106) + '--i:' + i));
      var d = DOC[r[1]];
      put(row, iconAt(d[0], 69, 53, 36, d[1], 1.6));
      var nm = put(row, el('span', 'jh-name', at(114, 0, null, 106)));
      put(nm, el('span', 'jh-name-t', null, r[0]));
      if (r[2]) put(nm, el('span', 'jh-badge ' + BADGE[r[2]], null, r[2]));
      if (r[3]) put(nm, svg(24, 24, ICON.cmt, 'width:32px;height:32px;fill:none;stroke:#90a1b9;stroke-width:1.6;stroke-linejoin:round;flex:none'));
      r[4].forEach(function (p, j) {
        put(row, el('span', 'jh-av', at(1573 + j * 52, 25, 56, 56) + 'background:' + AV[p] + ';--j:' + j, p));
      });
      put(row, el('span', 'jh-date', at(2101, 0, null, 106), r[5]));
      return row;
    });

    // Fit.
    function fit() { st.style.transform = 'scale(' + (host.clientWidth / STAGE_W) + ')'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

    // Play.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timers = [], running = false;
    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function stop() { timers.forEach(clearTimeout); timers = []; running = false; }
    function type(i) {
      if (!running) return;
      hi.textContent = GREETING.slice(0, i);
      if (i < GREETING.length) later(38, function () { type(i + 1); });
    }
    function tab(i) {
      ul.style.transform = 'translateX(' + [0, 220, 444][i] + 'px)';
      ul.style.width = [218, 222, 218][i] + 'px';
      tabs.querySelectorAll('.jh-tab').forEach(function (n, k) { n.classList.toggle('is-on', k === i); });
      ui.classList.toggle('is-away', i !== 0);
    }
    var FULL = 'jh is-tiles is-cards is-rows is-new';
    function settle() { ui.className = FULL; hi.textContent = GREETING; tab(0); }
    function play() {
      stop(); running = true;
      ui.className = 'jh is-resetting is-leaving';
      hi.textContent = ''; tab(0);
      void ui.offsetWidth;
      ui.classList.remove('is-resetting');
      later(60,    function () { ui.classList.remove('is-leaving'); });
      later(200,   function () { type(0); ui.classList.add('is-tiles'); });
      later(1500,  function () { ui.classList.add('is-cards'); });
      later(2700,  function () { ui.classList.add('is-rows'); });
      later(4600,  function () { tab(1); });
      later(5600,  function () { tab(2); });
      later(6600,  function () { tab(0); });
      later(7600,  function () { ui.classList.add('is-new'); });
      later(12800, function () { ui.classList.add('is-leaving'); });
      later(13400, play);
    }
    if (reduce) { settle(); return; }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !running) play();
          else if (!e.isIntersecting && running) { stop(); settle(); }
        });
      }, { threshold: 0.25 }).observe(host);
    } else play();
  }

  // The pie in the first preview: five slices that sweep round.
  function pie(host) {
    var S = [[0.3911, '#1f5fe8'], [0.2802, '#6c9ef0'], [0.2313, '#9dbdf5'], [0.0600, '#cbdcfa'], [0.0374, '#15295a']];
    var cx = 88, cy = 94, r = 72, a0 = -Math.PI / 2, g = '';
    S.forEach(function (s, i) {
      var a1 = a0 + s[0] * Math.PI * 2;
      var big = a1 - a0 > Math.PI ? 1 : 0;
      g += '<path class="jh-slice" style="--i:' + i + '" d="M' + cx + ' ' + cy + 'L' + (cx + r * Math.cos(a0)) + ' ' + (cy + r * Math.sin(a0)) +
           'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + (cx + r * Math.cos(a1)) + ' ' + (cy + r * Math.sin(a1)) + 'z" fill="' + s[1] + '"/>';
      a0 = a1;
    });
    var L = [['Brasil', '39.11%', '#1f5fe8'], ['USA', '28.02%', '#2563eb'], ['Canada', '23.13%', '#6c9ef0'],
             ['UK', '23.13%', '#9dbdf5'], ['Australia', '26.12%', '#cbdcfa']];
    L.forEach(function (l, i) {
      var y = 28 + i * 33;
      g += '<circle cx="180" cy="' + y + '" r="4.5" fill="' + l[2] + '"/><text x="193" y="' + (y + 4) + '" font-size="11" fill="#1f2937">' + l[0] +
           '</text><text x="249" y="' + (y + 4) + '" font-size="9" fill="#4b5563">' + l[1] + '</text>';
    });
    put(host, svg(410, 188, '<rect x="0.5" y="0.5" width="409" height="187" fill="#fff" stroke="#dde3ed"/><g transform="translate(0 0)">' + g + '</g>',
      'position:absolute;left:0;top:0;width:100%;height:100%'));
  }

  // The comparison previews: a small table.
  function table(host) {
    var R = [['Product', '2023', '2024'], ['Trekking-2000 Blue...', '44,896', '50,890'], ['Off-Road-100 Blue...', '37,788', '44,061'],
             ['Off-Road-500 Red 40', '30,117', '33,127'], ['Cross-150 Silver 44', '8,535', '14,354']];
    var g = '<rect x="0.5" y="0.5" width="409" height="186" fill="#fff" stroke="#dde3ed"/><rect x="1" y="1" width="408" height="38" fill="#e3ebfd"/>';
    R.forEach(function (r, i) {
      var y = 25 + i * 38;
      if (i) g += '<path d="M1 ' + (i * 38 + 1) + 'H409" stroke="#dde3ed"/>';
      g += '<text x="8" y="' + y + '" font-size="11.5" font-weight="600" fill="#111827">' + r[0] + '</text>' +
           '<text x="334" y="' + y + '" font-size="11.5" font-weight="' + (i ? 400 : 600) + '" text-anchor="end" fill="#111827">' + r[1] + '</text>' +
           '<text x="408" y="' + y + '" font-size="11.5" font-weight="' + (i ? 400 : 600) + '" text-anchor="end" fill="#111827">' + r[2] + '</text>';
    });
    g += '<path d="M256 1V187M342 1V187" stroke="#dde3ed"/>';
    put(host, svg(410, 188, g, 'position:absolute;left:0;top:0;width:100%;height:100%'));
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-home:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', '');
      build(h);
    });
  }
  scan(document);
  if (window.MutationObserver) {
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
