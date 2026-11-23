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

## Review, round three (22 November) — the look as a whole

*"the shades below the content areas conflict with the 'still' data with no
such background. maybe using a bit less shade at the bottom of such areas
would help."* `--lift` in the kit keeps L2's edge and contact shadow and
shortens the fall under the card (14px/28px blur at .30 → 7px/14px at .20),
so it stops before flat content that follows a card. `lift-shorter` on the
board shows before and after on the settled night.

The owner, the same day: the note was about the light theme only; **the dark
cards (one step lighter than the sheet, no shadow) are good in this respect**
and stay as they are.

## Review, round four (22 November)

- **The shorter card shadow: approved** (`lift-shorter`).
- **The bar's type: A approved, as drawn** — Libre Franklin bold, 18 points,
  on a 62-point bar.
- With both decided, `screens/05-this-round.mjs` is gone from the board; its
  options are in git history (commit before this one). Every screen now shows
  only the approved look. The remaining screens await their verdicts.

## Review, round five (22 November)

Applied on their screens:
- **Signing you in** (`auth-callback-wait`): designed, with motion. The whole
  screen is ink: a red chip turns and bobs over its shadow, three dots pulse
  under the words. Reduced motion stops it. New: the app shows two words.
- **Your groups** (`groups`): designed. A card per group with its drawing,
  name, line and standing; the current group edged in ink. Sample groups.
- **Invite code**: six characters with a dash after three (`K7M-4XP`) on the
  invite, the QR sheet, the reset and the typed claim (two boxes of three).
  ⚠ The server issues ten (`new_invite_code`, 0007); 30^6 ≈ 729 million
  against 30^10 ≈ 590 trillion is the margin 0009's anti-enumeration rests on.
  A server change and a security decision, not a screen change.
