/**
 * Money, written in the currency the group actually plays in.
 *
 * THE BUG THIS FIXES was a dollar sign on every figure in the app. A group
 * picks its currency when the group is made and can change it from the game's
 * own settings — `new-night.tsx` has the step, `setClubCurrency` writes it, the
 * settings screen reads it back — and until now exactly two screens looked at
 * the answer. Everywhere else called `formatMoney(amount)` and took the
 * default, so a club keeping its book in koruna settled up in dollars on
 * thirty-one screens.
 *
 * WHY THE FIX IS AN IMPORT AND NOT A HUNDRED AND FORTY ARGUMENTS. Every
 * formatter in `packages/core` has taken a currency symbol since it was
 * written; nothing ever passed one. Threading it through 141 call sites would
 * fix today's screens and lose the next one somebody adds, because the default
 * is what a call site gets for saying nothing. So the app imports its money
 * formatters from HERE instead, and here they have no default to fall back on:
 * the symbol is the book's, always, and a new call site is right by
 * construction.
 *
 * `moneyScreens.contract.test.ts` holds the other half — no screen may import
 * a formatter straight from core — because an import is exactly the kind of
 * thing that comes back one file at a time.
 *
 * WHY IT IS NOT IN CORE. `packages/core` is imported by the Supabase edge
 * functions, where one process settles other people's books; a module-level
 * "current currency" there would be a fact about the last night anybody
 * touched. It is pure and it stays pure. This file is the app, which has one
 * group open at a time, and the club store is the thing that knows which.
 */

import {
  formatCompact as coreCompact,
  formatMoney as coreMoney,
  formatSigned as coreSigned,
  formatSignedCompact as coreSignedCompact,
  formatSignedToFit as coreSignedToFit,
  formatToFit as coreToFit,
  roundingChoices as coreRoundingChoices,
  roundingRowLabel as coreRoundingRowLabel,
  roundingRowValue as coreRoundingRowValue,
  roundingSentence as coreRoundingSentence,
  rateLabel as coreRateLabel,
  ruleDetail as coreRuleDetail,
  ruleLabel as coreRuleLabel,
  ruleTerms as coreRuleTerms,
  stakesLabel as coreStakesLabel,
  stakesSummary as coreStakesSummary,
  straddleLabel as coreStraddleLabel,
  type Money,
  type RoundingMode,
  type Stakes,
} from '@poker-club/core';
import { useSyncExternalStore } from 'react';
import { currencyFor, DEFAULT_CURRENCY } from '../data/currencies';
import { currentClub, onClubChange } from './clubStore';

/**
 * The symbol every figure below is written with.
 *
 * READ AT CALL TIME, not captured. A book opened after the first render — the
 * root loads it from SQLite, which is a tick or two — would otherwise leave a
 * dollar sign on whatever drew first, and it would stay there until that screen
 * happened to re-render for some other reason.
 *
 * `currencyFor` falls back rather than throwing on a code this build does not
 * know: a book written in a currency added to ISO after this version shipped is
 * still a book, and its figures are still worth showing.
 */
export function moneySymbol(): string {
  return currencyFor(currentClub()?.currency ?? DEFAULT_CURRENCY).symbol;
}

/**
 * The same, for a component that must redraw when the group's currency changes.
 *
 * `Screen` and `Sheet` both call it, which is every screen in the app bar one —
 * so changing the currency repaints the figures behind the sheet that changed
 * it, rather than leaving them in the old one until somebody navigates.
 */
export function useMoneySymbol(): string {
  return useSyncExternalStore(onClubChange, moneySymbol, moneySymbol);
}

export const formatMoney = (amount: Money): string => coreMoney(amount, moneySymbol());
export const formatSigned = (amount: Money): string => coreSigned(amount, moneySymbol());
export const formatCompact = (amount: Money): string => coreCompact(amount, moneySymbol());
export const formatSignedCompact = (amount: Money): string =>
  coreSignedCompact(amount, moneySymbol());
