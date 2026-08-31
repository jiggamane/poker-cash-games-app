# E6 results — the columns layout, and the row order

**Cut 31 August 2026.** Second addendum to `E6-results-logic.md`, alongside `E6-row-formula.md`.
Two things: a **column** layout for the player list, offered against the receipt rows, and three
corrections that apply either way.

Board: `boards/Result Formula Options.dc.html`, frames `6a` (dark) and `6b` (bright).

## Which layout ships is open

| | `E6-row-formula.md` — receipt rows (frames `2a`–`2d`) | this doc — columns (`6a`/`6b`) |
|---|---|---|
| Row | name + net, 40pt | name + four figures, 38pt |
| The formula | behind a tap, one term per line | on the row, four computed figures |
| Rows on screen | 8, and the receipt costs ~147pt when open | 8, room for 10 |
| Tappable | yes | nothing |
| Bill's two parts | shown separately | netted into one `food` figure |

Both are drawn in both themes. **Pick one before building** — they are alternatives, not layers.

## The columns

    name            game     food    piggy      net
    103              64       58       50        74

* **`game` = cashed out − bought in.** Buy-in and cash-out collapse into one signed figure: what happened
  at the table, with no deductions in it.
* **`food` = their share of the bill netted with anything they paid at the counter.** One total per person.
  Whoever covered the bill shows a credit — Petr paid $242 and owed $54, so `+$188`. Marek paid $190 and
  owed $54, so `+$136`. Everybody else `−$54`.
* **`piggy`** — their piggy-bank contribution, its own column, never merged into food.
* **`net`** — `game + food + piggy`. 700 16px in the money colour; the other columns are 400 14px muted.

Rows are 38pt (padding `9px 0`), each cell `border-top` hairline with **no column gap** — numeric cells take
`padding-left:8px` instead, so the rule runs unbroken across the row. All figures tabular, always signed
except `game` when it is exactly zero.

Footnote under the table, 11.5px:

> Game = cashed out less bought in. Food = their share of the bill, plus whatever they paid at the counter —
> Petr paid $242 and owed $54, so +$188.

A group with more deduction kinds than food and piggy does not get more columns — it falls back to the
receipt rows. Four numeric columns is the ceiling at 393 points.

## Corrections that apply to either layout

1. **Order is `net` descending** — biggest win first, biggest loss last, as `E6-results-logic.md` states.
   Every frame on the board now follows it, including the one with an open receipt (Petr sits third, which
   is also the proof the receipt works mid-list).
2. **Stat labels**: `THROUGH THE TABLE` → **`PRIZEPOOL`**, `OFF THE TABLE` → **`DEDUCTIONS`**.
3. **Receipt line**: `Counted out` → **`Cashed out`**.

## A note on the folds

The three-figure strip, the deductions block and the footer are fixed; the list is the only flexible
element, so where it clips depends on the theme's row pitch (43pt dark with tinted rows, 41pt bright with
hairlines). On the board the scrolling lists **fade at the fold** rather than cut through a figure. In code
that is a real scroll view; the fade is only how a static frame states it.

## Open

Which layout ships. My read: receipt rows for the list, and the columns layout as the **Full ledger** view
behind the footer button — the two answer different questions.
