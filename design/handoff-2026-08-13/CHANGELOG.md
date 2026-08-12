# Rev 10 — 13 August 2026 · two screens picked, and the results row is canonical

Cumulative, like the rest of this file: rev 10, rev 9, rev 8, rev 7, then the 12 August delta. Nothing has been applied yet.

Boards: `design/Player History.dc.html` (the night results `1C` and the two list states `1A`/`1B` — three screens; the earlier `1D` exploration is deliberately excluded), `design/Screens - Before the night.dc.html` (G4), `design/Style Guide v2.dc.html` (extended — the four patterns confirmed in these rounds).

## 1 · CHANGELOG

| # | Change | Status |
|---|---|---|
| S40 | **My stats uses G4's layout.** Period tabs, the this-period card, the result-per-night chart and the last games list. It is a **push** from the club. The old segmented All-groups/per-group version is dead. | FINAL |
| S41 | **The night-results screen is `1C`, exactly.** It replaces **E6 Night settled** — same UI and same logic for a night you open from a list and for the night you have just closed. E6's own layout (three figures + net-per-player with in/out beneath) is gone. | FINAL |
| S42 | **1C's summary is three figures:** Money in play (large, foreground) with **Bill** and **Kitty** grouped at the right in a smaller grey-label / red-value format, no minus signs. The buy-in and rebuy counts are not shown. | FINAL |
| S43 | **Each player row carries the whole calculation** as coloured tokens: `in 1,000` (red) · `out 1,300` (green) · `bill 61` · `kitty 15` (grey). A reimbursement rides **inside** its deduction — `bill 61 +170 back`, the `+170 back` in green — never as a separate token. Losers show `in`/`out` only, since deductions are charged to winners. | FINAL |
| S44 | **The net shown is after deductions**, and the list is **sorted by that net, best first**. On the canonical night that puts Marek (+394, reimbursed) above Dana (+320, who won more at the table). The reader's own row is bolded (800 on name and net); nothing is filled or highlighted. | FINAL |
| S45 | **Every results screen ends with one settlement status line**, and exactly one: **Settled** (green check) · **Not settled yet** (amber clock) · **Short by $X** (red). The three strings are fixed and drawn at size in `design/Style Guide v2.dc.html` § *Settlement status line* — that specimen is the only source for this copy. | FINAL |
| S46 | **The transfers section shows only the reader's own payments** and is titled **What you paid**: on the canonical night, `You → Dana $320` and `You → Lena $60`, summing to his −$380. It is not the whole night's settlement. Specified, not drawn — it sits below the results inside the same sheet. | FINAL |
| S47 | Column header over the results is **Net** (was "In → out"). | FINAL |
| S48 | **Month is the default period** everywhere, and the meta beside a period figure states the count then the average: "played 3 games / av. −$90 per game". | FINAL |
| S49 | List rows in My games read **club · session times** ("The poker club · 20:05 – 00:15"); a missed night reads "The poker club · did not play". Buy-in and duration live on the night, not in the list. | FINAL |
| D11 | Style guide extended with four patterns: **push header**, **sheet container**, **night-results row**, **settlement status line**, **period tabs in card**. | FINAL |

## 2 · The arithmetic a developer must reproduce

The canonical night, now fully consistent across `1C`, `1D`, `1A` and `1B`:

| Player | in | out | bill | kitty | reimbursed | net |
| --- | --- | --- | --- | --- | --- | --- |
| Marek | 1,000 | 1,300 | 61 | 15 | +170 | **+394** |
| Dana | 500 | 930 | 88 | 22 | — | **+320** |
| Lena | 1,000 | 1,100 | 21 | 5 | — | **+74** |
| Tomáš | 880 | 680 | — | — | — | **−200** |
| Petr | 1,500 | 1,250 | — | — | — | **−250** |
| Ivo | 1,000 | 620 | — | — | — | **−380** |

- Ins and outs each total **5,880** — that is "Money in play".
- The bill is **170**, split winners-by-% (88 / 61 / 21); the kitty is **42**, 5% of each win (22 / 15 / 5).
- Nets sum to **−42**, not zero, because the bill returned to Marek and only the kitty actually left the table. A developer should assert this: `Σ nets = −(kitty + any rule not paid back to a person)`.
- Marek nets more than Dana despite winning less. That is correct, and it is why the sort is on the final net rather than on the table result.

## 3 · What did not change

No data model changes. The money rules in `04-money-math.md` are unchanged — rev 10 changes what is *displayed* and in what order, not how anything is computed. Navigation is as rev 9 left it: My stats is a push, a past night is a sheet over the list that opened it.

---

# Rev 9 — 13 August 2026 · navigation is settled: no tab bar, push + sheet

**Read `09-navigation.md` before you build any screen.** It carries both chromes in numbers and a table classifying every screen in the app as root, push, sheet or neither. Board: `design/Nav System.dc.html`.

Cumulative, like the rest of this file: rev 9, then rev 8, then rev 7, then the 12 August delta. Nothing has been applied yet.

## 1 · CHANGELOG

