/**
 * How the table is run — the group's parameters that a rules answer reads.
 *
 * `docs/rulings.md` § 5. These sit BESIDE `MoneyRule`, not inside it: a money
 * rule is what comes off the table at settle-up and is summed; a table rule is
 * how the game is played and is only ever read out. Nothing here does
 * arithmetic — the three calculators in `calculators.ts` do, and they are the
 * only place a table rule meets a figure.
 *
 * NULL MEANS THE GROUP HAS NEVER SAID. That is a different thing from playing
 * at a default, and the difference is the whole point: an answer that reads a
 * null says so out loud ("Your group has not set a cap…") so a host knows the
 * ruling is the library's and not theirs. The research's one hard number on
 * these parameters is a 60-vote poll on the rebuy cap with no majority, which
 * is why there is no app default to fall back on.
 *
 * Nothing in this file names a person. `docs/rulings.md` § 1 item 9: the
 * library never says who decides.
 */

import { formatMoney, money, type Money } from '../money';

export type RebuyCap =
  | { kind: 'none' }
  | { kind: 'largestStack'; percent: 50 | 75 | 100 }
  | { kind: 'fixed'; amount: Money };

export type Credit = { kind: 'none' } | { kind: 'deadlineDays'; days: number };

export interface TableRules {
  /** The range a player may buy in for. Null reads the group's standard buy-in. */
  buyIn: { min: Money; max: Money } | null;
  /** Robert's Rules: one short buy a session is the usual rule. */
  shortBuy: 'one' | 'none' | 'any' | null;
  rebuyCap: RebuyCap | null;
  /** Chips off the table mid-session. */
  goingSouth: 'forbidden' | 'allowed' | null;
  leaveNotice: 'none' | 'oneOrbit' | 'thirtyMinutes' | 'oneHour' | null;
  /** Robert's Rules: back within an hour, at the amount removed. */
  returnWithin: 'oneHour' | 'never' | null;
  runItTwice: 'byAgreement' | 'never' | null;
  chops: 'allowed' | 'never' | null;
  straddle: 'none' | 'underTheGun' | 'button' | 'any' | null;
  button: 'dead' | 'moving' | null;
  rabbitHunt: 'allowed' | 'never' | null;
  checkRaise: 'allowed' | 'never' | null;
  /** Who carries a bank that comes up short at the count. */
  shortBank: 'hostAbsorbs' | 'splitAll' | 'splitLosers' | 'decideThen' | null;
  credit: Credit | null;
}

export type TableRuleKey = keyof TableRules;

export const EMPTY_TABLE_RULES: TableRules = {
  buyIn: null,
  shortBuy: null,
  rebuyCap: null,
  goingSouth: null,
  leaveNotice: null,
  returnWithin: null,
  runItTwice: null,
  chops: null,
  straddle: null,
  button: null,
  rabbitHunt: null,
  checkRaise: null,
  shortBank: null,
  credit: null,
};

/** The order the Table rules sheet and the printable list them in. */
export const TABLE_RULE_KEYS: readonly TableRuleKey[] = [
  'buyIn',
  'shortBuy',
  'rebuyCap',
  'goingSouth',
  'leaveNotice',
  'returnWithin',
  'runItTwice',
  'chops',
  'straddle',
  'button',
  'rabbitHunt',
  'checkRaise',
  'shortBank',
  'credit',
];

/** The row label. ⚠ UNSURE — no board draws any of these. */
export function tableRuleLabel(key: TableRuleKey): string {
  switch (key) {
    case 'buyIn':
      return 'Buy-in';
    case 'shortBuy':
      return 'Short buy';
    case 'rebuyCap':
      return 'Rebuy cap';
    case 'goingSouth':
      return 'Going south';
    case 'leaveNotice':
      return 'Notice before leaving';
    case 'returnWithin':
      return 'Coming back';
    case 'runItTwice':
      return 'Run it twice';
    case 'chops':
      return 'Chopping';
    case 'straddle':
      return 'Straddle';
    case 'button':
      return 'The button';
    case 'rabbitHunt':
      return 'Rabbit hunting';
    case 'checkRaise':
      return 'Check-raise';
    case 'shortBank':
      return 'Short bank';
    case 'credit':
      return 'Credit';
  }
}

