# Game outcomes: the journey, and what is said twice

A pass over every screen that shows a player how their night came out — what
the engine computes, where each figure surfaces, and where the same figure is
printed a second time under a different name.

The journey map itself is `design/cjm-game-outcomes/` — thirteen artboards, the
ten outcome surfaces drawn at ship size with the app's own tokens, plus the
calculation chain and the findings. `game-outcomes-journey-map.html` opens the
whole thing in a browser.

Figures throughout are the seeded canonical night — `rev15-night.test.ts`, the
one the app opens with — read off the engine rather than typed by hand.

## The chain

```
entries[]  →  resolveLedger()   voids dropped, corrections folded in
           →  balanceCheck()    boughtIn · accountedFor · left · state
           →  settle()          grossResult · deductions · finalPosition
                                transfers · reconciliation · totalOffTable
           →  working.ts        which rows there are, in what order,
              summary.ts        and what each one is called
```

`CLAUDE.md`'s rule holds everywhere: **no screen adds anything up.** Every
figure below is one engine call, and the labels come off the night's own rule
snapshot, so a night settled under an older bill still describes itself
correctly. That part of the app is right, and none of what follows is an
arithmetic bug.

## The surfaces

`/stands` was the tenth until 5 September; see finding 8.

| # | Screen | Route | What the engine hands it |
| --- | --- | --- | --- |
| 1 | Tonight | `/session` | `totalBoughtIn` · `resultBeforeDeductions` |
| 2 | Count up (E2) | `/count-up` | `balanceCheck` |
| 3 | Deductions (E3) | `/deductions` | `settle().deductions` · `resultFormula` |
| 4 | Settle up (E4) | `/settle-up` | `settle().transfers` · `resultFormula` |
| 5 | It doesn't add up (E5) | `/settle-up`, caught | `checkReconciliation` · `balanceCheck` |
| 6 | The night, settled (R1) | `/settled` | `gameResults` · `ruleOutcomes` · `resultFormula` · `resultTotals` |
| 7 | Full ledger | `/ledger` | `resultColumns` · `columnsFit` |
| 8 | The player card | `/player` | `workingRows` · `nightScore` |
| 9 | Who pays whom (R2) | `/payments` | `paymentProgress`, off `settle().transfers` |

`/watch` renders the settled body for a watcher; My stats and My games print
`nightScore` per night. Both are outside the closing flow and are not drawn.

## Where each figure is printed

`o` is the surface that owns the figure — where it is decided, entered or first
stated. `x` is the same figure printed again.

| Figure | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Money in | x | o | | | | x | x | | x | |
| Entries · players | | o | | | | | x | | | |
| Game result | x | x | x | | | x | o | x | x | |
| Net after deductions | | | | o | x | | | x | x | |
| Deductions total | | | | x | | | o | | | |
| Where the money went | | | | x | x | | o | | x | |
| Transfers | | | | | o | | | | | x |
| The rounding step | | o | | | x | | x | | | |
| Does it balance | | o | | | | x | x | | | |
| "Change a rule…" | | | | o | x | | | | | |

## The findings

Ordered by what a reader loses, not by how much code moves.

### 1 · The balance card is built once and rewritten as prose

The host sees the same fact twice, in two shapes, on consecutive screens.

Count a night $20 light and E2's block goes red in place:

    IN PLAY  $5,000          ACCOUNTED FOR  $4,980
    6 players · 9 buy-ins    5 counted · 1 cashed out
    ─────────────────────────────────────────────────
    ✕  $20 SHORT

Tap Next — E2 sends an unbalanced night straight past the deductions — and E5
opens with:

    OFF BY $20
    $5,000 went in, $4,980 is accounted for. Someone's stack is short, or a
    buy-in was never written down.

Both come off the same `balanceCheck()` call. The card *shows* the two figures;
the alert *retypes them into a sentence*, which then has to be kept in step with
the card by hand. It has already drifted once: B40 records the sentence reading
`$5,000 went in, $2,860 was counted out` — everything in, against the final
counts alone, leaving the $2,120 somebody cashed out during play on neither
side. Read literally it described a $2,140 hole under a tag saying $20. The
card cannot make that mistake; prose can make it again.

**Do:** extract `BalanceBlock` from `count-up.tsx` to `src/components/`. Its
`paint()` table already has all three states, red included, and E2 already
reaches red — so E5 draws the same block instead of the alert, and keeps only
the half that is genuinely its own: the cause, and the three ways out.

