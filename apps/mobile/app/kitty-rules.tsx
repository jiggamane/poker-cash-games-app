import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { resolveLedger, type MoneyRule, type PlayerId } from '@poker-club/core';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, saveRule, standingsOf, toggleRule, useNight } from '../src/lib/nightStore';

/**
 * Kitty rules — L6. 11-bill-and-kitty.md.
 *
 * Its own screen off the house rules, and NEVER off the bill: the kitty is not
 * a spend, it is a cut of winnings that carries over to the next game. The two
 * only look alike because both take money off the table.
 *
 * The card states the rule and shows NO TOTAL. While the game runs there are no
 * winners, so 5% of the wins is not a number that exists yet — it is counted
 * once, at settle-up.
 *
 * "Off for tonight" reads backwards on purpose: the FILLED chip is the player
 * switched off. Everyone else stays at full strength and nobody is greyed,
 * because the people paying into the kitty are not disabled.
 */
export default function KittyRules() {
  const t = useTheme();
  const night = useNight();
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  const rule = night?.rules.find((r) => r.destination === 'kitty');

  if (night === null || ledger === null) return <Sheet title="The kitty">{null}</Sheet>;

  if (rule === undefined) {
    return (
      <Sheet title="The kitty" sub="nothing is taken for a kitty tonight" sentence>
        <Text style={[styles.none, { color: t.muted }]}>
          This group has no kitty rule. Add one in the money rules and it will appear here, with
          who collects it and who is sitting out of it tonight.
        </Text>
      </Sheet>
    );
  }

  const exempt = new Set(rule.exemptPlayerIds ?? []);
  const seated = standingsOf(night, ledger).filter((s) => s.played);

  async function setExempt(id: PlayerId, off: boolean) {
    if (busy || rule === undefined) return;
    setBusy(true);
    try {
      const next = new Set(rule.exemptPlayerIds ?? []);
      if (off) next.add(id);
      else next.delete(id);
      await saveRule({ ...rule, exemptPlayerIds: [...next] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="The kitty" sub="a cut of the wins, held for the group">
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardLeft}>
          <Text style={[styles.label, { color: t.muted }]}>Charged on every win</Text>
          <Text style={[styles.figure, { color: t.text }]}>{rate(rule)}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.who, { color: t.muted }]}>
            {rule.charge === 'winners_only' ? 'winners only' : 'everyone at the table'}
          </Text>
          <Text style={[styles.when, { color: t.dim }]}>counted at settle-up</Text>
        </View>
      </View>

      <View style={styles.rows}>
        <View style={[styles.row, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.rowLabel, { color: t.text }]}>Kitty on tonight</Text>
          <Switch
            value={rule.active}
            disabled={busy}
            onValueChange={(on) => void toggleRule(rule.id, on)}
            trackColor={{ true: t.win, false: t.quietOutline }}
            thumbColor="#FFFFFF"
            style={styles.switch}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.rowLabel, { color: t.text }]}>Charge</Text>
          <Text style={[styles.rowValue, { color: t.muted }]}>{charge(rule)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.text }]}>Who collects</Text>
          <Text style={[styles.rowValue, { color: t.muted }]}>
            {nameOf(night, rule.collectorPlayerId)}
          </Text>
        </View>
      </View>

      <View style={styles.block}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Off for tonight</Text>
        <View style={styles.chips}>
          {seated.map((p) => {
            const off = exempt.has(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: off }}
                accessibilityLabel={`${p.name}${off ? ' is out of the kitty tonight' : ' pays into the kitty'}`}
                disabled={busy}
                onPress={() => void setExempt(p.id, !off)}
                style={({ pressed }) => [
                  styles.chip,
                  off
                    ? { backgroundColor: t.text, borderColor: t.text }
                    : { borderColor: t.quietOutline },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.chipLabel, { color: off ? t.onFill : t.text }]}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.explain, { color: t.muted }]}>
          A filled name is sitting this one out. It applies to tonight only and never touches the
          group’s own setting.
        </Text>
      </View>
    </Sheet>
  );
}

const rate = (rule: MoneyRule): string =>
  rule.amountKind === 'percent' ? `${rule.amount}%` : `$${rule.amount.toLocaleString('en-US')}`;

const charge = (rule: MoneyRule): string =>
  rule.amountKind === 'percent'
    ? `${rule.amount}% of each ${rule.basis === 'gross' ? 'win' : 'win after the bill'}`
    : `$${rule.amount.toLocaleString('en-US')} each`;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  cardLeft: { gap: 8 },
  label: type.tableLabel,
  figure: type.tableFigure,
  cardRight: { marginLeft: 'auto', alignItems: 'flex-end', gap: 3 },
  who: type.tableTotal,
  when: type.tableSeats,

  rows: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: type.rowName,
  rowValue: { ...type.meta, marginLeft: 'auto' },
  switch: { marginLeft: 'auto' },

  block: { marginTop: 24, marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.pressable, borderWidth: 1.5 },
  chipLabel: { fontSize: 14.5, fontWeight: '600' },
  explain: { ...type.footnote, marginTop: 12, paddingHorizontal: 4 },

  none: { ...type.footnote, marginHorizontal: space.page },
});
