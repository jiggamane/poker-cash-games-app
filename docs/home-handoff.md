# Club home — what the handoff asked for, and what shipped

The club-home handoff (states H1–H9, the type scale, the spacing table, the
dock and the acceptance checks) is applied. This file is the other half of it:
the decision it asked to be written down, the places the app could not honour a
rule and why, and the strings that were chosen rather than read off a board.

Everything here was rendered from the built app at 393 × 852 in both themes —
`npm run ui`, then `node scripts/ui-check.mjs shot /`.

---

## § 0 · The typeface, decided

**SF Pro ships. No web font is loaded, and the fallback stack is gone.**

`apps/mobile/src/design/tokens.ts` is the one place it is set, and it sets it by
setting nothing: leaving `fontFamily` undefined gives the platform's own face,
which is SF Pro on iOS. There is no per-screen stack anywhere in the app, and a
second family that could win is the thing the decision exists to prevent.

Consequences, stated so nobody has to rediscover them:

- **The boards' widths are still not facts on Android**, which falls back to
  Roboto. Loading a family there is not a one-liner — Android will not
  synthesize weights from one bundled file, so every weight has to be loaded and
  named separately, and every type token gains a `fontFamily`. It is a known
  gap, not a licence to load Figtree on one screen.
- `scripts/ui-check.mjs --figtree` still paints Figtree. That is a preview of
  what bundling it would do; the build does not load it.
- The letter-spacing values in the handoff's scale were set by eye for SF Pro,
  which is what ships, so they are used as given.

---

## What shipped

| | |
|---|---|
| Type scale (§ 1) | Every role in `type`: `groupLabel` 13/400, `homeTitle` 30/800/1.06, `cardTitle` 21/800, `cardMeta` 13/400, `cardStatus` 11/700 caps +.1em, `destination` 21/800, `destinationSub` 12.5/400, `secondary` 15.5/700, `homeDock` 13.5/600. Nothing on the screen is below 12.5 except the tracked uppercase 11. |
| Spacing (§ 2) | `home` in the same file, measured from the safe-area inset: 26 / 5 / 20 header, 20 and 22 gutters, card 14·18·16 (18 top when idle), 9 inside (7 idle), 20 down to the rows, rows 17 + 4 + 17, dock 13/16 with 8 and 10, 4 off the foot. |
| The spacer | One `flex: 1` between the row list and the dock, and it is the only flexible thing on the screen. Rows are intrinsic. |
| Dock (§ 3) | Two content-width pills, labels always visible, never a tab bar and never icon-only, plus the 44pt theme button at the right end of the same row. A member sees Settings and the theme button — the invite is removed, not disabled. |
| Theme button | New: `src/lib/themeStore.ts` remembers the choice, `useTheme` prefers it over the phone, and the icon shows the theme you will get. Present in every state including loading and offline. |
| Colour (§ 6) | Applied, including two new tokens — `disabled` and `dockFill` — and four corrected values: `amber`, the light `hairline`, both `dashed`, and the live green on the inverted card (`onFillWin` → `#0E8A4F`). |
| Elapsed (§ 5) | `just opened` under a minute, `3h 17m`, and days past 99h. Tested in `elapsed.test.ts`. |
| Money (§ 5) | The club's currency symbol, thousands separators, tabular, no decimals — `formatMoney` already did this; the screen now passes the club's own symbol rather than assuming `$`. |
| Empty values | `—`, never `0`. |
| No mid-word breaks | Nothing sets `break-all`, `overflow-wrap` or `break-word` anywhere in the app; the club name wraps to two lines and ellipsises, every other string truncates on one. |

### States

**All nine.** H1 idle · H2 one game live · H3 two or more, one card each,
newest first · H4 a live table beside one still counting · H5 brand-new club ·
H6 long names and big numbers · H7 player-not-host · H8 first paint (skeletons
in the exact geometry the card will take) · H9 offline.

---

## What the app could not honour

### ~~Two games at once~~ — done

The store held **one** night, so H3 could not be drawn and the start affordance
was hidden while a game was on. That is fixed rather than documented now:

- `night` rows carry a `table_name`, and the store lists every unsettled one
  (`useOpenGames`), each read and resolved **through the engine** so the seat
  count on a card cannot disagree with the screen it opens.
- `openNightById` swaps which table every screen below home is about, so a card
  is a choice rather than a guess.
