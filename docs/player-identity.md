# What a player is authenticated by

`03-data-model.md` § Identity settles the model and hands four questions back:
what a person is authenticated by, how the link behaves, how one person is
recognised across two groups, and what happens on a second phone. This answers
those four.

**The model is not in question here.** A player is a name in the host's book
first and an account only later, if ever. The host generates a link bound to one
member row; opening it attaches a person to the row that already exists. No
sign-up form, no name entry, no "which of these are you?" picker. Everything
below is about the credential underneath that, and nothing below changes the
ledger — activation is purely additive.

---

## What the credential has to do

Four jobs, and they pull in different directions:

1. **Cost nothing at the table.** A regular opens a link between hands. Anything
   with a form, a password or a wait for an email is a thing they do later,
   which means never.
2. **Survive a lost phone.** The point of an account is seeing your own nights;
   an account that dies with the handset is a worse promise than no account.
3. **Be one person across two groups.** `G4 My stats` says "across every group
   you play in". That only works if two activations resolve to one identity.
4. **Cost us nothing**, and keep costing nothing at a hundred groups.

Nothing satisfies all four at once. (1) argues for no credential at all and (2)
and (3) argue for a real one, which is the whole tension.

---

## The options

| | At the table | Lost phone | Two groups, two phones | Cost | Fails when |
| --- | --- | --- | --- | --- | --- |
| **A · Device key only**<br>anonymous account on the handset | Nothing to do. One tap. | **Gone.** Host must re-issue. | **No.** Each device is a different person. | £0 | Never — there is nothing to fail |
| **B · Magic-link email** | Type an address, leave the app, come back | Sign in again | Yes | £0 up to ~3k/mo | Mail is slow, spam-filtered, mistyped; the whole flow depends on a third party |
| **C · Apple / Google sign-in** | One tap, no typing | Sign in again | Yes | £0 (needs the Apple account you need anyway) | Only in a real build — impossible in Expo Go |
| **D · Passkey** | One biometric | Yes, if synced to iCloud/Google | Yes | £0 | Supabase has no first-class support; you would be building it |
| **E · Phone / SMS** | Type a number, wait for a code | Yes | Yes | **Per message, forever** | Costs real money at exactly the moment it succeeds |
| **F · A, upgradeable to B or C** | Nothing to do. One tap. | Gone until upgraded, then fine | After upgrade, yes | £0 | Same as A, then same as B or C |

Two of these are quickly dismissed. **E** is the only option with a per-use cost,
and it buys nothing the others do not. **D** is the best credential on paper and
the worst thing to build first — Supabase has no supported path, so it would be
bespoke auth code in a money app, which is the last place to write bespoke auth
code. Revisit when it is a toggle rather than a project.

**B alone** is what the host already uses, and it is fine for one person who
signs in once a month at a kitchen table. Requiring it of every player multiplies
the one failure this app cannot debug from here: an email that does not arrive.
Six players is six chances for "I never got it", each of which lands on the host
mid-game.

---

## Recommendation: F — anonymous at activation, upgradeable when it matters

**Activation costs nothing.** Opening the invite creates an anonymous Supabase
user on that phone and binds it to the member row. The player sees their name,
their nights and their net immediately, exactly as X2 promises, and is asked for
nothing at all. This is the same mechanism watchers already use, so it is built
and tested.

**The upgrade is asked for at the only two moments it is the obvious thing to
do**, and never before:

- **A second group.** Opening another host's invite on a phone that already
  holds an identity binds to the same person automatically — same device, same
  user. It is only when the two groups are on two *phones* that we have to ask,
  and by then "so your nights add up together" is a sentence that explains
  itself.
- **A new phone.** The prompt writes itself: their nights are on the old handset
  and they want them here.

**Upgrading keeps the user id**, so every night already attached stays attached.
Supabase converts an anonymous user in place by adding an email or an OAuth
identity to it — there is no second account and no merge. *(Verify against the
SDK version pinned in `apps/mobile/package.json` before building: it is the one
assumption in this document that is a fact about somebody else's library rather
than about us.)*

**Which upgrade** depends on where we are: email while the app runs in Expo Go,
because OAuth needs a real build and a registered redirect. **Sign in with Apple
the moment there is a standalone iOS build** — one tap, no typing, no mail to
fail, and Apple requires it anyway once any other third-party sign-in is
offered. Google for Android at the same time. Email stays as the fallback that
works everywhere.

---

## The other three answers

### Link properties

**Single-use, seven days, re-issuable by the host.** The design draws seven days
on C3 and per-player links should follow it.

Single-use is the important half. A per-player link is a seat with somebody's
history behind it, and it will be pasted into a group chat — assume that, as the
design says. Reusable, it becomes a credential anyone in the chat can spend.
Single-use, the worst case is that the wrong person in a trusted room claims a
seat once and the host re-issues, which is recoverable and visible.

Re-issuing rotates the token, exactly as `revoke_share_access` already does for
watchers. The host needs no new concept: it is the control C3 already draws.

### Cross-group identity

**One person is one Supabase user; a member row per group points at it.** The
schema already has the hook — `player.claimed_by_user_id`. Two invites activated
on the same phone resolve to one user because the anonymous session is already
there. Two invites on two phones resolve to one user **only after an upgrade**,
because that is the first moment anything portable exists.

There is deliberately no name matching, ever. "Petr on my phone is probably the
Petr in your book" is exactly the fuzzy merge the design's model was built to
avoid, and it is unfixable once it guesses wrong about money.

### The second phone

**It asks** — which is what X2's own copy says it does: *"This link is yours
alone. Opened on a second phone, it asks…"*.

Three cases, in the order they will happen:

1. **Upgraded already** → sign in; everything is there. Nothing to explain.
2. **Not upgraded, still has the old phone** → upgrade there first, then sign in
   here. One sentence of guidance.
3. **Not upgraded, phone gone** → the host re-issues the link. Their nights were
   never lost, because the member row is the host's and always was; only the
   binding is remade.

Case 3 is the honest cost of a credential that asks for nothing, and it is
survivable precisely because the ledger never depended on the player's account.

### On the device

The session lives where the host's already does — `AsyncStorage`, via the
Supabase client.

Worth naming: AsyncStorage is not encrypted, so an unlocked, lost phone gives up
a session that reads one group's nights. For a home game that is proportionate.
`expo-secure-store` is the upgrade when there is anything to protect worth more
than a list of who won on Thursday, and it is a small change: one storage
adapter, no flow changes.

---

## What this is not

No passwords, anywhere, ever. No registration screen. No email required to play,
watch, or be in the book. A player who never installs anything stays a full
participant in the ledger for years — that is the model, and none of the above
touches it.
