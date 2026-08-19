# 14 · The invite and watcher set — X2, C3, X1

Rev 15, 14 August 2026. Drawing: `screens-invite-and-watcher.html` — eighteen frames, every dimension, weight and colour inline on the element. Chrome per `09-navigation.md`; tokens per `07-design-tokens.md`; the night these screens draw is the one in `13-after-the-night.md`.

Nothing here is a new mechanism. Invites issue and redeem, a code binds somebody to the member row already carrying their nights, and a share link opens a live read-only feed — all of it on `main`. What was missing was the drawing, and a string for every state the code can already reach.

---

## 1 · The decision: X1 is a push, not a root

**Option 2 from the brief.** X1 is a pushed screen inside the app the reader already has, and there is no watcher install.

The only thing that would make X1 a root is a phone with no book on it, and nothing in the product needs one. An account buys exactly one thing — seeing the group from your own phone — which means a club root with your groups in it, which is the host root. A second root would mean specifying a first run, an idle state and an app name for a persona `03-data-model.md` does not have.

So a share link opens the club root and pushes the night on top of it, and the back button returns to the club exactly as it does from Tonight. **This supersedes the "Root, for a watcher's install" row in `09-navigation.md`.** Depth is unaffected: club → night is one level, same as club → Tonight.

One consequence, named rather than drawn: a reader with **no** app follows the same link in a browser. That is the same projection with X2's standalone header instead of Chrome A — no back button, because nothing is behind it. Same body, same feed, same read-only band. A container swap, not a screen.

X2 keeps its own classification: **standalone, no chrome.** It arrives from a link, the reader has not been anywhere, and there is nothing to go back to — no chevron, no grabber, and deliberately no close.

Corrected classification table rows:

| Screen | Container |
| --- | --- |
| X1 Watcher · read-only, live | **Push (Chrome A)** — back → the club |
| X1c Watcher · a night that has ended | **Push (Chrome A)** — back → the club |
| X2 Claim your place | Standalone, no chrome (unchanged) |
| C3 Invite a player | Sheet over Players (unchanged) |
| C3 QR, C3 reset | **The same sheet, content replaced** — not a second sheet |

---

## 2 · The set, in order

| | Screen | Container | Leads to |
| --- | --- | --- | --- |
| X2a | Checking the code | Standalone | X2b or X2c |
| X2b | Ready — whose place it is | Standalone | the club root |
| X2c | Dead code — unknown, spent, revoked, expired | Standalone | X2d |
| X2d | Typing a code by hand | Standalone | X2a |
| C3a | Invite a player — the code shown large | Sheet over Players | C3c, C3d |
| C3b | Already claimed | Sheet over Players | C3c |
| C3c | Reset — the old code dies | Same sheet, content replaced | C3a |
| C3d | QR | Same sheet, content replaced | C3a |
| C3e | Blocked — offline or signed out | Sheet over Players | — |
| X1a | Watching a live night | Push (Chrome A) | — |
| X1b | Refused by a share link | Standalone | — |
| X1c | A night that has ended | Push (Chrome A) | — |

**The QR is not a sheet over a sheet.** Two sheets is the floor and it is reserved for a player sheet raising an amount keypad. A QR is the same invite shown another way, so it replaces the sheet's content and keeps the same close — exactly as the rule editor does. Swiping down from the QR leaves the whole sheet.

---

## 3 · Strings

Copy is final and a missing string gets flagged rather than invented. Every string I wrote to make a frame drawable is **PROPOSED** — a draft, not a decision. Replacing them does not move the layout. The full table with sources is in the drawing; the summary:

**Decided, use verbatim.** "Claim your place" (S16) · the three statements on X2 · "12 nights on the book · $5 / $5 · Saturdays at …" · "Read-only. Only Marek can write to the ledger." · "You, Lena · in $1,000 · 2 buy-ins · counted at the end" · "kept by Marek · 3h 17m" · "You bought in" · "anyone with the link can join · expires in 7 days" · "Add by name only · no app needed" · the name-only sentence.

