# E2 Count up — logic

## Inputs

Per game, at the moment E2 is on screen:

| Name | Definition |
|---|---|
| `boughtIn` | sum of every buy-in and re-entry logged for the game, all players, including players who have left |
| `cashedOut` | sum of every **confirmed** cash-out (a player who left and had their stack agreed) |
| `counted` | sum of every stack counted for a player **still seated**, only where a count has been entered |
| `accountedFor` | `cashedOut + counted` |
| `left` | `boughtIn - accountedFor` (can be negative) |
| `playersIn` | count of players whose money is accounted for — confirmed cash-out or entered count |
| `playersTotal` | count of players who bought in at any point during the game |
| `uncounted` | seated players with no count entered |

A count of **$0** is a valid, entered count (busted player, stack gone). It counts toward `playersIn` and
must be distinguishable from "not counted yet" in the list and in `playersIn`.

## The three states

The block renders exactly one state. State is derived, never stored.

**1 · Counting** — `uncounted.length > 0`

    footer:  "${left} LEFT TO ACCOUNT FOR"        right: "{playersIn} of {playersTotal} in"
    bar:     accountedFor / boughtIn filled, remainder faint
    button:  Next — disabled

`left` counts down toward $0 as stacks are entered. The figure is a working number, not a verdict: no green,
no red, no check mark while any stack is uncounted, even if the sums happen to match at this instant.

**2 · Balanced** — `uncounted.length === 0 && left === 0`

    footer:  check mark + "BALANCED — NOTHING MISSING"     (green)
    bar:     full width, green
    button:  Next — enabled, primary fill

**3 · Off balance** — `uncounted.length === 0 && left !== 0`

    left > 0   footer: "${left} SHORT"   right: "recount, or log it"     (red)
    left < 0   footer: "${-left} OVER"   right: "recount, or log it"     (red)
    bar:       accountedFor drawn red; the discrepancy is the remaining segment
    button:    Next — enabled

Off balance does not block the night. The host can go on to the money rules with the difference logged; the
logged difference travels with the night into the book and shows on the night's record.

## Transitions

* Entering or editing any count, or confirming any cash-out, recomputes the state on the same screen. Nothing
  navigates.
* A state change swaps the footer strip and the bar colour in place. Position and height do not change — no
  reflow of the list below.
* Going from *counting* to *balanced* is the only moment green appears on this screen. Treat it as a change
  worth a short transition, not a page change.
* Editing a count away from balanced returns to state 1 or 3 immediately; the green is withdrawn.

## Sub-lines

* Left: `"{entries} entries · {playersTotal} players"` — entries is buy-ins plus re-entries, not players.
* Right: `"${cashedOut} cashed out · ${counted} counted"`. If `cashedOut === 0` show `"${counted} counted"`
  alone; if `counted === 0` show `"${cashedOut} cashed out"` alone. Never show a $0 term.

## Strings

    LEFT TO ACCOUNT FOR      "$1,430 LEFT TO ACCOUNT FOR"
    BALANCED                 "BALANCED — NOTHING MISSING"
    SHORT                    "$80 SHORT"          secondary: "recount, or log it"
    OVER                     "$80 OVER"           secondary: "recount, or log it"
    button                   "Next"

Money is always formatted with a thousands separator and no decimals, tabular numerals, currency symbol
leading. Both status labels are uppercase with `.06em` tracking; the two column labels are uppercase 11px
with `.1em`.

## Colour

Default state colour is the open decision — options `2b`-`2i` on the board. Fixed regardless of which wins:

* Green `#6FCF97` appears only in state 2. Red `#F0705C` only in state 3.
* Amber `#E8B455` is available for state 1 and means "in progress", the same meaning it carries on the
  settlement status line.
* The `BOUGHT IN` figure is never coloured — it is the fixed side of the comparison.
* Light theme: `#0A7A3D` for green, `#7A5410` for amber, red per rev 18 tokens.

## The list below the block

Unchanged from rev 18 except grouping, which the block now depends on:

* **Still seated** — every player without a confirmed cash-out. A player with no count entered shows
  `"not counted yet"` and a **Count** button, and sits on the tinted row. A counted player shows the figure
  and a pencil to edit.
* **Already confirmed** — cashed-out players, dimmed, showing the time and their figure. Their money is in
  `accountedFor` already.
