# Handoff · the game end · cut 6 September 2026

The end of the night as three surfaces and one sheet — **1a Settled night**,
**2a Who pays whom**, the **Rounding** sheet — plus the final state of **E2
Count up**, included so the two can be held against each other.

It supersedes rev 18 and the four partial cuts **on those screens and nothing
else**. Tonight, the seat sheets, the rule screens, the deductions entry screen
and every other screen in the app are untouched by it.

- `README.md` — the written handoff, verbatim as delivered. It is the authority
  on every dimension, colour, timing and string here.
- `boards/Game End Screens.dc.html` — 1a, the three status states, 2a, and the
  rounding sheet. Interactive: the toggle swaps the list, the rounding row opens
  the sheet, transfer rows tick off.
- `boards/CountUpEnd.dc.html` — Count up in its final state: the balance card,
  the collapse, the rounding row, the counted list and the row motion.

## The four decisions

- **One ranked list behind a toggle**, not a long scroll. `At the table` is
  `out − in`; `Final` is that less the bill share and the piggy share, plus
  whatever the player fronted at the counter. The rows **re-sort on every mode
  change**, because the figure they are ranked by has changed.
- **The four terms read on one line under the name** — `in` `out` `bill` `piggy`
  — on Final. That line is what replaces the four-column table.
- **Whoever paid a bill gets it back in full, as its own positive term.** Never
  netted into the share: both terms show on the row.
- **The status pill is the sum of unpaid transfers**, and it is the same figure
  as 2a's `Left to move` by construction. Never computed in two places.

## What it changes that this repo had decided the other way

Each of these is recorded in `docs/screens.md` with the argument in full.

- **`Full ledger` is dropped**, and with it `/ledger`. The four columns it drew
  are the Final spend line now. `/settled`'s chip to it goes; nothing else in
  the app linked to it.
- **A settled night carries a status pill.** `/settled` said in as many words
  that a confirmed result carries no status pill of its own, and put `settled`
  in the meta line instead. The pill is not about the result — it is about how
  much cash has actually moved — so both survive: the meta line still ends with
  the night's state, and the pill states what is left to hand over.
- **1a's deductions are a plain ledger, not cards** — deliberately, so the
  ranked list stays the heaviest thing on the screen.

## Where this app deviates, deliberately

- **Rounding lands the positions, not the stacks — and this cut's own screens
  agree with that, while its README does not.** README rule 4 says stacks are
  rounded as they are entered and `Σ rounded − Σ raw` goes to the piggy bank.
  That is the 31 August rule, and it was replaced on 2 September because it made
  two screens disagree about the tin by the size of the remainder — the argument
  is in `packages/core/src/stacks.ts` and in `docs/bugs.md` B36. **Both boards in
  this bundle print `on the nets`** as the rounding row's value, which is the
  positions rule and not the stacks rule; the README's own copy list carries
  `on the nets` too. So the screens win over rule 4, the engine is unchanged,
  and nothing here re-rounds a count.
- **The sub-lines say what moves, and what moves is a position.** The cut writes
  them as `No stack moves by more than ₾3`. Under the positions rule no stack
  moves at all, so the sheet states the distortion it actually applies.
- **`+₾100 → piggy` on 2a is not a remainder, and cannot be.** The cut's own
  worked night counts `1963 · 2047 · 1512 · 478`, which is ₾6,000 exactly and
  rounds at ₾10 to ₾6,000 exactly: the remainder is zero. The ₾100 is the piggy
  bank's *deduction*. The row draws the step's real effect on the tin, which on
  that night is nothing, and the tin's own total where there is one.

## The collision to know about

This bundle numbers nothing and dates itself only in this file. Where it and an
older cut disagree about a screen it speaks on, **this one wins** — it is the
newest thing the owner has pointed at. Where it is silent, rev 18 and the four
partial cuts stand exactly as they did.
