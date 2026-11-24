import { forwardRef, type ComponentRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { resolveFace } from '../design/fonts';

/**
 * Every Text and TextInput in the app, set in the full board's two faces.
 *
 * The same component as react-native's, with one difference: its style's
 * family is resolved by `faceFor` (`design/fonts.ts`) so a weight becomes the
 * loaded face that is that weight. Import from here, never `Text` from
 * 'react-native' — a bare one draws in the platform's face and is the one line
 * on the screen in a different hand.
 */
export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(function Text(
  { style, ...rest },
  ref,
) {
  return <RNText ref={ref} {...rest} style={resolveFace(style)} />;
});

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(function TextInput(
  { style, ...rest },
  ref,
) {
  return <RNTextInput ref={ref} {...rest} style={resolveFace(style)} />;
});
