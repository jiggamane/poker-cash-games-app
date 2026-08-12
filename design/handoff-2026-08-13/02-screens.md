> **Partly superseded — see `CHANGELOG.md` (12 Aug 2026) §4.** Sections *02 · Groups*, *04 · The group* and *05 · Opening a night* have changed: no group switching, no joining, restructured group creation, rebuilt stats and invite screens. Ignore any mention of a switch-group screen or a join flow.

# Screens

54 screens, each drawn dark and light. Ids match the labels in the design files — open the file, find the section, screens are labelled above each frame.

| Group | File | Screens |
| --- | --- | --- |
| Home, groups, membership, the group, opening a night | `design/Screens - Before the night.dc.html` | H1–H3, G1–G5, P1–P5, S1–S2, C1–C6, O1–O7 |
| The night, the bill and the kitty | `design/Screens - The night.dc.html` | N1–N10, B1–B6 |
| Ending the night, from outside | `design/Screens - After the night.dc.html` | E1–E7 (incl. E3b), X1–X2 |

**Skip P1–P5, S1 and G5** — membership, plans, upsell and locked states. Not in this build.

Every screen is 402 × 874. Page margin 22 px; 20 px for cards and button rows. Status bar and home indicator are drawn but belong to the OS.

---

## 01 · Home — three states of the root

Home is the group you are currently in. Every flow starts and ends here, and every screen is one tap from it. The three states differ only in what the top block offers.

**H1 · first run.** Hatched card: "Nothing on the book yet" / "Your first session" / an explanation of what the app does. Primary **Open the table**. Below: Add the players (with "nobody in the group yet"), Money rules ("optional · bill, kitty, host fee"), Settings. Foot: Invite a player.

**H2 · idle.** The top block becomes **Start a session**, naming what it will reuse: "$5 / $5 buy-in · same rules as last time". A repeat night is one tap. Then the standing rows: The group · My stats · Sessions · Settings.

**H3 · live.** The top block becomes **Tonight**, badged `PLAYING NOW · 3H 17M`, with "5 at the table · the ledger is open". Sessions reads "tonight, then 27 before it". Tapping the block goes to N1.

Rows below the top block are identical across all three states — only the block changes. Build it as one screen with three card variants.

---

## 02 · Groups — several tables, sealed from each other

**G1 · Your groups.** Each group with its role badge (HOST / PLAYER), member count, nights and stakes; a group with no recent night says so ("no night since March"). Footnote: "You see a group's book only while you are in it. Leave, and it closes behind you." Actions: New group · Join.

**G3 · Switch group.** The compact version: name, role, member count. Same two actions.

**G2 · New group.** Name, currency, and who is in it (you, as host). The explanation that a new group carries nothing over is part of the screen, not a tooltip. Primary **Create the group**.

**G4 · My stats.** Segmented: All groups / per group. Hero net, then best night, worst night, nights in the black, then a per-group breakdown. Every figure is after kitty and bills. Footnote states the privacy rule: only you see this page; inside a group, members see your net in that group and nothing else.

---

## 04 · The group — its people and its rules

**C1 · Name the group.** The first-run version of G2, reached from Welcome. Carries the sentence that defines the whole product: "You are the host. The host keeps the book: only you can log buys, close a night and settle it. Everyone else reads."

**C2 · Players.** Regulars and Occasional, each row an avatar initial, name, meta ("12 nights · in the group since Jan", "8 nights · watcher", "2 nights · not invited yet") and all-time net in green or red. Header note: nets are all-time, after the kitty. Actions: Add a player · Invite.

**C5 · Edit a player.** Name field, "Pays into the kitty" toggle, nights played, a link into their history. The two paragraphs about renaming and removing are load-bearing — keep them verbatim. Destructive action **Remove from the group** ("no longer seated"), outline only, never filled. An open debt shows as a warning on this screen and never blocks removal.

**C3 · Invite a player.** Group summary with member avatars, the invite link with its expiry ("anyone with the link can join · expires in 7 days"), four share affordances (Copy, Message, Share, QR code), then "Or add them yourself — Add by name only · no app needed" with the explanation that a name-only player can be in tonight's ledger and claim the link later. Reset link is available.

