import { describe, expect, it } from 'vitest';
import { EMPTY_TABLE_RULES, RULES_EDITION } from '@poker-club/core';
import { rulesSheetText } from './rulesSheet';

describe('the printable rules sheet', () => {
  it('lists every rule, set or not, and signs off with the edition', () => {
    const text = rulesSheetText('Thursday game', { ...EMPTY_TABLE_RULES, goingSouth: 'forbidden' }, '$');
    const lines = text.split('\n');
    expect(lines[0]).toBe('Thursday game — table rules');
    expect(lines).toContain('Going south: Never');
    expect(lines).toContain('Rebuy cap: not set');
    expect(lines.at(-1)).toBe(`1 of 14 set · The Poker Club, rules edition ${RULES_EDITION}`);
  });
});
