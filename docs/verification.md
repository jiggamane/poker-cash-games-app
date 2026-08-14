# Are the calculations right?

The target is **zero broken nights**, and the only way to know whether you are
at zero is to measure it over real games rather than over the games somebody
thought to write a test for. This is how that is measured.

---

## The three layers, and why each exists

| | What it checks | When | Where |
| --- | --- | --- | --- |
| **Unit tests** | The engine does what we designed | Every commit | `npm run test` |
| **The night's own check** | This particular night's figures hold | At close, on the phone | `verifyNight()` in `packages/core/src/verify.ts` |
| **The audit** | Every stored night still re-derives | On demand, on your machine | `npm run audit` |

They answer three different questions, and the middle one is the reason this
document exists.

**Unit tests ask "does the code do what we meant".** They cannot ask "was this
night right", because they only ever see nights we imagined. The bug that
reaches somebody's wallet is by definition the one nobody imagined.

**The night's own check asks "does this record add up".** It runs on every real
night as it is closed, over data nobody wrote by hand, and it is the only layer
that can catch a case we never conceived of.

**The audit asks "and is that still true".** The phone that computed the
settlement also computed its own verdict, so a device that is wrong about the
money can be wrong about the check. The audit re-derives everything on a
different machine, from the snapshot stored with each settlement, and compares.

---

## What "checking" actually means

Nothing here compares the engine to the engine. Every check re-derives its
expectation from the raw ledger and from the definitions in `types.ts` — a
verifier that asked the engine whether the engine was right would pass on every
night and catch nothing.

The checks, by group:

**The ledger** — amounts are whole and non-negative, no two entries share a
`seq`, every correction points at an entry that exists, every buy-in names
somebody who is in the night, every count belongs to a real player.

**The count against the table** — chips on the table equals buy-ins less
cash-outs; the difference equals counted less on-table; a night that did not
balance carries a confirmation, and the confirmation is for *this* shortfall.

**Each player** — their buy-in matches the ledger; what they ended with is
cash-outs plus their count; gross is ended-with less bought-in; what they were
charged matches what the deductions took off them; their position is gross less
charged plus credited.

**The night** — and the one that matters most: **positions sum to exactly
zero**. Money is neither made nor destroyed at a poker table. If this fails,
somebody is being asked to pay money nobody is owed.

**Deductions** — each one pays out precisely what it took in. A deduction is a
*movement*, never a disappearance: whatever the kitty takes, the collector
receives.

**Transfers** — every payment is a whole positive number, nobody pays
themselves, and each person's payments come to exactly what they are up or down.
Plus a length check: never more payments than one fewer than the number of
people with something to settle.

**Reproducibility** — re-running the same ledger through the same algorithm
version gives a byte-identical answer. This is the check that fires when a
record was altered after it was frozen.

A night from an **older algorithm version** is named as such and *not* reported
as broken. It is supposed to differ; that is what versioning it is for, and
reporting it would bury the real failures.

---

## What happens when a night fails

**The close is not blocked.** The room is standing up to leave; refusing to
finish would leave the host with no result at all and nowhere to put the
evening. Instead:

1. The failure is stored with the night, on the phone and on the server.
2. The settled screen says so, in red, above everything else: *"These figures
   did not check out — do not settle up from this screen."*
3. The ledger is untouched. Every entry is exactly as it was recorded, so the
   night can be worked out by hand and the bug found from the same data.

That order is deliberate. A wrong number that announces itself is recoverable; a
wrong number that looks right is not.

---

## Running the audit

```bash
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<from Dashboard → Settings → API>"
npm run audit
```

```
────────────────────────────────────────────────────────────────
 SETTLEMENT AUDIT
────────────────────────────────────────────────────────────────
 Nights checked        23
 Broken calculations   0
 Failure rate          0.00%   (target: 0.00%)
────────────────────────────────────────────────────────────────
 Every stored night re-derives exactly. Nothing to fix.
```

It exits non-zero when anything failed, so it can be wired into whatever watches
things. During the test period, run it after each game night — that is the
cadence the number is meant to be read at.

**The service role key must never be written down.** Not in `.env`, not in
`apps/`, not in a commit, not in a chat message. Export it in your shell for the
length of the run. It is the key that bypasses row-level security, which is
exactly why one command can audit every host's book — and exactly why it must
not live in a file.

Three lines in the report are worth understanding:

- **Could not be checked** — a night with no usable snapshot. Never counted as a
  pass. A night that cannot be checked is not a night that was checked, and
  folding one into the other is how a failure rate reaches zero without the
  software getting any better.
- **Phone disagreed** — the device's own verdict differs from the audit's. The
  most interesting row in the system: it means what was computed and what was
  stored are not the same thing.
- **No verdict stored** — settled by a build from before the check existed.

---

## What is NOT checked, and cannot be

Be honest about the boundary. The verifier proves that a night's arithmetic is
internally consistent and reproducible. It cannot prove that **what was typed
was true**. If the host records a $500 buy-in as $50, every check above passes
and the night settles perfectly around a wrong number.

That is not a gap to be closed with more code — nothing in software can know
what actually crossed the table. What the app does instead is make the wrong
number visible and correctable: every entry is timestamped and shown to the
room, corrections are new rows that stay in the feed rather than edits that hide,
and the whole ledger is on everybody's phone as it happens. Six people watching
is the check on the input; this is the check on the arithmetic.

---

## Keeping the number at zero

- Run `npm run audit` after every test night. Not weekly — after each one, while
  it is still possible to remember what happened.
- Any failure is an incident, not a metric. Read the codes: one broken night is
  an accident, the same code on nine is a bug with a shape.
- `verify.test.ts` deliberately corrupts a correct night in nineteen different
  ways and asserts each is caught. If you add a check, add its mutation there —
  a verifier that passes everything is worse than none, because the first thing
  it does is stop anybody looking.
- `settlement.test.ts` runs the verifier over a thousand generated nights and
  asserts it finds nothing. That is the other half: false alarms destroy a
  verification system as surely as blind spots do.
