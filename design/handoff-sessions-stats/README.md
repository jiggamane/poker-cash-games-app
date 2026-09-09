# Handoff: Sessions and My stats

## Overview
The two screens of the book — the part of the app a player reads between nights.

- **Sessions** — every night they have played, newest first, one row each, tapping a row opens that
  night's result.
- **My stats** — where they stand over a period: one figure with its supporting counts, a
  result-per-night graph for the last eight nights, and their last four games.

Both are pushes from the club root (per `docs/09-navigation.md`; no tab bar). Sessions is also
reachable from My stats via **See all**.

## About the design files
`Artboards - Sessions and Stats.dc.html` is a **design reference created in HTML** — intended look
and behaviour, not production code to lift. Recreate it in the target codebase (Expo / React Native
here) with its own components and navigation. Every dimension, weight and colour is written inline
on the element, so specs read straight off the markup. `support.js` must sit next to it; open in a
browser and pan/zoom the canvas.

**Fidelity: high.** Final colours, type, spacing and copy. The drawn status bar and home indicator
are drawings — use the platform's own. Dark theme only in this bundle; apply the token map in
`docs/07-design-tokens.md` for the light twin.

## What is in the file
| Frame | What it shows |
| --- | --- |
| `1a Sessions` | The list, resting |
| `2a My stats` | The figures, nothing tapped |
| `3a My stats · 15 Aug tapped` | A night tapped in the graph |
| Panel · *Bar height* | How a bar's height is derived, with the worked window |
| Panel · *The readout timeline* | What a tap does, frame by frame, and when it ends |
| Detail · *the break-even mark at 2×* | The zero night against a real loss |

## Frame and global rules
- Frame **393 × 852**, radius 46. Safe insets 59 top / 34 bottom; the bottom 34 is never drawn into.
- Chrome A (push): back row `Home` top-left, **top-right empty** on both screens.
- Side margin **22** for text and lists; the two cards on My stats inset to **20**.
- **No rules between list rows.** Row separation is row height alone. This is deliberate — an
  earlier version fenced every row and read as noise.
- Only two things per row are at full brightness: the **date** (white) and the **figure**
  (win/loss). Everything else is annotation in bone.
- Figures are never abbreviated and always tabular. Minus is a real `−`.

## Type
**Figtree** (SF Pro on device), weights 400 / 500 / 600 / 700 / 800.

| Role | Spec |
| --- | --- |
| Screen title | 32 / 800, tracking −.03em |
| Back-row label | 17 / 500 |
| Meta line | 14 / 400 muted |
| Dropdown label | 13 / 600 bright |
| Session row · date | 17 / 400 · net 17 / 600 |
| Session row · annotation | 12.5 / 400 bone |
| Card eyebrow | 11 / 700, tracking .12em, uppercase, muted |
| Period tab | active 11.5 / 700 white + 1.5px underline · inactive 11.5 / 500 muted |
| Period figure | 34 / 800, tracking −.04em |
| Card meta (`6 games · 25 h`) | 12 / 400 muted, flush right, baseline-aligned to the figure |
| Stat pair | label 10 / 700 .1em uppercase muted · value 18 / 700 |
| Section label (`LAST 8 NIGHTS`, `LAST GAMES`) | 12 / 700, tracking .1em, uppercase, muted |
| `See all` | 12.5 / 500 muted |
| Chart date label | 9.5 / 500 muted · tapped 9.5 / 600 white |
| Chart readout / `$0` | 14 / 700 |
| Last-games row | date 16.5 / 400 · net 16.5 / 600 · annotation 12.5 / 400 bone |

## Design tokens (dark)
| Token | Value | Used for |
| --- | --- | --- |
| ground | `#0A0A0B` | screen |
| bezel | `#07080A` | frame only, not app |
| surface | `#16161A` | dropdown control |
| card tint | `rgba(111,207,151,.13)` | period figure card |
| text | `#FFFFFF` | title, date, tapped label |
| bright | `#F0EDE4` | dropdown label |
| muted | `#8B8D93` | meta, section labels, chart labels |
| dim | `#5E6067` | row chevron |
| bone | `#8C8578` | all row annotations |
| bone stroke | `#6E6A62` | annotation glyph strokes |
| win | `#6FCF97` | positive figure, positive bar |
| loss | `#F0705C` | negative figure, negative bar |
| **break-even** | `#E8B84B` | the zero night's marks and its `$0` |
| hairline | `rgba(255,255,255,.11)` | card border, chart baseline, card divider |
| baseline · tapped | `rgba(255,255,255,.28)` | the tapped column's slice only |
| bar · unselected | 34% alpha of win/loss | every bar except the tapped one, while a tap is live |

