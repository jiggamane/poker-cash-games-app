> **Partly superseded — see `CHANGELOG.md` (12 Aug 2026) §2.** Bill split names and the rounding section are out of date: splits are now `by_percent | evenly | custom`, and rounding granularity (cents/dollars/10s/50s/100s) is a group rule. The largest-remainder mechanism and the worked night below are still correct.

# Money arithmetic

Everything in this file is worked with the numbers drawn in the designs, so the implementation can be checked against a known-good result. If your code reproduces this night exactly, the money model is right.

---

## Representation

**Store integers. Never floats.** Amounts are integer minor units of the group's currency (cents for USD, haléře for CZK). Display is whole units — the group setting `showCents` is off in v1 and every figure in the design is a whole dollar — but storing minor units means turning cents on later is a display change, not a migration.

Never use floating point for a monetary value at any point, including intermediate results of a percentage. A percentage of an integer is computed as `floor(amount * bps / 10000)` plus an explicit remainder step (below).

Sums must be exact. Any screen that shows a total must show the sum of the parts it displays, never a separately rounded figure.

---

## The worked night

Six players. Buy-in $500. Started 20:05, ended 23:45.

### Ledger (11 entries)

| Time | Entry | Player | Amount |
| --- | --- | --- | --- |
| 20:05 | table opened | — | — |
| 20:07 | buy-in (double) | Lena | $1,000 |
| 20:09 | buy-in | Petr | $500 |
| — | buy-in | Marek | $500 |
| — | buy-in | Ivo | $500 |
| 20:41 | buy-in (late) | Dana | $500 |
| 21:04 | rebuy | Petr | $500 |
| 21:12 | rebuy (first) | Ivo | $500 |
| 21:48 | expense · Pizza, Marek paid | — | $120 |
| 22:03 | rebuy (second) | Petr | $500 |
| 22:05 | expense · Drinks, Lena paid | — | $50 |
| 22:30 | buy-in (first) | Tomáš | $500 |
| 23:15 | cash-out | Dana | $2,120 |

Money in per player: Petr $1,500 · Lena $1,000 · Ivo $1,000 · Marek $500 · Tomáš $500 · Dana $500. **Total in $5,000.**

Cashed out during play: Dana $2,120. **On the table $2,880** (5,000 − 2,120).

### Step 1 — count the table (E2)

Every seated player's chips are counted. Players who already cashed out keep what they left with.

| Player | In | Counted | Gross result |
| --- | --- | --- | --- |
| Dana | $500 | $2,120 (at cash-out) | **+$1,620** |
| Marek | $500 | $960 | **+$460** |
| Lena | $1,000 | $1,430 | **+$430** |
| Tomáš | $500 | $0 | **−$500** |
| Ivo | $1,000 | $220 | **−$780** |
| Petr | $1,500 | $270 | **−$1,230** |

Counted total of seated players: 960 + 220 + 1,430 + 270 + 0 = **$2,880**. Equal to the money on the table, so the screen reads BALANCED and the flow may continue.

Gross results sum to zero: +1,620 +460 +430 −500 −780 −1,230 = 0. **They always must.** If they do not, the money model is wrong and the settle-up screen must not be shown.

### Step 2 — apply the money rules (E3)

Two rules are active. Both charge winners only.

**Group kitty · 5% of the gross win**

| Winner | Gross win | 5% | Charged |
| --- | --- | --- | --- |
| Dana | $1,620 | 81.00 | **$81** |
| Marek | $460 | 23.00 | **$23** |
| Lena | $430 | 21.50 | **$22** |
| | | | **$126** |

Lena's is the rounding case: 21.5 rounds to 22 (see § Rounding).

**Kitchen & drinks · $170, split equally between the winners**

170 ÷ 3 = 56.67. Floor each to 56 (= 168), two whole units remain, handed out by the largest-remainder rule with ties broken by size of win:

| Winner | Share |
| --- | --- |
| Dana (biggest win) | **$57** |
| Marek | **$57** |
| Lena | **$56** |
| | **$170** |

**Winners after deductions**, before reimbursements

| Winner | Gross | Kitty | Bill | Net |
| --- | --- | --- | --- | --- |
| Dana | $1,620 | −$81 | −$57 | **+$1,482** |
| Marek | $460 | −$23 | −$57 | **+$380** |
| Lena | $430 | −$22 | −$56 | **+$352** |

