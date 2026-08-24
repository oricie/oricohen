# Floor Plan → 3D Apartment

A browser tool that turns a picture of an apartment floor plan into a textured,
walkable 3D model. Drop in a PNG/JPG, it traces the walls, finds the doorways
and rooms, and builds the flat in 3D — floors, skirting, doors, windows,
ceilings, lighting and furniture.

Everything runs client-side. No server, no upload, no build step, no CDN — open
`index.html` and it works (three.js is vendored in `vendor/`).

## Using it

1. **Drop a floor plan image** (or press *Load a sample plan* to try it).
2. **Check the detection.** Sliders under *Detection* control what counts as a
   wall. Raise *Min stroke length* if furniture symbols turn into walls; raise
   *Doorway gap* if doorways are being missed.
3. **Set the scale.** Type the real overall width of the plan, or pick the
   **Measure** tool and drag along a dimension you know. Room areas in the plan
   update live — that is the quickest way to confirm you got it right.
4. **Name the rooms** in the sidebar and pick a floor finish per room. The name
   box suggests the types that auto-furnishing recognises.
5. **Auto-furnish from names** drops a sensible kit into each room (a bedroom
   gets a bed, nightstands and a wardrobe; a kitchen gets counters, a fridge and
   a cooker), or place pieces yourself from the palette.
6. **Walk through it**, or export.

Your work is kept in this browser automatically — close the tab and it comes
back. *Saved work* in the sidebar also holds named versions you save yourself.
That storage is per browser, so **Save plan** downloads the file that survives
a cleared browser or a move to another machine.

### Tools

| Tool | Key | What it does |
|---|---|---|
| Select | `V` | Move walls, drag wall ends, slide doors along a wall, move and rotate furniture (`R` rotates 90°) |
| Wall | `W` | Drag a new wall; snaps to existing ends and to the axes |
| Door / Window | `D` / `N` | Click a wall to cut an opening |
| Room | `B` | Click inside an enclosed area to make it a room |
| Furniture | `F` | Place the selected palette item; it turns its back to a nearby wall |
| Erase | `E` | Delete what you click |
| Measure | — | Drag along a known dimension to set the scale |
| Pan | `H` | Or drag with the middle/right mouse button, wheel to zoom |

Anything you click — in the plan **or in the 3D view** — opens in the *Selection*
panel, where you can change a wall's thickness, an opening's width, height, sill
and hinge side, a room's name, or a piece of furniture's rotation and size, and
delete it. `Delete` removes the selection from either view.

**Selecting several at once**: `Shift`-click adds to (or removes from) the
selection, sweeping a box over empty plan selects everything inside it, and
`Ctrl`/`Cmd`+`A` takes all walls and furniture. Then `Delete` removes the lot.

**In the 3D view**: drag furniture to slide it across the floor, `Shift`-drag to
turn it, `Alt`-drag to resize it. The plan updates as you let go.

`1` / `2` / `3` switch between plan, split and 3D. In the walkthrough: `WASD`
to move, `Shift` to run, mouse to look, `M` for the map, `Esc` to release the
cursor. The map in the corner shows the storey you are on, with the rooms,
the furniture, and your position and field of view on it — click it to move
straight to a spot.

### Furnishing

The catalogue has around ninety pieces at real retail dimensions, grouped by
room: seating, tables, storage, beds, a full kitchen (base and wall units,
island, appliances, extractor), bathrooms (wall-hung WC, vanities, quadrant
shower, washer), office, kids, outdoor, and a flight of stairs for two-storey
flats. Search it by name, or press **Auto-furnish from names** to fill every
room whose name is recognised.

Select any piece and the *Selection* panel offers fabric and wood swatches, so
a sofa can be sand or navy and a wardrobe oak or black without leaving the app.

The dimensions are the standard sizes furniture is actually made in; no
retailer's catalogue, branding or product data is used.

### Several floors on one sheet

Architects often put two floors of the same flat side by side on one page. The
tracer looks for **gutters** — bands of blank paper that run the full height or
width of the sheet — and cuts it into separate drawings there. Walls are only
ever joined within one drawing, so the two floors never fuse into one.

Each drawing then appears under *Floors on this sheet*, where you say which
storey it is. They are shifted into alignment and stacked, one storey per wall
height. Pick which floor to walk on with the **Floor** control above the 3D
view, and tick **only this one** to hide the others while you look around.

A drawing that is not part of the flat — a site plan, a section, a legend — can
be set to *Not part of the flat* and it is dropped from the model.

