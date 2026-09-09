# Getting the night out of the app

What a host can send to the group chat when the night is settled, in what
format, and what each one costs. Research, September 9 — no code was written for
it, and the last section is what it recommends building first.

**The finding that matters: the format was never the blocker.** Every figure the
night could be sent as is already on the engine, and the phone can already put
text and files into a group chat with no new dependency. What is missing is a
*destination* — `Share` has been drawn on three cuts and built on none, every
time because there was nowhere for it to point. That is a navigation problem,
not a formatting one, and it is answered at the bottom.

---

## What already leaves the app

Three things, and all three are proof the plumbing works:

| What | Where | How |
| --- | --- | --- |
| The nudge — who owes what, who is collecting | `app/nudge.tsx:74` | `Share.share({ message })` |
| The watcher's link | `app/settings.tsx:106`, `src/lib/shareLink.ts` | `Share.share({ message })` |
| An invite code | `app/invite.tsx:173,179` | `Clipboard.setStringAsync`, then `Share.share` |

So the OS share sheet is a solved problem in this repo, `expo-clipboard` is
already a dependency, and `nudge.tsx` is a working example of composing the
night's figures into a message that goes to WhatsApp. **A results share is the
same mechanism nudge already uses, pointed at a different set of rows.**

## What the design asked for and never got

- **`13-after-the-night.md:155`** — *"Close the session freezes the night. Share
  and Export are a secondary pair beneath."* Drawn on E4 in `4a`.
- **`docs/screens.md:2110`** — records both as still absent, and says why:
  *"Neither has anywhere to go — `/share` is one person's share of one rule,
  export is phase 4."*
- **`docs/screens.md:1294`** — R1's header draws `Back to Sessions · Share`;
  not built, because `09-navigation.md` is FINAL that a pushed screen has
  nothing in the top-right. *"Sharing a settled night has no door drawn
  anywhere else in the app."*
- **`app/settled.tsx`**, header comment — the 9 September session-views cut
  draws `Share` in the same corner and argues the slot is allowed. The nav rule
  won again.

Export is named exactly twice in the whole repository, both times as an
aspiration with no spec behind it: `build-plan.md:242` puts *"exports (CSV/PDF
of a closed book)"* in v3, and `pricing-model.md:93` makes it a Pro-tier row.
**Neither describes a format, a layout, or a file.**

Note the collision while you are here: **`/share` is taken.** It is the sheet
for setting one person's share of one bill. Anything built for sending the night
out needs a different route name, or that screen needs renaming first.

## What the engine can already hand a formatter

Nothing below needs new arithmetic. `packages/core` exports, tested:

- `settledRows(result, mode)` — the ranked list in either mode, with the terms
  on the row. What `/settled` draws.
