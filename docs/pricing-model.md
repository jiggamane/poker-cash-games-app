# The Poker Club — Pricing & In-App Purchase Model

*A recommendation, the alternatives I considered, and what each one implies for the build.
Companion to [`build-plan.md`](build-plan.md); same format — decisions first, reasoning after,
and an explicit default wherever something isn't settled.*

---

## TL;DR — the seven decisions

| # | Question | Recommendation (the default I'd pick) |
|---|----------|----------------------------------------|
| 1 | **Who pays** | **The host, and only the host.** Value is concentrated in the one person doing the work. Watchers and players never pay and never see a paywall. |
| 2 | **What's free** | **The night itself.** Anyone can run one complete night — through settlement — with no account and no card. Signed-in hosts run unlimited nights on the free tier. |
| 3 | **What's paid** | **The record, not the game.** History beyond the current month, book/month/all-time rollups, closing a book, multiple books, exports, co-hosts. |
| 4 | **Tiers** | **Watcher (free, no account) · Player (free account) · Host Free · Host Pro · Club.** The "admin vs user" split you asked for is Host-vs-Player, and Player accounts are free on purpose. |
| 5 | **Price** | **$4.99/mo or $29.99/yr** for Host Pro (annual pushed hard); **$9.99 one-off Book Pass** for irregular groups; **$69/yr Club** per group with co-hosts. |
| 6 | **Trial** | **Measured in nights, not days. 3 full-Pro nights**, no card. A 14-day trial is meaningless to a group that plays every other Friday. |
| 7 | **Rails** | **Sell on the web (Stripe or Paddle), not through App Store IAP.** As a PWA there is no store cut at all. Keep it that way even after a native wrapper. |

The load-bearing insight, same as the build plan's: **the share link is the product and the
growth engine.** Up to a dozen people open the ledger every night with no install and no
sign-up. Metering that link — by watcher count, by view, by anything — would monetise the one
mechanism that acquires every future host. So the paywall goes somewhere else entirely: on the
*accumulated record*, which only the host cares about, only exists after several nights, and is
exactly what makes a group stay.

---

## 1. Who pays, and why it isn't everyone

Three populations, wildly different willingness to pay:

| | Effort they spend | Value they get | Can they pay? |
|---|---|---|---|
| **Host** | Runs the app for 3–5 hours, records every movement of money, gets blamed if it's wrong | Stops being the person with a paper napkin and an argument | **Yes — high.** This is the whole revenue base. |
| **Player / watcher** | Taps a link | Sees the same list, doesn't have to trust anyone's memory | **No.** Passive value, zero effort, and they're a guest. |
| **The group** | — | The night settles cleanly and the month has a scoreboard | **Yes, indirectly** — see §5, the money-rule split. |

So: **one payer, a dozen beneficiaries.** That is a good shape — it means the price only has to
clear one person's bar, and that person is already absorbing all the social cost of getting the
money right. It also means the price should be anchored against *the table*, not against other
apps. A modest home game with $100 buy-ins puts $600–1,200 on the table in one night. A year of
Host Pro is about a quarter of one buy-in. Say that out loud on the paywall.

### The one thing to never do

Do not charge watchers, cap watchers, or require a watcher account. Every watcher is a
free trial of the product running on someone else's phone, and roughly one in ten of them
hosts their own game. Gating them converts your acquisition channel into a rounding error of
revenue.

---

## 2. What's free and what's paid — the gating axis

The choice of *what* to gate matters far more than the price. I evaluated five axes:

| Axis | Verdict |
|---|---|
| **Watchers / share links** | ❌ Forbidden. Kills the growth loop and breaks the core promise ("open a link on any phone, no sign-up"). |
| **Seats per session** | ❌ Punishes the host for who walked in the door. They don't control the guest list on the night. |
| **Sessions per month** | ⚠️ Natural, but it blocks a night that's about to start. In a money app, a wall at 8pm on a Friday is a product you get uninstalled for. |
| **Correctness features** — settlement, corrections, count reconciliation | ❌ Never. Selling accuracy in a money app is suicide. The free tier's math must be identical to Pro's. |
| **The accumulated record** — history, rollups, closing a book, exports, multiple books | ✅ **This one.** |

