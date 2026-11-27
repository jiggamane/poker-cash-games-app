import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Card, SectionLabel } from '../src/components/Card';
import { RoundTick } from '../src/components/RoundTick';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { z } from '../src/design/scale';
import { useClub, type Member } from '../src/lib/clubStore';
import { passTo, PassBlockedError } from '../src/lib/handover';
import { claimedSeat } from '../src/lib/identity';
import { gameFor, passLine, passTargets, type PassRow } from '../src/lib/membership';
import { useMemberships } from '../src/lib/membershipStore';
import { useNight } from '../src/lib/nightStore';
import { explainServerError, isSupabaseConfigured } from '../src/lib/supabase';

/**
 * Pass the game — `design/handoff-game-admin/` § 02, states 3–6. Chrome B over
 * Tonight, opened from the Table admin drawer; ONE SHEET whose content is
 * replaced per step, with one close (`09-navigation.md`).
 *
 *   list      everyone the game can go to, then everyone it cannot with the
 *             reason in one line, in the order the checks run: claimed,
 *             membership, not the current admin (3)
 *   confirm   only when the pick is Regular: what taking it costs them (4)
 *   nobody    the same list when nobody can take it — no primary, the card
 *             says what would make somebody eligible, Ask is a message (5)
 *   failed    the server could not be reached: the pick stays, the game is
 *             still this phone's, and this phone is still recording (6)
 *
 * Passing itself takes the server's word and nothing else: `passTo` throws
 * until the server has moved the game, and until then nothing on this phone
 * changes. When it returns the sheet closes and Tonight reads WAITING ON LENA
 * (7) off the role line.
 *
 * THE MEMBERSHIP ANSWERS COME FROM THE SEAM — `membership.ts`, fed by the
 * server for this night (`useMemberships(sessionId)`, 0021): each claimed
 * seat's tier, whether its host night is spent, and whether THIS game already
 * spent it. Until an answer lands the seam answers Full for everybody and the
 * only row under *Can't take it tonight* is a name with nobody behind it. The
 * server runs the same check inside `pass_night`, so a stale list here is a
 * refused pass (6), never a wrong one.
 */
type Stage = 'list' | 'confirm' | 'failed';

