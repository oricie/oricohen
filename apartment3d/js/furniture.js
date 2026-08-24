// Procedural furniture. Each entry builds a THREE.Group whose origin sits on
// the floor at the centre of its footprint, facing -Z ("towards the viewer").
// Dimensions follow common retail sizes so a plan furnishes realistically.

import * as THREE from 'three';
import { flat, tiled, glass } from './textures.js';

// ------------------------------------------------------------- primitives

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

const cyl = (r, h, mat, x = 0, y = 0, z = 0, seg = 16) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

const plate = (w, h, d, mat, x, y, z) => {
  const m = box(w, h, d, mat, x, y, z);
  m.castShadow = false;
  return m;
};

function legs(g, w, d, h, mat, inset = 0.06, r = 0.028) {
  for (const x of [-w / 2 + inset, w / 2 - inset]) {
    for (const z of [-d / 2 + inset, d / 2 - inset]) g.add(cyl(r, h, mat, x, 0, z, 10));
  }
}

// A run of cabinets: carcass, plinth, fronts and handles.
function cabinets(g, { w, d, h, mat, front, handle, y = 0, plinth = 0.1, doors = 0 }) {
  const body = h - plinth;
  g.add(box(w, body, d, mat, 0, y + plinth));
  if (plinth > 0) g.add(box(w - 0.04, plinth, d - 0.06, flat(0x2f3134, { roughness: 0.5 }), 0, y));
  const count = doors || Math.max(1, Math.round(w / 0.6));
  const dw = w / count;
  for (let i = 0; i < count; i++) {
    const cx = -w / 2 + dw * (i + 0.5);
    g.add(plate(dw - 0.02, body - 0.03, 0.02, front, cx, y + plinth + 0.015, -d / 2 - 0.008));
    if (handle) g.add(plate(Math.min(0.34, dw * 0.6), 0.016, 0.016, handle, cx, y + body - 0.06, -d / 2 - 0.03));
  }
}

// An upholstered block with a slightly inset base, which reads as a cushion.
function cushion(g, w, h, d, mat, x, y, z) {
  const m = box(w, h, d, mat, x, y, z);
  g.add(m);
  return m;
}

// ---------------------------------------------------------------- palettes

export const FABRICS = [
  { key: 'sand', label: 'Sand', hex: 0xd6c9b2 },
  { key: 'sage', label: 'Sage', hex: 0x8fa08c },
  { key: 'slate', label: 'Slate', hex: 0x6b7480 },
  { key: 'clay', label: 'Clay', hex: 0xb08268 },
  { key: 'charcoal', label: 'Charcoal', hex: 0x4a4d52 },
  { key: 'cream', label: 'Cream', hex: 0xe8dfd0 },
  { key: 'navy', label: 'Navy', hex: 0x3d4a63 },
  { key: 'rust', label: 'Rust', hex: 0xa15a3c },
];

export const WOODS = [
  { key: 'oak', label: 'Oak', tex: 'oak' },
  { key: 'walnut', label: 'Walnut', tex: 'walnut' },
  { key: 'ash', label: 'Pale ash', tex: 'ash' },
  { key: 'white', label: 'White', hex: 0xf1efea },
  { key: 'black', label: 'Black', hex: 0x2b2d30 },
];

function fabricMaterial(key) {
  const entry = FABRICS.find((f) => f.key === key) || FABRICS[0];
  const mat = tiled('fabric', 1.0, 1.0).clone();
  mat.color.setHex(entry.hex);
  return mat;
}

function woodMaterial(key) {
  const entry = WOODS.find((w) => w.key === key) || WOODS[0];
  if (entry.hex !== undefined) return flat(entry.hex, { roughness: 0.45 });
  return tiled(entry.tex, 1.2, 1.2);
}

// The material bundle every builder draws from, so one item can be recoloured
// without touching its geometry.
function bundle(item = {}) {
  const wood = woodMaterial(item.wood || 'oak');
  return {
    wood,
    darkWood: tiled('walnut', 1.2, 1.2),
    cloth: fabricMaterial(item.fabric || 'sand'),
    cloth2: fabricMaterial(item.fabric === 'cream' ? 'clay' : 'cream'),
    panel: flat(0xe7e3dc, { roughness: 0.4 }),
    front: flat(item.wood === 'black' ? 0x33363a : 0xefece6, { roughness: 0.35 }),
    white: flat(0xf3f1ee, { roughness: 0.35 }),
    porcelain: flat(0xfbfbfa, { roughness: 0.12 }),
    metal: flat(0xb9bcc0, { roughness: 0.28, metalness: 0.85 }),
    steel: flat(0xc9ced2, { roughness: 0.3, metalness: 0.7 }),
    dark: flat(0x2f3134, { roughness: 0.5 }),
    screen: flat(0x12161c, { roughness: 0.12, metalness: 0.3 }),
    stone: tiled('marble', 1.6, 1.6),
    leaf: flat(0x4b7a45, { roughness: 0.75, opts: { side: THREE.DoubleSide } }),
    glass: glass(),
    lamp: flat(0xf6f0e4, { roughness: 0.9, opts: { side: THREE.DoubleSide, emissive: 0x2a2318 } }),
  };
}

// ----------------------------------------------------------------- catalog

const CATALOG = {};
function def(key, spec) { CATALOG[key] = spec; }

// -- seating ---------------------------------------------------------------

function buildSofa(M, { w, d = 0.9, seats }) {
  const g = new THREE.Group();
  g.add(box(w, 0.32, d, M.cloth, 0, 0.12));
  legs(g, w - 0.1, d - 0.1, 0.12, M.darkWood, 0.06, 0.03);
  g.add(box(w, 0.5, 0.16, M.cloth, 0, 0.44, -d / 2 + 0.08));
  for (const x of [-w / 2 + 0.075, w / 2 - 0.075]) g.add(box(0.15, 0.34, d, M.cloth, x, 0.44));
  const seatW = (w - 0.3) / seats;
  for (let i = 0; i < seats; i++) {
    cushion(g, seatW - 0.02, 0.15, d - 0.22, M.cloth, -w / 2 + 0.15 + seatW * (i + 0.5), 0.44, 0.04);
  }
  for (const x of [-w / 2 + 0.32, w / 2 - 0.32]) {
    const p = box(0.34, 0.1, 0.34, M.cloth2, x, 0.59, -d / 2 + 0.21);
    p.rotation.x = -0.35;
    g.add(p);
  }
  return g;
}

