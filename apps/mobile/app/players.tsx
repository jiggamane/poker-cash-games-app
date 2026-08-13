import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../src/components/Avatar';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { roster, type Person } from '../src/lib/nightStore';
import { seatStatuses, type SeatStatus } from '../src/lib/invites';
import { drain } from '../src/lib/sync';
import { isSupabaseConfigured, supabase } from '../src/lib/supabase';

/**
 * C2 · Players — everyone who has ever sat at this table.
 *
 * A push from the club, per rev 9. It is the roster the group IS, which is why
 * it is a place rather than a sheet: you come here to look at who plays, and
 * invite somebody while you are here.
 *
 * A NAME IS THE MEMBER. Nothing on this screen creates a person or requires one
 * to have an account — the third line under each name says whether anybody is
 * behind it yet, and that is the only difference an account makes anywhere in
 * this app. Somebody who never claims theirs stays a full member of the ledger
 * for years.
 */
export default function Players() {
  const t = useTheme();

  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState<Map<string, SeatStatus>>(new Map());
  const [signedIn, setSignedIn] = useState(false);

  /**
   * The roster from the phone, and the claim states from the server.
   *
   * In that order, and the server half is allowed to fail: the roster is a
   * local fact and must draw with no signal. What is lost when the second half
   * fails is only the badge — the names, the nights and the invite flow behind
   * them are unaffected.
   *
   * `drain()` first, because an invite cannot be issued for a player the server
   * has never heard of, and a night recorded offline is exactly that.
   */
  const load = useCallback(async () => {
    const list = await roster();
    setPeople(list);

    if (!isSupabaseConfigured) return;
    const { data } = await supabase.auth.getSession();
    setSignedIn(data.session !== null);
    if (data.session === null) return;

    try {
      await drain();
      const seats = await seatStatuses(list.map((p) => p.id));
      setStatus(new Map(seats.map((s) => [s.playerId, s])));
    } catch {
      // Offline, or the book has not reached the server yet. The names stay.
    }
  }, []);

  // On focus rather than on mount: coming back from the invite sheet is the one
  // moment a badge is guaranteed to be stale.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      title="Players"
      backTo="The group"
      lede="Everyone who has ever sat at this table. Tap somebody to invite them."
    >
      <View style={styles.list}>
        {people.length === 0 ? (
          <Text style={[styles.empty, { color: t.muted }]}>
            Nobody yet. Start a session and everyone you seat lands here.
          </Text>
        ) : (
          people.map((p, i) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/invite', params: { p: p.id } })}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === people.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Avatar name={p.name} />
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.sub, { color: t.muted }]} numberOfLines={1}>
                  {line(p, status.get(p.id), signedIn)}
                </Text>
              </View>
              <View style={styles.chevron}>
                <Icon name="chevron" color={t.muted} />
              </View>
            </Pressable>
          ))
        )}

        {!signedIn && people.length > 0 && (
          <Text style={[styles.note, { color: t.muted }]}>
            Sign in to invite anybody. Until then this is the roster as this phone knows it, which
            is all a night has ever needed.
          </Text>
        )}
      </View>
    </Screen>
  );
}

/**
 * "12 nights · since January · invited".
 *
 * The claim state is the LAST clause, never the first: who somebody is to the
 * group is how often they play, and whether they have installed anything is a
 * footnote to that. It is omitted entirely when the server has not been asked,
 * rather than guessed at — "not invited yet" said while offline would be a
 * statement the phone has no way of knowing.
 */
function line(p: Person, seat: SeatStatus | undefined, signedIn: boolean): string {
  const parts = [
    p.nights === 0 ? 'no nights yet' : `${p.nights} ${p.nights === 1 ? 'night' : 'nights'}`,
    `since ${month(p.since)}`,
  ];

  if (signedIn && seat !== undefined) {
    parts.push(seat.claimed ? 'claimed' : seat.liveCode !== null ? 'invited' : 'not invited yet');
  }

  return parts.join(' · ');
}

const month = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'long' });

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  rowText: { gap: 3, flexShrink: 1 },
  name: type.rowName,
  sub: type.meta,
  chevron: { marginLeft: 'auto' },
  empty: { ...type.footnote, paddingHorizontal: 4 },
  note: { ...type.footnote, paddingHorizontal: 4, paddingTop: 18 },
});
