# The Poker Club — Technical Infrastructure Recommendation & Build Plan

*A response to the design handoff. This is a build plan and a set of decisions, not UI code.*

---

## TL;DR — the seven decisions

| # | Question | Recommendation (the default I'd pick) |
|---|----------|----------------------------------------|
| 1 | **Platform** | **React Native, built with Expo, in TypeScript.** Real native apps on iOS *and* Android from one codebase. Everyone — host and watchers — installs the app. Cloud builds (EAS) mean no Mac/Xcode is needed; over-the-air updates mean a money bug can be fixed tonight without App Store review. |
| 2 | **Backend & data** | **Supabase** (managed Postgres + Realtime + Auth + Row-Level Security). One relational database with an **append-only ledger**, money stored as **integers**, corrections stored as new rows. |
| 3 | **Realtime & offline** | **Local-first single-writer.** The host writes to a durable on-device outbox first (instant, offline-proof), then syncs. Readers get pushes over websockets with a polling fallback. Because there is exactly **one writer per session**, no CRDT is needed. |
| 4 | **Identity** | **Host is the only account.** Players are just names the host types. Watchers open an unguessable share link — read-only, no sign-up. "Claiming your name" is deliberately a v2 feature. |
| 5 | **Money integrity** | **Integer-only, append-only, deterministic.** Settlement is a **pure function** of the ledger + rules; computed on the client for instant feedback and **re-computed and frozen on the server** at close as the canonical, auditable record. Rounding rule is explicit and versioned. |
| 6 | **Phasing** | **v1 = one group can run a real night this month.** Leave out multi-group, real player accounts, notifications, and native. |
| 7 | **Cost & ops** | **~$0–45/mo at 100 groups. ~$300–800/mo at 10,000.** The data model doesn't change between them; the operational tier (connection pooling, read replica, realtime capacity, monitoring) does. |

Two constraints do most of the work. From the handoff: **"the host is the one device that writes"** — which kills the hard distributed-systems problem, because with a single writer there is nothing to merge. And from the product owner, revising the handoff: **watchers are expected to install the app too**, rather than opening a link as strangers. That second point moves the platform answer from a web app to real native apps, but changes nothing below it — the data model, sync model, and money design are identical either way.

A third constraint shapes *how* this gets built rather than what it is: **the app is being built by a non-developer working with Claude Code.** That is a real engineering input, not a footnote. It favours the stack with the largest training corpus, the shortest path from code to a phone, and the fewest failure modes that can only be cleared by a human developer staring at a native build error. It is the single biggest reason for the Expo recommendation, and it is recorded in §1.

---

## 1. Platform

### Recommendation: React Native, built with Expo, in TypeScript.

Since installing is acceptable — even preferred — for watchers as well as the host, the zero-install web link stops being a deciding advantage and real native apps become the better product. The remaining question is which native path.

**Not iOS-native.** The design is drawn in iOS conventions, but the *audience* is not iOS-only: a home game is a mixed room of iPhones and Androids. A Swift app either excludes half the table or forces a second, separate Android build. Cross-platform is not a compromise here, it is the requirement.

That narrows it to **Flutter** or **React Native**. And one clarification collapses part of the question: **Expo is not an alternative to React Native — it is the standard toolchain *for* React Native**, and React Native's own documentation recommends it for new apps. "React Native + Expo" versus "React Native" is not framework-versus-framework; it is React Native with the build infrastructure managed, versus React Native where you maintain Xcode projects, Gradle, CocoaPods, native linking, and signing certificates by hand.

#### Why Expo over Flutter

Flutter has genuine advantages and they are the ones a solo builder feels: far fewer dependency conflicts, unusually legible error messages, and calmer year-over-year churn. If the only criterion were steady-state maintenance in isolation, it would be a close call or a Flutter win.

Three factors decide it the other way for this project:

**1. The money math gets written once.** This is the decisive one. §5 requires the settlement calculation to run on the client (instant feedback) *and* be re-computed on the server (canonical, auditable) — and the two must agree exactly. With React Native the app is TypeScript and the Supabase edge functions are TypeScript, so the settlement algorithm is **one file, one implementation, one test suite, imported by both**. With Flutter the client is Dart and the server is not, which forces the safety-critical algorithm to either exist twice in two languages that must never drift, or be server-only (losing the live preview). Duplicating the money logic is the worst thing this architecture could be asked to do, and Flutter structurally invites it.

