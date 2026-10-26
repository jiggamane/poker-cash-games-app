import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AREAS,
  RULES_EDITION,
  TABLE_RULE_KEYS,
  inArea,
  tableRuleLabel,
  tableRuleValue,
  type Situation,
  type TableRuleKey,
} from '@poker-club/core';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { useClub } from '../src/lib/clubStore';
import { formatMoney, useMoneySymbol } from '../src/lib/money';
import { rulesSheetText } from '../src/lib/rulings/rulesSheet';
import { searchSituations } from '../src/lib/rulings/search';

/**
 * Rules — the library as a place. `docs/rulings.md` § 2.1 and § 3.2.
 *
 * A PUSH from Settings (Chrome A, back → Settings): a reference you browse
 * and stay in. Club → Settings → Rules is two pushes below the root, which is
 * the limit, so nothing pushes from here — a situation opens as a sheet and
 * the group's parameters are edited on a sheet.
 *
 * Search first, because a host who knows what happened types two words; then
 * every area in order; then the group's own rules and the printable. Nothing
 * here is drawn by a board — every string is UNSURE per `docs/rulings.md`
 * § 10 — and nothing here adjudicates: a situation is read, never recorded.
 */
export default function Rules() {
  const t = useTheme();
  const club = useClub();
  const symbol = useMoneySymbol();
  const [query, setQuery] = useState('');
  /* Where back goes, for the screen reader: Settings as before, or Poker tools
     since the home grid (25 October) reaches the library through it. */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const backTo = from === 'tonight' ? 'Tonight' : from === 'tools' ? 'Poker tools' : 'Settings';

  const results = useMemo(() => searchSituations(query), [query]);
  const searching = query.trim().length > 0;

  const open = (s: Situation) => router.push({ pathname: '/situation', params: { id: s.id } });

  async function share() {
    if (club === null) return;
    try {
      await Share.share({ message: rulesSheetText(club.name, club.tableRules, symbol) });
    } catch {
      // The share sheet was dismissed, or the platform has none. Nothing to say.
    }
  }

  return (
    <Screen title="Rules" backTo={backTo} meta={`cash game first · edition ${RULES_EDITION}`}>
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="What happened?"
          placeholderTextColor={t.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search the rules"
          style={[styles.search, { color: t.text, backgroundColor: t.surface }]}
        />
      </View>

      {searching ? (
        <View style={styles.list}>
          {results.length === 0 ? (
            <Text style={[styles.empty, { color: t.muted }]}>
              Nothing in the library matches. Try the word a player would use.
            </Text>
          ) : (
            results.map((s, i) => (
              <Row key={s.id} label={s.title} onPress={() => open(s)} last={i === results.length - 1} />
            ))
          )}
        </View>
      ) : (
        <>
          {AREAS.map((area) => {
            const rows = inArea(area.id);
            return (
              <View key={area.id} style={styles.list}>
                <Text style={[styles.sectionLabel, { color: t.muted }]}>{area.label}</Text>
                {rows.map((s, i) => (
                  <Row key={s.id} label={s.title} onPress={() => open(s)} last={i === rows.length - 1} />
                ))}
              </View>
            );
          })}

          {/*
           * The group's own parameters, as the answers read them. A row with no
           * value is one the group has never set, and the answers say so in as
           * many words — amber is the app's tone for a thing waiting on somebody.
           */}
          <View style={styles.list}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>Your rules</Text>
            {club !== null &&
              TABLE_RULE_KEYS.map((key: TableRuleKey) => {
                const value =
                  key === 'buyIn' && club.tableRules.buyIn === null
                    ? `Standard ${formatMoney(club.defaultBuyIn)}`
                    : tableRuleValue(key, club.tableRules, symbol);
                return (
                  <Row
                    key={key}
                    label={tableRuleLabel(key)}
                    value={value ?? 'Not set'}
                    valueTone={value === null ? 'amber' : 'set'}
                    onPress={() => router.push('/table-rules')}
                  />
                );
              })}
            <Row label="Share the rules sheet" onPress={() => void share()} last />
          </View>
        </>
      )}
    </Screen>
  );
}

function Row({
  label,
  value,
  valueTone = 'set',
  onPress,
  last = false,
}: {
  label: string;
  value?: string;
  valueTone?: 'set' | 'amber';
  onPress: () => void;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: t.hairline,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: t.text }]} numberOfLines={2}>
        {label}
      </Text>
      {value !== undefined && (
        <Text
          style={[
            styles.value,
            valueTone === 'amber' ? { color: t.amber } : { color: t.text, fontWeight: '600' },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
      <View style={value === undefined ? styles.chevron : undefined}>
        <Icon name="chevron" color={t.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchWrap: { marginHorizontal: space.page, marginTop: 4, marginBottom: 6 },
  search: {
    ...type.body,
    borderRadius: radius.pressable + 4,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingTop: 14, paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 4,
  },
  label: { ...type.rowName, flexShrink: 1 },
  value: { ...type.meta, marginLeft: 'auto', flexShrink: 1, fontVariant: ['tabular-nums'] },
  chevron: { marginLeft: 'auto' },
  empty: { ...type.lede, paddingHorizontal: 4, paddingVertical: 14 },
});
