import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { makeAdmin, removeMember, renameMember, setPaysKitty, useClub } from '../src/lib/clubStore';

/**
 * A player — GR5.
 *
 * GR6, the invite, USED TO LIVE HERE as a second step replacing this sheet's
 * content. Rev 15 supersedes it with C3 (`app/invite.tsx`), which issues a real
 * ten-character code against the server instead of setting a local flag, and
 * which opens from Players as well as from this row — so it is its own sheet
 * rather than a step inside this one.
 *
 * The invite is still THEIRS: single-use and tied to this roster row, so
 * opening it hands them the name they already have and every night of theirs
 * already in the book. That is the whole reason naming comes first — a link
 * that created a person would create a second one.
 */
export default function MemberSheet() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const club = useClub();
  const member = club?.members.find((m) => m.id === id);

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
        {/*
         * STANDING. Drawn on GR5 as a row reading "Standing · Name only" and
         * missing from this screen until now, which mattered for more than
         * conformance: the admin row is how the app knows which of six names
         * is the person holding the phone, and there was no way to say so.
         * A host who removed the seeded admin and added themselves ended up
         * with a club with no admin, nights stamped with nobody, and My stats
         * permanently empty.
         *
         * ⚠ COPY NOT DRAWN. The drawn row is a read-only value; the design has
         * no control for naming yourself, because it was written for a club
         * whose admin already exists. "This is me" is therefore mine and wants
         * review — the row itself and its three values are the drawn ones.
         */}
        {member.standing === 'admin' ? (
          <View style={[styles.row, { borderBottomColor: t.hairline }]}>
            <Text style={[styles.rowLabel, { color: t.text }]}>Standing</Text>
            <Text style={[styles.rowValue, { color: t.muted }]}>Admin · this is you</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void makeAdmin(club.id, member.id).finally(() => setBusy(false));
            }}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.rowLabel, { color: t.text }]}>Standing</Text>
            <Text style={[styles.rowValue, { color: t.muted }]}>
              {member.standing === 'member' ? 'Member' : 'Name only'} · this is me
            </Text>
          </Pressable>
        )}

        {/*
         * C3 (rev 15) supersedes the GR6 step below this file's `step` flag.
         * GR6 described the invite; C3 issues it, and what it issues is a real
         * ten-character code from the server rather than a local flag. It is a
         * sheet of its own because it opens over Players as well as from here.
         */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/invite', params: { player: member.id } })}
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
          <Text style={[styles.rowLabel, { color: t.text }]}>Pays into the piggy bank</Text>
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

  // The explainer block that used to sit here went with GR6 when the invite
  // became its own sheet (`app/invite.tsx`); its styles outlived it. `block`
  // in tokens.ts is where the shape lives now.

  note: { ...type.footnote, marginTop: 16, marginHorizontal: space.page },
});
