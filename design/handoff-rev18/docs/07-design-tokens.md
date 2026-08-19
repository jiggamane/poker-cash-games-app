> **Appended, not changed — see `CHANGELOG.md` (12 Aug 2026) §6.** No token below changed value. New: an amber pending pair, dashed placeholder field, minimal period tabs, pill segmented pick, numeric cell, result-per-night chart, stat pair row.

# Design tokens

Two themes, no accent hue. Actions are carried by fill and weight, which leaves green and red free to mean one thing only — money won and money lost. **If something is coloured, it is money.**

Everything below is drawn at ship size in `design/Style Guide v2.dc.html`.

---

## Colour

### Dark

| Role | Value |
| --- | --- |
| Ground | `#0A0A0B` |
| Surface | `#16161A` |
| Raised | `#26262B` |
| Fill / text | `#FFFFFF` |
| Muted | `#8B8D93` |

### Light

| Role | Value |
| --- | --- |
| Ground | `#FFFFFF` |
| Surface | `#F4F4F6` |
| Raised | `#EDEDF0` |
| Fill / text | `#0C0D0F` |
| Muted | `#6B6F76` |

### Money — the only colour in the app

| Role | Dark | Light |
| --- | --- | --- |
| Win | `#6FCF97` | `#0A7A3D` |
| Loss | `#F0705C` | `#C0341B` |
| Off the table | `#D9D3C4` | falls back to ink with a tinted row |

Bone marks money leaving the table: the bill, the piggy bank, the host fee.

**Net rows are tinted** (adopted treatment M1): a faint wash behind each net row so a win or a loss registers at arm's length. Transfer rows stay neutral — the arrows and amounts are not coloured. Colour is on the figure and its row, never on a control.

---

## Type

SF on Apple platforms, Figtree everywhere else. **Tabular numerals on every figure**, so columns line up down a list.

| Role | Size / weight | Use |
| --- | --- | --- |
| Display | 64 / 800 | Hero amounts. One per screen. |
| Screen title | 32–34 / 800 | Large title, always top-left |
| Destination | 28–30 / 800 | Home screen names |
| Figure | 19–24 / 700 | Amounts in rows and strips |
| Body | 17 / 500 | Row labels and buttons |
| Meta | 13–15 / 400 | Times, counts, explanations |
| Label | 12 / 700, caps, .1em | Section headers |

Money is whole units, no cents.

---

## Buttons

**One filled primary per screen**, and it names the act — "Seat Dana · log buy-in", not "Next".

| Kind | Treatment |
| --- | --- |
| Primary | 56 px tall, filled, **2 px keyline set inside the fill** |
| Secondary | Same height, no fill, 2 px outline |
| Destructive | Outline only, never filled |
| Disabled | Filled, no keyline |
| Chip action | 1.5 px outline — quiet but visible |
| Presets | 44 px, filled when chosen |
| Add / new | Dashed outline — dashed always means "creates something" |
| Text action | Navigation bars only |

---

## Rows

Hairlines, never boxes inside boxes. **Never a card inside a card.**

- Vertical padding 13–17 px, hairline between rows.
- Setting row: label left, value right.
- Ledger entry: time, what happened, how much.
- Money leaving the table: bone.
- Transfer row: payer → payee → amount.
- Destination row: home screen only — a name, never a figure.

---

## Provisional results

A figure that is derived but not yet settled is framed as a preview rather than a result: **1 px dashed outline, no fill**, a `PREVIEW` tag in the header at 9.5 px caps inside a dashed 4 px chip, and one muted line beneath saying what it is waiting on. Used on the deductions preview [E3, E3b]; use it anywhere else a screen shows a number before it is final.

Inside such a table, a column that has no figure yet shows an **em dash, never a zero**.

**Column washes.** Where a table breaks an amount into components, each kind of money gets a wash running the full height of the column, rounded 5 px at top and bottom: deductions in bone at 13 % (piggy bank) and 5.5 % (bill); money returning to a person carries no wash and sits in plain ink. Green and red stay on the net alone.

---

## Shape and space

| | |
| --- | --- |
| Corners | 8 px on everything pressable · 14 px on cards · 46 px screen · 999 px only on the live badge |
| Page margin | 22 px |
| Cards and button rows | 20 px |
| Between cards | 12 px |
| Screen | 402 × 874 |

---

## Navigation

- **No tab bar.** The group is the root; the session and the book are pushed on top of it.
- Back is labelled with the screen it returns to, and a home glyph sits beside it — the club is always one tap away.
- The close flow is numbered — "2 of 3" — because its three steps are genuinely sequential. Opening a night is not: one screen holds the settings and the detours return to it.
- The primary always names the next thing rather than saying Next.

---

## Assets

No bitmaps. Icons in the design are inline SVG placeholders — replace them with a real icon set. Avatars are a single initial on a tinted square, 32–40 px, radius 11–13.

## Dock buttons (club home screen)

Settings and Invite a player are two content-width pills at the bottom left of the club home screen. This is the canonical treatment — use it every time, in every state:

- 999px radius, padding 13px 16px, 8px gap icon-to-label, 10px between the two pills, left-aligned, 20px from the screen edge.
- Fill `rgba(255,255,255,.08)` on dark, `rgba(12,13,15,.06)` on light; label 600 13.5px in the foreground colour, always visible.
- Never a tab bar, never full-width buttons, never icon-only.
- Both pills render in every state including loading and offline. A power the reader does not have is removed, not disabled: a player who does not host sees Settings alone.

Related rule: the **My stats** row never previews a figure — no net, no total, no colour. It states scope only ("across every group you play in").
