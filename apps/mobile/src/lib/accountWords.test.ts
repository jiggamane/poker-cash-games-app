import { describe, expect, it } from 'vitest';
import {
  groupLine,
  hostSeatLine,
  memberSeatLine,
  planEndsLine,
  readingOf,
  seatTitle,
  startedAt,
  type DeletionPlan,
  type DeletionSeat,
} from './accountWords';

const plan = (over: Partial<DeletionPlan>): DeletionPlan => ({
  running: null,
  groups: [],
  seats: [],
  store_subscription: false,
  ...over,
});

const seat = (over: Partial<DeletionSeat> = {}): DeletionSeat => ({
  player_id: 'p',
  display_name: 'Petr',
  admin_name: null,
  book_id: 'b',
  group_name: 'The Thursday game',
  host_name: 'Andro',
  ...over,
});

describe('the delete-account sheet, in the board’s words', () => {
  it('reads as a host, a member, an empty account or a watcher', () => {
    const g = { book_id: 'b', group_name: 'G', outcome: 'closed' as const, members: 2 };
    expect(readingOf(plan({ groups: [g], seats: [seat()] }), false)).toBe('host');
    expect(readingOf(plan({ seats: [seat()] }), true)).toBe('member');
    expect(readingOf(plan({}), false)).toBe('empty');
    expect(readingOf(plan({}), true)).toBe('watcher');
  });

  it('says what happens to each group, and drops the count at 0 rather than printing it', () => {
    expect(groupLine({ book_id: 'b', group_name: 'G', outcome: 'deleted', members: 0 })).toBe(
      'Deleted, with every night in it. Nobody else ever had a seat.',
    );
    expect(groupLine({ book_id: 'b', group_name: 'G', outcome: 'closed', members: 3 })).toBe(
      'Closed and kept. 3 people keep every night they were in. Nobody can add to it.',
    );
    expect(groupLine({ book_id: 'b', group_name: 'G', outcome: 'closed', members: 1 })).toBe(
      'Closed and kept. 1 person keeps every night they were in. Nobody can add to it.',
    );
    expect(groupLine({ book_id: 'b', group_name: 'G', outcome: 'closed', members: 0 })).toBe(
      'Closed and kept. Nobody can add to it.',
    );
  });

  it('names a seat, and says when a renamed one goes back to the admin’s name', () => {
    expect(seatTitle(seat())).toBe('Petr in The Thursday game');
    expect(memberSeatLine(seat())).toBe('Andro still sees every night you played, and can invite you back.');
    expect(hostSeatLine(seat())).toBe('Becomes a name again. Andro still sees every night you played.');
    const renamed = seat({ display_name: 'Pete', admin_name: 'Petr', host_name: 'Kuba' });
    expect(memberSeatLine(renamed)).toBe('You renamed this seat. It goes back to Petr, the name Kuba gave it.');
    expect(hostSeatLine(renamed)).toBe(memberSeatLine(renamed));
  });

  it('says the plan ends only when there is one', () => {
    expect(planEndsLine('Free')).toBeNull();
    expect(planEndsLine(null)).toBeNull();
    expect(planEndsLine('Full · founder')).toBe(
      'Your plan, Full · founder, ends with the account. Signing up again starts on Free.',
    );
  });

  it('gives the running night’s start on this phone’s clock', () => {
    const at = new Date(2026, 10, 9, 20, 5).toISOString();
    expect(startedAt(at)).toBe('It started at 20:05.');
    expect(startedAt('nonsense')).toBe('');
  });
});
