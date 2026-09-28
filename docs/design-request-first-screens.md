# Prompt: the first screens — your groups, starting one, the plan gates, and the intro

**Why this file exists.** The screens a person meets before any group exists
are the least drawn part of the product. Rev 18 names a **Welcome** in one
clause and draws it nowhere; the first-run card H1 is built and unreachable
because a fresh phone opens on the demo night (`docs/first-run.md` traces it);
the groups list GR2 is a row in Settings that nobody would look for; and every
plan gate the app has is behind a seam that answers *yes* to everybody, so no
phone has ever shown one. The owner's ask, 28 September: the first thing a
person sees is **the groups they were added to** and **a way to start one of
their own**; every feature that needs a paid membership, or has a limit that
depends on the tier, **checks the plan at that moment and offers the upgrade**;
and an **intro** that shows the app running a night — setting up, in play,
after the game — as three or four short screencasts a person slides between.

Paste the block below into the design tool. The section before it is for
whoever applies the result: what is built, what is decided, and the two places
the vocabulary is still split.

## What is decided, and where it is written

- **Tiers: Free / Regular / Full**, the owner's call of 26 September
  (`docs/pricing-model.md` banner, `design/handoff-game-admin/README.md` § 1).
  Free is $0: tonight, and the last three games. Regular is $2.49/mo: every
  night in the book, and one host night per billing period. Full is $9.99/mo:
  runs a game any night. **Free can never run a game.** Settlement is identical
  on every tier; watching and claiming a place are never gated.
- **The plan is the host right.** `0018_accounts.sql`, on `main` since 25
  September: a group (a *book* on the server) can only be **created** by an
  account whose plan is not free. Only created — a group that exists keeps every
  write whatever happens to the plan, and a lapse never stops a running night.
- ⚠ **The server says `free / pro / club`; the screens say Free / Regular /
  Full.** `my_plan()` answers the former, `membership.ts` the latter, and the
  mapping between them is the open question in `docs/screens.md`. The brief
  uses the screen names. Nothing the designer draws should depend on how the
  server words it.
- **The plan list rule (X2b, S85, rule 17):** every list of plans is ascending,
  the reader's own plan first, drawn as already theirs — muted, outline check,
  `INCLUDED` — and **nothing paid is ever pre-ticked**. The gate for a Regular
  whose host night is used (state 15) is the one licensed exception.
- **A person is in a group only once they have claimed a place** — a
  ten-character code or link from the host (`docs/player-identity.md`,
  `docs/accounts-and-groups.md`). A name the host typed is a row in the host's
  book and reaches no phone. So "the groups you were added to" is the list of
  claimed seats, and the moment of being added is X2b, which is drawn.
- **The word on screen is *group*.** The product is The Poker Club and the code
  says `club` everywhere, but every board and every built string says group —
  *Your groups*, *New group*, *Hosted by*. The brief keeps that; reintroducing
  *club* as the noun is an app-wide sweep and the owner's call, not a board's.
- **On iPhone the app cannot sell a plan with its own codes** (Apple 3.1.1).
  Any gate that offers an upgrade has an iOS version and an Android/web
  version. This was already in the game-admin prompt and stands.

## What is built, so the boards can start from it

| Screen | Route | State today |
| --- | --- | --- |
| Home, one group (GR1 / H1–H9) | `/` | Built and held against its handoff (`docs/home-handoff.md`). The fresh state — *Start the first session*, the `waiting` rows — is built and never reached on a phone, because the demo night is seeded first. |
| Your groups (GR2) | `/groups` | Built: name, `N players · USD` or *a night is running* in green, a standing pill (admin / member / name only), chevron; primary **New group**; empty line *No groups yet. A group needs only a name to exist.* Reached only from Settings. |
| New group (GR3) | `/new-group` | Built: one sheet, three steps replacing their own content — *Name and currency* → *The money side* → *Who is in it* — with *Skip · defaults are fine* and *Add players later*. No gate in front of it. |
| Claim a place (X2a–X2d) | `/claim`, `/invite` | Built and drawn. X2b's plan offer is drawn (S85) and not built. |
| The plan gate (states 13–15) | `PlanGate.tsx` | Built against the game-admin board, unreachable while the seam answers Full for everybody. |
| Plan on Settings | `/settings` | A *Plan* row reading `Free` / `Pro · founder` / `Club · until 3 Mar 2027`. Copy not drawn, and it prints the server's words. |
| Welcome | — | Drawn nowhere, built nowhere. |
| Intro | — | Nothing. The only animation specified anywhere is E2's counted-stack sequence (`design/handoff-count-up-header/README.md` § Animation), which is the motion vocabulary the intro should extend rather than replace. |

