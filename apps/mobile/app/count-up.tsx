import { useMemo, type ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  balanceCheck,
  resolveLedger,
  resultBeforeDeductions,
  type BalanceCheck,
  type Money,
  type PlayerId,
} from '@poker-club/core';
import { formatSignedToFit, formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { ActiveRow, FinishedSlab, PlayerGroup } from '../src/components/PlayerList';
import { Screen } from '../src/components/Screen';
import { Step } from '../src/components/Step';
import { moneyColor, useTheme } from '../src/design/useTheme';
import type { Theme } from '../src/design/tokens';
import { cappedFigure, radius, type } from '../src/design/tokens';
import { clockLabel } from '../src/lib/elapsed';
import { cashedOutAt, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Count up — E2, step 1 of 3. `design/handoff-E2/`, cut 30 August, which
 * supersedes the status block as rev 18 drew it.
 *
 * WHY THE BLOCK WAS REBUILT. It used to read `COUNTED $2,880 of $2,880`: the
 * count against the chips still on the table. That is half a sum. It hides
 * everything that has already left — a night where a cash-out was never
 * entered reads DONE, in a card whose two figures agree with each other,
 * because the missing money was subtracted out of both sides before they were
 * compared. So the block now states the whole equation and nothing is off
 * screen in any state:
 *
 *     BOUGHT IN  $5,000        │   ACCOUNTED FOR  $3,570
 *     11 entries · 6 players   │   $2,120 cashed out · $1,450 counted
 *     ─────────────────────────────────────────────────────────
 *     $1,430 LEFT TO ACCOUNT FOR                      4 of 6 in
 *
 * THREE STATES, ONE HEIGHT. Counting, balanced, off balance — the strip and
 * the bar change colour in place and the block neither moves nor resizes, so
 * entering a stack never reflows the list underneath the host's thumb.
 *
 * GREEN IS ONLY EVER THE VERDICT. While one stack is uncounted the figures can
 * meet by coincidence, and a card that went green on that would be
 * congratulating somebody on a sum they have not finished. `balanceCheck()`
 * holds the state at *counting* until every seated player is in — including
 * the busted one, whose $0 is a count.
 *
 * OFF BALANCE DOES NOT BLOCK THE NIGHT. The gate is the COUNT: Next is dead
 * only while a stack is missing. A night that does not add up goes on to E5,
 * where the difference is named to the unit and logged, and it travels with
 * the night into the book.
 */
export default function CountUp() {
  const t = useTheme();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Screen title="Count up" backTo="Tonight">{null}</Screen>;
  }

  /**
   * Only people with chips in front of them owe a count. Somebody who busted
   * out cashed out for nothing and has nothing left to count — waiting for one
   * would block the close forever.
   */
  const standings = standingsOf(night, ledger).filter((s) => s.played);
  const seated = standings.filter((s) => s.atTable);
  const confirmed = standings.filter((s) => !s.atTable);

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
  const counted = seated.filter((s) => night.finalCounts.has(s.id));

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
      footer={
        <>
          {/* E2b. Not drawn on the new board, which draws the block and the
              button; it is rev 18's row and rev 18 stands where this handoff
              is silent, and it is the only way into "Where everyone stands". */}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/stands')}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={[styles.link, { color: t.text }]}>See where everyone stands</Text>
          </Pressable>

          <Button
            label="Next"
            variant={ready ? 'primary' : 'blocked'}
            onPress={() => router.push(settled ? '/deductions' : '/settle-up')}
          />
        </>
      }
    >
      <BalanceBlock balance={balance} />

      {/*
       * THE STEP, AND THIS IS THE SCREEN THAT OWNS IT —
       * `design/handoff-E2/docs/E2-rounding.md`, cut 31 August. Directly under
       * the balance block and above the player list, because rounding changes
       * what a stack is worth and so has to be decided where stacks are
       * entered. E4 and E6 draw the same bar and open the same sheet; only this
       * one is where it is set.
       *
       * ⚠ The addendum's frames `5a`–`5d` sit on the rev-18 E2 chrome — the
       * `COUNTED $2,610 of $2,880` strip and an `Apply the money rules` button
       * — which layout 2a superseded. Its own warning says to take the row and
       * the sheet and anchor them under the NEW block, which is what this is.
       */}
      <RoundingBar
        mode={night.roundingMode}
        onPress={() => router.push({ pathname: '/rounding', params: { scope: 'night' } })}
        style={styles.rounding}
      />

      {/*
       * THREE GROUPS — `05-active-vs-settled.md`, cut 1 September. The list
       * used to be two: everybody seated in one block, whether or not their
       * stack had been counted, and everybody who had left in another. That
       * put the rows the host still has work to do on in the same group as the
       * rows they had just finished, which is the one distinction the screen
       * exists to make.
       *
       *     STILL TO COUNT · 2
       *     COUNTED · 3
       *     CASHED OUT EARLIER · 3
       *
       * THE MIDDLE HEADER USED TO CARRY THE COLUMN'S MEANING —
       * `COUNTED · 3 · RESULT BEFORE DEDUCTIONS` — because the right-hand
       * column changes meaning between a row still to count and a row that is
       * finished, and nothing else on the row said which. The slab says it now
       * (`design/handoff-player-list/`, cut 3 September), so all three labels
       * are a name and a count. What has not come off those figures is on the
       * lede and the rounding bar above them.
       *
       * GROUPS NEVER REORDER AND NEVER DISAPPEAR. Seat order within each, and
       * an empty one draws its header with `· 0` rather than vanishing, so the
       * host can see that nobody is left to count rather than inferring it
       * from a group that is no longer on screen.
       */}
      <View style={styles.groups}>
        <PlayerGroup label="Still to count" count={toCount.length} first>
          {toCount.map((p, i) => (
            <ActiveRow
              key={p.id}
              name={p.name}
              fact={`in ${formatToFit(p.boughtIn, ROW_FITS)}`}
              last={i === toCount.length - 1}
              accessibilityLabel={`Count ${p.name}`}
              onPress={() =>
                router.push({ pathname: '/log', params: { player: p.id, kind: 'count' } })
              }
              right={
                <>
                  <Text style={[styles.waiting, { color: t.dim }]}>—</Text>
                  <Icon name="pencil" color={t.amber} size={17} />
                </>
              }
            />
          ))}
        </PlayerGroup>

        {/*
          * COUNTED AND CASHED OUT ARE THE SAME TREATMENT, and that is the rule:
          * both are finished, so both are slabs. What differs is the fact each
          * one carries — the stack for one, the time for the other.
          *
          * ⚠ A COUNTED SLAB KEEPS ITS CHEVRON, WHICH THE HANDOFF TAKES AWAY,
          * and it is the same exception Tonight's cashed-out slab gets. The
          * rule for this app is *a figure is fixed where it was entered*: this
          * screen is where a count is typed, so this screen is where a count
          * typed wrong is retyped. Tapping the slab reopens the same keypad
          * with the same prefill and overwrites it.
          *
          * WITHOUT IT, E5's `Fix` LEADS NOWHERE. Out of balance is the screen
          * that names a difference and offers to go and fix it, and the fix is
          * always a count: it hands the host back to this screen with every row
          * already counted. If none of those rows opens, the button has taken
          * them to a screen with nothing on it to change, on the one path in
          * the app that exists for recovering from a mistake.
          *
          * CASHED OUT EARLIER DOES NOT OPEN, by the same rule read the other
          * way: that figure was entered on Tonight, and Tonight's slab is where
          * it is retyped. Both deviations and the question are in
          * `docs/screens.md`.
          */}
        <PlayerGroup label="Counted" count={counted.length}>
          {counted.map((p) => (
            <FinishedSlab
              key={p.id}
              name={p.name}
              fact={`counted ${formatToFit(night.finalCounts.get(p.id)!, ROW_FITS)}`}
              result={resultBeforeDeductions(p.boughtIn, night.finalCounts.get(p.id)!)}
              fits={ROW_FITS}
              accessibilityLabel={`Count ${p.name} again`}
              opens={() =>
                router.push({ pathname: '/log', params: { player: p.id, kind: 'count' } })
              }
            />
          ))}
        </PlayerGroup>

        <PlayerGroup label="Cashed out earlier" count={confirmed.length}>
          {confirmed.map((p) => (
            <FinishedSlab
              key={p.id}
              name={p.name}
              fact={cashedOutFact(night, p.id, p.cashedOut)}
              result={resultBeforeDeductions(p.boughtIn, p.cashedOut)}
              fits={ROW_FITS}
            />
          ))}
        </PlayerGroup>
      </View>
    </Screen>
  );
}

