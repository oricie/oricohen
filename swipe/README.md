# Matchmark

Describe a business, swipe through complete brand designs (logo, palette, fonts, copy, a working website), keep the ones you love, download them as a kit.

## Run

```sh
# rule-based designs only, no key needed
node swipe/server.js            # http://localhost:8787

# Claude writes the names, copy and art direction
ANTHROPIC_API_KEY=sk-ant-... node swipe/server.js
```

`python3 -m http.server` also works for the rule-based mode (it has no `/api/brand`, so the app falls back on its own).

## How it fits together

- `gen.js`: deterministic generator. `(brief, seed, direction?) -> design`. Same input, same design, so a saved card is just `{text, seed, direction}`.
- `server.js`: serves this folder and `POST /api/brand`, which asks Claude for 8 "directions" (name, headline, copy, mood, hue, glyph) per call. The key stays on the server. Rate limited, no dependencies. `MATCHMARK_MODEL` overrides the model.
- `app.js`: UI, swipe gestures, saved designs (localStorage), downloads (zip built in the browser).
- Claude's output is validated and clipped in `gen.js` (`applyDir`); anything malformed is ignored and the rules fill in.
