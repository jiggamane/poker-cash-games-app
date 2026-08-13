import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { useSession } from '../src/lib/useSession';
import { supabase } from '../src/lib/supabase';
import { shareLinkFor } from '../src/lib/shareLink';
import { shareTokenFor, stopSharing, watcherCount } from '../src/lib/publish';
import { drain, syncStatus, type SyncStatus } from '../src/lib/sync';
import { useNight } from '../src/lib/nightStore';

/**
 * Settings — and the only place an account is mentioned.
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

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  // The watcher's link, once this night has been put on the server.
  const [link, setLink] = useState<string | null>(null);
  const [watchers, setWatchers] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    void syncStatus().then(setStatus).catch(() => setStatus(null));
  });

  const signedIn = session !== null;

  async function sendNow() {
    setSyncing(true);
    try {
      await drain();
    } catch {
      // Offline, or not signed in. The queue keeps everything; nothing is lost.
    } finally {
      setStatus(await syncStatus().catch(() => null));
      setSyncing(false);
    }
  }

  /**
   * Hand the room the link. Nothing is published here.
   *
   * The night went to the server when it opened. This reads the token that came
   * with it — so a night that has not reached the server yet has no link, and
   * says so rather than pretending.
   */
  async function share() {
    if (night === null) return;
    setSharing(true);
    setShareError(null);
    try {
      // The night is already on the server, or queued to be — this only reads
      // the link. A night that has not reached the server yet has no token to
      // read, and the error says exactly that.
      await drain();
      const token = await shareTokenFor(night.sessionId);
      const url = shareLinkFor(token);
      setLink(url);
      setWatchers(await watcherCount(night.sessionId).catch(() => 0));
      await Share.share({ message: url });
    } catch (e) {
      setShareError(e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  }

  async function unshare() {
    if (night === null) return;
    setSharing(true);
    setShareError(null);
    try {
      await stopSharing(night.sessionId);
      setLink(null);
      setWatchers(0);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  }

  return (
    <Screen
      title="Settings"
      backTo="The group"
      lede="Everything below is optional. The app records a night without any of it."
    >
      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>This night</Text>

        {/* One honest line. A host about to wipe their phone deserves to know
            whether the night is anywhere else yet. */}
        <Fact
          label="Where it lives"
          value={
            status === null
              ? 'On this phone'
              : status.waiting === 0
                ? signedIn
                  ? 'On this phone and the server'
                  : 'On this phone'
                : `On this phone · ${status.waiting} waiting`
          }
        />
        <Fact label="Group" value={night?.groupName ?? '—'} last />

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
            <Action label={syncing ? 'Sending…' : 'Send what is waiting'} onPress={() => void sendNow()} />
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

        {status !== null && status.lastError !== null && (
          <Text style={[styles.note, { color: t.muted }]}>
            Last try: {status.lastError}
          </Text>
        )}

        {signedIn && night !== null && (
          <>
            <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Watchers</Text>

            <Text style={[styles.note, { color: t.muted }]}>
              Whoever opens the link can read this night — the running list, as it happens — and
              nothing else. They never sign up: the link is their whole credential, which is also
              why anyone it is forwarded to can watch too.
            </Text>

            {link !== null && (
              <>
                <Fact
                  label="Watching now"
                  value={watchers === null ? '—' : watchers === 0 ? 'Nobody yet' : String(watchers)}
                />
                <View style={[styles.row, { borderBottomColor: t.hairline, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <Text style={[styles.linkText, { color: t.muted }]} selectable>
                    {link}
                  </Text>
                </View>
              </>
            )}

            <Action
              label={sharing ? 'Working…' : link === null ? 'Share this night' : 'Send the link again'}
              onPress={() => void share()}
              last={link === null}
            />

            {link !== null && (
              <Action label="Stop sharing" onPress={() => void unshare()} last />
            )}

            {shareError !== null && (
              <Text style={[styles.note, { color: t.loss }]}>{shareError}</Text>
            )}
          </>
        )}
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
  linkText: { ...type.footnote, flexShrink: 1 },
});
