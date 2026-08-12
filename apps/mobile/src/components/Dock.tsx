import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { dock, radius, type } from '../design/tokens';
import { Icon } from './Icon';

/**
 * The dock — T3 in `08-tonight-home.md`, geometry carried from rev 7's D8.
 *
 * The two actions a host touches every half hour sit under the thumb, and the
 * three they touch once a night are folded away behind one row. That is the
 * whole idea: Rebuy and Bill are always there, and seating, cashing out and
 * ending are a deliberate reach.
 *
 * TWO MEASUREMENTS ARE LOAD-BEARING and must not be tidied. The disclosure row
 * is a 46px target with 14px of clearance above the primary, so a thumb going
 * for Table admin cannot land on Rebuy instead — at a table, at 1am, with a
 * drink in the other hand. And the button pair is 1.9fr / 1fr, not 2 / 1: the
 * primary is emphatically bigger, and Bill is still a real target.
 *
 * ENDING A NIGHT IS A HOLD, NEVER A TAP, and there is no tap path to it
 * anywhere else in the app. Two deliberate acts: open the drawer, then hold
 * 1.5s. Releasing early reverts with no dialog, no toast and no ledger write.
 */
export function Dock({
  variant,
  open,
  onOpenChange,
  onPrimary,
  onBill,
  onSeat,
  onCashOut,
  onEnd,
}: {
  /** `empty-table` inverts the priority: Seat a player leads, Bill is dead. */
  variant: 'resting' | 'empty-table';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rebuy, or Seat a player on an empty table. */
  onPrimary: () => void;
  onBill: () => void;
  onSeat: () => void;
  onCashOut: () => void;
  onEnd: () => void;
}) {
  const t = useTheme();
  const empty = variant === 'empty-table';

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: t.surface,
          borderColor: open ? t.dockEdgeOpen : t.hairline,
          gap: open ? dock.panelGapOpen : dock.panelGap,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Table admin"
        onPress={() => onOpenChange(!open)}
        style={({ pressed }) => [styles.disclosure, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={open ? styles.caretOpen : undefined}>
          <Icon name="caret" color={open ? t.text : t.muted} />
        </View>
        <Text style={[open ? styles.disclosureOpen : styles.disclosure_, { color: open ? t.text : t.muted }]}>
          Table admin
        </Text>
        {/* The hint is for a closed drawer only — once it is open the rows say
            it better than a summary of them can. */}
        {!open && <Text style={[styles.hint, { color: t.dim }]}>seat · cash out · end</Text>}
      </Pressable>

      {open && (
        <View style={styles.rows}>
          <AdminRow icon="person" label="Seat a player" onPress={onSeat} />
          <AdminRow icon="cashOut" label="Cash out a player" onPress={onCashOut} />
          <HoldToEnd onEnd={onEnd} />
        </View>
      )}

      {/* Live even with the drawer open: a host who opened it by mistake can
          still record the rebuy they were reaching for. */}
      <View style={styles.pair}>
        <Pressable
          accessibilityRole="button"
          onPress={onPrimary}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: t.text, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Icon
            name={empty ? 'person' : 'plus'}
            color={t.onFill}
            size={19}
            weight={empty ? 1.9 : 2.6}
          />
          <Text style={[styles.primaryLabel, { color: t.onFill }]}>
            {empty ? 'Seat a player' : 'Rebuy'}
          </Text>
        </Pressable>

        {/* Nothing has been bought in, so there is nothing to split. Disabled
            rather than hidden: the dock's shape should not move under a thumb
            between the first buy-in and the second. */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: empty }}
          disabled={empty}
          onPress={onBill}
          style={({ pressed }) => [
            styles.bill,
            { borderColor: empty ? t.disabledEdge : t.outline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="rules" color={empty ? t.disabled : t.text} size={20} />
          <Text style={[styles.billLabel, { color: empty ? t.disabled : t.text }]}>Bill</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AdminRow({
  icon,
  label,
  onPress,
}: {
  icon: 'person' | 'cashOut';
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.adminRow,
        { backgroundColor: t.adminFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} color={t.text} />
      <Text style={[styles.adminLabel, { color: t.text }]}>{label}</Text>
      <View style={styles.pushRight}>
        <Icon name="chevron" color={t.muted} />
      </View>
    </Pressable>
  );
}

/**
 * T3b · the hold.
 *
 * A left-to-right wipe of the row's own red at 34%, running 0 → 100% over
 * 1500ms, with the copy swapping to "Keep holding… / Release to cancel". It is
 * width, not opacity, so it cannot use the native driver — 1500ms of layout
 * animation on one small view, which is well within budget and is the only way
 * to draw a progress fill that is honest about where it has got to.
 *
 * The timer is what ends the night, not the release: letting go at 99% does
 * nothing at all, silently, which is exactly what somebody who changed their
 * mind wants.
 */
function HoldToEnd({ onEnd }: { onEnd: () => void }) {
  const t = useTheme();
  const [holding, setHolding] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  useEffect(() => {
    if (!holding) {
      progress.setValue(0);
      return;
    }

    done.current = false;
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: dock.holdMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    run.start(({ finished }) => {
      if (!finished || done.current) return;
      done.current = true;
      setHolding(false);
      onEnd();
    });

    return () => run.stop();
  }, [holding, onEnd, progress]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="End this poker night. Hold for one and a half seconds."
      onPressIn={() => setHolding(true)}
      onPressOut={() => setHolding(false)}
      style={[
        styles.endRow,
        { borderColor: holding ? t.danger : t.dangerEdgeStrong },
      ]}
    >
      <Animated.View style={[styles.wipe, { backgroundColor: t.holdWipe, width }]} />

      <Icon name="clock" color={holding ? t.text : t.danger} size={19} />
      <View style={styles.endText}>
        <Text style={[styles.endTitle, { color: holding ? t.text : t.danger }]}>
          {holding ? 'Keep holding…' : 'End this poker night'}
        </Text>
        <Text style={[styles.endHint, { color: holding ? t.text : t.muted }]}>
          {holding ? 'Release to cancel' : 'Hold 1.5s · counting starts, no rebuys'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: dock.panelMarginH,
    marginTop: dock.panelMarginTop,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: dock.panelRadius,
    paddingTop: dock.panelPadTop,
    paddingHorizontal: dock.panelPadH,
    paddingBottom: dock.panelPadBottom,
  },

  // 16 / 6 / 14 makes the 46px target the clearance above the primary is
  // measured from. Both numbers are in 08-tonight-home.md for a reason.
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: dock.disclosurePadTop,
    paddingHorizontal: dock.disclosurePadH,
    paddingBottom: dock.disclosurePadBottom,
  },
  disclosure_: type.dockDisclosure,
  disclosureOpen: type.dockDisclosureOpen,
  caretOpen: { transform: [{ rotate: '180deg' }] },
  hint: { ...type.meta, marginLeft: 'auto' },

  rows: { gap: dock.rowGap },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: dock.adminPad,
    borderRadius: dock.adminRadius,
  },
  adminLabel: type.dockRow,
  pushRight: { marginLeft: 'auto' },

  endRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: dock.adminPad,
    borderRadius: dock.adminRadius,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  wipe: { ...StyleSheet.absoluteFillObject, right: undefined },
  endText: { gap: 2 },
  endTitle: type.dockRow,
  endHint: type.detail,

  pair: { flexDirection: 'row', gap: dock.pairGap },
  primary: {
    // 1.9fr / 1fr. flex takes the ratio directly, which is the one place in
    // this app where a grid template maps to flex without arithmetic.
    flex: 1.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: dock.primaryPadV,
    borderRadius: dock.buttonRadius,
  },
  primaryLabel: type.dockPrimary,
  bill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: dock.billPadV,
    borderRadius: dock.buttonRadius,
    borderWidth: 2,
  },
  billLabel: type.dockSecondary,
});
