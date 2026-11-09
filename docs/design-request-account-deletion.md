# Prompt: deleting an account — the mechanics, and a board for the sheet

> **9 November — Part 1 is built and live** (`0024`–`0026`, B107, B108), and
> **Part 2 was rewritten the same day** against what the server actually hands
> the sheet (`account_deletion_plan()`) and Settings as it stands. Part 1 below
> is the reasoning, kept as written on 28 September; where it and the code
> disagree the code wins, and B107 says where (it found eight schema changes,
> not five). The board has not been drawn, so nothing is on screen.
>
> **Widened 9 November** to the name step at first sign-in (part B, server
> half in `0029_names.sql`) and a player renaming their own seat (part C, not
> built) — one board for the three.

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

**Rewritten 9 November against what is built** — `0024`–`0028` on `main` and
on the live project, and `apps/mobile/app/settings.tsx` as it stands. The
28 September version asked for a feed-row string that 0025 made unnecessary,
described the hold from memory, did not know what the server would actually
hand the sheet, and missed three states the server can produce (a group closed
with nobody counted in it, a seat whose group has no host name, an account
with nothing attached). It is replaced, not amended.

**Widened the same evening (owner, 9 November)** to two more things about
names, on the same board: an email account is asked **"Your name" at first
sign-in, and it is required** (0029 stores it), and **a player can change the
name on their own seat** — never asked for one, but free to change it. And 0029
fixed B48, so the "admin's name is missing" state the first rewrite asked for
can no longer happen and is gone from it.

Paste the block below into the design tool. It asks for **the delete sheet in
the states the server produces, the name step at first sign-in, and renaming
your own seat**, and nothing on any other screen. Every string in it is a
placeholder; the board's strings are the ones that ship.

---

