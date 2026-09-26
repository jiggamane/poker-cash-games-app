# The branches, and what is still on them

**13 August 2026, updated 14 August.** Until the 13th this repository had no
`main`. Every Claude Code
thread pushed to a branch of its own, all ten of them forked from the same
commit — `053b5f4`, 12 August — and none was ever merged. A plain `git clone`
therefore handed you 12 August, which is why the app on the phone kept looking
older than the work.

`main` now exists, built from `claude/new-session-mdr9ie`: the branch that has
the whole 13 August handoff applied (revs 7–14). It is the default branch on
GitHub, so a fresh clone lands on it.

**On 14 August every branch was emptied into it**, file by file rather than by
merge — see "What was recovered" below. Nothing of value is left on a side
branch; the ten of them are now history, not storage.

## Working so the same thing cannot happen again

Every thread, at the start:

```bash
git fetch origin && git checkout -B <this thread's branch> origin/main
```

Every thread, at the end, once the checks pass:

```bash
git checkout main && git pull && git merge --no-ff <branch> && git push origin main
```

**The merge is pre-authorised — a session must not ask for it.** This used to
read "the merge only happens if the prompt asks for it", which was the wrong
rule and produced the wrong outcome twice: a session finished its work, pushed a
branch, and waited to be told to do the obvious last step. Being told to develop
on a named branch says where to work; it has never meant the trunk is off
limits. The owner's consent is standing and covers every session.

What the merge waits for is `npm run check` — and `npm run db:verify` if
`supabase/` was touched — and nothing else. See `CLAUDE.md` for the one
exception: work you would not defend does not get merged, and you say so.

## What was recovered into main

| From | What | State |
| --- | --- | --- |
| `auth-not-working` | `packages/core/snapshot.ts`, `verify.ts` and their tests — a night's rules snapshot, and the re-derivation that proves a settled night still computes to what it was closed with | **In main**, 38 tests |
| `my-stats-graph-layout` | `src/lib/myStats.ts`, `nightsChart.ts` and their tests | **In main**, 22 tests, and `stats.tsx` now reads its figures off them instead of adding up its own |
| `my-stats-graph-layout` | `NightsChart.tsx`, `sampleHistory.ts` | **In main.** The chart has one scale both sides of zero. The history was a seed and was to go when sessions are real; it went on 15 September — B77 — because the phone had been able to hold every night on the server since `importNights` and nothing had marked the moment |
| `auth-not-working` | the whole server half — migrations, SQL suites, `src/lib` sync and identity, `scripts/audit.ts`, four docs | **In main.** See below |
| `iap-pricing-model` | `docs/pricing-model.md` | **In main** |
| `public-boards-github` | `docs/*.html`, `PUBLISHING.md`, `.nojekyll` — the boards as a static site | **In main.** A rev-13 snapshot; regenerate before calling it current |

### How the server half came across

Not by merging. `git merge origin/claude/auth-not-working-cz298o` conflicts in
**32 files**, and every one of them is a screen or component rebuilt during
revs 9–14 — that branch predates the push/sheet split, so taking its side
anywhere would quietly undo a week of design review. The parts that do not
collide were transplanted instead:

- **Migrations renumbered by one.** Both sides wrote a `0004`. `main` had
  `0004_spends.sql`, that branch had `0004_watcher_access.sql`; the watcher one
  and its three successors became `0005`–`0008`. They create disjoint objects,
  so the order was free. Every reference in the docs and comments moved with
  them.
- **`importNights` was rewritten, not copied.** That branch's `nightStore.ts`
  is 777 lines adrift of main's. The night table gained `stakes`,
  `default_buyin` and `ended_at` through the additive `ALTER` the file already
  uses, plus a `night_settlement` table.
- **`01_invariants.sql` kept main's `covered_by` assertions**, which that branch
  predates. Only the rule-order block changed, because `0006` drops that
  uniqueness deliberately: `money_rule` is per book while rules are per night,
  and the unique index was refusing an ordinary edit, which halted the outbox,
  which silently stopped every later night from reaching the server.
- **The outbox is now a queue of operations, not of entries.** A night is not
  only its money — a session has to exist before an entry can point at it.

`npm run check`: 273 tests. `npm run db:verify`: eight migrations, five suites.

## What is superseded, not missing

These files exist on the older branches and not on `main`, because `main`
replaced them rather than lost them. Do not merge them back.

| On the old branches | In main |
| --- | --- |
| `add-expense.tsx`, `expenses.tsx` | `bill.tsx`, `spend.tsx`, `bill-rules.tsx`, `piggy-bank-rules.tsx` (rev 12, L1–L6) |
| `my-stats.tsx` | `stats.tsx` (rev 10, G4) |
| `new-session.tsx` | `new-night.tsx` (rev 13 — inherited rules, not a form) |
| `kitty.tsx`, `kitty-rules.tsx` | `piggy-bank-rules.tsx` — the copy says *piggy bank* throughout, and the file moved with it |
| `PushHeader.tsx` | `Screen.tsx`, which is Chrome A itself |

## 16 September: the last two pre-`main` branches, checked and deleted

Two branches were still on the remote with no common ancestor with `main` at
all — `git merge-base` returns nothing for either. They are from the generation
this file opens with: both rooted at `9c11d2d`, 10 August, which is the root
`main` does not share. **They held nothing `main` lacks, and they are deleted.**

