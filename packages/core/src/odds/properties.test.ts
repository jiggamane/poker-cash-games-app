import { describe, expect, it } from 'vitest';
import { DECK, cardText, parseCard, parseCards, type Card } from './cards';
import { evaluate } from './evaluate';
import { choose, odds, type Hand, type Odds } from './odds';
import { bestOfSeven, compareRanked, dealRandom, rng } from './reference';

/**
 * What must be true of ANY spot, whatever the right answer is.
 *
 * Nothing here knows an equity. Each test takes a spot, changes it in a way
 * poker says cannot matter — the names of the suits, the order of the seats,
 * the order the board was dealt in — and asks that the answer not move by a
 * single board. A bug that is right about one table and wrong about another
 * has to be wrong in a way that is not symmetric, and these are the symmetries.
 */

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
const cards = (s: string) => parseCards(s)!;

type Spot = { hands: Hand[]; board: Card[]; dead: Card[] };

/** A random table: two to nine seats, a flop, turn or river, up to three dead. */
function randomSpot(next: () => number): Spot {
  const players = 2 + Math.floor(next() * 8);
  const board = [3, 4, 5][Math.floor(next() * 3)]!;
  const dead = Math.floor(next() * 4);
  const dealt = dealRandom(next, players * 2 + board + dead);
  const hands: Hand[] = [];
  for (let p = 0; p < players; p++) hands.push([dealt[2 * p]!, dealt[2 * p + 1]!]);
  return {
    hands,
    board: dealt.slice(players * 2, players * 2 + board),
    dead: dealt.slice(players * 2 + board),
  };
}

const counts = (r: Odds) => ({
  boards: r.boards,
  wins: r.seats.map((s) => s.wins),
  ties: r.seats.map((s) => s.ties),
});

describe('cards', () => {
  it('every one of the 52 reads back as itself', () => {
    expect(new Set(DECK).size).toBe(52);
    for (const c of DECK) {
      expect(parseCard(cardText(c))).toBe(c);
      expect(parseCards(cardText(c).toLowerCase())).toEqual([c]);
      expect(parseCards(cardText(c).toUpperCase().replace(/(.)(.)/, '$1$2'))).toEqual([c]);
    }
    expect(parseCards(DECK.map(cardText).join(''))).toEqual([...DECK]);
    expect(new Set(DECK.map(cardText)).size).toBe(52);
  });

  it('refuses what is not a card, and does not guess', () => {
    for (const bad of ['A', 'Asx', '1s', '11s', 'Ax', 'sA', '🂡', 'Ass', '0s', 'As K', 'AsKsQ'])
      expect(parseCards(bad)).toBeNull();
    /* Nothing, or only space, is no cards — not a failure, not a card. */
    expect(parseCards('')).toEqual([]);
    expect(parseCards('   ')).toEqual([]);
  });
});

describe('counting boards', () => {
  it('obeys Pascal and symmetry, and gives the figures every book prints', () => {
    for (let n = 1; n <= 52; n++)
      for (let k = 0; k <= Math.min(n, 7); k++) {
        if (k >= 1) expect(choose(n, k)).toBe(choose(n - 1, k - 1) + choose(n - 1, k));
        expect(choose(n, k)).toBe(choose(n, n - k));
      }
    expect(choose(52, 5)).toBe(2_598_960);
    expect(choose(52, 7)).toBe(133_784_560);
    expect(choose(48, 5)).toBe(1_712_304);
    expect(choose(5, 6)).toBe(0);
  });
});

describe('the answer does not depend on what the suits are called', () => {
  it('under any renaming of the four suits, across 60 random tables', () => {
    const next = rng(31337);
    for (let n = 0; n < 60; n++) {
      const spot = randomSpot(next);
      const perm = dealRandom(next, 4, [0, 1, 2, 3]);
      const rename = (c: Card): Card => (c >> 2) * 4 + perm[c & 3]!;
      const renamed = odds({
        hands: spot.hands.map(([a, b]) => [rename(a), rename(b)] as unknown as Hand),
        board: spot.board.map(rename),
        dead: spot.dead.map(rename),
      });
      expect(counts(renamed)).toEqual(counts(odds(spot)));
    }
  });
});

