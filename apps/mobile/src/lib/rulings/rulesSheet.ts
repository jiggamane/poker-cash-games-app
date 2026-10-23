/**
 * The printable — the group's table rules as one page of plain text, for the
 * share sheet. `docs/rulings.md` § 3.2 and § 13 step 1: the research names a
 * one-page printable rules sheet as the one acquisition hook in this category
 * ("poker cash game house rules", "poker rules printable").
 *
 * Plain text through `Share.share`, the same road the invite and the nudge
 * take (`docs/sharing-formats.md` § 1). A set rule reads as the group's own;
 * an unset one is listed as not set, because a sheet that silently filled in
 * our defaults would be presenting them as the group's.
 */

import {
  RULES_EDITION,
  TABLE_RULE_KEYS,
  tableRuleLabel,
  tableRuleValue,
  tableRulesSetCount,
  type TableRules,
} from '@poker-club/core';

export function rulesSheetText(groupName: string, rules: TableRules, symbol: string): string {
  const lines = [`${groupName} — table rules`, ''];
  for (const key of TABLE_RULE_KEYS) {
    const value = tableRuleValue(key, rules, symbol);
    lines.push(`${tableRuleLabel(key)}: ${value ?? 'not set'}`);
  }
  const set = tableRulesSetCount(rules);
  lines.push('');
  lines.push(`${set} of ${TABLE_RULE_KEYS.length} set · The Poker Club, rules edition ${RULES_EDITION}`);
  return lines.join('\n');
}
