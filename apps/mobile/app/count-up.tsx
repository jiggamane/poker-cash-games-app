import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Text } from '../src/components/Text';
import {
  balanceCheck,
  resolveLedger,
  resultBeforeDeductions,
  type BalanceCheck,
  type Money,
  type PlayerId,
} from '@poker-club/core';
import { formatSignedToFit, formatToFit } from '../src/lib/money';
import { BLOCK_FITS, headlineSize, percent, toneOf, type Tone } from '../src/lib/countUpBlock';
import { Card } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { TermBar } from '../src/components/TermBar';
import { ActiveRow, FinishedSlab, PlayerGroup } from '../src/components/PlayerList';
import { Screen } from '../src/components/Screen';
import { Step } from '../src/components/Step';
import { useTheme } from '../src/design/useTheme';
import type { Theme } from '../src/design/tokens';
import { cappedFigure, moneyMaxFontScale, tabular, type } from '../src/design/tokens';
import { z } from '../src/design/scale';
import { clockLabel } from '../src/lib/elapsed';
import { endedRowLabel, endedRowValue } from '../src/lib/endTime';
import { cashedOutAt, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Count up — E2, step 1 of 3.
 *
 * TWO CUTS DRAW THIS SCREEN AND THEY DIVIDE AT THE ROUNDING BAR. The block at
 * the top is `design/handoff-count-up-header/`, 6 September, which retires the
 * two-column status card `design/handoff-E2/` drew on 30 August. Everything
 * under the bar — three groups, ranked, on its own type scale — is
 * `design/handoff-count-up-to-settled/` and `design/handoff-player-list/`,
 * neither of which that cut touches.
 *
 * WHAT THE COLUMNS WERE FOR, and it is still true. The card before them read
 * `COUNTED $2,880 of $2,880`: the count against the chips still on the table,
 * which is half a sum. A night where a cash-out was never entered reads DONE
 * there, in a card whose two figures agree with each other, because the missing
 * money was subtracted out of both sides before they were compared. B22. So
 * the block states the whole equation and it still does.
 *
 * WHAT THEY COST. Two sums at 30/800 in half a card each is about 123 points a
 * figure, and a five-figure lari sum does not go in 123 points — `₾47,0…`, the
 * screen's one job, truncated at exactly the moment the numbers get big. B43.
 *
 * SO THE GAP IS THE HEADLINE AND THE SUMS GO UNDERNEATH AT TEXT SIZE:
 *
 *     +₾1,000                                          102%
 *     ████████████████████████████████████████████▓▓▓▓▓▓▓▓
 *     In play · 8 players                            ₾47,000
 *     8 counted                                      ₾48,000
 *
 * Nothing in it can truncate in any state. The headline is the one display
 * figure left and it is FLUID — 38 points down to a 24 floor as the digits
 * arrive, rather than ellipsising or wrapping — and the sums are 18-point text
 * on rows of their own, where the caption is what compresses and the amount
 * never does.
 *
 * NO EYEBROW AND NO VERDICT STRIP. `$1,000 OVER · 102% accounted for` said in
 * words what the sign, the colour and the percentage beside it already say.
 *
 * AND NO FIGURE IN IT IS COLOURED UNTIL EVERY STACK IS IN — 6 September, on
 * the owner's instruction, and this app's one departure from the cut's colour
 * rule. A host two stacks into a count of six is short by four stacks, and a
 * block that spends that whole stretch in the colour reserved for missing money
 * is raising an alarm about arithmetic that has not finished happening. See
 * `toneOf`.
 *
 * THE FULL BOARD (`design/explorations/full-board/`, `count-up*`, approved
 * 23–24 November) PUTS THE BLOCK ON THE INK TOP, where Tonight keeps the pot,
 * and there it is the top's own white IN EVERY STATE: the kit has no win or
 * loss tone that reads on the ink, and the board drew it white and was
 * approved as drawn. So the off state is no longer coral — the signed gap, its
 * percentage and E5 one tap on say it. The one colour left is Balanced, the
 * owner's option A (24 November): the word in green with the tick in a green
 * disc, the sum in white. Under the block the rows are the settled night's two
 * lines, each group one lifted card, and Rounding and Ended are one card at
 * the foot (owner, 24 November). Next is the bar.
 *
 * OFF BALANCE DOES NOT BLOCK THE NIGHT. The gate is the COUNT: Next is dead
 * only while a stack is missing. A night that does not add up goes on to E5,
 * where the difference is named to the unit and logged, and it travels with
 * the night into the book.
 */
export default function CountUp() {
  const t = useTheme();
  const night = useNight();
  /* Before the early return: the ruler is a hook and the screen has one
     whether or not there is a night in it yet. */
  const ruler = useRuler();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Screen title="Count up" backTo="Tonight">{null}</Screen>;
  }

  /**
   * Only people with chips in front of them owe a count. Somebody who busted
   * out cashed out for nothing and has nothing left to count — waiting for one
   * would block the close forever.
   */
  /*
   * A NIGHT ANOTHER PHONE IS RECORDING is counted there, not here — see
   * `hold.ts`. The screen still reads, because the phone that passed the night
   * follows it; every control that would write is taken off rather than left to
   * be refused by the store: no row opens a count, the two term rows stop
   * opening, and the footer says where the night is instead of the Next bar.
   */
  const away = night.hold === 'away';

  const standings = standingsOf(night, ledger).filter((s) => s.played);
  const seated = standings.filter((s) => s.atTable);

  /*
   * SETTLED, ON THIS SCREEN, IS "THE STACK HAS BEEN SEEN" — counted, or
   * cashed out earlier in the night. The seated half splits on whether a count
   * has been entered, which is the split the three groups are.
   *
   * `has`, NOT a truthy test. A busted player's stack is $0 and that is a
   * count: a truthiness test would leave them in STILL TO COUNT forever and
   * hold the night open on chips that are not there. `balanceCheck` makes the
   * same distinction for the same reason.
   */
  const toCount = seated.filter((s) => !night.finalCounts.has(s.id));

  /*
   * ONE FINISHED GROUP, RANKED, AND IT HOLDS EVERYBODY WHOSE MONEY IS IN —
   * 6 September, on the owner's instruction: *all cash-outs are considered
   * equally here, regardless of whether they left the game earlier or stayed
   * till the end.*
   *
   * This screen used to draw two finished groups, `Counted` and `Cashed out
   * earlier`, each ranked within itself. That split is about HOW a figure
   * reached the app — typed on this screen at the close, or entered on Tonight
   * when somebody stood up — and by the time this screen is being read, that is
   * a fact about the past. What every one of these rows now IS, is a player
   * whose night is finished and whose result is final. Dana leaving at 10:45
   * with $2,120 and Andro being counted out at the end with $960 are the same
   * kind of fact, and the room asking who is up wants them in one order.
   *
   * IT ALSO PUTS THE SCREEN BACK IN AGREEMENT WITH ITS OWN BLOCK. The header
   * reads `6 counted`, summing counted stacks and cash-outs
   * into one figure — the cut's S111, which says cash-outs are not called out
   * separately. Until now the list under it answered that 6 with a 5 and a 1 in
   * two headings.
   *
   * THE ORDER IS THE COLUMN AT THE RIGHT EDGE, which is the same argument
   * Tonight's seated group sorts on. Every row here draws its result at the
   * right edge and nothing else there, so a list sorted by it can be checked by a reader
   * running a finger down the column. `Still to count` is left in seat order
   * because it has no result to rank on — an em dash is not a position.
   *
   * ⚠ WHAT THE SPLIT WAS CARRYING, and it does not disappear with the heading:
   * a counted row reopens the keypad and a cashed-out row does not, because a
   * figure is fixed where it was entered. Under two headings the group said
   * which; under one, the ROW has to — so a cashed-out row now reads `cashed
   * out 10:45` rather than the bare clock it could get away with before, with
   * the cash-out icon where a counted row has chips out. `docs/screens.md`
   * carries the decision and what it costs.
   *
   * TIES KEEP SEAT ORDER — `Array#sort` is stable and `standingsOf` is in seat
   * order, so two players who ended level stay in the order their seats were
   * filled rather than swapping about as unrelated entries land. Because the
   * two kinds are no longer concatenated, that now holds ACROSS them: a counted
   * player and a cashed-out one who ended level sit in seat order, not with the
   * counted one always first.
   */
  const endedWith = (s: (typeof standings)[number]): Money =>
    s.atTable ? night.finalCounts.get(s.id)! : s.cashedOut;

  const finished = [...standings.filter((s) => !s.atTable || night.finalCounts.has(s.id))].sort(
    (a, b) =>
      resultBeforeDeductions(b.boughtIn, endedWith(b)) -
      resultBeforeDeductions(a.boughtIn, endedWith(a)),
  );

  const balance = balanceCheck(
    ledger,
    night.finalCounts,
    seated.map((s) => s.id),
  );

  /*
   * Every stack counted and the money still not adding up goes STRAIGHT to the
   * out-of-balance screen, not to the deductions. There is nothing to deduct
   * from a table whose total is unknown, and E5 is where the difference is
   * named and fixed — unless the host has already looked at it and confirmed
   * it, in which case the night is theirs to close.
   */
  const settled = balance.state === 'balanced' || night.acknowledgement !== undefined;
  const ready = balance.state !== 'counting';

  return (
    <Screen
      title="Count up"
      backTo="Tonight"
      trailing={<Step label="1 of 3" />}
      /* On the ink, under the title: the board's `extra`, as Tonight's pot. */
      onInk={<BalanceBlock balance={balance} />}
      /* NEXT IS THE BAR (the full board), faint until every stack is in — the
         gate is the count, not the balance. E2b's link went with E2b on
         5 September: the two finished groups rank in place now, so there is
         nothing behind it to see. */
      {...(away
        ? {
            footer: (
              <Text style={[styles.away, { color: t.muted }]}>
                Being recorded on another phone. Tonight → Take the game back.
              </Text>
            ),
          }
        : {
            bar: [
              {
                label: 'Next',
                disabled: !ready,
                onPress: () => router.push(settled ? '/deductions' : '/settle-up'),
              },
            ],
          })}
    >
      {/*
       * TWO GROUPS — the work, and the result.
       *
       *     STILL TO COUNT · 3
       *     COUNTED · 3
       *
       * IT WAS THREE UNTIL 6 SEPTEMBER. `05-active-vs-settled.md`, cut
       * 1 September, split the finished half in two — `Counted` and `Cashed out
       * earlier` — and the owner's instruction merged them: every cash-out
       * counts equally here, whenever it happened. The split that matters on
       * this screen is the one it exists to make, which is between a stack the
       * host still has to type and a result that is final.
       *
       * Both labels are a name and a count. The right-hand column changes
       * meaning between a row still to count (an em dash) and a row that is
       * finished (a signed result), and the group a row sits in says which.
       *
       * `COUNTED` IS THE BLOCK'S OWN WORD for this group, and the two agree to
       * the person: the block's second line reads `6 counted`, summing stacks
       * and cash-outs, and the group underneath it holds those same six. The
       * row says which kind it is — `counted $960` against `cashed out 17:17`,
       * each with its icon — which is where that distinction belongs now that
       * it is not a heading.
       *
       * GROUPS NEVER REORDER AND NEVER DISAPPEAR. An empty one draws its label
       * with `· 0` rather than vanishing (only its card goes), so the host can
       * see that nobody is left to count rather than inferring it from a group
       * that is no longer on screen. ⚠ The board's all-counted states draw no
       * `Still to count` label at all; nothing in its notes says the owner
       * took it out, so the app keeps it.
       */}
      <View style={styles.groups}>
        {/* MEASURED BUT NEVER ANIMATED. A counted row travels from where its
            uncounted row was, and a position nobody took is a position nobody
            can travel from — see `Travelling`. */}
        <Ranked name="toCount" ruler={ruler}>
          <PlayerGroup label="Still to count" count={toCount.length} first>
            {toCount.map((p, i) => (
              <Travelling key={p.id} id={p.id} group="toCount" ruler={ruler}>
                <ActiveRow
                  name={p.name}
                  fact={`in ${formatToFit(p.boughtIn, ROW_FITS)}`}
                  icon="chipsIn"
                  last={i === toCount.length - 1}
                  accessibilityLabel={`Count ${p.name}`}
                  {...(away
                    ? {}
                    : {
                        onPress: () =>
                          router.push({ pathname: '/log', params: { player: p.id, kind: 'count' } }),
                      })}
                  right={
                    /* The em dash where a result will be, and the pencil: what
                       "this one is left" has drawn on every revision, and what
                       `ui-journeys.mjs` finds the rows by. The pencil is muted,
                       as the board draws it; the look has no amber. */
                    <>
                      <Text style={[styles.waiting, { color: t.dim }]}>—</Text>
                      <Icon name="pencil" color={t.muted} size={z(16)} />
                    </>
                  }
                />
              </Travelling>
            ))}
          </PlayerGroup>
        </Ranked>

        {/*
          * COUNTED AND CASHED OUT ARE THE SAME TREATMENT, and since 6 September
          * they are the same GROUP: both are finished, and they rank together.
          * What differs is the fact each one carries — the stack for one,
          * `cashed out` and the time for the other — and what happens when it
          * is tapped.
          *
          * A COUNTED ROW REOPENS ITS KEYPAD, which the handoff's finished rows
          * never do. The rule for this app is *a figure is fixed where it was
          * entered*: this screen is where a count is typed, so this screen is
          * where a count typed wrong is retyped. Tapping the row reopens the
          * same keypad with the same prefill and overwrites it. Since the full
          * board it carries no chevron to say so — nothing in the look points.
          *
          * ⚠ THE PREFILL HALF OF THAT SENTENCE WAS NOT TRUE UNTIL B85. The
          * sheet opened at ₾0 however many times a stack had been counted, so
          * a host checking a figure was one Save away from writing zero over
          * it. `log.tsx` reads the stored count now; the first key still
          * replaces the whole figure, so a real re-count is as fast as it was.
          *
          * WITHOUT IT, E5's `Fix` LEADS NOWHERE. Out of balance is the screen
          * that names a difference and offers to go and fix it, and the fix is
          * always a count: it hands the host back to this screen with every row
          * already counted. If none of those rows opens, the button has taken
          * them to a screen with nothing on it to change, on the one path in
          * the app that exists for recovering from a mistake.
          *
          * A CASHED-OUT ROW DOES NOT OPEN, by the same rule read the other way:
          * that figure was entered on Tonight, and Tonight is where it is
          * retyped. The row's fact and icon say which kind it is.
          */}
        <Ranked name="counted" ruler={ruler}>
          <PlayerGroup label="Counted" count={finished.length}>
            {finished.map((p, i) => (
              <Travelling key={p.id} id={p.id} group="counted" rank ruler={ruler}>
                <FinishedSlab
                  name={p.name}
                  fact={
                    p.atTable
                      ? `counted ${formatToFit(endedWith(p), ROW_FITS)}`
                      : cashedOutFact(night, p.id, p.cashedOut)
                  }
                  icon={p.atTable ? 'chipsOut' : 'cashOut'}
                  result={resultBeforeDeductions(p.boughtIn, endedWith(p))}
                  fits={ROW_FITS}
                  last={i === finished.length - 1}
                  {...(p.atTable && !away
                    ? {
                        accessibilityLabel: `Count ${p.name} again`,
                        opens: () =>
                          router.push({ pathname: '/log', params: { player: p.id, kind: 'count' } }),
                      }
                    : {})}
                />
              </Travelling>
            ))}
          </PlayerGroup>
        </Ranked>

        {/*
         * THE NIGHT'S TWO TERMS, ONE CARD AT THE FOOT — owner, 24 November
         * ("Rounding and Ended move to the foot of every Count up screen, under
         * the player lists"). They sat directly under the block until then.
         *
         * THE STEP, AND THIS IS THE SCREEN THAT OWNS IT —
         * `design/handoff-E2/docs/E2-rounding.md`, cut 31 August. Rounding
         * changes what a stack is worth and so has to be decided where stacks
         * are entered. E4 and E6 draw the same row and open the same sheet;
         * only this one is where it is set.
         *
         * AND WHEN THE CARDS STOPPED, on the row under it — B87. This is the
         * screen where the night is being finished, so it is the screen where
         * the night's terms are set, and the end time is one of them: `Ended ·
         * 03:12` is the same kind of line as `Rounding · nearest $10` and reads
         * as one because it is drawn as one. It is NOT in the block on the ink:
         * the count-up header cut retired every term but the gap, its
         * percentage and the two sums, on the one block whose argument is that
         * nothing in it can truncate.
         *
         * THE NIGHT IT EXISTS FOR IS THE ONE BEING READ A DAY LATE. Tapping End
         * game stamps this honestly, so most nights it is right before anybody
         * looks; the host who is settling yesterday's game, or who tapped through
         * an hour after the last hand, taps it and types the real one.
         */}
        <Card>
          <RoundingBar
            mode={night.roundingMode}
            bare
            {...(away
              ? {}
              : { onPress: () => router.push({ pathname: '/rounding', params: { scope: 'night' } }) })}
          />
          <TermBar
            label={endedRowLabel(night.endedAt)}
            value={endedRowValue(night.startedAt, night.endedAt)}
            bare
            last
            {...(away ? {} : { onPress: () => router.push('/end-time') })}
          />
        </Card>
      </View>
    </Screen>
  );
}

