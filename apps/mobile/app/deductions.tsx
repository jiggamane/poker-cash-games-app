import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatMoney,
  formatSigned,
  reconcile,
  resolveLedger,
  settle,
  type Deduction,
  type Money,
  type MoneyRule,
  type PlayerId,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { Step } from '../src/components/Step';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius } from '../src/design/tokens';
import { nameOf, useNight } from '../src/lib/nightStore';

/**
 * Deductions — E3, step 2 of 3, and E3b when the bill is not in yet.
 * 13-after-the-night.md.
 *
 * Every rule, itemised per person, while there is still time to change one and
 * look again. The screen does no arithmetic of its own — not even the totals,
 * which come off the deduction rather than from adding up the rows above them.
 * If a share looks wrong the rule is wrong, and the fix is the rule.
 *
 * The bill block NEVER disappears. A bar tab usually arrives after the count,
 * so the common case is a bill of em dashes with its rows already in place; a
 * block that appeared later would move everything under it at the worst moment.
 */
export default function Deductions() {
  const t = useTheme();
  const night = useNight();

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return {
        ok: true as const,
        value: settle({
          players: night.players,
          entries: night.entries,
          finalCounts: night.finalCounts,
          rules: night.rules,
          ...(night.acknowledgement ? { acknowledgedDiscrepancy: night.acknowledgement } : {}),
        }),
      };
    } catch (e) {
      /*
       * WHY IT FAILED MATTERS, because the two reasons need opposite actions.
       *
       * An uncounted stack is answered by going back and counting it. A rule
       * the engine refuses — a collector who is not in the night, a custom
       * split that no longer sums to the bill — is not, and telling the host
       * to count again sends them back to a screen that immediately sends them
       * here, with the night unclosable and nothing on either screen saying
       * so. That loop is how this arrived at the end of a real evening.
       */
      const counted = reconcile(resolveLedger(night.entries), night.finalCounts).reconciled;
      return {
        ok: false as const,
        counted,
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  }, [night]);

  if (night === null || result === null) {
    return <Screen title="Deductions" backTo="Count up">{null}</Screen>;
  }

  /* The same gate as everywhere else: no counted night, no figures. */
  if (!result.ok && !result.counted) {
    return (
      <Screen
        title="Not yet"
        backTo="Count up"
        trailing={<Step label="2 of 3" />}
        lede="No rule can take its share until every stack has been counted, because there is nothing yet to take a share of."
        footer={
          <Button
            label="Back to the count"
            variant="primary"
            onPress={() => router.dismissTo('/count-up')}
          />
        }
      >
        {null}
      </Screen>
    );
  }

  /*
   * The count is in and a RULE is what the engine refused. Going back to the
   * count cannot help, so this does not offer it: the way out is the rules,
   * where the offending one can be corrected or switched off for tonight.
   *
   * ⚠ COPY NOT DRAWN. `13-after-the-night.md` has no state for a night whose
   * rules will not settle, and the engine's own sentence is the only thing
   * that names which rule. Shown verbatim rather than paraphrased — it is
   * precise, and a host at 1am needs the rule's name, not a mood.
   */
  if (!result.ok) {
    return (
      <Screen
        title="A rule will not settle"
        backTo="Count up"
        trailing={<Step label="2 of 3" />}
        lede="Every stack is counted. One of tonight's rules cannot be applied, so nothing can be worked out until it is changed or switched off."
        footer={
          <Button
            label="Open tonight's rules"
            variant="primary"
            onPress={() => router.push('/money-rules')}
          />
        }
      >
        <Text style={[styles.failure, { color: t.muted }]}>{result.detail}</Text>
      </Screen>
    );
  }

  const { deductions, totalOffTable, players } = result.value;
  const active = deductions.filter((d) => d.total > 0 || d.destination === 'bill');
  const billIn = deductions.some((d) => d.destination === 'bill' && d.total > 0);

  /* "$120 back to Marek, $50 to Lena · $126 to the piggy bank" — where the money
     actually goes, in one line, because "leaves the table" is not the same as
     "is gone" and the room will ask. */
  const destinations = deductions
    .filter((d) => d.total > 0)
    .map((d) => {
      /* Somebody who fronted money gets it BACK; the piggy bank is simply paid. */
      const reimbursements = [...d.credits]
        .filter((c) => night.players.find((pl) => pl.id === c.playerId)?.atTable === true)
        .sort((a, b) => b.amount - a.amount);

      if (reimbursements.length > 0) {
        return reimbursements
          .map(
            (c, i) =>
              `${formatMoney(c.amount)} ${i === 0 ? 'back to ' : 'to '}${nameOf(night, c.playerId)}`,
          )
          .join(', ');
      }
      return `${formatMoney(d.total)} to the ${d.destination === 'kitty' ? 'piggy bank' : d.name.toLowerCase()}`;
    })
    .join(' · ');

  const winners = players.filter((p) => p.grossResult > 0);

  return (
    <Screen
      title="Deductions"
      backTo="Count up"
      trailing={<Step label="2 of 3" />}
      footer={
        /* An outline, not a fill: the loud button of this flow is at the end of
           it, and this step is a look before a decision. */
        <Button
          label="See who pays whom"
          variant="secondary"
          onPress={() => router.push('/settle-up')}
        />
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Text style={[styles.cardLabel, { color: t.muted }]}>Leaves the table</Text>
        <Text style={[styles.cardFigure, { color: t.text }]}>{formatMoney(totalOffTable)}</Text>
        <Text style={[styles.cardNote, { color: t.muted }]}>
          {billIn
            ? destinations
            : destinations === ''
              ? 'Nothing comes off tonight'
              : `${destinations} · the bill is not in yet`}
        </Text>
      </View>

      <View style={styles.blocks}>
        {active.map((d, i) => (
          <Block
            key={d.ruleId}
            deduction={d}
            rule={night.rules.find((r) => r.id === d.ruleId)}
            night={night}
            basisFor={(playerId) => {
              const p = players.find((x) => x.playerId === playerId);
              if (p === undefined) return 0 as Money;
              const rule = night.rules.find((r) => r.id === d.ruleId);
              if (rule?.basis !== 'net_after_others') return p.grossResult;
              // Everything the rules above this one already took off them.
              const taken = deductions
                .slice(0, i)
                .flatMap((earlier) => earlier.charges)
                .filter((c) => c.playerId === playerId)
                .reduce((sum, c) => sum + c.amount, 0);
              return (p.grossResult - taken) as Money;
            }}
          />
        ))}
      </View>

      {/* Nobody's net is settled until the transfers are, so this is a preview
          and is drawn as one — dashed, tagged, and recomputed from the engine
          every time a figure above it changes. */}
      <View style={[styles.preview, { borderColor: t.dashed }]}>
        <View style={styles.previewHead}>
          <Text style={[styles.previewTitle, { color: t.text }]}>Everyone after deductions</Text>
          <View style={[styles.tag, { borderColor: t.dashed }]}>
            <Text style={[styles.tagText, { color: t.muted }]}>PREVIEW</Text>
          </View>
        </View>

        <View style={styles.headRow}>
          <Text style={styles.cellName} />
          <Text style={[styles.head, styles.num, { color: t.muted }]} numberOfLines={1}>GROSS</Text>
          <Text
            style={[styles.head, styles.num, styles.billCol, styles.washTop, { color: t.offTable, backgroundColor: t.offTableFaint }]}
            numberOfLines={1}
          >
            BILL
          </Text>
          <Text style={[styles.head, styles.backCol, styles.num, { color: t.muted }]} numberOfLines={1}>BACK</Text>
          <Text
            style={[styles.head, styles.num, styles.piggyCol, styles.washTop, { color: t.offTable, backgroundColor: t.offTableWash }]}
            numberOfLines={1}
          >
            KITTY
          </Text>
          <Text style={[styles.head, styles.num, styles.netCol, { color: t.muted }]}>NET</Text>
        </View>

        {players
          .filter((p) => p.boughtIn > 0 || p.endedWith > 0)
          .sort((a, b) => b.finalPosition - a.finalPosition)
          .map((p) => {
            const bill = amountFor(deductions, 'bill', p.playerId, 'charge');
            const back = amountFor(deductions, 'bill', p.playerId, 'credit');
            const kitty = amountFor(deductions, 'kitty', p.playerId, 'charge');
            const won = winners.some((w) => w.playerId === p.playerId);

            return (
              <View key={p.playerId} style={[styles.bodyRow, { borderBottomColor: t.previewRule }]}>
                <Text style={[styles.cellName, { color: t.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.gross, styles.num, { color: t.muted }]} numberOfLines={1}>
                  {p.grossResult < 0 ? '−' : ''}
                  {Math.abs(p.grossResult).toLocaleString('en-US')}
                </Text>
                {/* Losers show gross and net only: both rules charge winners,
                    and an empty cell says that better than a zero. */}
                <Text
                  style={[styles.money, styles.num, styles.billCol, { color: t.offTable, backgroundColor: t.offTableFaint }]}
                  numberOfLines={1}
                >
                  {won ? dash(bill, true) : ''}
                </Text>
                <Text style={[styles.money, styles.backCol, styles.num, { color: t.text }]} numberOfLines={1}>
                  {won && back > 0 ? `+${back.toLocaleString('en-US')}` : ''}
                </Text>
                <Text
                  style={[styles.money, styles.num, styles.piggyCol, { color: t.offTable, backgroundColor: t.offTableWash }]}
                  numberOfLines={1}
                >
                  {won ? dash(kitty, true) : ''}
                </Text>
                <Text
                  style={[styles.net, styles.num, styles.netCol, { color: moneyColor(t, p.finalPosition) }]}
                  numberOfLines={1}
                >
                  {formatSigned(p.finalPosition)}
                </Text>
              </View>
            );
          })}

        <Text style={[styles.previewNote, { color: t.muted }]}>
          Provisional until you settle. Tap any figure above to change it.
        </Text>
      </View>
    </Screen>
  );
}

/**
 * One rule, itemised.
 *
 * A percentage shows its working — "5% of $1,620 → $81" — because a percentage
 * is the one deduction nobody at the table can check in their head.
 */
function Block({
  deduction,
  rule,
  night,
  basisFor,
}: {
  deduction: Deduction;
  rule: MoneyRule | undefined;
  night: NonNullable<ReturnType<typeof useNight>>;
  basisFor: (playerId: PlayerId) => Money;
}) {
  const t = useTheme();
  const percent = rule?.amountKind === 'percent';
  const empty = deduction.total === 0;

  return (
    <View style={[styles.block, { backgroundColor: t.surface, borderColor: t.hairline }]}>
      <View style={styles.blockTop}>
        <Text style={[styles.blockName, { color: t.text }]}>
          {percent && rule !== undefined ? `${deduction.name} · ${rule.amount}%` : deduction.name}
        </Text>
        <Text style={[styles.blockTotal, { color: empty ? t.muted : t.text }]}>
          {empty ? '—' : formatMoney(deduction.total)}
        </Text>
      </View>

      {!percent && (
        <Text style={[styles.blockNote, { color: t.muted }]}>
          {empty
            ? 'Nothing on the bill yet. Add it and the split appears here.'
            : sentence(rule, deduction, night)}
        </Text>
      )}

      <View style={styles.blockRows}>
        {(deduction.charges.length > 0 ? deduction.charges : placeholders(night, rule)).map(
          (c, i, all) => (
            <Pressable
              key={c.playerId}
              accessibilityRole="button"
              onPress={() =>
                rule !== undefined && router.push({ pathname: '/rule', params: { id: rule.id } })
              }
              style={({ pressed }) => [
                percent ? styles.workingRow : styles.chargeRow,
                !percent &&
                  i < all.length - 1 && { borderBottomColor: t.previewRule, borderBottomWidth: StyleSheet.hairlineWidth },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[percent ? styles.workingName : styles.chargeName, { color: t.text }]}>
                {nameOf(night, c.playerId)}
              </Text>

              {percent && rule !== undefined && (
                <Text style={[styles.working, { color: t.muted }]}>
                  {rule.amount}% of {formatMoney(basisFor(c.playerId))}
                </Text>
              )}

              <Text style={[percent ? styles.workingAmount : styles.chargeAmount, { color: c.amount === 0 ? t.muted : t.text }]}>
                {c.amount === 0 ? '—' : formatMoney(c.amount)}
              </Text>

              {!percent && <Icon name="pencil" color={t.muted} size={14} />}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

/** "Split equally between the winners · Marek fronted $120, Lena $50." */
function sentence(
  rule: MoneyRule | undefined,
  deduction: Deduction,
  night: NonNullable<ReturnType<typeof useNight>>,
): string {
  const how =
    rule === undefined
      ? 'Split between the winners'
      : rule.charge === 'everyone_flat'
        ? 'Split between everyone at the table'
        : rule.split === 'by_percent'
          ? 'Split between the winners, by the size of each win'
          : rule.split === 'custom'
            ? 'Split by hand'
            : 'Split equally between the winners';

  const fronted = [...deduction.credits]
    .filter((c) => night.players.find((p) => p.id === c.playerId)?.atTable === true)
    .sort((a, b) => b.amount - a.amount)
    .map(
      (c, i) =>
        `${nameOf(night, c.playerId)} ${i === 0 ? 'fronted ' : ''}${formatMoney(c.amount)}`,
    )
    .join(', ');

  return fronted === '' ? `${how}.` : `${how} · ${fronted}.`;
}

/** The bill's rows stay in place with em dashes until there is a bill. */
const placeholders = (
  night: NonNullable<ReturnType<typeof useNight>>,
  rule: MoneyRule | undefined,
): Array<{ playerId: PlayerId; amount: Money }> =>
  rule === undefined
    ? []
    : night.players.filter((p) => p.atTable).map((p) => ({ playerId: p.id, amount: 0 as Money }));

const amountFor = (
  deductions: readonly Deduction[],
  destination: Deduction['destination'],
  playerId: PlayerId,
  side: 'charge' | 'credit',
): Money =>
  deductions
    .filter((d) => d.destination === destination)
    .flatMap((d) => (side === 'charge' ? d.charges : d.credits))
    .filter((c) => c.playerId === playerId)
    .reduce((sum, c) => sum + c.amount, 0) as Money;

const dash = (m: Money, negative = false): string =>
  m === 0 ? '' : `${negative ? '−' : ''}${m.toLocaleString('en-US')}`;

const styles = StyleSheet.create({
  failure: { fontSize: 13.5, fontWeight: '400', lineHeight: 20, marginHorizontal: 20 },
  card: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 5,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  cardFigure: { fontSize: 28, fontWeight: '800', letterSpacing: -1.12, lineHeight: 28, fontVariant: ['tabular-nums'] },
  cardNote: { fontSize: 13.5, fontWeight: '400' },

  blocks: { marginHorizontal: 20, gap: 8 },
  block: { borderRadius: radius.card, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 12, gap: 6 },
  blockTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockName: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  blockTotal: { fontSize: 18, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  blockNote: { fontSize: 12.5, fontWeight: '400', lineHeight: 17.5 },
  blockRows: { gap: 2 },

  chargeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  chargeName: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  chargeAmount: { fontSize: 16, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  workingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 2 },
  workingName: { fontSize: 14, fontWeight: '500' },
  working: { fontSize: 13, fontWeight: '400', fontVariant: ['tabular-nums'] },
  workingAmount: { fontSize: 14, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  preview: {
    marginTop: 6,
    marginHorizontal: 20,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 9,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingBottom: 5 },
  previewTitle: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1.15, textTransform: 'uppercase' },
  tag: { marginLeft: 'auto', borderWidth: 1, borderStyle: 'dashed', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
  tagText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.95 },

  headRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bodyRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  /*
   * E3 draws every cell in this table at `5px 6px`, `4px 6px` in the header.
   * They had been built at 4, and the two pixels matter here more than
   * anywhere: the bill and kitty columns carry a wash running the whole height
   * of the table, and a wash two pixels short on each side reads as a stack of
   * separate rectangles rather than as one column to follow down six rows.
   *
   * The COLUMN WIDTHS are wider than the board's 46/40/44/40/78. The drawn
   * night's deductions are two digits; a real one is not, and at the board's
   * widths a $170 bill share wraps to two lines and takes the wash with it.
   * Wider by four with the same padding keeps the drawn look and survives the
   * figures the engine actually produces — and every cell is single-line, so
   * an extreme one clips instead of breaking the table.
   */
  head: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.85, paddingVertical: 4, paddingHorizontal: 6 },
  num: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  cellName: { flex: 1, fontSize: 14, fontWeight: '600', paddingVertical: 5, paddingHorizontal: 6 },
  gross: { width: 52, fontSize: 13, fontWeight: '500', paddingVertical: 5, paddingHorizontal: 6 },
  money: { fontSize: 13, fontWeight: '700', paddingVertical: 5, paddingHorizontal: 6 },
  net: { fontSize: 15, fontWeight: '700', paddingVertical: 5, paddingHorizontal: 6 },
  /* The two columns that take money off the table are tinted the bone colour,
     at two strengths, so the eye can follow one rule down the table. The
     header cell rounds its top corners by 5, which is where the column starts. */
  billCol: { width: 46 },
  backCol: { width: 44 },
  piggyCol: { width: 46 },
  netCol: { width: 76 },
  washTop: { borderTopLeftRadius: 5, borderTopRightRadius: 5 },

  previewNote: { fontSize: 11.5, fontWeight: '400', lineHeight: 16.7, paddingTop: 7, paddingHorizontal: 6 },

});
