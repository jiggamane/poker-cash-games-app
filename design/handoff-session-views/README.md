# Handoff: Past session — three views of one player list

## Overview
The screen a player opens from Sessions to read a finished cash game. Eight players, one line each,
all on screen without scrolling. A single control in the meta line switches how the same list is
read:

1. **Final, detailed** — settled nets, every spend itemised per player. Default.
2. **Final, grouped** — settled nets, spends collapsed to one figure.
3. **On table** — chips in, chips out. Result before spends; no deductions applied.

The rank line never moves between views. Only the annotation line under each name and the block
under the table change.

## About the design files
`Artboards - Session Views.dc.html` is a **design reference created in HTML** — intended look and
structure, not production code to lift. Recreate it in the target codebase (SwiftUI, React Native,
React) with its own components and navigation. Every dimension, weight and colour is written inline
on the element, so specs read straight off the markup. Needs `support.js` (bundled) next to it;
open in a browser and pan/zoom the canvas.

**Fidelity: high.** Final colours, type, spacing and copy. The drawn status bar and home indicator
are drawings — use the platform's own.

## Frame and global rules
- Frame **393 × 852**, corner radius **46**. Safe insets 59 top / 34 bottom; the bottom 34 is
  reserved and never drawn into.
- Status row is a drawing: padding `18 30 0`, time **15/600**, battery **13/400** muted.
- Chrome is **PUSHED**: back row `Sessions` top-left, `Share` top-right (this screen is a
  destination, not a wizard step, so the top-right slot is allowed here).
- Side margin **22** throughout. No card surfaces on this screen — the list sits on the ground
  colour.
- **No rules between player rows, no chevrons.** Row separation comes from the 60px row height
  alone. This is the whole point of the layout: an earlier version fenced every row and read as
  noise.
- One flexible region: the player list. Everything below it (block + footer + home indicator) is
  intrinsic. With 8 players the list is exactly 480 and the screen has no slack; at 9+ players the
  list scrolls and the block below stays pinned.
- Figures are never abbreviated and always tabular. Minus sign is a real `−`, not a hyphen.
- Only two things are at full brightness: the **name** (white) and the **right-hand figure**
  (win/loss). Everything else on a row is annotation.

## Type
**Figtree** (SF Pro on device), weights 400 / 500 / 600 / 700 / 800.

| Role | Spec |
| --- | --- |
| Screen title (the date) | 32 / 800, letter-spacing −.03em |
| Back-row label | 17 / 500 · `Share` 16 / 700 |
| Meta line | 14 / 400 muted |
| View control label | 13 / 600 |
| Player name | 17 / 400 |
| Right-hand figure | 17 / 600, tabular |
| Rank number | 13 / 400 dim, fixed 15 wide |
| Annotation figure | 12.5 / 400 (12 inside the tinted spend group) |
| Block section label | 11 / 700, tracking .13em, uppercase |
| Block row | label and figure 13 / 400, holder 13 / 400 bone |
| Block total | 13 / 600 |
| Footnote | 12 / 400, line-height 1.45 |
| Menu item | 14 / 400 (600 when active) over sub-line 11.5 / 400 bone |
| Button label | 15 / 700 |

## Design tokens (dark)
| Token | Value | Used for |
| --- | --- | --- |
| ground | `#0A0A0B` | screen |
| bezel | `#07080A` | frame only, not app |
| surface | `#16161A` | closed view control |
| surface active | `#2A2A33` | open view control button |
| menu | `#191920` | dropdown panel |
| menu row active | `#22222A` | checked menu row |
| tint | `#15151A` | spend group pill (10a) |
| text | `#FFFFFF` | player name, title |
| bright | `#F0EDE4` | block figures, button label |
| muted | `#8B8D93` | meta line, section labels, footnotes |
| dim | `#5E6067` | rank number |
| **bone** | `#8C8578` | all annotation figures and holder names |
| **bone stroke** | `#6E6A62` | all annotation glyph strokes |
| win | `#6FCF97` | positive figure |
| loss | `#F0705C` | negative figure |
| hairline | `rgba(255,255,255,.11)` | above the block |
| outline button | `1px rgba(255,255,255,.16)` | footer button |

Bone is deliberately warm grey-brown, not white and not the brighter `#D9D3C4` used elsewhere in
the app: the annotation line must sit clearly under the name in the reading order.

### Geometry
Radius: view control **8**, menu **12**, spend group **8**, footer button **8**, frame **46**.
Menu width **226**, offset **34** below the control, right-aligned to it, shadow
`0 18px 40px rgba(0,0,0,.55)`, 1px border at 9% white. Home indicator 140 × 5, radius 3.

## Layout, top to bottom
1. Status row (drawing).
2. Back row, padding `14 20 4`: 11 × 18 chevron-left + `Sessions` 17/500 · `Share` 16/700 right.
3. Title, padding `6 22 2`: the date, 32/800.
4. Meta line, padding `8 22 14`: `Settled · 3h 40m · 8 players` 14/400 muted, then the **view
   control** pushed right.
5. Player list, margin left/right 22, flexible. Each row is 60 tall, two lines, gap 5:
   - **Rank line** — rank (15 wide, dim) · gap 14 · name · figure right.
   - **Annotation line** — padding-left 29 (aligns under the name), all bone: buy-in with a
     down-arrow glyph, cash-out with an up-arrow glyph, then the view-specific right-hand item.
