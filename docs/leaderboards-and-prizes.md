# Leaderboards, rankings and prizes — a menu

A list of what a closed group — a home game most weeks, a small club now and
then — might want to see ranked, and what it might want to pay out of a pot it
collects over a season. **Nothing here is decided.** The owner picks from it;
what is picked gets a design request, and what is not picked stays here so the
next person does not propose it twice. Written 27 September 2026 against the
code on `main` that day.

`docs/competitive-research.md` § 8.1 puts leaderboards first among the gaps:
eleven of twenty-seven competitors ship one and it is the loudest marketing in
the category. This is the list behind that line.

---

## 0 · What the ledger knows, and what it never will

Every ranking below is a read over rows that already exist, or it is marked as
needing something new. The rows are:

| What is recorded | Where | So the app can say |
|---|---|---|
| Every buy-in, rebuy and cash-out, per player, **timestamped** | `ledger_entry` | how much each person put in, how many times, when they arrived and when they left |
| The final count, per player | `final_count` | the night's gross result |
| What every rule took, and from whom, and where it went | `settlement`, `SettledTerm[]` | the net after the bill, the piggy bank, the host fee, the next pot |
| Minutes at the table, per player | `NightSnapshot.timing`, `seatClock.ts` | an hourly rate |
| Who paid whom, and **whether they have** | `transfer_payment` | who settles promptly |
| Who fronted a spend | `ledger_entry.payer_id` | who is always at the bar |
| The book: opened once, closed by the host | `book` | a season with a start and an end |

**What is not recorded and will not be:** hands, pots, cards, blinds, who won a
pot from whom. `docs/fees.md` says it once — *"this app records money moving on
and off a table; it does not know that a hand was played"* — and every idea
below respects it. The consequence is worth stating up front because it decides
two of the most-asked-for features:

- **A true head-to-head ("who takes Petr's money") is not computable.** The
  ledger knows Petr finished −$200 and Lena +$350; it does not know a dollar of
  that moved between them. § 1.11 offers the honest substitute.
- **A bad-beat or high-hand jackpot cannot be triggered by the app.** It can be
  *funded* by the app (a rule into `next_pot` already exists) and *paid* by the
  app (§ 3), but the trigger is a person at the table saying it happened — the
  host, who is already the one trusted pair of hands. That is a declared event,
  not a computed one, and § 3.3 builds on exactly that.

Two rules carried over from `CLAUDE.md`, restated because a leaderboard is the
screen most likely to break them:

1. **A screen adds nothing up.** Every figure on a standings screen comes from
   one function in `packages/core` (or a new sibling of `myStats.ts`), with a
   test that holds it to the canonical night.
2. **Every prize is money and moves through the ledger.** A payout is an
   append-only row, it is a term on the winner's receipt (`prize +$200`), the
   pot can never go negative, and the night still sums to zero.

---

## 1 · Rankings

Each one: what it ranks, how, whether it is computable today, and the catch.
✅ computable from existing rows · ⚠ computable with a caveat or a small new
input · ❌ needs data the app does not hold.

Working names are in *italics* and are **all UNSURE** in the repository's sense:
copy is final and none of these strings has been written by the owner.

### 1.1 · The season table ✅

Net result per player over a period, ranked. The one every competitor has and
the one a group asks for first.

- **Figure:** net *after* deductions — the number the settle-up handed the
  player, the same figure `My stats` already uses. See § 4.1 for the case for
  gross instead.
- **Periods:** month · year · all time (already on `/stats`), plus **the book**
  as the season — it has an opening and a closing and nothing else in the app
  does. A group that wants a "season" has one the day the host closes the book.
- **Columns worth having:** net · nights · average per night · W–L. The first
  and the last already exist per person in `Summary`.
- **Catch:** a ranking by net rewards playing more nights as much as playing
  well. § 1.2 is the answer for groups that mind.

### 1.2 · Place points ✅

Each night's finishing order (already computed — `gameResults` ranks the
settled night) converted to points, summed over the season. Ten for first,
seven, five, three, one, nothing below fifth — or whatever the group sets.

