import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
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
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';

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
 * place moves on by itself — the second hole card, then the next seat, then
 * the board, then the dead cards — and tapping any empty place moves it there.
 * *New hand* clears the cards and keeps the seats.
 *
 * The board is at the top and the seats under it, three to begin with and one
 * more per tap of *Add a player* up to nine — the owner's instruction, 24
 * October, over the original's nine seats always on show.
 *
 * ⚠ COPY NOT DRAWN. No board draws this screen, so every string on it is mine
 * and wants review: the title, the meta line's three states, the hint, the
 * seat labels, *Win* and *Tie*, *Board*, *Dead cards*, *Add a player*, *New
 * hand*.
 *
 * DELIBERATE DEVIATIONS from the original it is rebuilt from:
 *
 * - The place the next card is dealt to is outlined in the text colour, not
 *   red. In this app red means money lost and nothing else (`tokens.ts`); a
 *   red outline on an empty slot would read as a figure gone wrong.
 * - The work is sliced so the screen keeps drawing while 1.7 million boards
 *   are dealt, and the meta line counts it down. The original showed a spinner.
 *
 * AND ONE FROM THE APP'S OWN RULE. A card is drawn as a card: ivory stock,
 * black ink, red ink for hearts and diamonds, in both themes — the owner's
 * instruction, same day. `tokens.ts` says nothing in the app is coloured but
 * money, and the three constants below are the only colours in the app that
 * are not tokens. They are not a palette; they are what a deck looks like, and
 * a black heart or a white-on-black ace is a card nobody reads at a glance.
 */

/** Card stock and ink. Ivory rather than white so that a card on the light
    theme's white ground is still a card and not a hole in the page. */
const isRed = (c: Card): boolean => (c & 3) === 1 || (c & 3) === 2;
const CARD_FACE = '#FAF8F3';
const INK_BLACK = '#141416';
const INK_RED = '#C8102E';
const inkOf = (c: Card): string => (isRed(c) ? INK_RED : INK_BLACK);

/*
 * THE PIPS ARE DRAWN, NOT TYPED. Figtree has no suit glyphs, so ♠ ♥ ♦ ♣ fell
 * back to whatever font the platform had — a different one per character on
 * the web, which is why the heart came out half again the size of the spade.
 * Four paths on one 24-box, one size: the heart's, which was the one that
 * looked like a card.
 */
const PIP: Record<number, string> = {
  /* clubs */ 0: 'M12 2.5a4.2 4.2 0 0 0-4 5.4A4.3 4.3 0 1 0 10.6 15c-.2 2-1 3.6-2.8 5h8.4c-1.8-1.4-2.6-3-2.8-5a4.3 4.3 0 1 0 2.6-7.1A4.2 4.2 0 0 0 12 2.5z',
  /* diamonds */ 1: 'M12 2 20.5 12 12 22 3.5 12z',
  /* hearts */ 2: 'M12 21.5S3 15.6 3 9.3A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 9 2.7c0 6.3-9 12.2-9 12.2z',
  /* spades */ 3: 'M12 2.5C12 2.5 3.5 9.5 3.5 14.2a4.2 4.2 0 0 0 7.4 2.7c-.2 1.8-.9 3.2-2.7 4.6h7.6c-1.8-1.4-2.5-2.8-2.7-4.6a4.2 4.2 0 0 0 7.4-2.7C20.5 9.5 12 2.5 12 2.5z',
};

function Pip({ suit, size, color }: { suit: number; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PIP[suit]!} fill={color} />
    </Svg>
  );
}

type Slot = { kind: 'seat'; seat: number; i: number } | { kind: 'board'; i: number } | { kind: 'dead' };

type Table = {
  seats: (Card | null)[][];
  board: (Card | null)[];
  dead: Card[];
};

/** Three seats to begin with; `Add a player` brings the next one in. */
const FIRST_SEATS = 3;
const emptySeat = (): (Card | null)[] => Array<Card | null>(HOLE_CARDS).fill(null);
const emptyTable = (seats = FIRST_SEATS): Table => ({
  seats: Array.from({ length: seats }, emptySeat),
  board: Array<Card | null>(BOARD_CARDS).fill(null),
  dead: [],
});

const FIRST: Slot = { kind: 'seat', seat: 0, i: 0 };

const sameSlot = (a: Slot, b: Slot): boolean =>
  a.kind === b.kind &&
  (a.kind === 'dead' || (a.kind === 'seat' && b.kind === 'seat' ? a.seat === b.seat && a.i === b.i : a.kind === 'board' && b.kind === 'board' && a.i === b.i));

