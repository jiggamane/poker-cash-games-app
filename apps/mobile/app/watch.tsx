import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { resolveLedger, settle, type Money, type PlayerId } from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { NightResult } from '../src/components/NightResult';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { claimedSeat } from '../src/lib/identity';
import { openShareLink } from '../src/lib/shareLink';
import { watchedSessionId } from '../src/lib/supabase';
import { hasEnded, useWatchedNight, type WatchedNight } from '../src/lib/watchNight';

/**
 * X1 — watching somebody else's night. Rev 15, `14-invite-and-watcher.md`.
 *
 * A PUSH, NOT A ROOT (S77). There is no watcher's install: every install is a
 * host install with a book in it, so a share link opens the club and pushes the
 * night on top of it, and back returns to the club exactly as it does from
 * Tonight. The "Root, for a watcher's install" row in `09-navigation.md` is
 * superseded.
 *
 * Three states, and they are one screen because they are one night at three
 * moments: X1a live, X1c ended, X1b refused. The first two share their whole
 * frame — a header, the reader's own card, the table, and a read-only band
 * pinned to the bottom — and differ in what the card can honestly say.
 *
 * NO ACTION BAR ANYWHERE, and that is the design rather than an omission: the
 * screen terminates in a hairline-topped band where a dock would be, so it ends
 * in a statement instead of a control and nothing floats in a void.
 */
export default function Watch() {
  /*
   * Two ways in, and the token is the interesting one. A share link is
   * `…/watch?t=TOKEN`, so expo-router lands here with the token still
   * unredeemed — the route IS the arrival, and redeeming it anywhere else
   * would mean racing the router to the screen.
   *
   * `session` is the same screen reached from inside the app, where the grant
   * already exists.
   */
  const { session: asked, t: token } = useLocalSearchParams<{ session?: string; t?: string }>();
  const [sessionId, setSessionId] = useState<string | null>(asked ?? null);
  const [resolving, setResolving] = useState(asked === undefined);
  const [me, setMe] = useState<PlayerId | null>(null);

  useEffect(() => {
    if (asked !== undefined) return;
    let alive = true;

    /*
     * Redeeming is idempotent — the grant is upserted — so re-opening a link
     * that already worked is not a second act. What it does do is refresh the
     * session, which is the only way the claim reaches this device: the grant
     * arrives inside a NEWLY ISSUED token, and without that every read comes
     * back empty and looks exactly like a broken policy.
     */
    const resolve =
      token === undefined
        ? watchedSessionId()
        : openShareLink(token).catch(() => null);

    void resolve
      .then((id) => {
        if (alive) setSessionId(id);
      })
      .finally(() => {
        if (alive) setResolving(false);
      });

    return () => {
      alive = false;
    };
  }, [asked, token]);

  useEffect(() => {
    let alive = true;
    void claimedSeat().then((id) => {
      if (alive) setMe(id);
    });
    return () => {
      alive = false;
    };
  }, []);

  const { night, loading, error } = useWatchedNight(sessionId);

  if (resolving || (loading && sessionId !== null)) return <Checking />;

  /*
   * X1b. One line for every way a link can fail to open a night — no such
   * token, revoked, the book closed, or a grant this device never had. The
   * server already refuses in one shape (S80, `0009_invite_privacy.sql`); this
   * is the screen keeping that promise rather than reporting what it was told.
   */
  if (sessionId === null || night === null) return <Refused detail={error} />;

  return <Night night={night} me={me} />;
}

/** X2a's shape, borrowed: a hairline, no spinner glyph, nothing to press. */
function Checking() {
  const t = useTheme();
  return (
    <Screen title="Opening the night" backTo="the club">
      <View style={styles.checking}>
        <Text style={[styles.lede, { color: t.muted }]}>This takes a second.</Text>
        <View style={[styles.progressTrack, { backgroundColor: t.hairline }]}>
          <View style={[styles.progressFill, { backgroundColor: t.text }]} />
        </View>
      </View>
    </Screen>
  );
}

/**
 * X1b · Refused.
 *
 * X2c's geometry with one line changed and no control at all — there is nothing
 * for a watcher to type. The `detail` is deliberately swallowed: § 3 recommends
 * governing a share link by the same rule as an invite code, and a live-feed
 * URL is as enumerable as a ten-character code. It goes to the console for a
 * developer and nowhere near the screen.
 */
function Refused({ detail }: { detail: string | null }) {
  const t = useTheme();
  if (detail !== null && __DEV__) console.warn('watch: refused —', detail);
  return (
    <Screen title="This link isn’t live" backTo="the club">
      <Text style={[styles.refusedBody, { color: t.muted }]}>
        Ask whoever sent it for a new one.
      </Text>
    </Screen>
  );
}

