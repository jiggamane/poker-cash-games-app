# E6 player rows — the whole formula, on demand

**Cut 31 August 2026.** Addendum to `E6-results-logic.md`. It changes one thing: what a player row shows,
and where the rest of the arithmetic lives. Everything else in that doc — header, prize pool, the state
pill, deductions as totals, ordering by `net` descending — stands unchanged.

Board: `boards/Result Formula Options.dc.html`.

> **Two namespaces on purpose.** `1b` / `1d` in `START-HERE.md` are options on `Game Summary.dc.html`.
> The ids on this board (`1a`–`1f`, `2a`–`2d`) belong to this board only.

## The decision

A settled row has more arithmetic behind it than `in` and `out`: the bill can both charge a player their
share and credit back what they paid at the counter, and the piggy bank takes its cut. Written on one line
that is four to six terms — too long for 393 points.

**The row states the result. Tapping it states the reason.**

* **Collapsed: name and net only.** The `in $100 · out $250` sub-line specified in `E6-results-logic.md`
  is **removed** — it was two of the five terms, which invites the reader to do maths that does not
  reconcile.
* **Expanded: the full receipt**, one line per term, in the order the money moved, closed by `Net`.
* One row open at a time. Opening another closes the first.

The row is 40 points collapsed instead of 60, so **eight players fit at rest** on 393 × 852 with the
prize-pool block, the deductions block and the footer all on screen (frame `2a`). Opening a row costs
about 147 points, and the list — which already scrolls — loses about two and a half rows (frame `2b`).

## Collapsed row

| | |
|---|---|
| Height | 40 (padding `9px 10px`, margin `0 -6px 3px`) |
| Name | 600 17px, primary text |
| Net | 700 18px, right, tabular, always signed, U+2212 for the minus |
| Chevron | 13 × 13, stroke 2.4, muted; down closed, up open |
| Tap target | the whole row |

**Dark theme keeps the tinted fill** — radius 8, `rgba(111,207,151,.13)` on a win,
`rgba(240,112,92,.13)` on a loss. No hairline.

**Bright theme has no fill.** Rows are separated by a `rgba(12,13,15,.1)` hairline under each; only the
net figure carries colour. This follows the no-emphasis rule in `E6-results-logic.md`; the dark theme is
the exception, because at 13% on `#0A0A0B` the tint reads as a band, not as emphasis.

## Expanded row

Header identical to the collapsed row (name, net, chevron up), then a detail block: `padding:10px 2px 0`,
hairline top, `gap:6`, label 400 13px muted left, figure 500 13px primary right, tabular. A `Net` line
closes it — 700 13px both sides, `padding-top:7`, hairline top, figure in the money colour.

Total height ≈ 190 (≈ 211 when a rounding term is present).

Lines, in this order, as drawn:

    Cashed out          $250
    Bought in          −$100
    Bill · his share    −$54
    Bill · he paid it  +$242
    Piggy bank          −$23
    ─────────────────────────
    Net                +$315

Rules:

* **Every term that is not zero appears; nothing is netted.** The two bill terms stay separate — a player
  who paid the bill at the counter needs to see the credit, not a merged `+$188`.
* Order is fixed: cash out, buy-in, then deductions in the order the group's money rules define them.
* A term of `$0` is not rendered.
* `Bought in` is negative and `Cashed out` positive — the row reads as a balance, not as two totals.
* Signs are explicit on every line except `Cashed out`.
* **Genderless copy in code**: `Bill · share` and `Bill · paid it`. The board says "his" only because the
  sample player is Petr.

## Copy changed on this cut

| Was | Is |
|---|---|
| `THROUGH THE TABLE` | `PRIZEPOOL` |
| `OFF THE TABLE` | `DEDUCTIONS` |
| `Counted out` | `Cashed out` |

## What the board does not settle

The four frames (`2a`–`2d`) were drawn on the **older E6 chrome** — three-figure strip, deductions card,
two footer buttons. The header, prize-pool block and deductions spec in `E6-results-logic.md` still
govern; take the row treatment from this board, not the furniture around it.

## Rejected, and why — reading reference only

| id | Treatment | Why not |
|---|---|---|
| `1a` | One line, bill netted to `+$188` | Cheapest, but hides that the bill had two parts |
| `1b` | Table result, then off-table items as signed tags | Two sub-lines per row; 8 players no longer fit |
| `1c` | The arithmetic spelled out, each term captioned | Reads as a receipt line, not a list row |
| `1e` | Four numeric columns, ledger style | Forces bill and piggy into one `off table` figure |
| `1f` | Waterfall with a running total | Right for a player's own screen or the full ledger, too tall for a list |

## Open

1. **The bright loss hex.** `Style Guide v2` lists `loss · bright` as `#C0341B`; the shipped light screens
   use `#B03A28`. The board follows the screens. Needs one answer.
2. Whether the expanded receipt is also the route into the individual entries, or whether that stays with
   **Full ledger**.
3. The player view — whether a player's own row opens by default.
