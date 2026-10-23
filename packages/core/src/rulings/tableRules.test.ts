import { describe, expect, it } from 'vitest';
import { money } from '../money';
import {
  EMPTY_TABLE_RULES,
  TABLE_RULE_KEYS,
  readTableRules,
  resolveAnswer,
  sameTableRuleValue,
  tableRuleLabel,
  tableRuleOptions,
  tableRuleSentence,
  tableRuleValue,
  tableRulesSetCount,
} from './tableRules';

describe('table rules', () => {
  it('labels and sentences every key, set and unset', () => {
    for (const key of TABLE_RULE_KEYS) {
      expect(tableRuleLabel(key).length).toBeGreaterThan(0);
      expect(tableRuleValue(key, EMPTY_TABLE_RULES)).toBeNull();
      expect(tableRuleSentence(key, EMPTY_TABLE_RULES)).toMatch(/has not/);
      for (const o of tableRuleOptions(key)) {
        const rules = { ...EMPTY_TABLE_RULES, [key]: o.value };
        expect(tableRuleValue(key, rules), `${key} ${o.label}`).toBe(o.label);
        expect(tableRuleSentence(key, rules), `${key} ${o.label}`).not.toMatch(/has not/);
      }
    }
  });

  it('reads an amount-valued key in the group\'s money', () => {
    const rules = { ...EMPTY_TABLE_RULES, buyIn: { min: money(500), max: money(1_500) } };
    expect(tableRuleValue('buyIn', rules, '€')).toBe('€500 – €1,500');
    expect(tableRuleSentence('buyIn', rules)).toBe('Your group buys in for $500 – $1,500.');
    const fixed = { ...EMPTY_TABLE_RULES, rebuyCap: { kind: 'fixed', amount: money(1_000) } as const };
    expect(tableRuleValue('rebuyCap', fixed)).toBe('Up to $1,000');
  });

  it('substitutes placeholders and leaves unknown ones alone', () => {
    const rules = { ...EMPTY_TABLE_RULES, goingSouth: 'forbidden' as const };
    expect(resolveAnswer('Rule: {{rule.goingSouth}}', rules)).toBe(
      "Rule: Your group's rule: chips never leave the table until you do.",
    );
    expect(resolveAnswer('{{rule.nonsense}}', rules)).toBe('{{rule.nonsense}}');
  });

  it('reads storage tolerantly', () => {
    expect(readTableRules(null)).toEqual(EMPTY_TABLE_RULES);
    expect(readTableRules('not json')).toEqual(EMPTY_TABLE_RULES);
    const read = readTableRules(
      JSON.stringify({
        goingSouth: 'forbidden',
        rebuyCap: { kind: 'largestStack', percent: 50 },
        credit: { kind: 'deadlineDays', days: 3 },
        buyIn: { min: 500, max: 1500 },
        straddle: 'sideways',
        futureKey: true,
      }),
    );
    expect(read.goingSouth).toBe('forbidden');
    expect(read.rebuyCap).toEqual({ kind: 'largestStack', percent: 50 });
    expect(read.credit).toEqual({ kind: 'deadlineDays', days: 3 });
    expect(read.buyIn).toEqual({ min: 500, max: 1500 });
    expect(read.straddle).toBeNull();
    expect('futureKey' in read).toBe(false);
    expect(tableRulesSetCount(read)).toBe(4);
  });

  it('compares option values by shape', () => {
    expect(sameTableRuleValue({ kind: 'largestStack', percent: 50 }, { kind: 'largestStack', percent: 50 })).toBe(true);
    expect(sameTableRuleValue({ kind: 'none' }, { kind: 'largestStack', percent: 50 })).toBe(false);
  });
});