Marek and Lena fronted the bill, so $120 and $50 come back to them at settle-up — see Step 3.

**$296 leaves the table**: $170 to the bill, $126 to the kitty. Losers are untouched — both rules charge winners only, so Tomáš, Ivo and Petr owe exactly their gross loss.

### Step 3 — settle up (E4)

Balances going into settlement. Each winner's bill share comes off their result, and each person who fronted part of the bill is paid back what they fronted (the decision recorded under Contradictions below):

| | Gross | Kitty | Bill share | Fronted | Net |
| --- | --- | --- | --- | --- | --- |
| Dana | +1,620 | −81 | −57 | — | **+$1,482** |
| Marek | +460 | −23 | −57 | +120 | **+$500** |
| Lena | +430 | −22 | −56 | +50 | **+$402** |
| The kitty | | | | | **+$126** |
| Tomáš | −500 | | | | **−$500** |
| Ivo | −780 | | | | **−$780** |
| Petr | −1,230 | | | | **−$1,230** |

Credits 1,482 + 500 + 402 + 126 = **2,510**. Debits 500 + 780 + 1,230 = **2,510**. Balanced.

Greedy matching, largest debtor against largest creditor:

| # | Transfer | Amount |
| --- | --- | --- |
| 1 | Petr → Dana | $1,230 |
| 2 | Ivo → Marek | $500 |
| 3 | Ivo → Lena | $280 |
| 4 | Tomáš → Dana | $252 |
| 5 | Tomáš → Lena | $122 |
| 6 | Tomáš → The kitty | $126 |

Six transfers. Seven non-zero balances means at most six are ever needed, and no proper subset of these balances sums to zero, so six is provably the fewest. **This exact list is your regression test.**

---

## The settlement algorithm

1. For every participant, `net = counted − total money in`, then apply every deduction charged to them. Collectors and the group's own destinations (kitty, host fee, next pot) enter as additional creditors. Nets must sum to zero.
2. Split into creditors (`net > 0`) and debtors (`net < 0`). Work in whole units.
3. Sort debtors by amount owed descending; creditors by amount owed to them descending. Break ties by name, ascending, so the same night always produces the same list.
4. Loop: take the largest remaining debtor and the largest remaining creditor, transfer `min(debt, credit)`, subtract from both, drop whichever hits zero. Repeat until everything is zero.
5. Emit one row per transfer, in generation order.

**Do not attempt an optimal solution.** With `k` non-zero balances the greedy pass produces at most `k − 1` transfers, and exactly `k − 1` unless some proper subset of balances sums to zero. Finding the true minimum is the partition problem and NP-hard. Greedy is optimal whenever no zero-sum subgroup exists and is never worse than `k − 1`.

**The result is editable.** The room sometimes decides differently — someone pays two debts at once, someone settles in cash on the spot. Editing rules:

- Both the payee and the amount of any row can be changed. Rows are never reordered by an edit.
- A player with `net < 0` can never receive; a player with `net > 0` can never pay. Ineligible people stay visible in the picker, disabled, with the reason stated ("owes $80 · cannot receive").
- After every keystroke, recompute each person's assigned total against their net. The set is valid only when every debtor's outgoing sum equals their debt and every creditor's incoming sum equals their credit.
- While invalid, Save is blocked and the screen names the discrepancy: who is short, who is over, by how much.
- Reset restores the generated list.
- **Editing never changes anyone's net.** It only redistributes who physically hands money to whom.

---

## A spend nobody fronted

`11-bill-and-kitty.md` gives a spend four ways to be covered (S58). Two of them
name a person — one player, or several whose fronted amounts must sum to the
spend — and those are the case Step 2 above works through. The other two name
nobody, and they do **not** behave the same as each other.

| Covered by | In the bill's total? | Who is credited |
| --- | --- | --- |
| One player | yes | that player, exactly what they fronted |
| Several players | yes | each of them, exactly what they fronted |
| **The kitty** | **no** | nobody |
| **Nobody yet** | **yes** | the bill rule's collector |

**The kitty's spend is outside the bill.** The kitty is funded by a rule that
already took that money off the table, so it has been paid for once. Putting it
back into the bill would charge the winners a second time for one round of
drinks. Nobody is reimbursed either, because no player is out of pocket — the
money left the kitty, not a wallet. A night whose only spend was covered by the
kitty therefore produces **no bill deduction at all**.

