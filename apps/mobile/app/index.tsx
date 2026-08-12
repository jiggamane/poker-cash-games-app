import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { GROUP_NAME, inPlay, players } from '../src/data/sampleNight';
import { useSession } from '../src/lib/useSession';

/**
 * Home — the group. The root of everything; nothing is pushed beneath it.
 *
 * The destination name is a NAME, never a figure: the group is a place you go,
 * not a number you read. Figures belong to the night.
 */
export default function Home() {
  const t = useTheme();
  const seated = players.filter((p) => p.atTable).length;
  const { session, loading, configured } = useSession();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={[styles.destination, { color: t.text }]}>{GROUP_NAME}</Text>

        <Link href="/session" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.cardHead}>
              <View style={[styles.badge, { backgroundColor: t.win }]} />
              <Text style={[styles.live, { color: t.text }]}>Tonight</Text>
            </View>

            <Text style={[styles.figure, { color: t.text }]}>{formatMoney(inPlay)}</Text>
            <Text style={[styles.meta, { color: t.muted }]}>
              in play · {seated} at the table · started 20:05
            </Text>
          </Pressable>
        </Link>

        <View style={styles.spacer} />

        {/* Until the host is signed in the night lives only on this phone. Say
            so plainly rather than letting them find out at settle-up. */}
        {!loading && (
          <Text style={[styles.status, { color: t.muted }]}>
            {!configured
              ? 'Not connected — tonight stays on this phone.'
              : session
                ? `Signed in as ${session.user.email}`
                : 'Not signed in — tonight stays on this phone.'}
          </Text>
        )}

        {!loading && configured && !session && (
          <Button label="Sign in" variant="secondary" onPress={() => router.push('/sign-in')} />
        )}

        <Button label="Open a night" variant="primary" onPress={() => router.push('/session')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: space.page, paddingTop: 16, paddingBottom: 8 },
  destination: { ...type.destination, marginBottom: 20 },
  card: { borderRadius: radius.card, padding: space.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  /** 999px radius is reserved for the live badge and nothing else. */
  badge: { width: 8, height: 8, borderRadius: radius.badge },
  live: { ...type.label, letterSpacing: 1.2 },
  figure: { ...type.display, fontSize: 44 },
  meta: { ...type.meta, marginTop: 6 },
  spacer: { flex: 1 },
  status: { ...type.meta, marginBottom: 10 },
});
