# Handoff · Game settings · cut 10 September 2026

**O1 New session**, redrawn, and the sheet behind it. It supersedes rev 18 and
Journey Map 1's `O1 New session` **on that screen and nothing else** — O2 Add
players, O4 Money rules, O5 Rule editor and every other screen in the app are
untouched.

- `boards/Game Settings.dc.html` — the three frames that were built:
  **O1c-2 New session · seated**, **O1c-3 New session · typing an amount**, and
  **O1d Game details**. This file is the authority on every dimension, weight
  and colour here.
- `boards/Game Settings Explorations.dc.html` — the decision record. Turn 1's
  three takes on the settings block (`1a` the game as one card, `1b` tiles,
  `1c` settings collapse and seating leads) and turn 2's three developed frames
  with the designer's notes above each. **`1c` is the one that was built**;
  `1a` and `1b` are recorded exploration and are explicitly not to be built.

## The screen, in four lines

- **The settings collapse to one reviewable line.** `₾5 / ₾5 · ₾500 in · GEL`
  over `Kitchen & drinks, piggy bank 5%, rounded to 10`, with a *Change* pill
  at the right. They are inherited from last time and rarely move; five tall
  list rows spent the top half of the sheet saying so.
- **The seating is the body.** One row per seated player — monogram, name, the
  difference from the standard under it, the figure with a dashed underline —
  and the rest of the group underneath as a two-column grid of one-tap adds,
  ending in a dashed *Someone new*.
- **Tapping a figure opens it in place.** The row takes a white border, the
  amount becomes a field, the primary is replaced by an accessory bar carrying
  the running total and *Done*, and the count moves into the header.
- **The foot states the table.** `₾1,800 on the table` over
  `Open the table · 3 seated`.

**O1d Game details** is what *Change* opens: one card for the money — stakes and
buy-in as typed fields, currency as a pick, rounding as a row of steps — one
card for the money rules, each with its switch, and *Save details*.

## What it changes that was decided the other way

- **The four settings sheets are gone**, folded into O1d's card: Stakes,
  Default buy-in, Rounding and Money rules were each a step of their own,
  reached by a tap and left by a Save. Only the currency still opens a list,
  because it is the only one of the four with a hundred and fifty-six answers.
- **Both truncating sub-lines are fixed.** The *Money rules* row ended in an
  ellipsis halfway through the second rule's name and the *Rounding* row's
  explanation was cut at the width of the sheet. Both are full lines now.
  `docs/bugs.md` B70.
- **The primary says the seat count, not the clock.** `Open the table · 3
  seated` replaces `Open the table · 20:05`, which the 29 August decision put
  there. Nothing about the stamp changed — the night is still stamped with the
  clock at the moment the table opens.
- **`Find a player` is gone**, and the roster it opened is on this screen.
  *Someone new* is what is left of that door: search a long roster, or create
  somebody who is not on it.

## Where this app departs from the boards, deliberately

All four are recorded in `docs/screens.md` with the argument in full.

- **Four rounding steps, not six.** O1d draws `1 5 10 50 100 1000`;
  `RoundingMode` has no 5, and `thousands` and `cents` are carried for stored
  nights but deliberately not offered. The row is the four the engine can
  actually settle at.
- **A straddle row on the money card.** O1d draws the stakes as two figures and
  stops; the straddle is in the data model, is stamped onto the night, and had a
  screen until this cut folded that screen into the card. It takes the shape of
  the rounding row above it, which is drawn.
- **`Type the amount they are putting in`.** O1c-2 writes *she* of the one
  player it draws. Nothing in this app knows a player's pronoun.
- **An empty table has words for itself.** O1c-2 is drawn with three people
  seated and has no empty state; with nobody seated the two headings would be a
  heading over nothing and a heading calling the whole group "the rest".

## Numbering

The frames are `O1c-2`, `O1c-3` and `O1d`, which continue rev 18's `O1`. They do
not collide with anything: `design/handoff-count-up-header/` renumbered `S108`
–`S114` on top of rev 18's own and has to be cited by date, and this one does
not.