**Proposed, needs your sign-off.** X2b's plan block — the night-count sentence, all three plan descriptions, "Claim your place" / "Claim your place and start {plan}" (names and prices themselves are decided) · X2a checking · the `{host} added you as {name}` line · the nights-behind-the-name meta · the X2b primary · "Not Petr?" · all of X2d · C3's code eyebrow and binding sentence · the claimed sentence · the whole reset warning · the QR pair · C3e's offline pair and its signed-out twin · X1's four labels · X1c's settlement pair.

Two primaries, not one: `02-screens.md` gives **"Join the group"**, which is right for the group-wide link where there is no name to claim. The per-player link can name the act — drawn as **"Claim your place as Petr"**.

### The dead-code line

**One string, four causes.** Unknown, already spent, revoked and expired all render X2c: same title, same sentence, same single control, same layout, same response time.

> This invite can't be used.
> Ask whoever invited you for a new link.

Nothing on the screen names the group, the host, the inviter, or the code that was tried — each is a fact a guesser would be paid for. This is a security property, not a copy preference, and three build requirements go with it:

1. **One error shape on the wire.** No cause code the client can read, and no field that differs in length or presence between the four.
2. **Constant response time.** Pad all four to the slowest path, or the timing is the tell — a revoked code that resolves a member row is otherwise measurably slower than an unknown one that does not.
3. **No cause in any client-reachable log.** Server-side logging keeps the distinction; nothing returned to the device does.

X1b is the same line in the share-link voice ("This link isn't live. / Ask whoever sent it for a new one."). **Recommendation: govern it by the same rule.** A live-feed URL is as enumerable as an invite code.

### The code itself

**Ten characters**, shown and entered as two groups of five (`K7M4X P29QT`). The alphabet excludes **I, O, 0 and 1** — a code gets read down a phone, and those four are what gets misheard. Geometry rides on both facts: C3a's hero size and X2d's two fields.

---

## 4 · Per screen

**X2a · Checking.** No back, no close, no chevron. Progress is a 2px hairline with a 38% foreground segment — no spinner glyph, no logo. **Hold a minimum of 400ms** even when the answer is instant, or a good code reads as a flash of an error screen. Resolves to exactly two places: X2b or X2c. A network failure is retried behind this screen and only becomes X2c when the server has actually spoken.

**X2b · Ready.** Card order is deliberate: who you are (name, nights) → hairline → what you are joining. The nights come first because they are the surprise; the reader expects an empty account. **Nothing is claimed until the primary is tapped** — opening the link is idempotent, the code is burned on tap. Claiming: the primary keeps its label, drops to `opacity .55`, hairline progress under it; never a full-screen spinner, because the card behind it is the thing being confirmed. **Done lands on the club root**, this group already selected, no interstitial and no confirmation screen — the roster with their name in it *is* the confirmation, and if a night is live the root shows it live.

**X2b · The plan offer.** Below the statements, under a hairline: one sentence drawn from the reader's own night count ("Four nights are already under your name. Free shows the last three."), then one list sorted ascending: **Free $0**, **Regular $2.49/mo**, **Full $9.99/mo**. Free is row one and drawn as *already yours* — muted name and price, an outline check instead of the filled selection tick, and an `INCLUDED` tag — so the paid rows read as upgrades from it. **Nothing paid is ticked by default** — Free is the only marked row, so the primary reads "Claim your place" and becomes "Claim your place and start Regular" only once a paid row is tapped. A plan is something the reader adds, never something they have to notice and remove. The claim is identical whichever row is selected — the member row attaches, the nights attach, Free shows the last three. If payment fails the claim still happened.

This is why the offer sits here rather than on a P-screen: it is the only moment in the product where the gate is a number the reader has already read on the screen above it. Regular is the tier that answers that sentence, and the sentence is left to say so rather than a pre-ticked box saying it for them; Full would be selling a group to somebody who has just joined one.

