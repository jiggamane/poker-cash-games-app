# Handout · Parts 1 and 2

Boards: `Journey Map 1 - Club and people.dc.html` · `Journey Map 2 - The night.dc.html`
Everything decided on the night of 18 Aug 2026 is folded in below. Binding docs:
`15-screen-geometry.md` (frame, sheet, gaps, resolutions, surfaces) and `07-design-tokens.md`.

Read §A before writing any screen. §B and §C are the two parts. §D is what is still open —
do not invent answers for those.

---

# A · Style, UI and logic updates from tonight

## A1 · Geometry — the reference device changed

Every frame was drawn at 402 × 874 (iPhone 16 **Pro**). All boards are now **393 × 852**, the
standard iPhone, so matching the drawing on the base device guarantees the larger ones fit.

* Usable height 852 − 59 top inset − 34 bottom = **759**.
* Reserved footer block (button + home indicator) = **82**, always pinned.
* Rows are intrinsic height. All vertical slack lives in **one** flexible spacer per screen.
* Lists scroll. **Sheets fit** — a sheet that cannot fit promotes to full-height and scrolls its
  body only; grabber, header and footer stay put.
* Type and side margins never scale with screen size. Side margin **22** for rows and body text,
  **20** for card stacks.
* Four screens overflowed at 852 and were tightened (not cut): E3, E3b, C7, P1.

Full sheet spec — radius 26, grabber 38 × 5 at 9/2, header 12/22 with 8 below a subhead and 14
below none, footer 14/20/6 with a 17-point button — is doc 15 §3. Build sheets from that table.

## A2 · Surfaces — what white means in the light theme

The light theme is not "white everywhere". White is what **raises** a surface.

| level | dark | light |
|---|---|---|
| Base (screen) | `#0C0D0F` / `#0A0A0B` | **`#FFFFFF`** on a plain push screen · **`#F4F4F6`** when the screen carries a sheet or drawer |
| Raised panel — sheet, drawer | `#101013` | `#FFFFFF` |
| Card / field in a panel | `#16161A` | `#F4F4F6` |
| Chip / stepper in a card | `#26262B` | `#E8E8ED` |
| Hairline | `rgba(255,255,255,.11)` | `rgba(12,13,15,.1)` |

**No surface sits on a surface of its own colour.** Assert it: resolve each element's background
against its nearest painted ancestor and require they differ. 22 light frames were rebased on this
rule tonight.

## A3 · Accents

Mint `#6FCF97` and amber `#E8B455` are **dark-theme values only**. Light uses `#0A7A3D` and
`#7A5410`. Accent text must clear 4.5:1 against its own background in both themes — the two
offenders measured 1.73:1 and 1.89:1 before the fix.

Light home indicator is `rgba(12,13,15,.85)`. It was white on white in 66 frames.

## A4 · Both themes ship

Every screen on both boards now exists dark and light; the light twin sits immediately right of its
dark original, labelled `… · light`. The theme switch is one tap in the dock (sun/moon) — not a trip
into settings.

## A5 · Vocabulary

**"Piggy bank", never "kitty"** — in UI strings, screen names, table and column names, and docs.
Renamed across 54 files.

## A6 · Money rules exist at two levels

The group setting is the **default**. Every game opens with it pre-selected and can be changed
**for that game alone**, from the game's own money rules. Changing the group default never rewrites
a game that is running or already settled. This covers the bill, the piggy bank, the host fee and
settlement due.

An unset collector means the money is held by the group.

## A7 · The money-rules list is a list

`O4` presents active rules as **one hairline-divided list** under a "Tonight's rules" caption:
title with a chevron, one detail line ("$170 fixed · split by winners · Marek collects"), toggle on
the right, "Add a rule" as the last row. The **"Untitled rule" placeholder card is deleted** — an
unconfigured rule is not a row. This matches `O3`, one screen back.

## A8 · Money entry uses a digits keypad

Any amount field raises a **digits-only** keypad. The footer button rises with it and sits on the
keyboard's top edge; the body compresses — spacer collapses first, then the list scrolls. The
button is never covered. (State not yet drawn; the rule is binding regardless.)

---

# B · Part 1 · Club and people

`Journey Map 1 - Club and people.dc.html` · 64 frames · docs 01, 03, 12, 14

### Screens

