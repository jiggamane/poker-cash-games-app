# Journey map · board 4 — findings, in text

A reading of `design/handoff-rev18/boards/Journey Map 4 - Findings.dc.html`, the
fourth board of the rev-18 customer journey map, cut 19 August 2026. The board is
the audit the other three boards produced: what was drawn and is not built, what
is superseded, every chrome correction made while the frames were being placed,
and what the journey still needs.

It is a **snapshot of 19 August**, kept here so the findings can be read, cited
and searched without opening a 140 KB board. It has **not** been re-checked
against `main` — several items below have moved since (`/ledger` and E6 among
them, see `CLAUDE.md` and `docs/screens.md`). Where this file and the board
disagree, the board is the source; where the board and a numbered spec disagree,
**the spec wins**.

The method matters, and is the reason the board is worth reading: every frame
was tested against the container it claims, using the signals from
`09-navigation.md` — a round 36 px back button and an **empty** top-right for a
push; a 50 % status bar, a .32 peek, a radius-26 panel, a 38 × 5 grabber and a
30 px close for a sheet; neither for the drawer. **25 frames were drawn in the
wrong chrome.**

---

## 1 · Drawn, and not in the build (board §08)

Eight frames, all `OUT OF SCOPE`, all membership or tier-gated lists. They exist
so their content is not invented later; they keep their old chrome on purpose,
because nothing here ships. Every gate in the build calls `can(actor, …)`, which
returns `true` in v1 — so **P3 is a state no screen can reach**.

| Frame | What it is | Container | The rule on it |
| --- | --- | --- | --- |
| P1 | Membership · the three tiers (Free $0, Regular $2.49/mo, Full $9.99/mo) | Sheet over the club | Build none of it |
| P2 | Your plan — what you hold, what dropping to Free hides | Sheet | Not built; kept so the content is not invented later |
| P3 | Locked · upsell sheet | Sheet | Not built; `can()` returns true, so it is unreachable |
| P4 | Host a night · your one (the free tier's single hosted night) | Sheet | Not built |
| P5 | Host a night · used | Sheet | Not built |
| S1 | Sessions · free — the list truncated by tier | Push | **Build the content, not the tier**: the list is useful ungated |
| S2 | Sessions · Regular — every night the group has played | Push | **This is the version to build, with the gate removed** |
| G5 | My stats · free — history limited by tier | Push | Not built; G4 is the confirmed layout |

The two that carry an instruction rather than a "not built" are S1/S2 and G5:
the sessions list ships **without** the gate, and `My stats` is G4.

## 2 · Superseded — do not build from these (board §09)

Kept as a reading list, not drawn.

| Retired | Replaced by |
| --- | --- |
| N1 / N2 · Session totals and feed | One screen with one dock — **T1** |
| N1b / N1c | **T3**, the drawer, and **T2**, the player card sheet |
| B1–B6 · the bill and the piggy bank | **L1–L6**, with the four covered-by cases |
| E6 · Night settled | The past-night sheet, **1C** |
| H1 / H2 / H3 · Home states | **GR1** — one screen, three card variants |
| G1 Your groups · C2 Players · C5 Edit a player · C3 Invite · C4 Settings | **GR2, GR4, GR5, C3a, GR7** |
| C1 / C1b / G2 / G2b · group creation | **GR3**, three steps in one sheet |
| X2 Join by invite · X1 Watcher | The **X2a–X2d** and **X1a–X1c** sets |
| **The kicker back row** (small caps + a 7 × 12 chevron above the title) | Retired everywhere; corrected on 25 frames |

## 3 · The chrome corrections (board §10)

25 frames. The source files still carry the old headers — **the corrections live
on the boards only**, which is the single most citable fact on board 4: a frame
read out of `reference/screens-*.html` will still have the retired row on it.

**Nine to Chrome A (push)** — `N3, E2, E2b, E3, E3b, E4, E5, E7, G4`
Each: kicker back row removed, 36 px round back button added, title row repadded
to `26px 20px`.

**Fifteen to Chrome B (sheet)** — `N4, N5, N6, N7, N8, N9, N10, O1, O2, O3, O4,
O5, O6, O7, C7`
Each: kicker row removed, 30 px close added, then wrapped in Chrome B — status
bar to 50 %, a .32 peek of the screen behind, panel radius 26, 38 × 5 grabber.
The peek is named per frame (Tonight, Dana, Petr, The poker club, New session,
Money rules, Rule editor).

**One already in Chrome B, corrected to spec** — `E1`: panel radius 24 → 26,
grabber 38 × 4 → 38 × 5 r3, panel hairline to spec, and the 30 px close added —
*"a sheet has three ways out."*

## 4 · What is missing (board §11)

Read off the flow rather than the file list: places the journey needs a screen
and none exists, or where two exist and disagree. Ordered by what the
closed-circle test round hits first.

### Blocks the test round

- **Offline and queued state.** A three-hour night on bad wifi is in the brief,
  and no drawn screen shows an unsynced entry, a queue or a reconnect. The host
  cannot tell whether what they just logged is safe.
- **A failed write at settle-up.** The highest-stakes write in the app has no
  drawn state for the write failing, for two devices disagreeing, or for a
  settled night arriving twice.
- **Stale figures in the E-series.** The ending frames still draw the even bill
  split, 57 / 57 / 56; the confirmed rule is by size of win, re-derived in doc 14
  as 110 / 31 / 29. Frames and doc disagree.

### Needed for v1

- **Corrected and voided entries in the feed.** A correction writes a new row;
  nothing shows what that row looks like in the ledger everybody is reading.
- **Paying, from the payer's side.** `Mark paid` is admin-only, the person who
  actually paid has no way to say so, and `Nudge the table` has no drawn
  message, notification or destination.
- **My nights, My stats, My games.** Three names, two classified pushes and one
  confirmed layout for what looks like one destination. Decide which absorbs the
  others before building any of them.
- **The player card, twice.** T2 (a sheet) and N3 (a push) draw the same content
  and both are current in their own document. One has to go.
- **The exits.** Leave the club and Delete the club are specified and undrawn,
  and the hard questions are open: can you leave holding a debt, and what
  happens to nights other people played in.
- **Handing over admin.** Settings assumes admin can be transferred. No screen,
  and whether a club can hold two admins is undecided.
- **A club-level book.** The navigation model lists a shared ledger of every
  night as a push off the club; only the reader's own history is drawn.

### Later

- **Rematch** — nothing drawn between that tap and an open table: which rules it
  copies, and what it asks.
- **First run, before a club exists** — the first-run home, and the sentence
  that says what the app is, live only in the superseded board.
- **A night that crosses midnight** — every timestamp drawn is a wall clock;
  nothing says what date a 02:40 rebuy belongs to.
- **Cents, and other currencies** — Settings carries a show-cents switch, the
  type rules say whole units only, and no screen is drawn with cents.
- **Notifications** — the nudge, a night opening, a settlement coming due all
  imply a push notification; none is drawn or written.

---

## What to read next

- `design/handoff-rev18/boards/Journey Map 5 - Flow logic.dc.html` — the same
  audit as arrows rather than frames: every scenario checked for a way in, a way
  out and a defined end state. Amber marks a gap **or an arrow inferred rather
  than read in the spec**. `CLAUDE.md` says read it before wiring navigation.
- `design/handoff-rev18/docs/09-navigation.md` — the model the frames were
  tested against. Push vs sheet, both chromes in numbers.
- `docs/screens.md` — what each screen was actually built to, and where the app
  departs from a cut on purpose.
