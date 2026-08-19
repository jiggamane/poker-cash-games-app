# Building screens that match the prototype

The problem this solves: screens built from a remembered token list come out
"close to but not perfect" — the type is a size off, the gaps are invented, the
content is nearly but not quite the right width. Small errors, but they compound
into an app that looks assembled rather than designed.

The fix is not more care. It is not working from memory.

---

## The rule

**Read the measurements before writing the screen.** Never build one from the
token doc alone.

```bash
python3 scripts/extract-design.py     # regenerates docs/screen-specs/
```

`docs/screen-specs/` holds every drawn screen — 57 of them — with the exact
inline styles from the board: every padding, gap, font size, weight, radius and
colour, as drawn at 402 × 874.

Working on `N2`? Open `docs/screen-specs/Screens - The night.md`, find `## N2`,
and build from that table. It takes a minute and removes the guesswork entirely.

**Where the spec and `07-design-tokens.md` disagree, the drawn screen wins.**
The token doc states the intent; the board states what shipped. They differ in
real places — the light theme's loss colour is `#C0341B` in the doc and
`#B03A28` on every board.

The boards also ship their glyphs as inline SVG, so `src/components/Icon.tsx`
carries the `d` strings verbatim. When a screen needs a glyph, copy the path out
of the board rather than reaching for an icon set.

---

## What the drawn screens revealed

Every one of these was wrong in the first pass, and none would have been caught
by looking harder at the token list.

### Margins are not uniform

There is no single page margin. The board uses:

| | |
|---|---|
| Status row | `20px 30px 0` |
| Group name row | `16px 20px 4px` |
| Title row | `4px 22px 10px` |
| Cards, tab tracks | `0 20px 14px` |
| Scrolling lists | `0 22px` |

So a card sits **20** from the edge while the list beneath it sits **22**. That
2px difference is deliberate and it is visible.

### The hero figure lives in a card

`On the table $2,880` is not bare on the ground. It is inside a surface card:
`#16161A`, `1px` hairline border, radius `14`, padding `18px 20px`, `gap 12`.
The figure is `800 48px/1` with `-.04em` tracking — not the 64px display size,
which is reserved for a settled result.

### Badges are tinted, not outlined

`LIVE` is `background: rgba(111,207,151,.14)` with the text in full green.
Radius `999`, padding `6px 11px`, a `6px` dot, text `700 10px` at `.1em`.
An outlined badge reads as a control; a tinted one reads as a state.

### The exact type in use

| Where | Drawn as |
|---|---|
| Group name above the title | `500 17px` |
| Screen title | `800 32px/1.05`, `-.03em` |
| Card figure | `800 48px/1`, `-.04em` |
| Section label | `700 11px`, `.1em`, uppercase |
| Stat value | `700 18px` |
| Stat caption | `500 11.5px` |
| Chip action | `600 12.5px` |
| Tab | `600 14px` inactive, `700 14px` active |
| Row detail | `400 12.5px/1.45` |

### There is no such thing as "a row"

Three rows are drawn, and they agree on nothing:

| | padding | gap | name | detail | figure |
|---|---|---|---|---|---|
| Totals `[N1]` | `9 / 4` | 12 | `600 17` | `400 13` | `700 19` |
| Feed `[N2]` | `13 / 0` | 14 | `600 16` | `400 12.5` | `700 18` |
| Transfer `[E4]` | `15 / 4` | 12 | `600 17` | — | `700 19` |

A name in a row is `600`, not the `500` of body text. `Row` takes a `kind` and
owns all three; do not restyle it at the call site.

### Money leaving the table is a washed block, not a colour

The bill, the kitty and the host's fee are drawn as a rounded block that breaks
out of the list by 12 on each side and pays it back as padding, with the
hairline suppressed. Radius 8, wash at 9%.

In the bright theme bone is **`#786644`**, a warm brown, on `rgba(120,102,68,.09)`.
It does **not** fall back to ink, whatever `07-design-tokens.md` says — that
reading is what produced two deduction rows merged into one beige rectangle.

### The home screen has its own inset

Home is inset **24**, not 22 — its header (`28 / 24 / 20`) and its destination
list both. Its title is `800 30`, two smaller than a pushed screen's `800 32`.
The one filled card on it is inverted: ink on white, white on ink, with a 2px
keyline of the *ground* set inside the fill.

### Settle up is a list of transfers

