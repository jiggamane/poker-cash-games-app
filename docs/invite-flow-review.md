# Review — `handoff-invites`, cut 6 September

Read 7 September against `main` at `6c1dcbc`. Three passes, in the order
`docs/03-review-questions.md` asks for them: does the backend do this, is the
flow right, and only then the pixels and the missing screens.

**The headline.** The flow is sound and the boards are, with one exception, on
token. What is not sound is the belief the handoff was built on — that the
screens were "built from the shipped code, not from memory". They were built
from the code's *comments*, which describe an invite feature more finished than
the one that runs. Five things the boards draw are unreachable on a real phone
today, and four of them are one-line fixes. They are written up as **B47–B51**
in `docs/bugs.md`.

---

## Pass 1 — backend fit

### The five properties of `create_player_invite`

Asked: ten characters, single use, one live code per row, thirty-day expiry,
replacing any previous live code. **Four of five are exactly right; the fifth
is right but not by thirty days.**

| Claimed | Actual | Where |
|---|---|---|
| Ten-character code | ✅ Ten, from a 30-character alphabet with no `0 O 1 I L U` | `0007_player_identity.sql`, `new_invite_code()` |
| Single use | ✅ `claimed_at`/`claimed_by` set on redeem, and the live-code predicate excludes it thereafter | `0007`, `redeem_player_invite` |
| One live code per row | ✅ Enforced by a partial unique index, not by convention | `0007`, `player_invite_one_live` |
| Thirty-day expiry | ⚠️ **One calendar month**, `now() + interval '1 month'` | `0012_invite_lifetime_and_reset.sql` |
| Re-issue retires the old code | ✅ `create_player_invite` revokes the outstanding one before inserting | `0007` |

The expiry difference is not pedantry, because the board draws the countdown:
`29 days left`. A month issued on 31 January is 28 days; issued on 31 July it is
31. A countdown computed as `30 − elapsed` will be wrong on most months and
visibly wrong on February. **Read the countdown off `expires_at`, never off a
constant** — and note the copy already shipped in `invite.tsx` says "It works
for a month", which is the correct phrasing and should stay.

### Does the claim attach to a row with history, or create one?

**It attaches. Nothing is created.** `redeem_player_invite` does one
`update player set claimed_by_user_id = auth.uid()` on the row the code names,
and returns that row's id. The ledger is untouched, which is the whole premise
of the flow and it holds all the way down.

Two guards worth knowing about, because both are user-visible states the boards
do not draw:

- **One seat per person per book.** A second claim in the same book raises
  `You already have a place in this book.` — deliberately a *different* message
  from the dead-code one (`0009` explains why: it leaks nothing the caller
  cannot already read).
- **Seat taken in the meantime.** Refused with the dead-code message, padded to
  the same duration.

### Revoke

**Built, and it does more than the name suggests.** `revoke_player_invite`
(rewritten by `0012`) does two things: it retires any unspent code, *and* it
clears `claimed_by_user_id`, releasing a seat that has already been claimed.
That is the app's **Reset**, and `invite.tsx` already draws both halves of it
with the right copy — the claimed variant explains that the player loses read
access and that the ledger does not move.

So the handoff's known gap 1, "host revokes a live code — no screen", is
**wrong about the app**: the screen exists (C3c), it is wired, and it handles
the claimed case the doc does not know about. What is missing is the entry
point — see B47 — and the post-revoke row state.

### The two proposals

**Contacts is much closer than the handoff thinks.** `expo-contacts ~57.0.4`
and `expo-sms ~57.0.1` are both in SDK 57's `bundledNativeModules.json`, so both
are in the Expo Go build the app is pinned to. There is no native work and no
development build needed. What it costs is an `NSContactsUsageDescription`, an
App Store review answer, and the picker flow the board already draws. Call it a
day's work, not a milestone. (The board's own claim — "nothing is read or
uploaded, the picker hands back one name and one number" — is achievable with
`presentContactPickerAsync`, which never grants full-book access. Use it.)

**The group join code is as far off as the handoff says, and the estimate is
still low.** Beyond issuing a multi-use code it needs, at minimum:

