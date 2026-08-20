import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  chargeCeiling,
  formatMoney,
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
import { Button } from '../src/components/Button';
import { Keypad, appendDigits } from '../src/components/Keypad';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { block, radius, space, type } from '../src/design/tokens';
import { nameOf, setManualCharge, settlementInput, useNight } from '../src/lib/nightStore';
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
  const [typed, setTyped] = useState<string | null>(null);
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
  const amount = typed === null ? (set ?? onTheSplit) : typed === '' ? 0 : Number(typed);

  const total = ruleTotal(rule, ledger);
  const ceiling = chargeCeiling(rule, ledger, player);
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

  /* A power the reader does not have is removed, not disabled. */
  if (!admin) {
    return (
      <Sheet
        title={name}
        badge={tagOf(rule)}
        sub={`${rule.name} · ${formatMoney(money(onTheSplit))}`}
        footer={<Button label="Close" variant="secondary" onPress={() => router.back()} />}
      >
        <Text style={[styles.note, { color: t.muted }]}>
          {set === undefined
            ? 'This is what the rule gives them. Only the person who runs the group can change it.'
            : 'The host set this figure by hand. Only they can change it.'}
        </Text>
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
      footer={
        <>
          <Button
            label={
              over
                ? `Only ${formatMoney(ceiling!)} is left to give`
                : amount === set
                  ? 'Saved'
                  : `${name} carries ${formatMoney(money(valid ? amount : 0))}`
            }
            variant={valid && amount !== set ? 'primary' : 'blocked'}
            disabled={!valid || busy || amount === set}
            onPress={() => void commit(money(amount))}
          />
          {set !== undefined && (
            <Button
              label={`Put ${name} back on the split`}
              variant="secondary"
              disabled={busy}
              onPress={() => void commit(null)}
            />
          )}
        </>
      }
    >
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: over ? t.loss : valid ? t.text : t.muted }]}>
          {formatMoney(money(Number.isFinite(amount) ? amount : 0))}
        </Text>
        <Text style={[styles.of, { color: t.muted }]}>
          {total === null
            ? `of ${rule.name.toLowerCase()} · nothing caps a percentage`
            : `of ${formatMoney(total)} to cover`}
        </Text>
      </View>

      {/* WHAT ELSE MOVES. The reason this sheet is safe to use, and the first
          thing a host will look for after typing a figure. */}
      <View style={[styles.blockPlain, { backgroundColor: t.surface, borderColor: t.hairline }]}>
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

            {others.map((p) => (
              <View key={p.id} style={[styles.otherRow, { borderBottomColor: t.previewRule }]}>
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
          </>
        )}
      </View>

      <View style={styles.presets}>
        <Preset
          label={formatMoney(money(onTheSplit))}
          caption="BY THE RULE"
          on={amount === onTheSplit && onTheSplit !== 0}
          onPress={() => setTyped(String(onTheSplit))}
        />
        <Preset label={formatMoney(money(0))} caption="NOTHING" on={amount === 0} onPress={() => setTyped('0')} />
        <Preset
          label="Custom"
          caption="SET"
          on={amount !== onTheSplit && amount !== 0}
          onPress={() => setTyped('')}
        />
      </View>

      <Keypad
        onDigits={(d) => setTyped((cur) => appendDigits(cur ?? '', d))}
        onBackspace={() => setTyped((cur) => (cur ?? String(set ?? onTheSplit)).slice(0, -1))}
      />
    </Sheet>
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

/** $170 / $0 / Custom. Filled when chosen — 44px, per the button rules. */
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
      <Button label={label} variant="preset" selected={on} onPress={onPress} style={styles.preset} />
      <Text style={[styles.presetCaption, { color: on ? t.text : t.muted }]}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amountRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 14, gap: 6 },
  amount: { fontSize: 60, fontWeight: '800', letterSpacing: -3, fontVariant: ['tabular-nums'] },
  of: { ...type.rowDetail, textAlign: 'center', paddingHorizontal: space.card },

  note: { ...type.rowDetail, lineHeight: 20, marginHorizontal: space.page, paddingHorizontal: 4 },

  blockPlain: {
    marginHorizontal: space.card,
    marginBottom: 14,
    paddingVertical: block.padV,
    paddingHorizontal: block.padH,
    borderWidth: 1,
    borderRadius: block.radius,
    gap: block.gap,
  },
  blockTitle: type.blockTitle,
  blockBody: type.blockBody,

  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  otherName: { fontSize: 14, fontWeight: '600', flex: 1, minWidth: 0 },
  otherWas: { fontSize: 12.5, fontWeight: '400', fontVariant: ['tabular-nums'] },
  otherNow: { fontSize: 15, fontWeight: '700', width: 74, textAlign: 'right', fontVariant: ['tabular-nums'] },

  presets: { flexDirection: 'row', gap: 8, paddingHorizontal: space.card, paddingBottom: 14 },
  presetSlot: { flex: 1, alignItems: 'center', gap: 3 },
  preset: { width: '100%', height: 44 },
  presetCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 0.72 },
});