The demo seed is the canonical night — seven names, $5,000 on the table, the
figures in `design/handoff-rev18/docs/13-after-the-night.md` — and it is what
every board was drawn from. The intro should play **that** night, so each of
its frames can be held against a board and the app's own seed.

---

```text
I need boards for the first screens of the poker cash-game ledger app: what a
person sees before and between groups, how they start a group of their own,
how every plan gate and every tier-dependent limit reads at the moment it is
met, and an intro — three or four short screencasts, slid between — that
shows the app running a night. Several screens are touched; draw each state
listed below.

Work inside the existing system — Style Guide v2, rev 18 geometry, the six
boards, the navigation rules in 09-navigation.md (a PUSH has a round back
button and nothing top-right; a SHEET has a grabber and a close; they never
mix; a multi-step flow replaces one sheet's content). Do not introduce a
colour, a radius, a type size or a component that is not already in the
system. If a state seems to need one, say so instead of inventing it.

Draw every board at 393 × 852 in light and dark, and check each at 360 wide:
nothing may truncate or wrap mid-word at 360. Write every string. Mark any
string you are unsure of rather than leaving it to the build. Copy is final
once it is on a board, so where a string exists already (listed under COPY)
keep it or say why it changed.

## THE PRODUCT, IN FOUR SENTENCES

A home poker game's ledger. One phone records the night — buy-ins, rebuys,
cash-outs, the count at the end — and the app works out who pays whom.
Everyone else at the table can watch the night live on their own phone, and
the nights add up into a book the group keeps. Only one phone ever records a
night at a time; that is what keeps the money right.

## WHO ARRIVES, AND WHAT THEY HOLD

Three different people open the app for the first time, and today none of
them is met by a first screen of their own:

  Host      fresh install, no link. Holds nothing. Will start a group. The
            overwhelmingly common case, and the one the app is for.
  Member    holds a ten-character code or a link from a host. Claiming it
            (X2b, drawn) puts them in that group: their name, their nights.
            They never type an email. Most of them will never host.
  Watcher   holds a share link for one night. No account, no group, read-only.

A person is IN a group only once they have claimed a place in it. A name the
host typed into the book is a row on the host's phone, not a group on anybody
else's. So "the groups you were added to" is exactly the list of places you
have claimed — and the same phone can be the admin of one group and a member
of two others.

The book lives on the phone. A group works with no signal and no account; the
server gets a copy the first time something needs it (an invite, a share
link). Members and watchers are anonymous accounts; only a host ever has an
email.

## PLANS — THE RULES THE GATES EXIST FOR

A plan sits on the person, not the group, and follows them everywhere.

  Free      $0         watch any night over a link; claim your place in a
                       group; see tonight and the last three games
  Regular   $2.49/mo   every night in the book, missed ones included, and
                       ONE night as host per billing period (renews)
  Full      $9.99/mo   everything in Regular, and runs a game any night

Some people are Full without paying — founders, and friends given a plan by
hand or with a promo code. They are Full in every way that matters here.

What the plan decides, and nothing else does:
  - STARTING A GROUP needs a paid plan. Free cannot.
  - OPENING A GAME, or being passed one: Full always; Regular while this
    period's host night is unused; Free never.
  - HISTORY: Free sees tonight and the last three games; the rest of the
    book is there and named, not shown.
  - Nothing else. There is no cap on groups, players, watchers or nights, and
    no feature of the money is paid. If a screen you draw seems to want a
    further limit, flag it as a question — do not draw it as decided.

Rules already decided, which the boards must not contradict:
  - A lapse never stops anything that is running. The check guards TAKING
    (starting a group, opening a game), never running or reading.
  - Watchers and players never pay to watch or to see their own place. A
    paywall never appears to somebody who is only watching.
  - Settlement is identical on every plan. Accuracy is never a paid feature.
  - Every plan list follows X2b's rule: ascending, the reader's own plan
    first drawn as already theirs (muted, outline check, INCLUDED), nothing
    paid pre-ticked, so the primary starts disabled. State 15 on the
    game-admin board breaks it once, deliberately; say if any gate here must.
  - On iPhone the app cannot sell or unlock a plan with its own codes (Apple
    3.1.1): an upgrade on iOS is the App Store purchase; a promo code is
    redeemed on the web. Draw the iOS and the Android/web version of any gate
    that offers a code.
  - A gate says what the person tapped and what Free already includes,
    never that they did something wrong. Nobody can buy a plan for somebody
    else.

## PART A · THE ROOT — YOUR GROUPS

Today Home is one group's home (GR1), and Your groups (GR2) is a push behind
Settings. The owner wants the groups a person belongs to to be the first
thing they see, and the way to start their own beside it. Decide the shape:
a list that is the root, with each group's home behind it; or one group's
home with the switch at the top (rev 18's S97 named "the group switch at the
top of home" as the next design task and it was never drawn). Draw whichever
you choose, and the other in one frame with a note on why not.

Draw the root in these states:
  A1. Nothing. A fresh install, no group, no link. This is where the intro
      (Part D) lives, and under or after it: Start a group, and the two
      quiet lines for the other arrivals — I have an invite code · I've got a
      watch link. The sentence the product is defined by belongs here or on
      A5, and nowhere else: "You are the host. The host keeps the book: only
      you can log buys, close a night and settle it. Everyone else reads."
  A2. One group, and this phone is its admin. Say whether the list still
      shows or the phone lands on that group's home directly.
  A3. One group, and this phone is a member in it (arrived by claiming).
      They cannot start a game here; say so without a greyed control — a
      power the reader does not have is removed, not disabled.
  A4. Several groups: admin of one, member of two, and a night running in
      one of them right now. The running night is the loudest thing on the
      screen. The row says the person's standing in each group, because the
      same person is a different thing in each one and which they are about
      to become matters before they tap.
  A5. Start a group, tapped by a Free account: the gate (Part C, C1).
  A6. Start a group, tapped by an account that can: what it opens (Part B).
  A7. The root with no signal. The plan cannot be read, and the groups on the
      phone are still there. Say what the start row does when the app cannot
      ask whether this person may.
  A8. A group the person left, or was removed from: is it a row, a line, or
      gone? (Proposal: gone, with the footnote rev 18's G1 already wrote —
      "You see a group's book only while you are in it. Leave, and it closes
      behind you." — under the list.)

Each group row needs: the name; the standing (admin · member · name only is
not possible here, since a name-only person has no phone); something of the
group's life (players, last night, a running night); and the currency if the
phone holds groups in two. No chevron rule is yours to decide, but the
session-views cut removed chevrons and rules-between-rows on its screens and
the reason travels.

## PART B · STARTING A GROUP OF YOUR OWN

New group is built as one sheet in three steps — Name and currency · The
money side · Who is in it — and every step after the first can be skipped.
Keep that shape unless the root changes what it needs; the two things it
has never had are drawn here:

  B1. The step before it, if any: what the person is told a group is before
      they name one. Rev 18's G2 says "the explanation that a new group
      carries nothing over is part of the screen, not a tooltip". Decide
      whether that sentence is on step one or is the whole of a step zero.
  B2. Step one as it stands — GROUP NAME, currency — with the sentence above
      it drawn.
  B3. The last step's confirm: Create {name} · Add players later.
  B4. Created: where the phone lands. The proposal in docs/first-run.md is
      the table (O1, empty roster) rather than an empty home, because the
      group's real roster is the people sitting down. Draw that landing, or
      argue for the home.
  B5. Creating a group with no signal. The group exists on the phone at once;
      the server learns of it later. Nothing needs to be said unless the plan
      could not be checked — then this is A7's answer, again.
  B6. The server refuses it. The phone thought the person could start a
      group and the server said their plan does not allow it (a plan that
      lapsed since the phone last asked). One line, and the gate.

## PART C · THE PLAN GATES AND THE TIER LIMITS

One gate, drawn once, with a slot for what was tapped. States 13–15 on the
game-admin board (26 September) are the gate for OPENING A GAME and are
built; draw these as the same object so the build has one sheet, not four.

  C1. Free starts a group. Title names the act. Body: what Free includes,
      what starting a group needs. The plan list: Free INCLUDED, Regular,
      Full. Primary "Choose a plan to start a group" (disabled until picked),
      secondary "Not now". iOS and Android/web versions.
  C2. Free opens a game — state 13, for reference beside C1, so the two read
      as one family. Do not redraw it; place it.
  C3. Regular, host night used, starts a game — state 15. Same: place it.
  C4. Regular, host night free, starts a game — state 14's note on O1. Place
      it. Then the same question for starting a GROUP: does a Regular's
      first group cost anything? (Decided: no. A group is not a game. Say so
      on the board if a Regular could think otherwise.)
  C5. THE HISTORY LIMIT. A Free member opens the group's sessions list
      (Sessions) and there are eleven nights in the book. Three are
      shown. Draw the line after the third: it names how many more there
      are and what shows them, and it is one line, not a card. The same for
      My stats when the figures would include nights they cannot see: does
      the total count all eleven, or the three? (Proposal: all eleven, with
      the sentence "Free shows the last three" under it, which is X2b's own
      sentence.)
  C6. The plan on Settings. Today one row reads Plan · Free / Regular /
      Full, with "· founder" or "· until 3 Mar 2027" after it, and it goes
      nowhere. Draw the row, and what it opens: the same plan list, the
      reader's own plan INCLUDED, a way to change it (iOS: the store;
      Android/web: the store or a code), and the renewal date where there is
      one. A founder's row says so and offers nothing to buy.
  C7. Lapsed. The plan ended and the phone knows. Where it shows: the
      Settings row, the root's start row ("Your Full ended on 25 Sep · renew
      to open one" is state 16's UNSURE line; write the real one), and
      nothing on any running night.
  C8. The upgrade succeeded. The gate was a sheet; what replaces its content
      — and does the tapped act (start the group, open the game) now happen
      without a second tap? (Proposal: yes; the primary was "Choose a plan
      to start a group", so the group is started.)
  C9. The upgrade failed or was cancelled in the store. Back to the gate with
      one line, nothing lost, nothing charged.
  C10. A Free account is passed a game — no, it cannot be (the pass sheet
      already says "Free · can't run a game" on the admin's phone). But a
      Free account whose friend used Ask (state 5's share) opens the app from
      that message: what do they land on? (Proposal: the root, with the gate
      naming the game they were asked to take.)

## PART D · THE INTRO

Three or four screencasts, slid between, that show the app running a night.
They play on A1 — the fresh phone — and are reachable afterwards from
Settings (proposal: a row reading "See how it works"). They are not a video
of a mock-up: each is the real screens, in the real chrome, played through
by a script, so both themes come free and the intro stays true as screens
change. Tell me if a beat needs something the screens cannot do.

The night they play is the app's canonical night, which every board was
drawn from and the app is seeded with: The poker club, seven names — Dana,
Marek, Lena, Tomáš, Ivo, Petr, Radka — $5,000 in, Kitchen & drinks $170
fronted by Marek and Lena, a piggy bank of $126, six transfers. Marek is the
host on every board; on a phone the host's seat carries the phone's own
name, so the intro says Marek and the build substitutes. Its figures
are in design/handoff-rev18/docs/13-after-the-night.md and must be used as
written, so a frame of the intro can be held against a frame of a board.

The principle: a natural interface, and the process visible. The person
must SEE the tap, SEE the row appear, SEE the figure change — the ledger is
the product and it is the thing being demonstrated. That means slower than
a real host would tap, a caption per beat saying what just happened in the
house voice, and figures at a size that reads on a 360-wide phone. Nothing
is sped up with a cut: if a figure changes, the change is on screen.

  D1. SETTING THE GAME. New group named (The poker club, USD) → O1 New
      session: six people seated with their buy-ins typed in place, the
      standard buy-in, the money rules line (Kitchen & drinks · Group piggy
      bank) → Open the table · 20:05. Ends on Tonight, resting, the card
      reading the table.
  D2. IN THE GAME. Tonight, live: a rebuy (Lena, her second $500), a cash-out
      (Dana leaves at 23:15 with $2,120), a shared expense (Kitchen &
      drinks), each landing in the feed with its time and moving the two
      sums — On the table, Total in play. Beside it, or after it, the same
      night on a watcher's phone: the WATCHING role line, the feed in second
      person ("You bought in"), no dock — so the person sees that the table
      is one ledger read by many phones.
  D3. AFTER THE GAME. End this poker night (the hold) → Count up: stacks
      counted one by one, each row animating into its rank slot exactly as
      the count-up-header handoff specifies (620 ms, the FLIP below it, the
      green fill releasing), the headline gap closing to $0 → Deductions:
      the bill split, the piggy bank → Who pays whom: six transfers → the
      settled night: three figures, the terms line under each name.
  D4. (optional) THE BOOK. Nights adding up: Sessions with three nights,
      My stats with a figure, the group's players with their all-time nets.
      Include it only if it earns its place; three screencasts that land is
      better than four that drag.

For each screencast I need a storyboard: every beat as a frame, with the
screen it is on, the action (where the tap lands), the figure or row that
changes, the caption, and the duration of the beat and of the transition —
the same timing-table form the count-up-header handoff used. Say what the
whole runs to; the owner's instinct is that each screencast is under 25
seconds and the person can leave at any moment.

Also decide:
  - The chrome around a screencast: how a person knows there are three or
    four, which one they are on, and how they skip. Dots, a segmented bar,
    a caption strip — inside the system.
  - Whether it plays automatically on A1 or waits for a tap. (Proposal:
    plays; A1 has nothing else to show, and a person who wants out swipes.)
  - Whether the phone frame is drawn inside the screencast (a phone within
    the phone) or the screens play full-bleed with the caption over them.
  - Reduce Motion: what remains. The count-up handoff's rule is that the
    fade stays and the travel goes; the same rule should hold here, and a
    person with Reduce Motion should still see every figure change.
  - The end of the last one: what it lands on — the two lines for the other
    arrivals must be reachable from there without going back through it.

## OPEN QUESTIONS — ANSWER THEM ON THE BOARD

  - Is the root a list of groups, or one group's home with a switch at the
    top? (Part A asks for both; I want your recommendation and its reason.)
  - Does a phone with exactly one group ever see the list?
  - When does the app first ask the host to sign in? The build's answer is
    "the first thing that needs the server" — an invite or a share link —
    and starting a group needs a plan, which needs an account. Where in Part
    B does the email get asked for, if anywhere, and what does a person with
    no plan and no account see on A1's Start a group?
  - Does the demo night survive on a phone at all, once A1 and the intro
    exist? (Proposal: it becomes the intro, and Settings gains "See how it
    works" in place of a seeded group.)
  - Is Free's history limit counted in nights the person played, or nights
    the group played? The build has no answer.

## WHAT TO HAND BACK

One board per state above, light and dark, with every string written and
every dimension, weight and colour inline on the element so it can be
copied rather than re-derived — the format of the game-admin handoff (an
HTML board with its README, states numbered as here). The storyboards for
Part D as frames with the timing table. A short note per open question. Flag
anything in this brief that the existing boards contradict — the boards win
on layout, but I want to know.

## WHAT I AM NOT ASKING FOR

Any change to Tonight, the ending flow, the pass sheet or the settled night —
the intro plays them as they are. No new tokens, no change to the sheet
object or to the navigation vocabulary. If a screen here makes you want to
change one of those, say so separately; an app-wide change runs on its own,
with nothing else in flight. And no strings for the server's own plan words
(pro, club): they are not on any screen.
```

