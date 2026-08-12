# Test checklist — the closed-circle round

Two parts: what has to be true before the app touches a real table, and what to watch for during the night itself.

---

## A. Money correctness

Run these as automated tests. All figures from `04-money-math.md`.

- [ ] The worked night reproduces exactly: gross results +1,620 / +460 / +430 / −500 / −780 / −1,230.
- [ ] Gross results sum to zero.
- [ ] Kitty at 5%: 81 / 23 / 22, total 126. Lena's 21.5 rounds up.
- [ ] Bill of 170 across three winners: 57 / 57 / 56, biggest win takes the extra unit.
- [ ] Deducted nets: 1,482 / 380 / 352 before reimbursement; 1,482 / 500 / 402 after.
- [ ] Each fronter is reimbursed exactly what they fronted and still pays their own share — Marek +$63 net on the bill, Lena −$6.
- [ ] A bill's shares and fronts sum to zero across the table.
- [ ] Settlement produces exactly six transfers, in the drawn order and amounts (Petr→Dana 1,230 · Ivo→Marek 500 · Ivo→Lena 280 · Tomáš→Dana 252 · Tomáš→Lena 122 · Tomáš→kitty 126).
- [ ] Settlement is deterministic — same night, same list, every time.
- [ ] A night with a zero-sum subgroup produces fewer than `k − 1` transfers.
- [ ] No floating point appears anywhere in a money path.
- [ ] Every displayed total equals the sum of its displayed parts.
- [ ] Losers are never charged by a winners-only rule.
- [ ] A rule edited after a session is settled does not change that session's figures.

## B. Ledger integrity

- [ ] No code path updates or deletes an entry.
- [ ] A correction writes a new entry; both remain visible in the feed.
- [ ] A void writes a reversal; totals reflect it, history keeps it.
- [ ] Back-dating changes `occurredAt` only; `loggedAt` is untouched.
- [ ] Re-deriving every total from the log alone gives the same numbers as the live state.
- [ ] A settled session rejects new entries.

## C. Offline

- [ ] Open a night, log ten entries, correct one, count up and reach settle-up with the device in aeroplane mode throughout.
- [ ] Reconnecting drains the queue in order with nothing lost and nothing duplicated.
- [ ] Kill the app mid-night; reopening restores every entry.
- [ ] A push that times out and retries does not double an entry (`clientId` idempotency).
- [ ] A watcher who was offline for an hour catches up correctly on reconnect.

## D. The flows, by hand

- [ ] First run to open table in under two minutes, with five people seated by name only.
- [ ] Repeat night: O1 shows "Keep last night's rules" selected with the rules named, and one button opens the table with every setting confirmed.
- [ ] "Change the rules" from O1 reaches the money-rules screen, where a rule can be edited, switched off for the night, or all of them dropped.
- [ ] A group's first night offers no inheritance and routes into the rules step.
- [ ] Seat a player mid-night who was never in the group.
- [ ] Cash a player out; they cannot be bought back in, and appear in neither list on N4.
- [ ] Remove a player who still owes money: removal succeeds, the warning appears, and the debt stays on the night and on its payments list.
- [ ] Add an expense at 21:48 and see it in the feed, on B4, and in the deductions.
- [ ] Switch someone off the kitty at 23:26 and see it in the settle-up, with nothing logged changing.
- [ ] Try to end the night with an uncounted stack — blocked at E1.
- [ ] Enter a deliberately wrong count and confirm E5 states the exact gap.
- [ ] Write the difference off to the kitty and confirm a ledger entry is created.
- [ ] Edit a transfer at settle-up: a debtor cannot receive, Save stays blocked until balanced, Reset restores.
- [ ] Close the session, then mark payments paid over the following days without the night's figures changing.

## E. The watcher

- [ ] A link opens the night with no account and no install.
- [ ] The watcher's own position appears first and their entries read in second person.
- [ ] No write control is reachable anywhere in the watcher view, including Mark paid on the payments list.
- [ ] The link cannot reach the group's other nights.

## E2. Identity

- [ ] A player added by name only plays a full night, appears in settle-up and lands on the book — with no app, no link and no account.
- [ ] A per-player invite link activates into that player's existing row: their name, history and net are already there, and no form asks for a name.
- [ ] Activation creates no second person and changes nothing in the ledger.
- [ ] A link cannot be used to activate as a different player.
- [ ] A player who changes phone can be re-issued a link by the host and keeps their history.
- [ ] Two groups activated with the same credential resolve to one person in My stats.

## F. Presentation

- [ ] Both themes; the theme setting follows the phone by default.
- [ ] Every figure is tabular and columns line up down a list.
- [ ] Green is only ever a win, red only ever a loss, bone only money leaving the table.
- [ ] One filled primary per screen, and it names the act.
- [ ] Every pushed screen has a back control labelled with where it returns to, plus a home glyph.
- [ ] Hit targets 44 px minimum; the keypad and preset rows are comfortable one-handed.
- [ ] Copy matches the design word for word.
- [ ] The deductions preview shows an em dash, never a zero, for a figure that has not been set [E3b].
- [ ] The preview updates the moment a bill is added or a figure is edited above it.

---

## During the real night

Have someone watch for these and write them down. They are the things a test round exists to find.

1. **Where does the host hesitate?** Every pause is a screen that did not say what it needed to.
2. **What gets logged late?** If back-dating is used constantly, the buy-in flow is too slow.
3. **Does anyone argue with a number?** Note which screen it was on and what they expected.
4. **Does the count come out balanced first try?** If not, why — a missed buy-in, a miscount, or a rule nobody understood?
5. **Does anyone read the settle-up out loud, and does the room accept it?** That is the product working.
6. **Do the watchers actually watch?** If phones stay in pockets, the watcher view is not worth Phase 3 effort.
7. **What did the host do on paper anyway?** That is the missing feature.

Collect the session's ledger export afterwards. Any night where the numbers were disputed is worth replaying through the tests.
