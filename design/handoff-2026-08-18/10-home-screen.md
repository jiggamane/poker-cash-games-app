# Club home screen — states, type, and spacing

**Visual reference:** `Home Handoff Board.dc.html` — frames H1–H9, dark and light mirrors.
**Type evidence:** `Type Check.dc.html` — build screenshots at 1:1 next to specimens, with live width measurement.

This screen is the root of the app. It has no back button in any state. Everything below is a target
value, not a diff against current code: match the values, then run the acceptance checks at the end.

---

## 0 · Decide this first — the typeface

Every board file hands over `-apple-system, 'SF Pro Text', 'Figtree', sans-serif`. That stack resolves
to SF Pro on the Mac the designs are reviewed on and to Figtree (or whatever else is loaded) on
device, so **no width on any board is currently a fact**. The screenshots show the build is not
setting SF Pro.

Pick one and write it down:

- **If Figtree ships** — the boards get redrawn in Figtree so approvals happen against real widths.
  Keep the sizes below; re-tune the letter-spacing values, which were set by eye for SF Pro.
- **If SF Pro ships** — the build stops loading Figtree, and the stack becomes
  `-apple-system, 'SF Pro Text', sans-serif` with no web font.

Rules that hold either way:

- One family, one place. No per-screen font stacks, no second fallback that can win.
- Never use letter-spacing or font-size to make text fit a box. Fit is a layout problem.
- `font-variant-numeric: tabular-nums` on every figure, time, and count. Non-negotiable: money that
  shifts sideways as it ticks reads as a bug.

---

## 1 · Type scale (club home screen)

| Role | Size / weight | Tracking | Notes |
|---|---|---|---|
| Status bar time | 15 / 600 | 0 | Platform chrome |
| "Your group" eyebrow | 13 / 400 | 0 | Muted colour |
| Club name | 30 / 800, line-height 1.06 | −0.03em | Max 2 lines, then ellipsis |
| Card title (Start a session, Tonight, Main table) | 21 / 800 | −0.022em | Never wraps |
| Card meta line | 13 / 400 | 0 | Truncates with ellipsis |
| Live / status label (PLAYING NOW · 3H 17M) | 11 / 700, uppercase | +0.1em | Never wraps, never truncates |
| Row title (The group, My stats, Sessions) | 21 / 800 | −0.022em | Never wraps |
| Row sub-line | 12.5 / 400 | 0 | One line, truncates |
| Secondary row title (Start another game) | 15.5 / 700 | −0.01em | Never wraps |
| Secondary row sub-line | 12.5 / 400 | 0 | Truncates |
| Dock button label | 13.5 / 600 | 0 | Always visible, never icon-only |

Nothing on this screen is below 12.5pt. The 11pt status label is uppercase and tracked, which is why
it is legible at that size; no other role may use 11.

---

## 2 · Spacing and layout

Horizontal: content sits in a **20pt** gutter; the row list uses **22pt** so the hairlines are inset
from the cards above them. Both are fixed — they do not scale with screen width.

Vertical order, top to bottom, measured from the **safe-area inset** (not the top of the screen):

| Block | Value |
|---|---|
| Header top padding | 26 |
| Eyebrow → club name | 5 |
| Club name → first card | 20 |
| Primary card padding | 14 top / 18 sides / 16 bottom (idle card: 18 top) |
| Inside primary card | 9 between label, title, meta (idle card: 7) |
| Card → card, when two games are live | 10 |
| Card → "Start another game" | 10 |
| "Start another game" padding | 14 / 16 |
| Last card → row list | 18–22 |
| Row vertical padding | 17 top and bottom |
| Row title → sub-line | 4 |
| Row hairline | 1px |
| Dock row → screen bottom | 4 |
| Dock pill padding | 13 vertical / 16 horizontal, radius 999 |
| Dock icon → label | 8 |
| Pill → pill | 10 |
| Home indicator | 10 above / 9 below, bar 140 × 5, radius 3 |

### The one rule that fixes the loose rows

A row is **intrinsic height**: 17 + 21 + 4 + 15 + 17 ≈ **74pt**. It never stretches.

All leftover vertical space goes into **a single flexible spacer between the row list and the dock**.
The row list is `flex: 0 0 auto` and top-aligned; the spacer is the only `flex: 1` in the column.

