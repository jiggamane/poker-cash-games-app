# Prompt: who can run a game, passing it, and who you are on Tonight

**Why this file exists.** Passing tonight's game to another phone was built on
the branch `claude/multi-admin-game-access-cpwbpw` (migrations 0016–0017,
`docs/storage-and-sync.md` § Passing the book) and then taken back off `main` on
the owner's word, 25 September, to be redesigned. The owner's decisions since:

1. **Passing lives in the Table admin drawer on Tonight**, not in Settings.
2. **The person receiving it does nothing.** No code, no confirm — it arrives
   on their phone as an announcement.
3. **Only a paid membership can run a game. Free can never be the admin.** The
   list of who a game can be passed to is decided by membership first.
4. **A "possible admins" view in the group's player list.**
5. **Tonight says what role the reader has** — recording it, or watching.

None of it is drawn. Every string in the build today is invented and flagged in
`docs/screens.md`. Paste the block below into the design tool.

⚠ **Two documents disagree with decision 3, and this prompt follows the owner.**
`docs/pricing-model.md` has a *Host Free* tier that runs unlimited nights, and
puts device handoff in *Club* only. `design/handoff-rev18/docs/01-product-logic.md`
§ 4 already says `host_session` is **Full, or Regular spending its one host
night** (M11: that night renews each billing period) — which matches the owner.
The prompt uses rev 18's names and prices (Free / Regular $2.49 / Full $9.99,
12 Aug revision). `pricing-model.md` needs updating to match whichever is final.

⚠ **Nothing about membership is built.** Rev 18 § 4 says to build none of it and
keep one policy seam that answers yes to everything. These boards are the
design the seam will eventually answer to; they are not a request to build
payments.

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

## MEMBERSHIP — THE RULE THESE BOARDS EXIST FOR

Membership sits on the person and follows them to every group they play in.
Three tiers (12 Aug revision):

  Free     $0         watch, claim your place, see your last 3 games
  Regular  $2.49/mo   the whole group's history, and ONE host night per
                      billing period (renews with the subscription)
  Full     $9.99/mo   runs games: open, record, settle, pass, as often as
                      they like

Who can be the admin of a game — open one, record it, or be passed one:
  - Full: always.
  - Regular: only while this period's host night is unused. Taking a game
    (opening one, or being passed one) spends it.
  - Free: never. Not by opening a game, not by being passed one.

Rules already decided, which the boards must not contradict:
  - A night finishes on the membership it started with. A card that fails
    mid-evening changes nothing until the night is closed; the room's money is
    never held hostage. The check guards TAKING a game, never running one.
  - Watchers and players never pay to watch or to see their own place. A
    paywall never appears to somebody who is only watching.
  - The accuracy of the money is never a paid feature. Settlement is identical
    on every tier.

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
  b. Their membership allows it (above).
  c. They are not the current admin.
Being at the table tonight is NOT required, but say whether they are.

## STATES TO DRAW

Tonight and Table admin
  1. Table admin open, with the pass row, for an admin who can pass.
  2. Table admin open for a Regular admin — does passing their night give
     anything back? (It does not: the host night is spent when the game was
     taken.) Decide whether the row needs to say so.

The pass sheet
  3. The list with every kind of row at once:
       - Full, at the table            → can take it
       - Regular, host night unused    → can take it, and it will spend their
                                         host night for the month
       - Regular, host night used      → cannot, and why
       - Free                          → cannot, and why
       - Claimed, not at the table     → can take it, say they are not playing
       - Name only (no app)            → cannot, and the way out (invite)
     Draw the selected state and the confirm button naming the person.
  4. Confirm when the pick is Regular: a disclaimer that this spends their one
     host night this month. Same sheet, content replaced.
  5. Nobody can take it: every other person is Free, used, or name-only. This
     is where the incentive lives — explain in one or two lines what would make
     somebody eligible (they go Full, or Regular with a night left), without
     making the admin feel they did something wrong. Offer a way to tell a
     named person ("Ask Lena to go Full"), which is a share, not a purchase —
     nobody can buy a membership for somebody else here.
  6. Passing, and it could not reach the server (no signal at the table). The
     game has NOT moved until the server says so; the admin is still recording.
  7. Passed, the other phone has not opened the app yet: the game is theirs on
     the server; their phone will show it when opened. The admin's phone says
     who it is waiting on, and can still take it back.

