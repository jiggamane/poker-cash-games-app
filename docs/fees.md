# What a private game charges for

Every fee a home game takes off the table, which of them this app can express,
and which it deliberately cannot. The engine is `packages/core/src/fees.ts`; the
semantics are in `settlement-rules.md`; this file is the survey behind them.

---

## The two families

A rule's `amountKind` belongs to one of two families, and which one decides
everything else about the rule.

| | The amount is | `split` | Ceiling |
|---|---|---|---|
| **Per person** | what ONE person pays, or the rate they pay at | not read — there is nothing to divide | `maxPerPlayer` |
| **Room total** | what the TABLE pays | decides who carries how much | refused |

```
percent           per person   that whole percent of their own win
per_player        per person   this amount, once, whoever they are
per_player_time   per person   this amount for every period they sat
per_buyin         per person   this amount for every buy-in they made
fixed             room total   this amount
per_time          room total   this amount for every period the table ran
```

`percent` and `fixed` are the two the app started with. Neither has moved: a
group that has never set anything else reads back byte for byte.

**A percentage is per-person too**, which is the thing worth noticing. It was
never "a total divided between the winners" — it charges each winner a share of
their own win and the rule's total is whatever those add up to. The three new
per-person kinds are that same shape with a different multiplier, which is why
adding them changed no existing behaviour.

---

## The survey

What real games charge, and how each is said here. ✅ is expressible today, ⚠ is
expressible with a caveat, ❌ is deliberately out of scope.

### By time

| The charge | How it is set | |
|---|---|---|
| Rake by the hour, per player — "five an hour each" | `per_player_time`, hour, charged to everyone | ✅ |
| Card-room *time*, every half hour begun | `per_player_time`, half hour, `up` | ✅ |
| The room, by the hour — rent, a hired table, a hall | `per_time`, split evenly or by size of win | ✅ |
| A hired dealer's shift | `per_time`, collected by the dealer (a player row who is not at the table) | ✅ |
| A flat hire for the night | `fixed` — what it always was | ✅ |
| "Two hours minimum, then by the hour" | — | ⚠ no floor; see *Open* |

The minutes are counted in `apps/mobile/src/lib/seatClock.ts` off rows that
already exist: somebody arriving buys in, somebody going home cashes out.
**Nobody is asked to clock in**, because a seat time typed by a host is a seat
time that gets forgotten at midnight.

### Per head

| The charge | How it is set | |
|---|---|---|
| A seat fee — the cards, the chips, the cleaning | `per_player` | ✅ |
| Club dues for the night | `per_player`, collected by the treasurer | ✅ |
| Food at so much a head, agreed in advance | `per_player` | ✅ |
| Food at whatever it actually came to | a **bill** rule — the tab is the amount | ✅ |
| A tip for the host, split between the players | `per_player` or `fixed`, destination `host_fee` | ✅ |
| A late fee or a no-show on one person | a hand-typed share against that name | ✅ |

### Per event

| The charge | How it is set | |
|---|---|---|
| A drop out of every buy-in — "five off each thousand" | `per_buyin` | ✅ |
| A charge on rebuys but not on the first buy-in | — | ⚠ `per_buyin` counts both; see *Open* |
| A contribution to next week's prize pot | any kind, destination `next_pot` | ✅ |
| Rake per pot, or per hand | — | ❌ |
| A bad-beat or high-hand jackpot drop, per hand | — | ❌ per hand; ✅ as a per-night `per_player` into `next_pot` |

**Nothing per hand will be added.** This app records money moving on and off a
table; it does not know that a hand was played, and asking a host to tap a
counter every hand is asking for a number that is wrong by midnight. A group
that rakes per pot does it with chips in a box, and what reaches the ledger is
the total — which is `fixed`, or the box's own collector.

### As a share of the win

| The charge | How it is set | |
|---|---|---|
| A percentage of each win | `percent` | ✅ |
| "Five percent, fifty at most" | `percent` + `maxPerPlayer` | ✅ |
| "Five percent, but at least ten" | — | ⚠ no floor; see *Open* |
| One winner covers a whole cost | a custom split with one non-zero row | ✅ |

---

## Open

Three things this stops short of, each with the reason.

1. **A floor — `minPerPlayer`.** "At least ten", "two hours minimum". It is the
   mirror of the ceiling and would cost about as much as the ceiling did. It is
   not here because nobody has asked for it, and a ceiling answers the question
   people actually argue about (*how bad can this get?*) while a floor answers
   one they mostly do not.

2. **Buy-ins against rebuys.** `per_buyin` counts every time somebody put money
   on the table, first buy-in included, because that is what a drop is. A group
   that wants to charge only the rebuys would need the rule to say which — one
   more setting on a kind that currently needs none.

3. **Where the money goes.** `RuleDestination` is still `bill · kitty ·
   host_fee · next_pot`, and rent to a landlord and a hired dealer's pay are
   both filed under `host_fee`. That is not obviously right — but the rule's
   NAME and its `collectorPlayerId` already answer "who gets this", which is
   the question anybody at the table is asking, and a new destination value is
   an enum migration plus a decision on four screens about where its rows sit.
   **For the owner:** should *the room* and *the dealer* be destinations of
   their own, or is a named rule with a named collector enough?

---

## The copy is not drawn

No handoff cut covers a rule charged by the hour, so the strings in the rule
editor — the six kind chips, *Charged by*, *Never more than* — were written
here rather than taken from a board. They are marked in `docs/screens.md`.
`CLAUDE.md` says to flag an invented string rather than let it pass as decided,
and this is that flag.
