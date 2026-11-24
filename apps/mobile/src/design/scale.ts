import { Dimensions, type TextStyle } from 'react-native';
import { look, type } from './tokens';

/**
 * THE BOARD'S PHONES ARE MINIATURES, and this is how far to blow them up.
 *
 * The full board (`design/explorations/full-board/kit.mjs`) draws every
 * screen on a phone whose screen is 312 points wide and 742 tall. Its sizes —
 * a 22-point title, a 15.5-point row, a 62-point bar — are proportions of THAT
 * phone. Copied as points onto a 393-point iPhone they came out a fifth smaller
 * against the screen than the screens the owner approved (owner, 24 November:
 * "it feels like the build has smaller elements than the design … the designed
 * version sizes look better").
 *
 * So every size the new look takes from the kit goes through `z()`, which
 * multiplies it by the phone's own ratio to the drawn one: its width over 312,
 * held back by its height over 700 so a sheet that fits the drawing still fits
 * a shorter phone, never below 1 (a small phone gets the kit's points, which is
 * what it had) and never above 1.26 (the ratio at the 393 the boards are
 * judged at, so the largest phones do not run away).
 *
 *   393 × 852  iPhone 16          1.217
 *   430 × 932  iPhone Pro Max     1.26
 *   375 × 667  iPhone SE          1
 *   360 × 640  small Android      1
 *
 * Read once, at load: a phone does not change size under a running app, and a
 * web check opens each page fresh at the size it is testing.
 *
 * NOT in `tokens.ts`, which the Node tests import and which must not reach
 * react-native at runtime.
 */
const { width, height } = Dimensions.get('window');
export const LOOK_SCALE = Math.min(1.26, Math.max(1, Math.min(width / 312, height / 700)));

/** A kit size, in this phone's points: scaled, on the half point. */
export const z = (n: number): number => Math.round(n * LOOK_SCALE * 2) / 2;

/** `look`, scaled. */
export const L = Object.fromEntries(Object.entries(look).map(([k, v]) => [k, z(v)])) as {
  [K in keyof typeof look]: number;
};

const text = (s: TextStyle): TextStyle => ({
  ...s,
  ...(s.fontSize !== undefined && { fontSize: z(s.fontSize) }),
  ...(s.lineHeight !== undefined && { lineHeight: z(s.lineHeight) }),
  ...(s.letterSpacing !== undefined && { letterSpacing: Math.round(s.letterSpacing * LOOK_SCALE * 100) / 100 }),
});

/** The new look's type roles, scaled. */
export const T = {
  lookTitle: text(type.lookTitle),
  lookMeta: text(type.lookMeta),
  lookSheetTitle: text(type.lookSheetTitle),
  lookSheetSub: text(type.lookSheetSub),
  lookBar: text(type.lookBar),
  lookBarSub: text(type.lookBarSub),
  lookBarSecondary: text(type.lookBarSecondary),
  lookLabel: text(type.lookLabel),
};
