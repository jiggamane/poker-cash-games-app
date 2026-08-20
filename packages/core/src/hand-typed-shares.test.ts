/**
 * A share the host typed against a name, at the end of the night.
 *
 * The room settles the bill out loud — "Petr only got here at eleven, put him
 * down for fifty" — and no split anybody could write covers every one of those
 * conversations. `manualCharges` is the escape hatch, and the whole question a
 * test has to answer about it is what happens to the DIFFERENCE: the bar is
 * owed what the bar is owed, so a share taken off one person has to land on
 * somebody, and it must never land nowhere.
 *
 * The night below is the canonical one from `04-money-math.md` again, so every
 * figure here can be read against the untouched night in
 * `canonical-night.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { money, sum, type Money } from './money';
import { resolveLedger } from './ledger';
import { chargeCeiling, hasManualCharges, manualChargeOf, ruleTotal } from './overrides';
import { settle, SettlementError, type SettlementInput, type SettlementResult } from './settlement';
import { verifyNight } from './verify';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

const DANA = 'dana';
const MAREK = 'marek';
const LENA = 'lena';
const TOMAS = 'tomas';
const IVO = 'ivo';
const PETR = 'petr';
const KITTY = 'the-kitty';

const players: Player[] = [
  { id: DANA, name: 'Dana', atTable: true },
  { id: MAREK, name: 'Marek', atTable: true },
  { id: LENA, name: 'Lena', atTable: true },
  { id: TOMAS, name: 'Tomáš', atTable: true },
  { id: IVO, name: 'Ivo', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: KITTY, name: 'The piggy bank', atTable: false },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

const entries: LedgerEntry[] = [
  e({ type: 'buyin', playerId: LENA, amount: money(1000) }),
  e({ type: 'buyin', playerId: PETR, amount: money(500) }),
  e({ type: 'buyin', playerId: MAREK, amount: money(500) }),
  e({ type: 'buyin', playerId: IVO, amount: money(500) }),
  e({ type: 'buyin', playerId: DANA, amount: money(500) }),
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'rebuy', playerId: IVO, amount: money(500) }),
  e({ type: 'expense', payerId: MAREK, amount: money(120) }),
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'expense', payerId: LENA, amount: money(50) }),
  e({ type: 'buyin', playerId: TOMAS, amount: money(500) }),
  e({ type: 'cashout', playerId: DANA, amount: money(2120) }),
];

const finalCounts = new Map<PlayerId, Money>([
  [MAREK, money(960)],
  [LENA, money(1430)],
  [TOMAS, money(0)],
  [IVO, money(220)],
  [PETR, money(270)],
]);

const kittyRule: MoneyRule = {
  id: 'kitty', name: 'Group piggy bank', active: true,
  amountKind: 'percent', amount: money(5), basis: 'gross',
  charge: 'winners_only', destination: 'kitty', split: 'evenly',
  collectorPlayerId: KITTY, sortOrder: 1,
};

const billRule: MoneyRule = {
  id: 'bill', name: 'Kitchen & drinks', active: true,
  amountKind: 'fixed', amount: money(170), basis: 'gross',
  charge: 'winners_only', destination: 'bill', split: 'evenly',
  collectorPlayerId: MAREK, sortOrder: 2,
};

const share = (amounts: Array<[PlayerId, number]>) =>
  amounts.map(([playerId, amount]) => ({ playerId, amount: money(amount) }));

const night = (rules: MoneyRule[]): SettlementInput => ({
  players, entries, finalCounts, rules,
});

const charge = (r: SettlementResult, ruleId: string, id: PlayerId): Money =>
  (r.deductions.find((d) => d.ruleId === ruleId)?.charges.find((c) => c.playerId === id)?.amount ??
    0) as Money;
const took = (r: SettlementResult, ruleId: string): Money =>
  (r.deductions.find((d) => d.ruleId === ruleId)?.total ?? 0) as Money;
const position = (r: SettlementResult, id: PlayerId): Money =>
  r.players.find((p) => p.playerId === id)!.finalPosition;

/** Every identity the verifier knows, re-derived from the ledger. */
function holdsTogether(input: SettlementInput, r: SettlementResult): void {
  expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
  const verdict = verifyNight(input, r);
  expect(verdict.findings).toEqual([]);
  expect(verdict.ok).toBe(true);
}

