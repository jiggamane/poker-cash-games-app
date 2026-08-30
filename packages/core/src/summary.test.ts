import { describe, expect, it } from 'vitest';
import { resolveLedger } from './ledger';
import { money } from './money';
import { prizePool } from './summary';
import type { LedgerEntry, PlayerId } from './types';

const PETR = 'p-petr';
const DANA = 'p-dana';
const MAREK = 'p-marek';

let seq = 0;
const reset = () => (seq = 0);

const buyin = (playerId: PlayerId, amount: number, id = `e${++seq}`): LedgerEntry => ({
  id,
  seq,
  type: 'buyin',
  playerId,
  amount: money(amount),
});
const rebuy = (playerId: PlayerId, amount: number, id = `e${++seq}`): LedgerEntry => ({
  id,
  seq,
  type: 'rebuy',
  playerId,
  amount: money(amount),
});
const cashout = (playerId: PlayerId, amount: number, id = `e${++seq}`): LedgerEntry => ({
  id,
  seq,
  type: 'cashout',
  playerId,
  amount: money(amount),
});
const expense = (payerId: PlayerId, amount: number, id = `e${++seq}`): LedgerEntry => ({
  id,
  seq,
  type: 'expense',
  payerId,
  amount: money(amount),
});
const correction = (target: string, amount: number, id = `e${++seq}`): LedgerEntry => ({
  id,
  seq,
  type: 'correction',
  amount: money(amount),
  correctsEntryId: target,
});
const voidEntry = (target: string, id = `e${++seq}`): LedgerEntry => ({
  id,
  seq,
  type: 'void',
  amount: money(0),
  correctsEntryId: target,
});

describe('prizePool()', () => {
  it('counts entries, not people — a re-entry is an entry', () => {
    reset();
    const pool = prizePool(
      resolveLedger([buyin(PETR, 500), buyin(DANA, 500), rebuy(PETR, 1000)]),
    );
    expect(pool.total).toBe(2000);
    expect(pool.entries).toBe(3);
    expect(pool.players).toBe(2);
  });

  it('leaves cash-outs and expenses out of it — this is money that went IN', () => {
    reset();
    const pool = prizePool(
      resolveLedger([buyin(PETR, 500), cashout(PETR, 900), expense(DANA, 170)]),
    );
    expect(pool.total).toBe(500);
    expect(pool.entries).toBe(1);
    // Dana paid for the pizza and never sat down. She is not in the pool.
    expect(pool.players).toBe(1);
  });

  it('drops a voided buy-in from the total, the count and the head count', () => {
    reset();
    const pool = prizePool(
      resolveLedger([buyin(PETR, 500), buyin(MAREK, 500, 'wrong'), voidEntry('wrong')]),
    );
    expect(pool.total).toBe(500);
    expect(pool.entries).toBe(1);
    // Marek was written down by mistake. A screen counting raw entries would
    // report two players at a table that only ever held one.
    expect(pool.players).toBe(1);
  });

  it('counts a corrected buy-in once, at the amount it was corrected to', () => {
    reset();
    const pool = prizePool(
      resolveLedger([buyin(PETR, 500, 'first'), correction('first', 300)]),
    );
    expect(pool.total).toBe(300);
    expect(pool.entries).toBe(1);
    expect(pool.players).toBe(1);
  });

  it('is zero on a table nobody has bought into', () => {
    reset();
    const pool = prizePool(resolveLedger([]));
    expect(pool).toEqual({ total: 0, entries: 0, players: 0 });
  });
});
