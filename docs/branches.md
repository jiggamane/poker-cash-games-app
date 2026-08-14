# The branches, and what is still on them

**13 August 2026.** Until today this repository had no `main`. Every Claude Code
thread pushed to a branch of its own, all ten of them forked from the same
commit — `053b5f4`, 12 August — and none was ever merged. A plain `git clone`
therefore handed you 12 August, which is why the app on the phone kept looking
older than the work.

`main` now exists, built from `claude/new-session-mdr9ie`: the branch that has
the whole 13 August handoff applied (revs 7–14). **Set it as the default branch
on GitHub** — Settings → General → Default branch — or a fresh clone will still
land on the stale one.

## Working so the same thing cannot happen again

Every thread, at the start:

```bash
git fetch origin && git checkout -B <this thread's branch> origin/main
```

Every thread, at the end, once the checks pass:

```bash
git checkout main && git pull && git merge --no-ff <branch> && git push origin main
```

A session is told to develop on its own branch and not to push elsewhere
without permission, so the merge only happens if the prompt asks for it.

## What was recovered into main

| From | What | State |
| --- | --- | --- |
| `auth-not-working` | `packages/core/snapshot.ts`, `verify.ts` and their tests — a night's rules snapshot, and the re-derivation that proves a settled night still computes to what it was closed with | **In main.** Pure core, applied cleanly, 38 tests |
| `my-stats-graph-layout` | `src/lib/myStats.ts`, `nightsChart.ts` and their tests — period filtering, summaries and the chart's shape, all pure and clock-injected | **In main**, 22 tests. Not yet wired: `app/stats.tsx` still computes the same things inline and should adopt them |

## What is superseded, not missing

These files exist on the older branches and not on `main`, because `main`
replaced them rather than lost them. Do not merge them back.

| On the old branches | In main |
| --- | --- |
| `add-expense.tsx`, `expenses.tsx` | `bill.tsx`, `spend.tsx`, `bill-rules.tsx`, `kitty-rules.tsx` (rev 12, L1–L6) |
| `my-stats.tsx` | `stats.tsx` (rev 10, G4) |
| `new-session.tsx` | `new-night.tsx` (rev 13 — inherited rules, not a form) |
| `kitty.tsx` | `kitty-rules.tsx` |
| `PushHeader.tsx` | `Screen.tsx`, which is Chrome A itself |

## What is still stranded, and worth a session

All of it is on **`claude/auth-not-working-cz298o`**, which is the superset of
the backend work (`rev9-navigation` and `test-user-authorization` are subsets of
it). None of it is duplicated by anything in `main` — it is the server half of
the app, and `main` is the client half.

**Screens:** `claim.tsx` (X2, claiming your place from an invite), `invite.tsx`
(C3), `watch.tsx` (X1, the watcher's read-only view).

**Sync and identity:** `src/lib/sync.ts`, `syncRows.ts`, `pull.ts`,
`pullReads.ts`, `publish.ts`, `invites.ts`, `shareLink.ts`, `connection.ts`,
`supabaseConfig.ts` — with tests for most.

**Schema:** migrations `0004_watcher_access`, `0005_sync_contract_fixes`,
`0006_player_identity`, `0007_verification`, and SQL tests `02`–`05`.

**One collision to resolve first.** Both sides wrote a migration `0004`:
`main` has `0004_spends.sql` (the bill's covered-by shapes) and that branch has
`0004_watcher_access.sql`. Whichever moves has to be renumbered before either
tree can be applied in order.

**And one reconciliation.** Those three screens were written against the chrome
that rev 9 replaced — a labelled back row and a home glyph. They need rewrapping
in `Screen`/`Sheet` before they will look like the rest of the app.