---

## Copy the build currently shows on these screens

Every string below is what is on a phone today. Those marked *drawn* come
off a board and should survive; the rest were written at the keyboard and are
the ones to replace.

| Where | String | Source |
| --- | --- | --- |
| Home eyebrow | `Your group` · `Hosted by {name}` | drawn (home handoff) |
| Home start row, fresh | `Start the first session` | drawn (H1/H5) |
| Home start row | `Start a session` | drawn |
| Home lapsed line | `Your membership ended · renew to open one` | mine — state 16's line needs a date and a tier the seam has not got |
| Your groups | `Your groups` · `New group` · `a night is running` · `{n} players · {currency}` · pills `admin` / `member` / `name only` | rev 18 GR2 |
| Your groups, empty | `No groups yet. A group needs only a name to exist.` | mine |
| New group | `New group` · subs `Name and currency` / `The money side` / `Who is in it` · `GROUP NAME` (placeholder `The Thursday game`) · `STANDARD BUY-IN` · `ADD BY NAME` (placeholder `Their name`) · `Next` · `Skip · defaults are fine` · `Create {name}` · `Add players later` | rev 18 GR3, restructured 12 Aug |
| The gate (state 13) | `Open a game` · `Running a game takes a paid membership. Watching, and your place in the group, stay free.` · Free `$0` `Tonight, and the last three games.` · Regular `$2.49 / mo` `Every night in the book, the ones you missed included, and one night as host each month.` · Full `$9.99 / mo` `Everything in Regular, and you run games as often as you like.` (UNSURE) · `Choose a plan to open a game` · `Not now` | drawn (game-admin) |
| Settings | `Plan` · `Free` / `Pro` / `Club` · `· founder` · `· until {date}` | mine, and the server's words |
| Settings | `Your groups` · `I have an invite code` | mine |
| C1 sentence | `You are the host. The host keeps the book: only you can log buys, close a night and settle it. Everyone else reads.` | rev 18 C1, final, never on a screen |

## For whoever applies the result

- **The seam stays.** `apps/mobile/src/lib/membership.ts` answers Full for
  everybody until membership ships; every gate drawn here is built against
  `gateFor` and `canTakeGame` and appears the day the seam returns real
  answers. Starting a group is the one gate the server already enforces
  (`book_insert_needs_plan`, read through `isNoPlanForGroup`), so B6 is
  reachable today and the others are not.
- **The pro/club → Free/Regular/Full mapping is one function**, `membershipOf`,
  and nothing on a screen. Do not print the server's words on any board's
  string.
- **The demo seed moves, it does not die.** `db.ts` runs SQLite in memory on
  web, `check:ui` drives the web build, and every board comparison depends on
  the seeded night. Whatever A1 becomes, the web preview keeps the seed and
  gains a `?fresh=1` flag (`docs/first-run.md` § What any of these needs
  first, item 5) so the first-run root is a screen a check can see.
- **The intro is the same night.** Play it from
  `apps/mobile/src/data/sampleNight.ts` through
  the real screens, driven, rather than from a recording — then it is held by
  `canonical-night.test.ts` like everything else, and both themes are free.
- **`docs/screens.md`** gains a row per new route, and every string the board
  marks UNSURE is listed there before it is built.
