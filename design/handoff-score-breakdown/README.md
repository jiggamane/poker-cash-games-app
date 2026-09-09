# Handoff: Score breakdown glyphs, Final / At table tabs

## Overview
Under every player's score the app shows where the number came from: chips bought in, chips
cashed out, and the three things that leave the table during the evening (food, drinks, piggy
bank). This handoff covers the finished glyph set, the signed number format, the row layouts,
and the two screens that use them — the game-end results screen and the past-session (stats)
screen — including the Final / At table segmented control that both carry.

## About the design files
The file in this bundle is a **design reference written in HTML**. It is a prototype of the
intended look and behaviour, not production code to lift. Recreate these designs in the target
codebase using its existing environment, component library and patterns (React Native, SwiftUI,
React, whatever the app is built in). If no environment exists yet, pick the appropriate one for
the product and implement there. Nothing in the HTML — the inline styles, the raw SVG markup,
the canvas/board layout used to present options side by side — should be copied verbatim.

## Fidelity
**High fidelity.** Colours, type, spacing, glyph geometry and copy are final. Screens are drawn
at 393 × 852 (iPhone 15/16 logical size). Recreate pixel-accurately, but source the values from
the codebase's design tokens where equivalents already exist.

## The glyph set

Five glyphs, one 20 × 20 box each, 1.7 stroke, round caps and joins, no fill. Rendered at 15 px
in list rows and 17 px in labelled pills. Two colours only — ink (white on dark) for chips,
bone for the three spends. No new colours were introduced for this feature.

| Meaning     | Colour                        | SVG path data (viewBox 0 0 20 20) |
|-------------|-------------------------------|-----------------------------------|
| Chips in    | stroke #8B8D93, figure #FFFFFF | `M10 3.2v9.4` &nbsp;·&nbsp; `M6.6 9.2 10 12.6l3.4-3.4` &nbsp;·&nbsp; `M4 16.2h12` |
| Chips out   | stroke #8B8D93, figure #FFFFFF | `M10 12.6V3.2` &nbsp;·&nbsp; `M6.6 6.6 10 3.2l3.4 3.4` &nbsp;·&nbsp; `M4 16.2h12` |
| Food        | stroke #D9D3C4, figure #D9D3C4 | `M4.5 2.8v3.9M6.7 2.8v3.9M8.9 2.8v3.9` &nbsp;·&nbsp; `M4.5 6.7a2.2 2.2 0 0 0 4.4 0` &nbsp;·&nbsp; `M6.7 8.9V17.2` &nbsp;·&nbsp; `M13.5 17.2V10.6c-1.3-.4-2-1.6-2-3.4 0-2.3 1-4 2.6-4.4v14.4` |
| Drinks      | stroke #D9D3C4, figure #D9D3C4 | `M3.8 4.6h12.4L10 11z` &nbsp;·&nbsp; `M10 11v4.4` &nbsp;·&nbsp; `M6.8 16.6h6.4` |
| Piggy bank  | stroke #D9D3C4, figure #D9D3C4 | `circle cx=10 cy=10 r=7.1` &nbsp;·&nbsp; `circle cx=7.9 cy=7.9 r=1.35` &nbsp;·&nbsp; `circle cx=12.1 cy=12.1 r=1.35` &nbsp;·&nbsp; `M13 7 7 13` |

Rules that came out of the review and must hold in implementation:

- **Absent pairs are dropped, never zeroed.** A player who didn't drink shows no drinks glyph —
  not a `$0`. Rows are variable width by design.
- **The three spends are bone** because bone already means money leaving the table elsewhere in
  the app. Chips stay ink.