1. A second table, or a nullable `player_id` on `player_invite` — the current
   schema has `player_id uuid not null`, and the one-live-code index is keyed on
   it. A group code has no player until somebody joins.
2. A create-on-join path, which means a name collision policy against
   `player_unique_name_per_book` (`0001_init.sql:97`). Two people called Levani
   is not an edge case in a group of six; it is the second Levani.
3. A rate limit and a cap. A per-player code is one bearer credential for one
   person's history; a group code is an open door, and `0009`'s constant-time
   refusal was written for a credential you cannot enumerate cheaply.
4. The arrival screen. X2b's whole argument is "this seat has been yours for
   months" — a group-code claimant has no seat and no history, so the screen
   that makes the flow work says nothing to them.

**My recommendation: do not build it.** The hosts asking for it are asking to
avoid typing six names. The cheaper answer to that is a multi-add on the roster
(one field, six lines) plus the contacts picker — both of which keep naming
first, which is the property everything else in this design rests on.

### What the boards assume that the server does not record

The **1a Sent** screen draws `Sent 23:12 · waiting for Levani`. There is no
`sent_at`. `player_invite` records `created_at`, and — because `invite.tsx:66`
mints a code the moment the sheet opens — creation happens when the host *looks*,
not when they *send*. A host who opens Levani's sheet to check something and
backs out gets a row that says a code was sent at 23:12. Either add a `sent_at`
the share chips stamp, or change the copy to `Made 23:12`.

`seatStatuses` also selects only `player_id, code` (`invites.ts:135–160`), so
neither the timestamp nor the expiry is on the client at all. Both columns are
readable by the host under `player_invite_host_read`; this is a two-word change
to the select, and the Sent screen cannot be built without it.

### Group isolation

**Holds, and is enforced in the right place.** `is_book_member` is scoped to one
`book_id`, every member-read policy in `0007` goes through it, and
`preview_player_invite` returns three strings and nothing else. A claim in one
group makes nothing about another group visible. Nothing in the flow needs
changing here.

---

## Pass 2 — is the UX right

### Naming first, invite second — keep it

It is the load-bearing decision of the whole design and everything downstream
depends on it: it is why a code can attach to history at all, why there is no
pending-members list, and why "invited" is a badge and not a queue. Merging
"add" and "invite" into one act would break the case that actually happens most
— somebody is at the table tonight and does not need the app — and it would make
the primary action on an empty roster require a network.

Do **not** merge them. Do consider offering the invite *immediately after* an
add, as a quiet second action on the row that was just created; that gets the
convenience without moving the model.

### One list with badges — keep it, but the badges do not work

The model is right. The implementation is not: **the `invited` badge can never
appear.** `inviteMember` and `resetInvite` (`clubStore.ts:633`, `:643`) are the
only writers of `club_member.invited`, and nothing in the app calls either.
`players.tsx:133` and `member.tsx:58` both read it. So the roster's `· 2 invited`
count is always absent, the amber pill never draws, and the state the handoff's
entry-point screen is *about* is invisible. **B47.**

The same row has a second hole: `standing` never becomes `member`. Only
`makeAdmin` writes it, so a player who has claimed their seat still reads
`Name only · no app · invite` on the host's phone forever. The host has no
signal that anybody ever arrived. **B47 covers both** — they are one missing
reconciliation, and `seatStatuses` already returns exactly the two facts needed
(`claimed`, `liveCode`).

### 1a versus 1b — take **1a**, and take one row from 1b

**1a, for three reasons.**

1. **It is what ships.** C3a is built, conformed to its board, and the code is
   already the hero. 1b is a rebuild of a working screen to accommodate two
   methods that have no server behind them.
2. **The code is the primitive, and 1a says so with its layout.** Every doc in
   this repo — `0007`'s header, `invites.ts`'s header, `invite.tsx`'s header —
   makes the same argument: the link is a wrapper, the ten characters are the
   thing. 1b demotes the code to a detail inside whichever method you picked,
   and then has to win it back with a block at the foot explaining that it is
   one code. A layout that needs a paragraph to undo what it implies is the
   wrong layout.