Geometry: dropdown radius **8** (padding `6 10 6 11`), cards radius **12**, bars radius
`3px 3px 0 0` above / `0 0 3px 3px` below, home indicator 140 × 5.

## 1a Sessions
Back row `Home` · title `Sessions` · meta line `28 nights · newest first` with the group dropdown
(`The poker club ⌄`) pushed right · then the list, side margin 22.

Each row is **60 tall**, two lines, gap 5:
1. date (17/400 white) · net right (17/600 win or loss) · **9 × 14 chevron** in dim, 2px left padding
2. annotation, bone: people glyph + `8 players` · clock glyph + `3h 40m` (gap 14, glyphs 13px)

Ten rows fill the frame with no scroll; beyond ten the list scrolls and nothing else moves.
Row tap → that night's result screen. The dropdown scopes the list to one group or all.

Sample data, in order: Tue 4 Aug −$493 (8 · 3h 40m) · Fri 25 Jul +$212 (6 · 2h 55m) ·
Sat 12 Jul +$540 (7 · 4h 20m) · Thu 3 Jul −$95 (5 · 2h 10m) · Tue 24 Jun +$1,190 (8 · 5h 05m) ·
Wed 11 Jun −$260 (6 · 3h 15m) · Sat 31 May +$76 (9 · 4h 45m) · Thu 22 May −$610 (7 · 3h 30m) ·
Fri 9 May +$305 (6 · 2h 40m) · Tue 29 Apr −$140 (8 · 3h 55m).

## 2a My stats
Back row `Home` · title `My stats` with the **group dropdown** (`All groups ⌄`) right-aligned on the
title row. The group scope is a dropdown, not a chip row: chips cost a 54px band, grow with every
group joined, and spend space on options the reader is not using.

### The figure card
`margin: 0 20px 12px` · `padding: 20px 22px` · radius 12 · card tint · no border.
- eyebrow `This month · August`, period tabs `Month` / `Year` / `All time` right (Month active)
- figure `+$610` in win green, with `6 games · 25 h` flush right on the same baseline
- **10px above and below the figure line** — measured, not eyeballed
- hairline divider, then two stat pairs: `WON / LOST` `4 W · 2 L` (W green, L loss, dot muted) and
  `AVG / NIGHT` `+$102` pushed right

Period stays as tabs inside the card. It is a three-way with short labels the reader flips between —
a second dropdown next to the group one would read as configuration.

### The graph
`margin: 0 20px 12px` · `padding: 14px 14px 10px` · radius 12 · 1px hairline border. Caption
`LAST 8 NIGHTS`; the right of that line is where the tapped figure appears. Eight columns,
`flex: 1`, gap 4: a 38px positive zone, the 1px baseline, a 38px negative zone, then the date label.
Bars are **15px wide**.

### Last games
`margin: 14px 22px 10px` · `LAST GAMES` with `See all` right (→ Sessions). Four rows, **56 tall**,
same shape as Sessions with the group name added first in bone: date · net · chevron over
`The poker club · 7 players · 4h 20m`. Rows are 4px shorter than Sessions' because this list is a
sample, not the destination.

Sample: Sat 15 Aug +$540 (poker club, 7, 4h 20m) · Wed 12 Aug +$180 (office game, 5, 3h 00m) ·
Fri 8 Aug −$60 (poker club, 8, 5h 10m) · Tue 5 Aug +$40 (office game, 6, 2h 45m).

## Bar height — the rule
Take the nights on screen. `peak = max(|result|)` among them. `k = 38px ÷ peak`.
`height = clamp(round(|result| × k), 3, 38)`, positive above the baseline, negative below. Wins and
losses share one scale so they stay comparable, and the plot re-scales whenever the timeframe
changes.

Worked window (peak $540, k = 0.0704 px/$):

