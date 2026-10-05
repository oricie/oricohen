#!/usr/bin/env node
/* Matchmark server: serves this folder and proxies brand "directions" from Claude.
   No dependencies. Needs Node 18+.

     ANTHROPIC_API_KEY=sk-ant-... node swipe/server.js        # http://localhost:8787

   Without a key, /api/brand answers 503 and the app quietly uses its built-in rule-based generator. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

const PORT = +process.env.PORT || 8787;
const MODEL = process.env.MATCHMARK_MODEL || 'claude-sonnet-5-5';
const API = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '') + '/v1/messages';
const GLYPHS = 'bagel cup shield lock bolt leaf wave spark peak heart drop hex orbit node pulse sun book pillar house paw flower';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

const SYSTEM = `You are a senior brand strategist and copywriter. Given a business brief, invent distinct brand directions for it.
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
Make the directions genuinely different from each other in tone, name style, color and mood. Keep copy short and concrete.`;

const hits = new Map();
function limited(ip) {
  const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 60000);
  a.push(now); hits.set(ip, a); return a.length > 12;
}

async function directions(text, name, exclude, n) {
  const user = 'Brief: ' + text + (name ? '\nBusiness name (use exactly): ' + name : '') +
    (exclude.length ? '\nAlready used, do not repeat these names: ' + exclude.join(', ') : '') + '\nReturn ' + n + ' directions.';
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 6000, system: SYSTEM, messages: [{ role: 'user', content: user }] })
  });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const j = await r.json();
  const raw = (j.content || []).map(b => b.text || '').join('');
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  const parsed = JSON.parse(raw.slice(a, b + 1));
  if (!Array.isArray(parsed.directions)) throw new Error('bad shape');
  return parsed.directions.slice(0, n);
}

function send(res, code, body, type) {
  res.writeHead(code, { 'content-type': type || 'application/json', 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/brand' && req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'no key' });
    if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'slow down' });
    let body = '';
    req.on('data', c => { body += c; if (body.length > 8000) req.destroy(); });
    req.on('end', async () => {
      try {
        const q = JSON.parse(body || '{}');
        const text = String(q.text || '').slice(0, 400).trim();
        if (!text) return send(res, 400, { error: 'empty brief' });
        const exclude = (Array.isArray(q.exclude) ? q.exclude : []).slice(0, 40).map(x => String(x).slice(0, 30));
        send(res, 200, { directions: await directions(text, String(q.name || '').slice(0, 28), exclude, Math.min(+q.n || 8, 10)) });
      } catch (e) { console.error('brand error:', e.message); send(res, 502, { error: 'generation failed' }); }
    });
    return;
  }
  // static files from this folder
  let p = decodeURIComponent(url.pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(__dirname, p);
  if (!file.startsWith(__dirname + path.sep) || /server\.js$/.test(file)) return send(res, 404, 'not found', 'text/plain');
  fs.readFile(file, (err, data) => err ? send(res, 404, 'not found', 'text/plain') : send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream'));
}).listen(PORT, () => console.log('Matchmark on http://localhost:' + PORT + (process.env.ANTHROPIC_API_KEY ? ' (Claude on)' : ' (no ANTHROPIC_API_KEY: rule-based designs only)')));
