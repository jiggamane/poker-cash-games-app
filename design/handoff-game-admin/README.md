# Handoff: Running the game (who can run it, passing it, who you are on Tonight)

Cut 26 September 2026. Board: `Screens - Running the game.dc.html` (open in a browser; `support.js` sits next to it). 21 states plus 2b, 9b, 12b, each drawn dark and light at 393 × 852.

## Overview

One phone records a night. This feature adds:

1. **Who can run a game**: a membership check on taking a game.
2. **Passing a running game** to another phone from the Table admin drawer. The receiver does nothing; it arrives as an announcement.
3. **A role line on every phone's Tonight**: recording, watching, or watching after passing it away.
4. **A "Who can run a game" view** on the group's player list (GR4).
5. **Membership gates** on opening a game.

The source brief is `uploads/design-request-game-admin.md` (paste of the owner's decisions of 25 Sep). This README is the design answer to it.

## About the design files

The board is a **design reference built in HTML**, not production code. Recreate it in the app's existing codebase and component set (Style Guide v2, rev 18 geometry, `09-navigation.md` push/sheet rules). Do not port the inline styles.

## Fidelity

**High fidelity.** Every colour, radius, type size and component is already in the system; nothing new was introduced. Copy is final except strings marked **UNSURE** below. Where this README and the board disagree, the README wins on behaviour, the board on layout (same rule as `cc-handoff/START-HERE.md`).

## Build note: nothing about payments is built

Rev 18 § 4 says to build no membership code and keep **one policy seam** that answers yes to everything. Build these screens against that seam (`canTakeGame(person, group)` etc. below). The gates and the "can't take it" rows only appear once the seam returns real answers.

---

## 1. Rules

### Who can take a game (open one, or be passed one)

| Membership | Can take a game? |
|---|---|
| Full ($9.99/mo) | Always |
| Regular ($2.49/mo) | Only while this billing period's host night is unused. Taking a game spends it. It renews with the subscription. |
| Free ($0) | Never |

The check guards **taking** a game, never **running** one:

- A night finishes on the membership it started with. A lapse mid-night changes nothing on screen until the night closes (state 16).
- Taking a game **back** has no membership check. The previous admin, or the person who opened the game, can always take it back.
- A Free member holding a game opened before membership existed sees the pass sheet exactly as state 3: no gate, no plan list, no upsell.
- Watching, claiming a place, and seeing your own money are never gated. Settlement is identical on every tier.

### Who can receive a pass (checks run in this order)

1. Claimed their place in the group (has the app; the server knows their phone). Name-only players can't receive it.
2. Membership allows it (table above).
3. Not the current admin (the current admin is not listed at all).

Being at the table is **not** required; the row says "Not playing tonight" when they aren't seated.

### Host night accounting

- Spent **once per game per person**, the first time that game lands on them.
- The same game coming back to them later that night costs nothing. A different game that period does.
- Passing a game away does not refund the host night.
- Dates: copy says "September" / "1 October". Fill in **each person's renewal date and billing period**, not the calendar month.

### Recording while a pass is pending

- The game moves only when the **server confirms**. Until then the passing phone is still the admin and still records (state 6).
- Once confirmed, the game belongs to the receiver on the server even if their phone hasn't opened the app yet. Nobody records in that gap. The previous admin sees "WAITING ON LENA" and can take it back (state 7).

### Late changes

If the game is taken back while the other phone has unsent entries, those entries are kept and shown to the admin for review (12, 12b). **Nothing is deleted.** Left-out entries stay on record, marked LEFT OUT.

---

## 2. State model

```
Game
  adminPersonId          current recorder (server truth)
  openedByPersonId       may always take back
  passedFromPersonId?    previous admin, for the role line and take-back
  passedAt?              HH:MM, for "passed to Lena at 23:10"
  pendingPass?           { toPersonId, status: 'sending' | 'failed' }   local only
  hostNightSpentBy[]     personIds whose Regular night this game has spent

Person (membership lives on the person, follows them across groups)
  tier                   'free' | 'regular' | 'full'
  hostNightUsed          bool, current billing period
  hostNightRenewsOn      date
  claimed                bool
  seatedTonight          bool

Announcement (per phone, per event)
  kind                   'received' | 'takenBack'
  fromName, at, spentHostNight: bool
  dismissed              bool

LateChange (per entry recorded on another phone after take-back)
  time, label, sub, amount, sourcePhone
  decision               null | 'added' | 'leftOut', decidedAt
```

Policy seam (answers `true` until membership ships):

```
canTakeGame(person)      tier==='full' || (tier==='regular' && !hostNightUsed)
willSpendHostNight(person, game)
                         tier==='regular' && !game.hostNightSpentBy.includes(person.id)
passTargets(game)        claimed && canTakeGame && id !== game.adminPersonId
```

### Role line (Tonight, every phone)

| Reader | Line |
|---|---|
| Admin | **You're recording** · started 20:05 |
| Anyone else (player, share-link watcher) | **Watching** · Lena is recording |
| Previous admin after passing | **Watching** · passed to Lena at 23:10 |

The first word is 600 / primary text; the rest is 500 / muted. See § 4 for layout.

---

## 3. Screens

All frames 393 × 852. Status bar 20/30 padding. Title row "Tonight" 800 32px, live tag (mint pill, dot + running time) next to it, **nothing top-right**. When a drawer or sheet is open, the content behind is dimmed to opacity 0.4 (status bar 0.5).

### 01 · Tonight and Table admin

**1 · Table admin, admin who can pass.** Drawer rows, in order:
Seat a player · Cash out a player · **Pass the game** (new, fourth) · End this poker night (red, last, "Hold 1.5s · counting starts, no rebuys"). Then Rebuy / Bill.
- Pass row is the **same size and weight** as Seat and Cash out: single line, 600 16.5px, icon 19px (two opposing arrows), chevron. No sub-line, no highlight.
- Collapsed drawer hint line becomes "seat · cash out · pass · end".
- Money rules is **not** in the drawer (board T3 wins over the brief).

**2 · Regular admin.** Identical to 1. Passing neither spends nor refunds, so the row says nothing about it. When nobody can take it, the row is **still** identical (no sub-line).

**2b · Same table, watcher.** Compare with 2:
- Role line "Watching · Marek is recording".
- No dock, no drawer, no chevrons on player rows, nothing dimmed.
- Bottom band (hairline top border, 15/22 padding, 400 13/1.45 muted): **"Marek admins the game"** (UNSURE).

### 02 · The pass sheet (Chrome B over Tonight; one sheet, content replaced per step)

**3 · List, Lena picked.**
- Header "Pass the game" + close. Sub: "They record from the moment you pass it. You keep watching, and can take it back."
- Section **Can take it · N**, then **Can't take it tonight · N**. Current admin not listed.
- Row sub-lines:
  - Full, seated: "At the table · can take it any night"
  - Regular, night free: "At the table · uses their one host night" (UNSURE)
  - Claimed, not seated: "Not playing tonight · any night"
  - Regular, used: "Host night used · back on 1 Oct"
  - Free: "Free · can't run a game"
  - Name only: "Name only · no app to send it to" + **Invite** (outline chip). Invite replaces the sheet's content with GR6 and keeps the close.
- Selection: the plan list's round tick on the picked row. Primary names the person: **Pass to Lena**. Disabled until someone is picked.

**4 · Confirm, pick is Regular.** Same sheet, content replaced, same close.
- Title "Pass to Ivo". Body: "Ivo is on Regular, which runs one game a month. Taking this one uses it."
- Two stats: "Ivo's host night" → "Used tonight" (UNSURE); "Next one" → "1 October".
- "If the game comes back to you, it stays used. Passing it to Ivo again tonight uses nothing more."
- "Ivo doesn't need to accept. It arrives on his phone and he records from then."
- Primary **Pass to Ivo**, secondary **Pick someone else** (returns to 3 with the pick kept).
- Full picks skip this step: 3's primary passes directly.

**5 · Nobody can take it.** No primary button.
- Body: "Nobody in the group can take it tonight. That's their membership, not anything you set."
- Card: "A game can go to anyone on Full, or on Regular with their host night still free. Each person picks their own."
- Every row carries **Ask** (outline chip); name-only rows carry Invite.
- Ask opens the OS share sheet with: "Marek wants to pass you tonight's game in The poker club. Going Full lets you run it." (UNSURE). It sends a message; it is not a purchase.
- Foot: "Ask sends them a message. Nobody can buy a membership for someone else."

**6 · Couldn't reach the server.** Pick stays selected. Amber pending pill **NOT PASSED** + "No connection. The game is still yours and this phone is still recording. It moves only when the server confirms." Primary becomes **Try again · pass to Lena**.

**7 · Passed, Lena's phone hasn't opened it.** Sheet closes. Tonight is read-only:
- Role line "Watching · passed to Lena at 23:10".
- Band: pill **WAITING ON LENA** + "The game is Lena's. It opens on her phone the next time she looks at the app. Until then nothing new is recorded." (last sentence UNSURE)
- **Take the game back** hold row, "Hold 1.5s · this phone records again".

### 03 · After it moves

The announcement is **one card component** in two places: pinned above the dock on Tonight, or above the Settings pill on any other screen. It is a card in the page, not an overlay, toast or banner. Card: `#16161A` / hairline border 1px rgba(255,255,255,.16), radius 14, padding 14/14/14/16, icon 19 + title 700 16.5 + body 400 13/1.45 muted + 30px round close.

**Dismissal:** tap **anywhere on the card**, the close button, the first entry the new admin makes, or opening Tonight (from 9b). The close button is a visual cue, not the only target.

**8 · Previous admin, Tonight.** Live table, no dock, no row chevrons. Band: "Lena is recording. Every entry she makes shows here as she makes it." + Take the game back hold.

**9 · New admin, arrives on Tonight.** Dock (Table admin) is theirs from this frame. Card: **Marek passed you the game** / "You're recording from 23:10. Everything before that is already here."

**9b · New admin, on home.** Same card above Settings: "You're recording from 23:10. Tap to open the table." Tapping pushes Tonight and dismisses. App closed → system notification with the same two lines.

**10 · New admin, Regular night just spent.** Body: "You're recording from 23:10. This uses your host night for September." He never confirmed, so this is where he learns it.

**11 · Taken back, Lena's phone.** Card: **Marek took the game back** / "You're watching now. Nothing you recorded is lost." Dock goes; band "Read-only. Only Marek can write to the ledger."

**12 · Late changes, line above the dock.** Chip-action outline row: amber count pill **2** + "changes from another phone" + **Review**. Shown to the admin while any late change is undecided.

**12b · Review sheet.**
- Header **From Lena's phone** + close. Sub: "Recorded there after you took the game back. Tick what belongs in the night. Nothing is deleted: what you leave out stays on record." (UNSURE)
- Section **Not decided · N** with **Tick all** on the right (600 14px, primary text, 44px hit area). When every undecided row is ticked it reads **Untick all**.
- Undecided row: time (44px column, 600 13 muted, tabular) · label 600 16 + sub 400 12.5 muted ("logged on Lena's phone") · amount 700 17 tabular · round tick (filled 20px when ticked; 1.5px ring when not).
- Section **Decided · N**: muted rows with sub "added 23:30" / "left out 23:30" and an **ADDED** / **LEFT OUT** tag (700 10.5, .1em tracking, radius 7).
- Primary **Add N to the night**, N = ticked count. Unticked rows on submit become LEFT OUT. Disabled at 0.
- The tick is the plan list's round check; there is no checkbox in the system.

### 04 · Membership gates (all sheets from home, over O1's slot)

Plan list rule 17 (X2b): ascending, reader's own plan first, muted, outline check. Nothing paid pre-ticked, so the primary starts disabled.

**13 · Free opens a game.** "Open a game" / "Running a game takes a paid membership. Watching, and your place in the group, stay free." If the reader has recorded passed games: "You've recorded two games Marek passed to you. Full lets you open your own."
- Free · INCLUDED · $0 · "Tonight, and the last three games."
- Regular · $2.49 / mo · "Every night in the book, the ones you missed included, and one night as host each month."
- Full · $9.99 / mo · "Everything in Regular, and you run games as often as you like." (UNSURE)
- Primary "Choose a plan to open a game" (disabled until a plan is picked), secondary "Not now".

**14 · Regular, host night free.** O1 unchanged with one note block on top: "This game uses your host night for September. The next one comes back on 1 October." + "Full runs a game any night, $9.99 / mo. **See Full**". No plan list.

**15 · Regular, host night used.** "You've used your host night for September. It comes back on 1 October." Breaks rule 17 once: Free is left out; Regular is drawn as already yours with a **YOURS** tag (INCLUDED would read as free). Full below. Foot: "You can still watch any game and see its money live." Primary "Choose Full to open tonight", secondary "Wait for 1 October" (both UNSURE).

**16 · Membership lapsed.** Nothing on Tonight during the night. After it closes, home's start row: "Start a game" / "Your Full ended on 25 Sep · renew to open one" (UNSURE). Tapping opens 13.

### 05 · Group player list (GR4)

Two-way segmented filter under the title: **Everyone | Who can run a game**. A filter, not a badge (badges on GR4 already mean ADMIN / NAME ONLY / INVITED). This view **never prints a tier name**.

**18 · Admin reading.**
- *Everyone*: Runs the games (Marek, "admin · opens and records") · Can take a game · N (Lena "any night", Zuzka "any night", Ivo "one night left in September") · Watch only · N (Petr "host night used · back on 1 Oct", Tomáš/Dana "watches for free") · Name only · N (Honza "no app yet" + **Invite**). Rows have chevrons.
- *Who can run a game*: only **Runs the games** and **Can take a game**. Section names are UNSURE.

**19 · Member reading.** Both tabs as 18, read-only: no chevrons, no Invite. Reader's own row "You, Tomáš" (avatar "Y"). Band: "Only Marek can pass a game. This list is for knowing who could take one."

### 06 · Role line on Tonight

**20 / 20b / 20c.** Same night at 23:22 on three phones: recording (dock present), watching as a claimed player (no dock, band "Read-only. Only Lena can write to the ledger."), watching after passing (same as 8). The role line is what tells 20b and 20c apart.

**21 · X1 share-link watcher.** X1a's WATCHING pill and "kept by Marek" are replaced by the shared role line. The feed gains the handoff as an entry with no amount: "23:10 · Marek passed the game to Lena" (UNSURE).

---

## 4. Layout details

- **Role line position:** Chrome A meta line under the title, padding 8/20/0/68 (aligned with the title text past the 36px back button), 500 13px, tabular numerals, no wrap. The start time moved from the title row into this line.
- **360 width:** the title row alone needs ~352px of 320 at 360, which is why start time moved down. The role line at 360 is **reviewed**: 272px available (360 − 68 − 20). Longest line "Watching · passed to Lena at 23:10" measures ~208px; with a 10-letter name ("Aleksandra") ~244px. Names up to ~13 characters fit on one line. Longer names truncate the name with an ellipsis; the time and the first word never truncate, and the line never wraps.
- **Hold length:** 1.5s for both End and Take back (board wins over the brief's 1s so the app has one hold).
- **Frame:** 393 × 852 (brief) vs 402 × 874 in `08-tonight-home.md` / `07-design-tokens.md`. Rev 17 decided 393.
- **Sheet geometry:** rev 17 sheet object (radius 26, grabber 38 × 5, header 12/22, rows at 22, pinned footer 82), see `cc-handoff/docs/15-screen-geometry.md`.

## 5. Design tokens used

Authoritative source: `cc-handoff/docs/07-design-tokens.md`. Values on this board:

| Role | Dark | Light |
|---|---|---|
| Screen | #0A0A0B | #FFFFFF (grey #F4F4F6 under a sheet/drawer) |
| Sheet | #101013 | #FFFFFF |
| Card / segmented track | #16161A | #F4F4F6 |
| Primary text | #FFFFFF | #0C0D0F |
| Muted text | #8B8D93 | #6B6F76 |
| Dim hint | #6C6E74 | — |
| Hairline | rgba(255,255,255,.11) | rgba(12,13,15,.1) |
| Row fill (drawer) | rgba(255,255,255,.07) | — |
| Live / positive | #6FCF97 | #0A7A3D |
| Pending / amber | #E8B455 | #7A5410 |
| Destructive (End) | #F0705C, border #F0705C88 | per tokens doc |
| Primary button | #FFFFFF on #0C0D0F text | #0C0D0F on #FFFFFF text |

Type: system stack (`-apple-system, SF Pro Display/Text`, Figtree fallback). Sizes used: 32/800 title, 30/800 sheet title, 19 amounts, 17/700 buttons, 16.5/600 row labels, 14.5 drawer header, 13 meta/body, 12.5 row sub, 12/700 .1em uppercase section labels, 10.5/700 tags. Radii: 46 frame, 26 sheet, 16 drawer, 14 card, 10 rows, 8 buttons, 7 tags, 999 pills.

## 6. Where the brief and rev 18 docs disagree (fix before build)

- **Pricing and settle: fixed.** Rev 18 `01-product-logic.md` § 4 now uses Free / Regular $2.49 / Full $9.99, a host night that renews each billing period, `settle` held by whoever admins the game on any tier, and the receiver-checked-at-pass rule.
- **`docs/pricing-model.md`: fixed.** Superseded banner at the top, decisions 2/4/5 struck through, tier table replaced with Free / Regular / Full. Updated copy in `docs/pricing-model.md` in this folder.
- Money rules in the drawer: brief lists it, board T3 doesn't; board wins.
- Light live tag: T1 light used #6FCF97 on white; this board uses the light green pair.

## 7. Invented strings (UNSURE)

"Pass the game" · "uses their one host night" · "Used tonight" · the Ask share text · "Until then nothing new is recorded." · "Marek admins the game" · 12b sub-line · "Tick all" / "Untick all" · Full's "you run games as often as you like" · "YOURS" · "Wait for 1 October" · "Your Full ended on 25 Sep · renew to open one" · GR4 section names · "Marek passed the game to Lena" feed row.

## Files

- `Screens - Running the game.dc.html`: the board (every state, dark + light). Tweaks panel has a preview-width switch (393 / 360).
- `support.js`: runtime for the board; keep next to it.
- `docs/01-product-logic.md`: rev 18 product logic with § 4 corrected (replace `design/handoff-rev18/docs/01-product-logic.md`).
- `docs/pricing-model.md`: corrected pricing doc (replace `docs/pricing-model.md` in the repo).
- `design-request-game-admin.md`: the brief.
