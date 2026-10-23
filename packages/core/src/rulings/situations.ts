/**
 * The library: every situation the app can answer, as data.
 *
 * `docs/rulings.md` § 4 and § 9. Ships in the bundle so it works at a kitchen
 * table with no signal, and is versioned by `RULES_EDITION` so a screen can
 * say which edition it read from.
 *
 * ⚠ EVERY ANSWER IN THIS FILE IS A DRAFT. `docs/rulings.md` § 9 is explicit
 * that the one-line answers are for the owner to verify before any is marked
 * `verified`, and nobody has verified one yet. Step 1 ships them all as
 * `draft` and SHOWS them, with a DRAFT pill where the VERIFIED pill will go —
 * a library that hides everything until it is verified cannot be reviewed on
 * a phone, which is how it gets verified. Flip `status` and fill `verified`
 * per situation as the owner signs each one off. The lint in
 * `situations.test.ts` holds the shape either way.
 *
 * Copy rules (§ 10): a title is what happened, in a player's words; an answer
 * is read aloud, so short sentences and no bullets; the cash answer is always
 * present and the tournament note only when the ruling differs. Robert's
 * Rules of Poker and the TDA rules are cited by section, never quoted — the
 * private-game edition of Robert's Rules bars commercial reuse of its text.
 */

import type { TableRuleKey } from './tableRules';

export const RULES_EDITION = '2026.1';

export type Area = 'betting' | 'showdown' | 'hands' | 'dealing' | 'money' | 'behaviour';

/** The areas in the order the Rules screen lists them. ⚠ labels UNSURE. */
export const AREAS: readonly { id: Area; label: string }[] = [
  { id: 'betting', label: 'Betting' },
  { id: 'showdown', label: 'Showdown' },
  { id: 'hands', label: 'Hands' },
  { id: 'dealing', label: 'Dealing' },
  { id: 'money', label: 'Money' },
  { id: 'behaviour', label: 'Behaviour' },
];

export interface Citation {
  work: 'roberts' | 'tda' | 'house';
  /** 'Showdown', 'r.15', or the TableRuleKey for 'house'. */
  ref: string;
}

export interface Answer {
  /** Paragraphs separated by a blank line; may carry `{{rule.key}}`. */
  body: string;
  source: Citation[];
}

export interface Situation {
  /** Stable for ever, never reused: a queued question points at it across editions. */
  id: string;
  area: Area;
  /** One of the twelve on the Rulings sheet. */
  atTheTable: boolean;
  /** Position within its area. */
  order: number;
  /** What happened, as a player says it. */
  title: string;
  /** Other ways people say it — search reads these. */
  aliases: string[];
  /** The words search matches on, beyond the title and aliases. */
  keywords: string[];
  cash: Answer;
  /** Present only when the ruling differs in a tournament. */
  tournament?: { note: string; source: Citation[] };
  /** The group parameters the answer reads. Derived from the body by the lint. */
  binds?: TableRuleKey[];
  /** Hands the numbers to the engine. */
  computes?: 'sidePots' | 'shortBank' | 'rebuyCap';
  related: string[];
  status: 'verified' | 'draft';
  verified?: { on: string; by: string };
}

const R = (ref: string): Citation => ({ work: 'roberts', ref });
const T = (ref: string): Citation => ({ work: 'tda', ref });
const H = (ref: TableRuleKey): Citation => ({ work: 'house', ref });

