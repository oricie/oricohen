/* The exam-management dashboard (older work), rebuilt in code for the
 * Lucky Card's grid.
 *
 * The whole image is rebuilt, backdrop included, at its own size — 1198 by
 * 1058, positions and colours measured off it — and scaled to cover its
 * tile. The interface is Hebrew, so it reads right to left; text is placed
 * by its right edge.
 *
 * When the tile comes into view the three lines draw across the chart, the
 * gauge sweeps to 76% and the figures count up — quickly, once — and then
 * it holds still.
 */
(function () {
  var W = 1198, H = 1058;

  function el(tag, cls, css, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function put(p, c) { p.appendChild(c); return c; }
  // Left-anchored box.
  function at(x, y, w, h) {
    return 'left:' + x + 'px;top:' + y + 'px;' + (w != null ? 'width:' + w + 'px;' : '') + (h != null ? 'height:' + h + 'px;' : '');
  }
  // Text whose right edge sits at x, vertically centred on y.
  function rt(p, x, y, text, cls) {
    return put(p, el('span', 'md-t ' + (cls || ''), 'right:' + (W - x) + 'px;top:' + (y - 12) + 'px', text));
  }
  // Text centred on x, y.
  function ct(p, x, y, text, cls) {
    return put(p, el('span', 'md-t md-c ' + (cls || ''), 'left:' + (x - 150) + 'px;top:' + (y - 12) + 'px;width:300px', text));
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
  var ICO = {
    doc: '<path d="M3 1.5h5l3 3v8H3z"/><path d="M5 7h4M5 9.5h4"/>',
    user: '<circle cx="7" cy="4.5" r="2.5"/><path d="M2 13c0-3 2.2-5 5-5s5 2 5 5"/>',
    pin: '<path d="M7 13s-4-4.2-4-7.2a4 4 0 0 1 8 0C11 8.8 7 13 7 13z"/><circle cx="7" cy="5.8" r="1.4"/>',
    grid: '<path d="M2 2h3v3H2zM6 2h3v3H6zM10 2h2v3h-2zM2 6h3v3H2zM6 6h3v3H6zM10 6h2v3h-2zM2 10h3v2H2zM6 10h3v2H6z"/>',
    gear: '<circle cx="7" cy="7" r="2"/><path d="M7 1.5v2M7 10.5v2M1.5 7h2M10.5 7h2M3 3l1.4 1.4M9.6 9.6 11 11M3 11l1.4-1.4M9.6 4.4 11 3"/>',
    trend: '<path d="M1.5 12.5h11"/><path d="M2 10l3.5-4 2.5 2.5L12 3.5"/>',
    disk: '<path d="M2 2h8l2 2v8H2z"/><path d="M4.5 2v3h4V2M4 12V8h6v4"/>',
    base: '<path d="M3 1.5h5l3 3v8H3z"/><path d="M5 7h4M5 9h4M5 11h2"/>',
    win: '<path d="M2 2.5h10v9H2z"/><path d="M2 5h10M5 5v6.5"/>',
    folder: '<path d="M1.5 3.5h4l1.2 1.3h5.8v6.7h-11z"/>',
    bars: '<path d="M2 11V6M5 11V3M8 11V7"/>'
  };
  function icon(p, name, cx, cy, size, color, fill) {
    return put(p, svg(14, 14, ICO[name], 'position:absolute;left:' + (cx - size / 2) + 'px;top:' + (cy - size / 2) +
      'px;width:' + size + 'px;height:' + size + 'px;fill:' + (fill || 'none') + ';stroke:' + color +
      ';stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round'));
  }

  var X = [240, 273, 317, 365, 410, 504, 566, 628, 658, 722, 780];
  var LINES = [
    ['#2aa2e6', [836, 836, 836, 815, 820, 781, 803, 766, 797, 749, 706]],
    ['#fe7370', [906, 906, 905, 873, 882, 848, 869, 832, 862, 816, 815]],
    ['#52efa4', [980, 968, 971, 955, 968, 938, 960, 931, 957, 914, 913]]
  ];

  function build(host) {
    host.innerHTML = '';
    var ui = put(host, el('span', 'md'));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'md-stage', 'width:' + W + 'px;height:' + H + 'px'));

    var win = put(st, el('span', 'md-win', at(-40, 323, 1058, 760)));
    function P(x, y, w, h, cls) { return put(st, el('span', cls, at(x, y, w, h))); }

    // Top bar, right to left.
    P(0, 323, 813, 70, 'md-top');
    [['doc', 'מבחנים', 791, 760], ['user', 'נבחנים', 710, 698], ['pin', 'מקומות מבחן', 627, 615],
     ['grid', 'שיבוצים', 531, 518], ['gear', 'זימונים', 447, 433], ['trend', 'סטטיסטיקה', 369, 357],
     ['disk', 'דיסקט יצוא', 268, 256], ['base', 'בסיס נתונים', 175, 163], ['win', 'חלונות', 73, 62]].forEach(function (b) {
      icon(st, b[0], b[2], 358, 13, '#8a8a8a');
      rt(st, b[3], 358, b[1], 'md-nav');
    });

    // Side navigation.
    P(813, 323, 205, 735, 'md-side');
    P(813, 323, 205, 70, 'md-side-h');
    ct(st, 918, 358, 'מערכת מבחנים', 'md-brand');
    P(823, 420, 3, 150, 'md-scroll');
    ['ההסתדרות הרפואית', 'חוקרים פרטיים', 'מבחני דמה', 'חשבי שכר'].forEach(function (t, i) {
      var y = 424 + i * 35.7;
      rt(st, 1013, y, '‹', 'md-side-t md-dim');
      icon(st, 'folder', 993, y, 13, '#1466a6', '#1466a6');
      rt(st, 976, y, t, 'md-side-t');
    });
    rt(st, 976, 567, 'מועצת רואי חשבון', 'md-side-t');
    P(813, 587, 203, 106, 'md-side-open');
    [['רואי חשבון מאי-יוני', '+'], ['רואי חשבון מועד מיוחד', '+'], ['רואי חשבון מאי-אוגוסט', '−']].forEach(function (r, i) {
      var y = 603 + i * 35.5;
      if (r[1] === '−') put(st, el('span', 'md-minus', at(986, y - 6, 12, 12), '−'));
      else rt(st, 998, y, r[1], 'md-side-t');
      rt(st, 976, y, r[0], 'md-side-t');
    });
    ['דיני תאגידים ומסחר', 'חשבונאות פיננסית', 'חשבונאות פיננסית מתקדמים..', 'טכנולוגיות מידע', 'כלכלה (3661)',
     'מבוא לחשבונאות', 'מימון', 'משפט עסקי', 'סטטיסטיקה', 'תמחור וחשבונאות ניהול'].forEach(function (t, i) {
      var y = 709 + i * 35.7;
      icon(st, 'doc', 975, y, 12, '#1466a6', '#1466a6');
      rt(st, 960, y, t, 'md-side-t');
    });

    // Content.
    P(0, 393, 813, 665, 'md-content');

    // Statistics summary, with the gauge.
    var c1 = P(647, 410, 151, 177, 'md-card md-card--1');
    ct(st, 722, 428, 'סיכום תוצאות סטטיסטי', 'md-card-t');
    P(661, 449, 121, 1, 'md-card-rule');
    var ticks = '';
    for (var k = 0; k < 60; k++) {
      var a = k / 60 * Math.PI * 2;
      ticks += '<path d="M' + (50 + Math.cos(a) * 44) + ' ' + (50 + Math.sin(a) * 44) + 'L' + (50 + Math.cos(a) * 49) + ' ' + (50 + Math.sin(a) * 49) + '"/>';
    }
    var gauge = put(st, svg(100, 100,
      '<g stroke="#1570c0" stroke-width="1.2">' + ticks + '</g>' +
      '<circle cx="50" cy="50" r="33" fill="none" stroke="#1672bd" stroke-width="9"/>' +
      '<circle class="md-arc" cx="50" cy="50" r="33" fill="none" stroke="#45b1e0" stroke-width="9" pathLength="100" transform="rotate(-90 50 50)"/>',
      'position:absolute;left:671px;top:457px;width:100px;height:100px', 'md-gauge'));
    var pct = ct(st, 721, 507, '76%', 'md-gauge-t');
    ct(st, 722, 566, 'ממוצע', 'md-card-l');

    // Registered candidates.
    P(488, 410, 150, 177, 'md-card md-card--2');
    ct(st, 562, 428, 'נבחנים רשומים', 'md-card-t');
    P(502, 449, 121, 1, 'md-card-rule');
    var counts = [];
    [['סה״כ', '36'], ['בפועל', '37'], ['ממוצע', '37'], ['אחוז', '94.44%']].forEach(function (r, i) {
      var y = 468 + i * 29.7;
      rt(st, 624, y, r[0], 'md-card-l');
      icon(st, 'bars', 508, y, 13, '#ffffff');
      var v = put(st, el('span', 'md-t md-card-v', 'left:530px;top:' + (y - 12) + 'px', r[1]));
      counts.push([v, r[1]]);
    });

    // Summary by exam section.
    P(223, 410, 257, 177, 'md-card md-card--3');
    ct(st, 351, 428, 'סיכום לפי חלקי מבחן', 'md-card-t');
    P(237, 449, 228, 1, 'md-card-rule');
    [['משקל החלק', '100%'], ['מס שאלות', '30'], ['ממוצע', '78.43'], ['סטית התקן', '9.08']].forEach(function (r, i) {
      var y = 471 + i * 29.2;
      rt(st, 465, y, r[0], 'md-card-l');
      rt(st, 336, y, r[0], 'md-card-l');
      [356, 237].forEach(function (x) {
        var v = put(st, el('span', 'md-t md-card-v', 'left:' + x + 'px;top:' + (y - 12) + 'px', r[1]));
        counts.push([v, r[1]]);
      });
    });

    // Calibration panel on the left.
    P(-10, 410, 217, 632, 'md-panel');
    ct(st, 90, 432, 'כיול נתונים', 'md-panel-t');
    P(0, 450, 193, 1, 'md-rule');
    [['פקטור נקודות', 192, 490, 94], ['פקטור אחוזים', 88, 490, -10], ['פקטור שאלה', 192, 528, 94], ['ציון מעבר', 88, 528, -10]].forEach(function (f) {
      rt(st, f[1], f[2], f[0], 'md-label');
      var b = put(st, el('span', 'md-spin', at(f[3], f[2] - 15, 33, 30)));
      put(b, el('span', 'md-t', 'right:4px;top:3px', '80'));
    });
    rt(st, 192, 589, 'תשובות נכונות, משקל וסטטוס השאלות', 'md-label');
    P(0, 611, 193, 1, 'md-rule');
    [['מספר', 181], ['נכונות', 134], ['משקל', 85], ['סטטוס', 26]].forEach(function (h) { rt(st, h[1], 640, h[0], 'md-th'); });
    for (var r = 0; r < 12; r++) {
      var y = 677 + r * 25.2;
      P(0, y - 13, 207, 1, 'md-row-rule');
      rt(st, 176, y, String(r + 1), 'md-td');
      rt(st, 124, y, 'א', 'md-td');
      rt(st, 80, y, '100', 'md-td');
      rt(st, 26, y, 'רגילה', 'md-td md-dim2');
    }
    P(135, 993, 63, 28, 'md-btn');
    ct(st, 166, 1007, 'עדכן חשב', 'md-btn-t');
    P(107, 999, 14, 14, 'md-cb');
    rt(st, 99, 1007, 'צור נקודות שחזור לפני העדכון', 'md-td md-dim2');

    // The chart.
    P(226, 607, 574, 434, 'md-chart');
    ct(st, 513, 629, 'סיכום לפי חלקי מבחן', 'md-chart-t');
    var g = '<g stroke="#3b6689" stroke-width="1" stroke-dasharray="2 3" fill="none">' +
      '<rect x="238.5" y="660.5" width="542" height="337"/>' +
      '<path d="M238 723H780M238 786H780M238 857H780M238 929H780"/></g>';
    LINES.forEach(function (l, i) {
      var d = 'M' + X.map(function (x, j) { return x + ' ' + l[1][j]; }).join('L');
      g += '<path class="md-line" style="--i:' + i + '" d="' + d + '" pathLength="1" fill="none" stroke="' + l[0] + '" stroke-width="3" stroke-linejoin="round"/>';
      X.forEach(function (x, j) {
        if (j === 0 || j === 2 && i === 1) return;
        g += '<circle class="md-dot' + (j === X.length - 2 ? ' md-dot--last' : '') + '" style="--i:' + i + ';--j:' + j + '" cx="' + x + '" cy="' + l[1][j] + '" r="5" fill="' + l[0] + '"/>';
      });
    });
    put(st, svg(W, H, g, 'position:absolute;left:0;top:0', 'md-plot'));
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach(function (v, i) {
      ct(st, 285 + i * 49.6, 1019, String(v), 'md-axis');
    });

    // Fit: cover the tile, a little closer than the image, framed on the
    // interface rather than on the backdrop above it.
    var FOCUS = [729, 700], ZOOM = 1.35;
    function fit() {
      var w = host.clientWidth, h = host.clientHeight;
      var k = Math.max(w / W, h / H) * ZOOM;
      var tx = Math.min(0, Math.max(w - W * k, w / 2 - FOCUS[0] * k));
      var ty = Math.min(0, Math.max(h - H * k, h / 2 - FOCUS[1] * k));
      st.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')';
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

    // Play once when seen; the rest is ambient.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function count(node, target, ms) {
      var num = parseFloat(target), dec = (target.split('.')[1] || '').replace('%', '').length, pc = target.indexOf('%') > -1;
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        node.textContent = (num * e).toFixed(dec) + (pc ? '%' : '');
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    function play() {
      ui.classList.add('is-on');
      counts.forEach(function (c) { count(c[0], c[1], 900); });
      count(pct, '76%', 1000);
    }
    if (reduce) { ui.classList.add('is-on', 'is-still'); return; }
    counts.forEach(function (c) { c[0].textContent = c[1].indexOf('%') > -1 ? '0%' : '0'; });
    pct.textContent = '0%';
    if (window.IntersectionObserver) {
      var seen = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); play(); }
      }, { threshold: 0.3 });
      seen.observe(host);
    } else play();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-dash:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', ''); build(h);
    });
  }
  scan(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
