# Headers and backgrounds across the app — an exploration, 22 November 2026

**Not a handoff.** Nothing here supersedes a board, a cut or `tokens.ts`, and
nothing here is in the app.

The header is decided (N on the Rail, `../screen-headers/`). This page puts
what is still open about the surfaces behind it in front of the owner, on the
four approved screens (Main menu, Tonight, Game boosters, Post-game results):

1. **Light** — the ground, the cards and the rail: A as approved, B a lighter
   ground, C white ground with grey cards, D a wash under the rail.
2. **Dark** — Fresh Deck was only drawn light: A ink, B the app's current
   near-black, C the rail lit and the cards low. The drawings take their dark
   palette and the primary buttons turn light.
3. **When a list scrolls** — the rail scrolls away, slims to a bar, or stays.

4. **Outside the system** (added later the same day, shown first on the page) —
   the three groups above keep one layout and move its colours; these five
   change what the header, the ground and the footer *are*: A ink top with a
   white sheet, B felt, C paper (no panels, no cards, an ink bar at the foot),
   D frosted bars over a coloured ground, E the header band's colour says the
   state (green live, ink settled). `BEYOND` in `build.mjs`.

Each option is the same phones with a few colour rules laid over them
(`themeCSS` in `build.mjs`), in its own shadow root.

## Build

`node design/explorations/app-surfaces/build.mjs [--artifact <path>]` (needs
Playwright). `index.html` is the static page; `--artifact` writes the published
copy with the icon board's review controls (verdicts in that artifact's db,
collection `reviews`, one document per option key).
