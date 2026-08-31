import { useMemo, useState, type ReactNode } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  formatMoney,
  formatSignedToFit,
  formatToFit,
  nightScore,
  resolveLedger,
  settle,
  workingRows,
  type EffectiveEntry,
  type Money,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { HoldButton } from '../src/components/HoldButton';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, unscaledLabel, radius, space, type } from '../src/design/tokens';
import {
  lastRebuyAmount,
  rebuy as writeRebuy,
  settlementInput,
  standingOf,
  useNight,
} from '../src/lib/nightStore';
import { usePending } from '../src/lib/pending';
import { Pill } from '../src/components/Pill';

/**
 * The player card — T2 at the table, T4 cashed out. 08-tonight-home.md.
 *
 * This is where the night's history lives now: there is no feed anywhere in
 * the app, so every entry with its timestamp hangs off the person it happened
 * to. Oldest first, because you read a person's night forwards.
 *
 * COUNTED IS AN EM DASH until their chips are counted, and that is the point of
 * the screen. While a game runs nobody's result exists — only what they have
 * put in — and a page showing a running "net" would be inventing a number out
 * of chips nobody has looked at.
 *
 * The two secondaries are NOT red. Cashing out is a normal, expected act; only
 * ending the night is destructive, and that lives behind a hold in the dock.
 *
 * N12 — CORRECTED AND VOIDED ROWS. The ledger is append-only and the list says
 * so: a corrected entry keeps its place, struck through and at the amount it
 * was written at, and the correction is its own row underneath naming what it
 * replaces. Nothing is edited and nothing disappears, because five people are
 * relying on this record and a figure that can silently change is not a record.
 * The totals in the card above come from the engine, which counts the
 * correction only.
 *
 * N11 — QUEUED. A row still in the outbox is marked. It is written down and it
 * is already in the figures; what has not happened is the rest of the table
 * seeing it.
 */