| # | Change | Status |
|---|---|---|
| S31 | **No tab bar, ever.** The tab-bar options (2A, 3E, 4B) are dead. The club is the root and the only permanent screen. | FINAL |
| S32 | **Chrome A · push.** A screen you navigate to carries a 36px round back button on the title line, title at `800 32px`, an optional status badge after it, and the club name and elapsed on a meta line beneath at a 68px indent. **The top-right corner is empty on every pushed screen.** | FINAL |
| S33 | **Chrome B · sheet.** A screen you open to do one thing arrives as a sheet: `radius 26px 26px 0 0`, a 38 × 5 grabber, title `800 34px`, a 30px round close pushed right, and what is behind it at `opacity: .32`. Swipe down, tap close, or complete the action. | FINAL |
| S34 | **The choosing rule.** If a screen ends with a Save, an Add, an Apply or a confirm, it is a sheet; if it is a place you can stay in, it is a push. A sheet never carries a chevron; a push never carries a grabber or a close. | FINAL |
| S35 | **Depth limits.** Two pushes below the root, two sheets deep at most, and a sheet never pushes. Multi-step flows (group creation, the rule editor) replace the sheet's content in place and keep one close. | FINAL |
| S36 | **The ending flow (E2 → E4) is pushed, not a sheet** — going back a step is real navigation and a half-counted night must not be swipe-dismissible. E1 Confirm, which precedes it, is a sheet. | FINAL |
| S37 | **The two top-right icons on the night screen are removed** (the receipt and the house from rev 8's open question). Bill lives in the dock; the club is what the back button returns to. That question is now closed. | FINAL |
| S38 | **The kicker back row is retired.** Small-caps-plus-tiny-chevron headers are replaced by Chrome A everywhere they appeared. | FINAL |
| S39 | **T2 and T4 (the player card) are sheets** over the pushed night screen. Redrawn on the Tonight board — dimmed push chrome behind at `.32`, panel at `margin-top:18px` `radius 26px 26px 0 0`, grabber, 30px close, no chevron. Both themes for T2. | FINAL |
| D10 | New components: **push header**, **sheet container**. Both specified in `09-navigation.md`. | FINAL |
| — | **Naming collision:** the Tonight board's `H1`–`H5` collide with the old home states `H1`–`H3`. The Tonight screens are **T1–T5** from now on. | FINAL |

## 2 · Applied in the design files

`design/Nav System.dc.html` is new. `design/Tonight Home.dc.html` is fully migrated (T1 both themes and T5 in Chrome A; T2 both themes and T4 redrawn as sheets) and `design/Player History.dc.html` (1A–1D) is rewrapped in Chrome A. The three older boards still carry their original headers — build those screens from the classification table in `09-navigation.md`, not from the boards.

## 3 · What did not change

No money math, no data model, no copy other than the removal of the two icons. Section 06 of `02-screens.md` remains superseded by `08-tonight-home.md`.

---

# Rev 8 — 13 August 2026 · the session screen is one list, one dock, one card per player

**Nothing from rev 7 or from the 12 August delta has been applied yet.** This bundle is cumulative: read rev 8, then rev 7, then the 12 August delta, and treat all three as pending work. Where rev 8 contradicts rev 7, rev 8 wins and says so.

The full specification is in **`08-tonight-home.md`** — read that rather than inferring from this table. Board: `design/Screens - The night.dc.html` for everything else in the session, `design/Tonight Home.dc.html` for the six screens below.

## 1 · CHANGELOG

| # | Change | Status |
|---|---|---|
| S23 | **The Totals / Feed tabs are deleted.** The session home screen is the table: an "On the table" figure, one row per player, and a "Total in play" foot rule. There is no feed anywhere — every entry with its timestamp lives on the player it belongs to. Supersedes `N1`/`N2` and rev 7's S18 tab-contrast fix, which no longer has a subject. | FINAL |
| S24 | **`H1 Tonight · resting`** replaces N1/N2. Two different sums are shown deliberately: *On the table* counts players still seated, *Total in play* counts every dollar bought in tonight. | FINAL |
| S25 | **`H2 Player card · at the table`** replaces both `N1c` (the rebuy sheet) and `N3` (one player). It is a full screen, not a sheet: summary card (In for / Counted), timestamped entries oldest first with provenance, then **Rebuy $amount** primary with **Other amount** and **Cash out {name}** beneath. Cash-out is no longer red — only ending the night is destructive. | FINAL |
| S26 | **`H4 Player card · cashed out`** — third stat pair (Night result), a "Cashed out" entry row, and the actions become **Correct an entry** / **Back to table**. No primary. | FINAL |
| S27 | **`H5 Tonight · nobody in yet`** — new state, reachable every night. The dock inverts: **Seat a player** becomes the primary and **Bill is disabled** until somebody is in for something. | FINAL |
| S28 | **`H3b Hold in progress` is now drawn**, closing the one EXPLORATORY item in rev 7 (D9). Left-to-right wipe of the row's red at 34 %, copy swaps to "Keep holding… / Release to cancel", release reverts silently. | FINAL |
| S29 | The dock's collapsed row keeps rev 7's geometry (46px target, 14px clearance above the primary) and gains a **variant** for the empty table. Rev 7's S19 stands; S20 stands; **S22 is superseded** by S25 (sheet → screen). | FINAL |
| S30 | Player rows carry a **status-dependent value**: amount-in while seated, night result once cashed out, in the green/red pair. Same row, two meanings — keep them as two view-model fields. | FINAL |
| M16 / M17 | **Unchanged and still pending.** The pre-filled rebuy amount and the decision not to show its provenance carry over verbatim from rev 7. | FINAL |

## 2 · What is not settled

- The two glyphs in the H1 nav row — a receipt and a house — have **no specified destination**. Presumably tonight's bills and the group home. Ask before wiring.
- **Voided-entry copy** on the player card is not written. The row must exist; flag it rather than inventing a string.
- Light twins of `H3`, `H3b` and `H5` are not drawn. The substitution table in `08-tonight-home.md` is exact and mechanical — apply it rather than asking.

## 3 · What did not change

`03-data-model.md`, `04-money-math.md` and the worked night in `06-test-checklist.md` are untouched. This is a navigation and hierarchy change; no money moves differently. Screen count across the boards is unchanged apart from the six screens in the new file.

---

# Rev 7 — 13 August 2026 · in-game nav + rebuy default

Two changes, both on the live-session screen. Everything below supersedes the same-named parts of rev 6 (the 12 August file that follows this section) and of `01-product-logic.md` / `02-screens.md`, which are both already stamped with these edits.

Board: `design/Screens - The night.dc.html` — **two new screens** (`N1b`, `N1c`, dark + light) and the dock swapped in on all four session screens (N1/N2 × dark/light). 61 screens across the four boards. No money math changed; the worked night in `06-test-checklist.md` still reproduces exactly.

## 1 · CHANGELOG

| # | Change | Status |
|---|---|---|
| S19 | **The session foot is now a dock.** The End-the-night row and the Buy-in / Cash out pair are gone. The dock holds **Rebuy** (primary, 1.9fr) and **Bill** (secondary, 1fr) — the two actions used every half hour — with a collapsed **Table admin** row above them (`seat · cash out · end`). Applies to both tabs, both themes. | FINAL |
| S20 | New screen **`N1b Table admin drawer`**: Seat a player · Cash out a player · **End this poker night**. Rebuy and Bill stay live underneath. | FINAL |
| S21 | **Ending a night takes two deliberate acts** — open the drawer, then **hold 1.5s**. There is no tap path to ending a night from the resting screen. Copy: "End this poker night", sub-line "Hold 1.5s · counting starts, no rebuys". | FINAL |
| S22 | New screen **`N1c Player sheet · rebuy`**: tapping a player row on Totals or Feed opens a sheet with **Rebuy \$500** pre-filled, **Other amount** (→ N6), **Edit entries** (→ N10), and **Cash out Petr** in red — the only route to N9 that skips the picker. | FINAL |
| M16 | **The default rebuy amount is that player's last rebuy on this night.** Resolution order per player per session: last rebuy this session → session standard buy-in → group default buy-in. Per-player, not table-wide. A **voided** rebuy stops counting (fall back to the one before); a **corrected** rebuy counts at its corrected amount. First buy-ins [N5] are unaffected. | FINAL |
| M17 | **The provenance of the pre-filled amount is not shown in the interface.** No "Same as Petr's last rebuy" line under the button — the amount stands on its own and the host changes it with *Other amount*. Keep the derivation in code and in logs: the resolution order in M16 is what a developer implements, and N6's preset row still marks the resolved amount **LAST** instead of STANDARD once inside the amount screen. | FINAL |
| D8 | New component: **action dock** — panel, one collapsed disclosure row, and a 1.9fr/1fr button pair. Rest state 46px disclosure target with 14px clearance above the primary, so a thumb reaching for admin cannot hit Rebuy. | FINAL |
| D9 | New pattern: **hold-to-confirm** for destructive actions (1.5s), replacing tap-then-confirm-dialog on the end-of-night path. Interaction is specified; the progress-fill treatment during the hold is **not drawn** — build it as a left-to-right fill of the row's border colour. | Pattern FINAL, hold-state visual EXPLORATORY |

## 2 · What a developer needs to hold

- `lastRebuyAmount` is derived, never stored on the player: it is a query over that session's entries (`type = rebuy`, `playerId`, not voided, newest first). Recompute after every write to the ledger, including corrections and voids.
- The dock is one component with two states (collapsed / drawer open) and lives on both session tabs. Switching tabs must not collapse an open drawer.
- The hold gesture needs a cancel: releasing early does nothing and shows nothing.
- Nothing in `03-data-model.md` changes. `04-money-math.md` is untouched — the default is an input convenience, not a rule.

---

# Delta handoff — 12 August 2026

Everything below is a change **since the last bundle** (Cash Game v2 / Style Guide v2 / Cash Game Board + `handoff/01–07`). Nothing unchanged is restated. Where a section of an older doc is now wrong, it is named here and stamped in that file — do not infer from position in the file.

## Revisions since the first issue of this file

Same date, same bundle — this is the file you already have, corrected and extended. If you read the first issue, these are the only parts that moved:

- **Settlement due is new** (M7b, S13, §4 *C7 Settlement due*). A group-level due date, overridable per night: same night · after N days (optionally moved to the next working day) · week's end · month's end. It reminds; it never settles.
- **Group creation is one three-step flow** (S3, S4, S14) shared by both entry points — name/currency/stakes → **The money side** → **Add players**. Two new screens: `C1b`, `G2b`. Money rules no longer sit inline on step 1.
- **Rounding gained `1k`** and singular control labels (Cent, Dollar). `roundingMode` enum accordingly.
- **`C1b` input treatment specified** (S14): numeric buy-in, open chip row for rounding, disclosure rows for bills/kitty and settlement.
- **Counts corrected**: 31 screens on the Before board, 57 across the four boards. The index board's stale G3/joining and Tier 1 copy is fixed.
- **`publish/` is stale** — noted below.

Nothing in §2 *Logic changes* or §3 *Answers* changed; the money math in the first issue still stands.

## Which files supersede which

**`publish/` is stale.** It was built before this round; do not read it. `design/` in this folder is the current snapshot.

| Use this | Instead of | Scope |
|---|---|---|
| `design/Screens - Before the night.dc.html` | `publish/before.html`, `Cash Game Board.dc.html` (groups/membership/opening parts) | 31 screens, dark + light, 402 × 874 |
| This changelog §2 | `04-money-math.md` → *Rounding*, and the split rules inside *Step 2* | bill splits, rounding granularity, rule order |
| This changelog §5 | `03-data-model.md` → *MoneyRule*, *Session*, *Identity → The group-wide link* | new fields, new enums, invite model |
| This changelog §6 | `07-design-tokens.md` | additions only; no existing token changed value |
| This changelog §4 | `02-screens.md` → *02 · Groups*, *04 · The group*, *05 · Opening a night* | screen states |

`The night` and `After the night` boards are **unchanged** this round. `01-product-logic.md`, `05-build-order.md`, `06-test-checklist.md` still stand except where §2 changes an algorithm — the worked night in `06` still reproduces exactly, because none of today's changes alter its inputs.

---

## 1 · CHANGELOG

### Money and logic

| # | Change | Status |
|---|---|---|
| M1 | Bill split options are now **winners pay by %**, **winners pay evenly**, **custom** (per-player manual amounts). Replaces `equally` / `by_win_size` / `everyone`. | FINAL |
| M2 | One person covering a whole bill is now possible — it is a `custom` split with one non-zero row. | FINAL |
| M3 | A **percentage** amount can no longer be charged to *everyone at the table*. Percentage implies winners only; the UI prevents the combination and the server rejects it. | FINAL |
| M4 | Winners-only rule on a night with **no winners**: fixed fees and kitties collect nothing and do not carry; a bill backed by a real expense falls back to charging everyone. | FINAL — my call, question (b) came back unanswered; override if wrong |
| M5 | **Rule order is host-editable** by dragging. Order is visible, stored, and snapshotted at open. | FINAL |
| M6 | Rule edits apply to **new nights only**. A session keeps the snapshot it opened with. | FINAL |
| M7 | **Rounding granularity** is now a group money rule — cent, dollar, 10s, 50s, 100s, 1k — unset by default. Replaces the display-only *Show cents* toggle. It changes computed amounts, not just formatting. | Rule is FINAL; the granularity arithmetic in §2.6 is EXPLORATORY and needs your sign-off |
| M7b | **Settlement due** is a new group rule, overridable per night: same night · after N days (optionally moved to the next working day) · week's end · month's end (+date). It reminds only — nothing settles by itself. | Rule FINAL; per-night override screen not drawn |
| M8 | **Stakes** are group-level: small blind, big blind, and straddle as a three-state pick — No / Optional / Mandatory — with a value when not No. | FINAL |
| M9 | Cash out then buy back in: unchanged, confirmed. Ends the night holding the cashed-out amount plus chips in front of them. | FINAL, no code change |
| M10 | Free tier scope changed from *last 30 days* to **last 3 games** — a per-player count window, not a date window. | FINAL |
| M11 | The one host night in Regular **renews with the subscription** (was one-off, "does not renew"). | FINAL |
| M12 | Membership: Free $0 · **Regular $2.49/mo** (was Tier 1, $4) · **Full $9.99/mo** (was $9). | FINAL |
| M13 | No joining. A player added by name **auto-appears** in the group; there is no group-wide join link and no join flow. | FINAL |
| M14 | Invite links are **per player**, reusable until claimed, resettable by the host. A claimed link opened on a second device is **refused** until the host resets it. | FINAL |
| M15 | Player nets are no longer shown on the roster. Cross-group aggregation is confined to the player's own stats page. | FINAL |

### Screens and flows

| # | Change | Status |
|---|---|---|
| S1 | **G3 Switch group deleted.** Group choice happens on G1 Your groups. | FINAL |
| S2 | G1: **Join button removed**; New group is the only action. | FINAL |
| S3 | Group creation is now **three steps, shared by both entry points**: name/currency/stakes → **The money side** (tiles) → **Add players**. New screens: `C1b The money side`, `G2b Add players`. | FINAL |
| S4 | C1 Name the group is step 1 of the same three-step flow (host-framed copy); it no longer carries money rules inline. | FINAL |
| S17 | `N3 One player`: the **Note** action is removed — notes were undefined and a descriptive note about money moving would desync the ledger. Rebuy now spans the row. If cash changes hands outside the app it needs a real entry type, not prose. | FINAL |
| S18 | Contrast pass on the night board: the Totals/Feed tab track no longer uses hardcoded black (dark/light field colour), the selected tab is a solid white/black pill, and the DEFAULT / X2 sub-labels on selected amount chips were dark-on-dark. `E6` secondary action renamed **Rematch → Close**. | FINAL |
| S15 | `E2 Count up` now shows the count **in progress**: *Still to count* on top (em-dash, pencil), *Done* below (value, green check), header card neutral until balanced. Its primary CTA is **blocked** while any stack is uncounted (E5's disabled token pair), with a "See where everyone stands" link to a new screen `E2b Where everyone stands` — ranked net before any deduction, uncounted players listed apart, ranks flagged provisional. | FINAL |
| S16 | `X2 Join by invite` **rebuilt as `X2 Claim your place`** — the per-player link binds an existing member row ("Ivo added you as Petr"), states the one-device rule, CTA "This is me · open the group". The old join flow is gone, per M13. | FINAL |
| S14 | `C1b The money side` (step 2) uses one input per setting: buy-in is a **numeric field** (keypad, like the blinds), rounding is an **open chip row** — Cent · Dollar · 10s · 50s · 100s · 1k — set below the fields under a hairline rule, and Bills/kitty and Settlement due are **disclosure rows** opening O3/O4 and C7. Drawn in two states, nothing set and filled in. | FINAL |
| S13 | New screen `C7 Settlement due`: **Same night / After N days (with next-working-day) / Week's end / Month's end**, with the rule restated in plain words and the resolved date. Settings and rule lists show only that sentence. | Selector FINAL; week's-end and month's-end control states not yet drawn |
| S5 | G4 My stats rebuilt around recency: period tabs, this-month card, an 8-night result chart, last 4 games. All-time sits behind the *All time* tab. | FINAL |
| S6 | C3 Invite a player rebuilt per-player: player row with claim state, that player's link, Send invite / QR code / Copy link, Reset link. | FINAL |
| S7 | C4 Settings "This group" list now mirrors creation: Group name, Currency, Stakes, Straddle, Rounding, Money rules. *Show cents* removed from Appearance. | FINAL |
| S8 | C2 roster rows show name, nights, role — no money. | FINAL |
| S9 | C5 Edit a player gained **Stats and history → Full stats** (the host can open a player's stats in the My-stats layout). | FINAL |
| S10 | O1 New session: money rules demoted from a two-option radio block to one row in *The game* ("same as last time"). Inheriting is the default. | FINAL |
| S11 | P5 Host a night · used rebuilt as a full-membership push (G5 pattern). "Ask Ivo" and the hand-over list are gone. | FINAL |
| S12 | C6 title is now **The kitty bank**. | FINAL |

### Design system

| # | Change | Status |
|---|---|---|
| D1 | New component: **dashed placeholder field** (an optional setting not yet filled). | FINAL |
| D2 | New component: **minimal period tabs** (text + underline), used inside a tinted card. | FINAL |
| D3 | New component: **pill segmented pick** (straddle). | FINAL |
| D4 | New component: **result-per-night bar chart** in a hairline card. | FINAL |
| D5 | New component: **stat pair row** (label above value, left/right anchored). | FINAL |
| D6 | New token pair: **amber** for a pending/unclaimed state. | FINAL |
| D7 | Single-line picker fields: vertical padding 16 → 13. | FINAL |
| D8 | Inline note blocks: padding 16px 18px → 12px 18px where a screen is dense. | FINAL |

### Copy

- "Tier 1" is gone everywhere; the tier is **Regular**.
- Free: "Your results, last 3 games"; "Tonight, and your last three games."
- Regular bullets, in order: every night including ones you missed → your stats with no limit → host one night yourself.
- Full bullets: "Host unlimited poker games", "Manage players, money rules and settlements".
- Locked rows read "before your last three" (was "older than a month").
- G2 note: "A new group starts empty. Players you know are not carried over, and neither are their results elsewhere."
- Money rules field labels: "Standard buy-in", "Food and drinks split, the kitty bank, fees", "Rounding".
- P4/P5: "renews on 4 September"; P5 headline "Host unlimited nights with full membership".

### Ignore, explicitly

- `04-money-math.md` → *Rounding* → rule 2 bullet list naming `by winners` / `by everyone` / `by win size` splits: those split names no longer exist. The largest-remainder mechanism itself is unchanged and still correct.
- `03-data-model.md` → *Identity* → *The group-wide link*: dead. There is no group-wide link for players. The live **watcher** link still exists (see §5.6).
- `02-screens.md` → *02 · Groups* → any mention of switching groups or joining.
- `07-design-tokens.md`: nothing was removed or re-valued; treat §6 as an append.

---

## 2 · LOGIC CHANGES

### 2.1 Bill splits are now: winners by %, winners evenly, custom

**Rule.** A bill is charged only to players in profit, either proportionally to the size of their win or evenly between them, unless the host chooses `custom` and types an amount per player.

**Worked example.** The canonical night, bill $170. Winners: Dana +$430, Marek +$300, Lena +$100 (total wins $830).

- *Winners evenly* — 170 ÷ 3 = 56.67. Largest remainder, tie broken by size of win: **Dana $57, Marek $57, Lena $56**. Unchanged from the last bundle.
- *Winners by %* — the awkward case. Dana 170 × 430/830 = 88.07 → 88; Marek 170 × 300/830 = 61.44 → 61; Lena 170 × 100/830 = 20.48 → 20. Sum 169, one unit short. The unit goes to the largest fractional remainder (Lena, .48): **Dana $88, Marek $61, Lena $21**.
- *Custom* — host types Dana $170, Marek $0, Lena $0. Validation: the entered amounts must sum to the bill exactly; the field is blocking, not warning.

**Payer who is also charged.** Marek paid the bar the $170 and is a winner. Both movements stand and neither cancels the other: he is reimbursed $170 as the payer, and charged $61 as a winner under *by %* — net **+$109** to him inside settle-up. The ledger keeps two entries, not one net entry.

**Replaces.** `split ∈ {equally, by_win_size, everyone}`. `equally` → *winners evenly*, `by_win_size` → *winners by %*, `everyone` → **removed for bills** (a bill spread across losers was never used and now conflicts with M3). `custom` is new.

**Retroactive?** No. New sessions only; settled nights keep their snapshot.

### 2.2 One person can cover a bill

**Rule.** A single payer is expressed as a `custom` split with one non-zero row — there is no separate "one person pays" flag.

**Worked example.** Bill $170, host picks Dana: Dana $170, everyone else $0. If Dana is *not* in profit the split still stands; `custom` is the one split that ignores the winners-only constraint.

**Replaces.** "Not currently possible."

**Retroactive?** No.

### 2.3 Percentage × everyone is rejected

**Rule.** `amountType = percent` may only be charged to winners. The combination with *everyone at the table* is unrepresentable.

**Worked example.** A 5% kitty on a night where Ivo ends −$540. Previously the rule existed and contributed $0 from Ivo, which made the rule's stated basis a lie. Now the rule cannot be authored that way: the UI disables *everyone* when the amount is a percentage, and the API returns a validation error for the pair.

**Replaces.** Allowed-but-zero.

**Retroactive?** Existing rules of that shape, if any exist in test data, must be migrated to winners-only. Behaviour on already-settled nights does not change, because the outcome was identical ($0 from losers).

### 2.4 No-winner nights

**Rule.** On a night where nobody is in profit: percentage rules yield nothing, fixed fees and kitty charges to winners collect nothing and do not carry forward, and a bill backed by a real expense falls back to charging everyone at the table evenly.

**Worked example.** Six players, all down or flat, one $170 bar bill paid by Marek. 170 ÷ 6 = 28.33 → floor $28 each ($168), two units left, given to the two players with the highest net result (least negative), tie broken by name: **two players pay $29, four pay $28**. Marek is still reimbursed the full $170. A fixed $20 host fee charged to winners collects **$0** and is not owed later.

**Replaces.** Nothing formally specified; this was open question (b).

**Retroactive?** New nights only.

⚠ You left (b) unanswered, so this is my call. The reasoning: money that really left someone's pocket must come back, so the bill falls back; a fee is a cut of winnings, and there is nothing to cut. If you would rather the fee accrue, say so — it becomes a `carriedBalance` on the fee rule and stops being a pure function of the night.

### 2.5 Rule order is host-editable

**Rule.** The host can drag rules into order; the order is shown in the list, stored on the group, and snapshotted onto the session at open. Application walks the order top to bottom.

**Worked example.** Dana +$430, with a $20 host fee (fixed, winners) and a 5% kitty on **net**.

- Fee first: 430 − 20 = 410, then 5% of 410 = 20.5 → **$21**. Dana keeps $389.
- Kitty first: 5% of 430 = 21.5 → **$22**, then fee $20. Dana keeps $388.

One dollar apart, and both are defensible — which is exactly why the order must be explicit and visible rather than an invisible `sortOrder`.

**Replaces.** Stored creation order with no UI.

**Retroactive?** No — reordering affects sessions opened afterwards.

### 2.6 Rounding granularity — EXPLORATORY, needs your sign-off

**Rule.** The group picks a granularity: cent, dollar (default behaviour today), 10s, 50s, 100s, 1k. Labels are singular on the control (Cent, Dollar); settings restates the stored value ("Dollars"). Every divided amount is expressed in whole units of that granularity, and the parts still sum exactly to the total.

**Proposed arithmetic.** Compute exact shares, floor each to a whole unit of the granularity, then hand out whole units by largest remainder (same tie-break as today: size of win, then name). Any residue smaller than one unit goes to the largest share.

**Worked example**, bill $170 between Dana +$430, Marek +$300, Lena +$100, *winners evenly*:

- **Dollars** — $57 / $57 / $56 (today's answer).
- **10s** — exact share 56.67, floor to 50 each = $150; two units of $10 remain → Dana $60, Marek $60, Lena $50.
- **50s** — floor to 50 each = $150; $20 remains, smaller than one unit → it goes to the largest share: **Dana $70, Marek $50, Lena $50**.

The 50s case is the one I am unsure about. The alternatives are to round the *total* down and let the host absorb the difference, or to refuse a granularity that cannot divide the amount. Pick one before this is built — it is cheap now and a migration later.

**Replaces.** *Show cents*, which was display-only and never touched the arithmetic.

**Retroactive?** New nights only. Rounding is part of the rules snapshot.

### 2.7 Free tier window

**Rule.** Free shows a player their **last 3 games**, not the last 30 days.

**Worked example.** A player with nights on 12 Jul, 19 Jul, 26 Jul, 1 Aug, 5 Aug, 8 Aug sees 1 Aug, 5 Aug and 8 Aug on 15 August, and still sees exactly those three on 30 September if no new night is played. Under the old rule they would have seen nothing.

**Replaces.** A rolling date window.

**Retroactive?** It is a read-side scope, so it applies immediately to all history.

---

## 3 · ANSWERS TO THE OPEN QUESTIONS

**a. One person covering a whole bill** — **overridden.** Add it, as a `custom` split where the host picks who and types amounts. See §2.1–2.2.

**b. Winners-only rule when nobody won** — **unanswered by you; I took the bracketed behaviour.** Collects nothing, no carry; an expense-backed bill falls back to everyone. See §2.4, including what changes if you want fees to accrue.

**c. Percentage charged to everyone** — **overridden.** Prevent the combination. Percentage means winners only, in the UI and in validation. See §2.3.

**d. Cash out then buy back in** — **correct.** They end the night holding what they cashed out plus what is in front of them. No change.

**e. Rule order** — **overridden.** The host can drag to reorder; the order is visible. See §2.5.

**f. New rule shapes** — the model holds; only the *how it is split* axis changes value set, to `by_percent | evenly | custom`, with `custom` carrying per-player amounts. No new axis, no new kind.

**Plus, asked and answered:** rule changes apply to **new nights only**.

---

## 4 · SCREENS

All at 402 × 874, dark above / light below, in `design/Screens - Before the night.dc.html`.

### G1 Your groups — changed
States: has groups (shown) · single group · none yet (not drawn, and now reachable only on a fresh install). Interactive: each group card → that group's Home; **New group** → G2. The Join control is gone. Nothing else on the screen acts.

### G2 New group — changed
One state: filling in. Interactive: Group name (text, cursor shown) · Currency → picker · Stakes: small blind, big blind (numeric) and a straddle pick of No / Optional / Mandatory with a value field when not No · Money rules, three dashed **optional** fields — Rounding, Standard buy-in, Food and drinks split/kitty bank/fees — each opening its own editor · **Add** under *Who is in it* → name entry · **Create the group** → C2 roster.
Not-yet-possible: none of the money rules block creation; a group with no rules opens tables with no deductions. If Group name is empty, Create is disabled — not drawn.

### C1b The money side — new, step 2 of both create flows
Two states drawn: **nothing set** (dashed fields, placeholders naming the fallback — `$0`, "Nothing off the table", "Same night") and **filled in**. Interactive: Standard buy-in (numeric keypad) · Bills, kitty bank and fees → O3/O4 · Settlement due → C7 · Rounding chips, single pick, no navigation. **Skip** in the nav leaves every default in place; **Next · who is in it** → G2b.

### G2b Add players — new, step 3 of both create flows
Name entry and the seated list; **Create the group** finishes both flows.

### C7 Settlement due — new
Four options, each expanding in place: **Same night** · **After N days** (stepper + "Move to the next working day") · **Week's end** · **Month's end**. The rule is restated in plain words with the resolved date ("Two days after the night, moved to the next working day. Tonight ends Tue 12 Aug → due Thu 14 Aug"). Settings and rule lists show only that sentence.
Not drawn: the week's-end (Sat/Sun/Mon) and month's-end (last day / a date) control states, and the per-night override.

### C1 Name the group — changed
The onboarding twin of G2, same sections and same controls, host-framed copy. Straddle defaults to **No** here. **Create the group** → C2.

### G4 My stats — rebuilt
States: this month (drawn) · this year · all time (both undrawn, same layout, different figures and chart span) · a first-run empty state (undrawn — needed: no nights yet).
Interactive: group chips (All groups / per group) · period tabs Month / Year / All time inside the card · **See all** → the book · a game row → that night. The chart is a read-only figure.
Reads: won/lost count, average per night, result per night for the last 8 nights, last 4 games with duration. All-time totals appear only under the *All time* tab — nothing on the default view sums groups, which is what keeps the currency question (below) off the critical path.

### C2 Players · the roster — changed
Rows carry name, nights, role. No money. Interactive: row → C5 · **Add a player** → name entry · **Invite** → C3.

### C5 Edit a player — changed
Interactive: Name (text) · *Pays into the kitty* (toggle, on) · **Stats and history → Full stats** → that player's stats in the G4 layout · **Remove from the group** → confirm (undrawn) · **Save**.

### C3 Invite a player — rebuilt
States drawn: **not claimed**. Undrawn and needed: **claimed** (pill green, link row muted, Reset link the only control), **reset just now** (new link, brief confirmation), and the QR sheet itself.
Interactive: **Send invite** (share sheet: WhatsApp, Telegram, iMessage, mail — Expo `Share`) · **QR code** → sheet · **Copy link** (`expo-clipboard`) · **Reset link** → confirm, old token dies · **Done**.
Rules stated on screen: the link is reusable until claimed; a claimed link on a second phone is refused until reset; the player can be in tonight's ledger with no link at all.

### C4 Settings — changed
*This group* now lists Group name, Currency, Stakes, Straddle, Rounding, Money rules — each a row that opens its editor. *Appearance* is Theme only. *Watchers* keeps the live-link toggle.

### O1 New session — changed
Money rules is a row in *The game* reading "same as last time"; tapping it opens the rules editor (O4/O5), where a rule can be switched off for tonight. Everything else on the screen is unchanged. **Open the table · 20:05** stays the only primary.

### P1 / P2 / P3 / P4 / P5 · S1 / S2 · G5 — changed copy and prices
Plan names and prices per M12; Free scope per M10; host allowance renewal per M11. P5 is now an upsell panel with a single **Take full membership**.

### Still not designed

| Screen | Why it matters now |
|---|---|
| The book — month and all time | G4's **See all** and the *All time* tab both point at it |
| Watcher first run + watcher's own view | Watchers now **install** — see §5.6; this is a real screen set, not a URL |
| Notifications | No surface anywhere yet |
| C3 claimed / reset states, QR sheet | The invite flow's other half |
| Empty states: no groups, no nights, no players | Reachable on any fresh install |

Say the word and I will draw them; the watcher set and the book are the two that block your screen work.

---

## 5 · DATA IMPLICATIONS

**5.1 MoneyRule**
- `split` enum → `'by_percent' | 'evenly' | 'custom'` (was `'equally' | 'by_win_size' | 'everyone'`). Migration: `equally → evenly`, `by_win_size → by_percent`, `everyone` → error, migrate by hand.
- New: `customShares` — `[{ memberId, amount }]`, minor units, only when `split = 'custom'`. Must sum to the rule's resolved amount; enforce server-side.
- `charge` gains a constraint, not a value: `amountType = 'percent'` ⇒ `charge = 'winners'`.
- `sortOrder` is now user-writable and needs a reorder endpoint (a single ordered array write, not per-row patches).

**5.2 Group**
- New: `roundingMode` — `'cents' | 'dollars' | 'tens' | 'fifties' | 'hundreds' | 'thousands'`, nullable (unset = dollars).
- New: `stakes { small, big }` at group level, plus `straddleMode` — `'none' | 'optional' | 'mandatory'` — and `straddleAmount`, nullable.
- `rulesSnapshot` on Session must now include `roundingMode`, the straddle fields and the rule order.

**5.3 Stats reads (new work, not just fields)**
- Hourly rate and per-night duration need a **session end timestamp** that means "cards down", distinct from `settled`/`closed`. If `endedAt` is currently set at settle-up, the number will overstate play time.
- Won/lost counts, games per group, average per night: derivable, but each needs a period bound (month / year / all time) — worth a materialised per-member-per-month rollup rather than scanning the ledger for a stats screen.
- Free-tier scope is now "last 3 sessions for this member", a LIMIT, not a date predicate.

**5.4 Membership**
- Plan enum rename `tier1 → regular`, prices $2.49 / $9.99.
- Host allowance becomes periodic: `hostNightsAllowed`, `hostNightsUsed`, `allowanceRenewsAt`. Reset on renewal, not lifetime.

**5.5 Invites and identity**
- Invite is per **member**, not per group: `memberId`, `token`, `createdAt`, `claimedAt`, `claimedByDeviceKey`, `resetCount`. Reusable until `claimedAt` is set.
- Second-device rule: a claim attempt against a member with a non-null `claimedAt` and a different device key is **refused** — needs a distinct error the app can show ("ask the host to reset the link").
- Reset: invalidate the token, mint a new one, clear `claimedAt`. Keep the member row untouched — nights must survive a phone change.
- Delete the group-wide player join token. Nothing consumes it.

**5.6 Watchers now install the app**
This is the change with the longest tail. A watcher stops being an anonymous URL reader and becomes a device with a persistent identity:
- Watchers need a row with a device key and a claim state, like members but non-playing — either `member.role = 'watcher'` with no ledger entries permitted, or a separate `Watcher` relation. I would keep it on Member with a role, so a watcher can later be promoted to a player without a new identity.
- The live link becomes a **deep link** (universal link + app scheme) that resolves to "watch group X" and survives an install (deferred deep link).
- A watcher's first run needs a state before any group exists on the device: opened the app with no link. That is a real screen.
- Push notifications become plausible for the first time (a night opened, a night settled). No design exists; no token/permission plumbing is specified.

**5.7 Removed**
- Group switching: no screen, no state.
- Player joining: no flow, no token.
- *Show cents* preference: replaced by `roundingMode`, which is not a display flag.

---

## 6 · DESIGN SYSTEM DELTAS

Additions only. **No existing token changed value.** Dark value first, light second.

**New colour pair**
- Amber, pending/unclaimed state: `#E8B455` / `#8A5A00`. Used as text and 1px border on a pill, never as a fill.

**Dashed placeholder field** (an optional setting, not yet set)
`padding: 14px 16px` · `radius: 8px` · `background: #16161A / #F4F4F6` · `border: 1px dashed rgba(255,255,255,.27) / rgba(12,13,15,.22)` · label `500 16px`, muted colour · chevron 8 × 13, stroke 2. Contrast with the **set** field, which is the same box with `border: 1px solid` hairline and full-strength label.

**Minimal period tabs**
Row inside a tinted card, top right. Inactive `500 11.5px` muted; active `700 11.5px` foreground with `border-bottom: 1.5px solid` foreground and `padding-bottom: 3px`; `gap: 12px`. No pills, no background.

**Pill segmented pick** (straddle)
`padding: 6px 10px` · `radius: 6px` · `font: 600 12px` · inactive: transparent fill, hairline border, muted text · active: fill `#FFFFFF / #0C0D0F`, same-colour border, inverted text. Sits in a `9px 12px` hairline field with a `700 10px` uppercase label.

**Numeric cell** (blinds)
`flex: 1` · `padding: 11px 12px` · `radius: 8px` · hairline border · caption `700 10px`, letter-spacing `.1em`, uppercase, muted · value `600 18px`, tabular numerals.

**Result-per-night chart**
Card: `margin: 0 20px` · `padding: 14px 14px 10px` · `radius: 12px` · `1px solid` hairline. Bars 15px wide, `radius 3px 3px 0 0` above the axis and `0 0 3px 3px` below, max height 36px, positive/negative zones 38px each, `gap: 4px`, axis `1px` hairline, labels `500 9.5px` muted. Colours reuse the existing green/red pair.

**Stat pair row**
Label `700 10px` uppercase muted above value `700 18px` tabular; two pairs per row, first left, second pushed right with `margin-left: auto`. Values may mix colour inside one value (`4 W` green · `2 L` red).

**Pending pill**
`700 10px`, letter-spacing `.1em`, uppercase · `padding: 5px 8px` · `radius: 5px` · amber text and border.

**Changed values**
- Single-line picker/text field vertical padding: `16px` → `13px` (G2, C1 only).
- Inline dashed note padding: `16px 18px` → `12px 18px` on dense screens (G2, C1, G4).
- Filling upsell panel (was G5-only) is now a shared pattern, used on P5 and C3: `flex: 1` · `radius 12px` · card fill · hairline border · centred, icon → headline `800 26px` → body `400 13.5px/1.55`.

---

## Open question, narrowed

**What does a cross-group total mean when the groups don't match?** Still open, but no longer urgent: G4's default view shows one period and one currency context at a time, and the only place that sums across groups is the *All time* tab. Decide there: either total only groups sharing a currency, or drop the single figure and list groups side by side.