def('sofa_2', { label: 'Sofa, 2 seat', room: 'living', w: 1.6, d: 0.9, h: 0.82, fabric: true,
  build: (M) => buildSofa(M, { w: 1.6, seats: 2 }) });
def('sofa_3', { label: 'Sofa, 3 seat', room: 'living', w: 2.15, d: 0.9, h: 0.82, fabric: true,
  build: (M) => buildSofa(M, { w: 2.15, seats: 3 }) });
def('sofa_bed', { label: 'Sofa bed', room: 'living', w: 2.0, d: 0.95, h: 0.8, fabric: true,
  build: (M) => buildSofa(M, { w: 2.0, d: 0.95, seats: 2 }) });

def('sofa_corner', { label: 'Corner sofa', room: 'living', w: 2.55, d: 1.7, h: 0.82, fabric: true,
  build(M) {
    const g = new THREE.Group();
    const main = buildSofa(M, { w: 2.55, seats: 3 });
    main.position.z = -1.7 / 2 + 0.45;
    g.add(main);
    const arm = buildSofa(M, { w: 1.25, seats: 1 });
    arm.rotation.y = Math.PI / 2;
    arm.position.set(2.55 / 2 - 0.45, 0, 1.7 / 2 - 1.25 / 2 - 0.0);
    g.add(arm);
    return g;
  } });

def('armchair', { label: 'Armchair', room: 'living', w: 0.85, d: 0.85, h: 0.8, fabric: true,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.85, 0.28, 0.85, M.cloth, 0, 0.14));
    legs(g, 0.75, 0.75, 0.14, M.darkWood, 0.05, 0.026);
    g.add(box(0.85, 0.48, 0.14, M.cloth, 0, 0.42, -0.35));
    for (const x of [-0.36, 0.36]) g.add(box(0.13, 0.3, 0.85, M.cloth, x, 0.42));
    cushion(g, 0.6, 0.12, 0.62, M.cloth2, 0, 0.42, 0.03);
    return g;
  } });

def('ottoman', { label: 'Footstool', room: 'living', w: 0.7, d: 0.5, h: 0.42, fabric: true,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.7, 0.3, 0.5, M.cloth, 0, 0.12));
    legs(g, 0.6, 0.4, 0.12, M.darkWood, 0.05, 0.022);
    return g;
  } });

def('bench', { label: 'Bench', room: 'dining', w: 1.4, d: 0.35, h: 0.45,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.4, 0.05, 0.35, M.wood, 0, 0.4));
    legs(g, 1.32, 0.3, 0.4, M.darkWood, 0.05, 0.028);
    return g;
  } });

def('chair', { label: 'Chair', room: 'dining', w: 0.45, d: 0.48, h: 0.88, fabric: true,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.45, 0.04, 0.45, M.wood, 0, 0.44));
    legs(g, 0.42, 0.42, 0.44, M.wood, 0.04, 0.02);
    g.add(box(0.42, 0.42, 0.04, M.wood, 0, 0.48, -0.2));
    g.add(plate(0.4, 0.04, 0.4, M.cloth, 0, 0.48, 0));
    return g;
  } });

def('bar_stool', { label: 'Bar stool', room: 'kitchen', w: 0.4, d: 0.4, h: 0.75,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.18, 0.05, M.wood, 0, 0.7, 0, 18));
    legs(g, 0.34, 0.34, 0.7, M.metal, 0.04, 0.016);
    g.add(cyl(0.17, 0.015, M.metal, 0, 0.24, 0, 18));
    return g;
  } });

def('office_chair', { label: 'Office chair', room: 'office', w: 0.62, d: 0.62, h: 1.05, fabric: true,
  build(M) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leg = box(0.28, 0.03, 0.05, M.dark, Math.cos(a) * 0.14, 0.03, Math.sin(a) * 0.14);
      leg.rotation.y = -a;
      g.add(leg);
    }
    g.add(cyl(0.035, 0.35, M.metal, 0, 0.06));
    g.add(box(0.5, 0.09, 0.5, M.cloth, 0, 0.41));
    const back = box(0.46, 0.52, 0.08, M.cloth, 0, 0.5, -0.22);
    back.rotation.x = -0.12;
    g.add(back);
    for (const x of [-0.27, 0.27]) g.add(box(0.05, 0.03, 0.3, M.dark, x, 0.62, -0.02));
    return g;
  } });

// -- tables ----------------------------------------------------------------

def('coffee_table', { label: 'Coffee table', room: 'living', w: 1.1, d: 0.6, h: 0.4,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.1, 0.05, 0.6, M.wood, 0, 0.35));
    legs(g, 1.02, 0.52, 0.35, M.metal, 0.05, 0.018);
    g.add(plate(0.9, 0.03, 0.44, M.wood, 0, 0.12, 0));
    return g;
  } });

def('coffee_table_round', { label: 'Coffee table, round', room: 'living', w: 0.8, d: 0.8, h: 0.4,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.4, 0.05, M.wood, 0, 0.35, 0, 28));
    g.add(cyl(0.05, 0.35, M.metal, 0, 0, 0, 14));
    g.add(cyl(0.22, 0.02, M.metal, 0, 0, 0, 20));
    return g;
  } });

def('side_table', { label: 'Side table', room: 'living', w: 0.45, d: 0.45, h: 0.55,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.225, 0.04, M.wood, 0, 0.51, 0, 24));
    legs(g, 0.34, 0.34, 0.51, M.darkWood, 0.03, 0.016);
    return g;
  } });

function buildDiningTable(M, w, d) {
  const g = new THREE.Group();
  g.add(box(w, 0.05, d, M.wood, 0, 0.7));
  legs(g, w - 0.1, d - 0.1, 0.7, M.darkWood, 0.06, 0.032);
  return g;
}
def('dining_table_4', { label: 'Dining table, 4', room: 'dining', w: 1.2, d: 0.8, h: 0.75,
  build: (M) => buildDiningTable(M, 1.2, 0.8) });
def('dining_table_6', { label: 'Dining table, 6', room: 'dining', w: 1.8, d: 0.9, h: 0.75,
  build: (M) => buildDiningTable(M, 1.8, 0.9) });
def('dining_table_round', { label: 'Dining table, round', room: 'dining', w: 1.1, d: 1.1, h: 0.75,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.55, 0.05, M.wood, 0, 0.7, 0, 32));
    g.add(cyl(0.06, 0.7, M.darkWood, 0, 0, 0, 16));
    g.add(cyl(0.3, 0.03, M.darkWood, 0, 0, 0, 24));
    return g;
  } });

