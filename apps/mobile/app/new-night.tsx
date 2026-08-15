import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { currencyFor } from '../src/data/currencies';
import { inheritedFor, rememberLastGame, useClub, type Inherited } from '../src/lib/clubStore';
import { startNight, useNight } from '../src/lib/nightStore';

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
  const night = useNight();

  const [inherited, setInherited] = useState<Inherited | null>(null);
  const [picked, setPicked] = useState<Record<PlayerId, string>>({});
  const [busy, setBusy] = useState(false);

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

  const running = night !== null && night.status !== 'settled';

  async function open() {
    if (seats.length === 0 || busy || club === null || inherited === null) return;
    setBusy(true);
    try {
      await startNight({
        clubId: club.id,
        groupName: club.name,
        rules: inherited.rules,
        seats,
        ...(club.members.find((m) => m.standing === 'admin')?.id === undefined
          ? {}
          : { meId: club.members.find((m) => m.standing === 'admin')!.id }),
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

  return (
    <Sheet
      title="Set up the game"
      sub={club.name}
      footer={
        running ? (
          <Button
            label="A night is already running"
            variant="secondary"
            onPress={() => {
              router.back();
              router.push('/session');
            }}
          />
        ) : (
          <Button
            label={
              seats.length === 0
                ? 'Pick who is playing'
                : `Open the table · ${seats.length} ${seats.length === 1 ? 'player' : 'players'}`
            }
            variant="primary"
            disabled={seats.length === 0 || busy}
            onPress={() => void open()}
          />
        )
      }
    >
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

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/club-rules')}
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
            Nobody on the roster yet. Add the first names in Players and they can play tonight.
          </Text>
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
});
