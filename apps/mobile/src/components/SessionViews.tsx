import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import {
  type BalanceCheck,
  type Money,
  type RuleDestination,
  type RuleOutcome,
  type SettledRow,
  type SettledTerm,
} from '@poker-club/core';
import {
  formatMoney,
  formatSignedToFit,
  formatSignedToFitUnmarked,
  formatToFit,
  formatToFitUnmarked,
} from '../lib/money';
import {
  SESSION_VIEWS,
  sessionViewHint,
  sessionViewLabel,
  type SessionView,
} from '../lib/sessionViewStore';
import { Dropdown } from './Dropdown';
import { Icon, type IconName } from './Icon';
import { moneyColor, useTheme } from '../design/useTheme';
import { T, z } from '../design/scale';
import { cappedFigure, tabular, type Theme } from '../design/tokens';

/**
 * THE PAST SESSION — `design/handoff-session-views/Artboards - Session Views.dc.html`,
 * frames `10a`–`10d`, cut 9 September. It supersedes the 8 September
 * score-breakdown cut ON THIS SCREEN and nowhere else: `/stats` and `/games`
 * keep the rolled-up night row in `ScoreBreakdown.tsx`, which this cut does not
 * speak about.
 *
 * ONE LIST READ THREE WAYS, and a single control in the meta line switches
 * between them. The rank line — rank, name, figure — never moves; only the
 * annotation under each name, the block under the table and the footer button
 * change. That is the layout's whole claim, and it is why the three views are a
 * property of the ROW rather than three components.
 *
 *   FINAL, DETAILED  the settled net, over the poker result and then every
 *                    spend the player incurred, itemised in a tinted group.
 *                    The default.
 *   FINAL, GROUPED   the same nets, the two stacks, the spends as one figure.
 *   ON TABLE         cash-out less buy-in — the result BEFORE spends, which
 *                    sums to zero and is the check the room runs.
 *
 * ⚠ TWO THINGS ON THIS LINE ARE NOT THE CUT'S, both from 19 September. Final,
 * detailed prints the poker result where the handoff prints the buy-in and the
 * cash-out — `GameTerm` has the whole of it, and the other two views draw both
 * stacks as drawn. And NO TERM ON THE LINE CARRIES A CURRENCY MARK in any of
 * the three: a working is unmarked and the figure it comes to is not, which is
 * the app's rule now and is written down in `money.ts`.
 *
 * WHAT CHANGED FROM THE SCREEN THIS REPLACES, and each one is a decision rather
 * than a restyle:
 *
 *   · NO CHEVRONS. The handoff is explicit: *"an earlier version fenced every
 *     row and read as noise"* — and that earlier version was ours.
 *
 * ⚠ AND THE FULL BOARD REDREW ALL OF IT IN THE APPROVED LOOK (`settled`,
 * `settled-grouped`, `settled-on-table`, `settled-view-menu` in
 * `design/explorations/full-board/`, approved 22–23 November), which wins over
 * the session-views cut on LOOK and leaves its behaviour alone:
 *
 *   · THE LIST IS ONE LIFTED CARD of the kit's rows — name over its working at
 *     the left, the net over the evening's terms at the right — with the kit's
 *     hairline between rows. The rank number and the 60-point unfenced row are
 *     gone with the drawing that had them; the order is still the ranking.
 *   · EVERY ANNOTATION IS THE KIT'S MUTED, the bone `annotation` tokens off this
 *     screen, and the itemised spends sit in the kit's `terms` pill (`raised`).
 *   · THE BLOCKS UNDER THE LIST are a quiet section label with lines under it,
 *     the label carrying the block's total at its right end.
 *
 * NOTHING HERE ADDS ANYTHING UP. Every figure is a `SettledTerm` or a
 * `SettledRow.net` off the engine, the deduction rows are `ruleOutcomes()`, and
 * the chips block is `balanceCheck()`. `CLAUDE.md` — a screen that sums its own
 * column is a second, untested implementation of `settle()`.
 */

/** The three glyphs the annotation line and the block share. */
const SPEND_GLYPH: Record<RuleDestination, IconName | null> = {
  bill: 'food',
  kitty: 'piggy',
  /* No glyph was drawn for either — see `SpendPair`, which prints the word. */
  host_fee: null,
  next_pot: null,
};