def('desk', { label: 'Desk', room: 'office', w: 1.4, d: 0.7, h: 0.75,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.4, 0.04, 0.7, M.wood, 0, 0.71));
    legs(g, 1.32, 0.62, 0.71, M.metal, 0.05, 0.02);
    g.add(box(0.55, 0.34, 0.02, M.dark, 0, 0.79, -0.16));
    g.add(box(0.16, 0.02, 0.12, M.dark, 0, 0.75, -0.1));
    g.add(plate(0.36, 0.015, 0.13, M.panel, 0, 0.75, 0.12));
    return g;
  } });

def('desk_corner', { label: 'Corner desk', room: 'office', w: 1.6, d: 1.4, h: 0.75,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.6, 0.04, 0.7, M.wood, 0, 0.71, -0.35));
    g.add(box(0.7, 0.04, 0.7, M.wood, -0.45, 0.71, 0.35));
    legs(g, 1.5, 0.6, 0.71, M.metal, 0.05, 0.02);
    g.add(cyl(0.02, 0.71, M.metal, -0.72, 0, 0.62, 10));
    g.add(box(0.55, 0.34, 0.02, M.dark, 0.2, 0.79, -0.52));
    return g;
  } });

def('desk_small', { label: 'Small desk', room: 'kids', w: 1.0, d: 0.55, h: 0.74,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.0, 0.04, 0.55, M.wood, 0, 0.7));
    legs(g, 0.92, 0.47, 0.7, M.white, 0.05, 0.02);
    return g;
  } });

def('vanity', { label: 'Dressing table', room: 'bedroom', w: 1.0, d: 0.45, h: 0.78,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.0, 0.04, 0.45, M.wood, 0, 0.74));
    legs(g, 0.92, 0.37, 0.74, M.darkWood, 0.05, 0.022);
    g.add(box(0.5, 0.16, 0.4, M.wood, -0.22, 0.5));
    const mirror = plate(0.5, 0.7, 0.03, M.screen, 0, 0.82, -0.2);
    g.add(mirror);
    return g;
  } });

// -- storage ---------------------------------------------------------------

def('bookshelf_tall', { label: 'Bookcase, tall', room: 'living', w: 0.8, d: 0.32, h: 2.02,
  build: (M) => buildShelves(M, 0.8, 0.32, 2.02, 5) });
def('bookshelf_wide', { label: 'Bookcase, low', room: 'living', w: 1.6, d: 0.35, h: 1.1,
  build: (M) => buildShelves(M, 1.6, 0.35, 1.1, 2) });
def('shelf_unit', { label: 'Cube shelving', room: 'living', w: 1.5, d: 0.39, h: 1.5,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.5, 1.5, 0.39, M.wood, 0, 0));
    for (let i = 1; i < 4; i++) {
      g.add(plate(1.46, 0.02, 0.35, M.wood, 0, (1.5 / 4) * i, 0.01));
      g.add(plate(0.02, 1.46, 0.35, M.wood, -0.75 + (1.5 / 4) * i, 0.02, 0.01));
    }
    return g;
  } });

function buildShelves(M, w, d, h, shelves) {
  const g = new THREE.Group();
  g.add(box(w, h, d, M.wood, 0, 0));
  const colours = [0x8c4a3a, 0x40566b, 0xbba15c, 0x5b6f52, 0x8a7f9c, 0xc0b6a4];
  for (let s = 0; s < shelves; s++) {
    const y = 0.28 + s * ((h - 0.35) / shelves);
    g.add(plate(w - 0.04, 0.02, d - 0.05, M.wood, 0, y - 0.02, 0.01));
    let x = -w / 2 + 0.05;
    while (x < w / 2 - 0.12) {
      const bw = 0.03 + Math.random() * 0.035;
      const bh = 0.19 + Math.random() * 0.1;
      g.add(box(bw, bh, d - 0.1, flat(colours[(Math.random() * colours.length) | 0], { roughness: 0.8 }),
        x + bw / 2, y, -0.02));
      x += bw + 0.004;
    }
  }
  return g;
}

def('tv_bench', { label: 'TV bench', room: 'living', w: 1.8, d: 0.42, h: 0.45,
  build(M) {
    const g = new THREE.Group();
    cabinets(g, { w: 1.8, d: 0.42, h: 0.45, mat: M.darkWood, front: M.front, handle: M.metal, plinth: 0.06, doors: 3 });
    return g;
  } });

def('tv', { label: 'TV (wall)', room: 'living', w: 1.25, d: 0.08, h: 0.75, mountY: 1.05,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.25, 0.72, 0.05, M.dark, 0, 0));
    g.add(plate(1.18, 0.66, 0.01, M.screen, 0, 0.03, -0.026));
    return g;
  } });

def('sideboard', { label: 'Sideboard', room: 'dining', w: 1.6, d: 0.45, h: 0.8,
  build(M) {
    const g = new THREE.Group();
    cabinets(g, { w: 1.6, d: 0.45, h: 0.8, mat: M.wood, front: M.front, handle: M.metal, plinth: 0.08, doors: 3 });
    return g;
  } });

def('display_cabinet', { label: 'Display cabinet', room: 'dining', w: 0.9, d: 0.4, h: 1.9,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.9, 1.9, 0.4, M.wood, 0, 0));
    for (let i = 1; i <= 3; i++) g.add(plate(0.84, 0.02, 0.36, M.wood, 0, 0.5 + i * 0.34, 0));
    const pane = plate(0.84, 1.3, 0.01, M.glass, 0, 0.55, -0.2);
    g.add(pane);
    return g;
  } });

def('dresser', { label: 'Chest of drawers', room: 'bedroom', w: 1.2, d: 0.5, h: 0.8,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.2, 0.72, 0.5, M.wood, 0, 0.08));
    legs(g, 1.1, 0.42, 0.08, M.metal, 0.05, 0.016);
    for (let i = 0; i < 3; i++) {
      const y = 0.1 + i * 0.23;
      g.add(plate(1.16, 0.21, 0.02, M.front, 0, y, -0.26));
      g.add(plate(0.4, 0.016, 0.016, M.metal, 0, y + 0.1, -0.28));
    }
    return g;
  } });