export default function PassGame() {
  const t = useTheme();
  const club = useClub();
  const night = useNight();
  const sessionId = night?.sessionId ?? null;

  /* Who holds this phone, so they are not listed. The seat this phone
     claimed, or — the host's phone, which claimed nothing — the club's
     admin row. */
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void claimedSeat().then((id) => {
      if (!alive) return;
      setMe(id ?? club?.members.find((m) => m.standing === 'admin')?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [club]);

  const [picked, setPicked] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('list');
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState<string | null>(null);

  const answered = useMemberships(sessionId);
  const { can, cannot } = useMemo(
    /* `gameFor` is who this game has already spent a host night on, so the
       same game going back to a Regular is listed, and costs nothing. */
    () => passTargets(club?.members ?? [], me, gameFor(sessionId)),
    /* `answered` is the server's answer landing; the list is read again. */
    [club, me, sessionId, answered],
  );
  const seated = useMemo(
    () => new Set((night?.players ?? []).filter((p) => p.atTable).map((p) => p.id)),
    [night],
  );

  const pick = can.find((r) => r.member.id === picked) ?? null;
  const nobody = can.length === 0;

  async function pass() {
    if (pick === null || sessionId === null || busy) return;
    setBusy(true);
    setWhy(null);
    try {
      await passTo(sessionId, pick.member.id);
      router.back();
    } catch (e) {
      /* One state for every way the server was not reached, including changes
         of this phone's own still waiting to go (`PassBlockedError`): from the
         table both are "no connection", and the game has not moved. */
      setWhy(e instanceof PassBlockedError ? null : explainServerError(e));
      setStage('failed');
    } finally {
      setBusy(false);
    }
  }

  const blocked = !isSupabaseConfigured
    ? 'This build has no server, so there is nothing to pass the game through.'
    : null;

  // --- 4 · confirm, when the pick is Regular ------------------------------
  if (stage === 'confirm' && pick !== null) {
    const name = pick.member.name;
    const renews = pick.membership.hostNightRenewsOn;
    /* The full board (`pass-game-confirm`): the pass is the bar; Pick someone
       else, the way back, is the quiet line at the foot of the content. The
       board flags that its back circle and this line say the same thing; the
       app keeps the line and no circle, as the drawing shows. */
    return (
      <Sheet
        title={`Pass to ${name}`}
        bar={[{ label: `Pass to ${name}`, disabled: busy, onPress: () => void pass() }]}
      >
        <View style={styles.page}>
          <Text style={[styles.body, { color: t.text }]}>
            {`${name} is on Regular, which runs one game a month. Taking this one uses it.`}
          </Text>
          <Card pad>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: t.muted }]}>{`${name}’s host night`}</Text>
                <Text style={[styles.statValue, { color: t.text }]}>Used tonight</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: t.muted }]}>Next one</Text>
                <Text style={[styles.statValue, { color: t.text }]}>
                  {renews === null ? '—' : longDay(renews)}
                </Text>
              </View>
            </View>
          </Card>
          <Text style={[styles.note, { color: t.muted }]}>
            {`If the game comes back to you, it stays used. Passing it to ${name} again tonight uses nothing more.`}
          </Text>
          <Text style={[styles.note, { color: t.muted }]}>
            {`${name} doesn’t need to accept. It arrives on their phone and they record from then.`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setStage('list')}
            style={({ pressed }) => [styles.quiet, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.quietLabel, { color: t.muted }]}>Pick someone else</Text>
          </Pressable>
        </View>
      </Sheet>
    );
  }

  // --- 3, 5 and 6 · the list ----------------------------------------------
  const primary =
    nobody || blocked !== null
      ? undefined
      : stage === 'failed' && pick !== null
        ? `Try again · pass to ${pick.member.name}`
        : pick === null
          ? 'Pass the game'
          : `Pass to ${pick.member.name}`;

  return (
    <Sheet
      title="Pass the game"
      sub={
        nobody
          ? undefined
          : 'They record from the moment you pass it. You keep watching, and can take it back.'
      }
      sentence
      /* The full board (`pass-game`, `pass-game-nobody`): the pass is the bar,
         blocked as "Pass the game" until somebody is picked; with nobody to
         pass to there is no bar at all. */
      bar={
        primary === undefined
          ? undefined
          : [
              {
                label: primary,
                disabled: pick === null || busy,
                onPress: () => {
                  if (pick === null) return;
                  if (pick.spendsHostNight && stage !== 'failed') setStage('confirm');
                  else void pass();
                },
              },
            ]
      }
    >
      <View style={styles.page}>
        {blocked !== null && <Text style={[styles.body, { color: t.text }]}>{blocked}</Text>}

        {stage === 'failed' && (
          <View style={[styles.pending, { borderColor: t.amber }]}>
            <View style={[styles.pendingPill, { borderColor: t.amber }]}>
              <Text style={[styles.pendingLabel, { color: t.amber }]}>NOT PASSED</Text>
            </View>
            <Text style={[styles.pendingBody, { color: t.text }]}>
              {why ??
                'No connection. The game is still yours and this phone is still recording. It moves only when the server confirms.'}
            </Text>
          </View>
        )}

        {nobody && blocked === null && (
          <>
            <Text style={[styles.body, { color: t.text }]}>
              Nobody in the group can take it tonight. That’s their membership, not anything you
              set.
            </Text>
            <Card pad>
              <Text style={[styles.explainerText, { color: t.text }]}>
                {/* "the … plan" (owner, 24 November, on the board: "add 'plan'"). */}
                A game can go to anyone on the Full plan, or on the Regular plan with their host night
                still free.
                Each person picks their own.
              </Text>
            </Card>
          </>
        )}

        {can.length > 0 && (
          <Section label="Can take it" count={can.length}>
            {can.map((r, i) => (
              <PersonRow
                key={r.member.id}
                row={r}
                seated={seated.has(r.member.id)}
                last={i === can.length - 1}
                on={picked === r.member.id}
                onPress={() => {
                  setPicked(r.member.id);
                  if (stage === 'failed') setStage('list');
                }}
              />
            ))}
          </Section>
        )}

        {cannot.length > 0 && (
          <Section label="Can’t take it tonight" count={cannot.length}>
            {cannot.map((r, i) => (
              <PersonRow
                key={r.member.id}
                row={r}
                seated={seated.has(r.member.id)}
                last={i === cannot.length - 1}
                action={
                  r.kind === 'cannot' && r.why === 'name_only'
                    ? {
                        label: 'Invite',
                        /* GR6 replaces this sheet's content and keeps the
                           close: one sheet on screen, the invite in its place
                           (a sheet never pushes). */
                        onPress: () =>
                          router.replace({ pathname: '/invite', params: { player: r.member.id } }),
                      }
                    : nobody
                      ? {
                          label: 'Ask',
                          onPress: () =>
                            void Share.share({
                              message: `${adminName(club, me)} wants to pass you tonight’s game in ${club?.name ?? 'the group'}. Going Full lets you run it.`,
                            }).catch(() => undefined),
                        }
                      : undefined
                }
              />
            ))}
          </Section>
        )}

        {nobody && blocked === null && (
          <Text style={[styles.foot, { color: t.muted }]}>
            Ask sends them a message. Nobody can buy a membership for someone else.
          </Text>
        )}
      </View>
    </Sheet>
  );
}

