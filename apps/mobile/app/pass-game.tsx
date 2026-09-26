import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { RoundTick } from '../src/components/RoundTick';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { block, radius, space, type } from '../src/design/tokens';
import { useClub, type Member } from '../src/lib/clubStore';
import { passTo, PassBlockedError } from '../src/lib/handover';
import { claimedSeat } from '../src/lib/identity';
import { passLine, passTargets, type PassRow } from '../src/lib/membership';
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
 * THE MEMBERSHIP ANSWERS COME FROM THE SEAM — `membership.ts` — which answers
 * Full for everybody today, so the only row under *Can't take it tonight* on
 * any phone is a name with nobody behind it. The other rows, the confirm and
 * the nobody state are built and never drawn until the seam says otherwise.
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

  const { can, cannot } = useMemo(
    () =>
      passTargets(club?.members ?? [], me, {
        /* Who this game has already spent a host night on — nobody, until the
           seam keeps the answer. */
        hostNightSpentBy: new Set<string>(),
      }),
    [club, me],
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
    return (
      <Sheet
        title={`Pass to ${name}`}
        footer={
          <>
            <Button
              label={`Pass to ${name}`}
              variant="primary"
              disabled={busy}
              onPress={() => void pass()}
            />
            <Button label="Pick someone else" variant="secondary" onPress={() => setStage('list')} />
          </>
        }
      >
        <View style={styles.page}>
          <Text style={[styles.body, { color: t.text }]}>
            {`${name} is on Regular, which runs one game a month. Taking this one uses it.`}
          </Text>
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
          <Text style={[styles.note, { color: t.muted }]}>
            {`If the game comes back to you, it stays used. Passing it to ${name} again tonight uses nothing more.`}
          </Text>
          <Text style={[styles.note, { color: t.muted }]}>
            {`${name} doesn’t need to accept. It arrives on their phone and they record from then.`}
          </Text>
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
      footer={
        primary === undefined ? undefined : (
          <Button
            label={primary}
            variant={pick === null || busy ? 'blocked' : 'primary'}
            disabled={pick === null || busy}
            onPress={() => {
              if (pick === null) return;
              if (pick.spendsHostNight && stage !== 'failed') setStage('confirm');
              else void pass();
            }}
          />
        )
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
            <View style={[styles.explainer, { backgroundColor: t.surface }]}>
              <Text style={[styles.explainerText, { color: t.text }]}>
                A game can go to anyone on Full, or on Regular with their host night still free.
                Each person picks their own.
              </Text>
            </View>
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

function Section({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: t.muted }]}>{`${label} · ${count}`}</Text>
      {children}
    </View>
  );
}

/**
 * One person. The sub-line is the row's whole argument, in the handoff's
 * words: where they are tonight, then what their membership allows.
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
      <Avatar name={m.name} />
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
          {m.name}
        </Text>
        <Text style={[styles.rowSub, { color: t.muted }]} numberOfLines={1}>
          {subLine(row, seated)}
        </Text>
      </View>
      {action !== undefined ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          hitSlop={6}
          style={({ pressed }) => [styles.chip, { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.chipLabel, { color: t.text }]}>{action.label}</Text>
        </Pressable>
      ) : onPress !== undefined ? (
        <RoundTick on={on} />
      ) : null}
    </>
  );
  const style = [styles.row, { borderBottomColor: t.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }];
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
  page: { paddingHorizontal: space.page, gap: 14 },
  body: { ...type.lede },
  note: { ...type.footnote },
  foot: { ...type.footnote, paddingTop: 4 },

  section: { gap: 0 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowName: type.rowName,
  rowSub: { fontSize: 12.5, fontWeight: '400' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  chipLabel: type.chip,

  /* State 4's two stats: label 11/700 tracked, value 18/700. */
  stats: { flexDirection: 'row', gap: space.statGap, paddingVertical: 4 },
  stat: { gap: 4, flex: 1 },
  statLabel: type.statPairLabel,
  statValue: type.statValue,

  /* State 5's card: the explainer block, not a card. */
  explainer: { padding: block.padV, paddingHorizontal: block.padH, borderRadius: block.radius },
  explainerText: { ...type.detail, fontSize: 13.5, lineHeight: 20 },

  /* State 6: the amber pending pill, text and 1px border, never a fill. */
  pending: { gap: 8 },
  pendingPill: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
    borderWidth: 1,
  },
  pendingLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },
  pendingBody: { fontSize: 13, fontWeight: '400', lineHeight: 18.85 },
});
