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

### B26 — the stack a player was counted out for is on the card and in no row under it

```
Screen      T2/T4 the player card, on a night that has been counted or settled
Seen        Andro's card reads IN FOR $500 · COUNTED $2,480 · NIGHT +$1,980,
            and ENTRIES below it is two rows: the $500 buy-in and the $120
            pizza he fronted. Nothing on the list says where $2,480 came from.
            Dana, who cashed out at 23:15 while the game was still running, has
            her "Cashed out · stack counted · seat closed · $2,120" row — so
            the same movement of the same money is a row for one player at the
            table and invisible for the other five
Expected    the money coming off the table gets a row like the money going on
            it: one entry per thing that happened, and the column reconciles
            with the figure above it
Found       31 Aug, reading the card against its own summary
Locked by   npm run check:ui — ui-journeys.mjs, "the counted stack is a row",
            asserted on the settled card it opens off E6
Status      fixed in this commit
```

**Only a cash-out was ever an entry.** The end-of-night count is not in the
ledger and never has been — it is `night.finalCounts`, a map the host fills in
on E2 — so `entryRows` had nothing to draw for it, and the one person who
happened to leave early was the only one whose exit showed up.

That is the whole of the fault, and it is worse than a missing line: the list
is the thing a player reads to check the figure above it, and for anybody
counted at the close it added up to their buy-ins alone. `08-tonight-home.md`
§ H4 draws the row for the cash-out case and no board draws this one, because
no board draws this card after a night has been settled — so the row is H4's,
at the count's own amount, with a provenance line flagged in `player.tsx` as
undrawn rather than passed off as decided copy.

### B25 — a spend added after the count was allowed by the engine and unreachable from the screen

```
Screen      E3 deductions, and O4 tonight's money rules
Seen        the bar tab arrives at 1am, the count is in, and the only way onto
            the bill is: back out of the ending flow, find the table, open the
            admin drawer, open the bill, add it, then walk forward through
            Count up → Deductions → Settle up again
Expected    the bill and the person who paid it on the two screens where the
            deductions are actually argued about
Found       30 Aug, from the handoff — 11-bill-and-piggy-bank.md, "After the
            count": "A spend added during settle-up is allowed and recalculates
            every winner's share and every transfer"
Locked by   npm run check:ui — ui-audit.mjs, DECIDED, which opens /money-rules
            and /deductions and asks for "The bill" and "Add a spend" by name;
            and ui-journeys.mjs, which adds one from Deductions mid-run and
            checks it lands on the bill it was added to
Status      fixed in this commit
```

**The engine allowed it all along.** Nothing needed changing in `packages/core`:
E3 recomputes off `settle()` on every render, so a spend added there already
redrew every share, the preview grid and the total. What was missing was a door.
The bill hung off the table's own admin drawer, which is a place you can only be
while the game is still running — the one part of the night when the bar tab has
*not* arrived yet.

`src/components/SpendList.tsx` is the list, on both screens, so the amount and
the person who fronted it are one tap from the figures they change. The spend
sheet itself is unchanged and unduplicated: "Covered by" is four cases with a
sum rule on one of them, and a second implementation of that on the deductions
screen is the second implementation that goes wrong. `frontedSentence` moved
into the same file for the same reason — the bill had been the only screen
saying "Marek and Dana fronted it", and it is now said on three.

### B24 — a spend logged at the wrong amount could not be corrected, only voided

```
Screen      L3 the spend, opened on a spend already on the bill
Seen        the amount drawn large at the top of the sheet and no keypad
            anywhere on it. $1,200 typed instead of $120 could be voided and
            re-entered, and nothing else
Expected    L3's own first row — "Rows: Amount, Note, then Covered by" — with
            the amount editable, the way every other logged figure in the app is
Found       30 Aug, reading the sheet against 11-bill-and-piggy-bank.md § L3
Locked by   npm run check — moneyScreens.contract.test.ts, which fails if the
            pad goes back behind `existing === undefined`; and
            npm run check:ui — ui-audit.mjs, KEYPAD, which opens every screen
            where an amount is typed and looks for the pad's backspace key
Status      fixed in this commit
```

The pad was rendered `{existing === undefined && <Keypad …>}`. Adding a spend
was right; correcting one showed a figure with no way to touch it.

