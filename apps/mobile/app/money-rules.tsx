import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger, settle, type MoneyRule } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, toggleRule, useNight } from '../src/lib/nightStore';

/**
 * Money rules — O4. Everything that takes money off the table at settle-up.
 *
 * A rule is described by TAGS rather than by a sentence of settings, because
 * the question a host actually has is "will this take 10% off my win or 10% of
 * the pot", and three short tags answer it at a glance where a paragraph does
 * not.
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

  if (night === null) return <Sheet title="Money rules">{null}</Sheet>;

  const ledger = resolveLedger(night.entries);
  const rules = [...night.rules].sort((a, b) => a.sortOrder - b.sortOrder);
  const nextOrder = rules.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;

  const open = (rule: MoneyRule) =>
    router.push({ pathname: '/rule', params: { id: rule.id } });

  const create = (destination: MoneyRule['destination']) =>
    router.push({
      pathname: '/rule',
      params: { destination, order: String(nextOrder), draft: '1' },
    });

  return (
    <Sheet
      title="Money rules"
      sub="What comes off the table at settle-up, in the order it is taken. Nothing here touches a hand while it is being played."
      sentence
    >
      <View style={styles.cards}>
        {rules.map((rule) => {
          const taken = preview?.deductions.find((d) => d.ruleId === rule.id)?.total;
          return (
            <View
              key={rule.id}
              style={[
                styles.card,
                { backgroundColor: t.surface, borderColor: t.hairline },
                !rule.active && styles.off,
              ]}
            >
              <View style={styles.cardTop}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => open(rule)}
                  style={({ pressed }) => [styles.cardName, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.name, { color: rule.active ? t.text : t.muted }]}>
                    {rule.name}
                  </Text>
                  <Icon name="chevron" color={t.muted} />
                </Pressable>

                <Switch on={rule.active} onPress={() => void toggleRule(rule.id, !rule.active)} />
              </View>

              <View style={styles.tags}>
                {tagsFor(rule).map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: t.raised }]}>
                    <Text style={[styles.tagText, { color: t.text }]}>{tag}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.note, { color: t.muted }]}>
                {rule.destination === 'bill'
                  ? `${formatMoney(ledger.totalExpenses)} spent so far · paid back to whoever bought it`
                  : rule.collectorPlayerId === ''
                    ? 'Held by the group — nobody named yet'
                    : `Held by ${nameOf(night, rule.collectorPlayerId)}`}
                {taken !== undefined && rule.active ? ` · ${formatMoney(taken)} tonight` : ''}
              </Text>
            </View>
          );
        })}

        {(['kitty', 'bill', 'host_fee'] as const)
          .filter((d) => !rules.some((r) => r.destination === d))
          .map((d) => (
            <Pressable
              key={d}
              accessibilityRole="button"
              onPress={() => create(d)}
              style={({ pressed }) => [
                styles.add,
                { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Icon name="plus" color={t.text} />
              <Text style={[styles.addLabel, { color: t.text }]}>
                {d === 'kitty' ? 'A piggy bank' : d === 'bill' ? 'Food & drinks' : 'A host fee'}
              </Text>
            </Pressable>
          ))}
      </View>

      <Text style={[styles.footnote, { color: t.muted }]}>
        These belong to tonight. A night is settled with the rules it opened with, so editing one
        here changes this night and not the ones already closed.
      </Text>
    </Sheet>
  );
}

/**
 * Three tags, in the order the question is asked: how much, who pays, out of
 * what. A percentage rule has no split to describe — everyone pays a slice of
 * their own win — so it says what it is taken from instead.
 */
function tagsFor(rule: MoneyRule): string[] {
  const how =
    rule.amountKind === 'percent'
      ? `${rule.amount}% OF THE WIN`
      : rule.destination === 'bill'
        ? 'THE REAL BILL'
        : `FIXED · ${formatMoney(rule.amount)}`;

  const who =
    rule.split === 'custom'
      ? 'SPLIT BY HAND'
      : rule.charge === 'winners_only'
        ? rule.split === 'by_percent'
          ? 'WINNERS · BY WIN SIZE'
          : 'SPLIT BY WINNERS'
        : 'EVERYONE, FLAT';

  const from = rule.basis === 'net_after_others' ? 'AFTER THE OTHERS' : 'OFF THE GROSS';

  return rule.amountKind === 'percent' ? [how, who, from] : [how, who];
}

/** 44 × 26, knob 20. Filled when on — no colour, because colour is money. */
function Switch({ on, onPress }: { on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      hitSlop={10}
      style={[
        styles.track,
        on ? { backgroundColor: t.text } : { backgroundColor: t.raised },
        { justifyContent: on ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View style={[styles.knob, { backgroundColor: on ? t.onFill : t.muted }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cards: { marginHorizontal: space.card, gap: 10 },
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 9,
  },
  off: { opacity: 0.55 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  name: { fontSize: 18, fontWeight: '700' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.66 },
  note: { fontSize: 13.5, fontWeight: '400', lineHeight: 20 },

  track: {
    marginLeft: 'auto',
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  knob: { width: 20, height: 20, borderRadius: 10 },

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