3. **1b's four rows are three-quarters proposals.** Two of the four rows would
   ship disabled. Four chips where two are live reads as a toolbar with two
   things greyed; four *rows* where two are greyed reads as a broken screen.

**What 1b gets right and 1a should take:** rows carry per-method state and chips
cannot. When contacts ships it will need to say "needs permission" somewhere. Put
it under the chip row as a single line, not by restructuring the screen.

**And keep 1a's bone block.** Drawing the unbuilt methods under a rule, in the
off-table colour, is the honest way to show a host what is coming without
offering it. That is a good idea and it is new here.

### One error string for four causes — yes, and the server is right

Do not distinguish expired from spent. `0009_invite_privacy.sql` is not being
precious: a ten-character code from a 30-character alphabet is ~49 bits, and an
oracle that partitions the guess space is worth real money to a guesser. The
migration goes as far as padding all four refusals to a 150ms floor so *timing*
cannot answer the question either. Undoing that on the screen would waste it.

**But the screen currently over-applies it, twice, and both are bugs:**

- **A network failure renders as a dead invite.** `claim.tsx:63` catches the
  preview's error and sets `dead` — directly contradicting its own comment three
  lines above, which says a network failure "is NOT a dead code" and the screen
  stays on X2a. A person on a train is told to ask for a new link. **B50.**
- **The two messages the server deliberately kept distinct are thrown away.**
  `claim.tsx:90` catches everything from `redeemInvite` and shows the dead
  screen — including `You already have a place in this book.`, which `0009`
  argues at length should be honest, and including "sign in first". A person
  re-tapping an old link is told their seat is gone. **B50.**

So: four causes, one string — correct. **Six outcomes, one string — wrong**, and
the server already drew the line in the right place.

### The "someone joined" non-notification — too quiet, but not a screen

The badge dropping off in place is right; a confirmation screen for something
that happened on somebody else's phone would be worse. But as built there is no
badge to drop (B47), and the host's next visit to the roster is the only
opportunity to learn anything.

The board's answer — a green line at the top of the roster, dismissed on next
visit, using the same arrival wash a counted stack gets — is the right shape and
should be built. `expo-notifications ~57.0.17` is in SDK 57, so a **local**
notification is available; **remote push is not available in Expo Go** and would
require a development build, so treat "notify the host when someone claims" as
out of scope until the app leaves Expo Go.

---

## Pass 3 — UI, then the missing states

### UI against `tokens.ts` and `Button.tsx`

**The boards are on token, and unusually cleanly.** Every colour resolves:
`#0A0A0B` ground, `#16161A` surface, `#101013` sheet, `#8B8D93` muted,
`#E8B455` amber, `#6FCF97` win, `#F0705C` loss, `#D9D3C4` off-table,
`rgba(255,255,255,.55)` outline, `rgba(255,255,255,.28)` quiet outline. Every
button is 56 tall at radius 8; the destructive is a 2px `#F0705C` outline and
never filled; the blocked primary is `#16161A` with a 2px ring of the ground and
a muted label, which is exactly what `Button.tsx` draws and exactly the reason it
draws it. The empty roster fades its outlined action to `.4` and blocks its
primary — the correct pair.

Three things are off, one of them squarely.

1. **The SENT pill is an outline, and the app's rule is the opposite.** The
   board draws `border:1px solid #E8B455` with no fill, and its note calls this
   "Amber, outlined, never filled — the app's pill rule." `Pill.tsx` says the
   reverse in as many words: *"it is a STATE — which is why it is a tint and
   never an outline. An outline reads as something you can press, and none of
   these can be."* Every shipped pill is `roundFill` behind amber text.
   The size, weight, tracking and radius all match `type.badge` and
   `radius.badge`; it is only the fill that is inverted. **Use `<Pill label="SENT"
   tone="amber" />`.**

