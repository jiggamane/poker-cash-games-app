# App Store launch — where the app stands, and the steps to a listing

Written 28 September 2026, from the code on `main` at `8d7b1d1` and the docs
beside it. It answers one question: *what is between this repository and an app
a stranger can install from the App Store?* It sequences work; it does not
re-argue decisions already made. Where it leans on another doc it names it, and
where the two disagree it says which one this follows.

`accounts-roadmap.md` (25 September) is the staged plan for accounts, stores
and money. This file is the App Store half of it, spelled out step by step
against what is actually built today. The stages are its stages: **the app is
at the end of Stage 1, and the App Store is the exit of Stage 3.**

---

## 1. Where it stands

### What is in place

| | State |
|---|---|
| Code health | `npm run check` green: 61 test files, 1014 tests, typecheck clean. `main` is the trunk, nothing stranded (`branches.md`), 51 commits since 20 September. |
| Money engine | `packages/core` with the canonical night asserted to the dollar; settled nights frozen and re-derivable (`verification.md`). |
| Server | One Supabase project, 20 migrations, RLS as the whole security model, watcher access stamped into the JWT, Resend SMTP on `pokercashapp.com`, a daily keep-awake. |
| Identity | Host by magic link (invite-only), member by ten-character code, watcher by share link. Plans and founders in `0018_accounts.sql`, read by `my_plan()`. |
| Store identifiers | `com.pokerclub.app` on both platforms, display name *The Poker Club*, scheme `pokerclub`, 1024×1024 RGB icon, Android adaptive icon set. |
| Build plumbing | EAS project `938b4629…` on account `decusgames`; `eas.json` with `development`, `preview`, `production` profiles and remote auto-incrementing build numbers; `app.config.js` already switches `runtimeVersion` between Expo Go and a standalone build. |
| Distribution today | An EAS Update opened in **Expo Go** (`live-test.md`, `expo-go.yml`) and a browser preview on GitHub Pages. |

### What has never happened

- **No native build has ever been made.** Not one `eas build`, on either
  platform. Nobody has run this app as an installed app.
- **No Apple Developer account, no App Store Connect record, no TestFlight,
  no Play Console.** The 25 September decision is to enrol as the company,
  which needs a D-U-N-S number first.
- **No production environment variables on EAS.** The two Supabase values
  reach Expo Go from repository secrets at publish time; a standalone build
  gets them from EAS, and nothing has been set there.
- **The UI gate does not run in this container** — Playwright is deliberately
  not a dependency. It was last green in the sessions that merged the
  game-admin cut; this file does not vouch for it (see §5).

### Position against the roadmap

| Stage | Status |
|---|---|
| 0 · Friends on Expo Go | **Done.** SMTP, keep-awake, published update. |
| 1 · Friends start their own groups | **Built server-side**, four items open: app lock, Settings → Admin, account deletion, `ensureBook` same-name guard. |
| 2 · Real builds (TestFlight, Play closed test) | **Not started.** This is where App Store work begins. |
| 3 · Store launch, free | Not started. |
| 4 · Paid via RevenueCat | Not started, and **not part of the launch** — the launch is free by design (roadmap Stage 3, first paragraph). |

---

## 2. The gaps, sorted by what refuses the app

Three kinds of gap, and they are not equally urgent. The first kind is a
rejection at review. The second is a build that installs and then cannot do
its job. The third is what a stranger meets in the first minute.

### A. App Review will refuse it for these (guideline in brackets)

