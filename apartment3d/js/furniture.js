// Procedural furniture. Each entry builds a THREE.Group whose origin sits on
// the floor at the centre of its footprint, facing -Z ("towards the viewer").

import * as THREE from 'three';
import { flat, tiled, glass } from './textures.js';

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

const WOOD = () => tiled('oak', 1.2, 1.2);
const DARK_WOOD = () => tiled('walnut', 1.2, 1.2);
const CLOTH = () => tiled('fabric', 1.0, 1.0);
const CLOTH_WARM = () => tiled('fabricWarm', 1.0, 1.0);
const WHITE = () => flat(0xf3f1ee, { roughness: 0.35 });
const PORCELAIN = () => flat(0xfbfbfa, { roughness: 0.12 });
const METAL = () => flat(0xb9bcc0, { roughness: 0.28, metalness: 0.85 });
const DARK = () => flat(0x2f3134, { roughness: 0.5 });

function legs(g, w, d, h, mat, inset = 0.06, r = 0.028) {
  const xs = [-w / 2 + inset, w / 2 - inset];
  const zs = [-d / 2 + inset, d / 2 - inset];
  for (const x of xs) for (const z of zs) g.add(cyl(r, h, mat, x, 0, z, 10));
}

const CATALOG = {
  bed_double: {
    label: 'Double bed', room: 'bedroom', w: 1.6, d: 2.05, h: 0.55,
    build() {
      const g = new THREE.Group();
      const frame = DARK_WOOD();
      g.add(box(1.6, 0.26, 2.05, frame, 0, 0.1, 0));
      legs(g, 1.6, 2.05, 0.1, frame, 0.08, 0.035);
      g.add(box(1.52, 0.22, 1.95, WHITE(), 0, 0.36, 0));            // mattress
      g.add(box(1.6, 0.75, 0.08, frame, 0, 0.1, -1.02));            // headboard
      const duvet = CLOTH_WARM();
      g.add(box(1.54, 0.1, 1.35, duvet, 0, 0.58, 0.28));
      for (const x of [-0.38, 0.38]) g.add(box(0.55, 0.12, 0.34, WHITE(), x, 0.58, -0.72));
      return g;
    },
  },
  bed_single: {
    label: 'Single bed', room: 'bedroom', w: 0.95, d: 2.0, h: 0.55,
    build() {
      const g = new THREE.Group();
      const frame = DARK_WOOD();
      g.add(box(0.95, 0.26, 2.0, frame, 0, 0.1, 0));
      legs(g, 0.95, 2.0, 0.1, frame, 0.08, 0.032);
      g.add(box(0.88, 0.2, 1.9, WHITE(), 0, 0.36, 0));
      g.add(box(0.95, 0.6, 0.07, frame, 0, 0.1, -1.0));
      g.add(box(0.9, 0.09, 1.3, CLOTH(), 0, 0.56, 0.28));
      g.add(box(0.5, 0.11, 0.32, WHITE(), 0, 0.56, -0.7));
      return g;
    },
  },
  nightstand: {
    label: 'Nightstand', room: 'bedroom', w: 0.45, d: 0.4, h: 0.5,
    build() {
      const g = new THREE.Group();
      const wood = DARK_WOOD();
      g.add(box(0.45, 0.42, 0.4, wood, 0, 0.08, 0));
      legs(g, 0.45, 0.4, 0.08, METAL(), 0.05, 0.015);
      g.add(box(0.36, 0.02, 0.02, METAL(), 0, 0.28, -0.2));
      return g;
    },
  },
  wardrobe: {
    label: 'Wardrobe', room: 'bedroom', w: 1.6, d: 0.6, h: 2.1,
    build() {
      const g = new THREE.Group();
      const wood = WOOD();
      g.add(box(1.6, 2.1, 0.6, wood, 0, 0, 0));
      for (const x of [-0.4, 0.4]) {
        g.add(box(0.76, 2.0, 0.03, flat(0xe9e5df, { roughness: 0.4 }), x, 0.05, -0.31));
        g.add(cyl(0.012, 0.24, METAL(), x + (x < 0 ? 0.32 : -0.32), 1.0, -0.33, 8));
      }
      return g;
    },
  },
  sofa: {
    label: 'Sofa', room: 'living', w: 2.15, d: 0.9, h: 0.82,
    build() {
      const g = new THREE.Group();
      const cloth = CLOTH();
      g.add(box(2.15, 0.32, 0.9, cloth, 0, 0.12, 0));
      legs(g, 2.05, 0.8, 0.12, DARK_WOOD(), 0.06, 0.03);
      g.add(box(2.15, 0.5, 0.16, cloth, 0, 0.44, -0.37));            // back
      for (const x of [-1.0, 1.0]) g.add(box(0.15, 0.34, 0.9, cloth, x, 0.44, 0));
      for (const x of [-0.46, 0.46]) g.add(box(0.86, 0.15, 0.68, CLOTH_WARM(), x, 0.44, 0.04));
      for (const x of [-0.78, 0.78]) {
        const p = box(0.34, 0.1, 0.34, CLOTH_WARM(), x, 0.59, -0.24);
        p.rotation.x = -0.35;
        g.add(p);
      }
      return g;
    },
  },
  armchair: {
    label: 'Armchair', room: 'living', w: 0.85, d: 0.85, h: 0.8,
    build() {
      const g = new THREE.Group();
      const cloth = CLOTH_WARM();
      g.add(box(0.85, 0.28, 0.85, cloth, 0, 0.14, 0));
      legs(g, 0.75, 0.75, 0.14, DARK_WOOD(), 0.05, 0.026);
      g.add(box(0.85, 0.48, 0.14, cloth, 0, 0.42, -0.35));
      for (const x of [-0.36, 0.36]) g.add(box(0.13, 0.3, 0.85, cloth, x, 0.42, 0));
      g.add(box(0.6, 0.12, 0.62, CLOTH(), 0, 0.42, 0.03));
      return g;
    },
  },
  coffee_table: {
    label: 'Coffee table', room: 'living', w: 1.1, d: 0.6, h: 0.4,
    build() {
      const g = new THREE.Group();
      g.add(box(1.1, 0.05, 0.6, WOOD(), 0, 0.35, 0));
      legs(g, 1.02, 0.52, 0.35, METAL(), 0.05, 0.018);
      g.add(box(0.9, 0.03, 0.44, WOOD(), 0, 0.12, 0));
      return g;
    },
  },
  tv_unit: {
    label: 'TV unit', room: 'living', w: 1.8, d: 0.42, h: 1.1,
    build() {
      const g = new THREE.Group();
      g.add(box(1.8, 0.42, 0.42, DARK_WOOD(), 0, 0.06, 0));
      legs(g, 1.7, 0.36, 0.06, METAL(), 0.05, 0.016);
      const tv = box(1.25, 0.72, 0.05, DARK(), 0, 0.55, -0.05);
      g.add(tv);
      g.add(box(1.18, 0.66, 0.01, flat(0x12161c, { roughness: 0.12, metalness: 0.3 }), 0, 0.58, -0.02));
      g.add(box(0.3, 0.03, 0.16, DARK(), 0, 0.48, -0.05));
      return g;
    },
  },
  bookshelf: {
    label: 'Bookshelf', room: 'living', w: 1.0, d: 0.32, h: 1.9,
    build() {
      const g = new THREE.Group();
      const wood = WOOD();
      g.add(box(1.0, 1.9, 0.32, wood, 0, 0, 0));
      const colours = [0x8c4a3a, 0x40566b, 0xbba15c, 0x5b6f52, 0x8a7f9c];
      for (let s = 0; s < 4; s++) {
        const y = 0.28 + s * 0.42;
        let x = -0.42;
        while (x < 0.36) {
          const w = 0.03 + Math.random() * 0.035;
          const h = 0.2 + Math.random() * 0.12;
          g.add(box(w, h, 0.22, flat(colours[(Math.random() * colours.length) | 0], { roughness: 0.8 }), x + w / 2, y, -0.02));
          x += w + 0.004;
        }
      }
      return g;
    },
  },
  rug: {
    label: 'Rug', room: 'living', w: 2.4, d: 1.7, h: 0.02,
    build() {
      const g = new THREE.Group();
      const m = box(2.4, 0.015, 1.7, tiled('carpet', 2.4, 1.7), 0, 0.004, 0);
      m.castShadow = false;
      g.add(m);
      return g;
    },
  },
  dining_table: {
    label: 'Dining table', room: 'dining', w: 1.6, d: 0.9, h: 0.75,
    build() {
      const g = new THREE.Group();
      g.add(box(1.6, 0.05, 0.9, WOOD(), 0, 0.7, 0));
      legs(g, 1.5, 0.8, 0.7, DARK_WOOD(), 0.06, 0.032);
      return g;
    },
  },
  chair: {
    label: 'Chair', room: 'dining', w: 0.45, d: 0.48, h: 0.9,
    build() {
      const g = new THREE.Group();
      const wood = DARK_WOOD();
      g.add(box(0.45, 0.04, 0.45, wood, 0, 0.44, 0));
      legs(g, 0.42, 0.42, 0.44, wood, 0.04, 0.02);
      g.add(box(0.42, 0.42, 0.04, wood, 0, 0.48, -0.2));
      g.add(box(0.4, 0.04, 0.4, CLOTH(), 0, 0.48, 0));
      return g;
    },
  },
  desk: {
    label: 'Desk', room: 'office', w: 1.4, d: 0.7, h: 0.75,
    build() {
      const g = new THREE.Group();
      g.add(box(1.4, 0.04, 0.7, WOOD(), 0, 0.71, 0));
      legs(g, 1.32, 0.62, 0.71, METAL(), 0.05, 0.02);
      g.add(box(0.55, 0.34, 0.02, DARK(), 0, 0.79, -0.16));
      g.add(box(0.16, 0.02, 0.12, DARK(), 0, 0.75, -0.1));
      g.add(box(0.36, 0.015, 0.13, flat(0xdedede, { roughness: 0.5 }), 0, 0.75, 0.12));
      return g;
    },
  },
  kitchen_counter: {
    label: 'Counter run', room: 'kitchen', w: 2.4, d: 0.62, h: 0.92,
    build() {
      const g = new THREE.Group();
      const cab = flat(0xe6e2da, { roughness: 0.4 });
      g.add(box(2.4, 0.82, 0.62, cab, 0, 0.1, 0));
      g.add(box(2.44, 0.04, 0.65, tiled('marble', 2.4, 0.65), 0, 0.92, 0));
      g.add(box(2.4, 0.1, 0.6, DARK(), 0, 0, 0));                   // plinth
      for (let i = 0; i < 3; i++) {
        const x = -0.8 + i * 0.8;
        g.add(box(0.76, 0.78, 0.02, flat(0xefece6, { roughness: 0.35 }), x, 0.12, -0.32));
        g.add(box(0.4, 0.018, 0.018, METAL(), x, 0.78, -0.34));
      }
      return g;
    },
  },
  kitchen_uppers: {
    label: 'Wall cabinets', room: 'kitchen', w: 2.0, d: 0.35, h: 0.75, mountY: 1.45,
    build() {
      const g = new THREE.Group();
      const cab = flat(0xe6e2da, { roughness: 0.4 });
      g.add(box(2.0, 0.75, 0.35, cab, 0, 0, 0));
      for (let i = 0; i < 2; i++) {
        const x = -0.5 + i * 1.0;
        g.add(box(0.96, 0.71, 0.02, flat(0xefece6, { roughness: 0.35 }), x, 0.02, -0.18));
      }
      return g;
    },
  },
  kitchen_island: {
    label: 'Island', room: 'kitchen', w: 1.8, d: 0.9, h: 0.92,
    build() {
      const g = new THREE.Group();
      g.add(box(1.8, 0.82, 0.9, flat(0x3f4a4d, { roughness: 0.45 }), 0, 0.1, 0));
      g.add(box(1.9, 0.05, 1.0, tiled('marble', 1.9, 1.0), 0, 0.92, 0));
      g.add(box(1.8, 0.1, 0.86, DARK(), 0, 0, 0));
      return g;
    },
  },
  fridge: {
    label: 'Fridge', room: 'kitchen', w: 0.7, d: 0.68, h: 1.85,
    build() {
      const g = new THREE.Group();
      const steel = flat(0xc9ced2, { roughness: 0.3, metalness: 0.7 });
      g.add(box(0.7, 1.85, 0.68, steel, 0, 0, 0));
      g.add(box(0.68, 0.02, 0.02, DARK(), 0, 1.18, -0.35));
      for (const y of [0.75, 1.3]) g.add(box(0.03, 0.34, 0.03, METAL(), 0.26, y, -0.36));
      return g;
    },
  },
  stove: {
    label: 'Cooker', room: 'kitchen', w: 0.6, d: 0.62, h: 0.92,
    build() {
      const g = new THREE.Group();
      g.add(box(0.6, 0.9, 0.62, flat(0xd7dadd, { roughness: 0.35, metalness: 0.5 }), 0, 0, 0));
      g.add(box(0.58, 0.02, 0.58, flat(0x1b1d1f, { roughness: 0.15 }), 0, 0.9, 0));
      for (const x of [-0.14, 0.14]) for (const z of [-0.14, 0.14]) {
        g.add(cyl(0.075, 0.006, flat(0x2a2c2e, { roughness: 0.3 }), x, 0.92, z));
      }
      g.add(box(0.5, 0.32, 0.02, flat(0x24262a, { roughness: 0.2 }), 0, 0.4, -0.32));
      return g;
    },
  },
  sink_kitchen: {
    label: 'Kitchen sink', room: 'kitchen', w: 0.8, d: 0.62, h: 0.92,
    build() {
      const g = new THREE.Group();
      g.add(box(0.8, 0.82, 0.62, flat(0xe6e2da, { roughness: 0.4 }), 0, 0.1, 0));
      g.add(box(0.84, 0.05, 0.65, tiled('marble', 0.84, 0.65), 0, 0.92, 0));
      g.add(box(0.5, 0.03, 0.38, flat(0xb6bbc0, { roughness: 0.2, metalness: 0.8 }), 0, 0.9, 0.02));
      const tap = cyl(0.018, 0.28, METAL(), 0, 0.97, -0.2, 10);
      g.add(tap);
      const spout = cyl(0.016, 0.2, METAL(), 0, 1.24, -0.12, 10);
      spout.rotation.x = Math.PI / 2;
      spout.position.set(0, 1.24, -0.13);
      g.add(spout);
      return g;
    },
  },
  toilet: {
    label: 'Toilet', room: 'bathroom', w: 0.4, d: 0.68, h: 0.78,
    build() {
      const g = new THREE.Group();
      const p = PORCELAIN();
      g.add(box(0.36, 0.36, 0.5, p, 0, 0, 0.06));
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.14, 20), p);
      bowl.position.set(0, 0.42, 0.08);
      bowl.scale.z = 1.25;
      bowl.castShadow = true;
      g.add(bowl);
      g.add(box(0.38, 0.42, 0.18, p, 0, 0.36, -0.25));
      g.add(box(0.34, 0.03, 0.42, flat(0xf0f0ee, { roughness: 0.3 }), 0, 0.49, 0.08));
      return g;
    },
  },
  sink_bath: {
    label: 'Washbasin', room: 'bathroom', w: 0.6, d: 0.45, h: 0.88,
    build() {
      const g = new THREE.Group();
      g.add(box(0.6, 0.6, 0.42, DARK_WOOD(), 0, 0.22, 0));
      g.add(box(0.64, 0.06, 0.46, PORCELAIN(), 0, 0.82, 0));
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.13, 22), PORCELAIN());
      basin.position.set(0, 0.94, 0.02);
      basin.castShadow = true;
      g.add(basin);
      g.add(cyl(0.016, 0.22, METAL(), 0, 0.88, -0.16, 10));
      g.add(box(0.5, 0.7, 0.03, flat(0xdfe7ea, { roughness: 0.06, metalness: 0.4 }), 0, 1.15, -0.21));
      return g;
    },
  },
  bathtub: {
    label: 'Bathtub', room: 'bathroom', w: 1.7, d: 0.75, h: 0.58,
    build() {
      const g = new THREE.Group();
      const p = PORCELAIN();
      g.add(box(1.7, 0.55, 0.75, p, 0, 0, 0));
      g.add(box(1.56, 0.06, 0.62, flat(0xeff5f6, { roughness: 0.08 }), 0, 0.46, 0));
      g.add(cyl(0.018, 0.2, METAL(), -0.76, 0.56, 0, 10));
      return g;
    },
  },
  shower: {
    label: 'Shower', room: 'bathroom', w: 0.9, d: 0.9, h: 2.0,
    build() {
      const g = new THREE.Group();
      g.add(box(0.9, 0.09, 0.9, PORCELAIN(), 0, 0, 0));
      const gl = glass();
      const front = box(0.9, 1.9, 0.01, gl, 0, 0.09, 0.44);
      const side = box(0.01, 1.9, 0.9, gl, 0.44, 0.09, 0);
      front.castShadow = false; side.castShadow = false;
      g.add(front, side);
      g.add(box(0.9, 0.03, 0.03, METAL(), 0, 1.98, 0.44));
      const head = cyl(0.06, 0.02, METAL(), -0.3, 1.85, -0.3, 12);
      g.add(head);
      return g;
    },
  },
  washer: {
    label: 'Washing machine', room: 'bathroom', w: 0.6, d: 0.6, h: 0.85,
    build() {
      const g = new THREE.Group();
      g.add(box(0.6, 0.85, 0.6, WHITE(), 0, 0, 0));
      const door = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 20), flat(0x9aa3a8, { roughness: 0.15, metalness: 0.5 }));
      door.rotation.x = Math.PI / 2;
      door.position.set(0, 0.44, -0.3);
      g.add(door);
      g.add(box(0.5, 0.06, 0.02, flat(0xdcdcdc, { roughness: 0.4 }), 0, 0.74, -0.3));
      return g;
    },
  },
  plant: {
    label: 'Plant', room: 'any', w: 0.5, d: 0.5, h: 1.3,
    build() {
      const g = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 18), flat(0xb08968, { roughness: 0.7 }));
      pot.position.y = 0.16;
      pot.castShadow = true;
      g.add(pot);
      const leafMat = flat(0x4b7a45, { roughness: 0.75, opts: { side: THREE.DoubleSide } });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const h = 0.5 + Math.random() * 0.55;
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.13, h), leafMat);
        leaf.position.set(Math.cos(a) * 0.09, 0.32 + h / 2, Math.sin(a) * 0.09);
        leaf.rotation.set((Math.random() * 0.5 + 0.15), a, Math.cos(a) * 0.35);
        leaf.castShadow = true;
        g.add(leaf);
      }
      return g;
    },
  },
  floor_lamp: {
    label: 'Floor lamp', room: 'any', w: 0.4, d: 0.4, h: 1.6,
    build() {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 20), METAL());
      base.position.y = 0.015;
      g.add(base);
      g.add(cyl(0.015, 1.4, METAL(), 0, 0.03, 0, 10));
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.19, 0.26, 20, 1, true),
        flat(0xf6f0e4, { roughness: 0.9, opts: { side: THREE.DoubleSide, emissive: 0x2a2318 } })
      );
      shade.position.y = 1.5;
      g.add(shade);
      return g;
    },
  },
};

