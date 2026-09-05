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
| `/ledger` | push | ✓ | — | ✓ | ☐ |
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

**38 screens · 38 under the rule pass · 21 under the sheet pass · 13 under a big
night · 0 conformed.**

`/ledger` is the thirty-eighth, added 1 September: format `7e`, the four-column
table, which stopped being E6's default in the same cut and became what *Full
ledger* opens. The route pass reaches it cold and gets its "these rules cannot
be drawn in columns" state, because the seeded night is not settled; the night
pass opens it for real by tapping the button on a settled night.

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

**T1 went in on 1 September**, with the two group headers and the qualifier that
makes the right-hand column readable — `STILL PLAYING`, `CASHED OUT`, `RESULT
BEFORE DEDUCTIONS`. E2's three replaced *Still seated* and *Already confirmed*
in the same cut. Those two strings left the map because the groups themselves
were replaced, which is the one reason a row may leave it; B32 in
`docs/bugs.md` is the fault they were replaced over.

**E6 still could not be filled in, and the reason is worth writing down** rather
than leaving it to look like nobody got round to it. `/settled` reads the night
the app currently holds, and the seeded night is still being played — so the
rule pass, which opens every route cold, gets the *Not settled* fallback and
never sees `PRIZEPOOL`, `NET, AFTER DEDUCTIONS` or `DEDUCTIONS` at all. A
`DRAWN` entry for it would go red on a screen that is correct. `ui-journeys.mjs`
does reach the real one — it plays a night through and stops on it — but it runs
its own overflow checks rather than the rule pass, so the map is not available
there either. Giving the route pass a settled night to open is the fix, and it
is a job of its own. Meanwhile the night pass carries the assertions the map
would have: the three terms are on the row, and they add up to the net beside
them on screen.

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
measurements for this screen are on **two** boards now, and they cover different
halves of it:

- the block, the bar and the strip — `design/handoff-E2/boards/Settled Status.dc.html`,
  layout **2a**, colour option **2f**;
- the player list, its three groups and its type scale —
  `design/handoff-count-up-to-settled/boards/Cashed Out States.dc.html`, frame
  **1a**, with the scale written out in that cut's `docs/05`.

⚠ The E2 frames on the second board sit on the OLD E2 chrome — an `Apply the
money rules` button and a `78% accounted for` strip, both superseded by layout
2a. Take the list off it and nothing else, exactly as the rounding addendum's
own warning says of its frames.
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

**`/stands` is deleted, and `IN PLAY` is the word** — 5 September, on the
owner's instruction, off the game-outcomes journey map
(`design/cjm-game-outcomes/`, and `docs/game-outcomes-cjm.md` for the argument).
Two decisions, and both are deviations from a drawn board, so they are here
rather than only in a commit.

*E2b is gone.* **Where everyone stands** drew Count up's finished players again
— same two calls, same two groups, one tap away — and added a sort and a rank
number. E2's `Counted` and `Cashed out earlier` groups now rank biggest winner
first in its place, and the screen, its route, its link, and its legs in
`ui-audit`, `ui-currency`, `ui-frames`, `ui-journeys` and `ui-shots` are
deleted. The ranking is **within each group, not across the two**: a counted
slab reopens the keypad and a cashed-out-earlier slab does not, so one heading
over two affordances would undo what three groups are for. `Still to count`
keeps seat order — it has no result to rank on.

What that costs, and it is the honest half: E2b ranked *across* the two, so a
room could read one leaderboard mid-count. Nobody can now. The judgement is that
the leaderboard was never worth a screen, and that two ranked groups on the
screen where the counting happens answer the question the room was asking.

⚠ *And it leaves one question with nowhere to go.* `session.tsx` sent Tonight's
`Cashed out` group to E2b in as many words — *"Ranking them by RESULT is the
other candidate and belongs to E2b, which is the screen that ranks. Asked."*
Those rows draw their result at the right edge, so the argument that just won on
E2 applies to them unchanged. **Open.** Left in seat order rather than changed
on the strength of a decision made about a different screen.

*One word for money in: `In play`.* $5,000 was `total in` on Tonight,
`BOUGHT IN` on E2 and `PRIZEPOOL` on E6 — one figure under three nouns, on three
screens a host sees inside ten minutes, with nothing saying they are the same
number. `/watch` already said `IN PLAY`, so that is the word and the other three
now use it.

Two figures keep their own names because they are different numbers, not the
same number spelled differently: **`On the table`** on Tonight is what the
seated players still have in front of them ($2,880 against $5,000, and Tonight
draws both only when they differ), and **`In for`** on the player card is one
person's stake rather than the night's.

⚠ *Two costs, recorded rather than argued away.* It is a **deviation from the
four-screens board**, which draws `PRIZEPOOL $5,000` at item 4 of Screen 3; and
`IN PLAY` is **past tense on a settled night**, where nothing is in play any
more. `CLAUDE.md` says copy is final and it is being overridden here on the
owner's instruction. The alternative is a fourth right word for the fourth
screen, which is the thing being fixed.

