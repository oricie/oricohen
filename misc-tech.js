/* TECHWARS, the iOS-versus-Android comparison app (older work), rebuilt in
 * code for the Lucky Card's grid.
 *
 * The whole image is rebuilt, backdrop included, at its own size — 1198 by
 * 1058, positions and colours measured off it — and scaled to cover its
 * tile. Only the photographs inside the screenshot (the two hero shots, the
 * people's faces) and three intricate platform wordmarks are image crops;
 * everything else is built here.
 *
 * When the tile first comes into view there is one short intro, about a
 * second: the pie sweeps to its 80/20 split, the figures count up and the
 * "Me Too" boxes tick on. Then it stays still, on the screenshot's frame.
 */
(function () {
  var W = 1198, H = 1058;
  var IMG = 'images/tech-';
  // Framing: the point of the image kept at the tile's centre, and how much
  // closer than a plain cover. Tuned for a wide 2:1 tile: the top bar and both
  // product cards, with backdrop showing above and to the right of the
  // window, which bleeds off the left.
  var FOCUS = [675, 459], ZOOM = 1.275;   // defaults; a host may set data-focus="x,y" and data-zoom

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
  var SVG = 'http://www.w3.org/2000/svg';
  function svg(p, x, y, w, h, inner, cls, vb) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', vb || ('0 0 ' + w + ' ' + h));
    s.setAttribute('width', w); s.setAttribute('height', h);
    s.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px';
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = inner;
    return put(p, s);
  }

  // Text by its left edge and baseline; `w` is the measured ink width, which
  // fit() matches with letter-spacing (and, past that, a slight squeeze), so
  // the line lands on the source whatever the local font.
  var fits = [];
  function T(p, x, base, size, text, cls, w, align) {
    var css = 'font-size:' + size + 'px;line-height:' + size + 'px;top:' + (base - size * 0.85).toFixed(2) + 'px;';
    if (align === 'c') css += 'left:' + (x - 300) + 'px;width:600px;text-align:center;';
    else css += 'left:' + x + 'px;';
    var n = put(p, el('span', 'mt-t ' + (cls || ''), css, text));
    if (w) fits.push([n, w, align === 'c', text]);
    return n;
  }
  function fitText() {
    fits.forEach(function (f) {
      var n = f[0], inner = n;
      if (f[2]) {
        // Centred text: measure the glyph run, not the wide box.
        inner = n.querySelector('.mt-run');
        if (!inner) { inner = el('span', 'mt-run', '', n.textContent); n.textContent = ''; n.appendChild(inner); }
      }
      // Measure the final text, even mid count-up.
      var now = inner.textContent;
      inner.textContent = f[3];
      inner.style.letterSpacing = '';
      inner.style.transform = '';
      var len = Math.max(1, f[3].length);
      var ow = inner.offsetWidth, target = f[1] + 1;
      inner.textContent = now;
      if (!ow) return;
      var ls = Math.max(-0.4, Math.min(0.6, (target - ow) / len));
      var sx = target / (ow + ls * len);
      inner.style.letterSpacing = ls.toFixed(3) + 'px';
      if (Math.abs(sx - 1) > 0.004) {
        inner.style.display = 'inline-block';
        inner.style.transform = 'scaleX(' + sx.toFixed(4) + ')';
        inner.style.transformOrigin = f[2] ? '50% 50%' : '0 50%';
      }
    });
  }

  // Shapes -----------------------------------------------------------------
  var APPLE = 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z';
  function android(fill) {
    // 24 x 26 box.
    return '<g fill="' + fill + '"><path d="M5.6 8.4a6.4 6 0 0 1 12.8 0z"/>' +
      '<path d="M5.6 9.4h12.8v9.1a1.5 1.5 0 0 1-1.5 1.5H7.1a1.5 1.5 0 0 1-1.5-1.5z"/>' +
      '<rect x="1.6" y="9.4" width="3.1" height="8.6" rx="1.55"/><rect x="19.3" y="9.4" width="3.1" height="8.6" rx="1.55"/>' +
      '<rect x="8" y="17" width="3.1" height="8" rx="1.55"/><rect x="12.9" y="17" width="3.1" height="8" rx="1.55"/></g>' +
      '<g stroke="' + fill + '" stroke-width=".9" stroke-linecap="round"><path d="M8.6 3.3 7.4 1.4M15.4 3.3l1.2-1.9"/></g>' +
      '<g fill="#fff"><circle cx="9.4" cy="5.9" r=".8"/><circle cx="14.6" cy="5.9" r=".8"/></g>';
  }
  function star(cx, cy, r) {
    var d = '';
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2);
    }
    return '<path d="' + d + 'z"/>';
  }
  var TROPHY = '<path d="M4.2 1h8.6v1.2h2.6c.5 0 .8.3.8.8 0 2.6-1.8 4.6-4.1 5-.6 1.1-1.5 1.9-2.6 2.2v2.2h2.3c.6 0 1 .4 1 1v1.6H4.2v-1.6c0-.6.4-1 1-1h2.3v-2.2C6.4 9.9 5.5 9.1 4.9 8 2.6 7.6.8 5.6.8 3c0-.5.3-.8.8-.8h2.6zM2.3 3.6c.2 1.4 1.1 2.5 2.3 2.9-.2-.8-.4-1.8-.4-2.9zm12.4 0h-1.9c0 1.1-.2 2.1-.4 2.9 1.2-.4 2.1-1.5 2.3-2.9z" fill-rule="evenodd"/>';
  var HAND = 'M5.5 1.2c.9 0 1.6.7 1.6 1.6v6.3c.3-.4.8-.6 1.3-.6.8 0 1.4.5 1.6 1.2.3-.3.7-.5 1.2-.5.8 0 1.4.5 1.6 1.2.3-.2.6-.3 1-.3.9 0 1.6.7 1.6 1.6v4.9c0 1.1-.3 2.2-.8 3.1l-1 1.9v1.9H6.4v-1.7L2.7 16.5c-.5-.6-1.1-1.5-1.4-2.2-.3-.8-.4-1.3.1-1.8.6-.5 1.4-.4 2 .1l.5.5V2.8c0-.9.7-1.6 1.6-1.6z';

  var uid = 0;
  function build(host) {
    var sid = 'mt-sh' + (++uid);
    host.innerHTML = '';
    fits = [];
    var ui = put(host, el('span', 'mt'));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'mt-stage', 'width:' + W + 'px;height:' + H + 'px'));
    function P(x, y, w, h, cls) { return put(st, el('span', cls, at(x, y, w, h))); }
    function img(x, y, w, h, name, cls) {
      var i = put(st, el('img', 'mt-img ' + (cls || ''), at(x, y, w, h)));
      i.src = IMG + name + '.webp'; i.alt = ''; i.draggable = false;
      return i;
    }

    // The window.
    P(78, 246, 1040, 812, 'mt-win');
    P(78, 246, 1040, 53, 'mt-top');

    // Top bar ----------------------------------------------------------------
    T(st, 91, 280.5, 16.5, 'TECH', 'mt-logo', 38);
    T(st, 131, 280.5, 16.5, 'WARS', 'mt-logo mt-logo-b', 44);

    function search(x) {
      svg(st, x, 258, 16, 16, '<circle cx="6.3" cy="6.3" r="4.4" fill="none" stroke="#43b0af" stroke-width="2.3"/>' +
        '<path d="M9.6 9.6 13.6 13.6" stroke="#43b0af" stroke-width="2.6" stroke-linecap="round"/>');
      P(x - 9, 286, 32, 2, 'mt-uline');
    }
    function tile(x, sel, content, clipR) {
      var w = clipR ? clipR - x : 43;
      var t = P(x, 246, w, 42, 'mt-tile' + (sel ? ' mt-tile--sel' : '') + (clipR ? ' mt-tile--cut' : ''));
      if (content) content(t);
      return t;
    }
    function tImg(name) {
      return function (t) {
        var i = put(t, el('img', 'mt-img', at(1, 2, 39, 38)));
        i.src = IMG + name + '.webp'; i.alt = '';
      };
    }
    function apple(t) {
      put(t, el('span', 'mt-appsq', at(6, 5, 31, 31)));
      var s = document.createElementNS(SVG, 'svg');
      s.setAttribute('viewBox', '0 0 24 24');
      s.style.cssText = 'position:absolute;left:11.5px;top:10px;width:20px;height:20px';
      s.innerHTML = '<path fill="#fff" d="' + APPLE + '"/>';
      t.appendChild(s);
    }
    function robot(t) {
      var s = document.createElementNS(SVG, 'svg');
      s.setAttribute('viewBox', '0 0 24 26');
      s.style.cssText = 'position:absolute;left:10px;top:9px;width:22px;height:24px';
      s.innerHTML = android('#a5c63b');
      t.appendChild(s);
    }
    function chevron(x) {
      svg(st, x, 257, 14, 22, '<path d="M2.5 2.3 11 10.5 2.5 18.7" fill="none" stroke="#46b0b0" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>');
    }
    search(229);
    tile(265, true, apple);
    tile(314, false, tImg('firefox'));
    tile(364, false, tImg('symbian'));
    tile(415, false, tImg('meego'));
    tile(465, false, tImg('firefox'), 490);
    chevron(500);
    svg(st, 533, 262, 26, 16, '<path d="M6.6 2.8 2.5 7.7l4.1 4.9" fill="none" stroke="#f7ac69" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M13 1.5v12.6" stroke="#9b9ca1" stroke-width="1.3"/>' +
      '<path d="M19.6 2.8l4.1 4.9-4.1 4.9" fill="none" stroke="#8addda" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>');
    search(579);
    tile(616, true, robot);
    tile(665, false, tImg('firefox'));
    tile(715, false, tImg('symbian'));
    tile(766, false, tImg('meego'));
    tile(815, false, tImg('firefox'), 840);
    chevron(850);
    svg(st, 945, 259, 19, 19, '<circle cx="9.5" cy="5.5" r="4.6" fill="#4aadad"/><path d="M1.8 17.8c0-4.4 2.6-6.9 7.7-6.9s7.7 2.5 7.7 6.9z" fill="#4aadad"/>');
    T(st, 976, 273.5, 13, 'Nimo (Nimrod Shkedy)', 'mt-user', 118);
    // The notches under the chosen tiles.
    svg(st, 280, 298, 16, 8, '<path d="M0 1h16L8 7z" fill="#fff"/><path d="M0 1.5 8 7.5 16 1.5" fill="none" stroke="#e2e2e2" stroke-width="1"/>');
    svg(st, 630, 298, 16, 8, '<path d="M0 1h16L8 7z" fill="#fff"/><path d="M0 1.5 8 7.5 16 1.5" fill="none" stroke="#e2e2e2" stroke-width="1"/>');

    // Side navigation ------------------------------------------------------------
    P(186, 317, 2, 741, 'mt-sep');
    P(184, 317, 3, 92, 'mt-ind');
    svg(st, 178, 353, 8, 14, '<path d="M7 1 1 7l6 6z" fill="#47b0b1"/>');
    svg(st, 120, 351, 28, 19, '<path d="M1.2 9.5C4.4 4.2 8.8 1.5 14 1.5s9.6 2.7 12.8 8c-3.2 5.3-7.6 8-12.8 8s-9.6-2.7-12.8-8z" fill="#45b1ad"/>' +
      '<circle cx="14" cy="9.5" r="6.4" fill="#eeeeee"/><circle cx="14" cy="9.5" r="5" fill="#45b1ad"/><circle cx="11.8" cy="7.4" r="1.6" fill="#eeeeee"/>', 'mt-eye');
    T(st, 134, 395, 13.5, 'Overview', 'mt-nav mt-nav--on', 51, 'c');
    svg(st, 120, 451, 28, 25, '<path d="M3 2.5l22 20M25 2.5l-22 20" stroke="#cacaca" stroke-width="3.2" stroke-linecap="square"/>');
    T(st, 134, 502, 13.5, 'Battle', 'mt-nav', 32, 'c');
    svg(st, 120, 557, 30.5, 25.5, '<path d="M9.5 1.5C4.8 1.5 1.3 4.3 1.3 7.9c0 1.9 1 3.6 2.6 4.8L3 16.3l4.2-2.2c.7.2 1.5.3 2.3.3 4.7 0 8.2-2.9 8.2-6.5S14.2 1.5 9.5 1.5z" fill="#cacaca"/>' +
      '<path d="M19.6 7.6c.1.3.1.6.1.9 0 4.4-4.3 7.7-9.4 7.9 1.5 1.8 4 3 6.9 3 .8 0 1.6-.1 2.3-.3l4.2 2.2-.9-3.6c1.6-1.2 2.6-2.9 2.6-4.8 0-2.6-2.3-4.8-5.8-5.3z" fill="#cacaca"/>', null, '0 0 28 24');
    T(st, 134, 609, 13.5, 'Q&A', 'mt-nav', 23, 'c');
    svg(st, 121, 639, 27, 22, '<rect x="1.3" y="1.3" width="23.4" height="18.4" fill="none" stroke="#cacaca" stroke-width="2.2"/>' +
      '<g fill="#cacaca"><rect x="5.5" y="12" width="3" height="5"/><rect x="10" y="8" width="3" height="9"/><rect x="14.5" y="10" width="3" height="7"/><rect x="19" y="5" width="3" height="12"/></g>');
    T(st, 134, 687, 13.5, 'Trends', 'mt-nav', 38, 'c');
    svg(st, 120, 737, 28, 20, '<rect x="1" y="1" width="26" height="18" fill="#cacaca"/><path d="M4.5 4.5h19v11h-19z" fill="#eeeeee"/>' +
      '<path d="M3 3h5.5a4.5 4.5 0 0 1-5.5 5.5zM25 3h-5.5a4.5 4.5 0 0 0 5.5 5.5zM3 17h5.5A4.5 4.5 0 0 0 3 11.5zM25 17h-5.5a4.5 4.5 0 0 1 5.5-5.5z" fill="#cacaca"/>' +
      '<ellipse cx="14" cy="10" rx="4.4" ry="4.6" fill="#cacaca"/><path d="M13.6 7.6h1.2v5h-1.2z" fill="#eeeeee"/>');
    T(st, 134, 787, 13.5, 'Price', 'mt-nav', 27, 'c');
    var g9 = '';
    for (var gy = 0; gy < 3; gy++) for (var gx = 0; gx < 3; gx++) g9 += '<rect x="' + (gx * 7.7) + '" y="' + (gy * 6.3) + '" width="6.3" height="5" rx=".6"/>';
    svg(st, 123, 834, 22, 18, '<g fill="#cacaca">' + g9 + '</g>');
    T(st, 134, 882, 13.5, 'Features', 'mt-nav', 47, 'c');

    // Product cards --------------------------------------------------------------
    var counters = [], ticks = [];
    function product(x, w, photo, logo, name, nameW, usesVal, pair) {
      P(x, 318, w, 242, 'mt-card');
      img(x, 318, w, 166, photo);
      P(x, 484, w, 1, 'mt-card-rule');
      logo();
      T(st, pair.nx, pair.nb, 21.5, name, 'mt-pname', nameW);
      var s = '';
      for (var i = 0; i < 4; i++) s += star(5.8 + i * 14.5, 5.3, 5.8);
      svg(st, pair.sx, pair.sy + 1.2, 60, 11, '<g fill="#c9c9c9">' + s + '</g>');
      P(pair.dv, 484, 1, 76, 'mt-card-div');
      var v = T(st, pair.ux, pair.ub, 17.5, usesVal, 'mt-uses', pair.uw);
      counters.push([v, usesVal]);
      T(st, pair.ux + 37.5, pair.ub, 12.5, 'Use This', 'mt-uses-l', 45);
      P(pair.bx, 526, 91, 27, 'mt-me');
      P(pair.bx + 3, 528, 22, 22, 'mt-cb');
      var ck = svg(st, pair.bx + 3, 528, 22, 22, '<path d="M5.5 11.5l4 4 7.5-8.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>', 'mt-tick');
      ticks.push(ck);
      T(st, pair.bx + 35, 545, 11.5, 'Me Too', 'mt-me-t', 37);
    }
    product(215, 308, 'ios', function () {
      P(231, 500, 46, 45, 'mt-applogo');
      svg(st, 238, 505, 32, 32, '<path fill="#fff" d="' + APPLE + '"/>', null, '0 0 24 24');
    }, 'Ios', 26, '1.2K', { nx: 288, nb: 521, sx: 289, sy: 532, dv: 416, ux: 430, ub: 512.5, uw: 34, bx: 425 });
    product(572, 309, 'android', function () {
      svg(st, 596, 505, 32, 34, android('#a4c72e'), null, '0 0 24 26');
    }, 'Android', 69, '2.2K', { nx: 646, nb: 520, sx: 646, sy: 531, dv: 771, ux: 785, ub: 512.5, uw: 35, bx: 781 });

    // Hero captions over the photos.
    T(st, 232, 447, 11.8, 'IOS is a widely used general-purpose, high-level', 'mt-cap', 229);
    T(st, 232, 459.5, 11.8, 'programming language. Its design philosophy', 'mt-cap', 222);
    T(st, 589, 449, 11.8, 'Android works perfectly with your favorite', 'mt-cap', 202);
    T(st, 589, 461.5, 11.8, 'apps like Google Maps, Calendar, Gmail and', 'mt-cap', 210);

    // Comments -------------------------------------------------------------------
    function comment(x, w, o, face, name, nameW, official, line1, w1, line2, w2) {
      P(x, 577, w, 109, 'mt-card');
      svg(st, x + 14, 596, 12, 9, '<path d="M1.5 7 6 2.5 10.5 7" fill="none" stroke="#cacaca" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>');
      T(st, x + 13, 635, 12.5, '83', 'mt-vote', 13);
      svg(st, x + 14, 663, 12, 9, '<path d="M1.5 2 6 6.5 10.5 2" fill="none" stroke="#cacaca" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>');
      img(x + o.av, 594, 34, 34, face);
      T(st, x + o.nm, 610, 13, name, 'mt-cname', nameW);
      if (official) {
        P(x + 152, 599, 38, 15, 'mt-off');
        T(st, x + 155, 610.5, 10.5, 'Official', 'mt-off-t', 31);
      }
      T(st, x + o.nm - 1, 624.5, 10.5, 'October 6', 'mt-date', 43);
      T(st, x + o.b1, 648, 12, line1, 'mt-body', w1);
      var l2 = T(st, x + o.b1 - 1, 661, 12, line2, 'mt-body', w2);
      return l2;
    }
    comment(215, 309, { av: 41, nm: 86, b1: 43 }, 'brian', 'Brian Stark', 62, true, 'My company has been using SiSense for almost', 232, 'two years as an internal tool for qui...', 176);
    T(st, 435.5, 661, 12, '(more)', 'mt-more', 32);
    comment(573, 310, { av: 47, nm: 92, b1: 41 }, 'nimo', 'Nimo', 30, false, 'My company has been using SiSense for almost', 232, 'two years as an internal tool for quickly...', 195);
    T(st, 808, 661, 12, '(more)', 'mt-more', 34);
    [[346, 0], [698, 0]].forEach(function (d) {
      for (var i = 0; i < 4; i++) P(d[0] + i * 16.6, 700.5, 8.5, 8.5, 'mt-dot');
    });
    P(215, 723, 667, 3, 'mt-rule');

    // Which one wins? ------------------------------------------------------------
    P(215, 742, 671, 53, 'mt-wh');
    T(st, 228, 775, 22, 'Which one wins?', 'mt-wh-t', 158);
    P(215, 795, 671, 258, 'mt-band');
    var dl = '<g class="mt-conn" stroke="#46b3b5" stroke-width="1.6" stroke-dasharray="2.6 2.4" fill="none"><path d="M430 892.5H467"/><path d="M630 892.5H673"/></g>';
    svg(st, 0, 0, W, H, dl, 'mt-lines');
    // The pie: a teal ring, the cyan disc, and Android's 20% in pale grey.
    var pie = svg(st, 466, 811, 164, 164,
      '<defs><filter id="' + sid + '" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#0a3a3c" flood-opacity=".35"/></filter></defs>' +
      '<circle cx="82" cy="82" r="81.5" fill="#46afb5"/>' +
      '<g filter="url(#' + sid + ')"><circle cx="82" cy="82" r="56" fill="#5adfe4"/></g>' +
      '<circle class="mt-slice" cx="82" cy="82" r="28" fill="none" stroke="#efeef1" stroke-width="56" pathLength="100" transform="rotate(-90 82 82)"/>',
      'mt-pie');
    var slice = pie.querySelector('.mt-slice');

    function side(cx, pct, pw, name, pb, nb) {
      var n = T(st, cx, pb + 2, 81, pct, 'mt-pct', pw, 'c');
      T(st, cx - 1, nb, 12, 'Of the users prefer:', 'mt-pref', 90, 'c');
      T(st, cx, nb + 14.5, 12, name, 'mt-pref', name === 'Ios' ? 12 : 36, 'c');
      return n;
    }
    var p80 = side(344.5, '80%', 107, 'Ios', 870, 897);
    var p20 = side(752, '20%', 105, 'Android', 872, 897);
    [325.5, 344, 362.5].forEach(function (cx, i) {
      var s = P(cx - 12.5, 928.5, 25, 25, 'mt-ring'); s.style.zIndex = 3 - i;
      var i2 = put(s, el('img', 'mt-img', at(1.5, 1.5, 22, 22))); i2.src = IMG + 'av' + (i + 1) + '.webp'; i2.alt = '';
    });
    [733, 751.5, 770].forEach(function (cx, i) {
      var s = P(cx - 12.5, 928.5, 25, 25, 'mt-ring'); s.style.zIndex = 3 - i;
      var i2 = put(s, el('img', 'mt-img', at(1.5, 1.5, 22, 22))); i2.src = IMG + 'av' + (i + 1) + '.webp'; i2.alt = '';
    });
    T(st, 345.5, 978.5, 12, 'Including Belli, Chan and Cahu', 'mt-pref', 146, 'c');
    T(st, 752.5, 978.5, 12, 'Including Belli, Chan and Cahu', 'mt-pref', 146, 'c');

    function win(x, label, lw, tx) {
      var b = P(x, 996, 230, 47, 'mt-win-b');
      var c = P(x + 5.5, 1001.5, 36, 36, 'mt-win-c');
      svg(st, x + 18, 1012, 12, 16, '<path d="M3 2.5 8.5 8 3 13.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
      svg(st, tx - 26.5, 1011.2, 18.5, 17.4, TROPHY.replace('<path', '<path fill="#fff"'), null, '0 0 17 16');
      T(st, tx, 1027.5, 22, label, 'mt-win-t', lw);
      return [b, c];
    }
    var winIos = win(233, 'IOS WINS', 60, 311);
    var winAnd = win(636, 'ANDROID WINS', 99, 715);
    var hand = svg(st, 650, 1028.5, 26, 34, '<g transform="scale(1.4)"><path d="' + HAND + '" fill="#fff" stroke="#111" stroke-width="1.15" stroke-linejoin="round"/>' +
      '<path d="M10 10.3v3.6M12.8 11v3M7.1 9.3v4.3" stroke="#111" stroke-width=".9" stroke-linecap="round"/></g>', 'mt-hand', '0 0 26 34');

    // Right column ----------------------------------------------------------------
    P(913, 321, 1, 737, 'mt-sep2');
    P(939, 320, 156, 167, 'mt-help');
    T(st, 1013.5, 352, 12.5, 'Need Help?', 'mt-help-h', 60, 'c');
    [985.5, 1012, 1038.5].forEach(function (cx, i) {
      var a = img(cx - 16.5, 369.5, 33, 33, 'av' + (i + 1), 'mt-face');
      a.style.zIndex = 3 - i;
    });
    T(st, 1016.5, 426, 11.5, 'Ami, Yaron and nimo', 'mt-help-t', 100, 'c');
    T(st, 1017, 439, 11.5, 'are waiting to help you', 'mt-help-t', 109, 'c');
    P(948, 449, 138, 30, 'mt-adv');
    T(st, 1016.5, 469.5, 11.5, 'Get Advice', 'mt-adv-t', 52, 'c');
    T(st, 941, 517, 11.5, 'Recent Discussions', 'mt-rd-h', 103);
    var Q = [
      [539, 559, [['How Can I Safely Double The', 139], ['Length of A Ladder?', 96]]],
      [604, 640, [['Has the US Government tagged', 152], ['people to be killed with stickers', 151], ['on the mailboxes?', 88]]],
      [686, 734, [['Why didn’t Elrond choose one', 143], ['of his sons to be in the', 110], ['company that escorted the ring', 152], ['to Mordor?', 53]]],
      [779, 799, [['Why do they say ‘kawaii’ for', 133], ['‘poor thing’?', 58]]],
      [847, 866, [['How Can I Safely Double The', 139], ['Length of A Ladder?', 96]]],
      [910, 931, [['Was Valentina Tereshkova', 127], ['pregnant while in space?', 119]]],
      [977, 1012, [['Has the US Government tagged', 152], ['people to be killed with stickers', 151], ['on the mailboxes?', 88]]],
      [1057, 0, [['Why do they say ‘kawaii’ for', 133]]]
    ];
    Q.forEach(function (q) {
      q[2].forEach(function (l, i) { T(st, 941, q[0] + i * 13.5, 11.5, l[0], 'mt-q', l[1]); });
      if (q[1]) {
        P(941, q[1], 52, 20, 'mt-chip');
        T(st, 967, q[1] + 14, 10.5, 'Android', 'mt-chip-t', 31, 'c');
        P(996, q[1], 32, 20, 'mt-chip');
        T(st, 1012, q[1] + 14, 10.5, 'Ios', 'mt-chip-t', 14, 'c');
      }
    });

    // Fit: cover the tile, centred on the focus.
    var focus = FOCUS, zoom = ZOOM;
    if (host.dataset.focus) focus = host.dataset.focus.split(',').map(Number);
    if (host.dataset.zoom) zoom = parseFloat(host.dataset.zoom);
    function fit() {
      var w = host.clientWidth, h = host.clientHeight;
      var k = Math.max(w / W, h / H) * zoom;
      var tx = Math.min(0, Math.max(w - W * k, w / 2 - focus[0] * k));
      var ty = Math.min(0, Math.max(h - H * k, h / 2 - focus[1] * k));
      st.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')';
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
    fitText();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);

    // Motion: one short intro when first seen, then static.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function count(node, target, ms, delay) {
      var num = parseFloat(target), dec = (target.split('.')[1] || '').replace(/[^0-9]/g, '').length;
      var suf = target.replace(/^[0-9.]+/, '');
      var run = node.querySelector('.mt-run') || node;
      setTimeout(function () {
        var t0 = performance.now();
        (function step(now) {
          var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 4);
          run.textContent = (num * e).toFixed(dec) + suf;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      }, delay || 0);
    }
    function setRun(node, text) { (node.querySelector('.mt-run') || node).textContent = text; }
    function play() {
      ui.classList.add('is-on');
      count(p80, '80%', 900, 60);
      count(p20, '20%', 900, 60);
      counters.forEach(function (c) { count(c[0], c[1], 800, 120); });
      setTimeout(startLoop, 1700);
    }

    // The loop: the hand hops between the two buttons and presses one; the
    // split, the percentages, the tallies and the ticks follow the press.
    // Short and crisp, and it stops whenever the tile is off screen.
    var visible = true, looping = false, side = 0;
    var cur = { a: 80, b: 20, u0: 1.2, u1: 2.2 };
    function tween(node, from, to, ms, suf, dec) {
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        setRun(node, (from + (to - from) * e).toFixed(dec) + suf);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    var STATE = [   // [Ios %, Android %, Ios tally, Android tally]
      [82, 18, 1.3, 2.2],
      [78, 22, 1.2, 2.3]
    ];
    function press(i) {
      var st2 = STATE[i], btn = i ? winAnd : winIos;
      hand.style.setProperty('--hx', (i ? 0 : -403) + 'px');
      setTimeout(function () {
        hand.style.setProperty('--hs', '0.88'); btn[0].classList.add('is-press'); btn[1].classList.add('is-press');
      }, 420);
      setTimeout(function () {
        tween(p80, cur.a, st2[0], 420, '%', 0); tween(p20, cur.b, st2[1], 420, '%', 0);
        tween(counters[0][0], cur.u0, st2[2], 420, 'K', 1); tween(counters[1][0], cur.u1, st2[3], 420, 'K', 1);
        cur = { a: st2[0], b: st2[1], u0: st2[2], u1: st2[3] };
        slice.style.strokeDasharray = (st2[1] * 0.81).toFixed(2) + ' ' + (100 - st2[1] * 0.81).toFixed(2);
        ticks[0].classList.toggle('is-off', i === 1); ticks[1].classList.toggle('is-off', i === 0);
      }, 500);
      setTimeout(function () {
        hand.style.setProperty('--hs', '1'); btn[0].classList.remove('is-press'); btn[1].classList.remove('is-press');
      }, 720);
    }
    function loop() {
      if (!looping) return;
      if (!visible) { setTimeout(loop, 600); return; }
      press(side); side = 1 - side;
      setTimeout(loop, 2500);
    }
    function startLoop() { if (looping) return; looping = true; ui.classList.add('is-loop'); loop(); }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es.some(function (e) { return e.isIntersecting; }); }, { threshold: 0.1 }).observe(host);
    }
    if (reduce) { ui.classList.add('is-on', 'is-still'); return; }
    setRun(p80, '0%'); setRun(p20, '0%');
    counters.forEach(function (c) { setRun(c[0], '0.0K'); });
    if (window.IntersectionObserver) {
      var seen = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); play(); }
      }, { threshold: 0.3 });
      seen.observe(host);
    } else play();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-tech:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', ''); build(h);
    });
  }
  scan(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
