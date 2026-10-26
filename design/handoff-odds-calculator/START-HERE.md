# Handoff · Odds calculator · 24 October 2026

**A screen no board ever drew.** `/odds`, pushed from Settings under *Rules &
rulings*: the classic web hold'em calculator — win and tie per hand, over every
board that can still come — rebuilt inside the app. It was built from a
description of CardPlayer's page and the owner's instructions, not from a
design, so **everything on it is the engineer's and open to being redrawn**,
apart from the short list under *Keep* below.

This is the handoff **out** to Claude Design and the instructions for the
handoff **back**. Nothing here supersedes rev 18 or any cut on any other screen.

**Read `decided-2026-10-25.md` first.** It is everything the owner settled on
the canvas on 24 and 25 October, with the logic and the navigation, and twenty
renders of the decided boards in `boards/`. Where it and this file disagree, it
wins; the sections below dated 24 and 25 October are the build's own record of
the same decisions.

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
- Wording: the title, *Players*, *Board*, *Dead cards*, *Win*, *Tie*, and the five
  status-line states.

## What the checks hold, so a return can be built without breaking them

If the design changes any of these, the matching check changes with it in the
same commit — say so on the canvas and it will be done, but do not assume it.

- **`scripts/ui-odds.mjs`** plays 36 tables through the built screen by *name*:
  every card place is a button named `Player 3, card 2, empty` /
  `Board, card 4, 7♦` / `Next dead card, empty`; the deck's cards are `A♠`…`2♣`
  (`, dealt` appended once used); the controls are `Add a player` and
  `New hand` (now the restart icon at the right end of the status line). A redesign that renames or merges these needs the driver edited.
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
| Pot odds: the card and the function | `apps/mobile/src/components/PotOddsCard.tsx`, `packages/core/src/odds/potOdds.ts` |
| Tokens | `apps/mobile/src/design/tokens.ts` (shared: change one only alone) |
| The screen check and its tables | `scripts/ui-odds.mjs`, `scripts/odds-ui-cases.ts`, `scripts/odds-pot-cases.ts` |
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

## Decided on 24 October

Taken on the canvas by the owner, built the same day. **These win over anything
above that says otherwise.** The canvas's note "BUILD INSTRUCTIONS" is the same
list.

1. **The hint under the deck is removed.** Nothing now says that tapping a dealt
   card takes it back; open.