**A void is not a correction here.** The ledger is append-only by design, so
voiding writes a reversal that stays visible to everyone for ever — which is
exactly what it is for when a spend did not happen, and exactly the wrong shape
for a typo. The bill then reads as a spend, a reversal and a second spend, and
the room spends a minute working out that all three are one round of drinks.

**And it was hiding a second fault.** `useTypedAmount` captures its opening
figure on the FIRST render, and on that render `useNight()` can still be null —
the sheet mounts before the store answers. The spend being edited is undefined
at that moment, so the pad opened on nought, and the sheet drew **$0** over a
spend logged at $120, with the note and the fronters blank beside it. Nothing on
the screen contradicted the figure while there was no pad, so it looked like a
sheet that had simply not loaded. The state is now seeded once per spend, by id,
when the night actually arrives — once, so the night object changing on every
entry anybody logs cannot throw away a figure the host is halfway through
typing.

The figure is an OFFER, not text the host typed, which is B20's distinction:
the first key replaces the whole amount rather than appending to it, so
correcting $1,200 to $120 is three keys and not nine deletions.

### B23 — a settled night said it was settled three times, and tinted every row while it did

```
Screen      E6 settled, and the results rows wherever they are drawn —
            /settled, /watch, /stands, /settle-up, /log
Seen        a SETTLED pill beside the title, a SETTLEMENT / "You are square"
            panel under the reader's own card, and every player's row filled
            with a green or a red wash behind a figure that was already green
            or red
Expected    handoff-E6: the status appears once, on the prize pool line, or
            not at all; hairline rows; the green and the red on the figures
Found       30 Aug, in `design/handoff-E6/`, cut the same day
Locked by   npm run check:ui — ui-audit.mjs, `tinted-result-row`: every signed
            amount in the app is walked up to the row that holds it, and a
            tinted fill anywhere on the way is a finding
Status      fixed in dbfb72d
```

**The pill and the panel are the half that had no cost and still had to go.**
Neither was wrong alone. X1c drew a status beside the title because a night you
open three weeks later has to say what it is, and it drew a settlement panel
because a reader wants their own answer first. On one screen they say the same
thing twice in two vocabularies, and somebody who has just closed a night reads
the second one as a second question.

**The wash is the half that cost something.** A filled row is an object, and
seven of them are seven objects of two kinds — which is a ranking the sign in
front of each figure had already given, drawn again in a colour that has to
survive a phone at arm's length in bad light. It also made the reader's own row
a different weight from everybody else's, on a screen whose subject is a table
and not a person.

Nothing could see either of them. Both are drawing decisions inside a
component, and the audit's checks were about surfaces, contrast, overflow and
what may scroll — a wash passes every one of them. `tinted-result-row` is
anchored on the FIGURE rather than on a colour name, so it holds whatever the
next wash gets called, and it is not scoped to the results screens: the rule is
about what a signed figure may sit on, wherever one is drawn.

### B22 — Count up could read "done" with a whole cash-out missing

```
Screen      E2 count-up — the status block
Seen        COUNTED $2,880 of $2,880, both figures agreeing, on a night whose
            books are $2,120 light: a player left at 23:15 and their cash-out
            was never entered. The card is neutral, the primary unblocks, and
            nothing on the screen names the money that walked out of the door
Expected    the whole equation on screen in every state — everything bought in
            against everything cashed out plus everything counted — so a host
            can check the sum rather than take the card's word for it
Found       30 Aug, in the E2 handoff, which is the design's own reading of
            the same block: "a comparison against the money still on the
            table, which hides half the sum"
Locked by   npm run check — packages/core/src/balance.test.ts, which asserts
            all four terms of the equation and holds the state at *counting*
            while any stack is uncounted, including on the night where the two
            sums meet by coincidence; AND npm run check:ui — ui-audit.mjs's
            DRAWN map, which now names both column headings, so a later pass
            that drops one to buy width goes red rather than shipping
Status      fixed in this commit
```

