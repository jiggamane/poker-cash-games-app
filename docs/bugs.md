# The bug log

Every bug gets written down **before** it gets fixed.

That ordering is the whole point, and it is worth being blunt about why. Until
today bugs lived in chat messages. A chat message is gone the moment the session
ends: the next session cannot read it, cannot tell whether the thing was ever
fixed, and cannot tell that it has come back. Three separate rounds were spent
re-finding faults that had already been found once, and the only reason anybody
knew they had returned was noticing them again on a phone.

A bug that is written down has a name. A name can be checked.

## Two sessions, one number

Numbers collide. B29 to B32 were each written twice in the first days of
September, by sessions running in parallel that each took "the next one" from a
file the other had not pushed yet. Four names for two faults each, which is
exactly the thing a name is supposed to prevent.

They have been separated: the later of each pair kept its number where code
already referenced it, and the other moved up past B35. **Before adding an
entry, `git fetch` and read the highest number on `main`** — and if another
session might be writing at the same time, say so in the commit rather than
hoping.

**It happened again on 6 September, and the advice above is what did not
prevent it.** Two sessions ran the same evening on disjoint screens — the Add
spend sheet and the game-end flow — and both read B44 as the highest on `main`,
because at the time both were right. B45 went to whichever merged first; the
other became B46 in the merge, by the same rule as above. The lesson is not to
read harder: **the number is only safe once your entry is on `main`**, so where
two sessions are in flight, merge the entry early or expect to renumber it.

**And again on 9 September, which is the case this file has now described four
times and the first one where nothing had to be untangled.** A session rebuilding
the storage layer wrote B68–B73 and merged; a session working on the meta line
had already merged a B68 of its own an hour earlier. The collision surfaced in
`git merge` — cleanly, because the two entries are in different regions of the
file, which is exactly the false comfort the paragraph below warns about — and
was found by the grep that belongs AFTER the merge. Same resolution as every
time: the entry already on `main`, with five code references naming it, kept the
number, and the storage one moved to **B74** with its four references. Its commit
messages still say B68, because they were written before `main` moved and a
pushed message is not worth rewriting; the file is the record, and the file says
B74.

**And again on 7 September, with the merge check doing its job for once.** A
session reading the invite flow wrote up B47–B51 and a sixth screen pass added
B52–B57, while this one was photographing the game-end flow and wrote a B47 of
its own for the totals card. `main` had all eleven by the time that branch came
to merge, so the collision surfaced in `git merge` rather than on a phone: the
entries already on `main` kept their numbers and the card moved up to **B58**,
with its four references — the component, the night check, this file and
`docs/screens.md` — moving with it. Worth noting what caught it, since the two
paragraphs above are about what did not: the merge auto-merged both docs
cleanly, because the two sessions were writing to different regions of the same
file. A clean auto-merge is not evidence the numbers are free, so the grep for
the number belongs after the merge and not only before it.

It happened again on 6 September: two sessions each wrote a B44, one for the
rebuy that landed without a confirmation and one for the spend keypad. The
fetch was done at the start of the session and `main` moved while the work was
being built, which is the case the rule above does not cover — so the check
belongs at the merge as well as at the start. Same resolution as before: the one
already on `main`, with tests naming it, kept the number; the spend keypad moved
up to B45 and its five references moved with it.

## The shape of an entry

```
### B12 — the figure on Settle up is cut off at four digits

Screen      S3 settle-up
Seen        "−4,5…" where the amount should be −4,500
Expected    the whole figure, or a formatToFit that shortens it honestly
Found       21 Aug, testing on the phone
Locked by   npm run check:ui — ui-journeys.mjs, "figures cut off"
Status      fixed in 7ef8cf0
```

Six lines. **Seen** and **Expected** are the two that matter and the two that
get skipped — without them a fix is judged against a memory of the complaint
rather than the complaint.

## Locked by

This is the field that stops a bug coming back, and an entry without it is not
finished.

A fix with no check is a fix that survives exactly until the next session edits
that screen. That is not a hypothetical: it is what has been happening. So every
entry names the thing that now goes red if the bug returns:

| The bug is about | Lock it with |
|---|---|
| An amount, a split, a settlement | a test in `packages/core` |
| A figure cut off, outside its card, off the phone | `ui-journeys.mjs` |
| A rule the handoff states as a rule — surfaces, contrast, what may scroll | `ui-audit.mjs` |
| A row the board draws that the screen does not show at all | `ui-audit.mjs`, `DRAWN` |
| A sheet's height on some particular phone | `ui-audit.mjs` sheet pass, and `Sheet.geometry.test.ts` |
| A measurement that should match the board | `ui-check.mjs` against the frame |

If none of them can see it, say so in the field — **`Locked by: nothing yet`** —
and that entry is a standing invitation to build the check. Do not leave the
field blank, which reads like the question was never asked.

## Status

`open` → `fixed in <commit>` → and it stays in this file afterwards. Fixed
entries are not deleted. The log is the record of what this app has already got
wrong, which is the most useful thing to hand a session that is about to touch
the same screen.

`reopened` is its own status and worth spelling out when it happens, because a
reopened bug is evidence about the process rather than about the screen: it
means something merged over a fix, and the interesting question is which merge,
not which pixel.

---

## Open

*The faults found testing on 21 August belong here — they were reported in
conversation and have not been written down. Say what they were and they go in.*

*B47–B51 were found on 7 September reading the invite flow against the
`handoff-invites` cut, not on a phone — written down before any fix, per the
rule at the top of this file. `docs/invite-flow-review.md` is the working.
**B47, B49 and B50 were fixed the same day and have moved to Fixed below;
B48 and B51 are still here**, and B57 came out of the third cut's own question.*

### B68 — the first row of a list sat on the filter above it

```
Screen      /games (Sessions) and /settled — every screen whose filter shares
            the meta line
Seen        the dropdown's 34-point button and the first row of the list
            underneath it with nothing between them: on Sessions "All groups"
            touching `Tue 4 August`, on the past session "Final, detailed"
            touching the first player
Expected    a gap under the meta line, which both cuts draw — `8 22 14` in
            `design/handoff-session-views/`, `8 22 12` in
            `design/handoff-sessions-stats/`
Found       9 Sept, on a phone, reported by the owner
Locked by   npm run check:ui — ui-audit.mjs, "meta-row-floor"
Status      fixed in this branch
```

**A text meta line does not need a floor and a control does.** `Screen` has
drawn `meta` with `paddingTop` and no bottom since Chrome A was built, and that
is right for a line of 13-point text: the body element under it brings its own
margin and the two add up to the gap the boards draw. The row that carries a
control is a different object — 34 points tall against the text's 16 — and it is
the control's own edge, not the text's baseline, that ends up against the row
below. The screens under it were unchanged; what changed on 9 September is that
something with a height moved onto that line.

So the floor goes on `metaRow` and not on `meta`: no screen without a
`metaTrailing` control moves by a point, and the three that have one — Sessions,
the past session, and `/watch` reading the same night — get the 14 the
session-views cut draws. Fourteen rather than the sessions-stats cut's 12
because the taller row is the one being spaced.

**Nothing could see it**, which is the part worth naming. `ui-audit.mjs` reads
overlaps and truncation, and a gap of zero is neither: the elements were laid
out exactly as written, nothing was covered, and every check passed. The new
`meta-row-floor` pass measures the distance from the bottom of the meta row to
the top of what follows it and fails under 10, which is the first assertion in
the audit about a gap rather than a collision.

### B67 — a tester who was never invited read a Supabase error

```
Screen      /sign-in, the email stage
Seen        "Signups not allowed for otp" under the field, verbatim from the
            auth server
Expected    that the app is in a closed test and the host has to add you —
            which is what actually happened and is nobody's mistake
Found       9 Sept, reading the sign-in screen while fixing B66
Locked by   nothing yet. The screen's error states cannot be reached by either
            screen pass: the web export the checks are built from has no
            Supabase project in it, so /sign-in renders "Not connected" and
            every state behind it is invisible. `isNotInvited` is pure and
            would be trivial to test, but it lives in `supabase.ts`, which
            pulls AsyncStorage and cannot be imported into a node test. Moving
            it beside `signInCode.ts` would fix both and is not this branch
Status      fixed in this branch
```

**The sentence was written and never called.** `isNotInvited` has been in
`supabase.ts` since the closed test was set up, and its own comment says the
message "reads like a broken build rather than a door that is simply shut, so
the sign-in screen says it in its own words". The sign-in screen did not import
it. So the one string in the app written for the most likely thing to go wrong
during a closed test has never been on a screen, and what a tester read instead
was the raw protocol error. `explainServerError` had gone the same way on this
screen — every other caller in the app uses it, and this one showed `e.message`.

Adjacent to B66 and worth naming separately: they are the two halves of the same
morning. One is a link that could not be tapped, the other is the sentence
explaining why no link was ever sent.

### B66 — the sign-in link sent the phone to localhost:3000

```
Screen      /sign-in, and the email Supabase sends from it
Seen        the sign-in email arrives and its link does nothing — reported as
            "the button didn't have a link in it". There is no other way
            through the sheet, so the only account in the product cannot be
            got into at all
Expected    the link opens the app signed in — and failing that, ANY second
            way in, because a link in an email has four separate systems that
            can refuse it and three of them refuse silently
Cause       the href, read out of the delivered mail:
            …/auth/v1/verify?token=…&type=magiclink&redirect_to=http://localhost:3000
            The app asked to come back to exp://…/--/auth-callback. That
            address was not on Authentication → URL Configuration → Redirect
            URLs, so the auth server substituted the project's Site URL —
            silently, 200, no error anywhere — and the link verifies the token
            and then sends the phone to a port on itself
Found       9 Sept, reported off the phone by the owner
Locked by   npm run check — authLink.test.ts holds the redirect's path against
            a screen file and a Stack.Screen registration, and refuses a custom
            scheme written into authLink.ts; signInCode.test.ts holds the code
            path, which exists only to serve the field. Verified against the
            fault: with app/auth-callback.tsx removed again the leg reports
            "auth-callback.tsx is missing — the link lands on Unmatched Route".
            The blank href itself is locked by NOTHING AUTOMATED and cannot be
            — see below
Status      fixed in this branch
```

**An unlisted redirect is not refused, it is REPLACED.** `sendSignInLink` passes
`emailRedirectTo`, and the auth server checks it against the project's Redirect
URLs. If it is not there, nothing fails: the call returns 200, the mail is sent,
and the address is quietly swapped for the project's **Site URL** — which on a
new project is `http://localhost:3000`. The link is perfectly well formed and
perfectly useless, because it hands the phone a port on itself. Nothing in the
response, the mail, or any log says a substitution happened. `redirect_to=` in
the delivered href is the only place the truth appears, and reading it is the
whole diagnosis.

The address that was missing is `exp://<the dev machine's IP>:8081/--/auth-callback`,
which **changes whenever the laptop's IP or the packager's port changes** — so
this is not a thing that is set up once. `/sign-in` prints the current one on
itself in development for exactly this reason, and step 6 of
`docs/auth-test-period.md` says to paste it into that box. It had not been.

⚠ **THIS ENTRY FIRST BLAMED THE WRONG THING, and the wrong thing was
plausible.** It said Go's `html/template` had blanked the href — it replaces an
`href` whose scheme it does not trust with the literal `#ZgotmplZ`, which
produces a link that does nothing and matches the report word for word. That
hazard is real, it is documented by Supabase, and `docs/email-templates/README.md`
still holds the rule that avoids it. It was simply not what happened here: the
project had never edited its template, so the href was Supabase's own
`{{ .ConfirmationURL }}` and was https throughout. **A mechanism that explains
the symptom is not evidence that it occurred.** Thirty seconds reading the
actual href would have settled it before any of the guessing, which is why that
is now the first instruction in the README rather than a footnote.

**What the repository did wrong is the second half, and none of it is undone by
the correction above — the cause moved and the faults did not.** The setting is
in a dashboard no check here can see. But the sheet that sent the mail had
**one** way through it, and it was that link. `verifySignInCode` had been
sitting in `supabase.ts` since sign-in was built, complete, tested by nothing,
and **called from nowhere** — the six-digit code was written and never wired to
a field. So a silent substitution three systems away locked the host out with no
fallback, and the fallback was already in the building.

**And the link had nowhere to land even when it arrived.** `authRedirectUrl()`
has been asking Supabase to send the host to `/auth-callback` for as long as
sign-in has existed, and `app/` had no such file. This is the wall immediately
behind the one that was hit: fix the allow-list and the link now reaches the
app, which would have opened onto expo-router's *Unmatched Route* page — a
developer's error screen with none of the app's navigation on it. The session
installs correctly underneath it, because `_layout.tsx` reads the tokens off any
URL the app is opened with, so the host is signed in and reading a page that
says otherwise. Two independent faults, one report, and the second one was never
reached because the first stopped the link before it got there.

⚠ **THE CODE FIELD IS DARK UNTIL THE PROJECT HAS CUSTOM SMTP**, and that is a
dependency worth stating rather than discovering. Supabase will not let a
template be edited without it — the Body is read-only and Save is greyed out —
so a project on the built-in mailer sends the stock magic-link email, which
carries a link and no `{{ .Token }}`. The field is then on screen with no code
in existence to type into it. That is step 4 then step 5 of
`docs/auth-test-period.md`, in that order, and the app cannot detect the
difference: nothing in a client can ask which template a project has.

⚠ **Nothing in this repo can go red for the actual cause, and that is worse than
it sounds.** The allow-list is a dashboard setting; the app cannot read it, and
the auth server reports a substitution as success. Worse, the dev address it has
to hold *expires by itself* — a new IP on the café's wifi, a packager on 8082
because 8081 was busy, and the link silently goes back to pointing at
`localhost:3000` with nothing anywhere saying so. That is not a bug that gets
fixed once; it is a bug that comes back on its own schedule.

So the code is what has to carry it, and does: the six-digit code does not
travel through `redirect_to` at all, so it is the one way in that an allow-list
cannot silently break. `/sign-in` also prints the current `exp://` address on
itself in development — put it in the box whenever it changes, or accept that
the link half stops working and use the code.

⚠ **The blank `href` cannot be locked by anything in this repo, and this is the
entry that says so rather than leaving the field looking answered.** The mail is
rendered on Supabase's servers from a string in their dashboard;
`docs/email-templates/magic-link.html` is that string kept where somebody reads
it, and `docs/email-templates/README.md` carries the one rule that matters —
the `href` is `{{ .ConfirmationURL }}`, which is https, and the deep link rides
inside it as a parameter where the sanitiser cannot reach it. Pasting it is
step 5 of `docs/auth-test-period.md`. What the checks now guarantee is the part
that is ours: that there is a second way in when the first one fails.

### B65 — Sessions and My stats stopped opening a night

```
Screen      G4 /stats and 1A /games — every row of the past-games list
Seen        tapping a past game does nothing. The row grows a breakdown and
            there is no way through to the night from either screen
Expected    the row opens that night, which is the whole reason Sessions
            exists
Found       8 Sept, reported off the phone the day it shipped
Locked by   ui-journeys.mjs — the `my stats` and `sessions` stops now tap the
            first row of each list and assert the settled night comes up.
            Verified against the fault: with the row's onPress removed again
            the leg reports "tapping a past game left the list on screen —
            the row navigates nowhere"
Status      fixed in this branch
```

**A layout was applied to the wrong screen, and it took a working affordance
with it.** The score-breakdown handoff's rolled-up row *"itemises in place —
tapping expands, one row open at a time"*, so the first cut made expansion the
only thing a rolled-up row could do and dropped the `onPress` that had been
there since the screen was built.

**The reading underneath was wrong twice over.** Frame `6c` is captioned *"past
session / my stats"*, which reads like a list of nights and is not one: its meta
line says `8 players`, its rows carry a `name` and a score, and its back button
says **Sessions**. It is one night's PLAYERS — the screen you reach *from* the
Sessions list. The app's `/stats` and `/games` are the list itself, and a list
whose rows open nothing has no purpose.

**What it cost is worth naming, because the layout was not the damage.** The
glyphs on those rows are what was asked for and they stay. What went was the
tap, on the one screen in the app whose entire job is to get you to a night —
and nothing could see it, because no check had ever needed to assert that a list
row goes somewhere.

⚠ **Every row still opens the same night**, because this phone holds one and
there is no sessions table to route to. That is unchanged from before this batch
and is the same open question as the seeded history — see `docs/screens.md`.

### B64 — the link the workflow printed pinned the phone to one update forever

```
Screen      none — the publish path, and every screen on the phone at once
Seen        three publishes on 8 September, each one green, each one carrying a
            different screen, and the phone drawing the same old layout after
            every one of them. Relaunching, force-quitting and reinstalling all
            did nothing
Expected    a phone that opens the app gets the newest publish on `expo-go`
Found       8 Sept, after the third round of "it still looks old"
Locked by   nothing yet — see below
Status      fixed in this branch
```

**`eas update` prints a link that addresses ONE update group**, and the workflow
handed it over as the thing to open — `docs/live-test.md` said so too: *"the
run's summary is the link to the published update — open that on the iPhone"*.
A phone that opens that address reloads that same group on every launch. It is
not a cache and there is nothing to clear: nothing was ever going to fetch
anything.

**What makes it expensive is that it is indistinguishable from a stale cache,**
and the remedy for a stale cache — relaunch, force-quit, relaunch again — is
exactly the thing that cannot work here. Two sessions were spent on that
remedy. The branch page and Expo Go's own project list both follow the branch
and were never mentioned.

