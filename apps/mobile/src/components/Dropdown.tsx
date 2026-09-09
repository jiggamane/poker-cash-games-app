import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { radius } from '../design/tokens';

/**
 * THE APP'S ONE DROPDOWN — a label that names the current state, and a menu
 * anchored under it.
 *
 * `design/handoff-session-views/` drew it first, for the past session's three
 * views; `design/handoff-sessions-stats/` draws the same object twice more, for
 * the group scope on Sessions and on My stats. Same geometry to the point in
 * all three, so it is one component: the alternative is three, and the third
 * one is where the radius quietly becomes 10.
 *
 * **THE LABEL IS THE ACTIVE ITEM'S NAME, NEVER A STATIC WORD.** That is what
 * makes the closed control readable as a state rather than as a button, and it
 * is why `label` is derived from the items rather than passed beside them.
 *
 * A MENU AND NOT A SHEET, which is a departure from `docs/09-navigation.md`'s
 * two vocabularies worth stating: a sheet is a place you go, and this is a
 * property of the screen you are already on, picked and dismissed without
 * leaving it. It floats — the one thing in this app that does — so it is also
 * the one thing that casts a shadow.
 *
 * ⚠ OPEN IS THE CALLER'S. While the menu is up, everything behind it drops to
 * 32%, and "everything behind it" is the screen's business rather than the
 * control's. The caller owns the flag and dims its own body.
 */

export interface DropdownItem<T extends string> {
  value: T;
  label: string;
  /** The line under the label, where a menu has room to explain itself. */
  hint?: string;
}

/** What the list and the block behind an open menu drop to. */
export const MENU_DIM = 0.32;

export function Dropdown<T extends string>({
  items,
  value,
  open,
  onOpenChange,
  onPick,
  testID,
  accessibilityLabel,
}: {
  items: ReadonlyArray<DropdownItem<T>>;
  value: T;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (value: T) => void;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const active = items.find((i) => i.value === value) ?? items[0];
  /* A control with one thing to pick is not a control. It still says what the
     state is — that is the label's other job — so it draws as text. */
  const only = items.length < 2;

  if (active === undefined) return null;

  if (only) {
    return (
      <View testID={testID} style={[styles.anchor, styles.button, { backgroundColor: t.surface }]}>
        <Text style={[styles.label, { color: t.offTable }]} numberOfLines={1}>
          {active.label}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.anchor}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={accessibilityLabel ?? `${active.label}. Change it.`}
        onPress={() => onOpenChange(!open)}
        style={[styles.button, { backgroundColor: open ? t.raised : t.surface }]}
      >
        <Text style={[styles.label, { color: open ? t.text : t.offTable }]} numberOfLines={1}>
          {active.label}
        </Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} color={t.muted} size={11} />
      </Pressable>

      {open && (
        <View
          testID={testID === undefined ? undefined : `${testID}-menu`}
          style={[styles.menu, { backgroundColor: t.menu, borderColor: t.sheetEdge }]}
        >
          {items.map((item) => {
            const on = item.value === value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  onPick(item.value);
                  onOpenChange(false);
                }}
                style={[styles.row, on && { backgroundColor: t.menuActive }]}
              >
                <View style={styles.check}>
                  {on && <Icon name="check" color={t.offTable} size={13} />}
                </View>
                <View style={styles.text}>
                  <Text
                    style={[on ? styles.itemOn : styles.item, { color: t.offTable }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.hint !== undefined && (
                    <Text style={[styles.hint, { color: t.annotation }]} numberOfLines={1}>
                      {item.hint}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* The positioned parent the menu hangs off, so nothing above it has to know
     the menu exists. */
  /* Pushed to the right-hand end of whatever line it shares — the meta line on
     Sessions, the title row on My stats. */
  anchor: { marginLeft: 'auto', position: 'relative', alignItems: 'flex-end' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 11,
    paddingRight: 10,
    borderRadius: radius.pressable,
  },
  label: { fontSize: 13, fontWeight: '600', flexShrink: 1 },

  /* 226 wide, 34 below the control, right-aligned to it. */
  menu: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: 226,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 5,
    /* `0 18px 40px rgba(0,0,0,.55)` — see the note on floating, above. */
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  check: { width: 13, alignItems: 'center' },
  text: { gap: 1, flexShrink: 1 },
  item: { fontSize: 14, fontWeight: '400' },
  itemOn: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 11.5, fontWeight: '400' },
});
