# The Poker Club

A home cash game's ledger: the host records every movement of money, the app
counts the table at the end, applies the group's rules, and says who pays whom.
Not a tournament app — no clock, no blinds, no eliminations.

## Branching — read this before the first commit

**`main` is the trunk.** This repo spent a week without one: ten threads each
built on their own branch off the same commit, none merged, and the default
branch stayed at a snapshot from days earlier. `docs/branches.md` is the record
of that and of what is still stranded.

So, every session:

```bash
# at the start — build on what shipped, not on an old snapshot
git fetch origin && git checkout -B <this session's branch> origin/main

# at the end, once `npm run check` passes
git checkout main && git pull && git merge --no-ff <branch> && git push origin main
```

Then say which commit is on `main`. Resolve conflicts rather than leaving them,
and say what was resolved. **Never leave the only copy of the work on a side
branch** — that is the failure this file exists to prevent.

**That merge is pre-authorised. Do not ask for permission to do it.** The owner
has given standing consent for this repository, and it holds for every session
and every task in a session — you do not need it repeated, and asking again is
itself the problem: work sitting on a branch waiting for someone to say yes is
exactly the week this file was written about. A session prompt that says to
develop on a named branch is telling you where to *work*, not withholding the
merge.

Two things still hold, and they are the whole of the condition:

- **`npm run check` passes first**, and `npm run check:ui` too if you touched
  `apps/mobile`, and `npm run db:verify` too if you touched `supabase/`. A red
  merge is worse than a stranded branch.
- **Push the branch as well as `main`.** It costs nothing and it is what makes
  the work recoverable if a merge ever goes wrong.

Merge anything you would have shipped: finished work, a fix, a doc. If a change
is genuinely a question rather than an answer — a spike, an approach you would
not defend — say so and leave it on the branch. That judgement is yours, and it
is the only case where the merge waits.

### Two sessions must not open the same file

The stranded-branch problem is solved. This is the one that replaced it, and it
is why fixes have been disappearing.

On 20 August eight sessions ran in parallel off the same commit. Three of them
edited `deductions.tsx`. Two each edited `log.tsx`, `session.tsx`,
`money-rules.tsx`, `new-night.tsx`, `seat.tsx` and `player.tsx`. Every one of
those merges then had to be adjudicated by hand — whose version of the screen
survives — and the merge commit for `38d02e9` is three paragraphs of exactly
that.

**A conflict resolution is a coin toss between two correct fixes.** Branch B
forked before branch A's fix landed. B wins its region of the file, and A's fix
is gone. Nothing broke, nobody was careless, the tests still pass, and the bug is
back on the phone. That is the whole mechanism, and it will keep producing "I
fixed that last week" for as long as parallel sessions share files.

So:

- **Parallel sessions are fine only on disjoint files.** Decide the split before
  starting them, by screen — one session owns `deductions.tsx`, and no other
  session opens it that day.
- **A shared component is a shared file.** `Sheet.tsx`, `Button.tsx`,
  `RuleList.tsx`, `tokens.ts` are touched from everywhere. Anything app-wide —
  a sweep over every sheet, a token change — runs **alone**, with nothing else
  in flight.
- **When in doubt, run them one after another.** Two sessions in sequence cost
  an hour. One silently reverted fix costs the next three sessions, and it is
  found by scanning the app on a phone rather than by a red check.

If you do hit a conflict in a screen, `docs/bugs.md` is the thing to read before
resolving it: an entry there tells you that the side you are about to discard
was a deliberate fix for a named fault, which the diff alone will not.

## Checks

```bash
npm run check      # typecheck + the money tests. Both must pass before a merge.
npm run check:ui   # the screens: every route against the handoff's rules, all 21
                   # sheets across six devices, and a big night played through
                   # checking no figure is cut off. Run it before a merge if you
                   # touched apps/mobile. Needs Playwright.
npm run db:verify  # applies every migration to a throwaway Postgres and asserts
                   # the money invariants. Run it if you touched supabase/.
```

`check` is seconds and is for every commit. `check:ui` builds the app and drives
a browser, so it is a minute or two and is for the merge. They are deliberately
two names: folding them into one would make the fast one slow enough to start
being skipped, and the fast one is the one that runs constantly.

