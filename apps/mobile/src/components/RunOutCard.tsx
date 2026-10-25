import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
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
import { COLUMNS, STREET_LABEL, otherFigure, runOutFigure, stillToCome, verdictOf, type Verdict } from '../lib/runOut';
import { CARD_FACE, Pip, SUIT_GLYPH, inkOf } from './PlayingCard';

/**
 * The run-out as one picture — board 19 of `design/handoff-odds-calculator/`,
 * "How it ran out": the hands, then a column per street with the board filling
 * in under its name and Player 1's figure under that, the other hands' figures
 * small beneath it, and a box at the foot saying how it ended.
 *
 * A COMPONENT RATHER THAN A SCREEN because it is drawn twice: on `/run-out`,
 * at the phone's width, and — when the share feature resumes (§ 7 of the
 * handoff) — off-screen at 1080 × 1350 for the PNG. So it takes the table and
 * the engine's progress and draws them; it reads nothing and counts nothing.
 * Every figure on it is a `SeatOdds` the enumeration handed over.
 *
 * WHAT THE BOARD DRAWS AND THE APP KEEPS:
 *   - the four streets are always there, even the ones the board has not
 *     reached, with their places dashed — the picture is the same shape for
 *     every hand, which is what makes two of them comparable;
 *   - one decimal on the headline, `100%` whole (`runOutFigure`), and `P2 49.9`
 *     under it with no sign and no tie — ties are not on the picture;
 *   - the headline takes the odds colour for that street, by `standings()` on
 *     that street's result, and **no word beside it** — the one place the app
 *     departs from § 5's "never colour alone", because the board does, and the
 *     words are in the box at the foot. The column's spoken label carries them.
 *
 * WHAT THE BOARD DOES NOT DRAW (⚠ mine, in `docs/screens.md`): a street still
 * counting shows the calculator's own bar where the figure will land; a street
 * the board has not reached shows `—`; three or more hands lay out as a wrapping
 * row with no *against*, and the headline is always Player 1's.
 */

/** Between the four columns, and between the five places in one. */
const COL_GAP = 8;
const PLACE_GAP = 2;
/** A hand's card, the odds screen's own 36 × 50. */
const HAND_W = 36;
const HAND_H = 50;

