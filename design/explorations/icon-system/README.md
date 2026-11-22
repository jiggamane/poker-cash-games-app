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
approved drawing (`PICK` in `build.mjs`); Sessions is calendar T, and the Button
game is D (the owner approved C, then moved the approval to D). The Straddle is
L: I mirrored, the same curve with the seats the other way round, asked for in
chat on 21 November (K, a first reading of that, is passed over). Round 26 also
shows it on a straight line (N to Q); the owner approved L and passed those
over. Poker tools is AT: AB's chips with round 24's two framed cards, approved
the same day. The board
opens on the screens they land on, drawn in **Fresh Deck**, the owner's locked
direction from the round-two style page (claude.ai artifact
8V2pTt3a9mNXwrdMZ8TJ3F), with the drawings in that UI's ink and red
(`PALETTES.freshDeck`), and since 21 November under the approved header:
version N of `../screen-headers/titles.html` on the Rail (`railN` in
`fresh-deck.mjs`). Nothing is in the app yet. `fresh-deck-screens.png` is an
earlier still and predates the header.

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

## Round 27, 21 November: the app's other icons

The owner: there are more icons in the app than the fifteen reviewed; find
them, apply the style, review. `Icon.tsx` has 47. Sorted on the board: 6
already have an approved drawing, 12 are drawn in this round (`ui*` in
`art.mjs`: the objects on Tonight, its drawer, the results and the menu bar),
15 objects are not drawn yet, and 10 controls (chevrons, back, close, plus,
check) are proposed to stay line glyphs. **This revisits the rule at the top
of this file** that glyphs stay as they are; it is the owner's call, and
nothing is in the app. On the results the drawings are shown both in colour
and in one grey, since on 20 November the owner asked for that screen's icons
not to be colourful. No verdicts yet.

**22 November.** The owner on the results row: no coloured icons here; simpler
curves and shapes, fewer details, still well designed. The four results icons
are now `MARK` in `art.mjs`: solid one-tone marks on a 24 grid, not spots. The
coloured four are under the earlier rounds. So there are three families now:
spots (places and games), marks (small, beside text), and the line glyphs.

The same day, two more comments (the drawer rows: *make them minimalistic*;
the menu bar: *these should be more simple*): the other eight, and the tools
button, are marks too. The detailed `ui*` drawings are under the earlier
rounds. So small icons beside a label are marks; spots are for tiles, rows of
games and sheets.
