import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { type Money } from '@poker-club/core';
import { formatToFit } from '../lib/money';
import { SETTLE_FITS, SettleStatus } from './SettleStatus';
import { useTheme } from '../design/useTheme';
import { z } from '../design/scale';
import { cappedFigure, tabular, unscaledLabel } from '../design/tokens';

/**
 * The totals card — `design/handoff-game-end/`, cut 6 September. One card,
 * identical construction on both game-end screens:
 *
 *     MONEY IN PLAY                          STATUS
 *     ₾6,000                              [ Settled ]
 *
 * WHAT THE LEFT SIDE SAYS IS THE ONLY DIFFERENCE between them — `Money in play`
 * on the settled night, `Left to move` on the transfers — and the right side is
 * the same pill reading the same figure on both. That is the cut's rule, and it
 * is the whole reason this is a component rather than two blocks that look
 * alike: two screens drawing their own version of one card is how they end up
 * stating different amounts on the same night.
 *
 * `align-items: flex-end` — the eyebrow and the figure grow downward from the
 * top, the pill sits on the figure's baseline. A tall pill and a short one
 * leave the card the same height.
 *
 * THE FULL BOARD (`payments`, approved) draws it as the first row of a lifted
 * card, with the step's row under it in the same card: `children` are those
 * rows, and the totals row takes the kit's hairline only when something
 * follows it.
 */
export function TotalsCard({
  eyebrow,
  amount,
  owed,
  anyPaid,
  children,
}: {
  eyebrow: string;
  amount: Money;
  /** What is still to move. Drives the pill, and never recomputed here. */
  owed: Money;
  anyPaid: boolean;
  /** Kit rows under the totals, inside the same card. */
  children?: ReactNode;
}) {
  const t = useTheme();

  return (
    <Card>
      <View
        style={[styles.head, children !== undefined && { borderBottomWidth: 1, borderBottomColor: t.hairline }]}
      >
        <View style={styles.left}>
          <Text style={[styles.eyebrow, { color: t.muted }]} numberOfLines={1} {...unscaledLabel}>
            {eyebrow}
          </Text>
          {/*
           * FIVE FIGURES OF LARI IS THE CASE THAT DECIDES THE SIZE. `₾47,000` at
           * 34/800 in half a card is what B43 was about, and the figure here has
           * the card's whole width less the pill — so it is `formatToFit`, which
           * drops to the compact form rather than truncating, at the same
           * threshold the rest of the app uses.
           */}
          <Text style={[styles.figure, tabular, { color: t.text }]} numberOfLines={1} {...cappedFigure}>
            {formatToFit(amount, SETTLE_FITS)}
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={[styles.eyebrow, { color: t.muted }]} numberOfLines={1} {...unscaledLabel}>
            Status
          </Text>
          <SettleStatus owed={owed} anyPaid={anyPaid} />
        </View>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  /*
   * THE TOTALS ROW — the kit's row at `10px 0`, aligned on the bottom edge.
   *
   * ⚠ NO TOP MARGIN OF ITS OWN ANY MORE. B58 was this card sitting flush
   * against the meta line, and the margin here was the fix while the body was
   * laid straight under the head. The full board's sheet rises over the ink
   * and the screen's column carries its own 12 above its first group, so the
   * card's top is the column's business now; the night pass still fires under
   * 6 points between the head and the body.
   */
  head: {
    paddingVertical: z(10),
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: z(10),
    /*
     * B99. The figure is the headline and it was the half giving way: at 120%
     * text on a 360 phone the pill grew and the figure went to "$13,…". Neither
     * half shrinks now; when the two will not fit on one line the status drops
     * under the figure, right-aligned by its own auto margin, and both are
     * read in full. At the board's width and size nothing wraps.
     */
    flexWrap: 'wrap',
    rowGap: z(8),
  },
  left: { flexDirection: 'column', gap: z(6), flexShrink: 0 },
  right: { marginLeft: 'auto', alignItems: 'flex-end', gap: z(6), flexShrink: 0 },
  /* The board's eyebrow: 700 10.5, tracked .12em. */
  eyebrow: { fontSize: z(10.5), fontWeight: '700', letterSpacing: 1.26, lineHeight: z(11), textTransform: 'uppercase' },
  /* 700 26/1, -.02em, in the figure face. */
  figure: { fontFamily: 'head', fontSize: z(26), fontWeight: '700', letterSpacing: -0.5, lineHeight: z(28) },
});
