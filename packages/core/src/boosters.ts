/**
 * Game boosters — house rules a table can add to put more action into a cash
 * game: bomb pots, straddles, and the side games paid across the table.
 *
 * Reference only, like the rules library: the app never runs one, never counts
 * one and never records one. Every booster is played in chips at the table, so
 * whatever it moves is already in the stacks when the night is counted up.
 *
 * Ships in the bundle as data, so it reads at a kitchen table with no signal.
 * `/boosters` lists them by section; `/booster` reads one back.
 *
 * ⚠ COPY NOT DRAWN by any handoff. Written on 9 November 2026 at the owner's
 * request ("list those games and then describe them, so that the players can
 * apply them if they find them suitable"), and every string here is UNSURE
 * until the owner has read it on a phone (`docs/screens.md`). The Button game
 * in particular has more than one house meaning; it is written here as the
 * stand-up game's marker version.
 *
 * Copy rules, held by `boosters.test.ts`: a summary is one short line, because
 * it sits under the name on a list row; steps are short sentences in the order
 * they happen at the table; *Agree before you start* is the list of knobs the
 * table has to set, phrased so a host can read it out as a question.
 */

export type BoosterSection = 'pots' | 'side';

/** The sections in the order `/boosters` lists them. ⚠ labels UNSURE. */
export const BOOSTER_SECTIONS: readonly { id: BoosterSection; label: string }[] = [
  { id: 'pots', label: 'Bigger pots' },
  { id: 'side', label: 'Side games' },
];

export interface Booster {
  /** Stable for ever: a route param points at it. */
  id: string;
  section: BoosterSection;
  name: string;
  /** One line under the name on the list. */
  summary: string;
  /** What it is, in a sentence or two — the sheet's first paragraph. */
  what: string;
  /** How a hand or a round of it goes, in order. */
  how: string[];
  /** What the table has to settle before the first one. */
  agree: string[];
  /** Named versions of the same idea, each as one sentence. */
  variations?: string[];
  /** The one thing a table tends to find out the hard way. */
  worth?: string;
}

/** Said once at the foot of every booster: why none of this touches the ledger. */
export const BOOSTER_MONEY_NOTE =
  'Played in chips at the table. Whatever it moves is in the stacks when the night is counted up, so nothing needs recording.';

