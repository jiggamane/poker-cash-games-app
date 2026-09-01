import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  manualChargeOf,
  money,
  reconcile,
  resolveLedger,
  settle,
  type Deduction,
  type Money,
  type MoneyRule,
  type PlayerId,
} from '@poker-club/core';
import {
  formatCompactUnmarked,
  formatMoney,
  formatSignedCompact,
  formatSignedCompactUnmarked,
  formatToFit,
} from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { SpendList } from '../src/components/SpendList';
import { Step } from '../src/components/Step';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius } from '../src/design/tokens';
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

  const winners = players.filter((p) => p.grossResult > 0);

  /*
   * WHICH RULE A COLUMN IS. The BILL and KITTY columns are destinations, and
   * tapping a cell has to open the rule behind it — so the column has to know
   * which one it is. The first rule with that destination, which is the same
   * one `deductionOrder()` reimburses: a group with two bills is not a shape
   * the design has anywhere, and picking the first is at least the same choice
   * the engine makes.
   */
  const ruleFor = (destination: Deduction['destination']): MoneyRule | undefined =>
    [...night.rules]
      .filter((r) => r.active && r.destination === destination)
      .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1))[0];

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

        <View style={styles.headRow}>
          <Text style={styles.cellName} />
          <Text style={[styles.head, styles.num, { color: t.muted }]} numberOfLines={1}>GROSS</Text>
          {/* BILL AND BACK ARE ONE COLUMN. They are one rule seen from two
              sides — what the split charges you, and what you fronted and get
              returned — and a person who did both had the two halves of their
              own bill in cells two apart with a sign to reconcile. One signed
              figure is what actually happens to them, and the column it frees
              goes to the four that were being cut off. */}
          <Text
            style={[styles.head, styles.num, styles.billCol, styles.washTop, { color: t.offTable, backgroundColor: t.offTableFaint }]}
            numberOfLines={1}
          >
            BILL
          </Text>
          {/*
            PIGGY, WHERE THE BOARD DRAWS `KITTY` — the last reader-facing use of
            the stored value anywhere in the app, and B35 is the entry it belongs
            to. `kitty` is what the destination is called in the database and no
            reader is ever meant to see it: the club's rules, settle-up, the
            receipt and E6's own column all say piggy bank, off
            `destinationWord`. Not `PIGGY BANK`: the cell is 9.5/700 in a
            five-column grid measured against figures in the millions, and E6's
            columns head the same money `piggy` for the same reason.
          */}
          <Text
            style={[styles.head, styles.num, styles.piggyCol, styles.washTop, { color: t.offTable, backgroundColor: t.offTableWash }]}
            numberOfLines={1}
          >
            PIGGY
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
                  {compact(p.grossResult)}
                </Text>
                {/*
                  * BILL AND BACK ARE ONE CELL. They are one rule seen from two
                  * sides — what the split charges you, and what you fronted and
                  * get returned — and a person who did both had the two halves
                  * of their own bill two columns apart with a sign to
                  * reconcile. One signed figure is what actually happens to
                  * them, and the column it frees goes to the four that were
                  * being cut off.
                  *
                  * A loser's cells are usually empty, and that is a fact about
                  * the rules rather than about the reader: both charge winners,
                  * and an empty cell says so better than a zero. It is drawn
                  * from the FIGURE now rather than from whether they won, so a
                  * share the host typed against a loser's name — the one thing
                  * that puts one on a rule at all — appears where it belongs
                  * instead of vanishing.
                  */}
                <Cell
                  width={styles.billCol}
                  wash={t.offTableFaint}
                  color={back > bill ? t.text : t.offTable}
                  text={signed(money(back - bill))}
                  byHand={handSet(ruleFor('bill'), p.playerId)}
                  rule={ruleFor('bill')}
                  playerId={p.playerId}
                  admin={admin}
                />
                <Cell
                  width={styles.piggyCol}
                  wash={t.offTableWash}
                  color={t.offTable}
                  text={signed(money(-kitty))}
                  byHand={handSet(ruleFor('kitty'), p.playerId)}
                  rule={ruleFor('kitty')}
                  playerId={p.playerId}
                  admin={admin}
                />
                <Text
                  style={[styles.net, styles.num, styles.netCol, { color: moneyColor(t, p.finalPosition) }]}
                  numberOfLines={1}
                >
                  {formatSignedCompact(p.finalPosition)}
                </Text>
              </View>
            );
          })}

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
 * One washed cell of the preview table — and, for the host, the way in.
 *
 * IT IS PRESSABLE EVEN WHEN IT IS EMPTY, which is the point: putting a share on
 * somebody the rule does not charge is exactly the case a host reaches for, and
 * an empty cell is the only place on the screen that stands for "this person,
 * this rule, nothing yet".
 *
 * ⚠ TREATMENT NOT DRAWN. E3 draws these cells as figures in a column wash and
 * has no state for one the host set by hand. A dot after the figure is the
 * lightest mark that survives a 46px column with tabular numerals in it; the
 * itemised block above the table is where it is said in words.
 */
