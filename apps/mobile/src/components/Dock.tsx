import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../design/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { L, T, z } from '../design/scale';
import { Icon } from './Icon';

/**
 * How long the end-of-night row has to be held.
 *
 * 1.5s since `design/handoff-game-admin/` (26 September): rev 7's D9 drew it at
 * 1s and the brief asked for Take back at 1s, and the boards draw both at 1.5s
 * — "so the app has one hold". `HoldButton` is the same number.
 */
export const HOLD_MS = 1500;

/**
 * The dock — 08-tonight-home.md.
 *
 * One component on every session screen, holding the two actions a host
 * touches every half hour and hiding the three they touch once. The collapsed
 * disclosure row is a 46px target with 14px of clearance above the primary, so
 * a thumb reaching for admin cannot land on Rebuy.
 *
 * Ending a night takes two deliberate acts — open the drawer, then hold — and
 * there is NO TAP PATH to it anywhere in the app. That is the whole reason the
 * drawer exists: the destructive thing has to be harder to reach than the
 * thing you do twelve times a night.
 *
 * `variant` inverts the pair for an empty table: seating becomes the primary
 * and Bill goes dead, because there is nothing to split until somebody is in
 * for something.
 *
 * `waiting` is N11's count of entries the queue is still holding. It takes the
 * hint's place rather than sitting beside it: the hint says what is behind the
 * row, which a host learns once, and the count says the table is looking at an
 * older night than this phone is, which is news every time.
 */