2. **"Invite someone" is a fifth button geometry.** 50 tall, 1.5px
   `quietOutline`, label `700 15px`. That is the home screen's quiet action
   (`type.quietAction`, `control.quietPadV`) borrowed into a footer, and it puts
   a 50pt control directly above a 56pt one. `Button.tsx` has no variant for it.
   Either use `variant="secondary"` (56, 2px, 17/700) and accept two full-weight
   controls in a footer, or add the variant deliberately — but do not let the
   board's 50 arrive as a one-off inline style, which is how `docs/ui-guide.md`
   says screens start looking assembled.

3. **The 12px radii on the bone blocks.** Nine of them. `block.radius` is 12 and
   `radius.card` is 14 — so if these are explainer blocks they are correct and
   should be built with the `block` token rather than a literal; if they are
   cards they are two short. Worth one word from the designer, because the two
   objects are two pixels apart on purpose.

Everything else measured clean.

### The checks cannot see any of this — and that is the bigger problem

`apps/mobile/.env` does not exist, so the web export the audit drives has
`isSupabaseConfigured === false`. Which means:

- `/invite` renders the **C3e Blocked** sheet, and
- `/claim` renders **"Not connected"**,

on every run of `npm run check:ui`. `docs/screens.md` ticks `/invite` for Rules
and Sheet and `/claim` for Rules — **those ticks are on the fallbacks**. C3a,
C3c, C3d, X2b, X2c and X2d have never been measured at any width, in either
theme, on any run. This is B14 exactly: a route in `ROUTES` whose real state
needs an argument, measured as its empty frame for weeks.

`ui-audit.mjs` already has the mechanism — the `PARAMS` map at `:121`, added for
precisely this. **B51**, and it should be fixed before any new invite screen is
drawn, or every state added by this handoff will be unwatched from the day it
ships.

### The states this flow needs and does not have

The handoff's six, corrected and answered, then eleven more. **T** = what
triggers it, **S** = what it says, **K** = screen / sheet / in-place.

**The handoff's six**

1. **Host revokes a live code.** *Not missing* — C3c is built, and it handles
   the claimed case the doc does not know about. What is missing is the way in:
   the only route to `/invite` is `member.tsx:150`, so the roster's "Invite
   someone" the board draws has nowhere to go. **T** roster footer. **S** —.
   **K** the board's own screen, wired.
2. **Reissue after expiry.** Worse than undrawn: `seatStatuses` filters
   `claimed_at` and `revoked_at` but **not `expires_at`**, so a month-old dead
   code is returned as live and offered for sharing with its chips enabled.
   **B49.** **T** `expires_at < now()`. **S** where the countdown was, "This code
   expired on 6 August" and a primary reading "Make a new code". **K** in-place
   on C3a.
3. **The claimer's first run.** The real gap is not the landing screen — the
   roster is a reasonable place to land — it is that `redeemInvite` signs the
   claimant in **anonymously** (`invites.ts`), and `sign-in.tsx` is host-only
   with no upgrade path. So a claimed seat lives on one handset's key: lose the
   phone, lose the seat, and the only recovery is the host running Reset. That
   is a decision to take, not a screen to draw, and it should be taken before
   this ships. **K** an "attach an email to this seat" sheet, plus copy on X2b
   that does not promise more permanence than one device.
4. **Name collision on claim.** Correctly identified and genuinely undecided.
   The row name is the host's and appears on every night in the ledger; the
   account name is the claimant's. **Recommendation: the host's name wins on the
   row, always** — it is what six other people at the table call this person, and
   `player_unique_name_per_book` means a rename can fail. Show the claimant their
   own name nowhere. **K** no screen; a decision plus a line in X2b.
5. **Invite while a session is live.** Answerable from the model rather than by
   drawing: a claim binds an account to a row, and seating is a separate act the
   host takes. So a mid-night claim gives read access to tonight immediately and
   seats nobody. Nothing needs to change; it needs writing down. **K** none.
6. **Membership interaction.** Answered by `docs/pricing-model.md`: player
   accounts are free on every tier and claiming is listed as free, so a Host Free
   host holds live invites like anyone else. A lapse from Pro to Free collapses
   *history* to the current month and caps groups at one — it does not touch
   outstanding codes. **K** none. Confirm with the owner and close it.

**Eleven more**

