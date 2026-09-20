# How the vercel.com/labs hero is built

Research notes, 2026-09-20. Target: `https://vercel.com/labs` (reachable, HTTP 200, 534 KB of HTML).

Short version: it is **WebGPU**, not canvas2D, not WebGL, not SVG, not CSS. A single WGSL
instanced-quad draw puts one geometric mark in every cell of a 166-column square grid, picks each
mark's shape from an animated 3D Perlin noise field, and punches the "Vercel Labs" wordmark out of
the field as *negative space*. The pointer does not change mark size or position — it rotates each
nearby mark through the shape cycle and brightens it, over a hard-edged 62 px linear falloff.

---

## 0. How I got these numbers, and what is observed vs inferred

Everything quantitative below is **measured**, not read off the design. Three channels:

1. **Source.** I downloaded all 73 JS chunks and 6 CSS chunks the live page loads and read the
   component and the WGSL verbatim. The whole effect lives in one chunk,
   `_next/static/immutable/chunks/3p70-7w59pmma.js`, which exports a React component called
   `PixelField`.
2. **Live instrumentation.** I ran the real page in Chromium (Playwright) with a hook installed
   before page scripts that wraps `GPUDevice.prototype.createBuffer` and
   `GPUQueue.prototype.writeBuffer`. That captures, every frame, the exact per-cell state the
   shader consumes (the `morph` and `opacity` storage buffers) and the exact uniform block.
3. **Re-execution of their own shader.** I fed the captured state back into their *verbatim* WGSL
   on a real `GPUDevice`, rendering offscreen to a texture and reading it back, then ran their
   threshold/blur/composite bloom passes unchanged. The screenshots in
   `research/vercel-labs-shots/` are produced that way.

**Two honest caveats.**

- This container has no GPU. WebGPU only runs via SwiftShader, and the **canvas presentation path
  is broken here**: the page's own canvas sets `data-painted` and the JS side runs correctly, but
  the canvas reads back 100% transparent (checked with `toDataURL`, `drawImage` and
  `createImageBitmap` — 864,000 of 864,000 sampled pixels had alpha 0). So I could not photograph
  the site's own canvas. The compute and offscreen-render paths *do* work, which is why route (3)
  above is sound: it is their shader, their uniforms, their live per-cell state, just rendered to a
  texture instead of to a swapchain. Shots 01–06 are that. **Shot 00 is a genuine screenshot of the
  live site** and shows the no-WebGPU fallback.
- Because the origin forces a top-level navigation back to `vercel.com`, I served the downloaded
  asset mirror through Playwright request interception so the page kept its real origin while
  hitting no network. The HTML, JS, CSS and fonts are byte-for-byte what the live site served.

Where I am inferring rather than observing, I say so inline. There is not much of it.

---

## 1. Technology

**WebGPU.** Evidence, all direct:

- `navigator.gpu` is required. The renderer factory bails on line one:
  `async function d(e,t){ if(!navigator.gpu) return null; ... }`
- The chunk carries four WGSL shader sources as string literals: the mark shader
  (`label: "pixel-field-dots"`, 4,493 chars, `@vertex fn vs_main` / `@fragment fn fs_main`), a
  separable gaussian blur, a bright-pass threshold, and a composite. They are WGSL, not GLSL —
  `vec2f`, `@group(0) @binding(0) var<uniform>`, `var<storage,read>`.
- My hook saw real `GPUDevice`/`GPUQueue` traffic: storage buffers labelled `morph` and `opacity`,
  and uniform buffers labelled `pixel-field-dots.u`, `pixel-field-threshold.u`,
  `pixel-field-blur-h.u`, `pixel-field-blur-v.u`, `pixel-field-composite.u`.

No shader files and no worker scripts are fetched over the network — the WGSL is inlined in the JS
bundle, so there is nothing shader-shaped in the network tab. That is worth knowing if you go
looking for it.

The DOM is minimal:

