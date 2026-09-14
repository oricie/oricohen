# Design versions

Each numbered version is a complete stylesheet in `themes/`. The switcher
in the nav flips between them and remembers the choice per visitor.

| Version | Description |
| ------- | ----------- |
| `01`    | Sans-only, grey scale, left-aligned, hairline rules, wide rounded banner. |

## Adding a version

1. Copy the closest existing version: `cp themes/01.css themes/02.css`
2. Edit it — `styles.css` (reset, banner, switcher chrome) stays shared.
3. Add the number to `VERSIONS` in `theme.js`, and to the table above.

`LATEST` in `theme.js` is what a first-time visitor sees; it defaults to the
last entry in the list.
