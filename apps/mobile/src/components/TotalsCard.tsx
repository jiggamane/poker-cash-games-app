import { StyleSheet, Text, View } from 'react-native';
import { type Money } from '@poker-club/core';
import { formatToFit } from '../lib/money';
import { SETTLE_FITS, SettleStatus } from './SettleStatus';
import { useTheme } from '../design/useTheme';
import { cappedFigure, radius, space, tabular, unscaledLabel } from '../design/tokens';

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
 */
export function TotalsCard({
  eyebrow,
  amount,
  owed,
  anyPaid,
}: {
  eyebrow: string;
  amount: Money;
  /** What is still to move. Drives the pill, and never recomputed here. */
  owed: Money;
  anyPaid: boolean;
}) {
  const t = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
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
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.card,
    /*
     * THE FLOOR UNDER THE META LINE, and the card is the only thing that can
     * lay it. `Screen` puts 6 under the title row and the meta line adds 2 on
     * top of itself; neither of them leaves anything underneath, so the first
     * element of the body decides its own gap — and this one was not asking
     * for it. The card came out flush against `05:45 → 08:55 · 6 players ·
     * settled` on both screens that draw it: meta bottom 83.7, card top 83.7.
     *
     * 16 is the board's own — `design/handoff-game-end/README.md` § 1a item 4,
     * "margin `16px 20px 0`", where the 20 is the `space.card` above. Item 3 of
     * § 2a says the transfers card is "identical construction to 1a's", so the
     * one value is right for both. See B58.
     */
    marginTop: 16,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  left: { flexDirection: 'column', gap: 4, flexShrink: 1, minWidth: 0 },
  right: { marginLeft: 'auto', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  figure: { fontSize: 34, fontWeight: '800', letterSpacing: -1.4, lineHeight: 34 },
});
