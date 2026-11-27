import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import type { PlayerId } from '@poker-club/core';
import { Card, SectionLabel } from '../src/components/Card';
import { Radio } from '../src/components/RoundTick';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { z } from '../src/design/scale';
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

  /*
   * THE FULL BOARD (`hand-over`, `hand-over-none`, approved): the hand-over is
   * the bar, blocked until a claimed player is picked; the people are one card
   * of names — no avatars — each with a radio at the end, its ring the hairline
   * on a row that cannot be picked.
   */
  return (
    <Sheet
      title="Hand over admin"
      sub="One admin at a time. You stay in the group as a player, with your whole history."
      sentence
      bar={[
        {
          label: chosen === undefined ? 'Hand over admin' : `Hand over to ${chosen.name}`,
          disabled: busy || chosen === undefined,
          onPress: () => void handOver(),
        },
      ]}
    >
      <View style={styles.body}>
        {others.length > 0 && (
          <Card>
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
                    i < others.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.hairline },
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <View style={styles.rowText}>
                    {/* Never dimmed. An unclaimed person is a real member of this
                        group who has not opened the app; greying their name says
                        they are lesser, and the sub-line already says the thing. */}
                    <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={[styles.sub, { color: t.muted }]}>
                      {standing(m, claimed, m.id === collector, nights?.get(m.id))}
                    </Text>
                  </View>
                  <Radio on={on} dead={!claimed} />
                </Pressable>
              );
            })}
          </Card>
        )}

        <SectionLabel text="What moves" quiet />
        <View style={styles.moves}>
          <Text style={[styles.movesLine, { color: t.text }]}>
            Money rules, settle-up, invites and the exits.
          </Text>
          <Text style={[styles.keeps, { color: t.win }]}>Nothing already settled changes hands.</Text>
        </View>

        {/* ONE TEXT NODE. Interpolating the name mid-sentence splits it into
            three, and the fragment either side of the name wraps on its own. */}
        <Text style={[styles.note, { color: t.muted }]}>
          {`Only a claimed player can be admin. Once handed over, only ${
            chosen === undefined ? 'they' : chosen.name
          } can hand it back — you cannot take it.`}
        </Text>
      </View>
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
  body: { paddingHorizontal: z(20), paddingTop: z(2), gap: z(12) },
  // The card row (`Card.tsx`), as a radio: words, then the ring.
  row: { flexDirection: 'row', alignItems: 'center', gap: z(10), minHeight: z(44), paddingVertical: z(8) },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6) },
  sub: { fontSize: z(12), lineHeight: z(15), marginTop: z(2) },

  moves: { marginHorizontal: z(2), gap: z(4) },
  movesLine: { fontSize: z(15), fontWeight: '600', lineHeight: z(19.5) },
  keeps: { fontSize: z(13), lineHeight: z(17) },
  // The kit's `note()`: 13 / 1.45, muted.
  note: { fontSize: z(13), lineHeight: z(18.85) },
});
