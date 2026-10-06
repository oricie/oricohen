/* Invitations & greeting cards. Same taste-learning loop, with axes for a card (playful/elegant, colour, illustration,
   era, decoration, shape, mood, handmade). A direction renders as a real card from one display list that becomes
   both an SVG (for preview and sharing) and a canvas (for crisp PNG export with the page's loaded fonts). */
(function (g) {
  'use strict';
  const D = g.DOMAIN, MD = g.MODEL, hsl = MD.hsl;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hasHeb = s => /[֐-׿]/.test(s || '');

  /* ───────── occasions ───────── */
  const OCC = {
    birthday: { re: /birthday|bday|turns?\s+\d|יום הולדת|מסיבת יום הולדת|\bבן\s+\d+|\bבת\s+\d+/i, label: 'Birthday', he: 'יום הולדת', hue: 335, motifs: ['balloon', 'cake', 'hat', 'gift', 'star', 'sparkle'], invite: true,
      heads: ['You’re invited!', 'Let’s celebrate!', 'Come party with us', 'Join the fun'], greet: ['Happy Birthday!', 'Make a wish!', 'Another year of you'], line: o => o.age ? 'is turning ' + o.age : 'is having a birthday',
      msgs: ['Wishing you a day full of cake, laughter and everything you love.', 'Another year, another adventure. Have the best birthday!'], sample: { name: 'Maya', when: 'Saturday, June 14 · 4:00 PM', where: 'Our garden, 12 Oak Street', note: 'Cake, games and a piñata. Come hungry!' },
      H: { heads: ['מוזמנים למסיבה!', 'בואו לחגוג איתנו', 'חוגגים יום הולדת'], greet: ['יום הולדת שמח!', 'מזל טוב!'], line: o => o.age ? 'חוגגת ' + o.age : 'חוגג יום הולדת', msgs: ['מאחלים לך יום מלא באהבה, צחוק ועוגה.'], sample: { name: 'מאיה', when: 'שבת, 14 ביוני · 16:00', where: 'הגינה שלנו', note: 'עוגה, משחקים ושמחה. בואו רעבים!' } } },
    wedding: { re: /wedding|marry|married|bridal|save the date|חתונה|נישואין|מתחתנים|חינה/i, label: 'Wedding', he: 'חתונה', hue: 24, motifs: ['ring', 'flower', 'leaf', 'heart', 'sparkle'], invite: true,
      heads: ['Together with their families', 'We’re getting married', 'Save the date'], greet: ['Congratulations!', 'Wishing you a lifetime of love'], line: () => 'are getting married', msgs: ['Wishing you both a lifetime of love, laughter and happy mornings.'], sample: { name: 'Noa & Daniel', when: 'Sunday, September 21 · 6:30 PM', where: 'The Olive Garden', note: 'Dinner and dancing to follow.' },
      H: { heads: ['מוזמנים לחתונה שלנו', 'מתחתנים!'], greet: ['מזל טוב!'], line: () => 'מתחתנים', msgs: ['מאחלים לכם חיים של אהבה ושמחה.'], sample: { name: 'נועה ודניאל', when: 'יום ראשון, 21 בספטמבר · 18:30', where: 'גן הזיתים', note: 'ארוחה וריקודים' } } },
    baby: { re: /baby|shower|newborn|expecting|בייבי|תינוק|ברית|בריתה|שבוע הבן|הריון/i, label: 'Baby', he: 'תינוק', hue: 200, motifs: ['moon', 'star', 'cloud', 'heart', 'balloon'], invite: true,
      heads: ['Baby on the way', 'Welcome, little one', 'Come meet our baby'], greet: ['Welcome, little one', 'Congratulations on your baby!'], line: () => 'is on the way', msgs: ['A tiny person, a huge amount of love. Congratulations!'], sample: { name: 'Baby Cohen', when: 'Friday, August 8 · 11:00 AM', where: 'Grandma’s house', note: 'Light brunch and lots of cuddles.' },
      H: { heads: ['מוזמנים לחגוג איתנו', 'ברוך הבא לעולם'], greet: ['ברוך הבא לעולם', 'מזל טוב!'], line: () => 'בדרך אלינו', msgs: ['תינוק קטן, המון אהבה. מזל טוב!'], sample: { name: 'משפחת כהן', when: 'שישי, 8 באוגוסט · 11:00', where: 'בית סבתא', note: 'ארוחת בוקר קלה' } } },
    graduation: { re: /graduat|degree|diploma|סיום|בוגר|בוגרת|תואר|סיימ/i, label: 'Graduation', he: 'סיום', hue: 235, motifs: ['cap', 'star', 'sparkle', 'confetti'], invite: true,
      heads: ['Join us to celebrate', 'The graduate', 'We did it!'], greet: ['Congratulations, graduate!', 'You did it!'], line: () => 'is graduating', msgs: ['All that hard work paid off. So proud of you!'], sample: { name: 'Daniel', when: 'Thursday, June 26 · 5:00 PM', where: 'The campus lawn', note: 'Drinks and dinner after the ceremony.' },
      H: { heads: ['מוזמנים לחגוג איתנו', 'עשינו את זה!'], greet: ['מזל טוב לבוגר!', 'עשית את זה!'], line: () => 'מסיים', msgs: ['כל העבודה הקשה השתלמה. גאים בך!'], sample: { name: 'דניאל', when: 'חמישי, 26 ביוני · 17:00', where: 'הדשא בקמפוס', note: 'כיבוד וארוחה אחרי הטקס' } } },
    anniversary: { re: /anniversar|יום נישואין|יום שנה/i, label: 'Anniversary', he: 'יום נישואין', hue: 350, motifs: ['heart', 'flower', 'ring', 'sparkle'], invite: false,
      heads: ['Happy Anniversary', 'Still my favourite'], greet: ['Happy Anniversary', 'Here’s to us'], line: () => 'happy anniversary', msgs: ['Every year with you is my favourite one yet.'], sample: { name: 'Dana & Amit', when: '', where: '', note: '' },
      H: { heads: ['יום נישואין שמח'], greet: ['יום נישואין שמח'], line: () => 'יום נישואין שמח', msgs: ['כל שנה איתך היא האהובה עליי.'], sample: { name: 'דנה ועמית', when: '', where: '', note: '' } } },
    thanks: { re: /thank|תודה/i, label: 'Thank you', he: 'תודה', hue: 150, motifs: ['flower', 'leaf', 'heart', 'sparkle'], invite: false,
      heads: ['Thank you', 'Thanks a million', 'With gratitude'], greet: ['Thank you', 'Thanks so much'], line: () => 'thank you', msgs: ['Thank you for everything you do. It means more than you know.', 'Your kindness made all the difference.'], sample: { name: 'Mom', when: '', where: '', note: '' },
      H: { heads: ['תודה רבה', 'תודה מכל הלב'], greet: ['תודה רבה'], line: () => 'תודה', msgs: ['תודה על הכול. זה אומר יותר ממה שאת יודעת.'], sample: { name: 'אמא', when: '', where: '', note: '' } } },
    congrats: { re: /congrat|well done|new job|promotion|מזל טוב|כל הכבוד|ברכות/i, label: 'Congratulations', he: 'ברכה', hue: 45, motifs: ['star', 'sparkle', 'confetti', 'balloon'], invite: false,
      heads: ['Congratulations!', 'Well done!'], greet: ['Congratulations!', 'You did it!'], line: () => 'congratulations', msgs: ['So proud of you. Go celebrate!'], sample: { name: 'Alex', when: '', where: '', note: '' },
      H: { heads: ['מזל טוב!', 'כל הכבוד!'], greet: ['מזל טוב!'], line: () => 'מזל טוב', msgs: ['גאים בך. לכי לחגוג!'], sample: { name: 'אלכס', when: '', where: '', note: '' } } },
    newhome: { re: /housewarming|new home|new house|חנוכת בית|בית חדש|דירה חדשה/i, label: 'Housewarming', he: 'חנוכת בית', hue: 20, motifs: ['heart', 'leaf', 'sparkle', 'star'], invite: true,
      heads: ['Come see our new home', 'Housewarming'], greet: ['Happy new home!'], line: () => 'are moving in', msgs: ['Wishing you love and laughter in your new home.'], sample: { name: 'Lena & Tom', when: 'Saturday, October 4 · 7:00 PM', where: '8 Garden Lane', note: 'Come for snacks and a tour.' },
      H: { heads: ['מוזמנים לחנוכת הבית', 'בית חדש'], greet: ['בית חדש ושמח!'], line: () => 'עוברים דירה', msgs: ['מאחלים לכם בית מלא אהבה וצחוק.'], sample: { name: 'לנה וטום', when: 'שבת, 4 באוקטובר · 19:00', where: 'רחוב הגנים 8', note: 'כיבוד קל וסיור' } } },
    holiday: { re: /holiday|christmas|new year|hanukkah|rosh hashana|passover|seasonal|eid|diwali|חג|ראש השנה|חנוכה|פסח|שנה טובה|שבועות|סוכות/i, label: 'Holiday', he: 'חג', hue: 8, motifs: ['star', 'sparkle', 'leaf', 'gift'], invite: false,
      heads: ['Happy holidays', 'Warm wishes', 'Season’s greetings'], greet: ['Happy holidays', 'Warm wishes'], line: () => 'warm wishes', msgs: ['Wishing you warmth, peace and good company this season.'], sample: { name: 'The Cohen family', when: '', where: '', note: '' },
      H: { heads: ['חג שמח', 'שנה טובה'], greet: ['חג שמח', 'שנה טובה'], line: () => 'ברכות חמות', msgs: ['מאחלים לכם חג של שלווה, שמחה ובריאות.'], sample: { name: 'משפחת כהן', when: '', where: '', note: '' } } },
    getwell: { re: /get well|feel better|recover|get better|החלמה|רפואה שלמה/i, label: 'Get well', he: 'החלמה', hue: 48, motifs: ['sun', 'flower', 'heart', 'cloud'], invite: false,
      heads: ['Get well soon', 'Thinking of you'], greet: ['Get well soon', 'Thinking of you'], line: () => 'thinking of you', msgs: ['Sending you sunshine and a very big hug. Rest up!'], sample: { name: 'Sam', when: '', where: '', note: '' },
      H: { heads: ['רפואה שלמה', 'מחשבות טובות אליך'], greet: ['רפואה שלמה'], line: () => 'חושבים עליך', msgs: ['שולחים לך שמש וחיבוק גדול. תנוחי!'], sample: { name: 'סם', when: '', where: '', note: '' } } },
    party: { re: /./, label: 'Party', he: 'מסיבה', hue: 280, motifs: ['balloon', 'star', 'confetti', 'hat', 'sparkle'], invite: true,
      heads: ['You’re invited', 'Let’s get together', 'Come celebrate with us'], greet: ['Let’s celebrate!', 'Cheers!'], line: () => 'is celebrating', msgs: ['Thinking of you, and wishing you a wonderful day.'], sample: { name: 'Our little party', when: 'Friday, July 11 · 7:00 PM', where: 'Our place', note: 'Bring a friend and your good mood.' },
      H: { heads: ['מוזמנים לחגוג איתנו', 'בואו להתכנס'], greet: ['בואו נחגוג!'], line: () => 'חוגגים', msgs: ['חושבים עליך ומאחלים לך יום נפלא.'], sample: { name: 'המסיבה שלנו', when: 'שישי, 11 ביולי · 19:00', where: 'אצלנו', note: 'תביאו חבר ומצב רוח טוב' } } }
  };
  const OCC_ORDER = ['wedding', 'baby', 'graduation', 'anniversary', 'thanks', 'getwell', 'newhome', 'holiday', 'birthday', 'congrats', 'party'];

  const STRONG = /invitation|invite|greeting card|\bcard\b|e-?card|הזמנה|כרטיס ברכה|גלויה|ברכה/i;
  const SOFT = /birthday|wedding|engagement|baby shower|graduation|anniversary|thank you|thanks|congrat|party|bridal|housewarming|get well|retirement|newborn|bar mitzvah|bat mitzvah|holiday|new year|יום הולדת|חתונה|אירוסין|בר מצווה|בת מצווה|ברית|מסיבה|תודה|מזל טוב|יום נישואין|חנוכת בית|סיום|שנה טובה/i;
  const BUSINESS = /\b(shop|store|studio|business|company|logo|branding|restaurant|caf[eé]|bakery|agency|photograph(er|y)|planner|salon|boutique|website|landing page|platform|saas|app)\b|עסק|חברה|לוגו|מיתוג|חנות|אתר|סטודיו/i;
  const detect = t => { t = t || ''; if (STRONG.test(t) && !/\b(website|landing page)\b|אתר/i.test(t)) return true; return SOFT.test(t) && !BUSINESS.test(t); };
  const occOf = t => { for (const k of OCC_ORDER) if (OCC[k].re.test(t)) return k; return 'party'; };

  function parse(text, name, when, where) {
    text = text || '';
    const k = occOf(text), O = OCC[k], heb = hasHeb(text) || hasHeb(name) || hasHeb(when) || hasHeb(where), L = heb ? O.H : O;
    const m = text.match(/(?:turns?|turning)\s+(\d{1,3})|(\d{1,3})(?:st|nd|rd|th)\b|בן\s+(\d{1,3})|בת\s+(\d{1,3})/i), age = m ? +(m[1] || m[2] || m[3] || m[4]) : null;
    let nm = (name || '').trim();
    if (!nm) { const n1 = text.match(/(?:for|to|called|named)\s+(?:my\s+(?:\w+\s+)?)?([A-Z][\w'’-]+(?:\s+(?:and|&)\s+[A-Z][\w'’-]+)?)/) || text.match(/([A-Z][a-z]{1,15})['’]s\b/); if (n1) nm = n1[1].replace(/['’]s$/i, ''); }
    const sample = L.sample;
    const invite = /invitation|invite|הזמנה/i.test(text) ? true : /greeting card|\bcard\b|כרטיס ברכה|ברכה|גלויה/i.test(text) ? false : O.invite;
    const F = { name: nm || sample.name, when: (when || '').trim() || (invite ? sample.when : ''), where: (where || '').trim() || (invite ? sample.where : ''), note: invite ? sample.note : '', sign: heb ? 'באהבה' : 'With love', iso: '' };
    return { occ: k, O, L, heb, invite, age, F, text };
  }

  /* ───────── taste axes ───────── */
  const AXES = [
    { id: 'play', name: 'Playfulness', lo: 'Elegant', hi: 'Playful', npLo: 'an elegant tone', npHi: 'a playful tone', adjLo2: 'elegant', adjHi2: 'playful' },
    { id: 'colour', name: 'Colour', lo: 'Muted', hi: 'Vivid', npLo: 'soft, muted colour', npHi: 'vivid colour', adjLo2: 'muted', adjHi2: 'vivid' },
    { id: 'pict', name: 'Illustration', lo: 'Typographic', hi: 'Illustrated', npLo: 'type-led layouts', npHi: 'big illustrations', adjLo2: 'type-led', adjHi2: 'illustrated' },
    { id: 'era', name: 'Modern or vintage', lo: 'Modern', hi: 'Vintage', npLo: 'a modern look', npHi: 'a vintage feel', adjLo2: 'modern', adjHi2: 'vintage' },
    { id: 'decor', name: 'Decoration', lo: 'Minimal', hi: 'Decorated', npLo: 'plenty of white space', npHi: 'lots of decoration', adjLo2: 'minimal', adjHi2: 'decorated' },
    { id: 'shape', name: 'Shape', lo: 'Geometric', hi: 'Organic', npLo: 'clean geometric shapes', npHi: 'soft, organic shapes', adjLo2: 'geometric', adjHi2: 'organic' },
    { id: 'mood', name: 'Mood', lo: 'Calm', hi: 'Festive', npLo: 'a calm mood', npHi: 'a festive mood', adjLo2: 'calm', adjHi2: 'festive' },
    { id: 'hand', name: 'Finish', lo: 'Digital', hi: 'Handmade', npLo: 'a crisp digital finish', npHi: 'a handmade, paper feel', adjLo2: 'crisp', adjHi2: 'handmade' }
  ];
  //            play  colour pict   era    decor  shape  mood   hand
  const ARCH = {
    party: { vec: [.9, .9, .7, -.2, .9, .3, .95, .2], names: ['Confetti Party', 'Balloon Bash', 'Big Celebration'], phil: 'Turn the volume up. Colour, confetti and a big hello.', blurb: 'Bright colour, bouncy type and a pile of party motifs. It looks like a good time already.' },
    elegance: { vec: [-.9, -.4, -.3, .4, -.6, .2, -.5, -.2], names: ['Quiet Elegance', 'Pearl & Ink', 'Soft Luxe'], phil: 'Less, but lovely. Space, a fine serif and one small flourish.', blurb: 'Soft colour, a refined serif and plenty of space. Calm, polished and a little formal.' },
    storybook: { vec: [.5, .4, .95, .5, .6, .8, .3, .9], names: ['Storybook', 'Picture Book', 'Little Tales'], phil: 'Make it feel drawn by hand, for someone you love.', blurb: 'Big friendly illustrations, hand lettering and a paper feel. Warm, personal and a bit whimsical.' },
    modern: { vec: [.1, .8, -.1, -.9, -.4, -.8, .4, -.8], names: ['Modern Block', 'Bold Type', 'Poster Pop'], phil: 'Confident type and flat colour. Clean, loud and current.', blurb: 'Flat colour blocks and oversized type. Crisp, graphic and unmistakably now.' },
    vintage: { vec: [-.2, -.2, .4, .95, .7, .3, 0, .6], names: ['Vintage Charm', 'Postcard', 'Heirloom'], phil: 'Something your grandmother would keep in a drawer.', blurb: 'Cream paper, ornate lettering and old-fashioned charm. Nostalgic and keepsake-worthy.' },
    garden: { vec: [-.4, 0, .6, .4, .6, .95, -.1, .5], names: ['Garden Romance', 'Wildflower', 'Blossom'], phil: 'Soft, growing things. Let it feel like spring.', blurb: 'Flowers, leaves and soft curves in gentle colour. Romantic, airy and natural.' }
  };
  const START = ['party', 'elegance', 'storybook', 'modern', 'vintage', 'garden'];

  /* ───────── fonts ───────── */
  const FONT = {
    'Satisfy': { c: 'script', w: [400], h: 400 }, 'Dancing Script': { c: 'script', w: [400, 700], h: 700 }, 'Great Vibes': { c: 'script', w: [400], h: 400 }, 'Pacifico': { c: 'script', w: [400], h: 400 },
    'Playfair Display': { c: 'serif', w: [400, 700, 900], h: 700 }, 'Cormorant Garamond': { c: 'serif', w: [400, 600, 700], h: 600 }, 'DM Serif Display': { c: 'serif', w: [400], h: 400 }, 'Abril Fatface': { c: 'serif', w: [400], h: 400 },
    'Baloo 2': { c: 'play', w: [400, 700, 800], h: 800 }, 'Fredoka': { c: 'play', w: [400, 600, 700], h: 700 }, 'Chewy': { c: 'play', w: [400], h: 400 }, 'Lilita One': { c: 'play', w: [400], h: 400 },
    'Outfit': { c: 'sans', w: [400, 600, 800], h: 800 }, 'Sora': { c: 'sans', w: [400, 600, 800], h: 800 }, 'Syne': { c: 'sans', w: [400, 700, 800], h: 800 },
    'Bebas Neue': { c: 'cond', w: [400], h: 400 }, 'Anton': { c: 'cond', w: [400], h: 400 },
    'Caveat': { c: 'hand', w: [400, 700], h: 700 }, 'Kalam': { c: 'hand', w: [400, 700], h: 700 }, 'Amatic SC': { c: 'hand', w: [400, 700], h: 700 },
    'Nunito': { b: 1, w: [400, 600, 800] }, 'DM Sans': { b: 1, w: [400, 500, 700] }, 'Montserrat': { b: 1, w: [400, 600, 800] },
    'Frank Ruhl Libre': { c: 'serif', w: [400, 700, 900], h: 700, heb: 1 }, 'Rubik': { c: 'play', w: [400, 700], h: 700, heb: 1 }, 'Heebo': { c: 'sans', w: [400, 800], h: 800, heb: 1 }
  };
  const BYCAT = {}; Object.keys(FONT).forEach(n => { const c = FONT[n].c; if (c && !FONT[n].heb) (BYCAT[c] = BYCAT[c] || []).push(n); });
  const HEBF = { serif: 'Frank Ruhl Libre', script: 'Amatic SC', play: 'Rubik', hand: 'Amatic SC', sans: 'Heebo', cond: 'Heebo' };
  function fontsHrefs(f) {
    return [...new Set([f.head, f.name, f.body])].map(n => 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':wght@' + FONT[n].w.join(';') + '&display=swap');
  }

  /* ───────── palette + design from a taste vector ───────── */
  function palette(mode, h, sat) {
    const S = clamp(sat, 18, 95);
    return ({
      cream: { bg: hsl(38, 48, 92), ink: hsl(h, 36, 20), primary: hsl(h, S * .8, 40), accent: hsl(h + 35, S * .85, 52), soft: hsl(h, 40, 84), white: '#fffaf0' },
      bright: { bg: hsl(h, Math.min(95, S + 8), 60), ink: hsl(h, 60, 12), primary: '#ffffff', accent: hsl(h + 150, 90, 68), soft: hsl(h + 30, 92, 80), white: '#ffffff' },
      mono: { bg: hsl(h, 8, 96), ink: hsl(h, 12, 12), primary: hsl(h, 12, 30), accent: hsl(h, 38, 46), soft: hsl(h, 8, 87), white: '#ffffff' },
      dark: { bg: hsl(h, 38, 11), ink: hsl(h, 20, 95), primary: hsl(h, S, 66), accent: hsl(h + 40, S, 72), soft: hsl(h, 30, 21), white: '#ffffff' },
      soft: { bg: hsl(h, 46, 94), ink: hsl(h, 40, 20), primary: hsl(h, S, 54), accent: hsl(h + 40, S, 62), soft: hsl(h + 20, 55, 87), white: '#ffffff' }
    })[mode];
  }
  const HUEN = [[15, 'red'], [40, 'orange'], [65, 'golden'], [95, 'lime'], [165, 'green'], [195, 'teal'], [225, 'blue'], [265, 'indigo'], [300, 'purple'], [335, 'magenta'], [360, 'red']];
  const hueName = h => (HUEN.find(x => ((h % 360) + 360) % 360 < x[0]) || HUEN[0])[1];
  const LAYN = { center: 'Centred, with a cluster of illustrations', frame: 'A fine frame with corner flourishes', block: 'A colour block with the illustration on top', arch: 'An arched window for the illustration', poster: 'Oversized type, poster-style' };
  const FINN = { paper: 'Paper grain', gradient: 'Soft gradient', pattern: 'Patterned background', solid: 'Flat colour' };

  function designFor(vec, seed, ctx) {
    const [play, colour, pict, era, decor, shape, mood, hand] = vec, r = D.rng(seed * 17 + 3), O = ctx.O;
    const h = (O.hue + (r() - .5) * 46 + (play > .5 ? (r() < .5 ? 34 : -34) : 0) + (era > .5 ? -8 : 0) + 360) % 360, sat = 22 + (colour + 1) / 2 * 66;
    const mode = era > .45 && colour < .35 ? 'cream' : (colour > .45 && mood > .25) ? 'bright' : (colour < -.35 && play < -.2) ? 'mono' : (mood > .55 && pict < 0) ? 'dark' : 'soft';
    const layout = pict > .5 ? pick(r, ['arch', 'block']) : decor > .42 ? 'frame' : era < -.5 ? pick(r, ['poster', 'block']) : 'center';
    let cat = era > .5 && hand > .2 ? 'script' : play > .45 ? 'play' : (era < -.45 && mood > .25) ? 'cond' : play < -.3 ? 'serif' : hand > .45 ? 'hand' : 'sans';
    const head = ctx.heb ? HEBF[cat] : pick(r, BYCAT[cat]);
    const nameCat = ctx.heb ? cat : (cat === 'serif' && era > .1) ? 'script' : (cat === 'sans' || cat === 'cond') ? (play > 0 ? 'play' : 'sans') : cat;
    const name = ctx.heb ? head : (nameCat === cat && cat !== 'script' ? head : pick(r, BYCAT[nameCat]));
    const body = ctx.heb ? 'Heebo' : (cat === 'serif' || era > .45) ? 'Cormorant Garamond' : (play > .3 ? 'Nunito' : 'DM Sans');
    const finish = hand > .35 ? 'paper' : (colour > .5 && mood > .2) ? 'gradient' : decor > .6 ? 'pattern' : 'solid';
    return { hue: h, sat, mode, layout, fonts: { head, name, body, cat }, finish, density: clamp(Math.round(3 + (decor + 1) * 4), 3, 11), organic: shape > .2, pal: palette(mode, h, sat) };
  }

  /* ───────── motifs: local 100×100, drawn with up to 3 colours ───────── */
  const E = (cx, cy, rx, ry, fill, o) => Object.assign({ t: 'e', cx, cy, rx, ry, fill }, o);
  const C = (cx, cy, r, fill, o) => Object.assign({ t: 'c', cx, cy, r, fill }, o);
  const R = (x, y, w, h, fill, o) => Object.assign({ t: 'r', x, y, w, h, fill }, o);
  const P = (d, fill, o) => Object.assign({ t: 'p', d, fill }, o);
  const Gp = (x, y, r, s, k, o) => Object.assign({ t: 'g', x, y, r: r || 0, s: s == null ? 1 : s, k }, o);
  const M = {
    balloon: (a, b) => [E(50, 40, 26, 32, a), E(41, 28, 6, 10, '#fff', { op: .35, r: -25 }), P('M46 71 L54 71 L50 78 Z', a), P('M50 78 C42 86 58 92 50 100', 'none', { st: b, sw: 1.8 })],
    cake: (a, b, c) => [E(50, 88, 40, 6, b, { op: .5 }), R(18, 58, 64, 28, a, { rx: 6 }), P('M18 58 q8 -11 16 0 q8 -11 16 0 q8 -11 16 0 q8 -11 16 0 v7 h-64z', b), R(28, 40, 44, 20, a, { rx: 5 }), P('M28 40 q7 -9 14.7 0 q7.3 -9 14.6 0 q7.3 -9 14.7 0 v6 h-44z', b), R(48, 22, 4, 18, c), E(50, 17, 3.6, 6, '#ffc400')],
    gift: (a, b) => [R(18, 46, 64, 42, a, { rx: 4 }), R(14, 36, 72, 14, b, { rx: 3 }), R(46, 36, 8, 52, b), P('M50 36 C38 14 22 26 34 36 Z', 'none', { st: b, sw: 5 }), P('M50 36 C62 14 78 26 66 36 Z', 'none', { st: b, sw: 5 })],
    hat: (a, b) => [P('M50 12 L84 90 L16 90 Z', a), C(40, 62, 5, b), C(58, 72, 5, b), C(50, 44, 4.5, b), R(12, 88, 76, 6, b, { rx: 3 }), C(50, 11, 7, b)],
    star: (a) => [P('M50 6 L62 37 L95 38 L69 58 L78 90 L50 71 L22 90 L31 58 L5 38 L38 37 Z', a, { lj: 'round' })],
    sparkle: (a) => [P('M50 4 C53 34 66 47 96 50 C66 53 53 66 50 96 C47 66 34 53 4 50 C34 47 47 34 50 4 Z', a)],
    heart: (a, b) => [P('M50 90 C10 62 6 40 6 30 a22 22 0 0 1 44 -6 a22 22 0 0 1 44 6 c0 10 -4 32 -44 60z', a), C(26, 28, 5, '#fff', { op: .45 })],
    flower: (a, b) => [0, 60, 120, 180, 240, 300].map(d => E(50, 26, 11, 20, a, { r: d, ox: 50, oy: 50 })).concat([C(50, 50, 9, b)]),
    leaf: (a, b) => [P('M12 88 C6 44 34 12 90 10 C92 62 60 90 12 88 Z', a), P('M14 86 C34 60 56 38 78 24', 'none', { st: b, sw: 2.6 })],
    moon: (a) => [P('M64 8 A42 42 0 1 0 92 64 A33 33 0 1 1 64 8 Z', a)],
    cloud: (a) => [P('M24 72 a15 15 0 0 1 2 -30 a22 22 0 0 1 42 -6 a18 18 0 0 1 14 36 z', a)],
    sun: (a, b) => [C(50, 50, 19, a)].concat([0, 45, 90, 135, 180, 225, 270, 315].map(d => R(47, 6, 6, 16, b, { rx: 3, r: d, ox: 50, oy: 50 }))),
    ring: (a, b) => [C(38, 58, 22, 'none', { st: a, sw: 6 }), C(62, 58, 22, 'none', { st: b, sw: 6 }), P('M50 8 L60 20 L50 32 L40 20 Z', a)],
    cap: (a, b) => [P('M50 20 L96 42 L50 64 L4 42 Z', a), P('M24 54 v20 c12 12 40 12 52 0 v-20 L50 66 Z', b), P('M88 46 v28', 'none', { st: b, sw: 3 }), C(88, 76, 4, b)]
  };
  function motif(name, x, y, size, rot, cols) { return Gp(x, y, rot, size / 100, (M[name] || M.star)(cols[0], cols[1], cols[2] || cols[0]).map(o => Object.assign({}, o, { ox: o.ox, oy: o.oy })), {}); }

  /* ───────── text fitting ───────── */
  const CW = { script: .42, serif: .5, play: .56, sans: .56, cond: .4, hand: .4 };
  function fit(str, maxW, fs, minFs, cat, maxLines) {
    str = String(str || ''); const k = CW[cat] || .52; let size = fs;
    for (; size >= minFs; size -= 2) {
      const words = str.split(/\s+/), lines = []; let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (t.length * size * k <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
      if (cur) lines.push(cur);
      if (lines.length <= (maxLines || 3) && Math.max(...lines.map(l => l.length)) * size * k <= maxW * 1.04) return { lines, fs: size };
    }
    const words = str.split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (t.length * minFs * k <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
    if (cur) lines.push(cur); return { lines: lines.slice(0, maxLines || 3), fs: minFs };
  }
  const T = (x, y, lines, ff, fw, fs, fill, a, o) => Object.assign({ t: 'tx', x, y, lines, ff, fw, fs, fill, a: a || 'middle', lh: fs * 1.12 }, o);

  /* ───────── card layouts ───────── */
  const FORMATS = { portrait: [700, 980], square: [800, 800], story: [540, 960] };
  function cardOps(d, side, fmt) {
    const [W, H] = FORMATS[fmt || 'portrait'], des = d.design, P_ = des.pal, F = d.fields, ctx = d.cctx, rtl = !!ctx.heb;
    const r = D.rng(d.seed * 7 + (side === 'front' ? 1 : 2)), ops = [], cat = des.fonts.cat;
    const fh = des.fonts.head, fn = des.fonts.name, fb = des.fonts.body, wH = FONT[fh].h, wN = FONT[fn].h || 400, wB = 400;
    const sx = x => rtl ? W - x : x;                 // reading-start x
    const motifs = ctx.O.motifs, cols = [P_.primary, P_.accent, P_.ink];
    const pal3 = i => [[P_.primary, P_.accent, P_.ink], [P_.accent, P_.primary, P_.ink], [P_.ink, P_.accent, P_.primary], [P_.primary, P_.white, P_.accent]][i % 4];
    const bgFill = des.finish === 'gradient' ? { grad: [P_.bg, P_.soft, 160] } : P_.bg;
    ops.push(R(0, 0, W, H, bgFill, { bg: 1 }));
    if (des.finish === 'paper') for (let i = 0; i < 380; i++) ops.push(C(r() * W, r() * H, .5 + r() * 1.1, P_.ink, { op: .035 + r() * .05 }));
    if (des.finish === 'pattern') { const step = W / 9; for (let y = step / 2; y < H; y += step) for (let x = ((Math.round(y / step) % 2) ? step / 2 : 0); x < W; x += step) ops.push(C(x, y, 3.2, P_.accent, { op: .22 })); }
    const confetti = (n, box, avoid) => {
      for (let i = 0; i < n; i++) {
        let x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]); if (avoid && x > avoid[0] && x < avoid[2] && y > avoid[1] && y < avoid[3]) continue;
        const c = pick(r, [P_.primary, P_.accent, P_.ink, P_.soft]), k = Math.floor(r() * 4), s = 8 + r() * 12;
        if (k === 0) ops.push(C(x, y, s / 2.2, c, { op: .85 })); else if (k === 1) ops.push(Gp(x, y, r() * 180, 1, [R(-s / 2, -s / 4, s, s / 2, c, { rx: 2 })], { op: .85 }));
        else if (k === 2) ops.push(Gp(x, y, r() * 360, 1, [P('M0 -' + s / 2 + ' L' + s / 2 + ' ' + s / 2 + ' L-' + s / 2 + ' ' + s / 2 + ' Z', c)], { op: .85 }));
        else ops.push(Gp(x, y, r() * 360, 1, [P('M-' + s / 2 + ' 0 q' + s / 4 + ' -' + s / 2 + ' ' + s / 2 + ' 0 t' + s / 2 + ' 0', 'none', { st: c, sw: 2.6 })], { op: .9 }));
      }
    };
    const small = (nm, x, y, s, rot, i) => ops.push(motif(nm, x, y, s, rot, pal3(i)));
    const hero = (cx, cy, size) => { // a cluster built from the occasion's motifs
      const a = motifs[0], b = motifs[1 % motifs.length], c = motifs[2 % motifs.length];
      small(b, cx - size * .46, cy + size * .1, size * .55, -14, 1); small(c, cx + size * .48, cy + size * .12, size * .5, 12, 2); small(a, cx, cy - size * .02, size * .78, 0, 0);
    };
    const headTxt = F.head != null ? F.head : d.head, nameTxt = F.name, lineTxt = F.line != null ? F.line : d.line;
    const catN = (FONT[fn] || {}).c || cat;
    // Stacked text: measures each item, shrinks together if the stack would overflow, then places baselines.
    const stack = (x, y0, y1, items, a) => {
      let k = 1, fs;
      const build = () => items.map(it => fit(it.text, it.w, it.fs * k, it.min * k, it.cat || cat, it.lines || 2)), total = () => fs.reduce((t, f, i) => t + f.lines.length * f.fs * 1.12 + (i < items.length - 1 ? items[i].gap || 0 : 0), 0);
      fs = build(); while (total() > y1 - y0 && k > .5) { k -= .05; fs = build(); }
      let cur = y0; items.forEach((it, i) => { const f = fs[i]; ops.push(T(x, cur + f.fs * .88, f.lines, it.ff, it.fw, f.fs, it.fill, a || 'middle', { rtl, ls: it.ls })); cur += f.lines.length * f.fs * 1.12 + (it.gap || 0); }); return cur;
    };
    const items = (w, hs, ns, ls_, withWhen, fillHead) => {
      const it = [{ text: headTxt, ff: fh, fw: wH, fs: H * hs, min: H * .03, fill: fillHead || P_.primary, w, gap: H * .028, cat }, { text: nameTxt, ff: fn, fw: wN, fs: H * ns, min: H * .045, fill: P_.ink, w, gap: H * .03, cat: catN }, { text: lineTxt, ff: fb, fw: wB, fs: H * ls_, min: H * .02, fill: P_.ink, w, ls: 1, gap: H * .045, cat: 'sans' }];
      if (withWhen && ctx.invite && F.when) it.push({ text: F.when, ff: fb, fw: 600, fs: H * .026, min: H * .02, fill: P_.primary === '#ffffff' ? P_.ink : P_.primary, w, ls: 2.5, lines: 2, cat: 'sans' });
      return it;
    };
    const L = des.layout, gW = W * .84, bright = des.mode === 'bright';

    if (side === 'front') {
      if (L === 'center') {
        hero(W / 2, H * .24, Math.min(W, H) * .46); confetti(des.density + 5, [W * .05, H * .04, W * .95, H * .46], [W * .22, H * .06, W * .78, H * .42]);
        stack(W / 2, H * .5, H * .93, items(gW, .06, .12, .03, true));
      } else if (L === 'frame') {
        ops.push(R(W * .05, W * .05, W * .9, H - W * .1, 'none', { st: P_.accent, sw: 5, rx: des.organic ? 40 : 4 })); ops.push(R(W * .075, W * .075, W * .85, H - W * .15, 'none', { st: bright ? P_.ink : P_.primary, sw: 1.6, rx: des.organic ? 30 : 2 }));
        [[.15, .1], [.85, .1], [.15, .91], [.85, .91]].forEach((p, i) => small(motifs[(i + 1) % motifs.length], W * p[0], H * p[1], W * .13, i * 90, i));
        small(motifs[0], W / 2, H * .2, W * .36, 0, 0); confetti(des.density, [W * .15, H * .12, W * .85, H * .88], [W * .1, H * .08, W * .9, H * .88]);
        stack(W / 2, H * .38, H * .86, items(W * .68, .055, .115, .03, true));
      } else if (L === 'block') {
        const bh = H * .5, blk = bright ? P_.ink : P_.primary, mc = bright ? [P_.soft, P_.accent, P_.white] : [P_.white, P_.accent, P_.ink];
        ops.push(R(0, 0, W, bh, blk)); ops.push(P('M0 ' + bh + ' q' + W / 8 + ' ' + H * .04 + ' ' + W / 4 + ' 0 t' + W / 4 + ' 0 t' + W / 4 + ' 0 t' + W / 4 + ' 0 V0 H0 Z', blk));
        const s_ = Math.min(W, H) * .5; ops.push(motif(motifs[0], W / 2, bh * .5, s_, 0, mc)); ops.push(motif(motifs[1 % motifs.length], W * .2, bh * .66, s_ * .5, -16, [mc[1], mc[0], mc[2]])); ops.push(motif(motifs[2 % motifs.length], W * .8, bh * .64, s_ * .46, 14, [mc[1], mc[2], mc[0]]));
        confetti(des.density + 4, [W * .04, H * .03, W * .96, bh * .85], [W * .22, bh * .12, W * .78, bh * .85]);
        stack(W / 2, H * .6, H * .95, items(gW, .055, .115, .03, true));
      } else if (L === 'arch') {
        const ax = W * .13, aw = W * .74, ay = H * .06, ah = H * .5;
        ops.push(P('M' + ax + ' ' + (ay + ah) + ' V' + (ay + aw / 2) + ' a' + aw / 2 + ' ' + aw / 2 + ' 0 0 1 ' + aw + ' 0 V' + (ay + ah) + ' Z', bright ? P_.ink : P_.soft));
        hero(W / 2, ay + ah * .56, Math.min(aw, ah) * .9); confetti(des.density + 2, [ax + 20, ay + 30, ax + aw - 20, ay + ah - 20], [W * .28, ay + ah * .2, W * .72, ay + ah * .85]);
        stack(W / 2, H * .6, H * .95, items(gW, .052, .105, .028, true));
      } else { // poster
        ops.push(C(W * (rtl ? .12 : .88), H * .16, W * .42, P_.accent, { op: .9 })); ops.push(Gp(W / 2, H * .5, -12, 1, [R(-W, -H * .02, W * 2, H * .04, bright ? P_.white : P_.primary, { op: .9 })]));
        ops.push(motif(motifs[0], W * (rtl ? .22 : .78), H * .76, Math.min(W, H) * .46, rtl ? 12 : -12, [bright ? P_.white : P_.primary, P_.accent, P_.ink])); confetti(des.density, [W * .05, H * .05, W * .95, H * .95], [W * .05, H * .18, W * .95, H * .7]);
        const words = String(headTxt).replace(/[!?.]/g, '').split(/\s+/).slice(0, 4); const fs = Math.min(H * .1, (W * .8) / Math.max(...words.map(w => w.length)) / (CW[cat] || .5));
        words.forEach((w, i) => ops.push(T(sx(W * .08), H * .2 + i * fs * 1.04 + fs * .8, [ctx.heb ? w : w.toUpperCase()], fh, wH, fs, i % 2 ? (bright ? P_.white : P_.primary) : P_.ink, 'start', { rtl })));
        const y0 = H * .2 + words.length * fs * 1.04 + H * .03; stack(sx(W * .08), y0, H * .94, [{ text: nameTxt, ff: fn, fw: wN, fs: H * .085, min: H * .04, fill: P_.ink, w: W * .8, gap: H * .02, cat: catN }, { text: lineTxt, ff: fb, fw: wB, fs: H * .028, min: H * .02, fill: P_.ink, w: W * .7, ls: 1, gap: H * .03, cat: 'sans' }].concat(ctx.invite && F.when ? [{ text: F.when, ff: fb, fw: 600, fs: H * .024, min: H * .018, fill: P_.ink, w: W * .8, ls: 2, cat: 'sans' }] : []), 'start');
      }
    } else { // back / inside
      const tc = bright ? P_.white : P_.primary;
      if (L === 'frame' || L === 'center') ops.push(R(W * .06, W * .06, W * .88, H - W * .12, 'none', { st: P_.accent, sw: 3, rx: des.organic ? 34 : 2 }));
      if (L === 'block') ops.push(R(0, 0, W, H * .17, bright ? P_.ink : P_.primary));
      if (L === 'arch') ops.push(P('M' + W * .3 + ' ' + H * .2 + ' a' + W * .2 + ' ' + W * .2 + ' 0 0 1 ' + W * .4 + ' 0 V' + H * .25 + ' H' + W * .3 + ' Z', bright ? P_.ink : P_.soft));
      small(motifs[0], W / 2, H * .13, Math.min(W, H) * .2, 0, L === 'block' ? 3 : 0); small(motifs[1 % motifs.length], W * .14, H * .92, W * .12, -20, 1); small(motifs[2 % motifs.length], W * .86, H * .92, W * .12, 20, 2);
      confetti(des.density, [W * .06, H * .04, W * .94, H * .96], [W * .1, H * .2, W * .9, H * .86]);
      if (ctx.invite) {
        const it = [{ text: ctx.heb ? 'פרטים' : 'The details', ff: fh, fw: wH, fs: H * .05, min: H * .03, fill: tc, w: gW, gap: H * .04, cat }];
        [[F.when, ctx.heb ? 'מתי' : 'When'], [F.where, ctx.heb ? 'איפה' : 'Where']].forEach(p => { if (!p[0]) return; it.push({ text: p[1].toUpperCase(), ff: fb, fw: 600, fs: H * .018, min: H * .014, fill: P_.accent, w: gW, ls: 3, lines: 1, gap: H * .008, cat: 'sans' }); it.push({ text: p[0], ff: fb, fw: 600, fs: H * .04, min: H * .024, fill: P_.ink, w: gW * .9, gap: H * .035, cat: 'sans' }); });
        if (F.note) it.push({ text: F.note, ff: fb, fw: wB, fs: H * .03, min: H * .02, fill: P_.ink, w: gW * .8, lines: 4, cat: 'sans' });
        stack(W / 2, H * .3, H * .86, it);
      } else {
        stack(W / 2, H * .3, H * .74, [{ text: F.msg != null ? F.msg : d.msg, ff: fn, fw: wN, fs: H * .06, min: H * .028, fill: P_.ink, w: gW * .86, lines: 6, cat: catN }]);
        stack(W / 2, H * .78, H * .9, [{ text: (F.sign || '') + (F.from ? ', ' + F.from : ''), ff: fn, fw: wN, fs: H * .05, min: H * .028, fill: tc === '#ffffff' ? P_.ink : tc, w: gW, lines: 2, cat: catN }]);
      }
    }
    return { W, H, ops, bgFill, pal: P_, fonts: des.fonts, rtl };
  }

  /* ───────── renderers: SVG string and canvas ───────── */
  const num = v => Math.round(v * 100) / 100;
  function tfOf(o) { return 'translate(' + num(o.x) + ' ' + num(o.y) + ')' + (o.r ? ' rotate(' + num(o.r) + ')' : '') + (o.s !== 1 ? ' scale(' + num(o.s) + ')' : ''); }
  function svgOps(ops, id) {
    return ops.map(o => {
      const op = o.op != null ? ' opacity="' + o.op + '"' : '', rot = o.r && o.t !== 'g' ? ' transform="rotate(' + o.r + ' ' + (o.ox != null ? o.ox : (o.cx != null ? o.cx : 0)) + ' ' + (o.oy != null ? o.oy : (o.cy != null ? o.cy : 0)) + ')"' : '';
      const st = o.st ? ' stroke="' + o.st + '" stroke-width="' + (o.sw || 1) + '" stroke-linecap="round" stroke-linejoin="round"' : '', fill = o.fill && o.fill.grad ? 'url(#' + id + ')' : (o.fill || 'none');
      switch (o.t) {
        case 'g': return '<g transform="' + tfOf(o) + '"' + op + '>' + svgOps(o.k, id) + '</g>';
        case 'r': return '<rect x="' + num(o.x) + '" y="' + num(o.y) + '" width="' + num(o.w) + '" height="' + num(o.h) + '"' + (o.rx ? ' rx="' + o.rx + '"' : '') + ' fill="' + fill + '"' + st + op + rot + '/>';
        case 'c': return '<circle cx="' + num(o.cx) + '" cy="' + num(o.cy) + '" r="' + num(o.r) + '" fill="' + fill + '"' + st + op + '/>';
        case 'e': return '<ellipse cx="' + num(o.cx) + '" cy="' + num(o.cy) + '" rx="' + num(o.rx) + '" ry="' + num(o.ry) + '" fill="' + fill + '"' + st + op + rot + '/>';
        case 'p': return '<path d="' + o.d + '" fill="' + fill + '"' + st + op + rot + '/>';
        case 'tx': return '<text x="' + num(o.x) + '" y="' + num(o.y) + '" font-family="\'' + o.ff + '\',serif" font-weight="' + o.fw + '" font-size="' + num(o.fs) + '" fill="' + o.fill + '" text-anchor="' + o.a + '"' + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + (o.rtl ? ' direction="rtl" unicode-bidi="plaintext"' : '') + op + '>' + o.lines.map((l, i) => '<tspan x="' + num(o.x) + '" dy="' + (i ? num(o.lh) : 0) + '">' + esc(l) + '</tspan>').join('') + '</text>';
      } return '';
    }).join('');
  }
  let gid = 0;
  function svg(d, side, fmt, o) {
    o = o || {}; const c = cardOps(d, side, fmt), id = 'g' + (++gid), g_ = c.bgFill && c.bgFill.grad;
    const defs = (g_ ? '<linearGradient id="' + id + '" gradientTransform="rotate(' + g_[2] + ' .5 .5)"><stop offset="0" stop-color="' + g_[0] + '"/><stop offset="1" stop-color="' + g_[1] + '"/></linearGradient>' : '') + (o.fonts ? '<style>' + fontsHrefs(c.fonts).map(h => "@import url('" + h + "');").join('') + '</style>' : '');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + c.W + ' ' + c.H + '"' + (o.size ? ' width="' + c.W + '" height="' + c.H + '"' : '') + '><defs>' + defs + '</defs>' + svgOps(c.ops, id) + '</svg>';
  }
  function drawCanvas(ctx, ops, bg) {
    for (const o of ops) {
      ctx.save(); if (o.op != null) ctx.globalAlpha *= o.op;
      const fillStyle = o.fill && o.fill.grad ? (() => { const gr = ctx.createLinearGradient(0, 0, ctx.canvas._w * .35, ctx.canvas._h); gr.addColorStop(0, o.fill.grad[0]); gr.addColorStop(1, o.fill.grad[1]); return gr; })() : (o.fill && o.fill !== 'none' ? o.fill : null);
      const doRot = () => { if (o.r && o.t !== 'g') { const ox = o.ox != null ? o.ox : (o.cx != null ? o.cx : 0), oy = o.oy != null ? o.oy : (o.cy != null ? o.cy : 0); ctx.translate(ox, oy); ctx.rotate(o.r * Math.PI / 180); ctx.translate(-ox, -oy); } };
      const paint = () => { if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); } if (o.st) { ctx.strokeStyle = o.st; ctx.lineWidth = o.sw || 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); } };
      switch (o.t) {
        case 'g': ctx.translate(o.x, o.y); if (o.r) ctx.rotate(o.r * Math.PI / 180); ctx.scale(o.s, o.s); drawCanvas(ctx, o.k, bg); break;
        case 'r': doRot(); ctx.beginPath(); if (ctx.roundRect && o.rx) ctx.roundRect(o.x, o.y, o.w, o.h, o.rx); else ctx.rect(o.x, o.y, o.w, o.h); paint(); break;
        case 'c': ctx.beginPath(); ctx.arc(o.cx, o.cy, o.r, 0, Math.PI * 2); paint(); break;
        case 'e': doRot(); ctx.beginPath(); ctx.ellipse(o.cx, o.cy, o.rx, o.ry, 0, 0, Math.PI * 2); paint(); break;
        case 'p': doRot(); { const p = new Path2D(o.d); if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(p); } if (o.st) { ctx.strokeStyle = o.st; ctx.lineWidth = o.sw || 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p); } } break;
        case 'tx': ctx.font = o.fw + ' ' + o.fs + 'px "' + o.ff + '", serif'; ctx.fillStyle = o.fill; ctx.textAlign = o.a === 'middle' ? 'center' : o.a === 'end' ? (o.rtl ? 'left' : 'right') : (o.rtl ? 'right' : 'left'); ctx.direction = o.rtl ? 'rtl' : 'ltr'; if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px'; o.lines.forEach((l, i) => ctx.fillText(l, o.x, o.y + i * o.lh)); break;
      }
      ctx.restore();
    }
  }
  async function png(d, side, fmt, scale) {
    const c = cardOps(d, side, fmt), sc = scale || 2, cv = document.createElement('canvas'); cv.width = c.W * sc; cv.height = c.H * sc; cv._w = c.W; cv._h = c.H;
    const fam = new Set(); (function walk(os) { os.forEach(o => { if (o.t === 'tx') fam.add(o.fw + ' 40px "' + o.ff + '"'); if (o.k) walk(o.k); }); })(c.ops);
    try { await Promise.all([...fam].map(f => document.fonts.load(f))); } catch (e) { }
    const ctx = cv.getContext('2d'); ctx.scale(sc, sc); drawCanvas(ctx, c.ops, c.pal.bg);
    return new Promise(res => cv.toBlob(res, 'image/png'));
  }

  /* ───────── directions ───────── */
  const nearest = v => { let best = null, bd = 9; for (const k in ARCH) { const d = Math.sqrt(v.reduce((s, x, i) => s + (x - ARCH[k].vec[i]) ** 2, 0)); if (d < bd) { bd = d; best = k; } } return best; };
  const tagsFor = v => v.map((x, i) => [i, Math.abs(x)]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => v[i] > 0 ? AXES[i].hi : AXES[i].lo);
  function makeDirection(vec, seed, ctx, over) {
    vec = vec.map(x => clamp(+x.toFixed(2), -.95, .95));
    const arch = nearest(vec), A = ARCH[arch], name = A.names.find(n => !ctx.used.has(n)) || (A.names[0] + ' ' + (ctx.used.size % 5 + 2));
    ctx.used.add(name); const r = D.rng(seed * 5 + 1), L = ctx.L;
    const design = designFor(vec, seed, ctx), head = pick(r, ctx.invite ? L.heads : L.greet), line = L.line({ age: ctx.age }), msg = pick(r, L.msgs);
    const d = { id: seed, seed, vec, arch, name, letter: String.fromCharCode(65 + (ctx.count++ % 26)), kind: 'card', packKey: 'card', pack: { name: ctx.title, kind: ctx.invite ? 'Invitation' : 'Greeting card', labels: {}, groups: {} }, design, head, line, msg, fields: ctx.fields, cctx: ctx,
      theme: { raised: design.pal.soft, bg: design.pal.bg }, tags: tagsFor(vec), explain: A.blurb, philosophy: A.phil };
    d.decisions = [['Colour', ({ cream: 'Warm cream', bright: 'Bright colour', mono: 'Soft monochrome', dark: 'Deep and dark', soft: 'Gentle pastel' })[design.pal && design.mode] + ', ' + hueName(design.hue)], ['Type', design.fonts.head + (design.fonts.name !== design.fonts.head ? ' with ' + design.fonts.name : '')], ['Layout', LAYN[design.layout]], ['Finish', FINN[design.finish]], ['Motifs', ctx.O.motifs.slice(0, 3).join(', ')], ['Voice', '“' + head + '”']];
    return Object.assign(d, over || {});
  }
  const initialDirections = (ctx, seed) => START.map((k, i) => makeDirection(ARCH[k].vec, seed + i, ctx));
  function nextDirection(hist, shown, ctx, seed) {
    const Lr = MD.learn(hist), r = D.rng(seed * 13 + hist.length * 977), dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
    const order = Lr.conf.map((c, i) => [i, c + r() * .22]).sort((a, b) => a[1] - b[1]), probes = [order[0][0], order[1][0]];
    let v = Lr.taste.map((t, i) => clamp(t * (1 + .35 * Lr.conf[i]) + (r() - .5) * .5 * (1 - Lr.conf[i]), -.95, .95));
    probes.forEach((i, k) => { const seen = shown.map(s => s.vec[i]).reduce((a, b) => a + b, 0) / Math.max(1, shown.length); const sign = Math.abs(seen) > .15 ? (seen > 0 ? -1 : 1) : (r() < .5 ? -1 : 1); v[i] = sign * (k === 0 ? .65 + r() * .3 : .45 + r() * .3); });
    for (let t = 0; t < 6; t++) { if (Math.min(...shown.map(s => dist(v, s.vec)), 9) >= .9) break; const i = Math.floor(r() * 8); v[i] = clamp(-v[i] * .8 + (r() - .5) * .4, -.95, .95); }
    const d = makeDirection(v, seed, ctx); d.why = { push: [], probe: probes.map(i => AXES[i].name) }; return d;
  }
  function finalDirection(hist, ctx, seed) {
    const Lr = MD.learn(hist), v = Lr.taste.map((t, i) => clamp(t * (.55 + .45 * Lr.conf[i]) * 1.3, -.95, .95));
    const d = makeDirection(v, seed, { ...ctx, used: new Set() }); d.closest = d.name; d.final = true; return d;
  }
  function meters(Lr) { const t = Lr.taste, c = Lr.conf, m = a => (a + 1) / 2; return [{ name: 'Playfulness', v: m(t[0]), c: c[0], lo: 'Elegant', hi: 'Playful' }, { name: 'Colour', v: m(t[1]), c: c[1], lo: 'Muted', hi: 'Vivid' }, { name: 'Illustration', v: m(t[2]), c: c[2], lo: 'Typographic', hi: 'Illustrated' }, { name: 'Modern or vintage', v: m(t[3]), c: c[3], lo: 'Modern', hi: 'Vintage' }, { name: 'Decoration', v: m(t[4]), c: c[4], lo: 'Minimal', hi: 'Decorated' }]; }
  function summary(Lr) {
    const idx = Lr.taste.map((t, i) => [i, Math.abs(t) * Lr.conf[i]]).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(x => x[1] > .08);
    if (!idx.length) return 'Still guessing. React to a few directions.';
    const w = idx.map(([i]) => Lr.taste[i] > 0 ? AXES[i].npHi : AXES[i].npLo); return 'You lean toward ' + (w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : w[0]) + '.';
  }
  const MSG = { play: ['Noted. A more elegant tone.', 'Got it. You want it playful.'], colour: ['Understood. Softer, quieter colour.', 'Got it. Bring on the colour.'], pict: ['Noted. Let the type lead.', 'Got it. You like big illustrations.'], era: ['Understood. Clean and modern.', 'Got it. A vintage feel suits you.'], decor: ['Noted. Keep it simple, with room to breathe.', 'Got it. You like it decorated.'], shape: ['Noted. Cleaner, geometric shapes.', 'Got it. Soft, organic shapes.'], mood: ['Understood. Calm and quiet.', 'Got it. Make it festive.'], hand: ['Noted. Crisp and digital.', 'Got it. A handmade, paper feel.'] };
  function reaction(before, after) { let best = 0, bi = 0; after.taste.forEach((t, i) => { const dd = Math.abs(t * after.conf[i] - before.taste[i] * before.conf[i]); if (dd > best) { best = dd; bi = i; } }); return { axis: bi, text: MSG[AXES[bi].id][after.taste[bi] > 0 ? 1 : 0] }; }
  const closing = hist => hist.length >= 5;

  /* ───────── preview mount (1280×800 stage, card centred) ───────── */
  const loaded = new Set();
  function ensureFonts(d) { fontsHrefs(d.design.fonts).forEach(h => { if (loaded.has(h)) return; loaded.add(h); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); }); }
  function mount(host, d, o) {
    o = o || {}; ensureFonts(d); const sr = host.shadowRoot || host.attachShadow({ mode: 'open' }), st = Object.assign({ screen: 'front' }, o.state);
    const draw = () => {
      const side = st.screen === 'details' || st.screen === 'inside' ? 'back' : 'front', fmt = st.screen === 'story' ? 'story' : 'portrait', h = fmt === 'story' ? 770 : 760;
      sr.innerHTML = '<style>:host{display:block;width:1280px;height:800px}.st{width:1280px;height:800px;background:' + d.design.pal.soft + ';display:grid;place-items:center;position:relative;overflow:hidden}.st::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.55),transparent 62%)}.st svg{position:relative;height:' + h + 'px;width:auto;border-radius:6px;box-shadow:0 30px 60px -20px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.06)}</style><div class="st">' + svg(d, side, fmt) + '</div>';
      if (o.onChange) o.onChange(st);
    };
    draw(); return { state: st, redraw: draw, go: s => { st.screen = s; draw(); } };
  }
  const screensFor = (d, n) => [{ id: 'front', state: { screen: 'front' } }, d.cctx.invite ? { id: 'details', state: { screen: 'details' } } : { id: 'inside', state: { screen: 'inside' } }, { id: 'story', state: { screen: 'story' } }].slice(0, n);
  const LB = { front: 'Front', details: 'Details', inside: 'Inside', story: 'Story' };

  /* ───────── share helpers ───────── */
  function icsFor(d) {
    const F = d.fields; if (!F.iso) return null; const s = new Date(F.iso); if (isNaN(s)) return null; const e = new Date(s.getTime() + 2 * 3600e3), f = x => x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0') + 'T' + String(x.getHours()).padStart(2, '0') + String(x.getMinutes()).padStart(2, '0') + '00';
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Converge//EN', 'BEGIN:VEVENT', 'UID:' + d.seed + '@converge', 'DTSTAMP:' + f(new Date()) + 'Z', 'DTSTART:' + f(s), 'DTEND:' + f(e), 'SUMMARY:' + (F.head || d.head) + ' ' + F.name, 'LOCATION:' + (F.where || ''), 'DESCRIPTION:' + (F.note || ''), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function invitePage(d) {
    const F = d.fields, ics = icsFor(d), links = fontsHrefs(d.design.fonts).map(h => '<link rel="stylesheet" href="' + h + '">').join('');
    return '<!doctype html><html lang="' + (d.cctx.heb ? 'he' : 'en') + '"' + (d.cctx.heb ? ' dir="rtl"' : '') + '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(F.name) + '</title>' + links + '<style>body{margin:0;background:' + d.design.pal.soft + ';font-family:\'' + d.design.fonts.body + '\',system-ui,sans-serif;color:' + d.design.pal.ink + ';display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}main{max-width:460px;width:100%;text-align:center}svg{width:100%;height:auto;border-radius:10px;box-shadow:0 30px 60px -20px rgba(0,0,0,.35)}p{margin:6px 0}.b{display:inline-block;margin:14px 6px 0;padding:12px 22px;border-radius:99px;background:' + d.design.pal.primary + ';color:' + d.design.pal.white + ';text-decoration:none;font-weight:700}</style></head><body><main>' + svg(d, 'front', 'portrait') + '<h2 style="margin:22px 0 4px">' + esc(F.when) + '</h2><p>' + esc(F.where) + '</p><p>' + esc(F.note) + '</p>' + (ics ? '<a class="b" download="event.ics" href="data:text/calendar;charset=utf-8,' + encodeURIComponent(ics) + '">' + (d.cctx.heb ? 'הוסף ליומן' : 'Add to calendar') + '</a>' : '') + '</main></body></html>';
  }

  g.CARDS = {
    detect, parse, occOf, OCC, FORMATS, svg, png, cardOps, icsFor, invitePage, fontsHrefs, hasHeb, FONT, hueName,
    model: { AXES, ARCH, AX: {}, learn: MD.learn, meters, summary, reaction, closing, makeDirection, initialDirections, nextDirection, finalDirection, ready: MD.ready },
    render: { mount, ensureFonts, SCREENS: ['front', 'details', 'story'] }, screensFor, LB
  };
})(window);