def('nightstand', { label: 'Nightstand', room: 'bedroom', w: 0.45, d: 0.4, h: 0.5,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.45, 0.42, 0.4, M.wood, 0, 0.08));
    legs(g, 0.37, 0.32, 0.08, M.metal, 0.03, 0.014);
    g.add(plate(0.36, 0.02, 0.02, M.metal, 0, 0.28, -0.21));
    return g;
  } });

function buildWardrobe(M, w, doors, sliding) {
  const g = new THREE.Group();
  const h = sliding ? 2.36 : 2.1;
  g.add(box(w, h, 0.6, M.wood, 0, 0));
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const cx = -w / 2 + dw * (i + 0.5);
    const z = sliding ? (-0.31 - (i % 2) * 0.03) : -0.31;
    g.add(plate(dw - 0.02, h - 0.1, 0.03, M.front, cx, 0.05, z));
    if (!sliding) g.add(cyl(0.012, 0.24, M.metal, cx + (i < doors / 2 ? dw / 2 - 0.06 : -dw / 2 + 0.06), h / 2 - 0.1, -0.34, 8));
  }
  return g;
}
def('wardrobe_2', { label: 'Wardrobe, 2 door', room: 'bedroom', w: 1.0, d: 0.6, h: 2.1,
  build: (M) => buildWardrobe(M, 1.0, 2, false) });
def('wardrobe_3', { label: 'Wardrobe, 3 door', room: 'bedroom', w: 1.5, d: 0.6, h: 2.1,
  build: (M) => buildWardrobe(M, 1.5, 3, false) });
def('wardrobe_sliding', { label: 'Sliding wardrobe', room: 'bedroom', w: 2.0, d: 0.65, h: 2.36,
  build: (M) => buildWardrobe(M, 2.0, 2, true) });

def('filing_cabinet', { label: 'Drawer unit', room: 'office', w: 0.42, d: 0.55, h: 0.72,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.42, 0.66, 0.55, M.panel, 0, 0.06));
    for (let i = 0; i < 3; i++) g.add(plate(0.38, 0.19, 0.02, M.front, 0, 0.09 + i * 0.21, -0.285));
    legs(g, 0.34, 0.45, 0.06, M.metal, 0.04, 0.012);
    return g;
  } });

def('toy_storage', { label: 'Toy storage', room: 'kids', w: 1.1, d: 0.35, h: 0.85,
  build(M) {
    const g = new THREE.Group();
    g.add(box(1.1, 0.85, 0.35, M.white, 0, 0));
    const bins = [0xd98b5f, 0x6d94b5, 0x8fae7a, 0xcbb26a, 0xb0798f, 0x7fa8a0];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        g.add(plate(0.32, 0.3, 0.28, flat(bins[r * 3 + c], { roughness: 0.7 }),
          -0.36 + c * 0.36, 0.08 + r * 0.4, -0.02));
      }
    }
    return g;
  } });

def('coat_rack', { label: 'Coat rack', room: 'hall', w: 0.5, d: 0.4, h: 1.8,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.025, 1.75, M.wood, 0, 0.03, 0, 12));
    g.add(cyl(0.2, 0.03, M.wood, 0, 0, 0, 20));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const arm = box(0.16, 0.02, 0.02, M.wood, Math.cos(a) * 0.08, 1.66, Math.sin(a) * 0.08);
      arm.rotation.y = -a;
      g.add(arm);
    }
    return g;
  } });

def('shoe_cabinet', { label: 'Shoe cabinet', room: 'hall', w: 0.9, d: 0.24, h: 1.0,
  build(M) {
    const g = new THREE.Group();
    cabinets(g, { w: 0.9, d: 0.24, h: 1.0, mat: M.wood, front: M.front, handle: M.metal, plinth: 0.06, doors: 2 });
    return g;
  } });

// -- beds ------------------------------------------------------------------

function buildBed(M, w, len, pillows) {
  const g = new THREE.Group();
  g.add(box(w, 0.26, len, M.darkWood, 0, 0.1));
  legs(g, w, len, 0.1, M.darkWood, 0.08, 0.035);
  g.add(box(w - 0.08, 0.22, len - 0.1, M.white, 0, 0.36));
  g.add(box(w, 0.78, 0.08, M.darkWood, 0, 0.1, -len / 2 + 0.02));
  g.add(box(w - 0.06, 0.1, len * 0.66, M.cloth, 0, 0.58, len * 0.14));
  const pw = Math.min(0.6, (w - 0.12) / pillows);
  for (let i = 0; i < pillows; i++) {
    g.add(box(pw - 0.04, 0.12, 0.34, M.white,
      -w / 2 + 0.06 + pw * (i + 0.5), 0.58, -len / 2 + 0.3));
  }
  return g;
}
def('bed_single', { label: 'Single bed', room: 'bedroom', w: 0.95, d: 2.0, h: 0.55, fabric: true,
  build: (M) => buildBed(M, 0.95, 2.0, 1) });
def('bed_double', { label: 'Double bed', room: 'bedroom', w: 1.6, d: 2.05, h: 0.55, fabric: true,
  build: (M) => buildBed(M, 1.6, 2.05, 2) });
def('bed_king', { label: 'King bed', room: 'bedroom', w: 1.9, d: 2.1, h: 0.55, fabric: true,
  build: (M) => buildBed(M, 1.9, 2.1, 2) });
def('bed_kids', { label: 'Kids bed', room: 'kids', w: 0.9, d: 1.7, h: 0.5, fabric: true,
  build: (M) => buildBed(M, 0.9, 1.7, 1) });

def('bunk_bed', { label: 'Bunk bed', room: 'kids', w: 0.95, d: 2.0, h: 1.7,
  build(M) {
    const g = new THREE.Group();
    for (const y of [0.35, 1.35]) {
      g.add(box(0.95, 0.14, 2.0, M.wood, 0, y));
      g.add(box(0.88, 0.16, 1.92, M.white, 0, y + 0.14));
    }
    for (const x of [-0.44, 0.44]) {
      for (const z of [-0.94, 0.94]) g.add(box(0.07, 1.7, 0.07, M.wood, x, 0, z));
    }
    g.add(box(0.05, 0.4, 1.6, M.wood, 0.45, 1.5));
    for (let i = 0; i < 4; i++) g.add(cyl(0.02, 0.9, M.wood, -0.5, 0.4 + i * 0.3, 0.3, 8));
    return g;
  } });

