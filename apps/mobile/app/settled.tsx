import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  money,
  paymentProgress,
  resultTotals,
  settle,
  settledRows,
  type Money,
  type SettledMode,
  type SettledRow,
  type StoredVerification,
} from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { ReconciliationRow, ScoreRow, ScoreTabs } from '../src/components/ScoreBreakdown';
import { Screen } from '../src/components/Screen';
import { TotalsCard } from '../src/components/TotalsCard';
import { useTheme } from '../src/design/useTheme';
import { radius, space, tabular, unscaledLabel } from '../src/design/tokens';
import { settlementOf, transferKey, useNight } from '../src/lib/nightStore';

/**
 * The night, settled — `1a · Settled night`, from `design/handoff-game-end/`,
 * cut 6 September, which supersedes the 5 September `R1 · Results` cut on this
 * screen.
 *
 * ONE screen for two situations, and that has not changed: the night you have
 * just closed, and a night you open from a list three weeks later. They are the
 * same facts, so they are the same screen. It is a PUSH and stays one.
 *
 * WHAT THE NEW CUT CHANGES is the shape of the body. R1 stacked three blocks —
 * the table's result, the deductions, then the finals — and a person reading
 * their own night had to hold a figure from the first block against a figure in
 * the third. This draws ONE ranked list with a toggle over it, so the two
 * figures are the same list twice and the ranking itself says what the
 * deductions did: whoever paid for the food moves up, whoever won and paid
 * their share moves down.
 *
 * THE LIST RE-SORTS ON EVERY MODE CHANGE, and that is the cut's rule rather
 * than a convenience. A list that kept one order would be printing one mode's
 * ranking under the other mode's numbers. `settledRows` does the sort, so the
 * two orders cannot come from two implementations.
 *
 * THE SPEND LINE IS WHAT REPLACED `/ledger`. Format `7e` — the four-column
 * table `name game food piggy net` — is dropped by this cut in as many words:
 * *"do not build it, do not link to it"*. The same terms read under the name
 * here, and they read BETTER than the columns did on the one row that mattered:
 * a person who owes a share of the bill and paid for it at the counter gets
 * both terms — `bill 50 +100 back` — where the column had to net them into one
 * signed figure and lose the fact that any money changed hands at all.
 *
 * ⚠ THE PILL IS NOT A VERDICT ON THE RESULT. This screen used to argue, at
 * length, that a confirmed result carries no status pill of its own, and it was
 * right about that: nothing about a closed night's arithmetic is provisional.
 * What the pill states is how much cash is still to hand over, which is the one
 * fact about a settled night that keeps changing over the week after it — and
 * it is the same figure `/payments` heads itself with, by construction. So both
 * survive: the meta line still ends with the night's state, and the pill says
 * what is left to move.
 *
 * THE CORNER STAYS EMPTY. `09-navigation.md` is unchanged and the cut draws no
 * control there either.
 */
