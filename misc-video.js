/* A mobile video editing and review app (older work), rebuilt in code as a
 * live prototype inside a phone, for the Lucky Card's grid.
 *
 * The phone is a CSS 3D object in a tilted, isometric-feeling scene. Inside
 * it the app is built at the design's own 375 by 812, positions and colours
 * measured off the original screens, and scaled into a 390 by 844 display.
 * Only the photographs (video thumbnails, the player and upload stills, the
 * people's faces) are image crops; everything else is built here.
 *
 * A prototype flow plays on a loop of about nineteen seconds: a card swiped
 * to show Remove and Share, a video opened, a comment typed and posted and
 * a heart given, then a new upload, from the Add new sheet through the
 * source picker and the upload form to the success screen and back to the
 * drive, where the new card lands on top (and is swiped away again, which
 * brings the loop back to its first frame). The clock runs only while the
 * tile is on screen. With reduced motion the drive sits still in the phone.
 *
 * Test hooks: data-flat on the host renders the screen alone, flat, with no
 * loop; data-screen picks the frame (drive, swipe, player, typing, posted,
 * addnew, source, upload, uploaded, back) and data-t a raw time in ms.
 */
(function () {
  var IMG = 'images/vid-';
  var LOOP = 19400;
  var W = 375, H = 812;
  var EASE = 'cubic-bezier(.22,.8,.26,1)';      // iOS-like push, quick out
  var EASE_IO = 'cubic-bezier(.45,0,.25,1)';    // finger travel
  var SVGNS = 'http://www.w3.org/2000/svg';

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
  // Text by its left edge (or, with a negative x, its right edge measured
  // from the parent's right) and its baseline.
  function T(p, x, base, size, text, cls, css) {
    var pos = x < 0 ? 'right:' + (-x) + 'px;' : 'left:' + x + 'px;';
    var k = FK[(cls || '').split(' ')[0]];
    if (k) size *= k;
    return put(p, el('span', 'mv-t ' + (cls || ''), pos + 'top:' + (base - size * 0.85).toFixed(2) + 'px;' + (css || ''), text));
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
  // Faces sit in one sprite, 8 by 4.
  function face(n, i, css) {
    var a = el('div', 'mv-av', css || '');
    a.style.backgroundImage = "url('" + IMG + "faces.webp')";
    a.style.backgroundPosition = ((i % 8) * 100 / 7).toFixed(3) + '% ' + (Math.floor(i / 8) * 100 / 3).toFixed(3) + '%';
    return put(n, a);
  }

  // ── Icons ─────────────────────────────────────────────────────────────
  var NAVY = '#59657c';
  var I = {
    bars: '<rect x="0" y="7.3" width="3" height="3.7" rx=".8"/><rect x="4.6" y="5" width="3" height="6" rx=".8"/><rect x="9.2" y="2.5" width="3" height="8.5" rx=".8"/><rect x="13.8" y="0" width="3" height="11" rx=".8"/>',
    wifi: '<path d="M7.7 2.2c2.2 0 4.2.8 5.7 2.2l1.1-1.1A9.8 9.8 0 0 0 7.7.6 9.8 9.8 0 0 0 .9 3.3L2 4.4a8.2 8.2 0 0 1 5.7-2.2Zm0 3.2c1.3 0 2.5.5 3.4 1.3l1.1-1.1a6.4 6.4 0 0 0-9 0l1.1 1.1c.9-.8 2.1-1.3 3.4-1.3Zm0 3.1L5.6 10.6l2.1 2.1 2.1-2.1-2.1-2.1Z"/>',
    batt: '<rect x=".5" y=".5" width="22" height="11.5" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".38"/><rect x="2" y="2" width="19" height="8.5" rx="2" /><path d="M23.8 4.2v4.1c.8-.3 1.4-1.1 1.4-2s-.6-1.8-1.4-2.1Z" fill-opacity=".4"/>',
    burger: '<rect x="0" y="0" width="19.1" height="2.1" rx="1"/><rect x="0" y="7.35" width="19.1" height="2.1" rx="1"/><rect x="0" y="14.7" width="19.1" height="2.1" rx="1"/>',
    plus: '<rect x="7.4" y="0" width="2" height="16.8" rx="1"/><rect x="0" y="7.4" width="16.8" height="2" rx="1"/>',
    search: '<circle cx="8.6" cy="8.6" r="7.3" fill="none" stroke="#c3cacc" stroke-width="2"/><path d="M14 14l6.6 6.6" stroke="#c3cacc" stroke-width="2.2" stroke-linecap="round"/>',
    bubble: '<path d="M6.8 0C3 0 0 2.5 0 5.6c0 1.7.9 3.2 2.3 4.2L1.4 12.8l3.6-1.8c.6.2 1.2.2 1.8.2 3.8 0 6.8-2.5 6.8-5.6S10.6 0 6.8 0Z" fill="#58627a"/>',
    trash: '<g fill="none" stroke="#59637b" stroke-width="2.3" stroke-linejoin="round"><path d="M1 5.5h22"/><path d="M8.3 5.3V2.2c0-.7.5-1.2 1.2-1.2h5c.7 0 1.2.5 1.2 1.2v3.1"/><path d="M3.4 5.8l1.3 20.4c.1 1.1.9 1.8 1.9 1.8h10.8c1 0 1.8-.7 1.9-1.8l1.3-20.4"/><path d="M8.2 10v13.4M12 10v13.4M15.8 10v13.4" stroke-linecap="round"/></g>',
    share: '<path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11Z"/>',
    addp: '<circle cx="9" cy="8.4" r="4.9"/><path d="M0 22.5c0-4.9 4.1-7.5 9-7.5s9 2.6 9 7.5Z"/><rect x="17.3" y="0" width="2.2" height="9.2" rx="1"/><rect x="13.8" y="3.5" width="9.2" height="2.2" rx="1"/>',
    caret: '<path d="M1.2 0h11.2c1 0 1.5 1.1.9 1.9L7.7 7.1c-.5.5-1.3.5-1.8 0L.3 1.9C-.3 1.1.2 0 1.2 0Z"/>',
    reply: '<path d="M4.8 3.1V0L0 4.5 4.8 9V6c3.4 0 5.8 1 7.5 3.4C11.6 6.2 9.6 3.6 4.8 3.1Z" fill="#c4c7cf"/>',
    heart: '<path d="M6.4 12l-.9-.8C2.3 8.3.2 6.4.2 4.1.2 2.2 1.7.7 3.6.7c1.1 0 2.1.5 2.8 1.3C7.1 1.2 8.1.7 9.2.7c1.9 0 3.4 1.5 3.4 3.4 0 2.3-2.1 4.2-5.3 7.1l-.9.8Z"/>',
    smile: '<g fill="none" stroke="#c3c7ca" stroke-width="1.5"><circle cx="12.35" cy="12.35" r="11.6"/><path d="M7.4 14.6c1.1 1.8 2.9 2.8 4.95 2.8s3.85-1 4.95-2.8" stroke-linecap="round"/></g><circle cx="8.6" cy="9.4" r="1.25" fill="#c3c7ca"/><circle cx="16.1" cy="9.4" r="1.25" fill="#c3c7ca"/>',
    back: '<path d="M10.6 1.4L1.6 10.4l9 9" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M1 1l8.2 8.2M9.2 1L1 9.2" stroke="#9ea2a5" stroke-width="1.5" stroke-linecap="round"/>',
    dd: '<path d="M1 1l7.5 7 7.5-7" fill="none" stroke="#9fa3a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    addpg: '<circle cx="9" cy="8.4" r="4.9"/><path d="M0 22.5c0-4.9 4.1-7.5 9-7.5s9 2.6 9 7.5Z"/><rect x="17.6" y="0" width="1.7" height="9.2" rx=".8"/><rect x="13.9" y="3.75" width="9.2" height="1.7" rx=".8"/>',
    device: '<rect x="0" y="0" width="27" height="49" rx="4" fill="#c3cace"/><rect x="9.5" y="44.3" width="8" height="1.3" rx=".6" fill="#aab3b8"/>',
    gdrive: '<path d="M16.7 0h16.6L50 28.9H33.3Z" fill="#c3cace"/><path d="M16.7 0L25 14.45 8.35 43.3 0 28.9Z" fill="#c3cace"/><path d="M16.7 28.9H50l-8.3 14.4H8.35Z" fill="#c3cace"/>',
    dropbox: '<path d="M13.2 0L0 8.5l13.2 8.4 13.3-8.4ZM39.7 0L26.5 8.5l13.2 8.4 13.2-8.4ZM0 25.4l13.2 8.5 13.3-8.5-13.3-8.5ZM39.7 16.9l-13.2 8.5 13.2 8.5 13.2-8.5ZM13.2 36.8l13.3 8.4 13.2-8.4-13.2-8.5Z" fill="#c3cace"/>',
    camera: '<path d="M16.5 0h15.3l3.3 5.3h8.3c2.4 0 4.3 1.9 4.3 4.3v25c0 2.4-1.9 4.3-4.3 4.3H4.4C2 38.9 0 37 0 34.6v-25c0-2.4 2-4.3 4.4-4.3h8.8Z" fill="#c3cace"/><circle cx="24.2" cy="21.7" r="9.2" fill="none" stroke="#edf1f4" stroke-width="3.6"/>'
  };

  function statusBar(p, light) {
    var sb = box(p, 'mv-sb' + (light ? ' mv-sb--light' : ''), 0, 0);
    T(sb, 30, 31, 15, '9:41', 'mv-sb-time', 'top:18.5px;');
    icon(sb, 297, 19.5, 16.8, 11, '0 0 16.8 11', '<g fill="currentColor">' + I.bars + '</g>');
    icon(sb, 318.5, 19, 15.4, 12.7, '0 0 15.4 12.7', '<g fill="currentColor">' + I.wifi + '</g>');
    icon(sb, 338.5, 19.2, 25.2, 12.5, '0 0 25.2 12.5', '<g fill="currentColor" color="currentColor">' + I.batt + '</g>');
    return sb;
  }

  // ── Data ──────────────────────────────────────────────────────────────
  var CARDS = [
    { n: 'Final.mov', th: 'final', f: [0, 1, 2, 3], c: 21 },
    { n: 'Future.mov', th: 'future', f: [4, 5, 6, 7], c: 6 },
    { n: 'To-review.mov', th: 'review', f: [8, 9, 10, 11], c: 12 },
    { n: 'To-review.mov', th: 'glass', f: [12, 13, 14, 15], c: 4 },
    { n: 'Post.mov', th: 'post', f: [16, 17, 18, 19], c: 2 },
    { n: 'To-review.mov', th: 'post', f: [8, 9, 10, 11], c: 4 }
  ];
  var NEWCARD = { n: 'Stage.mov', th: 'dancer', f: [23, 24, 25, 26], c: 0, meta: 'Dave M  Just now' };
  var COMMENTS = [
    { f: 20, n: 'Stephanus Huggins', w: '12 Minutes ago', x: 'This looks like she is floating on the sky, great job!', h: 5 },
    { f: 21, n: 'Isaac Hunt', w: '8 Minutes ago', x: 'This is complely awsome!!!', h: 12 },
    { f: 22, n: 'Pablo Cambeiro', w: '2 Days ago', x: 'Nice work on the colors!', h: 10 }
  ];
  var MINE = { f: 16, n: 'Dave M', w: 'Just now', x: 'Love this shot!', h: 0 };
  var CHIPS = [
    [23, 'Foroogh Abdi', 21.5, 0], [24, 'Sang Young-Il', 180.3, 0],
    [25, 'Joana Leite', 21.5, 1], [26, 'Jeremías Romerona', 180.3, 1],
    [27, 'Leslee Moss', 21.5, 2], [28, 'Furmaan Bharya', 180.3, 2],
    [29, 'Loni Bowcher', 21.5, 3], [30, 'Cvita Doleschall', 180.3, 3]
  ];
  var ROW0 = 174.7, PITCH = 125.8;

  // ── Type fitting ──────────────────────────────────────────────────────
  // The design was set in a rounded sans a little narrower than most
  // fallbacks. Each text role has a sample line and its measured ink width
  // on the original screen; once per page every role's size is scaled so the
  // sample lands on that width in whatever font this browser has.
  var ROLES = [
    ['mv-h1', 'My drive', 87.8], ['mv-name', 'Final.mov', 60.6], ['mv-meta', 'Dave M  12.08.2019', 108.5],
    ['mv-cnt', '21', 12.8], ['mv-act-l', 'Remove', 51.1], ['mv-time', '01:05', 29.5],
    ['mv-ptitle', 'Final.mov', 73.4], ['mv-psub', '12 Minutes ago', 94.9],
    ['mv-cm-n', 'Stephanus Huggins', 125.3], ['mv-cm-w', '12 Minutes ago', 94.1],
    ['mv-cm-x', 'This is complely awsome!!!', 164.4], ['mv-cm-r', 'Reply', 29.5],
    ['mv-ph', 'Add your comment here...', 159.6], ['mv-typed', 'Add your comment here...', 159.6], ['mv-post', 'Post', 33],
    ['mv-h2', 'Add new', 95.4], ['mv-q', 'What would you like to add?', 263.8], ['mv-tile-l', 'Your device', 95.4],
    ['mv-htitle', 'Uplaoding file', 152.4], ['mv-strip-l', 'Uploading... 40%', 94.1], ['mv-lbl', 'Collaborators', 85.4],
    ['mv-fieldtx', 'File name', 59], ['mv-chip', 'Sang Young-Il', 76.6], ['mv-btn', 'Take me there', 83.7],
    ['mv-done-l', 'Go make something awsome!', 310.6]
  ];
  var fitted = false, FK = {};
  function fitFonts() {
    if (fitted || !document.body) return;
    fitted = true;
    var m = el('div', 'mv-app', 'position:absolute;left:-9999px;top:0;visibility:hidden;transform:none;');
    var spans = ROLES.map(function (r) {
      var o = put(m, el('div', r[0], 'position:absolute;left:0;top:0;padding:0;margin:0;width:auto;height:auto;opacity:1;transform:none;'));
      return put(o, el('span', '', 'white-space:pre', r[1]));
    });
    document.body.appendChild(m);
    var css = '';
    ROLES.forEach(function (r, i) {
      var w = spans[i].getBoundingClientRect().width;
      var fs = parseFloat(getComputedStyle(spans[i]).fontSize);
      if (!w || !fs) return;
      var k = Math.max(0.8, Math.min(1.15, (r[2] + 0.8) / w));
      FK[r[0]] = k;
      css += '.mv-app .' + r[0] + '{font-size:' + (fs * k).toFixed(2) + 'px}';
    });
    m.remove();
    var st = el('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── The app ───────────────────────────────────────────────────────────
  function makeApp() {
    var app = el('div', 'mv-app');
    var R = { app: app, anims: [] };

    // My drive
    var drive = R.drive = box(app, 'mv-scr', 0, 0);
    statusBar(drive, false);
    var top = box(drive, 'mv-top', 0, 0);
    statusBar(top, false);
    icon(top, 18.4, 71, 19.1, 16.8, '0 0 19.1 16.8', '<g fill="' + NAVY + '">' + I.burger + '</g>');
    T(top, 138, 87.6, 22, 'My drive', 'mv-h1', 'left:0;width:364px;text-align:center;');
    var plus = box(top, 'mv-plus', 320.7, 59.8);
    icon(plus, 11.6, 11.6, 16.8, 16.8, '0 0 16.8 16.8', '<g fill="#4345fd">' + I.plus + '</g>');
    var srch = box(drive, 'mv-search', 12, 128);
    icon(srch, 5, 8.8, 20.6, 20.6, '0 0 21 21', I.search);
    R.list = box(drive, 'mv-list', 0, 0);
    R.rows = CARDS.map(function (c, i) { return row(R.list, c, i); });
    R.drive.appendChild(el('div', 'mv-dim'));

    // Player
    var pl = R.player = box(app, 'mv-scr', 0, 0, null, null, 'transform:translateX(100%);');
    var ph = box(pl, 'mv-photo', 0, 0);
    ph.style.backgroundImage = "url('" + IMG + "dusk.webp')";
    statusBar(pl, true);
    R.t0 = T(pl, 15.2, 257.7, 13, '01:05', 'mv-time');
    T(pl, -11.2, 257.7, 13, '02:20', 'mv-time');
    var tr = box(pl, 'mv-track', 0, 277.7);
    R.fill = box(tr, 'mv-fill', 0, 0);
    R.knob = box(tr, 'mv-knob', 0, 0, null, null, 'left:46.4%;top:-5.85px;');
    T(pl, 11.2, 314.4, 18, 'Final.mov', 'mv-ptitle');
    T(pl, 11.2, 332.3, 15, '12 Minutes ago', 'mv-psub');
    icon(pl, 248.9, 310.8, 18.6, 16.6, '3 4 18 16', '<g fill="' + NAVY + '">' + I.share + '</g>');
    icon(pl, 298.4, 305.9, 23.9, 22.5, '0 0 23 22.5', '<g fill="' + NAVY + '">' + I.addp + '</g>');
    icon(pl, 344.7, 315.2, 13.6, 7.6, '0 0 13.6 7.6', '<g fill="' + NAVY + '">' + I.caret + '</g>');
    R.clist = box(pl, 'mv-clist', 10, 348.7);
    R.cms = COMMENTS.map(function (c) { return comment(R.clist, c); });
    var inp = R.input = box(pl, 'mv-input', 11, 742.8);
    R.ph = T(inp, 13.5, 0, 15, 'Add your comment here...', 'mv-ph', 'top:0;');
    R.typed = put(inp, el('span', 'mv-t mv-typed', 'top:0;'));
    R.typedTx = put(R.typed, el('span', '', '', ''));
    put(R.typed, el('span', 'mv-caret'));
    R.smile = icon(inp, 314.5, 12.4, 24.7, 24.7, '0 0 24.7 24.7', I.smile);
    R.post = put(inp, el('div', 'mv-post', '', 'Post'));
    R.player.appendChild(el('div', 'mv-dim'));

    // The upload flow is a modal that slides up over the drive.
    var mod = R.modal = box(app, 'mv-modal', 0, 0);

    var an = R.addnew = box(mod, 'mv-scr mv-scr--white', 0, 0);
    statusBar(an, false);
    icon(an, 19.4, 59.4, 12.6, 21.6, '0 0 12.2 20.8', '', '').innerHTML = '<g color="' + NAVY + '">' + I.back + '</g>';
    T(an, 0, 78.3, 22, 'Add new', 'mv-h2', 'width:375px;text-align:center;left:0;');
    T(an, 0, 171.5, 20, 'What would you like to add?', 'mv-q', 'width:375px;text-align:center;left:0;');
    R.tFile = tile(an, 19.4, 200.8, 336.6, 99.9, 'File', 106.7 - 19.4, true);
    tile(an, 19.4, 309.7, 336.6, 98.2, 'Folder', 105.8 - 19.4, false);
    an.appendChild(el('div', 'mv-dim'));

    var so = R.source = box(mod, 'mv-scr mv-scr--white', 0, 0, null, null, 'transform:translateX(100%);');
    statusBar(so, false);
    icon(so, 19.4, 59.4, 12.6, 21.6, '0 0 12.2 20.8', '<g color="' + NAVY + '">' + I.back + '</g>');
    T(so, 0, 81.9, 22, 'Upload source', 'mv-h2', 'width:375px;text-align:center;left:0;');
    T(so, 0, 172, 20, 'Choose a file source:', 'mv-q', 'width:375px;text-align:center;left:0;');
    var SRC = [['Your device', 'device', 55, 25, 27, 49], ['Google drive', 'gdrive', 42.3, 29, 50, 43.3], ['Dropbox', 'dropbox', 42.3, 27.5, 52.9, 45.2], ['Capture', 'camera', 44.1, 31, 47.7, 38.9], ['More', 'camera', 44.1, 31, 47.7, 38.9]];
    R.tSrc = SRC.map(function (s, i) {
      var t = tile(so, 22.5, 201.7 + 108.05 * i, 331.3, 99, s[0], 117 - 22.5, false);
      icon(t, s[2] - 22.5, s[3], s[4], s[5], '0 0 ' + s[4] + ' ' + s[5], I[s[1]]);
      return t;
    });
    so.appendChild(el('div', 'mv-dim'));

    var up = R.upload = box(mod, 'mv-scr mv-scr--white', 0, 0, null, null, 'transform:translateX(100%);');
    var hero = box(up, 'mv-hero', 0, 0);
    var hr = box(hero, 'mv-hero-ref', 0, 278);
    hr.style.backgroundImage = "url('" + IMG + "dancer.webp')";
    var hi = box(hero, 'mv-hero-img', 0, 0);
    hi.style.backgroundImage = "url('" + IMG + "dancer.webp')";
    var strip = box(hero, 'mv-strip', 0, 278);
    R.sfill = box(strip, 'mv-strip-fill', 0, 0);
    R.slabel = T(strip, 16.8, 0, 13, 'Uploading... 40%', 'mv-strip-l', 'top:9.6px;');
    statusBar(up, true);
    icon(up, 19.1, 59.8, 12, 20, '0 0 12.2 20.8', '<g color="#fff">' + I.back + '</g>');
    T(up, 0, 80.6, 24, 'Uploading file', 'mv-htitle', 'width:375px;left:4px;text-align:center;');
    var form = box(up, 'mv-form', 0, 309.6);
    var FY = 309.6;
    T(form, 20.7, 338.3 - FY, 15, 'Name', 'mv-lbl');
    var fld = box(form, 'mv-field', 20, 349.5 - FY, 331, 39.1);
    R.fname = T(fld, 12.7, 24.7, 15, 'File name', 'mv-fieldtx');
    T(form, 23.9, 422.1 - FY, 15, 'Collaborators', 'mv-lbl');
    icon(form, 319.1, 406.9 - FY, 24.7, 20.8, '0 0 23.1 22.5', '<g fill="#aaacbe">' + I.addpg + '</g>');
    R.chips = CHIPS.map(function (c) {
      var ch = put(form, el('div', 'mv-chip', 'left:' + c[2] + 'px;top:' + (442.8 + 51.2 * c[3] - FY) + 'px;', c[1]));
      face(ch, c[0]);
      icon(ch, 0, 0, 9.6, 9.6, '0 0 10.2 10.2', I.x).style.cssText = 'position:absolute;right:13px;top:15.7px;width:9.6px;height:9.6px;left:auto;';
      return ch;
    });
    T(form, 19.9, 663.6 - FY, 15, 'Approval status', 'mv-lbl');
    var dd = box(form, 'mv-field', 20, 674.2 - FY, 331, 40.7);
    box(dd, 'mv-a', 9.5, 15.2, 11.2, 11.2, 'border-radius:50%;background:#ffac64;');
    T(dd, 31.1, 26.1, 15, 'Pending', 'mv-fieldtx', 'color:#606871;');
    icon(dd, 298.4, 17.6, 16.8, 8.8, '0 0 17 9.6', I.dd);
    R.save = box(form, 'mv-btn', 22, 737.2 - FY, 332, 51, '');
    R.save.textContent = 'Save and add go to edit';
    put(R.save, el('div', 'mv-press'));
    up.appendChild(el('div', 'mv-dim'));

    var dn = R.done = box(mod, 'mv-scr', 0, 0, null, null, 'opacity:0;background:#3b36b8;');
    var di = box(dn, 'mv-done-img', -330, -40);
    di.style.backgroundImage = "url('" + IMG + "dancer.webp')";
    box(dn, 'mv-done-tint', 0, 0);
    statusBar(dn, true);
    T(dn, 0, 287.2, 22, 'File uploaded.', 'mv-done-l');
    T(dn, 0, 318.7, 22, 'Go make something awsome!', 'mv-done-l');
    R.ring = icon(dn, 143.2, 362.8, 90, 90, '0 0 90 90',
      '<circle cx="45" cy="45" r="43.2" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3.6"/>' +
      '<circle class="mv-ring" cx="45" cy="45" r="43.2" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" transform="rotate(-90 45 45)" stroke-dasharray="271.4" stroke-dashoffset="271.4"/>' +
      '<path class="mv-check" d="M29 46.5l10.5 10.5L62 34.5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="48" stroke-dashoffset="48"/>');
    R.take = box(dn, 'mv-btn', 17.1, 735.3, 342.1, 51);
    R.take.textContent = 'Take me there';
    put(R.take, el('div', 'mv-press'));

    // The finger
    R.tap = box(app, 'mv-tap', 0, 0);
    R.tapDot = put(R.tap, el('div', 'mv-tap-dot'));
    R.tapRing = put(R.tap, el('div', 'mv-tap-ring'));
    R.tapPos = [300, 610];
    R.tap.style.transform = 'translate(300px,610px)';
    return R;
  }

  function row(list, c, i) {
    var r = box(list, 'mv-row', 0, ROW0 + PITCH * i);
    var act = box(r, 'mv-act', 120, 0);
    icon(act, 84.2 - 12, 48 - 14, 24, 29, '0 0 24 29', I.trash);
    T(act, 0, 86.2, 15, 'Remove', 'mv-act-l', 'left:36px;width:100px;text-align:center;');
    icon(act, 183.4 - 14.5, 48 - 14.5, 29, 26, '3 4 18 16', '<g fill="#59637b">' + I.share + '</g>');
    T(act, 0, 86.2, 15, 'Share', 'mv-act-l', 'left:133px;width:100px;text-align:center;');
    var card = box(r, 'mv-card', 10, 0);
    var th = box(card, 'mv-th', 0, 0);
    th.style.backgroundImage = "url('" + IMG + 'th-' + c.th + ".webp')";
    T(card, 135.2, 24.8, 15, c.n, 'mv-name');
    T(card, 136, 43.1, 13, c.meta || 'Dave M  12.08.2019', 'mv-meta', 'white-space:pre;');
    var avs = box(card, 'mv-avs mv-a', 0, 0);
    // Earlier faces sit on top of later ones.
    for (var k = 0; k < 4; k++) face(avs, c.f[k], 'left:' + (133.6 + 19.2 * k).toFixed(1) + 'px;top:76px;z-index:' + (9 - k) + ';');
    put(avs, el('div', 'mv-more', 'left:' + (133.6 + 19.2 * 4).toFixed(1) + 'px;top:76px;z-index:4;', '+' + (c.c ? 2 : 4)));
    T(card, -29.8, 92.6, 13, String(c.c), 'mv-cnt');
    icon(card, 328.3, 82.2, 13.6, 12.8, '0 0 13.6 12.8', I.bubble);
    return { el: r, card: card, act: act, i: i };
  }

  function comment(list, c, first) {
    var cm = el('div', 'mv-cm');
    if (first) list.insertBefore(cm, list.firstChild); else list.appendChild(cm);
    var inn = put(cm, el('div', 'mv-cm-in'));
    face(inn, c.f);
    T(inn, 59.4, 36.8, 15, c.n, 'mv-cm-n', 'top:24px;');
    T(inn, -19.5, 36.8, 15, c.w, 'mv-cm-w', 'top:24px;');
    put(inn, el('div', 'mv-cm-x', '', c.x));
    var rr = put(inn, el('div', 'mv-cm-r'));
    icon(rr, 0, 5, 12.5, 9.4, '0 0 12.3 9.4', I.reply);
    T(rr, 20.8, 0, 13, 'Reply', '', 'top:0;');
    var hs = icon(rr, 77.4, 3.6, 12.8, 12, '0 0 12.8 12.4', I.heart, 'mv-heart');
    var hn = T(rr, 99.8, 0, 13, String(c.h), '', 'top:0;');
    return { el: cm, heart: hs, n: hn, h: c.h };
  }

  function tile(p, x, y, w, h, label, lx, on) {
    var t = box(p, 'mv-tile' + (on ? ' mv-tile--on' : ''), x, y, w, h);
    T(t, lx, h / 2 + 6.6, 18, label, 'mv-tile-l');
    put(t, el('div', 'mv-press'));
    return t;
  }

  // ── The flow ──────────────────────────────────────────────────────────
  function script(R) {
    var ev = [], tw = [];
    function at(t, fn) { ev.push({ t: t, fn: fn }); }
    function tween(t0, t1, fn) { tw.push({ t0: t0, t1: t1, fn: fn, done: false }); }
    function A(e, frames, dur, easing, delay) {
      var a = e.animate(frames, { duration: dur, easing: easing || EASE, fill: 'both', delay: delay || 0 });
      R.anims.push(a);
      // Settle each animation into plain inline style when it ends, so no
      // composited layer lingers inside the tilted phone.
      a.onfinish = function () { try { a.commitStyles(); } catch (e) {} a.cancel(); };
      return a;
    }
    function dimIn(scr, on, dur) {
      var d = scr.querySelector(':scope > .mv-dim');
      A(d, [{ opacity: on ? 0 : 0.14 }, { opacity: on ? 0.14 : 0 }], dur);
    }
    function push(from, to, dur) {
      dur = dur || 420;
      A(to, [{ transform: 'translateX(100%)', boxShadow: '0 0 0 rgba(0,0,0,0)' }, { transform: 'translateX(0)', boxShadow: '-6px 0 24px rgba(20,24,60,.12)' }], dur);
      A(from, [{ transform: 'translateX(0)' }, { transform: 'translateX(-30%)' }], dur);
      dimIn(from, true, dur);
    }
    function pop(from, to, dur) {
      dur = dur || 400;
      A(from, [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], dur);
      A(to, [{ transform: 'translateX(-30%)' }, { transform: 'translateX(0)' }], dur);
      dimIn(to, false, dur);
    }
    // Finger
    function move(t, x, y, dur) {
      at(t, function () {
        var p = R.tapPos;
        A(R.tap, [{ transform: 'translate(' + p[0] + 'px,' + p[1] + 'px)' }, { transform: 'translate(' + x + 'px,' + y + 'px)' }], dur || 380, EASE_IO);
        R.tapPos = [x, y];
      });
    }
    function drag(t, x, y, dur) {
      at(t, function () {
        var p = R.tapPos;
        A(R.tap, [{ transform: 'translate(' + p[0] + 'px,' + p[1] + 'px)' }, { transform: 'translate(' + x + 'px,' + y + 'px)' }], dur, EASE);
        R.tapPos = [x, y];
      });
    }
    function down(t) { at(t, function () { A(R.tapDot, [{ transform: 'scale(1)' }, { transform: 'scale(.8)', background: 'rgba(34,38,84,.34)' }], 120, 'ease-out'); }); }
    function up(t) {
      at(t, function () {
        A(R.tapDot, [{ transform: 'scale(.8)', background: 'rgba(34,38,84,.34)' }, { transform: 'scale(1)', background: 'rgba(34,38,84,.2)' }], 200, 'ease-out');
        A(R.tapRing, [{ transform: 'scale(.8)', opacity: 0.9 }, { transform: 'scale(1.9)', opacity: 0 }], 420, 'ease-out');
      });
    }
    function tap(t, target) {
      down(t); up(t + 130);
      if (target) {
        var pr = target.querySelector(':scope > .mv-press');
        if (pr) at(t, function () { A(pr, [{ opacity: 0 }, { opacity: 0.1, offset: 0.4 }, { opacity: 0 }], 360, 'ease-out'); });
      }
    }
    function show(t, on) { at(t, function () { A(R.tap, [{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], 260, 'ease-out'); }); }
    function slide(rw, x0, x1, dur, easing) {
      if (x0 === 0) rw.act.style.opacity = '1';
      A(rw.card, [{ transform: 'translateX(' + x0 + 'px)' }, { transform: 'translateX(' + x1 + 'px)' }], dur, easing || EASE);
    }
    var fmt = function (s) { return '01:' + (s < 10 ? '0' : '') + s; };

    // 1. My drive: swipe the fourth card open and closed again.
    var r4 = R.rows[3], ry = ROW0 + PITCH * 3 + 57;
    show(120, true);
    down(420);
    at(470, function () { slide(r4, 0, -228, 460); });
    drag(470, 84, ry, 460);
    up(960);
    move(1800, 64, ry, 300);
    down(2150);
    at(2200, function () { slide(r4, -228, 0, 420); });
    drag(2200, 284, ry, 420);
    up(2640);
    at(2700, function () { r4.act.style.opacity = '0'; });

    // 2. Open Final.mov, comment, like.
    move(2700, 250, 232, 420);
    tap(3160);
    at(3300, function () { push(R.drive, R.player, 430); });
    tween(3900, 9200, function (p) {
      var s = 5 + p * 7;
      R.t0.textContent = fmt(Math.floor(s + 1e-6));
      var pc = (65 + p * 7) / 140 * 100;
      R.fill.style.width = pc.toFixed(2) + '%';
      R.knob.style.left = pc.toFixed(2) + '%';
    });
    move(3850, 150, 768, 420);
    tap(4330);
    at(4400, function () {
      R.input.classList.add('is-focus');
      R.ph.style.opacity = '0';
      A(R.smile, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], 180, 'ease-out');
      A(R.post, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], 300, 'cubic-bezier(.3,1.5,.5,1)');
    });
    var msg = MINE.x;
    tween(4600, 4600 + msg.length * 68, function (p) { R.typedTx.textContent = msg.slice(0, Math.round(p * msg.length)); });
    move(5750, 329, 768, 380);
    tap(6200, null);
    at(6200, function () { A(R.post, [{ transform: 'scale(1)' }, { transform: 'scale(.92)', offset: 0.4 }, { transform: 'scale(1)' }], 260, 'ease-out'); });
    at(6320, function () {
      R.input.classList.remove('is-focus');
      R.typedTx.textContent = '';
      A(R.ph, [{ opacity: 0 }, { opacity: 1 }], 250, 'ease-out');
      R.ph.style.opacity = '1';
      A(R.smile, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], 250, 'ease-out');
      A(R.post, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], 200, 'ease-in');
      var c = R.mine = comment(R.clist, MINE, true);
      var h = c.el.offsetHeight;
      A(c.el, [{ height: '0px', marginBottom: '0px', opacity: 0 }, { height: h + 'px', marginBottom: '10px', opacity: 1 }], 420, EASE);
      A(c.el.firstChild, [{ transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], 420, EASE);
    });
    // Stephanus's heart, one card down now.
    move(6800, 113.4, 348.7 + 117 + 10 + 91 + 11, 420);
    tap(7300);
    at(7360, function () {
      var c = R.cms[0];
      c.heart.classList.add('is-on');
      c.n.textContent = String(c.h + 1);
      c.n.style.color = '#4345fd';
      A(c.heart, [{ transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.45 }, { transform: 'scale(1)' }], 380, 'ease-out');
    });
    // Collapse the player.
    move(7850, 351.5, 319, 420);
    tap(8330);
    at(8420, function () { pop(R.player, R.drive, 400); });

    // 3. A new upload.
    move(8900, 340.6, 79.7, 420);
    tap(9380);
    at(9480, function () {
      A(R.modal, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], 460, 'cubic-bezier(.2,.85,.25,1)');
      dimIn(R.drive, true, 460);
    });
    move(10050, 188, 252, 400);
    tap(10500, R.tFile);
    at(10620, function () { push(R.addnew, R.source, 420); });
    tap(11250, R.tSrc[0]);
    at(11370, function () { push(R.source, R.upload, 420); });
    var nm = 'Stage.mov';
    at(11800, function () { R.fname.style.color = '#2c2b30'; });
    tween(11800, 11800 + nm.length * 60, function (p) { var k = Math.round(p * nm.length); R.fname.textContent = k ? nm.slice(0, k) : 'File name'; });
    tween(11800, 14100, function (p) {
      var v = 40 + 60 * (1 - Math.pow(1 - p, 1.6));
      R.sfill.style.width = v.toFixed(2) + '%';
      R.slabel.textContent = v >= 99.9 ? 'Uploaded 100%' : 'Uploading... ' + Math.floor(v) + '%';
    });
    R.chips.forEach(function (c, k) {
      at(12000 + k * 150, function () { A(c, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], 300, 'cubic-bezier(.3,1.45,.5,1)'); });
    });
    move(14000, 188, 762, 440);
    tap(14560, R.save);
    at(14680, function () {
      A(R.done, [{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }], 420, EASE);
    });
    at(14950, function () {
      A(R.ring.querySelector('.mv-ring'), [{ strokeDashoffset: 271.4 }, { strokeDashoffset: 0 }], 700, 'cubic-bezier(.4,0,.2,1)');
      A(R.ring.querySelector('.mv-check'), [{ strokeDashoffset: 48 }, { strokeDashoffset: 0 }], 320, 'ease-out', 620);
    });
    tap(16050, R.take);
    at(16170, function () {
      A(R.modal, [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], 440, 'cubic-bezier(.4,0,.2,1)');
      dimIn(R.drive, false, 440);
    });
    show(16300, false);
    // The new card lands on top.
    at(16700, function () {
      var nr = R.newRow = row(R.list, NEWCARD, 0);
      R.rows.forEach(function (r) {
        A(r.el, [{ transform: 'translateY(0)' }, { transform: 'translateY(' + PITCH + 'px)' }], 440, EASE);
      });
      A(nr.el, [{ opacity: 0, transform: 'translateX(-40px) scale(.96)' }, { opacity: 1, transform: 'translateX(0) scale(1)' }], 460, EASE, 80);
    });
    // ... and is swiped away, which brings the loop round.
    var ny = ROW0 + 57;
    at(17500, function () { A(R.tap, [{ transform: 'translate(' + R.tapPos[0] + 'px,' + R.tapPos[1] + 'px)', opacity: 1 }, { transform: 'translate(300px,' + ny + 'px)', opacity: 1 }], 1, 'linear'); R.tapPos = [300, ny]; });
    show(17510, true);
    down(17780);
    at(17830, function () { slide(R.newRow, 0, -228, 440); });
    drag(17830, 84, ny, 440);
    up(18300);
    move(18360, 204.5, ny - 6, 380);
    tap(18800);
    at(18900, function () {
      var nr = R.newRow;
      A(nr.el, [{ opacity: 1 }, { opacity: 0 }], 200, 'ease-out');
      R.rows.forEach(function (r) {
        A(r.el, [{ transform: 'translateY(' + PITCH + 'px)' }, { transform: 'translateY(0)' }], 400, EASE, 140);
      });
    });
    show(18950, false);
    ev.sort(function (a, b) { return a.t - b.t; });
    return { ev: ev, tw: tw };
  }

  // ── Scene ─────────────────────────────────────────────────────────────
  function phone() {
    var ph = el('div', 'mv-phone');
    var N = 9;
    for (var i = N; i >= 1; i--) {
      var e = put(ph, el('div', 'mv-edge' + (i === N ? ' mv-edge--back' : ''), 'transform:translateZ(' + (-i * 1.25).toFixed(2) + 'px);'));
      if (i === 5) {
        put(e, el('div', 'mv-key', 'left:-3.2px;top:178px;height:34px;'));
        put(e, el('div', 'mv-key', 'left:-3.2px;top:240px;height:64px;'));
        put(e, el('div', 'mv-key', 'left:-3.2px;top:318px;height:64px;'));
        put(e, el('div', 'mv-key', 'right:-3.2px;top:272px;height:100px;'));
      }
    }
    // The front is one flat plane: frame, glass and display flattened
    // together, so the 3D sort never has to order coplanar layers.
    var face = put(ph, el('div', 'mv-face'));
    put(face, el('div', 'mv-frame'));
    put(face, el('div', 'mv-bezel'));
    var scr = put(face, el('div', 'mv-screen'));
    put(scr, el('div', 'mv-island'));
    put(scr, el('div', 'mv-glare'));
    return { el: ph, screen: scr };
  }

  // Two poses the phone eases between over one loop.
  var POSE_A = { rx: 27, rz: -20, ry: 0 }, POSE_B = { rx: 23, rz: -16.5, ry: 2.5 };
  function poseAt(u) { // u in [0,1)
    var k = 0.5 - 0.5 * Math.cos(u * Math.PI * 2);
    return { rx: POSE_A.rx + (POSE_B.rx - POSE_A.rx) * k, rz: POSE_A.rz + (POSE_B.rz - POSE_A.rz) * k, ry: POSE_A.ry + (POSE_B.ry - POSE_A.ry) * k };
  }

  function build(host) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var flat = host.hasAttribute('data-flat');
    fitFonts();
    var root = el('div', 'mv' + (flat ? ' mv--flat' : ''));
    root.setAttribute('aria-hidden', 'true');
    var scene = put(root, el('div', 'mv-scene'));
    var rig = put(scene, el('div', 'mv-rig'));
    var far = put(rig, el('div', 'mv-shadow mv-shadow--far'));
    var near = put(rig, el('div', 'mv-shadow mv-shadow--near'));
    var P = phone();
    put(rig, P.el);
    host.appendChild(root);

    var R = makeApp();
    P.screen.insertBefore(R.app, P.screen.firstChild);
    var S = script(R);

    // Clock
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
      R.app.getAnimations({ subtree: true }).forEach(function (a) {
        try { a.finish(); a.commitStyles(); a.cancel(); } catch (e) {}
      });
    }

    if (flat) {
      var SCR = { drive: 0, swipe: 1500, player: 3890, typing: 5500, posted: 7900, addnew: 10200, source: 11200, upload: 13200, uploaded: 15900, back: 17300 };
      var t = host.hasAttribute('data-t') ? +host.getAttribute('data-t') : (SCR[host.getAttribute('data-screen')] || 0);
      rig.style.cssText = 'position:static;transform:none';
      P.el.style.cssText = 'position:static;';
      root.style.cssText = '';
      // Keep only the screen
      scene.innerHTML = ''; scene.appendChild(P.screen);
      seek(t);
      R.tap.style.display = host.hasAttribute('data-tap') ? '' : 'none';
      return;
    }

    // Fit the tilted phone to the host.
    var fit = { s: 1, cx: 0, cy: 0, w: 0, h: 0 };
    var PERSP = 2600;
    function pose(u) {
      var q = poseAt(u);
      rig.style.transform = 'translate(' + fit.cx.toFixed(2) + 'px,' + fit.cy.toFixed(2) + 'px) scale(' + fit.s.toFixed(4) + ') rotateX(' + q.rx.toFixed(3) + 'deg) rotateY(' + q.ry.toFixed(3) + 'deg) rotateZ(' + q.rz.toFixed(3) + 'deg)';
    }
    function bounds() {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, hr = host.getBoundingClientRect();
      [0, 0.25, 0.5, 0.75].forEach(function (u) {
        pose(u);
        var b = P.el.getBoundingClientRect();
        x0 = Math.min(x0, b.left - hr.left); y0 = Math.min(y0, b.top - hr.top);
        x1 = Math.max(x1, b.right - hr.left); y1 = Math.max(y1, b.bottom - hr.top);
      });
      return [x0, y0, x1, y1];
    }
    function measure() {
      var W0 = host.clientWidth, H0 = host.clientHeight;
      if (!W0 || !H0) return false;
      if (W0 === fit.w && H0 === fit.h) return true;
      fit.w = W0; fit.h = H0;
      // The phone's centre sits a little left of the tile's centre.
      var ox = W0 * 0.47, oy = H0 * 0.5, m = Math.max(10, Math.min(W0, H0) * 0.07);
      fit.s = Math.min(W0, H0) / 1000; fit.cx = ox; fit.cy = oy;
      // Scale, then re-centre, a few times: perspective makes it inexact.
      for (var i = 0; i < 4; i++) {
        scene.style.perspective = (PERSP * fit.s).toFixed(1) + 'px';
        scene.style.perspectiveOrigin = fit.cx.toFixed(1) + 'px ' + fit.cy.toFixed(1) + 'px';
        var bb = bounds();
        var k = Math.min((W0 - 2 * m) / (bb[2] - bb[0]), (H0 - 2 * m) / (bb[3] - bb[1]));
        fit.s *= k;
        fit.cx += ox - ((bb[0] + bb[2]) / 2 - fit.cx) * k - fit.cx;
        fit.cy += oy - ((bb[1] + bb[3]) / 2 - fit.cy) * k - fit.cy;
      }
      scene.style.perspective = (PERSP * fit.s).toFixed(1) + 'px';
      scene.style.perspectiveOrigin = fit.cx.toFixed(1) + 'px ' + fit.cy.toFixed(1) + 'px';
      return true;
    }
    measure();
    pose(0);
    if (window.ResizeObserver) new ResizeObserver(function () { if (measure()) pose(vt / LOOP); }).observe(host);

    if (reduce) { seek(0); R.tap.style.display = 'none'; return; }
    // Test hook: data-t starts the loop at that time; with data-hold it
    // stays there.
    if (host.hasAttribute('data-t')) {
      vt = +host.getAttribute('data-t') || 0;
      seek(vt); pose(vt / LOOP);
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
        // A fresh copy of the app at its first frame, laid under the old one
        // (they look the same at this point), then the old one goes.
        var old = R;
        R = makeApp();
        P.screen.insertBefore(R.app, old.app);
        S = script(R); ei = 0;
        setTimeout(function () { old.anims.forEach(function (a) { a.cancel(); }); old.app.remove(); }, 250);
      }
      runTo(vt);
      pose(vt / LOOP);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) kick(); });
    kick();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-video:not([data-built])') : []).forEach(function (h) {
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
