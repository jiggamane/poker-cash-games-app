# Settlement semantics

How `packages/core/src/settlement.ts` interprets the money rules, and the places
where the handoff left room for more than one reading. **The questions at the
bottom need a designer's answer** — each one has a working default in the code
now, marked so it can be changed cheaply.

Implementation: `packages/core/src/settlement.ts`. Tests: `settlement.test.ts`.
Version string: `settlement-v1` (stored on every frozen settlement).

---

## The order of operations

1. **Resolve the ledger.** Corrections and voids are applied to the entries they
   point at, last one winning; a correction may itself be corrected and the
   chain is followed to the original. Nothing is removed — history stays whole.
2. **Reconcile.** `chips on table = buy-ins − cash-outs`. This must equal the
   host's count exactly, or settlement refuses to run. Expenses are cash paid to
   a bar, never chips, so they play no part here.
3. **Gross result** per player = `(cash-outs + chips still in front of them) − buy-ins`.
   When the count reconciles, these sum to exactly zero.
4. **Deductions**, applied in `sortOrder`. This ordering is what makes
   `net_after_others` well defined.
5. **Final position** = `gross − charged + credited`. These sum to zero too, and
   the code refuses to return a settlement if they ever don't.
6. **Transfers**: biggest debtor paired with biggest creditor, repeatedly.

## Who pays a rule

| `charge` | `split` | Who is charged |
|---|---|---|
| `winners_only` | anything but `across_everyone` | Only players whose basis is positive |
| `winners_only` | `across_everyone` | Everyone at the table |
| `everyone_flat` | any | Everyone at the table |

A collector who is not at the table is never charged; they can only be paid.

## How much

- **`percent`** — each payer is charged that whole percentage of their own
  basis, **rounded down**. Someone with nothing to take a percentage of pays
  nothing. The rule's total is the sum of those charges.
- **`fixed`** — the rule's `amount` is the **total** to collect, divided between
  the payers by weight: `by_win_size` weights by each payer's positive basis,
  `equal` and `across_everyone` weight everyone the same. The division goes
  through `allocate()`, so the parts always add back to the total exactly.

**Basis** is either the player's `gross` result, or `net_after_others` — their
gross less whatever earlier rules already took off them.

## Rounding, stated once

- A percentage rounds **half up**, per the handoff's worked night: 5% of $430 is
  21.5 and charges $22. (An earlier draft of this document said *floors*. The
  code has never floored — see *Rounding granularity* below.)
- Dividing a total between people uses **largest remainder**: everyone gets their
  floor, then the leftover units go to whoever was cut by the most, ties broken
  by position. No unit is ever invented or lost.
- Both take the group's **granularity** — `SettlementInput.roundingMode`,
  whole dollars unless the group says otherwise. It reaches the deductions and
  nothing else: a gross result is chips counted off a table, and rounding one
  would invent or destroy money.
- A share the host typed by hand is charged **exactly as typed**, round or not.
  It is an explicit answer and nothing is applied on top of it.
- Nothing else rounds anywhere.

## Determinism

Same inputs, same output, always — that is what makes the frozen server copy
auditable. Concretely: players are iterated in sorted id order (never map
insertion order), rules in `sortOrder`, and transfer ties break on player id.
`settlement.test.ts` asserts that reversing the input order changes nothing.

---

## Decisions that need confirming

Each of these was genuinely ambiguous in the handoff. The default in the code is
stated first, then the reasoning.

### 1. `charge` and `split` overlap — how do they combine?

