import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  TABLE_RULE_KEYS,
  sameTableRuleValue,
  tableRuleLabel,
  tableRuleOptions,
  tableRuleValue,
  type TableRuleKey,
  type TableRules,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { setClubTableRules, useClub } from '../src/lib/clubStore';
import { formatMoney, useMoneySymbol } from '../src/lib/money';

/**
 * Table rules — how the group runs its table. `docs/rulings.md` § 5.
 *
 * A SHEET over Rules, ending with Save. One row per parameter; tapping a row
 * REPLACES THIS SHEET'S CONTENT with the choices for it and keeps the same
 * close (`09-navigation.md`: a multi-step flow replaces one sheet's content;
 * a sheet never pushes). Picking a choice comes back to the list; "Not set"
 * is a choice too, because an answer that reads a null says so, and a group
 * may want it to.
 *
 * What is saved is the CLUB DEFAULT, the group's own layer. A night does not
 * yet take a snapshot of it — that is step 2, with the server column — so for
 * now every answer reads the current default.
 *
 * The buy-in range is not edited here: its value is an amount, not a choice,
 * and until a keypad step exists the row reads the standard buy-in from
 * Settings and says so.
 */
export default function TableRulesSheet() {
  const t = useTheme();
  const club = useClub();
  const symbol = useMoneySymbol();
  const [draft, setDraft] = useState<TableRules | null>(null);
  const [editing, setEditing] = useState<TableRuleKey | null>(null);
  const [busy, setBusy] = useState(false);

  if (club === null) return <Sheet title="Table rules">{null}</Sheet>;
  const rules = draft ?? club.tableRules;

  async function save() {
    if (club === null || draft === null) {
      router.back();
      return;
    }
    setBusy(true);
    try {
      await setClubTableRules(club.id, draft);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  if (editing !== null) {
    const key = editing;
    const options = tableRuleOptions(key);
    const current = rules[key];
    const choose = (value: unknown) => {
      setDraft({ ...rules, [key]: value } as TableRules);
      setEditing(null);
    };
    return (
      <Sheet title={tableRuleLabel(key)} sub="Pick one. The answers that read this rule will say it in your group's words.">
        <View style={styles.list}>
          {options.map((o, i) => {
            const on = current !== null && sameTableRuleValue(o.value, current);
            return (
              <Pressable
                key={o.label}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => choose(o.value)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: t.hairline, borderBottomWidth: StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.label, { color: t.text, fontWeight: on ? '700' : '600' }]}>{o.label}</Text>
                {on && (
                  <View style={styles.trailing}>
                    <Icon name="check" color={t.text} />
                  </View>
                )}
                {i === options.length - 1 ? null : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: current === null }}
            onPress={() => choose(null)}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.label, { color: t.amber }]}>Not set</Text>
            {current === null && (
              <View style={styles.trailing}>
                <Icon name="check" color={t.amber} />
              </View>
            )}
          </Pressable>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Table rules"
      sub="How the table is run. Every answer that reads one of these says it in your group's words."
      sentence
      footer={<Button label="Save" onPress={() => void save()} disabled={busy} />}
    >
      <View style={styles.list}>
        {TABLE_RULE_KEYS.map((key, i) => {
          const editable = tableRuleOptions(key).length > 0;
          const value =
            key === 'buyIn' && rules.buyIn === null
              ? `Standard ${formatMoney(club.defaultBuyIn)}`
              : tableRuleValue(key, rules, symbol);
          const last = i === TABLE_RULE_KEYS.length - 1;
          return (
            <Pressable
              key={key}
              accessibilityRole={editable ? 'button' : 'none'}
              disabled={!editable}
              onPress={() => setEditing(key)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.label, { color: t.text }]} numberOfLines={2}>
                {tableRuleLabel(key)}
              </Text>
              <Text
                style={[styles.value, value === null ? { color: t.amber } : { color: t.text, fontWeight: '600' }]}
                numberOfLines={1}
              >
                {value ?? 'Not set'}
              </Text>
              {editable && <Icon name="chevron" color={t.muted} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
  },
  label: { ...type.rowName, flexShrink: 1 },
  value: { ...type.meta, marginLeft: 'auto', flexShrink: 1, fontVariant: ['tabular-nums'] },
  trailing: { marginLeft: 'auto' },
});
