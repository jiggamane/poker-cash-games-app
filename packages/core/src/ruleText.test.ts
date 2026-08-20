import { describe, expect, it } from 'vitest';
import { money, type Money, type MoneyRule } from './index';
import { ruleDetail, ruleLabel, ruleTerms, splitSentence } from './ruleText';

const rule = (over: Partial<MoneyRule> = {}): MoneyRule => ({
  id: 'r1',
  name: 'Group piggy bank',
  active: true,
  amountKind: 'percent',
  amount: money(5),
  basis: 'gross',
  charge: 'winners_only',
  destination: 'kitty',
  split: 'by_percent',
  collectorPlayerId: '',
  sortOrder: 1,
  ...over,
});

/**
 * O4's row, and the reason it lives in core rather than on a screen: the same
 * sentence is read before a night opens, while it runs, and while it is being
 * settled, and the three had drifted apart once already.
 */
describe('ruleDetail — the line under a rule’s name', () => {
  it('says how much, who pays, and who ends up holding it, in that order', () => {
    expect(ruleDetail(rule({ collectorPlayerId: 'p-marek' }), { collectorName: 'Marek' })).toBe(
      '5% of win · winners, by size of win · Marek collects',
    );
  });

  it('holds it for the group when nobody is named', () => {
    expect(ruleDetail(rule())).toBe('5% of win · winners, by size of win · held by the group');
  });

  it('states a fixed sum as fixed', () => {
    expect(ruleDetail(rule({ amountKind: 'fixed', amount: money(170), split: 'evenly' }))).toBe(
      '$170 fixed · split by winners · held by the group',
    );
  });

  /*
   * A BILL'S AMOUNT IS THE SPENDING, so it states what has been spent rather
   * than a figure somebody typed — and it is paid back to whoever bought it,
   * never held.
   */
  it('states a bill as what has been spent so far', () => {
    expect(
      ruleDetail(rule({ destination: 'bill', amountKind: 'fixed', amount: money(0) }), {
        spent: money(170),
      }),
    ).toBe('$170 spent so far · winners, by size of win · paid back to whoever bought it');
  });

  it('says nothing has been spent before a night has begun', () => {
    expect(ruleDetail(rule({ destination: 'bill', amountKind: 'fixed' }))).toMatch(/^\$0 spent so far/);
  });

  it('names a flat charge on everyone, and a split done by hand', () => {
    expect(ruleDetail(rule({ amountKind: 'fixed', charge: 'everyone_flat', split: 'evenly' }))).toContain(
      'everyone at the table',
    );
    expect(ruleDetail(rule({ amountKind: 'fixed', split: 'custom' }))).toContain('split by hand');
  });

  /* The tail is what the engine has actually taken, and only when it can say. */
  it('appends tonight’s take only when there is one', () => {
    expect(ruleDetail(rule(), { taken: money(42) as Money })).toMatch(/· \$42 tonight$/);
    expect(ruleDetail(rule())).not.toContain('tonight');
  });

  /* A rule whose collector has left the roster must not print "undefined collects". */
  it('falls back to the group when the collector cannot be named', () => {
    expect(ruleDetail(rule({ collectorPlayerId: 'gone' }))).toContain('held by the group');
  });
});

/** The older half of this file, kept honest alongside the new one. */
describe('the terms a settled night carries on its face', () => {
  it('names each split the way the boards do', () => {
    expect(splitSentence('by_percent')).toBe('by size of win');
    expect(splitSentence('evenly')).toBe('evenly between the winners');
    expect(splitSentence('evenly', 'everyone_flat')).toBe('evenly across the table');
    expect(splitSentence('custom')).toBe('set by the host');
  });

  it('states a percentage rule by its percentage and a fixed one by its split', () => {
    expect(ruleTerms(rule())).toBe('5%');
    expect(ruleTerms(rule({ amountKind: 'fixed', split: 'evenly' }))).toBe(
      'evenly between the winners',
    );
  });

  it('puts the name in front of the terms', () => {
    expect(ruleLabel(rule({ name: 'Piggy bank' }))).toBe('Piggy bank · 5%');
  });
});
