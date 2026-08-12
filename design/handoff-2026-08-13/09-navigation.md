# 09 · Navigation — final

Rev 9, 13 August 2026. This is the settled navigation model. It replaces every earlier navigation note, including the tab-bar explorations, the kicker back row, and the "everything is a sheet" model. Board: `design/Nav System.dc.html` (four containers drawn, both chromes specified in numbers).

---

## The model in three sentences

There is **no tab bar**. A screen you navigate *to* is **pushed** and carries a round back button on its title line. A screen you open to *do one thing* is a **sheet** over what you were looking at, and dismisses downward.

The test, and it decides every case: **if the screen ends with a Save, an Add, an Apply or a confirm, it is a sheet. If it is a place you can stay in, it is a push.**

---

## Chrome A · pushed screen

```
[status bar]
[ ← ]  Title   BADGE
       meta · line · beneath
```

| Part | Spec |
| --- | --- |
| Title row | `padding: 26px 20px 0`, `display:flex`, `align-items:center`, `gap:12px` |
| Back button | 36 × 36, `radius: 18`, fill `rgba(255,255,255,.09)` dark / `rgba(12,13,15,.06)` light |
| Chevron | 10 × 17, stroke 2.4, foreground, round caps and joins |
| Title | `800 32px/1`, letter-spacing `-.03em`, foreground |
| Badge | Optional status pill, directly after the title in the same row |
| Meta line | `padding: 8px 20px 0 68px` (the 68 aligns it under the title, not under the button), `500 13px`, muted, tabular numerals |
| Right corner | **Empty.** No actions, no overflow menu, no icons. |

The root — the club — uses the same row **without** the back button: title `800 30px/1` with a 38 × 38 avatar pushed right, meta beneath. It is the only screen where a chevron never appears.

Nothing in the app puts a control in the top-right of a pushed screen. Two icons that used to sit there on the night screen (a receipt and a house) are **removed**: Bill is in the dock, and the club is what the back button returns to.

## Chrome B · sheet

```
[status bar, 50% opacity]
[what you were looking at, opacity .32]
╭───────────────────────╮
│         ▬▬▬           │  grabber
│  Title            [×] │
│  sub-line             │
```

| Part | Spec |
| --- | --- |
| Panel | `margin-top: 18px`, `radius: 26px 26px 0 0`, fill `#101013` dark / `#FFFFFF` light, `border-top: 1px solid rgba(255,255,255,.12)` / `rgba(12,13,15,.1)` |
| Grabber | 38 × 5, `radius: 3`, `rgba(255,255,255,.22)` / `rgba(12,13,15,.18)`, `padding: 9px 0 2px` |
| Title row | `padding: 12px 22px 0`, `gap: 11px`. Title `800 34px/1`, or `800 30px/1.05` when a sub-line follows |
| Status pill | After the title, same row |
| Close | 30 × 30, `radius: 15`, fill `rgba(255,255,255,.09)`, glyph 12 × 12 stroke 2.6, pushed right with `margin-left:auto` |
| Sub-line | `padding: 7px 22px 0`, `500 13px` muted, or `400 13px/1.5` when it is a sentence |
| Behind | `opacity: .32`; the status bar drops to 50% |

A sheet **never** carries a chevron, and a push **never** carries a grabber or a close. That is the only signal telling a user which gesture returns them, so the two vocabularies must not mix.

**Dismissal:** swipe down, tap the close, or complete the action. Three ways out, all landing on the screen underneath, unchanged and in the same scroll position.

## Depth

- **Pushes:** two levels below the root at most — club → Tonight, club → My nights → a night. A third push is a design smell; move the third level into a sheet.
- **Sheets:** two at most — a player sheet may raise an amount sheet, and that is the floor. Beyond that, replace the sheet's content in place and keep the same close (the rule editor and the multi-step create flows work this way).
- A sheet **never pushes**. If a sheet needs to go somewhere that is a place, it dismisses first.
- The table-admin drawer is neither: it is the dock expanding in place, with the screen behind at `.4`. It does not participate in the navigation stack and the hardware back gesture collapses it rather than leaving the screen.

---

## Every screen, classified

**Root — no chevron, no grabber**

