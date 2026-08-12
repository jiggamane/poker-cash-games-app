import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useTheme } from '../design/useTheme';
import { radius, type } from '../design/tokens';

/**
 * A single-line input.
 *
 * A field that has been filled carries a solid hairline border; one still
 * waiting is dashed, because dashed means "not set yet" the same way it means
 * "creates something" on a button. The caps label above is the same 12/700 used
 * for section headers.
 */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoFocus,
  autoCapitalize = 'none',
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  hint?: string;
}) {
  const t = useTheme();
  const set = value.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: t.muted }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: t.text,
            backgroundColor: t.surface,
            borderColor: set ? t.hairline : t.dashed,
            borderStyle: set ? 'solid' : 'dashed',
          },
        ]}
      />
      {hint !== undefined && <Text style={[styles.hint, { color: t.muted }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { ...type.label, marginBottom: 8 },
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  hint: { ...type.meta, marginTop: 8 },
});
