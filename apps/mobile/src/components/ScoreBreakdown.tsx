import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import {
  formulaWord,
  type Money,
  type RuleDestination,
  type SettledMode,
  type SettledRow,
  type SettledTerm,
} from '@poker-club/core';
import { formatSignedToFit, formatToFit } from '../lib/money';
import { Icon, type IconName } from './Icon';
import { moneyColor, useTheme } from '../design/useTheme';
import { cappedFigure, tabular, type Theme } from '../design/tokens';

/**
 * THE END RESULT OF A NIGHT, AND THE ONLY DRAWING OF IT IN THE APP —
 * `design_handoff_score_breakdown/Score Breakdown Icons.dc.html`, turn 6, cut
 * 8 September. `6a` is the game end on Final, `6b` the same screen on At table,
 * `6c` the same night read months later.
 *
 * WHAT IT REPLACED, AND WHY IT IS ONE FILE. Until today the app drew a player's
 * finished night in four places and in three shapes: a line of words under the
 * name on `/settled` (`in 1,500 out 2,000 bill 50 +100 back piggy 50`), three
 * stacked blocks on `/watch`, a sentence of arithmetic on `/deductions`, and a
 * bare figure per night on `/stats` and `/games`. Four drawings of one fact is
 * four places for it to drift, and it had drifted: only `/settled` said what a
 * night cost a person, and it said it in words that took the whole row.
 *
 * THE GLYPH IS WHAT MADE ONE DRAWING POSSIBLE. `bill 50` is nine characters;
 * the same fact as a 15-point glyph and a signed figure is four, so five pairs
 * fit on one line at 360 points where two words and two figures did not. That
 * is the whole trade the handoff makes, and it is why the same row can now be
 * the dense one the room reads at the end of the night AND the quiet one a
 * person opens in March.
 *
 * THE ROW VISIBLY SUMS TO THE SCORE, and every rule below serves that:
 *
 *     −$500 + $2,120 − $54 − $24 − $23 = +$1,519
 *
 *   · EVERY FIGURE IS SIGNED, so the row reads as arithmetic rather than as a
 *     column of magnitudes. The minus is U+2212 and not a hyphen — the app's
 *     own `formatSigned*` is where that lives — and every figure is tabular.
 *   · ABSENT PAIRS ARE DROPPED, NEVER ZEROED. Somebody who did not drink shows
 *     no drinks glyph rather than a `$0`, and rows are variable width by
 *     design. `settledRows` decides that, not this file: a term is on the row
 *     because the night charged it.
 *   · NOTHING HERE ADDS ANYTHING UP. Every figure is a `SettledTerm` off the
 *     engine and the score is `SettledRow.net`. `CLAUDE.md` — a screen that
 *     sums its own column is a second, untested implementation of `settle()`.
 *
 * TWO COLOURS AND NO MORE. The chips are ink and the three spends are bone,
 * because bone already means money leaving the table everywhere else in this
 * app; the score is the only green or red on the row. Nothing was introduced
 * for this feature — `offTable`, `offTableWash`, `win`, `loss`, `muted` and
 * `hairline` are the tokens the handoff was drawn against, to the hex.
 */

/** Which of the handoff's three row shapes to draw. */
export type ScoreLayout =
  /**
   * `6a` — the game end. Chips left, the evening right in a bone tray, every
   * deduction on the face of the row because the room reads it together and a
   * figure behind a tap is a figure nobody checks.
   */
  | 'grouped'
  /**
   * `6c` — the same night months later. The spend glyphs and ONE bone total
   * are right-aligned behind a chevron, and tapping itemises in place. Quiet by
   * default; detail on demand.
   */
  | 'rolled';

/**
 * ONE PLAYER'S FINISHED NIGHT.
 *
 * `row` is the engine's — `settledRows(result, mode)` — and this draws it. The
 * mode is on the row already (its terms are the mode's), so nothing here has to
 * be told twice which half of the night it is printing.
 */
export function ScoreRow({
  row,
  layout,
  testID,
  onSpends,
}: {
  row: SettledRow;
  layout: ScoreLayout;
  /** What the UI checks find the row by. */
  testID?: string;
  /** Where the bone tray goes — see `ScoreLine`. */
  onSpends?: () => void;
}) {
  return (
    <ScoreLine
      name={row.player.name}
      net={row.net}
      terms={row.terms}
      layout={layout}
      testID={testID}
      {...(onSpends === undefined ? {} : { onSpends })}
    />
  );
}

