# 08 · Tonight — the in-game screen

Rev 8, 13 August 2026. This document is the complete specification of the live-session screen and the player screen behind it. It **replaces** the session screens in `02-screens.md` (`N1`, `N1b`, `N1c`, `N2`, `N3`) and the rev 7 changelog entries S19, S20, S22.

Board: `design/Tonight Home.dc.html` — six screens, dark and light where the theme changes anything (H1, H2, H4 in both; H3, H3b, H5 dark only, the light values follow the same substitution as the others).

Every screen is 402 × 874. Sample data reconciles against the canonical night: Ivo buys in $500 at 20:05, rebuys $500 at 21:12, in for $1,000.

---

## What changed, in one paragraph

The session screen used to be two tabs — Totals and Feed — plus a foot with four controls. Both tabs are gone. The home screen **is** the table: one figure for the money on it, one row per player, and a dock at the foot holding the two actions a host touches every half hour. Every entry with its timestamp now lives on the player it belongs to, reached by tapping that player's row. Nothing about the ledger, the money math or the data model changes; this is a navigation and hierarchy change only.

---

## H1 · Tonight · resting

The default view for the whole session. No tabs, no segmented control, no feed.

**Structure, top to bottom.**

1. **Status bar** — time left (`600 15px`, foreground), battery right (`400 13px`, muted). Padding `20px 30px 0`.
2. **Nav row** — padding `16px 20px 4px`. Back chevron (11 × 18, stroke 2.3) + group name "The poker club" (`500 17px`). Right, `gap: 16px`: a receipt glyph (19 × 19, stroke 1.8, warm `#D9D3C4` in dark) and a house glyph (19 × 19, stroke 1.9, muted). **Both destinations are unspecified** — the receipt is presumably tonight's bills, the house the group home. Decide with me before wiring them.
3. **Title row** — padding `4px 22px 10px`, `align-items: flex-end`, `gap: 10px`. "Tonight" as `h2`, `800 32px/1.05`, letter-spacing `-.03em`. A **LIVE pill**: `padding: 6px 11px`, `radius: 999px`, background green at 14 % (`rgba(111,207,151,.14)`), a 6 × 6 dot (`radius 3px`) and `700 10px` label, letter-spacing `.1em`, both in green. Right, pushed with `margin-left: auto`: elapsed time `500 13px` muted, tabular.
4. **On-the-table card** — `margin: 0 20px 16px`, card fill, 1px hairline, `radius 14px`, `padding: 14px 16px`, `align-items: flex-end`, `gap: 12px`. Label `700 11px` uppercase `.1em` muted; value `800 44px/1`, letter-spacing `-.04em`, tabular. Right: two muted lines, `400 12.5px/1.45`, right-aligned — "5 seated / since 20:05".
5. **Player list** — `flex: 1`, `margin: 0 22px`. Each row: `padding: 22px 4px`, `gap: 12px`, 1px bottom hairline (last row none). Name `600 17px`; amount `700 19px` tabular pushed right; chevron 8 × 13, stroke 2, muted. Sorted by amount in, descending.
6. **Total in play** — `margin: 0 22px`, `padding: 11px 4px 2px`, 1px top hairline. Label "Total in play" `600 16px` muted, value `700 19px` foreground.
7. **The dock** — see below.
8. **Home indicator** — 140 × 5, `radius 3`, `padding: 10px 0 9px`.

**Row states.** A seated player's name and amount are both foreground. A **cashed-out** player's name goes muted and the amount is replaced by their **night result** in the green/red pair (`+1,620`) — the row keeps its chevron and stays in the list. That is the only difference; there is no separate section for people who have left.

**What "On the table" means.** Money bought in by players still seated ($2,880 in the sample). **Total in play** is every dollar bought in tonight including those who have cashed out ($5,000). They are different figures on purpose and both are needed: the first is what is in front of people, the second is what the night has to reconcile against.

---

## The dock

One component, present on every session screen, two states.

**Collapsed (rest).** Panel: `margin: 10px 14px 0`, card fill, 1px hairline, `radius 16px`, `padding: 6px 12px 10px`, `gap: 14px`.

