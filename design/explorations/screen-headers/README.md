# Screen headers — an exploration, 20 November 2026

**Not a handoff. Nothing here supersedes a board, a cut or `tokens.ts`.** A
follow-up to `../visual-direction/` (9 November), on the one thing that study
left the same in all three directions: the top of the screen.

Open `index.html` in a browser.

## The complaint

The owner, 20 November: the headers don't look good, and the background reads as
empty. The study drew every direction with the same header: back button, title
and timer, then a grey role line, all on flat ground. On B the figure sits in its
own card, which leaves an empty strip between the header and that card.

## Four treatments

Each is drawn on Tonight in A, B (dark and light) and C, plus B's settled night.
Only the header changes. The rows below it come from the study's own styles.

- **H1 Lamp.** Same layout, with a warm pool of light and some grain above the
  title. Fixes the empty ground but leaves the header as it was.
- **H2 Rail (recommended, with H1's lamp on it).** The title, the role line and
  the figure share one raised panel that runs up under the status bar and ends
  in a rounded edge. In B that edge is stitched like a card table's rail; in C
  it's a ledger page head ending in a double rule. Fixes both complaints, and
  heights stay as they are today.
- **H3 Figure first.** The title shrinks to a bar title, and $4,500 becomes the
  header, centred on a chip's edge drawn at header size. The best hierarchy of
  the four, but it reopens `docs/tonight-title-row.md` and adds a second header
  style.
- **H4 Large title.** Back button and timer on their own row, the title full
  width below them under the group's crest and name. Fixes the title row at any
  width, but costs about 40pt and leaves the ground empty.

## Open

1. Which treatment, if any. This depends on the study's own open question
   (which direction).
2. H4 puts the group name on Tonight. It's data rather than copy, but no board
   puts it there. **Flagged, not decided.**
3. H3 joins two existing strings ("$5,000 in play", "5 seated · 1 out") onto one
   line with a dot. Same strings, new arrangement.
4. B's stitch is drawn in card stock rather than brass, because brass means
   off-table money in B (the study's decision 4).

## Files

- `build.mjs` generates `index.html` from `page.html`. It imports the night, the
  glyphs and the phones from `../visual-direction/build.mjs`, and lifts the
  phone styles verbatim from `../visual-direction/page.html`, so a change there
  shows up here on the next build.
  `node design/explorations/screen-headers/build.mjs`
- `page.html` holds the prose and the header styles (`H1`–`H4` in the CSS).
