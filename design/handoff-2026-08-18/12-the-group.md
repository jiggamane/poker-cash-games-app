# 12 · The group — clubs, roles, and where a game gets its settings

Rev 13, 13 August 2026. Screens: `screens-group.html` (GR1–GR8, verbatim markup) and
`design/Groups Section.dc.html` (the board, with the navigation map and the open decisions).
Chrome is the confirmed one — `08-tonight-home.md` § *H1* and `09-navigation.md`.

Everything here belongs to a **group** rather than to one evening: what it is, who is in it, and what
the host has set. **Admin-only, and reached from Home — never from inside a live session.**

---

## 1 · What a club is

A club owns four things and nothing else: **a name and a currency**, **a roster**, **money rules**,
and **a history of nights**. It does not own a night in progress; a night is a child that copies what
it needs at birth and then lives on its own.

One person can be in several clubs, with a different standing in each. Switching club swaps
everything below Home: the roster, the nights, the rules, the book. **Your groups (GR2) is the only
cross-group screen in the app.**

### Standings

| Standing | Has the app | Can play | Can edit |
| --- | --- | --- | --- |
| **Admin** | yes | yes | everything: rules, roster, nights, the exits |
| **Member** | yes | yes | nothing — reads the club and their own history |
| **Name only** | no | **yes** | nothing — they are seated, counted and settled by the admin |

Standing is per club. The same human can be admin in one and a name in another.

**Name only is a first-class player.** They are bought in, rebought, counted and settled exactly like
a member; the app is how somebody *sees* the club, not how they join it.

### The roster, and the order of naming and inviting

One list, no pending section. Standing is a badge on the row — `ADMIN`, plain member, `NAME ONLY`, or
`INVITED` while a link is out.

1. **The admin adds a player by name.** They exist immediately and can play that same evening.
2. **Only then can a link be sent**, from that player's own sheet (GR5 → GR6). It is *their* link:
   single-use, tied to that roster row.
3. **Opening it hands them the name they already have** — every night of theirs already in the book
   becomes theirs — and promotes them from Name only to Member.

There is no generic group invite, no join-request queue, and no pending-members list. Every
outstanding invite is visible as a badge on a roster row, so the counts on GR4 and GR7 are simply how
many rows carry it.

**Renaming and removing** both happen in the player sheet. Removing somebody stops them appearing when
players are seated and **keeps every night they played** — the ledger keeps what they already played,
always. Any unsettled amount stays on the night it came from.

---

## 2 · Where a game gets its settings

This is the part the extended logic turns on. Four layers, each reading from the one above:

| Layer | What it is | Where |
| --- | --- | --- |
| **Club default** | Currency, default buy-in, bill split, rounding, piggy bank charge, who collects, who pays in. Set once. | GR7 Settings, GR8 Money rules |
| **Last game** | What the previous session actually ran with, *including anything the host overrode that night*. | carried forward automatically |
| **This game** | Opens pre-filled from the two layers above. Anything can be overridden for tonight alone. | the house rules sheet inside the night |
| **Settled night** | The night is computed against the values it ran with, frozen at that moment. | immutable |

Precedence, top to bottom: **this game → last game → club default → app default.**

Three consequences a developer must implement literally:

- **A night copies, it does not reference.** When a session opens, snapshot every rule onto it. A
  later change to the club must not alter a running night, and must never alter a settled one.
- **The last game's overrides become the next game's suggestion**, not the club's setting. If the host
  ran a $1,000 buy-in one Friday, next Friday offers $1,000 and the club default stays $500 until
  somebody changes it in Settings.
- **Nothing on a bill or piggy bank screen computes a share while a night is running** — see
  `11-bill-and-piggy-bank.md`. The rules are what the club and the night carry; the arithmetic runs once, at
  settle-up.

### Setting up a game

Because every rule arrives pre-filled, **starting a game is adding players and their first buy-ins.**

1. From Home, with no night running, the card is the setup entry point.
2. The setup shows the inherited rules as a **summary, not a form**: buy-in, bill split, piggy bank. One row
   opens the house rules if something needs changing — a rare path, and it must not be the default one.
3. The host picks who is playing from the roster and confirms each first buy-in. The default amount for
   each is the inherited buy-in; per-player amounts are editable at that moment.
4. Confirming opens the night and lands on Tonight (`T1`). The night now owns its rules.

The first night in a brand-new club is the only one that has to be set from nothing, and even then the
app defaults fill every field.

---

## 3 · The screens

| ID | Screen | Container | Notes |
| --- | --- | --- | --- |
| GR1 | Club home | **Root** — no back button, ever | Name + 38px avatar, meta, one card, four rows: My nights, Players, Settings, Your groups. Card carries the running-time tag when a night is live. |
| GR2 | Your groups | Push | Standing on every row; a live night elsewhere shows as green meta. Tapping switches club and returns Home. |
| GR3 | New group | Sheet, 3 steps in place | Name, currency, default buy-in; players and rules can be skipped. A group needs only a name. |
| GR4 | Players · the roster | Push | One list, badges for standing. Primary: **Add a player by name**. |
| GR5 | Player · edit | Sheet over the roster | Name, standing, **App → Invite**, piggy bank switch, their nights, Remove (red outline). |
| GR6 | Invite this player | **Replaces GR5's content** | Per-player single-use link, what they get on accepting. |
| GR7 | Settings | Push | Four sections: the group, the money, the people, the exits. Money and exits are admin-only. |
| GR8 | Money rules | Push from Settings | Club defaults for bill and piggy bank. Deepest route in the section — two pushes below root. |

Navigation rules that govern the section, in full, are in `09-navigation.md`; the board draws the map.
The short form: Home is the only screen without a back button; two pushes below it at most; a sheet
never pushes; multi-step sheets replace their own content and keep one close.

Specified, **not drawn**: the **Leave the club** and **Delete the club** confirm sheets.

---

## 4 · Open — needs a decision before this ships

1. **Can a club have two admins?** The single-manager rule covers who controls a *night*, not who
   administers the club between nights. GR7's "hand over admin first" assumes one admin and a transfer
   step that has not been designed.
2. **Leaving and deleting.** Can you leave with an unsettled debt? Does deleting a club destroy nights
   other people played in? Does anyone but the last admin get to delete at all?
3. **The book.** `09-navigation.md` lists a club-level ledger of every night; GR1 has My nights, which
   is the reader's own history. If the club needs a shared ledger it is a fifth row and an undrawn
   screen.
4. **My stats vs My nights.** Both are classified as pushes off Home and lead to the same history. One
   has to absorb the other.
5. **Default bill split.** Still open from rev 12 (S62): the confirmed default is *by size of win*,
   while the worked night in `04-money-math.md` divides evenly. No drawn screen is affected; the doc is.