export default function NightResults() {
  const night = useNight();
  /*
   * FINAL BY DEFAULT — the cut's own state note, *"default `final` when the
   * night is settled"*, and this screen only ever draws a settled one. Where a
   * person lands is where the money actually left them.
   */
  const [mode, setMode] = useState<SettledMode>('final');

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settlementOf(night);
    } catch {
      return null;
    }
  }, [night]);

  const rows = useMemo(
    () => (result === null ? [] : settledRows(result, mode)),
    [result, mode],
  );

  /*
   * THE PILL'S FIGURE, AND `/payments`'s, ARE ONE CALL. `paymentProgress` splits
   * the engine's transfers by the app's own record of what has been handed over;
   * `owed` is the sum of the unpaid ones. Working it out here as well as there
   * is exactly the second implementation the cut forbids.
   */
  const progress = useMemo(() => {
    if (result === null || night === null) return null;
    return paymentProgress(result, (from, to) =>
      night.paidAt.get(transferKey(from, to)) !== undefined,
    );
  }, [result, night]);

  if (night === null) {
    return (
      <Screen title="The night" backTo="the club" headScroll="all">
        {null}
      </Screen>
    );
  }

  if (result === null || progress === null) {
    return (
      <Screen
        title="Not settled"
        backTo="the club"
        headScroll="all"
        lede="This night was never closed. Count everyone up and settle it to see the record."
        footer={
          <Button label="Open the night" variant="primary" onPress={() => router.replace('/session')} />
        }
      >
        {null}
      </Screen>
    );
  }

  const totals = resultTotals(result);
  const final = mode === 'final';

  return (
    <Screen
      title={nightDate(night.startedAt)}
      meta={metaLine(night, rows.length)}
      backTo="the club"
      /*
       * THE HEAD GOES DOWN WITH THE BODY — `headScroll="all"`, the same one
       * `/players` is on, and for the same reason it was built.
       *
       * This screen is a ranked list and the ranking is the content. The head
       * is 97 points of it — a 32-point date, the meta line under it, and the
       * back button — pinned over a list that at eight players wants every
       * point there is. Nothing in those 97 changes while you read: the date is
       * the one thing you already knew when you opened the night, and back is
       * one flick away rather than gone.
       *
       * IT DOES NOT MAKE MORE FIT AT REST, and that is worth being straight
       * about: at the top of the screen the layout is exactly what it was. What
       * it buys is that ONE FLICK now clears the chrome instead of scrolling
       * the list under it, so the standings, the rounding row and the note can
       * all be on the phone at once — which is what a person reading their own
       * night is trying to do. The 8 September pass got eight players onto the
       * screen with the head still on it; this is the room for a ninth, a tenth,
       * and for a phone whose owner has turned the type up.
       *
       * The footer stays pinned. `Who pays whom` is the one thing on here you
       * act on, and a primary action that scrolls away is a primary action you
       * have to go looking for.
       *
       * Registered in `ui-audit.mjs`'s `HEAD_SCROLLS`, which is a two-way
       * check: a route on that map has to actually scroll its head, and a route
       * off it may not. Doc 15 § 5 check 1 is the rule this is the documented
       * exception to.
       */
      headScroll="all"
      /* R1's footer, and the cut keeps it: one button, full width, and the one
         place this screen leads to. */
      footer={
        <Button label="Who pays whom" variant="primary" onPress={() => router.push('/payments')} />
      }
    >
      <DidNotCheckOut verdict={night.verification} />

      <TotalsCard
        eyebrow="Money in play"
        amount={totals.boughtIn}
        owed={progress.value.owed}
        anyPaid={progress.count.settled > 0}
      />

      <Deductions result={result} />

      <View style={styles.tabs}>
        <ScoreTabs mode={mode} onPick={setMode} />
      </View>

      <List rows={rows} final={final} totals={totals} />

      {/*
       * THE STEP IS SHOWN AND NOT SETTABLE. It is locked once the night is
       * closed — every figure above was derived at it, and a record that could
       * be re-rounded afterwards is a record that does not say what anybody
       * paid. No `onPress`, so `RoundingBar` draws no chevron.
       *
       * FINAL ONLY. At the table is `out − in`, which the step does not reach.
       */}
      {final && <RoundingBar mode={night.roundingMode} style={styles.rounding} />}

      <Note final={final} offTable={result.totalOffTable} />
    </Screen>
  );
}

/**
 * The night failed its own arithmetic check.
 *
 * ABOVE EVERYTHING, IN RED, AND IT DOES NOT BLOCK ANYTHING —
 * `docs/verification.md`, *What happens when a night fails*, which is where
 * both the behaviour and this exact sentence come from. The room is standing up
 * to leave; refusing to draw the night would leave the host with no result at
 * all and nowhere to put the evening. So the figures are shown, and they are
 * shown with the thing that says not to act on them.
 *
 * A wrong number that announces itself is recoverable. A wrong number that
 * looks right is not, and that is the whole of the reasoning.
 *
 * `verifyNight()` re-derives every identity from the raw ledger rather than
 * asking the engine whether the engine was right, so a verdict here is not "the
 * figures look odd" — it is an identity that cannot be false about a correct
 * night. Absent on a night closed before the check was wired up (B54), which is
 * why this draws nothing rather than reassuring anybody about a night it knows
 * nothing about.
 */