/**
 * Where the card after this one goes. The deal runs the way a dealer's would:
 * finish the hand, then every seat on show in turn, then the board, then
 * anything else is dead. A seat the reader has not added is not dealt to —
 * adding it is how they say it is in the hand.
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
    for (let seat = after.seat; seat < t.seats.length; seat++) {
      const empty = firstEmpty(seat);
      if (empty !== null) return empty;
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

const pct = (x: number): string => `${(x * 100).toFixed(2)}%`;
/* Grouped with commas by hand: the count is read against the figures in the
   tests and the docs, which are written that way, and a locale can turn it
   into `1.712.304` on the same phone that shows the money with commas. */
const grouped = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export default function OddsCalculator() {
  const t = useTheme();
  const [table, setTable] = useState<Table>(emptyTable);
  const [active, setActive] = useState<Slot>(FIRST);
  /* Both are kept WITH the table they belong to. A result is only ever shown
     for the cards it was calculated from — see `shown` below. */
  const [result, setResult] = useState<{ key: string; odds: Odds } | null>(null);
  const [progress, setProgress] = useState<{ key: string; done: number } | null>(null);

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

  /* The table as the calculation sees it, written out: hands in seat order, the
     board, the dead cards. Two tables with the same key have the same answer,
     which is why adding an empty seat does not throw a finished one away. */
  const inputKey = `${complete.map((x) => x.hand.join('.')).join('|')}/${boardCards.join('.')}/${table.dead.join('.')}`;
  const input = useMemo(
    () => ({ hands: complete.map((x) => x.hand), board: boardCards, dead: table.dead }),
    // `inputKey` IS the cards; the arrays above are rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputKey],
  );
  const problem = halfDealt >= 0 ? `Player ${halfDealt + 1} needs a second card` : oddsProblem(input);

  /*
   * WHAT IS SHOWN IS ONLY EVER WHAT WAS CALCULATED FOR THIS TABLE. The first
   * render after a tap still holds the last table's result — the effect below
   * has not run yet — and showing it painted one frame of figures that belonged
   * to different cards, and, when the hands themselves had changed, read a seat
   * the old result did not have and threw. Found by planting a bug in the
   * half-dealt guard and watching the page die (B101).
   */
  const shown = result !== null && result.key === inputKey ? result.odds : null;
  const calculating = problem === null && shown === null;
  const doneShare = progress !== null && progress.key === inputKey ? progress.done : 0;

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
    setProgress({ key: inputKey, done: 0 });
    const slice = () => {
      if (run.current !== id) return;
      if (e.step(30_000)) {
        setResult({ key: inputKey, odds: e.result() });
        setProgress(null);
      } else {
        setProgress({ key: inputKey, done: e.done / e.total });
        setTimeout(slice, 0);
      }
    };
    slice();
    return () => {
      run.current++;
    };
  }, [inputKey, problem]);

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
    setTable(emptyTable(table.seats.length));
    setActive(FIRST);
  };

  const addSeat = () => {
    if (table.seats.length >= MAX_SEATS) return;
    setTable({ ...table, seats: [...table.seats, emptySeat()] });
  };

  const meta = calculating
    ? `Calculating · ${Math.round(doneShare * 100)}%`
    : shown !== null
      ? `${grouped(shown.boards)} ${shown.boards === 1 ? 'board' : 'boards'} dealt · exact`
      : halfDealt >= 0 || complete.length >= 2
        ? /* A seat short of a card, or two full hands the engine will not
             take — too few cards left for the board is the one a reader
             can reach, by dealing dead cards until the deck runs out. */
          (problem ?? 'Texas hold’em')
        : 'Texas hold’em · deal two hands';

  const seatOdds = (seat: number) => {
    if (shown === null) return null;
    const i = complete.findIndex((x) => x.seat === seat);
    return i < 0 ? null : (shown.seats[i] ?? null);
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
        <Text style={[styles.hint, { color: t.muted }]}>
          Tap a card to deal it to the outlined place. Tap a dealt card to take it back.
        </Text>
        <Button label="New hand" variant="chip" onPress={newHand} />
      </View>
      {/* One row per suit, aces first — the shape every deck picker has had
          since the first one, because it is how a person finds a card. Each
          cell is a small card of its own: stock, rank, pip. A card already on
          the table is a gap where it was. */}
      {[3, 2, 1, 0].map((suit) => (
        <View key={suit} style={styles.suitRow}>
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
                  /* A card already on the table is a flat blank where it
                     was — no edge, no ink — so it cannot be mistaken for
                     a place that takes one. */
                  { backgroundColor: gone ? t.surface : CARD_FACE },
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                {!gone && (
                  <>
                    <Text style={[styles.deckRank, { color: inkOf(c) }]}>{RANKS[12 - r]}</Text>
                    <Pip suit={suit} size={11} color={inkOf(c)} />
                  </>
                )}
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
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Board</Text>
        <View style={styles.row}>
          {table.board.map((c, i) => (
            <CardSlot key={i} {...slotProps({ kind: 'board', i }, c, `Board, card ${i + 1}`)} />
          ))}
        </View>

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Players</Text>
        {/*
         * One row per seat, the hairline list every other screen uses. A
         * two-up grid was tried first and did not have the width: beside two
         * cards, `82.36%` and its label need 110 points, and half of a 360
         * phone minus the cards is 64. A figure cut to `82….` is the fault
         * this repository's whole UI gate exists for, so the row is the one
         * layout where the figure has the room at every width and text size.
         */}
        {table.seats.map((hand, seat) => {
          const o = seatOdds(seat);
          return (
            <View
              key={seat}
              style={[
                styles.seatRow,
                { borderBottomColor: t.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={styles.pair}>
                {hand.map((c, i) => (
                  <CardSlot
                    key={i}
                    {...slotProps({ kind: 'seat', seat, i }, c, `Player ${seat + 1}, card ${i + 1}`)}
                  />
                ))}
              </View>
              <View style={styles.seatText}>
                <Text style={[styles.seatLabel, { color: t.muted }]}>Player {seat + 1}</Text>
                {/*
                 * WHILE THE BOARDS ARE BEING DEALT the figures are not shown —
                 * not the last ones, which are for a table that no longer
                 * exists, and not a dash, which says there is nothing to
                 * come. A bar that fills, where the figure is about to be,
                 * in every seat that is in the hand.
                 */}
                {calculating && complete.some((x) => x.seat === seat) ? (
                  <View style={styles.loading} accessibilityLabel={`Calculating, ${Math.round(doneShare * 100)}%`}>
                    <Text style={[styles.figureLabel, { color: t.muted }]}>Calculating</Text>
                    <View style={[styles.track, { backgroundColor: t.hairline }]}>
                      <View style={[styles.fill, { backgroundColor: t.text, width: `${Math.max(2, Math.round(doneShare * 100))}%` }]} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.figures}>
                    <Figure label="Win" value={o === null ? '—' : pct(o.win)} />
                    <Figure label="Tie" value={o === null ? '—' : pct(o.tie)} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
        {/* Dashed, because dashed means "creates something" (`tokens.ts`).
            Gone at nine, which is the table's limit and the engine's. */}
        {table.seats.length < MAX_SEATS && (
          <View style={styles.add}>
            <Button label="Add a player" variant="add" onPress={addSeat} />
          </View>
        )}

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
      <Text style={[styles.figureValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

/**
 * One place a card can be: empty, outlined when it is next, or holding one.
 *
 * An empty place is a dashed edge with a plus in it — dashed because dashed
 * means "creates something" (`tokens.ts`), the plus because the owner asked
 * (24 October) for a place that takes a card to look unlike a card that has
 * been taken, which in the deck is a flat blank. The next place is the same
 * plus inside a solid outline in the text colour. No fill on either: a fill
 * the colour of what is behind it is a block that paints nothing, which
 * `ui-audit.mjs` calls surface-on-itself and is right to. A dealt card is
 * card stock with ink on it, the same in both themes; see the head of the file.
 */
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
          backgroundColor: card === null ? 'transparent' : CARD_FACE,
          borderColor: active ? t.text : card === null ? t.dashed : CARD_FACE,
          borderWidth: active ? 2 : card === null ? control.quietWidth : StyleSheet.hairlineWidth,
          borderStyle: card === null && !active ? 'dashed' : 'solid',
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      {card === null ? (
        <Icon name="plus" color={active ? t.text : t.muted} size={16} />
      ) : (
        <>
          <Text style={[styles.slotRank, { color: inkOf(card) }]}>{RANKS[card >> 2]}</Text>
          <Pip suit={card & 3} size={14} color={inkOf(card)} />
        </>
      )}
    </Pressable>
  );
}

const SLOT_W = 36;
const SLOT_H = 50;

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 8, paddingTop: 14 },
  after: { paddingTop: 22 },

  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  pair: { flexDirection: 'row', gap: 4 },
  seatText: { flex: 1, minWidth: 0, gap: 2 },
  seatLabel: { ...type.rowDetail },
  /* The two figures on one line, wrapping to two only if the text setting
     leaves them no room — never truncating. */
  figures: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 2 },
  figure: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  figureLabel: { ...type.rowDetail },
  figureValue: { ...type.rowName, fontVariant: ['tabular-nums'] },
  /* The loading state stands exactly as tall as the figures line it replaces,
     so the row does not jump when the result lands. */
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 22 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },

  slot: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotRank: { fontSize: 17, fontWeight: '800', lineHeight: 19, marginBottom: 1 },

  deckWrap: { gap: 3 },
  deckRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
  hint: { ...type.footnote, flex: 1 },
  suitRow: { flexDirection: 'row', gap: 3 },
  deckCard: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckRank: { fontSize: 12, fontWeight: '800', lineHeight: 14, marginBottom: 1 },
  add: { paddingTop: 12, paddingHorizontal: 4 },
});
