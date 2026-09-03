# Who gets in during the test

The app is being tested by one group before anybody else sees it. That raises
two questions which look like one question and are not:

1. **Who is allowed an account at all** — the beta gate. Pure policy.
2. **How identity actually works** — host account, watcher link. Mechanics.

The second one is where the risk is. Row-level security *is* this app's entire
security model: the ledger is protected by policies in Postgres, not by which
buttons the app draws. A test period that fakes identity — a hardcoded tester
login, a bypass flag, a "dev mode" that skips the policies — tests everything
except the part that can lose somebody's money. So the mechanics here are the
real ones. It is only the *gate* that is manual, and a manual gate is what a
closed beta is.

None of it costs anything. Supabase's free tier covers 50,000 monthly active
users; the test will have eight.

---

## The three decisions

### 1. Signups are closed; testers are invited by hand

`sendSignInLink` passes `shouldCreateUser: false`. An address nobody has
invited gets no account and no email, and the auth server is what enforces
that — not a list in the app, and not us remembering who we told about it.
The sign-in screen turns the refusal into a sentence a person can act on.

Inviting somebody is one click in the dashboard. When the test ends, flip the
one word back.

### 2. Watchers sign in anonymously and redeem a link

`0001_init.sql` built the read side of watching and left the write side blank:
every `*_watcher_read` policy asks `watcher_session_id()`, which reads a
`share_session_id` claim out of the caller's token, and nothing put it there.
The build plan's answer was an edge function minting a custom-signed token.
`0005_watcher_access.sql` does the same job inside Postgres instead:

| | |
|---|---|
| **Anonymous sign-in** | The watcher gets a real Supabase user and a real JWT. No email, no password, no sign-up — the same promise the design makes, and now something a grant can attach to. |
| **`redeem_share_token(token)`** | Records a row in `share_grant`. The only way such a row can exist: the table grants `INSERT` to nobody. |
| **`custom_access_token_hook`** | Runs on every token issue and stamps the live grant into the JWT as `share_session_id`. |

The claim ends up exactly where 0001 already expects it, and that matters for
one specific reason: **a claim inside the JWT governs the realtime websocket as
well as ordinary reads.** A token in a request header would have authorised the
REST call and not the subscription, and a watcher who cannot subscribe is a
watcher who cannot watch.

What this buys over the edge function: no function to deploy, no signing key to
manage, and the `service_role` key stays out of the system entirely. What it
costs: one toggle in the dashboard, below.

### 3. Real email, through Resend

Supabase's built-in mailer sends **2 emails per hour** and, on new projects,
**only to addresses that are members of the project**. With a table of testers
that is not a rate limit, it is a wall — and it fails as "the link never
arrived", which reads exactly like a bug in the app. Resend's free tier is
3,000 emails a month and takes about twenty minutes to set up against a domain.

---

## Setting it up

Six steps, all in the Supabase dashboard except the DNS one. A remote Claude
session cannot reach `supabase.co`, so these are for a person or a session
running on your own machine.

### 1. Apply the migrations

Do not work from a list of file numbers — this one has been out of date twice.
Paste `supabase/state-check.sql` into the SQL Editor. It is read-only and returns
one row per migration, `ok` or `MISSING`, naming the file to run. Run the missing
ones in numeric order, then run it again: everything except row 93 must say `ok`.

`supabase/schema.sql` is every migration concatenated, for a fresh project only.

The four things this document depends on are rows 5, 7, 8 and 92 of that output —
the watcher grant table, the invite functions, the verification column, and the
hook's grant to `supabase_auth_admin`. Row 93 is the two toggles below, which no
query can see.

### 2. Turn on anonymous sign-ins

**Authentication → Sign In / Providers → Anonymous sign-ins → enable.**

Without this, redeeming a link fails at the first step for anybody who is not
already signed in — which is every watcher, and every player claiming a seat.

### 3. Turn on the access token hook

**Authentication → Hooks → Customize Access Token (JWT) Claims → Postgres
function → `public.custom_access_token_hook`.**