**`/player`** — 3 September, on the owner's instruction: *"a smooth and
informative touch-free transition between the rebuy and the return to the Home
Screen"*. Holding **Rebuy $200** now writes the entry, states what just happened
in the button's own box — `Maja added $200` over `In for $700 · back to
Tonight` — sweeps a bar out over 1.1s and dismisses the sheet onto Tonight. No
tap between releasing the hold and being back at the table.
`apps/mobile/src/components/Handoff.tsx` is the block; the composition and the
copy are in `player.tsx` at the quick rebuy.

*What it changed that was decided the other way.* The card's own note said
*"nothing has to announce itself, because the screen the host is already looking
at is the receipt"*, and the receipt is still there — the row in ENTRIES, IN FOR
going up. What it never did was hand the screen back, so the most repeated act
of the evening ended with the host reading a card they had finished with and
hunting for the close.

⚠ **NOT DRAWN, ANYWHERE.** `08-tonight-home.md` H3b draws the hold and what a
release before the end does; no board draws what the app shows once the write
lands, because until now it showed nothing. Every word is lifted off this screen
— IN FOR is the card's own label, Tonight is the name at the top of what it
returns to — and the one new verb is the host's own. **Two states are still
undrawn and are asks, not inventions**: a write that fails (it falls back to the
button, which is what this screen has always done with one) and what a
screen-reader hears, which is the two lines read aloud.

*Reachable by nothing that runs.* The status is behind a one-second hold, so
`ui-audit.mjs` — which opens `/player` at a URL — cannot see it, and
`ui-journeys.mjs` logs its rebuys through the dock, which is the other route in
entirely. `handoff.contract.test.ts` is the lock, and it is a source read: the
component is drawn, the hold is still there, the copy is those words, the write
is awaited before the status, and nothing on the sheet navigates while it
closes. **If the hold path ever gets a browser step, that test is the thing to
delete.**

**`/session`, `/count-up` and `/stands`** — 3 September, the mixed player list
rule (`design/handoff-player-list/`). One treatment for every list where some
players still have money on the table and some are finished, replacing the three
each screen had invented for itself. `isFinished` is the only flag either
treatment depends on; `apps/mobile/src/components/PlayerList.tsx` is the whole
of it and its header carries the reasoning.

*What it changed that had been decided the other way.* `RESULT BEFORE
DEDUCTIONS` came off every group label, because the slab is what says settled
and the words no longer have to — `ui-audit.mjs` required that string and does
not any more. And E2b inverted: the finished group is ranked and comes first,
with cashed-out players ranking alongside counted ones, because only a final
result can be ranked and a stack that left at eleven is as final as one counted
at one.

*What was NOT taken, and confirmed by the owner on 3 September.* The primary on
E2 stays `Next`, and the balance card keeps its verdict strip and its three
states — the board carries an older frame on both, and later cuts decided them.

*The one place the rule is bent, which is this app's business rather than the
board's.* **Two finished slabs keep a chevron**, and the rule they share is *a
figure is fixed where it was entered*. The ledger is append-only, so a wrong
figure is corrected by entering it again, and these two rows are the only door
to the screen that does that:

- **A counted stack on Count up** reopens the keypad it was typed on. Without
  it, E5's `Fix` leads nowhere: out of balance is the one recovery path in the
  app, the fix is always a count, and the button hands the host back to a screen
  where every row is counted and nothing on it can be changed.
- **A cashed-out player on Tonight** reopens their card. `/player` is the only
  route to `/entry` anywhere in the app, and the roster opens `/member` — the
  club record — not the night's card. Dropping this chevron does not tidy a
  finished row, it strands the fix for the most expensive typo of the evening.
  It is also the same row the count-up-to-settled cut left open below — *whether
  a settled player on Tonight can be un-cashed-out* — and the same answer: the
  row is a door either way.

`CASHED OUT EARLIER` on Count up does **not** open, by the same rule read the
other way: that figure was typed on Tonight, so Tonight's slab is where it is
retyped. Everywhere else — E2b, the picker, E1 — a finished slab cannot take a
press at all, because `FinishedSlab` calls the prop `opens` and only those two
rows pass it.

**Ask**, because the handoff states the ban plainly and this is a considered
refusal of two of its rows rather than an oversight. If the answer is that the
chevrons come off, the correction flow needs a home first.

*And one fault it introduced and the currency pass caught* — B41. The slab is
one component and the fact is a string, so the screen chooses the sentence: the
board draws `23:15 · out $2,120` on Tonight and on the picker, and `23:15` alone
on E2, because E2 is the densest list in the app. Building E2 with Tonight's
fact clipped the money at both widths in a three-letter currency.

**`/session`, `/count-up` and `/ledger`** — 1 September, the count-up-to-settled
cut (`design/handoff-count-up-to-settled/`). The player lists on the two screens
that show one while the night is still open, and the ledger behind E6's footer.

⚠ **THIS CUT AND THE E6 REDRAW LANDED THE SAME AFTERNOON, from two sessions, on
the same screen.** They agree about the row — both put the night's terms under
the name as a sentence — and the redraw is the broader piece: it rebuilds E6
from the rev-18 frame and makes the formula generic over rule destinations, so a
host's fee has somewhere to go. **The redraw won E6 in the merge**, whole, and
this cut kept the two screens it did not touch plus the ledger its footer note
asked for. What is written below is what that resolution left standing.

*What was decided, and built.* Settled players are grouped, muted and signed on
Tonight and E2 alike, because the right-hand column changes meaning between an
active row and a settled one and nothing else on the row said so — B32. Two
groups on Tonight, three on E2, seat order within each, headers drawn at `· 0`.
And `7e`, the four-column table, is `/ledger` now, behind the *Full ledger*
button the frame has always drawn and the E6 footer had no destination for.

⚠ **SEAT ORDER NO LONGER HOLDS ON TONIGHT'S STILL-PLAYING GROUP — most money in
first, on the owner's instruction, 3 September**: *"the more player has bought
in the higher he should be in the list"*. The doc's sentence is "Groups never
reorder. Within a group, seat order", and this screen had been changed FROM
buy-in order TO seat order to obey it, so the reversal is deliberate and the
doc's own wording is not the thing to read here. **Do not put seat order back
from `05-active-vs-settled.md`.**

What it costs is what seat order was protecting, and it is still true: logging a
rebuy moves that row up the list, so the row under the host's thumb is not the
one that was there a moment ago. What it buys is that the biggest stacks at the
table are at the top of the screen.

Two things were held to, and the second is a question. The order is only applied
where the key is DRAWN — every still-playing row carries what its player is in
for at the right edge, so the sort can be checked by running a finger down the
column. And **`CASHED OUT` is left in seat order**, because the buy-in is not on
those rows at all: the fact is when they left and the figure is their result, so
sorting them by buy-in would be an order the reader cannot see. Ranking them by
RESULT is the other candidate and it is E2b's job — *Where everyone stands* is
the screen that ranks. **Ask** whether that group should rank by result here too.

Locked by `npm run check:ui` — `ui-journeys.mjs`, "the table is ordered by what
people are in for", which reads the rendered column after three rebuys have been
logged and fails if any figure is larger than the one above it. Verified red with
the sort removed. An ordering is precisely the kind of change a merge decides by
coin toss — nothing breaks, no test goes red, and the list is quietly back the
other way round on the phone — so it is asserted rather than trusted.

*The one place this cut overrides a doc it otherwise carries forward.* A counted
row on E2 prints **the signed result, computed from the raw count**, where
`E2-rounding.md` rule 6 put the rounded stack there. `05-active-vs-settled.md`
is nine days newer, is about this exact column, and says `result = counted −
boughtIn` with "neither figure has had the bill, the piggy bank or rounding
applied". Taking the rounded figure instead would leave `in $500 · counted $965`
sitting under `+$470`, which is a row whose own two figures do not produce the
third. Rule 6's guarantee is intact: the count is never rewritten and is still
printed under the name, and what the night will settle that stack at is on the
rounding bar directly above the list. **Worth putting back to the designer**,
because it is the one place the two cuts have to be read against each other.

*And one the two SESSIONS disagree about, left as it landed.* `02-E6-results-row.md`
says a term of exactly zero still prints — "Never omit a term to save width; the
row's whole argument is that the same three terms appear in the same order for
everybody." The shipped `resultFormula` drops a zero term instead. Both are
defensible and they are answers to different questions: the doc is describing a
row with three FIXED terms, where a gap would read as a missing figure, and the
built row is generic over whatever rules a night has, where a `$0` term for a
rule that did nothing is noise. Nobody has decided which the row is. **Ask** —
and note the doc's rule, applied to a night with no bill and no piggy bank,
prints `food $0 · piggy $0` on every row, which no board draws either.

*Left open on the two list screens, and flagged rather than invented:*

- **No fade on E2 at eight players.** The doc keeps `1a` (fade) and `1c`
  (recessed slab) open and says three groups plus eight players overflows E2 by
  61 points. This app's E2 scrolls as a whole screen rather than as a list
  inside a fixed frame, so neither treatment applies as drawn; the type scale is
  `1a`'s, which is the build. If the fold matters more than the whole-screen
  scroll, `1c` is the alternative and the doc states the trade.
- **Whether a settled player on Tonight can be un-cashed-out**, and what the row
  does meanwhile. The doc lists it as open; the row is a door either way — the
  chevron stays, dimmed.
- **Whether `CASHED OUT EARLIER` on E2 should collapse**, given it can never
  change from that screen. Drawn open, built open.
- **No transition** is specified for a row moving between groups when somebody
  cashes out, and none is built. The row moves and nothing is left behind.

*And on `/ledger`, which is a screen no board draws as a screen:* the chrome is
this app's own push, the title is the button's own words rather than invented
copy, and the table scrolls — the doc leaves "whether `7e` there is scrollable
or paged" open, and paging a table nobody has drawn a pager for would be
inventing two things instead of one.

*And one glyph.* The doc asks for E2's tick at stroke 2.4; the app's shared
`check` is 2.2 and is drawn on four other screens. Two tenths of a point against
a change to a shared component, which `CLAUDE.md` says runs alone and with
nothing else in flight. Left alone deliberately.

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

**`/deductions` has no table on it any more — 4 September.** *Everyone after
deductions*, the block at the foot of E3, was five columns under heads reading
`GROSS BILL PIGGY NET`, in a dashed frame with a `PREVIEW` tag on it. That is
what rev 18 draws (`13-after-the-night.md` § E3) and what the screen built. It
is rows now, in the same frame with the same tag: the name, the working under
it, and the position hard right.

    Dana                                                        +$1,543
    game +$1,620 · food −$54 · piggy −$23

**It is the change the settled night made on 2 September, one screen earlier in
the flow**, and the reason is the same one: a grid of figures reads as a second
ledger beside the rule blocks above it, and every cell in it is already printed
in full, to the dollar, in the block it came from. What the columns had that the
blocks have not is the TRANSPOSE — one person, every rule, on one line — and the
formula line is exactly that. The two screens now say a person's night in one
shape, off one engine call: `resultFormula`, which E4's `Night's net` list
already used.

