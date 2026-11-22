# The full board — every screen in the approved look

**Not a handoff, and not the app.** The owner approved a look on 22 November
(`../app-surfaces/README.md`) and asked for the whole app redrawn in it on one
fresh board, to approve before any code changes. This directory is that board.

## The look

- **The header is the top of an ink screen**, in white type. No panel, no rule.
- **The content is one white sheet** that rises over the ink with round corners.
- **Groups are white cards held off the sheet by one soft shadow** (L2). No grey
  fill under content anywhere: inputs are outlined, not filled.
- **The footer is the action (F3).** An ink bar across the bottom edge with the
  action's words set straight on it; the whole bar is the target. There is no
  button inside it. Tonight splits it in two (Rebuy, Bill) under the Table
  admin drawer.
- **Dark:** the top near-black, the sheet ink, cards one step lighter than the
  sheet instead of a shadow.
- Carried over from Fresh Deck, still in force: names only (no avatars),
  nothing points (no chevrons on rows), red belongs to chips and to hearts and
  diamonds, no green fills, every word is the app's own.

## Files

- `kit.mjs` — the look as parts. The only place a colour is written.
- `screens/NN-*.mjs` — one file per part of the app. Each exports `section`
  (`{ title, blurb }`) and a default array of screens.
- `preview.mjs` — render one screens file, light above dark, and report any
  content that does not fit its phone.
- `build.mjs` — the board (`index.html`, and `--artifact <path>` for the
  published copy with review controls).

## A screen entry

```js
{ id: 'settle-up',            // unique on the board; the review key
  route: '/settle-up',        // the app route it redraws
  name: 'Settle up',          // caption
  nav: 'push' | 'sheet' | 'root',
  note: 'one line, only if the redraw decides something the reader should know',
  flags: ['a string here that is NOT in the app, or any other open question'],
  allowOverflow: true,        // only when clipping is the point (a scrolled list)
  html: push({ ... }) }
```

## Rules for drawing a screen

1. **Words.** Every string is the app's own, read from `apps/mobile/app/<route>.tsx`,
   its components, or the reference capture. Never invent, shorten or improve
   one. If a state needs a string the app does not have, do not draw that
   state; if you had to write anything that is not in the app, list it in
   `flags`.
2. **Push or sheet** is whatever the app uses for that route (`<Screen>` is a
   push, `<Sheet>` is a sheet). A multi-step sheet stays one sheet: later steps
   use `stepBack: true`.
3. **The bar.** A screen's primary action (the app's `variant="primary"` button,
   or the dock) becomes the bar: `bar()`, `barSplit()`, `barHalves()`.
   A blocked primary is `bar(label, { blocked: true })`. A screen that is a
   place with nothing to confirm has no bar. Secondary actions stay in the
   content as `button()` (outlined) or `quiet()`; a destructive one is
   `quiet(text, { red: true })`. Never draw a filled button in the content.
4. **Figures** are the seeded canonical night's, as the reference shows them.
   Do not do arithmetic; copy.
5. **Tokens only.** No literal colours in a screens file: classes from the kit,
   or `var(--text)`, `var(--muted)`, `var(--line)`, `var(--card)`,
   `var(--raised)`, `var(--win)`, `var(--loss)`, `var(--red)`. Type is
   `var(--head)` for titles and figures, `var(--body)` for the rest.
6. **It must fit.** The phone is 330 × 760. If the app's screen scrolls, draw
   its top; add a second entry for the rest only when the rest matters.
   `preview.mjs` prints `OVERFLOW` for anything clipped: fix it.
7. **States.** Draw the main state of every route. Add another entry for a
   state only when it changes the layout or the bar (empty, blocked, an error,
   a later step). Three per route is plenty.
8. **Do not edit `kit.mjs`.** If a part is missing, build it inline from tokens
   and say so in your report, so it can be added to the kit once.

## Kit API (all from `../kit.mjs`)

Frames: `push({ title, back, trailing, sub, subRight, extra, body, bar })`,
`pushRaw({ topHtml, body, bar })`, `sheet({ behind, title, sub, body, bar, tall, stepBack })`.
`body` is HTML or an array of HTML; items stack with a 12px gap.

Top pieces: `topPill(text)`, `topButton(icon)`, `topDropdown(text)`,
`topHero({ label, big, side, shares })`. A step label is plain text in
`trailing` (`trailing: '1 of 3'`).