- `startNight` adds a table instead of replacing one, and settles the names
  first: while there is one game it is "Tonight"; the moment a second opens,
  the first becomes "Main table" and the new one is named by the host. The rule
  is `renamedForSecondTable` / `tableNameProblem` in `whichNight.ts`, asserted
  in its tests, because two cards with money on them and the same name is the
  one outcome nobody could recover from.
- The setup sheet no longer refuses. Its "A night is already running" button is
  gone; it asks what this table is called instead.
- `setStatus('counting')` stamps `ended_at`, so the unsettled card can say when
  the game stopped rather than when it started.

**Still true:** the ending flow and every screen below home operate on the one
night the store is holding. That is now a deliberate rule — a table is chosen on
home and everything after is about that table — rather than an accident.

### The timer does not freeze offline — H9

H9 freezes the elapsed figure and labels it "WAS PLAYING · 3H 17M AT 23:22".
That is right for a table the reader is watching from another phone: with no
connection the figure is a guess, and a guess presented as current is what the
rule forbids.

**A host's own night is not a guess.** It is a timestamp in the database on the
phone in their hand, and the clock on that phone keeps running. Freezing it
would print a figure the app knows to be wrong. So home shows the banner, states
when the app last reached the server, and keeps counting. The freezing belongs
on the watcher screen, where the data really does come from somewhere else.

### Stakes are a buy-in, not blinds

H1 and H3 state stakes as `$5 / $5`. This app has a buy-in and no blinds at all,
so the card states the buy-in the night was opened with. Blinds would be a rule
on the club and a column on the night; nothing in the money math wants them yet.

---

## Strings chosen rather than read

The board was not part of the handoff, so these were written to the rule rather
than copied off a frame. Each one is a place to check against `H*`:

| Where | Shipped | Why |
|---|---|---|
| H7 eyebrow | `Hosted by <name>` | The rule says "eyebrow names the host" and gives no string. |
| Table names | `Tonight` → `Main table`, then whatever the host types | Both words are the board's own; which of them applies when is the rule above. |
| Sessions sub-line | `every night you played, most recent first` | The app's existing string for the same destination. |
| Unsettled card meta | `started 23:14 · 2 still to count` | "N still to count" is the count-up screen's own phrasing. |
| Offline, never yet connected | `No connection · reconnecting` | The quoted banner states a saved time; before the first successful reach there is none, and inventing one would be the stale figure the state exists to prevent. |

`You'll set the buy-in and blinds once, here` (H5) ships **verbatim as given**,
and it promises a control that does not exist: this app has a buy-in and no
blinds. Copy is the designer's call, so it is not edited here — but it is wrong
on this build until either the string changes or blinds do.

---

## Acceptance checks

Run at 393 × 852 in both themes.

| # | Check | Result |
|---|---|---|
| 1 | `Thursday Night Home Game Society of Vake` | Two lines, no mid-word break. Ellipsis is set and not needed at this length. ✅ |
| 2 | Long table name | The card title truncates on one line; the status label is never allowed to. ✅ |
| 3 | Six seated, six rows reachable | Home states the count; the list is the session screen's. ✅ |
| 4 | No row shorter than 74pt | 75pt of content plus its hairline. The 1 over comes from a 22 line box on a 21 title, which is the 1.05 the app uses everywhere to keep a descender inside its box. ✅ |
| 5 | Two games live | Both cards named and equal weight, "Start another game" still present. ✅ |
| 6 | Live plus unsettled | Both cards visible, Settle up reachable from the amber card, starting another still allowed. ✅ |
| 7 | `₾128,400` | Symbol comes from the club, no shrink-to-fit anywhere. ✅ |
| 8 | `14h 08m` and `just opened` | Both fit the status line without wrapping. ✅ |
| 9 | Airplane mode | Banner with the saved time, invite disabled, timer honestly still running — see above. ⚠ |
| 10 | Cold launch | Skeletons occupy the card's exact geometry; nothing below moves when data lands. ✅ |
| 11 | Non-host | No start affordance at all; Settings and the theme button remain. ✅ |
| 12 | Theme button | One tap flips it, icon shows the target theme, same position in both. ✅ |
| 13 | 44 × 44 | Pills 44 tall, theme button 44 square, rows 75. ✅ |
| 14 | No `break-all` / `overflow-wrap` / `break-word` | None in the app. ✅ |

## One thing changed that the handoff did not ask for

`Icon`'s `settings` glyph was a circle with eight rays — a sun in everything but
name. That was harmless while it was the only round glyph on the screen and is
not harmless now that it sits in the same dock row as a theme button whose whole
job is to be a sun. It is a cog now, at the same size and stroke. If the board
draws it differently, the board wins.