/**
 * WHAT FINISHED THEM — `cashed out 10:45`, and the words are load-bearing now.
 *
 * IT WAS THE CLOCK ALONE UNTIL 6 SEPTEMBER, and it could be: the row sat under
 * a heading reading `CASHED OUT EARLIER`, so a bare `10:45` on it was the only
 * thing left to say. With the two finished groups merged into one ranked list
 * that heading is gone, and a time on its own beside a name says nothing about
 * why this row has a result and the row above it opens a keypad. The row has to
 * carry it, so the row does.
 *
 * STILL NOT THE AMOUNT. Tonight draws the same person as `10:45 · out $2,120`
 * and this screen deliberately does not: the result at the right edge is what
 * the reader came for, the buy-in has its own column in the group above, and
 * `13:03 · out CHF2,120` is 150 points of a 122-point box at 120% text in a
 * three-letter currency — the clipped end of which is money. See B41. Two words
 * and a clock are cheap; a second figure is not.
 *
 * Where the clock is missing — an imported night, or one closed before the
 * field existed — the cash-out is what is left to say, the same fallback
 * `stands.tsx` takes.
 */
const cashedOutFact = (
  night: NonNullable<ReturnType<typeof useNight>>,
  playerId: PlayerId,
  cashedOut: Money,
): string => {
  const at = cashedOutAt(night, playerId);
  return `cashed out ${at === undefined ? formatToFit(cashedOut, ROW_FITS) : clockLabel(at)}`;
};

