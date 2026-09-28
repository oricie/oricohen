/* The Signavio card plays the Galaxy Viewer rather than showing a still.
 *
 * Same method as the Jedox card: the screen is rebuilt at the size of the
 * original screenshot — 2886 by 1626, every position and colour measured
 * off it — and the whole stage is scaled down to the card.
 *
 * One pass: the process landscape draws itself, Dictionary Items is
 * switched on in the Elements filter and its node joins the graph, the
 * pointer goes to Procurement of Direct Materials and opens it, and the
 * model previews in place with a token running through it. It ends on the
 * screenshot's own frame, holds, and the canvas starts again.
 */
(function () {
  var host = document.querySelector('.work-screen--sg');
  if (!host) return;

  var STAGE_W = 2886, STAGE_H = 1626;

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
    menu:    '<path d="M3 6h18M3 12h18M3 18h18"/>',
    search:  '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    bell:    '<path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21.5h4"/>',
    bot:     '<path d="M4 5h16v11h-9l-4 4v-4H4z"/><circle cx="9.5" cy="10" r="1"/><circle cx="14.5" cy="10" r="1"/><path d="M9.5 13c1.4 1 3.6 1 5 0"/>',
    help:    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8"/><path d="M12 16.8v.2"/>',
    home:    '<path d="M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4z"/>',
    inbox:   '<path d="M4 4h16v16H4z"/><path d="M4 14h4l1.5 2.5h5L16 14h4"/><path d="M12 6v6M9.5 9.5 12 12l2.5-2.5"/>',
    face:    '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><circle cx="9" cy="10" r=".8"/><circle cx="15" cy="10" r=".8"/><path d="M9 14.5c1.7 1.3 4.3 1.3 6 0"/>',
    folder:  '<path d="M3 6.5h7l2 2h9V19H3z"/>',
    star:    '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    recent:  '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/><path d="M12 8v4.5l3 2"/>',
    cluster: '<path d="M9 3h6v6H9zM3 9h6v6H3zM15 9h6v6h-6zM9 15h6v6H9z"/>',
    proc:    '<path d="M11 4h9v6h-9zM11 14h9v6h-9z"/><path d="M8 7v10M8 7h3M8 17h3"/><path d="M3 12h5M5.5 9.5 8 12l-2.5 2.5"/>',
    apps:    '<circle cx="5" cy="5" r="1.2"/><circle cx="12" cy="5" r="1.2"/><circle cx="19" cy="5" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/><circle cx="5" cy="19" r="1.2"/><circle cx="12" cy="19" r="1.2"/><circle cx="19" cy="19" r="1.2"/>',
    brief:   '<path d="M3 8h18v12H3z"/><path d="M9 8V5h6v3M9 8v12M15 8v12"/>',
    gem:     '<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16 3-16"/>',
    scale:   '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    bolt:    '<path d="M13 3 6 13h5l-1 8 7-10h-5z"/>',
    right:   '<path d="M9 6l6 6-6 6"/>',
    down:    '<path d="M6 9l6 6 6-6"/>',
    docsrch: '<path d="M5 3h10l4 4v14H5z"/><circle cx="11.5" cy="12.5" r="3"/><path d="M13.7 14.7 16.5 17.5"/>',
    bars:    '<path d="M5 20v-5M10 20V10M15 20V7M20 20V4"/>',
    chat:    '<path d="M4 4h13v10H9l-5 4z"/><path d="M17 8h3v12l-4-3h-6v-3"/>',
    clip:    '<path d="M6 5h12v16H6z"/><path d="M9 3h6v4H9z"/><path d="M9 14l2 2 4-4"/>',
    map:     '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    mark:    '<path d="M6 3h12v18l-6-5-6 5z"/>',
    person:  '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0z"/>',
    bulb:    '<path d="M9 17h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    updown:  '<path d="M7 9l5-5 5 5M7 15l5 5 5-5"/>',
    extern:  '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
    share:   '<circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6"/>',
    expand:  '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="M4 4l5 5M20 4l-5 5M20 20l-5-5M4 20l5-5"/>',
    close:   '<path d="M5 5l14 14M19 5 5 19"/>',
    fit:     '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="M4 4l5 5M20 20l-5-5"/>',
    zoomfit: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><circle cx="11.5" cy="11.5" r="3"/><path d="M13.7 13.7 16 16"/>',
    minus:   '<path d="M4 12h16"/>',
    plus:    '<path d="M12 4v16M4 12h16"/>',
    check:   '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  function icon(name, size, color, sw, css, fill) {
    return svg(24, 24, ICON[name],
      'position:absolute;width:' + size + 'px;height:' + size + 'px;fill:' + (fill || 'none') +
      ';stroke:' + color + ';stroke-width:' + (sw || 1.7) +
      ';stroke-linecap:round;stroke-linejoin:round;' + (css || ''));
  }
  function iconAt(name, cx, cy, size, color, sw, fill) {
    return icon(name, size, color, sw, 'left:' + (cx - size / 2) + 'px;top:' + (cy - size / 2) + 'px', fill);
  }

  /* ── Build ─────────────────────────────────────────────────────────── */
  host.innerHTML = '';
  var ui = put(host, el('span', 'sg'));
  ui.setAttribute('aria-hidden', 'true');
  var st = put(ui, el('span', 'sg-stage', 'width:' + STAGE_W + 'px;height:' + STAGE_H + 'px'));

  // Canvas: the dotted plane everything in the viewer sits on.
  var cv = put(st, el('span', 'sg-canvas', at(0, 0, STAGE_W, STAGE_H)));

  // A preview left open earlier, faded back behind the filter.
  var ghost = put(cv, el('span', 'sg-ghost', at(388, 550, 466, 670)));
  put(ghost, el('span', 'sg-ghost-rule', at(0, 64, 466, 0)));
  put(ghost, el('span', 'sg-ghost-rule', 'left:388px;top:14px;width:0;height:36px;border-left-width:2px'));
  put(ghost, iconAt('close', 426, 33, 22, '#b4b5b6', 2.2));
  put(ghost, svg(466, 670,
    '<g fill="none" stroke="#c4c5c6" stroke-width="2">' +
      '<path d="M0 150H429V574H0M0 381H429"/>' +
    '</g>' +
    '<g fill="none" stroke="#a3a4a5" stroke-width="2">' +
      '<path d="M0 266H228V457M0 469H18M30 457V420H69M30 481V508H69M140 420H176V457M140 508H176V481' +
      'M188 469H216M240 469H274M345 469H377"/>' +
    '</g>' +
    '<g fill="#a3a4a5"><path d="M18 469l-7-4v8zM69 420l-7-4v8zM69 508l-7-4v8zM176 457l-4-7h8zM176 481l-4 7h8zM216 469l-7-4v8zM228 457l-4-7h8zM274 469l-7-4v8zM377 469l-7-4v8z"/></g>' +
    '<g fill="#fafafa" stroke="#bdbebf" stroke-width="2">' +
      '<rect x="69" y="392" width="71" height="56" rx="7"/><rect x="69" y="480" width="71" height="56" rx="7"/>' +
      '<rect x="274" y="441" width="71" height="56" rx="7"/>' +
      '<path d="M30 457l12 12-12 12-12-12zM176 457l12 12-12 12-12-12zM228 457l12 12-12 12-12-12z"/>' +
    '</g>' +
    '<circle cx="387" cy="469" r="10" fill="#fafafa" stroke="#8f9091" stroke-width="2.2"/>' +
    '<g font-size="10" fill="#a8a9aa" text-anchor="middle">' +
      '<text x="105" y="418">Reject Sales</text><text x="105" y="427">Order</text>' +
      '<text x="105" y="506">Release Sales</text><text x="105" y="515">Order</text>' +
      '<text x="309" y="473">Create Report</text>' +
      '<text x="387" y="491">Credit case</text><text x="387" y="500">processed</text>' +
      '<text x="145" y="387" font-style="italic" fill="#c4c5c6">Credit Controller</text>' +
    '</g>' +
    '<g font-size="14" font-weight="700" fill="#8c8d8e" text-anchor="middle">' +
      '<text x="30" y="474">X</text><text x="176" y="474">X</text><text x="228" y="474">X</text>' +
    '</g>', 'position:absolute;left:0;top:0'));

  // Edges between nodes. Drawn under the nodes; each one draws itself in.
  var EDGES = [
    ['M1518 190C1522 262 1543 282 1543 317', 1],
    ['M1551 190C1549 258 1543 284 1543 317', 1],
    ['M1579 353C1680 353 1690 276 1776 276', 6, 'sg-e-dict'],
    ['M1543 430C1520 468 1320 466 1120 468C930 470 800 492 700 560', 3],
    ['M1543 430C1552 470 1566 500 1570 540', 3],
    ['M1543 430C1570 486 1760 492 2020 494C2330 497 2482 600 2486 804', 3],
    ['M1543 430C1580 472 1820 452 2160 452C2520 452 2740 560 2746 804', 3],
    ['M2486 918V987M2486 1100V1169', 4],
    ['M1614 1398C1520 1398 1470 1426 1400 1440C1330 1452 1300 1455 1261 1455', 6],
    ['M1686 1398C1780 1398 1880 1340 1989 1335', 5],
    ['M1686 1398C1770 1410 1800 1470 1860 1505C1900 1525 1930 1527 1958 1527', 5]
  ];
  var eg = '';
  EDGES.forEach(function (e) {
    eg += '<path class="sg-edge ' + (e[2] || '') + '" style="--i:' + e[1] + '" pathLength="1" d="' + e[0] + '"/>';
  });
  put(cv, svg(STAGE_W, STAGE_H, eg, 'position:absolute;left:0;top:0', 'sg-edges'));

  // Nodes.
  function node(x, y, kind, glyph, color, label, lx, ly, lw, i, extra) {
    var g = put(cv, el('span', 'sg-node ' + (extra || ''), 'left:0;top:0;--i:' + i));
    var t = put(g, el('span', 'sg-tile sg-tile--' + kind, at(x, y, 72, 72)));
    put(t, iconAt(glyph, 36, 36, 38, color, 2.1));
    if (label) put(g, el('span', 'sg-label', at(lx, ly, lw, 36), label));
    return g;
  }
  node(1508, 317, 'pink', 'map', '#ba066c', 'Lead to Cash', 1473, 393, 140, 0);
  var dict = node(1776, 240, 'yel', 'mark', '#a45d00', 'Dictionary Items', 1728, 317, 167, 0, 'sg-dict');
  put(dict, el('span', 'sg-badge', at(1878, 305, 27, 23), '3'));
  node(2451, 804, 'blue', 'proc', '#0057d2', '[Process Name]', 2405, 881, 162, 3);
  node(2710, 804, 'blue', 'proc', '#0057d2', '[Process Name]', 2664, 881, 162, 3);
  node(2451, 987, 'blue', 'proc', '#0057d2', '[Process Name]', 2405, 1064, 162, 4);
  node(2451, 1169, 'blue', 'proc', '#0057d2', '[Process Name]', 2405, 1246, 162, 4);
  var hover = put(cv, el('span', 'sg-hover', at(1498, 1356, 308, 120)));
  node(1614, 1362, 'blue', 'proc', '#0057d2', null, 0, 0, 0, 2);
  put(cv, el('span', 'sg-label sg-node', at(1493, 1439, 314, 36) + '--i:2', 'Procurement of Direct Materials'));
  node(1989, 1299, 'yel sg-tile--round', 'person', '#a45d00', 'Procurement Manager', 1911, 1375, 227, 5);
  node(1958, 1491, 'yel sg-tile--round', 'person', '#a45d00', 'Agent', 1958, 1569, 71, 5);
  var ins = node(1190, 1419, 'lav', 'bulb', '#552cff', 'Insights', 1180, 1496, 90, 6);
  put(ins, el('span', 'sg-badge', at(1251, 1484, 39, 23), '12'));

  // Search in Galaxy Viewer.
  var gs = put(cv, el('span', 'sg-box', at(427, 226, 423, 54)));
  put(gs, el('span', 'sg-ph', at(15, 0, null, 54), 'Search in Galaxy Viewer'));
  put(gs, iconAt('search', 393, 27, 26, '#1d2d3e', 2));

  // Elements filter.
  var fl = put(cv, el('span', 'sg-box sg-filter', at(428, 317, 338, 482)));
  put(fl, el('span', 'sg-filter-t', at(24, 20, null, 36), 'Elements'));
  var BOXES = ['Processes', 'Journey Models', 'Dictionary Items', 'Roles', 'Documents',
               'Analyses', 'Metrics', 'Insights'];
  var ON = { 0: 1, 2: 1, 7: 1 };
  var dictBox;
  BOXES.forEach(function (b, i) {
    var y = 82 + i * 48;
    var cb = put(fl, el('span', 'sg-cb' + (ON[i] ? ' is-on' : ''), at(24, y, 32, 32)));
    put(cb, iconAt('check', 16, 16, 24, '#0064d9', 2.2));
    put(fl, el('span', 'sg-cb-l', at(73, y, null, 32), b));
    if (i === 2) dictBox = cb;
  });

  // The model preview.
  var pv = put(cv, el('span', 'sg-preview', at(917, 535, 1351, 696)));
  put(pv, el('span', 'sg-pv-tile', at(24, 10, 47, 47)));
  put(pv, iconAt('proc', 47.5, 33.5, 30, '#0057d2', 2.1));
  put(pv, el('span', 'sg-pv-t', at(84, 0, null, 67), 'Order to Power on'));
  put(pv, el('span', 'sg-open', at(1045, 7, 82, 53), 'Open'));
  put(pv, iconAt('share', 1167, 33, 28, '#0064d9', 2));
  put(pv, iconAt('expand', 1231, 33, 26, '#0064d9', 2));
  put(pv, el('span', 'sg-vr', at(1272, 16, 0, 36)));
  put(pv, iconAt('close', 1312, 33, 24, '#0064d9', 2.2));
  put(pv, el('span', 'sg-pv-rule', at(0, 66, 1351, 0)));
  var bp = put(pv, svg(1351, 696, bpmn(), 'position:absolute;left:0;top:0', 'sg-bpmn'));

  // The link from the model's own task out to its node, drawn over the preview.
  put(cv, svg(STAGE_W, STAGE_H,
    '<path class="sg-edge sg-e-over" pathLength="1" d="M1573 956C1573 1100 1648 1200 1650 1362"/>',
    'position:absolute;left:0;top:0', 'sg-edges'));

  // Hover toolbar on the node.
  var tb = put(cv, el('span', 'sg-toolbar', at(1706, 1326, 150, 68)));
  put(tb, el('span', 'sg-tb-on', at(16, 7, 54, 54)));
  put(tb, iconAt('updown', 43, 34, 30, '#0064d9', 2.1));
  put(tb, iconAt('extern', 109, 34, 26, '#0064d9', 2.1));

  // Zoom.
  var zm = put(cv, el('span', 'sg-box sg-zoom', at(2433, 1531, 341, 69)));
  put(zm, iconAt('fit', 41, 34, 26, '#0064d9', 2.1));
  put(zm, iconAt('zoomfit', 107, 34, 26, '#0064d9', 2.1));
  put(zm, iconAt('minus', 173, 34, 26, '#0064d9', 2.4));
  put(zm, el('span', 'sg-zoom-v', at(210, 0, 54, 69), '42%'));
  put(zm, iconAt('plus', 302, 34, 26, '#0064d9', 2.4));

  // Pointer.
  var cur = put(cv, svg(24, 36,
    '<path d="M2 2v26l6.5-6 4.2 10 4.3-1.9-4.2-9.7H21z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
    'position:absolute;left:0;top:0;width:19px;height:29px', 'sg-cursor'));

  /* ── Chrome: header, side navigation, page header, right rail ──────── */
  var hd = put(st, el('span', 'sg-top', at(0, 0, STAGE_W, 82)));
  put(hd, iconAt('menu', 46, 41, 30, '#1d2d3e', 2.4));
  put(hd, svg(86, 42,
    '<defs><linearGradient id="sg-sap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1ab4f0"/><stop offset="1" stop-color="#1d61bc"/></linearGradient></defs>' +
    '<path d="M0 0h86L46 42H0z" fill="url(#sg-sap)"/>' +
    '<text x="3" y="31" font-size="30" font-weight="700" fill="#fff" letter-spacing="-1.4">SAP</text>',
    'position:absolute;left:86px;top:21px'));
  put(hd, el('span', 'sg-brand', at(167, 12, null, 50), 'Signavio'));
  var sp = put(hd, el('span', 'sg-search', at(1228, 15, 430, 54)));
  put(sp, el('span', 'sg-ph', at(20, 0, null, 54), 'Search everything'));
  put(sp, iconAt('search', 403, 27, 28, '#0064d9', 2.2));
  put(hd, iconAt('bell', 2640, 42, 30, '#1d2d3e', 2));
  put(hd, el('span', 'sg-badge', at(2642, 15, 26, 24), '3'));
  put(hd, iconAt('bot', 2706, 42, 30, '#1d2d3e', 2));
  put(hd, iconAt('help', 2772, 42, 30, '#1d2d3e', 2));
  put(hd, el('span', 'sg-avatar', at(2817, 18, 48, 48), 'CW'));

  var sd = put(st, el('span', 'sg-side', at(0, 82, 388, STAGE_H - 82)));
  function sec(label, y) { put(sd, el('span', 'sg-sec', at(22, y - 82 - 12, null, 24), label)); }
  function item(label, glyph, y, opts) {
    opts = opts || {};
    var cy = y - 82;
    if (opts.on) put(sd, el('span', 'sg-side-on', at(21, 1295 - 82, 345, 59)));
    if (glyph) put(sd, iconAt(glyph, 45, cy, 28, '#1d2d3e', 2.2));
    put(sd, el('span', 'sg-item' + (glyph ? '' : ' sg-item--sub'), at(68, cy - 16, null, 32), label));
    if (opts.more) put(sd, iconAt('right', 344, cy, 20, '#1d2d3e', 2.4));
    if (opts.on) put(sd, el('span', 'sg-side-dot', at(341, cy - 6, 12, 12)));
  }
  sec('My Hub', 149);
  item('Home', 'home', 212); item('My Inbox', 'inbox', 275);
  item('My Process Profile', 'face', 338); item('My Assets', 'folder', 401);
  item('My Favorites', 'star', 464); item('Recent', 'recent', 527);
  sec('Quick Access', 610);
  item('Globalcorp Accelerate 2023', 'cluster', 674); item('Finance', 'folder', 737);
  item('Order to Cash', 'folder', 800); item('Order to Power On', 'proc', 863);
  sec('Apps and Tools', 946);
  item('Apps', 'apps', 1010, { more: 1 }); item('Suite Repository', 'folder', 1073, { more: 1 });
  item('Suite Library', null, 1136); item('Spaces', null, 1199); item('Dictionary', null, 1262);
  item('Galaxy Viewer', null, 1325, { on: 1 });
  item('Initiatives', 'brief', 1388); item('Recommendations', 'gem', 1451);
  item('Benchmarks', 'scale', 1514); item('Action Center', 'bolt', 1577);

  var ph = put(st, el('span', 'sg-page', at(388, 82, STAGE_W - 388, 108)));
  var cr = put(ph, el('span', 'sg-crumb', at(49, 0, null, 104)));
  cr.innerHTML = '<i>Globalcorp</i><b>›</b><i>Lead to Cash</i><b>›</b><em>Order to Power on</em>';
  put(ph, iconAt('star', 744, 52, 30, '#0064d9', 1.8, '#0064d9'));
  put(ph, iconAt('folder', 798, 52, 30, '#0064d9', 2));
  put(ph, el('span', 'sg-share', at(2164, 25, 88, 53), 'Share'));
  var vw = put(ph, el('span', 'sg-view', at(2270, 24, 107, 55)));
  put(vw, el('span', null, at(13, 0, null, 53), 'View'));
  put(vw, iconAt('down', 83, 27, 20, '#0064d9', 2.6));

  var rr = put(st, el('span', 'sg-rail', at(2799, 82, 87, STAGE_H - 82)));
  [['docsrch', 148], ['bars', 211], ['recent', 273], ['chat', 421], ['clip', 485]].forEach(function (r) {
    put(rr, iconAt(r[0], 42, r[1] - 82, 31, '#1d2d3e', 2.2));
  });
  put(st, el('span', 'sg-frame', at(0, 0, STAGE_W, STAGE_H)));

  /* ── The model inside the preview ─────────────────────────────────── */
  // Coordinates are the screenshot's, less the preview's own origin.
  function bpmn() {
    var OX = 917, OY = 535;
    var s = '<g transform="translate(' + (-OX) + ',' + (-OY) + ')">';
    var line = '#333';
    // Participants above and below.
    s += '<g fill="#fff" stroke="' + line + '" stroke-width="1.3" class="sg-b sg-b1">' +
         '<rect x="1085" y="634" width="293" height="29"/><rect x="1392" y="634" width="154" height="29"/>' +
         '<rect x="1555" y="634" width="219" height="29"/><rect x="1910" y="1173" width="326" height="30"/></g>';
    s += '<g font-size="11" fill="#1a1a1a" text-anchor="middle" class="sg-b sg-b1">' +
         '<text x="1231" y="653">Local Government</text><text x="1469" y="653">Customer</text>' +
         '<text x="1664" y="653">Local Building Department</text><text x="2073" y="1192">Local Building Department</text></g>';
    // Pool and lanes.
    s += '<g fill="none" stroke="' + line + '" stroke-width="1.3" class="sg-b sg-b1">' +
         '<rect x="961" y="681" width="1275" height="475"/><path d="M976 681V1156M976 858H2236M976 951H2236M976 1054H2236"/></g>';
    s += '<g font-size="6.5" fill="#1a1a1a" text-anchor="middle" class="sg-b sg-b1">' +
         '<text transform="translate(970 918) rotate(-90)">Best Run Solar Company</text>' +
         '<text transform="translate(986 770) rotate(-90)">Sales Representative</text>' +
         '<text transform="translate(986 905) rotate(-90)">Procurement</text>' +
         '<text transform="translate(986 1003) rotate(-90)">Logistics</text>' +
         '<text transform="translate(986 1105) rotate(-90)">Installation Team</text></g>';
    s += '<g font-size="6.5" fill="#aaa" font-style="italic" text-anchor="middle" class="sg-b sg-b1">' +
         '<text x="1295" y="689">Sales Representative</text><text x="1933" y="689">Sales Representative</text>' +
         '<text x="1295" y="866">Procurement</text><text x="1933" y="866">Procurement</text>' +
         '<text x="1295" y="959">Logistics</text><text x="1933" y="959">Logistics</text>' +
         '<text x="1295" y="1062">Installation Team</text><text x="1933" y="1062">Installation Team</text></g>';
    // Compliance per lane.
    [[835, '21%'], [924, '38%'], [1027, '48%'], [1134, '27%']].forEach(function (c) {
      s += '<g class="sg-b sg-b1"><text x="988" y="' + (c[0] - 10) + '" font-size="6.5" fill="#1a1a1a">Compliance Rate</text>' +
           '<circle cx="993" cy="' + (c[0] + 2) + '" r="5" fill="#fff" stroke="#6b2020" stroke-width="1.3"/><circle cx="993" cy="' + (c[0] + 2) + '" r="3" fill="#d23c3c"/>' +
           '<text x="1003" y="' + (c[0] + 5) + '" font-size="6.5" font-weight="700" fill="#1a1a1a">' + c[1] + '</text></g>';
    });
    // Sequence flow, in the order a token runs it.
    var FLOW = 'M1015 771H1039M1086 771H1110M1157 771H1181M1228 771H1256' +
               'M1265 762V729H1335M1265 780V811H1287M1383 729H1414V762M1334 811H1414V780' +
               'M1423 771H1448M1457 762V729H1477M1524 729H1557M1604 729H1685V901' +
               'M1457 780V820H1491M1509 820H1643V901M1500 829V910H1547M1596 910H1634M1652 910H1676' +
               'M1685 919V1003H1709M1756 1003H1781M1828 1003H1848V1108H1871M1918 1108H1940M1956 1108H1979' +
               'M2026 1108H2052M2099 1108H2129M2177 1108H2200';
    s += '<path class="sg-b sg-b2" d="' + FLOW + '" fill="none" stroke="' + line + '" stroke-width="1.3"/>';
    // Message and association links, dotted.
    s += '<path class="sg-b sg-b3" d="M1310 792V663M1358 710V663M1500 710V663M1580 710V663' +
         'M1008 778V810H1205V791M1061 791V810M1133 791V810M1733 1022V1052H1805V1022' +
         'M1571 931V946M2002 1128V1203M2075 1090V1053H2153V1090M1893 1072V1090M2113 1072V1090"' +
         ' fill="none" stroke="' + line + '" stroke-width="1.2" stroke-dasharray="3 3"/>';
    // Gateways.
    [[1265, 771, '+'], [1414, 771, '+'], [1457, 771, '+'], [1500, 820, '×'],
     [1643, 910, '×'], [1685, 910, '+']].forEach(function (g) {
      s += '<g class="sg-b sg-b2"><path d="M' + g[0] + ' ' + (g[1] - 10) + 'l10 10-10 10-10-10z" fill="#fff" stroke="' + line + '" stroke-width="1.3"/>' +
           '<text x="' + g[0] + '" y="' + (g[1] + 5) + '" font-size="15" font-weight="700" text-anchor="middle" fill="#1a1a1a">' + g[2] + '</text></g>';
    });
    // Events.
    s += '<g class="sg-b sg-b2" fill="#fff" stroke="' + line + '"><circle cx="1008" cy="771" r="7" stroke-width="1.4"/>' +
         '<circle cx="1948" cy="1108" r="8" stroke-width="1.4"/><circle cx="1948" cy="1108" r="5" stroke-width="1"/>' +
         '<circle cx="2207" cy="1108" r="7" stroke-width="2.6"/></g>';
    s += '<g class="sg-b sg-b3" font-size="6" fill="#1a1a1a" text-anchor="middle">' +
         '<text x="1008" y="753">Sales Quote</text><text x="1008" y="759">Created</text>' +
         '<text x="1500" y="793">Non-Stocked</text><text x="1500" y="799">Material</text><text x="1500" y="805">Required?</text>' +
         '<text x="1948" y="1092">Inspection</text><text x="1948" y="1098">Date</text>' +
         '<text x="2207" y="1124">PV System</text><text x="2207" y="1130">Activated</text>' +
         '<text x="1665" y="819">No</text><text transform="translate(1495 842) rotate(-90)">Yes</text></g>';
    // Tasks.
    var TASKS = [
      [1039, 752, 'Approve Sales', 'Quote', '21%'], [1110, 752, 'Create Sales', 'Order', '38%'],
      [1181, 753, 'Approve Sales', 'Order', '50%'], [1335, 710, 'Assist on', 'incentives app.', null, 1],
      [1287, 791, 'Apply for Permit', '', null, 1], [1477, 710, 'Schedule', 'Installation Date', null, 1],
      [1557, 710, 'Request', 'Inspection', null, 1], [1547, 890, 'Procurement of', 'Direct Materials', '27%'],
      [1709, 984, 'Create Delivery', '', '17%'], [1781, 984, 'Post Goods', 'Issue', '15%'],
      [1871, 1089, 'Install System', ''], [1979, 1089, 'Post Inspection', 'Report', null, 1],
      [2052, 1089, 'Complete Utility', 'Paperwork'], [2129, 1089, 'Activate PV', 'System']
    ];
    TASKS.forEach(function (t, i) {
      s += '<g class="sg-b sg-b2 sg-task" data-i="' + i + '">' +
           '<rect x="' + t[0] + '" y="' + t[1] + '" width="48" height="39" rx="4" fill="#ffffcc" stroke="' + line + '" stroke-width="1.4"/>' +
           '<text x="' + (t[0] + 24) + '" y="' + (t[1] + (t[3] ? 18 : 22)) + '" font-size="6" text-anchor="middle" fill="#1a1a1a">' + t[2] + '</text>' +
           (t[3] ? '<text x="' + (t[0] + 24) + '" y="' + (t[1] + 25) + '" font-size="6" text-anchor="middle" fill="#1a1a1a">' + t[3] + '</text>' : '') +
           (t[5] ? '<path d="M' + (t[0] + 4) + ' ' + (t[1] + 3) + 'h9v6.5h-9z" fill="#1a1a1a"/><path d="M' + (t[0] + 4) + ' ' + (t[1] + 3) + 'l4.5 3.5 4.5-3.5" fill="none" stroke="#ffffcc" stroke-width=".8"/>' : '') +
           '</g>';
      if (t[4]) {
        s += '<g class="sg-b sg-b3"><text x="' + (t[0] + 24) + '" y="' + (t[1] - 20) + '" font-size="6" text-anchor="middle" fill="#1a1a1a">Automation Rate</text>' +
             (i < 3 ? '<circle cx="' + (t[0] + 8) + '" cy="' + (t[1] - 10) + '" r="5" fill="#4a5560"/><path d="M' + (t[0] + 5) + ' ' + (t[1] - 8) + 'l4-4" stroke="#c9d1d9" stroke-width="1.2"/>'
               : '<circle cx="' + (t[0] + 8) + '" cy="' + (t[1] - 10) + '" r="5" fill="#fff" stroke="#6b2020" stroke-width="1.3"/><circle cx="' + (t[0] + 8) + '" cy="' + (t[1] - 10) + '" r="3" fill="#d23c3c"/>') +
             '<text x="' + (t[0] + 17) + '" y="' + (t[1] - 7) + '" font-size="6" font-weight="700" fill="#1a1a1a">' + t[4] + '</text></g>';
      }
    });
    // People and systems.
    [[1358, 773], [1893, 1060], [2113, 1060]].forEach(function (p) {
      s += '<g class="sg-b sg-b3" fill="#fff" stroke="#1a1a1a" stroke-width="1.2"><circle cx="' + p[0] + '" cy="' + (p[1] - 7) + '" r="5"/>' +
           '<path d="M' + (p[0] - 10) + ' ' + (p[1] + 11) + 'v-6a10 7 0 0 1 20 0v6z"/></g>' +
           '<text class="sg-b sg-b3" x="' + p[0] + '" y="' + (p[1] + (p[1] > 1000 ? -21 : 20)) + '" font-size="6" text-anchor="middle" fill="#1a1a1a">Customer</text>';
    });
    [[1130, 811], [1570, 950], [1770, 1052]].forEach(function (p) {
      s += '<g class="sg-b sg-b3"><path d="M' + (p[0] - 16) + ' ' + (p[1] - 8) + 'h32l-16 16h-16z" fill="#1d61bc"/>' +
           '<text x="' + (p[0] - 13) + '" y="' + (p[1] + 4) + '" font-size="10" font-weight="700" fill="#fff">SAP</text>' +
           '<text x="' + p[0] + '' + '" y="' + (p[1] + 17) + '" font-size="6" text-anchor="middle" fill="#1a1a1a">SAP ERP</text></g>';
    });
    // The token that runs the model.
    s += '<circle class="sg-token" r="7" cx="0" cy="0"/>';
    s += '</g>';
    return s;
  }

  var token = bp.querySelector('.sg-token');
  var tasks = bp.querySelectorAll('.sg-task');
  // The route a token takes, in the screenshot's coordinates, with the
  // index of the task it lights on arrival.
  var ROUTE = [[1008, 771], [1063, 771, 0], [1134, 771, 1], [1205, 771, 2], [1265, 771],
               [1265, 729], [1359, 729, 3], [1414, 729], [1414, 771], [1457, 771], [1457, 820],
               [1500, 820], [1500, 910], [1571, 910, 7], [1643, 910], [1685, 910], [1685, 1003],
               [1733, 1003, 8], [1805, 1003, 9], [1848, 1003], [1848, 1108], [1895, 1108, 10],
               [1948, 1108], [2003, 1108, 11], [2076, 1108, 12], [2153, 1108, 13], [2207, 1108]];

  /* ── Fit ───────────────────────────────────────────────────────────── */
  function fit() {
    st.style.transform = 'scale(' + (host.clientWidth / STAGE_W) + ')';
  }
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

  /* ── Play ──────────────────────────────────────────────────────────── */
  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [], raf = 0, running = false;
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function stop() {
    timers.forEach(clearTimeout); timers = [];
    cancelAnimationFrame(raf); running = false;
  }

  // The pointer rests where the screenshot has it.
  var HOME = [1757, 1383];
  function pointTo(x, y, ms) {
    cur.style.transitionDuration = ms + 'ms';
    cur.style.transform = 'translate(' + (x - 2) + 'px,' + (y - 2) + 'px)';
  }

  function runToken() {
    var seg = [], total = 0;
    for (var i = 1; i < ROUTE.length; i++) {
      var d = Math.abs(ROUTE[i][0] - ROUTE[i - 1][0]) + Math.abs(ROUTE[i][1] - ROUTE[i - 1][1]);
      seg.push(d); total += d;
    }
    var dur = 3600, t0 = performance.now(), lit = -1;
    ui.classList.add('is-token');
    (function step(now) {
      if (!running) return;
      var p = Math.min(1, (now - t0) / dur), want = p * total, k = 0;
      while (k < seg.length - 1 && want > seg[k]) { want -= seg[k]; k++; }
      var f = seg[k] ? Math.min(1, want / seg[k]) : 1;
      var a = ROUTE[k], b = ROUTE[k + 1];
      token.setAttribute('cx', a[0] + (b[0] - a[0]) * f);
      token.setAttribute('cy', a[1] + (b[1] - a[1]) * f);
      if (f >= 1 && b[2] != null && b[2] !== lit) {
        if (lit >= 0) tasks[lit].classList.remove('is-lit');
        lit = b[2]; tasks[lit].classList.add('is-lit');
      }
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        if (lit >= 0) tasks[lit].classList.remove('is-lit');
        ui.classList.remove('is-token');
      }
    })(t0);
  }

  var FULL = 'sg is-graph is-filter is-dict is-hover is-press is-open is-model is-cursor';
  function settle() {
    ui.className = FULL;
    dictBox.classList.add('is-on');
    pointTo(HOME[0], HOME[1], 0);
  }

  function play() {
    stop();
    running = true;
    ui.className = 'sg is-resetting is-leaving';
    dictBox.classList.remove('is-on');
    pointTo(620, 700, 0);
    void ui.offsetWidth;
    ui.classList.remove('is-resetting');
    later(60,    function () { ui.classList.remove('is-leaving'); });
    later(250,   function () { ui.classList.add('is-graph'); });
    later(1700,  function () { ui.classList.add('is-cursor'); pointTo(470, 512, 700); });
    later(2500,  function () { ui.classList.add('is-click'); dictBox.classList.add('is-on'); });
    later(2700,  function () { ui.classList.remove('is-click'); ui.classList.add('is-dict'); });
    later(3300,  function () { pointTo(1652, 1400, 1100); });
    later(4400,  function () { ui.classList.add('is-hover'); });
    later(4800,  function () { pointTo(HOME[0], HOME[1], 450); });
    later(5400,  function () { ui.classList.add('is-click', 'is-press'); });
    later(5600,  function () { ui.classList.remove('is-click'); ui.classList.add('is-open'); });
    later(6000,  function () { ui.classList.add('is-model'); });
    later(7300,  runToken);
    later(12400, function () { ui.classList.add('is-leaving'); });
    later(13000, play);
  }

  if (reduce) { settle(); return; }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !running) play();
        else if (!e.isIntersecting && running) { stop(); settle(); }
      });
    }, { threshold: 0.2 }).observe(host);
  } else {
    play();
  }
})();
