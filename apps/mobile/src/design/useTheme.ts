import { useColorScheme } from 'react-native';
import { useThemeChoice, type ThemeName } from '../lib/themeStore';
import { darkTheme, lightTheme, type Theme } from './tokens';

/**
 * Which theme is on screen.
 *
 * The phone decides, until the reader says otherwise with the theme button in
 * home's dock — then their choice wins on this phone until they press it
 * again. Both themes are first-class, neither is a filter over the other, and
 * nothing in the app should ever hard-code a colour.
 */
export function useThemeName(): ThemeName {
  const phone = useColorScheme();
  const choice = useThemeChoice();
  if (choice !== 'system') return choice;
  return phone === 'light' ? 'light' : 'dark';
}

export function useTheme(): Theme {
  return useThemeName() === 'light' ? lightTheme : darkTheme;
}

/** Green for a win, red for a loss, plain text for square. */
export function moneyColor(theme: Theme, amount: number): string {
  if (amount > 0) return theme.win;
  if (amount < 0) return theme.loss;
  return theme.text;
}
