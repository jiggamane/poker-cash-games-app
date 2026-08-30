/**
 * The E2 balance check — `design/handoff-E2/docs/E2-balance-check-logic.md`.
 *
 * The night worked here is the one that handoff's board is drawn from: six
 * players, eleven entries, $5,000 in, Dana gone at 23:15 with $2,120. Its
 * figures are the ones on the artboard — $3,570 accounted for mid-count,
 * $1,430 left, "4 of 6 in" — so a change that moves the block away from what
 * was drawn fails here rather than on somebody's phone.
 */

import { describe, expect, it } from 'vitest';
import { balanceCheck, composition } from './balance';
import { resolveLedger, reconcile } from './ledger';
import { formatMoney, money, type Money } from './money';
import type { LedgerEntry, PlayerId } from './types';

const DANA = 'dana';
const MAREK = 'marek';
const LENA = 'lena';
const TOMAS = 'tomas';
const IVO = 'ivo';
const PETR = 'petr';

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

/** $5,000 in over eleven entries; Dana has left with $2,120. */
const entries: LedgerEntry[] = [
  e({ type: 'buyin', playerId: LENA, amount: money(1000) }),
  e({ type: 'buyin', playerId: PETR, amount: money(500) }),
  e({ type: 'buyin', playerId: MAREK, amount: money(500) }),
  e({ type: 'buyin', playerId: IVO, amount: money(500) }),
  e({ type: 'buyin', playerId: DANA, amount: money(500) }),
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'rebuy', playerId: IVO, amount: money(500) }),
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'buyin', playerId: TOMAS, amount: money(500) }),
  e({ type: 'cashout', playerId: DANA, amount: money(2120) }),
];

const ledger = resolveLedger(entries);
/** Everyone but Dana still has chips in front of them. */
const SEATED: PlayerId[] = [LENA, PETR, MAREK, IVO, TOMAS];

const counts = (pairs: Array<[PlayerId, number]>): Map<PlayerId, Money> =>
  new Map(pairs.map(([id, amount]) => [id, money(amount)]));

describe('the equation', () => {
  it('states all four terms, and they close', () => {
    const b = balanceCheck(ledger, counts([[MAREK, 960], [IVO, 220], [PETR, 270]]), SEATED);

    expect(b.boughtIn).toBe(5000);
    expect(b.cashedOut).toBe(2120);
    expect(b.counted).toBe(1450);
    expect(b.accountedFor).toBe(3570);
    expect(b.left).toBe(1430);
    expect(b.cashedOut + b.counted + b.left).toBe(b.boughtIn);
  });

  it('counts entries and players, not one for the other', () => {
    const b = balanceCheck(ledger, new Map(), SEATED);

    // Nine buy-ins and re-entries over six people — the left sub-line.
    expect(b.entries).toBe(9);
    expect(b.playersTotal).toBe(6);
  });

  it('is the same number the settlement gate is computed from', () => {
    const finalCounts = counts([[MAREK, 960], [IVO, 220], [PETR, 270]]);
    const b = balanceCheck(ledger, finalCounts, SEATED);

    // left === −difference, exactly. Two derivations, one night.
    expect(b.left).toBe(-reconcile(ledger, finalCounts).difference);
  });
});

describe('the three states', () => {
  const all = counts([[LENA, 1180], [PETR, 270], [MAREK, 960], [IVO, 220], [TOMAS, 250]]);

  it('counts while any stack is missing', () => {
    const b = balanceCheck(ledger, counts([[MAREK, 960]]), SEATED);

    expect(b.state).toBe('counting');
    expect(b.uncounted).toEqual([LENA, PETR, IVO, TOMAS]);
    expect(b.playersIn).toBe(2); // Dana, gone, and Marek, counted
  });

  it('balances when every stack is in and the sums meet', () => {
    const b = balanceCheck(ledger, all, SEATED);

    expect(b.state).toBe('balanced');
    expect(b.left).toBe(0);
    expect(b.playersIn).toBe(6);
    expect(b.uncounted).toEqual([]);
  });

  it('is short when the table is light', () => {
    const b = balanceCheck(ledger, counts([...all, [TOMAS, 170]] as Array<[PlayerId, number]>), SEATED);

    expect(b.state).toBe('short');
    expect(b.left).toBe(80);
  });

  it('is over when the table has more than went into it', () => {
    const b = balanceCheck(ledger, counts([...all, [TOMAS, 330]] as Array<[PlayerId, number]>), SEATED);

    expect(b.state).toBe('over');
    expect(b.left).toBe(-80);
  });

  /*
   * THE ONE THE OLD BLOCK GOT WRONG. Mid-count the sums can meet by accident —
   * here everyone but Tomáš is counted and the total happens to equal what went
   * in. It is not balanced: a stack nobody has looked at is still on the table.
   */
  it('does not call a night balanced while a stack is uncounted', () => {
    const b = balanceCheck(
      ledger,
      counts([[LENA, 1180], [PETR, 270], [MAREK, 960], [IVO, 470]]),
      SEATED,
    );

    expect(b.left).toBe(0);
    expect(b.state).toBe('counting');
  });

  it('takes a count of $0 as counted, because a busted stack is a stack', () => {
    const zeroed = counts([[LENA, 1430], [PETR, 270], [MAREK, 960], [IVO, 220], [TOMAS, 0]]);
    const b = balanceCheck(ledger, zeroed, SEATED);

    expect(b.uncounted).toEqual([]);
    expect(b.playersIn).toBe(6);
    expect(b.state).toBe('balanced');
  });
});

describe('who is counted at all', () => {
  it('ignores a count left behind on somebody who has cashed out', () => {
    // Dana is gone with $2,120. A stale count on her row must not be added to
    // it — the block would read $500 over on a night that balances.
    const b = balanceCheck(ledger, counts([[DANA, 500], [MAREK, 960]]), SEATED);

    expect(b.counted).toBe(960);
    expect(b.accountedFor).toBe(3080);
  });

  it('does not wait for a stack from somebody who never bought in', () => {
    // A collector holds the kitty and never sits down.
    const b = balanceCheck(
      ledger,
      counts([[LENA, 1180], [PETR, 270], [MAREK, 960], [IVO, 220], [TOMAS, 250]]),
      [...SEATED, 'the-kitty'],
    );

    expect(b.uncounted).toEqual([]);
    expect(b.playersTotal).toBe(6);
    expect(b.state).toBe('balanced');
  });

  it('keeps a player who left and came back on the count', () => {
    // Petr cashes out for $270 and buys back in for $500. He is seated, so his
    // stack is still owed — and the $270 he took off is accounted for already.
    const back = resolveLedger([
      ...entries,
      e({ type: 'cashout', playerId: PETR, amount: money(270) }),
      e({ type: 'buyin', playerId: PETR, amount: money(500) }),
    ]);
    const b = balanceCheck(back, counts([[MAREK, 960]]), SEATED);

    expect(b.boughtIn).toBe(5500);
    expect(b.cashedOut).toBe(2390);
    expect(b.uncounted).toContain(PETR);
  });
});

describe('the composition sub-line', () => {
  const line = (cashedOut: number, counted: number) =>
    composition({ cashedOut: money(cashedOut), counted: money(counted) }, (m) => formatMoney(m));

  it('names both halves when there are two', () => {
    expect(line(2120, 1450)).toBe('$2,120 cashed out · $1,450 counted');
  });

  it('never shows a $0 term', () => {
    expect(line(0, 1450)).toBe('$1,450 counted');
    expect(line(2120, 0)).toBe('$2,120 cashed out');
    expect(line(0, 0)).toBe('');
  });
});
