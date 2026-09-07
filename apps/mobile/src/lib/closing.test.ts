/**
 * Closing a night, checked without a database.
 *
 * `closeNight()` in `nightStore.ts` is four writes and a queue call around one
 * decision, and this is the decision. It matters more than its size: the close
 * is the moment the record of who owes whom is fixed, and until this commit it
 * was a single status column — no result stored, no check run, nothing sent.
 *
 * THE THREE THINGS ASSERTED HERE are the three that were missing:
 *
 *   1. the night is handed to `verifyNight()` and the verdict comes back
 *   2. the result is frozen in a shape that survives being written down
 *   3. the whole record — snapshot, rules, transfers, verdict — is assembled
 *      for the outbox, in the columns `settlementRow` actually writes
 *
 * And the fourth, which is the group's own rule: **a club's settings are the
 * defaults its next game opens with, never a revision of a game already
 * played.** The snapshot below carries the night's own step and its own rules,
 * so re-deriving it years later cannot apply today's settings to it.
 */

import { describe, expect, it } from 'vitest';
import {
  inputFromSnapshot,
  money,
  settle,
  thaw,
  type LedgerEntry,
  type Money,
  type MoneyRule,
  type NightSnapshot,
  type Player,
  type PlayerId,
  type SettlementInput,
} from '@poker-club/core';
import { closeOf, type ClosableNight } from './closing';
import { settlementRow, sessionClosedPatch } from './syncRows';

const SESSION = '22222222-2222-2222-2222-222222222222';
const HOST = '44444444-4444-4444-4444-444444444444';

const DANA = 'dana';
const MAREK = 'marek';
const LENA = 'lena';
const PETR = 'petr';
const KITTY = 'the-kitty';