**The screens differ on what they fold in, and that is deliberate.** E6 does not
fold a deduction into anybody's result — the row is what they did at the table
and the deductions are a block of their own (`design/handoff-four-screens/`).
E3's block is titled *Everyone after deductions* and folding them in is the
whole of what it is for; it is the working, while there is still time to change
a rule, and it is tagged `PREVIEW` for that reason.

**And it can state the rounding step now.** The table drew `ruled` — the
position before the step — because four numeric columns is the ceiling at 393
and the step is a fifth, so the frame carried a line reading *"Before rounding —
the step lands at settle-up"*, which no board drew. A sentence has no such
ceiling: the step is a term like any other, the figure on the right is the one
E4 settles, and the caveat is gone with the grid that needed it.

**⚠ It is a departure from rev 18, which draws the columns.** No later cut
draws E3 — `handoff-count-up-to-settled` speaks on E2, E4 and E6, and
`handoff-four-screens` on Tonight, Count up, Results and Settle up; the only
mention of this screen in either is `05-active-vs-settled.md` saying the
deductions happen here. So it is decided against the pattern those two cuts set
for the same figures on the screens either side of it, not by a doc that draws
E3. The board is still `Screens - After the night.md` § E3 and it
still draws the grid. **Open, and the one to put in front of the owner.**

