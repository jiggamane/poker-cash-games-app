# The Poker Club — build handoff for Claude Code

**Rev 18, cut 19 August 2026.** Self-contained: open the boards straight from `boards/` in a browser, no
server. If you already have the 18 August cut, read `WHATS-NEW-since-rev-17.md` and nothing else.

```
START-HERE.md                 this file
WHATS-NEW-since-rev-17.md     the delta since the last handoff — read this first if you have rev 17
HANDOUT-parts-1-2.md          the working handout — club/people and the night, with the decisions
HANDOUT-all-parts.md          the same shape across all four parts, thinner
boards/                       the five design boards + the test-round board (support.js sits next to them)
docs/                         the numbered specs, 01–15, plus the cumulative changelog
reference/                    older per-set build references (HTML), superseded by the boards where they disagree
```

## The boards

| File | What it holds |
|---|---|
| `Journey Map 1 - Club and people.dc.html` | 28 screens · home H1–H3, groups GR2–GR9, invites C3/X2, opening a night O1–O7 |
| `Journey Map 2 - The night.dc.html` | 25 screens · the live night T1–T5, entries N3–N12, the bill L1–L4, watchers X1a/X1b, and `T1v` the tighter variant |
| `Journey Map 3 - Settle and the book.dc.html` | 16 screens · the ending E1–E7, the book 1A–1D, My stats G4 |
| `Journey Map 4 - Findings.dc.html` | membership P1–P5 and Sessions S1/S2 (drawn, not scheduled) · superseded · chrome corrections · what is missing |
| `Journey Map 5 - Flow logic.dc.html` | **new** · every scenario as screens and arrows, no frames — the check that the logic closes |
| `Test Version.dc.html` | **new** · the 10-screen test-round cut, one club, no accounts |

Every frame is 393 × 852, dark above light, both themes complete.

## Order of work

1. **`WHATS-NEW-since-rev-17.md`** if you have the last cut. Otherwise start at 2.
2. **`docs/15-screen-geometry.md`** — the frame, the sheet object, gaps, surfaces, other resolutions.
   Everything else assumes it. Reference device **393 × 852**, and that is the only device the test round
   runs on.
3. **`docs/07-design-tokens.md`** — colour, type scale, dock pills.
4. **`boards/Journey Map 5 - Flow logic.dc.html`** — before you wire any navigation.
5. **`HANDOUT-parts-1-2.md`** — build order per part, plus the rules that are easy to get wrong.
6. The numbered spec for the part you are building. `docs/CHANGELOG.md` is cumulative and names what each
   revision supersedes; **rev 18 is the top and it wins.**

Where a board and a spec disagree, the **spec** wins on behaviour and the **board** wins on layout.

## If you are building the test round only

Build from `boards/Test Version.dc.html` plus `docs/04-money-math.md` and `docs/15-screen-geometry.md`.
Its ten screens are numbered **T1–T10 in their own namespace** — not the app's T-series. Everything the
test round leaves out is named on that board.

## Binding decisions

Rev 17's list stands in full and is restated here in short; the reasoning is in `docs/CHANGELOG.md`.

* **Reference frame 393 × 852.** Larger phones get the difference in the single flexible spacer.
* **The sheet is one object** — radius 26, grabber 38 × 5, header 12/22, body rows 22, card stacks 20,
  pinned footer block 82. A sheet never scrolls as a whole; it promotes to full-height and scrolls its body.
* **Surfaces.** Light base is white on a plain push screen, grey `#F4F4F6` only when the screen carries a
  sheet or drawer. Panel white, card inside a panel grey, chip `#E8E8ED`. No surface on a surface of its
  own colour.
* **Both themes ship.** Light twins are labelled `… · light`. Theme switch is one tap in the dock.
* **Accents:** mint `#6FCF97` and amber `#E8B455` are dark-theme only; light uses `#0A7A3D` and `#7A5410`.
* **"Piggy bank", never "kitty"** — strings, schema, screen names, logs.
* **Money rules are two settings.** The group carries defaults; the game carries its own, seeded from the
  group's, overriding it for that game only and never writing back. With no group setting the game's
  options open **unselected**. Where a split is set, the default is by size of win. **`GR8` and `O4` now
  present this identically** (rev 18).
* **The player card is `T2`**, the sheet. `N3`, the push, is retired.
* **The night closes on `E6`.** `1C` is the past-night sheet reached from Sessions.
* **Home is `H1` / `H2` / `H3`**, three data-driven states. `GR1` is retired.
* **The live night is the T-series** — T1 resting · T2 player card · T3 admin drawer · T3b hold · T4 cashed
  out · T5 nobody in yet. Prefixes mean one thing each: **H** home · **T** the live night · **N** an entry
  made during it · **E** the ending · **C**/**X** invites and outside readers · **GR** the group.
* **The book is two destinations** — Sessions (the list) and My stats (the figures).
* **Offline:** a pending mark on the row plus a count in the dock (`N11`); a queued entry is written and
  counted locally the moment it is made.
* **Corrections are append-only** (`N12`): a correction is a new row naming what it replaces and who made
  it; the original stays struck through in place; totals count the correction only.
* **Nudge the table** (`E8`): fixed message, once, skips whoever has paid, marks nothing paid.
* **Handing over admin** (`GR9`): one admin, claimed players only, only the new admin can hand it back.
* **A failed write at settle-up: the night goes read-only until the host resolves it.** Specified, not
  drawn. No last-writer-wins, no silent merge, no second settle.

## Not decided — do not invent

1. **The group switch** — top of home, in a format that stands out, not a line in Settings. Not drawn.
   Build the group scope and leave the control's slot.
2. **Navigation order** — recommendation: keep groups above home. Unsigned.
3. **The H format for the top-screen sections** — pending with 1.
4. Two instructions blocked for want of a screen name: "the new layout used in code", and "these two
   screens in navigation".
5. **`T3` / `T3b`** classify as push screens (white base in light). If they should read as drawers over the
   live table they need the grey base and dim layer.
6. **`T1v`** is a variant for the test, not an approved design — `T1` stands until it wins.
7. Whether the test-version board keeps its own **T1–T10** numbering, which shares a letter with the app's
   T-series.

Anything tagged **SUPERSEDED** on a board caption is a reading reference. Do not build from it.

## Reading the boards

Each board is one long canvas of sections. Within a section, screens sit in columns: the caption card on
top, the **dark** frame in the middle row, the **light** frame below it — captions share a height per tier
so every mockup lines up on one baseline. Each frame carries its ID and name; the caption states what the
screen is for, what pushes it, what it returns to, and the rule that makes it non-obvious. Green captions
are approved, amber ones need a decision, brown ones are superseded.
