# Prompt: who can run a game, passing it, and who you are on Tonight

> ⚠ **Answered before it was revised.** The boards came back on 26 September
> (`design/handoff-game-admin/`) against the 25 September version of this
> prompt — Free / Regular / Full, with Regular's host night — and were built the
> same day. This file is the prompt as re-issued that morning against
> `0018_accounts.sql`'s Free / Pro / Club, and it has not been answered. The
> original brief the boards answer is kept beside them as
> `design/handoff-game-admin/design-request-game-admin.md`. Which vocabulary is
> final is the owner's call; `docs/screens.md` records it as open and
> `apps/mobile/src/lib/membership.ts` is the one place the answer goes.

**Why this file exists.** Passing tonight's game to another phone was built on
the branch `claude/multi-admin-game-access-cpwbpw` (migrations 0016–0017,
`docs/storage-and-sync.md` § Passing the book) and then taken back off `main` on
the owner's word, 25 September, to be redesigned. The owner's decisions since:

1. **Passing lives in the Table admin drawer on Tonight**, not in Settings.
2. **The person receiving it does nothing.** No code, no confirm — it arrives
   on their phone as an announcement.
3. **Only an account with a plan can run a game. Free can never be the admin.**
   The list of who a game can be passed to is decided by plan first.
4. **A "possible admins" view in the group's player list.**
5. **Tonight says what role the reader has** — recording it, or watching.

None of it is drawn. Every string in the build today is invented and flagged in
`docs/screens.md`. Paste the block below into the design tool.

**The plan model is the one `main` already has** — `docs/accounts-roadmap.md`,
Stage 1, `0018_accounts.sql`: **Free (no plan) · Pro · Club**, one answer per
account from `my_plan()`, and **the plan is the host right** — an account with
no plan cannot start a group. This prompt extends that same right to *taking*
a game. It does not use the design handoff's older Free / Regular / Full names
or Regular's single host night; nothing built has either. Prices are
`pricing-model.md`'s (Host Pro $4.99/mo or $29.99/yr; Club $69/yr per group).

⚠ **What the database enforces today is only group creation.** Passing a game
to an account without a plan is not refused yet — that check comes with the
rebuild these boards are for.

---

