# Accounts, groups, and who is allowed in

Written 17 September, in answer to: *let other people into my group, then let
them start groups of their own, and stop the email limit getting in the way.*

`docs/auth-test-period.md` is the operational companion to this file — it is the
dashboard checklist. This one is the status and the decision.

---

## The short version

Three of the four things you want already exist and are enforced in Postgres.
The fourth — a person who is not you owning a book of their own — is blocked by
**two lines of code**, one in the app and one in a policy. Neither is hard. The
email limit is real, is not a limit on the app, and is fixed in a dashboard in
about half an hour without touching the repository.

---

## What is built

The system already has **three separate identities**, and all three are real —
row-level security decides what each may read, not the buttons the app draws.

| | How they get in | Email? | State |
|---|---|---|---|
| **Host** | Magic link, `sign-in.tsx` | yes | works, gated |
| **Member** | Ten-character invite code, `invite.tsx` → `claim.tsx` | **no** | works |
| **Watcher** | Share link for one night | **no** | works |

**Members and watchers never touch email.** `create_player_invite` mints ten
characters bound to one roster row; `redeemInvite` signs the phone in
anonymously and spends the code. That is the whole flow, and it is
already tested end to end (steps 8–13 of the test-period doc). So *"share access
to the group with other members"* — the first half of what you asked for — is
**not blocked by the email limit at all**. It is shipped.

What a member gets: the group's roster, every night, their own history, and no
write access whatever. `05_member_read.sql` asserts the refusal.

---

## The email limit — what it actually is

Not a limit on accounts, and not something the code can route around.

Supabase's **built-in mailer sends two emails per hour**, and on a new project
**only to addresses that are members of the project**. That is why it reads like
"one or two a day": you are hitting a wall, not a quota, and it fails as *the
link never arrived*, which looks exactly like a bug in the app.

Two settings fix it, and **they are separate** — this is the part people miss:

1. **Attach custom SMTP.** Project Settings → Authentication → SMTP Settings.
2. **Raise the rate limit by hand.** Authentication → Rate Limits → emails per
   hour. Supabase leaves it at 2 after you attach SMTP.

Do only the first and the wall is still there.

Two things you get free with custom SMTP, both already written and both
currently unreachable:

- **A mail somebody has read.** `docs/email-templates/magic-link.html` is the
  replacement for Supabase's stock template, and the box is **read-only until
  SMTP is attached**, so until then the mail a host receives is the stock one.
  That gap is what killed the six-digit code: it was built in the app and in the
  template on the assumption that the template was live, and for months it was
  not. The code came out on 20 September — `docs/email-templates/README.md` has
  the whole account. Do not reintroduce anything the app depends on into that
  file without applying the file in the same change.
- **A way in that cannot silently break.** The link travels through
  `redirect_to`, which is silently replaced by the Site URL if the address is
  not on the allow-list — 200, mail sent, dead link, no trace anywhere. Nothing
  removes that risk; what the app does instead is make it readable, by printing
  the address it asked for on the sign-in sheet in every build (B86). While you are out of the store and
  people are running this in Expo Go, the code is the reliable half, and it is
  the half you do not have yet.

---

## What blocks other people starting their own groups

Exactly two gates. Both deliberate.

**1. Signups are closed.** `sendSignInLink` passes `shouldCreateUser: false`
(`apps/mobile/src/lib/supabase.ts`). An address nobody invited by hand in the
dashboard gets no account and no email. One word.

**2. An anonymous account may not own a book.**

```sql
create policy book_host_all on book
  for all to authenticated
  using (host_user_id = auth.uid() and not is_anonymous_caller())
```

`is_book_host()` carries the same guard, so it covers every host policy. This is
why a member who claimed a seat cannot become a host: they *are* an anonymous
user. The guard is correct — an anonymous account is unrecoverable, and a book is
somebody's money — so the answer is not to remove it. The answer is to give that
user a real credential while keeping their user id, which is the piece that does
not exist.

**There is no `updateUser`, no `linkIdentity` and no OAuth anywhere in the app.**
A member is anonymous for ever, on one handset.

### The consequence worth knowing now

A member who loses their phone loses their claim. There is no credential to
restore, and `create_player_invite` refuses a claimed seat. The recovery is
host-mediated: `revoke_player_invite` releases the seat (`claimed_by_user_id`
back to null, ledger untouched) and the host issues a new code. Fine for six
people who know each other. Not fine for strangers.

---

## What "full blown" is still missing

Beyond the two gates:

- **No second writer for the group — but a night can be passed.** Since
  `0016_pass_the_book.sql` a night's writer is `session.writer_user_id`, moved by
  a ten-character code or by the host taking it back, so somebody else can record
  tonight. The group itself still has one host: a **co-host** who can start
  nights and edit the roster on their own still needs a `book_host` join table
  and the book-level host policies re-pointed at it.
