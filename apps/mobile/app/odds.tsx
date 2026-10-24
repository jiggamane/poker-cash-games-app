import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BOARD_CARDS,
  HOLE_CARDS,
  MAX_SEATS,
  OddsEnumeration,
  RANKS,
  oddsProblem,
  type Card,
  type Hand,
  type Odds,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';

/**
 * Odds calculator — Texas hold'em, win and tie per hand.
 *
 * A PUSH from Settings (Chrome A, back → Settings): a tool you stay in and
 * play with, with no Save at the end of it. Nine seats of two cards, the five
 * board cards, a row of dead cards, and the deck underneath to deal from. Odds
 * are calculated as soon as two hands are complete, over every board that can
 * still come — the arithmetic is `packages/core/src/odds`, and this screen
 * adds nothing to it but a place for the cards.
 *
 * It is the classic web calculator, rebuilt: tap a card in the deck and it is
 * dealt to the outlined place; tap a dealt card and it goes back. The outlined
 * place moves on by itself — the second hole card, then the next seat for the
 * first two seats, then the board, then the dead cards — and tapping any empty
 * place moves it there. *New hand* clears the table.
 *
 * ⚠ COPY NOT DRAWN. No board draws this screen, so every string on it is mine
 * and wants review: the title, the meta line's three states, the lede, the
 * seat labels, *Win* and *Tie*, *Board*, *Dead cards*, *New hand*.
 *
 * DELIBERATE DEVIATIONS from the original it is rebuilt from:
 *
 * - The place the next card is dealt to is outlined in the text colour, not
 *   red. In this app red means money lost and nothing else (`tokens.ts`); a
 *   red outline on an empty slot would read as a figure gone wrong.
 * - The suit colours are the one place red is not money: hearts and diamonds
 *   are drawn in the loss red because every deck in the world draws them red
 *   and a black heart is a card nobody can read at a glance.
 * - The work is sliced so the screen keeps drawing while 1.7 million boards
 *   are dealt, and the meta line counts it down. The original showed a spinner.
 */

type Slot = { kind: 'seat'; seat: number; i: number } | { kind: 'board'; i: number } | { kind: 'dead' };

type Table = {
  seats: (Card | null)[][];
  board: (Card | null)[];
  dead: Card[];
};

const emptyTable = (): Table => ({
  seats: Array.from({ length: MAX_SEATS }, () => Array<Card | null>(HOLE_CARDS).fill(null)),
  board: Array<Card | null>(BOARD_CARDS).fill(null),
  dead: [],
});

const FIRST: Slot = { kind: 'seat', seat: 0, i: 0 };

const sameSlot = (a: Slot, b: Slot): boolean =>
  a.kind === b.kind &&
  (a.kind === 'dead' || (a.kind === 'seat' && b.kind === 'seat' ? a.seat === b.seat && a.i === b.i : a.kind === 'board' && b.kind === 'board' && a.i === b.i));

/**
 * Where the card after this one goes. The deal runs the way a dealer's would:
 * finish the hand, give the second seat its hand, then the board, then
 * anything else is dead. Beyond the second seat a hand is dealt only where the
 * reader taps, because nine hands are the exception and the board is not.
 */
function nextSlot(after: Slot, t: Table): Slot {
  const firstEmpty = (seat: number): Slot | null => {
    const i = t.seats[seat]!.findIndex((c) => c === null);
    return i < 0 ? null : { kind: 'seat', seat, i };
  };
  const boardEmpty = (): Slot | null => {
    const i = t.board.findIndex((c) => c === null);
    return i < 0 ? null : { kind: 'board', i };
  };
  if (after.kind === 'seat') {
    const same = firstEmpty(after.seat);
    if (same !== null) return same;
    if (after.seat === 0) {
      const second = firstEmpty(1);
      if (second !== null) return second;
    }
    return boardEmpty() ?? { kind: 'dead' };
  }
  if (after.kind === 'board') return boardEmpty() ?? { kind: 'dead' };
  return { kind: 'dead' };
}

function place(t: Table, slot: Slot, c: Card): Table {
  if (slot.kind === 'seat') {
    const seats = t.seats.map((s) => [...s]);
    seats[slot.seat]![slot.i] = c;
    return { ...t, seats };
  }
  if (slot.kind === 'board') {
    const board = [...t.board];
    board[slot.i] = c;
    return { ...t, board };
  }
  return { ...t, dead: [...t.dead, c] };
}

