import { describe, expect, it } from 'vitest';
import { endedWith, LedgerError, reconcile, resolveLedger } from './ledger';
import { money } from './money';
import type { LedgerEntry, PlayerId } from './types';

const PETR = 'p-petr';
const DANA = 'p-dana';

let seq = 0;
const reset = () => (seq = 0);

function buyin(playerId: PlayerId, amount: number, id = `e${++seq}`): LedgerEntry {
  return { id, seq, type: 'buyin', playerId, amount: money(amount) };
}
function rebuy(playerId: PlayerId, amount: number, id = `e${++seq}`): LedgerEntry {
  return { id, seq, type: 'rebuy', playerId, amount: money(amount) };
}
function cashout(playerId: PlayerId, amount: number, id = `e${++seq}`): LedgerEntry {
  return { id, seq, type: 'cashout', playerId, amount: money(amount) };
}
function expense(payerId: PlayerId, amount: number, id = `e${++seq}`): LedgerEntry {
  return { id, seq, type: 'expense', payerId, amount: money(amount) };
}
function correction(target: string, amount: number, id = `e${++seq}`): LedgerEntry {
  return { id, seq, type: 'correction', amount: money(amount), correctsEntryId: target };
}
function voidEntry(target: string, id = `e${++seq}`): LedgerEntry {
  return { id, seq, type: 'void', amount: money(0), correctsEntryId: target };
}

const counts = (entries: Array<[PlayerId, number]>) =>
  new Map(entries.map(([id, n]) => [id, money(n)] as const));

describe('resolveLedger()', () => {
  it('totals buy-ins, rebuys, cash-outs and expenses per person', () => {
    reset();
    const l = resolveLedger([
      buyin(PETR, 500),
      buyin(DANA, 500),
      rebuy(PETR, 1000),
      cashout(DANA, 200),
      expense(PETR, 170),
    ]);

    expect(l.boughtInByPlayer.get(PETR)).toBe(1500);
    expect(l.boughtInByPlayer.get(DANA)).toBe(500);
    expect(l.cashedOutByPlayer.get(DANA)).toBe(200);
    expect(l.expensesByPayer.get(PETR)).toBe(170);
    expect(l.totalBoughtIn).toBe(2000);
    expect(l.totalCashedOut).toBe(200);
    expect(l.totalExpenses).toBe(170);
  });

  it('reads entries in seq order, not array order', () => {
    reset();
    const a = buyin(PETR, 500, 'a');
    const b = correction('a', 300, 'b');
    // shuffled on the way in; the result must not care
    const l = resolveLedger([b, a]);
    expect(l.boughtInByPlayer.get(PETR)).toBe(300);
  });

  describe('corrections', () => {
    it('restates an amount without removing the original entry', () => {
      reset();
      const original = buyin(PETR, 500, 'original');
      const l = resolveLedger([original, correction('original', 300)]);

      expect(l.boughtInByPlayer.get(PETR)).toBe(300);
      // the entry is still there, flagged, with its original amount preserved
      expect(l.entries).toHaveLength(1);
      expect(l.entries[0].corrected).toBe(true);
      expect(l.entries[0].amount).toBe(300);
      expect(l.entries[0].originalAmount).toBe(500);
    });

    it('lets the last correction win', () => {
      reset();
      const l = resolveLedger([
        buyin(PETR, 500, 'original'),
        correction('original', 300),
        correction('original', 700),
      ]);
      expect(l.boughtInByPlayer.get(PETR)).toBe(700);
    });

    it('follows a chain when a correction is itself corrected', () => {
      reset();
      const l = resolveLedger([
        buyin(PETR, 500, 'original'),
        correction('original', 300, 'first'),
        correction('first', 900),
      ]);
      expect(l.boughtInByPlayer.get(PETR)).toBe(900);
    });

    it('voids an entry to nothing but keeps it visible', () => {
      reset();
      const l = resolveLedger([buyin(PETR, 500, 'original'), voidEntry('original')]);

      expect(l.boughtInByPlayer.get(PETR) ?? 0).toBe(0);
      expect(l.entries).toHaveLength(1);
      expect(l.entries[0].voided).toBe(true);
      expect(l.entries[0].originalAmount).toBe(500);
    });

    it('brings an entry back if a void is itself corrected', () => {
      reset();
      const l = resolveLedger([
        buyin(PETR, 500, 'original'),
        voidEntry('original', 'thevoid'),
        correction('thevoid', 250),
      ]);
      expect(l.boughtInByPlayer.get(PETR)).toBe(250);
      expect(l.entries[0].voided).toBe(false);
    });

    it('refuses a correction that points at nothing', () => {
      reset();
      expect(() => resolveLedger([buyin(PETR, 500), correction('nope', 100)])).toThrow(LedgerError);
    });

    it('refuses a correction cycle rather than looping forever', () => {
      const entries: LedgerEntry[] = [
        { id: 'a', seq: 1, type: 'correction', amount: money(1), correctsEntryId: 'b' },
        { id: 'b', seq: 2, type: 'correction', amount: money(1), correctsEntryId: 'a' },
      ];
      expect(() => resolveLedger(entries)).toThrow(LedgerError);
    });
  });

  describe('validation', () => {
    it('rejects an expense with no payer', () => {
      expect(() =>
        resolveLedger([{ id: 'x', seq: 1, type: 'expense', amount: money(100) }]),
      ).toThrow(LedgerError);
    });

    it('rejects an expense attributed to a player', () => {
      expect(() =>
        resolveLedger([
          { id: 'x', seq: 1, type: 'expense', payerId: PETR, playerId: DANA, amount: money(100) },
        ]),
      ).toThrow(LedgerError);
    });

    it('rejects a buy-in with no player', () => {
      expect(() => resolveLedger([{ id: 'x', seq: 1, type: 'buyin', amount: money(100) }])).toThrow(
        LedgerError,
      );
    });

    it('rejects a fractional amount', () => {
      expect(() =>
        resolveLedger([{ id: 'x', seq: 1, type: 'buyin', playerId: PETR, amount: 10.5 as never }]),
      ).toThrow();
    });
  });
});