**This one was never a rendering fault, and that is what is interesting about
it.** Every figure on the old card was correct. `chipsOnTable` is buy-ins less
cash-outs and `counted` is what the host has entered, and comparing them is the
right test — it is the one the settlement gate has always run, and it still is.
The fault is that the subtraction happens *before* the comparison a person can
see: the missing cash-out is taken off both sides, the two figures that survive
agree, and the screen has no way to say what was removed. A host cannot audit a
sum whose terms are not on the screen.

So the block states four numbers where it stated two, and `left` — the countdown,
and then the verdict — is exactly `−reconcile().difference`, the same figure the
close gate is computed from. `balance.test.ts` asserts that identity directly, so
the block and the gate cannot come to disagree about a night.

**And the second half of it: a screen that only says BALANCED is not checkable.**
Both sums stay on screen in all three states, the strip keeps its height, and
green appears in exactly one of them. The old card had one more way to be
believed than it had ways to be wrong.

### B21 — a tick on Who has paid was a one-way door

```
Screen      E7 /payments
Seen        Mark paid marks. Nothing unmarks. Tap the wrong row — four
            transfers land in the same two minutes and the rows differ by one
            name — and the night says Petr has paid when Petr has not, for
            good. The trap was known: nightStore's own comment on `markPaid`
            named it and left it, because rev 18 draws no control on a paid
            row.
Expected    one touch to tick a transfer settled, the same touch to tick it
            back off, and no obligation to tick anything at all
Found       30 Aug, from the host's own account of clearing the list
Locked by   npm run check:ui — ui-journeys.mjs, "and comes back off". The
            journey plays a night to this screen (no URL reaches it), ticks a
            transfer, unticks it, and asserts the row reads waiting again
Status      fixed in this commit
```

**The fix is smaller than the trap.** `markPaid` becomes `setPaid(from, to,
paid)`: false deletes the row rather than filing a correction, which is right
here and nowhere else in this app — the ledger is append-only because a night's
result has to be unfalsifiable, and this is not the ledger. It carries one
fact, the time of a tap, and it is the tap that was wrong.

On the screen, the whole row is the tick. The board draws the target as a `Mark
paid` chip on the right of a waiting row; the chip is still there and still says
that, it is simply no longer the only place the tap lands. A host clearing this
list is standing in a doorway with a phone in one hand, and a checklist wants a
row, not a 66-point word.

**What was deliberately NOT added: any obligation.** No screen, figure or state
in this app reads `paidAt` — the night is settled by its ledger and stays
settled whether the list is untouched, half ticked, or ticked wrong. So the
ticks got no prompt, no warning, no red, and no completion. A host who settles
in cash at the table and never opens this screen has lost nothing, and that is
the property the reversible tick protects rather than the one it costs.

⚠ **One departure from rev 18, flagged rather than quiet.** E7 puts nothing on
the right of a paid row. Once that row can be tapped it has to say so, so a
paid row carries a filled tick where the chip was. It invents no copy — the
state line under the names still reads `marked paid 00:19`, as drawn — but it
is a mark the designer has not seen. The washed block behind a paid row and the
outline around a waiting one ARE drawn, and were not built; they are now, which
is what makes a ticked row readable at arm's length.

### B20 — correcting a $500 buy-in to $50 wrote $50,050

```
Screen      N10 /entry, the "Change the amount" step — and /share behind it
Seen        the step opens on the amount as logged, $500. Tapping 5 then 0 —
            which is what a host does to fix a buy-in typed at ten times its
            size — left $50,050 on screen and offered to "Correct to $50,050".
            The only way to a figure smaller than the one being corrected was
            nine presses of delete. There was no chip row either, so a
            half-typed figure could not be put back without leaving the sheet,
            and the sheet's close dismissed the whole thing rather than going
            back a step
Expected    the keypad /log has had since the day it was drawn: a figure the
            screen offers is REPLACED by the first key, and only a figure the
            host has typed is appended to. Delete wipes an offer whole. A
            preset puts an offer back up
Found       30 Aug, correcting an entry on the phone
Locked by   npm run check — apps/mobile/src/components/typedAmount.test.ts,
            "a suggested figure is replaced whole by the first digit". The
            screen itself by npm run check:ui — ui-journeys.mjs now stops on
            "correct an entry · the amount", which is the first time any check
            has pressed a key on this sheet
Status      fixed in this commit
```

