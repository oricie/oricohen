# Matchmark

Describe a business, swipe through complete brand designs (logo, palette, fonts, copy, a working website), keep the ones you love, download them as a kit.

## Run

```sh
# rule-based designs only, no key needed
node swipe/server.js            # http://localhost:8787

# Claude writes the names, copy and art direction
ANTHROPIC_API_KEY=sk-ant-... node swipe/server.js
```

Photos come from Pexels (free): add `PEXELS_API_KEY=...` from https://www.pexels.com/api. Without it the app stays graphic-only.

`python3 -m http.server` also works for the rule-based mode (it has no `/api/brand`, so the app falls back on its own).

## How it fits together

- `gen.js`: deterministic generator. `(brief, seed, direction?) -> design`. Same input, same design, so a saved card is just `{text, seed, direction}`.
- `server.js`: serves this folder and `POST /api/brand`, which asks Claude for 8 "directions" (name, headline, copy, mood, hue, glyph) per call. The key stays on the server. Rate limited, no dependencies. `MATCHMARK_MODEL` overrides the model.
- `app.js`: UI, swipe gestures, saved designs (localStorage), downloads (zip built in the browser).
- Claude's output is validated and clipped in `gen.js` (`applyDir`); anything malformed is ignored and the rules fill in.

## Deploying on the static site (oricohendesign.com/swipe/)

The static page can't hold API keys, so the two calls (`/api/brand` for Claude, `/api/photo` for Pexels) go to a small Cloudflare Worker (free plan):

```sh
cd swipe/worker
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put PEXELS_API_KEY
npx wrangler deploy            # prints https://matchmark-api.<you>.workers.dev
```

Then put that URL in `swipe/config.js` (`window.MATCHMARK_API = "https://matchmark-api.<you>.workers.dev"`) and merge. `ALLOWED_ORIGINS` in `worker/wrangler.toml` limits which sites may call it. `api.mjs` is shared by the Worker and `server.js`.

Photos: each direction gets a search phrase from Claude, `/api/photo` returns one Pexels result, the site shows it with a credit line, and the downloaded kit contains the image as `images/hero.jpg`.
