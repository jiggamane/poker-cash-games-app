# The first run

Written 21 September, in answer to: *think through the options for the first
screen and the journey out of it, and how the app fills with data on the steps
after.*

**Nothing below is built.** This is the options paper: what a phone that has
never opened the app actually does today, what the handoff always said it should
do, five ways to close the gap, a recommendation, and the faults that block all
five. `docs/journey-map-findings.md` files *"first run, before a club exists"*
under **Later**, and that is still where it is.

---

## What happens today, traced

A phone that has never opened the app, in order:

1. `_layout.tsx` calls `openNight()`. There is no night, so `nightStore` copies
   `data/sampleNight.ts` in — the handoff's canonical night: seven names, $5,000
   on the table, and a clock written so the last thing that happened landed a few
   minutes ago **whenever** the app is opened.
2. That resolves and `loadClubs()` seeds a club **from the night** — its name,
   its seven players, its rules, and `'USD'` hard-coded in the INSERT
   (`clubStore.ts:321`). The host's seat is `seed-marek`, called **Andro**
   (`hostSeat.ts`).
3. Home paints. `games.length` is 1 and it is open, so the first thing the owner
   of a fresh install sees is a black card reading **● Playing now · 3h … ·
   The Thursday game · 7 at the table · the ledger is open**.

The first screen is somebody else's live poker game, presented as theirs. Four
of the app's own first-run affordances never fire as a result:

- **H1 never appears.** `fresh` is `club.members.length <= 1 && games.length ===
  0` (`index.tsx:94`); the seed makes it seven and one. *Start the first
  session*, the `waiting` pills on **My stats** and **Sessions**, the filled
  **Invite a player** — all built, all unreachable on the one run they were built
  for.
- **Nothing asks who the host is.** `HOST_NAME` is a constant. `hostSeat.ts`
  fixed the worse half of this — the phone's figures are no longer filed under a
  name out of a spec — but it fixed it by choosing a different name for the
  person rather than by asking them.
- **Nothing asks what the group is called or what it plays in.** It is *The
  Thursday game*, in dollars — which is also `new-group.tsx`'s placeholder, so
  the demo group and the empty form say the same words.
- **There is no way to remove it.** `startNight` deletes a seeded *night*
  (`nightStore.ts:1942`); nothing anywhere deletes a *club* — grep `deleteClub`,
  `leaveClub`, `removeClub`: no hits. The demo group is permanent.

The way out today is the one `docs/live-test.md` § *Set the group up tonight*
writes down for the owner by hand: **Settings → Your groups → New group**. It
works. It is an instruction in a document rather than anything on a screen, and
it leaves the demo club sitting above the real one for ever.

⚠ **One line of that live-test section is now stale.** It says a group's
currency can never be changed. `setClubCurrency` exists and is wired — from
**New session → Game details → the currency step** (`new-night.tsx:658`). So it
is editable, from inside the flow for opening a night, and from nowhere in the
group's own settings. Worth correcting there when this is decided.

---

## What the design says, and where it stopped

Rev 18 has had both screens since August (`design/handoff-rev18/docs/02-screens.md`):

- **H1 · first run** — hatched card, *"Nothing on the book yet"*, an explanation
  of what the app does, primary **Open the table**, and *Add the players* below
  it reading "nobody in the group yet".
- **C1 · Name the group** — *"the first-run version of G2, **reached from
  Welcome**"*, carrying the sentence the handoff says defines the whole product:
  *"You are the host. The host keeps the book: only you can log buys, close a
  night and settle it. Everyone else reads."*

**Welcome is drawn nowhere.** It is named in that one clause, in three copies of
the same file (rev 14, rev 18 and the 12 August cut), and no board holds a frame
for it. That is exactly what `journey-map-findings.md` means by *"the sentence
that says what the app is, live only in the superseded board"*. The newest cut —
`design/handoff-game-settings/`, 10 September, which rebuilt O1 — does not speak
about first run either, and under the rule in `CLAUDE.md` it therefore leaves
rev 18 standing here.

So the design's own path is **Welcome → C1 → H1 → O1**, of which H1 and O1 are
built and the first two have never existed.

---

## What a first run has to deliver

Four facts the app cannot guess, in the order it needs them:

| Fact | Why it cannot be defaulted | Where it is set today |
| --- | --- | --- |
| **What the host is called** | It is the name six other people read on every row of the ledger | nowhere — `HOST_NAME` |
| **What the group is called** | Every screen's title, and the book's name on the server (`ensureBook`) | New group, step 1 |
| **The currency** | Every figure in the app is drawn in it, and the engine holds minor units | New group step 1, or Game details |
| **Who plays** | A player is a name in the host's book first and an account only later — `docs/player-identity.md` | New group step 3, or O1's seating |

And **three different people arrive at the same root**, which is the thing no
current first run accounts for:

| Arrival | Route | What they hold |
| --- | --- | --- |
| **Host**, fresh install, no link | cold start | nothing — this is the case with no screen |
| **Member**, an invite code | `/claim`, or Settings → *I have an invite code* | ten characters; `pullBooks` fills the phone after |
| **Watcher**, a share link | `/watch`, pushed over the club root (S77) | one night, read-only |

Both of the latter two already land on a real screen. Only the host — the
overwhelmingly common case, and the one the whole app is for — lands on a demo.

---

## The options

| | First screen | What it asks | Cost | What it risks |
| --- | --- | --- | --- | --- |
| **A · Label the demo** | the demo night, marked as one | nothing | smallest | the app still opens on fiction |
| **B · Welcome → C1** | Welcome, then Name the group | 3 fields over 2 screens | medium | a second screen before anything is earned |
| **C · The table is the front door** | O1, empty | names and buy-ins | medium | the group has no name and no currency |
| **D · Three doors** | Host / Player / Watcher | which you are | medium | asks a question most people cannot answer |
| **E · Account first** | sign-in | an email | large | cannot ship — signups are closed |

### A · Keep the seed, and tell the truth about it

The card keeps its place but says what it is: a ribbon or an eyebrow reading
**Example night** rather than `● Playing now`, and a second line under the rows
— *"This is a worked example. Start your own group when you're ready."* — with a
control that deletes the demo club **and** its night.

- **The journey.** Open → poke at a finished night that has every screen in it →
  *Make this my group* → name, currency, your name → the demo is dropped and
  Home repaints as H1 → Start the first session.
- **How it fills.** Exactly as today, one step later.
- **For it.** It is the cheapest of the five, it keeps the property the seed was
  built for — a screen can be held against the frame it was drawn from — and it
  turns the app's best explanation of itself (a real night, with real figures)
  into an asset instead of a lie.
- **Against it.** The app still opens on somebody else's money, and every screen
  below Home has to carry the demo's honesty too: the roster is seven strangers,
  `/settled` is a night the reader did not play. Half-labelled is worse than
  unlabelled, and "label it everywhere" is a sweep over shared files, which
  `CLAUDE.md` says runs alone.
