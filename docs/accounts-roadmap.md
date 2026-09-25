# Accounts, stores and upgrades — the roadmap

Written 25 September, in answer to: *a plan from first steps to the final
version for a multi-account ecosystem — sharing through Expo first, then the
App Store, the users database behind it, and account upgrades: free upgrades I
hand to friends, by hand or with promo codes, and a normal payment system for
everybody else.*

This file is the **order of work**. It does not repeat the three docs it
sequences, and where it disagrees with one of them it says so:

| Doc | What it owns | Status against this plan |
|---|---|---|
| `accounts-and-groups.md` | who can get in today, and what blocks the rest | current — its Phase 0/1 are this file's Stages 0/1 |
| `auth-test-period.md` | the dashboard checklist | current — Stage 0 *is* its seven steps |
| `pricing-model.md` | what is free, what is paid, the price | **tiers, prices and §7 guardrails stand. §6 "Rails" is superseded** — see Stage 4 |

---

## The shape of it in one table

| Stage | Who can use it | Distribution | Money | Gate to move on |
|---|---|---|---|---|
| **0 · Friends, today** | your group | Expo Go + a published update | none | a friend's phone signs in and claims a seat with nothing but a link and a code |
| **1 · Friends start their own groups** | friends of friends, by your code | Expo Go | none — but the **plan table exists** and you can already grant | a friend runs a night in their own group on their own account |
| **2 · Real builds** | the same people, installed | TestFlight + Play closed test | none | the build signs in with Apple and Google, and survives a phone swap |
| **3 · Store launch, free** | anyone | App Store + Play Store | none | review passed; account deletion, privacy policy, captcha live |
| **4 · Paid** | anyone | stores + optional web | IAP via RevenueCat, grants and promo codes alongside | a real subscription renews, a grant and a promo code both unlock the same thing |
| **5 · Club** | groups | same | co-host / group plans | only if the data says so |

Each stage ships on its own and is useful on its own. None of them needs the
next one to exist.

---

## The one design decision everything hangs on

**One `plan` answer per account, computed in Postgres, from any number of
sources.** A friend you comped by hand, a friend who typed a promo code, a
stranger who subscribed on an iPhone, and a stranger who subscribed on Android
must all be *the same kind of row*, read by the same function, enforced by the
same policy. The app asks one question — `my_plan()` — and never asks Apple,
Google or RevenueCat directly what the person may do.

Why this, and not "RevenueCat is the source of truth":

- **Grants are yours.** A comp for a friend is not a store transaction and
  should not need a store to exist. With the ledger of grants in Postgres you
  can give a free year from the SQL editor in Stage 1, two stages before any
  store is involved.
- **RLS is the security model** (`auth-test-period.md`, opening). An
  entitlement the database cannot see is an entitlement the policies cannot
  enforce, and `pricing-model.md` §7 rule 5 already says server-side or not at
  all.
- **Stores become one more source** — a webhook writes a row — rather than a
  second opinion the app has to reconcile with the first.

The table (Stage 1 builds it; Stage 4 only adds writers):

```
entitlement        id, user_id, plan (pro | club), source (grant | promo |
                   founder | apple | google | web), starts_at, ends_at (null =
                   forever), granted_by (user_id, for grants), promo_code_id,
                   provider_ref (store transaction / subscription id), note,
                   revoked_at
                   -- append-only in spirit: a revoke is revoked_at, not a delete,
                   -- for the same reason a void is a new ledger row.

billing_event      provider, provider_event_id UNIQUE, user_id, type, payload,
                   received_at
                   -- webhooks arrive twice; the unique key is what makes the
                   -- second one a no-op. Same discipline as the ledger.

promo_code         id, code UNIQUE, plan, grants_days (null = forever),
                   max_redemptions, redeemed_count, expires_at, created_by, note
promo_redemption   promo_code_id, user_id, redeemed_at, UNIQUE(promo_code_id, user_id)

app_admin          user_id           -- you. Guards every function below.
```

