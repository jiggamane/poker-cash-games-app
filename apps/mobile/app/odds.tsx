import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import {
  BOARD_CARDS,
  HOLE_CARDS,
  MAX_SEATS,
  OddsEnumeration,
  RANKS,
  groupOuts,
  oddsProblem,
  outsToCome,
  riverHands,
  standings,
  type Card,
  type Hand,
  type Odds,
  type RiverHand,
  type SeatOuts,
  type Standing,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad } from '../src/components/Keypad';
import { OutsNames, OutsTable } from '../src/components/OutsBlock';
import { CARD_FACE, HandCard, Pip, SUIT_GLYPH, inkOf } from '../src/components/PlayingCard';
import { PotOddsCard, type PotField } from '../src/components/PotOddsCard';
import { Screen } from '../src/components/Screen';
import { amountOf, useTypedAmount } from '../src/components/typedAmount';
import { useTheme } from '../src/design/useTheme';
import { control, radius, space, type } from '../src/design/tokens';
import { oddsStatus } from '../src/lib/oddsStatus';
import { oddsTone } from '../src/lib/oddsTone';
import { runOutParams } from '../src/lib/runOut';

/**
 * Poker calculator — Texas hold'em, win and tie per hand. *Odds calculator*
 * until 26 October; the owner named it on the canvas "Poker calculator · ways
 * in" and the name is the same everywhere it is written.
 *
 * A PUSH (Chrome A, back → Settings, Poker tools or Tonight): a tool you stay in and
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
 * *New hand* is a round restart icon at the right end of the status line — not
 * in the top-right corner, which a pushed screen keeps empty — and clears the
 * cards and keeps the seats. There is no hint under the deck: the owner took it
 * out on 24 October.
 *
 * PRESSING A CARD SHOWS IT LARGE (option D on the canvas, chosen 24 October).
 * The deck is 25 × 40 pt a card, below what a thumb can be sure of, so a press
 * lifts an enlarged copy of the card above the finger: you see what you are
 * about to deal. Since 27 October the finger can slide from card to card
 * before letting go, as on a keyboard, and the copy follows it; letting go off
 * the deck cancels. A tap is still one tap.
 *
 * POT ODDS — decided 24 October, made permanent on 25 October (no setting, no
 * "experiment") — is one section under the players, shown only while an exact
 * result is on screen and the flop or the turn is down (not before the flop, not
 * on the river), for Player 1, who is "you" and wears a *You* tag while the card
 * is showing. `PotOddsCard` lays it
 * out and `potOdds()` in core does every figure of it. Typing the pot or the
 * call swaps the deck at the foot for the amount keypad and a *Done*: one
 * footer, one job, so a card cannot be dealt while an amount is being typed.
 * ⚠ NOT DRAWN: *Done*, the *—* a Needs shows before a call is typed, and the
 * *You* tag on the players list (the board tags the pot odds card only).
 *
 * THE RIVER (decided 26 October, board 21). Once the fifth card is down nothing
 * is left to count, and the card says so three ways: the figures are whole —
 * 100%, 0%, 50% on a chop — the hand's name sits under them (*Pair of kings*,
 * with *· king kicker* only when the kicker decided the pot), and the chevron,
 * now on every player in the hand, opens the five cards that make it. The
 * names, the five and the kicker are `riverHands()` in core, off the engine's
 * own value; the outs never show on the river, and neither does pot odds.
 * ⚠ NOT DRAWN: the chevron's label *Hand for Player N*; a chop reads *Too close*
 * on both cards, which wants a word of its own (`oddsTone`).
 *
 * The board is at the top and the seats under it, three to begin with and one
 * more per tap of *Add a player* up to nine — the owner's instruction, 24
 * October, over the original's nine seats always on show.
 *
 * ⚠ COPY NOT DRAWN. No board draws this screen, so every string on it is mine
 * and wants review: the title, the status line's five states (written down in
 * `src/lib/oddsStatus.ts`), the seat labels, *Win* and *Tie*, *Board*, *Dead
 * cards*, *Add a player*, *New hand*.
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

/**
 * THE DEALT CARDS SURVIVE LEAVING THE SCREEN.
 *
 * Since Tonight is a way in (26 October) the calculator is opened mid-hand,
 * and a host who steps back to record a rebuy and returns expects the table
 * they set, not an empty one. The last table and the place the next card goes
 * live here for as long as the app runs — in memory, never in the ledger and
 * never on disk: a hand is not a record of anything. *New hand* clears it
 * through the state it mirrors. The checks load the route fresh for every
 * table (`ui-odds.mjs`), so none of them see a table carried over.
 */
