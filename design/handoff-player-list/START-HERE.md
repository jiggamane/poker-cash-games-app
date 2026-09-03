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
- **A finished row is not tappable** — adopted everywhere but one row, and the
  exception is below.
- **Where everyone stands inverts**: the finished group is ranked and comes
  first, because only a final result can be ranked, and cashed-out players rank
  alongside counted ones.

## What it does NOT change, and why

The first two are regressions against later decisions, confirmed by the owner on
3 September. The third is not a regression at all — it is a correction flow this
app has and the board was not drawn against.

- **The primary on Count up stays `Next`.** Layout 2a in
  `handoff-E2/docs/E2-balance-check-logic.md` superseded `Apply the money rules`;
  this board carries the older frame's button.
- **The balance card keeps its verdict strip and its three states** — balanced,
  short, over. This board draws only the counting state, and the percentage line
  it shows now sits in the strip beside the verdict.
- **Two finished slabs keep a chevron**, on the rule *a figure is fixed where it
  was entered*. The ledger is append-only, so a wrong figure is corrected by
  entering it again, and these are the only doors to the screen that does that:
  a **counted stack on Count up** reopens the keypad it was typed on (without
  it, E5's `Fix` hands the host back to a screen where every row is counted and
  nothing can be changed — the app's one recovery path, leading nowhere), and a
  **cashed-out player on Tonight** reopens their card (`/player` is the only
  route to `/entry` anywhere, and the roster opens `/member`, the club record,
  not the night's card). `CASHED OUT EARLIER` on Count up does not open: that
  figure was typed on Tonight. Everywhere else a finished slab cannot take a
  press at all — `FinishedSlab` calls the prop `opens` and only those two rows
  pass it. A slab that opens something takes the chevron AND the 44 that go with
  being a target. Question for the owner in `docs/screens.md`.

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
