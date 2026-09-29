/* beehive, a mobile BI app for online gaming that shows its insights as a
 * feed (older work), rebuilt in code as a live prototype in two phones, for
 * the Lucky Card's grid.
 *
 * Both phones lie in one CSS 3D scene, tilted like the original still: the
 * right one shows the feed, the left one an insight opened from it. Each app
 * is built at 375 by 812, colours sampled off the original screens; there
 * are no images.
 *
 * A scripted flow plays on a loop of seventeen seconds, the two phones taking
 * turns. Right: the feed's charts draw, Dates is tapped and the Total revenue
 * calendar slides in, its date ranges grow day by day and the KPIs count up;
 * a comment is typed and sent, and the Feed tab brings the feed back, which
 * is pulled to refresh. Left: the insight's rings fill and their labels fade
 * in, a row is tapped, Share with opens a sheet of people (one is picked)
 * and Add to collection turns its plus into a check; the rings unwind at the
 * end, which brings the loop round. The clock runs only while the tile is on
 * screen. With reduced motion both phones hold the original's screens.
 *
 * Test hooks: data-flat on the host renders the two screens alone, flat,
 * with no loop; data-screen picks the frame (feed, rings, dates, range,
 * kpis, row, share, rest, typing, posted, back, collect, refresh) and data-t
 * a raw time in ms. Without data-flat, data-t starts the loop there and
 * data-hold keeps it still.
 */
