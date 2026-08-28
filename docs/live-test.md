# Taking it to a real table

Written for the first night this app is used for real money, away from the
machine that builds it: an iPhone, a restaurant, no Mac, and a laptop only if it
earns its place on the table.

`phone-preview.md` is the other half of this and answers a different question —
*can I look at the app while I am out?* This one is *can I keep the book on it
while six people are watching?*, and the answers barely overlap. **The browser
preview is not an option for a real night.** On the web the database is opened
`:memory:`, so a reload loses the night. It is for looking at screens.

---

## The fact everything else follows from

Apple will not run an app on an iPhone unless it came from the App Store or was
signed for that specific phone by a **paid Apple Developer account** ($99/yr).
Expo builds in the cloud, so no Mac and no Xcode are needed — but no cloud can
sign for a device Apple has not been told about. Without that account there is
exactly one way to run this app natively on an iPhone: **Expo Go**, which is
itself an App Store app. That is why `apps/mobile/AGENTS.md` pins the SDK to 54
and says not to move ahead of it casually.

(On Android none of this applies: `eas build --profile preview --platform
android` gives an APK that installs from a link and needs no account at all. If
anyone at the table has an Android phone, that is the better device to keep the
book on.)

So the question is only how the JavaScript gets into Expo Go. Two ways, and they
fail differently:

| | **A · a published update** | **B · a dev server** |
|---|---|---|
| What you carry to the restaurant | the phone | the phone **and the laptop** |
| Network it needs | Expo's, to fetch once | the laptop reachable all night |
| Prepared | tonight, ~20 min | tonight, rehearsed |
| Fails when | it was never published, or the phone cannot reach Expo and has nothing cached | the laptop sleeps, the hotspot drops, Metro dies |
| Restaurant wifi involved | no | no — the phone's own hotspot |

**Do A tonight and pack the laptop anyway.** A is unproven on this project — the
first time it runs will be tonight — and B is what saves the night if the app is
force-quit at one in the morning with no signal. Twenty minutes now against a
night of six people's money.

---

## What the app does with no signal at all

All of it. `storage-and-sync.md` is the long version; the short one is that the
ledger lives in SQLite on the phone and no screen waits for the network. In
aeroplane mode you can still open a night, seat players, record every buy-in,
rebuy, cash-out and expense, correct and void entries, edit the money rules,
count the table, confirm a shortfall, read the deductions, and close the night
and read its settlement.

What needs the network is signing in, sharing a night with a watcher, and invite
codes — none of which are being tested on a first night. Leave them alone; the
app is complete without them and nothing is lost by never signing in.

---

## Tonight, on the Mac

### 0 · Start from what shipped

```bash
git fetch origin && git checkout main && git pull
npm install
npm run check
```

If `check` is red, stop — do not take a build to a table on a red check.

### 1 · Expo Go on the iPhone, signed in

App Store → **Expo Go**. Then open it and **sign in to your Expo account** on
its Home tab. Route A does not work signed out: since 12 May 2026 Expo Go only
opens updates belonging to an account that owns the project, and this project
lives at `938b4629-9a41-4ddf-bcd8-86bb4e4696b3` on expo.dev. Sign in as whoever
owns that.

### 2 · Route A — publish the app to Expo

**Without a Mac, this is a page on a phone.** `.github/workflows/expo-go.yml`
runs exactly the command below on a GitHub runner: **Actions → Put the app in
Expo Go → Run workflow**, on `main`. It gates on `npm run check` first, and the
run's summary is the link to the published update — open that on the iPhone and
it hands off to Expo Go. It needs one secret, `EXPO_TOKEN`, made at
<https://expo.dev/settings/access-tokens> as the account that owns the project,
and the workflow says so and stops if it is missing rather than failing halfway.
The rest of this section is the same thing at a keyboard, and everything it
warns about applies to the workflow too.

```bash
cd apps/mobile
npx eas-cli@latest login      # the same account as the phone
npm run publish:go
```

It prints a link and a QR code. Point the iPhone's camera at the QR and it opens
in Expo Go, over cellular, with nothing running on the laptop.

Two things can go wrong here, and both are worth knowing before you are tired:

- **It says it has configured a `runtimeVersion` for you.** Stop and read which
  one. This is settled now — `app.config.js` stamps `exposdk:54.0.0` under
  `EAS_PROJECT=go` and that is what Expo Go opens — but the failure it fixes is
  worth recognising, because it does not look like a failure. Run #4 on
  28 August published green, from a workflow whose every step passed, and put an
  update stamped `0.1.0` on Expo. Expo Go is one fixed native build calling
  itself `exposdk:54.0.0`; it takes only updates stamped to match, and it turns
  away the rest **without a word on the screen.** eas-cli had found no runtime
  version, judged that an oversight, and written the standalone build's answer
  into `app.json` on the runner.
- **So a missing runtime version is not a neutral state.** Leaving it out does
  not publish an unstamped update — it publishes a wrongly stamped one. If you
  ever see `Runtime version 0.1.0` in the publish table, the update is real, the
  link works, and no phone will open it.
- **`npm run publish:go` fails outright.** Then Route A is not available tonight
  and you are on Route B. Do not spend an hour on it; B is the one that is known
  to work — set a timer for twenty minutes and mean it.

`EAS_PROJECT=go` in that script is the load-bearing part — see the comment in
`apps/mobile/app.config.js` for what each of the three EAS lines breaks.

**One difference from a real build worth knowing:** `eas update` bundles on your
own machine, so `apps/mobile/.env` IS baked into what it publishes — unlike
`eas build`, where the cloud builder never sees a gitignored file, which is the
trap `auth-test-period.md` describes. So whatever Supabase project your Mac is
pointed at is the one tomorrow's phone will try to reach. That is fine and
probably what you want: with the keys in, the night queues itself up for the
server and goes up whenever there is signal, and with them out the app is purely
local. Neither choice can lose a night — the queue is a table on the phone, not
memory — so do not spend the evening on it.

The workflow has no `.env` to bake in — a runner checks out the repository and
`.env` is gitignored — so it takes the same two values from repository secrets
instead, `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, exactly
as `pages.yml` does. Set neither and the published app is purely local, which is
a real mode and the one a first night is testing.

### 3 · Prove it, in the only way that counts

Not "it opened". Three things, in this order:

1. **Force-quit Expo Go and reopen it.** The project should be under *Recently
   opened* and should open with the laptop shut.
2. **Aeroplane mode, force-quit, reopen.** This is the one o'clock test. If it
   will not open offline, you have learned that tonight rather than at the
   table, and the laptop comes with you.
3. **Record something, force-quit, reopen.** Add a player, put a buy-in on them,
   kill the app, open it again: the figure has to still be there. This is what
   the browser preview cannot do and the only reason a native test exists.

That third one starts a night, which deletes the demo night — that is correct
and wanted. The throwaway stays in the demo's own group, and the real group you
make next is a different group with its own nights, so nothing from tonight's
poking follows you to the table.

### 4 · Route B — rehearse it, do not improvise it

**Do not plan on the restaurant's wifi.** Guest networks isolate clients from
each other, so the phone frequently cannot see the laptop at all even when both
are online, and `--tunnel` then puts your bundle through a public relay and a
long round trip. Use the iPhone's own hotspot instead — the phone and the laptop
then share a private network that nobody else is on:

1. iPhone → Settings → **Personal Hotspot** → on.
2. Laptop joins that hotspot's wifi.
3. On the laptop: `cd apps/mobile && npm start`.
4. The QR code is an `exp://172.20.10.x` address. Scan it with the camera.

Nothing leaves the table: the phone is talking to the laptop over the hotspot's
own link, and cellular data is not being spent on the bundle.

**Rehearse it tonight at home with the wifi off on both machines** — the whole
point is that the arrangement is unfamiliar and you will be doing it in a noisy
room. Then, for the night itself: laptop plugged in, sleep disabled
(`caffeinate -d` on a Mac, and close nothing in the Expo terminal), phone on
charge.

### 5 · Pack

Phone, cable, and a power bank — a night is four hours of a bright screen, and
**the app does not keep the screen awake during a night** (`expo-keep-awake` is
used only on the invite QR). Set the iPhone's Auto-Lock to **Never** before you
start, and put it back afterwards.

