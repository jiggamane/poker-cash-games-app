import { useMemo, type ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  balanceCheck,
  composition,
  formatMoney,
  formatToFit,
  granularityOf,
  resolveLedger,
  roundToStep,
  type BalanceCheck,
  type Money,
  type PlayerId,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { Screen } from '../src/components/Screen';
import { Step } from '../src/components/Step';
import { useTheme } from '../src/design/useTheme';
import type { Theme } from '../src/design/tokens';
import { cappedFigure, radius, type } from '../src/design/tokens';
import { standingsOf, useNight } from '../src/lib/nightStore';

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

      <Group label="Still seated" first>
        {seated.map((p) => (
          <SeatedRow
            key={p.id}
            id={p.id}
            name={p.name}
            boughtIn={p.boughtIn}
            count={night.finalCounts.get(p.id)}
            step={granularityOf(night.roundingMode)}
          />
        ))}
      </Group>

      <Group label="Already confirmed">
        {confirmed.map((p) => (
          <ConfirmedRow
            key={p.id}
            name={p.name}
            boughtIn={p.boughtIn}
            cashedOut={p.cashedOut}
            at={leftAt(night, p.id)}
          />
        ))}
      </Group>
    </Screen>
  );
}

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

  const sub = composition(balance, (m) => formatMoney(m));

  return (
    <View style={[styles.block, { backgroundColor: t.surface, borderColor: c.edge }]}>
      <View style={styles.sums}>
        <Sum
          label="BOUGHT IN"
          labelColor={t.muted}
          /* Never coloured: it is the fixed side of the comparison. */
          figureColor={t.text}
          amount={balance.boughtIn}
          sub={`${balance.entries} ${balance.entries === 1 ? 'entry' : 'entries'} · ${balance.playersTotal} players`}
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
        {/* The verdict never shrinks and never ellipsises; this does. At 360
            the two run within a couple of points of the strip's width, and if
            one of them has to give it is the tally and not the money. */}
        <Text style={[styles.tally, { color: t.muted }]} numberOfLines={1}>
          {balance.state === 'counting'
            ? `${balance.playersIn} of ${balance.playersTotal} in`
            : balance.state === 'balanced'
              ? ''
              : 'recount, or log it'}
        </Text>
      </View>
    </View>
  );
}

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
      <Text style={[styles.sumSub, { color: t.muted }]} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