```text
I need boards for one mechanic in the poker cash-game ledger app: who is
allowed to run a game, how a running game is passed from one phone to another,
and how every phone shows who is running it. Several screens are touched; draw
each state listed below.

Work inside the existing system — Style Guide v2, rev 18 geometry, the six
boards, the navigation rules in 09-navigation.md (a PUSH has a round back button
and nothing top-right; a SHEET has a grabber and a close; they never mix; a
multi-step flow replaces one sheet's content). Do not introduce a colour, a
radius, a type size or a component that is not already in the system. If a
state seems to need one, say so instead of inventing it.

Draw every board at 393 × 852 in light and dark, and check each at 360 wide:
nothing may truncate or wrap mid-word at 360. Write every string. Mark any
string you are unsure of rather than leaving it to the build.

## THE PRODUCT, IN FOUR SENTENCES

A home poker game's ledger. One phone records the night — buy-ins, rebuys,
cash-outs, the count at the end — and the app works out who pays whom. Everyone
else at the table can watch the night live on their own phone. Only one phone
ever records a night at a time; that is what keeps the money right.

## PLANS — THE RULE THESE BOARDS EXIST FOR

A plan sits on the person's account and follows them to every group they play
in. Three answers, one per account:

  Free   no plan    watch any night over a link, claim your place in a group,
                    see your own nights
  Pro    $4.99/mo or $29.99/yr
                    start groups and run games: open, record, settle, pass
  Club   $69/yr per group
                    everything in Pro, for a group, with co-hosts

Some people have Pro without paying — founders (for ever) and friends given a
plan by hand or with a promo code. They are Pro in every way that matters here.

Who can be the admin of a game — start one, record it, or be passed one:
  - Pro or Club: always.
  - Free: never. Not by starting a game, not by being passed one.

Rules already decided, which the boards must not contradict:
  - A plan that lapses never stops a game that is running. The check guards
    TAKING a game — starting it, or being passed it — never running one. A
    group that exists keeps every write whatever happens to the plan.
  - Watchers and players never pay to watch or to see their own place. A
    paywall never appears to somebody who is only watching.
  - The accuracy of the money is never a paid feature. Settlement is identical
    on every plan.
  - On iPhone the app cannot sell or unlock a plan with its own codes (Apple
    3.1.1): an upgrade on iOS is either the App Store purchase or a promo code
    redeemed on the web. Draw the iOS and Android versions of any gate that
    offers a code.

## THE MECHANIC

1. The admin opens Table admin — the drawer that folds up from the dock on
   Tonight (today: Seat a player · Cash out a player · Money rules · End this
   poker night, hold 1s). A new row goes in it: passing the game.
2. It opens a sheet listing the group. Each person is either somebody the game
   can go to, or not — and if not, why not, in one line.
3. The admin picks one and confirms. From that moment the other phone records
   the night. The admin's phone keeps showing the table, live, and records
   nothing; it can take the game back with a hold.
4. The receiving phone does NOTHING to accept. The game arrives on it as an
   announcement the next time the app is in front of them (instantly if it is
   open). No code, no confirm, no tap required.
5. Nothing recorded on either phone is ever lost. If the game is taken back
   while the other phone still had changes it had not sent, they are kept and
   the admin decides which to add (a review sheet already exists in the build —
   restyle it, see state 12).

Who can receive a game, in the order the checks run:
  a. They have claimed their place in the group (they have the app and the
     server knows which phone is theirs). A name the host typed is not a
     person the server can reach.
  b. Their plan allows it: Pro or Club (above).
  c. They are not the current admin.
Being at the table tonight is NOT required, but say whether they are.

## STATES TO DRAW

Tonight and Table admin
  1. Table admin open, with the pass row, for an admin who can pass.

The pass sheet
  2. The list with every kind of row at once:
       - Pro or Club, at the table     → can take it
       - Pro or Club, not at the table → can take it, say they are not playing
       - Free                          → cannot, and why
       - Name only (no app)            → cannot, and the way out (invite)
     Draw the selected state and the confirm button naming the person.
  3. Nobody can take it: every other person is Free or name-only. This is
     where the incentive lives — explain in one or two lines what would make
     somebody eligible (a Pro plan), without making the admin feel they did
     something wrong. Offer a way to tell a named person ("Ask Lena to go
     Pro"), which is a share, not a purchase — nobody buys a plan for somebody
     else here.
  4. Passing, and it could not reach the server (no signal at the table). The
     game has NOT moved until the server says so; the admin is still recording.
  5. Passed, the other phone has not opened the app yet: the game is theirs on
     the server; their phone will show it when opened. The admin's phone says
     who it is waiting on, and can still take it back.

After it moves
  6. The previous admin's Tonight: the table, live, no dock. One line saying
     who is recording, and Take the game back (hold 1s).
  7. The new admin's phone, the moment it arrives: the announcement — who
     passed it to them, and that they are recording now — over Tonight, with
     their Table admin in the dock. It needs no action; it dismisses itself or
     with a close. Also draw it arriving while they are on another screen
     (home, stats): where does it appear, and what does tapping it do?
  8. Taken back: the phone that was recording is told, in the same
     announcement vocabulary, and its dock goes away.
  9. Changes the other phone recorded after the game came back (existing
     /late-changes sheet in the build: a ticked row per change, "Add N to the
     night", decided rows below marked added / left out; and a line above the
     dock "N changes from another phone · Review"). Restyle to the system; keep
     the rule that nothing is deleted.

Plan gates and incentives
 10. A Free account taps to start a new game (New session, O1) or a new
     group: the gate. It states what Free already includes, what running a
     game needs, Pro and Club side by side, and never blocks them from
     watching or claiming. iOS and Android versions (see the Apple rule).
 11. A Free account that has just watched or played a night on somebody
     else's game: the lightest possible nudge that they could run their own —
     where does it belong, if anywhere? (Proposal: the end of the night they
     watched, not a popup.)
 12. The admin's own plan lapses mid-game: nothing changes on screen until the
     night is closed. Draw the one quiet line (if any) that says so, and what
     they see after closing.
 13. The plan list rule from X2b (S85) applies to every gate here: Free first,
     drawn as already yours (muted, outline check, INCLUDED); nothing paid
     pre-ticked. Say if a gate needs to break that rule and why.

The group's player list (C2 / GR4)
 14. "Who can run a game" grouping: the admin; people who can take a game
     (Pro, Club); people who cannot (Free); name only. Decide whether this is
     a filter, a section, or a badge on the existing rows — the list already
     groups Regulars and Occasional by nights played, so do not collide with
     that.
 15. The same list read by a member who is not the admin: do they see who
     can run a game? (Proposal: yes, read-only.)

Who you are, on Tonight
 16. Every phone looking at Tonight shows the reader's role:
       - recording this game (the admin)
       - watching (anybody else: a claimed player, a share-link watcher)
       - watching, and the game was passed away from you (the previous admin)
     Tonight's title row already carries the live tag top-right; find a place
     that does not break the push chrome rule (nothing else top-right). Draw
     all three on the same night.
 17. The share-link watcher's screen (/watch, X1) carries the same role mark.

## OPEN QUESTIONS — ANSWER THEM ON THE BOARD

  - Can a game be passed to somebody who is not at the table tonight?
    (The build allows it.)
  - Should the previous admin need a plan to take a game BACK? (The build
    lets the group's host take back any game of theirs with no check — and a
    lapsed plan must never strand a running game.)
  - Does the pass sheet show a person's plan by name (Pro, Club, founder), or
    only whether they can take the game? Plans are personal; say what the
    rest of the group should see.

## WHAT TO HAND BACK

One board per state above, light and dark, with every string written, and a
short note per open question. Flag anything in this brief that the existing
boards contradict — the boards win on layout, but I want to know.
```
