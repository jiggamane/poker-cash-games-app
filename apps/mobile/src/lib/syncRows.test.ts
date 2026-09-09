/**
 * What the app sends to the server, checked without a server.
 *
 * These assertions look pedantic — a list of column names, compared to another
 * list of column names — and they are the most valuable tests in the app right
 * now. Every one of these rows was written by reading the schema and had never
 * been executed against it. A single wrong column name means a night that
 * records perfectly on the phone and silently never leaves it.
 *
 * THE COLUMN LISTS ARE A TRIPWIRE. `supabase/test/03_sync_contract.sql` replays
 * these same rows against a real Postgres with the real migrations; if a column
 * set changes here and not there, this test fails and says so.
 */

import { describe, expect, it } from 'vitest';
import { money } from '@poker-club/core';
import type { LedgerEntry, MoneyRule } from '@poker-club/core';
import {
  bookPatch,
  countRow,
  entryRow,
  type EntryPayload,
  paymentDelete,
  paymentRow,
  playerRow,
  playerTermsPatch,
  ruleDelete,
  ruleRow,
  seatRow,
  sessionClosedPatch,
  sessionPatch,
  sessionRow,
  settlementRow,
  type ClosePayload,
} from './syncRows';

const BOOK = '11111111-1111-1111-1111-111111111111';
const SESSION = '22222222-2222-2222-2222-222222222222';
const PETR = '33333333-3333-3333-3333-333333333333';
const HOST = '44444444-4444-4444-4444-444444444444';

const keys = (o: Record<string, unknown>) => Object.keys(o).sort();

describe('the session row', () => {
  const w = sessionRow(
    {
      groupName: 'The poker club',
      session: {
        id: SESSION,
        startedAt: '2026-08-13T20:05:00.000Z',
        defaultBuyIn: 500,
        stakes: '$5 / $5',
        seatCount: 6,
      },
    },
    BOOK,
  );

  it('writes exactly the columns 03_sync_contract.sql inserts', () => {
    expect(keys(w.row)).toEqual([
      'book_id',
      'default_buyin',
      'id',
      'rounding_mode',
      'seat_count',
      'stakes',
      'started_at',
      'status',
      'table_name',
    ]);
  });

  it('never overwrites an existing night, because the row holds the share token', () => {
    expect(w.ignoreDuplicates).toBe(true);
    expect(w.onConflict).toBe('id');
  });

  it('opens live, whatever the phone thinks — the status moves at close', () => {
    expect(w.row.status).toBe('live');
  });
});

describe('the player and seat rows', () => {
  it('names the player column display_name, not name', () => {
    const w = playerRow({ groupName: 'g', player: { id: PETR, name: 'Petr' } }, BOOK);
    expect(keys(w.row)).toEqual(['book_id', 'display_name', 'id']);
  });

  it('carries a rename up, rather than leaving the server on the old name', () => {
    const w = playerRow({ groupName: 'g', player: { id: PETR, name: 'Petr K.' } }, BOOK);
    expect(w.onConflict).toBe('id');
    expect(w.ignoreDuplicates).toBeUndefined();
    // Three columns and no more: a rename must not touch claimed_by_user_id.
    expect(keys(w.row)).toEqual(['book_id', 'display_name', 'id']);
  });

  it('resolves a seat on the pair, since a seat has no id of its own', () => {
    const w = seatRow({ sessionId: SESSION, playerId: PETR });
    expect(w.onConflict).toBe('session_id,player_id');
    expect(keys(w.row)).toEqual(['player_id', 'session_id']);
  });
});

describe('the ledger entry row', () => {
  const entry: LedgerEntry & { occurredAt: string; note?: string } = {
    id: '55555555-5555-5555-5555-555555555555',
    seq: 7,
    type: 'rebuy',
    playerId: PETR,
    amount: money(500),
    occurredAt: '2026-08-13T21:12:00.000Z',
  };

  it('writes exactly the columns 03_sync_contract.sql inserts', () => {
    expect(keys(entryRow(SESSION, entry).row)).toEqual([
      'amount',
      'corrects_entry_id',
      'covered_by',
      'id',
      'note',
      'occurred_at',
      'payer_id',
      'player_id',
      'seq',
      'session_id',
      'spend_group',
      'type',
    ]);
  });

  // The three spend shapes 0004 added. `payer_id` is null in all of them, so
  // `covered_by` is the only thing separating a spend the piggy bank paid for
  // from a row the shape constraint refuses outright.
  it('sends what covered a spend, not just who fronted it', () => {
    const kitty: EntryPayload = {
      id: '66666666-6666-6666-6666-666666666666',
      seq: 8,
      type: 'expense',
      amount: money(54),
      coveredBy: 'kitty',
      occurredAt: '2026-08-13T21:48:00.000Z',
      note: 'Pizza',
    };
    expect(entryRow(SESSION, kitty).row.covered_by).toBe('kitty');
    expect(entryRow(SESSION, kitty).row.payer_id).toBeNull();
  });

  it('keeps the several fronters of one spend tied together', () => {
    const share: EntryPayload = {
      id: '77777777-7777-7777-7777-777777777777',
      seq: 9,
      type: 'expense',
      payerId: PETR,
      amount: money(27),
      spendGroup: '88888888-8888-8888-8888-888888888888',
      occurredAt: '2026-08-13T21:48:00.000Z',
    };
    expect(entryRow(SESSION, share).row.spend_group).toBe(
      '88888888-8888-8888-8888-888888888888',
    );
  });

  // An ordinary entry sends both columns as null rather than omitting them:
  // the column list above is the tripwire, and it only works if it is fixed.
  it('sends both as null on an entry that is not a spend', () => {
    expect(entryRow(SESSION, entry).row.covered_by).toBeNull();
    expect(entryRow(SESSION, entry).row.spend_group).toBeNull();
  });

  it('carries its own occurred_at rather than letting the server default it', () => {
    // A back-dated entry, or one sent days after a night with no signal, is
    // stamped when it HAPPENED. This is the field that makes that true.
    expect(entryRow(SESSION, entry).row.occurred_at).toBe('2026-08-13T21:12:00.000Z');
  });

  it('never overwrites: an entry is a fact, and a retry must not restate it', () => {
    expect(entryRow(SESSION, entry).ignoreDuplicates).toBe(true);
  });
});

