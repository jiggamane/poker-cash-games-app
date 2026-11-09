import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, type } from '../src/design/tokens';
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
      footer={<Button label={saving ? 'Saving…' : 'Save'} onPress={() => void save()} disabled={unchanged || saving} />}
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
          autoCapitalize="words"
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!unchanged && !saving) void save();
          }}
          style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.hairline }]}
        />
        {refusal !== null && <Text style={[styles.refusal, { color: t.text }]}>{refusal}</Text>}
        {/* ⚠ UNSURE on the board. */}
        <Text style={[styles.foot, { color: t.muted }]}>
          {`If you delete your account, the seat goes back to ${theirs}.`}
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  lede: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  refusal: { fontSize: 13, fontWeight: '500', lineHeight: 18.9 },
  foot: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },
});
