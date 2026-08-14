import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { useSession } from '../src/lib/useSession';
import { checkConnection, type ConnectionReport } from '../src/lib/connection';
import { shareTokenFor, stopSharing } from '../src/lib/publish';
import { pullBooks } from '../src/lib/pull';
import { shareLinkFor } from '../src/lib/shareLink';
import { explainServerError, supabase } from '../src/lib/supabase';
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
  const [fetching, setFetching] = useState(false);
  const [report, setReport] = useState<ConnectionReport | null>(null);
  const [fetched, setFetched] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    void outbox.count().then(setQueued).catch(() => setQueued(null));
  });

  const signedIn = session !== null;

  /**
   * The one place that asks the server what is wrong.
   *
   * "Invalid API key" is one message for four unrelated causes and it used to
   * surface on whichever screen happened to ask. `connection.ts` asks the two
   * questions separately — does the server accept this build's KEY, and does it
   * accept this phone's SIGN-IN — because they fail independently and their
   * fixes have nothing to do with each other.
   */
  async function probe() {
    setReport(await checkConnection(session?.access_token ?? null));
  }

  async function fetchMine() {
    setFetching(true);
    try {
      const { added, books } = await pullBooks();
      setFetched(
        books === 0
          ? 'You do not belong to a book yet — claim an invite first.'
          : added === 0
            ? 'Nothing new. Every night on the server is already on this phone.'
            : `${added} ${added === 1 ? 'night' : 'nights'} came down.`,
      );
    } catch (e) {
      setFetched(explainServerError(e));
    } finally {
      setFetching(false);
    }
  }

  async function share() {
    if (night === null) return;
    setSharing(true);
    try {
      const token = await shareTokenFor(night.sessionId);
      // The code and the link together, same as an invite: the link is the
      // convenience and the room is what makes it safe to send.
      await Share.share({ message: shareLinkFor(token) });
    } catch (e) {
      setFetched(explainServerError(e));
    } finally {
      setSharing(false);
    }
  }

  async function unshare() {
    if (night === null) return;
    try {
      await stopSharing(night.sessionId);
      setFetched('The link is rotated and every watcher is cut off. Anyone still holding a valid token keeps reading until it expires, within the hour.');
    } catch (e) {
      setFetched(explainServerError(e));
    }
  }

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
        />
        {/*
         * X2d, reached without a link. During development this is how every
         * invite arrives — an `exp://` URL points at a laptop on somebody's
         * wifi and nobody outside the room can open it — and afterwards it is
         * the answer to a chat app that mangled one.
         */}
        <Action label="I have an invite code" onPress={() => router.push('/claim')} last />

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
            {/*
             * Filling this phone from the server, which is what a claimed seat
             * is FOR. Separate from "Sync now" because they run in opposite
             * directions and fail for different reasons — one is "my night is
             * not on the server", the other is "my nights are not on my phone",
             * and one control for both would answer neither.
             */}
            <Action
              label={fetching ? 'Fetching…' : 'Fetch my nights'}
              onPress={() => void fetchMine()}
            />
            <Action label="Connection" onPress={() => void probe()} />
            {/*
             * The watcher's half. Sharing is NOT publishing — the night reached
             * the server the moment it opened, through the queue — so this only
             * ever hands over the link, and stopping rotates the token and
             * revokes every grant at once.
             *
             * One honest gap, stated where a host will read it rather than
             * buried: rotation is immediate, but a phone already holding a
             * valid token keeps reading until it expires, within the hour.
             */}
            {night !== null && (
              <Action
                label={sharing ? 'Sharing…' : 'Share this night'}
                onPress={() => void share()}
              />
            )}
            {night !== null && (
              <Action label="Stop sharing" onPress={() => void unshare()} />
            )}
            {fetched !== null && <Text style={[styles.note, { color: t.muted }]}>{fetched}</Text>}
            {report !== null && (
              <Text style={[styles.note, { color: report.ok ? t.muted : t.loss }]}>
                {report.headline}
                {report.detail === '' ? '' : ` — ${report.detail}`}
              </Text>
            )}
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
