# Handoff: The Poker Club — a cash-game ledger

> **This file is the FIRST handoff, kept for its scope and design language.**
> The screens have moved on since. Dated bundles sit beside it, newest last, and
> each one's own `CHANGELOG.md` says what it supersedes:
>
> - **`handoff-2026-08-13/`** — current. Adds rev 7 (the action dock, the
>   per-player rebuy default) and rev 8 (the session screen rebuilt as one list
>   with no tabs and no feed, specified in full in `08-tonight-home.md`, drawn
>   in `design/Tonight Home.dc.html`). **None of it has been built yet.**
> - `handoff-2026-08-12/` — superseded, kept so the diff is readable.
>
> `docs/screen-specs/` is regenerated from the newest bundle's boards by
> `python3 scripts/extract-design.py`. Build against those measurements.

## What I need back from you

**A recommendation and a build plan for the technical infrastructure.** Not UI code yet. Specifically:

1. **Platform** — one recommendation with reasoning: iOS-first native, cross-platform (React Native / Expo, Flutter), or web-app-first installed to the home screen. The design is drawn for iPhone (402 × 874 pt) and follows iOS navigation conventions, but watchers open a shared link on any phone.
2. **Backend and data** — where the ledger lives, how it syncs, what the schema looks like. Money correctness matters more than anything else here.
3. **Realtime and offline** — a session runs for 3–5 hours in someone's kitchen, often on poor wifi, with one writer and up to a dozen readers on other phones. Propose the sync model (polling, websockets, a hosted realtime DB, CRDT/queue, etc.) and how the host keeps writing when the network drops.
4. **Identity** — players are not necessarily app users. The host adds people by name. Watchers should be able to open a link without signing up. Propose how accounts, invites and claiming a name work, and what the minimum is for v1.
5. **Money integrity** — an append-only ledger with edits and corrections, integer-only arithmetic, and a settlement calculation that must be reproducible and auditable. Propose where the calculation runs (client, server, both) and how history is stored.
6. **Phasing** — a v1 that one group could use this month, then what follows. Include what you would deliberately leave out.
7. **Cost and operations** — rough monthly running cost at 100 groups and at 10,000, plus what would need to change between those two points.

Where a decision depends on something not settled here, say so and give the default you would pick.

---

## Purpose

A home-poker host keeps the money for a cash game on paper or in their head, and at the end of the night everyone argues about who owes what. This app is that piece of paper, done properly.

**One person — the host — writes down every movement of money as it happens. Everyone else can watch the same list on their own phone, read-only.** When the night ends the app counts the table, applies the group's money rules, and states who pays whom in as few transfers as possible. Nights add up into a month, and months into a book the group can close and start again.

It is not a tournament app: there is no clock, no blind levels, no breaks, no eliminations. A session has a start time, an end time, and a list of timestamped money events in between.

## Key mechanics

**The session.** Created with stakes, a default buy-in, a seat count and a start time. Every entry afterwards is stamped, and the host can back-date an entry for a hand that already happened.

**The ledger.** An ordered, timestamped list. Entry types: buy-in, rebuy (presets are the buy-in, double, quadruple, or a custom amount), cash-out when a player leaves, and a shared expense such as food or drinks. Each entry has an amount, a player (except expenses, which have a payer), a timestamp and an optional note. Entries can be corrected; corrections must remain visible in history.

**Two views of the same night.** A chronological feed, and a totals view with no times at all — how much is in play, and who bought in for how much, sorted by most money in first. One player's page shows their total for the night and each individual buy-in with its time.

**Ending the night.** The host enters a final chip count for everyone still seated; players who already cashed out keep the amount they left with. **Counted chips must equal the money left on the table before the flow can continue** — the mismatch is shown until it is zero. Each player's gross result is their count minus everything they bought in for.

**Money rules (the interesting part).** A group can define rules that take money off the table at settle-up — never during play. A rule is:
- an **amount**: a percentage (presets 5 / 10 / 15, or manual) or a fixed sum;
- a **basis**: percentage of the gross win, or of the net win after other rules;
- a **charge**: winners only (off their net win), or everyone at the table, flat;
- a **destination**: a shared bill, a group kitty that carries over, a host fee, or the next game's pot;
- a **collector**: exactly one person who physically holds that money. **The collector need not be playing, or even present** — the group's treasurer may never sit at the table. They appear in settle-up as a payee.
- Bills can be split equally between winners, in proportion to the size of each win, or across everyone.
- Rules are named and renameable ("Kitchen & drinks", "Group kitty"). Amounts are whole units — no cents, no rounding settings.

**Settlement.** After deductions, debtors are matched to creditors largest-first, producing a small set of transfers ("Petr → Dana $1,230"). Collectors are payees like anyone else. The result is editable if the room decides differently, and the total leaving the table is stated plainly ("$296 leaves the table: $170 back to Marek, $126 to Radka").

**Rollups.** Per session, per month, and per book — a book is opened once and closed manually by the host, which freezes its totals and starts a new one. Nothing is deleted. A player's own standing across the book is a first-class screen.

**Roles.** Host (the one device that writes), players (read-only view of the live ledger; they see their own money and everyone else's), collector (a name that receives money, may not be a player).

## Screens that exist in the design

Home in three states (first run, idle, live), the session overview, the ledger as feed and as totals, one player, the buy-in/rebuy sheet, opening a session (settings → seats → money rules) with the rule editor and the collector and player pickers, and closing a night (count up → deductions → settle up) plus the settled summary. Both a dark and a light theme.

Not designed yet: the book screens in the new style (month, all time), notifications, the watcher's own onboarding, anything about multiple groups per person.

## Design language, in one paragraph

Two themes — near-black (#0A0A0B) and white — with **no brand accent hue at all**. Actions are carried by fill and weight: one filled primary button per screen with a 2 px keyline set inside the fill, secondaries as 2 px outlines, destructive as an outline only. That leaves colour free to mean money and nothing else: green for a win, red for a loss, bone for money leaving the table. 8 px corners on everything pressable, 14 px on cards, hairline rows rather than nested boxes. System font (SF, with Figtree as the web fallback), tabular numerals on every figure, whole units with no cents. **No tab bar** — the club is the root, the session and the book are pushed on top, and every pushed screen carries a labelled back plus a home glyph. `Style Guide v2.dc.html` has all of this drawn at ship size.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes of intended look and behaviour, not production code to copy. Recreate them in whatever environment you recommend, using its established patterns.

**Fidelity: high.** Colours, type, spacing and copy are final for the screens listed above. Every screen is drawn at 402 × 874 (iPhone logical points). The exact values are in the style guide rather than repeated here.

To view them, open the `.dc.html` files in a browser with `support.js` beside them. Both boards are wide by design — pan horizontally. `Cash Game v2.dc.html` is organised newest-first: the top sections are the current design, the ones below are the exploration history and can be ignored. `Cash Game Board.dc.html` is the earlier, superseded visual direction, included only because its screens cover a few flows the new style has not reached yet (the book, the watcher's view).

## Files

- `Cash Game v2.dc.html` — current designs, newest sections at the top
- `Style Guide v2.dc.html` — colour, type, buttons, rows, shape and navigation rules
- `Cash Game Board.dc.html` — earlier direction; reference for flows not yet redrawn
- `support.js` — runtime needed to open the files
