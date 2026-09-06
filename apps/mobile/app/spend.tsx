import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { money, resolveLedger, type Money, type PlayerId } from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Keypad } from '../src/components/Keypad';
import { amountOf, typedFigureSize, useTypedAmount } from '../src/components/typedAmount';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { cappedFigure, radius, space, type } from '../src/design/tokens';
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
 * one close, so the close returns to the spend rather than dismissing, and the
 * sheet never pushes. `new-night.tsx` is the same shape.
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
   * close comes back a step, and there is never a second panel.
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
   * The blocking shortfall, on both footers: the spend step's primary will not
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
        : {})}
      /* One sheet, one close: on the second step it comes back a step rather
         than throwing away a half-typed spend. 09-navigation. */
      {...(step === 'covered' ? { onClose: () => setStep('spend') } : {})}
      footer={
        step === 'covered' ? (
          /* Nothing is held back to be saved here — a chip writes the state as
             it is tapped — so this is the way back for somebody who opened the
             list, and the block for shares that do not add up. */
          <Button
            label={shortfall ?? 'Done'}
            variant="primary"
            disabled={shortfall !== null}
            onPress={() => setStep('spend')}
          />
        ) : (
          <>
            <Button
              label={
                shortfall ??
                (amount === 0
                  ? 'Type an amount'
                  : existing === undefined
                    ? `Add ${formatMoney(money(amount))} to the bill`
                    : 'Save changes')
              }
              variant="primary"
              disabled={!valid || busy}
              onPress={() => void save()}
            />
            {existing !== undefined && (
              <Button
                label="Void this spend"
                variant="destructive"
                disabled={busy}
                onPress={() => void discard()}
              />
            )}
          </>
        )
      }
    >
      {step === 'spend' ? (
        <>
          <Text
            {...cappedFigure}
            style={[
              styles.amount,
              typedFigureSize(formatMoney(money(amount)), 68),
              { color: amount > 0 ? t.text : t.muted },
            ]}
          >
            {formatMoney(money(amount))}
          </Text>

          {/* THE PAD, DIRECTLY UNDER THE FIGURE IT TYPES INTO — B45, and the
              order every other amount sheet is already in. Nothing goes
              between these two. */}
          <View style={styles.pad}>
            <Keypad {...field.keys} />
          </View>

          <View style={styles.block}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: t.muted }]}>NOTE</Text>
              <Text style={[styles.optional, { color: t.dim }]}>optional</Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What it was"
              placeholderTextColor={t.muted}
              autoCapitalize="sentences"
              style={[
                styles.input,
                {
                  color: t.text,
                  backgroundColor: t.surface,
                  borderColor: note.trim() === '' ? t.dashed : t.hairline,
                  borderStyle: note.trim() === '' ? 'dashed' : 'solid',
                },
              ]}
            />
          </View>

          {/* The same box as the note above it: one you type into, one you
              tap. The chevron is the whole of what tells them apart, which is
              the promise 09-navigation makes about a row that opens. */}
          <View style={styles.block}>
            <Text style={[styles.label, { color: t.muted }]}>COVERED BY</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Covered by ${coveredBy}`}
              onPress={() => setStep('covered')}
              style={({ pressed }) => [
                styles.input,
                styles.picker,
                {
                  backgroundColor: t.surface,
                  borderColor: cover.kind === 'unpaid' ? t.dashed : t.hairline,
                  borderStyle: cover.kind === 'unpaid' ? 'dashed' : 'solid',
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.pickerValue,
                  { color: cover.kind === 'unpaid' ? t.muted : t.text },
                ]}
                numberOfLines={1}
              >
                {coveredBy}
              </Text>
              <Icon name="chevron" color={t.muted} size={13} />
            </Pressable>
          </View>

          {error !== null && <Text style={[styles.error, { color: t.danger }]}>{error}</Text>}
        </>
      ) : (
        <View style={styles.block}>
          <View style={styles.chips}>
            {seated.map((p) => {
              const on = cover.kind === 'players' && cover.ids.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
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
                  style={({ pressed }) => [
                    styles.chip,
                    on
                      ? { backgroundColor: t.text, borderColor: t.text }
                      : { borderColor: t.quietOutline },
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: on ? t.onFill : t.text }]}>
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}

            <CoverChip
              label="The piggy bank"
              on={cover.kind === 'kitty'}
              onPress={() => setCover({ kind: 'kitty' })}
            />
            <CoverChip
              label="Nobody yet"
              dashed
              on={cover.kind === 'unpaid'}
              onPress={() => setCover({ kind: 'unpaid' })}
            />
          </View>

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
                    placeholderTextColor={t.muted}
                    style={[
                      styles.shareInput,
                      {
                        color: t.text,
                        backgroundColor: t.surface,
                        borderColor: sharesAddUp ? t.hairline : t.danger,
                      },
                    ]}
                  />
                </View>
              ))}
              <Text style={[styles.shareNote, { color: sharesAddUp ? t.muted : t.danger }]}>
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

function CoverChip({
  label,
  on,
  dashed = false,
  onPress,
}: {
  label: string;
  on: boolean;
  dashed?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        on
          ? { backgroundColor: t.text, borderColor: t.text }
          : { borderColor: dashed ? t.dashed : t.quietOutline, borderStyle: dashed ? 'dashed' : 'solid' },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.chipLabel, { color: on ? t.onFill : dashed ? t.muted : t.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const now = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  amount: {
    fontSize: 68,
    fontWeight: '800',
    letterSpacing: -3.4,
    lineHeight: 70,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    // 12 rather than the 18 it was: this is the gap between the figure and the
    // keys that type it, and it is the whole of what is now between them.
    marginBottom: 12,
  },
  /** Under the pad, before the two rows that say what the spend was. */
  pad: { marginBottom: 18 },

  block: { marginHorizontal: space.card, marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { ...type.label, marginBottom: 10 },
  optional: { ...type.meta, marginLeft: 'auto', marginBottom: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  chipLabel: { fontSize: 14.5, fontWeight: '600' },

  // The label above already carries 10 below itself; this used to carry another
  // 10 on top of it, and a 20-point gap on a sheet that is fighting for height
  // is one of them too many.
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  // The same box as the note field, laid out as a row: the value, then the
  // chevron that says it opens.
  picker: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerValue: { ...type.body, flex: 1 },

  shares: { marginTop: 14, gap: 8 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareName: { ...type.rowName, flexShrink: 1 },
  shareInput: {
    ...type.figure,
    marginLeft: 'auto',
    minWidth: 110,
    textAlign: 'right',
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  shareNote: { ...type.meta, marginTop: 2 },

  explain: { ...type.footnote, marginTop: 12 },
  error: { ...type.footnote, marginHorizontal: space.card, marginBottom: 12 },
});
