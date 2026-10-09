# ONE NIGHT IN TOKYO — world-model / video-generation prompts

Prompts for generating short video of this game. Every visual value below is read
from `game/index.html`, not invented — see "Source of truth" at the bottom.

The single most important instruction to any model: **this is real-time WebGL game
footage, not live action and not cinematic CG.** Boxy low-poly geometry, crisp
canvas-drawn texture detail, hard emissive neon, visible aliasing on thin edges.
If the model renders photoreal film, the prompt has failed.

---

## 1. Core prompt (copy-paste, ~110 words)

> Real-time 3D video-game footage, third-person chase camera trailing a black
> attack helicopter banking low over a rain-soaked neon Tokyo at night. Boxy
> low-poly towers packed shoulder to shoulder, faces plastered with vertical
> mincho kanji signboards, chrome romaji wordmarks and magenta-to-cyan gradient
> billboards. Deep indigo fog swallows the skyline; the sky is a vertical gradient
> from near-black zenith through violet to a hot coral-orange light-pollution glow
> at the horizon. Cool desaturated moonlight key, hot pink rim light. Wet black
> asphalt mirrors only the brightest neon in streaked patches. Heavy filmic bloom,
> ACES tone mapping, fine film grain, edge vignette, thin white rain streaks.
> Purple-indigo dominant, magenta cyan and amber accents.

---

## 2. Extended prompt (for models that reward detail)

> Real-time WebGL video-game footage rendered in three.js — low-poly boxy
> architecture with high-detail canvas-painted textures, hard emissive surfaces,
> not photorealistic film.
>
> **Subject & camera.** Third-person chase camera locked behind and slightly above
> a black twin-rotor attack helicopter, rotor disc blurred, skids and stub wings
> silhouetted against the city glow. The camera lags the aircraft slightly and
> sways — it settles a beat after each bank. 66° field of view. The helicopter
> descends between towers into an avenue canyon, banking right, then noses toward
> a lit landing pad.
>
> **City.** Dense irregular Tokyo grid: wide avenues, narrow side streets and back
> alleys, blocks packed with many narrow buildings rather than a few fat ones.
> A meandering river with lit embankments and cross-street bridges cuts the map;
> open black bay water to the south. Elevated expressway and rail corridors.
> Districts are visually distinct — glass-and-steel towers, dense neon strips,
> low-rise old-town, a dark tree-filled palace park.
>
> **Signage.** This is the visual signature. Vertical mincho kanji columns
> (tate-kanban) stacked down building corners, single blazing power-kanji on
> starburst grounds, chrome-beveled romaji, magenta→cyan gradient wordmarks,
> halftone and grid backing panels, noren-red izakaya boards with white brush
> lettering, ¥ price bursts, LED ad panels with weathered mount screws. Ground
> floors are 3D storefront bays with recessed frames, protruding awnings and
> emissive sign bands. Paper lanterns and vending machines glow at street level.
>
> **Light.** Cool desaturated moonlight key from high behind; hot pink rim from the
> opposite side; neon mood carried by emissive signs and colored street point
> lights in pink, cyan, amber and green. Sodium-warm lamp variants along the
> avenues. Exponential deep-indigo fog with a low warm ground-haze band.
>
> **Sky.** Vertical gradient — near-black at zenith, deep blue-violet, warm violet,
> dusty rose, then coral and warm orange at the horizon where the city's light
> pollution dome sits. Scattered stars densest near zenith, faint horizontal
> atmospheric bands.
>
> **Surface & weather.** Steady night rain as thin bright streaks. Streets read
> patchy — matte worn asphalt with aggregate grain, oil blotches and tar seams,
> broken by wet sheets and pools that mirror the neon above as soft vertical
> smears. Only the brightest signage survives in the reflection; buildings do not
> mirror.
>
> **Post.** ACES filmic tone mapping at slightly hot exposure, two-tier bloom
> (tight core plus wide halo) so neon blooms soft rather than shimmering, gentle
> radial chromatic aberration toward frame edges, 5% film grain overlay, dark
> edge vignette.

---

