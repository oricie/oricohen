// Sketch an area, say what you want there, and it happens.
//
// This reads the instruction locally — there is no model call. The published
// page cannot reach an API (its content policy blocks external hosts) and a
// browser-held API key would be readable by anyone who opens the page, so the
// vocabulary below is matched directly. It covers what the sketch tool is for:
// naming an area, changing its floor, adding or removing furniture, and
// clearing walls.

import { polygonArea, polygonCentroid, pointInPolygon, polygonBounds, uid } from './geom.js';
import * as furniture from './furniture.js';
import { FLOOR_MATERIALS, label as materialLabel } from './textures.js';

const NUMBERS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const ROOM_WORDS = [
  ['balcony', 'balcony', 'concrete'],
  ['terrace', 'Terrace', 'concrete'],
  ['garden', 'Garden', 'grass'],
  ['patio', 'Patio', 'concrete'],
  ['living', 'Living room', 'oak'],
  ['lounge', 'Living room', 'oak'],
  ['kitchen', 'Kitchen', 'tile'],
  ['dining', 'Dining room', 'oak'],
  ['bedroom', 'Bedroom', 'oak'],
  ['kids', 'Kids room', 'oak'],
  ['nursery', 'Kids room', 'carpet'],
  ['bathroom', 'Bathroom', 'tile'],
  ['bath', 'Bathroom', 'tile'],
  ['shower', 'Bathroom', 'tile'],
  ['toilet', 'Bathroom', 'tile'],
  ['office', 'Office', 'oak'],
  ['study', 'Office', 'oak'],
  ['hall', 'Hallway', 'tile'],
  ['corridor', 'Hallway', 'tile'],
  ['entrance', 'Hallway', 'tile'],
  ['closet', 'Closet', 'tile'],
  ['storage', 'Storage', 'concrete'],
  ['utility', 'Utility', 'tile'],
];

const FLOOR_WORDS = [
  ['oak', 'oak'], ['walnut', 'walnut'], ['ash', 'ash'], ['wood', 'oak'],
  ['parquet', 'oak'], ['tile', 'tile'], ['tiles', 'tile'], ['ceramic', 'tile'],
  ['marble', 'marble'], ['slate', 'slate'], ['stone', 'slate'],
  ['carpet', 'carpet'], ['concrete', 'concrete'], ['grass', 'grass'], ['lawn', 'grass'],
];

