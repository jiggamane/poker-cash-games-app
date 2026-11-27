import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { type Money } from '@poker-club/core';
import { formatSigned } from '../lib/money';
import { largestResult, plotBar } from '../lib/nightsChart';
import { useTheme } from '../design/useTheme';
import { T, z } from '../design/scale';
import { cappedFigure, tabular, unscaledLabel } from '../design/tokens';
import { Card } from './Card';

/**
 * RESULT PER NIGHT — `design/handoff-sessions-stats/`, frames `2a` and `3a`,
 * cut 9 September. The one chart in the app.
 *
 * Eight columns over a 1px baseline: a 38-point band above it, a 38-point band
 * below, and the date under that. `nightsChart.ts` owns every height — a bar
 * computed inline is a bar nobody can test, and this is the only place in the
 * app where money is drawn as a SIZE rather than written down. If the size and
 * the money stop agreeing the chart lies quietly, which is worse than a wrong
 * number on screen because nobody proof-reads a rectangle.
 *
 * TAPPING A COLUMN READS IT OUT. The figure appears where the caption is, the
 * bar goes to full colour, its date label goes white and its slice of the
 * baseline brightens — all four together, and they leave together, so the graph
 * is never left holding a highlight with no number beside it.
 *
 * ONE STATE, ONE TIMER, counting from the LAST tap:
 *
 *     0ms          everything arrives; the caption cross-fades to the figure
 *                  over 120ms. No movement, no scale, no bounce.
 *     0 → 2750ms   the hold. Every new tap resets it; tapping a different bar
 *                  swaps the figure in place and moves the highlight, with
 *                  nothing fading out in between.
 *     → 3150ms     everything leaves together over 400ms.
 *
 * ⚠ THE INTERRUPTS ARE THE CALLER'S. A scroll of more than 8 points, a change
 * of group or period, or navigating away clears the readout immediately —
 * `selected` is a prop for exactly that reason, and `/stats` is where those
 * three things happen. A tap outside the plot is this component's, and it is
 * the one it can see.
 *
 * NO COLUMN STATES ITS FIGURE UNTIL IT IS TAPPED — the break-even night
 * included. The handoff had that column label itself `$0`, the only one whose
 * height says nothing; the owner ruled on 4 November that it reads the same way
 * as every other night: its mark says "level", and a tap says the figure
 * (B103), and the full board repeats it (no `$0` over the pill).
 * `nightsChart.contract.test.ts` holds that the readout is the only place a
 * figure is drawn.
 *
 * THE FULL BOARD'S `chart()` (`design/explorations/full-board/screens/
 * 70-sessions-stats-group.mjs`, `stats-book`), approved after the owner's
 * rounds of 23–24 November, and the drawing is the truth:
 *
 *   - wins are GREEN bars and losses RED (not the loss grey);
 *   - every bar STANDS ON THE LINE with no gap: square where it meets it,
 *     rounded only at its free end;
 *   - every bar is AT LEAST 8 TALL, so a small loss still reads as a red bar
 *     rather than a dash — `plotBar`'s floor, passed from here;
 *   - the break-even night is ONE thin grey pill, 3 tall and as wide as a bar,
 *     centred on the line — one piece, not the mark above and below that the
 *     owner called a hamburger.
 *
 * NOTHING ELSE REACTS. The period figure, Last games and the stat pairs are
 * unaffected: the tap is a read, not a filter.
 */

export interface ChartNight {
  id: string;
  /** `15 Aug` — the label under the column. The caller formats it. */
  label: string;
  net: Money;
}

/**
 * The drawable band on ONE side of the baseline. The board's 38, drawn in a
 * 266-wide viewBox that its card shows at 248 — so 35 on the board's phone,
 * then scaled to this one.
 */
const BAND = z(35.5);
/** No bar shorter than this, whatever the night (owner, 24 November: 8). */
const FLOOR = z(7.5);
/** A bar's width, and the break-even pill's: the board's 15 at the same 0.93. */
const BAR_W = z(14);
/** The break-even pill: 3 tall (owner, 24 November). */
const EVEN_H = z(3);
/** How long the readout holds after the last tap, and how long it takes to go. */
const HOLD = 2750;
const FADE_IN = 120;
const FADE_OUT = 400;