`ui-journeys.mjs` holds both halves at its `deductions` stop — no column heads,
and a formula line under a name — because `/deductions` opened bare is E3's *Not
yet* state, which has no preview on it at all, so the route pass can see neither.

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
the record of one person's night: the same card and the
same entries, plus what they fronted for the table and an AFTER DEDUCTIONS block
carrying the working — the bill, what came back, the piggy bank, and the
position they add up to. Nothing on it is a control. The footer is one *Close*,
and the entry rows stop being doors into `/entry`, because `settle()` recomputes
from the ledger every time it is read and a correction made here would move a
figure five people have already been paid on. ⚠ **Nothing opens it once the night is
closed.** E6's rows stopped being doors when the whole formula went onto the row,
and the route in was that door — so the settled card is built, tested and
currently unreachable. It is the same hole `Full ledger` is, and the same answer
would fill both. **Open.**

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

**`/settled` and `/payments` are `R1 · Results` and `R2 · Who pays whom`** —
5 September, off `design_handoff_rebuy_and_results/`, Part 2, whose board is
`Game Results Breakdown.dc.html`. It supersedes `design/handoff-four-screens/`
on these two screens and nowhere else; everything that cut says about E2, E3 and
E4 still stands.

*The reversal, stated plainly.* The four-screens cut's central rule was
**deductions are not folded into any player's balance**, and `NightResult.tsx`
argued it at length: the row was what somebody did at the table, the deductions
were a block of their own, and the arithmetic joining them was behind *Full
ledger*. The owner's reason was good and is unchanged — a bill split flat across
eight people takes $54 off six losers for something that has nothing to do with
poker. **R1 folds them back in and prints the working under the name.** Its
answer to the same objection is that nobody ever minded the subtraction, they
minded it being done on their behalf without being shown:

    FINAL                          after deductions and compensations
    Petr                                                       +$315
    150 − 54 − 23 + 242 paid

`AT THE TABLE` is the old game-results list, neutral, closing on
`$5,000 in, $5,000 out · $0`. `DEDUCTIONS` is the old block with every bill open
on the face of its slab — who fronted it and for how much — and its total on the
section label. `FINAL` is new, and it is the answer to **finding 7** of
`docs/game-outcomes-cjm.md`, *"a settled night no longer shows anybody their
net"*, which is now **done**.

*Colour is reserved for the FINAL block.* Table figures are neutral so nobody
reads them as the answer. The deduction slabs are the one tinted thing on the
screen and they carry an unsigned total, so B23 and `tinted-result-row` are
untouched: no signed figure in this app sits on a fill.

*The caption terms are the engine's.* `resultFormula` gained a `caption` field
beside its `terms` — the same decomposition with a bill's two halves kept apart,
because `terms` nets Petr's `−54` and `+242` into a `food +$188` nobody at that
table did. It is a field on that function rather than a sixth view model: a
second entry point would be a fourth place to decide which credits are a float.
`Σ caption === Σ terms === net`, asserted in `rev15-night.test.ts` and in
`packages/core/src/results-r1.test.ts`, which holds the handoff's own eight-player
worked example — the finals that sum to −184 — to the dollar. **That night is the
spec's test case and not the app's seed**: the app is still seeded with the
canonical night.

