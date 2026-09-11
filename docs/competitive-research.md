# Competitive research — home-game ledger apps, September 2026

The Poker Club against every app found in the iOS App Store, Google Play and on the
web that does the same job (a home cash game's ledger and settlement) or a
neighbouring one (bankroll trackers with a home-game mode, digital-chip apps,
expense splitters, online private-club platforms, tournament and league managers
that carry a cash ledger). Compiled 11 September 2026.

**How to read it.** §1 is the answer. §2 is how the evidence was gathered and what it
cannot say. §3 maps the field. §4–§6 are the tables: features, money-rule
flexibility, pricing. §7 is what users say, in stores and on the two forums where
hosts actually talk. §8 is the gap list, both directions. §9 is what to do about it.
§10 is the source list.

---

## 1 · The answer

**The category is a crowd of very young, very small apps, and none of them has an
audience yet.** Of the 27 direct competitors found, all but one were first
published between mid-2025 and 2026, most are the work of one developer, and the
App Store shows *"not enough ratings to display"* on nearly every listing. The
only products in the neighbourhood with a real review base are the personal
bankroll trackers (Poker Bankroll Tracker, Poker Analytics, Pokerbase), the
expense splitters (Splitwise, Settle Up) and the online table Poker Now — none of
which is built for a host's cash box.

**Table stakes are settled.** Every direct competitor does the same five things:
log buy-ins and rebuys, log cash-outs, take a final chip count, name who pays
whom, keep a history. Fourteen of the 27 also claim a minimum-transfer
optimiser. We match the five and are deliberately *not* minimal on the sixth
(§4, note on `matchTransfers`).

**Where we are ahead** — and where no competitor listing even uses the words:

- A **money-rules engine** with a destination (bill, piggy bank, host, next pot),
  a basis (percent or fixed), a charge (winners only or everyone), a split (by
  size of win, evenly, by hand), per-night exemptions and hand-typed shares, and
  club defaults that a night snapshots. The nearest competitor (PokerPot) has
  "room fees and food/drinks splitting"; the next nearest (Poker Night Ledger)
  records tips, rake and expenses as line items. Nobody else has the concept of
  a rule.
- **Rounding as a rule**, with largest-remainder apportionment so positions still
  sum to zero. No competitor mentions rounding at all.
- A **close gate**: the night cannot settle until counted chips equal chips on
  the table, or the host has acknowledged the exact difference and assigned it
  (to a player, or to *Unaccounted*). Three competitors have a weaker cousin
  (Poker Night Ledger's AI discrepancy finder, Poker Night Host's final-stack
  balance check, PokerPot's auto-split of differences).
- An **append-only ledger** with corrections and voids as new rows, frozen
  settlements, and an end-to-end re-verification of every closed night. Three
  competitors mention an activity log; none describes immutability.
- **Read-only watchers** over a link (with the token in the JWT so realtime
  works), **per-player invite codes** with constant-time refusal, and
  **offline-first** writes with an ordered outbox. Competitors that sync are
  account-first; competitors that are offline are single-device.
- **Who has paid**: a settled night tracks each transfer as paid or owed, with a
  one-message nudge. Only Splitwise and Poker Now's clubs track payment state.

**Where we are behind** — features that several competitors ship and we do not:

| Gap | Who has it | Our state |
|---|---|---|
| Leaderboards, streaks, head-to-head | 11 of 27 | None; `docs/screens.md` notes "the leaderboard is now one list" |
| A second pair of hands entering money (co-host) or players requesting their own rebuys | Poker Night Ledger, ivey Home, Tilt, Chip & Split, TableCap, PartyPot, Splitwise | One writer, by design |
| Export (CSV, PDF, image) | Poker Night Host, Poker Buy Manager, Poker Now, Bink, Poker Bankroll Tracker | None; three plain-text shares only. `docs/sharing-formats.md` is research without code |
| Payment handles or pay links (Venmo, Zelle, PayPal) on the settlement | Home Poker – Track Buy-Ins, TableCap, Splitwise | None |
| Chip denominations / a chip-setup calculator | SettleChip, PokerPall, PokerStack, PokerPot (exchange rates) | None; a count is a typed amount |
| Scheduling, RSVP, date polling | Poker Night: Home Games, GameNight, Poker Host Pro | None; deliberately out of scope |
| Notifications | Poker Ledger Tracker (Telegram), Poker Night: Home Games | Deferred to v2 |
| Store presence | 25 of 27 are in a store | Expo Go only, v0.1.0 |
| Minor units (cents) | Everyone with money at all | `'cents'` throws; whole units only |

**What users complain about, across the neighbourhood**, is remarkably consistent
and mostly not about features: subscriptions where a one-time purchase was
wanted; features that were free being moved behind a paywall; data that vanished
after an offload, an update or a sync change; crashes; support that does not
answer; a ledger whose numbers could not be trusted. Every one of those is a
place our design already has an answer (§7.3).

---

## 2 · Method and limits

- **Sources.** Web search snippets of App Store and Google Play listings (the
  store hosts themselves are blocked by this session's network policy, so
  nothing was fetched from them directly), the developers' own sites,
  JustUseApp's review aggregates, Poker Now's public GitLab issue tracker, and
  threads on Poker Chip Forum and Two Plus Two's Home Poker forum. Every claim
  about a competitor is what its listing or site says, not what a test of the
  app found.
- **Ratings.** Where a listing's rating and count were visible they are quoted.
  For most direct competitors the store shows no rating at all, which is itself
  the finding.
- **"Not stated" is not "absent".** A feature marked ○ in §4 is one the listing
  does not mention. A listing is marketing copy and short; some of these apps may
  do more than they say.
- **Our side** is read from the code, not the handoff: `apps/mobile/app/*`,
  `packages/core/src/*`, `supabase/migrations/*`, and `docs/screens.md`,
  `docs/bugs.md`, `README.md` for what is marked open.

---

## 3 · The field

Six tiers, by how close the job is to ours.

| Tier | What it is | Apps found |
|---|---|---|
| **A · Direct: home-game session ledgers** | Buy-ins, cash-outs, chip count, who pays whom | Poker Night Ledger · Poker Ledger Tracker · PokerSquad · ChipUp · Tilt · PokerPot · Poker Night: Home Games (+ Poker Night Calculator) · Pokertally · Poker Tally (Android) · SettleChip · PokerBank · Home Poker – Track Buy-Ins · Poker Homie · HomeGame Poker Tracker · Poker Night Host · PokerNight: Poker Game Tracker · PokerNight – Home Game Manager · ivey Home · Poker Buy Manager · Chip & Split · Cash Out Poker · ChipSplit · Casino Split · Poker Buy-In Tracker · Poker Track · Stack Tracker · PokerLedger (web) |
| **B · Bankroll trackers with a home-game mode** | Personal P&L first; some grew a hosted-game or table feature | Poker Bankroll (Media Revolution, "Live Bankrolls") · Bink ("banking tab") · Poker Analytics ("home game manager") · Poker Bankroll Tracker (friends watch live) · Pokerbase · Poker Income · Poker Stack · Poker Manager · Poler · Poker Ledger Pro · Poker Ledger Bankroll Tracker |
| **C · Digital chips / virtual table** | Phones replace chips; settlement falls out at the end | TableCap · PartyPot · Chip Runner · Chips of Fury · PokerChip.live · Live Poker Tracker · Poker Chips Tracker · Pocket Poker Chips |
| **D · Expense splitters** | Generic debts; poker is a use case with a workaround | Splitwise · Settle Up · Tricount |
| **E · Online private clubs with a ledger** | The game itself is online; the ledger is a by-product | Poker Now (+ Clubs) · PokerBros · ClubGG · PPPoker |
| **F · Tournament / league managers with a cash ledger** | Clock, blinds, seasons; a cash-game ledger bolted on | PokerPall · Poker Night (getpokernight.com) · PokerNite · GameNight · Poker League · HPTM · Poker Host Pro |

**Observations about the field**

1. **Age.** Store IDs in the 674xxxxxxx–680xxxxxxx range, "since June 2025",
   "updated January 2026", "updated May 2026". The category did not exist two
   years ago; it is being created by a dozen solo developers at once.
2. **iOS first.** Sixteen of the 27 direct competitors are iOS-only. Both-store
   presence: ChipUp, Tilt, Poker Night: Home Games, Pokertally, SettleChip,
   PartyPot, Poker Bankroll. Android-only: Poker Tally, Poker Night Calculator,
   Poker Buy-In Tracker, PokerPall.
3. **Three different products are called "Poker Tally"**, two are called
   "PokerNight", two "Poker Ledger", two "Poker Night". Naming in this space is
   already a collision field.
4. **Two price models, one of them resented.** Freemium with a subscription
   ($3.99–$4.99/month or $19.99–$39.99/year; Pokertally charges the host
   $29.99/year and lets players in free; Poker Ledger Tracker charges
   $29.99/month for club operators) against free-with-one-time-unlock (Poker
   Night Host, PokerPall, Poker Manager, Settle Up's Group Premium). Reviews in
   §7 show which one users forgive.
5. **Social features are the current arms race**: monthly leaderboards,
   nemesis/head-to-head, streaks, trophies, "Poker Wrapped", AI recaps written
   "like sports commentary". Five apps ship something in this family. None of
   it is about the money.
6. **The money itself is thin.** Only five listings mention any kind of
   deduction (rake, food, tips, room fee, staff pay), and each is a line item,
   not a rule. Nobody mentions rounding. Three mention a balance check.

---

## 4 · Feature matrix

● built and stated · ◐ partial or paywalled · ○ not stated (see §2) · — not applicable

### 4a · The ledger itself

| App | Buy-ins, rebuys, cash-outs | Final count | Who pays whom | Min-transfer optimiser | Deduction rules (food, rake, host, tips) | Balance check (chips vs cash) | Corrections and voids with a log | Payment state (paid / owed) |
|---|---|---|---|---|---|---|---|---|
| **The Poker Club (ours)** | ● | ● typed amount | ● | ◐ deterministic greedy, not minimal | ● bill · piggy bank · host fee · next pot; % or fixed; winners or everyone; three splits; exemptions; hand-typed shares | ● close gate; acknowledged difference; *Unaccounted* party | ● append-only, corrections chain, verify on close | ● tick paid, mark all, nudge |
| Poker Night Ledger | ● | ● | ● | ○ | ● tips, rake, dealer downs, food/drinks, expenses | ● AI finds where the cash gap came from | ○ | ○ |
| Poker Ledger Tracker | ● | ● | ● | ○ | ● staff/dealer pay, per-session expenses | ● automatic balance verification | ○ | ◐ balances |
| PokerSquad | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| ChipUp | ● | ● | ● | ◐ "smart suggestions" | ○ | ○ | ○ | ◐ payment summaries |
| Tilt | ● | ● | ● | ● | ○ | ○ | ○ | ○ |
| PokerPot | ● | ● remaining chips | ● | ◐ Pro | ● room fee, food/drinks split | ◐ auto-split differences evenly or by ratio | ○ | ○ |
| Poker Night: Home Games | ● | ● | ● | ● | ○ | ○ | ○ | ○ |
| Pokertally | ● | ● | ● | ● | ○ | ○ | ● full audit trail | ○ |
| Poker Tally (Android) | ● | ● | ● | ● | ◐ rake | ○ | ◐ activity log | ○ |
| SettleChip | ● | ● | ● | ● | ○ | ○ | ○ | ○ |
| PokerBank | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| Home Poker – Track Buy-Ins | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| Poker Homie | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| HomeGame Poker Tracker | ● | ● | ● | ○ | ◐ mid-session adjustments | ◐ "P&L reconciliation" | ◐ | ○ |
| Poker Night Host | ● | ● | ● | ● | ○ | ● final-stack balance check | ◐ activity ledger | ○ |
| PokerNight: Poker Game Tracker | ● | ● | ● | ● | ○ | ○ | ○ | ○ |
| ivey Home | ● | ● | ● | ● host-style or minimal | ◐ tips per player | ◐ chip-stack photo on cash-out | ○ | ○ |
| Poker Buy Manager | ● | ● | ● | ○ | ○ | ◐ | ● edit mistakes with activity log | ○ |
| Chip & Split | ● | ● each player submits own | ● | ● | ○ | ○ | ○ | ○ |
| Poker Bankroll (Live Bankrolls) | ● | ● | ◐ leaderboard shows who owes | ○ | ○ | ○ | ◐ timestamped feed | ○ |
| Bink (banking tab) | ● | ● | ◐ | ○ | ◐ personal expenses/tips | ○ | ○ | ○ |
| Poker Now | ● online | — automatic | ● transactions list | ◐ | ○ | ◐ (see §7.2) | ○ | ◐ club balances |
| Splitwise | ◐ via a fake "The Bank" member | ○ | ● | ● "Simplify debts" | ○ | ○ | ◐ | ● |
| TableCap (web) | ● | ● | ● | ● | ○ | ○ | ○ | ○ |
| PartyPot | ● digital chips | — | ● | ● | ○ | ○ | ● transaction history | ○ |
| PokerPall | ● | ● | ● | ○ | ◐ payout splits, custom % | ○ | ○ | ○ |

A note on the optimiser column. `matchTransfers()` in `packages/core/src/settlement.ts`
pairs the largest debtor with the largest creditor until the table clears. It is
reproducible and a debtor's payments stay together in the list; it is explicitly
not the NP-hard minimum. Fourteen competitors *claim* "fewest transfers"; one
(Poker Night Calculator) says out loud that it is "optimized, not just greedy".
Whether any of them is truly minimal is not testable from a listing.

### 4b · People, sharing, data, platform

| App | Groups / roster | Per-player stats & history | Leaderboards, streaks | Live view on other phones | Other people enter money | Pay links / handles | Offline, no account needed | Export | Currencies | Chip setup / denominations | Scheduling, RSVP | Platforms | Price |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **The Poker Club (ours)** | ● clubs, roster, one admin, invites by code/QR | ● My stats (month/year/all), Sessions; net after deductions | ○ | ● read-only watch link, realtime | ○ one writer | ○ | ● offline-first, sign-in never a gate | ○ plain-text share only | ● 156, one per group, whole units | ○ | ○ | iOS + Android via Expo Go only; web preview | none yet (v0.1.0) |
| Poker Night Ledger | ◐ | ● | ○ | ● co-host sync by code/QR | ● co-host | ○ | ○ | ○ | ○ | ○ | ○ | iOS | not shown |
| Poker Ledger Tracker | ● | ● | ○ | ◐ Telegram alerts | ○ | ○ | ○ | ○ | ○ | ○ | ○ | iOS, Mac | $29.99/mo · $249.99/yr, 1-mo trial |
| PokerSquad | ● squads | ● win rate | ● live leaderboards | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ | iOS | free ≤5 players; Pro $3.99/mo · $19.99/yr |
| ChipUp | ● multiple private groups | ● | ● rankings | ● group sees data | ◐ invited players can edit | ○ | ○ account | ○ | ○ | ○ | ○ (site lists brackets) | iOS, Android | free; Pro undetailed |
| Tilt | ● groups | ● lifetime P&L, biggest pot | ● monthly, trophies | ● | ● players request rebuys, host approves | ○ | ◐ Sign in with Apple; guests need no app | ○ | ○ | ○ | ○ | iOS, Android | free, no ads |
| PokerPot | ● clubs by 6-digit code | ● career dashboard, hourly | ● per club | ● | ○ | ○ | ○ | ○ | ◐ chip→cash exchange rate | ◐ custom stacks | ○ | iOS | free; Pro unlimited clubs, settlement paths |
| Poker Night: Home Games | ● shareable links | ● | ● monthly/all-time, streaks, nemesis, AI recaps, Wrapped | ● | ○ | ○ | ○ | ○ | ○ | ○ | ● date polling, notifications | iOS, Android | free 3 games/mo, 1 group; Pro $4.99/mo · $39.99/yr |
| Pokertally | ◐ | ● | ○ | ● players join host's game | ○ | ○ | ○ | ◐ share link, screenshot | ○ | ○ | ○ | iOS, Android | players free; host Pro $29.99/yr |
| Poker Tally (Android) | ○ | ◐ history | ○ | ○ | ○ | ○ | ● no internet permission | ○ | ○ | ○ | ○ | Android | free, no ads, no IAP |
| SettleChip | ○ | ● | ○ | ○ | ○ | ○ | ● | ○ | ○ | ● chip breakdown calculator | ○ | iOS, Android | free |
| PokerBank | ○ | ● | ○ | ○ | ○ | ○ | ● local only | ○ | ○ | ○ | ○ | iOS | free, no ads |
| Home Poker – Track Buy-Ins | ● groups | ● P/L charts | ● | ● game codes | ◐ players join | ● Venmo, CashApp, Zelle handles | ○ | ○ | ○ | ○ | ◐ buy-in, blinds, limits at setup | iOS | free |
| Poker Homie | ○ | ◐ | ○ | ◐ host transfer | ○ | ○ | ● | ○ | ○ | ○ | ○ | iOS | free |
| HomeGame Poker Tracker | ● | ● group stats | ◐ | ◐ share data | ○ | ○ | ○ | ◐ "ledger uploads" | ○ | ○ | ○ | iOS, Mac | not shown |
| Poker Night Host | ◐ roster, avatars | ● | ○ | ◐ recap share; Pro cloud sync | ○ | ○ | ● offline-first | ● CSV (Pro) | ◐ USD EUR GBP PLN CAD | ○ | ○ | iOS | free; one-time Pro |
| PokerNight: Poker Game Tracker | ● friends | ● calendar | ● | ● watch-only link | ○ | ○ | ○ | ○ | ○ | ○ | ◐ calendar | iOS | free |
| ivey Home | ◐ presets | ● | ○ | ● | ● co-host assist | ○ | ○ | ○ | ○ | ○ | ○ | iOS | not shown |
| Poker Buy Manager | ○ | ● ROI, charts | ● rankings | ○ | ○ | ○ | ● | ● export/import | ● multiple | ○ | ○ | iOS, Mac, visionOS | not shown |
| Chip & Split | ◐ friends (Pro) | ◐ Pro | ◐ streaks (Pro) | ● live rooms | ● every player | ○ | ● no account | ◐ link | ◐ custom $ values | ◐ custom chips | ○ | iOS | free; Pro $4.99/yr |
| Poker Bankroll (Live Bankrolls) | ◐ invite by code/email | ● | ● live leaderboard | ● | ◐ invited players | ○ | ○ | ○ | ○ | ○ | ○ | iOS, Android | not shown |
| Bink | ◐ follow friends | ● ROI, profit/hour | ○ | ◐ public profiles | ○ | ○ | ○ | ● import/export | ○ | ○ | ○ | iOS | Premium subscription |
| Poker Now | ● clubs (Plus) | ● | ● | ● | — | ○ | ○ | ● CSV | ○ | — | ○ | Web | free; Clubs on Plus |
| Splitwise | ● | ○ | ○ | ● | ● | ● Venmo, PayPal | ◐ | ◐ Pro | ● | ○ | ○ | iOS, Android, Web | free with limits; Pro |
| TableCap | ○ | ◐ lifetime | ○ | ● | ● | ● PayPal links | ● no signup | ○ | ○ | ○ | ○ | Web | free |
| PartyPot | ○ | ○ | ○ | ● QR rooms | ● | ○ | ● no account | ○ | ○ | ● digital chips | ○ | iOS, Android | free, no ads |
| PokerPall | ○ | ◐ premium | ○ | ● QR/link | ● | ○ | ● | ○ | ○ | ● chip calculator | ○ | Android (iOS soon) | free with ads; one-time premium |

---

## 5 · Flexibility — how much the money rules bend

Only the apps that say anything about deductions are in this table. Everything
else in tier A treats the night as buy-ins against chips and nothing more.

| Dimension | The Poker Club | PokerPot | Poker Night Ledger | Poker Ledger Tracker | Poker Tally (Android) | PokerPall | ivey Home | Splitwise |
|---|---|---|---|---|---|---|---|---|
| What can be taken | bill (its expenses), piggy bank, host fee, next pot | room fee, food/drinks | tips, rake, dealer downs, food/drinks, other | staff/dealer pay, expenses | rake | payout split | tips | any expense |
| Percent or fixed | both; whole percent, half-up; % of a loss refused | not stated | line items | line items | not stated | preset or custom % | fixed | fixed |
| Who is charged | winners off their net win, or everyone flat | "split evenly or by ratio" | not stated | not stated | not stated | not stated | per player | chosen per expense |
| How it is split | by size of win · evenly · by hand (with a ceiling) | evenly or by ratio | not stated | not stated | not stated | percentages | not stated | even, shares, exact |
| Where it goes | back to whoever fronted the spend · piggy bank · host · next pot | not stated | not stated | staff | house | not stated | not stated | the payer |
| Group default vs tonight | club defaults; a night snapshots and never writes back; exemptions and hand-typed shares stay on the night | clubs | not stated | not stated | not stated | presets | game presets | per group |
| Per-player exceptions | exempt list; "off for tonight" toggle; pays-piggy-bank per member | not stated | not stated | not stated | not stated | not stated | not stated | per expense |
| Rounding | a rule: off · $10 · $50 · $100; positions apportioned to sum to zero; `roundedBy` on the receipt | not stated | not stated | not stated | not stated | not stated | not stated | none |
| When chips ≠ cash | settle refuses; host acknowledges the exact amount and names who absorbs it, or *Unaccounted* | auto-split the difference | AI names the source | "verification" | not stated | not stated | photo of the stack | n/a |
| Corrections | new rows; a correction can be corrected; a void can be revived | not stated | not stated | not stated | activity log | not stated | not stated | edit in place |
| Currency | 156 ISO codes, one per group, whole units | exchange rate chip→cash | not stated | not stated | not stated | not stated | not stated | multi, converted |

Two honest marks against us in this table: **no cents** (the store column is
`bigint` and `money()` refuses fractions — fine for $5/$5, wrong for a €0.10/€0.20
game) and **no caps** (a percentage rule has no maximum take; PokerPot and the
rest have no caps either, so this is a gap in the category, not against it).

---

## 6 · Pricing in the category

| Model | Apps | Price points |
|---|---|---|
| Free, no ads, no purchases | PokerBank · Poker Tally (Android) · Poker Homie · Tilt · SettleChip · PartyPot · TableCap · Poker Night Calculator · Cash Out Poker | $0 |
| Free with one-time unlock | Poker Night Host (CSV, cloud sync) · PokerPall (ads off, history) · Poker Manager · Settle Up Group Premium | one payment |
| Freemium, subscription, gated by *players* | PokerSquad | free ≤5 players; $3.99/mo · $19.99/yr |
| Freemium, subscription, gated by *games or groups* | Poker Night: Home Games | 3 games/mo, 1 group free; $4.99/mo · $39.99/yr |
| Freemium, subscription, gated by *the settlement itself* | PokerPot | optimiser and unlimited clubs are Pro |
| Host pays, players free | Pokertally | $29.99/yr |
| Club operator | Poker Ledger Tracker | $29.99/mo · $249.99/yr |
| Stats and history behind a small annual | Chip & Split | $4.99/yr |
| Bankroll trackers | Poker Bankroll Tracker ~$10/yr · Poker Analytics up to $29.99/yr · Poler $19.99/yr · Bink monthly/yearly · Poker Income Ultimate $9.99 once | |
| Ours | The Poker Club | nothing yet; `docs/pricing-model.md` holds the thinking |

Gating the settlement (PokerPot) or the host (Pokertally) is the model most at
odds with what the forums say hosts want (§7.4): the host is the one person who
must never be blocked at 1 a.m. with eight people waiting.

---

## 7 · What users say

### 7.1 · Direct competitors: almost nothing, yet

Store ratings visible in listings: PokerBank 5.0 (3), Home Poker – Track Buy-Ins
5.0 (5), Poker Homie 5.0 (8). Every other tier-A listing reads *"hasn't received
enough ratings or reviews to display an overview"*. The few review sentences that
surface are all of one kind:

- HomeGame Poker Tracker: *"It takes the hassle out of accounting"*; *"very good
  poker tracker for group tracking and P&L reconciliation … surprising this
  didn't exist before."*
- PokerBank: *"Easiest way to keep track of home poker games"*; *"most simple app
  to make sure people get paid out."*
- Pokertally (testimonial on its own site): *"I've tried spreadsheets, Venmo
  notes, and other apps. Nothing comes close to how smooth this is."*
- Bink: *"the only app that tracks bankroll, cash game ledger, AND hosts a
  tournament"* — and, from another reviewer, data access lost after the app was
  offloaded, with no reply from the developer.

The signal in that silence: nobody has yet earned a review base by being the
ledger. The first app that does will own the search term.

### 7.2 · Neighbours with a review base: the complaints

| Theme | Where it shows | Quote or paraphrase |
|---|---|---|
| **Subscription resentment** | Poker Bankroll Tracker (Android), StackXo, Poler | "prefer a lifetime purchase"; StackXo "2–3× the price of other trackers" for the quality |
| **Free became paid** | Pokerbase | "features which were once free have been turned into paid features" |
| **Data loss / sync withdrawn** | Bink, Poker Analytics | Bink: data inaccessible after offload, no support reply. Poker Analytics: "wish it could sync with other devices like the older version"; a later version "disables iCloud synchronization permanently" |
| **Crashes** | Poker Income, Settle Up, Poler | Poker Income: "full of ways to crash the app", "blank zombie players named null"; Settle Up: "frequent crashes" after updates |
| **Support** | Poker Stack | support address bounced as undeliverable |
| **No export** | Poker Stack | "for the price, lacks the ability to import/export" |
| **A missing basic** | Pokerbase | "there is nowhere you can add a rebuy" |
| **Ads added to a paid product** | Settle Up | long-term users angry at ads in previously paid versions |
| **Free-tier limits** | Splitwise | daily transaction limits; drafts lost when switching apps; itemising is desktop-only; 34.4/100 JustUseApp score over 19,067 reviews |
| **The ledger cannot be trusted** | Poker Now (GitLab #566, "Ledger is very badly wrong") | after a shutdown with money on the table, "in/out and Net are hopelessly wrong … can we trust the numbers?" |
| **The ledger stops short of payment** | Poker Now (#367 "Session Ledger Payout") | "the Ledger is great, but I still need the payout calculation" |
| **History is not reachable** | Poker Now (#584, #593) | download the ledger of any past game; replay a night from an uploaded ledger |
| **A live table dies with the host** | Chips of Fury | "whoever hosts has to keep the game open the entire time or it closes"; freezes on all-ins so the admin "manually settles" |
| **Tiny controls at the table** | HPTM | "buttons were small and unintuitive"; blinds font too small |
| **Rigging accusations drown everything** | PokerBros, ClubGG | reviews are about card distribution; the ledger/agent model is invisible in them |

### 7.3 · The same list, held against our design

| Complaint | What we already do | What we do not |
|---|---|---|
| Subscription resentment; free became paid | No price yet, so no broken promise yet | `docs/pricing-model.md` must not gate the host mid-night |
| Data loss | Local SQLite is the record until sync; server never overwrites; `pullBooks` rebuilds a phone; frozen settlements never re-derived | Removed member keeps read access (B57); no export as a last-resort backup |
| Crashes | `npm run check:ui` drives every screen on six devices; a night at three table sizes | Not in a store, so no crash telemetry |
| Ledger cannot be trusted | Close gate, `verifyNight()` re-derives every closed night, `npm run audit` on the server, `Did not check out` alert | — |
| Ledger stops short of payment | Settle up → Who pays whom → paid / owed → nudge | No pay links |
| History unreachable | Every night on the server; Sessions lists them; `/watch` reads an ended night | No CSV, PDF or image |
| Live table dies with the host | The ledger is on the host's phone and the server; watchers read the server; nothing depends on a session staying open | One writer: if the host's phone dies mid-night, nobody else can enter |
| Tiny controls | Six-device sheet audit; a big night with no cut figure | — |

### 7.4 · What hosts actually do (Poker Chip Forum, Two Plus Two)

These threads are the real requirements document for the category. Each row is a
practice reported by more than one host.

| Practice | Threads | What it implies for an app |
|---|---|---|
| **A spreadsheet on a laptop, or Excel on a phone, posted to the WhatsApp group at the end** | PCF 87855 "How do you guys track buy-ins and cash-outs?" | The incumbent is a spreadsheet plus a screenshot. Our nudge is a text; a *picture* of the settled night is what replaces the screenshot |
| **Cash for chips, chips for cash; the bank is never over or short** | PCF 58189 "How do you guy manage the bank?" | Cash players are not "on the sheet". A ledger must let a player exist with buy-ins the host never needs to reconcile against a debt — ours does (`atTable`, cash-out rows) |
| **Only credit players go on the sheet** | PCF 87855 | Mixed cash-and-credit tables are normal; per-player, not per-night |
| **An hourly audit: count the cash box, add the debt sheet, compare to chips on the table, to narrow a banking error to one hour** | PCF 87855 | A mid-night *Accounted for* check, not only at count-up. Our `balanceCheck()` exists in core; it is shown only on Count up |
| **Cashless buy-ins: Venmo the host, the host puts their own cash in the box; the banker's personal wallet gets a line in the ledger** | PCF 96935 "How I bank at a home game in an increasingly cashless society", PCF 44392 | The host is a party with a float. Our `collectorPlayerId` and *Unaccounted* are half of this; a "host float" line is the other half |
| **Collect up front, or settle at the end?** — "settle at the end became scam-and-run … four figures never paid back"; "tried settle-up with trusted players and they no longer play" | PCF 140488 | Payment *state* matters as much as payment *amount*. We track paid/owed; competitors (bar Splitwise) do not |
| **Rake to cover food; tip the host; "what is acceptable to recover costs"** | PCF 107761, 76936, 2+2 1091227 | Deductions are contested and need to be *explained* on the receipt. Our `resultFormula` (`game +$1,620 · food −$54 · piggy −$23`) is that explanation; no competitor has a formula line |
| **Fewest-transfers maths asked as a puzzle** | PCF 43689 | Users know the phrase "fewest transactions" and will compare on it. Our greedy pairing should say what it is on screen, or become minimal for small tables |
| **Splitwise with a fake member called "The Bank" and *Simplify debts* on** | departures.com guide; Splitwise feedback forum requests to minimise transfers | The workaround people reach for is a debt ledger, not a poker app. The Bank is our host/collector concept |
| **Scheduling and RSVP live in a different app** (GameNight, Poker Host Pro, WhatsApp) | 2+2 1857215 "Home game manager", PCF 105260 | Out of scope for us, and correctly: the ledger app is opened at the table, the scheduling app the week before |

---

## 8 · Gaps, both directions

### 8.1 · What they have and we do not

Ordered by how many competitors ship it and how often forums ask for it.

1. **Leaderboards, streaks, head-to-head, season standings** — 11 of 27
   competitors; the loudest marketing in the category. We have My stats
   (personal, after deductions) and Sessions, and `docs/screens.md` records the
   leaderboard was folded into one list. The `nightScore`/`gameResults` machinery
   in `working.ts` already produces per-night ranked results; a group table over
   time is a read over `playHistory`.
2. **A second pair of hands** — co-host (Poker Night Ledger, ivey Home) or
   players requesting their own rebuys for the host to approve (Tilt), or every
   player submitting their own count (Chip & Split, TableCap, PartyPot). We are
   one writer by design (`docs/somebody-elses-phone.md`). The outbox is
   idempotent upserts on client uuids, so a second writer is a policy question,
   not a sync question; the append-only ledger already makes two writers safe.
3. **Export** — CSV (Poker Night Host, Poker Buy Manager, Poker Now, Bink,
   Poker Bankroll Tracker), an image of the results (Pokertally), a
   "professional shareable result". We have three plain-text `Share.share`
   calls and `docs/sharing-formats.md` with no code. `/share` is already a
   route name (one person, one rule), which the doc flags.
4. **Pay links** — Venmo/CashApp/Zelle handles on the player (Home Poker –
   Track Buy-Ins), PayPal links on the result (TableCap), Venmo in Splitwise.
   Our Who pays whom row has a name and an amount and a tick.
5. **Chip setup** — a chip-breakdown calculator (SettleChip, PokerPall,
   PokerStack, Homepoker) and chip-to-cash exchange rates (PokerPot, Chip &
   Split). We count in typed whole units; `docs/screens.md` records the
   per-player count keypad (E2) as an undrawn state.
6. **Scheduling, RSVP, date polling, notifications** — Poker Night: Home
   Games, GameNight, Poker Host Pro, Poker Ledger Tracker's Telegram alerts.
   Notifications are v2 in `build-plan.md`; scheduling is not planned.
7. **Cents** — every competitor with a currency field. `roundingMode: 'cents'`
   throws; `docs/settlement-rules.md` lists it as the one open decision that is
   a migration.
8. **A store listing** — 25 of 27. We are Expo Go, manual publish, v0.1.0;
   `build-plan.md` puts the App Store in v2. Every competitor above has a
   two-year head start on the search term "poker ledger".
9. **Two concurrent admins / leaving a club with a debt** — not in competitors
   either, but `README.md` lists it as not built.

### 8.2 · What we have and they do not

None of these appears in any competitor listing, and each is the kind of thing a
listing would boast about if it existed.

1. **A rule, not a line item**: destination × basis × charge × split ×
   exemptions × hand-typed shares, club default snapshotted per night.
2. **Rounding as a money rule**, zero-sum, with the rounding shown as a term on
   the receipt.
3. **A close gate with an acknowledged, assigned discrepancy** and a synthetic
   *Unaccounted* party — the cash-box practice from PCF 58189 made into an
   invariant.
4. **Append-only on both sides**, corrections and voids as rows, a frozen
   settlement, `verifyNight()` against 34 deliberate corruptions, a server-side
   audit.
5. **Realtime read-only watchers** with the grant in the JWT, revocable with
   token rotation; **per-player invite codes** with constant-time refusal.
6. **Offline-first with an ordered outbox**; sign-in is never a gate; a night
   runs and settles with no account.
7. **Paid / owed per transfer, and a nudge that skips whoever paid.**
8. **The formula line** — `game +$1,620 · food −$54 · piggy −$23` — the receipt
   that ends the argument PCF 107761 is about.
9. **Two tables in one club**, one currency per group from 156.
10. **A canonical night tested to the dollar**, and the UI held against boards on
    six devices with no cut figure — the thing HPTM's reviews are asking for.

---

## 9 · What to do about it

Ranked by (competitor pressure × forum demand) ÷ cost, with the cost read from
the code.

| # | Move | Why now | Cost, from the code |
|---|---|---|---|
| 1 | **A picture of the settled night to share** (image first, CSV second) | It is what replaces the spreadsheet screenshot in the WhatsApp group; Pokertally sells it; Poker Now's most-requested issue is history you can take away | Medium. `settledRows`/`resultFormula` already produce the content; needs a view-shot and a route name (`/share` is taken) |
| 2 | **Group table over time** (net per player across nights, a season) | 11 competitors; the category's whole marketing | Low–medium. `playHistory` + `gameResults`; a screen; decide against `docs/screens.md` "one list" note |
| 3 | **Say what the optimiser is**, or make it minimal for n ≤ 10 | 14 competitors claim "fewest"; forum users compare on it | Low. Exhaustive search over subset sums is trivial at table sizes; keep `settlement-v1` for frozen nights |
| 4 | **Host float / collector line** | PCF 96935's cashless banking is the norm; half of it exists (`collectorPlayerId`, *Unaccounted*) | Medium; a design question first |
| 5 | **Mid-night *Accounted for*** on Tonight | The hourly audit hosts already do by hand; `balanceCheck()` exists | Low |
| 6 | **Pay handles on the roster, deep-linked from Who pays whom** | Three competitors; no ledger rewrite | Low–medium; a `player.terms`-style op |
| 7 | **Fix B57** (removed member keeps read access) | Every competitor with groups promises "only invited players see data" | Low; sync the column, add the policy |
| 8 | **Second writer** (co-host, or player-requested rebuys the host approves) | Tilt, ivey Home, Poker Night Ledger; and it is the one failure mode where our host's phone dying loses the night | High; policy and UI, not sync |
| 9 | **Cents** | Any game not in whole dollars | High; migration through `bigint` columns and every formatter |
| 10 | **Store presence** | 25 of 27 are listed; the search term is being claimed now | Process, not code; `build-plan.md` v2 |

Not recommended, deliberately: a tournament clock, scheduling/RSVP, AI recaps,
digital chips. Each is a different app opened at a different time, and the
competitors that bundle them (PokerPall, GameNight, PokerNite) are tier F for a
reason.

---

## 10 · Sources

All retrieved 11 September 2026 through web search snippets; store hosts were not
fetched directly (network policy). URLs are as returned by search.

**Tier A listings and sites**
- Poker Night Ledger — https://apps.apple.com/ca/app/poker-night-ledger/id6756360600
- Poker Ledger Tracker — https://apps.apple.com/ca/app/poker-ledger-tracker/id6761028793
- PokerSquad — https://apps.apple.com/app/pokersquad/id6757091892
- ChipUp — https://play.google.com/store/apps/details?id=com.brotherhood.chipup · https://apps.apple.com/il/app/chipup/id6747723921 · https://chipup.app/
- Tilt — https://play.google.com/store/apps/details?id=com.wayout.tilt · https://apps.apple.com/ca/app/tilt-poker-tracker-manager/id6761335586
- PokerPot — https://apps.apple.com/us/app/-/id6758568455
- Poker Night: Home Games / Poker Home Games — https://apps.apple.com/us/app/poker-night-home-games/id6760563257 · https://play.google.com/store/apps/details?id=com.pokernightapp · https://pokernightapp.com/ · Poker Night Calculator https://play.google.com/store/apps/details?id=com.pokernightapp.calculator
- Pokertally — https://apps.apple.com/us/app/pokertally-track-home-games/id6756515972 · https://pokertally.app/
- Poker Tally (Android) — https://play.google.com/store/apps/details?id=com.pokertally
- SettleChip — https://play.google.com/store/apps/details?id=com.abemiller.settlechip · https://apps.apple.com/in/app/settlechip-poker-calculator/id6748239366
- PokerBank — https://apps.apple.com/us/app/pokerbank-home-game-tracker/id6747364224
- Home Poker – Track Buy-Ins — https://apps.apple.com/us/app/home-poker-track-buy-ins/id6747361420
- Poker Homie — https://apps.apple.com/us/app/poker-homie/id6479970839 · https://www.pokerhomie.com/
- HomeGame Poker Tracker — https://apps.apple.com/us/app/homegame-poker-tracker/id6749866036 · https://homegame.app/
- Poker Night Host — https://apps.apple.com/ca/app/poker-night-host-cash-game/id6801520461
- PokerNight: Poker Game Tracker — https://apps.apple.com/ca/app/pokernight-poker-game-tracker/id6796301913
- PokerNight – Home Game Manager — https://apps.apple.com/ca/app/pokernight-home-game-manager/id6743423214
- ivey Home — https://apps.apple.com/us/app/ivey-home/id6760976554
- Poker Buy Manager — https://apps.apple.com/us/app/poker-buy-manager/id6741064440
- Chip & Split — https://apps.apple.com/us/app/chip-split/id6760094587
- Cash Out Poker — https://apps.apple.com/us/app/cash-out-poker/id6788890781
- ChipSplit — https://apps.apple.com/au/app/chipsplit-poker-settlements/id6743947262
- Casino Split — https://apps.apple.com/us/app/casino-split/id6746630721
- Poker Buy-In Tracker — https://play.google.com/store/apps/details?id=com.icdm.pokerbuyintracker
- Poker Track — https://poker-track.app/ · Stack Tracker — https://www.stack-tracker.com/ · PokerLedger — https://pokerledger.net/

**Tier B**
- Poker Bankroll (Media Revolution) — https://play.google.com/store/apps/details?id=com.mediarevolution.pokerbankroll
- Bink — https://apps.apple.com/us/app/bink-poker-bankroll-tracker/id6445878829
- Poker Bankroll Tracker — https://apps.apple.com/us/app/poker-bankroll-tracker/id999514771 · https://play.google.com/store/apps/details?id=com.filavision.brt
- Poker Analytics — https://apps.apple.com/us/app/poker-analytics-7-tracker/id1073540690 · https://justuseapp.com/en/app/1073540690/poker-analytics-6-tracker/reviews
- Pokerbase — https://apps.apple.com/us/app/pokerbase-tracking-staking/id1387987786 · https://play.google.com/store/apps/details?id=io.devizer.pokerbase
- Poker Income — https://apps.apple.com/us/app/poker-income-bankroll-tracker/id316520188
- Poker Stack — https://apps.apple.com/us/app/poker-stack-bankroll-tracker/id1500021276
- Poker Manager — https://play.google.com/store/apps/details?id=com.pokermanagerpro · Poler — https://apps.apple.com/ca/app/poler-poker-bankroll-tracker/id828305743
- PokerNews, "The Top 5 Best Poker Bankroll Trackers" — https://www.pokernews.com/strategy/the-top-5-best-poker-bankroll-trackers-48862.htm

**Tier C**
- TableCap — https://tablecap.app/poker/ · PartyPot — https://apps.apple.com/us/app/partypot-poker-chips-app/id6756557336 · Chip Runner — https://apps.apple.com/us/app/chip-runner/id6761742684 · Chips of Fury — https://apps.apple.com/us/app/chips-of-fury-poker-4-friends/id1292493748 · PokerChip.live — https://pokerchip.live/

**Tier D**
- Splitwise reviews — https://justuseapp.com/en/app/458023433/splitwise/reviews · minimise-transfers requests — https://feedback.splitwise.com/forums/162446-general/suggestions/9044746 · "The Bank" method — https://www.departures.com/lifestyle/home-design/how-host-online-poker-tournament · Settlr — https://dev.to/joqim/settlr-276l
- Settle Up — https://apps.apple.com/us/app/settle-up-group-expenses/id737534985 · https://settleup.io/tips
- Tricount vs Splitwise vs Settle Up — https://tetras-ltd.com/en/blog/tricount-vs-splitwise-vs-settle-up-best-app

**Tier E**
- Poker Now — https://www.pokernow.com/ · Clubs https://www.pokernow.com/clubs-landing · GitLab issues #367 https://gitlab.com/poker-now/poker-now-hub/-/issues/367 · #566 https://gitlab.com/poker-now/poker-now-hub/-/issues/566 · #584 https://gitlab.com/poker-now/poker-now-hub/-/issues/584 · #593 https://gitlab.com/poker-now/poker-now-hub/-/work_items/593
- PokerBros reviews — https://apps.apple.com/us/app/pokerbros-your-poker-app/id1463376042?see-all=reviews · ClubGG — https://apps.apple.com/us/app/clubgg-poker/id1529839330?see-all=reviews&platform=iphone

**Tier F**
- PokerPall — https://play.google.com/store/apps/details?id=com.pokerpall.app · https://pokerpall.com/ · Poker Night — https://www.getpokernight.com/ · PokerNite — https://pokernite.app/ · GameNight — https://gamenight.poker/ · Poker League — https://play.google.com/store/apps/details?id=com.homepokerleague · HPTM — https://play.google.com/store/apps/details?id=be.avadev.hptm · Poker Host Pro — https://apps.apple.com/us/app/poker-host-pro/id1572229850

**Forums**
- PCF 87855 — https://www.pokerchipforum.com/threads/how-do-you-guys-track-buy-ins-and-cash-outs.87855/
- PCF 58189 — https://www.pokerchipforum.com/threads/how-do-you-guy-manage-the-bank.58189/
- PCF 96935 — https://www.pokerchipforum.com/threads/how-i-bank-at-a-home-game-in-an-increasingly-cashless-society.96935/
- PCF 140488 — https://www.pokerchipforum.com/threads/how-do-you-handle-money-in-home-cash-games-%E2%80%94-collect-upfront-or-settle-at-the-end.140488/
- PCF 43689 — https://www.pokerchipforum.com/threads/math-question-settle-up-after-poker-game-with-fewest-transactions-possible.43689/
- PCF 136287 — https://www.pokerchipforum.com/threads/simple-ledger-to-calculate-payments-from-losers-to-winners.136287/
- PCF 107761, 76936 — rake and tipping at home games
- 2+2 1857215 — https://forumserver.twoplustwo.com/24/home-poker/home-game-manager-1857215/ · 2+2 1091227 — acceptable host costs · 2+2 1836058 — online home game apps