describe('the answer does not depend on the order things were entered in', () => {
  it('seats can be reordered: each seat keeps its own result', () => {
    const next = rng(2718);
    for (let n = 0; n < 40; n++) {
      const spot = randomSpot(next);
      const order = dealRandom(next, spot.hands.length, spot.hands.map((_, i) => i));
      const shuffled = odds({ ...spot, hands: order.map((i) => spot.hands[i]!) });
      const base = odds(spot);
      order.forEach((from, to) => {
        expect(shuffled.seats[to]!.wins).toBe(base.seats[from]!.wins);
        expect(shuffled.seats[to]!.ties).toBe(base.seats[from]!.ties);
        expect(shuffled.seats[to]!.equity).toBe(base.seats[from]!.equity);
      });
    }
  });

  it('the board can be entered in any order, and the two cards of a hand either way round', () => {
    const next = rng(1618);
    for (let n = 0; n < 40; n++) {
      const spot = randomSpot(next);
      const flipped = odds({
        hands: spot.hands.map(([a, b]) => [b, a] as unknown as Hand),
        board: dealRandom(next, spot.board.length, spot.board),
        dead: dealRandom(next, spot.dead.length, spot.dead),
      });
      expect(counts(flipped)).toEqual(counts(odds(spot)));
    }
  });
});

describe('what every answer must add up to', () => {
  it('accounts for every board, and pays out exactly one pot per board', () => {
    const next = rng(99991);
    for (let n = 0; n < 60; n++) {
      const spot = randomSpot(next);
      const r = odds(spot);
      const used = spot.hands.length * 2 + spot.board.length + spot.dead.length;
      expect(r.boards).toBe(choose(52 - used, 5 - spot.board.length));
      expect(Math.abs(r.seats.reduce((t, s) => t + s.equity, 0) - 1)).toBeLessThan(1e-14);
      for (const s of r.seats) {
        expect(s.win + s.tie).toBeLessThanOrEqual(1 + 1e-12);
        expect(s.wins + s.ties).toBeLessThanOrEqual(r.boards);
        /* A share of a pot is between nothing and all of it, and at least the
           wins: ties can only add to a seat's equity, never take away. */
        expect(s.equity).toBeGreaterThanOrEqual(s.win - 1e-12);
        expect(s.equity).toBeLessThanOrEqual(s.win + s.tie + 1e-12);
      }
      /* No board is won by one seat and also tied by none of them: counting
         wins alone and ties by seat, every board is one or the other. A board
         that is a tie shows up in at least two seats' tie counts. */
      const wins = r.seats.reduce((t, s) => t + s.wins, 0);
      const tiedSeatBoards = r.seats.reduce((t, s) => t + s.ties, 0);
      expect(wins + tiedSeatBoards / 2).toBeGreaterThanOrEqual(r.boards - 1e-9);
      expect(wins).toBeLessThanOrEqual(r.boards);
    }
  });

  it('heads-up: one hand’s wins and ties and the other’s wins are every board, and ties agree', () => {
    const next = rng(4242);
    for (let n = 0; n < 60; n++) {
      const dealt = dealRandom(next, 4 + 4);
      const r = odds({
        hands: [[dealt[0]!, dealt[1]!], [dealt[2]!, dealt[3]!]],
        board: dealt.slice(4, 4 + [3, 4, 5][n % 3]!),
      });
      const [a, b] = r.seats as [Odds['seats'][0], Odds['seats'][0]];
      expect(a.wins + b.wins + a.ties).toBe(r.boards);
      expect(a.ties).toBe(b.ties);
      expect(a.equity + b.equity).toBeCloseTo(1, 14);
    }
  });

  it('on the river it is the plain ranking, for two to nine seats, 300 times', () => {
    const next = rng(777);
    for (let n = 0; n < 300; n++) {
      const players = 2 + (n % 8);
      const dealt = dealRandom(next, players * 2 + 5);
      const hands: Hand[] = [];
      for (let p = 0; p < players; p++) hands.push([dealt[2 * p]!, dealt[2 * p + 1]!]);
      const board = dealt.slice(players * 2);
      const r = odds({ hands, board });
      const values = hands.map((h) => evaluate([...board, ...h]));
      const best = Math.max(...values);
      const top = values.map((v) => v === best);
      const k = top.filter(Boolean).length;
      expect(r.boards).toBe(1);
      r.seats.forEach((s, i) => {
        expect(s.wins).toBe(top[i] && k === 1 ? 1 : 0);
        expect(s.ties).toBe(top[i] && k > 1 ? 1 : 0);
      });
      /* And the engine's winner is the slow ranker's winner. */
      const ranked = hands.map((h) => bestOfSeven([...board, ...h]));
      const rbest = ranked.reduce((m, x) => (compareRanked(x, m) > 0 ? x : m));
      expect(ranked.map((x) => compareRanked(x, rbest) === 0)).toEqual(top);
    }
  });
});

