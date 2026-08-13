import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money, resolveLedger, type Money, type PlayerId } from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { PushHeader } from '../src/components/PushHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/design/useTheme';
import {
  addSpend,
  nameOf,
  renameSpend,
  spendsOf,
  useNight,
  voidSpend,
  type Cover,
} from '../src/lib/nightStore';

/** The words that go in a note, not categories: nothing here changes a number. */
const PREFILLS = ['Food', 'Drinks', 'Venue'] as const;

/**
 * A spend — L2 to add one, L3 to look at one that exists.
 *
 * ONE SCREEN, NO STEPS: the amount, an optional note, and who covered it. The
 * time is stamped on save and there is no time field, because a host adding a
 * pizza at 22:12 is adding it now.
 *
 * There is no TYPE on a spend. The chips above the note are prefills that write
 * a word into it — nothing but the amount affects the arithmetic, so a category
 * would be a field that looks like it means something and does not.
 *
 * Covered by has four answers and they are genuinely different: one player is
 * repaid exactly what they put in; several players are each repaid their own
 * share and those shares must SUM to the spend; the kitty paid it directly and
 * the kitty is what gets repaid; and nobody-yet leaves it on the bill, unpaid,
 * which is a state a night cannot settle in.
 */
export default function Spend() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  const spends = useMemo(
    () => (night === null || ledger === null ? [] : spendsOf(night, ledger)),
    [night, ledger],
  );
  const existing = id === undefined ? undefined : spends.find((s) => s.id === id);

  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const [cover, setCover] = useState<'kitty' | 'unpaid' | null>(null);
  const [fronters, setFronters] = useState<readonly PlayerId[]>([]);
  const [busy, setBusy] = useState(false);

  if (night === null || ledger === null) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
        <PushHeader title="New spend" />
      </SafeAreaView>
    );
  }

  if (existing !== undefined) return <SpendDetail spendId={existing.id} />;

  const seated = night.players.filter(
    (p) => p.atTable && (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0,
  );

  const amount = typed === '' ? 0 : Number(typed);
  const stamped = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  /*
   * Several fronters split the spend evenly by default, and the remainder goes
   * to the first of them — the same largest-remainder rule the engine uses, so
   * the shares always sum to the spend exactly.
   */
  const shares = fronters.map((playerId, i) => {
    const each = Math.floor(amount / fronters.length);
    const extra = amount - each * fronters.length;
    return { playerId, amount: money(each + (i < extra ? 1 : 0)) };
  });

  const covered = cover !== null || fronters.length > 0;
  const valid = amount > 0 && covered;

  async function commit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const c: Cover =
        cover !== null ? { kind: cover } : { kind: 'players', shares };
      await addSpend(money(amount), note.trim(), c);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  const toggleFronter = (playerId: PlayerId) => {
    setCover(null);
    setFronters((cur) =>
      cur.includes(playerId) ? cur.filter((p) => p !== playerId) : [...cur, playerId],
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <PushHeader
        title="New spend"
        trailing={<Text style={[styles.meta, { color: t.muted }]}>stamped {stamped}</Text>}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: amount > 0 ? t.text : t.muted }]}>
            {formatMoney(money(amount))}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: t.muted }]}>Note</Text>
          <View style={styles.chips}>
            {PREFILLS.map((word) => (
              <Chip key={word} label={word} on={note === word} onPress={() => setNote(word)} />
            ))}
          </View>
        </View>

        <View style={[styles.noteField, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What was it?"
            placeholderTextColor={t.muted}
            autoCapitalize="sentences"
            style={[styles.noteText, { color: t.text }]}
          />
          <Text style={[styles.optional, { color: t.muted }]}>optional</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: t.muted }]}>Covered by</Text>
          <View style={styles.chips}>
            {seated.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                on={fronters.includes(p.id)}
                onPress={() => toggleFronter(p.id)}
              />
            ))}
            <Chip
              label="The kitty"
              on={cover === 'kitty'}
              onPress={() => {
                setFronters([]);
                setCover(cover === 'kitty' ? null : 'kitty');
              }}
            />
            <Chip
              dashed
              label="Nobody yet"
              on={cover === 'unpaid'}
              onPress={() => {
                setFronters([]);
                setCover(cover === 'unpaid' ? null : 'unpaid');
              }}
            />
          </View>

          {/* Several fronters means per-person amounts, and they must sum to
              the spend. They are derived here rather than typed, so they always
              do — the drawn red state is what a host sees when they do not. */}
          {fronters.length > 1 && (
            <View style={styles.shares}>
              {shares.map((s) => (
                <View key={s.playerId} style={styles.shareRow}>
                  <Text style={[styles.shareName, { color: t.muted }]}>
                    {nameOf(night, s.playerId)}
                  </Text>
                  <Text style={[styles.shareAmount, { color: t.text }]}>
                    {formatMoney(s.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Keypad
          compact
          onDigits={(d) => setTyped((cur) => appendDigits(cur, d))}
          onBackspace={() => setTyped((cur) => cur.slice(0, -1))}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={!valid || busy}
          onPress={commit}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: t.text, opacity: !valid || busy ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.primaryLabel, { color: t.onFill }]}>
            {amount === 0
              ? 'Type an amount'
              : !covered
                ? 'Say who covered it'
                : `Add ${formatMoney(money(amount))} to the bill`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/**
 * L3 · one spend that exists.
 *
 * The amount, the note and one row per fronter. Voiding writes a correction
 * and keeps the original line — the ledger is append-only, here as everywhere.
 */
function SpendDetail({ spendId }: { spendId: string }) {
  const t = useTheme();
  const night = useNight();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  const spend = useMemo(
    () => (night === null || ledger === null ? undefined : spendsOf(night, ledger).find((s) => s.id === spendId)),
    [night, ledger, spendId],
  );

  if (night === null || spend === undefined) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
        <PushHeader title="Spend" />
      </SafeAreaView>
    );
  }

  const coveredLabel =
    spend.cover === 'kitty'
      ? 'Covered by · the kitty'
      : spend.cover === 'unpaid'
        ? 'Covered by · nobody yet'
        : spend.fronters.length === 1
          ? 'Covered by · one person'
          : `Covered by · ${count(spend.fronters.length)} people`;

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await voidSpend(spendId);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <PushHeader
        title={spend.note ?? 'Spend'}
        trailing={<Text style={[styles.metaTabular, { color: t.muted }]}>{clock(spend.at)}</Text>}
      />

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardFigures}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>Amount</Text>
          <Text style={[styles.figure, { color: t.text }]}>{formatMoney(spend.amount)}</Text>
        </View>
        <View style={styles.cardRight}>
          {/* The board reads "logged by Ivo · edited once". Who wrote an entry
              is not on the row yet, so this says what the app does know. */}
          <Text style={[styles.ruleLine, { color: t.muted }]}>on the bill</Text>
          <Text style={[styles.count, { color: t.dim }]}>
            {spend.entryIds.length === 1 ? 'one entry' : `${spend.entryIds.length} entries`}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <View style={[styles.detailRow, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.detailLabel, { color: t.muted }]}>Note</Text>
          <TextInput
            value={note ?? spend.note ?? ''}
            onChangeText={setNote}
            placeholder="What was it?"
            placeholderTextColor={t.muted}
            style={[styles.detailInput, { color: t.text }]}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: t.muted }]}>{coveredLabel}</Text>

        {spend.fronters.map((f) => (
          <Pressable
            key={f.entryId}
            accessibilityRole="button"
            /* The chevron goes to N10, which is where an amount is restated —
               a correction, appended, with the original line left standing. */
            onPress={() => router.push({ pathname: '/entry', params: { id: f.entryId } })}
            style={({ pressed }) => [
              styles.frontRow,
              { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: t.surface }]}>
              <Text style={[styles.avatarLetter, { color: t.muted }]}>
                {nameOf(night, f.playerId).slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.frontName, { color: t.text }]}>{nameOf(night, f.playerId)}</Text>
            <Text style={[styles.frontAmount, { color: t.text }]}>{formatMoney(f.amount)}</Text>
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}

        <Text style={[styles.explain, { color: t.dim }]}>
          {spend.cover === 'players'
            ? 'Each of them is paid back exactly what they fronted at settle-up. Fronting is not the same as being exempt — their own share still comes off their result.'
            : spend.cover === 'kitty'
              ? 'The kitty paid for this directly, so nobody is reimbursed for it — the money left the kitty and comes back to it at settle-up.'
              : 'Nobody has been named for this yet. It counts towards the bill, and the night cannot be settled until somebody is.'}
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy || note === null || note === (spend.note ?? '')}
          onPress={() => {
            setBusy(true);
            void renameSpend(spendId, (note ?? '').trim()).finally(() => {
              setBusy(false);
              router.back();
            });
          }}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: t.text,
              opacity: busy || note === null || note === (spend.note ?? '') ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryLabel, { color: t.onFill }]}>Save changes</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={remove}
          style={({ pressed }) => [
            styles.destructive,
            { borderColor: `${t.danger}8C`, opacity: busy ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.destructiveLabel, { color: t.danger }]}>Void this spend</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Chip({
  label,
  on,
  onPress,
  dashed = false,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  dashed?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        dashed && !on ? styles.chipDashed : null,
        on
          ? { backgroundColor: t.text, borderColor: t.text }
          : dashed
            ? { borderColor: t.dashed }
            : { backgroundColor: t.surface, borderColor: t.hairline },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: on ? t.onFill : dashed ? t.muted : t.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const count = (n: number) =>
  n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : String(n);

const clock = (iso: string | undefined): string =>
  iso === undefined || iso === ''
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  screen: { flex: 1 },
  meta: { fontSize: 13, fontWeight: '400' },
  metaTabular: { fontSize: 13, fontWeight: '400', fontVariant: ['tabular-nums'] },

  scroll: { flex: 1 },
  body: { flexGrow: 1 },

  amountRow: { alignItems: 'center', paddingTop: 16, paddingBottom: 14 },
  amount: { fontSize: 68, fontWeight: '800', letterSpacing: -3.4, lineHeight: 68, fontVariant: ['tabular-nums'] },

  field: { marginHorizontal: 20, marginBottom: 12, gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.08, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  chipDashed: { borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: 'transparent' },
  chipLabel: { fontSize: 15, fontWeight: '600' },

  noteField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  noteText: { flex: 1, fontSize: 17, fontWeight: '600', padding: 0 },
  optional: { fontSize: 13, fontWeight: '400' },

  shares: { paddingTop: 4, gap: 4 },
  shareRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  shareName: { fontSize: 13, fontWeight: '500' },
  shareAmount: { fontSize: 13, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  footer: { paddingTop: 14, paddingHorizontal: 20 },
  primary: { alignItems: 'center', paddingVertical: 18, borderRadius: 8 },
  primaryLabel: { fontSize: 17, fontWeight: '700' },

  // --- L3 --------------------------------------------------------------------
  card: {
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  cardFigures: { gap: 8 },
  cardLabel: { fontSize: 12.5, fontWeight: '600' },
  figure: { fontSize: 44, fontWeight: '800', letterSpacing: -1.76, lineHeight: 44, fontVariant: ['tabular-nums'] },
  cardRight: { marginLeft: 'auto', gap: 3, alignItems: 'flex-end' },
  ruleLine: { fontSize: 13, fontWeight: '500' },
  count: { fontSize: 13, fontWeight: '400' },

  list: { flex: 1, marginHorizontal: 22 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 16, fontWeight: '500' },
  detailInput: { fontSize: 16, fontWeight: '600', marginLeft: 'auto', textAlign: 'right', flex: 1, padding: 0 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingTop: 18,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  frontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 14, fontWeight: '700' },
  frontName: { fontSize: 16, fontWeight: '600' },
  frontAmount: { fontSize: 17, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  explain: { fontSize: 13, fontWeight: '400', lineHeight: 20.15, paddingTop: 14, paddingHorizontal: 4 },

  actions: { marginTop: 14, marginHorizontal: 20, gap: 8 },
  destructive: { alignItems: 'center', paddingVertical: 15, borderRadius: 8, borderWidth: 2 },
  destructiveLabel: { fontSize: 16, fontWeight: '700' },
});