### 2 · Two lists of money that disagree, with nothing saying why

E4's transfers are balances; its `Night's net` chips are scores. Tomáš pays out
$500 across three rows and shows −$500 in a chip. The reasoning is three
paragraphs in `docs/screens.md` (§ *A row prints a score, not a balance*) and
not one word on the screen.

**Do:** one line under the section label — *what each night came to, after the
food and the piggy bank* — or drop the chips, which are E3's preview again one
screen later.

### 3 · The deductions total is printed twice on one screen

`NightResult.tsx` draws `DEDUCTIONS $296` in the header card and `TOTAL $296`
at the foot of the block. The four-screens board draws both (`docs/four-screens.md`
§ Screen 3, items 4 and 6). `docs/screens.md` says there is no total row
*"because the total is already on the screen, at the top"*. Board and spec now
contradict each other and nobody has answered which wins.

**Do:** answer it. The spec wins on behaviour and the board on layout, and this
is layout — so the row stays and the doc is stale. Either way, one of the two
files is wrong today.

### 4 · Four view models in core have no reader

`receiptRows`, `resultRows`, `playerDeductions` and `ruleCollector` in
`working.ts` are exported, tested in `rev15-night.test.ts` and `stacks.test.ts`,
and called from nowhere in `apps/mobile`. `docs/screens.md` still says
*"`receiptRows` is still what the player card draws"* — the player card draws
`workingRows`.

**Do:** delete the four and their tests, or write down which screen is waiting
for them. A tested function with no caller is a claim about the app that is not
true.

### 5 · Where the money went is said three times, three ways

`"$120 back to Marek, $50 to Lena · $126 to the piggy bank"` on E3; *"The piggy
bank is set aside for the group"* in E4's lede; `→ Lena, Marek` and
`held by Radka` in E6's block. All three read `deductions[].credits`, and only
the third goes through `ruleOutcomes()`.

**Do:** one `RuleOutcomeList` off `ruleOutcomes()`, drawn on E3 and E6. E4's
lede keeps the transfer count and drops the rest.

### 6 · "Leaves the table" is the one phrase this flow forbids

`design/handoff-four-screens/docs/four-screens.md`, verbatim: *"Never the
phrases 'leaves the table' or 'taken from the table' anywhere in this flow."*
It is the label on E3's summary card (`deductions.tsx`). E6 prints the same
figure correctly, in one word: **Deductions**.

**Do:** relabel the card `Deductions`, matching E6. It is a copy rule, not a
preference.

### 7 · A settled night no longer shows anybody their net

Taking the deductions out of the game-results row (commit `29aed62`, 3 Sept)
was right — a bill split flat across eight people is not a poker result. It
also moved the figure a player argues about a week later ($1,429 for Dana, not
$1,620) behind a button called *Full ledger*, and no row on E6 is tappable. The
de-duplication opened a gap.

**Do:** put the net back on the row as a second, muted figure at the right of
the game result — or give *Full ledger* a name that says it holds your number.

**DONE, 5 September**, and by neither of those two — by a third answer, off a
board cut the same day. `design_handoff_rebuy_and_results/` Part 2 redraws the
settled night as `R1 · Results`: three blocks, `AT THE TABLE` then `DEDUCTIONS`
then `FINAL`, with the net back on the row at 18/700 and the arithmetic printed
under the name.

    FINAL                          after deductions and compensations
    Dana                                                     +$1,543
    1,620 − 54 − 23

That is the figure a player argues about a week later, in the block that carries
it, with its terms beside it — and still no row that opens anything, because
there is nothing left behind a tap. Colour is reserved for that block: the table
figures above it stay neutral so nobody reads them as the answer.

**It reverses the rule the gap came from**, deliberately. 3 September's cut said
*deductions are not folded into any player's balance* and it was right about
what it was defending — a bill split flat across eight people is not a poker
result. R1 keeps that distinction visible instead of enforcing it by
subtraction: the game figure is a row of its own in the block above, the
deduction is a slab of its own in between, and the `− 54` in the caption is the
reader watching the two meet. Whoever fronted a bill gets a term of their own for
it, in tan — `+ 242 paid` — because off-table money coming back is not a poker
result either.

The terms are the engine's: `resultFormula().caption` in `packages/core`, with
`Σ caption === Σ terms === net` asserted for every player of every night the
suite settles, and the handoff's own eight-player worked example held to the
dollar in `results-r1.test.ts`. `ui-journeys.mjs` asserts the caption is on the
phone; it used to assert the opposite, and the line saying why is beside it.

### 8 · A whole screen exists to re-sort the screen behind it

`/stands` draws Count up's finished players again, off the same two calls, in
the same two groups. What it adds is a sort and a rank number.

**DONE, 5 September.** The screen, its route, its link off E2 and its legs in
the four UI passes are deleted. E2's `Counted` and `Cashed out earlier` groups
rank biggest winner first in their place — within each group, not across the
two, because a counted row reopens the keypad and a cashed-out-earlier row does
not, and one heading over two affordances is the thing three groups exist to
prevent. `Still to count` keeps seat order: an em dash is not a position.

**Still open:** Tonight's `Cashed out` group. `session.tsx` sent this exact
question to E2b — *"Ranking them by RESULT is the other candidate and belongs to
E2b, which is the screen that ranks"* — and E2b no longer exists. Those rows do
draw their result at the right edge, so the argument now applies to them too.
Left in seat order pending a call rather than changed on the strength of a
decision made about a different screen.

### 9 · One number, five nouns

$5,000 is *total in* on Tonight, `BOUGHT IN` on Count up, `PRIZEPOOL` on the
settled night, `IN PLAY` to a watcher. A host sees the first three inside ten
minutes with nothing saying they are one figure.

**DONE, 5 September. The word is `In play`**, which is what `/watch` already
called it. Tonight, Count up and the settled night now say it too.

Two figures deliberately keep their own names, because they are different
numbers and not the same one spelled differently:

- **`On the table`** on Tonight — what the players still seated have in front of
  them ($2,880), against `In play`'s every dollar the night has to reconcile
  ($5,000). Tonight draws both, and only when they differ.
- **`In for`** on the player card — one person's stake, not the night's.

⚠ Two costs, recorded rather than argued away. It is a **deviation from the
board**, which draws `PRIZEPOOL` on the settled night; and it is **past tense on
a settled night**, where nothing is in play any more. The alternative is a
fourth right word for the fourth screen, which is the thing being fixed.

### 10 · Four row treatments for one player's result

Tonight, Count up and `/stands` share `ActiveRow` and `FinishedSlab` from
`PlayerList.tsx`. E5's counted list hand-rolls a fourth for the same three
facts. The transfer row is the same story: E4 and E7 each draw it from scratch.

And E5 hand-rolls the arithmetic with it. `stands.tsx:56` reads
`resultBeforeDeductions(s.boughtIn, out)`; `settle-up.tsx:312` reads
`(out - s.boughtIn) as Money` — the same subtraction, done on the screen, with
a cast past the `Money` guard that `subtract()` exists to apply. It is the one
place in the outcome flow where `CLAUDE.md`'s rule is broken: *a screen that
adds up its own column is a second, untested implementation of the same sum.*

**Do:** E5 calls `resultBeforeDeductions` and draws `FinishedSlab`; one
`TransferRow` with an optional trailing slot covers E4 and E7.

### 11 · "Change a rule and look again" is on two consecutive screens

Identical label, identical destination (`/money-rules`), one step apart. On E3
it is the point of the screen — the rules are itemised right above it. On E4
the decision has been made and the room is handing over cash.

**Do:** keep it on E3. E4's way back is the back button, which is already there.

### 12 · The rounding row hides itself against its own contract

`NightResult.tsx`'s `roundingMode` prop doc says the row *"says `off` rather
than vanishing"*, because a night that never rounded still has a setting. The
render is `result.rounding.on && …`, so on a settled night that did not round,
it vanishes.

**Do:** pick one and make the code and the comment agree. Showing it is the
documented intent and the one that keeps the screen's height stable.

## What is deliberate and should stay

- **The transfer list appears twice.** E4 is read out loud once; E7 is a
  checklist cleared over a week. Same rows, genuinely different job — and no
  figure in the app reads `paidAt`, so a host who never opens E7 loses nothing.
- **The columns and the formula line.** `/ledger`'s four columns and E3's
  sentence are the same decomposition off the same engine; width is the reason
  there are two drawings of it. Two drawings of one night, not two answers.
- **`resultBeforeDeductions` on seven surfaces.** One function, one
  implementation, seven callers. That is the rule working, not a repeat.
