/* Product renderer: (direction, state) -> a complete 1280x800 product UI.
   Every layout decision comes from the direction's flags, not just its colours. */
(function (g) {
  'use strict';
  const D = g.DOMAIN, M = g.MODEL;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = {
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>', flow: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.5 6h4a3 3 0 0 1 3 3v.5M8.5 18h4a3 3 0 0 0 3-3v-.5"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>', chart: '<path d="M4 20V4M4 20h16"/><path d="m8 15 4-5 3 3 5-7"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>', chev: '<path d="m9 6 6 6-6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    spark: '<path d="M12 3c.8 5 3.2 7.6 8 9-4.8 1.4-7.2 4-8 9-.8-5-3.2-7.6-8-9 4.8-1.4 7.2-4 8-9z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-6 8-6s7 1.5 8 6"/>',
    cols: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>', download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>'
  };
  const ic = (n, s) => '<svg class="ic" width="' + (s || 16) + '" height="' + (s || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>';
  const ICN = { home: 'home', workflow: 'flow', table: 'table', insights: 'chart', approvals: 'check', settings: 'gear' };
  const SCREENS = ['home', 'workflow', 'table', 'insights', 'approvals', 'settings'];
  const fm = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v >= 100 ? Math.round(v) + '' : v.toFixed(v < 10 ? 1 : 0);

  /* ───────── charts ───────── */
  function spark(a, w, h) {
    w = w || 80; h = h || 22; const mn = Math.min(...a), mx = Math.max(...a), s = mx - mn || 1;
    const pts = a.map((v, i) => [i * w / (a.length - 1), h - 2 - (v - mn) / s * (h - 4)]);
    const last = pts[pts.length - 1];
    return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><path d="M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + '" fill="none" stroke="var(--acc)" stroke-width="1.5" stroke-linejoin="round"/><circle cx="' + last[0] + '" cy="' + last[1].toFixed(1) + '" r="2" fill="var(--acc)"/></svg>';
  }
  function line(ser, o) {
    o = o || {}; const W = o.w || 640, H = o.h || 250, L = 44, B = 26, T = 12, R = 54;
    const all = ser.flat(), mn = Math.min(...all), mx = Math.max(...all), pad = (mx - mn) * .12 || 1, lo = mn - pad, hi = mx + pad;
    const X = i => L + i * (W - L - R) / (ser[0].length - 1), Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="width:100%;height:' + (o.fill ? '100%' : H + 'px') + '">';
    for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + fm(v) + '</text>'; }
    const labs = o.labels || ser[0].map((_, i) => i % 2 ? '' : 'W' + (i + 1));
    labs.forEach((t, i) => { if (t) s += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle" class="ax">' + t + '</text>'; });
    ser.slice().reverse().forEach((a, ri) => {
      const k = ser.length - 1 - ri, d = a.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
      if (k === 0) s += '<path d="' + d + 'L' + X(a.length - 1) + ' ' + (H - B) + 'L' + X(0) + ' ' + (H - B) + 'Z" fill="var(--acc)" opacity=".08"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + (k === 0 ? 'var(--acc)' : 'var(--mut)') + '" stroke-width="' + (k === 0 ? 2.2 : 1.5) + '"' + (k ? ' stroke-dasharray="4 4"' : '') + ' vector-effect="non-scaling-stroke" stroke-linejoin="round"/>';
    });
    const e = ser[0].length - 1;
    s += '<circle cx="' + X(e) + '" cy="' + Y(ser[0][e]) + '" r="4" fill="var(--acc)"/><text x="' + (X(e) + 9) + '" y="' + (Y(ser[0][e]) + 4) + '" class="ax strong">' + fm(ser[0][e]) + '</text>';
    return s + '</svg>';
  }
  function hbars(items, o) {
    o = o || {}; const mx = Math.max(...items.map(i => i.v));
    return '<div class="hb">' + items.map((i, k) => '<div class="hb-r"><span class="hb-l">' + esc(i.l) + '</span><span class="hb-t"><i style="width:' + (i.v / mx * 100).toFixed(0) + '%;' + (k === 0 && !o.flat ? '' : 'opacity:.55') + '"></i></span><b class="hb-v">' + (o.fmt ? o.fmt(i.v) : i.v) + '</b></div>').join('') + '</div>';
  }
  function waterfall(items, o) {
    o = o || {}; const W = 420, H = o.h || 230, L = 8, B = 30, T = 22;
    let run = 0; const bars = items.map((b, i) => { if (b.t === 'start') { run = b.v; return { ...b, y0: 0, y1: b.v, k: 'tot' }; } if (b.t === 'end') return { ...b, y0: 0, y1: b.v, k: 'tot' }; const y0 = run; run += b.v; return { ...b, y0, y1: run, k: b.v >= 0 ? 'pos' : 'neg' }; });
    const mx = Math.max(...bars.map(b => Math.max(b.y0, b.y1))), mn = Math.min(90, ...bars.map(b => Math.min(b.y0, b.y1))) - 4, bw = (W - L * 2) / bars.length;
    const Y = v => T + (1 - (v - mn) / (mx - mn)) * (H - T - B);
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:' + H + 'px">';
    bars.forEach((b, i) => {
      const x = L + i * bw + bw * .14, w = bw * .72, ya = Y(Math.max(b.y0, b.y1)), yb = Y(Math.min(b.y0, b.y1));
      s += '<rect x="' + x + '" y="' + ya + '" width="' + w + '" height="' + Math.max(2, yb - ya) + '" rx="2" fill="' + (b.k === 'tot' ? 'var(--ink)' : b.k === 'pos' ? 'var(--pos)' : 'var(--neg)') + '" opacity="' + (b.k === 'tot' ? .85 : .9) + '"/>';
      s += '<text x="' + (x + w / 2) + '" y="' + (ya - 6) + '" text-anchor="middle" class="ax strong">' + (b.k === 'tot' ? b.v : (b.v > 0 ? '+' : '') + b.v) + '</text><text x="' + (x + w / 2) + '" y="' + (H - 10) + '" text-anchor="middle" class="ax">' + esc(b.l.length > 9 ? b.l.slice(0, 8) + '…' : b.l) + '</text>';
    });
    return s + '</svg>';
  }

  /* ───────── cached data per direction ───────── */
  function data(d) {
    if (d._d) return d._d;
    const p = d.pack, seed = d.seed % 997 + 3, rows = D.rows(p, seed, 24);
    return d._d = { rows, charts: D.charts(p, seed), dets: {}, seed };
  }
  const detOf = (d, i) => { const X = data(d); return X.dets[i] || (X.dets[i] = D.detail(d.pack, X.rows[i], X.seed)); };
  const statCls = s => /risk|over|delay|incident|degrad|anomal|high|blocked|suspend|stale|review due|overdue|pending/i.test(s) ? 'warn' : /won|healthy|track|received|active|low|complete/i.test(s) ? 'ok' : 'neu';
  const chip = s => '<span class="chip ' + statCls(s) + '">' + esc(s) + '</span>';
  const avatar = (n, sz) => '<span class="av" style="' + (sz ? 'width:' + sz + 'px;height:' + sz + 'px;' : '') + 'background:hsl(' + (n.charCodeAt(0) * 37 % 360) + ' 40% 50%)">' + esc(n.split(' ').map(x => x[0]).join('').slice(0, 2)) + '</span>';
  const btn = (t, o) => '<button class="btn ' + ((o && o.k) || '') + '" ' + ((o && o.a) || '') + '>' + (o && o.i ? ic(o.i, 14) : '') + t + '</button>';

  /* ───────── tables ───────── */
  const PRIO = ['name', 'm1', 'pct', 'status', 'm2', 'owner', 'm3', 'trend'];
  function cell(d, c, r) {
    const [k, , f] = c;
    if (k === 'name') return '<td class="nm"><b>' + esc(r.name) + '</b><span class="mut mono">' + r.id + '</span></td>';
    if (k === 'owner') return '<td><span class="own">' + avatar(r.owner, 18) + esc(r.owner) + '</span></td>';
    if (k === 'status') return '<td>' + chip(r.status) + '</td>';
    if (k === 'trend') return '<td class="sp">' + spark(r.trend, 72, 20) + '</td>';
    const t = D.fmt(d.pack, f, r, k);
    if (f === 'var') return '<td class="num ' + (r.pct > 3 ? 'neg' : r.pct < -3 ? 'pos' : '') + '">' + t + '</td>';
    if (f === 'risk' || f === 'err') return '<td class="num">' + t + '</td>';
    return '<td class="num">' + t + '</td>';
  }
  function tbl(d, st, n, o) {
    o = o || {}; const f = d.flags, p = d.pack, X = data(d);
    const keep = new Set(PRIO.slice(0, o.cols || f.cols)), cols = p.cols.filter(c => keep.has(c[0]));
    const rows = X.rows.slice(0, n);
    return '<div class="tw"><table class="tbl"><thead><tr>' + (f.pro ? '<th class="ck"><i class="cb"></i></th>' : '') + cols.map(c => '<th class="' + (/num|cur|var|pct|ms|err|risk/.test(c[2] || '') ? 'num' : '') + '">' + esc(c[1]) + (c[0] === 'm1' ? ' <span class="mut">↓</span>' : '') + '</th>').join('') + '<th class="end"></th></tr></thead><tbody>' +
      rows.map((r, i) => '<tr data-row="' + i + '" class="' + (st.row === i ? 'sel' : '') + '">' + (f.pro ? '<td class="ck"><i class="cb ' + (i % 5 === 1 ? 'on' : '') + '"></i></td>' : '') + cols.map(c => cell(d, c, r)).join('') + '<td class="end mut">' + ic('chev', 14) + '</td></tr>').join('') + '</tbody></table></div>';
  }

  /* ───────── shell ───────── */
  const CTX = { home: ['Overview', 'Needs attention', 'Recent activity'], workflow: null, table: ['All', 'At risk', 'Mine', 'Recently changed', 'Saved views'], insights: ['Trend', 'Variance bridge', 'Mix', 'Saved analyses'], approvals: ['Pending', 'Auto-handled', 'History'], settings: ['General', 'Roles', 'Integrations', 'Policies'] };
  function shell(d, st, page) {
    const f = d.flags, p = d.pack, L = p.labels, cur = st.screen;
    const brand = '<div class="brand"><i class="mk"></i><b>' + esc(p.name) + '</b></div>';
    const user = '<span class="usr">' + avatar('Maya Chen', 26) + '</span>';
    let nav = '';
    if (f.navModel === 'sidebar') {
      const groups = []; SCREENS.forEach(s => { const g = p.groups[s]; let G = groups.find(x => x.g === g); if (!G) groups.push(G = { g, items: [] }); G.items.push(s); });
      nav = '<div class="shell sb"><aside class="side">' + brand + '<div class="sq">' + ic('search', 14) + '<span>Search</span><kbd>⌘K</kbd></div>' +
        groups.map(G => '<div class="ng">' + esc(G.g) + '</div>' + G.items.map(s => '<a data-go="' + s + '" class="ni ' + (cur === s ? 'on' : '') + '">' + ic(ICN[s], 16) + '<span>' + esc(L[s]) + '</span>' + (s === 'approvals' ? '<em>' + approvalsOpen(d, st) + '</em>' : '') + '</a>').join('')).join('') +
        '<div class="sfoot">' + avatar('Maya Chen', 26) + '<span><b>Maya Chen</b><small>Admin</small></span></div></aside><div class="col">' + page + '</div></div>';
    } else if (f.navModel === 'rail') {
      const ctx = cur === 'workflow' ? p.workflow.steps.map(s => s[0]) : CTX[cur];
      nav = '<div class="shell rl"><nav class="rail"><i class="mk"></i>' + SCREENS.map(s => '<a data-go="' + s + '" class="ri ' + (cur === s ? 'on' : '') + '" title="' + esc(L[s]) + '">' + ic(ICN[s], 18) + '</a>').join('') + '<span class="sp1"></span>' + avatar('Maya Chen', 26) + '</nav>' +
        '<aside class="ctx"><div class="ctx-t">' + esc(L[cur]) + '</div>' + ctx.map((c, i) => '<a class="ci ' + (i === (cur === 'workflow' ? st.step : 0) ? 'on' : '') + '" ' + (cur === 'workflow' ? 'data-step="' + i + '"' : '') + '>' + esc(c) + (cur === 'table' && i < 3 ? '<em>' + [24, 6, 5][i] + '</em>' : '') + '</a>').join('') + '</aside><div class="col">' + page + '</div></div>';
    } else if (f.navModel === 'top') {
      nav = '<div class="shell tp"><header class="tb">' + brand + '<nav class="tabs">' + SCREENS.map(s => '<a data-go="' + s + '" class="ti ' + (cur === s ? 'on' : '') + '">' + esc(L[s]) + '</a>').join('') + '</nav><span class="sp1"></span><div class="sq">' + ic('search', 14) + '<span>Search ' + esc(p.e[1].toLowerCase()) + '</span><kbd>/</kbd></div>' + ic('bell', 18) + user + '</header><div class="col">' + page + '</div></div>';
    } else {
      nav = '<div class="shell cm"><header class="cbar">' + brand + '<a class="cmdbar" data-cmd="1">' + ic('search', 15) + '<span>Jump to anything, or ask ' + esc(p.name) + '…</span><kbd>⌘K</kbd></a>' + user + '</header><div class="col">' + page + '</div>' +
        (st.cmd ? '<div class="cmdp"><div class="cmdp-in"><div class="cmdp-q">' + ic('search', 15) + '<span>Go to…</span></div>' + SCREENS.map(s => '<a data-go="' + s + '" class="cmi">' + ic(ICN[s], 15) + esc(L[s]) + '<em>' + esc(p.groups[s]) + '</em></a>').join('') + '</div></div>' : '') + '</div>';
    }
    return nav;
  }
  function pageHead(d, title, sub, acts, crumb) {
    return '<div class="ph"><div>' + (crumb ? '<div class="crumb">' + crumb + '</div>' : '') + '<h1>' + title + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div><div class="acts">' + (acts || '') + '</div></div>';
  }
  const nextLinks = (d, st, items) => d.flags.navModel === 'command' ? '<div class="nxt"><span class="mut">Next</span>' + items.map(([s, t]) => '<a data-go="' + s + '">' + esc(t) + ' ' + ic('arrow', 13) + '</a>').join('') + '</div>' : '';
  const approvalsOpen = (d, st) => d.pack.approvals.filter((a, i) => !(st.appr || {})[i]).length;

  /* ───────── screens ───────── */
  function kpis(d, st, o) {
    const f = d.flags, p = d.pack; o = o || {};
    return '<div class="kpis ' + (o.stack ? 'stack' : '') + '">' + p.kpis.slice(0, o.n || 4).map((k, i) => '<div class="kpi"><span class="lab">' + esc(k[0]) + '</span><b class="val">' + esc(k[1]) + '</b><span class="dl ' + (k[3] ? 'good' : 'bad') + '">' + esc(k[2]) + '</span>' + (f.dense && !o.stack ? '<span class="ks">' + spark(D.series(d.seed + i, 10, 50, i % 2 ? -1 : 2, 8), 70, 20) + '</span>' : '') + '</div>').join('') + '</div>';
  }
  function alerts(d, st, n) {
    const p = d.pack, X = data(d), bad = X.rows.filter(r => statCls(r.status) === 'warn').slice(0, n);
    return '<div class="list">' + bad.map(r => '<a class="li" data-row="' + r.i + '" data-go="table"><i class="dot ' + statCls(r.status) + '"></i><span><b>' + esc(r.name) + '</b><small>' + esc(r.status) + ' · ' + esc(p.pctLabel) + ' ' + D.fmt(p, p.cols.find(c => c[0] === 'pct')[2], r, 'pct') + '</small></span>' + ic('chev', 14) + '</a>').join('') + '</div>';
  }
  function aiBanner(d) { return '<div class="ai"><span class="aib">' + ic('spark', 15) + '</span><div><b>' + esc(d.pack.ai[0]) + '</b><small>Based on this week\'s data</small></div>' + btn('Review', { k: 'pri', a: 'data-go="approvals"' }) + '</div>'; }

  function home(d, st) {
    const f = d.flags, p = d.pack, X = data(d), L = p.labels;
    const trend = '<div class="card"><div class="ch"><b>' + esc(p.trendT) + '</b><span class="seg"><i class="on">Quarter</i><i>Year</i></span></div>' + line(X.charts.trend, { w: 700, h: f.dense ? 250 : 290, labels: Array.from({ length: 14 }, (_, i) => i % 3 ? '' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i / 3 | 0] || '') }) + '</div>';
    const attn = '<div class="card"><div class="ch"><b>' + (f.ai ? 'Handled for you' : 'Needs attention') + '</b><span class="mut">' + (f.ai ? '41 today' : '4') + '</span></div>' + (f.ai ? '<div class="auto"><b>41</b><span>routine items resolved within policy</span></div>' : '') + alerts(d, st, f.ai ? 2 : 4) + '</div>';
    const mini = '<div class="card"><div class="ch"><b>Largest changes</b>' + btn('View all', { a: 'data-go="table"' }) + '</div>' + tbl(d, st, f.dense ? 6 : 4, { cols: 5 }) + '</div>';
    const groups = '<div class="card"><div class="ch"><b>By ' + esc(p.group.length ? 'group' : 'area') + '</b></div>' + hbars(X.charts.groups.slice(0, f.dense ? 6 : 4), { fmt: v => v }) + '</div>';
    const step = Math.min(2, p.workflow.steps.length - 1), cyc = p.workflow;
    const hero = '<div class="card hero"><div class="ch"><span class="eyebrow">' + esc(cyc.name) + '</span><span class="mut">Due Friday</span></div><h2>Step ' + (step + 1) + ' of 5: ' + esc(cyc.steps[step][0]) + '</h2><p class="sub">' + esc(cyc.steps[step][1]) + '. 6 of 9 owners are done.</p><div class="steps">' + cyc.steps.map((s, i) => '<i class="' + (i < step ? 'done' : i === step ? 'cur' : '') + '"></i>').join('') + '</div><div class="acts">' + btn('Continue', { k: 'pri', i: 'arrow', a: 'data-go="workflow"' }) + btn('See who is waiting') + '</div></div>';
    const next = '<div class="card"><div class="ch"><b>Next best actions</b></div><div class="list">' + [['Review ' + X.rows[2].name, 'table'], ['Approve ' + p.approvals[0][0].toLowerCase(), 'approvals'], ['Confirm ' + p.drivers[0][0].toLowerCase(), 'workflow']].map(a => '<a class="li" data-go="' + a[1] + '"><i class="dot neu"></i><span><b>' + esc(a[0]) + '</b></span>' + ic('arrow', 14) + '</a>').join('') + '</div></div>';
    const greet = f.airy ? '<div class="greet"><span class="mut">Good morning, Maya</span><h2>' + (f.home === 'flow' ? 'Here is what is next.' : 'Here is where things stand.') + '</h2></div>' : '';
    let body;
    if (f.home === 'chart') body = (f.ai ? aiBanner(d) : '') + kpis(d, st) + '<div class="g12"><div class="s8">' + trend + '</div><div class="s4">' + attn + '</div></div>' + (f.dense ? '<div class="g12"><div class="s8">' + mini + '</div><div class="s4">' + groups + '</div></div>' : '');
    else if (f.home === 'flow') body = greet + '<div class="g12"><div class="s8">' + hero + (f.dense ? mini : '') + '</div><div class="s4">' + next + kpis(d, st, { stack: true, n: 3 }) + '</div></div>';
    else body = (f.ai ? aiBanner(d) : '') + kpis(d, st) + '<div class="g12"><div class="s8">' + mini.replace('Largest changes', 'Largest changes this cycle').replace(f.dense ? 6 : 4, 8) + '</div><div class="s4">' + (f.dense ? attn + groups : attn) + '</div></div>';
    return { head: pageHead(d, f.airy ? 'Welcome back' : esc(L.home), f.airy ? '' : esc(p.kind) + ' · FY26', f.dense ? btn('Export', { i: 'download' }) + btn('New ' + esc(p.e[0]), { k: 'pri', i: 'plus' }) : btn('New ' + esc(p.e[0]), { k: 'pri', i: 'plus' })), body: body + nextLinks(d, st, [['table', L.table], ['workflow', L.workflow], ['insights', L.insights]]) };
  }

  function tableScreen(d, st, inDrawer) {
    const f = d.flags, p = d.pack, L = p.labels, X = data(d);
    const n = Math.max(6, Math.floor((f.navModel === 'top' || f.navModel === 'command' ? 470 : 500) / f.row));
    const tools = f.pro ?
      '<div class="tools"><div class="sq wide">' + ic('search', 14) + '<span>Filter ' + esc(p.e[1].toLowerCase()) + '</span></div><span class="fc">Status <b>is any</b> ×</span><span class="fc">' + esc(p.people) + ' <b>is anyone</b> ×</span>' + btn('Add filter', { i: 'filter' }) + '<span class="sp1"></span>' + (f.cfg ? btn('Columns', { i: 'cols' }) : '') + btn('Group by') + btn('Saved views') + '</div>' :
      '<div class="tools soft"><div class="sq big">' + ic('search', 16) + '<span>Search ' + esc(p.e[1].toLowerCase()) + '</span></div><span class="seg"><i class="on">All</i><i>At risk</i><i>Mine</i></span></div>';
    const foot = '<div class="tfoot"><span>Showing ' + Math.min(n, 24) + ' of 142</span>' + (f.pro ? '<span class="mut mono">J / K to move · Enter to open · ⌘E to export · 3 selected</span>' : '<span class="mut">Select one to see the details</span>') + '</div>';
    const body = tools + tbl(d, st, Math.min(n, 24)) + foot;
    return { head: pageHead(d, esc(L.table), esc(p.e[1]) + ' across the organisation', btn('Export', { i: 'download' }) + btn('New ' + esc(p.e[0]), { k: 'pri', i: 'plus' }), f.navModel === 'command' ? '<a data-go="home">' + esc(L.home) + '</a> ' + ic('chev', 11) + ' ' + esc(L.table) : ''), body: '<div class="card flush">' + body + '</div>' + nextLinks(d, st, [['insights', L.insights], ['approvals', L.approvals]]) };
  }

  function detailBody(d, st) {
    const f = d.flags, p = d.pack, X = data(d), i = st.row, r = X.rows[i], det = detOf(d, i), tab = st.tab || 'Overview';
    const tabs = '<div class="dtabs">' + ['Overview', 'Breakdown', 'Activity'].map(t => '<a data-tab="' + t + '" class="' + (t === tab ? 'on' : '') + '">' + t + '</a>').join('') + '</div>';
    let c;
    if (tab === 'Overview') {
      c = '<div class="facts">' + det.facts.map(x => '<div><span class="mut">' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>').join('') + '</div>' +
        (f.ai ? '<div class="ai small"><span class="aib">' + ic('spark', 14) + '</span><div><b>Why is this drifting?</b><small>' + esc(p.pctLabel) + ' has drifted from ' + esc(p.series[1].toLowerCase()) + ' since week 6, mostly from two recurring items. One suggested change would bring it back.</small></div>' + btn('Apply', { k: 'pri' }) + '</div>'
          : f.manual ? '<div class="adj"><b>Adjust</b><div class="adjr"><span>' + esc(p.cols[3][1]) + '</span><span class="inp">' + D.fmt(p, p.cols[3][2], r, 'm2') + '</span><span class="rng"><i style="left:58%"></i></span></div>' + btn('Save changes', { k: 'pri' }) + '</div>' : '') +
        '<div class="card"><div class="ch"><b>' + esc(p.series[0]) + ' vs ' + esc(p.series[1].toLowerCase()) + '</b></div>' + line([det.a, det.b], { w: 560, h: 190, labels: det.a.map((_, k) => k % 3 ? '' : 'W' + (k + 1)) }) + '</div>';
    } else if (tab === 'Breakdown') {
      c = '<div class="card flush"><table class="tbl"><thead><tr><th>Line</th><th class="num">' + esc(p.series[1]) + '</th><th class="num">' + esc(p.series[0]) + '</th><th class="num">Diff</th></tr></thead><tbody>' + det.lines.map(l => '<tr><td>' + esc(l.l) + '</td><td class="num">' + D.money(p, l.a) + '</td><td class="num">' + D.money(p, l.b) + '</td><td class="num ' + (l.b > l.a ? 'neg' : 'pos') + '">' + ((l.b - l.a) / l.a * 100).toFixed(1) + '%</td></tr>').join('') + '</tbody></table></div>';
    } else {
      c = '<div class="feed">' + det.activity.map(a => '<div class="fe">' + avatar(a.who, 24) + '<span><b>' + esc(a.who) + '</b> ' + esc(a.what) + '<small>' + a.when + '</small></span></div>').join('') + '</div>';
    }
    return { title: r.name, r, tabs, c };
  }
  function detailScreen(d, st) {
    const f = d.flags, p = d.pack, L = p.labels, b = detailBody(d, st);
    const crumb = '<a data-close="1">' + esc(L.table) + '</a> ' + ic('chev', 11) + ' ' + esc(b.r.id);
    return { head: pageHead(d, esc(b.title) + ' ' + chip(b.r.status), esc(p.people) + ': ' + esc(b.r.owner), btn('Share') + btn('Edit', { k: 'pri' }), crumb), body: '<div class="dgrid"><div>' + b.tabs + b.c + '</div><aside class="card"><div class="ch"><b>Recent activity</b></div><div class="feed">' + detOf(d, st.row).activity.map(a => '<div class="fe">' + avatar(a.who, 22) + '<span><b>' + esc(a.who.split(' ')[0]) + '</b> ' + esc(a.what) + '<small>' + a.when + '</small></span></div>').join('') + '</div></aside></div>' };
  }

  const STEPT = { inputs: 0, build: 1, review: 2, approve: 3, publish: 4 };
  function stepBody(d, st, i) {
    const f = d.flags, p = d.pack, X = data(d), type = D.STEPS[i];
    if (type === 'inputs') return '<div class="card"><div class="ch"><b>' + esc(p.inputsT) + '</b>' + (f.ai ? '<span class="chip ai-c">' + ic('spark', 11) + ' Suggested from last cycle</span>' : '') + '</div><div class="drv">' + p.drivers.map((x, k) => '<div class="dr"><span>' + esc(x[0]) + '</span><span class="inp">' + esc(x[1]) + (x[2] ? ' ' + esc(x[2]) : '') + '</span>' + (typeof x[1] === 'number' ? '<span class="rng"><i style="left:' + (30 + k * 15) + '%"></i></span>' : '<span></span>') + '<small class="mut">' + (f.manual ? 'Last cycle: ' + (typeof x[1] === 'number' ? Math.round(x[1] * .9) : x[1]) : 'Typical') + '</small></div>').join('') + '</div></div>';
    if (type === 'build') {
      const per = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
      return '<div class="card flush">' + (f.pro ? '<div class="fx"><span class="mono mut">fx</span><span class="mono">=prev_month × (1 + driver_growth)</span></div>' : '') + '<table class="tbl grid"><thead><tr><th>' + esc(p.e[1]) + '</th>' + per.map(m => '<th class="num">' + m + '</th>').join('') + '<th class="num">Total</th></tr></thead><tbody>' + p.group.map((g2, k) => { const v = per.map((_, j) => 20 + ((k * 7 + j * 5) % 23) + j * 2); return '<tr><td><b>' + esc(g2) + '</b></td>' + v.map((x, j) => '<td class="num ' + (k === 1 && j === 3 ? 'edit' : '') + '">' + x + '</td>').join('') + '<td class="num"><b>' + v.reduce((a, b) => a + b, 0) + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
    }
    if (type === 'review') return '<div class="card"><div class="ch"><b>Where plan and forecast disagree</b><span class="mut">Sorted by impact</span></div>' + hbars(X.charts.groups.map((g2, k) => ({ l: g2.l, v: g2.v - 20 * (k % 3) })), { fmt: v => (v > 50 ? '+' : '−') + Math.abs(v - 50) + '%' }) + '</div>';
    if (type === 'approve') return '<div class="card"><div class="ch"><b>Sign-off</b></div><div class="chain">' + [['Maya Chen', 'Prepared', 'done'], ['Priya Raman', 'Department head', 'done'], ['Marcus Lee', 'Finance lead', 'cur'], ['Elena Petrova', 'Executive', '']].map(a => '<div class="ch1 ' + a[2] + '">' + avatar(a[0], 30) + '<b>' + esc(a[0]) + '</b><small>' + a[1] + '</small></div>').join('<i class="cl"></i>') + '</div></div>';
    return '<div class="card"><div class="ch"><b>Ready to publish</b></div><div class="chk">' + ['All owners have submitted', 'Variances explained', 'Approvals complete', 'Notify owners and lock the plan'].map((x, k) => '<div><i class="cb ' + (k < 3 ? 'on' : '') + '"></i>' + x + '</div>').join('') + '</div></div>';
  }
  function workflow(d, st) {
    const f = d.flags, p = d.pack, L = p.labels, w = p.workflow, i = Math.min(st.step || 0, 4);
    const steps = w.steps;
    if (f.wizard) {
      return { head: '', body: '<div class="wiz"><aside class="wsteps"><div class="eyebrow">' + esc(w.name) + '</div>' + steps.map((s, k) => '<a data-step="' + k + '" class="ws ' + (k < i ? 'done' : k === i ? 'cur' : '') + '"><i>' + (k < i ? '✓' : k + 1) + '</i><span><b>' + esc(s[0]) + '</b><small>' + esc(s[1]) + '</small></span></a>').join('') + '</aside><section class="wmain"><div class="eyebrow">Step ' + (i + 1) + ' of 5</div><h1>' + esc(steps[i][0]) + '</h1><p class="sub">' + esc(steps[i][1]) + '.</p>' + stepBody(d, st, i) + '<div class="wfoot">' + (i ? btn('Back', { a: 'data-step="' + (i - 1) + '"' }) : '<span></span>') + btn(i === 4 ? 'Publish' : 'Continue', { k: 'pri', i: 'arrow', a: 'data-step="' + Math.min(4, i + 1) + '"' }) + '</div></section></div>', bare: true };
    }
    return { head: pageHead(d, esc(w.name), 'Cycle owner: Maya Chen · Due Friday', btn('Reminders') + btn(i === 4 ? 'Publish' : 'Next step', { k: 'pri', a: 'data-step="' + Math.min(4, i + 1) + '"' })), body: '<div class="seg lg">' + steps.map((s, k) => '<i data-step="' + k + '" class="' + (k === i ? 'on' : k < i ? 'dn' : '') + '">' + esc(s[0]) + '</i>').join('') + '</div><div class="g12"><div class="s8">' + stepBody(d, st, i) + '</div><div class="s4"><div class="card"><div class="ch"><b>Cycle status</b></div><div class="prog"><b>' + (i * 20 + 10) + '%</b><span class="steps">' + steps.map((s, k) => '<i class="' + (k < i ? 'done' : k === i ? 'cur' : '') + '"></i>').join('') + '</span></div><div class="list">' + data(d).rows.slice(0, f.dense ? 5 : 3).map(r => '<div class="li"><i class="dot ' + statCls(r.status) + '"></i><span><b>' + esc(r.name) + '</b><small>' + esc(r.owner) + '</small></span></div>').join('') + '</div></div></div></div>' };
  }

  function insights(d, st) {
    const f = d.flags, p = d.pack, L = p.labels, X = data(d), view = st.iview || (f.charts ? 'chart' : 'table');
    const toggle = '<span class="seg"><i data-iview="table" class="' + (view === 'table' ? 'on' : '') + '">Table</i><i data-iview="chart" class="' + (view === 'chart' ? 'on' : '') + '">Chart</i></span>';
    let body;
    if (view === 'chart') {
      body = '<div class="g12"><div class="s8"><div class="card"><div class="ch"><b>' + esc(p.trendT) + '</b><span class="seg"><i class="on">Line</i><i>Bars</i><i>Area</i></span></div>' + line(X.charts.trend, { w: 700, h: 270 }) + '</div></div><div class="s4"><div class="card"><div class="ch"><b>What changed</b></div>' + waterfall(X.charts.bridge, { h: 250 }) + '</div></div></div>' +
        '<div class="g12"><div class="s4"><div class="card"><div class="ch"><b>By group</b></div>' + hbars(X.charts.groups.slice(0, 5)) + '</div></div>' + p.kpis.slice(0, 2).map((k, i) => '<div class="s4"><div class="card sm"><span class="lab">' + esc(k[0]) + '</span><b class="val">' + esc(k[1]) + '</b>' + spark(D.series(d.seed + i * 3, 12, 50, 1.5, 9), 220, 46) + '</div></div>').join('') + '</div>';
    } else {
      const mx = Math.max(...X.rows.map(r => r.m1));
      body = '<div class="card flush"><table class="tbl"><thead><tr><th>' + esc(p.e[1]) + '</th>' + ['Q1', 'Q2', 'Q3', 'Q4'].map(q => '<th class="num">' + q + '</th>').join('') + '<th>Share of total</th></tr></thead><tbody>' + X.rows.slice(0, f.dense ? 11 : 7).map(r => '<tr><td><b>' + esc(r.name) + '</b></td>' + [0.22, 0.26, 0.24, 0.28].map(s => '<td class="num">' + D.money(p, r.m1 * s) + '</td>').join('') + '<td><span class="db"><i style="width:' + (r.m1 / mx * 100).toFixed(0) + '%"></i></span></td></tr>').join('') + '</tbody></table></div>' + (f.dense ? '' : '<div class="card"><div class="ch"><b>Summary</b></div>' + hbars(X.charts.groups.slice(0, 3)) + '</div>');
    }
    return { head: pageHead(d, esc(L.insights), esc(p.insightT), toggle + btn('Share', { i: 'download' })), body };
  }

  function approvals(d, st) {
    const f = d.flags, p = d.pack, L = p.labels, A = st.appr || {}, items = p.approvals, open = items.map((a, i) => i).filter(i => !A[i]);
    const row = (a, i, full) => '<div class="ap ' + (A[i] ? 'dn' : '') + '">' + (f.pro && !f.ai ? '<i class="cb"></i>' : '') + '<span class="ap-t"><b>' + esc(a[0]) + '</b><small>' + esc(a[1]) + (a[2] ? ' · ' + D.money(p, a[2]) : '') + '</small></span>' + (A[i] ? '<span class="chip ' + (A[i] === 'approve' ? 'ok' : 'warn') + '">' + (A[i] === 'approve' ? 'Approved' : 'Rejected') + '</span>' : (/Within|Checks|Info/.test(a[3]) ? chip(a[3]) : '<span class="chip warn">' + esc(a[3]) + '</span>') + '<span class="aa">' + btn('Reject', { a: 'data-appr="' + i + ':reject"' }) + btn('Approve', { k: 'pri', a: 'data-appr="' + i + ':approve"' }) + '</span>') + '</div>';
    let body;
    if (f.ai) {
      const need = open.filter(i => !/Within|Checks|Info/.test(items[i][3]));
      body = '<div class="card hero"><div class="ch"><span class="eyebrow">Handled automatically</span></div><h2><b>41</b> requests approved within policy</h2><p class="sub">Nothing needed your judgement. <a class="lk">See what was approved</a></p></div><div class="card"><div class="ch"><b>Needs your decision</b><span class="mut">' + need.length + '</span></div><div class="list">' + need.map(i => '<div class="rec">' + row(items[i], i) + '<div class="recm">' + ic('spark', 13) + '<span><b>Recommendation: ' + (i % 2 ? 'approve' : 'approve with a condition') + '</b> · Similar requests were approved 9 of 10 times</span></div></div>').join('') + (need.length ? '' : '<div class="empty">All caught up.</div>') + '</div></div>';
    } else {
      const cur = items[open[0]] || items[0];
      body = '<div class="g12"><div class="s8"><div class="card flush">' + (f.pro ? '<div class="tools"><span class="seg"><i class="on">Pending ' + open.length + '</i><i>Approved</i><i>All</i></span><span class="sp1"></span>' + btn('Approve selected') + '</div>' : '') + '<div class="aps">' + items.map((a, i) => row(a, i)).join('') + '</div></div></div><div class="s4"><div class="card"><div class="ch"><b>Policy check</b></div><div class="chk">' + ['Within budget authority', 'Owner confirmed', 'No conflicting requests', 'Documentation attached'].map((x, k) => '<div><i class="cb ' + (k !== 1 ? 'on' : '') + '"></i>' + x + '</div>').join('') + '</div><div class="note">Add a comment for the requester…</div></div></div></div>';
    }
    return { head: pageHead(d, esc(L.approvals), open.length + ' waiting for you', f.pro ? btn('Rules', { i: 'filter' }) : ''), body };
  }

  function settings(d, st) {
    const f = d.flags, p = d.pack, L = p.labels, G = p.settings, sg = st.sg || 0;
    const tog = (on, k) => '<i class="tg ' + (on ? 'on' : '') + '" data-tog="' + k + '"></i>';
    const tgs = st.tog || {};
    if (f.cfg) {
      const g = G[sg], roles = ['Admin', 'Editor', 'Approver', 'Viewer'], perms = ['View', 'Edit', 'Approve', 'Publish', 'Configure'];
      return { head: pageHead(d, esc(L.settings), 'Configure how ' + esc(p.name) + ' works for every team', btn('Audit log') + btn('Save changes', { k: 'pri' })), body: '<div class="sgrid"><nav class="snav">' + G.map((x, i) => '<a data-sg="' + i + '" class="' + (i === sg ? 'on' : '') + '">' + esc(x[0]) + '</a>').join('') + '</nav><div><div class="card"><div class="ch"><b>' + esc(g[0]) + '</b></div><div class="set">' + g[1].map((x, i) => '<div class="sr"><span>' + esc(x[0]) + '</span>' + (x[1] === 'on' ? tog(tgs[sg + '.' + i] !== false, sg + '.' + i) : '<span class="inp">' + esc(x[1]) + '</span>') + '</div>').join('') + '</div></div><div class="card flush"><div class="ch pad"><b>Roles and permissions</b>' + btn('Add role', { i: 'plus' }) + '</div><table class="tbl"><thead><tr><th>Role</th>' + perms.map(x => '<th class="ctr">' + x + '</th>').join('') + '</tr></thead><tbody>' + roles.map((r, i) => '<tr><td><b>' + r + '</b></td>' + perms.map((x, j) => '<td class="ctr"><i class="cb ' + (j <= 3 - i + (i === 0 ? 1 : 0) ? 'on' : '') + '"></i></td>').join('') + '</tr>').join('') + '</tbody></table></div></div></div>' };
    }
    const pre = [['Guided', 'The product leads. Best for teams new to ' + esc(p.name) + '.'], ['Balanced', 'Sensible defaults, with room to adjust.'], ['Hands-off', 'Automatic wherever it is safe. You handle exceptions.']], sel = st.preset == null ? 1 : st.preset;
    return { head: pageHead(d, 'How should ' + esc(p.name) + ' work for your team?', 'Pick a starting point. You can change it any time.', ''), body: '<div class="presets">' + pre.map((x, i) => '<a data-preset="' + i + '" class="card pre ' + (i === sel ? 'on' : '') + '"><i class="rd ' + (i === sel ? 'on' : '') + '"></i><b>' + x[0] + '</b><span>' + x[1] + '</span></a>').join('') + '</div><a data-adv="1" class="adv">' + ic('chev', 14) + ' Advanced settings <span class="mut">' + G.reduce((a, g2) => a + g2[1].length, 0) + ' options</span></a>' + (st.adv ? '<div class="card"><div class="set">' + G.slice(0, 2).flatMap((g2, gi) => g2[1].map((x, i) => '<div class="sr"><span>' + esc(x[0]) + '</span><span class="inp">' + esc(x[1]) + '</span></div>')).join('') + '</div></div>' : '') };
  }

  /* ───────── CSS ───────── */
  const CSS = `
:host{display:block;width:1280px;height:800px}
*{box-sizing:border-box;margin:0;padding:0}
.app{position:relative;width:1280px;height:800px;overflow:hidden;background:var(--bg);color:var(--ink);font:400 var(--fs)/1.45 var(--ui),system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.mono,kbd,.val{font-family:var(--mono),ui-monospace,monospace}.mut{color:var(--mut)}b{font-weight:600}a{cursor:pointer;color:inherit;text-decoration:none}
.ic{flex:none}h1,h2{font-family:var(--disp),var(--ui),sans-serif;letter-spacing:-.01em;font-weight:var(--dw)}
.shell{display:grid;height:100%}.col{min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.sb{grid-template-columns:232px 1fr}.rl{grid-template-columns:56px 208px 1fr}.tp,.cm{grid-template-rows:auto 1fr}
.side{background:var(--surface);border-right:1px solid var(--line);padding:calc(var(--u)*2);display:flex;flex-direction:column;gap:2px;overflow:hidden}
.brand{display:flex;align-items:center;gap:9px;font-size:1.06em;padding:4px 6px 12px}.mk{width:20px;height:20px;border-radius:calc(var(--r)*.5 + 2px);background:var(--acc);display:inline-block;position:relative}.mk::after{content:"";position:absolute;inset:5px;border-radius:50%;border:2px solid var(--accInk)}
.sq{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:var(--r);padding:calc(var(--u)*.9) calc(var(--u)*1.4);color:var(--mut);background:var(--bg);margin-bottom:8px}.sq span{flex:1}.sq.wide{flex:0 0 220px}.sq.big{flex:1;padding:12px 16px;font-size:1.05em;background:var(--surface)}kbd{font-size:.82em;border:1px solid var(--line);border-radius:4px;padding:0 5px;color:var(--mut)}
.ng{font-size:.76em;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);padding:calc(var(--u)*1.6) 8px 4px}
.ni{display:flex;align-items:center;gap:10px;padding:calc(var(--u)*1) 10px;border-radius:var(--r);color:var(--mut)}.ni.on{background:var(--soft);color:var(--acc);font-weight:600}.ni:hover{color:var(--ink)}.ni em{margin-left:auto;font-style:normal;font-size:.8em;background:var(--acc);color:var(--accInk);border-radius:9px;padding:0 6px}
.sfoot{margin-top:auto;display:flex;gap:10px;align-items:center;padding:8px 6px;border-top:1px solid var(--line)}.sfoot small{display:block;color:var(--mut);font-size:.8em}
.av{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;color:#fff;font-size:.62em;font-weight:600;flex:none}
.rail{background:var(--surface);border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 0}.rail .mk{margin-bottom:12px}.ri{width:38px;height:38px;display:grid;place-items:center;border-radius:var(--r);color:var(--mut)}.ri.on{background:var(--soft);color:var(--acc)}.sp1{flex:1}
.ctx{background:var(--bg);border-right:1px solid var(--line);padding:calc(var(--u)*2.4) calc(var(--u)*1.6)}.ctx-t{font:var(--dw) 1.2em/1.2 var(--disp),var(--ui),sans-serif;padding:4px 8px 14px}.ci{display:flex;justify-content:space-between;padding:calc(var(--u)*.9) 10px;border-radius:var(--r);color:var(--mut)}.ci.on{background:var(--surface);color:var(--ink);box-shadow:0 0 0 1px var(--line)}.ci em{font-style:normal;font-size:.85em}
.tb,.cbar{display:flex;align-items:center;gap:calc(var(--u)*2.5);padding:0 calc(var(--u)*3);height:54px;background:var(--surface);border-bottom:1px solid var(--line)}.tb .sq,.cbar .sq{margin:0;width:230px}.tabs{display:flex;gap:2px;height:100%}.ti{display:flex;align-items:center;padding:0 12px;color:var(--mut);border-bottom:2px solid transparent;font-weight:500}.ti.on{color:var(--ink);border-color:var(--acc)}
.cbar .brand{padding:0}.cmdbar{flex:1;max-width:560px;margin:0 auto;display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:99px;padding:9px 18px;color:var(--mut);background:var(--bg)}.cmdbar span{flex:1}
.cmdp{position:absolute;inset:0;background:rgba(0,0,0,.35);display:grid;place-items:start center;padding-top:110px;z-index:5}.cmdp-in{width:520px;background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--r) + 4px);box-shadow:0 30px 60px rgba(0,0,0,.35);padding:8px}.cmdp-q{display:flex;gap:10px;align-items:center;padding:12px;color:var(--mut);border-bottom:1px solid var(--line);margin-bottom:6px}.cmi{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--r)}.cmi:hover{background:var(--soft)}.cmi em{margin-left:auto;color:var(--mut);font-style:normal;font-size:.85em}
.main{flex:1;min-height:0;overflow:auto;padding:calc(var(--u)*3.2) calc(var(--u)*4) calc(var(--u)*3);display:flex;flex-direction:column;gap:calc(var(--u)*2.4)}.main.bare{padding:0}
.ph{display:flex;justify-content:space-between;align-items:flex-end;gap:20px}.ph h1{font-size:1.9em;line-height:1.1;display:flex;gap:12px;align-items:center}.ph .sub{color:var(--mut);margin-top:4px}.crumb{color:var(--mut);font-size:.88em;margin-bottom:6px;display:flex;align-items:center;gap:4px}.crumb a:hover{color:var(--acc)}.acts{display:flex;gap:8px}
.btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r);padding:calc(var(--u)*.95) calc(var(--u)*1.7);font:500 1em var(--ui),sans-serif;cursor:pointer;white-space:nowrap}.btn.pri{background:var(--acc);color:var(--accInk);border-color:var(--acc)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--r) + 2px);padding:calc(var(--u)*2.4)}.card.flush{padding:0;overflow:hidden}.card.sm{display:flex;flex-direction:column;gap:6px}
.ch{display:flex;justify-content:space-between;align-items:center;margin-bottom:calc(var(--u)*1.6);gap:10px}.ch.pad{padding:calc(var(--u)*2) calc(var(--u)*2.4);margin:0}
.g12{display:grid;grid-template-columns:repeat(12,1fr);gap:calc(var(--u)*2.4)}.s8{grid-column:span 8;display:flex;flex-direction:column;gap:calc(var(--u)*2.4);min-width:0}.s4{grid-column:span 4;display:flex;flex-direction:column;gap:calc(var(--u)*2.4);min-width:0}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:calc(var(--u)*2)}.kpis.stack{grid-template-columns:1fr}.kpi,.card.sm{background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--r) + 2px);padding:calc(var(--u)*2) calc(var(--u)*2.4);display:grid;gap:3px;position:relative}.card.sm{display:flex}
.lab{font-size:.8em;color:var(--mut);letter-spacing:.02em}.val{font-size:1.75em;font-weight:500;letter-spacing:-.02em;line-height:1.2}.dl{font-size:.86em}.dl.good{color:var(--pos)}.dl.bad{color:var(--neg)}.ks{position:absolute;right:calc(var(--u)*2);top:calc(var(--u)*2.2)}
.chip{display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:1px 9px;font-size:.84em;font-weight:500;background:var(--raised);color:var(--mut);white-space:nowrap}.chip.ok{background:color-mix(in srgb,var(--pos) 14%,transparent);color:var(--pos)}.chip.warn{background:color-mix(in srgb,var(--warn) 16%,transparent);color:var(--warn)}.chip.ai-c{background:var(--soft);color:var(--acc)}
.tw{overflow:hidden}.tbl{width:100%;border-collapse:collapse}.tbl th{font-size:.78em;font-weight:500;color:var(--mut);text-align:left;padding:calc(var(--u)*1.1) calc(var(--u)*1.8);border-bottom:1px solid var(--line);background:var(--bg);white-space:nowrap}.tbl td{padding:0 calc(var(--u)*1.8);height:var(--row);border-bottom:1px solid var(--line);white-space:nowrap}.tbl tr:last-child td{border-bottom:0}.tbl tbody tr{cursor:pointer}.tbl tbody tr:hover td{background:var(--bg)}.tbl tr.sel td{background:var(--soft)}.num{text-align:right;font-variant-numeric:tabular-nums;font-family:var(--mono),ui-monospace,monospace;font-size:.94em}.ctr{text-align:center}.neg{color:var(--neg)}.pos{color:var(--pos)}.end{width:28px}.ck{width:34px}
.nm{display:flex;flex-direction:column;justify-content:center;gap:0;line-height:1.25;height:var(--row)}.nm span{font-size:.78em}.own{display:inline-flex;align-items:center;gap:8px}.sp{padding-top:2px}
.cb{display:inline-block;width:15px;height:15px;border:1.5px solid var(--mut);border-radius:4px;vertical-align:middle}.cb.on{background:var(--acc);border-color:var(--acc);box-shadow:inset 0 0 0 3px var(--surface)}
.tools{display:flex;align-items:center;gap:8px;padding:calc(var(--u)*1.4) calc(var(--u)*1.8);border-bottom:1px solid var(--line)}.tools.soft{padding:calc(var(--u)*2)}.fc{border:1px dashed var(--line);border-radius:99px;padding:3px 12px;font-size:.88em;color:var(--mut)}.fc b{color:var(--ink);font-weight:500}
.tfoot{display:flex;justify-content:space-between;padding:calc(var(--u)*1.2) calc(var(--u)*2);font-size:.86em;border-top:1px solid var(--line);background:var(--bg)}
.seg{display:inline-flex;background:var(--raised);border-radius:calc(var(--r) + 1px);padding:2px;gap:2px}.seg i{font-style:normal;padding:3px 12px;border-radius:var(--r);font-size:.88em;color:var(--mut);cursor:pointer}.seg i.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.12)}.seg.lg i{padding:7px 18px;font-size:.95em}.seg.lg i.dn{color:var(--acc)}.seg.lg{align-self:flex-start}
.eyebrow{font-size:.78em;letter-spacing:.1em;text-transform:uppercase;color:var(--acc);font-weight:600}
.hero h2{font-size:1.9em;line-height:1.15;margin:6px 0}.hero .sub,.sub{color:var(--mut)}.hero .acts{margin-top:calc(var(--u)*2.4)}.steps{display:flex;gap:6px;margin-top:calc(var(--u)*2.2)}.steps i{flex:1;height:5px;border-radius:3px;background:var(--raised)}.steps i.done{background:var(--acc)}.steps i.cur{background:linear-gradient(90deg,var(--acc) 50%,var(--raised) 50%)}
.greet h2{font-size:2.6em;line-height:1.05;margin-top:6px}
.list{display:flex;flex-direction:column}.li{display:flex;align-items:center;gap:12px;padding:calc(var(--u)*1.3) 0;border-top:1px solid var(--line)}.li:first-child{border-top:0}.li span{flex:1;display:flex;flex-direction:column}.li small{color:var(--mut);font-size:.84em}.dot{width:8px;height:8px;border-radius:50%;background:var(--mut);flex:none}.dot.warn{background:var(--warn)}.dot.ok{background:var(--pos)}.dot.neu{background:var(--acc)}
.auto{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}.auto b{font:var(--dw) 2.6em/1 var(--disp),var(--ui),sans-serif;color:var(--acc)}.auto span{color:var(--mut)}
.ai{display:flex;align-items:center;gap:14px;background:var(--soft);border:1px solid color-mix(in srgb,var(--acc) 25%,transparent);border-radius:calc(var(--r) + 2px);padding:calc(var(--u)*1.8) calc(var(--u)*2.4)}.ai div{flex:1}.ai small{display:block;color:var(--mut)}.aib{width:28px;height:28px;border-radius:50%;background:var(--acc);color:var(--accInk);display:grid;place-items:center;flex:none}.ai.small{margin-bottom:0}
.chart{display:block}.ax{font:11px var(--mono),monospace;fill:var(--mut)}.ax.strong{fill:var(--ink);font-weight:600}.spark{display:block}
.hb{display:flex;flex-direction:column;gap:calc(var(--u)*1.4)}.hb-r{display:grid;grid-template-columns:30% 1fr 52px;align-items:center;gap:10px}.hb-l{font-size:.9em;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hb-t{height:10px;background:var(--raised);border-radius:5px;overflow:hidden}.hb-t i{display:block;height:100%;background:var(--acc);border-radius:5px}.hb-v{text-align:right;font:500 .9em var(--mono),monospace}
.db{display:block;height:8px;background:var(--raised);border-radius:4px;width:160px}.db i{display:block;height:100%;background:var(--acc);border-radius:4px}
.dgrid{display:grid;grid-template-columns:1fr 300px;gap:calc(var(--u)*2.4)}.dgrid>div{display:flex;flex-direction:column;gap:calc(var(--u)*2)}.dtabs{display:flex;gap:4px;border-bottom:1px solid var(--line)}.dtabs a{padding:8px 14px;color:var(--mut);border-bottom:2px solid transparent;margin-bottom:-1px}.dtabs a.on{color:var(--ink);border-color:var(--acc);font-weight:600}
.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:calc(var(--u)*2)}.facts div{display:flex;flex-direction:column}.facts span{font-size:.8em}
.feed{display:flex;flex-direction:column;gap:calc(var(--u)*1.8)}.fe{display:flex;gap:10px}.fe span{display:flex;flex-direction:column;line-height:1.35}.fe small{color:var(--mut)}
.adj{display:flex;align-items:center;gap:calc(var(--u)*2);padding:calc(var(--u)*1.6) calc(var(--u)*2);border:1px solid var(--line);border-radius:calc(var(--r) + 2px);background:var(--surface)}.adjr{display:flex;align-items:center;gap:12px;flex:1}
.inp{display:inline-block;min-width:96px;border:1px solid var(--line);border-radius:var(--r);padding:calc(var(--u)*.8) calc(var(--u)*1.4);background:var(--bg);font-family:var(--mono),monospace;font-size:.94em}.rng{display:block;position:relative;height:4px;background:var(--raised);border-radius:2px;min-width:140px}.rng i{position:absolute;top:-5px;width:14px;height:14px;border-radius:50%;background:var(--acc);margin-left:-7px}
.drv{display:flex;flex-direction:column}.dr{display:grid;grid-template-columns:200px 150px 1fr 140px;align-items:center;gap:16px;padding:calc(var(--u)*1.6) 0;border-top:1px solid var(--line)}.dr:first-child{border-top:0}
.fx{display:flex;gap:12px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--bg)}.grid td.edit{background:var(--soft);box-shadow:inset 0 0 0 1.5px var(--acc)}
.wiz{display:grid;grid-template-columns:300px 1fr;height:100%}.wsteps{padding:calc(var(--u)*3.4) calc(var(--u)*2.4);border-right:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;gap:6px}.wsteps .eyebrow{margin-bottom:10px;padding-left:10px}.ws{display:flex;gap:12px;padding:12px 10px;border-radius:var(--r);color:var(--mut)}.ws.cur{background:var(--soft);color:var(--ink)}.ws i{font-style:normal;width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line);display:grid;place-items:center;font-size:.8em;flex:none}.ws.done i{background:var(--acc);border-color:var(--acc);color:var(--accInk)}.ws.cur i{border-color:var(--acc);color:var(--acc)}.ws span{display:flex;flex-direction:column}.ws small{font-size:.82em;line-height:1.3}
.wmain{padding:calc(var(--u)*4.6) calc(var(--u)*7);display:flex;flex-direction:column;gap:calc(var(--u)*2);overflow:auto}.wmain h1{font-size:2.5em;line-height:1.05}.wfoot{display:flex;justify-content:space-between;margin-top:auto;padding-top:calc(var(--u)*2)}
.prog{display:flex;align-items:center;gap:14px;margin-bottom:8px}.prog b{font:var(--dw) 2em var(--disp),var(--ui),sans-serif}.prog .steps{flex:1;margin:0}
.chain{display:flex;align-items:center;gap:12px;flex-wrap:nowrap}.ch1{display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;opacity:.55}.ch1.done,.ch1.cur{opacity:1}.ch1 small{color:var(--mut)}.cl{flex:1;height:2px;background:var(--line);min-width:20px}.chk{display:flex;flex-direction:column;gap:12px}.chk div{display:flex;gap:10px;align-items:center}
.aps{display:flex;flex-direction:column}.ap{display:flex;align-items:center;gap:14px;padding:calc(var(--u)*1.5) calc(var(--u)*2);border-bottom:1px solid var(--line)}.ap:last-child{border-bottom:0}.ap-t{flex:1;display:flex;flex-direction:column}.ap-t small{color:var(--mut)}.ap.dn{opacity:.6}.aa{display:flex;gap:6px}.rec .ap{padding-left:0;padding-right:0}.recm{display:flex;gap:8px;align-items:center;color:var(--acc);background:var(--soft);border-radius:var(--r);padding:8px 12px;font-size:.9em;margin-bottom:12px}.empty{color:var(--mut);padding:20px 0}.lk{color:var(--acc);text-decoration:underline}.note{border:1px solid var(--line);border-radius:var(--r);padding:12px;color:var(--mut);margin-top:16px;min-height:70px;background:var(--bg)}
.sgrid{display:grid;grid-template-columns:200px 1fr;gap:calc(var(--u)*3)}.sgrid>div:last-child{display:flex;flex-direction:column;gap:calc(var(--u)*2.4)}.snav{display:flex;flex-direction:column;gap:2px}.snav a{padding:9px 12px;border-radius:var(--r);color:var(--mut)}.snav a.on{background:var(--soft);color:var(--acc);font-weight:600}
.set{display:flex;flex-direction:column}.sr{display:flex;justify-content:space-between;align-items:center;padding:calc(var(--u)*1.5) 0;border-top:1px solid var(--line)}.sr:first-child{border-top:0}.tg{width:34px;height:20px;border-radius:10px;background:var(--raised);position:relative;border:1px solid var(--line);cursor:pointer}.tg::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--mut);transition:all .15s}.tg.on{background:var(--acc);border-color:var(--acc)}.tg.on::after{left:16px;background:var(--accInk)}
.presets{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(var(--u)*2.4)}.pre{display:flex;flex-direction:column;gap:8px;padding:calc(var(--u)*3);min-height:190px}.pre b{font:var(--dw) 1.5em var(--disp),var(--ui),sans-serif}.pre span{color:var(--mut)}.pre.on{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc)}.rd{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--mut);margin-bottom:auto}.rd.on{border-color:var(--acc);background:radial-gradient(var(--acc) 45%,transparent 50%)}.adv{display:flex;align-items:center;gap:8px;color:var(--mut)}
.nxt{display:flex;align-items:center;gap:20px;margin-top:auto;padding-top:calc(var(--u)*2);border-top:1px solid var(--line)}.nxt a{display:inline-flex;align-items:center;gap:6px;color:var(--acc);font-weight:500}
.scrim{position:absolute;inset:0;background:rgba(10,12,18,.28);z-index:3}.drawer{position:absolute;top:0;right:0;bottom:0;width:470px;background:var(--surface);border-left:1px solid var(--line);box-shadow:-20px 0 50px rgba(0,0,0,.18);z-index:4;display:flex;flex-direction:column}.drawer .dh{display:flex;justify-content:space-between;align-items:flex-start;padding:calc(var(--u)*2.6);border-bottom:1px solid var(--line)}.drawer h2{font-size:1.5em;line-height:1.15}.drawer .db2{padding:calc(var(--u)*2.4);overflow:auto;display:flex;flex-direction:column;gap:calc(var(--u)*2)}.drawer .facts{grid-template-columns:repeat(2,1fr)}
`;

  /* ───────── assemble ───────── */
  function vars(d) {
    const t = d.theme, f = d.flags, A = M.ARCH[d.arch];
    const dw = { 'Instrument Serif': 400, 'Fraunces': 600, 'Space Grotesk': 600 }[t.fonts.disp] || 600;
    return '--bg:' + t.bg + ';--surface:' + t.surface + ';--raised:' + t.raised + ';--ink:' + t.ink + ';--mut:' + t.mut + ';--line:' + t.line + ';--acc:' + t.acc + ';--accInk:' + t.accInk + ';--soft:' + t.soft + ';--pos:' + t.pos + ';--neg:' + t.neg + ';--warn:' + t.warn +
      ';--u:' + f.u + 'px;--fs:' + f.fs + 'px;--row:' + f.row + 'px;--r:' + f.r + 'px;--ui:"' + t.fonts.ui + '";--mono:"' + t.fonts.mono + '";--disp:"' + t.fonts.disp + '";--dw:' + dw + ';color-scheme:' + t.mode;
  }
  const loaded = new Set();
  function ensureFonts(d) { M.fontsHref(d.theme.fonts).forEach(h => { if (loaded.has(h)) return; loaded.add(h); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); }); }

  function view(d, st) {
    const f = d.flags;
    let page, drawer = '';
    const S = st.screen;
    if (S === 'table' && st.row != null && f.detail === 'page') page = detailScreen(d, st);
    else if (S === 'home') page = home(d, st);
    else if (S === 'workflow') page = workflow(d, st);
    else if (S === 'table') {
      page = tableScreen(d, st);
      if (st.row != null) { const b = detailBody(d, st); drawer = '<div class="scrim" data-close="1"></div><aside class="drawer"><div class="dh"><div><div class="mut mono" style="font-size:.82em">' + esc(b.r.id) + '</div><h2>' + esc(b.title) + '</h2><div style="margin-top:6px">' + chip(b.r.status) + '</div></div><a data-close="1" class="btn">' + ic('close', 14) + '</a></div><div class="db2">' + b.tabs + b.c + '</div></aside>'; }
    } else if (S === 'insights') page = insights(d, st);
    else if (S === 'approvals') page = approvals(d, st);
    else page = settings(d, st);
    const inner = '<div class="main ' + (page.bare ? 'bare' : '') + '">' + (page.head || '') + page.body + '</div>';
    return '<div class="app" style="' + vars(d) + '">' + shell(d, st, inner) + drawer + '</div>';
  }

  /* mount: static (preview) or interactive (clickable prototype) */
  function mount(host, d, o) {
    o = o || {}; ensureFonts(d);
    const sr = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const st = Object.assign({ screen: 'home', row: null, step: 2, tab: 'Overview', appr: {}, tog: {} }, o.state || {});
    const draw = () => { const sc = sr.querySelector('.main'); const top = sc ? sc.scrollTop : 0; sr.innerHTML = '<style>' + CSS + '</style>' + view(d, st); const m = sr.querySelector('.main'); if (m && o.keepScroll) m.scrollTop = top; if (o.onChange) o.onChange(st); };
    draw();
    if (o.interactive && !sr._wired) {
      sr._wired = true;
      sr.addEventListener('click', e => {
        const t = e.target.closest('[data-go],[data-row],[data-close],[data-step],[data-tab],[data-iview],[data-appr],[data-preset],[data-tog],[data-sg],[data-adv],[data-cmd]'); if (!t) { if (st.cmd) { st.cmd = false; draw(); } return; }
        const ds = t.dataset;
        if (ds.appr) { const [i, a] = ds.appr.split(':'); st.appr[i] = a; }
        else if (ds.row != null && ds.go == null) { st.row = +ds.row; st.tab = 'Overview'; }
        else if (ds.go) { st.screen = ds.go; st.row = ds.row != null ? +ds.row : null; st.cmd = false; }
        else if (ds.close) st.row = null;
        else if (ds.step != null) st.step = +ds.step;
        else if (ds.tab) st.tab = ds.tab;
        else if (ds.iview) st.iview = ds.iview;
        else if (ds.preset != null) st.preset = +ds.preset;
        else if (ds.tog) st.tog[ds.tog] = st.tog[ds.tog] === false;
        else if (ds.sg != null) st.sg = +ds.sg;
        else if (ds.adv) st.adv = !st.adv;
        else if (ds.cmd) st.cmd = true;
        d._d && 0; draw(); sr.querySelector('.main') && (sr.querySelector('.main').scrollTop = 0);
      });
    }
    return { state: st, redraw: draw, go: s => { st.screen = s; st.row = null; draw(); } };
  }


  /* component sheet for the System tab */
  function mountKit(host, d) {
    ensureFonts(d);
    const sr = host.shadowRoot || host.attachShadow({ mode: 'open' }), p = d.pack, f = d.flags, X = data(d), r = X.rows[0];
    const sec = (t, c) => '<div class="ks2"><div class="kt">' + t + '</div>' + c + '</div>';
    sr.innerHTML = '<style>' + CSS + ':host{display:block;width:auto;height:auto}.kitroot{background:var(--bg);color:var(--ink);font:400 var(--fs)/1.45 var(--ui),system-ui,sans-serif;padding:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.ks2{background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--r) + 2px);padding:18px;display:flex;flex-direction:column;gap:12px;min-width:0}.kt{font:500 .72em var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}.rowf{display:flex;gap:8px;flex-wrap:wrap;align-items:center}@media(max-width:900px){.kitroot{grid-template-columns:1fr}}</style><div class="kitroot" style="' + vars(d) + '">' +
      sec('Buttons', '<div class="rowf">' + btn('Primary', { k: 'pri' }) + btn('Secondary') + btn('With icon', { i: 'plus' }) + '</div>') +
      sec('Inputs', '<div class="rowf"><span class="inp">' + esc(p.drivers[0][1]) + '</span><span class="rng" style="flex:1"><i style="left:55%"></i></span></div><div class="rowf"><i class="tg on"></i><i class="tg"></i><i class="cb on"></i><i class="cb"></i><span class="seg"><i class="on">Week</i><i>Month</i></span></div>') +
      sec('Status', '<div class="rowf">' + chip('On track') + chip('At risk') + chip('Draft') + '<span class="chip ai-c">' + ic('spark', 11) + ' Suggested</span></div><div class="rowf">' + avatar('Maya Chen', 26) + avatar('Daniel Okafor', 26) + avatar('Priya Raman', 26) + '</div>') +
      sec('Metric', '<div class="kpi" style="border:0;padding:0"><span class="lab">' + esc(p.kpis[0][0]) + '</span><b class="val">' + esc(p.kpis[0][1]) + '</b><span class="dl good">' + esc(p.kpis[0][2]) + '</span></div>' + spark(r.trend, 220, 40)) +
      sec('Navigation item', '<div class="side" style="border:0;padding:0;background:none"><a class="ni on">' + ic('home', 16) + '<span>' + esc(p.labels.home) + '</span></a><a class="ni">' + ic('table', 16) + '<span>' + esc(p.labels.table) + '</span></a><a class="ni">' + ic('check', 16) + '<span>' + esc(p.labels.approvals) + '</span><em>' + p.approvals.length + '</em></a></div>') +
      sec('Chart', line([X.charts.trend[0].slice(0, 10), X.charts.trend[1].slice(0, 10)], { w: 360, h: 130, labels: Array(10).fill('') })) +
      '<div class="ks2" style="grid-column:1/-1;padding:0;overflow:hidden"><div class="kt" style="padding:18px 18px 0">Table row</div>' + tbl(d, { row: 0 }, 3, { cols: 6 }) + '</div></div>';
  }

  g.PRODUCT = { mountKit, mount, SCREENS, view, CSS, vars, ensureFonts };
})(window);
