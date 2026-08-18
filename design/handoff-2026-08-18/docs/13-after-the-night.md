# 13 · After the night · E1–E7

Rev 14, 13 August 2026. Nine frames in both themes, drawn on `design/Screens - After the night.dc.html`
and rendered for build in **`screens-after-the-night.html`**. That file is the pixel source: every
dimension, weight, colour and string is inline on the element. This document carries only what markup
cannot say — order, state, blocking rules and arithmetic.

Chrome comes from `09-navigation.md` and wins over anything drawn here. Money comes from
`04-money-math.md`. Tokens from `07-design-tokens.md`.

---

## The flow

| | Screen | Chrome | Leads to |
|---|---|---|---|
| E1 | End the night · confirm | Sheet | E2, or back to Tonight |
| E2 | Count up — step 1 of 3 | Push | E2b, E3 |
| E2b | Where everyone stands | Push | back to E2 |
| E3 | Deductions — step 2 of 3 | Push | E4 |
| E3b | Deductions, bill not yet in | Push | E4 |
| E4 | Settle up — step 3 of 3 | Push | the settled night |
| E5 | Out of balance | Sheet, replaces E4 | back into the count |
| E6 | Night settled | **superseded — build `1C`** | — |
| E7 | Payments | off the settled night | — |

**E2 → E4 are pushed.** Going back a step is real navigation, and a half-counted night must not be
swipe-dismissible. E1 and E5 are the two off-ramps and are the only sheets in the flow. The steps are
numbered on screen — `1 of 3`, `2 of 3`, `3 of 3` — because they are genuinely sequential.

---

## The canonical night

Every E frame except E5 draws one night, and they agree to the dollar. Assert it in a test.

| Player | In | Out | Gross | Bill | Back | Piggy bank | Net |
|---|---|---|---|---|---|---|---|
| Dana | 500 | 2,120 | +1,620 | −57 | — | −81 | **+1,482** |
| Marek | 500 | 960 | +460 | −57 | +120 | −23 | **+500** |
| Lena | 1,000 | 1,430 | +430 | −56 | +50 | −22 | **+402** |
| Tomáš | 500 | 0 | −500 | — | — | — | **−500** |
| Ivo | 1,000 | 220 | −780 | — | — | — | **−780** |
| Petr | 1,500 | 270 | −1,230 | — | — | — | **−1,230** |

- $5,000 in, $5,000 out — $2,880 on the table plus Dana's $2,120 cashed out at 23:15.
- Gross results sum to **zero**. If they do not, the money model is wrong and E4 must not be shown.
- Nets sum to **−126**: the piggy bank is the only money that leaves the table. The $170 bill returns to
  the two people who fronted it.
- Transfers on E4, six of them: Petr → Dana 1,230 · Ivo → Marek 500 · Ivo → Lena 280 ·
  Tomáš → Dana 252 · Tomáš → Lena 122 · Tomáš → the piggy bank 126. Each payer's outgoings equal their net;
  each payee's incomings equal theirs.

**E5 is a different sample night** ($4,500 in, five players). It illustrates a state; do not read its
roster against the table above.

### ⚠ Open — the split rule

The bill on these frames is split **evenly between the winners** (57 / 57 / 56). Rev 12 (S62) made
**by size of win** the default, which on this night gives **110 / 31 / 29** and changes every winner's
net and four of the six transfers. Nothing in the layout moves. What changes is the sentence under the
rule name and the three amounts — and neither is a constant: both come from the session's rules
snapshot. Build it that way and the decision costs nothing later.

---

## E1 · End the night · confirm

Appears when *End this poker night* is held on the Tonight dock **and any seated player is uncounted**.
It is not shown when the count is already complete.

- Title is a count: "4 players still have chips". Body states that nothing closes until every stack is
  counted, and offers the together-path.
- One row per uncounted player: 36px round initial, name over `in for $1,500 · not counted`.
- **Count them up** pushes E2. **Not yet** dismisses and writes nothing.
- **Errata.** The frame is drawn at `radius 24px` with a `38 × 4` grabber over a flat dim. Chrome B in
  `09-navigation.md` is FINAL and wins: `radius 26px 26px 0 0`, `38 × 5` grabber, and the live Tonight
  screen behind at `opacity: .32`.

## E2 · Count up

A count for every seated player, drawn mid-count so both list states are visible.

- Header card: `COUNTED` eyebrow, `$2,610` at 800/30 with *of $2,880* inline, `2 TO GO` right. The card
  stays **neutral** — no green, no red — until counted equals what is on the table.
- Three groups: **Still to count** (em dash, pencil), **Done** (value, green check), **Already gone**
  (whole row muted, `cashed out 23:15 · in $500`, no glyph, not tappable). Players who cashed out
  during play keep what they left with and are never re-counted.
