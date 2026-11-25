/**
 * Where review stands: the panel at the top of the board.
 *
 * The verdicts live in the published artifact's db (collection `reviews`). The page renders this
 * panel from `SNAPSHOT` (the db as read when the board was last built) so it is right at rest, then
 * the inline script re-renders it from the live db as verdicts change.
 *
 * `ADDRESSED` is what Claude changed after a "Needs work" note, and when. A screen whose verdict is
 * still Needs work but older than its fix reads "changed since your note, check again"; one whose
 * note is newer than the fix, or that has no fix, reads "waiting on Claude".
 *
 * `DECIDED` are options the owner chose between; their cells are gone from the board.
 */
export const BUILT = '2026-11-23T12:40:00Z';
/* The last round: changes at or after this time are the ones at the top of the board. Move it forward each round. */
export const LATEST = '2026-11-25T12:30:00Z';

export const ADDRESSED = {
  'delete-account': ['No backup offered: the sheet says what goes and holds to delete.', '2026-11-25T12:31:00Z'],
  'deductions': ['The preview uses the settled night’s rows: the game result under the name, the deductions as one terms pill, the net on the right.', '2026-11-25T12:21:00Z'],
  'new-night-rule': ['The rule kinds lose the two hourly variants; By the hour is one kind with its own form, the same for everyone or set for each.', '2026-11-25T12:21:00Z'],
  'session': ['The tools button is D: the two cards at 32, no round behind them, on every screen with it.', '2026-11-25T12:21:00Z'],
  'invite': ['The code is a finished card: whose code and “works for a month” on top, the six characters in two groups of three tiles. The same on both invite sheets.', '2026-11-25T10:21:00Z'],
  'stats-empty': ['Placeholders before the first night: the chart’s bars and two list rows in the faint grey, the shapes the real ones will take.', '2026-11-25T09:31:00Z'],
  'session-rebuy-undo': ['Undo larger: 17, heavier, with a bigger tap area; the strip a little taller.', '2026-11-25T09:31:00Z'],
  'end-time': ['The end is stamped by itself; this sheet corrects it: Started and Ended shown, the day a field that opens the calendar.', '2026-11-25T09:41:00Z'],
  'sign-in-code': ['The code boxes are as tall as the email field.', '2026-11-25T09:41:00Z'],
  'c-invite': ['Show the QR code is a wide button under Copy, Message and Share; the same on Invite a player.', '2026-11-24T18:31:00Z'],
  'sign-in': ['Every sign-in screen trimmed to its field and one line; the setup note is off the board.', '2026-11-24T18:21:00Z'],
  'home-live': ['No second table offered: the live card only.', '2026-11-24T18:21:00Z'],
  'new-group': ['No currency is the default; a currency is picked by tapping one.', '2026-11-24T18:21:00Z'],
  'home-first': ['From the UX review: twelve states the journeys were missing (four Homes, the pass card and its taking back, Rebuy with Undo, taking a player out of Add players, Restore purchases and the store’s two states, the confirm before removing a player); the Add players states redrawn on the standard frame with the new-player line back; Settings and the blocked invite as a signed-in user sees them. Removed: c-rest, House rules, both Piggy bank rules, the second rule editor.', '2026-11-24T18:01:00Z'],
  'count-up': ['Rounding and Ended move to the foot of every Count up screen, under the player lists.', '2026-11-24T17:31:30Z'],
  'count-up-balanced': ['Balanced is A, the green word with the tick in a green disc, as you approved; the other five options are off the board. The player rows stay in two lines.', '2026-11-24T17:30:30Z'],
  'new-group-players': ['The bar reads Start the group.', '2026-11-24T17:15:00Z'],
  'new-group': ['No currency is a choice beside USD, EUR, GBP and CAD (figures as plain numbers), on its own frame and in the Currency sheet; Every currency is a full-size chip.', '2026-11-24T17:16:00Z'],
  'session-empty': ['No small print; “Nobody has bought in yet” in the title face; Add players a filled ink button, the plus in a light circle.', '2026-11-24T17:21:30Z'],
  'share-set': ['Presets lifted like the chips, the chosen one ink; Put Lena back on the split a lifted row with what it comes to. The same presets on A share.', '2026-11-24T17:15:00Z'],
  'watch': ['The night so far: time, words and sum on one baseline.', '2026-11-24T17:15:00Z'],
  'seat-name-changed': ['The line at the foot is gone, here, on the unchanged sheet, and in the app.', '2026-11-24T11:20:00Z'],
  'pass-game-nobody': ['“on the Full plan, or on the Regular plan”, here and in the app.', '2026-11-24T10:58:00Z'],
  'plan-regular-used': ['Full is the offer now, not a row: the ink card Open a game draws, with a headline that answers the screen’s news (“Host again tonight, not on 1 Dec”), and Upgrade to Full is the bar. Free stays a quiet row. The same on Your plan · Regular.', '2026-11-24T10:50:00Z'],
  'stats-book': ['Every bar stands on the line, no gap: square where it meets it, rounded at its free end. Wins green, losses red, every bar at least 8 tall so a small loss still reads as a red bar; the break-even night is one thin grey pill, 3 points tall and as wide as a bar, centred on the line; “6 games · 25 h” back to its first style.', '2026-11-24T14:17:00Z'],
  'settled-grouped': ['The fronters under Kitchen & drinks are written “Lena, Andro”; the two titles are unchanged. Same on every settled view.', '2026-11-23T22:40:00Z'],
  'count-up-empty': ['“Accounted for” is gone from the second line of the header on every Count up state; the line now starts with the count itself.', '2026-11-23T22:38:00Z'],
  'rounding-settle': ['The second sentence (“Nothing rewrites a count…”) is gone.', '2026-11-23T22:36:00Z'],
  'c-nomatch': ['The invitation: a new name added is offered an invite in the same sheet, the invite itself, its QR, and the row tagged Invited after.', '2026-11-23T22:45:00Z'],
  'plan-regular': ['No games-left card here, and Full is a plain card with what it adds (no ink); Upgrade stays the bar. The used state keeps the ink card.', '2026-11-24T11:20:00Z'],
  'plan-upgrade': ['The ticks are white in a green disc, so they read on the ink card, on white and in the dark.', '2026-11-23T22:45:00Z'],
  'plan-upgraded': ['Regular and Free say Downgrade.', '2026-11-23T22:45:00Z'],
  'plan-free': ['Choose is now Get.', '2026-11-23T22:45:00Z'],
  'plan-pending': ['Keep Full is a filled button inside the card, with a line on what keeping it means.', '2026-11-23T22:45:00Z'],
  'plan-founder': ['A friend’s plan next to the founder’s: one personal Full, for life.', '2026-11-23T22:45:00Z'],
  'c-std-1': ['One line per player: the tick and the line under each name are gone. A buy-in at the standard sits muted; a changed one is full ink. Every frame redrawn.', '2026-11-23T14:25:00Z'],
  'new-night-gate-used': ['Nine new screens for changing a plan from Settings: your plan on Regular, moving up, on Full, moving down, moving to Free, a change waiting, on Free, Home after a plan ran out, and a founder’s plan.', '2026-11-23T13:50:00Z'],
  'new-night-gate': ['The same fix to the tags, for the three plans.', '2026-11-23T13:40:00Z'],
  session: ['The icon shows what a tap does, with its word back: the struck eye and Hide while the money shows.', '2026-11-23T12:40:00Z'],
  'session-hidden': ['The open eye and Show while the money is hidden.', '2026-11-23T12:40:00Z'],
  'claim-typing': ['Still needed: it is how someone already in a group joins another (Settings) and where a dead invite sends you. Now the same form as the walkthrough’s last page, with Scan the QR code.', '2026-11-23T12:40:00Z'],
  'auth-callback-wait': ['Smooth: every move eased in and out with no stops mid-move and no small twitches; the push and the peak are one motion; the chips flow down in a short overlapping wave. Measured at 60 frames a second, the biggest jolt went from 16 pixels to under 1.', '2026-11-22T23:15:00Z'],
  'groups-empty-2': ['New group and I have a code are now two equal halves of the bar on every page; on the last page the right half is Check the code. The joining card carries the group’s three chips.', '2026-11-22T23:25:00Z'],
  'groups-empty-4': ['Scan the QR code added under the code boxes (and as a QR button beside the field on the semi-open page).', '2026-11-22T23:35:00Z'],
  'groups-empty-4-old': ['One New group, on the bar only; the invite code is the page, as an open form (boxes and Check the code) or semi-open (one field that opens).', '2026-11-22T23:05:00Z'],
  'groups-empty': ['The walkthrough you picked (B), all four pages: the group’s chips first, as you asked, and the create or invite choice from D folded in, with the invite code on every page and the two doors on the last.', '2026-11-22T22:50:00Z'],
  'new-night-rule-rest': ['Remove moved into the bar beside Save rule, on every rule editor that edits an existing rule.', '2026-11-22T22:00:00Z'],
  'new-night-second': ['Named by your rule: “Friday session”, and a second the same day “Friday session 2”.', '2026-11-23T11:20:00Z'],
  groups: ['Your pick, D, applied: the name as the headline, standing above it, the group you are in as the ink card. No picture, no currency.', '2026-11-22T22:20:00Z'],
  invite: ['The code is six characters with a dash after three: K7M-4XP. Flagged: a server and security decision.', '2026-11-22T21:29:00Z'],
  'invite-qr': ['The square QR you picked, now real: it scans to the invite’s link.', '2026-11-22T21:45:00Z'],
  'new-night-gate': ['A chosen plan makes the bar live: the ink card carries a tick and the bar names it (Get Full · $9.99 a month). Not now is gone; the X closes.', '2026-11-23T11:20:00Z'],
  'new-night-seated': ['Name chips lifted like the cards, with the add in an ink circle (C, your pick), on every screen.', '2026-11-22T21:45:00Z'],
  pick: ['The same chips (C), and Tonight now sits behind the sheet instead of a grey blank.', '2026-11-22T21:45:00Z'],
  'player-out': ['Figures written in full, all three sized down together to fit.', '2026-11-22T21:29:00Z'],
  general: ['The card shadow’s fall shortened, which you approved on its own.', '2026-11-22T17:35:00Z'],
};

