import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Pill } from '../src/components/Pill';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { addMember, useClub, type Member } from '../src/lib/clubStore';

/**
 * Players · the roster — GR4. 12-the-group.md.
 *
 * ONE LIST. There is no pending section and no join queue: standing is a badge
 * on the row, and an outstanding invite is another badge on the same row, so
 * the count of people waiting is simply how many rows carry it.
 *
 * NAMING COMES FIRST AND THE INVITE SECOND. The admin adds somebody by name
 * and they can play that same evening; only then can a link be sent, from that
 * player's own sheet. A name-only player is a first-class player — bought in,
 * counted and settled exactly like a member — because the app is how somebody
 * SEES the club, not how they join it.
 */
export default function Roster() {
  const t = useTheme();
  const club = useClub();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

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

  const invited = club?.members.filter((m) => m.invited).length ?? 0;

  return (
    <Screen
      title="Players"
      backTo="the club"
      meta={
        club === null
          ? undefined
          : `${club.members.length} on the roster${invited > 0 ? ` · ${invited} invited` : ''}`
      }
      footer={
        <Button
          label={trimmed === '' ? 'Add a player by name' : clash ? `${trimmed} is already here` : `Add ${trimmed}`}
          variant="primary"
          disabled={trimmed === '' || clash || busy}
          onPress={() => void add()}
        />
      }
    >
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

      <View style={styles.list}>
        {(club?.members ?? []).map((m, i, all) => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/member', params: { id: m.id } })}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === all.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: t.surface }]}>
              <Text style={[styles.initial, { color: t.text }]}>
                {m.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
              {m.name}
            </Text>
            {badge(m) !== null && <Pill label={badge(m)!} tone={m.invited ? 'amber' : 'muted'} />}
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}

        {(club?.members.length ?? 0) === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            Nobody on the roster yet. Add the first name above and they can play tonight.
          </Text>
        )}
      </View>
    </Screen>
  );
}

/**
 * The one badge a row carries. An outstanding invite wins: it is the thing
 * somebody has to act on, and a plain member needs no badge at all.
 */
function badge(m: Member): string | null {
  if (m.invited) return 'invited';
  if (m.standing === 'admin') return 'admin';
  if (m.standing === 'name_only') return 'name only';
  return null;
}

const styles = StyleSheet.create({
  field: { marginTop: 20, marginHorizontal: space.card },
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  list: { marginTop: 18, marginHorizontal: space.page },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 14, fontWeight: '700' },
  name: { ...type.rowName, flexShrink: 1 },
  empty: { ...type.footnote, paddingHorizontal: 4 },
});
