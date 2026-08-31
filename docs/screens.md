# The screen ledger

Thirty-seven screens. This says, for each one, what is watching it and whether
anybody has held it against the board it was drawn from.

The point is to turn *"the app has bugs"* — which is not a thing anybody can
finish — into *"nine conformed, twenty-eight to go"*, which is. A count that
goes up is worth more here than a plan, because the failure this project keeps
hitting is not bad work, it is work being redone.

## How to read it

**Chrome** is from `docs/09-navigation.md`: a screen is either PUSHED (round
back button, nothing at all top-right) or a SHEET (grabber, close, swipe down).
The two vocabularies must never mix — which one is on screen is the only thing
telling a person whether to swipe or tap back. The column is generated from the
audit's own `SHEET_ROUTES`, so it is what the app actually does, not what was
intended.

The three check columns are what runs in `npm run check:ui`:

- **Rules** — `ui-audit.mjs` pass 1. Every route in both themes, at 393 and at
  360: the surface ladder, the contrast floor, what may scroll, what may break
  mid-word, and whether a label stays inside the control drawn around it. The
  narrow width is there because B3 fitted its button at 393 by half a point and
  hung out of both sides of it at 360. It also holds a screen to the rows its
  board draws — see **Drawn rows** below.
- **Sheet** — `ui-audit.mjs` pass 2. The 21 sheets across six devices — four
  iPhones and two Androids — against the height cap. Only sheets have one.
- **Night** — `ui-journeys.mjs`. A whole night played through, checking no
  figure is cut off, outside its card, off the phone, or broken across two
  lines. Only reaches the twenty stops a night actually produces, which is the
  point: those are the ones no URL opens and the ones a host stares at for ten
  minutes. It runs at 360, the narrowest device in the matrix — B15 and B16 both
  fit at 393 and wrapped at 360 — and it plays the night at three sizes of
  table: **thousands**, which proves nothing is abbreviated that had room to be
  exact; **millions**, which is what breaks the columns; and **ceiling**, nine
  digits, which is all the keypad will take. Each run prints what was on the
  table and the widest figure it drew, because B17 was a run that had stopped
  testing what it said it tested and said so nowhere.

  **Every stop is measured twice** — at 100% and at 120% text — because a
  browser only ever renders the first and a phone is usually not on it. B18 is
  what that missed: figures that scale with the reader's text setting inside
  cards that are a fixed number of points off a board. A figure that declares a
  cap (`cappedFigure` in the tokens) is strained only as far as its cap, so the
  pass measures what the device will actually draw.

**Conformed** is the one no script can fill in. It means somebody opened
`docs/screen-specs/`, found this screen, and held the built thing against the
drawn thing with `ui-check.mjs` — every padding, gap, size, weight and radius.
Tick it only when that has been done, and put the commit next to it in the notes
below if it is worth remembering.

A ticked check column does not imply a ticked Conformed box. The scripts prove a
screen obeys the stated rules; only the board says whether it is the screen that
was drawn.

## The rule that makes this worth keeping

**Do not reopen a conformed screen casually.** If a change has to touch one,
re-run `check:ui` and re-hold it against its board before the merge. A ledger
whose ticks are not re-earned is worse than no ledger, because it says a screen
is settled when it is not.