**History is the right paywall** for four reasons:

1. **It never blocks money in flight.** Whatever the plan, tonight completes and settles.
2. **It compounds.** Value grows every night the group plays, so willingness to pay grows on
   exactly the same curve. Nobody pays on night one; a lot of people pay on night eight.
3. **It targets the engaged.** A group that plays twice and drifts away never hits the wall —
   and was never going to pay. A group that's arguing about who's up on the month hits it hard.
4. **It's already the app's own ceremony.** The book is "opened once and closed manually by the
   host, which freezes its totals." *Closing a book* is the emotional peak of the product and a
   natural, honest place to ask for money.

### The tier table

| | **Watcher** | **Player** | **Host Free** | **Host Pro** | **Club** |
|---|---|---|---|---|---|
| Account needed | none | free | free | free | free |
| Price | $0 | $0 | $0 | **$4.99/mo · $29.99/yr** | **$69/yr per group** |
| Open a session, run the ledger | — | — | ✅ unlimited | ✅ | ✅ |
| Close a night, full settlement | — | — | ✅ **complete** | ✅ | ✅ |
| Watch live over a link | ✅ unlimited | ✅ | ✅ | ✅ | ✅ |
| Claim your name, personal standing | — | ✅ | ✅ | ✅ | ✅ |
| Session history | current session | own entries | **current month** | **forever** | forever |
| Month / all-time rollups | — | own only | — | ✅ | ✅ |
| **Close a book** (freeze totals, start a new one) | — | — | — | ✅ | ✅ |
| Money rules | — | — | **1 active** | unlimited + kitty carry-over | unlimited |
| Books / groups | — | — | 1 | 3 | unlimited |
| Export CSV / PDF of a closed book | — | — | — | ✅ | ✅ |
| Co-hosts & device handoff | — | — | — | — | ✅ |
| Player Plus for everyone in the group | — | — | — | — | ✅ |

**Zero-account first night.** Before any of this: a brand-new person can open the app, run one
complete night, and reach the "$296 leaves the table: $170 back to Marek, $126 to Radka" screen
without creating anything. That screen *is* the pitch. Asking for an email before they've seen
it is asking them to buy a photograph of a meal. The second session prompts a free account.

---

## 3. The admin/user split you asked for

The build plan's §4 deliberately has **one account type** — the host — with players as names and
watchers as links, and "claiming a name" pushed to v2. Your ask for a full/admin tier versus a
user tier requires pulling *identity* forward, but not *billing*. Concretely:

- **Host account = the admin account.** Owns the book, the only principal with write access to
  the ledger, holds the subscription, invites co-hosts (Club), revokes share links. Everything
  in `build-plan.md` §4 stands unchanged.
- **Player account = the "user" account, and it's free.** This is v2's "claim your name" shipped
  early as an *identity* feature, not a paid one: a watcher signs in, links to their `player`
  row, and gets their own standing across the book on their own device, their own history, and
  (later) notifications. `player.claimed_by_user_id` is already in the schema for it.

**Why the user tier is free rather than cheap.** A $1.99 player tier would earn very little and
cost a great deal: it puts a payment decision in front of a guest at someone else's kitchen
table, on a night the host is trying to look good. Player accounts instead pay you three ways
that are worth more than the fee —

1. Every claimed player is a **known future host** with a warm relationship to the product.
2. Claimed identities are what make notifications, invites and cross-group standing possible.
3. A player who has a year of personal standing in your app **won't let their host leave it.**
   That's the retention mechanism, and you don't want a paywall in front of it.

If you want a paid player tier later, the honest version is **Player Plus** (~$1.49/mo): personal
lifetime stats across every group they've ever played in, and their own export. Ship it after
claiming exists and after you can see how many players have more than one host. It should be a
rounding error in revenue; if it isn't, that's a signal you priced Host Pro too low.

**Unsettled → default:** whether player accounts arrive in v1 or v2. The billing model doesn't
need them, so the default is **v1 ships hosts and links only; player claiming lands in v2** —
exactly as `build-plan.md` phases it. Nothing in the pricing model has to change when it does.