7. **Invited, waiting — on the roster.** The amber badge and the `· 2 invited`
   count, which today cannot appear. **T** a live code exists for the row.
   **K** in-place. (B47)
8. **Claimed — on the roster.** Badge gone, `standing` moved to `member`, the
   member sheet's App row reading "has the app". Today it reads "no app · invite"
   forever. **T** `claimed_by_user_id` non-null on pull. **K** in-place. (B47)
9. **Just claimed.** The board's green line with the arrival wash. **T** a row
   that was invited on last read and is claimed on this one. **S** "Levani
   claimed their place · just now". **K** in-place, dismissed on next visit.
10. **Offline on the roster.** Standing is a server fact and the roster is local.
    A host on a train sees stale badges with nothing saying so. **T** last pull
    failed. **S** one muted line under the count. **K** in-place.
11. **Checking, on X2.** Exists (X2a) but is unreachable for the case that needs
    it — a network failure lands on Dead instead. **B50.** **K** the built
    screen, plus a Retry.
12. **Already a member.** The server's honest second message, thrown away by the
    client. **T** `You already have a place in this book.` **S** "You are already
    in The poker club" and a way into the app. **K** its own state on X2.
13. **Signed out.** `Sign in first` — same. **K** as above.
14. **Reset while offline.** C3c's confirm calls two RPCs back to back
    (`invite.tsx:84–85`); a failure between them leaves the seat with no live
    code and the sheet on an error. **T** either call throws. **S** what did and
    did not happen. **K** in-place on C3c.
15. **A seat released under a claimed player's feet.** The other half of Reset:
    the person holding the phone silently stops being able to read the book.
    **T** next pull returns nothing. **S** "Your seat in The poker club was
    reset. Ask Goga for a new code." **K** a screen, and the only one in this
    list that belongs to the *player's* app rather than the host's.
16. **Invites out — in Settings.** The Groups Section board draws
    `The people · Invites out · 1`. There is no such row today and the count is
    the same one the roster cannot compute. **K** a row.
17. **Expired, on the roster.** Distinct from 7 and from 2: the host needs to see
    which of six outstanding codes has gone stale without opening six sheets.
    **T** `expires_at < now()`. **S** the badge in muted rather than amber.
    **K** in-place.

### One thing the handoff should also fix in the docs

`docs/screens.md` classifies `/claim` as **push**, and `docs/09-navigation.md`
allows exactly two vocabularies — pushed (round back button, nothing top-right)
or sheet (grabber, close, swipe). `claim.tsx` is deliberately neither: a bare
safe area with no way back, because there is nowhere to go back to. That is the
right screen and the wrong ledger entry. The nav doc needs a third
classification — **standalone** — with `/claim` as its only member, or the
handoff's "No chrome" note will keep reading as a deviation when it is a
decision.

### On the supporting boards

`Groups Section.dc.html` is the roster model, and it is useful — but it is the
rev-14 material C3 superseded: it draws `pokerclub.app/j/7QK2`, "the link expires
when it is used", and GR6 as a step inside the player sheet. Anyone reading it
after the invite board will take three retired facts from it. Mark it as
superseded where it speaks about invites.

`Player List Rule.dc.html` contains nothing about rosters or group isolation —
it is the active-row / finished-slab rule for Count up, Cash out and End the
night. `START-HERE.md` says both supporting boards "hold the roster model and
the group-isolation rules the invite flow has to obey". One does; the other is a
different subject entirely.

---

# Second cut — `handoff-invites-2`, 7 September

Reviewed the same day. Turn 1 is left on the board as the record of what was
rejected; turn 2 is nineteen frames answering the seventeen states. Checked
mechanically against the tokens, and by hand against what the server does.

## What landed, verified

- **Every pill in turn 2 is a tint.** No outlined status remains anywhere in it.
  The one outlined pill left on the board is `1a Sent`, which is turn-1 record —
  **that one is correct as it stands and should not be "fixed".**
- **Every control in turn 2 is 56 tall at radius 8.** The 50pt geometry is gone.
- **No countdown arithmetic anywhere** — `until 6 Oct`, and
  `This code expired on 6 August`.