```html
<div class="group/field relative [--cols:100] @lg:[--cols:166] flex flex-1 flex-col"
     style="--unit:calc(100cqw / var(--cols))">
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
    <canvas class="absolute top-0 left-0 block h-[min(150lvh,calc(100%+50lvh))] w-full
                   opacity-0 will-change-transform data-painted:opacity-100"></canvas>
  </div>
  <div class="relative z-10 flex flex-1 items-center justify-center ...">
    <h1 class="font-pixel-square text-[length:calc(var(--unit)*26.3158)] text-transparent
               select-none [text-box:trim-both_cap_alphabetic] ...
               group-data-field-fallback/field:text-gray-1000"
        data-pixel-text="true" id="labs-title">
      <span class="sr-only">Vercel Labs</span>
      <span aria-hidden="true">
        <span data-char="true" style="margin-right:calc(var(--unit) * -1)">V</span>
        <span data-char="true">e</span> … <span data-char="true">s</span>
      </span>
    </h1>
  </div>
</div>
```

One `<canvas>`, one `<h1>`. The `<h1>` is `text-transparent` — it exists to be **measured**, not
drawn. Its per-character `<span data-char>` boxes give the component the pixel position of every
glyph; the marks are then suppressed wherever a glyph has a dot.

There are two `PixelField` instances on the page: the hero, and a horizontal marquee near the
bottom reading "Experiment in public."

### Bloom

The final image is not just the marks. Every frame runs five passes:

| pass | shader | notes |
|---|---|---|
| 1 | `pixel-field-dots` | instanced quads → `scene` (rgba8unorm), blend `alpha` |
| 2 | `pixel-field-threshold` | bright-pass, threshold **0.6**, luma `(0.2126, 0.7152, 0.0722)` |
| 3 | `pixel-field-blur-h` | separable gaussian, **sigma 8**, radius `ceil(3σ)` = 24 taps each side |
| 4 | `pixel-field-blur-v` | same, vertical |
| 5 | `pixel-field-composite` | `scene.rgb + bloom.rgb * 2.0`, alpha forced to 1 |

That bloom is why the cursor looks like a light source rather than a recoloured cell.

---

## 2. The grid

**Fixed column count, square cells, size scales with the container.**

The column count is a CSS custom property, switched by a Tailwind *container* query:

```css
.\[--cols\:100\]      { --cols: 100 }
.\@lg\:\[--cols\:166\]{ --cols: 166 }
```

and the cell edge is `--unit: calc(100cqw / var(--cols))`. The JS re-derives it rather than reading
`--unit`:

```js
let u = rect,                                      // canvas bounding box
    s = parseFloat(style.getPropertyValue("--cols")),
    d = u.width / s;                               // unit  (cell edge, CSS px)
let v = Math.ceil(u.height / d);                   // rows
```

Both axes use the same `d`, so **cells are exactly square**. Measured, from the live uniform block:

| viewport | `--cols` | cell edge | mark quad | mark across | noise scale |
|---|---|---|---|---|---|
| 1440 × 900 | 166 | **8.6747 px** | 15.2154 px | 6.847 px | 294.94 px |
| 420 × 820 | 100 | **4.2000 px** | 7.3668 px | 3.315 px | 142.80 px |

8.6747 = 1440/166 and 4.2 = 420/100 exactly. So the grid does **not** have a fixed cell size — the
count is pinned and the cells stretch. Resizing the window re-flows the marks; it does not add or
remove columns (until you cross the container-query breakpoint at `@lg`, 32rem / 512px of
*container* width).

Row count comes from the canvas, not the section. The canvas is
`h-[min(150lvh,calc(100%+50lvh))]` — at 1440×900 that resolves to 1286 px tall against an 836 px
tall section, i.e. it overhangs so the field can slide as you scroll. So rows = `ceil(1286/8.6747)`
= 149, and the draw issues **24,734 instances** (166 × 149).

Only a window around the viewport is updated per frame: the JS recomputes rows
`max(0, floor(B/unit) - 24)` to `min(rows, ceil((B+h)/unit) + 24)` — a 24-row margin either side.
Measured: 16,102 floats written per frame to each of `morph` and `opacity`, which is 166 × 97.