/**
 * The choices the editor offers for a key, in the order it offers them. Keys
 * whose value is an amount (`buyIn`, a fixed rebuy cap) are not edited by
 * choice and have no entry; the editor shows them read-only until a keypad
 * step exists.
 */
export interface TableRuleOption {
  value: unknown;
  label: string;
}

export function tableRuleOptions(key: TableRuleKey): readonly TableRuleOption[] {
  switch (key) {
    case 'shortBuy':
      return [
        { value: 'one', label: 'One a session' },
        { value: 'none', label: 'Never' },
        { value: 'any', label: 'Any time' },
      ];
    case 'rebuyCap':
      return [
        { value: { kind: 'none' }, label: 'No cap' },
        { value: { kind: 'largestStack', percent: 50 }, label: 'Half the biggest stack' },
        { value: { kind: 'largestStack', percent: 75 }, label: 'Three quarters of it' },
        { value: { kind: 'largestStack', percent: 100 }, label: 'Match the biggest stack' },
      ];
    case 'goingSouth':
      return [
        { value: 'forbidden', label: 'Never' },
        { value: 'allowed', label: 'Allowed' },
      ];
    case 'leaveNotice':
      return [
        { value: 'none', label: 'None' },
        { value: 'oneOrbit', label: 'One orbit' },
        { value: 'thirtyMinutes', label: 'Thirty minutes' },
        { value: 'oneHour', label: 'One hour' },
      ];
    case 'returnWithin':
      return [
        { value: 'oneHour', label: 'Within an hour, same stack' },
        { value: 'never', label: 'Not tonight' },
      ];
    case 'runItTwice':
      return [
        { value: 'byAgreement', label: 'By agreement' },
        { value: 'never', label: 'Never' },
      ];
    case 'chops':
      return [
        { value: 'allowed', label: 'Allowed' },
        { value: 'never', label: 'Never' },
      ];
    case 'straddle':
      return [
        { value: 'none', label: 'None' },
        { value: 'underTheGun', label: 'Under the gun' },
        { value: 'button', label: 'Button' },
        { value: 'any', label: 'Anyone' },
      ];
    case 'button':
      return [
        { value: 'dead', label: 'Dead button' },
        { value: 'moving', label: 'Moving button' },
      ];
    case 'rabbitHunt':
      return [
        { value: 'never', label: 'Never' },
        { value: 'allowed', label: 'Allowed' },
      ];
    case 'checkRaise':
      return [
        { value: 'allowed', label: 'Allowed' },
        { value: 'never', label: 'Never' },
      ];
    case 'shortBank':
      return [
        { value: 'hostAbsorbs', label: 'The host covers it' },
        { value: 'splitAll', label: 'Everyone splits it' },
        { value: 'splitLosers', label: 'The losers split it' },
        { value: 'decideThen', label: 'Decided on the night' },
      ];
    case 'credit':
      return [
        { value: { kind: 'none' }, label: 'None' },
        { value: { kind: 'deadlineDays', days: 3 }, label: 'Pay within 3 days' },
        { value: { kind: 'deadlineDays', days: 7 }, label: 'Pay within a week' },
      ];
    case 'buyIn':
      return [];
  }
}

/** Whether two option values are the same choice. Values are small and plain. */
export function sameTableRuleValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The short value for a row — "Half the biggest stack", "Never" — or null when
 * the group has not said. `symbol` is the group's own money.
 */
export function tableRuleValue(key: TableRuleKey, rules: TableRules, symbol = '$'): string | null {
  const v = rules[key];
  if (v === null) return null;
  if (key === 'buyIn') {
    const r = v as { min: Money; max: Money };
    return `${formatMoney(r.min, symbol)} – ${formatMoney(r.max, symbol)}`;
  }
  if (key === 'rebuyCap') {
    const cap = v as RebuyCap;
    if (cap.kind === 'fixed') return `Up to ${formatMoney(cap.amount, symbol)}`;
  }
  if (key === 'credit') {
    const c = v as Credit;
    if (c.kind === 'deadlineDays' && c.days !== 3 && c.days !== 7) return `Pay within ${c.days} days`;
  }
  const option = tableRuleOptions(key).find((o) => sameTableRuleValue(o.value, v));
  return option?.label ?? null;
}

