import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { cappedFigure, control, radius, type } from '../design/tokens';

/**
 * How long the status stays up before the screen hands itself back.
 *
 * The hold that writes the entry is 1s (`HoldButton`), and this is the other
 * half of the same second: long enough to read four words off a phone held at
 * arm's length, short enough that a host doing three rebuys in a row is never
 * waiting on it. Anything under about 700 is a flash nobody reads, and anything
 * over about two seconds is a screen the thumb starts trying to dismiss —
 * which is the touch this whole thing exists to remove.
 */
export const HANDOFF_MS = 1100;

/**
 * WHAT JUST HAPPENED, AND THE SCREEN LEAVING BY ITSELF.
 *
 * The quick rebuy commits from the player card with no amount screen in the
 * way, and it used to end there: the row appeared in ENTRIES, IN FOR went up,
 * and the host was left holding a sheet they had finished with. Two taps then
 * stood between a rebuy and the table — read the card, find the close — and at
 * a real table that is two taps taken with somebody's chips already counted
 * out in front of you.
 *
 * So the write's confirmation IS the way out. The filled primary the thumb is
 * already on becomes a status naming the act — who added how much, and what
 * they are in for now — a sweep drains across it, and the sheet dismisses
 * itself onto Tonight. Nothing is tapped after the hold is released.
 *
 * THE SWEEP DRAINS RATHER THAN FILLS, and that is the whole of how it is told
 * apart from the hold that came a moment before it. A wipe growing
 * left-to-right is the gesture being paid for; one shrinking away is time
 * running out on a screen that is leaving.
 *
 * IT IS A TINT, NOT A FILL, AND THAT IS THE ONE THING IT SAYS TWICE — 5
 * September, on the owner's instruction, and `tokens.ts` § Pill states the
 * rule it obeys: "an outline reads as a control, a tint reads as a state". The
 * hold is a control and is filled like one. The moment it completes there is
 * nothing left to press, so the block stops being drawn as a button at all:
 * the win colour at 12–14% behind an edge at 35%, which is what every other
 * state in this app is drawn as. The box, its radius and every dimension are
 * still `HoldButton`'s to the point, so what changes when the two swap is the
 * treatment and the words — never the shape, and never the position.
 *
 * GREEN, ON A REBUY, WITH THE COST STATED. `tokens.ts` opens by reserving
 * green and red for money won and money lost, and a rebuy is money IN, which
 * this app draws neutral everywhere else. The owner approved the green for
 * this animation specifically. What keeps it from reading as a WIN is that the
 * figure beside it is never signed: `Petr added $500`, not `+$500`. Do not
 * sign it. `ui-audit.mjs`'s `tinted-result-row` guard enforces exactly that
 * boundary — a signed figure inside a translucent row is a finding — and it is
 * the same distinction in code that this paragraph is in prose.
 *
 * ⚠ NOT DRAWN. No board has this state: `08-tonight-home.md` H3b draws the
 * hold and what a release before the end does, and nothing draws what the app
 * shows after the write lands, because until now it showed nothing. The copy
 * is flagged where it is composed — `player.tsx`, the quick rebuy.
 */
export function Handoff({
  lead,
  figure,
  detail,
  onDone,
}: {
  /** What happened, up to the figure: "Maja added". */
  lead: string;
  /** The figure itself, already formatted. It never shrinks; `lead` gives. */
  figure: string;
  /** One line under it — where they stand now, and where this is going. */
  detail: string;
  /** Called once the sweep has run out. Not called if the sheet leaves first. */
  onDone: () => void;
}) {
  const t = useTheme();
  const left = useRef(new Animated.Value(1)).current;

  /*
   * The exit is read at the END rather than captured at the start. The caller
   * writes `onDone={() => router.back()}`, which is a new function on every
   * render, and a dependency on it would restart the sweep each time the store
   * emits — a sheet that never quite leaves.
   */
  const exit = useRef(onDone);
  useEffect(() => {
    exit.current = onDone;
  });

  useEffect(() => {
    /*
     * SAID OUT LOUD, because this screen closes itself. A sighted host reads
     * the status; a VoiceOver one would otherwise be moved to a different
     * screen with nothing said about why. `accessibilityLiveRegion` below is
     * the same announcement on Android and on the web.
     */
    AccessibilityInfo.announceForAccessibility(`${lead} ${figure}. ${detail}`);

    const sweep = Animated.timing(left, {
      toValue: 0,
      duration: HANDOFF_MS,
      easing: Easing.linear,
      // A width cannot be driven natively, and the sweep IS the clock.
      useNativeDriver: false,
    });
    sweep.start(({ finished }) => {
      if (finished) exit.current();
    });
    /* Swiped down or closed mid-sweep: the timer goes with the sheet, so
       nothing pops a screen the host has already left. */
    return () => sweep.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: t.winTint, borderColor: t.winEdge }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sweep,
          {
            backgroundColor: t.win,
            width: left.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
      <View style={styles.line}>
        {/* The name gives and the figure does not — B18's rule, on the one row
            in this box where a long name and a big amount compete. */}
        <Text style={[styles.lead, { color: t.win }]} numberOfLines={1}>
          {lead}
        </Text>
        <Text style={[styles.figure, { color: t.win }]} numberOfLines={1} {...cappedFigure}>
          {figure}
        </Text>
      </View>
      <Text style={[styles.detail, { color: t.win }]} numberOfLines={1}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * `HoldButton`'s box, to the point — same height, radius, gap and padding.
   * The two swap places inside one footer and a single point of difference
   * would read as the screen jumping.
   *
   * The edge is the ONE addition, and it costs nothing: a 1px border draws
   * inside the box in React Native, so the block is still exactly 56 tall and
   * still ends where the hold ended.
   */
  box: {
    minHeight: control.height,
    borderRadius: radius.pressable,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 9,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  /* Quieter than the hold's 18%: that one is drawn over a solid fill, this one
     over a 12% tint, and the same alpha on top of it reads as a second block. */
  sweep: { ...StyleSheet.absoluteFillObject, right: undefined, opacity: 0.14 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 6, maxWidth: '100%' },
  lead: { ...type.body, fontWeight: '700', flexShrink: 1 },
  figure: { ...type.body, fontWeight: '700', flexShrink: 0, fontVariant: ['tabular-nums'] },
  /* .78 rather than the hold's .62 — the detail is coloured text on a tint
     here, not white on ink, and it goes under the contrast floor below this. */
  detail: { ...type.dockEndSub, opacity: 0.78 },
});
