# Finding a ruling — the field, the AI, and the developer's queue

A revision of `docs/rulings.md` § 3 (finding a situation), § 6 (the AI
fallback) and § 7 (the review queue). Everything else in that file stands.
Written 29 October 2026 against `main` at `a0755ac`, from the owner's note of
the same day: *most users will start describing their situation rather than
searching for keywords, and that is not covered well; we also want AI answers
where we have none, and a list and notifications for the developer when new
questions arrive.*

It is a design, not a build. One thing in it is measured rather than argued:
§ 1. The rest is the proposal that follows from the measurement, and § 8 is
what the owner decides.

Every string this file invents is marked **UNSURE**, per `CLAUDE.md`.

---

## 1 · What was measured

Fifty-four things a host might type into the Rules field, written as a
sentence about what happened — *he threw in one big chip and didn't say
anything*, *the cash at the end doesn't match the chips*, *he took ages to turn
over the nuts* — each with the situation it should find. Run against the
library on `main` and against a prototype matcher. The set, the prototype and
the runner are in `research_notes/rulings-search/`.

| | first hit | in top three | nothing returned |
|---|---|---|---|
| `search.ts` today | 1 / 54 (2%) | 1 / 54 (2%) | 53 / 54 |
| prototype | 39 / 54 (72%) | 49 / 54 (91%) | 0 / 54 |

**Why today's search fails on a sentence.** `searchSituations` requires every
word of the query to match something, so *he*, *and*, *anything* each kill the
query on their own; it matches titles, aliases and keywords but never the
answer body, where most of the vocabulary lives; and it has no stemming, so
*folded* does not find *fold*. None of this is a bug in the sense `docs/bugs.md`
means — the function does what § 3.1 asked, *a host who knows what happened
types two words* — but the owner's observation is right that hosts do not type
two words, and the data agrees.

**The prototype** (§ 4) is a hundred lines: drop stopwords, stem lightly, score
each query word that matches (OR, not AND), weight the match by where it hit
(title 6, alias 4, keyword 3, body 1) and by how rare the word is across the
library, so *card* and *bet* count for almost nothing and *muck* and *straddle*
count for a lot; multiply by how many of the query's words were covered; and
cut anything under a third of the best score. Keyword queries still work — the
existing `search.test.ts` cases all pass through it.

**Caveat.** The same person wrote the queries and the prototype's synonym list,
so 72% is a ceiling for this set, not a forecast of what hosts will see. The
honest reading is: a sentence currently finds nothing; with the matcher
rewritten it finds the right row most of the time. The five misses are the
useful part — each is a phrase the library has no words for (*pay next week*,
*3 cards*, *next to him*), which is exactly what the review queue in § 6 is
for.

---

## 2 · How people look for a ruling

What the research says, and what it means for a kitchen table.

- **People describe; they do not classify.** The vocabulary problem is the
  oldest finding in help-system research: users describe the same goal in
  different words, and a keyword search puts the burden of translating the
  problem into the system's terms on the user (Chilana et al., *LemonAid*,
  CHI 2012). Our titles are already in a player's words (§ 10 of the design
  doc), which is the right half; the matcher is the half that was missing.
- **A sentence is as good a query as a keyword, when the engine can read
  it** — and slower to type (White, Richardson & Yih, Microsoft Research). At a
  table a host types five to eight words, not a paragraph. The matcher has to
  work on *he threw in one big chip*, not on an essay, and the results have to
  arrive while they type.
- **Nobody reformulates.** Nielsen Norman's finding, cited second-hand, is
  that searchers switch strategy about one time in a hundred: one empty
  result reads as *the app doesn't have it*. So the empty state is the fault to
  design out. The field must always return a ranked list, and the way to the
  AI sits under that list, never only on zero results.
- **Trees are safe and slow; free text is fast and preferred; the hybrid
  wins.** The symptom-checker literature (the closest analogue to *describe
  what happened, get a ruling*) finds users prefer free text for speed, that
  scripted question trees cover little and score badly on usability, and that
  the products converging on something usable open with free text and ask one
  clarifying question when they need it. Our tree is already one level deep —
  six areas over fifty-eight rows — and a second level would cost a tap and buy
  nothing. The clarifying question we already have: the AI's `needsFact`.
- **Help centres pair the field with browsing**, every one of them. The field
  is for the host who can say what happened; the sections are for the one who
  cannot, and for reading before a night.

What this rules out, with reasons:

- **A wizard** (*When did it happen? → What happened?*). Two taps to reach a
  list of ten, where one typed phrase reaches a list of three. The research
  above is against it and so is `09-navigation.md`'s floor on sheet depth.
- **A chat-first screen.** The AI is the fallback for a miss, not the front
  door; the library is the product (§ 1 item 2 of the design doc), and a chat
  box in front of it hides the sixty answers we stand behind.
- **Semantic search on the phone.** Expo Go takes no native modules, so there
  is no on-device embedding model short of a pure-JS one that weighs tens of
  megabytes and loads in seconds. Not for a thirty-second argument.
- **Semantic search on the server.** It would make the field fail offline,
  and offline is the kitchen table. The lexical matcher gets to 91% at the top
  three with no signal; the AI (§ 5), which needs signal anyway, takes the
  rest.

---

## 3 · The navigation, revised

Three layers, in the order a host meets them and in the order they cost.

### 3.1 The field

The field stays at the top of both surfaces and changes its job: it takes a
description. Placeholder **What happened? Say it your way** (UNSURE). As the
host types, the matcher (§ 4) returns up to five rows under a **CLOSEST**
caption (UNSURE), each with its area as the meta line — *Showdown*,
*Money* — so a host can see at a glance that the top row is about the thing
they meant. Under the rows, always, one more:

- **None of these? Ask** (UNSURE) — the AI, § 5. Present on every result list,
  not only on an empty one, because the host who got three near-misses is the
  one who needs it and § 2 says they will not retype.
- When the phone is offline (`online.ts` says so), the row reads **Ask needs
  signal — the areas are below** (UNSURE), disabled, and the question is still
  queued (§ 6) as a `no_match` when the sheet closes.

A typed phrase that matches nothing at all — rarer now, but possible — shows
the Ask row alone with **Nothing close in the library** (UNSURE) above it.

### 3.2 At the table

Under an empty field: the twelve ★ situations by name of what happened, as
§ 3.1 of the design doc already has them for the Rulings sheet. **This file
proposes the same twelve lead the Rules push too**, under an **AT THE TABLE**
caption (UNSURE), ahead of the six area sections. That departs from § 3.2 of
the design doc, which lists the push by area only; the reason is that the push
is where the home grid sends a host from *Poker tools*, and a host who arrives
there mid-argument should not scroll past Betting and Showdown to reach
*Bank is short*. The twelve are fixed per edition, not personalised.

### 3.3 The areas

The long tail, as now: six chips on the Rulings sheet, six captioned sections
on the Rules push, then *Your rules* and the printable. One question for the
owner (§ 8): the order. Today it is Betting · Showdown · Hands · Dealing ·
Money · Behaviour. The order the hand runs — Dealing · Betting · Showdown ·
Hands · Money · Behaviour — would let a host who cannot name what happened
find it by *when* it happened, which is the one question a tree would have
asked. Cheap to change; it is a list in `situations.ts`.

### 3.4 The sheet, with a phrase typed

```
▬▬▬
Rulings                                   [×]
Cash game · your rules apply · edition 2026.1
┌──────────────────────────────────────────┐
│ 🔍  he threw in one chip and said nothing│
└──────────────────────────────────────────┘
CLOSEST
  Said "raise", put in one chip              ›
  Betting
  Said "all in", chips still in the stack    ›
  Betting
  Bet in two motions                         ›
  Betting
  None of these?  Ask ›
```

Every string is UNSURE. Nothing else on the sheet or the push moves: the
close, the sub-line, the chrome and the depth rules are the design doc's.

---

## 4 · The matcher

A rewrite of `apps/mobile/src/lib/rulings/search.ts`, offline, no network, no
dependency. The prototype is `research_notes/rulings-search/describe.ts`; what
it does, as the spec:

1. **Fold and split** as today (lower-case, strip accents and quotes).
2. **Drop stopwords.** Pronouns, articles, auxiliaries, and the words that are
   in every poker sentence — *hand, cards, table, player, guy, game*. The list
   is data, beside the library, and the owner should read it (§ 8).
3. **Stem lightly** — *-ing, -ed, -es, -s* off words of four letters or more.
   Enough for *folded → fold*; not a Porter stemmer, which would make *bet*
   and *better* collide.
4. **Index the answer body** as a fourth field at low weight, alongside title,
   aliases and keywords. The bodies are where *face up*, *change comes back*,
   *one motion* live.
5. **Score by OR, weighted by rarity.** A query word that matches scores its
   field weight times the word's inverse document frequency across the
   library; the words that miss cost nothing. The total is multiplied by the
   share of the query's words that matched, so a row that explains three of
   the words beats one that nails one.