**Mark size.** From the vertex shader, the quad half-extent is `dotSizePx/2` px and the SDF
half-extent is `0.45` in that normalised space, so a mark measures
`0.45 × dotSizePx = 0.45 × 1.754 × unit = 0.789 × unit`. At 1440 that is **6.847 px in an 8.675 px
cell** — about a 1.8 px gutter. `dotScale: 1.754` is a named constant.

---

## 3. "Tone mapping" — there isn't any

This is the part where the brief's premise doesn't hold, so it's worth being blunt.

**There is no photograph, no luminance sampling, and no tone ramp.** No image is fetched for the
hero, nothing is rasterised to a 2D canvas and no pixel is ever read. The source is a **binary
glyph dot map** shipped in the RSC payload:

```json
["$","$Ld8",null,{
  "ascent": 1005,
  "unitsPerEm": 1000,
  "dotMap": { "V": { "dots": [[7,0],[8,0],[7,1],[8,1],[6,2],[7,2],[8,2],[9,2], …],
                     "advance": 608 },
              "e": { "dots": [ … ] }, … },
  "fade": { "top": [0, 0.35], "bottom": [0.55, 1] },
  "reveal": "radiate",
  "scrollDim": true
}]
```

Each character carries an explicit list of `[col, row]` dots. The component converts them to grid
cells like this:

```js
let i = fontSize / unitsPerEm;                     // px per font unit
for (let r of chars) {
  let e = dotMap[r.char]; if (!e) continue;
  let n = Math.round(r.offsetX / unit),
      o = Math.round((r.offsetY + ascent * i) / unit);
  for (let [t, r2] of e.dots) cells.push(n + t, o - 1 - r2);
}
```

The trick that makes this line up: the `<h1>` font size is
`calc(var(--unit) * 26.3158)`, and `1000 / 26.3158 = 38`. The GeistPixel fonts are drawn on a
38-font-unit pixel grid, so **one font pixel is exactly one field cell**, at every viewport size.
The page loads five of these faces — `GeistPixel_Square`, `GeistPixel_Circle`,
`GeistPixel_Triangle`, `GeistPixel_Grid`, `GeistPixel_Line` — and the hero uses
`font-pixel-square`.

Then, crucially, the glyph cells are **subtracted**:

```js
if (hidden[n] || x < delay[n]) { opacity[n] = 0; continue; }
```

`hidden[n] === 1` means "a glyph dot lands here", and those cells get opacity 0, which the fragment
shader discards (`if (a.opacity < 0.5 || a.level <= 0.0) { discard; }`). **The wordmark is a hole in
the field, not marks arranged into letters.** Measured on the live page: 709 of the 16,102 cells in
the written window are suppressed. You can see it plainly in shot 02 — "Vercel Labs" is black
letterforms cut out of a grey mark field.

So what *does* vary across the field, if not tone?

1. **Shape**, from noise (§6).
2. **A vertical brightness gradient**, from the `fade` prop. Live uniform values at 1440×900:
   `fadeIn = [0, 292.6]`, `fadeOut = [459.8, 836]`. These are exactly
   `[0 × 836, 0.35 × 836]` and `[0.55 × 836, 1.0 × 836]` — the `fade` fractions times the 836 px
   section height. In the vertex shader:

   ```wgsl
   let j = clamp((f.y - u.fadeIn.x)  / (u.fadeIn.y  - u.fadeIn.x),  0.0, 1.0)
         * clamp((f.y - u.fadeOut.y) / (u.fadeOut.x - u.fadeOut.y), 0.0, 1.0);
   ```

   So marks ramp up over the top 292.6 px, sit at full level from 292.6 to 459.8 px, then ramp back
   down to nothing by 836 px.
3. **A scroll dim**, because `scrollDim: true`:
   `brightness = 1 - clamp(-rect.top / (0.66 * rect.height), 0, 1)`. Measured against prediction:

   | scrollY | measured `brightness` | predicted |
   |---|---|---|
   | 0 | 1.0000 | 1.0 |
   | 100 | 0.9348 | 0.9348 |
   | 300 | 0.5723 | 0.5723 |
   | 550 | 0.1192 | 0.1192 |
   | 800 | 0.0000 | 0.0 |

4. **Charge colour** under the pointer (§4).

