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
"Ivo → Dana $320" is an instruction to the room. A night is FINAL the moment it
is counted, deducted and settled, and **nothing about payment can change a
single figure afterwards.**

This paragraph used to end "and is never recorded", which had stopped being true
some time before it was noticed: E7 is a screen in this app, the host taps a
name when the cash arrives, and it was stored in `night_payment` on one device.
So the principle now says what it was actually protecting — the FIGURES — and
the ticks go to `transfer_payment` like everything else. Nothing in
`packages/core` reads that table and a night settles identically with every row
in it and with none, which is the property that matters and the one a test can
hold. What the app still does not do is chase anybody.

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
| The frozen result | `night_settlement` | `settlement` |
| What the group is set up as | `club` | `book` (name, `currency_code`, `default_buyin`, `stakes`, `rounding_mode`) |
| Which table this is | `night.table_name` | `session.table_name` |
| Who is still on the roster | `club_member.removed`, `.pays_kitty` | `player.removed_at`, `.pays_kitty` |
| Who has actually paid | `night_payment` | `transfer_payment` |
| Waiting to be sent | `outbox_op` | — |
| Which name is me | `night.me_id` | `player.claimed_by_user_id` |

The bottom half of that table is `0014`. Everything above it needed **no
migration** — `money_rule`, `final_count` and `settlement` were built in `0001`
and had simply never been written to — and everything below it had nowhere on
the server to land at all: a group's own settings, which table is which, the two
standing answers about a person, and the row of ticks on E7. See B69–B74.

---

## The write points — what is stored, and exactly when

Every one of these writes locally first and returns immediately. The queued
column is what goes to the server, in order, whenever there is a connection.

| Moment | Written locally | Queued for the server |
| --- | --- | --- |
| **Make or rename a group** | `club` | `book` — the name, and the group's settings with it |
| **Change the group's currency, buy-in, blinds or rounding** | `club` | `book` |
| **Add a player to the group** | `club_member` | `book` (first time only), `player` |
| **Rename a player** | `club_member`, `night_player` for every night still in play | `player` |
| **Exempt somebody from the kitty** | `club_member.pays_kitty` | `player.pays_kitty` |
| **Remove a player** | `club_member.removed`, and `night_player` where they hold nothing | `player.removed_at` — never a delete: the book keeps the row every night still points at |
| **Open a night** | `night`, `night_player`, rules | `book` (first time only), `player`, `session` (with its table name), `session_seat`, `money_rule` |
| **Rename a table** | `night.table_name` | `session.table_name` |
| **Seat someone** | `night_player` | `player`, `session_seat` |
| **Buy-in / rebuy / cash-out / expense** | `night_entry` | `ledger_entry` |
| **Correct or void an entry** | `night_entry` (a new row) | `ledger_entry` (a new row) |
| **Edit or delete a money rule** | `night.rules_json`, or `club.rules_json` between games | `money_rule` — an upsert, or a delete |
| **Change tonight's rounding** | `night.rounding_mode` | `session.rounding_mode` |
| **Move a night to counting** | `night.status`, `night.ended_at` | `session.status` — and *not* `ended_at`, see below |
| **Count a player's chips** | `night_count` | `final_count` |
| **Confirm a shortfall** | `night.ack_json` | — carried in the settlement at close |
| **Close the night** | `night_settlement`, `night.status`, `night.ended_at` | `settlement`, `session` (status + `ended_at`) |
| **Tick who has paid** | `night_payment` | `transfer_payment` — and un-ticking deletes the row |

Three things worth noticing.

**A night publishes the moment it opens**, not when it is shared. By the first
buy-in the server already has the book, the session, the players and the rules,
so every entry after that has somewhere to land.

**A night moving to counting sends its status and NOT its ending.** The server
checks `(status = 'settled') = (ended_at is not null)`, so stamping the moment
the cards stopped onto a night that is still counting is a row the database
refuses — and a refused row at the head of the queue stops every night behind it.
The ending goes up with the close, where the status moves with it and the check
holds. `sessionPatch` has no `ended_at` at all, and `03_sync_contract.sql`
asserts that the other order is rejected.

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
  kind        text   -- what happened at the table:
                     --   'session.open' | 'player.upsert' | 'seat.upsert'
                     --   'entry.append' | 'rule.upsert'   | 'count.upsert'
                     --   'session.close'
                     -- what it happened under:
                     --   'book.upsert'  | 'session.patch' | 'player.terms'
                     --   'rule.delete'  | 'payment.set'
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

