# August 2026 room reactions

The August 21 chat attachments are connected to the current room scans. Object
locations were matched against Nana's reference screenshots, then selected with
camera-and-polygon lassos. The existing TV selection is retained.

| Room | Object | Response | Chat attachment numbers |
| --- | --- | --- | --- |
| 2 — SUZUNE | Gun held over the pink skirt | Gun-shot MP3 | 87–88 |
| 2 — SUZUNE | TV | Strawberry-cake video window | 89–90 |
| 2 — SUZUNE | Blue anime slippers | Window containing the supplied eBay link | 91 |
| 2 — SUZUNE | Clock above TV | Japanese-clock MP3 | 92–93 |
| 2 — SUZUNE | Hanging clothes | Sue's Beauty Room in a new browser tab | 94 |
| 2 — SUZUNE | Curtains beside the TV | Supplied text image | 96–97 |
| 3 — AIKO | White drawers beneath the desk | Message image, animated GIF and MP3 together | 100–106 |
| 3 — AIKO | Nail-polish bottles on the beige cabinet | Two pictures and supplied sparkle GIFs on hover; Dazzling Nails on click | 107–120 |
| 3 — AIKO | Patterned bag beneath the desk | Three animated stickers over/around the bag, plus Mercari-link window | 128–134 |
| 3 — AIKO | Barilla package above the window, beside the stereo | Carbonara recipe image | 67, 70 |
| 4 — MOENE | Drawing paper on the desk | Pen GIF and drawing-tech MP3 together | 74–76 |

The first batch's nail polish and drawers are covered by their later, explicit
responses. The portrait screenshot in that batch has no separate response supplied
in the chat. Attachment 68 is already present as the site's `sparkle_h.gif`.

## Data and media

Published selections live in `public/hotspots/room-2.json`, `room-3.json`, and
`room-4.json`. Media lives in `public/reactions/august-2026/`. The MOV was converted
to an H.264/AAC MP4 with fast-start metadata; all other response files retain their
original formats.

Existing `type`/`value` responses still work. Optional fields support the supplied
combinations: `audio`, `images`, `gifs`, and `surfaceGifs` on a click response;
`images` and `sparkles` on a hover response. `openInNewTab: true` launches a link
directly from the object click. Numuki blocks embedding, so both games use this.
Shopping links open draggable room windows containing an external link.

To refine a selection, visit `?edit=1#room-N`, press E, and edit its lasso. Export
the room JSON to publish it; editor changes stay local until the exported file is
placed in `public/hotspots/`. Preserve the extra response fields when editing JSON.

## Verification

- `node --test tests/room-reactions.test.js` checks combined-response behavior,
  media availability, required objects and camera/polygon data.
- `npx vite build --logLevel error` checks the production build.
- Browser checks covered all 11 object selections, the video playing, both game
  destinations opening in separate tabs, the combined drawer popup, the recipe,
  custom nail hover images/sparkles, bag stickers, and shopping popup controls at
  desktop and 390 × 844 viewport sizes.