export const BOOSTERS: readonly Booster[] = [
  {
    id: 'bomb-pot',
    section: 'pots',
    name: 'Bomb pot',
    summary: 'Everyone antes, straight to the flop',
    what: 'Every player puts the same amount in before the deal, and the hand starts on the flop. No betting and no folding before it — a big pot with everyone in it.',
    how: [
      'Everyone dealt in puts the agreed ante in the middle. No blinds are posted.',
      'Deal the hole cards as usual. Nobody acts before the flop: there is nothing to call, raise or fold.',
      'Deal the flop. Betting starts with the first player to the left of the button and the hand plays out as normal from there.',
    ],
    agree: [
      'How much each player antes — one to five big blinds is the usual range.',
      'How often: once an orbit when the button reaches a set seat, at set times, or whenever a player calls one.',
      'Whether a player may sit one out, or everyone dealt in must ante.',
      'Whether the button moves after a bomb pot. Most tables move it as usual.',
    ],
    worth: 'Everyone sees a flop with a pot already built, so expect more players to stay in than in a normal hand, and bigger bets on the flop.',
  },
  {
    id: 'double-board',
    section: 'pots',
    name: 'Double-board bomb pot',
    summary: 'A bomb pot with two boards and two halves',
    what: 'A bomb pot dealt with two boards. Each board wins half the pot, so one hand can take both halves, one half, or nothing.',
    how: [
      'Everyone antes, and nobody acts before the flop, as in a bomb pot.',
      'Deal two flops, one above the other. The turn and the river come on both boards, one card each.',
      'There is one round of betting per street, for both boards together.',
      'At showdown each board is played on its own: the best hand on the top board wins half the pot, the best hand on the bottom board wins the other half.',
    ],
    agree: [
      'The ante and how often, as for a bomb pot.',
      "Hold'em or Omaha. Omaha, with four hole cards each, makes far more hands that are live on both boards.",
      'Where the odd chip goes when the pot does not halve evenly. Usually to the top board.',
    ],
    worth: 'Omaha on two boards fits nine players and no more: 36 hole cards, ten board cards and three burns use 49 of the 52 cards.',
  },
  {
    id: 'straddle',
    section: 'pots',
    name: 'Straddle',
    summary: 'A third blind that doubles the stakes',
    what: 'A blind bet of twice the big blind, posted before the deal. It doubles the stakes for that hand, and the straddler acts last before the flop.',
    how: [
      'Before the deal, the player to the left of the big blind puts in twice the big blind.',
      'Action starts with the player to the left of the straddle. To play, a player has to call the straddle or raise.',
      'The straddler acts last before the flop and can raise even if everyone has only called. After the flop the hand is played as normal.',
    ],
    agree: [
      'Whether straddles are allowed, from which seats, and whether one is ever compulsory.',
      'How many re-straddles are allowed on top. Most tables allow one, or none.',
      'Who acts first around a straddle from any seat other than under the gun. House rules differ, so settle it before the first one.',
    ],
    variations: [
      'Button straddle: the button posts it. Action starts to the left of the big blind and the button acts last before the flop.',
      'Mississippi straddle: a straddle from any seat, and the straddler acts last before the flop.',
      'Double straddle: the next player straddles the straddle, at four times the big blind.',
    ],
  },
  {
    id: 'table-ante',
    section: 'pots',
    name: 'Table ante',
    summary: 'One player antes for the whole table',
    what: 'Every hand starts with an ante in the pot for the whole table, posted by one player instead of collected from everyone. Every pot is bigger, and nobody has to chase nine antes.',
    how: [
      'The agreed player posts one ante for the table, as well as any blind they owe.',
      'The ante goes in the pot but is not a bet: it does not count towards calling or raising.',
      'The duty moves round with the button, so everyone pays it once an orbit.',
    ],
    agree: [
      'How much — usually the size of the big blind.',
      'Who posts it: the big blind (a big blind ante) or the button (a button ante).',
    ],
  },
  {
    id: 'kill-pot',
    section: 'pots',
    name: 'Kill pot',
    summary: 'Win two in a row, the next hand plays bigger',
    what: 'A player who wins two pots in a row posts a kill blind on the next hand, and that hand is played at higher stakes.',
    how: [
      'When a player wins two pots in a row, they post the kill on the next hand: twice the big blind for a full kill, one and a half times for a half kill.',
      "The kill is that hand's big blind. In a limit game the betting limits go up with it; in no-limit it plays like a straddle, and the killer acts last before the flop.",
      'After that hand the stakes go back to normal, and the count of pots in a row starts again.',
    ],
    agree: [
      'A full kill or a half kill.',
      'Whether a pot has to reach a set size to count towards the two in a row.',
      'Whether a chopped pot counts as a win.',
    ],
  },
  {
    id: 'stand-up',
    section: 'side',
    name: 'Stand-up game',
    summary: 'Win a pot or pay everyone',
    what: 'Everyone starts the round standing. Win a pot and you sit down. The last player still standing pays every other player an agreed amount.',
    how: [
      'Agree the amount, then everyone in the round stands up.',
      'Play as normal. Win a pot — at showdown or by making everyone fold — and you sit down for the rest of the round.',
      'When only one player is left standing, they pay the amount to each of the others and the round is over.',
    ],
    agree: [
      'The amount — a few big blinds, or a round sum per player.',
      'Whether a chopped pot sits both players down.',
      'Whether a player who joins midway is in the round or waits for the next.',
      'Whether the next round starts straight away or only when somebody calls one.',
    ],
    worth: 'The players still standing play more hands than they would, and late in a round the last two or three play almost every one. That is the point.',
  },
  {
    id: 'button-game',
    section: 'side',
    name: 'Button game',
    summary: 'Win a pot, take a button — the last without one pays',
    what: 'The stand-up game played with markers, so it can run all night without anyone getting up. Win a pot and you take a button; the last player without one pays everyone who has one.',
    how: [
      'Put out one button for each player in the game — spare dealer buttons, coins, or chips of a colour not in play.',
      'Win a pot and take a button, if you do not already have one.',
      'When every player but one has a button, that player pays the agreed amount to each of the others.',
      'Everyone hands their button back and the next round starts on the next hand.',
    ],
    agree: [
      'The amount each button collects.',
      'Whether a chopped pot gives both players a button.',
      'Whether a player who leaves mid-round with no button pays before they go.',
    ],
    worth: 'Some tables play it the other way up: the amount goes in a pot at the start of each round, and the last player to win a pot takes it. Agree which before the first round.',
  },
  {
    id: 'seven-deuce',
    section: 'side',
    name: '7-2 game',
    summary: 'Win with seven-deuce, collect from everyone',
    what: "Seven-deuce offsuit is the worst hand in hold'em. Win a pot with it and show it, and every other player dealt into the hand pays you a bounty.",
    how: [
      'Agree the bounty before the deal.',
      'A player who wins a pot holding 7-2 — at showdown or by making everyone fold — shows both cards.',
      'Every other player dealt into that hand pays them the bounty.',
    ],
    agree: [
      'The bounty — the big blind, or a few big blinds.',
      'Whether suited 7-2 counts. Most tables say offsuit only.',
      'Who pays: everyone dealt in, or only the players who put money in the pot.',
    ],
    worth: 'It turns the worst hand into a bluffing hand, and everyone at the table knows it.',
  },
  {
    id: 'high-hand',
    section: 'side',
    name: 'High-hand bonus',
    summary: 'The best hand of the night takes a pool',
    what: 'Everyone puts a small amount in a pool at the start. At the end of the night, the player who showed the best hand takes it.',
    how: [
      'Collect the agreed stake from every player before the first hand, and keep the pool apart from the pots.',
      'To qualify, a hand has to be shown at showdown and play both hole cards.',
      'A better qualifying hand replaces the one before. At the end of the night the holder of the best hand takes the pool.',
    ],
    agree: [
      'The stake per player, and whether a late arrival pays in.',
      'The lowest hand that qualifies — aces full or better is common.',
      'What happens if nothing qualifies: hand the stakes back, or carry the pool to the next game.',
    ],
    worth: 'Pay the pool out before the count. Chips set aside for it are still chips the table bought, and without them the count comes up short.',
  },
];

export function boosterById(id: string): Booster | undefined {
  return BOOSTERS.find((b) => b.id === id);
}

export function boostersIn(section: BoosterSection): Booster[] {
  return BOOSTERS.filter((b) => b.section === section);
}
