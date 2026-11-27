# Who wins, and Side pots: design first, 26 November 2026

**Not a handoff, and not in the app.** The owner's request of 26 November, two
new poker tools drawn in the approved look (`../full-board/`) for approval
before any app code is written:

> a new board with the new feature: which hand wins, based on the poker
> calculator. A similar interface, while the user enters hole cards and
> community cards and the app tells who is the winner, without the
> probabilities: at the current stage, who has the better hand, what combo it
> is and their 5-card hand.
>
> and a second feature, the pots calculator, for multi-way all-in situations.
> The user enters stack amounts as well as the hands and cards.

## Files

- `engine.ts`: `packages/core`'s own functions (`evaluate`, `nameHand`,
  `bestFive`, `decidingKicker`, `sidePots`, `allocate`) and the two small
  compositions the screens need: `standings()` (who is best on the cards so
  far) and `allInPots()` (the pots, who takes each, the uncalled layer, every
  seat's change). **This is what moves into `packages/core`, with tests, once
  approved.** One piece of it is new ranking: two hole cards before the flop,
  because `evaluate()` starts at five cards.
- `load.mjs`: bundles `engine.ts` with esbuild, for the build and for the page.
- `draw.mjs`: the two screens as functions of a table (seats, board, what is
  selected). No imports, so the page inlines it: the live phone and the twelve
  drawn phones run the same drawing over the same engine.
- `screens.mjs`: twelve phones in the full board's entry format (`id`, `route`,
  `nav`, `note`, `flags`), so they can move onto the full board unchanged. It
  also holds the two draft tile drawings (`SPOTS.whoWins`, `SPOTS.sidePots`).
- `build.mjs`: writes `index.html`: a live phone, every state in light and
  dark, then what is decided and what is open.

```bash
npm ci   # once: esbuild comes from the root lockfile
node design/explorations/who-wins-and-pots/build.mjs
node design/explorations/full-board/preview.mjs design/explorations/who-wins-and-pots/screens.mjs out.png
```

No figure or hand name on the board is typed in: every one is what the engine
says about those cards and stacks.

## What the draft decides

- **Two tools on Poker tools**, `/who-wins` and `/side-pots`, both pushes:
  places you stay in while the hand plays out, nothing to confirm.
- **The calculator's table**: same board, seats, deck keyboard, Add a player,
  New hand; a seat counts once both its cards are in.
- **Who wins answers on the ink**: Ahead / Tied before the river, Winner /
  Split on it, with the street, the winning hole cards and the hand. No
  percentages.
- **Results name hands, not seats** (owner, 26 November): the ink, each pot,
  a split and the uncalled chips show the hand as its two cards, never
  Opponent 1, 2…; seat labels stay on the seats.
- **The best five, always**, from the flop: making cards full, kickers faded,
  a deciding kicker not faded and named (`Pair of aces · king kicker`).
- **Side pots: the stack sits in the seat**, typed on the calculator's keypad
  with Done on the bar. Everyone is all in for their stack.
- **Hands first, then pots** (owner, 26 November): under the seats, every hand
  ranked 1st, 2nd, 3rd…, with its combo, the pots it takes, the amount and its
  change; "As it stands" before the river. Pot by pot follows as detail, with
  the Uncalled layer that goes back.

## Open, for the owner

1. Two tools, or three modes of one calculator (Odds · Who wins · Pots) that
   keep the cards when you switch? Drawn as two tools, as the request named two.
2. Before the flop: is "ahead" right with two cards? It also needs a small
   addition to `packages/core`.
3. Folded chips (blinds, calls then folds) are not modelled. Simplest: one
   "Already in the pot" figure added to the main pot.
4. The odd chip in a split goes to the first seat in order; tables usually give
   it left of the button, which the tool does not know.
5. "Stack", or "All in for"?
6. Both tile drawings are drafts and need the icon board.
7. **Every new string is flagged** under its phone.
