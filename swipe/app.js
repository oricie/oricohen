/* Matchmark UI: brief → swipe deck → "Yours". Design generation lives in gen.js. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const EXAMPLES = [
    ['🥯 Bagel shop', 'I’m opening a bagel shop in Brooklyn. I need a logo, website and branding. Warm and a bit playful.'],
    ['🛡 Cyber security', 'A cyber security app platform for small teams. Needs a logo, brand and website. Trustworthy but not boring.'],
    ['🧘 Yoga studio', 'A calm, boutique yoga studio. Logo, brand and a website where people can book classes.'],
    ['🐶 Dog grooming', 'A friendly dog grooming salon called Wag Club. Logo, website and branding.'],
    ['💸 Freelancer finance app', 'Finance app for freelancers. Modern, clean and professional. Logo, brand and website.'],
    ['🧒 Kids coding school', 'A coding school for kids aged 7 to 12. Colorful, fun, energetic.']
  ];
  const STORE = 'matchmark.v1';

  /* ───────── storage ───────── */
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || { saved: [], brief: null }; } catch (e) { return { saved: [], brief: null }; } }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify({ saved, brief: lastBrief })); } catch (e) { } }
  const boot = load();
  let saved = boot.saved || [];
  let lastBrief = boot.brief;

  /* ───────── state ───────── */
  let brief = null, briefInput = null, seedBase = 0, next = 0;
  let cards = [], history = [], queue = [];
  const stage = $('#stage');

  /* ───────── helpers ───────── */
  const loadedFonts = new Set();
  function ensureFonts(v) {
    const href = MM.fontsHref(v);
    if (loadedFonts.has(href)) return;
    loadedFonts.add(href);
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
  }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const slug = v => v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
  const key = it => it.seed + '|' + it.text + '|' + (it.name || '');
  const vcache = new Map();
  function rebuild(it) {
    const k = key(it);
    if (!vcache.has(k)) vcache.set(k, MM.makeVariant(MM.parseBrief(it.text, it.name), it.seed, it.dir));
    return vcache.get(k);
  }
  const isSaved = v => saved.some(s => s.seed === v.seed && s.text === briefInput.text && (s.name || '') === (briefInput.name || ''));

  /* Scale a 1280px-wide iframe to fit its frame. */
  const ro = new ResizeObserver(es => es.forEach(e => fitFrame(e.target)));
  function fitFrame(frame) {
    const f = frame.querySelector('iframe'); if (!f || !frame.clientWidth) return;
    const s = frame.clientWidth / 1280;
    f.style.height = Math.ceil(frame.clientHeight / s) + 'px';
    f.style.transform = 'scale(' + s + ')';
  }
  function mountFrame(frame, v) {
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', ''); f.tabIndex = -1; f.title = v.name + ' website preview'; f.loading = 'eager';
    f.srcdoc = MM.siteHTML(v);
    frame.appendChild(f); ro.observe(frame); fitFrame(frame);
  }
  /* Shrink a logo so it sits comfortably in its tile. */
  function fitLogo(tile) {
    const el = $('.lg', tile); if (!el || !tile.clientWidth) return;
    el.style.setProperty('--ls', '40px');
    const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return;
    const s = Math.min(tile.clientWidth * .8 / w, tile.clientHeight * (tile.querySelector('.suggest') ? .66 : .74) / h);
    el.style.setProperty('--ls', Math.max(9, Math.min(60, 40 * s)).toFixed(1) + 'px');
  }
  const fitAllLogos = () => $$('.tile').forEach(fitLogo);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitAllLogos);
  addEventListener('resize', fitAllLogos);

  function logoTile(v, cls) {
    const t = document.createElement('div'); t.className = 'tile ' + (cls || '');
    t.style.background = v.pal.bg; t.innerHTML = MM.logoHTML(v);
    return t;
  }
  const logoCssTag = document.createElement('style'); logoCssTag.textContent = MM.LOGO_CSS; document.head.appendChild(logoCssTag);

  /* ───────── brief screen ───────── */
  const chips = $('#chips');
  EXAMPLES.forEach(([label, text]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = label;
    b.onclick = () => { $('#brief-text').value = text; $('#brief-name').value = ''; $('#brief-text').focus(); };
    chips.appendChild(b);
  });
  if (lastBrief) { $('#brief-text').value = lastBrief.text || ''; $('#brief-name').value = lastBrief.name || ''; }

  $('#brief-form').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('#brief-text').value.trim() || EXAMPLES[0][1];
    startDeck({ text, name: $('#brief-name').value.trim() });
  });
  $('#back').onclick = () => { $('#deck').classList.add('hidden'); $('#brief').classList.remove('hidden'); };
  syncCount();
  $('#brief-yours').onclick = () => openYours();

  /* ───────── deck ───────── */
  async function startDeck(input) {
    briefInput = input; lastBrief = input; persist();
    brief = MM.parseBrief(input.text, input.name);
    seedBase = Math.floor(Math.random() * 900000) + 100; next = 0; history = []; queue = []; dirs = []; dirsOff = false;
    const go = $('.go'); go.disabled = true; go.firstChild.textContent = 'Designing for you… ';
    await fetchDirs(30000);
    go.disabled = false; go.firstChild.textContent = 'Start swiping ';
    cards.forEach(c => c.el.remove()); cards = []; stage.innerHTML = '';
    $('#brief').classList.add('hidden'); $('#deck').classList.remove('hidden');
    $('#brief-chip').innerHTML = '<b>' + esc(input.name || input.text.split(/[.!?]/)[0]) + '</b>';
    fill();
    scrollTo(0, 0);
  }
  /* Claude-written directions, fetched from server.js when available. Cards without one use the built-in rules. */
  let dirs = [], dirsBusy = false, dirsOff = false;
  async function fetchDirs(wait) {
    if (dirsBusy || dirsOff) return; dirsBusy = true;
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), wait || 45000);
    try {
      const r = await fetch('/api/brand', { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: briefInput.text, name: briefInput.name, n: 8, exclude: dirs.map(d => d && d.name).filter(Boolean) }) });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (Array.isArray(j.directions) && j.directions.length) dirs = dirs.concat(j.directions); else throw new Error('empty');
    } catch (e) { if (!dirs.length) dirsOff = true; }
    clearTimeout(t); dirsBusy = false;
  }
  function nextVariant() {
    const q = queue.shift(); if (q) return q;
    const seed = seedBase + next, dir = dirs[next] || null; next++;
    if (dirs.length && next >= dirs.length - 3) fetchDirs();
    return { v: MM.makeVariant(brief, seed, dir), dir };
  }
  function fill() {
    while (cards.length < 4) { const q = nextVariant(); cards.push(makeCard(q.v, q.dir)); }
    layout();
  }
  function layout() {
    cards.forEach((c, i) => {
      c.el.style.setProperty('--pos', i);
      c.el.style.zIndex = 20 - i;
      c.el.classList.toggle('top', i === 0);
    });
    // append in reverse so DOM order matches stacking, and lazily fit new ones
    cards.slice().reverse().forEach(c => { if (!c.el.parentNode) stage.appendChild(c.el); });
    requestAnimationFrame(fitAllLogos);
  }

  function makeCard(v, dir) {
    ensureFonts(v);
    const el = document.createElement('article'); el.className = 'card';
    el.innerHTML =
      '<div class="stamp like">KEEP</div><div class="stamp nope">NOPE</div>' +
      '<div class="shot"><div class="browser"><i></i><i></i><i></i><span>' + esc(v.name.toLowerCase().replace(/[^a-z0-9]+/g, '')) + '.com</span></div><div class="frame"></div></div>' +
      '<div class="meta"><div class="slot"></div><div class="info"><span class="tag">' + esc(v.label) + '</span><div class="head">' + esc(v.head) + '</div>' +
      '<div><div class="pal">' + MM.paletteList(v).slice(2, 5).concat([MM.paletteList(v)[0]]).map(c => '<i style="background:' + c[1] + '"></i>').join('') + '</div><div class="fonts">' + esc(v.fonts.d) + ' + ' + esc(v.fonts.b) + '</div></div></div></div>';
    const tile = logoTile(v);
    if (!v.nameGiven) tile.insertAdjacentHTML('beforeend', '<span class="suggest" style="color:' + v.pal.ink + '">name idea</span>');
    $('.slot', el).replaceWith(tile);
    mountFrame($('.frame', el), v);
    const card = { v, el, dir };
    gesture(card);
    return card;
  }

  /* swipe gestures */
  function gesture(card) {
    const el = card.el; let sx = 0, sy = 0, dx = 0, on = false, t0 = 0;
    const like = $('.stamp.like', el), nope = $('.stamp.nope', el);
    el.addEventListener('pointerdown', e => {
      if (cards[0] !== card || e.button > 0) return;
      on = true; sx = e.clientX; sy = e.clientY; dx = 0; t0 = performance.now();
      el.setPointerCapture(e.pointerId); el.classList.add('drag');
    });
    el.addEventListener('pointermove', e => {
      if (!on) return;
      dx = e.clientX - sx; const dy = e.clientY - sy;
      el.style.transform = 'translate(' + dx + 'px,' + dy * .35 + 'px) rotate(' + dx / 18 + 'deg)';
      like.style.opacity = Math.max(0, Math.min(1, dx / 100));
      nope.style.opacity = Math.max(0, Math.min(1, -dx / 100));
    });
    const end = () => {
      if (!on) return; on = false; el.classList.remove('drag');
      const v = dx / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) > 100 || (Math.abs(v) > .55 && Math.abs(dx) > 35)) decide(dx > 0 ? 'like' : 'nope');
      else { el.style.transform = ''; like.style.opacity = nope.style.opacity = 0; }
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  let busy = false;
  function decide(dir) {
    if (busy || !cards.length) return; busy = true;
    const card = cards.shift(), el = card.el, sign = dir === 'like' ? 1 : -1;
    const m = $('.stamp.' + dir, el); if (m) m.style.opacity = 1;
    el.classList.remove('drag'); el.classList.add('fly');
    el.style.transform = 'translate(' + sign * (innerWidth + 200) + 'px,' + (-30) + 'px) rotate(' + sign * 28 + 'deg)';
    history.push({ v: card.v, dir, cdir: card.dir });
    if (dir === 'like') {
      saved.unshift({ seed: card.v.seed, text: briefInput.text, name: briefInput.name || '', dir: card.dir || null, at: Date.now() });
      vcache.set(key(saved[0]), card.v);
      persist(); bump();
      toast('♥ It’s yours: find it in Yours');
    }
    fill();
    setTimeout(() => { el.remove(); busy = false; }, 380);
  }
  function syncCount() { $('#count').textContent = $('#count2').textContent = saved.length; $('#brief-yours').classList.toggle('hidden', !saved.length); }
  function bump() {
    syncCount();
    const b = $('#open-yours'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
  }
  function undo() {
    if (busy || !history.length) return toast('Nothing to undo');
    const h = history.pop();
    if (h.dir === 'like') {
      const i = saved.findIndex(s => s.seed === h.v.seed && s.text === briefInput.text);
      if (i > -1) saved.splice(i, 1); persist(); syncCount();
    }
    if (cards.length >= 4) { const last = cards.pop(); last.el.remove(); queue.unshift({ v: last.v, dir: last.dir }); }
    const c = makeCard(h.v, h.cdir);
    c.el.classList.add('drag');
    c.el.style.transform = 'translate(' + (h.dir === 'like' ? 1 : -1) * innerWidth + 'px,0) rotate(' + (h.dir === 'like' ? 24 : -24) + 'deg)';
    cards.unshift(c); layout();
    requestAnimationFrame(() => requestAnimationFrame(() => { c.el.classList.remove('drag'); c.el.style.transform = ''; }));
  }
  function peek() {
    if (!cards[0]) return;
    const url = URL.createObjectURL(new Blob([MM.siteHTML(cards[0].v)], { type: 'text/html' }));
    open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  $('#like').onclick = () => decide('like');
  $('#nope').onclick = () => decide('nope');
  $('#undo').onclick = undo;
  $('#peek').onclick = peek;
  addEventListener('keydown', e => {
    if (e.target.matches('input,textarea') || $('#deck').classList.contains('hidden')) return;
    if (!$('#yours').classList.contains('hidden') || !$('#detail').classList.contains('hidden')) { if (e.key === 'Escape') closeTop(); return; }
    if (e.key === 'ArrowRight') decide('like');
    else if (e.key === 'ArrowLeft') decide('nope');
    else if (e.key === 'z' || e.key === 'Z') undo();
    else if (e.key === ' ') { e.preventDefault(); peek(); }
  });

  /* ───────── Yours ───────── */
  const yours = $('#yours'), detail = $('#detail');
  function openYours() {
    const grid = $('#yours-grid'); grid.innerHTML = '';
    $('#yours-n').textContent = saved.length ? '· ' + saved.length : '';
    if (!saved.length) grid.innerHTML = '<div class="empty"><b>Nothing here yet</b>Swipe right on a design you love and it lands here, ready to download.</div>';
    saved.forEach(it => {
      const v = rebuild(it); ensureFonts(v);
      const m = document.createElement('button'); m.className = 'mini';
      m.innerHTML = '<div class="shot"><div class="frame"></div></div><div class="row"><b>' + esc(v.name) + '</b><span class="tag" style="font-size:11px;font-weight:700;color:var(--muted)">' + esc(v.label) + '</span></div>';
      m.insertBefore(logoTile(v), $('.row', m));
      mountFrame($('.frame', m), v);
      m.onclick = () => openDetail(it);
      grid.appendChild(m);
    });
    yours.classList.remove('hidden'); document.body.style.overflow = 'hidden';
    requestAnimationFrame(fitAllLogos);
  }
  $('#open-yours').onclick = openYours;
  function closeTop() {
    if (!detail.classList.contains('hidden')) { detail.classList.add('hidden'); detail.innerHTML = ''; return; }
    yours.classList.add('hidden'); document.body.style.overflow = '';
  }
  yours.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeTop(); });

  function openDetail(it) {
    const v = rebuild(it), P = v.pal;
    detail.innerHTML =
      '<header class="ov-bar"><button class="ghost-btn" data-close>← Back</button><button class="ghost-btn" data-remove style="color:var(--nope)">Remove</button></header>' +
      '<div class="dt">' +
      '<div class="dt-hero"><div><h1>' + esc(v.name) + '</h1><p>' + esc(v.label) + ' · ' + esc(v.head) + '</p></div></div>' +
      '<div class="dl"><button class="btn-main" data-kit>⬇ Download brand kit (.zip)</button><button class="btn-sec" data-site>Website .html</button><button class="btn-sec" data-logo>Logo .svg</button><button class="btn-sec" data-css>Colors &amp; fonts .css</button><button class="btn-sec" data-open>Open live site ↗</button></div>' +
      '<h3>Website</h3><div class="big-frame"><div class="frame"></div></div>' +
      '<h3>Logo</h3><div class="tiles" id="dt-tiles"></div>' +
      '<h3>Colors <span style="text-transform:none;letter-spacing:0;font-weight:500">· tap to copy</span></h3><div class="swatches">' +
      MM.paletteList(v).map(c => '<button class="sw" data-hex="' + c[1] + '"><i style="background:' + c[1] + '"></i><span><b>' + c[0] + '</b>' + c[1].toUpperCase() + '</span></button>').join('') + '</div>' +
      '<h3>Typography</h3><div class="spec"><div class="aa" style="font-family:\'' + v.fonts.d + '\';font-weight:' + v.fonts.w + ';color:' + P.primary + '">Aa</div><div class="lines">' +
      '<div class="d" style="font-family:\'' + v.fonts.d + '\';font-weight:' + v.fonts.w + '">' + esc(v.head) + '</div><div class="b" style="font-family:\'' + v.fonts.b + '\'">The quick brown fox jumps over the lazy dog, in ' + esc(v.fonts.b) + '.</div>' +
      '<div>Display: ' + esc(v.fonts.d) + ' · Body: ' + esc(v.fonts.b) + ' · Free on Google Fonts</div></div></div>' +
      '</div>';
    const tiles = $('#dt-tiles', detail);
    tiles.appendChild(logoTile(v));
    const icon = document.createElement('div'); icon.className = 'tile'; icon.style.background = P.surface;
    icon.innerHTML = '<span class="lg" style="--ls:80px">' + MM.markHTML(v, { container: v.container === 'none' ? 'squircle' : v.container }) + '</span>';
    tiles.appendChild(icon);
    mountFrame($('.frame', detail), v);
    detail.classList.remove('hidden'); detail.scrollTop = 0;
    requestAnimationFrame(() => { fitFrame($('.frame', detail)); $$('.tile', detail).forEach(fitLogo); });

    detail.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.hasAttribute('data-close')) closeTop();
      else if (t.hasAttribute('data-remove')) {
        saved = saved.filter(s => s !== it); persist(); syncCount(); closeTop(); openYours(); toast('Removed');
      } else if (t.hasAttribute('data-kit')) { t.textContent = 'Building…'; download(await MM.brandKitZip(v), slug(v) + '-brand-kit.zip'); t.textContent = '⬇ Download brand kit (.zip)'; }
      else if (t.hasAttribute('data-site')) download(new Blob([MM.siteHTML(v)], { type: 'text/html' }), slug(v) + '-site.html');
      else if (t.hasAttribute('data-logo')) download(new Blob([await MM.logoSVG(v)], { type: 'image/svg+xml' }), slug(v) + '-logo.svg');
      else if (t.hasAttribute('data-css')) download(new Blob([MM.tokensCSS(v)], { type: 'text/css' }), slug(v) + '-brand.css');
      else if (t.hasAttribute('data-open')) { const u = URL.createObjectURL(new Blob([MM.siteHTML(v)], { type: 'text/html' })); open(u, '_blank'); }
      else if (t.dataset.hex) { try { await navigator.clipboard.writeText(t.dataset.hex); } catch (x) { } toast('Copied ' + t.dataset.hex.toUpperCase()); }
    };
  }

  // test / debug hook
  window.__matchmark = { get saved() { return saved; }, get cards() { return cards; }, decide, undo };
})();
