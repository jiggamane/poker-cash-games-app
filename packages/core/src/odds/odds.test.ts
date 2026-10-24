import { describe, expect, it } from 'vitest';
import { cardText, parseCard, parseCards } from './cards';
import { OddsEnumeration, choose, odds, oddsProblem, type Hand } from './odds';

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
const cards = (s: string) => parseCards(s)!;

describe('cards', () => {
  it('reads and writes the two-letter form', () => {
    expect(cardText(parseCard('As')!)).toBe('As');
    expect(cardText(parseCard('2c')!)).toBe('2c');
    expect(cardText(parseCard('td')!)).toBe('Td');
    expect(cardText(parseCard('10h')!)).toBe('Th');
    expect(parseCard('1s')).toBeNull();
    expect(parseCard('Ax')).toBeNull();
    expect(parseCards('AsKs')).toEqual(cards('As Ks'));
    expect(parseCards('As,Ks')).toEqual(cards('As Ks'));
    expect(parseCards('AsK')).toBeNull();
  });
});

describe('the input', () => {
  it('needs two hands, five board cards at most, and no card twice', () => {
    expect(oddsProblem({ hands: [hand('AsKs')], board: [] })).toMatch(/Two hands/);
    expect(oddsProblem({ hands: [hand('AsKs'), hand('QdQc')], board: cards('2c 3c 4c 5c 6c 7c') })).toMatch(
      /holds 5/,
    );
    expect(oddsProblem({ hands: [hand('AsKs'), hand('AsQc')], board: [] })).toMatch(/twice/);
    expect(oddsProblem({ hands: [hand('AsKs'), hand('QdQc')], board: cards('2c'), dead: cards('2c') })).toMatch(
      /twice/,
    );
    expect(oddsProblem({ hands: [hand('AsKs'), hand('QdQc')], board: cards('2c 3c 4c') })).toBeNull();
  });

  it('counts the boards to come', () => {
    expect(choose(48, 5)).toBe(1_712_304);
    expect(choose(45, 2)).toBe(990);
    expect(choose(44, 1)).toBe(44);
    expect(choose(43, 0)).toBe(1);
    expect(choose(34, 5)).toBe(278_256);
  });
});

