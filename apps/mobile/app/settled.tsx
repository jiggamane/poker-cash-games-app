import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, settle, type Money, type PlayerId } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { NightResult } from '../src/components/NightResult';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, useNight } from '../src/lib/nightStore';

/**
 * The night's results — X1c. Rev 15, `14-invite-and-watcher.md`.
 *
 * ONE screen for two situations: the night you have just closed, and a night
 * you open from a list three weeks later. They are the same facts, so they are
 * the same screen.
 *
 * REBUILT FROM 1C TO X1c, and the container moved with the layout. 1C (rev 10)
 * drew this as a sheet of net rows carrying their whole calculation as inline
 * tokens — "in 1,000 · out 1,430 · bill 29 +50 back". Rev 15 draws the same
 * night as a PUSH: your own net at the top with the working underneath it as
 * full rows, then the settlement, then everyone else ranked. Two reasons the
 * push is right beyond the drawing saying so — a settled night is a place you
 * stay and read rather than something you confirm and dismiss, and `09` puts
 * exactly that on the push side of the line.
 *
 * WHAT THE HOST GETS THAT A WATCHER DOES NOT is the payments. X1c ends in a
 * read-only band because a watcher never marks a payment paid; the host is the
 * one doing the marking, so the band is replaced by the transfers. Everything
 * above that is `NightResult`, shared with `watch.tsx` — the same data, a
 * different projection, which is what the spec asks for.
 */
export default function NightResults() {
  const t = useTheme();
  const night = useNight();
  /** Whose results these are. The night knows, unless nobody has claimed it. */
  const { me: asked } = useLocalSearchParams<{ me?: PlayerId }>();
  const me = asked ?? night?.meId ?? null;

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settle({
        players: night.players,
        entries: night.entries,
        finalCounts: night.finalCounts,
        rules: night.rules,
        ...(night.acknowledgement ? { acknowledgedDiscrepancy: night.acknowledgement } : {}),
      });
    } catch {
      return null;
    }
  }, [night]);

  if (night === null) {
    return (
      <Screen title="The night" backTo="the club">
        {null}
      </Screen>
    );
  }

  if (result === null) {
    return (
      <Screen
        title="Not settled"
        backTo="the club"
        lede="This night was never closed. Count everyone up and settle it to see the record."
        footer={
          <Button label="Open the night" variant="primary" onPress={() => router.replace('/session')} />
        }
      >
        {null}
      </Screen>
    );
  }

  const mine = me === null ? [] : result.transfers.filter((tr) => tr.fromPlayerId === me);
  const shown = me === null ? result.transfers : mine;

  return (
    <Screen
      title={nightDate(night.startedAt)}
      badge={<Status label="SETTLED" />}
      meta={metaLine(night)}
      backTo="the club"
    >
      {night.acknowledgement !== undefined && (
        <View style={[styles.alert, { backgroundColor: t.dangerWash, borderColor: t.dangerEdge }]}>
          <Text style={[styles.alertLabel, { color: t.danger }]}>
            Closed {formatMoney(Math.abs(night.acknowledgement.amount) as Money)} out
          </Text>
          <Text style={[styles.alertBody, { color: t.text }]}>
            The count did not add up and the host confirmed it. The difference is carried by
            “Unaccounted” below rather than spread quietly across everyone.
          </Text>
        </View>
      )}

      <NightResult
        result={result}
        rules={night.rules}
        me={me}
        hostName={null}
        readOnly={false}
      />

      {/*
       * Where X1c's read-only band goes for a host: the payments themselves.
       *
       * S46 says this section is the READER'S OWN payments, which needs a
       * reader. The night names one as soon as somebody has claimed their
       * place; until then it shows the whole settlement under its own honest
       * title rather than passing off everyone's transfers as yours.
       */}
      <View style={styles.transfers}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>
          {me === null ? 'Who pays whom' : 'What you paid'}
        </Text>
        {shown.map((tr, i) => (
          <View key={`${tr.fromPlayerId}-${tr.toPlayerId}-${i}`} style={styles.transfer}>
            <Text style={[styles.transferText, { color: t.text }]}>
              {me === null ? nameOf(night, tr.fromPlayerId) : 'You'}
            </Text>
            <Icon name="arrow" color={t.muted} />
            <Text style={[styles.transferText, { color: t.text }]}>
              {nameOf(night, tr.toPlayerId)}
            </Text>
            <Text style={[styles.transferAmount, { color: t.text }]}>{formatMoney(tr.amount)}</Text>
          </View>
        ))}
        {shown.length === 0 && (
          <Text style={[styles.none, { color: t.muted }]}>
            {me === null ? 'Nothing to move: everyone left level.' : 'You owe nobody.'}
          </Text>
        )}
      </View>
    </Screen>
  );
}

/**
 * The SETTLED pill.
 *
 * NOT the `Pill` component: 999px belongs to the host's live badge alone, and
 * this is X1c's 7px status pill in card fill with a hairline round it. The two
 * mean different things and must not look alike.
 */
function Status({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.status, { backgroundColor: t.surface, borderColor: t.hairline }]}>
      <Text style={[styles.statusLabel, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

/**
 * "4h 36m · 6 players".
 *
 * X1c's meta reads "kept by Marek · 4h 36m · 6 players". The host is reading
 * their own night here, so naming them to themselves is dropped and the rest
 * stands.
 *
 * The local night carries no end time — `Night` has `startedAt` and a status,
 * and nothing that says when the last chip moved. The last entry's own
 * timestamp IS that moment, and using the clock instead would make a night
 * settled in March grow longer every time somebody opened it.
 */
function metaLine(night: NonNullable<ReturnType<typeof useNight>>): string {
  const players = night.players.filter((p) => p.atTable).length;
  const stamps = Object.values(night.occurredAt);
  const last = stamps.length === 0 ? null : stamps.reduce((a, b) => (a > b ? a : b));
  return `${elapsed(night.startedAt, last)} · ${players} players`;
}

function elapsed(startedAt: string, endedAt: string | null): string {
  const end = endedAt === null ? Date.now() : new Date(endedAt).getTime();
  const mins = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

const nightDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

const styles = StyleSheet.create({
  status: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1 },
  statusLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.05 },

  alert: {
    marginHorizontal: space.card,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: 1,
    gap: 6,
  },
  alertLabel: type.label,
  alertBody: { fontSize: 13, fontWeight: '400', lineHeight: 19 },

  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  transfers: { marginTop: 24, marginHorizontal: space.page },
  transfer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  transferText: type.rowName,
  transferAmount: { ...type.figure, marginLeft: 'auto' },
  none: { ...type.footnote, paddingHorizontal: 4 },
});