def('crib', { label: 'Cot', room: 'kids', w: 0.7, d: 1.3, h: 0.9,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.7, 0.1, 1.3, M.white, 0, 0.4));
    g.add(box(0.64, 0.1, 1.24, M.cloth, 0, 0.5));
    for (const x of [-0.34, 0.34]) g.add(box(0.04, 0.9, 1.3, M.white, x, 0));
    for (const z of [-0.63, 0.63]) g.add(box(0.7, 0.9, 0.04, M.white, 0, 0, z));
    return g;
  } });

// -- kitchen ---------------------------------------------------------------

def('kitchen_base', { label: 'Base unit 60', room: 'kitchen', w: 0.6, d: 0.62, h: 0.92,
  build: (M) => buildCounter(M, 0.6) });
def('kitchen_counter', { label: 'Counter run', room: 'kitchen', w: 2.4, d: 0.62, h: 0.92,
  build: (M) => buildCounter(M, 2.4) });
def('kitchen_corner', { label: 'Corner run', room: 'kitchen', w: 2.4, d: 2.4, h: 0.92,
  build(M) {
    const g = new THREE.Group();
    const a = buildCounter(M, 2.4);
    a.position.z = -2.4 / 2 + 0.31;
    g.add(a);
    const b = buildCounter(M, 1.78);
    b.rotation.y = Math.PI / 2;
    b.position.set(2.4 / 2 - 0.31, 0, 2.4 / 2 - 1.78 / 2 - 0.31 + 0.31);
    g.add(b);
    return g;
  } });

function buildCounter(M, w) {
  const g = new THREE.Group();
  cabinets(g, { w, d: 0.62, h: 0.88, mat: M.panel, front: M.front, handle: M.metal, plinth: 0.1 });
  g.add(box(w + 0.04, 0.04, 0.65, M.stone, 0, 0.88));
  return g;
}

def('kitchen_uppers', { label: 'Wall cabinets', room: 'kitchen', w: 2.0, d: 0.35, h: 0.72, mountY: 1.45,
  build(M) {
    const g = new THREE.Group();
    g.add(box(2.0, 0.72, 0.35, M.panel, 0, 0));
    for (let i = 0; i < 3; i++) {
      g.add(plate(2.0 / 3 - 0.02, 0.68, 0.02, M.front, -1.0 + (2.0 / 3) * (i + 0.5), 0.02, -0.185));
    }
    return g;
  } });

def('kitchen_island', { label: 'Island', room: 'kitchen', w: 1.8, d: 0.9, h: 0.92,
  build(M) {
    const g = new THREE.Group();
    cabinets(g, { w: 1.8, d: 0.9, h: 0.88, mat: flat(0x3f4a4d, { roughness: 0.45 }), front: M.front, handle: M.metal, plinth: 0.1 });
    g.add(box(1.9, 0.05, 1.0, M.stone, 0, 0.88));
    return g;
  } });

def('kitchen_peninsula', { label: 'Peninsula', room: 'kitchen', w: 1.6, d: 0.65, h: 1.05,
  build(M) {
    const g = new THREE.Group();
    cabinets(g, { w: 1.6, d: 0.62, h: 0.88, mat: M.panel, front: M.front, handle: M.metal, plinth: 0.1 });
    g.add(box(1.7, 0.05, 0.9, M.stone, 0, 0.88));
    return g;
  } });

def('pantry_tall', { label: 'Tall pantry', room: 'kitchen', w: 0.6, d: 0.6, h: 2.1,
  build(M) {
    const g = new THREE.Group();
    cabinets(g, { w: 0.6, d: 0.6, h: 2.1, mat: M.panel, front: M.front, handle: M.metal, plinth: 0.1, doors: 1 });
    return g;
  } });

def('fridge', { label: 'Fridge', room: 'kitchen', w: 0.6, d: 0.65, h: 1.85,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.6, 1.85, 0.65, M.steel, 0, 0));
    g.add(plate(0.58, 0.02, 0.02, M.dark, 0, 1.18, -0.33));
    for (const y of [0.75, 1.3]) g.add(plate(0.03, 0.34, 0.03, M.metal, 0.22, y, -0.34));
    return g;
  } });

def('fridge_large', { label: 'Fridge, wide', room: 'kitchen', w: 0.9, d: 0.75, h: 1.8,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.9, 1.8, 0.75, M.steel, 0, 0));
    g.add(plate(0.02, 1.7, 0.02, M.dark, 0, 0.05, -0.38));
    for (const x of [-0.06, 0.06]) g.add(plate(0.03, 1.1, 0.03, M.metal, x, 0.4, -0.39));
    return g;
  } });

def('stove', { label: 'Cooker', room: 'kitchen', w: 0.6, d: 0.62, h: 0.92,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.6, 0.9, 0.62, M.steel, 0, 0));
    g.add(plate(0.58, 0.02, 0.58, flat(0x1b1d1f, { roughness: 0.15 }), 0, 0.89, 0));
    for (const x of [-0.14, 0.14]) {
      for (const z of [-0.14, 0.14]) g.add(cyl(0.075, 0.006, flat(0x2a2c2e, { roughness: 0.3 }), x, 0.92, z, 20));
    }
    g.add(plate(0.5, 0.32, 0.02, flat(0x24262a, { roughness: 0.2 }), 0, 0.4, -0.32));
    return g;
  } });

def('extractor', { label: 'Extractor hood', room: 'kitchen', w: 0.6, d: 0.45, h: 0.6, mountY: 1.5,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.6, 0.14, 0.45, M.steel, 0, 0));
    g.add(box(0.28, 0.46, 0.24, M.steel, 0, 0.14, -0.1));
    return g;
  } });

def('dishwasher', { label: 'Dishwasher', room: 'kitchen', w: 0.6, d: 0.6, h: 0.85,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.6, 0.85, 0.6, M.steel, 0, 0));
    g.add(plate(0.56, 0.7, 0.02, M.front, 0, 0.08, -0.31));
    g.add(plate(0.44, 0.02, 0.02, M.metal, 0, 0.76, -0.33));
    return g;
  } });

def('microwave', { label: 'Microwave', room: 'kitchen', w: 0.5, d: 0.38, h: 0.3,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.5, 0.3, 0.38, M.steel, 0, 0));
    g.add(plate(0.34, 0.22, 0.01, M.screen, -0.06, 0.04, -0.192));
    return g;
  } });