function remove(t: Table, c: Card): Table {
  return {
    seats: t.seats.map((s) => s.map((x) => (x === c ? null : x))),
    board: t.board.map((x) => (x === c ? null : x)),
    dead: t.dead.filter((x) => x !== c),
  };
}

const SUIT_GLYPH = ['♣', '♦', '♥', '♠'] as const;
const isRed = (c: Card): boolean => (c & 3) === 1 || (c & 3) === 2;

const pct = (x: number): string => `${(x * 100).toFixed(2)}%`;

export default function OddsCalculator() {
  const t = useTheme();
  const [table, setTable] = useState<Table>(emptyTable);
  const [active, setActive] = useState<Slot>(FIRST);
  const [result, setResult] = useState<Odds | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const used = useMemo(
    () => new Set<Card>([...table.seats.flat(), ...table.board].filter((c): c is Card => c !== null).concat(table.dead)),
    [table],
  );

  /* The hands that are in: seats with both cards. A seat with one card is not
     a hand yet and holds the calculation up — the odds are for the table the
     reader has set, not for a guess at it. */
  const complete: { seat: number; hand: Hand }[] = [];
  table.seats.forEach((s, seat) => {
    const [a, b] = s;
    if (a !== null && a !== undefined && b !== null && b !== undefined) complete.push({ seat, hand: [a, b] });
  });
  const halfDealt = table.seats.findIndex((s) => s.some((c) => c !== null) && s.some((c) => c === null));
  const boardCards = table.board.filter((c): c is Card => c !== null);

  const input = useMemo(
    () => ({ hands: complete.map((x) => x.hand), board: boardCards, dead: table.dead }),
    // The signature is the cards themselves; the arrays above are rebuilt per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table],
  );
  const problem = halfDealt >= 0 ? `Player ${halfDealt + 1} needs a second card` : oddsProblem(input);

  /*
   * THE CALCULATION, SLICED. A heads-up hand before the flop is 1.7 million
   * boards, which is a second or two on a phone — long enough that a screen
   * doing it in one go would freeze with the last tap half-drawn. So it runs
   * in slices with a timeout between them, the meta line shows the count, and
   * the next tap cancels it through `cancelled` before starting over.
   */
  const run = useRef(0);
  useEffect(() => {
    const id = ++run.current;
    if (problem !== null) {
      setResult(null);
      setProgress(null);
      return;
    }
    const e = new OddsEnumeration(input);
    setProgress(0);
    const slice = () => {
      if (run.current !== id) return;
      if (e.step(30_000)) {
        setResult(e.result());
        setProgress(null);
      } else {
        setProgress(e.done / e.total);
        setTimeout(slice, 0);
      }
    };
    slice();
    return () => {
      run.current++;
    };
  }, [input, problem]);

  const deal = (c: Card) => {
    const next = place(table, active, c);
    setTable(next);
    setActive(nextSlot(active, next));
  };

  const takeBack = (c: Card, from: Slot) => {
    setTable(remove(table, c));
    setActive(from.kind === 'dead' ? { kind: 'dead' } : from);
  };

  const newHand = () => {
    setTable(emptyTable());
    setActive(FIRST);
  };

  const meta =
    progress !== null
      ? `Calculating · ${Math.round(progress * 100)}%`
      : result !== null
        ? `${result.boards.toLocaleString('en-US')} ${result.boards === 1 ? 'board' : 'boards'} dealt · exact`
        : problem === null
          ? 'Texas hold’em'
          : halfDealt >= 0
            ? problem
            : 'Texas hold’em · deal two hands';

  const seatOdds = (seat: number) => {
    if (result === null) return null;
    const i = complete.findIndex((x) => x.seat === seat);
    return i < 0 ? null : result.seats[i]!;
  };

  const slotProps = (slot: Slot, c: Card | null, label: string) => ({
    card: c,
    active: sameSlot(slot, active),
    label,
    onPress: () => (c === null ? setActive(slot) : takeBack(c, slot)),
  });

  const deck = (
    <View style={styles.deckWrap}>
      <View style={styles.deckRow}>
        <Text style={[styles.hint, { color: t.muted }]} numberOfLines={2}>
          Tap a card to deal it to the outlined place. Tap a dealt card to take it back.
        </Text>
        <Button label="New hand" variant="chip" onPress={newHand} />
      </View>
      {/* One row per suit, aces first — the shape every deck picker has had
          since the first one, because it is how a person finds a card. */}
      {[3, 2, 1, 0].map((suit) => (
        <View key={suit} style={styles.suitRow}>
          <Text style={[styles.suitGlyph, { color: isRed(suit) ? t.loss : t.text }]}>{SUIT_GLYPH[suit]}</Text>
          {RANKS.map((rank, r) => {
            const c = (12 - r) * 4 + suit;
            const gone = used.has(c);
            return (
              <Pressable
                key={rank}
                accessibilityRole="button"
                accessibilityLabel={`${RANKS[12 - r]}${SUIT_GLYPH[suit]}${gone ? ', dealt' : ''}`}
                disabled={gone}
                onPress={() => deal(c)}
                style={({ pressed }) => [
                  styles.deckCard,
                  { backgroundColor: gone ? 'transparent' : t.surface, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.deckRank,
                    { color: gone ? t.disabled : isRed(suit) ? t.loss : t.text },
                  ]}
                >
                  {RANKS[12 - r]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <Screen
      title="Odds calculator"
      backTo="Settings"
      meta={meta}
      footer={deck}
    >
      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Players</Text>
        <View style={styles.grid}>
          {table.seats.map((hand, seat) => {
            const o = seatOdds(seat);
            return (
              <View key={seat} style={[styles.cell, { backgroundColor: t.surface }]}>
                <Text style={[styles.cellLabel, { color: t.muted }]}>Player {seat + 1}</Text>
                <View style={styles.cellBody}>
                  <View style={styles.pair}>
                    {hand.map((c, i) => (
                      <CardSlot
                        key={i}
                        {...slotProps({ kind: 'seat', seat, i }, c, `Player ${seat + 1}, card ${i + 1}`)}
                      />
                    ))}
                  </View>
                  <View style={styles.figures}>
                    <Figure label="Win" value={o === null ? '—' : pct(o.win)} />
                    <Figure label="Tie" value={o === null ? '—' : pct(o.tie)} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Board</Text>
        <View style={styles.row}>
          {table.board.map((c, i) => (
            <CardSlot key={i} {...slotProps({ kind: 'board', i }, c, `Board, card ${i + 1}`)} />
          ))}
        </View>

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Dead cards</Text>
        <View style={styles.row}>
          {table.dead.map((c) => (
            <CardSlot key={c} {...slotProps({ kind: 'dead' }, c, 'Dead card')} active={false} />
          ))}
          <CardSlot {...slotProps({ kind: 'dead' }, null, 'Next dead card')} />
        </View>
      </View>
    </Screen>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.figure}>
      <Text style={[styles.figureLabel, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.figureValue, { color: t.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** One place a card can be: empty, outlined when it is next, or holding one. */
function CardSlot({
  card,
  active,
  label,
  onPress,
}: {
  card: Card | null;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const text = card === null ? `${label}, empty` : `${label}, ${RANKS[card >> 2]}${SUIT_GLYPH[card & 3]}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      onPress={onPress}
      style={({ pressed }) => [
        styles.slot,
        {
          backgroundColor: card === null ? t.ground : t.raised,
          borderColor: active ? t.text : t.hairline,
          borderWidth: active ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      {card !== null && (
        <>
          <Text style={[styles.slotRank, { color: isRed(card) ? t.loss : t.text }]}>{RANKS[card >> 2]}</Text>
          <Text style={[styles.slotSuit, { color: isRed(card) ? t.loss : t.text }]}>{SUIT_GLYPH[card & 3]}</Text>
        </>
      )}
    </Pressable>
  );
}

const SLOT_W = 36;
const SLOT_H = 50;

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 8, paddingTop: 4 },
  after: { paddingTop: 22 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    /* Two to a row at every width in the device matrix: 360 − 44 − 8 = 308,
       half of which is 154, and the cell asks for less than that. */
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: radius.pressable + 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  cellLabel: { ...type.statLabel },
  cellBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pair: { flexDirection: 'row', gap: 4 },
  figures: { flex: 1, gap: 4, minWidth: 0 },
  figure: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 },
  figureLabel: { ...type.rowDetail },
  figureValue: { ...type.time, flexShrink: 1 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },

  slot: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotRank: { fontSize: 17, fontWeight: '800', lineHeight: 19 },
  slotSuit: { fontSize: 13, lineHeight: 15 },

  deckWrap: { gap: 4 },
  deckRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
  hint: { ...type.footnote, flex: 1 },
  suitRow: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  suitGlyph: { width: 16, fontSize: 13, textAlign: 'center' },
  deckCard: {
    flex: 1,
    height: 34,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckRank: { fontSize: 13, fontWeight: '700' },
});