- **Needs.** A delete-club path, which does not exist. That is a real feature
  with an open question behind it (see `journey-map-findings.md` — *"can you
  leave holding a debt"*).

### B · The path rev 18 already specifies: Welcome → C1

A no-chrome root, the shape `/claim` and `/auth-callback` already use: the name
of the thing, the sentence — *"You are the host. The host keeps the book: only
you can log buys, close a night and settle it. Everyone else reads."* — and one
primary, **Start your group**. Under it, quietly, the other two arrivals: *I
have an invite code* and *I've got a watch link*. Then C1: group name, currency,
and your own name. Then Home, genuinely fresh, and the H1 machine fires for the
first time since it was written.

- **The journey.** Welcome → C1 (3 fields) → H1 → *Start the first session* →
  O1 seats people → the night is the first data in the book.
- **How it fills.** Nothing is invented at any point. The roster fills at the
  table, from O1's seating grid; the book gets its first row when that night
  settles; the server gets a copy only if and when the host signs in.
- **For it.** It is the specified design, it is the only option that puts the
  product's defining sentence in front of anybody, and it gives the two
  non-host arrivals a door instead of a mention in Settings.
- **Against it.** A welcome screen is a screen you read once and then resent, and
  this one would be the app's only marketing surface. If it says more than three
  lines it is worse than nothing.
- **Needs.** The demo seed to stop being automatic on a device (see
  *What any of these needs first*), and copy — which under `CLAUDE.md` is **not
  ours to invent**: the C1 sentence exists, the Welcome copy does not.

### C · The table is the front door

No welcome, no group form. The first screen is **O1 New session** with nothing
inherited: *Who's playing tonight?*, the two-column grid empty, the first row
being the host typing their own name and buy-in. The group is created implicitly
from that night — which is precisely the mechanism `loadClubs()` already has and
uses on the seed (`clubStore.ts:307`, *"the players at that table are its
roster"*). The group is named **after** the night, or never: it can sit as *Your
group* until the host renames it.

- **The journey.** Open → type five names and their buy-ins → **Open the table**
  → play. One screen between an install and a running game.
- **How it fills.** The fastest of the five, and in the right order: the roster
  is a by-product of seating rather than a form to fill in before anything is
  real. After the night settles, the app has earned the right to ask the two
  questions it skipped — *"Keep these five as a group? What is it called?"*
- **For it.** It matches the newest handoff cut, which already made O1's body the
  seating and collapsed the settings to one reviewable line with a *Change* pill
  — that is an onboarding screen wearing a session's name. It also removes a
  duplication nobody has noticed: on a first run, **New group** and **New
  session** ask for the buy-in twice and the players twice.
- **Against it.** The currency has to come from somewhere before the first figure
  is drawn, and a wrong guess from the device locale is written into every amount
  after it. It also puts the app's most complex sheet first, cold, with none of
  its inheritance working — the state O1 is least tested in.
- **Needs.** Currency editable from the group's own settings, not only from
  inside a night. A default group name that reads as a placeholder and not as a
  fact.

### D · Three doors

The first screen asks which of the three you are: hosting, joining with a code,
or watching. Host → C1, player → `/claim`, watcher → a paste field.

- **For it.** It is the only option that treats the three arrivals as equals, and
  it is honest about a real product fact: an install is not always a host's.
- **Against it.** It asks a question at the worst moment. "Am I a player or a
  host?" is answerable only by somebody who already knows how this app models
  people, and the overwhelming majority of installs are hosts —
  `14-invite-and-watcher.md` argues exactly this in refusing a second root: *"the
  only thing that would make X1 a root is a phone with no book on it, and nothing
  in the product needs one."*
- **Verdict.** Not a first screen. It is two secondary lines on **B**'s welcome,
  which is where the recommendation puts it.

### E · Account first

Sign in, then everything. Named here to kill it.

- `sendSignInLink` passes `shouldCreateUser: false` (`supabase.ts:116`), so a
  person nobody added by hand in the dashboard **cannot get an account at all**.
  A first run that leads with sign-in leads to a dead end today.
- It contradicts the model on purpose: the app is fully usable with no connection
  and no account (`_layout.tsx`), a player never needs an email
  (`player-identity.md` § *What this is not*), and the book lives on the phone.
- The account buys exactly one thing — the group reaching another phone — and it
  should be asked for at the moment it buys it. See the fill below, step 7.

---

## Recommendation — **C, carried by one screen of B**

Not two screens, and not none.

**One first-run screen.** It carries the C1 sentence, and it asks the three
things the app cannot guess and cannot fix later without lying: **what you are
called**, **what the group is called**, **what you play in**. That is one card,
three fields, one primary. It is C1 with Welcome's job folded into its header
rather than a screen of its own — a welcome that asks for nothing is a screen
people learn to dismiss, and this one earns its place by being the form.

**Then the table, not a home screen.** Its primary reads **Open the first
table** and goes straight to O1 with an empty roster, because the group's real
roster is the people sitting down, and O1's 10 September rebuild is already the
screen for entering them. Home is what they come back to, which is what H1's
copy has always implied — *"Nothing on the book yet"* is a thing you read on your
way back, not on your way in.

**The two other arrivals are two quiet lines** at the foot of that screen — *I
have an invite code* and *I've got a watch link*. That is **D** at its correct
weight, and it moves the claim route out of Settings where nobody would look for
it.

**The demo stops being automatic on a device and stays automatic on the web.**
This is the seam that makes the whole thing affordable: `db.ts` already runs
SQLite **in memory on web** and says so — *"a browser preview starts from the
seed every time it is loaded and remembers nothing"* — and `npm run check:ui`
drives that web build. So the seed keeps every check, every board comparison and
every route's data exactly as they are, while a phone gets an empty book and the
first-run screen. On the device it becomes **Settings → See an example night**,
which is the demo's honest form and the one `live-test.md` would then point at.

That ordering also deletes the duplication: **New group** keeps its three steps
for the *second* group, where they are right, and the first run never asks for a
buy-in or a roster twice.

---

## The fill, step by step

What is in the app after each step, and where it came from. This is the half of
the question the options above are in service of.

1. **Install.** Empty book. One SQLite file, no night, no club, no account.
   `myNights()` returns nothing and **Sessions** and **My stats** draw the empty
   states they already have (B79 made that true).
2. **The first-run screen.** Three facts: host name (→ `club_member` on
   `HOST_ID`, never a new id — `hostSeat.ts`), group name and currency (→
   `club`). Nothing has left the phone.
3. **Open the first table.** O1 writes the seating and the buy-ins. The night
   **copies the money rules at birth** — a rule changed later never reaches a
   night already running, which is why the rules have to be right before the
   first hand and not after it.
4. **The night.** Every buy-in, rebuy, cash-out and expense is an append-only
   row. Corrections and voids are new rows pointing at old ones; nothing is ever
   edited. This is where the app's data actually comes from — not from a form.
5. **Count up, and settle.** E2 counts the stacks, E4 agrees the transfers, the
   settlement is frozen. `packages/core` does all of it; no screen adds up its
   own column.
6. **The book has one row.** **Sessions** shows a night, **My stats** has a
   figure, the roster has the people who played, and the group's defaults are
   whatever the night was opened with. The empty states retire themselves.
7. **The first thing that needs the server.** Inviting a player, or sharing a
   watch link. *This* is where sign-in is asked for, because it is the first
   moment an account buys anything. `ensureBook()` creates the book on the server
   from the local group on that first sync, and the outbox drains everything
   recorded up to then.
8. **The second phone.** The host issues ten characters
   (`create_player_invite`); the player opens `/claim`, is signed in anonymously,
   and `pullBooks` fills their phone from the server — roster, nights, their own
   history, and no write access whatever.
9. **The second group.** **New group**, all three steps, nothing carried over.
10. **The account that survives a lost phone.** Anonymous → email, keeping the
    user id, asked at the two moments `player-identity.md` names and never
    before.

---

## What any of these needs first

Five faults, none of them the first-run screen, all of them in its way:

1. **A club cannot be deleted.** No `deleteClub`, no leave path, no screen.
   **A** needs it outright; **B** and **C** need it the moment a first run
   guesses wrong.
2. **The currency is editable only from inside New session.** It belongs in the
   group's settings as well — and `live-test.md` says it is editable nowhere,
   which is now wrong in the other direction.
3. **`ensureBook()` on a phone that already holds several local groups is
   unverified** — `docs/accounts-and-groups.md` flags it, and every option above
   makes local groups more common, not less.
4. **Signups are closed.** Whatever the first screen says, it must not promise an
   account. One word — `shouldCreateUser` — and a decision about who may start a
   group.
5. **No check can see a first run.** `check:ui` drives the web build, which is
   seeded by design. Moving the seed off the device without giving the checks a
   way to render the unseeded state means the one screen every new user sees is
   the one screen nothing watches — which is the fault `CLAUDE.md` § Checks was
   written about. A `?fresh=1` flag on the preview, added to `ui-audit.mjs`'s
   `PARAMS` map, is the cheap version.

---

## Open questions for you

- **Does the app open on a form or on a table?** The recommendation says one
  short form and then the table. The alternative worth arguing is **C** pure —
  no form at all, group named after the first night.
- **Does the demo survive on the phone at all?** Opt-in in Settings is the
  recommendation. Deleting it from devices entirely is simpler and loses the
  thing that makes a screen checkable against its board.
- **What does the first screen say?** The C1 sentence is written and final. The
  header above it is not, and `CLAUDE.md` says a missing string is flagged rather
  than invented — this is the flag.
- **Who may start a group?** Anyone with the app, or anyone holding a code from
  you. It is the same question `accounts-and-groups.md` asks, and the first-run
  screen is where the answer becomes visible.
