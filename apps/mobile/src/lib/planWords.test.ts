import { describe, expect, it } from 'vitest';
import { isHostNightGate, isNoPlanForGroup, planLine } from './planWords';

describe('the plan row', () => {
  const now = new Date('2026-09-25T12:00:00Z');

  it('no plan is Free, whatever else is null', () => {
    expect(planLine({ plan: 'free', source: null, endsAt: null }, now)).toBe('Free');
  });

  it('a founder says so, and has no end', () => {
    expect(planLine({ plan: 'full', source: 'founder', endsAt: null }, now)).toBe('Full · founder');
  });

  it('a plan with an end names the day', () => {
    expect(planLine({ plan: 'full', source: 'promo', endsAt: '2027-09-25T12:00:00Z' }, now)).toBe(
      'Full · until 25 Sept 2027',
    );
  });

  it('Regular is a plan of its own (0021)', () => {
    expect(planLine({ plan: 'regular', source: 'promo', endsAt: '2026-11-25T12:00:00Z' }, now)).toBe(
      'Regular · until 25 Nov 2026',
    );
  });

  it('an end already passed is never drawn as a date in the past', () => {
    expect(planLine({ plan: 'full', source: 'grant', endsAt: '2026-01-01T00:00:00Z' }, now)).toBe('Full');
  });
});

describe('telling a refused group from any other refusal', () => {
  it('reads the policy 0018 names', () => {
    expect(
      isNoPlanForGroup(
        'new row violates row-level security policy "book_insert_needs_plan" for table "book"',
      ),
    ).toBe(true);
  });

  it('and nothing else — a plain RLS refusal is some other fault', () => {
    expect(isNoPlanForGroup('new row violates row-level security policy for table "book"')).toBe(false);
    expect(isNoPlanForGroup(new Error('Network request failed'))).toBe(false);
  });
});

describe('telling a refused night from any other refusal', () => {
  it('reads the prefix 0021 raises with', () => {
    expect(isHostNightGate("host_night_gate: this account's host night is used until 15 Nov.")).toBe(true);
    expect(isHostNightGate(new Error('session: host_night_gate: this account has no plan, and opening a game needs one.'))).toBe(true);
  });

  it('and nothing else', () => {
    expect(isHostNightGate('new row violates row-level security policy for table "session"')).toBe(false);
  });
});