/**
 * A LONGER SYMBOL ABBREVIATES EARLIER, and this is the only place that knows it.
 *
 * Every `exactBelow` threshold in this app was measured against a one-character
 * `$`. Two thirds of the ISO table is wider than that: `Kč` is two glyphs and
 * `CHF` is three, and a figure two glyphs wider is a figure that no longer fits
 * the column it was measured for. Measured at 360 with `CHF`, the buy-in on
 * Tonight ran 206 points into 163, both figures on Count up's block overflowed,
 * and `in CHF500 · out CHF2,120` wrapped to two lines on three screens.
 *
 * A glyph of symbol costs about what a digit costs, so each extra one moves the
 * threshold down a decade: `$` is unchanged, `Kč` abbreviates at a tenth of it,
 * `CHF` at a hundredth. That is one rule in one place rather than twenty
 * thresholds re-measured per currency — and a threshold nobody has to remember
 * to adjust when the next screen is written.
 *
 * NOTHING UNDER A THOUSAND IS TOUCHED by it: `formatCompact` returns small
 * amounts in full, so a lowered threshold cannot turn `CHF500` into anything
 * shorter or stranger. What it does is make `CHF2,120` read `CHF2.1k`, which is
 * exactly the trade every other `…ToFit` in this app already makes at a
 * different scale.
 */
function fitFor(exactBelow: number): number {
  const extra = Math.max(0, moneySymbol().length - 1);
  return extra === 0 ? exactBelow : exactBelow / 10 ** extra;
}

/*
 * AND AT THREE GLYPHS THE FIGURE GIVES ONE BACK. Abbreviating earlier is not
 * enough for a three-letter currency, because the compact form is not much
 * shorter than the exact one at four digits: `CHF4.5k` is seven glyphs where
 * `$4,500` is six, so the column is still worse off than it was measured for.
 * Dropping the decimal — `CHF5k`, five glyphs — is what actually buys the room
 * back, and it is the same trade `formatCompact` already makes above a hundred.
 */
const tight = (): boolean => moneySymbol().length >= 3;

export const formatToFit = (amount: Money, exactBelow: number): string =>
  Math.abs(amount) < fitFor(exactBelow)
    ? coreMoney(amount, moneySymbol())
    : coreCompact(amount, moneySymbol(), !tight());
export const formatSignedToFit = (amount: Money, exactBelow: number): string =>
  Math.abs(amount) < fitFor(exactBelow)
    ? coreSigned(amount, moneySymbol())
    : coreSignedCompact(amount, moneySymbol(), !tight());

/* The stakes, and the rounding step. Both are money written into a sentence
   rather than a figure in a column, and both have taken a symbol in core since
   they were written. */
export const stakesLabel = (stakes: Stakes): string => coreStakesLabel(stakes, moneySymbol());
export const straddleLabel = (stakes: Stakes): string | null =>
  coreStraddleLabel(stakes, moneySymbol());
export const stakesSummary = (stakes: Stakes): string => coreStakesSummary(stakes, moneySymbol());

/**
 * UNMARKED — a figure with no currency symbol at all.
 *
 * ⚠ THIS IS THE WORKING'S FORMAT NOW, AND NOT A NARROW COLUMN'S TRICK — the
 * owner's rule of 19 September: **a figure inside a calculation carries no
 * currency mark, and the figure it comes to carries one.** It started as two
 * narrow columns that named their currency once at the head — E3's preview grid
 * and E4's net chips, where the symbol repeated is what pushed the digits out
 * of the box — and it is the app's general rule for a working now.
 *
 * WHICH SIDE A FIGURE IS ON is decided by what it is, not by which screen it is
 * on. A TERM is unmarked: it is one step of a sum whose answer is beside it, and
 * the mark on it is six copies of a fact the answer already states. A TOTAL is
 * marked: the net beside a name, the figure on a block's head, a rule's take, an
 * amount somebody is to hand over — anything a person reads on its own, out of
 * the sum that produced it, and anything they would say out loud with the
 * currency in it. A figure in a SENTENCE keeps its mark too, because prose has
 * no column to name the currency at the head of.
 *
 * `docs/screens.md`, *A working is unmarked and its answer is not*, has the
 * ledger of which figure on which screen is which.
 *
 * ⚠ AND TWO SCREENS ARE OFF THE RULE ENTIRELY — E2 Count up and the player
 * card, by the owner's call of 20 September: both state their figures at 22 and
 * 28 points at the top of the screen, where a bare `15,400` reads as a quantity
 * of something rather than as money and there is no crowded line for the rule
 * to relieve. Per screen, not per figure, so their receipt rows are marked too.
 * `moneyScreens.contract.test.ts` holds it as an absence.
 *
 * It is a name of its own rather than an optional argument on the formatters
 * above. An override would put the default back — the thing this whole module
 * exists to take away — and "unmarked" is a decision somebody has to write
 * down, not a parameter they can forget.
 */