*One new night-level view model, `resultTotals`.* Both closing rows are sums
across a column, which is exactly what `CLAUDE.md` forbids a screen to do, and
every other view model in `working.ts` is a list of players. `paymentProgress`
is the same story for R2's header, which did three reductions inline.

⚠ *Deviations, recorded rather than argued away.*

* **`Share` is not built.** R1's header draws `Back to Sessions · Share`.
  `09-navigation.md` is FINAL on chrome — a pushed screen has *nothing at all*
  in the top-right — and it is a behaviour rule, which the spec wins. `Screen`'s
  `trailing` slot forbids a control by name. Sharing a settled night has no door
  drawn anywhere else in the app. **Open**, and it is the same hole it was
  before: the rev-18 frame drew `Share` there too and it has never been built.
* **`#E8E9EC` is not a token.** The board's neutral money sits between `text`
  and `muted`; `tokens.ts` is app-wide and `CLAUDE.md` says an app-wide change
  runs in a session with nothing else in flight. The table figures are drawn in
  `text` meanwhile, which keeps the rule that matters — nothing in that block is
  green or red — and loses half a step of de-emphasis. Same for the settled
  slab's `rgba(255,255,255,.05)`, drawn as `drawerFill`.
* **No arrow glyph on `Who pays whom`.** `Button` takes a label and nothing
  else, and it is app-wide. The word is the board's.
* **`Petr paid`, not `Petr paid the delivery`.** A rule's credits are one figure
  per person however many trips to the shop made them up; the engine has nowhere
  to keep which errand it was. The drawn sentence with the half we do not know
  removed, rather than invented.
* **R2's header figure abbreviates past $100,000.** The meta line is one line
  of Chrome A that does not wrap and is not capped against the reader's text
  setting; at 360 and 120% text a nine-digit table drew
  `0 of 6 settled · $239,003,550 still to move` at 373 points on a 360-point
  phone, and `ui-journeys.mjs` caught it. `$239.0M` fits, the exact figure is on
  every row below, and nothing a real home game plays for is touched.
* **R2's progress bar is under the lists, not under the meta line.** The meta
  line is a string on Chrome A's title row and nothing may be drawn between it
  and the body. Moving it up means changing `Screen` — app-wide again — or this
  screen drawing its own header, which is what Chrome A exists to stop.
* **The prize-pool card is gone.** `In play · Entries · Deductions` in a card
  above the rows is the four-screens layout and R1 draws no such card. The money
  it stated is on the table block's closing row in the board's own words
  (`$5,000 in, $5,000 out`) and the deductions total is on its section label;
  what is genuinely lost is the entry count, which lives on Count up. ⚠ This
  takes `In play` off one of the three screens the 5 September wording decision
  put it on — Tonight, Count up and `/watch` still say it — because the newer
  board draws no figure for it to label.

*What the single footer button did to two routes, since neither may be silently
orphaned.* `/payments` **is** the footer: `Who pays whom →` is the one control
R1 draws, and the `Who has paid` chip is gone because the door is now drawn.
`/ledger` **is a chip under the blocks**: R1 does not draw it, `/settled` was its
only door in the app, and it is not redundant with the caption — the caption is
one truncating line and `7e` is four columns at full width with the rounding
step in one of its own, off the same `resultColumns`. `/nudge` is the same case
one screen along: R2's footer is `Mark the rest settled` / `Mark all settled`,
so the nudge is a chip above it. **All three chips are deviations and all three
are doors nothing else in the app opens.** Delete each the day a board draws it
somewhere else.

*R2, and what it keeps.* Settling and paying are still separate — nothing on
that screen touches the night's result, and no figure in the app reads `paidAt`.
The whole waiting row is still the tick (the board draws the affordance as a
22px empty circle on the right; the tap is not confined to it), and the way back
off a mis-tap is now `Undo`, the one live target in a settled slab that is
deliberately 39 tall — under a tap target — with its own hit area padded back
out to 44. The piggy bank is a recipient like any person and its name is drawn
in bone; which recipients those are is `paymentProgress`'s answer, off the same
membership test that keeps a collector's float off anybody's result (B27).

*What went red and was updated, with the reason on the line.* `ui-journeys.mjs`
asserted `Game results` and **no** formula under a name — the four-screens rule —
and now asserts R1's three blocks, a caption with no currency symbol in it, the
total on the section label, and the bill's payers on the slab. Its `Who has paid`
leg is `Who pays whom`, and its one-touch-on-one-touch-off leg (B21) is the same
behaviour on `Undo`. `ui-shots.mjs` follows the same rename. No check was
loosened: every one of them asserts what it asserted before, on the words the new
board draws.

⚠ *And one trap in `ui-journeys.mjs` worth knowing before writing another leg.*
A backslash class inside `:text-matches("…")` does not survive: the selector's
own parser eats it, so `^\S+ paid$` reaches the regex engine as `^S+ paid$` and
matches nothing. Write `[^ ]+`. It went red once here and would have gone GREEN
silently on any leg that asserts a count of zero.