| Screen | Chrome | Rules | Sheet | Night | Conformed |
|---|---|:--:|:--:|:--:|:--:|
| `/` | push | ✓ | — | — | ☐ |
| `/bill` | sheet | ✓ | ✓ | — | ☐ |
| `/bill-rules` | sheet | ✓ | ✓ | — | ☐ |
| `/claim` | push | ✓ | — | — | ☐ |
| `/club-rules` | push | ✓ | — | — | ☐ |
| `/count-up` | push | ✓ | — | ✓ | ☐ |
| `/deductions` | push | ✓ | — | ✓ | ☐ |
| `/entry` | sheet | ✓ | ✓ | ✓ | ☐ |
| `/games` | push | ✓ | — | ✓ | ☐ |
| `/groups` | push | ✓ | — | — | ☐ |
| `/hand-over` | sheet | ✓ | ✓ | — | ☐ |
| `/house-rules` | sheet | ✓ | ✓ | — | ☐ |
| `/invite` | sheet | ✓ | ✓ | — | ☐ |
| `/log` | sheet | ✓ | ✓ | — | ☐ |
| `/member` | sheet | ✓ | ✓ | — | ☐ |
| `/money-rules` | sheet | ✓ | ✓ | — | ☐ |
| `/new-group` | sheet | ✓ | ✓ | — | ☐ |
| `/new-night` | sheet | ✓ | ✓ | — | ☐ |
| `/nudge` | sheet | ✓ | ✓ | ✓ | ☐ |
| `/payments` | push | ✓ | — | ✓ | ☐ |
| `/pick` | sheet | ✓ | ✓ | — | ☐ |
| `/piggy-bank-rules` | sheet | ✓ | ✓ | — | ☐ |
| `/player` | sheet | ✓ | ✓ | ✓ | ☐ |
| `/players` | push | ✓ | — | — | ☐ |
| `/rounding` | sheet | ✓ | ✓ | — | ☐ |
| `/rule` | sheet | ✓ | ✓ | — | ☐ |
| `/seat` | sheet | ✓ | ✓ | — | ☐ |
| `/session` | push | ✓ | — | ✓ | ☐ |
| `/settings` | push | ✓ | — | — | ☐ |
| `/settle-up` | push | ✓ | — | ✓ | ☐ |
| `/settled` | push | ✓ | — | ✓ | ☐ |
| `/share` | sheet | ✓ | ✓ | ✓ | ☐ |
| `/sign-in` | sheet | ✓ | ✓ | — | ☐ |
| `/spend` | sheet | ✓ | ✓ | — | ☐ |
| `/stands` | push | ✓ | — | ✓ | ☐ |
| `/stats` | push | ✓ | — | ✓ | ☐ |
| `/watch` | push | ✓ | — | — | ☐ |

**37 screens · 37 under the rule pass · 21 under the sheet pass · 12 under a big
night · 0 conformed.**

`/games` and `/stats` joined the last of those on 30 August. They are where a
night's figures live once the evening is over, and the run had never reached
them: it started at `/session`, so the club was not underneath it in history and
there was no way back out to them. See B17.

That last zero is honest rather than pessimistic. Screens have been held against
their boards — `2e687a9` did a pass over the whole app — but it was never
recorded per screen, so there is no way to tell which of the thirty-seven it
actually settled. Ticking them off from here is cheaper than trusting a memory
of it.

## Drawn rows

`ui-audit.mjs` carries a `DRAWN` map: route → the literal words that route's
board puts on the screen. A row deleted, renamed or flagged back out of
existence takes the rule pass red.

It exists because of B4. Every other check in the repo asks whether what is on a
screen is correct, and a screen missing a row passes all of them — everything
still on it is right. O1 shipped for weeks without *Stakes*, the first row of
its own board, and no tool here could say so.

**O1 and E2 are filled in.** Every other route's list is empty, and each one is a
few minutes with a board. Keep it to what the board actually draws: a screen may
hold **more** than its board — O1 states the currency, which is drawn nowhere —
and the pass is worth nothing the moment a string is in it that nobody drew.

E2 went in on 30 August with the balance block, and it is the clearest case for
why this map exists: the block it replaced was *correct in every figure it drew*
and wrong because of the one it did not — see B22. What holds it now is that
both column headings are in the map, so the next pass that wants width cannot
buy it by dropping a side of the equation.

Holding **less** is the fault this catches, so a row may only leave the map when
a decision says the row itself is gone — never because a screen stopped showing
it. One has: O1's *Start time*, on 29 August. When that happens the comment
beside the entry says which decision, and there is a note further down this file
saying it too.

**E6 could not be filled in, and the reason is worth writing down** rather than
leaving it to look like nobody got round to it. `/settled` reads the night the
app currently holds, and the seeded night is still being played — so the rule
pass, which opens every route cold, gets the *Not settled* fallback and never
sees `PRIZE POOL`, `THE TABLE · AFTER DEDUCTIONS` or `DEDUCTIONS` at all. A
`DRAWN` entry for it would go red on a screen that is correct. `ui-journeys.mjs`
does reach the real one — it plays a night through and stops on it — but it runs
its own overflow checks rather than the rule pass, so the map is not available
there either. Giving the route pass a settled night to open is the fix, and it
is a job of its own.