/**
 * WHAT FINISHED THEM — the clock alone, `23:15`.
 *
 * SHORTER THAN THE SAME PERSON'S ROW ON TONIGHT, which draws
 * `23:15 · out $2,120`, and the handoff draws both that way deliberately. This
 * screen has a third group above and a balance card above that: it is the
 * densest list in the app, and the cash-out figure is the one term on the slab
 * that is already implied — the result at the right is what the reader came for
 * and the buy-in has its own column two groups up.
 *
 * It is also what keeps the line inside the slab. `13:03 · out CHF2,120` is
 * 150 points of a 122-point box at 120% text in a three-letter currency, and
 * the clipped end of it is money — see B41.
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
  return at === undefined ? `out ${formatToFit(cashedOut, ROW_FITS)}` : clockLabel(at);
};

// ---------------------------------------------------------------------------
// The block
// ---------------------------------------------------------------------------

/**
 * How each state is painted. One table rather than three branches, so a state
 * cannot pick up a colour from another one by accident, and so the light twin
 * — which the handoff leaves to us — is derived once for all four.
 *
 * The mid-count colour is option **2f** off the board, the one the handoff
 * recommends: amber on the ACCOUNTED FOR label and on the filled bar, both
 * figures white. Amber means "in progress" here and on the settlement status
 * line, and putting it on the label rather than the money leaves green and red
 * to mean what they mean everywhere else in this app. NO NEW HUE.
 */