**C4 · Settings.** This group (name, currency, default stakes, default buy-in) · Appearance (theme, show cents — off, whole dollars only) · Watchers (share a live link). Version line at the foot.

**C6 · The kitty · who pays in.** The group-level default. Rate shown with a Change control. A list of members with a pays-in toggle each; the host is marked, the house is marked "never pays in", a guest "plays free". Counter reads "Pays in · 4 of 6". Toggle: new players pay in by default.

---

## 05 · Opening a night

**O1 · New session.** The game: stakes, default buy-in, start time ("stamps every entry from here"). Then **Money rules as a choice on the screen**: "Keep last night's rules", selected, with the rules named beneath it; and "Change the rules · edit, switch one off, or run with none", which opens O3/O5. Then the seated list with the host badged, and Find a player. One primary confirms the lot: **Open the table · 20:05**. A group's first night has nothing to inherit and routes into the rules step instead.

**O2 · Add players.** Search, sorted most recent first, each row with last-played and nights count. Seated rows show SEATED; others show Add. "New player — type a name" at the foot. Primary **Done · 4 seated**.

**O3 · Money rules · empty.** "No rules yet" with the explanation of what a rule does and the reassurance that most clubs set these once. Then three starting points — Food & drinks, Group kitty, Host fee — each with a USE action. Primary **Add the first rule**.

**O4 · Money rules · configured.** An untitled rule reads "Set it up · Nothing set yet — the tags fill in as you choose." Configured rules are cards: name, tags (`FIXED · $170`, `SPLIT BY WINNERS`, `COLLECTED BY MAREK`), and a plain-language line. The live preview sits above the primary: "If tonight ends like last Tuesday, $296 leaves the table: $120 back to Marek, $50 to Lena, $126 to the kitty." Primary names the act and the time: **Open the table · 20:05**.

**O5 · Rule editor.** Title with "TAP THE TITLE TO RENAME". How much: a value, a unit toggle, presets 5 / 10 / 15 and Set. Charged to: winners off their net win / everyone at the table, flat. Taken from: gross win / net after the bill. Collected by (optional): "Nobody yet" with Choose, and the note that unset means held by the group.

**O6 · Collector picker.** Search, then "Has collected before" with counts ("collected 14 times · last in July"), then "Never collected · add to use" with ADD chips, then "Someone outside the group". Primary confirms by name: **Keep Radka**.

**O7 · The kitty · tonight.** Tonight-only overrides. Rate restated as a group rule. Each person: on, "off tonight" with a reason, or "never pays in · group setting". Counter "Pays in tonight · 3 of 5". Note that it can be changed again mid-night from the house rules sheet. Primary **Use these**.

---

## 06 · The night

**N1 · Session · totals** and **N2 · Session · feed** are one screen with two tabs.

Shared header: group name, "Tonight", `LIVE` badge, elapsed. Hero: money **On the table**. Strip: seats + since, cash in, cashed out. A **House rules** control opens B1.

**Totals** (default): one row per player — name, what they are in for in words ("buy-in + 2 rebuys", "buy-in · double"), amount. Sorted most money in first. Cashed-out players stay in the list ("cashed out · counted $2,120"). Ends with **Total in play**.

**Feed**: newest first, each row time · what happened · sub-line · amount. Expenses appear as rows ("Pizza & drinks · Marek paid · $170"). Tapping any row opens N10.

Foot on both tabs (rev 7, replacing the End the night row + Buy-in / Cash out pair): a **dock** holding **Rebuy** (primary, 1.9fr) and **Bill** (secondary, 1fr), with a collapsed **Table admin** row above them (`seat · cash out · end`).

**N1b · Table admin drawer.** The dock expanded, screen behind it dimmed. Three rows — Seat a player, Cash out a player, and **End this poker night** in red with "Hold 1.5s · counting starts, no rebuys". Rebuy and Bill stay visible and live underneath. Tapping the chevron collapses it.