## The head, and what scrolls with it

Doc 15 § 5 check 1 says *no screen scrolls as a whole; only lists scroll*, and
that rule is a rule against an **accident**. The head used to sit inside the
scroll view on every screen, so a long body carried the title and the back
button off the top and left the reader with nothing saying where they were.
`Screen` pins the head, `ui-audit.mjs` goes red on any scroller holding a
title, and that is still the default.

Two screens have since been asked for something else, and asking is a per-screen
decision written in two places that have to agree:

| Screen | `headScroll` | What moves |
|---|---|---|
| `/stats` | `meta` | the club name under the title; the title row stays |
| `/players` | `all` | the whole head, back button included |

`Screen` takes the prop; `HEAD_SCROLLS` in `ui-audit.mjs` is the list of routes
allowed to, and the check is **two-way**. A route on the list must actually
scroll what it says it scrolls, and a route off it may scroll nothing — so the
old fault goes red the moment a screen picks the behaviour up by accident, and
a screen given it deliberately cannot quietly lose it in a later merge. The
finding is called `head-scroll`.

The reasoning, so it is not re-litigated screen by screen: **a pinned head earns
its space by saying where you are.** On My stats the title does that and the
club name does not — it is part of what is being read, on a screen a person
reads for a while. On the roster there is nothing on the screen but the list;
90 points of pinned chrome cost a row and a half on every phone and say nothing
the list does not already say. Neither is a licence for the third screen: the
default is still `none`, and a screen that wants to move its head says why, here.

## Where E2's measurements are now

`docs/screen-specs/` is generated by `scripts/extract-design.py` off the 12
August boards, and its **E2 · Count up** table is the block that B22 replaced —
`COUNTED`, `$2,610`, `of $2,880`, `2 TO GO`, `Still to count · 2`, `Already
gone`, `Apply the money rules`. All of it is superseded.

Do not edit that file to say so; it says "GENERATED · do not edit" at the top
and it is the honest record of what the 12 August boards drew. The current
measurements for this screen are inline on
`design/handoff-E2/boards/Settled Status.dc.html`, layout **2a**, colour option
**2f** — that is what `count-up.tsx` was built from and what to hold it against.
The extractor still points at the old board directory and reads frames at
402 × 874; pointing it at the newer cuts is a job of its own.

## Copy the handoff does not have

`design/handoff-E2/` draws the ACCOUNTED FOR sub-line as its composition —
"$2,120 cashed out · $1,450 counted" — and states the rule for one term being
zero: show the other alone, never a $0 term. It says nothing about the state
where **both** are zero, which is every night between the host opening E2 and
the first stack going in, and which the board does not draw.

Copy is final and inventing a line for it is not ours to do, so the screen holds
the space and prints nothing in it. The block keeps its height, which is the
requirement the handoff does state, and the sums beside it already say the night
has nothing accounted for.

There is a second gap of the same kind. The logic doc says `left` can be
negative, and the *counting* state's string is `"${left} LEFT TO ACCOUNT FOR"` —
which a host who types 2,000 for a 200 stack reads as "-$1,800 LEFT TO ACCOUNT
FOR" before the last stack is in. It is arithmetically exact and it is not a
sentence anybody wrote. Nothing else can be shown without inventing one, and
the OVER verdict is not available: no verdict is drawn while a stack is
uncounted, deliberately.

**Both are lines to ask for**, along with the three things the cut itself names
as still to draw: the light twin of the block, the OVER state, and where
"recount, or log it" goes.

## A coverage hole this file found

`/rounding` and `/share` were in the sheet pass but not in the rule pass. Both
arrived with the rounding work on 20 August; the sheet session added them to
`SHEET_ROUTES` a day later and `ROUTES` was never updated, so their heights were
measured and everything else about them was not.

Nobody would have noticed, because a script that silently checks 35 of 37 things
prints exactly what a script that checks all 37 prints. Both are in `ROUTES`
now. **When a screen is added, it goes in both lists** — and the count at the
top of this table is the thing that catches it if it does not.

There is a second version of that hole, and B14 is it: a route can be in every
list and still be measured empty, because the screen needs an argument to have a
body at all. A count of routes cannot see that — the tally says 37 either way.
**A screen that takes params gets a line in the audit's `PARAMS` map**, and if
its real state needs a night rather than a URL, a step in `ui-journeys.mjs`.
`/player` was the second one found — the route pass had been measuring the line
"Nobody by that name tonight" for as long as the route has existed.

