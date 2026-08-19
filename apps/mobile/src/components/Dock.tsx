import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { type } from '../design/tokens';
import { Icon } from './Icon';

/** How long the end-of-night row has to be held. Rev 7, D9. */
const HOLD_MS = 1500;

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

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: t.surface,
          borderColor: open ? t.drawerEdge : t.hairline,
          gap: open ? 12 : 14,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => onOpenChange(!open)}
        style={({ pressed }) => [styles.disclosure, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={open ? styles.flipped : undefined}>
          <Icon name="chevronUp" color={open ? t.text : t.muted} />
        </View>
        <Text style={[open ? styles.labelOpen : styles.label, { color: open ? t.text : t.muted }]}>
          Table admin
        </Text>
        {!open &&
          (waiting > 0 ? (
            <Text style={[styles.waiting, { color: t.muted }]}>
              {waiting} waiting
            </Text>
          ) : (
            <Text style={[styles.hint, { color: t.dim }]}>seat · cash out · end</Text>
          ))}
      </Pressable>

      {open && (
        <View style={styles.drawer}>
          <DrawerRow icon="person" label="Seat a player" onPress={onSeat} dim={holding} />
          <DrawerRow icon="cashOut" label="Cash out a player" onPress={onCashOut} dim={holding} />

          {/* The only way to end a night. Press and keep pressing. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End this poker night. Hold for one and a half seconds."
            onPressIn={startHold}
            onPressOut={cancelHold}
            style={[
              styles.end,
              { borderColor: holding ? t.danger : t.dangerStrong },
            ]}
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
            <Icon name="clock" color={holding ? t.text : t.danger} size={19} />
            <View style={styles.endText}>
              <Text style={[styles.endLabel, { color: holding ? t.text : t.danger }]}>
                {holding ? 'Keep holding…' : 'End this poker night'}
              </Text>
              <Text style={[styles.endSub, { color: holding ? t.text : t.muted }]}>
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
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: t.text, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Icon name={empty ? 'person' : 'plus'} color={t.onFill} size={19} />
          <Text style={[styles.primaryLabel, { color: t.onFill }]}>{primaryLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: empty }}
          disabled={empty}
          onPress={onBill}
          style={({ pressed }) => [
            styles.bill,
            { borderColor: empty ? t.quietOutline : t.outline, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="receipt" color={empty ? t.dim : t.text} size={20} />
          <Text style={[styles.billLabel, { color: empty ? t.dim : t.text }]}>Bill</Text>
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
  icon: 'person' | 'cashOut';
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
        { backgroundColor: t.drawerFill, opacity: dim ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} color={t.text} size={19} />
      <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
      <View style={styles.pushRight}>
        <Icon name="chevron" color={t.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 10,
    marginHorizontal: 14,
    borderWidth: 1,
    borderRadius: 16,
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },

  // 46px of target and 14 of clearance: measured, and the point of the design.
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
    paddingHorizontal: 6,
    paddingBottom: 14,
  },
  flipped: { transform: [{ rotate: '180deg' }] },
  label: type.dockLabel,
  labelOpen: type.dockLabelOpen,
  hint: { ...type.dockHint, marginLeft: 'auto' },
  // Heavier than the hint it replaces: the board sets the count at 13/700.
  waiting: { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },

  drawer: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
  },
  rowLabel: type.dockRow,
  pushRight: { marginLeft: 'auto' },

  end: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  wipe: { ...StyleSheet.absoluteFillObject, right: undefined },
  endText: { gap: 2, flexShrink: 1 },
  endLabel: type.dockEnd,
  endSub: type.dockEndSub,

  pair: { flexDirection: 'row', gap: 10 },
  dimmed: { opacity: 0.4 },
  primary: {
    flex: 1.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 10,
  },
  primaryLabel: type.dockPrimary,
  bill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
  },
  billLabel: type.dockSecondary,
});
