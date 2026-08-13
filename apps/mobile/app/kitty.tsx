import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, resolveLedger } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { PushHeader } from '../src/components/PushHeader';
import { useTheme } from '../src/design/useTheme';
import { nameOf, saveRule, toggleExemption, toggleRule, useNight } from '../src/lib/nightStore';

/**
 * The kitty — L6. Its own screen, reached from the house rules, NEVER from the
 * bill: the kitty is not a spend and putting it on the bill screen is what made
 * people think it was one.
 *
 * The card states the rule and NO TOTAL. What the kitty collects is 5% of every
 * win, and no win exists until the table is counted — a figure here would be a
 * guess dressed up as a fact.
 *
 * "Off for tonight" is a per-player exception and the FILLED chip is the person
 * switched off. Nobody is greyed out: the players still paying are not disabled,
 * they are simply not the exception. It applies to this night only and never
 * touches what the group does next week.
 */
export default function Kitty() {
  const t = useTheme();
  const night = useNight();
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  const rule = night?.rules.find((r) => r.destination === 'kitty');

  if (night === null || ledger === null || rule === undefined) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
        <PushHeader title="The kitty" />
        <Text style={[styles.note, { color: t.muted }]}>
          This group has no kitty. Nothing is taken off a win.
        </Text>
      </SafeAreaView>
    );
  }

  const on = rule.active;
  const off = new Set(rule.exemptPlayerIds ?? []);
  const seated = night.players.filter((p) => (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0);

  const charge =
    rule.amountKind === 'percent'
      ? `${rule.amount}% of each win`
      : `${formatMoney(rule.amount)} of each win`;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <PushHeader
        title="The kitty"
        trailing={<Text style={[styles.meta, { color: t.muted }]}>admin only</Text>}
      />

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardFigures}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>Charged on every win</Text>
          <Text style={[styles.figure, { color: on ? t.text : t.muted }]}>
            {rule.amountKind === 'percent' ? `${rule.amount}%` : formatMoney(rule.amount)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.ruleLine, { color: t.muted }]}>winners only</Text>
          <Text style={[styles.count, { color: t.dim }]}>counted at settle-up</Text>
        </View>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <View style={[styles.row, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.rowLabelOn, { color: t.text }]}>Kitty on tonight</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            disabled={busy}
            onPress={() => void toggleRule(rule.id, !on)}
            style={[styles.switch, { backgroundColor: on ? '#6FCF97' : t.raised }]}
          >
            <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
          </Pressable>
        </View>

        <View style={[styles.row, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.rowLabel, { color: t.muted }]}>Charge</Text>
          <Text style={[styles.rowValue, { color: t.text }]}>{charge}</Text>
          <Icon name="chevron" color={t.muted} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/rule', params: { id: rule.id } })}
          style={({ pressed }) => [
            styles.row,
            { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.rowLabel, { color: t.muted }]}>Who collects</Text>
          <Text style={[styles.rowValue, { color: t.text }]}>
            {nameOf(night, rule.collectorPlayerId)}
          </Text>
          <Icon name="chevron" color={t.muted} />
        </Pressable>

        <Text style={[styles.sectionLabel, { color: t.muted }]}>Off for tonight</Text>

        <View style={styles.chips}>
          {seated.map((p) => {
            const exempt = off.has(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: exempt }}
                disabled={busy}
                onPress={() => void toggleExemption(rule.id, p.id)}
                style={({ pressed }) => [
                  styles.chip,
                  exempt
                    ? { backgroundColor: t.text, borderColor: t.text }
                    : { backgroundColor: t.surface, borderColor: t.hairline },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.chipLabel, { color: exempt ? t.onFill : t.text }]}>
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.explain, { color: t.dim }]}>
          {off.size === 0
            ? 'Nobody is off tonight. Switching someone off applies to this night only and never touches the group’s own setting. The kitty is charged on wins, so a player who finishes down never pays into it.'
            : `${[...off].map((id) => nameOf(night, id)).join(', ')} ${off.size === 1 ? 'is' : 'are'} off tonight. Switching someone off applies to this night only and never touches the group’s own setting. The kitty is charged on wins, so a player who finishes down never pays into it.`}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void saveRule(rule).finally(() => {
              setBusy(false);
              router.back();
            });
          }}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: t.text, opacity: busy ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.primaryLabel, { color: t.onFill }]}>Save for tonight</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  meta: { fontSize: 13, fontWeight: '400' },

  card: {
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  cardFigures: { gap: 8 },
  cardLabel: { fontSize: 12.5, fontWeight: '600' },
  figure: { fontSize: 44, fontWeight: '800', letterSpacing: -1.76, lineHeight: 44, fontVariant: ['tabular-nums'] },
  cardRight: { marginLeft: 'auto', gap: 3, alignItems: 'flex-end' },
  ruleLine: { fontSize: 13, fontWeight: '500' },
  count: { fontSize: 13, fontWeight: '400' },

  list: { flex: 1, marginHorizontal: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  rowLabelOn: { fontSize: 16, fontWeight: '500' },
  rowValue: { fontSize: 16, fontWeight: '600', marginLeft: 'auto' },

  switch: {
    width: 48,
    height: 29,
    borderRadius: 15,
    marginLeft: 'auto',
    padding: 3,
    justifyContent: 'center',
  },
  knob: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#FFFFFF' },
  knobOn: { marginLeft: 'auto' },
  knobOff: { marginRight: 'auto' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingTop: 18,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2, paddingHorizontal: 4 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  chipLabel: { fontSize: 15, fontWeight: '600' },
  explain: { fontSize: 13, fontWeight: '400', lineHeight: 20.15, paddingTop: 14, paddingHorizontal: 4 },

  footer: { paddingTop: 14, paddingHorizontal: 20 },
  primary: { alignItems: 'center', paddingVertical: 18, borderRadius: 8 },
  primaryLabel: { fontSize: 17, fontWeight: '700' },

  note: { fontSize: 13, fontWeight: '400', lineHeight: 20, marginHorizontal: 22, marginTop: 18 },
});