| group | frames |
|---|---|
| Home | `GR1 Club home`, `H1 first run`, `H2 idle`, `H3 live` — root, no back button, ever |
| Groups | `GR2 Your groups`, `GR3 New group · step 1` |
| People | `GR4 Players`, `GR5 Player · edit` |
| Group settings | `GR7 Settings`, `GR8 Money rules`, `L5 Bill rules`, `L6 Piggy bank rules`, `C7 Settlement due` |
| Invites (host side) | `GR6 Invite this player`, `C3a Invite a player`, `C3b Already claimed`, `C3c Reset the code`, `C3d QR sheet`, `C3e Blocked · offline` |
| Claiming (player side) | `X2a Checking the code`, `X2b Ready to claim`, `X2c Dead code`, `X2d Typing a code` |
| Open a night | `O1 New session`, `O2 Add players`, `O3 Money rules · empty`, `O4 Money rules`, `O5 Rule editor`, `O6 Collector picker`, `O7 The piggy bank · tonight` |

### Build order

1. **Group scope.** Everything in the app is scoped to one group. Build the scope first; the switch
   that changes it is §D1 — do **not** build a settings-line version in the meantime.
2. **Home, three states**, chosen from data and never from an onboarding flag:
   sessions = 0 → first run · last night settled → idle · night running → live.
   Live outranks every other state. Deleting every session returns to first run.
3. Players, player edit.
4. Settings → money rules → the three rule sheets (`GR8`, `L5`, `L6`, `C7`).
5. Invite and claim, both sides. A dead invite is **one string for four causes** (unknown, spent,
   revoked, expired): identical screen, constant response time, no cause reachable by the client.
   A code is ten characters, two groups of five, alphabet excluding I, O, 0 and 1.
6. Open a night, `O1` → `O7`.

### Easy to get wrong

* Rules are **inherited** between nights and not asked for again; the card shows last night's
  buy-in and blinds pre-filled.
* `O4` is a list, not a card stack (§A7).
* Per-game rule overrides do not touch the group default, and vice versa (§A6).
* `C3d` (QR) and `C3c` (reset) **replace the sheet's content** — they are not a sheet over a sheet.
  Swiping down from the QR leaves the whole sheet.
* Nothing on a dead-code screen names the group, host, inviter or code.

---

# C · Part 2 · The night

`Journey Map 2 - The night.dc.html` · 42 frames · docs 02, 04, 10, 11

### Screens

| group | frames |
|---|---|
| Tonight | `H1 resting`, `H5 nobody in yet`, `H2 Player card · at the table`, `H3 Table admin drawer`, `H3b Hold in progress`, `H4 Player card · cashed out` |
| Entries | `N3 One player`, `N4 Buy-in · pick a player`, `N5 First buy-in · amount`, `N6 Rebuy · amount`, `N7 Seat a new player`, `N8 Cash out · pick a player`, `N9 Cash out · count the chips`, `N10 Correct an entry` |
| Watchers | `X1a Watching a live night`, `X1b Refused share link` |
| The bill | `L1 The bill`, `L2 Add a spend`, `L3 Spend · edit`, `L4 nothing on it` |

### Build order

1. Tonight — resting, and the empty table.
2. Buy-in: `N4` → `N5` → `N6`. **Keypad-up state required** (§A8), rebuy amount defaults to the
   last buy-in.
3. Cash out: `N8` → `N9`.
4. Player card, admin drawer, hold-to-end.
5. `N10 Correct an entry` — the ledger is append-only, so a correction is a new entry that stays
   visible. Never a silent edit.
6. The bill, `L1` → `L4`. A night with no bill is a legitimate settle.
7. Watcher view, read-only.

### Easy to get wrong

* The ledger records **money, not hands**. No pot sizes, no hand histories, anywhere.
* A hold is a state, not a deletion (`H3b`).
* A watcher can never write; `X1b` is a refused link.
* Elapsed time and seat count are the only live figures on the card.
* A spend added later — including during settle-up — recalculates every share and transfer, and the
  settlement screen must say it changed.
* Nothing on a bill or piggy-bank screen computes a share while the night is running. The arithmetic
  runs once, at settle-up.

---

## A9 · Answered on the night of 18 Aug

1. **Money rules are two settings, not one.** The **group** carries the defaults. The **game**
   carries its own settings, seeded from the group's and editable — an edit there overrides the group
   for that game only and never writes back. **If the group has no setting, the game's options open
   unselected** — nothing is pre-picked and nothing is assumed. Where a split is set, the default is
   **by size of win**. The E-series' even 57 / 57 / 56 is stale drawing: the sentence and the amounts
   come from the session snapshot and are never hard-coded.
