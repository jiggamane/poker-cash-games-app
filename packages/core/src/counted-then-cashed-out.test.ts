/**
 * B85 — THE NIGHT THAT COULD NOT BE CLOSED.
 *
 * Six players, ₾31,000 in, photographed off a phone at 03:54 on 20 September.
 * Count up read `✓ Balanced · ₾31,000 in play`, `STILL TO COUNT · 0`. Pressing
 * *Next* landed on **Not yet**, whose copy says no rule can take its share
 * *"until every stack has been counted"* — on a night where every stack was
 * counted. Back to the count: balanced. Forward: not yet. The host could not
 * close the evening.
 *
 * WHAT HAD HAPPENED. Andro's stack was counted at ₾4,100 while he was still
 * seated, and eight minutes later he cashed out for that same ₾4,100. The count
 * stayed behind him in `finalCounts` — correctly, it is what the host typed and
 * nothing rewrites it — and from then on two halves of the app disagreed about
 * it. `balanceCheck` dropped it, because only a seated player's count is chips
 * on the table, and its own comment says so word for word. `reconcile` added
 * it, so the close gate saw the night ₾4,100 over and refused. `endedWith` added
 * it too, which would have paid Andro for a stack he had already taken.
 *
 * The rule is the handoff's own Q&A, 3d: a player who cashes out and later buys
 * back in ends the night holding what they cashed out PLUS what is in front of
 * them at the end. One stack, counted once, and only while they are holding it.
 *
 * THE NIGHT IS THE RECORD, NOT A FIXTURE. Every figure below is off the
 * screenshots, and the whole journey is walked in the order the host walked it
 * — counted, then cashed out, then Next — because the bug only exists in that
 * order. A rewrite of these entries would delete the evidence.
 */

import { describe, expect, it } from 'vitest';
import { balanceCheck } from './balance';
import { endedWith, reconcile, resolveLedger, seatedIn } from './ledger';
import { money, type Money } from './money';
import { settle } from './settlement';
import { verifyNight } from './verify';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

const LEVANI = 'levani';
const ANDRO = 'andro';
const OTO = 'oto';
const GEGA = 'gega';
const GOGA = 'goga';
const RATI = 'rati';

