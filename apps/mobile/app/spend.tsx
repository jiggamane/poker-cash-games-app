import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../src/components/Text';
import { money, resolveLedger, type Money, type PlayerId } from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { Chip } from '../src/components/Card';
import { Keypad } from '../src/components/Keypad';
import { amountOf, typedFigureSize, useTypedAmount } from '../src/components/typedAmount';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { L, z } from '../src/design/scale';
import { cappedFigure } from '../src/design/tokens';
import {
  addSpend,
  spendsOf,
  standingsOf,
  useNight,
  voidSpend,
  type Cover,
} from '../src/lib/nightStore';

/**
 * Add a spend — L2 — and edit one — L3. 11-bill-and-piggy-bank.md.
 *
 * TWO STEPS, AND THE SECOND ONE IS *COVERED BY*. It was one screen until 6
 * September, in this order: the figure, the note, eight chips naming everybody
 * at the table, and the keypad under all of it. That put the pad 343 points
 * below the figure it types into — on the reference phone you could see the
 * figure or the whole pad and never both, and on a 360 × 640 Android the pad
 * was not on screen at all when the sheet opened. A host typing $1,200 typed it
 * blind, which is the exact fault `Keypad.tsx` exists to prevent: "a keyboard
 * sliding up would cover the running figure". See B45.
 *
 * So the pad sits directly under the figure, the way it does on every other
 * amount sheet in this app — /log, /entry and /share are all figure, one short
 * row, pad — and the chips move behind a row that states who is covering it.
 * `09-navigation.md`: a multi-step flow REPLACES ONE SHEET'S CONTENT and keeps
 * one close, and the sheet never pushes. Since the full board the second step
 * carries the step-back circle that returns to the spend, and the close leaves
 * the sheet from either step. `new-night.tsx` is the same shape.
 *
 * THERE IS NO TYPE ON A SPEND, and there are no prefills above the note either.
 * L2 drew a chip row writing `Food`, `Drinks` or `Venue` into the field, and on
 * the built screen it was the only row of chips sitting under a big money
 * figure — which on every other amount sheet in this app (/log, /entry, /share)
 * is the preset row. It read as three preset amounts and it was three words.
 * Nothing but the amount affects the arithmetic, an empty note is valid, and
 * the bill row shows the amount alone when there is no note.
 *
 * THE KEYPAD IS ON THE SPEND STEP WHETHER ADDING OR EDITING. It used to be
 * drawn only when adding, so L3's Amount row — "Rows: Amount, Note, then
 * Covered by" — had a figure on it and no way to change it: a spend logged at
 * $1,200 instead of $120 could only be voided and typed again. See B24.
 *
 * Covered by has four cases and they are not decoration: one player is repaid
 * exactly what they fronted, several players must sum to the spend before Save
 * will go, the piggy bank is repaid nothing because the money left it, and
 * nobody yet leaves the spend on the bill and unpaid until someone is named.
 * All four are stated on the row before it is opened.
 */