// =============================================================================

describe('a bill share typed against one name', () => {
  const input = night([
    kittyRule,
    { ...billRule, manualCharges: share([[LENA, 20]]) },
  ]);
  const r = settle(input);

  it('charges that person exactly what was typed', () => {
    expect(charge(r, 'bill', LENA)).toBe(20); // was 56 on the even split
  });

  it('divides what is left between the people who were NOT named', () => {
    // 170 − 20 = 150, evenly between the two remaining winners.
    expect(charge(r, 'bill', DANA)).toBe(75);
    expect(charge(r, 'bill', MAREK)).toBe(75);
  });

  it('still puts the whole real bill on the table — the bar is owed $170', () => {
    expect(took(r, 'bill')).toBe(170);
    expect(sum(r.deductions.find((d) => d.ruleId === 'bill')!.charges.map((c) => c.amount))).toBe(170);
  });

  it('still pays back everybody who fronted money, to the dollar', () => {
    const bill = r.deductions.find((d) => d.ruleId === 'bill')!;
    expect(bill.credits.find((c) => c.playerId === MAREK)!.amount).toBe(120);
    expect(bill.credits.find((c) => c.playerId === LENA)!.amount).toBe(50);
  });

  it('leaves the night balanced and every identity intact', () => {
    holdsTogether(input, r);
  });
});

describe('a bill share typed for everybody', () => {
  it('is accepted when the amounts cover the bill exactly', () => {
    const input = night([
      { ...billRule, manualCharges: share([[DANA, 100], [MAREK, 50], [LENA, 20]]) },
    ]);
    const r = settle(input);
    expect(charge(r, 'bill', DANA)).toBe(100);
    expect(charge(r, 'bill', MAREK)).toBe(50);
    expect(charge(r, 'bill', LENA)).toBe(20);
    expect(took(r, 'bill')).toBe(170);
    holdsTogether(input, r);
  });

  it('refuses, naming the gap, when they do not', () => {
    const input = night([
      { ...billRule, manualCharges: share([[DANA, 100], [MAREK, 30], [LENA, 20]]) },
    ]);
    expect(() => settle(input)).toThrow(SettlementError);
    expect(() => settle(input)).toThrow(/leaves 20 of the 170 with nobody to carry it/);
  });

  it('refuses amounts that come to more than the bill', () => {
    const input = night([{ ...billRule, manualCharges: share([[DANA, 500]]) }]);
    expect(() => settle(input)).toThrow(/totalling 500, but only 170 needs covering/);
  });
});

describe('a share typed against somebody the rule would never have charged', () => {
  /*
   * Tomáš lost $500, so no split in the app puts a penny of the bill on him.
   * The host typing $40 against his name is the whole reason this exists: it is
   * a decision the room made, and the engine's job is to carry it, not to
   * second-guess it.
   */
  const input = night([{ ...billRule, manualCharges: share([[TOMAS, 40]]) }]);
  const r = settle(input);

  it('charges the loser what was typed', () => {
    expect(charge(r, 'bill', TOMAS)).toBe(40);
  });

  it('takes the rest off the winners, as before', () => {
    // 130 evenly between three winners: 44 / 43 / 43, biggest win first.
    expect(charge(r, 'bill', DANA)).toBe(44);
    expect(charge(r, 'bill', MAREK)).toBe(43);
    expect(charge(r, 'bill', LENA)).toBe(43);
    expect(took(r, 'bill')).toBe(170);
  });

  it('leaves the night balanced', () => {
    holdsTogether(input, r);
  });
});