export const SITUATIONS: readonly Situation[] = [
  // ------------------------------------------------------------------ betting
  {
    id: 'betting.one-chip',
    area: 'betting',
    atTheTable: true,
    order: 1,
    title: 'Said "raise", put in one chip',
    aliases: ['One big chip', 'Oversized chip', 'Single chip raise'],
    keywords: ['chip', 'oversize', 'call', 'raise', 'silent', 'announce'],
    cash: {
      body:
        'Facing a bet, one big chip put in without saying "raise" is a call. The chip is worth more than the bet, but the bet is what it calls, and the change comes back.\n\nIf "raise" was said first, it is a raise, and the amount is what they then put in. Words in turn bind; the chip only follows them.\n\nFirst to act with no bet in front of them, a single chip bets its full value.',
      source: [R('Betting and raising'), T('r.45')],
    },
    related: ['betting.string-bet', 'betting.verbal-binding'],
    status: 'draft',
  },
  {
    id: 'betting.string-bet',
    area: 'betting',
    atTheTable: true,
    order: 2,
    title: 'Bet in two motions',
    aliases: ['String bet', 'Went back to the stack', 'Two trips to the stack'],
    keywords: ['string', 'motion', 'stack', 'twice', 'call', 'raise'],
    cash: {
      body:
        'A bet goes in with one motion, or the amount is said before any chip moves. Two trips to the stack without a number said first is a call of the first trip, and the second handful comes back.\n\nThe rule exists so a player cannot watch a reaction between the first chips and the second. It is not about intent; a clumsy raise and a cunning one are ruled the same way.',
      source: [R('Betting and raising'), T('r.44')],
    },
    related: ['betting.one-chip', 'betting.see-and-raise'],
    status: 'draft',
  },
  {
    id: 'betting.see-and-raise',
    area: 'betting',
    atTheTable: false,
    order: 3,
    title: '"I\'ll see your bet… and raise"',
    aliases: ['Call and raise', 'I see your bet'],
    keywords: ['see', 'call', 'raise', 'verbal', 'film'],
    cash: {
      body:
        'The first word is the action. "See" and "call" both mean call, and what comes after them is too late. It is a call.\n\nIt sounds like the films, and in the films nobody is playing for their own money.',
      source: [R('Betting and raising'), T('r.44')],
    },
    related: ['betting.string-bet', 'betting.verbal-binding'],
    status: 'draft',
  },
  {
    id: 'betting.out-of-turn',
    area: 'betting',
    atTheTable: true,
    order: 4,
    title: 'Acted before their turn',
    aliases: ['Out of turn', 'Folded early', 'Called before it was their go'],
    keywords: ['turn', 'early', 'binding', 'skip', 'order'],
    cash: {
      body:
        'A check, call or fold made out of turn stands if nobody before them changes the action. If somebody in between does bet or raise, the early action is taken back and that player acts again when it is their turn, with everything open to them.\n\nA fold out of turn is the one that usually stands: the cards are in the muck and there is nothing to take back.',
      source: [R('Betting and raising'), T('r.38')],
    },
    related: ['behaviour.talking', 'betting.verbal-binding'],
    status: 'draft',
  },
  {
    id: 'betting.verbal-binding',
    area: 'betting',
    atTheTable: false,
    order: 5,
    title: 'Said "all in", chips still in the stack',
    aliases: ['Verbal is binding', 'Said raise and changed their mind'],
    keywords: ['verbal', 'binding', 'all in', 'announce', 'declare'],
    cash: {
      body:
        'Said in turn, it binds. "All in", "raise", "call" and "fold" are the action the moment they are said, and the chips follow.\n\nSaid out of turn, it is the out-of-turn rule instead.',
      source: [R('Betting and raising'), T('r.40')],
    },
    related: ['betting.out-of-turn', 'betting.one-chip'],
    status: 'draft',
  },
  {
    id: 'betting.all-in-for-less',
    area: 'betting',
    atTheTable: false,
    order: 6,
    title: 'All-in for less than a full raise',
    aliases: ['Short all-in', 'Under-raise', 'Does it reopen the betting'],
    keywords: ['all in', 'less', 'reopen', 'raise', 'short'],
    cash: {
      body:
        'An all-in that is less than a full raise does not reopen the betting for anyone who has already acted. They may call the extra; they may not raise again.\n\nA player who has not yet acted this round has every option, as always.',
      source: [R('Betting and raising'), T('r.47')],
    },
    related: ['betting.min-raise', 'showdown.side-pots'],
    status: 'draft',
  },
  {
    id: 'betting.min-raise',
    area: 'betting',
    atTheTable: false,
    order: 7,
    title: 'How much is a minimum raise?',
    aliases: ['Min raise', 'Smallest raise allowed'],
    keywords: ['minimum', 'raise', 'size', 'double'],
    cash: {
      body:
        'At least the size of the last bet or raise in this round. Facing a bet of 20, a raise is to 40 or more; facing a raise from 20 to 60, the next raise is to 100 or more.\n\nThe big blind counts as the first bet before the flop.',
      source: [R('Betting and raising'), T('r.43')],
    },
    related: ['betting.all-in-for-less'],
    status: 'draft',
  },
  {
    id: 'betting.check-raise',
    area: 'betting',
    atTheTable: false,
    order: 8,
    title: 'Can you check and then raise?',
    aliases: ['Check-raise', 'Sandbagging'],
    keywords: ['check', 'raise', 'sandbag', 'allowed'],
    cash: {
      body: 'Yes, unless the group has turned it off. {{rule.checkRaise}}',
      source: [R('Betting and raising'), H('checkRaise')],
    },
    related: [],
    status: 'draft',
  },
  {
    id: 'betting.straddle',
    area: 'betting',
    atTheTable: false,
    order: 9,
    title: 'Who can straddle?',
    aliases: ['Straddle', 'Live straddle', 'Button straddle'],
    keywords: ['straddle', 'blind', 'utg', 'button', 'double'],
    cash: {
      body:
        'A straddle is a blind raise posted before the cards, and the player who posted it acts last before the flop. Where it sits depends on the group. {{rule.straddle}}',
      source: [R('Blinds'), H('straddle')],
    },
    tournament: {
      note: 'Tournaments have no straddles.',
      source: [T('r.41')],
    },
    related: ['betting.min-raise'],
    status: 'draft',
  },
  {
    id: 'betting.wrong-pot-count',
    area: 'betting',
    atTheTable: false,
    order: 10,
    title: 'Someone called the pot wrong',
    aliases: ['Miscounted the pot', 'Dealer said the wrong amount'],
    keywords: ['pot', 'count', 'wrong', 'amount', 'miscount'],
    cash: {
      body:
        'The pot is what is in it. Whoever counted it, nobody is bound by a wrong count, and a bet made on a wrong count still stands as the bet it was.\n\nIf it matters, count it before acting, not after.',
      source: [R('Betting and raising')],
    },
    related: [],
    status: 'draft',
  },

  // ----------------------------------------------------------------- showdown
  {
    id: 'showdown.mucked-winner',
    area: 'showdown',
    atTheTable: true,
    order: 1,
    title: 'Winning hand hit the muck',
    aliases: ['Mucked the winner', 'Threw away the best hand', 'Is my hand dead'],
    keywords: ['muck', 'dead', 'live', 'face up', 'face down', 'retrieve', 'cards speak'],
    cash: {
      body:
        'If the cards are face up on the table, they play. Cards speak: the dealer reads them, and a hand the player misread still wins.\n\nIf they went face down into the muck and can be pulled out with no doubt which they were, they are live. If there is any doubt, the hand is dead and the pot goes to the best hand still showing.',
      source: [R('Showdown'), T('r.15'), T('r.17')],
    },
    related: ['showdown.dealer-mucked', 'showdown.who-shows-first', 'showdown.misread'],
    status: 'draft',
  },
  {
    id: 'showdown.dealer-mucked',
    area: 'showdown',
    atTheTable: false,
    order: 2,
    title: 'Dealer mucked a hand by mistake',
    aliases: ['Dealer killed my hand', 'Dealer took my cards'],
    keywords: ['dealer', 'muck', 'mistake', 'killed', 'retrieve', 'protect'],
    cash: {
      body:
        'If the cards can be found and there is no doubt which they were, the hand is restored and play goes on.\n\nIf they cannot, the hand is dead. What happens to the money that player already put in is a house rule to agree before the night; the usual one is that it stays in the pot.\n\nA hand nobody protected is a hand the dealer can reach. A chip on the cards is the cheapest insurance at the table.',
      source: [R('Irregularities'), T('r.16')],
    },
    related: ['showdown.mucked-winner'],
    status: 'draft',
  },
  {
    id: 'showdown.who-shows-first',
    area: 'showdown',
    atTheTable: true,
    order: 3,
    title: 'Who shows first?',
    aliases: ['Show order', 'You show first', 'Last aggressor shows'],
    keywords: ['show', 'first', 'order', 'aggressor', 'river', 'table'],
    cash: {
      body:
        'The last person who bet or raised on the river shows first. If nobody bet on the river, the first player left of the button shows first, and it goes round from there.\n\nAnyone may table their hand at any time to speed it up. Waiting for the other player to show so you can muck unseen is allowed, and it is the thing people argue about most.',
      source: [R('Showdown'), T('r.17')],
    },
    related: ['showdown.show-both', 'behaviour.slow-roll'],
    status: 'draft',
  },
  {
    id: 'showdown.misread',
    area: 'showdown',
    atTheTable: false,
    order: 4,
    title: 'Misread their hand',
    aliases: ['Said two pair, had a flush', 'Called the wrong hand'],
    keywords: ['misread', 'cards speak', 'declare', 'wrong hand'],
    cash: {
      body:
        'The cards decide, not the words. A hand tabled face up is read by the dealer and wins or loses on what it is, whatever the player called it.\n\nThe best five of the seven count, whether or not the player saw them.',
      source: [R('Showdown'), T('r.15')],
    },
    related: ['showdown.mucked-winner', 'hands.best-five'],
    status: 'draft',
  },
  {
    id: 'showdown.show-both',
    area: 'showdown',
    atTheTable: false,
    order: 5,
    title: 'Showed one card and mucked the other',
    aliases: ['Must I show both', 'Showed the kicker only'],
    keywords: ['show', 'both', 'one card', 'kicker', 'dead'],
    cash: {
      body:
        'A hand is two cards. To win the pot both are tabled face up; showing one and releasing the other is not showing a hand, and the hand is dead.\n\nThe dealer may ask to see both before pushing the pot, and should.',
      source: [R('Showdown'), T('r.15')],
    },
    related: ['showdown.who-shows-first'],
    status: 'draft',
  },
  {
    id: 'showdown.see-mucked-hand',
    area: 'showdown',
    atTheTable: false,
    order: 6,
    title: 'Can I see the hand they mucked?',
    aliases: ['Show me your hand', 'Asking to see a called hand'],
    keywords: ['see', 'mucked', 'called', 'ask', 'show'],
    cash: {
      body:
        'In a cash game a player who called the last bet may ask to see the hand that was called. Asking for any other reason is bad form, and a group may turn the right off altogether.\n\nA hand asked for and shown is live if it wins: asking is not free.',
      source: [R('Showdown')],
    },
    tournament: {
      note: 'Only on a suspicion of collusion, and only through the floor.',
      source: [T('r.18')],
    },
    related: ['showdown.show-one-show-all'],
    status: 'draft',
  },
  {
    id: 'showdown.show-one-show-all',
    area: 'showdown',
    atTheTable: false,
    order: 7,
    title: 'Showed a card to one player',
    aliases: ['Show one show all', 'Flashed a card to a neighbour'],
    keywords: ['show one', 'show all', 'neighbour', 'flash', 'during'],
    cash: {
      body:
        'Show one, show all. A card shown to one player during or after the hand may be asked for by anyone at the table once the hand is over.\n\nShowing a card to a player still in the hand is a different matter: it is talking about the hand with cards.',
      source: [R('Showdown'), T('r.19')],
    },
    related: ['behaviour.talking', 'showdown.see-mucked-hand'],
    status: 'draft',
  },
  {
    id: 'showdown.tie',
    area: 'showdown',
    atTheTable: false,
    order: 8,
    title: 'Tied hands',
    aliases: ['Split pot', 'Same hand', 'Odd chip'],
    keywords: ['tie', 'split', 'odd chip', 'equal', 'chop'],
    cash: {
      body:
        'The pot splits. An odd chip that will not divide goes to the first player left of the button.\n\nTwo flushes, two straights or two full houses are compared card by card first; a tie is only a tie when all five cards match.',
      source: [R('Showdown'), T('r.13')],
    },
    related: ['hands.flush-vs-flush', 'showdown.board-plays'],
    status: 'draft',
  },
  {
    id: 'showdown.side-pots',
    area: 'showdown',
    atTheTable: true,
    order: 9,
    title: 'Three people all in — the pots',
    aliases: ['Side pot', 'Who wins which pot', 'Multiple all-ins'],
    keywords: ['side pot', 'main pot', 'all in', 'eligible', 'split'],
    cash: {
      body:
        'Each pot holds only what everybody in it could match. The smallest stack makes the main pot, matched by everyone; what the next stack put in beyond that makes a side pot the smallest stack cannot win; and so on up.\n\nWork it out from what each player put in, smallest stack first.',
      source: [R('Betting and raising'), T('r.47')],
    },
    computes: 'sidePots',
    related: ['betting.all-in-for-less'],
    status: 'draft',
  },
  {
    id: 'showdown.board-plays',
    area: 'showdown',
    atTheTable: false,
    order: 10,
    title: 'The board is the best hand',
    aliases: ['Playing the board', 'Board plays'],
    keywords: ['board', 'plays', 'split', 'community'],
    cash: {
      body:
        'When the five community cards are the best hand, everyone still in splits. A hole card counts only if it makes a better five than the board does, and a kicker in the hand does not improve a board that is already five cards.',
      source: [R('Showdown')],
    },
    related: ['showdown.tie', 'hands.best-five'],
    status: 'draft',
  },
  {
    id: 'showdown.show-after-fold',
    area: 'showdown',
    atTheTable: false,
    order: 11,
    title: 'Everyone folded — must they show?',
    aliases: ['Show the bluff', 'Won without showdown'],
    keywords: ['fold', 'show', 'bluff', 'uncalled'],
    cash: {
      body:
        'No. A hand that wins without being called is never shown unless its owner wants to show it, and nobody can make them.\n\nTurning the next card to see what would have come is rabbit hunting. {{rule.rabbitHunt}}',
      source: [R('Showdown'), H('rabbitHunt')],
    },
    related: ['behaviour.rabbit-hunt'],
    status: 'draft',
  },

  // -------------------------------------------------------------------- hands
  {
    id: 'hands.ranking',
    area: 'hands',
    atTheTable: false,
    order: 1,
    title: 'Which hand wins?',
    aliases: ['Hand rankings', 'Order of hands'],
    keywords: ['ranking', 'order', 'royal', 'straight flush', 'quads', 'full house', 'flush', 'straight', 'trips', 'two pair', 'pair', 'high card'],
    cash: {
      body:
        'From the top: royal flush, straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, one pair, high card.\n\nA flush beats a straight because it is rarer. That is the whole reason for the order.',
      source: [R('Hand rankings')],
    },
    related: ['hands.flush-vs-straight', 'hands.best-five'],
    status: 'draft',
  },
  {
    id: 'hands.kicker',
    area: 'hands',
    atTheTable: false,
    order: 2,
    title: 'Both have a pair: the kicker',
    aliases: ['Kicker', 'Same pair who wins'],
    keywords: ['kicker', 'pair', 'high card', 'tie break'],
    cash: {
      body:
        'The higher pair wins. With the same pair, the highest card outside the pair decides, then the next, until five cards have been compared. Only five cards count, so a sixth card never breaks a tie.',
      source: [R('Hand rankings')],
    },
    related: ['hands.two-pair', 'hands.best-five'],
    status: 'draft',
  },
  {
    id: 'hands.two-pair',
    area: 'hands',
    atTheTable: false,
    order: 3,
    title: 'Two pair against two pair',
    aliases: ['Higher two pair', 'Aces up'],
    keywords: ['two pair', 'higher pair', 'kicker'],
    cash: {
      body: 'The higher of the two pairs decides first. If those match, the lower pair. If both match, the fifth card.',
      source: [R('Hand rankings')],
    },
    related: ['hands.kicker'],
    status: 'draft',
  },
  {
    id: 'hands.flush-vs-flush',
    area: 'hands',
    atTheTable: false,
    order: 4,
    title: 'Flush against flush',
    aliases: ['Higher flush', 'Do suits rank'],
    keywords: ['flush', 'suit', 'higher', 'tie'],
    cash: {
      body:
        'The highest card in each flush is compared, then the next, down through all five. Suits never rank: a spade flush and a heart flush of the same five values split the pot.',
      source: [R('Hand rankings')],
    },
    related: ['showdown.tie'],
    status: 'draft',
  },
  {
    id: 'hands.wheel',
    area: 'hands',
    atTheTable: false,
    order: 5,
    title: 'Is A-2-3-4-5 a straight?',
    aliases: ['The wheel', 'Ace low straight', 'K-A-2-3-4'],
    keywords: ['wheel', 'ace', 'low', 'straight', 'around the corner'],
    cash: {
      body:
        'Yes, and it is the lowest straight. The ace plays low in it. K-A-2-3-4 is not a straight: the ace sits at the bottom or the top, never in the middle.',
      source: [R('Hand rankings')],
    },
    related: ['hands.ranking'],
    status: 'draft',
  },
  {
    id: 'hands.full-house',
    area: 'hands',
    atTheTable: false,
    order: 6,
    title: 'Full house against full house',
    aliases: ['Higher full house', 'Boat over boat'],
    keywords: ['full house', 'boat', 'trips', 'pair'],
    cash: {
      body: 'The three of a kind decides first; the pair only if the threes match.',
      source: [R('Hand rankings')],
    },
    related: ['hands.ranking'],
    status: 'draft',
  },
  {
    id: 'hands.flush-vs-straight',
    area: 'hands',
    atTheTable: false,
    order: 7,
    title: 'Does a flush beat a straight?',
    aliases: ['Flush or straight'],
    keywords: ['flush', 'straight', 'beats'],
    cash: {
      body: 'Yes. A flush beats a straight, and a full house beats a flush.',
      source: [R('Hand rankings')],
    },
    related: ['hands.ranking'],
    status: 'draft',
  },
  {
    id: 'hands.best-five',
    area: 'hands',
    atTheTable: false,
    order: 8,
    title: 'Six cards to a straight',
    aliases: ['Best five cards', 'Do all seven count'],
    keywords: ['five', 'seven', 'best', 'count', 'six'],
    cash: {
      body:
        'A hand is five cards. The best five of the seven available count, and the other two do nothing: six cards to a straight is a five-card straight with a card left over.',
      source: [R('Hand rankings')],
    },
    related: ['hands.kicker', 'showdown.board-plays'],
    status: 'draft',
  },

  // ------------------------------------------------------------------ dealing
  {
    id: 'dealing.exposed-card',
    area: 'dealing',
    atTheTable: true,
    order: 1,
    title: 'Card flashed while dealing',
    aliases: ['Exposed card', 'Card turned over on the deal', 'Flashed a hole card'],
    keywords: ['exposed', 'flash', 'deal', 'burn', 'misdeal', 'hole card'],
    cash: {
      body:
        'One hole card seen by the table during the deal becomes the burn card, and the player gets the next card off the deck once everyone else has theirs. Play goes on.\n\nIf the first card off the deck is exposed, or two cards are, it is a misdeal: the cards come back and the hand is dealt again.',
      source: [R('Irregularities'), T('r.34')],
    },
    related: ['dealing.boxed-card', 'dealing.misdeal'],
    status: 'draft',
  },
  {
    id: 'dealing.extra-card',
    area: 'dealing',
    atTheTable: true,
    order: 2,
    title: 'Someone has three cards',
    aliases: ['Extra card', 'Dealt one too many', 'Too many cards'],
    keywords: ['three cards', 'extra', 'too many', 'misdeal', 'dead'],
    cash: {
      body:
        'Found before anyone has acted, it is a misdeal and the hand is dealt again.\n\nFound after action has started, that hand is dead and the rest play on. Bets already made stay in the pot.',
      source: [R('Irregularities'), T('r.35')],
    },
    related: ['dealing.misdeal', 'dealing.exposed-card'],
    status: 'draft',
  },
  {
    id: 'dealing.boxed-card',
    area: 'dealing',
    atTheTable: false,
    order: 3,
    title: 'Card found face up in the deck',
    aliases: ['Boxed card', 'Upside-down card in the deck'],
    keywords: ['boxed', 'face up', 'deck', 'skip'],
    cash: {
      body:
        'A card found face up in the deck is treated as if it were not there. It is set aside and the next card takes its place. Two boxed cards in one deal is a misdeal.',
      source: [R('Irregularities'), T('r.34')],
    },
    related: ['dealing.exposed-card'],
    status: 'draft',
  },
  {
    id: 'dealing.premature-flop',
    area: 'dealing',
    atTheTable: false,
    order: 4,
    title: 'Flop dealt before betting was done',
    aliases: ['Premature flop', 'Early flop'],
    keywords: ['flop', 'early', 'premature', 'reshuffle', 'betting'],
    cash: {
      body:
        'The betting finishes first. Then the flop that was dealt goes back into the deck, the deck is reshuffled without the burn card, and a new flop is dealt.',
      source: [R('Irregularities'), T('r.37')],
    },
    related: ['dealing.premature-turn'],
    status: 'draft',
  },
  {
    id: 'dealing.premature-turn',
    area: 'dealing',
    atTheTable: false,
    order: 5,
    title: 'Turn dealt early',
    aliases: ['Premature turn', 'Early river'],
    keywords: ['turn', 'river', 'early', 'premature'],
    cash: {
      body:
        'The early card is set aside. When betting finishes, the card that would have been the river is dealt as the turn. The set-aside card is shuffled back into the remaining deck, and the river is dealt from it after the next round of betting.',
      source: [R('Irregularities'), T('r.37')],
    },
    related: ['dealing.premature-flop'],
    status: 'draft',
  },
  {
    id: 'dealing.wrong-seat',
    area: 'dealing',
    atTheTable: false,
    order: 6,
    title: 'Button in the wrong place',
    aliases: ['Dealt from the wrong seat', 'Wrong button'],
    keywords: ['button', 'wrong', 'seat', 'misdeal', 'order'],
    cash: {
      body:
        'Found before anyone acts: put the button right and deal again.\n\nFound after action has started: the hand stands as dealt, and the button is corrected for the next hand. {{rule.button}}',
      source: [R('Irregularities'), H('button')],
    },
    related: ['dealing.misdeal'],
    status: 'draft',
  },
  {
    id: 'dealing.empty-seat',
    area: 'dealing',
    atTheTable: false,
    order: 7,
    title: 'Dealt to an empty seat',
    aliases: ['Cards to nobody', 'Dealt to the absent player'],
    keywords: ['empty', 'seat', 'absent', 'away', 'blind'],
    cash: {
      body:
        'A hand dealt to a seat with nobody in it is dead and goes to the muck. A blind already posted for that seat stays in the pot. Everyone else plays on, and the dealer deals to the seats with players next hand.',
      source: [R('Irregularities')],
    },
    tournament: {
      note: 'An absent player is dealt in, their blinds and antes are taken, and the hand is dead.',
      source: [T('r.30')],
    },
    related: ['dealing.misdeal'],
    status: 'draft',
  },
  {
    id: 'dealing.forgot-burn',
    area: 'dealing',
    atTheTable: false,
    order: 8,
    title: 'Forgot to burn',
    aliases: ['No burn card', 'Burned twice'],
    keywords: ['burn', 'forgot', 'twice', 'before'],
    cash: {
      body:
        'Caught before the card is seen: burn now and carry on. Caught after: the card stands, and the next street is burned as normal. A missed burn does not kill a hand or call for a redeal.',
      source: [R('Irregularities'), T('r.37')],
    },
    related: ['dealing.premature-turn'],
    status: 'draft',
  },
  {
    id: 'dealing.out-of-cards',
    area: 'dealing',
    atTheTable: false,
    order: 9,
    title: 'Ran out of cards',
    aliases: ['Deck ran out', 'Not enough cards'],
    keywords: ['ran out', 'deck', 'short', 'reshuffle', 'burn'],
    cash: {
      body:
        'Reshuffle the burn cards and the folded hands that went into the muck face down, and deal the rest from them. A hand that was tabled face up is never shuffled back in.',
      source: [R('Irregularities')],
    },
    related: [],
    status: 'draft',
  },
  {
    id: 'dealing.misdeal',
    area: 'dealing',
    atTheTable: false,
    order: 10,
    title: 'What is a misdeal?',
    aliases: ['Misdeal', 'Deal it again'],
    keywords: ['misdeal', 'redeal', 'again'],
    cash: {
      body:
        'A deal that cannot be put right: the first card exposed, two or more cards exposed, a hand with too many or too few cards before anyone has acted, two boxed cards, the button in the wrong place before action. The cards come back and the hand is dealt again.\n\nOnce action has started, there is no misdeal: the hand plays and the fault is handled by the rule for that fault.',
      source: [R('Irregularities'), T('r.35')],
    },
    related: ['dealing.exposed-card', 'dealing.extra-card', 'dealing.wrong-seat'],
    status: 'draft',
  },

  // -------------------------------------------------------------------- money
  {
    id: 'money.rebuy',
    area: 'money',
    atTheTable: true,
    order: 1,
    title: 'Wants to buy back in',
    aliases: ['Rebuy', 'Top up', 'Add on', 'Buying more chips'],
    keywords: ['rebuy', 'top up', 'add on', 'cap', 'between hands', 'stack'],
    cash: {
      body:
        'A rebuy is any amount between the minimum buy-in and the group\'s cap, bought between hands and never during one. The chips go on the table before the next deal, where everyone can see them.\n\n{{rule.rebuyCap}}',
      source: [R('Table stakes'), H('rebuyCap')],
    },
    computes: 'rebuyCap',
    related: ['money.short-buy', 'money.going-south'],
    status: 'draft',
  },
  {
    id: 'money.short-buy',
    area: 'money',
    atTheTable: false,
    order: 2,
    title: 'Buying in short',
    aliases: ['Short buy', 'Less than the minimum'],
    keywords: ['short', 'buy', 'minimum', 'less'],
    cash: {
      body:
        'A buy-in below the minimum is a short buy. {{rule.shortBuy}}\n\nAfter a short buy, the next buy is a full one.',
      source: [R('Table stakes'), H('shortBuy')],
    },
    related: ['money.rebuy'],
    status: 'draft',
  },
  {
    id: 'money.leaving',
    area: 'money',
    atTheTable: true,
    order: 3,
    title: 'Leaving with a big stack',
    aliases: ['Hit and run', 'Cashing out early', 'Taking the money and going'],
    keywords: ['leave', 'leaving', 'early', 'hit and run', 'notice', 'cash out'],
    cash: {
      body:
        'Nobody has to stay. A player may cash out when they like, and winning is not a reason to be held at the table.\n\n{{rule.leaveNotice}} {{rule.returnWithin}}',
      source: [R('Table stakes'), H('leaveNotice'), H('returnWithin')],
    },
    related: ['money.going-south'],
    status: 'draft',
  },
  {
    id: 'money.going-south',
    area: 'money',
    atTheTable: false,
    order: 4,
    title: 'Took chips off the table',
    aliases: ['Going south', 'Ratholing', 'Pocketed chips'],
    keywords: ['going south', 'rathole', 'pocket', 'off the table', 'chips'],
    cash: {
      body:
        'Taking chips off the table while still playing is going south. Table stakes means what is on the table stays on the table until you leave. {{rule.goingSouth}}\n\nIf it happened, the chips go back on the table.',
      source: [R('Table stakes'), H('goingSouth')],
    },
    related: ['money.leaving', 'money.rebuy'],
    status: 'draft',
  },
  {
    id: 'money.short-bank',
    area: 'money',
    atTheTable: true,
    order: 5,
    title: 'Bank is short',
    aliases: ['Chips don\'t add up', 'Money missing at the end', 'Count is off'],
    keywords: ['bank', 'short', 'missing', 'count', 'cash out', 'does not add up'],
    cash: {
      body:
        'The count is the count. First check the usual causes: a rebuy that was never written down, a payment that never arrived, change given wrong at a cash-out, a float that got mixed into play.\n\nIf it is still short, somebody carries it. {{rule.shortBank}}',
      source: [H('shortBank')],
    },
    computes: 'shortBank',
    related: ['money.bank-over', 'money.rebuy-by-app'],
    status: 'draft',
  },
  {
    id: 'money.bank-over',
    area: 'money',
    atTheTable: false,
    order: 6,
    title: 'Bank is over',
    aliases: ['Too much money at the end', 'Extra cash in the bank'],
    keywords: ['bank', 'over', 'extra', 'surplus', 'count'],
    cash: {
      body:
        'Money that nobody can account for is usually a rebuy that was paid and not recorded, or a cash-out paid short. Ask. If nobody claims it, the host holds it for a week, and after that it is the group\'s.',
      source: [H('shortBank')],
    },
    related: ['money.short-bank'],
    status: 'draft',
  },
  {
    id: 'money.rebuy-by-app',
    area: 'money',
    atTheTable: false,
    order: 7,
    title: 'Rebuy paid by app, not seen',
    aliases: ['Venmo rebuy', 'Said they paid', 'Transfer not arrived'],
    keywords: ['venmo', 'app', 'transfer', 'paid', 'rebuy', 'pending'],
    cash: {
      body:
        'No chips until the payment shows. A rebuy said aloud is a rebuy recorded; a rebuy paid by phone is a rebuy when the bank sees it, not when the player says it was sent.\n\n{{rule.credit}}',
      source: [H('credit')],
    },
    related: ['money.credit', 'money.short-bank'],
    status: 'draft',
  },
  {
    id: 'money.credit',
    area: 'money',
    atTheTable: false,
    order: 8,
    title: 'Wants to play on credit',
    aliases: ['IOU', 'Pay next week', 'Playing on a marker'],
    keywords: ['credit', 'iou', 'marker', 'owe', 'later', 'deadline'],
    cash: {
      body:
        '{{rule.credit}}\n\nWhere credit is allowed, the ledger says who owes whom, and the deadline is the rule, not a kindness.',
      source: [R('Table stakes'), H('credit')],
    },
    related: ['money.rebuy-by-app', 'money.left-unpaid'],
    status: 'draft',
  },
  {
    id: 'money.run-it-twice',
    area: 'money',
    atTheTable: false,
    order: 9,
    title: 'Running it twice',
    aliases: ['Run it twice', 'Run it three times', 'Deal it twice'],
    keywords: ['run it twice', 'twice', 'all in', 'agree', 'equity'],
    cash: {
      body:
        'Only when everyone in the pot is all in, and only when everyone in the pot agrees. The pot is split by runs, and each run is dealt from the same deck without reshuffling.\n\n{{rule.runItTwice}}',
      source: [R('Betting and raising'), H('runItTwice')],
    },
    tournament: {
      note: 'Never in a tournament.',
      source: [T('r.1')],
    },
    related: ['money.chop'],
    status: 'draft',
  },
  {
    id: 'money.chop',
    area: 'money',
    atTheTable: false,
    order: 10,
    title: 'Chopping the blinds',
    aliases: ['Chop', 'Take the blinds back'],
    keywords: ['chop', 'blinds', 'back', 'agree', 'heads up'],
    cash: {
      body:
        'When everyone folds to the blinds, the two of them may agree to take their blinds back and move on, if the group allows it. Both must agree before the flop; once a flop is dealt, the hand plays. {{rule.chops}}',
      source: [R('Blinds'), H('chops')],
    },
    tournament: {
      note: 'Never in a tournament.',
      source: [T('r.1')],
    },
    related: ['money.run-it-twice'],
    status: 'draft',
  },
  {
    id: 'money.rounding',
    area: 'money',
    atTheTable: false,
    order: 11,
    title: 'Change at cash-out',
    aliases: ['Odd dollars', 'Rounding', 'No small change'],
    keywords: ['change', 'rounding', 'odd', 'coins', 'cash out'],
    cash: {
      body:
        'Tonight\'s rounding rule, set when the night opened, says what happens to the odd amounts: whole dollars, fives, or whatever the group chose. It is on the count-up screen, and it was agreed before anyone was up or down.',
      source: [H('shortBank')],
    },
    related: ['money.short-bank'],
    status: 'draft',
  },
  {
    id: 'money.fees',
    area: 'money',
    atTheTable: false,
    order: 12,
    title: 'Host fee, time charge, rake',
    aliases: ['Rake', 'Time charge', 'Host takes a cut'],
    keywords: ['rake', 'fee', 'time', 'host', 'cut', 'legal'],
    cash: {
      body:
        'Whatever the group has set in Money rules comes off at settle-up, and the ledger shows it on every player\'s line.\n\nA fee can be the thing that makes a private game unlawful where you are. A game where the host keeps nothing is a different thing in law from one where they do.',
      source: [R('Private games')],
    },
    related: [],
    status: 'draft',
  },
  {
    id: 'money.left-unpaid',
    area: 'money',
    atTheTable: false,
    order: 13,
    title: 'Left without paying',
    aliases: ['Owes money', 'Did not settle', 'Walked out'],
    keywords: ['unpaid', 'owes', 'settle', 'left', 'debt'],
    cash: {
      body:
        'Not a rules question. Settle before you leave is the rule, the ledger says who owes whom, and the group decides who plays next week.',
      source: [H('credit')],
    },
    related: ['money.credit'],
    status: 'draft',
  },

  // ---------------------------------------------------------------- behaviour
  {
    id: 'behaviour.slow-roll',
    area: 'behaviour',
    atTheTable: true,
    order: 1,
    title: 'Was that a slow roll?',
    aliases: ['Slow roll', 'Took forever to show the nuts'],
    keywords: ['slow roll', 'tank', 'nuts', 'show', 'etiquette'],
    cash: {
      body:
        'A slow roll is taking your time to table the winner when you already know it is the winner, so the other player thinks for a moment that they have won.\n\nThere is no rule against it in a cash game and no penalty. It is etiquette, and the table\'s own standard decides how it is taken.',
      source: [R('Showdown')],
    },
    tournament: {
      note: 'A floor may give a penalty for it.',
      source: [T('r.70')],
    },
    related: ['showdown.who-shows-first'],
    status: 'draft',
  },
  {
    id: 'behaviour.talking',
    area: 'behaviour',
    atTheTable: false,
    order: 2,
    title: 'Talking about the hand with others in it',
    aliases: ['Table talk', 'Discussing the hand', 'Coaching'],
    keywords: ['talk', 'discuss', 'coach', 'hand', 'multiway', 'advice'],
    cash: {
      body:
        'Not while the hand is on, and not about a hand you are no longer in while others still are. Some groups fold the talker\'s hand; most settle for a word.',
      source: [R('Irregularities'), T('r.70')],
    },
    tournament: {
      note: 'A penalty, and the hand may be ruled dead.',
      source: [T('r.70')],
    },
    related: ['betting.out-of-turn', 'showdown.show-one-show-all'],
    status: 'draft',
  },
  {
    id: 'behaviour.rabbit-hunt',
    area: 'behaviour',
    atTheTable: false,
    order: 3,
    title: 'Rabbit hunting',
    aliases: ['What would have come', 'Turn the next card'],
    keywords: ['rabbit', 'hunt', 'next card', 'would have'],
    cash: {
      body:
        'Turning the next cards after the hand is over, to see what would have come. {{rule.rabbitHunt}}',
      source: [R('Irregularities'), H('rabbitHunt')],
    },
    tournament: {
      note: 'Never in a tournament.',
      source: [T('r.1')],
    },
    related: ['showdown.show-after-fold'],
    status: 'draft',
  },
  {
    id: 'behaviour.angle',
    area: 'behaviour',
    atTheTable: false,
    order: 4,
    title: 'Angle shooting',
    aliases: ['Angle', 'Shot an angle', 'Technically legal'],
    keywords: ['angle', 'shoot', 'mislead', 'technically', 'fake'],
    cash: {
      body:
        'Doing a legal thing to mislead: a fake fold motion, a half-pushed stack, "I\'ll call" to see a reaction. No rule covers it, which is why house rules name it. The table\'s own standard does the rest.',
      source: [R('Irregularities')],
    },
    related: ['betting.string-bet', 'behaviour.slow-roll'],
    status: 'draft',
  },
  {
    id: 'behaviour.phones',
    area: 'behaviour',
    atTheTable: false,
    order: 5,
    title: 'Phone at the table',
    aliases: ['On the phone during a hand', 'Photos of cards'],
    keywords: ['phone', 'photo', 'camera', 'texting', 'in a hand'],
    cash: {
      body:
        'Etiquette, not a rule. No cards on camera, and no phone in your hand while there is a bet in front of you. Between hands, the table\'s own standard.',
      source: [R('Irregularities')],
    },
    related: [],
    status: 'draft',
  },
  {
    id: 'behaviour.exposing',
    area: 'behaviour',
    atTheTable: false,
    order: 6,
    title: 'Showed their cards on purpose during the hand',
    aliases: ['Exposed on purpose', 'Showed a bluff mid-hand'],
    keywords: ['expose', 'show', 'purpose', 'heads up', 'multiway', 'dead'],
    cash: {
      body:
        'Heads up, a player may show their cards during the hand unless the group forbids it. With more than two in the hand, a hand shown on purpose is dead.',
      source: [R('Irregularities'), T('r.65')],
    },
    tournament: {
      note: 'A penalty in either case.',
      source: [T('r.65')],
    },
    related: ['showdown.show-one-show-all'],
    status: 'draft',
  },
];

export function situationById(id: string): Situation | undefined {
  return SITUATIONS.find((s) => s.id === id);
}

/** The twelve on the Rulings sheet, in area order then their own order. */
export function atTheTable(): Situation[] {
  return SITUATIONS.filter((s) => s.atTheTable).sort(byAreaThenOrder);
}

export function inArea(area: Area): Situation[] {
  return SITUATIONS.filter((s) => s.area === area).sort(byAreaThenOrder);
}

const AREA_INDEX = new Map(AREAS.map((a, i) => [a.id, i]));

export function byAreaThenOrder(a: Situation, b: Situation): number {
  return (AREA_INDEX.get(a.area) ?? 0) - (AREA_INDEX.get(b.area) ?? 0) || a.order - b.order;
}

/** The sentence a citation reads as. ⚠ UNSURE. */
export function citationLabel(c: Citation): string {
  switch (c.work) {
    case 'roberts':
      return `Robert's Rules of Poker, ${c.ref}`;
    case 'tda':
      return `TDA 2026 ${c.ref}`;
    case 'house':
      return 'Your group\'s rules';
  }
}