const players: Player[] = [
  { id: LEVANI, name: 'Levani', atTable: false },
  { id: ANDRO, name: 'Andro', atTable: false },
  { id: OTO, name: 'Oto', atTable: true },
  { id: GEGA, name: 'Gega', atTable: true },
  { id: GOGA, name: 'Goga', atTable: true },
  { id: RATI, name: 'Rati', atTable: true },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

/** ₾31,000 in over six buy-ins; two players have cashed out and gone. */
const entries: LedgerEntry[] = [
  e({ type: 'buyin', playerId: LEVANI, amount: money(3000) }),
  e({ type: 'buyin', playerId: ANDRO, amount: money(2000) }),
  e({ type: 'buyin', playerId: OTO, amount: money(3000) }),
  e({ type: 'buyin', playerId: GEGA, amount: money(6000) }),
  e({ type: 'buyin', playerId: GOGA, amount: money(9000) }),
  e({ type: 'buyin', playerId: RATI, amount: money(8000) }),
  /* 02:12 — Levani takes ₾7,800 and goes. */
  e({ type: 'cashout', playerId: LEVANI, amount: money(7800) }),
  /* 03:24 — and Andro, for the ₾4,100 the host had already counted at 03:16. */
  e({ type: 'cashout', playerId: ANDRO, amount: money(4100) }),
];

/**
 * What the host had typed by 03:54 — including Andro's stack, counted at 03:16
 * while he was still in his seat. THIS MAP IS THE EVIDENCE. It is what the
 * phone actually held, and every assertion below is about reading it correctly
 * rather than about tidying it up.
 */
const finalCounts = new Map<PlayerId, Money>([
  [ANDRO, money(4100)],
  [OTO, money(3600)],
  [GEGA, money(4700)],
  [GOGA, money(6750)],
  [RATI, money(4050)],
]);

const ledger = resolveLedger(entries);
/* Count up's own list: `lastBuy > lastOut`, which is `standingsOf`'s rule. */
const seated = [OTO, GEGA, GOGA, RATI];

describe('a stack counted and then cashed out is one stack', () => {
  it('leaves the player out of who is holding chips', () => {
    expect([...seatedIn(ledger)].sort()).toEqual([GEGA, GOGA, OTO, RATI]);
    expect(seatedIn(ledger).has(ANDRO)).toBe(false);
    expect(seatedIn(ledger).has(LEVANI)).toBe(false);
  });

  it('is not added to the count it has already been cashed out of', () => {
    const r = reconcile(ledger, finalCounts);

    // ₾31,000 in, ₾11,900 off: ₾19,100 in front of the four still playing.
    expect(r.chipsOnTable).toBe(19_100);
    expect(r.counted).toBe(19_100);
    expect(r.difference).toBe(0);
    expect(r.reconciled).toBe(true);
  });

  it('and gives Andro the one stack he actually took', () => {
    expect(endedWith(ledger, ANDRO, finalCounts)).toBe(4100);
    expect(endedWith(ledger, LEVANI, finalCounts)).toBe(7800);
    expect(endedWith(ledger, OTO, finalCounts)).toBe(3600);
  });
});

describe('the two screens that disagreed', () => {
  /*
   * `balance.ts` has claimed this identity in prose since it was written —
   * *"exactly `−reconcile().difference` … so the two cannot disagree about a
   * night"*. On this night they disagreed: Count up said balanced, the close
   * gate said ₾4,100 over. The claim is asserted here rather than described.
   */
  it('agree, which is what the block says about itself', () => {
    const b = balanceCheck(ledger, finalCounts, seated);
    const r = reconcile(ledger, finalCounts);

    /* `0 === -0` in JS and `toBe` uses Object.is, which says they differ. The
       identity is about the money, so it is asserted about the money. */
    expect(b.left === -r.difference).toBe(true);
    expect(b.left).toBe(0);
    expect(b.state).toBe('balanced');
    expect(r.reconciled).toBe(true);
  });

  it('and Count up reads what the phone read', () => {
    const b = balanceCheck(ledger, finalCounts, seated);

    expect(b.boughtIn).toBe(31_000);
    expect(b.accountedFor).toBe(31_000);
    expect(b.uncounted).toEqual([]);
    /* Six players in: four counted, two gone. */
    expect(b.playersIn).toBe(6);
    expect(b.countedPlayers).toBe(4);
    expect(b.cashedOutPlayers).toBe(2);
  });
});

describe('the night the host could not close', () => {
  const result = settle({
    players,
    entries,
    finalCounts,
    rules: [] as MoneyRule[],
    roundingMode: 'tens',
  });

  it('settles at all, which is the whole bug', () => {
    expect(result.reconciliation.reconciled).toBe(true);
  });

  it('pays everybody what the screen showed them', () => {
    const of = (id: PlayerId) => result.players.find((p) => p.playerId === id)!;

    /* No rules tonight, so the position IS the poker — the six figures Count
       up drew at 03:54, to the lari. */
    expect(of(LEVANI).finalPosition).toBe(4800);
    expect(of(ANDRO).finalPosition).toBe(2100);
    expect(of(OTO).finalPosition).toBe(600);
    expect(of(GEGA).finalPosition).toBe(-1300);
    expect(of(GOGA).finalPosition).toBe(-2250);
    expect(of(RATI).finalPosition).toBe(-3950);

    /* And Andro is paid for one stack. Before B85 he ended with ₾8,200 — his
       cash-out and the count of the same chips — and was ₾4,100 up on a night
       he finished ₾2,100 up. */
    expect(of(ANDRO).endedWith).toBe(4100);
    expect(of(ANDRO).grossResult).toBe(2100);
  });

  it('and the table comes to nothing, as a balanced night must', () => {
    const total = result.players.reduce((running, p) => running + p.finalPosition, 0);
    expect(total).toBe(0);
  });

  /*
   * THE VERIFIER HAS TO AGREE, and it re-derives every identity by its own
   * hand rather than asking the engine. If it kept the old sum, this night
   * would settle correctly and then be stored with a red *Did not check out*
   * band across it — the alarm crying wolf on the one night it was fixed for.
   */
  it('checks out under the verifier that re-derives it independently', () => {
    const verdict = verifyNight(
      { players, entries, finalCounts, rules: [] as MoneyRule[], roundingMode: 'tens' },
      result,
    );

    expect(verdict.findings.map((f) => f.code)).toEqual([]);
    expect(verdict.ok).toBe(true);
  });
});

describe('and the stack comes back when the player does', () => {
  /*
   * The other half of Q&A 3d, and the reason this is a seating rule rather than
   * a "has ever cashed out" rule: Andro sits back down for ₾1,000 and is
   * holding chips again, so the stack in front of him is the table's once more.
   */
  const back = resolveLedger([...entries, e({ type: 'rebuy', playerId: ANDRO, amount: money(1000) })]);
  const counts = new Map(finalCounts).set(ANDRO, money(1000));

  it('counts a returning player’s stack again', () => {
    expect(seatedIn(back).has(ANDRO)).toBe(true);
    expect(reconcile(back, counts).reconciled).toBe(true);
    /* His cash-out plus what is in front of him at the end — 3d, exactly. */
    expect(endedWith(back, ANDRO, counts)).toBe(5100);
  });
});
