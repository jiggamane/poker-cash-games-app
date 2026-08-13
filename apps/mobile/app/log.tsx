import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, money, resolveLedger, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { HeaderPill } from '../src/components/PushHeader';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import {
  buyIn,
  cashOut,
  chipsOnTable,
  defaultBuyIn,
  depthOf,
  rebuy,
  seatAndBuyIn,
  setFinalCount,
  standingOf,
  useNight,
} from '../src/lib/nightStore';

type Kind = 'buyin' | 'rebuy' | 'cashout' | 'count';

/**
 * How much? — N5, N6 and N9.
 *
 * One screen for all three, because they are the same act: a big figure, a way
 * to type it, and one button that names what will happen. What changes is the
 * pill, the line under the name, and — on a cash out — that the figure is a
 * count of chips rather than money going in, so the presets give way to what
 * the night came to before it is committed.
 *
 * The commit button always names the act: "Cash Petr out", never "Done". At 1am
 * a button that says Done gets pressed on the wrong screen.
 *
 * A sheet, and the second level of one: it opens over the player sheet or the
 * picker, which is as deep as this app goes.
 */
export default function Log() {
  const t = useTheme();
  const { player, newPlayer, kind = 'buyin' } = useLocalSearchParams<{
    player?: string;
    newPlayer?: string;
    kind?: Kind;
  }>();

  const night = useNight();
  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  const name = newPlayer ?? night?.players.find((p) => p.id === player)?.name ?? '';
  const suggested = ledger === null ? money(500) : defaultBuyIn(ledger);

  const counting = kind === 'cashout' || kind === 'count';
  const [typed, setTyped] = useState<string>(counting ? '0' : String(suggested));
  const [busy, setBusy] = useState(false);

  if (night === null || ledger === null) return <Sheet title="Tonight">{null}</Sheet>;

  const amount = typed === '' ? 0 : Number(typed);

  const inFor = ((player && ledger.boughtInByPlayer.get(player)) ?? 0) as Money;
  const alreadyOut = ((player && ledger.cashedOutByPlayer.get(player)) ?? 0) as Money;

  /*
   * ZERO IS A REAL ANSWER when counting chips, and it is the most common one:
   * a player who loses their stack cashes out for nothing. Refusing it — as
   * "amount must be positive" does — leaves them seated at a table they have
   * walked away from, and the close flow then waits forever for a count of
   * chips that do not exist.
   *
   * A buy-in of zero is not a real answer, so the two part company here.
   */
  const table = chipsOnTable(ledger);
  const overTable = counting && kind === 'cashout' && amount > table;

  const valid = Number.isInteger(amount) && (counting ? amount >= 0 && !overTable : amount > 0);

  /* On a cash out the figure being typed IS the night's result, so show it —
     it is the number the room argues about, and finding it out after the fact
     is worse than seeing it as you count. */
  const nightSoFar = (amount + alreadyOut - inFor) as Money;

  const rebuys = player === undefined ? 0 : (standingOf(night, ledger, player)?.rebuys ?? 0);

  const pill =
    kind === 'cashout'
      ? 'CASH OUT'
      : kind === 'count'
        ? 'COUNT'
        : kind === 'rebuy'
          ? `REBUY · ${ordinal(rebuys + 1)}`
          : 'BUY-IN · FIRST';

  const stamped = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const meta = counting
    ? `in for ${formatMoney(inFor)} · ${depthOf(ledger, player!)}`
    : kind === 'rebuy'
      ? `already in for ${formatMoney(inFor)}`
      : `not seated yet · joins at ${stamped}`;

  const commitLabel = overTable
    ? `Only ${formatMoney(table)} is on the table`
    : kind === 'count'
      ? `Save ${name}’s count`
      : kind === 'cashout'
        ? amount === 0
          ? `${name} busted out`
          : `Cash ${name} out`
        : kind === 'rebuy'
          ? 'Log the rebuy'
          : newPlayer !== undefined
            ? `Seat ${name} · log buy-in`
            : `Log ${name}’s buy-in`;

  async function commit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const value = money(amount);
      if (kind === 'count') await setFinalCount(player!, value);
      else if (kind === 'cashout') await cashOut(player!, value);
      else if (kind === 'rebuy') await rebuy(player!, value);
      else if (newPlayer !== undefined) await seatAndBuyIn(newPlayer, value);
      else await buyIn(player!, value);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  /* N6 offers ×4 as well; N5 does not. The first chip's caption names where the
     amount came from, which is the only difference between the two rows. */
  const presets: Array<{ label: string; caption: string; value?: Money }> =
    kind === 'rebuy'
      ? [
          { label: formatMoney(suggested), caption: 'STANDARD', value: suggested },
          { label: formatMoney(money(suggested * 2)), caption: 'X2', value: money(suggested * 2) },
          { label: formatMoney(money(suggested * 4)), caption: '×4', value: money(suggested * 4) },
          { label: 'Custom', caption: 'SET' },
        ]
      : [
          { label: formatMoney(suggested), caption: 'DEFAULT', value: suggested },
          { label: formatMoney(money(suggested * 2)), caption: 'X2', value: money(suggested * 2) },
          { label: 'Custom', caption: 'SET' },
        ];

  const onAPreset = presets.some((p) => p.value !== undefined && p.value === amount);

  return (
    <Sheet title={name} badge={<HeaderPill label={pill} />} meta={meta}>
      {/*
        The board draws this into a whole 402 × 874; a sheet starts 104 points
        down and a small phone is 200 shorter again, so the block from the
        figure to the keypad scrolls when it has to. `flexGrow: 1` means that on
        a phone with the room, nothing moves: the slack falls between the keypad
        and the button, exactly where the board's `margin-top: auto` puts it.
      */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: overTable ? t.loss : valid ? t.text : t.muted }]}>
            {formatMoney(money(amount))}
          </Text>
          {overTable && (
            <Text style={[styles.overTable, { color: t.loss }]}>
              More chips than the table holds. Somebody’s buy-in is missing.
            </Text>
          )}
        </View>

        {counting ? (
          <View style={[styles.result, { backgroundColor: nightSoFar >= 0 ? t.winWash : t.lossWash }]}>
            <Text style={[styles.resultLabel, { color: t.text }]}>{name}’s night</Text>
            <Text style={[styles.resultFigure, { color: moneyColor(t, nightSoFar) }]}>
              {formatSigned(nightSoFar)}
            </Text>
          </View>
        ) : (
          <View style={styles.presets}>
            {presets.map((p) => (
              <Preset
                key={p.caption}
                label={p.label}
                caption={p.caption}
                on={p.value === undefined ? !onAPreset : p.value === amount}
                onPress={() => setTyped(p.value === undefined ? '' : String(p.value))}
              />
            ))}
          </View>
        )}

        {/* Drawn with a Change, and drawn is how it ships. Back-dating an entry
            is not built yet — `occurredAt` is stamped by the write — so the
            control is here without a destination until it is. */}
        <View style={[styles.stamp, { borderColor: t.hairline }]}>
          <Icon name="clock" color={t.muted} />
          <Text style={[styles.stampText, { color: t.text }]}>Stamped {stamped}</Text>
          <Text style={[styles.change, { color: t.text }]}>Change</Text>
        </View>

        <Keypad
          onDigits={(d) => setTyped((cur) => appendDigits(cur, d))}
          onBackspace={() => setTyped((cur) => cur.slice(0, -1))}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button label={commitLabel} variant="primary" disabled={!valid || busy} onPress={commit} />
      </View>
    </Sheet>
  );
}