// ---------------------------------------------------------------------------
// The block
// ---------------------------------------------------------------------------

/**
 * THE BAR IS DRAWN TO THE REAL SCALE — each segment flexed by its own raw
 * amount, not by a percentage worked out first.
 *
 * Over: what went in, then the overage beyond it. Short: what is accounted
 * for, then the hole. Level: one segment, the whole width. A table holding
 * more than went into it therefore grows a segment PAST the money rather than
 * topping out at it, and an over reads as an over rather than as a balance.
 *
 * ON THE INK IT IS TONIGHT'S SHARE BAR READ AS PROGRESS (the board's note):
 * the run in the top's white, the rest in its quieter white, as Tonight draws
 * its alternate shares — the same two whites in every state, since the block
 * carries no colour on the ink. The empty night is the one case with no scale
 * at all — nothing in and nothing counted is 0 against 0 — so it draws the
 * faint track and nothing else.
 */
const segments = (
  t: Theme,
  tone: Tone,
  b: BalanceCheck,
): ReadonlyArray<{ flex: number; color: string }> => {
  if (b.boughtIn === 0 && b.accountedFor === 0) return [{ flex: 1, color: t.onTopFill }];
  if (tone === 'balanced') return [{ flex: 1, color: t.onTop }];

  return b.left < 0
    ? [
        { flex: b.boughtIn, color: t.onTop },
        { flex: -b.left, color: t.onTopMuted },
      ]
    : [
        { flex: b.accountedFor, color: t.onTop },
        { flex: b.left, color: t.onTopMuted },
      ];
};