**An unpaid spend is inside it.** The round was had and somebody still has to
settle it, so it counts towards the bill exactly as a fronted one does. What is
collected for it has no fronter to go back to, and it cannot simply evaporate
or the night stops summing to zero — so it goes to the **rule's collector**,
who is the person holding the money to pay the bar with.

This is the one case where a bill has a collector, and it does not contradict
§2 below: a bill still has fronters rather than a collector *for money somebody
fronted*. The collector appears only for money nobody has yet. If the collector
also fronted something, the two are one credit against their name, not two.

**Worked example.** Three players, Marek and Petr up $200 each, Dana down $400.
The bill is split evenly between the winners, and Marek is its collector. Four
spends: Petr fronted $70, Dana fronted $30, the kitty covered $40, and $60 is
unpaid.

- The bill's total is **$160** — 70 + 30 + 60. The kitty's $40 is not in it.
- Marek and Petr are charged **$80 each**. Dana, a loser, is charged nothing.
- Petr is credited $70, Dana $30, and Marek $60 as the collector.
- Charges $160, credits $160. The night still sums to zero.

Asserted in `packages/core/src/settlement.test.ts` § *the four ways a spend is
covered*. Before this was settled, the two payer-less covers **could not be
settled at all**: the bill charged the whole tab and then refused to pay it out,
because the only people it knew how to reimburse were the ones who had fronted
something.

---

## Rounding

Three rules, applied in this order.

**1. Percentages round half up.** 5% of $430 is 21.5 → **$22**. This is per person, computed from their own gross figure, never from a pooled total.

**2. Splits use largest remainder.** To divide `T` between `n` people: give everyone `floor(T/n)`, then hand single units to the largest remainders until the total is exact. All remainders equal — as in 170 ÷ 3 — is the common case, so the tie-break matters:

- Split **by winners** or **by everyone**: tie-break by size of win, descending, then by name. The biggest winner absorbs the extra unit. This is why Dana and Marek pay $57 and Lena $56.
- Split **by win size**: shares are already proportional, so the remainder goes to the largest share, then by name.

**3. A displayed total is always the sum of its displayed parts.** Never round a total independently. If the parts show 57 + 57 + 56 the total shows 170, not a re-rounded 170.

The same rules run wherever money is divided: bill splits, kitty percentages, per-player deductions and the settle-up preview on B4.

---

## Contradictions in the sample data

### 1. Petr's 22:03 rebuy — $500 or $1,000?

N2 (the feed) shows `22:03 · Petr rebought · second rebuy · $1,000`. N3 (his player page) shows `22:03 · Rebuy · $500`.

**$500 is correct.** Petr's stated total is $1,500 across a buy-in and two rebuys of $500 each, and the night's total of $5,000 and the entry count of 11 both only work at $500. Treat N2's figure as a typo in the mock.

### 2. Who is paid back for the bill? — resolved

An earlier version of E3/E4 handed the entire $170 to Marek as the rule's collector, which contradicted B4's promise that both fronters are paid back. **Resolved: each person is reimbursed exactly what they fronted**, and the screens have been redrawn to match. Step 3 above is the current model.

The collector field therefore means "who holds money for rules that accumulate" — the kitty, a host fee — and never "who gets the bill back". A bill has fronters, not a collector.

A useful check: **once fronting is included, a bill nets to zero across the table.**

| | Share | Fronted | Net |
| --- | --- | --- | --- |
| Dana | −$57 | — | **−$57** |
| Marek | −$57 | +$120 | **+$63** |
| Lena | −$56 | +$50 | **−$6** |
| | | | **$0** |

If that column does not sum to zero, either a front or a share is missing. Note Lena fronted $50 but owes $56, so she still puts $6 in — fronting is not the same as being exempt.

### 3. Is Lena in the kitty or not?

O7 and B6 show Lena switched off the kitty for tonight ("off tonight — she brought the food"), leaving 3 of 5 paying in. E3 charges her $22 of kitty. Those screens were drawn from different sample nights — O7/B6 also list five at the table without Dana, who plays and wins in E2.

**E2/E3/E4/E6 are one self-consistent night and are the authoritative example.** O7 and B6 illustrate the opt-out control and their roster should be ignored as data.