**One rule, four screens, one implementation of it.** The replace-an-offer rule
was eleven lines inside `log.tsx` — a `touched` flag and two inline handlers —
and every other screen with a keypad had written its own answer:

| screen | opened on | what the first key did |
|---|---|---|
| `/log` | the standard buy-in, or this player's last rebuy | replaced it — correct |
| `/entry` | the amount as logged | **appended to it** |
| `/share` | what the split charges them | replaced it — but after a preset was tapped, **appended** |
| `/spend` | zero, and it draws no keypad when editing one | replaced it — correct |

`/spend` was the only one already right by accident: it opens on `0`, and
`appendDigits` has always treated a lone zero as an empty field. Change the
figure it opens on — which is one line, and the obvious thing to do the day
somebody wants to edit a spend's amount — and it joins the second row.

It is worst on `/entry` and that is not a coincidence: a correction is nearly
always a figure being made SMALLER, so every digit of the wrong amount is
directly in the way of the right one. `/log` never feels it, because a rebuy
typed against a suggested $500 is usually a bigger number and the host is
typing from the first digit anyway.

`src/components/typedAmount.ts` is now the only place that decides, and
`Keypad.tsx` points at it. This is `CLAUDE.md`'s rule about arithmetic applied
to the thing arithmetic is typed on: a screen that keeps its own copy of the
keypad's rule is a second, untested implementation of it, and the four above had
drifted into three different behaviours without anybody changing their minds.

**Why nothing saw it.** No check has ever pressed a key on `/entry`.
`ui-journeys.mjs` punches digits on `/log` and takes the result on trust — B17
is the same blind spot one screen along, and it says so in its own entry: "the
note explained the behaviour instead of stating the amounts". The lock here is a
unit test rather than a journey for that reason. It asserts the arithmetic of
the keypad in figures — `offer(500)` then `5` then `0` is fifty — where a
browser pass would assert that a screen looks right while typing something else
entirely.

**And the check it needed found a third fault the moment it ran.** The lock
above is a unit test, but a drawn chip row that nothing measures is B14 waiting
to happen, so `ui-journeys.mjs` now stops on the correction sheet with the
night's largest entry in it. Its first run reported `$1,200,000` running from
−7 to 367 on a 360-wide phone. That is not the chip and it is not new: it is the
typed figure itself, at the 68 the board drew with `$500` in it, and `/log`
draws the same figure at the same size — the journey had simply never stopped on
a screen with a keypad. Both are fixed together, and both halves are needed:

- `cappedFigure` on the figure, which is B18's treatment and which the boards'
  fixed cards already have. It holds the reader's text setting to 110%.
- **the figure steps down as it lengthens** — `typedFigureSize`, past the eight
  characters the board itself drew. The cap alone is not enough: `$99,000,000`
  at 68 is 382 points across at 110%, still off both edges.

Nothing shorter than `$999,999` changes size. The step is what a calculator's
display does, and it is the only honest option here — an abbreviated figure in
the field you are typing into is a lie about what the button is about to commit,
so `formatToFit` is right for the chip beside it and wrong for the figure above
it.

Two more things went with it, both on the correction step and both making it the
amount sheet the rest of the app draws:

- **The chip row.** `AS LOGGED` and `Custom`, the shared `Preset` from
  `src/components/Preset.tsx` — so the figure as it stands is one tap away
  after a wrong key, which is the whole reason `/log` has the row. Neither
  word is invented: "as logged" is already on the card above it.
- **The close goes back a step.** `09-navigation.md` § sheets: a flow replaces
  the sheet's content and keeps one close, and that close is a step back — the
  shape `new-night.tsx` and `invite.tsx` already use. A mis-tap on "Change the
  amount" used to cost the host the entry they had opened.

### B19 — the night's result hangs out of the player card, and the three figures were never spaced