This is the one that fails quietly. Miss it and everything appears to work —
the link redeems, a grant row appears, no error anywhere — and the watcher's
screen is simply empty, because the claim never reaches their token and the
policies are correctly refusing them. If watching is empty, check this first.

### 4. Custom SMTP through Resend

1. Create a Resend account and add your domain.
2. Add the DNS records it gives you (SPF and DKIM). This is the only step
   outside a dashboard, and it can take a few minutes to verify.
3. In Resend, create an **SMTP credential** — this is an API key.
4. In Supabase: **Project Settings → Authentication → SMTP Settings**, enable
   custom SMTP, and fill in:

   | Field | Value |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | the Resend API key |
   | Sender email | something at your verified domain |

5. **Authentication → Rate Limits** — raise "emails per hour" from 2 to
   something that fits a test night. Supabase leaves the low limit in place
   after you attach SMTP, which is the second reason people think the mail is
   broken when it is not.

### 5. Allow the redirect URLs

**Authentication → URL Configuration → Redirect URLs.** Add
`pokerclub://auth-callback` for real builds, and — while testing in Expo Go —
the `exp://…` address the sign-in screen prints on itself in development. That
address contains the dev machine's IP and port, so it changes when either does.
A link that redirects somewhere not on this list falls back to the project's
Site URL and dead-ends on a page the phone cannot reach.

### 6. Invite the testers

**Authentication → Users → Invite user**, one address each. The invite goes out
over the SMTP configured in step 4. After that they use the ordinary sign-in
screen; the invite is what makes their address known, not a separate way in.

---

## When it says "Invalid API key"

This is the gateway refusing the key the app sent, before any of the above is
reached — no policy, no account, no table is involved. It is worth knowing that
it is **one message for four unrelated causes**, which is why it used to appear
on whatever screen happened to ask (an invite sheet, say) and tell nobody
anything:

| Cause | What actually happened |
|---|---|
| No key | `EXPO_PUBLIC_SUPABASE_ANON_KEY` is missing, or `.env` was added without restarting the dev server. The value is read once, at bundle time. |
| Another project's key | The two lines in `.env` came from different projects. |
| An expired key | A legacy anon key has an expiry inside it, and rotating one retires the old. |
| A mangled key | Pasted with a line break in the middle, or with the quotes left on. |

**Settings → Connection** decides between them on the phone. It prints the
project ref and the last four characters of the key, and "Check the connection"
asks the server two separate questions — does it accept this build's *key*, and
does it accept this phone's *sign-in* — because those fail independently and
have nothing to do with each other.

Three things worth knowing before reading its verdict:

- **The key is not called `anon` any more.** Projects made since Supabase's key
  migration issue a **publishable** key (`sb_publishable_…`) under Project
  Settings → API Keys and may have no anon key at all; a legacy `eyJ…` anon key
  that has been *disabled* there is refused exactly like a wrong one. Either
  format goes in `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted as an alias.
- **A stored sign-in can be the thing being refused**, not the key. Rotating a
  project's keys or resetting its database leaves the phone holding a token
  nothing will accept, and `autoRefreshToken` cannot mend it — every request
  fails for ever, through restarts. That is what **Forget this sign-in** is for;
  it clears the token locally, without asking the server's permission, because
  the server is exactly what is refusing to give it.
- **A real build has no `.env`.** It is gitignored, so it never reaches the EAS
  builder. The two `EXPO_PUBLIC_` lines get there as EAS environment variables
  (`eas env:create`) or as an `env` block on the profile in
  `apps/mobile/eas.json` — neither of which exists yet, because no build has
  been made. A build that signs in fine over the QR code and refuses everything
  once installed is this.

---

## One thing to watch: the project falls asleep

A free Supabase project **pauses after 7 days with no activity**, and poker is
weekly. A paused project has to be restored by hand from the dashboard, which
is a bad thing to discover at the table with everyone waiting.

Any weekly request to the REST endpoint keeps it awake — a scheduled GitHub
Action hitting the health endpoint costs nothing and is enough. Worth doing
before the first night rather than after the first outage.

---

## Trying the whole thing

On two phones, or one phone and one simulator:

1. **Host:** sign in with an invited address. The link arrives by email and
   opens the app signed in.
2. **Host:** record a night — seat two players, buy in, a rebuy.
3. **Host:** Settings → Watchers → **Share this night**. This publishes the
   book, the players, the session and the ledger, then hands you a link.
4. **Watcher (the other device):** open the link. It should redeem, land on
   the night, and show the ledger without any sign-in at all.
5. **Host:** record another buy-in. It should appear on the watcher's screen
   without them touching anything — that is the realtime subscription being
   authorised by the same claim as the read, which is the whole design.
6. **Host:** Settings → **Stop sharing**. The link is rotated and the grants
   revoked. Opening the old link now fails.
7. **Anyone:** sign in with an address you have not invited. It should be
   refused with the invitation message, not a raw Supabase error.

If step 4 shows an empty night rather than an error, it is step 3 of the setup
— the hook.

### And then the player side

A watcher reads one night. A **player** claims a name and keeps their own
history, which is the part worth testing with the people you actually play with.

8. **Host:** Home → **Invite a player** → tap a name → **Make a code**. Ten
   characters appear. **Send it** hands over the code and a link together.
9. **Player (the other device):** Settings → **I have an invite code**, type it,
   and the screen should say *"You have been added as Petr"* with the group's
   name — before anything is spent. Then **This is me · open the group**.
10. **Player:** My stats should already hold every night Petr has played,
    fetched from the server on the way in. Nothing was typed but the code.
11. **Player:** try to record something. There is nothing to record with — the
    host's controls are not there, and the database refuses a write from a
    member anyway. Both facts are asserted in `05_member_read.sql`.
12. **Host:** the same name now reads **claimed** on the roster, and the invite
    sheet offers no new code for it.
13. **Host:** make a code for somebody else and then **New code** before it is
    used. The first should now be dead — one live code per seat, always.

If step 10 shows an empty My stats, the claim worked and the fetch did not:
Settings → **Fetch my nights** says which. If step 9 says the code opens
nothing, check that the host's night actually reached the server — an invite
cannot be issued for a player the server has never heard of, and the invite
sheet says so in those words.

---

## What this deliberately does not do

Each of these is a known limit, not an oversight. They are listed so that
finding one during the test is not mistaken for a bug.

- **A watcher sees one night — the most recent link they opened.** The claim
  holds a single session id, because that is what the policies in 0001 read.
  Watching two nights at once, or reading back through old ones, needs an array
  claim and a rewrite of those policies. No screen asks for it yet.
- **Revoking takes effect on the watcher's next token refresh**, within the
  hour. Rotation is immediate — nobody new can redeem the old link — but a
  phone already holding a valid token keeps reading until it expires. Anything
  stricter means a table lookup on every read.
- **A forwarded link works.** The token is the credential, which is the design:
  the room is trusted, and a host who wants somebody out revokes and reshares.
- **Watchers cannot see the group's name.** `book` has no watcher read policy,
  so the night appears without the club's name on it. Adding one is a two-line
  policy if it turns out to matter.
- **Nothing is published until the host taps Share.** The night lives on the
  phone and works there with no account; sharing is the moment it also lives on
  the server.
- **Anonymous users accumulate** — one per watching device, forever. Harmless
  at this scale (the free tier allows 50,000 monthly), but worth a cleanup job
  before the app is public.
- **No captcha.** Anonymous sign-in is open, and on a public app that is a
  thing to abuse. Supabase has a captcha toggle; it can wait until there is
  something worth abusing.

## When the test ends

- `shouldCreateUser: true` in `apps/mobile/src/lib/supabase.ts` opens signups.
- Nothing else changes. The gate is the only part of this that was temporary —
  the watcher mechanics, the policies and the hook are the shipping design.