6. **A phrasebook**, as data: a few dozen ways a host says it that no title or
   alias carries — *venmo, zelle → app, transfer*; *pocket → south*; *threw,
   pile, swept → muck*; *coins → change*. The queue (§ 6) feeds it: every
   routed question is a candidate line.
7. **Cut the tail.** Anything under a third of the best score is dropped; at
   most five rows.

**The check that goes red.** `search.test.ts` keeps its keyword cases and gains
the fifty-four sentences as a *rate*, not a row each: top-three at 85% or
better and first-hit at 65% or better. Per-row asserts would turn every new
situation into a test edit; a rate catches a regression in the matcher and
tolerates a rank moving by one. The query set grows from the queue, which is
the point: a `no_match` row that the next edition answers goes into the set
with its new id.

**Why not a library.** MiniSearch does all of this (BM25, prefix, fuzzy, no
dependencies, built for memory-constrained mobile) and would be a fine choice.
The argument for a hundred lines in the repo is that every weight above is a
decision the owner can read and change in a file beside the data, and
`AGENTS.md`'s rule about dependencies. Either is defensible; the figures would
be about the same.

---

## 5 · The AI, revised: route first, write second

§ 6 of the design doc stands on where it runs (an Edge Function holding the
key), what is sent (anonymised, with the rules snapshot and the nearest
situations), how it is marked (the four marks, all at once), and that it never
does arithmetic. This file changes one thing about what the model is *for*.

**The model's first job is to choose from the library, not to write.** Given
the host's description and the whole verified library in the system prompt,
the response says which situation this is:

```ts
interface AssistRuling {
  match: { id: string; fit: 'exact' | 'close' } | null;   // a verified id, or nothing fits
  note: string | null;          // 'close' only: one paragraph on how this case differs
  answer: string | null;        // 'none' only: ≤ 3 paragraphs, the host's words
  reliesOn: Citation[];
  tournamentDiffers: string | null;
  needsFact: string | null;     // one question back, two rounds at most (§ 6.3)
  confidence: 'high' | 'medium' | 'low';
}
```

Three outcomes on the phone:

- **`exact`** — the situation sheet opens, ours, wearing VERIFIED or DRAFT as
  it would from a tap. One line under the status: **Matched from your
  description** (UNSURE). The AI chose; it did not speak, so the four AI marks
  do not appear — the answer is the one we wrote.
- **`close`** — the situation sheet, and above *Source* a card captioned
  **AI NOTE** (UNSURE) in the amber pill, carrying `note`: *your case differs
  in that…* The note is marked as AI; the ruling under it is still ours.
- **`none`** — the AI answer as § 6.4 draws it, all four marks on.

Why route first:

- **The list is the product** (design doc § 1, item 2). Most misses are a
  phrase the matcher could not read, not a situation we lack; § 1's five
  misses are all of that kind. A routed miss returns a verified answer at the
  cost of a classification, and nothing new needs checking.
- **Every `exact` is an alias we did not have.** The queue row holds the
  phrase and the id it routed to; a script lists the pairs, and the owner
  pastes the good ones into `aliases` or the phrasebook. The library's
  vocabulary grows from what hosts actually said, and the offline matcher gets
  the next host there without a call.
- **It is one call, not two.** The model routes and, only when nothing fits,
  writes, in the same response.

**The call**, per the current API: `claude-opus-5-5` as § 6.3 chose, through
`npm:@anthropic-ai/sdk` pinned, in a Deno Edge Function. On this model
thinking is always on, so the request omits the `thinking` parameter and sets
`output_config.effort` explicitly — `low` is enough for a fifty-eight-way
choice; `medium` when the response has to write. The shape above is enforced
with `output_config.format`. The library sits in the system prompt under a
`cache_control` breakpoint with a one-hour TTL. Server-side fallbacks are on
(`fallbacks: "default"` with the `server-side-fallback-2026-07-01` beta), and
the function checks `stop_reason === 'refusal'` before reading content; a
refusal that survives the fallback shows **Couldn't answer this one** (UNSURE)
and is still queued.

**Cost, corrected.** § 6.5 said *under one cent with the cache warm*. At list
price today (Opus 5.5: $4 in, $20 out, $0.20 cache read per million):

| | tokens | cost |
|---|---|---|
| library, cached read | ≈ 20,000 | $0.004 |
| question, rules snapshot, nearest ids | ≈ 600 | $0.0024 |
| response | ≈ 400 | $0.008 |
| **per question, warm** | | **≈ 1.4 ¢** |
| first question of the hour, cache write | ≈ 20,000 × 1.25 | ≈ 10 ¢ |

