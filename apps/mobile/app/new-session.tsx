import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import {
  lastSetup,
  roster,
  startNight,
  useNight,
  type Person,
  type Setup,
} from '../src/lib/nightStore';

/**
 * New session — O1, with O2 inside it.
 *
 * The manual way to open a table, for the night that is not like last night:
 * different stakes, a different buy-in, someone new at the table. The home
 * screen's card is the same act with every answer already filled in, which is
 * the one a host uses forty times out of fifty.
 *
 * ONE sheet, two steps, content replaced in place — rev 9's rule for multi-step
 * flows, and the reason there is a single close rather than a stack of them.
 * Adding players is a step of opening a table, not a place you go.
 *
 * Nothing is written until "Open the table". Backing out of this sheet leaves
 * the phone exactly as it was.
 */
export default function NewSession() {
  const t = useTheme();
  const current = useNight();

  const [step, setStep] = useState<'game' | 'players'>('game');
  const [setup, setSetup] = useState<Setup | null>(null);
  const [stakes, setStakes] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [seated, setSeated] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Prefilled from the last night played on this phone: same stakes, same
  // buy-in, same rules, same people. A host changes what is different and
  // leaves the rest, which is faster than being asked four questions.
  useEffect(() => {
    void lastSetup().then((last) => {
      setSetup(last);
      setStakes(last.stakes ?? '');
      setBuyIn(String(last.defaultBuyIn));
      setSeated(last.playerNames);
    });
  }, []);

  const amount = Number(buyIn);
  const buyInOk = Number.isFinite(amount) && amount > 0;
  const startsAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const stillOpen = current !== null && current.status !== 'settled';

  async function open() {
    if (setup === null || !buyInOk) return;
    setBusy(true);
    try {
      await startNight({
        ...(stakes.trim() === '' ? {} : { stakes: stakes.trim() }),
        defaultBuyIn: money(amount),
        playerNames: seated,
        rules: setup.rules,
      });
      router.dismissTo('/');
      router.push('/session');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'players') {
    return (
      <AddPlayers
        seated={seated}
        onChange={setSeated}
        onDone={() => setStep('game')}
      />
    );
  }

  return (
    <Sheet
      title="New session"
      sub={`Starts at ${startsAt} · every entry is stamped from there`}
      footer={
        <Button
          label={buyInOk ? `Open the table · ${startsAt}` : 'Set a buy-in'}
          variant="primary"
          disabled={!buyInOk || busy || setup === null}
          onPress={() => void open()}
        />
      }
    >
      <View style={styles.page}>
        {/* An open night is not in the way, but it is not invisible either.
            Starting a second table leaves the first exactly as it is — the
            money in it is still recorded and still countable — and saying so
            here is the difference between a choice and an accident. */}
        {stillOpen && (
          <View style={[styles.warn, { backgroundColor: t.surface, borderColor: t.hairline }]}>
            <Text style={[styles.warnText, { color: t.muted }]}>
              Tonight is still open. Starting a new session leaves it as it is — nothing in it is
              lost, it simply stops being the night this phone is showing.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: t.muted }]}>The game</Text>

        <View style={styles.form}>
          <Field
            label="Stakes"
            value={stakes}
            onChangeText={setStakes}
            placeholder="$5 / $5"
            hint="Written down with the night. Nothing is calculated from it."
          />
          <Field
            label="Default buy-in"
            value={buyIn}
            onChangeText={(v) => setBuyIn(v.replace(/[^0-9]/g, ''))}
            placeholder="500"
            keyboardType="number-pad"
            hint="What the keypad offers first. Any amount can still be typed."
          />
        </View>

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Money rules</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Text style={[styles.cardValue, { color: t.text }]}>
            {setup === null || setup.rules.length === 0
              ? 'No rules — everything stays on the table'
              : setup.rules.map((r) => r.name).join(' · ')}
          </Text>
          <Text style={[styles.cardHint, { color: t.muted }]}>
            {setup !== null && setup.rules.length > 0
              ? 'Same as last time. Change them from the night once it is open.'
              : 'Add them from the night once it is open.'}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>
          Seated · {seated.length}
        </Text>
        <View style={styles.seatedList}>
          {seated.map((name, i) => (
            <View
              key={`${name}-${i}`}
              style={[
                styles.seatRow,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === seated.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.seatName, { color: t.text }]}>{name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name}`}
                hitSlop={10}
                onPress={() => setSeated(seated.filter((_, at) => at !== i))}
                style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Icon name="close" color={t.muted} />
              </Pressable>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => setStep('players')}
            style={({ pressed }) => [
              styles.find,
              { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Icon name="plus" color={t.text} />
            <Text style={[styles.findLabel, { color: t.text }]}>Find a player</Text>
          </Pressable>
        </View>

        <Text style={[styles.footnote, { color: t.muted }]}>
          Nobody is in for anything yet — the table opens empty and the first buy-in is the first
          thing you record.
        </Text>
      </View>
    </Sheet>
  );
}

/**
 * O2 · Add players — the same sheet, showing its second step.
 *
 * The roster is everyone this phone has ever seated, most recent first, because
 * the person you are looking for at 20:05 is almost always someone who played
 * last week. Typing a name is the escape hatch, not the main path.
 */
function AddPlayers({
  seated,
  onChange,
  onDone,
}: {
  seated: string[];
  onChange: (names: string[]) => void;
  onDone: () => void;
}) {
  const t = useTheme();
  const [known, setKnown] = useState<Person[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void roster().then(setKnown);
  }, []);

  const typed = query.trim();
  const matches = known.filter((p) => p.name.toLowerCase().includes(typed.toLowerCase()));
  const isSeated = (name: string) => seated.some((s) => s.toLowerCase() === name.toLowerCase());
  const unknown = typed !== '' && !known.some((p) => p.name.toLowerCase() === typed.toLowerCase());

  const toggle = (name: string) =>
    onChange(
      isSeated(name) ? seated.filter((s) => s.toLowerCase() !== name.toLowerCase()) : [...seated, name],
    );

  return (
    <Sheet
      title="Add players"
      sub={`${seated.length} seated`}
      onClose={onDone}
      footer={
        <Button label={`Done · ${seated.length} seated`} variant="primary" onPress={onDone} />
      }
    >
      <View style={styles.page}>
        <Field label="Search by name" value={query} onChangeText={setQuery} placeholder="Petr" />

        {unknown && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onChange([...seated, typed]);
              setQuery('');
            }}
            style={({ pressed }) => [
              styles.find,
              styles.after,
              { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Icon name="plus" color={t.text} />
            <Text style={[styles.findLabel, { color: t.text }]}>Seat &ldquo;{typed}&rdquo;</Text>
          </Pressable>
        )}

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>
          Most recent first
        </Text>

        {matches.length === 0 && !unknown ? (
          <Text style={[styles.footnote, { color: t.muted }]}>
            Nobody yet. Type a name above and they are seated — a player is a name, not an account.
          </Text>
        ) : (
          matches.map((p, i) => (
            <Pressable
              key={p.name}
              accessibilityRole="button"
              onPress={() => toggle(p.name)}
              style={({ pressed }) => [
                styles.seatRow,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: i === matches.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.rosterText}>
                <Text style={[styles.seatName, { color: t.text }]}>{p.name}</Text>
                <Text style={[styles.rosterSub, { color: t.muted }]}>
                  {p.lastPlayed === null
                    ? 'not played yet'
                    : `played ${played(p.lastPlayed)} · ${p.nights} ${p.nights === 1 ? 'night' : 'nights'}`}
                </Text>
              </View>

              {isSeated(p.name) ? (
                <View style={[styles.badge, { backgroundColor: t.raised }]}>
                  <Text style={[styles.badgeText, { color: t.text }]}>SEATED</Text>
                </View>
              ) : (
                <Text style={[styles.add, { color: t.muted }]}>Add</Text>
              )}
            </Pressable>
          ))
        )}
      </View>
    </Sheet>
  );
}

/** "28 July" — the date a name was last at a table. */
function played(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.page },

  warn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: space.section,
  },
  warnText: { ...type.footnote },

  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 8 },
  after: { marginTop: space.section },

  form: { gap: 16 },

  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  cardValue: type.body,
  cardHint: type.footnote,

  seatedList: { gap: 0 },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  seatName: type.rowName,
  rosterText: { flexShrink: 1, gap: 2 },
  rosterSub: type.detail,
  remove: { marginLeft: 'auto' },
  add: { ...type.chip, marginLeft: 'auto' },
  badge: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radius.badge,
  },
  badgeText: type.badge,

  find: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.pressable,
  },
  findLabel: type.body,

  footnote: { ...type.footnote, paddingHorizontal: 4, paddingTop: 14 },
});
