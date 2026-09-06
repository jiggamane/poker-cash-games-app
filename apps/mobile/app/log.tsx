import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { money, resolveLedger, type Money } from '@poker-club/core';
import { formatMoney, formatSigned, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad } from '../src/components/Keypad';
import { PRESET_FITS, Preset } from '../src/components/Preset';
import { Sheet } from '../src/components/Sheet';
import { announceRebuy } from '../src/components/rebuyAnnouncement';
import { amountOf, typedFigureSize, useTypedAmount } from '../src/components/typedAmount';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, radius, space, type } from '../src/design/tokens';
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
  const { player, newPlayer, kind = 'buyin', amount: prefill, from } = useLocalSearchParams<{
    player?: string;
    newPlayer?: string;
    kind?: Kind;
    /** What the caller has already resolved — the player card's rebuy figure. */
    amount?: string;
    /** 'pick' when the picker was opened only to reach this screen. */
    from?: string;
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
  /*
   * Whether the figure on screen was TYPED or merely SUGGESTED lives in
   * `src/components/typedAmount.ts` — it is the keypad's own rule and it now
   * reaches every screen that has one. It used to be these two lines and
   * nothing else in the app had them, which is B20.
   */
  const field = useTypedAmount(counting ? 0 : suggested);
  const [busy, setBusy] = useState(false);

  if (night === null || ledger === null) return <Sheet title="Tonight">{null}</Sheet>;

  const amount = amountOf(field.typed);

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

  /*
   * A REBUY TYPED HERE IS THE SAME REBUY AS ONE TAPPED ON THE CARD, and it
   * ends the same way: written, announced on Tonight, and the host handed
   * straight back to the table. B44.
   *
   * It did not. `Rebuy $500` on the player card writes the entry and then the
   * table says what happened — `+$500` beside *On the table*, `+$500` on the
   * row, a bar above the dock holding Undo for two seconds
   * (`RebuyConfirmation.tsx`). *Other amount* on the same card comes HERE,
   * and this screen wrote the entry and popped one sheet — back onto the
   * player card, with nothing on it saying the money had gone in, and the
   * confirmation running on the screen underneath where nobody could see it.
   * The dock's route in was no better: through the picker it landed on
   * Tonight, but with nothing announced, so the figure changed and nothing
   * said so. Two ways to add the same $500 to the same player, one confirmed
   * and one silent — and the silent one is the one used for every amount that
   * is not the standard, which is the one worth confirming.
   *
   * So a rebuy from here does exactly what `quickRebuy` in `player.tsx` does,
   * in the same order and for the same reasons: the write is awaited, then the
   * announcement is made off the id it returned, then the sheets go. The
   * ORDER is the whole of "the entry is written on the tap, not on the
   * animation" — kill the app as the sheet slides and the rebuy is in the
   * ledger. The id is what Undo voids, so it is taken from the write rather
   * than guessed at afterwards.
   *
   * AND IT GOES TO TONIGHT, whichever way it was reached. The confirmation is
   * drawn on Tonight and nowhere else — that is the handoff's decision, the
   * money is there — so a route that stopped on the player card would leave
   * the host looking at a sheet while the bar ran out behind it. The card is
   * one tap away if they want it, and `FreshEntryWash` marks the row that just
   * landed when they take that tap inside the two seconds.
   *
   * `name` and `player` are read before the await, as `quickRebuy` reads its
   * own: an announcement made after a hop must not name a lookup into a store
   * that has moved on.
   */
  async function commit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const value = money(amount);
      if (kind === 'rebuy') {
        const playerId = player!;
        const playerName = name;
        const entryId = await rebuy(playerId, value);
        announceRebuy({ playerId, name: playerName, amount: value, entryId });
        router.dismissTo('/session');
        return;
      }
      if (kind === 'count') await setFinalCount(player!, value);
      else if (kind === 'cashout') await cashOut(player!, value);
      else if (newPlayer !== undefined) await seatAndBuyIn(newPlayer, value);
      else await buyIn(player!, value);
      // The entry is made, so everything opened to make it goes away. Counting
      // is the exception: `count-up` and `settle-up` push this sheet from a
      // screen the host is working DOWN, and each saved stack returns them to
      // the list with one more filled in.
      if (from === 'pick') router.dismissTo('/session');
      else router.back();
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
        {/* The board's 68, stepped down once the figure is longer than the
            board ever drew, and capped against the reader's text setting.
            `typedAmount.ts` and B20. */}
        <Text
          {...cappedFigure}
          style={[
            styles.amount,
            typedFigureSize(formatMoney(money(amount)), 68),
            { color: overTable ? t.loss : valid ? t.text : t.muted },
          ]}
        >
          {formatMoney(money(amount))}
        </Text>
        {overTable && (
          <Text style={[styles.overTable, { color: t.loss }]}>
            More chips than the table holds. Somebody’s buy-in is missing.
          </Text>
        )}
      </View>

      {counting ? (
        /* The block is the card fill in both directions. It was the win or the
           loss wash, and the figure beside the label is already signed and
           already coloured — see NightResult, which is where E6 states the
           rule: the green and the red sit only on the figures. */
        <View style={[styles.result, { backgroundColor: t.surface }]}>
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
            label={formatToFit(standard, PRESET_FITS)}
            caption={kind === 'rebuy' ? 'STANDARD' : 'DEFAULT'}
            on={amount === standard}
            onPress={() => field.offer(standard)}
          />
          <Preset
            label={formatToFit(second, PRESET_FITS)}
            caption={ownLast === null ? 'X2' : 'LAST'}
            on={amount === second}
            onPress={() => field.offer(second)}
          />
          <Preset
            label="Custom"
            caption="SET"
            on={amount !== standard && amount !== second}
            onPress={() => field.offer(null)}
          />
        </View>
      )}

      <View style={[styles.stamp, { borderColor: t.hairline }]}>
        <Icon name="clock" color={t.muted} />
        <Text style={[styles.stampText, { color: t.text }]}>Stamped {stamped}</Text>
      </View>

      <Keypad {...field.keys} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },

  amountRow: { alignItems: 'center', paddingTop: 14, paddingBottom: 16, gap: 8 },
  overTable: { fontSize: 13, fontWeight: '500', paddingHorizontal: 30, textAlign: 'center' },
  amount: { fontSize: 68, fontWeight: '800', letterSpacing: -3.4, fontVariant: ['tabular-nums'] },

  // The board: `display:flex; gap:8px; padding:0 20px 16px`. The chip itself is
  // `src/components/Preset.tsx`, which is where its own geometry lives.
  presets: { flexDirection: 'row', gap: 8, paddingHorizontal: space.card, paddingBottom: 16 },

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