def('sink_kitchen', { label: 'Kitchen sink', room: 'kitchen', w: 0.8, d: 0.62, h: 0.92,
  build(M) {
    const g = new THREE.Group();
    cabinets(g, { w: 0.8, d: 0.62, h: 0.88, mat: M.panel, front: M.front, handle: M.metal, plinth: 0.1, doors: 2 });
    g.add(box(0.84, 0.04, 0.65, M.stone, 0, 0.88));
    g.add(plate(0.5, 0.03, 0.38, M.metal, 0, 0.9, 0.02));
    g.add(cyl(0.018, 0.28, M.metal, 0, 0.92, -0.2, 10));
    const spout = cyl(0.016, 0.2, M.metal, 0, 0, 0, 10);
    spout.rotation.x = Math.PI / 2;
    spout.position.set(0, 1.19, -0.12);
    g.add(spout);
    return g;
  } });

// -- bathroom --------------------------------------------------------------

def('toilet', { label: 'Toilet', room: 'bathroom', w: 0.4, d: 0.68, h: 0.78,
  build: (M) => buildToilet(M, false) });
def('toilet_wall', { label: 'Wall-hung WC', room: 'bathroom', w: 0.4, d: 0.55, h: 0.45, mountY: 0.35,
  build: (M) => buildToilet(M, true) });

function buildToilet(M, wallHung) {
  const g = new THREE.Group();
  if (!wallHung) g.add(box(0.36, 0.36, 0.5, M.porcelain, 0, 0, 0.06));
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.16, 22), M.porcelain);
  bowl.position.set(0, wallHung ? 0.08 : 0.44, 0.08);
  bowl.scale.z = 1.25;
  bowl.castShadow = true;
  g.add(bowl);
  g.add(box(0.38, wallHung ? 0.2 : 0.42, 0.18, M.porcelain, 0, wallHung ? -0.02 : 0.36, -0.24));
  g.add(plate(0.34, 0.03, 0.42, M.white, 0, wallHung ? 0.16 : 0.52, 0.08));
  return g;
}

def('basin_pedestal', { label: 'Basin, pedestal', room: 'bathroom', w: 0.55, d: 0.42, h: 0.85,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.09, 0.7, M.porcelain, 0, 0, 0, 16));
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.19, 0.16, 24), M.porcelain);
    b.position.set(0, 0.78, 0);
    b.scale.z = 0.78;
    b.castShadow = true;
    g.add(b);
    g.add(cyl(0.016, 0.2, M.metal, 0, 0.8, -0.14, 10));
    return g;
  } });

def('vanity_single', { label: 'Washbasin unit', room: 'bathroom', w: 0.6, d: 0.45, h: 0.88,
  build: (M) => buildVanity(M, 0.6, 1) });
def('vanity_double', { label: 'Double washbasin', room: 'bathroom', w: 1.2, d: 0.48, h: 0.88,
  build: (M) => buildVanity(M, 1.2, 2) });

function buildVanity(M, w, basins) {
  const g = new THREE.Group();
  g.add(box(w, 0.6, 0.42, M.darkWood, 0, 0.22));
  g.add(box(w + 0.04, 0.06, 0.46, M.porcelain, 0, 0.82));
  for (let i = 0; i < basins; i++) {
    const x = basins === 1 ? 0 : -w / 4 + (w / 2) * i;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.13, 22), M.porcelain);
    b.position.set(x, 0.94, 0.02);
    b.castShadow = true;
    g.add(b);
    g.add(cyl(0.016, 0.22, M.metal, x, 0.88, -0.16, 10));
  }
  g.add(plate(w - 0.08, 0.7, 0.03, flat(0xdfe7ea, { roughness: 0.06, metalness: 0.4 }), 0, 1.15, -0.21));
  return g;
}

def('bathtub', { label: 'Bathtub', room: 'bathroom', w: 1.7, d: 0.75, h: 0.58,
  build: (M) => buildTub(M, 1.7, 0.75) });
def('bath_small', { label: 'Bathtub, short', room: 'bathroom', w: 1.4, d: 0.7, h: 0.58,
  build: (M) => buildTub(M, 1.4, 0.7) });

function buildTub(M, w, d) {
  const g = new THREE.Group();
  g.add(box(w, 0.55, d, M.porcelain, 0, 0));
  g.add(plate(w - 0.14, 0.06, d - 0.13, flat(0xeff5f6, { roughness: 0.08 }), 0, 0.46, 0));
  g.add(cyl(0.018, 0.2, M.metal, -w / 2 + 0.09, 0.56, 0, 10));
  return g;
}

def('shower', { label: 'Shower', room: 'bathroom', w: 0.9, d: 0.9, h: 2.0,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.9, 0.09, 0.9, M.porcelain, 0, 0));
    const front = plate(0.9, 1.9, 0.01, M.glass, 0, 0.09, 0.44);
    const side = plate(0.01, 1.9, 0.9, M.glass, 0.44, 0.09, 0);
    g.add(front, side);
    g.add(plate(0.9, 0.03, 0.03, M.metal, 0, 1.97, 0.44));
    g.add(cyl(0.06, 0.02, M.metal, -0.3, 1.85, -0.3, 12));
    return g;
  } });

def('shower_quadrant', { label: 'Shower, quadrant', room: 'bathroom', w: 0.9, d: 0.9, h: 2.0,
  build(M) {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.09, 24, 1, false, 0, Math.PI / 2), M.porcelain);
    tray.position.set(-0.45, 0.045, -0.45);
    tray.receiveShadow = true;
    g.add(tray);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 1.9, 24, 1, true, 0, Math.PI / 2), M.glass);
    wall.position.set(-0.45, 1.04, -0.45);
    g.add(wall);
    g.add(cyl(0.06, 0.02, M.metal, -0.28, 1.85, -0.28, 12));
    return g;
  } });

def('washer', { label: 'Washing machine', room: 'bathroom', w: 0.6, d: 0.6, h: 0.85,
  build: (M) => buildAppliance(M, false) });
def('dryer', { label: 'Tumble dryer', room: 'bathroom', w: 0.6, d: 0.6, h: 0.85,
  build: (M) => buildAppliance(M, true) });

function buildAppliance(M, dryer) {
  const g = new THREE.Group();
  g.add(box(0.6, 0.85, 0.6, M.white, 0, 0));
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 22),
    flat(dryer ? 0x8f989e : 0x9aa3a8, { roughness: 0.15, metalness: 0.5 }));
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 0.44, -0.3);
  g.add(door);
  g.add(plate(0.5, 0.06, 0.02, M.panel, 0, 0.74, -0.3));
  return g;
}

