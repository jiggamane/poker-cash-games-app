import { describe, expect, it } from 'vitest';
import {
  COMMON_CURRENCIES,
  CURRENCIES,
  currencyFor,
  DEFAULT_CURRENCY,
  searchCurrencies,
} from './currencies';

/**
 * The list itself is data and cannot be wrong in an interesting way; what can
 * is the search, which is the only way most of these are reachable at all.
 */
describe('the list', () => {
  it('is ISO 4217 codes, three letters and no duplicates', () => {
    for (const c of CURRENCIES) expect(c.code).toMatch(/^[A-Z]{3}$/);
    expect(new Set(CURRENCIES.map((c) => c.code)).size).toBe(CURRENCIES.length);
  });

  it('names and symbols every one of them', () => {
    for (const c of CURRENCIES) {
      expect(c.name.length).toBeGreaterThan(1);
      expect(c.symbol.length).toBeGreaterThan(0);
    }
  });

  it('covers the world, not the four we happened to think of', () => {
    expect(CURRENCIES.length).toBeGreaterThan(150);
    for (const code of ['USD', 'EUR', 'GBP', 'CZK', 'JPY', 'ZAR', 'VND', 'NGN']) {
      expect(CURRENCIES.some((c) => c.code === code)).toBe(true);
    }
  });

  it('has the default in it', () => {
    expect(currencyFor(DEFAULT_CURRENCY).name).toBe('US Dollar');
  });

  it('names only real currencies as the common few', () => {
    // Two screens put these in front of somebody who has typed nothing — the
    // group sheet's chips and O1's picker. A code with a typo in it would show
    // as a chip called itself and set the book to money that does not exist.
    for (const code of COMMON_CURRENCIES) {
      expect(CURRENCIES.some((c) => c.code === code)).toBe(true);
    }
    expect(COMMON_CURRENCIES).toContain(DEFAULT_CURRENCY);
  });
});

describe('searching', () => {
  it('puts the exact code first', () => {
    expect(searchCurrencies('usd')[0]?.code).toBe('USD');
    expect(searchCurrencies('CZK')[0]?.code).toBe('CZK');
  });

  it('finds a currency by the name of the money', () => {
    expect(searchCurrencies('koruna').some((c) => c.code === 'CZK')).toBe(true);
    expect(searchCurrencies('yen')[0]?.code).toBe('JPY');
    expect(searchCurrencies('rand')[0]?.code).toBe('ZAR');
  });

  it('finds one by its symbol', () => {
    expect(searchCurrencies('€')[0]?.code).toBe('EUR');
    expect(searchCurrencies('Kč')[0]?.code).toBe('CZK');
  });

  it('answers a shared symbol with the currency somebody meant', () => {
    // £ is also the Falkland Islands pound, and F sorts before G; $ belongs to
    // a dozen countries. Both are still reachable by code.
    expect(searchCurrencies('£')[0]?.code).toBe('GBP');
    expect(searchCurrencies('$')[0]?.code).toBe('USD');
    expect(searchCurrencies('fkp')[0]?.code).toBe('FKP');
  });

  it('matches a word inside the name, not only the start', () => {
    expect(searchCurrencies('dinar').every((c) => c.name.toLowerCase().includes('dinar'))).toBe(
      true,
    );
    expect(searchCurrencies('dinar').length).toBeGreaterThan(1);
  });

  it('ranks a code prefix above a name that merely contains the letters', () => {
    // "CA" is the head of CAD, and also sits inside several names.
    expect(searchCurrencies('ca')[0]?.code).toBe('CAD');
  });

  it('is empty for a query that names nothing', () => {
    expect(searchCurrencies('zzzz')).toEqual([]);
  });

  it('never returns more than it was asked for', () => {
    expect(searchCurrencies('d').length).toBe(6);
    expect(searchCurrencies('d', 3).length).toBe(3);
    expect(searchCurrencies('', 4).length).toBe(4);
  });
});

describe('reading a stored code', () => {
  it('resolves a known one', () => {
    expect(currencyFor('czk')).toEqual({ code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' });
  });

  it('shows an unknown one as itself rather than as dollars', () => {
    expect(currencyFor('XYZ')).toEqual({ code: 'XYZ', name: 'XYZ', symbol: 'XYZ' });
  });
});
