import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';

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
 * IT SITS ON THE INK TOP, on My stats (the title row), Sessions and the
 * settled night (the meta line), so the closed control is the full board's
 * `topDropdown` (`kit.mjs`, `.tdd`): white 600 12.5 on the ink's own fill,
 * radius 10, a chevron down. The open MENU is not on the ink — it hangs over
 * the sheet — so it is a surface card like every other card in the look.
 *
 * ⚠ OPEN IS THE CALLER'S. While the menu is up, everything behind it drops to
 * 32%, and "everything behind it" is the screen's business rather than the
 * control's. The caller owns the flag and dims its own body.
 *
 * **AND TAPPING ANYWHERE ELSE CLOSES IT** — a backdrop this component draws
 * itself, because "anywhere else" is one behaviour and three screens had three
 * answers to it. `/settled` put a `Pressable` over its own list and covered the
 * list only; My stats and Sessions dimmed their bodies to 32% and made them
 * deaf, so a tap outside the menu did nothing at all and the only way out was
 * the control you had just moved your thumb off. A menu you cannot dismiss by
 * tapping past it is the one thing every phone has taught people a menu does.
 * See B77 in `docs/bugs.md`.
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
  /* HOW BIG "ANYWHERE ELSE" IS. The backdrop hangs off the anchor, which sits
     in a corner of the screen, so it is stretched a whole phone past every edge
     of it — that covers the screen from wherever the control happens to be
     without this component having to measure where that is. */
  const { width, height } = useWindowDimensions();
  const active = items.find((i) => i.value === value) ?? items[0];
  /* A control with one thing to pick is not a control. It still says what the
     state is — that is the label's other job — so it draws as the same pill
     with no chevron (the board's `scopeLabel`). */
  const only = items.length < 2;

  if (active === undefined) return null;

  if (only) {
    return (
      <View testID={testID} style={[styles.anchor, styles.button, { backgroundColor: t.onTopFill }]}>
        <Text style={[styles.label, { color: t.onTop }]} numberOfLines={1}>
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
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: t.onTopFill },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text style={[styles.label, { color: t.onTop }]} numberOfLines={1}>
          {active.label}
        </Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} color={t.onTop} size={z(14)} />
      </Pressable>

      {open && (
        <Pressable
          testID={testID === undefined ? undefined : `${testID}-backdrop`}
          accessibilityRole="button"
          accessibilityLabel="Close the menu"
          onPress={() => onOpenChange(false)}
          /* UNDER THE MENU AND OVER EVERYTHING ELSE, including the control —
             a tap on the button while it is open lands here and closes it,
             which is what the button itself would have done. */
          style={[styles.backdrop, { top: -height, bottom: -height, left: -width, right: -width }]}
        />
      )}

      {open && (
        <View
          testID={testID === undefined ? undefined : `${testID}-menu`}
          style={[styles.menu, { backgroundColor: t.surface, borderColor: t.hairline }]}
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
                style={[styles.row, on && { backgroundColor: t.raised }]}
              >
                <View style={styles.check}>
                  {on && <Icon name="check" color={t.text} size={z(13)} />}
                </View>
                <View style={styles.text}>
                  <Text
                    style={[on ? styles.itemOn : styles.item, { color: t.text }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.hint !== undefined && (
                    <Text style={[styles.hint, { color: t.muted }]} numberOfLines={1}>
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
  /* `.tdd`: `padding: 7px 11px`, gap 6, radius 10. */
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(6),
    paddingVertical: z(7),
    paddingHorizontal: z(11),
    borderRadius: z(10),
  },
  label: { fontSize: z(12.5), fontWeight: '600', flexShrink: 1 },

  /* A phone's worth of reach past every edge of the anchor — see the note on
     the dimensions above. Transparent: the 32% behind an open menu is the
     screen's own dimming and drawing a second wash here would double it. Under
     the menu's own `zIndex: 5`. */
  backdrop: { position: 'absolute', zIndex: 4 },

  /* 226 wide, just below the control, right-aligned to it; the look's card
     radius. */
  menu: {
    position: 'absolute',
    top: z(36),
    right: 0,
    width: z(226),
    borderRadius: z(14),
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 5,
    /* It floats — see the note above — so it keeps a deeper fall than a
       card's lift. */
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(10),
    paddingVertical: z(11),
    paddingHorizontal: z(13),
  },
  check: { width: z(13), alignItems: 'center' },
  text: { gap: z(1), flexShrink: 1 },
  item: { fontSize: z(14), fontWeight: '400' },
  itemOn: { fontSize: z(14), fontWeight: '600' },
  hint: { fontSize: z(11.5), fontWeight: '400' },
});