function Night({ night, me }: { night: WatchedNight; me: PlayerId | null }) {
  const t = useTheme();
  const ended = hasEnded(night);

  const ledger = useMemo(() => resolveLedger(night.entries), [night.entries]);

  /*
   * The settlement, once there is one. A live night has no result — nobody
   * knows yet — and asking the engine for one would be inventing an answer to
   * a question the table has not finished asking.
   */
  const result = useMemo(() => {
    if (!ended) return null;
    try {
      return settle({
        players: night.players,
        entries: night.entries,
        finalCounts: night.finalCounts,
        rules: night.rules,
        // The host's rounding rule, through `night_header`. Settling without it
        // would put a different set of figures on this screen from the ones the
        // room is looking at.
        ...(night.roundingMode === null ? {} : { roundingMode: night.roundingMode }),
      });
    } catch {
      return null;
    }
  }, [ended, night]);

  const mine = me === null ? null : night.players.find((p) => p.id === me) ?? null;

  return (
    <Screen
      title={ended ? nightDate(night.startedAt) : 'Tonight'}
      /*
       * WATCHING, and nothing once the night has ended. E6: a confirmed result
       * states no status of its own, and nothing at all is placed to the right
       * of its title. While the night is still running the badge is not a
       * result — it says what this reader is doing — so it stays.
       */
      badge={ended ? undefined : <Status label="WATCHING" />}
      meta={metaLine(night, ended)}
      backTo="the club"
      scroll={false}
    >
      <View style={styles.body}>
        {result === null ? (
          <>
            <LiveSeat night={night} mine={mine} />
            <Live night={night} ledger={ledger} me={me} />
          </>
        ) : (
          /*
           * THE SAME SCREEN THE HOST READS on `settled.tsx`, and after E6 it
           * is the same in every particular: the prize pool, the table, the
           * deductions. X1c gave the two readers different projections of the
           * same night because each of them got their own card and their own
           * settlement line; E6 draws every player a row of the same weight,
           * so there is nothing left for the two to disagree about. What still
           * differs is the band under it, and the band is this screen's.
           *
           * `hostName` is who signs off a difference here — a watcher cannot
           * ask the host what happened at 00:52, so the block that states the
           * gap says who logged it.
           */
          <NightResult result={result} ledger={ledger} loggedBy={night.hostName} />
        )}

        {/*
         * The band. `marginTop: auto` is what pins it to the space a dock would
         * occupy — it is not a footer prop, because a footer would sit outside
         * the scrolling body and the drawing puts it inside, under the list.
         */}
        <View style={[styles.band, { borderTopColor: t.hairline, backgroundColor: t.ground }]}>
          <Text style={[styles.bandText, { color: t.muted }]}>{readOnlyLine(night.hostName)}</Text>
        </View>
      </View>
    </Screen>
  );
}

/**
 * X1a's card. YOUR SEAT, and it carries no result.
 *
 * "counted at the end" is the third line and the reason the card works: live,
 * nobody knows what anyone is worth, and without that sentence a reader spends
 * the evening looking for a number that does not exist yet.
 */
function LiveSeat({ night, mine }: { night: WatchedNight; mine: { id: string; name: string } | null }) {
  const t = useTheme();
  if (mine === null) return null;

  const boughtIn = night.entries
    .filter((e) => e.playerId === mine.id && (e.type === 'buyin' || e.type === 'rebuy'))
    .reduce((sum, e) => sum + e.amount, 0) as Money;
  const buyIns = night.entries.filter(
    (e) => e.playerId === mine.id && (e.type === 'buyin' || e.type === 'rebuy'),
  ).length;

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
      <Text style={[styles.cardEyebrow, { color: t.muted }]}>YOUR SEAT</Text>
      <Text style={[styles.seatName, { color: t.text }]}>You, {mine.name}</Text>
      <Text style={[styles.seatLine, { color: t.text }]}>
        in {formatMoney(boughtIn)} · {buyIns} {buyIns === 1 ? 'buy-in' : 'buy-ins'}
      </Text>
      <Text style={[styles.seatMuted, { color: t.muted }]}>counted at the end</Text>
    </View>
  );
}

/** X1a's two figures, then the feed. */
function Live({
  night,
  ledger,
  me,
}: {
  night: WatchedNight;
  ledger: ReturnType<typeof resolveLedger>;
  me: PlayerId | null;
}) {
  const t = useTheme();
  const seated = night.players.filter((p) => p.atTable).length;

  return (
    <>
      <View style={styles.figures}>
        <View style={styles.figure}>
          <Text style={[styles.figureLabel, { color: t.muted }]}>IN PLAY</Text>
          <Text style={[styles.figureValue, { color: t.text }]}>
            {formatMoney(ledger.totalBoughtIn)}
          </Text>
        </View>
        <View style={styles.figure}>
          <Text style={[styles.figureLabel, { color: t.muted }]}>AT THE TABLE</Text>
          <Text style={[styles.figureValue, { color: t.text }]}>{seated}</Text>
        </View>
      </View>

      <View style={styles.feed}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>The night so far</Text>
        {[...night.entries]
          .reverse()
          .slice(0, 30)
          .map((e) => {
            const isMine = e.playerId !== null && e.playerId === me;
            const who = isMine ? 'You' : nameIn(night, e.playerId ?? e.payerId ?? null);
            return (
              <View key={e.id} style={styles.feedRow}>
                <Text style={[styles.feedTime, { color: t.muted }]}>{clock(e.occurredAt)}</Text>
                <Text
                  style={[isMine ? styles.feedNameMine : styles.feedName, { color: isMine ? t.text : t.muted }]}
                >
                  {who} {verb(e.type)}
                </Text>
                <Text style={[styles.feedAmount, { color: t.text }]}>{formatMoney(e.amount)}</Text>
              </View>
            );
          })}
      </View>
    </>
  );
}

