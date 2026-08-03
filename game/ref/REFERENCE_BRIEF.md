# Realism Reference Brief — "Neon Tokyo Under Fire"

The bar for TOKIO NEON's look, transcribed from the user's reference frame
(a photoreal night-Tokyo aerial: Shinjuku-style intersection, pink-lit Tokyo
Tower in the background, dense neon, missiles streaking in, layered explosions,
flying debris, wet reflective streets). Every builder/critic works toward this.
The genre stays ours (neon-Tokyo helicopter shooter); only the *craft* bar is
borrowed. It is PHOTOREAL and CINEMATIC, not stylised or oversaturated.

## Overall grade & atmosphere
- Deep, slightly DESATURATED purple-magenta night sky — filmic, not a saturated
  purple wash. High dynamic range: bright neon reads against dark wet asphalt.
- Real aerial depth: the far skyline sits in haze; warm (fire/sodium) and cool
  (neon/mercury) light sources coexist. Fill light is low; contrast is high.
- Warm orange bounce from fires vs cool neon — colour contrast sells the scene.

## Signage & billboards (biggest identity cue)
- DENSE, LEGIBLE signage: vertical kanji shop signs stacked up building faces,
  large glowing video billboards (idol characters, brand logos), ground-floor
  storefronts blazing. Far more density and legibility than ours today.
- Big screens look like real emissive LED panels (scanlines, slight bloom).

## Buildings
- Detailed facades with lit/unlit window variation; glowing ground-floor
  storefronts; rooftop clutter, AC units, catwalks, antennae. Real materials.
- Skyline recedes with atmospheric perspective; a landmark tower anchors depth.

## Explosions / combat FX (currently our weakest vs the bar)
- VOLUMETRIC fireballs: bright white-hot core → orange → deep red, wrapped in
  thick BLACK rolling smoke. Multiple overlapping puffs, not a flat sprite.
- Missiles/rockets: bright motion-blurred heads with long smoke trails.
- Flying debris + paper + sparks thrown outward; secondary fires on rooftops.
- Screen-scale: explosions are large, layered, and cast light on nearby faces.

## Streets & ground
- WET, reflective asphalt mirroring neon in long vertical streaks. Crosswalks,
  lane lines, manholes. Traffic (incl. white ambulances w/ lights), tiny
  pedestrians on sidewalks — the city reads as inhabited and alive.

## Vehicles / characters
- Real silhouettes, not boxes. (Zombies must become a real character mesh —
  this needs the hosted asset-loading build.)

## Biggest current gaps (priority order for our game)
1. Explosion/FX realism — volumetric fire + thick smoke + debris + missile trails.
2. Image-based lighting so materials/reflections read as real (env map → IBL).
3. Signage density & legibility; emissive LED billboards.
4. Wet-street reflections strength.
5. Real character models (zombies) — requires hosted build + assets.

## Note
This is a written substitute for a pixel reference. If the actual image is
uploaded to game/ref/ (via GitHub), the critic can also do direct A/B pixel
comparison against it.

---
## Added cues (top-down heli refs + neon-sign hero shot)
- **Composition is CONFIRMED**: top-down / high-angle over a multi-way Tokyo
  intersection with the Apache-style heli centred is exactly our camera. Our
  layout is right — the gap is fidelity, not framing. Match THIS quality.
- **Billboards = real LED panels**: big idol (Miku-style teal-hair) screens and
  ad boards are crisp, bright, slightly bloomed, mounted on believable frames on
  building faces and rooftops. Ours must read as emissive LED, denser & sharper.
- **Weathered neon sign material** (hero shot): vertical kanji tubes (red 舞台 /
  blue) in a RUSTED metal cage with visible conduit, a junction box, and hanging
  wires. Signs are 3D physical objects with grime and depth — not flat decals.
- **City is inhabited**: dense two-way traffic in every lane, tiny pedestrians on
  sidewalks and crossings, street trees, rooftop AC/vents/catwalks everywhere.
- **Grade**: refined desaturated purple night; asphalt is wet and mirrors neon;
  warm shop light spills onto sidewalks. Cohesive, filmic, not oversaturated.

---
## Street-feeling ref (Shibuya scramble at night) — user "really likes" this
- **WET reflective asphalt is the hero**: the whole road is a dark mirror; white
  crossing stripes and billboard light smear down into it. Our low-altitude
  avenues must read this wet at street level.
- **Big BRANDED LED billboards** high on glass towers (Coca-Cola-red glow, video
  screens, shop logos): large, legible, emissive with gentle bloom — landmarks
  that light the street below. Denser & bigger than ours.
- **Moody, DESATURATED, realistic exposure**: near-black sky, restrained
  saturation — realism over candy-neon. Warm shop-light vs cool screen-light.
- **Human scale + emptiness**: a lone pedestrian on the crossing sells scale and
  a lonely, cinematic mood. Tiny pedestrians + sparse motion read as real.
- Applies to our LOW/chase passes (street level), complementing the top-down bar.

---
## Requested changes — round 2 (grouped into critic-gated waves)

### A. Rendering & world scale
- **Flicker, properly** — esp. from ZOOMED-OUT/high altitude: kill z-fighting
  and temporal shimmer. Techniques: logarithmic depth buffer or raised camera
  near-plane; texture mipmaps + anisotropy; LOD / distance-cull tiny bright
  sprites & signs; damp additive-sprite shimmer.
- **Helicopter visibility** — it's hard to see. Add nav/position lights + a
  rim/key light (or subtle follow-spot) and a slightly lighter airframe. Game
  is a touch too dark overall → modest lift WITHOUT washing out the neon mood.
- **City size / boundary** — the city ends abruptly, feels wrong. Make it
  BIGGER and add a distant skyline + haze boundary so it fades out instead of
  hard-stopping. (Requires LOD/culling so perf holds.)

### B. City content variety
- **Street signs too repetitive** → far more variety: kanji, colours, shapes,
  orientations, sizes, brands.
- **Building windows** → more variance in SIZE, MATERIAL, and INNER LIGHT
  (per-window & per-floor lit/dark, warm/cool, brightness).
- **Roads** → surface-roughness variation + occasional WATER/puddles that
  reflect neon (dynamic wet patches over time).
- **More cars / traffic** generally (denser two-way flow).

### C. Gameplay systems
- **Weapon lock-on** — proper target-locking: acquire → lock → guided weapons
  track the locked target; clear HUD lock indicator/box.
- **Kill / "dead" count** — a prominent counter of zombies killed.
- **Command radio VOICE** — actually HEAR command instructions on the heli
  radio (speech synthesis w/ radio-filter FX), synced to the existing lines.

### D. Helicopter INTERIOR / cockpit view (press C) — needs a big jump
- The first-person cockpit currently looks unrealistic (flat procedural dash).
  Must jump many notches toward a real gunship cockpit: a proper instrument
  panel with believable MFD screens, switches/labels, a realistic tinted canopy
  with its frame/struts, night instrument glow reflecting on the glass, and a
  sense of sitting INSIDE the airframe (coaming, side consoles, maybe a HUD
  combiner glass). Prefer real materials/geometry; consider an embedded cockpit
  model if a suitable CC0 one exists, otherwise a much richer procedural build.