**On the sort order.** Ascending, and deliberately not the anchor-high pattern. Anchoring from $9.99 down works when the reader has no reference price — this one has $0, already owned and stated in the sentence above the list. Reading down from the ceiling puts the most expensive and least relevant row first and buries the plausible one in the middle. Ascending reads as current state → the step that fixes the sentence → the ceiling, which is the order the reader's own situation is already in. With nothing paid pre-ticked, the sentence above the list carries the recommendation on its own and the order does the rest.

> **Scope flag.** This contradicts `01-product-logic.md` §4 — "Build none of it. No tiers, no payment, no locked states, no upsell sheets." The block is **drawn but not scheduled**: the §4 seam holds, the policy module still returns `true` for everything in v1, and X2b ships without the plan block until membership is in a build. Names and prices follow the 12 Aug revision (Free / Regular $2.49 / Full $9.99), not §4's older $4 / $9.

**X2c · Dead code.** Covered above. One control, and it is **secondary**: there is no primary act available, and a filled button would imply there is. Vertically centred with a 40px optical lift, since there is no chrome above it to hang from. A wrong code typed into X2d lands here, **not** an inline field error.

**X2d · Typing a code.** Two 62px fields, 10px gap, second focused (2px foreground border, caret 2 × 26). `700 24px` monospace, letter-spacing `.14em`, uppercased on entry. Primary disabled until ten characters are in — card fill, muted label, no keyline. The system keyboard is uppercase and ASCII; the dashed block in the drawing is a placeholder, not a design.

**C3a · Invite a player.** The code is the hero: `800 34px` Display, letter-spacing `.05em`, tabular, centred, with a `700 11px .1em` eyebrow above and one muted sentence below. It is not a field and not tappable text — Copy is a control. Four share chips in one row (`1.5px` outline, 18px glyph over an `11.5px` label, equal flex), order fixed: Copy, Message, Share, QR code. The group link is a **separate section below a hairline**, not an alternative treatment of the same thing: it carries the 7-day expiry and creates a row on join, where a per-player code attaches to a row that already exists. "Add by name only" is **dashed** — dashed always means it creates something. Reset is outline, never filled, and **never red**: colour is money in this app.

**C3b · Already claimed.** Green `CLAIMED` pill after the title, code dropped to muted, share chips in their disabled outline, claim date stated. The group link stays live — different mechanism, not spent. (If a green status pill offends the "if something is coloured, it is money" rule, it degrades to the neutral pill used for OFFLINE; the pill is a status, not a figure.)

**C3c · Reset.** Replaces the sheet's content and keeps the same close. The warning states three things in order: what stops working, that it cannot be undone, what takes its place. The dying code is shown struck through with a `DIES ON RESET` tag, so the host can check they are killing the code they think they are. Confirm is outline, escape is a text action. No hold-to-confirm — that is reserved for ending a night; a reissued code costs one message.

**C3d · QR.** White in both themes, 250 × 250 with a 210px live area: a dark-inverted code is a scanning risk on cheap cameras. Raise brightness while shown and hold the screen awake. The ten characters repeat underneath at `700 17px` — a QR with no typable fallback is a dead end when the camera will not read it.

**C3e · Blocked.** **States before the tap, not after.** Where the code would be, a dashed placeholder says why there is no code; the share chips are present but disabled, so the host sees what will be available rather than watching controls appear. **Add by name only stays live and says so** — that path is local, and it is the honest answer to "I need this person in tonight's ledger now". The signed-out twin is the same frame with one string swapped.

**X1a · Watching a live night.** Chrome A verbatim: 36px round back to the club, title `800 32px/1`, **WATCHING** status pill after the title, meta at `padding 8px 20px 0 68px`, right corner empty. The pill is **not** the LIVE badge — 999px belongs to the host's live badge alone; this is a 7px status pill in card fill. **Your seat first, and it carries no result:** live, nobody knows. "counted at the end" beneath it is what stops a reader looking for their number. Then the table's two figures, then the feed — second person for their own rows at `600` foreground against `500` muted for everyone else's; the weight difference is what makes their own night findable in a long feed.