function DidNotCheckOut({ verdict }: { verdict?: StoredVerification }) {
  const t = useTheme();
  if (verdict === undefined || verdict.ok) return null;

  return (
    <View style={[styles.alert, { backgroundColor: t.dangerWash, borderColor: t.dangerEdge }]}>
      <Text style={[styles.alertLabel, { color: t.danger }]} {...unscaledLabel}>
        Did not check out
      </Text>
      <Text style={[styles.alertBody, { color: t.text }]}>
        These figures did not check out — do not settle up from this screen.
      </Text>
      {/* The codes, not the prose: they are what a bug report is filed on, and
          `Finding.code` is stable and greppable for exactly that. The full
          detail is stored with the night and read by `npm run audit`. */}
      <Text style={[styles.alertCodes, { color: t.muted }]} numberOfLines={2}>
        {verdict.codes.join(' · ')}
      </Text>
    </View>
  );
}

/**
 * The deductions, as a plain ledger.
 *
 * DELIBERATELY NOT CARDS — the cut says so and says why: the ranked list has to
 * stay the heaviest thing on the screen. A row is a name, who is holding it,
 * and the amount, over a hairline.
 */
function Deductions({ result }: { result: ReturnType<typeof settle> }) {
  const t = useTheme();
  const taken = result.deductions.filter((d) => d.total !== 0);
  if (taken.length === 0) return null;

  const total = money(taken.reduce((running, d) => running + d.total, 0));

  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <Text style={[styles.eyebrow, { color: t.muted }]} {...unscaledLabel}>
          Deductions
        </Text>
        <Text style={[styles.blockTotal, tabular, { color: t.muted }]}>
          {`${formatMoney(total)} total`}
        </Text>
      </View>

      {taken.map((d) => (
        <View key={d.ruleId} style={[styles.deduction, { borderTopColor: t.hairline }]}>
          <Text style={[styles.deductionName, { color: t.offTable }]} numberOfLines={1}>
            {d.name}
          </Text>
          <Text style={[styles.deductionNote, { color: t.muted }]} numberOfLines={1}>
            {payerNote(result, d)}
          </Text>
          <Text style={[styles.deductionAmount, tabular, { color: t.text }]}>
            {formatMoney(d.total)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * "Goga paid", "Goga and Lena paid", or "held by the group".
 *
 * A BILL NAMES THE PEOPLE, because somebody is owed for it and this row is
 * where that is said. Every other kind names nobody: the take goes to a
 * collector who is holding it on the room's behalf, and naming them here would
 * read as though they had taken it.
 *
 * ⚠ TWO PEOPLE FRONT ONE BILL MORE OFTEN THAN THE CUT ALLOWS FOR. Its worked
 * night has Goga paying the kitchen and that is the whole of it, so the row is
 * drawn as one name. The seeded night has two — the pizza and the drinks are
 * one bill rule and two fronters — and this app has always let several people
 * cover one thing, which is what `spendGroup` is for. Naming the first of them
 * would be naming the wrong person to whoever paid the other half, so both are
 * named, and past two the row counts rather than growing: the amounts are on
 * everybody's own spend line below either way.
 */
function payerNote(
  result: ReturnType<typeof settle>,
  deduction: ReturnType<typeof settle>['deductions'][number],
): string {
  if (deduction.destination !== 'bill') return 'held by the group';

  const names = deduction.credits
    .filter((c) => c.amount !== 0)
    .map((c) => result.players.find((p) => p.playerId === c.playerId)?.name)
    .filter((n): n is string => n !== undefined);

  if (names.length === 0) return 'nobody fronted it';
  if (names.length === 1) return `${names[0]} paid`;
  if (names.length === 2) return `${names[0]} and ${names[1]} paid`;
  return `${names[0]} and ${names.length - 1} others paid`;
}

/**
 * THE RANKED LIST, IN WHICHEVER MODE THE TABS ARE ON.
 *
 * EVERY ROW IS `ScoreRow`, which is the app's ONE drawing of a finished night —
 * `design_handoff_score_breakdown/`, turn 6, cut 8 September. This screen used
 * to draw its own: a line of words under the name, `in 1,500 out 2,000 bill 50
 * +100 back piggy 50`, which said everything and took the whole row to say it.
 * The glyph row says the same five terms in a quarter of the width and signs
 * every one of them, so the line reads as the arithmetic behind the figure
 * beside it rather than as a column of magnitudes.
 *
 * `grouped` IS THE LAYOUT HERE AND NOT `rolled`. This screen is one screen for
 * two situations — the night you just closed and a night you open three weeks
 * later — and the handoff draws the dense row for the first of them because the
 * room reads it together. A rolled-up row would put every deduction behind a
 * tap on the one screen where nobody taps, and the whole reason `/ledger` was
 * dropped is that a figure behind a button is a figure nobody checks.
 *
 * THE TRAY GOES TO `/deductions` — the handoff's own interaction, and what
 * gives the row somewhere to send a person who wants to know WHO fronted the
 * bill, which is the one thing a figure on the row cannot say.
 */
function List({
  rows,
  final,
  totals,
}: {
  rows: SettledRow[];
  final: boolean;
  totals: ReturnType<typeof resultTotals>;
}) {
  const t = useTheme();

  return (
    <View style={styles.list}>
      <View style={styles.listHead}>
        <Text style={[styles.eyebrow, { color: t.muted }]} {...unscaledLabel}>
          {final ? 'Final' : 'At the table'}
        </Text>
        <Text style={[styles.listNote, { color: t.muted }]} numberOfLines={1}>
          {final ? 'after deductions and compensations' : 'before deductions'}
        </Text>
      </View>

      {rows.map((row) => (
        <ScoreRow
          key={row.player.playerId}
          row={row}
          layout="grouped"
          /* The night pass sums these and holds them to zero at the table —
             `Σ atTheTable = 0` is the game-end cut's first check, and a row
             dropped, drawn in the wrong sign or ranked off a figure it is not
             showing is exactly what that catches. Nothing else in the repo can
             see it: no URL reaches a settled night with money on it. */
          testID="settled-row"
          onSpends={() => router.push('/deductions')}
        />
      ))}

      {/*
       * AND THE CHECK PLAYERS RUN BEFORE THEY ACCEPT THE FINAL — `6b`, and it
       * belongs to At table alone. Money is neither made nor destroyed at a
       * poker table, so that column comes to nothing; Final's does not, and a
       * `$0` under it would be a claim about a column that is short by whatever
       * left the players for good. The Final block states that instead, on the
       * row `/payments` heads itself with.
       */}
      {!final && (
        <ReconciliationRow
          boughtIn={totals.boughtIn}
          cashedOut={totals.cashedOut}
          game={totals.game}
        />
      )}
    </View>
  );
}

/**
 * The one thing about the list that the list cannot say about itself, and it is
 * a different thing in each tab.
 *
 * ON FINAL it is the promise the bone tray rests on: a person who sees `−$54`
 * against their name and `−$54` against the name of whoever bought the pizza
 * needs to know the second one is coming back.
 *
 * ON AT TABLE it is the handoff's own sentence — *"the poker result only"* —
 * with what the evening took stated rather than merely absent, because a reader
 * comparing the two tabs is looking for exactly that difference.
 */
function Note({ final, offTable }: { final: boolean; offTable: Money }) {
  const t = useTheme();
  return (
    <View style={styles.note}>
      <Icon name="info" color={t.muted} size={14} />
      <Text style={[styles.noteText, { color: t.muted }]}>
        {final
          ? 'Whoever paid a bill gets it back in full below.'
          : `The poker result only. Deductions total ${formatMoney(offTable)} and are applied in the Final tab.`}
      </Text>
    </View>
  );
}

/**
 * "20:05 → 06:38 · 10h 46m · 7 players · settled".
 *
 * BOTH WALL-CLOCK TIMES, 24-hour, and then the duration. A night that crosses
 * midnight ends at a smaller number than it started at, which reads as wrong
 * until the duration resolves it.
 *
 * The local night's `endedAt` is set the moment counting starts. Where it is
 * missing — a night imported, or one closed before the field existed — the last
 * entry's own timestamp IS the moment the last chip moved.
 *
 * THE PLAYER COUNT IS THE COUNT OF ROWS THE LIST DRAWS, passed in rather than
 * recomputed: a header saying eight players over a list of seven would be the
 * header disagreeing with the block under it.
 */
function metaLine(night: NonNullable<ReturnType<typeof useNight>>, players: number): string {
  const stamps = Object.values(night.occurredAt);
  const last = stamps.length === 0 ? null : stamps.reduce((a, b) => (a > b ? a : b));
  const ended = night.endedAt ?? last;

  return (
    `${clock(night.startedAt)} → ${ended === null ? '—' : clock(ended)} · ` +
    `${elapsed(night.startedAt, ended)} · ${players} ${players === 1 ? 'player' : 'players'}` +
    ` · ${night.status === 'settled' ? 'settled' : 'not closed yet'}`
  );
}

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

function elapsed(startedAt: string, endedAt: string | null): string {
  const end = endedAt === null ? Date.now() : new Date(endedAt).getTime();
  const mins = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

/* "Sat 29 Aug". SHORT, so the title holds one line at full width. */
const nightDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/*
 * The net at 19/700, with the name and the spend line taking the rest of the
 * row. The same threshold `NightResult`'s rows use, and for the same reason:
 * everything under seven figures is drawn in full, and a night past that gets
 * a compact figure rather than a clipped one.
 */
const ROW_FITS = 1_000_000;

const styles = StyleSheet.create({
  /*
   * THE FAILED-CHECK BLOCK, measured off E5's *Out of balance* alert rather
   * than drawn again: the two say the same kind of thing — this night does not
   * add up, here is what is wrong — and two shapes for one meaning is how a
   * reader stops recognising either.
   */
  alert: {
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.pressable,
    borderWidth: 1,
    gap: 6,
  },
  alertLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  alertBody: { fontSize: 13.5, fontWeight: '400', lineHeight: 20.25 },
  alertCodes: { fontSize: 11.5, fontWeight: '400', lineHeight: 16 },

  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

  /*
   * THE VERTICAL PASS OF 8 SEPTEMBER, and every reduced number below belongs to
   * it. The cut's own paddings are drawn against its worked night, which is six
   * players; the club this app is actually used by plays eight, and at eight the
   * list ran off the bottom of the phone with three names below the fold and the
   * rounding row and the note under those. A ranked list you have to scroll to
   * finish reading is not a scoreboard — the ranking is the content, and it is
   * only legible all at once.
   *
   * So the blocks above the list each give back a few points and the row gives
   * back the most: `docs/screens.md` carries the arithmetic and the board values
   * each of these came from. Nothing here changes what is on the screen, only
   * how much air is around it — no term, row, rule or figure was dropped to make
   * the room.
   */
  block: { marginHorizontal: space.page, marginTop: 8 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 3 },
  blockTotal: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '500' },
  deduction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deductionName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  deductionNote: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  deductionAmount: { marginLeft: 'auto', fontSize: 15, fontWeight: '700' },

  tabs: { marginHorizontal: space.page, marginTop: 8 },
  list: { marginHorizontal: space.page, marginTop: 8 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 3 },
  listNote: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '500', flexShrink: 1 },
  /*
   * THE ROW IS `ScoreBreakdown`'S NOW, and so is everything that used to be
   * measured here — the name, the wrapping spend line, the net and the fix for
   * B59 that made the line wrap only when it had to. One row drawn in one file
   * is the point of the 8 September cut; a copy of its geometry left behind
   * here is the copy that goes stale.
   */

  rounding: { marginTop: 4 },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginHorizontal: space.page,
    paddingTop: 8,
  },
  noteText: { flex: 1, fontSize: 13, fontWeight: '400', lineHeight: 18 },
});
