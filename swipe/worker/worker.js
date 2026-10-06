// Cloudflare Worker: the only server-side part of Matchmark. Holds the Claude and Pexels keys.
//   POST /api/brand   {text, name, exclude, n}   -> {directions:[...]}
//   GET  /api/photo   ?q=...&i=0&o=landscape     -> {url, credit, link, ...}
//   GET  /api/image   ?p=prompt&s=seed           -> image/jpeg (FLUX schnell, Workers AI)
//   GET  /api/caps                               -> {brand, image, photo}
import { brand, photo, image, caps } from '../api.mjs';

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://oricohendesign.com').split(',').map(s => s.trim());
    const ok = allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
    const cors = { 'access-control-allow-origin': ok ? origin : allowed[0], 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
    const send = (code, body, extra) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json', ...cors, ...extra } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    // <img> requests carry no Origin header, so /api/image is allowed without one; everything else needs an allowed origin.
    if (!ok && !(url.pathname === '/api/image' && !origin)) return send(403, { error: 'origin not allowed' });
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
      if (url.pathname === '/api/caps') return send(200, caps(env), { 'cache-control': 'no-store' });
      if (url.pathname === '/api/image' && req.method === 'GET') {
        const bytes = await image(env, url.searchParams.get('p'), url.searchParams.get('s'));
        return new Response(bytes, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*' } });
      }
      return send(404, { error: 'not found' });
    } catch (e) { return send(e.status || 502, { error: e.message }); }
  }
};
