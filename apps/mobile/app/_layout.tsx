import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { completeSignInFromUrl } from '../src/lib/authLink';
import { openNight } from '../src/lib/nightStore';

/**
 * The navigation shell.
 *
 * NO TAB BAR — the design is explicit about this. The group is the root, and
 * the session and the book are pushed on top of it, so the club is always one
 * tap back rather than one tab across.
 *
 * Headers are off everywhere: every screen draws its own chrome. A pushed
 * screen draws Chrome A — a round back button on the title line, and NOTHING in
 * the top-right corner. A stock navigation bar would sit above all of that and
 * duplicate it.
 *
 * The screens listed below are sheets (Chrome B): things you open to do one
 * thing, which finish and drop away. They are presented as TRANSPARENT modals
 * rather than stock ones so the screen behind stays visible through the sheet's
 * own scrim at .32 — that dimmed strip of the pushed screen above the panel is
 * what tells you the thing behind is still there, in the same scroll position,
 * waiting.
 */
const SHEETS = ['pick', 'log', 'seat', 'entry'] as const;
export default function RootLayout() {
  const t = useTheme();

  // Read the night off the device once, at the root, so every screen finds it
  // already there. It comes from SQLite, not the network — the app is fully
  // usable with no connection and no account.
  useEffect(() => {
    void openNight().catch(() => {});
  }, []);

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
      >
        {SHEETS.map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        ))}
      </Stack>
    </SafeAreaProvider>
  );
}
