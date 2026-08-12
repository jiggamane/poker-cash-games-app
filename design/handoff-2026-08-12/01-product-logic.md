> **See `CHANGELOG.md` (12 Aug 2026).** Membership names and prices changed (Free / Regular $2.49 / Full $9.99), Free now shows the last 3 games, there is no joining and no switch-group screen.

# Product logic

Every feature, the rules that govern it, and what happens at the edges. Screen ids in brackets point at `02-screens.md` and at the design files.

---

## 1. The shape of the thing

Four objects, in order of how long they live:

- **Group** — a table of regulars. Holds its members, its money rules, its currency and its book. Sealed: nothing crosses between groups.
- **Book** — an accounting period inside a group. Opened once, closed manually by the host, which freezes its totals and starts a new one.
- **Session** — one night. Stakes, a start time, an end time, and a list of money events.
- **Entry** — one movement of money, timestamped.

A person can host one group and play in three others. A player's own record of themselves crosses groups (G4 My stats); nothing else does.

**No tab bar.** The group is the root — Home *is* the group you are currently in. The session and the book are pushed on top of it. Every pushed screen carries a back control labelled with the screen it returns to, plus a home glyph, so the root is always one tap away.

---

## 2. Roles

| Role | Can | Cannot |
| --- | --- | --- |
| **Host** | Everything: open a night, write entries, correct them, edit rules and players, count, settle, close the book | — |
| **Player** | Read the live ledger, see their own money and everyone else's, see their stats | Write anything |
| **Watcher** | Read a single night through a share link | Write, see the group's other nights |
| **Collector** | Receive money at settle-up | Nothing else — need not be a player, need not be present |

**Exactly one device holds the pen.** The host's device is the only writer for the whole night. This is the core simplification that makes offline work: there is one write path, so there are no merge conflicts on the ledger.

A collector is a name that receives money. The group treasurer might never sit at the table. They appear in settle-up as a payee and nowhere else.

---

## 3. Groups

**Creating one** [C1, G2]. Name and currency, and that is all. The creator is the host. A new group starts empty and stays sealed — players known elsewhere are not carried over, and neither is anything they owe in another group. The screen says this out loud because it is the first thing people assume wrongly.

**Switching** [G3]. A person's groups are listed with their role and member count. Switching changes the root; the previous group closes behind them.

**Leaving.** A group's book is visible only while you are in it.

**The roster** [C2]. Everyone who has ever sat at this table, split into Regulars (three or more nights, or explicitly kept) and Occasional. Each row shows nights played and all-time net after the kitty. Nets shown here are *within this group only*.

**Editing a player** [C5]. Name, whether they pay into the kitty by default, and removal.

- Renaming changes the name everywhere, including nights already settled. The person is the same person; the ledger references an id, never a string.
- Removing does not erase anything. The nights they played stay in the ledger exactly as they were. Removal means "no longer seated by default" — they drop out of the seating list and the roster's active section.
- **An open debt never blocks removal.** Removal means "no longer seated", not "settled up"; blocking it would let one unpaid $40 keep somebody on the roster for months, and the app does not chase money. The debt stays where it was — on the settled night and on that night's payments list, with the player shown as removed. C5 warns when there is an open balance; it never prevents.
- A removed player who plays again is simply re-added.

**Invites** [C3]. Two paths, and the per-player one is primary.

**Per player.** The host adds someone by name, then generates a link for that specific person. Opening it and activating creates their account with their name, their history and their net already in place — no sign-up form, no name entry, no picking themselves off a list. The link is bound to their member row, so it can only ever attach to the person the host meant.

**Group-wide.** C3 also offers a group link with a 7-day expiry, plus copy / message / share / QR. Someone arriving that way has no row yet, so joining creates one and the host sees them appear in the roster.

Either way, **a player added by name only can be in the ledger tonight with no app and no account**. This is the normal case, not the exception: most people at a home game will never install anything, and they stay full participants in the book for years. An account buys one thing — seeing the group from your own phone. The full lifecycle is in `03-data-model.md` § Identity.

**Group settings** [C4]. Name, currency, default stakes, default buy-in, theme (match phone / dark / light), show cents (off in v1), and the watcher link.

---

## 4. Membership — not in this build