/* When the change is new screens rather than an edit, the update shows those screens, not the old one. */
export const SHOW = { 'deductions': ['deductions', 'deductions-rules'], 'new-night-rule': ['new-night-rule', 'new-night-rule-blocked', 'new-night-rule-hourly-each'], 'session': ['session', 'session-watching', 'watch'], 'end-time': ['end-time', 'end-time-empty'], 'invite': ['c-invite', 'invite'], 'c-invite': ['c-invite', 'invite'], 'sign-in': ['sign-in', 'sign-in-code', 'sign-in-sent', 'auth-callback'], 'new-group': ['new-group', 'new-group-nocur'], 'home-first': ['home-first', 'home-live', 'home-unsettled', 'home-member', 'home-pass', 'session-takenback', 'session-rebuy-undo', 'c-std-remove', 'member-remove', 'plan-restore', 'plan-store-wait', 'plan-store-failed', 'c-std-1', 'c-search', 'c-nomatch', 'c-new', 'c-taken', 'c-invited', 'settings-more', 'invite-blocked'], 'count-up': ['count-up', 'count-up-empty', 'count-up-off', 'count-up-balanced'], 'count-up-balanced': ['count-up-balanced', 'count-up'], 'new-group': ['new-group', 'new-group-nocur', 'new-night-currency'], 'share-set': ['share-set', 'share'],   'settled-grouped': ['settled', 'settled-grouped', 'settled-on-table'], 'count-up-empty': ['count-up-empty', 'count-up', 'count-up-off', 'count-up-balanced'], 'c-nomatch': ['c-nomatch', 'c-new', 'c-new-added', 'c-invite', 'c-invite-qr', 'c-invited'], 'plan-regular': ['plan-regular', 'plan-regular-used'], 'plan-founder': ['plan-founder', 'plan-friend'], 'c-std-1': ['c-std-1', 'c-std-2', 'c-std-3', 'c-std-4', 'c-rest', 'c-search', 'c-nomatch', 'c-new', 'c-taken'], 'players-add-c': ['c-rest', 'c-search', 'c-nomatch', 'c-new', 'c-taken'], 'new-night-gate-used': ['plan-regular', 'plan-upgrade', 'plan-upgraded', 'plan-downgrade', 'plan-cancel', 'plan-pending', 'plan-free', 'plan-lapsed', 'plan-founder'], 'groups-empty': ['groups-empty', 'groups-empty-2', 'groups-empty-3', 'groups-empty-4'], 'groups-empty-2': ['groups-empty', 'groups-empty-2', 'groups-empty-3', 'groups-empty-4'] };