```
Screen      H4 · T4 · /player, the summary card, once a player is cashed out
Seen        two faults, one drawn and one measured. The row put a fixed 22
            between the first two pairs and pushed the third to the edge, so at
            $500 · $2,120 · +$1,620 the gaps were 22 and 50 — the spacing was
            whatever the figures left over. And on a night in the millions the
            same row put "−$1.2M" at 233.9…330.8 inside a card that ends at
            324, at the reader's text cap: six points of the result outside its
            own card, and twelve at 30/800 before the size came down
Expected    three figures evenly spaced, all of them inside the card, at any
            amount the night can produce and at any text size the phone allows
Found       30 Aug, from the phone — reported as the spacing looking wrong,
            which is the same decision one amount earlier
Locked by   npm run check:ui — ui-journeys.mjs, the new "player card · counted
            out" stop: it cashes Petr out mid-night and measures his card at
            each of the three sizes of table, at 100% and at the text cap.
            Putting either half of the fix back takes it red — the old spacing
            with the new size, or the new spacing at the old 30/800. Plus
            ui-audit.mjs's PARAMS, which opens /player on the seeded night's
            cashed-out player so the three-up state is in the route pass at all
Status      fixed in this commit
```

**The spacing and the overflow are one decision at two amounts.** T4 draws the
row as a fixed 22 between the first two pairs and `margin-left: auto` on the
third. That hands every point of slack to one gap, so what the spacing *is*
depends on how wide the figures happen to be: at the drawn amounts it reads as
a row nobody composed, and at a night's real amounts the auto margin pushes the
result off the card. It is `space-between` with a floor of 8 now — equal gaps
that grow and shrink together, the last figure still ending at the card's edge
rather than past it, and the middle label centred over its own figure.

Spacing alone did not close it. Three figures at 30/800 are 284 points of the
288 a 360-wide phone has inside that card once `moneyMaxFontScale` has let them
grow, which leaves nothing to space them with; the three-up size is 28 now,
which is 14 points back. The two-up figure stays at the board's 32 — the three-up
one was already a different size, so the one that moved is the one that is never
seen beside its own twin. Both deviations are written where they are made:
`StatPair` in `player.tsx` and `statPairValueTight` in the tokens.

**Why nothing saw it.** Three gaps, and the first two are B14's, one route along:

- **The state was not reachable by any check.** `/player` opened bare says
  "Nobody by that name tonight", so the route pass measured one line of copy.
  It is in the audit's `PARAMS` map now, opened on Dana, whom the seeded night
  has already cashed out.
- **The journey never cashed anybody out.** B17's rewrite added Dana's card,
  which is the three-up state at the SEED's figures — $500, $2,120, +$1,620,
  small at every scale, because the rebuys never touch her. The night's own
  figures never reached this card. It now cashes Petr out mid-night for $100,
  which makes the result the whole of what he came in with: the widest of the
  three, at whatever size of table is being played.
- **And it took the text cap to show it.** At 100% the millions card is inside
  its box at either size and either spacing. B18's second pass is what turns
  this one red, which is the argument for that pass in one line.

### B18 — money grew with the phone's text setting; the cards did not

```
Screen      S1 session, T2 player (cashed out), E2 count-up, E2b stands,
            E5 settle-up, X1c settled, 1A/1B stats and games, the nights chart
Seen        two photographs from a real phone. Tonight read "$28,5…" where the
            table was $28,500. The player sheet of somebody who had cashed out
            read "IN FOR $1,500 · COUNTED $3,200 · +$1,7" with the third figure
            hanging off the side of its own card and the word NIGHT above it
            cut in half by the edge of the screen
Expected    the whole figure, or a k/M form of it, inside the card
Found       30 Aug, from the phone, against a run of check:ui that was clean
Locked by   npm run check:ui — ui-journeys.mjs measures every screen TWICE now,
            once at 100% and once at 120% text, and reports what only the
            second pass finds. Against the old build it reports 25 findings
            across the three scales; against the new one, nothing
Status      fixed in this commit
```

**The width was never the problem, and that is why nothing caught it.** Both
photographs are a 393-point phone — the card is 89.7% of the screen in each, and
393 is where a 20-point margin puts it. What was different was the TEXT: every
`Text` in react-native scales with the reader's system text size unless it is
told not to, and there was no `allowFontScaling` and no `maxFontSizeMultiplier`
anywhere in the thirty-seven screens. Meanwhile every card, gap and padding is a
fixed number of points off a board drawn at 402 × 874. The figures grew and the
boxes did not.

Rendering the seeded night at 393 with the font sizes multiplied by 1.2 —
nothing else changed — reproduces both photographs, down to which glyph the
ellipsis lands on.