function Group({
  label,
  children,
  first = false,
}: {
  label: string;
  children: ReactNode[];
  first?: boolean;
}) {
  const t = useTheme();
  if (children.length === 0) return null;

  return (
    <View style={[styles.group, !first && styles.groupAfter]}>
      <Text style={[styles.sectionLabel, { color: t.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * Somebody with chips still in front of them.
 *
 * Uncounted, the row is tinted and carries the ask — "not counted yet" and a
 * Count chip. Counted, it drops back into the list with its figure and a
 * pencil. The chip is drawn, not a `Button`: the whole row is the target, and
 * a control inside a control gives a host two things to hit where the board
 * draws one.
 */
function SeatedRow({
  id,
  name,
  boughtIn,
  count,
  step,
}: {
  id: PlayerId;
  name: string;
  boughtIn: Money;
  count: Money | undefined;
  /** The night's rounding step, in whole units. 1 is off. */
  step: number;
}) {
  const t = useTheme();
  const waiting = count === undefined;

  /*
   * THE FIGURE IS THE ROUNDED ONE AND THE COUNT IS KEPT UNDERNEATH — rule 6 of
   * `E2-rounding.md`, and the whole of what makes the step safe to offer. The
   * row settles at $970 and says, in the line under the name, that $965 is what
   * was in front of them: `in $500 · counted $963`. A stack is never silently
   * rewritten, and a host who is asked "that is not what I had" can point at
   * the number they typed.
   *
   * The sub-line says nothing about the count when nothing moved, which is
   * every stack on a night settling as counted.
   */
  const shown = count === undefined ? undefined : roundToStep(count, step);
  const moved = count !== undefined && shown !== count;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={waiting ? `Count ${name}` : `Edit ${name}'s count`}
      onPress={() => router.push({ pathname: '/log', params: { player: id, kind: 'count' } })}
      style={({ pressed }) => [
        waiting
          ? [styles.waitingRow, { backgroundColor: t.offTableWash }]
          : [styles.row, { borderBottomColor: t.hairline }],
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: t.text }]}>{name}</Text>
        {/* The sand is the board's, and it is the one thing on this screen
            drawn in the off-table hue for a reason other than off-table money:
            it is what marks the rows the host still has to work through. */}
        <Text style={[styles.detail, { color: waiting ? t.offTable : t.muted }]}>
          {waiting
            ? 'not counted yet'
            : moved
              ? `in ${formatToFit(boughtIn, ROW_FITS)} · counted ${formatToFit(count, ROW_FITS)}`
              : `in ${formatMoney(boughtIn)}`}
        </Text>
      </View>

      {waiting ? (
        <View style={[styles.countChip, { borderColor: t.quietOutline }]}>
          <Text style={[styles.countChipLabel, { color: t.text }]}>Count</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.figure, { color: t.text }]} numberOfLines={1} {...cappedFigure}>
            {formatToFit(shown!, ROW_FITS)}
          </Text>
          <Icon name="pencil" color={t.muted} size={15} />
        </>
      )}
    </Pressable>
  );
}

/**
 * Somebody who left and had their stack agreed. Their money is in
 * `accountedFor` already, they are NEVER re-counted, and the row does not
 * respond to a tap — the whole thing is muted and carries no glyph, which is
 * the difference between a row you have finished with and a row you can open.
 */
function ConfirmedRow({
  name,
  boughtIn,
  cashedOut,
  at,
}: {
  name: string;
  boughtIn: Money;
  cashedOut: Money;
  at: string | undefined;
}) {
  const t = useTheme();
  const time = clock(at);

  return (
    <View style={styles.confirmedRow}>
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: t.muted }]}>{name}</Text>
        <Text style={[styles.detail, { color: t.muted }]}>
          {`cashed out${time === '' ? '' : ` ${time}`} · in ${formatMoney(boughtIn)}`}
        </Text>
      </View>
      <Text style={[styles.figure, { color: t.muted }]}>{formatMoney(cashedOut)}</Text>
    </View>
  );
}

/** When they left the table, which is the time on their last cash-out. */
function leftAt(
  night: NonNullable<ReturnType<typeof useNight>>,
  playerId: PlayerId,
): string | undefined {
  const out = [...night.entries]
    .filter((e) => e.type === 'cashout' && e.playerId === playerId)
    .sort((a, b) => b.seq - a.seq)[0];
  return out === undefined ? undefined : night.occurredAt[out.id];
}

const clock = (at: string | undefined): string =>
  at === undefined ? '' : new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

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
  sumSub: { fontSize: 12, fontWeight: '400', lineHeight: 16 },

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
  group: { marginHorizontal: 22 },
  groupAfter: { paddingTop: 16 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  /** Tinted, and pushed 8 out past the list so the tint reads as a block. */
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginHorizontal: -8,
    borderRadius: 8,
  },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowText: { gap: 3, flexShrink: 1 },
  name: type.rowName,
  /*
   * 12.5, WHICH IS THE BOARD'S — `Result Formula Options.dc.html` draws this
   * line at `400 12.5px` and the app's shared `rowDetail` is 13. Half a point,
   * and it is on the one line in the app that now carries two figures and two
   * words: since the rounding step it reads `in $1,000 · counted $1,432`, and
   * every fraction of it is spent.
   */
  detail: { ...type.rowDetail, fontSize: 12.5 },
  figure: { ...type.figure, marginLeft: 'auto' },

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
