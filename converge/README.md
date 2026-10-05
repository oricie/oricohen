# Converge

An AI product-design tool for complex digital products (ERP, CRM, planning, BI, developer tools, admin platforms).

You describe the product. Converge shows complete **product directions** (navigation, home, workflow, data table, detail, charts, settings), you swipe, and your reactions are the design input. The taste model learns deeper preferences than style: density, data-first vs workflow-first, navigation model, configuration vs opinion, power, automation. The next direction is synthesised from what it has learned, and after 5 to 8 reactions it converges on **your product**: a clickable prototype, information architecture, flows, tokens and a spec.

Open `index.html` through any static server. No build step, no dependencies.

## How it works

- `domain.js`: content packs for finance/planning, ERP, CRM, BI, developer tools, admin, and a generic fallback. Realistic mocked data, deterministic.
- `model.js`: 8 taste axes. Each direction is a point on them. A reaction moves the estimate of the user's position on every axis in proportion to how strongly the direction expressed it, with a confidence per axis. The next direction leans into confident axes and probes the least certain ones. Naming and theme come from the nearest of 8 archetypes.
- `render.js`: turns a direction into a full 1280x800 product UI. The layout depends on the axes (sidebar, icon rail, top tabs or command bar; chart-, workflow- or table-first home; drawer or page detail; guided wizard or workspace; assistant-led or explicit approvals; deep settings or opinionated presets), not only on colour. Screens are clickable.
- `app.js`: the flow (brief, directions, swipe, convergence, result), the taste panel, history, refine, and exports (spec, tokens CSS, Figma tokens JSON).

The directions are mocked. The model and renderer are the real parts. A generation backend can replace `domain.js` content packs and `blurb` copy without changing the flow.
