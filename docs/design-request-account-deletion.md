# Prompt: deleting an account — the mechanics, and a board for the sheet

**Why this file exists.** Apple refuses an app that creates accounts and cannot
delete them in-app (guideline 5.1.1 (v)); it is blocker A1 in
`app-store-launch.md`. This app creates three kinds of account and has no way to
delete any of them — not a screen, not a function, and five foreign keys that
would make a raw delete of `auth.users` fail at Postgres. `accounts-roadmap.md`
Stage 1 left it open on one question: *what happens to a group, and to the
nights other people played in, when its host goes.*

The first half of this file answers that question and works the mechanics out
against the schema as it stands at `0020`. The second half is the prompt to
paste into the design tool. The mechanics come first because the sheet has to
tell the truth about them, and there is more than one truth depending on who is
deleting.

---

## Part 1 — the mechanics

### The rule everything follows

**The person leaves; the record stays.** The ledger is append-only — a void is a
new row, not a deletion — and a settled night is the *group's* record of money
that changed hands, not the property of whoever held the phone. Deleting an
account removes the person: their email, their identity, every link from their
user id to a seat, a grant, a plan. It never removes a figure from a night that
somebody else played in.

The one exception is the record nobody else can read. A host who typed six
first names into a book that nobody ever claimed a seat in holds a private
ledger: the names are theirs, the figures are theirs, and no other account can
see any of it. That book goes with them. Keeping it would be keeping data with
no owner and no reader, which is the thing GDPR objects to.

### Who can be deleting (three accounts, one button)

The phone knows which it is — `who.ts` already answers `nobody | anonymous |
person` — and the sheet reads differently for each, but it is one row in
Settings and one function on the server.

| Account | How it came to exist | What it holds |
|---|---|---|
| **Watcher** (anonymous) | opened a share link once | `share_grant` rows; nothing else |
| **Member** (anonymous, claimed) | typed a ten-character code | a `player.claimed_by_user_id` in one or more books; perhaps a night passed to them (`session.writer_user_id`, `night_pass`, `night_handover`), late changes they handed in |
| **Person** (email) | signed in by magic link, or spent a promo code | hosts 0 or more `book`s; an `entitlement`; perhaps a seat in somebody else's book; invites they issued; discrepancies they signed; `app_admin` if they are you |

A watcher does not know they have an account. The row still has to exist for
them — Apple does not distinguish — but for them it reads as *remove this
phone's access*, and that is what it does.

### What deletion does, by what the account holds

Worked as one function, `delete_my_account()`, `security definer`, keyed on
`auth.uid()` and nothing else — nobody deletes anybody but themselves. In order:

1. **Refuse, for now, if a game is running on this account.** Two cases: the
   caller is the writer of an open session (they record tonight on this phone),
   or the caller hosts a book with any session still open (somebody they passed
   the game to is recording it). Deleting under either strands a live ledger
   and an outbox that can never drain. The refusal is *finite* — settle the
   night, or take it back and settle it — so it is not the permanent refusal
   Apple rejects. It returns which night, so the sheet can point at it.

2. **Every seat they claimed becomes a name again.** `player.claimed_by_user_id`
   → null, in every book. The row, its display name and every entry against it
   stay: the host typed *Petr*, and *Petr* still won $120 on the 14th. This is
   exactly what `revoke_player_invite` (0012, "reset") does today, and it is
   already the FK's own action. The host of that book sees the seat as
   unclaimed and can re-invite it; nothing tells them why, and nothing should.

3. **Every book they host is decided by whether anybody else is in it.**
   - **No claimed seat, and no share grant still live** → the book is **deleted**,
     and `on delete cascade` takes its players, sessions, entries, rules,
     settlements, invites and passes with it. It was a private ledger.
   - **Anybody else holds a seat** → the book is **closed** (`status = closed`,
     `closed_at = now()`) and its `host_user_id` is set to **null** — a book with
     no host, which is a new state and the one deliberate schema change here.
     Every member keeps reading every night and every settlement they were in,
     for ever, from their own phone. Nobody can add to it, start a night in it,
     or change its roster: every host policy asks `host_user_id = auth.uid()`
     and null is nobody. It is a finished book, read-only, the way a closed
     book already is.
   - **Handing the group to somebody first** is the better ending and it does
     not exist yet: there is no `transfer_book`, and a receiver would need an
     email account and a plan, which most members (anonymous) do not have. It
     is a separate feature, drawn separately, and **deletion does not wait for
     it** — a refusal that can only be lifted by a feature that is not built is
     a permanent refusal. When it exists, the sheet gains one row above the
     destructive one; the mechanics below do not change.