The workflow summary now leads with the branch and labels the update link for
what it is; `live-test.md` says the same in the place it said the opposite.

**`Locked by: nothing yet`**, and it is worth being straight about why. Nothing
in this repository can see what a phone opened — the checks drive a browser
against a local build, and the publish path ends at Expo. What replaces a check
here is B63's build stamp: the phone names the commit it is running, so the next
time an update appears not to arrive, the question is answered in two seconds
instead of two sessions. A real lock would be an end-to-end check that opens the
branch as a device would and asserts the commit it gets back. **Open.**

### B63 — the phone could not say which build it was running

```
Screen      GR7 /settings, at the foot — and every screen, in effect
Seen        an update published, the workflow green, the commit right, and the
            phone still drawing the previous screen. No way to tell from the
            phone whether it had a stale bundle or a bad publish, and no way to
            tell from the repository either
Expected    one line naming the commit the bundle was made from, so the two
            ends can be compared in two seconds
Found       8 Sept, an afternoon spent on it
Locked by   ui-audit.mjs — `build-stamp-missing` and `build-stamp-unknown` on
            /settings, in both themes, on both widths
Status      fixed in this branch
```

**This is not a bug about a pixel, it is a bug about not being able to ask.**
Expo Go fetches an update on a cold start and applies it on the NEXT one, so a
phone one launch behind is behaving exactly as designed — and looks exactly like
a phone that got a broken publish. Both ends of that conversation were blind:
the phone said nothing about itself, and the repository could only say what it
had sent.

`scripts/build-stamp.mjs` is the fix, and the two things it is NOT are the point
of the file:

* **Not `app.config.js`'s `extra`.** That is the obvious place and it was the
  first attempt. `expo export --platform web` embeds **app.json** — the static
  config — not the result of the dynamic one, so the value reached a phone and
  was `null` in the browser preview and in every UI check. The half nobody can
  look at is exactly the half a person is looking at while they wonder which
  build they are looking at.
* **Not `Updates.updateId`.** In Expo Go the native side belongs to Expo Go, the
  updates package is inert, and the field would answer `null` precisely when a
  host needs it.

`EXPO_PUBLIC_` is what is left, and it is the mechanism the Supabase keys have
ridden since the workflow was written: Metro substitutes it into the bundle at
build time, on every platform, so the line cannot be stale — if it is old, so is
everything around it.

**The check exists because the first attempt failed silently.** A row that
renders nothing and a row that says `unknown` are both worse than no row: they
answer the question wrongly rather than not answering it. Both are findings.

### B62 — a host's fee came off everybody and appeared on nobody's row

```
Screen      /settled, and every screen drawing a settled row
Seen        a night whose group charges a host's fee printed `in 1,500 out
            2,000 piggy 50` under a net that had the fee taken out of it, so
            the line did not come to the figure beside it
Expected    a term per rule that took something, whatever the destination —
            the row's whole claim is that it sums to the score
Found       8 Sept, reading `settled.ts` against the score-breakdown handoff.
            Not on a phone: the seeded club runs a bill and a piggy bank, and
            those are exactly the two destinations the row knew about
Locked by   packages/core/src/settled.test.ts — the Final table is asserted
            term by term with each term's destination named, so a destination
            the row cannot draw is a failing assertion rather than a silent
            omission; and ui-journeys.mjs, "the Final row carries every term
            it replaced the ledger with"
Status      fixed in this branch
```

**The mechanism is a list of two written down as if it were a rule.**
`settledRows` read a player's deductions by name — `at(result, id, 'bill')` and
`at(result, id, 'kitty')` — and `RuleDestination` has four members. `host_fee`
is offered in the app: `/club-rules` draws it as one of three choices and
`/new-night` seeds it as *Host fee · a flat amount for the house*. So a group
that used it got a row that was quietly short by the fee, on the one screen
whose entire argument is that its arithmetic is checkable without a tap.

**What made it invisible is what makes this kind of bug worth a number.**
Nothing was wrong with the net — that comes off `nightScore`, which reads every
deduction — and nothing was wrong with the deductions block, which lists every
rule that took something. Only the line joining them was short, and it was short
in a way that looks like the night simply had no such charge. The test suite
settles a night with a bill and a piggy bank, because that is the canonical
night; `ui-journeys` plays the same one. Neither could see it and neither was
wrong to miss it.

The fix is not "add `host_fee` to the list". It is that there is no list any
more: a term carries its destination, `playerDeductions` decides which rules
touched a person, and a fifth destination is a glyph to choose rather than a
line of code to remember.

### B57 — "Remove from the group" does not remove anybody's access

```
Screen      GR5 /member — the destructive action, and the note under it
Seen        a player the host removed goes on reading the book from their own
            phone: the live table while a night runs, every night, every
            settlement, indefinitely
Expected    removing somebody ends their read access, and the sheet says so
Found        7 Sept, answering the third invite cut's question about what a
            claimed player's app can be told
Locked by   nothing yet — a db:verify case asserting is_book_member is false
            for a removed player is the shape of it
Status      open
```

`removeMember` (`clubStore.ts:751`) sets `removed = 1` in this phone's SQLite.
**Nothing syncs that column**: it is absent from `syncRows.ts`, absent from
`sync.ts`, and absent from the server — `player` in `0001_init.sql` has
`id, book_id, display_name, claimed_by_user_id, created_at` and nothing else. No
path anywhere deletes a player row.

So `claimed_by_user_id` survives a removal untouched, `is_book_member` goes on
returning true, and every member-read policy `0007` installed goes on passing.
The host has hidden a name from their own roster and revoked nothing.

The note under the button reads *"Removing somebody keeps every night they
played"*, which is true, and is the sentence that conceals it — it answers the
question a host is asking (does the ledger survive?) so completely that the
other one never gets asked.

**Reset already does the right thing** and is the model to copy:
`revoke_player_invite` clears `claimed_by_user_id` and leaves the ledger alone.
Removal wants the same write plus whatever marks the row hidden, and the sheet
wants a second sentence saying access ends.

Two things follow, both on the invite flow. `handoff-invites-3` draws a screen
for the claimed player whose book will not open, widened to survive three
causes — reset, removed, book deleted. **Only reset can happen today**: removal
revokes nothing, and there is no delete-club or leave-club path in the app at
all. And the three-way answer that screen wants — one `security definer`
function keyed on the remembered player id, returning reset / removed / gone —
cannot tell the truth about the middle one until this is fixed.

*B52–B56 were found on 7 September auditing the app against `docs/verification.md`,
after the owner asked how far the calculations can be trusted if the pen and paper
beside them goes away. They are one finding in four parts: the arithmetic is the
most defended code in the repository and nothing that was built to CHECK it, KEEP
it or BACK IT UP was ever connected to a screen.*

### B56 — the demo night would have halted the queue in front of every real one

```
Screen      not a screen — `seedNight`, `forgetNight`, and the outbox
Seen        the app seeds itself with a sample night, and on a fresh install
            that night is the ACTIVE one: `openNight()` loads it and every
            screen is pointed at it. It is also the one night that never
            queued a `session.open` — `seedNight` writes local rows and calls
            nothing. So buying in on the demo night queued an entry, and after
            B55 counting a demo stack queued a count, for a session the server
            has never heard of. That is a foreign-key refusal, and the queue
            halts at its first refusal by design, so it would have stopped
            there — in front of every real night behind it, for ever, on a
            queue whose whole contract is that retrying is safe.
            `forgetNight` made it worse rather than better: replacing a stale
            seed deletes the night's rows and left its operations queued
Expected    a night the server cannot accept is never queued at all. It works
            completely on the phone; it simply never leaves
Found       7 Sept, asked whether every game's scores now go to the server —
            tracing what the answer actually is
Locked by   npm run check — `apps/mobile/src/lib/queueable.test.ts`, "is minted
            with an id that can never be queued", and `outbox.test.ts`,
            "forgetting a session" (four cases, including that it leaves every
            other night where it was in the line)
Status      fixed in this commit
```

**The fix is an id, not a new mechanism.** `sync.ts` already refused to queue
anything for a session whose id is not a uuid, and its comment describes exactly
the night we needed to keep out — *"a sample night from an old build, which
would sit at the head of the line failing forever and block every real night
behind it"*. The sample night simply was not one of them, because `seedNight`
minted it with `randomUUID()` like everything else. It now gets
`sample:<uuid>`, which the anchored gate refuses, so the existing guard does the
work at all seven queue points and at the drain.

`SEED_VERSION` goes to 5 so phones holding the old uuid-id sample night replace
it on the next launch, and `forgetNight` now purges the outbox for the night it
is dropping — which is right for any night, not just this one.

**It is the counterpart to B55 and it arrived with it.** Sending the count and
the settlement is what makes the record survive the phone; making sure the demo
night is not in the queue ahead of them is what makes the sending work at all.

### B52 — a frozen settlement lost the figure the step had moved

```
Screen      not a screen — `night_settlement`, and every screen that would
            read it back
Seen        a settled night arriving from the server was frozen with
            `JSON.stringify(result)`. `rounding.positions` is a Map, a Map
            stringifies to `{}`, and nothing anywhere raised a word. Every
            position's `by` term — what the step moved somebody by, which E4's
            rounding row and E6's receipt are both drawn from — was silently
            gone from the stored payload
Expected    a settlement written down and read back is the settlement,
            to the dollar, at every step the interface offers
Found       7 Sept, wiring the frozen record into `readNight` — the row had
            been written since the import path existed and never once read,
            so the loss was invisible
Locked by   npm run check — `packages/core/src/frozen.test.ts`, "keeps the term
            the step moved, which a bare stringify loses", which asserts the
            naive stringify has an empty `positions` and the round trip does
            not. Every mode is round-tripped; tens and coarser are the cases
            that can fail, because at whole dollars the Map is all zeroes and
            a broken freeze looks perfect
Status      fixed in this commit — `freeze` / `thaw` in `packages/core`, a
            named pair with a round-trip test, exactly as `snapshotOf` and
            `inputFromSnapshot` already are
```

**It is the reason a settlement gets a serialiser rather than two calls to the
JSON built-ins at a call site.** The failure is total and silent: no exception,
no type error, no missing field — an object where a Map used to be, with every
key gone. `thaw` therefore refuses a payload it cannot fully read and returns
null, and null falls through to a live re-derivation, which is what the whole
app did before. A night is never left drawing half a settlement.

### B53 — a settled night was re-derived by whatever engine happened to be installed

```
Screen      E6 /settled, E7 /payments, /nudge, /player, /stats — every screen
            that draws a night that is over
Seen        ten screens called `settle(settlementInput(night))` directly, so a
            settled night was recomputed from its rows every time it was drawn.
            That is correct exactly as long as `settle()` never changes, and it
            changed on 3 September: commit `9321fbd`, the fix for B36, moved
            the rounding step from snapping stacks to landing positions. A
            night settled at tens before that date and reopened after it would
            draw figures nobody at the table had ever agreed to — and
            `ALGORITHM_VERSION` is still `settlement-v1`, so nothing would have
            said so
Expected    the group's settings and rules are the DEFAULTS a new game opens
            with. They are not a revision of a game already played, and neither
            is a new version of the engine. What the room agreed and paid is
            what the app says for ever
Found       7 Sept, auditing the three layers in `docs/verification.md`
Locked by   npm run check — `apps/mobile/src/lib/closing.test.ts`, "re-derives
            to the same figures from its own snapshot, not from today's
            settings", and "carries the night's own rules, so a rule changed
            later cannot restate it". `frozen.test.ts` locks the round trip
            underneath them
Status      fixed in this commit — the result is frozen at close and read back
            through `settlementOf()`, the one accessor every screen now goes
            through
```

**Half of this rule was already kept, which is why it took so long to see.**
`Night.rules` and `Night.roundingMode` have been snapshotted onto the night
since it opens — B5 was the second half of that — so changing the club's
percentage in November has never moved September's night. What was missing was
the other axis: the night was still handed to today's ENGINE. Freezing closes
it, and the fallback for a night with no frozen record is the old live
re-derivation, so nothing gets worse for a night closed before this commit.

### B54 — the check that was built to catch the unimagined bug ran on no night, ever

```
Screen      not a screen — the close, and `docs/verification.md`
Seen        the document describes three layers and calls the middle one "the
            only layer that can catch a case we never conceived of":
            `verifyNight()`, on the phone, at close. It is 42 identities
            re-derived from the raw ledger, with 34 mutation tests proving each
            is caught, and `apps/mobile` called it from nowhere. `ClosePayload`
            had a `verification` field, `0008_verification.sql` had the column
            and its index, and the value was never once computed
Expected    every real night checks its own arithmetic as it closes, and the
            verdict is stored whether it passes or fails
Found       7 Sept, grepping for `verifyNight` outside its own tests
Locked by   npm run check — `closing.test.ts`, "runs verifyNight and keeps the
            verdict", which also asserts the verdict is not a token pass
            (`checked` over 20), and "puts the verdict inside the payload, not
            beside it"
Status      fixed in this commit — `closeOf()` in `apps/mobile/src/lib/closing.ts`
```

**A failing verdict does not stop the close, and that is the harder call.** A
night whose arithmetic does not hold is precisely the night that must be written
down and sent, or the failure exists only as something odd somebody saw at 1am.
The verdict travels inside the settlement payload rather than beside it, so a
night that failed its own check cannot reach the server looking clean.

**The host IS told, and the sentence was already written.**
`docs/verification.md` — *What happens when a night fails* — specifies both the
behaviour and the copy: the close is not blocked, and the settled screen says so
in red above everything else. `/settled` now draws that block off
`night.verification`, with the finding codes under it because a code is what a
bug report is filed on. Nothing was invented; the string is the one the document
already held.

### B55 — the count and the settlement lived on one phone and nowhere else

```
Screen      not a screen — `sync.ts`, and `npm run audit`
Seen        `queueCount` and `queueClose` were written when the server half
            landed and called from nowhere. Ledger entries synced; the final
            counts were written to local SQLite only, and the settlement was
            never sent at all. So the two things a host cannot reconstruct from
            anything else — what each stack was counted at, and what the room
            was told to pay — existed on exactly one device. `npm run audit`
            re-derives every stored night on a machine that was nowhere near
            the table; with nothing stored it audited nothing and reported no
            failures over no nights, which reads like a clean bill of health
Expected    a count is queued the moment it is typed, and the whole record —
            snapshot, rules, transfers, verdict — goes up at close
Found       7 Sept, tracing every caller of `sync.ts`
Locked by   npm run check — `closing.test.ts`, "fills every column
            settlementRow writes", which is held against the real Postgres by
            `supabase/test/03_sync_contract.sql` under npm run db:verify
Status      fixed in this commit
```

**This is the one the paper was actually insuring against.** The arithmetic was
never the exposure — it is 1,500 generated nights a run, with two hard refusals
that would rather crash than hand out a wrong transfer list. Losing the phone
was, and the count is the figure nothing else can rebuild.

### B48 — X2b never says who invited you, because nothing binds the host to their own seat

```
Screen      X2b /claim, and the night header on every settled night
Seen        "{host} added you as {name}" and "Not {name}? Ask {host}…" are both
            absent from every real claim, leaving a card with no attribution
Expected    the host's display name, which the preview is specified to return
Found        7 Sept, tracing preview_player_invite against the app's writes
Locked by   nothing yet — a db:verify case asserting host_name is non-null for
            a book whose host has a player row is the shape of it
Status      open
```

`preview_player_invite` finds the host's name with
`where h.claimed_by_user_id = b.host_user_id` (`0011_preview_host.sql:44`).
**Nothing in the app ever sets `claimed_by_user_id` on the host's own row.** It
is written in exactly two places — `redeem_player_invite`, which sets it for a
claimant, and `revoke_player_invite`, which clears it — and `syncRows.ts:133`
goes out of its way to leave the column alone on a roster upsert. So the
subquery returns null for every book, and `invites.ts` faithfully passes the
null through to a screen that hides both lines when it sees one.

**It is not only the claim screen.** `0010_night_header.sql:49` and
`0013_night_rounding.sql:72` resolve the host the same way, for "kept by
{host}". Their comment says a host who never plays has no player row and the
screens fall back rather than inventing a name — which is right, and is not what
is happening: the host does play, and the fallback fires anyway.

The fix belongs where the book is created (`sync.ts:310`) or in a server-side
helper beside it: bind the admin's player row to `book.host_user_id`.

### B51 — the two invite screens are audited in their not-connected fallback

```
Screen      /invite and /claim, in npm run check:ui
Seen        every run measures C3e Blocked and "Not connected"; screens.md
            ticks Rules and Sheet for /invite and Rules for /claim on that basis
Expected    the audit reaches C3a, C3c, C3d, X2b, X2c and X2d
Found        7 Sept, tracing the web export's env
Locked by   this is the lock — ui-audit.mjs's PARAMS map
Status      open
```

`apps/mobile/.env` does not exist, so the web export the audit drives has
`isSupabaseConfigured === false` (`supabase.ts:17`). Both screens test it first
and return their offline frame. `/invite` opened bare has no `player` param
either, so it would render its fallback regardless.

This is B14 again, and the file says so: *"a route may name a query string, and
it is opened with it"* — the `PARAMS` map at `ui-audit.mjs:121` exists for
exactly this case. Six drawn states across two screens have never been measured
at any width, in either theme, on any run, and the ledger's ticks say otherwise.

Fix this before drawing anything new for the invite flow, or every state the
`handoff-invites` cut adds arrives unwatched.

