# Handoff: game end — settled night, status states, who pays whom

## Overview

This bundle replaces the **current game-end results screens** with three surfaces plus one sheet:

| # | Screen | Replaces |
|---|---|---|
| **1a** | **Settled night** — totals card, deductions, one ranked list behind an *At the table / Final* toggle | the current long-scroll results screen (`AT THE TABLE` → `DEDUCTIONS` → `FINAL` stacked) |
| **1a-states** | The totals card's **status** area in its three states | — (new) |
| **2a** | **Who pays whom** — the transfer list, tapped off one row at a time | the current settle-up destination of the white button |
| **sheet** | **Rounding** — Off / nearest ₾10 / ₾50 / ₾100 | the read-only `Rounding · nearest ₾10` line |

**The `Full ledger` screen is dropped.** Do not build it, do not link to it. Everything it carried
(per-player in, out, bill share, bill paid back, piggy share) now reads on one line under each player's
name on **Final**, so there is no second place to go for the same four terms.

A fourth file is included for the **balance check** that precedes all of this — the final state of
**Count up** (`CountUpEnd.dc.html`). Its player-result rows are the pattern the game-end lists follow;
it is in the bundle so the two can be checked against each other and so the rounding row has one owner.

## About the design files

The files in this bundle are **design references written in HTML** — prototypes showing the intended
look and behaviour. They are not production code to copy. The task is to **recreate these designs in the
target codebase's existing environment** (React Native, SwiftUI, whatever the app is built in), using its
established components, navigation and animation primitives. If no environment exists yet, pick the
framework that suits the project and implement the designs there.

Each `.dc.html` file opens directly in a browser. `support.js` is the tiny runtime they need; it is part
of the prototype harness only and has no counterpart in the product.

## Fidelity

**High-fidelity.** Colours, type, spacing, radii and animation timings below are final and exact.
Recreate them faithfully with the codebase's own primitives. Where a value is not stated, it is not
load-bearing.

---

## Money logic (this is the part to get right)

One model drives both lists. Per player the night stores: `in` (bought in), `out` (cashed out / counted),
`billShare`, `billPaid` (what this player fronted for a bill), `piggyShare`.

```
atTheTable = out − in
final      = atTheTable − billShare − piggyShare + billPaid
```

Rules:

1. **Deductions are split equally between the winners** — players with `atTheTable > 0`. A player at zero
   or below is charged nothing. (Worked night below: ₾200 of deductions ÷ 2 winners = ₾100 each,
   itself split ₾50 kitchen + ₾50 piggy.)
2. **Whoever paid a bill gets it back in full**, as a separate positive term — never netted into the share.
   Both terms show on the row.
3. **The finals do not sum to zero.** They sum to *minus the piggy bank*: the piggy is the only money that
   leaves the players. Use that as the assertion — `Σ final + piggyTotal === 0`.
4. **Rounding never applies to a net.** Stacks are rounded as they are entered on Count up; nets are
   computed from rounded stacks; transfers derive from the nets, so they are already multiples of the step.
   `remainder = Σ rounded − Σ raw` goes to the piggy bank and nowhere else. `countedRaw` is never
   overwritten. Changing the step recomputes from `countedRaw`, never from an already-rounded figure.
5. **Nearest, half away from zero** (₾965 → ₾970 at a ₾10 step).
6. Rounding is **owned by Count up**, displayed on the game-end screens, and **locked once the night is
   closed**. Changing it on 2a recomputes the transfers on screen.

### The worked night in the files

Four players, ₾1,500 in each, ₾6,000 in play. Deductions ₾200 — kitchen ₾100 (Goga paid it) and
group piggy bank ₾100.

| Player | in | out | At the table | bill share | bill paid | piggy share | Final |
|---|---|---|---|---|---|---|---|
| Goga | 1,500 | 2,000 | **+500** | 50 | +100 | 50 | **+500** |
| Oto | 1,500 | 2,000 | **+500** | 50 | — | 50 | **+400** |
| Andro | 1,500 | 1,500 | **0** | — | — | — | **0** |
| Levani | 1,500 | 500 | **−1,000** | — | — | — | **−1,000** |

`Σ atTheTable = 0` ✓ · `Σ final = −100`, piggy bank `+100` ✓

Transfers that clear it: Levani → Goga ₾500, Levani → Oto ₾400, Levani → piggy bank ₾100.

---

## 1a · Settled night

**Purpose.** The read-back after the night: what was in play, what came off the table, and where every
player landed — before and after deductions.