- **No new colours inside any phone.** The two unfamiliar values in the file
  (`#3E3B36`, `#E5E2DA`) are the board's own annotation chrome, outside the
  frames. One exception, below.
- Group code marked rejected on both turn-1 frames; contacts redrawn in ordinary
  weight; `Groups Section` marked superseded on invites in place, with its four
  open questions preserved; `Player List Rule` dropped.

The three UI corrections and the three factual corrections all landed. Gap 1 was
correctly withdrawn.

## Six things to fix

### 1. State 12 is a screen for a flow this app does not have — cut it

`2c Signed out` / *Set up this phone first* assumes a claimant with no identity.
There is no such person: `redeemInvite` signs them in **anonymously and
automatically** before it redeems, which is the same mechanism watchers use, and
`connection.ts` names it out loud — `anonymousSignIns`, *"which watchers and
claims need"*.

So the server's `Sign in first` can only fire when **anonymous sign-in is
disabled on the project**. That is a build fault, not a user state, and it wants
the connection report's voice — *this build cannot make an identity* — not a
screen on the claim flow asking a guest to set up an account. It also runs
against `docs/pricing-model.md`'s zero-account principle: a person holding an
invite has not yet seen the thing they would be signing up for.

**Cut the frame.** It also removes one of the two copy sets the cut was least
sure of.

### 2. State 11's trigger is the wrong one, and the copy is wrong with it

`2c Already a member` is captioned *"Somebody re-tapping an old link"*. A
re-tapped link lands on the **dead** screen, not here: `redeem_player_invite`
tests liveness first, and a spent code fails there before the seat check is
reached.

What actually reaches state 11 is a **live** code for a **different** row, in a
book where the reader already holds a seat — the host sent the wrong person a
code. So *"This link was for a place you have already claimed. Nothing to do."*
is inaccurate, and it hides a real mistake by telling both people there is
nothing to do.

The title is right. The sub-line should say what happened, something like:
*This link is for a different place at that table, and you already have one.*
Then the primary. (`0009_invite_privacy.sql`'s own comment describes the same
wrong trigger — the board inherited it, and the migration comment should be
corrected too.)

### 3. Five chips do not fit at 360

The chip row's gap was dropped from the shipped 8 to 7 to make room for the
fifth, which is the tell. At the board's 402 each chip is 66pt and *Contacts*
sets at about 51 — comfortable. At **360**, the narrowest device in the check
matrix, it is 57.6 per chip; and at **120% text**, which `ui-journeys.mjs` runs
every stop at, *Contacts* is about 61pt inside a 57.6pt box. Chip labels are not
capped figures, so they scale all the way.

The house rule is explicit: *letter-spacing and size are never used to make text
fit a box — fit is a layout problem, and the layout has to give.* So this is not
a type adjustment.

**Recommended: Contacts becomes a full-width row under the four chips.** That is
1b's insight paying off exactly where the brief said it would — a row can carry
its own state — and the permission line then belongs to the row rather than
floating under the group. Two rows of chips is the alternative and is worse: it
makes five equal things look like two ranks.

### 4. The amber wash is a new colour role

`rgba(232,180,85,.11)` sits behind *Made 23:12 · waiting for Levani* and behind
the reset-failed block. There is no amber tint in the token set: the pill uses
the neutral `roundFill` for every tone, and the three comparable roles —
`winTint` at 14%, `offTableTint` at 13%, `dangerWash` at 12% — are all named
tokens precisely so they are not re-derived per screen.

Either add it deliberately as a token beside those three, or use `roundFill`.
`tokens.ts` says it plainly: *don't invent new colours — if a screen seems to
need one, it probably needs a different weight or fill instead.*

### 5. State 14 needs two more frames, and must not use the app's sign-in

`sendSignInLink` is `signInWithOtp({ shouldCreateUser: false })`. Calling it from
the attach-an-email sheet would sign the player into a **different** user and
orphan the claimed seat on the abandoned anonymous one. The seat is bound to a
user id; changing which user is holding the phone loses it.

