# The screen ledger

Thirty-seven screens. This says, for each one, what is watching it and whether
anybody has held it against the board it was drawn from.

The point is to turn *"the app has bugs"* — which is not a thing anybody can
finish — into *"nine conformed, twenty-eight to go"*, which is. A count that
goes up is worth more here than a plan, because the failure this project keeps
hitting is not bad work, it is work being redone.

## How to read it

**Chrome** is from `docs/09-navigation.md`: a screen is either PUSHED (round
back button, nothing at all top-right) or a SHEET (grabber, close, swipe down).
The two vocabularies must never mix — which one is on screen is the only thing
telling a person whether to swipe or tap back. The column is generated from the
audit's own `SHEET_ROUTES`, so it is what the app actually does, not what was
intended.

The three check columns are what runs in `npm run check:ui`:

- **Rules** — `ui-audit.mjs` pass 1. Every route in both themes, at 393 and at
  360: the surface ladder, the contrast floor, what may scroll, what may break
  mid-word, and whether a label stays inside the control drawn around it. The
  narrow width is there because B3 fitted its button at 393 by half a point and
  hung out of both sides of it at 360.
- **Sheet** — `ui-audit.mjs` pass 2. The 21 sheets across six devices — four
  iPhones and two Androids — against the height cap. Only sheets have one.
- **Night** — `ui-journeys.mjs`. A big night played through, checking no figure
  is cut off, outside its card, or off the phone. Only reaches the nine screens
  a night actually produces, which is the point: those are the ones no URL opens
  and the ones a host stares at for ten minutes.

**Conformed** is the one no script can fill in. It means somebody opened
`docs/screen-specs/`, found this screen, and held the built thing against the
drawn thing with `ui-check.mjs` — every padding, gap, size, weight and radius.
Tick it only when that has been done, and put the commit next to it in the notes
below if it is worth remembering.

A ticked check column does not imply a ticked Conformed box. The scripts prove a
screen obeys the stated rules; only the board says whether it is the screen that
was drawn.

## The rule that makes this worth keeping

**Do not reopen a conformed screen casually.** If a change has to touch one,
re-run `check:ui` and re-hold it against its board before the merge. A ledger
whose ticks are not re-earned is worse than no ledger, because it says a screen
is settled when it is not.

| Screen | Chrome | Rules | Sheet | Night | Conformed |
|---|---|:--:|:--:|:--:|:--:|
| `/` | push | ✓ | — | — | ☐ |
| `/bill` | sheet | ✓ | ✓ | — | ☐ |
| `/bill-rules` | sheet | ✓ | ✓ | — | ☐ |
| `/claim` | push | ✓ | — | — | ☐ |
| `/club-rules` | push | ✓ | — | — | ☐ |
| `/count-up` | push | ✓ | — | ✓ | ☐ |
| `/deductions` | push | ✓ | — | ✓ | ☐ |
| `/entry` | sheet | ✓ | ✓ | — | ☐ |
| `/games` | push | ✓ | — | — | ☐ |
| `/groups` | push | ✓ | — | — | ☐ |
| `/hand-over` | sheet | ✓ | ✓ | — | ☐ |
| `/house-rules` | sheet | ✓ | ✓ | — | ☐ |
| `/invite` | sheet | ✓ | ✓ | — | ☐ |
| `/log` | sheet | ✓ | ✓ | — | ☐ |
| `/member` | sheet | ✓ | ✓ | — | ☐ |
| `/money-rules` | sheet | ✓ | ✓ | — | ☐ |
| `/new-group` | sheet | ✓ | ✓ | — | ☐ |
| `/new-night` | sheet | ✓ | ✓ | — | ☐ |
| `/nudge` | sheet | ✓ | ✓ | ✓ | ☐ |
| `/payments` | push | ✓ | — | ✓ | ☐ |
| `/pick` | sheet | ✓ | ✓ | — | ☐ |
| `/piggy-bank-rules` | sheet | ✓ | ✓ | — | ☐ |
| `/player` | sheet | ✓ | ✓ | ✓ | ☐ |
| `/players` | push | ✓ | — | — | ☐ |
| `/rounding` | sheet | ✓ | ✓ | — | ☐ |
| `/rule` | sheet | ✓ | ✓ | — | ☐ |
| `/seat` | sheet | ✓ | ✓ | — | ☐ |
| `/session` | push | ✓ | — | ✓ | ☐ |
| `/settings` | push | ✓ | — | — | ☐ |
| `/settle-up` | push | ✓ | — | ✓ | ☐ |
| `/settled` | push | ✓ | — | ✓ | ☐ |
| `/share` | sheet | ✓ | ✓ | — | ☐ |
| `/sign-in` | sheet | ✓ | ✓ | — | ☐ |
| `/spend` | sheet | ✓ | ✓ | — | ☐ |
| `/stands` | push | ✓ | — | ✓ | ☐ |
| `/stats` | push | ✓ | — | — | ☐ |
| `/watch` | push | ✓ | — | — | ☐ |

**37 screens · 37 under the rule pass · 21 under the sheet pass · 9 under a big
night · 0 conformed.**

That last zero is honest rather than pessimistic. Screens have been held against
their boards — `2e687a9` did a pass over the whole app — but it was never
recorded per screen, so there is no way to tell which of the thirty-seven it
actually settled. Ticking them off from here is cheaper than trusting a memory
of it.

## A coverage hole this file found

`/rounding` and `/share` were in the sheet pass but not in the rule pass. Both
arrived with the rounding work on 20 August; the sheet session added them to
`SHEET_ROUTES` a day later and `ROUTES` was never updated, so their heights were
measured and everything else about them was not.

Nobody would have noticed, because a script that silently checks 35 of 37 things
prints exactly what a script that checks all 37 prints. Both are in `ROUTES`
now. **When a screen is added, it goes in both lists** — and the count at the
top of this table is the thing that catches it if it does not.

## Notes per screen

*Add a line here when a screen is conformed, or when something about it is worth
telling the next session that opens it.*

**`/log`** — the preset row is the board's own chip (one object: figure over
caption, raised surface, fill swap on choose), not `Button variant="preset"`
with the caption printed underneath. That is deliberate and B3 in `docs/bugs.md`
says why: `Button` pads 24 a side and a third of a sheet has not got it to give.
`/share` still has the older shape and the same 24; it is not drawn on any
board, so nothing here says what it should be instead.
