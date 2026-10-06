#!/usr/bin/env node
/* Matchmark server: serves this folder and proxies brand "directions" from Claude.
   No dependencies. Needs Node 18+.

     ANTHROPIC_API_KEY=sk-ant-... node swipe/server.js        # http://localhost:8787

   Without ANTHROPIC_API_KEY the app uses its rule-based copy; without PEXELS_API_KEY it stays graphic-only. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

const PORT = +process.env.PORT || 8787;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const api = import('./api.mjs');

const hits = new Map();
function limited(ip) {
  const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 60000);
  a.push(now); hits.set(ip, a); return a.length > 12;
}

function send(res, code, body, type) {
  res.writeHead(code, { 'content-type': type || 'application/json', 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/brand' && req.method === 'POST') {
    if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'slow down' });
    let body = '';
    req.on('data', c => { body += c; if (body.length > 8000) req.destroy(); });
    req.on('end', async () => {
      try {
        const q = JSON.parse(body || '{}');
        const text = String(q.text || '').slice(0, 400).trim();
        if (!text) return send(res, 400, { error: 'empty brief' });
        const exclude = (Array.isArray(q.exclude) ? q.exclude : []).slice(0, 40).map(x => String(x).slice(0, 30));
        send(res, 200, await (await api).brand(process.env, { text, name: String(q.name || '').slice(0, 28), exclude, n: Math.min(+q.n || 8, 10) }));
      } catch (e) { if (!e.status) console.error('brand error:', e.message); send(res, e.status || 502, { error: e.message }); }
    });
    return;
  }
  if (url.pathname === '/api/caps') return send(res, 200, (await api).caps(process.env));
  if (url.pathname === '/api/image' && req.method === 'GET') {
    if (limited(req.socket.remoteAddress + 'i')) return send(res, 429, { error: 'slow down' });
    try { const b = await (await api).image(process.env, url.searchParams.get('p'), url.searchParams.get('s')); res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' }); res.end(Buffer.from(b)); }
    catch (e) { send(res, e.status || 502, { error: e.message }); }
    return;
  }
  if (url.pathname === '/api/photo' && req.method === 'GET') {
    try { send(res, 200, await (await api).photo(process.env, url.searchParams.get('q'), url.searchParams.get('i'), url.searchParams.get('o'))); }
    catch (e) { send(res, e.status || 502, { error: e.message }); }
    return;
  }
  // static files from this folder
  let p = decodeURIComponent(url.pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(__dirname, p);
  if (!file.startsWith(__dirname + path.sep) || /server\.js$/.test(file) || file.includes(path.sep + 'worker' + path.sep)) return send(res, 404, 'not found', 'text/plain');
  fs.readFile(file, (err, data) => err ? send(res, 404, 'not found', 'text/plain') : send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream'));
}).listen(PORT, () => console.log('Matchmark on http://localhost:' + PORT + (process.env.ANTHROPIC_API_KEY ? ' (Claude on)' : ' (no ANTHROPIC_API_KEY: rule-based copy)') + (process.env.CF_API_TOKEN ? ' (generated images on)' : '') + (process.env.PEXELS_API_KEY ? ' (Pexels on)' : '')));