**Mark size never varies.** `dotSizePx` is a single uniform set once per `setGrid`, identical for
every instance. Nothing in the vertex or fragment shader scales a mark by tone, charge or anything
else. If you were expecting a halftone where dot radius tracks luminance — that is not this.

---

## 4. The pointer interaction

### What changes

Three things, and *not* size or position:

1. **Shape rotates through the cycle.** Final shape index:

   ```wgsl
   let g = morphValues[b];                              // charge, 0..1
   let h = u32(clamp(g, 0.0, 0.999) * 3.0);             // 0, 1 or 2
   let i = (restingShape(f) + h) % 3u;
   ```

   with `0 = square` (Chebyshev SDF), `1 = circle`, `2 = isosceles triangle`. So charge steps the
   mark forward in the square→circle→triangle ring at charge 1/3 and 2/3. Shot 03 (the 4× detail)
   shows it cleanly: a resting patch of circles, then a ring of triangles, then a white core of
   squares.

2. **Colour steps up in four discrete bands** — no gradient:

   ```wgsl
   if      (f < 0.25) { g = u.dotColor;   }   // #929292
   else if (f < 0.5)  { g = u.colorStep1; }   // 0.715  = 1/3 of the way to white
   else if (f < 0.75) { g = u.colorStep2; }   // 0.8575 = 2/3
   else               { g = u.colorStep3; }   // 1.0    = white
   ```

   Verified in the captured uniform block: `dotColor = 0.5725` (= 0x92/255), then 0.715, 0.8575,
   1.0. The base colour is passed from JS as the literal string `"#929292"`.

3. **Bloom**, indirectly — once a mark crosses the 0.6 bright-pass threshold it starts feeding the
   σ=8 blur, which is what produces the soft halo.

**No displacement.** Instance position is purely `(vec2f(f32(b % cols), f32(b / cols)) + 0.5) *
gridUnit + viewOffset`. The pointer is not in that expression at all. Nothing is pushed, warped or
repelled.

### Radius and falloff

From the source:

```js
F = (e, t) => {
  if (!L) return 0;
  let r = e - V, n = t - $;
  return 1 - Math.min(Math.sqrt(r * r + n * n) / H, 1);   // H = hoverRadius
}
```

**Linear, with a hard cutoff** — not gaussian, not smoothstep. `hoverRadius` is 62 in the constants
block.

I measured it rather than trusting that. Holding the pointer at viewport (700, 450), I captured the
`morph` buffer and least-squares fitted `charge = 1 - dist/R` over all 121 charged cells, solving
for pointer position and R jointly:

```
fit: pointer = (700.56, 386.01) field px,  radius = 61.994 px,  rms = 0.00070 over 121 cells
max distance with charge > 0: 61.72 px
```

Radius **61.994 px** against a nominal 62, with residuals under 1e-3. That is 7.146 cells at this
viewport. The recovered pointer position is right too: the field's origin is the section box, whose
top is at viewport y = 64, and 450 − 64 = 386.01. Raw samples:

| distance (px) | measured charge | `1 − d/62` |
|---|---|---|
| 0.58 | 0.9647 | 0.9907 |
| 12.47 | 0.8250 | 0.7989 |
| 26.54 | 0.5784 | 0.5719 |
| 35.22 | 0.4388 | 0.4320 |
| 42.86 | 0.2999 | 0.3088 |
| 50.64 | 0.2140 | 0.1833 |
| 55.68 | 0.1311 | 0.1020 |
| 61.24 | 0.0196 | 0.0122 |
| 63.58 | 0.0000 | 0.0000 |

(The small spread around the line is the charge/discharge rate limiter still catching up, §5. Rows
reading exactly 0.0000 inside the radius are glyph-hole cells — the pointer was sitting on the
wordmark, and masked cells are skipped before charge is updated.)

Note the radius is **62 CSS px flat**, not a multiple of the cell. So on a narrow viewport
(4.2 px cells) the same 62 px reaches ~14.8 cells instead of ~7.1 — the hot spot covers four times
as many marks on mobile.

### Where the pointer is tracked