- **Game details**: "Stakes" reads **Blinds** (owner's comment). New copy.
- **Open a game** (the membership gate, both states): redesigned to invite.
  The start-a-session drawing and the reason first, then three plan cards with
  the price large; Full is the ink card.
- **Player card** (`player-out` and the other two): figures written in full,
  never abbreviated, all three stepping down together to the size the longest
  fits (26 → floor 18). In the app: `adjustsFontSizeToFit`, one size per row.
- Every phone in a cell now has the real screen behind its sheet, so the
  option cells show no grey blank either.

Options at the top (`screens/05-this-round.mjs`):
- **QR, four styles**: square, dots with round eyes, rounded modules with the
  club's chip at the centre (needs error correction H), and on a playing card.
  All four are real (`qrcode`, the app's encoder, over `pokerclub://claim?c=…`)
  and were read back off the rendered board by jsQR in both themes.
- **Name chips, four ways** on New session and Who's playing: as drawn, lifted
  like the cards, lifted with a round ink add, a soft fill. Who's playing? was
  marked Needs work with no comment; the chips are the likely reason, so it is
  shown with each option.

**Hiding the money** (owner's comment on Tonight, same day): an eye with
"Hide" / "Show" at the right of the first section label hides every figure on
the white sheet, the pot on the ink stays. Five placeholders in
`05-this-round.mjs` (`hide-*`): dots, a soft bar, the dollar kept with stars,
three chips, a card back. None is the real figure blurred, so a screenshot of
a hidden screen gives nothing away. New feature and new words.

## Review, round six (22 November) — three picks, and a progress panel

- **QR: square**, now a real code on the invite's QR sheet (`qr.mjs`).
- **Name chips: C** — lifted like the cards, squarer, the add in an ink
  circle. Applied in the kit to every chip on the board, not only names.
- **Hidden money: dots**, on Tonight (`session-hidden`), behind the eye.
- `screens/05-this-round.mjs` is gone: every option on the board is decided.
- **Where review stands** sits at the top of the board (`progress.mjs`):
  counts, what changed since each Needs-work note, what is waiting on Claude,
  what is not reviewed by section, and every choice made along the way. It
  renders from a snapshot at build and then live from the db.

- **Signing you in**: the turning chip is replaced by the chip stack from
  Start a session (owner's comment): its five chips drop onto the pile one
  after another, the stack holds, lifts away, and the round starts again.

## Review, round seven (22 November)

- **Signing you in**: the stack is always whole; each chip shakes a little up
  and down on its own, a beat after the one below, the top moving most.
- **Rule editors**: Remove moves into the bar beside Save (New session's rule
  steps and /rule's existing rule). The quiet red line is gone.
- **A second table needs no name**: it opens like the first; the line says
  tonight is already open. Flagged: the app requires the name today.
- **Your groups, empty**: four explainer concepts at the top of the board
  (`05-this-round.mjs`): three steps, a walkthrough, the end of the night
  shown, two ways in. All draft copy except the app's line and New group.
- Approved: the square QR, the seated New session with the lifted chips,
  New session, and New session with a buy-in open.

## Round eight (22 November)

- **Every money figure in one face.** `moneyFont` in `build.mjs` sets each
  currency amount, signed amount and grouped number in Libre Franklin (`.m` in
  the kit), whatever line it sits in; times, dates and percentages are left
  alone. An audit of the rendered board found 275 figures in Inter on 96
  screens before, none after.
- **Updated since your last look**, at the top of the board: a copy of every
  screen changed after a Needs-work note, with what changed, until it is
  approved or noted again (live from the db). The originals stay in place.

- **Signing you in**, again (owner: "played with, with an invisible hand, like a
  poker player"): the riffle. Two stacks of three, ink and red, pressed
  together so the chips fall in one from each side into one alternating stack;
  it holds, splits again, repeats. 3.4 seconds a round; still under reduced motion.

## Round nine (22 November)

- **Signing you in**, rebuilt as a player's riffle (owner: "as natural as
  possible, as if a person shuffled it"; the video linked could not be opened
  from here, YouTube served a bot check). The top half is lifted and set
  beside the rest, both stacks lean in, the chips fall together from the
  bottom not quite evenly, and the stack is squared with a nudge. A true
  repeated shuffle: colours mix round to round, back to the start after four
  (an out-shuffle of six has order 4). Each chip its own layer so the stacking
  order can change. 2.6 s a round.
- **Your groups**, four options without a picture or the currency
  (`groups-plain`, `groups-monogram`, `groups-people`, `groups-headline`).
- Approved: Who's playing?, both player cards (cashed out and corrected).

## Round ten (22 November)

- **Your groups: D, the name as the headline** (owner's pick), on its screen;
  the other three options are off the board.
- **Signing you in**, made to read as a hand: eased lifts and gravity falls
  with a small landing dip; each stack leans as a column about its outer foot;
  the stacks close as the chips fall; chips land a little out of line and the
  squaring pushes them true; timing varies by round and chip (seeded, so the
  board does not change between builds).

- **Signing you in**, matched to the owner's five frames from the video: the
  stacks stand touching (dx = r), tip about ten degrees on their outer feet so
  they peak at the seam, and the chips drop into one stack where they meet; the
  top half is moved over low and close.

- **Signing you in**, timed against the owner's GIF (29 frames, 2.3 s): the top
  half slides off sideways to the left along the felt, the halves sit apart,
  are pushed back together until they touch, peak and riffle, and the stack is
  squared. 2.35 s a round; the split is a slide, not a lift.

## Round eleven (22 November)

- **Your groups, empty: the walkthrough (B)**, four pages on its own screen
  (`groups-empty`, `-2`, `-3`, `-4`): the group's chips first, then the
  session stack, then Sessions; New group on the bar of every page and "I
  have an invite code" under the dots; the last page is D's two ways in. The
  other concepts and `screens/05-this-round.mjs` are gone. Draft copy, flagged.

- **Signing you in** (owner: "shouldn't stack up so evenly and one by one"): the
  riffle is one rush of about a fifth of a second, chips land tipped and out
  of line by up to four points, and the squaring leaves each chip a touch off
  line and level, different every round, carried into the next.

- **Walkthrough, last page**: the "Start a group" card is gone, so New group is
  only on the bar, as on the pages before. The invite code is the page, drawn
  two ways: open (the two boxes and Check the code) and semi-open (one field
  that opens into them).

- **Signing you in, smooth** (owner): one eased-in-and-out move per phase, no
  mid-move stops, no landing dip or rocking; push and peak are one motion; the
  chips flow down in a short overlapping wave; one push squares it; smaller
  resting slop; `will-change: transform` on each layer. Sampled every 16 ms
  over the loop: biggest change of step 15.8 px → 1.0 px, fastest step
  17.0 px → 5.3 px, biggest turn jolt 3.7° → 0.3°.

- **Walkthrough, both ways in equal** (owner): the bar is two halves on every
  page, New group and I have a code; on the last page the right half is Check
  the code, faint until six characters are in. The joining card shows the
  group's three chips.

## Round twelve (22 November)

- Approved: Signing you in (the smooth riffle), Your groups, the empty-groups
  walkthrough, Invite a player, Remove in the rule bar.
- **Walkthrough, last page**: Scan the QR code under the code boxes, and a QR
  button beside the field on the semi-open page. Flagged: the app has no
  scanner today.
- **A second table** is named for you from the day: "Friday, table 2", beside
  "Friday, table 1 is open". Draft words; whether the name can be changed is
  open.

## Round thirteen (23 November)

- **The board no longer moves under the reviewer.** A card in "Updated since
  your last look" leaves only when approved; a new note keeps it, marked
  "Your note is with Claude". Nothing re-lays out while a comment box has the
  focus; the panel and cards catch up when it loses focus.
- **Open a game**: the chosen plan carries a tick and the bar is live with its
  name (draft "Get Full · $9.99 a month"); Not now and Wait for … are gone,
  the close does both.
- **Sessions are named by day**: "Friday session", then "Friday session 2".
- **Walkthrough**: the semi-open last page is removed (it doubled the code
  entry); the approved open page stays.

- **Hide control**: just the eye (owner), open while the money shows and struck
  through while hidden; "Hide amounts" / "Show amounts" for screen readers only.

## Board order (23 November, owner)

1. **Updated in the last round**, always first: every screen changed at or
   after `LATEST` in `progress.mjs` (move it forward each round), shown
   whatever its verdict.
2. Where review stands, and the look as a whole.
3. **To review**: every screen not yet approved, by section, in the app's
   order.
4. **Approved**: the rest, by section. A screen moves between the two live as
   verdicts change, never while a comment box has the focus.

## Round fourteen (23 November)

- **Hide control**: the icon shows the action, with its word back: the struck
  eye and Hide while the money shows, the open eye and Show while it is hidden.
- **Type your invite code** is still needed (an existing member joining a
  second group comes from Settings; a dead invite sends you here). It now
  matches the walkthrough's last page, with Scan the QR code.
- Approved: walkthrough pages 2 and 3, Reset the code, Game details (both),
  Open a game, the second session.

- **Hide control**, settled and approved as drawn: at the right of the label row, the eye just left of its word. The split alternative is off the board.

## Round fifteen (23 November)

- **Open a game** (both): the plan's tag moved to the start of its description,
  so the name and the price never collide ("$2.49 / mo" against YOURS).
- **Add players**: four versions of the buy-in entry and the Add control, at
  the top of the board (`players-add-a` … `d`).
