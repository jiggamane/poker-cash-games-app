import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../design/useTheme';
import { control, radius, type } from '../design/tokens';

export type ButtonVariant =
  /** The one loud button. At most ONE per screen. */
  | 'primary'
  /** Same height, no fill. */
  | 'secondary'
  /** Outline only, never filled. */
  | 'destructive'
  /** Quiet but visible — 1.5px. */
  | 'chip'
  /** $50 / $100. Filled when chosen. */
  | 'preset'
  /** Dashed always means "creates something". */
  | 'add'
  /** Navigation bars only. */
  | 'text'
  /**
   * A primary that cannot be pressed yet, and says so by its own weight
   * rather than by fading: card fill, muted label, and a 2px ring of the
   * ground set inside it. The ending flow uses it for the two gates — the
   * count that is not finished and the night that does not add up — where a
   * greyed-out button would read as broken instead of as waiting.
   */
  | 'blocked';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** For 'preset': filled when chosen. */
  selected?: boolean;
  style?: ViewStyle;
}

/**
 * One filled primary per screen.
 *
 * DELIBERATE DEVIATION: the style guide gives the primary a 2px keyline set
 * inside its fill, in the GROUND colour. Drawn on the ground — which is where
 * every button in this app sits — that ring is the same colour as what is
 * behind it, so it never reads as a line. Its only effect is to shrink the
 * visible fill to 52 while the outlined button beside it stays 56, and a
 * Buy-in that is four pixels shorter than the Cash out next to it is exactly
 * the sort of thing that makes a screen look assembled rather than designed.
 *
 * Both variants are now 56 outside and 56 to the eye. Bring the keyline back
 * the day a primary has to sit on a surface card, where it would do its job.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  selected = false,
  style,
}: Props) {
  const t = useTheme();

  const base: ViewStyle = {
    height: variant === 'preset' ? control.presetHeight : control.height,
    borderRadius: radius.pressable,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  };

  let box: ViewStyle;
  let color: string;

  /*
   * A DISABLED PRIMARY IS DRAWN AS `blocked`, not faded.
   *
   * Fading a filled button drops the fill AND the label together: white at 40%
   * with near-black text on it is a grey box with a grey word in it, which is
   * what "Add a player by name" and "Save" were on their empty states. The
   * design already has the treatment for a primary that is not ready — card
   * fill, muted label — and it is legible, which fading is not. Outlined
   * variants still fade: an outline at 40% is quieter without going illegible.
   */
  const blocked = variant === 'blocked' || (variant === 'primary' && disabled);

  switch (variant) {
    case 'primary':
      // NO KEYLINE, deliberately — see the note above.
      box = blocked
        ? { backgroundColor: t.surface, borderWidth: 2, borderColor: t.ground }
        : { backgroundColor: t.text };
      color = blocked ? t.muted : t.onFill;
      break;

    case 'secondary':
      box = { borderWidth: control.outlineWidth, borderColor: t.outline };
      color = t.text;
      break;

    case 'destructive':
      box = { borderWidth: control.outlineWidth, borderColor: t.danger };
      color = t.danger;
      break;

    case 'chip':
      box = { borderWidth: control.quietWidth, borderColor: t.quietOutline, height: control.presetHeight };
      color = t.text;
      break;

    case 'preset':
      box = selected
        ? { backgroundColor: t.text }
        : { borderWidth: control.quietWidth, borderColor: t.quietOutline };
      color = selected ? t.onFill : t.text;
      break;

    case 'add':
      box = { borderWidth: control.quietWidth, borderColor: t.dashed, borderStyle: 'dashed' };
      color = t.muted;
      break;

    case 'text':
      box = { height: undefined, paddingHorizontal: 0 };
      color = t.text;
      break;

    case 'blocked':
      box = { backgroundColor: t.surface, borderWidth: 2, borderColor: t.ground };
      color = t.muted;
      break;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: variant === 'preset' ? selected : undefined }}
      disabled={disabled || variant === 'blocked'}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        box,
        { opacity: blocked ? 1 : disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { ...type.body, fontWeight: '700' },
});