⚠ *`ui-audit.mjs` and `ui-journeys.mjs` read `UI_CHECK_BASE`, not
`UI_CHECK_PORT`.* `ui-gate.sh` serves on `UI_CHECK_PORT` and `ui-currency.mjs`
honours it, so `UI_CHECK_PORT=4341 npm run check:ui` builds, serves on 4341, and
then two of the three passes fail to connect to 4321. Set both, or leave the
port alone. Not fixed here — it is harness plumbing outside this batch's files.
**Open.**

## The group's own money

Every amount in the app is written in the currency the group keeps its book in.
It is picked when the group is made, changed from the **Currency** row in the
game's own settings, and read back on Settings. Until 31 August exactly two
screens looked at the answer and the other thirty-one drew dollars — B32.

**The app imports its formatters from `src/lib/money.ts`, never from core.**
Every formatter in `packages/core` has taken a currency symbol since it was
written and defaults to `$` when nobody passes one, which is what let this
happen: 141 call sites, none of them passing anything. The app's own module
binds all of them to the club's symbol and **has no default**, so a new call
site is right by construction rather than by remembering. `roundingChoices`,
`roundingRowLabel`, `roundingRowValue`, `roundingSentence`, `ruleDetail`,
`stakesLabel` and the rest go the same way — the step and the stakes are amounts
too.

Core stays pure: the Supabase edge functions import it, and there one process
settles other people's books, so a module-level "current currency" would be a
fact about whichever night was touched last.

**Two escapes, both named rather than optional.** `formatUnmarked` and its
siblings draw a figure with no symbol at all — E3's preview grid and E4's net
chips, both narrow columns that name their currency once at the head instead of
six times down a 46-point cell. They are separate names on purpose: an override
argument would put the default back.

**A wider symbol abbreviates earlier — B33.** Every width in this app was
measured against a one-character `$`, and `CHF` is three. Each extra glyph moves
the abbreviation threshold down a decade, and at three glyphs the figure drops
its decimal as well (`CHF5k`, not `CHF4.5k`). One rule in one place; twenty
thresholds stay where the boards put them.

`npm run check:ui` walks the money screens a third time with the book kept in
CHF (`ui-currency.mjs`). It is looser than the journeys by one rule, with the
reason at the top of the file: **a clip is a fault and a wrap is not**. At 360
`in CHF500 · out CHF0` takes two lines, both figures are under a thousand so
nothing can shorten them, and cutting one would be B12.

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
| **E6 Settled** | Shows it under the rule-outcome block, and only when the night actually rounded. Read-only: rule 8 locks the step once the night is closed. |
| **Money rules / club rules** | The existing `RoundingRow` — a captioned rule row with a sentence — reaching the same sheet. The club scope is the default a night copies when it opens. |

`RoundingBar` is the addendum's row and `RoundingRow` is the money-rules entry;
both read their words from `ruleText.ts`, so the several places that name the
step cannot drift apart.

**One sheet, two sets of sub-lines** — frames `5b`/`5d` against `4b`/`4d`, and
the difference is which question the step is being asked. E2 is entering stacks,
so a step is worth knowing as the worst distortion it puts on ONE stack: *No
stack moves by more than $3*. E4 has counted them and is looking at a list of
payments, so a step is worth knowing as what it costs the tin and how many
payments it leaves: *+$16 to the piggy bank · seven transfers*, and `Off` states
the tin's whole total instead because there is no remainder to name. The
paragraph at the top of the sheet swaps with them; both strings are the board's.

The route says which: `/rounding?scope=night&from=settle`. **It is four whole
re-settles, one per step, and that is deliberate** — the remainder and the number
of transfers are both downstream of every rounded stack, every rule and the
matching that pairs debtors with creditors, so working either out on the screen
would be a second implementation of `settle()` with nothing checking it. Locked
by `rev15-night.test.ts`, "E4 — the rounding sheet states what a step would
cost".

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

## The settled night, and which board it is drawn from

**The frame is the rev-18 E6 frame, and that is a reversal worth stating
plainly.** `13-after-the-night.md` says of it, in bold, *"Do not build this
layout"* — superseded by `1C` from `design/Player History.dc.html`, which is not
in this repo — and `design/handoff-E6/`, cut 30 August, then drew its own
replacement: one compact `PRIZE POOL` line with a status pill on it, the player
rows under it, and a deductions block with a `TOTAL` row at the foot. That is
what shipped, and it is what the owner replaced on 1 September, pointing at the
rev-18 frame instead.

So the layout on screen now is the frame in
`docs/screen-specs/Screens - After the night.md` § E6 — the pixel source, every
dimension inline — and it is the layout every one of those documents supersedes.
**It is the owner's call and it is deliberate; it is not a session losing track
of which cut wins.** What it carries forward is what the frame does better: the
three figures across the top read as one sentence about the night, and the
rule-outcome rows say where the money went, which the handoff-E6 block never did.

**Every decision the later cuts made is still in force.** The frame is the
layout and nothing else:

* `PRIZEPOOL` / `ENTRIES` / `DEDUCTIONS`, not the frame's `THROUGH THE TABLE`
  and `OFF THE TABLE` — `E6-results-columns.md` renamed them and the summary
  uses the new words.