export const DECIDED = [
  ['The tools button', 'two fanned cards, a red question mark on the front, 32 points, no round behind'],
  ['Balanced on Count up', 'A: the word in green, the tick in a green disc, the sum in white'],
  ['My stats, games and hours', 'as first drawn: one muted line beside the result'],
  ['The dark theme’s colours', 'the ink-blue sheet as drawn, and the footer in the same blue with a soft shadow above, on every screen'],
  ['Home’s footer', 'as drawn: the ink bar with its three controls'],
  ['The words on the bar', 'as drawn: Libre Franklin bold, 18 points'],
  ['The card shadow', 'the shorter fall'],
  ['The dark cards', 'as they are: one step lighter than the sheet, no shadow'],
  ['QR codes', 'square'],
  ['Name chips', 'C: lifted like the cards, the add in an ink circle'],
  ['Hidden money', 'dots, behind an eye at the first section label'],
  ['Your groups', 'the name as the headline, no picture, no currency'],
  ['Your groups, empty', 'the walkthrough (B), with D’s two ways in'],
];

/** The db as read at build: id → [status, comment, updatedAt]. Only screens with a verdict. */
export const SNAPSHOT = {
  'auth-callback-wait': ["approved", "the motion is generally right but it should look natural", "2026-11-22T22:21:47Z"],
  'bar-type-a': ["approved", "", "2026-11-22T17:35:29Z"],
  'bill-empty': ["approved", "", "2026-11-22T17:49:17Z"],
  'bill': ["approved", "", "2026-11-22T17:49:10Z"],
  'booster': ["approved", "", "2026-11-22T17:51:41Z"],
  'boosters': ["approved", "", "2026-11-22T17:52:21Z"],
  'built-bill': ["approved", "", "2026-11-24T10:40:27Z"],
  'built-booster': ["approved", "", "2026-11-24T11:13:28Z"],
  'built-boosters': ["approved", "", "2026-11-24T10:40:32Z"],
  'built-log-cashout': ["approved", "", "2026-11-24T11:13:46Z"],
  'built-log-rebuy': ["approved", "", "2026-11-24T11:13:39Z"],
  'built-pick': ["approved", "", "2026-11-24T11:13:34Z"],
  'built-your-name': ["approved", "", "2026-11-24T11:13:50Z"],
  'c-new': ["changes", "", "2026-11-23T22:23:33Z"],
  'c-nomatch': ["changes", "we need more states here to incklude the invitation mechanic", "2026-11-23T22:23:27Z"],
  'c-rest': ["approved", "", "2026-11-23T22:22:34Z"],
  'c-search': ["approved", "", "2026-11-23T22:22:45Z"],
  'c-std-1': ["approved", "", "2026-11-23T22:22:28Z"],
  'c-std-2': ["approved", "", "2026-11-23T22:22:29Z"],
  'c-std-3': ["approved", "", "2026-11-23T22:22:31Z"],
  'c-std-4': ["approved", "", "2026-11-23T22:22:38Z"],
  'c-taken': ["approved", "", "2026-11-23T22:23:39Z"],
  'chips-c': ["approved", "", "2026-11-22T21:31:26Z"],
  'claim-typing': ["changes", "check of this screen is still relevant", "2026-11-23T11:10:55Z"],
  'count-up-balanced-a': ["approved", "", "2026-11-24T17:10:16Z"],
  'count-up-balanced': ["approved", "lerts try moire styles for 'balanced'. can be bit more more vivid", "2026-11-24T17:18:43Z"],
  'count-up-empty': ["approved", "", "2026-11-24T17:19:01Z"],
  'count-up-entry': ["approved", "", "2026-11-23T22:33:57Z"],
  'count-up-off': ["approved", "", "2026-11-23T22:34:11Z"],
  'count-up': ["approved", "", "2026-11-24T17:19:00Z"],
  'dark-foot-c': ["", "show me more screens using that style", "2026-11-23T14:46:59Z"],
  'dark-sheet-a': ["approved", "", "2026-11-23T14:55:56Z"],
  'empty-doors': ["changes", "combine the create/invite logic into the concept 2", "2026-11-22T22:10:36Z"],
  'empty-tour': ["changes", "good, show the other screens. use the group chips icon instead for the 1st screen", "2026-11-22T22:09:49Z"],
  'entry-amount-blocked': ["approved", "", "2026-11-22T17:47:49Z"],
  'entry-amount': ["approved", "", "2026-11-22T17:47:39Z"],
  'entry': ["approved", "", "2026-11-24T10:52:22Z"],
  'general': ["changes", "the key problem that i find in term of style is that the shades below the content areas conflict with the 'still' data with no such background. maybe using a bit less shade at the bottom of such areas would help", "2026-11-22T17:31:28Z"],
  'groups-empty-2': ["approved", "invite code should be not less important than creating the group option", "2026-11-23T11:10:20Z"],
  'groups-empty-3': ["approved", "", "2026-11-23T11:10:23Z"],
  'groups-empty-4': ["approved", "there should also be option to scan qr", "2026-11-22T22:32:03Z"],
  'groups-empty-4b': ["changes", "isn't it the double of the screen with two areas for code entry?", "2026-11-23T10:59:58Z"],
  'groups-empty': ["approved", "this should be an explainer screen showing the (usually new) user the features and the way to start a group, lets research several visual concepts", "2026-11-22T22:22:06Z"],
  'groups': ["approved", "'groups headline' is a good option", "2026-11-22T22:21:55Z"],
  'hand-over-none': ["approved", "", "2026-11-24T16:52:37Z"],
  'hand-over': ["approved", "", "2026-11-24T16:52:33Z"],
  'hide-dots': ["approved", "", "2026-11-22T21:32:44Z"],
  'home-foot-bar': ["approved", "", "2026-11-22T17:26:20Z"],
  'home': ["approved", "here we cn try a more regular footer. lets try several options", "2026-11-22T17:36:11Z"],
  'invite-blocked': ["approved", "", "2026-11-24T16:49:53Z"],
  'invite-qr': ["approved", "lets try some themed rq code types if available. of not then the square one", "2026-11-22T21:36:44Z"],
  'invite-reset': ["approved", "", "2026-11-23T11:11:12Z"],
  'lift-shorter': ["approved", "", "2026-11-22T17:35:28Z"],
  'log-cashout-over': ["approved", "", "2026-11-22T17:47:19Z"],
  'log-cashout': ["approved", "", "2026-11-22T17:47:14Z"],
  'log-rebuy': ["approved", "", "2026-11-22T17:46:58Z"],
  'member-clash': ["approved", "", "2026-11-23T15:01:29Z"],
  'member-rename': ["approved", "", "2026-11-23T15:01:22Z"],
  'new-group-players': ["changes", "'Start the group'", "2026-11-23T14:48:23Z"],
  'new-group': ["changes", "add the no currency variant. the defaults should be: usd, eur, gbp, cad. and mind that there is a currency selector sheet/screen", "2026-11-24T16:49:18Z"],
  'new-night-amount': ["approved", "", "2026-11-22T21:37:09Z"],
  'new-night-currency': ["approved", "", "2026-11-22T17:43:56Z"],
  'new-night-details-rules': ["approved", "", "2026-11-23T11:11:35Z"],
  'new-night-details': ["approved", "", "2026-11-23T11:11:43Z"],
  'new-night-gate-used': ["changes", "good. now lets add all the screens necessary for the plan change (incl downgrade) that happens outside of the game opening plan check and upgrades", "2026-11-23T13:32:15Z"],
  'new-night-gate': ["approved", "it looks good, but is it correct that the button looks inactive while the plan is chosen above?\n\nis 'not now' option really needed since we have the X icon to do the same?", "2026-11-23T11:08:38Z"],
  'new-night-players': ["changes", "lets iterate on the shapes and looks of the value entry area and an 'add' button", "2026-11-23T13:24:30Z"],
  'new-night-rule-rest': ["approved", "change the remove rule ui, move it to the save button", "2026-11-22T22:23:42Z"],
  'new-night-seated': ["approved", "maybe we should make the names' shapes aith slight shadow or smth else to help fir on the new ui", "2026-11-22T21:37:05Z"],
  'new-night-second': ["approved", "Friday (or other day of the week) session - that's how the auto naming should work. if there's another session in the same day - add 2 (and so on) to it", "2026-11-23T11:09:06Z"],
  'new-night': ["approved", "", "2026-11-22T21:37:00Z"],
  'pass-game-confirm': ["approved", "", "2026-11-24T16:52:31Z"],
  'pass-game-nobody': ["approved", "", "2026-11-24T11:14:27Z"],
  'pass-game': ["approved", "", "2026-11-24T10:53:07Z"],
  'payments-settled': ["approved", "", "2026-11-24T10:57:09Z"],
  'payments': ["approved", "", "2026-11-24T10:57:06Z"],
  'pick-tool': ["approved", "", "2026-11-22T17:48:11Z"],
  'pick': ["approved", "", "2026-11-22T21:49:47Z"],
  'plan-cancel': ["approved", "", "2026-11-23T15:05:15Z"],
  'plan-downgrade': ["approved", "", "2026-11-23T15:05:08Z"],
  'plan-founder': ["changes", "add same one for friends - they will have one personal full account lifetime", "2026-11-23T15:08:15Z"],
  'plan-free': ["changes", "choose -> get", "2026-11-23T15:06:44Z"],
  'plan-lapsed': ["approved", "", "2026-11-23T15:06:50Z"],
  'plan-pending': ["", "make the 'keep full' more visible and inviting", "2026-11-23T15:06:08Z"],
  'plan-regular-used': ["changes", "upper part is good but now the otherplans look too idle. they shoudl draw attention as we do want the users to upgrade", "2026-11-24T10:38:11Z"],
  'plan-regular': ["approved", "no need to show games left here. and lets not put so much accent on the full", "2026-11-24T12:25:04Z"],
  'plan-upgrade': ["changes", "the current green on white bg isnt working well, try sth to make the green points more visible there", "2026-11-23T15:04:44Z"],
  'plan-upgraded': ["changes", "'downgrade' for a smaller plan", "2026-11-23T15:05:06Z"],
  'player-corrected': ["approved", "", "2026-11-22T21:43:14Z"],
  'player-out': ["approved", "all good but use auto size down for the values once they near collusion", "2026-11-22T21:42:48Z"],
  'player': ["approved", "", "2026-11-22T17:45:09Z"],
  'players-add-c': ["changes", "show this version with all the states", "2026-11-23T13:31:21Z"],
  'players-runners': ["approved", "", "2026-11-23T15:00:09Z"],
  'players-typing': ["approved", "", "2026-11-23T15:00:03Z"],
  'players': ["approved", "", "2026-11-23T14:59:55Z"],
  'qr-square': ["approved", "", "2026-11-22T21:30:28Z"],
  'seat-clash': ["approved", "", "2026-11-24T10:52:18Z"],
  'seat-empty': ["approved", "", "2026-11-24T10:52:16Z"],
  'seat-name-changed': ["approved", "get rid of the text at the bottom", "2026-11-24T12:23:35Z"],
  'seat-name': ["approved", "", "2026-11-24T16:50:45Z"],
  'seat': ["approved", "", "2026-11-24T10:52:14Z"],
  'session-admin': ["approved", "mind the comment ", "2026-11-22T17:11:53Z"],
  'session-empty': ["approved", "redesign the central part of the screen, use more visuals and allow to move to the players adding", "2026-11-24T17:11:50Z"],
  'session-eye-split': ["changes", "i meant for the eye icon to be on the right soze of the screen but to the left (sticking to) from the 'hide/show' text", "2026-11-23T13:21:43Z"],
  'session-hidden': ["approved", "", "2026-11-23T13:22:45Z"],
  'session-passed': ["approved", "", "2026-11-24T10:52:55Z"],
  'session-watching': ["approved", "", "2026-11-24T10:52:54Z"],
  'settle-up-off': ["approved", "", "2026-11-24T10:57:19Z"],
  'settle-up': ["approved", "", "2026-11-24T10:57:17Z"],
  'settled-grouped': ["approved", "", "2026-11-23T23:49:45Z"],
  'settled-on-table': ["approved", "", "2026-11-23T22:37:45Z"],
  'settled-view-menu': ["approved", "", "2026-11-22T17:50:00Z"],
  'settled': ["approved", "good. but lets explore the footer further in terms of the fonts/sizes ", "2026-11-22T17:38:30Z"],
  'share-set': ["changes", "update these buttons (and presets) acc to the new ui", "2026-11-23T22:31:50Z"],
  'spend-edit': ["approved", "", "2026-11-22T17:49:27Z"],
  'stats-book': ["changes", "on the graph the + and - lines shouldn't have gap between them and the 0-line. for the break even make sure its width is the same as for the + and - ones", "2026-11-24T12:24:55Z"],
  'stats-meta-a': ["changes", "return the old style for time and fames number display\n\n", "2026-11-24T10:47:48Z"],
  'stats-meta-b': ["changes", "the graph should also use red for losses, and fix the break even state - dont like when it looks like a hamburger (chipped in between)", "2026-11-24T10:48:27Z"],
  'watch-ended': ["approved", "", "2026-11-23T22:30:41Z"],
  'watch': ["changes", "timestamp and action/sum content should be on the same height", "2026-11-23T22:30:29Z"],
  'your-name-edit': ["approved", "", "2026-11-22T17:40:04Z"],
  'your-name': ["approved", "", "2026-11-22T17:40:03Z"],
};