describe('a piggy-bank share typed against a name', () => {
  /*
   * A PERCENTAGE HAS NO TOTAL TO PRESERVE. What it charges is what the
   * collector receives, so one changed figure changes the rule's total and
   * nobody else's share moves — which is the opposite of the bill, and is why
   * the two cases are written out separately rather than assumed alike.
   */
  const input = night([{ ...kittyRule, manualCharges: share([[LENA, 50], [TOMAS, 10]]) }, billRule]);
  const r = settle(input);

  it('charges the typed figures and leaves everybody else on the percentage', () => {
    expect(charge(r, 'kitty', DANA)).toBe(81); // 5% of 1,620, untouched
    expect(charge(r, 'kitty', MAREK)).toBe(23);
    expect(charge(r, 'kitty', LENA)).toBe(50); // was 22
    expect(charge(r, 'kitty', TOMAS)).toBe(10); // a loser, charged on purpose
  });

  it('moves the rule’s total, and the collector receives all of it', () => {
    expect(took(r, 'kitty')).toBe(164);
    const kitty = r.deductions.find((d) => d.ruleId === 'kitty')!;
    expect(kitty.credits).toEqual([{ playerId: KITTY, amount: 164 }]);
  });

  it('costs the named people exactly the difference and nobody else anything', () => {
    const plain = settle(night([kittyRule, billRule]));
    expect(position(plain, LENA) - position(r, LENA)).toBe(28); // 50 − 22
    expect(position(plain, TOMAS) - position(r, TOMAS)).toBe(10);
    expect(position(r, DANA)).toBe(position(plain, DANA));
    expect(position(r, PETR)).toBe(position(plain, PETR));
  });

  it('leaves the night balanced', () => {
    holdsTogether(input, r);
  });
});

describe('a typed share is louder than the rule it sits on', () => {
  it('charges somebody the group exempted for the night', () => {
    const input = night([
      { ...kittyRule, exemptPlayerIds: [LENA], manualCharges: share([[LENA, 15]]) },
    ]);
    const r = settle(input);
    expect(charge(r, 'kitty', LENA)).toBe(15);
    holdsTogether(input, r);
  });

  it('overrules one figure of a split the host had already typed by hand', () => {
    const input = night([
      {
        ...billRule,
        split: 'custom',
        customShares: share([[DANA, 120], [MAREK, 50]]),
        manualCharges: share([[DANA, 20]]),
      },
    ]);
    const r = settle(input);
    // Dana pays the 20 that was typed; the other 150 goes to the only person
    // left on the split, whose own typed figure is now his weight.
    expect(charge(r, 'bill', DANA)).toBe(20);
    expect(charge(r, 'bill', MAREK)).toBe(150);
    expect(took(r, 'bill')).toBe(170);
    holdsTogether(input, r);
  });

  it('leaves a custom split alone when nothing was typed over it', () => {
    const input = night([
      { ...billRule, split: 'custom', customShares: share([[DANA, 120], [MAREK, 50]]) },
    ]);
    const r = settle(input);
    expect(charge(r, 'bill', DANA)).toBe(120);
    expect(charge(r, 'bill', MAREK)).toBe(50);
  });
});

describe('a typed share of zero', () => {
  const input = night([{ ...billRule, manualCharges: share([[LENA, 0]]) }]);
  const r = settle(input);

  it('takes that person off the bill entirely', () => {
    expect(charge(r, 'bill', LENA)).toBe(0);
    expect(r.deductions.find((d) => d.ruleId === 'bill')!.charges.some((c) => c.playerId === LENA))
      .toBe(false);
  });

  it('puts their share on the others rather than losing it', () => {
    expect(charge(r, 'bill', DANA)).toBe(85);
    expect(charge(r, 'bill', MAREK)).toBe(85);
    expect(took(r, 'bill')).toBe(170);
    holdsTogether(input, r);
  });
});

