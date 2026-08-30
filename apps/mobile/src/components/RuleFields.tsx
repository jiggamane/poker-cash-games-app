import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, money, type Money, type MoneyRule } from '@poker-club/core';
import { Button } from './Button';
import { useTheme } from '../design/useTheme';
import { radius, space, type } from '../design/tokens';

/** Who a rule can charge or be collected by, at whatever moment it is edited. */
export interface RulePerson {
  id: string;
  name: string;
}

/**
 * How much of a custom split is still unallocated. A bill covers whatever was
 * really spent; anything else covers its own stated amount — the same number
 * the engine checks against, so this screen can refuse before the engine has to.
 */
export const shortfallOf = (rule: MoneyRule, spent: Money): Money => {
  const target = rule.destination === 'bill' ? spent : rule.amount;
  const typed = (rule.customShares ?? []).reduce((a, c) => a + c.amount, 0);
  return (target - typed) as Money;
};

/**
 * What the Save button says, which is also whether it can be pressed.
 *
 * `null` means it can: every refusal names the thing that is missing, because
 * a disabled button with no reason is the one state a host cannot get out of.
 */
export function ruleProblem(rule: MoneyRule, spent: Money): string | null {
  if (rule.name.trim().length === 0) return 'Give it a name';
  if (rule.destination !== 'bill' && rule.amount <= 0) return 'Set an amount';
  if (rule.split !== 'custom') return null;
  const short = shortfallOf(rule, spent);
  if (short === 0) return null;
  return short > 0
    ? `${formatMoney(short)} still to allocate`
    : `${formatMoney(Math.abs(short) as Money)} too much allocated`;
}

/**
 * The rule editor's body — O5.
 *
 * Every setting here is one the group argues about at some point, so each is a
 * visible choice rather than a default hidden in code:
 *
 *   HOW MUCH   a percentage of each win, or a fixed sum to be shared out
 *   CHARGED TO the winners only, or everyone at the table
 *   SPLIT      evenly, in proportion to the win, or typed in by hand
 *
 * THERE IS NO "TAKEN FROM" HERE ANY MORE. It asked whether a rule came off the
 * gross win or off what the rules above it had left, and it was the one setting
 * on this sheet that nobody could answer without holding the whole order of the
 * rules in their head — three screens then had to explain the answer in words
 * ("off each win, after the other rules", "% of each win after the bill") and
 * one of them got it the wrong way round. Every rule is now taken off the gross
 * win, which is what every rule in the app has been set to since the sample
 * night. `MoneyRule.basis` survives in core and in the engine because it is
 * written into `book.rules` on the server: a night already stored as
 * `net_after_others` still settles exactly as it did, and reads back correctly.
 * Nothing in the interface writes it any more, and `draftRule` makes 'gross'.
 *
 * Two combinations are refused rather than left to fail later:
 *
 *   A PERCENTAGE CHARGED TO EVERYONE is meaningless — a percentage of a loss
 *   is not a thing, so the charge locks to winners the moment you pick one.
 *
 *   A SPLIT BY HAND MUST ADD UP. The engine throws if the typed shares do not
 *   total the amount being covered, so the caller refuses to save instead, and
 *   `ruleProblem` says how much is left.
 *
 * The fields live here rather than on the route because the same editor is
 * opened at three moments — from the club's defaults, from tonight's rules,
 * and from the setup sheet before a night exists — and only where the saved
 * rule lands differs. `people` is whoever can be charged or hold the money at
 * that moment: tonight's table, or the seats picked for a table not yet open.
 */
