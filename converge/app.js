/* Converge: the flow. Brief -> directions -> swipe (taste learning) -> convergence -> your product. */
(function () {
  'use strict';
  const $ = (s, e) => (e || document).querySelector(s), $$ = (s, e) => Array.from((e || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = window.DOMAIN, MP = window.MODEL, PP = window.PRODUCT, BR = window.BRAND, CD = window.CARDS, MM = window.MM;
  let M = MP, PR = PP;   // swapped when the kind of thing being made changes
  const STORE = 'converge.v1';
  const TYPES = [['', 'Auto-detect'], ['finance', 'Planning & finance'], ['erp', 'ERP'], ['crm', 'CRM'], ['bi', 'BI & analytics'], ['dev', 'Developer tools'], ['admin', 'Admin & access']];
  const KINDS = [['auto', 'Let Converge decide'], ['brand', 'Brand & website'], ['product', 'Complex product'], ['card', 'Invitation or card']];
  const KHINT = { auto: 'Converge reads your description and picks the right kind of exploration.', brand: 'A shop, studio, restaurant, portfolio or small business. You get a logo, colours, type and a website.', product: 'A platform, ERP, CRM, analytics or developer tool. You get a clickable product experience.', card: 'A birthday invite, a thank-you card, a wedding invitation. You get a finished card you can edit and download.' };
  const EXAMPLES = [
    ['Bagel shop', 'I’m opening a bagel shop in Brooklyn. I need a logo, website and branding. Warm and a bit playful.', 'brand', ''],
    ['Yoga studio', 'A calm, boutique yoga studio. Logo, brand and a website where people can book classes.', 'brand', ''],
    ['Dog grooming', 'A friendly dog grooming salon called Wag Club. Logo, website and branding.', 'brand', ''],
    ['Financial planning', 'An enterprise financial planning platform for finance teams.', 'product', ''],
    ['ERP for manufacturers', 'An ERP for mid-size manufacturers to manage procurement, inventory and suppliers.', 'product', ''],
    ['CRM for field sales', 'A CRM for enterprise field sales teams who live in the pipeline.', 'product', ''],
    ['Developer platform', 'A developer platform for engineering teams to ship, monitor and respond to incidents.', 'product', ''],
    ['Access console', 'An admin console for identity and access reviews across the company.', 'product', ''],
    ['Birthday invite', 'A birthday invitation for my daughter Maya’s 7th birthday. Colourful, with balloons.', 'card', ''],
    ['Thank-you card', 'A thank-you card for my mom. Warm and heartfelt.', 'card', ''],
    ['Wedding invite', 'A wedding invitation. Elegant and romantic.', 'card', '']
  ];
  const S = { view: 'brief', kind: 'product', brief: { text: '', users: '', problem: '', type: '', kind: 'auto', name: '', when: '', where: '' }, hist: [], shown: [], deck: [], cur: null, final: null, ctx: null, seedBase: 0, next: 0, readyAt: 7, tp: false, tpUser: false, rtab: 'Prototype', busy: false, note: '' };

  /* ───────── utils ───────── */
  let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
  async function download(data, name, type) {
    const blob = new Blob([data], { type: type || 'text/plain' });
    try { const dl = window.claude && await claude.use('downloads'); if (dl) { await dl.save({ filename: name, data: blob }); return; } } catch (e) { if (e && e.code === 'declined') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function copy(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg || 'Copied'); } catch (e) { toast('Select and copy manually'); } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ kind: S.kind, brief: S.brief, seedBase: S.seedBase, hist: S.hist.map(h => ({ vec: h.vec, seed: h.seed, r: h.r, name: h.name, letter: h.letter })), view: S.view === 'result' ? 'result' : 'swipe', readyAt: S.readyAt })); } catch (e) { } }
  function load() { try { return JSON.parse(localStorage.getItem(STORE)); } catch (e) { return null; } }

  const ro = new ResizeObserver(es => es.forEach(e => e.target.style.setProperty('--k', (e.target.clientWidth / 1280).toFixed(4))));
  const fit = el => { ro.observe(el); el.style.setProperty('--k', (el.clientWidth / 1280 || .3).toFixed(4)); };
  function host(parent, d, state, o) { const h = document.createElement('div'); h.className = 'h'; parent.appendChild(h); const c = PR.mount(h, d, Object.assign({ state }, o || {})); return c; }
  const ARCHN = d => M.ARCH[d.arch].names[0];
  const LB = Object.assign({}, BR.LB, CD.LB, { home: 'Home', table: 'Table', workflow: 'Workflow', insights: 'Insights', approvals: 'Approvals', settings: 'Settings', detail: 'Detail' });
  const detectAny = t => CD.detect(t) ? 'card' : BR.detectKind(t);
  const NOUN = () => S.kind === 'brand' ? 'brand' : S.kind === 'card' ? 'card' : 'product';
  const isB = () => S.kind === 'brand', isC = () => S.kind === 'card';
  function setKind(k) { S.kind = k; M = k === 'brand' ? BR.model : k === 'card' ? CD.model : MP; PR = k === 'brand' ? BR.render : k === 'card' ? CD.render : PP; }
  const FIRST = () => S.kind === 'brand' ? 'site' : S.kind === 'card' ? 'front' : 'home';
  const resolveKind = b => ['brand', 'product', 'card'].includes(b.kind) ? b.kind : detectAny([b.text, b.problem, b.users].join(' '));
  function screensFor(d, n) {
    if (S.kind === 'brand') return BR.screensFor(d, n);
    if (S.kind === 'card') return CD.screensFor(d, n);
    const f = d.flags, pref = ['home', f.wizard ? 'workflow' : 'table', f.charts ? 'insights' : 'detail', f.ai ? 'approvals' : f.cfg ? 'settings' : 'workflow', 'table', 'insights', 'settings'];
    const out = []; pref.forEach(s => { if (!out.includes(s)) out.push(s); });
    return out.slice(0, n).map(s => s === 'detail' ? { id: 'detail', state: { screen: 'table', row: 2 } } : { id: s, state: { screen: s } });
  }

  /* ───────── flow control ───────── */
  function newCtx() {
    if (S.kind === 'card') { const pr = CD.parse(S.brief.text, S.brief.name, S.brief.when, S.brief.where), title = pr.heb ? pr.O.he : pr.O.label + (pr.invite ? ' invitation' : ' card'); return { kind: 'card', packKey: 'card', O: pr.O, L: pr.L, heb: pr.heb, invite: pr.invite, age: pr.age, fields: pr.F, title, pack: { name: title, kind: pr.invite ? 'Invitation' : 'Greeting card' }, used: new Set(), count: 0 }; }
    if (S.kind === 'brand') { const brief = MM.parseBrief([S.brief.text, S.brief.problem].join(' '), S.brief.name); return { kind: 'brand', packKey: 'brand', pack: { name: brief.name || 'Your brand', kind: 'Brand & website' }, brief, used: new Set(), count: 0 }; }
    if (S.brief.agent) D.P.agent = S.brief.agent;
    const key = S.brief.agent ? 'agent' : D.detect([S.brief.text, S.brief.users, S.brief.problem].join(' '), S.brief.type); return { packKey: key, pack: D.P[key], used: new Set(), count: 0 };
  }

  /* ───────── Claude as the content agent ───────── */
  const PACK_KEYS = ['name', 'kind', 'users', 'cur', 'unit', 'e', 'labels', 'groups', 'names', 'idp', 'range', 'spread', 'status', 'pctLabel', 'num', 'cols', 'kpis', 'workflow', 'inputsT', 'drivers', 'bridge', 'group', 'lines', 'series', 'trendT', 'insightT', 'people', 'act', 'ai', 'approvals', 'settings'];
  const okArr = (a, n) => Array.isArray(a) && a.length >= n;
  function mergePack(p, base) {
    if (!p || typeof p !== 'object') return null;
    const out = Object.assign({}, base); let n = 0;
    const chk = {
      name: x => typeof x === 'string' && x, kind: x => typeof x === 'string' && x, users: x => typeof x === 'string' && x, e: x => okArr(x, 2) && x.every(y => typeof y === 'string'),
      labels: x => x && ['home', 'workflow', 'table', 'insights', 'approvals', 'settings'].every(k => typeof x[k] === 'string'), groups: x => x && ['home', 'workflow', 'table', 'insights', 'approvals', 'settings'].every(k => typeof x[k] === 'string'),
      names: x => okArr(x, 8) && x.every(y => typeof y === 'string'), status: x => okArr(x, 3) && x.every(y => typeof y === 'string'), pctLabel: x => typeof x === 'string',
      kpis: x => okArr(x, 4) && x.every(k => Array.isArray(k) && k.length >= 3), workflow: x => x && typeof x.name === 'string' && okArr(x.steps, 4) && x.steps.every(s => Array.isArray(s) && s.length >= 2),
      inputsT: x => typeof x === 'string', drivers: x => okArr(x, 3) && x.every(d => Array.isArray(d) && d.length >= 2), bridge: x => Array.isArray(x) && x.length === 7, group: x => okArr(x, 4), lines: x => okArr(x, 4), series: x => Array.isArray(x) && x.length === 2,
      trendT: x => typeof x === 'string', insightT: x => typeof x === 'string', people: x => typeof x === 'string', act: x => okArr(x, 3), ai: x => okArr(x, 2), approvals: x => okArr(x, 3) && x.every(a => Array.isArray(a) && a.length >= 4),
      settings: x => okArr(x, 3) && x.every(g => Array.isArray(g) && typeof g[0] === 'string' && Array.isArray(g[1]) && g[1].length)
    };
    Object.keys(chk).forEach(k => { let ok = false; try { ok = !!chk[k](p[k]); } catch (e) { } if (ok) { out[k] = p[k]; n++; } });
    ['cur', 'unit'].forEach(k => { if (typeof p[k] === 'string') out[k] = p[k]; });
    out.re = /./; return n >= 12 ? out : null;
  }
  async function askAgent() {
    if (S.kind !== 'product') return;
    const B = S.brief; delete B.agent;
    let sample = null; try { sample = await Promise.race([claude.use('sample'), new Promise(r => setTimeout(() => r(null), 2500))]); } catch (e) { }
    if (!sample) return;
    const base = D.P[D.detect([B.text, B.users, B.problem].join(' '), B.type)], tpl = {}; PACK_KEYS.forEach(k => tpl[k] = base[k]);
    const prompt = 'You write realistic mock content for a clickable product prototype. The product: "' + [B.text, B.users && 'Users: ' + B.users, B.problem && 'Problem: ' + B.problem].filter(Boolean).join('. ') + '".\n' +
      'Return ONE JSON object with exactly the same keys and shapes as the example below, but with content specific to THIS product: its real vocabulary, entities, statuses, workflow steps, KPIs, table columns, approvals and settings, as a domain expert would write it. Rules: realistic numbers and short labels (under 28 characters); keep the arrays at the same lengths as the example (names 12, kpis 4, workflow.steps 5, drivers 4, bridge 7, group 6, series 2, approvals 4, settings 4 groups of 3); cols must keep the same 8 column ids in the same order (name, owner, m1, m2, m3, pct, status, trend) and the same type strings, only change the labels; kpis items are [label, value, delta, 1 if good else 0]; keep "idp", "range", "spread", "num", "cur", "unit" valid (cur and unit may be empty strings); "name" is a short invented product name. Write all text in ' + (/[֐-׿]/.test(B.text) ? 'English (keep identifiers and numbers Latin, even though the brief is Hebrew)' : 'the language of the brief') + '. No commentary, JSON only.\n\nExample (for a different product):\n' + JSON.stringify(tpl);
    try {
      const j = await sample.json(prompt, { modelTier: 'default', cache: true });
      const m = mergePack(j, base); if (m) { B.agent = m; B.agentOk = true; }
    } catch (e) { /* not granted, rate limited or bad JSON: keep the built-in pack */ }
  }
  async function begin(skip) {
    const b = $('#go'), r = $('#seeall'); [b, r].forEach(x => x && (x.disabled = true));
    if (b) b.innerHTML = 'Asking Claude to write your product… <span class="dots"></span>';
    const t = setTimeout(() => { }, 0); clearTimeout(t);
    try { await Promise.race([askAgent(), new Promise(res => setTimeout(res, 70000))]); } catch (e) { }
    startExplore(skip);
  }
  function startExplore(skip) {
    setKind(resolveKind(S.brief)); S.ctx = newCtx(); S.seedBase = Math.floor(Math.random() * 9000) + 100; S.next = 1; S.hist = []; S.shown = []; S.final = null; S.readyAt = 7; S.tp = false; S.tpUser = false;
    S.lastMsg = ''; S.deck = M.initialDirections(S.ctx, S.seedBase); save(); if (skip) startSwipe(0); else go('dirs');
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
    const card = $('.dcard'); if (card) { $('.stamp.' + (r > 0 ? 'like' : 'nope'), card).style.opacity = 1; card.classList.remove('drag'); card.classList.add('fly'); const s = r > 0 ? 1 : -1; card.style.transform = 'translate(' + s * (innerWidth * .8) + 'px,-30px) rotate(' + s * 26 + 'deg)'; }
    S.lastMsg = msg.text;
    if (S.hist.length >= 3 && !S.tpUser && innerWidth >= 1180) S.tp = true;
    renderTaste(true); renderBar(); save();
    setTimeout(() => {
      if (isReady()) { S.busy = false; return startConverge(); }
      S.cur = nextCard(); S.note = 'adapt'; renderRibbon(true); $('#stage').innerHTML = '<div class="ghost g2"></div><div class="ghost g1"></div><div class="dcard blank"><div class="thinking"><i></i><i></i><i></i></div></div>';
      setTimeout(() => { if (S.view !== 'swipe') return; renderRibbon(); mountCard(S.cur, true); scrollTo({ top: 0, behavior: 'smooth' }); S.busy = false; }, 650);
    }, 560);
  }
  function undo() {
    if (S.busy || !S.hist.length || S.view !== 'swipe') return toast('Nothing to undo');
    const h = S.hist.pop(); S.shown.pop(); S.cur = h.d; S.note = 'undo'; S.lastMsg = ''; renderTaste(); renderBar(); renderRibbon(); mountCard(S.cur, true); save();
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
    const order = ['brief', 'dirs', 'swipe', 'result'], idx = order.indexOf(S.view === 'converge' ? 'result' : S.view), names = ['Brief', 'Directions', 'Taste', 'Yours'];
    $('#bar').innerHTML = '<a class="word" id="home"><span class="hm">♥</span>Converge</a><div class="crumbs">' + names.map((n, i) => '<span class="' + (i === idx ? 'on' : i < idx ? 'dn' : '') + '">' + n + '</span>').join('') + '</div>' + (S.view !== 'brief' ? '<span class="ktag">' + (S.kind === 'brand' ? 'Brand & website' : S.kind === 'card' ? 'Invitation or card' : 'Complex product') + '</span>' : '') + '<span class="sp"></span>' +
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
    const QUICK = [0, 3, 8, 9];
    $('#view').innerHTML = '<section class="brief"><div class="b2"><h1>What are you <em>making?</em></h1>' +
      '<p class="lede">Describe it in a sentence. We’ll show you designs to swipe on.</p>' +
      '<form id="bf" autocomplete="off"><textarea id="bt" class="tbox" dir="auto" rows="3" maxlength="240" aria-label="What are you making?" placeholder="A bagel shop in Brooklyn, or an enterprise financial planning platform.">' + esc(B.text) + '</textarea>' +
      '<p class="kline"><span id="ktxt"></span> <button type="button" id="kchange" class="linkb in">Change</button></p>' +
      '<div class="chips hidden" id="kinds">' + KINDS.map(k => '<button type="button" class="tchip ' + (B.kind === k[0] ? 'on' : '') + '" data-k="' + k[0] + '">' + k[1] + '</button>').join('') + '</div>' +
      '<div class="chips eg"><span class="try">Try</span>' + QUICK.map(i => '<button type="button" class="tchip soft" data-e="' + i + '">' + EXAMPLES[i][0] + '</button>').join('') + '</div>' +
      '<button class="go" id="go" type="submit">Start swiping <span>→</span></button>' +
      '<div class="more-row"><button type="button" class="linkb" id="more">Add details</button><span>·</span><button type="button" class="linkb" id="seeall">See all six directions first</button></div>' +
      '<div id="opts" class="hidden"></div>' +
      (resumable ? '<div class="resume">' + saved.hist.length + ' reactions saved <button type="button" class="pill sm ink" id="resume">Continue</button></div>' : '') + '</form></div></section>';
    const ta = $('#bt'), grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, 96) + 'px'; };
    const eff = () => B.kind === 'auto' ? detectAny([ta.value, ($('#bp') || {}).value].join(' ')) : B.kind;
    let shown = null;
    const label = k => k === 'brand' ? 'brand & website' : k === 'card' ? 'invitation or card' : 'complex product';
    const line = () => { const k = eff(); $('#ktxt').textContent = (B.kind === 'auto' ? 'Looks like a ' : 'Making a ') + label(k) + '.'; };
    const opts = () => {
      const k = eff(); line(); if (k === shown) return;
      const keep = { name: ($('#bn') || {}).value, users: ($('#bu') || {}).value, problem: ($('#bp') || {}).value, when: ($('#bw') || {}).value, where: ($('#bq') || {}).value }; shown = k;
      $('#opts').innerHTML = k === 'card' ?
        '<div class="opt"><label class="field"><span class="lab">Name(s)</span><input id="bn" dir="auto" maxlength="40" placeholder="Maya, or Noa &amp; Daniel" value="' + esc(keep.name != null ? keep.name : B.name) + '"></label><label class="field"><span class="lab">Date and time</span><input id="bw" dir="auto" maxlength="60" placeholder="Saturday 14 June, 4pm" value="' + esc(keep.when != null ? keep.when : B.when) + '"></label></div><div class="opt one"><label class="field"><span class="lab">Place</span><input id="bq" dir="auto" maxlength="80" placeholder="Our garden, 12 Oak Street" value="' + esc(keep.where != null ? keep.where : B.where) + '"></label></div>' :
        k === 'brand' ?
        '<div class="opt"><label class="field"><span class="lab">Business name</span><input id="bn" dir="auto" maxlength="28" placeholder="We’ll suggest names if you skip it" value="' + esc(keep.name != null ? keep.name : B.name) + '"></label><label class="field"><span class="lab">Who is it for</span><input id="bu" dir="auto" maxlength="80" placeholder="Neighbourhood regulars, busy parents" value="' + esc(keep.users != null ? keep.users : B.users) + '"></label></div>' :
        '<div class="opt"><label class="field"><span class="lab">Target users</span><input id="bu" dir="auto" maxlength="80" placeholder="FP&A analysts, controllers, the CFO" value="' + esc(keep.users != null ? keep.users : B.users) + '"></label><label class="field"><span class="lab">Main problem</span><input id="bp" dir="auto" maxlength="120" placeholder="Budgets live in forty spreadsheets" value="' + esc(keep.problem != null ? keep.problem : B.problem) + '"></label></div><div class="lab2">Product type</div><div class="chips" id="types">' + TYPES.map(t => '<button type="button" class="tchip ' + (B.type === t[0] ? 'on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
      $$('#types .tchip').forEach(b => b.onclick = () => { B.type = b.dataset.t; $$('#types .tchip').forEach(x => x.classList.toggle('on', x === b)); });
    };
    ta.oninput = () => { if (B.fromEg && ta.value.trim() !== B.fromEg) { B.kind = 'auto'; B.type = ''; B.fromEg = null; $$('#kinds .tchip').forEach(x => x.classList.toggle('on', x.dataset.k === 'auto')); } grow(); if (B.kind === 'auto') opts(); line(); }; grow(); opts();
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#go').click(); } };
    $('#kchange').onclick = () => $('#kinds').classList.toggle('hidden');
    $('#more').onclick = () => { const o = $('#opts'); o.classList.toggle('hidden'); $('#more').textContent = o.classList.contains('hidden') ? 'Add details' : 'Hide details'; };
    $$('#kinds .tchip').forEach(b => b.onclick = () => { B.kind = b.dataset.k; $$('#kinds .tchip').forEach(x => x.classList.toggle('on', x === b)); shown = null; opts(); });
    $$('.eg .tchip').forEach(a => a.onclick = () => { const e = EXAMPLES[+a.dataset.e]; ta.value = e[1]; B.kind = e[2]; B.type = e[3]; B.fromEg = e[1].trim(); B.name = ''; grow(); $$('#kinds .tchip').forEach(x => x.classList.toggle('on', x.dataset.k === B.kind)); shown = null; opts(); ta.focus(); });
    const collect = () => { B.text = ta.value.trim() || EXAMPLES[0][1]; B.users = ($('#bu') || {}).value ? $('#bu').value.trim() : ''; B.problem = ($('#bp') || {}).value ? $('#bp').value.trim() : ''; B.name = ($('#bn') || {}).value ? $('#bn').value.trim() : ''; B.when = ($('#bw') || {}).value ? $('#bw').value.trim() : ''; B.where = ($('#bq') || {}).value ? $('#bq').value.trim() : ''; };
    $('#bf').onsubmit = e => { e.preventDefault(); collect(); begin(true); };
    $('#seeall').onclick = () => { collect(); begin(false); };
    const rs = $('#resume'); if (rs) rs.onclick = () => resume(saved);
  }
  function resume(saved) {
    S.brief = saved.brief; setKind(saved.kind || 'product'); S.ctx = newCtx(); S.seedBase = saved.seedBase; S.deck = M.initialDirections(S.ctx, S.seedBase); S.next = 1; S.readyAt = saved.readyAt || 7; S.hist = [];
    saved.hist.forEach((h, i) => { const known = S.deck.find(d => d.seed === h.seed && d.name === h.name); const d = known || M.makeDirection(h.vec, h.seed, S.ctx, { name: h.name, letter: h.letter }); S.hist.push({ d, r: h.r, vec: h.vec, seed: h.seed, name: h.name, letter: h.letter }); S.next = Math.max(S.next, i + 2); });
    S.shown = S.hist.map(h => h.d); S.tp = S.hist.length >= 3 && innerWidth >= 1180; S.tpUser = false;
    if (saved.view === 'result') { S.final = M.finalDirection(S.hist, S.ctx, S.seedBase + 999); S.rtab = 'Prototype'; go('result'); }
    else { S.cur = nextCard(); S.note = 'adapt'; go('swipe'); }
  }

  /* ───────── 2 · directions ───────── */
  function vDirs() {
    const p = S.ctx.pack;
    $('#view').innerHTML = '<section class="dirs"><div class="dhead"><div><span class="mono">' + esc(p.kind) + '</span><h2>Six ways this ' + NOUN() + ' could <em>' + (S.kind === 'product' ? 'exist.' : 'look.') + '</em></h2><p>' + (S.kind === 'brand' ? 'Each is a complete brand: logo, colours, type and a working website. ' : S.kind === 'card' ? 'Each is a finished card with its own colour, lettering and illustrations. ' : 'Each is a complete product experience, with its own navigation, density and way of working. ') + 'Start swiping and react to them. Every reaction shapes what you see next.</p></div><div style="display:flex;gap:10px"><button class="pill" id="d-back">← Edit brief</button><button class="pill ink lg" id="d-go">Start swiping <span>→</span></button></div></div><div class="grid" id="dg"></div></section>';
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
    $('#view').innerHTML = '<section class="sw"><div id="ribbon" class="ribbon"></div><div class="stage" id="stage"></div><div class="acts"><button class="rb sm" id="a-undo" aria-label="Undo" title="Undo (Z)">↺</button><button class="rb big no" id="a-no" aria-label="Not for me" title="Not for me (←)">✕</button><button class="rb big yes" id="a-yes" aria-label="Like" title="Like (→)">♥</button><button class="rb sm" id="a-open" aria-label="Try it" title="Try it (Space)">⤢</button></div><p class="mono kb">← → to react · Space to try it · Z to undo · T for your taste</p></section>';
    $('#a-no').onclick = () => react(-1); $('#a-yes').onclick = () => react(1); $('#a-undo').onclick = undo; $('#a-open').onclick = () => openProto(S.cur, true);
    renderRibbon(); mountCard(S.cur, true); document.body.classList.toggle('tp-open', S.tp);
  }
  function renderRibbon(thinking) {
    const el = $('#ribbon'); if (!el) return; const d = S.cur, last = S.hist[S.hist.length - 1], low = a => a.map(x => x.toLowerCase());
    const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0];
    let l1, l2;
    if (thinking) { l1 = S.lastMsg; l2 = 'Shaping the next direction…'; }
    else if (S.note === 'undo') { l1 = 'Undone.'; l2 = 'Back to ' + d.name + '.'; }
    else if (S.note === 'explore') { l1 = 'Something different.'; l2 = 'Moving away from your ' + NOUN() + ' so far.'; }
    else if (S.note === 'start' || !last) { l1 = 'Start here.'; l2 = 'Swipe right if this could be your ' + NOUN() + ', left if not.'; }
    else { l1 = S.lastMsg || (last.r > 0 ? 'You liked ' : 'You passed on ') + last.name + '.'; l2 = d.why && d.why.probe.length ? 'Now testing ' + list(low(d.why.probe)) + '.' : ''; }
    let h = '<div class="rl1">' + esc(l1) + '</div>' + (l2 ? '<div class="rl2">' + esc(l2) + '</div>' : '');
    if (M.closing(S.hist) && !isReady() && !thinking) h = '<button type="button" class="close-note" id="r-ready">We’re getting close. <span>Show my ' + NOUN() + '</span></button>' + h;
    el.innerHTML = h; const b = $('#r-ready'); if (b) b.onclick = () => startConverge();
  }
  function mountCard(d, enter) {
    ensureFontsFor(d);
    const st = $('#stage'); st.innerHTML = '<div class="ghost g2"></div><div class="ghost g1"></div>';
    const tabs = screensFor(d, 4);
    const el = document.createElement('article'); el.className = 'dcard' + (enter ? ' enter' : '');
    el.innerHTML = '<div class="stamp like">Like</div><div class="stamp nope">Not for me</div>' +
      '<div class="pv" style="background:' + d.theme.raised + '"><div class="fit"></div><div class="ptabs">' + tabs.map((t, i) => '<button data-i="' + i + '" class="' + (i ? '' : 'on') + '">' + LB[t.id] + '</button>').join('') + '</div></div>' +
      '<div class="info"><div class="ih"><span class="mono">Direction ' + d.letter + ' · ' + (S.hist.length ? 'Round ' + (S.hist.length + 1) : 'First impression') + '</span><h2>' + esc(d.name) + '</h2><div class="tags">' + d.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div></div>' +
      '<div class="it"><p class="ex">' + esc(d.explain) + '</p><p class="ph">' + esc(d.philosophy) + '</p></div><ul class="dec">' + d.decisions.slice(0, 4).map(x => '<li><b>' + x[0] + '</b>' + esc(x[1]) + '</li>').join('') + '</ul></div>';
    st.appendChild(el); const pv = $('.pv', el); fit(pv); const f = $('.fit', el);
    let ctl = host(f, d, tabs[0].state);
    $$('.ptabs button', el).forEach(b => b.onclick = e => { e.stopPropagation(); $$('.ptabs button', el).forEach(x => x.classList.toggle('on', x === b)); f.innerHTML = ''; ctl = host(f, d, tabs[+b.dataset.i].state); });
    gesture(el);
  }
  function ensureFontsFor(d) { PR.ensureFonts(d); }
  function gesture(el) {
    let sx = 0, sy = 0, dx = 0, on = false, t0 = 0; const like = $('.stamp.like', el), nope = $('.stamp.nope', el);
    el.addEventListener('pointerdown', e => { if (S.busy || e.target.closest('.ptabs') || e.button > 0) return; on = true; sx = e.clientX; sy = e.clientY; dx = 0; t0 = performance.now(); el.setPointerCapture(e.pointerId); el.classList.add('drag'); });
    el.addEventListener('pointermove', e => { if (!on) return; dx = e.clientX - sx; const dy = e.clientY - sy; el.style.transform = 'translate(' + dx + 'px,' + dy * .35 + 'px) rotate(' + dx / 18 + 'deg)'; like.style.opacity = Math.max(0, Math.min(1, dx / 120)); nope.style.opacity = Math.max(0, Math.min(1, -dx / 120)); });
    const end = () => { if (!on) return; on = false; el.classList.remove('drag'); const v = dx / Math.max(1, performance.now() - t0); if (Math.abs(dx) > 130 || (Math.abs(v) > .6 && Math.abs(dx) > 50)) react(dx > 0 ? 1 : -1); else { el.style.transform = ''; like.style.opacity = nope.style.opacity = 0; } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  /* ───────── taste panel ───────── */
  function renderTaste(animate) {
    const el = $('#taste'), L = M.learn(S.hist), ms = M.meters(L);
    const show = S.tp && S.view === 'swipe' && S.hist.length > 0; document.body.classList.toggle('tp-open', show);
    const prev = animate ? $$('.mt-f', el).map(x => x.style.width) : null;
    el.innerHTML = '<button class="pill sm tclose" id="t-x">Close</button><h4>What we’re learning</h4><div class="sum">' + esc(M.summary(L)) + '</div>' + ms.map((m, i) => { const w = (m.v * 100).toFixed(0); return '<div class="mt"><div class="mt-h"><span>' + m.name + '</span>' + (m.c < .2 ? '<i>still guessing</i>' : '') + '</div><div class="mt-t"><div class="mt-f" style="width:' + (prev ? prev[i] : w + '%') + ';opacity:' + (.3 + .7 * m.c).toFixed(2) + '"></div><i class="mt-d" style="left:' + (prev ? prev[i] : w + '%') + ';opacity:' + (.4 + .6 * m.c).toFixed(2) + '"></i></div><div class="mt-p"><span>' + m.lo + '</span><span>' + m.hi + '</span></div></div>'; }).join('') +
      '<div class="round"><h4>Round</h4><div class="dots">' + Array.from({ length: 7 }, (_, i) => '<i class="' + (i < S.hist.length ? 'on' : '') + '"></i>').join('') + '</div><p style="color:var(--mut);font-size:.9rem">' + (S.hist.length >= 5 ? 'We’re getting close.' : 'A few more reactions and we can converge.') + '</p>' + (S.hist.length >= 5 ? '<button class="pill ink" style="margin-top:12px" id="t-go">Show my product →</button>' : '') + '</div>';
    if (prev) requestAnimationFrame(() => requestAnimationFrame(() => { $$('.mt-f', el).forEach((f, i) => f.style.width = (ms[i].v * 100).toFixed(0) + '%'); $$('.mt-d', el).forEach((f, i) => f.style.left = (ms[i].v * 100).toFixed(0) + '%'); }));
    const g = $('#t-go'); if (g) g.onclick = () => startConverge();
    const x = $('#t-x'); if (x) x.onclick = () => { S.tp = false; S.tpUser = true; renderTaste(); };
  }

  /* ───────── prototype modal + history ───────── */
  function modal(html, wide) { const m = $('#modal'); m.innerHTML = html; m.classList.remove('hidden'); m.onclick = e => { if (e.target === m) closeModal(); }; return m; }
  function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; }
  function openProto(d, reactable) {
    PR.ensureFonts(d);
    const m = modal('<div class="mbox"><div class="mhead"><h3>' + esc(d.name) + ' <span class="mono" style="margin-left:8px">Direction ' + d.letter + ' · click through it</span></h3><div style="display:flex;gap:8px">' + (reactable ? '<button class="pill" id="m-no">← Not for me</button><button class="pill ink" id="m-yes">Like →</button>' : '') + '<button class="pill" id="m-x">Close</button></div></div><div class="mbody"><div class="frame"><div class="chrome"><i></i><i></i><i></i><span>' + esc(d.pack.name.toLowerCase()) + '.app</span></div><div class="fit live" id="mf"></div></div><p class="hint">' + (S.kind === 'card' ? 'The front of the card. Use the tabs on the swipe card to see the back and the story format.' : S.kind === 'brand' ? 'A working website. Scroll through it, or switch to the brand board.' : 'This is a working prototype. Open records, step through the workflow, change settings.') + '</p></div></div>');
    const f = $('#mf', m); fit(f); host(f, d, { screen: FIRST() }, { interactive: true });
    $('#m-x').onclick = closeModal; const n = $('#m-no'), y = $('#m-yes'); if (n) { n.onclick = () => { closeModal(); react(-1); }; y.onclick = () => { closeModal(); react(1); }; }
  }
  function openHistory() {
    const m = modal('<div class="mbox"><div class="mhead"><h3>Everything you reacted to</h3><div style="display:flex;gap:8px"><button class="pill" id="m-reset">Start over</button><button class="pill" id="m-x">Close</button></div></div><div class="mbody"><p class="hint" style="margin:0 0 16px">Change your mind about any of them. Your taste updates right away.</p><div class="hist" id="hg"></div></div></div>');
    const g = $('#hg', m);
    S.hist.forEach((h, i) => {
      const c = document.createElement('div'); c.className = 'hi'; c.innerHTML = '<div class="fit"></div><div class="x"><h5>' + esc(h.name) + '</h5><div class="tags">' + h.d.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div><div class="r"><button class="pill sm ' + (h.r > 0 ? 'ink' : '') + '" data-r="1">Like</button><button class="pill sm ' + (h.r < 0 ? 'ink' : '') + '" data-r="-1">Not for me</button><button class="pill sm" data-o="1">Open</button></div></div>';
      g.appendChild(c); const f = $('.fit', c); fit(f); host(f, h.d, { screen: FIRST() });
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
    $('#view').innerHTML = '<section class="res"><div class="rh"><div><span class="mono">' + (isC() ? 'Your design' : isB() ? 'Your brand' : 'Your product') + '</span><h1>' + esc(p.name) + '</h1><p class="lede">' + esc(isC() ? productLineC(d) : isB() ? productLineB(d) : productLine(d)) + ' Closest to <em>' + esc(b.a) + '</em>, tempered by <em>' + esc(b.b) + '</em>. ' + esc(M.summary(b.L)) + '</p><div class="tags" style="margin-top:14px">' + d.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div></div></div>' +
      '<div class="rtabs">' + ['Prototype', 'Experience', 'System'].map(t => '<button data-t="' + t + '" class="' + (S.rtab === t ? 'on' : '') + '">' + (isC() ? { Prototype: 'Card', Experience: 'Style', System: 'Share' }[t] : isB() ? { Prototype: 'Website', Experience: 'Brand', System: 'System' }[t] : t) + '</button>').join('') + '</div><div id="rb"></div></section>' +
      '<div class="ctabar"><button class="pill acc lg" id="c-build">' + (isC() ? 'Use<span class="x"> this design</span>' : isB() ? 'Use<span class="x"> this brand</span>' : 'Build<span class="x"> this product</span>') + ' →</button><button class="pill lg" id="c-more">Explore<span class="x"> another direction</span></button><button class="pill lg" id="c-ref">Refine<span class="x"> my ' + NOUN() + '</span></button><button class="pill lg" id="c-fig">' + (isC() ? 'Download<span class="x"> PNG</span>' : '<span class="x">Export to </span>Figma') + '</button></div>';
    $$('.rtabs button').forEach(x => x.onclick = () => { S.rtab = x.dataset.t; $$('.rtabs button').forEach(y => y.classList.toggle('on', y === x)); renderTab(); });
    $('#c-build').onclick = () => isC() ? goShare() : isB() ? openBuildB() : openBuild(); $('#c-fig').onclick = () => isC() ? dlPng('front', 'portrait') : isB() ? openFigmaB() : openFigma(); $('#c-ref').onclick = openRefine; $('#c-more').onclick = exploreMore;
    renderTab();
  }
  function renderTab() { const b = $('#rb'); b.innerHTML = ''; (isC() ? { Prototype: tCEdit, Experience: tCStyle, System: tCShare } : isB() ? { Prototype: tBProto, Experience: tBExp, System: tBSys } : { Prototype: tProto, Experience: tExp, System: tSys })[S.rtab](b); }
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
    wrap.innerHTML = '<div class="sh"><span class="mono">Refine</span><h3>Adjust your ' + NOUN() + '</h3><p class="d">Each slider is something your reactions taught us. Change it and the prototype updates.</p>' + M.AXES.map((a, i) => '<div class="slr"><div class="t"><span>' + a.name + '</span></div><input type="range" min="-95" max="95" value="' + Math.round(vec[i] * 100) + '" data-i="' + i + '" aria-label="' + a.name + '"><div class="e"><span>' + a.lo + '</span><span>' + a.hi + '</span></div></div>').join('') + '<button class="pill ink lg" id="r-done" style="margin-top:8px">Done</button></div>';
    document.body.appendChild(wrap); wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
    $('#r-done', wrap).onclick = () => wrap.remove();
    $$('input[type=range]', wrap).forEach(r => r.oninput = () => { vec[+r.dataset.i] = r.value / 100; clearTimeout(t); t = setTimeout(() => { S.final = M.makeDirection(vec, d.seed, { ...S.ctx, used: new Set(), count: 0 }, isB() || isC() ? { final: true } : { name: d.pack.name, final: true }); renderTab(); const h = $('.res .tags'); if (h) h.innerHTML = S.final.tags.map(x => '<span class="tag">' + esc(x) + '</span>').join(''); }, 140); });
  }
  function exploreMore() {
    S.shown.push(S.final); S.readyAt = S.hist.length + 3; S.note = 'explore'; S.tp = innerWidth >= 1180; S.tpUser = false;
    S.cur = nextCard(); S.view = 'swipe'; go('swipe');
  }


  /* ───────── brand & website result ───────── */
  const domainOf = d => d.v.name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com';
  function productLineB(d) {
    const L = M.learn(S.hist), top = L.taste.map((t, i) => [i, Math.abs(t) * L.conf[i]]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i]) => L.taste[i] > 0 ? M.AXES[i].adjHi2 : M.AXES[i].adjLo2);
    return (/^[aeiou]/i.test(top[0] || 'a') ? 'An ' : 'A ') + top.join(', ') + ' brand and website.';
  }
  function tBProto(b) {
    const d = S.final;
    b.innerHTML = '<div class="pto"><nav class="snav"><span class="mono">Views</span>' + ['site', 'scroll', 'brand'].map(s => '<button data-s="' + s + '" class="' + (s === 'site' ? 'on' : '') + '">' + LB[s] + '</button>').join('') + '</nav><div><div class="frame"><div class="chrome"><i></i><i></i><i></i><span>' + esc(domainOf(d)) + '</span></div><div class="fit live" id="pf"></div></div><p class="hint">A working website. Scroll inside the frame, or switch to the brand board to see the logo, colours and type together.</p></div></div>';
    const f = $('#pf', b); fit(f); const ctl = host(f, d, { screen: 'site' }, { interactive: true, onChange: st => $$('.snav button', b).forEach(x => x.classList.toggle('on', x.dataset.s === st.screen)) });
    $$('.snav button', b).forEach(x => x.onclick = () => ctl.go(x.dataset.s)); S.ctl = ctl;
  }
  function tBExp(b) {
    const d = S.final, v = d.v, c = v.copy, P = v.pal, n = esc(v.name);
    const sections = [['Navigation', c.nav.join(' · ') + ' and a primary button'], ['Hero', 'Headline “' + v.head + '” with “' + c.cta[0] + '” and “' + c.cta[1] + '”'], ['Proof', c.stats.map(x => x[0] + ' ' + x[1].toLowerCase()).join(' · ')], ['Why ' + v.name, c.feats.map(x => x[0]).join(' · ')], ['Testimonial', '“' + c.quote[0] + '”'], ['Call to action', '“Ready when you are.” with “' + c.cta[0] + '”'], ['Footer', 'Logo, copyright and links']];
    const fl = [['First visit', ['Land on the hero', 'Read the headline', 'Scan the proof', 'Tap “' + c.cta[0] + '”']], ['Browsing', ['Open ' + c.nav[0], 'Compare ' + c.nav[1], 'Read a testimonial', 'Contact']], ['Returning', ['Open the site', c.nav[3], c.cta[0], 'Done']]];
    const arts = { poster: 'A bold poster built from the mark and two overlapping shapes.', pattern: 'A repeating pattern of the mark in two colours.', arcs: 'Concentric arcs rising from the base, with the mark on top.', collage: 'A four-tile collage of colour blocks, the mark and stripes.' };
    const pats = [['Colour', d.decisions[0][1] + '.'], ['Typography', v.fonts.d + ' for headlines and ' + v.fonts.b + ' for text.'], ['Logo', d.decisions[2][1] + '.'], ['Layout', d.decisions[3][1] + '.'], ['Shape', d.decisions[4][1] + '. Buttons are ' + (v.rb >= 999 ? 'pills' : v.rb === 0 ? 'square' : 'lightly rounded') + '.'], ['Imagery', arts[v.art] + ' Photography, where used: ' + v.photoQ + ', natural light.']];
    b.innerHTML = '<div class="sec"><h3>Brand board</h3><p class="d">The logo, colour and type working together.</p><div class="frame"><div class="fit" id="bb"></div></div></div>' +
      '<div class="sec"><h3>Voice</h3><p class="d">How ' + n + ' sounds on the page.</p><div class="two"><div class="box"><span class="mono">Headline</span><h4 style="font:' + v.fonts.w + ' 2.2rem/1.05 \'' + v.fonts.d + '\',var(--disp);margin:8px 0 12px;letter-spacing:-.02em">' + esc(v.head) + '</h4><p style="color:#41454d">' + esc(c.sub.replace(/\{n\}/g, v.name)) + '</p></div><div class="box"><span class="mono">Tone</span><div class="tags" style="margin-top:12px">' + d.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div><p style="color:#41454d;margin-top:14px">' + esc(d.philosophy) + '</p></div></div></div>' +
      '<div class="sec"><h3>Website structure</h3><p class="d">One page, seven sections.</p><div class="box"><ul class="pats">' + sections.map(x => '<li><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></li>').join('') + '</ul></div></div>' +
      '<div class="sec"><h3>Visitor journeys</h3><div class="box flows">' + fl.map(x => '<div class="fl"><h5>' + esc(x[0]) + '</h5><div class="st">' + x[1].map(s => '<span>' + esc(s) + '</span>').join('<i>→</i>') + '</div></div>').join('') + '</div></div>' +
      '<div class="sec"><h3>Art direction</h3><div class="box"><ul class="pats">' + pats.map(x => '<li><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></li>').join('') + '</ul></div></div>';
    const f = $('#bb', b); fit(f); host(f, d, { screen: 'brand' });
  }
  const tokensCSSB = d => MM.tokensCSS(d.v);
  function tokensJSONB(d) { const v = d.v, P = v.pal, c = x => ({ value: x, type: 'color' }); return JSON.stringify({ global: { color: { background: c(P.bg), surface: c(P.surface), ink: c(P.ink), muted: c(P.muted), line: c(P.line), primary: c(P.primary), accent: c(P.accent), 'on-primary': c(P.onPrimary), 'on-accent': c(P.onAccent) }, borderRadius: { default: { value: String(v.radius), type: 'borderRadius' }, button: { value: String(v.rb), type: 'borderRadius' } }, fontFamilies: { display: { value: v.fonts.d, type: 'fontFamilies' }, body: { value: v.fonts.b, type: 'fontFamilies' } }, fontWeights: { display: { value: String(v.fonts.w), type: 'fontWeights' } } } }, null, 2); }
  function tBSys(b) {
    const d = S.final, v = d.v, P = v.pal;
    const sw = [['Background', P.bg], ['Surface', P.surface], ['Ink', P.ink], ['Muted', P.muted], ['Primary', P.primary], ['Accent', P.accent], ['Line', P.line], ['On primary', P.onPrimary], ['On accent', P.onAccent], ['Mark', P.primary]].slice(0, 10);
    b.innerHTML = '<div class="sec"><h3>Brand kit</h3><p class="d">Everything needed to launch ' + esc(v.name) + ': a working website, the logo as SVG, the icon, and the colours and fonts as CSS.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="pill acc lg" id="k-zip">Download brand kit (.zip)</button><button class="pill lg" id="k-site">Website .html</button><button class="pill lg" id="k-logo">Logo .svg</button></div></div>' +
      '<div class="sec"><h3>Design tokens</h3><div class="sw-row">' + sw.map(x => '<div class="swt"><i style="background:' + x[1] + '"></i><span><b>' + x[0] + '</b>' + x[1].toUpperCase() + '</span></div>').join('') + '</div><div class="two" style="margin-top:20px"><div class="box"><span class="mono">Type</span><table class="tk"><tr><td>Display</td><td style="font-family:\'' + v.fonts.d + '\';font-size:1.1rem">' + v.fonts.d + '</td></tr><tr><td>Body</td><td style="font-family:\'' + v.fonts.b + '\'">' + v.fonts.b + '</td></tr><tr><td>Headline case</td><td>' + ({ upper: 'Uppercase', lower: 'Lowercase', normal: 'Sentence case' })[v.wcase] + '</td></tr></table></div><div class="box"><span class="mono">Shape</span><table class="tk"><tr><td>Corner radius</td><td>' + v.radius + 'px</td></tr><tr><td>Buttons</td><td>' + (v.rb >= 999 ? 'Pill' : v.rb + 'px') + '</td></tr><tr><td>Logo container</td><td>' + v.container + '</td></tr></table></div></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="pill" id="k-css">Copy CSS</button><button class="pill" id="k-dcss">Download tokens.css</button><button class="pill" id="k-json">Download Figma tokens (.json)</button></div></div>' +
      '<div class="sec"><h3>Components</h3><p class="d">A starter set in the brand’s style.</p><div class="kit" id="kit"></div></div>';
    BR.render.mountKit($('#kit', b), d); const nm = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    $('#k-zip', b).onclick = async () => { toast('Building your kit…'); download(await MM.brandKitZip(v), nm + '-brand-kit.zip', 'application/zip'); };
    $('#k-site', b).onclick = () => download(MM.siteHTML(v), nm + '-site.html', 'text/html'); $('#k-logo', b).onclick = async () => download(await MM.logoSVG(v), nm + '-logo.svg', 'image/svg+xml');
    $('#k-css', b).onclick = () => copy(tokensCSSB(d), 'CSS copied'); $('#k-dcss', b).onclick = () => download(tokensCSSB(d), nm + '-tokens.css', 'text/css'); $('#k-json', b).onclick = () => download(tokensJSONB(d), nm + '-figma-tokens.json', 'application/json');
  }
  function specB(d) {
    const v = d.v, P = v.pal, c = v.copy, lr = M.learn(S.hist);
    return '# ' + v.name + ': brand and website\n\n' + productLineB(d) + '\n\nBrief: ' + S.brief.text + '\n\n## Taste profile\n' + M.AXES.map((a, i) => '- ' + a.name + ': ' + (Math.abs(lr.taste[i]) < .1 ? 'neutral' : (lr.taste[i] > 0 ? a.hi : a.lo)) + ' (confidence ' + Math.round(lr.conf[i] * 100) + '%)').join('\n') + '\n\n## Identity\n' + d.decisions.map(x => '- ' + x[0] + ': ' + x[1]).join('\n') + '\n\n## Colour\n' + [['Background', P.bg], ['Surface', P.surface], ['Ink', P.ink], ['Primary', P.primary], ['Accent', P.accent]].map(x => '- ' + x[0] + ': ' + x[1]).join('\n') + '\n\n## Voice\nHeadline: ' + v.head + '\nSub: ' + c.sub.replace(/\{n\}/g, v.name) + '\nButtons: ' + c.cta.join(' / ') + '\n\n## Website\n' + c.nav.join(', ') + '. Hero, proof (' + c.stats.map(x => x[0]).join(', ') + '), three features, testimonial, call to action, footer.\n\n## Tokens\n```css\n' + tokensCSSB(d) + '```\n';
  }
  function openBuildB() {
    const d = S.final, v = d.v, nm = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const m = modal('<div class="mbox" style="max-width:720px"><div class="mhead"><h3>Use ' + esc(v.name) + '</h3><button class="pill" id="m-x">Close</button></div><div class="mbody"><p style="color:#33363d;margin-bottom:6px">The kit is ready to use: open <b>index.html</b> in a browser or upload it to any host, put the logo wherever you need it, and drop the colours and fonts into your tools.</p><div class="pre" id="pp"></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="pill acc lg" id="b-zip">Download brand kit (.zip)</button><button class="pill lg" id="b-site">Website .html</button><button class="pill lg" id="b-logo">Logo .svg</button><button class="pill lg" id="b-md">Brand guide (.md)</button></div></div></div>');
    $('#pp', m).textContent = [nm + '/', '  index.html    a complete, responsive website', '  logo.svg      primary logo', '  mark.svg      icon / avatar / favicon', '  brand.css     colours, fonts and radii as CSS variables', '  README.txt'].join('\n');
    $('#m-x', m).onclick = closeModal; $('#b-zip', m).onclick = async () => { toast('Building your kit…'); download(await MM.brandKitZip(v), nm + '-brand-kit.zip', 'application/zip'); };
    $('#b-site', m).onclick = () => download(MM.siteHTML(v), nm + '-site.html', 'text/html'); $('#b-logo', m).onclick = async () => download(await MM.logoSVG(v), nm + '-logo.svg', 'image/svg+xml'); $('#b-md', m).onclick = () => download(specB(d), nm + '-brand-guide.md', 'text/markdown');
  }
  function openFigmaB() {
    const d = S.final, nm = d.v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const m = modal('<div class="mbox" style="max-width:640px"><div class="mhead"><h3>Export to Figma</h3><button class="pill" id="m-x">Close</button></div><div class="mbody"><p style="color:#33363d;margin-bottom:14px">Download the colours, fonts and radii as a Tokens Studio file, then import them into Figma as variables or styles. The logo is available as SVG, which Figma opens directly.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="pill acc lg" id="f-json">Download Figma tokens (.json)</button><button class="pill lg" id="f-logo">Logo .svg</button></div></div></div>');
    $('#m-x', m).onclick = closeModal; $('#f-json', m).onclick = () => download(tokensJSONB(d), nm + '-figma-tokens.json', 'application/json'); $('#f-logo', m).onclick = async () => download(await MM.logoSVG(d.v), nm + '-logo.svg', 'image/svg+xml');
  }

  /* ───────── invitation / greeting card result ───────── */
  const slugOf = x => String(x || 'card').toLowerCase().replace(/[^a-z0-9֐-׿]+/g, '-').replace(/^-|-$/g, '') || 'card';
  function productLineC(d) {
    const L = M.learn(S.hist), top = L.taste.map((t, i) => [i, Math.abs(t) * L.conf[i]]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i]) => L.taste[i] > 0 ? M.AXES[i].adjHi2 : M.AXES[i].adjLo2);
    return (/^[aeiou]/i.test(top[0] || 'a') ? 'An ' : 'A ') + top.join(', ') + (d.cctx.invite ? ' invitation.' : ' greeting card.');
  }
  async function dlPng(side, fmt) { toast('Preparing your image…'); const d = S.final; download(await CD.png(d, side, fmt, 2), slugOf(d.fields.name) + '-' + fmt + '.png', 'image/png'); }
  function goShare() { S.rtab = 'System'; $$('.rtabs button').forEach(y => y.classList.toggle('on', y.dataset.t === 'System')); renderTab(); scrollTo({ top: 0, behavior: 'smooth' }); }
  function whenText(iso, heb) { const x = new Date(iso); if (isNaN(x)) return ''; return x.toLocaleString(heb ? 'he-IL' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(' at ', ' · ').replace(' בשעה ', ' · '); }
  function tCEdit(b) {
    const d = S.final, F = d.fields, C = d.cctx, heb = C.heb, st = { side: 'front', fmt: 'portrait' };
    const f = (id, label, val, o) => '<label class="field"><span class="lab">' + label + '</span>' + (o && o.ta ? '<textarea id="' + id + '" dir="auto" rows="3" maxlength="260" class="tbox">' + esc(val) + '</textarea>' : '<input id="' + id + '" dir="auto" maxlength="90" value="' + esc(val) + '" ' + ((o && o.type) ? 'type="' + o.type + '"' : '') + '>') + '</label>';
    b.innerHTML = '<div class="cedit"><div class="cpv"><div class="cstage" id="cs"></div><div class="segs"><div class="seg2" id="cfmt">' + [['portrait', 'Portrait'], ['square', 'Square'], ['story', 'Story']].map(x => '<button type="button" data-f="' + x[0] + '" class="' + (x[0] === 'portrait' ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div><div class="seg2" id="cside"><button type="button" data-s="front" class="on">Front</button><button type="button" data-s="back">' + (C.invite ? 'Details' : 'Inside') + '</button></div></div></div>' +
      '<form class="cform" id="cf" onsubmit="return false"><h3>Make it yours</h3><p class="d" style="margin:0 0 6px">Edit the words and the card updates as you type.</p>' +
      f('cf-head', 'Headline', F.head != null ? F.head : d.head) + f('cf-name', 'Name(s)', F.name) + f('cf-line', 'Line under the name', F.line != null ? F.line : d.line) +
      (C.invite ? f('cf-when', 'Date and time', F.when) + f('cf-iso', 'Pick a date (adds a calendar file)', F.iso || '', { type: 'datetime-local' }) + f('cf-where', 'Place', F.where) + f('cf-note', 'A note for guests', F.note, { ta: 1 })
        : f('cf-msg', 'Message inside', F.msg != null ? F.msg : d.msg, { ta: 1 }) + f('cf-sign', 'Sign-off', F.sign || '') + f('cf-from', 'From', F.from || '')) +
      '<div class="crow2"><button type="button" class="pill acc lg" id="cd-png">Download PNG</button><button type="button" class="pill lg" id="cd-svg">SVG</button></div></form></div>';
    const draw = () => { const cs = $('#cs', b); cs.innerHTML = CD.svg(d, st.side, st.fmt); };
    CD.render.ensureFonts(d); draw();
    const map = { 'cf-head': 'head', 'cf-name': 'name', 'cf-line': 'line', 'cf-when': 'when', 'cf-where': 'where', 'cf-note': 'note', 'cf-msg': 'msg', 'cf-sign': 'sign', 'cf-from': 'from' };
    Object.keys(map).forEach(id => { const el = $('#' + id, b); if (el) el.oninput = () => { F[map[id]] = el.value; draw(); }; });
    const iso = $('#cf-iso', b); if (iso) iso.onchange = () => { F.iso = iso.value; const t = whenText(iso.value, heb); if (t) { F.when = t; $('#cf-when', b).value = t; } draw(); };
    $$('#cfmt button', b).forEach(x => x.onclick = () => { st.fmt = x.dataset.f; $$('#cfmt button', b).forEach(y => y.classList.toggle('on', y === x)); draw(); });
    $$('#cside button', b).forEach(x => x.onclick = () => { st.side = x.dataset.s; $$('#cside button', b).forEach(y => y.classList.toggle('on', y === x)); draw(); });
    $('#cd-png', b).onclick = () => dlPng(st.side, st.fmt);
    $('#cd-svg', b).onclick = () => download(CD.svg(d, st.side, st.fmt, { fonts: true, size: true }), slugOf(F.name) + '-' + st.fmt + '.svg', 'image/svg+xml');
  }
  function tCStyle(b) {
    const d = S.final, des = d.design, P = des.pal;
    const sw = [['Background', P.bg], ['Soft', P.soft], ['Primary', P.primary], ['Accent', P.accent], ['Ink', P.ink]];
    b.innerHTML = '<div class="sec"><h3>The look</h3><p class="d">' + esc(d.explain) + '</p><div class="sw-row">' + sw.map(x => '<div class="swt"><i style="background:' + x[1] + '"></i><span><b>' + x[0] + '</b>' + x[1].toUpperCase() + '</span></div>').join('') + '</div></div>' +
      '<div class="sec"><h3>Lettering</h3><div class="two"><div class="box"><span class="mono">Headline</span><div style="font:' + (CD.FONT[des.fonts.head].h || 400) + ' 2.4rem/1.1 \'' + des.fonts.head + '\',serif;margin-top:10px">' + esc(d.fields.head != null ? d.fields.head : d.head) + '</div><p style="color:#4b453d;margin-top:8px;font-size:.9rem">' + esc(des.fonts.head) + '</p></div><div class="box"><span class="mono">Name</span><div style="font:' + (CD.FONT[des.fonts.name].h || 400) + ' 2.4rem/1.1 \'' + des.fonts.name + '\',serif;margin-top:10px">' + esc(d.fields.name) + '</div><p style="color:#4b453d;margin-top:8px;font-size:.9rem">' + esc(des.fonts.name) + ' · text in ' + esc(des.fonts.body) + '</p></div></div></div>' +
      '<div class="sec"><h3>Design decisions</h3><div class="box"><ul class="pats">' + d.decisions.map(x => '<li><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></li>').join('') + '</ul></div><div style="margin-top:16px"><button type="button" class="pill lg" id="restyle">Try another take on this style</button></div></div>';
    $('#restyle', b).onclick = () => { const o = S.final; S.reroll = (S.reroll || 0) + 1; S.final = M.makeDirection(o.vec, o.seed + S.reroll * 101, { ...S.ctx, used: new Set(), count: 0 }, { final: true }); renderTab(); toast('Here’s another take'); };
  }
  function tCShare(b) {
    const d = S.final, F = d.fields, C = d.cctx, nm = slugOf(F.name), ics = CD.icsFor(d);
    const text = [F.head != null ? F.head : d.head, F.name + ' ' + (F.line != null ? F.line : d.line), C.invite ? F.when : '', C.invite ? F.where : '', C.invite ? F.note : (F.msg != null ? F.msg : d.msg)].filter(Boolean).join('\n');
    b.innerHTML = '<div class="sec"><h3>Send it</h3><p class="d">Download an image to share on any chat, print at home or at a print shop, or send as a page.</p><div class="shares">' +
      [['Portrait image', 'PNG · 5×7, ready to print', 'png-p'], ['Square image', 'PNG · for posts', 'png-s'], ['Story image', 'PNG · 9:16 for stories and status', 'png-t'], ['Vector file', 'SVG · opens in Figma and Illustrator', 'svg']].map(x => '<button type="button" class="shr" data-a="' + x[2] + '"><b>' + x[0] + '</b><span>' + x[1] + '</span></button>').join('') +
      (C.invite ? '<button type="button" class="shr" data-a="page"><b>Invitation page</b><span>One web page with the card and details</span></button>' : '') +
      (C.invite ? '<button type="button" class="shr' + (ics ? '' : ' off') + '" data-a="ics"><b>Calendar file</b><span>' + (ics ? 'ICS · adds the event to a calendar' : 'Pick a date in the Card tab first') + '</span></button>' : '') +
      '<a class="shr" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '"><b>Send on WhatsApp</b><span>Opens WhatsApp with the words ready</span></a><button type="button" class="shr" data-a="copy"><b>Copy the words</b><span>Headline, details and message as text</span></button></div></div>';
    $$('.shr[data-a]', b).forEach(x => x.onclick = async () => {
      const a = x.dataset.a;
      if (a === 'png-p') dlPng('front', 'portrait'); else if (a === 'png-s') dlPng('front', 'square'); else if (a === 'png-t') dlPng('front', 'story');
      else if (a === 'svg') download(CD.svg(d, 'front', 'portrait', { fonts: true, size: true }), nm + '.svg', 'image/svg+xml');
      else if (a === 'page') download(CD.invitePage(d), nm + '-invitation.html', 'text/html');
      else if (a === 'ics') { if (ics) download(ics, nm + '.ics', 'text/calendar'); else toast('Pick a date in the Card tab first'); }
      else if (a === 'copy') copy(text, 'Words copied');
    });
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