**Frame.** 402 × 874, radius 46, background `#0A0A0B`, column flex, `position: relative` (the sheet
mounts inside it). Vertical order, all `flex: none` except the list:

1. **Status bar** — padding `18px 30px 0`; time `600 15px #FFFFFF`, battery `500 13px #8B8D93`.
2. **Header** — padding `22px 20px 0`, gap 12. Back circle 38 × 38, radius 19, `#1C1C20`, chevron 17 × 17
   stroke 2.4 `#FFFFFF`. Title `800 30px/1`, letter-spacing `−.03em`, `#FFFFFF` — "Mon 7 Sep".
3. **Meta line** — padding `8px 20px 0 70px` (aligns to the title, not the back button),
   `500 13px #8B8D93`, tabular: `01:52 → 01:55 · 0h 03m · 4 players · settled`.
4. **Totals card** — margin `16px 20px 0`, background `#16161A`, border `1px solid rgba(255,255,255,.11)`,
   radius 14, padding `14px 16px`, flex, `align-items: flex-end`, gap 14.
   - Left: eyebrow `700 11px`, letter-spacing `.1em`, uppercase, `#8B8D93` — "Money in play"; figure
     `800 34px/1`, letter-spacing `−.04em`, tabular, `#FFFFFF` — `₾6,000`.
   - Right (`margin-left: auto`, column, align end, gap 6): eyebrow "Status" + **status pill** (three
     states, below).
5. **Deductions block** — margin `14px 22px 0`, column. Header row: eyebrow `700 11px .12em` uppercase
   `#8B8D93` "Deductions"; right `500 12.5px #8B8D93` tabular `₾200 total`. Then one row per deduction,
   padding `7px 0`, `border-top: 1px solid rgba(255,255,255,.11)`: name `600 14px #D9D3C4`, payer note
   `500 13px #8B8D93` ("Goga paid", "held by the group"), amount `700 15px #FFFFFF` tabular right.
   Deliberately a plain ledger, **not cards** — the ranked list stays the heaviest thing on the screen.
6. **Segmented toggle** — margin `14px 22px 0`, grid `1fr 1fr`, gap 4, padding 3, radius 12,
   background `rgba(255,255,255,.07)`. Selected: `#FFFFFF`, radius 9, padding `9px 0`,
   `700 13.5px #0C0D0F`. Unselected: `600 13.5px #8B8D93`, no fill. Labels "At the table" / "Final".
7. **List** (`flex: 1; min-height: 0`) — margin `14px 22px 0`.
   - List header: eyebrow `700 11px .12em` uppercase `#8B8D93` — "At the table" / "Final"; right caption
     `500 12.5px #8B8D93` — "before deductions" / "after deductions and compensations".
   - Row: padding `11px 0`, `border-top: 1px solid rgba(255,255,255,.11)`, flex, gap 12.
     - Name `700 17px`, letter-spacing `−.01em`, `#FFFFFF`.
     - **Spend line** (the one that replaces Full ledger) — flex, wrap, gap `2px 9px`,
       `font-size 13px`, `font-weight 500`, tabular. Terms in this order, each `white-space: nowrap`:
       `in {in}` `#F0705C` · `out {out}` `#6FCF97` · `bill {share}` `#9C9EA5` with `+{paid} back`
       `#6FCF97` appended inside the same span when the player fronted a bill ·
       `piggy bank {share}` `#9C9EA5`. **Bill and piggy terms appear on Final only**; At the table shows
       in / out.
     - Net `700 19px`, tabular, `margin-left: auto`: `#6FCF97` positive, `#F0705C` negative,
       `#8B8D93` at zero. Sign is `+` / `−` (U+2212), never a hyphen. Zero shows `₾0`, unsigned.
   - Rows **re-sort by the displayed figure** on every mode change (descending).
8. **Rounding row — Final only.** Padding `12px 0`, `border-top: 1px solid rgba(255,255,255,.11)`,
   whole row is the tap target, opens the sheet. Label `600 15px #FFFFFF` —
   `Rounding · nearest ₾10`, or `Rounding · off`. Value `600 14px #8B8D93` tabular — `on the nets`,
   or `stacks as counted`. Chevron 13 × 13 stroke 2.4 `#8B8D93`.
9. **Note** — padding `11px 0 0`, gap 9. Info glyph 14 × 14 stroke 2.2 `#8B8D93`; text
   `400 13px/1.5 #8B8D93`: "Whoever paid a bill gets it back in full below."
10. **Primary** — padding `14px 20px 0`; button `padding: 17px 0`, radius 12, `#FFFFFF`,
    `700 17px #0C0D0F`, full width: **"Who pays whom"** → 2a.