After it moves
  8. The previous admin's Tonight: the table, live, no dock. One line saying
     who is recording, and Take the game back (hold 1s).
  9. The new admin's phone, the moment it arrives: the announcement — who
     passed it to them, and that they are recording now — over Tonight, with
     their Table admin in the dock. It needs no action; it dismisses itself or
     with a close. Also draw it arriving while they are on another screen
     (home, stats): where does it appear, and what does tapping it do?
 10. The same announcement on a phone whose Regular host night was just spent
     by it: does the announcement say so?
 11. Taken back: the phone that was recording is told, in the same
     announcement vocabulary, and its dock goes away.
 12. Changes the other phone recorded after the game came back (existing
     /late-changes sheet in the build: a ticked row per change, "Add N to the
     night", decided rows below marked added / left out; and a line above the
     dock "N changes from another phone · Review"). Restyle to the system; keep
     the rule that nothing is deleted.

Membership gates and incentives
 13. A Free member taps to open a new game (New session, O1): the gate. It
     states what they can do for free, what running a game needs, the two paid
     tiers side by side, and never blocks them from watching or claiming. This
     is also where the phone that has been passed games before learns it could
     run its own.
 14. A Regular member with the host night unused opens a new game: a light
     disclaimer that this spends it, and what Full adds.
 15. A Regular member whose host night is used opens a new game: the gate,
     with when the night renews.
 16. The admin's own membership lapses mid-night: nothing changes on screen
     until the night is closed. Draw the one quiet line (if any) that says so,
     and what they see after closing.
 17. The ascending plan list rule from X2b (S85) applies to every gate here:
     Free $0 first, drawn as already yours (muted, outline check, INCLUDED);
     nothing paid pre-ticked. Say if a gate needs to break that rule and why.

The group's player list (C2 / GR4)
 18. "Who can run a game" grouping: the admin; people who can take a game
     (Full; Regular with a night left, marked as such); people who cannot
     (Free, Regular used); name only. Decide whether this is a filter, a
     section, or a badge on the existing rows — the list already groups
     Regulars and Occasional by nights played, so do not collide with that
     word: "Regular" is both a membership and a roster group today. Propose
     how to tell them apart.
 19. The same list read by a member who is not the admin: do they see who
     can run a game? (Proposal: yes, read-only.)

Who you are, on Tonight
 20. Every phone looking at Tonight shows the reader's role:
       - recording this game (the admin)
       - watching (anybody else: a claimed player, a share-link watcher)
       - watching, and the game was passed away from you (the previous admin)
     Tonight's title row already carries the live tag top-right; find a place
     that does not break the push chrome rule (nothing else top-right). Draw
     all three on the same night.
 21. The share-link watcher's screen (/watch, X1) carries the same role mark.

## OPEN QUESTIONS — ANSWER THEM ON THE BOARD

  - Can a game be passed to somebody who is not at the table tonight?
    (The build allows it.)
  - If the new admin is Regular and the game is passed back and forth, is the
    host night spent once or each time it arrives?
  - Should the previous admin need to be Full to take a game BACK? (The build
    lets the group's host take back any game of theirs with no check.)
  - What does a Free member see in the pass sheet if they somehow hold a game
    opened before membership existed?

## WHAT TO HAND BACK

One board per state above, light and dark, with every string written, and a
short note per open question. Flag anything in this brief that the existing
boards contradict — the boards win on layout, but I want to know.
```
