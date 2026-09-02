# Handoff: The Poker Club — four screens (Tonight, Count up, Results, Settle up)

## Overview
A home cash-game ledger for iPhone. One person runs the night on their phone: seats players,
records buy-ins and rebuys, cashes people out, counts the stacks at the end, applies the house
money rules (food, piggy bank), and reads out who pays whom.

This bundle covers four screens of that night, each drawn in a dark and a bright twin:

1. **Tonight** — live session, grouped player list (still playing / cashed out).
2. **Count up** — step 1 of 3, counting stacks against what was bought in. Two options for how
   done players are drawn.
3. **Results** — a settled night, with the game result and the deductions kept apart.
4. **Settle up** — step 3 of 3, the transfer list, the rounding rule and the night's net.

## About the design files
`Artboards - Four Screens.dc.html` is a **design reference created in HTML** — a prototype
showing intended look and structure, not production code to lift. The task is to **recreate these
screens in the target codebase's environment** (SwiftUI, React Native, React, etc.) with its own
patterns, components and navigation. If no environment exists yet, pick the framework that fits
an iPhone-first app and implement there.

Every dimension, weight and colour is written inline on the element in the HTML, so values can be
read straight off the markup rather than derived from a stylesheet. The file needs `support.js`
(bundled) next to it to render; open it in a browser and pan/zoom the canvas.