- **Why a home group wants it:** it separates the season from the stakes. A
  $2,000 swing on one big night no longer decides the year; a person who
  finishes second every fortnight can lead. It also survives a group whose
  buy-in changes between nights.
- **Variants the group might set:** points only for the top N; a point for
  showing up (attendance folded in); *drop your worst two nights*; a bonus
  point for winning the night outright.
- **Catch:** a points table needs a scale, and a scale is a rule the group
  argues about once and then never touches — which is exactly what the club
  section's GR rows are for.

### 1.3 · Hourly rate ⚠

Net divided by minutes at the table, per player, over the period.

- **Source:** `seatClock.ts` already derives minutes from buy-in and cash-out
  timestamps; nobody clocks in.
- **Catch:** small samples lie. Someone who sat for forty minutes once and won
  $80 leads at $120/hr. Needs a **qualifier** (a minimum number of hours or
  nights before the row ranks — twenty hours is the usual), and the qualifier
  is a setting.

### 1.4 · Return on buy-in ✅

Net divided by total bought in. Rewards the person who wins without rebuying
and punishes the ATM. Pairs naturally with § 1.9.

### 1.5 · Win rate ✅

Nights finished up ÷ nights played. `won` and `lost` exist per player in
`Summary`; the ranking is a sort. Cheap, and a second axis for the season
table (*most winning nights*).

### 1.6 · Steadiest ⚠

Lowest variance of night results among qualifiers. A ranking that a losing
player can still top, which is its point. Needs the qualifier from § 1.3.

### 1.7 · Streaks ✅

Three of them, each a run over the ordered nights:

- **Winning streak** — nights up in a row, current and longest.
- **Cashing streak** — nights not down (includes exactly zero).
- **Attendance streak** — consecutive group nights played. The one hosts
  care about most, because showing up is the thing that keeps a home game
  alive. Counts a night of the club the person sat out (`RecordedNight.played
  = false` already distinguishes it).

### 1.8 · Attendance and hours ✅

Nights played · minutes at the table · *the iron man* (most hours in a season)
· *the closer* (most often the last cash-out of the night) · *first out*
(earliest cash-out). All timestamps. Cheap, and the kind of thing a group
laughs about, which is what a leaderboard is for at a home game.

### 1.9 · Rebuys ✅ — but opt-in

Most rebuys in a season, most rebuys in one night, average rebuys per night.
Computable and popular (*the ATM* is a running joke in most groups) — and it
is a ranking of losing, which some groups will not want on a screen. **Off by
default; the group turns it on.** Same for a *biggest loss* record (§ 1.10).

### 1.10 · Records ✅

Not a table but a board of single-night bests, each with a name and a date:

- biggest win · biggest loss (opt-in) · longest night · most players at the
  table · biggest table (most bought in) · most rebuys in a night (opt-in)
- ***the Lazarus*** — finished up after N or more rebuys. Computable: the
  ledger knows how deep the hole was (total buy-ins) and where they ended.
  The nearest thing to *biggest comeback* that does not need a stack history.

### 1.11 · Nights shared — the honest head-to-head ⚠

A true head-to-head is ❌ (§ 0). What is ✅ is: **on the nights you both
played, who finished higher, and how often.** A 7–3 record over ten shared
nights, with the net gap. Labelled as that — *finished ahead* — and never as
*beat*, because the app cannot know the second thing. Competitors call this
*nemesis*; the word claims more than the data can carry.

### 1.12 · Prompt payer ✅

Average time from the night settling to each transfer marked paid, per person,
from `transfer_payment`. The one ranking with a job: it is the nudge's social
half. A *slowest to pay* board is opt-in for the same reason § 1.9 is; a
*fastest* board is not.

### 1.13 · Contribution ✅

What each person has paid into the piggy bank and the next pot over the
season — read off `SettledTerm[]`. Useful beside a prize pot (§ 3): a person
can see they put $60 into the pot they are competing for.

### 1.14 · Movement ✅