And a third version, which is B19: a screen can be in the night pass, at real
figures, in the right state, and still be the SEEDED figures. Dana's card is the
three-up state at $500 · $2,120 · +$1,620 whatever size of table is being
played, because the rebuys never touch her — so the state was measured and the
amounts were not. The journey cashes a player out mid-night now, which puts the
night's own figures on the card it is testing.

## Notes per screen

*Add a line here when a screen is conformed, or when something about it is worth
telling the next session that opens it.*

**`/stats` and `/players`** — 30 August, and a departure from doc 15 § 5 check
1 that the next session should not "fix" back. My stats scrolls the club name
out from under its title; the roster scrolls its whole head, back button and
all. Both are deliberate, both are held by `HEAD_SCROLLS` in `ui-audit.mjs`,
and the section **The head, and what scrolls with it** above says why. Every
other screen still pins its head, and the check still goes red if one stops.

**`/new-night`** — O1's *The game* is the board's rows in the board's order:
Stakes, Default buy-in, Money rules. Currency sits among them and is drawn
nowhere. The Stakes row's editor is not drawn either — no board opens it — and
is assembled from the two controls rev 18 § 6 names for exactly this setting,
the numeric cell and the pill segmented pick. B4 in `docs/bugs.md` is the
history, and `DRAWN` is what holds those rows in place.

Two of those rows changed on **29 August**, and both are departures from the
board that the next session should not "fix" back:

- **Start time is gone.** The board draws the row and rev 18 says the figure is
  editable; a night is now stamped with the clock at the moment its table is
  opened, and there is nothing left to set. This is the only route where the
  screen deliberately holds **less** than its board, so *Start time* came out
  of `DRAWN` — with a comment there saying why, because a missing drawn row is
  otherwise exactly the fault that check exists to catch. The primary still
  reads "Open the table · 20:05"; that figure is the phone's clock now, kept on
  the minute by `useNow`, so a sheet left open while people are seated does not
  go on promising the minute it was opened in.
- **Currency opens a picker.** It used to be the one row with no chevron —
  stated here, changed in the group — which was the wrong half of a true rule.
  The currency is still the GROUP's (`03-data-model.md` carries it there and
  nowhere else) and the row's sub-line says so; what changed is that setting the
  game up is where a host is thinking about it, and a club created in dollars by
  a default nobody chose had no obvious way out. The picker is O2's search box
  over the ISO 4217 list: a code, a symbol or the name of the money all match,
  and the whole list is underneath for somebody who does not know the code.

A third changed on **30 August**, and it is an addition rather than a departure:

- **Rounding is a row of *The game*.** How coarsely the table settles is a money
  rule — it changes what people actually pay — and it was reachable only from
  tonight's money rules or from the club's, both of which are places you go
  once the table is already open. A group playing for thousands played the
  first hand on whole dollars and found out at settle-up. The step behind the
  row is the same four chips as `/rounding`, off `ROUNDING_CHOICES` in core so
  the list is written once, and picking one writes tonight's night only — the
  club keeps its own default, exactly as it does for the rules and the buy-in.
  No board draws it, so it is held by the audit's `DECIDED` map rather than by
  `DRAWN`, and the two are deliberately separate: `DRAWN` is worth something
  only while every string in it is on an artboard.

**`/money-rules` and `/deductions`** — both carry the bill and the person who
paid it, as of **30 August**. `11-bill-and-piggy-bank.md` has always allowed a
spend added during settle-up — "recalculates every winner's share and every
transfer" — and the engine always did; the bill hung off the table's own admin
drawer, which is the one part of the night when the bar tab has not arrived yet.
B25 in `docs/bugs.md` is the history. The list is one component,
`src/components/SpendList.tsx`, on both screens and using the sheet the bill
already used: "Covered by" is four cases with a sum rule on one of them, and a
second implementation of that is the one that goes wrong — B14's lesson, and
`frontedSentence` moved into the same file for the same reason.

