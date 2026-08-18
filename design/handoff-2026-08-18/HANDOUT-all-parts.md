# Build handout for Claude Code

One file to start from. Work **part by part** — the four parts match the four design boards,
so a part is a self-contained slice of the app.

Open the board next to the code while building. The board is the source of truth for
layout; this handout and the numbered docs are the source of truth for behaviour.

| part | board file | docs |
|---|---|---|
| 1 · Club and people | `Journey Map 1 - Club and people.dc.html` | 01, 03, 12, 14 |
| 2 · The night | `Journey Map 2 - The night.dc.html` | 02, 04, 10, 11 |
| 3 · Settle and the book | `Journey Map 3 - Settle and the book.dc.html` | 04, 06, 13 |
| 4 · Not in the build yet | `Journey Map 4 - Findings.dc.html` | — |

Always-applicable: **`15-screen-geometry.md`** (frame, sheet, gaps, other resolutions) and
**`07-design-tokens.md`** (colour, type, dock pills). Read both before the first screen.

---

## Global rules — these bind every screen

1. **Reference frame 393 × 852** (standard iPhone). Points = board pixels. §1 of doc 15.
2. **Both themes ship.** Every screen is drawn dark and light on the boards; the light twin sits
   immediately to the right of its dark original, labelled `… · light`. Theme switch is one tap
   in the dock (sun/moon), no settings trip.
3. **One sheet object** for every modal — grabber, header, body, pinned footer. Numbers in doc 15 §3.
4. **Rows are intrinsic height.** Vertical slack lives in one flexible spacer per screen.
5. **Lists scroll. Sheets fit** (or promote to full-height and scroll their body only).
6. **Money entry uses a digits-only keypad**, and the footer button rises with the keyboard.
7. **Text never breaks mid-word.** Titles and pills `flex:none` + `nowrap`; only a start time truncates.
8. **The word is "piggy bank."** Never "kitty" — renamed across all designs and docs on 18 Aug 2026.
9. Nothing in the group settings rewrites a night that is running or already settled.

---

## Comments from this round, with status

| # | comment | status | where |
|---|---|---|---|
| 1 | Group switch for admins **and** for players in several groups. Not a settings line — a switch at the top, in a format that stands out. | **open — next design task** | part 1 |
| 2 | Use the H format for the sections on the top screen. Decide whether home sits above groups in navigation. | **open — recommendation below** | part 1 |
| 3 | Settlement rules also exist per game; the group setting is the default a game opens with. | done (C7 caption) · **build rule** | part 1 |
| 4 | "See who pays whom" → **Confirm** on E3 and the screen after it. | done | part 3 |
| 5 | Keypad-up state: digits only, CTAs move up with the keyboard. | rule written (doc 15 §4.6) · **state still to draw** | part 2 |
| 6 | Screens must fit the standard iPhone, sheet format and gaps included. | done — all frames 393 × 852, four overflows fixed | all |
| 7 | Light versions everywhere they were missing. | done — 24 added, 66 invisible home indicators fixed | all |
| 8 | "Update to the new layout, which is already used in code." | **blocked — name the screen** | ? |
| 9 | "Put these two screens where they belong in navigation." | **blocked — name the two screens** | ? |

### On comment 2 — home above groups

Recommendation: **no, keep groups above home.** The group is what scopes every number in the
app; if home sits above groups, the first thing a returning user sees is a screen whose figures
belong to a group they have not chosen yet, and you pay an extra transition on the common path
(open app → the group you were in → tonight). Groups first also gives the switch a natural home.

What does make the structure clearer is the switch itself (comment 1): the group name at the top
of home becomes the control, so switching costs one tap from anywhere instead of a trip out to a
list. That gets the clarity without the extra step. Say the word and I will draw it.

---

# Part 1 · Club and people

`Journey Map 1 - Club and people.dc.html` · 64 frames · docs 01, 03, 12, 14

### Screens

