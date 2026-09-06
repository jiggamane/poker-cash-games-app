# Handoff: Count up — header block (E2)

## Overview

The header block at the top of **Count up** (step 1 of 3 in settle-up) compares two sums: the money that went in (**bought in**) and the money the admin has accounted for so far (**accounted for** = counted stacks + cash-outs already taken). The shipped version sets both sums as 44px display figures in two half-width columns, so a five-figure lari amount truncates to `₾47,0…` — the screen's one job becomes unreadable at exactly the moment the numbers get big.

This handoff replaces that block. **The gap between the two sums becomes the headline; the two sums stay in full underneath at text size.** Nothing in the block can truncate, at any digit count up to nine digits.

Only the header block changes. The screen's chrome (back button, "Count up", "1 of 3"), the rounding row, the group headers, the player list and the `Next` button are untouched.

## About the design files

`reference/Count Up Header.dc.html` is a **design reference created in HTML** — a prototype showing intended look and measurements, not production code to copy. Recreate the block in the app's existing environment (the Count up screen as it is already built), using its established components, colour constants and number formatter. Open the file in a browser to inspect it; `support.js` sits beside it so it renders standalone.

The file shows three explorations side by side. **Option `1b`, the middle column, is the decision.** `1a` (stacked rows) and `1c` (two bars on one scale) are recorded exploration — do not build them.

## Fidelity

**High fidelity.** Colours, type sizes, weights, paddings and radii below are final and measured off the frames. Match them. Where a value here disagrees with the HTML, the HTML is the truth.

## The block, top to bottom

Container: full-width card inset `20px` from the screen edges, `margin-bottom:16px`, `border-radius:14px`, `background:#16161A`, `1px` border in the state colour at reduced alpha, `overflow:hidden`. Inner padding `16px 18px 14px`, vertical stack, `gap:12px`.

**1 — Headline row.** One row, items bottom-aligned (`align-items:flex-end`).

- Left: the signed gap. `font-weight:800`, `line-height:1`, `letter-spacing:-.03em`, tabular figures, `white-space:nowrap`. Size is fluid: `clamp(24px, 9.5cqi, 38px)` against the card's inner width (the padding box is the container, `container-type:inline-size`). 38px is the normal size; long values scale down to a 24px floor instead of truncating or wrapping. If container query units are not available in the target environment, compute the same result: 38px up to 8 glyphs, stepping down to 24px at 13 glyphs.
- Right, pushed by `margin-left:auto`: the percentage accounted for. `font-weight:700`, `15px`, tabular figures, same colour as the headline figure.
- Colour: coral `#F0705C` when over or short, green `#6FCF97` when balanced.
- No eyebrow label and no explanatory caption. The sign, the colour and the percentage carry the state.

**2 — Progress line.** `height:8px`, `border-radius:3px`, `overflow:hidden`, two segments in a flex row with `gap:2px`, each segment's `flex` set to its raw amount so the bar is drawn to a real scale:

| State | Segment 1 | Segment 2 |
|---|---|---|
| Over | `flex: bought_in`, `rgba(255,255,255,.34)` | `flex: overage`, `#F0705C` |
| Short | `flex: accounted_for`, `#F0705C` | `flex: shortfall`, `rgba(240,112,92,.22)` |
| Balanced | single segment, `flex:1`, `#6FCF97` | — |

**3 — The two sums.** Stack, `gap:7px`. Each row: caption left (`font-weight:500`, `13.5px`, `#8B8D93`, `flex:1; min-width:0`), amount right (`font-weight:700`, `18px`, tabular figures, `white-space:nowrap`). The caption is what compresses when space runs short; the amount never does.

- Row 1 — `Bought in · {n} players` → amount in `#FFFFFF`.
- Row 2 — `Accounted for · {n} counted` → amount in the state colour. The count is counted stacks **plus** players who cashed out earlier in the night, added together — cash-outs are not called out separately. When stacks are still uncounted the clause reads `{n} counted, {n} still to count`.
- **Buy-in / rebuy counts are deliberately not shown.** Player count only.

There is no verdict strip at the bottom of the card. The old `₾1,000 OVER · 102% accounted for` footer is removed — that data now lives in the headline row.

## States

Three, driven by `accounted_for − bought_in`:

| | Headline | Percentage | Colour | Border |
|---|---|---|---|---|
| Over (`> 0`) | `+₾1,000` | `102%` | `#F0705C` | `rgba(240,112,92,.5)` |
| Short (`< 0`) | `−₾2,400` | `98%` | `#F0705C` | `rgba(240,112,92,.5)` |
| Balanced (`= 0`) | `₾0` | `100%` | `#6FCF97` | `rgba(111,207,151,.45)` |

Percentage is `round(accounted_for / bought_in × 100)`. Use a true minus `−` (U+2212) for short, not a hyphen. Balanced shows `₾0` with no sign.