/**
 * ONE PLAYER'S FINISHED NIGHT — a kit row in the list's card, two lines, and
 * the top one is the same in all three views.
 *
 * `row` is the engine's. `view` decides only what goes on the annotation line,
 * and the caller has already asked `settledRows` for the mode that matches — so
 * a row cannot print `On table`'s figure over `Final`'s terms.
 *
 * ⚠ TWO LINES, NOT TWO COLUMNS, though the board draws name-over-meta beside
 * net-over-terms. The night pass (`ui-journeys.mjs`) reads the annotation line
 * as the row's LAST CHILD and its pairs as that line's children; the two lines
 * draw the same picture, left and right, and keep that structure.
 */
export function SessionRow({
  row,
  view,
  onPress,
  onSpends,
  last = false,
}: {
  /**
   * 1-based, the list's own order. Kept for the callers; since the full board
   * the row draws no rank number — the list's position is the ranking.
   */
  rank: number;
  row: SettledRow;
  view: SessionView;
  /** The last row in its card drops the hairline under it. */
  last?: boolean;
  /** Opens that player's detail — the handoff's row tap. */
  onPress?: () => void;
  /** The tinted group's own tap, which opens the deductions instead. */
  onSpends?: () => void;
}) {
  const t = useTheme();
  const spends = row.terms.filter((x) => x.kind === 'spend' || x.kind === 'back');
  /*
   * FINAL, DETAILED DRAWS THE GAME AND NOT THE TWO STACKS — the owner's
   * decision of 19 September, and the one place this screen departs from the
   * 9 September cut's annotation line. See the note on `GameTerm`.
   *
   * THE STEP STAYS whichever view is on, because it is the one chip term that
   * is not a stack: a night that settled to a step carries it inside the figure
   * on the right, and a row printing `game` and its spends beside a rounded net
   * would be a row that does not add up. `in` and `out` are what come off, and
   * `game` is what they say.
   */
  const asGame = view === 'finalDetailed';
  const chips = row.terms.filter(
    (x) =>
      x.kind !== 'spend' &&
      x.kind !== 'back' &&
      !(asGame && (x.kind === 'in' || x.kind === 'out')),
  );

  const body = (
    <>
      {/* THE RANK LINE. Unchanged across all three views — that is the rule the
          whole control rests on, so nothing about it may read `view`. */}
      <View style={styles.rankLine}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {row.player.name}
        </Text>
        <Text
          testID="session-net"
          style={[
            styles.figure,
            tabular,
            { color: row.net === 0 ? t.muted : moneyColor(t, row.net) },
          ]}
          numberOfLines={1}
          {...cappedFigure}
        >
          {formatSignedToFit(row.net, ROW_FITS)}
        </Text>
      </View>

      {/* THE ANNOTATION LINE. The working at its left, under the name — the
          kit's row `meta` — and the evening at its right, under the net — the
          row's `under`. */}
      <View style={styles.annotation}>
        {asGame && <GameTerm amount={row.atTheTable} theme={t} />}

        {chips.map((term) => (
          <SpendPair key={termKey(term)} term={term} theme={t} size={z(12)} figure={z(12)} />
        ))}

        {view === 'onTable' ? (
          /* NO SPEND MARKS IN THIS VIEW, and the words say why rather than the
             absence having to. Spends do not exist here — the figure on the
             right is the poker result and nothing has been taken off it. */
          <Text style={[styles.before, { color: t.muted }]} numberOfLines={1}>
            before spends
          </Text>
        ) : spends.length === 0 ? null : view === 'finalDetailed' ? (
          <Itemised spends={spends} theme={t} {...(onSpends === undefined ? {} : { onSpends })} />
        ) : (
          <Grouped spends={spends} theme={t} />
        )}
      </View>
    </>
  );

  /* The kit's row: a hairline under every row but the card's last. */
  const rowStyle = [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.hairline }];

  if (onPress === undefined) {
    return (
      <View testID="session-row" style={rowStyle}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID="session-row"
      accessibilityRole="button"
      accessibilityLabel={`${row.player.name}, ${formatSignedToFit(row.net, ROW_FITS)}`}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/**
 * WHAT THE POKER DID, IN ONE FIGURE — `+4,200`, and it opens a Final, detailed
 * annotation line.
 *
 * ⚠ THIS REPLACES THE TWO STACKS ON THAT VIEW, and it is a departure from
 * `design/handoff-session-views/`, which draws the buy-in and the cash-out
 * under every name in all three. The owner's decision of 19 September, and the
 * reasoning is the reading order of the line:
 *
 *   · THE FIGURE THIS VIEW RANKS ON IS THE SETTLED NET, which is the poker
 *     result with the evening taken off it. `↓ −$500 ↑ +$4,700` is not that
 *     result — it is the two numbers a reader has to subtract to get it, under
 *     a row whose other three figures are already the deductions being applied
 *     to it. One term per step of the sum is what the sum reads as.
 *   · NOTHING IS LOST. On table is the view with both stacks on it, one row
 *     each, and the cut's own `CHIPS` block totals them under the list. A
 *     person checking what somebody put in has a view that answers it.
 *
 * ⚠ AND IT IS DRAWN WITHOUT THE WORD `game`, which it carried for half a day.
 * The line's other terms name themselves with a mark — a fork, a piggy bank —
 * and the poker is the one term that needs no telling apart: it is the first
 * figure on every row, it is the only one there on a night that charged
 * nothing, and the screen it is on is a list of poker results. A word in front
 * of it was labelling the subject of the screen.
 *
 * `row.atTheTable` is the engine's `grossResult` — cash-out less buy-in, never
 * rounded, never deducted from — so this adds nothing up. It is the same figure
 * On table prints beside the name, which is what makes `Σ game === 0` a check
 * this line can be held to on either view.
 *
 * UNMARKED, like every term on this line — see `SpendPair`.
 */
function GameTerm({ amount, theme: t }: { amount: Money; theme: Theme }) {
  return (
    <Text
      testID="session-game"
      style={[styles.pairFigure, tabular, { color: t.muted, fontSize: z(12) }]}
      numberOfLines={1}
      {...cappedFigure}
    >
      {formatSignedToFitUnmarked(amount, ROW_FITS)}
    </Text>
  );
}

/**
 * `10a` — every spend the player incurred, each with its own figure, inside the
 * kit's `terms` pill (the full board's `settled`: `raised`, radius 7).
 *
 * THE GROUP IS ONE TAP TARGET and it opens the deductions screen. It is the
 * only thing on the row that does not open the player, because the deductions
 * are the one part of a row with more to say than a figure: who fronted which
 * bill, and who is holding what is left.
 *
 * A CATEGORY WITH NO AMOUNT IS OMITTED, NEVER ZEROED — the handoff's rule, and
 * `settledRows` is what decides it: a term is on the row because the night
 * charged it. Rows are variable width by design.
 */
function Itemised({
  spends,
  theme: t,
  onSpends,
}: {
  spends: readonly SettledTerm[];
  theme: Theme;
  onSpends?: () => void;
}) {
  const inner = fold(spends).map(({ spend, back }) => (
    <SpendPair
      key={termKey(spend)}
      term={spend}
      {...(back === undefined ? {} : { back })}
      theme={t}
      size={z(12)}
      figure={z(11)}
    />
  ));
  const style = [styles.group, { backgroundColor: t.raised }];

  if (onSpends === undefined) {
    return (
      <View testID="session-spend-group" style={style}>
        {inner}
      </View>
    );
  }
  return (
    <Pressable
      testID="session-spend-group"
      accessibilityRole="button"
      accessibilityLabel="What the evening took, in full"
      onPress={onSpends}
      style={style}
    >
      {inner}
    </Pressable>
  );
}

/**
 * `10b` — the same marks with no individual figures, then one figure: what the
 * evening cost that player. Muted, like the rest of the line (the full board's
 * `settled-grouped`).
 *
 * Five figures on a row instead of seven, which is the whole of the trade. The
 * marks stay because WHICH things a person paid for is the half of it a figure
 * cannot say.
 */
function Grouped({ spends, theme: t }: { spends: readonly SettledTerm[]; theme: Theme }) {
  return (
    <View style={styles.grouped}>
      {spends
        .map((term) => ({ term, glyph: glyphFor(term) }))
        .filter((g): g is { term: SettledTerm; glyph: IconName } => g.glyph !== null)
        /* A repayment is not a second mark — it is the same bill coming back,
           and it is inside the total beside them. */
        .filter((g) => g.term.kind === 'spend')
        .map((g) => (
          <Icon key={termKey(g.term)} name={g.glyph} color={t.muted} size={z(12)} />
        ))}
      <Text style={[styles.groupedTotal, tabular, { color: t.muted }]} {...cappedFigure}>
        {/* UNMARKED. It is the itemised view's three figures rolled into one and
            it sits on the same line they do — a sub-total inside the working, not
            the answer the working comes to. */}
        {formatSignedToFitUnmarked(spendTotal(spends), ROW_FITS)}
      </Text>
    </View>
  );
}

/**
 * A GLYPH AND ITS FIGURE, 4 apart — the atom every annotation line is made of.
 *
 * Both in the kit's muted (the full board), under the name and under the net.
 * Nothing on this line is ever green or red.
 */
function SpendPair({
  term,
  back,
  theme: t,
  size,
  figure,
}: {
  term: SettledTerm;
  /**
   * A bill that was FRONTED carries two figures behind one mark —
   * `−$31 +$120`. Two forks side by side read as two bills, and a line break
   * between them reads as a fourth deduction; both are the same fact about one
   * bill, so they share its glyph. Both are muted: the sign is what says
   * which way the money went, which is why every figure on this line is signed.
   */
  back?: SettledTerm;
  theme: Theme;
  /** The glyph and the figure, already through `z()`: 12/12 on the open line, 12/11 in the pill. */
  size: number;
  figure: number;
}) {
  const glyph = glyphFor(term);
  return (
    <View style={styles.pair}>
      {/*
       * ⚠ NO GLYPH FOR TWO DESTINATIONS, AND THE WORD INSTEAD. The handoff
       * draws marks for food, drinks and the piggy bank; this app's rules also
       * reach a host's fee and a next-pot rule, which no board has ever drawn.
       * Dropping their figure is the one thing this line may not do — the row
       * has to come to the figure beside it — so they print the word the app
       * already uses on a formula line. Flagged, not passed off as design.
       */}
      {glyph === null ? (
        <Text style={[styles.word, { color: t.muted, fontSize: figure }]} numberOfLines={1}>
          {wordFor(term)}
        </Text>
      ) : (
        <Icon name={glyph} color={t.muted} size={size} />
      )}
      <Text
        style={[styles.pairFigure, tabular, { color: t.muted, fontSize: figure }]}
        numberOfLines={1}
        {...cappedFigure}
      >
        {signed(term)}
      </Text>
      {back !== undefined && (
        <Text
          style={[styles.pairFigure, tabular, { color: t.muted, fontSize: figure }]}
          numberOfLines={1}
          {...cappedFigure}
        >
          {signed(back)}
        </Text>
      )}
    </View>
  );
}

/**
 * THE ITEMISED LINE'S PAIRS, with each repayment folded into the charge it
 * belongs to.
 *
 * `settledRows` returns the two apart, and that is the point of them — what a
 * bill CHARGED somebody is the group's rule applying to them, and what it PAID
 * BACK is their own money returning. Folding them is the SCREEN's business:
 * two facts, one mark.
 *
 * A `back` with no charge in front of it stands alone, which is somebody who
 * fronted the food and was charged nothing for it.
 */
function fold(spends: readonly SettledTerm[]): Array<{ spend: SettledTerm; back?: SettledTerm }> {
  const out: Array<{ spend: SettledTerm; back?: SettledTerm }> = [];
  for (const term of spends) {
    const charge =
      term.kind === 'back'
        ? out.find((p) => p.spend.kind === 'spend' && p.spend.destination === term.destination)
        : undefined;
    if (charge !== undefined) charge.back = term;
    else out.push({ spend: term });
  }
  return out;
}

/**
 * THE VIEW CONTROL — closed in the meta line, open as a menu anchored to it.
 *
 * A MENU AND NOT A SHEET, which is the handoff's own word and a departure from
 * `docs/09-navigation.md`'s two vocabularies worth stating: a sheet is a place
 * you go and this is a property of the screen you are already on, chosen and
 * dismissed without leaving it. It is 226 wide, right-aligned under the
 * control, and everything behind it drops to 32% — the list and the block, not
 * the chrome, because the chrome is what the control belongs to.
 *
 * THE LABEL IS THE ACTIVE VIEW'S NAME, never a static word. That is what makes
 * the closed control readable as a state rather than as a button.
 */
export function ViewControl({
  view,
  open,
  onOpenChange,
  onPick,
}: {
  view: SessionView;
  /**
   * OPEN IS THE SCREEN'S, not the control's, and that is not tidiness: while
   * the menu is up everything behind it drops to 32%, and "everything behind
   * it" is the list and the block — neither of which the control can reach.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (v: SessionView) => void;
}) {
  return (
    <Dropdown
      testID="session-view-control"
      items={SESSION_VIEWS.map((v) => ({
        value: v,
        label: sessionViewLabel(v),
        hint: sessionViewHint(v),
      }))}
      value={view}
      open={open}
      onOpenChange={onOpenChange}
      onPick={onPick}
      accessibilityLabel={`Reading ${sessionViewLabel(view)}. Change the view.`}
    />
  );
}

/* The 32% the list and the block drop to is `Dropdown`'s, and re-exported here
   so a screen drawing this control does not have to know which file owns the
   number. One value, one place. */
export { MENU_DIM } from './Dropdown';

/**
 * THE BLOCK UNDER THE TABLE — `DEDUCTIONS` on both Final views.
 *
 * One line per rule that took something: its glyph, its own name, who fronted it
 * or who is holding it, and what it took. It is the half of the night a figure
 * on a row cannot state, which is why the tinted group opens it in full.
 *
 * THE FULL BOARD'S BLOCK (`settled`, `settled-grouped`): a quiet section label
 * with the total at its right end, and the lines under it on the sheet — not a
 * card, because it is the list's footnote rather than a group of its own.
 *
 * ⚠ ONE ROOT VIEW, LABEL AND LINES TOGETHER. The night pass measures this block
 * as the list card's next sibling and counts its whole height against the
 * eight-row budget; a label drawn as a sibling of its own would fall out of it.
 */
export function DeductionsBlock({ outcomes, total }: { outcomes: RuleOutcome[]; total: Money }) {
  const t = useTheme();
  if (outcomes.length === 0) return null;

  return (
    <View style={styles.block}>
      <BlockLabel
        text="Deductions"
        right={
          <Text style={[styles.blockTotal, tabular, { color: t.text }]} {...cappedFigure}>
            {formatToFit(total, ROW_FITS)}
          </Text>
        }
      />

      <View style={styles.blockLines}>
        {outcomes.map((o) => (
          <View key={o.ruleId} style={styles.blockRow}>
            <Glyph destination={o.destination} theme={t} />
            <Text style={[styles.blockName, { color: t.text }]} numberOfLines={1}>
              {o.name}
            </Text>
            <Text
              style={[styles.blockHolder, { color: t.muted }]}
              numberOfLines={1}
              /* For ui-journeys: the names a bill row carries, since the verb went (owner, 23 November). */
              testID={o.destination === 'bill' ? 'bill-fronters' : undefined}
            >
              {holder(o)}
            </Text>
            <Text style={[styles.blockAmount, tabular, { color: t.text }]} {...cappedFigure}>
              {formatToFit(o.total, ROW_FITS)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * `10c`'s block — `CHIPS`, and the check the room runs before it accepts the
 * final.
 *
 * Money is neither made nor destroyed at a poker table, so the column above
 * sums to nothing — and this states the two sides that produced the zero rather
 * than only the zero, because a bare `$0` is not checkable against anything.
 * Every figure and every count is `balanceCheck()`'s.
 *
 * The full board's `settled-on-table`: the same quiet label and lines as the
 * deductions, the verdict at the label's right end, the footnote under it.
 */
export function ChipsBlock({ balance, offTable }: { balance: BalanceCheck; offTable: Money }) {
  const t = useTheme();
  const people = balance.countedPlayers + balance.cashedOutPlayers;

  return (
    <View style={styles.block}>
      <BlockLabel
        text="Chips"
        right={
          /*
           * ⚠ THE WORD IS THE ENGINE'S VERDICT, NOT THE SCREEN'S. `state` is
           * `balanceCheck`'s own, and a night that did not come out right says so
           * here rather than printing `balanced` over a hole.
           */
          <Text style={[styles.blockTotal, { color: t.text }]}>
            {balance.state === 'balanced' ? 'balanced' : balance.state}
          </Text>
        }
      />

      <View style={styles.blockLines}>
        <View style={styles.blockRow}>
          <Icon name="chipsIn" color={t.muted} size={z(14)} />
          <Text style={[styles.blockName, { color: t.text }]}>In</Text>
          <Text style={[styles.blockHolder, { color: t.muted }]} numberOfLines={1}>
            {`${balance.entries} ${balance.entries === 1 ? 'buy-in' : 'buy-ins'}`}
          </Text>
          <Text style={[styles.blockAmount, tabular, { color: t.text }]} {...cappedFigure}>
            {formatToFit(balance.boughtIn, ROW_FITS)}
          </Text>
        </View>

        <View style={styles.blockRow}>
          <Icon name="chipsOut" color={t.muted} size={z(14)} />
          <Text style={[styles.blockName, { color: t.text }]}>Out</Text>
          <Text style={[styles.blockHolder, { color: t.muted }]} numberOfLines={1}>
            {`${people} counted`}
          </Text>
          <Text style={[styles.blockAmount, tabular, { color: t.text }]} {...cappedFigure}>
            {formatToFit(balance.accountedFor, ROW_FITS)}
          </Text>
        </View>
      </View>

      {/* Drawn only where there IS something not applied — a night with no rule
          would be explaining an absence nobody noticed. */}
      {offTable !== 0 && (
        <Text style={[styles.footnote, { color: t.muted }]}>
          {`${formatMoney(offTable)} of spends is not applied in this view.`}
        </Text>
      )}
    </View>
  );
}

/**
 * The kit's quiet section label, with a figure or a word at its right end.
 *
 * NOT `Card.tsx`'s `SectionLabel`, which upper-cases the string itself: the
 * night pass finds these two blocks by their words (`Deductions`, `Chips`), so
 * the words stay as written and the stylesheet does the capitals, as it always
 * has on this block.
 */
function BlockLabel({ text, right }: { text: string; right: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.blockHead}>
      <Text style={[T.lookLabel, styles.blockLabel, { color: t.muted }]}>{text}</Text>
      {right}
    </View>
  );
}

/** A block row's mark, a step larger than the annotation line's (the board's 14). */
function Glyph({ destination, theme: t }: { destination: RuleDestination; theme: Theme }) {
  const name = SPEND_GLYPH[destination];
  if (name === null) return <View style={styles.noGlyph} />;
  return <Icon name={name} color={t.muted} size={z(14)} />;
}

/**
 * `Lena, Andro`, `held by the group`.
 *
 * A BILL NAMES THE PEOPLE, because somebody is owed for it and this row is
 * where that is said. Every other kind names nobody in particular: the take
 * goes to a collector holding it on the room's behalf.
 *
 * ⚠ THE NAMES AND NOTHING ELSE — the owner, 23 November, on the full board
 * (`settled-grouped`, "a shorter format"): `Lena and Andro fronted` became
 * `Lena, Andro`. The line sits in the muted ink beside the bill's own name, so
 * the verb was saying what the place already does. More than two run on with
 * commas and the line ellipsises like every other holder.
 *
 * ⚠ THE HANDOFF WRITES `jar collects` AND THIS DOES NOT. `Piggy bank, never
 * Kitty` has been the app's rule since the money rules were written and
 * `destinationWord` in core owns the spelling; `jar` would be a fourth word for
 * the same envelope, on one screen. `held by the group` is the sentence this
 * app already ships for the same fact. Recorded in `docs/screens.md`.
 */
function holder(o: RuleOutcome): string {
  if (o.destination !== 'bill') return 'held by the group';

  const names = o.paidTo.filter((c) => c.amount !== 0).map((c) => c.name);
  if (names.length === 0) return 'nobody fronted it';
  return names.join(', ');
}

/** Which mark a term is, and null where the handoff drew none. */
function glyphFor(term: SettledTerm): IconName | null {
  switch (term.kind) {
    case 'in':
      return 'chipsIn';
    case 'out':
      return 'chipsOut';
    /* The step has no mark in any drawn set and needs none: its sign is the one
       thing about it that is not fixed by its name. */
    case 'rounded':
      return null;
    default:
      return term.destination === null ? null : SPEND_GLYPH[term.destination];
  }
}

/** `host`, `next pot` — the word where no mark was drawn. */
function wordFor(term: SettledTerm): string {
  if (term.destination === null) return '';
  return term.destination === 'host_fee' ? 'host' : 'next pot';
}

/**
 * THE FIGURE, SIGNED AS THE ROW READS IT, AND UNMARKED.
 *
 * `in` and every spend come off them, so both print a minus the engine does not
 * carry — `SettledTerm.amount` is a magnitude and the sign is the screen's.
 * `out` and `back` are money arriving. `rounded` is already signed.
 *
 * NO CURRENCY MARK ON ANY OF THEM — the rule of 19 September, in `money.ts`:
 * these are the terms of the sum that comes to the figure beside the name, and
 * that figure is where the night's currency is stated. Six marks down one line
 * are six copies of one fact, in the place with the least room for them.
 */
function signed(term: SettledTerm): string {
  if (term.kind === 'rounded') return formatSignedToFitUnmarked(term.amount, ROW_FITS);
  const arriving = term.kind === 'out' || term.kind === 'back';
  return `${arriving ? '+' : '−'}${formatToFitUnmarked(term.amount, ROW_FITS)}`;
}

/**
 * WHAT THE EVENING COST THEM, NET — the one figure on a grouped row.
 *
 * ⚠ THE ONE SUM IN THIS FILE, and it is a sum over terms the engine put on the
 * row rather than over a column of the night. `settledRows` cannot carry it: it
 * is the grouped LAYOUT's figure, the itemised view never prints it, and a
 * field only one drawing reads is the field the other drawing forgets to keep
 * true. It nets a bill's repayment on purpose — somebody who paid for the food
 * and owes a share of it is out `−$54 + $242`, and this figure answers "what
 * did the evening cost me" in one.
 */
function spendTotal(spends: readonly SettledTerm[]): Money {
  return spends.reduce(
    (running, term) => (running + (term.kind === 'back' ? term.amount : -term.amount)) as Money,
    0 as Money,
  );
}

/** Stable across renders. A destination appears at most once per kind. */
const termKey = (term: SettledTerm): string =>
  term.destination === null ? term.kind : `${term.kind}:${term.destination}`;

const styles = StyleSheet.create({
  /*
   * THE KIT'S ROW — `min-height 44`, `8px 0`, a hairline under it (drawn by the
   * row, not here, since the card's last row has none) — with its two lines 3
   * apart. NO chevron: nothing points.
   *
   * `minHeight` rather than `height`, so the row grows with the reader's text
   * setting rather than clipping a name at 120%. At the drawn sizes it is about
   * 56 of the board's points, which is the eight-row budget the night pass
   * holds this list to (`ui-journeys.mjs`, "room for an eight-handed night").
   */
  row: { minHeight: z(44), paddingVertical: z(8), justifyContent: 'center', gap: z(3) },
  pressed: { opacity: 0.6 },

  rankLine: { flexDirection: 'row', alignItems: 'center', gap: z(10) },
  /* The kit's row name, 600 15.5/1.2. */
  name: { fontSize: z(15.5), fontWeight: '600', lineHeight: z(18.6), flexShrink: 1 },
  /*
   * NEVER SHRINKS. The name may give — it is a word — and a figure may not:
   * left to shrink, "−$12,000" came apart into a dash on one line and an amount
   * on the next, which reads as two things. See B18. The kit's row figure,
   * 700 16.5/1.1 in the figure face.
   */
  figure: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontFamily: 'head',
    fontSize: z(16.5),
    fontWeight: '700',
    lineHeight: z(18.2),
  },

  /*
   * IT WRAPS RATHER THAN RUNNING PAST THE MARGIN. The board draws every
   * annotation on one line and at its own figures it is — but a night in the
   * hundreds of thousands puts `−$117,600` in the pill, and pushed right by
   * `marginLeft: auto` that ran off the page rather than folding. A wrapped
   * pair is still a whole pair; a pair with its figure past the edge is a
   * figure nobody can read. `ui-journeys.mjs` plays the night at three scales
   * and this is the one that found it.
   *
   * The row is `minHeight` for the same reason, so a wrapped line grows the row
   * instead of clipping inside it.
   */
  annotation: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: z(10),
    rowGap: z(4),
  },
  pair: { flexDirection: 'row', alignItems: 'center', gap: z(4) },
  /* Every money figure in the figure face (round eight). */
  pairFigure: { fontFamily: 'head', fontWeight: '400', lineHeight: z(15) },
  word: { fontWeight: '400', lineHeight: z(15) },
  /* The kit's `.a small`: 500 11.5. */
  before: { marginLeft: 'auto', fontSize: z(11.5), fontWeight: '500', lineHeight: z(14) },

  /* The kit's `terms`: `4px 7px` at radius 7, 5 between its pairs. */
  group: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: z(5),
    paddingVertical: z(4),
    paddingHorizontal: z(7),
    borderRadius: z(7),
  },
  grouped: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: z(5) },
  groupedTotal: { fontFamily: 'head', fontSize: z(11.5), fontWeight: '500', lineHeight: z(14) },

  /* The control and its menu are `Dropdown`'s — see `ViewControl` above. Their
     geometry lived here until 9 September, when a second screen wanted the same
     object and a third one wanted it twice. */

  /*
   * THE BLOCK: a quiet label, then its lines 6 apart (the board's `block()`),
   * 2 in from the card's edge like the label. The 12 between the label and the
   * lines is the board's body gap, less the 4 the label pulls up under itself.
   */
  block: { gap: z(12) },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(8),
    marginHorizontal: z(2),
    marginTop: z(4),
    marginBottom: z(-4),
  },
  blockLabel: { textTransform: 'uppercase' },
  /* The label's right end: the kit's `.lbl .r`, 700 13 in the figure face. */
  blockTotal: { marginLeft: 'auto', fontFamily: 'head', fontSize: z(13), fontWeight: '700' },
  blockLines: { gap: z(6), marginHorizontal: z(2) },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: z(8) },
  blockName: { fontSize: z(12.5), fontWeight: '400', flexShrink: 1 },
  /* The holder takes what is left and gives first: `Lena, Andro` ellipsises. */
  blockHolder: { flex: 1, minWidth: 0, fontSize: z(12.5), fontWeight: '400' },
  blockAmount: { flexShrink: 0, fontFamily: 'head', fontSize: z(12.5), fontWeight: '700' },
  noGlyph: { width: z(14) },
  /* The kit's `note`: 13/1.45, muted. */
  footnote: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85) },
});

/*
 * WHERE A FIGURE ON THIS SCREEN RUNS OUT, measured at 360 — the narrowest phone
 * in the device matrix, where `z()` is about 1.15.
 *
 * The right-hand figure is the kit's 16.5/700 and never shrinks; "−$999,999" is
 * about 100 points there, inside a card row about 290 wide, which leaves more
 * than any name needs. Seven digits fit and eight do not, so a million is where
 * a result stops printing in full and `formatSignedToFit` drops to the compact
 * form — which the handoff forbids on this screen, so it is the point at which a
 * night is bigger than the layout rather than a point at which the layout is
 * wrong.
 *
 * THE ANNOTATION LINE IS WHAT RUNS OUT FIRST, and it is allowed to: it wraps,
 * and a wrapped pair is still a whole pair. `cappedFigure` holds the phone's
 * text setting at the money cap on every figure, so none of these measurements
 * moves underneath the reader.
 */
const ROW_FITS = 1_000_000;