export function Dock({
  variant = 'resting',
  waiting = 0,
  open,
  onOpenChange,
  onRebuy,
  onBill,
  onSeat,
  onCashOut,
  onRules,
  onPass,
  onEnd,
}: {
  variant?: 'resting' | 'empty-table';
  /** Entries written down here that the rest of the table cannot see yet. */
  waiting?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRebuy: () => void;
  onBill: () => void;
  onSeat: () => void;
  onCashOut: () => void;
  /**
   * Tonight's money rules — O4.
   *
   * ⚠ NOT DRAWN ON T3, and flagged rather than quietly added: the drawer is
   * drawn with three rows. But `09-navigation.md` says money rules open "from
   * O1, or Tonight", and no control for it is drawn on Tonight either — so the
   * screen the design says must be reachable while a night runs had no way in
   * at all, and a rule nobody can turn off is a rule that takes money at 1am
   * whatever the room has just agreed. The drawer is where this app already
   * keeps the host-only things you touch once a night, which is what this is.
   */
  onRules: () => void;
  /**
   * Pass the game — `design/handoff-game-admin/` state 1. The fourth row,
   * directly above End, the same size and weight as Seat and Cash out: no
   * sub-line, no highlight, and nothing about what passing costs, because it
   * costs nothing (state 2). Absent, the row is not drawn — a phone that
   * cannot pass sees no greyed-out row (`12-the-group.md` § 4.1).
   */
  onPass?: () => void;
  onEnd: () => void;
}) {
  const t = useTheme();
  const empty = variant === 'empty-table';

  /* The hold, and whether it is under way — the row's copy changes with it. */
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!open) {
      progress.stopAnimation();
      progress.setValue(0);
      setHolding(false);
    }
  }, [open, progress]);

  function startHold() {
    setHolding(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      // A width cannot be driven natively, and the wipe IS the feedback.
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      setHolding(false);
      progress.setValue(0);
      onEnd();
    });
  }

  /** Releasing early reverts with no dialog, no toast and no ledger write. */
  function cancelHold() {
    progress.stopAnimation();
    progress.setValue(0);
    setHolding(false);
  }

  const primaryLabel = empty ? 'Seat a player' : 'Rebuy';
  const insets = useSafeAreaInsets();

  /*
   * THE FULL BOARD (`session`, `session-admin`, approved): the dock is the ink
   * bar. A disclosure row (Table admin, and what is behind it), the drawer's
   * rows on the same ink when it is open, and the pair as the bar's two
   * actions — Rebuy wide, Bill a named secondary at its right (the kit's
   * `barSplit`, `drawerRow`). No chevrons.
   */
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: t.bar, paddingBottom: Math.max(insets.bottom, L.barFloor) },
        t.barShadow !== 'none' && { boxShadow: t.barShadow },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => onOpenChange(!open)}
        style={({ pressed }) => [styles.disclosure, { boxShadow: `inset 0px -1px 0px 0px ${t.barRule}`, opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name={open ? 'chevronDown' : 'chevronUp'} color={t.onTopMuted} size={z(16)} />
        <Text style={[styles.label, { color: t.onTopMuted }]}>Table admin</Text>
        {!open &&
          (waiting > 0 ? (
            <Text style={[styles.waiting, { color: t.onBar }]}>
              {waiting} waiting
            </Text>
          ) : (
            <Text style={[styles.hint, { color: t.onTopMuted }]}>
              {onPass === undefined ? 'seat · cash out · end' : 'seat · cash out · pass · end'}
            </Text>
          ))}
      </Pressable>

      {open && (
        <View>
          <DrawerRow icon="person" label="Seat a player" onPress={onSeat} dim={holding} />
          <DrawerRow icon="cashOut" label="Cash out a player" onPress={onCashOut} dim={holding} />
          <DrawerRow icon="rules" label="Money rules" onPress={onRules} dim={holding} />
          {onPass !== undefined && (
            <DrawerRow icon="pass" label="Pass the game" onPress={onPass} dim={holding} />
          )}

          {/* The only way to end a night. Press and keep pressing: the row fills
              as it is held, its words in the bar's red (the kit's `hold`). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End this poker night. Hold for a second and a half."
            onPressIn={startHold}
            onPressOut={cancelHold}
            style={[styles.end, { boxShadow: `inset 0px -1px 0px 0px ${t.barRule}` }]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.wipe,
                {
                  backgroundColor: t.dangerWipe,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Icon name="clock" color={t.onBar} size={z(18)} />
            <View style={styles.endText}>
              <Text style={[styles.endLabel, { color: holding ? t.onBar : t.onBarDanger }]}>
                {holding ? 'Keep holding…' : 'End this poker night'}
              </Text>
              <Text style={[styles.endSub, { color: t.onBarMuted }]}>
                {holding ? 'Release to cancel' : 'Hold 1.5s · counting starts, no rebuys'}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Live even with the drawer open — the pair is why the dock is here. */}
      <View style={[styles.pair, holding && styles.dimmed]}>
        <Pressable
          accessibilityRole="button"
          onPress={empty ? onSeat : onRebuy}
          style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name={empty ? 'person' : 'plus'} color={t.onBar} size={z(20)} />
          <Text style={[T.lookBar, { color: t.onBar }]} numberOfLines={1}>{primaryLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: empty }}
          disabled={empty}
          onPress={onBill}
          style={({ pressed }) => [
            styles.bill,
            { boxShadow: `inset 1px 0px 0px 0px ${t.barRule}`, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="receipt" color={empty ? t.onBarDead : t.onBar} size={z(20)} />
          <Text style={[T.lookBarSecondary, { color: empty ? t.onBarDead : t.onBar }]}>Bill</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DrawerRow({
  icon,
  label,
  onPress,
  dim,
}: {
  icon: 'person' | 'cashOut' | 'rules' | 'pass';
  label: string;
  onPress: () => void;
  dim: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { boxShadow: `inset 0px -1px 0px 0px ${t.barRule}`, opacity: dim ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} color={t.onBar} size={z(18)} />
      <Text style={[styles.rowLabel, { color: t.onBar }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { flexShrink: 0 },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(8),
    paddingTop: z(11),
    paddingBottom: z(9),
    paddingHorizontal: z(22),
  },
  label: { fontSize: z(14), fontWeight: '600', flex: 1 },
  hint: { fontSize: z(12), marginLeft: 'auto' },
  waiting: { fontSize: z(12.5), fontWeight: '700', marginLeft: 'auto' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(12),
    minHeight: z(48),
    paddingHorizontal: z(22),
  },
  rowLabel: { fontSize: z(15), fontWeight: '600' },

  end: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(12),
    minHeight: z(58),
    paddingHorizontal: z(22),
    overflow: 'hidden',
  },
  wipe: { ...StyleSheet.absoluteFill, right: undefined },
  endText: { gap: z(3), flexShrink: 1 },
  endLabel: { fontSize: z(15), fontWeight: '700' },
  endSub: { fontSize: z(12) },

  pair: { flexDirection: 'row' },
  dimmed: { opacity: 0.4 },
  primary: {
    flex: 1,
    height: L.barHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: z(8),
    paddingHorizontal: z(14),
  },
  bill: {
    width: L.barSecondaryWidth,
    height: L.barHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: z(3),
  },
});
