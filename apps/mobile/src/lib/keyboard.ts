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

/**
 * How much of the screen the keyboard is covering — the WEB answer.
 *
 * `KeyboardAvoidingView` does nothing in a browser: there is no keyboard event
 * for it to hear, so a sheet keeps its full height and the on-screen keyboard
 * is simply drawn over the bottom third of it. The footer button goes under
 * the keys, and the only way to reach it is to scroll the document — which is
 * the one thing the layout rules say a screen must never do.
 *
 * That is not a hypothetical. The app is installed to a home screen as a web
 * app and used that way at a table, and on the New player sheet it meant Seat
 * and buy in could not be tapped at all.
 *
 * `visualViewport` is what the browser gives instead: when the keyboard opens
 * it shrinks, and the difference from the layout viewport is what is covered.
 * Everywhere but the web this returns 0 and the native path is left alone.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const vv = typeof window === 'undefined' ? undefined : window.visualViewport;
    if (vv === undefined || vv === null) return;

    const measure = (): void => {
      // `offsetTop` matters when the page itself has been scrolled by the
      // browser to keep the focused field visible; without it the inset is
      // over-reported and the sheet jumps above the keyboard.
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > 1 ? covered : 0);
    };

    measure();
    vv.addEventListener('resize', measure);
    vv.addEventListener('scroll', measure);
    return () => {
      vv.removeEventListener('resize', measure);
      vv.removeEventListener('scroll', measure);
    };
  }, []);

  return inset;
}
