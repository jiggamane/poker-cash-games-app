import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';

/*
 * The parts Your plan and its change sheet share (the full board's `plan-*`):
 * a line of what a plan includes, the caps tag on a plan card, the store's
 * price with its period.
 */

/** A line of what a plan includes: white tick in a green disc, or struck through on a muted one. */
export function Has({ text, on = true, onInk = false }: { text: string; on?: boolean; onInk?: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.has}>
      <View style={[styles.tick, { backgroundColor: on ? t.win : t.raised }]}>
        <Icon name={on ? 'check' : 'close'} color={on ? t.onFill : t.dim} size={z(12)} />
      </View>
      <Text
        style={[
          styles.hasText,
          { color: onInk ? t.onFill : on ? t.text : t.muted },
          !on && styles.struck,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

export function Tag({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: t.text }]}>
      <Text style={[styles.tagText, { color: t.onFill }]}>{text.toUpperCase()}</Text>
    </View>
  );
}

export function Price({ price, onInk = false }: { price: string; onInk?: boolean }) {
  const t = useTheme();
  return (
    <Text style={styles.priceRow}>
      <Text style={[styles.price, { color: onInk ? t.onFill : t.text }]}>{price}</Text>
      <Text style={[styles.per, { color: onInk ? t.onFill : t.muted }, onInk && styles.dimOnInk]}> / mo</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  has: { flexDirection: 'row', alignItems: 'flex-start', gap: z(9) },
  tick: { width: z(18), height: z(18), borderRadius: z(9), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hasText: { flex: 1, fontSize: z(13.5), lineHeight: z(19) },
  struck: { textDecorationLine: 'line-through' },
  tag: { paddingVertical: z(4), paddingHorizontal: z(7), borderRadius: 999 },
  tagText: { fontSize: z(10), fontWeight: '700', letterSpacing: 1 },
  priceRow: { flexShrink: 0 },
  price: { fontFamily: 'head', fontSize: z(22), fontWeight: '800', fontVariant: ['tabular-nums'] },
  per: { fontSize: z(12) },
  dimOnInk: { opacity: 0.7 },
});