**N1c · Player sheet · rebuy.** Tapping a player row on Totals or Feed. The player's name, what they are in for in words, and their total. Primary is **Rebuy $500** — pre-filled with that player's last rebuy, with **no explanatory line under it** (the derivation is a dev-side rule, not interface copy). Then **Other amount** (opens N6) and **Edit entries** (N10 list), then **Cash out Petr** in red, which is the only route to N9 that skips the picker.

**N3 · One player.** Name, `SEATED`, since. Two figures: buy-in + rebuys, and Counted (an em dash while unknown) with the explanation that net is known once chips are counted. Then every entry with its time. Then the rules that apply to them as tags, with the line "Both charge winners only. If he finishes down, neither applies." Actions: Cash Petr out · Rebuy · Note.

**N4 · Buy-in · pick a player.** "Who's playing?" — at the table (rebuy) with current totals, not seated (first buy-in), and New player. A player who has cashed out appears in neither list.

**N5 · First buy-in · amount.** Header names the player and the act (`BUY-IN · FIRST`) and their status ("not seated yet · joins at 23:22"). Big amount, presets (default marked DEFAULT, ×2, Custom with SET), "Stamped 23:22 · Change", numeric keypad. Primary **Seat Dana · log buy-in**.

**N6 · Rebuy · amount.** Same, with `REBUY · 3RD` and "already in for $1,500". Presets: the player's last rebuy (marked LAST, the default), ×2, ×4, Custom — falling back to the standard buy-in when they have not rebought yet. Primary **Log the rebuy**.

**N7 · Seat a new player.** Name field, roster suggestions, first buy-in with "standard" marked. Explains it also adds them to the group roster. Primary **Seat and buy in**.

**N8 · Cash out · pick a player.** At the table with what each is in for; "Already out" with time and result. Note: cashing out is final for the night — their chips are counted, their result is set, and they cannot buy back in.

**N9 · Cash out · count the chips.** Player, `CASH OUT`, what they are in for. Big count, then their result stated immediately ("Petr's night +$850"). Stamped/Change, keypad. Primary **Cash Petr out**.

**N10 · Correct an entry.** The entry restated with who logged it and when. The append-only paragraph. Two actions: **Change the amount** ("writes a correction") and **Void this entry** ("writes a reversal"). Close.

---

## 07 · The bill and the kitty

**B1 · House rules sheet.** Reached from the live session. Each rule with its current figure — the bill at its actual total, the kitty as an estimate ("≈ $126"), each with a plain line beneath. "Comes off 3 of 5 tonight · Change" opens B6. Actions: Add an expense · Done.

**B2 · Food & drinks · empty.** "Nothing ordered yet" with the reassurance that the bill can be added when the food arrives and nothing is charged until settle-up. Below, the group's rule stated as two facts: who pays (split equally between the winners) and when charged (at settle-up, never taken off the table mid-game).

**B3 · Add an expense.** Amount, category (Food / Drinks / Other), what, who paid, stamp with Change, split between (Winners / By win size / Everyone) marked as the group default applying to tonight only, keypad. Primary names it: **Add $120 · Pizza**.

**B4 · Food & drinks · set.** Total on the bill, who it is charged to, the items with payer and time, Add another, then "How it lands, if the night ended now" — each winner with their share, what they fronted, and the net effect on them (Dana −$57, Marek +$63, Lena −$6). The note states why: "Marek fronted $120 and Lena $50 — both are paid back, so the bill balances to $0 across the table." Actions: Change split · Done.

**B5 · Change the split.** Segmented Winners / By win size / Everyone, the total across n winners, an editable figure per person with their reason ("biggest win", "fronted $120"), and **Left to assign** which must reach $0. Note: any figure can be typed over and the rest re-split. Primary **Save for tonight**.

**B6 · Kitty · change it mid-night.** Tonight only, changes who it comes off and not the rate. Per person toggles with reasons. Note: nothing already logged changes — the kitty is worked out at settle-up. Primary **Save for tonight**.

---

## 08 · Ending the night