**`/deductions` is the one of those two that the route pass cannot check.** The
seeded night is mid-count, so the bare route renders E3's *Not yet* state, which
correctly has no bill on it — asking for the row there would be red on a screen
behaving perfectly. `ui-journeys.mjs` owns it instead: with the count in, it taps
*Add a spend* on that screen, types a figure on the pad, names who paid, and
asserts the spend lands on the bill. Same shape as `/share`, for the same reason.

**`/spend`** — the keypad is on BOTH states now. It used to be drawn only when
adding, so L3 — whose first row the spec calls *Amount* — showed a figure with
no way to change it, and a spend logged at $1,200 instead of $120 could only be
voided. That is B24, and it was hiding a second fault: the sheet can mount before
the night store answers, so the edit state opened on $0 with the note and the
fronters blank. The state is seeded once per spend, by id, when the night
arrives. The three note prefills above the field — *Food*, *Drinks*, *Venue* —
are gone: they were the only row of chips under a big money figure, which on
`/log`, `/entry` and `/share` is the preset row, and they read as three preset
amounts. The keypad on every amount screen is held by the audit's `KEYPAD` list.

**`/log` and `/share`** — the preset row is the board's own chip (one object:
figure over caption, raised surface, fill swap on choose), not `Button
variant="preset"` with the caption printed underneath. That is deliberate and B3
in `docs/bugs.md` says why: `Button` pads 24 a side and a third of a sheet has
not got it to give. It is ONE component now —
`apps/mobile/src/components/Preset.tsx` — because for a week it was two, one of
them fixed and one of them not, which is B14.

**`/player`** — the summary card is two stat pairs and a note while somebody is
seated, and three figures side by side once they are counted. The three-up state
is the only place in the app where three figures share a row, and it carries two
deliberate deviations from T4, both from B19 and both written where they are
made: the row is `space-between` with a floor of 8 rather than a fixed 22 and
`margin-left: auto`, and the three-up figure is 28 where the board draws 30 —
two points that buy fourteen of width, which is what a night in the millions
needs at the reader's text cap. The two-up figure is still the board's 32.
Opened bare the route says "Nobody by that name tonight", so it is in the
audit's `PARAMS` map on the seeded night's cashed-out player, and the journey
cashes Petr out mid-night to reach the same card with the night's own figures on
it.

**`/player` is now two screens in one, and the second is new.** While a night
is being played it is T2/T4 exactly as before. Once the night is settled it is
the record of one person's night, opened from a row on E6: the same card and the
same entries, plus what they fronted for the table and an AFTER DEDUCTIONS block
carrying the working — the bill, what came back, the piggy bank, and the
position they add up to. Nothing on it is a control. The footer is one *Close*,
and the entry rows stop being doors into `/entry`, because `settle()` recomputes
from the ledger every time it is read and a correction made here would move a
figure five people have already been paid on. `ui-journeys.mjs` opens it off the
results list at every scale it plays.

**Every movement of that person's money is a row, including the one that is not
in the ledger.** ENTRIES was the ledger's own rows and nothing else, so the only
person whose chips leaving the table appeared on their card was one who cashed
out mid-game — the end-of-night count is `night.finalCounts`, a map E2 fills in,
and everybody counted at the close had a column that added up to their buy-ins
alone under a card reading COUNTED $2,480. That is B26. The count is a row now,
last, at the night's end time — `endedAt`, falling back to the last entry's
stamp, which is E6's own rule in `metaLine` so that the row and the card it
opens cannot date the same night differently. It is the one row on this list
that is not a door: there is no entry behind it to correct, and a count is
changed on E2. `ui-journeys.mjs` holds it as "the counted stack is a row".

**`/share`** — nothing draws this sheet on any board, and it is nothing without
its arguments: opened bare it renders a titled sheet with no body, which is what
the rule pass measured for seventeen runs while the bug in B14 sat on it. The
audit's `PARAMS` map now opens it with the seeded night's bill on it, and
`ui-journeys.mjs` reaches it the way a host does — by tapping a charge on
Deductions — which is the only path that has a real night behind it.

## Rounding, and the one setting that means two things

`design/handoff-E2/docs/E2-rounding.md`, cut 31 August. **The step is set at the
count and governs the night**: stacks snap to it as they are entered, the nets
are computed from the rounded stacks, the transfers derive from the rounded
nets, and the difference goes to the piggy bank — the only place the addendum
allows it to go.

