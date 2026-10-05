/* Matchmark generator.
   brief text  ->  parseBrief()  ->  makeVariant(brief, seed)  ->  a complete, deterministic brand:
   name, logo (HTML + SVG export), palette, type pairing, copy and a full one-page website.
   Same (brief, seed) always gives the same design, so a saved card is just {text, seed}. */
(function (global) {
  'use strict';

  /* ───────── tiny utils ───────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const range = (r, lo, hi) => lo + (hi - lo) * r();
  function wpick(r, obj) {
    const e = Object.entries(obj).filter(([, w]) => w > 0);
    const tot = e.reduce((s, [, w]) => s + w, 0);
    let x = r() * tot;
    for (const [k, w] of e) { if ((x -= w) <= 0) return k; }
    return e[e.length - 1][0];
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sum = (a, b) => { const o = Object.assign({}, a); for (const k in b) o[k] = (o[k] || 0) + b[k]; return o; };

  /* ───────── colour ───────── */
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  }
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function lum(h) {
    const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * r + .7152 * g + .0722 * b;
  }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const on = bg => contrast(bg, '#ffffff') >= contrast(bg, '#16130f') ? '#ffffff' : '#16130f';

  /* ───────── fonts ───────── */
  // c = category, h = display weight (only weights that exist on Google Fonts)
  const FONTS = {
    'Fraunces': { c: 'serif', h: 800 }, 'Playfair Display': { c: 'serif', h: 800 }, 'DM Serif Display': { c: 'serif', h: 400 },
    'Cormorant Garamond': { c: 'serif', h: 700 }, 'Young Serif': { c: 'serif', h: 400 },
    'Space Grotesk': { c: 'sans', h: 700 }, 'Sora': { c: 'sans', h: 800 }, 'Outfit': { c: 'sans', h: 800 },
    'Syne': { c: 'sans', h: 800 }, 'Manrope': { c: 'sans', h: 800 }, 'Unbounded': { c: 'sans', h: 800 },
    'Baloo 2': { c: 'round', h: 800 }, 'Fredoka': { c: 'round', h: 700 }, 'Quicksand': { c: 'round', h: 700 },
    'Bricolage Grotesque': { c: 'round', h: 800 },
    'JetBrains Mono': { c: 'mono', h: 800 }, 'IBM Plex Mono': { c: 'mono', h: 700 }, 'Space Mono': { c: 'mono', h: 700 },
    'Archivo Black': { c: 'bold', h: 400 }, 'Bebas Neue': { c: 'bold', h: 400 }, 'Anton': { c: 'bold', h: 400 }, 'Lilita One': { c: 'bold', h: 400 },
    // body faces
    'Inter': { b: 1 }, 'DM Sans': { b: 1 }, 'Work Sans': { b: 1 }, 'Source Sans 3': { b: 1 }, 'Nunito': { b: 1 },
    'IBM Plex Sans': { b: 1 }, 'Archivo': { b: 1 }
  };
  const BY_CAT = {};
  Object.keys(FONTS).forEach(n => { const c = FONTS[n].c; if (c) (BY_CAT[c] = BY_CAT[c] || []).push(n); });
  const BODY = {
    serif: ['Inter', 'DM Sans', 'Work Sans', 'Source Sans 3'], sans: ['Inter', 'DM Sans'], round: ['Nunito', 'DM Sans'],
    mono: ['Inter', 'IBM Plex Sans'], bold: ['Inter', 'Archivo', 'Work Sans']
  };
  function fontsHref(v) {
    const d = v.fonts.d, b = v.fonts.b;
    const fam = n => encodeURIComponent(n).replace(/%20/g, '+');
    const dw = FONTS[d].h === 400 ? '400' : '400;' + FONTS[d].h;
    return 'https://fonts.googleapis.com/css2?family=' + fam(d) + ':wght@' + dw + '&family=' + fam(b) + ':wght@400;600&display=swap';
  }

  /* ───────── glyphs: 64×64 marks, drawn with two colours ───────── */
  const G = {
    bagel: (a, b) => '<circle cx="32" cy="32" r="20" fill="none" stroke="' + a + '" stroke-width="14"/>' +
      [10, 70, 130, 190, 250, 310].map(d => '<ellipse cx="32" cy="12" rx="2.6" ry="1.4" transform="rotate(' + d + ' 32 32)" fill="' + b + '"/>').join(''),
    cup: (a, b) => '<path d="M12 26h32v12a14 14 0 0 1-14 14h-4a14 14 0 0 1-14-14z" fill="' + a + '"/><path d="M44 30h3a6 6 0 0 1 0 12h-4" fill="none" stroke="' + a + '" stroke-width="4"/><path d="M22 8c-3 4 3 6 0 11M32 8c-3 4 3 6 0 11" fill="none" stroke="' + b + '" stroke-width="3.2" stroke-linecap="round"/>',
    shield: (a, b) => '<path d="M32 5 53 13v17c0 14-9 24-21 29C20 54 11 44 11 30V13z" fill="' + a + '"/><path d="m22 32 7 7 13-15" fill="none" stroke="' + b + '" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>',
    lock: (a, b) => '<rect x="12" y="28" width="40" height="29" rx="7" fill="' + a + '"/><path d="M21 28v-8a11 11 0 0 1 22 0v8" fill="none" stroke="' + a + '" stroke-width="6"/><circle cx="32" cy="42" r="4.5" fill="' + b + '"/>',
    bolt: (a, b) => '<path d="M37 3 13 37h16l-4 24 26-36H35z" fill="' + a + '"/><path d="M37 3 13 37h8z" fill="' + b + '" opacity=".35"/>',
    leaf: (a, b) => '<path d="M10 54C10 28 27 11 55 9c0 28-15 45-40 45z" fill="' + a + '"/><path d="M13 52 41 23" stroke="' + b + '" stroke-width="3.6" stroke-linecap="round"/>',
    wave: (a, b) => '<path d="M5 24c8-10 15-10 21 0s13 10 21 0 8-5 12-3" fill="none" stroke="' + a + '" stroke-width="7" stroke-linecap="round"/><path d="M5 43c8-10 15-10 21 0s13 10 21 0 8-5 12-3" fill="none" stroke="' + b + '" stroke-width="7" stroke-linecap="round"/>',
    spark: (a, b) => '<path d="M30 4c2 17 11 26 27 28-16 2-25 11-27 28-2-17-11-26-27-28 16-2 25-11 27-28z" fill="' + a + '"/><circle cx="52" cy="12" r="5" fill="' + b + '"/>',
    peak: (a, b) => '<path d="M3 54 25 14l13 22 8-12 15 30z" fill="' + a + '"/><path d="M25 14 17 28l8 5 5-6z" fill="' + b + '"/>',
    heart: (a, b) => '<path d="M32 57C9 41 5 29 5 21a14 14 0 0 1 27-4 14 14 0 0 1 27 4c0 8-4 20-27 36z" fill="' + a + '"/><circle cx="18" cy="21" r="4" fill="' + b + '" opacity=".9"/>',
    drop: (a, b) => '<path d="M32 5C20 22 13 30 13 41a19 19 0 0 0 38 0C51 30 44 22 32 5z" fill="' + a + '"/><path d="M23 43a9 9 0 0 0 9 9" fill="none" stroke="' + b + '" stroke-width="4" stroke-linecap="round"/>',
    hex: (a, b) => '<path d="M32 3 57 17.500v29L32 61 7 46.500v-29z" fill="' + a + '"/><path d="M32 32 57 17.500M32 32 7 17.500M32 32v29" fill="none" stroke="' + b + '" stroke-width="3.4"/>',
    orbit: (a, b) => '<circle cx="32" cy="32" r="11" fill="' + a + '"/><ellipse cx="32" cy="32" rx="27" ry="11" transform="rotate(-30 32 32)" fill="none" stroke="' + b + '" stroke-width="4.5"/>',
    node: (a, b) => '<path d="M32 15 14 47h36z" fill="none" stroke="' + b + '" stroke-width="3.6" stroke-linejoin="round"/><circle cx="32" cy="15" r="9" fill="' + a + '"/><circle cx="14" cy="47" r="9" fill="' + a + '"/><circle cx="50" cy="47" r="9" fill="' + a + '"/>',
    pulse: (a, b) => '<path d="M3 35h14l7-20 10 38 7-18h20" fill="none" stroke="' + a + '" stroke-width="6.500" stroke-linecap="round" stroke-linejoin="round"/><circle cx="55" cy="35" r="3.500" fill="' + b + '"/>',
    sun: (a, b) => '<circle cx="32" cy="32" r="13" fill="' + a + '"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(d => '<rect x="30" y="3" width="4" height="10" rx="2" transform="rotate(' + d + ' 32 32)" fill="' + b + '"/>').join(''),
    book: (a, b) => '<path d="M5 13c11-4 21-2 27 5v38c-6-7-16-9-27-5z" fill="' + a + '"/><path d="M59 13c-11-4-21-2-27 5v38c6-7 16-9 27-5z" fill="' + b + '"/>',
    pillar: (a, b) => '<path d="M6 21 32 6l26 15z" fill="' + a + '"/><rect x="12" y="26" width="8" height="24" fill="' + a + '"/><rect x="28" y="26" width="8" height="24" fill="' + a + '"/><rect x="44" y="26" width="8" height="24" fill="' + a + '"/><rect x="6" y="53" width="52" height="6" rx="2" fill="' + b + '"/>',
    house: (a, b) => '<path d="M5 30 32 6l27 24v27H5z" fill="' + a + '"/><rect x="25" y="37" width="14" height="20" rx="2" fill="' + b + '"/>',
    paw: (a, b) => '<ellipse cx="32" cy="42" rx="15" ry="12" fill="' + a + '"/><circle cx="13" cy="28" r="6.500" fill="' + a + '"/><circle cx="25" cy="15" r="6.500" fill="' + a + '"/><circle cx="39" cy="15" r="6.500" fill="' + a + '"/><circle cx="51" cy="28" r="6.500" fill="' + a + '"/><circle cx="32" cy="42" r="4" fill="' + b + '"/>',
    flower: (a, b) => [0, 60, 120, 180, 240, 300].map(d => '<ellipse cx="32" cy="16" rx="8" ry="13" transform="rotate(' + d + ' 32 32)" fill="' + a + '"/>').join('') + '<circle cx="32" cy="32" r="7.500" fill="' + b + '"/>'
  };

  /* ───────── industries ───────── */
  const IND = {
    security: {
      re: /secur|cyber|protect|firewall|threat|pentest|infosec|privacy|vpn|antivirus|encrypt/, hue: [[185, 215], [245, 275], [150, 168]],
      modes: { dark: 3, light: 2, cream: 0, color: 0 }, fonts: { sans: 4, mono: 2, bold: 1 }, glyphs: ['shield', 'lock', 'hex', 'bolt', 'node'],
      names: ['Aegis', 'Vantage', 'Sentra', 'Bastion', 'Halcyon', 'Ironwood', 'Cipherly', 'Warden', 'Northguard', 'Lumen Secure'],
      eyebrow: 'Cyber security platform', nav: ['Platform', 'Solutions', 'Pricing', 'Docs'],
      heads: ['Stop threats before they become headlines.', 'Security that sees what you can’t.', 'Every endpoint. Every alert. One calm dashboard.'],
      sub: '{n} unifies detection, response and compliance so small teams can defend like a big one.', cta: ['Start free trial', 'Book a demo'],
      feats: [['Real-time detection', 'Spot suspicious behavior across every device the moment it happens.'], ['One-click response', 'Isolate, investigate and resolve incidents without leaving the dashboard.'], ['Compliance on autopilot', 'Stay audit-ready with continuous checks for SOC 2, ISO 27001 and GDPR.']],
      quote: ['We cut our response time from hours to minutes.', 'Head of IT, Series B fintech'], stats: [['99.99%', 'Uptime'], ['< 5 min', 'Mean time to respond'], ['2,400+', 'Teams protected']]
    },
    pets: {
      re: /\bpets?\b|\bdogs?\b|\bcats?\b|\bvet\b|veterin|groom|kennel|puppy|kitten|animal/, hue: [[18, 45], [160, 190], [330, 350]],
      modes: { color: 3, light: 2, cream: 2, dark: 0 }, fonts: { round: 4, bold: 1, sans: 1 }, glyphs: ['paw', 'heart', 'leaf', 'sun'],
      names: ['Happy Tails', 'Good Boy', 'Paws & Co', 'Whisker', 'Wag Club', 'Pawsitive', 'Fetch', 'Purrfect'],
      eyebrow: 'For the ones who love back', nav: ['Services', 'Team', 'Prices', 'Contact'],
      heads: ['Because they’re family.', 'Happy pets, happier humans.', 'Tails wag here.'],
      sub: '{n} takes loving care of pets, and the people who adore them.', cta: ['Book a visit', 'Meet the team'],
      feats: [['Gentle care', 'Calm, patient hands for every furry client.'], ['Easy booking', 'Pick a time in seconds and get reminders by text.'], ['Trusted by locals', 'Hundreds of happy tails in the neighborhood.']],
      quote: ['My nervous pup actually runs to the door.', 'A relieved owner'], stats: [['3k+', 'Pets cared for'], ['4.9★', 'Owner rating'], ['7 days', 'Open weekly']]
    },
    kids: {
      re: /\bkids?\b|child|toy|school|learn|educat|tutor|nursery|daycare|montessori|teach|course|academy/, hue: [[40, 55], [190, 210], [330, 350], [270, 285]],
      modes: { color: 4, light: 2, cream: 1, dark: 0 }, fonts: { round: 5, bold: 2 }, glyphs: ['book', 'sun', 'spark', 'heart', 'flower', 'peak'],
      names: ['Little Sprouts', 'Tiny Tinkers', 'Wonder Nook', 'Pip & Pals', 'Giggle Garden', 'Bright Bees', 'Cloud Nine', 'Moonbeam'],
      eyebrow: 'Learn & play', nav: ['Programs', 'Our team', 'Schedule', 'Contact'],
      heads: ['Where curious minds grow.', 'Little learners, big ideas.', 'Every day is a new adventure.'],
      sub: '{n} turns learning into play, with activities kids ask for again and again.', cta: ['Join the fun', 'See programs'],
      feats: [['Learning by play', 'Hands-on activities that make ideas stick.'], ['Caring teachers', 'Small groups with people who love what they do.'], ['Happy parents', 'Easy sign-up, clear updates, zero stress.']],
      quote: ['She talks about it all the way home.', 'Parent of a 6 year old'], stats: [['500+', 'Happy families'], ['1:6', 'Teacher to child'], ['4.9★', 'Parent rating']]
    },
    health: {
      re: /fitness|\bgym\b|yoga|pilates|wellness|health|clinic|dental|dentist|therap|massage|\bspa\b|nutrition|physio|medical|meditat|coach|workout|climb/, hue: [[150, 190], [330, 350], [10, 25]],
      modes: { light: 4, cream: 2, color: 2, dark: 1 }, fonts: { sans: 3, round: 2, serif: 1 }, glyphs: ['pulse', 'heart', 'leaf', 'sun', 'drop', 'peak'],
      names: ['Stride', 'Kindred Fit', 'Alive', 'Sol Studio', 'Ember', 'Bloom Move', 'Pulse & Co', 'Anchor'],
      eyebrow: 'Feel better, daily', nav: ['Classes', 'Coaches', 'Pricing', 'Contact'],
      heads: ['Strong starts here.', 'Your best self, one habit at a time.', 'Move well. Live well.'],
      sub: '{n} makes it simple to build habits that last, with coaches who actually know your name.', cta: ['Book a free session', 'See classes'],
      feats: [['Coaching that fits', 'Plans built around your body, your schedule and your goals.'], ['Show up any day', 'Flexible classes and sessions: morning, evening or on demand.'], ['Real community', 'Train alongside people who cheer you on.']],
      quote: ['I finally look forward to Mondays.', 'Member since 2024'], stats: [['12k+', 'Sessions a month'], ['96%', 'Members stay'], ['7 days', 'Open each week']]
    },
    fashion: {
      re: /fashion|cloth|apparel|boutique|beauty|salon|jewel|cosmetic|skincare|makeup|\bhair\b|barber|perfume|shoe|sneaker|tailor|lingerie|streetwear/, hue: [[330, 360], [20, 40], [260, 290]],
      modes: { cream: 3, dark: 3, light: 2, color: 1 }, fonts: { serif: 5, sans: 2, bold: 1 }, glyphs: ['spark', 'flower', 'drop', 'heart', 'orbit'],
      names: ['Maison Noor', 'Atelier Vale', 'Thread & Co', 'Linden', 'Ode Studio', 'Sable', 'Oro', 'Marlowe'],
      eyebrow: 'New season', nav: ['Shop', 'Collections', 'About', 'Journal'],
      heads: ['Wear what feels like you.', 'Considered pieces, made to last.', 'Quiet confidence, loudly stylish.'],
      sub: '{n} is a small label making thoughtful pieces in limited runs.', cta: ['Shop the collection', 'Our story'],
      feats: [['Limited runs', 'Small batches mean fewer pieces and more care.'], ['Honest materials', 'Natural fabrics, ethically sourced and made to age well.'], ['Free returns', 'Try it at home. Love it, or send it back.']],
      quote: ['I get asked where it’s from every single time.', 'A happy customer'], stats: [['100', 'Pieces per drop'], ['30 days', 'Free returns'], ['EU', 'Made in small studios']]
    },
    finance: {
      re: /financ|\bbank|invest|insurance|\blaw\b|legal|lawyer|attorney|account|\btax\b|wealth|consult|advis|mortgage|fintech|payroll|bookkeep/, hue: [[205, 230], [150, 165], [255, 270]],
      modes: { light: 4, dark: 2, cream: 1, color: 0 }, fonts: { sans: 4, serif: 2 }, glyphs: ['pillar', 'hex', 'peak', 'orbit', 'shield', 'spark'],
      names: ['Evergreen Capital', 'Northbridge', 'Clarity Advisors', 'Keystone', 'Harbor & Pine', 'Ledgerly', 'Meridian', 'Trellis'],
      eyebrow: 'Plain-English money', nav: ['Services', 'Pricing', 'About', 'Contact'],
      heads: ['Money, made clear.', 'Grow what you’ve built.', 'Advice you can actually act on.'],
      sub: '{n} helps you plan, invest and protect what matters, without the jargon.', cta: ['Get started', 'Talk to an advisor'],
      feats: [['Clear plans', 'A roadmap you can understand and stick to.'], ['Fair, flat fees', 'No hidden costs, no surprises.'], ['People who listen', 'Real advisors, ready when you are.']],
      quote: ['First time money has made sense to me.', 'Client since 2022'], stats: [['$2.4B', 'Under care'], ['0', 'Hidden fees'], ['15 yrs', 'Of experience']]
    },
    food: {
      re: /bagel|bakery|bread|cafe|café|coffee|restaurant|pizza|\bfood|\bdeli\b|donut|doughnut|pastry|kitchen|burger|taco|sushi|ice.?cream|diner|brunch|catering|bistro|\bbar\b|\bpub\b|\btea\b|cake|dessert|chocolate|juice|smoothie|brewery/, hue: [[4, 48]],
      modes: { cream: 3, color: 3, light: 2, dark: 0 }, fonts: { serif: 3, round: 3, bold: 2, sans: 1 }, glyphs: ['bagel', 'cup', 'sun', 'spark', 'leaf', 'heart'],
      names: ['Rise & Rye', 'Knead', 'Hole Story', 'Round Trip', 'Seeded', 'The Daily Roll', 'Crumb', 'Golden Hour', 'Hearth & Hole', 'Proof'],
      eyebrow: 'Fresh daily', nav: ['Menu', 'Our story', 'Visit', 'Order'],
      heads: ['Made by hand, every morning.', 'Come hungry. Leave happy.', 'Your new favorite ritual.'],
      sub: '{n} is a neighborhood spot for honest ingredients and food made from scratch.', cta: ['See the menu', 'Order for pickup'],
      feats: [['Made from scratch', 'Small batches, real ingredients, nothing from a bag.'], ['Fresh all day', 'Out of the oven in the morning, restocked until we sell out.'], ['Order ahead', 'Skip the line. Pick up in minutes, or have it delivered.']],
      quote: ['The only place I’ll queue for.', 'A very loyal regular'], stats: [['6am', 'Doors open'], ['100%', 'Made in-house'], ['4.9★', 'Neighborhood rating']]
    },
    travel: {
      re: /travel|hotel|\btours?\b|hostel|camp|surf|resort|adventure|hiking|\btrip|airbnb|\bbnb\b|vacation|outdoor|expedition|safari|cruise/, hue: [[175, 215], [15, 30], [40, 50]],
      modes: { light: 3, cream: 2, color: 2, dark: 1 }, fonts: { sans: 3, serif: 2, bold: 1 }, glyphs: ['wave', 'peak', 'sun', 'orbit', 'drop', 'leaf'],
      names: ['Wander Well', 'Driftwood', 'Roam & Co', 'Compass Rose', 'Far & Away', 'Salt Route', 'Wayfarer', 'Tidewater'],
      eyebrow: 'Go somewhere', nav: ['Destinations', 'Experiences', 'Stories', 'Contact'],
      heads: ['Find your next favorite place.', 'Travel slower. See more.', 'Adventure, planned for you.'],
      sub: '{n} designs trips that feel personal, from the first idea to the last sunset.', cta: ['Plan my trip', 'Browse destinations'],
      feats: [['Local insight', 'Tips from people who actually live there.'], ['Flexible plans', 'Change your mind and we’ll change the plan.'], ['Small groups', 'Real connections, no crowds.']],
      quote: ['Best trip we’ve ever taken, hands down.', 'Maya & Dan'], stats: [['60+', 'Destinations'], ['4.9★', 'Traveler rating'], ['24/7', 'Trip support']]
    },
    eco: {
      re: /plant|garden|flower|\beco\b|eco-|organic|farm|sustain|vegan|nature|florist|soap|candle|zero.?waste|refill/, hue: [[95, 160], [20, 40]],
      modes: { cream: 4, light: 2, color: 1, dark: 0 }, fonts: { serif: 3, round: 2, sans: 2 }, glyphs: ['leaf', 'flower', 'sun', 'drop', 'peak'],
      names: ['Pure Root', 'Moss & Co', 'Wild Clover', 'Fern', 'Terra Nova', 'Willow & Sage', 'Clay & Cedar', 'Greenhouse'],
      eyebrow: 'Grown with care', nav: ['Shop', 'Our story', 'Journal', 'Contact'],
      heads: ['Good for you. Good for the planet.', 'Simply, naturally better.', 'Rooted in what matters.'],
      sub: '{n} makes everyday essentials from honest, natural ingredients.', cta: ['Shop now', 'Our promise'],
      feats: [['Natural ingredients', 'Nothing you can’t pronounce.'], ['Planet-first', 'Plastic-free packaging and carbon-neutral shipping.'], ['Locally made', 'Small batches from nearby growers and makers.']],
      quote: ['I switched and never looked back.', 'Verified customer'], stats: [['100%', 'Recyclable packaging'], ['0', 'Nasties'], ['50+', 'Local partners']]
    },
    home: {
      re: /furniture|interior|architect|real.?estate|property|renovat|construction|plumb|builder|decor|\bhome\b|carpent|landscap|cleaning/, hue: [[20, 40], [195, 215], [100, 140]],
      modes: { cream: 3, light: 3, dark: 1, color: 1 }, fonts: { serif: 3, sans: 3 }, glyphs: ['house', 'hex', 'sun', 'leaf'],
      names: ['Hearth & Beam', 'Studio Oak', 'Haven', 'Joist', 'Plinth', 'Oak & Linen', 'Cornerstone', 'Kiln'],
      eyebrow: 'Spaces that feel right', nav: ['Projects', 'Services', 'About', 'Contact'],
      heads: ['Make every space feel like home.', 'Designed around the way you live.', 'Built with care, finished with taste.'],
      sub: '{n} helps you design, build and furnish places you’ll love coming back to.', cta: ['Get a quote', 'See projects'],
      feats: [['Thoughtful design', 'Layouts that work as well as they look.'], ['Quality craft', 'Skilled makers, premium materials.'], ['Start to finish', 'One team, one plan, no surprises.']],
      quote: ['They understood our home better than we did.', 'Homeowner'], stats: [['300+', 'Projects'], ['12 yrs', 'Of craft'], ['On time', 'Every time']]
    },
    tech: {
      re: /saas|software|platform|\bapps?\b|\bai\b|cloud|\bdata\b|\bdev|\bapi\b|startup|analytics|dashboard|automation|tool|crm|productivity|tech/, hue: [[215, 270], [160, 175], [330, 350]],
      modes: { light: 3, dark: 3, color: 1, cream: 0 }, fonts: { sans: 4, mono: 1, round: 1, bold: 1 }, glyphs: ['hex', 'orbit', 'spark', 'bolt', 'node', 'wave'],
      names: ['Fieldnote', 'Planar', 'Nimbus Labs', 'Tandem', 'Beacon', 'Relay', 'Meridian', 'Stackwell', 'Cadence', 'Quill'],
      eyebrow: 'Meet your new workflow', nav: ['Product', 'Solutions', 'Pricing', 'Resources'],
      heads: ['The workspace your whole team will actually use.', 'Less busywork. More work that matters.', 'Turn messy data into clear decisions.'],
      sub: '{n} brings your tools, data and team together in one place, with no training required.', cta: ['Get started free', 'See how it works'],
      feats: [['Set up in minutes', 'Connect your tools and go live today, no engineers needed.'], ['Insights, not noise', 'Dashboards that surface what changed and why it matters.'], ['Built to scale', 'From five people to five thousand, without changing a thing.']],
      quote: ['We replaced three tools and our Mondays got quieter.', 'COO, growth-stage startup'], stats: [['10 min', 'To first value'], ['40%', 'Less manual work'], ['4.8★', 'Average rating']]
    },
    generic: {
      re: /./, hue: [[0, 360]],
      modes: { light: 3, cream: 2, dark: 1, color: 2 }, fonts: { sans: 3, serif: 2, round: 1, bold: 1 }, glyphs: ['spark', 'orbit', 'hex', 'peak', 'wave', 'bolt', 'heart'],
      names: ['Northwind', 'Common Good', 'Fable', 'Bright & Co', 'Lark', 'Juniper', 'Paperplane', 'Marigold'],
      eyebrow: 'Welcome', nav: ['Work', 'About', 'Pricing', 'Contact'],
      heads: ['Something worth showing up for.', 'Made with care. Made to last.', 'Hello, {n}.'],
      sub: '{n} is built on a simple idea: do great work and treat people well.', cta: ['Get started', 'Learn more'],
      feats: [['Thoughtful by default', 'Every detail considered, nothing left to chance.'], ['Easy to work with', 'Clear, friendly and always responsive.'], ['Built to last', 'Quality you can count on, year after year.']],
      quote: ['Exactly what we were looking for.', 'A happy customer'], stats: [['10+', 'Years of craft'], ['500+', 'Happy customers'], ['4.9★', 'Average rating']]
    }
  };
  const ORDER = ['security', 'pets', 'kids', 'health', 'fashion', 'finance', 'food', 'travel', 'eco', 'home', 'tech'];
  const GLYPH_HINTS = [
    [/bagel|donut|doughnut/, 'bagel'], [/coffee|cafe|café|\btea\b|espresso/, 'cup'], [/lock|vault|privacy/, 'lock'], [/secur|cyber|protect/, 'shield'],
    [/\bpets?\b|\bdogs?\b|\bcats?\b/, 'paw'], [/flower|florist/, 'flower'], [/book|school|read/, 'book'], [/climb|mountain|hik/, 'peak']
  ];
  const MOODS = [
    { re: /luxur|elegan|premium|upscale|refined|sophistic|classy|high.?end/, modes: { dark: 3, cream: 3, light: 1 }, sat: [25, 50], fonts: { serif: 5 } },
    { re: /play|fun\b|cheer|colou?rful|bright|quirk|whims|joy|friendly/, modes: { color: 4, light: 2 }, sat: [75, 95], fonts: { round: 5, bold: 2 } },
    { re: /minimal|clean|simple|sleek|crisp|modern/, modes: { light: 5, dark: 1 }, sat: [55, 80], fonts: { sans: 5 } },
    { re: /bold|loud|edgy|punk|brutal|striking|strong|energetic/, modes: { color: 3, dark: 2 }, sat: [80, 100], fonts: { bold: 5, sans: 1 } },
    { re: /dark|techy|hacker|futur|cyber|neon|night/, modes: { dark: 6 }, sat: [75, 100], fonts: { mono: 3, sans: 3 } },
    { re: /warm|cozy|rustic|artisan|handmade|vintage|retro|nostalg|homey|crafted|traditional/, modes: { cream: 5, light: 1 }, sat: [50, 75], fonts: { serif: 5, round: 1 } },
    { re: /calm|natural|organic|soft|gentle|zen|peace/, modes: { cream: 3, light: 3 }, sat: [30, 55], fonts: { serif: 2, sans: 3 } },
    { re: /trust|profession|corporate|reliab|serious|enterprise/, modes: { light: 5, dark: 1 }, sat: [55, 80], fonts: { sans: 5, serif: 1 } }
  ];

  /* ───────── brief ───────── */
  function parseBrief(text, nameField) {
    text = (text || '').trim();
    let name = (nameField || '').trim();
    if (!name) {
      const m = text.match(/(?:called|named|name is|brand is)\s+["“”']?([A-Z0-9][\w&'’.\- ]{1,26}?)["“”']?(?=[,.;!?]|\s+(?:and|with|for|that|who|which|in|—|-)\b|$)/);
      if (m) name = m[1].trim();
      else { const q = text.match(/["“]([^"”]{2,26})["”]/); if (q) name = q[1].trim(); }
    }
    const low = text.toLowerCase();
    let ind = 'generic';
    for (const k of ORDER) { if (IND[k].re.test(low)) { ind = k; break; } }
    let modes = {}, fonts = {}, sat = null, hit = [];
    MOODS.forEach(m => { if (m.re.test(low)) { modes = sum(modes, m.modes); fonts = sum(fonts, m.fonts); sat = sat ? [Math.min(sat[0], m.sat[0]), Math.max(sat[1], m.sat[1])] : m.sat; hit.push(1); } });
    const glyphHint = (GLYPH_HINTS.find(h => h[0].test(low)) || [])[1] || null;
    return { text, name, ind, mood: { modes, fonts, sat: sat || [55, 90], n: hit.length }, glyphHint, nameGiven: !!name };
  }

  /* ───────── palette ───────── */
  function makePalette(r, ind, mood) {
    const hr = pick(r, ind.hue);
    const h = range(r, hr[0], hr[1]);
    const modes = sum(ind.modes, mood.n ? sum(mood.modes, mood.modes) : {});
    const mode = wpick(r, modes);
    const s = range(r, mood.sat[0], mood.sat[1]);
    const off = pick(r, [30, -30, 40, -40, 25, -25, 180, 150, -150]); // mostly analogous, some complementary
    let P;
    if (mode === 'dark') {
      P = { bg: hsl(h, 30, 8), surface: hsl(h, 26, 13), ink: hsl(h, 15, 95), primary: hsl(h, Math.min(95, s + 10), 62), accent: hsl(h + off, Math.min(95, s + 10), 64) };
    } else if (mode === 'cream') {
      const ch = pick(r, [36, 40, 44, 28]);
      P = { bg: hsl(ch, 48, 93), surface: hsl(ch, 55, 98), ink: hsl(h, 40, 13), primary: hsl(h, s, range(r, 32, 44)), accent: hsl(h + off, Math.min(90, s + 10), range(r, 52, 60)) };
    } else if (mode === 'color') {
      P = { bg: hsl(h, Math.min(90, s + 5), range(r, 58, 70)), surface: hsl(h, 75, 93), ink: hsl(h, 55, 10), primary: hsl(h, 55, 10), accent: hsl(h + off, 90, 93) };
    } else {
      P = { bg: hsl(h, 35, 97), surface: '#ffffff', ink: hsl(h, 35, 12), primary: hsl(h, s, range(r, 36, 48)), accent: hsl(h + off, Math.min(92, s + 10), range(r, 54, 62)) };
    }
    P.mode = mode;
    P.muted = mix(P.ink, P.bg, mode === 'color' ? .3 : .4);
    P.line = mix(P.ink, P.bg, .86);
    P.onPrimary = on(P.primary);
    P.onAccent = on(P.accent);
    P.eyebrow = contrast(P.primary, P.bg) >= 3.2 ? P.primary : P.ink;
    P.boldBtn = contrast(P.accent, P.primary) >= 2.2 ? P.accent : P.bg;
    P.hue = h;
    return P;
  }

  /* ───────── variant ───────── */
  const LOGO_STYLES = ['side', 'stack', 'badge', 'word', 'pill'];
  const LAYOUTS = ['split', 'bold', 'center', 'panel'];
  const CONTAINERS = ['none', 'circle', 'square', 'squircle', 'outline'];
  const ARTS = ['poster', 'pattern', 'arcs', 'collage'];
  const FEEL = { dark: 'Nocturne', color: 'Pop', cream: 'Warm', light: 'Clean' };
  const TYPE = { serif: 'editorial', sans: 'modern', round: 'friendly', mono: 'technical', bold: 'loud' };

  function makeVariant(brief, seed) {
    const r = mulberry32((seed * 2654435761) >>> 0 ^ 0x9e3779b9);
    const ind = IND[brief.ind];
    const mood = brief.mood;
    const pal = makePalette(r, ind, mood);
    const fw = sum(ind.fonts, mood.n ? sum(mood.fonts, mood.fonts) : {});
    const cat = wpick(r, fw);
    const d = pick(r, BY_CAT[cat]);
    const b = pick(r, BODY[cat]);
    const glyph = brief.glyphHint && r() < .6 ? brief.glyphHint : pick(r, ind.glyphs);
    const name = brief.name || pick(r, ind.names);
    const logoStyle = LOGO_STYLES[(seed * 2 + (r() < .3 ? 1 : 0)) % LOGO_STYLES.length];
    const layout = LAYOUTS[(seed + 1 + (r() < .25 ? 1 : 0)) % LAYOUTS.length];
    const radius = pick(r, [0, 6, 14, 22, 32]);
    const rb = radius === 0 ? 0 : radius >= 22 ? 999 : radius;
    const wcase = cat === 'bold' ? 'upper' : cat === 'mono' ? 'lower' : wpick(r, { normal: 5, upper: cat === 'serif' ? 1 : 2, lower: 1 });
    return {
      seed, name, ind: brief.ind, nameGiven: brief.nameGiven,
      head: pick(r, ind.heads).replace(/\{n\}/g, name),
      pal, fonts: { d, b, w: FONTS[d].h, cat }, glyph, logoStyle, layout, radius, rb,
      container: pick(r, CONTAINERS), wcase, dot: r() < .3, art: pick(r, ARTS), artSeed: (r() * 1e9) | 0,
      label: FEEL[pal.mode] + ' ' + TYPE[cat]
    };
  }

  /* ───────── logo ───────── */
  function glyphColors(v, container) {
    const P = v.pal;
    return (container === 'none' || container === 'outline') ? [P.primary, P.accent] : [P.onPrimary, P.primary];
  }
  function markSVG(v, o) {
    o = o || {};
    const container = o.container || v.container, P = v.pal;
    const col = o.colors || glyphColors(v, container);
    const g = G[v.glyph];
    let body;
    if (container === 'none') body = g(col[0], col[1]);
    else {
      const inner = '<g transform="translate(14 14) scale(.5625)">' + g(col[0], col[1]) + '</g>';
      if (container === 'circle') body = '<circle cx="32" cy="32" r="32" fill="' + P.primary + '"/>' + inner;
      else if (container === 'square') body = '<rect width="64" height="64" rx="16" fill="' + P.primary + '"/>' + inner;
      else if (container === 'squircle') body = '<rect width="64" height="64" rx="23" fill="' + P.primary + '"/>' + inner;
      else body = '<circle cx="32" cy="32" r="29.500" fill="none" stroke="' + P.primary + '" stroke-width="3"/>' + inner;
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + body + '</svg>';
  }
  function markHTML(v, o) { return '<span class="mk">' + markSVG(v, o) + '</span>'; }

  function badgeFont(n) { return Math.max(10, Math.min(22, (200 / Math.max(n, 1) - 2) / .68)); }
  function badgeSVG(v) {
    const P = v.pal, id = 'b' + v.seed + Math.floor(Math.random() * 1e5);
    const txt = esc(v.name.toUpperCase());
    const fs = badgeFont(v.name.length);
    const ff = "font-family=\"'" + v.fonts.d + "',sans-serif\" font-weight=\"" + v.fonts.w + '"';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
      '<defs><path id="t' + id + '" d="M 28 100 A 72 72 0 0 1 172 100"/><path id="u' + id + '" d="M 20 100 A 80 80 0 0 0 180 100"/></defs>' +
      '<circle cx="100" cy="100" r="98" fill="' + P.primary + '"/>' +
      '<circle cx="100" cy="100" r="90" fill="none" stroke="' + P.onPrimary + '" stroke-opacity=".45" stroke-width="1.5"/>' +
      '<circle cx="100" cy="100" r="55" fill="none" stroke="' + P.onPrimary + '" stroke-opacity=".45" stroke-width="1.5"/>' +
      '<g transform="translate(72 72) scale(.875)">' + G[v.glyph](P.onPrimary, P.primary) + '</g>' +
      '<text ' + ff + ' font-size="' + fs.toFixed(1) + '" letter-spacing="2" fill="' + P.onPrimary + '"><textPath href="#t' + id + '" startOffset="50%" text-anchor="middle">' + txt + '</textPath></text>' +
      '<text font-family="\'' + v.fonts.b + '\',sans-serif" font-weight="600" font-size="10" letter-spacing="3" fill="' + P.onPrimary + '"><textPath href="#u' + id + '" startOffset="50%" text-anchor="middle">EST. 2026</textPath></text>' +
      '</svg>';
  }

  const LOGO_CSS =
    '.lg{display:inline-flex;align-items:center;gap:.45em;font-family:var(--lf),system-ui,sans-serif;font-weight:var(--lw);color:var(--li);line-height:1;font-size:var(--ls,28px);white-space:nowrap}' +
    '.lg .mk{width:1.45em;height:1.45em;display:grid;place-items:center;flex:none}.lg .mk svg{width:100%;height:100%;display:block}' +
    '.lg .wm{letter-spacing:-.01em}.lg.u .wm{text-transform:uppercase;letter-spacing:.08em}.lg.l .wm{text-transform:lowercase}.lg .dot{color:var(--la)}' +
    '.lg.s-stack{flex-direction:column;gap:.4em}.lg.s-stack .mk{width:2.3em;height:2.3em}' +
    '.lg.s-word .mk{display:none}.lg.s-word .wm{font-size:1.15em}' +
    '.lg.s-pill{background:var(--lp);color:var(--lon);padding:.5em .95em .5em .7em;border-radius:99em}.lg.s-pill .dot{color:inherit}.lg.s-pill .mk{width:1.15em;height:1.15em}' +
    '.lg.s-badge{display:block;width:6em;height:6em}.lg.s-badge svg{width:100%;height:100%;display:block}';

  function logoHTML(v, o) {
    o = o || {};
    const st = o.style || v.logoStyle, P = v.pal;
    const vars = '--lp:' + P.primary + ';--la:' + P.accent + ';--li:' + P.ink + ';--lon:' + P.onPrimary + ";--lf:'" + v.fonts.d + "';--lw:" + v.fonts.w + ';' + (o.size ? '--ls:' + o.size + 'px;' : '');
    if (st === 'badge') return '<span class="lg s-badge" style="' + vars + '">' + badgeSVG(v) + '</span>';
    const cls = 'lg s-' + st + ' ' + (v.wcase === 'upper' ? 'u' : v.wcase === 'lower' ? 'l' : '');
    const wm = '<span class="wm">' + esc(v.name) + (v.dot ? '<span class="dot">.</span>' : '') + '</span>';
    const mk = st === 'word' ? '' : st === 'pill' ? markHTML(v, { container: 'none', colors: [P.onPrimary, P.primary] }) : markHTML(v);
    return '<span class="' + cls + '" style="' + vars + '">' + mk + wm + '</span>';
  }
  const navStyle = v => (v.logoStyle === 'badge' || v.logoStyle === 'stack') ? 'side' : v.logoStyle;

  /* Standalone SVG export. Measures the real font with a canvas, so it needs to run in a browser. */
  async function logoSVG(v, style) {
    const P = v.pal, st = style || v.logoStyle;
    const fam = v.fonts.d, w = v.fonts.w;
    try { await document.fonts.load(w + ' 40px "' + fam + '"'); } catch (e) { }
    const ctx = document.createElement('canvas').getContext('2d');
    const text = v.wcase === 'upper' ? v.name.toUpperCase() : v.wcase === 'lower' ? v.name.toLowerCase() : v.name;
    const spacing = v.wcase === 'upper' ? .08 : -.01;
    const tw = (size) => { ctx.font = w + ' ' + size + 'px "' + fam + '", sans-serif'; return ctx.measureText(text + (v.dot ? '.' : '')).width + spacing * size * (text.length + (v.dot ? 1 : 0)); };
    const pad = 12;
    const style_ = '<defs><style>@import url(\'' + fontsHref(v) + '\');</style></defs>';
    const ff = 'font-family="\'' + fam + '\',sans-serif" font-weight="' + w + '" letter-spacing="' + spacing + 'em"';
    const word = (x, y, fill, anchor) => '<text x="' + x + '" y="' + y + '" ' + ff + ' font-size="__S__" fill="' + fill + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(text) + (v.dot ? '<tspan fill="' + P.accent + '">.</tspan>' : '') + '</text>';
    const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    let W, H, body;
    if (st === 'badge') {
      const s = badgeSVG(v);
      return s.replace('<svg ', '<svg width="400" height="400" ').replace('<defs>', '<defs><style>@import url(\'' + fontsHref(v) + '\');</style>');
    }
    if (st === 'side') {
      const S = 44, M = 64, gap = 18; W = M + gap + tw(S) + pad * 2; H = M + pad * 2;
      body = '<g transform="translate(' + pad + ' ' + pad + ')">' + inner(markSVG(v)) + '</g>' + word(pad + M + gap, pad + M / 2 + S * .35, P.ink).replace('__S__', S);
    } else if (st === 'stack') {
      const S = 40, M = 84; W = Math.max(M, tw(S)) + pad * 2; H = M + 16 + S * 1.1 + pad * 2;
      body = '<g transform="translate(' + (W - M) / 2 + ' ' + pad + ')">' + inner(markSVG(v)) + '</g>' + word(W / 2, pad + M + 16 + S * .85, P.ink, 'middle').replace('__S__', S);
    } else if (st === 'word') {
      const S = 52; W = tw(S) + pad * 2; H = S * 1.3 + pad * 2;
      body = word(pad, pad + S * 1.02, P.ink).replace('__S__', S);
    } else { // pill
      const S = 36, icon = S * 1.15, px = S * .7, py = S * .5, gap = S * .45; W = px + icon + gap + tw(S) + px + pad * 2; H = S + py * 2 + pad * 2;
      body = '<rect x="' + pad + '" y="' + pad + '" width="' + (W - pad * 2) + '" height="' + (H - pad * 2) + '" rx="' + (H - pad * 2) / 2 + '" fill="' + P.primary + '"/>' +
        '<g transform="translate(' + (pad + px * .8) + ' ' + (H / 2 - icon / 2) + ') scale(' + icon / 64 + ')">' + inner(markSVG(v, { container: 'none', colors: [P.onPrimary, P.primary] })) + '</g>' +
        word(pad + px * .8 + icon + gap, H / 2 + S * .35, P.onPrimary).replace('__S__', S);
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0) + '" width="' + W.toFixed(0) + '" height="' + H.toFixed(0) + '">' + style_ + body + '</svg>';
  }
  function markStandaloneSVG(v) { return markSVG(v, { container: v.container === 'none' ? 'squircle' : v.container }).replace('<svg ', '<svg width="512" height="512" '); }

  /* ───────── website ───────── */
  function brandCSS(v) {
    const P = v.pal;
    return ':root{--bg:' + P.bg + ';--surface:' + P.surface + ';--ink:' + P.ink + ';--muted:' + P.muted + ';--line:' + P.line + ';--primary:' + P.primary + ';--accent:' + P.accent +
      ';--on-primary:' + P.onPrimary + ';--on-accent:' + P.onAccent + ';--eyebrow:' + P.eyebrow + ';--bold-btn:' + P.boldBtn + ';--r:' + v.radius + 'px;--rb:' + v.rb + 'px;--font-display:"' + v.fonts.d + '";--font-body:"' + v.fonts.b + '";--wd:' + v.fonts.w + '}';
  }
  const SITE_CSS =
    '*{box-sizing:border-box;margin:0}html{scroll-behavior:smooth}' +
    'body{background:var(--bg);color:var(--ink);font-family:var(--font-body),system-ui,sans-serif;font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased}' +
    'h1,h2,h3{font-family:var(--font-display),system-ui,sans-serif;font-weight:var(--wd);line-height:1.04;letter-spacing:-.02em}' +
    '.wrap{max-width:1180px;margin:0 auto;padding:0 32px}a{color:inherit}' +
    '.nav{padding:22px 0;position:relative;z-index:2}.nav-in{display:flex;align-items:center;justify-content:space-between;gap:24px}' +
    '.nav nav{display:flex;gap:30px;font-weight:500;font-size:15px;color:var(--muted)}.nav nav a{text-decoration:none}' +
    '.btn{display:inline-flex;align-items:center;gap:8px;padding:15px 28px;border-radius:var(--rb);border:2px solid var(--primary);background:var(--primary);color:var(--on-primary);font-weight:600;font-size:16px;text-decoration:none;font-family:var(--font-body),sans-serif}' +
    '.btn.ghost{background:transparent;color:var(--ink);border-color:var(--line);box-shadow:inset 0 0 0 1px var(--muted)}.btn.sm{padding:10px 20px;font-size:14px}' +
    '.hero{padding:48px 0 88px}.hero-in{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center}' +
    '.eyebrow{display:inline-block;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--eyebrow);margin-bottom:22px}' +
    'h1{font-size:clamp(44px,5.6vw,84px)}.sub{font-size:20px;color:var(--muted);margin:24px 0 36px;max-width:32em}.cta{display:flex;gap:14px;flex-wrap:wrap}' +
    '.art{aspect-ratio:600/520;width:100%}.art svg{display:block;width:100%;height:100%;border-radius:calc(var(--r)*1.4)}.art.wide{display:none;aspect-ratio:1200/380}' +
    '.lay-center .hero-in{grid-template-columns:1fr;text-align:center;justify-items:center;gap:48px}.lay-center .sub{margin-left:auto;margin-right:auto}.lay-center .cta{justify-content:center}' +
    '.lay-center .art{display:none}.lay-center .art.wide{display:block;max-width:1100px}' +
    '.lay-bold .hero{background:var(--primary);color:var(--on-primary);padding:72px 0 96px}.lay-bold .sub,.lay-bold .eyebrow{color:var(--on-primary);opacity:.85}.lay-bold h1{font-size:clamp(52px,7.4vw,112px);line-height:.95}' +
    '.lay-bold .btn{background:var(--bold-btn);border-color:var(--bold-btn);color:' + '#16130f' + '}.lay-bold .btn.ghost{background:transparent;color:var(--on-primary);box-shadow:inset 0 0 0 2px var(--on-primary);border-color:transparent}' +
    '.lay-bold .art{max-width:480px;justify-self:end}' +
    '.lay-panel .hero{padding-top:12px}.lay-panel .hero-in{background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--r)*2);padding:64px}' +
    '.stats{border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.stats-in{display:grid;grid-template-columns:repeat(3,1fr)}' +
    '.stat{padding:36px 28px;border-left:1px solid var(--line)}.stat:first-child{border-left:0;padding-left:0}.stat b{display:block;font-family:var(--font-display),sans-serif;font-weight:var(--wd);font-size:44px;letter-spacing:-.02em;line-height:1.1}.stat span{color:var(--muted);font-size:15px}' +
    '.feats{padding:96px 0}.feats h2{font-size:clamp(34px,4vw,54px);max-width:12em;margin-bottom:48px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}' +
    '.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:32px}.card .ic{width:52px;height:52px;border-radius:calc(var(--r)*.6);background:var(--primary);display:grid;place-items:center;margin-bottom:28px}.card .ic svg{width:60%;height:60%}' +
    '.card h3{font-size:24px;margin-bottom:12px}.card p{color:var(--muted)}' +
    '.quote{background:var(--ink);color:var(--bg);padding:104px 0;text-align:center}.quote blockquote{font-family:var(--font-display),serif;font-weight:var(--wd);font-size:clamp(30px,4vw,54px);line-height:1.12;letter-spacing:-.02em;max-width:20em;margin:0 auto 28px}.quote cite{font-style:normal;opacity:.7;font-size:16px}' +
    '.final{padding:96px 0}.final-in{background:var(--accent);color:var(--on-accent);border-radius:calc(var(--r)*1.6);padding:72px 48px;text-align:center}.final h2{font-size:clamp(34px,4.4vw,60px);margin-bottom:28px}' +
    '.final .btn{background:var(--on-accent);color:var(--accent);border-color:var(--on-accent)}' +
    'footer{border-top:1px solid var(--line);padding:40px 0;color:var(--muted);font-size:14px}.foot-in{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}' +
    '@media(max-width:820px){.wrap{padding:0 20px}.nav nav{display:none}.hero{padding:28px 0 56px}.hero-in{grid-template-columns:1fr;gap:36px}.lay-panel .hero-in{padding:32px 24px}.lay-bold .art{justify-self:stretch;max-width:none}.grid,.stats-in{grid-template-columns:1fr}.stat{border-left:0;border-top:1px solid var(--line);padding:24px 0}.stat:first-child{border-top:0}.feats,.final{padding:56px 0}.quote{padding:64px 0}.final-in{padding:48px 24px}.sub{font-size:18px}}';

  function artSVG(v) {
    const r = mulberry32(v.artSeed), P = v.pal, g = G[v.glyph];
    const R = v.radius * 1.4;
    const place = (x, y, s, a, b, rot) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ' ' + 32 * s + ' ' + 32 * s + ') scale(' + s + ')">' + g(a, b) + '</g>';
    let body;
    if (v.art === 'poster') {
      body = '<rect width="600" height="520" rx="' + R + '" fill="' + P.primary + '"/>' +
        '<circle cx="' + range(r, 420, 500) + '" cy="' + range(r, 70, 130) + '" r="' + range(r, 120, 170) + '" fill="' + P.accent + '"/>' +
        '<circle cx="' + range(r, 90, 140) + '" cy="' + range(r, 420, 470) + '" r="' + range(r, 90, 130) + '" fill="' + P.onPrimary + '" opacity=".14"/>' +
        place(130, 100, 5.2, P.onPrimary, P.primary, range(r, -12, 12));
    } else if (v.art === 'pattern') {
      let tiles = '';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const odd = (i + j) % 2;
        tiles += place(18 + i * 152 + (j % 2) * 0, 4 + j * 132, 1.75, odd ? P.primary : P.accent, odd ? P.accent : P.primary, range(r, -25, 25));
      }
      body = '<rect width="600" height="520" rx="' + R + '" fill="' + P.surface + '"/>' + tiles;
    } else if (v.art === 'arcs') {
      body = '<rect width="600" height="520" rx="' + R + '" fill="' + mix(P.bg, P.ink, .06) + '"/>' +
        [[290, P.primary], [235, P.accent], [180, P.surface], [125, P.ink], [70, P.accent]].map(a => '<path d="M' + (300 - a[0]) + ' 520a' + a[0] + ' ' + a[0] + ' 0 0 1 ' + a[0] * 2 + ' 0z" fill="' + a[1] + '"/>').join('') +
        place(236, 118, 2.0, P.primary, P.accent, 0);
    } else {
      body = '<rect width="600" height="520" rx="' + R + '" fill="' + P.bg + '"/>' +
        '<rect x="0" y="0" width="292" height="252" rx="' + Math.min(R, 40) + '" fill="' + P.primary + '"/>' + place(86, 60, 2.1, P.onPrimary, P.primary, 0) +
        '<rect x="308" y="0" width="292" height="252" rx="' + Math.min(R, 40) + '" fill="' + P.accent + '"/><circle cx="454" cy="126" r="78" fill="' + P.onAccent + '" opacity=".9"/><circle cx="454" cy="126" r="34" fill="' + P.accent + '"/>' +
        '<rect x="0" y="268" width="292" height="252" rx="' + Math.min(R, 40) + '" fill="' + P.surface + '"/>' + [0, 1, 2, 3, 4].map(i => '<rect x="' + (28 + i * 50) + '" y="296" width="26" height="196" rx="13" fill="' + (i % 2 ? P.accent : P.primary) + '"/>').join('') +
        '<rect x="308" y="268" width="292" height="252" rx="' + Math.min(R, 40) + '" fill="' + P.ink + '"/>' + place(380, 316, 2.3, P.accent, P.ink, range(r, -10, 10));
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" preserveAspectRatio="xMidYMid slice">' + body + '</svg>';
  }
  function artWide(v) {
    const P = v.pal, g = G[v.glyph], r = mulberry32(v.artSeed + 7);
    const cols = [P.primary, P.accent, P.surface, P.ink];
    let tiles = '';
    for (let i = 0; i < 6; i++) {
      const bgc = cols[i % 4], a = bgc === P.ink ? P.accent : bgc === P.surface ? P.primary : bgc === P.accent ? P.onAccent : P.onPrimary;
      const x = 20 + i * 192;
      tiles += '<rect x="' + x + '" y="30" width="172" height="320" rx="' + Math.min(v.radius * 1.4, 70) + '" fill="' + bgc + '"/>' +
        '<g transform="translate(' + (x + 22) + ' ' + (140 - (i % 2) * 0) + ') rotate(' + range(r, -14, 14).toFixed(1) + ' 64 64) scale(2)">' + g(a, bgc) + '</g>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 380" preserveAspectRatio="xMidYMid slice">' + tiles + '</svg>';
  }

  function siteHTML(v) {
    const ind = IND[v.ind], P = v.pal, n = esc(v.name);
    const nav = logoHTML(v, { style: navStyle(v), size: 26 });
    const ic = '<span class="ic">' + markSVG(v, { container: 'none', colors: [P.onPrimary, P.primary] }) + '</span>';
    const sub = ind.sub.replace(/\{n\}/g, n);
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + n + '</title>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="' + fontsHref(v) + '">' +
      '<style>' + brandCSS(v) + SITE_CSS + LOGO_CSS + '</style></head><body class="lay-' + v.layout + '">' +
      '<header class="nav"><div class="wrap nav-in">' + nav + '<nav>' + ind.nav.map(x => '<a href="#">' + x + '</a>').join('') + '</nav><a class="btn sm" href="#">' + esc(ind.cta[0]) + '</a></div></header>' +
      '<section class="hero"><div class="wrap hero-in"><div class="copy"><span class="eyebrow">' + esc(ind.eyebrow) + '</span><h1>' + esc(v.head) + '</h1><p class="sub">' + sub + '</p>' +
      '<div class="cta"><a class="btn" href="#">' + esc(ind.cta[0]) + '</a><a class="btn ghost" href="#">' + esc(ind.cta[1]) + '</a></div></div>' +
      '<div class="art">' + artSVG(v) + '</div><div class="art wide">' + artWide(v) + '</div></div></section>' +
      '<section class="stats"><div class="wrap stats-in">' + ind.stats.map(s => '<div class="stat"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>').join('') + '</div></section>' +
      '<section class="feats"><div class="wrap"><h2>Why people choose ' + n + '</h2><div class="grid">' +
      ind.feats.map(f => '<div class="card">' + ic + '<h3>' + esc(f[0]) + '</h3><p>' + esc(f[1]) + '</p></div>').join('') + '</div></div></section>' +
      '<section class="quote"><div class="wrap"><blockquote>“' + esc(ind.quote[0]) + '”</blockquote><cite>' + esc(ind.quote[1]) + '</cite></div></section>' +
      '<section class="final"><div class="wrap"><div class="final-in"><h2>Ready when you are.</h2><a class="btn" href="#">' + esc(ind.cta[0]) + '</a></div></div></section>' +
      '<footer><div class="wrap foot-in">' + nav + '<span>© 2026 ' + n + '. All rights reserved.</span></div></footer></body></html>';
  }

  /* ───────── export ───────── */
  function tokensCSS(v) {
    const P = v.pal;
    const vars = [['bg', P.bg], ['surface', P.surface], ['ink', P.ink], ['muted', P.muted], ['line', P.line], ['primary', P.primary], ['accent', P.accent],
      ['on-primary', P.onPrimary], ['on-accent', P.onAccent], ['r', v.radius + 'px'], ['rb', v.rb + 'px'],
      ['font-display', '"' + v.fonts.d + '", system-ui, sans-serif'], ['font-body', '"' + v.fonts.b + '", system-ui, sans-serif'], ['wd', v.fonts.w]];
    return '/* ' + v.name + ' brand tokens, generated with Matchmark */\n@import url("' + fontsHref(v) + '");\n\n:root {\n' +
      vars.map(x => '  --' + x[0] + ': ' + x[1] + ';').join('\n') + '\n}\n';
  }
  function paletteList(v) {
    const P = v.pal;
    return [['Background', P.bg], ['Surface', P.surface], ['Ink', P.ink], ['Primary', P.primary], ['Accent', P.accent], ['Muted', P.muted]];
  }

  function crc32(buf) {
    let c, crc = -1;
    for (let i = 0; i < buf.length; i++) { c = (crc ^ buf[i]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; }
    return (crc ^ -1) >>> 0;
  }
  function zip(files) { // store-only zip
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }
  async function brandKitZip(v) {
    const slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
    const P = v.pal;
    const readme = v.name + ' brand kit\n' + '='.repeat(v.name.length + 10) + '\n\n' +
      'index.html   A complete, responsive one-page website. Open it in a browser, edit the copy, deploy anywhere.\n' +
      'logo.svg     Primary logo lockup.\nmark.svg     Icon / avatar / favicon version of the mark.\nbrand.css    Colours, fonts and radii as CSS variables.\n\n' +
      'Colours\n' + paletteList(v).map(c => '  ' + c[0].padEnd(11) + c[1]).join('\n') + '\n\n' +
      'Type\n  Display  ' + v.fonts.d + '\n  Body     ' + v.fonts.b + '\n  Both are free on Google Fonts (https://fonts.google.com).\n\n' +
      'Generated with Matchmark.\n';
    return zip([
      { name: slug + '/index.html', data: siteHTML(v) },
      { name: slug + '/logo.svg', data: await logoSVG(v) },
      { name: slug + '/mark.svg', data: markStandaloneSVG(v) },
      { name: slug + '/brand.css', data: tokensCSS(v) },
      { name: slug + '/README.txt', data: readme }
    ]);
  }

  global.MM = {
    parseBrief, makeVariant, logoHTML, markHTML, markSVG, logoSVG, markStandaloneSVG, siteHTML, tokensCSS, paletteList,
    brandKitZip, fontsHref, LOGO_CSS, IND, mix
  };
})(window);
