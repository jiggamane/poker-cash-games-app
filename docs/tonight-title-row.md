# Tonight's title row, and where the start time went

`08-tonight-home.md` § H1 put four things on one line: the back button, the
title, the running-time tag and the start time. Measured off the board's own
frame at 402 × 874, they need 342.4pt of the 362 the row has. Nineteen points
of spare, and every one of them is spent by something the board could not draw:

| | |
|---|---|
| The tenth hour | the tag takes a second hour digit — **8pt** |
| A 393pt phone | **9pt** |
| A 375pt phone | **27pt** |
| A larger system text size | all of the above, scaled |

The title is the only child of the row with `flexShrink: 1`, so the title is
what gives — and "Tonight" is one word, so it wraps *inside the word*. A host
on a 375pt phone at hour twenty-three read "Tonig / ht" beside the tag it was
drawn to sit next to.

## What ships

**The title row is the drawn row — title, then tag — and the start time sits in
the On-the-table card**, as a third line in the right-hand stack under
"5 seated · 1 out".

The two clocks are not the same kind of thing. The elapsed figure is live: it
counts all night and is the only thing on screen claiming the night is
happening, which is what S51 made it, so it stays beside the title. The start
time never changes and is read once — it is a fact about the night, like the
seat count and the total in, and it now sits with them.

It costs nothing anywhere:

| | before | after |
|---|---|---|
| Title row height | 80pt | **68pt** — the drawn height |
| First player row starts at | 203pt | **191pt** |
| Card height | — | unchanged; the third line fits inside the height the $4,500 figure already sets |

This breaks **S51**, which put the start time at the right edge of the title
row. What S51 was protecting still holds: the start time appears exactly once,
and the running time is still the live tag. `Screen.tsx` says in its `trailing`
prop that a badge and a trailing text must not share a row — that pairing is
what broke the title, and Tonight was the only screen doing it.

## The layouts this was chosen over

All three kept the start time in the chrome, and all were rendered from the app
before being turned down:

- **Both clocks stacked at the right edge.** The tag over "started 16:37",
  sharing a right margin. Works at every width and is the same shape at every
  hour, but costs 12pt of header height and takes the tag away from the title.
  This shipped for a few days before the start time moved into the card.
- **Two bands.** The title takes the whole first line, and the tag and the
  start time sit together on a line beneath it, indented 68 to the title. Holds
  one line to about 265% text — the best of any of them for large type — at
  ~34pt of header height.
- **Drop the start time when the row is full.** The row wraps: while the four
  fit they are the drawn frame exactly, and when they do not the start time
  falls to a second line. Costs nothing where it fits, but the layout then
  differs between two phones side by side and changes shape at the tenth hour.

Rendered from the app at 375 and 393, both themes:
<https://claude.ai/code/artifact/3a91cc4a-9c53-4787-8964-08fe0ac252ae> ·
<https://claude.ai/code/artifact/3134f9e9-7ecb-4097-9291-8ecd24816aa2>
