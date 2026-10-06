/* Live-map layout for tracking products (flights, trains, ships, fleets): a map-first consumer app.
   Not a function: it draws a believable design from a pack's `live.items`, themed by the same taste vars as the rest. */
(function (g) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const W = 1000, H = 560, LON0 = -125, LON1 = 155, LAT0 = 72, LAT1 = -40;
  const px = (lon, lat) => [(lon - LON0) / (LON1 - LON0) * W, (LAT0 - lat) / (LAT0 - LAT1) * H];
  const LAND = {
    na: [[-168, 66], [-160, 70], [-140, 70], [-120, 72], [-95, 72], [-80, 68], [-62, 60], [-55, 52], [-66, 44], [-76, 38], [-81, 31], [-80, 25], [-90, 29], [-97, 26], [-105, 22], [-112, 29], [-118, 34], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
    gl: [[-55, 60], [-45, 60], [-20, 70], [-20, 80], [-60, 82], [-70, 76]],
    sa: [[-78, 8], [-70, 12], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-66, -46], [-73, -50], [-72, -30], [-71, -18], [-81, -5]],
    eu: [[-10, 36], [-9, 43], [-2, 48], [-5, 50], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [40, 55], [30, 46], [26, 40], [20, 40], [12, 38], [8, 44], [0, 38]],
    uk: [[-5, 50], [1, 51], [2, 53], [-2, 57], [-5, 58], [-6, 55]],
    af: [[-17, 21], [-13, 29], [-6, 36], [10, 37], [20, 32], [32, 31], [36, 22], [43, 12], [51, 12], [40, -2], [40, -15], [33, -26], [20, -35], [14, -28], [12, -12], [9, 4], [-8, 4], [-17, 14]],
    as: [[30, 46], [40, 55], [40, 67], [60, 70], [90, 76], [130, 72], [150, 66], [142, 52], [135, 44], [122, 40], [122, 30], [110, 20], [106, 10], [100, 2], [98, 16], [92, 22], [80, 10], [73, 18], [67, 25], [56, 25], [52, 16], [43, 13], [36, 26], [35, 32], [36, 36], [30, 36]],
    jp: [[130, 31], [135, 34], [141, 38], [142, 43], [140, 41], [135, 36]],
    au: [[114, -22], [122, -18], [131, -12], [142, -11], [146, -19], [153, -27], [150, -37], [140, -38], [130, -32], [115, -34]]
  };
  const APT = { TLV: [34.9, 32], JFK: [-73.8, 40.6], LHR: [-0.45, 51.5], CDG: [2.5, 49], DXB: [55.4, 25.2], SIN: [103.9, 1.4], HND: [139.8, 35.5], SYD: [151.2, -33.9], LAX: [-118.4, 33.9], FRA: [8.6, 50], IST: [28.8, 41], DEL: [77.1, 28.6], BKK: [100.7, 13.7], GRU: [-46.6, -23.4], CPT: [18.6, -34], MAD: [-3.6, 40.5], ATH: [23.9, 37.9], BOS: [-71, 42.4], ORD: [-87.9, 42], MIA: [-80.3, 25.8] };
  function pos(code) {
    if (APT[code]) return px(APT[code][0], APT[code][1]);
    let h = 7; for (const c of String(code)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return px(-100 + (h % 2400) / 10, -30 + ((h >> 8) % 900) / 10);
  }
  const poly = a => 'M' + a.map(p => px(p[0], p[1]).map(v => v.toFixed(1)).join(' ')).join(' L') + ' Z';
  function arc(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, k = Math.min(.28, 60 / d + .12);
    const c = [(a[0] + b[0]) / 2 - dy * k, (a[1] + b[1]) / 2 + dx * k * (dx >= 0 ? 1 : 1) - d * .14];
    return { a, b, c };
  }
  const at = (q, t) => { const u = 1 - t; return [u * u * q.a[0] + 2 * u * t * q.c[0] + t * t * q.b[0], u * u * q.a[1] + 2 * u * t * q.c[1] + t * t * q.b[1]]; };
  const ang = (q, t) => { const u = 1 - t, x = 2 * u * (q.c[0] - q.a[0]) + 2 * t * (q.b[0] - q.c[0]), y = 2 * u * (q.c[1] - q.a[1]) + 2 * t * (q.b[1] - q.c[1]); return Math.atan2(y, x) * 180 / Math.PI; };
  const PLANE = 'M-10 0 L-4 -2.4 L-4 -10 L-1.6 -10 L3 -2.4 L10 -1.2 L10 1.2 L3 2.4 L-1.6 10 L-4 10 L-4 2.4 Z';
  const ST = { 'In air': 'pos', 'On time': 'pos', 'Boarding': 'acc', 'Delayed': 'warn', 'Landed': 'mut', 'Scheduled': 'mut', 'Cancelled': 'neg', 'Departed': 'pos', 'Arrived': 'mut' };
  const chip = s => '<span class="chip ' + (ST[s] || 'mut') + '">' + esc(s) + '</span>';
  const ICO = {
    map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', alert: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>', plane: '<path d="M2 14l8-2-4-8 2-1 7 7 6-2c1-.3 2 .8 1 1.6l-5 3 1 6-2 1-3-5-4 3-1 3-2-1 1-5z" fill="currentColor" stroke="none"/>', bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/>', star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const ic = (n, s) => '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICO[n] || '') + '</svg>';

  function items(d) { const L = d.pack.live; return (L && L.items) || []; }
  function mapSvg(d, st, o) {
    const its = items(d), sel = st.sel || 0;
    const dark = d.theme.mode === 'dark';
    const water = dark ? '#0c1626' : '#d6e4f0', land = dark ? '#18273d' : '#f5f2ea', edge = dark ? '#243653' : '#c4d5e3', grat = dark ? 'rgba(255,255,255,.045)' : 'rgba(30,60,100,.07)';
    let s = '<svg class="map" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice"><rect width="' + W + '" height="' + H + '" fill="' + water + '"/>';
    for (let lon = -120; lon <= 150; lon += 30) { const x = px(lon, 0)[0]; s += '<path d="M' + x + ' 0V' + H + '" stroke="' + grat + '" fill="none"/>'; }
    for (let lat = -30; lat <= 70; lat += 20) { const y = px(0, lat)[1]; s += '<path d="M0 ' + y + 'H' + W + '" stroke="' + grat + '" fill="none"/>'; }
    Object.keys(LAND).forEach(k => { s += '<path d="' + poly(LAND[k]) + '" fill="' + land + '" stroke="' + edge + '" stroke-width="1" stroke-linejoin="round"/>'; });
    const seen = {};
    its.forEach((f, i) => {
      const a = pos(f.from), b = pos(f.to), q = arc(a, b), on = i === sel;
      const dstr = 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + q.c[0].toFixed(1) + ' ' + q.c[1].toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
      s += '<path d="' + dstr + '" fill="none" stroke="var(--acc)" stroke-width="' + (on ? 2.2 : 1) + '" stroke-opacity="' + (on ? 1 : .32) + '" ' + (on ? '' : 'stroke-dasharray="3 4"') + '/>';
      if (on) { const t = Math.max(.02, Math.min(.98, f.prog)); const mid = at(q, t); let d2 = 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1); const n = 24; for (let k = 1; k <= Math.round(n * t); k++) { const p = at(q, k / n); d2 += ' L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); } s += '<path d="' + d2 + '" fill="none" stroke="var(--acc)" stroke-width="3.2" stroke-linecap="round"/>'; }
      [[f.from, a], [f.to, b]].forEach(x => { if (seen[x[0]]) return; seen[x[0]] = 1; s += '<circle cx="' + x[1][0].toFixed(1) + '" cy="' + x[1][1].toFixed(1) + '" r="' + (on ? 4 : 3) + '" fill="' + (dark ? '#0c1626' : '#fff') + '" stroke="var(--acc)" stroke-width="1.6"/>'; if (o && o.labels) s += '<text x="' + (x[1][0] + 7).toFixed(1) + '" y="' + (x[1][1] - 6).toFixed(1) + '" font-size="9.5" font-weight="600" fill="' + (dark ? '#9fb3cf' : '#47607a') + '" font-family="var(--mono)">' + esc(x[0]) + '</text>'; });
    });
    its.forEach((f, i) => {
      if (f.prog <= 0 || f.prog >= 1) return;
      const a = pos(f.from), b = pos(f.to), q = arc(a, b), t = f.prog, p = at(q, t), r = ang(q, t), on = i === sel;
      s += '<g data-sel="' + i + '" style="cursor:pointer" transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')">' + (on ? '<circle r="15" fill="var(--acc)" fill-opacity=".18"/><circle r="22" fill="var(--acc)" fill-opacity=".08"/>' : '') + '<g transform="rotate(' + r.toFixed(0) + ') scale(' + (on ? 1.35 : 1) + ')"><path d="' + PLANE + '" fill="' + (on ? 'var(--acc)' : dark ? '#c7d6ee' : '#274566') + '" stroke="' + (dark ? '#0c1626' : '#fff') + '" stroke-width="1.2"/></g></g>';
    });
    return s + '</svg>';
  }
  function topbar(d, st) {
    const p = d.pack, tabs = [['home', 'map', 'Live map'], ['table', 'list', p.labels.table], ['approvals', 'alert', p.labels.approvals], ['settings', 'gear', 'Settings']];
    const cur = { home: 'home', workflow: 'home', table: 'table', insights: 'table', approvals: 'approvals', settings: 'settings' }[st.screen] || 'home';
    return '<header class="top"><div class="brand"><i class="mk">' + ic('plane', 15) + '</i><b>' + esc(p.name) + '</b></div><div class="srch">' + ic('search', 15) + '<span>' + esc(p.live.search || 'Search flight, route or airport') + '</span></div><nav class="tabs">' + tabs.map(t => '<a data-go="' + t[0] + '" class="' + (cur === t[0] ? 'on' : '') + '">' + ic(t[1], 16) + '<span>' + esc(t[2]) + '</span></a>').join('') + '</nav></header>';
  }
  function row(f, i, sel) {
    return '<a class="fl ' + (i === sel ? 'on' : '') + '" data-sel="' + i + '"><div class="c1"><b class="code">' + esc(f.code) + '</b><small>' + esc(String(f.line).split(' · ')[0]) + '</small></div><div class="c2"><span class="rt"><b>' + esc(f.from) + '</b>' + ic('plane', 12) + '<b>' + esc(f.to) + '</b></span><small>' + esc(f.fc) + ' to ' + esc(f.tc) + '</small></div><div class="c3">' + chip(f.status) + '<small>' + esc(f.arr) + (f.delay ? ' · +' + f.delay + ' min' : '') + '</small></div><div class="bar"><i style="width:' + Math.round(f.prog * 100) + '%"></i></div></a>';
  }
  function detailCard(d, f) {
    const pr = Math.round(f.prog * 100);
    return '<aside class="dc"><div class="dh"><div><small class="mut">' + esc(f.line) + '</small><h3>' + esc(f.code) + '</h3></div>' + chip(f.status) + '</div>' +
      '<div class="rte"><div><b class="big">' + esc(f.from) + '</b><small>' + esc(f.fc) + '</small><span class="tm">' + esc(f.dep) + '</span></div><div class="mid"><div class="pb"><i style="width:' + pr + '%"></i><em style="left:' + pr + '%">' + ic('plane', 14) + '</em></div><small>' + esc(f.dur) + '</small></div><div class="r"><b class="big">' + esc(f.to) + '</b><small>' + esc(f.tc) + '</small><span class="tm">' + esc(f.arr) + '</span></div></div>' +
      '<div class="kv"><div><small>' + esc(d.pack.live.k1 || 'Altitude') + '</small><b>' + esc(f.alt) + '</b></div><div><small>' + esc(d.pack.live.k2 || 'Speed') + '</small><b>' + esc(f.spd) + '</b></div><div><small>' + esc(d.pack.live.k3 || 'Gate') + '</small><b>' + esc(f.gate) + '</b></div></div>' +
      '<div class="acts"><a class="btn pri" data-go="workflow">' + ic('star', 14) + ' Follow</a><a class="btn" data-go="workflow">Details</a></div></aside>';
  }
  const CSS = `
*{box-sizing:border-box;margin:0}
.app{width:1280px;height:800px;position:relative;overflow:hidden;background:var(--bg);color:var(--ink);font:var(--fs,14px)/1.4 var(--ui),system-ui,sans-serif}
.map{position:absolute;inset:0;width:100%;height:100%}
small{font-size:.8em;color:var(--mut)} .mut{color:var(--mut)} b{font-weight:650}
.top{position:absolute;left:20px;right:20px;top:18px;display:flex;align-items:center;gap:14px;z-index:5}
.brand{display:flex;align-items:center;gap:9px;background:var(--surface);padding:9px 14px;border-radius:calc(var(--r) + 6px);box-shadow:0 6px 24px rgba(10,20,40,.14);font-family:var(--disp);font-weight:var(--dw);font-size:1.12em}
.mk{width:26px;height:26px;border-radius:8px;background:var(--acc);color:var(--accInk);display:grid;place-items:center}
.srch{flex:1;max-width:420px;display:flex;align-items:center;gap:9px;background:var(--surface);padding:11px 16px;border-radius:calc(var(--r) + 14px);color:var(--mut);box-shadow:0 6px 24px rgba(10,20,40,.14)}
.tabs{margin-left:auto;display:flex;gap:4px;background:var(--surface);padding:5px;border-radius:calc(var(--r) + 10px);box-shadow:0 6px 24px rgba(10,20,40,.14)}
.tabs a{display:flex;gap:7px;align-items:center;padding:8px 13px;border-radius:calc(var(--r) + 4px);color:var(--mut);cursor:pointer;font-weight:550}
.tabs a.on{background:var(--acc);color:var(--accInk)}
.panel{position:absolute;left:20px;top:84px;bottom:20px;width:372px;background:var(--surface);border-radius:calc(var(--r) + 8px);box-shadow:0 10px 36px rgba(10,20,40,.18);display:flex;flex-direction:column;overflow:hidden;z-index:4}
.phd{padding:16px 16px 10px;display:block}.phd small{display:block;margin-top:2px}.phd h2{font-family:var(--disp);font-weight:var(--dw);font-size:1.35em}
.chips{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}.fc{padding:5px 11px;border-radius:99px;border:1px solid var(--line);font-size:.86em;color:var(--mut)}.fc.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.list{overflow:auto;flex:1}
.fl{display:grid;grid-template-columns:96px 1fr auto;gap:2px 10px;padding:11px 16px;position:relative;cursor:pointer;border-top:1px solid var(--line);align-items:center}
.fl.on{background:var(--soft)}.fl:hover{background:var(--soft)}
.fl .code{font-family:var(--mono);font-size:1em}.fl small{display:block}
.fl .rt{display:flex;gap:7px;align-items:center;font-family:var(--mono)}.fl .rt svg{color:var(--mut)}
.c3{text-align:right}.c3 small{display:block;margin-top:3px}
.bar{grid-column:1/4;height:3px;background:var(--line);border-radius:3px;margin-top:6px;overflow:hidden}.bar i{display:block;height:100%;background:var(--acc)}
.chip{display:inline-block;padding:2px 9px;border-radius:99px;font-size:.78em;font-weight:600;background:var(--soft);color:var(--mut)}
.chip.pos{background:color-mix(in srgb,var(--pos) 16%,transparent);color:var(--pos)}.chip.warn{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}.chip.neg{background:color-mix(in srgb,var(--neg) 16%,transparent);color:var(--neg)}.chip.acc{background:var(--soft);color:var(--acc)}
.dc{position:absolute;right:20px;bottom:20px;width:400px;background:var(--surface);border-radius:calc(var(--r) + 8px);padding:18px;box-shadow:0 10px 36px rgba(10,20,40,.2);z-index:4}
.dh{display:flex;justify-content:space-between;align-items:flex-start}.dh h3{font-family:var(--disp);font-weight:var(--dw);font-size:1.7em;line-height:1.1}
.rte{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin:16px 0 12px}.rte .big{font-family:var(--disp);font-weight:var(--dw);font-size:2.1em;display:block;line-height:1}.rte small{display:block;margin-top:3px}.r{text-align:right}
.tm{display:block;margin-top:8px;font-family:var(--mono);font-size:1.08em;font-weight:600}
.mid{text-align:center}.pb{position:relative;height:3px;background:var(--line);border-radius:3px;margin:0 0 8px}.pb i{position:absolute;left:0;top:0;bottom:0;background:var(--acc);border-radius:3px}.pb em{position:absolute;top:-9px;transform:translateX(-50%) rotate(0);color:var(--acc);font-style:normal;background:var(--surface);padding:0 2px}
.kv{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:var(--bg);border-radius:var(--r);padding:12px;margin-top:6px}.kv small{display:block}.kv b{font-family:var(--mono);font-size:.98em}
.acts{display:flex;gap:8px;margin-top:14px}.btn{flex:1;text-align:center;padding:10px;border-radius:calc(var(--r) + 2px);border:1px solid var(--line);font-weight:600;cursor:pointer;display:flex;gap:6px;align-items:center;justify-content:center}.btn.pri{background:var(--acc);color:var(--accInk);border-color:var(--acc)}
.legend{position:absolute;right:20px;top:84px;display:flex;gap:8px;z-index:4}.legend span{background:var(--surface);padding:7px 12px;border-radius:99px;font-size:.84em;box-shadow:0 4px 16px rgba(10,20,40,.12)}.legend b{font-family:var(--mono)}
.page{position:absolute;left:20px;right:20px;top:84px;bottom:20px;background:var(--surface);border-radius:calc(var(--r) + 8px);box-shadow:0 10px 36px rgba(10,20,40,.14);overflow:auto;padding:22px 26px;z-index:3}
.page h2{font-family:var(--disp);font-weight:var(--dw);font-size:1.7em;margin-bottom:4px}
.bd{width:100%;border-collapse:collapse;margin-top:14px}.bd th{text-align:left;font-size:.74em;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:600;padding:8px 10px;border-bottom:1px solid var(--line)}.bd td{padding:12px 10px;border-bottom:1px solid var(--line);font-family:var(--mono)}.bd td.ui{font-family:var(--ui)}.bd tr{cursor:pointer}.bd tr:hover td,.bd tr.on td{background:var(--soft)}.bd .tt{font-size:1.25em;font-weight:600}
.two{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;margin-top:14px}.tl{border-left:2px solid var(--line);margin-left:6px;padding-left:18px}.tl div{position:relative;padding:0 0 18px}.tl div:before{content:"";position:absolute;left:-25px;top:3px;width:12px;height:12px;border-radius:50%;background:var(--surface);border:2px solid var(--line)}.tl div.done:before{background:var(--acc);border-color:var(--acc)}.tl b{display:block}.mini{height:300px;border-radius:var(--r);overflow:hidden;position:relative}.mini .map{position:absolute}
.set{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px}.sc{border:1px solid var(--line);border-radius:var(--r);padding:16px}.sc h4{margin-bottom:8px}.sr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid var(--line)}.tg{width:34px;height:20px;border-radius:12px;background:var(--line);position:relative}.tg.on{background:var(--acc)}.tg:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff}.tg.on:after{left:16px}
`;
  function view(d, st) {
    const its = items(d), p = d.pack, S = (st.screen === 'table' && st.row != null) ? 'workflow' : st.screen, sel = Math.min(st.row != null ? st.row : (st.sel || 0), its.length - 1), f = its[sel] || its[0];
    let body;
    if (S === 'home') {
      const n = d.flags.dense ? 7 : 5;
      body = mapSvg(d, st, { labels: true }) + '<section class="panel"><div class="phd"><h2>' + esc(p.live.title || 'Flights near you') + '</h2><small>' + its.length + ' ' + esc(p.live.unit || 'flights') + ' · updated just now</small><div class="chips"><span class="fc on">All</span><span class="fc">' + esc(p.live.f1 || 'Departing') + '</span><span class="fc">' + esc(p.live.f2 || 'Arriving') + '</span><span class="fc">Delayed</span></div></div><div class="list">' + its.slice(0, n + 3).map((x, i) => row(x, i, sel)).join('') + '</div></section>' + detailCard(d, f) +
        '<div class="legend"><span><b>' + its.filter(x => x.prog > 0 && x.prog < 1).length + '</b> ' + esc(p.live.air || 'in the air') + '</span><span><b>' + its.filter(x => x.delay).length + '</b> ' + esc(p.live.late || 'delayed') + '</span></div>';
    } else if (S === 'table' || S === 'insights') {
      body = '<section class="page"><h2>' + esc(p.labels.table) + '</h2><small>' + esc(p.live.sub || 'Scheduled times, live status and gates') + '</small><table class="bd"><thead><tr><th>' + esc(p.live.h1 || 'Flight') + '</th><th>Route</th><th>Departs</th><th>Arrives</th><th>' + esc(p.live.k3 || 'Gate') + '</th><th>Status</th></tr></thead><tbody>' + its.map((x, i) => '<tr data-go="workflow" data-row="' + i + '" class="' + (i === sel ? 'on' : '') + '"><td class="ui"><b>' + esc(x.code) + '</b><br><small>' + esc(x.line) + '</small></td><td>' + esc(x.from) + ' → ' + esc(x.to) + '<br><small>' + esc(x.fc) + ' to ' + esc(x.tc) + '</small></td><td class="tt">' + esc(x.dep) + '</td><td class="tt">' + esc(x.arr) + (x.delay ? '<br><small style="color:var(--warn)">+' + x.delay + ' min</small>' : '') + '</td><td>' + esc(x.gate) + '</td><td class="ui">' + chip(x.status) + '</td></tr>').join('') + '</tbody></table></section>';
    } else if (S === 'workflow') {
      const steps = [[f.dep, 'Departed ' + f.fc, 1], ['', f.status === 'Delayed' ? 'Delayed by ' + f.delay + ' minutes' : 'On schedule', f.prog > .1 ? 1 : 0], ['', 'Cruising at ' + f.alt, f.prog > .3 ? 1 : 0], ['', 'Descent into ' + f.tc, f.prog > .85 ? 1 : 0], [f.arr, 'Arrival at ' + f.tc, f.prog >= 1 ? 1 : 0]];
      body = '<section class="page"><small class="mut">' + esc(f.line) + '</small><h2>' + esc(f.code) + ' · ' + esc(f.fc) + ' to ' + esc(f.tc) + '</h2><div>' + chip(f.status) + '</div><div class="two"><div class="tl">' + steps.map(s => '<div class="' + (s[2] ? 'done' : '') + '"><b>' + esc(s[1]) + '</b><small>' + (s[0] ? esc(s[0]) : '&nbsp;') + '</small></div>').join('') + '<div class="kv"><div><small>' + esc(p.live.k1 || 'Altitude') + '</small><b>' + esc(f.alt) + '</b></div><div><small>' + esc(p.live.k2 || 'Speed') + '</small><b>' + esc(f.spd) + '</b></div><div><small>' + esc(p.live.k3 || 'Gate') + '</small><b>' + esc(f.gate) + '</b></div></div></div><div class="mini">' + mapSvg(d, Object.assign({}, st, { sel }), { labels: true }) + '</div></div></section>';
    } else {
      const sets = (p.settings || []).slice(0, 4);
      body = '<section class="page"><h2>' + (S === 'approvals' ? esc(p.labels.approvals) : 'Settings') + '</h2><small>' + (S === 'approvals' ? 'Get notified when something changes' : 'Notifications, units and your followed items') + '</small><div class="set">' + sets.map((g, gi) => '<div class="sc"><h4>' + esc(g[0]) + '</h4>' + g[1].map((r, ri) => '<div class="sr"><span>' + esc(r[0]) + '</span>' + (/^(on|off)$/i.test(r[1]) ? '<i class="tg ' + (/^on$/i.test(r[1]) ? 'on' : '') + '"></i>' : '<small>' + esc(r[1]) + '</small>') + '</div>').join('') + '</div>').join('') + '</div></section>';
    }
    return '<div class="app" style="' + g.PRODUCT_VARS(d) + '"><style>' + CSS + '</style>' + body + topbar(d, st) + '</div>';
  }
  g.LIVE = { view };
})(window);
