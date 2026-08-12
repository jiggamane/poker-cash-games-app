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
  | 'text';

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
 * One filled primary per screen. The primary's fill carries a 2px keyline set
 * INSIDE it — in the style guide that is `inset 0 0 0 2px` in the ground
 * colour, and React Native draws borders inset, so a plain borderWidth is an
 * exact translation rather than an approximation.
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

  switch (variant) {
    case 'primary':
      box = {
        backgroundColor: t.text,
        // A disabled button keeps the fill but loses the keyline.
        borderWidth: disabled ? 0 : control.keylineWidth,
        borderColor: t.keyline,
      };
      color = t.onFill;
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
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: variant === 'preset' ? selected : undefined }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [base, box, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { ...type.body, fontWeight: '700' },
});
