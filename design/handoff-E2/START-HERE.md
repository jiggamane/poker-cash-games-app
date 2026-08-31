# E2 Count up — the balance check · handoff for Claude Code

**Cut 30 August 2026.** Supersedes the E2 status block as drawn in rev 18. Everything else in rev 18 stands.

```
START-HERE.md                             this file
docs/E2-balance-check-logic.md            the logic: inputs, states, transitions, strings, colour
docs/E2-rounding.md                       addendum, 31 Aug: rounding — the row, the sheet, the maths
boards/Settled Status.dc.html             the board — chosen layout 2a, plus the colour options 2b-2i and turn-1 alternatives 1a-1d
boards/Result Formula Options.dc.html     rounding — frames 5a-5d (E2), 4a-4d (E4), 3a-3d (E6)
```

Open the board straight from `boards/` in a browser, no server. `support.js` sits next to it.

## Addendum, 31 August — rounding is set here

`docs/E2-rounding.md` adds one row under the balance block and one sheet behind it: steps of **$10 / $50 /
$100 or off**, nearest and both ways, the remainder into the piggy bank, and the raw entry kept under the
rounded figure (`in $500 · counted $963`). Set on E2 it governs the night — nets inherit it and E4's
transfers derive from the rounded nets. E4 and E6 show the same row but do not own it.

⚠ Frames `5a`–`5d` on that board are drawn on the **rev-18** E2 block, not layout `2a` in this handoff.
Take the row and sheet; anchor them under the new block.

## What changed on E2

Rev 18 drew the block as **COUNTED $2,880 of $2,880** — a comparison against the money still on the table,
which hides half the sum and can read "done" while a cash-out is unaccounted for. The block now states the
whole equation: **every buy-in against every confirmed cash-out plus every counted stack.**

The new block, layout **2a** on the board:

1. Two sums side by side — `BOUGHT IN` left, `ACCOUNTED FOR` right, one hairline between them, each with a
   sub-line of its own composition.
2. One two-part progress line under them: accounted for, and what is left.
3. One footer strip carrying the state — a countdown while counting, **BALANCED** once the sums meet,
   **$n SHORT / OVER** if they do not.
4. Primary button reads **Next** (was "Apply the money rules").

The block never moves position and keeps its height in every state. A screen that only says BALANCED is not
checkable, so both sums stay on screen in all states.

## Layout decisions

* **2a is the build.** Turn-1 options `1a`-`1d` on the board are the alternatives it was chosen against —
  reading reference, do not build.
* **Colour of the default (mid-count) state is open.** Options `2b`-`2i` on the board, all inside the
  existing palette. Recommendation: **2f** — amber on the `ACCOUNTED FOR` label and the filled bar, numbers
  stay white, so amber signals "in progress" without competing with the two end states.
* **No new hue.** The style guide has no accent: money green `#6FCF97`, money red `#F0705C`, and status
  amber `#E8B455` are the only colours. Light theme substitutes `#0A7A3D` / `#7A5410` per rev 18.
* **Balanced is not settled.** This screen owns *balanced*; **settled** stays a separate later status on E6,
  after transfers are agreed. Do not merge the two words.

## Still to draw

* Light twin of the new block.
* The **OVER** state (accounted for exceeds bought in) — specified in the logic doc, not drawn.
* The recount / log-the-difference destination behind "recount, or log it" in the short state.