export function RunOutCard({
  input,
  progress,
  /** Drawn at this width rather than the window's — the PNG export's hook. */
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
   * with a height and no width — which came back NaN and laid the four
   * columns out at nine hundred points apiece. The card measures itself once
   * it is on screen; until then it draws at the house frame's width.
   */
  const [measured, setMeasured] = useState(0);
  const inner = width !== undefined ? width - 2 * space.page : measured > 0 ? measured : 402 - 2 * space.page;
  const colW = (inner - 3 * COL_GAP) / 4;
  /* Five places and four gaps across a column. */
  const placeW = Math.floor(((colW - 4 * PLACE_GAP) / 5) * 2) / 2;
  const placeH = Math.round(placeW * 1.4);
  const figureSize = Math.min(24, colW * 0.3);

  const reached = new Set<Street>(COLUMNS.filter((s) => STREET_CARDS[s] <= input.board.length));
  const last = COLUMNS.filter((s) => reached.has(s)).pop() ?? 'preflop';
  const lastOdds = progress.streets.get(last) ?? null;

  /* The box at the foot: the verdict on a complete board, else what the last street leaves open. */
  let foot: Verdict | null = null;
  if (lastOdds !== null) {
    if (last === 'river') {
      foot = verdictOf(showdown(input), input.hands.length);
    } else {
      foot = { title: stillToCome(last, lastOdds.boards), detail: '' };
    }
  }

  return (
    <View nativeID="run-out" style={styles.card} onLayout={(e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width)}>
      {/* THE HANDS — in sight on every frame (§ 8). Heads-up they face each other across "against". */}
      <View style={styles.hands}>
        {input.hands.map((hand, seat) => (
          <View key={seat} style={styles.handWrap}>
            {seat === 1 && input.hands.length === 2 && (
              <Text style={[styles.against, { color: t.muted }]}>against</Text>
            )}
            <View>
              <View style={styles.handLabel}>
                <View style={[styles.swatch, { backgroundColor: seat === 0 ? t.text : t.muted }]} />
                <Text style={[styles.handName, { color: t.muted }]}>Player {seat + 1}</Text>
              </View>
              <View style={styles.handCards} accessible accessibilityLabel={`Player ${seat + 1}, ${hand.map(spoken).join(' ')}`}>
                {hand.map((c) => (
                  <HandCard key={c} card={c} />
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* THE STREETS — four columns, always four. */}
      <View style={styles.streets}>
        {COLUMNS.map((street) => {
          const odds = progress.streets.get(street) ?? null;
          const counting = progress.counting === street;
          const here = reached.has(street);
          const stands = odds === null ? null : standings(odds.seats);
          const tone = stands === null ? null : oddsTone(stands[0]!, t, street === 'river');
          const spokenFigures =
            odds === null
              ? here
                ? counting
                  ? `calculating, ${Math.round(progress.progress * 100)}%`
                  : 'not yet counted'
                : 'not reached'
              : odds.seats
                  .map((s, i) => `Player ${i + 1} ${runOutFigure(s.win)}${i === 0 && tone ? `, ${tone.word.toLowerCase()}` : ''}`)
                  .join('; ');
          return (
            <View
              key={street}
              nativeID={`street-${street}`}
              style={[styles.street, { width: colW }]}
              accessible
              accessibilityLabel={`${STREET_LABEL[street]}: ${spokenFigures}`}
            >
              <Text style={[styles.streetLabel, { color: t.muted }]} numberOfLines={1}>
                {STREET_LABEL[street]}
              </Text>
              <View style={styles.places}>
                {Array.from({ length: 5 }, (_, i) => {
                  const c = i < STREET_CARDS[street] ? (input.board[i] ?? null) : null;
                  return <Place key={i} card={c} w={placeW} h={placeH} />;
                })}
              </View>
              {/* THE HEADLINE: Player 1's figure, in the street's colour. While the
                  street is counting, the calculator's bar in its place, the same
                  height, so nothing jumps when it lands. */}
              <View style={[styles.figureLine, { height: figureSize * 1.25 }]}>
                {odds !== null ? (
                  <View nativeID={`street-${street}-figure`} style={styles.figureRow}>
                    <Text
                      style={[styles.figure, { fontSize: figureSize, lineHeight: figureSize * 1.2, color: tone?.color ?? t.text }]}
                      numberOfLines={1}
                    >
                      {runOutFigure(odds.seats[0]!.win).replace('%', '')}
                    </Text>
                    <Text style={[styles.percent, { fontSize: figureSize * 0.55, color: tone?.color ?? t.text }]}>%</Text>
                  </View>
                ) : counting ? (
                  <View style={[styles.track, { backgroundColor: t.hairline }]}>
                    <View style={[styles.fill, { backgroundColor: t.text, width: `${Math.max(2, Math.round(progress.progress * 100))}%` }]} />
                  </View>
                ) : (
                  <Text nativeID={`street-${street}-figure`} style={[styles.figure, { fontSize: figureSize, lineHeight: figureSize * 1.2, color: t.muted }]}>
                    {here ? '' : '—'}
                  </Text>
                )}
              </View>
              {odds !== null && (
                <View nativeID={`street-${street}-others`} style={styles.others}>
                  {odds.seats.slice(1).map((s, i) => (
                    <Text key={i} style={[styles.other, { color: t.muted }]} numberOfLines={1}>
                      {otherFigure(i + 1, s.win)}
                    </Text>
                  ))}
                </View>
              )}
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

/** A hand's card: 36 × 50, the odds screen's slot, on card stock. */
function HandCard({ card }: { card: Card }) {
  const ink = inkOf(card);
  return (
    <View style={styles.handCard}>
      <Text style={[styles.handRank, { color: ink }]}>{RANKS[card >> 2]}</Text>
      <Pip suit={card & 3} size={14} color={ink} />
    </View>
  );
}

/**
 * One of a street's five places: a tiny card where the board had one on that
 * street, a dashed edge where it had not. The rank and pip scale with the
 * place, which scales with the phone — at 393 wide a place is about 15 × 21.
 */
function Place({ card, w, h }: { card: Card | null; w: number; h: number }) {
  const t = useTheme();
  if (card === null) {
    return <View style={[styles.place, { width: w, height: h, borderColor: t.dashed, borderWidth: 1, borderStyle: 'dashed' }]} />;
  }
  const ink = inkOf(card);
  const rank = Math.max(7, Math.round(w * 0.62));
  return (
    <View style={[styles.place, { width: w, height: h, backgroundColor: CARD_FACE }]} accessibilityLabel={spoken(card)}>
      <Text style={[styles.placeRank, { color: ink, fontSize: rank, lineHeight: rank + 1 }]}>{RANKS[card >> 2]}</Text>
      <Pip suit={card & 3} size={Math.max(5, Math.round(w * 0.5))} color={ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.page, paddingTop: 6 },

  hands: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 14, alignItems: 'flex-end' },
  handWrap: { flexDirection: 'row', alignItems: 'flex-end', columnGap: 22 },
  /* Level with the middle of the cards: half a card less half a line. */
  against: { ...type.rowName, fontWeight: '500', lineHeight: 22, paddingBottom: HAND_H / 2 - 11 },
  handLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingBottom: 8, paddingLeft: 1 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  handName: { ...type.rowDetail, fontSize: 14 },
  handCards: { flexDirection: 'row', gap: 4 },
  handCard: {
    width: HAND_W,
    height: HAND_H,
    borderRadius: 6,
    backgroundColor: CARD_FACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,20,22,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handRank: { fontSize: 17, fontWeight: '800', lineHeight: 19, marginBottom: 1 },

  streets: { flexDirection: 'row', gap: COL_GAP, marginTop: 24 },
  street: { alignItems: 'center' },
  streetLabel: { ...type.label, textAlign: 'center' },
  places: { flexDirection: 'row', gap: PLACE_GAP, marginTop: 8 },
  place: { borderRadius: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  placeRank: { fontWeight: '800' },
  figureLine: { marginTop: 10, justifyContent: 'center', alignSelf: 'stretch', alignItems: 'center' },
  figureRow: { flexDirection: 'row', alignItems: 'baseline' },
  figure: { fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  percent: { fontWeight: '700', marginLeft: 1 },
  track: { alignSelf: 'stretch', height: 4, borderRadius: 2, overflow: 'hidden', marginHorizontal: 6 },
  fill: { height: 4, borderRadius: 2 },
  others: { marginTop: 4, alignItems: 'center', gap: 1 },
  other: { ...type.rowDetail, fontSize: 12.5 },

  foot: { marginTop: 22, borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 16, gap: 3 },
  footTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  footDetail: { ...type.lede, lineHeight: 20 },

  rule: { height: StyleSheet.hairlineWidth, marginTop: 26 },
  credits: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, gap: 12 },
  credit: { ...type.meta, flexShrink: 1 },
});
