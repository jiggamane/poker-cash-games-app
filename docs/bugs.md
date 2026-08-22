# The bug log

Every bug gets written down **before** it gets fixed.

That ordering is the whole point, and it is worth being blunt about why. Until
today bugs lived in chat messages. A chat message is gone the moment the session
ends: the next session cannot read it, cannot tell whether the thing was ever
fixed, and cannot tell that it has come back. Three separate rounds were spent
re-finding faults that had already been found once, and the only reason anybody
knew they had returned was noticing them again on a phone.

A bug that is written down has a name. A name can be checked.

## The shape of an entry

```
### B12 — the figure on Settle up is cut off at four digits

Screen      S3 settle-up
Seen        "−4,5…" where the amount should be −4,500
Expected    the whole figure, or a formatToFit that shortens it honestly
Found       21 Aug, testing on the phone
Locked by   npm run check:ui — ui-journeys.mjs, "figures cut off"
Status      fixed in 7ef8cf0
```

Six lines. **Seen** and **Expected** are the two that matter and the two that
get skipped — without them a fix is judged against a memory of the complaint
rather than the complaint.

## Locked by

This is the field that stops a bug coming back, and an entry without it is not
finished.

A fix with no check is a fix that survives exactly until the next session edits
that screen. That is not a hypothetical: it is what has been happening. So every
entry names the thing that now goes red if the bug returns:

| The bug is about | Lock it with |
|---|---|
| An amount, a split, a settlement | a test in `packages/core` |
| A figure cut off, outside its card, off the phone | `ui-journeys.mjs` |
| A rule the handoff states as a rule — surfaces, contrast, what may scroll | `ui-audit.mjs` |
| A row the board draws that the screen does not show at all | `ui-audit.mjs`, `DRAWN` |
| A sheet's height on some particular phone | `ui-audit.mjs` sheet pass, and `Sheet.geometry.test.ts` |
| A measurement that should match the board | `ui-check.mjs` against the frame |

If none of them can see it, say so in the field — **`Locked by: nothing yet`** —
and that entry is a standing invitation to build the check. Do not leave the
field blank, which reads like the question was never asked.

## Status

`open` → `fixed in <commit>` → and it stays in this file afterwards. Fixed
entries are not deleted. The log is the record of what this app has already got
wrong, which is the most useful thing to hand a session that is about to touch
the same screen.

`reopened` is its own status and worth spelling out when it happens, because a
reopened bug is evidence about the process rather than about the screen: it
means something merged over a fix, and the interesting question is which merge,
not which pixel.

---

## Open

*The faults found testing on 21 August belong here — they were reported in
conversation and have not been written down. Say what they were and they go in.*

---

## Fixed

### B5 — a night forgot the group's rounding the moment it was reloaded

```
Screen      not a screen — startNight, and every settlement figure downstream
Seen        a group that settles to tens opens a night; the night settles to
            tens until something reloads it from SQLite, and to whole dollars
            for ever afterwards. The server's copy said whole dollars from the
            start: `queueSessionOpen` has carried `roundingMode` since the
            server half landed and its only caller never passed it.
Expected    the night settles at what the group set, tonight and on next
            launch, on this phone and on the server's copy of it
Found       22 Aug, reading the INSERT while adding the stakes beside it
Locked by   nothing yet — see below
Status      fixed in this commit
```

M7 is explicit that rounding **changes computed amounts, not just formatting**,
so this is a money bug and not a display one. `startNight` put the mode on the
in-memory night and left it out of the row it wrote, and the mapper at the other
end reads `rounding_mode` off that row: correct all evening, wrong on the next
launch, and wrong on the server from the first second.

**Locked by nothing yet, and the field says so on purpose.** The three screen
tools cannot see it — nothing is cut off, no rule is broken, the screen is
right. What would see it is a test over `startNight` and `openNightById`
together, and there is no harness for either: they are the two functions in
`nightStore` that need a real `expo-sqlite`, and every test in `src/lib` today
is over a pure module. That harness is worth building and is a bigger job than
this fix.

### B4 — O1 shipped without the first row the board draws

```
Screen      O1 New session — /new-night, *The game*
Seen        four rows: Default buy-in, Currency, Start time, Money rules. The
            board draws Stakes first, "$5 / $5", with a chevron. Home told
            hosts "You'll set the buy-in and blinds once, here" and there was
            nowhere on the screen to set a blind.
Expected    the drawn row, reading the same three layers as the buy-in beside
            it — this game → last game → club default → app default
Found       22 Aug, checking the screen against the board
Locked by   npm run check:ui — ui-audit.mjs, "drawn-row-missing"
Status      fixed in this commit
```

The row was not forgotten. It was flagged out, in a comment on the exact line it
belonged on, because rev 18 § 5.2 adds `stakes { small, big }` and the straddle
to the Group and none of it was built: *"drawing the row against nothing would
be a control that forgets what you tell it."* That was the right call in the
moment and it is why this is a design bug rather than a careless one.

What made it a bug anyway is that the flag outlived its reason. The comment was
addressed to whoever built the group settings; nobody did, and meanwhile home
started promising the blinds could be set here. A flag is a note to a future
session, and a note nothing can read out loud is indistinguishable from a screen
that is simply wrong.