- **Apply the money rules is blocked** while any stack is uncounted: surface fill, muted label,
  `inset 0 0 0 2px` ground ring, and the reason stated beneath ("Two stacks still to count.").
- "See where everyone stands" is an underlined text link above the primary.

## E2b · Where everyone stands

Read-only, mid-count. Ranked by gross result, counted players only, rank numeral in a fixed left
column; uncounted players sit below, unranked, with an em dash.

Two sentences do the work and are verbatim: "Nothing has come off the table yet — the bill and the
piggy bank land at the next step" and "Ranks are provisional until every stack is counted." One action:
**Back to the count**.

## E3 · Deductions

Every rule, itemised per person. The screen scrolls.

- Header card: total leaving the table, with its destinations on one line —
  `$296 · $120 back to Marek, $50 to Lena · $126 to the piggy bank`.
- One block per rule: name and total, the split sentence, then a per-player row with a pencil. The
  piggy bank block shows its working (`5% of $1,620 → $81`) because a percentage is not checkable otherwise.
- **Everyone after deductions is a preview**: dashed frame, `PREVIEW` tag, columns GROSS / BILL / BACK
  / PIGGY BANK / NET, recomputed whenever a figure above changes. Losers show gross and net only — both
  rules charge winners.
- A reimbursement rides in the BACK column, never as a separate row.
- Every amount is editable in place: "Provisional until you settle. Tap any figure above to change it."

## E3b · Deductions · before the bill

The same screen with no bill yet — the common case, since the bar tab usually arrives after the count.

- The bill block keeps its position and its rows, filled with em dashes: "Nothing on the bill yet. Add
  it and the split appears here." It is never hidden.
- Header reads `$126 · Only the piggy bank so far · the bill is not in yet`.
- Preview BILL and BACK are em dashes; NET is the piggy bank-only figure.
- The primary is **not** blocked. A night with no bill is a legitimate settle.
- A spend added later — including during settle-up — recalculates every share and transfer, and the
  settlement screen must say it changed (`11-bill-and-piggy-bank.md`, S61).

## E4 · Settle up

- Transfer row: payer, arrow, payee, amount. **The piggy bank is a payee like anyone else.**
- The count is stated in words above the list, so a wrong number is visible immediately.
- **Night's net** below, best first, in the win/loss pair. These are E3's after-deduction nets.
- **Edit** top right. A debtor cannot receive; Save stays blocked until the set balances; Reset
  restores the generated set.
- **Close the session** freezes the night. Share and Export are a secondary pair beneath.

## E5 · Settle up · out of balance

Replaces E4 whenever counted chips do not equal money in.

- The gap is stated twice — as a tag (`Off by $150`) and as a sentence naming both figures and both
  likely causes.
- Every counted player is listed with `in · out` and their result; each row is a pencil into that
  count. Fixing happens here.
- **Settle the night is disabled** (E2's blocked token pair) until the difference is zero or written
  off. **Fix** is the live action.
- Third route, in the footnote: write the difference off to the piggy bank. That creates a real ledger
  entry — it is not a dismissal.

## E6 · Night settled — superseded

**Do not build this layout.** Rev 9 (S41) replaced it with `1C` from `design/Player History.dc.html`,
presented as the final screen of the ending flow: same UI and same logic for a night opened from a list
and for the night just closed. 1C's three-figure summary, its coloured `in / out / bill / piggy bank` tokens
and its sort on net after deductions all supersede what E6 draws.

Carried over from this frame: the meta line (`20:05 → 23:45 · 3h 40m · 6 players · settled`),
**Full ledger** as the route into every entry, and the rule-outcome rows
(`Kitchen & drinks → Marek, Lena $170` / `Piggy bank · held by the group $126`). Its figures are correct;
only the layout is dead.

## E7 · Payments

Settling and paying are separate. The book closes at the table; the money moves over the following week.

- One row per transfer from E4: payer → payee, state beneath (`marked paid 00:19` / `waiting`), amount
  right, **Mark paid** on waiting rows only.
- **Only the host marks a payment paid.** Everyone else sees the same list read-only.
- Running total above the action: `$760 of $1,350 still owed`. **Nudge the table** is the single action.
- Nothing here changes the night's result. A settled night stays settled whether or not cash has moved.

---

## What is not drawn

- **1C as the closing screen of the flow** — the layout exists on the Player History board, but its
  "just closed" presentation (what the nav shows, what the primary says) is not drawn.
- E4's **edit** state: the editable transfer list, the blocked Save, the Reset.
- The **write-off-to-the-piggy bank** confirmation from E5.
- E7's all-paid state (no waiting rows, no total, what replaces Nudge the table).
- E2's **per-player count entry** — the keypad screen behind each pencil.