- **Disclosure row** — `padding: 16px 6px 14px`, `gap: 10px`. Chevron-up 16 × 16 stroke 2.4 muted, label "Table admin" `600 14.5px` muted, and right-aligned `400 13px` dimmer: "seat · cash out · end". The row is a 46px target and there is **14px of clearance** between it and the primary button, so a thumb reaching for admin cannot hit Rebuy.
- **Button pair** — `display: grid; grid-template-columns: 1.9fr 1fr; gap: 10px`.
  - **Rebuy** (primary): filled foreground, `padding: 20px 0`, `radius 10px`, `700 19px`, a plus glyph 19 × 19 stroke 2.6, `gap: 10px`, horizontal.
  - **Bill** (secondary): `2px` border at 50 % foreground, `padding: 14px 0`, `radius 10px`, **vertical** — receipt glyph 20 × 20 over `700 14.5px` label, `gap: 5px`.

**Open (drawer).** The panel border strengthens (`rgba(255,255,255,.16)`), the disclosure chevron flips down and its label goes full-strength `700 14.5px`, the right-hand hint disappears, and three rows appear above the button pair (`gap: 8px`, panel `gap` 14 → 12). Everything behind the panel drops to `opacity: .4` — including the title, the card and the list — but the Rebuy/Bill pair inside the panel **stays live**.

- **Seat a player** — `padding: 14px`, `radius 10px`, fill `rgba(255,255,255,.07)`, person glyph 19 × 19, label `600 16.5px`, trailing chevron.
- **Cash out a player** — same, play-with-arrow glyph.
- **End this poker night** — no fill; `1.5px` border in red at 55 %. Clock glyph in red. Two lines: `700 16.5px` red "End this poker night" over `400 12.5px` muted "Hold 1.5s · counting starts, no rebuys".

Switching anything else must not collapse an open drawer. Tapping outside the panel closes it.

---

## H3b · Hold in progress

The hold state of the end-of-night row, now drawn (it was EXPLORATORY in rev 7).

The row's border goes to solid full-strength red. The fill is a **left-to-right progress wipe**: `linear-gradient(90deg, rgba(240,112,92,.34) 0%, rgba(240,112,92,.34) P%, rgba(240,112,92,0) P%)` where `P` runs 0 → 100 over 1500 ms. The copy swaps to `700 16.5px` **white** "Keep holding…" over `400 12.5px` white "Release to cancel". Everything else on the screen — including the two dock buttons — drops to `opacity: .4`, and the status bar dims to 50 %.

Releasing before completion reverts the row with no dialog, no toast, no ledger write. Completing it starts the count-up (`E2`).

There is **no tap path to ending a night** anywhere else in the app.

---

## H2 · Player card · at the table

Reached by tapping a player row. This is the screen the rev 7 changelog called `N1c`, promoted from a sheet to a full screen and merged with `N3`.

1. **Nav row** — back chevron + "Tonight" (`500 17px`). Nothing on the right.
2. **Title row** — name as `h2` `800 32px/1.05`. A status pill, `padding: 6px 11px`, `radius 999px`, fill `rgba(255,255,255,.1)`, label `700 10px` `.1em` — **SEATED** in foreground. Right: "since 20:05", `500 13px` muted.
3. **Summary card** — `margin: 10px 20px 14px`, card fill, hairline, `radius 14px`, `padding: 14px 16px`, `align-items: flex-end`, `gap: 22px`. Two stat pairs: **In for** `$1,000` and **Counted** `—`, each label `700 11px` uppercase muted over value `800 32px/1` letter-spacing `-.04em` tabular. The em-dash for Counted is muted. Right, `max-width: 104px`, `400 12px/1.4` muted, right-aligned: "Net is known once chips are counted".
4. **Entries** — section label `700 12px` uppercase `.1em` muted, `padding: 0 4px 4px`. Each row `padding: 13px 4px`, `gap: 12px`, 1px bottom hairline: time in a fixed **44px** column, `600 13px` muted tabular; then a two-line stack — type `600 16px` foreground over provenance `400 12.5px` muted; amount right, `700 17px` tabular. **Oldest first.**
   - Provenance strings drawn: "first buy-in · logged by Ivo", "first rebuy · corrected from $300 at 21:14". A voided entry must render here too — copy not yet written, flag it rather than inventing one.