11. **Home indicator** — 140 × 5, radius 3, `rgba(255,255,255,.9)`, padding `12px 0 9px`.

### Status pill — three states

Shared by 1a and 2a, and the same figure on both. Padding `6px 11px` (`6px 11px 6px 9px` when it carries
the check), radius 8, label `700 14px`, tabular.

| State | When | Fill | Border | Ink | Content |
|---|---|---|---|---|---|
| Settled | nothing left to move | `rgba(111,207,151,.14)` | `rgba(111,207,151,.34)` | `#6FCF97` | check 14 × 14 stroke 2.8 + "Settled" |
| Part settled | some transfers marked off | `rgba(217,211,196,.13)` | `rgba(217,211,196,.32)` | `#D9D3C4` | `₾400 left` |
| Unsettled | nothing marked off | `rgba(240,112,92,.13)` | `rgba(240,112,92,.34)` | `#F0705C` | `₾1,000 left` |

The amount is the **sum of unpaid transfers**, so the pill and 2a's "Left to move" figure are the same
number by construction. Never let them be computed in two places.

---

## Rounding sheet

Reached from the rounding row on 1a (Final), on 2a, and on Count up. Bottom sheet over a scrim.

- Scrim `rgba(6,6,8,.62)`, fills the frame; tapping it dismisses **without applying**.
- Panel: `#101013`, `border-top: 1px solid rgba(255,255,255,.11)`, radius `26px 26px 0 0`,
  shadow `0 -14px 44px rgba(0,0,0,.45)`, pinned to the bottom.
- Grabber 38 × 5, radius 2.5, `rgba(255,255,255,.22)`, padding `9px 0 2px`.
- Title `800 26px/1.1`, letter-spacing `−.03em`, `#FFFFFF` — "Rounding". Body `400 13.5px/1.5 #8B8D93`,
  verbatim: *"Set it here and it governs the whole night: stacks snap to the step as they are entered, and
  the nets and transfers follow. What was counted is kept underneath. Changeable until the night is
  closed."* On 2a the body instead reads: *"Changing the step here recomputes the transfers on screen.
  What was counted is kept underneath. Changeable until the night is closed."*
- Four option rows, in this order, padding `13px 0`, `border-top: 1px solid rgba(255,255,255,.11)`:
  label `600 17px #FFFFFF`, sub-line `400 12.5px #8B8D93` tabular, selection is a **check mark**
  18 × 18 stroke 2.6 `#FFFFFF` at the right — not a radio, not a fill.

  | Row | Sub-line | Source |
  |---|---|---|
  | `Off` | `Stacks as counted · ₾6,000 counted` | the unrounded counted total |
  | `Nearest ₾10` | `No stack moves by more than ₾3` | max abs delta across counted stacks |
  | `Nearest ₾50` | `No stack moves by more than ₾22` | same |
  | `Nearest ₾100` | `No stack moves by more than ₾47` | same |

  The sub-line is the **worst single distortion, not an average** — it is the figure an admin gets asked
  about at the table. Recompute on every entry; with nothing counted it reads `no stacks counted yet`.
  `Off` is a listed option, not the absence of a choice.
- Primary **Apply**: padding `18px 0`, radius 12, `#FFFFFF`, `700 17px #0C0D0F`. Selection is staged —
  only Apply commits. Dismissing changes nothing.

---

## 2a · Who pays whom

**Purpose.** The list of transfers that clears the night, marked off as the cash actually moves.

Same frame as 1a. Order:

1. Status bar as 1a.
2. **Header** — back circle 38 × 38 as 1a; beside it a two-line stack: eyebrow
   `500 12.5px #8B8D93` "Mon 7 Sep · 4 players", title `800 28px/1` `−.03em` `#FFFFFF` "Who pays whom".
3. **Totals card** — identical construction to 1a's. Left eyebrow "Left to move", figure = sum of unpaid
   transfers. Right: "Status" + the same pill, green "Settled" at zero.
4. **Rounding row** — margin `14px 22px 0`, padding `12px 0`, hairline **top and bottom**. Label as 1a;
   value `600 14px #D9D3C4` tabular — `+₾100 → piggy` (the remainder, in bone because it is money
   leaving the players). Opens the sheet.