`usePointer` is attached to the `group/field` div — the whole 1440 × 836 hero section, not the
canvas (which is `pointer-events-none`). Coordinates are section-relative. On pointer leave the
tracker reports `active: false` and the component sets its stored sample to `null`, which drops the
target to 0 immediately.

---

## 5. Timing

### The rate limiter

There is no easing curve and no spring. It is an asymmetric **linear rate limiter** toward the
target:

```js
D = (cur, target) =>
  target > cur ? Math.min(cur + chargeSpeed    * dt, target)
: target < cur ? Math.max(cur - dischargeSpeed * dt, target)
: cur;
```

with `chargeSpeed: 7.5` and `dischargeSpeed: 0.5` per second — **15× faster to light up than to
fade**. That asymmetry is the whole feel of the thing.

### The 100 ms staleness window — the interesting bit

```js
let j = S.current,
    L = null !== j && t - j.at < 100;
```

The pointer sample **expires 100 ms after the last pointer event**. There is no `pointerstop`
event, so if you hold the mouse perfectly still the browser stops firing `pointermove`, `L` goes
false, the target collapses to 0, and *the whole hot spot fades out even though the cursor is still
sitting there*. The effect responds to pointer **motion**, not pointer **presence**.

I measured it. Jiggle at (700, 450) until saturated, then stop moving completely (peak charge
tracked across the field, t relative to the last pointer event):

```
  dt = -80 ms   peak 0.9647    (still saturated)
  dt = +80 ms   peak 0.9647    (still saturated — inside the 100 ms window)
  dt = +160 ms  peak 0.9230    (decay has started)
  dt = +400 ms  peak 0.8064
  dt = +800 ms  peak 0.6064
  dt = +1200 ms peak 0.4064
  dt = +1600 ms peak 0.2064
  dt = +2000 ms peak 0.0064
  dt = +2080 ms peak 0.0000    (gone)
```

Decay onset falls between +80 ms and +160 ms, consistent with the 100 ms window. The slope from
+160 ms to +2000 ms is `(0.9230 − 0.0064) / 1.8396 s = ` **0.4983 /s**, against a nominal 0.5.
Perfectly linear — no ease-out, no exponential tail. Full fade from saturation takes about
**2.0–2.1 s** (≈100 ms hold + ≈1.93 s ramp).

### Charge-up

Re-starting the jiggle from a fully decayed field:

```
  +38 ms   peak 0.3750
  +77 ms   peak 0.6255
  +117 ms  peak 0.8752
  +157 ms  peak 0.9647   (saturated)
```

Consecutive frame deltas are 0.2505 and 0.2497. At 7.5 /s that is a 33.4 ms and 33.3 ms frame,
which matches the ~30 fps this software renderer was running at — so **chargeSpeed 7.5 /s is
confirmed exactly**. Saturation in roughly **120–160 ms**.

### The trail

Because charge rises 15× faster than it falls, a moving cursor leaves a comet tail: the new
position saturates in ~130 ms while everything behind it bleeds off over ~2 s. Shot 05 is a
70-step sweep across the hero captured at the end of the sweep — 939 cells charged, peak 0.813,
with a long luminous wake. Shot 06 is the same field 1 s after the pointer stopped, down to peak
0.439.

### Load-in reveal

The hero uses `reveal: "radiate"`. Per-cell delay is distance from the wordmark's bounding box,
normalised by the furthest corner, scaled by `revealSpread: 0.9`, plus
`Math.random() * revealJitter: 0.15`. The clock starts with a `revealHeadStart: 0.3` s lead, so
cells with delay < 0.3 are already on at first paint and the last cells land at 1.05 − 0.3 = 0.75 s.

Measured, sampling the `opacity` buffer from the first painted frame:

```
  +0 ms      37.9% of cells revealed
  +98 ms     50.2%
  +290 ms    70.6%
  +456 ms    86.7%
  +606 ms    94.3%
  +706 ms    95.6%   ← complete (the remaining 4.4% are the 709 glyph-hole cells)
```

Complete at **706 ms**, against a predicted 750 ms. The field blooms outward from the wordmark.

The other two modes in the code: `"stagger"` (`delay = random() * 0.4`, the default) and `"none"`
(all zero — used by the marquee).

