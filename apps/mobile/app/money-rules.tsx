import { useMemo } from 'react';
import { router } from 'expo-router';
import { resolveLedger, ruleDetail, settle, type MoneyRule } from '@poker-club/core';
import { RoundingRow } from '../src/components/RoundingRow';
import { RuleList } from '../src/components/RuleList';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { StyleSheet, Text } from 'react-native';
import { space, type } from '../src/design/tokens';
import { nameOf, settlementInput, toggleRule, useNight } from '../src/lib/nightStore';

/**
 * Money rules — O4, tonight's level. Everything that takes money off the table
 * at settle-up.
 *
 * OPENED FROM THREE PLACES, which is the point of it: from the table admin
 * drawer while the night is running, from the deductions step and from settle-up
 * while the night is being counted. The fourth — before the table opens — is
 * the same list drawn inside the setup sheet, because a sheet may not push one.
 *
 * The switch turns a rule off without deleting it. Groups have a piggy bank they
 * skip on somebody's birthday, and deleting the rule to skip it once means
 * rebuilding it next week.
 */
export default function MoneyRules() {
  const t = useTheme();
  const night = useNight();

  const preview = useMemo(() => {
    if (night === null) return null;
    try {
      return settle(settlementInput(night));
    } catch {
      return null;
    }
  }, [night]);

  if (night === null) return <Sheet title="Money rules">{null}</Sheet>;

  const ledger = resolveLedger(night.entries);
  const rules = [...night.rules].sort((a, b) => a.sortOrder - b.sortOrder);
  const nextOrder = rules.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;

  return (
    <Sheet
      title="Money rules"
      sub="What comes off the table at settle-up, in the order it is taken. Nothing here touches a hand while it is being played."
      sentence
    >
      <RuleList
        caption="Tonight’s rules"
        rules={rules}
        describe={(rule: MoneyRule) =>
          ruleDetail(rule, {
            spent: ledger.totalExpenses,
            collectorName:
              rule.collectorPlayerId === ''
                ? undefined
                : nameOf(night, rule.collectorPlayerId),
            ...(rule.active
              ? { taken: preview?.deductions.find((d) => d.ruleId === rule.id)?.total }
              : {}),
          })
        }
        onOpen={(rule) => router.push({ pathname: '/rule', params: { id: rule.id } })}
        onToggle={(rule, active) => void toggleRule(rule.id, active)}
        onAdd={() =>
          router.push({
            pathname: '/rule',
            params: { destination: 'kitty', order: String(nextOrder), draft: '1' },
          })
        }
      />

      {/* Governs every rule above it at once, so it is under its own caption
          rather than in the list: a reader looking down that list is looking
          for things with a switch, and this has nothing to switch off. */}
      <RoundingRow mode={night.roundingMode} scope="night" />

      <Text style={[styles.footnote, { color: t.muted }]}>
        These belong to tonight. A night is settled with the rules it opened with, so editing one
        here changes this night and not the ones already closed.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  footnote: { ...type.footnote, marginHorizontal: space.page, marginTop: 18 },
});