5. **Transfers list** (`flex: 1`) — margin `16px 22px 0`. Header: eyebrow "Transfers"; right caption
   `500 12.5px #8B8D93` tabular `{n} of 3 paid`.
   - Row: padding `14px 0`, `border-top: 1px solid rgba(255,255,255,.11)`, gap 9, **whole row is the tap
     target** and toggles paid.
   - `from` and `to` `600 16px`; arrow glyph 15 × 11, stroke 1.8; amount `700 18px` tabular
     (`margin-left: auto`).
   - Ink: `#FFFFFF` open, `#D9D3C4` for the piggy-bank transfer (arrow too), `#6B6D73` once paid, with
     row `opacity: .62` and a 200ms ease transition.
   - Right marker 22 × 22, radius 11: open = `1.6px solid rgba(255,255,255,.26)`, empty;
     paid = filled `#6FCF97` with a `#0A0A0B` check 13 × 13 stroke 3.2.
6. **Note** — as 1a's: "The piggy bank is set aside for the group, so it stays on the book after the night
   closes."
7. **Primary** — `Mark all as paid` while anything is open; **`Close the night`** once every row is ticked.
   Same white button spec as 1a.
8. Home indicator as 1a.

---

## Count up · final state (for the check)

`CountUpEnd.dc.html`. Included because its rows are the pattern the game-end lists follow, and because
this screen — not the game-end screens — **owns** the rounding step.

Frame 393 × 852, radius 26, `box-shadow: 0 0 0 11px #07080A`.

- **Balance card** — margin `0 20px 16px`, `#16161A`, radius 14, border
  `rgba(111,207,151,.45)` when balanced / `rgba(240,112,92,.5)` when not (420ms ease).
  Open state: the **gap is the headline** — `800 clamp(24px, 9.5cqi, 38px)/1`, `−.03em`, tabular, in
  `#6FCF97` / `#F0705C`; percentage `700 15px` same colour at the right; a two-segment bar 8px high,
  radius 3, gap 2, segments flex-grown by the two sums (560ms `cubic-bezier(.32,.72,0,1)`); then the two
  sums at text size — `Bought in · 8 players` and `Accounted for · N counted`, captions
  `500 13.5px #8B8D93`, figures `700 18px` tabular.
- **Collapse.** When the sums agree, the comparison folds away **1,100ms after** balance is reached — long
  enough to read the balance moment. Collapsed, the card keeps one line: check 17 × 17 + "Balanced"
  `800 20px #6FCF97` + `₾47,000` `700 17px #FFFFFF` + "in play" `500 12px #8B8D93`. Tapping the line
  re-opens the full comparison; tapping again closes it. Implemented as
  `grid-template-rows: 1fr → 0fr` with `transition: grid-template-rows 520ms cubic-bezier(.32,.72,0,1),
  opacity 300ms ease` — the collapsing track must reach a true `0`, so the detail's bottom padding lives
  on a nested child, not on the animating element.
- **Rounding row** — margin `0 20px`, padding `12px 2px`, hairline top. Label `600 16px #FFFFFF`
  `Rounding · nearest ₾10`, value `400 13.5px #8B8D93` `on the nets`, chevron. Opens the sheet above.
- **Still to count** — eyebrow `700 11.5px .1em` uppercase `#8B8D93`, then a dashed row:
  `#121216`, `1px dashed rgba(255,255,255,.24)`, radius 10, padding `11px 14px`; name `700 17px`,
  `in ₾5,000` `400 13px #8B8D93`, and a `Count ₾2,900` chip `700 13px` on `rgba(255,255,255,.14)`.
- **Counted list** — rows `#16161A`, radius 10, padding `11px 14px`, gap 7 between rows; name
  `700 17px #FFFFFF`, `counted ₾X` `400 13px #8B8D93`, net `800 19px` `−.02em` tabular green/red,
  chevron 13 × 13 `#6B6D73`. Sorted by net, descending.
- **Row motion.** Counting a stack moves it from the dashed row into the list: measure row tops before the
  state change, then FLIP — the entering row animates from the dashed row's position, 620ms
  `cubic-bezier(.32,.72,0,1)`, `opacity .55 → 1`, plus a green flash
  (`rgba(111,207,151,.28)` held to 45%, then `#16161A`, 1,300ms ease-out). Rows that shift animate 560ms
  with a 26ms per-row stagger.
- **Primary** — `Next`, white, `700 17px`, radius 8.

---

## State

Per night (persisted):

```
night: { id, date, startedAt, endedAt, players[], deductions[], roundingStep, closed }
player: { id, name, in, out, countedRaw, countedRounded, billShare, billPaid, piggyShare }
deduction: { id, label, amount, paidByPlayerId | null, kind: 'bill' | 'piggy' }
transfer: { id, fromPlayerId, toPlayerId | 'piggy', amount, paidAt | null }
```

Per screen (ephemeral):