| Screen | Container |
| --- | --- |
| Club home (old H1 first run / H2 idle / H3 live) | Root |
| X1 Watcher · read-only | Root, for a watcher's install |
| X2 Claim your place | Standalone, no chrome (arrives from a link) |
| C1 Name the group (first run) | Root, no back — nothing precedes it |

**Push — Chrome A**

| Screen | Notes |
| --- | --- |
| T1 Tonight · resting | back → club; meta "The poker club · 3h 17m · since 20:05" |
| T5 Tonight · nobody in yet | same chrome, dock inverted |
| G1 Your groups | back → club |
| G4 / My stats | back → club |
| My nights (1A Regular / 1B Free) | back → My stats |
| A past night (1C Results / 1D Money / Entries) | back → My nights; tabs live inside the screen |
| The book — month / all time | back → club |
| C2 Players · the roster | back → club |
| C4 Settings | back → club |
| Money rules (group level, the list) | back → Settings |
| E6 Night settled | back → club |
| E7 Payments | back → the settled night |
| E2 → E4 the ending flow (count up, deductions, settle up) | pushed steps: going back a step is real navigation, and a half-counted night must not be swipe-dismissible. E1 Confirm, which precedes it, is a sheet |

**Sheet — Chrome B**

| Screen | Opens over |
| --- | --- |
| T2 Player card · at the table | Tonight |
| T4 Player card · cashed out | Tonight |
| N4 / N8 pick a player (bust, cash out, rebuy) | Tonight |
| N5 / N6 amount keypads | the player sheet (second level, the floor) |
| N7 Seat a new player | Tonight |
| N9 Cash out · count the chips | the player sheet |
| N10 Correct an entry | the player sheet |
| B1 House rules · tonight | Tonight |
| B2 / B3 / B4 the bill | Tonight, or replaces B1's content |
| B5 Change the split | replaces the bill sheet's content |
| B6 / O7 the kitty · tonight | Tonight |
| O1 New session | club |
| O2 Add players | replaces O1's content |
| O3 / O4 Money rules · tonight | O1, or Tonight |
| O5 Rule editor · O6 Collector picker | replaces the rules sheet's content |
| G2 / C1b / G2b group creation, all three steps | club — one sheet, content replaced per step |
| C3 Invite a player | Players |
| C5 Edit a player | Players |
| C6 The kitty · who pays in | Settings |
| C7 Settlement due | replaces the money-side sheet's content |
| E1 Confirm · players still have chips | Tonight |
| E5 Settle up · out of balance | replaces E4 in the pushed flow |
| P1–P5 / S1 / G5 membership | club — **not built in v1** |

**Neither**

| Element | Behaviour |
| --- | --- |
| Table admin drawer (T3) | the dock expanding in place; screen behind at `.4`; Rebuy and Bill stay live |
| Hold-to-end (T3b) | a state of one row inside the drawer |

---

## What this changes in the design files

Applied already:

- `design/Nav System.dc.html` — new. The four containers drawn: root, push, sheet over a push, sheet for one setting. Use it as the source for both chromes.
- `design/Tonight Home.dc.html` — T1 (both themes) and T5 rewrapped in Chrome A. The old two-line header (club name row + title row) and the two top-right icons are gone.
- `design/Player History.dc.html` — 1A–1D rewrapped in Chrome A; the kicker back row (small caps + 7 × 12 chevron) is retired everywhere.

Still to redraw, and classified above rather than drawn:

- `Tonight Home` T2 and T4 are drawn as full screens; they are **sheets** — see `N3` on the Nav System board for the exact treatment, including the pushed screen behind at `.32`.
- The three older boards (`Screens - Before the night`, `- The night`, `- After the night`) still carry their original headers. Build from the classification table, not from those headers. The night board's `N1`/`N2` are superseded by `08-tonight-home.md` in any case.

## One naming collision to fix before you build

The old home states are `H1`, `H2`, `H3` and the Tonight board also uses `H1`–`H5`. In this document the Tonight screens are **T1–T5** (T1 resting, T2 player card, T3 admin drawer, T3b hold, T4 cashed out, T5 empty table). Rename in code accordingly; the boards' own labels still say H, which is a defect in the boards, not in the model.
