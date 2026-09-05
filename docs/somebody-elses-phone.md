# Putting the app on somebody else's phone

Three different things get asked as one question, and they have three different
answers:

| They should be able to… | What they need | What it costs |
| --- | --- | --- |
| **See tonight** — the table, their own card, live | a share link | nothing |
| **Have a place** — their name is theirs, their nights add up | a ten-character invite code | nothing |
| **Run the group** — money rules, settle-up, invites | a code, then admin handed to them | nothing |

None of it needs a paid Apple Developer account. That account buys one thing —
a build installed on an iPhone from anywhere but the App Store — and every step
below routes around it. `phone-preview.md` and `live-test.md` are the two halves
of *getting the app to run*; this file is what to do once it does.

**The whole flow is on the ten characters, not on a link.** The QR code on the
invite sheet and the link in the Share sheet are both built by
`Linking.createURL`, which encodes *how the host's own phone is running the app*
— a dev server on your wifi, or your copy of Expo Go. On somebody else's phone
that address means nothing. The code survives being read out over a table, and
that is why it is the primitive (`src/lib/invites.ts` says so at the top).

---

## Before the night — once, at a keyboard

Three things, and all three fail quietly rather than loudly:

1. **The server exists and its two toggles are on.** `auth-test-period.md`,
   steps 1–3: migrations applied, **anonymous sign-ins** enabled, the **access
   token hook** set. Miss the hook and everything looks like it worked while the
   watcher's screen stays empty.
2. **You are signed in on the host phone, and the book has synced.** A code is
   made on the server against a player row that has to already be there.
   Settings shows *Signed in as*, and *Waiting to sync* — get it to **Backed
   up** before you hand anybody anything. Otherwise the invite sheet says *"This
   player has not reached the server yet."*
3. **If anyone will use the web copy** (below), the repository needs
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as Actions
   secrets — Settings → Secrets and variables → Actions — and one merge to
   `main` after that. Both keys are safe to publish; `apps/mobile/.env.example`
   says why. Without them their app says *"This build has no server"* and no
   code will redeem.

---

## Step 1 · Get the app running on their phone

Pick by the phone, not by preference:

| | What they do | Good for |
| --- | --- | --- |
| **Web** — <https://jiggamane.github.io/poker-cash-games-app/app/> | Open it, share → **Add to Home Screen** | **Everyone who is not recording the night.** Nothing to install, no account, works on any phone |
| **Android** | Tap a link, install the APK from `eas build --profile preview --platform android` | Anyone who will *run* a night on an Android |
| **Expo Go on iPhone** | Install Expo Go, sign in, open the published-update link from **Actions → Put the app in Expo Go** | Someone who will *run* a night on an iPhone |

The web copy's one real limit is the host's limit, not theirs: the browser opens
the ledger `:memory:`, so a reload loses a night **being recorded on that
phone**. A watcher reads the night off the server and a claimed player's
identity is kept in browser storage, so neither of them notices. Nobody should
record a night in a browser.

Expo Go has a gate that catches people out: since 12 May 2026 it only opens
updates owned by an account the signed-in user belongs to. An iPhone that is
going to *run* nights needs its owner added as a member of the Expo account that
owns this project. For everyone else, hand them the web address instead — it is
one tap and no account at all.

---

## Step 2 · Give them their place

On the host phone:

1. **Players** → their name → the **App** row (it reads *no app · invite*).
2. The sheet issues the code the moment it opens. **Copy**, and send them the
   ten characters however you normally message them.
3. Ignore the QR unless you are both in the same build — see above. The code
   under the QR is the part that always works.

On their phone:

4. **Settings** → **I have an invite code** → type the ten characters.
5. They land on their place, with their nights already pulled down.

The code is bound to that one name, is good for one use and one month, and
**Reset the code** retires it if it goes astray. If they are on the web copy you
can also send `…/app/claim?c=THECODE` and skip the typing — the published site
serves the app for any path, so that link opens straight on the claim screen.

---

## Step 3 · Let them run the group

**Settings → Hand over admin**, pick them, confirm.

Two preconditions and one warning:

- **They must have claimed first.** Step 2 is not optional — an unclaimed name
  is a label you typed, with nobody behind it to receive anything. The list
  shows them, greyed to unselectable, saying *not claimed yet*.
- **It is one way.** They can hand it back; you cannot take it. That is
  deliberate — see `12-the-group.md` § 4.1.
- **What moves is the money rules, settle-up, invites and the exits.** Nothing
  already settled changes hands. Every night keeps the host it was recorded by.

**And the one thing handing over admin does not do: it does not move tonight.**
One device writes a night — `ledger_entry` is unique on `(session_id, seq)`, and
a second phone opening the same night reads it and does not write
(`storage-and-sync.md` § The one real limit). So if you want somebody else to
run the game, **they open the night on their phone at the start of the evening**
and record it there; you cannot pass the book across the table at midnight.

---

## Step 4 · Let the rest of the table watch

With a night open, on the phone recording it: **Settings → Share this night**.
It mints a token and hands you a link.

That link is only worth sending to a phone running the app the same way yours
is. For everyone else — which in practice means everyone on the web copy — take
the `t=…` token out of it and send this instead:

```
https://jiggamane.github.io/poker-cash-games-app/app/watch?t=THETOKEN
```

They open it, are signed in anonymously, and land on the night: the table, the
figures, and their own card if they have claimed a place. It is read-only by
construction — the policies in Postgres decide what they can see, not which
buttons the app draws.

**Stop sharing** rotates the token and cuts every watcher off; anyone still
holding a valid one keeps reading for up to an hour.

---

## When it does not work

| What they see | What it is |
| --- | --- |
| *"This build has no server"* | The two Supabase keys are missing from their build — the third item under *Before the night* |
| *"A code is made on the server, so you have to be signed in"* | You, not them: sign in on the host phone |
| *"This player has not reached the server yet"* | The book has not synced. Settings → **Sync now**, then reissue |
| The code is refused, no reason given | One string covers unknown, spent, revoked and expired — deliberately. Reset the code and send a fresh one |
| An empty night on a watcher's screen | The access token hook is not set. `auth-test-period.md` step 3, every time |
| Expo Go: *"requires authentication"* | They are not a member of the Expo account that owns the project. Add them, or give them the web address |
| The link you sent opens nothing | It was a `Linking.createURL` link built for your runtime. Send the ten characters, or the `https://…` form above |
