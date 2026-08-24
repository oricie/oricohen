// Procedural materials. Everything is drawn into canvases at load time so the
// tool ships with no image assets and works offline.

import * as THREE from 'three';

const SIZE = 512;

// ------------------------------------------------------------------- noise

function makeNoise(seed = 1) {
  const perm = new Uint8Array(512);
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y) => {
    const u = h & 1 ? x : y;
    const v = h & 2 ? x : y;
    return (h & 4 ? -u : u) + (h & 8 ? -v : v) * 0.5;
  };

  // Tileable value/gradient noise over a `period` lattice.
  function noise2(x, y, period) {
    const wrap = (v) => ((v % period) + period) % period;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const x0 = wrap(xi), x1 = wrap(xi + 1);
    const y0 = wrap(yi), y1 = wrap(yi + 1);
    const aa = perm[(perm[x0 & 255] + y0) & 255];
    const ba = perm[(perm[x1 & 255] + y0) & 255];
    const ab = perm[(perm[x0 & 255] + y1) & 255];
    const bb = perm[(perm[x1 & 255] + y1) & 255];
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  function fbm(x, y, octaves = 4, period = 8) {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise2(x * freq, y * freq, period * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  return { noise2, fbm };
}

// ------------------------------------------------------------------ helpers

function canvas2d(size = SIZE) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { canvas: c, ctx: c.getContext('2d') };
}

function toTexture(canvas, { srgb = false } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Sobel a greyscale height canvas into a tangent-space normal map.
function heightToNormal(heightCanvas, strength = 2.0) {
  const size = heightCanvas.width;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, size, size).data;
  const { canvas, ctx } = canvas2d(size);
  const out = ctx.createImageData(size, size);
  const at = (x, y) => {
    const xi = ((x % size) + size) % size;
    const yi = ((y % size) + size) % size;
    return src[(yi * size + xi) * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      out.data[i] = (nx * 0.5 + 0.5) * 255;
      out.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      out.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

function greyCanvasFrom(fn) {
  const { canvas, ctx } = canvas2d();
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = Math.max(0, Math.min(1, fn(x, y))) * 255;
      const i = (y * SIZE + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgb(c) {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

// ------------------------------------------------------------- pattern draws

function drawWood(ctx, { light = '#c89a63', dark = '#8a5a30', planks = 5, seed = 3 } = {}) {
  const { fbm } = makeNoise(seed);
  const lightRgb = hexToRgb(light);
  const darkRgb = hexToRgb(dark);
  const img = ctx.createImageData(SIZE, SIZE);
  const plankH = SIZE / planks;

  for (let y = 0; y < SIZE; y++) {
    const plank = Math.floor(y / plankH);
    const plankSeed = plank * 37.1;
    const tone = 0.5 + 0.5 * Math.sin(plank * 2.7);
    for (let x = 0; x < SIZE; x++) {
      // stagger every other plank so the seams do not line up
      const off = (plank % 2) * SIZE * 0.5;
      const u = (x + off) / SIZE;
      const grain = fbm((u * 6) + plankSeed, (y / SIZE) * 40 + plankSeed, 4, 16);
      const rings = Math.sin((u * 28 + grain * 9 + plankSeed) * Math.PI) * 0.5 + 0.5;
      let t = rings * 0.55 + grain * 0.45 + tone * 0.12;
      t = Math.max(0, Math.min(1, t));
      let c = mix(darkRgb, lightRgb, t);

      const edge = y % plankH;
      const seam = edge < 1.6 || edge > plankH - 1.6;
      const boardSeam = ((x + off) % (SIZE * 0.5)) < 1.6;
      if (seam || boardSeam) c = mix(c, [30, 20, 12], 0.55);

      const i = (y * SIZE + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function woodHeight({ planks = 5, seed = 3 } = {}) {
  const { fbm } = makeNoise(seed);
  const plankH = SIZE / planks;
  return greyCanvasFrom((x, y) => {
    const plank = Math.floor(y / plankH);
    const off = (plank % 2) * SIZE * 0.5;
    const grain = fbm(((x + off) / SIZE) * 6 + plank * 37.1, (y / SIZE) * 40, 3, 16);
    const edge = y % plankH;
    const seam = edge < 2 || edge > plankH - 2 ? 0.0 : 1.0;
    const boardSeam = ((x + off) % (SIZE * 0.5)) < 2 ? 0.0 : 1.0;
    return 0.55 + grain * 0.25 - (1 - seam) * 0.5 - (1 - boardSeam) * 0.45;
  });
}

function drawTiles(ctx, {
  base = '#e8e4dd', grout = '#b9b3a8', cols = 4, rows = 4,
  veins = false, seed = 7, variance = 0.06,
} = {}) {
  const { fbm } = makeNoise(seed);
  const baseRgb = hexToRgb(base);
  const groutRgb = hexToRgb(grout);
  const tw = SIZE / cols;
  const th = SIZE / rows;
  const img = ctx.createImageData(SIZE, SIZE);
  const groutW = Math.max(2, SIZE * 0.006);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cx = Math.floor(x / tw);
      const cy = Math.floor(y / th);
      const jitter = (Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453) % 1;
      let c = mix(baseRgb, [255, 255, 255], jitter * variance);
      c = mix(c, [0, 0, 0], Math.abs(jitter) * variance * 0.5);

      if (veins) {
        const warp = fbm(x / SIZE * 3, y / SIZE * 3, 4, 8);
        const v = Math.abs(Math.sin((x / SIZE * 4 + warp * 3.2) * Math.PI * 2));
        const vein = Math.pow(1 - Math.min(1, v * 2.4), 3);
        c = mix(c, [120, 118, 116], vein * 0.7);
        c = mix(c, [252, 251, 249], fbm(x / SIZE * 7 + 4, y / SIZE * 7, 3, 16) * 0.25);
      } else {
        c = mix(c, [255, 255, 255], fbm(x / SIZE * 8, y / SIZE * 8, 3, 16) * 0.08);
      }

      const inGrout = (x % tw) < groutW || (y % th) < groutW;
      if (inGrout) c = groutRgb;

      const i = (y * SIZE + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function tileHeight({ cols = 4, rows = 4 } = {}) {
  const tw = SIZE / cols;
  const th = SIZE / rows;
  const groutW = Math.max(2, SIZE * 0.006);
  return greyCanvasFrom((x, y) => {
    const inGrout = (x % tw) < groutW || (y % th) < groutW;
    return inGrout ? 0.25 : 0.9;
  });
}

function drawCarpet(ctx, { base = '#9a9186', seed = 11 } = {}) {
  const { fbm, noise2 } = makeNoise(seed);
  const baseRgb = hexToRgb(base);
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const fuzz = noise2(x / SIZE * 128, y / SIZE * 128, 128) * 0.5 + 0.5;
      const blotch = fbm(x / SIZE * 4, y / SIZE * 4, 4, 8);
      let c = mix(baseRgb, [255, 255, 255], fuzz * 0.22 + blotch * 0.12);
      c = mix(c, [0, 0, 0], (1 - fuzz) * 0.18);
      const i = (y * SIZE + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawPlaster(ctx, { base = '#f2efe9', seed = 5, grit = 0.05 } = {}) {
  const { fbm, noise2 } = makeNoise(seed);
  const baseRgb = hexToRgb(base);
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbm(x / SIZE * 6, y / SIZE * 6, 5, 8);
      const speck = noise2(x / SIZE * 96, y / SIZE * 96, 96) * 0.5 + 0.5;
      let c = mix(baseRgb, [255, 255, 255], n * 0.06);
      c = mix(c, [0, 0, 0], speck * grit);
      const i = (y * SIZE + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function plasterHeight({ seed = 5 } = {}) {
  const { fbm, noise2 } = makeNoise(seed);
  return greyCanvasFrom((x, y) =>
    0.5 + fbm(x / SIZE * 6, y / SIZE * 6, 5, 8) * 0.35 +
    (noise2(x / SIZE * 96, y / SIZE * 96, 96) * 0.5 + 0.5) * 0.12);
}

function drawBrick(ctx, { brick = '#a9603f', mortar = '#d8d2c6', rows = 8, seed = 13 } = {}) {
  const { fbm } = makeNoise(seed);
  const brickRgb = hexToRgb(brick);
  const mortarRgb = hexToRgb(mortar);
  const bh = SIZE / rows;
  const bw = bh * 2.4;
  const gap = Math.max(2, SIZE * 0.008);
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    const row = Math.floor(y / bh);
    const off = (row % 2) * bw * 0.5;
    for (let x = 0; x < SIZE; x++) {
      const bx = (x + off) % bw;
      const inMortar = bx < gap || (y % bh) < gap;
      const idx = Math.floor((x + off) / bw) * 31 + row * 17;
      const tone = ((Math.sin(idx) * 43758.5453) % 1 + 1) % 1;
      let c = inMortar
        ? mix(mortarRgb, [255, 255, 255], fbm(x / SIZE * 20, y / SIZE * 20, 3, 16) * 0.2)
        : mix(brickRgb, [255, 235, 220], tone * 0.22 + fbm(x / SIZE * 24, y / SIZE * 24, 4, 16) * 0.2);
      if (!inMortar) c = mix(c, [60, 30, 20], fbm(x / SIZE * 40 + 9, y / SIZE * 40, 3, 16) * 0.25);
      const i = (y * SIZE + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function brickHeight({ rows = 8 } = {}) {
  const bh = SIZE / rows;
  const bw = bh * 2.4;
  const gap = Math.max(2, SIZE * 0.008);
  return greyCanvasFrom((x, y) => {
    const row = Math.floor(y / bh);
    const off = (row % 2) * bw * 0.5;
    const inMortar = ((x + off) % bw) < gap || (y % bh) < gap;
    return inMortar ? 0.2 : 0.85;
  });
}

function drawFabric(ctx, { base = '#6c7b74', seed = 17 } = {}) {
  const { noise2, fbm } = makeNoise(seed);
  const baseRgb = hexToRgb(base);
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const weave = (Math.sin(x * 0.9) * Math.sin(y * 0.9)) * 0.5 + 0.5;
      const n = noise2(x / SIZE * 64, y / SIZE * 64, 64) * 0.5 + 0.5;
      let c = mix(baseRgb, [255, 255, 255], weave * 0.13 + n * 0.08);
      c = mix(c, [0, 0, 0], fbm(x / SIZE * 5, y / SIZE * 5, 3, 8) * 0.12);
      const i = (y * SIZE + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- materials

// tile = the real-world size in metres that one texture repeat covers.
const RECIPES = {
  oak: {
    label: 'Oak planks', tile: 2.2, roughness: 0.55, metalness: 0.02, normalScale: 0.45,
    draw: (ctx) => drawWood(ctx, { light: '#c89a63', dark: '#8d5c33', planks: 5, seed: 3 }),
    height: () => woodHeight({ planks: 5, seed: 3 }),
  },
  walnut: {
    label: 'Walnut planks', tile: 2.2, roughness: 0.48, metalness: 0.02, normalScale: 0.45,
    draw: (ctx) => drawWood(ctx, { light: '#8a5a3b', dark: '#4a2c1c', planks: 5, seed: 8 }),
    height: () => woodHeight({ planks: 5, seed: 8 }),
  },
  ash: {
    label: 'Pale ash', tile: 2.2, roughness: 0.6, metalness: 0.02, normalScale: 0.4,
    draw: (ctx) => drawWood(ctx, { light: '#e0cdb2', dark: '#bda184', planks: 6, seed: 21 }),
    height: () => woodHeight({ planks: 6, seed: 21 }),
  },
  tile: {
    label: 'Ceramic tile', tile: 1.6, roughness: 0.25, metalness: 0.04, normalScale: 0.7,
    draw: (ctx) => drawTiles(ctx, { base: '#e9e5de', grout: '#b4aea3', cols: 4, rows: 4 }),
    height: () => tileHeight({ cols: 4, rows: 4 }),
  },
  marble: {
    label: 'Marble', tile: 2.0, roughness: 0.14, metalness: 0.05, normalScale: 0.25,
    draw: (ctx) => drawTiles(ctx, { base: '#f0eeea', grout: '#d9d5cd', cols: 2, rows: 2, veins: true, seed: 31 }),
    height: () => tileHeight({ cols: 2, rows: 2 }),
  },
  slate: {
    label: 'Slate', tile: 1.8, roughness: 0.62, metalness: 0.03, normalScale: 0.8,
    draw: (ctx) => drawTiles(ctx, { base: '#4c4f52', grout: '#3a3c3e', cols: 3, rows: 3, seed: 41, variance: 0.18 }),
    height: () => tileHeight({ cols: 3, rows: 3 }),
  },
  carpet: {
    label: 'Carpet', tile: 1.4, roughness: 0.95, metalness: 0, normalScale: 0.35,
    draw: (ctx) => drawCarpet(ctx, { base: '#9a9186' }),
    height: () => plasterHeight({ seed: 11 }),
  },
  concrete: {
    label: 'Concrete', tile: 3.0, roughness: 0.78, metalness: 0.02, normalScale: 0.3,
    draw: (ctx) => drawPlaster(ctx, { base: '#b8b5b0', seed: 23, grit: 0.09 }),
    height: () => plasterHeight({ seed: 23 }),
  },
  wall: {
    label: 'Painted wall', tile: 3.0, roughness: 0.92, metalness: 0, normalScale: 0.16,
    draw: (ctx) => drawPlaster(ctx, { base: '#f4f1ec', seed: 5, grit: 0.035 }),
    height: () => plasterHeight({ seed: 5 }),
  },
  wallWarm: {
    label: 'Warm wall', tile: 3.0, roughness: 0.92, metalness: 0, normalScale: 0.16,
    draw: (ctx) => drawPlaster(ctx, { base: '#efe6d8', seed: 15, grit: 0.035 }),
    height: () => plasterHeight({ seed: 15 }),
  },
  ceiling: {
    label: 'Ceiling', tile: 3.0, roughness: 0.96, metalness: 0, normalScale: 0.1,
    draw: (ctx) => drawPlaster(ctx, { base: '#fbfaf7', seed: 9, grit: 0.02 }),
    height: () => plasterHeight({ seed: 9 }),
  },
  brick: {
    label: 'Brick', tile: 2.4, roughness: 0.85, metalness: 0.02, normalScale: 1.0,
    draw: (ctx) => drawBrick(ctx, {}),
    height: () => brickHeight({}),
  },
  fabric: {
    label: 'Fabric', tile: 1.2, roughness: 0.9, metalness: 0, normalScale: 0.4,
    draw: (ctx) => drawFabric(ctx, { base: '#6c7b74' }),
    height: () => plasterHeight({ seed: 17 }),
  },
  fabricWarm: {
    label: 'Warm fabric', tile: 1.2, roughness: 0.9, metalness: 0, normalScale: 0.4,
    draw: (ctx) => drawFabric(ctx, { base: '#b09274' }),
    height: () => plasterHeight({ seed: 18 }),
  },
  grass: {
    label: 'Grass', tile: 4.0, roughness: 0.95, metalness: 0, normalScale: 0.5,
    draw: (ctx) => drawCarpet(ctx, { base: '#6f7f52', seed: 27 }),
    height: () => plasterHeight({ seed: 27 }),
  },
};

const cache = new Map();

export function material(name) {
  if (cache.has(name)) return cache.get(name);
  const recipe = RECIPES[name] || RECIPES.wall;

  const { canvas, ctx } = canvas2d();
  recipe.draw(ctx);
  const map = toTexture(canvas, { srgb: true });

  const height = recipe.height();
  const normalMap = toTexture(heightToNormal(height, 2.2));

  const mat = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(recipe.normalScale, recipe.normalScale),
    roughness: recipe.roughness,
    metalness: recipe.metalness,
  });
  mat.userData.tile = recipe.tile;
  mat.name = name;
  cache.set(name, mat);
  return mat;
}

// A copy of a material whose textures repeat correctly over a given surface.
export function tiled(name, width, height, rotate = 0) {
  const base = material(name);
  const key = `${name}:${width.toFixed(2)}x${height.toFixed(2)}:${rotate}`;
  if (cache.has(key)) return cache.get(key);
  const mat = base.clone();
  const size = base.userData.tile;
  for (const slot of ['map', 'normalMap']) {
    if (!mat[slot]) continue;
    const tex = mat[slot].clone();
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width / size, height / size);
    tex.rotation = rotate;
    tex.center.set(0.5, 0.5);
    mat[slot] = tex;
  }
  mat.userData.tile = size;
  cache.set(key, mat);
  return mat;
}

// Plain non-textured materials for fixtures and furniture.
const flatCache = new Map();
export function flat(color, { roughness = 0.6, metalness = 0.0, opts = {} } = {}) {
  const key = `${color}:${roughness}:${metalness}:${JSON.stringify(opts)}`;
  if (flatCache.has(key)) return flatCache.get(key);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...opts });
  flatCache.set(key, mat);
  return mat;
}

export function glass() {
  if (flatCache.has('glass')) return flatCache.get('glass');
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xd8e8ee,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.92,
    thickness: 0.01,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  flatCache.set('glass', mat);
  return mat;
}

export const FLOOR_MATERIALS = ['oak', 'walnut', 'ash', 'tile', 'marble', 'slate', 'carpet', 'concrete'];
export const WALL_MATERIALS = ['wall', 'wallWarm', 'concrete', 'brick'];
export function label(name) {
  return (RECIPES[name] || {}).label || name;
}

export function disposeAll() {
  for (const mat of [...cache.values(), ...flatCache.values()]) {
    for (const slot of ['map', 'normalMap', 'roughnessMap']) {
      if (mat[slot]) mat[slot].dispose();
    }
    mat.dispose();
  }
  cache.clear();
  flatCache.clear();
}
