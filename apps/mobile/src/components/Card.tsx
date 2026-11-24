import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../design/useTheme';
import { look, type } from '../design/tokens';
import { Text } from './Text';

/**
 * A group on the sheet: a card held off it by one soft shadow (L2, its fall
 * shortened, approved 22 November), or in the dark one step lighter than the
 * sheet with no shadow. Rows inside carry their own hairlines; `pad` is for
 * free content instead of rows. The kit's `card()`.
 */
export function Card({
  children,
  pad = false,
  style,
}: {
  children: ReactNode;
  pad?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        pad ? styles.pad : styles.rows,
        { backgroundColor: t.surface, boxShadow: t.lift },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A section label over a card: 700 11, tracked, upper case, in the text
 * colour (`quiet` for the muted one). `right` is a figure at its right end.
 * The kit's `label()`.
 */
export function SectionLabel({ text, right, quiet = false, lead }: { text: string; right?: string; quiet?: boolean; lead?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.label}>
      {lead}
      <Text style={[type.lookLabel, { color: quiet ? t.muted : t.text }]}>{text.toUpperCase()}</Text>
      {right !== undefined && <Text style={[styles.right, { color: t.text }]}>{right}</Text>}
    </View>
  );
}

/**
 * A row in a card: words at the left (a name, a small line under it), a figure
 * or a value at the right, an optional lead and trail. Hairline under every row
 * but the last. NOTHING POINTS: a row that opens something carries no chevron
 * (Fresh Deck, kept by the full board). The kit's `row()`.
 */
export function CardRow({
  name,
  meta,
  amount,
  amountColor,
  value,
  lead,
  trail,
  last = false,
  dim = false,
  onPress,
  accessibilityLabel,
  wrapMeta = false,
}: {
  /** The small line wraps instead of truncating (a description rather than a fact). */
  wrapMeta?: boolean;
  name: ReactNode;
  meta?: ReactNode;
  amount?: string;
  amountColor?: string;
  value?: string;
  lead?: ReactNode;
  trail?: ReactNode;
  last?: boolean;
  dim?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const body = (
    <>
      {lead}
      <View style={styles.words}>
        <Text style={[styles.name, { color: dim ? t.dim : t.text }]} numberOfLines={1}>
          {name}
        </Text>
        {meta !== undefined && (
          <Text style={[styles.meta, { color: t.muted }]} numberOfLines={wrapMeta ? undefined : 1}>
            {meta}
          </Text>
        )}
      </View>
      {value !== undefined && (
        <Text style={[styles.value, { color: t.muted }]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {amount !== undefined && (
        <Text style={[styles.amount, { color: dim ? t.dim : (amountColor ?? t.text) }]} numberOfLines={1}>
          {amount}
        </Text>
      )}
      {trail}
    </>
  );
  const rowStyle = [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.hairline }];
  return onPress === undefined ? (
    <View style={rowStyle}>{body}</View>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && { opacity: 0.6 }]}
    >
      {body}
    </Pressable>
  );
}

/**
 * A chip: a name or a choice tapped to add it. Lifted like the cards, squarer,
 * (option C, owner 22 November); one step lighter and no shadow in the dark.
 * `dashed` is the chip that creates something — dashed always means that. The
 * kit's `chips()`.
 */
export function Chip({
  label,
  onPress,
  dashed = false,
  on = false,
  lead,
  trail,
}: {
  label: string;
  onPress?: () => void;
  dashed?: boolean;
  on?: boolean;
  lead?: ReactNode;
  trail?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        dashed
          ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.outline }
          : on
            ? { backgroundColor: t.text }
            : { backgroundColor: t.surface, boxShadow: t.chipLift },
        pressed && { opacity: 0.6 },
      ]}
    >
      {lead}
      <Text style={[styles.chipLabel, { color: on ? t.onFill : t.text }]} numberOfLines={1}>
        {label}
      </Text>
      {trail}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { height: 40, paddingLeft: 14, paddingRight: 12, borderRadius: look.chipRadius, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipLabel: { fontSize: 14.5, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 8 },
  words: { flex: 1, minWidth: 0 },
  name: { fontSize: 15.5, fontWeight: '600', lineHeight: 18.6 },
  meta: { fontSize: 12, fontWeight: '400', lineHeight: 15, marginTop: 2 },
  value: { fontSize: 13.5, fontWeight: '400', textAlign: 'right', flexShrink: 0, maxWidth: '56%' },
  amount: { fontFamily: 'head', fontSize: 16.5, fontWeight: '700', lineHeight: 18.2, fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 0 },
  card: { borderRadius: look.cardRadius },
  rows: { paddingHorizontal: 12 },
  pad: { padding: 12 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 2, marginTop: 4, marginBottom: -4 },
  right: { marginLeft: 'auto', fontFamily: 'head', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
