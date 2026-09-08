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
  type StoredVerification,
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
import { cappedFigure, radius, space, tabular, unscaledLabel } from '../src/design/tokens';
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
          /* The night pass sums these and holds them to zero at the table —
             `Σ atTheTable = 0` is the cut's own first check, and a row dropped,
             drawn in the wrong sign or ranked off a figure it is not showing is
             exactly what that catches. Nothing else in the repo can see it: no
             URL reaches a settled night with money on it. */
          testID="settled-row"
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
            testID="settled-net"
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
 * 50`.
 *
 * `piggy`, NOT `piggy bank`, AND THAT IS A DELIBERATE DEPARTURE from the cut,
 * which writes the term out in full. Six characters of the longest term, on
 * every row that was charged the tin, is what decides whether the line wraps —
 * and a wrapped line is 17 points of row height on a screen whose whole problem
 * is that an eight-handed night runs off the bottom of the phone. The word is
 * not carrying anything either: `bill` and `piggy` are the only two terms of
 * their kind, the block above states `Group piggy bank` in full, and nothing
 * else on the row could be mistaken for it. Asked for by the owner on
 * 8 September; recorded in `docs/screens.md`.
 *
 * IT WRAPS RATHER THAN TRUNCATING. Five terms do not fit one line at 360 points
 * and the whole point of the line is that every term is on it; a row that
 * dropped the last one would be the four-column table's failure in a different
 * shape. Each term is `nowrap` so a break never lands between a word and its
 * figure.
 *
 * IT WRAPS WHEN IT MUST, AND NOT BEFORE. Two terms fit any row, and At the table
 * has only two — `in 1,500 out 2,000` is 133 points inside a row that has 270
 * left beside the net. What put them on two lines anyway was the box they wrap
 * in being measured off them rather than off the row; see `rowText` in the
 * stylesheet, which is where B59 was fixed and where it would come back.
 *
 * THE BILL'S TWO TERMS ARE ONE SPAN. `+100 back` is appended inside the bill
 * term, because it is a fact about the bill and a line break between them would
 * read as a fifth deduction.
 *
 * SHARES ARE BARE NUMBERS. The cut is explicit — `bill 50`, `piggy 50` —
 * and the currency mark appears on the net, the totals and the transfers. Five
 * lari signs on one line under a sixth is noise, and the line is not a column
 * anybody adds up by eye.
 */
function Spend({ terms }: { terms: readonly SettledTerm[] }) {
  const t = useTheme();
  /* The line's own green and red, one step back from the net's — see `quieted`. */
  const win = quieted(t.win, t.muted);
  const loss = quieted(t.loss, t.muted);

  const bill = terms.find((x) => x.kind === 'bill');
  const back = terms.find((x) => x.kind === 'back');
  const piggy = terms.find((x) => x.kind === 'piggy');
  const rounded = terms.find((x) => x.kind === 'rounded');
  const inFor = terms.find((x) => x.kind === 'in');
  const out = terms.find((x) => x.kind === 'out');

  return (
    <View style={styles.spend}>
      {inFor !== undefined && (
        <Text style={[styles.term, tabular, { color: loss }]} numberOfLines={1}>
          {`in ${formatUnmarked(inFor.amount)}`}
        </Text>
      )}
      {out !== undefined && (
        <Text style={[styles.term, tabular, { color: win }]} numberOfLines={1}>
          {`out ${formatUnmarked(out.amount)}`}
        </Text>
      )}
      {bill !== undefined && (
        <Text style={[styles.term, tabular, { color: t.dim }]} numberOfLines={1}>
          {`bill ${formatUnmarked(bill.amount)}`}
          {back !== undefined && (
            <Text style={{ color: win }}>{` +${formatUnmarked(back.amount)} back`}</Text>
          )}
        </Text>
      )}
      {piggy !== undefined && (
        <Text style={[styles.term, tabular, { color: t.dim }]} numberOfLines={1}>
          {`piggy ${formatUnmarked(piggy.amount)}`}
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

/**
 * A signed colour, taken one step back from the figure it sits under.
 *
 * THE ROW HAS TWO GREENS AND TWO REDS ON IT and only one of them is the answer.
 * `out 2,000` under a name and `+₾500` beside it were the same green at the same
 * saturation, so the caption read as a second result rather than as the working
 * behind the first — the same argument the screen already makes for the net
 * being 19/700 while a term is 13/500, made in colour as well as in weight.
 *
 * FADED TOWARDS `muted`, NOT TOWARDS THE GROUND, and that is the whole of the
 * mechanism. Opacity is the obvious way to say "a bit fainter" and it fails the
 * contrast floor immediately: `win` on white is 5.43:1 to begin with, so the
 * bright theme drops under 4.5 at any fade at all, and `ui-audit.mjs`'s rule 9
 * mixes an element's opacity into its colour before reading it for exactly that
 * reason. Blending toward the text tone the rest of the caption is already drawn
 * in takes the SATURATION out and leaves the luminance alone: nothing here reads
 * below 6:1 in either theme, and the colour still says which way the money went.
 *
 * Derived from the two tokens rather than written down as a third: `tokens.ts`
 * is app-wide and belongs to a session running alone (`CLAUDE.md`), and a hex
 * pair copied out of it is the copy that goes stale the day the palette moves.
 */
const QUIET = 0.65;

function quieted(colour: string, towards: string): string {
  const ink = channels(colour);
  const back = channels(towards);
  if (ink === null || back === null) return colour;
  return (
    '#' +
    ink
      .map((v, i) => Math.round(v * QUIET + back[i]! * (1 - QUIET)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** `#6FCF97` → `[111, 207, 151]`, and null for anything else — a token carrying
    an `rgba()` is not a colour this can take a step out of. */