2. **New hand is a 34 pt round icon** (circular arrow, 18 pt glyph, stroke 2, the
   back button's fill) at the **right end of the status line** via `Screen`'s
   `metaTrailing` — not in the top-right corner, which a pushed screen keeps empty
   (`docs/09-navigation.md`). Named *New hand*; it clears every card and keeps the
   seats.
3. **Card entry is option D:** the 4 × 13 deck as built; **pressing a live card
   shows an enlarged ivory copy**, 58 × 80 pt (rank 32/800, pip 26), above the
   pressed cell with a 14 pt stem and a soft shadow, the pressed cell ringed 2 pt
   in the text colour. It appears on press-in and goes on release, or when the
   finger leaves the cell (on a phone; in a browser it goes on release); releasing
   on the cell deals it as before, so a tap is one tap. A dealt cell shows none. It
   stays 8 pt inside the screen on the A and 2 columns and takes no touches.
4. **The status line's logic**, the first of these that is true, written in code
   in `apps/mobile/src/lib/oddsStatus.ts` and held by its test:
   1. a seat holds exactly one card → `Player N needs a second card`, N the lowest
      such seat — this wins over everything, and nothing is counted or shown for
      the other seats while it is true (B102);
   2. a result for this exact table → `1,712,304 boards dealt · exact`, commas
      grouped, `1 board dealt · exact` when it is one;
   3. counting → `Calculating · NN%`, a whole number;
   4. two or more full hands the engine will not take (dead cards left too few for
      the board) → `Not enough cards left in the deck to finish the board.`;
   5. otherwise, fewer than two full hands → `Texas hold’em · deal two hands`.
5. **Not built:** the share feature (icon, sheet and card) while its design is
   settled, and options B, C, E and F for card entry. They are drawn on the canvas.
   **The share icon is hidden for now** (the owner, 25 October): the sharing feature
   is parked until it is finished, so nothing for it shows on the status line.
   **The run-out's one-card summary (picture 19) IS built**, 25 October, as
   `/run-out` behind a *Run it out* button under the board — every street counted
   exactly, pre-flop included (`decided-2026-10-25.md` § 8, `docs/screens.md`).

**Open:** beside the icon the status line has about 270 pt at 402 wide, so state 4
is cut with an ellipsis. It needs shorter copy or a second line.

## Pot odds, decided 24 October, permanent from 25 October

Taken on the canvas on 24 October as an experiment behind a switch; on 25 October
the owner made it permanent ("not an experiment anymore, use it on odds calc
screens in all states where it applies"). **There is no setting and no
*Experiment* label.**

1. **When it shows:** on the **flop and the turn**, while an exact result is on
   screen and Player 1 is in the hand. Not before the flop, not on the river, not
   with Player 1 out, not with no result.
2. **What it is:** under the players, *POT ODDS*, a closed row, opened in place to
   *Pot* and *To call* typed on the app's keypad (with a *Done*), *Needs* and *You
   have*, a bar with a break-even marker, `Over many runs this call returns +$16`,
   and the formula line ending *Side pots are not counted.*
3. **Player 1 is "you"**, with a *You* tag on the players list while the card is
   showing.
4. **No "call" or "fold" wording, no side pots.**
5. **The arithmetic is `potOdds()` in `packages/core/src/odds/potOdds.ts`**, tested;
   the screen adds up nothing.
6. **Departures from the board:** whole units, no cents (`+$16` for the board's
   `+$15.91`, rounded half away from zero); the loss case is not drawn (it reads
   `returns −$35` in the loss colour); *Done*, the *—* before a call is typed and
   the *You* tag on the list are not drawn. See `docs/screens.md`.

The names the check drives: the buttons `Pot
odds, closed` / `Pot odds, open`, `Pot, $75`, `To call, $25`, the keypad's digits
and `Done`; the card `#pot-odds` and its lines `#pot-odds-returns` and
`#pot-odds-formula`. Rename any of them and `scripts/ui-odds.mjs` changes with it.

## Player card layout, decided 25 October

The owner's "layout G" (canvas red note "main-layout"; boards `Turn-outs`, `Outs-G`) is the
main layout, built the same day.

1. **Every player is a card** — `surface`, radius 14 — holding the hand, the name with its
   word (*Favourite*, *Underdog*, *Too close*; *Winner* and *Beaten* on the river) and *Win* and
   *Tie*. The *Win* figure and the word take the colour; *Tie* stays neutral.
2. **The colour rule** was decided on 24 October and is built now: a hand's equity minus the best
   other hand's equity; 8 points or more is green or red, inside 8 is amber for every hand in
   the band; pale at 8, full at 70. Dark and light values are in `src/lib/oddsTone.ts`. The light
   green starts at 33%, as the canvas's build note says. An exception to "red and green mean
   money", written in `tokens.ts`; the word always goes with the colour.
3. **The outs control** is for a hand that is chasing — *Underdog* or *Too close* — with exactly
   four cards of board and at least one card that wins it. A round chevron on the card; closed it
   names the kinds (no numbers), open it is the fanned table. The favourite has none.
4. **The flop is not built**: two cards to come, nothing drawn.
5. **Where the code is:** `packages/core/src/odds/outs.ts` and `standing.ts` (with `outs.test.ts`),
   `src/lib/oddsTone.ts`, `src/components/OutsBlock.tsx` and `PlayingCard.tsx`,
   `apps/mobile/app/odds.tsx`. The scenarios are `scripts/odds-outs-cases.ts`.
6. **A straight flush is a flush, unless only a straight flush wins** (the owner, 25 October).
   For A♥K♥ on Q♥ J♥ 3♠ 7♣ the group is *Flush 9*, the ten of hearts among them although it
   makes the royal, because a flush alone would have won. Where a flush would not win — against
   a full house or quads — the group reads *Straight flush*. The canvas's *Flush 9* was right.

The names the check drives: `Outs for Player N` (the chevron, with `aria-expanded`), the card
`#seat-N`, the word `#seat-N-word`, `#outs-names-N`, `#outs-table-N` and the rows
`#outs-row-N-<category>`, each fanned card an image labelled `T♥`. Rename any of them and
`scripts/ui-odds.mjs` changes with it.

## The river, decided 26 October

Four decisions the owner took on the canvas (the minimal river frame and the new
`River` board, picture 21 of `decided-2026-10-25.md`), built the same day.

1. **Whole numbers on a settled board.** On the river every figure is whole:
   `100%` / `0%`, `50%` / `50%` on a chop, `Tie 0%`. Every other street keeps two
   decimals. One `pct` in `odds.tsx`.
2. **The hand, named**, under the figures: *Pair of kings*, *Flush, ace high*,
   *Royal flush*, with a kicker only where it decided the pot — *Pair of aces ·
   king kicker* against *Pair of aces · queen kicker*. `nameHand()`,
   `decidingKicker()` and `riverHands()` in `packages/core/src/odds/hand.ts`,
   off `evaluate()`'s own packing.
3. **The five cards behind the chevron.** On the river the chevron is on every
   hand (*Hand for Player N*) and opens the five cards that make it, 27 × 38,
   the making cards first (`bestFive()`, `HandCard`). No outs chips there.
4. **The river state of the screen:** the fifth card dealt, `1 board dealt ·
   exact`, *Winner* / *Beaten*, and no pot odds row.

**Flagged:** the plural of two is *deuces* (the run-out's wording in
`showdown.ts`; the brief preferred *twos* — one array to change); a chop reads
*Too close* on both cards and wants a word; the chevron's label and the five
cards' spoken names are not drawn. The scenarios are `scripts/odds-river-cases.ts`
(`ui-odds.mjs --river`); the names the check drives are `Hand for Player N`,
`#hand-name-N` and `#hand-five-N`.