Rank change since the last night (an arrow on the season table) and *mover of
the month*. Derived from § 1.1; costs one comparison.

### 1.15 · A rating ⚠ — probably not

An Elo- or TrueSkill-style rating over finishing orders. Statistically sound,
opaque at the table ("why did I lose points on a night I won?"), and § 1.2
delivers most of the benefit with a scale a person can hold in their head. Listed
so it is on record as considered.

### 1.16 · Honours without money ✅

*Player of the month* (top of § 1.1 or § 1.2 for the period), *most improved*
(largest rank rise over two periods), *perfect attendance*, *first win*.
Badges on the roster row, nothing paid, so no ledger work — only copy and a
place to draw them.

---

## 2 · Periods, seasons and the book

Everything above ranks over a window. The app has three windows (month, year,
all time) and one object with a natural start and end: **the book**. The
recommendation is to make the book the season rather than invent a fourth
window:

- Closing the book is already a host's deliberate act. A **season close**
  is the same act with a result: final standings frozen (a snapshot, like
  `settlement` — the table must re-derive to the same figures next March),
  prizes paid from the pot (§ 3), and the next book opened with the pot at
  zero or explicitly carried over.
- A group that plays year-round and never closes the book still has month and
  year. Nothing is lost.
- Standings are **never stored while the season is open.** They are a read
  over the ledger, so a correction to a night three weeks ago changes the
  table the moment it lands, which is right. Only the close freezes one.

A year-end card — the year in five figures — is cheap and competitors sell it
as *Wrapped*. Worth doing plain; § 9 of the competitive research already
declines the AI-commentary version.

---

## 3 · Prizes, and the pot they come from

The owner's brief: prizes for achievement, payable from a pot the group
collects over a period. This section is that mechanism — first what a pot is,
then what can be paid from it.

### 3.1 · What exists today

A rule with destination `next_pot` — any kind (so much a head, so much a
buy-in, a share of each win, a fixed sum for the table) — takes money off a
night and credits a named **collector**, a person who physically holds it. The
contribution appears on each payer's receipt as `next pot −$10`. That is the
whole of it: **the pot has an inflow and no balance and no outflow.** Nothing
in the app knows the pot stands at $340 after six nights, and nothing can pay
it out.

### 3.2 · The pot ledger — the one thing every prize needs

A book-level, append-only list of movements in and out of the pot:

| Row | Written by | Amount |
|---|---|---|
| **Contribution** | the night's settlement, automatically, one row per night per `next_pot` rule | what the rule collected |
| **Payout** | the host, from a prize sheet | what was paid, to whom, for what |
| **Adjustment** | the host, when the physical cash disagrees | signed, with a reason — the same discipline as *Unaccounted* on the count |
| **Handover** | when the collector changes | zero money; the holder changes |
| **Carry-over** | at book close | the balance moved into the new book, or paid out |

Balance = the sum. **Invariants:** it never goes below zero (a payout larger
than the balance is refused, not clamped); every payout names a person and a
reason; at book close the balance is zero or carried over — never silently
left with the collector.

**How a payout reaches the winner** — two routes, and a group needs both:

1. **Inside a night.** The winner is at the table; the prize enters that
   night's settlement as a credit to them from the collector, so it flows
   through *Who pays whom* like everything else and shows on the receipt as
   `prize +$200`. The collector's own row pays it. This is the ordinary case
   for a jackpot hit that night.
2. **Outside a night.** A season prize paid at the close, or to someone
   absent. The payout row records it; the transfer is between collector and
   winner and gets the same paid / owed tick as any transfer.

The kitty is a different pot and stays one: the kitty is *spent on the group*
(the cards, the chips, the end-of-season dinner) and the prize pot is
*returned to players*. One new word in the copy (*prize pot* rather than *next
pot*) would make the difference audible; the enum needs no change.

### 3.3 · Prize mechanics

Each: what it is, how the pot funds it, whether the trigger is computed or
declared, what is new.