/** Who is holding this phone, for the Ask message. */
const adminName = (club: ReturnType<typeof useClub>, me: string | null): string =>
  club?.members.find((m) => m.id === me)?.name ??
  club?.members.find((m) => m.standing === 'admin')?.name ??
  'The admin';

/** A quiet label over a card of people — the board's `label(…, { quiet })` and `card()`. */
function Section({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <>
      <SectionLabel text={`${label} · ${count}`} quiet />
      <Card>{children}</Card>
    </>
  );
}

/**
 * One person. The sub-line is the row's whole argument, in the handoff's
 * words: where they are tonight, then what their membership allows — the tier
 * first (Free / Regular / Full), which this sheet is the one place to show.
 *
 * NAMES ONLY (the full board, carried over from Fresh Deck): no avatar. The
 * sub-line wraps rather than truncating, so "uses their one host night" is
 * never cut off; Invite and Ask are the small lifted chip at the row's end.
 */
function PersonRow({
  row,
  seated,
  last,
  on = false,
  onPress,
  action,
}: {
  row: PassRow;
  seated: boolean;
  last: boolean;
  on?: boolean;
  onPress?: () => void;
  action?: { label: string; onPress: () => void };
}) {
  const t = useTheme();
  const m = row.member;
  const body = (
    <>
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
          {m.name}
        </Text>
        <Text style={[styles.rowSub, { color: t.muted }]}>{subLine(row, seated)}</Text>
      </View>
      {action !== undefined ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          hitSlop={6}
          style={({ pressed }) => [
            styles.chip,
            /* Inside a card: in the dark a chip is one step up from the card it sits on. */
            { backgroundColor: t.name === 'dark' ? t.raised : t.surface, boxShadow: t.chipLift, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.chipLabel, { color: t.text }]}>{action.label}</Text>
        </Pressable>
      ) : onPress !== undefined ? (
        <RoundTick on={on} />
      ) : null}
    </>
  );
  const style = [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.hairline }];
  if (onPress === undefined) return <View style={style}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [...style, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

function subLine(row: PassRow, seated: boolean): string {
  /* The tier, first, where the seam has a real one — the owner's call,
     26 September. `passLine` has the rule and the tests. */
  return passLine(row, seated, shortDay);
}

const shortDay = (d: Date): string => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const longDay = (d: Date): string => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

const styles = StyleSheet.create({
  page: { paddingHorizontal: z(20), paddingTop: z(2), gap: z(12) },
  // The kit's `para()`: 15 / 1.45 in the text colour.
  body: { fontSize: z(15), lineHeight: z(21.75) },
  // The kit's `note()`: 13 / 1.45, muted.
  note: { fontSize: z(13), lineHeight: z(18.85) },
  foot: { fontSize: z(13), lineHeight: z(18.85) },
  // The kit's `quiet()`: 600 14, muted, 40 tall, centred.
  quiet: { minHeight: z(40), alignItems: 'center', justifyContent: 'center' },
  quietLabel: { fontSize: z(14), fontWeight: '600' },

  // The card row (`Card.tsx`): words, then whatever ends it.
  row: { flexDirection: 'row', alignItems: 'center', gap: z(10), minHeight: z(44), paddingVertical: z(8) },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6) },
  rowSub: { fontSize: z(12), lineHeight: z(15), marginTop: z(2) },
  /* The board's `rowChip()`: a lifted chip one size down — 32 tall, 13 type. */
  chip: {
    flexShrink: 0,
    height: z(32),
    paddingHorizontal: z(12),
    borderRadius: z(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: { fontSize: z(13), fontWeight: '600' },

  /* State 4's two stats, in a padded card: label 600 12.5 muted, value 700 18. */
  stats: { flexDirection: 'row', gap: z(12) },
  stat: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: z(12.5), fontWeight: '600', marginBottom: z(6), marginLeft: z(2) },
  statValue: { fontFamily: 'head', fontSize: z(18), fontWeight: '700', fontVariant: ['tabular-nums'] },

  /* State 5's card: the rule, in the text colour at note size. */
  explainerText: { fontSize: z(13), lineHeight: z(18.85) },

  /* State 6: the amber pending pill, text and 1px border, never a fill. Amber
     has no token in the board's kit (README, "Amber"); the app keeps its own,
     as `/bill` keeps it on *unpaid*. Not drawn on the board. */
  pending: { gap: z(8) },
  pendingPill: {
    alignSelf: 'flex-start',
    paddingVertical: z(4),
    paddingHorizontal: z(7),
    borderRadius: z(7),
    borderWidth: 1,
  },
  pendingLabel: { fontSize: z(10.5), fontWeight: '700', letterSpacing: z(1.05) },
  pendingBody: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },
});
