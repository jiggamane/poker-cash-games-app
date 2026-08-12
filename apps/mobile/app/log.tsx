import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, money, resolveLedger, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import {
  buyIn,
  cashOut,
  chipsOnTable,
  defaultBuyIn,
  depthOf,
  rebuy,
  seatAndBuyIn,
  setFinalCount,
  useNight,
} from '../src/lib/nightStore';

type Kind = 'buyin' | 'rebuy' | 'cashout' | 'count';

/**
 * How much? — N5, N6 and N9.
 *
 * One screen for all three, because they are the same act: a big figure, a way
 * to type it, and one button that names what will happen. What changes is the
 * tag, the line under the name, and — on a cash out — that the figure is a
 * count of chips rather than money going in, so the screen can show what the
 * night came to before it is committed.
 *
 * The commit button always names the act: "Cash Petr out", never "Done". At 1am
 * a button that says Done gets pressed on the wrong screen.
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

  if (night === null || ledger === null) return <Screen title="Tonight" backTo="Tonight">{null}</Screen>;

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

  const valid =
    Number.isInteger(amount) && (counting ? amount >= 0 && !overTable : amount > 0);

  /* On a cash out the figure being typed IS the night's result, so show it —
     it is the number the room argues about, and finding it out after the fact
     is worse than seeing it as you count. */
  const nightSoFar = (amount + alreadyOut - inFor) as Money;

  const tag =
    kind === 'cashout'
      ? 'CASH OUT'
      : kind === 'count'
        ? 'COUNT'
        : kind === 'rebuy'
          ? 'REBUY'
          : 'BUY-IN · FIRST';

  const under =
    counting
      ? `in for ${formatMoney(inFor)} · ${depthOf(ledger, player!)}`
      : newPlayer !== undefined
        ? 'not seated yet · joins now'
        : `in for ${formatMoney(inFor)} · ${depthOf(ledger, player!)}`;

  const commitLabel =
    overTable
      ? `Only ${formatMoney(table)} is on the table`
      : kind === 'count'
        ? `Save ${name}’s count`
        : kind === 'cashout'
          ? amount === 0
            ? `${name} busted out`
            : `Cash ${name} out`
          : newPlayer !== undefined
            ? `Seat ${name} · log buy-in`
            : kind === 'rebuy'
              ? `Log ${name}’s rebuy`
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

  const stamped = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <Screen
      title={name}
      backTo={
        kind === 'count'
          ? 'Count up'
          : kind === 'cashout'
            ? 'Who’s cashing out?'
            : 'Who’s playing?'
      }
      action={{ label: 'Cancel', quiet: true, onPress: () => router.dismissTo('/session') }}
      trailing={
        <View style={[styles.tag, { backgroundColor: t.raised }]}>
          <Text style={[styles.tagText, { color: t.text }]}>{tag}</Text>
        </View>
      }
      lede={under}
      footer={
        <Button
          label={commitLabel}
          variant="primary"
          disabled={!valid || busy}
          onPress={commit}
        />
      }
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
        <View
          style={[
            styles.result,
            { backgroundColor: nightSoFar >= 0 ? t.winWash : t.lossWash },
          ]}
        >
          <Text style={[styles.resultLabel, { color: t.text }]}>{name}’s night</Text>
          <Text style={[styles.resultFigure, { color: moneyColor(t, nightSoFar) }]}>
            {formatSigned(nightSoFar)}
          </Text>
        </View>
      ) : (
        <View style={styles.presets}>
          <Preset
            label={formatMoney(suggested)}
            caption="DEFAULT"
            on={amount === suggested}
            onPress={() => setTyped(String(suggested))}
          />
          <Preset
            label={formatMoney(money(suggested * 2))}
            caption="X2"
            on={amount === suggested * 2}
            onPress={() => setTyped(String(suggested * 2))}
          />
          <Preset
            label="Custom"
            caption="SET"
            on={amount !== suggested && amount !== suggested * 2}
            onPress={() => setTyped('')}
          />
        </View>
      )}

      <View style={[styles.stamp, { borderColor: t.hairline }]}>
        <Icon name="clock" color={t.muted} />
        <Text style={[styles.stampText, { color: t.text }]}>Stamped {stamped}</Text>
      </View>

      <Keypad
        onDigits={(d) => setTyped((cur) => appendDigits(cur, d))}
        onBackspace={() => setTyped((cur) => cur.slice(0, -1))}
      />
    </Screen>
  );
}

/** $500 / $1,000 / Custom. Filled when chosen — 44px, per the button rules. */
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
    <View style={styles.presetSlot}>
      <Button
        label={label}
        variant="preset"
        selected={on}
        onPress={onPress}
        style={styles.preset}
      />
      <Text style={[styles.presetCaption, { color: on ? t.text : t.muted }]}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },

  amountRow: { alignItems: 'center', paddingTop: 14, paddingBottom: 16, gap: 8 },
  overTable: { fontSize: 13, fontWeight: '500', paddingHorizontal: 30, textAlign: 'center' },
  amount: { fontSize: 68, fontWeight: '800', letterSpacing: -3.4, fontVariant: ['tabular-nums'] },

  /*
   * Three equal slots across the content zone. The button's own 24 of side
   * padding is dropped here: kept, it leaves a 115 wide chip only 67 for its
   * label, which is under what "Custom" needs — the word was being clipped
   * mid-letter. The label is centred by the button, so the padding was doing
   * nothing but taking the room away. minWidth 0 stops a long label widening
   * the slot instead of sitting inside it.
   */
  presets: { flexDirection: 'row', gap: 8, paddingHorizontal: space.card, paddingBottom: 16 },
  presetSlot: { flex: 1, minWidth: 0, alignItems: 'center', gap: 3 },
  preset: { width: '100%', height: control.presetHeight, paddingHorizontal: 0 },
  presetCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 0.72 },

  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
  },
  resultLabel: { fontSize: 15, fontWeight: '600' },
  resultFigure: { fontSize: 20, fontWeight: '800', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.card,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stampText: { fontSize: 16, fontWeight: '500' },
});