The correct path attaches an address to the anonymous user in place. That sends a
confirmation, so it needs:

- **Verification pending.** *Check your email* — the seat is not portable until
  the address is confirmed, and the sheet currently implies it is portable on
  tap.
- **That address already belongs to an account.** A real and common case, and
  the recovery from it is not obvious.

Neither is drawn. The sheet itself is good and the *Used for one thing* block is
the right instinct.

### 6. State 13 is several causes wearing one name

*Your seat in The poker club was reset* is what the phone shows when its reads
come back empty. Reads also come back empty when the host **removed** the player
from the group, and when the book was **deleted**. Same shape as the dead-code
problem, opposite answer: there is no security argument for one string here — the
reader is a member being told what happened to their own place — and telling
somebody they were reset when they were removed is simply wrong.

Either widen the copy to what is actually known, or have the server say which.

## Smaller, and build dependencies the docs do not name

- **State 6 needs a stored last-pull timestamp.** *Standings last checked at
  23:34 last night* has nothing behind it: nothing in `pull.ts` or anywhere else
  persists when the last successful pull happened.
- **`2e Add several names` and `2e One contact back` do not draw the name
  clash.** The roster already refuses a duplicate — *"X is already here"* — and
  four names pasted at once will hit it. Which line failed, and whether the
  others still land, is undrawn.
- **The interrupted reset has two variants, like its confirm does.** Only the
  unclaimed one is drawn. On a claimed seat the first write has already taken the
  person's access away, so *"their place on the roster and their nights are
  untouched"* is true but incomplete — the sentence that is missing is the one
  the claimed confirm already knows how to say.

## The four open questions, answered

1. **The share timestamp.** Take `Made` now — it is honest and it ships. The
   share stamp is worth doing and it is genuinely small: one nullable column on
   `player_invite` and one write on the share action. It does not have to block
   this cut; `Made` is not wrong, only weaker.
2. **Membership and invites — closed, no state needed.** `docs/pricing-model.md`
   lists *claim your name, personal standing* as free on every tier, and the tier
   table gates history, rollups, group count and closing a book — **not**
   invites. A Host Free host holds live codes like anyone else, and a lapse from
   Pro collapses history to the current month and caps groups at one without
   touching an outstanding code. Nothing to draw on the invite sheet.
3. **A live session and a lapsed host.** Out of this flow's scope, and given (2)
   it does not block this sheet. It is a lifecycle question for whoever owns
   billing.
4. **What *Invites out* filters to — do not filter.** This app has no filter
   chrome anywhere, and a filtered push needs a way to clear the filter, which
   means inventing that vocabulary for one row. With the amber tints in place an
   invited row is findable in a roster of six at a glance. Let the row carry the
   number and land on the plain roster. Revisit if a roster ever runs past
   thirty, which no group in this product has.

## Copy

Sign-off is the owner's. Two notes: cutting state 12 removes one of the two sets
the cut was least sure of, and the reset-interrupted title — *Half of that
worked* — reads well and is the honest shape, given the screen's whole job is to
say which half.

---

# Third cut — `handoff-invites-3`, 7 September

Twenty-two frames in turn 2: one deleted, three revised, four added, the three
smaller notes carried onto the frames they belong to. Checked the same way.

## What landed, verified

- **`2c Signed out` is gone.** Twenty-two turn-2 frames, and the deleted one is
  not among them.
- **No outlined pill anywhere in turn 2.** All 32 controls are 56 tall at
  radius 8.
- **The chip row is back to gap 8, four chips, and a full-width *Invite from
  contacts* row underneath — on both `2b` frames.** The row label reads better
  than the chip label did, and the permission line now belongs to it.
- **The expired frame fades its disabled chips to .4**, which is the outlined
  disabled value; the `.32` on `2b Made, waiting` is the sheet scrim, correct.
- **No new colours inside any phone.** The amber tint was escalated to a token
  request rather than quietly changed — the right call, and see below.
- All three smaller items landed as their own frames, including the claimed
  variant of the interrupted reset, which is the one that was hardest to argue
  for and is now the better of the two.
- Turn 1 untouched, `1a Sent`'s outlined pill left alone as asked.

