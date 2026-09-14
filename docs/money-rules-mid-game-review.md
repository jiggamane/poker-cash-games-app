# Changing the money rules while the game is running

**The ask, in the owner's words:** *"right now we can't change the list of
players who pays into the piggy bank once the game has started — it should be
available up to the moment the game is finally closed."*

This is a review of what actually blocks that, and a plan to unblock it. Nothing
here has been built yet. Every claim below was read off the code on `main` at
`2a365bf` and is cited to a line.

---

## The short answer

**The engine has never blocked it. The app has no screen that offers it.**

`MoneyRule.exemptPlayerIds` exists (`packages/core/src/types.ts:151`),
`settle()` honours it (`packages/core/src/settlement.ts:527–528`), two tests
cover it (`settlement.test.ts:290`, `hand-typed-shares.test.ts:231`), and
`nightStore.saveRule` will write it at any hour of any night with no gate at all
(`apps/mobile/src/lib/nightStore.ts:1451`).

The only screen in the app that can edit that list is
`apps/mobile/app/piggy-bank-rules.tsx` — L6, the "Off for tonight" chips at
lines 145–175. **That screen is reachable from exactly one place**
(`apps/mobile/app/house-rules.tsx:59`), **and nothing in the app reaches
`/house-rules`.** Grep the whole of `apps/mobile` for the string and the only
hit outside the file itself is its registration in
`apps/mobile/app/_layout.tsx:152`.

So a feature that is built, tested, synced at close and drawn on a board has
been unreachable from the running app. That is finding **F1**, and it is the
whole of the owner's complaint.

---

## What is actually reachable today

`/money-rules` (O4) is the live list, and it opens from four places:

| Stage | Screen | Route to the rules |
|---|---|---|
| Before the table opens | O1d Game details | `RuleList` inline → `/rule` (`new-night.tsx:1187`) |
| Playing | `/session` drawer | `/money-rules` (`session.tsx:252`) |
| **Counting stacks** | `/count-up` | **nothing** |
| Deductions | `/deductions` | `/money-rules` (`:156`, `:440`), block head → `/rule` (`:517`), row → `/share` |
| Settle up | `/settle-up` | `/money-rules` (`settle-up.tsx:312`) |

From `/money-rules` a rule row opens `/rule` (`money-rules.tsx:67`), which is
`RuleFields` — name, amount, percent-or-fixed, who is charged, how it splits,
who collects. The switch on the row toggles the rule off entirely
(`money-rules.tsx:68` → `toggleRule`).

**What `/rule` cannot do is name a person.** `RuleFields.tsx` has no exemption
section; `exemptPlayerIds` appears nowhere in it. So mid-game a host can change
the piggy bank from 5% to 10%, or switch it off for everyone, but cannot take
one person out of it — which is the commonest thing a room actually asks for and
the one the L6 copy was written for.

---

## The five findings

### F1 — the only editor for "who pays" is behind a screen nothing opens

Covered above. `/house-rules` → `/piggy-bank-rules` is an orphaned pair.
`/bill-rules`, its sibling, *is* reachable (`bill.tsx:52`), which is why this
looks like an oversight rather than a decision.

**Why no check caught it.** `scripts/ui-audit.mjs:90–96` opens every route *at
its bare path*. An orphan passes every pass in the suite — geometry, chrome,
currency, frames — because the audit never asks how a person would get there.
`docs/screens.md` counts `/house-rules` and `/piggy-bank-rules` among "37
screens · 37 under the rule pass". Both are correct screens that no user can
open, and the ledger says they are fine.

### F2 — the counting stage has no way back to the rules

`/count-up` pushes `/rounding`, `/log`, `/deductions` and `/settle-up`
(`count-up.tsx:198`, `:220`, `:271`, `:331`) and nothing else. E3 and E5 both
carry a *"Change a rule and look again"* chip; E2 does not. So of the five
stages of a night, counting is the one where the rules are out of reach — and it
is the stage where somebody says *"hang on, Marek brought the food, take him out
of the piggy"*.

### F3 — a settled night's rules are still writable, and there is a live route to them

`saveRule`, `deleteRule`, `toggleRule` and `writeRules`
(`nightStore.ts:1451`, `:1459`, `:1464`, `:1562`) have **no status guard**.
Compare `setFinalCount` (`:1393`) and `/rounding` (`rounding.tsx:94`), which both
refuse on `status === 'settled'` and say why.

That is not theoretical. `closeNight()` leaves the settled night in the store
(`nightStore.ts:2188`), `/settled` is pushed straight onto it, and `/settled`'s
rows offer *Spends* → `/deductions` (`settled.tsx:232`), which offers *"Change a
rule and look again"* → `/money-rules` → `/rule`. Saving there rewrites
`rules_json` on a night whose settlement is already **frozen**
(`packages/core/src/frozen.ts`), so the ledger and the frozen record disagree and
no screen can say which is the night. This is precisely the fault `frozen.ts`
was written to prevent, entered by a different door.