```text
I need one board for three related things in the poker cash-game ledger app,
all about a person's account and their name:

  A. DELETING AN ACCOUNT — the sheet, in every state the server can produce,
     and the Settings row that opens it. App Review requires it.
  B. YOUR NAME AT FIRST SIGN-IN — an email account is asked for its name the
     first time it signs in, and cannot go on without one.
  C. RENAMING YOUR OWN SEAT — a player changes the name on their own seat in a
     group, which until now only the group's admin could do.

None of them exists in any form. This is a new board rather than a delta.

Work inside the existing system — Style Guide v2, the rev 18 geometry
(doc 15), the boards, and the Settings screen as it stands. Do not introduce a
colour, a radius, a type size or a component that is not already in it. If the
screen seems to need one, tell me instead.

## THE PRODUCT, IN THREE SENTENCES

One person, the admin, records every movement of money in a home poker game.
Players claim a seat with a code and follow the same night on their own phones;
watchers open a share link. When the night ends the app counts the table and
says who pays whom, and the nights add up into the group's history.

## THE RULE THIS SHEET HAS TO TELL THE TRUTH ABOUT

The person leaves; the record stays. Deleting an account removes the person —
their email, their sign-in, every link between them and a seat — and never
removes a figure from a night somebody else played in. The seat keeps the name
the admin typed for it, on every night and every hand-off, because the person
never gave us that name and a night only balances with every seat in it.

This is BUILT. The server already does all of it; the sheet only has to say it.

## WHAT THE SHEET KNOWS — exactly this, nothing more

Before the hold, the app asks the server what deleting would do, and gets:

  running   the night that stops it, if any: its GROUP NAME and when it
            started. Nothing else about it.
  groups    every group this person runs, each with its NAME, what happens to
            it — DELETED or CLOSED — and a number: how many OTHER people hold
            a claimed seat in it.
  seats     every seat this person holds in somebody else's group: the seat's
            name, the GROUP NAME, and the ADMIN'S NAME — always there: an
            admin is named by their own seat in the group, or by their account
            name (part B) when they run it without playing.
  store_subscription   whether a plan came through the App Store or Google
            Play. Nobody can buy one today, so this is false for everyone at
            launch — draw it anyway, as the state it will be.

And from Settings it already knows: whether the person is signed in with an
email or anonymously (a phone that claimed a seat with a code, or only opened
a share link), and their Plan row — Free, or Full / Regular with "· founder"
or "· until {date}".

If a state needs a fact that is not on this list — how many nights a group
has, who the other members are by name, how much money is in it — it is not
available. Draw without it, or tell me what you would need and why.

## WHO CAN BE DELETING — one row, one sheet, four readings

  A HOST — runs one or more groups. For each group:
    · DELETED: nobody else is in it. Every night, name and figure goes with
      them. It was a private ledger.
    · CLOSED: somebody else is in it. It is kept, read-only, with no admin,
      for ever; everyone in it keeps every night they were in. Nobody can add
      a night to it again.
    ⚠ A group can be CLOSED with a count of ZERO: "somebody else" also means a
      phone still watching one of its nights over a share link, or somebody
      the game was once passed to whose seat has since been reset. Draw the
      closed line so it reads true at 0 — do not write "{n} people keep…"
      where n can be 0.
  A host may also hold seats in other people's groups; the member reading
  applies to those as well.

  A MEMBER — holds one or more claimed seats, runs no group. Each seat becomes
  a name again: that group's admin still sees the name and every night, and
  can invite them back. They are TOLD, before the hold, that their name as the
  admin typed it and the nights they played stay in the group's history. A
  notice, not a choice — no "hide my name" option, and none drawn.

  AN ACCOUNT WITH NOTHING IN IT — signed in with an email, runs no group,
  holds no seat. Since 9 November this is every friend invited and not yet
  seated: an invite gives an account on Free and nothing else. The sheet has
  nothing to list. It still must not read as an error or an empty state.

  A WATCHER — an anonymous phone that only ever opened a share link. It does
  not know it has an account. For them the row and the sheet say "remove this
  phone's access", never "account".

  ANY OF THEM, while a game is running on their account (they are recording a
  night, or somebody they passed it to is, in a group they run) → refused, for
  now, naming the group. Settle it, or take it back and settle it. This is the
  only refusal, and it always ends.

Every one of them: their plan ends with the account. A founder or a plan given
by the owner does not come back by signing up again with the same address —
that is a new account on Free. Say it once, only when their Plan row is not
Free. An App Store subscription is NOT cancelled by deleting — only Apple can
stop it — so when store_subscription is true the sheet says so and offers
"Manage subscription", which opens Apple's own subscriptions sheet.

Deletion is immediate. There is no undo and no grace period.

## THE ONE THING OFFERED FIRST

A host's DELETED groups leave with them, and their phone is wiped after.
Settings already has "Copy a backup" (section THIS PHONE, directly above
ACCOUNT): the whole book, as text, on the clipboard. Offer it once, above the
hold, where a person about to lose their record will actually see it — not as
a footnote under the button. Only where something will be deleted; a member,
a watcher and an empty account lose nothing a backup would keep.

## THE HOLD — reuse it, do not redesign it

There is exactly one destructive hold in the app: "End this poker night", in
the Table admin drawer on Tonight (rev 18 doc 08, states H3 and H3b). Resting:
no fill, a 1.5px border in the loss red at 55 %, a glyph in red, two lines —
the label in red over a muted sub-line saying the gesture ("Hold 1.5s · …").
Holding: the border goes solid red, a left-to-right wipe fills it over 1.5 s,
the copy swaps to "Keep holding…" / "Release to cancel", and everything else on
the sheet drops to 40 %. Releasing early reverts with no dialog. Draw the
delete hold as that row — its label, its sub-line and its glyph are yours to
choose; its shape, its colour and its timing are not. There is no tap path to
deleting, anywhere.

## STATES TO DRAW

  S1  Settings, the row that opens this. Settings today, top to bottom: the
      group (name, currency, Your groups), the game (buy-in, Money rules,
      Rules & rulings, Poker calculator), PLAYERS (You, Players, Invited,
      I have an invite code), THIS PHONE (Copy a backup, Restore from a
      backup), ACCOUNT (Where it lives, Signed in as, Plan, Sync now, Fetch my
      nights, Connection, Share this night / Stop sharing, Sign out). Draw
      where the row goes, signed in with an email and as a watcher.

  S2  HOST: two groups, one DELETED and one CLOSED, a seat elsewhere, the
      backup, the plan line, the store line ON, and the hold. The hardest
      state; design it first. It must hold with one group and with four, with
      long group names, and with a CLOSED count of 0.
  S3  MEMBER: one seat, and three seats in three groups — one of them a seat
      the player renamed themselves (part C), so the sheet has to say the
      admin's original name comes back.
  S4  ACCOUNT WITH NOTHING IN IT: email account, Free, no group, no seat.
  S5  WATCHER: the smallest version. One line and the hold.
  S6  REFUSED — a game is running. Names the group and when it started; one
      action that goes to it; no hold on the screen.
  S7  WORKING, THEN DONE: the second after the hold completes, before the app
      restarts as a phone with nothing on it.
  S8  FAILED: no signal, or the server refused for a reason that is not S6.
      The account still exists, and the sheet says so.

A multi-step flow REPLACES ONE SHEET'S CONTENT and keeps one close; a sheet
never pushes. If S2 is two stages (backup, then the hold), that is the
mechanism.

## HARD CONSTRAINTS — shipped, not up for redesign here

- It is a SHEET, Chrome B: grabber, close in the corner, swipe down. Never a
  round back button, never anything else in the top-right.
- Sheet geometry is doc 15 §3 exactly — copy it from the boards, do not
  re-derive it. A sheet hugs its content; if the body does not fit it goes
  full-height and only the body scrolls.
- The hold is H3/H3b's row, as above.
- The type scale as shipped. No new sizes.
- NO BRAND ACCENT. Green and red mean money won and lost, and the red also
  means "this cannot be undone" on exactly one other control — the hold. Nothing
  else on this sheet is coloured.
- Both themes. Light is not white everywhere; white is a surface.
- 393 × 852 is the reference frame; it must hold at 320 wide and at the
  largest accessibility text size with no group name clipped — group names are
  typed by people and can be long.

## COPY — every string is a placeholder to be replaced

The house voice is plain, specific, never apologises, and never says "are you
sure". Several labels in this app were written to defuse an argument at a
table; the same register applies to somebody leaving one.

  S1 row:      "Delete account"                     (email, or a claimed seat)
               "Remove this phone's access"         (watcher)

  S2 title:    "Delete your account"
  S2 lede:     "You leave. The record stays."
  S2 closed:   "{Group} · closed and kept. {n} people keep every night they
               were in. Nobody can add to it."           (n ≥ 1 — and at 0?)
  S2 deleted:  "{Group} · deleted. Nobody else ever had a seat in it, so it
               goes with you."
  S2 seat:     "Your seat in {Group} becomes a name again."
  S2 plan:     "Your plan ends with the account. Signing up again starts
               from nothing."
  S2 store:    "Deleting does not stop your App Store subscription. Cancel it
               there first."   action: "Manage subscription"
  S2 backup:   "Copy a backup first" — "The whole book, as text, on your
               clipboard."
  S2 hold:     "Hold to delete"

  S3 lede:     "Your seat in {Group} becomes a name again. {Admin} still sees
               every night you played, and can invite you back."
  S3 renamed:  "You changed your name in {Group} to {Mine}. It goes back to
               {Theirs}, the name {Admin} gave the seat."
  S3 record:   "Your name, as {Admin} added it, and the nights you played stay
               in {Group}'s history. They are the group's record of the money
               that changed hands."
  S3 phone:    "This phone loses its nights and stats."

  S4:          no placeholder — write it.

  S5 title:    "Remove this phone's access"
  S5 line:     "This phone stops seeing the night it was shown. The admin can
               share it again."

  S6 title:    "A game is running"
  S6 line:     "{Group} is recording tonight on your account. Settle it, or
               take it back and settle it, and come back here."
  S6 action:   "Go to tonight"

  S7:          "Deleting…" then "Done. This phone starts over."
  S8:          "Nothing was deleted. There was no answer from the server."
               "Nothing was deleted. {reason}"

If a state needs a string I have not listed, write one and flag it.

## B. YOUR NAME AT FIRST SIGN-IN

Owner's decision: an account with an email is asked "Your name" the first time
it signs in, and it is REQUIRED — no skip, no "later", no way past it without
one. It is stored on the account and can be changed afterwards.

Who is asked: only an account with an email. That is how anybody runs a
group, so every group's admin has a name. A phone that claimed a seat with a
code, or only watches, is NOT asked — they are known in a group by the name
on their seat (part C), and nothing anywhere shows an anonymous phone's name.

Where its name is read: for a group's admin who runs the game without
playing — "{admin} added you as Petr" on an invite, "kept by {admin}" under a
past night, the delete sheet's seat lines. An admin who plays is named by their
own seat in the group, as everybody else is. And in Settings, beside "Signed
in as".

How an email account first signs in today — draw the name step into both:

  1. INVITED: the owner invites the address from the server's dashboard. They
     open the app, Settings → Sign in, type the address, "Email me a link",
     and open the link (the "Check your email" state). The link lands them in
     the app signed in. The name step comes the moment it lands.
  2. WITH A CODE: on the same Sign in sheet, an address with no account grows
     a "Code" field; "Open an account" with a live code makes the account and
     mails a confirmation link, which lands the same way. The name could be a
     field on this sheet, beside Email and Code, or the same step as 1 after
     the link — your call; say which.

STATES TO DRAW

  N1  The name step, empty — required, so the one action is unavailable until
      something is typed. It is a SHEET (Chrome B), not a full screen, and its
      close must not leave the account without a name: decide what closing it
      does, and draw it.
  N2  Filled, and saving.
  N3  Refused by the server: blank, or over 40 characters (it trims spaces and
      folds runs of them into one). Say what is wrong in the house voice.
  N4  The code path (2), if the name lives on the Sign in sheet rather than in
      the step after the link.
  N5  Settings → Account, signed in: where the name sits beside "Signed in as"
      and "Plan", and changing it — the same sheet as N1, filled.

COPY — placeholders

  N1 title:    "Your name"
  N1 line:     "How the people you play with will see you when you run a game."
  N1 field:    placeholder "Andro"
  N1 action:   "Save"
  N3:          "A name can't be empty." / "Keep it under 40 characters."
  N5 row:      "Name" · {name}

## C. RENAMING YOUR OWN SEAT

Until now a seat's name is whatever the group's admin typed — "Petr" — and only
the admin can change it. Owner's decision: a player is never ASKED for a name
when they claim a seat, but they may CHANGE the name on their own seat, from
their own phone, in each group they are in.

The rule it must keep: the admin's original is never lost. If the player
deletes their account (part A, S3), their seat goes back to the name the admin
typed. While the name is theirs, the group sees the player's name everywhere —
the table, the settled nights, the stats.

Questions this part has to answer on the board, not in the code:

  - Where a player does it. Settings → PLAYERS has a "You" row today (the
    seat that is yours); is that where, for a member as for an admin?
  - What the ADMIN sees when a player renames their seat: does the roster
    say it was the player's choice, and can the admin put their own name back?
  - Whether the admin's own seat and the admin's account name (part B) are
    one name or two. Today they can differ: the account name is only read
    when the admin holds no seat.

STATES TO DRAW

  R1  The rename sheet for your own seat — the group's name on it, the current
      name filled in, and the admin's original named somewhere if it differs.
  R2  The admin's roster with one seat renamed by its player.
  R3  The admin opening that seat — what they can do about the name.

COPY — placeholders

  R1 title:    "Your name in {Group}"
  R1 line:     "Everyone in {Group} will see this. {Admin} added you as
               {Theirs}."
  R1 action:   "Save"
  R2 badge:    "named by Petr"
  R3 action:   "Use {Theirs} again"

## OPEN QUESTIONS — ANSWER THEM ON THE BOARD

1. Is the backup a row inside S2, or a first stage the hold only appears
   after? The second is safer and one step longer.
2. A host with several groups: a line each, or one sentence with the counts?
   Draw whichever holds at four groups with long names.
3. Does S1 sit last in ACCOUNT, after Sign out, or in its own section at the
   very foot of Settings, apart from everything that is not destructive?
4. The CLOSED line at a count of 0 — what does it say?
5. Part B: the name on the Sign in sheet beside Email and Code, or a step after
   the link — and what closing the required step does.
6. Part C: the three questions under it.

## WHAT TO HAND BACK

1. A board for S1–S8, N1–N5 and R1–R3 at 393 × 852, in the same format as the
   existing boards:
   every dimension, weight and colour inline on the element, so it can be
   copied rather than re-derived.
2. Both themes.
3. A short note on anything you deliberately departed from in the existing
   system, and why.
4. Your answers to the six questions above.

## WHAT I AM NOT ASKING FOR

Handing a group to another person before leaving — not built; when it is, S2
gains one row above the hold and nothing else here changes. A name for phones
that only watch or claimed a seat — they are not asked (part B). Anything on
any other screen: the hand-off line ("passed to Lena at 23:10") keeps the name
the admin typed after a deletion, so it needs no new string. No change to the
sheet object, the tokens, or the navigation vocabulary — if this screen makes
you want one, say so separately.
```

