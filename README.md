# The Poker Club — a cash-game ledger

One person (the **host**) records every movement of money in a home cash game as it
happens. Everyone else **watches the same list on their own phone**, read-only, over a
shared link. When the night ends the app counts the table, applies the group's money
rules, and states **who pays whom** in as few transfers as possible. Nights add up into
months, and months into a book the group can close and start again.

It is **not** a tournament app — no clock, no blinds, no eliminations. A session is a
start time, an end time, and a list of timestamped money events in between.

## Status

This repository currently holds the **design handoff** and the **technical
recommendation** that responds to it. No application code has been written yet — the
handoff explicitly asked for a platform/infrastructure decision and a build plan first.

## Start here

- **[`docs/build-plan.md`](docs/build-plan.md)** — the recommendation and build plan:
  platform, backend & data, realtime & offline, identity, money integrity, phasing, and
  cost/operations. Read this first.
- **[`docs/pricing-model.md`](docs/pricing-model.md)** — how it makes money: tiers, the
  host/player split, price points, trial, the alternatives considered, and what billing
  adds to the schema.
- **[`design/`](design/)** — the original design references (HTML prototypes, high
  fidelity). Open the `.dc.html` files in a browser with `support.js` beside them; pan
  horizontally. `Style Guide v2` has the colour, type, spacing and navigation rules;
  `Cash Game v2` has the current screens (newest at the top); `Cash Game Board` is the
  earlier direction, kept only for flows the new style hasn't reached (the book, the
  watcher's view).

## The one-paragraph summary of the plan

Build it as an **installable web app (PWA)** so the host gets a home-screen, offline-capable
app while watchers open a link on any phone with no install and no sign-up. Store the money
in **Postgres (via Supabase)** as an **append-only, integer-only ledger** where corrections
are new rows, never edits. Because there is exactly **one writer per session**, offline sync
is a simple local-first outbox — **no CRDT needed** — while readers get realtime pushes with a
polling fallback. The **host is the only account**; players are names, watchers are links.
Settlement is a **pure, deterministic, versioned function** computed live on the client and
**re-computed and frozen on the server** at close, so the night's math is reproducible and
auditable. Ship a v1 one group can use this month; leave out multi-group, real player
accounts, notifications, and native. It runs for roughly **$0–45/mo at 100 groups** and
**$300–800/mo at 10,000** — the same data model, a bigger operational tier.