### Output

- **Export .glb** — the whole flat as a standard glTF binary, opens in Blender,
  Windows 3D Viewer, macOS Preview, Sketchfab.
- **Screenshot** — a PNG of the current 3D view.
- **Save plan / Open plan** — the editable plan as JSON.

## How the tracing works

`js/tracer.js`, in order:

1. Downscale, greyscale, and threshold the image (Otsu, or a manual value).
   Plans drawn light-on-dark are detected and inverted.
2. Keep only **long runs** of ink, row by row and column by column. This is what
   separates walls from text, dimension lines and furniture symbols.
3. Group runs on neighbouring rows into **bands** — a band is a wall, its
   thickness is the band's depth. Runs are only merged into a band when they
   overlap most of the *longer* of the two, so a crossing wall doesn't get
   swallowed.
4. Snap coordinates onto shared values, extend segments to their junctions, and
   merge collinear pieces. **A gap between two collinear pieces becomes a
   doorway** — which is exactly what a doorway looks like on a plan.
5. Rasterise the merged walls and flood fill: each enclosed region that doesn't
   leak to the border is a room. Its boundary is traced, simplified, and snapped
   to the axes.
6. Discard regions that enclose an area but are not rooms — the cavity inside a
   glazed wall, the gap between a double-drawn partition. The test is width, not
   area: `2 × area / perimeter` is the inscribed half-width, about 0.05 m for a
   window cavity and 0.45 m for a narrow hallway.

Room names are a **guess** from size and shape, and a deliberately cautious one:
only a long thin room (hallway), a large main room (living room) and a small
compact one (bathroom) get a real name. Everything else is `Room 1`, `Room 2`,
because a confidently wrong label is worse than a neutral one.

### Symbols it reads

- **Windows.** A window is drawn as the wall's two faces carrying straight on
  across an opening. The tracer folds any pair of thin parallel lines into the
  single wall they describe, then finds the window as the stretch that the
  glazed lines cover but no solid wall does. One wall with a window in it —
  not two walls with a slot between them.
- **Doorways.** A gap between two collinear stretches of the same wall.
- **Staircases.** A ladder of short parallel lines, evenly spaced about a tread
  apart and all the same length. Those treads are pulled out before anything
  else looks at them, the side stringers with them, and a real flight of stairs
  is placed where the symbol was, sized to it.
- **Text, dimension lines and furniture symbols** are ignored, because they are
  never long enough to survive the run-length filter.

It works well on clean architectural plans (dark walls, light background, one
floor per image). Sketches, heavy hatching, or plans with the walls drawn as
thin outlines will need the sliders adjusted, or a few walls drawn by hand — the
editor is there so detection never has to be perfect.

## Model details

- Walls are built as solid stretches between openings, plus the panel above a
  door and the panel above and below a window, so openings are real holes.
- Doors get a frame and a leaf standing open; windows get a frame, glass, a
  mullion when wide, and a sill.
- Floors are per room, tiled at true world scale, extended under the walls so no
  seam shows. Skirting follows the room outline and stops at doorways.
- Ceilings render single-sided so the dollhouse view sees straight in while the
  walkthrough still has a ceiling overhead.
- Every texture is generated procedurally into a canvas at load time — planks,
  tile, marble, slate, carpet, concrete, brick, plaster, fabric — each with a
  normal map derived from its own height field.
- Lighting is a shadow-casting sun plus image-based ambient, with a pendant in
  every room that comes on with the *Night lighting* toggle.
- The walkthrough collides against the solid stretches of wall only, so you can
  walk through doorways but not through walls.

## Layout

```
index.html          UI shell and import map
css/app.css
js/app.js           wiring: upload -> trace -> plan -> editor + viewer
js/tracer.js        image -> wall segments, doorways, room polygons
js/editor.js        the 2D plan editor
js/builder.js       plan -> three.js scene graph, auto-furnishing
js/viewer.js        renderer, environment, orbit + walkthrough, export
js/textures.js      procedural materials
js/furniture.js     furniture catalogue
js/geom.js          geometry helpers
js/sample.js        the built-in demo plan
vendor/three/       three.js r169 (MIT) + OrbitControls, PointerLockControls,
                    GLTFExporter, RoomEnvironment
```

## Running locally

ES modules need to be served over HTTP, not opened as `file://`:

```sh
npx http-server -p 8080 .     # then open http://localhost:8080
```
