import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlayerId } from '@poker-club/core';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { makeAdmin, nightsPlayed, useClub, type Member } from '../src/lib/clubStore';
import { useNight } from '../src/lib/nightStore';

/**
 * Hand over admin — GR9. 12-the-group.md § 4.1.
 *
 * ONE ADMIN AT A TIME, and the handover is one way. Whoever takes it can hand
 * it back; the person giving it up cannot take it again, because a group where
 * either party can seize the money rules is not a group with an admin — it is
 * two people with a button.
 *
 * ONLY A CLAIMED PLAYER. A name on the roster is a label the host typed; there
 * is nobody behind it to receive anything. Unclaimed people are still listed,
 * because "why is Dana not here" is the first question otherwise, and the row
 * says what is missing rather than hiding the answer.
 *
 * Nothing settled changes hands. Every night already on the book keeps the
 * host it was recorded by; what moves is what happens next.
 */
export default function HandOver() {
  const t = useTheme();
  const club = useClub();
  /* Only to know WHEN to count: the night landing on the device is what puts
     rows in `night_player`, and counting before it does gives everybody zero. */
  const night = useNight();
  const [nights, setNights] = useState<Map<PlayerId, number> | null>(null);
  const [picked, setPicked] = useState<PlayerId | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void nightsPlayed().then(setNights).catch(() => setNights(new Map()));
  }, [night]);

  if (club === null) return <Sheet title="Hand over admin">{null}</Sheet>;

  const me = club.members.find((m) => m.standing === 'admin');
  const others = club.members.filter((m) => m.id !== me?.id);
  const chosen = others.find((m) => m.id === picked);

  /* Who the club's piggy bank pays out to, which is worth saying on their row. */
  const collector = club.rules.find((r) => r.destination === 'kitty')?.collectorPlayerId;

  async function handOver() {
    if (busy || chosen === undefined || club === null) return;
    setBusy(true);
    try {
      await makeAdmin(club.id, chosen.id);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Hand over admin"
      sub="One admin at a time. You stay in the group as a player, with your whole history."
      sentence
      footer={
        <Button
          label={chosen === undefined ? 'Hand over admin' : `Hand over to ${chosen.name}`}
          variant="primary"
          disabled={busy || chosen === undefined}
          onPress={() => void handOver()}
        />
      }
    >
      <View style={styles.list}>
        {others.map((m, i) => {
          const claimed = m.standing !== 'name_only';
          const on = m.id === picked;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: !claimed }}
              disabled={!claimed || busy}
              onPress={() => setPicked(m.id)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === others.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Avatar name={m.name} />
              <View style={styles.rowText}>
                {/* Never dimmed. An unclaimed person is a real member of this
                    group who has not opened the app; greying their name says
                    they are lesser, and the sub-line already says the thing. */}
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text style={[styles.sub, { color: t.muted }]} numberOfLines={1}>
                  {standing(m, claimed, m.id === collector, nights?.get(m.id))}
                </Text>
              </View>
              <View
                style={[
                  styles.circle,
                  { borderColor: on ? t.text : claimed ? t.dashed : t.quietOutline },
                ]}
              >
                {on && <View style={[styles.dot, { backgroundColor: t.text }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.block}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>What moves</Text>
        <Text style={[styles.moves, { color: t.text }]}>
          Money rules, settle-up, invites and the exits.
        </Text>
        <Text style={[styles.keeps, { color: t.win }]}>
          Nothing already settled changes hands.
        </Text>
      </View>

      {/* ONE TEXT NODE. Interpolating the name mid-sentence splits it into
          three, and the fragment either side of the name wraps on its own. */}
      <Text style={[styles.footnote, { color: t.muted }]}>
        {`Only a claimed player can be admin. Once handed over, only ${
          chosen === undefined ? 'they' : chosen.name
        } can hand it back — you cannot take it.`}
      </Text>
    </Sheet>
  );
}

/**
 * The one line under a name: what they are to this group, then whether there
 * is anybody behind the name at all.
 *
 * The drawn rows say "host of 26 nights", "holds the piggy bank", "19 nights".
 * They are the same line with the most particular true thing in front of it.
 */
function standing(
  m: Member,
  claimed: boolean,
  collects: boolean,
  nights: number | undefined,
): string {
  const claim = claimed ? 'claimed' : 'not claimed yet';
  if (collects) return `holds the piggy bank · ${claim}`;
  if (nights === undefined || nights === 0) return claim;
  return `${nights} ${nights === 1 ? 'night' : 'nights'} · ${claim}`;
}

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  rowText: { flexShrink: 1, gap: 2 },
  name: type.rowName,
  sub: type.meta,
  circle: {
    marginLeft: 'auto',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },

  block: { marginTop: 26, marginHorizontal: space.page, gap: 6 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 4 },
  moves: { ...type.rowName, paddingHorizontal: 4 },
  keeps: { ...type.meta, paddingHorizontal: 4 },

  footnote: { ...type.footnote, marginTop: 22, marginHorizontal: space.page, paddingHorizontal: 4 },
});