* **Home** — `GR1 Club home`, `H1 first run`, `H2 idle`, `H3 live`. Root, no back button, ever.
* **Groups** — `GR2 Your groups`, `GR3 New group · step 1`.
* **People** — `GR4 Players`, `GR5 Player · edit`.
* **Group settings** — `GR7 Settings`, `GR8 Money rules`, `L5 Bill rules`, `L6 Piggy bank rules`, `C7 Settlement due`.
* **Invites** — `GR6 Invite this player`, `C3a Invite a player`, `C3b Already claimed`, `C3c Reset the code`, `C3d QR sheet`, `C3e Blocked · offline`.
* **Claiming (the invited player's side)** — `X2a Checking the code`, `X2b Ready to claim`, `X2c Dead code`, `X2d Typing a code`.
* **Open a night** — `O1 New session`, `O2 Add players`, `O3 Money rules · empty`, `O4 Money rules`, `O5 Rule editor`, `O6 Collector picker`, `O7 The piggy bank · tonight`.

### Build order

1. Group scope + switch (see comment 1 — do not build the old settings-line version).
2. Home, three states. States are chosen from data, never from an onboarding flag: sessions = 0 → first run; last night settled → idle; night running → live. Live outranks every other state.
3. Players and player edit.
4. Group settings → money rules → the three rule sheets.
5. Invite + claim, both sides.
6. Open a night (O1 → O7).

### Rules that are easy to get wrong

* **Money rules live at two levels.** The group setting is the default; a game opens with it
  pre-selected and can be changed for that game alone from the game's own money rules.
  Changing the group default never touches a game that is running or settled.
* An unset collector means the money is held by the group.
* `O4` presents active rules as **one hairline-divided list** under a "Tonight's rules" caption —
  title, one detail line, chevron to edit, toggle on the right, "Add a rule" as the last row.
  There is no "Untitled rule" placeholder card.
* Deleting every session returns home to first-run state.
* Rules are inherited between nights and not asked for again; the card shows last night's buy-in and blinds.

---

# Part 2 · The night

`Journey Map 2 - The night.dc.html` · 42 frames · docs 02, 04, 10, 11

### Screens

* **Tonight** — `H1 Tonight · resting`, `H5 nobody in yet`, `H2 Player card · at the table`,
  `H3 Table admin drawer`, `H3b Hold in progress`, `H4 Player card · cashed out`.
* **Entries** — `N3 One player`, `N4 Buy-in · pick a player`, `N5 First buy-in · amount`,
  `N6 Rebuy · amount`, `N7 Seat a new player`, `N8 Cash out · pick a player`,
  `N9 Cash out · count the chips`, `N10 Correct an entry`.
* **Watchers** — `X1a Watching a live night`, `X1b Refused share link`.
* **The bill** — `L1 The bill`, `L2 Add a spend`, `L3 Spend · edit`, `L4 nothing on it`.

### Build order

1. Tonight, resting and empty.
2. Buy-in path: N4 → N5 → N6. **Keypad-up state is required here** (digits only, footer rises).
3. Cash-out path: N8 → N9.
4. Player card, admin drawer, hold.
5. Correct an entry (N10) — the audit path; every correction stays visible.
6. The bill (L1 → L4).
7. Watcher view, read-only.

### Rules

* The ledger records money, not hands. No pot sizes anywhere.
* A hold is a state, not a deletion — `H3b` shows it in progress.
* A watcher can never write. `X1b` is what a refused link looks like.
* Elapsed time and seat count are the only live figures on the card.

---

# Part 3 · Settle and the book

`Journey Map 3 - Settle and the book.dc.html` · 32 frames · docs 04, 06, 13

### Screens

* **Settle** — `E1 End the night · confirm`, `E2 Count up`, `E2b Where everyone stands`,
  `E3 Deductions`, `E3b Deductions · before the bill`, `E4 Settle up`, `E5 out of balance`.
* **After** — `E6 Night settled`, `E7 Payments`, `X1c A night that has ended`.
* **The book** — `1A My games · Regular`, `1B My games · Free`, `1C A night · Results`,
  `1D A night · further down`, `G4 My stats`.

### Build order

1. E1 → E2 → E3 → E4. The primary button on E3 and on the screen after it reads **Confirm**.
2. E5, the out-of-balance state — never auto-correct, always show the gap.
3. E6, E7.
4. The book: sessions list, a night, my stats.

### Rules

* A due date reminds; it never settles by itself. Nothing moves in the book until the host settles.
* Deductions are provisional until settle. Any figure is tappable back to its rule.
* The deductions preview table is tight by design (row padding 3) — it must fit with Confirm visible at 852.
* My stats is scope-only: it names what it counts, and shows no result figures.

---

# Part 4 · Not in the build yet

`Journey Map 4 - Findings.dc.html` · 20 frames

Drawn, decided, **not scheduled**: membership tiers `P1`–`P5`, sessions free vs Regular
`S1`/`S2`, `G5 My stats · free`. Also on this board: `09 Superseded`, `10 Chrome corrections`,
`11 Missing` — read `10` before building anything, it lists chrome that was corrected after
the first drawings and supersedes older frames.

Do not build part 4 without a go-ahead.

---

## Reference index

* `15-screen-geometry.md` — frame, safe areas, sheet spec, gaps, other resolutions, acceptance checks
* `07-design-tokens.md` — colour, type scale, dock pills, my-stats rules
* `01-product-logic.md`, `03-data-model.md`, `04-money-math.md` — behaviour and arithmetic
* `06-test-checklist.md` — what to verify per screen
* `09-navigation.md` — nav structure (update pending comments 1, 2, 9)
* `CHANGELOG.md` — what moved and when