The designs carry a three-tier membership: Free (tonight and your own last month), Tier 1 $4/mo (the whole group's history, plus one night as host), Full $9/mo (runs the group). Membership sits on the person, not the group, and follows them everywhere they play.

**Build none of it.** No tiers, no payment, no locked states, no upsell sheets. Skip screens P1–P5 and the locked variants S1 and G5; build S2 (the full sessions list) and G4 (full stats) as the only versions.

What to preserve is the *seam*. Every gate goes through one policy module that returns `true` for everything in v1:

| Capability | Who has it when tiers arrive |
| --- | --- |
| `see_live_session` | everyone in the group |
| `see_own_recent` | everyone (last 30 days, own nights) |
| `see_full_history` | Tier 1 and above |
| `see_missed_nights` | Tier 1 and above |
| `host_session` | Full, or Tier 1 spending its single non-renewing host night |
| `edit_group` / `settle` | Full only |

Record it here so nobody has to reverse-engineer it later. Do not implement it.

One rule about it is already settled, because it decides whether a night can be interrupted: **a night finishes on the membership it started with.** If the table was opened while the host's membership was active, that same host takes it to the very end — every entry, the count, the deductions, settle-up and closing. A lapse mid-evening changes nothing until the night is on the book; the check guards *opening* a table, not running one. No hand-over screen is needed, and no room's money is ever held hostage by a failed card.

---

## 5. Opening a night

Opening a night is one screen with optional detours, not a wizard. O1 holds every setting and one button confirms them; seating and the money rules are edited on their own screens and return. The step counters that were drawn on O1/O3/O4 have been dropped — only the close flow is numbered, where the three steps are genuinely sequential.

**Step 1 — the game** [O1]. Stakes, default buy-in, start time, and the seating list. The start time is what every entry is stamped from, and it is editable — a host who opens the app at 20:40 for a game that started at 20:05 sets it back.

**Rules are chosen on the screen itself, and inherited by default.** For a group that has played before, O1 carries the choice inline: **Keep last night's rules**, selected by default and naming them underneath ("Kitchen & drinks · Group kitty"), and **Change the rules** beside it — "edit, switch one off, or run with none" — which opens the money-rules screen. One button confirms every setting at once: **Open the table · 20:05**. A group's first night has nothing to inherit and goes to the rules step instead.

Inheritance is never silent: the rules being reused are named on the screen before the table opens. The Home card carries the same promise a step earlier — "$5 / $5 buy-in · same rules as last time".

**Step 2 — seating** [O2]. Search, then a roster sorted most-recent-first, each row showing when they last played and how many nights they have. Seated players show SEATED; the rest show Add. A name typed into the field creates a player and seats them.

Seating is not binding. Anyone can be seated later during the night [N4, N7], and a seated player who never buys in simply has no entries.

**Step 3 — money rules** [O3, O4]. Empty state offers three starting points — Food & drinks, Group kitty, Host fee — each of which creates a pre-filled rule. Configured rules show as cards with their settings as tags. A live preview sits under the list: *"If tonight ends like last Tuesday, $296 leaves the table: $170 back to Marek, $126 to the kitty."*

Rules can be skipped entirely; "Skip — no deductions" is offered at every step.

**Step 4 — the kitty tonight** [O7]. Optional, shown only when a kitty-type rule is active. Who it comes off for this night only. Three states per person: pays in, off tonight (with a reason line), and never pays in (a group-level setting, shown but not switchable here).

Opening the table stamps the session as live and the ledger opens.

---

## 6. Money rules

The most distinctive part of the product, and the part most likely to be got wrong. **Rules never take money during play.** Nothing is deducted from a stack, nothing changes a buy-in. Rules are applied once, at settle-up, to results.

A rule is six things:

| Field | Options |
| --- | --- |
| **Name** | Free text, renameable by tapping the title ("Kitchen & drinks", "Group kitty") |
| **Amount** | A percentage (presets 5 / 10 / 15, or typed) or a fixed sum |
| **Basis** | Percentage of the gross win, or of the net win after other rules |
| **Charge** | Winners only, off their net win — or everyone at the table, flat |
| **Destination** | A shared bill · a group kitty that carries over · a host fee · the next game's pot |
| **Collector** | Exactly one person, optional. May not be playing or present. |

Splits, for bill-type rules: **equally between winners**, **in proportion to the size of each win**, or **across everyone**.

Rules with no collector are simply "held by the group" — a name can be attached any time, including after the night.

**Ordering.** When one rule's basis is "net after other rules", gross-basis rules are applied first, in creation order, then net-basis rules against the remainder. Two net-basis rules chain in creation order. The rule editor should refuse a configuration where a net-basis rule is the only rule (there is nothing to be net of) by falling back to gross and saying so.

**A losing player is never charged** by a winners-only rule, however small their loss. This is stated on the player screen [N3]: *"Both charge winners only. If he finishes down, neither applies."*

**The kitty carries over.** Its balance is a group-level running total across nights, shown on the rule card ("Balance $1,420").

---

## 7. The live session

The session overview and the game are the same screen [N1, N2]. Two tabs over one header.

**The header** never changes: LIVE badge, elapsed time, money on the table as the hero figure, then seats, cash in, cashed out, and a link into the house rules sheet.

**Totals** is the default tab: who is in for how much, sorted by most money in first, no times at all. Cashed-out players stay in the list with what they left with. It ends with the total in play.

**Feed** is the same night as an ordered list, newest first, each row stamped: who, what happened, how much. Expenses appear in the feed too ("Pizza & drinks · Marek paid · $170").

The two tabs answer different questions — *how much is in play* versus *what just happened* — and both are needed at different moments of a night.

**Two actions at the foot**, always: Buy-in (primary) and Cash out (secondary), plus End the night above them.

### Buy-in and rebuy

Buy-in and rebuy are the same flow with different framing [N4 → N5/N6].

Picking a player first [N4] splits the list: **At the table · rebuy** with each person's current total, and **Not seated · first buy-in**. New player is a third option [N7].

The amount screen is a numeric keypad with presets:

- **First buy-in** [N5]: the default buy-in (marked DEFAULT), double (×2), and Custom.
- **Rebuy** [N6]: standard (STANDARD), double (×2), quadruple (×4), and Custom. The header states which rebuy this is ("REBUY · 3RD") and what they are already in for.

Every entry is stamped with the current time, shown as "Stamped 23:22" with a Change control — **the host can back-date an entry for a hand that already happened**. This is used constantly in practice: someone bought chips twenty minutes ago and nobody wrote it down.

The primary button names the exact act: "Seat Dana · log buy-in", "Log the rebuy".

**A new player mid-night** [N7] takes a name, seats them tonight, adds them to the group roster and logs a first buy-in in one action. They can be invited later.

### Cash out

Picking a player [N8] shows those at the table with what they are in for, and below them those already out with their result. Counting [N9] is the keypad again: enter the chip count, and the screen states their result for the night immediately ("Petr's night +$850").

**Cashing out is final for the night.** Once counted, a player's result is set and they cannot buy back in — one player, one stack, one figure. N8 says so plainly, N4 offers a cashed-out player neither a rebuy nor a first buy-in, and the totals row on N1 needs only two states. Someone who wants to sit back down is a matter for the next session.

### Corrections

**The ledger is append-only.** Nothing is ever edited in place and nothing is deleted.

Tapping an entry [N10] shows what it is and who logged it, and offers two acts:

- **Change the amount** — writes a correction entry underneath.
- **Void this entry** — writes a reversal.

Both stay visible to everyone in the feed. The screen says so plainly, because a host who thinks they can quietly fix a number is the fastest way to lose a table's trust.

Derived totals always reflect the corrected state. History always shows the path taken to get there.

---

## 8. The bill and the kitty during play

Reached from the live session by the info icon on the header [B1]. The house rules sheet restates the group's rules as they apply tonight, with the kitty's estimate at the current standing ("≈ $126").

**Expenses** [B2, B3, B4] are their own small ledger. An expense has an amount, a category (Food / Drinks / Other), a description, who paid it, a timestamp and a split. Bills are added when the food arrives, not at the end — *"Nothing is charged until settle-up."*

B4 shows the running bill with each item and who fronted it, plus a live preview of how it lands if the night ended now — each winner's share, what they fronted, and the net effect on them. **Whoever fronts part of a bill is paid back exactly what they fronted at settle-up**, and still pays their own share: Marek fronted $120 and owes $57, so $63 comes back to him; Lena fronted $50 and owes $56, so she still puts in $6. Once fronting is counted, a bill nets to zero across the table.

The split can be changed for tonight only [B5] without touching the group's rule, and any single figure can be typed over — the rest re-split so the total always matches the bill, with the remainder shown as "Left to assign" until it reaches zero.

A bill has fronters, not a collector. The collector field on a rule is for money that accumulates — the kitty, a host fee.

**The kitty can be switched off for someone mid-night** [B6]. Tonight only, and it changes *who it comes off*, never the rate. Nothing already logged changes — the kitty is worked out at settle-up, so this is always safe.

---

## 9. Ending the night

A straight line with two off-ramps.

**Off-ramp 1 — uncounted stacks** [E1]. The night cannot end while anyone still has chips. The screen lists who is uncounted and offers to count them together on the next screen, or "Not yet" to go back.

**Step 1 — count up** [E2]. A count for every seated player. Players who already cashed out keep what they left with and are listed separately under "Already gone". A running total sits at the top: counted against money on the table, with a BALANCED state when they are equal.

**Counted chips must equal the money left on the table before the flow can continue.** The mismatch is shown until it is zero.

**Off-ramp 2 — it doesn't add up** [E5]. When the totals disagree, the screen states the gap in plain terms: *"$4,500 went in, $4,350 was counted out. Someone's stack is short, or a buy-in was never written down."* Three ways out are named: fix a count, add the missing buy-in, or write the difference off to the kitty. The third is the pragmatic one at 00:14 and it must produce a real ledger entry, not a silent adjustment.

**Step 2 — deductions** [E3]. Every rule, itemised per person, with the total leaving the table stated at the top ("$296 · $120 back to Marek, $50 to Lena · $126 to the kitty"). Any figure can be tapped and changed; the rest re-split. The foot is the night's reconciliation: one row per player with gross, each deduction, any reimbursement and the net in separate columns — every component visible rather than folded into a total, and each kind of money tinted so it can be followed down the list.

That block is a **preview**, not a result: it is drawn as a dashed frame with a `PREVIEW` tag and recomputes as figures above it change. Before the bill is in [E3b] its Bill and Back columns are em dashes while the kitty, being a rate, already computes — so the host can see the shape of the night before every number exists. A column with no figure yet is never shown as zero. Primary **See who pays whom**.

**Step 3 — settle up** [E4]. The transfer list, shortest set first, with collectors as payees like anyone else. Below it, the night's net per player. Editable; the rules for editing are in `04-money-math.md`.

**Closing the session** freezes it. It appears on the book [E6] with its totals, the full ledger reachable, and a Rematch action that opens a new night with the same settings and seats.

---

## 10. Payments

**The night is settled whether or not the cash has moved.** Settling and paying are separate, deliberately — the book closes at the table, the money moves over the following week.

The payments screen [E7] lists the transfers with a paid/waiting state, a Mark paid action per row, a running "still owed" total, and Nudge the table.

**Only the host marks a payment paid.** The pen stays in one hand: it is bookkeeping the host does as cash reaches them or is reported to them, not a claim a player files. Players and watchers see the same paid / waiting list read-only, with the Mark paid control absent — exactly as the action bar is absent on X1.

Marking paid is bookkeeping only. It never changes anyone's net, never touches the ledger, and never reopens a settled session.

---

## 11. The book

**Sessions** [S2]: every night, grouped by month, most recent first. Each row: date, whether you played or hosted, how many were at the table, and your net for that night (or the money in play for nights you missed).

**My stats** [G4]: a person's own record. Across all groups and per group: total net, best night, worst night, nights in the black, all after kitty and bills. Only you see this page. Inside a group, members see your net *in that group* and nothing else.

**Closing a book** freezes its totals and starts a new one. Nothing is deleted. Not drawn yet — see `05-build-order.md`.

---

## 12. From outside

**Joining** [X2]: an invite lands on a screen naming who invited you and what the group is ("12 nights on the book · $5 / $5 · Saturdays at Ivo's"), with three plain statements — you see the table live, your net carries across every night, only the host writes.

**Watching** [X1]: the night as a read-only feed, with the watcher's own position pulled to the top ("You, Lena · in $1,000 · 2 buy-ins · counted at the end"). Entries referring to the watcher read in second person ("You bought in"). The screen ends with the reason it is read-only, naming the host: *"Read-only. Only Marek can write to the ledger."*

The watcher view is the same data with a different projection, not a separate feature. Build it as one component with a `canWrite` flag.

---

## 13. Rules that hold everywhere

1. One filled primary button per screen, and it names the act ("Seat Dana · log buy-in"), never "Next" or "OK".
2. Whole units. No cents in v1, no rounding settings exposed.
3. Every figure is tabular so columns line up down a list.
4. Green means money won, red means money lost, bone means money leaving the table. Nothing else is coloured.
5. Every entry carries a timestamp and the id of whoever logged it.
6. Nothing is ever deleted. Corrections are additive, removals are flags, closed books are frozen.
7. Any screen that shows a mismatch states the size of the mismatch and how to resolve it.
