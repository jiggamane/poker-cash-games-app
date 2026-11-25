/**
 * The app's parts and their user journeys: the one map both boards are built from (UX review,
 * 24 November, ux-review.md). The full design board shows each part's phones in journey order; the
 * working board opens each part with its journeys, the states still to draw, and what is to decide.
 *
 *   files     screens/*.mjs whose phones land in this part when no step names them
 *   journeys  [{ name, steps: [{ label, ids }] }], in the order a person meets them
 *   missing   [{ step, state, shows, why, priority }]: states no phone draws yet (P1 must, P2 should, P3 nice)
 *   decisions what the owner has to decide before this part can be built
 */
export const PARTS = [
  { key: 'in', title: 'Getting in', files: ['20-getting-in.mjs'],
    journeys: [{ name: 'First sign-in to a group', steps: [
      { label: 'Sign in by email', ids: ['sign-in', 'sign-in-code'] },
      { label: 'Check your email', ids: ['sign-in-sent'] },
      { label: 'The link lands', ids: ['auth-callback-wait', 'auth-callback'] },
      { label: 'Name the account, first time only', ids: ['your-name'] },
      { label: 'No group yet: the walkthrough', ids: ['groups-empty', 'groups-empty-2', 'groups-empty-3', 'groups-empty-4'] },
      { label: 'Start a group', ids: ['new-group', 'new-group-nocur', 'new-group-money', 'new-group-players'] },
      { label: 'Or join with a link or a code', ids: ['claim', 'claim-typing', 'claim-checking', 'claim-dead', 'claim-member'] },
      { label: 'Switch between groups', ids: ['groups'] },
    ] }],
    missing: [
      { step: 'Sign in by email', state: 'Asked too often', shows: 'The bar faint: “Email me a link in 42s”.', priority: 'P3' },
      { step: 'The link lands', state: 'Signed in', shows: '“Signed in” · “Taking you back to the club.”', priority: 'P3' },
      { step: 'Or join with a link or a code', state: 'Sending the claim', shows: 'Claim your place with its bar blocked and the hairline running.', priority: 'P2' },
      { step: 'Or join with a link or a code', state: 'Where a claim lands', shows: 'Home as a member, with the live card if a night is running.', priority: 'P2' },
      { step: 'Or join with a link or a code', state: 'The camera scanner, and the camera refused', shows: 'A viewfinder sheet; refused, “The camera is off for this app. Type the code instead.” (draft)', why: 'Only if scanning is kept: the app has no scanner.', priority: 'P2' },
    ],
    decisions: ['Invite codes: six characters (asked for on six phones; a server change) or the ten the server issues today?', 'QR scanning: build a camera scanner with its permission flow, or drop “Scan the QR code” from the walkthrough and Type your invite code?', 'No currency: is a points-only group a server and formatting change for this build, or later?', 'The setup note under Sign in (“Redirects to … This must appear in Supabase…”) is off the board with the other long lines. The app shows it on purpose to diagnose a failed link: drop it from the app too?'] },

  { key: 'home', title: 'Home', files: ['10-home-tonight.mjs'],
    journeys: [{ name: 'Coming back to the app', steps: [
      { label: 'Main menu', ids: ['home'] },
      { label: 'The first night, a group of one', ids: ['home-first'] },
      { label: 'A night is running', ids: ['home-live'] },
      { label: 'Counting, not settled', ids: ['home-unsettled'] },
      { label: 'A member, not the host', ids: ['home-member'] },
      { label: 'The game is passed to you', ids: ['home-pass'] },
      { label: 'A plan ran out', ids: ['plan-lapsed'] },
    ] }],
    missing: [
      { step: 'Main menu', state: 'Offline', shows: 'A line under the group: “No connection · saved 17:20, reconnecting”; Invite dead.', priority: 'P2' },
      { step: 'Main menu', state: 'Loading', shows: 'A card skeleton where the game card sits.', priority: 'P3' },
    ],
    decisions: [] },

  { key: 'open', title: 'Opening a night', files: ['30-opening-a-game.mjs', '05-this-round.mjs'],
    journeys: [{ name: 'From Start a session to an open table', steps: [
      { label: 'New session', ids: ['new-night', 'new-night-seated', 'new-night-amount', 'new-night-second', 'new-night-host-night'] },
      { label: 'The membership gate', ids: ['new-night-gate', 'new-night-gate-used'] },
      { label: 'Add players', ids: ['c-std-1', 'c-std-2', 'c-std-3', 'c-std-4', 'c-std-remove', 'c-search', 'c-nomatch', 'c-new', 'c-taken'] },
      { label: 'A new player, invited at the table', ids: ['c-new-added', 'c-invite', 'c-invite-qr', 'c-invited'] },
      { label: 'Game details, behind Change', ids: ['new-night-details', 'new-night-details-rules', 'new-night-details-empty'] },
      { label: 'A rule', ids: ['new-night-rule', 'new-night-rule-rest', 'new-night-rule-bill', 'new-night-rule-blocked'] },
      { label: 'Currency', ids: ['new-night-currency'] },
      { label: 'The table opens', ids: ['session-empty'] },
    ] }],
    missing: [],
    decisions: ['Where seating lives: New session keeps its seat grid, or becomes the game line plus Add players opening the sheet? It settles three duplicate drawings and the two ways in on an empty Tonight.'] },

  { key: 'during', title: 'During the night', files: ['40-during-the-game.mjs'],
    journeys: [{ name: 'Recording the money', steps: [
      { label: 'Tonight', ids: ['session', 'session-hidden'] },
      { label: 'The Table admin drawer', ids: ['session-admin'] },
      { label: 'A rebuy or a buy-in', ids: ['pick', 'log-rebuy', 'session-rebuy-undo'] },
      { label: 'A player’s card', ids: ['player', 'player-out', 'player-corrected'] },
      { label: 'Cash out', ids: ['log-cashout', 'log-cashout-over'] },
      { label: 'Seat a new player', ids: ['seat', 'seat-empty', 'seat-clash'] },
      { label: 'Correct or void an entry', ids: ['entry', 'entry-amount', 'entry-amount-blocked'] },
      { label: 'Tonight’s money rules', ids: ['money-rules', 'rule', 'rule-edit'] },
      { label: 'Tools from the table', ids: ['pick-tool'] },
    ] }],
    missing: [],
    decisions: [] },

  { key: 'bill', title: 'The bill', files: ['50-the-bill.mjs'],
    journeys: [{ name: 'Food, drinks and who fronted them', steps: [
      { label: 'The bill', ids: ['bill', 'bill-empty'] },
      { label: 'Add a spend', ids: ['spend', 'spend-covered'] },
      { label: 'Edit or void a spend', ids: ['spend-edit'] },
      { label: 'Bill rules', ids: ['bill-rules', 'bill-rules-changed'] },
    ] }],
    missing: [
      { step: 'Add a spend', state: 'Several fronters', shows: 'A row and an amount per person, “$120 of $120 covered”; short, the bar is blocked on “$20 still to cover”.', priority: 'P2' },
    ],
    decisions: [] },

  { key: 'end', title: 'Ending the night', files: ['60-counting-up.mjs', '65-settling.mjs'],
    journeys: [{ name: 'Count, deduct, settle, pay', steps: [
      { label: 'Count up', ids: ['count-up-empty', 'count-up', 'count-up-entry', 'count-up-off', 'count-up-balanced'] },
      { label: 'End time and rounding', ids: ['end-time', 'end-time-empty', 'rounding'] },
      { label: 'Deductions', ids: ['deductions', 'deductions-rules', 'deductions-not-yet', 'deductions-rule-fails'] },
      { label: 'A share set by hand', ids: ['share', 'share-typed', 'share-set', 'share-viewer'] },
      { label: 'Settle up', ids: ['settle-up', 'settle-up-off', 'rounding-settle'] },
      { label: 'Post-game results', ids: ['settled', 'settled-grouped', 'settled-view-menu', 'settled-on-table', 'rounding-locked'] },
      { label: 'Who pays whom', ids: ['payments', 'payments-settled'] },
      { label: 'Nudge the table', ids: ['nudge', 'nudge-none'] },
    ] }],
    missing: [
      { step: 'Count up', state: 'Counted over', shows: 'A positive gap: “A count is too high, or a buy-in was written down twice.”', priority: 'P2' },
      { step: 'Deductions', state: 'Read by a player', shows: 'The same preview with no pencils and nothing tappable.', priority: 'P2' },
      { step: 'Settle up', state: 'Write the difference off', shows: 'The link opens a confirm: the amount, and that it goes to the piggy bank.', priority: 'P2' },
      { step: 'Post-game results', state: 'A player’s card on a settled night', shows: 'Badge “counted”, the After deductions block, Close only.', priority: 'P2' },
      { step: 'Who pays whom', state: 'Part paid', shows: '“2 of 6 paid”, ticked rows dimmed in place, Left to move smaller.', priority: 'P2' },
    ],
    decisions: [] },

  { key: 'run', title: 'Watching and passing the game', files: ['45-running-the-game.mjs'],
    journeys: [{ name: 'Who records, and who watches', steps: [
      { label: 'A member’s Tonight', ids: ['session-watching'] },
      { label: 'Pass the game', ids: ['pass-game', 'pass-game-confirm', 'pass-game-nobody'] },
      { label: 'The passer waits, or takes it back', ids: ['session-passed', 'session-takenback'] },
      { label: 'What another phone recorded', ids: ['late-changes'] },
      { label: 'Watch by link', ids: ['watch', 'watch-ended', 'watch-refused'] },
      { label: 'Hand over admin of the group', ids: ['hand-over', 'hand-over-none'] },
    ] }],
    missing: [
      { step: 'Pass the game', state: 'The pass failed', shows: 'NOT PASSED; “No connection. The game is still yours…”; the bar “Try again · pass to Lena”.', priority: 'P2' },
      { step: 'The passer waits, or takes it back', state: 'The receiver has opened it', shows: 'WAITING gone: “Lena is recording. Every entry they make shows here as they make it.”', priority: 'P2' },
      { step: 'What another phone recorded', state: 'Changes waiting, on Tonight', shows: 'A line above the bar: “2 changes from another phone · Review”.', priority: 'P2' },
      { step: 'Watch by link', state: 'Watching while the night is counted', shows: 'What /watch shows between ending the night and settled.', why: 'Unclear in the app: needs a decision.', priority: 'P2' },
      { step: 'What another phone recorded', state: 'Loading, and all decided', shows: '“Reading them off the server…”; then Close only.', priority: 'P3' },
    ],
    decisions: [] },

  { key: 'stats', title: 'Sessions and stats', files: [],
    journeys: [{ name: 'Looking back', steps: [
      { label: 'Sessions', ids: ['games', 'games-empty'] },
      { label: 'My stats', ids: ['stats', 'stats-book', 'stats-empty'] },
    ] }],
    missing: [], decisions: [] },

  { key: 'group', title: 'The group and its players', files: ['70-sessions-stats-group.mjs'],
    journeys: [{ name: 'Who is in the group', steps: [
      { label: 'Players', ids: ['players', 'players-typing', 'players-runners', 'players-member'] },
      { label: 'A player', ids: ['member', 'member-rename', 'member-clash', 'member-remove'] },
      { label: 'Invite a player', ids: ['invite', 'invite-qr', 'invite-reset', 'invite-blocked'] },
      { label: 'Your name in a group', ids: ['seat-name', 'seat-name-changed'] },
      { label: 'Your account name', ids: ['your-name-edit'] },
    ] }],
    missing: [
      { step: 'Invite a player', state: 'A seat already claimed', shows: '“Claimed”, the code muted, the controls dead: “Ivo claimed this. It cannot be used again.”', priority: 'P2' },
      { step: 'A player', state: 'The admin’s own sheet, and an invited player', shows: '“Admin · this is you”, “has the app”; or the “invited” badge and “invited · link out”.', priority: 'P2' },
    ],
    decisions: [] },

  { key: 'settings', title: 'Settings and money rules', files: ['80-settings-and-rules.mjs'],
    journeys: [{ name: 'The group’s settings', steps: [
      { label: 'Settings', ids: ['settings', 'settings-more'] },
      { label: 'The group’s default rules', ids: ['club-rules'] },
      { label: 'Table rules', ids: ['table-rules', 'table-rules-pick'] },
      { label: 'Delete your account', ids: ['delete-account', 'delete-account-running', 'delete-account-failed'] },
    ] }],
    missing: [
      { step: 'Settings', state: 'Restore from a backup: the wrong file', shows: '“That is not a backup from this app.”', priority: 'P3' },
    ],
    decisions: [] },

  { key: 'plan', title: 'Your plan', files: ['85-your-plan.mjs'],
    journeys: [{ name: 'Membership', steps: [
      { label: 'Your plan', ids: ['plan-regular', 'plan-regular-used', 'plan-free', 'plan-founder', 'plan-friend', 'plan-restore'] },
      { label: 'Move up', ids: ['plan-upgrade', 'plan-store-wait', 'plan-store-failed', 'plan-upgraded'] },
      { label: 'Move down or stop', ids: ['plan-downgrade', 'plan-cancel', 'plan-pending'] },
    ] }],
    missing: [
      { step: 'Your plan', state: 'A grant ending soon', shows: '“Full until 1 March” (draft), and what it becomes after.', priority: 'P3' },
    ],
    decisions: ['Buying a plan: in-app purchase through the store at this release (prices, Restore, the waiting and failed states), or not yet? Every phone here and both gates’ bars depend on it.'] },

  { key: 'tools', title: 'Poker tools', files: ['90-poker-tools.mjs'],
    journeys: [{ name: 'Help at the table', steps: [
      { label: 'Tools', ids: ['tools'] },
      { label: 'The calculator', ids: ['odds', 'odds-turn', 'odds-amount', 'odds-river', 'run-out'] },
      { label: 'Rulings', ids: ['rules', 'rules-search', 'rules-yours', 'situation', 'situation-group'] },
      { label: 'Boosters', ids: ['boosters', 'booster'] },
    ] }],
    missing: [
      { step: 'Rulings', state: 'No match', shows: '“Nothing in the library matches. Try the word a player would use.”', priority: 'P3' },
      { step: 'The calculator', state: 'Too close to call', shows: 'The chop or near-even tag on a hand.', priority: 'P3' },
    ],
    decisions: [] },
];