describe('odds', () => {
  it('on the river is one board and a certainty', () => {
    const r = odds({ hands: [hand('AsKs'), hand('QdQc')], board: cards('Ah 7d 2c 9s 3h') });
    expect(r.boards).toBe(1);
    expect(r.seats[0]).toEqual({ wins: 1, ties: 0, win: 1, tie: 0, equity: 1 });
    expect(r.seats[1]).toEqual({ wins: 0, ties: 0, win: 0, tie: 0, equity: 0 });
  });

  it('on the turn counts the outs by hand', () => {
    /*
     * Hero holds A♥K♥ against 2♣2♦ on Q♥ J♥ 3♠ 7♣. Forty-four cards are left.
     * Hero wins with any heart (9), any ten that is not a heart (3), any ace
     * (3) or any king (3): 18 outs. The 2♥ makes the villain trips and the
     * hero a flush, so it is a heart and already counted; the 2♠ makes trips
     * against a high card. No river splits the pot.
     */
    const r = odds({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c') });
    expect(r.boards).toBe(44);
    expect(r.seats[0]!.wins).toBe(18);
    expect(r.seats[1]!.wins).toBe(26);
    expect(r.seats[0]!.ties).toBe(0);
    expect(r.seats[0]!.win).toBeCloseTo(18 / 44, 10);
    expect(r.seats[0]!.equity + r.seats[1]!.equity).toBeCloseTo(1, 10);
  });

  it('takes a dead card out of the deck', () => {
    /* The same spot with the T♠ dead: one out fewer, one card fewer. */
    const r = odds({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c'), dead: cards('Ts') });
    expect(r.boards).toBe(43);
    expect(r.seats[0]!.wins).toBe(17);
    expect(r.seats[1]!.wins).toBe(26);
  });

  it('counts a tie for everyone who shares the top', () => {
    /* Broadway on the board; neither hand can improve on it. */
    const r = odds({ hands: [hand('2c3d'), hand('4h5s')], board: cards('As Kd Qh Jc Ts') });
    expect(r.seats[0]).toEqual({ wins: 0, ties: 1, win: 0, tie: 1, equity: 0.5 });
    expect(r.seats[1]).toEqual({ wins: 0, ties: 1, win: 0, tie: 1, equity: 0.5 });
  });

  it('splits a three-way tie three ways', () => {
    /* Broadway on the board again, three seats: the board plays for all of
       them, every seat ties, and each is paid a third. */
    const r = odds({
      hands: [hand('2c3d'), hand('4h5d'), hand('6c7d')],
      board: cards('As Kd Qh Jc Ts'),
    });
    expect(r.boards).toBe(1);
    expect(r.seats.map((s) => s.ties)).toEqual([1, 1, 1]);
    expect(r.seats.map((s) => s.wins)).toEqual([0, 0, 0]);
    for (const s of r.seats) expect(s.equity).toBeCloseTo(1 / 3, 10);
  });

  it('accounts for every board exactly once, nine-handed on the flop', () => {
    const hands = ['AsKs', 'AdKd', 'QcQh', 'JsTs', '9d8d', '7c6c', '5h4h', '3s2s', 'Th9h'].map(hand);
    const r = odds({ hands, board: cards('Ac Kh 2d') });
    expect(r.boards).toBe(choose(52 - 18 - 3, 2));
    const wins = r.seats.reduce((n, s) => n + s.wins, 0);
    const equity = r.seats.reduce((n, s) => n + s.equity, 0);
    /* A board is a win for exactly one seat or a tie for several; wins plus
       tied boards is the total. Every tied board has at least two tied seats. */
    const ties = r.seats.reduce((n, s) => n + s.ties, 0);
    expect(wins).toBeLessThanOrEqual(r.boards);
    expect(wins + ties / 2).toBeGreaterThanOrEqual(r.boards - 1e-9);
    expect(equity).toBeCloseTo(1, 10);
    /* The two with top two pair tie with each other on every board that does
       not beat them both — most of them. They are not the same hand: the
       spades can run out a flush the diamonds cannot, and vice versa, so a
       few boards are a win for one of them alone. */
    expect(r.seats[0]!.tie).toBeGreaterThan(0.4);
    expect(r.seats[1]!.tie).toBeGreaterThan(0.4);
    expect(r.seats[0]!.wins + r.seats[1]!.wins).toBeLessThan(r.boards / 10);
  });

  it('is stepped in slices and finishes with the same figures', () => {
    const input = { hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s') };
    const e = new OddsEnumeration(input);
    expect(e.total).toBe(choose(45, 2));
    let steps = 0;
    while (!e.step(100)) steps++;
    expect(steps).toBe(9);
    expect(e.done).toBe(990);
    expect(e.result()).toEqual(odds(input));
    expect(e.step()).toBe(true);
  });

  it('matches the figures every calculator publishes for aces against kings', () => {
    /*
     * A♠A♥ against K♠K♥ before the flop, 1,712,304 boards. The aces hold up
     * about 82% of the time; the pot is split when the board makes a straight
     * or flush that beats both, under half a percent. This is the worst case
     * the calculator ever runs and it is here as much for the clock as for the
     * figure — see the timing note in `odds.ts`.
     */
    const r = odds({ hands: [hand('AsAh'), hand('KsKh')], board: [] });
    expect(r.boards).toBe(1_712_304);
    expect(r.seats[0]!.win).toBeGreaterThan(0.815);
    expect(r.seats[0]!.win).toBeLessThan(0.825);
    expect(r.seats[0]!.tie).toBeGreaterThan(0.003);
    expect(r.seats[0]!.tie).toBeLessThan(0.006);
    expect(r.seats[0]!.ties).toBe(r.seats[1]!.ties);
    expect(r.seats[0]!.wins + r.seats[1]!.wins + r.seats[0]!.ties).toBe(r.boards);
  });
});