describe('the money rule row', () => {
  const rule: MoneyRule = {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Kitchen & drinks',
    active: true,
    amountKind: 'fixed',
    amount: money(170),
    basis: 'gross',
    charge: 'winners_only',
    destination: 'bill',
    split: 'by_percent',
    collectorPlayerId: PETR,
    sortOrder: 1,
  };

  it('writes exactly the columns 03_sync_contract.sql inserts', () => {
    expect(keys(ruleRow({ groupName: 'g', rule }, BOOK).row)).toEqual([
      'active',
      'amount',
      'amount_kind',
      'basis',
      'book_id',
      'charge',
      'collector_player_id',
      'custom_shares',
      'destination',
      'id',
      'name',
      'sort_order',
      'split',
    ]);
  });

  it('OVERWRITES, unlike everything else — a rule is the one thing hosts edit', () => {
    expect(ruleRow({ groupName: 'g', rule }, BOOK).ignoreDuplicates).toBeUndefined();
  });

  it('sends the split vocabulary the server actually has', () => {
    // 0003 renamed these from by_win_size/equal/across_everyone. Sending an old
    // value is an invalid enum, not a wrong answer — the insert simply fails.
    for (const split of ['by_percent', 'evenly', 'custom'] as const) {
      const w = ruleRow({ groupName: 'g', rule: { ...rule, split } }, BOOK);
      expect(w.row.split).toBe(split);
    }
  });
});

describe('the final count row', () => {
  it('names the amount counted_chips, and resolves on the pair', () => {
    const w = countRow({ sessionId: SESSION, playerId: PETR, amount: 1200 });
    expect(keys(w.row)).toEqual(['counted_chips', 'player_id', 'session_id']);
    expect(w.onConflict).toBe('session_id,player_id');
  });
});

