import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import { completeSignInFromUrl } from '../src/lib/authLink';
import { openNight } from '../src/lib/nightStore';

/**
 * The navigation shell. 09-navigation.md.
 *
 * NO TAB BAR, ever. The club is the root and the only permanent screen.
 *
 * Every other screen is one of two things, and the list below is where that is
 * decided: a screen you navigate TO is PUSHED (Chrome A, `Screen`), and a
 * screen you open to do ONE THING is a SHEET (Chrome B, `Sheet`). The test:
 * if it ends with a Save, an Add, an Apply or a confirm, it is a sheet; if it
 * is a place you can stay in, it is a push.
 *
 * A sheet is a transparent modal because the design's scrim is not opaque —
 * what is behind sits at .32 and stays visible, which is what tells you the
 * thing underneath is still there and still yours.
 *
 * Headers are off everywhere: each chrome draws its own.
 */
const SHEET = {
  presentation: 'transparentModal',
  animation: 'slide_from_bottom',
  contentStyle: { backgroundColor: 'transparent' },
} as const;
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
        {/* Root, and pushes: the club, the night, the ending flow, settings. */}
        <Stack.Screen name="index" />
        <Stack.Screen name="session" />
        <Stack.Screen name="count-up" />
        <Stack.Screen name="deductions" />
        <Stack.Screen name="settle-up" />
        <Stack.Screen name="settings" />

        {/* Sheets. Each of these ends with one action and then gets out. */}
        <Stack.Screen name="player" options={SHEET} />
        <Stack.Screen name="pick" options={SHEET} />
        <Stack.Screen name="log" options={SHEET} />
        <Stack.Screen name="entry" options={SHEET} />
        <Stack.Screen name="seat" options={SHEET} />
        <Stack.Screen name="expenses" options={SHEET} />
        <Stack.Screen name="add-expense" options={SHEET} />
        <Stack.Screen name="house-rules" options={SHEET} />
        <Stack.Screen name="money-rules" options={SHEET} />
        <Stack.Screen name="rule" options={SHEET} />
        <Stack.Screen name="settled" options={SHEET} />
        <Stack.Screen name="sign-in" options={SHEET} />
      </Stack>
    </SafeAreaProvider>
  );
}
