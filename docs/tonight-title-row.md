# Tonight's title row, and why the two clocks stack

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

**The tag and the start time stack at the right edge of the title row**, in
`src/components/Screen.tsx`, sharing a right margin. They are one thought — how
long, and since when — and stacking them costs the title one element's width in
the row instead of two. The title holds one line at every width the app runs at
and through the standard text sizes; it runs out around 145%, where the iOS
accessibility sizes begin. A longer title still wraps to two lines at a word
boundary, as before.

The trade is 12pt of header height: the title row is 80pt where the board drew
68, so the list starts at 203pt rather than 191. That buys a header that is the
same shape on every phone, at every hour of the night — which is the argument
that made the running time the tag in the first place.

This bends **S51**: the start time is still the only place the start time
appears, but it is at the right edge of the *header* rather than of the *title
row*. Nothing else in the app moves — Tonight is the only screen that passes
both a `badge` and a `trailing`, and a screen with one or the other is drawn
exactly as it was.

## The three layouts this was chosen over

All were built and rendered from the app before being turned down.

- **The start time in the card.** The title row goes back to the drawn row —
  title, then tag — and "started 16:37" becomes a third line in the
  On-the-table card's right-hand meta stack, under "5 seated · 1 out". It is
  the cheapest of all of them: the card's column is shorter than the figure
  beside it, so nothing grows and the list starts 12pt higher. Turned down
  because it takes the start time out of the chrome entirely and leaves three
  right-aligned lines in one corner of a card that is otherwise about money.
- **Two bands.** The title takes the whole first line, and the tag and the
  start time sit together on a line beneath it, indented 68 to the title. Holds
  one line to about 265% text — the best of any of them for large type — at
  ~34pt of header height, on the screen that most wants its list long.
- **Drop the start time when the row is full.** The row wraps: while the four
  fit they are the drawn frame exactly, and when they do not the start time
  falls to a second line at the right. Costs nothing where it fits, but the
  layout then differs between two phones side by side and changes shape at the
  tenth hour.

Rendered from the app at 375 and 393, both themes:
<https://claude.ai/code/artifact/3a91cc4a-9c53-4787-8964-08fe0ac252ae> ·
<https://claude.ai/code/artifact/3134f9e9-7ecb-4097-9291-8ecd24816aa2>
