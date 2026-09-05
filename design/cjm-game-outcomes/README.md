# Game outcomes — customer journey map

Thirteen artboards: the calculation chain, the ten screens that show a player
how their night came out, and two boards of findings. Read
`docs/game-outcomes-cjm.md` alongside it — the boards carry the screens, the doc
carries the argument.

**This is a review, not a handoff.** Nothing here supersedes
`design/handoff-four-screens/` or any other cut. Where a board here shows a
screen, it is showing what the app draws *today*, at ship size, so that two
screens can be held beside each other; where it disagrees with a handoff, the
handoff is right and the disagreement is the finding.

## The files

Every `.dc.html` is one artboard. `canvas.json` lays them out on two pages —
*The journey* and *What to cut*. Open any board on its own in a browser
(`support.js` is beside them, as in every other board directory).

`build.mjs` holds the phone chrome and the notes column; `stages.mjs`,
`stages2.mjs`, `stages3.mjs` and `findings.mjs` hold the content. The chrome is
written once so it cannot drift between eleven frames:

```bash
node stages.mjs && node stages2.mjs && node stages3.mjs && node findings.mjs
```

## The figures

Every amount on every board is the seeded canonical night —
`packages/core/src/rev15-night.test.ts`, which is what
`apps/mobile/src/data/sampleNight.ts` opens the app with — read off `settle()`
rather than typed by hand. So a board here can be held against the phone and
the numbers match, which is the only way to tell a layout question from a money
question.

## The published canvas

The seeded single-file canvas (`game-outcomes-journey-map.html`, ~2.6 MB) is a
build product and is not committed. Rebuild it from the sources above with the
`design` skill's seeder, or read the boards directly.
