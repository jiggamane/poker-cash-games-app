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

- **`npm run check` passes first**, and `npm run db:verify` too if you touched
  `supabase/`. A red merge is worse than a stranded branch.
- **Push the branch as well as `main`.** It costs nothing and it is what makes
  the work recoverable if a merge ever goes wrong.

Merge anything you would have shipped: finished work, a fix, a doc. If a change
is genuinely a question rather than an answer — a spike, an approach you would
not defend — say so and leave it on the branch. That judgement is yours, and it
is the only case where the merge waits.

## Checks

```bash
npm run check      # typecheck + the money tests. Both must pass before a merge.
npm run db:verify  # applies every migration to a throwaway Postgres and asserts
                   # the money invariants. Run it if you touched supabase/.
```

## What the design says, and where

`design/handoff-2026-08-13/` is the current handoff and it wins over anything
older. Read its `CHANGELOG.md` first — it is cumulative and each entry names
what it supersedes. Two files govern every screen:

- **`09-navigation.md`** — a screen is either PUSHED (Chrome A: round back
  button, and *nothing at all* in the top-right corner) or a SHEET (Chrome B:
  grabber, close, swipe down). If it ends with a Save, an Add or a confirm it is
  a sheet; if it is a place you can stay in it is a push. The two vocabularies
  must never mix: which one is on screen is the only thing telling a person
  whether to swipe or tap back.
- **`08-tonight-home.md`** — the live session screen, in full.

The `screens-*.html` files in that folder are the pixel source: every dimension,
weight and colour is inline on the element. Copy them; do not re-derive them.

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