export default function PlayerCard() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  /*
   * THE SETTLEMENT, AND ONLY ONCE THE BOOK IS CLOSED.
   *
   * A night still being played has no answer to what the rules took — the bill
   * is not in, nobody is counted, and `settle()` refuses a count that does not
   * balance, which is the close gate doing its job. So this is null all evening
   * and the card is exactly what it has always been; it fills in at the moment
   * the night is settled, which is also the moment this card became reachable
   * from E6.
   *
   * The same `settlementInput` every other screen settles from, so the figures
   * here cannot disagree with the row that was tapped to get here.
   */
  const nightSettlement = useMemo(() => {
    if (night === null || night.status !== 'settled') return null;
    try {
      return settle(settlementInput(night));
    } catch {
      return null;
    }
  }, [night]);
  const pending = usePending(night?.sessionId);
  /* Only against a double write while one is in flight. Two deliberate holds
     are two deliberate rebuys, and the ledger should have both. */
  const [writing, setWriting] = useState(false);

  if (night === null || ledger === null) {
    return <Sheet title="Player">{null}</Sheet>;
  }

  const player = night.players.find((p) => p.id === id);
  if (player === undefined) {
    return (
      <Sheet title="Player">
        <Text style={[styles.note, { color: t.muted }]}>Nobody by that name tonight.</Text>
      </Sheet>
    );
  }

  const standing = standingOf(night, ledger, player.id);
  const inFor = (standing?.boughtIn ?? 0) as Money;
  const seated = standing?.atTable === true;

  const mine = ledger.entries.filter((e) => e.playerId === player.id);
  /*
   * WHAT THEY PUT ON THE TABLE FOR EVERYONE — the pizza, the beers, the taxi.
   *
   * A spend carries a PAYER, not a player, so none of it was on this card:
   * somebody who fronted the whole bar tab had a night's worth of entries with
   * their own money nowhere in it, and the only place it appeared was a total
   * on the deductions screen. It belongs here — it is a movement of their money
   * on this night, which is what this list is — and it is kept out of `mine`
   * above so that "since 20:40" still means when they sat down and a correction
   * still opens the last thing they were charged for.
   */
  const fronted = ledger.entries.filter((e) => e.type === 'expense' && e.payerId === player.id);
  const rows = entryRows(mine, fronted, night, pending.ids);
  const first = mine[0];
  const lastOut = [...mine].reverse().find((e) => e.type === 'cashout');

  /*
   * The rules, once they have run — one row per charge and per reimbursement,
   * in the order the night applied them, and the position they add up to.
   *
   * `workingRows` is the engine's, and its first three rows are In, Out and
   * Result, which the card above already carries at four times the size. What
   * is left is the part the card cannot show: what came off, what came back,
   * and where that leaves them.
   */
  const settlement = nightSettlement?.players.find((p) => p.playerId === player.id) ?? null;
  const allWorking =
    nightSettlement === null ? [] : workingRows(nightSettlement, night.rules, player.id);
  const working = allWorking.filter((r) => r.kind === 'charge' || r.kind === 'credit');

  /*
   * THE FLOAT IS BELOW THE LINE, not in it — B27, and the same split E6 makes
   * two screens away. Somebody who holds the piggy bank ends the night with the
   * room's $126 in their pocket, and the engine is right to put it in
   * `finalPosition`, because the transfers really do have to move it. It is
   * still not what their night came to, and a card that totals it into "Their
   * night" tells the one person at the table who cannot check it that they won
   * money they did not win.
   *
   * So the rows above the total are what happened to their own money, the
   * total is `nightScore`'s `score`, and what they are carrying home for
   * everybody else is its own line underneath. The two together are still
   * `finalPosition` exactly — `nightScore` divides that figure and never
   * restates it.
   */
  const holding = allWorking.filter((r) => r.kind === 'holding');
  /* Zero where there is no settlement, which is also the only case the block
     below is not drawn in — so the fallback is never the figure on screen. */
  const theirNight =
    nightSettlement === null ? (0 as Money) : nightScore(nightSettlement, player.id).score;

  /*
   * What they have taken off the table: their cash-outs, plus the count in
   * front of them if the host has already counted it. Nothing at all until one
   * of those exists.
   */
  const finalCount = night.finalCounts.get(player.id);
  const counted = seated
    ? finalCount === undefined
      ? undefined
      : ((finalCount + (standing?.cashedOut ?? 0)) as Money)
    : standing?.played === true
      ? ((standing.cashedOut ?? 0) as Money)
      : undefined;

  const result = counted === undefined ? undefined : ((counted - inFor) as Money);

  const rebuy = lastRebuyAmount(ledger, player.id);

  /*
   * THE QUICK REBUY COMMITS HERE, without an amount screen in the way.
   *
   * That is what the hold is paying for. The figure is already resolved — it
   * is this player's own last rebuy — so the screen the amount sheet would
   * have shown would only be asking the host to confirm a number they can
   * already read on the button. What it would NOT have done is tell them
   * afterwards that anything happened.
   *
   * Holding does both: the wipe is the confirmation going in, and the write
   * landing IS the confirmation coming out — the row appears in ENTRIES with
   * its timestamp, and IN FOR above it goes up by the same amount, both live
   * off the store. Nothing has to announce itself, because the screen the
   * host is already looking at is the receipt.
   */
  const playerId = player.id;

  async function quickRebuy() {
    if (writing) return;
    setWriting(true);
    try {
      await writeRebuy(playerId, rebuy);
    } finally {
      setWriting(false);
    }
  }

  return (
    <Sheet
      title={player.name}
      badge={
        standing?.played !== true
          ? 'on the roster'
          : seated
            ? /*
               * NOBODY IS SEATED AT A TABLE THAT CLOSED. The badge is the
               * state of the person and it was reading "seated" on a night
               * settled three weeks ago, because seated is what they were when
               * the game stopped. What happened to them is that their chips
               * were counted — the card's own middle figure — so that is what
               * it says once the night is settled.
               *
               * ⚠ NOT DRAWN. T2 and T4 draw a live night only; the word is the
               * card's own COUNTED, lower-cased to match the badges beside it.
               */
              nightSettlement !== null
              ? 'counted'
              : standing.returned
                ? 'back in'
                : 'seated'
            : standing.cashedOut === 0
              ? 'busted out'
              : 'cashed out'
      }
      sub={
        seated
          ? first === undefined
            ? undefined
            : `since ${clock(night.occurredAt[first.id])}`
          : lastOut === undefined
            ? undefined
            : `left ${clock(night.occurredAt[lastOut.id])}`
      }
      footer={
        /*
         * A CLOSED BOOK HAS NO CONTROLS ON IT.
         *
         * This card is reachable from E6 now, weeks after the night ended, and
         * the two buttons below it would offer are a rebuy into a game nobody
         * is playing and a correction to a settlement everybody has already
         * been paid on. `settle()` recomputes from the ledger every time it is
         * read, so a correction here would silently move a figure five people
         * agreed on. One way out, and it is the door.
         */
        nightSettlement !== null ? (
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        ) : seated ? (
          <>
            {/* The amount is M16's: their last rebuy tonight, then tonight's
                buy-in, then the group default. Where it came from is
                deliberately not printed anywhere — M17 — so the button can
                only show the figure, which is the whole reason it has to be
                held rather than tapped. Other amount is the way to a
                different one. */}
            <HoldButton
              label={`Rebuy ${formatMoney(rebuy)}`}
              sub="Hold 1s"
              onComplete={() => void quickRebuy()}
            />
            <View style={styles.pair}>
              <Button
                label="Other amount"
                variant="secondary"
                style={styles.half}
                onPress={() =>
                  router.push({ pathname: '/log', params: { player: player.id, kind: 'rebuy' } })
                }
              />
              <Button
                label="Cash out"
                variant="secondary"
                style={styles.half}
                onPress={() =>
                  router.push({ pathname: '/log', params: { player: player.id, kind: 'cashout' } })
                }
              />
            </View>
          </>
        ) : (
          <View style={styles.pair}>
            {/* No primary once they are out. Correcting opens the newest line,
                which is the one just written; every other line is one tap away
                in the list above. */}
            <Button
              label="Correct an entry"
              variant="secondary"
              style={styles.half}
              disabled={mine.length === 0}
              onPress={() =>
                router.push({ pathname: '/entry', params: { id: mine[mine.length - 1]!.id } })
              }
            />
            <Button
              label="Back to table"
              variant="secondary"
              style={styles.half}
              onPress={() => router.back()}
            />
          </View>
        )
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <StatPair label="In for" value={formatToFit(inFor, FITS)} tight={result !== undefined} />
        <StatPair
          label="Counted"
          value={counted === undefined ? '—' : formatToFit(counted, FITS)}
          muted={counted === undefined}
          tight={result !== undefined}
          align="middle"
        />
        {result !== undefined && (
          <StatPair
            label="Night"
            value={formatSignedToFit(result, FITS)}
            color={moneyColor(t, result)}
            tight
            align="end"
          />
        )}
        {result === undefined && (
          <Text style={[styles.cardNote, { color: t.muted }]}>
            Net is known once chips are counted
          </Text>
        )}
      </View>

      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Entries</Text>

        {rows.map((r, i) => (
          /* Read-only once the night is settled, for the reason the footer
             gives: every row here is a way into a correction, and the book is
             closed. The row itself is identical either way. */
          <PressableOrPlain
            key={r.key}
            press={
              nightSettlement === null
                ? () => router.push({ pathname: '/entry', params: { id: r.entryId } })
                : undefined
            }
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.time, { color: t.muted }]}>{clock(r.at)}</Text>
            <View style={styles.entryText}>
              <View style={styles.entryHead}>
                <Text
                  style={[
                    styles.entryType,
                    r.struck && styles.struck,
                    { color: r.struck ? t.muted : t.text },
                  ]}
                >
                  {r.title}
                </Text>
                {r.mark !== undefined && <Pill label={r.mark.label} tone={r.mark.tone} />}
              </View>
              <Text style={[styles.provenance, { color: t.muted }]} numberOfLines={1}>
                {r.sub}
              </Text>
            </View>
            <Text style={[styles.entryAmount, { color: r.struck ? t.muted : t.text }]}>
              {formatMoney(r.amount)}
            </Text>
          </PressableOrPlain>
        ))}

        {rows.length === 0 && (
          <Text style={[styles.note, { color: t.muted }]}>Nothing logged for them yet.</Text>
        )}

        {rows.some((r) => r.mark?.label === 'queued') && (
          <Text style={[styles.queuedNote, { color: t.muted }]}>
            A queued entry is written down and safe. It reaches the others when the phone gets a
            signal; nothing is lost and nothing is guessed.
          </Text>
        )}
      </View>

      {/*
       * WHAT THE RULES TOOK, AND WHERE THAT LEFT THEM — the working.
       *
       * The card at the top is the table's answer: chips in, chips out, and the
       * difference. This is the room's — the bill, the piggy bank, and what
       * came back to whoever fronted the food — and it is the half a player
       * actually argues about a week later. It is drawn only on a settled
       * night, because until the rules have run there is nothing here that is
       * not a guess.
       *
       * X1c's rows, in X1c's order (`working.ts`), on the sheet that survived
       * it. Nothing on this screen adds anything up: the rows are the engine's,
       * the labels come off the night's own rule snapshot — so a night settled
       * under an older bill still names the split it was settled with — and the
       * figure at the foot is `nightScore`'s score, which is what the row on E6
       * says. What the transfers were built from is that plus the float on the
       * line under it, which together are `finalPosition` — see B27 above.
       *
       * ⚠ THREE STRINGS ARE NOT DRAWN, and are flagged rather than passed off
       * as decided copy — the handoff's rule. "After deductions" is E6's own
       * section label with the table dropped off the front of it; "Their night"
       * is the summary card's "Night" in the pronoun the note below already
       * uses; and the empty line is written to the same grammar. No board draws
       * this block on this sheet at all, because no board draws this sheet
       * after a night has been settled.
       */}
      {settlement !== null && (
        <View style={[styles.after, { borderTopColor: t.hairline }]}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>After deductions</Text>

          {working.map((r) => (
            <View key={r.key} style={styles.afterRow}>
              <Text style={[styles.afterLabel, { color: t.text }]} numberOfLines={2}>
                {r.label}
              </Text>
              <Text
                style={[styles.afterValue, { color: r.offTable ? t.offTable : t.text }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatSignedToFit(r.amount, AFTER_FITS)}
              </Text>
            </View>
          ))}

          {working.length === 0 && (
            <Text style={[styles.note, styles.afterNone, { color: t.muted }]}>
              No rule touched them tonight.
            </Text>
          )}

          <View style={[styles.afterTotal, { borderTopColor: t.hairline }]}>
            <Text style={[styles.afterTotalLabel, { color: t.text }]}>Their night</Text>
            <Text
              style={[
                styles.afterTotalValue,
                { color: theirNight === 0 ? t.muted : moneyColor(t, theirNight) },
              ]}
              numberOfLines={1}
              {...cappedFigure}
            >
              {formatSignedToFit(theirNight, AFTER_FITS)}
            </Text>
          </View>

          {/* Under the total and outside it, in the colour money that is not
              theirs is drawn in everywhere else on this card. */}
          {holding.map((r) => (
            <View key={r.key} style={styles.afterRow}>
              <Text style={[styles.afterLabel, { color: t.muted }]} numberOfLines={2}>
                {r.label}
              </Text>
              <Text
                style={[styles.afterValue, { color: t.muted }]}
                numberOfLines={1}
                {...cappedFigure}
              >
                {formatSignedToFit(r.amount, AFTER_FITS)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Only while the deductions are still ahead of them. Once the night is
          settled the block above IS what came off, and a line promising it is
          still to happen would be describing a night that has ended. */}
      {!seated && result !== undefined && settlement === null && (
        <View style={[styles.settledNote, { borderTopColor: t.hairline }]}>
          {/* The drawn line names the sample player and so carries her pronoun;
              this is the same sentence with the pronoun that fits everyone. */}
          <Text style={[styles.settledText, { color: t.muted }]}>
            Their result is set. Bills and the piggy bank still come off it at settle-up.
          </Text>
        </View>
      )}
    </Sheet>
  );
}

/*
 * WHERE THIS CARD RUNS OUT OF ROOM.
 *
 * Three figures side by side at 28/800, tabular, inside a card 20 in from each
 * edge. Past this threshold the figure is abbreviated rather than cut, and the
 * exact amount is still on the screen: every entry under this card carries its
 * own full figure, and they are what this is the sum of.
 *
 * THE ARITHMETIC IS AT 360 AND AT THE TEXT CAP, which is the only place it
 * bites. "Fits at 393" is the whole of B3 and "fits at 100% text" is the whole
 * of B18, and this card has now been both. On a 360-wide phone it holds 288
 * points inside its padding, the row keeps 8 of that for its two gaps at the
 * worst, and `moneyMaxFontScale` lets every figure grow a tenth past what a
 * browser draws. So the three together have 272 points at 110%, which is 247 at
 * 100%, and the widest a row can be is one big figure, one small one, and their
 * difference — "$1000M" beside "$100" beside "−$1000M" is 255 at 30 and 238 at
 * 28. That is what the two points of size were for; B19 is the night in the
 * millions that spent them.
 *
 * ⚠ MEASURED IN THE STACK THE APP ACTUALLY PAINTS IN. Figtree, which the boards
 * ask for and the app does not yet bundle, is about 11% wider at the same size,
 * and it would take this row back over its budget. Bundling the typeface means
 * measuring this again — `scripts/ui-check.mjs --figtree` is where — and paying
 * for it in the size or in this threshold.
 */
const FITS = 1_000;

/*
 * AND WHERE THE WORKING UNDER IT DOES, which is a different number because it
 * is a different shape of row.
 *
 * One figure to a line rather than three: 320 points inside the sheet's own
 * margins at 360, a label at 14/400 that may wrap to two lines and give, and a
 * figure at 14/600 — 15/800 on the total — that may not. "−$999,999" is about
 * 81 points at the total's weight and 90 at the reader's text cap, which leaves
 * the label 220 and the two rules that fit least — "Kitchen & drinks · by size
 * of win" and "Back to you · fronted the bill" — take two lines and fit. So a
 * million is where this abbreviates, the same place E6's own row does: the two
 * screens are read one after the other and a figure that changed between them
 * would read as a different figure.
 */
const AFTER_FITS = 1_000_000;

/**
 * A label over a figure, two or three across the summary card.
 *
 * WHERE EACH ONE SITS IS THE ROW'S DECISION, NOT ITS OWN. The pairs used to
 * place themselves: a fixed 22 between the first two and `margin-left: auto` on
 * the third, which is what T4 draws. That hands ALL the slack to one gap, so
 * the spacing is a side effect of how wide the figures happen to be — $500 next
 * to $2,120 sat 22 apart with 50 points of nothing before the result, and a
 * night in the millions had 22 and none at all. The row is `space-between` now:
 * the gaps are equal, they grow and shrink together, and the composition holds
 * at any figure the night produces.
 *
 * DELIBERATE DEVIATION from T4 and from `08-tonight-home.md` § H4, which both
 * say the third pair is pushed right with `margin-left: auto`. It still ends at
 * the card's right edge — what changes is that the middle pair stops being
 * wherever the first one left it. The drawn spacing is only correct for the
 * drawn figures: on a night in the millions the same 22 and auto put the result
 * outside the card at 360 with the reader's text turned up, which is B19.
 *
 * `align` is which of the three this is, and it decides how the label sits over
 * the figure: left at the start, centred in the middle, right at the end.
 */
function StatPair({
  label,
  value,
  color,
  muted = false,
  tight = false,
  align = 'start',
}: {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
  tight?: boolean;
  align?: 'start' | 'middle' | 'end';
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.stat,
        align === 'middle' && styles.statMiddle,
        align === 'end' && styles.statPush,
      ]}
    >
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
      <Text
        style={[
          tight ? styles.statValueTight : styles.statValue,
          { color: color ?? (muted ? t.muted : t.text) },
        ]}
        numberOfLines={1}
        {...cappedFigure}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * An entry row that is a door, or the same row and nothing else.
 *
 * A settled night's rows lead nowhere — see the footer — and the way NOT to do
 * that is to render a `Pressable` with no handler: it is still a button to a
 * screen reader, still announces itself as one, and still takes a tap that does
 * nothing, which reads as an app that has stopped responding. So the element
 * itself changes, and the row inside it does not.
 */
function PressableOrPlain({
  press,
  style,
  children,
}: {
  press?: () => void;
  style: (state: { pressed: boolean }) => StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (press === undefined) return <View style={style({ pressed: false })}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={press} style={style}>
      {children}
    </Pressable>
  );
}

/**
 * "Buy-in", "Rebuy", "Cashed out" — WHAT the line is, and nothing more.
 *
 * Which rebuy it was belongs to the line underneath, where T2 puts it. Saying
 * "Second rebuy" in both places printed the same three words twice, one above
 * the other, and left no room for what the sub-line is actually for: what has
 * happened to this entry since.
 */
function label(kind: 'buyin' | 'rebuy' | 'cashout' | 'expense'): string {
  return kind === 'cashout'
    ? 'Cashed out'
    : kind === 'buyin'
      ? 'Buy-in'
      : kind === 'expense'
        ? /* The bill's own word for one of these, and its section label. */
          'Spend'
        : 'Rebuy';
}

/**
 * One drawn row per thing that happened — N12.
 *
 * The engine folds a correction into the entry it corrects, which is right for
 * the arithmetic and wrong for the list: the screen has to show that the
 * amount changed, when, and from what. So a corrected entry becomes TWO rows —
 * the original at the amount it was written at, struck through, and the
 * correction underneath it — and a voided one stays where it is, struck
 * through, at nothing.
 *
 * Both rows open the same entry, because that is where the correction is made
 * and there is only one entry underneath them.
 *
 * WHAT IS NOT BUILT: the drawn sub-line says "corrected by Marek at 23:10".
 * Nothing records WHO made a correction — the ledger has no author column on
 * the device or the server — so the clause is left off rather than filled with
 * a guess. Flagged, not solved.
 *
 * A twice-corrected entry shows the first amount and the last, not the step
 * between. The chain is in the ledger and the entry screen follows it; the
 * card is a person's night, not an audit trail of one line.
 */
interface EntryRow {
  key: string;
  /** The ledger's own order. The list is a timeline and reads as one. */
  seq: number;
  /** Which entry tapping the row corrects. Always the base entry. */
  entryId: string;
  at: string | undefined;
  title: string;
  sub: string;
  amount: Money;
  struck: boolean;
  mark?: { label: string; tone: 'plain' | 'muted' | 'amber' };
}

function entryRows(
  mine: readonly EffectiveEntry[],
  fronted: readonly EffectiveEntry[],
  night: NonNullable<ReturnType<typeof useNight>>,
  queued: ReadonlySet<string>,
): EntryRow[] {
  const out: EntryRow[] = [];

  /*
   * WHAT THEY BOUGHT FOR THE TABLE, in the same timeline as their chips.
   *
   * The note is the row — "Pizza", "Beers" — exactly as the bill draws it, and
   * an empty note leaves the word alone rather than inventing a description of
   * something nobody described. A voided spend keeps its place struck through,
   * for the reason every other voided row does: the ledger has it.
   */
  for (const e of fronted) {
    const note = night.noteOf[e.id] ?? '';
    out.push({
      key: e.id,
      seq: e.seq,
      entryId: e.id,
      at: night.occurredAt[e.id],
      title: note === '' ? label('expense') : note,
      sub: 'fronted the bill',
      amount: e.voided ? e.originalAmount : e.amount,
      struck: e.voided,
      mark: e.voided
        ? { label: 'voided', tone: 'muted' }
        : queued.has(e.id)
          ? { label: 'queued', tone: 'muted' }
          : undefined,
    });
  }

  mine.forEach((e, i) => {
    const at = night.occurredAt[e.id];
    const name = label(e.type);
    const gone = e.voided || e.corrected;

    /* The row that replaced it, for both the time it happened and the amount. */
    const correction = e.corrected
      ? [...night.entries]
          .filter((x) => x.correctsEntryId === e.id && x.type === 'correction')
          .sort((a, b) => b.seq - a.seq)[0]
      : undefined;
    const when = correction === undefined ? undefined : night.occurredAt[correction.id];

    out.push({
      key: e.id,
      seq: e.seq,
      entryId: e.id,
      at,
      title: name,
      // The pill says the line no longer counts and the strike shows it, so
      // the sub-line says the one thing neither can: when it was replaced.
      // A plain void keeps its depth — which rebuy this was is still what a
      // reader is looking for.
      sub:
        e.corrected && when !== undefined
          ? `replaced at ${clock(when)}`
          : depth(e, mine, i),
      // The original line keeps the figure it was written at. Showing the
      // corrected amount here would put the same money on the screen twice.
      amount: gone ? e.originalAmount : e.amount,
      struck: gone,
      // The board marks BOTH the voided line and the superseded one VOIDED —
      // in an append-only ledger a correction is a reversal plus a new row,
      // and the reader is being told the same thing either way: this line no
      // longer counts. The sub-line says which of the two it was.
      mark: gone
        ? { label: 'voided', tone: 'muted' }
        : queued.has(e.id)
          ? { label: 'queued', tone: 'muted' }
          : undefined,
    });

    if (!e.corrected) return;

    out.push({
      key: `${e.id}:correction`,
      // A correction happened when it happened. Pinning it under the line it
      // replaces would put 11:54 between 09:45 and 10:36, and the time column
      // is the one thing on this screen a reader trusts to be in order. The
      // two rows name each other instead.
      seq: correction?.seq ?? e.seq,
      entryId: e.id,
      at: when,
      // The money is still a rebuy; what is new is that it replaces one. The
      // pill carries that, so the title stays what the line IS.
      title: name,
      sub: `replaces the ${clock(at)} ${name.toLowerCase()}`,
      amount: e.amount,
      struck: false,
      mark: { label: 'correction', tone: 'plain' },
    });
  });

  return out.sort((a, b) => a.seq - b.seq);
}

/** How deep this entry is: first buy-in, second rebuy, chips counted. */
function depth(
  e: { type: string },
  all: readonly { type: string }[],
  index: number,
): string {
  return e.type === 'cashout'
    ? 'stack counted · seat closed'
    : e.type === 'buyin'
      ? 'first buy-in'
      : `${ordinal(all.slice(0, index + 1).filter((x) => x.type === 'rebuy').length)} rebuy`;
}

const ordinal = (n: number): string =>
  n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`;

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  /*
   * THE GAPS ARE WHATEVER IS LEFT, SHARED EQUALLY — see the note above StatPair.
   *
   * `gap` under `space-between` is a FLOOR, not a spacing: the row hands out
   * its slack evenly and only falls back to this when there is none. It is the
   * one number here that has to be measured rather than chosen — the widest
   * three figures the card can hold are 270 points of the 288 a 360-wide phone
   * gives it, so 8 is what is left to divide.
   */
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  // 4 between the caps label and the figure, as H2 draws it — 6 pushed the
  // three pairs a row taller than the card they sit in was drawn for.
  stat: { gap: 4 },
  // The middle pair centres its label over its figure; the last one right-aligns
  // both, because it ends at the card's edge. Neither pushes any more: the row
  // places them.
  statMiddle: { alignItems: 'center' },
  statPush: { alignItems: 'flex-end' },
  statLabel: type.statPairLabel,
  statValue: type.statPairValue,
  statValueTight: type.statPairValueTight,
  cardNote: { ...type.statPairNote, maxWidth: 104, textAlign: 'right' },

  list: { marginHorizontal: 20 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 },
  time: { ...type.time, width: 44 },
  entryText: { gap: 2, flexShrink: 1 },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  struck: { textDecorationLine: 'line-through' },
  entryType: type.entryType,
  provenance: type.entryProvenance,
  entryAmount: { ...type.entryAmount, marginLeft: 'auto' },
  queuedNote: { ...type.footnote, marginTop: 16, paddingHorizontal: 15 },

  /*
   * THE WORKING, under the entries and over the note.
   *
   * E6's deductions block at this sheet's own margin: a rule top, a rule above
   * the total, 14 for a row and 15/800 for the figure it comes to. It is the
   * same furniture as the results screen the reader has just come from on
   * purpose — the block is the per-person half of the totals they were looking
   * at there, and a second visual language would read as a second subject.
   */
  after: { marginTop: 16, marginHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 5 },
  afterRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  afterLabel: { fontSize: 14, fontWeight: '400', flexShrink: 1 },
  /* NEVER SHRINKS — B18. The label beside it is words and gives instead. */
  afterValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  afterNone: { marginHorizontal: 0 },
  afterTotal: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 1,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  afterTotalLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.52, textTransform: 'uppercase' },
  afterTotalValue: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  settledNote: { marginTop: 14, marginHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  settledText: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  note: { ...type.footnote, marginHorizontal: space.page },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
