import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AREAS,
  RULES_EDITION,
  boundKeys,
  citationLabel,
  resolveAnswer,
  situationById,
  tableRuleLabel,
  tableRuleValue,
} from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Pill } from '../src/components/Pill';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { useClub } from '../src/lib/clubStore';
import { useMoneySymbol } from '../src/lib/money';

/**
 * A situation — one answer, read at the table. `docs/rulings.md` § 3.3.
 *
 * A SHEET: one thing, read it and swipe back. The answer is the body, in
 * plain prose the host reads aloud. Under it, the group's own rule for every
 * parameter the answer reads, with Change; the source, cited and never
 * quoted; and the tournament note, collapsed, only where the ruling differs.
 *
 * NOTHING IS SAVED. The owner's decision (`docs/rulings.md` § 1 item 7 and
 * § 8): the library is reference. There is no Record, no Decided by, and no
 * name on the screen.
 *
 * THE PILL IS UNDER THE QUESTION, not in the title row, which departs from
 * `Pill.tsx`'s own rule on purpose (§ 3.3): the question is the title here and
 * runs to three lines, and a pill beside a three-line title floats. The
 * VERIFIED pill is green in the LIVE badge's treatment — the owner's call
 * against the token file's green-is-money rule. Until the owner verifies an
 * answer it wears DRAFT in the muted tone instead, in the same place.
 *
 * `related` replaces this sheet's content in place (`setParams`) rather than
 * raising a second sheet: a sheet never pushes, and two is the floor.
 */
export default function SituationSheet() {
  const t = useTheme();
  const club = useClub();
  const symbol = useMoneySymbol();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [tournamentOpen, setTournamentOpen] = useState(false);

  const s = id === undefined ? undefined : situationById(id);
  if (s === undefined || club === null) {
    return <Sheet title="Rules">{null}</Sheet>;
  }

  const area = AREAS.find((a) => a.id === s.area)?.label ?? s.area;
  const body = resolveAnswer(s.cash.body, club.tableRules, symbol);
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const binds = boundKeys(s.cash.body);

  return (
    <Sheet title={s.title}>
      <View style={styles.status}>
        {s.status === 'verified' ? <Pill label="✓ Verified" tone="win" /> : <Pill label="Draft" tone="muted" />}
        <Text style={[styles.statusText, { color: t.muted }]} numberOfLines={1}>
          {`${area} · edition ${RULES_EDITION}`}
        </Text>
      </View>

      <View style={styles.answer}>
        {paragraphs.map((p, i) => (
          <Text key={i} style={[styles.paragraph, { color: t.text }]}>
            {p}
          </Text>
        ))}
      </View>

      {binds.length > 0 && (
        <View style={[styles.card, { backgroundColor: t.surface }]}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>Your group</Text>
          {binds.map((key) => {
            const value = tableRuleValue(key, club.tableRules, symbol);
            return (
              <View key={key} style={styles.kv}>
                <Text style={[styles.kvLabel, { color: t.text }]} numberOfLines={2}>
                  {tableRuleLabel(key)}
                </Text>
                <Text
                  style={[styles.kvValue, value === null ? { color: t.amber } : { color: t.text }]}
                  numberOfLines={1}
                >
                  {value ?? 'Not set'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace('/table-rules')}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={[styles.change, { color: t.text }]}>Change</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.source}>
        <Text style={[styles.cardLabel, { color: t.muted }]}>Source</Text>
        <Text style={[styles.sourceText, { color: t.muted }]}>
          {s.cash.source.map(citationLabel).join(' · ')}
        </Text>
      </View>

      {s.tournament !== undefined && (
        <View style={[styles.tournament, { borderTopColor: t.hairline, borderBottomColor: t.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: tournamentOpen }}
            onPress={() => setTournamentOpen((o) => !o)}
            style={({ pressed }) => [styles.disclosure, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.disclosureLabel, { color: t.muted }]}>Different in a tournament</Text>
            <View style={styles.chevron}>
              <Icon name={tournamentOpen ? 'chevronDown' : 'chevron'} color={t.muted} />
            </View>
          </Pressable>
          {tournamentOpen && (
            <View style={styles.tournamentBody}>
              <Text style={[styles.tournamentNote, { color: t.muted }]}>{s.tournament.note}</Text>
              <Text style={[styles.sourceText, { color: t.dim }]}>
                {s.tournament.source.map(citationLabel).join(' · ')}
              </Text>
            </View>
          )}
        </View>
      )}

      {s.related.length > 0 && (
        <View style={styles.related}>
          <Text style={[styles.cardLabel, { color: t.muted }]}>See also</Text>
          {s.related.map((rid) => {
            const r = situationById(rid);
            if (r === undefined) return null;
            return (
              <Pressable
                key={rid}
                accessibilityRole="button"
                onPress={() => {
                  setTournamentOpen(false);
                  router.setParams({ id: rid });
                }}
                style={({ pressed }) => [styles.relatedRow, { borderTopColor: t.hairline, opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.relatedLabel, { color: t.text }]} numberOfLines={2}>
                  {r.title}
                </Text>
                <View style={styles.chevron}>
                  <Icon name="chevron" color={t.muted} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.page,
    paddingTop: 2,
    paddingBottom: 14,
  },
  statusText: { ...type.sheetSub, flexShrink: 1 },
  answer: { paddingHorizontal: space.page, gap: 14, paddingBottom: 6 },
  paragraph: { fontSize: 17, fontWeight: '500', lineHeight: 25 },
  card: {
    marginHorizontal: space.card,
    marginTop: 8,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  cardLabel: { ...type.sectionLabel },
  kv: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kvLabel: { ...type.rowName, flex: 1, minWidth: 0 },
  kvValue: { ...type.body, fontWeight: '500', fontSize: 15, flexShrink: 1 },
  change: { fontSize: 15, fontWeight: '700' },
  source: { paddingHorizontal: space.page, paddingTop: 14, gap: 4 },
  sourceText: { ...type.meta, lineHeight: 19 },
  tournament: {
    marginHorizontal: space.page,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  disclosure: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4 },
  disclosureLabel: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  chevron: { marginLeft: 'auto' },
  tournamentBody: { paddingHorizontal: 4, paddingBottom: 14, gap: 6 },
  tournamentNote: { fontSize: 14.5, lineHeight: 21 },
  related: { paddingHorizontal: space.page, paddingTop: 14, paddingBottom: 8 },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  relatedLabel: { ...type.rowName, flexShrink: 1 },
});
