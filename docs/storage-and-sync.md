# Storage, sync, and what happens with no signal

How a night is stored, at which moments, on which side, and what the app does
when the kitchen wifi drops in the middle of it.

This replaces the ad-hoc arrangement it describes at the end: today the only
things that reach the server are the ledger and a few rows, and only when the
host taps **Share this night**. Sharing has nothing to do with storage and never
should have — it is about letting somebody *watch*, not about keeping the book.

---

## Four principles, and everything else follows

**1. The ledger is the truth. Everything else is derived — but a result is
derived from the ledger AND the rules.**
Buy-ins, rebuys, cash-outs, expenses, corrections and voids are the only facts.
A correction is a new row pointing at an old one; nothing is ever edited or
deleted.

But a player's **result is never the ledger alone.** The bill, the kitty and
every other rule come off it, and what a player is owed — and what appears in
their month, their year and their all-time — is the figure **after deductions**.
Chips won minus chips bought is the gross result, an intermediate number that
belongs on the night's screen and nowhere else.

This is exactly why the settlement is stored rather than recomputed. My stats
reads the **frozen settlement** of each night, not a fresh subtraction over that
night's entries: a stats page that added up buy-ins and cash-outs would quietly
report figures nobody was ever asked to pay.

On the sample night the difference is the whole point — Marek nets **+394** and
Dana **+320**, though Dana won more at the table, because Marek fronted the bill
and it comes back to him. Sorting on the table result would put them the wrong
way round.

**2. The server is the record. The phone is a durable write-ahead log.**
Every change is written to the phone first, immediately, and queued for the
server. The screens never wait for the network — not on a good connection
either, because a UI that is fast only when the wifi is good is a UI nobody
trusts at a table.

**3. Client-side arithmetic is for speed, not for authority.**
The app computes everything locally so the screen answers instantly and works
with no signal. What it stores at the end is that computation, frozen. Because
`@poker-club/core` is shared TypeScript, the server can re-run the identical
function over the identical inputs later and assert it agrees — that is the
audit story, and it is why the calculation being on the client costs nothing.

**4. The settlement is guidance, not a workflow.**
"Ivo → Dana $320" is an instruction to the room. Whether Ivo actually hands
Dana the money is **not the app's business** and is never recorded. A night is
FINAL the moment it is counted, deducted and settled. Nothing about payment can
change a single figure afterwards.

**The roster travels UP, never down.** A person is added, renamed and removed on
the phone that keeps the book, and the queue carries that to the server. A pull
ADDS people this phone has never heard of and never renames one it has — see
`rosterAdditions` in `apps/mobile/src/lib/rosterMerge.ts`. Both ends writing
names would make them argue, with the winner decided by whichever ran last.

A pull matches a book to a club on this phone by the `book_id` stamped on it, or
by name the first time, and stamps it then. A club made on the phone and a book
made by the queue otherwise never learn about each other, and a roster arriving
from the server has nowhere to land.

That fourth one is a load-bearing simplification. It means a settled night is
**immutable**, which means sync is a **set union rather than a merge**, which is
why none of what follows needs conflict resolution.

---

## Where each thing lives

| | On the phone (SQLite) | On the server (Postgres) |
| --- | --- | --- |
| The group | `club` (`book_id` names the book) | `book` |
| Who is in the group | `club_member` | `player` |
| The night | `night` | `session` |
| Who played | `night_player` | `player` + `session_seat` |
| The money | `night_entry` | `ledger_entry` |
| The rules it was opened with | `night.rules_json` | `money_rule` |
| The chip count | `night_count` | `final_count` |
| The frozen result | `night_settlement` *(new)* | `settlement` |
| Waiting to be sent | `outbox_op` *(new)* | — |
| Which name is me | `setting` | — (local by design) |

The server schema needs **no migration**: `money_rule`, `final_count` and
`settlement` were built in `0001` and have simply never been written to.

---

## The write points — what is stored, and exactly when

Every one of these writes locally first and returns immediately. The queued
column is what goes to the server, in order, whenever there is a connection.

