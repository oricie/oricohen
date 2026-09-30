/* The exam-management dashboard (older work), rebuilt in code for the
 * Lucky Card's grid.
 *
 * The whole image is rebuilt, backdrop included, at its own size — 1198 by
 * 1058, positions and colours measured off it — and scaled to cover its
 * tile. The original is in Hebrew and reads right to left; here it is in
 * English, so every position is mirrored (x becomes W - x) and it reads
 * left to right. The chart keeps its own direction, only its box moves.
 *
 * When the tile comes into view the three lines draw across the chart, the
 * gauge sweeps to 76% and the figures count up. Then, while it is in view,
 * a pointer keeps picking another subject in the side menu, and the chart,
 * the gauge and the figures move to that subject's results.
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
  // All x below are the Hebrew original's; each helper mirrors them.
  // A box whose left edge was at x.
  function at(x, y, w, h) {
    return 'left:' + (W - x - w) + 'px;top:' + y + 'px;width:' + w + 'px;' + (h != null ? 'height:' + h + 'px;' : '');
  }
  // Text that ended at x (right to left) now starts there, vertically centred on y.
  function rt(p, x, y, text, cls) {
    return put(p, el('span', 'md-t ' + (cls || ''), 'left:' + (W - x) + 'px;top:' + (y - 12) + 'px', text));
  }
  // Text centred on x, y.
  function ct(p, x, y, text, cls) {
    return put(p, el('span', 'md-t md-c ' + (cls || ''), 'left:' + (W - x - 150) + 'px;top:' + (y - 12) + 'px;width:300px', text));
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
    return put(p, svg(14, 14, ICO[name], 'position:absolute;left:' + (W - cx - size / 2) + 'px;top:' + (cy - size / 2) +
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

    // Top bar.
    P(0, 323, 813, 70, 'md-top');
    [['doc', 'Exams', 791, 760], ['user', 'Candidates', 710, 698], ['pin', 'Venues', 627, 615],
     ['grid', 'Seating', 531, 518], ['gear', 'Invites', 447, 433], ['trend', 'Statistics', 369, 357],
     ['disk', 'Export', 268, 256], ['base', 'Database', 175, 163], ['win', 'Windows', 73, 62]].forEach(function (b) {
      icon(st, b[0], b[2], 358, 13, '#8a8a8a');
      rt(st, b[3], 358, b[1], 'md-nav');
    });

    // Side navigation.
    P(813, 323, 205, 735, 'md-side');
    P(813, 323, 205, 70, 'md-side-h');
    ct(st, 918, 358, 'Exam system', 'md-brand');
    P(823, 420, 3, 150, 'md-scroll');
    ['Medical Association', 'Private Investigators', 'Mock Exams', 'Payroll'].forEach(function (t, i) {
      var y = 424 + i * 35.7;
      rt(st, 1013, y, '\u203a', 'md-side-t md-dim');
      icon(st, 'folder', 993, y, 13, '#1466a6', '#1466a6');
      rt(st, 976, y, t, 'md-side-t');
    });
    rt(st, 976, 567, 'Accountants Council', 'md-side-t');
    P(813, 587, 203, 106, 'md-side-open');
    [['Accountants, May\u2013June', '+'], ['Accountants, special', '+'], ['Accountants, May\u2013Aug', '\u2212']].forEach(function (r, i) {
      var y = 603 + i * 35.5;
      if (r[1] === '\u2212') put(st, el('span', 'md-minus', at(986, y - 6, 12, 12), '\u2212'));
      else rt(st, 998, y, r[1], 'md-side-t');
      rt(st, 976, y, r[0], 'md-side-t');
    });
    // The subjects; one of them is picked, and the pick moves.
    var pickBar = P(813, 709 - 17, 205, 34, 'md-pick');
    var subjects = ['Corporate Law', 'Financial Accounting', 'Advanced Financial Acc..', 'Information Technology', 'Economics (3661)',
     'Intro to Accounting', 'Finance', 'Business Law', 'Statistics', 'Management Accounting'].map(function (t, i) {
      var y = 709 + i * 35.7;
      icon(st, 'doc', 975, y, 12, '#1466a6', '#1466a6');
      return rt(st, 960, y, t, 'md-side-t');
    });

    // Content.
    P(0, 393, 813, 665, 'md-content');

    // Statistics summary, with the gauge.
    var c1 = P(647, 410, 151, 177, 'md-card md-card--1');
    ct(st, 722, 428, 'Results summary', 'md-card-t');
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
      'position:absolute;left:' + (W - 671 - 100) + 'px;top:457px;width:100px;height:100px', 'md-gauge'));
    var arc = gauge.querySelector('.md-arc');
    var pct = ct(st, 721, 507, '76%', 'md-gauge-t');
    ct(st, 722, 566, 'Average', 'md-card-l');

    // Registered candidates.
    P(488, 410, 150, 177, 'md-card md-card--2');
    ct(st, 562, 428, 'Registered', 'md-card-t');
    P(502, 449, 121, 1, 'md-card-rule');
    var counts = [];
    [['Total', '36'], ['Sat', '37'], ['Average', '37'], ['Share', '94.44%']].forEach(function (r, i) {
      var y = 468 + i * 29.7;
      rt(st, 624, y, r[0], 'md-card-l');
      icon(st, 'bars', 508, y, 13, '#ffffff');
      var v = put(st, el('span', 'md-t md-card-v', 'right:530px;top:' + (y - 12) + 'px', r[1]));
      counts.push([v, r[1]]);
    });

    // Summary by exam section.
    P(223, 410, 257, 177, 'md-card md-card--3');
    ct(st, 351, 428, 'By exam section', 'md-card-t');
    P(237, 449, 228, 1, 'md-card-rule');
    [['Weight', '100%'], ['Questions', '30'], ['Average', '78.43'], ['Std. dev.', '9.08']].forEach(function (r, i) {
      var y = 471 + i * 29.2;
      rt(st, 465, y, r[0], 'md-card-l');
      rt(st, 336, y, r[0], 'md-card-l');
      [356, 237].forEach(function (x) {
        var v = put(st, el('span', 'md-t md-card-v', 'right:' + x + 'px;top:' + (y - 12) + 'px', r[1]));
        counts.push([v, r[1]]);
      });
    });

    // Calibration panel, at the far side.
    P(-10, 410, 217, 632, 'md-panel');
    ct(st, 90, 432, 'Calibration', 'md-panel-t');
    P(0, 450, 193, 1, 'md-rule');
    [['Points', 192, 490, 94], ['Percent', 88, 490, -10], ['Question', 192, 528, 94], ['Pass mark', 88, 528, -10]].forEach(function (f) {
      rt(st, f[1], f[2], f[0], 'md-label');
      var b = put(st, el('span', 'md-spin', at(f[3], f[2] - 15, 33, 30)));
      put(b, el('span', 'md-t', 'right:4px;top:3px', '80'));
    });
    rt(st, 192, 589, 'Answers, weight and status', 'md-label');
    P(0, 611, 193, 1, 'md-rule');
    [['No.', 181], ['Correct', 134], ['Weight', 85], ['Status', 26]].forEach(function (h) { rt(st, h[1], 640, h[0], 'md-th'); });
    for (var r = 0; r < 12; r++) {
      var y = 677 + r * 25.2;
      P(0, y - 13, 207, 1, 'md-row-rule');
      rt(st, 176, y, String(r + 1), 'md-td');
      rt(st, 124, y, 'A', 'md-td');
      rt(st, 80, y, '100', 'md-td');
      rt(st, 26, y, 'Regular', 'md-td md-dim2');
    }
    P(135, 993, 63, 28, 'md-btn');
    ct(st, 166, 1007, 'Update', 'md-btn-t');
    P(107, 999, 14, 14, 'md-cb');
    rt(st, 99, 1007, 'Create restore points first', 'md-td md-dim2');

    // The chart.
    P(226, 607, 574, 434, 'md-chart');
    ct(st, 513, 629, 'Summary by exam section', 'md-chart-t');
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
    // The chart reads left to right in both languages, so its content is
    // only moved along with its box, not mirrored.
    var DX = (W - 226 - 574) - 226;
    var plot = put(st, svg(W, H, g, 'position:absolute;left:' + DX + 'px;top:0', 'md-plot'));
    var paths = plot.querySelectorAll('.md-line');
    var dots = LINES.map(function (l, i) { return plot.querySelectorAll('.md-dot[style*="--i:' + i + ';"]'); });
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach(function (v, i) {
      put(st, el('span', 'md-t md-c md-axis', 'left:' + (DX + 285 + i * 49.6 - 150) + 'px;top:1007px;width:300px', String(v)));
    });

    var cur = put(st, el('span', 'md-cursor'));
    cur.innerHTML = '<svg viewBox="0 0 24 36" width="16" height="24"><path d="M2 2v26l6.5-6 4.2 10 4.3-1.9-4.2-9.7H21z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';

    // Fit: cover the tile, a little closer than the image, framed on the
    // interface rather than on the backdrop above it.
    var FOCUS = [W - 729, 700], ZOOM = 1.35;
    function fit() {
      var w = host.clientWidth, h = host.clientHeight;
      var k = Math.max(w / W, h / H) * ZOOM;
      var tx = Math.min(0, Math.max(w - W * k, w / 2 - FOCUS[0] * k));
      var ty = Math.min(0, Math.max(h - H * k, h / 2 - FOCUS[1] * k));
      st.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')';
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

    // Each subject's results: the three lines, the gauge, then the figures
    // in the order they were made (registered, then the section table twice).
    var BASE = LINES.map(function (l) { return l[1]; });
    function variant(k) {
      if (!k) return BASE;
      return BASE.map(function (ys, i) {
        return ys.map(function (y, j) {
          if (!j) return y;
          return Math.round(y + 26 * Math.sin(j * 1.3 + k * 2.1 + i * 0.7) + 9 * Math.cos(j * 2.7 + k));
        });
      });
    }
    var SETS = [
      { sub: 0, g: 76, v: ['36', '37', '37', '94.44%', '100%', '100%', '30', '30', '78.43', '78.43', '9.08', '9.08'] },
      { sub: 3, g: 68, v: ['42', '40', '40', '95.24%', '100%', '100%', '25', '25', '71.20', '71.20', '11.34', '11.34'] },
      { sub: 6, g: 83, v: ['28', '27', '27', '96.43%', '100%', '100%', '40', '40', '84.10', '84.10', '7.52', '7.52'] },
      { sub: 8, g: 71, v: ['51', '47', '47', '92.16%', '100%', '100%', '35', '35', '74.65', '74.65', '10.21', '10.21'] }
    ];

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function count(node, from, target, ms) {
      var num = parseFloat(target), start = parseFloat(from) || 0;
      var dec = (target.split('.')[1] || '').replace('%', '').length, pc = target.indexOf('%') > -1;
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        node.textContent = (start + (num - start) * e).toFixed(dec) + (pc ? '%' : '');
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    var shown = BASE;
    function morph(to, ms) {
      var from = shown, t0 = performance.now();
      shown = to;
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        from.forEach(function (ys, i) {
          var cur = ys.map(function (y, j) { return y + (to[i][j] - y) * e; });
          paths[i].setAttribute('d', 'M' + X.map(function (x, j) { return x + ' ' + cur[j]; }).join('L'));
          var d = 0;
          X.forEach(function (x, j) {
            if (j === 0 || j === 2 && i === 1) return;
            dots[i][d++].setAttribute('cy', cur[j]);
          });
        });
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    function pickRow(sub) { pickBar.style.top = (709 - 17 + sub * 35.7) + 'px'; }
    function point(x, y, ms) { cur.style.transitionDuration = ms + 'ms'; cur.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }

    var atSet = 0;
    function show(k) {
      var set = SETS[k], prev = SETS[atSet];
      atSet = k;
      pickRow(set.sub);
      morph(variant(k), 700);
      arc.style.strokeDashoffset = 100 - set.g;
      count(pct, prev.g + '%', set.g + '%', 700);
      counts.forEach(function (c, i) { count(c[0], prev.v[i], set.v[i], 700); });
    }

    // While the tile is in view, move on to the next subject every few seconds.
    var visible = false, timer = null, started = false;
    function step() {
      timer = null;
      if (!visible) return;
      var k = (atSet + 1) % SETS.length, y = 709 + SETS[k].sub * 35.7;
      ui.classList.add('is-cursor');
      point(W - 900, y - 4, 650);
      setTimeout(function () { ui.classList.add('is-press'); }, 750);
      setTimeout(function () { ui.classList.remove('is-press'); show(k); }, 880);
      timer = setTimeout(step, 3800);
    }
    function play() {
      started = true;
      ui.classList.add('is-on');
      pickRow(0);
      counts.forEach(function (c) { count(c[0], '0', c[1], 900); });
      count(pct, '0%', '76%', 1000);
      point(W - 760, 860, 0);
      timer = setTimeout(step, 2200);
    }
    if (reduce) { ui.classList.add('is-on', 'is-still'); pickRow(0); return; }
    counts.forEach(function (c) { c[0].textContent = c[1].indexOf('%') > -1 ? '0%' : '0'; });
    pct.textContent = '0%';
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        visible = es.some(function (e) { return e.isIntersecting; });
        if (visible && !started) play();
        else if (visible && started && !timer) timer = setTimeout(step, 800);
        if (!visible) ui.classList.remove('is-cursor');
      }, { threshold: 0.3 }).observe(host);
    } else { visible = true; play(); }
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