**It drains after each write, when the app comes to the foreground, and on a
timer while anything is waiting.** There is no connectivity library involved:
the attempt *is* the connectivity check, and a failure just leaves the queue
where it was.

⚠ **This paragraph promised all of that for weeks before any of it existed**,
and two of the three were built on 18 September. There was no `AppState`
listener, no timer and no drain on sign-in, and the sentence below about signing
in on Tuesday was false for the same reason.

The foreground drain and the timer are `backupPump.ts`, mounted once at the
root beside `openNight`. The policy is `retrySchedule.ts` and is pure: 15
seconds after a failure, doubling, capped at five minutes — and **null when the
queue is empty, which cancels the timer rather than slowing it**. There is
nothing to send, the next write will push by itself, and a timer over an empty
queue is battery with no upside. Opening the app resets the backoff, because a
person opening it is information about the network that no backoff has.

**And signing in wakes it too**, which is the one that makes the signed-out
paragraph below true without a tap: the queue fills whether or not there is an
account, so signing in is the moment a phone full of nights becomes able to send
them.

⚠ **The timer must know whether anybody could send**, or it never stops. `drain()`
returns early with no session, so a host playing signed out — supported on
purpose — keeps `waiting` above zero all evening, and a timer that looked only at
the queue depth would wake every five minutes until morning to call a function
that returns immediately. `nextWake` takes `canSend` for that reason. It was
found writing the sign-in drain, not by anything going red.

⚠ **`drain()` coalesces now, and had to.** `flushOutbox` reads a batch, sends
it, and only then removes it, so two runs read the same batch and send it twice
— harmless to the server, since every operation is an idempotent upsert on a
client id, but the same night over somebody's mobile data twice, and
`books.clear()` emptying the id cache underneath a run already using it. That
was a near-impossibility with one drain after each write and one button; with a
timer it is the ordinary case. A caller arriving mid-drain gets the run already
in flight.

What "after each write" covers changed on 17 September, and it is worth knowing
which writes. Recording money has always pushed behind itself — `recordEntry` —
so a night being played is up to date to its last entry. **The ending flow had
nothing**: counting writes `night_count` and not the ledger, and the close and
E7's ticks come after the last entry there will ever be, so a night settled with
no signal sat on one phone until the host's next game. `setFinalCount`,
`setStatus`, `closeNight` and `setPaid` now push like everything else. B83.

Nothing here is open any more: a push that fails is tried again on a backoff,
when the app is next opened, and when somebody signs in.

### Signed out

⚠ **And a watch link is signed out** — B91. `redeemShareToken` and
`redeemInvite` both sign in anonymously first, so a watcher's phone holds a real
session with no account behind it, and both gates here read `session !== null`
as permission to send. That phone would have pushed the local book under an
identity every row policy refuses, and **the queue halts at its first failure**,
so the first refusal parks the whole book behind something it can never get
past, with the pump retrying it on a backoff. The predicate is `canSend()` in
`who.ts` now, and it is the same one the screens ask.

The queue still fills. Nothing is dropped and nothing is gated: play the whole
night with no account, sign in on Tuesday, and the night goes up. Since
18 September that is true of the sign-in itself and not only of the next write:
the pump watches auth and drains on the transition into signed-in. That is strictly better than refusing to record what cannot yet
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

**Built 17 September — B84, and until then this paragraph described nothing.**
Settings drew `Where it lives: On this phone`, a constant, identical on a phone
whose every night was on the server and on one that had never reached it. A
queue depth sat beside it, which was honest as far as it went, and the ERROR was
nowhere: `syncStatus()` had returned `{ waiting, lastError }` since the
operation log landed and its only caller in the repository was a test, so a
queue stuck behind a refused row looked exactly like one that was merely busy.
The three states were `backupLine()` and `backupTrouble()`, pure and tested —
including the one that matters most, that **"not asked yet" must never read as
"Backed up"**.

**They are `accountLine()` now — 20 September, B90 — and the rule above is why.**
Reading the queue alone, `Backed up` fell out of `waiting === 0`, and that is
the state of a phone with NO ACCOUNT the moment it is installed: the seeded
night is kept out of the queue by `queueable.ts`, so the count is zero, nothing
has ever been sent and nothing can be. Same fault as B84, one axis over. The
queue depth and the sign-in are one question — is there a second copy of this
book — and `apps/mobile/src/lib/accountLine.ts` answers it once, from every
fact at once, held by `accountLine.test.ts` which carries B84's six cases over
unchanged. **`Backed up` is now unreachable without an account.**

