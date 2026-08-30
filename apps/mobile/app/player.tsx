import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatMoney,
  formatSignedToFit,
  formatToFit,
  resolveLedger,
  type EffectiveEntry,
  type Money,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { HoldButton } from '../src/components/HoldButton';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { cappedFigure, unscaledLabel, radius, space, type } from '../src/design/tokens';
import { lastRebuyAmount, rebuy as writeRebuy, standingOf, useNight } from '../src/lib/nightStore';
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
  const rows = entryRows(mine, night, pending.ids);
  const first = mine[0];
  const lastOut = [...mine].reverse().find((e) => e.type === 'cashout');

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
            ? standing.returned
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
        seated ? (
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
        />
        {result !== undefined && (
          <StatPair
            label="Night"
            value={formatSignedToFit(result, FITS)}
            color={moneyColor(t, result)}
            tight
            push
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
          <Pressable
            key={r.key}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/entry', params: { id: r.entryId } })}
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
          </Pressable>
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

      {!seated && result !== undefined && (
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
 * Three figures side by side at 30/800, tabular, inside a card 20 in from each
 * edge with 22 between them: about 105 points each, which is a currency symbol
 * and four digits — "$9,999" — and no more. A fifth digit is what put "$18,500"
 * half outside its own cell on a real night.
 *
 * Past that the figure is abbreviated rather than cut, and the exact amount is
 * still on the screen: every entry under this card carries its own full
 * figure, and they are what this is the sum of.
 */
const FITS = 1_000;

/** A label over a figure, two or three across the summary card. */
function StatPair({
  label,
  value,
  color,
  muted = false,
  tight = false,
  push = false,
}: {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
  tight?: boolean;
  push?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.stat, push && styles.statPush]}>
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
 * "Buy-in", "Rebuy", "Cashed out" — WHAT the line is, and nothing more.
 *
 * Which rebuy it was belongs to the line underneath, where T2 puts it. Saying
 * "Second rebuy" in both places printed the same three words twice, one above
 * the other, and left no room for what the sub-line is actually for: what has
 * happened to this entry since.
 */
function label(kind: 'buyin' | 'rebuy' | 'cashout' | 'expense'): string {
  return kind === 'cashout' ? 'Cashed out' : kind === 'buyin' ? 'Buy-in' : 'Rebuy';
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
  night: NonNullable<ReturnType<typeof useNight>>,
  queued: ReadonlySet<string>,
): EntryRow[] {
  const out: EntryRow[] = [];

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
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 22,
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
  statPush: { marginLeft: 'auto', alignItems: 'flex-end' },
  statLabel: type.statPairLabel,
  statValue: type.statPairValue,
  statValueTight: type.statPairValueTight,
  cardNote: { ...type.statPairNote, marginLeft: 'auto', maxWidth: 104, textAlign: 'right' },

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

  settledNote: { marginTop: 14, marginHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  settledText: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },

  note: { ...type.footnote, marginHorizontal: space.page },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
