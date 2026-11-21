# Icon system — spot illustrations, an exploration, 20 November 2026

**Not a handoff.** Nothing here supersedes a board, a cut, `Icon.tsx` or
`tokens.ts`. It is the working board for the app's illustrations: one way of
drawing them, taken from the chip stack on the start card the owner liked.

Open `Icon System.html` in a browser. Self-contained apart from Google Fonts.

## What it says

- Two families. **Glyphs** (`Icon.tsx`, line, one colour) stay as they are and
  do actions and labels. **Spots** (full colour, 32–96 pt) name places and games:
  the start card, home's tiles, the Poker tools tiles, each booster.
- Spots are objects off the table only, in one projection (flat circles at
  0.34), three materials (ink, felt red, bone) plus fire for flames and sparks
  only, no outlines, flat fills, light from the upper left. Every chip has eight
  edge inserts, each as wide as the gap. Below 44 pt the fine detail drops.
- Kept: the chip stack and the bomb pot. Two candidates each for the three the
  owner liked least — Sessions, Poker tools, Stand-up game — with a pick marked.

## Open (owner)

1. A or B for Sessions, Poker tools and the Stand-up game.
2. The chip stack and bomb pot are redrawn from a screenshot: the originals are
   not in the repository. Send them and these two get matched to them.
3. Whether spots replace the glyph rounds on home's tiles (N6, 25 October).

## Where it ended, 21 November

Sixteen rounds of review on the published board. All fifteen places have an
approved drawing (`PICK` in `build.mjs`); Sessions is calendar T. The board
opens on the screens they land on, drawn in **Fresh Deck**, the owner's locked
direction from the round-two style page (claude.ai artifact
8V2pTt3a9mNXwrdMZ8TJ3F), with the drawings in that UI's ink and red
(`PALETTES.freshDeck`). Nothing is in the app yet.

## Files

- `measure.mjs` → `bboxes.json` — each drawing's measured outline, so a
  placement can size and anchor the object instead of its square box. Re-run
  it (needs Playwright) after changing a drawing.
- `ink.mjs` → `ink.json` — how much of its square each drawing paints
  (shadow left out). The size rule in `fresh-deck.mjs` (`sizeFor`) holds the
  painted area at a share of the tile: 0.35 of its side on Home, 0.27 on
  Poker tools. Re-run after changing a drawing.
- `fresh-deck.mjs` — the four affected screens (Main menu, Poker tools, Game
  boosters, a booster's sheet) in Fresh Deck, scoped under `.fd`.

- `art.mjs` — the primitives (chip, stack, standing chip, card, bomb, flame)
  and every spot as a composition of them. The system lives here.
- `review.js` — the Approve / Needs work buttons and comment boxes on the
  published copy (https://claude.ai/artifact/EQeYt7hcvCcgj8RcuqLJya). Verdicts
  are saved to that artifact's database, collection `reviews`, one document per
  spot key plus `general`: `{ status: 'approved' | 'changes' | '', comment }`.
- `build.mjs` — writes `Icon System.html` from `art.mjs` (`--artifact <path>`
  also writes the published copy, with the review controls); the boosters list
  reads its names and summaries from `packages/core/src/boosters.ts`.
  `node design/explorations/icon-system/build.mjs`