| # | Gap | Where it is today |
|---|---|---|
| A1 | **No account deletion** [5.1.1(v)]. The app creates accounts — anonymous ones for every watcher, email ones through the promo-code path in `plan.ts` — so in-app deletion is mandatory. Nothing exists in the app or the database, and five foreign keys to `auth.users` are `on delete restrict` (`0001` host, `0002`, `0007`), so a delete would fail at Postgres today. | `accounts-and-groups.md` §"missing", roadmap Stage 1 open item. Blocked on one product question: what happens to a host's group and to nights other people played in. |
| A2 | **Privacy policy URL and support URL** [5.1.1, App Store Connect requires both]. **Written 28 September**: `docs/privacy.html` and `docs/support.html`, published by `pages.yml` at `https://jiggamane.github.io/poker-cash-games-app/privacy.html` and `/support.html`. Three claims on them wait on the repo and the owner: *Delete account* (A1/D2), the mailbox `support@pokercashapp.com` (not confirmed to exist), and the Supabase region (D7) — the HTML comment at the top of `privacy.html` lists them. | `docs/privacy.html`, `docs/support.html`. |
| A3 | **Prices on screen with nothing to buy** [3.1.1]. `PlanGate.tsx` prints Regular $2.49 / mo and Full $9.99 / mo, rendered from `new-night.tsx`, with a disabled buy button. And **promo codes unlock a plan** through `redeem_promo_code` on the sign-in sheet — Apple reads that as unlocking a feature with a key other than IAP. | Both are Stage 4 surfaces that leaked into a Stage 3 build. For a free launch: hide the price strings and the code field on iOS, or gate them off entirely until IAP exists. |
| A4 | **The reviewer cannot sign in.** The only sign-in is a magic link to an invited address; a reviewer cannot receive one. Apple requires a working demo account in the review notes. | Roadmap Stage 3 says a password account made for review; `player-identity.md` says "no passwords, anywhere, ever". One of those has to give — see decision D3. |
| A5 | **Gambling adjacency** [5.3]. The app records real money at a poker game. It hosts no play, takes no stakes, moves no money — a scorekeeper — but the word *poker* is in the name and every screen. | Prepare the review note in advance (`pricing-model.md` §6), answer the age-rating questionnaire honestly, expect 17+. |
| A6 | **Developer text on user screens** [2.1 / 4.0 fit and finish]. `sign-in.tsx` tells the user to edit `apps/mobile/.env`; `RedirectNote` prints the Supabase dashboard path on every build. | Ship copy for the "no server" state or make the state unreachable in a production build. |
| A7 | **Fake data on first launch.** A fresh install opens on a seeded live night, "The Thursday game", host *Andro*, in USD (`sampleNight.ts`, `nightStore.ts:463`, marked TEMPORARY). A reviewer sees a money ledger they did not enter. | `first-run.md` recommends a first-run screen and moving the demo to Settings → *See an example night*. Nothing of it is built. |
| A8 | **App name.** *The Poker Club* has to be unique on the App Store, and poker apps are numerous. | Check availability in App Store Connect on day one; have a second name ready. |

### B. A standalone build will install and then not work

| # | Gap | Where |
|---|---|---|
| B1 | **Supabase URL and key** must be EAS environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Without them the client points at `unconfigured.supabase.co` and refuses every request. | `supabaseConfig.ts`; `auth-test-period.md` "Invalid API key". |
| B2 | **`pokerclub://auth-callback` is not on the Supabase redirect allow-list.** The dashboard has only ever been told the `exp://` form. An unlisted redirect falls back silently to the Site URL. | `bugs.md` B88/B66; `auth-test-period.md` step 6. |
| B3 | **Share and invite links are `pokerclub://…` only.** Someone without the app cannot open one; there is no https fallback and no universal links (`associatedDomains`, AASA). Today watchers without the app are told to paste a token into the GitHub Pages URL by hand. | `shareLink.ts`, `invites.ts`, `somebody-elses-phone.md`. The typed ten-character code is the working fallback for invites; there is none for watching. |
| B4 | **Splash screen is not configured.** No `splash` key, no `expo-splash-screen` plugin, `splash-icon.png` referenced nowhere — the build gets Expo's default. | `app.json`. |
| B5 | **Export compliance flag** absent (`ITSAppUsesNonExemptEncryption: false` in `ios.infoPlist`). Not a blocker, but every upload asks the question until it is set. | `app.json`. |
| B6 | **`submit.production` is empty** — no `ascAppId`, no Apple team id. | `eas.json`. Filled in once the App Store Connect record exists. |
| B7 | **The Expo Go SDK pin becomes free.** With a dev client and TestFlight, Expo Go stops being a channel, and the pin in `AGENTS.md`, the `exposdk:` literal and the CLAUDE.md sentence move together. Keep the `expo-go` update branch alive until every friend has moved. | `apps/mobile/AGENTS.md`, `app.config.js`. |
| B8 | **Two "fixed" sync bugs have never been seen on a phone**: B96 (a member's phone handed the host's controls, writes refused, queue halted) and B91 (a watch link signing in as *unknown* and trying to push the whole book). Both halt the outbox, which is the failure that loses nights. | `bugs.md` 163, 284. |
| B9 | **Handover has never crossed a real table**: 0016/0017/0020 and the game-admin screens are "not yet seen on two phones". | `screens.md` 112–118, `storage-and-sync.md` 431. |

### C. What a stranger meets