6. Block under the table, margin `10 22 0`, hairline above, padding-top 12, gap 8.
7. Footer button, padding `12 22 10`, 45 tall, outlined, full width.
8. Home indicator row.

## The three views

### a · Final, detailed (default)
- Right-hand figure: the **settled net** (game result less that player's spend share).
- Annotation line, right side: a **tinted group** (`#15151A`, radius 8, padding `3 9`, gap 9) of
  the spend marks the player actually incurred, each with its own figure at 12px. A category with
  no amount is omitted, not shown as zero (Eva has no drinks).
- Block: `DEDUCTIONS` label with the session total `$778` right, then one row per category —
  glyph · label · who fronted or collects (bone) · amount.

  | Category | Holder | Amount |
  | --- | --- | --- |
  | Food | Dana fronted | $432 |
  | Drinks | Lena fronted | $162 |
  | Piggy | jar collects | $184 |

- Button: `Who pays whom →`.
- The tinted group is a single tap target and opens the deductions detail.

### b · Final, grouped
- Same nets as (a).
- Annotation line, right side: the three marks with **no individual figures**, then one bone figure
  — that player's total share of spends. Five figures a row instead of seven.
- Same block and button as (a).

### c · On table
- Right-hand figure: **cash-out less buy-in** — the result *before* spends. This column **sums to
  zero**; that is the check that the game half of the night is sound.
- Annotation line, right side: the words `before spends` in bone. No spend marks — spends do not
  exist in this view.
- Block: `CHIPS` label with `balanced` right, then `In · 12 buy-ins · $5,500` and
  `Out · 8 counted · $5,500`, then the footnote `$778 of spends is not applied in this view.`
- Button: `See the final result →` (switches the view to (a)).

## The view control
Closed: `surface` fill, radius 8, padding `6 10 6 11`, label 13/600 in `bright`, 11px chevron-down
in muted. The label is always the **active state's name**, never a static word.

Open (frame d): the button switches to `surface active` with white label and a chevron-up; the menu
opens **anchored to the control**, not as a sheet — right-aligned, 34 below, 226 wide. Three rows,
each 13-wide check column + label over sub-line:

| Label | Sub-line |
| --- | --- |
| Final, detailed | every spend itemised |
| Final, grouped | spends as one figure |
| On table | chips in, chips out |

The active row is filled `#22222A` with a check and a 600-weight label. Everything behind the menu
(list and block) drops to **32% opacity**; the chrome above it does not. Tapping outside or picking
a row closes it. Picking a row changes only the annotation line, the block and the button — the
rank line is untouched, so the list must not re-animate.

## The arithmetic for this night
Buy-ins **$5,500** over 12 buy-ins; cash-outs **$5,500**. Spends **$778** = food $432 + drinks $162
+ piggy $184. Food and piggy split 8 ways ($54 and $23 each); drinks are itemised per player and
sum to $162 (Eva took none).

| Player | In | Out | Before spends | Spends | Final net |
| --- | --- | --- | --- | --- | --- |
| Dana | 500 | 2,120 | +1,620 | 101 | **+1,519** |
| Lena | 500 | 930 | +430 | 89 | **+341** |
| Petr | 800 | 950 | +150 | 95 | **+55** |
| Eva | 500 | 320 | −180 | 77 | **−257** |
| Marek | 700 | 490 | −210 | 107 | **−317** |
| Jakub | 600 | 300 | −300 | 95 | **−395** |
| Tomáš | 700 | 320 | −380 | 113 | **−493** |
| Ivan | 1,200 | 70 | −1,130 | 101 | **−1,231** |

`before spends` sums to 0. `spends` sums to 778. `final net` sums to −778 — the amount that left
the table for food, drinks and the jar.

## Interactions
- Row tap opens that player's detail. The tinted spend group in (a) opens the deductions detail
  instead.
- `Share` exports the night; `Who pays whom` opens the transfer list.
- The chosen view **persists per user**, not per session — reopening any past session uses the last
  view picked.
- Rank order is by final net in views (a) and (b), by result-before-spends in (c). The order can
  therefore differ between views; that is intended, and no row animation is required when it does.

## State
- `session`: date, start/end, elapsed, status, playerCount, buyInTotal, cashOutTotal.
- `players[]`: name, buyIn, cashOut, spendShare (per category), finalNet, resultBeforeSpends.
- `deductions[]`: category, holder, amount, splitRule.
- `viewMode`: `finalDetailed` | `finalGrouped` | `onTable` (persisted).
- Derived: rank per view, spend total, chips balanced check.

## Assets
None. Every glyph is an inline SVG stroke icon: chevron-left (12 × 20, 2.3px), chevron-down/up
(20 box, 2.2px), check (20 box, 2.3px), arrow-down-to-line and arrow-up-from-line (20 box, 1.7px),
plus the three spend marks — food (fork/knife), drinks (glass), piggy (coin). Annotation glyphs are
13px (12px inside the tinted group) with 1.7px strokes in bone stroke. Swap for the codebase's icon
set at the same optical size and weight.

## Files
- `Artboards - Session Views.dc.html` — frames 10a Final detailed · 10b Final grouped ·
  10c On table · 10d control open.
- `support.js` — runtime needed to open the HTML locally.