- **No account upgrade.** Anonymous → email, keeping the user id.
- **No account deletion**, no sign-out-everywhere. Both wanted before a store.
- **Anonymous users accumulate**, one per device, for ever, with **no captcha**.
  Harmless at eight people; a thing to abuse the day signups open.
- **Book creation is implicit.** `ensureBook()` in `sync.ts` creates a book from
  the local group's name on first sync. Pleasant for one host; check what it does
  on a phone that already holds several local groups before opening signups.

---

## Options for sign-in

### A — Custom SMTP, keep the magic link and the code

Attach Resend (or Postmark, SES, Brevo — Resend is what the templates and the
checklist already assume), raise the rate limit, paste the template, fix the
redirect list.

- **Cost:** about half an hour, one DNS record pair, no code, free tier in the
  low thousands of emails a month.
- **Unblocks:** the wall and editable templates.
- **Against:** email is still in the critical path, and `exp://` redirect
  addresses still rot. The mitigations are the address printed on the sheet and
  the confirmation URL written out as text in the mail — not a code.

### B — Sign in with Apple and Google

`signInWithIdToken` against a native token. No email in the path at all, so no
rate limit, no deliverability, no `redirect_to` fragility.

- **Cost:** OAuth client setup, and **Apple needs a real build** —
  `expo-apple-authentication` does not run in Expo Go, and no build has been made
  yet. Google over `expo-auth-session` does work in Expo Go.
- **Note:** offering Google without Apple is not allowed in the App Store, so
  these arrive together or the store rejects it later.
- **Best end state.** Not the fastest one from here.

### C — Email and password

Supabase supports it directly. With *Confirm email* off, registration sends no
mail at all and only a password reset ever does.

- **Cost:** small, no DNS, no build.
- **Against:** anyone can register any address unconfirmed, and the sign-in
  screen argues against passwords in its own comment — *"one more thing to have
  forgotten since last month"*, at a kitchen table, one-handed. Taking that back
  is a product decision, not a technical one.

### D — Extend the ten-character code to hosts

Lean on the primitive that already works and let a device key own a book.

- **Cost:** low, and it reuses tested machinery.
- **Against:** it means deleting the `is_anonymous_caller()` guard, and then a
  lost phone is a lost group with no recovery for anybody. **Do not do this as
  the only credential.** It is defensible only as a first step with an upgrade
  prompt behind it, which is option B or C wearing a hat.

### E — Phone / SMS

Costs money per message, worse abroad, and is a second deliverability problem
rather than a fix for the first. Not recommended.

---

## Recommended plan

**Phase 0 — remove the wall. No code, today.**
The seven steps in `docs/auth-test-period.md`, of which 4, 5 and 6 are the ones
that matter here: custom SMTP, **raise the rate limit separately**, paste
`docs/email-templates/magic-link.html`, fix the redirect URLs. Step 6 is the one
to test first: the redirect list is what decides whether a link that was sent
successfully lands anywhere, and it is the only failure in this flow that reports
itself as a success.

Nothing below is worth starting until this is done — every one of them is tested
by sending an email.

**Phase 1 — let other people in. Small, in this repository.**

1. **Open signups behind a gate of your own.** `shouldCreateUser: true` alone
   opens the app to the internet while it is unlisted and uncaptcha'd. Better: a
   host invite code you hand out, checked before the OTP call, so you keep a
   closed door with a key you can copy. The `isNotInvited` copy on the sign-in
   screen already says the right sentence and would be re-pointed at it.
2. **Account upgrade, anonymous → email.** `supabase.auth.updateUser({ email })`
   keeps the user id, so a member keeps every claimed seat and stops being
   anonymous — which is precisely what `book_host_all` is asking for. No policy
   change. This is the single change that turns a member into someone who can
   start their own group.
3. **Check `ensureBook` on a multi-group phone** before either of the above ships.

**Phase 2 — when you make the first build.**
Apple and Google sign-in together; co-host via a `book_host` table; account
deletion; captcha on anonymous sign-in; a cleanup job for stale anonymous users.

---

## Open questions for you

- **Co-host or not?** "Share access to the group" reads to me as a second person
  who can *record* a night when you are not there. Today that person can only
  read. If that is what you meant, it is a schema change and belongs in Phase 1,
  not Phase 2.
- **Who may start a group?** Anyone with the app, or anyone holding a code from
  you? This decides whether Phase 1 step 1 is one word or a small feature.
- **Passwords: yes or never?** The sign-in screen has an argument written into it.
  Worth settling before Phase 2 rather than during it.
