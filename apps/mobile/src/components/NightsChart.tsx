import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Money } from '@poker-club/core';
import { formatSigned } from '../lib/money';
import { largestResult, plotBar } from '../lib/nightsChart';
import { useTheme } from '../design/useTheme';
import { cappedFigure, tabular, unscaledLabel } from '../design/tokens';

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
 * NOTHING ELSE REACTS. The period figure, Last games and the stat pairs are
 * unaffected: the tap is a read, not a filter.
 */

export interface ChartNight {
  id: string;
  /** `15 Aug` — the label under the column. The caller formats it. */
  label: string;
  net: Money;
}

/** The drawable band on ONE side of the baseline. */
const BAND = 38;
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
    <View style={[styles.card, { borderColor: t.hairline }]}>
      <View style={styles.head}>
        {/* THE TWO CROSS-FADE IN PLACE. Both are always laid out — the caption
            holds the row's height and the figure is absolute over its right
            end — so nothing moves when they swap. */}
        <Animated.Text
          style={[styles.caption, { color: t.muted, opacity: fade.interpolate(FLIP) }]}
          {...unscaledLabel}
        >
          {caption}
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
        {nights.map((night) => {
          const bar = plotBar(night.net, peak, BAND);
          const on = night.id === selected;
          /* EVERY BAR BUT THE TAPPED ONE DROPS TO 34% WHILE A TAP IS LIVE —
             and the break-even mark never does: four points of mark cannot
             survive being dimmed. */
          const dimmed = selected !== null && !on && bar.side !== 'even';
          const paint =
            bar.side === 'even' ? t.breakEven : night.net > 0 ? t.win : t.loss;

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
                {(bar.side === 'above' || bar.side === 'even') && (
                  <View
                    style={[
                      styles.bar,
                      styles.barAbove,
                      { height: bar.height, backgroundColor: paint, opacity: dimmed ? 0.34 : 1 },
                    ]}
                  />
                )}
              </View>

              {/* THE BASELINE IS PER COLUMN, so a tap can brighten its own
                  slice and nothing else — the handoff's *"the tapped column's
                  slice only"*. */}
              <View
                style={[styles.baseline, { backgroundColor: on ? t.baselineTapped : t.hairline }]}
              />

              <View style={styles.below}>
                {(bar.side === 'below' || bar.side === 'even') && (
                  <View
                    style={[
                      styles.bar,
                      styles.barBelow,
                      { height: bar.height, backgroundColor: paint, opacity: dimmed ? 0.34 : 1 },
                    ]}
                  />
                )}
              </View>

              <Text
                style={[on ? styles.labelOn : styles.label, { color: on ? t.text : t.muted }]}
                numberOfLines={1}
                {...unscaledLabel}
              >
                {night.label}
              </Text>

              {/* THE ONLY COLUMN THAT LABELS ITSELF, because it is the only one
                  whose height says nothing. 2 points above its upper mark. */}
              {bar.side === 'even' && (
                <Text style={[styles.zero, tabular, { color: t.breakEven }]} {...cappedFigure}>
                  {formatSigned(0 as Money)}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The readout takes the night's own colour, and yellow at exactly nothing. */
function figureColour(net: Money, t: ReturnType<typeof useTheme>): string {
  if (net === 0) return t.breakEven;
  return net > 0 ? t.win : t.loss;
}

/** The caption is opaque when the figure is not, and the other way round. */
const FLIP = { inputRange: [0, 1], outputRange: [1, 0] };

const styles = StyleSheet.create({
  /* `0 20px 12px` · `14px 14px 10px` · radius 12, 1px hairline. */
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 8,
    minHeight: 22,
  },
  caption: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  readout: { marginLeft: 'auto', fontSize: 14, fontWeight: '700' },

  plot: { flexDirection: 'row', alignItems: 'stretch', gap: 4, paddingHorizontal: 2 },
  column: { flex: 1, alignItems: 'center' },
  above: { height: BAND, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  below: { height: BAND, width: '100%', alignItems: 'center', justifyContent: 'flex-start' },
  baseline: { height: 1, width: '100%' },
  bar: { width: 15 },
  barAbove: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barBelow: { borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },

  label: { fontSize: 9.5, fontWeight: '500', paddingTop: 4 },
  labelOn: { fontSize: 9.5, fontWeight: '600', paddingTop: 4 },
  /* Above its own upper mark, which is `BAND` from the top of the column. */
  zero: { position: 'absolute', top: BAND - 20, fontSize: 14, fontWeight: '700' },
});