const channels = (hex: string): number[] | null =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    : null;

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

  /* 3 of padding inside the well, 4 between the halves — the cut's own. */
  track: {
    marginHorizontal: space.page,
    marginTop: 8,
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 12,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 9 },
  segmentLabel: { fontSize: 13.5, fontWeight: '700' },

  list: { marginHorizontal: space.page, marginTop: 8 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 3 },
  listNote: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '500', flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  /*
   * IT TAKES THE ROW, IT IS NOT MEASURED BY ITS OWN CONTENT — and that one word
   * is what stopped `out 2,000` dropping to a line of its own with 130 points of
   * empty row beside it (B59).
   *
   * Without `flexGrow` this block is sized to its widest line, so the wrapping
   * spend line ends up in a box that is EXACTLY as wide as the terms on it. An
   * exact fit is not a fit: the width is measured unconstrained, rounded to the
   * device's pixel grid, and then the line is laid out again inside the rounded
   * figure — and a third of a point of rounding is all it takes for the last
   * term to no longer fit the box its own measurement produced. That is why it
   * wrapped on some rows and not others at the same width, and why nothing on
   * the web build could see it: react-native-web sizes the same box off CSS
   * max-content and never rounds it down.
   *
   * Growing it makes the question a real one — the line wraps when it needs more
   * room than the row has left beside the net, and not otherwise. Nothing moves:
   * the net is `marginLeft: 'auto'` against a row with no free space left in it,
   * which is the right-hand edge it already sat on.
   */
  rowText: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 1 },
  /*
   * LINE HEIGHTS WRITTEN DOWN, and that is half of what the row gave back. A
   * `Text` with no `lineHeight` gets the platform's default leading — about
   * 1.36 of the size on Android, more on some faces — so a 17-point name was
   * costing 23 points and nothing in the file said so. Stated here, the row's
   * height is arithmetic anybody can check against the screenshot.
   */
  name: { fontSize: 16, fontWeight: '700', letterSpacing: -0.17, lineHeight: 19 },
  spend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 9, rowGap: 1 },
  term: { fontSize: 12.5, fontWeight: '500', lineHeight: 15 },
  net: { marginLeft: 'auto', fontSize: 18.5, fontWeight: '700', flexShrink: 0 },

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