export function NightsChart({
  caption,
  nights,
  cleared,
}: {
  /** `LAST 8 NIGHTS`. Replaced by the figure while a night is being read. */
  caption: string;
  /** Oldest first — the order the columns are drawn in. */
  nights: readonly ChartNight[];
  /**
   * Bumped by the caller to clear the readout at once: a scroll, a change of
   * group or period. Any new value drops the selection with the same 400ms
   * fade and no hold.
   */
  cleared?: unknown;
}) {
  const t = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* One place the timer is cancelled, so no path can leave one running. */
  const stopTimer = (): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => stopTimer, []);

  /* THE INTERRUPT. `cleared` changing means the reader did something that makes
     the readout stale — it goes with the same fade and no hold. */
  useEffect(() => {
    if (selected === null) return;
    stopTimer();
    setSelected(null);
    Animated.timing(fade, {
      toValue: 0,
      duration: FADE_OUT,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
    // `selected` is deliberately not a dependency: this fires on the interrupt,
    // not on every selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleared]);

  const read = (id: string): void => {
    stopTimer();
    /* A REPEAT TAP RESETS THE TIMER AND DOES NOT RE-ANIMATE. The figure is
       already fully opaque, so `fade` is left where it is and only the clock
       starts again. */
    if (id !== selected) {
      setSelected(id);
      Animated.timing(fade, {
        toValue: 1,
        duration: FADE_IN,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
    timer.current = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_OUT,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setSelected(null);
      });
    }, HOLD);
  };

  const peak = largestResult(nights.map((n) => n.net));
  const shown = nights.find((n) => n.id === selected) ?? null;

  return (
    <Card pad style={styles.card}>
      <View style={styles.head}>
        {/* THE TWO CROSS-FADE IN PLACE. Both are always laid out — the caption
            holds the row's height and the figure is absolute over its right
            end — so nothing moves when they swap. */}
        <Animated.Text
          style={[T.lookLabel, { color: t.muted, opacity: fade.interpolate(FLIP) }]}
          {...unscaledLabel}
        >
          {caption.toUpperCase()}
        </Animated.Text>
        {shown !== null && (
          <Animated.Text
            testID="chart-readout"
            style={[
              styles.readout,
              tabular,
              { color: figureColour(shown.net, t), opacity: fade },
            ]}
            {...cappedFigure}
          >
            {formatSigned(shown.net)}
          </Animated.Text>
        )}
      </View>

      <View style={styles.plot}>
        {/* THE LINE IS ZERO AND IT RUNS THE CARD'S WIDTH, however few nights
            there are — the columns are left-aligned at an eighth each. */}
        <View style={[styles.line, { backgroundColor: t.hairline }]} />
        {nights.map((night) => {
          const bar = plotBar(night.net, peak, BAND, FLOOR);
          const on = night.id === selected;
          /* EVERY BAR BUT THE TAPPED ONE DROPS TO 34% WHILE A TAP IS LIVE —
             and the break-even pill never does: three points of mark cannot
             survive being dimmed. */
          const dimmed = selected !== null && !on && bar.side !== 'even';
          const paint = night.net > 0 ? t.win : t.red;
          const fill = { height: bar.height, backgroundColor: paint, opacity: dimmed ? 0.34 : 1 };

          return (
            <Pressable
              key={night.id}
              testID="chart-column"
              accessibilityRole="button"
              accessibilityLabel={`${night.label}, ${formatSigned(night.net)}`}
              onPress={() => read(night.id)}
              style={styles.column}
            >
              <View style={styles.above}>
                {bar.side === 'above' && <View style={[styles.bar, styles.barAbove, fill]} />}
              </View>

              {/* THE BASELINE IS PER COLUMN, so a tap can brighten its own
                  slice and nothing else — the handoff's *"the tapped column's
                  slice only"*. The bars meet it with no gap on either side. */}
              <View
                style={[styles.baseline, on && { backgroundColor: t.baselineTapped }]}
              >
                {bar.side === 'even' && (
                  <View style={[styles.even, { backgroundColor: t.muted }]} />
                )}
              </View>

              <View style={styles.below}>
                {bar.side === 'below' && <View style={[styles.bar, styles.barBelow, fill]} />}
              </View>

              <Text
                style={[on ? styles.labelOn : styles.label, { color: on ? t.text : t.muted }]}
                numberOfLines={1}
                {...unscaledLabel}
              >
                {night.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/**
 * THE CHART BEFORE THE FIRST NIGHT — `stats-empty` (owner, 25 November): the
 * same card with the chart's own shapes in the faint grey and no dates under
 * them, so a new player sees what fills in once they play. The heights are the
 * board's drawing, not anybody's money: nothing here is a night.
 */
export function ChartPlaceholder({ caption }: { caption: string }) {
  const t = useTheme();
  return (
    <Card pad style={styles.card}>
      <View style={styles.head} accessible accessibilityLabel={caption}>
        <Text style={[T.lookLabel, { color: t.muted }]} {...unscaledLabel}>
          {caption.toUpperCase()}
        </Text>
      </View>
      <View style={styles.plot} importantForAccessibility="no-hide-descendants">
        <View style={[styles.line, { backgroundColor: t.hairline }]} />
        {GHOST.map((h, i) => (
          <View key={i} style={styles.column}>
            <View style={styles.above}>
              {h > 0 && (
                <View style={[styles.bar, styles.barAbove, { height: z(h), backgroundColor: t.raised }]} />
              )}
            </View>
            <View style={styles.baseline} />
            <View style={styles.below}>
              {h < 0 && (
                <View style={[styles.bar, styles.barBelow, { height: z(-h), backgroundColor: t.raised }]} />
              )}
            </View>
            <Text style={styles.label} {...unscaledLabel}>{' '}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** The placeholder's shapes, from `ghostChart` on the board. */
const GHOST = [14, -8, 20, 6, -12, 26, 10, 32] as const;

/** The readout takes the night's own colour, and the pill's grey at exactly nothing. */
function figureColour(net: Money, t: ReturnType<typeof useTheme>): string {
  if (net === 0) return t.muted;
  return net > 0 ? t.win : t.red;
}

/** The caption is opaque when the figure is not, and the other way round. */
const FLIP = { inputRange: [0, 1], outputRange: [1, 0] };

const styles = StyleSheet.create({
  /* The kit's `card pad`, at `padding: 14px 14px 10px`. */
  card: { paddingTop: z(14), paddingHorizontal: z(14), paddingBottom: z(10) },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: z(8),
    paddingBottom: z(10),
    minHeight: z(22),
  },
  readout: { marginLeft: 'auto', fontFamily: 'head', fontSize: z(14), fontWeight: '700' },

  /* Eight columns across the card at a fixed width, left-aligned: one night
     takes an eighth, as the board's `CW = W / 8`. */
  plot: { flexDirection: 'row', alignItems: 'stretch' },
  column: { width: '12.5%', alignItems: 'center' },
  above: { height: BAND, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  below: { height: BAND, width: '100%', alignItems: 'center', justifyContent: 'flex-start' },
  line: { position: 'absolute', left: 0, right: 0, top: BAND, height: 1 },
  baseline: { height: 1, width: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  bar: { width: BAR_W },
  /* Square at the line, rounded only at the free end. */
  barAbove: { borderTopLeftRadius: z(3), borderTopRightRadius: z(3) },
  barBelow: { borderBottomLeftRadius: z(3), borderBottomRightRadius: z(3) },
  /* One pill through the line's own pixel, centred on it. */
  even: { position: 'absolute', width: BAR_W, height: EVEN_H, borderRadius: EVEN_H / 2 },

  label: { fontSize: z(9.5), fontWeight: '500', paddingTop: z(6) },
  labelOn: { fontSize: z(9.5), fontWeight: '600', paddingTop: z(6) },
});