The net per player is not a list. It is a wrap of chips at the bottom —
`10 / 13`, radius 8, on a wash of its own colour, name `600 14` and figure
`700 14` with **no currency symbol**, because in a row of six the sign is the
information and six dollar signs are six pieces of noise.

There is no 64px display figure anywhere on it.

### Ending the night is not a red button

`[N1]` draws it as a quiet outlined row — `11 / 16`, 1.5px at 22%, "End the
night" at `600 15` with "count & settle" muted on the right and a chevron. The
primary pair below it is Buy-in (filled) and Cash out (outlined), gap 14.

### Tabs

Track: `#16161A`, radius `10`, padding `3`. Each tab: `flex 1`, padding
`10px 0`, radius `7`. Selected is a solid white fill with `#0A0A0B` text.

### Chips

`padding: 8px 11px`, radius `8`, `1px` border at 30% of the bone colour, text in
bone. Used for "House rules" — a quiet action that is not a button.

---

## Reading the measurements back off a built screen

The rule above is about writing a screen. This is about checking one, and it
found things nobody was going to see by looking: a note drawn as a card, a
list two pixels tighter on one screen than the next, four copies of the same
explainer block that had each drifted a different way.

```bash
npm i -g playwright && npx playwright install chromium   # once; not a dependency
export NODE_PATH="$(npm root -g)"

npm run ui &                                        # fonts, build, server

node scripts/ui-check.mjs dump /session                          # what shipped
node scripts/ui-check.mjs frame design/handoff-2026-08-13/screens-tonight-home.html \
  "H1 Tonight · resting"                                         # what was drawn
```

Both print the same tree — every padding, gap, radius, border and type value,
computed. The app runs on `react-native-web` at the frames' own 402 × 874, so
the two are directly comparable; diff them and the drift is a list rather than
a feeling. `shot` and `frames` do the same for pictures, and `--light` switches
the theme.

Expect the two chromes to differ at the top of a screen — the boards predate
rev 9 — and expect the type to be normalised where boards disagree with each
other by a point. Everything else that differs is a bug in the screen.

**One caveat, and it is not obvious.** The two sides do not render in the same
typeface off a Mac. The boards name theirs — `-apple-system, 'SF Pro Text',
Figtree` — while the app names none at all, deliberately (`tokens.ts`), so
`react-native-web` falls back to its own Segoe/Roboto/Arial stack. On iOS both
land on SF and it does not matter. Anywhere else, a width that differs by a
pixel may be the font rather than the layout: "Tonight" measures 108.19 in the
app and 107.17 on the board, and all of that is typeface.

`npm run ui` installs Figtree so the boards at least render what they ask for,
and `ui-check` says so when the app does not. Pass `--figtree` to paint the app
in it too — with that, the same string measures 107.17 on both sides. Treat
that flag as a preview of the day Figtree is bundled, not as today's build.

---

## The two standing checks

`ui-check` compares one screen to one frame. Two tools ask broader questions of
the whole app, and both are run before a merge.

```bash
node scripts/ui-audit.mjs            # the rules, on every route, in both themes
node scripts/ui-frames.mjs           # every route against the frame it was drawn as
node scripts/ui-frames.mjs --shots   # …and write the pictures side by side
```

**`ui-audit`** holds each screen to the things stated as rules rather than as
pixels: the surface ladder, 4.5:1 on text, nothing breaking mid-word, only
lists scrolling, and A8 — every field marked `testID="amount"` raises a
digits-only keyboard. Nothing here needs a board, which is the point: these
hold whether or not a frame exists for the state.

**`ui-frames`** measures ground, title, footer and panel on both sides of each
pair. Its map carries four annotations, and which one a difference gets is a
judgement worth making explicitly:

| | |
|---|---|
| `at` | the URL to open, when the bare route is not the state the frame draws — a screen always pushed with a parameter renders its empty case cold |
| `skip: ['footer']` | neither side has a pinned footer, so the measurement lands on whatever content happens to be at the bottom |
| `known: { footer: 'why' }` | this check's difference has been **decided**. It still measures; it prints the reason instead of the delta |
| `unreachable` | the state cannot be opened by URL at all — E7 and E8 exist only after a night is counted and settled. Reports as not measurable, never as a match |

The distinction that matters: `skip` and `unreachable` say the tool cannot see
it, `known` says somebody looked and chose. A check that keeps reporting a
settled question teaches people to skim the report, and a check that quietly
passes something it never measured is worse than no check.

