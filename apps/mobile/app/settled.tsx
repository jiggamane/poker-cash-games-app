import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  money,
  paymentProgress,
  resultTotals,
  settle,
  settledRows,
  type SettledMode,
  type SettledRow,
  type SettledTerm,
} from '@poker-club/core';
import {
  formatMoney,
  formatSignedToFit,
  formatSignedUnmarked,
  formatUnmarked,
} from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { RoundingBar } from '../src/components/RoundingBar';
import { Screen } from '../src/components/Screen';
import { TotalsCard } from '../src/components/TotalsCard';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, space, tabular, unscaledLabel } from '../src/design/tokens';
import { settlementInput, transferKey, useNight } from '../src/lib/nightStore';

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
      return settle(settlementInput(night));
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
      <Screen title="The night" backTo="the club">
        {null}
      </Screen>
    );
  }

  if (result === null || progress === null) {
    return (
      <Screen
        title="Not settled"
        backTo="the club"
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
      /* R1's footer, and the cut keeps it: one button, full width, and the one
         place this screen leads to. */
      footer={
        <Button label="Who pays whom" variant="primary" onPress={() => router.push('/payments')} />
      }
    >
      <TotalsCard
        eyebrow="Money in play"
        amount={totals.boughtIn}
        owed={progress.value.owed}
        anyPaid={progress.count.settled > 0}
      />

      <Deductions result={result} />

      <Toggle mode={mode} onPick={setMode} />

      <List rows={rows} final={final} />

      {/*
       * THE STEP IS SHOWN AND NOT SETTABLE. It is locked once the night is
       * closed — every figure above was derived at it, and a record that could
       * be re-rounded afterwards is a record that does not say what anybody
       * paid. No `onPress`, so `RoundingBar` draws no chevron.
       *
       * FINAL ONLY. At the table is `out − in`, which the step does not reach.
       */}
      {final && <RoundingBar mode={night.roundingMode} style={styles.rounding} />}

      <Note />
    </Screen>
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
 * At the table / Final.
 *
 * A SEGMENTED CONTROL AND NOT TWO TABS: the two are the same rows twice, not
 * two places you can be, so nothing about this navigates. The selected half is
 * a filled thumb inside a well, which is the app's existing switch and the
 * cut's own construction at the same time.
 */
function Toggle({ mode, onPick }: { mode: SettledMode; onPick: (m: SettledMode) => void }) {
  const t = useTheme();
  const options: Array<{ value: SettledMode; label: string }> = [
    { value: 'table', label: 'At the table' },
    { value: 'final', label: 'Final' },
  ];

  return (
    <View style={[styles.track, { backgroundColor: t.drawerFill }]}>
      {options.map((o) => {
        const on = o.value === mode;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(o.value)}
            style={[styles.segment, on && { backgroundColor: t.text }]}
          >
            <Text style={[styles.segmentLabel, { color: on ? t.onFill : t.muted }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function List({ rows, final }: { rows: SettledRow[]; final: boolean }) {
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
        <View
          key={row.player.playerId}
          style={[styles.row, { borderTopColor: t.hairline }]}
        >
          <View style={styles.rowText}>
            <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
              {row.player.name}
            </Text>
            <Spend terms={row.terms} />
          </View>

          {/*
           * `+` and `−`, never a hyphen, and an unsigned zero. `formatSignedToFit`
           * is the app's own — it is where the minus sign is U+2212 — and it
           * drops to the compact form rather than truncating.
           */}
          <Text
            style={[styles.net, tabular, { color: moneyColor(t, row.net) }]}
            numberOfLines={1}
            {...cappedFigure}
          >
            {row.net === 0 ? formatMoney(row.net) : formatSignedToFit(row.net, ROW_FITS)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The line of terms under a name — `in 1,500 out 2,000 bill 50 +100 back piggy
 * bank 50`.
 *
 * IT WRAPS RATHER THAN TRUNCATING. Five terms do not fit one line at 360 points
 * and the whole point of the line is that every term is on it; a row that
 * dropped the last one would be the four-column table's failure in a different
 * shape. Each term is `nowrap` so a break never lands between a word and its
 * figure.
 *
 * THE BILL'S TWO TERMS ARE ONE SPAN. `+100 back` is appended inside the bill
 * term, because it is a fact about the bill and a line break between them would
 * read as a fifth deduction.
 *
 * SHARES ARE BARE NUMBERS. The cut is explicit — `bill 50`, `piggy bank 50` —
 * and the currency mark appears on the net, the totals and the transfers. Five
 * lari signs on one line under a sixth is noise, and the line is not a column
 * anybody adds up by eye.
 */
function Spend({ terms }: { terms: readonly SettledTerm[] }) {
  const t = useTheme();

  const bill = terms.find((x) => x.kind === 'bill');
  const back = terms.find((x) => x.kind === 'back');
  const piggy = terms.find((x) => x.kind === 'piggy');
  const rounded = terms.find((x) => x.kind === 'rounded');
  const inFor = terms.find((x) => x.kind === 'in');
  const out = terms.find((x) => x.kind === 'out');

  return (
    <View style={styles.spend}>
      {inFor !== undefined && (
        <Text style={[styles.term, tabular, { color: t.loss }]} numberOfLines={1}>
          {`in ${formatUnmarked(inFor.amount)}`}
        </Text>
      )}
      {out !== undefined && (
        <Text style={[styles.term, tabular, { color: t.win }]} numberOfLines={1}>
          {`out ${formatUnmarked(out.amount)}`}
        </Text>
      )}
      {bill !== undefined && (
        <Text style={[styles.term, tabular, { color: t.dim }]} numberOfLines={1}>
          {`bill ${formatUnmarked(bill.amount)}`}
          {back !== undefined && (
            <Text style={{ color: t.win }}>{` +${formatUnmarked(back.amount)} back`}</Text>
          )}
        </Text>
      )}
      {piggy !== undefined && (
        <Text style={[styles.term, tabular, { color: t.dim }]} numberOfLines={1}>
          {`piggy bank ${formatUnmarked(piggy.amount)}`}
        </Text>
      )}
      {/*
       * THE STEP, WHERE THERE IS ONE. `/ledger` had a fifth column for it and
       * `/ledger` is gone; without it the four terms sit beside a net they do
       * not come to. Drawn only on a night that rounded, which is the only
       * night it is not zero on.
       */}
      {rounded !== undefined && (
        <Text style={[styles.term, tabular, { color: t.dim }]} numberOfLines={1}>
          {`rounded ${formatSignedUnmarked(rounded.amount)}`}
        </Text>
      )}
    </View>
  );
}

/** The one thing about the list that the list cannot say about itself. */
function Note() {
  const t = useTheme();
  return (
    <View style={styles.note}>
      <Icon name="info" color={t.muted} size={14} />
      <Text style={[styles.noteText, { color: t.muted }]}>
        Whoever paid a bill gets it back in full below.
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
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

  block: { marginHorizontal: space.page, marginTop: 14 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  blockTotal: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '500' },
  deduction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deductionName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  deductionNote: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  deductionAmount: { marginLeft: 'auto', fontSize: 15, fontWeight: '700' },

  /* 3 of padding inside the well, 4 between the halves — the cut's own. */
  track: {
    marginHorizontal: space.page,
    marginTop: 14,
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 12,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentLabel: { fontSize: 13.5, fontWeight: '700' },

  list: { marginHorizontal: space.page, marginTop: 14 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  listNote: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '500', flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flexShrink: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.17 },
  spend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 9, rowGap: 2 },
  term: { fontSize: 13, fontWeight: '500' },
  net: { marginLeft: 'auto', fontSize: 19, fontWeight: '700', flexShrink: 0 },

  rounding: { marginTop: 4 },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginHorizontal: space.page,
    paddingTop: 11,
  },
  noteText: { flex: 1, fontSize: 13, fontWeight: '400', lineHeight: 19.5 },
});
