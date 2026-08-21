# How tall a sheet is

Twenty-one screens in this app are sheets. They were coming up at heights
nobody had chosen: some short, some tall, and the tall ones with their grabber
and their own title behind the Dynamic Island. This is the rule they follow
now, where it comes from, and how it is checked.

## The short version

**There is no fixed sheet height, and there is no iOS number and an Android
number.** A sheet hugs its content and is anchored to the bottom of the phone.
It grows until its top edge reaches a cap, and there it stops and the body
scrolls inside it. The cap is:

```
cap = safe-area top inset + 21
```

On the reference phone (iPhone 16 / 15 / 14, inset 59) that is **80**, leaving
a panel **772** tall — which is exactly where fifteen of the boards draw it. On
a notch phone (47) it is 68. On a Pixel-class Android (24dp) it is 45. The 21
is what travels; the inset is what the OS reports.

One more rule, from doc 15 § 4.7: **below 700 points of usable height there is
no peek at all** — every sheet is full-height. That is the SE (647) and small
Androids (592). The 13 mini has 728 and keeps its peek.

Both numbers live in `chrome.sheetGap` and `chrome.sheetFullHeightBelow` in
`apps/mobile/src/design/tokens.ts`, and nowhere else in the app.

## Where the 21 comes from

Not from a platform. It was measured off the drawings.

All six `.dc.html` boards were rendered and every sheet panel in them measured —
70 panels, 35 states in dark and light. They do not cluster into two detents;
they range from 389 to 772 tall, because a sheet is as tall as what is in it.
But the **top edge** clusters hard: fifteen of the thirty-five sit at exactly
80, and nothing sits above it.

Reading the markup of one of those frames shows how 80 is built:

```
 0    status row .................. 38   a drawing of iOS, explicitly not built
38    the screen behind ........... 30   at opacity .32 — the scrim
68    gap ......................... 12   the panel's own margin-top
80    ─── the sheet panel, 772 tall
```

Doc 15 § 1 assumes a 59pt top inset on that frame, so `80 − 59 = 21`. Anchoring
to the inset rather than to the glass is what makes the strip of the screen
behind survive onto a phone whose island is a different size — and that strip
is the thing that says what you were looking at is still there.

### A discrepancy, left as found

Doc 15 § 3 words the same rule as *"the sheet becomes full-height (top edge at
inset + 10)"*, which would put the reference phone at 69 rather than 80. The
boards draw 80, in fifteen places, deliberately composed. `CLAUDE.md` gives the
board the last word on layout, so **21 is what is built** and the doc's 10 is
recorded here rather than silently followed or silently dropped.

§ 4.7 has a smaller one: it says *"below 700 points of height (SE, mini)"*,
but § 4's own worked-examples table gives the mini 728 points of usable height
and marks it "peek allowed". The table is the more specific statement and it is
what is built: the threshold is numeric, on usable height, and the mini keeps
its peek.

Both are worth a line in the next handoff revision.

## What the platforms do, for comparison

The app does not use either platform's sheet. Every sheet here is an
expo-router route presented as a `transparentModal` with a panel drawn by
`src/components/Sheet.tsx`, so no OS detent applies and the height is entirely
ours. For context on what was *not* inherited:

- **iOS** — `UISheetPresentationController` offers two system detents, `.medium()`
  (roughly half the container) and `.large()` (the full container, with the card's
  top edge sitting a short way below the safe-area top). Custom detents arrived in
  iOS 16. Our cap is the same idea as `.large()`, with our own gap.
- **Android** — a Material 3 modal bottom sheet expands to the screen height less
  the status-bar inset, with a half-expanded state at 50% by default. The "less the
  status-bar inset" is the part our rule already satisfies by construction.

Neither offers a *content-height* sheet that is also capped, which is what the
boards draw and what the app needs: a two-line confirm should not be half a
phone tall.

## How it is checked

Two places, deliberately.

**`npm run check`** runs `apps/mobile/src/components/Sheet.geometry.test.ts`.
It has no browser in it — it pins the arithmetic: that `59 + sheetGap` is the
80 the boards draw, that the cap clears the status bar on all six devices, that
the cap moves with the inset point for point (the property the old code lacked),
and that the SE promotes while the mini does not. It also reads the two
constants back out of `scripts/ui-audit.mjs` and asserts they still match the
tokens, so the tool cannot quietly stop checking what the app does.

**`node scripts/ui-audit.mjs`** measures the built app. Its second pass renders
all 21 sheet routes on six devices — the four iPhones in doc 15 § 4 plus two
Androids — and checks five things per sheet: that it does not rise above its
cap, that it is full-height when the phone is short, that it is anchored to the
bottom, that its footer stays inside the panel, and that nothing is drawn
outside a panel that has no scroller.

```bash
npm run ui                                  # build and serve, in one shell
node scripts/ui-audit.mjs --sheets-only     # in another
node scripts/ui-audit.mjs --sheets-only --verbose   # every sheet's height
```

### The safe area, stood up

The audit's long-standing blind spot was that **a browser reports no safe-area
inset**, and a sheet's height is measured *from* the inset — so with a zero one
the cap lands at 21 instead of 80 and the entire class of bug is invisible. The
sheet pass fakes a real inset.

`react-native-safe-area-context` on web appends a hidden, fixed 0 × 0 div to the
body whose padding is `env(safe-area-inset-*)`, reads its computed padding, and
re-reads it on `transitionend`. So the pass watches for that div going in,
paints real padding onto it (inline beats `env()`), and fires the event. The
observer's callback is a microtask, so it runs after the library's synchronous
append-listen-read and the listener is already attached.

This is only wired into the sheet pass. The first pass keeps its inset-free
baseline, so its existing results are unchanged.

## What the fix was

`Sheet.tsx` capped the panel with `marginTop: 18` — a flat 18 points from the
top of the *window*, the same top edge on every phone. On a Dynamic Island
device that is 41 points behind the island; on a Pro Max, 44.

Run against the old build, the new pass reports **52 findings**: 26 sheets above
their cap and 26 that should have been full-height and were not. Against the
fixed build, zero.

The change itself is small — the cap became `insets.top + chrome.sheetGap`, and
a short phone adds `flexGrow: 1` so the panel fills to it. The `flexShrink: 1`
that makes a sheet hug its content was already right and is untouched.

## One Android trap, avoided

The full-height threshold is measured against **the phone, not the window**.

Expo leaves Android on `adjustResize`, so the app's window is only what is left
above the keyboard: a Pixel-class phone reports 915 at rest and something near
600 the moment somebody taps an amount. Deciding the threshold from that would
push the phone under the 700 floor mid-keystroke and snap the panel to the top
of the screen while it was being typed into.

`Dimensions.get('screen')` is the glass and does not move, so that is what is
measured on a phone. iOS reports the two the same. The web is the exception and
takes the window: a browser keyboard never touches `innerHeight` — it shrinks
`visualViewport`, which is what `useKeyboardInset` reads — and there `screen`
is the monitor rather than the viewport.
