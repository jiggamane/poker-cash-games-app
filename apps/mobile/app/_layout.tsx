import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { completeSignInFromUrl } from '../src/lib/authLink';

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

  // The sign-in link comes back into the app here. It has to be handled at the
  // root: the link can arrive while the app is cold, backgrounded, or sitting
  // on any screen, and only the shell is guaranteed to be mounted.
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;
    void completeSignInFromUrl(url).catch(() => {
      // A stale or already-used link. useSession stays signed out and the
      // sign-in screen remains available; nothing to interrupt the host with.
    });
  }, [url]);

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
