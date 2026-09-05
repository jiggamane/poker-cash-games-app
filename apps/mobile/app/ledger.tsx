import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { columnsFit, resultColumns, settle, type Money } from '@poker-club/core';
import { formatSignedToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, space, unscaledLabel } from '../src/design/tokens';
import { settlementInput, useNight } from '../src/lib/nightStore';

/**
 * Full ledger — format `7e`, the four-column table.
 * `design/handoff-count-up-to-settled/docs/02-E6-results-row.md`, cut 1 Sept.
 *
 *     name            game     food    piggy      net
 *
 * WHY IT IS A SCREEN OF ITS OWN. The handoff kept two of the six formats it
 * drew and put them in two places: the formula line is what E6 lists, and `7e`
 * "stays as the full-screen variant behind the *Full ledger* button, where
 * columns are worth the width". Full-screen is the word the doc uses, and
 * `09-navigation.md` decides what kind of full screen: this is a place you stay
 * in and read, it ends in no Save, no Add and no confirm, so it is a PUSH and
 * its top-right corner is empty. A sheet would give it a grabber and ask to be
 * dismissed, which is the wrong verb for a ledger.
 *
 * IT IS WHAT E6's FOOTER WAS WAITING FOR. That footer drew `Who has paid` in
 * the frame's `Full ledger` slot, with a note saying why — "there is no full
 * ledger anywhere in this app" — and saying what to do about it: "put `Full
 * ledger` here the day there is a ledger to open." This is that day, and
 * `settled.tsx` carries the other half of the change.
 *
 * ⚠ THE DOOR IS A CHIP NOW, NOT A FOOTER BUTTON — 5 September. `R1 · Results`
 * draws ONE footer button and it is `Who pays whom →`, so `Full ledger` moved
 * to a chip under the blocks. It is a deviation from R1, which draws no such
 * chip, and it is there because `/settled` is still this screen's only door in
 * the app — orphaning a built screen is the worse of the two.
 *
 * AND IT IS STILL NOT REDUNDANT with what R1 now prints. R1's FINAL caption
 * says one person's night as a sentence on one truncating line; `7e` says the
 * same decomposition as columns at full width, with the rounding step in a
 * column of its own. Same `resultColumns` call, so the two cannot disagree —
 * two drawings of one night rather than two answers about it.
 *
 * WHAT IT IS NOT. It is not the entry list — which rebuy, which spend, at what
 * time — and no board draws one. It is the same four terms E6 says as a
 * sentence, said as a table instead, off the same `resultColumns`: two drawings
 * of one night rather than two answers about it.
 *
 * ⚠ THE CHROME IS NOT DRAWN. The board draws `7e` inside the E6 frame with a
 * *Full ledger* button beneath it, and its own *Still to draw* says "where the
 * *Full ledger* button lands, and whether `7e` there is scrollable or paged" is
 * open. So the chrome is this app's own push, the title is the button's own
 * words rather than invented copy, and the list scrolls — paging a table nobody
 * has drawn a pager for would be inventing two things instead of one.
 * `docs/screens.md` carries it as open.
 */
export default function FullLedger() {
  const night = useNight();

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settle(settlementInput(night));
    } catch {
      return null;
    }
  }, [night]);

  /*
   * A NIGHT THAT CANNOT BE DRAWN IN COLUMNS HAS NO LEDGER TO OPEN.
   * `columnsFit` is the engine's test and this screen does not re-decide it:
   * four numeric columns is the ceiling at 393 points, so a rule that sends
   * money anywhere but the bill and the piggy bank has no fifth column and no
   * honest place to hide — folding a host's fee into `piggy` would put one
   * group's money under another group's name.
   *
   * E6 says that night as a sentence instead, which has room for every kind, so
   * nothing is lost by this screen declining to draw it.
   */
  if (night === null || result === null || !columnsFit(result)) {
    return (
      <Screen
        title="Full ledger"
        backTo="the night"
        lede="This night's rules take money somewhere the four columns cannot show. The deductions block on the night itself names every one of them and what it took."
        footer={<Button label="Back to the night" variant="primary" onPress={() => router.back()} />}
      >
        {null}
      </Screen>
    );
  }

  return (
    <Screen
      title="Full ledger"
      backTo="the night"
      footer={<Button label="Back to the night" variant="primary" onPress={() => router.back()} />}
    >
      <ColumnTable result={result} />
    </Screen>
  );
}

/**
 * The columns — `E6-results-columns.md` frames `6a` and `6b`, and format `7e`
 * on `Result Formula Options.dc.html`. The same table under two names, and this
 * is the one screen that draws it.
 *
 * `1fr 64px 58px 50px 74px` — the board's grid, in the only two things React
 * Native has: a name that takes what is left, and four fixed cells.
 *
 * NO COLUMN GAP, and that is the board's: each numeric cell takes its space as
 * a left padding instead, so the hairline runs unbroken across the row rather
 * than stopping and starting four times.
 *
 * THE SAME IN BOTH THEMES — hairlines and no fill, on `6a` as on `6b`. A table
 * with a coloured band behind every row is a ranking drawn twice, and the net
 * is already carrying the colour.
 *
 * NOTHING IS TAPPABLE. There is nothing left to open: every term is on the row.
 */