**E1 · Confirm.** "4 players still have chips" with the rule stated: nothing closes until every stack is counted. Each uncounted player with what they are in for. Actions: **Count them up** · Not yet.

**E2 · Count up (1 of 3).** Header: `COUNTED $2,880 of $2,880` with a `BALANCED` state. Still seated: each player, what they are in for, an editable count. Already gone: cash-outs with their figure, not editable. Primary **Apply the money rules**, disabled until balanced.

**E3 · Deductions (2 of 3).** Hero: **Leaves the table $296** with the destinations spelled out ("$120 back to Marek, $50 to Lena · $126 to the kitty"). Then one block per rule: name, total, an explanatory line ("Split equally between the winners · Marek fronted $120, Lena $50. Tap a figure to change it."), and a row per charged player. For a percentage rule each row shows its working ("5% of $1,620 · $81").

Foot: **Everyone after deductions** — a preview of the night's result, framed as provisional: a dashed outline, a `PREVIEW` tag and a line explaining that it updates as the figures above are set. It holds one row per player with every component of the arithmetic in its own labelled column: **Gross · Bill · Back · Kitty · Net**. Nothing is collapsed into a single expression. The two deduction columns carry a bone wash running the height of the table so a reader can follow one kind of money down the list; reimbursements ("Back") sit plain in ink, since that money returns to a person rather than leaving the table. Green and red stay on the net alone. Primary **See who pays whom**.

**E3b · Deductions · before the bill.** The same screen before every figure is in. The bill reads "—" with "Nothing on the bill yet. Add it and the split appears here." and its per-person rows show em dashes; the kitty, being a rate, already computes. In the preview the Bill and Back columns are em dashes, the Kitty column is filled, and each net is gross minus kitty (Dana +$1,539, Marek +$437, Lena +$408). The hero reads $126 · "Only the kitty so far · the bill is not in yet", and the note becomes "Waiting on the bill. The count fills in as the figures above are set."

Every cell in the preview is derived. A column that has no figure yet shows an em dash rather than a zero — nothing is ever presented as settled before it is.

**E4 · Settle up (3 of 3).** One line of context: "Six transfers clear the night. The kitty is set aside for the group." Then the transfers: payer → payee → amount, with rule destinations ("The kitty") as payees. Below, Night's net per player, sorted winners first, tinted rows. Actions: **Close the session** · Share · Export. Edit in the nav bar opens the editing mode described in `04-money-math.md`.

**E5 · Settle up · out of balance.** Replaces E4 when the count does not agree. "It doesn't add up · Off by $150", the arithmetic in words, then every player with in, out and result. The resolution line names three ways forward: fix a count, add the missing buy-in, or write the difference off to the kitty. Actions: **Settle the night** · Fix.

**E6 · Night settled.** The archived night: date, times, duration, player count, "settled". Three figures: through the table, entries, off the table. Net after deductions per player with in/out beneath each name. Then the destinations ("Kitchen & drinks → Marek $170", "Kitty · held by the group $126"). Actions: **Full ledger** · Rematch. Share in the nav bar.

**E7 · Payments.** "Who has paid" — the night is closed and on the book; this list is just the money moving. Rows are paid (with time) or waiting (with a **Mark paid** action, host only). A player removed from the group keeps their row. Running total: "$760 of $1,350 still owed". Primary **Nudge the table**.

---

## 09 · From outside

**X2 · Join by invite.** "Ivo invited you", the group name large, its facts ("12 nights on the book · $5 / $5 · Saturdays at Ivo's"), and three statements: you see the table live, your net carries across every night, only Ivo writes to the book. Primary **Join the group**.

**X1 · Watcher · read-only.** The night from a player's side. Header names who keeps the book ("kept by Marek · 3h 17m") and badges `WATCHING`. The watcher's own position first: "You, Lena · in $1,000 · 2 buy-ins · counted at the end". Then the table's figures, then the feed with second-person phrasing for their own entries ("You bought in"). No action bar. Ends with: "Read-only. Only Marek can write to the ledger."

Build X1 as N1/N2 with `canWrite: false` — same data, different projection.