---

## 4. Price, trial, and the numbers behind them

### Price points

| Product | Price | Rationale |
|---|---|---|
| **Host Pro — monthly** | **$4.99 / mo** (≈ 119 Kč) | Deliberately unremarkable. Its real job is to make annual look obvious. |
| **Host Pro — annual** | **$29.99 / yr** (≈ 699 Kč) | 50% off monthly. **Push this everywhere.** |
| **Book Pass** | **$9.99 one-off** | One book, unlimited nights until it's closed, that book's history kept forever. For groups that play a season, not a calendar. |
| **Club** | **$69 / yr per group** | Co-hosts, unlimited books, Player Plus for every claimed player in the group. Designed to be split. |
| **Founding Host** | **$99 one-time**, first 500 hosts only | Launch cash, and a genuine answer to subscription fatigue. |

**Why annual matters more here than in most apps.** A home game meets weekly, fortnightly, or
"whenever Petr's free". Monthly billing hands that host a churn decision in every month they
happened not to play — and there will be several. Annual billing spans the gaps and matches the
product's real unit of time, which is the book, not the month. Target 70%+ of subscribers on
annual; if a month goes by quiet, they aren't looking at a charge and wondering.

**On lifetime pricing.** Normally reckless; here it's defensible arithmetic. The build plan puts
serving cost at **5–10¢ per group per month**, so a $99 lifetime covers something like eighty
years of infrastructure for that group. The risk isn't the servers, it's that lifetime buyers
are your best-intent customers and you've capped their LTV — which is why it's capped at 500
and framed as a founding cohort, not a permanent SKU.

**Currency.** The design carries `currency_symbol` per book and the example names are Czech, so
assume a CZ/EU-first audience: price in local currency with locally-rounded numbers (699 Kč, not
"$29.99 converted"), and use a merchant-of-record (Paddle) so EU VAT and OSS filing aren't your
problem. See §6.

### Trial: count nights, not days

**A time-boxed trial is the wrong instrument for an episodic product.** A 14-day trial handed to
a group that plays on alternating Fridays contains one game — sometimes zero. The trial has to
be denominated in the same unit as the value.

**Recommended:** **the first 3 nights are full Host Pro**, no card, no countdown. On the fourth,
the app drops to Host Free — history collapses to the current month, rollups lock. Nothing is
deleted, and the running night is untouched.

The prompt to convert should fire at the **fourth night's settled summary**, not at signup and
not at a session's start. By then they've had the payoff three times, the month has a shape, and
the ask lands next to a number they care about.

**Unsettled → default:** 3 nights vs 5. Instrument it and A/B it once there's volume; default to
**3**, because the group's habit is usually formed or dead by the third game.

### What has to be instrumented from day one

Charge nothing until you can see these — they're the only inputs that make the price debatable:

