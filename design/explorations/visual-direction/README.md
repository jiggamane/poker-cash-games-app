# Visual direction — an exploration, 9 November 2026

**Not a handoff. Nothing here supersedes a board, a cut or `tokens.ts`.** It is a
study of why the app reads as a utility and of three directions that would give
it a face, written for the owner to choose from before any design cut is asked
for.

Open `index.html` in a browser. It is self-contained apart from Google Fonts.

## What it says, in four lines

- The look is disciplined and anonymous: Expo's placeholder icon, one 800-weight
  register for every heading, temperature-less greys, and a settled night drawn
  exactly like a live one.
- Colour cannot carry personality, because green and red are money and mean
  nothing else. That rule stays. Type, material, shape and motion are what's left.
- Three directions, each drawn on Home, Tonight and the settled night with the
  seeded night's real figures: **A Sharpened** (same app, finished), **B Card
  Room** (walnut, card-stock ivory, an engraved serif, seat tokens), **C Ledger**
  (ruled paper, mono figures, double rules, a stamp).
- Recommendation: **B, in three steps**. Step 1 is A's groundwork through
  `tokens.ts`; step 2 bundles the faces with `expo-font` after a design cut;
  step 3 is three moments of motion and the result card as the share image.

## Decisions it needs from the owner

1. Which direction, if any.
2. Whether to reverse the "no web font ships" decision at the head of
   `tokens.ts` (B and C both need it; it also closes the Android/Roboto gap
   that note names).
3. Whether home's 2×2 tiles (N6, 25 October) are reopened — A proposes a list.
4. Off-table money moves from bone to brass in B, and amber "pending" to orange.

## Files

- `build.mjs` — generates `index.html` from `page.html` and the night's data.
  `node design/explorations/visual-direction/build.mjs`
- `page.html` — the page template: prose and every style.
- `current-*.webp` — screenshots of the built web export and the 9 September
  session-views board, taken for the "today" section.

Every figure is the seeded night (`apps/mobile/src/data/sampleNight.ts`) as
settled in `packages/core/src/rev15-night.test.ts`. Strings in the mockups are
shipped copy except those listed under each direction as new.
