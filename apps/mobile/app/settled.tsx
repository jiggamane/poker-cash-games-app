import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  formatMoney,
  formatSigned,
  resolveLedger,
  ruleTerms,
  settle,
  type Deduction,
  type Money,
  type PlayerId,
} from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Sheet } from '../src/components/Sheet';
import { moneyColor, useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, useNight } from '../src/lib/nightStore';

/**
 * The night's results — 1C. Rev 10.
 *
 * ONE screen for two situations: the night you have just closed, and a night
 * you open from a list three weeks later. They are the same facts, so they are
 * the same screen — E6's own layout is gone.
 *
 * EVERY ROW CARRIES THE WHOLE CALCULATION, as tokens: what they put in, what
 * they took out, and what each rule took off them. A reimbursement rides
 * INSIDE its deduction — "bill 61 +170 back" — never as a token of its own,
 * because it is not a separate movement of money, it is the same bill seen
 * from the other side. A row shows a rule when that rule touched that person:
 * usually winners only, but a bill split between everyone charges losers too,
 * and a net nothing on the row accounts for is what starts an argument.
 *
 * The net is after deductions and the list is sorted by it, best first. On the
 * canonical night that puts Marek above Dana even though Dana won more at the
 * table, which is exactly why the sort is on the final net.
 */
