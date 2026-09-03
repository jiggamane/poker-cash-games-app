# Handoff: The Poker Club — the mixed player list rule

## Overview
Six screens of a home cash-game ledger share one problem: a list where some players still have
money on the table and some are finished (counted or cashed out). This package sets **one rule**
for how that division is drawn, and shows it applied to every screen in the app that has it.

The rule:

- **Active** — a player who still has chips — is a **plain hairline row**, full-strength name,
  and something to do at the right edge.
- **Finished** — counted or cashed out — is a **tinted slab**, muted name, the fact on the same
  line, the signed result at the right, and **nothing tappable**.

The slab is what says "settled", so the section label stays short (name + count) and never has to
carry the meaning in words. `RESULT BEFORE DEDUCTIONS` is no longer appended to any label.

## About the design files
`Player List Rule.dc.html` is a **design reference created in HTML** — a prototype showing
intended look and structure, not production code to lift. Recreate these screens in the target
codebase's environment (SwiftUI, React Native, React, etc.) with its own patterns and components.

Every dimension, weight and colour is written inline on the element, so values can be read
straight off the markup. The file needs `support.js` (bundled) beside it to open; it is a
pan/zoom canvas — the second section is the rule and its reference pair, the first section is the
three additional screens.

## Fidelity
**High fidelity.** Final colours, typography, spacing and copy. The deliberately loose parts are
the drawn system status bar (a drawing, not a component — use the platform's real status bar) and
the home indicator.

---

## The two row treatments

### Active row
| | |
| --- | --- |
| Fill | none |
| Divider | 1px hairline **under** each row |
| Padding | `10 0` |
| Height | **44** |
| Layout | single line, `display:flex`, `align-items:center`, **gap 9** |
| Name | 17 / 700 in **text** |
| Fact | 13 / 400 in **dim**, immediately beside the name — **never stacked under it** |
| Right edge | the affordance: em dash 19/700 dim + 17px amber pencil, or a buy-in figure 19/700 + 8×13 chevron, or a chevron alone |

The fact is the money the player has in (`in $1,500`, `in $1,000 · 2 buy-ins`).

### Finished slab
| | |
| --- | --- |
| Fill | **surface** |
| Radius | **8** |
| Padding | `8 14` |
| Gap between slabs | **5** |
| Height | **39** — deliberately under 44, because nothing here is tappable |
| Layout | single line, gap 9 |
| Name | 17 / 700 in **muted** |
| Fact | 13 / 400 in **dim** beside the name |
| Result | 19 / 700 in **win / loss**, right-aligned |
| Glyphs | none — no chevron, no check, no hairline |

The fact is whatever finished them: `counted $960`, `23:15`, or `23:15 · out $2,120`.

### Group order and labels
- Active group first, then finished groups, newest work first.
- Label 11 / 700, tracking .1em, uppercase, muted. Padding `10 0 4` (`0 0 4` above the first).
- Label text is **name + count only** (`COUNTED · 3`, `CASHED OUT · 1`).
- **One exception:** E2b Where everyone stands puts the finished group **first** — see below.
- Results and Settle up have no division at all: everyone there is finished.

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
| sheet scrim | `rgba(0,0,0,.55)` |
| grabber | `rgba(255,255,255,.28)` |

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
| sheet scrim | `rgba(12,13,15,.42)` |
| grabber | `rgba(12,13,15,.24)` |

Washes: win/loss tint 14% alpha on dark, 10–11% on bright.

## Frame and global rules
- Frame **393 × 852** (iPhone 16 / 15 / 14 / 13), corner radius **46**.
- Safe insets **59 top**, **34 bottom**; the bottom 34 is a reserved row, never drawn into.
- Status row is a drawing of the system bar: padding `20 30 0`, time 15/600, battery 13/400.
- Side margin **20** for card stacks and buttons, **22** for plain rows and body copy.
- All vertical slack goes into **one** flexible spacer directly above the footer.
- Chrome is either **PUSHED** (round 38 back button top-left, **nothing** top-right) or a
  **SHEET** (grabber 38 × 5, close button, radius `26 26 0 0`). Never mixed.
- Figures are never abbreviated (`$1,540`, not `1.5k`). All figures tabular.
- Radius: card 14, slab 8, button 12, pill 999, back button 19 (38 circle), sheet 26 top.
- Buttons 52 tall (50 when blocked), radius 12; outlined = 1.5px border at 45% of text colour.

## Type
**Figtree**, 400 / 500 / 600 / 700 / 800.

| Role | Spec |
| --- | --- |
| Screen title | 30 / 800, letter-spacing −.03em (line-height 1.06 when it wraps) |
| Card figure, large | 40 / 800, −.04em · medium 30 / 800, −.035em |
| Section label | 11 / 700, tracking .1em, uppercase |
| Player name | 17 / 700 |
| Money in a list row | 19 / 700 |
| Row fact / sub-line | 13 / 400 |
| Card sub-line | 12.5 / 400 |
| Lede paragraph | 14.5 / 400, line-height 1.5 |
| Back-row label | 17 / 500 |
| Primary button | 18 / 700 · secondary 17 / 700 |
| Rank numeral | 13 / 700 dim, fixed **16px** column |
| Avatar initial | 15 / 700 muted in a 36 circle |

---

## The screens

### Count up — the reference (frames 1a dark / 1b bright)
Step 1 of 3, pushed. This is the screen the rule was taken from.

1. Status row.
2. Back row, padding `18 22 6`: back button 38 · `Tonight` 17/500 muted · 19px home glyph at the
   right (this screen only — it is the one place the pushed rule is bent, carried over from the
   original drawing).
3. Title row, padding `0 22 8`: `Count up` 30/800 · `1 of 3` 14/600 muted right.
4. **Balance card** — surface, radius 14, margin `0 20 10`, padding `12 18`, **fixed height 140**.
   Two halves split by a 1px vertical hairline, gap 16: `BOUGHT IN` **$7,000** 30/800 over
   `8 players · 11 buy-ins` 12.5/400 dim · `ACCOUNTED FOR` **$5,460** over
   `3 counted · 3 cashed out`. Pushed to the bottom of the card: progress bar (8 tall, radius 3,
   track = hairline, fill = amber at **78%**), then `78% accounted for` left /
   `$1,540 still on the table` right, 12.5/400 muted.
   **The height is fixed on purpose** — identical while counting, when balanced and when off
   balance, so entering a stack never reflows the list beneath. Content occupies 124 of the 140.
5. Three groups, margin left/right 22:
   - `STILL TO COUNT · 2` — active rows. Petr `in $1,500` · Lena `in $1,000`, each with em dash +
     pencil.
   - `COUNTED · 3` — slabs. Marek `counted $960` +$460 · Ivo `counted $220` −$780 ·
     Eva `counted $1,340` +$340.
   - `CASHED OUT EARLIER · 3` — slabs. Dana `23:15` +$1,620 · Jakub `22:48` −$300 ·
     Tomáš `23:02` −$380.
6. Footer, margin left/right 20, hairline above, padding-top 12, gap 8: underlined text link
   `See where everyone stands` (14/600 bone, underline offset 3), a **blocked** primary
   `Apply the money rules` (50 tall, raised fill, dim label), and the reason
   `Two stacks still to count.` 13/400 dim, centred.
7. Home indicator row, 34.

Nothing scrolls: at these paddings all eight players and the footer fit the frame.

### Tonight (frames 1c dark / 1d bright)
Live session, pushed. The rule applied to the in-game screen.

1. Status row.
2. Title row, padding `20 22 14`, gap 11: back button 38 · `Tonight` 30/800 · running-time pill ·
   `started 20:05` 13/400 muted at the right edge.
   Pill: radius 999, padding `6 10`, win wash, 6px win dot, `3h 17m` 12/700 win.
3. Header card, surface, radius 14, margin `0 20 18`, padding `16 20`, bottom-aligned: left
   `On the table` 15/500 muted over **$2,880** 40/800; right stack `$5,000 total in` 13.5/500
   muted and `5 seated · 1 out` 13.5/400 dim.
4. Two groups, margin left/right 22:
   - `STILL PLAYING · 5` — active rows, right edge is the buy-in figure 19/700 text + chevron.
     Petr $1,500 · Ivo $1,000 · Lena $1,000 · Marek $500 · Tomáš $500.
   - `CASHED OUT · 1` — one slab: Dana `23:15 · out $2,120` **+$1,620**.
5. Flexible spacer.
6. Footer, margin left/right 20: `Table admin` disclosure row (padding `12 2`, hairline above,
   16px chevron-up, label 14/600 muted, `seat · cash out · end` 13/400 dim right), then a
   `1.9fr 1fr` grid gap 10 of a filled **+ Rebuy** (52 tall, inverted fill, 19px plus glyph) and an
   outlined **Bill**.
7. Home indicator row, 34.

**Two changes the rule forces here.** The cashed-out row loses its chevron — it is finished, there
is nothing to open. And its fact drops `in $500` so name, fact and figure fit one line; the buy-in
already has its own column above. The label shortens to `CASHED OUT · 1`.

### N8 Cash out · pick a player (frames 2a dark / 2b bright)
Pushed. The plainest case.

1. Status row · back row `18 22 6` (`Tonight`) · title `Cash out` 30/800, padding `0 22 6`.
2. Lede, padding `0 22 16`: `Pick who is leaving. Their chips get counted on the next screen.`
3. `SEATED · 5` — active rows, right edge is a **chevron alone** (the row is the picker; there is
   no figure to show at the right because the fact already carries it).
   Petr `in $1,500` · Ivo `in $1,000` · Lena `in $1,000 · 2 buy-ins` · Marek `in $500` ·
   Tomáš `in $500`.
4. `CASHED OUT · 1` — one slab: Dana `23:15 · out $2,120` +$1,620.
5. Flexible spacer, then the home indicator row. No footer button — picking a row advances.

**Why the slab is here at all:** so the host cannot cash the same person out twice. It carries the
result and no affordance.

### E2b Where everyone stands (frames 2c dark / 2d bright)
Pushed, reached from the Count up footer link. **The one inversion.**

1. Status row · back row `18 22 6` (`Count up`) · title `Where everyone stands` 30/800,
   line-height 1.06, padding `0 22 8`.
2. Lede, padding `0 22 14`: `Nothing has come off the table yet — the bill and the piggy bank land
   at the next step. Ranks are provisional until every stack is counted.`
3. `RANKED · 6` — **finished slabs first**, because only a final result can be ranked. Each slab
   gains a rank numeral in a fixed 16px column before the name (13/700 dim).
   1 Dana `23:15` +$1,620 · 2 Marek `counted $960` +$460 · 3 Eva `counted $1,340` +$340 ·
   4 Jakub `22:48` −$300 · 5 Tomáš `23:02` −$380 · 6 Ivo `counted $220` −$780.
   Cashed-out-earlier players rank alongside counted ones — their result is equally final.
4. `NOT COUNTED YET · 2` — active rows below, unranked, with an **em dash 19/700 dim in the same
   16px numeral column**. Petr `in $1,500` · Lena `in $1,000`. No affordance at the right: this
   screen is read-only.
5. Flexible spacer · outlined `Back to the count` 52 tall · home indicator row.

### E1 End the night (frames 2e dark / 2f bright)
**Sheet.** Appears when the host taps *End this poker night* with stacks still uncounted. Proves
the rule survives an avatar.

1. The Tonight screen behind, dimmed to **32% opacity**, with the scrim over the sheet area.
2. Sheet: ground fill, radius `26 26 0 0`, 1px top hairline as a shadow. Grabber 38 × 5 centred,
   padding `10 0 4`; **close button** 38 circle in surface at `right 16, top 8` with a 13px cross.
3. Title `Five players still have chips` 30/800, line-height 1.06, padding `14 22 8`.
4. Lede, padding `0 22 14`: `Nothing closes until every stack is counted. You can count them
   together, one at a time.`
5. `STILL TO COUNT · 5` — active rows, each with a **36 circle avatar** (surface fill, initial
   15/700 muted) **before** the name. Petr `in $1,500` · Ivo `in $1,000` · Lena `in $1,000` ·
   Marek `in $500` · Tomáš `in $500`. No affordance at the right.
6. `CASHED OUT · 1` — one slab: Dana `23:15 · out $2,120` +$1,620. **The slab never gets an
   avatar** — that is what keeps the two treatments distinct at a glance in a list this dense.
7. Footer, margin `18 20 0`, gap 10: filled `Count them up` 52 tall, then a plain text
   `Not yet` 15/600 muted, centred, padding `4 0`.
8. Home indicator row, 34.

---

## Screens deliberately NOT on this rule
- **N4 Buy-in · pick a player** divides **seated from never-seated**, which is a different axis —
  nobody in either group is finished. It keeps its existing chip treatment.
- **X1a Watching a live night** shows a **feed of entries**, not a player list.
- **Results** and **Settle up** have no division: every player on them is finished.

## Two proposals to confirm
Both go beyond what the existing docs specify, and either can be pulled back:

1. **E1 previously listed only uncounted players.** The cashed-out slab is new here — it answers
   "who is already done" without leaving the sheet.
2. **E2b's ranked group was counted players only.** Ranking six instead of three follows from
   treating both finished states alike.

## Interactions
- **Active rows** are tappable wherever they carry an affordance: the pencil (Count up) opens
  stack entry; the chevron (Tonight, N8) opens the player or picks them. E1 and E2b active rows
  are not tappable.
- **Finished slabs are never tappable** on any screen — no chevron, no press state, no ripple.
- **On transition** (a stack is counted, a player cashes out) the row leaves the active group and
  is inserted into the finished group as a slab. On Count up the balance card must not change
  height while this happens.
- **Count up's primary** stays blocked until the active group is empty; the reason line underneath
  always names what is missing (`Two stacks still to count.`).
- **E2b's ranking** re-sorts as stacks are counted; the lede says ranks are provisional so the
  movement is expected.
- **E1 is dismissible** three ways: close button, grabber drag, and `Not yet`.

## State
- `players[]`: name, initial, buy-ins (count and total), cashed-out at, cashed-out amount, counted
  amount, result.
- Per player, derived: `isFinished = counted != null || cashedOut != null` — the single flag that
  chooses row versus slab, and the only thing the treatment depends on.
- `finishedFact`: `counted $X` when counted, `HH:MM` when cashed out earlier, `HH:MM · out $X`
  when the screen has room and the buy-in has no column of its own.
- Groups derive from the flag; counts in the labels derive from group length.
- Derived per screen: on the table, total in, seated / out counts, bought in, accounted for,
  percent accounted, still on the table, provisional rank order.

## Assets
None. Every glyph is an inline SVG stroke icon: chevron right (8×13, 2px), chevron left (12×20,
2.4px), chevron up (24 box, 2.4px), plus (24 box, 2.6px), pencil (24 box, 1.9px), home (24 box,
1.9px), cross (14 box, 2.2px). Swap for the codebase's own icon set at the same optical sizes and
stroke weights.

## Files
- `Player List Rule.dc.html` — 1a/1b Count up (the reference), 1c/1d Tonight, 2a/2b N8 Cash out,
  2c/2d E2b Where everyone stands, 2e/2f E1 End the night. Frame ids show as badges above each
  frame; the rule and the per-screen notes are written on the board itself.
- `support.js` — runtime needed to open the HTML file locally.
