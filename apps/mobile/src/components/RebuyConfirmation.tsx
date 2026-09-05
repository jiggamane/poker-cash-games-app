import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PlayerId } from '@poker-club/core';
import { formatSignedToFit, formatToFit } from '../lib/money';
import { voidEntry } from '../lib/nightStore';
import { Icon } from './Icon';
import {
  BAR_LEAVE_MS,
  BAR_IN_MS,
  TAG_FADE_MS,
  TAG_IN_MS,
  takeAnnouncement,
  useRebuyAnnouncement,
} from './rebuyAnnouncement';
import { useTheme } from '../design/useTheme';
import { cappedFigure, radius } from '../design/tokens';

/**
 * THE REBUY IS CONFIRMED ON TONIGHT, NOT IN THE SHEET IT WAS TAPPED IN.
 * `design_handoff_rebuy_and_results/` Part 1, board `RB-E Table total`.
 *
 * What this replaces. Until now the confirmation happened inside the player
 * card: the primary the thumb was on became a status naming the act, a sweep
 * drained across it for 1.1s, and the sheet dismissed itself — `Handoff.tsx`,
 * 3 September, now deleted. That solved the half of the problem it was pointed
 * at (the host was left holding a card they had finished with) and left the
 * other half exactly where it was: the confirmation was drawn on the screen
 * that was leaving, so the last thing the host saw of the rebuy was a sentence
 * about it, and the FIGURE it moved was on the screen underneath, unwatched.
 *
 * The handoff moves the whole confirmation onto the screen the money is on,
 * and there are three parts of it going at once:
 *
 *   - `+$500` beside *On the table*, as that figure changes. The confirmation
 *     IS the money moving, in the largest type on the screen — it reads from
 *     across a room, which is where a host usually is.
 *   - `+$500` as a tag beside the player's name, so the amount and the person
 *     are confirmed in one glance.
 *   - this bar, above the dock, holding **Undo** for two seconds.
 *
 * AND UNDO IS WHY THE HOLD IS GONE. `HoldButton` guarded a write that lands
 * without asking — a tap was judged too cheap for five people's money. The bar
 * guards the same write from the other side, and better: a hold can only stop
 * a rebuy nobody has made yet, and Undo reverses one that is already in the
 * ledger, including one made by a thumb that never meant to. The handoff draws
 * the sheet's primary as a tap, and the rapid-tap rule below only exists
 * because it is one.
 *
 * NOTHING HERE IS A DELETE. Undo writes a void against every entry the bar is
 * carrying — `voidEntry`, the same append-only path `/entry` uses — so the
 * rebuy and its reversal both stay in the night's record. Two people watching
 * the ledger see what happened and what took it back.
 *
 * THE FADE REMOVES THE ANNOUNCEMENT, NOT THE FACT. Both tags fade to nothing
 * over two seconds and the bar leaves after them; the row, the figure and the
 * card's total keep their new values, because they are read off the store and
 * were never part of the announcement in the first place.
 */

/**
 * Undo — a void per entry, and the bar goes at once.
 *
 * NOTHING HERE DELETES ANYTHING. The ledger is append-only on the device and
 * on the server, so taking a rebuy back is a VOID ROW against it —
 * `voidEntry`, the same call `/entry`'s own "Void this entry" makes, and the
 * same one `voidSpend` makes for a bill. The rebuy stays in the night's record
 * with its reversal underneath, which is what lets four other people see what
 * happened rather than watch a figure quietly change.
 *
 * TWO COLLAPSED TAPS ARE TWO VOIDS. The bar carries every entry it announced
 * and reverses all of them, in the order they were written.
 *
 * ⚠ A FAILED VOID IS NOT DRAWN, and is not invented here — the same position
 * `/entry` and the quick rebuy already take with a write that does not land.
 * The figures simply do not move, and the entry is still on the player's card
 * one tap away. Copy for it is a thing to ask for.
 */
export async function undoRebuy(): Promise<void> {
  const it = takeAnnouncement();
  if (it === null) return;
  for (const id of it.entryIds) await voidEntry(id);
}

/* ---------------------------------------------------------------------------
 * Movement, and the reader who has asked for less of it
 * ------------------------------------------------------------------------- */

/**
 * Whether the phone has asked for reduced motion.
 *
 * WHAT IT TAKES AWAY IS THE TRAVEL, NEVER THE TIME. The slide, the rise and
 * the scale go; the two seconds do not, because those two seconds are how long
 * Undo is reachable and shortening them would take a control away from the
 * reader who asked for less movement. The tags still fade — a fade is not
 * motion — so the announcement still ends by itself.
 */