**The thresholds had no margin to spend.** They had been measured to the point
at 100%, which is the one text size a browser ever renders:

| Slot | Held | Needed | Survived up to |
|---|---|---|---|
| Tonight's headline at 360 | 166 pt | 164 pt for `$99,999` | **101%** |
| The player card's three figures at 360 | 244 pt | 248 pt as drawn | **didn't** |

The player card's row is the second line of that table: it was already over its
own card at 360 at normal text size, before any of this. It had never been
measured, because every run of `ui-journeys.mjs` opened a SEATED player, whose
card carries two figures and an em dash. Three figures only appear once somebody
has cashed out — which is every player by the end of the night, and the card a
host looks at most.

Three things, then:

- **A cap.** `moneyMaxFontScale` in the tokens, spread onto a figure as
  `cappedFigure`, is 1.1 — a tenth is what the narrowest phone has room for, and
  the working is in the comment there. A cap rather than switching scaling off,
  because a reader who needs larger text should get it; the figure stops growing
  at the point where the card can still hold it whole.
- **Thresholds with room in them.** Tonight and Count up go from 100,000 to
  10,000, the two in-and-out lists from 100,000 to 10,000, the player card from
  10,000 to 1,000. The settled sheet's result, the two history headlines and the
  basis of a percentage take one for the first time.
- **A figure never shrinks.** `flexShrink: 0` on the result in four places. The
  name beside it may wrap and a label may ellipsise; a figure may not, and when
  both were allowed to give it was the figure that went — "−$150" came apart
  into "−" on one line and "$150" on the next.

**Why the check could not see it, and what it does now.** It measured at 100%
because that is what a browser does. It now measures every stop a second time
with every font size multiplied — padding, gaps and card widths left alone,
which is exactly what the phone does — and reports only what the second pass
adds. `maxFontSizeMultiplier` is native-only and react-native-web drops it, so a
capped figure would have looked broken at a size the device will never draw it
at; `cappedFigure` carries a `data-fontcap` beside the prop so the pass can
honour the cap. The two are one constant in the tokens for that reason.

**What is still open.** The cap is on the figures this pass measures, not on the
app. Nothing stops a screen that has not been through here from drawing a fixed
box around text that scales, and the general fix — one `Text` wrapper every
screen imports — is an app-wide sweep, which CLAUDE.md says runs alone with
nothing else in flight. It is not this commit.

### B17 — the big-night check had quietly been playing a night in the thousands

```
Screen      none — the check itself, ui-journeys.mjs
Seen        the run printed "every figure fits · 11 screens of a night in the
            millions" while the largest figure it had drawn all run was
            $14,900. Its rebuys were the digits 7000, 2500 and 900, typed on
            the keypad, and the note beside them said the keypad APPENDS them
            to the suggested buy-in — "so these land on top of it and come out
            in the millions, which is the point". The keypad replaces. It has
            replaced since `appendDigits` began resetting on the first key.
Expected    a night whose figures are the size the check exists to catch
Found       30 Aug, running the check and reading what it had drawn
Locked by   itself, now that the amounts are written out in full rather than
            described: SCALES in ui-journeys.mjs names the two nights, and each
            run prints what was on the table and the widest figure it drew, so
            a run that has stopped testing what it says it tests says so on its
            own last line
Status      fixed in this commit
```

**Nothing was broken. The check was passing over screens it never drew.** Every
seven-figure column this file was written to guard — the count-up card, the two
in-and-out lists, the results chips — went unmeasured from whenever that keypad
behaviour changed until today, under a green run each time, and B15 and B16
below are what was sitting behind it the whole while.

The lesson is the one in the comment rather than the code: **the note explained
the behaviour instead of stating the amounts.** `7000` meant a $5,007,000 rebuy
only if you believed the sentence next to it. The scales are written out now, in
dollars, and the run reports the table it actually played.

Three other things came out of the same look, and each was a hole of its own:

- The run started at `/session`, so `/` was never underneath it in history and
  `goBack` walked off the app. **My stats and Sessions had never been measured
  with a real night on them** — both draw a 40-point headline, the widest type
  in the app, off a total that grows with every night played. It now loads the
  club and crosses to Tonight as a route change rather than a second document
  load, which keeps the in-memory database and puts the club back under the run.