| Night | Result | Height |
| --- | --- | --- |
| 12 Jul | −$210 | 15px below |
| 19 Jul | +$120 | 8px above |
| 26 Jul | −$90 | 6px below |
| 1 Aug | +$315 | 22px above |
| 5 Aug | $0 | 2px above + 2px below — break-even |
| 8 Aug | −$60 | 4px below |
| 12 Aug | +$180 | 13px above |
| 15 Aug | +$540 | 38px above — peak, fills the band |

- **Floor.** Never thinner than 3px, so a $6 night (0.4px unclamped) still reads.
- **Cap.** Never over 38px, so no bar reaches the caption above or the labels below.
- **One-sided windows.** The empty half stays empty; the baseline does not move to the middle.
- **Short windows.** Columns keep their width, the row is left-aligned, and the peak comes from
  whatever nights exist — a two-night window still has one full-height bar.
- **Outliers.** One huge night flattens the rest by design; the tapped-night figure covers the
  detail the flattening hides.

### The break-even night
A night that finished at exactly zero has no height to draw, so it gets its own treatment:
**2px of `#E8B84B` above the baseline** (radius `1px 1px 0 0`) and **2px below** (radius
`0 0 1px 1px`), 15px wide like every other bar, the **baseline itself untouched**. It carries a
tight `$0` in 700 14px `#E8B84B` sitting 2px above its upper mark — the only column that labels
itself, because it is the only one whose height says nothing.

It **keeps full yellow while another night is tapped**: 4px of mark cannot survive being dimmed to
34%. Never green, never red, never nothing.

## The readout timeline
Selection is one state with one timer — figure, bar highlight, white date label and brightened
baseline slice arrive together and leave together, so the graph is never left holding a highlight
with no number beside it. The clock counts from the **last** tap.

| Time | Phase | What happens |
| --- | --- | --- |
| 0ms | touch down | tapped bar to full colour, its date label to white, its baseline slice to 28% white; the caption cross-fades to the figure over **120ms ease-out**. No movement, no scale, no bounce — card height is fixed. |
| 0 → 2750ms | hold | the figure stays fully opaque. Every new tap resets the timer. Tapping a different bar swaps the figure in place with a 120ms cross-fade and moves the highlight; nothing fades out in between. |
| 2750 → 3150ms | fade out | figure and highlight fade together over **400ms ease-in**: bars back to 34%, label to muted, baseline to hairline, caption cross-fades back on the same 400ms. |
| any | interrupt | a scroll of more than 8px, a tap outside the plot, a change of group or period, or navigating away clears the state immediately with the same 400ms fade — no hold. |

- **Nothing else reacts.** The period figure, Last games and the stat pairs are unaffected. The tap
  is a read, not a filter.
- **Reduced motion:** both cross-fades become instant swaps; the 2750ms hold is unchanged.
- **Repeat taps** on the same bar reset the timer and do not re-animate the figure.
- **Haptic:** one light selection tick per bar change, none on a repeat tap.

## State
- `scope`: `all` | `groupId` — persisted per user, shared by both screens.
- `period`: `month` | `year` | `allTime` — persisted; **month is the default** (per S48).
- `sessions[]`: date, net, playerCount, duration, groupId, settled.
- `periodStats`: net, gameCount, hoursPlayed, wins, losses, avgPerNight.
- `chart[]`: the last 8 nights as { date, result } — heights are derived, never stored.
- `selectedNight`: index | null, plus its 2750ms timer. Transient; never persisted, and cleared on
  scope or period change.

Derived: `peak`, `k`, and per-bar height per the rule above. `hoursPlayed` needs a real
cards-down timestamp, not `settledAt` (see `docs/CHANGELOG.md` §5.3).

## Assets
None. Every glyph is an inline SVG stroke icon: chevron-left (12 × 20, 2.3px), chevron-right
(9 × 14, 2.3px, dim), chevron-down (20 box, 2.2px), people and clock (20 box, 1.7px, bone stroke,
13px rendered). Swap for the codebase's icon set at the same optical size and weight.

## Files
- `Artboards - Sessions and Stats.dc.html` — 1a, 2a, 3a, both spec panels, the 2× detail.
- `support.js` — runtime needed to open the HTML locally.

## Related
- `cc-handoff/docs/09-navigation.md` — push vs sheet; both screens are pushes.
- `cc-handoff/docs/07-design-tokens.md` — the token map for the light twin.
- `cc-handoff/docs/CHANGELOG.md` — rev 19 records what this bundle supersedes.