**What neither can see**, and why a pass is not more than it is: the safe-area
insets are 0 in a browser, so the footer's 28 above the screen bottom and the
home indicator's own colour are device checks; the browser raises no keyboard,
so where the footer sits once it is up is a device check too; and row heights
across SE and Pro Max need those widths (`UI_AUDIT_WIDTH`).

---

## Checklist for a new screen

1. Find it in `docs/screen-specs/`.
2. Copy the measurements into the component. Do not round them to something
   tidier — the tidier number is what makes it look wrong.
3. Use `Screen` for the frame; it owns the bar, title and footer.
4. Check both themes before saying it is done. The bright theme has caught two
   bugs that the dark theme hid.
5. If a value genuinely is not in the spec, add it to `tokens.ts` with a comment
   saying it was invented — so the next person knows it is not gospel.

---

## Where we knowingly differ from the board

Each is marked in the code with the reason. Everything else is copied.

**The home glyph is always rightmost in a bar.** `[N1]`/`[N2]` put it last;
`[E4]` puts it before the text action. Navigation that moves between screens is
worse than a 16px ordering difference on one screen.

**The bright theme's "playing now" dot is `#6FCF97`, not `#0A7A3D`.** Both boards
draw it in the dark green, but on the bright screen that card is filled with
ink, which puts a dark green on near-black at about 2.5:1. Read as intent —
green that reads on the fill — rather than as a literal value.

**The primary button has no keyline.** The guide sets a 2px keyline of the
ground colour inside the fill. On the ground — where every button in this app
sits — that ring is the colour of what is behind it, so it never reads as a
line; its only effect is to make the filled button's visible height 52 while
the outlined button beside it stays 56. Bring it back if a primary ever sits on
a surface card, where it would do its job.

**Home's card and its destination list share one column**, both 20 to the edge
and 44 to the text. The board draws the card at 20 and the list at 24 + 4,
which steps the names 16px apart.

**The pushed title's line-height is 32 × 1.05, not 32.** Chrome A says `800
32/1` and every drawn frame agrees — `font:800 32px/1`, with no 1.05 anywhere in
the handoff. At a flat 1 the descender of a "p" leaves the text box and lands on
whatever is underneath, so `tokens.ts` sets 33.6. `ui-check` will report this
line as 33.6 against the board's 32; that one is meant to disagree.

**The app renders in no named typeface.** The boards ask for SF then Figtree;
the app sets `fontFamily` nowhere, which gives SF on iOS — right — and Roboto on
Android, which is not. Bundling Figtree is the outstanding follow-up, and it is
not a one-liner: Android will not synthesize weights from a single family, so
each weight must be loaded and named and every entry in the type scale gains a
`fontFamily`.

**Titles are `4 / 22 / 10` everywhere.** `[E4]` draws `6 / 22 / 14`. Two- and
four-pixel differences between boards are noise, and the complaint that started
this document was that the UI jumps between screens.

---

## The two chromes have opposite layout contracts

Both are a column of header, body and footer, and they resolve height in
opposite directions. Getting this backwards is what put a Save button below the
glass on four sheets and left the copy above it ending mid-sentence.

| | `Screen` (Chrome A) | `Sheet` (Chrome B) |
|---|---|---|
| The panel | fills the phone | **shrinks to its content**, anchored to the bottom, and stops 18 from the top |
| The body | `flexGrow: 1` — takes what the footer leaves | `flexGrow: 0, flexShrink: 1` — yields to the footer |
| The footer | at the foot of the phone | directly under the content, wherever that is |
| Safe area | on the `SafeAreaView` | on the footer, **inside** the panel |

Two rules follow, and both are load-bearing:

1. **A ScrollView with nothing bounding it does not scroll.** It takes the
   height of its content, pushes the footer off the bottom, and has no overflow
   left to scroll — so a long sheet loses its action AND its last paragraph at
   once. `flexShrink: 1` on the body is the whole fix.
2. **The safe-area inset belongs inside the panel.** Put it on a wrapper and
   the sheet stops short of the bottom edge, leaving a band of the screen
   behind showing under it.

`react-native-web` needs the explicit `flexGrow: 0`: its ScrollView grows by
default where the phone's does not, so without it `ui-check` screenshots a
layout no phone draws.