**It is the setting this app already had, doing one more thing.** `RoundingMode`
has been on the night since rev 18, snapshotted like the rules, and until now it
reached exactly one place: how coarsely a RULE DIVIDES, so a bill share came out
at $60 rather than $56. The `/rounding` sheet said so at length, under a heading
reading *What it does not touch* — "nothing anybody counted… a chip count is a
chip count, and rounding a result would be inventing or destroying money".

That objection was right and the addendum answers it rather than ignoring it:
the money invented or destroyed is `Σ rounded − Σ raw`, it is computed **once**
instead of six times, and it is given a name and somewhere to go. Six nets
rounded independently sum to something the table has not got; three stacks
rounded and one remainder named do not.

**One setting, not two.** A table settling in fifties wants both effects, and
two controls both called Rounding meaning different things is exactly how an
interface starts disagreeing with itself. So the step is one value, read two
ways — `stacks.ts` for the counts, `granularityOf` for the divisions — and the
sheet is one sheet with several doors into it.

**Where it is, and who owns it.**

| Screen | What it does |
|---|---|
| **E2 Count up** | Owns it. The bar sits under the balance block, above the list, in every state including before the first stack is counted. |
| **E4 Settle up** | Shows it above the transfers, valued `+$16 → piggy`. Changing it here recomputes the list underneath. |
| **E6 Settled** | Shows it under the deductions block, and only when the night actually rounded. Read-only: rule 8 locks the step once the night is closed. |
| **Money rules / club rules** | The existing `RoundingRow` — a captioned rule row with a sentence — reaching the same sheet. The club scope is the default a night copies when it opens. |

`RoundingBar` is the addendum's row and `RoundingRow` is the money-rules entry;
both read their words from `ruleText.ts`, so the several places that name the
step cannot drift apart.

**The steps changed with the meaning.** Dollar · 10s · 100s · 1k became
**Off · $10 · $50 · $100**, which are the four the addendum names and the four a
room actually counts in. `thousands` and `cents` are still in `RoundingMode` and
still resolve — an old night settled at either re-derives to the figures it
closed with, which is the whole reason the mode is snapshotted — they are simply
no longer offered.

**Two things the addendum does not cover, and what this build does.**

* **No piggy bank, no snapping.** The remainder has exactly one permitted
  destination and a group without a piggy-bank rule has not got it. Settling
  anyway would hand the table money nobody put in, so their stacks settle as
  counted and the step goes on doing what it always did to the rules.
  `SettlementResult.rounding.on` is what says which happened. **Open**, in the
  sense that no frame draws the sheet in that state.
* **Set before the count as well as at it.** The doc says E2 owns it; the game's
  own settings have reached it since 30 August, because a group playing for
  thousands played the first hand on whole dollars. The addendum's own open
  item 1 asks whether the group's rules carry a default step rather than
  forbidding one, so both doors stay.

⚠ **One string is not drawn**: the closed-night sheet's second line, *"This
night is closed. What it settled at is part of the record now."* Rule 8 names
the state and no frame shows it; written to the grammar of the body copy above
it and flagged in `rounding.tsx` rather than passed off as decided copy.

## What E6 asks for that this build does not have

`design/handoff-E6/`, cut 30 August, is the settled screen. Five things in it
are open, and three of them are questions for whoever cuts the next revision.

**The way through to E7.** The handoff removes the *Who has paid* row and says
payments "live on E7, reached from elsewhere". Elsewhere does not exist:
`/settled` is the only route into `/payments` in the app, and `ui-journeys.mjs`
reaches that screen by tapping the row. Removing it outright would leave a host
with no way to open the screen they chase the week's money on. So the row is
gone as asked — no disclosure, no chevron, nothing that reads as a block — and a
chip sits in the flexible space at the end instead, which is what E5 does two
screens earlier for the same reason. It is marked `DELIBERATE DEVIATION` in
`settled.tsx` and should be deleted the moment E7 has a door drawn somewhere
else. **This is the one to answer first.**

