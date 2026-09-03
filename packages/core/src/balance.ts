import type { ResolvedLedger } from './ledger';
import { subtract, sum, ZERO, type Money } from './money';
import type { PlayerId } from './types';

/**
 * The balance check behind E2 — the whole equation, not half of it.
 *
 * `reconcile()` answers "does the count match the chips still on the table",
 * which is the same arithmetic and a smaller sentence. It compares one figure
 * against one figure, and the two it hides are the two a host is actually
 * checking: everything that went ON the table, and everything that has come
 * off it or been counted on it. A screen built on the small sentence can read
 * DONE while a cash-out nobody entered is missing — the block said COUNTED
 * $2,880 of $2,880 and never named the $2,120 that walked out at 23:15.
 *
 * So this states it in full:
 *
 *     bought in  =  cashed out  +  counted   +  left
 *
 * `left` is the only unknown, it is drawn as a countdown while stacks are
 * still being entered, and it is the verdict once they are all in. It is
 * exactly `−reconcile().difference` — the same number the settlement gate is
 * computed from, derived here from the ledger rather than read off the gate,
 * so the two cannot disagree about a night.
 *
 * NOTHING HERE IS STORED. State is derived on every render, because a stored
 * verdict outlives the count it was a verdict about: editing a stack back down
 * has to withdraw the green in the same frame, and a flag written when the
 * sums first met would not.
 */
export interface BalanceCheck {
  /** Every buy-in and re-entry, all players, including those who have left. */
  boughtIn: Money;
  /** Every confirmed cash-out — money already off the table. */
  cashedOut: Money;
  /** Every stack counted for somebody still seated. */
  counted: Money;
  /** cashedOut + counted. */
  accountedFor: Money;
  /** boughtIn − accountedFor. Positive is short, negative is over. */
  left: Money;

  /** Buy-ins plus re-entries — entries, not people. */
  entries: number;
  /** Everybody who bought in at any point tonight. */
  playersTotal: number;
  /** Of those, the ones whose money is in: gone, or counted. */
  playersIn: number;
  /**
   * The two halves of `playersIn`, which is what the block's right-hand
   * sub-line names — `3 counted · 3 cashed out`.
   *
   * They are counts of PEOPLE where `counted` and `cashedOut` above are sums of
   * money, and the block draws one of each: the figure is the money and the
   * line under it is who it came from. A screen that worked these out itself
   * would be deciding again what "in" means, which is the decision the busted
   * player's $0 turns on.
   */
  countedPlayers: number;
  cashedOutPlayers: number;
  /** Seated players with no count entered. In the order they were given. */
  uncounted: PlayerId[];

  /**
   * Which of the three the block renders. Never stored, never two at once.
   *
   * `counting` while any stack is missing — even if the sums happen to meet at
   * this instant, which they can, and which is not a verdict about a night
   * that is not finished being counted.
   */
  state: 'counting' | 'balanced' | 'short' | 'over';
}

/**
 * Work the equation for one night.
 *
 * `seated` is who still has chips in front of them, which the ledger alone
 * cannot say — a player who cashed out and bought back in is seated, and the
 * money they took off earlier is accounted for regardless. The caller knows
 * this from the same standings the list below the block is built from, so it
 * is passed in rather than re-derived here into a second answer.
 */
