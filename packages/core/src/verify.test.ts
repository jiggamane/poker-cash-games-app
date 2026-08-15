import { describe, expect, it } from 'vitest';
import { money, type Money } from './money';
import { settle, type SettlementInput, type SettlementResult } from './settlement';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';
import { summarise, toStored, verifyNight } from './verify';

/**
 * Testing the thing that tests every night.
 *
 * A verifier that passes everything is worse than none: it reports 0% broken
 * for ever and nobody looks again. So most of what follows takes a night the
 * engine settled correctly, breaks ONE figure in the stored result, and asserts
 * the verifier names exactly that. If a mutation ever stops being caught, the
 * verifier has a blind spot and this file says which.
 *
 * The mutations are the shapes real corruption takes: a figure altered after
 * freezing, a transfer that does not clear what it claims to, a deduction that
 * takes more than it pays out, a record from an older algorithm.
 */

const A = 'pa';
const B = 'pb';
const C = 'pc';
const KITTY = 'kitty';

const players: Player[] = [
  { id: A, name: 'Ada', atTable: true },
  { id: B, name: 'Ben', atTable: true },
  { id: C, name: 'Cyd', atTable: true },
  { id: KITTY, name: 'The kitty', atTable: false },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

function night(): SettlementInput {
  seq = 0;
  return {
    players,
    entries: [
      e({ type: 'buyin', playerId: A, amount: money(1000) }),
      e({ type: 'buyin', playerId: B, amount: money(1000) }),
      e({ type: 'buyin', playerId: C, amount: money(1000) }),
      e({ type: 'rebuy', playerId: B, amount: money(500) }),
      e({ type: 'expense', payerId: C, amount: money(200) }),
    ],
    finalCounts: new Map<PlayerId, Money>([
      [A, money(2000)],
      [B, money(500)],
      [C, money(1000)],
    ]),
    rules: [
      {
        id: 'r-kitty',
        name: 'Group kitty',
        active: true,
        amountKind: 'percent',
        amount: money(5),
        basis: 'gross',
        charge: 'winners_only',
        destination: 'kitty',
        split: 'evenly',
        collectorPlayerId: KITTY,
        sortOrder: 1,
      } satisfies MoneyRule,
      {
        id: 'r-bill',
        name: 'Food & drinks',
        active: true,
        amountKind: 'fixed',
        amount: money(0),
        basis: 'gross',
        charge: 'everyone_flat',
        destination: 'bill',
        split: 'evenly',
        collectorPlayerId: C,
        sortOrder: 2,
      } satisfies MoneyRule,
    ],
  };
}

/** A deep copy, so a mutation cannot leak into the next test. */
const copy = (r: SettlementResult): SettlementResult => JSON.parse(JSON.stringify(r));

/** Break one thing and return the codes the verifier reported. */
function codesAfter(mutate: (r: SettlementResult) => void): string[] {
  const input = night();
  const broken = copy(settle(input));
  mutate(broken);
  return verifyNight(input, broken).findings.map((f) => f.code);
}

describe('a night that is actually right', () => {
  it('passes, and says how much it checked', () => {
    const input = night();
    const v = verifyNight(input, settle(input));

    expect(v.ok).toBe(true);
    expect(v.findings).toEqual([]);
    // The count is the guard against a verifier that quietly stops verifying:
    // "OK" alone cannot be told apart from "ran nothing".
    expect(v.checked).toBeGreaterThan(30);
    expect(summarise(v)).toMatch(/^OK · \d+ checks$/);
  });

  it('passes on a night that took nothing off the table', () => {
    const input = { ...night(), rules: [] };
    expect(verifyNight(input, settle(input)).ok).toBe(true);
  });

  it('passes on a night where nobody won or lost anything', () => {
    const input: SettlementInput = {
      players: [players[0], players[1]],
      entries: [
        { id: 'x1', seq: 1, type: 'buyin', playerId: A, amount: money(500) },
        { id: 'x2', seq: 2, type: 'buyin', playerId: B, amount: money(500) },
      ],
      finalCounts: new Map<PlayerId, Money>([
        [A, money(500)],
        [B, money(500)],
      ]),
      rules: [],
    };

    const v = verifyNight(input, settle(input));
    expect(v.ok).toBe(true);
    expect(settle(input).transfers).toEqual([]);
  });
});

describe('a figure altered after the night was frozen', () => {
  it('catches a position that no longer follows from the gross', () => {
    expect(codesAfter((r) => {
      r.players[0].finalPosition = money(r.players[0].finalPosition + 1);
    })).toContain('player.position');
  });

  it('catches positions that no longer sum to zero', () => {
    // The one that matters most: somebody would be paying money nobody is owed.
    expect(codesAfter((r) => {
      r.players[0].finalPosition = money(r.players[0].finalPosition + 100);
      r.players[0].grossResult = money(r.players[0].grossResult + 100);
    })).toContain('night.zeroSum');
  });

  it('catches a buy-in that disagrees with the ledger', () => {
    expect(codesAfter((r) => {
      r.players[0].boughtIn = money(999);
    })).toContain('player.boughtIn');
  });

  it('catches an ended-with that disagrees with the count', () => {
    expect(codesAfter((r) => {
      r.players[0].endedWith = money(1);
    })).toContain('player.endedWith');
  });

  it('catches a charge on a player that no deduction accounts for', () => {
    expect(codesAfter((r) => {
      r.players[0].charged = money(r.players[0].charged + 50);
    })).toContain('player.charged');
  });

  it('catches a credit nobody paid in', () => {
    expect(codesAfter((r) => {
      r.players[0].credited = money(r.players[0].credited + 50);
    })).toContain('player.credited');
  });

  it('catches a total off the table that is not the sum of the deductions', () => {
    expect(codesAfter((r) => {
      r.totalOffTable = money(r.totalOffTable + 1);
    })).toContain('night.offTable');
  });

  it('catches a fractional figure', () => {
    expect(codesAfter((r) => {
      r.players[0].finalPosition = (r.players[0].finalPosition + 0.5) as Money;
    })).toContain('player.integer');
  });
});

describe('a deduction that does not move money, but loses it', () => {
  it('catches one that took more than it charged', () => {
    expect(codesAfter((r) => {
      r.deductions[0].total = money(r.deductions[0].total + 10);
    })).toContain('deduction.charges');
  });

  it('catches one that paid out less than it took', () => {
    expect(codesAfter((r) => {
      r.deductions[0].credits[0].amount = money(r.deductions[0].credits[0].amount - 5);
    })).toContain('deduction.credits');
  });
});

describe('payments that do not settle the night', () => {
  it('catches a transfer that leaves somebody short', () => {
    expect(codesAfter((r) => {
      r.transfers[0].amount = money(r.transfers[0].amount - 1);
    })).toContain('transfer.unsettled');
  });

  it('catches an invented payment', () => {
    const codes = codesAfter((r) => {
      r.transfers.push({ fromPlayerId: A, toPlayerId: B, amount: money(25) });
    });
    expect(codes).toContain('transfer.unsettled');
  });

  it('catches a payment to oneself', () => {
    expect(codesAfter((r) => {
      r.transfers.push({ fromPlayerId: A, toPlayerId: A, amount: money(10) });
    })).toContain('transfer.self');
  });

  it('catches a payment of nothing', () => {
    expect(codesAfter((r) => {
      r.transfers.push({ fromPlayerId: A, toPlayerId: B, amount: money(0) });
    })).toContain('transfer.amount');
  });

  it('catches a payment involving somebody who is not in the night', () => {
    expect(codesAfter((r) => {
      r.transfers.push({ fromPlayerId: 'ghost', toPlayerId: A, amount: money(10) });
    })).toContain('transfer.stranger');
  });

  it('catches a list longer than the room needs', () => {
    // Two payments that cancel out: everybody still ends up square, so every
    // other check passes and only the count notices.
    expect(codesAfter((r) => {
      r.transfers.push({ fromPlayerId: A, toPlayerId: B, amount: money(10) });
      r.transfers.push({ fromPlayerId: B, toPlayerId: A, amount: money(10) });
    })).toContain('transfer.count');
  });
});

describe('the count against the table', () => {
  it('catches a reconciliation that disagrees with the ledger', () => {
    expect(codesAfter((r) => {
      r.reconciliation.chipsOnTable = money(r.reconciliation.chipsOnTable + 100);
    })).toContain('recon.onTable');
  });

  it('catches a difference that is not counted less on-table', () => {
    expect(codesAfter((r) => {
      r.reconciliation.difference = money(50);
    })).toContain('recon.difference');
  });

  it('catches a night marked reconciled that is not', () => {
    expect(codesAfter((r) => {
      r.reconciliation.reconciled = false;
    })).toContain('recon.flag');
  });

  it('accepts a night closed over a confirmed shortfall', () => {
    const input: SettlementInput = {
      ...night(),
      // 200 of the chips are gone. The host says so, and takes it themselves.
      finalCounts: new Map<PlayerId, Money>([
        [A, money(2000)],
        [B, money(500)],
        [C, money(800)],
      ]),
      acknowledgedDiscrepancy: {
        amount: money(-200),
        confirmedByUserId: 'host',
        confirmedAt: '2026-08-13T23:00:00.000Z',
        note: 'Two hundred short after the recount.',
      },
    };

    const v = verifyNight(input, settle(input));
    expect(v.ok).toBe(true);
    expect(v.findings).toEqual([]);
  });

  it('catches a confirmation for the wrong amount', () => {
    const input: SettlementInput = {
      ...night(),
      finalCounts: new Map<PlayerId, Money>([
        [A, money(2000)],
        [B, money(500)],
        [C, money(800)],
      ]),
      acknowledgedDiscrepancy: {
        amount: money(-200),
        confirmedByUserId: 'host',
        confirmedAt: '2026-08-13T23:00:00.000Z',
      },
    };

    const broken = copy(settle(input));
    broken.acknowledgedDiscrepancy = { ...broken.acknowledgedDiscrepancy!, amount: money(-999) };

    expect(verifyNight(input, broken).findings.map((f) => f.code)).toContain('recon.ack.amount');
  });
});

describe('the ledger the night was built from', () => {
  it('catches two entries sharing a seq', () => {
    const input = night();
    const entries = [...input.entries];
    entries[1] = { ...entries[1], seq: entries[0].seq };

    const v = verifyNight({ ...input, entries }, settle(input));
    expect(v.findings.map((f) => f.code)).toContain('entry.seq.duplicate');
  });

  it('catches a correction pointing at nothing', () => {
    const input = night();
    const entries = [
      ...input.entries,
      {
        id: 'ghost-correction',
        seq: 99,
        type: 'correction' as const,
        correctsEntryId: 'no-such-entry',
        amount: money(10),
      },
    ];

    const v = verifyNight({ ...input, entries }, settle(input));
    expect(v.findings.map((f) => f.code)).toContain('entry.correction.dangling');
  });

  it('catches a count for somebody who is not in the night', () => {
    const input = night();
    const finalCounts = new Map(input.finalCounts);
    finalCounts.set('ghost', money(100));

    const v = verifyNight({ ...input, finalCounts }, settle(input));
    expect(v.findings.map((f) => f.code)).toContain('count.player.unknown');
  });

  /*
   * A spend covered by the kitty or by nobody yet has no payer, and that is
   * legal — S58 and the `covered_by` column. The verifier used to demand a
   * payer on every expense, which raised the settled screen's red "do not
   * settle up from this screen" banner on nights that were entirely correct.
   * A verifier that cries wolf is the failure mode `docs/verification.md`
   * warns about, so both covers are asserted to pass.
   */
  it.each(['kitty', 'unpaid'] as const)('passes a spend covered by %s', (coveredBy) => {
    const input = night();
    const entries = [
      ...input.entries,
      e({ type: 'expense', coveredBy, amount: money(60) }),
    ];

    const v = verifyNight({ ...input, entries }, settle({ ...input, entries }));
    expect(v.findings.map((f) => f.code)).not.toContain('entry.payer.missing');
    expect(v.ok).toBe(true);
  });

  it('still catches a spend that says nothing about who covered it', () => {
    const input = night();
    const entries = [...input.entries];
    // Strip the payer without naming a cover — the shape the check exists for.
    entries[4] = { id: 'e5', seq: 5, type: 'expense', amount: money(200) };

    const v = verifyNight({ ...input, entries }, settle(input));
    expect(v.findings.map((f) => f.code)).toContain('entry.payer.missing');
  });

  it('catches a spend that names a payer AND a cover', () => {
    const input = night();
    const entries = [...input.entries];
    entries[4] = { ...entries[4], coveredBy: 'kitty' };

    const v = verifyNight({ ...input, entries }, settle(input));
    expect(v.findings.map((f) => f.code)).toContain('entry.payer.ambiguous');
  });

  it('catches a spend fronted by somebody who is not in the night', () => {
    const input = night();
    const entries = [...input.entries];
    entries[4] = { ...entries[4], payerId: 'ghost' };

    const v = verifyNight({ ...input, entries }, settle(input));
    expect(v.findings.map((f) => f.code)).toContain('entry.payer.unknown');
  });
});

describe('a record from another algorithm', () => {
  it('names the version rather than reporting a broken calculation', () => {
    const codes = codesAfter((r) => {
      r.algorithmVersion = 'settlement-v0';
    });

    expect(codes).toContain('night.version');
    // And NOT drift: a night settled by an older algorithm is supposed to
    // differ. Reporting that as broken arithmetic would bury the real ones.
    expect(codes).not.toContain('night.drift');
  });

  it('catches a stored night that no longer reproduces', () => {
    // What a real drift looks like: the record says one thing, re-running the
    // same ledger through the same version says another.
    const codes = codesAfter((r) => {
      r.transfers = [];
      for (const p of r.players) p.finalPosition = money(0);
      for (const p of r.players) p.grossResult = money(p.charged - p.credited);
    });

    expect(codes).toContain('night.drift');
  });
});

describe('what gets stored beside the night', () => {
  it('keeps the codes and the detail, and when it was checked', () => {
    const input = night();
    const broken = copy(settle(input));
    broken.players[0].finalPosition = money(broken.players[0].finalPosition + 1);

    const stored = toStored(verifyNight(input, broken), '2026-08-13T23:00:00.000Z');

    expect(stored.ok).toBe(false);
    expect(stored.codes).toContain('player.position');
    // One tampered figure breaks four identities at once, and all four are
    // kept: reading only the first would say "a position is wrong" and hide
    // that the night no longer balances and the payments no longer clear it.
    expect(stored.codes).toEqual(
      expect.arrayContaining(['player.position', 'night.zeroSum', 'transfer.unsettled', 'night.drift']),
    );
    expect(stored.detail.join(' ')).toContain(broken.players[0].name);
    expect(stored.at).toBe('2026-08-13T23:00:00.000Z');
  });

  it('records a pass with its check count', () => {
    const input = night();
    const stored = toStored(verifyNight(input, settle(input)), '2026-08-13T23:00:00.000Z');

    expect(stored.ok).toBe(true);
    expect(stored.codes).toEqual([]);
    expect(stored.checked).toBeGreaterThan(30);
  });
});
