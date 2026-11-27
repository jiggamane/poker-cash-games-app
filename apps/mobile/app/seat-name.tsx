import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../src/components/Text';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { L, z } from '../src/design/scale';
import { applySeatName, useClubs } from '../src/lib/clubStore';
import { nameRefusal, renameMySeat } from '../src/lib/account';

/**
 * Your name in a group — R1 of `design/handoff-account-and-names/`, approved by
 * the owner on 9 November. Opened from Settings → PLAYERS → You, on the phone of
 * somebody who claimed their seat with a code.
 *
 * A player is never ASKED for a name — their seat already has the one the
 * admin typed — but they may change it. The admin's name is never lost: the
 * server keeps it beside the new one (0030), the sentence here names it, and
 * it comes back if they leave.
 */
export default function SeatName() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clubs } = useClubs();
  const club = clubs.find((c) => c.members.some((m) => m.id === id)) ?? null;
  const seat = club?.members.find((m) => m.id === id) ?? null;
  const admin = club?.members.find((m) => m.standing === 'admin') ?? null;

  const [name, setName] = useState(seat?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  if (club === null || seat === null) return <Sheet title="Your name">{null}</Sheet>;

  /* What the admin called this seat: kept beside the player's name once they
     have changed it, and the name itself until then. */
  const theirs = seat.adminName ?? seat.name;
  const adminName = admin?.name ?? 'The admin';

  async function save() {
    setSaving(true);
    setRefusal(null);
    try {
      const stored = await renameMySeat(seat!.id, name);
      await applySeatName(seat!.id, stored, stored.toLowerCase() === theirs.toLowerCase() ? null : theirs);
      router.back();
    } catch (e) {
      setRefusal(nameRefusal(e instanceof Error ? e.message : ''));
      setSaving(false);
    }
  }

  const unchanged = name.trim() === '' || name.trim() === seat.name;

  return (
    <Sheet
      title={`Your name in ${club.name}`}
      /* THE FULL BOARD (`seat-name`, `seat-name-changed`, approved): Save is the
         bar, faint until the name differs from the one the seat has; the field
         is outlined, not filled. */
      bar={[{ label: saving ? 'Saving…' : 'Save', onPress: () => void save(), disabled: unchanged || saving }]}
    >
      <View style={styles.body}>
        <Text style={[styles.lede, { color: t.text }]}>
          {`Everyone in ${club.name} sees this. ${adminName} added you as ${theirs}.`}
        </Text>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            setRefusal(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="words"
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!unchanged && !saving) void save();
          }}
          style={[
            styles.input,
            { color: t.text, backgroundColor: t.surface, borderColor: focused ? t.text : t.outline },
            focused && styles.focused,
          ]}
        />
        {refusal !== null && <Text style={[styles.refusal, { color: t.text }]}>{refusal}</Text>}
        {/* The line "If you delete your account, the seat goes back to …" was here, UNSURE on
            its board; the owner took it off on 24 November (the full board, seat-name-changed). */}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  /* The sheet's body: the kit's `.mbody`, 20 in and 12 between groups. */
  body: { gap: z(12), paddingHorizontal: z(20), paddingTop: z(2) },
  /* The kit's `para()`: 15 on 1.45, in the text colour. */
  lede: { fontSize: z(15), fontWeight: '400', lineHeight: z(21.75) },
  /* The kit's `.fi`: 48 tall, 12 corners, a 1.5 outline that turns to a 2 in the text colour on focus. */
  input: {
    minHeight: z(48),
    fontSize: z(16),
    fontWeight: '600',
    borderWidth: 1.5,
    borderRadius: L.fieldRadius,
    paddingHorizontal: z(14),
    paddingVertical: z(12),
  },
  focused: { borderWidth: 2, paddingHorizontal: z(13.5) },
  refusal: { fontSize: z(13), fontWeight: '500', lineHeight: z(18.9) },
});