The build currently spreads leftover space into the rows themselves (~70pt+ of padding per row in the
screenshots), which is what pushes content below the fold and makes a six-player table show five
rows. One spacer, one place for slack.

### Why the title broke mid-word

The night screen's title row is four children — back button, title, timer pill, start time — in one
flex row with the title allowed to shrink and break inside a word. At 393pt there is not enough room,
so it broke as "Toni / ght".

- Title and status pill: `flex: none`, `white-space: nowrap`.
- Start time: the only child allowed to truncate; it drops out entirely below 360pt.
- **No text in this app may break inside a word.** Never `overflow-wrap: anywhere`, never
  `word-break: break-all`, anywhere in the app.
- Once tables carry names, stack the title above its meta row rather than competing in one line
  (frame H6 shows the stacked treatment).

### Widths and hit targets

- Design and test at **393pt**, the narrowest supported width. The boards were drawn at 402; 393 is
  the number that has to work.
- Every tappable element is at least **44 × 44pt**, including the theme button and the chevron rows.
- Any flex child that contains truncating text needs `min-width: 0`, or it will refuse to shrink and
  push its siblings off screen.

---

## 3 · The dock — canonical, every state

Two content-width pills, left-aligned: **Settings** and **Invite a player**. Radius 999, padding
13/16, 8pt icon-to-label gap, 10pt between pills. Fill is a tint of the opposite colour:
`rgba(255,255,255,.08)` on dark, `rgba(12,13,15,.06)` on light. Labels are always visible.

Never a tab bar. Never full-width buttons. Never icon-only.

At the right end of the same row: the **theme button** — a 44pt circle, icon only, same fill as the
pills. One tap switches between dark and light, no menu and no trip to Settings. The icon shows the
theme you will get: sun while dark, moon while light. It is present in every state, including
loading and offline.

A power the reader does not have is **removed, not disabled**. A player who does not host sees
Settings and the theme button only.

---

## 4 · The states

Nine states, drawn as H1–H9 on the board in dark and light. For each: what triggers it, what the
screen renders, and what must never happen.

### H1 · Idle — nothing running

- **Trigger:** no open game in this club.
- **Renders:** primary card "Start a session" with last night's stakes inherited as its meta line
  ("$5 / $5 buy-in · same rules as last time"). Three rows. Dock.
- **Never:** a form before the tap. The stakes are inherited, and only editable after the session opens.

### H2 · One game live

- **Trigger:** exactly one open game.
- **Renders:** live card — status label with elapsed time, game name, "N at the table · the ledger is
  open". Below it, "Start another game" as a dashed secondary row.
- **Never:** hiding the start affordance because a game is running. A club can run a second table.
- **Never:** two competing primary cards — the live card is the only filled one.

### H3 · Two or more games live

- **Trigger:** two or more open games.
- **Renders:** one card per game, newest first, equal weight, each with its own name, elapsed time,
  seat count and stakes. Stakes move onto the card because they now differ between tables.
- **Never:** "Tonight" as a name once a second table exists — every game needs a distinct name.
- **Scroll:** past three live cards the card list scrolls; the rows and dock stay put.

### H4 · A game live and a night still counting

- **Trigger:** one open game plus a game that has ended and is not settled.
- **Renders:** the live card, then the unsettled game in a muted amber-bordered card — "COUNTING ·
  NOT SETTLED", ended time, how many stacks are still uncounted, and one action: Settle up.
- **Never:** hiding an unsettled game. It holds money.
- **Never:** blocking a new game because an old one is unsettled.

### H5 · Brand new club

- **Trigger:** no sessions ever, one member, no rules set.
- **Renders:** "Start the first session" with "You'll set the buy-in and blinds once, here". All three
  rows still render; My stats and Sessions are muted, state what they will hold, and do not navigate.
  Invite a player is the filled pill.
- **Never:** removing a row because it is empty. An empty row says what it will hold.

### H6 · Long names and big numbers

- **Trigger:** club or table names past the single-line width; five-figure and six-figure amounts;
  non-Latin scripts; 24 players.
- **Renders:** club name wraps to two lines then ellipsis; table name truncates on one line; elapsed
  time, stakes and counts never truncate.
- **Never:** a break inside a word. Never a third title line.
- **Test strings:** `Thursday Night Home Game Society of Vake`, `Marathon table by the window`,
  `₾128,400`, `14h 08m`.