describe('the settlement row', () => {
  const base: ClosePayload = {
    sessionId: SESSION,
    endedAt: '2026-08-14T00:15:00.000Z',
    settlement: {
      algorithmVersion: 'settlement-v1',
      rulesSnapshot: [],
      inputsSnapshot: {},
      computedTransfers: [],
      totalOffTable: 212,
      discrepancyAmount: 0,
    },
  };

  it('writes exactly the columns 03_sync_contract.sql inserts', () => {
    expect(keys(settlementRow(base, HOST).row)).toEqual([
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
  });

  it('carries the device\u2019s own verdict on the night\u2019s arithmetic', () => {
    // The verdict travels WITH the settlement rather than after it, so a night
    // that failed its own check cannot reach the server looking clean.
    const verified = settlementRow(
      { ...base, settlement: { ...base.settlement, verification: { ok: false, codes: ['night.zeroSum'] } } },
      HOST,
    ).row;
    expect(verified.verification).toEqual({ ok: false, codes: ['night.zeroSum'] });

    // Null, never absent, for a night closed by a build that did not check.
    expect(settlementRow(base, HOST).row.verification).toBeNull();
  });

  it('leaves the confirmation empty when the night balanced', () => {
    const row = settlementRow(base, HOST).row;
    expect(row.discrepancy_confirmed_by).toBeNull();
    expect(row.discrepancy_confirmed_at).toBeNull();
  });

  it('names somebody and a moment when it did not', () => {
    // The schema refuses the row otherwise, on purpose: missing money is never
    // recorded quietly.
    const short = settlementRow(
      {
        ...base,
        settlement: { ...base.settlement, discrepancyAmount: -120, discrepancyNote: 'short' },
      },
      HOST,
    ).row;
    expect(short.discrepancy_confirmed_by).toBe(HOST);
    expect(short.discrepancy_confirmed_at).toBe('2026-08-14T00:15:00.000Z');
  });

  it('arrives frozen, and a replay never restates it', () => {
    expect(settlementRow(base, HOST).row.frozen).toBe(true);
    expect(settlementRow(base, HOST).ignoreDuplicates).toBe(true);
  });

  it('moves the session to settled with the time it ended', () => {
    expect(sessionClosedPatch(base)).toEqual({
      table: 'session',
      matchId: SESSION,
      patch: { status: 'settled', ended_at: '2026-08-14T00:15:00.000Z' },
    });
  });
});

// ---------------------------------------------------------------------------
// What the group and the night are SET UP as
// ---------------------------------------------------------------------------
// The other half of the queue, and the half that did not exist: everything
// above this line is what happened at a table, everything below is what it
// happened under. Each of these was collected by the app and stored on one
// phone, so `03_sync_contract.sql` replays them for the same reason it replays
// the rest — a wrong column name here is a setting that silently never leaves.

describe('the book patch', () => {
  const p = bookPatch(
    {
      groupName: 'The poker club',
      book: {
        currencyCode: 'CHF',
        defaultBuyIn: 500,
        stakes: '{"small":5,"big":5}',
        roundingMode: 'hundreds',
      },
    },
    BOOK,
  );

  it('writes exactly the columns 03_sync_contract.sql updates', () => {
    expect(keys(p.patch)).toEqual([
      'currency_code',
      'default_buyin',
      'group_name',
      'rounding_mode',
      'stakes',
    ]);
  });

  it('keeps the ISO code out of currency_symbol, which is a glyph', () => {
    expect(p.patch.currency_code).toBe('CHF');
    expect(p.patch).not.toHaveProperty('currency_symbol');
  });

  it('always writes the name, which is how a rename lands at all', () => {
    const renamed = bookPatch({ groupName: 'Friday', previousName: 'The poker club', book: {} }, BOOK);
    expect(renamed.patch).toEqual({ group_name: 'Friday' });
    expect(renamed.matchId).toBe(BOOK);
  });

  it('names no column the caller did not speak about', () => {
    expect(keys(bookPatch({ groupName: 'g', book: { roundingMode: null } }, BOOK).patch)).toEqual([
      'group_name',
      'rounding_mode',
    ]);
  });
});

describe('the session patch', () => {
  it('says live where the app says open, because that is the enum', () => {
    expect(sessionPatch({ sessionId: SESSION, status: 'open' }).patch).toEqual({ status: 'live' });
    expect(sessionPatch({ sessionId: SESSION, status: 'counting' }).patch).toEqual({
      status: 'counting',
    });
  });

  it('NEVER carries ended_at, which the server checks against the status', () => {
    const p = sessionPatch({
      sessionId: SESSION,
      status: 'counting',
      tableName: 'Kitchen table',
      roundingMode: 'tens',
    });
    expect(keys(p.patch)).toEqual(['rounding_mode', 'status', 'table_name']);
    expect(p.patch).not.toHaveProperty('ended_at');
  });

  it('carries a table name on its own, for the night renamed by a second table', () => {
    expect(sessionPatch({ sessionId: SESSION, tableName: 'Main table' }).patch).toEqual({
      table_name: 'Main table',
    });
  });
});

describe("the roster's standing answers", () => {
  const p = playerTermsPatch({ playerId: PETR, paysKitty: false, removedAt: null });

  it('writes exactly the columns 03_sync_contract.sql updates', () => {
    expect(keys(p.patch)).toEqual(['pays_kitty', 'removed_at']);
    expect(p.matchId).toBe(PETR);
  });

  it('removes by stamping a time, never by deleting a row the ledger points at', () => {
    const gone = playerTermsPatch({
      playerId: PETR,
      paysKitty: true,
      removedAt: '2026-09-09T18:00:00.000Z',
    });
    expect(gone.table).toBe('player');
    expect(gone.patch.removed_at).toBe('2026-09-09T18:00:00.000Z');
  });
});

describe('a rule the group no longer has', () => {
  it('deletes the row, scoped to the book, so no other group can be reached', () => {
    const RULE = '55555555-5555-5555-5555-555555555555';
    expect(ruleDelete({ ruleId: RULE }, BOOK)).toEqual({
      table: 'money_rule',
      match: { id: RULE, book_id: BOOK },
    });
  });
});

describe('who has paid', () => {
  const paid = {
    sessionId: SESSION,
    fromPlayerId: PETR,
    toPlayerId: HOST,
    paidAt: '2026-09-09T18:00:00.000Z',
  };

  it('writes exactly the columns 03_sync_contract.sql inserts', () => {
    const w = paymentRow(paid);
    expect(keys(w.row)).toEqual(['from_player_id', 'paid_at', 'session_id', 'to_player_id']);
    expect(w.onConflict).toBe('session_id,from_player_id,to_player_id');
  });

  it('OVERWRITES, because a tick is a state and not an event', () => {
    expect(paymentRow(paid).ignoreDuplicates).toBeUndefined();
  });

  it('un-ticking removes the row on the pair — B21, the door goes both ways', () => {
    expect(paymentDelete({ ...paid, paidAt: null })).toEqual({
      table: 'transfer_payment',
      match: { session_id: SESSION, from_player_id: PETR, to_player_id: HOST },
    });
  });
});
