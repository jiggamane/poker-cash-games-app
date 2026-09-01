# The flow — count up to settled

**Cut 1 September 2026.** Three screens and what carries between them. Read this before `02`.

## The screens

| | Screen | Who is on it | What it owns |
|---|---|---|---|
| **E2** | Count up | the admin, at the table | every buy-in, every cash-out, every counted stack, and the **rounding step** |
| **E4** | Settle up | the admin, reading out | the list of transfers, marked off as they happen |
| **E6** | Night settled | everyone, afterwards | the read-back: four terms per player, plus the bill and piggy totals |

## What carries

1. **Stacks.** E2 stores `countedRaw` and `countedRounded` for every player. Both persist; the raw figure is
   never overwritten. See `04-rounding.md` §The maths.
2. **The rounding step.** Set on E2, stored on the night, inherited by E4 and E6. Changing it anywhere
   recomputes from `countedRaw`, never from an already-rounded figure.
3. **Nets.** Computed from rounded stacks, never by rounding a net. E4's transfers derive from these nets,
   so they are multiples of the step without a second rounding pass.
4. **The remainder.** `Σ rounded − Σ raw` goes to the piggy bank and nowhere else.
5. **The bill.** Each person's share and each person's payment are stored separately, and are only netted
   for **display** on E6. Do not collapse them in storage — the receipt has to be able to show both halves.

## The four terms on E6

Each derives from figures the earlier screens already hold. None of them is a new input.

| Term | Derivation | Sign |
|---|---|---|
| `game` | `countedRounded − buyIns` | either |
| `food` | `billPaid − billShare` | either; a payer is positive |
| `piggy` | `−piggyShare` | always negative |
| `net` | `game + food + piggy` | either |

Worked example, Petr — bought in $100, counted out $250, owed $54 of the bill, paid $242 of it at the
counter, $23 into the piggy bank:

    game  +$150   ( 250 − 100 )
    food  +$188   ( 242 −  54 )
    piggy  −$23
    net   +$315

## Invariants

These hold for every night and are worth asserting in tests:

* `Σ game = 0` — the table is zero-sum once every stack is counted.
* `Σ food = 0` — shares and payments cancel; if they do not, the bill was not fully attributed.
* `Σ piggy = −piggyTotal`.
* `Σ net = −piggyTotal` — the only money that leaves the table is the group's cut.

The eight-player night drawn on the board satisfies all four: game sums to 0, food sums to 0, piggy is
8 × $23 = $184, and the nets sum to −$184.

## Sorting

E6 sorts **net descending** — biggest winner first, biggest loser last. Ties break on name, A→Z. The order
does not change while the screen is open.