### H7 · Player, not host

- **Trigger:** the reader is a member, not the host.
- **Renders:** same layout. The live card meta becomes personal — "you're in for $1,000 · 5 at the
  table". Eyebrow names the host. Rows: The group, My stats, Sessions (the nights they played).
  Dock: Settings and the theme button.
- **Never:** a disabled Start button. No start affordance at all.

### H8 · Loading, first paint

- **Trigger:** club known, session data not yet in.
- **Renders:** all known text immediately — club name, row titles, dock. Only unknown values are
  skeleton blocks, occupying the exact geometry the real content will take.
- **Never:** a spinner over the whole screen, and never a layout shift when data lands.

### H9 · Offline

- **Trigger:** no connection.
- **Renders:** an amber line under the club name — "No connection · saved 23:22, reconnecting". The
  live card goes grey-labelled "WAS PLAYING · 3H 17M AT 23:22" and the elapsed time **freezes** at
  the last known value. Card and rows stay tappable. "Start another game" is disabled with the reason
  on it. Invite is disabled.
- **Never:** counting the timer on from a guess. Never presenting a stale figure as current.

---

## 5 · Data rules

- **My stats never previews a figure.** No net, no total, no colour, no arrow up or down. It states
  scope only: "across every group you play in". A number there is a result before the reader asked
  for one, and it is wrong as often as it is right.
- **A count must match what is visible.** If the summary says 6 seated, six rows are reachable in the
  list. If they cannot fit, the list scrolls — the count is never adjusted to fit the layout.
- **Elapsed time** is derived from the start timestamp, formatted `3h 17m`, and shown as `just
  opened` under one minute. It never renders a negative or a value over 99h without switching to days.
- **Money** is always rendered with the club's currency symbol and thousands separators, tabular
  figures, no decimals unless the club's stakes have them.
- **Empty values** are `—`, never `0`, when the value is unknown rather than zero.

---

## 6 · Colour

| Token | Dark | Light |
|---|---|---|
| Screen | `#0A0A0B` | `#FFFFFF` |
| Primary card | `#FFFFFF` (dark text) | `#0C0D0F` (white text) |
| Panel / skeleton surface | `#16161A` | `#F4F4F6` |
| Text | `#FFFFFF` | `#0C0D0F` |
| Muted text | `#8B8D93` | `#6B6F76` |
| Disabled text and icon | `#5C5E64` | `#A2A6AD` |
| Hairline | `rgba(255,255,255,.11)` | `rgba(12,13,15,.1)` |
| Dock fill | `rgba(255,255,255,.08)` | `rgba(12,13,15,.06)` |
| Dashed secondary border | `rgba(255,255,255,.26)` | `rgba(12,13,15,.3)` |
| Live green | `#6FCF97` on dark, `#0E8A4F` on white | same pair |
| Warning amber | `#E0A44A` | `#A9741A` |

The primary card inverts between themes so it keeps top rank: white on the dark screen, near-black on
the light one. Both themes are first-class; neither is a filter over the other.

---

## 7 · Acceptance checks

Run each at 393 × 852 in both themes.

1. Club name `Thursday Night Home Game Society of Vake` — two lines, ellipsis, no mid-word break.
2. Table name `Marathon table by the window` — one line, ellipsis, pill and elapsed time intact.
3. Six players seated — summary says 6 and six rows are reachable.
4. 24 players — list scrolls, dock stays fixed, no row shorter than 74pt.
5. Two games live — both cards named, "Start another game" still present.
6. One live game plus one unsettled — both cards visible, Settle up reachable, start still allowed.
7. Amount `₾128,400` in the table figure — no truncation, no shrink-to-fit.
8. Elapsed `14h 08m` and `just opened` — both fit their pill without wrapping.
9. Airplane mode — banner shows, timer frozen, saved time stated, start disabled with a reason.
10. Cold launch — no layout shift between skeleton and loaded state.
11. Non-host account — no start affordance anywhere, Settings and theme button present.
12. Theme button — one tap flips the theme, icon shows the target theme, position identical in both.
13. Every tappable element measures at least 44 × 44pt.
14. Grep the codebase for `break-all`, `overflow-wrap: anywhere`, `break-word` — none on this screen.
