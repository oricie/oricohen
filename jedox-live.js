/* The Jedox card plays a slice of the product rather than showing a still.
 *
 * The interface is rebuilt at the size of the original screenshot — 1428
 * by 700, measured off it pixel by pixel — and the whole stage is scaled
 * down to the card, exactly as the screenshot was. Built at card size it
 * would have been four times too large and read as a close-up of a
 * different product.
 *
 * One pass: the charts fill in, the table settles, a question goes to
 * JedoxAI and it works through it. Then it fades and starts again.
 */
(function () {
  var host = document.querySelector('.work-screen--live');
  if (!host) return;

  var STAGE_W = 1428, STAGE_H = 700;

  function el(tag, cls, css, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function put(parent, child) { parent.appendChild(child); return child; }
  var at = function (x, y, w, h) {
    return 'left:' + x + 'px;top:' + y + 'px;' +
           (w != null ? 'width:' + w + 'px;' : '') + (h != null ? 'height:' + h + 'px;' : '');
  };

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
    home:  '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    pen:   '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    chart: '<path d="M4 20h16"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-4"/>',
    doc:   '<path d="M6 3h8l4 4v14H6z"/><path d="M9 12h6M9 16h6"/>',
    cal:   '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    fold:  '<path d="M3 6h7l2 2h9v11H3z"/><path d="M9 14h2v3H9zM13 12h2v5h-2z"/>',
    db:    '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6"/>',
    cam:   '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    bell:  '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
    hist:  '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7"/><path d="M4 4v4.7h4.7"/><path d="M12 8v4.5l3 2"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev:  '<path d="M7 10l5 5 5-5"/>',
    right: '<path d="M10 7l5 5-5 5"/>',
    sort:  '<path d="M8 5v14M5 16l3 3 3-3M16 19V5M13 8l3-3 3 3"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>'
  };
  function icon(name, size, color, sw, css) {
    return svg(24, 24, ICON[name], 'width:' + size + 'px;height:' + size + 'px;fill:none;stroke:' + color +
      ';stroke-width:' + (sw || 1.7) + ';stroke-linecap:round;stroke-linejoin:round;' + (css || ''));
  }
  function sparkle(size, color, css) {
    return svg(24, 24,
      '<path d="M12 1.5c.6 5.6 4.9 9.9 10.5 10.5-5.6.6-9.9 4.9-10.5 10.5C11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5z" fill="' + color + '"/>',
      'width:' + size + 'px;height:' + size + 'px;' + (css || ''));
  }

  /* ── Build ─────────────────────────────────────────────────────────── */
  host.innerHTML = '';
  var ui = put(host, el('span', 'ui'));
  ui.setAttribute('aria-hidden', 'true');
  var st = put(ui, el('span', 'ui-stage', 'width:' + STAGE_W + 'px;height:' + STAGE_H + 'px'));

  // Left rail.
  var rail = put(st, el('span', 'ui-rail', at(0, 0, 47, STAGE_H)));
  put(rail, el('span', 'ui-rail-on', at(8, 11, 31, 31)));
  ['home', 'pen', 'chart', 'doc', 'cal', 'fold', 'db', 'users', 'cam'].forEach(function (n, i) {
    put(rail, icon(n, 17, i === 0 ? '#005cce' : '#62748e', 1.7,
      'position:absolute;left:15px;top:' + (19 + i * 42) + 'px'));
  });

  // Top bar.
  var top = put(st, el('span', 'ui-top', at(47, 0, STAGE_W - 47, 47)));
  var crumb = put(top, el('span', 'ui-crumb', at(21, 0, null, 47)));
  crumb.innerHTML = '<i>Home</i><b>›</b><i>Reports</i><b>›</b><em>Q4 2024 Financial Review</em>';
  var search = put(top, el('span', 'ui-search', at(476, 8, 429, 31)));
  put(search, icon('search', 14, '#62748e', 1.8, 'position:absolute;left:11px;top:8px'));
  put(search, el('span', null, 'position:absolute;left:31px;top:0;line-height:31px', 'Search...'));
  var pill = put(top, el('span', 'ui-pill', at(1175, 8, 99, 31)));
  put(pill, sparkle(14, '#0042ae', 'position:absolute;left:11px;top:8.5px'));
  put(pill, el('span', null, 'position:absolute;left:34px;top:0;line-height:31px', 'JedoxAI'));
  put(top, icon('bell', 17, '#45556c', 1.7, 'position:absolute;left:1289px;top:15px'));
  put(top, el('span', 'ui-dot', at(1302, 13, 6, 6)));
  put(top, el('span', 'ui-sep', at(1321, 15, 1, 17)));
  var av = put(top, el('span', 'ui-avatar', at(1334, 10, 27, 27), 'JD'));

  // Filters.
  [['Scenario:', 'Forecast Q1', 81, 197], ['Region:', 'All', 291, 121],
   ['Year:', 'FY 24', 427, 127], ['Department:', 'All', 568, 181]].forEach(function (f, i) {
    var p = put(st, el('span', 'ui-filter', at(f[2], 81, f[3], 36)));
    put(p, el('span', 'ui-filter-k', null, f[0]));
    put(p, el('span', 'ui-filter-v', i === 3 ? 'margin-left:auto' : null, f[1]));
    put(p, icon('chev', 13, '#45556c', 1.8, 'flex:none;margin-left:' + (i === 3 ? '10px' : 'auto')));
  });

  // Revenue card.
  var rev = put(st, el('span', 'ui-card', at(81, 142, 648, 326)));
  put(rev, el('span', 'ui-card-t', at(20, 12), 'Revenue Forecast vs. Actuals'));
  var PLOT = { x: 85, y: 74, w: 537, h: 197 };           // 0..1600
  [1600, 1200, 800, 400, 0].forEach(function (v, i) {
    var y = PLOT.y + i * PLOT.h / 4;
    put(rev, el('span', 'ui-grid-h', at(PLOT.x, y, PLOT.w, 0)));
    put(rev, el('span', 'ui-axis-l', 'right:' + (648 - PLOT.x + 7) + 'px;top:' + (y - 7) + 'px', String(v)));
  });
  put(rev, el('span', 'ui-axis-y', at(PLOT.x, PLOT.y, 0, PLOT.h)));
  put(rev, el('span', 'ui-axis-x', at(PLOT.x, PLOT.y + PLOT.h, PLOT.w, 0)));
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var BAR = [933, 1113, 1212, 1096, 1194, 1264, 1165, 1299, 1212, 1368, 1299];
  var LINE = [1090, 1130, 1230, 1112, 1287, 1316, 1200, 1356, 1287, 1432, 1316, 1484];
  var DASH = [1120, 1154, 1247, 1130, 1310, 1333, 1223, 1380, 1310, 1461, 1339, 1507];
  var cx = function (i) { return 107.5 + i * 44.8; };
  var cy = function (v) { return PLOT.y + PLOT.h - v / 1600 * PLOT.h; };
  MONTHS.forEach(function (m, i) {
    put(rev, el('span', 'ui-grid-v', at(cx(i), PLOT.y, 0, PLOT.h)));
    put(rev, el('span', 'ui-axis-m', 'left:' + (cx(i) - 20) + 'px;top:' + (PLOT.y + PLOT.h + 6) + 'px', m));
    if (i < BAR.length) {
      var hgt = BAR[i] / 1600 * PLOT.h;
      put(rev, el('span', 'ui-bar', at(cx(i) - 17, PLOT.y + PLOT.h - hgt, 34, hgt) + '--i:' + i));
    }
  });
  function path(vals) {
    return vals.map(function (v, i) { return (i ? 'L' : 'M') + cx(i).toFixed(1) + ' ' + cy(v).toFixed(1); }).join(' ');
  }
  function dots(vals, color) {
    return vals.map(function (v, i) {
      return '<circle cx="' + cx(i).toFixed(1) + '" cy="' + cy(v).toFixed(1) + '" r="3.2" fill="#fff" stroke="' + color + '" stroke-width="1.6"/>';
    }).join('');
  }
  put(rev, svg(648, 326,
    '<path class="ui-line ui-line--dash" d="' + path(DASH) + '" fill="none" stroke="#a9bfdf" stroke-width="2.2" stroke-dasharray="6 5"/>' +
    '<path class="ui-line ui-line--solid" d="' + path(LINE) + '" fill="none" stroke="#6b9bd1" stroke-width="2.2"/>' +
    '<g class="ui-dots">' + dots(DASH, '#a9bfdf') + dots(LINE, '#6b9bd1') + '</g>',
    'position:absolute;left:0;top:0;overflow:visible'));

  // OPEX card — it runs on under the AI panel, as in the product.
  var opx = put(st, el('span', 'ui-card', at(745, 142, 470, 326)));
  put(opx, el('span', 'ui-card-t', at(21, 12), 'OPEX Summary'));
  var OP = { x: 86, y: 74, w: 380, h: 197 };             // 0..380
  [380, 285, 190, 95, 0].forEach(function (v, i) {
    var y = OP.y + i * OP.h / 4;
    put(opx, el('span', 'ui-axis-l', 'right:' + (470 - OP.x + 7) + 'px;top:' + (y - 7) + 'px', String(v)));
  });
  put(opx, el('span', 'ui-axis-y', at(OP.x, OP.y, 0, OP.h)));
  put(opx, el('span', 'ui-axis-x', at(OP.x, OP.y + OP.h, OP.w, 0)));
  var STACK = [[.482, .707, .826, .924], [.507, .746, .880, .982], [.496, .728, .859, .953]];
  var SHADES = ['#00355e', '#4a6b88', '#6b9bd1', '#a8bed6'];
  STACK.forEach(function (s, i) {
    var x = 97 + i * 107;
    var col = put(opx, el('span', 'ui-stack', at(x, OP.y, 86, OP.h) + '--i:' + i));
    for (var k = 3; k >= 0; k--) {
      var lo = k ? s[k - 1] : 0;
      put(col, el('span', null, 'position:absolute;left:0;right:0;bottom:' + (lo * 100) + '%;height:' +
        ((s[k] - lo) * 100) + '%;background:' + SHADES[k]));
    }
    if (i < 2) put(opx, el('span', 'ui-axis-m', 'left:' + (x + 23) + 'px;top:' + (OP.y + OP.h + 6) + 'px', ['Jan', 'Feb'][i]));
  });

  // Table.
  var tbl = put(st, el('span', 'ui-card ui-table', at(81, 495, 1100, 260)));
  var head = put(tbl, el('span', 'ui-th', at(0, 0, 1100, 37)));
  put(head, el('span', 'ui-th-k', at(17, 0, null, 37), 'Region / Product'));
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(function (q, i) {
    var x0 = 174 + i * 213;
    put(tbl, el('span', 'ui-vr', at(x0, 0, 0, 260)));
    var h = put(head, el('span', 'ui-th-q', at(x0, 0, 213, 37)));
    put(h, el('span', null, null, q));
    put(h, icon('sort', 12, '#8b95a3', 1.8, 'margin-left:7px'));
    put(tbl, el('span', 'ui-vr ui-vr--sub', at(x0 + 111, 37, 0, 223)));
    put(tbl, el('span', 'ui-sub', at(x0 + 17, 37, 90, 35), 'Revenue'));
    put(tbl, el('span', 'ui-sub', at(x0 + 128, 37, 80, 35), 'Profit'));
  });
  var ROWS = [
    ['North America', ['223,000', '77,000', '247,000', '87,000', '138,000', '48,000', '168,000', '62,000']],
    ['Europe',        ['95,000', '28,000', '112,000', '38,000', '0', '0', '0', '0']],
    ['Asia Pacific',  ['164,000', '47,000', '0', '0', '0', '0', '0', '0']],
    ['',              ['164,000', '47,000', '0', '0', '0', '0', '0', '0']]
  ];
  ROWS.forEach(function (r, ri) {
    var y = 72 + ri * 37;
    var row = put(tbl, el('span', 'ui-tr', at(0, y, 1100, 37) + '--i:' + ri));
    if (r[0]) {
      put(row, icon('right', 12, '#62748e', 1.8, 'position:absolute;left:18px;top:12px'));
      put(row, el('span', 'ui-tr-k', at(39, 0, 130, 37), r[0]));
    }
    r[1].forEach(function (v, ci) {
      var x = 174 + Math.floor(ci / 2) * 213 + (ci % 2 ? 128 : 17);
      put(row, el('span', 'ui-td' + (ci % 2 ? ' ui-td--b' : ''), at(x, 0, 95, 37), '$' + v));
    });
  });

  // JedoxAI panel.
  var ai = put(st, el('span', 'ui-ai', at(1077, 47, 351, STAGE_H - 47)));
  var ah = put(ai, el('span', 'ui-ai-h', at(0, 0, 351, 47)));
  put(ah, el('span', null, 'position:absolute;left:16px;line-height:47px;font-weight:600', 'JedoxAI'));
  put(ah, icon('hist', 16, '#45556c', 1.7, 'position:absolute;left:289px;top:15px'));
  put(ah, icon('close', 16, '#45556c', 1.9, 'position:absolute;left:320px;top:15px'));
  var prev = put(ai, el('span', 'ui-ai-prev', at(16, 48, 318, 39)));
  prev.innerHTML = '<span style="position:absolute;left:10px;top:-11px;color:#1f1f1f">sum of values (compared</span>' +
                   '<span style="position:absolute;left:10px;top:9px;color:#1f1f1f">across base elements)</span>';

  var ask = put(ai, el('span', 'ui-ask', at(48, 104, 286, 48), 'Compare 2023 and 2024'));
  var cmp = put(ai, el('span', 'ui-step ui-cmp', at(16, 177, 318, 26)));
  put(cmp, sparkle(22, '#005cce', 'position:absolute;left:0;top:2px'));
  put(cmp, el('span', null, 'position:absolute;left:40px;line-height:26px;font-weight:500;color:#1f1f1f', 'Comparing values....'));
  put(cmp, icon('chev', 13, '#1f1f1f', 2, 'position:absolute;left:167px;top:7px'));

  var und = put(ai, el('span', 'ui-step ui-und', at(16, 217, 318, 275)));
  put(und, icon('check', 17, '#42ac2e', 1.8, 'position:absolute;left:11px;top:18px'));
  put(und, el('span', null, 'position:absolute;left:35px;top:17px;font-weight:500;color:#1f1f1f', 'Understanding query'));
  put(und, icon('chev', 13, '#1f1f1f', 2, 'position:absolute;left:289px;top:20px'));
  var para1 = put(und, el('span', 'ui-para', at(12, 57, 296, 90)));
  put(und, el('span', 'ui-code', at(12, 163, 296, 112),
    '{"content": "{\\"success\\": true,\n\\"matched_elements\\":\n[{\\"element_id\\": \\"CM_I\\",\n\\"element_name\\": \\"Gross Profit\\",\n\\"element_type\\": \\"consolidate\\",\n\\"child_count\\": 4,'));

  var dsc = put(ai, el('span', 'ui-step ui-dsc', at(16, 510, 318, 26)));
  put(dsc, el('span', 'ui-spin', at(12, 6, 13, 13)));
  put(dsc, el('span', null, 'position:absolute;left:35px;line-height:26px;font-weight:500;color:#075ae2', 'Discovering context'));
  put(dsc, icon('chev', 13, '#1f1f1f', 2, 'position:absolute;left:289px;top:7px'));
  var para2 = put(ai, el('span', 'ui-step ui-para', at(28, 548, 296, 50)));
  put(ai, el('span', 'ui-step ui-code ui-code2', at(28, 606, 296, 60),
    '{"content": "{\\"success\\": true,\n\\"matched_elements\\":'));

  var TEXT1 = 'The user requested the year elements for 2023 & 2024 specifically. In the ‘Month’ ' +
              'time dimension, both ‘2023’ and ‘2024’ are available as top-level elements ' +
              'representing those years. These are the standard annual elements corresponding exactly to ' +
              'the years requested by the user....';
  var TEXT2 = 'The agent query explicitly requests the KPI ‘Gross Profit’. The element_name ' +
              '‘Gross Profit’ matches this exactly, and its element_id is ‘CM_I’.';

  /* ── Fit ───────────────────────────────────────────────────────────── */
  function fit() {
    // Cover the screen: a narrow or tall card fills to its bottom edge and
    // crops at the right, rather than ending halfway down.
    var k = Math.max(host.clientWidth / STAGE_W, host.clientHeight / STAGE_H);
    st.style.transform = 'scale(' + k + ')';
  }
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

  /* ── Play ──────────────────────────────────────────────────────────── */
  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [], running = false;
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function stop() { timers.forEach(clearTimeout); timers = []; running = false; }

  function type(node, text, i, speed) {
    if (!running) return;
    node.textContent = text.slice(0, i);
    if (i < text.length) later(speed, function () { type(node, text, i + 2, speed); });
  }

  function settle() {
    ui.className = 'ui is-charts is-rows is-asked is-cmp is-und is-code is-dsc';
    para1.textContent = TEXT1;
    para2.textContent = TEXT2;
  }

  function play() {
    stop();
    running = true;
    ui.className = 'ui is-resetting is-leaving';
    para1.textContent = ''; para2.textContent = '';
    void ui.offsetWidth;
    ui.classList.remove('is-resetting');
    later(60,   function () { ui.classList.remove('is-leaving'); });
    later(300,  function () { ui.classList.add('is-charts'); });
    later(1300, function () { ui.classList.add('is-rows'); });
    later(2100, function () { ui.classList.add('is-asked'); });
    later(2700, function () { ui.classList.add('is-cmp'); });
    later(3400, function () { ui.classList.add('is-und'); type(para1, TEXT1, 0, 18); });
    later(6600, function () { ui.classList.add('is-code'); });
    later(7300, function () { ui.classList.add('is-dsc'); type(para2, TEXT2, 0, 18); });
    later(11200, function () { ui.classList.add('is-leaving'); });
    later(11800, play);
  }

  if (reduce) { settle(); return; }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !running) play();
        else if (!e.isIntersecting && running) stop();
      });
    }, { threshold: 0.2 }).observe(host);
  } else {
    play();
  }
})();