- 1a: `mode: 'table' | 'final'` (default `final` when the night is settled), `sheetOpen: boolean`.
- Sheet: `staged: 0 | 10 | 50 | 100`, seeded from `roundingStep` on open; discarded on dismiss.
- 2a: nothing of its own — paid state lives on the transfers.

Derived, computed in one place and read everywhere:

- `atTheTable`, `final` per player (formulas above)
- `remaining = Σ unpaid transfers` → drives 2a's figure **and** the status pill on both screens
- `settlement = remaining === 0 ? 'settled' : (some paid ? 'part' : 'unsettled')`
- `worstDelta(step) = max |round(raw/step)·step − raw|` over counted stacks → the sheet's sub-lines

Transitions: tapping a transfer toggles `paidAt`; `Mark all as paid` sets all; `Close the night` sets
`closed` and locks `roundingStep`; Apply in the sheet writes `roundingStep` and recomputes from
`countedRaw`.

## Design tokens

| Token | Value | Used for |
|---|---|---|
| Screen | `#0A0A0B` | frame background |
| Card | `#16161A` | totals card, count-up rows |
| Sheet | `#101013` | bottom sheet panel |
| Sunken | `#121216` | dashed pending row |
| Chip well | `rgba(255,255,255,.07)` | segmented toggle track |
| Hairline | `rgba(255,255,255,.11)` | every row divider, card borders |
| Ink | `#FFFFFF` | names, figures, titles |
| Ink secondary | `#8B8D93` | captions, eyebrows, notes |
| Ink tertiary | `#9C9EA5` | spend-line bill / piggy terms |
| Ink spent | `#6B6D73` | paid transfer rows |
| Won | `#6FCF97` | positive nets, out, settled |
| Lost | `#F0705C` | negative nets, in, unsettled |
| Bone | `#D9D3C4` | money leaving the table — piggy, deductions, remainder |
| Scrim | `rgba(6,6,8,.62)` | behind the sheet |

Radii: 46 frame · 26 sheet top · 14 cards · 12 buttons and toggle track · 11 pill / count-up rows ·
9 toggle thumb · 8 status pill.
Spacing: screen gutter 20 (cards) / 22 (lists), row padding 11–14 vertical, card padding `14px 16px`.
Type: Figtree (fallback `-apple-system`, `SF Pro Display` for the 26px+ display sizes). Scale in use —
`800 34/30/28/26`, `800 19`, `700 19/18/17/15/14/11`, `600 17/16/15/14/13.5`, `500 13.5/13/12.5`,
`400 13/12.5`. All money is `font-variant-numeric: tabular-nums`. Row names never drop below `700 17px`;
the spend line never below `500 13px`.
Motion: `cubic-bezier(.32,.72,0,1)` for anything that moves or resizes; 480–620ms for layout,
200–420ms for colour and opacity. Collapse of the balance comparison waits 1,100ms after balance.

## Copy

Verbatim, all of it: "Money in play", "Left to move", "Status", "Settled", "₾400 left", "Deductions",
"₾200 total", "held by the group", "Goga paid", "At the table", "Final", "before deductions",
"after deductions and compensations", "Rounding · nearest ₾10", "on the nets", "Rounding · off",
"stacks as counted", "Whoever paid a bill gets it back in full below.", "Who pays whom", "Transfers",
"1 of 3 paid", "Mark all as paid", "Close the night", "The piggy bank is set aside for the group, so it
stays on the book after the night closes.", "Still to count · 1", "Counted · 8", "Balanced", "in play",
"Next".

Bill and piggy shares read as bare numbers on the spend line (`bill 50`, `piggy bank 50`); the currency
mark appears on the net, the totals and the transfers.

## Assets

None. Every glyph is an inline SVG stroke path — back chevron, disclosure chevron, check, info circle,
transfer arrow. Stroke widths are given per screen above. No icon library, no images.

## Files

| File | What it is |
|---|---|
| `Game End Screens.dc.html` | 1a settled night, the three status states, 2a who pays whom, the rounding sheet. Interactive: the toggle swaps the list, the rounding row opens the sheet, transfer rows tick off. |
| `CountUpEnd.dc.html` | Count up in its final state — balance card, collapse, rounding row, counted list, row motion. |
| `support.js` | Prototype runtime for the two files above. Not product code. |

Reference docs already in the project that these screens do not contradict:
`handoff-count-up-to-settled/docs/04-rounding.md` (the sheet's spec and the rounding maths) and
`handoff-rev18/docs/04-money-math.md` (the arithmetic, with the caveat in its own header note).