**P1 · Season champion.** The pot accrues all season; at book close it goes to
the top of the season table (§ 1.1 or § 1.2 — the group picks which table
pays). Split options: winner takes all · 60 / 30 / 10 · top three equal. The
split is a rule, set once. *Trigger: computed. New: the pot ledger, a split
setting, the close-the-book flow.*

**P2 · Monthly prize.** P1 with a monthly window and a smaller pot. Some groups
want both: a monthly rule into one pot and a season rule into another — which
is two `next_pot` rules with two collectors, already expressible. *New: the pot
ledger must key on the rule, not the destination.*

**P3 · Bad-beat jackpot.** Funded per night (`per_player` or `per_buyin` into
the pot — `docs/fees.md` already lists this as the way to say it). Hit when a
qualifying hand loses — quad eights or better beaten is the card-room default,
and the group sets its own line in copy, not in code, because the app never
sees the hand. **The host declares it** from the Table admin drawer: names the
loser and the winner; the app pays by the group's split (50 % to the losing
hand · 25 % to the winner · 25 % shared by everyone seated is the convention)
through route 1 above. If the pot is not hit it simply persists — *progressive*
is the default behaviour of a pot with a balance, not a feature. Two details
card rooms have that a group will ask for within a month:

- a **cap** — above it, contributions stop or go to a reserve;
- a **reseed reserve** — a slice of every hit (10–20 %) stays behind so the
  next jackpot does not start from zero.

*Trigger: declared. New: the pot ledger, a declare-and-pay sheet, a split
setting, an optional cap and reserve.*

**P4 · High hand of the night.** P3's smaller sibling: a fixed sum from the pot
to whoever the host says held the best hand. Weekly, so it is hit most nights
and keeps the pot from running away. *Trigger: declared. New: nothing beyond
P3's sheet.*

**P5 · Achievement bounties — computed, then confirmed.** Fixed sums from the
pot for things the ledger can see: first to +$1,000 on the season · three
winning nights in a row · *the Lazarus* (§ 1.10) · perfect attendance for the
season · a first-ever winning night. Because these are computable the app can
**offer** the payout ("Lena hit three in a row — pay $50 from the pot?") and
the host **confirms**; nothing moves money on its own, ever, because a
correction a week later could unmake the achievement. *Trigger: computed,
host-confirmed. New: a bounty list (achievement × amount) in the club
section, and the offer on the settled screen.*

**P6 · King of the hill.** The season leader carries a bounty; on any night
that someone finishes above them, that someone collects it from the pot. Keeps
a runaway leader interesting to play against. *Trigger: computed. New: one
bounty amount.*

**P7 · The fish fund.** A share of the pot to the season's biggest loser at the
close — a consolation some groups pay on purpose, because it keeps the person
coming back. Opt-in, obviously. *Trigger: computed. New: a split row.*

The mirror — the season's biggest loser **pays into** the pot — is ⚠: a rule
today charges `winners_only` or `everyone_flat`, and *losers only* does not
exist. It would be a third `charge` value and an enum migration. Flagged, not
recommended.

**P8 · Attendance raffle.** Every night played is a ticket; at the close the
app draws one. The draw is seeded from something both public and fixed — the
closing settlement's hash — so anybody can re-run it and get the same name.
Rewards showing up without ranking anyone. *Trigger: computed, verifiably
random. New: the draw and its seed.*

**P9 · Pick the winner.** Before the night starts each player names who will
win; the correct guessers split a small side pool. Fun, and ❌ for now: it
needs every player to write one thing, and the app is one writer by design
(`docs/somebody-elses-phone.md`). Listed because it is the first prize that
becomes possible the day a second writer ships — § 8.1 item 2 of the
competitive research.

**P10 · Stake-adjusted points.** Not a prize but a modifier: for a group whose
buy-in changes between nights, scale § 1.2's points by the night's buy-in
relative to the season's usual one. Folds into the points scale; no new rows.

### 3.4 · Things the pot must not be allowed to do

- Pay out more than it holds, or pay out to nobody, or pay out with no reason.
- Move money without the host. Every offer is confirmed; every payout is a
  tap by the person whose phone runs the game.