export default function SpendScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  const existing = useMemo(
    () =>
      night === null || ledger === null || id === undefined
        ? undefined
        : spendsOf(night, ledger).find((s) => s.id === id),
    [night, ledger, id],
  );

  /*
   * The keypad's own rule about a figure already on screen —
   * `src/components/typedAmount.ts`, and B20. A new spend opens on nought,
   * which the pad has always treated as an empty field; an existing one opens
   * on what was logged, as an OFFER, so the first key replaces the whole
   * figure rather than appending a digit to it. Correcting a $1,200 spend to
   * $120 is three keys, not nine deletions.
   */
  const field = useTypedAmount(existing?.amount ?? 0);
  const [note, setNote] = useState<string>(existing?.note ?? '');
  const [cover, setCover] = useState<CoverPick>(
    existing === undefined
      ? { kind: 'unpaid' }
      : existing.coveredBy !== null
        ? { kind: existing.coveredBy }
        : { kind: 'players', ids: existing.fronters.map((f) => f.playerId) },
  );
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries((existing?.fronters ?? []).map((f) => [f.playerId, String(f.amount)])),
  );

  /*
   * THE SPEND BEING EDITED, once the night is actually here.
   *
   * Every `useState` above captures its opening value on the FIRST render, and
   * on that render `useNight()` can still be null — the sheet mounts before the
   * store has answered, which is the whole reason the guard below exists. The
   * spend is then undefined, so the sheet opens on nought with no note and
   * nobody covering it, over a spend logged at $120 by Marek. It never showed
   * while this state drew no keypad, because nothing on the screen contradicted
   * the figure.
   *
   * Seeded ONCE PER SPEND, by id. The night object changes on every entry
   * anybody logs, and re-seeding on each of those would throw away a figure the
   * host is halfway through typing.
   */
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    if (existing === undefined || seeded.current === existing.id) return;
    seeded.current = existing.id;
    field.offer(existing.amount);
    setNote(existing.note);
    setCover(
      existing.coveredBy !== null
        ? { kind: existing.coveredBy }
        : { kind: 'players', ids: existing.fronters.map((f) => f.playerId) },
    );
    setShares(Object.fromEntries(existing.fronters.map((f) => [f.playerId, String(f.amount)])));
    // `field` is a fresh object each render; the spend is what this watches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * WHICH STEP THE ONE SHEET IS SHOWING. `new-night.tsx` holds its flow the
   * same way, and 09-navigation is why both do: the content is replaced, the
   * back circle comes back a step, and there is never a second panel.
   */
  const [step, setStep] = useState<Step>('spend');

  if (night === null || ledger === null) return <Sheet title="A spend">{null}</Sheet>;

  const amount = amountOf(field.typed);
  const seated = standingsOf(night, ledger).filter((s) => s.played);

  /*
   * Several fronters must sum to the spend. This is blocking, not a warning:
   * two people who between them put in less than the bar was paid means the
   * ledger is describing money that did not move.
   */
  const picked = cover.kind === 'players' ? cover.ids : [];
  const fronted = picked.reduce((sum, pid) => sum + (Number(shares[pid] ?? '0') || 0), 0);
  const sharesAddUp = picked.length <= 1 || fronted === amount;
  const valid =
    Number.isInteger(amount) && amount > 0 && (cover.kind !== 'players' || picked.length > 0) && sharesAddUp;

  /*
   * WHAT THE ROW SAYS BEFORE THE LIST IS OPENED, and it says all four cases.
   *
   * The chips are a step away now, so this line is the only thing on the spend
   * step that names who is covering it — a row that read "1 person" would be
   * asking the host to open it to find out which. Several fronters are joined
   * the way tonight's rules are joined on New session: names, ` · `, no count.
   */
  const nameOf = (pid: PlayerId): string => seated.find((s) => s.id === pid)?.name ?? 'Someone';
  const coveredBy =
    cover.kind === 'kitty'
      ? 'The piggy bank'
      : cover.kind === 'unpaid' || picked.length === 0
        ? 'Nobody yet'
        : picked.map(nameOf).join(' · ');

  /*
   * The blocking shortfall, on both bars: the spend step's primary will not
   * save while the shares disagree with the figure, and the covered-by step's
   * Done will not leave while they do — the same sentence rather than two.
   */
  const shortfall = sharesAddUp
    ? null
    : `${formatMoney(Math.abs(amount - fronted) as Money)} ${fronted < amount ? 'still to cover' : 'too much covered'}`;

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const value = money(amount);
      /*
       * An edit is a void of the old lines and a fresh write, which is what
       * append-only means here: the original stays in the ledger and the bill
       * shows what is true now. It is two writes, never an update.
       */
      if (existing !== undefined) await voidSpend(existing.entryIds);
      await addSpend(value, note, asCover(cover, picked, shares, value));
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (existing === undefined || busy) return;
    setBusy(true);
    try {
      await voidSpend(existing.entryIds);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  /*
   * THE FULL BOARD (`spend`, `spend-edit`, `spend-covered`, approved): the
   * primary is the bar on both steps; Void this spend, the destructive button
   * that sat under it, is the quiet red line in the content. The two fields are
   * the kit's outlined field, and Covered by carries no chevron — the look has
   * none, and the board flags that it is now told from Note only by its label.
   *
   * THE SECOND STEP HAS A BACK CIRCLE. It used to have none: its one close came
   * back a step. The board draws the step-back circle on it (a real step of a
   * flow keeps its circle — `progress.mjs`, 26 November), so the circle comes
   * back to the spend and the close leaves the sheet, the same as on the first
   * step. A chip writes as it is tapped, so leaving loses nothing a close on the
   * first step would not.
   */
  return (
    <Sheet
      title={
        step === 'covered'
          ? 'Covered by'
          : existing === undefined
            ? 'Add a spend'
            : 'The spend'
      }
      {...(step === 'spend'
        ? {
            sub:
              existing === undefined
                ? `stamped ${now()}`
                : `logged ${existing.at}${existing.entryIds.length > 1 ? ' · fronted by several' : ''}`,
          }
        : { onBack: () => setStep('spend') })}
      bar={
        step === 'covered'
          ? [
              /* Nothing is held back to be saved here — a chip writes the state
                 as it is tapped — so this is the way back for somebody who
                 opened the list, and the block for shares that do not add up. */
              { label: shortfall ?? 'Done', disabled: shortfall !== null, onPress: () => setStep('spend') },
            ]
          : [
              {
                label:
                  shortfall ??
                  (amount === 0
                    ? 'Type an amount'
                    : existing === undefined
                      ? `Add ${formatMoney(money(amount))} to the bill`
                      : 'Save changes'),
                disabled: !valid || busy,
                onPress: () => void save(),
              },
            ]
      }
    >
      {step === 'spend' ? (
        <View style={styles.body}>
          <Text
            {...cappedFigure}
            style={[
              styles.amount,
              typedFigureSize(formatMoney(money(amount)), z(38)),
              { color: amount > 0 ? t.text : t.muted },
            ]}
          >
            {formatMoney(money(amount))}
          </Text>

          {/* THE PAD, DIRECTLY UNDER THE FIGURE IT TYPES INTO — B45, and the
              order every other amount sheet is already in. Nothing goes
              between these two. It runs edge to edge, out of the body's pad. */}
          <View style={styles.pad}>
            <Keypad {...field.keys} />
          </View>

          <View>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: t.muted }]}>NOTE</Text>
              <Text style={[styles.optional, { color: t.dim }]}>optional</Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What it was"
              placeholderTextColor={t.dim}
              autoCapitalize="sentences"
              style={[
                styles.input,
                note === '' && styles.placeholder,
                { color: t.text, backgroundColor: t.surface, borderColor: t.outline },
              ]}
            />
          </View>

          {/* The same box as the note above it: one you type into, one you
              tap. With no chevron in the look, the label is what tells them
              apart — the board's open question, not an oversight here. */}
          <View>
            <Text style={[styles.label, styles.labelAlone, { color: t.muted }]}>COVERED BY</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Covered by ${coveredBy}`}
              onPress={() => setStep('covered')}
              style={({ pressed }) => [
                styles.input,
                styles.picker,
                { backgroundColor: t.surface, borderColor: t.outline, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.pickerValue,
                  cover.kind === 'unpaid' && styles.placeholder,
                  { color: cover.kind === 'unpaid' ? t.dim : t.text },
                ]}
                numberOfLines={1}
              >
                {coveredBy}
              </Text>
            </Pressable>
          </View>

          {existing !== undefined && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void discard()}
              style={({ pressed }) => [styles.quiet, { opacity: busy ? 0.4 : pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.quietLabel, { color: t.red }]}>Void this spend</Text>
            </Pressable>
          )}

          {error !== null && <Text style={[styles.error, { color: t.red }]}>{error}</Text>}
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.chips}>
            {seated.map((p) => {
              const on = cover.kind === 'players' && cover.ids.includes(p.id);
              return (
                <Chip
                  key={p.id}
                  label={p.name}
                  on={on}
                  onPress={() =>
                    setCover((c) => {
                      const ids =
                        c.kind === 'players' && c.ids.includes(p.id)
                          ? c.ids.filter((x) => x !== p.id)
                          : [...(c.kind === 'players' ? c.ids : []), p.id];
                      /* Nobody left on it IS "Nobody yet" — the spend is on
                         the bill and unpaid. Leaving it an empty list of
                         fronters would block Save from a screen that no
                         longer says why. */
                      return ids.length === 0 ? { kind: 'unpaid' } : { kind: 'players', ids };
                    })
                  }
                />
              );
            })}

            <Chip
              label="The piggy bank"
              on={cover.kind === 'kitty'}
              onPress={() => setCover({ kind: 'kitty' })}
            />
            {/* Dashed while it is not the choice, as the board draws it; once
                chosen it takes the ink like any chosen chip, so the step still
                says which of the three cases it is in. */}
            <Chip
              label="Nobody yet"
              dashed={cover.kind !== 'unpaid'}
              on={cover.kind === 'unpaid'}
              onPress={() => setCover({ kind: 'unpaid' })}
            />
          </View>

          {/* Not drawn on the board (its flag): several people fronting one
              spend. Styled as the kit's fields and rows. */}
          {picked.length > 1 && (
            <View style={styles.shares}>
              {picked.map((pid) => (
                <View key={pid} style={styles.shareRow}>
                  <Text style={[styles.shareName, { color: t.text }]}>{nameOf(pid)}</Text>
                  <TextInput
                    value={shares[pid] ?? ''}
                    onChangeText={(v) =>
                      setShares((s) => ({ ...s, [pid]: v.replace(/[^0-9]/g, '') }))
                    }
                    // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
                    // to a digits-only keyboard.
                    testID="amount"
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={t.dim}
                    style={[
                      styles.shareInput,
                      {
                        color: t.text,
                        backgroundColor: t.surface,
                        borderColor: sharesAddUp ? t.outline : t.red,
                      },
                    ]}
                  />
                </View>
              ))}
              <Text style={[styles.shareNote, { color: sharesAddUp ? t.muted : t.red }]}>
                {formatMoney(fronted as Money)} of {formatMoney(money(amount))} covered.
              </Text>
            </View>
          )}

          <Text style={[styles.explain, { color: t.muted }]}>
            {cover.kind === 'kitty'
              ? 'The piggy bank paid it directly. Nobody is reimbursed — the money has already left it.'
              : cover.kind === 'unpaid'
                ? 'It counts towards the bill and stays tagged unpaid until somebody is named.'
                : 'Fronting is not exemption: whoever put money in gets exactly that back, and still pays their own share.'}
          </Text>
        </View>
      )}
    </Sheet>
  );
}

/** The two steps of the one sheet. The flow is one level deep. */
type Step = 'spend' | 'covered';

type CoverPick = { kind: 'players'; ids: PlayerId[] } | { kind: 'kitty' } | { kind: 'unpaid' };

/**
 * One fronter gets the whole spend without a per-person field; several carry
 * what was typed against each name.
 */
function asCover(
  pick: CoverPick,
  ids: PlayerId[],
  shares: Record<string, string>,
  amount: Money,
): Cover {
  if (pick.kind !== 'players') return { kind: pick.kind };
  if (ids.length === 1) return { kind: 'players', shares: [{ playerId: ids[0]!, amount }] };
  return {
    kind: 'players',
    shares: ids.map((playerId) => ({
      playerId,
      amount: money(Number(shares[playerId] ?? '0') || 0),
    })),
  };
}

const now = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/* The kit at this phone's scale (`design/scale.ts`): the sheet body is 20 a
   side with 12 between its parts, the figure is `.fig`, the fields `.fi`. */
const styles = StyleSheet.create({
  body: { paddingHorizontal: z(20), paddingTop: z(2), gap: z(12) },
  amount: {
    fontFamily: 'head',
    fontSize: z(38),
    fontWeight: '700',
    letterSpacing: z(-1.14),
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  /** Out of the body's 20 so the pad's hairlines run to the sheet's edges. */
  pad: { marginHorizontal: z(-20) },

  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: z(6), marginLeft: z(2) },
  label: { fontSize: z(11), fontWeight: '700', letterSpacing: z(1.1) },
  labelAlone: { marginBottom: z(6), marginLeft: z(2) },
  optional: { fontSize: z(12.5), fontWeight: '400', marginLeft: 'auto' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: z(8) },

  /* The kit's `.fi`: 48 tall, 12 corners, a 1.5 outline on the card fill. */
  input: {
    minHeight: z(48),
    fontSize: z(16),
    fontWeight: '600',
    borderWidth: 1.5,
    borderRadius: L.fieldRadius,
    paddingHorizontal: z(14),
    paddingVertical: z(12),
  },
  /* `.fi.ph`: the placeholder is dim and regular. */
  placeholder: { fontWeight: '400' },

  // The same box as the note field, laid out as a row.
  picker: { flexDirection: 'row', alignItems: 'center', gap: z(10) },
  pickerValue: { fontSize: z(16), fontWeight: '600', flex: 1 },

  /* The kit's `quiet()`, red: a line of text, not a button. */
  quiet: { minHeight: z(40), alignItems: 'center', justifyContent: 'center' },
  quietLabel: { fontSize: z(14), fontWeight: '600' },

  shares: { gap: z(8) },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: z(12) },
  shareName: { fontSize: z(15.5), fontWeight: '600', flexShrink: 1 },
  shareInput: {
    marginLeft: 'auto',
    minWidth: z(110),
    minHeight: z(48),
    textAlign: 'right',
    fontFamily: 'head',
    fontSize: z(16),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    borderWidth: 1.5,
    borderRadius: L.fieldRadius,
    paddingHorizontal: z(14),
    paddingVertical: z(10),
  },
  shareNote: { fontSize: z(12.5), fontWeight: '500', lineHeight: z(17.5) },

  explain: { fontSize: z(13), lineHeight: z(18.85) },
  error: { fontSize: z(13), lineHeight: z(18.85) },
});