The handoff describes a **charge** ("winners only, or everyone at the table,
flat") and separately says bills can be **split** "equally between winners, in
proportion to the size of each win, or across everyone". Those two overlap:
`everyone_flat` and `across_everyone` say almost the same thing.

**Default taken:** `charge` picks *who pays*, `split` picks *how a fixed total is
divided between them* — except `across_everyone`, which also widens the payer set
to the whole table (otherwise the option would mean nothing next to `equal`).

*Confirm:* is `split` meant to apply to percentage rules at all? In the code it
does not, because a percentage already determines each person's share.

### 2. Expenses and bill rules — CONFIRMED

*Settled by the product owner. Recorded here because the code depends on it.*

A poker night at a bar produces a tab. It may be **one bill or several** (food
on one, drinks on another), settled **midway through the evening and again at
the end**, and **not always by the same person**. Each of those is an expense
entry naming whoever actually paid.

**Whether the tab enters the settlement at all is the group's choice:**

| | Behaviour |
|---|---|
| **No bill rule** | The tab is recorded in the ledger and nothing more. Whoever paid, paid. Nobody is charged, nobody is reimbursed. |
| **A bill rule** | The tab is shared out at settle-up. The rule says who covers it and in what proportion. |

When a bill rule exists:
- The amount is the **real sum of the expense entries**, not a number typed into
  the rule. Several bills across the night simply add up.
- Everyone who fronted money is credited **exactly their own outlay** — if Petr
  bought the food and Marek the drinks, each gets back what they personally
  spent, not an average.
- Someone who **both paid the bill and owes a share of it** is charged their
  share and credited what they paid, so they are out of pocket by only the
  difference.

> **The worked example.** A covers a $150 bill, wins, and owes $50 as their
> share. A is charged $50 and credited $150 → **$100 ahead**. Tested in
> `settlement.test.ts` under "nets a payer's own share against what they
> fronted".

A bill rule with no expenses recorded falls back to collecting its own fixed
amount to its collector.

### 2b. Which ways can a bill be covered? — SETTLED, with one gap

Decision: **keep the current model**, and `across_everyone` **stays** as an
option — some groups do split the bar tab across the whole table regardless of
who won.

So a bill can be covered in any of these ways today:

| What the group wants | How it is configured |
|---|---|
| Winners split it evenly | `charge: winners_only`, `split: equal` |
| Winners split it by size of win | `charge: winners_only`, `split: by_win_size` |
| Everyone at the table splits it | `charge: everyone_flat` (or `split: across_everyone`) |
| Nobody — it's not part of the settlement | no bill rule at all |

**Closed:** a single top winner covering a whole bill alone is **not** a mode,
and will not be added. The options above are the ones the UI offers, and the UI
is the source of truth for what a group can choose. Nothing here is outstanding.

### 3. What happens when a rule has nobody to charge?

**Default taken:** a rule that charges winners only, on a night with no winners,
collects **nothing**. The exception is a bill covering real expenses, which falls
back to charging everyone at the table — somebody actually handed money to the
bar, and the group has said they want it shared.

*Confirm:* should a fixed host fee still be collected when nobody won?

### 4. `percent` combined with `everyone_flat`

"Everyone at the table, flat" reads as a fixed amount each, so pairing it with a
percentage is contradictory.

**Default taken:** everyone is in the payer set, and each pays that percentage of
their own positive basis — which means losers pay nothing. The UI should probably
stop this combination being created in the first place.

### 5. Cash-out then buying back in

**Default taken:** a player ends with `everything they cashed out + whatever is
still in front of them`. That is correct whether they left for good or sat back
down, and needs no "has left" flag.

### 6. Fewest transfers

**Default taken:** biggest debtor to biggest creditor, repeatedly. This is not
guaranteed to be the theoretical minimum number of payments — that problem is
NP-hard — but it is close, it always produces fewer transfers than there are
people, and it is obvious to a room watching it happen. Chasing the true minimum
would make the result harder to explain and slower to compute, for a saving of
usually zero payments.

---

# Decisions of 12 August 2026

Answers to the questions raised by the second design handoff.

## The handoff's figures are layouts, not arithmetic — SETTLED

Where a drawn number and a stated rule disagree, **the rule wins**. The designs
are mock-ups and their sums can be wrong.

This settles the transfer-ordering question: the handoff listed Tomáš's $122
payment before his $126 one, which its own "largest remaining creditor" rule
cannot produce. The engine follows the rule.

It does **not** unsettle half-up rounding. That came from the handoff's stated
*Rounding* rule ("Percentages round half up. 5% of $430 is 21.5 → $22"), which
is rule text, not a figure in a layout.

The canonical night in `canonical-night.test.ts` stays as a regression test.
Every one of its figures reproduced on the first run; only the two-row ordering
differed, and that was the layout being wrong.

## Rounding granularity — SETTLED

A group may round to 10s, 100s or 1k — the four chips the interface offers are
Dollar · 10s · 100s · 1k (`ROUNDING_CHOICES`), and `RoundingMode` additionally
carries `fifties` because `book.rounding_mode` on the server does. The parts must still sum exactly to the
total, so when a leftover is smaller than one whole unit it goes **entirely to
whoever is furthest from their exact share** — the mathematically fairest single
recipient. That one person's share is then not a round unit, which is the price
of the total staying exact; everyone else's is.

`allocate(total, weights, granularity)` implements it:

1. Everyone is floored to a whole unit of the granularity.
2. Whole units are handed out by largest shortfall, ties going to the biggest
   winner and then by name.
3. Any residue smaller than one unit goes to whoever is *still* furthest short —
   recomputed, so somebody who has just been given a unit does not also take the
   residue.

| $170 between three winners | Result |
|---|---|
| Dollars | $57 / $57 / $56 |
| 10s | $60 / $60 / $50 |
| 50s | $70 / $50 / $50 |
| 100s | $100 / $70 / $0 |
| 1k | $170 / $0 / $0 |

Tested to sum exactly across every granularity, and to leave at most one person
holding a non-round share.

**Still open:** `roundingMode: 'cents'`. Amounts are currently whole units, so
cents needs the move to minor units that `04-money-math.md` describes. Cheap to
do, but it is a data migration, not a setting.

## Hand-typed shares — SETTLED

`MoneyRule.manualCharges` is the host setting one person's share of one rule at
the end of the night, from the deductions screen. The count is not negotiable;
a share is, and it is negotiated out loud in the room.

- The named person is charged **exactly** what was typed, whatever the split
  would have given them. It is louder than `winners_only` and louder than
  `exemptPlayerIds`, because the reason a host reaches for it is usually that
  the split charged the wrong person.
- On a rule with a **total to cover** — a bill is its expenses; a fixed sum is
  the sum it states — the typed figures come off the top and the remainder is
  divided between the people who have **not** been named, by the rule's own
  split and at the group's granularity. So the bar is owed exactly what the bar
  is owed, and somebody already agreed with is never silently restated.
- On a **percentage** rule there is no total to preserve: what it charges is
  what the collector receives, so one changed figure moves that rule's total and
  nobody else's share.
- `settle()` refuses, naming the gap, if the typed figures come to more than
  there is to cover, or if everybody is named and they do not add up.
- It rides on the **session's** copy of the rule, never on the group's —
  `club-rules.tsx` strips it (and `exemptPlayerIds`) when promoting tonight's
  rules to the club default.

Tests: `hand-typed-shares.test.ts`, which asserts `verifyNight()` finds nothing
on every case.

## No-winner nights — SETTLED

There is no such thing as a night with no winners, so it is not a product case
and needs no design.

The one arithmetic exception is a night where **everyone is exactly flat** —
which really only happens if a table opens and closes without play, or is
abandoned. The fallback in `applyDeduction` stays as a guard against a crash on
that path, but nothing is designed for it and no fee accrues.
