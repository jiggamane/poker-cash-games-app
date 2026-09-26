import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Pill } from '../src/components/Pill';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import { addMember, reconcileSeats, useClub, type Member } from '../src/lib/clubStore';
import { claimedSeat } from '../src/lib/identity';
import { canTakeGame, membershipOf, runsLine } from '../src/lib/membership';
import { useNight } from '../src/lib/nightStore';
import { useIsAdmin } from '../src/lib/whoIsReading';

/**
 * Players · the roster — GR4. 12-the-group.md, and since 26 September
 * `design/handoff-game-admin/` § 05: a second view, "Who can run a game".
 *
 * ONE LIST. There is no pending section and no join queue: standing is a badge
 * on the row, and an outstanding invite is another badge on the same row, so
 * the count of people waiting is simply how many rows carry it.
 *
 * A FILTER, NOT A BADGE, for who can run a game (state 18). Badges on this
 * screen already mean standing — ADMIN, NAME ONLY, INVITED — and a third
 * meaning on the same row would collide. So the list groups by what each
 * person can do: *Runs the games* (the admin), *Can take a game*, *Watch
 * only*, *Name only*; the second segment keeps the first two groups. The
 * sub-line under each name says what they can do and NEVER PRINTS A TIER NAME,
 * because "Regular" is also a word the roster uses for how often somebody
 * plays. The answers come from the seam in `membership.ts`, which answers Full
 * for everybody today — so *Watch only* is empty on every phone until it
 * does not.
 *
 * NAMING COMES FIRST AND THE INVITE SECOND. The admin adds somebody by name
 * and they can play that same evening; only then can a link be sent, from that
 * player's own sheet. A name-only player is a first-class player — bought in,
 * counted and settled exactly like a member — because the app is how somebody
 * SEES the club, not how they join it.
 *
 * A MEMBER READS IT READ-ONLY (state 19): no field to add a name, no chevrons,
 * no Invite, their own row saying "You, Tomáš", and a band saying who can
 * pass a game.
 */
type View2 = 'everyone' | 'runners';

export default function Roster() {
  const t = useTheme();
  const club = useClub();
  const night = useNight();
  const admin = useIsAdmin();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View2>('everyone');

  /* The reader's own row. The seat this phone claimed, or — the admin's phone,
     which claimed nothing — the night's `meId`. */
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void claimedSeat().then((id) => {
      if (alive) setMe(id ?? night?.meId ?? null);
    });
    return () => {
      alive = false;
    };
  }, [night?.meId]);

  /*
   * WHO HAS A CODE OUT, AND WHO HAS ARRIVED — B47.
   *
   * Both are the server's answers and the roster is a local table, so the
   * badges below are a copy that has to be refreshed. ON FOCUS rather than on
   * mount: the invite sheet opens over this screen and closes back onto it
   * without unmounting it, so a host who has just issued a code would otherwise
   * watch the row they came from go on saying nothing at all.
   *
   * Nothing waits for it and nothing is shown if it fails — see
   * `reconcileSeats`. The list is drawn from what the phone already holds,
   * exactly as it was before, and the badges appear when the answer lands.
   */
  const clubId = club?.id ?? null;
  useFocusEffect(
    useCallback(() => {
      if (clubId !== null) void reconcileSeats(clubId);
    }, [clubId]),
  );

  const trimmed = name.trim();
  const clash = club?.members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase()) ?? false;

  async function add() {
    if (club === null || trimmed === '' || clash || busy) return;
    setBusy(true);
    try {
      await addMember(club.id, trimmed);
      setName('');
    } finally {
      setBusy(false);
    }
  }

  const members = club?.members ?? [];
  const invited = members.filter((m) => m.invited).length;
  const adminMember = members.find((m) => m.standing === 'admin') ?? null;

  /* The four groups, in the order the board draws them. */
  const runs = members.filter((m) => m.standing === 'admin');
  const canTake = members.filter(
    (m) => m.standing !== 'admin' && m.standing !== 'name_only' && canTakeGame(membershipOf(m)),
  );
  const watchOnly = members.filter(
    (m) => m.standing !== 'admin' && m.standing !== 'name_only' && !canTakeGame(membershipOf(m)),
  );
  const nameOnly = members.filter((m) => m.standing === 'name_only');

  const groups: Array<{ label: string; count: boolean; rows: Member[] }> =
    view === 'runners'
      ? [
          { label: 'Runs the games', count: false, rows: runs },
          { label: 'Can take a game', count: true, rows: canTake },
        ]
      : [
          { label: 'Runs the games', count: false, rows: runs },
          { label: 'Can take a game', count: true, rows: canTake },
          { label: 'Watch only', count: true, rows: watchOnly },
          { label: 'Name only', count: true, rows: nameOnly },
        ];

  return (
    // ONE LONG LIST, so the whole head goes with it. The roster is the only
    // thing on this screen and it reaches thirty-odd rows; holding 90 points
    // of title and count over them costs a row and a half on every phone, and
    // buys nothing — the list says what the screen is. Back is one flick up.
    <Screen
      title="Players"
      backTo="the club"
      headScroll="all"
      meta={
        club === null
          ? undefined
          : `${members.length} on the roster${invited > 0 ? ` · ${invited} invited` : ''}`
      }
      footer={
        admin ? (
          <Button
            label={trimmed === '' ? 'Add a player by name' : clash ? `${trimmed} is already here` : `Add ${trimmed}`}
            variant="primary"
            disabled={trimmed === '' || clash || busy}
            onPress={() => void add()}
          />
        ) : (
          /* State 19's band: who can pass, for a reader who cannot. */
          <View style={[styles.band, { borderTopColor: t.hairline }]}>
            <Text style={[styles.bandText, { color: t.muted }]}>
              {adminMember === null
                ? 'Only the admin can pass a game. This list is for knowing who could take one.'
                : `Only ${adminMember.name} can pass a game. This list is for knowing who could take one.`}
            </Text>
          </View>
        )
      }
    >
      {/* The two-way segmented filter under the title: a tab track, radius
          10 with 3 of padding, each segment radius 7. */}
      <View style={[styles.track, { backgroundColor: t.surface }]}>
        <Segment label="Everyone" on={view === 'everyone'} onPress={() => setView('everyone')} />
        <Segment label="Who can run a game" on={view === 'runners'} onPress={() => setView('runners')} />
      </View>

      {admin && (
        <View style={styles.field}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => void add()}
            placeholder="Their name"
            placeholderTextColor={t.muted}
            autoCapitalize="words"
            returnKeyType="done"
            style={[
              styles.input,
              {
                color: t.text,
                backgroundColor: t.surface,
                borderColor: trimmed === '' ? t.dashed : t.hairline,
                borderStyle: trimmed === '' ? 'dashed' : 'solid',
              },
            ]}
          />
        </View>
      )}

      <View style={styles.list}>
        {groups.map((g) =>
          g.rows.length === 0 && g.label !== 'Runs the games' ? null : (
            <Group key={g.label} label={g.count ? `${g.label} · ${g.rows.length}` : g.label}>
              {g.rows.map((m, i) => (
                <PersonRow
                  key={m.id}
                  member={m}
                  mine={m.id === me}
                  admin={admin}
                  last={i === g.rows.length - 1}
                  sub={
                    m.standing === 'admin'
                      ? 'admin · opens and records'
                      : runsLine(m, membershipOf(m), shortDay)
                  }
                />
              ))}
            </Group>
          ),
        )}

        {members.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            {admin
              ? 'Nobody on the roster yet. Add the first name above and they can play tonight.'
              : 'Nobody on the roster yet.'}
          </Text>
        )}
      </View>
    </Screen>
  );
}

