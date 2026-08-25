// The plan as a vector drawing. Walls, openings, rooms and furniture come out
// as real SVG geometry, so the same model that drives the 3D can be opened in
// any vector editor.

import { wallLength, wallPointAt, polygonCentroid, polygonArea, polygonBounds, clamp } from './geom.js';
import * as furniture from './furniture.js';

const esc = (s) => String(s).replace(/[<>&"]/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

export function planToSVG(plan, { level = 0, scale = 100, pad = 40 } = {}) {
  const onLevel = (el) => (el.level || 0) === level;
  const walls = (plan.walls || []).filter(onLevel);
  const rooms = (plan.rooms || []).filter(onLevel);
  const items = (plan.items || []).filter(onLevel);

  const pts = walls.flatMap((w) => [[w.x1, w.y1], [w.x2, w.y2]]);
  for (const r of rooms) pts.push(...r.poly);
  if (!pts.length) return null;

  const b = polygonBounds(pts);
  const W = Math.round(b.w * scale) + pad * 2;
  const H = Math.round(b.h * scale) + pad * 2;
  const X = (x) => ((x - b.minX) * scale + pad).toFixed(1);
  const Y = (y) => ((y - b.minY) * scale + pad).toFixed(1);

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  out.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);

  out.push('<g id="rooms" fill="#eef1f5" stroke="#c3ccd6" stroke-width="1">');
  for (const room of rooms) {
    const d = room.poly.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x)},${Y(y)}`).join(' ');
    out.push(`<path d="${d} Z"/>`);
  }
  out.push('</g>');

  out.push('<g id="furniture" fill="none" stroke="#9aa3ac" stroke-width="1.2">');
  for (const item of items) {
    const spec = furniture.footprint(item);
    if (!spec) continue;
    const deg = ((item.rot || 0) * 180) / Math.PI;
    out.push(
      `<g transform="translate(${X(item.x)},${Y(item.y)}) rotate(${deg.toFixed(1)})">` +
      `<rect x="${(-spec.w * scale / 2).toFixed(1)}" y="${(-spec.d * scale / 2).toFixed(1)}" ` +
      `width="${(spec.w * scale).toFixed(1)}" height="${(spec.d * scale).toFixed(1)}" rx="2"/></g>`
    );
  }
  out.push('</g>');

  // walls drawn as stroked centre lines at their true thickness
  out.push('<g id="walls" stroke="#1f2124" fill="none" stroke-linecap="butt">');
  for (const wall of walls) {
    out.push(`<line x1="${X(wall.x1)}" y1="${Y(wall.y1)}" x2="${X(wall.x2)}" y2="${Y(wall.y2)}" ` +
             `stroke-width="${(wall.t * scale).toFixed(1)}"/>`);
  }
  out.push('</g>');

  // openings punched back out, windows marked in their own colour
  out.push('<g id="openings" stroke-linecap="butt">');
  for (const op of plan.openings || []) {
    const wall = walls.find((w) => w.id === op.wallId);
    if (!wall) continue;
    const L = wallLength(wall);
    const a = wallPointAt(wall, clamp(op.pos - op.width / 2, 0, L));
    const c = wallPointAt(wall, clamp(op.pos + op.width / 2, 0, L));
    out.push(`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(c.x)}" y2="${Y(c.y)}" ` +
             `stroke="#ffffff" stroke-width="${(wall.t * scale * 1.05).toFixed(1)}"/>`);
    out.push(`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(c.x)}" y2="${Y(c.y)}" ` +
             `stroke="${op.type === 'window' ? '#2f7fd1' : '#1d9a6c'}" stroke-width="3"/>`);
  }
  out.push('</g>');

  out.push('<g id="labels" font-family="Helvetica, Arial, sans-serif" text-anchor="middle" fill="#31404f">');
  for (const room of rooms) {
    const c = polygonCentroid(room.poly);
    const area = Math.abs(polygonArea(room.poly));
    out.push(`<text x="${X(c.x)}" y="${Y(c.y)}" font-size="13" font-weight="600">${esc(room.name || 'Room')}</text>`);
    out.push(`<text x="${X(c.x)}" y="${Y(c.y + 0.18)}" font-size="11" fill="#6c7a88">${area.toFixed(1)} m²</text>`);
  }
  out.push('</g>');

  // a scale bar, so the drawing carries its own units
  const barY = H - pad / 2;
  out.push(`<g id="scale-bar" stroke="#1f2124" stroke-width="1.5" fill="#1f2124">` +
           `<line x1="${pad}" y1="${barY}" x2="${pad + scale}" y2="${barY}"/>` +
           `<line x1="${pad}" y1="${barY - 5}" x2="${pad}" y2="${barY}"/>` +
           `<line x1="${pad + scale}" y1="${barY - 5}" x2="${pad + scale}" y2="${barY}"/>` +
           `<text x="${pad + scale + 8}" y="${barY + 4}" font-size="11" text-anchor="start" ` +
           `font-family="Helvetica, Arial, sans-serif" stroke="none">1 m</text></g>`);

  out.push('</svg>');
  return out.join('\n');
}
