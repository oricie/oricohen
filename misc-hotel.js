/* PEOPLEPOST, a hotel page (New York Hilton Midtown), older work, rebuilt in
 * code for the Lucky Card's grid.
 *
 * The window is rebuilt at the image's own size (1198 wide), positions and
 * colours measured off it, and scaled into its tile. Only the photographs
 * (the gallery, the map with its pin, five tiny avatars) are image crops;
 * everything else is built here. The backdrop is a sage gradient instead of
 * the image's blue, so neighbouring tiles read apart.
 *
 * The page is longer than the image shows (more rooms, guest reviews,
 * amenities, a footer) and scrolls inside the window under a sticky search
 * bar. When the tile first comes into view there is a short intro (the
 * content settles in, the review checks and stars draw); then a loop runs
 * while the tile is on screen: down to the rooms, a press on BOOK, down to
 * the reviews, the rating bars fill, a helpful count ticks up, and back to
 * the top, which is the image's own frame. Reduced motion shows that frame
 * and nothing else.
 */
(function () {
  var W = 1198, H = 1180;
  var WX = 92, WY = 243, WW = 1012, WB = 1080;   // the window
  var PAGE_END = 2443;                             // page bottom, stage px
  var STICK = 58;                                  // nav height: bar sticks after this much scroll
  var IMG = 'images/hotel-';
  // Named framings; a host picks one with data-view, or sets data-focus="x,y"
  // and data-zoom itself.
  //   top   the window from a margin of backdrop above its top edge, its full
  //         width plus a little backdrop either side: anchored on the tile's
  //         width, so the height that shows is whatever results.
  //   full  1:1 (used for checking against the image).
  var VIEWS = {
    top: { from: 176, cx: 598, span: 1160 },
    full: { from: 0, cx: 599, k: 1 },
    detail: { focus: [600, 900], zoom: 1.7 }
  };
  var FOCUS = [598, 600], ZOOM = 1.15;

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
  // Rough Lato widths (em per character class), for lines I invented.
  function est(text, size) {
    var e = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      e += /[A-Z]/.test(c) ? 0.6 : /[a-z]/.test(c) ? 0.48 : /[0-9$]/.test(c) ? 0.6 : c === ' ' ? 0.2 : 0.26;
    }
    return Math.round(e * size);
  }
  function star(cx, cy, r) {
    var d = '';
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2);
    }
    return d + 'z';
  }
  var CHECK = 'M758.3 465 L765.7 472.4 L778.8 459.3';
  var PERSON = '<circle cx="951.4" cy="972.6" r="2.9" fill="none" stroke="#9a9a9a" stroke-width="1.5"/>' +
    '<path d="M945.8 982.3v-2.6c0-1.6 1.3-2.7 2.9-2.7h5.4c1.6 0 2.9 1.1 2.9 2.7v2.6" fill="none" stroke="#9a9a9a" stroke-width="1.5"/>';
  var THUMB = '<path d="M1 6.2h2.8v7H1zM5 6.6 7.6 1.5c.9 0 1.6.7 1.6 1.6 0 .6-.2 1.3-.5 2.2h3.7c.8 0 1.4.8 1.2 1.6l-1 4.4c-.2.8-.8 1.3-1.6 1.3H5z" fill="#c4c4c4"/>';

  var uid = 0;
  function build(host) {
    host.innerHTML = '';
    var fits = [];
    var ui = put(host, el('span', 'mh'));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'mh-stage', 'width:' + W + 'px;height:' + H + 'px'));

    // Text by its left edge and baseline; `w` is the measured ink width, which
    // fitText() matches with letter-spacing (and, past that, a slight squeeze),
    // so the line lands on the source whatever the local font.
    function T(p, x, base, size, text, cls, w, align) {
      var css = 'font-size:' + size + 'px;line-height:' + size + 'px;top:' + (base - size * 0.85).toFixed(2) + 'px;';
      if (align === 'r') css += 'left:' + (x - 600) + 'px;width:600px;text-align:right;';
      else css += 'left:' + x + 'px;';
      var n = put(p, el('span', 'mh-t ' + (cls || ''), css, text));
      if (w) fits.push([n, w, text]);
      return n;
    }
    function fitText() {
      fits.forEach(function (f) {
        var n = f[0];
        var now = n.textContent;
        n.textContent = f[2];
        n.style.letterSpacing = '';
        n.style.transform = '';
        var len = Math.max(1, f[2].length);
        var ow = n.offsetWidth, target = f[1] + 1;
        n.textContent = now;
        if (!ow) return;
        var ls = Math.max(-0.4, Math.min(0.6, (target - ow) / len));
        var sx = target / (ow + ls * len);
        n.style.letterSpacing = ls.toFixed(3) + 'px';
        if (Math.abs(sx - 1) > 0.004) {
          n.style.transform = 'scaleX(' + sx.toFixed(4) + ')';
          n.style.transformOrigin = '0 50%';
        }
      });
    }

    // The window and its two layers, both in stage coordinates.
    var win = put(st, el('span', 'mh-win', at(WX, WY, WW, WB - WY)));
    var pg = put(win, el('span', 'mh-pg', at(-WX, -WY, W, PAGE_END)));
    var fix = put(win, el('span', 'mh-fix', at(-WX, -WY, W, H)));
    var bar = put(fix, el('span', '', 'left:0;top:0;width:0;height:0'));
    function P(x, y, w, h, cls, into) { return put(into || pg, el('span', cls, at(x, y, w, h))); }
    function img(p, x, y, w, h, name, cls) {
      var i = put(p, el('img', 'mh-img ' + (cls || ''), at(x, y, w, h)));
      i.src = IMG + name + '.webp'; i.alt = ''; i.draggable = false;
      return i;
    }
    function S(x, y, w, h, inner, cls, vb, into) { return svg(into || pg, x, y, w, h, inner, cls, vb); }

    // Pages and their two colours -----------------------------------------------
    P(WX, WY, WW, 340, 'mh-w');
    P(WX, 583, WW, PAGE_END - 583, 'mh-g');

    // Nav bar ---------------------------------------------------------------------
    T(pg, 201, 277, 12.5, 'CATEGORIES', 'mh-nav', 72);
    T(pg, 850, 277, 12.5, 'DAVID', 'mh-nav', 36);
    P(902, 259, 2, 26, 'mh-navrule');
    T(pg, 920, 277, 12.5, 'MESSAGES (0)', 'mh-nav', 75);
    S(586, 259, 27, 26, '<circle cx="13" cy="13" r="12.9" fill="#20a7c7"/><circle cx="12.9" cy="12.4" r="6.6" fill="#fff"/><circle cx="12.9" cy="12.4" r="3.1" fill="#20a7c7"/>' +
      '<rect x="-1" y="15.7" width="11.4" height="3.2" fill="#fff"/><rect x="6" y="15.7" width="3.4" height="12" fill="#fff"/>' +
      '<path d="M2.8 19 5.7 19 5.7 22.6z" fill="#20a7c7"/>');

    // Sticky search bar ---------------------------------------------------------
    P(WX, 301, WW, 59, 'mh-bar', bar);
    P(200, 318, 2, 25, '', bar).style.background = 'linear-gradient(90deg, rgba(255,255,255,.126) 0 1px, rgba(255,255,255,.31) 1px 2px)';
    P(993, 318, 2, 25, '', bar).style.background = 'linear-gradient(90deg, rgba(255,255,255,.25) 0 1px, rgba(255,255,255,.19) 1px 2px)';
    S(218, 323, 15, 16, '<circle cx="6.1" cy="6.1" r="4.7" fill="none" stroke="#fff" stroke-opacity=".93" stroke-width="1.5"/>' +
      '<path d="M9.6 9.6 13.3 13.3" stroke="#fff" stroke-opacity=".93" stroke-width="1.6" stroke-linecap="round"/>', '', null, bar);
    T(bar, 247, 336, 17, 'Search PeoplePost...', 'mh-ph', 148);

    // Header ------------------------------------------------------------------------
    T(pg, 201, 415, 32, 'New York Hilton Midtown', 'mh-title', 324);
    T(pg, 886, 415, 30, '$ 140.15', 'mh-price', 109);
    var stars = '';
    [206.4, 218.3, 230, 242.3].forEach(function (cx, i) {
      stars += '<path style="--i:' + i + '" d="' + star(cx, 436, 5.7) + '" fill="#434343"/>';
    });
    S(200, 428, 52, 16, stars, 'mh-stars', '200 428 52 16');
    P(256, 429, 2, 13, 'mh-rule2');
    T(pg, 265, 441, 12.5, '465 Central Park West New York NY 10025 USA', 'mh-addr', 252);
    P(524, 429, 2, 13, 'mh-rule2').style.background = 'linear-gradient(90deg, #eaeaea 0 1px, #e3e3e3 1px 2px)';
    T(pg, 534, 441, 12.5, 'More...', 'mh-link', 36);
    T(pg, 787, 441, 12.5, 'BEST VALUE!', 'mh-best', 70);
    P(865, 429, 2, 13, 'mh-rule2').style.background = 'linear-gradient(90deg, #dcdcdc 0 1px, #f8f8f8 1px 2px)';
    T(pg, 875, 441, 12.5, 'Lowest Average / Night', 'mh-low', 120);

    // Buttons ---------------------------------------------------------------------
    // The four buttons, with the source's fractional edges.
    S(196, 452, 806, 44, [[201.62, 281.75], [290.13, 374.5], [382.95, 416.63], [901.62, 994.38]].map(function (b) {
      return '<rect x="' + b[0] + '" y="456.75" width="' + (b[1] - b[0]).toFixed(2) + '" height="33.75" rx="2" fill="#20a7c7"/>';
    }).join(''), '', '196 452 806 44');
    S(218, 465.5, 19, 16, '<path d="M1.6 1.6H16.6V11.4H5.4L1.6 14.6z" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.1"/>' +
      '<path d="M6.9 5.2c0-1.1.8-1.7 1.8-1.7s1.6.6 1.6 1.5c0 1.2-1.6 1.2-1.6 2.6M8.7 9.3v.1" fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="1.1" stroke-linecap="round"/>');
    T(pg, 245, 477, 9.8, 'ASK', 'mh-btn-t', 20);
    S(306, 465, 16, 16, '<path d="M7 2H2v12h12V9" fill="none" stroke="#fff" stroke-opacity=".92" stroke-width="1.1"/>' +
      '<path d="M7.5 8.6 13.8 2.3" fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="1.5" stroke-linecap="round"/>');
    T(pg, 330, 477, 9.8, 'POST', 'mh-btn-t', 26);
    S(396, 472, 8, 4, '<path d="M0 0H8L4 4z" fill="#fff"/>');
    T(pg, 916, 477, 9.8, 'ADD REVIEW', 'mh-btn-t', 64);

    // Review checks and the count ----------------------------------------------------
    var ck = '';
    for (var i = 0; i < 5; i++) {
      ck += '<path style="--i:' + i + '" pathLength="1" transform="translate(' + (26.5 * i) + ' 0)" d="' + CHECK + '" fill="none" stroke="' + (i < 3 ? '#20a7c7' : '#e3e3e3') + '" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    S(750, 450, 150, 30, ck, 'mh-ck', '750 450 150 30');
    T(pg, 821, 490, 11, '345 REVIEWS', 'mh-rv', 64);

    // Who recommended / booked -----------------------------------------------------
    P(201, 507, 794, 1, 'mh-hr');
    [201, 235, 269, 480, 514].forEach(function (x, i) { img(pg, x, 524, 26, 26, 'av' + (i + 1)); });
    T(pg, 302, 541, 12, 'and', 'mh-rec', 19);
    T(pg, 324, 541, 12, '3 others', 'mh-rec-b', 42);
    T(pg, 368, 541, 12, 'recommended this', 'mh-rec', 96);
    T(pg, 546, 541, 12, 'and', 'mh-rec', 20);
    T(pg, 568, 541, 12, '3 others', 'mh-rec-b', 43);
    T(pg, 613, 541, 12, 'boooked this', 'mh-rec', 66);

    // Gallery and map ------------------------------------------------------------------
    P(202, 617, 522, 210, 'mh-card');
    img(pg, 210, 625, 490, 194, 'gallery');
    P(709, 625, 6, 51, 'mh-sbar');
    P(742, 617, 252, 210, 'mh-card');
    img(pg, 749, 625, 237, 194, 'map');

    // Room availability -----------------------------------------------------------------
    var RH = 148;             // row pitch
    var PANEL_B = 1400;
    P(202, 861, 792, PANEL_B - 861, 'mh-card');
    T(pg, 227, 908, 17, 'ROOM AVAILABILITY', 'mh-h2', 164);
    P(581, 886, 186, 34, 'mh-field');
    T(pg, 594, 907, 13.5, 'Sa 22 Dec - Tu 25 Dec', 'mh-fld-t', 111);
    S(738, 894, 18, 18, '<rect x="3.1" y="2.9" width="12" height="11.4" fill="none" stroke="#d7d7d7" stroke-width="1.4"/>' +
      '<rect x="3.1" y="2.9" width="12" height="3.4" fill="#d7d7d7"/><rect x="5.6" y="3.9" width="2.5" height="1.8" fill="#fff"/><rect x="10.6" y="3.9" width="2.5" height="1.8" fill="#fff"/>');
    P(783, 886, 186, 34, 'mh-field');
    T(pg, 796, 907, 13.5, '2 Rooms - 7 Guests', 'mh-fld-t', 99);
    S(940, 895, 18, 16, '<path d="M6.2 2.4h5.6c.5 0 .8.3.8.8v1.6H5.4V3.2c0-.5.3-.8.8-.8z" fill="none" stroke="#d7d7d7" stroke-width="1.3"/>' +
      '<rect x="1.4" y="4.6" width="15.2" height="9" rx="1" fill="#d7d7d7"/><rect x="1.4" y="8.2" width="15.2" height=".9" fill="#e9e9e9"/>');
    P(227, 944, 742, 1, 'mh-div');

    var ROOMS = [
      { name: 'Standard Room', w: 114, guests: '2', price: '$100', avg: '$ 100.17', avail: 'AVAILABLE',
        fac: 'Air Condition, Cable/Satellite TV, High Speed Internet Access, In Room Safe, Iron & Ironing Board, Private Bath' },
      { name: 'Deluxe King Room', guests: '3', price: '$140', avg: '$ 140.33', avail: 'AVAILABLE',
        fac: 'Air Condition, Cable/Satellite TV, High Speed Internet Access, Mini Bar, Coffee Maker, Marble Bath, City View' },
      { name: 'Executive Suite', guests: '4', price: '$210', avg: '$ 210.50', avail: 'ONLY 2 LEFT', few: true,
        fac: 'Air Condition, Cable/Satellite TV, High Speed Internet Access, Lounge Access, Separate Living Room, Bathtub' }
    ];
    var book1 = null, rowhl1 = null;
    ROOMS.forEach(function (r, k) {
      var dy = RH * k;
      var hl = P(202, 945 + dy, 792, 147, 'mh-rowhl');
      if (k > 0) P(227, 944 + dy, 742, 1, 'mh-div');
      var nm = T(pg, 226, 982 + dy, 17, r.name, 'mh-room', r.w);
      // Room Facilities line.
      if (k === 0) {
        T(pg, 226, 1016, 12.5, 'Room Facilities:', 'mh-fac-l', 81);
        T(pg, 312, 1016, 12.5, r.fac, 'mh-fac-v', 565);
        P(884, 1005, 2, 13, 'mh-rule2').style.background = 'linear-gradient(90deg, #dcdcdc 0 1px, #f6f6f6 1px 2px)';
        T(pg, 894, 1016, 12.5, 'More...', 'mh-link', 36);
      } else {
        T(pg, 226, 1016 + dy, 12.5, 'Room Facilities:', 'mh-fac-l', 81);
        T(pg, 312, 1016 + dy, 12.5, r.fac, 'mh-fac-v', 565);
        P(884, 1005 + dy, 2, 13, 'mh-rule2').style.background = 'linear-gradient(90deg, #dcdcdc 0 1px, #f6f6f6 1px 2px)';
        T(pg, 894, 1016 + dy, 12.5, 'More...', 'mh-link', 36);
      }
      // Guests.
      S(940, 960 + dy - 0, 40, 30, PERSON, '', '940 960 40 30');
      T(pg, 961, 981 + dy, 13.5, r.guests, 'mh-guest', 7);
      // Price, and the line beside it.
      T(pg, 227, 1066 + dy, 28, r.price, 'mh-money', 64);
      P(308, 1040 + dy, 1, 35, 'mh-vrule');
      var t1 = T(pg, 325, 1062 + dy, 12, '3 NIGHTS', 'mh-nl', 52);
      P(383, 1057 + dy, 3, 3, 'mh-nld');
      T(pg, 391, 1062 + dy, 12, r.avg + ' AVERAGE / NIGHT', 'mh-nl', 147);
      P(543, 1057 + dy, 3, 3, 'mh-nld');
      T(pg, 552, 1062 + dy, 12, r.avail, r.few ? 'mh-few' : 'mh-av', r.few ? 82 : 60);
      // BOOK.
      var b = P(876, 1041 + dy, 94, 34, 'mh-book');
      T(b, 12, 20, 10, 'BOOK', 'mh-btn-t', 30);
      svg(b, 76, 12.5, 5, 9, '<path d="M0 .5 5 4.5 0 8.5z" fill="#fff"/>');
      if (k === 0) { book1 = b; rowhl1 = hl; }
    });

    // Guest reviews ---------------------------------------------------------------------
    var RV_T = PANEL_B + 34;                 // 1434
    var RV_B = 2116;
    P(202, RV_T, 792, RV_B - RV_T, 'mh-card');
    T(pg, 227, RV_T + 47, 17, 'GUEST REVIEWS', 'mh-h2', 137);
    T(pg, 969, RV_T + 47, 12.5, 'See all 345 reviews', 'mh-link', 0, 'r');
    P(227, RV_T + 83, 742, 1, 'mh-div');
    T(pg, 226, RV_T + 172, 72, '8.6', 'mh-score', 0);
    T(pg, 229, RV_T + 200, 11, 'EXCELLENT', 'mh-cap', 0);
    T(pg, 229, RV_T + 219, 12, 'Based on 345 reviews', 'mh-sub', 0);
    // Five little checks under the score.
    var ck2 = '';
    for (var c = 0; c < 5; c++) {
      ck2 += '<path transform="translate(' + (16 * c) + ' 0) scale(.6)" d="M2.5 9.5 L9.9 16.9 L23 3.8" fill="none" stroke="' + (c < 4 ? '#20a7c7' : '#e3e3e3') + '" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    S(227, RV_T + 234, 90, 18, ck2, '', '0 0 90 18');
    P(422, RV_T + 100, 1, 168, 'mh-vrule').style.height = '168px';
    var RATE = [['Location', 9.4], ['Cleanliness', 8.9], ['Service', 8.5], ['Value', 7.8], ['Comfort', 8.7]];
    RATE.forEach(function (r, i) {
      var y = RV_T + 113 + i * 33;
      T(pg, 452, y + 10, 13, r[0], 'mh-rname', 0);
      P(588, y + 1, 300, 8, 'mh-track');
      var f = P(588, y + 1, 300, 8, 'mh-fill');
      f.style.setProperty('--v', (r[1] / 10).toFixed(2));
      f.style.setProperty('--i', i);
      T(pg, 969, y + 10, 13, r[1].toFixed(1), 'mh-val', 0, 'r');
    });
    P(227, RV_T + 300, 742, 1, 'mh-div');

    var REVIEWS = [
      { av: 4, name: 'Marcus Hale', date: 'December 14, 2012', score: '9.0', n: 18,
        l1: 'Perfect location, a short walk from Times Square, and the room was spotless.',
        l2: 'The front desk arranged an early check-in without any fuss. Would stay again.' },
      { av: 2, name: 'Elena Ruiz', date: 'December 2, 2012', score: '8.4', n: 11,
        l1: 'Big lobby and a lot of foot traffic, but the upper floors are quiet and the beds are great.',
        l2: 'Breakfast is pricey, so grab a bagel around the corner instead.' },
      { av: 5, name: 'Tom Becker', date: 'November 21, 2012', score: '8.6', n: 7,
        l1: 'Used it for a conference. Easy check-in, fast wifi in the room and a good gym upstairs.',
        l2: 'Elevators can be slow at nine in the morning. Otherwise a solid stay for the price.' }
    ];
    var helpful = null;
    REVIEWS.forEach(function (r, k) {
      var y = RV_T + 318 + k * 118;
      P(227, y, 742, 104, 'mh-rcard');
      img(pg, 243, y + 16, 26, 26, 'av' + r.av).style.borderRadius = '50%';
      T(pg, 284, y + 30, 13.5, r.name, 'mh-rn', 0);
      T(pg, 284, y + 46, 11.5, r.date, 'mh-rd', 0);
      P(921, y + 15, 32, 20, 'mh-chip-s');
      T(pg, 946, y + 29, 11.5, r.score, 'mh-chip-st', 0, 'r');
      T(pg, 284, y + 68, 12.5, r.l1, 'mh-rtx', 0);
      T(pg, 284, y + 85, 12.5, r.l2, 'mh-rtx', 0);
      var g = put(pg, el('span', 'mh-helpg', at(853, y + 74, 100, 20)));
      svg(g, 0, 0, 14, 15, THUMB, 'mh-thumb');
      var hn = T(g, 20, 13, 11.5, 'Helpful (' + r.n + ')', 'mh-help-n', 0);
      if (k === 0) helpful = { g: g, n: hn, base: r.n };
    });

    // Amenities and nearby -------------------------------------------------------------------
    var AM_T = RV_B + 34;                    // 2150
    P(202, AM_T, 792, 178, 'mh-card');
    T(pg, 227, AM_T + 47, 17, 'AMENITIES', 'mh-h2', 0);
    T(pg, 969, AM_T + 47, 12.5, 'Show all 32', 'mh-link', 0, 'r');
    var ch1 = put(pg, el('span', 'mh-chips', at(227, AM_T + 68, 742)));
    ['Free WiFi', 'Fitness Center', 'Restaurant & Bar', 'Business Center', 'Concierge', 'Room Service', 'Laundry'].forEach(function (t, i) {
      put(ch1, el('span', i < 2 ? 'is-on' : '', '', t));
    });
    T(pg, 227, AM_T + 128, 11, 'NEARBY', 'mh-cap', 0);
    var ch2 = put(pg, el('span', 'mh-chips', at(227, AM_T + 139, 742)));
    [['Times Square', '0.3 mi'], ['Central Park', '0.6 mi'], ['Rockefeller Center', '0.4 mi'], ['Radio City', '0.3 mi'], ['Penn Station', '0.9 mi']].forEach(function (t) {
      var s = put(ch2, el('span', '', '', t[0]));
      put(s, el('small', '', '', t[1]));
    });

    // Footer -----------------------------------------------------------------------------------
    P(WX, 2362, WW, PAGE_END - 2362, 'mh-foot');
    S(201, 2385, 24, 24, '<circle cx="12" cy="12" r="11.9" fill="#20a7c7"/><circle cx="11.9" cy="11.4" r="6" fill="#fff"/><circle cx="11.9" cy="11.4" r="2.8" fill="#20a7c7"/>' +
      '<rect x="-1" y="14.5" width="10.6" height="3" fill="#fff"/><rect x="5.6" y="14.5" width="3.1" height="11" fill="#fff"/>');
    var fx = 250;
    ['ABOUT', 'HELP', 'TERMS', 'PRIVACY', 'CONTACT'].forEach(function (t) {
      T(pg, fx, 2401, 11, t, 'mh-foot-t', 0);
      fx += est(t, 11) + 40;
    });
    T(pg, 994, 2401, 11.5, '© 2012 PeoplePost, Inc.', 'mh-foot-c', 0, 'r');

    // The scrollbar thumb sits on the window's right edge ---------------------------------------
    var SB_H = Math.round((WB - WY) * (WB - WY) / (PAGE_END - WY));
    var sb = put(win, el('span', 'mh-sb', at(WW - 8, 8, 4, SB_H)));

    // Fit ---------------------------------------------------------------------------------------
    var focus = FOCUS, zoom = ZOOM, view = VIEWS[host.dataset.view || (host.dataset.focus ? '' : 'top')];
    if (view && view.focus) { focus = view.focus; zoom = view.zoom; }
    if (host.dataset.focus) focus = host.dataset.focus.split(',').map(Number);
    if (host.dataset.zoom) zoom = parseFloat(host.dataset.zoom);
    // A box to show, as x,y,w,h on the stage. With data-slide it is the
    // whole window, contained in the tile with a margin, and it comes and
    // goes as a card: in from the right, one pass of the page, out to the
    // left (driven by the loop below).
    var box = host.dataset.box ? host.dataset.box.split(',').map(Number) : null;
    var slide = !!(box && host.dataset.slide), slideX = 0;
    function place() {
      var w = host.clientWidth, h = host.clientHeight, m = slide ? Math.min(w, h) * 0.07 : 0;
      var kb = slide ? Math.min((w - 2 * m) / box[2], (h - 2 * m) / box[3]) : Math.max(w / box[2], h / box[3]);
      var cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
      st.style.transform = 'translate(' + (w / 2 - cx * kb + slideX * w).toFixed(2) + 'px,' + (h / 2 - cy * kb).toFixed(2) + 'px) scale(' + kb + ')';
    }
    function fit() {
      var w = host.clientWidth, h = host.clientHeight;
      if (box) { place(); return; }
      if (view && view.from != null) {
        var kk = view.k || w / view.span;
        st.style.transform = 'translate(' + (w / 2 - view.cx * kk) + 'px,' + (-view.from * kk) + 'px) scale(' + kk + ')';
        return;
      }
      var k = Math.max(w / W, h / H) * zoom;
      var tx = Math.min(0, Math.max(w - W * k, w / 2 - focus[0] * k));
      var ty = Math.min(0, Math.max(h - H * k, h / 2 - focus[1] * k));
      st.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')';
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(function () { fit(); fitText(); }).observe(host);
    fitText();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);

    // Motion --------------------------------------------------------------------------------------
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var S1 = 540, S2 = 1114;                 // scroll offsets: the rooms, the reviews
    var MAXS = PAGE_END - WB;
    function setScroll(s) {
      if (s < 0.01) { pg.style.transform = ''; bar.style.transform = ''; }
      else {
        pg.style.transform = 'translateY(' + (-s).toFixed(2) + 'px)';
        bar.style.transform = 'translateY(' + (-Math.min(s, STICK)).toFixed(2) + 'px)';
      }
      sb.style.transform = 'translateY(' + ((s / MAXS) * (WB - WY - 16 - SB_H)).toFixed(2) + 'px)';
      ui.classList.toggle('is-stuck', s > STICK + 0.5);
      ui.classList.toggle('is-away', s > 1);
    }
    function ease(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function outq(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }
    function setRun(node, text) { node.textContent = text; }

    // One loop of the timeline, in ms: hold at the top, down to the rooms,
    // press BOOK, down to the reviews, bars fill and a count ticks, back up.
    var P1a = 2000, P1b = 3100, P3a = 4400, P3b = 5500, P5a = 6900, TL = 7800;
    var lastN = -1;
    function update(t) {
      var s = 0;
      if (t < P1a) s = 0;
      else if (t < P1b) s = S1 * ease((t - P1a) / (P1b - P1a));
      else if (t < P3a) s = S1;
      else if (t < P3b) s = S1 + (S2 - S1) * ease((t - P3a) / (P3b - P3a));
      else if (t < P5a) s = S2;
      else s = S2 * (1 - ease((t - P5a) / (TL - P5a)));
      setScroll(s);
      var hov = t >= P1b + 300 && t < P1b + 1100, prs = t >= P1b + 650 && t < P1b + 850;
      book1.classList.toggle('is-hover', hov);
      book1.classList.toggle('is-press', prs);
      rowhl1.classList.toggle('is-on', t >= P1b + 250 && t < P3a - 100);
      ui.classList.toggle('is-fill', t >= P3b + 100);
      var n = helpful.base + Math.round(6 * outq((t - P3b - 600) / 450));
      if (n !== lastN) {
        lastN = n;
        setRun(helpful.n, 'Helpful (' + n + ')');
        helpful.g.classList.toggle('is-up', n > helpful.base);
      }
    }

    var visible = true, looping = false, tl = 0, last = null, raf = 0;
    function tick(now) {
      raf = 0;
      if (!visible || document.hidden) { last = null; return; }
      if (last != null) tl += Math.min(50, now - last);
      last = now;
      if (slide) {
        // In (0.7 s), one pass of the page, out (0.6 s), a beat empty.
        var IN = 700, OUT = 600, GAP = 400, C = IN + TL + OUT + GAP, c = tl % C;
        if (c < IN) slideX = 1.1 * (1 - outq(c / IN));
        else if (c < IN + TL) slideX = 0;
        else if (c < IN + TL + OUT) slideX = -1.1 * Math.pow((c - IN - TL) / OUT, 3);
        else slideX = 1.1;
        place();
        update(Math.max(0, Math.min(TL - 1, c - IN)));
      } else update(tl % TL);
      raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && looping && visible && !document.hidden) raf = requestAnimationFrame(tick); }
    function startLoop() { if (looping) return; looping = true; if (slide) tl = 700; ui.classList.add('is-loop'); kick(); }

    // The intro delays follow each element's height, so the page settles top down.
    function stagger() {
      Array.prototype.forEach.call(pg.children, function (n) {
        if (typeof n.className === 'string' && /\bmh-(w|g|foot|rowhl)\b/.test(n.className)) return;
        var y = parseFloat(n.style.top);
        if (!(y < WB)) return;
        n.classList.add('mh-rise');
        n.style.animationDelay = (0.03 + Math.max(0, y - WY) / 837 * 0.32).toFixed(2) + 's';
      });
    }
    function play() {
      stagger();
      ui.classList.add('is-intro');
      setTimeout(startLoop, 950);
    }

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es.some(function (e) { return e.isIntersecting; }); kick(); }, { threshold: 0.1 }).observe(host);
    }
    document.addEventListener('visibilitychange', kick);
    if (reduce) { ui.classList.add('is-fill', 'is-still'); return; }
    if (window.IntersectionObserver) {
      var seen = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); play(); }
      }, { threshold: 0.3 });
      seen.observe(host);
    } else play();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-hotel:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', ''); build(h);
    });
  }
  scan(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