export function catalog() {
  return Object.entries(CATALOG).map(([key, v]) => ({
    key, label: v.label, room: v.room, w: v.w, d: v.d, h: v.h,
  }));
}

export function spec(type) {
  return CATALOG[type] || null;
}

export function build(type) {
  const entry = CATALOG[type];
  if (!entry) return null;
  const g = entry.build();
  g.userData.spec = { w: entry.w, d: entry.d, h: entry.h, mountY: entry.mountY || 0 };
  return g;
}

// Which pieces a room gets when auto-furnishing, by room name keyword.
export const ROOM_KITS = {
  bedroom: ['bed_double', 'nightstand', 'nightstand', 'wardrobe', 'plant'],
  kids: ['bed_single', 'nightstand', 'wardrobe'],
  living: ['sofa', 'coffee_table', 'tv_unit', 'rug', 'armchair', 'plant', 'floor_lamp'],
  dining: ['dining_table', 'chair', 'chair', 'chair', 'chair'],
  kitchen: ['kitchen_counter', 'kitchen_uppers', 'fridge', 'stove', 'sink_kitchen'],
  bathroom: ['toilet', 'sink_bath', 'shower', 'washer'],
  bath: ['bathtub', 'toilet', 'sink_bath'],
  office: ['desk', 'chair', 'bookshelf'],
  hall: ['plant'],
  balcony: ['plant', 'chair'],
};

export function kitFor(name = '') {
  const n = name.toLowerCase();
  if (/bed\s*room|bedroom|schlaf/.test(n)) return ROOM_KITS.bedroom;
  if (/kid|child|nursery/.test(n)) return ROOM_KITS.kids;
  if (/living|lounge|salon|wohn/.test(n)) return ROOM_KITS.living;
  if (/dining|esszimmer/.test(n)) return ROOM_KITS.dining;
  if (/kitchen|küche|kuche/.test(n)) return ROOM_KITS.kitchen;
  if (/bath|wc|toilet|shower|bad/.test(n)) return ROOM_KITS.bathroom;
  if (/office|study|work|arbeit/.test(n)) return ROOM_KITS.office;
  if (/hall|corridor|entry|flur/.test(n)) return ROOM_KITS.hall;
  if (/balcon|terrace|patio/.test(n)) return ROOM_KITS.balcony;
  return null;
}