and the functions:

```
my_plan()                         -> plan, source, ends_at      (the only reader)
am_i_admin()                      -> boolean
admin_grant(email, plan, days?, note)                           (you, by hand)
admin_revoke(entitlement_id, note)
admin_create_promo(code?, plan, days?, max, expires_at?, note)  (you)
redeem_promo_code(code)           -> plan, ends_at              (a friend)
```

`pricing-model.md` §7 sketched `account_entitlement` with one row per host and
a status column. **This replaces it**: one row per *grant*, and the answer is
the best live row. That is what lets a friend hold a comp and a subscription at
once, lets the comp outlive a cancelled subscription, and lets you see who gave
what to whom and why.

---

## Stage 0 — Friends on Expo Go (now, no code)

What exists: hosts sign in by magic link (gated, `shouldCreateUser: false`),
members claim a seat with a ten-character code, watchers open a share link.
All three are enforced in Postgres. The app reaches phones as an EAS Update
opened in Expo Go (`live-test.md`, `.github/workflows/expo-go.yml`).

What is in the way is not code:

1. **The email wall.** Supabase's own mailer sends two mails an hour to project
   members only. Steps 4–6 of `auth-test-period.md`: Resend SMTP, **raise the
   rate limit separately**, paste the template, add
   `exp://u.expo.dev/938b4629-9a41-4ddf-bcd8-86bb4e4696b3/**` to the redirect
   list.
2. **The project falls asleep** after seven idle days, and poker is weekly. A
   scheduled GitHub Action that hits the REST health endpoint once a day.
   *This one is code — a ten-line workflow — and the only code in Stage 0.*
3. **How a friend gets the app:** install Expo Go from the store, open the
   **branch page** link (`live-test.md` — never a single-update link, which
   pins the phone forever). Check once on a phone that is **not** signed in to
   Expo that the link opens; if it asks for an Expo login, that is the Expo
   account's project visibility setting, not the app.

Exit: a friend with nothing installed gets from your message to a claimed seat
and their own My stats.

**Known ceiling of this stage.** Expo Go is somebody else's app: you cannot add
native modules outside its SDK (so no Sign in with Apple, no in-app purchases),
you are pinned to its SDK version, and every friend's phone is one Expo Go
update away from refusing your bundle. It is a test channel, not a product.

---

## Stage 1 — Friends start their own groups (small, in this repo)

This is `accounts-and-groups.md` Phase 1 plus the plan table. Still Expo Go,
still no money.

**1a. A host code, instead of opening signups.** `host_invite` table and
`redeem_host_invite(code)`; the sign-in sheet asks for the code before the OTP
call for an address the server does not know. Keeps a closed door with a key
you can copy, instead of `shouldCreateUser: true` on an unlisted, uncaptcha'd
app. The `isNotInvited` copy is re-pointed at it. ⚠ The sheet needs a string for
"enter your host code" that no board draws — **flag it for the designer rather
than inventing it** (CLAUDE.md, "Copy is final").

**1b. Anonymous → real account, same user id.** `supabase.auth.updateUser({
email })` on a member's phone. Keeps every claimed seat, removes
`is_anonymous_caller()` from their token, and so satisfies `book_host_all`
without touching the policy. This is the one change that turns a member into
somebody who can host.

**1c. `ensureBook` on a phone with several local groups.** Before anybody but
you runs it (`accounts-and-groups.md`, last bullet of "full blown").

**1d. The plan table, switched on and giving everyone everything.** A migration
(`00NN_entitlements.sql` — take the next free number; 0016 and 0017 were used
and reverted) with the schema above, `my_plan()`, the admin and promo
functions, and `app_admin` seeded with your user id. **No paywall anywhere yet**
— `my_plan()` is read, shown in Settings → Account, and gates nothing. What it
buys now:

- Every friend who joins in Stages 1–3 gets a `founder` row with no end date.
  That is `pricing-model.md` §5-G's "grandfather the founding hosts
  permanently", done by the database on the day it is true instead of
  reconstructed from memory at launch.
- `admin_grant` and `redeem_promo_code` exist and are **tested in
  `supabase/test/`** long before a store transaction ever reaches them.

**1e. Settings → Admin**, drawn only when the caller is in `app_admin` (an
`am_i_admin()` next to `my_plan()`): grant by email, make a code, list what was granted. Until it
exists, the three functions are callable from the Supabase SQL editor, which is
enough for a dozen friends. Needs a board; until there is one, SQL is the tool.

**1f. Account deletion.** `delete_my_account()`: releases claimed seats (as
`revoke_player_invite` already does), hands or refuses hosted books, then
deletes the auth user. Apple rejects any app that creates accounts without it,
so it is cheaper to build it now than under review.

**1g. Co-host — only if you say yes.** `book_host` join table, `is_book_host`
re-pointed at it. The open question in `accounts-and-groups.md` still stands;
this plan does not assume the answer.

Exit: somebody who is not you signs in with your host code, starts a group,
runs a night, and you can see their `founder` row.

---

## Stage 2 — Real builds (TestFlight and Play closed testing)

The moment you pay Apple. Everything after this needs it.

**Accounts to open** (you, in browsers — no session can):

| | Cost | Note |
|---|---|---|
| Apple Developer Program | $99 / year | **Individual or organisation, decide now.** Individual shows your own name as the seller on the store page and is the quick one. Organisation needs a company and a D-U-N-S number (days to weeks) and shows the company. Moving from one to the other later is a support ticket, not a setting. |
| Google Play Console | $25 once | ⚠ **A personal account created since November 2023 must run a closed test with at least 12 testers opted in for 14 continuous days before it may publish to production.** Your friends are that test — start it at the beginning of Stage 2, not the end, or it is two weeks of waiting at the end of Stage 3. An organisation account is exempt. |

**The builds.** `eas.json` already has `development`, `preview` and
`production`. What is missing:

- `EXPO_PUBLIC_SUPABASE_*` as **EAS environment variables** — `.env` never
  reaches the builder (`auth-test-period.md`, "Invalid API key"). A build that
  signs in over the QR code and refuses everything once installed is this.