export const formatUnmarked = (amount: Money): string => coreMoney(amount, '');
export const formatSignedUnmarked = (amount: Money): string => coreSigned(amount, '');
export const formatCompactUnmarked = (amount: Money): string => coreCompact(amount, '');
export const formatSignedCompactUnmarked = (amount: Money): string =>
  coreSignedCompact(amount, '');

/**
 * THE SAME TWO, FOR A COLUMN THAT HAS A CEILING — every working line in the app
 * draws its terms through one of these.
 *
 * ⚠ AND THE THRESHOLD IS `exactBelow` ITSELF, NOT `fitFor`'s. That is the whole
 * point of the pair existing rather than a caller passing `''` somewhere: an
 * unmarked figure is the SAME WIDTH IN EVERY CURRENCY, so the decade `fitFor`
 * takes off for a `Kč` or a `CHF` would be a figure abbreviated to make room for
 * a symbol that is not there. `tight()` is out for the same reason — it buys a
 * glyph back from a three-letter mark, and there is no mark to buy it from.
 *
 * A working line is therefore the ONE place in this app where a Swiss club and
 * an American one read the same digits at the same width, which is also why the
 * currency pass has nothing to find on these figures.
 */
export const formatToFitUnmarked = (amount: Money, exactBelow: number): string =>
  Math.abs(amount) < exactBelow ? coreMoney(amount, '') : coreCompact(amount, '');
export const formatSignedToFitUnmarked = (amount: Money, exactBelow: number): string =>
  Math.abs(amount) < exactBelow ? coreSigned(amount, '') : coreSignedCompact(amount, '');

/** A rule's terms, with the group's money in them. */
export const ruleDetail = (
  rule: Parameters<typeof coreRuleDetail>[0],
  context: Omit<NonNullable<Parameters<typeof coreRuleDetail>[1]>, 'currencySymbol'> = {},
): string => coreRuleDetail(rule, { ...context, currencySymbol: moneySymbol() });

/**
 * What a rule charges, as a rate: "5%", "$10 each", "$5 an hour each".
 *
 * Here rather than straight from core for the reason the whole file exists — a
 * club keeping its book in koruna must not read "$5 an hour each" on its own
 * rules. `moneyScreens.contract.test.ts` holds every screen to importing it
 * from here.
 */
export const rateLabel = (rule: Parameters<typeof coreRateLabel>[0]): string =>
  coreRateLabel(rule, moneySymbol());

/** The rule's whole terms — the rate, the split where there is one, the cap. */
export const ruleTerms = (rule: Parameters<typeof coreRuleTerms>[0]): string =>
  coreRuleTerms(rule, moneySymbol());

/** "Bill · by size of win" — the terms with the rule's name in front. */
export const ruleLabel = (rule: Parameters<typeof coreRuleLabel>[0]): string =>
  coreRuleLabel(rule, moneySymbol());

export const roundingChoices = () => coreRoundingChoices(moneySymbol());
export const roundingRowLabel = (mode: RoundingMode | null | undefined): string =>
  coreRoundingRowLabel(mode, moneySymbol());
/* No symbol: the row's value no longer names the step, only what it applies
   to. The amount is on the label beside it, which does take one. */
export const roundingRowValue = (mode: RoundingMode | null | undefined): string =>
  coreRoundingRowValue(mode);
export const roundingSentence = (mode: RoundingMode | null | undefined): string =>
  coreRoundingSentence(mode, moneySymbol());