**The player's view of the screen.** The cut says so itself: the admin view is
decided, and whether a player sees their own row emphasised, and where their own
settlement sits, is not drawn. `/watch` renders the admin body for now, which is
the honest reading — every row the same weight — and it keeps its own read-only
band, which is not a status pill and not E6's to remove. Its meta line is
untouched for the same reason: "kept by Marek · 4h 36m · 6 players" is rev 15's
and names somebody a watcher cannot ask.

**Whether a row opens anything — answered for the players, not for the
deductions.** The cut's own open list asks "whether the deductions block is
tappable through to the individual entries". The deductions block is not: it is
totals, and it stays totals. A PLAYER's row is, and the 31 August addendum
decides what it opens into: itself. Everything below is that row, and all of it
is marked in `NightResult.tsx`:

* **The row states the result; tapping it states the reason.**
  `design/handoff-E6/docs/E6-row-formula.md`, cut 31 August, is an addendum to
  the logic doc and it settles this: the `in ${in} · out ${out}` sub-line is
  **removed**, a collapsed row is a name and a net at 40 points instead of 60,
  and the arithmetic arrives when the row is opened — `Cashed out`,
  `Bought in`, each bill term, the piggy bank, and a `Net` that closes it.
  Every term that is not zero appears and **nothing is netted**: a player who
  paid at the counter sees `Bill · share −$54` and `Bill · paid it +$242`
  rather than a merged figure. One row is open at a time.

  The rows and their figures are `receiptRows` and `nightScore` in
  `packages/core` — the screen prints them and adds nothing, which is the only
  reason the last line of the receipt can be trusted to be the same number as
  the first. The copy is genderless (`· share`, `· paid it`); the board says
  "his" because the sample player is Petr, and the doc says so.

  **The sub-line went because it could not be made to reconcile.** It was
  rewritten short on 31 August — `$500 in, $620 out, bill: −$29 +$120` — and
  the addendum landed the same day with the better answer: two of five terms on
  a line invite the reader to do maths that comes out wrong, and the row is
  393 points wide however the terms are spelled.

* **Dark keeps a tinted row fill; bright does not.** The one place B23 is
  deliberately reversed, and only in one theme. `rgba(111,207,151,.13)` on a
  win and `rgba(240,112,92,.13)` on a loss, radius 8, no hairline — the doc's
  reason is that at 13% on `#0A0A0B` the wash reads as a band rather than as
  emphasis. The bright theme has no such alpha and stays hairlines with the
  colour on the figure alone. `ui-audit.mjs` carries the exception by name:
  `tinted-result-row` skips a node marked `e6-row` **only** under
  `prefers-color-scheme: dark`, so a fill leaking into the bright theme is
  still a finding.

  The tokens are `winTint` at 14% and `dangerWash` at 12% where the board says
  13% for both. One point of alpha, invisible at any size, against an edit to
  `tokens.ts` — which `CLAUDE.md` says runs alone with nothing else in flight.
  Same call as the loss hex below.

* **A chevron that opens the row, not one that leaves it.** Down closed, up
  open, 13 × 13 at stroke 2.4 — `chevronDown` is new in `Icon.tsx` and is
  `chevronUp` upside down at the same weight, because a row that opens and
  closes may not appear to change its stroke while doing it. `/watch` gets the
  receipt too: it is reading somebody else's night over the wire, and the
  receipt is made of figures that came with it.

* **The row no longer opens the player card, and that is a loss worth naming.**
  It used to push T2/T4, because *why is my number this* had no answer anywhere
  in the app. The receipt answers it where the question is asked. What the card
  also had — which rebuy, which spend, at what time — is not in the receipt, and
  the addendum's own open item is "whether the expanded receipt is also the
  route into the individual entries, or whether that stays with **Full
  ledger**". Neither is drawn, so neither is built. **Open.**

**Which layout ships: the columns.** `design/handoff-E6/docs/E6-results-columns.md`,
cut 31 August, offered a **columns** layout — `game · food · piggy · net`, four
computed figures on the row, nothing tappable — against the receipt rows, said
they were alternatives rather than layers, and left the choice open. The owner
picked the columns: *the table style with the deductions all in open view*.

**The whole formula is on the row.** `game` is what happened at the table with
no deductions in it; `food` is their share of the bill netted with whatever they
paid at the counter, which is the one thing this layout nets and the trade it
makes; `piggy` is their contribution in its own column, never merged into food;
`net` is the three added up, and it is the same `nightScore` figure the receipt
rows printed. That identity is asserted twice — in `rev15-night.test.ts` for
every player of the canonical night, and in `ui-journeys.mjs` against the
figures actually on the phone, which is where a column could be drawn in the
wrong order or a cell dropped.