/**
 * The WATCHING / SETTLED pill.
 *
 * NOT the `Pill` component and not the LIVE badge: 999px belongs to the host's
 * live badge alone, and this is a 7px status pill in card fill with a hairline
 * around it. Two things that look alike would say the same thing, and one of
 * them means "this night is running" while the other means "you are reading".
 */
function Status({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.status, { backgroundColor: t.surface, borderColor: t.hairline }]}>
      <Text style={[styles.statusLabel, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

/** "kept by Marek · 3h 17m" live; "· 6 players" once it has ended. */
function metaLine(night: WatchedNight, ended: boolean): string {
  const parts: string[] = [];
  if (night.hostName !== null) parts.push(`kept by ${night.hostName}`);
  parts.push(elapsed(night.startedAt, night.endedAt));
  if (ended) parts.push(`${night.playerCount} players`);
  /* AND THE STATE LAST, as `settled.tsx` writes it — E6 takes the status pill
     off a confirmed result, and this is where the word goes instead. */
  if (ended) parts.push('settled');
  return parts.join(' · ');
}

/**
 * The band's line, which names the host.
 *
 * A host with no player row has no name to give (`0010_night_header.sql`), and
 * the sentence still has to be true. "Only the host can write to the ledger"
 * says the same thing without a hole in it.
 */
const readOnlyLine = (hostName: string | null): string =>
  hostName === null
    ? 'Read-only. Only the host can write to the ledger.'
    : `Read-only. Only ${hostName} can write to the ledger.`;

const nameIn = (night: WatchedNight, id: string | null): string =>
  night.players.find((p) => p.id === id)?.name ?? 'Someone';

const verb = (t: string): string =>
  t === 'buyin'
    ? 'bought in'
    : t === 'rebuy'
      ? 'rebought'
      : t === 'cashout'
        ? 'cashed out'
        : t === 'expense'
          ? 'covered a spend'
          : 'made an entry';

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const nightDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

function elapsed(startedAt: string, endedAt: string | null): string {
  const end = endedAt === null ? Date.now() : new Date(endedAt).getTime();
  const mins = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

const styles = StyleSheet.create({
  body: { flex: 1 },

  checking: { marginHorizontal: space.page, marginTop: 20, gap: 14 },
  lede: type.lede,
  progressTrack: { height: 2, borderRadius: 1, overflow: 'hidden' },
  progressFill: { width: '38%', height: 2, borderRadius: 1 },
  refusedBody: { ...type.lede, marginHorizontal: space.page, marginTop: 12 },

  status: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1 },
  statusLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },

  card: {
    marginHorizontal: space.card,
    marginTop: 18,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardEyebrow: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },
  seatName: { fontSize: 19, fontWeight: '700' },
  seatLine: { fontSize: 15, fontWeight: '500' },
  seatMuted: { fontSize: 13, fontWeight: '400' },
  netBig: {
    marginLeft: 'auto',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.84,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },

  workRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  workLabel: { fontSize: 13.5, fontWeight: '400', flexShrink: 1 },
  workValue: { marginLeft: 'auto', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },

  settlement: {
    marginHorizontal: space.card,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.card,
    gap: 4,
  },
  settlementEyebrow: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },
  settlementLine: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  settlementSub: { fontSize: 12.5, fontWeight: '400', lineHeight: 18 },

  figures: { flexDirection: 'row', marginHorizontal: space.card, marginTop: 18, gap: 40 },
  figure: { gap: 6 },
  figureLabel: type.label,
  figureValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },

  feed: { marginHorizontal: space.page, marginTop: 18, flex: 1 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 4 },
  feedTime: { ...type.time, width: 44 },
  feedName: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  feedNameMine: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  feedAmount: { ...type.feedFigure, marginLeft: 'auto' },

  table: { marginHorizontal: space.page, marginTop: 18, flex: 1 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginHorizontal: -6,
    marginBottom: 3,
    borderRadius: radius.pressable,
  },
  resultName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  resultNameMine: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  resultNet: { marginLeft: 'auto', fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },

  band: {
    marginTop: 'auto',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 15,
    paddingBottom: 4,
    paddingHorizontal: space.page,
  },
  bandText: { fontSize: 13, fontWeight: '400', lineHeight: 18.85 },
});
