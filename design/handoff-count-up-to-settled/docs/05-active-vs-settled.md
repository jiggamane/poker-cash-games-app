# Active vs settled players — Tonight and Count up

**Cut 1 September 2026.** One rule, applied to the two screens that show a player list while the night is
still open. Board: `boards/Cashed Out States.dc.html`. Screenshots in `images/`.

> ⚠ **Nothing on the Tonight screen changes except the player list.** Header, the *On the table* card, the
> Table admin drawer and the Rebuy / Bill buttons stay exactly as they are in the app today. The scope of
> this doc is the list rows, their grouping, and their type.
>
> Frames `1a`–`1c` in **turn 1** of the board draw the list on an **older Tonight chrome** — a Totals / Feed
> switcher, a *House rules* button and a cash-in / cashed-out strip. None of those are part of this design.
> **Frames `2a` / `2b` in turn 2 are the reference**; turn 1 is there only to compare the three list
> treatments against each other.

## The rule

A player is **active** until something ends their night, and **settled** afterwards. What ends it differs by
screen, but the display consequence is identical:

| Screen | Active means | Settled means |
|---|---|---|
| **Tonight** (in game) | seated, still holding chips | cashed out — the admin has taken their stack |
| **E2 Count up** | stack not yet counted | stack counted, or cashed out earlier in the night |

**The right-hand column changes meaning between the two.** For an active player it is *money in* — an
unsigned buy-in total. For a settled player it is a **signed result before deductions**. Nothing else on the
row distinguishes them, so the grouping and the group header are load-bearing, not decoration.

    active   →  $500       money in, unsigned, primary text
    settled  →  +$1,620    result before deductions, signed, money colour

`result = cashedOut − boughtIn` on Tonight, and `result = counted − boughtIn` on E2. Neither figure has had
the bill, the piggy bank or rounding applied — that happens later, on E3 and E6. The header says
**RESULT BEFORE DEDUCTIONS** for exactly this reason; do not shorten it to *result*.

## Groups and order

**Tonight** — two groups:

    STILL PLAYING · 5
    CASHED OUT · 1 · RESULT BEFORE DEDUCTIONS

**E2 Count up** — three groups:

    STILL TO COUNT · 2
    COUNTED · 3 · RESULT BEFORE DEDUCTIONS
    CASHED OUT EARLIER · 3

Groups never reorder. Within a group, seat order. A player moves group the moment the admin confirms the
cash-out or the count — no animation is specified, and the row does not stay behind as a ghost.

The count in each header is live and always shown, including at zero: an empty group renders its header with
`· 0` rather than disappearing, so the admin can see that nobody has cashed out yet.

## Row treatment

Active rows are the rows the screen already has — unchanged. Settled rows change in exactly four ways:

1. **Name drops to the muted token.** Not the dim token — see the contrast note below.
2. **A sub-line appears** giving the derivation (`23:15 · in $500 · out $2,120` on Tonight,
   `in $500 · counted $960` on E2). This is the only place the components of the signed figure are visible.
3. **The figure becomes signed and takes a money colour** — green above zero, red below, primary text at
   exactly zero.
4. **The affordance changes.** On Tonight the chevron stays, dimmed — a settled player's sheet is still
   worth opening. On E2 the pencil (edit the count) is replaced by a green tick.

## Type — player lists

Stated in full because the two screens do **not** share a scale. Font stack throughout is
`-apple-system, 'SF Pro Text', 'Figtree', sans-serif`.

### Tonight (frames `2a` / `2b`)

| Element | Size | Weight | Colour | Notes |
|---|---|---|---|---|
| Group header | **11.5px** | 700 | muted | uppercase, `letter-spacing: .1em`, `padding: 0 2px 8px` |
| Active · name | **17px** | 600 | primary | |
| Active · amount | **19px** | 700 | primary | tabular |
| Settled · name | **17px** | 600 | **muted** | |
| Settled · sub-line | **12px** | 400 | **muted** | tabular |
| Settled · result | **19px** | 700 | money green / red | tabular |
| Chevron | 8 × 13 | stroke 2 | muted (dim on settled rows) | |

Row padding `14px 2px` active, `11px 2px` settled; hairline under every row; `20px` above a group header.

### E2 Count up (frames `1a` — the build)

| Element | Size | Weight | Colour | Notes |
|---|---|---|---|---|
| Group header | **12px** | 700 | muted | uppercase, `letter-spacing: .1em`, `padding: 0 4px 6px` |
| Name (all states) | **15.5px** | 600 | primary active / **muted** settled | |
| Sub-line | **11.5px** | 400 | muted | tabular |
| Figure | **18px** | 700 | muted `—` pending, money green / red settled | tabular |
| Pencil / tick | 15 × 15 | stroke 1.9 / 2.4 | muted / green | |

Row padding `7px 4px`; hairline under every row; `14px` above a group header.

### E2 Count up · recessed alternate (frame `1c`)

Kept because three groups plus eight players **overflows E2 by 61px** in `1a` — the list fades at the fold
and scrolls. `1c` collapses settled players to a single line on a recessed slab and fits everyone.

| Element | Size | Weight | Colour | Notes |
|---|---|---|---|---|
| Settled · name | **14.5px** | 600 | muted | |
| Settled · secondary | **11.5px** | 400 | dim | tabular; the time on Tonight, `counted $960` on E2 |
| Settled · result | **16px** | 700 | money green / red | tabular |

Slab `#121215`, `padding: 9px 12px`, 1px gaps between rows, 8px radius on the first and last row only, and
**no hairlines** — the surface does the separating. Active rows above it are unchanged.

Take `1c` if the fade in `1a` is unacceptable at eight players. Do not mix the two on one screen.

## Contrast

The settled sub-line carries the row's substantive data and must clear **4.5:1**. Use the **muted** token,
never the dim one:

| | Dark | Light |
|---|---|---|
| Muted — names, sub-lines, group headers | `#8B8D93` (5.95:1) | `#6B6F76` (5.09:1) |
| Dim — chevrons, card meta, `1c` secondary | `#6E7076` (4.0:1) | `#8A8D94` (3.32:1) |
| Money green | `#6FCF97` | `#0A7A3D` |
| Money red | `#F0705C` | `#B03A28` |
| Hairline | `rgba(255,255,255,.11)` | `rgba(12,13,15,.1)` |

The dim token is below AA at these sizes and is only ever used for glyphs and for text that repeats
information stated elsewhere on the screen.

## What did not change

On Tonight, everything outside the list. The header, the *On the table* card, the Table admin drawer and the
Rebuy / Bill buttons are untouched, and **there is no Totals / Feed tab switcher on this screen** — earlier
boards drew one; it is not part of this design. Build the list against the screen as it exists in the app.

## Open

* Whether a settled player on Tonight can be un-cashed-out, and what the row does in the meantime.
* Whether `CASHED OUT EARLIER` on E2 should be collapsible, given it can never change from that screen.
* No transition is specified for a row moving between groups.