**A screen bug that neither of them can see is not finished being fixed.** The
tools existed and ran only when somebody remembered, and twenty-one sheets were
wrong on every phone from the first day until the 21st. Write the bug in
`docs/bugs.md` before fixing it, and name the check that now goes red if it
comes back. `docs/screens.md` is the ledger of which screens are watched by
what, and which have been held against their boards.

## What the design says, and where

`design/handoff-rev18/` is the current handoff — rev 18, cut 19 August — and it
wins over anything older, `design/handoff-2026-08-13/` (rev 14) included. Start
at its `START-HERE.md`, then `docs/CHANGELOG.md`, which is cumulative and names
what each revision supersedes.

**Three partial cuts sit on top of it**, each superseding rev 18 only where it
speaks and nowhere else. Everything rev 18 says about every other screen still
stands. Read them newest first:

- **`design/handoff-count-up-to-settled/`, cut 1 September — start here.** The
  ending flow as one thing: E2 counts, E4 agrees the transfers, E6 reads the
  night back. It decides two things and carries the other two docs forward
  unchanged. **E6's row states the night's terms under the name** — `game
  +$1,620 · food −$54 · piggy −$23` — with `7e`, the four-column table, kept
  behind *Full ledger*, which is `/ledger`. **Settled players are grouped, muted
  and signed** on Tonight and on E2 alike, because the right-hand column changes
  meaning between an active row and a settled one and nothing else on the row
  said so. Its `docs/03` and `docs/04` are byte-identical to the E2 cut's two
  docs; where it and an older cut disagree about a screen it speaks on, this one
  wins.
- **`design/handoff-E6/`, cut 30–31 August, and the rev-18 E6 frame on top of
  it.** The settled night, rebuilt from the frame the owner pointed at: the
  three-figure summary, the formula line, the rule outcomes at the foot. Its
  columns layout is `/ledger` now; its receipt rows are still what the player
  card draws. `docs/screens.md` records where this and the 1 September cut
  disagree — one place, about a term of `$0` — and that it is unanswered.
- **`design/handoff-E2/`, cut 30–31 August.** The status block on E2 Count up,
  which it replaces with the whole equation — bought in against cashed out plus
  counted — and the rounding step, which E2 owns. Its logic doc is the
  behaviour, its board is the layout, and layout **2a** with colour option
  **2f** is the one that was built.

`docs/screens.md` records, per screen, what each cut left open and what was
decided against a doc rather than by one — read it before reopening any of
these three screens.

**Where a board and a spec disagree, the spec wins on behaviour and the board
wins on layout.** Three files govern every screen:

- **`docs/09-navigation.md`** — a screen is either PUSHED (Chrome A: round back
  button, and *nothing at all* in the top-right corner) or a SHEET (Chrome B:
  grabber, close, swipe down). If it ends with a Save, an Add or a confirm it is
  a sheet; if it is a place you can stay in it is a push. The two vocabularies
  must never mix: which one is on screen is the only thing telling a person
  whether to swipe or tap back. A multi-step flow REPLACES ONE SHEET'S CONTENT
  and keeps one close; a sheet never pushes.
- **`docs/15-screen-geometry.md`** — the frame, the sheet object, the gaps and
  the surfaces. Everything else assumes it.
- **`docs/08-tonight-home.md`** — the live session screen, in full.

`boards/` holds the six boards, and they are the pixel source: every dimension,
weight and colour is inline on the element. Copy them; do not re-derive them.
`boards/Journey Map 5 - Flow logic.dc.html` is the journey map — read it before
wiring any navigation. `reference/screens-*.html` are the older per-set build
references and lose to the boards where they disagree.

**Copy is final.** Every label was written deliberately, several of them to
defuse an argument at a table. If a string is missing for a state that is not
drawn, flag it rather than inventing one.

## Money

`packages/core` is the only place arithmetic happens. A screen that adds up its
own column is a second, untested implementation of the same sum — read the
figure off the engine instead, and if it looks wrong, fix the engine, which has
tests. `canonical-night.test.ts` asserts the handoff's canonical night to the
dollar, and the app is seeded with that same night so a screen can be held
against the frame it was drawn from.

Amounts are integers in minor units. `Money` refuses anything fractional.

## The app

Expo SDK 54, pinned to what Expo Go supports — see `apps/mobile/AGENTS.md`
before touching a dependency. The ledger is append-only: corrections and voids
are new rows, never edits.