**Why nothing saw it.** Every check in this repo asks whether what is on the
screen is correct. The frame check measures the panel, the sheet pass measures
its height, the rule pass measures contrast and overflow — and a screen missing
a row passes all three, because everything still on it is perfectly correct. The
new `DRAWN` pass in `ui-audit.mjs` asks the other question: are the words the
board puts on this screen on it. Removing "Stakes" from O1 now takes it red at
both widths and both themes, which was checked by doing exactly that.

### B3 — "Custom" hangs out of both sides of its own button on the amount sheet

```
Screen      /log — the preset row on N5 buy-in, N6 rebuy
Seen        at 360 the word runs 257.7…321.0 inside a padding box that ends at
            263.7…315.0: six points out of the left of its button and six out
            of the right, touching the rounded edge on both sides. At 375 the
            same, smaller. The caption under it — STANDARD, X2, SET — sat on
            the ground below the chip rather than inside it, and the figure was
            17px where doc 10's type scale says 16.
Expected    the board's chip: one object, the figure over its caption, on a
            raised surface, and choosing it swaps the fill
Found       22 Aug, reported from the phone; measured at 360 and 375
Locked by   npm run check:ui — ui-audit.mjs, "label-out-of-its-control", and
            the route pass now runs at 360 as well as 393, which is the half of
            the lock that actually matters here
Status      fixed in this commit
```

Three faults, and the one that breaks the screen is **B2 again**. `Button` pads
24 a side, which is right for a button carrying a sentence and four times too
much for a third of a sheet: a slot at 360 is 101 wide, so 24 a side leaves 53
points for a word that needs 63. Same 24, same shape of failure, a different
screen — and it is fixed the same way B2 was: here, not in `Button`, where the
24 is correct for every other caller.

The other two came from the same decision. The row was a `Button` with a caption
printed underneath it, and the board draws no such thing: it draws one chip
holding the figure over its caption, on a raised surface, and choosing it swaps
the fill. Built as the board draws it, the caption is inside the chip, the
figure is at doc 10's 16, and there is no padding left to overflow.

**Why nothing saw it.** Two gaps, and both are now closed:

- `figure-out-of-its-box` — the check that caught B2 — only looks at FIGURES,
  because the doctrine it was written for is that a truncated number is a lie.
  "Custom" is a word, so the check skipped it. `label-out-of-its-control` asks
  the other question: does any label, figure or not, stay inside the padding box
  of the control drawn around it.
- The route pass only ever ran at 393, where "Custom" fitted **by half a point**.
  The note at the top of `ui-audit.mjs` already said what was wrong with that —
  "a figure that fits at 393 can still be cut at 375" — and left it to whoever
  remembered to export `UI_AUDIT_WIDTH`. Nobody did. It now runs at 360 too,
  every time, because a check that only goes red at a width it never runs at is
  not a lock.

Against the old build the new pass reports the finding twice, once per theme.
Against the new one, and across all 37 routes at both widths, zero.

### B2 — the "100s" chip is drawn outside its own box on Rounding

```
Screen      /rounding, the six-up chip row
Seen        the label 3.6 points wider than the chip holding it, both themes —
            a chip whose word touches its neighbour's
Expected    the label inside its box
Found       22 Aug, by ui-audit.mjs, the first time it ever ran on this screen
Locked by   npm run check:ui — ui-audit.mjs, "figure-out-of-its-box"
Status      fixed in this commit
```

`Button` pads 24 a side, which is right for a button with a sentence on it. This
row has six chips: at 393 a slot is about 52 wide, so 24 a side leaves 4 points
for a word that needs 38. Fixed in `rounding.tsx` rather than in `Button`,
because the 24 is correct for every other caller.

**The interesting part is not the bug, it is that it was invisible.** `/rounding`
and `/share` arrived with the rounding work on 20 August and were never added to
the audit's `ROUTES`. The sheet session added them to `SHEET_ROUTES` a day later
— so their heights were measured and nothing else about them was — and the audit
went on printing a clean pass over 35 of 37 screens, which looks exactly like a
clean pass over 37. Both are in `ROUTES` now, and the count at the top of
`docs/screens.md` is what catches the next one.

### B1 — sheets came up at heights nobody had chosen

```
Screen      all 21 sheets
Seen        some short, some tall; the tall ones with their own grabber and
            title behind the Dynamic Island
Expected    a top edge at the cap the boards draw — safe-area inset + 21,
            which is 80 on the reference phone
Found       21 Aug, testing on the phone
Locked by   ui-audit.mjs sheet pass — 21 sheets across 6 devices; and
            Sheet.geometry.test.ts, which pins both constants inside
            npm run check and reads them back out of the audit script so the
            tool and the app cannot drift apart in silence
Status      fixed in 1bf738f
```

This one is the worked example, and not because the fix was clever. It is
because of the sentence in its own commit message:

> AND A TEST, because the reason this survived is that nothing could see it.

Twenty-one screens were wrong, on every phone, from the beginning. Nobody was
careless. The fault was simply outside what anything ran — no test covered a
screen, and the browser reports no safe-area insets, so even the tools that did
exist measured the cap at 21 instead of 80 and passed. It took standing a fake
safe area up before the bug became visible at all.

Against the old build that new pass reports 52 findings. Against the new one,
zero. That is the difference between a fix and a fix that holds.

`docs/sheet-heights.md` has the full derivation, including the two places doc 15
disagrees with itself.
