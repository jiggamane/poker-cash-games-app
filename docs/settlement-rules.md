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
   host's count exactly, or settlement refuses to run. Expenses are cash, never
   chips, so they play no part here.
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

- A percentage **floors**, so a rule can never take more than it says.
- Dividing a total between people uses **largest remainder**: everyone gets their
  floor, then the leftover units go to whoever was cut by the most, ties broken
  by position. No unit is ever invented or lost.
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

### 2. Expenses and bill rules — the big one

The handoff has expense entries ("a shared expense such as food or drinks", with
a **payer**), and separately a rule **destination** of `bill` with a
**collector**. It never says how they connect. The settled summary — *"$296
leaves the table: $170 back to Marek, $126 to Radka"* — reads as an expense
coming back to the person who paid, alongside a rule collecting to a treasurer.

**Default taken:**
- Expense entries are money someone really spent, so the payer gets back exactly
  what they put in.
- A `bill` rule does **not** set its own amount when expenses exist — the
  expenses *are* the amount. The rule only says **how the cost is shared** and
  its `amount` field is ignored. (A percentage of a specific bill is meaningless,
  so a reimbursing rule always behaves as a fixed division.)
- If there are expenses and **no** bill rule, the cost is still owed, so it is
  shared **equally across the table** before anything else.
- A `bill` rule with **no** expenses recorded falls back to collecting its own
  fixed amount to its collector.

*Confirm:* is that the intended relationship? The main alternative — expenses are
just notes, and the bill rule's amount is authoritative — is a one-line change
but means recording an expense has no effect on the money.

### 3. What happens when a rule has nobody to charge?

**Default taken:** a rule that charges winners only, on a night with no winners,
collects **nothing**. The exception is expense reimbursement, which falls back to
charging everyone — someone actually spent that money and it cannot evaporate.

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
