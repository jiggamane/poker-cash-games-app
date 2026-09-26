import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { control, radius, type } from '../design/tokens';

/**
 * How long a hold has to be held. The dock's end-of-night row sets it, and
 * since `design/handoff-game-admin/` that is 1.5s — one hold in the app.
 */
import { HOLD_MS } from './Dock';

/**
 * A filled primary that is held rather than tapped.
 *
 * The gesture already exists once, on the dock's end-of-night row, and it is
 * the same gesture here down to the millisecond: a left-to-right wipe over
 * 1s, the copy swapping to "Keep holding… / Release to cancel", and a
 * release before the end reverting silently — no dialog, no toast, no ledger
 * write (08-tonight-home.md, H3b).
 *
 * WHAT THE HOLD MEANS HERE IS NOT WHAT IT MEANS IN THE DOCK, and that is a
 * deliberate widening. There, the hold guards a destructive act and the row is
 * red for it. Here it guards a WRITE THAT LANDS WITHOUT ASKING: a quick rebuy
 * commits straight to the ledger from the player card, with no amount screen
 * between the thumb and five people's money. A tap is too cheap for that, so
 * the wipe is drawn in the label's own colour rather than in the loss colour —
 * the gesture says "this is real", the colour still says "this is normal".
 *
 * The dock keeps its own copy of the mechanics: its row is a bordered
 * two-line block with an icon and a red wipe, and pulling it through here
 * would mean reworking the one path in the app that cannot be allowed to
 * break. Fold it in the next time either of them changes.
 */
export function HoldButton({
  label,
  sub,
  holdingLabel = 'Keep holding…',
  holdingSub = 'Release to cancel',
  onComplete,
  variant = 'primary',
}: {
  label: string;
  /** The resting second line — what the gesture is, since a tap does nothing. */
  sub: string;
  holdingLabel?: string;
  holdingSub?: string;
  onComplete: () => void;
  /**
   * `primary` is the filled button. `row` is the drawer's shape — an outlined
   * two-line row with the wipe in the label's colour — for *Take the game back*
   * on Tonight (`design/handoff-game-admin/` states 7 and 8), which sits where
   * the dock was and is drawn as a row of it rather than as a button.
   */
  variant?: 'primary' | 'row';
}) {
  const t = useTheme();

  /* The hold, and whether it is under way — the copy changes with it. */
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);

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
      onComplete();
    });
  }

  /** Releasing early reverts with no dialog, no toast and no ledger write. */
  function cancelHold() {
    progress.stopAnimation();
    progress.setValue(0);
    setHolding(false);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Hold for a second and a half.`}
      onPressIn={startHold}
      onPressOut={cancelHold}
      style={
        variant === 'row'
          ? [styles.row, { borderColor: holding ? t.text : t.outline }]
          : [styles.box, { backgroundColor: t.text }]
      }
    >
      {/*
        The label's own colour at low alpha, not the loss colour: on a filled
        primary that is the only wipe that reads in both themes without
        turning a rebuy into something that looks like it ends the night.
      */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wipe,
          {
            backgroundColor: variant === 'row' ? t.text : t.onFill,
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
      {variant === 'row' ? (
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: t.text }]}>{holding ? holdingLabel : label}</Text>
          <Text style={[styles.rowSub, { color: t.muted }]}>{holding ? holdingSub : sub}</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.label, { color: t.onFill }]}>{holding ? holdingLabel : label}</Text>
          <Text style={[styles.sub, { color: t.onFill }]}>{holding ? holdingSub : sub}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: control.height,
    borderRadius: radius.pressable,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 9,
    paddingHorizontal: 24,
    // So the wipe stops at the radius rather than squaring the corners off.
    overflow: 'hidden',
  },
  wipe: { ...StyleSheet.absoluteFill, right: undefined, opacity: 0.18 },
  label: { ...type.body, fontWeight: '700' },
  sub: { ...type.dockEndSub, opacity: 0.62 },
  /* The drawer's End row, in the label's colour rather than the loss colour:
     14 of padding, radius 10, a 1.5px outline, icon-less. */
  row: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  rowText: { gap: 2 },
  rowLabel: type.dockEnd,
  rowSub: type.dockEndSub,
});
