import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, resolveLedger } from '@poker-club/core';
import { Avatar } from '../src/components/Avatar';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { depthOf, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Who is this about? — N4 for a buy-in, N8 for a cash out.
 *
 * One screen, because they are one screen: a list of the people it could be,
 * in the order a host would look for them. The difference is which people are
 * eligible and what the row's figure means, and both fall out of the ledger.
 *
 * A buy-in offers everyone plus a way to seat someone new. A cash out offers
 * only people who have chips in front of them — you cannot cash out of a game
 * you are not in, and offering it would invite a night that does not add up.
 */
export default function Pick() {
  const t = useTheme();
  const { kind } = useLocalSearchParams<{ kind: 'buyin' | 'cashout' }>();
  const cashingOut = kind === 'cashout';
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) return <Sheet title="Tonight">{null}</Sheet>;

  const standings = standingsOf(night, ledger);

  // Cashing out is for people who actually have chips. Buying in is for people
  // who are already playing — everyone else goes in the row of chips below,
  // including anybody who busted out and wants back in.
  const rows = standings.filter((s) => s.atTable);
  const notSeated = standings.filter((s) => !s.atTable);

  /*
   * `from` tells the amount screen that the picker is part of THIS act rather
   * than a place to come back to. Pushed without it, logging a rebuy popped
   * one screen and landed the host back on "Who's playing?" — the entry made,
   * the picker still open, and nothing saying the money had gone in. Back from
   * the amount screen still returns here, which is the point of not simply
   * replacing this route: picking the wrong person has to be undoable.
   */
  const go = (playerId: string, kind: 'buyin' | 'rebuy' | 'cashout') =>
    router.push({ pathname: '/log', params: { player: playerId, kind, from: 'pick' } });

  return (
    <Sheet
      title={cashingOut ? 'Who’s cashing out?' : 'Who’s playing?'}
      sub={
        cashingOut
          ? 'Pick whoever is leaving the table. You will count their chips next.'
          : 'Pick someone at the table to add chips, or seat a player who isn’t in yet.'
      }
      sentence
    >
      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>
          {cashingOut ? 'At the table' : 'At the table · rebuy'}
        </Text>

        {rows.map((p, i) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => go(p.id, cashingOut ? 'cashout' : 'rebuy')}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Avatar name={p.name} />
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: t.text }]}>{p.name}</Text>
              <Text style={[styles.detail, { color: t.muted }]}>{depthOf(ledger, p.id)}</Text>
            </View>
            <Text style={[styles.figure, { color: t.muted }]}>
              {formatMoney(p.boughtIn)}
            </Text>
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}

        {rows.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            {cashingOut
              ? 'Nobody has chips on the table.'
              : 'Nobody has bought in yet — seat someone below.'}
          </Text>
        )}

        {!cashingOut && (
          <>
            <Text style={[styles.sectionLabel, styles.sectionAfter, { color: t.muted }]}>
              Not at the table · buy in
            </Text>

            <View style={styles.chips}>
              {notSeated.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => go(p.id, p.played ? 'rebuy' : 'buyin')}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: t.surface, borderColor: t.hairline, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: t.text }]}>{p.name}</Text>
                </Pressable>
              ))}

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/seat')}
                style={({ pressed }) => [
                  styles.chip,
                  styles.dashed,
                  { borderColor: t.dashed, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Icon name="plus" color={t.text} />
                <Text style={[styles.chipLabel, { color: t.text }]}>New player</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  sectionAfter: { paddingTop: 14 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  rowText: { gap: 2, flexShrink: 1 },
  name: type.rowName,
  detail: type.detail,
  figure: { fontSize: 16, fontWeight: '600', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  empty: { ...type.footnote, paddingHorizontal: 4, paddingVertical: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2, paddingHorizontal: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.pressable,
    borderWidth: 1,
  },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: 'transparent', gap: 7 },
  chipLabel: { fontSize: 15, fontWeight: '600' },
});