function ColumnTable({ result }: { result: ReturnType<typeof settle> }) {
  const t = useTheme();
  const rows = resultColumns(result);

  /* A column nobody has a figure in is not drawn — a night with no bill has no
     `food` to explain. It is the head that goes with it, which is what makes
     this different from the formula line's rule about a zero TERM. */
  const food = rows.some((r) => r.food !== 0);
  const piggy = rows.some((r) => r.piggy !== 0);
  /* And the step, on the same rule as the other two. A night that settled to
     the dollar has no column here; a night that rounded has one, because
     without it `game + food + piggy` is short of the net beside it by exactly
     what the step moved — see B36. */
  const rounded = rows.some((r) => r.rounded !== 0);

  return (
    <View style={styles.table}>
      <View style={styles.head}>
        <View style={styles.name} />
        <Text style={[styles.label, styles.game, { color: t.muted }]} {...unscaledLabel}>
          game
        </Text>
        {food && (
          <Text style={[styles.label, styles.food, { color: t.muted }]} {...unscaledLabel}>
            food
          </Text>
        )}
        {piggy && (
          <Text style={[styles.label, styles.piggy, { color: t.muted }]} {...unscaledLabel}>
            piggy
          </Text>
        )}
        {rounded && (
          <Text style={[styles.label, styles.rounded, { color: t.muted }]} {...unscaledLabel}>
            step
          </Text>
        )}
        <Text style={[styles.label, styles.net, { color: t.muted }]} {...unscaledLabel}>
          net
        </Text>
      </View>

      {rows.map((r) => (
        <View key={r.player.playerId} style={[styles.row, { borderTopColor: t.hairline }]}>
          <Text style={[styles.nameText, styles.name, { color: t.text }]} numberOfLines={1}>
            {r.player.name}
          </Text>
          <Cell amount={r.game} style={styles.game} />
          {food && <Cell amount={r.food} style={styles.food} />}
          {piggy && <Cell amount={r.piggy} style={styles.piggy} />}
          {rounded && <Cell amount={r.rounded} style={styles.rounded} />}
          <Text
            style={[
              styles.figure,
              styles.netFigure,
              styles.net,
              { color: r.net === 0 ? t.muted : moneyColor(t, r.net) },
            ]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {formatSignedToFit(r.net, COLUMN_FITS)}
          </Text>
        </View>
      ))}

      {/*
       * ⚠ THE BOARD'S FOOTNOTE, LESS ITS EXAMPLE. It is drawn as "…plus
       * whatever they paid at the counter — Petr paid $242 and owed $54, so
       * +$188", and those are the sample night's figures against the sample
       * night's name. A real night printing them would be explaining itself
       * with somebody else's money. The two sentences that are about the
       * columns rather than about the sample are verbatim; the illustration is
       * dropped rather than rewritten with figures nobody asked for.
       */}
      <Text style={[styles.footnote, { color: t.muted }]}>
        Game = cashed out less bought in. Food = their share of the bill, plus whatever they paid
        at the counter.
      </Text>
    </View>
  );
}

/** One muted figure in a column. Never wraps, never grows past the cap. */
function Cell({ amount, style }: { amount: Money; style: object }) {
  const t = useTheme();
  return (
    <Text style={[styles.figure, style, { color: t.muted }]} numberOfLines={1} {...cappedFigure}>
      {formatSignedToFit(amount, COLUMN_FITS)}
    </Text>
  );
}

/*
 * WHERE A COLUMN RUNS OUT, which is far earlier than a row does — that is the
 * price of putting four figures on one line.
 *
 * The narrowest is `piggy` at 60 points with 8 of that spent on the padding
 * that keeps the hairline whole. Fifty-two points at 14/400 tabular is about
 * seven glyphs, and a table playing for tens of thousands needs "−$12.9K" to
 * fit where "−$12,940" does not. `cappedFigure` holds the phone's text setting
 * at the money cap so this does not move underneath the measurement.
 */
const COLUMN_FITS = 10_000;

const styles = StyleSheet.create({
  table: { marginHorizontal: space.card, marginTop: 4 },

  head: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 7 },
  name: { flex: 1, minWidth: 0 },
  nameText: { fontSize: 16, fontWeight: '600' },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    textAlign: 'right',
    paddingLeft: 8,
  },
  game: { width: 64 },
  /*
   * 60 AND 60 WHERE THE BOARD DRAWS 58 AND 50 — the one deviation in this
   * table, and it is about what the columns have to hold rather than how they
   * look. The board's night has two-figure piggy contributions, where fifty
   * points is generous for `−$23`; this app is measured against tables in the
   * millions, where the same cell holds `−$118k` and `−$12M` — six glyphs of
   * compacted figure, which came to 53 and 56 points and was clipped in both.
   * The name gives the twelve points up; it is the one thing in the row that
   * may ellipsise.
   */
  food: { width: 60 },
  piggy: { width: 60 },
  /* Narrower than the rest: it never holds more than one step under the step,
     so two digits and a sign is the whole of what it can ever draw. */
  rounded: { width: 48 },
  net: { width: 74 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  figure: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'right',
    paddingLeft: 8,
    fontVariant: ['tabular-nums'],
  },
  netFigure: { fontSize: 16, fontWeight: '700' },
  footnote: { fontSize: 11.5, fontWeight: '400', lineHeight: 17, paddingTop: 9 },
});