const players: Player[] = [
  { id: DANA, name: 'Dana', atTable: true },
  { id: MAREK, name: 'Marek', atTable: true },
  { id: LENA, name: 'Lena', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: KITTY, name: 'The piggy bank', atTable: false },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

const entries: LedgerEntry[] = [
  e({ type: 'buyin', playerId: DANA, amount: money(500) }),
  e({ type: 'buyin', playerId: MAREK, amount: money(500) }),
  e({ type: 'buyin', playerId: LENA, amount: money(1000) }),
  e({ type: 'buyin', playerId: PETR, amount: money(500) }),
  e({ type: 'expense', payerId: MAREK, amount: money(120) }),
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
];

const finalCounts = new Map<PlayerId, Money>([
  [DANA, money(300)],
  [MAREK, money(900)],
  [LENA, money(1400)],
  [PETR, money(400)],
]);

const rules: MoneyRule[] = [
  {
    id: 'kitty', name: 'Group piggy bank', active: true,
    amountKind: 'percent', amount: money(5), basis: 'gross',
    charge: 'winners_only', destination: 'kitty', split: 'evenly',
    collectorPlayerId: KITTY, sortOrder: 1,
  },
  {
    id: 'bill', name: 'Kitchen & drinks', active: true,
    amountKind: 'fixed', amount: money(120), basis: 'gross',
    charge: 'winners_only', destination: 'bill', split: 'evenly',
    collectorPlayerId: MAREK, sortOrder: 2,
  },
];

const occurredAt = Object.fromEntries(
  entries.map((x, i) => [x.id, `2026-09-06T2${i}:00:00.000Z`.replace('2 ', '2')]),
);

const night: ClosableNight = {
  sessionId: SESSION,
  endedAt: '2026-09-06T23:52:00.000Z',
  occurredAt,
};

const AT = '2026-09-07T00:14:00.000Z';

const input = (over: Partial<SettlementInput> = {}): SettlementInput => ({
  players,
  entries,
  finalCounts,
  rules,
  ...over,
});

describe('the night checks its own arithmetic', () => {
  it('runs verifyNight and keeps the verdict', () => {
    const { verification } = closeOf(night, input(), AT);

    expect(verification.ok).toBe(true);
    // Not a token pass: the verifier must actually have checked something.
    expect(verification.checked).toBeGreaterThan(20);
    expect(verification.codes).toEqual([]);
    expect(verification.algorithmVersion).toBe('settlement-v1');
    expect(verification.at).toBe(AT);
  });

  /*
   * THE VERDICT TRAVELS WITH THE RECORD, which is what `syncRows` means by
   * "a night that failed its own arithmetic cannot reach the server looking
   * clean". A verdict sent separately, or sent only when it passes, is a
   * verification system that reports zero failures because it never files one.
   */
  it('puts the verdict inside the payload, not beside it', () => {
    const { payload, verification } = closeOf(night, input(), AT);
    expect(payload.settlement.verification).toBe(verification);
  });
});

describe('the result is frozen', () => {
  it('freezes what was computed, readable again through thaw', () => {
    const { result, frozen } = closeOf(night, input({ roundingMode: 'tens' }), AT);

    const back = thaw(JSON.parse(JSON.stringify(frozen)));
    expect(back).not.toBeNull();
    expect(back!.transfers).toEqual(result.transfers);
    expect([...back!.rounding.positions.entries()]).toEqual([
      ...result.rounding.positions.entries(),
    ]);
  });

  /*
   * THE RULE THE OWNER STATES: the group's settings are defaults for the games
   * that come next. A night settled at tens keeps its tens; changing the club
   * to hundreds tomorrow does not restate tonight.
   */
  it('re-derives to the same figures from its own snapshot, not from today’s settings', () => {
    const { result, payload } = closeOf(night, input({ roundingMode: 'tens' }), AT);

    const again = inputFromSnapshot(
      payload.settlement.inputsSnapshot as NightSnapshot,
      payload.settlement.rulesSnapshot,
    );
    expect(again).not.toBeNull();
    expect(again!.roundingMode).toBe('tens');
    expect(settle(again!)).toEqual(result);
  });

  it('carries the night’s own rules, so a rule changed later cannot restate it', () => {
    const { payload } = closeOf(night, input(), AT);
    expect(payload.settlement.rulesSnapshot).toEqual(rules);

    // The club moves the piggy bank to 10% next week. The stored night is
    // untouched, and re-deriving it still charges 5%.
    const changed = rules.map((r) => (r.id === 'kitty' ? { ...r, amount: money(10) } : r));
    expect(payload.settlement.rulesSnapshot).not.toEqual(changed);
  });

  it('keeps when each entry happened, which the ledger alone cannot say', () => {
    const { payload } = closeOf(night, input(), AT);
    expect((payload.settlement.inputsSnapshot as NightSnapshot).occurredAt).toEqual(occurredAt);
  });
});

describe('the record that goes to the server', () => {
  it('fills every column settlementRow writes', () => {
    const { payload } = closeOf(night, input(), AT);
    const row = settlementRow(payload, HOST).row as Record<string, unknown>;

    expect(Object.keys(row).sort()).toEqual([
      'algorithm_version',
      'computed_transfers',
      'discrepancy_absorbed_by',
      'discrepancy_amount',
      'discrepancy_confirmed_at',
      'discrepancy_confirmed_by',
      'discrepancy_note',
      'frozen',
      'inputs_snapshot',
      'rules_snapshot',
      'session_id',
      'total_off_table',
      'verification',
    ]);
    expect(row.session_id).toBe(SESSION);
    expect(row.verification).not.toBeNull();
  });

  it('stamps the night as ended when the cards stopped, not when the host tapped', () => {
    const { payload } = closeOf(night, input(), AT);
    expect(payload.endedAt).toBe('2026-09-06T23:52:00.000Z');
    expect(sessionClosedPatch(payload).patch).toEqual({
      status: 'settled',
      ended_at: '2026-09-06T23:52:00.000Z',
    });
  });

  it('falls back to the close time for a night that never stamped an end', () => {
    const { payload } = closeOf({ sessionId: SESSION, occurredAt }, input(), AT);
    expect(payload.endedAt).toBe(AT);
  });

  it('states the transfers the room was actually given', () => {
    const { result, payload } = closeOf(night, input(), AT);
    expect(payload.settlement.computedTransfers).toEqual(result.transfers);
    expect(payload.settlement.totalOffTable).toBe(result.totalOffTable);
  });
});

describe('a night that does not add up', () => {
  const short = () =>
    input({ finalCounts: new Map(finalCounts).set(PETR, money(300)) });

  /*
   * THE CLOSE GATE, AND IT MUST STAY A THROW. `settle()` refuses a count that
   * does not balance unless the host has confirmed the gap, and the screen
   * draws *Out of balance* off the back of that refusal. Catching it here would
   * route around the one guard that stops a night closing over missing money.
   */
  it('refuses to close over an unconfirmed shortfall', () => {
    expect(() => closeOf(night, short(), AT)).toThrow();
  });

  it('closes once the host has confirmed the figure, and records who and what', () => {
    const ack = {
      amount: money(-100),
      confirmedByUserId: HOST,
      confirmedAt: AT,
      note: 'a hundred short after the last rebuy',
    };
    const { payload, verification } = closeOf(
      night,
      input({
        finalCounts: new Map(finalCounts).set(PETR, money(300)),
        acknowledgedDiscrepancy: ack,
      }),
      AT,
    );

    expect(verification.ok).toBe(true);
    expect(payload.settlement.discrepancyAmount).toBe(-100);
    expect(payload.settlement.discrepancyNote).toBe('a hundred short after the last rebuy');

    // The schema refuses a shortfall with nobody's name against it — missing
    // money is never recorded quietly.
    const row = settlementRow(payload, HOST).row as Record<string, unknown>;
    expect(row.discrepancy_confirmed_by).toBe(HOST);
    expect(row.discrepancy_confirmed_at).toBe('2026-09-06T23:52:00.000Z');
  });

  it('names who absorbed the gap, when the room decided on the spot', () => {
    const { payload } = closeOf(
      night,
      input({
        finalCounts: new Map(finalCounts).set(PETR, money(300)),
        acknowledgedDiscrepancy: {
          amount: money(-100),
          confirmedByUserId: HOST,
          confirmedAt: AT,
          absorbedByPlayerId: LENA,
        },
      }),
      AT,
    );
    expect(payload.settlement.discrepancyAbsorbedBy).toBe(LENA);
  });

  it('leaves no note and no absorber where the host gave neither', () => {
    const { payload } = closeOf(night, input(), AT);
    expect(payload.settlement.discrepancyAmount).toBe(0);
    expect(payload.settlement).not.toHaveProperty('discrepancyNote');
    expect(payload.settlement).not.toHaveProperty('discrepancyAbsorbedBy');
  });
});