2. **Offline and queued entries:** a pending mark on the row itself, plus a count in the dock
   (`N11`). A queued entry is written and counted locally the moment it is made; the mark clears per
   row as each lands. Nothing is lost and nothing is guessed.
3. **A failed write at settle-up: the night goes read-only until the host resolves it.** Not drawn
   yet — specified only. No last-writer-wins, no silent merge, no second settle.
4. **Corrections** (`N12`): the ledger is append-only. A correction is a new row naming what it
   replaces and who made it; the original stays, struck through, in its own place in the order.
   Totals count the correction only.
5. **Nudge the table** (`E8`): a fixed message — group, date, amount, who is collecting. No free
   text, marks nothing paid, goes out once, skips whoever has paid.
6. **The book is two destinations, not three:** **Sessions** (the list of nights) and **My stats**
   (the figures). "My games" and "My nights" are retired as names.
7. **Handing over admin** (`GR9`): one admin at a time, only a claimed player, only the new admin
   can hand it back. Money rules, settle-up, invites and the exits move; nothing settled changes hands.
8. **The test round runs on iPhone 16 / 15 / 14 only** — 393 × 852. Other sizes stay documented but
   are not test targets.

## A10 · The four picks, and the naming that follows

* **The player card is `T2`, the sheet.** `N3`, the push, is retired — tagged SUPERSEDED on board 2.
  The card opens over the live table, the table stays visible behind it, swipe down or the close
  glyph returns to the night. Full history lives in the sheet's own scroll, not a second screen.
* **The night closes on `E6`.** The just-closed `1C` variant is retired and off the board. `1C` keeps
  its other job — the past-night sheet reached from Sessions — so a settled night is read there, and
  `E6` is the screen you land on the moment a night is settled.
* **Home is `H1` / `H2` / `H3`, three states.** `GR1` is retired — tagged SUPERSEDED on board 1.
  Same one screen in the code with three data-driven states, per the state rules in §B.
* **The night is the T-series.** With home keeping `H`, the live-night screens are renamed:

| was | is | screen |
|---|---|---|
| H1 | **T1** | Tonight · resting |
| H2 | **T2** | Player card · at the table |
| H3 | **T3** | Table admin drawer |
| H3b | **T3b** | Hold in progress |
| H4 | **T4** | Player card · cashed out |
| H5 | **T5** | Tonight · nobody in yet |

`N`-numbers keep their meaning — the entry screens (`N4`–`N10`) and the new `N11`/`N12` states are
unaffected. `H` now means home and only home; `T` means the live night; `N` means an entry made
during it; `E` the ending; `C`/`X` invites and outside readers; `GR` the group.

---

# D · Open — needs a decision, not a guess

0. *(closed 18 Aug — see A10.)*
1. **The group switch.** Admins and any player who belongs to more than one group need a switch,
   at the **top** of the screen, in a format that stands out — not a line in Settings, not text in
   the body. **Not drawn yet; next design task.** Build the scope, leave the control's slot.
2. **Navigation order.** My recommendation: **keep groups above home.** Home above groups shows a
   returning user figures scoped to a group they have not chosen, and adds a transition to the
   common path (open → your group → tonight). The clarity that request wanted comes from the switch
   in D1, not from reordering. Needs your sign-off.
3. **The H format for the top-screen sections** — asked for, not yet applied. Pending with D1 since
   both change the same header.
4. **"Update to the new layout, which is used in code"** — blocked: name the screen.
5. **"Put these two screens where they belong in navigation"** — blocked: name the two screens.
6. **`H3 Table admin drawer` and `H3b Hold in progress`** currently classify as push screens (white
   base in light). If they are meant to read as drawers over the live table, they need the grey base
   and the dim layer instead. One word from you either way.

---

## Acceptance checks for both parts

At 393 × 852, both themes:

1. No screen scrolls as a whole; only lists scroll.
2. Footer button's bottom edge sits 28 above the screen bottom, indicator band below it.
3. Sheet grabber, header, footer and indicator match doc 15 §3 to the point.
4. Rows measure the same on SE and Pro Max; only the number visible changes.
5. Nothing under the status bar or the home indicator.
6. Text never breaks mid-word — titles and pills `flex:none` + `nowrap`; only a start time truncates.
7. Keypad up: digits only, footer button visible and tappable, body compressed.
8. No surface sits on a surface of its own colour (§A2).
9. Accent text clears 4.5:1 in both themes (§A3).
10. Light home indicator `rgba(12,13,15,.85)`.
11. The word "kitty" appears nowhere — UI, schema, or logs.