| # | Gap | Where |
|---|---|---|
| C1 | **B57, open: removing a player revokes nothing.** The removal never reaches the server, so a removed person keeps reading every night and settlement. There is also no leave-group and no delete-group anywhere. Privacy, and the one open bug that should not ship. | `bugs.md` 1345, 1383. |
| C2 | **Signups closed, no captcha, no anonymous-user cleanup.** `shouldCreateUser: false` is the beta gate; opening it needs the captcha on first, and the pile of one-anonymous-user-per-device needs a job. | `supabase.ts:120`; roadmap Stage 3 backend list. |
| C3 | **One Supabase project, free tier.** No dev/prod split, pauses after seven idle days (held off by a cron), no backups. Strangers' money in the book wants Pro ($25/mo) and point-in-time recovery. | `setup-supabase.md`, roadmap Stage 2–3. |
| C4 | **No crash reporting.** Sentry has an Expo plugin; nothing is wired. | — |
| C5 | **Tier vocabulary is split**: the server says free / pro / club, the design and owner say Free / Regular / Full, `membership.ts` answers Full for everybody, and Settings → Plan prints the old words. **For a free launch this is fine as behaviour** — everyone may run a game — but the Plan row and PlanGate strings are what a stranger reads. | `screens.md` 167–191, `pricing-model.md` header. |
| C6 | **No onboarding, no first-run, no empty state for a brand-new account** beyond the seeded night. Currency is editable only inside New session; the seed is USD. | `first-run.md`. |
| C7 | **Copy not signed off**: fourteen UNSURE strings from the game-admin cut on screen, `/sign-in` and `/auth-callback` copy entirely invented, `/end-time` undrawn, six plan strings "want review". | `screens.md` 193–244, 2789–2817. Copy is final in this repo — these need the designer or owner before a stranger reads them. |
| C8 | **Screen coverage**: 0 of 39 routes formally conformed to their boards; `/invite` and `/claim` only ever audited in their offline fallback (B51); nine fixes "not yet seen on a phone". | `screens.md` tally, `bugs.md`. |

---

## 3. Decisions only the owner can make

Each of these blocks a step below. None can be decided by a session.

| # | Decision | Default this plan assumes |
|---|---|---|
| D1 | **Sign in with Apple in the launch build, or magic link only?** Guideline 4.8 forces Sign in with Apple only when another third-party login (Google) is offered. Magic-link-only is compliant and is what exists. Apple + Google is the better end state (roadmap Stage 2) and roughly a week of work plus OAuth console setup. | **Magic link only for the first TestFlight; Apple + Google before public launch** if time allows, otherwise ship without and add in the first update. |
| D2 | **What account deletion does to a host's group.** Worked out in `design-request-account-deletion.md`: the person leaves, the record stays. A group nobody else ever claimed a seat in is deleted with its host; a group with members is closed and kept, hostless and read-only; the only refusal is while a game is running on the account, and it always ends. Five schema changes are needed before any delete can succeed. | **As that file says**, immediate, confirmed by the app's one 1.5 s hold. Handing a group over first is a separate feature that deletion does not wait for. |
| D3 | **How the reviewer signs in.** A password account (against `player-identity.md`), or a review-only door: a fixed six-digit OTP for one allow-listed address, or a pre-issued invite code that seats the reviewer in a demo group. | **A single password account, created in the dashboard, that exists only for review**, and no password UI for anyone else. It is the smallest change and what Apple expects. |
| D4 | **First launch: empty, or the demo night?** | **Empty, with a one-screen first run**, per `first-run.md`; the demo moves to Settings on devices and stays the web preview's default. |
| D5 | **Age rating.** Answer *simulated gambling: none*, *gambling references: frequent* honestly, or contest a 17+. | **Accept 17+.** |
| D6 | **Free launch confirms `membership.ts` stays "Full for everybody".** The gates are drawn but unreachable; the alternative is to finish tier mapping first, which is Stage 4 work. | **Launch free with no gate**, hide prices and the code field on iOS (A3). |
| D7 | **Supabase region and data location** for the privacy policy — is the project in the EU? | Read it off the dashboard; write it into the policy. |
| D8 | **Company enrolment**: D-U-N-S number in hand or not? | Start it on day one; it is the long pole. |

---

## 4. The plan, step by step

Ordered by dependency, not by size. Owner steps are things no session can
reach (browsers, consoles, money). Repo steps are code, testable here, merged
to `main` under the usual gate. Weeks are elapsed time with one person on it
part-time; the critical path is Apple's paperwork, not the code.

