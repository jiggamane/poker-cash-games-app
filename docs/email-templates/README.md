# The emails

Supabase sends them, from strings stored in its dashboard. Nothing in this
repository is deployed to that box and nothing in this repository can read it —
`npm run check` cannot see these files, `check:ui` cannot see them, and no
session running in the cloud can reach `supabase.co` to look. **They are kept
here so that the mail a host receives is something somebody has read**, which is
the whole of what this folder is for.

| File | Dashboard box |
|---|---|
| `magic-link.html` | Authentication → Emails → **Magic Link** |

⚠ **THE BOX IS READ-ONLY UNTIL CUSTOM SMTP IS ON.** Supabase gates template
editing behind it: without SMTP the page shows *"Set up custom SMTP to edit
templates — emails will be sent using the default templates"*, the Subject and
Body are greyed out, and **Save changes** does nothing. So step 4 of
`docs/auth-test-period.md` is not optional and is not merely about rate limits —
it is what makes this folder applyable at all. Until it is done the project
sends Supabase's stock magic-link mail, which carries a link and **no
`{{ .Token }}`**, so the code field on the sign-in sheet has no code to be
given.

Then paste the file, whole, into the box — the **Source** tab, not **Preview**.
Save. Send yourself one and read it on a phone rather than in the dashboard's
preview; the preview renders markup that several mail clients do not, and says
so itself.

**Whole includes the comment at the top.** It is an HTML comment, so it does not
render and costs a reader nothing, and it is the only way the rule below reaches
somebody editing that box who has never seen this repository. That person is who
put a deep link in the `href`.

---

## The rule that this folder exists to hold

**The `href` of a link in these templates is `{{ .ConfirmationURL }}`, always.**

Go's `html/template` renders these, and it will not emit an `href` whose scheme
it does not recognise as safe. `http` and `https` are safe. `exp://` and
`pokerclub://` are not, and when it meets one it writes the literal string
`#ZgotmplZ` in place of the URL — silently, with nothing in any log. What ships
is a **button with no link in it**, which is B66 and is exactly how it was
reported: *"the link didn't work — the button didn't have a link in it."*

`{{ .ConfirmationURL }}` is `https://<ref>.supabase.co/auth/v1/verify?token=…
&type=magiclink&redirect_to=…`. It is https, so the sanitiser passes it. The
app's deep link rides inside it as the `redirect_to` **parameter**, where it is
just text; Supabase verifies the token and then issues the redirect to
`pokerclub://auth-callback` from a real HTTP response, which is a hop no mail
client takes part in.

So: never `{{ .RedirectTo }}`, never `{{ .SiteURL }}`, and never a deep link
written out by hand, in the `href` of anything.

The same rule reaches the **Site URL** setting, for the same reason and one
box along: Authentication → URL Configuration → **Site URL** must be an
`http(s)` address. It is what a link falls back to when a redirect is not on the
allow-list, and a custom scheme there puts one back into the mail by the side
door. It is fine that it points nowhere useful — this app has no website — as
long as it is https.

**But it was not what happened in B66, and the way that was established is the
part worth copying.** The sanitiser explains the reported symptom perfectly, it
is documented, and it was wrong: the project had never edited its template, so
its `href` was Supabase's own and https throughout. A mechanism that fits a
symptom is not evidence that it occurred. Read the actual mail first — the table
below is thirty seconds and it beats any amount of reasoning about what *could*
blank a link.

## Reading the fault out of an email you already have

**Do this before anything else, including anything in this folder.** In the
sign-in email: Gmail → ⋮ → **Show original**, Apple Mail → **View → Message →
Raw Source**. Find the sign-in link's `href` and read it whole — the query
string is where the answer is, not the scheme.

| What the `href` says | What it means |
|---|---|
| `…/auth/v1/verify?…&redirect_to=http://localhost:3000` | **B66.** The app's `emailRedirectTo` was not on the allow-list, so the auth server swapped in the Site URL — no error, 200, nothing logged. Fix: Authentication → URL Configuration → **Redirect URLs**. |
| `…/auth/v1/verify?…&redirect_to=exp://…` or `pokerclub://…` | The mail is **right**. The fault is past it: whether the phone has an app for that scheme, or the callback route (missing until B66). |
| `#ZgotmplZ` | The sanitiser ate it — the rule above, broken, in the template or in a setting feeding it. |
| no `href` at all | The mail client stripped the anchor. The code is the answer, not the link. |

**`redirect_to` is the field to read, and it lies by omission.** An address the
project does not allow is not refused — it is silently replaced, and the mail
that results is well formed, correctly signed, and points at the wrong place.
The `exp://` address it should hold contains the dev machine's IP and the
packager's port, so it stops being true on its own: a different wifi, or 8081
already taken, and the link quietly reverts to sending the phone to a port on
itself. `/sign-in` prints the current one on itself in development so it can be
copied into that box each time — and the six-digit code exists because that is
not a thing anybody will remember to do every time.

## Why every one of them also carries a code

`{{ .Token }}` is the six digits, and it is in `magic-link.html` beside the
button rather than instead of it.

A link has to be agreed on by four separate systems: Go's sanitiser above, the
mail client's willingness to render an anchor, the project's redirect
allow-list, and the phone's idea of which app owns the scheme. **Three of those
four refuse silently.** What reaches the host is a button that does nothing, and
before B66 the sign-in sheet had no other way through — so a single silent
refusal anywhere in that chain locked the only account in the product out of it.

Six digits of text in the body of the mail agree with nobody. `verifySignInCode`
in `apps/mobile/src/lib/supabase.ts` spends them, the field is on the sign-in
sheet's *Check your email* stage, and `signInCode.ts` is the logic with the
tests on it.

## The invite email is not one of these

Testers are added under Authentication → **Users → Invite user**, and that mail
has a link in it too. It does not need to work, and it is deliberately not kept
here: an invite exists to make an address **known** to the auth server, because
`sendSignInLink` passes `shouldCreateUser: false` and an unknown address gets no
account and no email. Once the invite has been issued the tester uses the
ordinary sign-in screen. See `docs/auth-test-period.md`.
