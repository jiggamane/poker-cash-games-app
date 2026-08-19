import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  formatMoney,
  money,
  resolveLedger,
  type Money,
  type MoneyRule,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { setClubRules, useClub } from '../src/lib/clubStore';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { deleteRule, draftRule, saveRule, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * The rule editor — O5.
 *
 * Every setting here is one the group argues about at some point, so each is a
 * visible choice rather than a default hidden in code:
 *
 *   HOW MUCH   a percentage of each win, or a fixed sum to be shared out
 *   CHARGED TO the winners only, or everyone at the table
 *   SPLIT      evenly, in proportion to the win, or typed in by hand
 *   TAKEN FROM the gross win, or what is left after the earlier rules
 *
 * Two of those combinations are refused rather than left to fail later:
 *
 *   A PERCENTAGE CHARGED TO EVERYONE is meaningless — a percentage of a loss
 *   is not a thing, so the charge locks to winners the moment you pick one.
 *
 *   A SPLIT BY HAND MUST ADD UP. The engine throws if the typed shares do not
 *   total the amount being covered, so this screen refuses to save instead,
 *   and says how much is left.
 */
export default function RuleEditor() {
  const t = useTheme();
  const night = useNight();
  const params = useLocalSearchParams<{
    id?: string;
    destination?: MoneyRule['destination'];
    order?: string;
    draft?: string;
    /**
     * Which layer of the chain is being edited. 'club' writes the group's
     * default, which only reaches nights opened afterwards; anything else
     * writes tonight's own snapshot, which reaches nothing but tonight.
     */
    scope?: 'club' | 'night';
  }>();

  const club = useClub();
  const forClub = params.scope === 'club';
  const existing = (forClub ? club?.rules : night?.rules)?.find((r) => r.id === params.id);

  /*
   * The night loads asynchronously, so `existing` is undefined on the first
   * render even when editing a real rule. Seeding useState with it would
   * therefore turn an edit into a brand new rule roughly whenever the app was
   * opened straight onto this screen. Instead the edit buffer starts empty and
   * the rule shown falls back to whatever has arrived — the blank one is
   * memoised so its id does not change under it on every keystroke.
   */
  const blank = useMemo(
    () => draftRule(params.destination ?? 'kitty', Number(params.order ?? '1')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [edited, setEdited] = useState<MoneyRule | null>(null);
  const rule = edited ?? existing ?? blank;
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Sheet title="Rule">{null}</Sheet>;
  }

  const players = standingsOf(night, ledger).filter((s) => s.played);
  const set = (patch: Partial<MoneyRule>) => setEdited({ ...rule, ...patch });

  const isBill = rule.destination === 'bill';
  const percent = rule.amountKind === 'percent';

  const shares = rule.customShares ?? [];
  const typed = shares.reduce((a, c) => a + c.amount, 0);
  /* A bill covers whatever was really spent; anything else covers its own
     stated amount. Same number the engine will check against. */
  const target = isBill ? ledger.totalExpenses : rule.amount;
  const shortBy = (target - typed) as Money;
  const splitAddsUp = rule.split !== 'custom' || shortBy === 0;

  const nameOk = rule.name.trim().length > 0;
  const amountOk = isBill || rule.amount > 0;
  const canSave = nameOk && amountOk && splitAddsUp;

  async function save() {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      const saved = { ...rule, name: rule.name.trim() };
      if (forClub && club !== null) {
        const rest = club.rules.filter((r) => r.id !== saved.id);
        await setClubRules(club.id, [...rest, saved]);
      } else {
        await saveRule(saved);
      }
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={rule.name === '' ? 'New rule' : rule.name}
      footer={
        <>
          <Button
            label={
              !nameOk
                ? 'Give it a name'
                : !amountOk
                  ? 'Set an amount'
                  : !splitAddsUp
                    ? shortBy > 0
                      ? `${formatMoney(shortBy)} still to allocate`
                      : `${formatMoney(Math.abs(shortBy) as Money)} too much allocated`
                    : existing === undefined
                      ? 'Add this rule'
                      : 'Save'
            }
            variant="primary"
            disabled={!canSave || busy}
            onPress={save}
          />
          {existing !== undefined && (
            <Button
              label="Remove this rule"
              variant="destructive"
              onPress={() => {
                if (forClub && club !== null) {
                  void setClubRules(
                    club.id,
                    club.rules.filter((r) => r.id !== rule.id),
                  );
                } else {
                  void deleteRule(rule.id);
                }
                router.back();
              }}
            />
          )}
        </>
      }
    >
      <Section label="Called">
        <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <TextInput
            value={rule.name}
            onChangeText={(name) => set({ name })}
            placeholder="What the group calls it"
            placeholderTextColor={t.muted}
            style={[styles.inputText, { color: t.text }]}
          />
        </View>
      </Section>

      <Section label="How much">
        {isBill ? (
          <Text style={[styles.explain, { color: t.muted }]}>
            The real bill: {formatMoney(ledger.totalExpenses)} so far. A bill covers what was
            actually spent, so there is no amount to type — a percentage of a specific receipt
            would not mean anything.
          </Text>
        ) : (
          <>
            <View style={styles.figureRow}>
              <Text style={[styles.figure, { color: t.text }]}>
                {percent ? rule.amount : formatMoney(rule.amount)}
              </Text>
              <Text style={[styles.figureUnit, { color: t.muted }]}>
                {percent ? '% of the win' : 'in total'}
              </Text>
            </View>

            <Segment
              options={[
                { key: 'percent', label: 'A share of the win' },
                { key: 'fixed', label: 'A fixed sum' },
              ]}
              value={rule.amountKind}
              onChange={(k) =>
                set(
                  k === 'percent'
                    ? { amountKind: 'percent', amount: money(10), charge: 'winners_only' }
                    : { amountKind: 'fixed', amount: money(100) },
                )
              }
            />

            <View style={styles.presets}>
              {(percent ? [5, 10, 15] : [100, 200, 500]).map((v) => (
                <Button
                  key={v}
                  label={percent ? `${v}%` : formatMoney(money(v))}
                  variant="preset"
                  selected={rule.amount === v}
                  onPress={() => set({ amount: money(v) })}
                  style={styles.preset}
                />
              ))}
              <View style={[styles.setBox, { borderColor: t.quietOutline }]}>
                <TextInput
                  value={String(rule.amount)}
                  onChangeText={(v) => set({ amount: money(Math.max(0, Number(v.replace(/\D/g, '')) || 0)) })}
                  // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
                  // to a digits-only keyboard.
                  testID="amount"
                  keyboardType="number-pad"
                  style={[styles.setText, { color: t.text }]}
                />
              </View>
            </View>
          </>
        )}
      </Section>

      <Section label="Charged to">
        <Radio
          on={rule.charge === 'winners_only'}
          label={percent ? 'Winners, off their net win' : 'The winners'}
          onPress={() => set({ charge: 'winners_only' })}
        />
        <Radio
          on={rule.charge === 'everyone_flat'}
          label="Everyone at the table"
          disabled={percent}
          hint={percent ? 'A percentage of a loss is not a thing' : undefined}
          onPress={() => set({ charge: 'everyone_flat', split: 'evenly' })}
        />
      </Section>

      {!percent && (
        <Section label="Split">
          <Segment
            options={[
              { key: 'evenly', label: 'Evenly' },
              { key: 'by_percent', label: 'By win size' },
              { key: 'custom', label: 'By hand' },
            ]}
            value={rule.split}
            onChange={(k) =>
              set({
                split: k as MoneyRule['split'],
                customShares:
                  k === 'custom'
                    ? players.map((p) => ({ playerId: p.id, amount: money(0) }))
                    : undefined,
              })
            }
          />

          {rule.split === 'custom' && (
            <View style={styles.shares}>
              <Text style={[styles.explain, { color: t.muted }]}>
                Type what each person covers. This is also how ONE person covers the whole thing,
                and the only split that may charge somebody who did not win.
              </Text>

              {players.map((p) => (
                <View
                  key={p.id}
                  style={[styles.shareRow, { borderBottomColor: t.hairline }]}
                >
                  <Text style={[styles.shareName, { color: t.text }]}>{p.name}</Text>
                  <View style={[styles.shareBox, { borderColor: t.hairline, backgroundColor: t.surface }]}>
                    <TextInput
                      value={String(shares.find((c) => c.playerId === p.id)?.amount ?? 0)}
                      // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
                      // to a digits-only keyboard.
                      testID="amount"
                      keyboardType="number-pad"
                      onChangeText={(v) =>
                        set({
                          customShares: (
                            rule.customShares ??
                            players.map((q) => ({ playerId: q.id, amount: money(0) }))
                          ).map((c) =>
                            c.playerId === p.id
                              ? { ...c, amount: money(Math.max(0, Number(v.replace(/\D/g, '')) || 0)) }
                              : c,
                          ),
                        })
                      }
                      style={[styles.shareInput, { color: t.text }]}
                    />
                  </View>
                </View>
              ))}

              <Text
                style={[
                  styles.total,
                  { color: shortBy === 0 ? t.win : t.loss },
                ]}
              >
                {formatMoney(money(typed))} of {formatMoney(target)}
                {shortBy === 0
                  ? ' · adds up'
                  : shortBy > 0
                    ? ` · ${formatMoney(shortBy)} left`
                    : ` · ${formatMoney(Math.abs(shortBy) as Money)} too much`}
              </Text>
            </View>
          )}
        </Section>
      )}

      <Section label="Taken from">
        <Segment
          options={[
            { key: 'gross', label: 'The gross win' },
            { key: 'net_after_others', label: 'What is left after the others' },
          ]}
          value={rule.basis}
          onChange={(k) => set({ basis: k as MoneyRule['basis'] })}
        />
        <Text style={[styles.explain, { color: t.muted }]}>
          Rules run in order. "What is left" means this one is taken after the rules above it have
          already come off, which is how a piggy bank ends up smaller than the same percentage of the
          gross.
        </Text>
      </Section>

      {!isBill && (
        <Section label="Collected by">
          <View style={styles.chips}>
            {night.players.map((p) => {
              const on = rule.collectorPlayerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => set({ collectorPlayerId: on ? '' : p.id })}
                  style={[
                    styles.chip,
                    on
                      ? { backgroundColor: t.text, borderColor: t.text }
                      : { backgroundColor: t.surface, borderColor: t.hairline },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: on ? t.onFill : t.text }]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.explain, { color: t.muted }]}>
            Whoever physically holds this money. They need not be playing — a treasurer who never
            sits down is exactly this. Leave it unset and it is held by the group.
          </Text>
        </Section>
      )}
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: t.muted }]}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Segment({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: string; label: string }>;
  value: string;
  onChange: (key: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segment, { borderColor: t.quietOutline }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.segmentItem, on && { backgroundColor: t.text }]}
          >
            <Text
              style={[
                on ? styles.segmentOn : styles.segmentOff,
                { color: on ? t.onFill : t.muted },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Radio({
  on,
  label,
  hint,
  disabled = false,
  onPress,
}: {
  on: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.radioRow,
        on
          ? { backgroundColor: t.surface, borderColor: t.text }
          : { borderColor: t.hairline },
        disabled && { opacity: 0.4 },
      ]}
    >
      <View
        style={[
          styles.radio,
          on ? { borderColor: t.text, borderWidth: 5 } : { borderColor: t.muted, borderWidth: 1.5 },
        ]}
      />
      <View style={styles.radioText}>
        <Text style={[styles.radioLabel, { color: on ? t.text : t.muted }]}>{label}</Text>
        {hint !== undefined && (
          <Text style={[styles.radioHint, { color: t.muted }]}>{hint}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: space.page, marginBottom: 20 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  sectionBody: { gap: 8 },

  input: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.pressable, borderWidth: StyleSheet.hairlineWidth },
  inputText: { fontSize: 17, fontWeight: '600', padding: 0 },

  figureRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 4, paddingBottom: 8 },
  figure: { fontSize: 56, fontWeight: '800', letterSpacing: -2.24, lineHeight: 54, fontVariant: ['tabular-nums'] },
  figureUnit: { fontSize: 26, fontWeight: '700', paddingBottom: 4 },

  presets: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, height: 44, paddingHorizontal: 0 },
  setBox: {
    flex: 1,
    height: 44,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setText: { fontSize: 16, fontWeight: '700', textAlign: 'center', width: '100%', padding: 0 },

  segment: { flexDirection: 'row', borderRadius: radius.pressable, borderWidth: 1.5, overflow: 'hidden' },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 6 },
  segmentOn: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  segmentOff: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  radio: { width: 17, height: 17, borderRadius: 9 },
  radioText: { flexShrink: 1, gap: 2 },
  radioLabel: { fontSize: 15, fontWeight: '600' },
  radioHint: { ...type.footnote },

  shares: { gap: 4, paddingTop: 4 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shareName: type.rowName,
  shareBox: {
    marginLeft: 'auto',
    minWidth: 96,
    borderRadius: radius.pressable,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  shareInput: { fontSize: 16, fontWeight: '700', textAlign: 'right', padding: 0, fontVariant: ['tabular-nums'] },
  total: { fontSize: 13.5, fontWeight: '600', paddingHorizontal: 4, paddingTop: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.pressable, borderWidth: 1 },
  chipLabel: { fontSize: 15, fontWeight: '600' },

  explain: { ...type.footnote, paddingHorizontal: 4 },
});
