/**
 * WHO IS HOLDING CHIPS, AND WHOSE COUNT IS STILL ABOUT SOMETHING — B85.
 *
 * `counted-then-cashed-out.test.ts` holds the one night this came from. This
 * one walks the shapes a night can take AROUND that bug and asks the same two
 * questions of every one of them:
 *
 *   1. Do Count up and the close gate agree? `balance.ts` claims in prose that
 *      `balanceCheck().left` is exactly `−reconcile().difference` — the whole
 *      point being that a host cannot be shown a balanced night by one and
 *      refused by the other. On 20 September that was false, and nothing went
 *      red because nothing asked.
 *   2. Does the night then settle, and does the verifier — which re-derives
 *      every identity by its own hand — agree that it should have?
 *
 * THE WALK IS THE TEST. Every case below was run by hand against the built
 * engine first, as a script, because the bug was invisible to unit tests that
 * each looked at one function. Two of these shapes were wrong when the script
 * was first run: the night from the screenshots, and the voided cash-out, whose
 * first fix read past the `voided` flag and dropped a seated player's stack.
 */

import { describe, expect, it } from 'vitest';
import { balanceCheck } from './balance';
import { reconcile, resolveLedger, seatedIn } from './ledger';
import { money, type Money } from './money';
import { settle } from './settlement';
import { verifyNight } from './verify';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });
const at = (id: string, x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ ...e(x), id });

const counts = (pairs: Array<[PlayerId, number]>): Map<PlayerId, Money> =>
  new Map(pairs.map(([id, n]) => [id, money(n)]));

/**
 * One night, asked both questions.
 *
 * `seated` is not passed in: it comes off `seatedIn`, which is what the app's
 * `standingsOf` feeds `balanceCheck` from. A test that computed its own would
 * be the fourth copy of the rule that caused this — and it did, in the script
 * this file grew from, where it hid a real failure for one run.
 */
const walk = (entries: LedgerEntry[], finalCounts: Map<PlayerId, Money>) => {
  const ledger = resolveLedger(entries);
  const players: Player[] = [...new Set(entries.map((x) => x.playerId).filter(Boolean))].map(
    (id) => ({ id: id as PlayerId, name: String(id), atTable: seatedIn(ledger).has(id as PlayerId) }),
  );
  const input = { players, entries, finalCounts, rules: [] as MoneyRule[], roundingMode: 'dollars' as const };

  const block = balanceCheck(ledger, finalCounts, [...seatedIn(ledger)]);
  const gate = reconcile(ledger, finalCounts);
  const result = settle(input);

  return {
    block,
    gate,
    result,
    verdict: verifyNight(input, result),
    positions: result.players.reduce((running, p) => running + p.finalPosition, 0),
  };
};

/** The two questions, asked the same way of every shape below. */
const agrees = (night: ReturnType<typeof walk>) => {
  expect(night.block.left === -night.gate.difference).toBe(true);
  expect(night.block.state === 'balanced').toBe(night.gate.reconciled);
  expect(night.verdict.findings.map((f) => f.code)).toEqual([]);
  expect(night.positions).toBe(0);
};

describe('the block and the close gate read the same night', () => {
  it('when a stack was counted and then cashed out', () => {
    const entries = [
      e({ type: 'buyin', playerId: 'levani', amount: money(3000) }),
      e({ type: 'buyin', playerId: 'andro', amount: money(2000) }),
      e({ type: 'buyin', playerId: 'oto', amount: money(3000) }),
      e({ type: 'cashout', playerId: 'levani', amount: money(3500) }),
      e({ type: 'cashout', playerId: 'andro', amount: money(1500) }),
    ];
    const night = walk(entries, counts([['andro', 1500], ['oto', 3000]]));

    agrees(night);
    expect(night.block.state).toBe('balanced');
  });

  it('when they cashed out, came back, and were counted again', () => {
    const entries = [
      e({ type: 'buyin', playerId: 'a', amount: money(1000) }),
      e({ type: 'buyin', playerId: 'b', amount: money(1000) }),
      e({ type: 'cashout', playerId: 'a', amount: money(400) }),
      e({ type: 'rebuy', playerId: 'a', amount: money(1000) }),
    ];
    const night = walk(entries, counts([['a', 600], ['b', 2000]]));

    agrees(night);
    expect(night.block.state).toBe('balanced');
  });

  it('when a busted stack is counted at zero, which is a count', () => {
    const entries = [
      e({ type: 'buyin', playerId: 'a', amount: money(1000) }),
      e({ type: 'buyin', playerId: 'b', amount: money(1000) }),
    ];
    const night = walk(entries, counts([['a', 0], ['b', 2000]]));

    agrees(night);
    expect(night.block.uncounted).toEqual([]);
  });

  it('when everybody cashed out and nothing was ever counted', () => {
    const entries = [
      e({ type: 'buyin', playerId: 'a', amount: money(1000) }),
      e({ type: 'buyin', playerId: 'b', amount: money(1000) }),
      e({ type: 'cashout', playerId: 'a', amount: money(1500) }),
      e({ type: 'cashout', playerId: 'b', amount: money(500) }),
    ];
    const night = walk(entries, new Map());

    agrees(night);
    expect(night.block.state).toBe('balanced');
  });

  /*
   * A VOIDED CASH-OUT NEVER HAPPENED, so it never moved them off the table and
   * the stack in front of them is the table's again. `resolveLedger` FLAGS a
   * voided entry rather than dropping it — the struck-through row has to be
   * drawable — and the first cut of `seatedIn` read past the flag, which
   * dropped this player's count and left the night ₾400 short. Nothing else in
   * the suite would have caught it.
   */
  it('when a cash-out was voided and the player is seated again', () => {
    const entries = [
      e({ type: 'buyin', playerId: 'a', amount: money(1000) }),
      e({ type: 'buyin', playerId: 'b', amount: money(1000) }),
      at('out-a', { type: 'cashout', playerId: 'a', amount: money(400) }),
      e({ type: 'void', amount: money(0), correctsEntryId: 'out-a' }),
    ];
    const ledger = resolveLedger(entries);
    expect(seatedIn(ledger).has('a')).toBe(true);

    const night = walk(entries, counts([['a', 400], ['b', 1600]]));
    agrees(night);
    expect(night.block.state).toBe('balanced');
  });

  /* And the same the other way: a cash-out CORRECTED to a new amount still
     took them off the table, so their count is still spent. */
  it('when a cash-out was corrected rather than voided', () => {
    const entries = [
      e({ type: 'buyin', playerId: 'a', amount: money(1000) }),
      e({ type: 'buyin', playerId: 'b', amount: money(1000) }),
      at('out-a', { type: 'cashout', playerId: 'a', amount: money(400) }),
      e({ type: 'correction', amount: money(500), correctsEntryId: 'out-a' }),
    ];
    const ledger = resolveLedger(entries);
    expect(seatedIn(ledger).has('a')).toBe(false);

    /* The stale ₾400 count is read past; ₾1,500 is on the table for b. */
    const night = walk(entries, counts([['a', 400], ['b', 1500]]));
    agrees(night);
    expect(night.block.state).toBe('balanced');
  });
});
