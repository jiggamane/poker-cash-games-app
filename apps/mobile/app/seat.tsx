import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money, resolveLedger } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { addPlayer, defaultBuyIn, seatAndBuyIn, useNight } from '../src/lib/nightStore';
import { addMember, rosterIdFor, useClub } from '../src/lib/clubStore';
import { benchFor, sameName } from '../src/lib/rosterMerge';

/**
 * Seat a new player — N7.
 *
 * Two things at once, on purpose: it adds them to the group's roster AND puts
 * them in tonight's game. A roster that had to be curated separately would
 * mean typing a name at the table twice, and the second time is the one that
 * gets skipped.
 *
 * The roster chips above the field are people the group already knows who are
 * not playing tonight — the far more common case than somebody genuinely new.
 *
 * THOSE CHIPS COME OFF THE GROUP'S ROSTER, not off the night. Drawn from the
 * night's own player list they could only ever show somebody a previous night
 * had already put there, so a player added on GR4 between games — the ordinary
 * way to add somebody — was missing from the one screen that exists to seat
 * them, and the host had to type the name again. Typing it again is what made
 * the second copy of them.
 */
export default function Seat() {
  const t = useTheme();
  const night = useNight();
  const club = useClub();

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  /**
   * The first buy-in, typed. It arrives filled with what the table has been
   * buying in for, and somebody sitting down for half of that — or double it —
   * is a normal enough thing that it must not need a second screen.
   */
  const [stake, setStake] = useState<string | null>(null);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Sheet title="New player">{null}</Sheet>;
  }

  const suggested = defaultBuyIn(ledger);
  const typed = stake ?? String(suggested);
  const amount = typed === '' ? 0 : Number(typed);
  const stakeOk = Number.isInteger(amount) && amount > 0;

  /** Who has money on the table. They are playing; they are not on the bench. */
  const playing = new Set(
    night.players
      .filter((p) => p.atTable || (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0)
      .map((p) => p.id),
  );

  /** On the roster, not in tonight's game. */
  const bench = benchFor({
    members: club?.members ?? [],
    nightPlayers: night.players,
    playing,
  });

  const trimmed = name.trim();
  /*
   * A CLASH IS SOMEBODY ALREADY PLAYING, which is what the hint below has
   * always said it is. It used to be anybody the night had heard of, and that
   * caught the piggy bank's treasurer and everyone on the bench — the people
   * this sheet exists to seat. Two Petrs at one table is still refused.
   */
  const clash = night.players.some((p) => playing.has(p.id) && sameName(p.name, trimmed));
  const valid = trimmed.length > 0 && !clash && stakeOk;

  /**
   * The roster row for this name, made if the group has not got one.
   *
   * Naming comes first, always: the person exists in the group and THEN takes a
   * seat, so one human is one row wherever they show up. Without a club — which
   * cannot happen once the app has started, but this screen does not get to
   * assume it — the night mints the id as it always did.
   */
  async function idFor(): Promise<string | undefined> {
    if (club === null) return undefined;
    return rosterIdFor(club.id, trimmed);
  }

  async function commit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await seatAndBuyIn(trimmed, money(amount), await idFor());
      router.dismissTo('/session');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Roster only, no buy-in yet — for adding somebody who is not playing.
   *
   * It adds them to the GROUP, which is what the button says and what it did
   * not do: it put a row in tonight's night and nowhere else, so somebody added
   * by the one control labelled "roster" was gone by the next game.
   */
  async function justAdd() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (club === null) await addPlayer(trimmed);
      else await addMember(club.id, trimmed);
      setName('');
    } finally {
      setBusy(false);
    }
  }

  /**
   * A chip tapped: into the night, then straight to their first buy-in.
   *
   * The buy-in sheet takes a player id and reads it off the night, so somebody
   * who is only on the roster has to join the night before it opens on them.
   * They join under their ROSTER id, which is the whole point.
   */
  async function seatFromBench(person: { id: string; name: string }) {
    if (busy) return;
    setBusy(true);
    try {
      // The id the NIGHT ends up using, which is the roster's own except on a
      // night that already had its own row for this name. Routing with the
      // chip's id there would open the buy-in sheet on somebody the night has
      // never heard of.
      const id = await addPlayer(person.name, person.id);
      router.replace({ pathname: '/log', params: { player: id, kind: 'buyin' } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="New player"
      sub="Seats them tonight and adds them to the group roster. They can be invited later."
      sentence
      footer={
        <>
          <Button
            label={
              trimmed === ''
                ? 'Type a name'
                : clash
                  ? `${trimmed} is already here`
                  : !stakeOk
                    ? 'Set a first buy-in'
                    : `Seat ${trimmed} · ${formatMoney(money(amount))}`
            }
            variant="primary"
            disabled={!valid || busy}
            onPress={commit}
          />
          <Button
            label="Add to the roster only"
            variant="secondary"
            disabled={!valid || busy}
            onPress={() => void justAdd()}
          />
        </>
      }
    >
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: t.muted }]}>Name</Text>
        <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            onSubmitEditing={commit}
            placeholder="Their name"
            placeholderTextColor={t.muted}
            returnKeyType="done"
            autoCapitalize="words"
            style={[styles.inputText, { color: t.text }]}
          />
        </View>
        {clash && (
          <Text style={[styles.hint, { color: t.muted }]}>
            Somebody by that name is already in this night. Two Petrs need two different names, or
            the ledger cannot tell them apart.
          </Text>
        )}
      </View>

      {bench.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>From the roster</Text>
          <View style={styles.chips}>
            {bench.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                onPress={() => void seatFromBench(p)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: t.surface, borderColor: t.hairline, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.chipLabel, { color: t.text }]}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.stake, { borderColor: t.hairline }]}>
        <Text style={[styles.stakeLabel, { color: t.text }]}>First buy-in</Text>
        <View style={[styles.stakeField, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Text style={[styles.stakeCurrency, { color: stakeOk ? t.text : t.muted }]}>$</Text>
          <TextInput
            value={typed}
            onChangeText={(v) => setStake(v.replace(/[^0-9]/g, ''))}
            // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
            // to a digits-only keyboard.
            testID="amount"
            keyboardType="number-pad"
            selectTextOnFocus
            style={[styles.stakeValue, { color: stakeOk ? t.text : t.muted }]}
          />
        </View>
        <Text style={[styles.stakeHint, { color: t.muted }]}>
          {amount !== suggested
            ? 'for this seat'
            : ledger.totalBoughtIn === 0
              ? 'the usual'
              : 'same as the table'}
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: { marginHorizontal: space.card, marginBottom: 14, gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.08, textTransform: 'uppercase' },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputText: { fontSize: 19, fontWeight: '600', padding: 0 },
  hint: { ...type.footnote },

  section: { marginHorizontal: space.page, marginBottom: 14 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  chip: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.pressable, borderWidth: 1 },
  chipLabel: { fontSize: 15, fontWeight: '600' },

  stake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: space.card,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // The label and the hint both hold their line; only the hint may wrap, and
  // the field between them keeps its width whatever the two of them do.
  stakeLabel: { fontSize: 16, fontWeight: '500', flexShrink: 0 },
  stakeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    // A fixed box. A text input left to itself takes whatever room is going
    // and squeezes the line beside it into a column of single words.
    width: 108,
    marginLeft: 'auto',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.pressable,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stakeCurrency: { fontSize: 16, fontWeight: '700' },
  stakeValue: {
    // A width, not a flex: an input given `flex` inside a fixed box overflows
    // it on web and puts the figure outside its own field.
    width: 72,
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  stakeHint: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
