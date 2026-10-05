// Cloudflare Worker: the only server-side part of Matchmark. Holds the Claude and Pexels keys.
//   POST /api/brand   {text, name, exclude, n}   -> {directions:[...]}
//   GET  /api/photo   ?q=...&i=0&o=landscape     -> {url, credit, link, ...}
import { brand, photo } from '../api.mjs';

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://oricohendesign.com').split(',').map(s => s.trim());
    const ok = allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
    const cors = { 'access-control-allow-origin': ok ? origin : allowed[0], 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
    const send = (code, body, extra) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json', ...cors, ...extra } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!ok) return send(403, { error: 'origin not allowed' });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/api/brand' && req.method === 'POST') {
        const q = await req.json();
        const text = String(q.text || '').slice(0, 400).trim();
        if (!text) return send(400, { error: 'empty brief' });
        const exclude = (Array.isArray(q.exclude) ? q.exclude : []).slice(0, 40).map(x => String(x).slice(0, 30));
        return send(200, await brand(env, { text, name: String(q.name || '').slice(0, 28), exclude, n: Math.min(+q.n || 8, 10) }), { 'cache-control': 'no-store' });
      }
      if (url.pathname === '/api/photo' && req.method === 'GET') {
        return send(200, await photo(env, url.searchParams.get('q'), url.searchParams.get('i'), url.searchParams.get('o')), { 'cache-control': 'public, max-age=86400' });
      }
      return send(404, { error: 'not found' });
    } catch (e) { return send(e.status || 502, { error: e.message }); }
  }
};