const paint = (t: Theme, state: BalanceCheck['state']) => {
  switch (state) {
    case 'counting':
      return {
        edge: t.hairline,
        label: t.amber,
        figure: t.text,
        fill: t.amber,
        rest: t.track,
        stripFill: t.strip,
        stripRule: t.hairline,
        stripText: t.text,
      };
    case 'balanced':
      return {
        edge: t.winStrong,
        label: t.win,
        figure: t.win,
        fill: t.win,
        rest: t.win,
        stripFill: t.winWash,
        stripRule: t.winEdge,
        stripText: t.win,
      };
    default:
      return {
        edge: t.dangerStrong,
        label: t.loss,
        figure: t.loss,
        fill: t.loss,
        rest: t.dangerTrack,
        stripFill: t.dangerWash,
        stripRule: t.dangerEdge,
        stripText: t.loss,
      };
  }
};

function BalanceBlock({ balance }: { balance: BalanceCheck }) {
  const t = useTheme();
  const c = paint(t, balance.state);

  /*
   * The bar is drawn on the BOUGHT IN scale, so a table holding more than went
   * into it grows a segment past the full width rather than silently topping
   * out at it — an over reads as an over, not as a balance in the wrong
   * colour. Under it, the two segments are what is in and what is left.
   */
  const run = Math.min(balance.accountedFor, balance.boughtIn);
  const rest = Math.abs(balance.left);
  const empty = run === 0 && rest === 0;

  /*
   * WHO THE MONEY CAME FROM, NOT HOW MUCH OF IT — `3 counted · 3 cashed out`,
   * screen 2 of `design/handoff-four-screens/`.
   *
   * It used to name the two amounts: `$2,120 cashed out · $2,390 counted`. Two
   * figures and their words do not fit the 139 points this half of the block
   * has, and B38 is the entry for what that cost — the counted half was
   * ellipsised away on the reference phone, in ordinary dollars. Counts of
   * people fit, they are the half the figure above does not already state, and
   * they take over the job the strip's tally used to do.
   */
  const sub = `${balance.countedPlayers} counted · ${balance.cashedOutPlayers} cashed out`;

  return (
    <View style={[styles.block, { backgroundColor: t.surface, borderColor: c.edge }]}>
      <View style={styles.sums}>
        <Sum
          label="BOUGHT IN"
          labelColor={t.muted}
          /* Never coloured: it is the fixed side of the comparison. */
          figureColor={t.text}
          amount={balance.boughtIn}
          /* PEOPLE FIRST, THEN BUY-INS — `design/handoff-four-screens/`,
             screen 2. It reads as the shape of the night rather than as a
             count of database rows, and it is the same two numbers. */
          sub={`${balance.playersTotal} ${balance.playersTotal === 1 ? 'player' : 'players'} · ${balance.entries} ${balance.entries === 1 ? 'buy-in' : 'buy-ins'}`}
        />
        <View style={[styles.divider, { backgroundColor: t.hairline }]} />
        <Sum
          label="ACCOUNTED FOR"
          labelColor={c.label}
          figureColor={c.figure}
          amount={balance.accountedFor}
          /* A space, not nothing: before a single stack is in there is no term
             to state that is not "$0 cashed out", and the block may not change
             height to say so. The handoff has no copy for this state — see
             docs/screens.md. */
          sub={sub === '' ? ' ' : sub}
        />
      </View>

      <View style={styles.barRow}>
        <View style={[styles.bar, balance.state !== 'balanced' && styles.barSplit]}>
          {empty ? (
            <View style={{ flex: 1, backgroundColor: c.rest }} />
          ) : (
            <>
              {run > 0 && <View style={{ flex: run, backgroundColor: c.fill }} />}
              {rest > 0 && <View style={{ flex: rest, backgroundColor: c.rest }} />}
            </>
          )}
        </View>
      </View>

      <View style={[styles.strip, { backgroundColor: c.stripFill, borderTopColor: c.stripRule }]}>
        {balance.state === 'balanced' && <Icon name="check" color={t.win} size={15} />}
        <Text style={[styles.verdict, { color: c.stripText }]} numberOfLines={1} {...cappedFigure}>
          {verdict(balance)}
        </Text>
        {/*
          * HOW FAR ALONG, AS A PERCENTAGE — screen 2 of
          * `design/handoff-four-screens/`, which draws `78% accounted for`
          * beside what is still on the table.
          *
          * IT TOOK THE TALLY'S PLACE, it did not squeeze in beside it. The
          * strip used to read `3 of 6 in` here, and that count is now the
          * sub-line under ACCOUNTED FOR — `3 counted · 3 cashed out`, which
          * says the same thing and says which half is which. Two statements of
          * one fact in one card is what this whole pass has been removing.
          *
          * The verdict never shrinks and never ellipsises; this does. At 360
          * the two run within a couple of points of the strip's width, and if
          * one of them has to give it is the progress and not the money.
          */}
        <Text style={[styles.tally, { color: t.muted }]} numberOfLines={1}>
          {balance.state === 'balanced' ? '' : `${percent(balance)}% accounted for`}
        </Text>
      </View>
    </View>
  );
}