function Segment({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.segment, on && { backgroundColor: t.ground }]}
    >
      <Text style={[on ? styles.segmentOn : styles.segmentLabel, { color: on ? t.text : t.muted }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: t.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * One row. The admin's rows open the player sheet and a name-only row carries
 * Invite; a member's rows carry neither. The reader's own row says so.
 */
function PersonRow({
  member: m,
  mine,
  admin,
  last,
  sub,
}: {
  member: Member;
  mine: boolean;
  admin: boolean;
  last: boolean;
  sub: string;
}) {
  const t = useTheme();
  const shown = mine ? `You, ${m.name}` : m.name;
  const body = (
    <>
      <View style={[styles.avatar, { backgroundColor: t.surface }]}>
        <Text style={[styles.initial, { color: t.text }]}>{shown.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {shown}
        </Text>
        <Text style={[styles.sub, { color: t.muted }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {m.invited && <Pill label="invited" tone="amber" />}
      {admin && m.standing === 'name_only' && !m.invited && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Invite ${m.name}`}
          hitSlop={6}
          onPress={() => router.push({ pathname: '/invite', params: { player: m.id } })}
          style={({ pressed }) => [styles.chip, { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.chipLabel, { color: t.text }]}>Invite</Text>
        </Pressable>
      )}
      {admin && <Icon name="chevron" color={t.muted} />}
    </>
  );
  const style = [styles.row, { borderBottomColor: t.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }];
  if (!admin) return <View style={style}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/member', params: { id: m.id } })}
      style={({ pressed }) => [...style, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

const shortDay = (d: Date): string => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    marginTop: 18,
    marginHorizontal: space.card,
    padding: control.tabTrackPad,
    borderRadius: control.tabTrackRadius,
  },
  segment: {
    flex: 1,
    paddingVertical: control.tabPadV,
    paddingHorizontal: 10,
    borderRadius: control.tabRadius,
    alignItems: 'center',
  },
  segmentLabel: type.tab,
  segmentOn: type.tabOn,

  field: { marginTop: 16, marginHorizontal: space.card },
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  list: { marginTop: 18, marginHorizontal: space.page },
  group: { marginBottom: 18 },
  groupLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 14, fontWeight: '700' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  name: type.rowName,
  sub: { fontSize: 12.5, fontWeight: '400' },
  chip: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: radius.pressable, borderWidth: 1.5 },
  chipLabel: type.chip,
  empty: { ...type.footnote, paddingHorizontal: 4 },

  band: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 15,
    paddingBottom: 4,
    paddingHorizontal: space.page,
  },
  bandText: { fontSize: 13, fontWeight: '400', lineHeight: 18.85 },
});