def('mirror_cabinet', { label: 'Mirror cabinet', room: 'bathroom', w: 0.8, d: 0.15, h: 0.7, mountY: 1.35,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.8, 0.7, 0.15, M.white, 0, 0));
    g.add(plate(0.76, 0.66, 0.02, flat(0xdfe7ea, { roughness: 0.05, metalness: 0.5 }), 0, 0.02, -0.08));
    return g;
  } });

def('towel_rail', { label: 'Towel rail', room: 'bathroom', w: 0.6, d: 0.12, h: 0.5, mountY: 1.1,
  build(M) {
    const g = new THREE.Group();
    for (const y of [0, 0.25, 0.5]) g.add(plate(0.6, 0.02, 0.02, M.metal, 0, y, 0));
    for (const x of [-0.29, 0.29]) g.add(plate(0.02, 0.52, 0.06, M.metal, x, 0, 0.03));
    const towel = plate(0.34, 0.45, 0.03, M.cloth, 0.06, 0.05, -0.02);
    g.add(towel);
    return g;
  } });

// -- soft furnishing, lighting, decoration ---------------------------------

function buildRug(M, w, d) {
  const g = new THREE.Group();
  const m = plate(w, 0.015, d, tiled('carpet', w, d), 0, 0.004, 0);
  g.add(m);
  return g;
}
def('rug_s', { label: 'Rug, small', room: 'living', w: 1.7, d: 1.2, h: 0.02, build: (M) => buildRug(M, 1.7, 1.2) });
def('rug_m', { label: 'Rug, medium', room: 'living', w: 2.4, d: 1.7, h: 0.02, build: (M) => buildRug(M, 2.4, 1.7) });
def('rug_l', { label: 'Rug, large', room: 'living', w: 3.0, d: 2.0, h: 0.02, build: (M) => buildRug(M, 3.0, 2.0) });

def('floor_lamp', { label: 'Floor lamp', room: 'any', w: 0.4, d: 0.4, h: 1.6,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.17, 0.03, M.metal, 0, 0, 0, 20));
    g.add(cyl(0.015, 1.4, M.metal, 0, 0.03, 0, 10));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.26, 20, 1, true), M.lamp);
    shade.position.y = 1.5;
    g.add(shade);
    return g;
  } });

def('arc_lamp', { label: 'Arc lamp', room: 'living', w: 1.2, d: 0.4, h: 2.0,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.2, 0.04, M.metal, 0.5, 0, 0, 20));
    g.add(cyl(0.02, 1.7, M.metal, 0.5, 0.04, 0, 10));
    const arm = cyl(0.02, 1.1, M.metal, 0, 0, 0, 10);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-0.05, 1.76, 0);
    g.add(arm);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.2, 20, 1, true), M.lamp);
    shade.position.set(-0.55, 1.62, 0);
    g.add(shade);
    return g;
  } });

def('table_lamp', { label: 'Table lamp', room: 'any', w: 0.3, d: 0.3, h: 0.5,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.07, 0.24, M.stone, 0, 0, 0, 16));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.2, 18, 1, true), M.lamp);
    shade.position.y = 0.36;
    g.add(shade);
    return g;
  } });

function buildPlant(M, scale) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * scale, 0.13 * scale, 0.32 * scale, 18),
    flat(0xb08968, { roughness: 0.7 }));
  pot.position.y = 0.16 * scale;
  pot.castShadow = true;
  g.add(pot);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const h = (0.5 + Math.random() * 0.55) * scale;
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.13 * scale, h), M.leaf);
    leaf.position.set(Math.cos(a) * 0.09 * scale, 0.32 * scale + h / 2, Math.sin(a) * 0.09 * scale);
    leaf.rotation.set(Math.random() * 0.5 + 0.15, a, Math.cos(a) * 0.35);
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}
def('plant', { label: 'Plant', room: 'any', w: 0.5, d: 0.5, h: 1.3, build: (M) => buildPlant(M, 1) });
def('plant_large', { label: 'Plant, large', room: 'any', w: 0.75, d: 0.75, h: 1.9, build: (M) => buildPlant(M, 1.5) });

def('wall_art', { label: 'Framed picture', room: 'any', w: 0.7, d: 0.05, h: 0.9, mountY: 1.25,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.7, 0.9, 0.04, M.darkWood, 0, 0));
    const art = [0xa8bcc9, 0xd8c9a8, 0xb59a86, 0x8fa08c][(Math.random() * 4) | 0];
    g.add(plate(0.62, 0.82, 0.01, flat(art, { roughness: 0.85 }), 0, 0.04, -0.025));
    return g;
  } });

def('mirror_full', { label: 'Full-length mirror', room: 'bedroom', w: 0.6, d: 0.06, h: 1.7,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.6, 1.7, 0.05, M.wood, 0, 0));
    g.add(plate(0.52, 1.62, 0.01, flat(0xdfe7ea, { roughness: 0.04, metalness: 0.6 }), 0, 0.04, -0.031));
    return g;
  } });

def('curtains', { label: 'Curtains', room: 'any', w: 1.8, d: 0.14, h: 2.3, mountY: 0.1,
  build(M) {
    const g = new THREE.Group();
    g.add(plate(1.9, 0.03, 0.03, M.metal, 0, 2.28, 0));
    for (const x of [-0.62, 0.62]) {
      const panel = plate(0.5, 2.2, 0.08, M.cloth, x, 0.06, 0);
      g.add(panel);
    }
    return g;
  } });

def('radiator', { label: 'Radiator', room: 'any', w: 1.0, d: 0.11, h: 0.6, mountY: 0.15,
  build(M) {
    const g = new THREE.Group();
    for (let i = 0; i < 10; i++) g.add(plate(0.08, 0.6, 0.1, M.white, -0.46 + i * 0.1, 0, 0));
    return g;
  } });

def('door_mat', { label: 'Door mat', room: 'hall', w: 0.75, d: 0.45, h: 0.02,
  build(M) {
    const g = new THREE.Group();
    g.add(plate(0.75, 0.02, 0.45, flat(0x6a5f52, { roughness: 0.95 }), 0, 0.004, 0));
    return g;
  } });

def('laundry_basket', { label: 'Laundry basket', room: 'bathroom', w: 0.4, d: 0.4, h: 0.55,
  build(M) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.55, 18), flat(0xc9b391, { roughness: 0.85 }));
    b.position.y = 0.275;
    b.castShadow = true;
    g.add(b);
    return g;
  } });

// -- outdoor ---------------------------------------------------------------