**2. Shipping without a native toolchain.** Expo covers the whole path from laptop to store with no Xcode, no Android Studio, and no Mac: **Expo Go** previews the app on a real phone by scanning a QR code, **EAS Build** compiles iOS and Android in the cloud and manages signing, **EAS Submit** uploads to the stores, and **EAS Update** pushes JavaScript fixes over-the-air without App Store review. On the Flutter path, producing an iOS build without a Mac is a CI yak-shave. For a money app, OTA updates matter on their own terms: a wrong settlement discovered on poker night is fixable in minutes rather than after a review cycle.

**3. Agent fluency.** TypeScript/React is the most heavily represented stack in the training data of the tool actually writing this code, so generated code is more likely to be correct and current, and there is far more community material to feed back when it is not.

#### Why "built with Claude Code, no developer" reinforces this

Every piece of infrastructure Expo removes is a failure that would otherwise land on someone with no developer to call — and, critically, these are *environmental* failures (a CocoaPods version conflict, a broken provisioning profile, a Gradle mismatch) that an AI agent cannot see or reproduce, unlike application bugs it can read and fix. Expo moves that entire class of problem off the local machine and into a managed service. `expo install` pinning packages to versions verified against the SDK removes most of React Native's historic dependency hell, which is the other place solo builders get stranded.

**One guardrail: stay on the managed path.** Expo's advantages come from not hand-maintaining native projects. Adding arbitrary native modules that force a prebuild/eject re-inherits React Native's old pain with nobody around to absorb it. Everything v1 needs — ledger, realtime, auth, push, secure storage — is covered by the Expo SDK plus Supabase, so there is no reason to leave it. If a future need genuinely requires custom native code, config plugins and development builds handle it without the old one-way "eject."

**Note on the old objection.** "Use Expo and you'll hit a wall and have to eject" was true before roughly 2021. Config plugins, prebuild, and development builds have since removed that ceiling; it is no longer a reason to choose bare React Native.

**Stack:** React Native + Expo (managed) · TypeScript · Expo Router for navigation · Supabase JS client · shared TypeScript core package for money and settlement (imported by both app and edge functions).

**Pick Flutter instead only if** the team is comfortable in Dart and is willing to run settlement server-only or maintain it twice, in exchange for lower churn. Absent that, the shared-TypeScript argument wins.

**Unsettled → defaults:** the design is drawn at 402 × 874 pt (iPhone). Default: treat that as the reference width, build responsive, verify on a mid-size Android, and do not chase tablet layouts in v1. Expo can also emit a web build — keep that available as an occasional watcher fallback, but do not treat web as a supported target in v1.

---

## 2. Backend and data

### Recommendation: Supabase — managed Postgres, with Realtime, Auth, and Row-Level Security in one service.

Money correctness is the top priority, and a relational database with real transactions, integer types, constraints, and auditable SQL is the correct tool for money. Supabase gives that (it *is* Postgres) plus the three things this app needs bundled around it — realtime subscriptions, auth, and row-level authorization — so v1 needs no bespoke server.

**Why not the alternatives**

- **Firebase / Firestore:** excellent realtime and offline SDKs, but it's a document store. Money math wants relational integrity, integer columns, server-side transactions, and the ability to *reason about and re-run* a calculation in SQL. Firestore pushes that logic into clients and makes the audit story weaker. The one thing it's great at — offline sync — we get more simply via a single-writer outbox (§3).
- **Roll-your-own Node/Postgres:** maximum control, but you rebuild auth, realtime, and authorization by hand and carry the ops. Not justified for v1; the moment it *is* justified, Supabase is still Postgres underneath, so you can drop to raw SQL/edge functions without migrating data.
- **Supabase:** Postgres correctness + batteries included + a clean path to more control later. Default choice.

### Schema (the shape, not the final DDL)

Money is **integer whole units** everywhere (`BIGINT`), never a float, never cents (the design is explicit: whole units, no cents). The ledger is **append-only**: rows are inserted and never updated or deleted; a correction is a *new* row that points at the one it corrects.