*On the missing action bar:* the screen terminates in a hairline-topped read-only band pinned with `margin-top:auto`, occupying the space a dock would. It ends in a statement instead of a control, which is the honest shape, and nothing floats in a void. The band carries the decided line verbatim, `400 13px/1.45` muted, left-aligned — never centred like a caption, never inside a card.

**X1b · Refused.** X2c's geometry with one line changed, and no control at all: there is no code to type for a watcher link.

**X1c · A night that has ended.** `SETTLED` pill replaces `WATCHING`, the meta gains the player count, the title is the night rather than "Tonight". Their own card leads with the net at `800 28px` in green, then the working: in, out, result, bill, back, piggy bank — bill and piggy bank in **bone**, money that left the table. The bill row names the rule ("by size of win") because a watcher cannot ask the host what the split was at 00:52. The settlement block is tinted with the win wash, says what they are owed, then who does the marking: **a watcher never marks a payment paid** — no control, only the sentence. The table's results follow, ranked, tinted per net (M1), the watcher's own row labelled **You** at `700`. Others' figures are shown because the book is shared; nobody else's calculation is.

---

## 5 · Sample data, and the S62 re-derivation

**The host is Marek and the group is the poker club** in all eighteen frames. `02-screens.md` §09 uses Ivo as the inviter and "Saturdays at Ivo's" as the venue; both are sample data, and the string is the pattern `{host} added you as {name}`. Marek is chosen because the one verbatim line in this set already names him, and because it lets X1 and X1c draw the canonical night from `13-after-the-night.md` rather than a second invented one. Ivo stays a player at that table, which he is.

X1a is that night at 23:22, mid-flight: $5,000 in, six players, Dana cashed out at 23:15, Lena in for $1,000 across two buy-ins. The feed sums to the $5,000 in the strip.

**X1c uses the S62 split — by size of win**, which is the re-derivation S75 asked for. The $170 bill across wins of 1,620 / 460 / 430:

| Player | Gross | Bill | Back | Piggy bank | Net |
| --- | --- | --- | --- | --- | --- |
| Dana | +1,620 | −110 | — | −81 | **+1,429** |
| Marek | +460 | −31 | +120 | −23 | **+526** |
| Lena | +430 | −29 | +50 | −22 | **+429** |
| Tomáš | −500 | — | — | — | **−500** |
| Ivo | −780 | — | — | — | **−780** |
| Petr | −1,230 | — | — | — | **−1,230** |

Largest remainder gives 110 / 31 / 29 and sums to exactly 170. Nets sum to **−126** — the piggy bank is still the only money that leaves the table. **This disagrees with the E-series frames on purpose:** they draw the older even split (57/57/56) and S75 has them flagged. Neither sentence may be hard-coded; the rule name comes from the session snapshot.

---

## 6 · Not drawn, and two questions the drawing cannot answer

Not drawn: the watcher's **browser container** (X1a's body with X2's header — specified in §1) · the **group-wide arrival** (X2b, primary "Join the group") · the **signed-out invite** (C3e, one string) · a **watcher on an empty table** (T5 read-only; the feed label and the two figure cards need an empty treatment and I have not chosen one).

**Does a per-player code expire?** The 7-day expiry is specified for the group link only. C3a is drawn with no expiry line and a binding sentence instead. If per-player codes do expire, that sentence gains a clause; X2c already covers the cause.

**What does Reset do to an already-claimed code?** C3b is drawn with Reset live because S6 names it the only control in that state — but a claim has already attached the member row to an account. If reset is meant to detach that, it is an unbinding and needs its own confirmation copy. If it is not, the control should be disabled with the reason stated.
