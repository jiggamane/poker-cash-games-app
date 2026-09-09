import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  type BalanceCheck,
  type Money,
  type RuleDestination,
  type RuleOutcome,
  type SettledRow,
  type SettledTerm,
} from '@poker-club/core';
import { formatMoney, formatSignedToFit, formatToFit } from '../lib/money';
import {
  SESSION_VIEWS,
  sessionViewHint,
  sessionViewLabel,
  type SessionView,
} from '../lib/sessionViewStore';
import { Dropdown } from './Dropdown';
import { Icon, type IconName } from './Icon';
import { moneyColor, useTheme } from '../design/useTheme';
import { cappedFigure, radius, space, tabular, unscaledLabel, type Theme } from '../design/tokens';

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
 *   FINAL, DETAILED  the settled net, with every spend the player incurred
 *                    itemised in a tinted group. The default.
 *   FINAL, GROUPED   the same nets, the spends collapsed to one figure.
 *   ON TABLE         cash-out less buy-in — the result BEFORE spends, which
 *                    sums to zero and is the check the room runs.
 *
 * WHAT CHANGED FROM THE SCREEN THIS REPLACES, and each one is a decision rather
 * than a restyle:
 *
 *   · NO RULES BETWEEN ROWS AND NO CHEVRONS. Row separation is the 60-point row
 *     height alone. The handoff is explicit: *"an earlier version fenced every
 *     row and read as noise"* — and that earlier version was ours.
 *   · A RANK NUMBER opens every row, 15 wide and dim, so the list reads as a
 *     ranking without the figures having to carry that job as well.
 *   · THE NAME IS 17/400, NOT 16/600. Only two things on a row are at full
 *     brightness — the name and the right-hand figure — and everything else is
 *     annotation. Weight is what separates the two lines, not colour.
 *   · A WARMER BONE. `annotation` (`#8C8578`) rather than `offTable`
 *     (`#D9D3C4`), so the annotation line sits clearly UNDER the name in the
 *     reading order. See the note on the token.
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
 * ONE PLAYER'S FINISHED NIGHT — 60 points, two lines, and the top one is the
 * same in all three views.
 *
 * `row` is the engine's. `view` decides only what goes on the right of the
 * annotation line, and the caller has already asked `settledRows` for the mode
 * that matches — so a row cannot print `On table`'s figure over `Final`'s
 * terms.
 */
