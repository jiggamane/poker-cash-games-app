import { Platform, StyleSheet, type TextStyle } from 'react-native';

/**
 * THE TWO FACES OF THE FULL BOARD, approved 22 November 2026.
 *
 * `design/explorations/full-board/`: titles, the bar's words and every money
 * figure are Libre Franklin ("the bar's type: A, Libre Franklin bold, 18";
 * round eight, "every money figure in one face"); everything else is Inter.
 * Both ship with the app, under the SIL Open Font License, in
 * `assets/fonts/` with their licences beside them.
 *
 * This reverses the decision that used to head `tokens.ts` — "no web font
 * ships, the face is SF Pro" — and it is reversed here, in one place, for the
 * same reason that decision was made in one place: a second family that can
 * win is what produces a screen in two faces.
 *
 * A loaded font is one weight per family name, so a style that says
 * `fontWeight: '700'` has to be turned into the family that IS 700. `faceFor`
 * does that, and `components/Text.tsx` runs every Text and TextInput in the
 * app through it, so no screen names a font file.
 *
 *   fontFamily 'head'          Libre Franklin at the style's weight
 *   fontFamily 'body' / none   Inter at the style's weight
 *   tabular-nums at 700 or 800 Libre Franklin: that is what a money figure is
 *                              in this app, and times and counts (tabular at
 *                              400–600) stay in Inter, as the board has them
 *   any other fontFamily       left alone
 */

export const FONT_FILES = {
  'LibreFranklin-500': require('../../assets/fonts/LibreFranklin_500Medium.ttf'),
  'LibreFranklin-600': require('../../assets/fonts/LibreFranklin_600SemiBold.ttf'),
  'LibreFranklin-700': require('../../assets/fonts/LibreFranklin_700Bold.ttf'),
  'LibreFranklin-800': require('../../assets/fonts/LibreFranklin_800ExtraBold.ttf'),
  'Inter-400': require('../../assets/fonts/Inter_400Regular.ttf'),
  'Inter-500': require('../../assets/fonts/Inter_500Medium.ttf'),
  'Inter-600': require('../../assets/fonts/Inter_600SemiBold.ttf'),
  'Inter-700': require('../../assets/fonts/Inter_700Bold.ttf'),
} as const;

/** Mark a style as set in the figure and title face. */
export const head = { fontFamily: 'head' } as const;

const HEAD = [500, 600, 700, 800] as const;
const BODY = [400, 500, 600, 700] as const;

function nearest(weights: readonly number[], w: number): number {
  return weights.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
}

function weightOf(style: TextStyle): number {
  const w = style.fontWeight;
  if (w === undefined || w === 'normal') return 400;
  if (w === 'bold') return 700;
  const n = typeof w === 'number' ? w : Number(w);
  return Number.isFinite(n) ? n : 400;
}

/**
 * The style with its family resolved to a loaded face. Returns the input
 * untouched when it names a family of its own.
 */
export function faceFor(style: TextStyle | undefined): TextStyle {
  const s = style ?? {};
  const fam = s.fontFamily;
  if (fam !== undefined && fam !== 'head' && fam !== 'body') return s;
  const w = weightOf(s);
  const figure = (s.fontVariant ?? []).includes('tabular-nums') && w >= 700;
  const isHead = fam === 'head' || (fam === undefined && figure);
  const family = isHead ? `LibreFranklin-${nearest(HEAD, w)}` : `Inter-${nearest(BODY, w)}`;
  /* On Android a weight on a single-weight family is drawn as a fake bold on
     top of the real one; the family already carries the weight. */
  return Platform.OS === 'android'
    ? { ...s, fontFamily: family, fontWeight: undefined }
    : { ...s, fontFamily: family };
}

export function resolveFace(style: unknown): TextStyle {
  return faceFor(StyleSheet.flatten(style as TextStyle) as TextStyle | undefined);
}
