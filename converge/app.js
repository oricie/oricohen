/* Converge: the flow. Brief -> directions -> swipe (taste learning) -> convergence -> your product. */
(function () {
  'use strict';
  const $ = (s, e) => (e || document).querySelector(s), $$ = (s, e) => Array.from((e || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = window.DOMAIN, M = window.MODEL, PR = window.PRODUCT;
  const STORE = 'converge.v1';
  const TYPES = [['', 'Auto-detect'], ['finance', 'Planning & finance'], ['erp', 'ERP'], ['crm', 'CRM'], ['bi', 'BI & analytics'], ['dev', 'Developer tools'], ['admin', 'Admin & access']];
  const EXAMPLES = [
    ['Financial planning', 'An enterprise financial planning platform for finance teams.', ''],
    ['ERP for manufacturers', 'An ERP for mid-size manufacturers to manage procurement, inventory and suppliers.', ''],
    ['CRM for field sales', 'A CRM for enterprise field sales teams who live in the pipeline.', ''],
    ['Developer platform', 'A developer platform for engineering teams to ship, monitor and respond to incidents.', ''],
    ['BI & analytics', 'A BI platform that helps operators understand what changed in the business.', ''],
    ['Access console', 'An admin console for identity and access reviews across the company.', '']
  ];
  const S = { view: 'brief', brief: { text: '', users: '', problem: '', type: '' }, hist: [], shown: [], deck: [], cur: null, final: null, ctx: null, seedBase: 0, next: 0, readyAt: 7, tp: false, tpUser: false, rtab: 'Prototype', busy: false, note: '' };

  /* ───────── utils ───────── */
  let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
  async function download(data, name, type) {
    const blob = new Blob([data], { type: type || 'text/plain' });
    try { const dl = window.claude && await claude.use('downloads'); if (dl) { await dl.save({ filename: name, data: blob }); return; } } catch (e) { if (e && e.code === 'declined') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function copy(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg || 'Copied'); } catch (e) { toast('Select and copy manually'); } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ brief: S.brief, seedBase: S.seedBase, hist: S.hist.map(h => ({ vec: h.vec, seed: h.seed, r: h.r, name: h.name, letter: h.letter })), view: S.view === 'result' ? 'result' : 'swipe', readyAt: S.readyAt })); } catch (e) { } }
  function load() { try { return JSON.parse(localStorage.getItem(STORE)); } catch (e) { return null; } }

  const ro = new ResizeObserver(es => es.forEach(e => e.target.style.setProperty('--k', (e.target.clientWidth / 1280).toFixed(4))));
  const fit = el => { ro.observe(el); el.style.setProperty('--k', (el.clientWidth / 1280 || .3).toFixed(4)); };
  function host(parent, d, state, o) { const h = document.createElement('div'); h.className = 'h'; parent.appendChild(h); const c = PR.mount(h, d, Object.assign({ state }, o || {})); return c; }
  const ARCHN = d => M.ARCH[d.arch].names[0];
  const LB = { home: 'Home', table: 'Table', workflow: 'Workflow', insights: 'Insights', approvals: 'Approvals', settings: 'Settings', detail: 'Detail' };
  function screensFor(d, n) {
    const f = d.flags, pref = ['home', f.wizard ? 'workflow' : 'table', f.charts ? 'insights' : 'detail', f.ai ? 'approvals' : f.cfg ? 'settings' : 'workflow', 'table', 'insights', 'settings'];
    const out = []; pref.forEach(s => { if (!out.includes(s)) out.push(s); });
    return out.slice(0, n).map(s => s === 'detail' ? { id: 'detail', state: { screen: 'table', row: 2 } } : { id: s, state: { screen: s } });
  }

  /* ───────── flow control ───────── */
  function newCtx() { const key = D.detect([S.brief.text, S.brief.users, S.brief.problem].join(' '), S.brief.type); return { packKey: key, pack: D.P[key], used: new Set(), count: 0 }; }
  function startExplore() {
    S.ctx = newCtx(); S.seedBase = Math.floor(Math.random() * 9000) + 100; S.next = 1; S.hist = []; S.shown = []; S.final = null; S.readyAt = 7; S.tp = false; S.tpUser = false;
    S.deck = M.initialDirections(S.ctx, S.seedBase); go('dirs'); save();
  }
  function startSwipe(i) { S.cur = S.deck[i || 0]; S.shown = [S.cur]; S.note = 'start'; go('swipe'); }
  const hasMore = () => S.hist.length < 30;
  function nextCard() { const d = M.nextDirection(S.hist, S.shown, S.ctx, S.seedBase + 50 + S.next++); S.shown.push(d); return d; }
  function isReady() { const L = M.learn(S.hist), mc = L.conf.reduce((a, b) => a + b, 0) / 8; return S.hist.length >= S.readyAt || (S.readyAt === 7 && S.hist.length >= 6 && mc > .68); }

  function react(r) {
    if (S.busy || !S.cur) return; S.busy = true;
    const d = S.cur, before = M.learn(S.hist);
    S.hist.push({ d, r, vec: d.vec, seed: d.seed, name: d.name, letter: d.letter });
    const after = M.learn(S.hist), msg = M.reaction(before, after);
    const card = $('.dcard'); if (card) { $('.stamp.' + (r > 0 ? 'like' : 'nope'), card).style.opacity = 1; card.classList.remove('drag'); card.classList.add('fly'); const s = r > 0 ? 1 : -1; card.style.transform = 'translate(' + s * (innerWidth * .8) + 'px,-30px) rotate(' + s * 14 + 'deg)'; }
    const L = $('#learn'); if (L) { L.textContent = '✦ ' + msg.text; L.classList.add('on'); }
    if (S.hist.length >= 3 && !S.tpUser) S.tp = true;
    renderTaste(true); renderBar(); save();
    setTimeout(() => {
      if (isReady()) { S.busy = false; return startConverge(); }
      S.cur = nextCard(); S.note = 'adapt'; $('#stage').innerHTML = '<div class="thinking"><i></i><i></i><i></i> Shaping the next direction</div>';
      setTimeout(() => { if (S.view !== 'swipe') return; renderRibbon(); mountCard(S.cur, true); scrollTo({ top: 0, behavior: 'smooth' }); S.busy = false; setTimeout(() => { const l = $('#learn'); if (l) l.classList.remove('on'); }, 1800); }, 650);
    }, 560);
  }
  function undo() {
    if (S.busy || !S.hist.length || S.view !== 'swipe') return toast('Nothing to undo');
    const h = S.hist.pop(); S.shown.pop(); S.cur = h.d; S.note = 'undo'; renderTaste(); renderBar(); renderRibbon(); mountCard(S.cur, true); save();
  }
  function startConverge() {
    S.final = M.finalDirection(S.hist, S.ctx, S.seedBase + 999); S.view = 'converge'; S.tp = false; document.body.classList.remove('tp-open'); renderBar(); save();
    const lines = ['Weighing density against workflow…', 'Choosing a navigation model…', 'Settling how much to automate…', 'Assembling your screens…'];
    $('#view').innerHTML = '<section class="conv"><div><span class="mono" style="color:#8a90ff">' + S.hist.length + ' reactions</span><h2>We’re getting <em>close.</em></h2><p id="cl">' + lines[0] + '</p><div class="bars">' + lines.map((_, i) => '<i class="' + (i === 0 ? 'on' : '') + '"></i>').join('') + '</div></div></section>';
    let i = 0; const iv = setInterval(() => { i++; if (S.view !== 'converge') return clearInterval(iv); if (i >= lines.length) { clearInterval(iv); setTimeout(() => { if (S.view === 'converge') { S.rtab = 'Prototype'; go('result'); } }, 700); return; } $('#cl').textContent = lines[i]; $$('.bars i')[i].classList.add('on'); }, 1150);
  }
  function go(v) { S.view = v; renderBar(); ({ brief: vBrief, dirs: vDirs, swipe: vSwipe, result: vResult })[v](); scrollTo(0, 0); renderTaste(); }

  /* ───────── bar ───────── */
  function renderBar() {
    const order = ['brief', 'dirs', 'swipe', 'result'], idx = order.indexOf(S.view === 'converge' ? 'result' : S.view), names = ['Brief', 'Directions', 'Taste', 'Product'];
    $('#bar').innerHTML = '<a class="word" id="home"><svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4l5.5 7L3 18"/><path d="M19 4l-5.5 7 5.5 7"/><circle cx="11" cy="11" r="1.6" fill="var(--acc)" stroke="none"/></svg>Converge</a><div class="crumbs">' + names.map((n, i) => '<span class="' + (i === idx ? 'on' : i < idx ? 'dn' : '') + '">' + n + '</span>').join('') + '</div><span class="sp"></span>' +
      (S.hist.length ? '<button class="pill" id="b-hist">History <b>' + S.hist.length + '</b></button>' : '') + (S.hist.length && S.view === 'swipe' ? '<button class="pill" id="b-taste">Your taste</button>' : '') + (S.view !== 'brief' ? '<button class="pill" id="b-reset">Start over</button>' : '');
    $('#home').onclick = () => { if (S.view !== 'brief') { S.view = 'brief'; document.body.classList.remove('tp-open'); renderBar(); vBrief(); } };
    const h = $('#b-hist'); if (h) h.onclick = openHistory;
    const t = $('#b-taste'); if (t) t.onclick = () => { S.tp = !S.tp; S.tpUser = true; renderTaste(); };
    const r = $('#b-reset'); if (r) r.onclick = () => { S.hist = []; S.cur = null; S.final = null; try { localStorage.removeItem(STORE); } catch (e) { } S.view = 'brief'; document.body.classList.remove('tp-open'); renderBar(); vBrief(); };
  }
  addEventListener('scroll', () => $('#bar').classList.toggle('edge', scrollY > 8), { passive: true });

  /* ───────── 1 · brief ───────── */
  function vBrief() {
    const B = S.brief, saved = load(), resumable = saved && saved.hist && saved.hist.length;
    $('#view').innerHTML = '<section class="brief"><svg class="lines" viewBox="0 0 600 800" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">' + Array.from({ length: 11 }, (_, i) => '<path d="M' + (620) + ' ' + (i * 80 - 40) + 'C380 ' + (i * 70 + 40) + ' 330 ' + (330 + i * 12) + ' 150 400"/>').join('') + '</svg><div class="brief-in">' +
      '<span class="mono">Converge · Product exploration</span><h1>Describe the <em>product.</em></h1>' +
      '<label class="field"><span class="mono">What are you building?</span><textarea id="bt" class="big" rows="2" maxlength="240" placeholder="An enterprise financial planning platform for finance teams.">' + esc(B.text) + '</textarea></label>' +
      '<div class="opt"><label class="field"><span class="mono">Target users, optional</span><input id="bu" maxlength="80" placeholder="FP&A analysts, controllers, the CFO" value="' + esc(B.users) + '"></label><label class="field"><span class="mono">Main problem, optional</span><input id="bp" maxlength="120" placeholder="Budgets live in forty spreadsheets" value="' + esc(B.problem) + '"></label></div>' +
      '<div class="types" id="types"><span class="mono" style="align-self:center;margin-right:6px">Product type</span>' + TYPES.map(t => '<button class="tchip ' + (B.type === t[0] ? 'on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      '<div class="cta-row"><button class="pill ink lg" id="go">Explore directions <span>→</span></button><span class="mono">About two minutes</span>' + (resumable ? '<span class="resume">' + saved.hist.length + ' reactions saved <button class="pill sm ink" id="resume">Continue</button></span>' : '') + '</div>' +
      '<div class="eg">' + EXAMPLES.map((e, i) => '<a data-e="' + i + '">' + e[0] + '</a>').join('') + '</div></div></section>';
    const ta = $('#bt'); const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }; ta.oninput = grow; grow();
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#go').click(); } };
    $$('.tchip').forEach(b => b.onclick = () => { S.brief.type = b.dataset.t; $$('.tchip').forEach(x => x.classList.toggle('on', x === b)); });
    $$('.eg a').forEach(a => a.onclick = () => { const e = EXAMPLES[+a.dataset.e]; ta.value = e[1]; S.brief.type = e[2]; grow(); $$('.tchip').forEach(x => x.classList.toggle('on', x.dataset.t === e[2])); });
    $('#go').onclick = () => { S.brief.text = ta.value.trim() || EXAMPLES[0][1]; S.brief.users = $('#bu').value.trim(); S.brief.problem = $('#bp').value.trim(); startExplore(); };
    const rs = $('#resume'); if (rs) rs.onclick = () => resume(saved);
  }
  function resume(saved) {
    S.brief = saved.brief; S.ctx = newCtx(); S.seedBase = saved.seedBase; S.deck = M.initialDirections(S.ctx, S.seedBase); S.next = 1; S.readyAt = saved.readyAt || 7; S.hist = [];
    saved.hist.forEach((h, i) => { const known = S.deck.find(d => d.seed === h.seed && d.name === h.name); const d = known || M.makeDirection(h.vec, h.seed, S.ctx, { name: h.name, letter: h.letter }); S.hist.push({ d, r: h.r, vec: h.vec, seed: h.seed, name: h.name, letter: h.letter }); S.next = Math.max(S.next, i + 2); });
    S.shown = S.hist.map(h => h.d); S.tp = S.hist.length >= 3; S.tpUser = false;
    if (saved.view === 'result') { S.final = M.finalDirection(S.hist, S.ctx, S.seedBase + 999); S.rtab = 'Prototype'; go('result'); }
    else { S.cur = nextCard(); S.note = 'adapt'; go('swipe'); }
  }

  /* ───────── 2 · directions ───────── */
  function vDirs() {
    const p = S.ctx.pack;
    $('#view').innerHTML = '<section class="dirs"><div class="dhead"><div><span class="mono">' + esc(p.kind) + '</span><h2>Six ways this product could <em>exist.</em></h2><p>Each is a complete product experience, with its own navigation, density and way of working. Start swiping and react to them. Every reaction shapes what you see next.</p></div><div style="display:flex;gap:10px"><button class="pill" id="d-back">← Edit brief</button><button class="pill ink lg" id="d-go">Start swiping <span>→</span></button></div></div><div class="grid" id="dg"></div></section>';
    const g = $('#dg');
    S.deck.forEach((d, i) => {
      const a = document.createElement('button'); a.className = 'dcard-o'; a.setAttribute('aria-label', 'Start with ' + d.name);
      a.innerHTML = '<div class="coll" style="background:' + d.theme.raised + '"></div><div class="otxt"><span class="mono">Direction ' + d.letter + '</span><h3>' + esc(d.name) + '</h3><p>' + esc(d.explain) + '</p><p class="ph">' + esc(d.philosophy) + '</p><div class="tags">' + d.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div></div>';
      g.appendChild(a); const c = $('.coll', a); fit(c);
      screensFor(d, 3).forEach((s, k) => { const m = document.createElement('div'); m.className = 'mini m' + (k + 1); c.appendChild(m); host(m, d, s.state); });
      a.onclick = () => startSwipe(i);
    });
    $('#d-go').onclick = () => startSwipe(0); $('#d-back').onclick = () => go('brief');
  }

  /* ───────── 3 · swipe ───────── */
  function vSwipe() {
    $('#view').innerHTML = '<section class="sw"><div id="ribbon" class="ribbon"></div><div class="learn" id="learn"></div><div class="stage" id="stage"></div><div class="acts"><button class="bt ghost" id="a-undo" aria-label="Undo">↺<span class="lbl"> Undo</span></button><button class="bt no" id="a-no">← Not for me</button><button class="bt ghost" id="a-open" aria-label="Try it">⤢<span class="lbl"> Try it</span></button><button class="bt yes" id="a-yes">Like →</button></div><p class="mono" style="margin-top:14px">← → to react · Space to try it · Z to undo · T for your taste</p></section>';
    $('#a-no').onclick = () => react(-1); $('#a-yes').onclick = () => react(1); $('#a-undo').onclick = undo; $('#a-open').onclick = () => openProto(S.cur, true);
    renderRibbon(); mountCard(S.cur, true); document.body.classList.toggle('tp-open', S.tp);
  }
  function renderRibbon() {
    const el = $('#ribbon'); if (!el) return; const d = S.cur, last = S.hist[S.hist.length - 1];
    let h;
    const tg = a => a.map(x => '<span class="t">' + esc(x) + '</span>').join(' ');
    if (S.note === 'start' || !last) h = '<div><span class="t p">Start here</span></div><div class="sub2">React to what you see. Swipe right if this could be your product, left if it could not.</div>';
    else if (S.note === 'explore') h = '<div><span class="t p">New direction</span></div><div class="sub2">Moving away from your product so far, to show you something different.</div>';
    else h = '<div><span class="t p">' + (last.r > 0 ? 'You liked' : 'You passed on') + '</span> <b>' + esc(last.name) + '</b></div><div class="sub2">' + (d.why && d.why.push.length ? 'Pushing further on ' + tg(d.why.push) + ' &nbsp;·&nbsp; ' : '') + (d.why ? 'Now testing ' + tg(d.why.probe) : '') + '</div>';
    if (M.closing(S.hist) && !isReady()) h = '<div><span class="close-note">We’re getting close. <button id="r-ready">Show my product</button></span></div>' + h;
    el.innerHTML = h; const b = $('#r-ready'); if (b) b.onclick = () => startConverge();
  }
  function mountCard(d, enter) {
    ensureFontsFor(d);
    const st = $('#stage'); st.innerHTML = '';
    const tabs = screensFor(d, 4);
    const el = document.createElement('article'); el.className = 'dcard' + (enter ? ' enter' : '');
    el.innerHTML = '<div class="stamp like">Like</div><div class="stamp nope">Not for me</div>' +
      '<div class="pv" style="background:' + d.theme.raised + '"><div class="fit"></div><div class="ptabs">' + tabs.map((t, i) => '<button data-i="' + i + '" class="' + (i ? '' : 'on') + '">' + LB[t.id] + '</button>').join('') + '</div></div>' +
      '<div class="info"><span class="mono">Direction ' + d.letter + ' · ' + (S.hist.length ? 'Round ' + (S.hist.length + 1) : 'First impression') + '</span><h2>' + esc(d.name) + '</h2><div class="tags">' + d.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>' +
      '<p class="ex">' + esc(d.explain) + '</p><p class="ph">' + esc(d.philosophy) + '</p><ul class="dec">' + d.decisions.slice(0, 6).map(x => '<li><b>' + x[0] + '</b>' + esc(x[1]) + '</li>').join('') + '</ul></div>';
    st.appendChild(el); const pv = $('.pv', el); fit(pv); const f = $('.fit', el);
    let ctl = host(f, d, tabs[0].state);
    $$('.ptabs button', el).forEach(b => b.onclick = e => { e.stopPropagation(); $$('.ptabs button', el).forEach(x => x.classList.toggle('on', x === b)); f.innerHTML = ''; ctl = host(f, d, tabs[+b.dataset.i].state); });
    gesture(el);
  }
  function ensureFontsFor(d) { PR.ensureFonts(d); }
  function gesture(el) {
    let sx = 0, sy = 0, dx = 0, on = false, t0 = 0; const like = $('.stamp.like', el), nope = $('.stamp.nope', el);
    el.addEventListener('pointerdown', e => { if (S.busy || e.target.closest('.ptabs') || e.button > 0) return; on = true; sx = e.clientX; sy = e.clientY; dx = 0; t0 = performance.now(); el.setPointerCapture(e.pointerId); el.classList.add('drag'); });
    el.addEventListener('pointermove', e => { if (!on) return; dx = e.clientX - sx; const dy = e.clientY - sy; el.style.transform = 'translate(' + dx + 'px,' + dy * .25 + 'px) rotate(' + dx / 40 + 'deg)'; like.style.opacity = Math.max(0, Math.min(1, dx / 120)); nope.style.opacity = Math.max(0, Math.min(1, -dx / 120)); });
    const end = () => { if (!on) return; on = false; el.classList.remove('drag'); const v = dx / Math.max(1, performance.now() - t0); if (Math.abs(dx) > 130 || (Math.abs(v) > .6 && Math.abs(dx) > 50)) react(dx > 0 ? 1 : -1); else { el.style.transform = ''; like.style.opacity = nope.style.opacity = 0; } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  /* ───────── taste panel ───────── */
  function renderTaste(animate) {
    const el = $('#taste'), L = M.learn(S.hist), ms = M.meters(L);
    const show = S.tp && S.view === 'swipe' && S.hist.length > 0; document.body.classList.toggle('tp-open', show);
    const prev = animate ? $$('.mt-f', el).map(x => x.style.width) : null;
    el.innerHTML = '<h4>What we’re learning</h4><div class="sum">' + esc(M.summary(L)) + '</div>' + ms.map((m, i) => { const w = (m.v * 100).toFixed(0); return '<div class="mt"><div class="mt-h"><span>' + m.name + '</span>' + (m.c < .2 ? '<i>still guessing</i>' : '') + '</div><div class="mt-t"><div class="mt-f" style="width:' + (prev ? prev[i] : w + '%') + ';opacity:' + (.3 + .7 * m.c).toFixed(2) + '"></div><i class="mt-d" style="left:' + (prev ? prev[i] : w + '%') + ';opacity:' + (.4 + .6 * m.c).toFixed(2) + '"></i></div><div class="mt-p"><span>' + m.lo + '</span><span>' + m.hi + '</span></div></div>'; }).join('') +
      '<div class="round"><h4>Round</h4><div class="dots">' + Array.from({ length: 7 }, (_, i) => '<i class="' + (i < S.hist.length ? 'on' : '') + '"></i>').join('') + '</div><p style="color:var(--mut);font-size:.9rem">' + (S.hist.length >= 5 ? 'We’re getting close.' : 'A few more reactions and we can converge.') + '</p>' + (S.hist.length >= 5 ? '<button class="pill ink" style="margin-top:12px" id="t-go">Show my product →</button>' : '') + '</div>';
    if (prev) requestAnimationFrame(() => requestAnimationFrame(() => { $$('.mt-f', el).forEach((f, i) => f.style.width = (ms[i].v * 100).toFixed(0) + '%'); $$('.mt-d', el).forEach((f, i) => f.style.left = (ms[i].v * 100).toFixed(0) + '%'); }));
    const g = $('#t-go'); if (g) g.onclick = () => startConverge();
  }

  /* ───────── prototype modal + history ───────── */
  function modal(html, wide) { const m = $('#modal'); m.innerHTML = html; m.classList.remove('hidden'); m.onclick = e => { if (e.target === m) closeModal(); }; return m; }
  function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; }
  function openProto(d, reactable) {
    PR.ensureFonts(d);
    const m = modal('<div class="mbox"><div class="mhead"><h3>' + esc(d.name) + ' <span class="mono" style="margin-left:8px">Direction ' + d.letter + ' · click through it</span></h3><div style="display:flex;gap:8px">' + (reactable ? '<button class="pill" id="m-no">← Not for me</button><button class="pill ink" id="m-yes">Like →</button>' : '') + '<button class="pill" id="m-x">Close</button></div></div><div class="mbody"><div class="frame"><div class="chrome"><i></i><i></i><i></i><span>' + esc(d.pack.name.toLowerCase()) + '.app</span></div><div class="fit live" id="mf"></div></div><p class="hint">This is a working prototype. Open records, step through the workflow, change settings.</p></div></div>');
    const f = $('#mf', m); fit(f); host(f, d, { screen: 'home' }, { interactive: true });
    $('#m-x').onclick = closeModal; const n = $('#m-no'), y = $('#m-yes'); if (n) { n.onclick = () => { closeModal(); react(-1); }; y.onclick = () => { closeModal(); react(1); }; }
  }
  function openHistory() {
    const m = modal('<div class="mbox"><div class="mhead"><h3>Everything you reacted to</h3><div style="display:flex;gap:8px"><button class="pill" id="m-reset">Start over</button><button class="pill" id="m-x">Close</button></div></div><div class="mbody"><p class="hint" style="margin:0 0 16px">Change your mind about any of them. Your taste updates right away.</p><div class="hist" id="hg"></div></div></div>');
    const g = $('#hg', m);
    S.hist.forEach((h, i) => {
      const c = document.createElement('div'); c.className = 'hi'; c.innerHTML = '<div class="fit"></div><div class="x"><h5>' + esc(h.name) + '</h5><div class="tags">' + h.d.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div><div class="r"><button class="pill sm ' + (h.r > 0 ? 'ink' : '') + '" data-r="1">Like</button><button class="pill sm ' + (h.r < 0 ? 'ink' : '') + '" data-r="-1">Not for me</button><button class="pill sm" data-o="1">Open</button></div></div>';
      g.appendChild(c); const f = $('.fit', c); fit(f); host(f, h.d, { screen: 'home' });
      $$('button', c).forEach(b => b.onclick = () => { if (b.dataset.o) { openProto(h.d, false); return; } h.r = +b.dataset.r; save(); renderTaste(); $$('button[data-r]', c).forEach(x => x.classList.toggle('ink', +x.dataset.r === h.r)); toast('Taste updated'); if (S.final) toast('Taste updated. Refine or re-explore to apply it.'); });
    });
    $('#m-x', m).onclick = closeModal; $('#m-reset', m).onclick = () => { closeModal(); $('#b-reset') ? $('#b-reset').click() : 0; };
  }

  /* ───────── 5 · result ───────── */
  function blend(d) { const L = M.learn(S.hist), by = Object.keys(M.ARCH).map(k => [k, Math.sqrt(d.vec.reduce((s, x, i) => s + (x - M.ARCH[k].vec[i]) ** 2, 0))]).sort((a, b) => a[1] - b[1]); return { a: M.ARCH[by[0][0]].names[0], b: M.ARCH[by[1][0]].names[0], L }; }
  function productLine(d) {
    const L = M.learn(S.hist), top = L.taste.map((t, i) => [i, Math.abs(t) * L.conf[i]]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i]) => L.taste[i] > 0 ? M.AXES[i].adjHi2 : M.AXES[i].adjLo2);
    const w = top.join(', '); return (/^[aeiou]/i.test(w) ? 'An ' : 'A ') + w + ' ' + d.pack.kind.toLowerCase() + '.';
  }
  function vResult() {
    const d = S.final, p = d.pack, b = blend(d); PR.ensureFonts(d);
    document.body.classList.remove('tp-open');
    $('#view').innerHTML = '<section class="res"><div class="rh"><div><span class="mono">Your product</span><h1>' + esc(p.name) + '</h1><p class="lede">' + esc(productLine(d)) + ' Closest to <em>' + esc(b.a) + '</em>, tempered by <em>' + esc(b.b) + '</em>. ' + esc(M.summary(b.L)) + '</p><div class="tags" style="margin-top:14px">' + d.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div></div></div>' +
      '<div class="rtabs">' + ['Prototype', 'Experience', 'System'].map(t => '<button data-t="' + t + '" class="' + (S.rtab === t ? 'on' : '') + '">' + t + '</button>').join('') + '</div><div id="rb"></div></section>' +
      '<div class="ctabar"><button class="pill acc lg" id="c-build">Build<span class="x"> this product</span> →</button><button class="pill lg" id="c-more">Explore<span class="x"> another direction</span></button><button class="pill lg" id="c-ref">Refine<span class="x"> my product</span></button><button class="pill lg" id="c-fig"><span class="x">Export to </span>Figma</button></div>';
    $$('.rtabs button').forEach(x => x.onclick = () => { S.rtab = x.dataset.t; $$('.rtabs button').forEach(y => y.classList.toggle('on', y === x)); renderTab(); });
    $('#c-build').onclick = openBuild; $('#c-fig').onclick = openFigma; $('#c-ref').onclick = openRefine; $('#c-more').onclick = exploreMore;
    renderTab();
  }
  function renderTab() { const b = $('#rb'); b.innerHTML = ''; ({ Prototype: tProto, Experience: tExp, System: tSys })[S.rtab](b); }
  function tProto(b) {
    const d = S.final, p = d.pack;
    b.innerHTML = '<div class="pto"><nav class="snav"><span class="mono">Screens</span>' + PR.SCREENS.map(s => '<button data-s="' + s + '" class="' + (s === 'home' ? 'on' : '') + '">' + esc(p.labels[s]) + '</button>').join('') + '</nav><div><div class="frame"><div class="chrome"><i></i><i></i><i></i><span>' + esc(p.name.toLowerCase()) + '.app</span></div><div class="fit live" id="pf"></div></div><p class="hint">A working prototype. Open a row, step through the workflow, approve a request, change a setting.</p></div></div>';
    const f = $('#pf', b); fit(f); const ctl = host(f, d, { screen: 'home' }, { interactive: true, onChange: st => $$('.snav button', b).forEach(x => x.classList.toggle('on', x.dataset.s === st.screen)) });
    $$('.snav button', b).forEach(x => x.onclick = () => ctl.go(x.dataset.s)); S.ctl = ctl;
  }
  function tExp(b) {
    const d = S.final, p = d.pack, f = d.flags, L = p.labels;
    const groups = []; PR.SCREENS.forEach(s => { let G = groups.find(x => x.g === p.groups[s]); if (!G) groups.push(G = { g: p.groups[s], items: [] }); G.items.push(s); });
    const subs = { home: ['Key metrics', f.ai ? 'Assistant summary' : 'Needs attention'], workflow: p.workflow.steps.map(x => x[0]), table: ['List and filters', f.pro ? 'Saved views, bulk actions' : 'Simple search', f.detail === 'drawer' ? 'Slide-over detail' : 'Record page with tabs'], insights: ['Trend', 'What changed', 'Breakdown'], approvals: [f.ai ? 'Handled automatically' : 'Queue', 'Needs your decision'], settings: p.settings.map(x => x[0]) };
    const ia = '<ul class="tree"><li><b>' + esc(p.name) + '</b>' + groups.map(G => '<div class="g">' + esc(G.g) + '</div><ul>' + G.items.map(s => '<li>' + esc(L[s]) + '<br><small>' + esc(subs[s].slice(0, 4).join(' · ')) + '</small></li>').join('') + '</ul>').join('') + '</li></ul>';
    const fl = [[p.workflow.name, p.workflow.steps.map(x => x[0])], ['Investigate an exception', ['Alert on home', 'Open the record', f.ai ? 'Read the explanation' : 'Compare against plan', f.manual ? 'Adjust the figures' : 'Accept the suggestion', 'Done']], ['Decide a request', ['Notification', L.approvals, f.ai ? 'See the recommendation' : 'Check the policy', 'Approve or reject', 'Audit trail']]];
    const NAVD = { sidebar: 'A persistent sidebar groups the product into ' + groups.length + ' areas. It is always visible, so people always know where they are.', rail: 'A slim icon rail switches areas, and a contextual panel lists what is inside the current one. Navigation stays out of the way until it is needed.', top: 'Top-level tabs keep every area one click away, with search first. The page below gets the full width.', command: 'There is no fixed menu. A command bar jumps anywhere, and each screen ends with the likely next steps.' };
    const pats = [['Navigation', NAVD[f.navModel].split('. ')[0] + '.'], ['Records', f.detail === 'drawer' ? 'Opening a record slides in a panel, so the list and your place stay visible.' : 'Opening a record takes the whole page, with tabs for overview, breakdown and activity.'], f.pro ? ['Power tools', 'Filters, saved views, group by and bulk actions, with keyboard shortcuts for the common moves.'] : ['Simple by default', 'One search box and three clear views. Extra controls appear only when asked for.'], f.ai ? ['Assistant', 'The product explains what changed and proposes the next step. Every suggestion can be reviewed before it applies.'] : ['Explicit control', 'Changes are made by hand, shown before they apply, and listed in the audit trail.'], f.cfg ? ['Configuration', 'Teams shape roles, rules and views. Settings are grouped and searchable.'] : ['Opinionated setup', 'Three presets cover most teams. Advanced settings stay collapsed until needed.'], f.wizard ? ['Guided workflow', 'The cycle is a sequence with one step on screen at a time, and a clear next action.'] : ['Workspace workflow', 'All steps are reachable at once. Panels show status while you work.'], f.dense ? ['Density', 'Compact rows and tight spacing show more at once. Numbers align and use tabular figures.'] : ['Breathing room', 'Generous spacing and fewer elements per screen keep attention on one task at a time.'], ['Undo and audit', 'Anything that changes data can be reversed, and everything is recorded.']];
    b.innerHTML = '<div class="sec"><h3>Information architecture</h3><p class="d">How ' + esc(p.name) + ' is organised.</p><div class="two"><div class="box">' + ia + '</div><div class="box"><span class="mono">Navigation model</span><h4 style="font:400 1.9rem/1.1 var(--disp);margin:8px 0 10px">' + esc(d.decisions[0][1]) + '</h4><p style="color:#41454d">' + esc(NAVD[f.navModel]) + '</p></div></div></div>' +
      '<div class="sec"><h3>Core user flows</h3><p class="d">The three journeys the product is designed around.</p><div class="box flows">' + fl.map(x => '<div class="fl"><h5>' + esc(x[0]) + '</h5><div class="st">' + x[1].map(s => '<span>' + esc(s) + '</span>').join('<i>→</i>') + '</div></div>').join('') + '</div></div>' +
      '<div class="sec"><h3>Screen designs</h3><p class="d">Six screens, designed together. Open any of them in the prototype.</p><div class="gal" id="gal"></div></div>' +
      '<div class="sec"><h3>Interaction patterns</h3><div class="box"><ul class="pats">' + pats.map(x => '<li><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></li>').join('') + '</ul></div></div>';
    const g = $('#gal', b);
    PR.SCREENS.forEach(s => { const a = document.createElement('button'); a.className = 'gi'; a.innerHTML = '<div class="fit"></div><span>' + esc(L[s]) + '</span><small>' + esc(p.groups[s]) + '</small>'; g.appendChild(a); const fi = $('.fit', a); fit(fi); host(fi, d, { screen: s }); a.onclick = () => { S.rtab = 'Prototype'; $$('.rtabs button').forEach(y => y.classList.toggle('on', y.dataset.t === 'Prototype')); renderTab(); S.ctl && S.ctl.go(s); scrollTo({ top: 0, behavior: 'smooth' }); }; });
  }
  const TOK = d => { const t = d.theme, f = d.flags; return [['Background', t.bg], ['Surface', t.surface], ['Ink', t.ink], ['Muted', t.mut], ['Line', t.line], ['Accent', t.acc], ['Accent tint', t.soft], ['Positive', t.pos], ['Negative', t.neg], ['Warning', t.warn]]; };
  function tokensCSS(d) { const t = d.theme, f = d.flags; return '/* ' + d.pack.name + ' design tokens, generated with Converge */\n:root {\n' + [['bg', t.bg], ['surface', t.surface], ['raised', t.raised], ['ink', t.ink], ['muted', t.mut], ['line', t.line], ['accent', t.acc], ['accent-ink', t.accInk], ['accent-tint', t.soft], ['positive', t.pos], ['negative', t.neg], ['warning', t.warn], ['space-unit', f.u + 'px'], ['font-size', f.fs + 'px'], ['row-height', f.row + 'px'], ['radius', f.r + 'px'], ['font-ui', '"' + t.fonts.ui + '", system-ui, sans-serif'], ['font-mono', '"' + t.fonts.mono + '", monospace'], ['font-display', '"' + t.fonts.disp + '", serif']].map(x => '  --' + x[0] + ': ' + x[1] + ';').join('\n') + '\n}\n'; }
  function tokensJSON(d) { const t = d.theme, f = d.flags, c = (v) => ({ value: v, type: 'color' }); return JSON.stringify({ global: { color: { bg: c(t.bg), surface: c(t.surface), raised: c(t.raised), ink: c(t.ink), muted: c(t.mut), line: c(t.line), accent: c(t.acc), 'accent-tint': c(t.soft), positive: c(t.pos), negative: c(t.neg), warning: c(t.warn) }, spacing: { unit: { value: String(f.u), type: 'spacing' } }, borderRadius: { default: { value: String(f.r), type: 'borderRadius' } }, sizing: { 'row-height': { value: String(f.row), type: 'sizing' } }, fontFamilies: { ui: { value: t.fonts.ui, type: 'fontFamilies' }, mono: { value: t.fonts.mono, type: 'fontFamilies' }, display: { value: t.fonts.disp, type: 'fontFamilies' } }, fontSizes: { body: { value: String(f.fs), type: 'fontSizes' } } } }, null, 2); }
  function tSys(b) {
    const d = S.final, t = d.theme, f = d.flags;
    b.innerHTML = '<div class="sec"><h3>Design tokens</h3><p class="d">Derived from your taste: density sets spacing and row height, tone sets the radius, and the direction sets colour and type.</p><div class="sw-row">' + TOK(d).map(x => '<div class="swt"><i style="background:' + x[1] + '"></i><span><b>' + x[0] + '</b>' + x[1].toUpperCase() + '</span></div>').join('') + '</div><div class="two" style="margin-top:20px"><div class="box"><span class="mono">Type</span><table class="tk"><tr><td>Interface</td><td style="font-family:\'' + t.fonts.ui + '\'">' + t.fonts.ui + '</td></tr><tr><td>Display</td><td style="font-family:\'' + t.fonts.disp + '\';font-size:1.1rem">' + t.fonts.disp + '</td></tr><tr><td>Numbers & code</td><td style="font-family:\'' + t.fonts.mono + '\'">' + t.fonts.mono + '</td></tr></table></div><div class="box"><span class="mono">Space and shape</span><table class="tk"><tr><td>Spacing unit</td><td>' + f.u + 'px</td></tr><tr><td>Base text</td><td>' + f.fs + 'px</td></tr><tr><td>Row height</td><td>' + f.row + 'px</td></tr><tr><td>Corner radius</td><td>' + f.r + 'px</td></tr><tr><td>Density</td><td>' + (f.dense ? 'Compact' : f.airy ? 'Spacious' : 'Balanced') + '</td></tr></table></div></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="pill" id="k-css">Copy CSS</button><button class="pill" id="k-dcss">Download tokens.css</button><button class="pill" id="k-json">Download Figma tokens (.json)</button></div></div><div class="sec"><h3>Component system</h3><p class="d">The same parts, used across every screen.</p><div class="kit" id="kit"></div></div>';
    PR.mountKit($('#kit', b), d);
    $('#k-css', b).onclick = () => copy(tokensCSS(d), 'CSS copied'); $('#k-dcss', b).onclick = () => download(tokensCSS(d), d.pack.name.toLowerCase() + '-tokens.css', 'text/css'); $('#k-json', b).onclick = () => download(tokensJSON(d), d.pack.name.toLowerCase() + '-figma-tokens.json', 'application/json');
  }

  /* ───────── spec + actions ───────── */
  function specMD(d) {
    const p = d.pack, f = d.flags, L = p.labels, b = blend(d), lr = M.learn(S.hist);
    return '# ' + p.name + ': product experience\n\n' + productLine(d) + ' Closest to ' + b.a + ', tempered by ' + b.b + '.\n\nBrief: ' + S.brief.text + (S.brief.users ? '\nUsers: ' + S.brief.users : '') + (S.brief.problem ? '\nProblem: ' + S.brief.problem : '') + '\n\n## Taste profile\n' + M.AXES.map((a, i) => '- ' + a.name + ': ' + (Math.abs(lr.taste[i]) < .1 ? 'neutral' : (lr.taste[i] > 0 ? a.hi : a.lo)) + ' (confidence ' + Math.round(lr.conf[i] * 100) + '%)').join('\n') +
      '\n\n## Information architecture\n' + PR.SCREENS.map(s => '- ' + L[s] + ' (' + p.groups[s] + ')').join('\n') + '\n\n## Navigation model\n' + d.decisions[0][1] + '\n\n## Design decisions\n' + d.decisions.map(x => '- ' + x[0] + ': ' + x[1]).join('\n') + '\n\n## Core flows\n- ' + p.workflow.name + ': ' + p.workflow.steps.map(x => x[0]).join(' → ') + '\n- Investigate an exception: Alert → Record → ' + (f.ai ? 'Explanation' : 'Compare') + ' → ' + (f.manual ? 'Adjust' : 'Accept') + '\n- Decide a request: Notification → ' + L.approvals + ' → ' + (f.ai ? 'Recommendation' : 'Policy check') + ' → Decision\n\n## Screens\n' + PR.SCREENS.map(s => '### ' + L[s] + '\n' + screenNote(d, s)).join('\n\n') + '\n\n## Design tokens\n```css\n' + tokensCSS(d) + '```\n';
  }
  function screenNote(d, s) {
    const f = d.flags, p = d.pack;
    return { home: f.home === 'chart' ? 'Chart-led overview: KPI strip, a forecast chart and an attention list.' : f.home === 'flow' ? 'Starts with the current step of ' + p.workflow.name.toLowerCase() + ' and the next best actions.' : 'KPI strip and a table of the largest changes, with alerts alongside.', workflow: f.wizard ? 'One step at a time with a progress rail, back and continue.' : 'All steps reachable at once, with a status panel beside the work.', table: (f.pro ? 'Filters, saved views, group by, bulk selection. ' : 'Search and three simple views. ') + (f.detail === 'drawer' ? 'Record opens in a slide-over.' : 'Record opens as a page.'), insights: f.charts ? 'Chart canvas with a trend, a change breakdown and small metrics.' : 'Table first, with in-cell bars. A chart view is one toggle away.', approvals: f.ai ? 'Routine items are handled automatically. Only exceptions need a decision, each with a recommendation.' : 'A queue with policy checks and explicit approve and reject.', settings: f.cfg ? 'Grouped settings with a role and permission matrix.' : 'Three presets, advanced options collapsed.' }[s];
  }
  function promptText(d) { const p = d.pack; return 'Build ' + p.kind.toLowerCase() + ' called ' + p.name + (S.brief.users ? ' for ' + S.brief.users : '') + '.\n\nFollow this product experience exactly.\n\n' + specMD(d); }
  function openBuild() {
    const d = S.final, nm = d.pack.name.toLowerCase();
    const m = modal('<div class="mbox" style="max-width:760px"><div class="mhead"><h3>Build ' + esc(d.pack.name) + '</h3><button class="pill" id="m-x">Close</button></div><div class="mbody"><p style="color:#33363d;margin-bottom:6px">Converge hands you a complete spec: information architecture, flows, screen behaviour and design tokens. Give it to your team, or paste it into an AI builder as the starting prompt.</p><div class="pre" id="pp"></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="pill acc lg" id="b-copy">Copy as a prompt</button><button class="pill lg" id="b-md">Download spec (.md)</button><button class="pill lg" id="b-css">Download tokens.css</button></div></div></div>');
    $('#pp', m).textContent = specMD(d).slice(0, 1400) + '\n…'; $('#m-x', m).onclick = closeModal;
    $('#b-copy', m).onclick = () => copy(promptText(d), 'Prompt copied'); $('#b-md', m).onclick = () => download(specMD(d), nm + '-product-spec.md', 'text/markdown'); $('#b-css', m).onclick = () => download(tokensCSS(d), nm + '-tokens.css', 'text/css');
  }
  function openFigma() {
    const d = S.final, nm = d.pack.name.toLowerCase();
    const m = modal('<div class="mbox" style="max-width:640px"><div class="mhead"><h3>Export to Figma</h3><button class="pill" id="m-x">Close</button></div><div class="mbody"><p style="color:#33363d;margin-bottom:14px">Download your colour, type, spacing and radius tokens as a Tokens Studio file, and import them into Figma as variables or styles.</p><p style="color:var(--mut);font-size:.9rem;margin-bottom:18px">A direct Figma plugin that also creates the screens is not built yet. The screens are available in the prototype for reference.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="pill acc lg" id="f-json">Download Figma tokens (.json)</button><button class="pill lg" id="f-md">Download spec (.md)</button></div></div></div>');
    $('#m-x', m).onclick = closeModal; $('#f-json', m).onclick = () => download(tokensJSON(d), nm + '-figma-tokens.json', 'application/json'); $('#f-md', m).onclick = () => download(specMD(d), nm + '-product-spec.md', 'text/markdown');
  }
  function openRefine() {
    const d = S.final; let vec = d.vec.slice(), t;
    const wrap = document.createElement('div'); wrap.className = 'sheetm';
    wrap.innerHTML = '<div class="sh"><span class="mono">Refine</span><h3>Adjust your product</h3><p class="d">Each slider is something your reactions taught us. Change it and the prototype updates.</p>' + M.AXES.map((a, i) => '<div class="slr"><div class="t"><span>' + a.name + '</span></div><input type="range" min="-95" max="95" value="' + Math.round(vec[i] * 100) + '" data-i="' + i + '" aria-label="' + a.name + '"><div class="e"><span>' + a.lo + '</span><span>' + a.hi + '</span></div></div>').join('') + '<button class="pill ink lg" id="r-done" style="margin-top:8px">Done</button></div>';
    document.body.appendChild(wrap); wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
    $('#r-done', wrap).onclick = () => wrap.remove();
    $$('input[type=range]', wrap).forEach(r => r.oninput = () => { vec[+r.dataset.i] = r.value / 100; clearTimeout(t); t = setTimeout(() => { S.final = M.makeDirection(vec, d.seed, { ...S.ctx, used: new Set(), count: 0 }, { name: d.pack.name, final: true }); renderTab(); const h = $('.res .tags'); if (h) h.innerHTML = S.final.tags.map(x => '<span class="tag">' + esc(x) + '</span>').join(''); }, 140); });
  }
  function exploreMore() {
    S.shown.push(S.final); S.readyAt = S.hist.length + 3; S.note = 'explore'; S.tp = true; S.tpUser = false;
    S.cur = nextCard(); S.view = 'swipe'; go('swipe');
  }

  /* ───────── keys ───────── */
  addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;
    if (e.key === 'Escape') { closeModal(); $$('.sheetm').forEach(x => x.remove()); return; }
    if (S.view !== 'swipe' || !$('#modal').classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') react(1); else if (e.key === 'ArrowLeft') react(-1); else if (e.key.toLowerCase() === 'z') undo();
    else if (e.key === ' ') { e.preventDefault(); openProto(S.cur, true); } else if (e.key.toLowerCase() === 't') { S.tp = !S.tp; S.tpUser = true; renderTaste(); }
  });

  window.__converge = { S, react, go };
  renderBar(); vBrief();
})();