function useCalm(): boolean {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setCalm(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setCalm);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return calm;
}

/* ---------------------------------------------------------------------------
 * The four drawn parts
 * ------------------------------------------------------------------------- */

/**
 * A tag's whole life: in over 180ms, full strength on arrival, then a straight
 * two-second fade to nothing.
 *
 * TWO VALUES AND NOT ONE, because the way in and the way out are different
 * shapes. `inOut` carries the travel — the slide, the scale — and stays at 1
 * once it has arrived; `fade` takes the opacity down on its own. A single value
 * run back to zero would slide the tag back out the way it came in, and the
 * board is explicit that the exit has no movement in it.
 *
 * The clock is the handoff's table: 180 in, 120 of hold, 2000 of fade — full
 * strength at ~300ms from the tap, gone at ~2300, which is where the bar
 * starts leaving.
 */
function useTagLife(stamp: number | undefined, calm: boolean) {
  const inOut = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (stamp === undefined) return;
    inOut.setValue(0);
    fade.setValue(1);
    const run = Animated.sequence([
      Animated.timing(inOut, {
        toValue: 1,
        duration: calm ? 0 : TAG_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 0,
        delay: 120,
        duration: TAG_FADE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);
    run.start();
    return () => run.stop();
  }, [stamp, calm, inOut, fade]);

  return { inOut, opacity: Animated.multiply(inOut, fade) };
}

/**
 * `+$500` beside the *On the table* figure — the board's own values: 20/800,
 * `-.03em`, tabular, the win colour, slid 10 from the left and then faded to
 * nothing over the two seconds.
 *
 * ⚠ THE FIGURE IT SITS BESIDE IS 44 HERE AND 34 ON THE BOARD. Tonight is drawn
 * at this app's scale — `08-tonight-home.md` rev 11 — so the tag reads
 * proportionally smaller than the board's beside it. The board's absolute value
 * is kept rather than scaled up, because 26/800 next to a 44 headline is a
 * second headline.
 *
 * ⚠ AND ON THE NARROWEST PHONE THERE IS NO ROOM FOR IT AT ALL — the same ten
 * points of headline, arriving as a bill. Measured in the built app at 360: the card's inside is 288, the right-hand column takes 90 of it and
 * up to 130 with `$99,999 in play` on it, and `$4,500` at 44/800 is 124 — which
 * leaves 32 for a tag that needs 55. At 393, the width every board is drawn at,
 * there are 84 and it fits.
 *
 * So the card measures itself and the tag is drawn WHERE IT FITS. The rule it
 * is obeying is the handoff's own, stated twice: the confirmation may cover
 * chrome and never money, and the right-hand column of that card is money. Two
 * of the three confirmations are unaffected — the row's tag and the bar — and
 * the figure itself still changes, which is the fact rather than the
 * announcement of it. `docs/screens.md` carries what would buy it back, and
 * both answers are somebody else's file: Tonight's headline at the board's 34,
 * or that right-hand column narrower.
 */
export function TotalTag({ fits, room }: { fits: number; room: number }) {
  const t = useTheme();
  const it = useRebuyAnnouncement();
  const calm = useCalm();
  const { inOut, opacity } = useTagLife(it?.token, calm);

  if (it === null) return null;

  const figure = formatSignedToFit(it.amount, fits);
  /*
   * What the tag needs, from the same measurement above: `+$500` came out at
   * 53.2 points at 20/800 tabular, which is 10.6 a glyph, and `cappedFigure`
   * lets a reader grow it by a further tenth. Deliberately an over-estimate —
   * the cost of hiding a tag that would just have fitted is nothing, and the
   * cost of drawing one that does not is a figure across a figure.
   */
  if (room < figure.length * 11.7) return null;

  return (
    <Animated.Text
      /* Nothing to read here that the figure beside it does not say: a screen
         reader is told the whole sentence by the bar, once. */
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      numberOfLines={1}
      {...cappedFigure}
      style={[
        styles.totalTag,
        { color: t.win },
        {
          opacity,
          transform: [
            { translateX: inOut.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
          ],
        },
      ]}
    >
      {figure}
    </Animated.Text>
  );
}

/**
 * The same `+$500` as a tag beside the name — 11.5/700 on the win colour at
 * 14%, radius 4, `2 6`. In it slides 6 from the left and scales 0.9 → 1.
 *
 * IT IS DRAWN BY THE ROW, so it goes where the row goes. Tonight sorts the
 * seated group by what people are in for, and a rebuy is exactly the thing
 * that moves a row up that list — a tag pinned to a position instead of to a
 * player would land on whoever was pushed down into the old one.
 */
export function NameTag({ playerId, fits }: { playerId: PlayerId; fits: number }) {
  const t = useTheme();
  const it = useRebuyAnnouncement();
  const calm = useCalm();
  const mine = it !== null && it.playerId === playerId;
  const { inOut, opacity } = useTagLife(mine ? it.token : undefined, calm);

  if (!mine) return null;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.nameTag,
        { backgroundColor: t.winTint },
        {
          opacity,
          transform: [
            { translateX: inOut.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
            { scale: inOut.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        },
      ]}
    >
      <Text style={[styles.nameTagText, { color: t.win }]} numberOfLines={1} {...cappedFigure}>
        {formatSignedToFit(it.amount, fits)}
      </Text>
    </Animated.View>
  );
}

/**
 * THE ROW IT WROTE, ON THE PLAYER CARD — the fourth part, and the only one not
 * on Tonight.
 *
 * The owner asked for the last rebuy entry to be shown in colour on the player
 * sheet, and then for the mark to fade after two seconds. This is both, off
 * this file's own store and this file's own clock, so there is exactly one
 * announcement in the app and it cannot disagree with itself.
 *
 * WHY IT IS WORTH DRAWING AT ALL, given the sheet is gone by ~300ms. Not for
 * the way out — nobody reads it there. It is for the way BACK IN: a host who
 * taps the same player again inside the two seconds, which is the "did that
 * land?" reflex, opens the card with the entry that just landed already marked.
 * The alternative was a permanent marker on the newest rebuy, which would have
 * been a fifth thing with its own rules and no fade.
 *
 * IDENTIFIED BY ID, NEVER BY GUESSING. `entryIds` is on the announcement
 * because Undo needs it, and it is exactly what this needs too: "the newest
 * rebuy" is a guess, and a wrong guess marks somebody else's money. Both ids
 * light up when two taps have collapsed into one bar.
 *
 * A WASH BEHIND THE ROW, not opacity on the row. Fading the row itself would
 * take the time, the words and the figure down with the colour, and the figure
 * is the one thing on that line that must stay readable throughout.
 */
export function FreshEntryWash({ entryId }: { entryId: string | undefined }) {
  const t = useTheme();
  const it = useRebuyAnnouncement();
  const calm = useCalm();
  const mine = it !== null && entryId !== undefined && it.entryIds.includes(entryId);
  const { opacity } = useTagLife(mine ? it.token : undefined, calm);

  if (!mine) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.freshWash, { backgroundColor: t.winWash, opacity }]}
    />
  );
}