function Cell({
  width,
  wash,
  color,
  text,
  byHand,
  rule,
  playerId,
  admin,
}: {
  width: object;
  wash: string;
  color: string;
  text: string;
  byHand: boolean;
  rule: MoneyRule | undefined;
  playerId: PlayerId;
  admin: boolean;
}) {
  const open = () =>
    rule !== undefined &&
    router.push({ pathname: '/share', params: { rule: rule.id, player: playerId } });

  return (
    <Pressable
      accessibilityRole={admin && rule !== undefined ? 'button' : 'none'}
      disabled={!admin || rule === undefined}
      onPress={open}
      style={({ pressed }) => [width, { backgroundColor: wash, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.money, styles.num, styles.cellFill, { color }]} numberOfLines={1}>
        {text}
        {byHand && text !== '' ? '·' : ''}
      </Text>
    </Pressable>
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
               * line under the table has promised the second one all along.
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

/*
 * THE PREVIEW IS A COLUMN THAT CANNOT GROW, so its figures are compact and
 * carry no currency symbol — the header says what the column is and the symbol
 * repeated six times down a 46pt cell is what pushed the digits out of it.
 * Every one of these appears exactly, in full, in the rule block above.
 */
const compact = (m: Money): string => formatCompactUnmarked(m).replace(/^\u2212/, '−');

/** A cell that is empty at nought: a zero share is a rule that did not apply. */
const signed = (m: Money): string => (m === 0 ? '' : formatSignedCompactUnmarked(m));

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
  gross: { width: 62, fontSize: 13, fontWeight: '500', paddingVertical: 5, paddingHorizontal: 6 },
  money: { fontSize: 13, fontWeight: '700', paddingVertical: 5, paddingHorizontal: 6 },
  net: { fontSize: 15, fontWeight: '700', paddingVertical: 5, paddingHorizontal: 6 },
  /* The two columns that take money off the table are tinted the bone colour,
     at two strengths, so the eye can follow one rule down the table. The
     header cell rounds its top corners by 5, which is where the column starts. */
  cellFill: { width: '100%' },
  billCol: { width: 56 },
  piggyCol: { width: 56 },
  netCol: { width: 84 },
  washTop: { borderTopLeftRadius: 5, borderTopRightRadius: 5 },

  previewNote: { fontSize: 11.5, fontWeight: '400', lineHeight: 16.7, paddingTop: 7, paddingHorizontal: 6 },
  edit: { alignSelf: 'flex-start', marginTop: 14, marginHorizontal: 20 },

});

/*
 * THE BASIS OF A PERCENTAGE, in the working line under a name.
 *
 * 13/400 sharing a row with the name and the charge. Seven figures fit; the
 * eight of a table in the hundreds of millions did not, and the line wrapped
 * under a larger text setting. The basis is that player's gross, which is
 * stated in full in the preview grid at the foot of this screen.
 */
const WORKING_FITS = 10_000_000;
