# E6 results row — format `7a`

**Cut 1 September 2026.** The chosen row for the settled screen. Board:
`boards/Result Formula Options.dc.html`, turn 7 — frame `7a` dark, `7g` its bright twin. Frames `7b`–`7f`
on the same turn are the alternatives it was chosen against; do not build them.

## The row

One row per player. Name and the three terms stack on the left, the net sits hard right.

    Petr                                        +$315
    game +$150 · food +$188 · piggy −$23

Terms are always in this order — `game`, `food`, `piggy` — and always carry a sign, including `game`. The
separator is a middot with a space either side. Every figure is tabular.

## Geometry

The list sits in the region `margin: 10px 22px 0` inside the 393 × 852 frame, so the content width is
**349**. The kicker (`NET, AFTER DEDUCTIONS`) is a `flex: none` sibling above the scrolling list.

| | |
|---|---|
| Row height | **50** — 6 padding, 19 name, 3 gap, 15 sub-line, 6 padding, 1 hairline |
| Row padding | `6px 4px` |
| Divider | hairline on **top** of every row, including the first |
| Name | 600 16px, primary text |
| Sub-line | 400 12.5px, muted, tabular, `white-space: nowrap` |
| Gap, name to sub-line | 3 |
| Net | 700 17px, tabular, money green or money red, `margin-left: auto` |
| Gap, text block to net | 12 |
| Kicker | 700 12px, `letter-spacing: .1em`, uppercase, muted, `padding: 0 4px 7px` |

Eight rows measure **406** against a **406** viewport — the full table clears the fold with nothing to
scroll. This is the reason the format was chosen, so **do not add vertical padding to the row.** At nine
players or more the list scrolls and needs the fade below.

## The fade

`7a` at eight players has **no mask**. Add one only when the content genuinely overflows:

```css
mask-image: linear-gradient(#000 calc(100% - 30px), transparent);
-webkit-mask-image: linear-gradient(#000 calc(100% - 30px), transparent);
```

30px, applied to the scrolling container. A hard cut through the middle of a row is not acceptable; neither
is a fade over content that fits, which falsely signals more players below.

## Markup — dark

Quoted to pin values, not to paste. Font stack throughout is
`-apple-system, 'SF Pro Text', 'Figtree', sans-serif`.

```html
<div style="display:flex;align-items:center;gap:12px;padding:6px 4px;
            border-top:1px solid rgba(255,255,255,.11)">
  <div style="display:flex;flex-direction:column;gap:3px;min-width:0">
    <span style="font:600 16px …;color:#FFFFFF">Petr</span>
    <span style="font:400 12.5px …;color:#8B8D93;
                 font-variant-numeric:tabular-nums;white-space:nowrap">
      game +$150 · food +$188 · piggy −$23
    </span>
  </div>
  <span style="margin-left:auto;font:700 17px …;color:#6FCF97;
               font-variant-numeric:tabular-nums">+$315</span>
</div>
```

## Markup — light

Same geometry, four substitutions.

```html
<div style="display:flex;align-items:center;gap:12px;padding:6px 4px;
            border-top:1px solid rgba(12,13,15,.1)">
  <div style="display:flex;flex-direction:column;gap:3px;min-width:0">
    <span style="font:600 16px …;color:#0C0D0F">Petr</span>
    <span style="font:400 12.5px …;color:#6B6F76;
                 font-variant-numeric:tabular-nums;white-space:nowrap">
      game +$150 · food +$188 · piggy −$23
    </span>
  </div>
  <span style="margin-left:auto;font:700 17px …;color:#0A7A3D;
               font-variant-numeric:tabular-nums">+$315</span>
</div>
```

## Tokens

| Role | Dark | Light |
|---|---|---|
| Surface | `#0A0A0B` | `#FFFFFF` |
| Primary text | `#FFFFFF` | `#0C0D0F` |
| Muted text | `#8B8D93` | `#6B6F76` |
| Dim text (column heads, footnotes) | `#6E7076` | `#8A8D94` |
| Hairline | `rgba(255,255,255,.11)` | `rgba(12,13,15,.1)` |
| Money green | `#6FCF97` | `#0A7A3D` |
| Money red | `#F0705C` | `#B03A28` |

Muted at 12.5px is the smallest text on the screen and sits at the contrast floor in both themes. Do not
take the sub-line any lighter, and do not take it below 12.5px.

## Colour rule

Colour is carried by the **net only**. Name, sub-line and dividers are neutral in every row. A row is never
tinted, filled or badged by its outcome — the earlier turn-1 frames used a green or red row wash and it was
dropped: at eight rows the screen turned into stripes and the net stopped being the thing you read.

Green for `net > 0`, red for `net < 0`. `net = 0` renders in primary text, not green.

## Zero and negative-zero

A term that is exactly zero still prints, as `$0` with no sign — `game $0`. Never omit a term to save
width; the row's whole argument is that the same three terms appear in the same order for everybody.

## Truncation — open

The sub-line is `nowrap` inside a `min-width: 0` flex item and nothing clips it today. The widest case drawn
is Dana at `game +$1,620 · food −$54 · piggy −$23` — **227** against **261** available (349 content, less 8
row padding, 12 gap and 67.5 for the net), so it fits at four-digit sums and short names. It will not fit a five-digit game figure or a long name.

Pick a rule before shipping. The two candidates:

1. **Ellipsis the sub-line** — `overflow: hidden; text-overflow: ellipsis` on the sub-line, name never
   truncates. Loses the piggy term first, which is the least informative.
2. **Truncate the name** — name gets `overflow: hidden; text-overflow: ellipsis`, sub-line always complete.
   Keeps the maths whole at the cost of `Bartoloměj` becoming `Bartolo…`.

Recommendation: **2**. The name is recoverable from context at the table; a half-printed sum is not.

## Interaction

* **Tap a row** → the player's receipt, which is where both halves of the food figure are itemised
  (`Food · his share −$54`, `Food · he paid the bill +$242`) along with the rounding term. Frame `7d` on the
  board shows that receipt inline; use it as the content spec for the destination, not as the row format.
* **Full ledger** → format `7e`, the four-column table. Same four terms, same order, one figure per column.
* Rows do not reorder, expand or swipe on this screen.

## Why not the others

Recorded so the decision is not relitigated. All measured at 393 × 852 with the same eight players.

| | Rows above the fold | Why not |
|---|---|---|
| `7a` | **8 of 8** | — chosen |
| `7b` tags | 4 | 87pt rows; the night always scrolls |
| `7c` equation | 5 | most explicit, least scannable; reads as a receipt |
| `7d` receipt on tap | 6 | nothing comparable at a glance — kept as the row's destination instead |
| `7e` columns | 8 of 8 | fits, but reads as a spreadsheet; kept for *Full ledger* |
| `7f` waterfall | 1 player | best explanation, no overview |