**The row moved with it, which closes the first of the two flags that were open
here.** It sat under a heading that said *This night* while counting the whole
app's queue; it is the first row of the Account section now, beside the sign-in
it depends on, and the section it left is headed *This phone* — which is what
the two backup controls remaining in it actually write.

⚠ **The other flag still stands.** A stale `last_error` is hidden rather than
cleared: `remove()` deletes the operation the error belonged to and nothing
clears the column, so the trouble line is suppressed whenever the queue is
empty — and, since B90, whenever nobody can send, because the last account's
complaint under a sentence about having no account is a second and wrong answer.
Clearing it properly belongs in the store.

### The third copy

**Built 18 September.** The phone holds the book and the server holds it again,
and that was the whole of it: nothing ever left this app in a form anybody could
keep, so a phone lost before its queue drained took the night with it — and
after B83 that window is small, but it is not zero, and a Supabase project can
be deleted by its owner in one click.

`Settings → Copy a backup` writes every night on the phone to the clipboard as
versioned JSON, with each settlement through `freeze()`. `Restore from a
backup` reads it back through `importNights` — the pull's own path, with a paste
instead of a server — so it is additive and safe to run twice.

It needs no account and no server, which is the point of it: the phone with
nothing else holding its book is exactly the one that never signed in. See
`docs/sharing-formats.md` §7, and `bookBackup.test.ts`, which restores into a
thrown-away database rather than asserting the shape looks right.

**Open:** a real file, which needs `expo-file-system` and `expo-sharing` — both
in SDK 57's manifest, neither yet confirmed in Expo Go, which
`apps/mobile/AGENTS.md` requires before either is designed around. A clipboard
is fine for a season and awkward for years of nights.

### Passing the book

**One device writes a night — and since 23 September, which one can move.**
`ledger_entry` is unique on `(session_id, seq)`, so two phones both numbering
entry 7 for the same night is a collision the server refuses, correctly. That
stays true. What changed is that the writer is no longer fixed to the book's
host: `session.writer_user_id` names it (null is the host, which is every night
recorded before `0016_pass_the_book.sql`), and it moves only two ways.

- **A code.** The phone recording a night issues ten characters
  (`/pass-book`, from Settings); a signed-in phone redeems them (`/take-over`).
  The night is that account's from then on. The host redeeming one is the night
  coming home.
- **The host taking it back** (*Take the night back*, Settings, held for a
  second), with no code — for the phone that went flat with the night on it.

**Nothing either phone recorded is lost — `0017_nothing_lost.sql`.** A phone
that still had changes queued when its night moved cannot put them in the ledger
(the ledger has one writer and one numbering), so it **hands them in**: each
operation, exactly as queued, is kept on the server beside the night
(`night_late_change`) with a status — *waiting*, *added* or *left out*. The phone
recording the night sees *N changes from another phone · Review* above its dock
and decides each one on `/late-changes`; adding re-records it there, in that
phone's numbering and under its original id, so a copy that did get through
after all collapses to one row. A person decides because the host may already
have recorded the same rebuy again by hand. Nothing is deleted either way, and
the phone that made the changes reads what became of each in Settings.

A phone never replaces its copy of a night while anything for it is still
queued (`replaceNight` refuses); it hands in first, and with no signal it simply
waits, marked away, until it can.

**The code is enough (0017).** An anonymous phone may redeem one and write that
night and nothing else — the host's book-level powers still refuse an anonymous
caller. Such a phone drains a view of its queue holding only the nights it was
handed (`handedNightsOnly` in `sync.ts`), so B91's hazard — a refusal parking the
whole queue — cannot come back through it.

Two phones writing the same night at once was the other option, and it was
considered and not built: it needs numbering that cannot collide, a live merge
both ways, and an answer to who may count, close and settle. Passing keeps every
property this document is built on — there is still nothing to merge.

**The rules that make it safe, and where each one lives:**