## 3. Exact values (paste into any model that accepts numeric control)

| Element | Value |
|---|---|
| Fog | exponential, `#1c1732`, density `0.00165` |
| Sky stops | `#030309` → `#0c0a28` → `#1e1640` → `#3c2258` → `#7a3a68` → `#c1567a` → `#e3835f` → `#f0a468` |
| Key light | `#c4c8e6` cool moonlight, intensity 0.64, high and behind |
| Rim light | `#ff5fa8` hot pink, intensity 0.55, opposite side |
| Tone mapping | ACES Filmic, exposure 1.2 |
| Bloom | two-tier, tight 0.6 + wide 0.4 |
| Camera | 66° FOV |
| Grain / vignette | 5% overlay grain, radial vignette |
| Palette | indigo-violet base; magenta `#ff2f8f`, cyan, amber, green accents |

---

## 4. Shot variants

**A — Rooftop chase (the money shot).** Helicopter threading between towers at
roof height, banking hard right, neon faces sliding past close on both sides,
wet street far below reflecting sign colour in vertical smears.

**B — Canyon descent.** Nose-down descent into a narrow avenue, storefront bays
and paper lanterns rising past the camera, traffic lights and kei-car headlights
streaking beneath, rain thickening in the headlight cones.

**C — Cockpit.** First-person from inside the airframe: dark canopy frame and
glare-streaked glass at the edges, a lit dash of green phosphor MFD panels —
circular radar sweep, artificial horizon, ALT/SPD/HDG readouts — with the neon
city filling the windscreen beyond.

**D — Sushi bar interior.** First-person walk inside a cramped 1980s Tokyo sushi
bar: warm near-black brown room, hinoki wood counter, glass neta case, exposed
ceiling beams, a single warm paper-shade strip light, noren curtain at the door.
Tight, warm, and lit entirely practically — the opposite of the exterior.

**E — Fish market interior.** Cold blue-grey concrete and wet tile, three banks of
hard fluorescent strips, styrofoam crates. Clinical white-blue light.

**F — Electronics shop interior.** Near-black room, floor-to-ceiling shelving
crammed with CRT televisions all showing test patterns, their grey-blue and
indigo glow the only light source.

---

## 5. HUD

The game's HUD is a strong part of its look, but most video models render text as
garbage. Two options:

**Include** (append to prompt): *Green phosphor tactical HUD overlaid — circular
radar map bottom-left, armament list top-right, hull bar top-left, centre reticle
with heading and altitude tapes, magenta district title card across the middle.*

**Exclude** (recommended for a first pass): *No HUD, no UI overlay, no text — clean
in-world render only.*

Generate clean, then composite the real HUD over it if you need it.

---

## 6. Negative prompt

> photorealistic, live action, film footage, cinematic realism, cyberpunk anime
> illustration, cel shading, painterly, daytime, clear dry streets, empty city,
> Blade Runner flying cars, Times Square English billboards, Chinese lanterns,
> modern smartphone-era Tokyo, readable English text, warm daylight, orange-teal
> grade, motion blur smearing the whole frame, depth-of-field bokeh

---

## 7. Notes for the experiment

- **Say "video game" early.** It's the single highest-leverage token here. Models
  default to photoreal, which reads as a different world entirely.
- **The palette is the identity.** Indigo base with magenta/cyan neon. Models drift
  to orange-teal — the negative prompt fights this.
- **Rain and wet ground do the heavy lifting.** Reflections are what make it look
  like this game rather than any neon city; they're worth spending prompt budget on.
- **Don't ask for both exterior and interior in one clip.** They're different
  scenes with opposite lighting logic. Generate separately.
- **Reference frames beat words.** If the model accepts image conditioning, feed it
  captures rather than relying on text alone.

## Source of truth

Colour, light and post values are read from `game/index.html`: renderer and fog
setup (~L150–200), sky gradient (~L305), lights (~L440–470), wet-street reflection
(~L1065–1130), signage generators (~L1896–2300), districts (~L2787–2795), interior
builders (~L6298–6460). Prompt copy was checked against fresh 1024×600 captures of
the current build.