**This one must be fixed in the same change as F1 and F2**, because widening
access to the rule editor widens this hole with it.

### F4 — the club's own "pays into the piggy bank" switch reaches no night

`/member` draws *"Pays into the piggy bank"* (`member.tsx:167`), writes
`club_member.pays_kitty` (`clubStore.ts:709`), syncs it, and reads it back on a
second phone *"so somebody exempt from the kitty must not quietly start
paying it"* (`clubStore.ts:981`).

Nothing ever turns it into `exemptPlayerIds`. `startNight` writes the seats and
the rules and never consults it. So the switch changes a row in the database and
no figure anywhere. A host who set it a month ago and is charged tonight is
looking at a bug, not at a night they need to fix by hand.

### F5 — tonight's rule edits are written over the *club's* rules on the server

`writeRules` queues `rule.upsert` (`nightStore.ts:1593` → `sync.ts:188`), and
the row it writes is `money_rule` keyed on `book_id`
(`syncRows.ts:193–211`) — the **book's** rule, not the night's. A second phone
reads rules back from that same book table (`pullReads.ts:39–40`).

So today: switching the piggy bank off for tonight from `/money-rules` switches
it off for the club, on every other phone, permanently. The night itself is
safe — it settles from local `rules_json` and freezes a `rules_snapshot` at close
— but the group's standing arrangement is collateral.

`exemptPlayerIds` is not in `ruleRow` at all and has no column, which is stated
deliberately at `nightStore.ts:1556–1560`: an exemption *"reaches the server
inside `settlement.rules_snapshot` at close"*. That is the right answer for an
exemption. It is the wrong answer for the *rate* and the *active* flag, which go
up as book state.

**The consequence for this task:** once mid-game exemptions exist, a watcher on
`/watch` and a second admin phone will show the old figures until the night
closes. That is acceptable for a first cut and must be said out loud rather than
discovered. F5's fix is a separate change from this one.

---

## What must stay locked, and why

`types.ts:139–150` and `frozen.ts` between them state the rule this feature has
to keep:

- **An exemption rides on the night, never on the group.** *"Sitting out of the
  piggy bank for one night takes somebody out of the charge"* — carrying it
  forward *"would charge Petr fifty dollars for ever"*.
- **A settled night is not restated.** Its figures were derived by an engine that
  has already changed once (`9321fbd`, B36). The frozen record is the night.
- **The close is the boundary**, exactly as the owner said: *to the moment the
  game is finally closed.* Open and counting are editable; settled is not.

---

## The plan

Six changes, and the owner has decided the three questions that shaped them —
see **Decided** at the foot. **1–4 are the feature and ship together; 5 and 6
are separate and can follow.**

### 1 · One sit-out control, in the one editor every stage can reach

Extract the chips block from `piggy-bank-rules.tsx:145–175` — the card, the
chips, and the explanatory paragraph — into a shared component,
`apps/mobile/src/components/SitOut.tsx`. **Copy moves verbatim**; it was written
for L6 and CLAUDE.md's *copy is final* applies. Nothing new is invented.

Render it as a section of `RuleFields.tsx`, below *Split*, shown for every rule
with a non-`custom` split. It generalises for free: the engine already applies
`exemptPlayerIds` to any rule (`settlement.ts:527`) and already ignores it on a
custom split (`:525`), and a host fee or next-pot rule wants the same list.

`piggy-bank-rules.tsx` then renders the same component rather than its own copy
— one implementation of one thing, which is the B14 rule.

Names come from `standingsOf(night, ledger).filter(s => s.played)`, which is what
both L6 and `/rule` already use (`rule.tsx:61`). Mid-game that is whoever has
bought in; a player seated but not yet bought in does not appear, which is
correct — nothing can be charged to them.

**Who this reaches, immediately:** setup (O1d), the live drawer, the deductions
block heads, the money-rules list, and settle-up. Every stage `/rule` is already
on.

⚠ **`RuleFields.tsx` is a shared component and this touches it.** Per CLAUDE.md
this change **runs alone** — nothing else in flight, no parallel session open on
`new-night.tsx`, `deductions.tsx` or `money-rules.tsx`.

### 2 · The two missing ways in

**`/count-up` gains E3/E5's *"Change a rule and look again"* chip** — same copy,
same `variant="chip"`, same position at the foot. One button, no new strings.
That closes F2 and makes the rules reachable from every stage of the night.

**`/house-rules` gets a way in** — *decided: wire it up, do not retire it.* It is
drawn (B1), it is read-only, and what it offers is worth having mid-game: one
list of what is coming off the table tonight and why. It goes in the table
drawer beside *Money rules*, which is where a host is already looking.

`/piggy-bank-rules` stays reachable through it, rendering the same `SitOut`
component as `/rule` — one implementation, two doors, which is the B14 rule.

### 3 · The close is the boundary, stated in the store and on the screen

- `writeRules` refuses on `status === 'settled'` and throws with the sentence
  `/rounding` already uses in spirit: the night is closed, correct it with a
  ledger entry. A guard in the store means a future screen cannot reach around it
  — the same argument `setFinalCount:1393` makes.
