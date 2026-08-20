import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, money, resolveLedger, type Money } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import {
  buyIn,
  cashOut,
  chipsOnTable,
  defaultBuyIn,
  depthOf,
  rebuy,
  rebuyPrefill,
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
  const { player, newPlayer, kind = 'buyin', amount: prefill } = useLocalSearchParams<{
    player?: string;
    newPlayer?: string;
    kind?: Kind;
    /** What the caller has already resolved — the player card's rebuy figure. */
    amount?: string;
  }>();

  const night = useNight();
  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  const name = newPlayer ?? night?.players.find((p) => p.id === player)?.name ?? '';

  /*
   * WHAT THE KEYPAD OPENS WITH. M16, and it is per player, never table-wide:
   * their last rebuy tonight → tonight's standard buy-in → the group default.
   *
   * Only the player card was applying it. Arriving the other way — the dock's
   * Rebuy, then picking a name — resolved nothing per-player and offered the
   * table's standard buy-in instead, which on a night where somebody has been
   * rebuying $1,000 a time is the wrong number on the most repeated action of
   * the evening. Resolved here rather than by each caller, so every route in
   * gets the same answer.
   */
  const resolved =
    ledger === null
      ? { amount: money(500), from: 'standard buy-in' as const }
      : kind === 'rebuy' && player !== undefined
        ? rebuyPrefill(ledger, player)
        : { amount: defaultBuyIn(ledger), from: 'standard buy-in' as const };

  const suggested =
    prefill !== undefined && Number.isInteger(Number(prefill))
      ? money(Number(prefill))
      : resolved.amount;

  const counting = kind === 'cashout' || kind === 'count';
  const [typed, setTyped] = useState<string>(counting ? '0' : String(suggested));
  /*
   * Whether the figure on screen was TYPED or merely SUGGESTED.
   *
   * A prefilled amount is an offer, not text the host entered, and the keypad
   * has to treat the two differently: typing 7 against a suggested $1,000 means
   * seventy-five, not ten thousand and seventy-five. So the first key pressed
   * clears the suggestion — a digit replaces it, delete wipes it — and every
   * key after that appends as normal. Tapping a preset makes it a suggestion
   * again, because that is exactly what it is.
   */
  const [touched, setTouched] = useState(false);
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

  const valid =
    Number.isInteger(amount) && (counting ? amount >= 0 && !overTable : amount > 0);

  /* On a cash out the figure being typed IS the night's result, so show it —
     it is the number the room argues about, and finding it out after the fact
     is worse than seeing it as you count. */
  const nightSoFar = (amount + alreadyOut - inFor) as Money;

  /*
   * WHAT THE ROW OFFERS, read off the ledger rather than off the keypad.
   *
   * Two figures a host actually reaches for on a rebuy: what this table buys
   * in for, and what this player put in last time. The row used to be the
   * opening figure and double it, which meant both chips were derived from the
   * same suggestion — they moved together, and on the route in that carries a
   * prefilled amount they froze at whatever the ledger said when the sheet was
   * pushed, while the night went on underneath.
   *
   * So: the standard is tonight's most common first buy-in, and the second
   * chip is this player's own last rebuy — M16's figure, per player, read live
   * so it follows them down the night. Until they have rebought, and when
   * their last rebuy IS the standard and the chip would say nothing the first
   * one has not already said, it falls back to double: N6's drawn row.
   */
  const standard = defaultBuyIn(ledger);
  const lastRebuy =
    kind === 'rebuy' && player !== undefined ? rebuyPrefill(ledger, player) : null;
  const ownLast =
    lastRebuy !== null && lastRebuy.from === 'last rebuy' && lastRebuy.amount !== standard
      ? lastRebuy.amount
      : null;
  const second = ownLast ?? money(standard * 2);

  /** Put a suggested figure up, ready to be replaced whole by the next digit. */
  function choose(value: Money | null) {
    setTyped(value === null ? '' : String(value));
    setTouched(false);
  }

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
    <Sheet
      title={name}
      badge={tag}
      sub={under}
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
          {/*
            LAST rather than STANDARD when the figure is this player's own last
            rebuy — M17. The interface never explains where an amount came
            from; this one word is the whole of what it is allowed to say.
          */}
          <Preset
            label={formatMoney(standard)}
            caption={kind === 'rebuy' ? 'STANDARD' : 'DEFAULT'}
            on={amount === standard}
            onPress={() => choose(standard)}
          />
          <Preset
            label={formatMoney(second)}
            caption={ownLast === null ? 'X2' : 'LAST'}
            on={amount === second}
            onPress={() => choose(second)}
          />
          <Preset
            label="Custom"
            caption="SET"
            on={amount !== standard && amount !== second}
            onPress={() => choose(null)}
          />
        </View>
      )}

      <View style={[styles.stamp, { borderColor: t.hairline }]}>
        <Icon name="clock" color={t.muted} />
        <Text style={[styles.stampText, { color: t.text }]}>Stamped {stamped}</Text>
      </View>

      <Keypad
        onDigits={(d) => {
          setTyped((cur) => appendDigits(touched ? cur : '', d));
          setTouched(true);
        }}
        onBackspace={() => {
          setTyped((cur) => (touched ? cur.slice(0, -1) : ''));
          setTouched(true);
        }}
      />
    </Sheet>
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

  presets: { flexDirection: 'row', gap: 8, paddingHorizontal: space.card, paddingBottom: 16 },
  presetSlot: { flex: 1, alignItems: 'center', gap: 3 },
  preset: { width: '100%', height: 44 },
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