- The run counted every stack correctly first time. **E5, "It doesn't add up",
  had never been on screen** — the one screen that states two of the night's
  largest figures in a single sentence. Everyone is now counted with a hundred,
  which lands on E5 by design, and the run reads the difference off it.
- It ran at 393, the phone the boards were drawn at. **Every fault below is
  invisible at 393 and plain at 360**, which is the narrowest device in the
  matrix and the one the route pass has been running at since B3. This runs at
  360 now.

### B15 — Count up's total wrapped, and squeezed "ALL IN" into two characters

```
Screen      E2 count-up — the COUNTED card
Seen        at 360 on a table past six figures, "$2,352,880 of $2,352,880" did
            not fit the card's one line: the target dropped underneath the
            count and the label beside them broke into "ALL" over "IN". At
            $239M it is the same picture with wider figures. Nothing clipped —
            the box simply grew — so every check in ui-journeys.mjs passed over
            it, all three of which ask about width
Expected    one line, whatever the table is worth: 280 points inside the card
            at 360, less 12 of gap and 51 for "5 TO GO", is about 217, and the
            pair costs 195 at "$99,999 of $99,999" and 221 at six digits
Found       30 Aug, in the screenshots of the run B17 repaired
Locked by   npm run check:ui — ui-journeys.mjs, "wrapped", which is a fourth
            question the file now asks: a money slot may not fall onto a second
            line. Against the old build it reports the card at both the
            millions and the ceiling scale; against the new one, nothing
Status      fixed in this commit
```

Both figures take `formatToFit` at 100,000 — the same threshold S1's money card
uses, for the reason written there: abbreviating one of a pair and not the other
puts "$2.4M" beside "$2,352,880" in one card and reads as two scales rather than
two sums. **No precision is lost by it.** The exact difference is what this card
is for, and it is stated to the unit one screen along: a night that does not
balance says "OFF BY $2,352,380" on E5.

**Why nothing saw it.** The three checks in `ui-journeys.mjs` all measured
width — clipped, off-screen, out of its box — and a wrap is what happens when a
box is allowed to grow instead. A slot is told from a sentence by what is left
when the figures are removed: twelve characters or fewer ("of", "in · out",
"Rebuy") is a slot, and anything wordier is prose, which is allowed to wrap and
mostly mentions money.

### B16 — a result split down the middle on the two in-and-out lists

```
Screen      E5 settle-up (out of balance) and E2b stands — the counted rows
Seen        at 360 on a seven-figure night, "−$1,201,400" broke across two
            lines inside its own cell, and the line under the name went with
            it: "in $1,201,500 · out" over "$100". On E5 the row is tighter by
            an avatar and a chevron, so it went first
Expected    a figure on one line. A number split in half is the thing this
            app's format helpers exist to prevent — "−$1,201," over "400" is
            not a shorter way of writing −$1,201,400, it is two other numbers
Found       30 Aug, by the "wrapped" check above, on the first run that reached
            E5 at all
Locked by   npm run check:ui — ui-journeys.mjs, "wrapped". Against the old
            build E5 reports six findings at the ceiling scale and two at
            millions, and stands one; against the new one, nothing
Status      fixed in this commit
```

`ROW_FITS` is 100,000 on both screens, and it is E5's number on both: about 208
points are shared by the in-and-out line at 13/400 and the result at 18/700,
which holds "in $99,999 · out $99,999" beside "−$99,999" and does not hold six
digits. Stands is the roomier of the two and could have carried a higher one —
it takes E5's anyway, because they are the same six rows a host reads twice
within a minute, and a table that abbreviates on one and not the other reads as
a figure that changed rather than a column that is narrower.

### B14 — B3 again, on the share sheet, for a week after B3 was fixed