Four frames in the reference file, in this order: over (the live screen, with the surrounding chrome for context), eight-figure over (headline scaled down), balanced, short.

## Behaviour

The block is a live readout with no controls of its own — every value recomputes when a stack is counted, a count is corrected, or a player cashes out. The card is not tappable. State colour flips instantly; the figures and the bar move (see **Animation** below).

## The counted list

Not part of the header block, but the header cannot be built without agreeing these two rules.

**Sorting.** The **Counted** group is ranked exactly like the results screens: **by net, descending** — biggest winner at the top, biggest loser at the bottom. Net is `counted stack − money in`, the same figure the row already shows on its right. Uncounted players are not interleaved: they stay above in **Still to count**, in seating order, and only join the ranking once counted. Ties hold their previous relative order (stable sort).

With tonight's numbers the counted order is Rati +₾10,400 · Levani +₾7,300 · Vahicka +₾3,200 · Shono −₾1,100 · Goga −₾6,000 · Burdzgla −₾8,700.

**Row shape.** `padding 11 14`, `radius 10`, `#16161A`, `gap 7` between rows. Name `700 17px` white · `counted ₾4,000` `400 13px` `#8B8D93` · net `800 19px` tabular, green `#6FCF97` when `≥ 0` and coral `#F0705C` when negative · `13px` chevron `#6B6D73`.

## Animation · a stack is counted

One sequence, fired when a count is committed. It is the only animation on the screen, and it exists to answer "where did that player land?" without the admin re-reading the list.

| # | What moves | From → to | Timing |
|---|---|---|---|
| 1 | **The counted row** | from the vertical position of its *Still to count* row down into its rank slot; `opacity .55 → 1` | 620ms, `cubic-bezier(.32,.72,0,1)` |
| 2 | **Rows below the insertion point** | translate from their old position to their new one (FLIP: measure before, measure after, animate the delta) | 560ms, same curve, staggered `index × 26ms` down the list |
| 3 | **The arrived row's fill** | `rgba(111,207,151,.28)` held to 45% of the sequence, then to `#16161A` | 1300ms, ease-out |
| 4 | **Header bar segments** | `flex-grow` from old ratio to new | 560ms, same curve |
| 5 | **Headline figure and percentage** | new value, colour swapped instantly if the state changed | no tween on colour |

Notes for implementation:

- Animate **transforms only** for 1 and 2 — never `top`, `margin` or list re-layout per frame.
- The stagger runs top-to-bottom by DOM order, so the list reads as a single settling motion rather than six independent rows.
- Nothing animates on first paint, on a correction that does not change rank, or when a row's rank is unchanged (zero delta is skipped).
- Under **Reduce Motion**: keep step 3 (the green fade) and drop 1, 2 and 4 — the row appears in its rank slot directly.
- On a correction that *does* change rank, run the same sequence without step 1's fade — the row is already visible, so it only travels.

Overflow guarantee to keep: at the 393pt reference width the card's inner width is 317pt. Verify the headline at nine digits (`+₾123,456,789`) and both sum rows at nine digits still fit without ellipsis on the narrowest supported device.

## Design tokens

| Token | Value | Use |
|---|---|---|
| Screen background | `#0A0A0B` | behind the card |
| Card | `#16161A` | header block, list rows |
| Hairline | `rgba(255,255,255,.11)` | rounding row top border |
| Ink primary | `#FFFFFF` | title, bought-in amount |
| Ink secondary | `#8B8D93` | captions, group headers, `1 of 3` |
| Alert | `#F0705C` | over and short |
| Confirm | `#6FCF97` | balanced |
| Bar track (over) | `rgba(255,255,255,.34)` | bought-in portion |
| Bar track (short) | `rgba(240,112,92,.22)` | unaccounted portion |
| Radius | `14px` card · `3px` bar | |
| Type | SF Pro Display 800 for figures, SF Pro Text 500/700 for captions and sums | tabular figures everywhere money appears |

Currency is Georgian lari `₾`, symbol before the figure, thousands separated by comma, no decimals.

## Files

- `reference/Count Up Header.dc.html` — the three explorations; build `1b` (middle column) only. **`1b`'s first frame is interactive**: tap `Count ₾3,900` on Shono's dashed row to run the full sequence — the list re-ranks, the header goes from `−₾2,900 · 94%` short to `+₾1,000 · 102%` over. `Replay` resets it. The three frames beneath it are static specimens.
- `reference/support.js` — runtime for the file above; no product code.
- `screenshots/1b-all-states.png` — the four `1b` frames as rendered (over with chrome, eight-figure over, balanced, short).

## Not in scope

The rounding row's own sheet, the `See where everyone stands` link, the `Next` action, and steps 2 and 3 of settle-up.