describe('mirror images are equal', () => {
  it('swapping spades and hearts maps one hand onto the other, so the two are level', () => {
    /* A♠K♠ and A♥K♥ on a board with no spade and no heart in it: the swap of
       the two suits changes nothing about the table except which hand is
       which, so whatever one of them gets, the other gets too. */
    for (const board of ['2c 7d Tc', '2c 7d Tc 9d', '2c 7d Tc 9d Jc']) {
      const r = odds({ hands: [hand('AsKs'), hand('AhKh')], board: cards(board) });
      expect(r.seats[0]!.wins).toBe(r.seats[1]!.wins);
      expect(r.seats[0]!.ties).toBe(r.seats[1]!.ties);
      expect(r.seats[0]!.equity).toBe(r.seats[1]!.equity);
    }
    /* Three mirror images at once: clubs, diamonds and hearts of the same two ranks. */
    const three = odds({ hands: [hand('QcJc'), hand('QdJd'), hand('QhJh')], board: cards('2s 7s 4s') });
    expect(three.seats[0]!.wins).toBe(three.seats[1]!.wins);
    expect(three.seats[1]!.wins).toBe(three.seats[2]!.wins);
    expect(three.seats[0]!.ties).toBe(three.seats[2]!.ties);
  });
});

describe('the ranking of the rarest hands', () => {
  const v = (s: string) => evaluate(cards(s));

  it('puts every straight flush in order, the steel wheel lowest and the royal highest', () => {
    const wheel = v('As 2s 3s 4s 5s 9d Kc');
    const six = v('2s 3s 4s 5s 6s 9d Kc');
    const king = v('9s Ts Js Qs Ks 2d 3c');
    const royal = v('Ts Js Qs Ks As 2d 3c');
    expect(wheel >> 20).toBe(8);
    expect(six).toBeGreaterThan(wheel);
    expect(king).toBeGreaterThan(six);
    expect(royal).toBeGreaterThan(king);
    /* A seven-card royal with a pair beside it is still only the royal. */
    expect(v('Ts Js Qs Ks As Ad Ac')).toBe(royal);
  });

  it('plays a straight flush over a higher straight and over four of a kind', () => {
    expect(v('5s 6s 7s 8s 9s Td Jc')).toBeGreaterThan(v('Ad Ac Ah As Ks 2d 3c'));
    /* Nine-high straight flush hiding under a ten-high straight in the same seven. */
    const hidden = v('5s 6s 7s 8s 9s Td 4d');
    expect(hidden >> 20).toBe(8);
    expect((hidden >> 16) & 15).toBe(7); // nine-high: rank index 7
  });

  it('plays four of a kind by quad rank then kicker, and a full house by trips then pair', () => {
    expect(v('2s 2d 2h 2c As Kd Qc')).toBeLessThan(v('3s 3d 3h 3c 2s 4d 5c'));
    expect(v('9s 9d 9h 9c As 2d 3c')).toBeGreaterThan(v('9s 9d 9h 9c Ks Qd Jc'));
    expect(v('3s 3d 3h 2c 2s 4d 5c')).toBeGreaterThan(v('2s 2d 2h Ac As Kd Qc'));
    expect(v('3s 3d 3h Ac As Kd Qc')).toBeGreaterThan(v('3s 3d 3h Kc Ks Ad Qc'));
  });

  it('plays the wheel under every other straight and the ace-high straight over all', () => {
    const wheel = v('As 2d 3h 4c 5s 9d Jc');
    for (const higher of ['2s 3d 4h 5c 6s 9d Jc', '9s Td Jh Qc Ks 2d 3c', 'Ts Jd Qh Kc As 2d 3c'])
      expect(v(higher)).toBeGreaterThan(wheel);
    /* Q K A 2 3 is not a straight; the ace does not wrap round. */
    expect(v('Qs Kd Ah 2c 3s 8d 9c') >> 20).toBe(0);
  });

  it('gives the same value to five cards as to the seven they sit in', () => {
    expect(v('Ts Js Qs Ks As')).toBe(v('Ts Js Qs Ks As 2d 3c'));
    expect(v('As Ad Kh Kc 9s')).toBe(v('As Ad Kh Kc 9s 2d 3c'));
  });
});
