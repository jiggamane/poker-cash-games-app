import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { Icon } from './Icon';

/**
 * The dock — 08-tonight-home.md § *The dock*.
 *
 * One component, on every session screen, holding the two actions a host
 * touches every half hour and hiding the three they touch once a night behind a
 * disclosure. The collapsed row is a 46px target with 14px of clearance above
 * the primary, so a thumb reaching for admin cannot land on Rebuy.
 *
 * ENDING THE NIGHT IS A HOLD, NOT A TAP, and this is the only path to it
 * anywhere in the app. 1500ms, a left-to-right wipe of the row's red, and
 * releasing early reverts with no dialog, no toast and no ledger write. A tap
 * that starts a count-up is a tap somebody makes by accident at 1am.
 */
export function Dock({
  variant = 'resting',
  onRebuy,
  onBill,
  onSeat,
  onCashOut,
  onEnd,
  onOpenChange,
}: {
  /** `empty-table` inverts the pair: Seat a player leads and Bill is dead. */
  variant?: 'resting' | 'empty-table';
  onRebuy: () => void;
  onBill: () => void;
  onSeat: () => void;
  onCashOut: () => void;
  onEnd: () => void;
  /** So the screen behind can drop to .4 while the drawer is open. */
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const empty = variant === 'empty-table';

  const setDrawer = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  /*
   * The wipe. `width` cannot be driven natively, so this one animation runs on
   * the JS thread — it is a single interpolated bar for 1500ms and nothing else
   * on screen is moving while it does.
   */
  const wipe = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  function startHold() {
    setHolding(true);
    wipe.setValue(0);
    Animated.timing(wipe, { toValue: 1, duration: 1500, useNativeDriver: false }).start();
    timer.current = setTimeout(() => {
      setHolding(false);
      setDrawer(false);
      onEnd();
    }, 1500);
  }

  function cancelHold() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    wipe.stopAnimation(() => wipe.setValue(0));
    setHolding(false);
  }

  /** Everything in the panel but the row being held drops away during a hold. */
  const dimmed = holding ? styles.held : null;

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: t.surface,
          borderColor: open ? t.panelEdgeOpen : t.hairline,
          gap: open ? 12 : 14,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setDrawer(!open)}
        disabled={holding}
        style={({ pressed }) => [styles.disclosure, dimmed, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name={open ? 'chevronDown' : 'chevronUp'} color={open ? t.text : t.muted} />
        <Text style={[open ? styles.adminOpen : styles.admin, { color: open ? t.text : t.muted }]}>
          Table admin
        </Text>
        {!open && <Text style={[styles.hint, { color: t.dim }]}>seat · cash out · end</Text>}
      </Pressable>

      {open && (
        <View style={styles.drawer}>
          <DrawerRow icon="person" label="Seat a player" onPress={onSeat} dimmed={holding} />
          <DrawerRow icon="cashOut" label="Cash out a player" onPress={onCashOut} dimmed={holding} />

          {/* No fill until it is being held, and then the fill IS the progress. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End this poker night. Hold for one and a half seconds."
            onPressIn={startHold}
            onPressOut={cancelHold}
            style={[styles.endRow, { borderColor: holding ? t.danger : `${t.danger}8C` }]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: `${t.danger}57`,
                  width: wipe.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
            <Icon name="endClock" color={t.danger} />
            <View style={styles.endText}>
              <Text style={[styles.endLabel, { color: holding ? t.text : t.danger }]}>
                {holding ? 'Keep holding…' : 'End this poker night'}
              </Text>
              <Text style={[styles.endHint, { color: holding ? t.text : t.muted }]}>
                {holding ? 'Release to cancel' : 'Hold 1.5s · counting starts, no rebuys'}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <View style={[styles.pair, dimmed]}>
        <Pressable
          accessibilityRole="button"
          onPress={empty ? onSeat : onRebuy}
          disabled={holding}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: t.text, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon
            name={empty ? 'person' : 'plus'}
            color={t.onFill}
            size={19}
            stroke={empty ? 1.9 : 2.6}
          />
          <Text style={[styles.primaryLabel, { color: t.onFill }]}>
            {empty ? 'Seat a player' : 'Rebuy'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: empty }}
          onPress={onBill}
          disabled={empty || holding}
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: empty ? t.disabledEdge : t.outline, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="bill" color={empty ? t.disabled : t.text} />
          <Text style={[styles.secondaryLabel, { color: empty ? t.disabled : t.text }]}>Bill</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DrawerRow({
  icon,
  label,
  onPress,
  dimmed,
}: {
  icon: 'person' | 'cashOut';
  label: string;
  onPress: () => void;
  dimmed: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={dimmed}
      style={({ pressed }) => [
        styles.drawerRow,
        dimmed ? styles.held : null,
        { backgroundColor: t.drawerRow, opacity: pressed ? 0.6 : dimmed ? 0.4 : 1 },
      ]}
    >
      <Icon name={icon} color={t.text} />
      <Text style={[styles.drawerLabel, { color: t.text }]}>{label}</Text>
      <View style={styles.chevron}>
        <Icon name="chevron" color={t.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 10,
    marginHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },

  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
    paddingHorizontal: 6,
    paddingBottom: 14,
  },
  admin: { fontSize: 14.5, fontWeight: '600' },
  adminOpen: { fontSize: 14.5, fontWeight: '700' },
  hint: { fontSize: 13, fontWeight: '400', marginLeft: 'auto' },

  drawer: { gap: 8 },
  drawerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10 },
  drawerLabel: { fontSize: 16.5, fontWeight: '600' },
  chevron: { marginLeft: 'auto' },

  endRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  endText: { gap: 2, flexShrink: 1 },
  endLabel: { fontSize: 16.5, fontWeight: '700' },
  endHint: { fontSize: 12.5, fontWeight: '400' },

  /* 1.9fr / 1fr, which is what the grid comes to. */
  pair: { flexDirection: 'row', gap: 10 },
  primary: {
    flex: 1.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 10,
  },
  primaryLabel: { fontSize: 19, fontWeight: '700' },
  secondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
  },
  secondaryLabel: { fontSize: 14.5, fontWeight: '700' },

  held: { opacity: 0.4 },
});