A routing-only `exact` is shorter on the way out and nearer a cent. The owner
may choose `claude-haiku-5-5` for the routing step ($0.10 in, $0.50 out; about
a fifth of a cent per question even with no cache) and keep Opus for the
writing; that is a cost decision, not a design one, and § 8 leaves it with the
owner.

**The function** — `supabase/functions/ruling-assist/index.ts` (name UNSURE):
JWT verification on; reads the caller's tier through `my_membership()` and
refuses below the tier § 12 of the design doc leaves open; a quota row per
group per day (`ruling_quota`, UNSURE) refuses past a limit; writes the
`ruling_question` row in the same request, keyed by the phone's client id so a
retry on *no answer from the server* is a no-op; never holds the service-role
key for anything the row policies can do.

---

## 6 · The developer's list, and the notification

### 6.1 The constraint

**Expo Go cannot receive a push notification.** Since SDK 53 remote push is
unavailable in Expo Go on either platform (Expo's own FAQ; the SDK 58
`expo-notifications` reference says the same), and a development build needs
the paid Apple account `AGENTS.md` says the project does not have. So *a
notification on the developer's phone* has one honest form today: something
the app shows the developer the next time they open it. Anything that reaches
them away from the app has to go through a channel that is not the app.

### 6.2 The list — in the app, admin only

A push from Settings, **Questions** (UNSURE), under *Rules & rulings*, shown
only when the server says the caller is in `app_admin` (`am_i_admin()`,
`0018_accounts.sql`). The developer is a user of the same app in Expo Go, so
this costs no new surface and no sign-in.

```
‹  Questions
   12 new · 3 marked wrong · edition 2026.1
   [ New ] [ AI answered ] [ Marked wrong ] [ Reviewed ]
TODAY
  "he said he had a straight but it was two pair"   ›
  Asked · AI answered · nearest: Misread their hand · 22:14
  "can we look at the next card"                     ›
  No match · 21:40
  👎 Winning hand hit the muck                        ›
  Marked wrong · 21:02
YESTERDAY
  …
```

Every string UNSURE. A row is one `ruling_question`: the anonymised phrase,
its kind as a pill (*Asked* / *No match* / *Marked wrong*), the situation it
routed to or was marked on, the time. Tapping opens a sheet with the
question, the AI's answer when there was one and what it relied on, the rules
snapshot it was read against, and one action, **Mark reviewed** (UNSURE),
which sets `reviewed_at`. Nothing is written from the phone into the library
— that is a file in the repo and a release — but the list is where the owner
reads what to write.

