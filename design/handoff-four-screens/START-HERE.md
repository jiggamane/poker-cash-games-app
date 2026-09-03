# Handoff · four screens · cut 2 September 2026

Tonight, Count up, Results and Settle up, drawn as ten frames in dark and bright
twins. **It supersedes rev 18 and `handoff-E6` on exactly these four screens and
nowhere else.** Everything rev 18 says about every other screen still stands.

- `boards/Artboards - Four Screens.dc.html` — the pixel source. Every dimension,
  weight and colour is inline on the element. Open it next to `support.js`.
- `docs/four-screens.md` — the written handoff: frame rules, tokens, type scale,
  per-screen layout, interactions, state.

## What it changes, in one line each

- **Tonight** — the flat player list becomes two groups, `STILL PLAYING` and
  `CASHED OUT · RESULT BEFORE DEDUCTIONS`. The right-hand column means *money in*
  above and *signed result* below, so the section label carries the meaning.
- **Count up** — the balance block gains a percentage bar and a
  `$1,540 still on the table` line; the list becomes three groups and shows each
  counted player's result. Two options are drawn for the done rows, hairline and
  tinted.
- **Results** — **deductions are no longer folded into any player's balance.**
  The rows carry the game result only and the deductions sit in their own card
  below. This replaces the four-column table `handoff-E6` shipped.
- **Settle up** — as `E2-rounding.md` frames `4a`–`4d`, plus a drawn choice
  between tinted and outlined night's-net chips.

## Two things it leaves open

1. **The lede counts seven transfers; the list draws eight rows.** It treats the
   piggy-bank row as not-a-transfer. The engine counts it as a payee like anyone
   else, so the built screen would say eight. Needs a decision.
2. **No rounding row on Results.** As drawn, a night that rounded shows a
   deductions total that is short by the remainder. See `docs/rounding.md` —
   the rounding rule is being changed so that there is no remainder to show.
