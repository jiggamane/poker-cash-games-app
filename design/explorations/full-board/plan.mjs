/**
 * Building the new UI: the board's plan, part by part, in the order the code
 * is written. A part goes first when it has the fewest open questions: the
 * approved screens with nothing flagged, then the approved ones with one small
 * question each, then the unreviewed ones with none, and the flows still
 * changing on the board last.
 *
 * `built` lists the board ids whose app screenshots are in `built/` (made by
 * `scripts/ui-look.mjs` from the web export); the board shows each beside its
 * drawing, light or dark with the board's switch, with its own Approve / Needs
 * work under the key `built-<id>`.
 */
export const PLAN_DATE = '24 November 2026';

export const PARTS = [
  {
    id: 'p0',
    title: 'The look underneath',
    state: 'built',
    what: 'Everything every screen stands on, so each later part is content only.',
    items: [
      'Colours: the kit’s palette for light and dark, the approved dark sheet and footer (tokens.ts)',
      'Two faces shipped with the app: Libre Franklin for titles, the bar and every money figure; Inter for the rest',
      'Pushed screens: the ink top with a bare back chevron, the white sheet rising over it',
      'Sheets: 24-point corners, grabber, round close, a back circle for a later step',
      'The bar: one action, two equal halves, blocked, a line above, a sub-line',
      'Cards on the shorter shadow, rows with no chevrons, section labels, lifted chips (C), presets, the keypad as a grid',
      'The approved drawings, exported from the icon board into the app',
      'The board’s proportions: every size from the kit is scaled to the phone (1.22 on a 393-point iPhone), because the board draws on a 312-point miniature (24 November)',
    ],
    notes: [
      'Screens not yet in their part already wear the ink top, the new sheet, the colours and the faces; their primary button stays a filled button in the content until their part moves it to the bar.',
      'The muted-most grey stays at the app’s readable value rather than the kit’s #9AA2B1, which measures 2.5:1 on white against the 4.5 floor the checks hold.',
      'A title never scrolls away any more: on the ink it would be white on the white sheet. My stats and Players used to let it.',
    ],
  },
  {
    id: 'p1',
    title: 'Approved, nothing open',
    state: 'built',
    what: 'Every screen here is approved on the board and carries no open question.',
    routes: ['/bill', '/boosters', '/booster', '/pick', '/log', '/your-name'],
    built: ['bill', 'boosters', 'booster', 'pick', 'log-rebuy', 'log-cashout', 'your-name'],
  },
  {
    id: 'p2',
    title: 'Approved, one small question each',
    state: 'next',
    what: 'Approved on the board; each has one question to answer on the way, listed here so it can be answered before the code.',
    rows: [
      ['Home', '/', 'The plan-ran-out state uses a line marked UNSURE in the handoff.'],
      ['Tonight, Table admin, money hidden', '/session', 'Hide is a new feature: is the choice remembered across nights, and does it reach the settled night and My stats?'],
      ['Post-game results, all four views', '/settled', 'The Ended row opens End time but nothing marks it as tappable now chevrons are gone.'],
      ['Player card, three states', '/player', 'Rebuy $500 as the whole bar is a much larger target than today, with Cash out a thumb above it: wanted?'],
      ['One entry', '/entry', 'Close duplicates the sheet’s own close: keep it or drop it?'],
      ['Poker tools sheet', '/pick-tool', 'Drawings instead of line icons, matching /tools: confirm.'],
      ['Signing you in', '/auth-callback', 'The riffle is drawn as motion on the board; in the app it is new animation work.'],
      ['Your groups and the four-page walkthrough', '/groups', 'The walkthrough’s copy is draft.'],
      ['Players, A player', '/players, /member', 'A member’s read-only roster is not reviewed yet.'],
      ['Invite, its QR, Reset the code', '/invite', 'A six-character code is a server and security change (0007, 0009), not a screen change.'],
    ],
  },
  {
    id: 'p3',
    title: 'Not reviewed yet, nothing open',
    state: 'waiting',
    what: 'No flags at all, only no verdict yet. Ready to build the moment they are approved.',
    rows: [
      ['Poker tools', '/tools', ''],
      ['Money rules · group defaults', '/club-rules', ''],
      ['Money rules · tonight', '/money-rules', ''],
      ['Bill rules (two states)', '/bill-rules', ''],
      ['The piggy bank (two states)', '/piggy-bank-rules', ''],
    ],
  },
  {
    id: 'p4',
    title: 'Opening a game',
    state: 'waiting',
    what: 'Most of New session is approved, but Add players is still changing (the invitation states are new this round) and New group needs work.',
    rows: [
      ['New session, Add players, the invitation', '/new-night', '28 phones; 3 need work; the invite mechanic is the open part.'],
      ['New group', '/new-group', 'Its last step needs work (“Start the group”).'],
      ['New player, Your name in a group', '/seat, /seat-name', 'Not reviewed.'],
    ],
  },
  {
    id: 'p5',
    title: 'Ending the night',
    state: 'waiting',
    what: 'The flow is the riskiest to restyle and two of its screens need work, so it goes after the decisions it depends on.',
    rows: [
      ['Count up', '/count-up', '“Balanced” wants a more vivid style.'],
      ['Deductions', '/deductions', 'To be checked against the new look.'],
      ['Settle up, Who pays whom, Nudge', '/settle-up, /payments, /nudge', 'Not reviewed; the off-by alarm has no wash in the new look.'],
      ['Spend, Share, Rounding, End time', '/spend, /share, /rounding, /end-time', 'Share’s presets need work.'],
    ],
  },
  {
    id: 'p6',
    title: 'Running the game',
    state: 'waiting',
    what: 'Waits on two questions: a screen with nothing to record has no bar, and a hold as the whole bar.',
    rows: [
      ['Tonight watching, passed', '/session', 'No bar at all for a watcher; the hold that takes the game back.'],
      ['Pass the game, Hand over admin', '/pass-game, /hand-over', 'Not reviewed.'],
      ['Watching a night', '/watch', 'Needs work: time and figure on one line.'],
      ['From another phone', '/late-changes', 'Not reviewed.'],
    ],
  },
  {
    id: 'p7',
    title: 'Getting in, settings and rules',
    state: 'waiting',
    what: 'Mostly not reviewed; Delete account is the other hold-as-the-bar.',
    rows: [
      ['Sign in, Claim your place', '/sign-in, /claim', 'Claim’s typed code needs work.'],
      ['Settings, Rule editor, Bill & piggy bank, Table rules', '/settings, /rule, /house-rules, /table-rules', 'Not reviewed.'],
      ['Delete your account', '/delete-account', 'A hold as the bar.'],
    ],
  },
  {
    id: 'p8',
    title: 'Plans, tools and stats',
    state: 'waiting',
    what: 'Your plan is a new route with payment behind it; the calculator and the stats have open notes.',
    rows: [
      ['Your plan (eleven screens)', '/plan', 'New route; five need work; the purchase itself is the store’s.'],
      ['Calculator, run-out, rules, a ruling', '/odds, /run-out, /rules, /situation', 'Not reviewed; the calculator’s green / red / amber.'],
      ['Sessions, My stats', '/games, /stats', 'Losses in red on My stats.'],
    ],
  },
];

/** Questions that cut across parts, to settle before the parts that wait on them. */
export const ACROSS = [
  ['Losses', 'The board draws a loss in grey everywhere except My stats, where you asked for red. One rule for the app, or grey with My stats the exception? The code follows the board for now.'],
  ['Amber', 'Not set, Waiting on…, Too close and break-even are amber in the app; the look has none, so they are drawn muted.'],
  ['A hold on the bar', 'Take the game back and Delete account: only the “Hold 1.5s” line says it must be held.'],
  ['No bar', 'A watcher’s Tonight and /watch end in the read-only line with no ink at the foot.'],
  ['Rows that open something', 'Without chevrons, Currency, Covered by and Ended no longer say they can be tapped.'],
];
