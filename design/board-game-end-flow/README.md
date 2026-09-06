# The game end flow — the board, photographed

**Cut 6 September 2026.** Eleven artboards: the six screens between a table with
money on it and a settled night, the branch a night takes when it does not add
up, the two screens that read the night back afterwards, the same flow in the
bright theme, and what photographing it turned up.

**This is a record, not a handoff.** Nothing here supersedes
`design/handoff-count-up-header/`, `design/handoff-count-up-to-settled/` or any
other cut. Where a board here shows a screen it is showing **what the app draws
today**, at ship size, so the flow can be read end to end in one place; where it
disagrees with a cut, the cut is right and the disagreement is the finding.

## What makes it different from the other boards

Every other board in `design/` is a drawing. This one is a **photograph**:

```bash
npm run ui                      # build the app and serve it
node scripts/ui-shots.mjs       # dark
node scripts/ui-shots.mjs --light
```

`ui-shots.mjs` plays the seeded canonical night through the built web export at
393 × 852 — ends the night on the dock, counts each stack, walks forward — and
writes the PNGs that sit beside this file as `shot-*.png`. So the figures on
this board are `rev15-night.test.ts`'s to the dollar (**$5,000 in, $296 off the
table, six transfers**), and **a figure that looks wrong here is wrong in the
app**. A redrawn frame can be wrong on its own; this one cannot.

The cost is the other side of the same coin: a photograph goes stale the moment
a screen changes. Re-run the two commands above, copy the PNGs back over the
`shot-*.png` beside this file, and the board is current again — the artboards
reference them by name and nothing else has to change.

## The files

```
Main.dc.html            the flow at a glance — six screens, and the control that moves you between them
Tonight.dc.html         T1 · the only door into the ending flow, and it is a one-second hold
CountUp.dc.html         E2 · the 6 September header block in three states: 42%, 90%, balanced
OutOfBalance.dc.html    E5 · the branch, when every stack is counted and the sums still do not meet
Deductions.dc.html      E3 · what leaves the table, and the preview of R1's row
SettleUp.dc.html        E4 · six transfers, and the point of no return
Settled.dc.html         R1 · the read-back, head and foot
FullLedger.dc.html      /ledger · format 7e, kept behind a chip
Payments.dc.html        R2 · the same six transfers as a checklist
BrightTheme.dc.html     three of them in the light theme
Findings.dc.html        four things the pictures turned up, none of them arithmetic
canvas.json             the layout: three lanes, newest work first
build.mjs, flow.mjs     the generator — `node flow.mjs` rewrites every artboard
shot-*.png              the photographs, straight out of ui-shots.mjs
```

Open any `.dc.html` in a browser with `support.js` beside it; the PNGs are
referenced by bare filename, so the directory travels as one thing.

## Which cut governs which screen

The board says this per screen in its notes column; the short version:

| Screen | Governed by |
|---|---|
| Tonight, and the settled/active grouping | `handoff-count-up-to-settled/docs/05` |
| E2's header block | `handoff-count-up-header/`, option `1b`, 6 September |
| E2's list, groups and type scale | `handoff-count-up-to-settled/docs/05`, frame `1a` |
| The rounding step | `handoff-E2/docs/E2-rounding.md` |
| E3's *Everyone after deductions* row | `handoff-count-up-to-settled/docs/02`, format `7a` |
| R1's results row | `design_handoff_rebuy_and_results/Game Results Breakdown.dc.html`, cut 5 September |
| `/ledger` | `handoff-count-up-to-settled/docs/02`, format `7e` |
| Everything else on every screen | rev 18 |

**Format `7a` is E3's row, not R1's** — the one thing on this board most easily
got backwards, and the two artboards say so. `/deductions` draws
`resultFormula().terms` — `game +$460 · food +$89 · piggy −$23`. R1 draws the
engine's `caption` — `460 − 31 − 23 + 120 paid` — which keeps the bill's two
halves apart where `7a` nets them. The 5 September cut that decided R1's row is
cited in `apps/mobile/app/settled.tsx` and is **not in this repo**; `docs/screens.md`
carries what it changed.

`docs/screens.md` records what each cut left open and what was decided against a
doc rather than by one. Read it before reopening any of these screens.

## What it found

Four things, all on `Findings.dc.html` and none of them arithmetic — every
figure on this board is one engine call and every one is right:

1. **R1's meta line is cut in half.** The line under the title on the settled
   night renders in a 12px box against a 17px line with `overflow: hidden`, so
   every descender is lost. `/payments` draws the identical component at its
   full 17. It is visible only when the copy has a descender, which is why it
   has survived, and it is in both themes. Not yet in `docs/bugs.md`: the fix is
   in `Screen.tsx`, which is app-wide, and `CLAUDE.md` says app-wide work runs
   in a session with nothing else in flight.
2. **The balance fact is stated twice, one screen apart** — E2's block, then E5
   in prose. Finding 1 of `docs/game-outcomes-cjm.md`, unchanged.
3. **Two step counters, counting different things.** The wizard says `1 of 3 ·
   2 of 3 · 3 of 3` over Count up, Deductions and Settle up; the 1 September
   cut's flow is Count up → Settle up → the settled night.
4. **Three things here have no drawn frame at all** — E2's amber fourth state,
   the counted-row animation (specified to the millisecond and unphotographable),
   and the **light twin** of the header block: the 6 September cut draws its four
   frames in the dark theme only, and `docs/screens.md` says asking for the light
   one is still outstanding. `BrightTheme.dc.html` stands in for it meanwhile.
