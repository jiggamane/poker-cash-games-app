# Build order

Five phases. Each one ends somewhere usable, because the test group's feedback is worth more than another week of scaffolding.

---

## Phase 0 — the decision (before any code)

Recommend a stack, per the README. One page. Stop and wait for approval.

One money question is still open: on E5, confirm that writing the difference off to the piggy bank creates a real ledger entry rather than a silent adjustment. The bill-reimbursement model is settled — each fronter is paid back what they fronted — and the screens are drawn that way.

---

## Phase 1 — one night, one device

The whole point of the product, with nothing around it. No accounts, no sync, no groups list — one group that exists on first run.

- First run: name the group, currency, seat people by name [C1, G2]
- Home, all three card states [H1, H2, H3]
- Open a night [O1, O2] — skip money rules entirely
- The live session, both tabs [N1, N2]
- Buy-in, rebuy, new player, cash out [N4–N9]
- Player detail [N3]
- End the night: confirm → count up → settle up [E1, E2, E4]
- Settled summary [E6]

**Ship it when:** a real three-hour game can be run end to end on the host's phone and the settle-up figures are right. This alone replaces the piece of paper.

The ledger must be append-only from the first commit. Retrofitting that later means rewriting every derivation.

---

## Phase 2 — the money rules

The part that makes it more than a notepad.

- Rule editor and the three starting points [O3, O4, O5]
- Collector picker [O6]
- Expenses: empty, add, set, change split [B2, B3, B4, B5]
- House rules sheet [B1]
- Piggy bank membership: group default and tonight-only [C6, O7, B6]
- Deductions step [E3] and its unset state [E3b]
- Out of balance [E5]
- Corrections [N10]

**Ship it when:** the worked night in `04-money-math.md` reproduces exactly, including every rounding case.

---

## Phase 3 — everyone else

- Identity: name-only members, per-player invite links, activation binding to an existing row
- Share link and the watcher view [X1]
- Group-wide invite and joining [C3, X2]
- Sync: push queue, idempotency, reader pull
- Offline: full session with no connection, drain on reconnect
- Writer handover if the host's device dies

**Ship it when:** three phones follow a night the host runs with aeroplane mode toggled at least twice, and the ledgers agree afterwards.

---

## Phase 4 — the book and the group

- Sessions list [S2]
- My stats [G4]
- Players roster and editing [C2, C5]
- Group settings [C4]
- Multiple groups: list, switch, create [G1, G2, G3]
- Payments [E7]
- Rematch, Share, Export

---

## Deliberately not in v1

**Membership, tiers, payment** — the seam is specified in `01-product-logic.md` § 4 and nothing else.

**Closing a book.** The mechanism is described but not drawn. Sessions accumulate into one open book; leave the close action out until the screens exist.

**Notifications.** "Nudge the table" on E7 needs a channel that does not exist yet. Ship the button disabled or leave the row out — do not invent a notification system.

**Multi-currency within a group.** One currency per group, set at creation.

**Cents.** Store minor units, display whole. The setting exists in C4 and is off.

**Anything tournament.** No clock, no blinds, no eliminations. If the tournament clock product lands later it shares the group, the roster and the settlement algorithm and nothing else — keep those three behind interfaces that do not mention cash games.

---

## Not designed yet

Flag rather than invent:

- The book screens (month, all time) in the current style
- Notifications of any kind
- A watcher's own onboarding, separate from joining a group
- Anything about a person belonging to several groups beyond G1/G3
- Empty and error states for sync failures