Bars: `bar(label, { sub, blocked, line, icon })`,
`barSplit(primary, { label, icon }, { disc, drawer, primaryIcon, secondaryDead })`,
`barHalves(a, b)`, `drawerRow(icon, label, { sub, hold })`, `barMenu()`.

Content: `label(text, { right, icon, quiet })`, `card(rows, { pad })`,
`row({ name, meta, amount, tone, under, value, lead, trail, dim, wrapMeta })`,
`note(text)`, `para(text)`, `pill(text, cls)`, `terms(html)`, `button(text, { dead, icon })`,
`quiet(text, { red, icon })`, `field(label, value, { placeholder, suffix, focus })`,
`chips(items)`, `seg(items, on)`, `toggle(on)`, `keypad()`, `stat3(items)`,
`fig(text, { small, tone })`, `hr()`, `tile(name, sub, place, level)`.

Pictures: `ico(name, size)` (the app's icons: arrow back chevron home info rules
settings sun moon clock backspace plus restart close chevronUp chevronDown
person people pass cashOut receipt chipsIn chipsOut food drinks piggy check
pencil invite copy trash phoneOff clipboard message share calculator
questionCard spadeCard percent flame calendar bars qr), `art(place, size)`,
`tileArt(place, level)`, `slotArt(place, level, w, h, align)`.

CSS classes usable in inline HTML: `num win loss muted dimt red h2 fig split hr
note pill terms chip seg tog fi fl btn2 btnq card row tiles tile`.

## Check your file

```bash
node design/explorations/full-board/preview.mjs design/explorations/full-board/screens/<file>.mjs <out.png>
```

Then look at the PNG, in both themes.

## State, 22 November

143 phones over all 52 routes, in eleven sections; nothing clipped except the
seven entries that set `allowOverflow` on purpose (a scrolled list, a drawer).
Published for review as the claude.ai artifact T4823abaFtRW3qkyQdUV97 (private to the owner); verdicts
are in its db, collection `reviews`, one document per screen id plus `general`.

**No app code has changed.** The owner approves here first.

The open questions the redraw could not settle are on the board under each
screen and gathered at its foot. The ones that recur across sections:

- **Amber.** The app marks "Not set", "Waiting on …", "Too close" and
  break-even in amber. The look has no amber, so they are drawn muted.
- **Red.** Destructive actions keep an ink bar (delete account) or are quiet
  red text in the content; the calculator's Underdog / Beaten take the grey
  loss tone. The app uses red for all of these.
- **A read-only screen has no bar** (/watch, a watcher's Tonight): the sheet
  runs to the bottom edge with the read-only line at its foot.
- **A hold on the bar** (Take the game back, Delete account) is marked only by
  its "Hold 1.5s" line; how it fills is not drawn.
- **Steps inside a sheet** carry a back circle the app does not have today.
- **Rows that open something** lost their chevrons with everything else, so a
  few (Currency, Covered by, Ended) no longer say they can be tapped.
- **Dark footer.** The bar in dark is the near-black of the top; it was never
  reviewed on its own.
- **Sample data.** Screens the seeded night cannot reach (a passed game,
  membership gates, a signed-in account, a second night for the chart) are
  drawn from source with illustrative names and dates, each flagged.

Kit parts the helpers built inline and the kit should own before this becomes
code: a caps badge beside a sheet title, the preset row, the radio row, a row
with a leading time, the transfer row, the playing card, a small in-row
outlined action, the dashed "creates something" button, and a hold bar.

## Review, round one (22 November, the first five screens)

- **Tonight, and Tonight with Table admin open: approved**, with the line under
  the title dropped 8 points (`.tsub` in the kit).
- **Home: "try a more regular footer, several options."** Five in
  `screens/05-this-round.mjs`: as drawn, pills on the sheet, a footer on the
  sheet behind a hairline, the controls in the header with no footer, three
  labelled items. E needs the word "Theme", which the app does not have.
- **Who's playing?: "what's the grey area above?"** It was the screen behind
  the sheet, drawn as a title over a blank and dimmed. `build.mjs` now puts
  the real screen behind every sheet whose parent is on the board.
- **Settled night: "good, but explore the footer further in terms of the
  fonts/sizes."** Six settings of the words on the bar, each on the settled
  night and on Tonight (`bar-type-a` … `f`).

## Review, round two (22 November)

- **Home's footer: A approved, as drawn** — the ink bar with its three
  controls. The four alternatives are off the board (their code stays in
  `screens/05-this-round.mjs` as `homeWith` and `pillRow`, unused).
- The bar's type (`bar-type-a` … `f`) has no verdict yet.