/**
 * The bar: check, what happened, Undo.
 *
 * IT CLEARS THE DOCK RATHER THAN COVERING IT, which the handoff says twice and
 * is the whole of why it sits where it does — a second rebuy stays one tap
 * away while the bar is up. It is drawn as the dock's own sibling and hung off
 * the top of it (`bottom: '100%'`), so it rises with the drawer instead of
 * being a number that has to be kept in step with one.
 *
 * The rule above it is the handoff's: confirmation may cover chrome, and never
 * money. Everything between here and the top of the phone is the table.
 */
export function RebuyBar() {
  const t = useTheme();
  const it = useRebuyAnnouncement();
  const calm = useCalm();
  const rise = useRef(new Animated.Value(0)).current;
  const stamp = it?.token;
  const leaving = it?.leaving === true;

  /* Both sentences are the handoff's, word for word — the second is what two
     taps inside two seconds collapse into. The figure is unsigned here and
     signed on the tags: a tag is a change to a figure beside it, and this is a
     sentence about an amount of money. */
  const line =
    it === null
      ? ''
      : it.entryIds.length > 1
        ? `${it.name} rebought ${formatToFit(it.amount, BAR_FITS)} · ${it.entryIds.length} entries`
        : `Rebuy ${formatToFit(it.amount, BAR_FITS)} added to ${it.name}`;

  useEffect(() => {
    if (stamp === undefined) return;
    /*
     * SAID OUT LOUD. A live region covers Android and the web; iOS VoiceOver
     * has no equivalent for a view that appears under a screen the reader is
     * already on, so the sentence is announced as well. The block this
     * replaces took the same pair for the same reason.
     */
    AccessibilityInfo.announceForAccessibility(line);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  useEffect(() => {
    if (stamp === undefined) return;
    const run = Animated.timing(rise, {
      toValue: 1,
      duration: calm ? 0 : BAR_IN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [stamp, calm, rise]);

  useEffect(() => {
    if (!leaving) return;
    const run = Animated.timing(rise, {
      toValue: 0,
      duration: BAR_LEAVE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [leaving, rise]);

  if (it === null) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        { borderColor: t.winEdge, backgroundColor: t.ground },
        {
          opacity: rise,
          transform: calm
            ? []
            : [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      {/*
       * `#1E2620` on the board, and this app has no token for it. It is the
       * win colour at about 15% over the ground, which is `winTint` (14%) to
       * within a point — so the fill is drawn as the two layers it already is
       * rather than as a fifteenth green in `tokens.ts`. The ground underneath
       * is what makes it opaque: the table must not be legible through a bar
       * that is covering it.
       */}
      <View style={[StyleSheet.absoluteFill, styles.barTint, { backgroundColor: t.winTint }]} />
      {/* The board's own check, at the board's own 18: `Icon`'s `check` is the
          path `M4.5 12.5l5 5 10-11`, which is the same string this bar is drawn
          with. Its stroke is the icon set's 2.2 rather than the bar's 3 — a
          weight in `Icon.tsx` is shared by every screen in the app, and one is
          not worth reopening a shared component for. */}
      <Icon name="check" color={t.win} size={18} />
      <Text style={[styles.barLine, { color: t.text }]} numberOfLines={1}>
        {line}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={it.leaving}
        onPress={() => void undoRebuy()}
        style={({ pressed }) => [styles.undo, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.undoText, { color: t.win }]}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * The bar's figure abbreviates at the same place Tonight's card does, and for
 * the same reason: one sentence at 15/600 across 365 points has room for a
 * name and a figure, not for `$1,250,000`.
 */
const BAR_FITS = 10_000;

const styles = StyleSheet.create({
  /*
   * The wash behind a just-written entry row — `FreshEntryWash`.
   *
   * Inset PAST the list rather than inside it, which is what every washed block
   * in this app does: the 8 it takes on each side is the row's own 4 of padding
   * plus 4 of overhang, so it reads as a block behind the line rather than as a
   * highlighter over the words. Absolute, so it cannot move the row when it
   * arrives or goes — the entries list must not reflow while it fades.
   */
  freshWash: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -8,
    right: -8,
    borderRadius: radius.pressable,
  },
  /*
   * `left/right 14`, 48 tall, radius 12, `14 16`, gap 11 — the board. The 14
   * is the dock panel's own inset, so the two edges line up down the screen.
   *
   * `bottom: '100%'` hangs it off the top of the dock. The board puts its
   * bottom edge 8.5 above the panel; this is the panel's own 10 points of top
   * margin, which is the same air measured from the other side and cannot fall
   * out of step with the dock the day the dock changes.
   */
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    /* NOT `overflow: 'hidden'`, which is the reflex for a rounded box and would
       take the shadow with it — on iOS that flag is `masksToBounds`, and a
       masked layer draws nothing outside itself. The fill layer below rounds
       its own corners instead. */
    // `0 -6px 26px rgba(0,0,0,.5)` — it is the one thing in this app that
    // floats over the table, and the shadow is what says so.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 13,
    elevation: 12,
  },
  barTint: { borderRadius: 12 },
  barLine: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  /* Padded to 44 of target on a 48 bar — the board's own `12px 2px 12px 14px`
     with `-12` of margin, so the box it takes up is still the word. */
  undo: { marginLeft: 'auto', paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 2, marginVertical: -12, flexShrink: 0 },
  undoText: { fontSize: 15, fontWeight: '700' },

  /*
   * 20/800, `-.03em`, and 4 of top margin.
   *
   * The board aligns the tag's CAP with the figure's cap — `align-items:
   * flex-start` on two boxes whose leading differs. Here the figure is 44 on a
   * 44 line (cap top ≈ 10.6 into the box) and the tag is 20 on a 24 line (cap
   * top ≈ 6.8), so the tag is pushed the difference: 4, near enough.
   */
  totalTag: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 4,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },

  /*
   * `2 6`, radius 4, and 7 from the name — the board.
   *
   * The -11 buys that 7. `ActiveRow` lays out `name · fact · right` on a row
   * with `gap: 9`, and Tonight's rows draw no fact, so the empty Text between
   * the name and here costs a second gap: 18 where the board wants 7. The row
   * is a shared component and the tag is Tonight's alone, so the correction is
   * made at this end. If a fact ever appears on those rows, this goes with it.
   */
  nameTag: {
    marginLeft: -11,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    flexShrink: 0,
  },
  nameTagText: { fontSize: 11.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