---


## For whoever applies the result

- The board lands in `boards/`; `docs/screens.md` gains a row for the sheet and
  the S1 row on `/settings`, held against it.
- **The server half is done** — `account_deletion_plan()` before the hold,
  `delete_my_account()` on it; both return the same jsonb, plus `deleted` and,
  when refused, `refused: 'game_running'`. On success the app has to sign
  out, drop its SQLite and open as an empty phone — not built yet. Nothing on the server needs to
  change for the sheet; if the board needs a fact the plan does not carry,
  that is a migration first.
- The sheet is one session and one file set (`settings.tsx` plus the new sheet
  route). B57's `member.tsx` change is another session, and calls the same
  `release_seat()` through a function of its own. They do not open the same
  file.
- A `check:ui` walk of S1–S8 goes red if it regresses; add it to B107's
  *Locked by* when it exists.
- **Part B's server half is done (0029):** `set_my_name(name)` and `my_name()`,
  for an email account only. What is not: the step itself, and the server-side
  gate that makes the name truly required — `book_insert_needs_plan`'s
  neighbour, *no name, no new group*. Switch that on in the same change that
  ships N1, never before: before it, it stops the owner's own phone, which has
  no way to set a name.
- **Part C has no server half yet.** It needs, in one migration: the admin's
  original kept on the row (`player.admin_name`) when a player renames, a
  `rename_my_seat(player, name)` for the claimant, `release_seat` putting the
  admin's original back, and the roster sync changed so the admin's phone
  upserting a roster row cannot write over a name the player chose — today
  `playerRow` sends `display_name` on every upsert. That last part is the one
  that silently loses a player's choice if it is missed.
- The privacy policy (`app-store-launch.md` Step 4) gets three sentences from
  this file: what deletion removes, that a closed group's figures stay for its
  members, and that store billing records are kept.
