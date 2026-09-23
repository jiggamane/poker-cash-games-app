import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '../src/lib/money';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { currencyFor } from '../src/data/currencies';
import { useSession } from '../src/lib/useSession';
import { checkConnection, type ConnectionReport } from '../src/lib/connection';
import { shareTokenFor, stopSharing } from '../src/lib/publish';
import { pullBooks } from '../src/lib/pull';
import { shareLinkFor } from '../src/lib/shareLink';
import { explainServerError, supabase } from '../src/lib/supabase';
import { sync } from '../src/lib/ledgerRepo';
import { syncStatus } from '../src/lib/sync';
import { accountLine, type BackupState } from '../src/lib/accountLine';
import * as Clipboard from 'expo-clipboard';
import { readBackup, restoreBackup, useNight } from '../src/lib/nightStore';
import { useClub } from '../src/lib/clubStore';

/**
 * Settings — GR7. Four sections: the group, the money, the players, the exits.
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
  const { session, loading, configured, who } = useSession();
  const night = useNight();
  const club = useClub();
  /* Whether this phone runs the group, read exactly as home reads it: a reader
     is the host unless the club positively says somebody else is. */
  const adminRow = club?.members.find((m) => m.standing === 'admin');
  const meId = night?.meId;
  const admin = adminRow === undefined || meId === undefined || adminRow.id === meId;

  const [backup, setBackup] = useState<BackupState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [report, setReport] = useState<ConnectionReport | null>(null);
  const [fetched, setFetched] = useState<string | null>(null);
  /* Kept apart from `fetched`: one is about the server, this is about a file. */
  const [kept, setKept] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    void syncStatus().then(setBackup).catch(() => setBackup(null));
  });

  /*
   * WHO IS HOLDING THIS PHONE — B91, and it is not `session !== null`.
   *
   * A watcher who opened a share link, and a player who claimed a seat with an
   * invite code, both have a real Supabase session: `redeemShareToken` and
   * `redeemInvite` sign in anonymously first because a grant has to be attached
   * to somebody. This screen read that as an account and drew `Signed in as
   * unknown` over the host's own controls — Sync now, Fetch my nights, Share
   * this night — none of which that phone can do.
   */
  const signedIn = who.kind === 'person';

  /*
   * AND THE ONE LINE ABOUT WHERE THE BOOK LIVES — B90.
   *
   * Three rows used to answer this and none of them could see the other two:
   * the queue depth under `This night`, the email under `Account`, and the
   * connection verdict wherever it happened to land. `accountLine` is the
   * whole answer, computed from every fact at once, which is what stops
   * `Backed up` from being drawn over a phone that has never signed in.
   */
  const line = accountLine({ configured, loading, who, backup, probe: report });

  const currency = club === null ? null : currencyFor(club.currency);

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
      const { added, books, players } = await pullBooks();
      // The roster comes down with the nights, and can come down without them:
      // a group set up on the server with no game played yet is people and
      // nothing else, and "nothing new" would have been a lie about it.
      const nights = `${added} ${added === 1 ? 'night' : 'nights'}`;
      const people = `${players} ${players === 1 ? 'player' : 'players'}`;
      setFetched(
        books === 0
          ? 'You do not belong to a book yet — claim an invite first.'
          : added === 0 && players === 0
            ? 'Nothing new. Every night on the server is already on this phone.'
            : added === 0
              ? `${people} came down.`
              : players === 0
                ? `${nights} came down.`
                : `${nights} and ${people} came down.`,
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

  /**
   * THE THIRD COPY, onto the clipboard.
   *
   * Clipboard rather than a file because `expo-clipboard` is already a
   * dependency and `expo-file-system` is not — `apps/mobile/AGENTS.md` pins
   * every version to SDK 57's manifest and `docs/sharing-formats.md` is
   * explicit that a module with a native half has to be confirmed in Expo Go
   * before it is designed around. A file is the better shape and is open.
   *
   * It works signed out and with no server configured, which is the whole point
   * of it: the phone that most needs a backup is the one nothing else is
   * holding.
   */
  async function copyBackup() {
    try {
      const backup = await readBackup();
      await Clipboard.setStringAsync(JSON.stringify(backup));
      const n = backup.nights.length;
      setKept(
        n === 0
          ? 'Nothing to copy yet — no night has been played on this phone.'
          : `${n} ${n === 1 ? 'night' : 'nights'} copied. Paste it somewhere you keep things.`,
      );
    } catch {
      setKept('Could not read the book on this phone.');
    }
  }

  /**
   * And back in. Additive by construction — `importNights` skips a night this
   * phone already has — so running it twice is safe, which matters because
   * anybody reaching for this is already having a bad day.
   */
  async function restore() {
    try {
      const added = await restoreBackup(await Clipboard.getStringAsync());
      setKept(
        added === null
          ? 'That is not a backup from this app.'
          : added === 0
            ? 'Nothing new. Every night in it is already on this phone.'
            : `${added} ${added === 1 ? 'night' : 'nights'} restored.`,
      );
    } catch {
      setKept('Could not read the clipboard.');
    }
  }

  async function drain() {
    setSyncing(true);
    try {
      await sync();
    } catch {
      // Offline, or not signed in. The queue keeps everything; nothing is lost.
    } finally {
      setBackup(await syncStatus().catch(() => null));
      setSyncing(false);
    }
  }

  return (
    <Screen
      title="Settings"
      backTo="the club"
      /* GR7's subtitle is the club and your standing in it — "people" came
         out of it in rev 18, and the standing is what a reader needs: this
         screen shows different things to an admin and to a member. */
      meta={
        club === null ? undefined : `${club.name} · you are ${admin ? 'admin' : 'a member'}`
      }
    >
      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>The group</Text>

        <Fact label="Group name" value={club?.name ?? night?.groupName ?? '—'} />
        <Fact
          label="Currency"
          value={currency === null ? '—' : `${currency.code} · ${currency.name}`}
        />
        {/*
         * Home is the card, the two lists and this button now, so the one
         * cross-group screen in the app hangs here — beside the name of the
         * group you are in, which is the question it answers.
         */}
        <Action label="Your groups" onPress={() => router.push('/groups')} last />

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>The money</Text>

        {/*
         * The club's own layer of the chain. What is set here is what a night
         * opens with when the last game has nothing to say — and changing it
         * never reaches a night that is already running, or one already
         * settled.
         */}
        <Fact
          label="Standard buy-in"
          value={
            club === null || currency === null
              ? '—'
              : formatMoney(club.defaultBuyIn)
          }
        />
        <Action label="Money rules" onPress={() => router.push('/club-rules')} last />

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>The people</Text>

        {/*
         * WHICH OF THE NAMES IS YOU.
         *
         * ⚠ COPY NOT DRAWN. GR7 has no row for this, because it was written for
         * a club whose host had always been themselves. On a phone the app
         * seeded, they are not: the roster opens with a table of people out of
         * the design's canonical night and one of them is silently carrying the
         * host's own figures. This is mine and it wants review — but a screen
         * that says "you are admin" while naming nobody is the state that let a
         * host play a whole night filed under somebody else.
         *
         * It goes to GR5, which is where the two corrections live: the name
         * field, and *this is me* on a different row.
         */}
        {adminRow !== undefined && (
          <FactAction
            label="You"
            value={adminRow.name}
            onPress={() => router.push({ pathname: '/member', params: { id: adminRow.id } })}
          />
        )}
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

        {/*
         * `This night` UNTIL B90, and the heading was wrong for everything
         * under it. The queue figure was the whole app's, which B84 flagged
         * here and `docs/storage-and-sync.md` recorded as open; the two backup
         * rows below write every night on the handset. Moving `Where it lives`
         * into Account — where the sign-in it depends on is — leaves this
         * section saying what it actually does, and closes that flag.
         *
         * ⚠ NEW COPY, one word, and no board draws this screen to argue with.
         * Flagged in `docs/screens.md` with the other two.
         */}
        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>This phone</Text>

        {/*
         * THE THIRD COPY, and deliberately above the Account section rather
         * than inside it. Everything below needs a server and a sign-in; this
         * needs neither, and a phone with no account is exactly the phone with
         * nothing else holding its book.
         */}
        <Action label="Copy a backup" onPress={() => void copyBackup()} />
        <Action label="Restore from a backup" onPress={() => void restore()} last />
        {kept !== null && <Text style={[styles.note, { color: t.muted }]}>{kept}</Text>}

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Account</Text>

        {/*
         * THE ONE STATUS LINE — B90, and the reason it is the first row here
         * rather than three rows in two sections.
         *
         * A host had to read `Saved on this phone · 12 waiting` under one
         * heading and `Sign in to keep a copy on the server` under another and
         * work out that those are the same sentence — and in the state that
         * matters most, an empty queue on a phone with no account, the first
         * one said `Backed up` outright. `accountLine` answers both axes at
         * once or it answers neither.
         *
         * The `testID` is for `scripts/ui-audit.mjs`, which holds the row to
         * being present and non-empty on every built screen it walks. A status
         * row that renders nothing is the failure this replaces.
         */}
        <Fact label="Where it lives" value={line.where} testID="account-line" />
        {line.detail !== null && (
          <Text style={[styles.note, { color: line.wrong ? t.loss : t.muted }]}>{line.detail}</Text>
        )}
        {line.trouble !== null && (
          <Text style={[styles.note, { color: t.muted }]}>{line.trouble}</Text>
        )}

        {!configured || loading ? null : signedIn ? (
          <>
            {/* The address, because the line above says where the book is and
                this says whose it is. `who.email` is null only where a server
                issued an account without one — `unknown` used to be drawn here
                for every watcher in the app, which is B91. */}
            {who.kind === 'person' && who.email !== null && (
              <Fact label="Signed in as" value={who.email} />
            )}
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
            {/* Every verdict EXCEPT the one about this phone's sign-in: that
                one is the status line at the top of this section now, and
                drawing it twice puts the same sentence in two places with a
                list of controls between them. B90. */}
            {report !== null && !report.staleSignIn && (
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
          /* The invitation itself is `line.detail` above, where it is one
             sentence about one thing rather than a note under a heading that
             has already said something else. This is the way out of it. */
          <Action label="Sign in" onPress={() => router.push('/sign-in')} last />
        )}

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>The exits</Text>

        {/* GR9. Only the admin sees it — there is nothing to hand over
            otherwise — and it is an exit: you stop running the group. */}
        {admin && <Action label="Hand over admin" onPress={() => router.push('/hand-over')} />}

        {/*
         * LEAVING AND DELETING ARE STILL SPECIFIED, NOT DRAWN. Rev 18 answered
         * the admin question — GR9, one admin at a time, above — and left the
         * other two open: whether you can leave with an unsettled debt, and
         * whether deleting a club destroys nights other people played in. A
         * destructive control whose behaviour nobody has decided is worse than
         * no control, so it says what it is waiting for instead.
         */}
        <Text style={[styles.note, { color: t.muted }]}>
          Leaving and deleting a club are not built. Both wait on decisions the group has not
          taken: whether somebody can leave with money outstanding, and what happens to nights
          other people played in.
        </Text>
      </View>

      <Build />
    </Screen>
  );
}

/**
 * WHICH BUILD THIS IS — the last line on the last screen, and the quietest
 * thing in the app.
 *
 * It answers one question, and it is a question that had no answer from either
 * end: an update is published, the workflow is green, and the phone goes on
 * drawing the previous screen. Expo Go fetches an update on a cold start and
 * applies it on the NEXT one, so a phone one launch behind is behaving exactly
 * as designed and looks exactly like a phone that got a broken publish. Reading
 * the commit here and comparing it to the one the workflow published separates
 * the two in two seconds.
 *
 * THE STAMP IS INLINED BY THE BUNDLER — `scripts/build-stamp.mjs`, which is
 * where the two reasons it is neither `app.config.js`'s `extra` nor
 * `Updates.updateId` are written down. `unknown` where the build was made
 * somewhere with no git and no CI, which is honest and is not a bug.
 *
 * ⚠ NO BOARD DRAWS THIS. It is written to the grammar of the footnotes around
 * it — 12/400 in `muted`, at the page's own inset — and flagged rather than
 * passed off as decided copy. It is deliberately not a `Fact` row: those are
 * things about the GROUP, and this is a thing about the phone.
 */
function Build() {
  const t = useTheme();
  /*
   * WRITTEN OUT IN FULL, not `process.env[name]`. Metro substitutes the literal
   * member expression at bundle time and does nothing at all for a computed
   * one, so a tidier lookup here is a line that reads `undefined` on every
   * phone.
   */
  const commit = process.env.EXPO_PUBLIC_BUILD_COMMIT;
  const at = process.env.EXPO_PUBLIC_BUILD_AT;
  if (commit === undefined || commit === '') return null;

  /* The moment the bundle was made, in the reader's own locale. The time is on
     it because two publishes in one afternoon is the ordinary case on a day
     anybody is reading this line at all. */
  const made = at === undefined ? null : new Date(at);
  const when =
    made === null || Number.isNaN(made.getTime())
      ? null
      : made.toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

  return (
    <Text testID="build-stamp" style={[styles.build, { color: t.muted }]} numberOfLines={1}>
      {[`build ${commit}`, when].filter((x) => x !== null).join(' · ')}
    </Text>
  );
}

function Fact({
  label,
  value,
  last = false,
  testID,
}: {
  label: string;
  value: string;
  last?: boolean;
  /* Only the account line carries one, so the built screen can be asked
     whether it rendered. See `scripts/ui-audit.mjs`. */
  testID?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: t.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
      ]}
    >
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <Text style={[styles.value, { color: t.muted }]} numberOfLines={1} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

/**
 * A fact you can correct — the value on the right and the chevron after it.
 *
 * `Fact` and `Action` are the two halves of this list and neither one fits a
 * row that both states something and leads somewhere. Rather than a third
 * layout it is the two of them side by side: `Fact`'s value, `Action`'s
 * chevron, and the same row metrics as everything above and below it.
 */
function FactAction({
  label,
  value,
  onPress,
  last = false,
}: {
  label: string;
  value: string;
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
      <Text style={[styles.value, { color: t.muted }]} numberOfLines={1}>
        {value}
      </Text>
      {/* No `marginLeft: auto` here: the value has already taken the space and
          the chevron only follows it. */}
      <Icon name="chevron" color={t.muted} />
    </Pressable>
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
  /* The last line on the screen, at the page's own inset, tabular so the
     commit reads as an identifier rather than as a word. */
  build: {
    ...type.footnote,
    marginHorizontal: space.page,
    paddingTop: 18,
    paddingBottom: 4,
    fontVariant: ['tabular-nums'],
  },
});
