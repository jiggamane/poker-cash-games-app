import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { resolveLedger, type MoneyRule, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, saveRule, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Piggy bank rules — L6. 11-bill-and-piggy-bank.md.
 *
 * Its own screen off the house rules, and NEVER off the bill: the piggy bank is not
 * a spend, it is a cut of winnings that carries over to the next game. The two
 * only look alike because both take money off the table.
 *
 * The card states the rule and shows NO TOTAL. While the game runs there are no
 * winners, so 5% of the wins is not a number that exists yet — it is counted
 * once, at settle-up.
 *
 * "Off for tonight" reads backwards on purpose: the FILLED chip is the player
 * switched off. Everyone else stays at full strength and nobody is greyed,
 * because the people paying into the piggy bank are not disabled.
 *
 * NOTHING HERE IS WRITTEN UNTIL SAVE. L6 draws one button and the screen is
 * why: taking a person out of the piggy bank is an argument being settled at
 * the table — someone brought the food, someone else is already out — and it
 * is normal to switch two names and put one back. Writing each tap through
 * meant the ledger moved under a conversation that had not finished, and the
 * only way back was to remember what it used to be.
 */

/** What the screen is holding, before it is written. Null until something is touched. */
interface Draft {
  active: boolean;
  exempt: readonly PlayerId[];
}

export default function PiggyBankRules() {
  const t = useTheme();
  const night = useNight();
  const [busy, setBusy] = useState(false);
  /*
   * The draft OVERLAYS the rule rather than copying it at mount. A sheet can
   * be built before the night has come off the device, and a copy taken then
   * is a copy of nothing — it would show the rule's defaults, let them be
   * saved, and quietly overwrite what the group actually agreed.
   */
  const [draft, setDraft] = useState<Draft | null>(null);

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);
  const rule = night?.rules.find((r) => r.destination === 'kitty');

  if (night === null || ledger === null) return <Sheet title="The piggy bank">{null}</Sheet>;

  if (rule === undefined) {
    return (
      <Sheet title="The piggy bank" sub="nothing is taken for a piggy bank tonight" sentence>
        <Text style={[styles.none, { color: t.muted }]}>
          This group has no piggy bank rule. Add one in the money rules and it will appear here, with
          who collects it and who is sitting out of it tonight.
        </Text>
      </Sheet>
    );
  }

  const shown: Draft = draft ?? { active: rule.active, exempt: rule.exemptPlayerIds ?? [] };
  const exempt = new Set(shown.exempt);
  const seated = standingsOf(night, ledger).filter((s) => s.played);

  const changed =
    shown.active !== rule.active ||
    shown.exempt.length !== (rule.exemptPlayerIds ?? []).length ||
    shown.exempt.some((id) => !(rule.exemptPlayerIds ?? []).includes(id));

  function setExempt(id: PlayerId, off: boolean) {
    const next = new Set(shown.exempt);
    if (off) next.add(id);
    else next.delete(id);
    setDraft({ active: shown.active, exempt: [...next] });
  }

  async function save() {
    if (busy || rule === undefined || !changed) return;
    setBusy(true);
    try {
      // One write. The switch and the chips are one decision about tonight,
      // and saving them separately would leave a half-applied rule behind if
      // the second write failed.
      await saveRule({ ...rule, active: shown.active, exemptPlayerIds: shown.exempt });
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="The piggy bank"
      badge="admin only"
      footer={
        <Button
          label="Save for tonight"
          variant="primary"
          disabled={busy || !changed}
          onPress={() => void save()}
        />
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardLeft}>
          <Text style={[styles.label, { color: t.muted }]}>Charged on every win</Text>
          <Text style={[styles.figure, { color: t.text }]}>{rate(rule)}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.who, { color: t.muted }]}>
            {rule.charge === 'winners_only' ? 'winners only' : 'everyone at the table'}
          </Text>
          <Text style={[styles.when, { color: t.dim }]}>counted at settle-up</Text>
        </View>
      </View>

      <View style={styles.rows}>
        <View style={[styles.row, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.rowLabel, { color: t.text }]}>Piggy bank on tonight</Text>
          <Switch
            value={shown.active}
            disabled={busy}
            onValueChange={(on) => setDraft({ active: on, exempt: shown.exempt })}
            trackColor={{ true: t.win, false: t.quietOutline }}
            thumbColor="#FFFFFF"
            style={styles.switch}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.rowLabel, { color: t.text }]}>Charge</Text>
          <Text style={[styles.rowValue, { color: t.muted }]}>{charge(rule)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.text }]}>Who collects</Text>
          <Text style={[styles.rowValue, { color: t.muted }]}>
            {nameOf(night, rule.collectorPlayerId)}
          </Text>
        </View>
      </View>

      <View style={styles.block}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Off for tonight</Text>
        <View style={styles.chips}>
          {seated.map((p) => {
            const off = exempt.has(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: off }}
                accessibilityLabel={`${p.name}${off ? ' is out of the piggy bank tonight' : ' pays into the piggy bank'}`}
                disabled={busy}
                onPress={() => setExempt(p.id, !off)}
                style={({ pressed }) => [
                  styles.chip,
                  off
                    ? { backgroundColor: t.text, borderColor: t.text }
                    : { borderColor: t.quietOutline },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.chipLabel, { color: off ? t.onFill : t.text }]}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.explain, { color: t.muted }]}>
          A filled name is sitting this one out. Switching someone off applies to this night only
          and never touches the group’s own setting. The piggy bank is charged on wins, so a player
          who finishes down never pays into it.
        </Text>
      </View>
    </Sheet>
  );
}

const rate = (rule: MoneyRule): string =>
  rule.amountKind === 'percent' ? `${rule.amount}%` : `$${rule.amount.toLocaleString('en-US')}`;

const charge = (rule: MoneyRule): string =>
  rule.amountKind === 'percent'
    ? `${rule.amount}% of each ${rule.basis === 'gross' ? 'win' : 'win after the bill'}`
    : `$${rule.amount.toLocaleString('en-US')} each`;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  cardLeft: { gap: 8 },
  label: type.tableLabel,
  figure: type.tableFigure,
  cardRight: { marginLeft: 'auto', alignItems: 'flex-end', gap: 3 },
  who: type.tableTotal,
  when: type.tableSeats,

  rows: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: type.rowName,
  rowValue: { ...type.meta, marginLeft: 'auto' },
  switch: { marginLeft: 'auto' },

  block: { marginTop: 24, marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.pressable, borderWidth: 1.5 },
  chipLabel: { fontSize: 14.5, fontWeight: '600' },
  explain: { ...type.footnote, marginTop: 12, paddingHorizontal: 4 },

  none: { ...type.footnote, marginHorizontal: space.page },
});