## Fidelity
**High fidelity.** Final colours, typography, spacing and copy. Recreate pixel-for-pixel using the
codebase's own primitives. The only deliberately loose parts are the drawn system status bar
(a drawing, not a component — use the platform's real status bar) and the home indicator.

## Frame and global rules
- Frame **393 × 852** (iPhone 16 / 15 / 14 / 13), corner radius **46**.
- Safe insets: **59 top**, **34 bottom**. The bottom 34 is a reserved row, never drawn into.
- Status row is a drawing of the system bar: padding `20 30 0`, time **15/600**, battery **13/400**.
- Side margin **20** for card stacks, **22** for plain rows.
- Rows are intrinsic height. Minimum hit target **44**.
- All vertical slack goes into **one** flexible spacer directly above the footer (screens 1, 3, 4).
  Screen 2 is the exception: its three groups exceed the fold, so the list itself is the flexible
  region — it clips at the footer and scrolls, with a fade over the last 12% of its height.
- Chrome is either **PUSHED** (round 38 back button top-left, **nothing** in the top-right corner)
  or a **SHEET** (grabber 38 × 5, close, radius 26 26 0 0). Never mixed. All four screens here are
  pushed. Note: the brief for screen 2 asked for a home glyph top-right; that contradicts the
  pushed rule, so it is drawn without one.
- Figures are never abbreviated (`$1,540`, not `1.5k`). A figure changes only when the night's
  rounding step changes it. All figures use tabular numerals.
- Currency symbol is shown everywhere except the night's-net chips on screen 4.

## Type
**Figtree**, weights 400 / 500 / 600 / 700 / 800.

| Role | Spec |
| --- | --- |
| Screen title | 30 / 800, letter-spacing −.03em |
| Card figure, large | 40 / 800, letter-spacing −.04em |
| Card figure, medium | 30 / 800, −.035em |
| Card figure, small | 26 / 800, −.035em |
| Section label | 11 / 700, tracking .1em, uppercase |
| Player name (list row) | 17 / 700 |
| Money in a list row | 19 / 700 |
| Transfer name | 16 / 600 · transfer amount 18 / 700 |
| Row sub-line | 13 / 400 |
| Card sub-line | 12.5 / 400 |
| Lede paragraph | 14.5 / 400, line-height 1.5 |
| Primary button label | 18 / 700 · secondary 17 / 700 |
| Back-row label | 17 / 500 |
| Chip | name 14 / 600, figure 14 / 700 |

## Design tokens

### Dark
| Token | Value |
| --- | --- |
| ground | `#0A0A0B` |
| surface | `#16161A` |
| raised | `#1E1E22` |
| text | `#FFFFFF` |
| muted | `#8B8D93` |
| dim | `#7F8187` |
| hairline | `rgba(255,255,255,.11)` |
| win | `#6FCF97` |
| loss | `#F0705C` |
| bone | `#D9D3C4` |
| amber | `#E8B455` |
| disabled button fill / label | `#1E1E22` / `#5C5E64` |

### Bright
| Token | Value |
| --- | --- |
| ground | `#FFFFFF` |
| surface | `#F4F4F6` |
| text | `#0C0D0F` |
| muted | `#6B6F76` |
| dim | `#8A8D94` |
| hairline | `rgba(12,13,15,.13)` |
| win | `#0A7A3D` |
| loss | `#B03A28` |
| bone | `#786644` |
| amber | `#7A5410` |
| disabled button fill / label | `#EDEDF0` / `#A2A5AC` |

Washes: win/loss tint `14%` alpha on dark, `10–11%` on bright. Bone wash `9%` both themes.

### Geometry
Radius: card **14**, tinted block **8**, button **12**, pill/chip **999**, back button **19**
(38 circle), frame **46**. Hairlines are 1px. Progress bar 8 tall, radius 3. Outlined buttons
1.5px border at 45% of text colour; the quieter of two outlined buttons drops to 20–22%.

---

## Screen 1 · Tonight (pushed, live session)
**Purpose.** Watch the table while play is on: what is on the table, who is seated, what each
player has in, and who has already cashed out.

**Layout, top to bottom**
1. Status row (drawing).
2. Title row, padding `20 22 14`, gap 11: back button 38 · `Tonight` 30/800 · running-time pill ·
   `started 20:05` (13/400 muted, right edge).
   Pill: radius 999, padding `6 10`, win wash, 6px win dot, `3h 17m` 12/700 in win.
3. Header card, surface, radius 14, margin `0 20 18`, padding `16 20`, items bottom-aligned:
   left `On the table` 15/500 muted over **$2,880** 40/800; right stack `$5,000 total in` 13.5/500
   muted and `5 seated · 1 out` 13.5/400 dim.
4. Two groups, margin left/right 22:
   - `STILL PLAYING · 5` — rows padding `15 0`, hairline under each: name 17/700 text ·
     buy-in 19/700 text right · 8×13 chevron in muted.
     Petr $1,500 · Ivo $1,000 · Lena $1,000 · Marek $500 · Tomáš $500.
   - `CASHED OUT · 1 · RESULT BEFORE DEDUCTIONS` — label padding `22 0 9`. Row padding `13 0`:
     name 17/700 in **muted**, sub-line `23:15 · in $500 · out $2,120` 13/400 dim, and the
     right-hand figure becomes a signed result in win/loss (`+$1,620`), chevron in dim.
     Dana.
5. Flexible spacer.
6. Footer, margin left/right 20: `Table admin` disclosure row (padding `12 2`, hairline above,
   16px chevron-up, label 14/600 muted, `seat · cash out · end` 13/400 dim right), then a
   `1.9fr 1fr` grid, gap 10, of a filled **+ Rebuy** (52 tall, radius 12, inverted fill, 19px plus
   glyph) and an outlined **Bill**.
7. Home indicator row, 34 tall.

**The rule this screen establishes.** The right-hand column means *money in* above and *signed
result* below, so the section label has to carry the meaning. A settled player also loses full-strength
name colour. Same rule is reused on screen 2.

## Screen 2 · Count up (pushed, step 1 of 3)
**Purpose.** Enter each remaining player's counted stack and watch the table reconcile against
what was bought in.

**Layout**
1. Status row.
2. Back row, padding `18 22 6`: back button 38 · `Tonight` 17/500 muted.
3. Title row, padding `0 22 8`: `Count up` 30/800 · `1 of 3` 14/600 muted right.
4. **Balance card** — surface, radius 14, margin `0 20 10`, padding `12 18`, **fixed height 140**.
   Two halves split by a 1px vertical hairline, gap 16:
   `BOUGHT IN` **$7,000** 30/800 over `8 players · 11 buy-ins` 12.5/400 dim ·
   `ACCOUNTED FOR` **$5,460** over `3 counted · 3 cashed out`.
   Under them, pushed to the bottom of the card: progress bar (8 tall, radius 3, track = hairline,
   fill = amber at **78%**), then `78% accounted for` left / `$1,540 still on the table` right,
   12.5/400 muted.
   **The height is fixed on purpose** — the card must be identical while counting, when balanced,
   and when off balance, so entering a stack never reflows the list under it. Its content occupies
   124 of the 140.
5. Three groups, margin left/right 22, inside the scrolling region:
   - `STILL TO COUNT · 2` — rows padding `10 0`: name 17/700 over `in $1,500` 13/400 dim; right
     side an em dash 19/700 dim and a 17px amber pencil. Petr in $1,500 · Ivo in $1,000.
   - `COUNTED · 3` and `CASHED OUT EARLIER · 3` — **drawn twice, as options** (below).
6. Footer, margin left/right 20, hairline above, padding-top 12, gap 8: underlined text link
   `See where everyone stands` (14/600, bone, underline offset 3), a **blocked** primary
   `Apply the money rules` (50 tall, radius 12, raised fill, dim label), and the reason
   `Two stacks still to count.` 13/400 dim, centred.
7. Home indicator row, 34.

**Option A — hairline rows** (frames 2a dark / 2b bright)
- Label reads `COUNTED · 3 · RESULT BEFORE DEDUCTIONS`.
- Counted row, padding `8 0`, hairline under: name 17/700 text over sub-line
  `in $500 · counted $960` 13/400 dim; signed result 19/700 in win/loss; then a 16px win-coloured
  check. Lena +$460 · Marek +$340 · Tomáš −$280.
- Cashed-out row, padding `12 0` (44 tall), single line: name 17/700 **muted** · time 13/400 dim ·
  signed result 19/700 win/loss right, no glyph. Dana 22:40 +$1,620 · Jan 21:55 −$500 ·
  Eva 21:10 −$680.

**Option B — tinted blocks** (frames 2c dark / 2d bright)
- Label reads `COUNTED · 3` only.
- Block: surface fill, radius 8, padding `13 14`, 6px gap between blocks, everything on one line:
  name 17/700 · `counted $960` 14/400 muted · signed result 19/700 win/loss right. No glyph.
- Cashed-out blocks match, with the time in place of the counted figure and the name in muted.

Pick one treatment for both groups; do not mix.

**Numbers for this night.** $7,000 in over 11 buy-ins from 8 players. Two stacks uncounted
($1,500 and $1,000 of buy-in). Counted: $960 + $1,340 + $220 = $2,520. Cashed out earlier:
$2,120 + $500 + $320 = $2,940. Accounted for $5,460 = 78% of $7,000, leaving $1,540.

## Screen 3 · Results (pushed, a settled night)
**Purpose.** Read the night. **Deductions are not folded into any player's balance.**

**Layout**
1. Status row.
2. Title row, padding `18 22 4`: back button 38 · the date `Sat 21 June` 30/800.
3. Meta line, padding `0 22 14`: `20:05 → 23:45 · 3h 40m · 8 players · settled` 13/400 muted.
4. Header card, surface, radius 14, margin `0 20 18`, padding `15 18`, three figures across one
   row (labels 11/700 tracking .1em muted, figures 26/800):
   `PRIZEPOOL $5,000` (flex 1) · `ENTRIES 10` (fixed 74) · `DEDUCTIONS $616` (right-aligned, figure
   in **bone**).
5. `GAME RESULTS`, margin left/right 22, label padding `0 0 6`. One row per player, padding `8 0`,
   hairline under all but the last: name 17/700 text, and **the game result only** — cashed out less
   bought in — 19/700 in win/loss, right. No food column, no piggy column, no per-player deduction.

   | Player | Result |
   | --- | --- |
   | Petr | +$1,700 |
   | Dana | +$980 |
   | Lena | +$460 |
   | Marek | +$140 |
   | Ivo | −$340 |
   | Tomáš | −$500 |
   | Jan | −$880 |
   | Eva | −$1,560 |

   These sum to **zero** — that is the check that the game half of the night is sound.
6. `DEDUCTIONS` block — its own surface card, radius 14, margin `14 20 0`, padding `14 16`, gap 10.
   One row per rule: name 15/600 over who holds it 12.5/400 muted, amount 17/700 right.
   - `Kitchen & drinks` / `→ Petr, Marek` — **$432**
   - `Piggy bank` / `held by the group` — **$184**, name and figure in bone
   - `TOTAL` row above a hairline: label 11/700 tracking .1em, **$616** 17/800.
7. Flexible spacer.
8. Footer, margin left/right 20: `1fr 1fr` grid, gap 10, outlined **Full ledger** and a quieter
   outlined **Close**, both 52 tall.
9. Home indicator row, 34.

**Copy rule.** Never the phrases "leaves the table" or "taken from the table" anywhere in this
flow.

## Screen 4 · Settle up (pushed, step 3 of 3)
**Purpose.** Hand out the smallest set of transfers that clears the night.

**Layout**
1. Status row.
2. Back row, padding `18 22 6`: back button 38 · `Deductions` 17/500 muted.
3. Title row, padding `6 22 10`: `Settle up` 30/800 · `3 of 3` 14/600 muted right.
4. Lede, padding `0 22 16`, 14.5/400 muted:
   `Seven transfers clear the night. The piggy bank is set aside for the group.`
5. **Rounding row**, margin left/right 22, **45 tall**, hairline top *and* bottom:
   `Rounding · nearest $10` 15/600 text left; `+$16 → piggy` 14/600 in bone; 8×13 chevron muted.
6. Transfer rows, margin left/right 22, padding `12 0`, hairline under, gap 8: payer 16/600 ·
   15×11 arrow glyph in dim · payee 16/600 · amount 18/700 right.

   | | | |
   | --- | --- | --- |
   | Eva → Petr | $1,640 | |
   | Jan → Petr | $200 | |
   | Jan → Dana | $760 | |
   | Tomáš → Dana | $140 | |
   | Tomáš → Lena | $380 | |
   | Tomáš → Marek | $60 | |
   | Ivo → Marek | $220 | |

   Then the **piggy row**, set apart: margin-top 8, padding `12 10`, negative side margin −10 so
   the wash bleeds past the row inset, radius 8, bone wash 9%, everything (names, arrow, figure) in
   **bone**: `Ivo → Piggy bank $200`. It is the one row where money leaves for good, and it carries
   no hairline.
7. `NIGHT'S NET` section, margin `20 22 0`, gap 10: a wrapping row of chips, gap 7. Chip: radius
   999, padding `7 11`, gap 7 between name and figure, name 14/600, figure 14/700 tabular,
   **no currency symbol**.
   Petr +1,840 · Dana +900 · Lena +380 · Marek +280 · Ivo −420 · Tomáš −580 · Jan −960 ·
   Eva −1,640.
   **Drawn twice:** tinted (win/loss wash fill, whole chip in the win/loss colour — frames 4a/4b)
   and outlined (1px hairline border, name in text colour, only the figure in win/loss — frames
   4c/4d). Same padding and widths either way; only the chip treatment swaps.
8. Flexible spacer.
9. Footer, margin left/right 20: filled **Close the session**, 52 tall, radius 12, inverted fill.
10. Home indicator row, 34.

**How the arithmetic ties to screen 3.** Each player carries an equal share of the $616 of
deductions ($77), and the two kitchen holders are credited $216 each. Rounding every net to the
nearest $10 leaves **$16** over, which is why the piggy row is **$200** against the **$184** rule.
Receipts $1,840 + $900 + $380 + $280 = $3,400; payments $420 + $580 + $960 + $1,640 = $3,600; the
$200 difference is the piggy bank. Seven transfers, no more.

## Interactions and behaviour
- **Navigation.** Every screen is pushed. Back button top-left returns; nothing sits top-right.
  Count up → Deductions → Settle up is a 3-step wizard, labelled `1 of 3` / `3 of 3` at the title's
  right edge. `Close` and `Close the session` leave the flow.
- **Tonight.** Rows with a chevron open that player. `Table admin` is a disclosure that expands to
  seat / cash out / end. `+ Rebuy` is the primary action of the night.
- **Count up.** The pencil on an uncounted row opens stack entry. On save, that player moves from
  `STILL TO COUNT` to `COUNTED`, the counters and progress bar update, and the balance card must
  not change height. `Apply the money rules` stays blocked until `STILL TO COUNT` is empty; the
  reason line underneath always names what is missing (`Two stacks still to count.`).
- **Settle up.** The rounding row is tappable and opens the rounding choice (nearest $10 / $50 /
  $100 / off); the remainder always goes to the piggy bank, and changing the setting is the only
  thing allowed to change a figure on this screen.
- **Cashed-out and counted rows** are terminal: no chevron on screen 2, muted name, signed result.
- Screen 2's list scrolls under its footer with a fade over the last 12%; the other three screens
  do not scroll.

## State
- `session`: started at, elapsed, status (live / counting / settled).
- `players[]`: name, buy-ins (count and total), cashed-out at, cashed-out amount, counted amount,
  game result, deduction share, rounded net.
- Derived: on the table, total in, seated / out counts, bought in, accounted for, percent
  accounted, still on the table, prizepool, entries.
- `deductions[]`: rule name, holder(s), amount; plus the rounding remainder.
- `rounding`: nearest 10 / 50 / 100 / off.
- `transfers[]`: payer, payee, amount, plus the single piggy transfer.
- Blocking rule: `canApplyMoneyRules = players.every(p => p.counted || p.cashedOut)`.

## Assets
None. Every glyph is an inline SVG stroke icon drawn in the markup: chevron right (8×13, 2px),
chevron left (12×20, 2.4px), chevron up (24 box, 2.4px), plus (24 box, 2.6px), pencil (24 box,
1.9px), check (24 box, 2.6px), arrow right (16×12, 1.8px), bill/receipt (24 box, 1.9px). Swap them
for the codebase's own icon set at the same optical sizes and stroke weights.

## Files
- `Artboards - Four Screens.dc.html` — the ten frames: 1a/1b Tonight, 2a/2b Count up (hairline
  rows), 2c/2d Count up (tinted blocks), 3a/3b Results, 4a/4b Settle up, 4c/4d night's-net chip
  detail. Frame ids are shown as badges above each frame.
- `support.js` — runtime needed to open the HTML file locally.
