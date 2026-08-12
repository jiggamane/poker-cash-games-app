import { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { completeSignInFromUrl } from '../src/lib/authLink';
import { parseShareLink } from '../src/lib/shareLink';
import { openNight } from '../src/lib/nightStore';

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

  // Read the night off the device once, at the root, so every screen finds it
  // already there. It comes from SQLite, not the network — the app is fully
  // usable with no connection and no account.
  useEffect(() => {
    void openNight().catch(() => {});
  }, []);

  // Both kinds of link come back into the app here — the host's sign-in link
  // and the watcher's share link. It has to be handled at the root: a link can
  // arrive while the app is cold, backgrounded, or sitting on any screen, and
  // only the shell is guaranteed to be mounted.
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;

    // A watcher's link is a destination, so it navigates rather than being
    // silently absorbed. Redeeming happens on the screen it lands on, which is
    // also where the failures are worth reading — a revoked link should say so
    // somewhere the person holding it can see.
    const token = parseShareLink(url);
    if (token !== null) {
      router.push({ pathname: '/watch', params: { t: token } });
      return;
    }

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