### Noise drift

`noiseTime` advances at `(t / 1000) * 0.12` — see §6 for what that does.

### Marquee

The second field scrolls its mask by whole cells: `Math.floor(t / 48) % periodCells`, i.e. **one
grid cell every 48 ms**, wrapping over `periodCells = round(textWidth / unit) + 24`. It snaps cell
by cell rather than sliding — consistent with the rest of the piece.

---

## 6. Randomness and noise

**Yes, there is noise — and it is the main source of visual variety.** But it is deterministic
noise, not per-frame randomness.

Every cell's *resting* shape comes from 3D Perlin fbm evaluated at the cell's own position:

```wgsl
const OCTAVES = 2;  const PERSISTENCE = 0.5;  const LACUNARITY = 2.17;
const THRESHOLD = 0.48;  const CONTRAST = 3.0;

fn restingShape(a: vec2f) -> u32 {
  let b = fbm(vec3f(a / u.noiseUnitPx + u.seedOffset, u.time));
  let c = b * 0.5 + 0.5;
  let d = clamp((c - THRESHOLD) * CONTRAST + 0.5, 0.0, 1.0);
  let e = u32(min(d, 0.999999) * 3.0);
  var f = array<u32, 3>(2u, 1u, 0u);
  return f[e];                       // low noise → triangle, mid → circle, high → square
}
```

`cnoise` is the standard Gustavson classic-Perlin `classicnoise3D`, transcribed into WGSL (with
`permute(x) = mod289(((x*34)+10)*x)`).

Live uniform values: `noiseUnitPx = 294.94 px` (= 34 × cell edge — so noise patches are about **34
cells across**, which is exactly the patch scale visible in shot 01), `seedOffset = (87.72,
−50.04)`, and `time` advancing at 0.12 /s.

I ran their `restingShape` unmodified in a compute shader over all 24,734 cells with the live
uniforms, sweeping the time input:

| `time` | square | circle | triangle |
|---|---|---|---|
| 0.000 | 38.9% | 43.0% | 18.2% |
| 0.012 (+0.1 s) | 35.6% | 44.4% | 20.0% |
| 0.060 (+0.5 s) | 24.9% | 46.7% | 28.4% |
| 0.120 (+1.0 s) | 16.6% | 44.3% | 39.1% |
| 0.600 (+5.0 s) | 23.0% | 33.4% | 43.6% |

Cell-by-cell stability: **94.7%** of cells hold their shape over 0.1 s, but only **31.2%** over
5 s — which is chance level for this mix. So the shape field is continuously churning; marks
quietly flip between circle, square and triangle on their own, with no pointer involved, and the
whole field decorrelates in roughly five seconds.

**So: do identical inputs produce identical marks?** Two separate answers:

- *Deterministic in space and time.* There is no RNG in the shape path. Given the same cell
  position and the same `time`, you get the same shape, every reload. Two cells with the same
  "tone" (there is no tone) but different positions will generally differ, because the noise is
  spatial.
- *The one genuine `Math.random()`* in the whole component is the reveal delay — `stagger` uses
  `Math.random() * 0.4`, `radiate` adds `Math.random() * 0.15` of jitter. So the load-in sparkle
  differs run to run; the steady state does not.

---

## 7. Degradation

Two fallbacks, both worth copying:

- **No WebGPU, or device init fails** → the renderer returns `null`, the component sets
  `data-field-fallback` on the section, and Tailwind flips the `<h1>` from `text-transparent` to
  `group-data-field-fallback/field:text-gray-1000` and re-enables text selection. You get the plain
  GeistPixel wordmark as real, selectable, accessible text and no canvas at all. **This is what the
  live site served me** — shot 00. There is also a `<noscript>` rule doing the same thing.
- **`prefers-reduced-motion: reduce`** → `C = false` throughout: no rAF loop (redraw is driven by
  scroll instead), `noiseTime` is pinned to the constant `1.7` so shapes never churn, all reveal
  delays are zeroed so the field appears at once, `usePointer` is disabled entirely so there is no
  hover response, and the marquee becomes a native horizontal scroller.