| Moment | Written locally | Queued for the server |
| --- | --- | --- |
| **Add a player to the group** | `club_member` | `book` (first time only), `player` |
| **Rename a player** | `club_member`, `night_player` for every night still in play | `player` |
| **Remove a player** | `club_member.removed`, and `night_player` where they hold nothing | — the book keeps the row every night still points at |
| **Open a night** | `night`, `night_player`, rules | `book` (first time only), `player`, `session`, `session_seat`, `money_rule` |
| **Seat someone** | `night_player` | `player`, `session_seat` |
| **Buy-in / rebuy / cash-out / expense** | `night_entry` | `ledger_entry` |
| **Correct or void an entry** | `night_entry` (a new row) | `ledger_entry` (a new row) |
| **Edit a money rule** | `night.rules_json` | `money_rule` |
| **Count a player's chips** | `night_count` | `final_count` |
| **Confirm a shortfall** | `night.ack_json` | — carried in the settlement at close |
| **Close the night** | `night_settlement`, `night.status`, `night.ended_at` | `settlement`, `session` (status + `ended_at`) |

Two things worth noticing.

**A night publishes the moment it opens**, not when it is shared. By the first
buy-in the server already has the book, the session, the players and the rules,
so every entry after that has somewhere to land.

**Closing writes the whole result in one go.** The settlement row carries its own
`rules_snapshot` and `inputs_snapshot` alongside the computed transfers and the
algorithm version, so the night can be re-derived years later even if the group
has changed every rule since. The server's `settlement_frozen_guard` trigger
then refuses to let it change.

---

## The outbox, generalised

Today's outbox holds ledger entries only. It becomes an ordered log of
**operations** — the same idea, one level up:

```
outbox_op
  id          uuid   -- client-generated; the server's idempotency key
  seq         int    -- monotonic per device, the order things happened
  kind        text   -- 'session.open' | 'player.upsert' | 'seat.upsert'
                     -- 'entry.append' | 'rule.upsert'   | 'count.upsert'
                     -- 'session.close'
  payload     json
  attempts    int
  last_error  text
  created_at  text
```

**It drains strictly in order, and stops at the first failure.** That is not
timidity, it is the foreign keys: a session must exist before its entries, a
player before their seat. Halting keeps the server's view a prefix of the
phone's — always behind, never inconsistent.

**Every operation is idempotent**, keyed on an id the phone generated, so
replaying one the server already has is a no-op. Re-sending is always safe,
which is what makes "retry forever" a correct strategy rather than a dangerous
one.

**It drains** when the app comes to the foreground, shortly after each write,
on a timer while a queue is non-empty, and once on sign-in. There is no
connectivity library involved: the attempt *is* the connectivity check, and a
failure just leaves the queue where it was.

### Signed out

The queue still fills. Nothing is dropped and nothing is gated: play the whole
night with no account, sign in on Tuesday, and the night is backed up as the
queue drains. That is strictly better than refusing to record what cannot yet
be sent.

---

## With no connection

Nothing changes, and that is the entire point. The app reads only local state,
so a night with no signal is not a degraded mode — it is the same code path with
a queue that happens to be growing.

Specifically, with the phone in aeroplane mode you can still: open a night, seat
players, record every buy-in, rebuy, cash-out and expense, correct and void
entries, edit the money rules, read every player's card and history, count the
table, confirm a shortfall, see the deductions, and **close the night and read
its final settlement**. Nothing in the close flow needs the network, because the
arithmetic is local and the freezing is local.

When the connection returns the queue drains in order and the server catches up.
If the app is closed and reopened first, the queue is still there — it is a
table, not memory.

**What the host sees** is one honest line rather than a blocking state:
*"Backed up"* when the queue is empty, *"Saved on this phone · 12 waiting"* when
it is not, and after a long failure the actual error, on the Settings screen,
because a host who is about to wipe their phone deserves to know.

### The one real limit

**One device writes a night.** `ledger_entry` is unique on `(session_id, seq)`,
so two phones both numbering entry 7 for the same night is a collision the
server will refuse — correctly. The design has always had a single writer per
session; this is where that assumption is cashed. A second device opening the
same night reads it; it does not write. If it ever needs to, the handover is an
explicit act, not a race.

---

## Reading back

**Built** — `apps/mobile/src/lib/pull.ts`. It pulls every book this account can
see, its sessions, and for each session the players, seats, entries, counts and
settlement, and writes them into the same local tables every screen already
reads from. Nothing else in the app has to know it happened.

It runs the moment somebody claims their place, and from **Fetch my nights** in
Settings. That is what makes an invitation worth sending: a player who claims a
seat and lands on an empty My stats has been told a lie by the claim screen.

