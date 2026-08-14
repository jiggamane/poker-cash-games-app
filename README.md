# The Poker Club — a cash-game ledger

One person (the **host**) records every movement of money in a home cash game as it
happens. Everyone else **watches the same list on their own phone**, read-only, over a
shared link. When the night ends the app counts the table, applies the group's money
rules, and states **who pays whom** in as few transfers as possible. Nights add up into
months, and months into a book the group can close and start again.

It is **not** a tournament app — no clock, no blinds, no eliminations. A session is a
start time, an end time, and a list of timestamped money events in between.

## Status

The foundations are in — the **database schema** (with its money invariants proved by
tests), the **shared money core**, and a working **Expo dev environment** — and the
**13 August handoff (revs 7–13) has been applied**:

| Rev | What landed |
| --- | --- |
| 9 | Navigation: no tab bar. A screen is a **push** (round back, empty top-right corner) or a **sheet** (grabber, close, swipe down). Every route is classified in `app/_layout.tsx`. |
| 8 · 11 | **Tonight** rebuilt as one list, one dock, one card per player. No tabs and no feed anywhere — entries live on the player they happened to. Ending a night is a 1.5s hold inside the table-admin drawer, and there is no tap path to it. |
| 12 | **The bill and the kitty**: L1–L6. A spend is covered by one player, several (whose amounts must sum), the kitty, or nobody yet. Nothing on those screens computes a share. |
| 10 | **Night results `1C`**, one screen for a night just closed and a night opened weeks later, every row carrying the whole calculation as tokens. Plus **My stats** and **My games**. |
| 13 | **The club section**, GR1–GR8, and the inheritance chain — *this game → last game → club default → app default* — with a night snapshotting its rules at birth. |

**Not built, and why:** leaving and deleting a club (rev 13 leaves four decisions open —
two admins or one, leaving with a debt, the club book, My stats vs My nights), and the
membership tiers, which the handoff says to skip for this round. The default bill split
is now *by size of win*, which **contradicts the worked night** in the handoff's
`04-money-math.md`; nothing was re-derived, and the contradiction is flagged in
`apps/mobile/app/bill-rules.tsx`.

```bash
npm install
npm run check        # typecheck + money tests
npm run db:verify    # apply the schema to a throwaway DB and assert the money rules
cd apps/mobile && npm start   # scan the QR code with Expo Go
```

## Working on this repo

`main` is the trunk. **Start every session from it and merge back into it** —
`docs/branches.md` says why in full, and lists what is still sitting on the
older branches. Until this week the repo had no `main` at all and ten threads
built in parallel on the same 12 August commit; that document is the map out of
it.

## Start here

- **[`docs/dev-setup.md`](docs/dev-setup.md)** — how to run everything, written for a
  non-developer. Start here if you want to build.
- **[`docs/build-plan.md`](docs/build-plan.md)** — the recommendation and build plan:
  platform, backend & data, realtime & offline, identity, money integrity, phasing, and
  cost/operations. Start here if you want to know why.
- **[`docs/settlement-rules.md`](docs/settlement-rules.md)** — exactly how the money rules
  are interpreted, and **six decisions that need a designer's confirmation**.
- **[`design/handoff-2026-08-13/`](design/handoff-2026-08-13/)** — **the current handoff.**
  Read its `CHANGELOG.md` first: it is cumulative to rev 13, and it names what each rev
  supersedes. `09-navigation.md` (push + sheet, no tab bar) and `08-tonight-home.md` (the
  live session) are the two files every screen depends on.
- **[`design/`](design/)** — the design references themselves (HTML prototypes, high
  fidelity). Open the `.dc.html` files in a browser with `support.js` beside them; pan
  horizontally. `Style Guide v2` has the colour, type, spacing and navigation rules; the
  boards inside the handoff folder are the current snapshot, and the loose ones at the top
  level are the earlier direction, kept only for flows the new style hasn't reached (the
  book, the watcher's view).

## Layout

```
apps/mobile/        The Expo app (what people install)
packages/core/      Money + settlement logic — shared by app and server, written once
supabase/
  migrations/       The database schema
  test/             Assertions that the money invariants actually hold
design/             The original design references
docs/               The plan and the setup guide
```

## The one-paragraph summary of the plan

Build it with **React Native + Expo in TypeScript** — real native apps on iOS and Android from
one codebase, where everyone installs the app and cloud builds (EAS) mean no Mac or Xcode is
needed and a money bug can be fixed over-the-air the same night. Store the money in
**Postgres (via Supabase)** as an **append-only, integer-only ledger** where corrections are
new rows, never edits. Because there is exactly **one writer per session**, offline sync is a
simple local-first outbox — **no CRDT needed** — while readers get realtime pushes with a
polling fallback. The **host is the only account**; players are just names, and watchers open a
deep link whose token *is* their credential, so they never sign up. Settlement is a **pure,
deterministic, versioned function** computed live on the client and **re-computed and frozen on
the server** at close — and because app and server are both TypeScript, that algorithm is
**written once and shared by both**, so the night's math is reproducible and auditable. Ship a
v1 one group can use this month; leave out multi-group, real player accounts, and
notifications. It runs for roughly **$30–55/mo at 100 groups** and **$300–800/mo at 10,000** —
the same data model, a bigger operational tier.
