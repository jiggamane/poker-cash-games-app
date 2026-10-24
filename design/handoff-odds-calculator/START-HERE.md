# Handoff · Odds calculator · 24 October 2026

**A screen no board ever drew.** `/odds`, pushed from Settings under *Rules &
rulings*: the classic web hold'em calculator — win and tie per hand, over every
board that can still come — rebuilt inside the app. It was built from a
description of CardPlayer's page and the owner's instructions, not from a
design, so **everything on it is the engineer's and open to being redrawn**,
apart from the short list under *Keep* below.

This is the handoff **out** to Claude Design and the instructions for the
handoff **back**. Nothing here supersedes rev 18 or any cut on any other screen.

- **The canvas** (private to the owner's account; the link is in the chat that
  made this file, and the owner has it): six artboards at the house frame,
  402 × 874, drawn from the built screen's own measurements — one per state, plus
  notes saying what to keep, what is open, and how to return it.
- **`reference/`** — five screenshots of the *built* app (the web build, a
  393-wide phone, Figtree). The canvas is a redraw of these; where they differ,
  the screenshots are what the app does today.

## The six states

| Artboard | State |
|---|---|
| `Main` | Empty table, three seats, the first place outlined |
| `Calculating` | Two hands dealt, a bar per seat where the figures will land |
| `Result` | Aces against kings before the flop: 82.36 / 17.09, a 0.54 split |
| `Flop-3way` | Three hands on Q♦ J♦ T♦; the third has the straight flush draw |
| `Half-dealt` | A seat holding one card: no figures, and the line under the title says why |
| `Light` | `Result` in the light theme |

Not drawn, and wanting it if the design changes: nine seats; the *Not enough
cards left in the deck to finish the board* state; larger text; a long
percentage (`100.00%`) at 360 wide.

## Keep

- **Cards are cards:** ivory stock `#FAF8F3`, black ink `#141416`, red ink
  `#C8102E` for hearts and diamonds, in both themes. These three values are the
  only colours in the app that are not tokens, by the owner's instruction.
- **Red and green mean money, nowhere else**, and there is no brand accent
  (`tokens.ts`). The cards are the one exception above.
- **Dashed means "a place that takes something"**; the solid outline in the text
  colour is the place the next card goes. A dealt card is a flat blank in the
  deck: no edge, no ink.
- **Figures never truncate** at 360–430 wide or at 120% text: a row wraps
  instead. `ui-audit.mjs` fails a screen that cuts one.
- **Pushed, not a sheet:** round back button top-left, *nothing* top-right
  (`docs/09-navigation.md`).
- **Board above the seats; three seats to begin with; one more per tap of *Add a
  player*, up to nine.** The owner's instruction of 24 October.

## Open for design

- The deck: each card is about 25 × 40 pt, and four rows of thirteen is a lot
  to hit with a thumb.
- The seat rows, and how a seat is *removed* — today it cannot be, once added.
- The loading state while the boards are counted (a bar per seat).
- The light theme: ivory on white is faint and may want an edge.
- Whether to show **equity** (share of the pot) beside Win and Tie. The engine
  returns it exactly; the screen does not draw it.
- Wording: the title, *Players*, *Board*, *Dead cards*, *Win*, *Tie*, the hint
  under the deck, and the five status-line states.

## What the checks hold, so a return can be built without breaking them

If the design changes any of these, the matching check changes with it in the
same commit — say so on the canvas and it will be done, but do not assume it.

- **`scripts/ui-odds.mjs`** plays 36 tables through the built screen by *name*:
  every card place is a button named `Player 3, card 2, empty` /
  `Board, card 4, 7♦` / `Next dead card, empty`; the deck's cards are `A♠`…`2♣`
  (`, dealt` appended once used); the controls are `Add a player` and
  `New hand`. A redesign that renames or merges these needs the driver edited.
- **The status line** (`#screen-meta`) is compared word for word with what
  `scripts/odds-ui-cases.ts` expects, including the grouped board count
  (`1,712,304 boards dealt · exact`).
- **The figures** are compared to the digit: two decimals and a `%`, Win then
  Tie per seat in the hand, none for a seat that is not.
- **`ui-audit.mjs`** holds the route to the handoff's rules in both themes at
  393 and 360: the surface ladder, the contrast floor, nothing cut or broken,
  and (B100) the head drawn whole. A block that paints the colour of what is
  behind it is `surface-on-itself`, which is why an empty place is a border and
  not a fill.

## Where the code is

| What | Where |
|---|---|
| The screen | `apps/mobile/app/odds.tsx` |
| The arithmetic — **not for design to touch** | `packages/core/src/odds/` |
| Tokens | `apps/mobile/src/design/tokens.ts` (shared: change one only alone) |
| The screen check and its tables | `scripts/ui-odds.mjs`, `scripts/odds-ui-cases.ts` |
| What was decided and why | `docs/screens.md` § *The odds calculator*, `docs/bugs.md` B100 and B101 |

## Coming back

Either of these is enough:

1. **The canvas.** Edit the artboards, keeping their names, then in Claude Code
   say *update the odds calculator from the canvas* and give the link. It reads
   the canvas, rebuilds `odds.tsx` to match, and runs `npm run check`,
   `npm run check:ui` and `npm run odds:verify` before anything merges.
2. **A folder.** Export it as a handoff into `design/handoff-odds-calculator/`
   (a `boards/` folder of `.dc.html`, like every cut before this one) and say so.

Either way, mark on the canvas which of the *Open* items you took up, and which
you left — an unmarked change reads as a decision nobody made.

## What the app does that the design does not say

All of it is in `docs/screens.md`. The two worth knowing before drawing:

- **The deal moves on by itself the way a dealer's would:** second hole card,
  then each seat on show in turn, then the board, then dead. A seat the reader
  has not added is not dealt to.
- **A seat with one card is not a hand yet** and holds the calculation up, with
  a sentence saying which seat. The odds are for the table the reader has set,
  never a guess at it.
