# Handoff · the mixed player list rule · cut 3 September 2026

One rule for every screen that shows a list where some players still have money
on the table and some are finished. It supersedes rev 18, `handoff-E2` and
`handoff-four-screens` **on how those rows are drawn**, and nothing else.

- `boards/Player List Rule.dc.html` — the pixel source: 1a/1b Count up (the
  reference), 1c/1d Tonight, 2a/2b Cash out · pick a player, 2c/2d Where
  everyone stands, 2e/2f End the night.
- `docs/player-list-rule.md` — the written handoff.

## The rule, in two lines

- **Active** — still has chips — is a plain hairline row, full-strength name,
  the fact beside the name, and something to do at the right edge.
- **Finished** — counted or cashed out — is an opaque surface slab, muted name,
  the fact on the same line, the signed result at the right, and **nothing
  tappable**.

`isFinished = counted != null || cashedOut != null` is the only flag the
treatment depends on.

## What it changes that was decided the other way

- **`RESULT BEFORE DEDUCTIONS` comes off every label.** The slab is what says
  "settled", so the label is name and count. `ui-audit.mjs` required that string
  and no longer does.
- **A finished row is not tappable.** On Tonight that costs the cashed-out
  player's card its route from this screen; the roster still reaches it.
- **Where everyone stands inverts**: the finished group is ranked and comes
  first, because only a final result can be ranked, and cashed-out players rank
  alongside counted ones.

## What it does NOT change, and why

Two things in it are regressions against later decisions, confirmed by the owner
on 3 September:

- **The primary on Count up stays `Next`.** Layout 2a in
  `handoff-E2/docs/E2-balance-check-logic.md` superseded `Apply the money rules`;
  this board carries the older frame's button.
- **The balance card keeps its verdict strip and its three states** — balanced,
  short, over. This board draws only the counting state, and the percentage line
  it shows now sits in the strip beside the verdict.

## Why the slab does not re-open B23

B23 took the win/loss wash off result rows: a translucent green or red band
behind a signed figure says in colour what the sign already says. The slab is
**opaque surface**, carries no opinion about winning, and `ui-audit.mjs`'s
`tinted-result-row` guard passes it for exactly that reason — it fires on a
translucent ancestor and skips an opaque one. The rule and the guard agree.

## Open, and stated as such by the handoff itself

1. **E1 End the night does not exist in the app.** It is drawn here as a sheet.
   Building it is a decision, not a conformance task.
2. The handoff's own two proposals: the cashed-out slab on E1, and ranking six
   players on E2b instead of three.
