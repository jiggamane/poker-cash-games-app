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
 * until the owner has read it on a phone (`docs/screens.md`). The stand-up
 * and button games have no one standard rulebook, so each is written with its
 * common versions side by side under `choices` — the owner's call of 9
 * November, *leave both options for players to choose from*. *Earns no
 * button* on a chopped pot is how the owner's own group plays it.
 *
 * Copy rules, held by `boosters.test.ts`: a summary is one short line, because
 * it sits under the name on a list row; steps are short sentences in the order
 * they happen at the table; *Agree before you start* is the list of knobs the
 * table has to set, phrased so a host can read it out as a question.
 */

export type BoosterSection = 'pots' | 'side';

/**
 * The sections in the order `/boosters` lists them — side games first, the
 * owner's call of 9 November. ⚠ labels UNSURE.
 */
export const BOOSTER_SECTIONS: readonly { id: BoosterSection; label: string }[] = [
  { id: 'side', label: 'Side games' },
  { id: 'pots', label: 'Bigger pots' },
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
  /**
   * Where tables play the same game different ways and the group has to pick
   * one: a question, and two or more named answers to it. The sheet draws them
   * under *Choose your version*. Added 9 November for the stand-up and button
   * games, at the owner's request to leave every option open.
   */
  choices?: BoosterChoice[];
  /** Named versions of the same idea, each as one sentence. */
  variations?: string[];
  /** The one thing a table tends to find out the hard way. */
  worth?: string;
}

export interface BoosterChoice {
  /** What the table is deciding, as a short label. */
  label: string;
  options: { name: string; text: string }[];
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
    id: 'stand-up',
    section: 'side',
    name: 'Stand-up game',
    summary: 'Win a pot or pay up',
    what: 'Every player starts the round standing. Win a pot and you sit down. The last player still standing loses the round and pays.',
    how: [
      'Agree the amount, and start the round with every player standing.',
      'Play as normal. Win a pot — at showdown or by making everyone fold — and you sit down for the rest of the round.',
      'When only one player is left standing, the round is over and that player pays, the way the table chose below.',
    ],
    choices: [
      {
        label: 'How the last player pays',
        options: [
          {
            name: 'Pay everyone',
            text: 'The last player standing pays the amount to each of the others. The bigger the table, the bigger the bill.',
          },
          {
            name: 'Lose the stake',
            text: 'Everyone puts the amount in a pot at the start of the round. The players who sat down share it, so the last player standing loses only their own stake.',
          },
        ],
      },
      {
        label: 'Standing up',
        options: [
          {
            name: 'Really stand',
            text: 'Players stand at the table until they win a pot. It is where the name comes from, and nobody forgets who is still in.',
          },
          {
            name: 'Mark it',
            text: 'Everyone stays seated, and a player still in the round keeps a chip or a card face up in front of them until they win a pot.',
          },
        ],
      },
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
    summary: 'Win pots, collect buttons, get paid for them',
    what: 'Win a pot and take a button. When the round ends, the players with buttons are paid by the players without. Buttons are markers, so the game can run all night without anyone getting up.',
    how: [
      'Put out the buttons — spare dealer buttons, coins, or chips of a colour not in play. How many depends on how the round ends, below.',
      'Win a pot outright and take a button.',
      'Play on until the round ends, the way the table chose below, and settle up in chips across the table.',
      'Everyone hands their buttons back, and the next round starts on the next hand or once the players agree to run it again.',
    ],
    choices: [
      {
        label: 'How many buttons a player can hold',
        options: [
          {
            name: 'One',
            text: 'A player who already has a button takes nothing more for winning again.',
          },
          {
            name: 'One per pot won',
            text: 'Every pot won adds a button, so a player can hold several.',
          },
        ],
      },
      {
        label: 'When the round ends',
        options: [
          {
            name: 'Buttons run out',
            text: 'Put out one button fewer than there are players. When the last one is taken, every player without a button pays each player who has one. With one button a player, that leaves exactly one player to pay.',
          },
          {
            name: 'First to three',
            text: 'When one player reaches three buttons, every player with none pays each player who has one. Needs one per pot won, and two buttons a player plus one more, so they cannot run out first. The table can pick another number.',
          },
          {
            name: 'Three in a row',
            text: 'A player’s buttons go back as soon as somebody else wins a pot, so the only way to three is three straight wins. Whoever gets there collects the amount from every other player. Needs one per pot won. Three buttons are enough: only one player can be on a run at a time.',
          },
        ],
      },
      {
        label: 'What a button holder collects',
        options: [
          {
            name: 'Flat',
            text: 'The agreed amount.',
          },
          {
            name: 'Per button',
            text: 'The agreed amount for each button they hold — three buttons collect three times as much.',
          },
        ],
      },
      {
        label: 'A chopped pot',
        options: [
          {
            name: 'Earns no button',
            text: 'A player who already had one keeps it; a player who shared the pot without one still has none.',
          },
          {
            name: 'Earns each winner one',
            text: 'Every player who shares the pot takes a button.',
          },
        ],
      },
    ],
    agree: [
      'The amount — a few big blinds is common.',
      'Whether a player who leaves mid-round pays what they would owe before they go.',
    ],
    worth: 'Paying per button with no limit on how many a player can hold makes a long round expensive for whoever is left without one. Set the amount with that in mind.',
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
];

export function boosterById(id: string): Booster | undefined {
  return BOOSTERS.find((b) => b.id === id);
}

export function boostersIn(section: BoosterSection): Booster[] {
  return BOOSTERS.filter((b) => b.section === section);
}
