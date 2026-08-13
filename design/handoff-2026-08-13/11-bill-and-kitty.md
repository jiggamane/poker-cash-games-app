# 11 · The bill and the kitty

Rev 12, 13 August 2026. Six screens, drawn on `design/Bill and Kitty.dc.html` and rendered for build in
`screens-bill-kitty.html`. This document **replaces** the B-series bill screens (`B1`–`B6`) in
`02-screens.md` and on `design/Screens - The night.dc.html`; those drawings are dead.

Chrome is the confirmed Tonight chrome — see `08-tonight-home.md` § *H1* for the title row, card and
list specifications, and § *Theme substitution* for the light values. Every dimension, weight and
string is inline on the elements in the reference file.

Screens: **L1** the bill · **L2** add a spend · **L3** spend / edit · **L4** the bill, nothing on it ·
**L5** bill rules · **L6** kitty rules.

---

## The one principle

**Nothing on these screens calculates a share.** While the game is running nobody has a result, so no
winner is known, no per-player amount can exist and the kitty's take is unknowable. The bill screens
carry two things only: **the spends**, and **the formula**. All arithmetic runs once, at settle-up,
against the counted table.

Concretely: L1 shows the total and states the rule; L5 sets the rule and says when it is charged; L6
states the kitty rule with no figure. If you find yourself needing a winner's name before the count,
the design is being read wrong.

---

## L1 · The bill

Card: label "On the bill" (sentence case, `600 12.5px` muted), value `800 44px/1` tabular. Right
column, `gap: 3px`, right-aligned: the rule in force (`500 13px` muted, "split by size of win") over
the count of spends (`400 13px` dim). No money on the right side.

List, section label "Spends". Each row: time in a fixed 44px column (`600 13px` muted tabular), a
two-line stack — note (`600 16px`) over who fronted it (`400 12.5px` muted, "Marek fronted it") — the
amount right (`700 17px` tabular), then a chevron. Newest at the bottom, in ledger order.

Below the list, a bordered block: "How it will be split" → the rule named at `600 16.5px`, then the
sentence that no shares are worked out until settle-up and that fronters are repaid exactly what they
fronted.

Actions: **Add a spend** (filled, plus glyph) and **Bill rules** (secondary). Both admin-only.

## L2 · Add a spend

One screen, no steps. Amount `800 68px/1` centred, then:

- **Note** — a chip row of **prefills** (`Food`, `Drinks`, `Venue`) above the field. Tapping one writes
  that word into the note. The chips are not a category: nothing but the amount affects the
  arithmetic. The field's right hint reads "optional" and an empty note is valid — the list row then
  shows the amount alone.
- **Covered by** — chips: each seated player, `The kitty`, and a dashed `Nobody yet`.
- Keypad, then the primary, which names the amount: "Add $120 to the bill".

The header's right meta shows the stamp that will be written ("stamped 22:12"). **There is no time
field.** Back is cancel.

### Covered by — the four cases

| Case | What it means |
| --- | --- |
| One player | They fronted the whole spend and are repaid exactly it at settle-up. |
| Several players | Per-person amounts appear and **must sum to the spend**. While they do not, the row goes red and Save is blocked. |
| The kitty | The kitty paid directly. Nobody is reimbursed; the money left the kitty. |
| Nobody yet | Counts towards the bill, unpaid. The list row carries an amber *unpaid* tag until someone is named. |

## L3 · Spend · edit

Card: "Amount" + the figure; right column names who logged it and whether it has been edited.

Rows: **Amount**, **Note**, then **Covered by** with one row per fronter (avatar initial, name, what
they put in, chevron). The sum rule above applies here too.

Beneath: fronting is not exemption — a fronter's own share still comes off their result.

Actions: **Save changes** (primary) and **Void this spend** (red outline). Voiding writes a correction
and keeps the original line; the ledger is append-only.

## L4 · The bill · nothing on it

Figure `$0` in the muted tone, right side "nothing added yet", list replaced by the centred empty
state (receipt glyph 34 × 34, `700 19px` heading, `400 14px/1.5` muted body, `max-width: 260px`).
No split block — there is nothing to split. Both actions stay, so the rule can be set before the
first spend.

## L5 · Bill rules

Section "How it is split" — three radio rows, `padding: 15px 4px`, 22px circle (2px foreground border,
10px filled dot when selected; `rgba(255,255,255,.3)` border when not), each with a caption:

| Option | Caption | Default |
| --- | --- | --- |
| By size of win | the biggest winner carries the most | **selected** |
| Evenly between the winners | same share each, whatever they won | |
| Evenly between everyone | losers pay a share too | |

Then a row for rounding granularity ("Whole dollars"). Then the "When it is charged" block: at
settle-up, never during the game; changing the rule mid-night changes nothing already charged because
nothing has been; the remainder goes to the largest share.

**Only the "evenly between everyone" option charges losers.** The other two are winners-only.

## L6 · Kitty rules

Its own screen, reached from the house rules — **never from the bill**.

Card states the rule and no total: "Charged on every win" over `5%` at `800 44px/1`, right column
"winners only" over "counted at settle-up".

Rows: **Kitty on tonight** with a switch (48 × 29, radius 15, green when on, 23px white knob),
**Charge** ("5% of each win"), **Who collects** (a person — Ivo in the sample).

**Off for tonight** — a chip row where the **filled chip is the player switched off**. Everyone else
reads at full strength; nobody is greyed, because the paying players are not disabled. The exception
applies to this night only and never touches the group's own setting.

---

## Permissions

**Admin only** writes. Everybody else opens the same screens with the list, the card and the rule
intact, every button gone, and the header meta reading "admin only". The bill is public; editing it is
not. This is stated in the header of every screen in the set.

## After the count

A spend added during settle-up is **allowed** and recalculates every winner's share and every
transfer. The settlement screen must state that it changed rather than silently redrawing.

---

## Open — needs a decision

**The default split contradicts the worked night.** `04-money-math.md` splits the sample $170 evenly
between the three winners (57 / 57 / 56) and derives every downstream figure from it, including the
six settle-up transfers. The confirmed default here is **by size of win**, which on the same night
gives 110 / 31 / 29 and changes three nets and the whole transfer list. Nothing in the drawn screens
shows a share any more, so no screen is wrong — but the money-math document and the results screens
that quote it are, until the canonical night is re-derived on the new default.
