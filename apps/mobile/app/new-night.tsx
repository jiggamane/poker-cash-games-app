import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { currencyFor } from '../src/data/currencies';
import {
  addMember,
  inheritedFor,
  rememberLastGame,
  useClub,
  type Inherited,
} from '../src/lib/clubStore';
import { startNight, tableNameProblem, useOpenGames } from '../src/lib/nightStore';

/**
 * Setting up the game. 12-the-group.md § 2.
 *
 * BECAUSE EVERY RULE ARRIVES PRE-FILLED, STARTING A GAME IS ADDING PLAYERS AND
 * THEIR FIRST BUY-INS. The inherited rules appear as a summary, not a form,
 * with one row into the house rules for the rare evening where something has
 * to change — and that row is deliberately not the thing your thumb lands on.
 *
 * What arrives is the chain: this game → last game → club default → app
 * default. The summary says which layer answered, because "same as last time"
 * and "the club's setting" are different promises.
 */
export default function NewNight() {
  const t = useTheme();
  const club = useClub();
  const open = useOpenGames();

  const [inherited, setInherited] = useState<Inherited | null>(null);
  const [picked, setPicked] = useState<Record<PlayerId, string>>({});
  const [busy, setBusy] = useState(false);
  /** O2, folded into O1: a name typed here joins the roster and sits down. */
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  /** What to call this table, asked only when it is not the club's only one. */
  const [tableName, setTableName] = useState('');

  useEffect(() => {
    if (club === null) return;
    void inheritedFor(club).then(setInherited).catch(() => {});
  }, [club]);

  if (club === null || inherited === null) return <Sheet title="Set up the game">{null}</Sheet>;

  const currency = currencyFor(club.currency);

  const seats = Object.entries(picked)
    .map(([playerId, amount]) => ({
      playerId,
      name: club.members.find((m) => m.id === playerId)?.name ?? 'Someone',
      buyIn: money(Number(amount) || 0),
    }))
    .filter((s) => s.buyIn > 0);

  /*
   * A SECOND TABLE IS A NORMAL THING TO OPEN.
   *
   * This sheet used to refuse: with a game running its only button read "A
   * night is already running" and led back to it. A club that puts eight people
   * round one table and four round another had nowhere to go, and the refusal
   * was not protecting anything — the ledger has always been per night.
   *
   * What a second table does need is a name. While there is one game it is
   * "Tonight"; the moment there are two, both cards on home are told apart by
   * nothing else, so this asks — and `tableNameProblem` is the same rule the
   * store enforces when it writes the row.
   */
  const others = open.map((g) => g.tableName);
  const second = others.length > 0;
  const nameProblem = second ? tableNameProblem(tableName, others) : null;

  /*
   * Which seat is the host's own. It is stamped onto the night at birth and it
   * is the only thing that lets a results screen say "You" and My stats say
   * what you won — nothing in the money depends on it.
   *
   * A club normally has exactly one admin, seeded from the sample night. A
   * host who removes that name while making the roster their own can leave
   * none at all, and the consequence used to arrive four hours later as an
   * empty stats screen with nothing on it explaining why. Naming yourself is a
   * row on the player sheet; this says so before the night starts rather than
   * after it ends.
   */
  const me = club.members.find((m) => m.standing === 'admin');

  async function openTable() {
    if (seats.length === 0 || busy || club === null || inherited === null) return;
    setBusy(true);
    try {
      await startNight({
        clubId: club.id,
        groupName: club.name,
        rules: inherited.rules,
        seats,
        buyIn: inherited.buyIn,
        ...(second ? { tableName: tableName.trim() } : {}),
        // The club's roster is where a non-playing collector gets their name.
        nameOfCollector: (id) => club.members.find((m) => m.id === id)?.name,
        ...(me === undefined ? {} : { meId: me.id }),
      });
      // What the night actually ran with becomes the next night's suggestion,
      // and only that — the club's own setting is untouched.
      await rememberLastGame(club.id, inherited.buyIn, inherited.rules);
      router.dismissTo('/');
      router.push('/session');
    } finally {
      setBusy(false);
    }
  }

  /*
   * ADDING SOMEBODY IS PART OF SETTING UP THE GAME, not an errand before it.
   *
   * Without this the roster was read-only here, and the empty-club case had no
   * way out at all: a group created with "Add players later" landed on a sheet
   * whose own copy told the host to go to Players — a screen this sheet cannot
   * reach, because `09-navigation.md` forbids a sheet from pushing. The route
   * was close the sheet, Settings, Players, back, back, and open it again, and
   * every one of those taps is one an admin makes standing at a table.
   *
   * A name typed here does both halves at once: it joins the club's roster for
   * good, and it is ticked for tonight at the inherited buy-in — which is what
   * O2 means by "a name typed into the field creates a player and seats them".
   */
  async function add() {
    const name = newName.trim();
    if (club === null || inherited === null || name === '' || adding) return;
    if (club.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return;
    setAdding(true);
    try {
      const id = await addMember(club.id, name);
      setPicked((p) => ({ ...p, [id]: String(inherited.buyIn) }));
      setNewName('');
    } finally {
      setAdding(false);
    }
  }

  const typed = newName.trim();
  const taken = club.members.some((m) => m.name.toLowerCase() === typed.toLowerCase());

  return (
    <Sheet
      title="Set up the game"
      sub={club.name}
      footer={
        <Button
          label={
            seats.length === 0
              ? 'Pick who is playing'
              : nameProblem !== null
                ? 'Name this table'
                : `Open the table · ${seats.length} ${seats.length === 1 ? 'player' : 'players'}`
          }
          variant="primary"
          disabled={seats.length === 0 || nameProblem !== null || busy}
          onPress={() => void openTable()}
        />
      }
    >
      {/* A second table is named before it is opened: two cards on home with
          money on both are told apart by nothing else. The first table is not
          asked — while it is the only one it is "Tonight". */}
      {second && (
        <View style={styles.tableName}>
          <Field
            label="This table"
            value={tableName}
            onChangeText={setTableName}
            placeholder="Kitchen table"
            autoCapitalize="sentences"
            hint={
              nameProblem === 'reserved'
                ? 'Tonight is both tables now — this one needs a name of its own'
                : nameProblem === 'taken'
                  ? 'That name is taken by a table already open'
                  : others.length === 1
                    ? `${others[0]} is already open`
                    : `${others.length} tables are already open`
            }
          />
        </View>
      )}

      {/* A summary, not a form. */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>Buy-in</Text>
          {/* The club's own symbol, because this figure is the club's money and
              this is the screen that says which money that is. */}
          <Text style={[styles.cardValue, { color: t.text }]}>
            {formatMoney(inherited.buyIn, currency.symbol)}
          </Text>
        </View>
        {/*
         * A NIGHT DOES NOT PICK A CURRENCY. It is a club default — the top row
         * of the settings table in 12-the-group.md § 2 — and a book whose
         * column changed money halfway through would be unreadable. So it is
         * stated here, where the game is set up, and changed in the group.
         */}
        <View style={styles.cardRow}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>Currency</Text>
          <Text style={[styles.cardValue, { color: t.text }]}>
            {`${currency.code} · ${currency.name}`}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>Comes off the table</Text>
          <Text style={[styles.cardValue, { color: t.text }]}>
            {inherited.rules.length === 0
              ? 'nothing'
              : inherited.rules.map((r) => r.name.toLowerCase()).join(' · ')}
          </Text>
        </View>
        <Text style={[styles.from, { color: t.dim }]}>from the {inherited.from}</Text>

        {/*
         * A SHEET NEVER PUSHES — `09-navigation.md`: "if a sheet needs to go
         * somewhere that is a place, it dismisses first". This used to push
         * Money rules straight out of the sheet, stacking Chrome A on top of
         * Chrome B: a round back button over a grabber, the two vocabularies
         * mixed on one screen, and a back button whose label said Settings
         * when back actually landed on this sheet.
         */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.back();
            router.push('/club-rules');
          }}
          style={({ pressed }) => [
            styles.change,
            { borderTopColor: t.hairline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.changeLabel, { color: t.muted }]}>Change the house rules</Text>
          <Icon name="chevron" color={t.muted} />
        </Pressable>
      </View>

      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Who is playing</Text>

        {/*
          ⚠ COPY NOT DRAWN. The design has no state for a club with no admin,
          because it was written for one that always has exactly one. Flagged
          rather than left silent: the alternative is a host finding out after
          the night that it was recorded against nobody.
        */}
        {me === undefined && club.members.length > 0 && (
          <Text style={[styles.warn, { color: t.amber }]}>
            Nobody on this roster is marked as you, so this night will not count towards your
            stats. Open your own name in Settings · Players and tap Standing.
          </Text>
        )}

        {club.members.map((m, i) => {
          const on = picked[m.id] !== undefined;
          return (
            <View
              key={m.id}
              style={[
                styles.row,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === club.members.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() =>
                  setPicked((p) => {
                    const next = { ...p };
                    if (on) delete next[m.id];
                    else next[m.id] = String(inherited.buyIn);
                    return next;
                  })
                }
                style={styles.pick}
              >
                <View style={[styles.box, { borderColor: on ? t.text : t.dashed }]}>
                  {on && <Icon name="check" color={t.text} size={13} />}
                </View>
                <Text style={[styles.name, { color: on ? t.text : t.muted }]}>{m.name}</Text>
              </Pressable>

              {/* Per-player amounts are editable at exactly this moment and
                  nowhere else — after this they are ledger entries. */}
              {on && (
                <TextInput
                  value={picked[m.id]}
                  onChangeText={(v) =>
                    setPicked((p) => ({ ...p, [m.id]: v.replace(/[^0-9]/g, '') }))
                  }
                  // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
                  // to a digits-only keyboard.
                  testID="amount"
                  keyboardType="number-pad"
                  style={[
                    styles.amount,
                    { color: t.text, backgroundColor: t.ground, borderColor: t.hairline },
                  ]}
                />
              )}
            </View>
          );
        })}

        {club.members.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            Nobody on the roster yet. Add the first name below and they can play tonight.
          </Text>
        )}

        {/* At the foot of the roster, where O2 puts it. */}
        <View style={styles.add}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={() => void add()}
            placeholder="New player — type a name"
            placeholderTextColor={t.muted}
            autoCapitalize="words"
            returnKeyType="done"
            style={[
              styles.addField,
              {
                color: t.text,
                backgroundColor: t.surface,
                borderColor: typed === '' ? t.dashed : t.hairline,
                borderStyle: typed === '' ? 'dashed' : 'solid',
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: typed === '' || taken || adding }}
            disabled={typed === '' || taken || adding}
            onPress={() => void add()}
            style={({ pressed }) => [
              styles.addButton,
              {
                borderColor: t.quietOutline,
                opacity: typed === '' || taken ? 0.4 : pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.addLabel, { color: t.text }]}>Add</Text>
          </Pressable>
        </View>

        {taken && (
          <Text style={[styles.empty, { color: t.muted }]}>{`${typed} is already here`}</Text>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.card,
    marginBottom: 22,
    paddingTop: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
    gap: 8,
  },
  cardRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  cardLabel: { fontSize: 12.5, fontWeight: '600' },
  cardValue: { ...type.rowName, marginLeft: 'auto', flexShrink: 1, textAlign: 'right' },
  from: { fontSize: 12, fontWeight: '400' },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  changeLabel: { ...type.meta, fontWeight: '500' },

  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  tableName: { marginHorizontal: space.card, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...type.rowName, flexShrink: 1 },
  amount: {
    ...type.figure,
    marginLeft: 'auto',
    minWidth: 104,
    textAlign: 'right',
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  empty: { ...type.footnote, paddingHorizontal: 4 },
  warn: { ...type.footnote, paddingHorizontal: 4, paddingBottom: 10, lineHeight: 18 },

  add: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingHorizontal: 4 },
  addField: {
    ...type.body,
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addButton: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  addLabel: { fontSize: 15, fontWeight: '700' },
});