### Step 0 — Start the clocks (owner, day 1)

1. **Apply for the D-U-N-S number** if the company has none (free, days to two weeks). Then **enrol in the Apple Developer Program as the company** ($99/yr). Nothing else on the iOS side can begin until this clears.
2. **Open Google Play Console as the company** ($25). An organisation account skips the 12-tester / 14-day closed-test rule. Android is not the goal here but it costs nothing to start now, and it is the platform a friend can install a build on tomorrow.
3. **Reserve the name.** In App Store Connect create the app record with bundle id `com.pokerclub.app` and name *The Poker Club*; if the name is taken, decide the fallback now (A8).
4. **Answer D1–D8** above. D2 and D3 unblock code work in Step 2.

### Step 1 — First native build on a phone (repo + owner, week 1)

The point of this step is to learn what only an installed app can teach,
before any store paperwork. Android first because it needs no Apple account.

Repo:

1. `app.json`: add the `expo-splash-screen` plugin with `splash-icon.png` on the `#0A0A0B` background (B4); `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` (B5). Both in `bundledNativeModules.json` terms per `AGENTS.md`.
2. Production copy for the "no server" and redirect states (A6): the sentences in `sign-in.tsx` that name `.env` and the dashboard become a user sentence, and `RedirectNote` shows only in development builds.
3. Add `eas build` and `eas submit` as a manual workflow beside `expo-go.yml`, gated on `npm run check`, reading `EXPO_PUBLIC_SUPABASE_*` from EAS not from repository secrets.

Owner:

4. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as **EAS environment variables** for `preview` and `production` (B1).
5. Add `pokerclub://auth-callback` to Supabase → Authentication → URL Configuration (B2).
6. `eas build --profile preview --platform android`, install the APK, and run a real night on it: sign in by magic link, seat a friend by code, share a watch link, settle. **This is the first time the app runs outside Expo Go.**
7. Once Apple clears: `eas build --profile preview --platform ios` to a registered device, same night.

Exit: a night recorded on an installed build, synced, and re-opened after a
reinstall (`storage-and-sync.md` "pull after reinstall" is not built — note
what that costs here and decide whether it goes in Step 2).

### Step 2 — Close the review blockers (repo, weeks 1–3, in parallel with Step 1)

Each is one session and one screen, per the CLAUDE.md rule on disjoint files.

1. **Account deletion (A1, D2).** A migration: relax the `on delete restrict` keys to `set null` where the row must outlive the person (`book.host_user_id` cannot — a book with no host is the D2 question), a `delete_my_account()` function that refuses while the caller hosts a book with other members, and cascades grants and anonymous rows. Settings → Account → *Delete account*, with the refusal sentence. `db:verify` suite for it. Needs a board for the row and the confirm sheet — flag the strings.
2. **B57 (C1).** Sync the removal; revoke the read grant on the server; add leave-group for a member. This is the one open bug that is a privacy fault.
3. **Hide Stage 4 surfaces on iOS (A3, D6).** `PlanGate` shows no prices and no buy button; the sign-in sheet shows no *Code* field; Settings → Plan prints *Free* / *Full* in the decided vocabulary and nothing about pro or club. Behind a single `storeSafe` flag so Stage 4 turns it back on in one place.
4. **First run (A7, D4).** Retire the device seed; keep it for web. One first-run screen per `first-run.md`. Needs a board.
5. **Review account (A4, D3).** Password sign-in for exactly one allow-listed address, created in the dashboard; a demo group with three seated players and one settled night so the reviewer can reach `/settled`, `/stats` and a watch link without help.
6. **Verify B96 and B91 on two installed phones (B8)**, and play one handover across a table (B9). Log the result in `bugs.md`.
7. **Web fallback for links (B3).** The `/watch` and `/claim` routes already exist in the web export on GitHub Pages; make the share sheet emit the https form and the app claim `associatedDomains` for that host. Universal links then open the app when installed and the browser when not. This turns the hand-pasted token in `somebody-elses-phone.md` into the normal path.

### Step 3 — TestFlight with the group (owner + repo, week 3–4)