---

## Fixed

### B74 — a host with two groups jammed their own queue, for ever

```
Screen      none — the queue, which has no screen
Seen        Settings says "Saved on this phone · 41 waiting" and the number
            only ever goes up. Every night after the second group was made is
            on one phone and nowhere else.
Expected    each group is its own book, and one group's rows never reach
            another's
Found       9 Sep, reading sync.ts against docs/storage-and-sync.md
Locked by   npm run check — syncRows.test.ts and storageCoverage.test.ts;
            npm run db:verify — 03_sync_contract.sql
Status      fixed in 58d81af
```

**Seen**, precisely. `ensureBook()` asked for `select id from book limit 1` —
the FIRST book on the account, whatever group the payload named. So a host with
two groups wrote both into one book. `player` is unique on
`(book_id, lower(display_name))`, so the second group's Petr was refused by the
database; the queue halts at its first failure, on purpose, because the log has
to arrive in order; and that refusal then sat at the head of the line for ever
with every real night behind it.

Two things were wrong and both are fixed. The book is now resolved BY THE
GROUP'S NAME, so two groups are two books. And the lookup is scoped to books
this account HOSTS — since `0007_player_identity.sql` an account can also read
books it is only a member of, so the unfiltered select could return somebody
else's book, after which every write would be refused by the host policy at the
head of the queue, permanently, for the same reason.

A rename would have re-created that fault a third way — a club renamed is a
group the drain has never heard of — so `book.upsert` carries the previous name
and the drain asks for either.

### B69 — every money rule a host edited stopped at the phone

```
Screen      E3 deductions, GR6 money rules, and the three rule sheets
Seen        the bill changed from $170 to $200 on the phone; the server, and
            therefore every other phone and the audit, still said $170
Expected    an edited rule reaches the book
Found       9 Sep, auditing the write points against docs/storage-and-sync.md
Locked by   npm run check — storageCoverage.test.ts names the op each mutation
            queues; npm run db:verify — 03_sync_contract.sql
Status      fixed in 58d81af
```

`writeRules()` is where every rule edit ends — a rule saved, deleted, switched
off, a share typed by hand — and it wrote `night.rules_json` and queued nothing.
`queueRule` had existed since the server half landed and exactly one thing ever
called it: a night OPENING. So the rules on the server were whatever the night
was born with, for ever.

The comment on `ruleRow` in `syncRows.ts` had said why that is wrong the whole
time — *"a rule is the one thing here a host edits, and an edit that never
reached the server would leave the group's rules describing last month"* —
sitting above a builder that nothing reached with an edit.

`writeRules` now sends the DIFFERENCE: a rule that did not change queues
nothing, and a rule that is gone queues a delete under the id its own upsert was
using, so a rule added and dropped in one evening never reaches the server at
all. `setClubRules` does the same for the group's standing copy, which had never
sent anything either.

### B70 — the server thought every night was still live

```
Screen      X1 watch, and any second device
Seen        a night counted, settled at the table and paid, reading `live` on
            the server until the close op drained — and reading `live` for ever
            if it never did
Expected    the status the phone is showing
Found       9 Sep, auditing the write points
Locked by   npm run check — storageCoverage.test.ts; npm run db:verify —
            03_sync_contract.sql, which also asserts the constraint below
Status      fixed in 58d81af
```

`setStatus()` wrote one local column and queued nothing, so `counting` — the
moment the cards stop — never left the phone.

**The reason this is not simply "send the row" is a constraint.** The server
checks `(status = 'settled') = (ended_at is not null)`, so a patch carrying the
moment the cards stopped onto a night that is still counting is a refused row,
and a refused row at the head of the queue is B74 again. `sessionPatch`
therefore has no `ended_at` at all: the ending goes up with the close, where the
status moves with it, and `03_sync_contract.sql` asserts that the other order is
rejected.

### B71 — a group's own settings existed on one phone only

```
Screen      GR7 settings, and every screen that draws a figure
Seen        reinstall, sign in, fetch your nights: every night comes back, and
            the group's currency, buy-in, blinds and rounding come back at the
            app's defaults
Expected    the group as it was set up
Found       9 Sep, auditing the write points
Locked by   npm run check — storageCoverage.test.ts, pull.test.ts;
            npm run db:verify — 03_sync_contract.sql, 05_member_read.sql
Status      fixed in 58d81af
```

`renameClub`, `setClubCurrency`, `setClubBuyIn`, `setClubRounding` and
`setClubStakes` all wrote SQLite and queued nothing. `book` had a name, a
currency GLYPH and a rounding mode; the phone stores an ISO code, a buy-in and
the blinds, and two of those three had no column anywhere to land in.

This is the worst kind of missing data, because it comes back looking right: a
book restored at `USD 500` reads as a group that plays for dollars rather than
as a group whose settings were lost.

`0014` adds `currency_code`, `default_buyin` and `stakes` to `book`;
`book.upsert` sends them, and the pull reads them back — but only into a club it
has to MAKE. A club this phone already has keeps its own answers, because
settings travel up exactly as names do, and a pull that wrote them back would
make the two ends argue with the winner decided by whichever ran last.

### B72 — a night pulled back was always called "Tonight"

```
Screen      Home, with two tables running
Seen        two cards, both saying Tonight, on any phone that read the book
            rather than recorded it
Expected    the names the host gave the tables
Found       9 Sep, auditing the write points
Locked by   npm run check — syncRows.test.ts (the session row's columns),
            pull.test.ts; npm run db:verify — 03_sync_contract.sql
Status      fixed in 58d81af
```

`night.table_name` exists precisely because a club can run two at once and the
group's name cannot tell them apart. `session` had no such column, so it was
lost on the way up, and every pulled night came back at the default — including
the one the host had renamed to stop exactly this confusion.

`0014` adds `session.table_name`. It goes up with the night when it opens, and
as a `session.patch` when a second table opening renames the first — that rename
is a write to a night the server already has.

### B73 — the roster's removals and the who-has-paid ticks were lost with the phone

```
Screen      GR4 players, O2 member, E7 who has paid
Seen        a second phone offers a seat to somebody removed from the roster a
            month ago; a reinstalled phone shows a settled night with every
            payment tick empty
Expected    both, as the host left them
Found       9 Sep, auditing the write points
Locked by   npm run check — storageCoverage.test.ts, syncRows.test.ts;
            npm run db:verify — 03_sync_contract.sql, 05_member_read.sql
Status      fixed in 58d81af
```

Three flags with no home on the server: `pays_kitty`, `removed`, and the row of
E7 ticks in `night_payment`.

`0014` gives the first two columns on `player` — `removed_at` rather than a
delete, because every night that names somebody still points at their row — and
the third a table of its own, `transfer_payment`.

**Storing who has paid is not the workflow principle 4 rules out.** That
principle is about the FIGURES: a night is final the moment it is counted,
deducted and settled, and nothing about payment moves a number afterwards. It
still does not — nothing in `packages/core` reads this table and a night settles
identically with every row and with none. But the host taps those ticks on E7
today, and they were being kept where a reinstall took them.

### B47 — the "invited" badge cannot appear, and a claimed seat never stops saying "no app"

```
Screen      GR4 /players, and GR5 /member
Seen        the roster never shows "· 2 invited", never draws the amber pill,
            and a player who has claimed their seat still reads
            "Name only · no app · invite" on the host's phone for ever
Expected    a live code puts `invited` on the row; a claim takes it off and
            moves standing to `member`, so the App row reads "has the app"
Found        7 Sept, reading the roster against the invite board
Locked by   npm run check — seatReconcile.test.ts runs both statements against a
            real SQLite: the badge goes on and comes off again, the promotion
            reaches name_only and never an admin
Status      fixed in this commit
```

Two holes, one cause: **nothing reconciles the roster's local flags with the
server's invite state.** `inviteMember` and `resetInvite` (`clubStore.ts:633`,
`:643`) are the only writers of `club_member.invited`, and **neither is called
from anywhere in the app**. `players.tsx:133` and `member.tsx:58` both read it.
`standing` has the same shape of fault: only `makeAdmin` writes it, so it never
becomes `member` on a claim.

`seatStatuses` (`invites.ts:135`) already returns exactly the two facts needed —
`claimed` and `liveCode` — for a list of ids. It is called from one place, for
one player, inside the invite sheet. The roster needs it for its whole list.

This is the state the invite flow is *about*, and the entry-point screen of the
handoff draws it. Until it is fixed, a host has no way to see who has been
invited without opening every row.

**Fixed 7 September.** `inviteMember` and `resetInvite` are gone — dead code
that read as if the feature worked is what let this live — and `reconcileSeats`
in `clubStore.ts` replaces both. `players.tsx` calls it on FOCUS rather than on
mount, because the invite sheet opens over the roster and closes back onto it
without unmounting: a host who had just issued a code would otherwise watch the
row they came from go on saying nothing.

It asks rather than being told, and it never clears a badge it did not hear
about — every write is driven by a row the server actually returned, so a train,
a signed-out build and a refused key all leave the roster exactly as it was. Ids
that cannot leave the phone are not asked about, or the sample club's seats
would take the whole call down with the real names beside them.

**Half of the second hole is deliberately still open.** A claim promotes
`name_only` to `member`; nothing demotes `member` back. A reset really does end
an account behind a seat, and that row will go on reading "has the app" — but
telling a reset apart from a host who has never bound their own seat (B48), and
from a removal that revokes nothing (B57), is those two bugs' work. A demotion
written before them would flip the row of every host in the product. The badge
lands right in the meantime: a reset issues a new code, so the row reads
`invited`, which is true and is the thing to act on.

### B49 — an expired code is offered as live, with its share chips enabled

```
Screen      C3a /invite
Seen        a code a month old is drawn as the hero with Copy, Message, Share
            and QR code all live; sharing it sends ten characters that cannot
            be redeemed
Expected    the expired state — what the countdown said, replaced by the date
            it died and a primary that makes a new one
Found        7 Sept, comparing seatStatuses' predicate to the server's
Locked by   npm run check — inviteState.test.ts, "B49 · what counts as a code the
            host may still send"
Status      fixed in this commit
```

`seatStatuses` (`invites.ts:145–149`) selects live invites as
`claimed_at is null and revoked_at is null` — and omits `expires_at > now()`,
which every server-side path includes. So the client's idea of "live" is a
superset of the server's by exactly the codes that have timed out, and the sheet
shows the newest of them as current.

`invite.tsx:65` then does not mint a replacement, because it only mints when
`liveCode === null`. The host sees a code, sends it, and the person on the other
end lands on X2c.

Two lines: add the expiry filter to the select, and return `expiresAt` and
`createdAt` with it — the Sent state on the invite board cannot be built without
them either.

**Fixed 7 September.** `seatStatuses` now selects `expires_at` and drops
anything `isLive` refuses. The expiry is tested on the row rather than added to
the query as a fourth `.is()`, so the rule this app depends on is a pure
function with a test in front of it instead of a clause nothing can see; there
are a handful of invites per roster and fetching an expired one to drop it costs
nothing worth measuring.

An unreadable or absent timestamp counts as NOT live. The cost of that is one
fresh code, which is what the sheet mints anyway for a seat with none; the cost
of the other answer is handing a host ten characters the app cannot vouch for.

The invite sheet needed no change: with the expired code gone from the answer it
sees a seat with no live code and mints one, which is what it has always done.

### B50 — a train tunnel tells the reader their invite is dead

```
Screen      X2 /claim
Seen        any network failure, "You already have a place in this book", and
            "Sign in first" all render as "This invite can't be used ·
            Ask whoever invited you for a new link"
Expected    a network failure stays on X2a and offers a retry; the two messages
            the server deliberately keeps distinct are shown as themselves
Found        7 Sept, reading claim.tsx against 0009_invite_privacy.sql
Locked by   npm run check — inviteState.test.ts, "B50 · why a claim did not land",
            including the default: anything unrecognised is unreachable and
            never dead
Status      fixed in this commit
```

`claim.tsx:63` catches the preview's error and sets `dead` — three lines under
its own comment saying a network failure "is NOT a dead code" and that the
screen stays on X2a. `claim.tsx:90` does the same for everything `redeemInvite`
throws.

**Corrected 7 Sept, reviewing the second cut:** of the three, only two are user
states. `Sign in first` cannot reach a person on the claim path at all —
`redeemInvite` signs them in anonymously first, which is what `connection.ts`'s
`anonymousSignIns` exists to check ("watchers and claims need" it). It fires only
when anonymous sign-in is disabled on the project, which is a build fault and
belongs in the connection report's voice, not on a screen asking a guest to make
an account. So: the network failure and `You already have a place in this book.`
are the two to draw.

The one-string rule is right and should not be touched: `0009` pads all four
dead causes to a common floor so timing cannot answer the question either. But
that migration argues at length that **two** conditions stay distinguishable on
purpose — not signed in, and already holding a seat in this book — because
neither tells a guesser anything. The client throws both away, plus a third the
server never sent. Six outcomes, one string, where the design says four.

**Fixed 7 September.** `readClaimFailure` in `inviteState.ts` is where the
reasoning lives, and the one-string rule is untouched: the four dead causes are
recognised by the single sentence they share, and nothing takes them apart.

Two states the server could always describe now have screens —
`2c Still checking`, which keeps the reader on the checking frame with a line
and a retry, and `2c Already a member`, which names the group because it only
fires for a book the caller can already read. Both strings are
`handoff-invites-3`'s, verbatim, flagged in `claim.tsx` as drawn and not yet
signed off.

**The default is the part worth keeping.** Anything unrecognised is
`unreachable`, never `dead`: a thrown error is not evidence about a code — only
the preview answering with nothing is that. Being wrong this way costs a retry
nobody needed; being wrong the other way sends somebody to ask for a
replacement for a link that works.

The third message this entry originally listed, `Sign in first`, is not a user
state — see the correction above it.


### B61 — the settled night's status pill read as a count that had not finished

```
Screen      /settled (and /payments, which draws the same pill)
Seen        `₾4,550 left`, in coral, in the same card as `MONEY IN PLAY
            ₾39,000`, on a night whose count had balanced to the lari
Expected    a status that cannot be read as "₾4,550 of the money on the table
            is still unaccounted for"
Found       8 Sept, by the owner, on an eight-handed night — reported as
            "why does it say 4,550 left when the game has been counted to zero"
Locked by   npm run check:ui — ui-journeys.mjs, "the pill states the same
            figure the card does", which now reads the new wording
Status      fixed in this commit
```

**The arithmetic was right and the sentence was wrong, which is the harder half.**
The pill is the sum of the night's UNPAID TRANSFERS — cash that has yet to change
hands over the following week — and `design/handoff-game-end/` is explicit that
it is that figure and 2a's `Left to move` by construction. On the reported night
it was exactly right: three winners collecting ₾3,980 and ₾570 going to the tin.

What made it unreadable is where it sits. `MONEY IN PLAY ₾39,000` is on the left
of the same card, and every night ends with nothing yet handed over, so every
night ends with a coral pill stating a large figure beside the money that was on
the table. `left` is then the natural word for *left over*, and the host read it
as the count having failed — and went back to re-count a night that was right.
That is the worst thing a status can do.

`to move` is 2a's own word for the same number, so the fix stays inside the cut's
vocabulary rather than inventing a third phrase: the card over there is headed
`Left to move`, and both screens now say the same thing about the same figure.
Nothing about the amount, the colour or the three states changed.

**⚠ It is a deliberate departure from the cut's copy table**, which prints
`₾400 left` for the part-settled state and `₾1,000 left` for the unsettled one,
and `CLAUDE.md` says copy is final. This one was changed on the owner's own
report of misreading it; it is recorded here, in `docs/screens.md` and in
`SettleStatus.tsx`, so the next session sees a decision rather than drift.

### B60 — the ranked list ran off the bottom of the phone at eight players

```
Screen      /settled, both modes — and every past night, which is the same route
Seen        three of eight names below the fold, and the rounding row and the
            note below those; the spend line wrapping to two lines on every
            player who was charged the tin
Expected    the whole ranking on one screen — the order IS the content
Found       8 Sept, by the owner, on the club's own eight-handed night
Locked by   npm run check:ui — ui-journeys.mjs, "the ranked list has room for
            an eight-handed night without scrolling", which measures the row
            budget rather than playing a second roster
Status      fixed in this commit
```

**Nothing was broken; the screen was drawn against a six-player night.** Every
padding, size and margin on it comes from `design/handoff-game-end/`, whose
worked night has six players — and at six it fits, which is why every check and
every photograph of this screen has been clean since 6 September. The club it is
actually used by plays eight.