def('patio_table', { label: 'Patio table', room: 'balcony', w: 0.8, d: 0.8, h: 0.72,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.4, 0.04, M.metal, 0, 0.68, 0, 24));
    legs(g, 0.6, 0.6, 0.68, M.metal, 0.04, 0.018);
    return g;
  } });

def('patio_chair', { label: 'Patio chair', room: 'balcony', w: 0.5, d: 0.52, h: 0.85,
  build(M) {
    const g = new THREE.Group();
    g.add(plate(0.5, 0.04, 0.5, M.metal, 0, 0.42, 0));
    legs(g, 0.46, 0.46, 0.42, M.metal, 0.04, 0.016);
    const back = plate(0.46, 0.42, 0.04, M.metal, 0, 0.46, -0.22);
    back.rotation.x = -0.15;
    g.add(back);
    return g;
  } });

def('lounger', { label: 'Sun lounger', room: 'balcony', w: 0.7, d: 2.0, h: 0.7, fabric: true,
  build(M) {
    const g = new THREE.Group();
    g.add(box(0.7, 0.08, 2.0, M.cloth, 0, 0.32));
    legs(g, 0.6, 1.8, 0.32, M.metal, 0.05, 0.018);
    const head = box(0.68, 0.07, 0.6, M.cloth, 0, 0.36, -0.7);
    head.rotation.x = -0.5;
    g.add(head);
    return g;
  } });

def('parasol', { label: 'Parasol', room: 'balcony', w: 2.2, d: 2.2, h: 2.3,
  build(M) {
    const g = new THREE.Group();
    g.add(cyl(0.22, 0.06, M.dark, 0, 0, 0, 20));
    g.add(cyl(0.025, 2.2, M.wood, 0, 0.06, 0, 12));
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.35, 8), M.cloth);
    canopy.position.y = 2.15;
    canopy.castShadow = true;
    g.add(canopy);
    return g;
  } });

// -- circulation -----------------------------------------------------------

def('stairs', { label: 'Stairs', room: 'hall', w: 1.0, d: 3.2, h: 2.7,
  build(M) {
    const g = new THREE.Group();
    const steps = 15;
    const rise = 2.7 / steps;
    const going = 3.2 / steps;
    for (let i = 0; i < steps; i++) {
      g.add(box(1.0, 0.05, going, M.wood, 0, rise * (i + 1) - 0.05, 3.2 / 2 - going * (i + 0.5)));
      g.add(plate(1.0, rise - 0.05, 0.03, M.white, 0, rise * i, 3.2 / 2 - going * (i + 1) + 0.015));
    }
    for (const x of [-0.48, 0.48]) {
      const rail = box(0.04, 0.05, 3.5, M.darkWood, x, 1.0, 0);
      rail.rotation.x = -Math.atan2(2.7, 3.2);
      g.add(rail);
    }
    return g;
  } });

// ------------------------------------------------------------------- api

export function catalog() {
  return Object.entries(CATALOG).map(([key, v]) => ({
    key, label: v.label, room: v.room, w: v.w, d: v.d, h: v.h,
    fabric: !!v.fabric, mountY: v.mountY || 0,
  }));
}

export function spec(type) {
  return CATALOG[type] || null;
}

// The size a placed item actually occupies: its catalogue size, a fitted size
// (a traced staircase), or a scale the user set.
export function footprint(item) {
  const s = CATALOG[item && item.type];
  if (!s) return null;
  if (item.fit) return { w: item.fit.w, d: item.fit.d, h: item.fit.h || s.h };
  const k = item.scale || 1;
  return { w: s.w * k, d: s.d * k, h: s.h * k };
}

export function build(type, item = {}) {
  const entry = CATALOG[type];
  if (!entry) return null;
  const g = entry.build(bundle(item));
  g.userData.spec = { w: entry.w, d: entry.d, h: entry.h, mountY: entry.mountY || 0 };
  return g;
}

export const ROOM_ORDER = ['living', 'dining', 'kitchen', 'bedroom', 'kids', 'bathroom', 'office', 'hall', 'balcony', 'any'];
export const ROOM_LABELS = {
  living: 'Living room', dining: 'Dining', kitchen: 'Kitchen', bedroom: 'Bedroom',
  kids: 'Kids', bathroom: 'Bathroom', office: 'Office', hall: 'Hall', balcony: 'Outdoor', any: 'Anywhere',
};

// Which pieces a room gets when auto-furnishing, by room name keyword.
export const ROOM_KITS = {
  bedroom: ['bed_double', 'nightstand', 'nightstand', 'wardrobe_3', 'dresser', 'plant', 'rug_s'],
  kids: ['bed_kids', 'nightstand', 'wardrobe_2', 'toy_storage', 'desk_small'],
  living: ['sofa_3', 'coffee_table', 'tv_bench', 'tv', 'rug_m', 'armchair', 'bookshelf_tall', 'plant_large', 'floor_lamp'],
  dining: ['dining_table_6', 'chair', 'chair', 'chair', 'chair', 'sideboard'],
  kitchen: ['kitchen_counter', 'kitchen_uppers', 'fridge', 'stove', 'extractor', 'sink_kitchen', 'dishwasher'],
  bathroom: ['toilet', 'vanity_single', 'shower', 'mirror_cabinet', 'washer', 'towel_rail'],
  office: ['desk', 'office_chair', 'bookshelf_tall', 'filing_cabinet'],
  hall: ['shoe_cabinet', 'coat_rack', 'door_mat', 'mirror_full'],
  balcony: ['patio_table', 'patio_chair', 'patio_chair', 'plant'],
};

export function kitFor(name = '') {
  const n = name.toLowerCase();
  if (/kid|child|nursery/.test(n)) return ROOM_KITS.kids;
  if (/bed\s*room|bedroom|schlaf/.test(n)) return ROOM_KITS.bedroom;
  if (/living|lounge|salon|wohn/.test(n)) return ROOM_KITS.living;
  if (/dining|esszimmer/.test(n)) return ROOM_KITS.dining;
  if (/kitchen|küche|kuche/.test(n)) return ROOM_KITS.kitchen;
  if (/bath|wc|toilet|shower|bad/.test(n)) return ROOM_KITS.bathroom;
  if (/office|study|work|arbeit/.test(n)) return ROOM_KITS.office;
  if (/hall|corridor|entry|flur/.test(n)) return ROOM_KITS.hall;
  if (/balcon|terrace|patio/.test(n)) return ROOM_KITS.balcony;
  return null;
}