- **Watcher → host conversion rate** (the growth loop's actual coefficient).
- **Nights per host per month**, distribution not average — the average is a lie made of a few
  weekly groups and a long tail of monthly ones.
- **Conversion at the 4th settled summary**, split by nights-played.
- **Book close rate** — the strongest single predictor of a group that will pay.
- **Trial-to-paid by nights-to-fourth-game** (does a group that took 6 weeks convert worse?).

---

## 5. Alternative approaches

Everything below is a real option, and two of them I'd ship *alongside* the subscription.

### A. Straight subscription — **recommended, the default**
Host Pro monthly/annual as priced above.
**For:** predictable revenue, standard mechanics, one thing to explain.
**Against:** a monthly charge for a thing used monthly is a churn machine — mitigated by annual.

### B. Per-night credits ("table fee")
$1–2 per night hosted, sold in packs of 10.
**For:** perfectly matched to the episodic reality, zero commitment, reads like a rake, which is
a metaphor this audience already understands.
**Against:** it puts a purchase decision at 8pm on a Friday with six people waiting — the worst
possible moment — and it meters the exact behaviour you want more of. Revenue is unforecastable.
**Verdict:** don't lead with it. It's the right shape only if telemetry shows most hosts play
fewer than ~8 nights a year, in which case annual is a bad deal for them and they'll say so.

### C. Book Pass — **recommended as a second SKU**
$9.99 buys one book: unlimited nights until the host closes it, history kept forever.
**For:** it's priced in the product's own unit. The book is already "opened once and closed
manually", it's already the thing that freezes totals, and "buy this book" needs no explanation.
It converts at the moment of peak value (closing) and it's the honest option for a group that
plays a winter season and stops.
**Against:** lower LTV than a subscription, and it needs a book-level entitlement in the schema
(§7). Worth it — it catches the hosts who would otherwise churn rather than subscribe.

### D. Group-funded via a money rule — **recommended as a mechanic, not a SKU**
The app *already* has money rules with a `host_fee` destination and a collector. Ship a
first-class rule template: **"App fee — $1 per player, host collects."** Six players, one night
a month, and the group has covered a $69 Club plan in a year without anyone reaching for a card.
**For:** it removes the host's felt cost entirely. It's the difference between "I pay for the
app everyone uses" and "the table pays for the app". It is also, quietly, the most on-brand
feature in this document — it's built from mechanics the product already has.
**Against:** **you must not take a cut of the pot.** The money moves inside the room; the app
records it and nothing more. The subscription is still charged to the host's card. Touching that
money — processing it, holding it, taking a percentage — turns a scorekeeper into a regulated
payments-and-gambling business overnight. Keep the rule as bookkeeping and the billing separate.

### E. One-time purchase only ($59–79, no subscription)
**For:** no churn, no billing anxiety, and the serving cost genuinely supports it. Sells well to
this exact demographic.
**Against:** revenue doesn't compound, and it funds no ongoing development. Best deployed as the
capped Founding Host offer (§4) rather than as the business.

### F. Free with paid à-la-carte extras
Exports, extra books, rule packs sold individually.
**Against:** each item is worth ~$3 and the sum of them is worse than a subscription at almost
every level of engagement, for both sides. Keep exports inside Pro.

### G. Free for everyone, monetise later
**For:** at $0–45/mo for 100 groups, entirely affordable, and the fastest way to learn where
value actually sits.
**Against:** re-pricing a free audience is one of the harder things in software.
**Middle path, and the one I'd actually take:** ship the tier *structure* from day one, set the
paywall generously for the first cohort, and **grandfather the founding hosts permanently.**
You learn what converts without ever having to take something away.

### The combination I'd ship

> **Host Pro subscription (A), annual-first, with a Book Pass (C) for the irregular groups, the
> money-rule split (D) as the default suggestion in the rules editor, and Founding Host (E)
> capped at 500 for launch.** No ads, ever — the design has *no brand accent hue at all* because
> colour is reserved to mean money. An advertisement would violate the style guide literally,
> and the trust model as well.

---

## 6. Rails: why not App Store IAP (yet)

You asked about IAP specifically, and the build plan's platform decision changes the answer:

**Today the product is a PWA. There is no store, therefore no store commission.** Sell with
**Stripe** (best if you're happy handling EU VAT yourself) or **Paddle / Lemon Squeezy** (merchant
of record — they take ~5% but own VAT, invoicing and OSS filing, which for a CZ/EU audience is
worth more than the difference). Either way you keep ~95–97% instead of 70–85%.

**When the Capacitor wrapper arrives** (`build-plan.md` §1, a v2 item), a native app offering
digital purchases in-app falls under App Store / Play billing: 30%, or 15% under Apple's Small
Business Program and Google's equivalent for the first $1M. Three ways through it:

1. **Ship the native app as sign-in-only** — no in-app purchase surface at all, subscription
   bought on the web. This is the "reader"-style path and it keeps ~100% of revenue. **Default.**
2. **Link out to web checkout.** US and EU rules have moved substantially in this direction
   (the 2025 anti-steering injunction in the US, the DMA in the EU), but the details and the
   permitted link treatment change often — **verify against current App Store Review Guidelines
   at the time you actually ship, not against this document.**
3. **Offer native IAP at a higher price** than web (a "convenience" delta covering the cut).
   Permitted, common, and worth having if native conversion turns out to be much better.

**Two policy risks worth naming now, before they're expensive:**

- **Gambling review (App Store Guideline 5.3 / Play's real-money gaming policy).** This app
  records real money changing hands at a poker game. It doesn't host play, doesn't take stakes,
  doesn't process payments, and is functionally a scorekeeper — which is usually fine. But it
  *will* draw reviewer attention, and outcomes vary by reviewer and by region. Being web-first
  means this risk never blocks revenue; it only ever affects an optional distribution channel.
  Prepare the "this is a ledger, not a game" review note in advance.
- **Ever moving the actual settlement money** (a Venmo/Revolut/bank-transfer integration) is a
  genuinely attractive future revenue line — and it converts you into a payments business with
  KYC/AML obligations and a much harder gambling-adjacency argument. Out of scope; decide it
  deliberately if ever, never incidentally.

---

## 7. Guardrails, and what this implies for the build

### Six rules the implementation must enforce

1. **Never paywall money in flight.** A session that is open stays fully usable and fully
   settleable, even if the subscription lapsed at midnight. Entitlement is checked when a
   *session is opened*, never on `ledger_entry` INSERT. This is the most important line here.
2. **Never gate correctness.** Settlement, corrections, count reconciliation, and the frozen
   server-side audit record are identical on every tier including free.
3. **Never delete data on downgrade.** History is *hidden*, not destroyed, and returns intact on
   re-subscribe. The ledger is append-only (`build-plan.md` §5) — a billing state must never be
   able to violate that.
4. **Never meter watchers.** No cap, no account, no counted views.
5. **Enforce entitlement server-side.** Same rule as share tokens: RLS and edge functions, never
   a hidden client button. A client-side paywall in a money app is both bypassable and, worse,
   inconsistent between the host's view and a watcher's.
6. **Grandfather permanently.** Anyone who paid keeps their price and their tier's feature set.

### Schema additions

Small, and orthogonal to everything in `build-plan.md` §2 — no existing table changes:

```
account_entitlement   user_id, plan(free|pro|club), status(trialing|active|past_due|canceled),
                      source(stripe|paddle|apple|google|grant),
                      current_period_end, trial_nights_remaining:int,
                      price_id, grandfathered:bool
                      -- one row per host; the only thing that gates a *new* session

book_entitlement      book_id, kind(book_pass|club|pro_period), purchased_at,
                      covers_until_close:bool
                      -- a Book Pass attaches to the book, not the account, and survives
                      -- a lapsed subscription. This is what makes alternative C honest.

billing_event         id, user_id, provider, provider_event_id(unique), type, payload(jsonb),
                      received_at
                      -- append-only, idempotent on provider_event_id, same discipline as the
                      -- ledger. Webhooks arrive twice; they must not double-grant.
```

Two properties to carry over from the ledger's design, because billing has exactly the same
failure modes: **append-only events** and **idempotency on a provider-supplied key.** A
subscription webhook replayed by Stripe should collapse to one grant for the same reason a
resent `ledger_entry` collapses to one row.

### What this adds to v1

Almost nothing, and that's deliberate. v1 in the build plan is "one group can run a real night
this month" — it should ship with **the tier structure visible and the paywall switched off**,
plus `account_entitlement` in place and the instrumentation from §4 running. Turn billing on
when you can answer "how many nights does a real host actually play?" with data instead of a
guess.

---

## Appendix — the paywall in one sentence, per surface

- **Fourth settled summary:** "Your month is taking shape. Keep every night, close the book when
  you're ready — $29.99 a year, about a quarter of one buy-in."
- **Book close (free tier):** "Closing a book freezes its totals forever. That's a Pro thing —
  or buy this one book for $9.99 and keep it."
- **Rules editor (free tier, second rule):** "Groups on Pro stack rules — a kitty *and* a bill,
  carried over between nights."
- **Money-rule template:** "App fee — $1 per player, collected by the host. Most groups cover
  the year in two nights."
- **Player, after claiming:** nothing. Say nothing. They're free and they're your next host.
