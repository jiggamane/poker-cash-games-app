import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import {
  chargeCeiling,
  manualChargeOf,
  money,
  resolveLedger,
  ruleTotal,
  settle,
  type Money,
  type MoneyRule,
  type PlayerId,
  type SettlementResult,
} from '@poker-club/core';
import { formatMoney, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad } from '../src/components/Keypad';
import { PRESET_FITS } from '../src/components/Preset';
import { Sheet } from '../src/components/Sheet';
import { amountOf, typedFigureSize, useTypedAmount } from '../src/components/typedAmount';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { L, z } from '../src/design/scale';
import { cappedFigure } from '../src/design/tokens';
import { nameOf, setManualCharge, settlementInput, useNight } from '../src/lib/nightStore';
import { timingOf } from '../src/lib/seatClock';
import { useIsAdmin } from '../src/lib/whoIsReading';

/**
 * One person's share of one rule, set by hand — the end of the night.
 *
 * THE COUNT IS THE COUNT; A SHARE IS A DECISION. Nothing on this screen can
 * move a chip count or a result: those came off the table and are not open to
 * negotiation. What it moves is what somebody CARRIES of the bill or puts into
 * the piggy bank, and that is settled out loud in the room — "Petr only got
 * here at eleven, put him down for fifty" — by rules nobody could write down in
 * advance. E3 already promises it in so many words: *"Tap any figure above to
 * change it."*
 *
 * THE REMAINDER IS THE WHOLE DESIGN PROBLEM, and it is answered by the engine
 * rather than here: a rule with a total to cover — a bill IS its expenses —
 * takes the typed figure off the top and re-divides what is left between the
 * people who have NOT been set by hand, by the rule's own split. So the bar is
 * still owed exactly what the bar is owed, somebody who was already agreed with
 * is not silently restated, and a share typed against one name never goes
 * missing.
 *
 * Three things make that safe to hand to a host at 1am:
 *
 *   IT SAYS WHAT ELSE MOVES. Every other payer's new figure is listed, live,
 *   with the change beside it, before the Save is pressed. Re-settling the
 *   whole night through `settle()` is what produces those figures — never a
 *   sum computed on this screen.
 *
 *   IT CANNOT BE OVERFILLED. A share is capped at what is actually left to
 *   give, which is the same bound `settle()` enforces. Without it a host could
 *   type $500 against a $170 bill, walk back, and meet a night that refuses to
 *   settle with nothing naming the figure that broke it.
 *
 *   IT IS REVERSIBLE. "Put them back on the split" is always there, and it
 *   removes the override rather than typing the old number back in.
 *
 * ⚠ COPY NOT DRAWN. `13-after-the-night.md` promises the tap and draws no sheet
 * behind it, so every string below is written to the E-series' grammar and
 * flagged here rather than passed off as decided copy.
 */
