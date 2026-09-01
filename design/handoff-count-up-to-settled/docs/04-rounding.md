# Rounding — set at the count, governs the night

**Cut 31 August 2026.** Addendum to `03-E2-balance-check-logic.md`. Adds one control to E2 and one sheet.
Nothing in the balance-check spec changes.

Board: `boards/Result Formula Options.dc.html`, frames `5a`–`5d` (`5a`/`5c` applied, `5b`/`5d` the sheet).

> ⚠ **The frames sit on the rev-18 E2 chrome** — `COUNTED $2,610 of $2,880` and the
> `Apply the money rules` button. That block is superseded by layout `2a` in `E2-balance-check-logic.md`.
> Take the row and the sheet from these frames; anchor them under the **new** block.

## Why E2 and nowhere else

Rounding changes what a stack is worth, so it has to be decided where stacks are entered. Set here it
governs the rest of the night: nets inherit it, and the transfers on E4 are derived from the rounded nets.
E4 and E6 **display** the setting; this is the one screen that owns it.

## The control

One row, directly under the balance block and above the player list, at the list's 22pt edge, bounded by a
hairline top and bottom.

    Rounding · nearest $10                    stacks snap to $10   ›

| | |
|---|---|
| Height | 45 (padding `13px 4px`, hairline top and bottom) |
| Label | 600 15px, primary text |
| Value | 600 15px muted, right, tabular |
| Chevron | 13 × 13, stroke 2.4, muted |
| Tap target | the whole row, edge to edge |
| Off state | label reads `Rounding · off`, value `stacks as counted` |

The row is present in every state of the screen, including before the first stack is counted.

## The sheet

Bottom sheet over a scrim — `rgba(6,6,8,.62)` dark, `rgba(12,13,15,.34)` light — radius 26, grabber
38 × 5, title `Rounding` at 800 26px, then one sentence, four rows, one primary.

Body copy, verbatim:

> Set it here and it governs the whole night: stacks snap to the step as they are entered, and the nets and
> transfers follow. What was counted is kept underneath. Changeable until the night is closed.

Steps, in this order, each with a computed sub-line:

| Row | Sub-line | Source |
|---|---|---|
| `Off` | `Stacks as counted · $2,613 so far` | the unrounded counted total |
| `Nearest $10` | `No stack moves by more than $3` | max abs delta across counted stacks |
| `Nearest $50` | `No stack moves by more than $18` | same |
| `Nearest $100` | `No stack moves by more than $37` | same |

The sub-line states the **worst single distortion, not an average** — it is the figure an admin gets asked
about at the table. Recompute it on every entry; with nothing counted yet it reads `no stacks counted yet`.

Selection is a check mark (18 × 18, stroke 2.6) in primary text on the right — not a fill, not a radio.
Primary button: **Apply**. Dismissing without Apply changes nothing.

`Off` is a listed option, not the absence of a choice.

## The maths

1. **Nearest, both ways.** Half rounds away from zero (`$965` → `$970` at $10).
2. Steps offered: **$10, $50, $100**, plus Off. No free entry.
3. **Every stack is rounded, then nets are computed from rounded stacks.** Never round a net directly.
4. **Transfers derive from the rounded nets**, so they are multiples of the step for free. Do not round
   transfers a second time.
5. **The remainder goes to the piggy bank** — the only place it may go. `remainder = Σ rounded − Σ raw`, and
   the piggy-bank total absorbs it, positive or negative.
6. **The raw entry is kept.** `countedRaw` and `countedRounded` are both stored; the row shows the rounded
   figure with `in $500 · counted $963` beneath the name. A stack is never silently rewritten.
7. Changing the step recomputes everything from `countedRaw`. Rounding is never applied twice.
8. Locked once the night is closed.

## Where it surfaces afterwards

* **E4 Settle up** — same row, above the transfer list, value `+$16 → piggy`. Changing it here recomputes
  the transfers on screen. (Frames `4a`–`4d`; drawn, not the owner.)
* **E6** — same row as the last line of the deductions block, still changeable while the night is open
  (frames `3a`–`3d`).
* Player receipts gain one term, `Rounded to $10 +$5`, between the piggy bank line and `Net`.

## Open

1. Whether the group's money rules carry a **default step** a night opens with. Rev 17 S103 says a game's
   rules seed from the group's and never write back — rounding should follow that, but it is not drawn.
2. Whether the piggy bank line names the rounding contribution separately in the group's own ledger.
3. Rounding of the **bill split** itself (shares are currently to the dollar).
