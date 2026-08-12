# The Poker Club — build handoff

A home-poker host keeps the money for a cash game on paper or in their head, and at the end of the night everyone argues about who owes what. This app is that piece of paper, done properly.

One person — the host — writes down every movement of money as it happens. Everyone else watches the same list on their own phone, read-only. When the night ends the app counts the table, applies the group's money rules, and states who pays whom in as few transfers as possible. Nights add up into a month, and months into a book.

It is not a tournament app. There is no clock, no blind levels, no eliminations. A session has a start time, an end time, and a list of timestamped money events in between.

---

## Start here

**`CHANGELOG.md` — read it before anything else.** It is cumulative and **nothing in it has been applied yet**: rev 8 (the session screen rebuilt as one list, one dock, one card per player), then rev 7 (in-game nav, rebuy default), then the 12 August delta. Each section names what it supersedes and carries the answers to the open money-rule questions.

**`08-tonight-home.md`** is the full specification of the live-session screen and the player screen behind it. It replaces the session screens in `02-screens.md`. Build the session from that file, not from `02`.

## Read these in order

| File | What it is |
| --- | --- |
| `README.md` | This. Scope, constraints, and the one thing to do before writing code. |
| `01-product-logic.md` | Every feature, every rule, every edge case. The reasoning behind each step. |
| `02-screens.md` | All 53 screens: purpose, contents, controls, states, where each one goes. |
| `03-data-model.md` | Schema, the append-only ledger, sync, offline, identity. |
| `04-money-math.md` | The arithmetic worked through with real numbers, plus the rounding rules. |
| `05-build-order.md` | What to ship in what sequence, and what to leave out. |
| `06-test-checklist.md` | What the closed-circle round has to survive. |
| `07-design-tokens.md` | Colour, type, shape, spacing, button rules. |
| `08-tonight-home.md` | **The session screen, in full.** H1–H5: the table, the dock, the player card, the hold-to-end. Supersedes `02`'s N1/N1b/N1c/N2/N3. |
| `design/` | The design files themselves. Reference, not production code. |

---

## Before you write any code

**Recommend a stack and wait for approval.** One page, then stop. Cover:

1. **Platform.** Web app installed to the home screen, Expo/React Native, or native. The design is drawn for iPhone (402 × 874 pt) and follows iOS navigation conventions, but watchers open a shared link on whatever phone they own — an app-store-only build makes the watcher case expensive. Say what you would pick and what it costs.
2. **Where the ledger lives** and how it syncs. Money correctness outranks everything.
3. **Offline.** A session runs three to five hours in someone's kitchen on bad wifi, one writer, up to a dozen readers. The host's phone must keep accepting entries with no signal and reconcile when it returns. Propose the queue and the conflict rules.
4. **Identity.** The model is settled (see `03-data-model.md` § Identity) — propose the credential mechanism under it: what a person is authenticated by with no passwords and no registration screens, how a link survives being pasted into a group chat, and how one person is recognised across two groups.
5. **Rough monthly cost** at 100 groups, and what changes at 10,000.

Where a decision depends on something not settled in these docs, say so and state the default you would pick. Do not start building until the pick is approved.

---

## Constraints for this build

**No registration and no paid accounts.** The app is being tested inside one closed circle. Nobody signs up, nobody pays, nothing is gated.

The designs include a membership tier system — Free, Tier 1 at $4/mo, Full at $9/mo — drawn across screens P1–P5, S1, G5. **Build none of it.** Build the screens' *content* where they are also useful without tiers (the sessions list, my stats), and skip the tier, plan, upsell and locked-state screens entirely.

But do not paint yourself into a corner. Every place where a tier would gate something, call a single policy module:

```
can(actor, 'host_session' | 'see_session' | 'see_full_history' | 'edit_group' | 'settle') -> boolean
```

In v1 every call returns `true`. When tiers arrive, the rules land in one file and no screen changes. The gating rules the design implies are written down in `01-product-logic.md` § Membership so the policy module has somewhere to grow into — implement the interface, not the rules.

**Sync model:** host writes, everyone else reads via a share link, and the host's device works fully offline with a queue that syncs on reconnect.

**Identity:** a player is a name in the host's book first and an account only later. The host adds someone by name, generates a link for that specific person, and activation binds them to the row that already exists — their name and history are there when they arrive. Nobody needs an account to play. The full model is in `03-data-model.md` § Identity; what you propose is the credential mechanism underneath it.

---

## What "done" looks like for the test round

The host opens a night on their phone, logs buy-ins, rebuys, an expense and cash-outs across a real three-hour game, counts the table at the end, applies the rules, and reads out who pays whom. Two or three other people follow along on their own phones through a link. Nothing is lost when the wifi drops. The settle-up figures are correct and, when re-derived from the ledger, identical.

---

## About the design files

The files in `design/` are **design references created in HTML** — prototypes of intended look and behaviour, not production code to copy. Recreate them in whatever environment gets approved, using its established patterns.

**Fidelity is high.** Colour, type, spacing and copy are final for every screen listed in `02-screens.md`. Each screen is drawn at 402 × 874 (iPhone logical points), in both a dark and a light theme. Exact values are in `07-design-tokens.md`.

To open them: put `support.js` beside the `.dc.html` files and open them in a browser. The boards are wider than a viewport by design — pan horizontally. Screens are grouped in sections; the dark variant sits above its light twin.

The session screens live in `design/Tonight Home.dc.html`; everything else in `design/Screens - *.dc.html`.

**Copy is final. Do not rewrite the strings.** Every label, caption and explanatory line in the designs was written deliberately, several of them to defuse an argument at the table. If a string is missing for a state that is not drawn, flag it rather than inventing one.

---

## Two known errors in the sample data, one decision taken

The drawn screens use example numbers. Two of them disagree with each other; both are set out in `04-money-math.md` § Contradictions:

1. **N2 (feed) shows Petr's 22:03 rebuy as $1,000; N3 (his player page) shows $500.** $500 is right — his total of $1,500 across three entries only works that way.
2. **O7/B6 have Lena opted out of the kitty tonight, but E3 charges her $22 of it.** Those screens are drawn from different sample nights. E2/E3/E4/E6 are one self-consistent night and are the authoritative example.

A third disagreement — who is paid back for the bill — has since been **decided and redrawn**: each person who fronts part of a bill is reimbursed exactly what they fronted, and still pays their own share. B4, E3, E4 and E6 all reflect this. The reasoning and the arithmetic are in `04-money-math.md`.