/**
 * HOW BIG THE HEADLINE MAY GROW ON A WIDER PHONE.
 *
 * `headlineSize` is measured at 360, where `z()` is 1 and the block now has
 * about 320 points (the ink's 18 a side and the block's 2) — more than the 284
 * the card it replaced had, so nine digits at the 24 floor fit there with room.
 * Every other size on the screen goes through `z()`, which at 393 is 1.22,
 * while the room only grows with the width, about 1.08: a short gap has room
 * to take the whole of `z()`, a nine-digit one does not.
 *
 * So the size is `z()` of the measured one, held under what the glyphs can
 * take in the room there is — each glyph at most 0.62 of the size in the
 * figure face, grown by the money cap on the reader's text setting, with the
 * percentage's ~4 glyphs and the gap beside it — and never under the size
 * measured at 360.
 */
const useHeadlineSize = (glyphs: number): number => {
  const { width } = useWindowDimensions();
  const measured = headlineSize(glyphs);
  if (!(width > 0)) return measured;
  const room = width - 2 * z(18) - 2 * z(2) - z(15) * 4 * 0.62 * moneyMaxFontScale - z(10);
  const fits = room / (glyphs * 0.62 * moneyMaxFontScale);
  return Math.round(Math.max(measured, Math.min(z(measured), fits)) * 2) / 2;
};

