import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { resolveLedger } from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { Card, CardRow, Chip, SectionLabel } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
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
      {/* THE FULL BOARD (`pick`, approved 22 November): the seated players
          as one card of rows (names only, no avatars, no chevrons), the rest
          of the group as lifted chips with the dashed New player. */}
      <View style={styles.body}>
        <SectionLabel text={cashingOut ? 'At the table' : 'At the table · rebuy'} quiet />

        {rows.length > 0 && (
          <Card>
            {rows.map((p, i) => (
              <CardRow
                key={p.id}
                last={i === rows.length - 1}
                onPress={() => go(p.id, cashingOut ? 'cashout' : 'rebuy')}
                name={p.name}
                meta={depthOf(ledger, p.id)}
                amount={formatMoney(p.boughtIn)}
              />
            ))}
          </Card>
        )}

        {rows.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            {cashingOut
              ? 'Nobody has chips on the table.'
              : 'Nobody has bought in yet — seat someone below.'}
          </Text>
        )}

        {!cashingOut && (
          <>
            <SectionLabel text="Not at the table · buy in" quiet />
            <View style={styles.chips}>
              {notSeated.map((p) => (
                <Chip key={p.id} label={p.name} onPress={() => go(p.id, p.played ? 'rebuy' : 'buyin')} />
              ))}
              <Chip label="New player" dashed onPress={() => router.push('/seat')} lead={<Icon name="plus" color={t.text} size={16} />} />
            </View>
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 6, gap: 12 },
  empty: { fontSize: 13, lineHeight: 19, paddingHorizontal: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
