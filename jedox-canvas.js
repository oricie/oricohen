/* The Jedox Canvas, alive, inside the Jedox sheet.
 *
 * Drawn from two screens of the dashboard builder — the Designer's widget
 * list and the Executive Dashboard it builds — and set on the dotted canvas
 * with the Integrator's floating toolbar, in a quieter palette than either.
 * Coordinates are in the screenshots' 2000-wide frame and scaled up to the
 * 2856-wide stage the other rebuilt screens use.
 *
 * It plays once each time the sheet opens: the dashboard assembles, then a
 * KPI card is picked up from the widget list, carried across and dropped
 * into the empty slot, where it fills in. From then on it has the product's
 * hover states. Nothing opens or navigates.
 */
(function () {
  var STAGE_W = 2856, STAGE_H = 2048, S = 1.428;

  function el(tag, cls, css, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function put(p, c) { p.appendChild(c); return c; }
  // Boxes in the screenshots' frame, placed on the stage.
  function at(x, y, w, h) {
    return 'left:' + x * S + 'px;top:' + y * S + 'px;' +
      (w != null ? 'width:' + w * S + 'px;' : '') + (h != null ? 'height:' + h * S + 'px;' : '');
  }
  var SVG = 'http://www.w3.org/2000/svg';
  function svg(w, h, inner, css, cls) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('width', w); s.setAttribute('height', h);
    if (css) s.style.cssText = css;
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = inner;
    return s;
  }
  var ICON = {
    home:   '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    pen:    '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/><circle cx="11" cy="13" r="1.3"/>',
    chart:  '<path d="M4 20h16"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-4"/>',
    doc:    '<path d="M6 3h8l4 4v14H6z"/><path d="M9 11h2M13 11h2M9 14h2M13 14h2M9 17h2M13 17h2"/>',
    cal:    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    fold:   '<path d="M3 6h7l2 2h9v11H3z"/><path d="M9 14v3M12 12v5M15 13v4"/>',
    db:     '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    users:  '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6"/>',
    cam:    '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    bell:   '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
    spark:  '<path d="M12 3c.5 4.5 3.5 7.5 8 8-4.5.5-7.5 3.5-8 8-.5-4.5-3.5-7.5-8-8 4.5-.5 7.5-3.5 8-8z"/><path d="M19 3v3M17.5 4.5h3"/>',
    gear:   '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 2.6 3-.6.9 2.9 2.8 1.2-.9 2.9 1.6 2.5-2.4 1.9.1 3-3 .4-1.6 2.6L12 19.8l-2.9 2.1-1.6-2.6-3-.4.1-3-2.4-1.9 1.6-2.5-.9-2.9 2.8-1.2.9-2.9 3 .6z"/>',
    menu:   '<path d="M4 7h16M4 12h16M4 17h16"/>',
    right:  '<path d="M9 6l6 6-6 6"/>',
    left:   '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    folder: '<path d="M3 6.5h7l2 2h9V19H3z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    kpi:    '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 12l9 5 9-5M3 16l9 5 9-5"/>',
    bars:   '<path d="M5 20V10M10 20V5M15 20v-8M20 20v-5M3 20h18"/>',
    pulse:  '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    text:   '<path d="M5 5h14M12 5v15M9 20h6"/>',
    table:  '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15M15 4.5v15"/>',
    cog:    '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    down:   '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 20h16"/>',
    save:   '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    more:   '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
    edit:   '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    map:    '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/>',
    focus:  '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    plus:   '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    minus:  '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    chev:   '<path d="M6 9l6 6 6-6"/>',
    arrow:  '<path d="M5 12h12M13 8l4 4-4 4"/>',
    sort:   '<path d="M8 5v14M5 16l3 3 3-3M16 19V5M13 8l3-3 3 3"/>'
  };
  // An icon centred at (cx, cy) in the screenshots' frame, size in that frame too.
  function iconAt(p, name, cx, cy, size, color, sw, fill) {
    var z = size * S;
    return put(p, svg(24, 24, ICON[name],
      'position:absolute;left:' + (cx * S - z / 2) + 'px;top:' + (cy * S - z / 2) + 'px;width:' + z + 'px;height:' + z +
      'px;color:' + color + ';fill:' + (fill || 'none') + ';stroke:' + color + ';stroke-width:' + (sw || 1.6) +
      ';stroke-linecap:round;stroke-linejoin:round'));
  }
  function txt(p, x, y, t, cls, w) {
    return put(p, el('span', 'jc-t ' + (cls || ''), 'left:' + x * S + 'px;top:' + (y - 12) * S + 'px;' + (w ? 'width:' + w * S + 'px;' : ''), t));
  }

  var WIDGETS = [['KPI Card', 'kpi', '#e8edf5', '#3d5475'], ['Scorecard', 'layers', '#e4ecfb', '#3f6fd6'],
                 ['Chart', 'bars', '#ece8f6', '#6a58a6'], ['Sparkline', 'pulse', '#e4ecfb', '#3f6fd6'],
                 ['Text', 'text', '#f7e6ee', '#c65683'], ['Table', 'table', '#e4ecfb', '#3f6fd6']];
  var KPI_X = [474, 853, 1232, 1611];
  var BARS = [[11, 16, 11], [18, 16, 23], [13, 16, 40], [15, 33, 7], [33, 16, 33]];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  var ROWS = [['North America', '$223,000', '$77,000', '$247,000', '$87,000', '$138,000', '$48,000', '$168,000', '$62,000'],
              ['Europe', '$95,000', '$28,000', '$112,000', '$38,000', '$0', '$0', '$0', '$0'],
              ['Asia Pacific', '$164,000', '$47,000', '$0', '$0', '$0', '$0', '$0', '$0']];

  function build(host) {
    host.innerHTML = '';
    var ui = put(host, el('span', 'jc'));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'jc-stage', 'width:' + STAGE_W + 'px;height:' + STAGE_H + 'px'));

    // Rail.
    var rail = put(st, el('span', 'jc-rail', at(0, 0, 66, 1434)));
    put(rail, el('span', 'jc-rail-on', at(8, 70, 50, 54)));
    ['home', 'pen', 'chart', 'doc', 'cal', 'fold', 'db', 'users', 'cam'].forEach(function (n, i) {
      iconAt(rail, n, 33, 38 + i * 58.5, 24, i === 1 ? '#3f6fd6' : '#7b8aa0', 1.6);
    });
    put(rail, el('span', 'jc-rule', at(0, 1228, 66, 0)));
    [['bell', 1270], ['spark', 1322], ['gear', 1375]].forEach(function (r) { iconAt(rail, r[0], 33, r[1], 24, '#7b8aa0', 1.6); });

    // Top bar.
    var top = put(st, el('span', 'jc-top', at(66, 0, 1934, 67)));
    iconAt(st, 'menu', 90, 33, 22, '#2b3445', 2);
    txt(st, 129, 33, 'Canvas', 'jc-crumb');
    iconAt(st, 'right', 210, 33, 18, '#2b3445', 2.2);
    iconAt(st, 'folder', 243, 33, 24, '#2b3445', 1.6);
    txt(st, 267, 33, 'New', 'jc-crumb');
    var sr = put(st, el('span', 'jc-search', at(740, 12, 560, 44)));
    iconAt(st, 'search', 764, 34, 20, '#7b8aa0', 1.8);
    txt(st, 786, 34, 'Search...', 'jc-ph');
    var ai = put(st, el('span', 'jc-ai', at(1720, 12, 136, 44)));
    iconAt(st, 'spark', 1746, 34, 22, '#2f55a8', 1.4, '#2f55a8');
    txt(st, 1768, 34, 'JedoxAI', 'jc-ai-t');
    iconAt(st, 'bell', 1888, 34, 24, '#56657b', 1.6);
    put(st, el('span', 'jc-dot', at(1894, 21, 8, 8)));
    put(st, el('span', 'jc-vr', at(1920, 22, 0, 24)));
    put(st, el('span', 'jc-avatar', at(1942, 18, 34, 34), 'JD'));

    // Widgets panel.
    put(st, el('span', 'jc-side', at(67, 67, 356, 1367)));
    txt(st, 90, 107, 'Widgets', 'jc-h');
    txt(st, 90, 141, 'Drag or click to add', 'jc-sub');
    put(st, el('span', 'jc-rule', at(67, 175, 356, 0)));
    var items = WIDGETS.map(function (w, i) {
      var y = 197 + i * 103;
      var it = put(st, el('span', 'jc-widget', at(90, y, 308, 90)));
      put(it, el('span', 'jc-widget-ic', at(17, 17, 56, 56) + 'background:' + w[2]));
      iconAt(it, w[1], 45, 45, 26, w[3], 1.7);
      put(it, el('span', 'jc-t jc-widget-t', 'left:' + 90 * S + 'px;top:' + 33 * S + 'px', w[0]));
      return it;
    });
    put(st, el('span', 'jc-rule', at(67, 836, 356, 0)));
    txt(st, 90, 872, 'Quick templates', 'jc-h2');
    ['Financial overview', 'Sales metrics', 'Operational KPIs'].forEach(function (t, i) {
      put(st, el('span', 'jc-t jc-link', 'left:' + 101 * S + 'px;top:' + (916 + i * 58) * S + 'px', t));
    });

    // Canvas header.
    put(st, el('span', 'jc-head', at(423, 67, 1577, 85)));
    iconAt(st, 'left', 447, 110, 18, '#3f6fd6', 2);
    txt(st, 460, 110, 'Back to Designer', 'jc-back');
    txt(st, 632, 110, 'Executive Dashboard', 'jc-title');
    var hide = put(st, el('span', 'jc-btn', at(1541, 85, 189, 49)));
    iconAt(st, 'cog', 1569, 110, 20, '#2b3445', 1.6);
    txt(st, 1599, 110, 'Hide Widgets', 'jc-btn-t');
    var exp = put(st, el('span', 'jc-btn', at(1742, 85, 127, 49)));
    iconAt(st, 'down', 1771, 110, 20, '#2b3445', 1.6);
    txt(st, 1793, 110, 'Export', 'jc-btn-t');
    var save = put(st, el('span', 'jc-save', at(1881, 85, 110, 49)));
    iconAt(st, 'save', 1908, 110, 20, '#ffffff', 1.6);
    txt(st, 1932, 110, 'Save', 'jc-save-t');

    // The canvas and what is on it.
    var cv = put(st, el('span', 'jc-canvas', at(423, 152, 1577, 1282)));
    var kpis = KPI_X.map(function (x, i) {
      var k = put(st, el('span', 'jc-card jc-kpi' + (i === 3 ? ' jc-kpi--new' : ''), at(x, 196, 352, 166) + '--i:' + i));
      put(k, el('span', 'jc-t jc-kpi-l', 'left:' + 34 * S + 'px;top:' + 34 * S + 'px', 'Net Revenue'));
      var v = put(k, el('span', 'jc-t jc-kpi-v', 'left:' + 34 * S + 'px;top:' + 62 * S + 'px', '280,270,381'));
      put(k, el('span', 'jc-badge', at(266, 72, 70, 26), '→ 0%'));
      put(k, el('span', 'jc-t jc-kpi-s', 'left:' + 34 * S + 'px;top:' + 108 * S + 'px', 'vs 280,270,381 PY'));
      return { card: k, value: v };
    });
    var slot = put(st, el('span', 'jc-slot', at(1611, 196, 352, 166)));

    // Net revenue.
    var nr = put(st, el('span', 'jc-card jc-panel', at(474, 388, 876, 564)));
    txt(st, 508, 452, 'Net revenue', 'jc-big');
    txt(st, 508, 490, 'Net revenue Jan/Apr 2023', 'jc-sub2');
    iconAt(st, 'more', 1313, 445, 26, '#3a4556', 1.6, '#3a4556');
    var g = '';
    for (var t = 0; t <= 10; t++) g += '<path d="M' + (630 + t * 62.6) * S + ' ' + 512 * S + 'V' + 860 * S + '" stroke="#e7ebf1" stroke-width="2"/>';
    g += '<path d="M' + 630 * S + ' ' + 512 * S + 'V' + 860 * S + '" stroke="#c9d1dd" stroke-width="2"/>';
    var COL = ['#2e3f63', '#dde7f7', '#4a78d8'];
    BARS.forEach(function (b, i) {
      var y = (513 + i * 80) * S, x = 630 * S;
      b.forEach(function (v, j) {
        var w = v * 6.26 * S;
        g += '<rect class="jc-bar" style="--i:' + i + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + 27 * S + '" fill="' + COL[j] + '"/>';
        x += w;
      });
    });
    put(st, svg(STAGE_W, STAGE_H, g, 'position:absolute;left:0;top:0', 'jc-plot'));
    MONTHS.forEach(function (m, i) { put(st, el('span', 'jc-t jc-axis', 'right:' + (STAGE_W - 598 * S) + 'px;top:' + (515 + i * 80 - 2) * S + 'px', m)); });
    for (var a = 0; a <= 10; a++) put(st, el('span', 'jc-t jc-axis jc-c', 'left:' + (630 + a * 66.8 - 30) * S + 'px;top:' + 872 * S + 'px;width:' + 60 * S + 'px', String(a * 10)));
    put(st, el('span', 'jc-t jc-axis jc-vert', 'left:' + 505 * S + 'px;top:' + 690 * S + 'px', 'Months'));
    [['#4a78d8', 'Product 1', 603], ['#c7d8f6', 'Product 2', 851], ['#2e3f63', 'Product 3', 1103]].forEach(function (l) {
      put(st, el('span', 'jc-ldot', at(l[2], 900, 14, 14) + 'background:' + l[0]));
      txt(st, l[2] + 22, 908, l[1], 'jc-legend');
    });

    // Revenue by region.
    put(st, el('span', 'jc-card jc-panel', at(1383, 388, 580, 564)));
    txt(st, 1441, 461, 'Revenue by Region', 'jc-h2');
    var cx = 1625 * S, cy = 712 * S, r = 110 * S, pie = '', a0 = -Math.PI * 0.7;
    [[0.34, '#2e3f63'], [0.18, '#4a78d8'], [0.22, '#d46a93'], [0.26, '#6a58a6']].forEach(function (p, i) {
      var a1 = a0 + p[0] * Math.PI * 2, big = p[0] > 0.5 ? 1 : 0;
      pie += '<path class="jc-slice" style="--i:' + i + ';transform-origin:' + cx + 'px ' + cy + 'px" d="M' + cx + ' ' + cy + 'L' + (cx + r * Math.cos(a0)) + ' ' + (cy + r * Math.sin(a0)) +
        'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + (cx + r * Math.cos(a1)) + ' ' + (cy + r * Math.sin(a1)) + 'z" fill="' + p[1] + '" stroke="#fff" stroke-width="3"/>';
      a0 = a1;
    });
    put(st, svg(STAGE_W, STAGE_H, pie, 'position:absolute;left:0;top:0', 'jc-pie'));
    [['North America', 1686, 581, '#2e3f63'], ['Latin America', 1750, 768, '#3f6fd6'], ['Asia Pacific', 1524, 845, '#c65683'], ['Europe', 1438, 697, '#6a58a6']].forEach(function (l) {
      txt(st, l[1], l[2], l[0], 'jc-pl').style.color = l[3];
    });

    // Table.
    var tb = put(st, el('span', 'jc-card jc-table', at(474, 976, 1489, 405)));
    put(tb, el('span', 'jc-thead', at(0, 0, 1489, 96)));
    txt(tb, 22, 25, 'Region / Product', 'jc-th');
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(function (q, i) {
      var x = 242 + i * 296;
      put(tb, el('span', 'jc-vl', at(x, 0, 0, 405)));
      txt(tb, x + 124, 25, q, 'jc-th');
      iconAt(tb, 'sort', x + 167, 25, 14, '#9aa6b8', 1.6);
      txt(tb, x + 24, 75, 'Revenue', 'jc-sub-h');
      txt(tb, x + 178, 75, 'Profit', 'jc-sub-h');
      put(tb, el('span', 'jc-vl jc-vl--s', at(x + 154, 48, 0, 357)));
    });
    var rows = [];
    for (var ri = 0; ri < 6; ri++) {
      var row = ROWS[Math.min(ri, 2)], y = 97 + ri * 51.5;
      var rr = put(tb, el('span', 'jc-tr', at(0, y, 1489, 51) + '--i:' + ri));
      if (ri < 3) {
        iconAt(rr, 'right', 33, 25, 16, '#6b778a', 2);
        txt(rr, 56, 26, row[0], 'jc-td');
      }
      for (var c = 0; c < 8; c++) txt(rr, 242 + Math.floor(c / 2) * 296 + (c % 2 ? 178 : 24), 26, ri < 3 ? row[c + 1] : ROWS[2][c + 1], c % 2 ? 'jc-td jc-blue' : 'jc-td');
      rows.push(rr);
    }

    // The floating toolbar, as on the Integrator.
    var tbar = put(st, el('span', 'jc-tools', at(1030, 1300, 378, 64)));
    put(tbar, el('span', 'jc-tools-on', at(10, 10, 44, 44)));
    [['edit', 32, '#3f6fd6'], ['map', 82], ['focus', 132], ['plus', 198], ['minus', 248]].forEach(function (z) {
      iconAt(tbar, z[0], z[1], 32, 24, z[2] || '#3a4556', 1.6);
    });
    put(tbar, el('span', 'jc-vr', at(165, 21, 0, 22)));
    var zsel = put(tbar, el('span', 'jc-zoom', at(278, 10, 90, 44)));
    txt(zsel, 12, 22, '100%', 'jc-td');
    iconAt(zsel, 'chev', 72, 22, 16, '#3a4556', 2);

    // The piece being carried, and the pointer carrying it.
    var ghost = put(st, el('span', 'jc-card jc-kpi jc-ghost', at(90, 197, 352, 166)));
    put(ghost, el('span', 'jc-t jc-kpi-l', 'left:' + 34 * S + 'px;top:' + 34 * S + 'px', 'Net Revenue'));
    put(ghost, el('span', 'jc-t jc-kpi-v jc-kpi-v--ghost', 'left:' + 34 * S + 'px;top:' + 62 * S + 'px', '—'));
    var cur = put(st, svg(24, 36,
      '<path d="M2 2v26l6.5-6 4.2 10 4.3-1.9-4.2-9.7H21z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
      'position:absolute;left:0;top:0;width:' + 26 * S + 'px;height:' + 39 * S + 'px', 'jc-cursor'));

    // Fit.
    function fit() { st.style.transform = 'scale(' + (host.clientWidth / STAGE_W) + ')'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

    // Play once.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timers = [];
    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function pointTo(x, y, ms) {
      cur.style.transitionDuration = ms + 'ms';
      cur.style.transform = 'translate(' + (x * S - 3) + 'px,' + (y * S - 3) + 'px)';
    }
    // The piece leaves the list at the list item's size and grows to its
    // own on the way over.
    function carry(x, y, ms, k) {
      ghost.style.transitionDuration = ms + 'ms';
      ghost.style.transform = 'translate(' + (x - 90) * S + 'px,' + (y - 197) * S + 'px) scale(' + (k || 1) + ')';
    }
    function count(node, ms) {
      var t0 = performance.now(), target = 280270381;
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        node.textContent = Math.round(target * e).toLocaleString('en-US');
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    var REST = 'jc is-in is-dropped is-idle';
    function settle() { ui.className = REST; }
    function play() {
      ui.className = 'jc is-resetting';
      pointTo(250, 330, 0); carry(90, 197, 0, 0.55);
      void ui.offsetWidth;
      ui.classList.remove('is-resetting');
      later(150,  function () { ui.classList.add('is-in'); });
      later(2300, function () { ui.classList.add('is-cursor'); pointTo(215, 244, 700); });
      later(3100, function () { ui.classList.add('is-grab'); items[0].classList.add('is-held'); });
      later(3350, function () { ui.classList.add('is-carry'); pointTo(1760, 262, 1300); carry(1611, 196, 1300); });
      later(3600, function () { ui.classList.add('is-target'); });
      later(4700, function () {
        ui.classList.remove('is-carry', 'is-grab', 'is-target'); ui.classList.add('is-dropped');
        items[0].classList.remove('is-held'); count(kpis[3].value, 1300);
      });
      later(5200, function () { pointTo(1860, 520, 900); });
      later(6000, function () { ui.classList.remove('is-cursor'); });
      later(6400, function () { ui.classList.add('is-idle'); });
    }
    if (reduce) { settle(); return; }
    if (window.IntersectionObserver) {
      var seen = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); play(); }
      }, { threshold: 0.25 });
      seen.observe(host);
    } else play();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-canvas:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', ''); build(h);
    });
  }
  scan(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