export function SessionRow({
  rank,
  row,
  view,
  onPress,
  onSpends,
}: {
  /** 1-based, and the list's own order rather than anything computed here. */
  rank: number;
  row: SettledRow;
  view: SessionView;
  /** Opens that player's detail — the handoff's row tap. */
  onPress?: () => void;
  /** The tinted group's own tap, which opens the deductions instead. */
  onSpends?: () => void;
}) {
  const t = useTheme();
  const spends = row.terms.filter((x) => x.kind === 'spend' || x.kind === 'back');
  const chips = row.terms.filter((x) => x.kind !== 'spend' && x.kind !== 'back');

  const body = (
    <>
      {/* THE RANK LINE. Unchanged across all three views — that is the rule the
          whole control rests on, so nothing about it may read `view`. */}
      <View style={styles.rankLine}>
        <Text style={[styles.rank, tabular, { color: t.dim }]} {...unscaledLabel}>
          {rank}
        </Text>
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

      {/* THE ANNOTATION LINE. Indented 29 so it starts under the name rather
          than under the rank, which is what makes the rank read as a column. */}
      <View style={styles.annotation}>
        {chips.map((term) => (
          <SpendPair key={termKey(term)} term={term} theme={t} size={13} figure={12.5} />
        ))}

        {view === 'onTable' ? (
          /* NO SPEND MARKS IN THIS VIEW, and the words say why rather than the
             absence having to. Spends do not exist here — the figure on the
             right is the poker result and nothing has been taken off it. */
          <Text style={[styles.before, { color: t.annotation }]} numberOfLines={1}>
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

  if (onPress === undefined) {
    return (
      <View testID="session-row" style={styles.row}>
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
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/**
 * `10a` — every spend the player incurred, each with its own figure, inside a
 * tinted group.
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
      size={12}
      figure={12}
    />
  ));
  const style = [styles.group, { backgroundColor: t.annotationTint }];

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
 * `10b` — the same marks with no individual figures, then one bone figure: what
 * the evening cost that player.
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
          <Icon key={termKey(g.term)} name={g.glyph} color={t.annotationStroke} size={13} />
        ))}
      <Text style={[styles.groupedTotal, tabular, { color: t.annotation }]} {...cappedFigure}>
        {formatSignedToFit(spendTotal(spends), ROW_FITS)}
      </Text>
    </View>
  );
}

/**
 * A GLYPH AND ITS FIGURE, 4 apart — the atom every annotation line is made of.
 *
 * The stroke is `annotationStroke` and the figure is `annotation`: one step
 * apart, both under the name. Nothing on this line is ever green or red.
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
   * bill, so they share its glyph. Both are `annotation`: the sign is what says
   * which way the money went, which is why every figure on this line is signed.
   */
  back?: SettledTerm;
  theme: Theme;
  /** 13 on the open line, 12 inside the tinted group. */
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
        <Text style={[styles.word, { color: t.annotation, fontSize: figure }]} numberOfLines={1}>
          {wordFor(term)}
        </Text>
      ) : (
        <Icon name={glyph} color={t.annotationStroke} size={size} />
      )}
      <Text
        style={[styles.pairFigure, tabular, { color: t.annotation, fontSize: figure }]}
        numberOfLines={1}
        {...cappedFigure}
      >
        {signed(term)}
      </Text>
      {back !== undefined && (
        <Text
          style={[styles.pairFigure, tabular, { color: t.annotation, fontSize: figure }]}
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
 * One row per rule that took something: its glyph, its own name, who fronted it
 * or who is holding it, and what it took. It is the half of the night a figure
 * on a row cannot state, which is why the tinted group opens it in full.
 */
export function DeductionsBlock({ outcomes, total }: { outcomes: RuleOutcome[]; total: Money }) {
  const t = useTheme();
  if (outcomes.length === 0) return null;

  return (
    <View style={[styles.block, { borderTopColor: t.hairline }]}>
      <View style={styles.blockHead}>
        <Text style={[styles.blockLabel, { color: t.muted }]} {...unscaledLabel}>
          Deductions
        </Text>
        <Text style={[styles.blockTotal, tabular, { color: t.offTable }]} {...cappedFigure}>
          {formatToFit(total, ROW_FITS)}
        </Text>
      </View>

      {outcomes.map((o) => (
        <View key={o.ruleId} style={styles.blockRow}>
          <Glyph destination={o.destination} theme={t} />
          <Text style={[styles.blockName, { color: t.offTable }]} numberOfLines={1}>
            {o.name}
          </Text>
          <Text style={[styles.blockHolder, { color: t.annotation }]} numberOfLines={1}>
            {holder(o)}
          </Text>
          <Text style={[styles.blockAmount, tabular, { color: t.offTable }]} {...cappedFigure}>
            {formatToFit(o.total, ROW_FITS)}
          </Text>
        </View>
      ))}
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
 */
export function ChipsBlock({ balance, offTable }: { balance: BalanceCheck; offTable: Money }) {
  const t = useTheme();
  const people = balance.countedPlayers + balance.cashedOutPlayers;

  return (
    <View style={[styles.block, { borderTopColor: t.hairline }]}>
      <View style={styles.blockHead}>
        <Text style={[styles.blockLabel, { color: t.muted }]} {...unscaledLabel}>
          Chips
        </Text>
        {/*
         * ⚠ THE WORD IS THE ENGINE'S VERDICT, NOT THE SCREEN'S. `state` is
         * `balanceCheck`'s own, and a night that did not come out right says so
         * here rather than printing `balanced` over a hole.
         */}
        <Text style={[styles.blockTotal, { color: t.offTable }]}>
          {balance.state === 'balanced' ? 'balanced' : balance.state}
        </Text>
      </View>

      <View style={styles.blockRow}>
        <Icon name="chipsIn" color={t.annotationStroke} size={13} />
        <Text style={[styles.blockName, { color: t.offTable }]}>In</Text>
        <Text style={[styles.blockHolder, { color: t.annotation }]} numberOfLines={1}>
          {`${balance.entries} ${balance.entries === 1 ? 'buy-in' : 'buy-ins'}`}
        </Text>
        <Text style={[styles.blockAmount, tabular, { color: t.offTable }]} {...cappedFigure}>
          {formatToFit(balance.boughtIn, ROW_FITS)}
        </Text>
      </View>

      <View style={styles.blockRow}>
        <Icon name="chipsOut" color={t.annotationStroke} size={13} />
        <Text style={[styles.blockName, { color: t.offTable }]}>Out</Text>
        <Text style={[styles.blockHolder, { color: t.annotation }]} numberOfLines={1}>
          {`${people} counted`}
        </Text>
        <Text style={[styles.blockAmount, tabular, { color: t.offTable }]} {...cappedFigure}>
          {formatToFit(balance.accountedFor, ROW_FITS)}
        </Text>
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

/** A block row's mark, at the same optical size as the annotation line's. */
function Glyph({ destination, theme: t }: { destination: RuleDestination; theme: Theme }) {
  const name = SPEND_GLYPH[destination];
  if (name === null) return <View style={styles.noGlyph} />;
  return <Icon name={name} color={t.annotationStroke} size={13} />;
}

/**
 * `Dana fronted`, `held by the group`.
 *
 * A BILL NAMES THE PEOPLE, because somebody is owed for it and this row is
 * where that is said. Every other kind names nobody in particular: the take
 * goes to a collector holding it on the room's behalf.
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
  if (names.length === 1) return `${names[0]} fronted`;
  if (names.length === 2) return `${names[0]} and ${names[1]} fronted`;
  return `${names[0]} and ${names.length - 1} others fronted`;
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
 * THE FIGURE, SIGNED AS THE ROW READS IT.
 *
 * `in` and every spend come off them, so both print a minus the engine does not
 * carry — `SettledTerm.amount` is a magnitude and the sign is the screen's.
 * `out` and `back` are money arriving. `rounded` is already signed.
 */
function signed(term: SettledTerm): string {
  if (term.kind === 'rounded') return formatSignedToFit(term.amount, ROW_FITS);
  const arriving = term.kind === 'out' || term.kind === 'back';
  return `${arriving ? '+' : '−'}${formatToFit(term.amount, ROW_FITS)}`;
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
   * 60 POINTS, TWO LINES, 5 APART — and NO hairline and NO chevron. The list's
   * separation is the row height alone, which is the handoff's central point:
   * *"an earlier version fenced every row and read as noise"*.
   *
   * `minHeight` rather than `height`, so the row grows with the reader's text
   * setting rather than clipping a name at 120%. At the drawn sizes it is
   * exactly 60 and eight rows are exactly 480.
   */
  row: { minHeight: 60, justifyContent: 'center', gap: 5 },
  pressed: { opacity: 0.6 },

  rankLine: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  /* Fixed 15 wide so the names line up whatever the rank is. */
  rank: { width: 15, fontSize: 13, fontWeight: '400', lineHeight: 20 },
  name: { fontSize: 17, fontWeight: '400', lineHeight: 20, flexShrink: 1 },
  /*
   * NEVER SHRINKS. The name may give — it is a word — and a figure may not:
   * left to shrink, "−$12,000" came apart into a dash on one line and an amount
   * on the next, which reads as two things. See B18.
   */
  figure: { marginLeft: 'auto', flexShrink: 0, fontSize: 17, fontWeight: '600', lineHeight: 20 },

  /*
   * 29 = the rank's 15 plus its 14 gap, so this starts under the name.
   *
   * IT WRAPS RATHER THAN RUNNING PAST THE MARGIN. The handoff draws every
   * annotation on one line and at its own figures it is — but a night in the
   * hundreds of thousands puts `−$117,600` in the tinted group, and pushed
   * right by `marginLeft: auto` that ran off the page rather than folding. A
   * wrapped pair is still a whole pair; a pair with its figure past the edge is
   * a figure nobody can read. `ui-journeys.mjs` plays the night at three scales
   * and this is the one that found it.
   *
   * The row is `minHeight` for the same reason, so a wrapped line grows the row
   * instead of clipping inside it.
   */
  annotation: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 4,
    paddingLeft: 29,
  },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pairFigure: { fontWeight: '400', lineHeight: 16 },
  word: { fontWeight: '400', lineHeight: 16 },
  before: { marginLeft: 'auto', fontSize: 12, fontWeight: '400', lineHeight: 16 },

  /* The tinted group: `3px 9px` at radius 8, 9 between its pairs. */
  group: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radius.pressable,
  },
  grouped: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 7 },
  groupedTotal: { fontSize: 12.5, fontWeight: '400', lineHeight: 16 },

  /* The control lives in the meta line and the menu hangs off it, so this is
     the positioned parent and nothing above it needs to know. */
  /* The control and its menu are `Dropdown`'s — see `ViewControl` above. Their
     geometry lived here until 9 September, when a second screen wanted the same
     object and a third one wanted it twice. */


  /* `10px 22px 0`, a hairline above, 12 of padding under it, 8 between rows. */
  block: {
    marginHorizontal: space.page,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  blockHead: { flexDirection: 'row', alignItems: 'baseline' },
  blockLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.43, textTransform: 'uppercase' },
  blockTotal: { marginLeft: 'auto', fontSize: 13, fontWeight: '600' },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  blockName: { fontSize: 13, fontWeight: '400', flexShrink: 1 },
  blockHolder: { fontSize: 13, fontWeight: '400', flexShrink: 1 },
  blockAmount: { marginLeft: 'auto', flexShrink: 0, fontSize: 13, fontWeight: '400' },
  noGlyph: { width: 13 },
  footnote: { fontSize: 12, fontWeight: '400', lineHeight: 17.4 },
});

/*
 * WHERE A FIGURE ON THIS SCREEN RUNS OUT, measured at 360 — the narrowest phone
 * in the device matrix.
 *
 * The right-hand figure is 17/600 and never shrinks; "−$999,999" is about 88
 * points there, which leaves more than any name needs beside a 15-point rank.
 * Seven digits fit and eight do not, so a million is where a result stops
 * printing in full and `formatSignedToFit` drops to the compact form — which
 * the handoff forbids on this screen, so it is the point at which a night is
 * bigger than the layout rather than a point at which the layout is wrong.
 *
 * THE ANNOTATION LINE IS WHAT RUNS OUT FIRST, and it is allowed to: it wraps,
 * and a wrapped pair is still a whole pair. `cappedFigure` holds the phone's
 * text setting at the money cap on every figure, so none of these measurements
 * moves underneath the reader.
 */
const ROW_FITS = 1_000_000;