/**
 * The sentence an answer reads when it binds a key: the group's own rule when
 * one is set, and an honest "not set" with the common default when not. These
 * are the `{{rule.key}}` placeholders in a situation's body.
 *
 * ⚠ Every sentence here is UNSURE copy, per `docs/rulings.md` § 10.
 */
export function tableRuleSentence(key: TableRuleKey, rules: TableRules, symbol = '$'): string {
  const value = tableRuleValue(key, rules, symbol);
  const v = rules[key];
  switch (key) {
    case 'buyIn':
      return value === null
        ? 'Your group has not set a range; the standard buy-in is the usual full buy.'
        : `Your group buys in for ${value}.`;
    case 'shortBuy':
      return v === null
        ? 'Your group has not set this. The usual rule is one short buy a session.'
        : v === 'one'
          ? 'Your group allows one short buy a session.'
          : v === 'none'
            ? 'Your group does not allow a short buy.'
            : 'Your group allows a short buy at any time.';
    case 'rebuyCap': {
      if (v === null)
        return 'Your group has not set a cap. Most groups cap at half the biggest stack; some allow a full match.';
      const cap = v as RebuyCap;
      if (cap.kind === 'none') return 'Your group sets no cap on a rebuy.';
      if (cap.kind === 'fixed') return `Your group caps a rebuy at ${formatMoney(cap.amount, symbol)}.`;
      return cap.percent === 100
        ? 'Your group caps a rebuy at the biggest stack on the table.'
        : cap.percent === 75
          ? 'Your group caps a rebuy at three quarters of the biggest stack.'
          : 'Your group caps a rebuy at half the biggest stack.';
    }
    case 'goingSouth':
      return v === null
        ? 'Your group has not said. The usual rule is never: chips stay on the table until you leave.'
        : v === 'forbidden'
          ? "Your group's rule: chips never leave the table until you do."
          : 'Your group allows taking chips off the table.';
    case 'leaveNotice':
      return v === null
        ? 'Your group has not set a notice. Many groups ask for an orbit.'
        : v === 'none'
          ? 'Your group asks no notice before leaving.'
          : `Your group asks for ${value?.toLowerCase()} before leaving.`;
    case 'returnWithin':
      return v === null
        ? "Your group has not said. Robert's Rules: back within an hour, with the stack you left with."
        : v === 'oneHour'
          ? 'Your group: come back within an hour with the stack you left with, or not tonight.'
          : 'Your group: once you have left, you are out for the night.';
    case 'runItTwice':
      return v === null
        ? 'Your group has not said. Where it is allowed, everyone in the pot has to agree.'
        : v === 'byAgreement'
          ? 'Your group runs it twice when everyone in the pot agrees.'
          : 'Your group never runs it twice.';
    case 'chops':
      return v === null
        ? 'Your group has not said whether blinds may be chopped.'
        : v === 'allowed'
          ? 'Your group allows chopping the blinds when both agree.'
          : 'Your group never chops.';
    case 'straddle':
      return v === null
        ? 'Your group has not said whether a straddle is allowed.'
        : v === 'none'
          ? 'Your group plays without straddles.'
          : v === 'underTheGun'
            ? 'Your group allows a straddle under the gun.'
            : v === 'button'
              ? 'Your group allows a button straddle.'
              : 'Your group allows a straddle from any seat.';
    case 'button':
      return v === null
        ? 'Your group has not said. Cardrooms use a dead button; many home games move it.'
        : v === 'dead'
          ? 'Your group plays a dead button.'
          : 'Your group moves the button.';
    case 'rabbitHunt':
      return v === null
        ? 'Your group has not said. The usual rule is never.'
        : v === 'never'
          ? 'Your group does not rabbit hunt.'
          : 'Your group allows a look at what would have come.';
    case 'checkRaise':
      return v === null
        ? 'Your group has not said; check-raising is allowed unless a group turns it off.'
        : v === 'allowed'
          ? 'Your group allows the check-raise.'
          : 'Your group has turned the check-raise off.';
    case 'shortBank':
      return v === null
        ? 'Your group has not decided. The common rule is that whoever ran the bank covers it; some groups split it.'
        : v === 'hostAbsorbs'
          ? "Your group's rule: the host covers a short bank."
          : v === 'splitAll'
            ? "Your group's rule: everyone at the table splits a short bank."
            : v === 'splitLosers'
              ? "Your group's rule: the losers split a short bank."
              : "Your group's rule: a short bank is decided on the night.";
    case 'credit': {
      if (v === null) return 'Your group has not said. The usual rule is no credit: settle before you leave.';
      const c = v as Credit;
      return c.kind === 'none'
        ? "Your group's rule: no credit, settle before you leave."
        : `Your group allows paying later, within ${c.days} days.`;
    }
  }
}

