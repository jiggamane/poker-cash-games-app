import { describe, expect, it } from 'vitest';
import { isNoPlanForGroup, planLine } from './planWords';

describe('the plan row', () => {
  const now = new Date('2026-09-25T12:00:00Z');

  it('no plan is Free, whatever else is null', () => {
    expect(planLine({ plan: 'free', source: null, endsAt: null }, now)).toBe('Free');
  });

  it('a founder says so, and has no end', () => {
    expect(planLine({ plan: 'pro', source: 'founder', endsAt: null }, now)).toBe('Pro · founder');
  });

  it('a plan with an end names the day', () => {
    expect(planLine({ plan: 'club', source: 'promo', endsAt: '2027-09-25T12:00:00Z' }, now)).toBe(
      'Club · until 25 Sept 2027',
    );
  });

  it('an end already passed is never drawn as a date in the past', () => {
    expect(planLine({ plan: 'pro', source: 'grant', endsAt: '2026-01-01T00:00:00Z' }, now)).toBe('Pro');
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
