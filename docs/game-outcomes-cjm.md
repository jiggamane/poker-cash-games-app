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

## The ten surfaces

| # | Screen | Route | What the engine hands it |
| --- | --- | --- | --- |
| 1 | Tonight | `/session` | `totalBoughtIn` · `resultBeforeDeductions` |
| 2 | Count up (E2) | `/count-up` | `balanceCheck` |
| 3 | Where everyone stands (E2b) | `/stands` | `endedWith` · `resultBeforeDeductions` |
| 4 | Deductions (E3) | `/deductions` | `settle().deductions` · `resultFormula` |
| 5 | Settle up (E4) | `/settle-up` | `settle().transfers` · `resultFormula` |
| 6 | It doesn't add up (E5) | `/settle-up`, caught | `checkReconciliation` · `balanceCheck` |
| 7 | The night, settled (E6) | `/settled` | `prizePool` · `gameResults` · `ruleOutcomes` |
| 8 | Full ledger | `/ledger` | `resultColumns` · `columnsFit` |
| 9 | The player card | `/player` | `workingRows` · `nightScore` |
| 10 | Who has paid (E7) | `/payments` | `settle().transfers`, again |

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

`count-up.tsx` draws the whole equation as a card with a bar and a verdict.
`settle-up.tsx`'s `OutOfBalance` states the same two figures, off the same
`balanceCheck` call, as a sentence inside an alert. B40 already had to fix that
sentence once for pairing the wrong two figures — the card cannot make that
mistake and the prose can make it again.

**Do:** extract `BalanceBlock` to `src/components/`. E5 draws it in the `short`
/ `over` paint that `paint()` in `count-up.tsx` already defines and nothing
currently reaches.

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

### 8 · A whole screen exists to re-sort the screen behind it

`/stands` draws Count up's finished players again, off the same two calls, in
the same two groups. What it adds is a sort and a rank number.

**Do:** rank E2's `Counted` and `Cashed out earlier` groups in place and drop
the screen and its link. If it stays, take the rows off E2 rather than drawing
them twice.

### 9 · One number, five nouns

$5,000 is *total in* on Tonight, `BOUGHT IN` on Count up, `PRIZEPOOL` on the
settled night, `IN PLAY` to a watcher, *In for* per player. A host sees the
first three inside ten minutes with nothing saying they are one figure.

**Do:** two words for the whole app — one for the live figure, one for the
closed one. `ruleText.ts` is where the app already keeps the words it must not
spell two ways.

### 10 · Four row treatments for one player's result

Tonight, Count up and `/stands` share `ActiveRow` and `FinishedSlab` from
`PlayerList.tsx`. E5's counted list hand-rolls a fourth for the same three
facts. The transfer row is the same story: E4 and E7 each draw it from scratch.

**Do:** E5 uses `FinishedSlab`; one `TransferRow` with an optional trailing
slot covers E4 and E7.

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