The row was 80 points at eight players and is 54 now, and two thirds of that came
from the spend line rather than from the paddings: `piggy bank 330` was the
longest term on the line and the reason it wrapped, so the term is `piggy 330`
now (the owner's call — the block above still names the rule in full). The rest
is the line heights, which were nobody's decision at all: a `Text` with no
`lineHeight` takes the platform's default leading, so a 17-point name was costing
23 points and nothing in the file said so. They are written down now, and the
row's height is arithmetic anybody can check against a screenshot.

The blocks above the list each gave back a few points — the card 4 and 4, the
deductions 6, the toggle 6, the list 2 — which is what pays for the eighth row.
`docs/screens.md` carries the board value each of them departs from.

**The check is a budget, not a longer roster.** `ui-journeys` plays the seeded
night and the seeded night is six; a second roster built only to make a list
longer is a second thing to keep current. What decides the answer is arithmetic —
where the first row starts, how tall the tallest row is, where the footer begins
— so the pass measures those three and asserts room for eight. Anything that puts
the rows back up reports a budget of seven.

### B59 — `out` dropped to a line of its own with a third of the row empty beside it

```
Screen      /settled — the spend line under a name, both modes
Seen        on the phone, At the table: "in 1,500" and "out 2,000" stacked on
            two lines under Goga, Oto and Andro, with about 130 points of empty
            row to the right of them. Levani, whose terms are NARROWER, kept
            his on one line — same screen, same width, same night
Expected    one line while the row has room for one, which at these figures is
            every phone in the matrix
Found       7 Sept, on the phone
Locked by   npm run check:ui — ui-journeys.mjs, "the spend line wraps against
            the row rather than against itself"
Status      fixed in this commit
```

**The box the line wraps inside was measured off the line, not off the row.**
`styles.rowText` held the name and the spend line with `flexShrink: 1` and no
`flexGrow`, so it was sized to its own widest content — which for these rows is
the spend line itself. That makes the wrap container EXACTLY as wide as the terms
on it, and an exact fit is not a fit: the width is measured with no constraint,
rounded to the device's pixel grid, and the line is then laid out again inside
the rounded figure. A third of a point either way decides it, which is why three
rows wrapped and the fourth did not, and why the wider row was the one that
survived. `flexGrow: 1` makes the question a real one — the line now wraps
against the room the row has left beside the net, and not against itself.

**Nothing on the web build could ever have seen this.** react-native-web sizes
the same box off CSS `max-content` and never rounds it down, so the browser drew
one line either way: `ui-journeys` had been walking this screen since 6 September
and reporting it clean while the phone stacked it. So the check is not written on
the wrap. It is written on the box — the text block has to reach the net, which
is the fix itself and has the same answer on every renderer. Against the old
build it reports all six rows short, by 118 to 163 points; against the new one,
zero. The wrap is asserted too, but only where the terms actually fit the line,
so a night in the millions that genuinely runs out of room does not cry wolf.

**And the two greens on the row are no longer the same green.** `out 12,880`
under a name and `+$12,380` beside it were `win` at full strength in both places,
so the caption read as a second result rather than as the working behind the
first. The terms are now blended 65% toward `muted` — `quieted()` in
`settled.tsx` — which takes the saturation out and leaves the luminance alone.
Opacity is the obvious way to fade something and it is the wrong one here: `win`
on white is 5.43:1 to start with, so the bright theme drops under the 4.5 floor
at any fade at all, and `ui-audit.mjs` rule 9 mixes opacity into a colour before
reading it for exactly that reason. Blended, nothing on the line reads below 6:1
in either theme.

### B58 — the totals card sat flush against the meta line on both game-end screens

```
Screen      /settled and /payments — the card under the title
Seen        meta bottom 83.7, card top 83.7. No gap at all: "05:45 → 08:55 ·
            3h 10m · 6 players · settled" and the MONEY IN PLAY card share an
            edge, and the same on "Mon, 7 Sept · 6 transfers" over LEFT TO MOVE
Expected    16, which is design/handoff-game-end/README.md § 1a item 4 —
            the totals card is "margin `16px 20px 0`"
Found        7 Sept, photographing the ending flow with scripts/ui-shots.mjs
Locked by   npm run check:ui — ui-journeys.mjs, the `touches-the-head` check,
            which fires under 6 at every stop of a played night
Status      fixed in this commit
```

**The card owned the 20 and not the 16.** `TotalsCard` set `marginHorizontal:
space.card` and no `marginTop`, so it took the board's horizontal margin and
left the vertical one on the floor. Every other block on `/settled` — the
deductions, the toggle, the list — carries its own `marginTop: 14`, which is why
the fault stops at the one element: the card is the only thing in the body that
never asked.

**`Screen` cannot lay this floor, and the comment in it says why it thought it
had.** `titlePadBottom` is 6 under the title row and it is described there as
"the floor under a title … none of them can land on the title by omitting one,
which is exactly what had happened". That was true and it is still true — but
the meta line sits *below* that floor and lays none of its own (`metaPadTop: 2`,
no bottom), so a first element with no margin lands on the meta line instead of
the title. **The same fault, one element lower, on the screens that were added
after the floor was poured.** Raising `metaPadTop` would have fixed it
everywhere and been wrong everywhere: it is a token on all 37 pushed screens,
and the other 35 have first elements that already space themselves.

**One value fixed two screens, and that is the component earning its keep.**
`TotalsCard` exists because "two screens drawing their own version of one card
is how they end up stating different amounts on the same night" — its own
header comment. The same argument covers the geometry: the cut says 2a's card is
"identical construction to 1a's", so a margin on the component is a margin both
screens cannot disagree about.

**Why the route audit could never have caught it.** `/settled` and `/payments`
opened cold render "Not settled" and an empty transfers list — no card on
either. `ui-audit.mjs` walks routes, so it measured a screen the fault is not on.
This is the first blind spot `ui-journeys.mjs` was written for, stated in
`docs/ui-guide.md` as "a screen no URL reaches", and it is why the new check
lives there rather than beside the other geometry rules.

### B46 — the rounding sheet described the rule this app removed

```
Screen      /rounding, both paragraphs — the count-up form and the settle-up one
Seen        "stacks snap to the step as they are entered", and
            "the difference goes to the piggy bank"
Expected    what the step actually does: it lands the final positions,
            apportioned so they still sum to zero, and rewrites no count
Found        6 Sept, holding the sheet against design/handoff-game-end/
Locked by   npm run check — settled.test.ts asserts the identity the copy was
            contradicting; the strings themselves are held by the audit's
            /rounding route pass
Status      fixed in this commit
```

**Two sentences, both stating a rule that was removed on 2 September**, in the
one place a host goes to decide whether to turn it on.

The first told them their count was about to be rounded. It is not: `finalCounts`
is never rewritten, the balance check compares real money to real money, and
that is the whole argument in `stacks.ts`. The second promised the piggy bank the
remainder — the money the old stack rounding invented and the tin absorbed. There
is no remainder any more, so the sheet was offering the tin money the settlement
was never going to hand it, which is B36 the other way round: B36 took the false
figure off the row and left the sentence that explains it.

**Nothing could see it, and nothing here ever will.** Copy is not arithmetic; no
test asserts a paragraph and none should. What makes this one catchable is that
it is a claim about the engine, so the check that holds it is the engine's — a
suite that asserts `Σ final + piggy === 0` with no remainder term in it is a
suite that says out loud which of the two rules is running. The next session to
read the paragraph and the test together will see the disagreement in one file.

**Both survived a redesign that repeated them.** The 6 September cut writes the
same stacks sentence into its own README, and its two boards then print
`on the nets`, which is the other rule. That is recorded in
`design/handoff-game-end/START-HERE.md` rather than resolved by taking the prose:
the screens ship, the prose does not.

### B45 — the pad that types a spend was three hundred points below the figure it types

```
Screen      L2 /spend, add a spend — and L3, the same sheet on a logged one
Seen        The order was figure, note field, eight chips naming everybody at
            the table, keypad. That put the pad 343 points under the figure:
            on the 393 × 852 reference phone the body is 569 and the content
            685, so seeing the whole pad meant scrolling 116 and the running
            figure went off the top; on a 360 × 640 Android the pad's first
            key sat 21 points BELOW the fold, so the sheet opened with no
            keypad on it at all
Expected    the amount and the keys that type it on screen together, unscrolled,
            on every phone in doc 15 § 4's matrix. It is the one thing
            `Keypad.tsx` says the app's own pad exists for — "a keyboard
            sliding up would cover the running figure and the button that
            commits it" — and the spend sheet was doing it to itself
Found       6 Sept, on the owner's report: "the keyboard is away from the value
            display". Measured with `scripts/ui-audit.mjs` after
Locked by   npm run check:ui — `pad-below-the-fold` in ui-audit.mjs's sheet
            pass, which asks of /log, /spend and /share, on all six devices,
            that the pad START on screen. A sheet opens unscrolled, so anything
            above the pad is visible whenever the pad's own top is: one
            measurement holds both halves. It goes red on the old screen —
            two devices, SE and the small Android — and clean on the new one
Status      fixed in this commit
```

**The fix is the order every other amount sheet was already in.** /log, /entry
and /share are figure, one short row, pad; only /spend put a form between them,
and it did so because L2 draws the note and the chips there and the pad was
added underneath. So the pad moved up under the figure, and *Covered by* — the
eight chips, the per-person shares, the sentence explaining the case — became a
step of the same sheet, reached from a row that states who is covering it:
`Nobody yet`, `The piggy bank`, a name, or names joined with ` · `. One sheet,
one close, content replaced rather than pushed — `09-navigation.md`, and the
shape `new-night.tsx` already uses.

Content went 685 → 543. The reference phone now draws the whole sheet without
scrolling at all; the smallest Android still scrolls to reach the two rows, but
the figure and every key are together above the fold on all six devices.

**What this check does NOT hold, said plainly.** It asks that the pad starts on
screen, not that all four rows of it are. On the small Android /log clears the
threshold by about 100 points and still leaves its bottom key row 95 below the
fold — the same fault as this one, a quarter of the size, on a screen nobody has
reported. It is not fixed here and it is not gated; a check tightened to catch
it would go red on a screen this change did not touch, which is how a gate stops
being trusted.

### B44 — a rebuy typed on the amount sheet landed without a word

```
Screen      N6 /log with kind=rebuy — reached by Other amount on the player
            card and by the dock's Rebuy through the picker — and T1 /session,
            which is where the confirmation is drawn
Seen        Rebuy $500 on the player card writes the entry and Tonight says so:
            +$500 beside On the table, +$500 on the row, a bar above the dock
            holding Undo for two seconds. Other amount, one button along, opens
            the keypad; Log Petr's rebuy there wrote the same entry and popped
            ONE sheet — back onto the player card, nothing on it changed, and
            the bar (had there been one) running on the screen underneath.
            Through the dock it landed on Tonight, but announced nothing, so
            the figure moved and nothing said it had
Expected    the same act confirmed the same way whichever button started it:
            write, announce off the id the write returned, then Tonight — the
            order quickRebuy in player.tsx keeps and for the same reasons. The
            route with no confirmation and no Undo was the one used for every
            amount that is not the standard, which is the one worth confirming
Found       6 Sept, by the owner, on the phone
Locked by   npm run check — rebuyConfirmation.contract.test.ts reads log.tsx
            for the order (write, announce, dismissTo('/session')) and for the
            id being the write's own. And npm run check:ui — ui-journeys.mjs
            logs its rebuys through the dock and the keypad, and now holds
            that the bar naming the player is up on Tonight after each one,
            which is the browser leg screens.md said the confirmation wanted
Status      fixed in this commit
```

**Why it was missed on 5 September.** The confirmation was built against the
card's primary — the handoff's board draws the tap on `Rebuy $500` and nothing
else — so the announcement was made in `quickRebuy` and nowhere else, and
`/log` kept the exit it had had since N5: pop one sheet. Every route in was
right about where the *sheet* should go and none of them asked where the
*confirmation* was. The write itself was never wrong; the ledger has every one
of those rebuys. What was missing was the two seconds of Undo, and an Undo that
guards only the standard amount is guarding the one figure a thumb is least
likely to have got wrong.

### B43 — Count up cut short the one figure it exists to state

```
Screen      E2 /count-up, the balance block
Seen        "₾47,0…" where the sum is ₾47,000. Two figures at 30/800 in half a
            card each is about 123 points a figure, and a five-figure lari
            amount does not go in 123 points — so the screen whose whole job is
            comparing two sums stopped being able to print them at exactly the
            point the numbers get big
Expected    both sums readable in full at any digit count the block promises.
            The cut that found it verifies nine, "+₾123,456,789", at 393 × 852
Found       6 Sept, by the design rather than by a phone —
            `design/handoff-count-up-header/`, which replaces the block rather
            than widening it: the signed gap becomes the headline and the two
            sums go underneath at text size, where nothing has to be a display
            figure in half a card
Locked by   npm run check — countUpBlock.test.ts holds the two rules the fix
            rests on: the headline STEPS DOWN in size rather than shortening
            (38 points to a 24 floor, and the nine-digit case lands on the
            floor rather than under it), and a sum in the block abbreviates
            from a billion rather than from a hundred thousand. And npm run
            check:ui — ui-journeys.mjs's clipped pass over /count-up at three
            text scales, plus npm run currency, which walks the same screen
            with three glyphs of symbol in front of every figure
Status      fixed in this commit
```

**It is the same fault as B15 and B38 and it kept coming back for one reason:
the block was two display figures in half a card each.** B15 wrapped the total,
B38 ellipsised the sub-line under it, and each was fixed by finding room inside
that shape — a compact form here, a two-line box there. The shape is what was
wrong. A 30-point figure needs about 104 points for six glyphs before the text
setting touches it, the card has 317 inside it on the reference phone, and two
of them side by side with a divider between will not hold a currency whose
amounts run five figures. Lari does; so does koruna; so does any night at a
table where the chips are worth ten of something.

So the fix is not more room. It is that **only one figure in the block is a
display figure now** — the gap, which is the thing the host acts on — and it is
fluid rather than fixed, stepping from 38 points down to 24 as the digits
arrive. The two sums are 18-point text on rows of their own, where the caption
beside them is what compresses. The old sub-lines went with the columns, which
retires B38's two-line boxes along with the line that needed them.

**And it moves on its own for a wider symbol.** `fitFor` drops the abbreviation
threshold a decade per glyph of currency, so the block gives up at ten million
in CHF and at a hundred million in koruna without anything here knowing. Three
glyphs in front of nine digits is a different measurement, and B33 is what
forgetting that costs.

### B41 — nothing could say which migrations the live project actually has

```
Screen      — the database, not a screen
Seen        `docs/setup-supabase.md` said "the schema is one file:
            0001_init.sql. It has never been applied to this project", and
            `docs/auth-test-period.md` said to run 0005 through 0008 on top of
            0001-0003. There are thirteen migrations. Both lists were written
            when they were true and neither was updated by the eight files that
            landed after them, so the only written answer to "is the server up
            to date" had been wrong for weeks
Expected    a way to ask the database itself, from the one place a person
            actually has — the SQL Editor — and get back which files are
            outstanding by name
Found       3 Sept, asked to check the Supabase side after a SQL Editor tab was
            closed. A remote session cannot reach supabase.co (the proxy denies
            it) so there was no way to check and no document to trust
Locked by   npm run db:verify — it now runs supabase/state-check.sql against the
            throwaway database after applying every migration and fails if any
            row reads MISSING. A probe that stops matching its migration, or a
            fourteenth migration with no row of its own, takes it red
Status      fixed in this commit
```

The half of this that a check can hold is the script. The half it cannot is the
two dashboard toggles — anonymous sign-ins, and the access-token hook — which
live in Supabase's own configuration and are invisible to SQL. `state-check.sql`
prints them as a row anyway, marked `by hand`, because a checklist that silently
omits the step that fails silently is the same fault again: without the hook a
watcher's screen is simply empty, and nothing anywhere reports an error.

### B42 — a spend the piggy bank paid for stopped the whole night syncing

```
Screen      — the send queue, not a screen
Seen        `entryRow` in syncRows.ts sent ten columns and neither `covered_by`
            nor `spend_group`. Three of the four shapes 0004 gave a spend have
            no payer, so they went up as an expense with `payer_id` null and no
            cover — which the shape constraint refuses. The queue drains in
            order and halts at its first failure, so the refused pizza sat at
            the head of the line and stopped every entry behind it, on that
            night and on every night queued after it, indefinitely
Expected    both columns sent, null included, so all four spend shapes reach
            the server and the queue never has a row it cannot deliver
Found       3 Sept, reading the sync path after state-check.sql showed 0004 had
            been skipped on the live project. Nothing could see it: syncRows.ts
            omitted the columns, syncRows.test.ts asserted the omission as the
            expected column list, and 03_sync_contract.sql only ever inserted
            the one spend shape that predates 0004. Three files agreeing with
            each other, all wrong the same way
Locked by   npm run check — syncRows.test.ts, the column list plus three cases
            for the shapes 0004 added; four tests go red if the columns come
            back off. And npm run db:verify — 03_sync_contract.sql now sends a
            kitty spend, an unpaid one and two fronters sharing a spend_group
            through real Postgres, and rejects both a spend with neither a
            payer nor a cover and one with both
Status      fixed in this commit
```

The host's phone never lost anything — the ledger is local first and the screen
reads local state. What was lost is the server's copy, which is the watcher's
view and what a reinstall restores from.

Worth being precise about why the check missed it, because the tripwire was
already there and working. `syncRows.ts` says in its own header: *if a column
set changes, the test in `syncRows.test.ts` fails on purpose and names the SQL
file that has to change with it.* That is exactly right, and it fires when a
column set CHANGES. Here a migration added two columns and no one changed the
column set, so all three files stayed consistent with each other and
inconsistent with the database. A tripwire across two descriptions of a table
cannot see a third description neither of them was compared against.

Applying 0004 does not fix this. It changes the constraint that rejects the
row, not the row.

### B35 — the app still said "kitty" in two places, and went quiet when a player held it

```
Screen      E4 settle-up — the lede under the title and the payee on a transfer
            row — and E3 deductions, the head of the preview grid's fifth column
Seen        "Seven transfers clear the night. The kitty is set aside for the
            group." and a row reading "Tomáš → The kitty". `kitty` is the
            STORED value of a rule's destination; every other screen in the
            app says "piggy bank". And the sentence appeared only when the
            collector was NOT at the table, so on a night where a player holds
            the bank the screen said nothing about the float at all — it was
            folded into that player's own transfer, they were listed by name
            like anybody else, and the room handing them the cash had no line
            anywhere saying part of it was the group's
            reading `KITTY` over the piggy-bank column
Expected    frame `4a`: "The piggy bank is set aside for the group", whoever
            is holding it, and `Piggy bank` as the payee's name. On E3, the word
            every other screen uses — `PIGGY`, as E6's own column heads it
Found        1 Sep, reading `4a` against the screen. E3's column head was found
            by the check written for E4: it counted the word `kitty` anywhere on
            the page and found it on the screen E4 was pushed on top of
Locked by   npm run check:ui — ui-journeys.mjs, "settle up says the piggy bank
            is set aside": the sentence has to be on screen and the word `kitty`
            may not be VISIBLE anywhere on it. Scoped to what is visible on
            purpose — expo-router keeps the whole stack mounted, and an
            unscoped count reads the screen underneath, which is how E3's
            column head turned up in the first place
Status      fixed in HEAD
```

**E3's column is the older half and the board is why it lasted.** The rev-18 E3
frame draws the head as `KITTY` and copy is final — but the money itself was
renamed after that frame was cut, and `destinationWord` in core has been the one
place the spelling lives ever since. Every other screen followed it; this cell
was a string in markup and followed nothing. It reads `PIGGY` now rather than
`PIGGY BANK`, because the cell is 9.5/700 in a five-column grid measured against
figures in the millions and E6's columns head the same money the same way.

**Two faults from one line of code on E4.** `settle-up.tsx` had a private `word()`
returning `'kitty'`, three months after `destinationWord` in core was written to
be the single place that spelling lives — and the same map that named the payee
was also driving the sentence, so the sentence inherited a filter that had
nothing to do with it. The row filter is right: a collector sitting at the table
is a person and their row shows their name. The sentence is about the money, and
the money is set aside either way.

### B34 — the piggy bank was a win again, on Settle up

```
Screen      E4 settle-up, the `Night's net` chips
Seen        the chip row printed `finalPosition` — the balance, float included —
            so a host who plays AND holds the piggy bank read their own night
            $126 heavy in it, sorted above people who had played all night for
            more. B27 fixed exactly this figure on E6, the player card and My
            stats, and named settle-up as a screen that keeps the balance ON
            PURPOSE. That is true of the TRANSFER LIST and it is not true of
            the chips underneath: the list answers what somebody is owed when
            the room breaks up, and a chip answers how their night went
Expected    the same figure E6's row prints — `nightScore`'s score, the float
            outside it — on the same people in the same order
Found        1 Sep, from the table
Locked by   npm run check — packages/core/src/rev15-night.test.ts, "E6 — the
            formula line under a name": the chips are `resultFormula` now, which
            is the list E6 draws and whose net is asserted to be `nightScore`'s
            score for every player. Nothing yet for the screen READING the
            wrong half of it — no check can see which of the two figures a chip
            prints, and the seeded night's collector never sits down, so a
            journeys assertion would need a night whose rules put the bank in a
            player's hands. Standing invitation
Status      fixed in HEAD
```

**B27 drew the line in the right place and this screen was on the wrong side of
it.** The entry says three screens keep `finalPosition` and lists settle-up as
one of them, which is correct about the transfers and was read as correct about
the whole screen. Two lists sit on E4 and they answer different questions; the
fix is that they now come from the two functions that answer them, and the
component chooses neither.

### B26 — the stack a player was counted out for is on the card and in no row under it

```
Screen      T2/T4 the player card, on a night that has been counted or settled
Seen        Andro's card reads IN FOR $500 · COUNTED $2,480 · NIGHT +$1,980,
            and ENTRIES below it is two rows: the $500 buy-in and the $120
            pizza he fronted. Nothing on the list says where $2,480 came from.
            Dana, who cashed out at 23:15 while the game was still running, has
            her "Cashed out · stack counted · seat closed · $2,120" row — so
            the same movement of the same money is a row for one player at the
            table and invisible for the other five
Expected    the money coming off the table gets a row like the money going on
            it: one entry per thing that happened, and the column reconciles
            with the figure above it
Found       31 Aug, reading the card against its own summary
Locked by   npm run check:ui — ui-journeys.mjs, "the counted stack is a row",
            asserted on the settled card it opens off E6
Status      fixed in this commit
```

**Only a cash-out was ever an entry.** The end-of-night count is not in the
ledger and never has been — it is `night.finalCounts`, a map the host fills in
on E2 — so `entryRows` had nothing to draw for it, and the one person who
happened to leave early was the only one whose exit showed up.

That is the whole of the fault, and it is worse than a missing line: the list
is the thing a player reads to check the figure above it, and for anybody
counted at the close it added up to their buy-ins alone. `08-tonight-home.md`
§ H4 draws the row for the cash-out case and no board draws this one, because
no board draws this card after a night has been settled — so the row is H4's,
at the count's own amount, with a provenance line flagged in `player.tsx` as
undrawn rather than passed off as decided copy.

### B25 — a spend added after the count was allowed by the engine and unreachable from the screen

```
Screen      E3 deductions, and O4 tonight's money rules
Seen        the bar tab arrives at 1am, the count is in, and the only way onto
            the bill is: back out of the ending flow, find the table, open the
            admin drawer, open the bill, add it, then walk forward through
            Count up → Deductions → Settle up again
Expected    the bill and the person who paid it on the two screens where the
            deductions are actually argued about
Found       30 Aug, from the handoff — 11-bill-and-piggy-bank.md, "After the
            count": "A spend added during settle-up is allowed and recalculates
            every winner's share and every transfer"
Locked by   npm run check:ui — ui-audit.mjs, DECIDED, which opens /money-rules
            and /deductions and asks for "The bill" and "Add a spend" by name;
            and ui-journeys.mjs, which adds one from Deductions mid-run and
            checks it lands on the bill it was added to
Status      fixed in this commit
```

**The engine allowed it all along.** Nothing needed changing in `packages/core`:
E3 recomputes off `settle()` on every render, so a spend added there already
redrew every share, the preview grid and the total. What was missing was a door.
The bill hung off the table's own admin drawer, which is a place you can only be
while the game is still running — the one part of the night when the bar tab has
*not* arrived yet.

`src/components/SpendList.tsx` is the list, on both screens, so the amount and
the person who fronted it are one tap from the figures they change. The spend
sheet itself is unchanged and unduplicated: "Covered by" is four cases with a
sum rule on one of them, and a second implementation of that on the deductions
screen is the second implementation that goes wrong. `frontedSentence` moved
into the same file for the same reason — the bill had been the only screen
saying "Marek and Dana fronted it", and it is now said on three.

### B24 — a spend logged at the wrong amount could not be corrected, only voided

```
Screen      L3 the spend, opened on a spend already on the bill
Seen        the amount drawn large at the top of the sheet and no keypad
            anywhere on it. $1,200 typed instead of $120 could be voided and
            re-entered, and nothing else
Expected    L3's own first row — "Rows: Amount, Note, then Covered by" — with
            the amount editable, the way every other logged figure in the app is
Found       30 Aug, reading the sheet against 11-bill-and-piggy-bank.md § L3
Locked by   npm run check — moneyScreens.contract.test.ts, which fails if the
            pad goes back behind `existing === undefined`; and
            npm run check:ui — ui-audit.mjs, KEYPAD, which opens every screen
            where an amount is typed and looks for the pad's backspace key
Status      fixed in this commit
```

The pad was rendered `{existing === undefined && <Keypad …>}`. Adding a spend
was right; correcting one showed a figure with no way to touch it.

**A void is not a correction here.** The ledger is append-only by design, so
voiding writes a reversal that stays visible to everyone for ever — which is
exactly what it is for when a spend did not happen, and exactly the wrong shape
for a typo. The bill then reads as a spend, a reversal and a second spend, and
the room spends a minute working out that all three are one round of drinks.

**And it was hiding a second fault.** `useTypedAmount` captures its opening
figure on the FIRST render, and on that render `useNight()` can still be null —
the sheet mounts before the store answers. The spend being edited is undefined
at that moment, so the pad opened on nought, and the sheet drew **$0** over a
spend logged at $120, with the note and the fronters blank beside it. Nothing on
the screen contradicted the figure while there was no pad, so it looked like a
sheet that had simply not loaded. The state is now seeded once per spend, by id,
when the night actually arrives — once, so the night object changing on every
entry anybody logs cannot throw away a figure the host is halfway through
typing.

The figure is an OFFER, not text the host typed, which is B20's distinction:
the first key replaces the whole amount rather than appending to it, so
correcting $1,200 to $120 is three keys and not nine deletions.

### B28 — the hole quietly stopped being drawn

```
Screen      E6 settled — the player rows, /settled and /watch
Seen        on a night closed $200 short, six rows summing to $200 more than
            the table held, and no `Unaccounted` row anywhere. The pill above
            still said `$200 SHORT`, so the screen contradicted itself: money
            was missing, and the list of where the money went did not mention
            it
Expected    `Unaccounted` is the one row that must never be filtered out,
            because it IS the hole — its own comment said so
Found       31 Aug, reading the filter while fixing B27
Locked by   npm run check — `packages/core/src/rev15-night.test.ts`,
            "E6 — who gets a row on the results list" / "never drops the hole"
Status      fixed in HEAD
```

**A comment is not a check.** The filter read `boughtIn > 0 || endedWith > 0 ||
charged > 0 || credited > 0` under a paragraph explaining that `Unaccounted`
must survive it — and `Unaccounted` fails all four. It bought in nothing, ended
with nothing, and no rule charges it, because it is not at the table. Its whole
existence is a `grossResult`, which the filter never looked at.

It was invisible for the ordinary reason: the seeded night balances, the
canonical night balances, and every frame is drawn from one of them. The row
only exists on a night that did not balance, which is the night nobody has a
board for and the night a host most needs the row.

The filter now lives in `resultRows` in core, named rather than inlined, and the
hole is a case in it rather than a hope about it.

### B32 — the whole app settled up in dollars, whatever the group played in

```
Screen      thirty-one of them. Every screen that draws an amount: Tonight,
            Count up, Deductions, Settle up, the settled night, the player
            card, the log, the rules, My stats — all of it
Seen        a club picks its currency when it is made, changes it from the
            game's own settings, and reads it back on Settings → Currency.
            Every figure in the app is still a dollar. A group keeping its
            book in koruna counts Kč5,000 onto the table and is told it owes
            $1,750
Expected    the group's own currency, everywhere an amount is drawn
Found       31 Aug, from the table
Locked by   npm run check — `moneyScreens.contract.test.ts`, "every figure in
            the app is written in the group's own currency": no screen may
            import a formatter straight from core, no screen may write a
            symbol into its own markup, and the module they all import from
            has no default. And npm run check:ui — `ui-currency.mjs`, a third
            pass that walks the money screens with the book kept in CHF
Status      fixed in HEAD
```

**Every formatter has taken a currency symbol since the day it was written.**
`formatMoney(amount, currencySymbol = '$')` — the parameter was there, the
default was there, and in 141 call sites across the app nobody ever passed one.
That is the whole bug, and it is worth being precise about the shape of it: this
was never a missing feature. It was a default that was right for the club that
happened to be seeded and silently wrong for every other one.

**So the fix is an import, not a hundred and forty arguments.** Threading the
symbol through every call site would have fixed today's screens and lost the
next one somebody wrote, because the default is what a call site gets for saying
nothing. `apps/mobile/src/lib/money.ts` re-exports every formatter bound to the
club's own symbol and **has no default to fall back on**; the app imports from
there, and a new call site is right by construction. The contract test holds the
other half — nothing may reach past it to core — because an import is exactly
the kind of thing that comes back one file at a time.

**It stays out of `packages/core` for the reason core is pure.** The edge
functions import it, and there one process settles other people's books; a
module-level "current currency" there would be a fact about whichever night was
touched last. The app has one group open at a time, and the club store already
knows which.

**Three things it turned out to be, beyond the formatters.** A `$` typed
straight into the JSX on the seat sheet, where the symbol stands alone in front
of a text input rather than in front of a figure — which is why every grep for a
formatter missed it. The rounding copy, where the step is an amount:
`Nearest $10`, `stacks snap to $10`, `Rounded to $10 +$5`. And `ruleDetail` in
core, which built `$170 spent so far` out of a default of its own.

### B33 — and then none of the figures fit

```
Screen      Tonight, Count up, Settle up, the club card
Seen        with the book kept in CHF at 360 × 852 and 120% text: the buy-in
            on Tonight running 206 points into 163, both figures on Count
            up's balance block over their edges, `CHF2,120 cashed out` 17
            points past the block, and `in CHF500 · out CHF2,120` wrapping to
            two lines on three screens
Expected    a figure inside its box in any currency the app offers
Found       31 Aug, immediately after B32, by measuring it
Locked by   npm run check:ui — `ui-currency.mjs`
Status      fixed in HEAD
```

**Fixing B32 is what caused it, and it was entirely predictable.** Every
`exactBelow` threshold in this app was measured against a one-character `$`.
`Kč` is two glyphs and `CHF` is three, so a three-letter currency puts two extra
digits' worth of width in front of every amount in the app — width that was
never there and that no check could see, because both screen tools run on the
seeded club and the seeded club keeps its book in dollars.

**A glyph of symbol costs about what a digit costs**, so the fix is one rule in
one place: each extra glyph moves the abbreviation threshold down a decade. `$`
is unchanged, `Kč` abbreviates at a tenth, `CHF` at a hundredth. Twenty
thresholds stay where they were measured and none of them has to be re-measured
per currency.

**At three glyphs the figure gives one back as well.** Abbreviating earlier is
not enough on its own: `CHF4.5k` is seven glyphs where `$4,500` is six, so the
column is still worse off than it was drawn for. Dropping the decimal —
`CHF5k`, five glyphs — is what actually buys the room back, and it is the same
trade `formatCompact` already makes above a hundred.

**One thing is left, and it is left deliberately.** At 360 with a three-letter
currency, `in CHF500 · out CHF0` on the settle-up row takes two lines. Both
figures are under a thousand so no abbreviation can shorten them, and the only
other lever is cutting one, which is B12 and is never the better answer. So
`ui-currency.mjs` is looser than `ui-journeys.mjs` by exactly one rule, with the
reason written at the top of it: **a clip is a fault and a wrap is not**. What
may never happen is a figure going off the side of its box.

### B39 — the same column meant two things, and nothing on the screen said which

```
Screen      T1 Tonight (/session) and E2 Count up (/count-up) — the player list
Seen        one list, one right-hand column, two kinds of number in it:
            `Petr $1,500` (what he is in for) directly above `Dana +$1,620`
            (what her night came to). Read down, the column says Petr is
            $1,500 up
Expected    a reader can tell money-in from a result without doing the
            arithmetic themselves. The two are different facts and one of them
            is signed, which is a hint and not an answer — a player level on
            the night prints `$0`, which is unsigned, and sits under somebody's
            `$500` buy-in looking like the same kind of figure
Found       1 Sept, in `design/handoff-count-up-to-settled/docs/05-active-vs-
            settled.md`, which is the design cut that names it: "the grouping
            and the group header are load-bearing, not decoration"
Locked by   npm run check:ui — ui-audit.mjs, `DRAWN`, which now holds
            `STILL PLAYING` / `CASHED OUT` / `RESULT BEFORE DEDUCTIONS` on
            /session and the three group headers on /count-up. A pass that
            ungroups either list, or shortens the qualifier to `result`, goes
            red rather than shipping
Status      fixed in HEAD
```

**The colour was carrying the whole distinction, and colour is not a label.**
Tonight has drawn a cashed-out player's result in green or red since it was
built, so the information was there for anybody who already knew the rule. What
was missing was the rule: nothing on the screen said that the column changes
meaning partway down it, and a green figure reads as a good number rather than
as a different kind of number. At exactly zero there was not even a colour.

**E2 had the same fault twice over.** Its list was seated-versus-gone, so the
rows the host still had work to do on sat in the same group as the rows they had
just finished — and the counted row printed the stack, so `$960` under `$1,500`
was two people's chips, one of which was a result and neither of which said so.

Three groups on E2, two on Tonight, and a header on the one group whose column
changes: `CASHED OUT · 1 · RESULT BEFORE DEDUCTIONS`. **Not shortened to
`result`**, and the doc is explicit about why — the bill, the piggy bank and the
rounding step have all still to come off, so a row calling itself a result would
be the first of three different figures the same person is shown for one night.

**A header is drawn at zero too.** An empty group renders `· 0` rather than
disappearing, which is what lets a host see that nobody is left to count instead
of inferring it from a group that is no longer there.

### B31 — the collector came back into the table, holding nothing

```
Screen      E6 settled — the player rows, /settled and /watch
Seen        on a night settled at a step: `Radka  $0`, a row between two people
            who had played, for the collector who never sat down. B27 had
            taken her out of the list a day earlier
Expected    a pure collector is not a row. Their whole appearance in the
            settlement is money they hold for the room, and a rounding
            remainder is more of it, not less
Found       31 Aug, in a screenshot of the settled night, after the rounding
            step went in
Locked by   npm run check — `stacks.test.ts`, "the rounding step does not put
            the collector back in the list", which settles the same night at
            all four steps and asserts the list is the three who played
Status      fixed in HEAD
```

**Arithmetic that happened to agree, and then stopped agreeing.** The list kept
somebody whose own money had come back to them — a fronted bill — and the test
for that was `credited − held`, because `held` was the float and nothing else.
The rounding remainder put a second thing in `held`, so the expression became
`credited − float − absorbed`, which on the seeded night is $20, which is
greater than zero, which is a row.

Nothing was wrong with either half. `held` is right to carry both — a collector
who is $20 lighter because the table rounded is holding $20 less for the room,
not losing $20 at poker — and the filter was right about what it wanted. What
was wrong was reaching it by subtraction from a figure that could grow a term.
It asks `playerDeductions` for the bill credits directly now, which is the thing
it actually means and cannot pick up a third meaning later.

### B30 — a snapped stack said what it really was, and wrapped saying it

```
Screen      E2 count up — a seated player's row, second line
Seen        `in $500 · counted $2,352,480` on two lines at 120% text, on a
            night in the millions, the row growing under it. One figure on
            that line has always fitted; the rounding step put two on it
Expected    one line at every text size the app is measured at
Found       31 Aug, by ui-journeys.mjs, on the run that first played a night
            through with a step set
Locked by   npm run check:ui — ui-journeys.mjs, "figures cut off", on the
            `count up · rounded` stop, which exists for this
Status      fixed in HEAD
```

**The line grew a figure and kept a measurement.** `in $500` is one amount at
13/400 with nothing beside it, and it never needed to shorten. Rule 6 of
`E2-rounding.md` — the raw count is kept under the rounded one, so a stack is
never silently rewritten — makes it two, and two amounts plus their words is a
different line. It abbreviates at ten thousand now, which puts the worst case at
`in $500 · counted $2.4m`.

**It was found by the check that was written the same hour**, which is the whole
argument for `docs/bugs.md`: the stop that caught it — `count up · rounded` —
exists because the journey now sets a step and plays the rest of the night at
it, and the fault is one no static route could reach.

### B29 — the app had one word for two settings, and was about to have two

```
Screen      /rounding, and the E2 · E4 · E6 rows that now reach it
Seen        `E2-rounding.md` arrives asking for a control called Rounding,
            with steps of $10 / $50 / $100, set at the count. The app already
            had a control called Rounding, with steps of $10 / $100 / $1k, set
            on the game — and the two mean different things: the new one snaps
            the STACKS, the old one snaps what a RULE DIVIDES. Built as drawn,
            a host would have had two rows with the same label, in the same
            night, doing different arithmetic
Expected    one setting called Rounding, doing both, with one sheet behind it
            however many screens reach it
Found       31 Aug, reading `rounding.tsx` before building the addendum
Locked by   npm run check — `moneyScreens.contract.test.ts`, which holds the
            four steps and the row's words; and `stacks.test.ts`, which settles
            the same night at all four and hands each to `verifyNight`
Status      fixed in HEAD
```

**Neither control was wrong; the collision was.** The addendum does not know the
app rounds rule shares — its own open item 3 asks for exactly that, as future
work — so it names the setting it wants without knowing the name is taken. A
build that followed it literally would have shipped the fault `CLAUDE.md` keeps
naming: an interface disagreeing with itself, in the one place where the
disagreement is about money.

So the step is **one value read two ways**. `RoundingMode` has been snapshotted
onto the night since rev 18; `stacks.ts` reads it for the counts and
`granularityOf` goes on reading it for the divisions. A table settling in
fifties wants both, and the sheet says both in one sentence.

**The old sheet argued the opposite, at length.** Under a heading reading *What
it does not touch* it said: "nothing anybody counted… a chip count is a chip
count, and rounding a result would be inventing or destroying money." That was
the right objection and the addendum answers it rather than ignoring it — the
money invented or destroyed is `Σ rounded − Σ raw`, computed once instead of six
times, named, and given the one destination the doc allows it. Six nets rounded
independently sum to something the table has not got; three stacks rounded and
one remainder named do not.

**What has no answer, and so is not built: a group with no piggy bank.** The
remainder may go to exactly one place. Without that rule there is nowhere to put
it, so the stacks settle as counted and the step goes on doing what it always
did to the rules. `SettlementResult.rounding.on` is what says which happened, and
no frame draws the sheet in that state.

### B27 — the piggy bank was drawn as somebody's win

```
Screen      E6 settled, wherever the results rows are drawn — /settled,
            /watch — the player card at /player, and My stats at /stats
            and /games
Seen        `The piggy bank  +$126` sitting at the top of THE TABLE · AFTER
            DEDUCTIONS on the seeded night, above five people who had played
            all night for less, with no in and no out under the name. On the
            club's own night it is a person: Radka collects, never sits down,
            and reads a $126 win. A host who plays AND collects reads their
            own night $126 heavy on both E6 and their card
Expected    a row prints what the night did to that person. Money they are
            holding for the room is named once, under the deduction it came
            from, beside the person holding it — not added into a score
Found       31 Aug, from the table
Locked by   npm run check — `packages/core/src/rev15-night.test.ts`,
            "B27 — the float is not a win" and "E6 — who gets a row on the
            results list": `nightScore` splits the engine's figure, and
            `resultRows` is the list the screen draws
Status      fixed in HEAD
```

**Nothing was wrong with the arithmetic, and that is why it lasted.** `settle()`
is right to put the float in `finalPosition`: the transfers really do have to
move $126 to whoever is holding the envelope, and a settlement that left it out
would not sum to zero. Every test passed, every figure reconciled, and the
screen still told one person at the table that they had won money they had not
won.

What was wrong was the column. `finalPosition` answers *what is this person owed
when the room breaks up*, and a results row asks *how did their night go* —
two questions with one number behind them, and E6 printed the wrong one. So
`nightScore` divides that number instead of restating it: `score + held ===
finalPosition`, always, and a screen picks the half it is actually asking about.

**The bill is the case that proves the split is not "credits are suspicious".**
Marek fronts $120 for the pizza and is credited $120. That is his — he spent it
at the shop, he is out of pocket until the table pays him, and it belongs in his
score. The piggy bank's $126 is not his in any sense: he is the envelope. The
line between the two is the destination, which is the same line `workingRows`
has drawn since it was written — a bill pays back an outlay, every other kind
hands over a float.

**Where the money went instead.** Under the deduction it came from, as
`collected by {name}`. That is a string no board draws, and it is flagged as
such in the component: no board takes the float off the row, so no board has
had to name the holder. It is the one place on the screen where the question
"who has the $126" has an answer, and it is next to the figure.

**Three screens keep `finalPosition`, and it is the same decision, not an
oversight.** S3 settle-up and E7 who-has-paid are the screens that answer *what
is this person owed when the room breaks up*, and the float is genuinely part of
that — somebody has to hand the collector the envelope. E3's preview grid
(`deductions.tsx`) is the same question one screen earlier: it is the table's
payouts about to happen, drawn against the rules that produced them. The screens
that changed are the ones asking *how did their night go* — E6's rows, the
player card's "Their night", and My stats, which had been banking a club's float
as winnings every night the reader held it.

**Amended 1 September: settle-up is two screens, and only one of them keeps the
balance.** The paragraph above lists S3 settle-up among the three that keep
`finalPosition`, which is right about its TRANSFER LIST and was read as right
about the whole screen. The `Night's net` chips underneath it were still printing
the balance a week later. See B34 — the line this entry drew is unchanged; what
was missed is that one screen asks both questions.

### B23 — a settled night said it was settled three times, and tinted every row while it did

```
Screen      E6 settled, and the results rows wherever they are drawn —
            /settled, /watch, /stands, /settle-up, /log
Seen        a SETTLED pill beside the title, a SETTLEMENT / "You are square"
            panel under the reader's own card, and every player's row filled
            with a green or a red wash behind a figure that was already green
            or red
Expected    handoff-E6: the status appears once, on the prize pool line, or
            not at all; hairline rows; the green and the red on the figures
Found       30 Aug, in `design/handoff-E6/`, cut the same day
Locked by   npm run check:ui — ui-audit.mjs, `tinted-result-row`: every signed
            amount in the app is walked up to the row that holds it, and a
            tinted fill anywhere on the way is a finding
Status      fixed in dbfb72d
```

**The pill and the panel are the half that had no cost and still had to go.**
Neither was wrong alone. X1c drew a status beside the title because a night you
open three weeks later has to say what it is, and it drew a settlement panel
because a reader wants their own answer first. On one screen they say the same
thing twice in two vocabularies, and somebody who has just closed a night reads
the second one as a second question.

**The wash is the half that cost something.** A filled row is an object, and
seven of them are seven objects of two kinds — which is a ranking the sign in
front of each figure had already given, drawn again in a colour that has to
survive a phone at arm's length in bad light. It also made the reader's own row
a different weight from everybody else's, on a screen whose subject is a table
and not a person.

Nothing could see either of them. Both are drawing decisions inside a
component, and the audit's checks were about surfaces, contrast, overflow and
what may scroll — a wash passes every one of them. `tinted-result-row` is
anchored on the FIGURE rather than on a colour name, so it holds whatever the
next wash gets called, and it is not scoped to the results screens: the rule is
about what a signed figure may sit on, wherever one is drawn.

**Amended 31 August, and only in the dark theme.**
`design/handoff-E6/docs/E6-row-formula.md` puts a fill back on an E6 player row
— `rgba(111,207,151,.13)` on a win, `rgba(240,112,92,.13)` on a loss — with the
reason spelled out: at 13% on `#0A0A0B` it reads as a band, not as emphasis,
which is the thing this entry was about. The bright theme has no such alpha and
keeps the hairlines. This is not a reopening: the fill that was wrong was the
one on **both** themes, and the pill and the panel above are still gone.

`tinted-result-row` now skips a node marked `e6-row` under
`prefers-color-scheme: dark` and nothing else, so the rule still holds for every
other signed figure in the app, and a fill leaking into the bright theme is
still a finding. The exception is by name and by theme rather than by screen,
which is what keeps it from quietly becoming "results screens may do anything".

### B22 — Count up could read "done" with a whole cash-out missing

```
Screen      E2 count-up — the status block
Seen        COUNTED $2,880 of $2,880, both figures agreeing, on a night whose
            books are $2,120 light: a player left at 23:15 and their cash-out
            was never entered. The card is neutral, the primary unblocks, and
            nothing on the screen names the money that walked out of the door
Expected    the whole equation on screen in every state — everything bought in
            against everything cashed out plus everything counted — so a host
            can check the sum rather than take the card's word for it
Found       30 Aug, in the E2 handoff, which is the design's own reading of
            the same block: "a comparison against the money still on the
            table, which hides half the sum"
Locked by   npm run check — packages/core/src/balance.test.ts, which asserts
            all four terms of the equation and holds the state at *counting*
            while any stack is uncounted, including on the night where the two
            sums meet by coincidence; AND npm run check:ui — ui-audit.mjs's
            DRAWN map, which now names both column headings, so a later pass
            that drops one to buy width goes red rather than shipping
Status      fixed in this commit
```

**This one was never a rendering fault, and that is what is interesting about
it.** Every figure on the old card was correct. `chipsOnTable` is buy-ins less
cash-outs and `counted` is what the host has entered, and comparing them is the
right test — it is the one the settlement gate has always run, and it still is.
The fault is that the subtraction happens *before* the comparison a person can
see: the missing cash-out is taken off both sides, the two figures that survive
agree, and the screen has no way to say what was removed. A host cannot audit a
sum whose terms are not on the screen.

So the block states four numbers where it stated two, and `left` — the countdown,
and then the verdict — is exactly `−reconcile().difference`, the same figure the
close gate is computed from. `balance.test.ts` asserts that identity directly, so
the block and the gate cannot come to disagree about a night.

**And the second half of it: a screen that only says BALANCED is not checkable.**
Both sums stay on screen in all three states, the strip keeps its height, and
green appears in exactly one of them. The old card had one more way to be
believed than it had ways to be wrong.

### B21 — a tick on Who has paid was a one-way door

```
Screen      E7 /payments
Seen        Mark paid marks. Nothing unmarks. Tap the wrong row — four
            transfers land in the same two minutes and the rows differ by one
            name — and the night says Petr has paid when Petr has not, for
            good. The trap was known: nightStore's own comment on `markPaid`
            named it and left it, because rev 18 draws no control on a paid
            row.
Expected    one touch to tick a transfer settled, the same touch to tick it
            back off, and no obligation to tick anything at all
Found       30 Aug, from the host's own account of clearing the list
Locked by   npm run check:ui — ui-journeys.mjs, "and comes back off". The
            journey plays a night to this screen (no URL reaches it), ticks a
            transfer, unticks it, and asserts the row reads waiting again
Status      fixed in this commit
```

**The fix is smaller than the trap.** `markPaid` becomes `setPaid(from, to,
paid)`: false deletes the row rather than filing a correction, which is right
here and nowhere else in this app — the ledger is append-only because a night's
result has to be unfalsifiable, and this is not the ledger. It carries one
fact, the time of a tap, and it is the tap that was wrong.

On the screen, the whole row is the tick. The board draws the target as a `Mark
paid` chip on the right of a waiting row; the chip is still there and still says
that, it is simply no longer the only place the tap lands. A host clearing this
list is standing in a doorway with a phone in one hand, and a checklist wants a
row, not a 66-point word.

**What was deliberately NOT added: any obligation.** No screen, figure or state
in this app reads `paidAt` — the night is settled by its ledger and stays
settled whether the list is untouched, half ticked, or ticked wrong. So the
ticks got no prompt, no warning, no red, and no completion. A host who settles
in cash at the table and never opens this screen has lost nothing, and that is
the property the reversible tick protects rather than the one it costs.

⚠ **One departure from rev 18, flagged rather than quiet.** E7 puts nothing on
the right of a paid row. Once that row can be tapped it has to say so, so a
paid row carries a filled tick where the chip was. It invents no copy — the
state line under the names still reads `marked paid 00:19`, as drawn — but it
is a mark the designer has not seen. The washed block behind a paid row and the
outline around a waiting one ARE drawn, and were not built; they are now, which
is what makes a ticked row readable at arm's length.

### B20 — correcting a $500 buy-in to $50 wrote $50,050

```
Screen      N10 /entry, the "Change the amount" step — and /share behind it
Seen        the step opens on the amount as logged, $500. Tapping 5 then 0 —
            which is what a host does to fix a buy-in typed at ten times its
            size — left $50,050 on screen and offered to "Correct to $50,050".
            The only way to a figure smaller than the one being corrected was
            nine presses of delete. There was no chip row either, so a
            half-typed figure could not be put back without leaving the sheet,
            and the sheet's close dismissed the whole thing rather than going
            back a step
Expected    the keypad /log has had since the day it was drawn: a figure the
            screen offers is REPLACED by the first key, and only a figure the
            host has typed is appended to. Delete wipes an offer whole. A
            preset puts an offer back up
Found       30 Aug, correcting an entry on the phone
Locked by   npm run check — apps/mobile/src/components/typedAmount.test.ts,
            "a suggested figure is replaced whole by the first digit". The
            screen itself by npm run check:ui — ui-journeys.mjs now stops on
            "correct an entry · the amount", which is the first time any check
            has pressed a key on this sheet
Status      fixed in this commit
```

**One rule, four screens, one implementation of it.** The replace-an-offer rule
was eleven lines inside `log.tsx` — a `touched` flag and two inline handlers —
and every other screen with a keypad had written its own answer:

| screen | opened on | what the first key did |
|---|---|---|
| `/log` | the standard buy-in, or this player's last rebuy | replaced it — correct |
| `/entry` | the amount as logged | **appended to it** |
| `/share` | what the split charges them | replaced it — but after a preset was tapped, **appended** |
| `/spend` | zero, and it draws no keypad when editing one | replaced it — correct |

`/spend` was the only one already right by accident: it opens on `0`, and
`appendDigits` has always treated a lone zero as an empty field. Change the
figure it opens on — which is one line, and the obvious thing to do the day
somebody wants to edit a spend's amount — and it joins the second row.

It is worst on `/entry` and that is not a coincidence: a correction is nearly
always a figure being made SMALLER, so every digit of the wrong amount is
directly in the way of the right one. `/log` never feels it, because a rebuy
typed against a suggested $500 is usually a bigger number and the host is
typing from the first digit anyway.

`src/components/typedAmount.ts` is now the only place that decides, and
`Keypad.tsx` points at it. This is `CLAUDE.md`'s rule about arithmetic applied
to the thing arithmetic is typed on: a screen that keeps its own copy of the
keypad's rule is a second, untested implementation of it, and the four above had
drifted into three different behaviours without anybody changing their minds.

**Why nothing saw it.** No check has ever pressed a key on `/entry`.
`ui-journeys.mjs` punches digits on `/log` and takes the result on trust — B17
is the same blind spot one screen along, and it says so in its own entry: "the
note explained the behaviour instead of stating the amounts". The lock here is a
unit test rather than a journey for that reason. It asserts the arithmetic of
the keypad in figures — `offer(500)` then `5` then `0` is fifty — where a
browser pass would assert that a screen looks right while typing something else
entirely.

**And the check it needed found a third fault the moment it ran.** The lock
above is a unit test, but a drawn chip row that nothing measures is B14 waiting
to happen, so `ui-journeys.mjs` now stops on the correction sheet with the
night's largest entry in it. Its first run reported `$1,200,000` running from
−7 to 367 on a 360-wide phone. That is not the chip and it is not new: it is the
typed figure itself, at the 68 the board drew with `$500` in it, and `/log`
draws the same figure at the same size — the journey had simply never stopped on
a screen with a keypad. Both are fixed together, and both halves are needed:

- `cappedFigure` on the figure, which is B18's treatment and which the boards'
  fixed cards already have. It holds the reader's text setting to 110%.
- **the figure steps down as it lengthens** — `typedFigureSize`, past the eight
  characters the board itself drew. The cap alone is not enough: `$99,000,000`
  at 68 is 382 points across at 110%, still off both edges.

Nothing shorter than `$999,999` changes size. The step is what a calculator's
display does, and it is the only honest option here — an abbreviated figure in
the field you are typing into is a lie about what the button is about to commit,
so `formatToFit` is right for the chip beside it and wrong for the figure above
it.

Two more things went with it, both on the correction step and both making it the
amount sheet the rest of the app draws:

- **The chip row.** `AS LOGGED` and `Custom`, the shared `Preset` from
  `src/components/Preset.tsx` — so the figure as it stands is one tap away
  after a wrong key, which is the whole reason `/log` has the row. Neither
  word is invented: "as logged" is already on the card above it.
- **The close goes back a step.** `09-navigation.md` § sheets: a flow replaces
  the sheet's content and keeps one close, and that close is a step back — the
  shape `new-night.tsx` and `invite.tsx` already use. A mis-tap on "Change the
  amount" used to cost the host the entry they had opened.

### B42 — a stack lost its last digit so a name could keep all of its letters

```
Screen      E2 /count-up, the COUNTED slabs — and every list built on
            PlayerList.tsx, which is six of them
Seen        "counted $12,880" at 116 points in a 109-point box, at 120% text on
            the thousands night. The clipped end is the figure. Both the name
            and the fact were flexShrink 1, so a row short of room took the
            shortfall out of whichever was longer, and the fact is longer
Expected    the name gives and the figure does not. `ledger.tsx` already states
            that order for its columns — "the name is the one thing in the row
            that may ellipsise" — and it is the same order for the same reason:
            a truncated name is still legible, a truncated stack is a different
            number
Found       3 Sept, by the journey pass, immediately after giving the counted
            slab back its chevron. The chevron and its gap are 17 points and
            they came off the fact
Locked by   npm run check:ui — ui-journeys.mjs's clipped pass, at 120% text on
            all three nights. It found this one unprompted
Status      fixed in this commit
```

**Worth reading beside B41**, which is the other half of the same afternoon: B41
was the wrong sentence on the row, this is the right sentence with the wrong
thing yielding. One fix is per-screen and the other is in the component, and
that is the division the rule draws — the treatment is shared, the fact is the
screen's.

### B41 — the cashed-out slab on Count up said the cash-out twice and clipped it

```
Screen      E2 /count-up, the cashed-out slabs (their own group at the time)
Seen        "13:03 · out CHF2,120" beside the name, with the figure's tail cut
            off: 150 points of text in a 122-point box at 360 and 120% text,
            with the group's book kept in CHF. It clips at 393 too. The line is
            the fact that says what finished them, and what gets cut is money
Expected    a fact that fits. The board says which fact: on Tonight and on the
            cash-out picker it is `23:15 · out $2,120`, and on Count up it is
            `23:15` alone — this is the densest list in the app, three groups
            under a fixed 140-point balance card, and the cash-out figure is the
            one term already implied by the result at the right of the same slab
Found       3 Sept, by the currency pass, applying the mixed player list rule.
            The screen had been built with Tonight's fact on it, which is the
            same slab component and a different amount of room
Locked by   npm run check:ui — ui-currency.mjs, which walks the money screens
            with a three-letter symbol in front of every figure and fails on any
            line that carries money and does not fit. Putting `· out …` back
            takes it red at both widths
Status      fixed in this commit
```

**Same component, two facts, and the board is the thing that knows which.**
`FinishedSlab` takes the fact as a string precisely so the screen decides it:
the rule fixes the treatment, not the sentence. Copying Tonight's fact onto
Count up looked like consistency and was the fault.

⚠ **The fact grew two words on 6 September and the fix still holds.** With E2's
two finished groups merged into one ranked list there is no `CASHED OUT EARLIER`
heading left to carry the meaning, so the row reads `cashed out 10:45` rather
than `10:45` alone. What it still does not carry is the AMOUNT, which is the
whole of this entry: two words and a clock are about 100 points where
`13:03 · out CHF2,120` was 150, and `ui-currency.mjs` measures it on every run.
Putting `· out …` back takes it red exactly as before.

### B40 — Out of balance stated a gap its own two figures do not produce

```
Screen      E5 /settle-up, out of balance — the alert block
Seen        "OFF BY $20" over "$5,000 went in, $2,860 was counted out." The tag
            is right and the sentence is not: $5,000 is everything that went in,
            $2,860 is the final counts alone, and the $2,120 Dana cashed out at
            23:15 is on neither side of it. Read literally the sentence
            describes a $2,140 hole
Expected    two figures from the same side of the cash-outs, and a difference
            that is the tag. It is the one screen whose whole job is naming
            which money is missing
Found       2 Sept, reading the flow for the rework, and still there after the
            merge
Locked by   npm run check:ui — ui-journeys.mjs, "and the sentence names the same
            gap the tag does": it reads both figures out of the rendered
            sentence and asserts their difference is the figure in the tag above
            it. Putting the old pairing back takes it red at all three scales
Status      fixed in this commit
```

**This is the fault the balance block on E2 was rebuilt to remove**, a screen
later. `count-up.tsx` says it in its own header: *it used to read `COUNTED
$2,880 of $2,880` — the count against the chips still on the table. That is half
a sum.* E5 kept the half sum, on the screen where it does the most damage.

The fix is not new copy but a shared source: both figures now come from
`balanceCheck()`, which is what E2 states its equation from, so the two screens
cannot drift apart again.

### B38 — Count up hides half of what it has accounted for

```
Screen      E2 /count-up, the balance block's right-hand sum
Seen        "$2,120 cashed out · $2,…" — the line under ACCOUNTED FOR runs out
            of room and ellipsises the counted figure away. Measured in the
            browser: 192 points of text in a 139-point box, at 393, in ordinary
            dollars, on a $5,000 night. Not a large-text case and not a narrow
            device: it is the default frame on the reference phone
Expected    both halves of the sum readable. The block exists to state the whole
            equation — "a screen that only says BALANCED is not checkable" is
            the handoff's own sentence — and the half that gets clipped is the
            half saying WHAT has been accounted for
Found       2 Sept, measuring the flow for the rework. Two things hid it: the
            route pass opens /count-up cold, where nothing is counted and the
            line is short enough to fit; and the big-night pass could not see it
            at all — see B37
Locked by   npm run check:ui — ui-journeys.mjs, the new "clipped" pass over a
            line of words carrying money. It is red on the old build at all
            three scales and green after
Status      fixed in this commit
```

The half-block gives each figure about 123 points and this line has to carry two
of them plus their words. Both sub-lines are two-line boxes now, at a fixed
height, so the block still never changes size between counting, balanced and off
balance — which is the rule that matters here: entering a stack must not reflow
the list under the host's thumb.

`design/handoff-four-screens/` replaces this line with counts rather than
amounts (`3 counted · 3 cashed out`) and moves the money to a progress line.
That is the better answer and it is not this fix: it redraws the block, and a
bug on the current screen should not wait for a redesign.

### B37 — a line that is mostly words but carries money is checked by nobody

```
Screen      every screen. A hole in the check, not in a screen
Seen        ui-journeys.mjs runs two passes and B31 fell between them. The
            "wrapped" pass skips any run with more than 12 characters of
            non-money text, because that is prose and prose may wrap — the line
            in B31 has 22. The "clipped" pass only measures elements whose own
            text is a bare FIGURE: its pattern allows three non-digit characters
            either side, which is a currency symbol, not a sentence. So a line
            reading "$2,120 cashed out · $2,390 counted" is prose to the first
            and not a figure to the second, and hiding money in it costs nothing
Expected    money that is cut off is reported, whatever words sit around it
Found       2 Sept, working out which check would catch B31 and finding that
            none would
Locked by   itself. The new pass is the check, and B38 is the fault it was
            written against: red on the old build, green on the new one
Status      fixed in this commit
```

**This is the entry that matters of the two.** B38 is one line on one screen; B37
is the reason a green gate said nothing about it, and it would have said nothing
about the next one either. Every figure in this app is drawn beside a word
somewhere.

### B36 — the piggy bank's rule said $184 and the settlement handed it $200

```
Screen      E3 deductions, E6 the settled night, E4 settle up — three screens
            printing one figure two different ways
Seen        on any night with the rounding step on. `E2-rounding.md` rule 3
            snapped every STACK to the step; rule 5 sent the difference,
            Σ rounded − Σ raw, to the piggy bank. So the piggy-bank rule's
            total was 5% of the wins and the money the tin actually received
            was that plus the remainder, and nothing on any screen joined the
            two. On the four-screens sample night: $184 stated, $200 moved.
            The count was being rewritten to make it land, too, so the balance
            block on Count up was comparing money that went in against chips
            nobody had counted
Expected    one figure. Whatever a rule says it takes is what the transfer
            moves and what the record prints
Found       2 Sept, reading the four-screens handoff against the engine — the
            Results screen it draws has no rounding row, which left the gap
            with nowhere at all to be explained
Locked by   npm run check — stacks.test.ts, "never prints a figure another
            screen disagrees with", which asserts at every step that the rule's
            stated total, the collector's final position and the money
            transferred to them are the same number. Plus verify.ts's
            night.rounding.conserved: the moves must sum to zero, so no party
            can absorb a remainder ever again
Status      fixed by changing the rule, not the screens — the step now lands
            the POSITIONS, apportioned by largest remainder across every party
            at once so they still sum to zero. There is no remainder to place.
            design/handoff-four-screens/docs/rounding.md has the derivation
```

**The fix is a rule change and it costs something, which is the honest part.**
Positions must be multiples of the step and must sum to zero, so the collector
has to be one of the parties that moves — leave the tin out and the players
alone would have to sum to −$184, which is not a multiple of $10, and no set of
rounded figures can do it. The tin lands on $190 instead of $184. That trade is
the right way round: a few dollars moving is survivable, two screens disagreeing
is not, and it was the disagreement that produced this entry.

It also gives back the sentence the addendum overruled. *Rounding a count
invents or destroys money* — true, and now nothing rounds a count. `endedWith`
is what was counted, the balance check is exact, and a percentage rule charges a
percentage of what somebody actually won.

### B19 — the night's result hangs out of the player card, and the three figures were never spaced

```
Screen      H4 · T4 · /player, the summary card, once a player is cashed out
Seen        two faults, one drawn and one measured. The row put a fixed 22
            between the first two pairs and pushed the third to the edge, so at
            $500 · $2,120 · +$1,620 the gaps were 22 and 50 — the spacing was
            whatever the figures left over. And on a night in the millions the
            same row put "−$1.2M" at 233.9…330.8 inside a card that ends at
            324, at the reader's text cap: six points of the result outside its
            own card, and twelve at 30/800 before the size came down
Expected    three figures evenly spaced, all of them inside the card, at any
            amount the night can produce and at any text size the phone allows
Found       30 Aug, from the phone — reported as the spacing looking wrong,
            which is the same decision one amount earlier
Locked by   npm run check:ui — ui-journeys.mjs, the new "player card · counted
            out" stop: it cashes Petr out mid-night and measures his card at
            each of the three sizes of table, at 100% and at the text cap.
            Putting either half of the fix back takes it red — the old spacing
            with the new size, or the new spacing at the old 30/800. Plus
            ui-audit.mjs's PARAMS, which opens /player on the seeded night's
            cashed-out player so the three-up state is in the route pass at all
Status      fixed in this commit
```

**The spacing and the overflow are one decision at two amounts.** T4 draws the
row as a fixed 22 between the first two pairs and `margin-left: auto` on the
third. That hands every point of slack to one gap, so what the spacing *is*
depends on how wide the figures happen to be: at the drawn amounts it reads as
a row nobody composed, and at a night's real amounts the auto margin pushes the
result off the card. It is `space-between` with a floor of 8 now — equal gaps
that grow and shrink together, the last figure still ending at the card's edge
rather than past it, and the middle label centred over its own figure.

Spacing alone did not close it. Three figures at 30/800 are 284 points of the
288 a 360-wide phone has inside that card once `moneyMaxFontScale` has let them
grow, which leaves nothing to space them with; the three-up size is 28 now,
which is 14 points back. The two-up figure stays at the board's 32 — the three-up
one was already a different size, so the one that moved is the one that is never
seen beside its own twin. Both deviations are written where they are made:
`StatPair` in `player.tsx` and `statPairValueTight` in the tokens.

**Why nothing saw it.** Three gaps, and the first two are B14's, one route along:

- **The state was not reachable by any check.** `/player` opened bare says
  "Nobody by that name tonight", so the route pass measured one line of copy.
  It is in the audit's `PARAMS` map now, opened on Dana, whom the seeded night
  has already cashed out.
- **The journey never cashed anybody out.** B17's rewrite added Dana's card,
  which is the three-up state at the SEED's figures — $500, $2,120, +$1,620,
  small at every scale, because the rebuys never touch her. The night's own
  figures never reached this card. It now cashes Petr out mid-night for $100,
  which makes the result the whole of what he came in with: the widest of the
  three, at whatever size of table is being played.
- **And it took the text cap to show it.** At 100% the millions card is inside
  its box at either size and either spacing. B18's second pass is what turns
  this one red, which is the argument for that pass in one line.

### B18 — money grew with the phone's text setting; the cards did not

```
Screen      S1 session, T2 player (cashed out), E2 count-up, E2b stands,
            E5 settle-up, X1c settled, 1A/1B stats and games, the nights chart
Seen        two photographs from a real phone. Tonight read "$28,5…" where the
            table was $28,500. The player sheet of somebody who had cashed out
            read "IN FOR $1,500 · COUNTED $3,200 · +$1,7" with the third figure
            hanging off the side of its own card and the word NIGHT above it
            cut in half by the edge of the screen
Expected    the whole figure, or a k/M form of it, inside the card
Found       30 Aug, from the phone, against a run of check:ui that was clean
Locked by   npm run check:ui — ui-journeys.mjs measures every screen TWICE now,
            once at 100% and once at 120% text, and reports what only the
            second pass finds. Against the old build it reports 25 findings
            across the three scales; against the new one, nothing
Status      fixed in this commit
```

**The width was never the problem, and that is why nothing caught it.** Both
photographs are a 393-point phone — the card is 89.7% of the screen in each, and
393 is where a 20-point margin puts it. What was different was the TEXT: every
`Text` in react-native scales with the reader's system text size unless it is
told not to, and there was no `allowFontScaling` and no `maxFontSizeMultiplier`
anywhere in the thirty-seven screens. Meanwhile every card, gap and padding is a
fixed number of points off a board drawn at 402 × 874. The figures grew and the
boxes did not.

Rendering the seeded night at 393 with the font sizes multiplied by 1.2 —
nothing else changed — reproduces both photographs, down to which glyph the
ellipsis lands on.

**The thresholds had no margin to spend.** They had been measured to the point
at 100%, which is the one text size a browser ever renders:

| Slot | Held | Needed | Survived up to |
|---|---|---|---|
| Tonight's headline at 360 | 166 pt | 164 pt for `$99,999` | **101%** |
| The player card's three figures at 360 | 244 pt | 248 pt as drawn | **didn't** |

The player card's row is the second line of that table: it was already over its
own card at 360 at normal text size, before any of this. It had never been
measured, because every run of `ui-journeys.mjs` opened a SEATED player, whose
card carries two figures and an em dash. Three figures only appear once somebody
has cashed out — which is every player by the end of the night, and the card a
host looks at most.

Three things, then:

- **A cap.** `moneyMaxFontScale` in the tokens, spread onto a figure as
  `cappedFigure`, is 1.1 — a tenth is what the narrowest phone has room for, and
  the working is in the comment there. A cap rather than switching scaling off,
  because a reader who needs larger text should get it; the figure stops growing
  at the point where the card can still hold it whole.
- **Thresholds with room in them.** Tonight and Count up go from 100,000 to
  10,000, the two in-and-out lists from 100,000 to 10,000, the player card from
  10,000 to 1,000. The settled sheet's result, the two history headlines and the
  basis of a percentage take one for the first time.
- **A figure never shrinks.** `flexShrink: 0` on the result in four places. The
  name beside it may wrap and a label may ellipsise; a figure may not, and when
  both were allowed to give it was the figure that went — "−$150" came apart
  into "−" on one line and "$150" on the next.

**Why the check could not see it, and what it does now.** It measured at 100%
because that is what a browser does. It now measures every stop a second time
with every font size multiplied — padding, gaps and card widths left alone,
which is exactly what the phone does — and reports only what the second pass
adds. `maxFontSizeMultiplier` is native-only and react-native-web drops it, so a
capped figure would have looked broken at a size the device will never draw it
at; `cappedFigure` carries a `data-fontcap` beside the prop so the pass can
honour the cap. The two are one constant in the tokens for that reason.

**What is still open.** The cap is on the figures this pass measures, not on the
app. Nothing stops a screen that has not been through here from drawing a fixed
box around text that scales, and the general fix — one `Text` wrapper every
screen imports — is an app-wide sweep, which CLAUDE.md says runs alone with
nothing else in flight. It is not this commit.

### B17 — the big-night check had quietly been playing a night in the thousands

```
Screen      none — the check itself, ui-journeys.mjs
Seen        the run printed "every figure fits · 11 screens of a night in the
            millions" while the largest figure it had drawn all run was
            $14,900. Its rebuys were the digits 7000, 2500 and 900, typed on
            the keypad, and the note beside them said the keypad APPENDS them
            to the suggested buy-in — "so these land on top of it and come out
            in the millions, which is the point". The keypad replaces. It has
            replaced since `appendDigits` began resetting on the first key.
Expected    a night whose figures are the size the check exists to catch
Found       30 Aug, running the check and reading what it had drawn
Locked by   itself, now that the amounts are written out in full rather than
            described: SCALES in ui-journeys.mjs names the two nights, and each
            run prints what was on the table and the widest figure it drew, so
            a run that has stopped testing what it says it tests says so on its
            own last line
Status      fixed in this commit
```

**Nothing was broken. The check was passing over screens it never drew.** Every
seven-figure column this file was written to guard — the count-up card, the two
in-and-out lists, the results chips — went unmeasured from whenever that keypad
behaviour changed until today, under a green run each time, and B15 and B16
below are what was sitting behind it the whole while.

The lesson is the one in the comment rather than the code: **the note explained
the behaviour instead of stating the amounts.** `7000` meant a $5,007,000 rebuy
only if you believed the sentence next to it. The scales are written out now, in
dollars, and the run reports the table it actually played.

Three other things came out of the same look, and each was a hole of its own:

- The run started at `/session`, so `/` was never underneath it in history and
  `goBack` walked off the app. **My stats and Sessions had never been measured
  with a real night on them** — both draw a 40-point headline, the widest type
  in the app, off a total that grows with every night played. It now loads the
  club and crosses to Tonight as a route change rather than a second document
  load, which keeps the in-memory database and puts the club back under the run.
- The run counted every stack correctly first time. **E5, "It doesn't add up",
  had never been on screen** — the one screen that states two of the night's
  largest figures in a single sentence. Everyone is now counted with a hundred,
  which lands on E5 by design, and the run reads the difference off it.
- It ran at 393, the phone the boards were drawn at. **Every fault below is
  invisible at 393 and plain at 360**, which is the narrowest device in the
  matrix and the one the route pass has been running at since B3. This runs at
  360 now.

### B15 — Count up's total wrapped, and squeezed "ALL IN" into two characters

```
Screen      E2 count-up — the COUNTED card
Seen        at 360 on a table past six figures, "$2,352,880 of $2,352,880" did
            not fit the card's one line: the target dropped underneath the
            count and the label beside them broke into "ALL" over "IN". At
            $239M it is the same picture with wider figures. Nothing clipped —
            the box simply grew — so every check in ui-journeys.mjs passed over
            it, all three of which ask about width
Expected    one line, whatever the table is worth: 280 points inside the card
            at 360, less 12 of gap and 51 for "5 TO GO", is about 217, and the
            pair costs 195 at "$99,999 of $99,999" and 221 at six digits
Found       30 Aug, in the screenshots of the run B17 repaired
Locked by   npm run check:ui — ui-journeys.mjs, "wrapped", which is a fourth
            question the file now asks: a money slot may not fall onto a second
            line. Against the old build it reports the card at both the
            millions and the ceiling scale; against the new one, nothing
Status      fixed in this commit
```

Both figures take `formatToFit` at 100,000 — the same threshold S1's money card
uses, for the reason written there: abbreviating one of a pair and not the other
puts "$2.4M" beside "$2,352,880" in one card and reads as two scales rather than
two sums. **No precision is lost by it.** The exact difference is what this card
is for, and it is stated to the unit one screen along: a night that does not
balance says "OFF BY $2,352,380" on E5.

**Why nothing saw it.** The three checks in `ui-journeys.mjs` all measured
width — clipped, off-screen, out of its box — and a wrap is what happens when a
box is allowed to grow instead. A slot is told from a sentence by what is left
when the figures are removed: twelve characters or fewer ("of", "in · out",
"Rebuy") is a slot, and anything wordier is prose, which is allowed to wrap and
mostly mentions money.

### B16 — a result split down the middle on the two in-and-out lists

```
Screen      E5 settle-up (out of balance) and E2b stands — the counted rows
Seen        at 360 on a seven-figure night, "−$1,201,400" broke across two
            lines inside its own cell, and the line under the name went with
            it: "in $1,201,500 · out" over "$100". On E5 the row is tighter by
            an avatar and a chevron, so it went first
Expected    a figure on one line. A number split in half is the thing this
            app's format helpers exist to prevent — "−$1,201," over "400" is
            not a shorter way of writing −$1,201,400, it is two other numbers
Found       30 Aug, by the "wrapped" check above, on the first run that reached
            E5 at all
Locked by   npm run check:ui — ui-journeys.mjs, "wrapped". Against the old
            build E5 reports six findings at the ceiling scale and two at
            millions, and stands one; against the new one, nothing
Status      fixed in this commit
```

`ROW_FITS` is 100,000 on both screens, and it is E5's number on both: about 208
points are shared by the in-and-out line at 13/400 and the result at 18/700,
which holds "in $99,999 · out $99,999" beside "−$99,999" and does not hold six
digits. Stands is the roomier of the two and could have carried a higher one —
it takes E5's anyway, because they are the same six rows a host reads twice
within a minute, and a table that abbreviates on one and not the other reads as
a figure that changed rather than a column that is narrower.

### B14 — B3 again, on the share sheet, for a week after B3 was fixed

```
Screen      /share — the preset row, opened by tapping any figure on E3
            Deductions
Seen        at 360 the word "Custom" runs 257.69…320.97 inside a padding box
            that ends at 263.66…314.98: six points out of the left of its
            button and six out of the right, touching the rounded edge on both
            sides. Both themes. The captions — BY THE RULE, NOTHING, SET — sat
            on the ground below the chips rather than inside them.
Expected    the board's chip, the same object /log already uses: the figure
            over its caption, on a raised surface, choosing it swaps the fill
Found       29 Aug, reported from the phone
Locked by   npm run check:ui — ui-audit.mjs, "label-out-of-its-control", with
            /share now opened WITH ITS PARAMS (the new `PARAMS` map) so the row
            is on screen when the pass runs; and ui-journeys.mjs, which now
            taps a charge on Deductions and measures the sheet on a night in
            the millions
Status      fixed in this commit
```

**This is not a new bug. It is B3, in the second of the two places B3 lived.**
B3 rebuilt the chip in `log.tsx`, wrote down why, and left `share.tsx` on the
shape it had just replaced — same `Button variant="preset"`, same 24 points of
padding a side, same word coming out through both sides of its own button. The
measurement above is B3's measurement, to the hundredth of a point, on a
different route eight days later.

So the fix is not the chip a second time. The chip is now
`apps/mobile/src/components/Preset.tsx` and both screens draw it, which is the
only version of this fix that cannot half-land again. A copied component is a
bug with a delay fuse: `docs/screens.md` even recorded the divergence — *"/share
still has the older shape and the same 24"* — and recording it is not the same
as it being anybody's next job.

**Why nothing saw it.** `/share` has been in the audit's `ROUTES` since B2 put
it there, and the pass has been opening it at `/share` with no arguments the
whole time. The sheet needs to be told which rule and which person; without them
it renders its empty fallback — a titled sheet with no body — and every check
passes over it, because a sheet holding nothing holds nothing wrong. Seventeen
route-passes' worth of green over a screen whose body was never built.

Two things close it, and the first is the one that matters:

- `ui-audit.mjs` now carries a `PARAMS` map, and `/share` is opened at
  `?rule=kitchen&player=seed-lena` — the seeded night's own bill and somebody it
  charges. Against the old build the pass reports the finding twice, once per
  theme, at 360; against the new one, nothing. Any other screen that is nothing
  without its arguments gets a line in that map.
- `ui-journeys.mjs` now taps a charge on Deductions, which is how a host reaches
  this sheet, and measures it with the big night's figures on it. It is the only
  path to `/share` that has a real night behind it — the browser build keeps its
  database in memory, so no URL can carry one.

### B13 — the phone's own figures were filed under somebody out of the design

```
Screen      not one screen — home's "What you paid", E6's You row, G4 My stats,
            and every control useIsAdmin draws
Seen        the app opens with the host being Marek, a name out of the handoff's
            canonical night. Saying "this is me" on the roster changed the
            roster and nothing else: the night went on attributing the host's
            buy-ins and their result to the seeded guess, My stats stayed empty,
            and the host lost the write controls on their own live game
Expected    the host is themselves, by name; and saying so once moves whose
            figures are called yours on every table still running
Found       29 Aug, on the phone
Locked by   npm run check — hostSeat.test.ts, "never overwrites a name the host
            chose" and "never rewrites a night that is settled"
Status      fixed in this commit
```

Two halves, and the second is the one that had teeth.

The **name** was a seed problem. `sampleNight` has to stamp `meId` onto
somebody, and it stamped the canonical night's Marek — so a screen could be held
against the frame it was drawn from, which was worth doing and was never meant
to be the answer a person read. `hostSeat.ts` gives that seat the host's name
instead, keeping the id, and repairs the roster's copy of the row once. Keeping
the id is the whole trick: a fresh one would have stranded the club_member row
beside the night's and put two of the same person in the group.

The **standing** was a correctness problem. `useIsAdmin` asks whether the club's
admin *is* the night's `meId`, and `makeAdmin` only ever moved the first of the
two. So the one control in the app for saying who you are put the two answers
out of step, and out of step means not admin — the host tapped their own name
and the app stopped letting them record a buy-in. `makeAdmin` now moves both.

`CLAIM_LIVE_NIGHTS` stops at a settled night on purpose, the same line
`renamePlayerInPlay` draws: a result already filed under a seat stays filed
there. That is a real limit and not an oversight — a host who names themselves
after settling a night keeps that night's result on the old seat, and the honest
fix for it is the ledger's own, not a rewrite of the book.
### B5 — a night forgot the group's rounding the moment it was reloaded

```
Screen      not a screen — startNight, and every settlement figure downstream
Seen        a group that settles to tens opens a night; the night settles to
            tens until something reloads it from SQLite, and to whole dollars
            for ever afterwards. The server's copy said whole dollars from the
            start: `queueSessionOpen` has carried `roundingMode` since the
            server half landed and its only caller never passed it.
Expected    the night settles at what the group set, tonight and on next
            launch, on this phone and on the server's copy of it
Found       22 Aug, reading the INSERT while adding the stakes beside it
Locked by   nothing yet — see below
Status      fixed in this commit
```

M7 is explicit that rounding **changes computed amounts, not just formatting**,
so this is a money bug and not a display one. `startNight` put the mode on the
in-memory night and left it out of the row it wrote, and the mapper at the other
end reads `rounding_mode` off that row: correct all evening, wrong on the next
launch, and wrong on the server from the first second.

**Locked by nothing yet, and the field says so on purpose.** The three screen
tools cannot see it — nothing is cut off, no rule is broken, the screen is
right. What would see it is a test over `startNight` and `openNightById`
together, and there is no harness for either: they are the two functions in
`nightStore` that need a real `expo-sqlite`, and every test in `src/lib` today
is over a pure module. That harness is worth building and is a bigger job than
this fix.

### B4 — O1 shipped without the first row the board draws

```
Screen      O1 New session — /new-night, *The game*
Seen        four rows: Default buy-in, Currency, Start time, Money rules. The
            board draws Stakes first, "$5 / $5", with a chevron. Home told
            hosts "You'll set the buy-in and blinds once, here" and there was
            nowhere on the screen to set a blind.
Expected    the drawn row, reading the same three layers as the buy-in beside
            it — this game → last game → club default → app default
Found       22 Aug, checking the screen against the board
Locked by   npm run check:ui — ui-audit.mjs, "drawn-row-missing"
Status      fixed in this commit
```

The row was not forgotten. It was flagged out, in a comment on the exact line it
belonged on, because rev 18 § 5.2 adds `stakes { small, big }` and the straddle
to the Group and none of it was built: *"drawing the row against nothing would
be a control that forgets what you tell it."* That was the right call in the
moment and it is why this is a design bug rather than a careless one.

What made it a bug anyway is that the flag outlived its reason. The comment was
addressed to whoever built the group settings; nobody did, and meanwhile home
started promising the blinds could be set here. A flag is a note to a future
session, and a note nothing can read out loud is indistinguishable from a screen
that is simply wrong.

**Why nothing saw it.** Every check in this repo asks whether what is on the
screen is correct. The frame check measures the panel, the sheet pass measures
its height, the rule pass measures contrast and overflow — and a screen missing
a row passes all three, because everything still on it is perfectly correct. The
new `DRAWN` pass in `ui-audit.mjs` asks the other question: are the words the
board puts on this screen on it. Removing "Stakes" from O1 now takes it red at
both widths and both themes, which was checked by doing exactly that.

### B3 — "Custom" hangs out of both sides of its own button on the amount sheet

```
Screen      /log — the preset row on N5 buy-in, N6 rebuy
Seen        at 360 the word runs 257.7…321.0 inside a padding box that ends at
            263.7…315.0: six points out of the left of its button and six out
            of the right, touching the rounded edge on both sides. At 375 the
            same, smaller. The caption under it — STANDARD, X2, SET — sat on
            the ground below the chip rather than inside it, and the figure was
            17px where doc 10's type scale says 16.
Expected    the board's chip: one object, the figure over its caption, on a
            raised surface, and choosing it swaps the fill
Found       22 Aug, reported from the phone; measured at 360 and 375
Locked by   npm run check:ui — ui-audit.mjs, "label-out-of-its-control", and
            the route pass now runs at 360 as well as 393, which is the half of
            the lock that actually matters here
Status      fixed in this commit
```

Three faults, and the one that breaks the screen is **B2 again**. `Button` pads
24 a side, which is right for a button carrying a sentence and four times too
much for a third of a sheet: a slot at 360 is 101 wide, so 24 a side leaves 53
points for a word that needs 63. Same 24, same shape of failure, a different
screen — and it is fixed the same way B2 was: here, not in `Button`, where the
24 is correct for every other caller.

The other two came from the same decision. The row was a `Button` with a caption
printed underneath it, and the board draws no such thing: it draws one chip
holding the figure over its caption, on a raised surface, and choosing it swaps
the fill. Built as the board draws it, the caption is inside the chip, the
figure is at doc 10's 16, and there is no padding left to overflow.

**Why nothing saw it.** Two gaps, and both are now closed:

- `figure-out-of-its-box` — the check that caught B2 — only looks at FIGURES,
  because the doctrine it was written for is that a truncated number is a lie.
  "Custom" is a word, so the check skipped it. `label-out-of-its-control` asks
  the other question: does any label, figure or not, stay inside the padding box
  of the control drawn around it.
- The route pass only ever ran at 393, where "Custom" fitted **by half a point**.
  The note at the top of `ui-audit.mjs` already said what was wrong with that —
  "a figure that fits at 393 can still be cut at 375" — and left it to whoever
  remembered to export `UI_AUDIT_WIDTH`. Nobody did. It now runs at 360 too,
  every time, because a check that only goes red at a width it never runs at is
  not a lock.

Against the old build the new pass reports the finding twice, once per theme.
Against the new one, and across all 37 routes at both widths, zero.

### B2 — the "100s" chip is drawn outside its own box on Rounding

```
Screen      /rounding, the six-up chip row
Seen        the label 3.6 points wider than the chip holding it, both themes —
            a chip whose word touches its neighbour's
Expected    the label inside its box
Found       22 Aug, by ui-audit.mjs, the first time it ever ran on this screen
Locked by   npm run check:ui — ui-audit.mjs, "figure-out-of-its-box"
Status      fixed in this commit
```

`Button` pads 24 a side, which is right for a button with a sentence on it. This
row has six chips: at 393 a slot is about 52 wide, so 24 a side leaves 4 points
for a word that needs 38. Fixed in `rounding.tsx` rather than in `Button`,
because the 24 is correct for every other caller.

**The interesting part is not the bug, it is that it was invisible.** `/rounding`
and `/share` arrived with the rounding work on 20 August and were never added to
the audit's `ROUTES`. The sheet session added them to `SHEET_ROUTES` a day later
— so their heights were measured and nothing else about them was — and the audit
went on printing a clean pass over 35 of 37 screens, which looks exactly like a
clean pass over 37. Both are in `ROUTES` now, and the count at the top of
`docs/screens.md` is what catches the next one.

### B1 — sheets came up at heights nobody had chosen

```
Screen      all 21 sheets
Seen        some short, some tall; the tall ones with their own grabber and
            title behind the Dynamic Island
Expected    a top edge at the cap the boards draw — safe-area inset + 21,
            which is 80 on the reference phone
Found       21 Aug, testing on the phone
Locked by   ui-audit.mjs sheet pass — 21 sheets across 6 devices; and
            Sheet.geometry.test.ts, which pins both constants inside
            npm run check and reads them back out of the audit script so the
            tool and the app cannot drift apart in silence
Status      fixed in 1bf738f
```

This one is the worked example, and not because the fix was clever. It is
because of the sentence in its own commit message:

> AND A TEST, because the reason this survived is that nothing could see it.

Twenty-one screens were wrong, on every phone, from the beginning. Nobody was
careless. The fault was simply outside what anything ran — no test covered a
screen, and the browser reports no safe-area insets, so even the tools that did
exist measured the cap at 21 instead of 80 and passed. It took standing a fake
safe area up before the bug became visible at all.

Against the old build that new pass reports 52 findings. Against the new one,
zero. That is the difference between a fix and a fix that holds.

`docs/sheet-heights.md` has the full derivation, including the two places doc 15
disagrees with itself.