/**
 * The same row for something that is not a player — a NIGHT on My stats, where
 * the name is a date and the score is your own net.
 *
 * It is the same component and not a lookalike, which is the point of the file:
 * `6c` is drawn on the past-session screen and on the history list, and a
 * second implementation of it is the drift this file exists to end.
 */
export function ScoreLine({
  name,
  meta,
  net,
  terms,
  layout,
  testID,
  onPress,
  onSpends,
}: {
  name: string;
  /** A second line under the name, where the caller has one — the club. */
  meta?: string;
  net: Money;
  terms: readonly SettledTerm[];
  layout: ScoreLayout;
  testID?: string;
  /** Where the whole row goes, on a list whose rows go somewhere. */
  onPress?: () => void;
  /**
   * Where the bone tray goes — the handoff's own interaction on the grouped
   * row: *"tap the bone tray → open the deductions screen"*. The tray is the
   * only tappable thing on a game-end row, because the deductions are the one
   * part of it that has more to say than a figure (who fronted which bill).
   */
  onSpends?: () => void;
}) {
  const t = useTheme();
  /*
   * ONE ROW OPEN AT A TIME is the handoff's rule and it is the LIST's to keep,
   * not a row's — but the app has no list object here, and a row that owns its
   * own open state is the smaller lie: two open rows on a history list cost a
   * reader nothing, where lifting the state would put an `expandedId` on five
   * screens for it. Recorded in `docs/screens.md`.
   */
  const [open, setOpen] = useState(false);
  const rolled = layout === 'rolled';
  const spends = terms.filter((x) => x.kind === 'spend' || x.kind === 'back');
  /* A rolled-up row with nothing taken off it has nothing to itemise, so it
     does not offer to: no chevron, no tap, no bone total. */
  const expandable = rolled && spends.length > 0;
  const itemised = !rolled || open;

  const body = (
    <View style={styles.text}>
      <View style={styles.head}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text
          testID={testID === undefined ? undefined : `${testID}-net`}
          style={[styles.score, tabular, { color: net === 0 ? t.muted : moneyColor(t, net) }]}
          numberOfLines={1}
          {...cappedFigure}
        >
          {formatSignedToFit(net, ROW_FITS)}
        </Text>
      </View>

      {meta !== undefined && (
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {meta}
        </Text>
      )}

      <Pairs
        terms={terms}
        itemised={itemised}
        rolled={rolled}
        expandable={expandable}
        open={open}
        {...(onSpends === undefined ? {} : { onSpends })}
      />
    </View>
  );

  const frame = [
    styles.row,
    spends.length === 0 && !rolled && styles.tight,
    { borderTopColor: t.hairline },
    /* THE EXPANDED ROW IS A SLAB — `6c`, background `#131317` at radius 12,
       bleeding 12 past the list on both sides so it reaches the edges. `raised`
       is the app's step above a surface and is that colour's neighbour in both
       themes; the handoff's exact hex is not a token and `tokens.ts` belongs to
       a session running alone (`CLAUDE.md`). Recorded in `docs/screens.md`. */
    open && { backgroundColor: t.raised, ...styles.opened },
  ];

  if (!expandable && onPress === undefined) {
    return (
      <View testID={testID} style={frame}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={expandable ? { expanded: open } : undefined}
      accessibilityLabel={expandable ? `${name}, ${open ? 'hide' : 'show'} the breakdown` : name}
      onPress={() => {
        if (onPress !== undefined) return onPress();
        /* HEIGHT ONLY, ~180ms — the handoff's own note, and the reason the name
           and the score must not move: the row grows underneath them. */
        ease();
        setOpen((was) => !was);
      }}
      style={frame}
    >
      {body}
    </Pressable>
  );
}

/**
 * THE LINE OF PAIRS UNDER THE NAME.
 *
 * Itemised, it is: the chips, a 1px vertical rule, then the spends inside a
 * bone tray. Rolled up, it is the chips, then the spend glyphs and one bone
 * total pushed to the right behind a chevron.
 *
 * THE VERTICAL RULE IS THE WHOLE GROUPING and it only appears when there is
 * something on both sides of it. What happened at the table is on the left of
 * it and what the evening cost is on the right, which is the distinction a
 * person is actually arguing about a week later; `6b`'s At-table row has no
 * right-hand side, so it has no rule either.
 */
function Pairs({
  terms,
  itemised,
  rolled,
  expandable,
  open,
  onSpends,
}: {
  terms: readonly SettledTerm[];
  itemised: boolean;
  rolled: boolean;
  expandable: boolean;
  open: boolean;
  onSpends?: () => void;
}) {
  const t = useTheme();
  const chips = terms.filter((x) => x.kind === 'in' || x.kind === 'out' || x.kind === 'rounded');
  const spends = terms.filter((x) => x.kind === 'spend' || x.kind === 'back');

  if (chips.length === 0 && spends.length === 0) return null;

  return (
    <View style={[styles.pairs, rolled && styles.pairsRolled]}>
      <View style={styles.group}>
        {chips.map((term) => (
          <Pair key={pairKey(term)} term={term} theme={t} />
        ))}
      </View>

      {spends.length > 0 && itemised && (
        <>
          {/* One step stronger than a hairline — `previewRule` is that step and
              is already the rule between rows on the deductions preview. The
              handoff draws it at .14 and the token is .13. */}
          <View style={[styles.rule, { backgroundColor: t.previewRule }]} />
          {/*
           * THE BONE TRAY. Radius 8 on `offTableWash`, with 3 points of
           * negative vertical margin so the tray does not grow the row.
           *
           * IT IS THE ONE TINTED THING ON THE ROW and `ui-audit.mjs` knows it
           * by name — `spend-tray` is an exception to `tinted-result-row` (B23),
           * which is anchored on signed figures and would otherwise read this
           * as a result row painted with a wash. The rule it is an exception to
           * is about a WHOLE ROW banded green or red; this is a small object
           * inside one, in the colour the app has always drawn money leaving
           * the table in, and it carries no verdict.
           */}
          <Tray onPress={onSpends}>
            {trayPairs(spends).map((pair) => (
              <Pair
                key={pairKey(pair.spend)}
                term={pair.spend}
                {...(pair.back === undefined ? {} : { back: pair.back })}
                theme={t}
              />
            ))}
          </Tray>
        </>
      )}

      {spends.length > 0 && !itemised && (
        <View style={styles.rollup}>
          {/* The glyphs alone at 14, then ONE total — what the evening cost
              them, which is the figure a rolled-up row is for. */}
          {spends
            .map((term) => ({ term, name: glyph(term) }))
            /* A destination the handoff drew no glyph for contributes to the
               total and shows nothing — the alternative is a word in a place
               with room for a 14-point icon. It is itemised on the open row. */
            .filter((g): g is { term: SettledTerm; name: IconName } => g.name !== null)
            .filter((g) => g.term.kind === 'spend')
            .map((g) => (
              <Icon key={pairKey(g.term)} name={g.name} color={t.offTable} size={14} />
            ))}
          <Text style={[styles.figure, tabular, { color: t.offTable }]} {...cappedFigure}>
            {formatSignedToFit(rollup(spends), ROW_FITS)}
          </Text>
        </View>
      )}

      {expandable && (
        <View style={[styles.chevron, open && styles.chevronOpen]}>
          <Icon name={open ? 'chevronDown' : 'chevron'} color={t.dim} size={13} />
        </View>
      )}
    </View>
  );
}

/** The tray itself — a `View` until somebody gives it somewhere to go. */
function Tray({ onPress, children }: { onPress?: () => void; children: ReactNode }) {
  const t = useTheme();
  const style = [styles.tray, { backgroundColor: t.offTableWash }];
  if (onPress === undefined) {
    return (
      <View testID="spend-tray" style={style}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID="spend-tray"
      accessibilityRole="button"
      accessibilityLabel="What the evening took, in full"
      onPress={onPress}
      style={style}
    >
      {children}
    </Pressable>
  );
}

/**
 * A GLYPH AND ITS FIGURE, 4 points apart — the atom the whole row is made of.
 *
 * A bill that was fronted carries TWO figures behind one glyph — `−$31 +$120`.
 * That is the app's own decision, kept: `bill 50 +100 back` was one span for
 * the reason a line break between them would read as a fifth deduction, and a
 * second fork beside the first reads as a second bill. The repayment is in the
 * win colour, because it is the one figure in the tray that is money arriving.
 */
function Pair({ term, back, theme: t }: { term: SettledTerm; back?: SettledTerm; theme: Theme }) {
  const bone = term.kind === 'spend' || term.kind === 'back';
  const name = glyph(term);

  return (
    <View style={styles.pair}>
      {/*
       * ⚠ NO GLYPH FOR TWO OF THEM, AND THE WORD INSTEAD.
       *
       * The handoff draws five, for chips in, chips out, food, drinks and the
       * piggy bank. This app's rules reach two destinations it never drew — a
       * host's fee and a next-pot rule — and dropping their figure would be the
       * one thing this row may not do, because the row's claim is that it comes
       * to the score. So they print the word the app already uses for them on a
       * formula line (`formulaWord` in core: `host`, `next pot`) and no glyph.
       * Flagged rather than passed off as decided design; `docs/screens.md`.
       */}
      {name === null ? (
        <Text style={[styles.word, { color: t.offTable }]} numberOfLines={1}>
          {formulaWord(term.destination as RuleDestination)}
        </Text>
      ) : (
        <Icon name={name} color={bone ? t.offTable : t.muted} size={15} />
      )}
      <Text
        style={[styles.figure, tabular, { color: figureColour(term, t) }]}
        numberOfLines={1}
        {...cappedFigure}
      >
        {signed(term)}
      </Text>
      {back !== undefined && (
        <Text
          style={[styles.figure, tabular, { color: t.win }]}
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
 * THE TRAY'S PAIRS, with each repayment folded into the charge it belongs to.
 *
 * `settledRows` returns the two apart — that is the whole point of them, and
 * `docs/screens.md` records why the engine refuses to net them — so folding
 * them is the SCREEN's business: what a bill charged and what it paid back are
 * two facts and one glyph.
 *
 * A `back` with no charge in front of it stands on its own, which is somebody
 * who fronted the food and was charged nothing for it.
 */
function trayPairs(spends: readonly SettledTerm[]): Array<{
  spend: SettledTerm;
  back?: SettledTerm;
}> {
  const pairs: Array<{ spend: SettledTerm; back?: SettledTerm }> = [];
  for (const term of spends) {
    const charge =
      term.kind === 'back'
        ? pairs.find((p) => p.spend.kind === 'spend' && p.spend.destination === term.destination)
        : undefined;
    if (charge !== undefined) charge.back = term;
    else pairs.push({ spend: term });
  }
  return pairs;
}

/**
 * WHICH GLYPH A TERM IS, and null where the handoff drew none.
 *
 * `bill → food` and `kitty → piggy` are not this file's choice: `formulaWord`
 * in core has spelled a bill "food" and the piggy bank "piggy" since the
 * columns board, so the glyphs are the same two words drawn. `back` is a bill
 * coming back to whoever fronted it and takes the bill's own glyph — see
 * `signed` below, which is where it is told apart.
 */
function glyph(term: SettledTerm): IconName | null {
  switch (term.kind) {
    case 'in':
      return 'chipsIn';
    case 'out':
      return 'chipsOut';
    /* The step has no glyph in any set and needs none: it is the only term
       whose sign is not fixed by its name, so the signed figure alone says
       what it did. It is drawn with the chips because it lands the position,
       not because a rule took it. */
    case 'rounded':
      return null;
    default:
      return term.destination === 'bill'
        ? 'food'
        : term.destination === 'kitty'
          ? 'piggy'
          : null;
  }
}

/**
 * THE FIGURE, SIGNED AS THE ROW READS IT.
 *
 * `in` and every spend come off them, so both print a minus the engine does not
 * carry — `SettledTerm.amount` is a magnitude, and the sign is the reader's
 * screen's. `out` and `back` are money arriving. `rounded` is already signed.
 */
function signed(term: SettledTerm): string {
  if (term.kind === 'rounded') return formatSignedToFit(term.amount, ROW_FITS);
  const arriving = term.kind === 'out' || term.kind === 'back';
  return `${arriving ? '+' : '\u2212'}${formatToFit(term.amount, ROW_FITS)}`;
}

/**
 * Bone for what the evening took, ink for the chips — and the win colour for a
 * bill coming back, because it is the one figure in the tray that is money
 * arriving and a bone `+$242` beside a bone `−$54` reads as a second charge.
 */
function figureColour(term: SettledTerm, t: Theme): string {
  if (term.kind === 'back') return t.win;
  if (term.kind === 'spend') return t.offTable;
  return t.text;
}

/** Stable across renders. A destination appears at most once per kind. */
const pairKey = (term: SettledTerm): string =>
  term.destination === null ? term.kind : `${term.kind}:${term.destination}`;

/**
 * WHAT THE EVENING COST THEM, NET — the one bone figure on a rolled-up row.
 *
 * ⚠ THE ONE SUM IN THIS FILE, and it is a sum over terms the engine put on the
 * row rather than over a column of the night. `settledRows` cannot carry it:
 * it is the rolled-up LAYOUT's figure, the itemised one never prints it, and a
 * field on the row that only one drawing reads is a field the other drawing
 * forgets to keep true. It nets the bill's repayment on purpose — a person who
 * paid for the food and owes a share of it is out `−$54 + $242`, and the
 * rolled-up row is answering "what did the evening cost me" in one figure.
 */
function rollup(spends: readonly SettledTerm[]): Money {
  return spends.reduce(
    (running, term) => (running + (term.kind === 'back' ? term.amount : -term.amount)) as Money,
    0 as Money,
  );
}

/**
 * FINAL / AT TABLE — the segmented control both screens carry, directly under
 * the meta line.
 *
 * A SEGMENTED CONTROL AND NOT TWO TABS: the two are the same rows twice, not
 * two places you can be, so nothing about it navigates and the header, the
 * footer and everything above the list stay put across a switch. `settledRows`
 * does the re-sort, so the two orders cannot come from two implementations.
 *
 * ⚠ THE LABEL IS `At table`, NOT `At the table`. It is the handoff's, and the
 * two words have to fit a 34-point segment beside `Final` at every text size.
 * The list's own section label still reads `At the table` in full.
 */
export function ScoreTabs({
  mode,
  onPick,
}: {
  mode: SettledMode;
  onPick: (m: SettledMode) => void;
}) {
  const t = useTheme();
  const options: Array<{ value: SettledMode; label: string }> = [
    { value: 'final', label: 'Final' },
    { value: 'table', label: 'At table' },
  ];

  return (
    <View style={[styles.track, { backgroundColor: t.surface }]}>
      {options.map((o) => {
        const on = o.value === mode;
        return (
          <Pressable
            key={o.value}
            testID={`score-tab-${o.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(o.value)}
            style={[styles.segment, on && { backgroundColor: t.raised }]}
          >
            <Text style={[on ? styles.segmentOn : styles.segmentOff, { color: on ? t.text : t.muted }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * `$5,500 in, $5,500 out` / `$0` — the last row of the At-table list.
 *
 * THE CHECK PLAYERS RUN BEFORE THEY ACCEPT THE FINAL. Money is neither made nor
 * destroyed at a poker table, so the column comes to nothing — and the row
 * states the two sides that produced the zero rather than only the zero,
 * because a bare `$0` is not checkable against anything.
 *
 * Both figures are `resultTotals()`'s. The caller passes them; this draws them.
 */
export function ReconciliationRow({
  boughtIn,
  cashedOut,
  game,
}: {
  boughtIn: Money;
  cashedOut: Money;
  game: Money;
}) {
  const t = useTheme();
  return (
    <View testID="score-reconciliation" style={[styles.closing, { borderTopColor: t.hairline }]}>
      <Text style={[styles.closingLabel, { color: t.muted }]} numberOfLines={1}>
        {`${formatToFit(boughtIn, ROW_FITS)} in, ${formatToFit(cashedOut, ROW_FITS)} out`}
      </Text>
      <Text style={[styles.closingValue, tabular, { color: t.muted }]} numberOfLines={1} {...cappedFigure}>
        {game === 0 ? formatToFit(game, ROW_FITS) : formatSignedToFit(game, ROW_FITS)}
      </Text>
    </View>
  );
}

/**
 * The height change, and only the height.
 *
 * `LayoutAnimation` needs turning on by hand on Android and is a no-op on web,
 * which is where the UI checks run — so an expanded row measures its open size
 * immediately there rather than mid-animation, and that is what we want a
 * screenshot to be held against.
 */
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental !== undefined) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function ease() {
  LayoutAnimation.configureNext({
    duration: 180,
    update: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity },
  });
}

const styles = StyleSheet.create({
  /*
   * `8px 0` over a hairline — a 58-point row at the handoff's type sizes, and
   * the arithmetic that makes it 58 is written down below rather than left to
   * the platform: 16 of padding, a 20-point head, 6 of gap and a 16-point line
   * of pairs.
   *
   * EVERY LINE HEIGHT ON THIS ROW IS STATED, and that is what keeps the number
   * true. A `Text` with no `lineHeight` gets the platform's own leading — about
   * 1.36 of the size on Android and more on some faces — so a 17-point score
   * silently cost 24 points and nothing in the file said so. At eight players
   * that is 56 points, which is a whole row, and the ranked list is only
   * legible when the whole ranking is on the phone at once. `ui-journeys.mjs`
   * holds this screen to eight rows above the footer, and it is the check that
   * goes red if any of these four numbers grows.
   */
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  /*
   * AT TABLE IS 7 AND FINAL IS 8 — the handoff's own difference, and it says
   * why: At table has a reconciliation line under the list that Final does not,
   * and the point of the tab is that a room reads the check without scrolling.
   * A row with no spends on it IS the At-table row, which is why this is
   * derived from the terms rather than passed down as a mode.
   */
  tight: { paddingVertical: 7 },
  /* The expanded slab: 9px 12px at radius 12, and 12 of negative side margin so
     it bleeds to the list's own edges. */
  opened: {
    borderRadius: 12,
    borderTopWidth: 0,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  text: { flex: 1, gap: 6, minWidth: 0 },

  head: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  name: { fontSize: 16, fontWeight: '600', lineHeight: 20, flexShrink: 1 },
  /*
   * NEVER SHRINKS. The name may give — it is a word — and a figure may not:
   * left to shrink, "−$12,000" came apart into a dash on one line and an amount
   * on the next, which reads as two things. See B18.
   */
  score: { marginLeft: 'auto', flexShrink: 0, fontSize: 17, fontWeight: '700', lineHeight: 20 },
  meta: { fontSize: 12.5, fontWeight: '400', lineHeight: 16, marginTop: -2 },

  /*
   * `align-items: stretch` on the itemised line, which is what gives the
   * vertical rule its height without one being written down.
   *
   * IT WRAPS RATHER THAN TRUNCATING. Five pairs fit one line at 393 and do not
   * at 360 with the text turned up, and the whole point of the line is that
   * every term is on it — a row that dropped the last one would not come to the
   * figure beside it. Each pair is `nowrap`, so a break never lands between a
   * glyph and its figure.
   */
  pairs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 10 },
  pairsRolled: { alignItems: 'center', flexWrap: 'nowrap' },
  group: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 11 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  figure: { fontSize: 12.5, fontWeight: '600', lineHeight: 16 },
  word: { fontSize: 12.5, fontWeight: '400', lineHeight: 16 },

  rule: { width: 1, alignSelf: 'stretch' },
  /* 3px 8px at radius 8, and −3 vertically so the tray does not grow the row. */
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginVertical: -3,
    borderRadius: 8,
  },
  rollup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  chevron: { justifyContent: 'center', marginLeft: 6 },
  chevronOpen: { marginLeft: 'auto' },

  /* The well: 3 of padding at radius 11, two equal halves 3 apart. */
  track: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 11 },
  segment: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentOn: { fontSize: 13.5, fontWeight: '700' },
  segmentOff: { fontSize: 13.5, fontWeight: '600' },

  closing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 38,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  closingLabel: { fontSize: 13, fontWeight: '400', flexShrink: 1 },
  closingValue: { marginLeft: 'auto', flexShrink: 0, fontSize: 13, fontWeight: '600' },
});

/*
 * WHERE A FIGURE ON THIS ROW RUNS OUT, measured at 360 — the narrowest phone in
 * the device matrix.
 *
 * The score is 17/700 on the right and never shrinks; "−$999,999" is about 88
 * points there, which leaves more than any name needs. Seven digits fit and
 * eight do not, so a million is where a result stops printing in full and
 * `formatSignedToFit` drops to the compact form.
 *
 * THE PAIRS ARE THE THING THAT ACTUALLY RUNS OUT FIRST, and they are allowed
 * to: the line wraps, and a wrapped pair is still a whole pair. `cappedFigure`
 * holds the phone's text setting at the money cap on every figure, so none of
 * these measurements moves underneath the reader.
 */
const ROW_FITS = 1_000_000;
