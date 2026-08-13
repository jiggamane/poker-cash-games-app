import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { useSession } from '../src/lib/useSession';
import { supabase } from '../src/lib/supabase';
import { outbox, sync } from '../src/lib/ledgerRepo';
import { useNight } from '../src/lib/nightStore';
import { useClub } from '../src/lib/clubStore';

/**
 * Settings — GR7. Four sections: the group, the money, the people, the exits.
 *
 * It is also the only place an account is mentioned.
 *
 * Signing in is NOT a gate. A night runs entirely on this phone: the ledger,
 * the counting, the settlement and the record of it all work with no account
 * and no signal. What an account adds is a copy on the server — which is what
 * lets the night survive a lost phone, and what lets anyone else watch it.
 *
 * Putting it here rather than in front of the app is the whole point. A host
 * who has to sign in before recording a buy-in will put the phone down and
 * use paper.
 */
export default function Settings() {
  const t = useTheme();
  const { session, loading, configured } = useSession();
  const night = useNight();
  const club = useClub();

  const [queued, setQueued] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void outbox.count().then(setQueued).catch(() => setQueued(null));
  });

  const signedIn = session !== null;

  async function drain() {
    setSyncing(true);
    try {
      await sync();
    } catch {
      // Offline, or not signed in. The queue keeps everything; nothing is lost.
    } finally {
      setQueued(await outbox.count().catch(() => 0));
      setSyncing(false);
    }
  }

  return (
    <Screen
      title="Settings"
      backTo="the club"
      meta={club?.name}
    >
      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>The group</Text>

        <Fact label="Group name" value={club?.name ?? night?.groupName ?? '—'} />
        <Fact label="Currency" value={club?.currency ?? '—'} last />

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>The money</Text>

        {/*
         * The club's own layer of the chain. What is set here is what a night
         * opens with when the last game has nothing to say — and changing it
         * never reaches a night that is already running, or one already
         * settled.
         */}
        <Fact
          label="Standard buy-in"
          value={club === null ? '—' : formatMoney(club.defaultBuyIn)}
        />
        <Action label="Money rules" onPress={() => router.push('/club-rules')} last />

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>The people</Text>

        <Action label="Players" onPress={() => router.push('/players')} />
        <Fact
          label="Invited"
          value={
            club === null
              ? '—'
              : `${club.members.filter((m) => m.invited).length} waiting`
          }
          last
        />

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>This night</Text>

        <Fact label="Where it lives" value="On this phone" />
        <Fact
          label="Waiting to sync"
          value={queued === null ? '—' : queued === 0 ? 'Nothing' : `${queued} entries`}
          last
        />

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Account</Text>

        {!configured ? (
          <Text style={[styles.note, { color: t.muted }]}>
            No server is configured for this build, so nothing leaves the phone.
          </Text>
        ) : loading ? (
          <Text style={[styles.note, { color: t.muted }]}>Checking…</Text>
        ) : signedIn ? (
          <>
            <Fact label="Signed in as" value={session.user.email ?? 'unknown'} />
            <Action
              label={syncing ? 'Syncing…' : 'Sync now'}
              onPress={() => void drain()}
            />
            <Action
              label="Sign out"
              onPress={() => {
                void supabase.auth.signOut();
              }}
              last
            />
          </>
        ) : (
          <>
            <Text style={[styles.note, { color: t.muted }]}>
              Sign in to keep a copy on the server, so a night survives a lost phone and other
              people can watch it. Nothing recorded so far is lost either way — it is queued and
              sent the moment you do.
            </Text>
            <Action label="Sign in" onPress={() => router.push('/sign-in')} last />
          </>
        )}

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>The exits</Text>

        {/*
         * SPECIFIED, NOT DRAWN, and blocked on decisions rev 13 leaves open:
         * whether a club can have two admins and how admin is handed over,
         * whether you can leave with an unsettled debt, and whether deleting a
         * club destroys nights other people played in. A destructive control
         * whose behaviour nobody has decided is worse than no control, so it
         * says what it is waiting for instead.
         */}
        <Text style={[styles.note, { color: t.muted }]}>
          Leaving and deleting a club are not built. Both wait on decisions the group has not
          taken: whether a club can have a second admin and how it is handed over, whether
          somebody can leave with money outstanding, and what happens to nights other people
          played in.
        </Text>
      </View>
    </Screen>
  );
}

function Fact({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: t.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
      ]}
    >
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <Text style={[styles.value, { color: t.muted }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Action({
  label,
  onPress,
  last = false,
}: {
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: t.hairline,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <View style={styles.chevron}>
        <Icon name="chevron" color={t.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  after: { paddingTop: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
  },
  label: type.rowName,
  value: { ...type.meta, marginLeft: 'auto', flexShrink: 1 },
  chevron: { marginLeft: 'auto' },
  note: { ...type.footnote, paddingHorizontal: 4, paddingBottom: 14 },
});
