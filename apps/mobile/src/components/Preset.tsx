import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../design/useTheme';
import { radius } from '../design/tokens';

/*
 * WHERE A PRESET RUNS OUT OF ROOM.
 *
 * Three of them across a sheet. On the narrowest phone in the matrix — 360 — a
 * chip is 101 points wide and holds 89 of label at the board's 16/700, which is
 * ten glyphs: "$1,000,000" and more room than any table needs. It used to be
 * five, because the label was 17px inside a button padding 24 a side, and X2 of
 * a table buying in for five figures went straight through the side of it. That
 * was B3; the chip has no padding to overflow now.
 *
 * The threshold is the point at which the compact form reads better than the
 * exact one, not the point at which the exact one stops fitting. Those were the
 * same number by accident and are not any more.
 */
export const PRESET_FITS = 10_000;

/**
 * $500 / $1,000 / Custom — the board's chip, which is ONE object: the figure
 * over its caption, on a raised surface, and choosing it swaps the fill.
 *
 * IT LIVES HERE BECAUSE IT LIVED IN TWO PLACES AND ONLY ONE OF THEM WAS FIXED.
 * B3 rebuilt this chip on /log in August and left /share on the shape it
 * replaced — a `Button variant="preset"` with the caption printed underneath —
 * so the same row was right on the amount sheet and wrong on the share sheet
 * for another week, with "Custom" hanging out of both sides of its own button
 * exactly as B3 describes. See B14 in `docs/bugs.md`. One component is the only
 * thing that makes the next fix reach both.
 *
 * The shape that was wrong had two faults beyond the overflow. The caption sat
 * on the ground BELOW the chip rather than inside it, so nothing tied the word
 * to the figure it names — at a glance the row read as three buttons with three
 * stray labels under them. And `Button` pads 24 a side, which is right for a
 * button carrying a sentence and four times too much for a third of a sheet:
 * "Custom" at 17/700 is 63 points wide and the padding box on a 360-wide phone
 * is 53, so the word came out through both sides. That is fixed here, not in
 * `Button`, where the 24 is right for every other caller.
 *
 * Doc 10, § "Behaviour that the pixels imply": selection on a preset is a fill
 * swap, not a border. Doc 10's type scale: 700 16px over 700 9px at .08em.
 *
 * Both lines are stretched to the chip and centred in it rather than being
 * sized to their own text, so a long label ellipsises inside the chip instead
 * of growing out of it. An ellipsised FIGURE is a lie, so that must never
 * actually happen — `PRESET_FITS` shortens the number honestly first, and
 * `ui-audit.mjs`'s `figure-clipped` goes red if it ever does.
 */
export function Preset({
  label,
  caption,
  on,
  onPress,
}: {
  label: string;
  caption: string;
  on: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${label} · ${caption}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.preset,
        { backgroundColor: on ? t.text : t.surface, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text numberOfLines={1} style={[styles.presetValue, { color: on ? t.onFill : t.text }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.presetCaption,
          // On the fill the caption is the ink at 60%, which is what the board
          // draws: present, and quieter than the figure it belongs to.
          { color: on ? t.onFill : t.muted, opacity: on ? 0.6 : 1 },
        ]}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The board: each chip `flex:1; column; align-items:center; gap:3px;
  // padding:11px 0; radius:8`. No horizontal padding on the chip — the two
  // lines are centred by their own width, and a third of a sheet has no 24
  // points a side to spare. The 6 kept here only holds a wide label off the
  // rounded corner.
  preset: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: radius.pressable,
  },
  presetValue: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  presetCaption: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.72,
  },
});
