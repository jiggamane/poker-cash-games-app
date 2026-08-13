import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { endedWith, formatMoney, formatSigned, resolveLedger, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, type } from '../src/design/tokens';
import { standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Where everyone stands — E2b. 13-after-the-night.md.
 *
 * Read-only, and reached mid-count from E2. It answers the question a room
 * starts asking long before the last stack is counted, without pretending the
 * answer is final: ranked on the table result, counted players only, and the
 * uncounted listed below with an em dash rather than a provisional figure.
 *
 * The two sentences are verbatim from the spec and are the whole reason the
 * screen can exist without misleading anybody.
 */
export default function Stands() {
  const t = useTheme();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Screen title="Where everyone stands" backTo="Count up">{null}</Screen>;
  }

  const played = standingsOf(night, ledger).filter((s) => s.played);

  /* Counted means their chips have been seen: either they cashed out during
     play, or the host has taken their final count. */
  const counted = played
    .filter((s) => !s.atTable || night.finalCounts.has(s.id))
    .map((s) => {
      const out = endedWith(ledger, s.id, night.finalCounts);
      return { ...s, out, result: (out - s.boughtIn) as Money };
    })
    .sort((a, b) => b.result - a.result);

  const waiting = played.filter((s) => s.atTable && !night.finalCounts.has(s.id));

  return (
    <Screen
      title="Where everyone stands"
      backTo="Count up"
      lede="Chips against what went in. Nothing has come off the table yet — the bill and the kitty land at the next step."
      footer={<Button label="Back to the count" variant="primary" onPress={() => router.back()} />}
    >
      {counted.length > 0 && (
        <View style={styles.group}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>Counted · {counted.length}</Text>

          {counted.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.ranked,
                { backgroundColor: s.result >= 0 ? t.winWash : t.lossWash },
              ]}
            >
              <Text style={[styles.rank, { color: t.muted }]}>{i + 1}</Text>
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: t.text }]}>{s.name}</Text>
                <Text style={[styles.detail, { color: t.muted }]}>
                  in {formatMoney(s.boughtIn)} · out {formatMoney(s.out)}
                </Text>
              </View>
              <Text style={[styles.result, { color: moneyColor(t, s.result) }]}>
                {formatSigned(s.result)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {waiting.length > 0 && (
        <View style={[styles.group, styles.groupAfter]}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>
            Still to count · {waiting.length}
          </Text>

          {waiting.map((s) => (
            <View
              key={s.id}
              style={[styles.row, { borderBottomColor: t.hairline }]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: t.muted }]}>{s.name}</Text>
                <Text style={[styles.detail, { color: t.muted }]}>
                  in {formatMoney(s.boughtIn)}
                </Text>
              </View>
              <Text style={[styles.result, { color: t.muted }]}>—</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.note, { borderColor: t.dashed }]}>
        <Text style={[styles.noteText, { color: t.muted }]}>
          Ranks are provisional until every stack is counted.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 16, marginHorizontal: 22 },
  groupAfter: { marginTop: 22 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },

  // The ranked rows are blocks rather than hairline rows: a wash of their own
  // colour is what makes the order readable at a glance.
  ranked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: -6,
    marginBottom: 3,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: radius.pressable,
  },
  rank: { width: 16, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { gap: 3, flexShrink: 1 },
  name: type.rowName,
  detail: type.rowDetail,
  result: { fontSize: 18, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  note: {
    marginTop: 22,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noteText: { fontSize: 13, fontWeight: '400', lineHeight: 19 },
});
