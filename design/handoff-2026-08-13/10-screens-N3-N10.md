# N3–N10 · the night · pixel spec

Source of truth for markup: `screens-N3-N10.html` in this folder. Every screen there carries all
values inline on the element. Copy them; do not re-derive. Design source: `design/Screens - The night.dc.html`.

Frame: **402 × 874** logical points (iPhone 16 Pro). The 11px dark surround with 56px radius in the
reference is a device bezel — not part of the screen. Screen corner radius 46px only matters for the mock.

## Type

Two families, both system-first with Figtree as the web/Android fallback:

- Display — `-apple-system, 'SF Pro Display', 'Figtree', sans-serif` — used at 800 weight for screen
  titles (32px/1.05, -.03em), big numbers (68px/1, -.05em), card figures (46px/1, -.04em), ledger
  entry headline (26px, -.02em).
- Text — `-apple-system, 'SF Pro Text', 'Figtree', sans-serif` — everything else.

Recurring text roles:

| Role | Value |
|---|---|
| Status bar | 600 15px; battery 400 13px |
| Nav title / Cancel | 500 17px |
| Screen title | 800 32px/1.05, letter-spacing -.03em |
| Sub-line under title | 400 13.5px (1.5 line-height where it wraps) |
| Section eyebrow | 700 12px, .1em tracking, uppercase |
| List row name | 600 17px |
| List row meta | 400 12.5px |
| List row amount | 600 16px, tabular-nums |
| Ledger row time | 600 13px, tabular-nums, width 42px |
| Ledger row label | 600 16px · amount 700 18px, tabular-nums |
| Pill / tag | 700 11px, .1em tracking |
| Preset value / caption | 700 16px · 700 9px, .08em |
| Keypad digit | 500 25px |
| Primary button | 700 17px |

All money and clock times use `font-variant-numeric: tabular-nums`.

## Colour

| Token | Dark | Light |
|---|---|---|
| Screen background | `#0A0A0B` | `#FFFFFF` |
| Raised surface (card, field, keypad key, preset, avatar) | `#16161A` | `#F4F4F6` |
| Pill background | `#26262B` | `#E8E8ED` |
| Primary text | `#FFFFFF` | `#0C0D0F` |
| Secondary text / icon stroke | `#8B8D93` | `#6B6F76` |
| Hairline | `rgba(255,255,255,.11)` | `rgba(12,13,15,.1)` |
| Filled button | bg `#FFFFFF`, text `#0C0D0F` | bg `#0C0D0F`, text `#FFFFFF` |
| Outline button border | `rgba(255,255,255,.55)` | `rgba(12,13,15,.5)` |
| Dashed chip border | `rgba(255,255,255,.3)` | `rgba(12,13,15,.27)` |

No accent hue anywhere in this set — selection is a filled swap (white on dark / black on light).
The filled primary button carries `box-shadow: inset 0 0 0 2px <screen background>` so it reads as
lifted off the surface.

## Geometry

- Screen gutter: 20–22px. Titles and body copy at 22px, buttons and cards at 18–20px.
- Radii: 8px buttons, keypad keys, presets, fields, pills(6px); 14px cards; 24px sheet top corners.
- Hairline separators: 1px, rows are `padding: 14px 4px` (lists) or `16px 4px` (ledger).
- Keypad: `grid-template-columns: repeat(3, 1fr); gap: 8px`, keys `padding: 14px 0`, `00` and
  backspace unfilled.
- Home indicator: 140×5px, radius 3px, `padding: 8px 0 9px`.
- Bottom action block: `padding: 14px 20px 0`, button `padding: 18px 0`, full width.
- Status bar: `padding: 20px 30px 0`. Nav row: `padding: 16px 20px 4px`, back chevron 11×18 at
  stroke-width 2.3, then the parent screen's name at 500 17px.

## Per screen

**N3 · One player** — push from N1. Nav title "The game". Title = player name, then a `SEATED` pill
and "since HH:MM". Card shows two figures side by side: buy-in + rebuys, and Counted (em-dash until
the count exists). Ledger below lists every entry newest first with a pencil affordance per row
(opens N10). Two house-rule tokens, `KITTY 5% OF WIN` and `BILL SPLIT`, with the winners-only note.
Actions: filled "Cash <name> out", outline "Rebuy".

**N4 · Buy-in · pick a player** — modal, Cancel top right, nav title "Tonight". Two groups: "At the
table · rebuy" as rows (avatar initial, name, entry summary, total, chevron) and "Not seated · first
buy-in" as chips, ending in a dashed "New player" chip. Cashed-out players do not appear.

**N5 · First buy-in · amount** — nav title is the parent, "Who's playing?". Title = name + `BUY-IN ·
FIRST` pill, sub-line "not seated yet · joins at HH:MM". Amount 68px centred. Three presets:
default (selected), ×2, Custom. Timestamp row between hairlines with "Change". Keypad. Primary
"Seat <name> · log buy-in".

**N6 · Rebuy · amount** — same skeleton as N5. Pill `REBUY · 3RD`, sub-line "already in for $1,500".
Four presets: STANDARD, ×2 (selected), ×4, Custom. Primary "Log the rebuy".

**N7 · Seat a new player** — title "New player", explanatory sub-line, Name field (600 19px in a
raised 8px-radius field) holding the typed name, then a "FROM THE ROSTER" chip row (Radka, Jirka,
Kuba) to pick someone already known instead of typing, then a "First buy-in · $500 · standard" row.
Primary "Seat and buy in" — seating and the first buy-in are one step.

**N8 · Cash out · pick a player** — nav title "Tonight". Rows show what each is in for; already
cashed-out players are listed as done and are not selectable.

**N9 · Cash out · count the chips** — pill `CASH OUT`, sub-line "in for $1,500 · buy-in + 2 rebuys".
Counted amount 68px, keypad, and the resulting net shown against what they are in for. Cashing out
is final for the night.

**N10 · Correct an entry** — the original line in a raised card ("22:41 · logged by Ivo" eyebrow,
"Ivo · rebuy · $500" at 800 26px), then the append-only explanation, then the correction actions.
Nothing is deleted; a correction writes a new line.

## Behaviour that the pixels imply

- Modals (N4–N10) enter as sheets over N1 and return there; the back chevron is labelled with the
  screen you came from, Cancel discards.
- Selection state on presets is a fill swap, not a border.
- Nothing on these screens animates other than the standard push/sheet transition.