**The receipt rows are still here, and are not a second opinion.** Four numeric
columns is the ceiling at 393 points, so a night whose rules reach past the bill
and the piggy bank — a host's fee, a next pot — cannot be drawn this way and
gets the receipt rows, which have a line per kind. `columnsFit()` in
`packages/core` is that test, and the screen does not re-decide it. Everything
`E6-row-formula.md` asked for still holds on that path: the collapsed row is a
name and a net, one row opens at a time, the two bill terms stay apart, and dark
keeps its tinted fill.

**Two deviations from the board, both about width.** `food` and `piggy` are 60
points where the board draws 58 and 50: the board's night has two-figure piggy
contributions and this app is measured against tables in the millions, where the
same cell holds `−$118k` and `−$12M` — six glyphs, 53 and 56 points, clipped in
both. The name gives those twelve points up; it is the one thing in the row that
may ellipsise. And every column abbreviates at ten thousand rather than at the
million a full-width row does, because they are different widths and one
threshold for both would have to be the tighter of the two everywhere.

⚠ **The footnote is the board's, less its example.** It is drawn as "…plus
whatever they paid at the counter — Petr paid $242 and owed $54, so +$188", and
those are the sample night's figures against the sample night's name. A real
night printing them would be explaining itself with somebody else's money, so
the two sentences about the columns are verbatim and the illustration is
dropped rather than rewritten.

The addendum's three corrections apply either way and all three hold: order is
`net` descending, the receipt's first line reads `Cashed out`, and this screen
never said `THROUGH THE TABLE` or `OFF THE TABLE` — its labels come from
`E6-results-logic.md`, which draws them as `PRIZE POOL` and `DEDUCTIONS`.

**A row prints a score, not a balance — and the float is named underneath.**
B27, and the one deviation on this screen that changes a figure rather than a
line of text. Whoever holds the piggy bank ends the night with the room's money
in their pocket, and `finalPosition` includes it, correctly: the transfers have
to hand it over. E6 drew that figure, so the seeded club's collector read a
`+$126` win in the column of wins, above five people who had played all night
for less, and a host who collects AND plays read their own night $126 heavy.

The row now prints `nightScore`'s `score` — `finalPosition` less what they are
only holding — and the float is named once, under the deduction it came from,
as `collected by {name}`. Nothing about the settlement moved: `score + held`
is `finalPosition` exactly, and settle-up and *Who has paid* are untouched.
A bill is deliberately not a float: money back for the pizza is the fronter's
own, it stays in their score, and `ruleCollector` names nobody for it.

Two things follow from it. The collector who never sat down leaves the player
list entirely — their whole appearance there was the float — and the player
card at `/player` makes the same split, with its "Their night" total on the
score and the float on its own line below, so the two screens cannot disagree
about one person's number.

⚠ **`collected by {name}` is not drawn on any board**, because no board takes
the float off the row. It is flagged in `NightResult.tsx` rather than passed
off as decided copy, and it is written to the grammar of the qualifier beside
it.

**The deductions qualifier.** The board draws `collected on the side` and the
logic doc says to "replace that qualifier with whatever the group's money rules
actually do". The engine charges deductions to the players and credits them to
collectors, so the money genuinely is collected off the table and the board's own
words are true of this app — and copy is final, so they are what is on screen.
If a group whose rules work some other way needs a different line, that line has
to be written rather than derived.

**One colour, off by three units.** E6 gives the bright red as `#A93A2A`; the
token is `#B03A28`, which every earlier bright board drew and which is used in
every screen in the app. Changing it is an app-wide edit to `tokens.ts`, which
`CLAUDE.md` says runs alone and with nothing else in flight. The difference is
not visible at any size and it is not worth a session's worth of merge risk;
worth doing on the next pass that touches the palette for its own reasons.

One more, smaller: the board puts the meta line at the page's own 22, and Chrome
A indents it 68 so it sits under the title rather than under the back button.
The indent is `chrome.metaIndent` and belongs to every pushed screen, so this
screen keeps it.