4. **Anything they were in the middle of is tidied.** Live invites they issued
   are revoked; a night passed *to* them reverts to its host
   (`writer_user_id` → null, which the FK does); handover codes they minted die
   (`cascade`); their waiting late changes are left in place with their author
   blanked, so the recording phone still gets to decide them.

5. **Their plan goes with them.** `entitlement`, `promo_redemption`, `app_admin`
   all `cascade`. A founder who deletes and signs up again with the same address
   is a new user with no plan — say so on the sheet, once, plainly. The
   redeemed count on a promo code does not go back up. `billing_event` keeps
   its rows with `user_id` nulled: store transactions are a financial record
   and are kept regardless, which the privacy policy will say.
   **An App Store subscription is not cancelled by deleting the account** —
   only Apple can stop it — and Apple expects the app to say so and point at
   where it is cancelled. The host sheet carries one line and a *Manage
   subscription* action (StoreKit's manage-subscriptions sheet) whenever the
   account has an `entitlement` with `source = 'apple'`; nobody else sees it.

6. **Then `delete from auth.users where id = auth.uid()`**, inside the same
   function, which Supabase's own schema cascades to identities, sessions and
   refresh tokens. The email is gone from the server at that moment. No
   `service_role` key is involved anywhere — same discipline as
   `redeem_share_token`.

7. **The phone finishes it.** On success the app forgets the session, drops its
   SQLite (nights, groups, outbox), and opens as a phone with nothing on it.
   The one thing offered *before* the hold is the existing clipboard backup
   (Settings → *Back up*), because a host's own record leaves with them and
   the paper it replaced would not have.

### The schema, as it stands, cannot do this — five things in the way

These are the concrete reasons a migration is needed, not a function alone.

| Column | Today | Problem | Change |
|---|---|---|---|
| `book.host_user_id` | `not null … on delete restrict` | a host can never be deleted | **nullable**; keep `restrict` as the safety net (only the function may empty it, by closing the book first) |
| `player_invite.created_by` | `not null … on delete restrict` | a host who ever issued an invite can never be deleted | nullable, `set null` |
| `settlement.discrepancy_confirmed_by` | `on delete restrict` | a host who ever signed a discrepancy can never be deleted | `set null`; the fact stays in `discrepancy_confirmed_at` and `discrepancy_note`, which is the rule 0002 exists for |
| `player_invite.claimed_by` | `set null` **but** `check ((claimed_at is null) = (claimed_by is null))` | the FK's own action violates the constraint — the delete fails on the first claimed invite | the function marks those invites `revoked_at = now()` and nulls both, or the constraint is loosened to allow a claim whose claimant is gone |
| `night_handover.redeemed_by` | `set null` **but** `night_handover_redeemed_whole` says the same | same failure, on the first code the person ever redeemed | same fix |

And three that work by accident and should be decided rather than inherited:

- `night_pass.from_user` / `to_user` are `cascade`: deleting Lena deletes the row
  that says *passed to Lena at 23:10* out of a night's feed and its role line.
  Better **nullable + `set null`**, and the feed reads the gap as a person who
  has left. That is one new string (below).
- `night_late_change.from_user` is `cascade`: a person's *waiting* changes vanish
  with them before the recording phone has decided. Better `set null`.
- `ledger_entry.created_by_user_id` has **no foreign key** — a bare uuid. After
  deletion it points at nothing, which is fine (a random id with no row behind
  it identifies nobody) and is worth one line in the privacy policy.

### The name that stays, and why Apple allows it (owner, 28 September)

5.1.1 (v) asks for the account and the data it holds to be deleted. After step
2 nothing the deleted account supplied is left: no email, no sign-in, no link
from any seat. What stays is the seat's display name **as the host typed it**
and the figures against it. Both were written by the host, into the group's
record of money that changed hands between other people, and a night only
balances with every seat in it.

Decided, and not offered as a choice: the member is **told, before the hold**,
that their name as the group's admin added it and the nights they played stay
in the group's history. No "show me as Former player" option. Members cannot
set their own name, photo or any other detail today, so there is nothing of
theirs on the seat to remove; **if renaming yourself is ever added, deletion
must put the host's original name back** — keep the original on the row when
that feature is built.

The privacy policy says the same in the member line and the retention list.
The one residual risk is a reviewer's reading, and the disclosure on the sheet
is what answers it.

### Two decisions taken here, and why

**Immediate, not a grace period.** Apple allows a delayed deletion if the app
says so, and a mistaken host deletion closes a group irreversibly. Against
that: a grace period is a `pending_deletion_at` column, a scheduled job, and an
interception on every sign-in for a week, for an app with no job runner yet;
and the irreversible part is bounded — when anybody else is in the book, the
*record survives*, only the host's right to add to it ends. The confirm is the
app's one existing hold, 1.5 s, the same gesture that ends a night, and there
is no tap path to it. If the owner wants the week, it is a later addition and
the sheet gains one sentence.

**Removing a member and a member leaving are the same write.** B57 (open) is
that *Remove from the group* revokes nothing. The fix is the write in step 2
above — `claimed_by_user_id` → null plus a hidden flag — done by the host on
one player. Deletion does it for every seat of one person. Build them as one
server function with two callers, so B57's `db:verify` case and this one are
the same assertion: `is_book_member` is false afterwards.

### Tested by

- `supabase/test/` gains a suite: each of the three accounts deleted with each
  shape of holdings; the refusal while a game runs; a book with one claimed
  seat survives closed and hostless while an unclaimed one is gone; every
  member policy still passes for the survivors; `is_book_member` false for the
  deleted person; `auth.users` row absent.
- `db:verify` asserts the two check constraints no longer fight their FKs.
- `check:ui` walks the sheet in its states (below) once the board exists.

---

## Part 2 — the prompt

Paste the block below into the design tool. It asks for **one sheet, in the
states the mechanics above produce**, inside the existing system, and it
deliberately asks for nothing on any other screen.

**Keep the copy block in sync with `apps/mobile/app/settings.tsx` when this is
built.** Nothing below is on screen yet; every string is a placeholder to be
replaced, not a decision.

---

```text
I need a board for one screen of the poker cash-game ledger app: the sheet a
person gets when they delete their account, in the states the server can
produce. It is required by App Review and it does not exist in any form. This
is a new board rather than a delta.

Work inside the existing system — Style Guide v2, rev 18 geometry, the six
boards, and the Settings screen as it stands. Do not introduce a colour, a
radius, a type size or a component that is not already in it. If the screen
seems to need one, tell me instead.

## THE PRODUCT, IN THREE SENTENCES

One person, the host, records every movement of money in a home poker game.
Players claim a seat with a code and watch the same list on their own phones;
watchers open a share link. When the night ends the app counts the table and
says who pays whom, and the nights add up into the group's book.

## THE RULE THIS SHEET HAS TO TELL THE TRUTH ABOUT

The person leaves; the record stays. Deleting an account removes the person —
their email, their sign-in, every link between them and a seat — and never
removes a figure from a night that somebody else played in. A settled night is
the group's record, not the phone-holder's.

So what deleting does depends on who is deleting, and the sheet has to say
which of these it is before anyone holds the button:

  A WATCHER — a phone that once opened a share link. It does not know it has an
  account. Deleting removes this phone's access and nothing else. For them the
  row should not even read as "account".

  A MEMBER — somebody who claimed a seat with a code. Their seat becomes a name
  again: the host still sees "Petr" and every night Petr played, and can
  re-invite the seat. The person's phone loses its nights and stats. They are
  TOLD this before the hold — their name, as the group's admin added it, and
  the nights they played stay in the group's history. It is a notice, not a
  choice: there is no "hide my name" option, and none should be drawn.

  A HOST — the person who runs one or more groups. For each group:
    - nobody else ever claimed a seat → the group is deleted outright, every
      night with it. It was a private ledger and it goes with its owner.
    - anyone else holds a seat → the group is CLOSED and kept. Every member
      goes on reading every night they were in, for ever. Nobody can add to it
      or start a night in it again. It has no host.
  A host may also hold a seat in somebody else's group, in which case the
  member rule applies to that as well.

  ANY OF THEM, while a game is running on their account (they are recording
  tonight, or somebody they passed the game to is) → the server refuses, for
  now, and names the night. Settle it or take it back first. This is the only
  refusal and it always ends.

Deletion is immediate. The confirm is the app's one hold — 1.5 s, the same
gesture that ends a night — and there is no tap path to it. A founder or a
paid plan does not survive deletion; signing up again with the same address is
a new account with nothing on it. An App Store subscription is NOT cancelled by
deleting — only Apple can stop it — so a host who pays through the App Store
sees one line saying so and a "Manage subscription" action that opens Apple's
own subscriptions sheet. Nobody without one sees it.

## THE ONE THING OFFERED FIRST

The host's own record leaves with them. Settings already has "Back up", which
copies the whole book as text to the clipboard. The sheet should offer that
once, above the destructive action, in a way that a person about to lose their
record will actually see — not as a footnote under the button. Whether it is
a row, a line, or the primary in a first stage is your call.

## STATES TO DRAW

  S1  Settings → Account: the row that opens this. One row, last in the
      section, after "Sign out". Wording differs for a watcher (access, not
      account). Draw the row in the section as it exists.

  S2  The sheet, HOST, with at least one group that will close and at least one
      that will be deleted, and the App Store subscription line (draw it on;
      it is absent for anyone not paying through the App Store). This is the hardest state and the one to design
      first: it has to list groups by name with what happens to each, offer the
      backup, and carry the hold. Draw it with two groups; it must hold with
      one and with four.

  S3  The sheet, MEMBER: one or several seats, each named with its group.

  S4  The sheet, WATCHER: one line and the hold. The smallest version.

  S5  Refused — a game is running. Names the night and the group, one action
      that goes there, and no hold on the screen.

  S6  Working, then done: the moment after the hold completes, before the app
      restarts as an empty phone. The server call can take a second or two.

  S7  Failed: no signal, or the server said no for a reason that is not S5.
      The account still exists and the sheet has to say so.

A multi-step flow REPLACES ONE SHEET'S CONTENT and keeps one close; a sheet
never pushes. If you split S2 into two stages (backup, then the hold), that is
the mechanism.

## HARD CONSTRAINTS — shipped, not up for redesign here

- It is a SHEET, Chrome B: grabber, close in the corner, swipe down. Never a
  round back button, never anything else in the top-right.
- Sheet geometry is doc 15 §3 exactly: radius 26 26 0 0, grabber 38×5, header
  padding 12/22 with the title at 32/800 tracking −.03em, close a 30 circle,
  footer padding 14 20 6 with buttons at 17 vertical padding, radius 8, 17/700.
  Reserved bottom block 82. A sheet hugs its content; if the body does not fit,
  the sheet goes full-height and only the body scrolls.
- The hold is the existing HoldButton: 1.5 s, outline, icon-less, 14 padding,
  radius 10, 1.5 px outline. Its label and its fill progress are what you can
  draw; its duration and gesture are not.
- Type scale as shipped: body 17/500, lede 14.5/400 at 22 line, footnote
  12.5/400 at 19 line, caps label 11/700 at +1.1 tracking.
- NO BRAND ACCENT. Green and red mean money won and lost, in this app and
  nowhere else. Nothing on this sheet is money. The destructive action is the
  loss colour if anything is, and nothing else on the sheet is coloured.
- Both themes. Light is not white everywhere; white is a surface.
- 393 × 852 is the reference frame; it must hold at 320 wide and at the
  largest accessibility text size with no group name clipped — group names are
  typed by hosts and can be long.

## COPY — every string is a placeholder to be replaced

The house voice is plain, specific, never apologises, and never says "are you
sure". Several labels in this app were written to defuse an argument at a
table; the same register applies to somebody leaving.

  S1 row:      "Delete account"                   (host, member)
               "Remove this phone's access"       (watcher)

  S2 title:    "Delete your account"
  S2 lede:     "You leave. The record stays."
  S2 per group, will close:
               "{Group} · closed and kept. {n} people keep every night they
               were in. Nobody can add to it."
  S2 per group, will be deleted:
               "{Group} · deleted. Nobody else ever had a seat in it, so it
               goes with you."
  S2 own seat elsewhere:
               "Your seat in {Group} becomes a name again."
  S2 plan:     "Your plan ends with the account. Signing up again starts
               from nothing."
  S2 store subscription (only when paid through the App Store):
               "Deleting does not stop your App Store subscription. Cancel it
               there first."
               action: "Manage subscription"
  S2 backup:   "Copy a backup first" — the existing action; and one line on
               what it is: "The whole book, as text, on your clipboard."
  S2 hold:     "Hold to delete"

  S3 title:    "Delete your account"
  S3 lede:     "Your seat in {Group} becomes a name again. {Host} still sees
               every night you played, and can invite you back."
  S3 record:   "Your name, as {Host} added it, and the nights you played stay
               in {Group}'s history. They are the group's record of the money
               that changed hands."
  S3 phone:    "This phone loses its nights and stats."

  S4 title:    "Remove this phone's access"
  S4 line:     "This phone stops seeing the night it was shown. The host can
               share it again."

  S5 title:    "A game is running"
  S5 line:     "{Group} is recording tonight on your account. Settle it, or
               take it back and settle it, and come back here."
  S5 action:   "Go to tonight"

  S6:          "Deleting…" then "Done. This phone starts over."
  S7:          "Nothing was deleted. There was no answer from the server."
               "Nothing was deleted. {reason}"

  Feed row, elsewhere, when a person who passed or received a game has since
  deleted: the role line currently reads "passed to Lena at 23:10". It needs
  one form for a name that is gone. Proposed: "passed to a former member at
  23:10". Flag it if you would rather it read differently; do not leave it
  unanswered — it is the one string on another screen this produces.

If a state I have not listed needs a string, flag it instead of filling it in.

## OPEN QUESTIONS — ANSWER THEM ON THE BOARD

1. Is the backup a row inside S2, or a first stage of the sheet that the hold
   only appears after? The second is safer and one step longer.
2. A host with several groups: a list with a line each, or one sentence with
   the counts? Draw whichever holds at four groups with long names.
3. Does S1 sit inside the Account section, or in its own section at the very
   foot of Settings, apart from everything that is not destructive?

## WHAT TO HAND BACK

1. A board for S1–S7, at 393 × 852, in the same format as the existing six:
   every dimension, weight and colour inline on the element, so it can be
   copied rather than re-derived.
2. Both themes.
3. A short note on anything you deliberately departed from in the existing
   system, and why. It is recorded in docs/screens.md against this screen.
4. Your answers to the three questions above, and your form of the one
   feed-row string.

## WHAT I AM NOT ASKING FOR

Handing a group to another person before leaving. It is the better ending and
it is not built; when it is, S2 gains one row above the hold and nothing else
here changes. Nothing on any other screen beyond the one feed string. No
change to the sheet object, the tokens, or the navigation vocabulary — if this
screen makes you want to change one of those, say so separately.
```

---

## For whoever applies the result

- The board lands in `boards/`; `docs/screens.md` gains a row for the sheet and
  the S1 row on `/settings`, held against it; the feed string goes in the
  game-admin section beside the other role-line strings.
- **The migration and the function come first, with their suite**, before the
  sheet. Number it after whatever is on `main` that day, and touch nothing but
  the columns in the table above plus `delete_my_account()` and the shared
  unclaim used by B57 — B57's fix rides the same migration or the one after,
  never a third copy of the write.
- The sheet is one session and one file (`settings.tsx` plus the new sheet
  route); B57's `member.tsx` change is another session. They do not open the
  same file.
- Write the `bugs.md` entry for A1 before building, per `CLAUDE.md`, and name
  the `db:verify` case and the `check:ui` walk that go red if it regresses.
- The privacy policy (`app-store-launch.md` Step 4) gets three sentences from
  this file: what deletion removes, that a closed group's figures stay for its
  members, and that store billing records are kept.