**Which books come back is decided entirely by the database.** There is not one
check in `pull.ts` about what may be read — the member policies in
`0007_player_identity.sql` return the books this account belongs to and nothing
else. If those policies are wrong the correct outcome is an empty result, never
a client-side rule quietly filling the gap.

**It never overwrites.** A night the phone already holds is skipped whole,
because the device that recorded a night is the authority on it — principle 3,
applied to the only place it could be violated. A host pulling their own book
therefore gets nothing back, which is correct.

A settled night arrives with the **rules it was settled with**, from the
server's `rules_snapshot`, and its frozen local record is recomputed from those
— safe only because settlement is a pure versioned function of the rows above,
so the same inputs give the same result on any device. Using today's rules
instead would restate a night the group has already been paid out on.

The merge rule is trivial, and only because of principle 4:

- **Ledger entries are append-only** → take the union, keyed by id.
- **A settlement is frozen** → if both sides have one, they are equal; if only
  one does, copy it.
- **Everything else is derived** → recompute it.

There is no field-level merge anywhere, no last-write-wins, no vector clocks.
Rows are immutable once written, so "sync" is just making both sets the same
set.

---

## What is computed where

| | Where | When |
| --- | --- | --- |
| Totals, positions, "on the table" | Phone | Every render, from local state |
| Deduction preview | Phone | Live, as rules or counts change |
| The settlement | Phone | Once, at close — then frozen and never recomputed |
| Verification | Server, later | Re-run `settle()` over the stored snapshots and assert it matches |

Reading a settled night today recomputes it, which is a quiet bug: correct a
long-past entry and the "record" silently changes. Once the settlement is frozen
locally, a settled night reads its stored copy and cannot drift.

**A settled night is closed to edits.** Corrections are for a night in progress.
Since payment is not tracked, there is no legitimate reason to reopen one — and
if a group genuinely gets a figure wrong, the honest fix is a visible correcting
entry on the *next* night, not a rewrite of a record five people have already
read.

---

## How this is tested without a phone

Two harnesses, because the failure modes are different.

**`syncRows.ts` is pure.** Every row the app sends is a value, not a call
buried inside a Supabase request that no test can reach.
`apps/mobile/src/lib/syncRows.test.ts` asserts each one's exact column set.

**`supabase/test/03_sync_contract.sql` replays them** — the same rows, in the
order the queue drains, as the host, through row-level security, against a real
Postgres with the real migrations (`npm run db:verify`). It cannot check auth or
the network; it checks the half that fails first, which is a wrong column name,
a stale enum value or a constraint nobody remembered.

The two describe the same tables, so the column lists in the TypeScript test are
a deliberate tripwire: change one side and the other fails, naming the file that
has to change with it.

Writing them found two schema faults that would each have stopped a night
reaching the server, silently. Both are fixed in `0006_sync_contract_fixes.sql`
and described there.

**The same pair exists for reading back**, and it matters more, not less. A
wrong column in a write fails loudly — the night never leaves and the host sees
"waiting". A wrong column in a read fails silently: a player claims their place,
lands on an empty My stats, and nothing anywhere looks broken. So
`pullReads.ts` holds every column list as a value, `pull.test.ts` asserts them,
and `supabase/test/05_member_read.sql` runs the same lists as an actual claimed
member through RLS — asserting both that they see their whole book and that they
see nothing else, and that reading is all claiming ever grants.

---

## Order of work

1. ~~**The operation log.**~~ **Built.** The queue carries the whole night;
   a night publishes when it opens; every write drains after itself, on
   returning to the foreground, and on signing in. Sharing no longer has
   anything to do with storage — `publishNight` is gone.
2. ~~**Close writes the record.**~~ **Built.** `closeNight()` computes the
   settlement once, freezes it in `night_settlement`, and queues the server's
   `settlement` row with its snapshots plus the session's status and `ended_at`.
   The settled screen and My stats read the frozen copy.
3. ~~**Read back.**~~ **Built.** `pullBooks()` fills a phone from the server —
   on claiming a place, and on demand from Settings. My stats then works from
   whichever copy exists. What is left is running it automatically after a
   reinstall, which needs a way to tell a fresh install from an empty one.
4. **Verification.** An edge function that re-settles from the snapshots and
   flags any disagreement. Cheap once the snapshots are there, and it is what
   makes "the client calculated it" a non-issue.

Phases 1 and 2 are what "the results are stored" means. Phase 3 is what "and
retrievable" means. Phase 4 is what makes it auditable.