(function () {
  var LOOP = 17000, REST = 8850;
  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var EASE_IO = 'cubic-bezier(.45,0,.25,1)';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var VIO = '#4f43fd';

  function el(tag, cls, css, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function put(p, c) { p.appendChild(c); return c; }
  function box(p, cls, x, y, w, h, css) {
    return put(p, el('div', cls, 'left:' + x + 'px;top:' + y + 'px;' + (w != null ? 'width:' + w + 'px;' : '') + (h != null ? 'height:' + h + 'px;' : '') + (css || '')));
  }
  // Text by its left edge (a negative x: its right edge, from the parent's
  // right) and the top of its line box.
  function T(p, x, y, cls, text, css) {
    var pos = x < 0 ? 'right:' + (-x) + 'px;' : 'left:' + x + 'px;';
    return put(p, el('span', 'mb-t ' + (cls || ''), pos + 'top:' + y + 'px;' + (css || ''), text));
  }
  function icon(p, x, y, w, h, vb, inner, cls) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', vb);
    s.setAttribute('width', w); s.setAttribute('height', h);
    s.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px';
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = inner;
    return put(p, s);
  }

  // ── Icons ─────────────────────────────────────────────────────────────
  var ST = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  var I = {
    bars: '<rect x="0" y="7.3" width="3" height="3.7" rx=".8"/><rect x="4.6" y="5" width="3" height="6" rx=".8"/><rect x="9.2" y="2.5" width="3" height="8.5" rx=".8"/><rect x="13.8" y="0" width="3" height="11" rx=".8"/>',
    wifi: '<path d="M7.7 2.2c2.2 0 4.2.8 5.7 2.2l1.1-1.1A9.8 9.8 0 0 0 7.7.6 9.8 9.8 0 0 0 .9 3.3L2 4.4a8.2 8.2 0 0 1 5.7-2.2Zm0 3.2c1.3 0 2.5.5 3.4 1.3l1.1-1.1a6.4 6.4 0 0 0-9 0l1.1 1.1c.9-.8 2.1-1.3 3.4-1.3Zm0 3.1L5.6 10.6l2.1 2.1 2.1-2.1-2.1-2.1Z"/>',
    batt: '<rect x=".5" y=".5" width="22" height="11.5" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".38"/><rect x="2" y="2" width="19" height="8.5" rx="2"/><path d="M23.8 4.2v4.1c.8-.3 1.4-1.1 1.4-2s-.6-1.8-1.4-2.1Z" fill-opacity=".4"/>',
    burger: '<g ' + ST + ' stroke-width="2"><path d="M1 1h18M1 7.5h18M1 14h13"/></g>',
    funnel: '<path d="M0 0h19l-7.3 8.6v6.6l-4.4 2.3V8.6Z" fill="currentColor"/>',
    dd: '<path d="M1 1l4 4 4-4" ' + ST + ' stroke-width="1.5"/>',
    lt: '<path d="M6 1L1 6l5 5" ' + ST + ' stroke-width="2"/>',
    gt: '<path d="M1 1l5 5-5 5" ' + ST + ' stroke-width="2"/>',
    star: '<path d="M8 .6l2.3 4.7 5.1.7-3.7 3.6.9 5.1L8 12.3l-4.6 2.4.9-5.1L.6 6l5.1-.7Z" fill="currentColor"/>',
    share: '<path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11Z" fill="currentColor"/>',
    plus: '<path d="M9 1v16M1 9h16" ' + ST + ' stroke-width="2.4"/>',
    check: '<path class="mb-chk" d="M2 9.5l4.6 4.6L16 4" ' + ST + ' stroke-width="2.6" stroke-dasharray="22" stroke-dashoffset="22"/>',
    x: '<path d="M1 1l8 8M9 1L1 9" ' + ST + ' stroke-width="2.2"/>',
    feed: '<g ' + ST + ' stroke-width="1.8"><rect x="1" y="1" width="22" height="16" rx="2.5"/><path d="M5 6h14M5 10.5h9"/></g>',
    acct: '<circle cx="10" cy="5.6" r="4.6" fill="currentColor"/><path d="M0 19c0-4.6 4.4-7 10-7s10 2.4 10 7Z" fill="currentColor"/>',
    sliders: '<g ' + ST + ' stroke-width="1.8"><path d="M4 1v18M11 1v18M18 1v18"/></g><g fill="currentColor"><rect x="1" y="11" width="6" height="3.4" rx="1.2"/><rect x="8" y="4" width="6" height="3.4" rx="1.2"/><rect x="15" y="13" width="6" height="3.4" rx="1.2"/></g>',
    send: '<path d="M1 8.4L17 1l-5.4 16-3-6.4Z" fill="currentColor"/>'
  };
  function statusBar(p, time) {
    var sb = box(p, 'mb-sb', 0, 0);
    T(sb, 32, 15, 'mb-sb-time', time);
    icon(sb, 284, 17, 16.8, 11, '0 0 16.8 11', '<g fill="currentColor">' + I.bars + '</g>');
    icon(sb, 305, 16.5, 15.4, 12.7, '0 0 15.4 12.7', '<g fill="currentColor">' + I.wifi + '</g>');
    icon(sb, 326, 16.8, 25.2, 12.5, '0 0 25.2 12.5', '<g fill="currentColor">' + I.batt + '</g>');
    return sb;
  }
  function tabBar(p, bg) {
    var tb = box(p, 'mb-tabs', 0, 729, 375, 83, 'background:' + bg + ';');
    [['Feed', 'feed', 24, 18], ['Account', 'acct', 20, 19], ['Starred', 'star', 19, 19], ['Settings', 'sliders', 22, 20]].forEach(function (t, i) {
      var cx = 47 + 93.7 * i, on = !i;
      var vb = t[1] === 'star' ? '0 0 16 16' : '0 0 ' + t[2] + ' ' + t[3];
      icon(tb, cx - t[2] / 2, 12, t[2], t[3], vb, I[t[1]]).style.color = on ? VIO : '#8d8d93';
      T(tb, cx - 40, 36, 'mb-tab-l', t[0], 'width:80px;text-align:center;' + (on ? 'color:' + VIO : ''));
    });
    box(tb, 'mb-home', 120.5, 70, 134, 5);
    return tb;
  }
  function makeTap(app, x, y) {
    var t = box(app, 'mb-tap', 0, 0);
    var R = { el: t, dot: put(t, el('div', 'mb-tap-dot')), ring: put(t, el('div', 'mb-tap-ring')), pos: [x, y] };
    t.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    return R;
  }

  // ── The feed (right phone) ────────────────────────────────────────────
  var COLX = function (i) { return 34 + 51.2 * i; };
  var ROWY = function (r) { return 158 + 38 * r; };
  var DATES = [[27, 28, 29, 30, 1, 2, 3], [4, 5, 6, 7, 8, 9, 10], [11, 12, 13, 14, 15, 16, 17], [18, 19, 20, 21, 22, 23, 24], [25, 26, 27, 28, 29, 30, 31]];
  var KPIS = [['Daily Avg', 50, 16], ['Monthly', 90, 138], ['Total', 90, 258]];
  var SPARK = [30, 34, 28, 36, 33, 40, 38, 30, 42, 39, 46, 44, 50];
  var BARS = [22, 28, 25, 31, 27, 40, 44];

  function card(p, y, h, tag, tagc, title, sub) {
    var c = box(p, 'mb-card', 8, y, 359, h);
    T(c, 16, 16, 'mb-tag', tag, 'color:' + tagc + ';');
    icon(c, 327, 13, 15, 15, '0 0 16 16', I.star).style.color = '#4a4a50';
    T(c, 16, 36, 'mb-ttl', title);
    T(c, 16, 60, 'mb-sub', sub);
    return c;
  }

  function makeFeed() {
    var app = el('div', 'mb-app');
    var R = { app: app };
    statusBar(app, '12:30');
    icon(app, 20, 66, 20, 15, '0 0 20 15', I.burger).style.color = '#fff';
    var logo = box(app, 'mb-logo', 102, 60, 26, 26);
    box(logo, 'mb-logo-in', 6.5, 6.5, 13, 13);
    T(app, 134, 53, 'mb-word', 'beehive');
    icon(app, 336, 62, 19, 17.5, '0 0 19 17.5', I.funnel).style.color = '#fff';
    R.pills = [['Sort', 16, 102], ['Filters', 128, 112], ['Dates', 250, 109]].map(function (q) {
      var pl = box(app, 'mb-pill', q[1], 116, q[2], 36);
      T(pl, 14, 11, 'mb-pill-l', q[0]);
      icon(pl, q[2] - 24, 15.5, 10, 6.5, '0 0 10 6.5', I.dd).style.color = '#8d8d93';
      put(pl, el('div', 'mb-press'));
      return pl;
    });

    var view = R.view = box(app, 'mb-view', 0, 160, 375, 569);
    // The feed
    var feed = R.feed = box(view, 'mb-pane', 0, 0);
    R.spin = box(feed, 'mb-spin', 175.5, -34, 24, 24);
    var list = R.list = box(feed, 'mb-a', 0, 0, 375, 569);
    var c1 = card(list, 12, 150, 'REVENUE · SLOTS', '#8b83ff', 'Revenue up 12% this week', '€1.28M, vs. €1.14M last week');
    var pts = SPARK.map(function (v, i) { return [(i * 327 / (SPARK.length - 1)).toFixed(1), (52 - v).toFixed(1)]; });
    var d = 'M' + pts.map(function (q) { return q.join(' '); }).join('L');
    R.spark = icon(c1, 16, 82, 327, 52, '0 0 327 52',
      '<defs><linearGradient id="mbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + VIO + '" stop-opacity=".45"/><stop offset="1" stop-color="' + VIO + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="mb-area" d="' + d + 'L327 52L0 52Z" fill="url(#mbg)"/>' +
      '<path class="mb-line" d="' + d + '" fill="none" stroke="#6d63ff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/>' +
      '<circle class="mb-end" cx="327" cy="' + pts[pts.length - 1][1] + '" r="4" fill="#fff" stroke="' + VIO + '" stroke-width="2.4"/>');
    var c2 = card(list, 174, 144, 'PLAYERS', '#56b4ff', 'New players +3,4k', 'Registrations, last 7 days');
    R.bars = BARS.map(function (v, i) {
      T(c2, 16 + i * 47.5, 124, 'mb-sub', 'MTWTFSS'[i], 'width:30px;text-align:center;font-size:10px;');
      return box(c2, 'mb-bar', 16 + i * 47.5, 118 - v, 30, v, i > 4 ? 'background:' + VIO + ';' : '');
    });
    var c3 = card(list, 330, 124, 'RISK', '#ff5d62', 'Churn risk: 6% of VIP players', '212 players inactive for 5+ days');
    box(c3, 'mb-chip mb-chip--on', 16, 84, 102, 26).textContent = 'Send bonus';
    box(c3, 'mb-chip', 126, 84, 84, 26).textContent = 'View list';
    var c4 = card(list, 466, 130, 'GAMES', '#ffb14a', 'Top game: Book of Gold', '18% of all bets, avg. stake 2.40$');

    // Total revenue
    var cal = R.cal = box(view, 'mb-pane', 0, 0, null, null, 'transform:translateX(100%);');
    var cc = box(cal, 'mb-calc', 0, 10, 375, 505);
    T(cc, 16, 24, 'mb-ctl', 'TOTAL REVENUE');
    box(cc, 'mb-a', 306, 27, 7, 7, 'border-radius:50%;background:' + VIO + ';');
    icon(cc, 327, 22, 15, 15, '0 0 16 16', I.star).style.color = '#77777d';
    icon(cc, 22, 71, 7, 12, '0 0 7 12', I.lt).style.color = '#fff';
    T(cc, 0, 70, 'mb-month', 'May 2019', 'width:375px;text-align:center;');
    icon(cc, 339, 71, 7, 12, '0 0 7 12', I.gt).style.color = '#fff';
    'SMTWTFS'.split('').forEach(function (s, i) { T(cc, COLX(i) - 15, 112, 'mb-wd', s, 'width:30px;text-align:center;'); });
    R.cap1 = box(cc, 'mb-cap', COLX(2) - 17, ROWY(1) - 15, 34, 30, 'opacity:0;');
    R.cap2 = box(cc, 'mb-cap', -20, ROWY(3) - 15, COLX(0) + 37, 30, 'opacity:0;');
    R.six = box(cc, 'mb-six', COLX(2) - 16, ROWY(1) - 16, 32, 32, 'opacity:0;');
    DATES.forEach(function (row, r) {
      row.forEach(function (n, i) { T(cc, COLX(i) - 15, ROWY(r) - 7, 'mb-day', String(n), 'width:30px;text-align:center;'); });
    });
    R.kpi = KPIS.map(function (k) {
      T(cc, k[2], 352, 'mb-klbl', k[0]);
      return { el: T(cc, k[2], 370, 'mb-kval', k[1] + '%'), v: k[1] };
    });
    var inp = R.input = box(cc, 'mb-input', 16, 436, 343, 44);
    R.ph = T(inp, 14, 14, 'mb-ph', 'Write a comment');
    R.typed = T(inp, 14, 14, 'mb-typed', '');
    R.typedTx = put(R.typed, el('span'));
    put(R.typed, el('span', 'mb-caret'));
    R.send = box(inp, 'mb-send', 305, 6, 32, 32);
    icon(R.send, 7, 8, 18, 18, '0 0 18 18', I.send).style.color = '#fff';
    R.toast = box(cc, 'mb-toast', 160, 16, 134, 28);
    icon(R.toast, 12, 8, 14, 12, '0 0 18 18', '<path d="M2 9.5l4.6 4.6L16 4" ' + ST + ' stroke-width="2.8"/>').style.color = '#fff';
    T(R.toast, 32, 8, 'mb-toast-l', 'Comment added');
    feed.appendChild(el('div', 'mb-dim'));

    tabBar(app, '#111');
    R.tabFeed = box(app, 'mb-a', 0, 729, 94, 60, 'border-radius:12px;');
    R.tap = makeTap(app, 250, 470);
    return R;
  }

  // ── The insight (left phone) ──────────────────────────────────────────
  var RINGS = [['Trending', '#4d7cff', 0.72], ['Reported', '#5a4cf0', 0.8], ['Completed', '#6c48ff', 1], ['Restored', '#ff9a45', 0.78], ['Deleted', '#ff4b4f', 1]];
  var RC = 2 * Math.PI * 19;
  var PEOPLE = [['DK', 'Dana K.', '#ff8a5c'], ['MR', 'Mark R.', '#3aa7ff'], ['SL', 'Sara L.', '#b36cff'], ['AT', 'Avi T.', '#27c58a']];

  function makeInsight() {
    var app = el('div', 'mb-app', 'background:#574bfa;');
    var R = { app: app };
    statusBar(app, '12:30');
    var sh = box(app, 'mb-sheet', 0, 44, 375, 768);
    var xb = box(sh, 'mb-close', 322, 12, 30, 30);
    icon(xb, 10, 10, 10, 10, '0 0 10 10', I.x).style.color = '#111';
    box(sh, 'mb-a', 0, 58, 375, 1, 'background:#2c2c30;');
    T(sh, 20, 80, 'mb-body', 'Deposits rose in 15% of all registered');
    T(sh, 20, 102, 'mb-body', 'players, with an avarage of 14.22$');
    R.rows = RINGS.map(function (g, i) {
      var r = box(sh, 'mb-row', 0, 150 + 74 * i, 375, 74);
      var hl = box(r, 'mb-hl', 0, 0, 375, 74);
      var s = icon(r, 28, 11, 52, 52, '0 0 52 52',
        '<circle cx="26" cy="26" r="19" fill="none" stroke="#e9e9ee" stroke-width="5.5"/>' +
        '<circle class="mb-arc" cx="26" cy="26" r="19" fill="none" stroke="' + g[1] + '" stroke-width="5.5" transform="rotate(-90 26 26)" stroke-dasharray="' + RC.toFixed(2) + '" stroke-dashoffset="' + RC.toFixed(2) + '"/>');
      var lb = T(r, 96, 30, 'mb-rl', g[0], 'opacity:0;');
      icon(r, 344, 30, 8, 14, '0 0 7 12', I.gt).style.color = '#fff';
      return { el: r, hl: hl, arc: s.querySelector('.mb-arc'), lb: lb, v: g[2] };
    });
    R.share = box(sh, 'mb-bar2', 16, 542, 343, 52);
    T(R.share, 20, 19, 'mb-bar2-l', 'SHARE WITH');
    icon(R.share, 305, 15, 22, 21, '3 4 18 16', I.share).style.color = '#fff';
    put(R.share, el('div', 'mb-press'));
    R.add = box(sh, 'mb-bar2', 16, 604, 343, 52);
    R.addL = T(R.add, 20, 19, 'mb-bar2-l', 'ADD TO COLLECTION');
    R.addL2 = T(R.add, 20, 19, 'mb-bar2-l', 'ADDED TO COLLECTION', 'opacity:0;');
    R.plus = icon(R.add, 307, 17, 18, 18, '0 0 18 18', I.plus);
    R.plus.style.color = '#fff';
    R.chk = icon(R.add, 307, 17, 18, 18, '0 0 18 18', I.check);
    R.chk.style.color = '#fff';
    put(R.add, el('div', 'mb-press'));
    tabBar(app, '#15141b');
    R.dim = box(app, 'mb-dim', 0, 0, 375, 812, 'z-index:20;');
    var ps = R.psheet = box(app, 'mb-psheet', 0, 520, 375, 292, 'transform:translateY(100%);');
    box(ps, 'mb-grab', 169, 8, 38, 5);
    T(ps, 20, 30, 'mb-ps-t', 'Share with');
    T(ps, -20, 32, 'mb-ps-s', 'Copy link');
    R.people = PEOPLE.map(function (q, i) {
      var a = box(ps, 'mb-av', 24 + i * 86, 72, 54, 54, 'background:' + q[2] + ';opacity:0;');
      T(a, 0, 19, 'mb-av-l', q[0], 'width:54px;text-align:center;');
      T(ps, 24 + i * 86 - 13, 136, 'mb-ps-n', q[1], 'width:80px;text-align:center;');
      var ok = box(a, 'mb-av-ok', 36, 36, 20, 20, 'opacity:0;');
      icon(ok, 4, 5, 12, 10, '0 0 18 16', '<path d="M2 8.5l4.6 4.6L16 3" ' + ST + ' stroke-width="3.2"/>').style.color = '#fff';
      return { el: a, ok: ok };
    });
    box(ps, 'mb-a', 20, 176, 335, 1, 'background:#34343a;');
    T(ps, 20, 196, 'mb-ps-s', 'Slack · #growth-team', 'color:#c9c9cf;');
    R.tap = makeTap(app, 250, 480);
    return R;
  }

  // ── The flow ──────────────────────────────────────────────────────────
  function script(R, L, anims) {
    var ev = [], tw = [];
    function at(t, fn) { ev.push({ t: t, fn: fn }); }
    function tween(t0, t1, fn) { tw.push({ t0: t0, t1: t1, fn: fn, done: false }); }
    function A(e, frames, dur, easing, delay) {
      var a = e.animate(frames, { duration: dur, easing: easing || EASE, fill: 'both', delay: delay || 0 });
      anims.push(a);
      // Settle into plain inline style when done, so no composited layer
      // lingers inside the tilted phones.
      a.onfinish = function () { try { a.commitStyles(); } catch (e) {} a.cancel(); };
      return a;
    }
    // Finger
    function move(P, t, x, y, dur, easing) {
      at(t, function () {
        var p = P.tap.pos;
        A(P.tap.el, [{ transform: 'translate(' + p[0] + 'px,' + p[1] + 'px)' }, { transform: 'translate(' + x + 'px,' + y + 'px)' }], dur || 380, easing || EASE_IO);
        P.tap.pos = [x, y];
      });
    }
    function down(P, t) { at(t, function () { A(P.tap.dot, [{ transform: 'scale(1)' }, { transform: 'scale(.8)', background: 'rgba(255,255,255,.4)' }], 120, 'ease-out'); }); }
    function up(P, t) {
      at(t, function () {
        A(P.tap.dot, [{ transform: 'scale(.8)', background: 'rgba(255,255,255,.4)' }, { transform: 'scale(1)', background: 'rgba(255,255,255,.22)' }], 200, 'ease-out');
        A(P.tap.ring, [{ transform: 'scale(.8)', opacity: 0.9 }, { transform: 'scale(1.9)', opacity: 0 }], 420, 'ease-out');
      });
    }
    function tap(P, t, target) {
      down(P, t); up(P, t + 130);
      var pr = target && target.querySelector(':scope > .mb-press');
      if (pr) at(t, function () { A(pr, [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], 380, 'ease-out'); });
    }
    function show(P, t, on) { at(t, function () { A(P.tap.el, [{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], 240, 'ease-out'); }); }
    function press(e, t) { at(t, function () { A(e, [{ transform: 'scale(1)' }, { transform: 'scale(.97)', offset: 0.35 }, { transform: 'scale(1)' }], 320, 'ease-out'); }); }
    function rings(t, on) {
      L.rows.forEach(function (r, i) {
        var d = on ? i * 110 : i * 40;
        at(t, function () {
          var off = RC * (1 - r.v);
          A(r.arc, on ? [{ strokeDashoffset: RC }, { strokeDashoffset: off }] : [{ strokeDashoffset: off }, { strokeDashoffset: RC }], on ? 650 : 360, on ? 'cubic-bezier(.3,.7,.2,1)' : 'cubic-bezier(.5,0,.7,.4)', d);
          A(r.lb, [{ opacity: on ? 0 : 1, transform: 'translateX(' + (on ? -6 : 0) + 'px)' }, { opacity: on ? 1 : 0, transform: 'translateX(' + (on ? 0 : -6) + 'px)' }], on ? 300 : 220, 'ease-out', d + (on ? 220 : 0));
        });
      });
    }
    function charts(t, on) {
      at(t, function () {
        var ln = R.spark.querySelector('.mb-line'), ar = R.spark.querySelector('.mb-area'), en = R.spark.querySelector('.mb-end');
        A(ln, [{ strokeDashoffset: on ? 100 : 0 }, { strokeDashoffset: on ? 0 : 100 }], on ? 650 : 260, on ? 'cubic-bezier(.4,0,.2,1)' : 'ease-in');
        A(ar, [{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], on ? 400 : 200, 'ease-out', on ? 300 : 0);
        A(en, [{ opacity: on ? 0 : 1, transform: 'scale(' + (on ? 0.3 : 1) + ')' }, { opacity: on ? 1 : 0, transform: 'scale(' + (on ? 1 : 0.3) + ')' }], 240, 'ease-out', on ? 600 : 0);
        R.bars.forEach(function (b, i) {
          A(b, [{ transform: 'scaleY(' + (on ? 0 : 1) + ')' }, { transform: 'scaleY(' + (on ? 1 : 0) + ')' }], on ? 360 : 220, on ? 'cubic-bezier(.3,1.3,.5,1)' : 'ease-in', on ? 250 + i * 50 : i * 20);
        });
      });
    }
    function slideTo(from, to, back, dur) {
      A(to, [{ transform: 'translateX(' + (back ? -30 : 100) + '%)' }, { transform: 'translateX(0)' }], dur);
      A(from, [{ transform: 'translateX(0)' }, { transform: 'translateX(' + (back ? 100 : -30) + '%)' }], dur);
      var dm = (back ? to : from).querySelector(':scope > .mb-dim');
      if (dm) A(dm, [{ opacity: back ? 0.5 : 0 }, { opacity: back ? 0 : 0.5 }], dur);
    }
    function grow(e, t, w0, w1, dur) { at(t, function () { A(e, [{ width: w0 + 'px' }, { width: w1 + 'px' }], dur || 130, EASE); }); }

    // The first frame: the charts and rings are empty.
    R.spark.querySelector('.mb-line').style.strokeDashoffset = '100';
    R.spark.querySelector('.mb-area').style.opacity = '0';
    R.spark.querySelector('.mb-end').style.opacity = '0';
    R.bars.forEach(function (b) { b.style.transform = 'scaleY(0)'; });

    // 1. Right: the feed's charts draw. Left: the rings fill.
    charts(60, true);
    rings(900, true);

    // 2. Right: Dates, the calendar, the range, the KPIs.
    var P = R;
    at(2050, function () { R.kpi.forEach(function (k) { k.el.textContent = '0%'; }); });
    show(P, 2050, true);
    move(P, 2150, 303, 134, 420);
    tap(P, 2650, R.pills[2]);
    at(2780, function () { slideTo(R.feed, R.cal, false, 420); });
    at(3350, function () {
      R.cap1.style.opacity = '1';
      A(R.cap1, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], 220, 'cubic-bezier(.3,1.4,.5,1)');
      A(R.six, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], 260, 'cubic-bezier(.3,1.4,.5,1)', 60);
    });
    var x6 = COLX(2) - 17;
    for (var k = 3; k <= 6; k++) grow(R.cap1, 3380 + (k - 2) * 140, COLX(k - 1) + 17 - x6, (k === 6 ? 400 : COLX(k) + 17) - x6, 130);
    at(4000, function () { R.cap2.style.opacity = '1'; A(R.cap2, [{ opacity: 0 }, { opacity: 1 }], 140, 'ease-out'); });
    for (k = 1; k <= 3; k++) grow(R.cap2, 4000 + k * 140, COLX(k - 1) + 37, COLX(k) + 37, 130);
    R.kpi.forEach(function (q, i) {
      tween(4650 + i * 110, 5450 + i * 110, function (p) { q.el.textContent = Math.round(q.v * (1 - Math.pow(1 - p, 3))) + '%'; });
    });
    show(P, 5500, false);

    // 3. Left: a row, then Share with.
    P = L;
    show(P, 5750, true);
    move(P, 5850, 300, 44 + 150 + 74 * 2 + 37, 400);
    down(P, 6300); up(P, 6430);
    at(6300, function () { A(L.rows[2].hl, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 480, 'ease-out'); });
    move(P, 6700, 290, 44 + 568, 380);
    tap(P, 7150, L.share);
    press(L.share, 7150);
    at(7300, function () {
      A(L.psheet, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], 400, 'cubic-bezier(.2,.85,.25,1)');
      A(L.dim, [{ opacity: 0 }, { opacity: 0.5 }], 400, 'ease-out');
      L.people.forEach(function (q, i) { A(q.el, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1)' }], 300, 'cubic-bezier(.3,1.45,.5,1)', 150 + i * 70); });
    });
    move(P, 7850, 24 + 86 + 27, 520 + 99, 380);
    tap(P, 8300);
    at(8350, function () { A(L.people[1].ok, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], 260, 'cubic-bezier(.3,1.5,.5,1)'); });
    at(8650, function () {
      A(L.psheet, [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], 320, 'cubic-bezier(.4,0,.2,1)');
      A(L.dim, [{ opacity: 0.5 }, { opacity: 0 }], 320, 'ease-out');
    });
    show(P, 8700, false);

    // 4. Right: a comment, then back to the feed.
    P = R;
    var IY = 160 + 10 + 436 + 22;
    show(P, 8950, true);
    move(P, 9050, 150, IY, 400);
    tap(P, 9500);
    at(9560, function () {
      R.input.classList.add('is-focus');
      R.ph.style.opacity = '0';
      A(R.send, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1)' }], 280, 'cubic-bezier(.3,1.5,.5,1)');
    });
    var msg = 'Great week for slots';
    tween(9700, 9700 + msg.length * 58, function (p) { R.typedTx.textContent = msg.slice(0, Math.round(p * msg.length)); });
    move(P, 10950, 16 + 305 + 16, IY, 340);
    tap(P, 11350);
    at(11350, function () { A(R.send, [{ transform: 'scale(1)' }, { transform: 'scale(.86)', offset: 0.4 }, { transform: 'scale(1)' }], 260, 'ease-out'); });
    at(11470, function () {
      R.input.classList.remove('is-focus');
      A(R.typed, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-12px)' }], 240, 'ease-in');
      A(R.send, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.5)' }], 200, 'ease-in');
      A(R.ph, [{ opacity: 0 }, { opacity: 1 }], 250, 'ease-out', 200);
      A(R.toast, [{ opacity: 0, transform: 'translateY(8px) scale(.9)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 300, 'cubic-bezier(.3,1.3,.5,1)', 120);
    });
    at(12250, function () { A(R.toast, [{ opacity: 1 }, { opacity: 0 }], 220, 'ease-in'); });
    move(P, 11950, 47, 757, 440);
    tap(P, 12450);
    at(12450, function () { A(R.tabFeed, [{ background: 'rgba(255,255,255,0)' }, { background: 'rgba(255,255,255,.07)', offset: 0.35 }, { background: 'rgba(255,255,255,0)' }], 380, 'ease-out'); });
    at(12560, function () { slideTo(R.cal, R.feed, true, 400); });
    show(P, 12950, false);

    // 5. Left: Add to collection.
    P = L;
    show(P, 13150, true);
    move(P, 13250, 290, 44 + 630, 400);
    tap(P, 13700, L.add);
    press(L.add, 13700);
    at(13800, function () {
      A(L.plus, [{ opacity: 1, transform: 'rotate(0) scale(1)' }, { opacity: 0, transform: 'rotate(90deg) scale(.4)' }], 220, 'ease-in');
      A(L.chk.querySelector('.mb-chk'), [{ strokeDashoffset: 22 }, { strokeDashoffset: 0 }], 280, 'ease-out', 150);
      A(L.addL, [{ opacity: 1 }, { opacity: 0 }], 180, 'ease-out');
      A(L.addL2, [{ opacity: 0 }, { opacity: 1 }], 220, 'ease-out', 140);
    });
    show(P, 14250, false);

    // 6. Right: pull to refresh. Left: the insight resets.
    P = R;
    at(14800, function () { R.tap.el.style.transform = 'translate(190px,300px)'; R.tap.pos = [190, 300]; });
    show(P, 14800, true);
    down(P, 15100);
    move(P, 15150, 190, 380, 420, EASE);
    at(15150, function () {
      A(R.list, [{ transform: 'translateY(0)' }, { transform: 'translateY(64px)' }], 420, EASE);
      A(R.spin, [{ transform: 'translateY(0) rotate(0)', opacity: 0 }, { transform: 'translateY(64px) rotate(270deg)', opacity: 1 }], 420, EASE);
    });
    up(P, 15600);
    at(15600, function () { A(R.spin, [{ transform: 'translateY(64px) rotate(270deg)', opacity: 1 }, { transform: 'translateY(64px) rotate(990deg)', opacity: 1 }], 600, 'linear'); });
    show(P, 15650, false);
    charts(15700, false);
    at(16200, function () {
      A(R.list, [{ transform: 'translateY(64px)' }, { transform: 'translateY(0)' }], 360, EASE);
      A(R.spin, [{ transform: 'translateY(64px) rotate(990deg)', opacity: 1 }, { transform: 'translateY(0) rotate(1080deg)', opacity: 0 }], 360, EASE);
    });
    at(15300, function () {
      A(L.chk.querySelector('.mb-chk'), [{ strokeDashoffset: 0 }, { strokeDashoffset: 22 }], 200, 'ease-in');
      A(L.plus, [{ opacity: 0, transform: 'rotate(90deg) scale(.4)' }, { opacity: 1, transform: 'rotate(0) scale(1)' }], 260, 'ease-out', 160);
      A(L.addL2, [{ opacity: 1 }, { opacity: 0 }], 180, 'ease-out');
      A(L.addL, [{ opacity: 0 }, { opacity: 1 }], 220, 'ease-out', 140);
    });
    rings(16350, false);

    ev.sort(function (a, b) { return a.t - b.t; });
    return { ev: ev, tw: tw };
  }

  // ── Scene ─────────────────────────────────────────────────────────────
  var PW = 407, PH = 844, TH = 26, NE = 13;   // the device, and its edge layers
  function phone() {
    var ph = el('div', 'mb-phone');
    for (var i = NE; i >= 1; i--) {
      var e = put(ph, el('div', 'mb-edge' + (i === NE ? ' mb-edge--back' : ''), 'transform:translateZ(' + (-i * TH / NE).toFixed(2) + 'px);'));
      if (i === 5) {
        put(e, el('div', 'mb-key', 'left:-3px;top:150px;height:36px;'));
        put(e, el('div', 'mb-key', 'left:-3px;top:220px;height:66px;'));
        put(e, el('div', 'mb-key', 'left:-3px;top:300px;height:66px;'));
        put(e, el('div', 'mb-key', 'right:-3px;top:250px;height:100px;'));
      }
    }
    // The bottom edge, with its grilles and port, stands on its own plane.
    var bt = put(ph, el('div', 'mb-bottom'));
    for (var h = 0; h < 12; h++) put(bt, el('i', '', 'left:' + (h < 6 ? 40 + h * 13 : 195 + (h - 6) * 13) + 'px;'));
    put(bt, el('b'));
    var face = put(ph, el('div', 'mb-face'));
    put(face, el('div', 'mb-frame'));
    put(face, el('div', 'mb-bezel'));
    var scr = put(face, el('div', 'mb-screen'));
    var n = put(scr, el('div', 'mb-notch'));
    put(n, el('div', 'mb-grille')); put(n, el('div', 'mb-cam'));
    put(scr, el('div', 'mb-glare'));
    return { el: ph, screen: scr };
  }

  // The pose, as in the original still.
  var RX = 63, RZ = -40, LEFT = [-455, -115];

  function build(host) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var flat = host.hasAttribute('data-flat');
    var root = el('div', 'mb' + (flat ? ' mb--flat' : ''));
    root.setAttribute('aria-hidden', 'true');
    var scene = put(root, el('div', 'mb-scene'));
    var rig = put(scene, el('div', 'mb-rig'));
    var P1 = phone(), P0 = phone();
    [[P0, LEFT[0], LEFT[1]], [P1, 0, 0]].forEach(function (q) {
      var x = q[1] - PW / 2, y = q[2] - PH / 2;
      box(rig, 'mb-shadow mb-shadow--far', x, y, PW, PH);
      box(rig, 'mb-shadow mb-shadow--near', x, y, PW, PH);
      q[0].el.style.left = x + 'px'; q[0].el.style.top = y + 'px';
      put(rig, q[0].el);
    });
    host.appendChild(root);

    var anims = [];
    var R = makeFeed(), L = makeInsight();
    P1.screen.insertBefore(R.app, P1.screen.firstChild);
    P0.screen.insertBefore(L.app, P0.screen.firstChild);
    var S = script(R, L, anims);

    var vt = 0, ei = 0;
    function runTo(t) {
      while (ei < S.ev.length && S.ev[ei].t <= t) { S.ev[ei].fn(); ei++; }
      S.tw.forEach(function (w) {
        if (t >= w.t0 && (t <= w.t1 || !w.done)) {
          var p = Math.min(1, Math.max(0, (t - w.t0) / (w.t1 - w.t0)));
          w.fn(p);
          if (p >= 1) w.done = true;
        }
      });
    }
    function seek(t) {
      for (var x = 0; x < t; x += 40) runTo(x);
      runTo(t);
      [R.app, L.app].forEach(function (a) {
        a.getAnimations({ subtree: true }).forEach(function (an) { try { an.finish(); an.commitStyles(); an.cancel(); } catch (e) {} });
      });
    }
    function still() { seek(REST); R.tap.el.style.display = L.tap.el.style.display = 'none'; }

    if (flat) {
      var SCR = { feed: 0, rings: 1700, dates: 3200, range: 4300, kpis: 5500, row: 6450, share: 7900, rest: REST, typing: 10500, posted: 11700, back: 13000, collect: 14200, refresh: 15500 };
      var sc = host.getAttribute('data-screen');
      var t = host.hasAttribute('data-t') ? +host.getAttribute('data-t') : (SCR[sc] || 0);
      scene.innerHTML = '';
      scene.appendChild(P0.screen); scene.appendChild(P1.screen);
      if (sc === 'rest') still(); else seek(t);
      if (!host.hasAttribute('data-tap')) R.tap.el.style.display = L.tap.el.style.display = 'none';
      return;
    }

    // Fit: the right phone whole, near the right edge, with a margin; the
    // left one runs off the left edge, as in the original.
    var fit = { s: 1, cx: 0, cy: 0, w: 0, h: 0 };
    var PERSP = 6000;
    function place() {
      scene.style.perspective = (PERSP * fit.s).toFixed(1) + 'px';
      scene.style.perspectiveOrigin = (fit.w * 0.5).toFixed(1) + 'px ' + (fit.h * 0.42).toFixed(1) + 'px';
      rig.style.transform = 'translate(' + fit.cx.toFixed(2) + 'px,' + fit.cy.toFixed(2) + 'px) scale(' + fit.s.toFixed(4) + ') rotateX(' + RX + 'deg) rotateZ(' + RZ + 'deg)';
    }
    function measure() {
      var W0 = host.clientWidth, H0 = host.clientHeight;
      if (!W0 || !H0) return false;
      if (W0 === fit.w && H0 === fit.h) return true;
      fit.w = W0; fit.h = H0;
      var m = Math.max(8, Math.min(W0, H0) * 0.035);
      // The right phone's box: right edge at W - m, its left edge at 23%.
      var bx0 = W0 * 0.19, bx1 = W0 - m, oy = H0 * 0.47;
      fit.s = W0 / 1600; fit.cx = W0 * 0.6; fit.cy = oy;
      for (var i = 0; i < 5; i++) {
        place();
        var hr = host.getBoundingClientRect(), b = P1.el.getBoundingClientRect();
        var x0 = b.left - hr.left, x1 = b.right - hr.left, y0 = b.top - hr.top, y1 = b.bottom - hr.top;
        var k = Math.min((bx1 - bx0) / (x1 - x0), (H0 - 2 * m) / (y1 - y0));
        fit.s *= k;
        fit.cx = bx1 - (x1 - fit.cx) * k;
        fit.cy = oy - ((y0 + y1) / 2 - fit.cy) * k;
      }
      place();
      return true;
    }
    measure();
    if (window.ResizeObserver) new ResizeObserver(function () { measure(); }).observe(host);

    if (reduce) { still(); return; }
    if (host.hasAttribute('data-t')) {
      vt = +host.getAttribute('data-t') || 0;
      seek(vt);
      if (host.hasAttribute('data-hold')) return;
    }

    var visible = true;
    if (window.IntersectionObserver) {
      visible = false;
      new IntersectionObserver(function (es) {
        visible = es.some(function (e) { return e.isIntersecting; });
        if (visible) kick();
      }, { threshold: 0.05 }).observe(host);
    }
    var last = 0, raf = 0;
    function frame(now) {
      raf = 0;
      if (!host.isConnected) return;
      var dt = last ? Math.min(250, now - last) : 16;
      last = now;
      if (!visible || document.hidden) { last = 0; return; }
      vt += dt;
      if (vt >= LOOP) {
        vt -= LOOP;
        // Fresh copies of both apps at their first frame, laid under the old
        // ones (they look the same at this point), then the old ones go.
        var oR = R, oL = L, oA = anims;
        anims = [];
        R = makeFeed(); L = makeInsight();
        P1.screen.insertBefore(R.app, oR.app);
        P0.screen.insertBefore(L.app, oL.app);
        S = script(R, L, anims); ei = 0;
        setTimeout(function () { oA.forEach(function (a) { a.cancel(); }); oR.app.remove(); oL.app.remove(); }, 250);
      }
      runTo(vt);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) kick(); });
    kick();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-hive:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', ''); build(h);
    });
  }
  function start() {
    scan(document);
    if (window.MutationObserver) new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
