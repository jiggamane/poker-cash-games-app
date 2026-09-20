# Prompt: a board for the sign-in sheet

**Why this file exists.** `/sign-in` is drawn by no board. It is one of three
screens in the app whose every string and every dimension was invented at the
keyboard — `/auth-callback` and `/claim` are the others — and `docs/screens.md`
flags all three rather than passing them off. That was tolerable while sign-in
was a form with a field in it. It is less tolerable now: on 20 September the
six-digit code came off the second stage (B87), which leaves a screen whose
whole job is to say *the thing you need is not here, it is in your email* — and
that is a composition problem, not a form.

Paste the block below into the design tool. It asks for **one screen, two
states**, in the app's existing system, and it deliberately does not ask for a
re-think of anything else. Read `docs/bugs.md` B87 first if you want the
argument behind the constraints; the prompt carries the conclusions.

**Keep the copy block in sync with `apps/mobile/app/sign-in.tsx` before reusing
this.** Every string below is what the build currently says, and the point of
handing them over is to have them replaced by better ones — not to have them
silently diverge.

---

```text
I need a board for one screen of the poker cash-game ledger app: the host's
sign-in sheet, in its two states. It is the only screen in the product that has
never been drawn, and it has just changed shape, so this is a new board rather
than a delta.

Work inside the existing system — Style Guide v2, rev 18 geometry, the six
boards. Do not introduce a colour, a radius, a type size or a component that is
not already in it. If the screen seems to need one, it almost certainly needs a
different weight or a different amount of space instead, and I would rather be
told that than given a new token.

## WHAT THE SCREEN IS FOR

The host is the only account in this product. Players are names the host types
and watchers hold a share link, so nobody else ever sees this screen. There is
no password: the host types an email address, we send a link, they tap it, the
app opens signed in.

That makes the second state unusual and it is the reason I need a designer on
it. **The action is not on the screen.** The host has to leave for their mail
app, and the sheet's job is to be confident about that — to say clearly that
something is on its way, that it will bring them back here, and what to do in
the two cases where it does not arrive. Every screen in this app is about money
at a table. This one is the door, and it is the only screen a person can be
stuck on with no way forward.

## THE TWO STATES

STATE 1 — "Sign in"
  A sheet with one text field (Email), one explanatory line above it, and one
  primary button in the footer: "Email me a link". Blocked until the address
  looks like an address. This state is nearly right already; draw it so the
  second one has something to be consistent with.

STATE 2 — "Check your email"
  The same sheet, its content replaced (a multi-step flow replaces one sheet's
  content and keeps one close — it never pushes). It holds, in some order you
  decide:

  a. Confirmation that a link is on its way, naming the address it went to.
     The address is user input and can be long; it must not truncate into
     something a host cannot check for a typo.
  b. What to expect: open it on this phone, it brings you back here signed in,
     it works once and expires shortly.
  c. THE FALLBACK. If the button in the email does nothing — which happens, and
     silently — the email also prints the same web address as plain text
     underneath it, and pasting that into a browser on the phone signs you in
     exactly the same way. This is the only thing standing between a host and
     being locked out of the product, so it cannot read as fine print. It also
     must not shout so loudly that it makes the ordinary path look unreliable.
     That balance is the single hardest thing on this board and it is most of
     why I am asking.
  d. A diagnostic line, currently at the very bottom: the literal redirect URL
     this build asks for, under a small "Redirects to" label, with a sentence
     saying it must appear in a setting in our server's dashboard. It is for
     me, not for the host — but it has to be on the screen in every build,
     because it is the only visible evidence of a failure that otherwise
     reports itself as success. Tell me where a line like that belongs on a
     screen a normal person also reads. I am not attached to its current
     position or to its label.
  e. An error line, when the send fails. Four things can be said here: the
     address was never invited to the test, there was no signal, too many
     emails have been asked for, or the server refused the build's key.
  f. Footer: a primary "Send another link" and a secondary "Use a different
     email".

## THE ONE PIECE OF BEHAVIOUR THAT NEEDS DRAWING

The primary in state 2 spends a 60-second cooldown. For that minute it is
disabled and its label counts down — currently the literal string
"Send another link in 43s". I need this drawn properly, and I have two
questions about it:

  - Is a counting label right, or should the wait live somewhere other than
    inside the button? It is the only button on the screen, and a host who
    cannot get in will look at it.
  - We have a "blocked" button variant already (a primary that is present but
    not yet available). Is that the correct variant for a button that WILL
    become available on its own in under a minute, or is the difference between
    "you have not finished filling this in" and "wait" worth drawing?

## HARD CONSTRAINTS — these are shipped and not up for redesign here

- It is a SHEET, Chrome B: grabber, close in the corner, swipe down. Never a
  round back button, never anything else in the top-right. The two chrome
  vocabularies are what tell a person whether to swipe or tap back and they
  must not mix.
- Sheet geometry is doc 15 §3 exactly: radius 26 26 0 0, grabber 38×5, header
  padding 12/22 with the title at 32/800 tracking −.03em, close a 30 circle,
  footer padding 14 20 6 with buttons at 17 vertical padding, radius 8, 17/700.
  Reserved bottom block 82. A sheet hugs its content and never scrolls as a
  whole — if the body does not fit, the sheet goes full-height and only the
  body scrolls.
- Type scale as shipped: body 17/500, lede 14.5/400 at 22 line, footnote
  12.5/400 at 19 line, caps label 11/700 at +1.1 tracking.
- NO BRAND ACCENT, and this matters here. Green and red mean money won and
  money lost, in this app and nowhere else. Nothing on this screen is money, so
  nothing on it is coloured except an error, which is the loss colour. Emphasis
  is carried by fill, weight and space.
- Both themes. The light theme is not "white everywhere" — white is a surface,
  not the ground.
- 393 × 852 is the reference frame; it must also hold at 320 wide and at the
  largest accessibility text size without any figure or address clipping.

## COPY

Every string below is invented — no handoff has ever drawn a sign-in, so there
was nothing to reach for. I would like them rewritten. The house voice is plain,
specific, and never apologises; several labels elsewhere in this app were
written to defuse an argument at a table, and the same register applies to a
person who cannot get in.

  Title 1:   "Sign in"
  Above:     "Only the host signs in. Players are names you type, and watchers
              open a link."
  Field:     "EMAIL" / "you@example.com"
  Hint:      "No password. We email you a link that signs you in."
  Button:    "Email me a link"

  Title 2:   "Check your email"
  Line:      "A sign-in link is on its way to {address}."
  Line:      "Open it on this phone and it brings you straight back here,
              signed in. It works once and expires shortly, so if it goes
              stale, send another."
  Fallback:  "IF THE BUTTON DOES NOTHING" / "The email prints the same address
              as text underneath it. Paste that into a browser on this phone —
              it signs you in the same way."
  Diagnostic:"REDIRECTS TO" / {url} / "This must appear in Supabase →
              Authentication → URL Configuration → Redirect URLs."
  Buttons:   "Send another link" · "Send another link in {n}s" ·
              "Use a different email"
  Errors:    "That address has not been invited yet. The app is in a closed
              test, so the host has to add you before a link can be sent."
              "No answer from the server, so no email has gone out. Try again
              when there is signal."
              "Too soon after the last one. You can send another in {n}
              seconds."

If a state I have not listed needs a string — and I would rather be told one is
missing than have one invented — flag it instead of filling it in.

## WHAT I NEED BACK

1. A board for both states, at 393 × 852, in the same format as the existing
   six: every dimension, weight and colour inline on the element, so it can be
   copied rather than re-derived.
2. Both themes.
3. A short note on anything you deliberately departed from in the existing
   system, and why. That note gets recorded in docs/screens.md against this
   screen, so it is read.
4. Your answer to the two cooldown questions above, and to where the diagnostic
   line belongs.

## WHAT I AM NOT ASKING FOR

Anything on any other screen. No change to the sheet object itself, to the
tokens, or to the navigation vocabulary. If this screen makes you want to
change one of those, say so separately — an app-wide change has to run on its
own, with nothing else in flight.
```

---

## For whoever applies the result

The board lands in `boards/`, and `docs/screens.md` gains a row saying
`/sign-in` is held against it. Two things must survive whatever the board says,
because they are bugs that were fixed and will otherwise come back:

- **The *Redirects to* line is on screen in every build**, not behind `__DEV__`.
  That is B86, and `authLink.test.ts` goes red if the guard returns.
- **No code field, and no `{{ .Token }}` in the email template**, unless custom
  SMTP is on and the template has been pasted into the dashboard in the same
  change. That is B87, locked by the same test.