| Rule | Where |
| --- | --- |
| Exactly one account can write a night, and the host is not it while it is passed | `can_write_session`, every session-scoped write policy — `0016` |
| The writer column moves only by the functions, never by an UPDATE | trigger `session_writer_guard` — `0016` |
| A code is one use, ten minutes, one live per night | `night_handover` — `0016` |
| A code is issued only when nothing for the night is waiting to send | `issuePass` — `handover.ts` |
| The code works only while the sheet showing it is open, so nothing is recorded between issuing and taking | `pass-book.tsx`, `checkHolds` withdraws an orphan |
| The phone taking a night replaces its copy with the server's and numbers on from the server's highest | `replaceNight` — `nightStore.ts` |
| The phone that passed a night refuses every write to it, locally and in the queue | `refuseIfAway`, `send()` — `nightStore.ts`, `sync.ts` |
| A queue for a night that moved is handed in to the server, never dropped and never left to halt the queue | `handIn`, `movedAway` — `sync.ts`; `night_late_change` — `0017` |
| A copy of a night is never replaced over changes still queued for it | `replaceNight` — `nightStore.ts` |
| The taker's roster and rule writes go to the host's book, never a new one | `hold.ts` `book_id`, `heldBookFor` |

**What the taker may do.** Everything on the night — money, seats, counts, the
close, the ticks afterwards — and, while it is unsettled, add or rename people
in the group and change its money rules, because a night in progress needs both
and on the server they are book-level rows. Never remove anybody. They can read
the whole book from the moment they redeem a code, and keep reading it: they
recorded part of a night in it.

**Which account.** Any, since 0017 — the code is the grant. A phone with no
session is signed in anonymously on the way, as claiming a seat does.

`supabase/test/09_pass_the_book.sql` and `10_nothing_lost.sql` play it through;
`apps/mobile/src/lib/handover.test.ts` holds the phone's half.

⚠ **Not yet seen on two phones.** Everything above is checked against a real
Postgres and a real SQLite, and none of it against a real handover across a
table.

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

**`storageCoverage.test.ts` is the third one, and it is a different shape,
because the failure it exists for is a different shape.** B69 to B73 were not
wrong figures: `writeRules` wrote the night's rules to SQLite and queued
nothing, `setStatus` moved a night to counting on the phone alone, and the app
worked perfectly in every case. Nothing that looks at behaviour can see that. So
this reads the source of both stores, lists every exported operation, and holds
the list against a table in which each one names either the queue operation that
carries it or WHY it stays on the phone. Add an export to either store and it
fails, naming the function and asking the question nobody remembered to ask.
"Reads only" and "local by design" are answers; silence is not.

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

**`durability.test.ts` is the fourth, and it is the only one that runs the
queue.** Everything above checks a *shape* — the right columns, an operation
that names where it goes. None of them ever drains anything, so the promise the
queue actually makes was held up by nothing: that what is written down arrives,
in an order the server will accept, however badly the evening goes. It runs the
real `SqliteOutboxStore` on a real SQLite (through `testSqlite.ts`), the real
dispatch in `sync.ts` and the real rows out of `syncRows.ts`, against a fake
Postgres that can be taken offline, made to refuse one table, and asked
afterwards what it saw and in what order. The five things it holds are the five
ways a night has been lost: a queue that discards its batch on failure, a queue
that does not survive a force-quit, a drain that skips past a refusal, an entry
sent twice as two buy-ins, and numbering that restarts at 1 after a clean sync
and collides with what the server already holds. Each is a mutation that turns
it red.

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

   **And for eleven days nothing read what it wrote.** The nights landed in the
   `night` table, correctly, with their ledgers, their seats, their counts and
   their frozen settlements — and the two screens that show a person their own
   history went on reading the single night the store was holding, with eight
   invented ones behind it. They also landed with `me_id` NULL, because the one
   write that stamps it refuses to touch a settled night and every night off the
   server is settled before it lands. Neither was a regression and neither broke
   anything: the pull worked, the screens rendered, the tests passed. B77 and
   B78, and `book.test.ts` is what now goes red.
4. ~~**The rest of the book.**~~ **Built** (`0014`). The queue carried the
   money and nothing around it: a group's own settings, which table is which,
   who is still on the roster and who has paid were written to one phone and had
   nowhere on the server to land. They do now, they go up, and the pull reads
   them back. `storageCoverage.test.ts` is what stops the list growing again
   without anybody noticing. B69–B74.
5. **Verification.** An edge function that re-settles from the snapshots and
   flags any disagreement. Cheap once the snapshots are there, and it is what
   makes "the client calculated it" a non-issue.

Phases 1 and 2 are what "the results are stored" means. Phase 3 is what "and
retrievable" means. Phase 4 is what makes "stored" mean the whole book rather
than the money in it. Phase 5 is what makes it auditable.
