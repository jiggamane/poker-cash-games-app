import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from './tokens';

/**
 * The OS decides the theme. Both are first-class — neither is "the default with
 * a variant" — so nothing in the app should ever hard-code a colour.
 */
export function useTheme(): Theme {
  return useColorScheme() === 'light' ? lightTheme : darkTheme;
}

/** Green for a win, red for a loss, plain text for square. */
export function moneyColor(theme: Theme, amount: number): string {
  if (amount > 0) return theme.win;
  if (amount < 0) return theme.loss;
  return theme.text;
}
