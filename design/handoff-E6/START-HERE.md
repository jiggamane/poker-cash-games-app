# E6 The night, settled — results screen · handoff for Claude Code

**Cut 30 August 2026.** Supersedes the results screen as built. Read alongside `handoff-E2/` — the two
screens now divide the work of stating the balance between them.

```
START-HERE.md                            this file
docs/E6-results-logic.md                 the logic: inputs, the state pill, deductions, ordering, strings
docs/E6-row-formula.md                   addendum, 31 Aug: what a player row shows, and the receipt behind it
docs/E6-results-columns.md               addendum, 31 Aug: the columns layout, row order, label fixes
boards/Game Summary.dc.html              the board — 1b is the build (bright), 1d is the same screen dark
boards/Result Formula Options.dc.html    the row treatment — 2a–2d are the build, both themes
```

Open the board straight from `boards/` in a browser, no server. `support.js` sits next to it.

## The build

**`1b` in both themes** — hairline player rows, no tinted fills. `1d` on the board is the identical screen
in the dark theme; build the pair. `1a` and `1c` are the tinted-row alternative — reading reference, do not
build.

## Addendum, 31 August — two layouts on the table

`docs/E6-results-columns.md` adds a **columns** layout (`game · food · piggy · net`, frames `6a`/`6b`) as an
alternative to the receipt rows, and carries three corrections that apply either way: order is `net`
descending, `PRIZEPOOL` / `DEDUCTIONS` replace `THROUGH THE TABLE` / `OFF THE TABLE`, and the receipt line
reads `Cashed out`. Rounding on this screen is display-only — it is owned by E2, see `handoff-E2/`.

## Addendum, 31 August — the row states the result, tapping it states the reason

`docs/E6-row-formula.md` changes one thing in the logic doc: the `in $100 · out $250` sub-line under a
player's name is **removed**. A collapsed row is name and net only, 40 points instead of 60, so eight
players fit at rest; tapping a row opens the full receipt — cash out, buy-in, each bill term, the piggy
bank, and `Net`. Dark keeps the tinted row fill, bright is hairlines with colour only on the figure.
Read that doc for the measurements, the line order and the copy changes (`PRIZEPOOL`, `DEDUCTIONS`,
`Cashed out`).

## What changed against the shipped screen

1. **The status appears once, or not at all.** The screen had a `SETTLED` pill beside the title *and* a
   `SETTLEMENT / You are square` panel. Both are gone. A confirmed result states no status of its own; the
   settled / off-balance status belongs to the counting screens (E2, E5) where the figures are still being
   entered.
2. **No in-versus-out comparison and no progress bar** on this screen. That comparison is E2's job.
3. **The prize pool stays, as one line** — `PRIZE POOL $31,000` with `17 entries · 7 players` under it, in a
   single compact block at the top. The state, when there is one to show, rides on that line as one pill on
   the right (see the logic doc).
4. **Deductions are stated as totals only**, one line per kind plus a `TOTAL`, and they sit **below** the
   player rows.
5. **Start and end time are on the meta line** — `20:05 → 06:38 · 10h 46m · 7 players`.
6. **The weekday is short** — `Sat 29 Aug` — so the title holds one line at full width. Nothing is placed to
   the right of the title.
7. **The admin view carries no personal blocks.** `What you paid` and the `Who has paid` row are removed.
   Every player is a row of the same weight, no "You," prefix, no highlighted row.

## Screen order, top to bottom

    status bar
    back button · title "Sat 29 Aug"
    meta line: start → end · duration · player count
    PRIZE POOL block  (+ state pill when applicable)
    THE TABLE · AFTER DEDUCTIONS — one row per player
    DEDUCTIONS — totals only
    (flexible space)
    home indicator

## Open

* The player view of this screen. The admin view is decided; whether a player sees their own row emphasised,
  and where their own settlement sits, is not drawn.
* Whether the deductions block is tappable through to the individual entries.