- `resultFormula(result)` — the night's terms as a sentence: `game +$1,620 ·
  food −$54 · piggy −$23`. **This is already line-shaped**, which matters below.
- `resultTotals`, `offTheTable`, `gameResults`, `ruleOutcomes` — the closing
  figures and what each rule collected.
- `resultColumns` / `columnsFit` — the four-column decomposition.
- `freeze()` (`frozen.ts`) — the settled figures in a shape that survives being
  written down, with a round-trip test.

`receiptRows`, `resultRows`, `playerDeductions` and `ruleCollector` are
exported, tested and called from nowhere (`screens.md:1995` has them as
**Open**). A formatter is a plausible answer to what they were waiting for —
worth checking before deleting them.

**Whatever formats, formats through `apps/mobile/src/lib/money.ts`.** Core's
formatters take a currency symbol and default to a dollar; the app's re-exports
have no default and bind the book's own. `moneyScreens.contract.test.ts` already
forbids a screen importing a formatter straight from core, and an exporter is
subject to the same rule for the same reason — a club keeping its book in koruna
must not email a table of dollars.

---

## The formats

### 1 · Plain text, through the share sheet

`Share.share({ message })`. **No new dependency, and the pattern is already in
the repo three times.**

It lands in whatever the group already uses — WhatsApp, Telegram, iMessage,
Signal — which is the only distribution channel a home game actually has.

⚠ **Columns will not survive.** WhatsApp and Telegram honour a triple-backtick
monospace block; iMessage does not, and a proportional font turns an aligned
table into ragged noise. So the shape that survives everywhere is **one line per
player**, which is exactly what `resultFormula` already produces and what
`nudge.tsx` already sends. That is a happy accident and it should be used rather
than fought: the 1 September cut chose `game +$1,620 · food −$54 · piggy −$23`
as E6's row precisely because it reads as a sentence.

Copy is final (`CLAUDE.md`), and **no cut has ever written the strings for a
results message.** `nudge.tsx`'s grammar is the nearest thing that exists. New
strings here are a flag, not an invention.

### 2 · The clipboard

`expo-clipboard`, already installed, already used at `invite.tsx:173`. Same text
as above with no share sheet in the way. Cheapest possible thing that could
work, and the natural secondary next to a Share.

### 3 · A link to the night

Two very different links, and the repo currently only has the weaker one.

**3a · The deep link that exists.** `shareLink.ts` builds `…/watch?t=TOKEN` with
`Linking.createURL`. **It encodes how the host's own phone is running the app**,
so on somebody else's phone it points at nothing — `somebody-elses-phone.md`
says so outright, and that is why the invite flow is built on ten characters
rather than on a link. It also needs the recipient to have the app.

**3b · The link nobody has used yet, and the biggest unexploited asset here.**
The app is already published to the open web on every merge to `main`:

> **<https://jiggamane.github.io/poker-cash-games-app/app/>**

`.github/workflows/pages.yml` rebuilds it behind `npm run check`. That is a real
HTTPS origin, so `…/app/watch?t=TOKEN` is a link that **opens in any browser,
with no install and no Expo Go** — the one format that reaches a person who will
never install anything. It is the same screen, the same components, the same
engine.

Three things to settle before believing it:

- **The web build needs `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` as Actions secrets.** `bugs.md:798` and
  `screens.md:381` both record `apps/mobile/.env` not existing and the export
  therefore having no keys. Verify the Pages build, not the local one.
- **`/watch` is a live night; a shared result is a past one.** The token grants
  read-only access to a session, which is the right shape, but the screen a
  recipient should land on is `/settled`, not `/watch`.
- **A token in a URL is a bearer credential and a group chat forwards.** The
  blast radius is bounded — read-only, one night — but that is a decision to
  record rather than to discover.

### 4 · An image

`react-native-view-shot` (`5.1.0` in SDK 57's `bundledNativeModules.json`)
captures a view to PNG; `expo-sharing` (`~57.0.18`) or `Share.share({ url })`
sends it.

This is what hosts already do by hand, and a chat client treats an image better
than anything else — inline preview, no link rot, nothing to install, and the
whole design investment survives the trip. It is also the only format that
cannot be misread as editable.

Against it: nothing in it is selectable, searchable, or accessible, and a
screenshot of `/settled` is composed for a 402×874 phone frame rather than for a
chat bubble. A good share image is its own artboard, and **no board draws one**
— so this is the option that needs design before it needs code.

### 5 · PDF

`expo-print.printToFileAsync({ html })` → file URI → `expo-sharing.shareAsync`.
Both in the SDK 57 manifest (`expo-print ~57.0.1`).

Right for the record, wrong for the group chat — nobody opens a PDF on a phone
to find out whether they won. It maps exactly onto `pricing-model.md:93`'s
*"Export CSV / PDF of a closed book"*, which is the Pro-tier, book-level
artefact, not the end of one night.

⚠ **It takes an HTML string**, so the layout would be written a second time, in
a second language, next to the components that already draw it. Arithmetic still
comes off the engine — `CLAUDE.md`'s rule is not violated — but the *layout*
duplication is real, and `check:ui` cannot see a PDF at all.

### 6 · CSV

Written with `expo-file-system` (`~57.0.6`), shared with `expo-sharing`. Also
`pricing-model.md:93`.

The interesting question is CSV **of what**. The results table is already
readable on the screen it came from, so a CSV of it adds little. The thing no
screen in the app has ever shown is the one `screens.md:1999` records as
**Open** — *"which rebuy, which spend, at what time"* — an entry list, which no
board draws and which `/ledger` is explicitly not. An append-only ledger dumped
row-per-entry is genuinely additive, is the natural shape of a CSV, and needs no
layout decision from anybody.

### 7 · JSON, for machines

`freeze()` already produces the settled figures in a written-down shape with a
round-trip test, specifically because `rounding.positions` is a `Map` and a
`Map` stringifies to `{}` silently. If a backup or a host handover ever wants a
file, that function is the format and it exists. Not a sharing format for people.

---

## Availability, checked rather than assumed

Every module named above is in SDK 57's own `bundledNativeModules.json`, read
out of `expo@57.0.20` — which is the manifest `apps/mobile/AGENTS.md` requires a
version to come from:

```
expo-print              ~57.0.1
expo-sharing            ~57.0.18
expo-file-system        ~57.0.6
expo-clipboard          ~57.0.1   ← already a dependency
react-native-view-shot  5.1.0
```

⚠ **That manifest pins versions; it is not by itself proof Expo Go bundles the
native side.** The app reaches a phone through Expo Go today
(`docs/live-test.md`), so anything with a native half has to be confirmed on the
phone before it is designed around — `react-native-view-shot` most of all, being
the one third-party package in the list. `Share.share` and `expo-clipboard` need
no such check: they are already running in production paths.

## What to build first

**A destination, then a button — the same answer `screens.md:2115` gives for
`Full ledger`.** In order:

1. **A share sheet, reached from `/settled`.** `/settled` is a PUSH, so the
   corner stays empty and `09-navigation.md` is satisfied; a sheet that ends in
   a send is a sheet by `09-navigation.md`'s own test. Note `settled.tsx`'s
   footer already holds exactly one view-dependent button ("See the final
   result" / "Who pays whom"), so where the door goes is a real layout question
   and not a free slot. **The route cannot be `/share` — that name is taken.**
2. **Text and clipboard inside it**, off `resultFormula` and `settledRows`,
   formatted through `src/lib/money.ts`. No dependency, no native check, and it
   is the format the group chat actually wants.
3. **The web link**, once the Pages build's Supabase keys are confirmed and
   `/settled` accepts a token the way `/watch` does. This is the one that
   reaches people who will never install the app.
4. **Image, PDF and CSV after that**, and each needs something the repo does not
   have yet: a board for the image, a closed-book concept for the PDF, and a
   decision that the CSV is the entry list rather than the results table.

## Open

- **Copy.** No cut has written the strings for a results message. Everything in
  §1 would be new copy, which `CLAUDE.md` says to flag rather than invent.
- **Which screen a shared link lands on.** `/watch` is live-night; a result is
  a past night; `/settled` takes no token today.
- **Whether the token in a forwarded URL is acceptable**, and whether a shared
  night should be revocable the way Settings' *Stop sharing* revokes a watcher.
- **Where the door goes on `/settled`**, given the footer already has a button
  and the corner is closed by a FINAL rule.
- **Whether `receiptRows` and friends were waiting for this.** `screens.md:1995`
  says delete them or name the screen; a formatter may be the screen.