/**
 * $500 / $1,000 / Custom.
 *
 * The caption lives INSIDE the chip, not under it — one block, 11 of padding
 * top and bottom, and the whole thing swaps to a fill when it is chosen. There
 * is no selected border anywhere in this set; selection is always a fill swap.
 */
function Preset({
  label,
  caption,
  on,
  onPress,
}: {
  label: string;
  caption: string;
  on: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.preset,
        { backgroundColor: on ? t.text : t.surface, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.presetValue, { color: on ? t.onFill : t.text }]}>{label}</Text>
      <Text
        style={[
          styles.presetCaption,
          { color: on ? (t.name === 'dark' ? 'rgba(12,13,15,0.6)' : 'rgba(255,255,255,0.6)') : t.muted },
        ]}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

/** 1ST, 2ND, 3RD — the pill says which rebuy this is. */
const ordinal = (n: number): string => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}TH`;
  return `${n}${['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH'}`;
};

const styles = StyleSheet.create({
  /* 14 of the padding is drawn on the figure; the 8 is the bottom margin the
     sub-line carried before the sheet chrome took the line over. */
  amountRow: { alignItems: 'center', marginTop: 8, paddingTop: 14, paddingBottom: 16, gap: 8 },
  amount: { fontSize: 68, fontWeight: '800', letterSpacing: -3.4, lineHeight: 68, fontVariant: ['tabular-nums'] },
  overTable: { fontSize: 13, fontWeight: '500', paddingHorizontal: 30, textAlign: 'center' },

  presets: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  preset: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 11, borderRadius: 8 },
  presetValue: { fontSize: 16, fontWeight: '700' },
  presetCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 0.72 },

  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resultLabel: { fontSize: 15, fontWeight: '600' },
  resultFigure: { fontSize: 20, fontWeight: '800', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  stampText: { fontSize: 16, fontWeight: '500' },
  change: { fontSize: 15, fontWeight: '700', marginLeft: 'auto' },

  scroll: { flex: 1 },
  scrollBody: { flexGrow: 1 },
  footer: { paddingTop: 14, paddingHorizontal: 20 },
});