Server side: `reviewed_at timestamptz` on `ruling_question`; a select policy
letting `is_app_admin()` read every row (members keep reading only their
group's own, as § 7.1); and `ruling_question_new_count()` for the badge below.
`db:verify` asserts both: an admin reads all, a member reads only theirs.

### 6.3 The badge — the notification the app can give

The Settings row *Rules & rulings* carries a count, **3 new** (UNSURE), in
amber — the app's tone for a thing waiting on somebody, which an unreviewed
question is — whenever `ruling_question_new_count()` is above zero for an
admin. It clears as rows are marked reviewed. This is the one notification
that works in Expo Go, needs no new infrastructure, and reaches the developer
every time they open the app for any other reason.

### 6.4 Reaching the developer away from the app

One outbound channel, the owner's pick (§ 8), both built the same way: a
Postgres trigger or `pg_cron` job calls `net.http_post` to a second Edge
Function that holds the channel's secret, so the key is never in the database
and never on a phone.

- **Email digest.** `pg_cron` once a day, at a quiet hour, posts to
  `question-digest` (UNSURE), which groups the day's rows by stem and sends
  one email through a transactional sender. A 👎 on a verified answer — the
  strongest signal the queue produces — goes at once, not in the digest.
  Supabase's own scheduling guide is the pattern, with the URL and key in
  Vault rather than a setting.
- **Telegram or Slack.** A database webhook on insert posts the row to
  `question-notify` (UNSURE), one HTTP call to a bot or an incoming webhook.
  Instant and free, and noisy if it fires for `no_match` rows, which arrive in
  threes when a host retypes — so it fires for `asked` and `thumbs_down`, and
  `no_match` waits for the digest.

Either way, `pg_net` is asynchronous and never holds up the phone's write.

**Recommendation:** the list and the badge first, in the same step as the
queue table, because they need nothing the repo does not already have. The
digest when the queue has a week of rows in it and the shape of the traffic is
known. The chat channel only if the owner would rather be interrupted than
read a daily mail.

---

## 7 · Build order, revised

The design doc's step 1 is on `main`. Steps 2 and 3 are re-cut so each is one
session on disjoint files, per `CLAUDE.md`'s rule about parallel sessions.

**Step 2a — the field reads a sentence.** No server change.
`search.ts` rewritten per § 4, a `phrasebook.ts` beside the library, the
fifty-four sentences into `search.test.ts` as a rate, the aliases the five
misses need added to `situations.ts`; `rules.tsx` gets the new placeholder,
the CLOSEST caption, the area meta line and the *Ask* row (disabled, with its
offline copy, until step 3 gives it something to open); the twelve ★ rows lead
the push. Files: `search.ts`, `search.test.ts`, `phrasebook.ts`,
`situations.ts`, `rules.tsx`. `check` and `check:ui`.

**Step 2b — the queue, the list and the badge.** `0023_ruling_question.sql`
(UNSURE — the design doc said 0021, which membership has since taken) with
the table of § 7.1, `reviewed_at`, the admin select policy, the quota table
and `ruling_question_new_count()`; the outbox op; `no_match` capture on close
and `asked` capture from the Ask row; `/questions` as a push and its sheet;
the badge on the Settings row. Files: `supabase/`, `outbox.ts`, `settings.tsx`,
two new screens, `ui-audit.mjs`'s route list. `check`, `check:ui`, `db:verify`.

**Step 3 — the AI.** The Edge Function, the anonymiser, the three outcomes of
§ 5 on `situation.tsx` and the Ask content, `needsFact`, the tier gate as a
fifth function in `membership.ts`, and the stubbed-function case in
`ui-audit.mjs` asserting the four marks. Files: `supabase/functions/`,
`situation.tsx`, `membership.ts`, a new `ask.ts` in `lib/rulings/`.

**Step 3b — the channel.** `question-digest` or `question-notify`, the
trigger or the cron job, the Vault secrets. Server only.

2a and 2b touch no file in common and can run in parallel. 3 waits for both.

---

## 8 · For the owner

1. **The twelve on the push** (§ 3.2) — a departure from the design doc's
   § 3.2. Yes or no.
2. **Area order** (§ 3.3) — as now, or as the hand runs.
3. **Which model routes** (§ 5) — Opus 5.5 throughout, or Haiku 5.5 for the
   choice and Opus for the writing. Cost only.
4. **Which tier gets Ask** — unchanged from the design doc's § 12, still open.
5. **The channel** (§ 6.4) — a daily email, a chat message, or neither yet.
6. **The stopword list and the phrasebook** are data the owner should read
   once before they ship; a few lines in the prototype are guesses (*ages →
   slow*, *row → straight*).
7. **Strings**, all UNSURE, in one place for a handoff to replace: *What
   happened? Say it your way* · *CLOSEST* · *None of these? Ask* · *Ask needs
   signal — the areas are below* · *Nothing close in the library* · *AT THE
   TABLE* (on the push) · *Matched from your description* · *AI NOTE* ·
   *Couldn't answer this one* · *Questions* · *New* · *AI answered* · *Marked
   wrong* · *Reviewed* · *Asked* · *No match* · *Mark reviewed* · *3 new*.

Nothing in this file starts until the owner says so.

---

### Sources

- Chilana, Ko & Wobbrock, *LemonAid: selection-based crowdsourced contextual
  help*, CHI 2012 — the vocabulary problem in help search.
- White, Richardson & Yih, *Questions vs. queries in informational search
  tasks*, Microsoft Research — sentences retrieve as well as keywords and take
  longer to type.
- Nielsen Norman Group, *Incompetent research skills curb users' problem
  solving* — reformulation rates, cited via a secondary source.
- Aboueid et al., *Young adults' perspectives on the use of symptom checkers*,
  JMIR 2021; *User experience of symptom checkers: a systematic review* —
  free text versus scripted trees.
- Expo, *expo-notifications* reference for SDK 58 and the push notifications
  FAQ — no remote push in Expo Go from SDK 53.
- Supabase, *Database webhooks* and *Scheduling Edge Functions* — `pg_net`,
  `pg_cron`, Vault.
- Anthropic, Claude API reference for Opus 5.5 and Haiku 5.5 — pricing,
  thinking, structured output, fallbacks; MiniSearch design document.