```
book            id, group_name, currency_symbol, status(open|closed),
                opened_at, closed_at, host_user_id

session         id, book_id, stakes, default_buyin:int, seat_count,
                started_at, ended_at, status(setup|live|counting|settled),
                share_token            -- unguessable, grants read-only

player          id, book_id, display_name, claimed_by_user_id(null)
                -- a name, not an account. Lives on the book, reused across sessions.

session_seat    id, session_id, player_id, seated_at, left_at(null)
                -- who is at *this* table; cash-out sets left_at

ledger_entry    id(uuid, client-generated), session_id, seq:int,
                type(buyin|rebuy|cashout|expense|correction|void),
                player_id(null for expense payer semantics),
                payer_id(null),                -- expenses have a payer
                amount:int,                    -- always integer whole units
                note(null),
                occurred_at,                   -- back-dateable by the host
                created_at,                    -- real wall-clock insert time
                corrects_entry_id(null),       -- set on correction/void
                created_by_user_id
                -- IMMUTABLE. Never UPDATE/DELETE. Corrections are new rows.

money_rule      id, book_id, name, active,
                amount_kind(percent|fixed), amount:int,
                basis(gross|net_after_others),
                charge(winners_only|everyone_flat),
                destination(bill|kitty|host_fee|next_pot),
                split(equal|by_win_size|across_everyone),
                collector_player_id,           -- exactly one; need not be seated
                sort_order                     -- rules apply in a defined order
                -- rules are versioned per session at close (see below)

final_count     id, session_id, player_id, counted_chips:int
                -- host's end-of-night count for still-seated players

settlement      id, session_id, algorithm_version, rules_snapshot(jsonb),
                inputs_snapshot(jsonb), computed_transfers(jsonb),
                final_transfers(jsonb),        -- editable if the room decides
                total_off_table:int, computed_at, frozen
                -- the canonical, reproducible record of the night's math
```

Key properties baked into the schema:

- **Append-only** is enforced, not just intended: `ledger_entry` grants `INSERT`/`SELECT` only, no `UPDATE`/`DELETE`, via table privileges + RLS. History cannot be quietly rewritten.
- **Corrections stay visible.** A correction is an entry of type `correction`/`void` with `corrects_entry_id` set. The feed can show "edited" without ever losing the original.
- **The settlement is snapshotted.** At close we freeze the exact rules, inputs, and outputs into one row, with an `algorithm_version`. Re-running that version on that `inputs_snapshot` must reproduce `computed_transfers` byte-for-byte — that is what "auditable and reproducible" means concretely.
- **Collectors are players who may not be seated.** `collector_player_id` references a `player` (a name on the book); nothing requires a matching `session_seat`. They appear in settlement as a payee like anyone else.

---

## 3. Realtime and offline

### The problem, stated plainly
One writer (the host), up to a dozen readers, 3–5 hours, a kitchen, bad wifi. The host must never be blocked from recording money by a dropped connection. Readers just need to see the live list.

### Recommendation: local-first writes, single-writer, no CRDT.

The single most important simplification: **there is exactly one writer per session.** Concurrent-edit machinery (CRDTs, operational transforms, conflict merges) exists to reconcile *multiple* writers. We have one. That means an ordered, append-only log with client-generated IDs is provably sufficient — the classic hard part of offline sync simply isn't present here, and adding a CRDT would be solving a problem we don't have.

**Host write path (offline-proof):**

1. The host taps "Buy-in $100." We generate a `ledger_entry` with a **client-side UUID** and a monotonically increasing `seq`, and write it to a durable **on-device outbox** — **`expo-sqlite`**, which survives app restarts and force-quits, unlike in-memory state.
2. The UI updates **optimistically and immediately** from local state. The host never waits on the network to see their own entry.
3. A background sync flushes the outbox to Supabase **in `seq` order**. Each row's UUID is its **idempotency key** — retries and duplicates collapse to one row, so a flaky connection that half-sends is safe.
4. Because entries are **immutable and corrections are additive**, replay is always safe: re-sending an entry the server already has is a no-op, and there is never a merge to resolve.

