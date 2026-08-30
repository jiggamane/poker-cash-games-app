# E2 Count up — the balance check · handoff for Claude Code

**Cut 30 August 2026.** Supersedes the E2 status block as drawn in rev 18. Everything else in rev 18 stands.

```
START-HERE.md                          this file
docs/E2-balance-check-logic.md         the logic: inputs, states, transitions, strings, colour
boards/Settled Status.dc.html          the board — chosen layout 2a, plus the colour options 2b-2i and turn-1 alternatives 1a-1d
```

Open the board straight from `boards/` in a browser, no server. `support.js` sits next to it.

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
