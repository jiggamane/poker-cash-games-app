/**
 * The app's parts and their user journeys: the one map both boards are built from. The full design
 * board shows each part's phones in journey order; the working board opens each part with its
 * journey (steps, the phones that draw each, states still to draw) and what is open on it.
 *
 *   files    screens/*.mjs whose phones belong to this part (any phone not named in a step lands at the end)
 *   journeys [{ name, steps: [{ label, ids }] }]   in the order a person meets them
 *   missing  [{ step, state, shows, why, priority }] states no phone draws yet (P1 must, P2 should, P3 nice)
 *   decisions                                       what the owner has to decide on this part
 */
export const PARTS = [
  { key: 'in', title: 'Getting in', files: ['20-getting-in.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'home', title: 'Home and Tonight', files: ['10-home-tonight.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'open', title: 'Opening a game', files: ['30-opening-a-game.mjs', '05-this-round.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'during', title: 'During the game', files: ['40-during-the-game.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'run', title: 'Running and watching', files: ['45-running-the-game.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'bill', title: 'The bill', files: ['50-the-bill.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'count', title: 'Ending: count and deductions', files: ['60-counting-up.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'settle', title: 'Ending: who pays whom', files: ['65-settling.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'group', title: 'Sessions, stats and the group', files: ['70-sessions-stats-group.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'settings', title: 'Settings and money rules', files: ['80-settings-and-rules.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'plan', title: 'Your plan', files: ['85-your-plan.mjs'], journeys: [], missing: [], decisions: [] },
  { key: 'tools', title: 'Poker tools', files: ['90-poker-tools.mjs'], journeys: [], missing: [], decisions: [] },
];