The host's device is the source of truth *for uncommitted entries*; the server is the source of truth *for the record*. They can't disagree, because the client only ever adds.

**Reader path:**

- Readers subscribe to the session over **Supabase Realtime (websockets)** and receive new entries as they're inserted.
- If the socket drops (it will, in a kitchen), fall back to **short polling** of "entries since `seq N`." Readers are inherently online — they're watching a live link — so "reconnecting…" is an acceptable state for them; we do not need offline reads for watchers in v1.
- The whole ledger for a session is small (a few hundred integer rows at most), so a reader can always cheaply re-fetch the full list to self-heal if it suspects it missed something.

**What we deliberately do *not* build:** CRDTs, multi-writer merge, a bespoke websocket server, or an offline store for watchers. Each is unnecessary given single-writer + small data + online readers.

**Unsettled → default:** host-device handoff (host's phone dies mid-night) is a real risk but not a v1 requirement. Default for v1: the outbox is on one device; mitigate by syncing committed entries to the server continuously (so at most the last few unsynced taps are at risk) and note device-handoff as a v2 item.

---

## 4. Identity

### Recommendation: one real account (the host); everyone else is a name or a link.

The design says players "are not necessarily app users," watchers open a link "without signing up," and the host "is the one device that writes." So identity collapses to three tiers with very different weights:

- **Host — a real account.** The only sign-in in v1. Use **email magic-link** (default) — no passwords, minimal friction — with **Sign in with Apple** as an easy add given the iOS audience. The host owns the book and is the only principal with write access.
- **Player — just a name.** The host types "Petr." That creates a `player` row on the book. No account, no invite, no email. Players are reused across sessions within the book. A collector is the same kind of row that happens to be named as a rule's payee.
- **Watcher — a capability link, opened in the installed app.** Sharing a session produces a URL carrying an **unguessable `share_token`**. Because watchers now install the app, the link is a **deep link**: tapping it opens the app directly on that session. Opening it grants **read-only** access to that session (and the player pages within it) — enforced server-side, never by hiding a client button. **Still no sign-up:** the token is the credential, so a watcher installs once and never makes an account. Per the design, the room is trusted: a watcher sees their own money and everyone else's.

  Mechanically, the app exchanges the `share_token` at an edge function for a **scoped, read-only session token** carrying a `share_session_id` claim. RLS policies check that claim, which makes the same rule govern both ordinary reads and realtime subscriptions — a plain token-in-a-header would authorize REST but not the websocket.

**"Claiming a name" — deliberately v2.** The minimum for v1 is: host account + share links. That already runs a full night. Claiming (a player signs in and links their account to their `player` row, unlocking their own cross-book standing on their device and private notifications) is a real feature but adds real surface — invites, verification, "is this the right Petr?" — for zero v1 value, since watchers already see everything through the link. The schema leaves the hook in place (`player.claimed_by_user_id`) so v2 doesn't need a migration.

**Unsettled → defaults:** auth provider → magic-link email (+ Apple). Share-link lifetime → tokens are per-session and revocable; default them to live for the session and remain openable while the book is open, revocable by the host.

---

## 5. Money integrity

This is the part that has to be right, so it gets the most explicit rules.

**1. Integers only, whole units, forever.** Every amount is a `BIGINT` of whole currency units. No floating point enters the money path at any layer — not in the DB, not in the calculation, not in the display formatter. The type system enforces it (a branded `Money = integer` type in TypeScript); no `number` that could be fractional is ever treated as money.

**2. Append-only ledger with visible corrections.** Entries are inserted and never mutated. To fix a mistake, the host adds a `correction` (new amount) or `void` (to zero, with a reason) that references the original via `corrects_entry_id`. History is complete and the feed can show "corrected" inline. This is enforced by DB privileges, not convention.

**3. The count must reconcile before settlement.** At close, the host enters `counted_chips` for everyone still seated; players who cashed out keep what they left with. The app shows the **mismatch** between counted chips and the money that should be on the table and **blocks the flow until it is exactly zero** — a hard integer equality, trivial and total because there's no rounding in chip counts.

**4. Settlement is a pure, deterministic, versioned function.**

```
settle(ledger, rules, counts) -> { deductions, transfers, total_off_table }
```

Given the same immutable inputs it must always produce the same output. Determinism requires nailing down two things that are otherwise ambiguous:

- **Ordering.** Rules apply in `sort_order`. The transfer-matching is *largest debtor to largest creditor*; ties are broken by a **stable key** (player id), never by hash-map iteration order. Same inputs → same transfers, every time.
- **Rounding.** Percentages of integer amounts produce fractions, and money is whole units — so rounding is unavoidable and must be *specified*, not left to `Math.round` sprinkled around. Default rule: compute each rule's charge, floor to whole units, then distribute the leftover units by **largest remainder** so the pieces sum **exactly** to the intended whole total. This guarantees no unit is created or lost and that the sum is exact. The rule is documented and carried in `algorithm_version`.

**5. Where it runs: both, with the server canonical.**

- **Client** computes the settlement live for instant feedback as the host counts up and toggles rules — the deductions preview and the transfer list update with no round-trip.
- **Server** (a Supabase edge function) **re-computes the same version** at close over the same inputs and **freezes** the result into the `settlement` row: `rules_snapshot`, `inputs_snapshot`, `computed_transfers`, `algorithm_version`. Because the function is pure and versioned, the two must agree; the server's frozen copy is the canonical, auditable record. If they ever disagree, that's a bug the app can *detect* (compare client and server output) rather than a silent money error.

**6. Editable result, both versions kept.** The room can override the computed transfers ("we'll settle it differently"). We store `computed_transfers` *and* `final_transfers` — the math the app did, and what the room agreed — so the audit trail shows both. The plain-language total ("$296 leaves the table: $170 back to Marek, $126 to Radka") is rendered from the frozen numbers.

---

## 6. Phasing

### v1 — a real group can run a night this month

Everything needed end-to-end for one host, one group, live watchers:

- Installed native app on iOS and Android (host writes; watchers read-only via a deep-linked share token); dark **and** light themes at ship fidelity.
- Open a session (stakes, default buy-in, seats, start time) → seat players → money rules editor with collector/player pickers.
- Live ledger: buy-in, rebuy (presets: buy-in / ×2 / ×4 / custom), cash-out, shared expense; back-dating; notes; corrections that stay visible.
- Both views: chronological feed **and** the timeless totals view; a single player's page.
- Host offline-proof writing (outbox + sync); watcher realtime with polling fallback.
- Close the night: count-up that **must reconcile to zero**, deductions from the rules, settlement (largest-first, collectors as payees), editable result, settled summary.
- One book, one host device.

### Deliberately left out of v1 (and why it's safe to)

- **Multiple groups per host** — the schema allows it; the UI assumes one book. Watcher value is unaffected.
- **Real player accounts / claiming a name** — watchers already see everything via the link; the hook (`claimed_by_user_id`) is in the schema for later.
- **Notifications** — needs claimed identities to be meaningful; it's a v2 companion to claiming.
- **The book/month/all-time screens in the new visual style** — the handoff notes these aren't redesigned yet. v1 ships a *minimal* month/all-time rollup (correct numbers, plain rows) and defers the polished screens.
- **Polished watcher onboarding** — the deep link drops a watcher straight into the session; a proper first-run explainer can wait.
- **Public App Store release** — v1 ships to the group over **TestFlight (iOS)** and an **internal track / direct build (Android)**, which is faster than store review and enough for one group this month. Full store submission is a v2 step, and it is the same `eas submit` command.
- **Host-device handoff** — mitigated by continuous sync (§3), fully solved in v2.

### v2 — the group comes back next month

Player claiming + first-class personal cross-book standing; push notifications (Expo Notifications — now straightforward, since everyone has the app installed); the redesigned book/month/all-time screens; multiple groups per host; public App Store and Play Store release.

### v3 — scale and polish

Host handoff / co-hosts, exports (CSV/PDF of a closed book), richer history and analytics, whatever 10,000 groups ask for.

---

## 7. Cost and operations

Costs are dominated by the managed backend; the app itself is distributed by the stores, so there is no per-user hosting bill at all. Figures are rough monthly run-rate, not commitments.

### At 100 groups
Traffic is tiny — a few concurrent live sessions, a dozen readers each, a few hundred integer rows per night.

- **Backend (Supabase):** free tier likely covers it; **Pro (~$25/mo)** buys headroom, daily backups, and no auto-pause. 
- **Expo EAS:** free tier builds work but queue slowly; the paid tier is roughly **~$19/mo** for practical build throughput and OTA updates. (Pricing moves — verify current rates.)
- **Store fees:** Apple Developer **$99/yr** (~$8/mo), Google Play **$25 once**.
- **Total: ~$30–55/mo**, plus the one-off Play fee. Effectively a hobby-tier bill.

### At 10,000 groups
Assume a few hundred concurrent live sessions at peak (evenings/weekends), each with ~a dozen websocket readers → low thousands of concurrent realtime connections; still-modest write volume; the data is small and mostly append-only.

- **Backend:** Supabase **Team tier + compute add-on**, larger DB instance, higher realtime concurrency: order **$300–800/mo** depending on peak concurrency and retention.
- **Expo EAS:** still **~$19–99/mo** depending on build volume and OTA update bandwidth; app distribution itself stays free via the stores.
- **Total: ~$300–800/mo**, i.e. **~5–10¢ per group per month** — trivially covered by any host-fee or subscription if monetized.

### What changes between the two points (the data model does **not**)

- **Connection pooling** (Supabase's Supavisor / PgBouncer) becomes mandatory for the realtime + edge-function connection count.
- **Read replica** for rollups (month/all-time/book) so reporting never competes with live-session writes.
- **Realtime capacity**: move to a tier sized for the concurrent-socket peak, or fan out via a dedicated realtime channel per session; consider heartbeat/polling tuning for the kitchen-wifi tail.
- **Settlement/validation on the server** (edge functions) becomes load-bearing rather than a nicety, and gets its own monitoring — a wrong number at scale is 10,000 arguments, not one.
- **Observability**: error tracking (Sentry), DB metrics/alerts, and an alert specifically on any client-vs-server settlement mismatch.

None of this touches the schema or the app's logic — it's operational tiering. That's the point of choosing plain Postgres + a single writer + integer money now: the thing that scales is the bill and the ops runbook, not a rewrite.

---

## Appendix — design tokens carried from `Style Guide v2.dc.html`

Recorded here so the eventual UI build starts from the source of truth. Two themes, **no brand accent** — colour means money and nothing else.

**Dark theme:** ground `#0A0A0B` · surface `#16161A` · raised `#26262B` · fill/text `#FFFFFF` · muted `#8B8D93`
**Light theme:** ground `#FFFFFF` · surface `#F4F4F6` · raised `#EDEDF0` · fill/text `#0C0D0F` · muted `#6B6F76`
**Money (the only colour):** win dark `#6FCF97` / win light `#0A7A3D` · loss dark `#F0705C` / loss light `#C0341B` · off-the-table (bone) `#D9D3C4` (falls back to ink + tinted row in light)

**Type:** SF on Apple, Figtree elsewhere; **tabular numerals on every figure**. Display 64/800 (one hero amount per screen) · title 32–34/800 · destination 28–30/800 · figure 19–24/700 · body 17/500 · meta 13–15/400 · label 12/700 caps .1em.

**Shape & space:** 8 px corners on anything pressable · 14 px on cards · 46 px screen · 999 px only on the live badge. 22 px page margin, 20 px for cards/button rows, 12 px between cards. Rows are 13–17 px padded with a hairline between — **never a card inside a card**.

**Buttons:** exactly **one filled primary per screen**, 56 px, with a 2 px keyline *inside* the fill; secondary same height, no fill; destructive is outline-only, never filled; presets 44 px, filled when chosen; "add/new" actions are dashed.

**Navigation:** **no tab bar.** **One club per host** — nothing names it, nothing switches between clubs, and the only per-club filter left in the app is on a player's own stats, where playing in more than one club is a real thing. Home is the root and it opens straight on the night (running, or ready to start); the session and the book are pushed on top. Every pushed screen carries a **labelled** back that names where it returns — no home glyph, because with one club the label already says it. Numbered flows read "2 of 3", and the primary button names the *next thing* rather than saying "Next".
