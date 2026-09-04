import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  manualChargeOf,
  money,
  reconcile,
  resolveLedger,
  resultFormula,
  settle,
  type Deduction,
  type Money,
  type MoneyRule,
  type PlayerId,
} from '@poker-club/core';
import { formatMoney, formatSignedToFit, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { SpendList } from '../src/components/SpendList';
import { Step } from '../src/components/Step';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, radius } from '../src/design/tokens';
import {
  clearManualCharges,
  nameOf,
  settlementInput,
  spendsOf,
  useNight,
} from '../src/lib/nightStore';
import { useIsAdmin } from '../src/lib/whoIsReading';

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
  /*
   * WHO MAY RESTATE A FIGURE. Everybody at the table is entitled to SEE the
   * deductions — that is the point of the screen — and one person is entitled
   * to change them. A power the reader does not have is REMOVED, not disabled
   * (`12-the-group.md` § 4.1), so a member gets the same table without the
   * pencils and without the taps.
   */
  const admin = useIsAdmin();

  /*
   * The bill as spends, for the block at the foot of the screen. The
   * settlement below reads the same ledger through `settlementInput`; this is
   * the same resolution, held once, and it adds nothing up of its own.
   */
  const bill = useMemo(() => {
    if (night === null) return null;
    const ledger = resolveLedger(night.entries);
    return { total: ledger.totalExpenses, spends: spendsOf(night, ledger) };
  }, [night]);

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return {
        ok: true as const,
        value: settle(settlementInput(night)),
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

  if (night === null || result === null || bill === null) {
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

  /*
   * EVERYONE AFTER DEDUCTIONS, AS A SENTENCE — `resultFormula`, the same call
   * E4's night's-net list makes, so the two screens either side of this one
   * cannot disagree about where the rules leave somebody. It decides the
   * membership (the hole is a row, the collector is not), the order, and which
   * terms a person's night has; this screen decides nothing.
   *
   * IT USED TO BE A TABLE — GROSS · BILL · PIGGY · NET under column heads, in a
   * dashed frame, which is what rev 18 drew and what this screen built. The
   * columns came off the settled night on 2 September and this is that same
   * change one screen earlier: a grid of figures reads as a second ledger
   * beside the one above it, and every cell in it is already printed in full,
   * to the dollar, in the rule block it came from. What the table had that the
   * blocks have not is the TRANSPOSE — one person, every rule, on one line —
   * and a formula line is exactly that, in words, in the width of a phone.
   *
   * AND IT CAN STATE THE STEP NOW. The table drew `ruled`, the position BEFORE
   * rounding, because four numeric columns is the ceiling at 393 and the step
   * is a fifth — so the frame carried a line saying where the rest happened. A
   * sentence has no such ceiling: the step is a term like any other, the figure
   * on the right is the one E4 settles, and the caveat is gone with the grid
   * that needed it.
   */
  const rows = resultFormula(result.value);

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
            admin={admin}
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

        {/*
         * ONE ROW PER PERSON, AND THE WHOLE OF THEIR NIGHT ON IT.
         *
         * `Petr` · `game +$1,620 · food −$54 · piggy −$23` · `+$1,543`. The
         * name and the working stack on the left, the position sits hard right,
         * and colour is carried by the position and nothing else — a row is
         * never tinted or filled by its outcome, which at eight players turns
         * the frame into stripes and stops the figure being the thing you read.
         *
         * THE TERMS ARE THE ENGINE'S, in the engine's order. A term of $0 is not
         * printed; a person with ONE term has no line at all, because `game
         * −$500` under a `−$500` is the figure explaining itself.
         *
         * A NON-BREAKING SPACE INSIDE EACH TERM, and it is B18 rather than
         * typography: with an ordinary space the line wrapped wherever it liked
         * and where it liked was inside a figure — `piggy −` on one line and
         * `$600` on the next. The separator between terms is a spaced middot,
         * and that is the only place a break belongs.
         */}
        {rows.map(({ player: p, terms, net }, i) => (
          <View
            key={p.playerId}
            testID="e3-preview-row"
            style={[
              styles.row,
              i < rows.length - 1 && {
                borderBottomColor: t.previewRule,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
                {p.name}
              </Text>
              {terms.length > 1 && (
                <Text style={[styles.rowFormula, { color: t.muted }]} numberOfLines={2}>
                  {terms
                    .map((term) => `${term.label}\u00a0${formatSignedToFit(term.amount, TERM_FITS)}`)
                    .join(' · ')}
                </Text>
              )}
            </View>

            {/* Muted at exactly zero, which `moneyColor` is not: it falls back
                to the text colour, and among green and red a white figure reads
                as a third state rather than as no state. */}
            <Text
              style={[styles.rowNet, { color: net === 0 ? t.muted : moneyColor(t, net) }]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatSignedToFit(net, ROW_FITS)}
            </Text>
          </View>
        ))}

        <Text style={[styles.previewNote, { color: t.muted }]}>
          {admin
            ? 'Provisional until you settle. Tap any figure above to change it.'
            : /* ⚠ COPY NOT DRAWN. E3 is the host's screen and its line promises
                 a tap only the host has. Saying the first half without the
                 second is the honest half of a drawn string, not a new one. */
              'Provisional until the host settles.'}
        </Text>
      </View>

      {/*
       * THE BILL ITSELF, and who has actually put money in.
       *
       * A bar tab arrives after the count — the block above says so with a row
       * of em dashes — and this is the screen the room is looking at when it
       * does. `11-bill-and-piggy-bank.md` under "After the count": *"A spend
       * added during settle-up is allowed and recalculates every winner's share
       * and every transfer."* It always was allowed; there was no way to do it
       * from here, so the host left the flow, went back to the table, opened
       * the drawer and the bill, added it, and walked forward through the count
       * again. Everything above this recomputes off the engine, so a spend
       * added here redraws the shares, the preview and the total in one go.
       */}
      <SpendList
        total={bill.total}
        spends={bill.spends}
        nameFor={(id) => nameOf(night, id)}
        canAdd={admin}
      />

      {/*
       * THE RULES THEMSELVES, not just one figure inside one of them.
       *
       * Every block above opens the rule it belongs to, which is enough while
       * the argument is about a share. It is not enough when the argument is
       * about the rule — switching the piggy bank off because somebody brought
       * the food, or adding a rule for a bill nobody had thought of — and this
       * is the screen where a room finds that out, because it is the first one
       * that shows what each rule actually takes.
       *
       * Same copy and same treatment as E4's, one step further on: the corner
       * is empty on a pushed screen, so the way back to the rules is at the
       * end, where a room that disagrees with a figure is already looking.
       */}
      <Button
        label="Change a rule and look again"
        variant="chip"
        style={styles.edit}
        onPress={() => router.push('/money-rules')}
      />
    </Screen>
  );
}

/** Was this person's share of this rule typed by the host rather than split? */
const handSet = (rule: MoneyRule | undefined, playerId: PlayerId): boolean =>
  rule !== undefined && manualChargeOf(rule, playerId) !== undefined;

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
  admin,
  basisFor,
}: {
  deduction: Deduction;
  rule: MoneyRule | undefined;
  night: NonNullable<ReturnType<typeof useNight>>;
  admin: boolean;
  basisFor: (playerId: PlayerId) => Money;
}) {
  const t = useTheme();
  const percent = rule?.amountKind === 'percent';
  const empty = deduction.total === 0;
  const byHand = (rule?.manualCharges ?? []).length;

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

      {/*
        * WHAT A HAND-SET RULE SAYS ABOUT ITSELF, and the one control that
        * undoes the lot. A host who has typed four figures at 1am and lost the
        * thread needs a way back to the rule as agreed that does not involve
        * remembering what each of them was.
        *
        * ⚠ COPY NOT DRAWN — no frame shows a rule with a hand-set share in it.
        */}
      {byHand > 0 && rule !== undefined && (
        <Pressable
          accessibilityRole={admin ? 'button' : 'none'}
          disabled={!admin}
          onPress={() => void clearManualCharges(rule.id)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[styles.blockNote, { color: t.muted }]}>
            {byHand === 1 ? 'One share is set by hand' : `${byHand} shares are set by hand`}
            {admin ? ' · put everyone back on the split' : ''}
          </Text>
        </Pressable>
      )}

      <View style={styles.blockRows}>
        {(deduction.charges.length > 0 ? deduction.charges : placeholders(night, rule)).map(
          (c, i, all) => (
            <Pressable
              key={c.playerId}
              accessibilityRole={admin ? 'button' : 'none'}
              disabled={!admin || rule === undefined}
              /*
               * THE PENCIL NOW MEANS WHAT IT DRAWS. It used to open the rule —
               * which is the answer to "this split is wrong", not to "Petr's
               * share is wrong", and the two are different arguments. E3's own
               * line under the preview has promised the second one all along.
               */
              onPress={() =>
                rule !== undefined &&
                router.push({ pathname: '/share', params: { rule: rule.id, player: c.playerId } })
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
                {handSet(rule, c.playerId) && (
                  <Text style={{ color: t.muted }}> · by hand</Text>
                )}
              </Text>

              {percent && rule !== undefined && !handSet(rule, c.playerId) && (
                <Text style={[styles.working, { color: t.muted }]}>
                  {rule.amount}% of {formatToFit(basisFor(c.playerId), WORKING_FITS)}
                </Text>
              )}

              <Text style={[percent ? styles.workingAmount : styles.chargeAmount, { color: c.amount === 0 ? t.muted : t.text }]}>
                {c.amount === 0 ? '—' : formatMoney(c.amount)}
              </Text>

              {!percent && admin && <Icon name="pencil" color={t.muted} size={14} />}
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

  /*
   * THE ROW, AND WHY IT IS NOT A GRID ANY MORE.
   *
   * `6px` either side is the inset the column cells carried, kept so the names
   * line up with the note under them and with the label above; `7px` top and
   * bottom is what the two lines need to sit as one object rather than as a
   * name with a caption. A hairline between rows and none under the last, which
   * is the preview's own rule and the same one the rule blocks above follow.
   *
   * NO FILL AND NO WASH ANYWHERE ON IT. The columns were tinted so the eye
   * could follow one rule down six rows; a row that says its own rules needs
   * nothing of the kind, and a frame of washed stripes is what B23 cost.
   */
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, paddingHorizontal: 6 },
  rowText: { flexShrink: 1, minWidth: 0, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowFormula: { fontSize: 12.5, fontWeight: '400', lineHeight: 17.5, fontVariant: ['tabular-nums'] },
  /*
   * NEVER SHRINKS — B18. The name and the line under it are words and may give;
   * a figure may not, and one left to shrink came apart into a dash on one line
   * and an amount on the next.
   */
  rowNet: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  previewNote: { fontSize: 11.5, fontWeight: '400', lineHeight: 16.7, paddingTop: 7, paddingHorizontal: 6 },
  edit: { alignSelf: 'flex-start', marginTop: 14, marginHorizontal: 20 },

});

/*
 * THE BASIS OF A PERCENTAGE, in the working line under a name.
 *
 * 13/400 sharing a row with the name and the charge. Seven figures fit; the
 * eight of a table in the hundreds of millions did not, and the line wrapped
 * under a larger text setting. The basis is that player's gross, which is the
 * first term of that person's line in the preview at the foot of this screen.
 */
const WORKING_FITS = 10_000_000;

/*
 * WHERE THE PREVIEW'S OWN FIGURES RUN OUT, measured at 360 — the narrowest
 * phone in the matrix, and inside a dashed card that takes 12 a side out of the
 * page's 20.
 *
 * A ROW holds about 284 points inside its own padding: the name and the formula
 * line on the left, the position at 16/700 on the right, 12 between them. The
 * words give and the figure does not, so the only question is what the figure
 * may take — "−$999,999" at about 82 leaves 190 for a name, which is more than
 * any name at this table needs. Seven digits print in full and eight abbreviate.
 *
 * A TERM is 12.5/400 tabular and there may be four of them, separated by a
 * spaced middot: at full length `game +$99,999 · food −$99,999 · piggy −$99,999`
 * is about 240 against the 272 the line has, so the common night is one line and
 * a fourth term takes a second — which is the right failure for a sentence and
 * the wrong one for a figure. Ten thousand is where a term abbreviates, so a
 * table playing for millions reads `game +$1.2M` instead of wrapping to three.
 *
 * `cappedFigure` holds the phone's text setting at the money cap on the
 * position, so none of this moves underneath the reader.
 */
const ROW_FITS = 1_000_000;
const TERM_FITS = 10_000;