export function RuleFields({
  rule,
  onChange,
  people,
  collectors,
  spent,
}: {
  rule: MoneyRule;
  onChange: (patch: Partial<MoneyRule>) => void;
  /** Who can be CHARGED: the people playing. A split by hand is over these. */
  people: readonly RulePerson[];
  /**
   * Who can HOLD it — O6. A wider list than `people` and deliberately so: the
   * collector "need not be playing", and a treasurer who never sits down is
   * exactly the case the design names. Defaults to the players when the caller
   * has no wider roster to offer.
   */
  collectors?: readonly RulePerson[];
  /** What the bill has cost so far. Zero before a night has begun. */
  spent: Money;
}) {
  const t = useTheme();
  const isBill = rule.destination === 'bill';
  const percent = rule.amountKind === 'percent';
  const shares = rule.customShares ?? [];
  const typed = shares.reduce((a, c) => a + c.amount, 0);
  const target = isBill ? spent : rule.amount;
  const short = shortfallOf(rule, spent);

  return (
    <>
      <Section label="Called">
        <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <TextInput
            value={rule.name}
            onChangeText={(name) => onChange({ name })}
            placeholder="What the group calls it"
            placeholderTextColor={t.muted}
            style={[styles.inputText, { color: t.text }]}
          />
        </View>
      </Section>

      <Section label="How much">
        {isBill ? (
          <Text style={[styles.explain, { color: t.muted }]}>
            The real bill: {formatMoney(spent)} so far. A bill covers what was actually spent, so
            there is no amount to type — a percentage of a specific receipt would not mean anything.
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
                onChange(
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
                  onPress={() => onChange({ amount: money(v) })}
                  style={styles.preset}
                />
              ))}
              <View style={[styles.setBox, { borderColor: t.quietOutline }]}>
                <TextInput
                  value={String(rule.amount)}
                  onChangeText={(v) =>
                    onChange({ amount: money(Math.max(0, Number(v.replace(/\D/g, '')) || 0)) })
                  }
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
          onPress={() => onChange({ charge: 'winners_only' })}
        />
        <Radio
          on={rule.charge === 'everyone_flat'}
          label="Everyone at the table"
          disabled={percent}
          hint={percent ? 'A percentage of a loss is not a thing' : undefined}
          onPress={() => onChange({ charge: 'everyone_flat', split: 'evenly' })}
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
              onChange({
                split: k as MoneyRule['split'],
                customShares:
                  k === 'custom'
                    ? people.map((p) => ({ playerId: p.id, amount: money(0) }))
                    : undefined,
              })
            }
          />

          {rule.split === 'custom' && (
            <View style={styles.shares}>
              <Text style={[styles.explain, { color: t.muted }]}>
                Type what each person covers. This is also how ONE person covers the whole thing, and
                the only split that may charge somebody who did not win.
              </Text>

              {people.map((p) => (
                <View key={p.id} style={[styles.shareRow, { borderBottomColor: t.hairline }]}>
                  <Text style={[styles.shareName, { color: t.text }]}>{p.name}</Text>
                  <View
                    style={[styles.shareBox, { borderColor: t.hairline, backgroundColor: t.surface }]}
                  >
                    <TextInput
                      value={String(shares.find((c) => c.playerId === p.id)?.amount ?? 0)}
                      // A8: this is money. `scripts/ui-audit.mjs` holds every one of these
                      // to a digits-only keyboard.
                      testID="amount"
                      keyboardType="number-pad"
                      onChangeText={(v) =>
                        onChange({
                          customShares: (
                            rule.customShares ??
                            people.map((q) => ({ playerId: q.id, amount: money(0) }))
                          ).map((c) =>
                            c.playerId === p.id
                              ? {
                                  ...c,
                                  amount: money(Math.max(0, Number(v.replace(/\D/g, '')) || 0)),
                                }
                              : c,
                          ),
                        })
                      }
                      style={[styles.shareInput, { color: t.text }]}
                    />
                  </View>
                </View>
              ))}

              <Text style={[styles.total, { color: short === 0 ? t.win : t.loss }]}>
                {formatMoney(money(typed))} of {formatMoney(target)}
                {short === 0
                  ? ' · adds up'
                  : short > 0
                    ? ` · ${formatMoney(short)} left`
                    : ` · ${formatMoney(Math.abs(short) as Money)} too much`}
              </Text>
            </View>
          )}
        </Section>
      )}

      {!isBill && (
        <Section label="Collected by">
          <View style={styles.chips}>
            {(collectors ?? people).map((p) => {
              const on = rule.collectorPlayerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => onChange({ collectorPlayerId: on ? '' : p.id })}
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
    </>
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
              style={[on ? styles.segmentOn : styles.segmentOff, { color: on ? t.onFill : t.muted }]}
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
        on ? { backgroundColor: t.surface, borderColor: t.text } : { borderColor: t.hairline },
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
        {hint !== undefined && <Text style={[styles.radioHint, { color: t.muted }]}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: space.page, marginBottom: 20 },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  sectionBody: { gap: 8 },

  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputText: { fontSize: 17, fontWeight: '600', padding: 0 },

  figureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  figure: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2.24,
    lineHeight: 54,
    fontVariant: ['tabular-nums'],
  },
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

  segment: {
    flexDirection: 'row',
    borderRadius: radius.pressable,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 6,
  },
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
  shareInput: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  total: { fontSize: 13.5, fontWeight: '600', paddingHorizontal: 4, paddingTop: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.pressable,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 15, fontWeight: '600' },

  explain: { ...type.footnote, paddingHorizontal: 4 },
});
