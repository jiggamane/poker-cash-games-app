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
- **The header, approved 21 November:** version N of
  `../screen-headers/titles.html` on the Rail, on every screen here (`railN` in
  `../icon-system/fresh-deck.mjs`). Sheets keep their own chrome.

The small icons on Tonight and the results are the app's own, from
`../icon-system/app-icons.json`: the owner kept them on 22 November.

## Open (owner)

1. *calculator, rulings, boosters* under Poker tools on the menu is new copy.

## How it is built

`node design/explorations/updated-screens/build.mjs` (needs Playwright). It
draws nothing itself: the icon board's own functions make the first two
sections, and the style page is rendered and its two phones set into a
shadow root with its own stylesheet, after their heads are moved onto the rail.
