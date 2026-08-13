# The Poker Club — a cash-game ledger

One person (the **host**) records every movement of money in a home cash game as it
happens. Everyone else **watches the same list on their own phone**, read-only, over a
shared link. When the night ends the app counts the table, applies the group's money
rules, and states **who pays whom** in as few transfers as possible. Nights add up into
months, and months into a book the group can close and start again.

It is **not** a tournament app — no clock, no blinds, no eliminations. A session is a
start time, an end time, and a list of timestamped money events in between.

## Status

The plan is decided and the foundations are in: the **database schema** (with its money
invariants proved by tests), the **shared money core**, and a working **Expo dev
environment**. The designed screens are next.

```bash
npm install
npm run check        # typecheck + money tests
npm run db:verify    # apply the schema to a throwaway DB and assert the money rules
cd apps/mobile && npm start   # scan the QR code with Expo Go
```

## Start here

- **[`docs/dev-setup.md`](docs/dev-setup.md)** — how to run everything, written for a
  non-developer. Start here if you want to build.
- **[`docs/build-plan.md`](docs/build-plan.md)** — the recommendation and build plan:
  platform, backend & data, realtime & offline, identity, money integrity, phasing, and
  cost/operations. Start here if you want to know why.
- **[`docs/settlement-rules.md`](docs/settlement-rules.md)** — exactly how the money rules
  are interpreted, and **six decisions that need a designer's confirmation**.
- **[`docs/storage-and-sync.md`](docs/storage-and-sync.md)** — where a night is stored and
  when, what the phone keeps, and exactly what still works with no signal. Read it before
  touching sync or the close flow.
- **[`docs/auth-test-period.md`](docs/auth-test-period.md)** — who gets in while the app is
  being tested: invite-only sign-in, how a watcher's link actually works, and the dashboard
  steps that make it run. Read it before the first night with real people.
- **[`design/handoff-2026-08-13/`](design/handoff-2026-08-13/)** — the current design
  handoff, and the newest thing in the repo. Read its `CHANGELOG.md` first: revs 7, 8 and
  9 are all **pending**. Rev 8 rebuilds the live session screen as one list with no tabs
  and no feed (`08-tonight-home.md`); rev 9 settles navigation — no tab bar, one push
  chrome, one sheet chrome, and every screen in the app classified as one or the other
  (`09-navigation.md`).
- **[`docs/screen-specs/`](docs/screen-specs/)** — every drawn screen's exact
  measurements, extracted from those boards by `python3 scripts/extract-design.py`. Build
  against these rather than a remembered token.
- **[`design/`](design/)** — the design references themselves (HTML prototypes, high
  fidelity). Open the `.dc.html` files in a browser with `support.js` beside them; pan
  horizontally. `Style Guide v2` has the colour, type, spacing and navigation rules;
  `Cash Game v2` and `Cash Game Board` are the earlier direction, kept only for flows the
  new style hasn't reached (the book, the watcher's view).

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
