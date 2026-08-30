import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  endedWith,
  formatSignedToFit,
  formatToFit,
  resolveLedger,
  type Money,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, unscaledLabel, radius, type } from '../src/design/tokens';
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
      lede="Chips against what went in. Nothing has come off the table yet — the bill and the piggy bank land at the next step."
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
                {
                  borderBottomColor: t.hairline,
                  /* The list closes on the group below it, or on the note. */
                  borderBottomWidth: i === counted.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.rank, { color: t.muted }]}>{i + 1}</Text>
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: t.text }]}>{s.name}</Text>
                <Text style={[styles.detail, { color: t.muted }]}>
                  in {formatToFit(s.boughtIn, ROW_FITS)} · out {formatToFit(s.out, ROW_FITS)}
                </Text>
              </View>
              <Text
                style={[styles.result, { color: moneyColor(t, s.result) }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatSignedToFit(s.result, ROW_FITS)}
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
                  in {formatToFit(s.boughtIn, ROW_FITS)}
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
  // E2b set the second group `16px 4px 0` — 16 above it, and 4 of inset so its
  // rows stepped in from the washed blocks above rather than lining up with
  // their bled edge. The blocks are hairline rows now and bleed past nothing,
  // so the inset has nothing to step in from: the two lists share one left
  // edge, which is what they were always meant to look like.
  groupAfter: { marginTop: 16 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },

  // HAIRLINE ROWS, like every other results list in the app since E6.
  //
  // They were washed blocks, green and red, and the note here said the wash
  // "is what makes the order readable at a glance". It is not: the rank number
  // in the first column is, and it is exact where a wash is only a direction.
  // What the fill actually did was say a second time, in a colour that has to
  // survive a phone at arm's length, what the sign in front of each figure had
  // already said — and turn seven rows into seven objects of two kinds on a
  // screen whose whole point is that the ranking is provisional.
  ranked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: { width: 16, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // 11, the same as the washed rows above them: E2b draws one row height for
  // the whole screen and this list was two pixels taller than the other.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { gap: 3, flexShrink: 1 },
  name: type.rowName,
  detail: type.rowDetail,
  // Never shrinks: the name and its in-and-out line may wrap, a figure may not.
  result: { fontSize: 18, fontWeight: '700', marginLeft: 'auto', flexShrink: 0, fontVariant: ['tabular-nums'] },

  // `14px 22px 0` · `12px 18px` · radius 8, dashed. It had been built as a
  // card — radius 14, on the card's 20 margin — which made a provisional note
  // read as a surface, and the dashed outline is the only thing that is
  // supposed to be saying "not final" here.
  note: {
    marginTop: 14,
    marginHorizontal: 22,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.pressable,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noteText: type.footnote,
});

/*
 * WHAT A RANKED ROW HOLDS EXACTLY.
 *
 * The same list as E5's, drawn once more, and it runs out of room the same way:
 * an in-and-out line at 13/400 sharing what is left of the row with the result
 * at 18/700. There is no avatar and no chevron here so the row is the wider of
 * the two, but the fault it produces is identical — nothing clips, the line
 * simply wraps, and "in $500 · out" ends up sitting above "$239,002,480".
 *
 * ONE THRESHOLD FOR BOTH SCREENS, and it is E5's, the tighter of the two. They
 * are the same six rows a host reads twice within a minute of each other, and a
 * table that abbreviates on one of them and not the other reads as a figure
 * that changed rather than a column that is narrower.
 */
const ROW_FITS = 10_000;
