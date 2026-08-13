import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney, formatSigned, resolveLedger, type Money } from '@poker-club/core';
import { Avatar } from '../src/components/Avatar';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { depthOf, standingsOf, useNight, type Standing } from '../src/lib/nightStore';

/**
 * Who is this about? — N4 for a buy-in, N8 for a cash out.
 *
 * One screen, because they are one screen: a list of the people it could be,
 * in the order a host would look for them. The difference is which people are
 * eligible and what the row's figure means, and both fall out of the ledger.
 *
 * A buy-in offers everyone at the table a rebuy and everyone else a first
 * buy-in, as chips, ending in the dashed one that makes a new player. A cash
 * out offers only people who have chips in front of them — you cannot cash out
 * of a game you are not in — and lists the ones already gone underneath, on a
 * green wash and not selectable, because cashing out is final for the night.
 *
 * Both are sheets: each ends with an act, and an act that finishes is what
 * makes a sheet rather than a push.
 */
export default function Pick() {
  const t = useTheme();
  const { kind } = useLocalSearchParams<{ kind: 'buyin' | 'cashout' }>();
  const cashingOut = kind === 'cashout';
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) return <Sheet title="Tonight">{null}</Sheet>;

  const standings = standingsOf(night, ledger);
  const seated = standings.filter((s) => s.atTable);
  const notSeated = standings.filter((s) => !s.atTable);
  /* Cashed out, as opposed to never seated: they played and then left. */
  const out = notSeated.filter((s) => s.played);
  /*
   * The chips are people who have not sat down tonight. A cashed-out player is
   * deliberately NOT among them — cashing out is final for the night, so
   * offering them a first buy-in would offer something the ledger refuses.
   */
  const bench = notSeated.filter((s) => !s.played);

  const go = (playerId: string, next: 'buyin' | 'rebuy' | 'cashout') =>
    router.push({ pathname: '/log', params: { player: playerId, kind: next } });

  /** When somebody left, and with how much. */
  const leftAt = (p: Standing): string => {
    const outs = ledger.entries.filter((e) => !e.voided && e.playerId === p.id && e.type === 'cashout');
    const last = outs[outs.length - 1];
    const at = last === undefined ? '' : clock(night.occurredAt[last.id]);
    return `cashed out ${at} · ${formatMoney(p.cashedOut)}`;
  };

  return (
    <Sheet
      title={cashingOut ? 'Who’s cashing out?' : 'Who’s playing?'}
      lede={
        cashingOut
          ? 'Count their chips, then the book records what they leave with.'
          : 'Pick someone at the table to add chips, or seat a player who isn’t in yet.'
      }
    >
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: t.muted }]}>
          {cashingOut ? `At the table · ${seated.length}` : 'At the table · rebuy'}
        </Text>

        {seated.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => go(p.id, cashingOut ? 'cashout' : 'rebuy')}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Avatar name={p.name} />
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: t.text }]}>{p.name}</Text>
              <Text style={[styles.detail, { color: t.muted }]}>{depthOf(ledger, p.id)}</Text>
            </View>
            <Text style={[styles.figure, { color: t.muted }]}>
              {cashingOut ? `in for ${formatMoney(p.boughtIn)}` : formatMoney(p.boughtIn)}
            </Text>
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}

        {seated.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            {cashingOut
              ? 'Nobody has chips on the table.'
              : 'Nobody has bought in yet — seat someone below.'}
          </Text>
        )}

        {cashingOut
          ? out.length > 0 && (
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: t.muted }]}>
                    Already out · {out.length}
                  </Text>
                </View>

                {out.map((p) => {
                  const net = (p.cashedOut - p.boughtIn) as Money;
                  return (
                    <View
                      key={p.id}
                      /* Not a Pressable: their result is set. */
                      style={[
                        styles.row,
                        styles.doneRow,
                        { borderBottomColor: t.hairline, backgroundColor: net >= 0 ? t.winWash : t.lossWash },
                      ]}
                    >
                      <Avatar name={p.name} />
                      <View style={styles.rowText}>
                        <Text style={[styles.name, { color: t.text }]}>{p.name}</Text>
                        <Text style={[styles.detail, { color: t.muted }]}>{leftAt(p)}</Text>
                      </View>
                      <Text style={[styles.figure, { color: moneyColor(t, net) }]}>
                        {formatSigned(net)}
                      </Text>
                      <Icon name="chevron" color={t.muted} />
                    </View>
                  );
                })}
              </>
            )
          : (
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: t.muted }]}>
                    Not seated · first buy-in
                  </Text>
                </View>

                <View style={styles.chips}>
                  {bench.map((p) => (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      onPress={() => go(p.id, 'buyin')}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: t.surface,
                          borderColor: t.hairline,
                          opacity: pressed ? 0.6 : 1,
                        },
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
                    <Icon name="plus" color={t.text} stroke={2.3} />
                    <Text style={[styles.chipLabel, { color: t.text }]}>New player</Text>
                  </Pressable>
                </View>
              </>
            )}
      </ScrollView>

      {cashingOut && (
        <Text style={[styles.footnote, { color: t.muted }]}>
          Cashing out is final for the night. Their chips are counted, their result is set, and they
          cannot buy back in.
        </Text>
      )}
    </Sheet>
  );
}

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  /* The 14 is the drawn sub-line's own bottom margin, which the sheet chrome
     does not carry: the gap below the sentence is the same as on the board. */
  list: { flex: 1, marginTop: 14, marginHorizontal: 22 },
  listContent: { paddingBottom: 8 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  section: { paddingTop: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  /* A finished row is a washed block, inset a little further than the rest. */
  doneRow: { borderRadius: 8, paddingHorizontal: 10 },
  rowText: { gap: 2, flexShrink: 1 },
  name: { fontSize: 17, fontWeight: '600' },
  detail: { fontSize: 12.5, fontWeight: '400' },
  figure: { fontSize: 16, fontWeight: '600', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  empty: { fontSize: 12.5, fontWeight: '400', lineHeight: 19, paddingHorizontal: 4, paddingVertical: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2, paddingHorizontal: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: 'transparent', gap: 7 },
  chipLabel: { fontSize: 15, fontWeight: '600' },

  footnote: { fontSize: 12.5, fontWeight: '400', lineHeight: 18.75, marginHorizontal: 22 },
});