/**
 * How much of what went in has been accounted for, as a whole number.
 *
 * FLOORED, NEVER ROUNDED UP, and it is the same reason a progress bar never
 * shows 100% until it is done: `99.6%` reading as `100% accounted for` beside a
 * verdict saying $20 is missing is the card disagreeing with itself. A night
 * with nothing bought in is 0 rather than a division by zero.
 *
 * IT IS NOT SHOWN WHEN THE NIGHT BALANCES. The strip then reads
 * `BALANCED — NOTHING MISSING`, which is what 100% would be saying in figures,
 * and the check mark beside it says it a third time.
 */
const percent = (b: BalanceCheck): number =>
  b.boughtIn === 0 ? 0 : Math.floor((b.accountedFor / b.boughtIn) * 100);

/** The strings, verbatim from the logic doc. */
const verdict = (b: BalanceCheck): string => {
  switch (b.state) {
    case 'counting':
      return `${formatToFit(b.left, BLOCK_FITS)} LEFT TO ACCOUNT FOR`;
    case 'balanced':
      return 'BALANCED — NOTHING MISSING';
    case 'short':
      return `${formatToFit(b.left, BLOCK_FITS)} SHORT`;
    case 'over':
      return `${formatToFit(Math.abs(b.left) as Money, BLOCK_FITS)} OVER`;
  }
};