- Vanish at book close. The close must say where the balance went.
- Be confused with the kitty or with a host fee. Three destinations, three
  words, and a receipt line that says which.

One sentence on the law, and only one, because this doc does not decide it: in
several jurisdictions a home game stays legal precisely because nobody takes a
cut, and **a pot returned entirely to the players is the safe side of that
line** in a way a host fee is not. Whatever gets built should keep the two
visibly separate on every screen that shows them.

---

## 4 · Decisions the owner has to make before any of this is designed

1. **Net or gross.** Rank on the net after deductions (what the player was
   handed; consistent with `My stats`) or on the game result before the bill
   (what happened at the table)? The bill is unrelated to skill, which argues
   for gross; the net is the number people remember, which argues for net. A
   group could choose, but a default is needed and it should be one word on
   the screen.
2. **Qualifiers.** Minimum nights (or hours) before a row ranks in § 1.3,
   § 1.4, § 1.6. A number, once.
3. **Which rankings are opt-in.** Rebuys, biggest loss, slowest to pay — the
   ones that rank losing. Proposed: off until the group turns them on, in the
   club section beside the money rules.
4. **The points scale** for § 1.2, if built — and whether the app ships one
   default or makes the group type it.
5. **Copy.** Every table title, every award name, every receipt line
   (`prize +$200`, `jackpot`, `bad beat`) is a new string. The italics above
   are placeholders; the handoff's rule that copy is final applies in full.
6. **Where it lives.** A push screen under the club (a sibling of `/stats`
   and `/games`, Chrome A per `docs/09-navigation.md`), a *Standings* card on
   the club home, and per-night rank already on `/settled`. The pot is a card
   in the club section with its balance and holder, and the prize sheets are
   sheets (they end in a confirm). Watchers over a share link see tonight, not
   standings — standings are for the roster.
7. **Tier.** `docs/pricing-model.md` never gates correctness; standings and
   prizes are plausibly *Regular* (every night in the book is exactly what a
   season table reads). Not a design question, but it decides whether Free
   sees the table.

---

## 5 · If asked to pick — a first cut by cost

Ordered by what a group would notice divided by what it costs, with the cost
read from the code.

| # | Build | Why first | Cost |
|---|---|---|---|
| 1 | Season table (§ 1.1) with W–L, nights, average; month · year · book | The gap everybody names; `myStats.ts` already holds a per-person version | Low — a group-wide read over `playHistory`, one push screen |
| 2 | Attendance, hours, streaks (§ 1.7, § 1.8) | Rewards showing up, which is what a host wants rewarded; all timestamps | Low — same screen, second section |
| 3 | Records board (§ 1.10) | One glance, one laugh, and it is the thing that gets screenshotted into the group chat | Low |
| 4 | Prompt payer (§ 1.12) | The one ranking with a job; `transfer_payment` is already there | Low |
| 5 | The pot ledger (§ 3.2) with balance, holder, contributions written at settle | Every prize needs it; without it `next_pot` is a word on a receipt | Medium — a table, an invariant, a card, one line in the settle path |
| 6 | Season champion at book close (P1) | The simplest prize and the one most groups actually run | Medium — the close-the-book flow, which is also not built |
| 7 | Declared jackpot and high hand (P3, P4) | The owner's brief names it; the honest version is a host declaration | Medium — a sheet, a split rule, route 1 into a night |
| 8 | Place points (§ 1.2) as a second sort on the season table | For mixed-stakes groups; the scale is the only new setting | Low–medium |
| 9 | Bounties offered and confirmed (P5, P6) | Gives the pot something to do between seasons | Medium |
| 10 | Nights shared (§ 1.11), hourly rate (§ 1.3), steadiest (§ 1.6) | Nice, and each needs a qualifier or a caveat on the screen | Low each, but each is a caveat to write |

Not recommended: a rating (§ 1.15), *losers pay* (P7's mirror), and anything
per hand. Deferred until a second writer exists: *pick the winner* (P9).
