/* Taste model. A product direction is a point on 8 axes; every swipe moves an estimate of the user's
   position on each axis, in proportion to how strongly the direction expressed that axis. */
(function (g) {
  'use strict';
  const D = g.DOMAIN;
  const AXES = [
    { id: 'density', npLo: 'spacious layouts', npHi: 'dense layouts', adjLo2: 'spacious', adjHi2: 'dense', name: 'Information density', lo: 'Spacious', hi: 'Dense', adjLo: 'spacious', adjHi: 'dense' },
    { id: 'flow', npLo: 'data-first screens', npHi: 'guided workflows', adjLo2: 'data-first', adjHi2: 'workflow-first', name: 'Workflow orientation', lo: 'Data-first', hi: 'Workflow-driven', adjLo: 'data-first', adjHi: 'workflow-first' },
    { id: 'viz', npLo: 'table-first views', npHi: 'chart-led views', adjLo2: 'table-first', adjHi2: 'chart-led', name: 'Visual exploration', lo: 'Table-first', hi: 'Visualization-heavy', adjLo: 'table-first', adjHi: 'chart-led' },
    { id: 'nav', npLo: 'contextual navigation', npHi: 'persistent navigation', adjLo2: 'contextual', adjHi2: 'navigable', name: 'Navigation model', lo: 'Contextual', hi: 'Persistent', adjLo: 'contextual navigation', adjHi: 'persistent navigation' },
    { id: 'config', npLo: 'opinionated defaults', npHi: 'deep configuration', adjLo2: 'opinionated', adjHi2: 'configurable', name: 'Configuration', lo: 'Opinionated', hi: 'Configurable', adjLo: 'opinionated defaults', adjHi: 'deep configuration' },
    { id: 'power', npLo: 'approachable simplicity', npHi: 'power-user tools', adjLo2: 'approachable', adjHi2: 'powerful', name: 'Power', lo: 'Approachable', hi: 'Power users', adjLo: 'approachable', adjHi: 'powerful' },
    { id: 'register', npLo: 'a consumer-friendly feel', npHi: 'an enterprise feel', adjLo2: 'consumer-friendly', adjHi2: 'enterprise-grade', name: 'Tone', lo: 'Consumer-grade', hi: 'Enterprise-grade', adjLo: 'consumer-friendly', adjHi: 'enterprise-grade' },
    { id: 'auto', npLo: 'explicit control', npHi: 'automation', adjLo2: 'hands-on', adjHi2: 'automation-led', name: 'Automation', lo: 'Explicit control', hi: 'Automation-led', adjLo: 'explicit controls', adjHi: 'automation' }
  ];
  const AX = {}; AXES.forEach((a, i) => AX[a.id] = i);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  //            density flow   viz    nav    config power  register auto
  const ARCH = {
    dense: { vec: [.9, -.6, -.5, .8, .7, .9, .9, -.4], names: ['Dense Enterprise', 'Operations Ledger', 'Control Grid'], h: 218, s: 68, mode: 'light', f: ['IBM Plex Sans', 'IBM Plex Mono', 'IBM Plex Sans'], phil: 'Trust power users. Show everything, hide nothing.' },
    calm: { vec: [-.7, .1, -.1, -.3, -.6, -.4, -.1, .3], names: ['Calm Workspace', 'Quiet Desk', 'Focus Studio'], h: 142, s: 26, mode: 'light', f: ['Instrument Sans', 'DM Mono', 'Instrument Serif'], phil: 'Reduce the noise. Reveal complexity only when it is needed.' },
    command: { vec: [.5, -.2, .9, .3, .2, .6, .5, .5], names: ['Command Center', 'Mission Control', 'Signal Room'], h: 188, s: 86, mode: 'dark', f: ['Inter Tight', 'JetBrains Mono', 'Inter Tight'], phil: 'See the whole system. Act from wherever you are.' },
    guided: { vec: [-.3, .9, -.4, -.6, -.7, -.7, -.5, .7], names: ['Guided Planning', 'Workflow First', 'Step by Step'], h: 262, s: 58, mode: 'light', f: ['Figtree', 'DM Mono', 'Fraunces'], phil: 'The product knows the process. You make the decisions.' },
    autopilot: { vec: [-.2, .5, .3, -.8, -.9, -.2, 0, .95], names: ['Autopilot', 'Exceptions Only', 'Quiet Assistant'], h: 26, s: 88, mode: 'light', f: ['Hanken Grotesk', 'DM Mono', 'Hanken Grotesk'], phil: 'Automate the routine. Surface only the exceptions.' },
    sheet: { vec: [.8, -.8, -.8, .2, .9, .8, .4, -.8], names: ['Spreadsheet Native', 'The Grid', 'Formula Forward'], h: 150, s: 52, mode: 'light', f: ['Source Sans 3', 'Source Code Pro', 'Source Sans 3'], phil: 'Meet people where they already work: in the grid.' },
    studio: { vec: [.3, -.4, .8, 0, .6, .7, .2, -.2], names: ['Analyst Studio', 'Chart First', 'The Explorer'], h: 340, s: 70, mode: 'light', f: ['Manrope', 'JetBrains Mono', 'Space Grotesk'], phil: 'Start from the question. Let charts be the interface.' },
    process: { vec: [.1, .8, -.2, .5, .1, .2, .6, -.3], names: ['Process Spine', 'Review Room', 'Pipeline Desk'], h: 204, s: 74, mode: 'light', f: ['DM Sans', 'DM Mono', 'DM Sans'], phil: 'Every task has a place in the process, and a person responsible.' }
  };
  const FONT_W = { 'IBM Plex Sans': '400;500;600', 'IBM Plex Mono': '400;500', 'Instrument Sans': '400;500;600', 'Instrument Serif': '400', 'Inter Tight': '400;500;600;700', 'JetBrains Mono': '400;500', 'Figtree': '400;500;600;700', 'Fraunces': '400;600', 'DM Mono': '400;500', 'Hanken Grotesk': '400;500;600;700', 'Source Sans 3': '400;600;700', 'Source Code Pro': '400;500', 'Manrope': '400;600;700', 'Space Grotesk': '400;500;700', 'DM Sans': '400;500;600' };

  /* ───── colour ───── */
  function hsl(h, s, l) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
  function themeFor(arch, seed) {
    const A = ARCH[arch], r = D.rng(seed * 101 + 7), h = A.h + (r() - .5) * 28, s = clamp(A.s + (r() - .5) * 14, 18, 95);
    const dark = A.mode === 'dark';
    const t = dark ? { bg: hsl(h, 30, 7), surface: hsl(h, 26, 11), raised: hsl(h, 24, 15), ink: hsl(h, 14, 94), mut: hsl(h, 10, 63), line: hsl(h, 20, 20), acc: hsl(h, s, 60), accInk: hsl(h, 40, 8), pos: '#4ade80', neg: '#ff6b6b', warn: '#fbbf24' }
      : { bg: arch === 'sheet' ? hsl(h, 8, 96) : hsl(h, arch === 'calm' ? 18 : 14, 97), surface: arch === 'calm' ? hsl(h, 20, 99) : '#ffffff', raised: hsl(h, 14, 95), ink: hsl(h, 32, 12), mut: hsl(h, 10, 42), line: hsl(h, 14, 89), acc: hsl(h, s, 43), accInk: '#ffffff', pos: '#12803a', neg: '#c4281c', warn: '#a86200' };
    t.acc2 = hsl(h + 38 + r() * 30, dark ? 70 : 62, dark ? 66 : 48);
    t.soft = hsl(h, dark ? 40 : 60, dark ? 16 : 94);   // tinted fill behind accent text
    t.mode = A.mode; t.h = h; t.fonts = { ui: A.f[0], mono: A.f[1], disp: A.f[2] };
    return t;
  }
  function fontsHref(f) {
    const q = n => 'family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':wght@' + FONT_W[n];
    return [...new Set([f.ui, f.mono, f.disp])].map(n => 'https://fonts.googleapis.com/css2?' + q(n) + '&display=swap');
  }

  /* ───── how a point on the axes becomes concrete UI decisions ───── */
  function flags(v) {
    const [density, flow, viz, nav, config, power, register, auto] = v;
    const dn = (density + 1) / 2, rn = (register + 1) / 2;
    return {
      navModel: nav > .4 ? 'sidebar' : nav > -.05 ? 'rail' : nav > -.5 ? 'top' : 'command',
      home: viz > .25 && viz >= flow ? 'chart' : flow > .25 ? 'flow' : 'table',
      detail: nav < .1 ? 'drawer' : 'page',
      wizard: flow > .2, charts: viz > .2, ai: auto > .25, manual: auto < -.25, cfg: config > .2,
      pro: power > .15, soft: power < -.2, dense: density > .25, airy: density < -.25,
      u: +(8.5 - 4.6 * dn).toFixed(2), fs: +(15 - 2.8 * dn).toFixed(2), row: Math.round(46 - 20 * dn), r: Math.round(15 - 12 * rn),
      cols: clamp(Math.round(4.2 + 2.2 * ((power + 1) / 2) + 2 * dn), 4, 8)
    };
  }

  /* ───── learning ───── */
  function learn(hist) {
    const S = Array(8).fill(0), W = Array(8).fill(0);
    hist.forEach(h => h.vec.forEach((x, i) => { S[i] += h.r * x; W[i] += Math.abs(x); }));
    return { taste: S.map((s, i) => s / (W[i] + .6)), conf: W.map(w => w / (w + 2)) };
  }
  function meters(L) {
    const t = L.taste, c = L.conf, m = a => (a + 1) / 2;
    const avg = (...ix) => ix.reduce((s, i) => s + c[i], 0) / ix.length;
    return [
      { name: 'Information density', v: m(t[0]), c: c[0], lo: 'Spacious', hi: 'Dense' },
      { name: 'Workflow orientation', v: m(t[1]), c: c[1], lo: 'Data-first', hi: 'Workflow-led' },
      { name: 'Visual exploration', v: m(t[2]), c: c[2], lo: 'Tables', hi: 'Charts' },
      { name: 'Automation', v: m(t[7]), c: c[7], lo: 'Manual', hi: 'Automated' },
      { name: 'Progressive disclosure', v: m(-(t[4] * .5 + t[5] * .3 + t[0] * .2)), c: avg(4, 5, 0), lo: 'Show all', hi: 'Reveal as needed' }
    ];
  }
  function summary(L) {
    const idx = L.taste.map((t, i) => [i, Math.abs(t) * L.conf[i]]).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(x => x[1] > .08);
    if (!idx.length) return 'Still guessing. React to a few directions.';
    const words = idx.map(([i]) => L.taste[i] > 0 ? AXES[i].npHi : AXES[i].npLo);
    return 'You lean toward ' + (words.length > 1 ? words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1] : words[0]) + '.';
  }
  const MSG = {
    density: ['Noted. You want room to breathe.', 'Got it. You prefer information-rich layouts.'],
    flow: ['Understood. You want the data front and center.', 'Got it. You like guided, workflow-led experiences.'],
    viz: ['Noted. You trust a good table.', 'Got it. You think in charts first.'],
    nav: ['Understood. Navigation should appear when you need it.', 'Got it. Persistent navigation feels right.'],
    config: ['Noted. You want the product to be opinionated for you.', 'Got it. You want control over how it is set up.'],
    power: ['Noted. Approachable beats powerful here.', 'Got it. You are building for power users.'],
    register: ['Understood. Friendlier, more consumer-like.', 'Got it. A serious, enterprise-grade feel.'],
    auto: ['Noted. Explicit controls, everything visible.', 'Got it. Let the product do the work.']
  };
  function reaction(before, after, first) {
    let best = 0, bi = 0;
    after.taste.forEach((t, i) => { const d = Math.abs(t * after.conf[i] - before.taste[i] * before.conf[i]); if (d > best) { best = d; bi = i; } });
    const s = after.taste[bi] > 0 ? 1 : 0;
    return { axis: bi, text: MSG[AXES[bi].id][s] };
  }
  function ready(hist) { const L = learn(hist), mc = L.conf.reduce((a, b) => a + b, 0) / 8; return hist.length >= 7 || (hist.length >= 6 && mc > .66); }
  const closing = hist => hist.length >= 5;

  /* ───── generating directions ───── */
  const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
  function nearest(v) { let best = null, bd = 9; for (const k in ARCH) { const d = dist(v, ARCH[k].vec); if (d < bd) { bd = d; best = k; } } return best; }

  function blurb(arch, p) {
    const e = p.e[1].toLowerCase();
    return {
      dense: `Every ${p.e[0]} one glance away: grids, filters and keyboard shortcuts for people who live in ${p.name} all day.`,
      calm: `A quiet place to work on ${e}. One thing at a time, with detail that appears when you ask for it.`,
      command: `A live picture of ${e} and what needs attention, with the controls right where the signals are.`,
      guided: `${p.name} walks the team through ${p.workflow ? p.workflow.name.toLowerCase() : 'the process'} step by step, so nobody has to remember what comes next.`,
      autopilot: `The routine ${e} are handled for you. ${p.name} brings you only the exceptions, with a recommendation attached.`,
      sheet: `${p.e[1]} as a grid you can shape: familiar editing, formulas and views, built for the way finance already thinks.`,
      studio: `Ask a question, get a chart, follow the thread. ${p.name} is built for exploring ${e} rather than reporting them.`,
      process: `A visible process spine with owners, status and sign-off at every stage of ${p.workflow ? p.workflow.name.toLowerCase() : 'the work'}.`
    }[arch];
  }
  const NAVTXT = { sidebar: 'Persistent sidebar with grouped sections', rail: 'Icon rail with a contextual panel', top: 'Top tabs with search first', command: 'No fixed menu. A command bar and contextual links' };
  function decisions(f) {
    return [
      ['Navigation', NAVTXT[f.navModel]],
      ['Home', { chart: 'Chart-led overview with alerts', flow: 'Starts with the next step in the cycle', table: 'Table-first overview, detail on demand' }[f.home]],
      ['Records', f.detail === 'drawer' ? 'Slide-over detail keeps your place' : 'Full-page record with tabs'],
      ['Control', f.ai ? 'The assistant proposes, you approve' : f.manual ? 'Every change is explicit and reviewable' : 'Sensible defaults with easy overrides'],
      ['Setup', f.cfg ? 'Deep configuration for every team' : 'Opinionated presets, advanced on demand'],
      ['Density', f.dense ? 'Compact rows and keyboard shortcuts' : f.airy ? 'Generous spacing, one task at a time' : 'Balanced spacing']
    ];
  }
  function tagsFor(v) {
    return v.map((x, i) => [i, Math.abs(x)]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => v[i] > 0 ? AXES[i].hi : AXES[i].lo);
  }

  function makeDirection(vec, seed, ctx, over) {
    vec = vec.map(x => clamp(+x.toFixed(2), -.95, .95));
    const arch = nearest(vec), A = ARCH[arch], used = ctx.used;
    let name = A.names.find(n => !used.has(n)) || (A.names[0] + ' ' + (used.size % 5 + 2));
    used.add(name);
    const f = flags(vec), letter = String.fromCharCode(65 + (ctx.count++ % 26));
    return Object.assign({
      id: seed, seed, vec, arch, name, letter, flags: f, theme: themeFor(arch, seed), pack: ctx.pack, packKey: ctx.packKey,
      explain: blurb(arch, ctx.pack), philosophy: A.phil, decisions: decisions(f), tags: tagsFor(vec)
    }, over || {});
  }
  const START = ['dense', 'calm', 'command', 'guided', 'autopilot', 'sheet'];
  function initialDirections(ctx, seed) { return START.map((k, i) => makeDirection(ARCH[k].vec, seed + i, ctx)); }

  /* next direction: lean into what is known, probe what is not, stay away from what was already shown */
  function nextDirection(hist, shown, ctx, seed) {
    const L = learn(hist), r = D.rng(seed * 13 + hist.length * 977);
    const order = L.conf.map((c, i) => [i, c + r() * .22]).sort((a, b) => a[1] - b[1]);
    const probes = [order[0][0], order[1][0]];
    const lastVec = shown.length ? shown[shown.length - 1].vec : null;
    let v = L.taste.map((t, i) => clamp(t * (1 + .35 * L.conf[i]) + (r() - .5) * .5 * (1 - L.conf[i]), -.95, .95));
    probes.forEach((i, k) => {
      const seen = shown.map(s => s.vec[i]).reduce((a, b) => a + b, 0) / Math.max(1, shown.length);
      const sign = Math.abs(seen) > .15 ? (seen > 0 ? -1 : 1) : (r() < .5 ? -1 : 1);
      v[i] = sign * (k === 0 ? .65 + r() * .3 : .45 + r() * .3);
    });
    for (let tries = 0; tries < 6; tries++) {
      const dmin = Math.min(...shown.map(s => dist(v, s.vec)), 9);
      if (dmin >= .9) break;
      const i = Math.floor(r() * 8); v[i] = clamp(-v[i] * .8 + (r() - .5) * .4, -.95, .95);
    }
    const push = L.taste.map((t, i) => [i, Math.abs(t) * L.conf[i]]).sort((a, b) => b[1] - a[1]).slice(0, 2).filter(x => x[1] > .1).map(([i]) => L.taste[i] > 0 ? AXES[i].hi : AXES[i].lo);
    const d = makeDirection(v, seed, ctx);
    d.why = { push, probe: probes.map(i => AXES[i].name) };
    return d;
  }
  function finalDirection(hist, ctx, seed) {
    const L = learn(hist);
    const v = L.taste.map((t, i) => clamp(t * (.55 + .45 * L.conf[i]) * 1.3, -.95, .95));
    const d = makeDirection(v, seed, { ...ctx, used: new Set() }, {});
    d.closest = d.name; d.name = ctx.pack.name; d.final = true;
    return d;
  }

  g.MODEL = { AXES, AX, ARCH, learn, meters, summary, reaction, ready, closing, makeDirection, initialDirections, nextDirection, finalDirection, flags, themeFor, fontsHref, tagsFor, decisions, blurb, hsl, nearest };
})(window);