* **Hairline rows, no fill, in both themes.** The frame washes every row green
  or red; B23 is what that cost, and `ui-audit.mjs`'s `tinted-result-row` holds
  it. The colour is on the figure and nowhere else. This is the one place the
  frame is overruled on colour rather than followed.
* **`Piggy bank`, never `Kitty`.** The frame draws `Kitty · held by the group`.
  `kitty` is the stored value of the destination and no reader ever sees it —
  `destinationWord` in core owns the spelling.
* **The row states the whole night**, not `in $500 · out $2,120`. See below.
* **No status pill.** `handoff-E6`: a confirmed result states no status of its
  own. The word `settled` is the last term of the meta line, which is where the
  frame puts it too.

**`Full ledger` has somewhere to go now, and the footer is the frame's again.**
It draws a pair of outlined buttons at the foot, `Full ledger` and `Close`. That
left slot held `Who has paid` until 1 September, with a note saying why — there
was no full ledger in this app — and saying what would replace it: *put `Full
ledger` there the day there is a ledger to open*. `02-E6-results-row.md`, cut 1
September, is that day. It keeps the four-column table `7e` "as the full-screen
variant behind the *Full ledger* button, where columns are worth the width", and
`/ledger` is that screen — the same four terms this row says as a sentence, said
as a table, off the same `resultColumns`.

**`Who has paid` went back to being a chip** in the flexible space above the
footer, which is where it was before it borrowed the slot. The deviation it
represents is unchanged and still the one to answer first: E6 says payments live
on E7 "reached from elsewhere", elsewhere is not drawn, and `/settled` is the
only route into `/payments` in the app.

**What `Full ledger` is still NOT** is the entry list — which rebuy, which
spend, at what time. No board draws one, and `/ledger` does not pretend to be
it.

**And the top-right corner stays empty.** The frame draws a home glyph and
`Share` in it, and the E4 frame draws a home glyph and `Edit`. `09-navigation.md`
is FINAL on chrome and wins over anything drawn: a pushed screen has a round
back button on its title line and *nothing at all* in the top-right. `Share` on
a settled night has no destination either — `/share` is one person's share of one
rule, and the watcher link lives in Settings — so this is not a control being
withheld, it is a control with nowhere to point.

## The row: the whole night as a sentence

    Dana                                                        +$1,543
    game +$1,620 · food −$54 · piggy −$23

`resultFormula` in `packages/core` is what decides the terms, their order and
their names. `game` is what happened at the table with no deductions in it, at
the step the night settled at; `food` is their share of the bill netted with
whatever they paid at the counter, which is the one thing the line nets and the
trade it makes; `piggy` is their contribution, never merged into food; and there
is a term per kind after that, so a host's fee or a next-pot rule has somewhere
to be named. The words are the columns board's — `formulaWord` in `ruleText.ts`
— and a bill reads `food` there because the head of a column names what the money
bought, not which rule took it. The rule's own name is printed in full in the
block below.

**`Σ terms === net === nightScore().score`, always.** That is the assertion the
line stands on, and it is asserted twice: in `rev15-night.test.ts` for every
player of the canonical night, and in `ui-journeys.mjs` against the figures
actually on the phone, which is where a term could be dropped or a line drawn
under the wrong name.

**A single term is not drawn at all.** A loser nothing was charged to has
`game −$500` and a `−$500` beside it, and the line would be explaining the
figure with the figure. The hole (`Unaccounted`) is the same case.

**Nothing is behind a tap, and two layouts went to make that true.**
`E6-row-formula.md` (31 Aug) put the terms in a receipt the row opened into;
`E6-results-columns.md` (31 Aug) put them in four columns on the row and said
the two were alternatives rather than layers; both are gone, and the line is
what replaced them. It is the columns decomposition — same figures, same order,
same engine — as a sentence, which is what lets it hold a night the columns
could not fit. `resultColumns` and `columnsFit` stay in core and are drawn by
`/ledger`.

⚠ `receiptRows` does NOT stay for the reason this paragraph used to give — it
said *"`receiptRows` is still what the player card draws"*, and the player card
draws `workingRows`. It, `resultRows`, `playerDeductions` and `ruleCollector`
are exported, tested and called from nowhere in the app. See finding 4 in
`docs/game-outcomes-cjm.md`. **Open:** delete them, or write down which screen
is waiting for them.

**What no layout here has ever carried:** which rebuy, which spend, at what
time. That is an entry list, no board draws one, and `/ledger` is not it —
`/ledger` is `7e`, the same four terms in columns. **Open.**

## A row prints a score, not a balance

B27, and it now holds on every screen that prints a result rather than a
balance. Whoever holds the piggy bank ends the night with the room's money in
their pocket, and `finalPosition` includes it, correctly: the transfers have to
hand it over. A results row asks a different question, and `nightScore` divides
the engine's figure rather than restating it — `score + held` is `finalPosition`
exactly.

Four screens print the score: E6's rows, the player card's "Their night", My
stats, and E3's preview. **E4's `Night's net` is the fourth, and it was still
printing the balance until 1 September** — see B34. E3 joined them when the
preview stopped doing its own arithmetic and read `resultColumns` instead, and
it says so more plainly since 4 September, drawing the same `resultFormula` line
E6 does. Three places keep the balance and it is the same decision, not an
oversight: E4's transfer list, E7's *Who has paid* and the transfers themselves
all answer *what is this person owed when the room breaks up*.

