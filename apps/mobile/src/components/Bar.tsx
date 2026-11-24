import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../design/useTheme';
import { look, type } from '../design/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * THE FOOTER IS THE ACTION (F3, approved 22 November 2026).
 *
 * An ink bar across the bottom edge with the action's words set straight on
 * it, and the whole bar is the target. There is no button inside it, and a
 * screen never draws a filled button in its content: the one primary action
 * is this, or there is none. `design/explorations/full-board/kit.mjs`, `bar()`
 * and `barHalves()`.
 *
 *   one action      `actions={[a]}`
 *   two, equal      `actions={[a, b]}` — a choice, not a primary and a helper
 *   blocked         `disabled` on the action: the words go faint, the bar stays
 *   a line above    `line` — a total or a status, quiet, inside the bar
 *   a sub-line      `sub` on the action — inside the target, under the words
 *
 * The bar takes the home indicator's inset under itself so the ink runs to the
 * bottom edge of the phone; the screen above it must not add its own.
 */
export interface BarAction {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  sub?: string;
  icon?: IconName;
  /** For the checks and the screen reader, when the words alone are not enough. */
  accessibilityLabel?: string;
}

export function Bar({ actions, line, above }: { actions: BarAction[]; line?: string; above?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      nativeID="screen-bar"
      style={[
        styles.bar,
        { backgroundColor: t.bar, paddingBottom: Math.max(insets.bottom, look.barFloor) },
        t.barShadow !== 'none' && { boxShadow: t.barShadow },
      ]}
    >
      {above}
      {line !== undefined && (
        <Text style={[styles.line, { color: t.onTopMuted, boxShadow: `inset 0px -1px 0px 0px ${t.barRule}` }]}>
          {line}
        </Text>
      )}
      <View style={styles.acts}>
        {actions.map((a, i) => (
          <Pressable
            key={a.label + i}
            accessibilityRole="button"
            accessibilityLabel={a.accessibilityLabel ?? a.label}
            accessibilityState={{ disabled: a.disabled === true }}
            disabled={a.disabled === true || a.onPress === undefined}
            onPress={a.onPress}
            style={({ pressed }) => [
              styles.act,
              i > 0 && { boxShadow: `inset 1px 0px 0px 0px ${t.barRule}` },
              pressed && styles.pressed,
            ]}
          >
            {a.icon !== undefined && <Icon name={a.icon} color={a.disabled ? t.onBarDead : t.onBar} />}
            <View style={styles.words}>
              <Text
                numberOfLines={1}
                style={[type.lookBar, { color: a.disabled ? t.onBarDead : t.onBar }]}
              >
                {a.label}
              </Text>
              {a.sub !== undefined && (
                <Text numberOfLines={1} style={[type.lookBarSub, styles.sub, { color: t.onBarMuted }]}>
                  {a.sub}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexShrink: 0, zIndex: 3 },
  line: { ...type.lookBarSub, fontSize: 12.5, textAlign: 'center', paddingVertical: 9, paddingHorizontal: 22 },
  acts: { flexDirection: 'row' },
  act: {
    flex: 1,
    minWidth: 0,
    height: look.barHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  words: { alignItems: 'center', minWidth: 0, flexShrink: 1 },
  sub: { marginTop: 5 },
  pressed: { opacity: 0.7 },
});
