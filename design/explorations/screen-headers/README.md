# The header update — an exploration, 20 November 2026

**Not a handoff. Nothing here supersedes a board, a cut or `tokens.ts`.**

Open `index.html` in a browser. It's one static page with no build step.

## What it is

The owner, 20 November: the headers don't look good and the background reads
as empty. This page shows **only the parts that change**: the top of each
screen today, next to the same screen with the new header. Everything below the
fade stays as it is.

It has two switches:

- **Base:** the current app as it is in code (dark and light, from
  `apps/mobile/src/design/tokens.ts`, checked against the web build), or one of
  round two's directions, Chip Rack or Fresh Deck (artifact
  `8V2pTt3a9mNXwrdMZ8TJ3F`, with players shown by name only).
- **Header:** **Rail** (proposed) or **Lamp** (the lighter option).

The four screens are round two's own set: Tonight, Main menu, Game boosters and
Post-game results.

## The Rail

The head of a pushed screen becomes one raised panel. It runs up under the
status bar and ends in a rounded edge, and it's drawn in the base's own surface
colour, lit slightly from the top. The title and its line sit on the panel, and
so does the On-the-table figure on Tonight, which loses its own card outline
because the panel is now the box. On home, the start card straddles the
panel's edge. The list starts on the ground below.

It changes no words, no order, no heights, and adds no colour. The top-right
corner stays empty apart from Tonight's live tag. Sheets aren't touched.

## Open

1. Rail or Lamp, and on which base.
2. Not yet seen on a phone. The crops are 300 points wide, scaled from the
   app's 393.
3. In code it would be a header slot in `Screen.tsx` that the screen's head
   renders into, plus home's own header. That's app-wide, so per `CLAUDE.md` it
   runs alone, with no other session in flight.

## Titles and back buttons, 21 November

`titles.html` (a page fragment: open it in a browser as it is). The owner on
the two options: not bad, but the title styles and the back buttons need to
change too. Six versions on Fresh Deck, each changing both together, with a
Rail / Lamp switch since that choice is still open:

- **A** a large title on its own line under a bare back arrow
- **B** a bare chevron and a semibold title
- **C** a small centred title, the round button kept
- **D** the round button in ink, a heavier title
- **E** a square key, a smaller title
- **F** a tab on the screen's edge

It copies the phone, Fresh Deck, Rail and Lamp styles from `index.html` and
adds only the `.v-*` rules. Under each head it is already in line with the
later approvals (no chevrons, the ink start button). No verdict yet.
