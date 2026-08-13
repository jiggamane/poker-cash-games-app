import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, formatSigned, resolveLedger, type Money, type MoneyRule } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { HeaderPill, PushHeader } from '../src/components/PushHeader';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { depthOf, standingOf, useNight } from '../src/lib/nightStore';

/**
 * N3 · One player. A push — this is a place you can stay in, so it takes
 * Chrome A: the round back button, the name, the status pill beside it, and
 * "since 20:09" on the meta line beneath.
 *
 * Two figures side by side, and the right one is an EM DASH until their chips
 * are counted. That is the whole point of the screen: while a game is running
 * nobody's result is known, only what they have put in, and a page that showed
 * a running "net" would be inventing a number out of chips it has not seen.
 *
 * Underneath, every entry with the time it was made — which is what settles an
 * argument about whether somebody rebought before or after a hand — each with a
 * pencil that opens N10.
 *
 * Geometry, weights and copy are `screens-N3-N10.html`; only the header is new.
 */
export default function PlayerPage() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
        <PushHeader title="Player" />
      </SafeAreaView>
    );
  }

  const player = night.players.find((p) => p.id === id);
  if (player === undefined) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
        <PushHeader title="Player" />
        <Text style={[styles.note, { color: t.muted }]}>Nobody by that name tonight.</Text>
      </SafeAreaView>
    );
  }

  const standing = standingOf(night, ledger, player.id);
  const boughtIn = (standing?.boughtIn ?? 0) as Money;
  const stillIn = standing?.atTable === true;

  /*
   * What they have taken off the table: their cash-outs, plus the count in
   * front of them if they are still sitting there. Nothing at all until one of
   * those exists — a player mid-game has no result, only a stake.
   */
  const finalCount = night.finalCounts.get(player.id);
  const counted =
    stillIn
      ? finalCount === undefined
        ? undefined
        : ((finalCount + (standing?.cashedOut ?? 0)) as Money)
      : standing?.played === true
        ? ((standing.cashedOut ?? 0) as Money)
        : undefined;

  const mine = ledger.entries.filter((e) => e.playerId === player.id);
  const first = mine[0];

  const status =
    standing?.played !== true
      ? 'ON THE ROSTER'
      : stillIn
        ? standing.returned
          ? 'BACK IN'
          : 'SEATED'
        : standing.cashedOut === 0
          ? 'BUSTED OUT'
          : 'CASHED OUT';

  const rules = night.rules.filter((r) => r.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const note = chargeNote(rules);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.ground }]} edges={['top', 'bottom']}>
      <PushHeader
        title={player.name}
        badge={<HeaderPill label={status} quiet />}
        meta={first === undefined ? undefined : `since ${clock(night.occurredAt[first.id])}`}
      />

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.cardTop}>
          <View style={styles.figure}>
            <Text style={[styles.label, { color: t.muted }]}>Buy-in + rebuys</Text>
            <Text style={[styles.big, { color: t.text }]}>{formatMoney(boughtIn)}</Text>
          </View>
          <View style={[styles.figure, styles.right]}>
            <Text style={[styles.label, { color: t.muted }]}>Counted</Text>
            <Text style={[styles.big, { color: counted === undefined ? t.muted : t.text }]}>
              {counted === undefined ? '—' : formatMoney(counted)}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardNote, { color: t.muted }]}>
          {counted === undefined
            ? `Net is known once ${player.name}’s chips are counted, at cash-out or at the end of the night.`
            : 'Before the bill and the kitty, which come off at settle-up.'}
        </Text>

        {/* Undrawn state: N3 draws a player who is still seated. Once they are
            counted the em-dash becomes a figure, and the difference between the
            two is the number the room will ask for. */}
        {counted !== undefined && (
          <View style={[styles.net, { borderTopColor: t.hairline }]}>
            <Text style={[styles.netLabel, { color: t.text }]}>Chips against buy-ins</Text>
            <Text
              style={[styles.netFigure, { color: moneyColor(t, (counted - boughtIn) as Money) }]}
            >
              {formatSigned((counted - boughtIn) as Money)}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: t.muted }]}>
          {mine.length === 0 ? 'Nothing yet' : `${depthOf(ledger, player.id)} · when each was made`}
        </Text>

        {[...mine].reverse().map((e) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: t.hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.time, { color: t.muted }]}>{clock(night.occurredAt[e.id])}</Text>
            <Text style={[styles.what, { color: e.voided ? t.muted : t.text }]}>
              {e.type === 'buyin' ? 'Buy-in' : e.type === 'rebuy' ? 'Rebuy' : 'Cash out'}
              {e.voided ? ' · voided' : e.corrected ? ' · corrected' : ''}
            </Text>
            <Text style={[styles.amount, { color: t.text }]}>{formatMoney(e.amount)}</Text>
            <Icon name="pencil" color={t.muted} />
          </Pressable>
        ))}

        {rules.length > 0 && (
          <>
            <View style={styles.tokens}>
              {rules.map((r) => (
                <View key={r.id} style={[styles.token, { backgroundColor: t.raised }]}>
                  <Text style={[styles.tokenText, { color: t.text }]}>{tokenFor(r)}</Text>
                </View>
              ))}
            </View>
            {note !== undefined && (
              <Text style={[styles.tokenNote, { color: t.muted }]}>{note}</Text>
            )}
          </>
        )}
      </ScrollView>

      {stillIn && (
        <View style={styles.actions}>
          <Button
            label={`Cash ${player.name} out`}
            variant="primary"
            onPress={() =>
              router.push({ pathname: '/log', params: { player: player.id, kind: 'cashout' } })
            }
          />
          <Button
            label="Rebuy"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/log', params: { player: player.id, kind: 'rebuy' } })
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

/** "KITTY 5% OF WIN", "BILL SPLIT" — the rule, in the four words it takes. */
const tokenFor = (r: MoneyRule): string =>
  `${r.name.toUpperCase()} ${r.amountKind === 'percent' ? `${r.amount}% OF WIN` : 'SPLIT'}`;

/**
 * The line under the tokens.
 *
 * The board draws it for two winners-only rules and writes it "If he finishes
 * down" — a pronoun the app cannot know, so it says "they". The one-rule and
 * many-rule wordings are not drawn; both follow the drawn sentence's shape.
 */
function chargeNote(rules: MoneyRule[]): string | undefined {
  if (rules.some((r) => r.charge !== 'winners_only')) return undefined;
  if (rules.length === 1) return 'It charges winners only. If they finish down, it does not apply.';
  if (rules.length === 2) return 'Both charge winners only. If they finish down, neither applies.';
  return 'They all charge winners only. If they finish down, none of them applies.';
}

const clock = (iso: string | undefined): string =>
  iso === undefined
    ? ''
    : new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  screen: { flex: 1 },

  card: {
    marginTop: 16,
    marginHorizontal: 18,
    paddingVertical: 22,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  figure: { gap: 5 },
  right: { marginLeft: 'auto', alignItems: 'flex-end' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  big: { fontSize: 46, fontWeight: '800', letterSpacing: -1.84, lineHeight: 46, fontVariant: ['tabular-nums'] },
  cardNote: { fontSize: 13.5, fontWeight: '400', lineHeight: 20.25 },
  net: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  netLabel: { fontSize: 14, fontWeight: '500' },
  netFigure: { fontSize: 18, fontWeight: '800', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  list: { flex: 1, marginTop: 22, marginHorizontal: 22 },
  listContent: { paddingBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  time: { fontSize: 13, fontWeight: '600', width: 42, fontVariant: ['tabular-nums'] },
  what: { fontSize: 16, fontWeight: '600' },
  amount: { fontSize: 18, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },

  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 18, paddingHorizontal: 4 },
  token: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 6 },
  tokenText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.88 },
  tokenNote: { fontSize: 13, fontWeight: '400', lineHeight: 19.5, paddingTop: 10, paddingHorizontal: 4 },

  actions: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 6, gap: 12 },

  note: { fontSize: 12.5, fontWeight: '400', lineHeight: 19, marginHorizontal: 22, marginTop: 16 },
});