// Score a catalogue entry against the words the user typed.
function matchItem(text) {
  const words = text.split(/[^a-z]+/).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const entry of furniture.catalog()) {
    const label = entry.label.toLowerCase();
    const parts = label.split(/[^a-z]+/).filter(Boolean);
    let score = 0;
    if (text.includes(label)) score += 10;
    for (const part of parts) {
      if (part.length < 3) continue;
      for (const word of words) {
        if (word === part) score += 4;
        else if (word.length > 3 && (part.startsWith(word) || word.startsWith(part))) score += 2;
      }
    }
    // "cabinet" should reach the kitchen units, "couch" the sofa
    const synonyms = {
      couch: 'sofa', settee: 'sofa', cabinet: 'wall cabinets', cupboard: 'wardrobe',
      fridge: 'fridge', cooker: 'cooker', stove: 'cooker', oven: 'cooker',
      table: 'table', chair: 'chair', bed: 'bed', lamp: 'lamp', plant: 'plant',
      rug: 'rug', carpet: 'rug', shelf: 'bookcase', shelves: 'bookcase',
      desk: 'desk', wc: 'toilet', basin: 'washbasin', sink: 'sink',
    };
    for (const word of words) {
      const syn = synonyms[word];
      if (syn && label.includes(syn)) score += 5;
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return bestScore >= 4 ? best : null;
}

function countIn(text) {
  const digits = text.match(/\b(\d{1,2})\b/);
  if (digits) return Math.min(12, Math.max(1, parseInt(digits[1], 10)));
  for (const [word, value] of Object.entries(NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  return 1;
}

// Spread n points inside a polygon, on a grid, skipping anything outside it.
function spotsInside(poly, n) {
  const b = polygonBounds(poly);
  const spots = [];
  const cols = Math.ceil(Math.sqrt(n * Math.max(1, b.w / Math.max(0.1, b.h))));
  const rows = Math.ceil(n / cols);
  for (let r = 0; r < rows && spots.length < n; r++) {
    for (let c = 0; c < cols && spots.length < n; c++) {
      const p = {
        x: b.minX + (b.w * (c + 0.5)) / cols,
        y: b.minY + (b.h * (r + 0.5)) / rows,
      };
      if (pointInPolygon(p, poly)) spots.push(p);
    }
  }
  if (!spots.length) spots.push(polygonCentroid(poly));
  return spots;
}

/**
 * Work out what an instruction means for the sketched area and carry it out.
 * Returns { done: string[], missed: string|null } — what changed, in words.
 */
export function apply(plan, poly, instruction, level = 0) {
  const text = (instruction || '').toLowerCase().trim();
  const done = [];
  if (!text) return { done, missed: 'Nothing was typed.' };

  // the sketch arrives as {x, y} points; everything in geom.js works on pairs
  const ring = (poly || []).map((p) => (Array.isArray(p) ? p : [p.x, p.y]));
  if (ring.length < 3) return { done, missed: 'That loop was too small to read.' };
  const inArea = (x, y) => pointInPolygon({ x, y }, ring);
  const removing = /\b(remove|delete|clear|get rid of|take out|demolish)\b/.test(text);

  // --- removal --------------------------------------------------------------
  if (removing) {
    if (/\bwall/.test(text)) {
      const doomed = new Set(
        plan.walls.filter((w) => inArea((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2)).map((w) => w.id)
      );
      if (doomed.size) {
        plan.walls = plan.walls.filter((w) => !doomed.has(w.id));
        plan.openings = plan.openings.filter((o) => !doomed.has(o.wallId));
        done.push(`removed ${doomed.size} wall${doomed.size > 1 ? 's' : ''}`);
      }
    }
    if (/\b(furniture|everything|all)\b/.test(text) || !/\bwall/.test(text)) {
      const before = plan.items.length;
      const named = matchItem(text);
      plan.items = plan.items.filter((i) => {
        if (!inArea(i.x, i.y)) return true;
        return named ? i.type !== named.key : false;
      });
      const gone = before - plan.items.length;
      if (gone) done.push(`removed ${gone} piece${gone > 1 ? 's' : ''} of furniture`);
    }
    return done.length ? { done, missed: null } : { done, missed: 'Nothing in that area matched.' };
  }

  // --- what kind of space is this ------------------------------------------
  const roomWord = ROOM_WORDS.find(([word]) => new RegExp(`\\b${word}`).test(text));
  const floorWord = FLOOR_WORDS.find(([word]) => new RegExp(`\\b${word}\\b`).test(text));

  if (roomWord || floorWord) {
    const centre = polygonCentroid(ring);
    let room = plan.rooms.find((r) => pointInPolygon(centre, r.poly) && (r.level || 0) === level);
    if (!room && polygonArea(ring) > 1) {
      room = {
        id: uid('r'),
        name: roomWord ? roomWord[1] : 'Area',
        poly: ring.map((p) => p.slice()),
        floor: 'oak',
        level,
      };
      plan.rooms.push(room);
      done.push(`added the area as a room`);
    }
    if (room) {
      if (roomWord) {
        room.name = roomWord[1];
        room.floor = roomWord[2];
        done.push(`named it ${roomWord[1]}`);
      }
      if (floorWord && FLOOR_MATERIALS.includes(floorWord[1])) {
        room.floor = floorWord[1];
        done.push(`laid ${materialLabel(floorWord[1]).toLowerCase()}`);
      }
    }
  }

  // --- furnish it -----------------------------------------------------------
  const furnishing = /\b(put|add|place|insert|furnish|need|want)\b/.test(text) || !!matchItem(text);
  if (furnishing) {
    const named = matchItem(text);
    if (named) {
      const count = countIn(text);
      for (const spot of spotsInside(ring, count)) {
        plan.items.push({ id: uid('f'), type: named.key, x: spot.x, y: spot.y, rot: 0, level });
      }
      done.push(`placed ${count} × ${named.label.toLowerCase()}`);
    } else if (roomWord) {
      const kit = furniture.kitFor(roomWord[1]);
      if (kit) {
        const spots = spotsInside(ring, kit.length);
        kit.forEach((type, i) => {
          const spot = spots[i % spots.length];
          plan.items.push({ id: uid('f'), type, x: spot.x, y: spot.y, rot: 0, level });
        });
        done.push(`furnished it as a ${roomWord[1].toLowerCase()}`);
      }
    } else if (!done.length) {
      return { done, missed: `I could not find anything called that in the catalogue.` };
    }
  }

  if (!done.length) {
    return {
      done,
      missed: 'Try naming the space (“this is a balcony”), its floor ' +
              '(“marble here”), what to add (“two wall cabinets”), or what to ' +
              'take away (“remove these walls”).',
    };
  }
  return { done, missed: null };
}

export const EXAMPLES = [
  'this is a balcony',
  'put two wall cabinets here',
  'remove these walls',
  'furnish this as a bedroom',
  'marble floor',
  'add three chairs',
];
