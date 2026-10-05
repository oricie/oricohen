/* Brand & website mode. Same taste-learning loop as the product mode, but the axes describe a brand,
   and a direction renders as a logo, palette, type pairing and a real website (via swipe/gen.js, window.MM). */
(function (g) {
  'use strict';
  const MM = g.MM, D = g.DOMAIN, MD = g.MODEL;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const AXES = [
    { id: 'warm', name: 'Warmth', lo: 'Cool', hi: 'Warm', npLo: 'cool, composed colour', npHi: 'warm colour', adjLo2: 'cool', adjHi2: 'warm' },
    { id: 'energy', name: 'Energy', lo: 'Quiet', hi: 'Bold', npLo: 'quiet confidence', npHi: 'bold energy', adjLo2: 'quiet', adjHi2: 'bold' },
    { id: 'play', name: 'Playfulness', lo: 'Serious', hi: 'Playful', npLo: 'a serious tone', npHi: 'a playful tone', adjLo2: 'serious', adjHi2: 'playful' },
    { id: 'classic', name: 'Classic or modern', lo: 'Modern', hi: 'Classic', npLo: 'modern type', npHi: 'classic, editorial type', adjLo2: 'modern', adjHi2: 'classic' },
    { id: 'rich', name: 'Expressiveness', lo: 'Minimal', hi: 'Expressive', npLo: 'minimal layouts', npHi: 'expressive layouts', adjLo2: 'minimal', adjHi2: 'expressive' },
    { id: 'tone', name: 'Light or dark', lo: 'Light', hi: 'Dark', npLo: 'light backgrounds', npHi: 'a dark theme', adjLo2: 'light', adjHi2: 'dark' },
    { id: 'shape', name: 'Shape', lo: 'Sharp', hi: 'Soft', npLo: 'sharp edges', npHi: 'soft, rounded shapes', adjLo2: 'sharp-edged', adjHi2: 'soft' },
    { id: 'symbol', name: 'Logo style', lo: 'Wordmark-led', hi: 'Symbol-led', npLo: 'wordmark-led logos', npHi: 'symbol-led logos', adjLo2: 'wordmark-led', adjHi2: 'symbol-led' }
  ];
  //            warm   energy play   classic rich   tone   shape  symbol
  const ARCH = {
    editorial: { vec: [.8, -.2, -.1, .8, 0, -.3, .1, .2], names: ['Warm Editorial', 'Paper & Ink', 'The Gazette'], phil: 'Unhurried and made by hand. Let the typography carry the personality.', blurb: 'Warm paper tones and a confident serif. It feels crafted, a little nostalgic, and built to last.' },
    minimal: { vec: [-.2, -.7, -.5, -.3, -.8, -.4, -.3, -.6], names: ['Quiet Minimal', 'Clear Glass', 'White Space'], phil: 'Say less. Make every element earn its place.', blurb: 'Restrained colour, generous space and a plain wordmark. Calm, precise and easy to trust.' },
    pop: { vec: [.3, .9, .6, -.6, .7, -.2, .3, .6], names: ['Bold Pop', 'Loud & Proud', 'Colour Block'], phil: 'Be unmistakable. Big colour, big type, no apology.', blurb: 'Saturated colour blocks, oversized headlines and a mark you can spot from across the street.' },
    night: { vec: [-.4, .3, -.4, -.2, .2, .95, -.1, .5], names: ['Nocturne', 'After Hours', 'Deep Field'], phil: 'Confident in the dark. Light is used on purpose.', blurb: 'A deep, moody palette with bright accents. Sharp, modern and a little cinematic.' },
    friendly: { vec: [.6, .2, .95, -.5, .5, -.6, .9, .7], names: ['Friendly Round', 'Good Neighbour', 'Sunny Side'], phil: 'Approachable first. Soft shapes, warm colour, a smile in the type.', blurb: 'Rounded type and soft corners with warm, friendly colour. It feels like a good neighbour.' },
    craft: { vec: [.7, -.1, -.3, .9, .3, -.4, -.2, .8], names: ['Classic Craft', 'Old Town', 'Hallmark'], phil: 'Heritage you can see. A seal, a serif, a promise of quality.', blurb: 'A badge-style mark and traditional serif type. It signals a trade that takes pride in its work.' }
  };
  const START = ['editorial', 'minimal', 'pop', 'night', 'friendly', 'craft'];
  const LOGO = { side: 'Mark and wordmark side by side', stack: 'Mark stacked above the wordmark', badge: 'A round seal badge', word: 'Wordmark only', pill: 'Wordmark in a pill' };
  const LAY = { split: 'Split hero with a poster image', bold: 'Full-colour hero, oversized headline', center: 'Centred hero with a wide image strip', panel: 'Hero inside a soft panel' };
  const FEEL = { dark: 'Dark and moody', color: 'Saturated colour', cream: 'Warm and papery', light: 'Light and clean' };
  const HUES = [[15, 'red'], [40, 'orange'], [65, 'golden'], [95, 'lime'], [165, 'green'], [195, 'teal'], [225, 'blue'], [265, 'indigo'], [300, 'purple'], [335, 'magenta'], [360, 'red']];
  const hueName = h => (HUES.find(x => (h % 360) < x[0]) || HUES[0])[1];

  /* taste vector -> concrete design overrides for gen.js */
  function overrides(v, seed) {
    const [warm, energy, play, classic, rich, tone, shape, symbol] = v, r = D.rng(seed * 31 + 5);
    let hue = 215 - (warm + 1) / 2 * 190 + (r() - .5) * 30;
    if (play > .55) hue = warm > .1 ? 345 + (r() * 50 - 10) : 280 + r() * 40;
    hue = (hue + 360) % 360;
    const sat = 34 + (energy + 1) / 2 * 56 + (rich > 0 ? 6 : 0);
    const mode = tone > .45 ? 'dark' : (energy > .5 && rich > .25) ? 'color' : (warm > .25 && classic > .15) ? 'cream' : 'light';
    const cat = classic > .4 ? 'serif' : play > .45 ? 'round' : (energy > .6 && classic < 0) ? 'bold' : (tone > .5 && energy < .4 && classic < -.2) ? 'mono' : 'sans';
    const logoStyle = symbol > .5 ? (classic > .35 ? 'badge' : pick(r, ['stack', 'side'])) : symbol < -.3 ? (energy > .4 ? 'pill' : 'word') : 'side';
    const container = classic > .4 ? 'outline' : shape > .45 ? pick(r, ['circle', 'squircle']) : shape < -.35 ? pick(r, ['square', 'none']) : pick(r, ['squircle', 'none', 'square']);
    const radius = [0, 6, 14, 22, 32][clamp(Math.round((shape + 1) / 2 * 4), 0, 4)];
    const layout = energy > .5 ? 'bold' : rich > .45 ? pick(r, ['panel', 'bold']) : rich < -.35 ? pick(r, ['center', 'split']) : 'split';
    const art = rich > .45 ? pick(r, ['collage', 'pattern']) : rich < -.35 ? pick(r, ['arcs', 'poster']) : 'poster';
    const wcase = classic > .4 ? 'normal' : energy > .45 ? 'upper' : (classic < -.2 && energy < -.2) ? 'lower' : 'normal';
    return { pal: { hue, sat, mode }, cat, logoStyle, container, radius, layout, art, wcase, dot: rich > .2 && r() < .6, usePhoto: r() < .55 };
  }

  const nearest = v => { let best = null, bd = 9; for (const k in ARCH) { const d = Math.sqrt(v.reduce((s, x, i) => s + (x - ARCH[k].vec[i]) ** 2, 0)); if (d < bd) { bd = d; best = k; } } return best; };
  const tagsFor = v => v.map((x, i) => [i, Math.abs(x)]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => v[i] > 0 ? AXES[i].hi : AXES[i].lo);

  function decisions(d) {
    const v = d.v, P = v.pal;
    return [['Colour', FEEL[P.mode] + ', ' + hueName(P.hue)], ['Type', v.fonts.d + ' with ' + v.fonts.b], ['Logo', LOGO[v.logoStyle]], ['Layout', LAY[v.layout]], ['Shape', v.radius === 0 ? 'Sharp corners' : v.radius <= 6 ? 'Lightly softened corners' : 'Soft, rounded corners'], ['Voice', '“' + v.head + '”']];
  }
  function makeDirection(vec, seed, ctx, over) {
    vec = vec.map(x => clamp(+x.toFixed(2), -.95, .95));
    const arch = nearest(vec), A = ARCH[arch];
    const name = A.names.find(n => !ctx.used.has(n)) || (A.names[0] + ' ' + (ctx.used.size % 5 + 2));
    ctx.used.add(name);
    const v = MM.makeVariant(ctx.brief, seed, null, overrides(vec, seed));
    const d = { id: seed, seed, vec, arch, name, letter: String.fromCharCode(65 + (ctx.count++ % 26)), v, kind: 'brand', packKey: 'brand', pack: { name: v.name, kind: 'Brand & website', labels: { site: 'Website', scroll: 'Page', brand: 'Brand board' }, groups: {} }, theme: { raised: MM.mix(v.pal.bg, v.pal.ink, .07), bg: v.pal.bg }, tags: tagsFor(vec), explain: A.blurb, philosophy: A.phil };
    d.decisions = decisions(d);
    return Object.assign(d, over || {});
  }
  const initialDirections = (ctx, seed) => START.map((k, i) => makeDirection(ARCH[k].vec, seed + i, ctx));

  function nextDirection(hist, shown, ctx, seed) {
    const L = MD.learn(hist), r = D.rng(seed * 13 + hist.length * 977);
    const order = L.conf.map((c, i) => [i, c + r() * .22]).sort((a, b) => a[1] - b[1]), probes = [order[0][0], order[1][0]];
    const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
    let v = L.taste.map((t, i) => clamp(t * (1 + .35 * L.conf[i]) + (r() - .5) * .5 * (1 - L.conf[i]), -.95, .95));
    probes.forEach((i, k) => { const seen = shown.map(s => s.vec[i]).reduce((a, b) => a + b, 0) / Math.max(1, shown.length); const sign = Math.abs(seen) > .15 ? (seen > 0 ? -1 : 1) : (r() < .5 ? -1 : 1); v[i] = sign * (k === 0 ? .65 + r() * .3 : .45 + r() * .3); });
    for (let t = 0; t < 6; t++) { if (Math.min(...shown.map(s => dist(v, s.vec)), 9) >= .9) break; const i = Math.floor(r() * 8); v[i] = clamp(-v[i] * .8 + (r() - .5) * .4, -.95, .95); }
    const push = L.taste.map((t, i) => [i, Math.abs(t) * L.conf[i]]).sort((a, b) => b[1] - a[1]).slice(0, 2).filter(x => x[1] > .1).map(([i]) => L.taste[i] > 0 ? AXES[i].hi : AXES[i].lo);
    const d = makeDirection(v, seed, ctx); d.why = { push, probe: probes.map(i => AXES[i].name) }; return d;
  }
  function finalDirection(hist, ctx, seed) {
    const L = MD.learn(hist), v = L.taste.map((t, i) => clamp(t * (.55 + .45 * L.conf[i]) * 1.3, -.95, .95));
    const d = makeDirection(v, seed, { ...ctx, used: new Set() }); d.closest = d.name; d.final = true; return d;
  }
  function meters(L) {
    const t = L.taste, c = L.conf, m = a => (a + 1) / 2;
    return [{ name: 'Warmth', v: m(t[0]), c: c[0], lo: 'Cool', hi: 'Warm' }, { name: 'Energy', v: m(t[1]), c: c[1], lo: 'Quiet', hi: 'Bold' }, { name: 'Playfulness', v: m(t[2]), c: c[2], lo: 'Serious', hi: 'Playful' }, { name: 'Classic or modern', v: m(t[3]), c: c[3], lo: 'Modern', hi: 'Classic' }, { name: 'Expressiveness', v: m(t[4]), c: c[4], lo: 'Minimal', hi: 'Expressive' }];
  }
  function summary(L) {
    const idx = L.taste.map((t, i) => [i, Math.abs(t) * L.conf[i]]).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(x => x[1] > .08);
    if (!idx.length) return 'Still guessing. React to a few directions.';
    const w = idx.map(([i]) => L.taste[i] > 0 ? AXES[i].npHi : AXES[i].npLo);
    return 'You lean toward ' + (w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : w[0]) + '.';
  }
  const MSG = { warm: ['Noted. Cooler, calmer colour.', 'Got it. Warm colour feels right.'], energy: ['Understood. Quiet confidence over volume.', 'Got it. You want a brand with some energy.'], play: ['Noted. A more serious tone.', 'Got it. You want it to feel playful.'], classic: ['Understood. Modern, clean type.', 'Got it. Classic, editorial type suits you.'], rich: ['Noted. Keep it minimal.', 'Got it. You like layouts with some expression.'], tone: ['Understood. Light and open.', 'Got it. Dark and moody works for you.'], shape: ['Noted. Sharper, more precise edges.', 'Got it. Soft, rounded shapes.'], symbol: ['Understood. Let the name lead.', 'Got it. A strong symbol matters to you.'] };
  function reaction(before, after) {
    let best = 0, bi = 0; after.taste.forEach((t, i) => { const d = Math.abs(t * after.conf[i] - before.taste[i] * before.conf[i]); if (d > best) { best = d; bi = i; } });
    return { axis: bi, text: MSG[AXES[bi].id][after.taste[bi] > 0 ? 1 : 0] };
  }
  const closing = hist => hist.length >= 5;

  /* ───────── rendering ───────── */
  const loaded = new Set();
  function ensureFonts(d) { const h = MM.fontsHref(d.v); if (loaded.has(h)) return; loaded.add(h); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); }
  const invert = v => { const P = v.pal; return Object.assign({}, v, { pal: Object.assign({}, P, { primary: P.onPrimary, onPrimary: P.primary, ink: P.onPrimary }) }); };
  const lgVars = (v, size) => { const P = v.pal; return '--lp:' + P.primary + ';--la:' + P.accent + ';--li:' + P.ink + ';--lon:' + P.onPrimary + ";--lf:'" + v.fonts.d + "';--lw:" + v.fonts.w + ';--ls:' + size + 'px;'; };
  const mark = (v, size, container) => '<span class="lg" style="' + lgVars(v, size) + '">' + MM.markHTML(v, container ? { container } : undefined) + '</span>';
  const BOARD = '.bd{box-sizing:border-box;width:1280px;height:800px;padding:34px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1.1fr) minmax(0,1fr) 112px;gap:16px}.bd *{box-sizing:border-box;margin:0}.t{border-radius:22px;position:relative;display:grid;place-items:center;overflow:hidden}.cap{position:absolute;left:18px;bottom:14px;font:500 11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;opacity:.6}.bd .lg .mk{flex:none}.palr{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.pc{border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;justify-content:flex-end;font:500 12px ui-monospace,monospace;line-height:1.5}.pc b{font:600 15px var(--ui)}';
  function board(d) {
    const v = d.v, P = v.pal, inv = invert(v), sw = [['Background', P.bg], ['Surface', P.surface], ['Primary', P.primary], ['Accent', P.accent], ['Ink', P.ink]];
    const fx = '--ui:\'' + v.fonts.b + '\',system-ui,sans-serif;';
    return '<div class="bd" style="background:' + P.bg + ';color:' + P.ink + ';font-family:var(--ui);' + fx + '">' +
      '<div class="t" style="grid-column:1/3;background:' + P.surface + ';box-shadow:inset 0 0 0 1px ' + P.line + '">' + MM.logoHTML(v, { size: 60 }) + '<span class="cap">Primary logo</span></div>' +
      '<div class="t" style="background:' + P.primary + '">' + MM.logoHTML(inv, { size: 38 }) + '<span class="cap" style="color:' + P.onPrimary + '">On brand colour</span></div>' +
      '<div class="t" style="grid-column:1/3;background:' + P.surface + ';box-shadow:inset 0 0 0 1px ' + P.line + ';justify-items:start;padding:0 38px"><div><div style="font-family:\'' + v.fonts.d + '\';font-weight:' + v.fonts.w + ';font-size:112px;line-height:1;color:' + P.primary + '">Aa</div><div style="font-family:\'' + v.fonts.d + '\';font-weight:' + v.fonts.w + ';font-size:34px;line-height:1.1;margin-top:6px;max-width:640px">' + esc(v.head) + '</div><div style="font-size:16px;color:' + P.muted + ';margin-top:10px;max-width:560px">' + esc(v.fonts.d) + ' for headlines, ' + esc(v.fonts.b) + ' for everything else.</div></div><span class="cap">Typography</span></div>' +
      '<div style="display:grid;grid-template-rows:1fr 1fr;gap:16px"><div class="t" style="background:' + P.accent + '">' + mark(v, 70, v.container === 'none' ? 'squircle' : v.container) + '<span class="cap" style="color:' + P.onAccent + '">App icon</span></div><div class="t" style="background:' + P.ink + '"><div style="width:96px;height:96px;border-radius:50%;background:' + P.primary + ';display:grid;place-items:center">' + mark(inv, 44, 'none') + '</div><span class="cap" style="color:' + P.bg + '">Avatar</span></div></div>' +
      '<div class="palr">' + sw.map(s => '<div class="pc" style="background:' + s[1] + ';color:' + (MM.mix(s[1], '#000', .0) && (parseInt(s[1].slice(1), 16) > 0x888888 ? '#16130f' : '#fff')) + ';box-shadow:inset 0 0 0 1px ' + P.line + '"><b>' + s[0] + '</b>' + s[1].toUpperCase() + '</div>').join('') + '</div></div>';
  }
  function mount(host, d, o) {
    o = o || {}; ensureFonts(d);
    const sr = host.shadowRoot || host.attachShadow({ mode: 'open' }), st = Object.assign({ screen: 'site' }, o.state), live = !!o.interactive;
    const draw = () => {
      if (st.screen === 'brand') sr.innerHTML = '<style>:host{display:block;width:1280px;height:800px;overflow:hidden}' + MM.LOGO_CSS + BOARD + '</style>' + board(d);
      else {
        sr.innerHTML = '<style>:host{display:block;width:1280px;height:800px}.vp{width:1280px;height:800px;overflow:' + (live ? 'auto' : 'hidden') + ';background:#fff}.sv{display:block}</style><div class="vp"><div class="sv"></div></div>';
        MM.mountSite($('.sv', sr), d.v, true);
        if (st.screen === 'scroll') $('.vp', sr).scrollTop = 760;
      }
      if (o.onChange) o.onChange(st);
    };
    const $ = (s, el) => (el || sr).querySelector(s);
    draw();
    if (live && !sr._w) { sr._w = true; sr.addEventListener('click', e => { if (e.target.closest && e.target.closest('a')) e.preventDefault(); }, true); }
    return { state: st, redraw: draw, go: s => { st.screen = s; draw(); } };
  }
  function mountKit(host, d) {
    ensureFonts(d);
    const v = d.v, P = v.pal, sr = host.shadowRoot || host.attachShadow({ mode: 'open' }), R = v.radius, RB = v.rb;
    const F = "font-family:'" + v.fonts.b + "',system-ui,sans-serif", H = "font-family:'" + v.fonts.d + "',serif;font-weight:" + v.fonts.w;
    const box = (t, c) => '<div class="b"><div class="k">' + t + '</div>' + c + '</div>';
    sr.innerHTML = '<style>:host{display:block}*{box-sizing:border-box;margin:0}.w{background:' + P.bg + ';color:' + P.ink + ';' + F + ';padding:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.b{background:' + P.surface + ';border:1px solid ' + P.line + ';border-radius:' + (R + 2) + 'px;padding:18px;display:flex;flex-direction:column;gap:12px;min-width:0}.k{font:500 11px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:' + P.muted + '}.btn{display:inline-flex;padding:12px 22px;border-radius:' + RB + 'px;font-weight:600;font-size:15px;border:2px solid ' + P.primary + ';background:' + P.primary + ';color:' + P.onPrimary + ';' + F + '}.btn.g{background:transparent;color:' + P.ink + ';border-color:' + P.line + '}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.inp{border:1px solid ' + P.line + ';border-radius:' + R + 'px;padding:11px 14px;color:' + P.muted + ';background:' + P.bg + ';flex:1}.chip{padding:4px 12px;border-radius:99px;background:' + P.accent + ';color:' + P.onAccent + ';font-size:13px;font-weight:600}.h{' + H + ';font-size:30px;line-height:1.05;letter-spacing:-.02em}@media(max-width:900px){.w{grid-template-columns:1fr}}</style><div class="w">' +
      box('Buttons', '<div class="row"><span class="btn">' + esc(v.copy.cta[0]) + '</span><span class="btn g">' + esc(v.copy.cta[1]) + '</span></div>') + box('Input', '<div class="row"><span class="inp">Your email</span><span class="btn">Join</span></div>') + box('Tag', '<div class="row"><span class="chip">New</span><span class="chip" style="background:' + P.primary + ';color:' + P.onPrimary + '">' + esc(v.copy.eyebrow) + '</span></div>') +
      box('Headline', '<div class="h">' + esc(v.head) + '</div>') + box('Card', '<div style="' + H + ';font-size:20px">' + esc(v.copy.feats[0][0]) + '</div><div style="color:' + P.muted + ';font-size:14px">' + esc(v.copy.feats[0][1]) + '</div>') + box('Mark', '<div class="row">' + mark(v, 64, v.container === 'none' ? 'squircle' : v.container) + mark(invert(v), 44, 'none').replace('class="lg"', 'class="lg" data-x') + '</div>') + '</div>';
    const st = document.createElement('style'); st.textContent = MM.LOGO_CSS; sr.appendChild(st);
  }

  function screensFor(d, n) { return [{ id: 'site', state: { screen: 'site' } }, { id: 'scroll', state: { screen: 'scroll' } }, { id: 'brand', state: { screen: 'brand' } }].slice(0, n); }
  const LB = { site: 'Website', scroll: 'Page', brand: 'Brand board' };

  // Strong signals of a complex product, then signals of a brand/website. English and Hebrew.
  const COMPLEX = /\b(erp|crm|enterprise|dashboard|analytics|back.?office|admin (console|panel|platform)|internal tool|workflow|b2b|saas|platform|developer tools?|data platform|business intelligence|bi)\b|פלטפורמ|מערכת (ניהול|לניהול|ארגונית)|דשבורד|אנליטיקה|ארגוני|תוכנה ל|תכנון פיננסי|ניהול (מלאי|לקוחות|הרשאות)|סאס/i;
  const BRANDY = /\b(logo|branding|brand|landing page|website|portfolio|shop|store|restaurant|caf[eé]|bakery|bagel|studio|salon|boutique|bar|clinic|gym|florist|hotel)\b|לוגו|מיתוג|אתר|תיק עבודות|חנות|מסעדה|בית קפה|מאפיי|בייגל|סטודיו|מספרה|בוטיק|קליניקה|יוגה|פיצרי/i;
  const detectKind = t => { t = t || ''; const c = COMPLEX.test(t), b = BRANDY.test(t); if (b && !/\b(erp|crm|enterprise|dashboard|analytics|admin (console|panel))\b|ארגוני|דשבורד/i.test(t)) return 'brand'; return c ? 'product' : 'brand'; };

  g.BRAND = {
    model: { AXES, ARCH, AX: {}, learn: MD.learn, meters, summary, reaction, closing, makeDirection, initialDirections, nextDirection, finalDirection, ready: MD.ready },
    render: { mount, mountKit, ensureFonts, SCREENS: ['site', 'scroll', 'brand'] },
    screensFor, LB, detectKind, invert, mark, lgVars, hueName, FEEL, LOGO, LAY, overrides
  };
})(window);