---

## Set the group up tonight, not at the table

This is the part that will cost you if you skip it, and it is five minutes.

**The app opens on the demo.** The first launch seeds the canonical night —
Dana, Marek, Lena, Tomáš, Ivo, Petr and Radka, $5,000 on the table — because
every drawn frame in the handoff shows it and a screen can then be held against
the frame it came from. The moment you start a real night the demo night is
deleted (`nightStore.startNight`), so it will not sit there confusing anybody.

**But the demo's club is not deleted, and it is in dollars.** The seeded club is
created with `'USD'` hardcoded and the sample's seven players as its roster —
and **there is no way to change a group's currency in the app.** `renameClub`
exists, the buy-in and the rules can be edited, the currency cannot: it is asked
once, on the first step of **New group**, and that is the only place it is ever
set.

So, tonight:

1. **Settings → Your groups → New group.**
2. Step 1: the group's real name, and **the currency you actually play in.**
   Get this right; it is what every figure in the app is drawn in.
3. Step 2: the standard buy-in, and the money rules — the bill, the kitty, the
   rounding. Money rules matter more than they look: **a night copies the rules
   at birth**, so a rule changed later never reaches a night already running.
   Set them now and the night inherits them.
4. Step 3: the people who will actually be there.
5. Tapping the new group on **Your groups** switches everything to it and
   returns Home. Check the club name on Home is the right one before you leave.

Then leave the app on Home. Tomorrow the first thing you do at the table is
start a night, not set up a group.

---

## At the table

- **Start your own night.** Home → start a night. Do not rename the demo's
  players into your own; that is a different night with the wrong money in it.
- **The start time goes backwards.** If you open the app at 20:40 for a game
  that began at 20:05, set it back on the start sheet — the elapsed clock and
  every entry's stamp read from it. It only ever goes backwards; a game cannot
  have started in the future.
- **Corrections, never edits.** The ledger is append-only by design: a mistake
  is fixed with a correction or a void, which is a new row pointing at the old
  one. Nothing is ever silently rewritten, which is what makes the night
  auditable afterwards.
- **One phone writes the night.** Do not hand it to somebody else's Expo Go to
  "add their own buy-in". The single-writer assumption is baked into the
  server's uniqueness constraint, and the app has no handover.
- **Ending it:** count up → deductions → settle up → settled. Settle up is
  guidance to the room, not a workflow: whether Ivo actually hands Dana the
  money is not recorded anywhere, on purpose.

### What is not a bug

- Leaving or deleting a group is not built — Settings says so in as many words,
  and says what it is waiting for.
- Sharing, watchers and invite codes need a Supabase project configured; without
  one the app is on-device only, which is the mode you are testing.
- No sign-in prompt blocks anything. A night is recorded whether or not anybody
  ever signs in.
- **"No connection · reconnecting"** in amber under the club name is the honest
  state of a restaurant basement, not a failure — and Settings will say
  *"Saved on this phone · 12 waiting"* beside it. Both are the app telling you
  where the night is: on the phone, which is where it is safe. If the build has
  no Supabase project configured at all the banner never appears, because a
  local app has nothing to be out of touch with.

---

## Write down what you find, before you fix it

`docs/bugs.md` explains why, and its **Open** section is still waiting for the
faults found on 21 August — which were reported in conversation and are
therefore, for practical purposes, gone. Do not let tomorrow's go the same way.

At a table you will not open a laptop. So: **screenshot every single thing that
looks wrong**, on the spot, and do not trust yourself to remember what was wrong
with it. The next morning, turn each screenshot into an entry with the six lines
that file asks for — Screen, Seen, Expected, Found, Locked by, Status — and the
**Locked by** line is the one that matters: name the check that will now go red
if it comes back, or write `nothing yet` and leave it as an invitation.

---

## If everything fails at the table

Keep the night on paper and enter it afterwards. The start time can be set back
to when the game actually began, entries can be added in order, and the
arithmetic does not care when it was typed. A night recorded an hour late is a
night recorded; a night lost to a laptop that would not wake up is not.
