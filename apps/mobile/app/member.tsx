import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import {
  inviteMember,
  removeMember,
  renameMember,
  resetInvite,
  setPaysKitty,
  useClub,
} from '../src/lib/clubStore';

/**
 * A player — GR5 — and their invite — GR6.
 *
 * GR6 REPLACES GR5'S CONTENT rather than opening on top of it: a sheet never
 * pushes, and a multi-step sheet keeps one close. Which is also why both live
 * in this one file.
 *
 * The invite is THEIRS: single-use and tied to this roster row, so opening it
 * hands them the name they already have and every night of theirs already in
 * the book. That is the whole reason naming comes first — a link that created
 * a person would create a second one.
 */
export default function MemberSheet() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const club = useClub();
  const member = club?.members.find((m) => m.id === id);

  const [step, setStep] = useState<'edit' | 'invite'>('edit');
  const [name, setName] = useState(member?.name ?? '');
  const [busy, setBusy] = useState(false);

  if (club === null || member === undefined) {
    return (
      <Sheet title="Player">
        <Text style={[styles.note, { color: t.muted }]}>Nobody by that name in this club.</Text>
      </Sheet>
    );
  }

  const renamed = name.trim() !== '' && name.trim() !== member.name;

  if (step === 'invite') {
    return (
      <Sheet
        title="Invite this player"
        sub={`${member.name} keeps their name and everything they have already played.`}
        sentence
        onClose={() => setStep('edit')}
        footer={
          <>
            <Button
              label={member.invited ? 'Send it again' : `Send ${member.name} their link`}
              variant="primary"
              disabled={busy}
              onPress={() => {
                setBusy(true);
                void inviteMember(club.id, member.id).finally(() => {
                  setBusy(false);
                  setStep('edit');
                });
              }}
            />
            {member.invited && (
              <Button
                label="Reset the link"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  void resetInvite(club.id, member.id).finally(() => setBusy(false));
                }}
              />
            )}
          </>
        }
      >
        <View style={[styles.block, { borderColor: t.hairline }]}>
          <Text style={[styles.blockTitle, { color: t.text }]}>What opening it does</Text>
          <Text style={[styles.blockBody, { color: t.muted }]}>
            It hands them this row — their name, and every night of theirs already in the book —
            and promotes them from name only to member. The link works once, on one phone; after
            that it has to be reset here.
          </Text>
        </View>

        <Text style={[styles.note, { color: t.muted }]}>
          They do not need it to play. A name on the roster is bought in, counted and settled
          exactly like somebody holding a phone.
        </Text>
      </Sheet>
    );
  }

  return (
    <Sheet
      title={member.name}
      badge={member.invited ? 'invited' : member.standing === 'admin' ? 'admin' : undefined}
      footer={
        <>
          <Button
            label={renamed ? 'Save the name' : 'Done'}
            variant="primary"
            disabled={busy}
            onPress={() => {
              if (!renamed) return router.back();
              setBusy(true);
              void renameMember(club.id, member.id, name).finally(() => {
                setBusy(false);
                router.back();
              });
            }}
          />
          <Button
            label="Remove from the group"
            variant="destructive"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void removeMember(club.id, member.id).finally(() => {
                setBusy(false);
                router.back();
              });
            }}
          />
        </>
      }
    >
      <View style={styles.field}>
        <Text style={[styles.label, { color: t.muted }]}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          style={[
            styles.input,
            { color: t.text, backgroundColor: t.surface, borderColor: t.hairline },
          ]}
        />
      </View>

      <View style={styles.rows}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setStep('invite')}
          style={({ pressed }) => [
            styles.row,
            { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.rowLabel, { color: t.text }]}>App</Text>
          <Text style={[styles.rowValue, { color: member.invited ? t.amber : t.muted }]}>
            {member.standing === 'name_only'
              ? member.invited
                ? 'invited · link out'
                : 'no app · invite'
              : 'has the app'}
          </Text>
        </Pressable>

        <View style={[styles.row, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.rowLabel, { color: t.text }]}>Pays into the kitty</Text>
          <Switch
            value={member.paysKitty}
            disabled={busy}
            onValueChange={(on) => void setPaysKitty(club.id, member.id, on)}
            trackColor={{ true: t.win, false: t.quietOutline }}
            thumbColor="#FFFFFF"
            style={styles.switch}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.back();
            router.push('/games');
          }}
          style={({ pressed }) => [styles.row, styles.last, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.rowLabel, { color: t.text }]}>Their nights</Text>
          <Text style={[styles.rowValue, { color: t.muted }]}>stats and history</Text>
        </Pressable>
      </View>

      <Text style={[styles.note, { color: t.muted }]}>
        Removing somebody keeps every night they played. The ledger keeps what they already
        played, and anything unsettled stays on the night it came from.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: { marginHorizontal: space.card, marginBottom: 20 },
  label: { ...type.label, marginBottom: 8 },
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  rows: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  last: { borderBottomWidth: 0 },
  rowLabel: type.rowName,
  rowValue: { ...type.meta, marginLeft: 'auto' },
  switch: { marginLeft: 'auto' },

  block: {
    marginHorizontal: space.card,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: radius.card,
    gap: 7,
  },
  blockTitle: { fontSize: 16.5, fontWeight: '600' },
  blockBody: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  note: { ...type.footnote, marginTop: 16, marginHorizontal: space.page },
});