**Where the float is named instead:** in the rule-outcome block, on the line for
the deduction it came from.

    Kitchen & drinks → Lena, Marek                                 $170
    Group piggy bank · held by Radka                                $126

`ruleOutcomes` in core supplies the rule's own name, its total and who was
credited; the component writes the sentence. The arrow is a repayment — those
two fronted the food and are out of pocket until the table pays them — and
`held by` is a float, which is the room's money in somebody's pocket. A rule
nobody has been credited for reads `held by the group`, which is the frame's own
string.

**The lines sum to `DEDUCTIONS` in the summary above**, which is why there is no
`TOTAL` row: the total is already on the screen, at the top, as one of the three
things the night was. `totalOffTable` is that figure and the block adds up
nothing.

⚠ **`held by {name}` is not drawn on any board.** No board takes the float off
the row, so no board has had to name the holder. The frame draws
`Kitty · held by the group`, which is this sentence for a rule with no
collector. It is flagged in `NightResult.tsx` rather than passed off as decided
copy.

## What E6 asks for that this build still does not have

**The player's view of the screen.** The cut says so itself: the admin view is
decided, and whether a player sees their own row emphasised, and where their own
settlement sits, is not drawn. `/watch` renders the admin body, which is the
honest reading — every row the same weight — and it keeps its own read-only
band, which is not a status pill and not E6's to remove. Its meta line is rev
15's, "kept by Marek · 4h 36m · 6 players · settled", and names somebody a
watcher cannot ask.

**Whether the deductions block is tappable through to the individual entries.**
It is not: it is totals, and it stays totals.

**The way through to E7.** The handoff removes the *Who has paid* row and says
payments "live on E7, reached from elsewhere". Elsewhere does not exist:
`/settled` is the only route into `/payments` in the app, and `ui-journeys.mjs`
reaches that screen by tapping it. It is marked `DELIBERATE DEVIATION` in
`settled.tsx`. **This is the one to answer first.** It is back to being a chip
above the footer as of 1 September: `Full ledger` now exists and has taken the
footer slot the frame draws it in.

**One colour, off by three units.** E6 gives the bright red as `#A93A2A`; the
token is `#B03A28`, which every earlier bright board drew and which is used in
every screen in the app. Changing it is an app-wide edit to `tokens.ts`, which
`CLAUDE.md` says runs alone and with nothing else in flight. The difference is
not visible at any size and it is not worth a session's worth of merge risk.

**The deductions qualifier is gone with the block that carried it.** The
handoff-E6 block drew `collected on the side` over a list of totals. The frame's
block is the outcome rows above and each one names its own destination, so there
is nothing left for a qualifier to say.

One more, smaller: the board puts the meta line at the page's own 22, and Chrome
A indents it 68 so it sits under the title rather than under the back button.
The indent is `chrome.metaIndent` and belongs to every pushed screen, so this
screen keeps it.

## E4 Settle up, as frame `4a` draws it

`design/handoff-E2/boards/Result Formula Options.dc.html`, frames `4a`–`4d`, cut
31 August. The rounding row and its sheet are `E2-rounding.md`'s and were built
with it; what changed on 1 September is everything else the frame settles.

**The piggy bank is a payee like anyone else** — `13-after-the-night.md`,
verbatim, and `4a` draws exactly that: the last row of the same list, the same
hairline, the same ink, `Karel → Piggy bank`. It used to be an object: a bone
wash, rounded, inset from the list, because it is the one row where the money
leaves the table for good. That is true and it is not this screen's business —
a room reading the list is handing over cash in order, and a row drawn as a
panel reads as a row that works differently. The bone belongs to E6's outcome
block, which is where it now is.

**`Night's net` is scores, and the transfers are balances.** The two lists
disagree on purpose and the disagreement is the point: the transfers move the
food money and the piggy bank as well as the winnings, and the nets are the
winnings after the food money and the piggy bank came off. Both come off the
engine — `resultFormula` for the one, `settle()`'s transfers for the other — and
neither is computed on the screen. See B34.

**The chips stay outlined.** `4a` fills them, `rgba(111,207,151,.13)` on a win
and `rgba(240,112,92,.12)` on a loss. B23 is why they are not: a chip carrying a
signed figure AND a coloured ground states one fact twice, and
`tinted-result-row` walks every signed figure in the app up to the row that
holds it. The outline keeps the chip an object without giving it an opinion.

**Share and Export are still absent.** `4a` draws them as a secondary pair under
`Close the session`. Neither has anywhere to go — `/share` is one person's share
of one rule, export is phase 4 in `05-build-order.md` — and two dead controls on
the last screen of the night, at the moment a host most needs to trust what they
are tapping, is worse than a footer with one button in it. **Open**, and it is
the same answer as `Full ledger` above: build the destination, then the button.

**The corner stays empty on this screen too.** `4a` draws a home glyph and
`Edit`; `09-navigation.md` wins. The step count `3 of 3` is text at the right of
the TITLE row, which is where the frame draws it and what `Screen`'s `trailing`
is for — text or a tag, never a control.
