import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text } from 'react-native';
import { useTheme } from '../design/useTheme';
import { radius, type } from '../design/tokens';
import { JUST_ADDED_FADE_MS, JUST_ADDED_MS } from '../lib/justAdded';

/**
 * THE SAME SENTENCE, ON THE SCREEN THE MONEY MOVED ON.
 *
 * The player card closes itself after a quick rebuy, so by the time the host
 * looks up they are on Tonight and the confirmation they were reading has gone
 * with the sheet. That is the whole reason this exists — the owner's
 * instruction, 5 September: the "Petr added…" line has to appear here too,
 * *because* the sheet is auto-closed.
 *
 * AND IT IS DOING A SECOND JOB THAT MATTERS MORE. Tonight sorts by money in,
 * so a rebuy MOVES the row — Petr goes fourth to first while nobody is
 * looking. `session.tsx` accepts that cost in as many words ("the row under
 * the host's thumb is not the row that was there a moment ago"). The strip
 * names who moved and the row itself carries the same wash for the same two
 * seconds, so the reorder can be followed instead of merely survived.
 *
 * TWO SECONDS, THEN IT FADES — and the clock starts HERE, when this mounts,
 * not when the row was written. The mark is cleared by `onDone` rather than
 * expiring on its own timestamp: see `justAdded.ts`, which explains why the
 * reader's clock is the honest one.
 *
 * NO SIGNED FIGURE IN HERE, EVER. This is a translucent block, and a signed
 * figure inside one is what `ui-audit.mjs` calls a `tinted-result-row` — the
 * B23 rule, that a green wash behind a signed number says in colour what the
 * sign already says. `added $500` is a movement, `+$500` would be a result.
 * The distinction is the whole licence for the colour being here at all.
 *
 * ⚠ NOT DRAWN. No board has a strip on Tonight; `08-tonight-home.md` draws
 * the screen with the dock directly under the list. The words are the sheet's
 * own, minus the half that named a destination the reader has already arrived
 * at.
 */
export function JustAddedStrip({
  lead,
  figure,
  detail,
  onDone,
}: {
  /** "Petr added" — `addedLead`, shared with the sheet so the two agree. */
  lead: string;
  /** The amount, already formatted, and never signed. See above. */
  figure: string;
  /** Where it leaves them: "in for $2,000". */
  detail: string;
  /** Called once it has faded. Clears the mark. */
  onDone: () => void;
}) {
  const t = useTheme();
  const fade = useRef(new Animated.Value(1)).current;

  /* Read at the end rather than captured at the start — `Handoff` explains
     why: an inline arrow would restart the timer on every store emit, and on
     this screen the store emits whenever anything about the night changes. */
  const exit = useRef(onDone);
  useEffect(() => {
    exit.current = onDone;
  });

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${lead} ${figure}. ${detail}`);

    const run = Animated.sequence([
      Animated.delay(JUST_ADDED_MS),
      Animated.timing(fade, {
        toValue: 0,
        duration: JUST_ADDED_FADE_MS,
        easing: Easing.out(Easing.quad),
        /* Opacity alone, so this one CAN go to the native driver — unlike the
           sheet's sweep, which animates a width. */
        useNativeDriver: true,
      }),
    ]);
    run.start(({ finished }) => {
      if (finished) exit.current();
    });
    return () => run.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.strip,
        { backgroundColor: t.winTint, borderColor: t.winEdge, opacity: fade },
      ]}
    >
      {/* The name gives, the figure never does — the rule every row in this
          app follows. */}
      <Text style={[styles.lead, { color: t.win }]} numberOfLines={1}>
        {lead}
      </Text>
      <Text style={[styles.figure, { color: t.win }]} numberOfLines={1}>
        {figure}
      </Text>
      <Text style={[styles.detail, { color: t.win }]} numberOfLines={1}>
        {detail}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /*
   * A BAND, NOT A CARD. Radius 8 — the pressable radius, which is what every
   * inset block on this screen uses — and 11/14 of padding, so it sits between
   * a list row and the dock without competing with either. It is never
   * tappable: `pointerEvents="none"` above, because the dock's Rebuy is
   * directly under it and a strip that swallowed that tap for two seconds
   * would be worse than no strip.
   */
  strip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  lead: { ...type.dockLabel, fontWeight: '700', flexShrink: 1 },
  figure: { ...type.dockLabel, fontWeight: '700', flexShrink: 0, fontVariant: ['tabular-nums'] },
  /* Pushed to the right edge, quieter, and the first thing to go when a long
     name needs the room. */
  detail: { ...type.dockEndSub, marginLeft: 'auto', flexShrink: 1, opacity: 0.8 },
});
