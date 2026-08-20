import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatMoney,
  resolveLedger,
  roundingLabel,
  roundingSentence,
  settle,
  type Money,
  type MoneyRule,
} from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { nameOf, type Night, settlementInput, toggleRule, useNight } from '../src/lib/nightStore';

/**
 * Money rules — O4. Everything that takes money off the table at settle-up.
 *
 * ONE HAIRLINE LIST, not a stack of cards — the O4 idiom, which GR8 now shares
 * (rev 18 § 3). A caption, then one row per rule: its name with a chevron, one
 * line describing it, and the switch at the right. "Add a rule" is the last
 * row rather than a button somewhere else, so the list ends where a reader is
 * already looking.
 *
 * The line under a name says the three things a host actually asks — how much,
 * who pays, and where it goes — in that order, because "10% off my win" and
 * "10% of the pot" are different evenings.
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
      <Text style={[styles.caption, { color: t.muted }]}>Tonight’s rules</Text>

      <View style={styles.list}>
        {rules.map((rule, i) => {
          const taken = preview?.deductions.find((d) => d.ruleId === rule.id)?.total;
          return (
            <View
              key={rule.id}
              style={[
                styles.row,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => open(rule)}
                style={({ pressed }) => [styles.rowText, { opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={styles.nameLine}>
                  <Text
                    style={[styles.name, { color: rule.active ? t.text : t.muted }]}
                    numberOfLines={1}
                  >
                    {rule.name}
                  </Text>
                  <Icon name="chevron" color={t.muted} size={15} />
                </View>
                <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>
                  {describe(rule, night, ledger.totalExpenses, rule.active ? taken : undefined)}
                </Text>
              </Pressable>

              <Switch on={rule.active} onPress={() => void toggleRule(rule.id, !rule.active)} />
            </View>
          );
        })}

        {/* Last row, and the only way in from here. The three dashed cards it
            replaces asked the reader to choose a destination before they had
            seen the editor that explains what one is. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => create('kitty')}
          style={({ pressed }) => [styles.row, styles.addRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="plus" color={t.text} size={15} />
          <Text style={[styles.addLabel, { color: t.text }]}>Add a rule</Text>
        </Pressable>
      </View>

      {/*
        * Governs every rule above it at once, so it is under its own caption
        * rather than in the list: a reader looking down that list is looking
        * for things with a switch, and this has nothing to switch off.
        */}
      <Text style={[styles.caption, styles.afterList, { color: t.muted }]}>How it is rounded</Text>

      <View style={styles.list}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/rounding', params: { scope: 'night' } })}
          style={({ pressed }) => [styles.row, styles.addRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={styles.rowText}>
            <View style={styles.nameLine}>
              <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                {roundingLabel(night.roundingMode)}
              </Text>
              <Icon name="chevron" color={t.muted} size={15} />
            </View>
            <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>
              {roundingSentence(night.roundingMode)}
            </Text>
          </View>
        </Pressable>
      </View>

      <Text style={[styles.footnote, { color: t.muted }]}>
        These belong to tonight. A night is settled with the rules it opened with, so editing one
        here changes this night and not the ones already closed.
      </Text>
    </Sheet>
  );
}

/**
 * "$170 fixed · split by winners · Marek collects".
 *
 * The board's own grammar, in the board's own order: how much, who pays, who
 * ends up holding it — and, for a rule that has taken something tonight, what
 * it has taken. A bill states what has been spent instead of an amount,
 * because a bill's amount IS the spending.
 */
function describe(
  rule: MoneyRule,
  night: Night,
  spent: Money,
  taken?: Money,
): string {
  const how =
    rule.destination === 'bill'
      ? `${formatMoney(spent)} spent so far`
      : rule.amountKind === 'percent'
        ? `${rule.amount}% of win`
        : `${formatMoney(rule.amount)} fixed`;

  const who =
    rule.split === 'custom'
      ? 'split by hand'
      : rule.charge === 'everyone_flat'
        ? 'everyone at the table'
        : rule.split === 'by_percent'
          ? 'winners, by size of win'
          : 'split by winners';

  const holder =
    rule.destination === 'bill'
      ? 'paid back to whoever bought it'
      : rule.collectorPlayerId === ''
        ? 'held by the group'
        : `${nameOf(night, rule.collectorPlayerId)} collects`;

  const tail = taken === undefined ? '' : ` · ${formatMoney(taken)} tonight`;
  return `${how} · ${who} · ${holder}${tail}`;
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
  caption: { ...type.sectionLabel, marginHorizontal: space.page, marginBottom: 2 },
  list: { marginHorizontal: space.page },
  // doc 15 § 3: a sheet's body rows are 15 / 4 with a hairline between them.
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 4 },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  detail: { fontSize: 13.5, fontWeight: '400' },
  afterList: { marginTop: 18 },
  addRow: { gap: 11, borderBottomWidth: 0 },
  addLabel: { fontSize: 15, fontWeight: '700' },

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

  footnote: { ...type.footnote, marginHorizontal: space.page, marginTop: 18 },
});