export default function Share() {
  const t = useTheme();
  const night = useNight();
  const admin = useIsAdmin();
  const { rule: ruleId, player } = useLocalSearchParams<{ rule?: string; player?: string }>();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  /** The night as it stands, and the night as it would stand. Both from the engine. */
  const now = useMemo(() => safeSettle(night === null ? null : settlementInput(night)), [night]);

  const rule = night?.rules.find((r) => r.id === ruleId);
  /*
   * Nothing typed yet, because what they are on is not known until the engine
   * has settled the night below. `amountOf` takes that as the fallback, so an
   * untouched field shows the live figure rather than one frozen at mount.
   */
  const field = useTypedAmount();
  const [busy, setBusy] = useState(false);

  if (night === null || ledger === null || rule === undefined || player === undefined) {
    return <Sheet title="Share">{null}</Sheet>;
  }

  const name = nameOf(night, player);
  const set = manualChargeOf(rule, player);
  /*
   * WHAT THE RULE WOULD GIVE THEM, which is not what they are on: once a figure
   * has been set by hand, "the split's figure" is the one they would go back to
   * if it were withdrawn, and that is the number the preset has to offer. It is
   * the night settled with this one override removed — off the engine, because
   * re-deriving a share on a screen is exactly what `CLAUDE.md` forbids.
   */
  const withoutMine = safeSettle({
    ...settlementInput(night),
    rules: night.rules.map((r) => (r.id === rule.id ? withoutManual(r, player) : r)),
  });
  const onTheSplit = chargeIn(withoutMine, rule.id, player);
  /* What is in the field: what the host has typed, else what they are on. */
  const amount = amountOf(field.typed, set ?? onTheSplit);

  /* A room charged by the hour has a total, and the total is the hours: asking
     for it without them would offer no ceiling on a rule that has one. */
  const tableMinutes = timingOf(night).tableMinutes;
  const total = ruleTotal(rule, ledger, tableMinutes);
  const ceiling = chargeCeiling(rule, ledger, player, tableMinutes);
  const over = ceiling !== null && amount > ceiling;
  const valid = Number.isInteger(amount) && amount >= 0 && !over;

  /*
   * THE PREVIEW. The same night, settled again with this one figure changed —
   * so the list below is the engine's answer and not a promise this screen has
   * made about what the engine will do.
   */
  const would = safeSettle(
    valid
      ? {
          ...settlementInput(night),
          rules: night.rules.map((r) =>
            r.id !== rule.id
              ? r
              : withManual(r, player, money(amount)),
          ),
        }
      : null,
  );

  /** Everybody else this rule touches, and what it would do to them. */
  const others = (would ?? now)?.players
    .filter((p) => p.playerId !== player)
    .map((p) => ({
      id: p.playerId,
      name: p.name,
      before: chargeIn(now, rule.id, p.playerId),
      /* A half-typed figure the engine will not settle leaves the list where
         it was rather than dropping every figure in it to nothing. */
      after: chargeIn(would ?? now, rule.id, p.playerId),
      byHand: manualChargeOf(rule, p.playerId) !== undefined,
    }))
    .filter((p) => p.before > 0 || p.after > 0)
    .sort((a, b) => b.after - a.after || (a.name < b.name ? -1 : 1)) ?? [];

  const moved = others.filter((p) => p.after !== p.before);

  async function commit(value: Money | null) {
    if (busy) return;
    setBusy(true);
    try {
      await setManualCharge(rule!.id, player!, value);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  /*
   * THE FULL BOARD (`share`, `share-typed`, `share-set`, `share-viewer`,
   * approved; `share-set` redrawn 24 November at the owner's word). The
   * figure, the plain block saying what the others become, the presets, the
   * pad, and the save as the bar. Put them back on the split, the outlined
   * button under the save, is a lifted row in the content above the presets
   * with what it would come to; a reader who cannot change it gets no pad and
   * no bar, and Close as the outlined button.
   */

  /* A power the reader does not have is removed, not disabled. */
  if (!admin) {
    return (
      <Sheet title={name} badge={tagOf(rule)} sub={`${rule.name} · ${formatMoney(money(onTheSplit))}`}>
        <View style={styles.body}>
          <Text style={[styles.note, { color: t.muted }]}>
            {set === undefined
              ? 'This is what the rule gives them. Only the person who runs the group can change it.'
              : 'The host set this figure by hand. Only they can change it.'}
          </Text>
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      title={name}
      badge={tagOf(rule)}
      sub={
        set === undefined
          ? `${rule.name} · ${formatMoney(money(onTheSplit))} on the split`
          : `${rule.name} · set by hand`
      }
      bar={[
        {
          label: over
            ? `Only ${formatMoney(ceiling!)} is left to give`
            : amount === set
              ? 'Saved'
              : `${name} carries ${formatMoney(money(valid ? amount : 0))}`,
          disabled: !valid || busy || amount === set,
          onPress: () => void commit(money(amount)),
        },
      ]}
    >
      <View style={styles.body}>
        <View style={styles.amountRow}>
          <Text
            {...cappedFigure}
            style={[
              styles.amount,
              typedFigureSize(formatMoney(money(Number.isFinite(amount) ? amount : 0)), z(38)),
              { color: over ? t.loss : valid ? t.text : t.muted },
            ]}
          >
            {formatMoney(money(Number.isFinite(amount) ? amount : 0))}
          </Text>
          <Text style={[styles.of, { color: t.muted }]}>
            {total === null
              ? `of ${rule.name.toLowerCase()} · nothing caps a percentage`
              : `of ${formatMoney(total)} to cover`}
          </Text>
        </View>

        {/* WHAT ELSE MOVES. The reason this sheet is safe to use, and the first
            thing a host will look for after typing a figure. Set straight on
            the sheet rather than in a card, so the pad still fits under it. */}
        <View style={styles.blockPlain}>
          <Text style={[styles.blockTitle, { color: t.text }]}>
            {total === null
              ? 'Nobody else moves'
              : moved.length === 0
                ? 'Nobody else moves'
                : 'What the others become'}
          </Text>

          {total === null ? (
            <Text style={[styles.blockBody, { color: t.muted }]}>
              {rule.name} takes a share of each win on its own, so there is no total to make up.
              Changing this figure changes what {rule.destination === 'kitty' ? 'the piggy bank' : 'the rule'} collects and nothing else.
            </Text>
          ) : (
            <>
              <Text style={[styles.blockBody, { color: t.muted }]}>
                The rest is shared out again by the rule — but only between the people whose share has
                not been set by hand. Anyone already set stays exactly where they were.
              </Text>

              <View style={styles.others}>
                {others.map((p, i) => (
                  <View
                    key={p.id}
                    style={[
                      styles.otherRow,
                      i < others.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.hairline },
                    ]}
                  >
                    <Text style={[styles.otherName, { color: p.byHand ? t.muted : t.text }]} numberOfLines={1}>
                      {p.name}
                      {p.byHand ? ' · by hand' : ''}
                    </Text>
                    <Text style={[styles.otherWas, { color: t.muted }]}>
                      {p.after === p.before ? 'unchanged' : formatMoney(money(p.before))}
                    </Text>
                    <Text
                      style={[
                        styles.otherNow,
                        { color: p.after === p.before ? t.muted : moneyColor(t, (p.before - p.after) as Money) },
                      ]}
                    >
                      {formatMoney(money(p.after))}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* The way back onto the split: a lifted row, with what it would come
            to, above the presets (`share-set`). It removes the override rather
            than typing the old number back in. */}
        {set !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Put ${name} back on the split`}
            disabled={busy}
            onPress={() => void commit(null)}
            style={({ pressed }) => [
              styles.back,
              { backgroundColor: t.surface, boxShadow: t.lift, opacity: busy ? 0.4 : pressed ? 0.6 : 1 },
            ]}
          >
            <Icon name="restart" color={t.muted} size={z(17)} />
            <Text style={[styles.backLabel, { color: t.text }]} numberOfLines={1}>
              Put {name} back on the split
            </Text>
            <Text style={[styles.backFigure, { color: t.muted }]}>{formatMoney(money(onTheSplit))}</Text>
          </Pressable>
        )}

        {/* THE PRESETS ARE THE BOARD'S, NOT `Preset.tsx`'s (owner, 24
            November: "lifted like the chips, the chosen one ink"). The shared
            preset is still outlined and 52 tall; until it moves, this sheet
            draws the lifted one locally — `SharePreset` below. B14 is why they
            were one component, and why the two should be again. */}
        <View style={styles.presets}>
          <SharePreset
            label={formatToFit(money(onTheSplit), PRESET_FITS)}
            caption="BY THE RULE"
            on={amount === onTheSplit && onTheSplit !== 0}
            onPress={() => field.offer(onTheSplit)}
          />
          <SharePreset
            label={formatMoney(money(0))}
            caption="NOTHING"
            on={amount === 0}
            onPress={() => field.offer(0)}
          />
          <SharePreset
            label="Custom"
            caption="SET"
            on={amount !== onTheSplit && amount !== 0}
            onPress={() => field.offer(null)}
          />
        </View>

        <View style={styles.pad}>
          <Keypad {...field.keys} />
        </View>
      </View>
    </Sheet>
  );
}

/**
 * The full board's preset (the kit's `presets()` in `50-the-bill.mjs`): the
 * figure over its caption, lifted like a chip, the chosen one filled with ink.
 * 48 tall, 12 corners. Everything else is `Preset.tsx`'s, including the
 * capped figure and the accessibility it reads out.
 */
function SharePreset({
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
      accessibilityLabel={`${label} · ${caption}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.preset,
        on ? { backgroundColor: t.text } : { backgroundColor: t.surface, boxShadow: t.lift },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text {...cappedFigure} numberOfLines={1} style={[styles.presetValue, { color: on ? t.onFill : t.text }]}>
        {label}
      </Text>
      <Text numberOfLines={1} style={[styles.presetCaption, { color: on ? t.onFill : t.text }]}>
        {caption}
      </Text>
    </Pressable>
  );
}

/** The rule as a tag: BILL, PIGGY BANK, or the rule's own name in caps. */
const tagOf = (rule: MoneyRule): string =>
  rule.destination === 'bill'
    ? 'BILL'
    : rule.destination === 'kitty'
      ? 'PIGGY BANK'
      : rule.name.toUpperCase();

/** One person's charge under one rule, off the engine. Zero if it does not touch them. */
const chargeIn = (r: SettlementResult | null, ruleId: string, playerId: PlayerId): number =>
  r?.deductions.find((d) => d.ruleId === ruleId)?.charges.find((c) => c.playerId === playerId)
    ?.amount ?? 0;

/** The same rule, with one name back on the split. */
function withoutManual(rule: MoneyRule, playerId: PlayerId): MoneyRule {
  const rest = (rule.manualCharges ?? []).filter((m) => m.playerId !== playerId);
  const { manualCharges: _cleared, ...bare } = rule;
  return rest.length === 0 ? bare : { ...bare, manualCharges: rest };
}

/** The same rule, with one name set by hand. */
const withManual = (rule: MoneyRule, playerId: PlayerId, amount: Money): MoneyRule => ({
  ...rule,
  manualCharges: [
    ...(rule.manualCharges ?? []).filter((m) => m.playerId !== playerId),
    { playerId, amount },
  ],
});

/**
 * A night that will not settle has no preview to show.
 *
 * A half-typed figure is briefly over the ceiling on the way to a valid one, and
 * the engine is entitled to refuse it. Falling back to nothing keeps the sheet
 * on screen; throwing would take the whole flow down mid-keystroke.
 */
function safeSettle(input: Parameters<typeof settle>[0] | null): SettlementResult | null {
  if (input === null) return null;
  try {
    return settle(input);
  } catch {
    return null;
  }
}

/* The kit at this phone's scale (`design/scale.ts`). */
const styles = StyleSheet.create({
  body: { paddingHorizontal: z(20), paddingTop: z(2), gap: z(12) },

  /* The board's `typed()`: the figure, 6 under it the line saying what it is of. */
  amountRow: { alignItems: 'center', gap: z(6) },
  amount: { fontFamily: 'head', fontSize: z(38), fontWeight: '700', letterSpacing: z(-1.14), fontVariant: ['tabular-nums'] },
  of: { fontSize: z(12.5), fontWeight: '400', minHeight: z(17), textAlign: 'center' },

  note: { fontSize: z(13), lineHeight: z(18.85) },

  /* The board's `block(…, { plain: true })`: no card, 2 in from the edge. */
  blockPlain: { marginHorizontal: z(2) },
  blockTitle: { fontFamily: 'head', fontSize: z(15), fontWeight: '700', lineHeight: z(18), marginBottom: z(3) },
  blockBody: { fontSize: z(12.5), lineHeight: z(17.5) },
  others: { marginTop: z(4) },

  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(10),
    paddingVertical: z(6),
  },
  otherName: { fontSize: z(14), fontWeight: '600', flex: 1, minWidth: 0 },
  otherWas: { fontSize: z(12.5), fontWeight: '400', fontVariant: ['tabular-nums'] },
  otherNow: { fontFamily: 'head', fontSize: z(15), fontWeight: '700', minWidth: z(56), textAlign: 'right', fontVariant: ['tabular-nums'] },

  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(10),
    minHeight: z(48),
    paddingHorizontal: z(14),
    borderRadius: L.fieldRadius,
  },
  backLabel: { flex: 1, fontSize: z(14.5), fontWeight: '600' },
  backFigure: { fontSize: z(13), fontWeight: '400', fontVariant: ['tabular-nums'] },

  presets: { flexDirection: 'row', gap: z(8) },
  preset: {
    flex: 1,
    minWidth: 0,
    height: z(48),
    alignItems: 'center',
    justifyContent: 'center',
    gap: z(4),
    paddingHorizontal: z(6),
    borderRadius: L.chipRadius,
  },
  presetValue: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: 'head',
    fontSize: z(15),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  /* 700 9 at .1em, the ink at 72% on either fill. */
  presetCaption: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: z(9),
    fontWeight: '700',
    letterSpacing: z(0.9),
    opacity: 0.72,
  },

  /** Out of the body's 20 so the pad's hairlines run to the sheet's edges. */
  pad: { marginHorizontal: z(-20) },
});
