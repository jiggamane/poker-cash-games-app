import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Whether the keyboard is on screen — A8, doc 15 § 4.6.
 *
 * The rule is that the footer button rises with the keyboard and sits
 * DIRECTLY on its top edge. `KeyboardAvoidingView` lifts the panel, but the
 * footer also carries the pad that clears the home indicator, and that band is
 * behind the keyboard while it is up: left in place it holds the button 28
 * points above the edge it is supposed to sit on, and on a short phone that
 * gap is what pushes the field being typed into out of sight.
 *
 * iOS raises `keyboardWillShow` before the animation, which is what keeps the
 * pad and the lift in step. Android has no `will` events at all.
 */
export function useKeyboardUp(): boolean {
  const [up, setUp] = useState(false);

  useEffect(() => {
    const willShow = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const willHide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(willShow, () => setUp(true));
    const hidden = Keyboard.addListener(willHide, () => setUp(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return up;
}
