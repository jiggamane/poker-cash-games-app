# The updated screens — a summary page, 21 November 2026

**Not a handoff.** Nothing here supersedes a board, a cut or `tokens.ts`, and
nothing here is in the app.

Open `index.html`. One page of every app screen the style rounds and the icon
review touched on 20–21 November, drawn only with what the owner approved, and
with both options side by side where nothing was approved. Published as the
claude.ai artifact TuSGpPtXL4grbNYq3RW59i (the owner's, private).

## What is on it

- **Approved:** Main menu, Poker tools, Game boosters and the seven booster
  sheets, in Fresh Deck with the fifteen approved drawings
  (`../icon-system/picks.mjs`).
- **Approved look:** Tonight and Post-game results in Fresh Deck, lifted from
  the round-two style page (`sources/style-round-two.html`, a copy of the
  published artifact 8V2pTt3a9mNXwrdMZ8TJ3F, which was never in the repo).
- **No verdict:** the header, Rail and Lamp side by side on Fresh Deck, lifted
  from `../screen-headers/`.

## Open (owner)

1. Rail or Lamp.
2. Tonight and Post-game results were not in the icon review: their small
   icons (tools, kitchen, piggy bank) are the style round's own.
3. *calculator, rulings, boosters* under Poker tools on the menu is new copy.

## How it is built

`node design/explorations/updated-screens/build.mjs` (needs Playwright). It
draws nothing itself: the icon board's own functions make the first two
sections, and the two older pages are rendered and their phones set into
shadow roots with their own stylesheets. The header crops get three overrides
so that what shows under each head matches the later approvals (no chevrons,
the ink start button, no line icons on the tiles); the override is in
`build.mjs` with the reason.
