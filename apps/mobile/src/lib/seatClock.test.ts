import { describe, expect, it } from 'vitest';
import { money, type LedgerEntry, type Money, type PlayerId } from '@poker-club/core';
import { timingOf } from './seatClock';
import type { Night } from './nightStore';

/**
 * Who was at the table and for how long, read off the rows nobody has to
 * remember to fill in.
 */

const T = (hhmm: string) => `2026-09-12T${hhmm}:00.000Z`;
const MS = (hhmm: string) => Date.parse(T(hhmm));
/** The small hours, which is when a poker night actually ends. */
const NEXT = (hhmm: string) => Date.parse(`2026-09-13T${hhmm}:00.000Z`);

let seq = 0;
const entry = (
  type: LedgerEntry['type'],
  playerId: PlayerId,
  amount: number,
): LedgerEntry & { at: string } => ({
  id: `e${++seq}`,
  seq,
  type,
  playerId,
  amount: money(amount) as Money,
  at: '',
});

function night(
  rows: Array<[LedgerEntry['type'], PlayerId, number, string]>,
  over: Partial<Night> = {},
): Night {
  seq = 0;
  const entries = rows.map(([type, id, amount]) => entry(type, id, amount));
  return {
    sessionId: 's1',
    groupName: 'The Tuesday game',
    tableName: 'Tonight',
    startedAt: T('19:00'),
    status: 'open',
    players: [
      { id: 'a', name: 'Ada', atTable: true },
      { id: 'b', name: 'Ben', atTable: true },
      { id: 'host', name: 'Host', atTable: false },
    ],
    entries,
    finalCounts: new Map(),
    paidAt: new Map(),
    rules: [],
    roundingMode: null,
    occurredAt: Object.fromEntries(entries.map((e, i) => [e.id, T(rows[i][3])])),
    noteOf: {},
    seeded: false,
    ...over,
  } as Night;
}

describe('how long the table ran', () => {
  it('runs to this moment while the night is open', () => {
    const t = timingOf(night([['buyin', 'a', 1000, '19:00']]), MS('23:30'));
    expect(t.tableMinutes).toBe(270);
  });

  it('holds still once the night has stopped', () => {
    const t = timingOf(
      night([['buyin', 'a', 1000, '19:00']], { endedAt: T('23:00'), status: 'counting' }),
      NEXT('02:00'), // the host finished counting hours later
    );
    expect(t.tableMinutes).toBe(240);
  });
});

describe('how long each person sat', () => {
  it('starts at the buy-in and ends at the cash-out', () => {
    // Ada was there from the start; Ben arrived at 21:00 and left at 23:00.
    const t = timingOf(
      night([
        ['buyin', 'a', 1000, '19:00'],
        ['buyin', 'b', 1000, '21:00'],
        ['cashout', 'b', 1400, '23:00'],
      ]),
      NEXT('00:00'),
    );

    expect(t.minutesByPlayer?.get('a')).toBe(300);
    expect(t.minutesByPlayer?.get('b')).toBe(120);
  });

  it('keeps somebody who bought back in on the clock', () => {
    const t = timingOf(
      night([
        ['buyin', 'b', 1000, '19:00'],
        ['cashout', 'b', 0, '20:00'],
        ['buyin', 'b', 1000, '21:00'],
      ]),
      MS('22:00'),
    );

    // Three hours: the seat was theirs across the hour they sat out.
    expect(t.minutesByPlayer?.get('b')).toBe(180);
  });

  it('times a player with no buy-in from the start of the night', () => {
    const t = timingOf(night([['buyin', 'a', 1000, '20:00']]), MS('21:00'));
    expect(t.minutesByPlayer?.get('b')).toBe(120);
  });

  it('never times anybody for longer than the table ran', () => {
    // A phone whose clock is wrong, or a row backdated by hand.
    const t = timingOf(
      night([['buyin', 'a', 1000, '17:00']], { startedAt: T('19:00') }),
      MS('20:00'),
    );
    expect(t.minutesByPlayer?.get('a')).toBe(60);
  });

  it('never puts a collector who does not play on the clock', () => {
    const t = timingOf(night([['buyin', 'a', 1000, '19:00']]), MS('20:00'));
    expect(t.minutesByPlayer?.has('host')).toBe(false);
  });
});

describe('the shape a watcher holds', () => {
  /**
   * X1 IS THE SAME NIGHT. A watcher settles it on their own device from
   * `WatchedNight`, which carries each row's time ON the row rather than in a
   * map beside it. Reading only the map would time every night at zero for
   * them, and a rake by the hour would come out as nothing — two people
   * looking at one night and seeing two sets of figures.
   */
  it('times a night whose rows carry their own occurredAt', () => {
    const t = timingOf(
      {
        startedAt: T('19:00'),
        endedAt: T('23:00'),
        players: [
          { id: 'a', name: 'Ada', atTable: true },
          { id: 'b', name: 'Ben', atTable: true },
        ],
        entries: [
          { id: 'e1', seq: 1, type: 'buyin', playerId: 'a', amount: money(1000) as Money, occurredAt: T('19:00') },
          { id: 'e2', seq: 2, type: 'buyin', playerId: 'b', amount: money(1000) as Money, occurredAt: T('21:00') },
        ],
      },
      MS('23:30'),
    );

    expect(t.tableMinutes).toBe(240);
    expect(t.minutesByPlayer?.get('a')).toBe(240);
    expect(t.minutesByPlayer?.get('b')).toBe(120);
  });
});