```
Screen      /share — the preset row, opened by tapping any figure on E3
            Deductions
Seen        at 360 the word "Custom" runs 257.69…320.97 inside a padding box
            that ends at 263.66…314.98: six points out of the left of its
            button and six out of the right, touching the rounded edge on both
            sides. Both themes. The captions — BY THE RULE, NOTHING, SET — sat
            on the ground below the chips rather than inside them.
Expected    the board's chip, the same object /log already uses: the figure
            over its caption, on a raised surface, choosing it swaps the fill
Found       29 Aug, reported from the phone
Locked by   npm run check:ui — ui-audit.mjs, "label-out-of-its-control", with
            /share now opened WITH ITS PARAMS (the new `PARAMS` map) so the row
            is on screen when the pass runs; and ui-journeys.mjs, which now
            taps a charge on Deductions and measures the sheet on a night in
            the millions
Status      fixed in this commit
```

**This is not a new bug. It is B3, in the second of the two places B3 lived.**
B3 rebuilt the chip in `log.tsx`, wrote down why, and left `share.tsx` on the
shape it had just replaced — same `Button variant="preset"`, same 24 points of
padding a side, same word coming out through both sides of its own button. The
measurement above is B3's measurement, to the hundredth of a point, on a
different route eight days later.

So the fix is not the chip a second time. The chip is now
`apps/mobile/src/components/Preset.tsx` and both screens draw it, which is the
only version of this fix that cannot half-land again. A copied component is a
bug with a delay fuse: `docs/screens.md` even recorded the divergence — *"/share
still has the older shape and the same 24"* — and recording it is not the same
as it being anybody's next job.

**Why nothing saw it.** `/share` has been in the audit's `ROUTES` since B2 put
it there, and the pass has been opening it at `/share` with no arguments the
whole time. The sheet needs to be told which rule and which person; without them
it renders its empty fallback — a titled sheet with no body — and every check
passes over it, because a sheet holding nothing holds nothing wrong. Seventeen
route-passes' worth of green over a screen whose body was never built.

Two things close it, and the first is the one that matters:

- `ui-audit.mjs` now carries a `PARAMS` map, and `/share` is opened at
  `?rule=kitchen&player=seed-lena` — the seeded night's own bill and somebody it
  charges. Against the old build the pass reports the finding twice, once per
  theme, at 360; against the new one, nothing. Any other screen that is nothing
  without its arguments gets a line in that map.
- `ui-journeys.mjs` now taps a charge on Deductions, which is how a host reaches
  this sheet, and measures it with the big night's figures on it. It is the only
  path to `/share` that has a real night behind it — the browser build keeps its
  database in memory, so no URL can carry one.

### B13 — the phone's own figures were filed under somebody out of the design

```
Screen      not one screen — home's "What you paid", E6's You row, G4 My stats,
            and every control useIsAdmin draws
Seen        the app opens with the host being Marek, a name out of the handoff's
            canonical night. Saying "this is me" on the roster changed the
            roster and nothing else: the night went on attributing the host's
            buy-ins and their result to the seeded guess, My stats stayed empty,
            and the host lost the write controls on their own live game
Expected    the host is themselves, by name; and saying so once moves whose
            figures are called yours on every table still running
Found       29 Aug, on the phone
Locked by   npm run check — hostSeat.test.ts, "never overwrites a name the host
            chose" and "never rewrites a night that is settled"
Status      fixed in this commit
```

Two halves, and the second is the one that had teeth.

The **name** was a seed problem. `sampleNight` has to stamp `meId` onto
somebody, and it stamped the canonical night's Marek — so a screen could be held
against the frame it was drawn from, which was worth doing and was never meant
to be the answer a person read. `hostSeat.ts` gives that seat the host's name
instead, keeping the id, and repairs the roster's copy of the row once. Keeping
the id is the whole trick: a fresh one would have stranded the club_member row
beside the night's and put two of the same person in the group.

The **standing** was a correctness problem. `useIsAdmin` asks whether the club's
admin *is* the night's `meId`, and `makeAdmin` only ever moved the first of the
two. So the one control in the app for saying who you are put the two answers
out of step, and out of step means not admin — the host tapped their own name
and the app stopped letting them record a buy-in. `makeAdmin` now moves both.

`CLAIM_LIVE_NIGHTS` stops at a settled night on purpose, the same line
`renamePlayerInPlay` draws: a result already filed under a seat stays filed
there. That is a real limit and not an oversight — a host who names themselves
after settling a night keeps that night's result on the old seat, and the honest
fix for it is the ledger's own, not a rewrite of the book.
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