export function balanceCheck(
  ledger: ResolvedLedger,
  finalCounts: ReadonlyMap<PlayerId, Money>,
  seated: readonly PlayerId[],
): BalanceCheck {
  const boughtIn = ledger.totalBoughtIn;
  const cashedOut = ledger.totalCashedOut;

  /*
   * Only a SEATED player's count is money on the table. A count left behind on
   * somebody who has since cashed out would be counted twice — once in their
   * cash-out and once here — and the block would read over by their stack.
   */
  const seatedSet = new Set(seated);
  const counted = sum(
    [...finalCounts].filter(([id]) => seatedSet.has(id)).map(([, amount]) => amount),
  );

  const accountedFor = sum([cashedOut, counted]);
  const left = subtract(boughtIn, accountedFor);

  const entries = ledger.entries.filter(
    (e) => !e.voided && (e.type === 'buyin' || e.type === 'rebuy'),
  ).length;

  /*
   * Everybody who put money on the table, which is not the same as everybody
   * on the roster: a collector who never sat down has no stack to count and
   * must not make "5 of 6 in" unreachable.
   */
  const played = [...ledger.boughtInByPlayer.keys()];
  const uncounted = seated.filter((id) => played.includes(id) && !finalCounts.has(id));

  /*
   * A count of $0 is a count. The busted player's stack is gone, they are in,
   * and `has` is what says so — a truthiness test here would leave them
   * uncounted forever and hold the night open on a stack that is not there.
   */
  const playersIn = played.filter((id) => !seatedSet.has(id) || finalCounts.has(id)).length;

  /* Somebody still seated whose stack has been entered, against somebody who
     left during play. The two are exclusive and together they are `playersIn`:
     a seated player is counted or not, and a player who has gone is neither
     counted nor countable. */
  const countedPlayers = played.filter((id) => seatedSet.has(id) && finalCounts.has(id)).length;
  const cashedOutPlayers = played.filter((id) => !seatedSet.has(id)).length;

  return {
    boughtIn,
    cashedOut,
    counted,
    accountedFor,
    left,
    entries,
    playersTotal: played.length,
    playersIn,
    countedPlayers,
    cashedOutPlayers,
    uncounted,
    state:
      uncounted.length > 0 ? 'counting' : left === ZERO ? 'balanced' : left > 0 ? 'short' : 'over',
  };
}

/**
 * What the night has done to one person so far, before anything comes off it.
 *
 * `05-active-vs-settled.md`, cut 1 September. It is the figure a settled row
 * prints on the two screens that show a player list while the night is still
 * open, and the two screens read it off different halves of the same equation:
 *
 *     Tonight    result = cashedOut − boughtIn      they have left the table
 *     E2         result = counted   − boughtIn      their stack has been counted
 *
 * ONE FUNCTION FOR BOTH, because it is one fact — what came back, less what
 * went in — and the difference between the screens is only which figure is
 * available to stand for "what came back". Two subtractions written out on two
 * screens is exactly the second untested implementation `CLAUDE.md` is about,
 * and Tonight had one of them inline until now.
 *
 * NOTHING HAS BEEN APPLIED TO IT. Not the bill, not the piggy bank, and not
 * the rounding step — the doc says so in as many words, and it is why the
 * group header has to read RESULT BEFORE DEDUCTIONS rather than *result*. The
 * deductions land on E3 and the whole formula lands on E6.
 *
 * THE RAW COUNT, THEN, AND NOT THE ROUNDED ONE on E2. A settled row states its
 * own derivation underneath — `in $500 · counted $965` — and a figure the two
 * halves of that line do not produce is a figure a host cannot check against
 * the stack in front of them. What the night will actually settle that stack
 * at is the step's business, and the step is stated on the bar directly above
 * this list.
 */
export function resultBeforeDeductions(boughtIn: Money, back: Money): Money {
  return subtract(back, boughtIn);
}

/**
 * The sub-line under ACCOUNTED FOR: what the figure is made of.
 *
 * NEVER A $0 TERM. "$0 cashed out · $2,880 counted" reads as a night where
 * somebody cashed out for nothing rather than one where nobody has left, and
 * the whole job of this line is to say where the money came from.
 */
export function composition(
  b: Pick<BalanceCheck, 'cashedOut' | 'counted'>,
  formatMoney: (amount: Money) => string,
): string {
  const parts: string[] = [];
  if (b.cashedOut !== ZERO) parts.push(`${formatMoney(b.cashedOut)} cashed out`);
  if (b.counted !== ZERO) parts.push(`${formatMoney(b.counted)} counted`);
  return parts.join(' · ');
}
