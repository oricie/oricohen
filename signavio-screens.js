/* Signavio screens, alive, inside the Signavio sheet.
 *
 * Three of the screenshots rebuilt in code at their own size (2000 wide,
 * every position and colour measured off them) and scaled to their frame:
 *
 *   .live-sghub    the hub: the page fills in, the counts run up, the first
 *                  onboarding step gets ticked and the comments move on
 *   .live-sgrec    process insights: recommendations are picked and the
 *                  projected outcome follows them
 *   .live-sginbox  my inbox: a task is opened and one of its steps is done
 *
 * Each plays once when it comes into view, then rests on the screenshot's
 * own frame and only answers hover. Nothing opens or navigates.
 */
(function () {
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
  function html(parent, cls, css, h) { var n = put(parent, el('span', cls, css)); n.innerHTML = h; return n; }

  var ICON = {
    menu:    '<path d="M3 6h18M3 12h18M3 18h18"/>',
    search:  '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    bell:    '<path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21.5h4"/>',
    bot:     '<path d="M4 7h7M4 7v9h3v3.5L10.5 16H18v-2"/><circle cx="16.5" cy="7" r="4.5"/><circle cx="15" cy="6.3" r=".5"/><circle cx="18" cy="6.3" r=".5"/><path d="M14.8 8.3c1 .8 2.4.8 3.4 0"/>',
    help:    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8"/><path d="M12 16.8v.2"/>',
    home:    '<path d="M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4z"/>',
    inbox:   '<path d="M4 4h16v16H4z"/><path d="M4 14h4l1.5 2.5h5L16 14h4"/><path d="M12 6v6M9.5 9.5 12 12l2.5-2.5"/>',
    face:    '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><circle cx="9" cy="10" r=".8"/><circle cx="15" cy="10" r=".8"/><path d="M9 14.5c1.7 1.3 4.3 1.3 6 0"/>',
    folder:  '<path d="M3 6.5h7l2 2h9V19H3z"/>',
    star:    '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    recent:  '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/><path d="M12 8v4.5l3 2"/>',
    cluster: '<circle cx="12" cy="12" r="2.2"/><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M7.6 7.6l2.8 2.8M16.4 7.6l-2.8 2.8M7.6 16.4l2.8-2.8M16.4 16.4l-2.8-2.8"/>',
    proc:    '<path d="M11 4h9v6h-9zM11 14h9v6h-9z"/><path d="M8 7v10M8 7h3M8 17h3"/><path d="M3 12h5"/>',
    apps:    '<g fill="currentColor" stroke="none"><circle cx="5" cy="5" r="1.7"/><circle cx="12" cy="5" r="1.7"/><circle cx="19" cy="5" r="1.7"/><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/><circle cx="5" cy="19" r="1.7"/><circle cx="12" cy="19" r="1.7"/><circle cx="19" cy="19" r="1.7"/></g>',
    brief:   '<path d="M3 8h18v12H3z"/><path d="M9 8V5h6v3M9 8v12M15 8v12"/>',
    gem:     '<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16 3-16"/>',
    scale:   '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    bolt:    '<path d="M13 3 6 13h5l-1 8 7-10h-5z"/>',
    bars:    '<path d="M5 20v-5M10 20V10M15 20V7M20 20V4"/>',
    globe:   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3z"/>',
    right:   '<path d="M9 6l6 6-6 6"/>',
    down:    '<path d="M6 9l6 6 6-6"/>',
    up:      '<path d="M6 15l6-6 6 6"/>',
    pencil:  '<path d="M4 20l1-5L15.5 4.5a2.1 2.1 0 0 1 3 3L8 18z"/><path d="M13.5 6.5l3 3"/>',
    chat:    '<path d="M4 4h16v12H10l-4 4v-4H4z"/><path d="M8 9h8M8 12h5"/>',
    bulb:    '<path d="M9 17h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    stamp:   '<path d="M5 21h14M5 17h14v-3H5z"/><path d="M10 14V9.5a2 2 0 1 1 4 0V14"/><path d="M9.5 9.5a2.5 2.5 0 1 1 5 0"/>',
    calgo:   '<path d="M4 6h16v14H4z"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M9 15h6M13 13l2 2-2 2"/>',
    cal:     '<path d="M4 6h16v14H4z"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    bpmn:    '<path d="M3 5h8v5H3zM13 14h8v5h-8z"/><path d="M7 10v6.5h6"/><circle cx="17" cy="7.5" r="2.5"/>',
    trend:   '<path d="M3 20h18"/><path d="M4 16l5-6 4 3 7-8"/>',
    analyze: '<path d="M3 20h18"/><path d="M5 17v-3M9 17v-7M13 17v-5M17 17V8"/><path d="M4 9l5-4 4 3 6-5"/>',
    flag:    '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    sub:     '<path d="M6 4v8a3 3 0 0 0 3 3h9"/><path d="M15 12l3 3-3 3"/>',
    tag:     '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    person:  '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    origin:  '<path d="M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6z"/><path d="M12 8v4M6 16v-4h12v4"/>',
    extern:  '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
    close:   '<path d="M6 6l12 12M18 6 6 18"/>',
    more:    '<g fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></g>',
    morev:   '<g fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></g>',
    expand:  '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="M4 4l5 5M20 20l-5-5"/>',
    screen:  '<path d="M3 4h18v12H3z"/><path d="M8 20h8M12 16v4"/><path d="M13 8h5v5"/>',
    plus:    '<path d="M12 4v16M4 12h16"/>',
    check:   '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cloud:   '<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5 4.5 4.5 0 0 1 17.5 18z"/><path d="M9.5 13.5l2 2 3.5-3.5"/>',
    sparkle: '<g fill="currentColor" stroke="none"><path d="M10 4c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6z"/><path d="M18 2c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3z"/></g>',
    addbox:  '<path d="M4 4h16v16H4z"/><path d="M12 8v8M8 12h8"/>',
    pin:     '<path d="M9 4h6l-1 5 3 3v2H7v-2l3-3z"/><path d="M12 14v6"/>',
    send:    '<path d="M3 20l18-8L3 4l3 8zM6 12h8"/>',
    filter:  '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    layout:  '<path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z"/>',
    glasses: '<circle cx="6.5" cy="15" r="3.5"/><circle cx="17.5" cy="15" r="3.5"/><path d="M10 15h4M3 14l2-8h3M21 14l-2-8h-3"/>',
    gauge:   '<circle cx="12" cy="12" r="9"/><path d="M12 12l4-4M7 16a6 6 0 0 1 10 0"/>',
    team:    '<circle cx="9" cy="9" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M15 5.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3 6"/>',
    hist:    '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/><path d="M12 8v4.5l3 2"/>',
    tasks:   '<path d="M4 4h16v16H4z"/><path d="M4 14h4l1.5 2.5h5L16 14h4"/><path d="M12 6v6M9.5 9.5 12 12l2.5-2.5"/>'
  };
  function icon(name, size, color, sw, css) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;fill:none;color:' + color +
      ';stroke:currentColor;stroke-width:' + (sw || 1.8) + ';stroke-linecap:round;stroke-linejoin:round;' + (css || '');
    s.innerHTML = ICON[name];
    return s;
  }
  // Centred on (cx, cy).
  function ic(parent, name, cx, cy, size, color, sw) {
    return put(parent, icon(name, size, color, sw, 'left:' + (cx - size / 2) + 'px;top:' + (cy - size / 2) + 'px'));
  }

  function cursor(st) {
    var c = put(st, el('span', 'sx-cursor'));
    c.innerHTML = '<svg viewBox="0 0 24 36" width="24" height="36"><path d="M2 2v26l6.5-6 4.2 10 4.3-1.9-4.2-9.7H21z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    return c;
  }
  function stage(host, cls, W, H) {
    host.innerHTML = '';
    var ui = put(host, el('span', 'sx ' + cls));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'sx-stage', 'width:' + W + 'px;height:' + H + 'px'));
    function fit() { st.style.transform = 'scale(' + (host.clientWidth / W) + ')'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
    return { ui: ui, st: st };
  }

  // Count a number up from zero.
  function count(node, to, ms) {
    var t0 = null;
    function step(t) {
      if (t0 == null) t0 = t;
      var k = Math.min(1, (t - t0) / ms);
      k = 1 - Math.pow(1 - k, 3);
      node.textContent = Math.round(to * k);
      if (k < 1) requestAnimationFrame(step);
    }
    node.textContent = '0';
    requestAnimationFrame(step);
  }

  /* ── The suite shell: top bar and hub navigation ───────────────────── */
  var NAV = [
    ['sec', 'My Hub', 101],
    ['home', 'Home', 145], ['inbox', 'My Inbox', 189], ['face', 'My Process Profile', 233],
    ['folder', 'My Assets', 277], ['star', 'My Favorites', 320], ['recent', 'Recent', 364],
    ['sec', 'Quick Access', 422],
    ['cluster', 'Globalcorp Accelerate 2023', 466], ['folder', 'Finance', 510], ['folder', 'Order to Cash', 553],
    ['sec', 'Apps and Tools', 611],
    ['apps', 'Apps', 655, 1], ['folder', 'Suite Repository', 699, 1], ['brief', 'Initiatives', 743],
    ['gem', 'Recommendations', 787], ['scale', 'Benchmarks', 830], ['bolt', 'Action Center', 874],
    ['bars', 'Reports', 918], ['globe', 'Process World', 961]
  ];
  function shell(st, W, H, active, nav) {
    // Navigation.
    var side = put(st, el('span', 'sx-side', at(0, 55, 268, H - 55)));
    (nav || NAV).forEach(function (n) {
      var y = n[2] - 55;
      if (n[0] === 'sec') { put(side, el('span', 'sx-sec', at(14, y - 10, null, 20), n[1])); return; }
      var row = put(side, el('span', 'sx-nav' + (n[1] === active ? ' is-on' : ''), at(14, y - 21, 238, 42)));
      ic(row, n[0], 16, 21, 19, '#1d2d3e', 1.8);
      put(row, el('span', 'sx-nav-t', at(32, 0, null, 42), n[1]));
      if (n[3]) ic(row, 'right', 224, 21, 14, '#1d2d3e', 2.2);
      if (n[1] === active) put(row, el('span', 'sx-nav-dot', at(222, 17, 8, 8)));
    });

    // Top bar.
    var top = put(st, el('span', 'sx-top', at(0, 0, W, 55)));
    ic(top, 'menu', 31, 28, 22, '#1d2d3e', 2);
    html(top, 'sx-logo', at(58, 13, 60, 30),
      '<svg viewBox="0 0 60 30" width="60" height="30"><defs><linearGradient id="sxsap" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#1ea4f0"/><stop offset="1" stop-color="#1468d6"/></defs>' +
      '<path d="M0 0h60L30 30H0z" fill="url(#sxsap)"/>' +
      '<text x="3" y="23" font-size="21" font-weight="800" fill="#fff" font-style="italic" letter-spacing="-1">SAP</text></svg>');
    put(top, el('span', 'sx-brand', at(116, 10, null, 36), 'Signavio'));
    var srch = put(top, el('span', 'sx-search', at(850, 10, 300, 36)));
    put(srch, el('span', 'sx-ph', at(14, 0, null, 36), 'Search everything'));
    ic(srch, 'search', 281, 18, 19, '#0a58d2', 2);
    ic(top, 'search', 1785, 28, 21, '#1d2d3e', 2);
    ic(top, 'bell', 1830, 29, 21, '#1d2d3e', 1.9);
    put(top, el('span', 'sx-badge', at(1832, 9, 18, 18), '3'));
    ic(top, 'bot', 1876, 28, 22, '#1d2d3e', 1.7);
    ic(top, 'help', 1922, 28, 21, '#1d2d3e', 1.9);
    put(top, el('span', 'sx-av', at(1953, 12, 33, 33), 'CW'));

    put(st, el('span', 'sx-frame', at(0, 0, W, H)));
    return side;
  }

  /* ── Hub ───────────────────────────────────────────────────────────── */
  function buildHub(host) {
    var W = 2000, H = 1126;
    var s = stage(host, 'sx--hub', W, H), ui = s.ui, st = s.st;

    // Header.
    var head = put(st, el('span', 'sx-head', at(268, 55, W - 268, 134)));
    put(head, el('span', 'sx-hello sx-in', at(33, 57, null, 42) + '--d:0', 'Good Morning, Claire!'));
    put(head, el('span', 'sx-hello-sub sx-in', at(34, 99, null, 22) + '--d:1', 'Welcome to SAP Signavio – your Process Transformation Suite'));
    // The two buttons sit against the right edge and size to their labels.
    var btns = put(head, el('span', 'sx-btns sx-in', 'right:35px;top:71px;height:36px;--d:1'));
    var create = put(btns, el('span', 'sx-btn sx-btn--main'));
    put(create, el('span', 'sx-btn-t', 'padding:0 32px 0 11px', 'Create Asset'));
    put(create, icon('down', 15, '#fff', 2.4, 'right:10px;top:10.5px'));
    var edit = put(btns, el('span', 'sx-btn sx-btn--ghost'));
    ic(edit, 'pencil', 18, 18, 17, '#0a58d2', 2);
    put(edit, el('span', 'sx-btn-t', 'padding:0 11px 0 32px', 'Edit Home page'));

    // My Suite Onboarding.
    put(st, el('span', 'sx-h2 sx-in', at(301, 232, null, 28) + '--d:2', 'My Suite Onboarding'));
    var ONB = [
      [302, 'Browse through your <b>process profile</b>'],
      [638, 'Watch the video <b>SAP Signavio<br>Processs Transformation Suite</b>'],
      [974, 'Visit the <b>Galaxy Viewer</b> and explore<br>our process landscape']
    ];
    var ticks = ONB.map(function (o, i) {
      var c = put(st, el('span', 'sx-card sx-onb sx-in', at(o[0], 287, 318, 77) + '--d:' + (3 + i)));
      var r = put(c, el('span', 'sx-radio', at(17, 29, 22, 22)));
      ic(r, 'check', 11, 11, 16, '#fff', 2.8);
      html(c, 'sx-onb-t', 'left:58px;top:50%;transform:translateY(-50%)', o[1]);
      return c;
    });

    // My Overview.
    put(st, el('span', 'sx-h2 sx-in', at(301, 428, null, 28) + '--d:4', 'My Overview'));
    function tile(x, y, w, h, n, label, ly, glyph, gx, dark, d) {
      var c = put(st, el('span', 'sx-card sx-ov sx-in' + (dark ? ' sx-ov--dark' : ''), at(x, y, w, h) + '--d:' + d));
      var num = put(c, el('span', 'sx-num', at(16, 16, null, 44), String(n)));
      num.setAttribute('data-n', n);
      put(c, el('span', 'sx-ov-l', at(16, ly, null, 22), label));
      var b = put(c, el('span', 'sx-ib', at(gx, 21, 34, 34)));
      ic(b, glyph, 17, 17, 20, '#0057d2', 1.9);
      return c;
    }
    var changes = tile(302, 483, 319, 319, 11, 'Last Changes', 58, 'hist', 269, 0, 5);
    [['LH', '#fff3b8', '#a5671c', 'Lisa Hamilton published', 'Order Management', 151],
     ['SK', '#ebf5cb', '#3c6a36', 'Stefan Wittberg-Rosse edited', 'Order Amount by City', 211],
     ['ND', '#eee4fb', '#7045a7', 'Yulia Winters commented', 'Order to Power On', 272]].forEach(function (p, i) {
      var row = put(changes, el('span', 'sx-row', at(16, p[5] - 30, 287, 60) + '--r:' + i));
      put(row, el('span', 'sx-pav', at(17, 13, 34, 34) + 'background:' + p[1] + ';color:' + p[2], p[0]));
      put(row, el('span', 'sx-row-t', at(63, 7, null, 22), p[3]));
      put(row, el('span', 'sx-row-l', at(63, 24, null, 22), p[4]));
    });

    var notes = tile(638, 483, 151, 151, 3, 'Notifications', 115, 'bell', 101, 0, 6);
    notes.classList.add('sx-ov--grey');
    tile(806, 483, 151, 151, 6, 'Recommendations', 115, 'gem', 101, 1, 6);

    var ins = put(st, el('span', 'sx-card sx-ov sx-in', at(638, 650, 319, 151) + '--d:7'));
    var insN = put(ins, el('span', 'sx-num', at(16, 15, null, 44), '9')); insN.setAttribute('data-n', 9);
    put(ins, el('span', 'sx-ov-l', at(16, 58, null, 22), 'Insights'));
    var ib = put(ins, el('span', 'sx-ib', at(16, 100, 34, 34))); ic(ib, 'bulb', 17, 17, 20, '#0057d2', 1.9);
    ['Sales order items incom...', 'Anomaly in price change...', 'Incomplete sales order it...'].forEach(function (t, i) {
      var row = put(ins, el('span', 'sx-row sx-row--line', at(98, 18 + i * 39.5, 206, 39.5) + '--r:' + i));
      put(row, el('span', 'sx-row-p', at(16, 0, null, 39) + 'line-height:39.5px', t));
    });

    var tasks = tile(974, 483, 319, 319, 5, 'Tasks', 57, 'tasks', 269, 0, 7);
    [['stamp', 'Approve Customer Onboarding'], ['stamp', 'Approve Inventory'],
     ['calgo', 'Validate BPMN Model for Suppli...'], ['calgo', 'Read Supplier Management Mo...']].forEach(function (t, i) {
      var row = put(tasks, el('span', 'sx-row sx-row--line', at(16, 127.5 + i * 43.6, 287, 43.6) + '--r:' + i));
      ic(row, t[0], 27, 21, 24, '#556b82', 1.5);
      put(row, el('span', 'sx-row-p', at(50, 0, null, 43) + 'line-height:43.6px', t[1]));
    });

    var cm = tile(1310, 483, 319, 319, 8, 'Comments', 58, 'chat', 269, 1, 8);
    var slides = put(cm, el('span', 'sx-slides', at(0, 150, 319, 130)));
    var COMMENTS = [
      ['Hi <b>@Claire Westfield</b>, the new approval step for purchase orders is live. Could you check it?', 'Purchase Order Approval'],
      ['Hi <b>@Claire Westfield</b>, have you had a chance to look at the latest sales numbers? I’m worried about the dip in Q3.', 'Order Amount by City']
    ];
    var slideEls = COMMENTS.map(function (c, i) {
      var sl = put(slides, el('span', 'sx-slide' + (i === 0 ? ' is-on' : ''), at(0, 0, 319, 130)));
      html(sl, 'sx-cm-t', at(16, 0, 272, null), c[0]);
      ic(sl, 'analyze', 23, 119, 13, '#fff', 2.2);
      put(sl, el('span', 'sx-cm-src', at(35, 108, null, 22), c[1]));
      return sl;
    });
    var dots = [223, 240, 256, 271, 286, 301].map(function (x, i) {
      return put(cm, el('span', 'sx-dot' + (i === 0 ? ' is-on' : ''), at(x - 2, 296, 4, 4)));
    });

    // Quick Actions.
    put(st, el('span', 'sx-h2 sx-in', at(301, 865, null, 28) + '--d:8', 'Quick Actions'));
    [['bpmn', 'Create new<br>BPMN Model'], ['trend', 'Simulate<br>Processes'], ['analyze', 'Analyze<br>Processes'],
     ['stamp', 'Trigger<br>Approval Case'], ['globe', 'Explore<br>Process World']].forEach(function (q, i) {
      var c = put(st, el('span', 'sx-card sx-qa sx-in', at(302 + i * 168, 920, 150, 149) + '--d:' + (9 + i)));
      var t = put(c, el('span', 'sx-qa-ic', at(16, 16, 50, 50)));
      ic(t, q[0], 25, 25, 24, '#0057d2', 1.8);
      html(c, 'sx-qa-t', at(16, 96, null, null), q[1]);
    });

    shell(st, W, H, 'Home');
    var cur = cursor(st);

    function point(x, y, ms) { cur.style.transitionDuration = ms + 'ms'; cur.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function done() {
      ticks[0].classList.add('is-done');
      slideEls[0].classList.remove('is-on'); slideEls[1].classList.add('is-on');
      dots[0].classList.remove('is-on'); dots[1].classList.add('is-on');
    }
    return {
      ui: ui,
      rest: function () { ui.classList.add('is-in', 'is-idle'); done(); },
      play: function (later) {
        point(1200, 760, 0);
        later(120, function () {
          ui.classList.add('is-in');
          ui.querySelectorAll('.sx-num').forEach(function (n) { count(n, +n.getAttribute('data-n'), 900); });
        });
        later(1700, function () { ui.classList.add('is-cursor'); point(328, 326, 650); });
        later(2450, function () { ticks[0].classList.add('is-press'); });
        later(2600, function () { ticks[0].classList.remove('is-press'); ticks[0].classList.add('is-done'); });
        later(3300, function () { point(1548, 777, 700); });
        later(4100, function () { dots[1].classList.add('is-press'); });
        later(4250, function () {
          dots[1].classList.remove('is-press');
          slideEls[0].classList.remove('is-on'); slideEls[0].classList.add('is-off');
          slideEls[1].classList.add('is-on');
          dots[0].classList.remove('is-on'); dots[1].classList.add('is-on');
        });
        later(5300, function () { ui.classList.remove('is-cursor'); });
        later(5600, function () { ui.classList.add('is-idle'); });
      }
    };
  }

  /* ── Process Insights: recommendations ─────────────────────────────── */
  function squares(parent, x, y, n) {
    for (var i = 0; i < 3; i++) put(parent, el('span', 'sx-sq' + (i < n ? ' is-on' : ''), at(x + i * 18, y - 6.5, 13, 13)));
  }
  function buildRec(host) {
    var W = 2000, H = 1124;
    var s = stage(host, 'sx--rec', W, H), ui = s.ui, st = s.st;

    // Header.
    var head = put(st, el('span', 'sx-head', at(0, 53, 1592, 258)));
    html(head, 'sx-crumb sx-in', at(50, 15, null, 22) + '--d:0',
      '<b>Process Insights</b> / <b>Process Flows</b> / <b>Purchase order item creation to invoice receipt</b> / Partial goods receipt');
    put(head, el('span', 'sx-title sx-in', at(50, 47, null, 36) + '--d:0', 'Recommendations for purchase order items with partial goods receipt'));
    put(head, el('span', 'sx-hello-sub sx-in', at(50, 86, null, 22) + '--d:1', 'Corrective actions and possible impact on relevant process metrics'));
    [[50, 'Completion Rate', '56%'], [224, 'Monetary Value', '3M'], [389, 'Average Days Taken', '15']].forEach(function (k, i) {
      put(head, el('span', 'sx-kpi-l sx-in', at(k[0], 128, null, 24) + '--d:' + (1 + i), k[1]));
      put(head, el('span', 'sx-kpi-v sx-in', at(k[0], 158, null, 30) + '--d:' + (1 + i), k[2]));
    });
    put(head, el('span', 'sx-fold', at(700, 207, 190, 0)));
    var b1 = put(head, el('span', 'sx-roundb', at(762, 195, 25, 25))); ic(b1, 'up', 12.5, 12.5, 14, '#1d2d3e', 2.4);
    var b2 = put(head, el('span', 'sx-roundb', at(798, 195, 25, 25))); ic(b2, 'pin', 12.5, 12.5, 15, '#1d2d3e', 2);
    put(head, el('span', 'sx-filter-l', 'right:287px;top:42px;height:22px', 'Filter'));
    put(head, el('span', 'sx-kpi-l', 'right:101px;top:41px;height:24px', 'Show Monetary Value'));
    var tg = put(head, el('span', 'sx-toggle', at(1500, 41, 42, 24)));
    put(tg, el('span', 'sx-toggle-k', at(3, 3, 16, 16)));
    [[53, 'Company Benchmarks'], [249, 'Details'], [336, 'Recommendations', 1]].forEach(function (t) {
      put(head, el('span', 'sx-tab' + (t[2] ? ' is-on' : ''), at(t[0], 224, null, 22), t[1]));
    });
    put(head, el('span', 'sx-tab-bar', at(333, 254, 136, 3)));

    // Long-term improvements.
    var tb = put(st, el('span', 'sx-card sx-tbl sx-in', at(50, 346, 1492, 367) + '--d:3'));
    put(tb, el('span', 'sx-tbl-t', at(16, 11, null, 24), 'Long-term improvements (6)'));
    put(tb, el('span', 'sx-rule', at(0, 45, 1492, 0)));
    var hdr = put(tb, el('span', 'sx-cb', at(12, 57, 23, 23)));
    [[62, 'Recommendation'], [685, 'Category'], [920, 'Relevance'], [1103, 'Industry Popularity'], [1282, 'End-to-End Processes']].forEach(function (h) {
      put(tb, el('span', 'sx-th', at(h[0], 57, null, 22), h[1]));
    });
    put(tb, el('span', 'sx-rule sx-rule--h', at(0, 91, 1492, 0)));
    var RECS = [
      ['Purchase Order Processing', 'SAP S/4HANA Capabilities', 3, 3, 'Plan to Fulfill', 1],
      ['Commodity Procurement', 'SAP S/4HANA Capabilities', 2, 3, 'Plan to Fulfill', 1],
      ['Goods and Service Confirmation', 'SAP S/4HANA Capabilities', 1, 2, 'Lead to Cash'],
      ['Purchase Order Confirmations', 'SAP Build Process Automation', 3, 3, 'Finance', 1],
      ['Mass Maintenance of Quality Info Records', 'SAP Build Process Automation', 2, 2, 'Finance'],
      ['Create Purchase Requisitions from Excel', 'SAP Build Process Automation', 2, 2, 'Finance']
    ];
    var rows = RECS.map(function (r, i) {
      var row = put(tb, el('span', 'sx-rec', at(0, 92 + i * 45.9, 1492, 45.9) + '--r:' + i));
      var cb = put(row, el('span', 'sx-cb', at(12, 11, 23, 23)));
      ic(cb, 'check', 11.5, 11.5, 18, '#0a58d2', 2.2);
      put(row, el('span', 'sx-rec-n', at(62, 0, null, 46), r[0]));
      put(row, el('span', 'sx-rec-c', at(685, 0, null, 44), r[1]));
      squares(row, 922, 22, r[2]);
      squares(row, 1105, 22, r[3]);
      put(row, el('span', 'sx-pill', at(1282, 13, null, 19), r[4]));
      ic(row, 'sparkle', 1468, 22, 19, '#0a6ed1', 1.9).setAttribute('class', 'sx-rec-ai');
      return row;
    });

    // Projected outcome.
    html(st, 'sx-h2 sx-in', at(50, 760, null, 28) + '--d:5', 'Projected outcome <i>(when selected recommendations are implemented)</i>');
    // What the four numbers read before, and after each pick.
    var STEPS = [
      [['474', ''], ['434', ''], ['41d 21h', ''], ['49.21%', '']],
      [['230', '(-244)'], ['290', '(-144)'], ['25d 4h', '(-16d 17h)'], ['62.40%', '(+13%)']],
      [['118', '(-356)'], ['196', '(-238)'], ['14d 2h', '(-27d 19h)'], ['74.80%', '(+26%)']],
      [['52', '(-422)'], ['132', '(-302)'], ['8d 18h', '(-33d 3h)'], ['84.21%', '(+35%)']]
    ];
    var metrics = ['Number of Cases', 'Number of Variants', 'AVG Cycle Time', 'Automation Rate'].map(function (m, i) {
      var c = put(st, el('span', 'sx-card sx-ov sx-met sx-in', at(50 + i * 379.3, 803, 354, 131) + '--d:' + (6 + i)));
      put(c, el('span', 'sx-met-l', at(16, 24, null, 22), m));
      ic(c, 'addbox', 239, 35, 19, '#0a58d2', 1.8);
      ic(c, 'bulb', 278, 35, 19, '#0a58d2', 1.8);
      ic(c, 'more', 318, 35, 21, '#0a58d2', 1.8);
      var v = put(c, el('span', 'sx-met-v', at(16, 64, null, 46)));
      var n = put(v, el('span', 'sx-met-n')); var d = put(v, el('span', 'sx-met-d'));
      return [v, n, d];
    });
    function show(k, bump) {
      metrics.forEach(function (m, i) {
        m[1].textContent = STEPS[k][i][0]; m[2].textContent = STEPS[k][i][1];
        if (bump) { m[0].classList.remove('is-bump'); void m[0].offsetWidth; m[0].classList.add('is-bump'); }
      });
    }
    [['Purchase order item creation<br>(subcontracting) to invoice receipt creation'], ['Supplier payment from purchasing'],
     ['Intracompany replenishment with logistics<br>execution'], ['Purchase order item creation (without<br>goods receipt) to FI-AP clearing']].forEach(function (p, i) {
      var c = put(st, el('span', 'sx-card sx-ov sx-in', at(50 + i * 379.3, 960, 354, 126) + '--d:' + (8 + i)));
      html(c, 'sx-pc-t', at(20, 15, null, null), p[0]);
      put(c, el('span', 'sx-pc-s', at(20, 63, null, 22), 'Best-Run Score'));
      put(c, el('span', 'sx-score', at(21, 87, 33, 21), '90%'));
      put(c, el('span', 'sx-pc-c', at(63, 87, null, 21), '9,240 Cases'));
    });

    // Process.AI.
    var ai = put(st, el('span', 'sx-ai', at(1592, 53, 350, H - 53)));
    html(ai, 'sx-ai-h', at(20, 14, null, 36), 'Process<i>.</i>AI');
    ic(ai, 'sparkle', 134, 22, 20, '#0a6ed1', 2);
    ic(ai, 'morev', 311, 30, 22, '#1d2d3e', 2);
    put(ai, el('span', 'sx-ai-lay sx-ai-lay--1', at(29, 62, 282, 30) + 'background:#80b1ec'));
    put(ai, el('span', 'sx-ai-lay sx-ai-lay--2', at(17, 68, 306, 30) + 'background:#408be2'));
    var imp = put(ai, el('span', 'sx-ai-main', at(5, 76, 339, 48)));
    ic(imp, 'screen', 25, 24, 18, '#fff', 2);
    put(imp, el('span', null, at(46, 0, null, 48), 'Improve Source to Pay'));
    var clip = put(ai, el('span', 'sx-ai-clip', at(0, 130, 350, 862)));
    var me = put(clip, el('span', 'sx-bub sx-me sx-in', at(22, 12, 306, 67) + '--d:3'));
    put(me, el('span', 'sx-pav', at(12, 11, 26, 26) + 'background:#fff3b8;color:#a5671c;font-size:11px;line-height:26px', 'CW'));
    html(me, 'sx-bub-t', at(53, 13, null, null), 'I want to improve an existing<br>process');
    ic(me, 'pencil', 279, 24, 18, '#556b82', 1.8);
    function msg(y, h, text, btns, d) {
      var m = put(clip, el('span', 'sx-bub sx-ai-msg sx-in', at(22, y, 306, h) + '--d:' + d));
      ic(m, 'sparkle', 24, 22, 17, '#8396a8', 1.9);
      html(m, 'sx-ai-t', at(53, 13, 234, null), text);
      btns.forEach(function (b) {
        put(m, el('span', 'sx-ai-btn' + (b[2] ? ' is-main' : ''), at(b[0], h - 55, b[1], 38), b[3]));
      });
      return m;
    }
    var m1 = msg(97, 322, 'From the 8 major processes areas in your company, I found <b>Source to Pay</b> as promising process area with high improvement potential in comparison to all other process areas. Also this area has the highest need as your performance is below your set benchmarks.<br><br>Would you like to analyse and fix <b>Source to Pay</b>?',
      [[53, 130, 0, 'Analyse and Fix'], [197, 41, 1, 'Fix']], 4);
    var m2 = msg(439, 450, 'Your process area <b>Source to Pay</b> has 4 sub-processes. The recommendation is to start with <b>Procure to Receipt</b> and it’s <b>Purchase order item creation to invoice receipt</b> step.<br><br>The best run score is below benchmark and there are several improvement recommendations available to improve key metrics by 30-50%.<br><br>Would you like to apply the recommended fix directly? Or would you like to see the analysis to explore all recommendations?',
      [[53, 76, 0, 'Analyse'], [142, 86, 1, 'Apply Fix']], 5);
    m1.classList.add('sx-ai-msg--1'); m2.classList.add('sx-ai-msg--2');
    // In the grid view's close-up of this panel the conversation plays out.
    var aiseq = !!host.closest('.mo-chunk');
    if (aiseq) ui.classList.add('sx-aiseq');
    [97, 439].forEach(function (y, i) {
      var d = put(clip, el('span', 'sx-dots sx-dots--' + (i + 1), at(22, y, 74, 40)));
      for (var k = 0; k < 3; k++) put(d, el('span', null, 'left:' + (20 + k * 13) + 'px;top:17px;--k:' + k));
    });
    var inp = put(ai, el('span', 'sx-ai-in', at(21, 1013, 306, 37)));
    put(inp, el('span', 'sx-ph', at(9, 0, null, 35), 'How can AI support you?'));
    ic(inp, 'send', 287, 18, 20, '#1d2d3e', 1.8);

    // Right rail.
    var rail = put(st, el('span', 'sx-rail', at(1942, 53, 58, H - 53)));
    put(rail, el('span', 'sx-rail-on', at(11, 196, 35, 35)));
    put(rail, el('span', 'sx-rail-bar', at(54, 199, 4, 30)));
    [['layout', 83], ['tag', 129], ['glasses', 175], ['chat', 220], ['sparkle', 266, '#0a6ed1'], ['bulb', 312], ['gauge', 358], ['team', 404], ['plus', 457, '#556b82']].forEach(function (r) {
      ic(rail, r[0], 28, r[1] - 53, 21, r[2] || '#1d2d3e', 1.8);
    });
    put(rail, el('span', 'sx-rule', at(17, 378, 24, 0)));
    ic(rail, 'right', 28, 1040, 16, '#1d2d3e', 2.2);

    // Top bar.
    var top = put(st, el('span', 'sx-top', at(0, 0, W, 53)));
    ic(top, 'menu', 30, 27, 22, '#1d2d3e', 2);
    var crumbs = put(top, el('span', 'sx-crumbs', at(57, 10, null, 34)));
    put(crumbs, el('span', 'sx-brand2', null, 'SAP Signavio'));
    html(crumbs, 'sx-bird', 'margin:-4px 12px 0 1px',
      '<svg viewBox="0 0 26 30" width="26" height="30"><path d="M3 26C9 22 13 16 14 8l4-6 1 7 6 2-6 3C17 21 11 26 3 26z" fill="#f0ab00"/><path d="M14 8l4-6 1 7z" fill="#e8710a"/></svg>');
    put(crumbs, el('span', 'sx-crumb-top', null, 'Process Insights'));
    put(crumbs, el('span', 'sx-crumb-sep', 'margin:0 15px', '/'));
    put(crumbs, el('span', 'sx-crumb-src', null, 'Source to Pay'));
    html(crumbs, '', 'margin-left:12px', '<svg viewBox="0 0 10 6" width="10" height="6"><path d="M0 0h10L5 6z" fill="#1d2d3e"/></svg>');
    put(top, el('span', 'sx-av', at(1535, 11, 33, 33) + 'background:#c2fcee;color:#0f6d59', 'AJ'));
    html(top, 'sx-av', at(1575, 11, 33, 33) + 'background:#f1d4c4;overflow:hidden',
      '<svg viewBox="0 0 33 33" width="33" height="33"><circle cx="16.5" cy="13" r="6.5" fill="#b27258"/><path d="M10 12c0-6 13-6 13 0-2-3-11-3-13 0z" fill="#2b2b2b"/><path d="M5 33c1-8 6-11 11.5-11S27 25 28 33z" fill="#d9483b"/></svg>');
    put(top, el('span', 'sx-share', at(1628, 9, 62, 36), 'Share'));
    put(top, el('span', 'sx-vr', at(1711, 12, 0, 30)));
    ic(top, 'search', 1738, 27, 21, '#1d2d3e', 2);
    ic(top, 'bell', 1783, 28, 21, '#1d2d3e', 1.9);
    put(top, el('span', 'sx-badge', at(1785, 8, 18, 18), '3'));
    ic(top, 'bot', 1829, 27, 22, '#1d2d3e', 1.7);
    ic(top, 'help', 1875, 27, 21, '#1d2d3e', 1.9);
    ic(top, 'apps', 1920, 27, 19, '#1d2d3e', 1.8);
    put(top, el('span', 'sx-av', at(1952, 11, 33, 33) + 'background:#fff3b8;color:#a5671c', 'CW'));
    put(st, el('span', 'sx-frame', at(0, 0, W, H)));
    var cur = cursor(st);

    function point(x, y, ms) { cur.style.transitionDuration = ms + 'ms'; cur.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    var PICK = [0, 1, 3];
    function pick(k) { rows[PICK[k]].classList.add('is-on'); show(k + 1, true); }
    show(0);
    return {
      ui: ui,
      rest: function () { ui.classList.add('is-in', 'is-idle', 'is-ai0', 'is-ai1', 'is-ai2'); PICK.forEach(function (r) { rows[r].classList.add('is-on'); }); show(3); },
      play: function (later) {
        point(700, 700, 0);
        if (aiseq) {
          // The conversation plays out: the question, a moment of thinking,
          // the first answer streaming in, then the second.
          later(400, function () { ui.classList.add('is-ai0'); });
          later(900, function () { ui.classList.add('is-dots1'); });
          later(2100, function () { ui.classList.remove('is-dots1'); ui.classList.add('is-ai1'); });
          later(4000, function () { ui.classList.add('is-dots2'); });
          later(5100, function () { ui.classList.remove('is-dots2'); ui.classList.add('is-ai2'); });
        }
        later(120, function () { ui.classList.add('is-in'); });
        var t = 1700;
        later(t, function () { ui.classList.add('is-cursor'); point(70, 452, 650); });
        PICK.forEach(function (r, k) {
          var y = 346 + 92 + r * 45.9 + 16;
          if (k) later(t, function () { point(70, y, 380); });
          later(t + (k ? 420 : 750), function () { rows[r].classList.add('is-press'); });
          later(t + (k ? 560 : 890), function () { rows[r].classList.remove('is-press'); pick(k); });
          t += k ? 1150 : 1500;
        });
        later(t + 300, function () { point(760, 890, 700); });
        later(t + 1300, function () { ui.classList.remove('is-cursor'); });
        later(t + 1600, function () { ui.classList.add('is-idle'); });
      }
    };
  }

  /* ── My Inbox ──────────────────────────────────────────────────────── */
  var AV = {
    SD: ['#fff3b8', '#a5671c'], CV: ['#d1efff', '#0057d2'], WI: ['#d1efff', '#0057d2'], IC: ['#ffeaf4', '#cc1f6b'],
    AW: ['#c2fcee', '#0f6d59'], CW: ['#d1efff', '#0057d2'], OH: ['#c2fcee', '#0f6d59'], WP: ['#d1efff', '#0057d2']
  };
  var PRIO = { High: ['#ffeaf4', '#cc1f6b'], Medium: ['#fff6c7', '#c77a00'], Low: ['#ebf5cb', '#3c7a36'] };
  function avs(parent, list, right, cy) {
    var g = put(parent, el('span', 'sx-avs', 'right:' + right + 'px;top:' + (cy - 16) + 'px'));
    list.forEach(function (a) { put(g, el('span', 'sx-pav sx-pav--s', 'background:' + AV[a][0] + ';color:' + AV[a][1], a)); });
    return g;
  }
  function buildInbox(host) {
    var W = 2000, H = 1126;
    var s = stage(host, 'sx--inbox', W, H), ui = s.ui, st = s.st;

    // The list; its right edge moves when the task panel opens.
    var main = put(st, el('span', 'sx-main', 'left:268px;top:55px;bottom:0'));
    var head = put(main, el('span', 'sx-head', 'left:0;top:0;right:0;height:123px'));
    put(head, el('span', 'sx-hello sx-in', at(33, 25, null, 42) + '--d:0', 'My Inbox'));
    put(head, el('span', 'sx-tab is-on', at(37, 88, null, 22), 'Tasks'));
    put(head, el('span', 'sx-tab', at(115, 88, null, 22), 'Comments'));
    put(head, el('span', 'sx-rdot', at(195, 77, 8, 8)));
    put(head, el('span', 'sx-tab-bar', at(34, 119, 45, 3)));

    var bar = put(main, el('span', 'sx-fbar sx-in', 'left:34px;right:29px;top:156px;height:62px;--d:1'));
    // Chips flow in a row; the number is the gap before each.
    var CH = [[0, 'Initiative', 'brief', 1], [12, 'Type', null, 1], [12, 'Priority', 'flag', 1], [27, 'To Do', null, 0, 1],
              [10, 'Done'], [10, 'Overdue'], [0, '|'], [10, 'Created by Me'], [10, 'Assigned to Me']];
    var chips = put(bar, el('span', 'sx-chips', 'left:14px;top:18px;height:26px'));
    CH.forEach(function (c) {
      if (c[1] === '|') { put(chips, el('span', 'sx-vr', 'height:26px;margin-left:15px')); return; }
      var chip = put(chips, el('span', 'sx-chip' + (c[4] ? ' is-on' : ''), 'margin-left:' + c[0] + 'px'));
      if (c[2]) put(chip, icon(c[2], 14, '#556b82', 1.8, 'position:relative;margin-right:6px'));
      put(chip, el('span', null, 'position:relative', c[1]));
      if (c[3]) put(chip, icon('down', 13, '#1d2d3e', 2.2, 'position:relative;margin-left:8px'));
    });
    var sort = put(bar, el('span', 'sx-sort', 'right:83px;top:18px;height:26px'));
    put(sort, el('span', null, 'position:relative', 'Sort'));
    put(sort, icon('down', 14, '#0a58d2', 2.4, 'position:relative;margin-left:9px'));
    var plus = put(bar, el('span', 'sx-plusb', 'right:16px;top:13px;width:38px;height:37px'));
    ic(plus, 'plus', 19, 18.5, 20, '#fff', 2.2);

    var TASKS = [
      ['Approve Customer Onboarding', 1, null, null, ['SD', 'CV', 'WI', 'IC', 'AW'], 'High', 'Oct 1'],
      ['Approve Inventory Management', 0, ['Approval', 'stamp'], null, ['CW'], 'Medium', 'Oct 5'],
      ['Validate BPMN Model for Supplier Management', 1, null, ['0 / 2', '2'], [], 'Low', 'Oct 7'],
      ['Read Supplier Management Model', 0, ['Reading Confirmation', 'docs'], null, ['SD', 'WP'], 'High', null],
      ['Conduct BPMN Training Session', 1, null, null, ['CV', 'WI', 'OH'], 'Medium', 'Oct 20'],
      ['Fix Hire to Retire', 1, null, ['1 / 5', '1'], ['CV', 'WI', 'OH'], 'High', 'Oct 25'],
      ['Run Root Cause Analysis on Unpaid Invoices', 1, ['Working Capital Boost 2023', 'brief', 1], null, [], 'Low', 'Oct 30'],
      ['Approve Customer Onboarding', 1, null, null, ['SD', 'CV', 'WI', 'IC', 'AW'], 'High', 'Nov 3'],
      ['Approve Inventory Management', 0, ['Approval', 'stamp'], null, ['CW'], 'Medium', 'Nov 3'],
      ['Validate BPMN Model for Supplier Management', 1, null, ['0 / 2', '2'], [], 'Low', 'Nov 6'],
      ['Read Supplier Management Model', 0, ['Reading Confirmation', 'docs'], null, ['SD', 'WP'], 'High', null]
    ];
    var metaSel;
    var rowEls = TASKS.map(function (t, i) {
      var r = put(main, el('span', 'sx-task sx-in', 'left:34px;right:35px;top:' + (252 + i * 76) + 'px;height:66px;--d:' + (2 + i * 0.6)));
      if (t[1]) put(r, el('span', 'sx-circ', at(16, 21, 23, 23)));
      var ty = t[3] ? 9 : 22;
      var tl = put(r, el('span', 'sx-task-t', 'left:56px;top:' + ty + 'px'));
      put(tl, el('span', null, 'position:relative', t[0]));
      if (t[2]) {
        var tag = put(tl, el('span', 'sx-tag' + (t[2][2] ? ' sx-tag--grey' : ''), 'position:relative;margin-left:10px'));
        put(tag, icon(t[2][1] === 'docs' ? 'bpmn' : t[2][1], 14, 'currentColor', 1.8, 'position:relative;margin-right:4px'));
        put(tag, el('span', null, 'position:relative', t[2][0]));
      }
      if (t[3]) {
        var m1 = put(r, el('span', 'sx-meta', at(56, 38, null, 20)));
        put(m1, icon('sub', 12, '#1d2d3e', 2, 'position:relative;margin-right:4px'));
        var mt = put(m1, el('span', null, 'position:relative', t[3][0]));
        var m2 = put(r, el('span', 'sx-meta', 'top:38px;left:' + (56 + (t[3][0].length * 7.8 + 30)) + 'px;height:20px'));
        put(m2, icon('chat', 13, '#1d2d3e', 1.9, 'position:relative;margin-right:3px'));
        put(m2, el('span', null, 'position:relative', t[3][1]));
        if (t[0] === 'Fix Hire to Retire') metaSel = mt;
      }
      if (t[4].length) avs(r, t[4], 210, 33);
      var pr = put(r, el('span', 'sx-prio', 'right:115px;top:23px;background:' + PRIO[t[5]][0] + ';color:' + PRIO[t[5]][1]));
      put(pr, icon('flag', 15, 'currentColor', 2, 'position:relative;margin-right:4px'));
      put(pr, el('span', null, 'position:relative', t[5]));
      if (t[6]) {
        var dt = put(r, el('span', 'sx-date', 'right:16px;top:20px'));
        put(dt, icon('cal', 14, '#1d2d3e', 1.8, 'position:relative;margin-right:6px'));
        put(dt, el('span', null, 'position:relative', t[6]));
      }
      return r;
    });
    var sel = rowEls[5];

    // The task panel.
    var pn = put(st, el('span', 'sx-panel', at(1427, 55, 573, H - 55)));
    ic(pn, 'cloud', 25, 31, 20, '#556b82', 1.7);
    ic(pn, 'more', 339, 31, 22, '#0a58d2', 2);
    ic(pn, 'chat', 385, 31, 20, '#0a58d2', 1.8);
    put(pn, el('span', 'sx-pn-n', at(398, 19, null, 24), '1'));
    ic(pn, 'expand', 443, 31, 19, '#0a58d2', 1.9);
    ic(pn, 'screen', 490, 31, 20, '#0a58d2', 1.8);
    ic(pn, 'close', 536, 31, 18, '#0a58d2', 2.2);
    put(pn, el('span', 'sx-circ', at(16, 67, 24, 24)));
    put(pn, el('span', 'sx-pn-h', at(54, 63, null, 30), 'Fix Hire to Retire'));
    function field(y, glyph, label) {
      ic(pn, glyph, 25, y - 55, 18, '#556b82', 1.8);
      put(pn, el('span', 'sx-pn-l', at(41, y - 55 - 11, null, 22), label));
    }
    field(182, 'cal', 'Due By'); field(226, 'origin', 'Origin'); field(270, 'person', 'Assignees');
    field(384, 'tag', 'Label'); field(428, 'flag', 'Priority');
    function pchip(x, y, parts, cls) {
      var c = put(pn, el('span', 'sx-pchip ' + (cls || ''), 'left:' + (x - 1427) + 'px;top:' + (y - 55 - 13) + 'px'));
      parts.forEach(function (p) {
        if (p[0] === 'i') put(c, icon(p[1], p[2] || 14, p[3] || '#1d2d3e', 1.8, 'position:relative;' + (p[4] || '')));
        else put(c, el('span', p[2] || null, 'position:relative;' + (p[1] || ''), p[0] === 't' ? p[3] : p[0]));
      });
      return c;
    }
    pchip(1587, 182, [['i', 'cal', 13, '#1d2d3e', 'margin-right:6px'], ['Oct 25, 2023'], ['i', 'down', 13, '#1d2d3e', 'margin-left:8px']]);
    pchip(1587, 226, [['i', 'origin', 13, '#1d2d3e', 'margin-right:6px'], ['Hire to Retire'], ['i', 'extern', 13, '#1d2d3e', 'margin-left:8px']]);
    [[1587, 270, 'C', 'Claire Westfield', '#cce9fd'], [1757, 270, 'W', 'Wendy Patterson', '#cce9fd'], [1587, 305, 'O', 'Oliver Harris', '#bcf9eb']].forEach(function (a) {
      pchip(a[0], a[1], [['t', 'background:' + a[4], 'sx-sqav', a[2]], [a[3]], ['i', 'close', 12, '#1d2d3e', 'margin-left:9px']], 'sx-pchip--av');
    });
    ic(pn, 'plus', 1750 - 1427, 305 - 55, 19, '#0a58d2', 2);
    pchip(1587, 340, [['Claim Task']], 'sx-pchip--blue');
    ic(pn, 'plus', 1601 - 1427, 384 - 55, 19, '#0a58d2', 2);
    pchip(1587, 428, [['High'], ['i', 'down', 13, '#cc1f6b', 'margin-left:6px']], 'sx-pchip--high');
    var ta = put(pn, el('span', 'sx-ta', at(16, 420, 538, 90)));
    put(ta, el('span', 'sx-ph', at(9, 6, null, 24), 'Describe your task'));
    put(pn, el('span', 'sx-tbl-t', at(16, 542, null, 24), 'Steps'));
    var STEPS = [['Review Current Model Errors', 'CW', 1], ['Review Comments', 'OH'], ['Update Process Flows', 'WP'],
                 ['Test Updated Model', 'WP'], ['Document Changes and Send for Approval', 'OH']];
    var stepEls = STEPS.map(function (p, i) {
      var c = put(pn, el('span', 'sx-step' + (p[2] ? ' is-done' : ''), at(16, 573 + i * 67.6, 538, 58)));
      var ci = put(c, el('span', 'sx-circ', at(16, 17, 24, 24)));
      ic(ci, 'check', 12, 12, 16, '#0a58d2', 2.4);
      put(c, el('span', 'sx-step-t', at(56, 0, null, 58), p[0]));
      put(c, el('span', 'sx-pav sx-pav--s', at(489, 13, 32, 32) + 'background:' + AV[p[1]][0] + ';color:' + AV[p[1]][1], p[1]));
      return c;
    });
    var add = put(pn, el('span', 'sx-add', at(16, 911, 538, 37)));
    var ph = put(add, el('span', 'sx-ph', at(9, 0, null, 36), 'Add Steps, @ to mention users'));
    // In the grid view's close-up the input comes alive too: a new step is
    // typed, with someone mentioned in it.
    var close = !!host.closest('.mo-chunk');
    var typed = put(add, el('span', 'sx-typed', at(10, 0, null, 36)));
    var tText = put(typed, el('span', null, 'position:relative'));
    var tMention = put(typed, el('span', 'sx-mention', 'position:relative'));
    put(typed, el('span', 'sx-caret', 'position:relative'));
    var LINE = 'Share the new flows with ', WHO = '@Wendy Patterson';
    function typeIn(later, t0) {
      add.classList.add('is-focus');
      ph.style.opacity = '0';
      var all = LINE + WHO;
      for (var i = 1; i <= all.length; i++) (function (i) {
        later(t0 + i * 55, function () {
          tText.textContent = all.slice(0, Math.min(i, LINE.length));
          tMention.textContent = i > LINE.length ? all.slice(LINE.length, i) : '';
          tMention.classList.toggle('is-on', i > LINE.length);
        });
      })(i);
    }
    put(pn, el('span', 'sx-foot', at(16, 981, null, 22), 'Last Edit: Dec 13, 2022 by Adrian Webster'));
    put(pn, el('span', 'sx-foot', at(16, 1003, null, 22), 'Creation Date: Nov 27, 2022 by Claire Westfield'));

    shell(st, W, H, 'My Inbox');
    var cur = cursor(st);

    function point(x, y, ms) { cur.style.transitionDuration = ms + 'ms'; cur.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function tick() { stepEls[1].classList.add('is-done'); metaSel.textContent = '2 / 5'; }
    return {
      ui: ui,
      rest: function () {
        ui.classList.add('is-in', 'is-idle', 'is-panel'); sel.classList.add('is-sel'); tick();
        if (close) { add.classList.add('is-focus'); ph.style.opacity = '0'; tText.textContent = LINE; tMention.textContent = WHO; tMention.classList.add('is-on'); }
      },
      play: function (later) {
        point(900, 900, 0);
        later(120, function () { ui.classList.add('is-in'); });
        later(1500, function () { ui.classList.add('is-cursor'); point(760, 714, 650); });
        later(2300, function () { sel.classList.add('is-press'); });
        later(2450, function () { sel.classList.remove('is-press'); sel.classList.add('is-sel'); ui.classList.add('is-panel'); });
        later(3500, function () { point(1466, 718, 700); });
        later(4350, function () { stepEls[1].classList.add('is-press'); });
        later(4500, function () { stepEls[1].classList.remove('is-press'); tick(); });
        if (close) {
          later(5000, function () { point(1520, 978, 600); });
          later(5700, function () { add.classList.add('is-press'); });
          later(5850, function () { add.classList.remove('is-press'); });
          typeIn(later, 5900);
          later(8200, function () { ui.classList.remove('is-cursor'); });
          later(8400, function () { ui.classList.add('is-idle'); });
          return;
        }
        later(5500, function () { ui.classList.remove('is-cursor'); });
        later(5800, function () { ui.classList.add('is-idle'); });
      }
    };
  }

  /* ── Wiring: build each host once, play it once in view ────────────── */
  var BUILD = { 'live-sghub': buildHub, 'live-sgrec': buildRec, 'live-sginbox': buildInbox };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function start(host, make) {
    var s = make(host);
    if (reduce) { s.rest(); return; }
    function later(ms, fn) { setTimeout(fn, ms); }
    if (window.IntersectionObserver) {
      var seen = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); s.play(later); }
      // A close-up in the grid view shows a small part of the screen, so
      // any of it being in view is enough.
      }, { threshold: host.closest('.mo-chunk') ? 0.01 : 0.25 });
      seen.observe(host);
    } else s.play(later);
  }
  function scan(root) {
    if (!root.querySelectorAll) return;
    Object.keys(BUILD).forEach(function (cls) {
      root.querySelectorAll('.' + cls + ':not([data-built])').forEach(function (h) {
        h.setAttribute('data-built', ''); start(h, BUILD[cls]);
      });
    });
  }
  scan(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