let kept: { table: Table; active: Slot } | null = null;

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

/**
 * A share as the card prints it: two decimals while boards are still to come,
 * a whole number once the board is complete and the share is a verdict —
 * decided 26 October. One function, so the two forms cannot drift apart.
 */
const pct = (x: number, whole = false): string => (whole ? `${Math.round(x * 100)}%` : `${(x * 100).toFixed(2)}%`);

export default function OddsCalculator() {
  const t = useTheme();
  /* Where back goes, for the screen reader: Settings as before; Poker tools
     since the home grid (25 October) reaches the calculator through it; and
     Tonight since the role line's icon does (26 October). */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const backTo = from === 'tonight' ? 'Tonight' : from === 'tools' ? 'Poker tools' : 'Settings';
  /* THE TABLE OUTLIVES THE SCREEN — `kept`, above. A host who steps out
     mid-hand to record a rebuy comes back to the cards they dealt. */
  const [table, setTable] = useState<Table>(() => kept?.table ?? emptyTable());
  const [active, setActive] = useState<Slot>(() => kept?.active ?? FIRST);
  useEffect(() => {
    kept = { table, active };
  }, [table, active]);
  /* Both are kept WITH the table they belong to. A result is only ever shown
     for the cards it was calculated from — see `shown` below. */
  const [result, setResult] = useState<{ key: string; odds: Odds } | null>(null);
  const [progress, setProgress] = useState<{ key: string; done: number } | null>(null);
  /* The card under the finger, for the enlarged copy above it, and how wide the
     deck is, which is what places that copy over the right column. */
  const [pressedCard, setPressedCard] = useState<Card | null>(null);
  const [deckW, setDeckW] = useState(0);
  /* POT ODDS. Which amount the keypad is on, if either; whether the card is
     open; and the two amounts as typed. */
  const [potOpen, setPotOpen] = useState(false);
  const [editing, setEditing] = useState<PotField | null>(null);
  const potField = useTypedAmount(0);
  const callField = useTypedAmount(0);
  /* Which seats have their chevron open: the outs on the turn, the five cards on
     the river. Only a hand that is chasing has outs; every hand has a hand. */
  const [outsOpen, setOutsOpen] = useState<ReadonlySet<number>>(new Set());

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
   * half-dealt guard and watching the page die (B101). And ONLY WHILE THE TABLE
   * CAN BE COUNTED: a seat holding one card is not part of the key, so without
   * `problem === null` here the old result still matched it for one frame (B102).
   */
  const shown = problem === null && result !== null && result.key === inputKey ? result.odds : null;
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
    setPressedCard(null);
    const next = place(table, active, c);
    setTable(next);
    setActive(nextSlot(active, next));
  };

  const takeBack = (c: Card, from: Slot) => {
    setTable(remove(table, c));
    setActive(from.kind === 'dead' ? { kind: 'dead' } : from);
  };

  const newHand = () => {
    setPressedCard(null);
    /* A new hand is a new pot. */
    potField.offer(0);
    callField.offer(0);
    setEditing(null);
    setOutsOpen(new Set());
    setTable(emptyTable(table.seats.length));
    setActive(FIRST);
  };

  const addSeat = () => {
    if (table.seats.length >= MAX_SEATS) return;
    setTable({ ...table, seats: [...table.seats, emptySeat()] });
  };

  const meta = oddsStatus({
    halfDealtSeat: halfDealt,
    fullHands: complete.length,
    problem,
    boardsDealt: shown === null ? null : shown.boards,
    calculating,
    progress: doneShare,
  });

  const seatOdds = (seat: number) => {
    if (shown === null) return null;
    const i = complete.findIndex((x) => x.seat === seat);
    return i < 0 ? null : (shown.seats[i] ?? null);
  };

  /*
   * WHERE EACH HAND STANDS, and — with exactly one card still to come — which
   * cards win it. Both are core's (`standings`, `outsToCome`): the screen colours
   * and words a figure by the first, and shows the second under a hand that is
   * not ahead. Only for the result on screen, so a table that has just changed
   * has neither until its own result lands.
   */
  const stands: Standing[] | null = useMemo(() => (shown === null ? null : standings(shown.seats)), [shown]);
  const outsAll: SeatOuts[] | null = useMemo(
    () => (shown !== null && boardCards.length === 4 ? outsToCome(input) : null),
    // `inputKey` IS the cards, as above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, inputKey],
  );
  const boardComplete = boardCards.length === BOARD_CARDS;
  /* ON THE RIVER: every hand named, its five cards, and the kicker that decided
     it — core's, for the result on screen. */
  const river: RiverHand[] | null = useMemo(
    () => (shown !== null && boardComplete ? riverHands(input) : null),
    // `inputKey` IS the cards, as above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, inputKey],
  );
  const toggleOuts = (seat: number) =>
    setOutsOpen((now) => {
      const next = new Set(now);
      if (!next.delete(seat)) next.add(seat);
      return next;
    });

  /* POT ODDS SHOW only when a result is on screen, the flop or the turn is down
     (before the flop the figures are the same but nobody is deciding yet; on the
     river the board is complete and the figure is 0 or 100) and Player 1 is in
     the hand — "you" is always the first seat. */
  const youOdds = boardCards.length >= 3 && boardCards.length < 5 ? seatOdds(0) : null;
  const potShown = shown !== null && youOdds !== null;
  const typing = potShown && potOpen ? editing : null;
  const field = typing === 'pot' ? potField : callField;

  const slotProps = (slot: Slot, c: Card | null, label: string) => ({
    card: c,
    active: sameSlot(slot, active),
    label,
    onPress: () => (c === null ? setActive(slot) : takeBack(c, slot)),
  });

  /*
   * WHERE THE ENLARGED CARD GOES. The deck is thirteen cells to a row with a gap
   * of DECK_GAP; the cell under the finger fixes the centre, and the copy sits
   * CALLOUT_GAP above that cell, which puts it over the rows above it — as a
   * keyboard's key callout does. Kept CALLOUT_EDGE inside the screen on the A
   * and 2 columns, where a centred copy would hang off it, with the stem still
   * pointing at the cell.
   */
  const calloutAt = (c: Card) => {
    const col = 12 - (c >> 2);
    const row = 3 - (c & 3);
    const cellW = (deckW - 12 * DECK_GAP) / 13;
    const centre = col * (cellW + DECK_GAP) + cellW / 2;
    const left = Math.min(
      Math.max(centre - CALLOUT_W / 2, CALLOUT_EDGE - space.card),
      deckW + space.card - CALLOUT_EDGE - CALLOUT_W,
    );
    const top = row * (DECK_CELL_H + DECK_GAP) - CALLOUT_GAP - CALLOUT_H;
    const stem = Math.min(Math.max(centre - left - STEM / 2, 8), CALLOUT_W - STEM - 8);
    return { left, top, stem };
  };

  /*
   * SLIDE TO PICK, the way a phone keyboard works (the owner, 27 October). The
   * finger goes down on any cell and the enlarged copy shows the card under it;
   * sliding moves the copy from card to card; letting go deals the card under
   * the finger. Let go off the deck, or over a card already on the table, and
   * nothing is dealt — the old "slide off to cancel", kept.
   *
   * Every cell is a responder of its own, so the cell under the first touch
   * keeps the gesture (a responder keeps every move until release). Where that
   * cell is in the deck is known — its column and row — so the deck's origin on
   * the page is the touch less its offset in the cell less the cell's offset in
   * the deck, and every later move is placed against that origin in arithmetic.
   * The cell's contents take no touches (`box-only`), so the offset is always
   * the cell's, never the rank's or the pip's.
   */
  const origin = useRef({ x: 0, y: 0 });
  const hovered = useRef<Card | null>(null);
  const cellW = (deckW - 12 * DECK_GAP) / 13;
  const deckH = 4 * DECK_CELL_H + 3 * DECK_GAP;
  const cardUnder = (pageX: number, pageY: number): Card | null => {
    const x = pageX - origin.current.x;
    const y = pageY - origin.current.y;
    if (deckW <= 0 || x < -SLIDE_SLOP || x > deckW + SLIDE_SLOP || y < -SLIDE_SLOP || y > deckH + SLIDE_SLOP) return null;
    const col = Math.min(12, Math.max(0, Math.floor((x + DECK_GAP / 2) / (cellW + DECK_GAP))));
    const row = Math.min(3, Math.max(0, Math.floor((y + DECK_GAP / 2) / (DECK_CELL_H + DECK_GAP))));
    const c = (12 - col) * 4 + (3 - row);
    return used.has(c) ? null : c;
  };
  const hover = (c: Card | null) => {
    hovered.current = c;
    setPressedCard(c);
  };
  const endSlide = (dealIt: boolean) => {
    const c = hovered.current;
    hover(null);
    if (dealIt && c !== null) deal(c);
  };

  const deck = (
    <View
      style={styles.deckWrap}
      onLayout={(e: LayoutChangeEvent) => setDeckW(e.nativeEvent.layout.width)}
    >
      {/* One row per suit, aces first — the shape every deck picker has had
          since the first one, because it is how a person finds a card. Each
          cell is a small card of its own: stock, rank, pip. A card already on
          the table is a gap where it was. */}
      {[3, 2, 1, 0].map((suit, row) => (
        <View key={suit} style={styles.suitRow}>
          {RANKS.map((rank, col) => {
            const c = (12 - col) * 4 + suit;
            const gone = used.has(c);
            return (
              <View
                key={rank}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${RANKS[12 - col]}${SUIT_GLYPH[suit]}${gone ? ', dealt' : ''}`}
                accessibilityState={{ disabled: gone }}
                /* VoiceOver and TalkBack activate the cell rather than touch it. */
                onAccessibilityTap={() => !gone && deal(c)}
                pointerEvents="box-only"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={(e) => {
                  const { pageX, pageY, locationX, locationY } = e.nativeEvent;
                  origin.current = {
                    x: pageX - locationX - col * (cellW + DECK_GAP),
                    y: pageY - locationY - row * (DECK_CELL_H + DECK_GAP),
                  };
                  hover(gone ? null : c);
                }}
                onResponderMove={(e) => {
                  const next = cardUnder(e.nativeEvent.pageX, e.nativeEvent.pageY);
                  if (next !== hovered.current) hover(next);
                }}
                onResponderRelease={(e) => {
                  hovered.current = cardUnder(e.nativeEvent.pageX, e.nativeEvent.pageY);
                  endSlide(true);
                }}
                onResponderTerminate={() => endSlide(false)}
                style={[
                  styles.deckCard,
                  /* A card already on the table is a flat blank where it
                     was — no edge, no ink — so it cannot be mistaken for
                     a place that takes one. */
                  { backgroundColor: gone ? t.surface : CARD_FACE },
                  pressedCard === c && !gone && { borderWidth: 2, borderColor: t.text },
                ]}
              >
                {!gone && (
                  <>
                    <Text style={[styles.deckRank, { color: inkOf(c) }]}>{RANKS[12 - col]}</Text>
                    <Pip suit={suit} size={11} color={inkOf(c)} />
                  </>
                )}
              </View>
            );
          })}
        </View>
      ))}
      {pressedCard !== null && !used.has(pressedCard) && deckW > 0 && (
        <Callout card={pressedCard} {...calloutAt(pressedCard)} />
      )}
    </View>
  );

  /* New hand: a round icon, the back button's fill, at the right end of the
     status line. See `Screen`'s `metaTrailing`: the text beside it shrinks and
     this does not. Its hit area is 50 pt with the slop. */
  const restart = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New hand"
      hitSlop={8}
      onPress={newHand}
      style={({ pressed }) => [
        styles.restart,
        { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name="restart" color={t.text} />
    </Pressable>
  );

  return (
    <Screen
      title="Poker calculator"
      backTo={backTo}
      meta={meta}
      metaTrailing={restart}
      footer={
        typing === null ? (
          deck
        ) : (
          /* The amount keypad in the deck's place, with the way back to the deck. */
          <View style={styles.amountFoot}>
            <Keypad {...field.keys} />
            <View style={styles.doneWrap}>
              <Button label="Done" onPress={() => setEditing(null)} />
            </View>
          </View>
        )
      }
      footerPad={typing === null}
    >
      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Board</Text>
        <View style={styles.row}>
          {table.board.map((c, i) => (
            <CardSlot key={i} {...slotProps({ kind: 'board', i }, c, `Board, card ${i + 1}`)} />
          ))}
        </View>

        {/*
         * RUN IT OUT — the same hands on every street as one picture (`/run-out`,
         * board 19). Under the board because it is about the board: it appears
         * with the third board card, once two hands are in and the engine will
         * take the table, and goes with the card that made it. Before the flop
         * there is one street and nothing to run. ⚠ COPY NOT DRAWN: the label is
         * the canvas's own name for the replay (§ 8), on a button it did not draw.
         * HIDDEN on 27 October (the owner): `RUN_IT_OUT` below. The route stays,
         * reachable by its link.
         */}
        {RUN_IT_OUT && problem === null && boardCards.length >= 3 && (
          <View style={styles.runOut}>
            <Button label="Run it out" variant="secondary" onPress={() => router.push({ pathname: '/run-out', params: runOutParams(input) })} />
          </View>
        )}

        <Text style={[styles.sectionLabel, styles.after, { color: t.muted }]}>Players</Text>
        {/*
         * One CARD per seat — layout G, decided 25 October: the hand, the name
         * with its word (Favourite, Underdog, Too close) and the figures, on a
         * surface a step off the ground. It was a hairline row; a two-up grid was
         * tried before that and did not have the width: beside two cards,
         * `82.36%` and its label need 110 points, and half of a 360 phone minus
         * the cards is 64. A figure cut to `82….` is the fault this repository's
         * whole UI gate exists for, so a card is one to a line, where the figure
         * has the room at every width and text size.
         *
         * OUTS. A hand that is not ahead, with exactly one card still to come and
         * at least one card that wins it, has a round chevron at the right end of
         * its card; closed, the names of what those cards make sit under it with
         * no numbers, open, the table. A hand that is ahead has none: it is
         * waiting for blanks. The flop (two to come) is not drawn on the board and
         * is not built.
         */}
        {table.seats.map((hand, seat) => {
          const o = seatOdds(seat);
          const idx = complete.findIndex((x) => x.seat === seat);
          const standing = stands !== null && idx >= 0 ? (stands[idx] ?? null) : null;
          const tone = standing === null ? null : oddsTone(standing, t, boardComplete);
          const groups =
            standing !== null && standing.kind !== 'ahead' && outsAll !== null ? groupOuts(outsAll[idx]?.wins ?? []) : [];
          const hasOuts = groups.length > 0;
          /* The river: the hand this seat holds, named, with its five cards behind the same chevron. */
          const settled = river !== null && idx >= 0 ? (river[idx] ?? null) : null;
          const hasControl = hasOuts || settled !== null;
          const open = hasControl && outsOpen.has(seat);
          return (
            <View key={seat} nativeID={`seat-${seat + 1}`} style={[styles.seatCard, { backgroundColor: t.surface }]}>
              <View style={styles.seatRow}>
                <View style={styles.pair}>
                  {hand.map((c, i) => (
                    <CardSlot
                      key={i}
                      {...slotProps({ kind: 'seat', seat, i }, c, `Player ${seat + 1}, card ${i + 1}`)}
                    />
                  ))}
                </View>
                <View style={styles.seatText}>
                  <View style={styles.seatName}>
                    <Text style={[styles.seatLabel, { color: t.muted }]}>Player {seat + 1}</Text>
                    {tone !== null && (
                      <Text nativeID={`seat-${seat + 1}-word`} style={[styles.word, { color: tone.color }]}>
                        {tone.word}
                      </Text>
                    )}
                    {/* While the pot odds card is showing: the first seat is "you". */}
                    {potShown && seat === 0 && (
                      <View style={[styles.youTag, { backgroundColor: t.roundFill }]}>
                        <Text style={[styles.youText, { color: t.text }]}>You</Text>
                      </View>
                    )}
                  </View>
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
                      <Figure label="Win" value={o === null ? '—' : pct(o.win, boardComplete)} color={tone?.color} />
                      <Figure label="Tie" value={o === null ? '—' : pct(o.tie, boardComplete)} />
                    </View>
                  )}
                </View>
                {hasControl && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${settled !== null ? 'Hand' : 'Outs'} for Player ${seat + 1}`}
                    aria-expanded={open}
                    hitSlop={8}
                    onPress={() => toggleOuts(seat)}
                    style={({ pressed }) => [styles.chevron, { backgroundColor: t.roundFill, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Icon name={open ? 'chevronUp' : 'chevronDown'} color={t.muted} />
                  </Pressable>
                )}
              </View>
              {settled !== null ? (
                <>
                  <Text nativeID={`hand-name-${seat + 1}`} style={[styles.handName, { color: t.text }]}>
                    {settled.label}
                  </Text>
                  {open && (
                    <View nativeID={`hand-five-${seat + 1}`} style={styles.handFive}>
                      {settled.five.map((c) => (
                        <HandCard key={c} card={c} />
                      ))}
                    </View>
                  )}
                </>
              ) : (
                hasOuts && (open ? <OutsTable seat={seat + 1} groups={groups} /> : <OutsNames seat={seat + 1} groups={groups} />)
              )}
            </View>
          );
        })}

        {/* Pot odds sit under the cards and above the way to add another hand. */}
        {potShown && youOdds !== null && shown !== null && (
          <PotOddsCard
            seat={youOdds}
            boards={shown.boards}
            pot={amountOf(potField.typed)}
            call={amountOf(callField.typed)}
            open={potOpen}
            editing={typing}
            onToggle={() => {
              setPotOpen(!potOpen);
              setEditing(null);
            }}
            onEdit={(f) => setEditing(f)}
          />
        )}

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

function Figure({ label, value, color }: { label: string; value: string; color?: string | undefined }) {
  const t = useTheme();
  return (
    <View style={styles.figure}>
      <Text style={[styles.figureLabel, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.figureValue, { color: color ?? t.text }]}>{value}</Text>
    </View>
  );
}

/**
 * The enlarged card above a pressed one — 58 × 80, rank 32 and a pip of 26, on
 * card stock with a stem pointing at the cell. It takes no touches, and is
 * hidden from the screen reader: the cell under it is what is announced.
 */
function Callout({ card, left, top, stem }: { card: Card; left: number; top: number; stem: number }) {
  return (
    <View
      nativeID="deck-callout"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.callout, { left, top }]}
    >
      <View style={[styles.stem, { left: stem }]} />
      <Text style={[styles.calloutRank, { color: inkOf(card) }]}>{RANKS[card >> 2]}</Text>
      <Pip suit={card & 3} size={26} color={inkOf(card)} />
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

/* *Run it out* under the board — hidden on 27 October by the owner's word;
   `/run-out` is still there behind its link. */
const RUN_IT_OUT = false;

/* The deck's own numbers, and the callout's, which are measured against them. */
const DECK_GAP = 3;
const DECK_CELL_H = 40;
/* How far past the deck's edge a slide still reads the edge card; beyond it the
   finger is off the deck and letting go deals nothing. */
const SLIDE_SLOP = 6;
const CALLOUT_W = 58;
const CALLOUT_H = 80;
const CALLOUT_GAP = 4;
const CALLOUT_EDGE = 8;
const STEM = 14;

const SLOT_W = 36;
const SLOT_H = 50;

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 8, paddingTop: 14 },
  after: { paddingTop: 22 },

  /* A card: the surface token, 14 round, 10 / 12 of padding — the boards' own. */
  seatCard: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.card },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pair: { flexDirection: 'row', gap: 4 },
  seatText: { flex: 1, minWidth: 0, gap: 2 },
  seatName: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 },
  word: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  chevron: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  seatLabel: { ...type.rowDetail },
  youTag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9 },
  /* The river: the hand's name under the figures, 15/500 in the text colour, and
     its five cards in a row under that — board 21's own measures. */
  handName: { fontSize: 15, fontWeight: '500', lineHeight: 20, paddingTop: 10 },
  handFive: { flexDirection: 'row', gap: 4, paddingTop: 8 },
  youText: { fontSize: 11, fontWeight: '700' },
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

  /* Above the body: the callout hangs up over the rows and the table. */
  deckWrap: { gap: DECK_GAP, position: 'relative', zIndex: 10 },
  suitRow: { flexDirection: 'row', gap: DECK_GAP },
  deckCard: {
    flex: 1,
    height: DECK_CELL_H,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckRank: { fontSize: 12, fontWeight: '800', lineHeight: 14, marginBottom: 1 },
  add: { paddingTop: 12, paddingHorizontal: 4 },
  runOut: { paddingTop: 14, paddingHorizontal: 4 },
  amountFoot: { gap: 10, paddingBottom: 6 },
  doneWrap: { paddingHorizontal: space.card },
  restart: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  callout: {
    position: 'absolute',
    width: CALLOUT_W,
    height: CALLOUT_H,
    borderRadius: 12,
    backgroundColor: CARD_FACE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  stem: {
    position: 'absolute',
    bottom: -6,
    width: STEM,
    height: STEM,
    borderRadius: 2,
    backgroundColor: CARD_FACE,
    transform: [{ rotate: '45deg' }],
  },
  calloutRank: { fontSize: 32, fontWeight: '800', lineHeight: 34 },
});