export default function NightResults() {
  const t = useTheme();
  const night = useNight();
  /** Whose results these are. The night knows, unless nobody has claimed it. */
  const { me: asked } = useLocalSearchParams<{ me?: PlayerId }>();
  const me = asked ?? night?.meId;

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

  if (night === null) return <Sheet title="The night">{null}</Sheet>;

  if (result === null) {
    return (
      <Sheet
        title="Not settled"
        sub="This night was never closed. Count everyone up and settle it to see the record."
        sentence
        footer={
          <Button label="Open the night" variant="primary" onPress={() => router.replace('/session')} />
        }
      >
        {null}
      </Sheet>
    );
  }

  const ledger = resolveLedger(night.entries);
  const started = new Date(night.startedAt);

  /* Money in play is the ins, which equal the outs. Bill and kitty are read off
     the deductions rather than added up here — if a figure looks wrong the rule
     is wrong, and there is a test for the rule. */
  const bill = totalFor(result.deductions, 'bill');
  const kitty = totalFor(result.deductions, 'kitty');

  /*
   * What each of those two was charged ON, in the night's own words.
   *
   * X1c puts the terms on the row — "Bill · by size of win" — for a reason that
   * applies just as much here as it does to a watcher: S62 changed the default
   * split, so two nights three weeks apart can carry different rules and show
   * the same label. A settled night has to say which one it was settled under,
   * and it says it from the snapshot rather than from this file. See
   * `ruleText.ts`.
   */
  const termsFor = (destination: Deduction['destination']): string | undefined => {
    const rule = night.rules.find((r) => r.destination === destination && r.active);
    return rule === undefined ? undefined : ruleTerms(rule);
  };

  /* Somebody who never sat down and was neither charged nor credited has
     nothing to say on a results list — the engine counts them because they
     could have collected something, and tonight they did not. */
  const rows = [...result.players]
    .filter((p) => p.boughtIn > 0 || p.endedWith > 0 || p.charged > 0 || p.credited > 0)
    .sort((a, b) => b.finalPosition - a.finalPosition);
  const mine = me === undefined ? [] : result.transfers.filter((tr) => tr.fromPlayerId === me);

  return (
    <Sheet
      title={started.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
      sub={`${clock(night.startedAt)} · ${night.players.length} players`}
      footer={<Button label="Done" variant="secondary" onPress={() => router.dismissTo('/')} />}
    >
      <View style={styles.summary}>
        <View style={styles.summaryLeft}>
          <Text style={[styles.summaryLabel, { color: t.muted }]}>Money in play</Text>
          <Text style={[styles.summaryFigure, { color: t.text }]}>
            {formatMoney(ledger.totalBoughtIn)}
          </Text>
        </View>
        {/* Grouped at the right, small, and with no minus signs: they are two
            amounts that left the table, not two negative numbers. */}
        <View style={styles.offTable}>
          <Off label="Bill" value={bill} terms={termsFor('bill')} />
          <Off label="Kitty" value={kitty} terms={termsFor('kitty')} />
        </View>
      </View>

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

      <View style={styles.list}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Net</Text>

        {rows.map((p) => {
          const isMe = p.playerId === me;
          return (
            <View
              key={p.playerId}
              /*
               * Tinted per net, which X1c confirms as the treatment for a
               * settled table (M1) and the tokens have always described: "a
               * faint wash behind a net row, so a win or a loss registers at
               * arm's length rather than only on close reading of the figure."
               * The wash replaces the hairline — a washed block with a rule
               * under it reads as two devices doing one job.
               */
              style={[
                styles.row,
                styles.rowWashed,
                { backgroundColor: p.finalPosition >= 0 ? t.winWash : t.lossWash },
              ]}
            >
              <View style={styles.rowTop}>
                <Text style={[isMe ? styles.nameMine : styles.name, { color: t.text }]}>
                  {p.name}
                </Text>
                <Text
                  style={[
                    isMe ? styles.netMine : styles.net,
                    { color: moneyColor(t, p.finalPosition) },
                  ]}
                >
                  {formatSigned(p.finalPosition)}
                </Text>
              </View>

              <View style={styles.tokens}>
                <Token label="in" value={p.boughtIn} color={t.loss} />
                <Token label="out" value={p.endedWith} color={t.win} />

                {/*
                 * A token for every rule that actually took something off this
                 * person. Usually that means winners only — but the bill can be
                 * split evenly between EVERYONE, losers included, and a row
                 * reading "in 1,500 · out 1,500 · −$56" with nothing to account
                 * for the 56 is exactly the argument these screens exist to
                 * stop. What is charged is shown, whoever it is charged to.
                 */}
                {result.deductions.map((d) => {
                  const charged = d.charges.find((c) => c.playerId === p.playerId)?.amount ?? 0;
                  const back = d.credits.find((c) => c.playerId === p.playerId)?.amount ?? 0;
                  if (charged === 0 && back === 0) return null;
                  return (
                    <Token
                      key={d.ruleId}
                      label={word(d)}
                      value={charged as Money}
                      color={t.muted}
                      back={back > 0 ? (back as Money) : undefined}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      <Status night={night} short={result.acknowledgedDiscrepancy?.amount} />

      <View style={styles.transfers}>
        <Text style={[styles.sectionLabel, { color: t.muted }]}>
          {me === undefined ? 'Who pays whom' : 'What you paid'}
        </Text>
        {/*
         * S46 says this section is the READER'S OWN payments, which needs a
         * reader. The night names one as soon as somebody has claimed their
         * place; until then it shows the whole settlement under its own honest
         * title rather than passing off everyone's transfers as yours.
         */}
        {(me === undefined ? result.transfers : mine).map((tr, i) => (
          <View key={`${tr.fromPlayerId}-${tr.toPlayerId}-${i}`} style={styles.transfer}>
            <Text style={[styles.transferText, { color: t.text }]}>
              {me === undefined ? nameOf(night, tr.fromPlayerId) : 'You'}
            </Text>
            <Icon name="arrow" color={t.muted} />
            <Text style={[styles.transferText, { color: t.text }]}>
              {nameOf(night, tr.toPlayerId)}
            </Text>
            <Text style={[styles.transferAmount, { color: t.text }]}>{formatMoney(tr.amount)}</Text>
          </View>
        ))}
        {(me === undefined ? result.transfers : mine).length === 0 && (
          <Text style={[styles.none, { color: t.muted }]}>
            {me === undefined ? 'Nothing to move: everyone left level.' : 'You owe nobody.'}
          </Text>
        )}
      </View>
    </Sheet>
  );
}

/**
 * One settlement status line, and exactly one. The three strings are fixed.
 */
function Status({
  night,
  short,
}: {
  night: NonNullable<ReturnType<typeof useNight>>;
  short?: Money;
}) {
  const t = useTheme();

  const state =
    short !== undefined && short < 0
      ? ({ text: `Short by ${formatMoney(Math.abs(short) as Money)}`, color: t.loss, icon: 'info' } as const)
      : night.status === 'settled'
        ? ({ text: 'Settled', color: t.win, icon: 'check' } as const)
        : ({ text: 'Not settled yet', color: t.amber, icon: 'clock' } as const);

  return (
    <View style={styles.status}>
      <Icon name={state.icon} color={state.color} size={15} />
      <Text style={[styles.statusText, { color: state.color }]}>{state.text}</Text>
    </View>
  );
}

/** "in 1,000", "bill 61 +170 back". */
function Token({
  label,
  value,
  color,
  back,
}: {
  label: string;
  value: Money;
  color: string;
  back?: Money;
}) {
  const t = useTheme();
  return (
    <Text style={[styles.token, { color }]}>
      {label} {value.toLocaleString('en-US')}
      {back !== undefined && (
        <Text style={[styles.tokenBack, { color: t.win }]}> +{back.toLocaleString('en-US')} back</Text>
      )}
    </Text>
  );
}

function Off({ label, value, terms }: { label: string; value: Money; terms?: string }) {
  const t = useTheme();
  return (
    <View style={styles.offGroup}>
      <View style={styles.off}>
        <Text style={[styles.offLabel, { color: t.muted }]}>{label}</Text>
        <Text style={[styles.offValue, { color: t.loss }]}>{formatMoney(value)}</Text>
      </View>
      {terms !== undefined && (
        <Text style={[styles.offTerms, { color: t.dim }]}>{terms}</Text>
      )}
    </View>
  );
}

const totalFor = (deductions: readonly Deduction[], destination: Deduction['destination']): Money =>
  deductions
    .filter((d) => d.destination === destination)
    .reduce((sum, d) => sum + d.total, 0) as Money;

/** The token's word is what the money was for, not what the rule was called. */
const word = (d: Deduction): string =>
  d.destination === 'bill'
    ? 'bill'
    : d.destination === 'kitty'
      ? 'kitty'
      : d.destination === 'host_fee'
        ? 'fee'
        : 'pot';

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    marginHorizontal: space.card,
    marginBottom: 20,
  },
  summaryLeft: { gap: 8 },
  summaryLabel: type.tableLabel,
  summaryFigure: type.tableFigure,
  offTable: { marginLeft: 'auto', gap: 10, alignItems: 'flex-end' },
  offGroup: { alignItems: 'flex-end', gap: 2 },
  off: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  offLabel: { fontSize: 12.5, fontWeight: '500' },
  offValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  offTerms: { fontSize: 11.5, fontWeight: '400' },

  alert: {
    marginHorizontal: space.card,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: 1,
    gap: 6,
  },
  alertLabel: type.label,
  alertBody: { fontSize: 13, fontWeight: '400', lineHeight: 19 },

  list: { marginHorizontal: space.page },
  sectionLabel: { ...type.sectionLabel, paddingHorizontal: 4, paddingBottom: 6 },
  row: { paddingVertical: 13, paddingHorizontal: 4, gap: 7 },
  /* X1c's geometry: 11/10 inside, pulled 6 past the list, radius 8, 3 apart. */
  rowWashed: {
    paddingHorizontal: 10,
    marginHorizontal: -6,
    marginBottom: 3,
    borderRadius: radius.pressable,
  },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  name: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  nameMine: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
  net: { fontSize: 19, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  netMine: { fontSize: 19, fontWeight: '800', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  token: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  tokenBack: { fontSize: 13, fontWeight: '700' },

  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: space.page,
    paddingHorizontal: 4,
  },
  statusText: { fontSize: 14, fontWeight: '700' },

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