describe('what the engine refuses', () => {
  it('a share for somebody who is not in the night', () => {
    const input = night([{ ...billRule, manualCharges: share([['nobody', 20]]) }]);
    expect(() => settle(input)).toThrow(/hand-typed share for nobody, who is not in the player list/);
  });

  it('a negative share, which would pay somebody for turning up', () => {
    const input = night([
      { ...billRule, manualCharges: [{ playerId: LENA, amount: -20 as Money }] },
    ]);
    expect(() => settle(input)).toThrow(/not a whole non-negative amount/);
  });

  it('a share on a rule that is switched off is simply ignored', () => {
    const input = night([{ ...billRule, active: false, manualCharges: share([['nobody', 20]]) }]);
    expect(() => settle(input)).not.toThrow();
  });
});

describe('a typed share and a rounding rule together', () => {
  /*
   * The two settings meet on the same rule, and the order matters: what the
   * host typed is an explicit answer and is charged to the dollar, and only
   * what is left over goes through the rounding.
   */
  const input: SettlementInput = {
    ...night([{ ...billRule, manualCharges: share([[LENA, 26]]) }]),
    roundingMode: 'tens',
  };
  const r = settle(input);

  it('charges the typed figure exactly, round or not', () => {
    expect(charge(r, 'bill', LENA)).toBe(26);
  });

  it('rounds only what is left, and still covers the bill', () => {
    // 144 between two winners, in tens: 70 / 70, and the odd 4 to the one
    // furthest from their exact share.
    expect(charge(r, 'bill', DANA) + charge(r, 'bill', MAREK)).toBe(144);
    expect(took(r, 'bill')).toBe(170);
    holdsTogether(input, r);
  });
});

describe('what a screen is allowed to ask before the host types anything', () => {
  /*
   * `chargeCeiling` is the same bound `settle()` enforces, stated in advance.
   * If the two ever drift, the sheet accepts a figure the night then refuses to
   * settle with — and nothing on either screen names which figure did it. So
   * the ceiling is asserted against the engine actually throwing, not against
   * a number written out by hand.
   */
  it('names the total a bill has to cover, and a fixed rule its own sum', () => {
    const ledger = resolveLedger(entries);
    expect(ruleTotal(billRule, ledger)).toBe(170);
    expect(ruleTotal({ ...kittyRule, amountKind: 'fixed', amount: money(300) }, ledger)).toBe(300);
  });

  it('says a percentage has no total, because it has none', () => {
    expect(ruleTotal(kittyRule, resolveLedger(entries))).toBeNull();
    expect(chargeCeiling(kittyRule, resolveLedger(entries), LENA)).toBeNull();
  });

  it('takes what other people were already set to off the ceiling', () => {
    const ledger = resolveLedger(entries);
    const rule = { ...billRule, manualCharges: share([[DANA, 100]]) };
    expect(chargeCeiling(rule, ledger, LENA)).toBe(70);
    // Their own figure is not counted against them — it is the one being replaced.
    expect(chargeCeiling(rule, ledger, DANA)).toBe(170);
  });

  it('is exactly the bound the engine enforces', () => {
    const ledger = resolveLedger(entries);
    const rule = { ...billRule, manualCharges: share([[DANA, 100]]) };
    const ceiling = chargeCeiling(rule, ledger, LENA)!;

    const withShare = (amount: number) =>
      night([{ ...rule, manualCharges: share([[DANA, 100], [LENA, amount]]) }]);

    expect(() => settle(withShare(ceiling))).not.toThrow();
    expect(() => settle(withShare(ceiling + 1))).toThrow(SettlementError);
  });

  it('reads back what one person was set to, and whether anybody was', () => {
    const rule = { ...billRule, manualCharges: share([[LENA, 20]]) };
    expect(manualChargeOf(rule, LENA)).toBe(20);
    expect(manualChargeOf(rule, DANA)).toBeUndefined();
    expect(hasManualCharges(rule)).toBe(true);
    expect(hasManualCharges(billRule)).toBe(false);
  });
});