The corrections are getting smaller each round, which is the point. Two real
findings this time, and one of them is not a design problem at all.

## A. Answering open question 2 — and it is bigger than the copy

**Removal does not revoke anything.** `removeMember` sets `removed = 1` in the
phone's own SQLite; nothing syncs that column, the server's `player` table does
not have one, and no path anywhere deletes a player row. `claimed_by_user_id`
survives untouched, so `is_book_member` keeps returning true.

So a person the host removed from the group **goes on reading the book** — the
live table while it is running, every night, every settlement — indefinitely, on
a phone the host believes they cut off. `member.tsx`'s own note under the button
says *"Removing somebody keeps every night they played"*, which is true, and is
exactly the sentence that conceals it. **B57.**

**What that means for `2d Your seat was reset`:** of the three causes the widened
copy now survives, only **reset** can happen. **Removed** cannot produce that
screen because removal revokes nothing. **Book deleted** has no path in the app
at all — there is no delete-club and no leave-club anywhere in `apps/mobile`.

**And the answer to the question as asked:** yes, the server can distinguish
them, cheaply and safely. One `security definer` function keyed on the player id
the handset already remembers returns *reset* (row present, claim null),
*removed* (once removal is real), or *gone* (row absent). It leaks nothing — the
reader already knew they were a member of that book, which is why they are
looking at this screen.

**But the ordering is: make removal revoke first.** Until it does, the
three-cause sub-line is drawn for two states that cannot occur, and the copy is
being more careful than the system is. Keep the frame — it becomes right the day
removal is fixed — and put on the note which of the three is live today.

## B. `2d Address already used` asserts a fact the client cannot have

> It belongs to another set of clubs.

The server will not say what that account holds. It may hold nothing at all — a
half-finished sign-in — or one host's books, or somebody else's clubs entirely.
This is the same shape as the sub-line that was just corrected on
`2c Already a member`: a screen stating a cause it has no way of knowing.

Say what is known: **that address already belongs to an account.** The rest of
the block — one address holds one person, signing in would hand this phone to
that person — is right and is the part that does the work.

**And one thing to decide out loud while this screen exists.** It is an
email-enumeration oracle: whoever holds the handset learns whether a given
address has an account here. That is a much weaker threat than the invite-code
one — it needs the phone in hand, and *attach an address to my own account* is
the standard place this leaks in every product that has it. **Recommend
accepting it and noting the decision on the frame.** This repo argues the
enumeration case unusually hard in `0009_invite_privacy.sql`; a screen that goes
the other way should do so on purpose, not by not noticing.

## C. Three small ones

- **No confirmed state for the email.** Attach → verify pending → already used.
  What the sheet or the roster row says once the note is opened is not drawn.
  It is probably just the amber leaving — but that is precisely the assumption
  that produced the gap the last round found, where attaching implied
  portability. One frame, or one sentence on `2d Verify pending`.
- **Rename the frame `2d Your seat was reset`.** Its whole point is that it no
  longer claims a reset. Frame labels are what the docs cite and what the route
  map will use.
- **`2e A name already here` covers a clash with the roster, not with the
  paste.** Two identical lines in the same block are checked one at a time, so
  the second clashes with the first once it has landed. Same line, one more case.

## The three asks

1. **Name the amber pending tint — yes.** It is a real fourth role beside win at
   14%, off-table at 13% and danger at 12%. One thing to get right when it
   lands: **derive the light twin from the light amber (`#7A5410`), not from the
   dark one.** Every other tint pair in `tokens.ts` is derived per theme, and
   `#E8B455` at 11% on a white ground is very nearly invisible — which is the
   failure `offTableWash` already has a comment about.
2. **Does the server distinguish the three?** Answered above: it can, it should,
   and removal has to become real first.
3. **Merging two accounts — recommend no.** It is a large piece of identity work
   for a case whose honest workaround costs the player nothing, and every merge
   has to decide what happens when both accounts hold a seat in the same book —
   the one thing this model forbids outright. The screen as drawn, with no *sign
   in instead*, is the right answer to it.