describe('reconcile()', () => {
  it('is happy when the count matches the table', () => {
    reset();
    // 2000 bought in, 200 cashed out -> 1800 should be in front of people
    const l = resolveLedger([buyin(PETR, 1000), buyin(DANA, 1000), cashout(DANA, 200)]);
    const r = reconcile(l, counts([[PETR, 1500], [DANA, 300]]));

    expect(r.chipsOnTable).toBe(1800);
    expect(r.counted).toBe(1800);
    expect(r.difference).toBe(0);
    expect(r.reconciled).toBe(true);
  });

  it('reports the mismatch until it is zero', () => {
    reset();
    const l = resolveLedger([buyin(PETR, 1000), buyin(DANA, 1000)]);

    const short = reconcile(l, counts([[PETR, 1500], [DANA, 400]]));
    expect(short.difference).toBe(-100);
    expect(short.reconciled).toBe(false);

    const over = reconcile(l, counts([[PETR, 1500], [DANA, 600]]));
    expect(over.difference).toBe(100);
    expect(over.reconciled).toBe(false);
  });

  it('ignores expenses, which are cash and never chips', () => {
    reset();
    const l = resolveLedger([buyin(PETR, 1000), expense(PETR, 170)]);
    const r = reconcile(l, counts([[PETR, 1000]]));
    expect(r.reconciled).toBe(true);
  });

  it('counts a corrected buy-in at its corrected value', () => {
    reset();
    const l = resolveLedger([buyin(PETR, 1000, 'original'), correction('original', 500)]);
    expect(reconcile(l, counts([[PETR, 500]])).reconciled).toBe(true);
    expect(reconcile(l, counts([[PETR, 1000]])).reconciled).toBe(false);
  });
});

describe('endedWith()', () => {
  it('adds chips still held to anything already cashed out', () => {
    reset();
    const l = resolveLedger([buyin(PETR, 500), cashout(PETR, 200)]);
    expect(endedWith(l, PETR, counts([[PETR, 400]]))).toBe(600);
  });

  it('is just the cash-out for someone who left', () => {
    reset();
    const l = resolveLedger([buyin(DANA, 500), cashout(DANA, 800)]);
    expect(endedWith(l, DANA, new Map())).toBe(800);
  });
});
