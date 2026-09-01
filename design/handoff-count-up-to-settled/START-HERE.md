# Count up → settled · handoff for Claude Code

**Cut 1 September 2026.** One flow, three screens: the money is counted on **E2**, the transfers are agreed
on **E4**, the night is read back on **E6**. Two decisions in this cut — the **E6 results row**, format `7a`,
and how **settled players are told apart from active ones** on Tonight and E2. Everything else here is
carried forward unchanged from the E2 handoff of 30–31 August.

```
START-HERE.md                             this file
docs/01-the-flow.md                       what carries from the count to the settled screen
docs/02-E6-results-row.md                 the chosen row, format 7a — geometry, tokens, markup, both themes
docs/03-E2-balance-check-logic.md         carried forward: the balance block, states, strings, colour
docs/04-rounding.md                       carried forward: the rounding row, the sheet, the maths
docs/05-active-vs-settled.md              active vs settled players — groups, row treatment, list type scale
boards/Result Formula Options.dc.html     turn 7 = the six formats at full screen (7a chosen, 7g its bright twin)
boards/Cashed Out States.dc.html          turn 2 = Tonight with 1a applied; turn 1 = the three treatments
boards/Settled Status.dc.html             E2 layout 2a and its colour options
images/tonight-grouped-both-themes.png    Tonight, dark and light
images/count-up-grouped.png               E2 Count up, treatment 1a — the build
images/count-up-recessed.png              E2 Count up, treatment 1c — the alternate
```

Open a board straight from `boards/` in a browser, no server. `support.js` sits next to it.

## About the design files

The HTML in `boards/` is a **design reference**, not production code. It is a set of static frames drawn at
true phone geometry (393 × 852) so density and contrast can be judged honestly. The task is to **rebuild
these screens in the target codebase** using its own framework, component library and state layer. Nothing
in `boards/` should be copied into the app as-is; the markup quoted in `docs/02` is there to pin exact
values, not to be pasted.

## Fidelity

**High fidelity.** Colours, type, spacing and row geometry are final and are stated to the pixel. Recreate
them exactly. The one thing deliberately left open is listed under *Still to draw* below.

## What is decided in this cut

* **E6 shows four terms per player: game, food, piggy, net.** `game` is buy-in and cash-out collapsed to a
  single figure; `food` is a person's share of the bill netted with anything they paid at the counter, so a
  payer shows a credit; `piggy` is the group's cut, always a separate deduction.
* **Format `7a` is the build** — one row per player, the three terms on a grey sub-line, the net on the
  right. It is the only format besides the ledger `7e` that fits all eight players above the fold, and it is
  the one that still reads as a list rather than a spreadsheet.
* **`7e` stays as the full-screen variant** behind the *Full ledger* button, where columns are worth the
  width. It is drawn on the board; it is not the default.
* **Settled players are grouped, muted and signed**, on Tonight and on E2 alike — the right-hand column
  changes meaning from *money in* to *result before deductions*, so the group header states which. Full
  spec and the list type scale in `docs/05`.
* **Tonight keeps everything else exactly as it is** — same header, same *On the table* card, same admin
  drawer, and **no Totals / Feed tab switcher**.
* Formats `7b`, `7c`, `7d`, `7f` are reading reference — **do not build.**

## Layout decisions carried forward

* **E2 layout `2a` is the build**, per `docs/03`. Turn-1 options on the Settled Status board are the
  alternatives it was chosen against.
* **Rounding is owned by E2**, per `docs/04`. E4 and E6 display the setting and can change it while the
  night is open; neither owns it.
* **No new hue.** Money green `#6FCF97`, money red `#F0705C`, status amber `#E8B455`. Light theme
  substitutes `#0A7A3D`, `#B03A28`, `#7A5410`.

## Still to draw

* The **short / over** states of the E2 block (specified in `docs/03`, not drawn).
* Whether E2 takes the `1a` fade or the `1c` recessed rows at eight players — both are drawn, `docs/05`
  states the trade.
* No transition is drawn for a row moving between groups when a player cashes out.
* The row's behaviour when a name plus its sub-line exceeds the available width — see the truncation note in
  `docs/02`. No truncation rule has been chosen.
* Where the *Full ledger* button lands, and whether `7e` there is scrollable or paged.
