import { describe, expect, it } from 'vitest';
import { searchSituations } from './search';

describe('searching the library', () => {
  it('finds the mucked winner first for "muck"', () => {
    const ids = searchSituations('muck').map((s) => s.id);
    expect(ids[0]).toBe('showdown.mucked-winner');
    expect(ids).toContain('showdown.dealer-mucked');
  });

  it('matches every term, by prefix, ignoring case and quotes', () => {
    expect(searchSituations('Said "RAISE" chip')[0]?.id).toBe('betting.one-chip');
    expect(searchSituations('string')[0]?.id).toBe('betting.string-bet');
    expect(searchSituations('bank short')[0]?.id).toBe('money.short-bank');
  });

  it('reads aliases a player would use', () => {
    expect(searchSituations('rathole')[0]?.id).toBe('money.going-south');
    expect(searchSituations('hit and run')[0]?.id).toBe('money.leaving');
    expect(searchSituations('wheel')[0]?.id).toBe('hands.wheel');
  });

  it('returns nothing for nothing, and caps the list', () => {
    expect(searchSituations('')).toEqual([]);
    expect(searchSituations('   ')).toEqual([]);
    expect(searchSituations('xyzzy')).toEqual([]);
    expect(searchSituations('the', 4).length).toBeLessThanOrEqual(4);
  });
});