1. `eas build --profile production --platform ios`, `eas submit` to TestFlight **internal** testing (no review, up to 100 team members) for the close friends; **external** testing with a public link for the wider group once one build has passed Beta App Review.
2. Move the `expo-go` friends over; keep publishing to `expo-go` until the last of them has installed. Then retire the channel and move the SDK pin (B7) in one commit.
3. **Two Supabase projects**: the existing one is production; make a free dev project for `development` builds so no experiment touches real nights.
4. **Supabase Pro** before strangers (C3). Turn on daily backups; decide on PITR.
5. Wire **Sentry** through its Expo plugin (C4) — one more thing only a dev build can carry.
6. Three real nights on TestFlight, each followed by `npm run audit`. Anything that halts the outbox is a launch blocker; `docs/bugs.md` gets the entry before the fix.

Exit (roadmap Stage 2): a friend deletes the app, reinstalls from TestFlight,
signs in, and every night and claimed seat is still theirs.

### Step 4 — The listing (owner, week 4–5)

1. **Privacy policy and support page** (A2) — written, see the row above. Before pasting the URLs into App Store Connect: fill in the region (D7), confirm the mailbox, and re-read the deletion paragraph against what Step 2.1 actually built. Add Sentry to the processors table when Step 3.5 wires it. Terms of service can wait for Stage 4, but a short one costs little now.
2. **Privacy nutrition labels** in App Store Connect, matching the policy exactly: contact info (email), user content (the ledger), identifiers (user id), diagnostics (if Sentry). No tracking.
3. **Age rating questionnaire** (A5, D5).
4. **Screenshots**: 6.9" and 6.5" iPhone sets required. `scripts/ui-check.mjs shot` already captures every route at 402×874 from the web export; real device captures from TestFlight are better and Apple accepts either. Dark and light both exist — pick one per set.
5. **Metadata**: name, subtitle, description, keywords, category *Utilities* or *Finance* (not *Games* — that is the gambling shelf), support URL, privacy URL.
6. **Review notes**: the "this is a ledger" paragraph; the review account credentials; a one-line walk-through (sign in → the demo group → tonight → settle → who pays whom). State plainly that no money moves through the app.
7. **Backend for strangers** (C2): captcha on in Supabase (hCaptcha or Turnstile, the app needs the token plumbing — a repo step), the anonymous-user cleanup job, then `shouldCreateUser: true`. A free account can do nothing a watcher cannot, and the plan gate is in the database.

### Step 5 — Submit (owner, week 5)

1. `eas build --profile production` then `eas submit --platform ios` with `submit.production` filled in (B6).
2. Submit for review with manual release, so a green review does not publish at 3 a.m. on a poker night.
3. Expect one rejection round; the likely reasons in order are 5.1.1(v) deletion wording, 3.1.1 if any price string survived, and the gambling questionnaire. Each answer is already written above.
4. On approval, release, then publish the same JavaScript to the `production` EAS Update channel so a money fix reaches installed phones without a review cycle (`build-plan.md` §1 — this is why Expo was chosen).

### Step 6 — After launch (not this plan)

Stage 4: RevenueCat, IAP products, the webhook into `entitlement`, the tier
mapping, `storeSafe` off. `accounts-roadmap.md` has it in full. Nothing in
Steps 0–5 has to be undone for it — that is the reason the plan table came
first.

---

## 5. What this file could not check

- **`npm run check:ui`** needs Playwright installed outside the repo. This
  session installed it and ran the gate; the web export built, and the run was
  cut off by a ten-minute limit in the audit step with nothing reported, so the
  result is **not known here** — neither red nor green. Nothing in this commit
  touches `apps/mobile`, so the merge did not need it. Regardless, a screen bug
  a check cannot see is not fixed (`CLAUDE.md`), and 0 of 39 routes are
  formally conformed.
- **Supabase dashboard state** (anonymous sign-ins, the token hook, SMTP, the
  redirect list) — `state-check.sql` row 93 lists the toggles no query can see;
  this container cannot reach the project.
- **Whether *The Poker Club* is available as an App Store name.**
- **The company's D-U-N-S status.**

## 6. Effort, roughly

| | Owner time | Repo sessions |
|---|---|---|
| Step 0 | an afternoon, then waiting on Apple | — |
| Step 1 | an evening per platform | 2 |
| Step 2 | decisions D2–D4, two boards | 6–7, one screen each |
| Step 3 | three poker nights | 2–3 |
| Step 4 | a day | 1 (captcha plumbing) |
| Step 5 | an hour, then Apple's queue | — |

Five to six weeks elapsed if the D-U-N-S number exists; add up to two if not.
The code is the smaller half. The paperwork, the two boards, and three real
nights on an installed build are the larger half, and none of them can be
hurried from here.