- **No labels in list rows.** The glyph carries the meaning alone. Labels ("Chips in", "Chips
  out", "Food", "Drinks", "Piggy") appear only in the single-player pill layout, where the pairs
  sit on their own lines and there is room.
- Superseded candidates (pig, jar, tumbler, two-tine fork, vault, locked box, coin slot) are kept
  in the design file as the decision record. **Do not implement them.**

## Number format

Every figure is signed so the row visibly sums to the score:

```
score = (− chips in) + (chips out) + (− food) + (− drinks) + (− piggy)
```

- Chips in: always `−$X` (money the player put in)
- Chips out: always `+$X`
- Food, drinks, piggy: always `−$X`
- The score itself: `+$75` green #6FCF97 / `−$252` red #F0705C
- Minus is the typographic minus `−` (U+2212), not a hyphen.
- All figures `font-variant-numeric: tabular-nums`. Thousands separated with a comma.

Worked example (Dana): `−$500 + $2,120 − $54 − $24 − $23 = +$1,519`.

## Screens

### 1. Game end — results (uses the grouped row)

- **Purpose:** shown when the last player cashes out. The room reads it together, so every
  deduction is visible without a tap.
- **Chrome (top to bottom):** status bar (18 px top padding, 30 px sides, 15/600 white time,
  13/400 #8B8D93 battery) → back row (chevron + "Tonight", 17/500 white; "Share" 16/700 white,
  right) → title "Tue 4 August" (32/800, line-height 1.05, letter-spacing −.03em, white) → meta
  line "20:05 → 23:45 · 3h 40m · 8 players" (14/400 #8B8D93, tabular) → segmented control →
  player list → footer note → primary button → home indicator.
- **Row (grouped):** name (16/600 white) with the score right-aligned (17/700, green or red) on
  the first line; second line is the two chip pairs, a 1 px vertical rule rgba(255,255,255,.14),
  then the spend pairs inside a bone tray (background rgba(217,211,196,.09), radius 8, padding
  3 px 8 px, negative 3 px vertical margin so the tray doesn't grow the row). Row padding
  8 px 0 (58 px row), top border 1 px rgba(255,255,255,.11), inner gap 6 px, pair gap 11 px, glyph-to-figure
  gap 4 px. Figures 12.5/600.
- **Footer note:** 12/400 line-height 1.45 #8B8D93.
- **Primary button:** full width, padding 18 px 0, radius 8, background #F0EDE4, label 17/700
  #0A0A0B ("Who pays whom") with a trailing arrow (24-box path `M5 12h13M13 6.5l5.5 5.5L13 17.5`,
  stroke #0A0A0B 2.5, drawn 15 × 15), in a container with
  `background: linear-gradient(transparent, #0A0A0B 26%)`.
- **Home indicator:** 140 × 5, radius 3, rgba(255,255,255,.9).

### 2. Past session / my stats (uses the rolled-up row)

- **Purpose:** the same night read months later. Quiet by default; detail on demand.
- **Differences from the game-end screen:** back label "Sessions"; meta line "Settled · 3h 40m ·
  8 players"; no primary button — in its place a full-width outlined bar, 16 px 0 padding,
  radius 8, 1 px rgba(255,255,255,.16) border, label 15/700 #F0EDE4 ("Settled 5 Aug · view the
  book").
- **Row (rolled up):** name + score as above; second line is the two chip pairs, then right-
  aligned: the spend glyphs at 14 px in a row (gap 8 px), one bone total `−$101`, and a chevron
  (`M7.5 3.5 14 10l-6.5 6.5`, stroke #6C6E74 1.9, 13 × 13).
- **Expanded row:** tapping itemises in place — the row becomes the full five-pair line, gains
  background #131317, radius 12, padding 9 px 12 px (60 px row), and 12 px negative side margins so it bleeds to
  the list edges. Only one row is open at a time. Collapsing returns the rolled-up line.

### 3. Single player pill layout (already in the design file, unchanged)

Used on the player-history card: 56/800 score, then pills — 17 px glyph, label 13/500 #8B8D93,
figure 13/700 — chips pills on background #16161A with 1 px rgba(255,255,255,.11), spend pills
on rgba(217,211,196,.09) with 1 px rgba(217,211,196,.22). Radius 8, padding 9 px 11 px, gap 7 px.

## The Final / At table tabs

Both screens carry the same segmented control directly under the meta line.

- **Container:** margin 0 22 px 12 px, padding 3 px, radius 11, background #16161A, two equal
  flex children, 3 px gap.
- **Segment:** height 34, radius 9. Active — background #2A2A31, label 13.5/700 #FFFFFF.
  Inactive — transparent, label 13.5/600 #8B8D93.
- **Final** (default on both screens): the number each player owes or is owed. Chips *and* the
  evening. Rows carry bone glyphs.
- **At table:** the poker result only, `chips out − chips in`. **Deductions are not shown and not
  greyed out** — the row is just the two chip pairs and the table result, because there is nothing
  to itemise. The list ends with a reconciliation line — "$5,500 in, $5,500 out" left, "$0" right,
  13/400 and 13/600 #8B8D93 — which is the check players run before accepting the final. In this
  tab rows are tightened to 7 px vertical padding (55 px rows) so the reconciliation line fits
  without scrolling; the Final tab uses 8 px (58 px rows).
- Switching tabs changes figures and row content only. Header, tabs, footer and button stay put;
  no layout shift above the list.

## State

| State | Values | Notes |
|---|---|---|
| `resultsTab` | `'final' \| 'table'` | Per screen, defaults to `'final'`. Not persisted between sessions. |
| `expandedPlayerId` | id or null | Rolled-up rows only. One at a time; tapping the open row closes it. |

Per player the row needs: `name`, `chipsIn`, `chipsOut`, `food`, `drinks`, `piggy`. Spend fields
are nullable — null means the glyph is omitted. Derived: `tableResult = chipsOut − chipsIn`,
`final = tableResult − food − drinks − piggy`.

## Interactions

- Tap a rolled-up row → expand in place (height change only, ~180 ms ease-out; the score and name
  must not move).
- Tap the bone tray in the grouped row → open the deductions screen.
- Tap a segment → swap the list content. No animation required beyond the segment background.
- Primary button → "Who pays whom" settlement screen.

## Design tokens

| Token | Value |
|---|---|
| Screen background | #0A0A0B |
| Bezel (mock only) | #07080A |
| Raised surface / expanded row | #131317, #16161A |
| Active segment | #2A2A31 |
| Hairline | rgba(255,255,255,.11) — vertical rule rgba(255,255,255,.14) |
| Ink text | #FFFFFF |
| Secondary text | #8B8D93 |
| Bone (spends) | #D9D3C4 — tray fill rgba(217,211,196,.09), border rgba(217,211,196,.22) |
| Positive | #6FCF97 |
| Negative | #F0705C |
| Button fill / on-dark cream | #F0EDE4 |
| Type | SF Pro Text / SF Pro Display, Figtree as the web fallback |
| Type scale | 32/800 title · 17/700 score · 16/600 name · 15/600 status · 14/400 meta · 13.5/600–700 segment · 12.5/600 figure · 12/400 note · 12/700 .1em eyebrow |
| Radii | 46 screen · 12 expanded row · 11 segment container · 9 segment · 8 button, tray, pill |
| Row metrics | 58 px grouped/rolled-up row (60 px expanded) · 55 px At-table row · 15 px glyph in rows · 17 px glyph in pills |

## Assets

None. Every glyph is inline SVG stroke geometry, listed above in full — no icon font, no image
files, no third-party icon set. Reproduce them as vector paths in the target platform.

## Files

- `Score Breakdown Icons.dc.html` — the full design record. Read it bottom-up: turn 1 is the
  original five-glyph exploration and the three row layouts (1a itemised, 1b grouped, 1c rolled
  up); turns 2–4 are the glyph iterations, ending in the approved set; turn 5 puts all three row
  layouts on a full results screen; **turn 6 at the top is the specification** — 6a game end on
  Final, 6b game end on At table, 6c past session rolled up. Build from turn 6.
