# images

One naming scheme, grouped by where each shot is used:

| File | Where |
| ---- | ----- |
| `portrait.png` | The banner photo. Its ratio drives the banner's `aspect-ratio`. |
| `jedox-01-financial-review.png` | Jedox card face |
| `jedox-02-home.png` … `jedox-04-integrator.png` | Jedox sheet, in order |
| `signavio-01-process-insights.png` | SAP Signavio card face |
| `signavio-02-hub.png` … `signavio-05-inbox.png` | Signavio sheet, in order |

Replacing a shot: keep the filename and the order holds. Adding one: use
the next number in that project's run and add a `<figure class="sheet-shot">`
inside the card's `<template>` in `index.html`.

Screenshots are used at their own proportions — full width of the frame,
cropped at the bottom on a card, whole inside a sheet.
