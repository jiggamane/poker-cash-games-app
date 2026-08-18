# Tonight's title row, and why the title stopped breaking

`08-tonight-home.md` § H1 puts four things on one line: the back button, the
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

**The tag and the start time stack at the right edge**, sharing a right margin,
in `src/components/Screen.tsx`. They are one thought — how long, and since when
— and stacking them costs the title one element's width in the row instead of
two. The title holds one line at every width the app runs at and through the
whole standard text-size range (it runs out around 145%, where the iOS
accessibility sizes begin); a longer title still wraps to two lines at a word
boundary, as before.

This bends **S51**: the start time is still the only place the start time
appears, but it is now at the right edge of the *header* rather than of the
*title row*. Nothing else in the app moves — Tonight is the only screen that
passes both a `badge` and a `trailing`, and a screen with one or the other is
drawn exactly as it was.

## The two that did not ship

Both are the same edit in the same file, if the trade reads differently later.

- **Two bands.** The title takes the whole first line (287pt at 375), and the
  tag and the start time sit together on a line beneath it, indented 68 to the
  title. Holds one line to about 265% text. Costs ~34pt of header height, on
  the screen that most wants its list long, and revives the meta line S51
  deleted.
- **Drop the start time when the row is full.** The row wraps: while the four
  fit they are the drawn frame exactly, and when they do not the start time
  falls to a second line at the right. Costs nothing where it fits. The layout
  then differs between two phones side by side, and changes shape mid-night at
  the tenth hour — which is why it lost to a header that looks the same every
  one of the fifty times a host glances at it.

Rendered from the real app at 375 and 393, both themes:
<https://claude.ai/code/artifact/3134f9e9-7ecb-4097-9291-8ecd24816aa2>