| Branch | Tip | | Ahead | Behind | A merge would conflict in |
| --- | --- | --- | --- | --- | --- |
| `claude/ui-test-sizing-fixes-3j83pu` | `2e687a9` | 16 Aug | 71 | 159 | **107 files** |
| `claude/updates-x4rrol` | `aa564cd` | 30 Aug | 168 | 159 | **115 files** |

Full SHAs, so this is reversible for as long as GitHub keeps the objects —
`git push origin <sha>:refs/heads/<name>` puts either back:

```
2e687a9bb0035603255d7d07062cefd863dee88b  claude/ui-test-sizing-fixes-3j83pu
aa564cdc508cc194a5e5e51140a43056b40e86e6  claude/updates-x4rrol
```

**What was checked before deleting**, because "probably superseded" is not a
reason to throw work away:

- **The trial merges were actually run**, in a throwaway worktree, with
  `--allow-unrelated-histories`. 107 and 115 conflicted files, among them
  `CLAUDE.md`, `AGENTS.md`, `_layout.tsx`, `app.config.js` and most of the
  screens. That is the coin toss the 22 August section below is about, at a
  hundred times the scale: every wrong pick between an August snapshot and a
  month of design review silently reverts a fix, and nothing goes red.
- **Five files exist on them and not on `main`**, and all five are replaced
  rather than lost: `kitty-rules.tsx` (now `piggy-bank-rules.tsx`), `stands.tsx`
  — E2b, *where everyone stands*, folded into the count-up and session-views
  cuts — and `sampleHistory.ts`, which is the invented history B79 deleted the
  day before. A merge would have put that one back.
- **Every bug entry on `updates-x4rrol` is already in `main`**: B1–B22, sixteen
  entries, all present in a log that is now at B80 with 76.
  `ui-test-sizing-fixes` predates `docs/bugs.md` entirely.
- **Three of their fixes were read rather than taken on trust**, since a bug log
  says what somebody wrote down, not what shipped: `HOLD_MS = 1000` in
  `HoldButton.tsx` is byte-identical on both sides, `setPaid(from, to, paid:
  boolean)` takes the tick both ways, and the Count-up equation work is in
  `design/handoff-E2/` with `countUpBlock.ts` behind it.

The rule this confirms is the one at the top of this file, and it is worth
stating as a rule rather than as an incident: **a branch that predates `main`'s
root is not storage and cannot be merged.** Anything wanted off one is
transplanted file by file, the way the server half was on 14 August. Check the
merge base before planning a merge — no merge base means no merge.

## ~~What is still stranded~~ Nothing is stranded

**Empty as of 16 September, and left here as the record rather than deleted.**

It read: three screens, all on `claude/auth-not-working-cz298o` —
**`claim.tsx`** (X2, claiming your place from an invite), **`invite.tsx`** (C3)
and **`watch.tsx`** (X1, the watcher's read-only view). They were left behind on
purpose, because all three were drawn against the chrome rev 9 replaced — a
labelled back row and a home glyph — so they could not be copied across and had
to be rebuilt in `Screen`/`Sheet`, which is a design job and not a transplant.

**All three were rebuilt on 3 September, in `54e4dba`**, and are 475, 538 and
498 lines of `Screen` and `Sheet` in `main` today. The entry went on saying they
were stranded for a fortnight after they were not, which is its own small
version of the fault this file is about: a record that is wrong in the
reassuring direction sends the next session hunting on a dead branch for work
that is already under their cursor. If you empty this section again, say so in
it on the same day.

---

## 22 August: the second failure mode

The stranded-branch problem above is fixed — every session merges to `main` now,
and nothing has been left behind since the 14th. This is the one that took its
place, recorded here because it produced the same symptom from the opposite
cause: **work that was done, and then was not there any more.**

Before, the fix was on a branch nobody merged. Now the fix is merged and then
overwritten by the next merge.

On 20 August eight sessions ran off the same commit. Three edited
`deductions.tsx`; six other screens were opened by two sessions each. Every one
of those merges had to be resolved by hand, and each resolution picks a winner
per region of the file. A branch that forked before another branch's fix landed
wins its region and takes the fix out with it. Nothing goes red — the tests are
all in `packages/core` and none of them has ever seen a screen.

The rule is now in `CLAUDE.md` under *Two sessions must not open the same file*:
parallel sessions only on disjoint files, app-wide sweeps run alone.

The other half is that screens are now checked. `npm run check:ui` runs the
three tools that existed and never ran — see `docs/screens.md` for what each one
covers, and `docs/bugs.md` for the rule that every fix names the check that locks
it.

---

## 26 September: the parked branch came home

`claude/multi-admin-game-access-cpwbpw` held the pass-the-book work (0016,
0017) that `main` reverted on the 23rd to be redesigned. The redesign —
`design/handoff-game-admin/` — was built on top of that branch the day the
boards came back, on `claude/handoff-conflict-check-5m1wjr`, and merged to
`main` with it. Nothing is parked. The session that rebuilt the branch that
morning had finished and pushed before this one started; the two did not open
a file at the same time, which was checked before the first edit and is why
this note exists.
