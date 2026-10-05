/* The video review app's web version, rebuilt in code (older work).
 *
 * The review page at the screenshot's own size, 2000 by 1330, scaled to its
 * frame: the clip in a player with comment markers on its timeline, a
 * comment box with drawing tools, and the conversation beside it. The
 * frame is the one picture taken from the screenshot; faces come from the
 * app's own set.
 *
 * It loops while in view: the clip plays and each marker it passes lights
 * its comment; the clip stops at 01:12, a circle and an arrow are drawn on
 * the frame, a note is typed and posted, and it lands at the top of the
 * conversation with a new marker on the timeline. Then it starts again.
 */
(function () {
  var W = 2000, H = 1330;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var DUR = 204;                                   // 03:24, in seconds

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
  function svg(w, h, inner, css, cls) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('width', w); s.setAttribute('height', h);
    if (css) s.style.cssText = css;
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = inner;
    return s;
  }
  var I = {
    back:   '<path d="M20 12H5M11 5l-7 7 7 7"/>',
    addp:   '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.1-7 7-7s7 3 7 7"/><path d="M19 3v6M16 6h6"/>',
    share:  '<path d="M14 5l7 7-7 7v-4c-6 0-9 1.5-11 5 .5-6 3.5-11 11-12z" fill="currentColor" stroke="none"/>',
    play:   '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    pause:  '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none"/>',
    prev:   '<path d="M15 5l-7 7 7 7"/>',
    next:   '<path d="M9 5l7 7-7 7"/>',
    full:   '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    bars:   '<path d="M6 20v-4M11 20v-8M16 20V8M21 20V4"/>',
    reply:  '<path d="M10 7V3L3 10l7 7v-4c5 0 8.5 1.5 11 5-1-5.5-4-10-11-11z" fill="currentColor" stroke="none"/>',
    heart:  '<path d="M12 21s-8-5.2-8-11.2C4 6.6 6.4 4.5 9 4.5c1.4 0 2.4.6 3 1.6.6-1 1.6-1.6 3-1.6 2.6 0 5 2.1 5 5.3C20 15.8 12 21 12 21z" fill="currentColor" stroke="none"/>',
    smile:  '<circle cx="12" cy="12" r="9.5"/><path d="M8 14.5c2.2 2.2 5.8 2.2 8 0"/><circle cx="9" cy="10" r=".6" fill="currentColor"/><circle cx="15" cy="10" r=".6" fill="currentColor"/>',
    user:   '<circle cx="12" cy="9" r="4" fill="currentColor" stroke="none"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6z" fill="currentColor" stroke="none"/>',
    arrow:  '<path d="M5 19L19 5M10 5h9v9"/>',
    pen:    '<path d="M4 20l1.5-5L16 4.5a2.1 2.1 0 0 1 3 3L8.5 18z"/>',
    check:  '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    thread: '<path d="M4 5h16v11H9l-5 4z"/>'
  };
  function icon(name, size, color, sw, css) {
    var s = svg(24, 24, I[name], 'position:absolute;width:' + size + 'px;height:' + size + 'px;fill:none;color:' + color +
      ';stroke:currentColor;stroke-width:' + (sw || 2) + ';stroke-linecap:round;stroke-linejoin:round;' + (css || ''));
    return s;
  }
  // A face from the app's sprite (8 by 4 faces of 64 px).
  function face(p, c, r, x, y, size, css) {
    var k = size / 64;
    return put(p, el('span', 'vw-face', at(x, y, size, size) +
      'background-size:' + (512 * k) + 'px ' + (256 * k) + 'px;background-position:-' + (c * 64 * k) + 'px -' + (r * 64 * k) + 'px;' + (css || '')));
  }
  function mmss(t) { t = Math.max(0, Math.round(t)); return ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + t % 60).slice(-2); }

  // The conversation. [name, face col, face row, when, at (s), marker colour, text, hearts, extra]
  var MARK = { violet: '#a042fc', orange: '#fa8b41', white: '#e9edf2', cyan: '#4bbbf0', blue: '#4244fe' };
  // A white marker reads on the dark bar but not as a tint on white, so its chip is grey.
  var CHIP = { violet: '#a042fc', orange: '#fa8b41', white: '#7d8799', cyan: '#2b9fd8', blue: '#4244fe' };
  var COMMENTS = [
    ['Stephanus Huggins', 6, 2, '12 Minutes ago', 34, 'violet', 'I am in love with this frame!', 65],
    ['Phet Putrie', 0, 2, '14 Minutes ago', 58, 'orange', 'The colours are on spot, amazing job you all. 👍', 41, { replies: 2 }],
    ['Isaac Hunt', 5, 2, '20 Minutes ago', 71, 'white', 'Can we hold this shot a beat longer before the cut?', 12],
    ['Pablo Cambeiro', 2, 3, '1 Hour ago', 103, 'cyan', 'Stars look a little soft top left. Sharpen a touch?', 8, { sketch: true }],
    ['Joana Leite', 1, 1, '2 Hours ago', 140, '', 'Fixed the grain in the shadows.', 23, { resolved: true }],
    ['Sang Young-Il', 7, 0, 'Yesterday', 0, '', 'Music sync works much better in v3.', 17],
    ['Leslee Moss', 1, 3, 'Yesterday', 0, '', 'Approved from my side once the colour pass is in.', 9]
  ];
  var NEW = ['Dave M', 0, 3, 'Just now', 72, 'blue', 'Love the silhouette. Can we warm the horizon a touch here?', 0];
  var ROW = 189;

  function build(host) {
    host.innerHTML = '';
    var ui = put(host, el('span', 'vw'));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'vw-stage', 'width:' + W + 'px;height:' + H + 'px'));

    // Top bar.
    var top = put(st, el('span', 'vw-top', at(0, 0, W, 76)));
    put(top, icon('back', 30, '#3e475c', 2.2, 'left:27px;top:23px'));
    put(top, el('span', 'vw-file', at(83, 0, null, 76), 'final.mov'));
    put(top, el('span', 'vw-ver', at(190, 25, 38, 26), 'v3'));
    var status = put(top, el('span', 'vw-status', at(240, 24, null, 28)));
    put(status, el('span', 'vw-status-dot'));
    put(status, el('span', 'vw-status-t', null, 'In review'));
    put(top, icon('addp', 34, '#3e475c', 2, 'left:1597px;top:20px'));
    [[0, 0], [2, 1], [3, 1], [5, 1]].forEach(function (f, i) { face(top, f[0], f[1], 1650 + i * 36, 17, 44, 'box-shadow:0 0 0 2.5px #fff'); });
    put(top, el('span', 'vw-more', at(1797, 17, 44, 44), '+6'));
    var share = put(top, el('span', 'vw-share', at(1856, 17, 120, 44)));
    put(share, el('span', null, at(20, 0, null, 44), 'Share'));
    put(share, icon('share', 20, '#fff', 2, 'left:86px;top:13px'));

    // Player.
    var pl = put(st, el('span', 'vw-player', at(14, 90, 1390, 1053)));
    var frame = put(pl, el('span', 'vw-frame', at(0, 0, 1390, 962)));
    var img = put(frame, el('img', 'vw-img'));
    img.src = 'images/vweb-frame.webp'; img.alt = ''; img.draggable = false;
    // The drawing on the frame: a circle round the figure and an arrow to it.
    var draw = put(frame, svg(1390, 962,
      '<g fill="none" stroke="#4244fe" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
        '<path class="vw-ink vw-ink--1" pathLength="1" d="M702 652c60-4 96 52 92 118-4 74-34 120-94 122-62 2-94-48-90-122 4-66 36-114 92-118z"/>' +
        '<path class="vw-ink vw-ink--2" pathLength="1" d="M1010 500C930 540 850 590 800 640"/>' +
        '<path class="vw-ink vw-ink--3" pathLength="1" d="M796 600l2 42 40-12"/>' +
      '</g>', 'position:absolute;left:0;top:0', 'vw-draw'));
    var pin = put(frame, el('span', 'vw-pin', at(1000, 470, null, null)));
    face(pin, NEW[1], NEW[2], 0, 0, 44, 'box-shadow:0 0 0 3px #4244fe');
    put(pin, el('span', 'vw-pin-t', at(54, 6, null, 32), '01:12'));

    var bar = put(pl, el('span', 'vw-ctrl', at(0, 962, 1390, 91)));
    put(bar, el('span', 'vw-track', at(0, -2, 1390, 5)));
    var fill = put(bar, el('span', 'vw-fill', at(0, -2, 0, 5)));
    var marks = COMMENTS.filter(function (c) { return c[5]; }).map(function (c) {
      var m = put(bar, el('span', 'vw-mark', at(c[4] / DUR * 1390 - 9, -10, 18, 18) + 'background:' + MARK[c[5]]));
      return [c[4], m];
    });
    var newMark = put(bar, el('span', 'vw-mark vw-mark--new', at(NEW[4] / DUR * 1390 - 9, -10, 18, 18) + 'background:' + MARK.blue));
    var bPlay = put(bar, el('span', 'vw-btn vw-btn--play', at(24, 28, 32, 32)));
    put(bPlay, icon('play', 32, '#fff', 2, 'left:0;top:0'));
    var bPause = put(bar, el('span', 'vw-btn vw-btn--pause', at(74, 28, 32, 32)));
    put(bPause, icon('pause', 32, '#fff', 2, 'left:0;top:0'));
    var time = put(bar, el('span', 'vw-time', at(121, 28, null, 32)));
    put(bar, icon('prev', 30, '#fff', 2.4, 'left:669px;top:29px'));
    put(bar, icon('next', 30, '#fff', 2.4, 'left:699px;top:29px'));
    put(bar, icon('full', 28, '#fff', 2.2, 'left:1282px;top:30px'));
    put(bar, icon('bars', 28, '#fff', 2.4, 'left:1336px;top:29px'));

    // Comment box.
    var box = put(st, el('span', 'vw-box', at(14, 1160, 1390, 152)));
    var boxTop = put(box, el('span', 'vw-box-top', at(0, 0, 1390, 82)));
    face(boxTop, NEW[1], NEW[2], 23, 19, 44);
    var chip = put(boxTop, el('span', 'vw-chip vw-chip--box', at(84, 25, null, 32), '01:12'));
    var ph = put(boxTop, el('span', 'vw-ph', at(85, 0, null, 82), 'Write your comment here...'));
    var typed = put(boxTop, el('span', 'vw-typed', at(166, 0, null, 82)));
    var typedT = put(typed, el('span', null, 'position:relative'));
    put(typed, el('span', 'vw-caret', 'position:relative'));
    put(boxTop, icon('smile', 38, '#9aa6b8', 1.6, 'left:1322px;top:22px'));
    var post = put(boxTop, el('span', 'vw-post', at(1206, 20, 96, 42), 'Post'));
    var tools = put(box, el('span', 'vw-tools', at(0, 82, 1390, 70)));
    var dots = ['#868686', '#322f40', '#4544ff', '#4bbbf0'].map(function (c, i) {
      return put(tools, el('span', 'vw-color' + (i === 2 ? ' is-on' : ''), at(1022 + i * 44, 24, 24, 24) + 'background:' + c));
    });
    put(tools, el('span', 'vw-gif', at(1208, 19, 34, 34), 'GIF'));
    var tArrow = put(tools, el('span', 'vw-tool', at(1260, 16, 40, 40)));
    put(tArrow, icon('arrow', 28, '#9aa6b8', 2.2, 'left:6px;top:6px'));
    var tPen = put(tools, el('span', 'vw-tool vw-tool--pen', at(1318, 16, 40, 40)));
    put(tPen, icon('pen', 26, '#9aa6b8', 2.2, 'left:7px;top:7px'));

    // The conversation.
    var side = put(st, el('span', 'vw-side', at(1418, 76, 582, H - 76)));
    function item(c) {
      var it = put(side, el('span', 'vw-c', at(0, 0, 582, ROW)));
      face(it, c[1], c[2], 29, 28, 44);
      put(it, el('span', 'vw-c-name', at(86, 28, null, 40), c[0]));
      put(it, el('span', 'vw-c-when', 'right:25px;top:28px;height:40px', c[3]));
      var tx = put(it, el('span', 'vw-c-text', at(29, 84, 525, 40)));
      if (c[5]) put(tx, el('span', 'vw-chip', 'margin-right:12px;--c:' + CHIP[c[5]], mmss(c[4])));
      put(tx, el('span', null, 'position:relative', c[6]));
      var foot = put(it, el('span', 'vw-c-foot', at(29, 132, 525, 32)));
      put(foot, icon('reply', 18, '#9aa6b8', 2, 'position:relative;margin-right:10px'));
      put(foot, el('span', null, 'position:relative;margin-right:36px', 'Reply'));
      var hb = put(foot, el('span', 'vw-heart', 'position:relative;margin-right:14px'));
      put(hb, icon('heart', 20, 'currentColor', 2, 'position:relative'));
      var hn = put(foot, el('span', 'vw-heart-n', 'position:relative;margin-right:30px', String(c[7])));
      var x = c[8] || {};
      if (x.replies) {
        put(foot, icon('thread', 18, '#4244fe', 2, 'position:relative;margin-right:8px'));
        put(foot, el('span', 'vw-replies', 'position:relative', x.replies + ' replies'));
      }
      if (x.resolved) {
        it.classList.add('is-resolved');
        var r = put(it, el('span', 'vw-resolved', 'right:25px;top:132px;height:32px'));
        put(r, icon('check', 16, '#2f9e6a', 3, 'position:relative;margin-right:6px'));
        put(r, el('span', null, 'position:relative', 'Resolved'));
      }
      if (x.sketch) {
        var sk = put(it, el('span', 'vw-sketch', 'right:25px;top:124px;width:74px;height:48px'));
        put(sk, svg(74, 48, '<path d="M14 34c10-16 22-22 40-24" fill="none" stroke="#4bbbf0" stroke-width="3" stroke-linecap="round"/><circle cx="55" cy="10" r="6" fill="none" stroke="#4bbbf0" stroke-width="2.5"/>', 'position:absolute;left:0;top:0'));
      }
      return { el: it, hearts: hn, base: c[7], at: c[4] };
    }
    var newItem = item(NEW);
    newItem.el.classList.add('vw-c--new');
    var items = COMMENTS.map(item);
    function layout(withNew) {
      var y = withNew ? ROW : 0;
      newItem.el.style.top = (withNew ? 0 : -ROW) + 'px';
      items.forEach(function (it) { it.el.style.top = y + 'px'; y += ROW; });
    }
    layout(false);

    var cur = put(st, el('span', 'vw-cursor'));
    cur.innerHTML = '<svg viewBox="0 0 24 36" width="26" height="39"><path d="M2 2v26l6.5-6 4.2 10 4.3-1.9-4.2-9.7H21z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';

    // Fit to the frame's width.
    function fit() { st.style.transform = 'scale(' + (host.clientWidth / W) + ')'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

    /* ── Motion ─────────────────────────────────────────────────────── */
    var t = 0;                                      // the clip's time, in seconds
    function setTime(s) {
      t = s;
      fill.style.width = (s / DUR * 1390) + 'px';
      time.textContent = mmss(s) + ' / ' + mmss(DUR);
      marks.forEach(function (m) { m[1].classList.toggle('is-past', s >= m[0]); });
      items.forEach(function (it) { it.el.classList.toggle('is-now', it.at && s >= it.at && s < it.at + 7); });
    }
    function point(x, y, ms) { cur.style.transitionDuration = ms + 'ms'; cur.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }

    function rest() {
      ui.className = 'vw is-drawn is-posted is-idle';
      layout(true);
      setTime(NEW[4]);
      typedT.textContent = '';
      items[0].hearts.textContent = String(items[0].base + 1);
    }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { rest(); return; }

    var timers = [], running = false, raf = 0;
    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function stop() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); running = false; }
    // Play the clip from one time to another over some real milliseconds.
    function playTo(from, to, ms) {
      var t0 = performance.now();
      cancelAnimationFrame(raf);
      (function step(now) {
        var k = Math.min(1, (now - t0) / ms);
        setTime(from + (to - from) * k);
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
    }
    var NOTE = NEW[6];
    function type(i) {
      typedT.textContent = NOTE.slice(0, i);
      if (i < NOTE.length) later(38, function () { type(i + 1); });
    }

    function play() {
      stop();
      running = true;
      ui.className = 'vw is-playing';
      layout(false);
      typedT.textContent = '';
      items[0].hearts.textContent = String(items[0].base);
      setTime(22);
      point(1450, 760, 0);
      // Playing: the playhead runs past three markers, each lighting its comment.
      later(200, function () { ui.classList.add('is-on'); playTo(22, NEW[4], 4200); });
      // Paused at 01:12.
      later(4500, function () { ui.classList.remove('is-playing'); ui.classList.add('is-cursor'); point(1346, 1250, 700); });
      later(5300, function () { tPen.classList.add('is-press'); });
      later(5450, function () { tPen.classList.remove('is-press'); ui.classList.add('is-pen'); point(1140, 1244, 400); });
      later(5900, function () { dots[2].classList.add('is-press'); });
      later(6050, function () { dots[2].classList.remove('is-press'); point(722, 760, 600); });
      // Drawn: the circle, then the arrow.
      later(6700, function () { ui.classList.add('is-drawing'); traceCursor(); });
      later(8500, function () { ui.classList.add('is-drawn'); point(400, 1205, 650); });
      // Typed, with the time it is about.
      later(9250, function () { ui.classList.add('is-typing'); type(1); });
      later(9250 + NOTE.length * 38 + 300, function () { point(1250, 1188, 500); });
      later(9250 + NOTE.length * 38 + 900, function () { post.classList.add('is-press'); });
      later(9250 + NOTE.length * 38 + 1050, function () {
        post.classList.remove('is-press');
        ui.classList.remove('is-typing', 'is-pen');
        ui.classList.add('is-posted');
        typedT.textContent = '';
        layout(true);
      });
      // Someone likes the first comment, then it all fades and starts over.
      later(9250 + NOTE.length * 38 + 2100, function () { point(1562, 404, 600); });
      later(9250 + NOTE.length * 38 + 2800, function () { items[0].el.classList.add('is-like'); items[0].hearts.textContent = String(items[0].base + 1); });
      later(9250 + NOTE.length * 38 + 4300, function () { ui.classList.add('is-leaving'); ui.classList.remove('is-cursor'); });
      later(9250 + NOTE.length * 38 + 4900, function () { items[0].el.classList.remove('is-like'); play(); });
    }
    // The pointer follows the pen round the circle and along the arrow.
    function traceCursor() {
      var paths = draw.querySelectorAll('.vw-ink');
      var c = paths[0], a = paths[1];
      var lc = c.getTotalLength(), la = a.getTotalLength(), t0 = performance.now();
      (function step(now) {
        var k = (now - t0) / 1700, p;
        if (k < 0.62) p = c.getPointAtLength(lc * (k / 0.62));
        else p = a.getPointAtLength(la * Math.min(1, (k - 0.62) / 0.38));
        cur.style.transitionDuration = '0ms';
        cur.style.transform = 'translate(' + (14 + p.x) + 'px,' + (90 + p.y) + 'px)';
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        var vis = es.some(function (e) { return e.isIntersecting; });
        if (vis && !running) play();
        else if (!vis && running) stop();
      }, { threshold: host.closest('.mo-chunk') ? 0.01 : 0.2 }).observe(host);
    } else play();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-vweb:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', ''); build(h);
    });
  }
  scan(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
