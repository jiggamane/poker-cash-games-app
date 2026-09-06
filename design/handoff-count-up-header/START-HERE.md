# Handoff · Count up, the header block · cut 6 September 2026

The block at the top of **E2 Count up**, rebuilt. It supersedes rev 18 and
`design/handoff-E2/`'s layout **2a** **on that block and nothing else** — the
rounding row under it, the three groups, the player list's type scale, the
`Next` action and every other screen in the settle flow are untouched.

- `README.md` — the written handoff, verbatim as delivered. It is the authority
  on every dimension, colour and timing here.
- `reference/Count Up Header.dc.html` — three explorations side by side.
  **Build `1b`, the middle column**; `1a` and `1c` are recorded exploration and
  are explicitly not to be built. `1b`'s first frame is interactive — tapping
  `Count ₾3,900` runs the whole landing sequence.
- `screenshots/1b-all-states.png` — the four `1b` frames as rendered.

## The block, in three lines

- **The gap is the headline.** `+₾1,000` at `800`, fluid from 38 points down to
  a 24 floor, with the percentage accounted for right-aligned beside it. Both in
  the state colour.
- **A two-segment bar, drawn to the real scale** — each segment flexed by its
  own raw amount, not by a percentage worked out first.
- **The two sums stay in full underneath**, at `700 18px` on rows of their own,
  where the caption compresses and the amount never does.

Three states, off `accounted_for − bought_in`: over and short coral, level green.
No eyebrow, no verdict strip, no buy-in or rebuy counts.

## What it changes that was decided the other way

- **The two-column card is retired.** Two sums at display size in half a card
  each truncated any five-figure lari figure — `₾47,0…`, which is the screen's
  one job. `docs/bugs.md` B43.
- **`₾1,000 OVER · 102% accounted for` is gone**, and so is the `OVER` /
  `BALANCED` eyebrow above the figure. `ui-audit.mjs` required
  `LEFT TO ACCOUNT FOR` and no longer does.
- **Counted and cashed-out players are one figure** — `Accounted for · 8
  counted`, never `6 counted, 2 out`.
- **The Counted group ranks by net, descending.** Already true here since
  5 September; this cut is the design agreeing with it.
- **Counting a stack animates** — the row travels into its rank slot, the rows
  below FLIP down, and the arrived row holds a green wash. Timings in the
  README's table.

## Where this app deviates, deliberately

Both are recorded in `docs/screens.md` with the argument in full.

- **`In play · 8 players`, not `Bought in · 8 players`.** One word for that
  figure app-wide was the owner's instruction of 5 September, a day before this
  cut, and it is about Tonight, E2 and E6 together rather than about this block.
- **A fourth state, amber**, for a count that is not finished but whose figures
  happen to meet. The cut's three states are driven by the subtraction alone,
  and green there would be calling a night level while a stack is still
  uncounted — which is B22, from the other side.

## Numbering

This cut calls itself **rev 18** and numbers its changes **S108–S114**. The
repository's rev 18 (19 August, `design/handoff-rev18/`) already used S108–S113
for the flow-logic board and the test-round cut. Same numbers, different
changes: cite them as *"the 6 September cut, S1xx"* rather than by number alone.
`design/handoff-rev18/docs/CHANGELOG.md` carries the entry with the collision
marked.