/*
 * The panel, as one self-contained function: run at build for the page at rest, and inlined into the
 * page to re-run on every change in the db. `d` is { screens: [[id, name, sectionIndex]], sections:
 * [title], addressed, decided }; `v` is id → [status, comment, updatedAt].
 */
export function renderProgress(d, v) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const link = (id, name) => `<a href="#s-${id}">${esc(name)}</a>`;
  const names = Object.fromEntries(d.screens.map(([id, name]) => [id, name]));
  names.general = 'The look as a whole';
  const ids = ['general', ...d.screens.map(([id]) => id)];
  const approved = [], recheck = [], waiting = [], open = new Map();
  for (const id of ids) {
    const [st, comment, at] = v[id] || ['', '', ''];
    if (st === 'approved') approved.push(id);
    else if (st === 'changes') {
      const fix = d.addressed[id];
      if (fix && (!at || at <= fix[1])) recheck.push([id, comment, fix[0]]);
      else waiting.push([id, comment]);
    } else if (id !== 'general') {
      const sec = d.screens.find((s) => s[0] === id)[2];
      if (!open.has(sec)) open.set(sec, []);
      open.get(sec).push(id);
    }
  }
  const nOpen = [...open.values()].reduce((a, b) => a + b.length, 0);
  const pill = (n, t, cls) => `<span class="pp ${cls}"><b>${n}</b> ${t}</span>`;
  return `<div class="pp-row">${pill(approved.length, 'approved', 'ok')}${pill(recheck.length, 'changed since your note', 're')}${pill(waiting.length, 'waiting on Claude', 'wt')}${pill(nOpen, 'not reviewed yet', 'nr')}</div>
  ${recheck.length ? `<div class="pp-block"><h3>Changed since your note — check again</h3><ul>${recheck.map(([id, c, fix]) => `<li>${link(id, names[id])}${c ? `<span class="pp-q">“${esc(c)}”</span>` : ''}<span class="pp-a">${esc(fix)}</span></li>`).join('')}</ul></div>` : ''}
  ${waiting.length ? `<div class="pp-block"><h3>Waiting on Claude</h3><ul>${waiting.map(([id, c]) => `<li>${link(id, names[id])}${c ? `<span class="pp-q">“${esc(c)}”</span>` : '<span class="pp-a">Needs work, no note.</span>'}</li>`).join('')}</ul></div>` : ''}
  <div class="pp-block"><h3>Not reviewed yet, by section</h3><ul class="pp-secs">${[...open.entries()].sort((a, b) => a[0] - b[0]).map(([sec, list]) => `<li><a href="#sec-${sec}"><b>${esc(d.sections[sec])}</b></a> <span class="pp-n">${list.length}</span><span class="pp-ids">${list.map((id) => link(id, names[id])).join(' · ')}</span></li>`).join('') || '<li>Everything has a verdict.</li>'}</ul></div>`;
}