- `pokerclub://auth-callback` on the redirect list (already in step 6).
- A `development` build (dev client) replaces Expo Go for you; TestFlight and a
  Play closed-test track replace it for friends. EAS Update keeps working on
  both, on the `preview` channel, so a fix still reaches a phone without a new
  build. Expo Go can then be retired as a channel, and with it the SDK pin in
  `apps/mobile/AGENTS.md` stops being forced by Expo Go (move the pin, the
  `exposdk:` literal and CLAUDE.md's sentence in one commit, as it says).

**TestFlight, the two kinds.** *Internal* — up to 100 people who are users on
your App Store Connect team; no review; fine for three or four close friends.
*External* — up to 10,000 by email or a **public link**; the first build of each
version goes through a light Beta App Review (a day or so). The public link is
the "share access" you asked for: one URL in the group chat.

**Sign in with Apple and Google.** `signInWithIdToken` with
`expo-apple-authentication` and Google's native sign-in; `linkIdentity` so an
anonymous member upgrades to Apple/Google **keeping the same user id**, exactly
as 1b does for email. Both together or neither: offering Google without an
equivalent privacy-preserving option gets rejected. This removes email from the
critical path for most people and ends the `redirect_to` failure mode for them.
Keep the magic link as the fallback.

**Two Supabase projects.** The one that exists becomes **production** — your
friends' real nights are in it, and moving them is risk for nothing. Make a
second, free, **dev** project for everything experimental; `development`
builds point at it, `preview` and `production` at the real one.

Exit: a friend deletes the app, reinstalls from TestFlight, signs in with
Apple, and every night and every claimed seat is still theirs.

---

## Stage 3 — Store launch, still free

The paywall stays off. Launching free first means App Review sees a
scorekeeper with no purchases, which is the easiest version of this app to get
through the gambling question — and every reviewer note, privacy form and
policy page is done once, before money complicates them.

**App Store** (and the Play equivalent — its Data safety form and content
rating):

- **Privacy policy URL and support URL.** A page on the existing GitHub Pages
  site is enough. The policy has to be true: Supabase (EU region?) stores email
  and the ledger; name them. GDPR applies — the audience is EU-first.
- **Privacy nutrition labels**, matching the policy.
- **In-app account deletion** (1f) reachable from Settings.
- **Review note, written in advance** (`pricing-model.md` §6): a ledger for a
  private game; it hosts no play, takes no stakes, moves no money. Include a
  demo account the reviewer can sign in with — **a password account made just
  for review**, because a reviewer cannot receive your magic link.
- **Age rating**: answer the questionnaire honestly on gambling references;
  expect 17+ and do not fight it.

**Backend, before strangers:**

- Captcha on anonymous sign-in and on sign-in (Supabase has the toggle; hCaptcha
  or Turnstile).
- A cleanup job for stale anonymous users (`auth-test-period.md`, last list).
- Decide 1a: keep host codes, or open signups now that there is a captcha.
- **Supabase Pro ($25/mo)** — no pausing, daily backups. Point-in-time recovery
  is an add-on; worth it the day a stranger's money is in the book.
- Crash reporting (Sentry has an Expo plugin) — you will not be at every table.

Exit: the app is findable in both stores and a stranger can get from install to
a settled night without talking to you.

---

## Stage 4 — Paid, with free upgrades alongside

### Why IAP, and why `pricing-model.md` §6 no longer holds

§6 said: sell on the web, ship the native app sign-in-only, keep ~100%. It was
written when the product was a PWA. It is now a store app, and the "reader app"
exemption that lets an app skip IAP covers magazines, music, video and books —
**not this**. A store app selling a digital subscription sells it through the
store's billing. What has moved since (a US-storefront link-out to web checkout,
EU alternative terms under the DMA) is real but narrow and changes often; treat
it as an add-on to verify at the time, not the base.

So: **App Store and Play billing first, through RevenueCat.**

- `react-native-purchases` + its Expo config plugin. Needs a dev build — which
  Stage 2 gave you.
- RevenueCat's `appUserID` = the Supabase user id. One person, one id,
  everywhere.
- Products in both consoles: Host Pro monthly and annual in one subscription
  group; the Book Pass as a non-consumable only if you still want it.
- **RevenueCat webhook → a Supabase edge function → `billing_event` +
  `entitlement`** (`source = apple | google`, `ends_at` = the period end,
  renewals extend it, a refund sets `revoked_at`). Idempotent on the event id.
  The app still only reads `my_plan()`.
- Cost: free under $2.5k a month of tracked revenue, then about 1%. The stores
  take 15% under their small-business programmes (both, below $1M a year).
  Apple and Google are the merchant of record: they charge, invoice and remit
  VAT, which for an EU seller is the single largest thing you do not have to
  build.

### The paywall itself

Unchanged from `pricing-model.md`: host pays, players and watchers never; the
record is paid, the night is not; the trial is counted in nights. And its §7
rules, which are the ones that matter most:

1. **Never paywall money in flight.** The check is on *opening* a session —
   a `session` insert policy that asks `my_plan()` — never on a ledger row.
2. **Never gate correctness.** 3. **Never delete on downgrade** — hide.
4. **Never meter watchers.** 5. **Server-side only.** 6. **Grandfather.**

The founders from Stage 1 already have their rows; turning the paywall on
changes nothing for them, which is the whole reason the table came first.

### Free upgrades for friends — three ways, and where each is allowed