5. **Actions** — `margin: 14px 20px 0`, `gap: 8px`.
   - **Rebuy $500** (primary, full width): filled, `padding: 19px 0`, `radius 8px`, `700 18px`, plus glyph 18 × 18. **The amount is pre-filled per M16** — that player's last rebuy this session, falling back to the session buy-in, then the group default. Its provenance is deliberately **not** shown (M17).
   - Below, `gap: 10px`, `padding-top: 2px`, two equal secondaries at `2px`/50 % border, `padding: 15px 0`, `radius 8px`, `700 16px`: **Other amount** (→ N6) and **Cash out {name}** (→ N9).

Note the secondary pair is **not** red here. Cash-out is a normal, expected act; only ending the night is destructive.

---

## H4 · Player card · cashed out

Same screen after the player's stack is counted.

- Pill reads **CASHED OUT** in muted (`700 10px`), and the right-hand line is "left 23:15".
- The summary card carries **three** stat pairs at `800 30px/1`: **In for** $500 · **Counted** $2,120 · **Night** `+1,620` in the green/red pair, the third pushed right with `margin-left: auto` and right-aligned.
- The entries list gains a **Cashed out** row — "stack counted · seat closed" — with the counted amount, and beneath a 1px top rule a `400 13px/1.5` muted line: "Her result is set. Bills and the kitty still come off it at settle-up."
- Actions become two equal secondaries at `padding: 17px 0`: **Correct an entry** and **Back to table**. There is no primary. Rebuy is gone — a cashed-out player who buys back in is seated again from the drawer (M9 is unchanged).

---

## H5 · Tonight · nobody in yet

The state between opening the table and the first buy-in. Reachable every night, so it is not optional.

- Header and the On-the-table card are present with the card at `padding: 12px 16px` and the figure at $0.
- The list is replaced by a centred empty state: person glyph 34 × 34 stroke 1.6 in a very dim tone, `700 19px` "Nobody has bought in yet", and `400 14px/1.5` muted, `max-width: 250px`: "Seat the first player and the table starts filling. Buy-ins are $500 tonight."
- **The dock inverts its priority.** The primary becomes **Seat a player** — same 1.9fr slot, person glyph, `700 19px` — and **Bill is disabled**: border drops to `rgba(255,255,255,.22)`, glyph and label to `#5C5E64`. There is nothing to split until somebody is in for something.
- The disclosure row still reads "Table admin · seat · cash out · end", so ending an empty night is still reachable.

---

## Theme substitution

The dark values are given above. The light twin substitutes, one for one:

| Dark | Light |
| --- | --- |
| Screen `#0A0A0B` | `#FFFFFF` |
| Card fill `#16161A` | `#F4F4F6` |
| Hairline `rgba(255,255,255,.11)` | `rgba(12,13,15,.1)` |
| Foreground `#FFFFFF` | `#0C0D0F` |
| Muted `#8B8D93` | `#6B6F76` |
| Primary button: white fill, `#0C0D0F` label | `#0C0D0F` fill, white label |
| Secondary border `rgba(255,255,255,.5)` | `rgba(12,13,15,.5)` |

Device frame `#07080A` and the green/red result pair are the same in both. Everything else — every dimension, weight, radius and string — is identical.

---

## Implementation notes

- `lastRebuyAmount` stays a derived query, exactly as rev 7 specified: newest non-voided `rebuy` for that player in that session, else session buy-in, else group default. Recompute after every ledger write, including corrections and voids.
- The player list needs two sums, not one: seated-only for "On the table", all-entries for "Total in play".
- A cashed-out player's row shows a **result**, which means the row's value changes meaning depending on status. Keep them as two distinct fields in the view model rather than one formatted number.
- The dock is one component with a `variant` (`resting` | `empty-table`) and an `open` flag. It renders on H1, H3, H3b, H5 — not on the player card, which has its own action group.
- Nothing in `03-data-model.md` or `04-money-math.md` changes.
