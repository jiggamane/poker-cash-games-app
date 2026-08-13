# Building screens that match the prototype

The problem this solves: screens built from a remembered token list come out
"close to but not perfect" — the type is a size off, the gaps are invented, the
content is nearly but not quite the right width. Small errors, but they compound
into an app that looks assembled rather than designed.

The fix is not more care. It is not working from memory.

---

## The rule

**Read the measurements before writing the screen.** Never build one from the
token doc alone.

```bash
python3 scripts/extract-design.py     # regenerates docs/screen-specs/
```

`docs/screen-specs/` holds every drawn screen — 57 of them — with the exact
inline styles from the board: every padding, gap, font size, weight, radius and
colour, as drawn at 402 × 874.

Working on `N2`? Open `docs/screen-specs/Screens - The night.md`, find `## N2`,
and build from that table. It takes a minute and removes the guesswork entirely.

**Where the spec and `07-design-tokens.md` disagree, the drawn screen wins.**
The token doc states the intent; the board states what shipped. They differ in
real places — the light theme's loss colour is `#C0341B` in the doc and
`#B03A28` on every board.

The boards also ship their glyphs as inline SVG, so `src/components/Icon.tsx`
carries the `d` strings verbatim. When a screen needs a glyph, copy the path out
of the board rather than reaching for an icon set.

---

## What the drawn screens revealed

Every one of these was wrong in the first pass, and none would have been caught
by looking harder at the token list.

### Margins are not uniform

There is no single page margin. The board uses:

| | |
|---|---|
| Status row | `20px 30px 0` |
| Group name row | `16px 20px 4px` |
| Title row | `4px 22px 10px` |
| Cards, tab tracks | `0 20px 14px` |
| Scrolling lists | `0 22px` |

So a card sits **20** from the edge while the list beneath it sits **22**. That
2px difference is deliberate and it is visible.

### The hero figure lives in a card

`On the table $2,880` is not bare on the ground. It is inside a surface card:
`#16161A`, `1px` hairline border, radius `14`, padding `18px 20px`, `gap 12`.
The figure is `800 48px/1` with `-.04em` tracking — not the 64px display size,
which is reserved for a settled result.

### Badges are tinted, not outlined

`LIVE` is `background: rgba(111,207,151,.14)` with the text in full green.
Radius `999`, padding `6px 11px`, a `6px` dot, text `700 10px` at `.1em`.
An outlined badge reads as a control; a tinted one reads as a state.

### The exact type in use

| Where | Drawn as |
|---|---|
| Group name above the title | `500 17px` |
| Screen title | `800 32px/1.05`, `-.03em` |
| Card figure | `800 48px/1`, `-.04em` |
| Section label | `700 11px`, `.1em`, uppercase |
| Stat value | `700 18px` |
| Stat caption | `500 11.5px` |
| Chip action | `600 12.5px` |
| Tab | `600 14px` inactive, `700 14px` active |
| Row detail | `400 12.5px/1.45` |

### There is no such thing as "a row"

Three rows are drawn, and they agree on nothing:

| | padding | gap | name | detail | figure |
|---|---|---|---|---|---|
| Totals `[N1]` | `9 / 4` | 12 | `600 17` | `400 13` | `700 19` |
| Feed `[N2]` | `13 / 0` | 14 | `600 16` | `400 12.5` | `700 18` |
| Transfer `[E4]` | `15 / 4` | 12 | `600 17` | — | `700 19` |

A name in a row is `600`, not the `500` of body text. `Row` takes a `kind` and
owns all three; do not restyle it at the call site.

### Money leaving the table is a washed block, not a colour

The bill, the kitty and the host's fee are drawn as a rounded block that breaks
out of the list by 12 on each side and pays it back as padding, with the
hairline suppressed. Radius 8, wash at 9%.

In the bright theme bone is **`#786644`**, a warm brown, on `rgba(120,102,68,.09)`.
It does **not** fall back to ink, whatever `07-design-tokens.md` says — that
reading is what produced two deduction rows merged into one beige rectangle.

### The home screen has its own inset

Home's destination list is inset **24**, not 22, and its names are `800 30` —
two smaller than a pushed screen's `800 32`, which is the largest thing on the
screen now that the header has gone. The card takes the 28 from the top that
the header's first line used to. The card is inverted: ink on white, white on
ink, with a 2px keyline of the *ground* set inside the fill.

### Settle up is a list of transfers

The net per player is not a list. It is a wrap of chips at the bottom —
`10 / 13`, radius 8, on a wash of its own colour, name `600 14` and figure
`700 14` with **no currency symbol**, because in a row of six the sign is the
information and six dollar signs are six pieces of noise.

There is no 64px display figure anywhere on it.

### Ending the night is not a red button

`[N1]` draws it as a quiet outlined row — `11 / 16`, 1.5px at 22%, "End the
night" at `600 15` with "count & settle" muted on the right and a chevron. The
primary pair below it is Buy-in (filled) and Cash out (outlined), gap 14.

### Tabs

Track: `#16161A`, radius `10`, padding `3`. Each tab: `flex 1`, padding
`10px 0`, radius `7`. Selected is a solid white fill with `#0A0A0B` text.

### Chips

`padding: 8px 11px`, radius `8`, `1px` border at 30% of the bone colour, text in
bone. Used for "House rules" — a quiet action that is not a button.

---

## Checklist for a new screen

1. Find it in `docs/screen-specs/`.
2. Copy the measurements into the component. Do not round them to something
   tidier — the tidier number is what makes it look wrong.
3. Use `Screen` for the frame; it owns the bar, title and footer.
4. Check both themes before saying it is done. The bright theme has caught two
   bugs that the dark theme hid.
5. If a value genuinely is not in the spec, add it to `tokens.ts` with a comment
   saying it was invented — so the next person knows it is not gospel.

---

## Where we knowingly differ from the board

All marked in the code with the reason. Everything else is copied.

**One club per host, so home has no header and no bar carries a home glyph.**
The boards were drawn when a host could have several clubs: `[H2]`/`[H3]` head
home with "Your group" above the club's name, `[N1]` labels its back with that
name, and every pushed bar ends in a house glyph — "the club is one tap away".
With one club there is nothing to name and nowhere else to go, so home opens on
the card and pushed screens go back to **Home**, which is what `[G4]` and `[X1]`
already labelled their backs with. The per-club filter survives in one place:
`[G4] My stats`, because a host runs one club but can play in several.

**The bright theme's "playing now" dot is `#6FCF97`, not `#0A7A3D`.** Both boards
draw it in the dark green, but on the bright screen that card is filled with
ink, which puts a dark green on near-black at about 2.5:1. Read as intent —
green that reads on the fill — rather than as a literal value.

**The primary button has no keyline.** The guide sets a 2px keyline of the
ground colour inside the fill. On the ground — where every button in this app
sits — that ring is the colour of what is behind it, so it never reads as a
line; its only effect is to make the filled button's visible height 52 while
the outlined button beside it stays 56. Bring it back if a primary ever sits on
a surface card, where it would do its job.

**Home's card and its destination list share one column**, both 20 to the edge
and 44 to the text. The board draws the card at 20 and the list at 24 + 4,
which steps the names 16px apart.

**Titles are `4 / 22 / 10` everywhere.** `[E4]` draws `6 / 22 / 14`. Two- and
four-pixel differences between boards are noise, and the complaint that started
this document was that the UI jumps between screens.
