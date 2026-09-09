import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Money } from '@poker-club/core';
import { formatSignedToFit } from '../lib/money';
import { Icon } from './Icon';
import { moneyColor, useTheme } from '../design/useTheme';
import { cappedFigure, tabular } from '../design/tokens';

/**
 * A NIGHT IN A LIST — `design/handoff-sessions-stats/`, frames `1a` and `2a`,
 * cut 9 September.
 *
 * **THE ONE ROW EVERY LIST OF GAMES IN THIS APP DRAWS.** Sessions, Last games
 * on My stats, and anywhere else a night appears as a line: the shape is the
 * same and the only difference is a size and one extra word. That is the whole
 * reason this is a component — three lists that "look similar" become three
 * lists that look different the first time one of them is edited.
 *
 *     Tue 4 August                                        −$493  ›
 *     👥 8 players   🕐 3h 40m
 *
 * NO RULE BETWEEN ROWS. Separation is the 60-point row alone, which the handoff
 * states as a decision rather than a style: *"an earlier version fenced every
 * row and read as noise"*.
 *
 * ONLY TWO THINGS ARE AT FULL BRIGHTNESS — the date and the figure. Everything
 * else is annotation in bone, which is what puts the second line underneath the
 * first in the reading order rather than beside it.
 *
 * NOTHING HERE ADDS ANYTHING UP. The net is the caller's, off the engine.
 */

export function GameRow({
  date,
  net,
  group,
  players,
  minutes,
  compact = false,
  testID,
  onPress,
}: {
  /** `Tue 4 August`, or `Sat 15 Aug` in the compact list. The caller formats it. */
  date: string;
  /** Their result for the night. Null on a night they did not play. */
  net: Money | null;
  /**
   * The club, FIRST on the annotation line and only where a list mixes them.
   * Sessions is scoped to one group and does not repeat its name eight times;
   * Last games spans every group, so each row has to say which.
   */
  group?: string;
  /** How many sat down. Omitted where the night does not know. */
  players?: number;
  /** How long the table ran. Omitted while it is still running. */
  minutes?: number;
  /**
   * 56 rather than 60, for `Last games` — *"rows are 4px shorter than
   * Sessions' because this list is a sample, not the destination"*.
   */
  compact?: boolean;
  testID?: string;
  onPress?: () => void;
}) {
  const t = useTheme();

  const body = (
    <>
      <View style={styles.head}>
        <Text
          style={[compact ? styles.dateCompact : styles.date, { color: t.text }]}
          numberOfLines={1}
        >
          {date}
        </Text>
        {net === null ? (
          /* A night you sat out has no result, and a `$0` would be a claim
             about an evening that never happened to you. */
          <Text style={[styles.sat, { color: t.annotation }]} numberOfLines={1}>
            did not play
          </Text>
        ) : (
          <Text
            testID={testID === undefined ? undefined : `${testID}-net`}
            style={[
              compact ? styles.netCompact : styles.net,
              tabular,
              { color: net === 0 ? t.muted : moneyColor(t, net) },
            ]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {formatSignedToFit(net, ROW_FITS)}
          </Text>
        )}
        {/* 9 × 14 in `dim`, 2 of left padding. It is the app's own row chevron
            at the handoff's size — see `docs/screens.md`. */}
        <View style={styles.chevron}>
          <Icon name="chevron" color={t.dim} size={14} />
        </View>
      </View>

      <View style={[styles.annotation, compact && styles.annotationCompact]}>
        {group !== undefined && (
          <Text style={[styles.figure, { color: t.annotation }]} numberOfLines={1}>
            {group}
          </Text>
        )}
        {players !== undefined && (
          <View style={styles.pair}>
            <Icon name="people" color={t.annotationStroke} size={13} />
            <Text style={[styles.figure, tabular, { color: t.annotation }]} numberOfLines={1}>
              {`${players} ${players === 1 ? 'player' : 'players'}`}
            </Text>
          </View>
        )}
        {minutes !== undefined && minutes > 0 && (
          <View style={styles.pair}>
            <Icon name="clock" color={t.annotationStroke} size={13} />
            <Text style={[styles.figure, tabular, { color: t.annotation }]} numberOfLines={1}>
              {duration(minutes)}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  if (onPress === undefined) {
    return (
      <View testID={testID} style={compact ? styles.rowCompact : styles.row}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={
        net === null ? `${date}, did not play` : `${date}, ${formatSignedToFit(net, ROW_FITS)}`
      }
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.rowCompact : styles.row,
        pressed && styles.pressed,
      ]}
    >
      {body}
    </Pressable>
  );
}

/**
 * `3h 40m`.
 *
 * THE MINUTES ARE PADDED and the hours are not — `4h 05m`, not `4h 5m`. A
 * column of durations is read down rather than across, and an unpadded minute
 * makes every row below it look indented.
 */
export function duration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

const styles = StyleSheet.create({
  /*
   * 60 TALL, TWO LINES, 5 APART, and no hairline anywhere. `minHeight` rather
   * than `height` so the row grows with the reader's text setting instead of
   * clipping a date at 120%; at the drawn sizes it is exactly 60, and ten rows
   * fill the frame with no scroll.
   */
  row: { minHeight: 60, justifyContent: 'center', gap: 5 },
  /* 56 and 4 apart — `Last games`, which is a sample rather than the list. */
  rowCompact: { minHeight: 56, justifyContent: 'center', gap: 4 },
  pressed: { opacity: 0.6 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  date: { fontSize: 17, fontWeight: '400', lineHeight: 21, flexShrink: 1 },
  dateCompact: { fontSize: 16.5, fontWeight: '400', lineHeight: 21, flexShrink: 1 },
  /*
   * NEVER SHRINKS. The date may give — it is a word — and a figure may not:
   * left to shrink, "−$12,000" came apart into a dash on one line and an
   * amount on the next, which reads as two things. See B18.
   */
  net: { marginLeft: 'auto', flexShrink: 0, fontSize: 17, fontWeight: '600', lineHeight: 21 },
  netCompact: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 16.5,
    fontWeight: '600',
    lineHeight: 21,
  },
  sat: { marginLeft: 'auto', flexShrink: 0, fontSize: 13, fontWeight: '400', lineHeight: 21 },
  chevron: { flexShrink: 0, paddingLeft: 2, justifyContent: 'center' },

  /*
   * IT WRAPS. The handoff draws one line and at its own figures it is one; a
   * club with a long name beside a nine-player night at 120% text is not, and
   * a wrapped pair is still a whole pair where a clipped one is a fact nobody
   * can read.
   */
  annotation: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 14, rowGap: 3 },
  annotationCompact: { columnGap: 12 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  figure: { fontSize: 12.5, fontWeight: '400', lineHeight: 16 },
});

/*
 * Every figure under seven digits prints in full; past that `formatSignedToFit`
 * goes compact rather than clipped. A lifetime of nights is added up on the
 * card above this list, not on a row of it.
 */
const ROW_FITS = 1_000_000;
