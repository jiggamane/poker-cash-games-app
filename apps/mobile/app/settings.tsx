import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { useSession } from '../src/lib/useSession';
import { explainServerError, forgetSignIn, supabase, supabaseConfig } from '../src/lib/supabase';
import { checkConnection, type ConnectionReport } from '../src/lib/connection';
import { shareLinkFor } from '../src/lib/shareLink';
import { shareTokenFor, stopSharing, watcherCount } from '../src/lib/publish';
import { drain, syncStatus, type SyncStatus } from '../src/lib/sync';
import { pullBooks } from '../src/lib/pull';
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
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState<string | null>(null);

  // What the server makes of this build's key, and of this phone's sign-in.
  const [connection, setConnection] = useState<ConnectionReport | null>(null);
  const [checking, setChecking] = useState(false);

  // The watcher's link, once this night has been put on the server.
  const [link, setLink] = useState<string | null>(null);
  const [watchers, setWatchers] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    void syncStatus().then(setStatus).catch(() => setStatus(null));
  });

  const signedIn = session !== null;

  /**
   * The other direction — every night this account can see, onto this phone.
   *
   * Nothing local is overwritten: a night this phone already holds is skipped
   * whole, because the device that recorded a night is the authority on it. So
   * this is safe to press at any time, and does nothing at all on the phone
   * that recorded everything.
   */
  async function fetchNow() {
    setFetching(true);
    setFetched(null);
    try {
      const result = await pullBooks();
      setFetched(
        result.books === 0
          ? 'Nothing to fetch — this account is not in anybody’s book yet.'
          : result.added === 0
            ? 'Nothing new. Every night on the server is already here.'
            : `${result.added} ${result.added === 1 ? 'night' : 'nights'} added.`,
      );
    } catch (e) {
      setFetched(explainServerError(e));
    } finally {
      setFetching(false);
    }
  }

  /**
   * Ask the server what it makes of this build, and say so in one sentence.
   *
   * The one screen in the app allowed to be technical, because it is the only
   * one whose subject IS the plumbing. Everywhere else a server failure is
   * beside the point — a host inviting somebody cannot act on "Invalid API
   * key", and now does not have to: every other screen sends them here.
   */
  async function checkNow() {
    setChecking(true);
    try {
      const { data } = await supabase.auth.getSession();
      setConnection(await checkConnection(data.session?.access_token ?? null));
    } finally {
      setChecking(false);
    }
  }

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
      setShareError(explainServerError(e));
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
      setShareError(explainServerError(e));
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
            No server is configured for this build, so nothing leaves the phone. Connection, below,
            says exactly what is missing.
          </Text>
        ) : loading ? (
          <Text style={[styles.note, { color: t.muted }]}>Checking…</Text>
        ) : signedIn ? (
          <>
            <Fact
              label="Signed in as"
              value={session.user.email ?? (session.user.is_anonymous === true ? 'this phone' : 'unknown')}
            />
            <Action label={syncing ? 'Sending…' : 'Send what is waiting'} onPress={() => void sendNow()} />
            <Action
              label={fetching ? 'Fetching…' : 'Fetch my nights'}
              onPress={() => void fetchNow()}
            />
            {/* Signing out asks the server to retire the token first. If the
                server will not answer — no signal, or a token it has stopped
                accepting — the sign-in is dropped from the phone anyway, because
                a Sign out that leaves you signed in is not one. */}
            <Action
              label="Sign out"
              onPress={() => {
                void supabase.auth.signOut().then(({ error }) => {
                  if (error !== null) void forgetSignIn();
                });
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

        {/* Connection — where "Invalid API key" is explained and nowhere else.
            A failure of the plumbing has exactly one place to be read, so that
            no screen about players or money has to try to describe one. */}
        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Connection</Text>

        <Fact label="Project" value={supabaseConfig.ref ?? 'None'} />
        <Fact label="Key" value={keyLine()} />

        {supabaseConfig.complaint !== null && (
          <Text style={[styles.note, { color: t.loss }]}>{supabaseConfig.complaint}</Text>
        )}

        {connection !== null && (
          <>
            <Text
              style={[styles.note, { color: connection.ok ? t.muted : t.loss, paddingBottom: 4 }]}
            >
              {connection.headline}
            </Text>
            {connection.detail !== '' && (
              <Text style={[styles.note, { color: t.muted }]}>{connection.detail}</Text>
            )}
            {connection.ok && connection.anonymousSignIns === false && (
              <Text style={[styles.note, { color: t.loss }]}>
                Anonymous sign-ins are off for this project, so an invite code cannot be spent and a
                watcher’s link opens nothing. Authentication → Sign In / Providers → Anonymous
                sign-ins.
              </Text>
            )}
          </>
        )}

        <Action
          label={checking ? 'Checking…' : 'Check the connection'}
          onPress={() => void checkNow()}
          last={connection?.staleSignIn !== true}
        />

        {/* Offered only when the check has established that the sign-in itself
            is what the server is refusing. It clears the token without asking
            the server's permission — which it would refuse for the same reason
            it refuses everything else this phone sends. */}
        {connection?.staleSignIn === true && (
          <Action
            label="Forget this sign-in"
            onPress={() => {
              void forgetSignIn().then(() => setConnection(null));
            }}
            last
          />
        )}

        {/* The way in for a code that arrived down a phone rather than as a
            link — which, during testing, is every code. The link is a
            convenience wrapper; this is the door that always works. */}
        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Your place</Text>
        <Text style={[styles.note, { color: t.muted }]}>
          Somebody who runs a game can add you to their book and give you a ten-character code. It
          puts your own nights on this phone; it does not let you record anything.
        </Text>
        <Action label="I have an invite code" onPress={() => router.push('/claim')} last />

        {fetched !== null && <Text style={[styles.note, { color: t.muted }]}>{fetched}</Text>}

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

/**
 * Which key this build is carrying, in four characters.
 *
 * The tail rather than the key: enough to hold against the dashboard and settle
 * "have I actually restarted since I changed it", which is the question behind
 * most of the time lost to this. The anon key is public by design, so the
 * restraint is about legibility on a phone rather than about secrecy.
 */
function keyLine(): string {
  const facts = supabaseConfig.keyFacts;
  if (facts === null) return 'None';

  const kind =
    facts.kind === 'anon'
      ? 'anon'
      : facts.kind === 'publishable'
        ? 'publishable'
        : facts.kind === 'unknown'
          ? 'not a key'
          : 'SECRET — remove it';

  return `${kind} · ends ${facts.tail}`;
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
