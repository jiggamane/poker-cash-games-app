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

Paste the file, whole, into the box. Save. Send yourself one and read it on a
phone rather than in the dashboard's preview — the preview renders markup that
several mail clients do not.

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
