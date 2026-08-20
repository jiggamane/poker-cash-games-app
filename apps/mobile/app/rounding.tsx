import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatMoney,
  granularityOf,
  money,
  resolveLedger,
  ROUNDING_CHOICES,
  roundingLabel,
  settle,
  type Money,
  type RoundingMode,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { block, space, type } from '../src/design/tokens';
import { setClubRounding, useClub } from '../src/lib/clubStore';
import { setNightRounding, settlementInput, useNight } from '../src/lib/nightStore';
import { useIsAdmin } from '../src/lib/whoIsReading';

/**
 * Rounding — how coarsely the group settles.
 *
 * A MONEY RULE, NOT A DISPLAY SETTING, which is the whole reason it is a sheet
 * with a Save rather than a toggle in a list: it changes what people actually
 * pay. A group playing for thousands does not want to be handed a bill share of
 * $56 and a piggy-bank charge of $81, and doing that arithmetic in somebody's
 * head at 1am is how a settle-up turns into an argument.
 *
 * It governs every rule at once — the bill and the piggy bank alike — so it
 * sits beside the rules rather than inside one. Rev 18's S14 draws it as an
 * open chip row and names the chips: Cent · Dollar · 10s · 50s · 100s · 1k.
 * Four are offered here, per `ROUNDING_CHOICES` in core.
 *
 * WHAT IT NEVER TOUCHES is said on the screen, because it is the first thing a
 * host will ask: a chip count is a chip count and a gross result follows from
 * it. Rounding a result would be inventing or destroying money. What is rounded
 * is a DIVISION — what a rule takes off the winners — and the parts still add
 * back up to the whole, so the bar is owed exactly what the bar is owed.
 */
export default function Rounding() {
  const t = useTheme();
  const club = useClub();
  const night = useNight();
  const admin = useIsAdmin();
  const { scope } = useLocalSearchParams<{ scope?: 'club' | 'night' }>();
  const forClub = scope === 'club';

  const current: RoundingMode | null = forClub
    ? (club?.roundingMode ?? null)
    : (night?.roundingMode ?? null);

  const [picked, setPicked] = useState<RoundingMode | null>(null);
  const [busy, setBusy] = useState(false);
  const choice: RoundingMode = picked ?? current ?? 'dollars';

  if (night === null && !forClub) return <Sheet title="Rounding">{null}</Sheet>;

  /*
   * WHAT IT WOULD DO TONIGHT, off the engine rather than off a formula written
   * here. A number a host can compare against the one on the deductions screen
   * is worth more than any amount of explaining, and the rule in `CLAUDE.md` is
   * that a screen never does its own arithmetic.
   */
  const preview = (mode: RoundingMode): Money | null => {
    if (night === null) return null;
    try {
      return settle({ ...settlementInput(night), roundingMode: mode }).totalOffTable;
    } catch {
      return null;
    }
  };

  const now = preview(choice);
  const unchanged = (picked ?? current) === current;

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const mode = choice === 'dollars' ? null : choice;
      if (forClub && club !== null) await setClubRounding(club.id, mode);
      else await setNightRounding(mode);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  /* A power the reader does not have is removed, not disabled. */
  if (!admin) {
    return (
      <Sheet
        title="Rounding"
        sub={roundingLabel(current)}
        footer={<Button label="Close" variant="secondary" onPress={() => router.back()} />}
      >
        <Text style={[styles.note, { color: t.muted }]}>
          {sentence(current)}
        </Text>
        <Text style={[styles.note, { color: t.muted }]}>
          Only the person who runs the group can change it.
        </Text>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Rounding"
      badge="admin only"
      sub={
        forClub
          ? 'how coarsely every new night settles'
          : 'how coarsely tonight settles, once the rules are applied'
      }
      footer={
        <Button
          label={unchanged ? 'Saved' : `Settle to the ${chipOf(choice).toLowerCase()}`}
          variant="primary"
          disabled={busy || unchanged}
          onPress={() => void save()}
        />
      }
    >
      <View style={styles.chips}>
        {ROUNDING_CHOICES.map((c) => (
          <View key={c.mode} style={styles.chipSlot}>
            <Button
              label={c.chip}
              variant="preset"
              selected={c.mode === choice}
              onPress={() => setPicked(c.mode)}
              style={styles.chip}
            />
            <Text style={[styles.chipCaption, { color: c.mode === choice ? t.text : t.muted }]}>
              {c.mode === current ? 'NOW' : granularityOf(c.mode) === 1 ? '' : `×${granularityOf(c.mode)}`}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.value, { color: t.text }]}>{roundingLabel(choice)}</Text>
      <Text style={[styles.note, { color: t.muted }]}>{sentence(choice)}</Text>

      {now !== null && (
        <View style={[styles.block, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <Text style={[styles.blockTitle, { color: t.text }]}>Tonight, at this setting</Text>
          <Text style={[styles.blockBody, { color: t.muted }]}>
            {formatMoney(now)} would leave the table
            {compare(preview(current ?? 'dollars'), now)}
          </Text>
        </View>
      )}

      <View style={[styles.block, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Text style={[styles.blockTitle, { color: t.text }]}>What it does not touch</Text>
        <Text style={[styles.blockBody, { color: t.muted }]}>
          Nothing anybody counted. Buy-ins, cash-outs and the chips in front of a player are
          exactly what they were, and so is everyone’s result. What is rounded is what a rule
          takes off the winners — and the shares still add up to the whole, so a bill of{' '}
          {formatMoney(money(170))} is still a bill of {formatMoney(money(170))}.
        </Text>
      </View>

      {forClub && (
        <Text style={[styles.footnote, { color: t.muted }]}>
          The group’s default. A night copies it when it opens, so this reaches the next game and
          never the one being played.
        </Text>
      )}
    </Sheet>
  );
}

/** "Every share is worked out to the nearest 100." */
function sentence(mode: RoundingMode | null): string {
  return (mode ?? 'dollars') === 'dollars'
    ? 'Every share a rule takes is worked out to the dollar. This is what the app has always done.'
    : `Every share a rule takes is worked out to the nearest ${granularityOf(mode).toLocaleString('en-US')}.`;
}

const chipOf = (mode: RoundingMode): string =>
  ROUNDING_CHOICES.find((c) => c.mode === mode)?.chip ?? 'Dollar';

/** " · $6 more than now", or nothing at all when it makes no difference. */
function compare(before: Money | null, after: Money): string {
  if (before === null || before === after) return '';
  const gap = Math.abs(after - before) as Money;
  return ` · ${formatMoney(gap)} ${after > before ? 'more' : 'less'} than now`;
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: space.card, paddingBottom: 14 },
  chipSlot: { flex: 1, alignItems: 'center', gap: 3 },
  chip: { width: '100%' },
  chipCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 0.72, height: 12 },

  value: { fontSize: 20, fontWeight: '700', marginHorizontal: space.page, paddingHorizontal: 4 },
  note: {
    ...type.rowDetail,
    lineHeight: 20,
    marginHorizontal: space.page,
    marginTop: 6,
    paddingHorizontal: 4,
  },

  block: {
    marginTop: 14,
    marginHorizontal: space.card,
    paddingVertical: block.padV,
    paddingHorizontal: block.padH,
    borderWidth: 1,
    borderRadius: block.radius,
    gap: block.gap,
  },
  blockTitle: type.blockTitle,
  blockBody: type.blockBody,

  footnote: { ...type.footnote, marginTop: 16, marginHorizontal: space.page },
});
