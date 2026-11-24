import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SPOTS, type SpotLevel, type SpotPlace } from '../art/spots';
import { useTheme } from '../design/useTheme';

/**
 * One of the approved drawings (`src/art/spots.ts`, generated from the icon
 * board), in the palette of the theme on screen.
 *
 * Sized by the board's ink rule for its level — 'rows' at the head of a list
 * row, 'sheet' at the head of a sheet, 'home' and 'tools' on a tile — and set
 * in a fixed slot: centred on its measured outline, or with the outline's left
 * edge on the slot's (`align="left"`). Never wider than the slot. This is the
 * kit's `slotArt()` and the icon board's `artSlot()`, point for point.
 */
export function Spot({
  place,
  level = 'rows',
  width = 56,
  height = 46,
  align = 'centre',
  onInk = false,
}: {
  place: SpotPlace;
  level?: SpotLevel;
  width?: number;
  height?: number;
  align?: 'centre' | 'left';
  /** Drawn on the ink (a filled card) rather than on the sheet: the palettes swap. */
  onInk?: boolean;
}) {
  const t = useTheme();
  const art = SPOTS[place];
  const [x, y, w, h] = art.box;
  const S = Math.min(art.size[level], (width * 88) / w);
  const k = S / 88;
  const left = align === 'left' ? -(x - 4) * k : width / 2 - (x - 4 + w / 2) * k;
  const top = height / 2 - (y - 12 + h / 2) * k;
  const dark = (t.name === 'dark') !== onInk;
  return (
    <View style={{ width, height, flexShrink: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', left, top }}>
        <SvgXml xml={dark ? art.dark : art.light} width={S} height={S} />
      </View>
    </View>
  );
}
