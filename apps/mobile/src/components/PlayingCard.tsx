import { StyleSheet, Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { RANKS, type Card } from '@poker-club/core';

/**
 * What a playing card looks like, shared by the odds screen's deck and slots and
 * by the outs under a player.
 *
 * A card is drawn as a card: ivory stock, black ink, red ink for hearts and
 * diamonds, in both themes — the owner's instruction, 24 October. `tokens.ts`
 * says nothing in the app is coloured but money, and the three constants here
 * are the only colours in the app that are not tokens. They are not a palette;
 * they are what a deck looks like, and a black heart or a white-on-black ace is
 * a card nobody reads at a glance.
 */

export const isRed = (c: Card): boolean => (c & 3) === 1 || (c & 3) === 2;
export const CARD_FACE = '#FAF8F3';
export const INK_BLACK = '#141416';
export const INK_RED = '#C8102E';
export const inkOf = (c: Card): string => (isRed(c) ? INK_RED : INK_BLACK);
export const SUIT_GLYPH = ['♣', '♦', '♥', '♠'] as const;
/** The deck button's own name for a card: rank, then the suit's glyph — `T♥`. */
export const cardName = (c: Card): string => `${RANKS[c >> 2]}${SUIT_GLYPH[c & 3]}`;

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

export function Pip({ suit, size, color }: { suit: number; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PIP[suit]!} fill={color} />
    </Svg>
  );
}

/**
 * A card in a fan: 30 × 40, the rank and the pip in the top-left corner where a
 * real card has its index, so a card laid over by the next one still says what
 * it is. The cards overlap by `FAN_OVERLAP`, which leaves 16 points of each one
 * showing — enough for a rank and a pip side by side.
 */
export const FAN_W = 30;
export const FAN_H = 40;
export const FAN_OVERLAP = 14;

export function FanCard({ card, first }: { card: Card; first: boolean }) {
  const ink = inkOf(card);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={cardName(card)}
      style={[styles.fan, { marginLeft: first ? 0 : -FAN_OVERLAP }]}
    >
      <Text style={[styles.fanRank, { color: ink }]}>{RANKS[card >> 2]}</Text>
      <Pip suit={card & 3} size={10} color={ink} />
    </View>
  );
}

/**
 * A card in a player's five on the river — 27 × 38, smaller than the 36 × 50
 * of a place on the table (board 21: the hand is a footnote to the figure, not
 * a second table). Laid side by side with a 4 pt gap, not fanned, so the rank
 * and the pip sit centred as on a place.
 */
export const HAND_W = 27;
export const HAND_H = 38;

export function HandCard({ card }: { card: Card }) {
  const ink = inkOf(card);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={cardName(card)} style={styles.hand}>
      <Text style={[styles.handRank, { color: ink }]}>{RANKS[card >> 2]}</Text>
      <Pip suit={card & 3} size={9} color={ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  hand: {
    width: HAND_W,
    height: HAND_H,
    borderRadius: 4,
    backgroundColor: CARD_FACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handRank: { fontSize: 12, fontWeight: '800', lineHeight: 13, marginBottom: 1 },
  fan: {
    width: FAN_W,
    height: FAN_H,
    borderRadius: 5,
    backgroundColor: CARD_FACE,
    /* A hairline of the page's own dark between two cards, so an overlapped
       edge is an edge. Card stock is ivory in both themes. */
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,20,22,0.35)',
    paddingTop: 4,
    paddingLeft: 4,
    alignItems: 'flex-start',
  },
  fanRank: { fontSize: 13, fontWeight: '800', lineHeight: 14 },
});
