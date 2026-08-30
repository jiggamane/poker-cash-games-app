# E6 results screen — logic

## Inputs

| Name | Definition |
|---|---|
| `startedAt` / `endedAt` | first buy-in logged, and the moment the night was closed |
| `duration` | `endedAt - startedAt`, rendered `10h 46m` |
| `prizePool` | sum of every buy-in and re-entry — the money that went through the table |
| `entries` | count of buy-ins plus re-entries (not players) |
| `playersTotal` | players who bought in at any point |
| `deductions[]` | one per kind: `{ label, total }` — piggy bank, food and drinks, tips, and any group-defined kind |
| `deductionsTotal` | sum of `deductions[].total` |
| `players[]` | `{ name, in, out, net }` where `net = out - in` after the money rules have been applied |
| `difference` | `sum(players[].out) - (sum(players[].in) - moneyLeavingThePot)`; `0` when the night balanced |
| `loggedBy` | who confirmed the difference, when one was logged |

## The state pill

The prize pool line carries at most one pill, on the right. It is the only status on the screen.

    difference === 0     check mark + "SETTLED"                     green
    difference > 0       "${difference} OVER"   + "logged by {loggedBy}"   red
    difference < 0       "${-difference} SHORT" + "logged by {loggedBy}"   red

The pill never grows past one line of 11.5px type; the `logged by` line sits under it in 12px muted. A night
that balanced needs no explanation, so the green pill has no second line.

Rule: **a status pill appears nowhere else on this screen** — not beside the title, not as a panel, not in
the meta line.

## Player rows

* One row per player who bought in, ordered by `net` descending — biggest win first, biggest loss last.
* Row: name (700 15px) with `in ${in} · out ${out}` under it in 11.5px muted, tabular; `net` right-aligned,
  800 18px, tabular, signed always (`+$7,657` / `−$12,000`, U+2212 for the minus).
* Green for a positive net, red for a negative, muted for exactly `$0`.
* Rows are separated by a hairline. **No row is emphasised** — no tinted fill, no "You," prefix, no avatar.
  A player's own row looks like everybody else's in the admin view.
* Section label: `THE TABLE · AFTER DEDUCTIONS`.

## Deductions

* Below the player rows, inside a block bounded by a hairline top and bottom.
* Label `DEDUCTIONS`, with `collected on the side` right-aligned on the same line — replace that qualifier
  with whatever the group's money rules actually do; it exists because the sample night's nets sum to zero.
* One line per kind: label left, total right, 14px. **Totals only** — no per-player breakdown, no payer name.
* A `TOTAL` line closes the block, 13px uppercase label and an 800 15px figure.
* A kind with a total of `$0` is not rendered. With no deductions at all the whole block is absent.

## Header

* Title: `{shortWeekday} {day} {shortMonth}` — `Sat 29 Aug`. One line, 800 30px, letter-spacing −.03em.
  Nothing is placed to the right of it; the row holds the back button and the title only.
* Meta line, 13.5px muted tabular: `{startedAt} → {endedAt} · {duration} · {playersTotal} players`.
  Times are 24-hour. A night crossing midnight still shows both wall-clock times and the duration resolves
  the ambiguity.

## Removed — do not reinstate

* The `SETTLEMENT` panel and its `You are square` / `You owe …` line.
* The `SETTLED` pill beside the title.
* `WHAT YOU PAID` and its body line.
* The `Who has paid` disclosure row. Payments live on E7, reached from elsewhere.
* The in-versus-out two-sum block and the progress bar — those belong to E2.

## Colour

Bright: green `#0A7A3D`, red `#A93A2A`, muted `#6B6F76`, block fill `#F4F4F6`, hairline `rgba(12,13,15,.08)`.
Dark: green `#6FCF97`, red `#F0705C`, muted `#8B8D93`, block fill `#16161A`, hairline `rgba(255,255,255,.09)`.
No other hue appears on this screen.
