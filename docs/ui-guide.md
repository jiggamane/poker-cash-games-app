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
real places — the section label is 11px on the board and 12 in the doc.

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
