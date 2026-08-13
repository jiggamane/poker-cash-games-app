import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Pill } from '../src/components/Pill';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { switchClub, useClubs, type Standing } from '../src/lib/clubStore';
import { useNight } from '../src/lib/nightStore';

/**
 * Your groups — GR2. The ONLY cross-group screen in the app.
 *
 * Everything else below Home belongs to one club, and tapping a row here swaps
 * all of it — roster, nights, rules, book — and returns Home. That is why the
 * standing sits on the row: the same person is admin of one club and a name in
 * another, and which one you are about to become matters before you switch.
 */
export default function YourGroups() {
  const t = useTheme();
  const { clubs, currentId } = useClubs();
  const night = useNight();

  const liveIn = night !== null && night.status !== 'settled' ? night.groupName : null;

  return (
    <Screen
      title="Your groups"
      backTo="the club"
      footer={
        <Button label="New group" variant="primary" onPress={() => router.push('/new-group')} />
      }
    >
      <View style={styles.list}>
        {clubs.map((c, i) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ selected: c.id === currentId }}
            onPress={() => {
              void switchClub(c.id);
              router.dismissTo('/');
            }}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === clubs.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: t.text }]}>{c.name}</Text>
              <Text
                style={[styles.meta, { color: c.name === liveIn ? t.win : t.muted }]}
                numberOfLines={1}
              >
                {c.name === liveIn
                  ? 'a night is running'
                  : `${c.members.length} ${c.members.length === 1 ? 'player' : 'players'} · ${c.currency}`}
              </Text>
            </View>
            <Pill label={standingWord(standingOfMine(c.members))} tone="muted" />
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}

        {clubs.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            No groups yet. A group needs only a name to exist.
          </Text>
        )}
      </View>
    </Screen>
  );
}

/**
 * Your own standing in a club.
 *
 * Only one row on this phone can be an admin today, so the first one is the
 * answer. When members claim their own places this becomes a lookup by the
 * device's player id.
 */
const standingOfMine = (members: ReadonlyArray<{ standing: Standing }>): Standing =>
  members.find((m) => m.standing === 'admin')?.standing ?? 'member';

const standingWord = (s: Standing): string =>
  s === 'admin' ? 'admin' : s === 'member' ? 'member' : 'name only';

const styles = StyleSheet.create({
  list: { marginTop: 20, marginHorizontal: space.page },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, paddingHorizontal: 4 },
  rowText: { gap: 4, flexShrink: 1 },
  name: { fontSize: 19, fontWeight: '700' },
  meta: type.rowDetail,
  empty: { ...type.footnote, paddingHorizontal: 4 },
});
