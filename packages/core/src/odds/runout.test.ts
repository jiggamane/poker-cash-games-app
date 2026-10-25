import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { odds, type Hand } from './odds';
import { RunOutEnumeration, boardOn, runOut, streetsReached, tableOn } from './runout';

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
const cards = (s: string) => parseCards(s)!;

/* The canvas's own hand (boards 15–19): A♥K♥ all in against 2♣2♦, run out Q♥ J♥ 3♠ 7♣ K♣. */
const canvas = { hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c Kc') };

describe('which streets a board has reached', () => {
  it('pre-flop always; the flop at three cards, the turn at four, the river at five', () => {
    expect(streetsReached(0)).toEqual(['preflop']);
    expect(streetsReached(1)).toEqual(['preflop']);
    expect(streetsReached(2)).toEqual(['preflop']);
    expect(streetsReached(3)).toEqual(['preflop', 'flop']);
    expect(streetsReached(4)).toEqual(['preflop', 'flop', 'turn']);
    expect(streetsReached(5)).toEqual(['preflop', 'flop', 'turn', 'river']);
  });
});

describe('the table on each street', () => {
  it('cuts the board to the street and keeps the hands and the dead cards', () => {
    const input = { ...canvas, dead: cards('Ts') };
    expect(tableOn(input, 'preflop')).toEqual({ hands: input.hands, board: [], dead: cards('Ts') });
    expect(tableOn(input, 'flop')).toEqual({ hands: input.hands, board: cards('Qh Jh 3s'), dead: cards('Ts') });
    expect(tableOn(input, 'turn')).toEqual({ hands: input.hands, board: cards('Qh Jh 3s 7c'), dead: cards('Ts') });
    expect(tableOn(input, 'river')).toEqual({ hands: input.hands, board: cards('Qh Jh 3s 7c Kc'), dead: cards('Ts') });
    expect(boardOn(input.board, 'turn')).toEqual(cards('Qh Jh 3s 7c'));
  });

  it('refuses a street the board has not reached', () => {
    expect(() => tableOn({ ...canvas, board: cards('Qh Jh 3s') }, 'turn')).toThrow(/not reached/);
  });

  it('puts the later board cards back in the deck rather than counting them dead', () => {
    /* On the flop, with the 7♣ and K♣ still to come, the count is over 990 boards — not 903 with two dead. */
    const flop = runOut(canvas).get('flop')!;
    expect(flop.boards).toBe(990);
    expect(flop).toEqual(odds({ hands: canvas.hands, board: cards('Qh Jh 3s') }));
  });
});

describe('the run-out', () => {
  it('is odds() on every street, to the digit', () => {
    const r = runOut(canvas);
    expect([...r.keys()].sort()).toEqual(['flop', 'preflop', 'river', 'turn']);
    expect(r.get('preflop')).toEqual(odds({ hands: canvas.hands, board: [] }));
    expect(r.get('turn')).toEqual(odds({ hands: canvas.hands, board: cards('Qh Jh 3s 7c') }));
    expect(r.get('river')).toEqual(odds({ hands: canvas.hands, board: canvas.board }));
    /* The story the board tells: level, then ahead, then behind, then won. */
    expect(r.get('preflop')!.seats[0]!.win).toBeCloseTo(0.5, 1);
    expect(r.get('flop')!.seats[0]!.win).toBeGreaterThan(0.6);
    expect(r.get('turn')!.seats[0]!.win).toBeCloseTo(18 / 44, 10);
    expect(r.get('river')!.seats[0]!.win).toBe(1);
  });

  it('stops at the streets the board has reached', () => {
    const r = runOut({ hands: canvas.hands, board: cards('Qh Jh 3s') });
    expect([...r.keys()].sort()).toEqual(['flop', 'preflop']);
    expect(runOut({ hands: canvas.hands, board: [] }).size).toBe(1);
  });

  it('counts the river first and the pre-flop last, so a screen has three figures while the fourth counts', () => {
    const e = new RunOutEnumeration(canvas);
    expect(e.order).toEqual(['river', 'turn', 'flop', 'preflop']);
    expect(e.total).toBe(1 + 44 + 990 + 1_712_304);
    expect(e.step(1)).toBe(false);
    let p = e.result();
    expect([...p.streets.keys()]).toEqual(['river']);
    expect(p.counting).toBe('turn');
    expect(e.step(44 + 990)).toBe(false);
    p = e.result();
    expect([...p.streets.keys()]).toEqual(['river', 'turn', 'flop']);
    expect(p.counting).toBe('preflop');
    expect(p.progress).toBe(0);
    expect(e.step(1_000_000)).toBe(false);
    p = e.result();
    expect(p.progress).toBeCloseTo(1_000_000 / 1_712_304, 6);
    expect(e.done).toBe(1 + 44 + 990 + 1_000_000);
    expect(e.step(1 << 21)).toBe(true);
    p = e.result();
    expect(p.counting).toBeNull();
    expect(p.progress).toBe(1);
    expect(e.done).toBe(e.total);
    expect(p.streets.get('preflop')).toEqual(odds({ hands: canvas.hands, board: [] }));
  });

  it('a slice of nothing still makes progress', () => {
    const e = new RunOutEnumeration({ hands: canvas.hands, board: canvas.board });
    expect(e.step(0)).toBe(false);
    expect(e.done).toBe(1);
  });

  it('refuses what odds() refuses', () => {
    expect(() => new RunOutEnumeration({ hands: [hand('AhKh')], board: [] })).toThrow(/Two hands/);
  });
});
