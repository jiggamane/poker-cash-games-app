import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { type Money } from '@poker-club/core';
import { formatSignedToFit } from '../lib/money';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';
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
 *     Sat 15 Aug                                          −$60
 *     The poker club  👥 8 players  🕐 5h 10m
 *
 * THE FULL BOARD'S `night()` (`design/explorations/full-board/screens/
 * 70-sessions-stats-group.mjs`), approved: 600 15.5 date, the figure 700 16.5
 * in the figure face, the annotation line 11.5 muted 4 under it, 9 above and
 * below. The caller puts the rows in one `Card`; the row draws no card itself.
 *
 * NO RULE BETWEEN ROWS AND NO CHEVRON. Separation is the row's own padding,
 * which the handoff states as a decision rather than a style: *"an earlier
 * version fenced every row and read as noise"*; the chevron went with every
 * other one in the new look (no row points).
 *
 * ONLY TWO THINGS ARE AT FULL BRIGHTNESS — the date and the figure. Everything
 * else is annotation in the muted grey, which is what puts the second line
 * underneath the first in the reading order rather than beside it.
 *
 * A LOSS IS RED, not the loss grey (owner, on the board: losses red — the W/L
 * count and the list's figures). A win green, nothing at all muted.
 *
 * NOTHING HERE ADDS ANYTHING UP. The net is the caller's, off the engine.
 */

export function GameRow({
  date,
  net,
  group,
  players,
  minutes,
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
   * `Last games` rather than Sessions. The handoff drew the sample 4 points
   * shorter; the full board draws both lists with the one `night()` row, so
   * the flag is kept for the callers and draws the same row.
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
          style={[styles.date, { color: t.text }]}
          numberOfLines={1}
        >
          {date}
        </Text>
        {net === null ? (
          /* A night you sat out has no result, and a `$0` would be a claim
             about an evening that never happened to you. */
          <Text style={[styles.sat, { color: t.muted }]} numberOfLines={1}>
            did not play
          </Text>
        ) : (
          <Text
            testID={testID === undefined ? undefined : `${testID}-net`}
            style={[
              styles.net,
              tabular,
              { color: net === 0 ? t.muted : net > 0 ? t.win : t.red },
            ]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {formatSignedToFit(net, ROW_FITS)}
          </Text>
        )}
      </View>

      <View style={styles.annotation}>
        {group !== undefined && (
          <Text style={[styles.figure, styles.group, { color: t.muted }]} numberOfLines={1}>
            {group}
          </Text>
        )}
        {players !== undefined && (
          <View style={styles.pair}>
            <Icon name="people" color={t.muted} size={z(12)} />
            <Text style={[styles.figure, { color: t.muted }]} numberOfLines={1}>
              {`${players} ${players === 1 ? 'player' : 'players'}`}
            </Text>
          </View>
        )}
        {minutes !== undefined && minutes > 0 && (
          <View style={styles.pair}>
            <Icon name="clock" color={t.muted} size={z(12)} />
            <Text style={[styles.figure, { color: t.muted }]} numberOfLines={1}>
              {duration(minutes)}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  if (onPress === undefined) {
    return (
      <View testID={testID} style={styles.row}>
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
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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
   * `padding: 9px 0`, two lines 4 apart, and no hairline anywhere. No fixed
   * height, so the row grows with the reader's text setting instead of
   * clipping a date at 120%.
   */
  row: { paddingVertical: z(9), gap: z(4) },
  pressed: { opacity: 0.6 },

  head: { flexDirection: 'row', alignItems: 'center', gap: z(10) },
  date: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(19), flexShrink: 1 },
  /*
   * NEVER SHRINKS. The date may give — it is a word — and a figure may not:
   * left to shrink, "−$12,000" came apart into a dash on one line and an
   * amount on the next, which reads as two things. See B18.
   */
  net: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontFamily: 'head',
    fontSize: z(16.5),
    fontWeight: '700',
    lineHeight: z(19),
  },
  sat: { marginLeft: 'auto', flexShrink: 0, fontSize: z(13), fontWeight: '400', lineHeight: z(19) },

  /*
   * IT WRAPS. The board draws one line and at its own figures it is one; a
   * club with a long name beside a nine-player night at 120% text is not, and
   * a wrapped pair is still a whole pair where a clipped one is a fact nobody
   * can read.
   */
  annotation: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: z(7), rowGap: z(3) },
  group: { flexShrink: 1, minWidth: 0 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: z(3) },
  figure: { fontSize: z(11.5), fontWeight: '400', lineHeight: z(15) },
});

/*
 * Every figure under seven digits prints in full; past that `formatSignedToFit`
 * goes compact rather than clipped. A lifetime of nights is added up on the
 * card above this list, not on a row of it.
 */
const ROW_FITS = 1_000_000;