Accessibility is handled properly: the canvas wrapper is `aria-hidden`, the `<h1>` carries a
`<span class="sr-only">Vercel Labs</span>`, and the decorative `<span data-char>` run is
`aria-hidden`.

---

## 8. Constants, verbatim

Straight from the bundle:

```js
i = {
  hoverRadius: 62,
  chargeSpeed: 7.5,
  dischargeSpeed: 0.5,
  revealMaxDelay: 0.4,
  revealSpread: 0.9,
  revealJitter: 0.15,
  revealHeadStart: 0.3,
  bloomThreshold: 0.6,
  bloomStrength: 2,
  bloomSigma: 8,
  dotScale: 1.754,
}
```

And the mark SDFs:

```wgsl
fn shapeDistance(a: vec2f, b: u32) -> f32 {
  const c = 0.45;
  switch b {
    case 0u: { return max(abs(a.x), abs(a.y)) - c; }          // square
    case 1u: { return length(a) - c; }                         // circle
    default: { return sdTriangleIsosceles(vec2f(a.x, c - a.y), // triangle
                                          vec2f(c, 2.0 * c)); }
  }
}
```

Edge antialiasing is `d = clamp(2.0 / dotSizePx, 0.02, 0.25)` then `smoothstep(d, -d, c)` — a ~1 px
feather at this scale, with a `discard` below 1% coverage.

---

## 9. Screenshots

In `research/vercel-labs-shots/`. All at 1440 × 900, `--cols: 166`, cell edge 8.6747 px. Shots
01–06 are crops of the canvas region the viewport shows (field y 0–836).

| file | what it is |
|---|---|
| `vercel-labs-00-live-no-webgpu-fallback.png` | **Real screenshot of the live site** in this container. WebGPU unavailable → `data-field-fallback` → plain GeistPixel_Square wordmark, no field. |
| `vercel-labs-01-resting.png` | No pointer. The resting noise field: patches of circles, squares and triangles ~34 cells wide, vertical fade top and bottom, wordmark punched out. |
| `vercel-labs-02-pointer-on-wordmark.png` | Pointer at (700, 450), on the wordmark. 121 cells charged, peak 0.9647. |
| `vercel-labs-03-detail-4x.png` | 200 × 150 px crop around that pointer at 4× nearest-neighbour. The clearest single image: resting circles → triangle ring → white square core, constant mark size throughout, glyph holes in black. |
| `vercel-labs-04-pointer-open-field.png` | Pointer at (330, 760), below the wordmark on open field. 163 cells charged, peak 0.9327. |
| `vercel-labs-05-sweep-trail.png` | Captured at the end of a fast 70-step sweep across the hero. 939 cells charged, peak 0.813 — the asymmetric charge/discharge trail. |
| `vercel-labs-06-1s-after-pointer-stops.png` | Same field 1 s later. Peak down to 0.4394, mid-fade. |

As set out in §0: 01–06 are the site's own WGSL, fed the site's own live per-cell buffers and
uniform block, rendered offscreen because the canvas swapchain does not work in this container.
They are not photographs of the live canvas.

---

## 10. If you wanted to rebuild it

The idea worth stealing is not the shader, it is the **font-as-dot-map** trick: ship glyphs as
explicit `[col,row]` dot lists, size the text so one font pixel equals one grid cell, and let the
text element be transparent and purely for measurement. Everything else follows — the mask is
binary, so no tone mapping is needed, and the wordmark reads as negative space.

A canvas2D version would be entirely feasible at this density: 16,102 cells per frame, one
`fillRect`/`arc`/triangle path each, no per-pixel work. You would lose the bloom (or fake it with a
second blurred layer). The parts that actually matter for the feel, in order:

1. The wordmark is a **hole**, not an arrangement of marks.
2. Mark **size is constant**; shape and a 4-step brightness carry everything.
3. Charge in ~0.13 s, decay over ~2 s — **linear, asymmetric, no easing**.
4. The pointer sample **expires after 100 ms**, so the effect tracks motion, not presence.
5. Resting shape from **spatial noise that drifts**, patch scale ~34 cells, so the field is never
   quite still.
