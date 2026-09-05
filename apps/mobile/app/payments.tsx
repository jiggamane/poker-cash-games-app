import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { paymentProgress, settle, type TransferLine } from '@poker-club/core';
import { formatMoney, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { cappedFigure, radius, space, type, unscaledLabel } from '../src/design/tokens';
import { setPaid, settlementInput, transferKey, useNight } from '../src/lib/nightStore';

/**
 * Who pays whom — `R2 · Who pays whom`, from
 * `design_handoff_rebuy_and_results/Game Results Breakdown.dc.html`, cut
 * 5 September. It replaces E7 *Who has paid* on this route.
 *
 * SETTLING AND PAYING ARE STILL SEPARATE, and that has not changed with the
 * board. The book closes at the table; the money moves over the following week.
 * Nothing on this screen changes the night's result — a settled night stays
 * settled whether or not any cash has moved — and marking a payment is not a
 * ledger entry. Not one figure, screen or state in this app reads `paidAt`,
 * which is why the ticks carry no warning, no prompt, no red, and no completion
 * of any kind.
 *
 * WHAT THE BOARD CHANGES IS THE SHAPE OF A FINISHED THING. E7 drew every
 * transfer as a block and washed the finished ones green. R2 draws the two
 * states as two different objects, which is the app's existing finished-item
 * rule and the same one Tonight and Count up use:
 *
 *   STILL TO PAY   44-tall hairline rows, an empty circle on the right
 *   SETTLED        39-tall tinted slabs — deliberately under 44 — muted names,
 *                  a check on the left and `Undo` on the right
 *
 * A settled slab is SHORTER THAN A TAP TARGET on purpose: it is a record, not a
 * control, and the one live thing in it is `Undo`, whose own hit area is padded
 * back out to 44. That is the board's rule and it is why the row's own tap goes
 * away when it settles.
 *
 * THE HEADER CARRIES THE PROGRESS — `3 of 8 settled · $946 still to move`, over
 * a bar filled BY VALUE. Eight payments of $1,207 and $87 are not eight eighths
 * of the money, and a bar that counted rows would tell a host they were most of
 * the way through a week that had barely started.
 *
 * NOTHING HERE ADDS ANYTHING UP. `paymentProgress` in core splits the engine's
 * transfers into the two lists and returns every count, value and fraction the
 * header and the two section labels print. This screen did three of those sums
 * inline until today, which is the second implementation `CLAUDE.md` is about.
 */
export default function Payments() {
  const t = useTheme();
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
   * THE PAID SET IS THE APP'S, PASSED IN. Core settles other people's books in
   * an edge function that has no record of who has been to the bank, so the
   * predicate goes in rather than the map coming out.
   */
  const progress = useMemo(() => {
    if (night === null || result === null) return null;
    return paymentProgress(result, (from, to) =>
      night.paidAt.get(transferKey(from, to)) !== undefined,
    );
  }, [night, result]);

  if (night === null || result === null || progress === null) {
    return (
      <Screen title="Who pays whom" backTo="the results">
        {null}
      </Screen>
    );
  }

  const { waiting, settled, count, value, fraction } = progress;
  const done = waiting.length === 0;

  return (
    <Screen
      title="Who pays whom"
      backTo="the results"
      /*
       * `3 of 8 settled · $946 still to move` — the board's own line, and it
       * replaces the lede E7 carried. Both halves are `paymentProgress`'s.
       *
       * THE FIGURE ABBREVIATES PAST $100,000, and it has to. The meta line is
       * one line of Chrome A that does not wrap and is not capped against the
       * reader's text setting: at 360 and 120% text, a table that has been
       * rebought into nine digits drew `0 of 6 settled · $239,003,550 still to
       * move` at 373 points on a 360-point phone, which `ui-journeys.mjs` caught
       * as a clipped figure. `$239.0M` in its place fits.
       *
       * THE EXACT FIGURE IS ON THE SCREEN — every row of STILL TO PAY carries
       * its own amount in full — which is `formatCompact`'s standing condition
       * for being used at all. Nothing under $100,000 is touched, so a real
       * home game never sees this.
       */
      meta={`${count.settled} of ${count.total} settled · ${formatToFit(
        value.owed,
        HEADER_FITS,
      )} still to move`}
      footer={
        done ? undefined : (
          <View style={styles.foot}>
            {/*
             * ⚠ `Nudge the table` IS NOT DRAWN ON R2, and it is here because
             * this screen is the only door into `/nudge` in the app. R2's
             * footer is one button and it is not this one, so the nudge is a
             * chip above it — the same treatment `Full ledger` gets on R1, and
             * for the same reason. Delete it the day a board draws the nudge
             * somewhere else.
             */}
            <Button
              label="Nudge the table"
              variant="chip"
              onPress={() => router.push('/nudge')}
            />
            {/*
             * ONE BUTTON, FULL WIDTH, AND IT CHANGES ITS OWN WORD. `Mark all
             * settled` while nothing has moved; `Mark the rest settled` once
             * something has. Both are the board's, and the difference matters:
             * a host halfway through a week is not being asked to confirm the
             * three that are already done.
             */}
            <Button
              label={count.settled === 0 ? 'Mark all settled' : 'Mark the rest settled'}
              variant="primary"
              onPress={() => {
                for (const line of waiting) {
                  void setPaid(line.fromPlayerId, line.toPlayerId, true);
                }
              }}
            />
          </View>
        )
      }
    >
      {waiting.length > 0 && (
        <View style={styles.block}>
          <SectionLabel label="Still to pay" value={String(waiting.length)} />

          {/*
           * A HAIRLINE ABOVE EVERY ROW AND ONE UNDER THE LAST — the board's,
           * and the only place in this app a list closes itself with a rule.
           * It is what separates the two sections when the settled slabs
           * beneath are floating blocks with nothing to butt against.
           */}
          {waiting.map((line, i) => (
            <WaitingRow key={line.key} line={line} last={i === waiting.length - 1} />
          ))}
        </View>
      )}

      {settled.length > 0 && (
        <View style={styles.block}>
          <SectionLabel label="Settled" value={formatMoney(value.settled)} />
          <View style={styles.slabs}>
            {settled.map((line) => (
              <SettledSlab key={line.key} line={line} />
            ))}
          </View>
        </View>
      )}

      {count.total === 0 && (
        <Text style={[styles.none, { color: t.muted }]}>
          Nothing to move: everyone left level.
        </Text>
      )}

      {/*
       * THE BAR, UNDER THE META LINE ON THE BOARD AND UNDER THE LISTS HERE.
       *
       * ⚠ A DEVIATION OF POSITION, and the reason is `Screen`: the meta line is
       * a string on Chrome A's title row and nothing may be drawn between it
       * and the body. Moving the bar up means either an element in `Screen`'s
       * head — an app-wide change, which `CLAUDE.md` says runs alone — or this
       * screen re-drawing its own header, which is the thing Chrome A exists to
       * stop. So the bar reads as the summary of the two lists rather than as
       * the header's underline. The figures it draws are the same ones the meta
       * line states, so nothing is lost but the order they are met in.
       */}
      {count.total > 0 && (
        <View style={styles.barRow}>
          <View style={[styles.track, { backgroundColor: t.track }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: t.win, width: `${Math.round(fraction * 1000) / 10}%` },
              ]}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

/**
 * `Tomáš pays Dana $336 ○` — 44 tall, which is a tap target, because the whole
 * row is one.
 *
 * THE WHOLE ROW IS THE TICK, AND IT GOES BOTH WAYS. A host clears this list
 * standing in a doorway with a phone in one hand, four transfers landing in the
 * same two minutes. What that wants is a checklist: one tap per row, anywhere
 * on the row. The board draws the target as a 22px empty circle on the right —
 * the circle is still there and still says what it says; it is simply not the
 * only place the tap lands.
 *
 * THE PIGGY BANK IS A RECIPIENT LIKE ANY PERSON, and its name is drawn in bone
 * rather than in text when it is the one being paid. Which recipients those are
 * is `paymentProgress`'s answer, not this screen's: it is the same membership
 * test that keeps a collector's float off anybody's result (B27).
 */
function WaitingRow({ line, last }: { line: TransferLine; last: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      /*
       * A checkbox, not a button, and it says so: a screen reader announces the
       * state it is in and that tapping changes it, rather than announcing an
       * action that sounds one-way.
       */
      accessibilityRole="checkbox"
      accessibilityState={{ checked: false }}
      accessibilityLabel={`${line.from} pays ${line.to}, ${formatMoney(line.amount)}, waiting`}
      accessibilityHint="Double tap to mark it paid."
      onPress={() => void setPaid(line.fromPlayerId, line.toPlayerId, true)}
      style={({ pressed }) => [
        styles.waitingRow,
        {
          borderTopColor: t.hairline,
          borderBottomColor: t.hairline,
          borderBottomWidth: last ? StyleSheet.hairlineWidth : 0,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.names}>
        <Text style={[styles.payer, { color: t.text }]} numberOfLines={1}>
          {line.from}
        </Text>
        <Text style={[styles.joiner, { color: t.dim }]}>pays</Text>
        <Text
          style={[styles.payer, { color: line.toOffTable ? t.offTable : t.text }]}
          numberOfLines={1}
        >
          {line.to}
        </Text>
      </View>
      <Text style={[styles.waitingAmount, { color: t.text }]} numberOfLines={1} {...cappedFigure}>
        {formatMoney(line.amount)}
      </Text>
      <View style={[styles.circle, { borderColor: t.quietOutline }]} />
    </Pressable>
  );
}

/**
 * `✓ Ivan paid Dana $1,207 Undo` — 39 tall, tinted, and inert but for one word.
 *
 * UNDO IS THE ONE LIVE TARGET IN THE SLAB. Ticking a payment used to be a
 * one-way door, so a mis-tap left the host looking at a night that said Petr
 * had paid when Petr had not (B21). The way back is here, and its hit area is
 * padded to 44 even though the slab is 39 — the board sets that out in as many
 * words, and it is the whole reason a finished row may be shorter than a tap
 * target at all.
 */
function SettledSlab({ line }: { line: TransferLine }) {
  const t = useTheme();
  return (
    <View style={[styles.slab, { backgroundColor: t.drawerFill }]}>
      <Icon name="check" color={t.win} size={15} />
      <View style={styles.names}>
        <Text style={[styles.settledName, { color: t.muted }]} numberOfLines={1}>
          {line.from}
        </Text>
        <Text style={[styles.settledJoiner, { color: t.dim }]}>paid</Text>
        <Text
          style={[styles.settledName, { color: line.toOffTable ? t.offTable : t.muted }]}
          numberOfLines={1}
        >
          {line.to}
        </Text>
      </View>
      <Text style={[styles.settledAmount, { color: t.muted }]} numberOfLines={1} {...cappedFigure}>
        {formatMoney(line.amount)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Undo ${line.from} paid ${line.to}, ${formatMoney(line.amount)}`}
        accessibilityHint="Double tap to put it back to still to pay."
        hitSlop={{ top: 12, bottom: 12, left: 4, right: 8 }}
        onPress={() => void setPaid(line.fromPlayerId, line.toPlayerId, false)}
        style={({ pressed }) => [styles.undo, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.undoLabel, { color: t.text }]}>Undo</Text>
      </Pressable>
    </View>
  );
}

/** `STILL TO PAY` with its count, `SETTLED` with its value. */
function SectionLabel({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionLabel, { color: t.muted }]} {...unscaledLabel}>
        {label}
      </Text>
      <Text style={[styles.sectionValue, { color: t.muted }]} numberOfLines={1} {...cappedFigure}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginHorizontal: space.page, marginTop: 18 },

  sectionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingBottom: 6 },
  sectionLabel: { ...type.sectionLabel },
  sectionValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  /* 44 tall, a hairline above, gap 13. `minHeight` rather than `height`: the
     row grows with the reader's text setting rather than clipping a name. */
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 44,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  /* The three words share one baseline and give as a group; the figure does
     not. See B18 — a figure left to shrink comes apart across two lines. */
  names: { flexDirection: 'row', alignItems: 'baseline', gap: 7, flexShrink: 1, minWidth: 0 },
  payer: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  joiner: { fontSize: 14, fontWeight: '400' },
  waitingAmount: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, flexShrink: 0 },

  /* 5 between one finished slab and the next. */
  slabs: { gap: 5 },
  slab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 39,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pressable,
  },
  settledName: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  settledJoiner: { fontSize: 13, fontWeight: '400' },
  settledAmount: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  /* The board's `padding: 12px 0 12px 14px; margin: -12px -2px -12px 0` — a
     44-tall target inside a 39-tall slab, which is what lets the slab be
     shorter than a tap. `hitSlop` carries the vertical half so the row's own
     height is unchanged. */
  undo: { paddingLeft: 14, flexShrink: 0 },
  undoLabel: { fontSize: 13, fontWeight: '700' },

  /* 4 tall, radius 2, and it runs the width of the list. */
  barRow: { marginHorizontal: space.page, marginTop: 20 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },

  none: { ...type.footnote, marginHorizontal: space.page, paddingTop: 14 },

  foot: { gap: 14 },
});

/*
 * WHERE THE HEADER'S FIGURE RUNS OUT, measured at 360 with the reader's text at
 * 120% — the narrowest phone in the matrix at the size the meta line is widest.
 *
 * The line is fixed copy either side of one amount: `0 of 6 settled · ` and
 * ` still to move`, about 31 characters, and at 13/500 scaled to 15.6 that is
 * roughly 240 points of the 316 inside the page's gutters. Seven glyphs of
 * money fit in what is left and twelve do not, so the threshold is where the
 * exact figure stops being seven — `$99,999`. `fitFor` in `lib/money` drops it
 * again for a two- or three-letter currency, which is why this is one number
 * rather than one per book.
 *
 * NOTHING ELSE ON THIS SCREEN ABBREVIATES. A transfer row and a settled slab
 * both give their names before their figure and both carry `cappedFigure`, so
 * the amount a person is actually being asked for is always printed in full.
 */
const HEADER_FITS = 100_000;
