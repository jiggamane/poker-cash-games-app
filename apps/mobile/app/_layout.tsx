import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';

/**
 * The navigation shell.
 *
 * NO TAB BAR — the design is explicit about this. The group is the root, and
 * the session and the book are pushed on top of it, so the club is always one
 * tap back rather than one tab across.
 *
 * Headers are off everywhere: every screen draws its own large title top-left,
 * and pushed screens carry their own labelled back plus a home glyph. A stock
 * navigation bar would sit above all of that and duplicate it.
 */
export default function RootLayout() {
  const t = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={t.name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.ground },
          animation: 'slide_from_right',
        }}
      />
    </SafeAreaProvider>
  );
}