function BalanceBlock({ balance }: { balance: BalanceCheck }) {
  const t = useTheme();
  const tone = toneOf(balance);
  const balanced = tone === 'balanced';
  const shut = useCollapse(balanced);

  /* The cut's `accounted_for − bought_in`, which is the engine's `left` the
     other way up: a positive gap is money on the table that nobody bought. */
  const gap = -balance.left as Money;
  const headline = formatSignedToFit(gap, BLOCK_FITS);
  const size = useHeadlineSize(headline.length);

  /*
   * COUNTED AND CASHED OUT ARE ONE FIGURE, per the cut: `8 counted`, never
   * `6 counted, 2 out`. Both are stacks the host has seen, and the split
   * between them is what the two groups in the list below are for.
   *
   * BUY-IN AND REBUY COUNTS ARE NOT SHOWN AT ALL — player count only, which is
   * the cut reversing the old sub-line's `11 entries · 6 players`. The number
   * of times money went across the table is not what this block compares.
   */
  const done = balance.countedPlayers + balance.cashedOutPlayers;
  const waiting = balance.uncounted.length;

  /* PROPOSED COPY, and the cut says so — the still-to-count clause is the one
     string in the block that is not signed off. `docs/screens.md`.
     `Accounted for ·` WENT, owner, 23 November (the board's README, "Count up
     header"): the line starts with the count itself. */
  const accounted = waiting === 0 ? `${done} counted` : `${done} counted, ${waiting} still to count`;

  return (
    <Pressable
      /*
       * ONLY ONCE IT BALANCES. A block that could be folded away mid-count would
       * be offering to hide the one figure the screen exists to drive to zero.
       */
      accessibilityRole={balanced ? 'button' : undefined}
      accessibilityLabel={balanced && shut.collapsed ? `Balanced, ${formatToFit(balance.boughtIn, BLOCK_FITS)} in play` : undefined}
      accessibilityHint={balanced ? 'Double tap to show the comparison.' : undefined}
      onPress={balanced ? shut.toggle : undefined}
      style={styles.block}
    >
      {shut.collapsed ? (
        /*
         * THE ONE LINE THE BLOCK KEEPS — `✓ Balanced $5,000 in play`, in the
         * owner's option A (24 November): the word in green, the tick in a
         * green disc, the sum in white.
         *
         * The comparison has done its job the moment the two sums agree, and
         * from there it is 90 points of arithmetic held over the list a host is
         * actually working through. What survives is the verdict and the figure,
         * which is what a person glances back up at, and the sheet rises to
         * take the room.
         *
         * ⚠ THE GREEN IS `liveDot`, the one green the theme has that reads on
         * the ink (the kit's `#7BE3AE`, the same value), and the tick in it is
         * the ink itself where the kit draws a near-black green. An on-ink win
         * token in `tokens.ts` would name it properly; that file is shared.
         */
        <View style={styles.shutLine}>
          <View style={[styles.disc, { backgroundColor: t.liveDot }]}>
            <Icon name="check" color={t.top} size={z(16)} />
          </View>
          <Text style={[styles.shutVerdict, { color: t.liveDot }]} numberOfLines={1}>
            Balanced
          </Text>
          <Text style={[styles.shutFigure, { color: t.onTop }]} numberOfLines={1} {...cappedFigure}>
            {formatToFit(balance.boughtIn, BLOCK_FITS)}
          </Text>
          <Text style={[styles.shutCaption, { color: t.onTopMuted }]} numberOfLines={1}>
            in play
          </Text>
        </View>
      ) : (
        <>
        <View style={styles.headline}>
          <Text
            style={[styles.gap, { color: t.onTop, fontSize: size, lineHeight: size * 1.05, letterSpacing: -0.03 * size }]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {headline}
          </Text>
          <Text style={[styles.share, { color: t.onTop }]} numberOfLines={1} {...cappedFigure}>
            {`${percent(balance)}%`}
          </Text>
        </View>

        <Bar segments={segments(t, tone, balance)} />

        <View>
          {/*
            * ONE WORD FOR THIS FIGURE, APP-WIDE — 5 September, on the owner's
            * instruction, and it is why this row does not read `Bought in` as
            * the cut's caption does. The same $5,000 was `total in` on Tonight,
            * `BOUGHT IN` here and `PRIZEPOOL` on the settled night: one number
            * under three nouns on three screens a host sees inside ten minutes,
            * with nothing saying they are the same number. `In play` is the
            * word. `ui-audit.mjs` holds it and says so in as many words: do not
            * put `Bought in` back by reading a board. `docs/screens.md` carries
            * the decision and what deviating costs.
            */}
          <Sum
            caption={`In play · ${balance.playersTotal} ${balance.playersTotal === 1 ? 'player' : 'players'}`}
            amount={balance.boughtIn}
          />
          <Sum caption={accounted} amount={balance.accountedFor} />
        </View>
        </>
      )}
    </Pressable>
  );
}

/**
 * The comparison folds itself away once it has been read — `CountUpEnd.dc.html`,
 * cut 6 September.
 *
 * IT WAITS 1,100ms, and the wait is the point: *"long enough to read the balance
 * moment"*. The last stack going in is the moment the night adds up, the card
 * turns green and both sums agree, and collapsing on the same frame would take
 * that away to save a person a scroll they had not asked to make yet.
 *
 * A HAND ON IT WINS. Once somebody has tapped the line the timer is done with —
 * re-arming it would fold the card back up under a reader who had just opened
 * it, which is the one thing worse than folding it too early.
 *
 * AND IT UNFOLDS THE MOMENT THE NIGHT STOPS BALANCING. A correction that puts
 * the count out again is exactly when the comparison is wanted, and nobody
 * should have to remember that the card is a card.
 */
function useCollapse(balanced: boolean): { collapsed: boolean; toggle: () => void } {
  const [collapsed, setCollapsed] = useState(false);
  /* Set by a tap, cleared when the night stops balancing. */
  const handled = useRef(false);

  useEffect(() => {
    if (!balanced) {
      handled.current = false;
      setCollapsed(false);
      return;
    }
    if (handled.current) return;

    const timer = setTimeout(() => setCollapsed(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [balanced]);

  return {
    collapsed,
    toggle: () => {
      handled.current = true;
      setCollapsed((was) => !was);
    },
  };
}

/**
 * The bar, re-scaling as the money lands — step 4 of the sequence below.
 *
 * `flexGrow` IS THE THING BEING ANIMATED and it is the one part of this screen
 * that cannot ride the native driver: it is a layout property, so every frame
 * of it goes through JavaScript. It is two views, once, at the top of a screen
 * that is otherwise still, which is what makes that affordable here and
 * nowhere else — the rows moving underneath it are transforms.
 *
 * A CHANGE OF SHAPE IS NOT A RE-SCALE. Going from two segments to one is the
 * night's state changing — short to level — and the cut is explicit that
 * colour never tweens; a bar growing INTO a colour it is about to be is the
 * same fault in a different property. So a segment count that changes is set,
 * not animated, and only a bar that keeps its shape moves.
 */
function Bar({ segments }: { segments: ReadonlyArray<{ flex: number; color: string }> }) {
  const shown = segments.filter((s) => s.flex > 0);
  const first = useRef(new Animated.Value(0)).current;
  const second = useRef(new Animated.Value(0)).current;
  const shape = useRef(-1);

  /* The shape and the amounts as one string, so the effect below runs when
     either changes and not on every render of the block. */
  const scale = shown.map((s) => s.flex).join('/');

  useEffect(() => {
    const grow = [first, second];
    const flexes = scale === '' ? [] : scale.split('/').map(Number);
    const same = shape.current === flexes.length;
    shape.current = flexes.length;
    flexes.forEach((flex, i) => {
      if (!same) {
        grow[i].setValue(flex);
        return;
      }
      Animated.timing(grow[i], {
        toValue: flex,
        duration: SHIFT_MS,
        easing: GLIDE,
        useNativeDriver: false,
      }).start();
    });
  }, [first, second, scale]);

  return (
    <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shown.map((seg, i) => (
        <Animated.View
          key={i}
          style={{
            flexGrow: i === 0 ? first : second,
            flexShrink: 1,
            flexBasis: 0,
            borderRadius: z(1.5),
            backgroundColor: seg.color,
          }}
        />
      ))}
    </View>
  );
}

/**
 * One sum: the caption gives, the amount does not.
 *
 * That is the whole reason this row exists in place of the column it replaced.
 * `flex: 1` with `minWidth: 0` on the caption and nothing shrinkable on the
 * figure means a long clause loses its last words — which are `still to count`,
 * a fact the list below states in a header — before a digit of money is at
 * risk. B43 is what the other order cost.
 */
function Sum({ caption, amount }: { caption: string; amount: Money }) {
  const t = useTheme();
  return (
    <View style={styles.sum}>
      <Text style={[styles.caption, { color: t.onTopMuted }]} numberOfLines={1}>
        {caption}
      </Text>
      {/*
       * MARKED, LIKE EVERY FIGURE ON THIS SCREEN — the owner's call of
       * 20 September, and the exception to the working rule in `money.ts`.
       *
       * It was unmarked for a day, as the two sides of a comparison whose
       * answer is the headline above them. On a phone that read wrong, and the
       * reason is what this block is made of: these are not small terms under a
       * name, they are figures in the block the screen opens with, and a bare
       * `15,400` at that size reads as a quantity of something rather than as
       * money. The settled night's `CHIPS` block draws the same two marked, and
       * now they agree. `docs/screens.md` has the exemption.
       *
       * NEVER COLOURED since the full board: both sides are the ink's white.
       */}
      <Text style={[styles.amount, { color: t.onTop }]} numberOfLines={1} {...cappedFigure}>
        {formatToFit(amount, BLOCK_FITS)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// A stack lands in the ranking
// ---------------------------------------------------------------------------

/**
 * WHAT MOVES WHEN A COUNT IS COMMITTED — `design/handoff-count-up-header/`,
 * the animation table, which is the cut's S114 and the only animation on this
 * screen.
 *
 * It exists to answer one question without the host re-reading the list: WHERE
 * DID THAT PLAYER LAND? A count is typed into a sheet over this screen; when
 * the sheet goes, the row has left `Still to count` and reappeared somewhere in
 * a ranking of six other people, and until now it simply was somewhere else.
 *
 *   1. the counted row travels from its uncounted slot into its rank slot, and
 *      fades .55 → 1, over 620ms;
 *   2. every row below the insertion point FLIPs from its old position to its
 *      new one over 560ms, staggered 26ms down the list, so the whole list
 *      reads as one settling motion rather than six independent rows;
 *   3. the arrived row holds a green wash and releases it over 1300ms;
 *   4. the header's bar re-scales on the same curve as 2.
 *
 * COLOUR NEVER TWEENS. The block's state can flip from coral to green on the
 * stack that lands, and a colour crossfading through the middle of that is a
 * card that says "nearly" for a third of a second.
 *
 * TRANSFORMS ONLY, so none of this re-lays out a list mid-flight: every step
 * above is a `translateY` or an `opacity` on the native driver, off positions
 * measured before and after. The one exception is the bar, whose segments are
 * flexed by raw amounts — see `Bar`.
 *
 * NOTHING ANIMATES ON FIRST PAINT, on a correction that does not change a
 * rank, or on a row whose position did not move. Under Reduce Motion only the
 * green fade survives: the row is simply in its rank slot.
 */
const GLIDE = Easing.bezier(0.32, 0.72, 0, 1);
const ARRIVE_MS = 620;
const SHIFT_MS = 560;
const STAGGER_MS = 26;
/** The wash is held for 45% of its 1300, then released over the rest. */
const HOLD_MS = 1300;
/* How long the balance moment is held before the comparison folds away. */
const SETTLE_MS = 1100;
const HELD = 0.45;

/** What the sweep tells one row to do. */
interface Landing {
  /** How far it has to come back, in points: its old position less its new. */
  travel: number;
  /** It was not in the ranking last time. It has just been counted. */
  arriving: boolean;
  /** Its place down the list among the rows that moved, for the stagger. */
  order: number;
  /** Reduce Motion is on: keep the wash, drop the travel. */
  calm: boolean;
}

/**
 * ONE RULER FOR THREE GROUPS, which is the whole difficulty.
 *
 * A row reports its position relative to the group it is in, and the group a
 * counted row arrives from is not the group it arrives into. So each group
 * reports its own offset as well, and a row's real position is the sum of the
 * two — one coordinate space, shared by every row on the screen, in which the
 * arriving row's before and after can be subtracted from each other.
 *
 * IT RE-DERIVES EVERY ROW ON EVERY SWEEP rather than only the ones that moved
 * within their group. A row whose group has slid up because the group ABOVE it
 * lost a row has moved on the screen without its own layout changing at all,
 * and it is most of what step 2 animates.
 *
 * The sweep is deferred by a tick because layout arrives a callback at a time
 * and the first of them has nothing to compare against yet.
 */
interface Ruler {
  top(group: string, y: number): void;
  measure(id: string, group: string, rank: boolean, y: number): void;
  arm(id: string, run: (l: Landing) => void): () => void;
  calm: { on: boolean };
}

const makeRuler = (): Ruler => {
  const tops = new Map<string, number>();
  const rows = new Map<string, { group: string; rank: boolean; y: number }>();
  const runs = new Map<string, (l: Landing) => void>();
  /** Where each row was last seen. An id it does not hold has never been drawn,
   *  and a row that has never been drawn does not travel. */
  const at = new Map<string, number>();
  /** Who was in the ranking last sweep. An id that was not is an arrival. */
  const ranked = new Set<string>();
  const calm = { on: false };
  let timer: ReturnType<typeof setTimeout> | null = null;

  const sweep = () => {
    timer = null;
    const now = [...rows.entries()]
      .map(([id, r]) => ({ id, rank: r.rank, y: (tops.get(r.group) ?? 0) + r.y }))
      .sort((a, b) => a.y - b.y);

    let order = 0;
    for (const row of now) {
      const was = at.get(row.id);
      at.set(row.id, row.y);
      const arriving = row.rank && !ranked.has(row.id);
      if (row.rank) ranked.add(row.id);

      const run = runs.get(row.id);
      if (run === undefined || was === undefined) continue;
      if (was === row.y && !arriving) continue;
      run({ travel: was - row.y, arriving, order: order++, calm: calm.on });
    }
  };

  const soon = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(sweep, 0);
  };

  return {
    calm,
    top(group, y) {
      if (tops.get(group) === y) return;
      tops.set(group, y);
      soon();
    },
    measure(id, group, rank, y) {
      const was = rows.get(id);
      if (was !== undefined && was.y === y && was.group === group) return;
      rows.set(id, { group, rank, y });
      soon();
    },
    arm(id, run) {
      runs.set(id, run);
      return () => {
        runs.delete(id);
        rows.delete(id);
      };
    },
  };
};

/**
 * The ruler, and the reader's Reduce Motion setting read once and watched.
 *
 * `RebuyConfirmation` does the same thing for the same reason and this is the
 * same shape as its `calm`: an announcement that moves is the one kind of
 * motion a person who has turned motion off is most likely to have meant.
 */
function useRuler(): Ruler {
  const held = useRef<Ruler | null>(null);
  if (held.current === null) held.current = makeRuler();
  const ruler = held.current;

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) ruler.calm.on = on;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      ruler.calm.on = on;
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [ruler]);

  return ruler;
}

/**
 * One row, in the ruler's hands.
 *
 * Every row on the screen is wrapped in one of these — including the ones in
 * `Still to count`, which never animate. They are here because a counted row
 * travels FROM one of them, and a position nobody measured is a position
 * nobody can travel from.
 */
function Travelling({
  id,
  group,
  rank = false,
  ruler,
  children,
}: {
  id: string;
  group: string;
  /** It is in the ranking, so it can arrive and it can be re-ranked. */
  rank?: boolean;
  ruler: Ruler;
  children: ReactNode;
}) {
  const t = useTheme();
  const shift = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const wash = useRef(new Animated.Value(0)).current;

  const run = useCallback(
    (l: Landing) => {
      if (l.arriving) {
        wash.setValue(1);
        Animated.sequence([
          Animated.delay(HOLD_MS * HELD),
          Animated.timing(wash, {
            toValue: 0,
            duration: HOLD_MS * (1 - HELD),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }

      if (l.calm || l.travel === 0) return;

      shift.setValue(l.travel);
      Animated.timing(shift, {
        toValue: 0,
        duration: l.arriving ? ARRIVE_MS : SHIFT_MS,
        delay: l.arriving ? 0 : l.order * STAGGER_MS,
        easing: GLIDE,
        useNativeDriver: true,
      }).start();

      if (!l.arriving) return;
      fade.setValue(0.55);
      Animated.timing(fade, {
        toValue: 1,
        duration: ARRIVE_MS,
        easing: GLIDE,
        useNativeDriver: true,
      }).start();
    },
    [fade, shift, wash],
  );

  useEffect(() => ruler.arm(id, run), [id, ruler, run]);

  const measure = useCallback(
    (e: LayoutChangeEvent) => ruler.measure(id, group, rank, e.nativeEvent.layout.y),
    [group, id, rank, ruler],
  );

  return (
    <Animated.View onLayout={measure} style={{ opacity: fade, transform: [{ translateY: shift }] }}>
      {children}
      {rank && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.flash, { backgroundColor: t.arrival, opacity: wash }]}
        />
      )}
    </Animated.View>
  );
}

/** A group, reporting where it starts so the rows inside it can be placed. */
function Ranked({
  name,
  ruler,
  children,
}: {
  name: string;
  ruler: Ruler;
  children: ReactNode;
}) {
  const measure = useCallback(
    (e: LayoutChangeEvent) => ruler.top(name, e.nativeEvent.layout.y),
    [name, ruler],
  );
  return <View onLayout={measure}>{children}</View>;
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------


/*
 * WHERE THE ROW'S SECOND LINE RUNS OUT.
 *
 * `in $500` alone has never needed to shorten: it is one figure at 13/400 on a
 * line with nothing else on it. Since the rounding step it can carry two —
 * `in $500 · counted $963`, which is what keeps a snapped stack checkable — and
 * two figures plus their words is a different measurement. At the millions
 * scale and 120% text, `in $500 · counted $2,352,480` wrapped to a second line
 * and the row grew under it.
 *
 * A MILLION IS WHERE ALL THREE FIGURES ABBREVIATE — the stack on the right and
 * both figures under the name, on one threshold, because a row that shortened
 * one of them and not the others would read as three different kinds of number.
 * Every night a person actually plays is exact; the synthetic seven-figure
 * tables `ui-journeys.mjs` runs are the only ones that ever compact, and they
 * are the reason the threshold exists.
 *
 * The stack on the right gave first and it gave the most. It is 19/700 against
 * the sub-line's 12.5/400, so a glyph of it is worth nearly two down there —
 * `$2,352,500` on the right cost the line under it about seventy points, which
 * is `· counted $2.4M` and the whole of what would not fit. (Those sizes are
 * the pre-board row's; the board's 16.5 figure in a card at 360 has less room
 * per glyph, so the threshold stays where it was measured.)
 */
const ROW_FITS = 1_000_000;

const styles = StyleSheet.create({
  away: { ...type.footnote, textAlign: 'center', paddingVertical: z(12) },
  /* A pushed screen's body: the board's 18 a side, its parts 12 apart. */
  groups: { paddingHorizontal: z(18), paddingTop: z(12), gap: z(12) },
  /* The board's waiting mark: an em dash at 16 in the figure face, dim. */
  waiting: { fontFamily: 'head', fontSize: z(16), fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  // ---- the block, on the ink ---------------------------------------------
  /*
   * THE BOARD'S `block()`, inside the ink top's own 18: 12 under the title row
   * (the kit's `.thero` 4 of margin and 8 of padding), 2 in at the sides, and
   * the top's own 42 under it, which the sheet overlaps by 26. No card and no
   * edge: on the ink the block is type.
   */
  block: { paddingTop: z(12), paddingHorizontal: z(2), paddingBottom: z(2) },
  /* `✓ Balanced  $5,000 in play` — option A: a 26 disc, 10 between. */
  shutLine: { flexDirection: 'row', alignItems: 'center', gap: z(10) },
  disc: { width: z(26), height: z(26), borderRadius: z(13), alignItems: 'center', justifyContent: 'center' },
  shutVerdict: { flex: 1, fontFamily: 'head', fontSize: z(22), fontWeight: '800', lineHeight: z(24) },
  shutFigure: {
    flexShrink: 0,
    fontFamily: 'head',
    fontSize: z(18),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  shutCaption: { fontSize: z(12.5), fontWeight: '400', flexShrink: 0 },
  /* Bottom-aligned, so the percentage sits on the foot of the figure whatever
     size the figure has come out at. */
  headline: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: z(10) },
  /*
   * Size, line height and tracking are all set at the call site because all
   * three are functions of the glyph count — see `headlineSize` — and of the
   * phone's width (`useHeadlineSize`). The 1.05 on the line height is the
   * same departure `type.title` makes and for the same reason: at a flat 1 a
   * descender lands on whatever is under the text box.
   */
  gap: { fontFamily: 'head', fontWeight: '700', flexShrink: 1, ...tabular },
  share: { fontFamily: 'head', fontSize: z(15), fontWeight: '700', paddingBottom: z(3), marginLeft: 'auto', flexShrink: 0, ...tabular },

  /* The kit's `.tbar`, as the board sets it here: 5 tall, segments 3 apart,
     12 under the figure and 10 above the sums. */
  bar: { flexDirection: 'row', height: z(5), gap: 3, marginTop: z(12), marginBottom: z(10) },

  /* The board's `sum()`: 6 above each, the caption and the figure 10 apart. */
  sum: { flexDirection: 'row', alignItems: 'baseline', gap: z(10), marginTop: z(6) },
  /* THE HALF THAT GIVES. `flex: 1` with `minWidth: 0` is what lets a long
     clause ellipsise rather than push the money off the block. */
  caption: { fontSize: z(12.5), fontWeight: '400', flex: 1, minWidth: 0 },
  /* THE HALF THAT DOES NOT. */
  amount: { fontFamily: 'head', fontSize: z(16), fontWeight: '700', flexShrink: 0, ...tabular },

  /*
   * A STACK LANDS — `design/handoff-count-up-header/`, the animation table.
   * The wash is drawn over the row rather than as its fill, so nothing in
   * `PlayerList` has to learn about this screen; it reaches half of the
   * card's 12 out either side, rounded, so the row lights as a block without
   * squaring off the card's own corners on the first and last rows.
   */
  flash: { left: z(-6), right: z(-6), borderRadius: z(8) },
});
