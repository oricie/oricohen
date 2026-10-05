// Shared by server.js (Node) and worker/worker.js (Cloudflare). Plain fetch, no dependencies.
// env: ANTHROPIC_API_KEY, PEXELS_API_KEY, optional MATCHMARK_MODEL, ANTHROPIC_BASE_URL, PEXELS_BASE_URL.

export const GLYPHS = 'bagel cup shield lock bolt leaf wave spark peak heart drop hex orbit node pulse sun book pillar house paw flower';

export const SYSTEM = `You are a senior brand strategist and copywriter. Given a business brief, invent distinct brand directions for it.
Return ONLY JSON, no prose: {"directions":[ ... ]}. Each direction is an object with:
 name      brand name, 1-3 words, original (never a real company). If the brief already names the business, reuse that name exactly.
 head      website headline, max 9 words, specific and human, no clichés like "unlock" or "elevate"
 sub       one sentence under the headline; write the brand name where it fits as {n}
 eyebrow   2-4 word label above the headline
 cta       [primary button, secondary button], each max 3 words
 nav       4 short menu items
 feats     exactly 3 pairs [title, one-sentence description] that fit this business
 quote     [a believable customer line, who said it]
 stats     exactly 3 pairs [short number or value, label], plausible, not exaggerated
 mood      2-3 words from: luxury playful minimal bold dark warm calm professional rustic modern friendly
 hue       0-360, the main brand color hue
 glyph     one of: ${GLYPHS}
 photo     a 2-5 word English stock-photo search phrase for the hero image of this direction, concrete and visual (e.g. "fresh bagels wooden counter", "security operations center"), no people's names
Make the directions genuinely different from each other in tone, name style, color and mood. Keep copy short and concrete.`;

export async function brand(env, { text, name, exclude = [], n = 8 }) {
  if (!env.ANTHROPIC_API_KEY) throw Object.assign(new Error('no key'), { status: 503 });
  const user = 'Brief: ' + text + (name ? '\nBusiness name (use exactly): ' + name : '') +
    (exclude.length ? '\nAlready used, do not repeat these names: ' + exclude.join(', ') : '') + '\nReturn ' + n + ' directions.';
  const base = (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const r = await fetch(base + '/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.MATCHMARK_MODEL || 'claude-sonnet-5-5', max_tokens: 6000, system: SYSTEM, messages: [{ role: 'user', content: user }] })
  });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const j = await r.json();
  const raw = (j.content || []).map(b => b.text || '').join('');
  const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  if (!Array.isArray(parsed.directions)) throw new Error('bad shape');
  return { directions: parsed.directions.slice(0, n) };
}

// One Pexels photo for a search phrase. `i` picks which of the top results, so neighbouring cards differ.
export async function photo(env, q, i = 0, orientation = 'landscape') {
  if (!env.PEXELS_API_KEY) throw Object.assign(new Error('no key'), { status: 503 });
  q = String(q || '').slice(0, 80).trim();
  if (!q) throw Object.assign(new Error('empty query'), { status: 400 });
  const base = (env.PEXELS_BASE_URL || 'https://api.pexels.com').replace(/\/$/, '');
  const o = orientation === 'portrait' || orientation === 'square' ? orientation : 'landscape';
  const r = await fetch(base + '/v1/search?per_page=8&orientation=' + o + '&query=' + encodeURIComponent(q), { headers: { Authorization: env.PEXELS_API_KEY } });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const list = (await r.json()).photos || [];
  if (!list.length) throw Object.assign(new Error('no results'), { status: 404 });
  const p = list[Math.abs(+i || 0) % list.length];
  return { url: p.src.large2x || p.src.large, thumb: p.src.medium, w: p.width, h: p.height, credit: p.photographer, link: p.url, alt: p.alt || q };
}
