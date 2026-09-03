# Rounding — the step lands the positions, and leaves no gap

**Cut 2 September 2026.** Supersedes rules 3, 5 and 6 of
`design/handoff-E2/docs/E2-rounding.md`. Everything else in that addendum
stands: the step is still `$10 / $50 / $100 / off`, it is still set on E2 and
nowhere else, it still governs the whole night, and it is still locked once the
night is closed.

## The gap it closes

The old rule snapped every **stack** to the step, computed the nets from the
rounded stacks, and sent the difference — `Σ rounded − Σ raw` — to the piggy
bank, "the only place it may go".

That produces a night where two screens disagree about one figure. On the four
screens handoff's own sample night the piggy-bank rule takes **$184** and the
settlement hands the tin **$200**, and nothing on the record joins them. It also
rewrote the count to make the arithmetic land, so the balance check on Count up
was comparing money that went in against chips nobody had counted.

The four-screens handoff drew a Results screen with no rounding row on it, which
made the same gap visible in a second place: a deductions total short by the
remainder, with nowhere to explain it.

## The rule

**Nothing rounds a count. The step lands the final positions, apportioned across
every party at once so that they still sum to zero.**

1. Stacks are entered and kept exactly as counted. `endedWith` is the count, the
   balance check is exact, and a night that does not add up says so for real
   reasons.
2. Every rule takes exactly what the rule says it takes.
3. When every rule has been applied, the exact positions sum to zero — the piggy
   bank and any other collector included. That is the invariant `settle()`
   already asserted and it is what makes the next step possible.
4. Those positions are apportioned onto the step by **largest remainder**: floor
   everybody towards negative infinity, then hand one step each to the parties
   with the largest shortfall, until the sum is back to zero. Ties break by the
   position itself, then by id, so a night always settles the same way.
5. **There is no remainder.** Nobody absorbs anything, no screen carries a
   `+$16 → piggy` line, and the deduction total on the record is the figure the
   transfers move.
6. Transfers derive from the rounded positions, so they are multiples of the
   step for free. Nothing is rounded twice.
7. Changing the step recomputes from the exact positions, never from a previous
   rounding.

## Why the collector has to be one of the rounded parties

Because the arithmetic gives no choice. If every party's position must be a
multiple of the step **and** they must sum to zero, then the piggy bank has to be
allowed to move: leave it out and the players alone would have to sum to −$184,
which is not a multiple of $10, and no set of rounded figures can do that.

So the tin lands on $190 rather than $184, or on $20 rather than $23. That is the
one number the room sees — on the rule, on the record, and in the transfer — and
it is what the tin actually receives. This is the trade the change makes, and it
is the right way round: a few dollars moving is survivable, two screens
disagreeing is not.

## What it costs, stated as a guarantee

**Nobody's net moves by a whole step.** The apportionment floors and then hands
out single steps, so every move is strictly inside one — at the nearest $10, no
net moves by more than $9, ever.

That is a fact about the step rather than about the night, which is why the
rounding sheet can now state it before a single stack is counted. The old
sub-line — "No stack moves by more than $3" — had to be measured against the
stacks entered so far, and half way through a count it could only answer for the
half it had.

## A night with no piggy bank now rounds too

The old rule switched the step off entirely when there was no tin to carry the
remainder. There is no remainder, so there is nothing to carry: a group with no
piggy-bank rule rounds exactly as well as one with.

## Copy that changed

⚠ **Not drawn.** All three were invented strings under the old rule and are
invented strings under this one. Flagged for the designer.

| Where | Was | Is |
|---|---|---|
| Rounding row, off | `stacks as counted` | `exact to the dollar` |
| Rounding row, on | `stacks snap to $10` | `nets land on $10` |
| Rounding row, settled | `+$16 → piggy` | *gone — there is no remainder* |
| Sheet sub-line, off | `Stacks as counted · $2,613 so far` | `Every figure to the dollar · $2,613 counted so far` |
| Sheet sub-line, on | `No stack moves by more than $3` | `No net moves by more than $9` |

## The checks that hold it

`packages/core/src/stacks.test.ts`, and they go red if any of this comes back:

- every position lands on the step, at every step;
- the positions sum to zero, at every step;
- the moves sum to zero — rounding redistributes, it never invents;
- nobody moves by a whole step;
- **the rule's stated total, the collector's position and the money transferred
  to them are the same number** — the gap test;
- a night with no piggy bank still rounds;
- `verifyNight`, which re-derives every identity from the raw ledger rather than
  from the engine, has nothing to say at any step.

`verify.ts` carries the same invariants for a night re-checked on the server:
`player.roundedBy` (under one step), `player.position.step` (on the step) and
`night.rounding.conserved` (the moves cancel).

## Still open

1. Whether the group's money rules carry a **default step** a night opens with.
   Unchanged from the original addendum.
2. **The rule division still uses the same step.** At the nearest $50 a
   piggy-bank rule taking 5% of a $465 win divides to $0 and the rule disappears
   from the night. That is pre-existing behaviour — one setting read two ways —
   and it is arguably wrong, but it is a separate decision from this one.
