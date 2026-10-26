import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  BOARD_CARDS,
  RANKS,
  STREET_CARDS,
  showdown,
  standings,
  type Card,
  type OddsInput,
  type RunOutProgress,
  type Street,
} from '@poker-club/core';
import { useTheme } from '../design/useTheme';
import { radius, space, type } from '../design/tokens';
import { oddsTone } from '../lib/oddsTone';
import { COLUMNS, STREET_LABEL, runOutFigure, stillToCome, verdictOf, type Verdict } from '../lib/runOut';
import { CARD_FACE, Pip, SUIT_GLYPH, inkOf } from './PlayingCard';

/**
 * The run-out as one picture — board 19 of `design/handoff-odds-calculator/`,
 * "How it ran out", reworked on the owner's instruction (26 October): **one
 * board, not one per street.** The turn is one card more than the flop and the
 * river one more than that, so the five places are drawn once, with *Flop ·
 * Turn · River* marked under the cards they are, and the figures sit under it
 * as a grid — a column per street, a row per hand, every figure with its sign.
 *
 * A COMPONENT RATHER THAN A SCREEN because it is drawn twice: on `/run-out`,
 * at the phone's width, and — when the share feature resumes (§ 7 of the
 * handoff) — off-screen at 1080 × 1350 for the PNG. So it takes the table and
 * the engine's progress and draws them; it reads nothing and counts nothing.
 * Every figure on it is a `SeatOdds` the enumeration handed over.
 *
 * WHAT THE BOARD DRAWS AND THE APP KEEPS: the hands in sight above everything;
 * the four streets always present, even the ones the board has not reached;
 * one decimal on a figure and `100%` whole (`runOutFigure`); the odds colour
 * on a figure by `standings()` on that street's result, **with no word beside
 * it** — the one place the app departs from § 5's "never colour alone",
 * because the board does, and the words are in the box at the foot. Each row's
 * spoken label carries them.
 *
 * WHAT IT DEPARTS FROM, ON INSTRUCTION: board 19 repeats the five places under
 * every street and prints Player 1 large with `P2 49.9` small and unsigned
 * under it. Here every hand's figure is the same size and signed, in its own
 * colour, because a grid that reads the same way along every row is what the
 * owner asked for and is what three or four hands need.
 *
 * ⚠ NOT DRAWN, so mine (`docs/screens.md`): a street still counting shows the
 * calculator's bar in each of its cells; a street the board has not reached
 * shows `—`; the row labels *P1*, *P2*; the street names under the board.
 */

/** A hand's card, and a board card: the odds screen's own 36 × 50. */
const CARD_W = 36;
const CARD_H = 50;
/** Between the three of the flop; between the flop, the turn and the river. */
const IN_GROUP = 4;
const BETWEEN = 12;

/** Which cards of the board each street adds — the flop three, the turn one, the river one. */
const GROUPS: { street: Exclude<Street, 'preflop'>; from: number; to: number }[] = [
  { street: 'flop', from: 0, to: 3 },
  { street: 'turn', from: 3, to: 4 },
  { street: 'river', from: 4, to: 5 },
];

