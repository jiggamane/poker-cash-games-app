import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import {
  isPerPersonKind,
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
import {
  formatMoney,
  formatSignedToFit,
  formatSignedToFitUnmarked,
  formatToFitUnmarked,
  rateLabel,
} from '../src/lib/money';
import { Card, CardRow, SectionLabel } from '../src/components/Card';
import { Icon, type IconName } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { Screen } from '../src/components/Screen';
import { SpendList } from '../src/components/SpendList';
import { Step } from '../src/components/Step';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure } from '../src/design/tokens';
import { z } from '../src/design/scale';
import {
  clearManualCharges,
  nameOf,
  settlementOf,
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
 * THE ORDER IS PEOPLE, STEP, RULES — 6 September, and it is a departure from
 * rev 18, which heads the screen with a card totalling what leaves the table.
 * Where a room ends up is what the room is on this screen to find out, so that
 * is the first thing on it; the rules that got them there are under it, each
 * one a door to the rule itself; and the aggregate is gone, because it is a
 * figure nobody is owed, which appears in no transfer and on no later screen.
 *
 * AND EVERY WAY OF CHANGING WHAT IT SAYS IS ON IT. A row opens that person's
 * share of that rule (`/share`); a block's head opens the rule (`/rule`); the
 * step under the people opens rounding (`/rounding`); the bill takes a spend;
 * and the chip at the foot still opens the whole list. Before this, two of
 * those five were reachable only by leaving the ending flow.
 *
 * The bill block NEVER disappears. A bar tab usually arrives after the count,
 * so the common case is a bill of em dashes with its rows already in place; a
 * block that appeared later would move everything under it at the worst moment.
 *
 * THE FULL BOARD (`design/explorations/full-board/`, `deductions*`, approved
 * 24–26 November): the preview is a lifted card under its label, Preview a
 * quiet tag, each row the settled night's — the game result under the name
 * after the chips-out arrow (owner, 26 November), the other terms as one terms
 * pill under the net (25 November). The rules are "in the app's own rows"
 * (25 November): each rule a lifted card, its shares player rows with their
 * working under the name, and a Change pill in its head that opens the rule
 * (26 November: "so the rules can be changed at this stage"). See who pays
 * whom is the bar.
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
        value: settlementOf(night),
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
        bar={[{ label: 'Back to the count', onPress: () => router.dismissTo('/count-up') }]}
      >
        {/* The board's `para()`, on the sheet rather than on the ink. */}
        <View style={styles.body}>
          <Text style={[styles.para, { color: t.text }]}>
            No rule can take its share until every stack has been counted, because there is nothing yet to take a share of.
          </Text>
        </View>
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
        bar={[{ label: "Open tonight's rules", onPress: () => router.push('/money-rules') }]}
      >
        <View style={styles.body}>
          <Text style={[styles.para, { color: t.text }]}>
            Every stack is counted. One of tonight's rules cannot be applied, so nothing can be worked out until it is changed or switched off.
          </Text>
          {/* The engine's own sentence, which the board does not draw (its
              flag says so) and which names the rule. */}
          <Text style={[styles.failure, { color: t.muted }]}>{result.detail}</Text>
        </View>
      </Screen>
    );
  }

  const { deductions, players } = result.value;
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
   *
   * SINCE THE FULL BOARD THE WORDS ARE MARKS — chips out for the game, the
   * fork and the piggy for the two rules — as the settled night draws them;
   * a term with no mark keeps its word. See `TermMark`.
   */
  const rows = resultFormula(result.value);

  return (
    <Screen
      title="Deductions"
      backTo="Count up"
      trailing={<Step label="2 of 3" />}
      /*
       * THE BAR, since the full board — and that is a reversal. In the app it
       * was an outlined button, deliberately not the filled primary, because
       * this step is a look before a decision and the loud button of the flow
       * is at the end of it. On the board the bar is the only place a screen's
       * way forward lives; the board flagged exactly this and was approved as
       * drawn (24 November).
       */
      bar={[{ label: 'See who pays whom', onPress: () => router.push('/settle-up') }]}
    >
      <View style={styles.body}>
      {/*
       * WHO ENDS UP WITH WHAT, AT THE TOP OF THE SCREEN — 6 September.
       *
       * It was the last block on this screen, under every rule and under the
       * bill, and above it sat a card whose only job was to add the rules up:
       * `$296`, under `LEAVES THE TABLE`. Two things were wrong with that
       * order and they are the same thing twice. The figure a room asks this
       * screen for is its own — "so what am I on?" — and it was three rule
       * blocks and a bill away; the figure at the top was the one nobody is
       * owed, an aggregate that appears on no row, in no transfer and on no
       * later screen. So the people come first and the total is gone.
       *
       * NOTHING WENT WITH IT. This screen never added anything up and still
       * does not: what each rule takes is printed in full, to the dollar, per
       * person, in the block it came from, and where the money actually goes
       * is the line under the step below.
       *
       * Nobody's net is settled until the transfers are, so this is a preview
       * and says so — a quiet `Preview` tag on its label and the provisional
       * line under the card (the board, 24 November: the dashed frame it had
       * became a lifted card like every other group) — and it is recomputed
       * from the engine every time a figure below it changes.
       */}
      <SectionLabel
        text="Everyone after deductions"
        right={
          <View style={[styles.tag, { backgroundColor: t.raised }]}>
            <Text style={[styles.tagText, { color: t.muted }]}>PREVIEW</Text>
          </View>
        }
      />

      {/*
       * ONE ROW PER PERSON, AND THE WHOLE OF THEIR NIGHT ON IT — the settled
       * night's own row (owner, 25 November: "the same UI as other parts").
       *
       *     Dana                                        +$1,429
       *     ⇡ +1,620                         [🍴 −110  % −81]
       *
       * The name and the game result under it, after the chips-out arrow (owner,
       * 26 November); the net hard right with the other terms as one pill under
       * it. Colour is carried by the net and nothing else — a row is never
       * tinted or filled by its outcome, which at eight players turns the card
       * into stripes and stops the figure being the thing you read.
       *
       * THE TERMS ARE THE ENGINE'S, in the engine's order. A term of $0 is not
       * printed; a person with ONE term has no line at all, because `−$500`
       * under a `−$500` is the figure explaining itself.
       */}
      <Card>
        {rows.map(({ player: p, terms, net }, i) => {
          const [game, ...rest] = terms;
          const working = terms.length > 1;
          return (
            <View
              key={p.playerId}
              testID="e3-preview-row"
              style={[
                styles.row,
                i < rows.length - 1 && { borderBottomColor: t.hairline, borderBottomWidth: 1 },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
                {working && game !== undefined && (
                  <View style={styles.termLine}>
                    <TermMark term={game} />
                    {/* CAPPED LIKE THE NET BESIDE IT (24 November). The
                        working is figures in the figure face, and at a
                        millions table and 120% text it went to two lines
                        (ui-journeys). The cap holds it at 1.1, as every figure
                        in a fixed box is held.

                        THE TERMS ARE UNMARKED — the rule of 19 September, in
                        `money.ts`: this line IS the working, and the figure it
                        comes to is the net beside it, which keeps the mark. */}
                    <Text style={[styles.term, { color: t.muted }]} numberOfLines={1} {...cappedFigure}>
                      {termText(game)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.rowRight}>
                {/* Muted at exactly zero, which `moneyColor` is not: it falls
                    back to the text colour, and among green and red a plain
                    figure reads as a third state rather than as no state. */}
                <Text
                  style={[styles.rowNet, { color: net === 0 ? t.muted : moneyColor(t, net) }]}
                  numberOfLines={1}
                  {...cappedFigure}
                >
                  {formatSignedToFit(net, ROW_FITS)}
                </Text>
                {working && rest.length > 0 && (
                  /* The kit's `terms()` pill: every term after the game, each
                     with its mark, on one line that never breaks inside a
                     figure. */
                  <View style={[styles.pill, { backgroundColor: t.raised }]}>
                    {rest.map((term) => (
                      <View key={term.key} style={styles.pillTerm}>
                        <TermMark term={term} />
                        <Text style={[styles.pillText, { color: t.muted }]} numberOfLines={1} {...cappedFigure}>
                          {termText(term)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </Card>

      {/*
       * ⚠ ONE WORD OF DRAWN COPY CHANGED, and only because the screen it
       * describes turned over: rev 18's line is "Tap any figure ABOVE to
       * change it", written when this block sat at the foot with every rule
       * above it. The rules are below it now. A promise that points at the
       * wrong half of the screen is worse than a rewritten one, and the word
       * is the whole of the change — `docs/screens.md` records it.
       */}
      <Text style={[styles.note, { color: t.muted }]}>
        {admin
          ? 'Provisional until you settle. Tap any figure below to change it.'
          : /* ⚠ COPY NOT DRAWN. E3 is the host's screen and its line promises
               a tap only the host has. Saying the first half without the
               second is the honest half of a drawn string, not a new one. */
            'Provisional until the host settles.'}
      </Text>

      {/*
       * THE STEP, UNDER THE PEOPLE IT MOVES — the same row E2 and E4 draw, the
       * same sheet behind it, and it is on E3 because `rounded −$4` is a term
       * on the lines above and was the one term on them with no way back to
       * the thing that set it. `from: 'settle'` is what makes the sheet state
       * what each step costs the piggy bank and how many payments it leaves:
       * every stack is counted by the time anybody is on this screen, so the
       * question is no longer what a step does to a stack.
       *
       * NOT OWNED HERE. E2 owns the setting — rounding changes what a stack is
       * worth, so it is decided where stacks are entered — and this screen,
       * like E4 and E6, draws the row and opens the one sheet. The sheet is
       * also what removes the power from a reader who is not the host, which
       * is why the row is not gated here: a member gets the same row, opens
       * the same sheet, and reads what the night is set to without an Apply.
       */}
      <Card>
        <RoundingBar
          mode={night.roundingMode}
          bare
          last
          onPress={() =>
            router.push({ pathname: '/rounding', params: { scope: 'night', from: 'settle' } })
          }
        />
      </Card>

      {/*
       * WHERE THE MONEY ACTUALLY GOES — the header card's own line, without the
       * header card's figure. "$120 back to Andro, $50 to Lena · $126 to the
       * piggy bank": "leaves the table" is not the same as "is gone" and the
       * room will ask. The total that used to head this sentence is what has
       * been dropped; the sentence is what the total was hanging off.
       */}
      <Text style={[styles.note, { color: t.muted }]}>
        {billIn
          ? destinations
          : destinations === ''
            ? 'Nothing comes off tonight'
            : `${destinations} · the bill is not in yet`}
      </Text>

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
       * added here redraws the shares and the preview in one go.
       *
       * `SpendList` carries the sheet's 20 inset itself, so it is outdented by
       * that much to sit on this column's 18. ⚠ The board draws Add a spend
       * here as a lifted chip; `SpendList` (shared) draws the outlined button
       * `money-rules` drew.
       */}
      <View style={styles.outdent}>
        <SpendList
          total={bill.total}
          spends={bill.spends}
          nameFor={(id) => nameOf(night, id)}
          canAdd={admin}
        />
      </View>

      {/*
       * THE RULES THEMSELVES, not just one figure inside one of them.
       *
       * Every block above opens the rule it belongs to, which is enough while
       * the argument is about a share. It is not enough when the argument is
       * about the rule set — switching the piggy bank off because somebody
       * brought the food, or adding a rule for a bill nobody had thought of —
       * and this is the screen where a room finds that out, because it is the
       * first one that shows what each rule actually takes.
       *
       * The board's lifted row with the restart mark (25 November). It draws a
       * chevron at the end; nothing else in the look points, so it is left off.
       */}
        <Card>
          <CardRow
            name="Change a rule and look again"
            lead={<Icon name="restart" color={t.muted} size={z(17)} />}
            last
            accessibilityLabel="Change a rule and look again"
            onPress={() => router.push('/money-rules')}
          />
        </Card>
      </View>
    </Screen>
  );
}

/**
 * A term's mark — the settled night's glyphs: chips out for the game, the
 * fork for the bill, the piggy for the piggy bank. A term with no drawn mark
 * (the host's fee, the next pot, the rounding step) prints its word instead,
 * so no term is ever a bare figure nobody can name.
 */
const MARK: Record<string, IconName> = { game: 'chipsOut', bill: 'food', kitty: 'piggy' };

function TermMark({ term }: { term: { key: string } }) {
  const t = useTheme();
  const name = MARK[term.key];
  if (name === undefined) return null;
  return <Icon name={name} color={t.muted} size={z(12)} />;
}

/**
 * The figure, and the word where there is no mark. A NON-BREAKING SPACE
 * between them, and it is B18 rather than typography: with an ordinary space
 * the line wrapped wherever it liked and where it liked was inside a figure.
 */
const termText = (term: { key: string; label: string; amount: Money }): string =>
  MARK[term.key] === undefined
    ? `${term.label} ${formatSignedToFitUnmarked(term.amount, TERM_FITS)}`
    : formatSignedToFitUnmarked(term.amount, TERM_FITS);

/** Was this person's share of this rule typed by the host rather than split? */
const handSet = (rule: MoneyRule | undefined, playerId: PlayerId): boolean =>
  rule !== undefined && manualChargeOf(rule, playerId) !== undefined;

/**
 * One rule, itemised, as a lifted card.
 *
 * A percentage shows its working — "5% of 1,620" under the name, $81 at the
 * right — because a percentage is the one deduction nobody at the table can
 * check in their head.
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
  /* A rule that states what ONE person pays has no split to describe, and its
     rate belongs on the head — which a percentage has always done, and which
     "$5 an hour each" needs far more.

     THE ROWS STILL TURN ON `percent` and not on this. A percentage row shows
     its own working — "5% of $1,620" — and that working is a percentage's;
     a fee by the hour has a working of its own ("four hours at $5") which no
     frame draws yet, so its rows read as charges, which is what they are. */
  const perPerson = rule !== undefined && isPerPersonKind(rule.amountKind);
  const percent = rule?.amountKind === 'percent';
  const empty = deduction.total === 0;
  const byHand = (rule?.manualCharges ?? []).length;

  /*
   * THE RULE ITSELF, FROM ITS OWN BLOCK — 6 September.
   *
   * A ROW in this block opens `/share`, which answers "Petr's share of this is
   * wrong". Nothing here answered "the RULE is wrong" — five per cent should be
   * ten, the bill should be split equally rather than by the size of each win,
   * the piggy bank should charge everyone at the table. The only way to that
   * question was the chip at the foot of the screen, which lands on the LIST of
   * tonight's rules and leaves the reader to find again the one they were
   * already looking at and arguing about.
   *
   * The head of a block IS a rule — its name, its percentage, what it takes —
   * so it opens that rule, in the same editor `/money-rules` opens, writing
   * tonight's snapshot and never the club's default.
   *
   * `ruleId` rather than `rule`, because a narrowing on a parameter does not
   * survive into the callback and the sheet takes the id anyway.
   */
  const ruleId = rule?.id;
  const editable = admin && ruleId !== undefined;

  return (
    <Card>
      {/*
       * THE HEAD: the rule's name, a Change pill, and what it takes — the
       * board's `blockHead` (owner, 26 November: "each rule's card has a
       * Change pill in its head, opening that rule's editor"). The pill is the
       * door now, where the whole head with a chevron was; a power the reader
       * does not have is removed, not disabled, so a member gets the same head
       * with no pill on it.
       */}
      <View style={styles.blockTop}>
        <Text style={[styles.blockName, { color: t.text }]}>
          {perPerson && rule !== undefined ? `${deduction.name} · ${rateLabel(rule)}` : deduction.name}
        </Text>
        {editable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${deduction.name} · change the rule`}
            onPress={() =>
              ruleId !== undefined &&
              router.push({ pathname: '/rule', params: { id: ruleId } })
            }
            hitSlop={8}
            style={({ pressed }) => [styles.change, { backgroundColor: t.raised, opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="pencil" color={t.text} size={z(12)} />
            {/* The board's word (26 November). */}
            <Text style={[styles.changeLabel, { color: t.text }]}>Change</Text>
          </Pressable>
        )}
        <Text style={[styles.blockTotal, { color: empty ? t.muted : t.text }]} numberOfLines={1} {...cappedFigure}>
          {empty ? '—' : formatMoney(deduction.total)}
        </Text>
      </View>

      {!perPerson && (
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

      {/*
       * ONE PLAYER ROW PER SHARE, in the app's own rows (owner, 25 November):
       * the name, its working under it, the charge at the right, and the
       * pencil where the host may restate it.
       *
       * THE PENCIL MEANS WHAT IT DRAWS. It used to open the rule — which is
       * the answer to "this split is wrong", not to "Petr's share is wrong",
       * and the two are different arguments. The head's Change pill is the
       * first; a row is the second, and opens `/share`.
       *
       * THE WORKING: a percentage shows its sum, `5% of 1,620`, unmarked,
       * because its answer is the charge on the right of the same row and
       * carries the mark. A bill's share reads `share of the bill`, the
       * board's words (25 November). A share typed by hand says `by hand`
       * instead, because then there is no sum behind it. Any other rule's rows
       * read as charges, which is what they are, with no line under the name.
       */}
      <View>
        {(deduction.charges.length > 0 ? deduction.charges : placeholders(night, rule)).map(
          (c, i, all) => {
            const byHandRow = handSet(rule, c.playerId);
            const meta = byHandRow
              ? 'by hand'
              : percent && rule !== undefined
                ? `${rule.amount}% of ${formatToFitUnmarked(basisFor(c.playerId), WORKING_FITS)}`
                : deduction.destination === 'bill'
                  ? 'share of the bill'
                  : undefined;
            return (
              <CardRow
                key={c.playerId}
                name={nameOf(night, c.playerId)}
                {...(meta === undefined ? {} : { meta })}
                amount={c.amount === 0 ? '—' : formatMoney(c.amount)}
                {...(c.amount === 0 ? { amountColor: t.muted } : {})}
                last={i === all.length - 1}
                {...(!percent && admin
                  ? { trail: <Icon name="pencil" color={t.muted} size={z(15)} /> }
                  : {})}
                {...(admin && rule !== undefined
                  ? {
                      onPress: () =>
                        router.push({ pathname: '/share', params: { rule: rule.id, player: c.playerId } }),
                    }
                  : {})}
              />
            );
          },
        )}
      </View>
    </Card>
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
  /* A pushed screen's body: the board's 18 a side, its parts 12 apart. */
  body: { paddingHorizontal: z(18), paddingTop: z(12), gap: z(12) },
  /* `SpendList` brings the sheet's 20 itself; this takes it back to the 18. */
  outdent: { marginHorizontal: z(-20) },
  /* The kit's `para()`: 15 at 1.45, in the text colour. */
  para: { fontSize: z(15), fontWeight: '400', lineHeight: z(21.75) },
  /* The kit's `note()`: 13 at 1.45, muted, flush with the cards. */
  note: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },
  failure: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },

  /* The quiet `Preview` tag at the label's right: 700 10, tracked, on the raised grey. */
  tag: { paddingVertical: z(4), paddingHorizontal: z(7), borderRadius: 999 },
  tagText: { fontSize: z(10), fontWeight: '700', letterSpacing: 1 },

  /*
   * THE ROW, AND WHY IT IS NOT A GRID ANY MORE. The kit's `row()`: 44 at least,
   * `8 0`, a hairline between rows and none under the last. NO FILL AND NO
   * WASH ANYWHERE ON IT: the old columns were tinted so the eye could follow
   * one rule down six rows; a row that says its own rules needs nothing of the
   * kind, and a card of washed stripes is what B23 cost.
   */
  row: { flexDirection: 'row', alignItems: 'center', gap: z(10), minHeight: z(44), paddingVertical: z(8) },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6) },
  termLine: { flexDirection: 'row', alignItems: 'center', gap: z(4), marginTop: z(2) },
  term: { fontSize: z(12), fontWeight: '400', lineHeight: z(15), fontVariant: ['tabular-nums'], flexShrink: 0 },
  /*
   * NEVER SHRINKS — B18. The name and the line under it are words and may give;
   * a figure may not, and one left to shrink came apart into a dash on one line
   * and an amount on the next. The pill under the net is figures too, so the
   * whole right-hand column holds and the name gives.
   *
   * BUT NOT PAST 62%. With three or four terms at 360 and 120% text the pill
   * took the row and the game figure under the name was clipped to `+12.` —
   * a figure is a figure on either side (ui-journeys, 27 November). So the
   * column is capped and the pill wraps BETWEEN its terms, never inside one.
   */
  rowRight: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '62%' },
  rowNet: {
    fontFamily: 'head',
    fontSize: z(16.5),
    fontWeight: '700',
    lineHeight: z(18.2),
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  /* The kit's `terms()`: 500 11 in the figure face, `4 7`, 7 round, on the raised grey, 3 under the net. */
  pill: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', columnGap: z(6), rowGap: z(2), paddingVertical: z(4), paddingHorizontal: z(7), borderRadius: z(7), marginTop: z(3) },
  pillTerm: { flexDirection: 'row', alignItems: 'center', gap: z(3), flexShrink: 0 },
  pillText: { fontFamily: 'head', fontSize: z(11), fontWeight: '500', fontVariant: ['tabular-nums'] },

  /* The board's `blockHead`: `12 0 4`, the name taking what the pill and the total leave. */
  blockTop: { flexDirection: 'row', alignItems: 'center', gap: z(8), paddingTop: z(12), paddingBottom: z(4) },
  blockName: { flex: 1, minWidth: 0, fontFamily: 'head', fontSize: z(16), fontWeight: '700', lineHeight: z(19.2) },
  change: { flexDirection: 'row', alignItems: 'center', gap: z(5), paddingVertical: z(6), paddingHorizontal: z(10), borderRadius: 999 },
  changeLabel: { fontSize: z(12.5), fontWeight: '600' },
  blockTotal: { flexShrink: 0, fontFamily: 'head', fontSize: z(16.5), fontWeight: '700', fontVariant: ['tabular-nums'] },
  blockNote: { fontSize: z(12.5), fontWeight: '400', lineHeight: z(18.1), marginBottom: z(4) },
});

/*
 * THE BASIS OF A PERCENTAGE, in the working line under a name.
 *
 * Under the name since the full board, at 12/400, with the charge beside the
 * row. Seven figures fit; the eight of a table in the hundreds of millions did
 * not, and the line wrapped under a larger text setting when it shared the
 * name's line. The basis is that player's gross, which is the game term of
 * that person's row in the preview at the head of this screen.
 */
const WORKING_FITS = 10_000_000;

/*
 * WHERE THE PREVIEW'S OWN FIGURES RUN OUT, measured at 360 — the narrowest
 * phone in the matrix, inside a card that takes 12 a side out of the page's 18.
 *
 * A ROW holds about 300 points: the name and the game term on the left, the
 * net at 16.5/700 on the right with the terms pill under it, 10 between. The
 * words give and the figures do not, so the only question is what the right
 * column may take — "−$999,999" at about 82, and a pill of three terms at the
 * 11-point figure face about 120, leaves well over 100 for a name. Seven digits
 * print in full and eight abbreviate.
 *
 * A TERM is unmarked and there may be four of them — the game under the name,
 * the rest in the pill. Ten thousand is where a term abbreviates, so a table
 * playing for millions reads `+1.2M` rather than pushing the pill across the
 * name.
 *
 * `cappedFigure` holds the phone's text setting at the money cap on every
 * figure here, so none of this moves underneath the reader.
 */
const ROW_FITS = 1_000_000;
const TERM_FITS = 10_000;