- `/money-rules` and `/rule` render read-only on a settled night: no switch, no
  Save, no *Remove this rule*. **Removed, not disabled** — `12-the-group.md`
  § 4.1, the rule `/deductions` already follows for a member.
- Because the settled route in is `/settled` → `/deductions`, `/deductions`'
  *"Change a rule"* chip and block chevrons drop on a settled night too.

### 4 · Host-only, as every other money screen already is

*Decided: yes.* `/money-rules`, `/rule` and `/piggy-bank-rules` take
`useIsAdmin()` — the same check `/deductions`, `/share` and `/rounding` already
make (`whoIsReading.ts:23`). A member gets the same list, the same figures and
the same sentences, **with the switches, the Save and the sit-out chips removed
rather than greyed** — `12-the-group.md` § 4.1.

This also makes an existing lie true: `piggy-bank-rules.tsx:101` draws an
`admin only` badge today with no gate behind it.

The same reader test decides both this and change 3, so they are one pass over
three screens: *may this phone restate money, and is this night still open.*

### 5 · The club switch reaches the night it was set for

At `startNight`, seed each rule's `exemptPlayerIds` from the club members whose
`paysKitty` is false — for `destination: 'kitty'` rules only, since that is what
the switch's label promises. From then on it is tonight's list and tonight's to
change; the club's switch is a default, like the buy-in and the rounding step
beside it.

### 6 · Stop tonight's edits writing the club's rules (F5)

Out of scope for the feature and written down so it is not lost. The fix is
either a night-scoped rule table on the server, or a rule upsert that only fires
for `scope: 'club'` edits. It needs a schema decision and `npm run db:verify`,
and it should not ride on a UI change.

---

## What goes red if this comes back

A screen bug neither check can see is not finished being fixed. Four locks:

1. **A reachability test**, in `apps/mobile/src/components/moneyScreens.contract.test.ts`
   — every route registered in `app/_layout.tsx` is pushed from at least one
   other route, against a named allow-list for the screens a link lands on cold
   (`/`, `/claim`, `/auth-callback`, `/watch`, `/session`). This is the check
   that did not exist, and the reason F1 survived. It is plain file reading and
   costs nothing, so it belongs in `npm run check` rather than `check:ui`.

2. **A journey**, in `scripts/ui-journeys.mjs` — play the seeded night, open the
   piggy-bank rule mid-game, tap a name off, and assert the deduction total on
   `/deductions` moves. That asserts the whole chain: chips → `saveRule` →
   `rules_json` → `settle()` → the figure on the screen.

3. **A core test**, in `settlement.test.ts` — an exemption added after play has
   begun changes nothing about how it settles. The engine is indifferent to when
   the field was written and a test should say so, because the whole plan rests
   on it.

4. **A store test**, beside the guard from change 3 — `writeRules` on a settled
   night throws and writes nothing, and on an open one writes. Two assertions,
   and they are what stops a future screen re-opening the door `/settled` →
   `/deductions` → `/rule` opened. The same file asserts the reader gate from
   change 4: the three rule screens name `useIsAdmin`, read the way
   `moneyScreens.contract.test.ts` already reads a route for `<SpendList`.

Plus `BEHIND` in `scripts/ui-audit.mjs` gains the sit-out section, since it sits
inside `/rule` and no URL opens it directly.

## Bug entries to write first

Before any of this is built, per CLAUDE.md. Highest number on `main` is **B75**,
so:

- **B76** — the piggy bank's sit-out list was unreachable from the running app
  (F1). Locked by the reachability test.
- **B77** — a settled night's money rules were still writable, from `/settled`
  → `/deductions` → `/rule` (F3). Locked by the store guard's own unit test.
- **B78** — "Pays into the piggy bank" on a member changed no figure on any
  night (F4). Locked by a `startNight` test.

F2 is a gap rather than a regression and rides with B76, as does the missing
reader gate — nothing was ever promised there, so it is a hole rather than a
fault. F5 is a decided non-goal rather than an open question now (see
**Decided** 1), and stays in this file until somebody wants it.

## Decided

Answered by the owner on 14 September, and the plan above is written to them.

1. **A mid-game change does not have to reach a watcher before the close.**
   Your phone is always right; a watcher keeps seeing the old figure until the
   night closes, when `settlement.rules_snapshot` carries the exemption up with
   everything else. This is already how a hand-typed share behaves
   (`nightStore.ts:1556–1560`), so it is one rule rather than two. It is the
   reason F5 stays out of the feature — nothing in changes 1–5 needs a schema
   move.

   ⚠ **It has to be said on the screen, not just here.** A watcher reading a
   figure that is no longer true, with nothing saying so, is the next bug. The
   sit-out section states it in a line, in L6's own voice: *switching someone
   off applies to this night only* gains *and reaches the others when you close
   the night.* Flagged as invented copy — no handoff draws it.

2. **Only the host may change the money rules.** Change 4.

3. **`/house-rules` is wired up, not retired.** Change 2.