| | How | Where it works | Store-safe? |
|---|---|---|---|
| **Grant by hand** | `admin_grant('petr@…', 'pro', null, 'plays Fridays')` or Settings → Admin | everywhere, instantly | **Yes.** It is your server deciding what an account is entitled to; nothing is sold or unlocked by the app. The app still offers IAP to everybody else. |
| **Store offer codes** | Apple **Offer Codes** (App Store Connect → subscription → Offer Codes; custom codes like `FRIDAYNIGHT` or one-time codes), Google Play **promo codes**. Redeemed in the store's own sheet; the app can open Apple's with `presentCodeRedemptionSheet`. | iOS / Android respectively | **Yes** — the sanctioned route. Arrives through the same webhook as a purchase, so it is just a `source = apple` row. Limits: offer codes are *subscription offers* (a free period, then it renews unless cancelled) — good for "a year on me", wrong for "free forever". |
| **Your own promo codes** | `admin_create_promo(...)`, redeemed with `redeem_promo_code` | Android, web, and a redeem page on the GitHub Pages site | ⚠ **Not inside the iOS app.** Apple's 3.1.1 forbids unlocking features with the app's own codes or keys. Redeem on a web page (signed in with the same account), and the iOS app simply reads the resulting `my_plan()` — that is permitted as content bought elsewhere, *provided the same thing is also on sale through IAP*, which it is. |

So in practice: **close friends — grant by hand, forever. A wider circle — your
own codes on the web page, or offer codes if you want the store to handle it.**
Verify 3.1.1 and 3.1.3 against the guidelines on the day this ships; they move.

### Web checkout — later, optional

Stripe via RevenueCat Web Billing (writes to the same webhook) for people who
reach you on the web, and for a US-storefront link-out if that is still allowed
then. On the web *you* are the merchant of record: EU VAT and OSS filing are
yours unless you use a merchant of record (Paddle, Lemon Squeezy) instead.
Worth doing only when there is enough volume for the store's 15% to be worth a
tax problem.

### Before the first paid transaction

- **Terms of service** and an updated privacy policy (payments, RevenueCat).
- **Who is the seller.** An individual developer account sells in your own
  name and the income is personal. If that is not what you want, it is Stage 2
  that decides it, not this one.
- **The instrumentation `pricing-model.md` §4 asks for** — nights per host,
  conversion at the fourth settled summary. Charge nothing until you can see
  these.

Exit: a stranger subscribes on iOS, a friend on Android redeems an offer code,
a third friend has a hand grant — and `my_plan()` says `pro` for all three, from
three different sources, through one function.

---

## Stage 5 — Club and group plans

Co-hosts (if 1g was deferred), a group-level plan that covers everyone in the
group, Player Plus. `pricing-model.md` §5 lists them; nothing in the schema
above has to change — a club plan is an `entitlement` row on a book instead of
a user, and `my_plan()` learns to look at both. Do it only when the Stage 4
numbers say groups, not hosts, are the buyer.

---

## What you decide, and when

| Decision | Needed by | Default if you say nothing |
|---|---|---|
| Co-host: can a second person *record* a night? | Stage 1 (1g) | no — read-only members, as today |
| Who may start a group — your code, or anyone? | Stage 1 (1a) | your code until Stage 3's captcha |
| Apple account: individual or company? | Stage 2 | individual |
| Passwords, ever? | Stage 2 | no — magic link, Apple, Google. The review demo account is the one exception |
| Price and trial | Stage 4 | `pricing-model.md` §4 as written |
| Book Pass as a second product? | Stage 4 | leave it out of the first release |
| Web checkout? | after Stage 4 | no |

## What only you can do (no session can reach these)

Supabase dashboard toggles and SMTP; the Resend DNS records; creating the Apple
and Google developer accounts; App Store Connect and Play Console products,
offer codes, testers and review submissions; RevenueCat project setup and its
webhook secret; EAS environment variables. Each stage above lists its own. The
code for every stage can be written and tested here.