function Sum({
  label,
  labelColor,
  figureColor,
  amount,
  sub,
}: {
  label: string;
  labelColor: string;
  figureColor: string;
  amount: Money;
  sub: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.sum}>
      <Text style={[styles.sumLabel, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.sumFigure, { color: figureColor }]}
        numberOfLines={1}
        {...cappedFigure}
      >
        {formatToFit(amount, BLOCK_FITS)}
      </Text>
      {/*
        * TWO LINES, AT A FIXED HEIGHT — B38.
        *
        * One line held `$2,120 cashed out` and nothing more. The half-block
        * gives this about 123 points and the line has carried two figures and
        * their words since the block was rebuilt to state the whole equation:
        * `$2,120 cashed out · $2,390 counted` is 199 of them, so the counted
        * half — the half that says WHAT has been accounted for — was ellipsised
        * away on the reference phone, in ordinary dollars.
        *
        * The height is pinned rather than left to the content, because the rule
        * this block lives by is that it is ONE HEIGHT in every state: counting,
        * balanced and off balance. A box that grew when the second figure
        * arrived would reflow the list under the host's thumb at the exact
        * moment they are entering a stack.
        */}
      <Text style={[styles.sumSub, { color: t.muted }]} numberOfLines={2}>
        {sub}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------




/**
 * WHERE THE TWO SUMS RUN OUT OF ROOM.
 *
 * They share the block half and half, so each figure gets (320 − 1) / 2 less
 * 36 of padding — about 123 points at 360, the narrowest phone in the matrix.
 * At 800/30 that holds "$99,999" (about 104) and "$999.9k" (about 109), with
 * the 1.1 text-size cap on top of both. Six figures does not fit, so from
 * $100,000 the pair goes compact TOGETHER: abbreviating one and not the other
 * would put "$2.4M" beside "$2,352,880" in one card and read as two scales
 * rather than two sums. B15 is the bug that argument comes from.
 *
 * No precision is lost by it. The exact difference is what the night turns on
 * and it is stated to the unit one screen along, on E5.
 */
const BLOCK_FITS = 100_000;

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
 * is `· counted $2.4M` and the whole of what would not fit.
 */
const ROW_FITS = 1_000_000;

const styles = StyleSheet.create({
  /* Under the block's own bottom margin, above the first group's label. */
  rounding: { marginTop: 4 },
  /* The rows' own 22, carried once for all three groups. */
  groups: { marginHorizontal: 22 },
  waiting: { fontSize: 19, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  // ---- the block --------------------------------------------------------
  block: {
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sums: { flexDirection: 'row' },
  sum: { flex: 1, gap: 5, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 14 },
  divider: { width: 1, marginVertical: 14 },
  sumLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  sumFigure: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  /* 32 is two lines of 16, and it does not move between states. */
  sumSub: { fontSize: 12, fontWeight: '400', lineHeight: 16, height: 32 },

  barRow: { paddingHorizontal: 18, paddingBottom: 14 },
  bar: { flexDirection: 'row', height: 8, borderRadius: 3, overflow: 'hidden' },
  /** Two segments are held apart by 2; one full-width segment is not split. */
  barSplit: { gap: 2 },

  /*
   * ONE HEIGHT IN EVERY STATE, which is the whole point of the strip: 11 above
   * and below a 17-point line, whether that line is carrying a check mark, a
   * countdown or a verdict. A strip that grew by two points when the night
   * balanced would shunt the list under the host's thumb at the exact moment
   * they are reading it.
   */
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderTopWidth: 1,
  },
  verdict: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.78,
    lineHeight: 17,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  tally: { fontSize: 12.5, fontWeight: '400', lineHeight: 17, marginLeft: 'auto', flexShrink: 1 },

  // ---- the list ---------------------------------------------------------
  /*
   * E2's OWN TYPE SCALE, which `05-active-vs-settled.md` states in full
   * precisely because it is NOT Tonight's: 15.5 and 18 here against 17 and 19
   * there, 11.5 of sub-line against 12, and a 12-point group header against an
   * 11.5-point one. Three groups and eight players is 61 points more than this
   * screen has, so every half point of it was spent deliberately — a scale
   * borrowed from the other screen costs a row off the fold.
   */
  group: { marginHorizontal: 22 },
  groupAfter: { paddingTop: 14 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },

  /** `7px 4px`, hairline under every row. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  /**
   * Tinted, and pushed 8 out past the list so the tint reads as a block.
   *
   * IT KEEPS ITS OWN HEIGHT. The doc's `7px 4px` is the list's, and this row
   * carries a 34-point Count chip: pulling its padding down to 7 would leave
   * the tint hugging the chip with nothing around it, and the row is the one
   * the host is aiming a thumb at. The extra points are the chip's, not the
   * type's — everything inside it is on the same scale as the rows above.
   */
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginHorizontal: -8,
    borderRadius: 8,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  rowText: { gap: 3, flexShrink: 1, minWidth: 0 },
  name: { ...type.rowName, fontSize: 15.5 },
  /*
   * 11.5 — the doc's E2 sub-line, which is a point lower than the 12.5 this
   * line was set at when it was measured against E6's board. It is the same
   * line doing more work: it now carries two figures and their words on every
   * settled row rather than only on a stack the step moved.
   */
  detail: { ...type.rowDetail, fontSize: 11.5 },
  /* NEVER SHRINKS — the name gives, a figure does not. See B18. */
  figure: { ...type.figure, fontSize: 18, marginLeft: 'auto', flexShrink: 0 },

  countChip: {
    marginLeft: 'auto',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  countChipLabel: { fontSize: 14, fontWeight: '700' },

  link: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
    paddingBottom: 2,
  },
});