const PLACEHOLDER = /\{\{rule\.([a-zA-Z]+)\}\}/g;

/** The keys a body reads, in order of first appearance. */
export function boundKeys(body: string): TableRuleKey[] {
  const keys: TableRuleKey[] = [];
  for (const m of body.matchAll(PLACEHOLDER)) {
    const key = m[1] as TableRuleKey;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

export function isTableRuleKey(key: string): key is TableRuleKey {
  return (TABLE_RULE_KEYS as readonly string[]).includes(key);
}

/** A body with every `{{rule.key}}` replaced by the group's sentence. */
export function resolveAnswer(body: string, rules: TableRules, symbol = '$'): string {
  return body.replace(PLACEHOLDER, (whole, key: string) =>
    isTableRuleKey(key) ? tableRuleSentence(key, rules, symbol) : whole,
  );
}

/**
 * Table rules read back off storage. Tolerant: a key the phone has never
 * heard of is dropped and a missing one is null, so a newer edition's file
 * never breaks an older phone and an older phone's row never breaks a newer
 * edition.
 */
export function readTableRules(json: string | null | undefined): TableRules {
  if (json === null || json === undefined || json === '') return { ...EMPTY_TABLE_RULES };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ...EMPTY_TABLE_RULES };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY_TABLE_RULES };
  const out: TableRules = { ...EMPTY_TABLE_RULES };
  const src = parsed as Record<string, unknown>;
  for (const key of TABLE_RULE_KEYS) {
    const v = src[key];
    if (v === undefined || v === null) continue;
    if (key === 'buyIn') {
      const r = v as { min?: unknown; max?: unknown };
      if (typeof r.min === 'number' && typeof r.max === 'number') {
        out.buyIn = { min: money(r.min), max: money(r.max) };
      }
      continue;
    }
    if (key === 'rebuyCap') {
      const c = v as { kind?: unknown; percent?: unknown; amount?: unknown };
      if (c.kind === 'none') out.rebuyCap = { kind: 'none' };
      else if (c.kind === 'largestStack' && (c.percent === 50 || c.percent === 75 || c.percent === 100))
        out.rebuyCap = { kind: 'largestStack', percent: c.percent };
      else if (c.kind === 'fixed' && typeof c.amount === 'number')
        out.rebuyCap = { kind: 'fixed', amount: money(c.amount) };
      continue;
    }
    if (key === 'credit') {
      const c = v as { kind?: unknown; days?: unknown };
      if (c.kind === 'none') out.credit = { kind: 'none' };
      else if (c.kind === 'deadlineDays' && typeof c.days === 'number' && c.days > 0)
        out.credit = { kind: 'deadlineDays', days: c.days };
      continue;
    }
    if (tableRuleOptions(key).some((o) => o.value === v)) {
      (out as unknown as Record<string, unknown>)[key] = v;
    }
  }
  return out;
}

/** How many of the keys the group has set. The printable says "6 of 14 set". */
export function tableRulesSetCount(rules: TableRules): number {
  return TABLE_RULE_KEYS.filter((k) => rules[k] !== null).length;
}
