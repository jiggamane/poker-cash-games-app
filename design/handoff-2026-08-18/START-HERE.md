# The Poker Club — build handoff for Claude Code

Cut 18 August 2026. Self-contained: open the boards straight from `boards/` in a browser, no server.

```
START-HERE.md              this file
HANDOUT-parts-1-2.md       the working handout — club/people and the night, with tonight's decisions
HANDOUT-all-parts.md       the same shape across all four parts, thinner
boards/                    the four design boards (open in a browser; support.js sits next to them)
docs/                      the numbered specs, 01–15, plus the changelog
reference/                 older per-set build references (HTML), superseded by the boards where they disagree
```

## Order of work

1. **`docs/15-screen-geometry.md`** — the frame, the sheet object, gaps, surfaces, other resolutions.
   Everything else assumes it. Reference device **393 × 852**, and that is the only device the test
   round runs on.
2. **`docs/07-design-tokens.md`** — colour, type scale, dock pills.
3. **`HANDOUT-parts-1-2.md`** — build order per part, plus the rules that are easy to get wrong.
4. The numbered spec for the part you are building. `docs/CHANGELOG.md` is cumulative and names what
   each revision supersedes; **rev 17 is the top and it wins.**

Where a board and a spec disagree, the **spec** wins on behaviour and the **board** wins on layout.

## Decided the night of 18 August — rev 17, all binding

* **Reference frame 393 × 852** (was 402 × 874, an iPhone 16 Pro). Every frame redrawn; four screens
  were tightened to fit rather than cut.
* **The sheet is one object**, specified to the point: radius 26, grabber 38 × 5, header 12/22,
  body rows at 22 and card stacks at 20, pinned footer block of 82. A sheet never scrolls as a whole.
* **Surfaces.** Light base is **white on a plain push screen, grey `#F4F4F6` only when the screen
  carries a sheet or drawer**; panel white; card inside a panel grey; chip `#E8E8ED`. No surface sits
  on a surface of its own colour.
* **Both themes ship.** Every screen exists dark and light on the boards; the light twin is labelled
  `… · light`. Theme switch is one tap in the dock.
* **Accents:** mint `#6FCF97` and amber `#E8B455` are dark-theme only — light uses `#0A7A3D` and
  `#7A5410`. Accent text clears 4.5:1 in both themes.
* **"Piggy bank", never "kitty"** — UI strings, schema, screen names, logs.
* **Money rules are two settings.** The group carries defaults; the game carries its own, seeded from
  the group's and editable, overriding the group **for that game only** and never writing back. With
  no group setting, the game's options open **unselected**. Where a split is set, the default is by
  size of win.
* **The player card is `T2`, the sheet.** `N3`, the push, is retired.
* **The night closes on `E6`.** `1C` keeps its other job: the past-night sheet from Sessions.
* **Home is `H1` / `H2` / `H3`**, three data-driven states. `GR1` is retired.
* **The live night is the T-series** — `T1` resting, `T2` player card, `T3` admin drawer, `T3b` hold,
  `T4` cashed out, `T5` nobody in yet. Prefixes now mean one thing each: **H** home · **T** the live
  night · **N** an entry made during it · **E** the ending · **C**/**X** invites and outside readers ·
  **GR** the group.
* **The book is two destinations** — Sessions (the list) and My stats (the figures). "My games" and
  "My nights" are retired as names.
* **Offline:** a pending mark on the row itself plus a count in the dock (`N11`). A queued entry is
  written and counted locally the moment it is made.
* **Corrections:** append-only. A correction is a new row naming what it replaces and who made it;
  the original stays struck through in its own place (`N12`). Totals count the correction only.
* **Nudge the table** (`E8`): fixed message — group, date, amount, who is collecting. No free text,
  marks nothing paid, goes out once, skips whoever has paid.
* **Handing over admin** (`GR9`): one admin, claimed players only, only the new admin can hand it back.
* **A failed write at settle-up: the night goes read-only until the host resolves it.** Specified,
  not drawn. No last-writer-wins, no silent merge, no second settle.

## Not decided — do not invent

1. **The group switch** — admins and any player in more than one group need a switch at the top of
   home, in a format that stands out, not a line in Settings. Not drawn. Build the group scope and
   leave the control's slot.
2. **Navigation order** — recommendation on the table: keep groups above home. Unsigned.
3. **The H format for the top-screen sections** — asked for, pending with 1.
4. Two instructions blocked for want of a screen name: "the new layout used in code", and
   "these two screens in navigation".
5. `T3` / `T3b` currently classify as push screens (white base in light). If they should read as
   drawers over the live table they need the grey base and dim layer.

Anything tagged **SUPERSEDED** on a board caption is a reading reference. Do not build from it.

## Reading the boards

Each board is one long canvas of sections. Within a section, screens sit in columns: the caption card
on top, the **dark** frame in the middle row, the **light** frame below it — all captions share a
height so every mockup lines up on one baseline per tier. Each frame carries its ID and name; the
caption states what the screen is for, what pushes it, what it returns to, and the rule that makes it
non-obvious. Green captions are approved, amber ones need a decision, brown ones are superseded.
