import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
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
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { ActiveRow, FinishedSlab, PlayerGroup } from '../src/components/PlayerList';
import { Screen } from '../src/components/Screen';
import { Step } from '../src/components/Step';
import { useTheme } from '../src/design/useTheme';
import type { Theme } from '../src/design/tokens';
import { cappedFigure, radius, tabular, type } from '../src/design/tokens';
import { clockLabel } from '../src/lib/elapsed';
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
 *     Accounted for · 8 counted                      ₾48,000
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
   * reads `Accounted for · 6 counted`, summing counted stacks and cash-outs
   * into one figure — the cut's S111, which says cash-outs are not called out
   * separately. Until now the list under it answered that 6 with a 5 and a 1 in
   * two headings.
   *
   * THE ORDER IS THE COLUMN AT THE RIGHT EDGE, which is the same argument
   * Tonight's seated group sorts on. Every row here draws its result at 19/700
   * and nothing else numeric, so a list sorted by it can be checked by a reader
   * running a finger down the column. `Still to count` is left in seat order
   * because it has no result to rank on — an em dash is not a position.
   *
   * ⚠ WHAT THE SPLIT WAS CARRYING, and it does not disappear with the heading:
   * a counted row reopens the keypad and a cashed-out row does not, because a
   * figure is fixed where it was entered. Under two headings the group said
   * which; under one, the ROW has to — so a cashed-out row now reads `cashed
   * out 10:45` rather than the bare clock it could get away with before, and
   * keeps the shorter slab that the player-list rule gives a row with nothing
   * to tap. `docs/screens.md` carries the decision and what it costs.
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
      footer={
        <>
          {/* E2b's link is gone with E2b — 5 September. It was the only way
              into "Where everyone stands", which drew these same rows in this
              same order one tap away; the two finished groups rank in place
              now, so there is nothing behind the link to see. */}
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
       * THE HEADER USED TO CARRY THE COLUMN'S MEANING — `COUNTED · 3 · RESULT
       * BEFORE DEDUCTIONS` — because the right-hand column changes meaning
       * between a row still to count and a row that is finished, and nothing
       * else on the row said which. The slab says it now
       * (`design/handoff-player-list/`, cut 3 September), so both labels are a
       * name and a count. What has not come off those figures is on the lede
       * and the rounding bar above them.
       *
       * `COUNTED` IS THE BLOCK'S OWN WORD for this group, and the two now agree
       * to the person: the block reads `Accounted for · 6 counted`, summing
       * stacks and cash-outs, and the group underneath it holds those same six.
       * The row says which kind it is — `counted $960` against `cashed out
       * 10:45` — which is where that distinction belongs now that it is not a
       * heading.
       *
       * GROUPS NEVER REORDER AND NEVER DISAPPEAR. An empty one draws its header
       * with `· 0` rather than vanishing, so the host can see that nobody is
       * left to count rather than inferring it from a group that is no longer
       * on screen.
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
              </Travelling>
            ))}
          </PlayerGroup>
        </Ranked>

        {/*
          * COUNTED AND CASHED OUT ARE THE SAME TREATMENT, and since 6 September
          * they are the same GROUP: both are finished, so both are slabs, and
          * they rank together. What differs is the fact each one carries — the
          * stack for one, `cashed out` and the time for the other — and what
          * happens when it is tapped.
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
          * A CASHED-OUT ROW DOES NOT OPEN, by the same rule read the other way:
          * that figure was entered on Tonight, and Tonight's slab is where it
          * is retyped. In one merged group that difference is no longer stated
          * by a heading, so it is stated by the row — the chevron, and the 44
          * the player-list rule gives a slab that is a target against the 39 it
          * gives one that is not. Both deviations and the question are in
          * `docs/screens.md`.
          */}
        <Ranked name="counted" ruler={ruler}>
          <PlayerGroup label="Counted" count={finished.length}>
            {finished.map((p) => (
              <Travelling key={p.id} id={p.id} group="counted" rank ruler={ruler}>
                <FinishedSlab
                  name={p.name}
                  fact={
                    p.atTable
                      ? `counted ${formatToFit(endedWith(p), ROW_FITS)}`
                      : cashedOutFact(night, p.id, p.cashedOut)
                  }
                  result={resultBeforeDeductions(p.boughtIn, endedWith(p))}
                  fits={ROW_FITS}
                  {...(p.atTable
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
 * How each state is painted: an edge and one ink, and the ink is on the
 * headline, the percentage and the accounted-for amount alike.
 *
 * One table rather than three branches, so a state cannot pick up a colour
 * from another one by accident, and so the light twin — which the cut leaves
 * to us — is derived once for all three.
 */
const paint = (t: Theme, tone: Tone): { edge: string; ink: string } => {
  switch (tone) {
    case 'balanced':
      return { edge: t.winStrong, ink: t.win };
    case 'counting':
      /* PLAIN TEXT AND A HAIRLINE — see `toneOf`. The block is not making a
         claim about the night yet, so it is not wearing a colour that does.
         Every figure in it is white; only the captions beside them are
         muted, exactly as they are in the other two states. */
      return { edge: t.hairline, ink: t.text };
    default:
      /* The cut measures this edge at 50% and the token is 55%. One alpha of
         one hue, shared with the end-the-night row rather than forked for a
         difference nobody can see. */
      return { edge: t.dangerStrong, ink: t.loss };
  }
};

/**
 * THE BAR IS DRAWN TO THE REAL SCALE — each segment flexed by its own raw
 * amount, not by a percentage worked out first.
 *
 * Over: what went in, then the overage beyond it. Short: what is accounted
 * for, then the hole. Level: one segment, the whole width. A table holding
 * more than went into it therefore grows a segment PAST the money rather than
 * topping out at it, and an over reads as an over rather than as a balance in
 * the wrong colour.
 *
 * The empty night is the one case with no scale at all — nothing in and
 * nothing counted is 0 against 0 — so it draws the track and nothing else.
 */
const segments = (
  t: Theme,
  tone: Tone,
  b: BalanceCheck,
): ReadonlyArray<{ flex: number; color: string }> => {
  if (b.boughtIn === 0 && b.accountedFor === 0) return [{ flex: 1, color: t.track }];
  if (tone === 'balanced') return [{ flex: 1, color: t.win }];

  /*
   * MID-COUNT THE BAR IS A PROGRESS BAR AND NOTHING MORE — grey against the
   * track, in the same two segments and to the same scale. It fills as the
   * stacks go in; it does not say the night is short while it is filling. Only
   * once the count is done does the run become the loss colour and the
   * remainder its wash, which is the cut's own pair.
   */
  const run = tone === 'off' ? t.loss : t.muted;
  const rest = tone === 'off' ? t.dangerTrack : t.track;

  return b.left < 0
    ? [
        { flex: b.boughtIn, color: t.barIn },
        { flex: -b.left, color: run },
      ]
    : [
        { flex: b.accountedFor, color: run },
        { flex: b.left, color: rest },
      ];
};

function BalanceBlock({ balance }: { balance: BalanceCheck }) {
  const t = useTheme();
  const tone = toneOf(balance);
  const c = paint(t, tone);
  const balanced = tone === 'balanced';
  const shut = useCollapse(balanced);

  /* The cut's `accounted_for − bought_in`, which is the engine's `left` the
     other way up: a positive gap is money on the table that nobody bought. */
  const gap = -balance.left as Money;
  const headline = formatSignedToFit(gap, BLOCK_FITS);
  const size = headlineSize(headline.length);

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
     string in the block that is not signed off. `docs/screens.md`. */
  const accounted = waiting === 0 ? `${done} counted` : `${done} counted, ${waiting} still to count`;

  return (
    <Pressable
      /*
       * ONLY ONCE IT BALANCES. A card that could be folded away mid-count would
       * be offering to hide the one figure the screen exists to drive to zero.
       */
      accessibilityRole={balanced ? 'button' : undefined}
      accessibilityLabel={balanced && shut.collapsed ? `Balanced, ${formatToFit(balance.boughtIn, BLOCK_FITS)} in play` : undefined}
      accessibilityHint={balanced ? 'Double tap to show the comparison.' : undefined}
      onPress={balanced ? shut.toggle : undefined}
      style={[styles.block, { backgroundColor: t.surface, borderColor: c.edge }]}
    >
      {shut.collapsed ? (
        /*
         * THE ONE LINE THE CARD KEEPS — `✓ Balanced ₾47,000 in play`.
         *
         * The comparison has done its job the moment the two sums agree, and
         * from there it is 90 points of arithmetic held over the list a host is
         * actually working through. What survives is the verdict and the figure,
         * which is what a person glances back up at.
         */
        <View style={styles.shutLine}>
          <Icon name="check" color={t.win} size={17} />
          <Text style={[styles.shutVerdict, { color: t.win }]} numberOfLines={1}>
            Balanced
          </Text>
          <Text style={[styles.shutFigure, { color: t.text }]} numberOfLines={1} {...cappedFigure}>
            {formatToFit(balance.boughtIn, BLOCK_FITS)}
          </Text>
          <Text style={[styles.shutCaption, { color: t.muted }]} numberOfLines={1}>
            in play
          </Text>
        </View>
      ) : (
      <>
      <View style={styles.headline}>
        <Text
          style={[styles.gap, { color: c.ink, fontSize: size, lineHeight: size * 1.05, letterSpacing: -0.03 * size }]}
          numberOfLines={1}
          {...cappedFigure}
        >
          {headline}
        </Text>
        <Text style={[styles.share, { color: c.ink }]} numberOfLines={1} {...cappedFigure}>
          {`${percent(balance)}%`}
        </Text>
      </View>

      <Bar segments={segments(t, tone, balance)} />

      <View style={styles.sums}>
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
          /* Never coloured: it is the fixed side of the comparison. */
          colour={t.text}
          amount={balance.boughtIn}
        />
        <Sum caption={`Accounted for · ${accounted}`} colour={c.ink} amount={balance.accountedFor} />
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
    <View style={styles.bar}>
      {shown.map((seg, i) => (
        <Animated.View
          key={i}
          style={{
            flexGrow: i === 0 ? first : second,
            flexShrink: 1,
            flexBasis: 0,
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
function Sum({ caption, colour, amount }: { caption: string; colour: string; amount: Money }) {
  const t = useTheme();
  return (
    <View style={styles.sum}>
      <Text style={[styles.caption, { color: t.muted }]} numberOfLines={1}>
        {caption}
      </Text>
      <Text style={[styles.amount, { color: colour }]} numberOfLines={1} {...cappedFigure}>
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
  /*
   * ONE CARD, ONE PADDING BOX, THREE THINGS IN IT — 16/18/14 inside, and a
   * 12-point gap between the headline, the bar and the sums. The block it
   * replaced was three boxes with their own paddings and a rule between two of
   * them, because it had a footer strip; nothing is pinned to the bottom of
   * this one, so nothing needs the seam.
   */
  block: {
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 12,
  },
  /* `✓ Balanced  ₾47,000 in play` — one row, and the card's own padding round
     it, so folding does not change the block's gutters. */
  shutLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  shutVerdict: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  shutFigure: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  shutCaption: { fontSize: 12, fontWeight: '500', flexShrink: 0 },
  /* Bottom-aligned, so the percentage sits on the foot of the figure whatever
     size the figure has come out at. */
  headline: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  /*
   * Size, line height and tracking are all set at the call site because all
   * three are functions of the glyph count — see `headlineSize`. The 1.05 on
   * the line height is the same departure `type.title` makes and for the same
   * reason: at a flat 1 a descender lands on whatever is under the text box.
   */
  gap: { fontWeight: '800', flexShrink: 1, ...tabular },
  share: { fontSize: 15, fontWeight: '700', marginLeft: 'auto', flexShrink: 0, ...tabular },

  /* Two segments held apart by 2, in a box that clips them to the radius. A
     single-segment state has nothing to be held apart from. */
  bar: { flexDirection: 'row', height: 8, borderRadius: 3, overflow: 'hidden', gap: 2 },

  sums: { gap: 7 },
  sum: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  /* THE HALF THAT GIVES. `flex: 1` with `minWidth: 0` is what lets a long
     clause ellipsise rather than push the money off the card. */
  caption: { fontSize: 13.5, fontWeight: '500', flex: 1, minWidth: 0 },
  /* THE HALF THAT DOES NOT. */
  amount: { fontSize: 18, fontWeight: '700', flexShrink: 0, ...tabular },

  /*
   * A STACK LANDS — `design/handoff-count-up-header/`, the animation table.
   * The wash is drawn over the slab rather than as its fill, so nothing in
   * `PlayerList` has to learn about this screen; `bottom: 5` is the slab's own
   * margin, kept out of the flash.
   */
  flash: { bottom: 5, borderRadius: radius.pressable },

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
});
