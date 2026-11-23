# Randomiser: design first, 23 November 2026

**Not a handoff, and not in the app.** This is the owner's request of 23 November:
a randomiser with three uses, drawn in the approved look (`../full-board/`)
for approval before any code is written.

> 1. Call or fold: call, fold
> 2. My move: call, fold, raise, all-in
> 3. Bomb pot (multiplier): the variants should be added by user (and saved)

## Files

- `screens.mjs`: nine phones made with `../full-board/kit.mjs`, in the full board's screen-entry
  format (`id`, `route`, `nav`, `note`, `flags`), so they can move onto the
  full board unchanged once approved. It also holds the draft tile drawing
  (`SPOTS.randomiser`, a tossed red chip).
- `build.mjs`: writes `index.html` with a working phone to try at the top, every state in
  light and dark, then what is decided and what is open.

```bash
node design/explorations/randomiser/build.mjs
node design/explorations/full-board/preview.mjs design/explorations/randomiser/screens.mjs out.png
```

## What the draft decides

- **Poker tools, fourth tile**, in the empty half of the second row. Tonight's
  Poker tools sheet uses `ToolTiles` too, so it gets the tile without extra work.
- **`/randomiser` is a push** (Chrome A). You stay on it while the hand plays, so
  it is a place. Nothing is confirmed on it.
- **Three decks on a segmented control**: Call or fold, My move, Bomb pot. It
  opens on the last deck used.
- **The answer is a playing card.** It is face down until **Deal**, the bar. The
  card turns over on the answer and that answer's chip below lights up. Each
  answer has its own suit: Call clubs, Fold spades, Raise diamonds, All in hearts.
  Raise and All in are red because they put chips in. A bomb-pot size is a
  diamond, the mark Boosters gives Bigger pots.
- **Fair.** The screen shows "1 in N each". The draw uses rejection sampling
  on the secure random source. Every deal is independent.
- **Bomb pot sizes are multiples of the big blind** (the Bomb pot booster
  gives the ante that way). They are edited on the `/bomb-pot-sizes` sheet,
  which ends in Save. Sizes are whole numbers from 1 to 20 with no repeats,
  and Deal needs at least two.
- **Motion:** turn face down, a highlight runs along the chips and slows down, then the
  card turns over on the answer. It takes about a second, with light haptics on each step. Under
  reduced motion the card just turns over.

## Open, for the owner

1. **Where the sizes are saved.** The draft keeps them on the phone. Saving them
   with the group would let every phone deal from one list, but needs a server
   change.
2. Should Call or fold and My move be editable too? (They are drawn as fixed.)
3. Weights (All in rarer than Fold, or ×5 rarer than ×2)? Not drawn.
4. From Tonight, should the bomb-pot card show the amount at tonight's blinds
   (`$30 each at $5 / $10`)? Drawn as an option. That would make this the one
   tool that reads the night. Only the blinds, via `packages/core`.
5. Half sizes (×1.5) or named sizes? Not drawn.
6. The tile drawing is a draft and needs a pass on the icon board.
7. **Every string is new.** None of it comes from a handoff. Each one is flagged under its phone.
