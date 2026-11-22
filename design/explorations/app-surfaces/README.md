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

4. **Outside the system** (same day) — five approaches that changed what the
   header, the ground and the footer *are*. The owner reviewed them
   (collection `reviews`, keys `beyond-*`):
   - Ink top, white sheet: **headers liked**; the grey fills under the content
     are not; wants a dark theme.
   - Felt: hidden. Frosted bars: too playful for live players.
   - Paper: the ink bar at the foot is worth exploring on more screens; the
     rule under the title is not liked.
   - The header says the state: no green — stereotypical casino, old-fashioned.
5. **Round two** (shown first on the page), built from those notes: the ink
   header on everything, then *Under the content* (A1 plain rows, A2 outlined
   cards, A3 lifted cards), the same three in the dark, and *The ink bar at
   the foot* (F1 square, F2 rounded like the sheet, F3 the bar is the button)
   on six screens. Count up and Settle up are sketches for the footer only:
   titles, step labels and button words are the app's, the bodies are not
   (the Settle up transfers are illustrative, not the engine's).
   `UNDER`, `UNDER_DARK`, `FOOT` in `build.mjs`. The five from 4 are no longer
   on the page.
6. **Round three** (shown first): the owner on A3 — *"this one looks pretty
   good. can we compare diff 'intensity' of shades?"* — read as the strength of
   the cards' shadow. Four steps, L1 whisper to L4 deep; L2 is A3 as reviewed.
   `SHADES` in `build.mjs`. The dark and footer groups have no verdict yet.
7. **Approved, 22 November: L2** — ink top, white sheet, white cards on the
   soft shadow (`LIFT`). The page now shows that as decided, with two things
   open: the dark version (raised cards, one option) and the footer (F0 as it
   stands, F1–F3 the ink bar), both redrawn on the approved body. A1, A2, the
   other shadow strengths and the two other dark bodies are off the page.

Each option is the same phones with a few colour rules laid over them
(`themeCSS` in `build.mjs`), in its own shadow root.

## Build

`node design/explorations/app-surfaces/build.mjs [--artifact <path>]` (needs
Playwright). `index.html` is the static page; `--artifact` writes the published
copy with the icon board's review controls (verdicts in that artifact's db,
collection `reviews`, one document per option key).