export function RunOutCard({
  input,
  progress,
  /** Drawn at this width rather than its own — the PNG export's hook. */
  width,
}: {
  input: OddsInput;
  progress: RunOutProgress;
  width?: number;
}) {
  const t = useTheme();
  /*
   * SIZED FROM ITS OWN BOX, NOT THE WINDOW. `useWindowDimensions` reads the
   * browser's visual viewport on the web, and `ui-audit.mjs` stands one up
   * with a height and no width — which came back NaN and laid the grid out
   * at nine hundred points a column. The card measures itself once it is on
   * screen; until then it draws at the house frame's width.
   */
  const [measured, setMeasured] = useState(0);
  const inner = width !== undefined ? width - 2 * space.page : measured > 0 ? measured : 402 - 2 * space.page;
  /* The grid: a label column, then four of equal width. */
  const labelW = Math.max(30, Math.min(44, inner * 0.12));
  const colW = (inner - labelW) / 4;
  const figureSize = Math.min(19, colW * 0.28);
  /* PRE-FLOP is eight tracked capitals; under 64 points a column it steps down a size rather than truncating. */
  const head = colW < 64 ? { fontSize: 10, letterSpacing: 0.5 } : null;

  const reached = new Set<Street>(COLUMNS.filter((s) => STREET_CARDS[s] <= input.board.length));
  const last = COLUMNS.filter((s) => reached.has(s)).pop() ?? 'preflop';
  const lastOdds = progress.streets.get(last) ?? null;

  /* The box at the foot: the verdict on a complete board, else what the last street leaves open. */
  let foot: Verdict | null = null;
  if (lastOdds !== null) {
    foot = last === 'river' ? verdictOf(showdown(input), input.hands.length) : { title: stillToCome(last, lastOdds.boards), detail: '' };
  }

  /* Every street's standings, once, so a row can read its own. */
  const tones = new Map<Street, { color: string; word: string }[]>();
  for (const s of COLUMNS) {
    const o = progress.streets.get(s);
    if (o !== undefined) tones.set(s, standings(o.seats).map((st) => oddsTone(st, t, s === 'river')));
  }

  return (
    <View nativeID="run-out" style={styles.card} onLayout={(e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width)}>
      {/* THE HANDS — in sight on every frame (§ 8). Heads-up they face each other across "against". */}
      <View style={styles.hands}>
        {input.hands.map((hand, seat) => (
          <View key={seat} style={styles.handWrap}>
            {seat === 1 && input.hands.length === 2 && <Text style={[styles.against, { color: t.muted }]}>against</Text>}
            <View>
              <Text style={[styles.handName, { color: t.muted }]}>Player {seat + 1}</Text>
              <View style={styles.cards} accessible accessibilityLabel={`Player ${seat + 1}, ${hand.map(spoken).join(' ')}`}>
                {hand.map((c) => (
                  <Face key={c} card={c} />
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>

      {/*
       * THE BOARD — once. The flop's three, then the turn, then the river, each
       * named under its cards; a place the board has not reached is dashed. The
       * turn is the flop and one card, the river one more, which is why there
       * is one row and not four.
       */}
      <Text style={[styles.sectionLabel, { color: t.muted }]}>Board</Text>
      <View nativeID="run-out-board" style={styles.board} accessible accessibilityLabel={boardSpoken(input.board)}>
        {GROUPS.map((g) => (
          <View key={g.street} style={styles.group}>
            <View style={styles.cards}>
              {Array.from({ length: g.to - g.from }, (_, i) => {
                const c = input.board[g.from + i] ?? null;
                return c === null ? <Empty key={i} /> : <Face key={c} card={c} />;
              })}
            </View>
            <Text style={[styles.groupLabel, { color: t.muted }]}>{STREET_LABEL[g.street]}</Text>
          </View>
        ))}
      </View>

      {/*
       * THE FIGURES — a column per street, a row per hand. Every figure signed,
       * one decimal, in its own street's colour. A street still counting shows
       * the bar in each of its cells; one the board has not reached shows a dash.
       */}
      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={{ width: labelW }} />
          {COLUMNS.map((s) => (
            <Text key={s} style={[styles.colHead, { width: colW, color: t.muted }, head]} numberOfLines={1}>
              {STREET_LABEL[s]}
            </Text>
          ))}
        </View>
        {input.hands.map((_, seat) => {
          const spokenCells = COLUMNS.map((s) => {
            const o = progress.streets.get(s);
            if (o === undefined) {
              if (!reached.has(s)) return `${STREET_LABEL[s]} not reached`;
              return progress.counting === s ? `${STREET_LABEL[s]} calculating, ${Math.round(progress.progress * 100)}%` : `${STREET_LABEL[s]} not yet counted`;
            }
            return `${STREET_LABEL[s]} ${runOutFigure(o.seats[seat]!.win)}, ${tones.get(s)![seat]!.word.toLowerCase()}`;
          });
          return (
            <View
              key={seat}
              nativeID={`run-out-row-${seat + 1}`}
              style={[styles.row, styles.figureRow, { borderTopColor: t.hairline }]}
              accessible
              accessibilityLabel={`Player ${seat + 1}: ${spokenCells.join('; ')}`}
            >
              <Text style={[styles.rowLabel, { width: labelW, color: t.muted }]}>P{seat + 1}</Text>
              {COLUMNS.map((s) => {
                const o = progress.streets.get(s);
                const id = `cell-${s}-${seat + 1}`;
                if (o !== undefined) {
                  return (
                    <Text
                      key={s}
                      nativeID={id}
                      style={[styles.figure, { width: colW, fontSize: figureSize, lineHeight: figureSize * 1.3, color: tones.get(s)![seat]!.color }]}
                      numberOfLines={1}
                    >
                      {runOutFigure(o.seats[seat]!.win)}
                    </Text>
                  );
                }
                if (progress.counting === s) {
                  return (
                    <View key={s} style={[styles.cell, { width: colW, height: figureSize * 1.3 }]}>
                      <View style={[styles.track, { backgroundColor: t.hairline }]}>
                        <View style={[styles.fill, { backgroundColor: t.text, width: `${Math.max(2, Math.round(progress.progress * 100))}%` }]} />
                      </View>
                    </View>
                  );
                }
                return (
                  <Text key={s} nativeID={id} style={[styles.figure, { width: colW, fontSize: figureSize, lineHeight: figureSize * 1.3, color: t.muted }]}>
                    {reached.has(s) ? '' : '—'}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* THE FOOT: how it ended, or what is still to come. */}
      {foot !== null && (
        <View nativeID="run-out-foot" style={[styles.foot, { backgroundColor: t.surface }]}>
          <Text nativeID="run-out-foot-title" style={[styles.footTitle, { color: t.text }]}>
            {foot.title}
          </Text>
          {foot.detail !== '' && (
            <Text nativeID="run-out-foot-detail" style={[styles.footDetail, { color: t.muted }]}>
              {foot.detail}
            </Text>
          )}
        </View>
      )}

      <View style={[styles.rule, { backgroundColor: t.hairline }]} />
      <View style={styles.credits}>
        <Text style={[styles.credit, { color: t.muted }]}>
          {progress.counting === null ? 'Every street counted exactly' : 'Counting every street exactly'}
        </Text>
        <Text style={[styles.credit, { color: t.muted }]}>Texas hold’em</Text>
      </View>
    </View>
  );
}

const spoken = (c: Card): string => `${RANKS[c >> 2]}${SUIT_GLYPH[c & 3]}`;
const boardSpoken = (board: readonly Card[]): string =>
  board.length === 0 ? 'Board, no cards yet' : `Board, ${board.map(spoken).join(' ')}${board.length < BOARD_CARDS ? `, ${BOARD_CARDS - board.length} to come` : ''}`;

/** A card on the picture: 36 × 50, the odds screen's slot, on card stock. */
function Face({ card }: { card: Card }) {
  const ink = inkOf(card);
  return (
    <View style={styles.face} accessibilityLabel={spoken(card)}>
      <Text style={[styles.faceRank, { color: ink }]}>{RANKS[card >> 2]}</Text>
      <Pip suit={card & 3} size={14} color={ink} />
    </View>
  );
}

/** A place on the board the hand has not reached: a dashed edge, nothing in it. */
function Empty() {
  const t = useTheme();
  return <View style={[styles.face, styles.empty, { borderColor: t.dashed }]} />;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.page, paddingTop: 6 },

  hands: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 14, alignItems: 'flex-end' },
  handWrap: { flexDirection: 'row', alignItems: 'flex-end', columnGap: 22 },
  /* Level with the middle of the cards: half a card less half a line. */
  against: { ...type.rowName, fontWeight: '500', lineHeight: 22, paddingBottom: CARD_H / 2 - 11 },
  handName: { ...type.rowDetail, fontSize: 14, paddingBottom: 8, paddingLeft: 1 },
  cards: { flexDirection: 'row', gap: IN_GROUP },
  face: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 6,
    backgroundColor: CARD_FACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,20,22,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed' },
  faceRank: { fontSize: 17, fontWeight: '800', lineHeight: 19, marginBottom: 1 },

  sectionLabel: { ...type.sectionLabel, paddingTop: 24, paddingBottom: 10, paddingLeft: 1 },
  board: { flexDirection: 'row', flexWrap: 'wrap', columnGap: BETWEEN, rowGap: 10 },
  group: { alignItems: 'center', gap: 6 },
  groupLabel: { ...type.label },

  grid: { marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center' },
  figureRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 9 },
  colHead: { ...type.label, textAlign: 'center', paddingBottom: 8 },
  rowLabel: { ...type.rowDetail, fontWeight: '600' },
  figure: { fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.3, textAlign: 'center' },
  cell: { justifyContent: 'center', paddingHorizontal: 8 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },

  foot: { marginTop: 20, borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 16, gap: 3 },
  footTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  footDetail: { ...type.lede, lineHeight: 20 },

  rule: { height: StyleSheet.hairlineWidth, marginTop: 26 },
  credits: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, gap: 12 },
  credit: { ...type.meta, flexShrink: 1 },
});
