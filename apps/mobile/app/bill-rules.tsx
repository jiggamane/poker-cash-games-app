import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MoneyRule } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { PushHeader } from '../src/components/PushHeader';
import { useTheme } from '../src/design/useTheme';
import { saveRule, useNight } from '../src/lib/nightStore';

/** The three ways a bill can be shared out. Only the last one charges losers. */
type Split = 'by_win' | 'evenly_winners' | 'everyone';

const OPTIONS: ReadonlyArray<{ key: Split; label: string; caption: string }> = [
  { key: 'by_win', label: 'By size of win', caption: 'the biggest winner carries the most' },
  {
    key: 'evenly_winners',
    label: 'Evenly between the winners',
    caption: 'same share each, whatever they won',
  },
  { key: 'everyone', label: 'Evenly between everyone', caption: 'losers pay a share too' },
];

/**
 * Bill rules — L5. The formula only; no kitty settings live here.
 *
 * CHANGING THE RULE MID-NIGHT CHANGES NOTHING ALREADY CHARGED, because nothing
 * has been. The spends accumulate and the arithmetic runs once, at settle-up,
 * against the counted table — so the host can set this before the first pizza
 * or after the last one and get the same answer either way.
 */
export default function BillRules() {
  const t = useTheme();
  const night = useNight();
  const [busy, setBusy] = useState(false);

  const rule = night?.rules.find((r) => r.destination === 'bill');
  const [split, setSplit] = useState<Split>(rule === undefined ? 'by_win' : splitOf(rule));

  if (night === null || rule === undefined) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
        <PushHeader title="Bill rules" />
        <Text style={[styles.note, { color: t.muted }]}>
          This night has no bill rule, so nothing shares the tab out. Whoever paid, paid.
        </Text>
      </SafeAreaView>
    );
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await saveRule({ ...rule!, ...ruleFor(split) });
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <PushHeader
        title="Bill rules"
        trailing={<Text style={[styles.meta, { color: t.muted }]}>admin only</Text>}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>How it is split</Text>

          {OPTIONS.map((o) => {
            const on = split === o.key;
            return (
              <Pressable
                key={o.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setSplit(o.key)}
                style={({ pressed }) => [
                  styles.option,
                  { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                {/* A ring, filled when chosen. Nothing else on this screen is a
                    control, so the ring is what carries the choice. */}
                <View style={[styles.radio, { borderColor: on ? t.text : t.dashed }]}>
                  {on && <View style={[styles.radioDot, { backgroundColor: t.text }]} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: t.text }]}>{o.label}</Text>
                  <Text style={[styles.optionCaption, { color: t.muted }]}>{o.caption}</Text>
                </View>
              </Pressable>
            );
          })}

          {/* Granularity is the group's own setting, which is why it is a row
              that goes somewhere rather than a control sitting here. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/money-rules')}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.rowLabel, { color: t.muted }]}>Rounded to</Text>
            <Text style={[styles.rowValue, { color: t.text }]}>Whole dollars</Text>
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        </View>

        <View style={[styles.block, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Text style={[styles.blockLabel, { color: t.muted }]}>When it is charged</Text>
          <Text style={[styles.blockHeadline, { color: t.text }]}>
            At settle-up, never during the game
          </Text>
          <Text style={[styles.blockBody, { color: t.dim }]}>
            The rule is set here and the spends accumulate; the arithmetic runs once the table is
            counted and the winners are known. Changing the rule mid-night changes nothing that has
            already been charged, because nothing has. The remainder goes to the largest share.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={save}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: t.text, opacity: busy ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.primaryLabel, { color: t.onFill }]}>Save the rule</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const splitOf = (r: MoneyRule): Split =>
  r.charge === 'everyone_flat' ? 'everyone' : r.split === 'by_percent' ? 'by_win' : 'evenly_winners';

const ruleFor = (s: Split): Pick<MoneyRule, 'split' | 'charge'> =>
  s === 'everyone'
    ? { split: 'evenly', charge: 'everyone_flat' }
    : s === 'by_win'
      ? { split: 'by_percent', charge: 'winners_only' }
      : { split: 'evenly', charge: 'winners_only' };

const styles = StyleSheet.create({
  screen: { flex: 1 },
  meta: { fontSize: 13, fontWeight: '400' },
  scroll: { flex: 1 },

  list: { marginTop: 18, marginHorizontal: 22 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { gap: 2, flexShrink: 1 },
  optionLabel: { fontSize: 16.5, fontWeight: '600' },
  optionCaption: { fontSize: 12.5, fontWeight: '400' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  rowValue: { fontSize: 16, fontWeight: '600', marginLeft: 'auto' },

  block: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  blockLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  blockHeadline: { fontSize: 16.5, fontWeight: '600' },
  blockBody: { fontSize: 12.5, fontWeight: '400', lineHeight: 19.375 },

  footer: { paddingTop: 14, paddingHorizontal: 20 },
  primary: { alignItems: 'center', paddingVertical: 18, borderRadius: 8 },
  primaryLabel: { fontSize: 17, fontWeight: '700' },

  note: { fontSize: 13, fontWeight: '400', lineHeight: 20, marginHorizontal: 22, marginTop: 18 },
});
