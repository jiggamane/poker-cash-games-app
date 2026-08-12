import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger, settle, type Money, type MoneyRule } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, useNight } from '../src/lib/nightStore';

/**
 * House rules — B1. What the night will take off the table, and why.
 *
 * READ-ONLY for now. Editing a rule mid-night is a real feature and a delicate
 * one — the rules a night is settled with are a snapshot taken when it opened,
 * so changing one has to be an explicit act with a record, not a stray tap.
 * Showing them without letting them be edited is honest; showing an Edit that
 * silently did nothing would not be.
 *
 * A figure here is a PREVIEW and says so: a percentage of the winnings cannot
 * be known until the winnings are, so it reads "≈" until the night is counted.
 */
export default function HouseRules() {
  const t = useTheme();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  /** The real engine, or nothing — never an estimate of its own. */
  const preview = useMemo(() => {
    if (night === null) return null;
    try {
      return settle({
        players: night.players,
        entries: night.entries,
        finalCounts: night.finalCounts,
        rules: night.rules,
      });
    } catch {
      return null;
    }
  }, [night]);

  if (night === null || ledger === null) {
    return <Screen title="Bill &amp; kitty" backTo="Tonight">{null}</Screen>;
  }

  const active = night.rules.filter((r) => r.active).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Screen
      title="Bill &amp; kitty"
      backTo="Tonight"
      lede="The group’s usual rules, carried from last night. They apply at settle-up, never during play."
    >
      <View style={styles.cards}>
        {active.map((rule) => {
          const taken = preview?.deductions.find((d) => d.ruleId === rule.id)?.total;
          return (
            <View
              key={rule.id}
              style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.cardName, { color: t.text }]}>{title(rule)}</Text>
                <Text style={[styles.cardFigure, { color: t.text }]}>
                  {taken === undefined
                    ? '—'
                    : rule.amountKind === 'percent'
                      ? `≈ ${formatMoney(taken)}`
                      : formatMoney(taken)}
                </Text>
              </View>
              <Text style={[styles.cardNote, { color: t.muted }]}>{explain(rule, night, ledger.totalExpenses)}</Text>
            </View>
          );
        })}

        {active.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            Nothing comes off the table tonight. Everyone leaves with exactly what they counted.
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/expenses')}
          style={({ pressed }) => [
            styles.add,
            { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="plus" color={t.text} />
          <Text style={[styles.addLabel, { color: t.text }]}>Food &amp; drinks</Text>
        </Pressable>
      </View>

      <Text style={[styles.footnote, { color: t.muted }]}>
        Editing these is coming. A night is settled with the rules it opened with, so changing one
        has to be recorded rather than slipped in.
      </Text>
    </Screen>
  );
}

/** "Group kitty · 10%" — the rate belongs in the name, where it is read. */
const title = (r: MoneyRule): string =>
  r.amountKind === 'percent' ? `${r.name} · ${r.amount}%` : r.name;

/**
 * One line saying who pays, out of what, and who ends up holding it.
 *
 * Written out rather than shown as three settings, because "off each win,
 * before the bill · held by the group" is a sentence a host can check against
 * what they agreed, and three labelled toggles are not.
 */
function explain(
  rule: MoneyRule,
  night: NonNullable<ReturnType<typeof useNight>>,
  expenses: Money,
): string {
  const who =
    rule.split === 'custom'
      ? 'split by hand'
      : rule.charge === 'winners_only'
        ? rule.split === 'by_percent'
          ? 'split between the winners, by the size of the win'
          : 'splits between the winners'
        : 'split between everyone at the table';

  const outOf =
    rule.amountKind === 'percent'
      ? rule.basis === 'net_after_others'
        ? 'off each win, after the other rules'
        : 'off each win'
      : null;

  const holder =
    rule.destination === 'bill'
      ? `${formatMoney(expenses)} spent so far · paid back to whoever bought it`
      : `held by ${nameOf(night, rule.collectorPlayerId)}`;

  return [outOf, who, holder].filter(Boolean).join(' · ');
}

const styles = StyleSheet.create({
  cards: { marginHorizontal: space.card, gap: 10 },
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  cardFigure: { ...type.statValue, marginLeft: 'auto' },
  cardNote: { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  empty: { ...type.footnote },

  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addLabel: { fontSize: 15, fontWeight: '700' },

  footnote: { ...type.footnote, marginHorizontal: space.page, marginTop: 18 },
});
