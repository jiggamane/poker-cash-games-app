import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Share, StyleSheet, Text, View } from 'react-native';
import { settle, type Money, type PlayerId } from '@poker-club/core';
import { formatMoney } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { Sheet } from '../src/components/Sheet';
import { useTheme } from '../src/design/useTheme';
import { radius, space, type } from '../src/design/tokens';
import { nameOf, settlementInput, transferKey, useNight } from '../src/lib/nightStore';

/**
 * Nudge the table — E8. 13-after-the-night.md.
 *
 * ONE MESSAGE, FIXED, and it says four things: the group, the date, what they
 * owe and who is collecting. There is no free-text box, because the thing a
 * host would type into it at 1am is the thing that starts an argument, and the
 * facts are already known.
 *
 * IT MARKS NOTHING PAID. A nudge is a reminder, not a receipt — the money has
 * to actually arrive before a row moves — and whoever has already paid is left
 * out of it entirely. Being chased for something you settled on Tuesday is
 * exactly the failure this screen exists to avoid.
 *
 * IT GOES OUT ONCE. The sheet closes on send and there is no second button.
 *
 * WHAT THE APP HAS TO SEND WITH: the phone's own share sheet. The club has no
 * messaging of its own and no addresses for anybody, so the host picks the
 * conversation their group already uses. The app composes; it does not deliver.
 */
export default function Nudge() {
  const t = useTheme();
  const night = useNight();
  const [busy, setBusy] = useState(false);

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settle(settlementInput(night));
    } catch {
      return null;
    }
  }, [night]);

  if (night === null || result === null) return <Sheet title="Nudge the table">{null}</Sheet>;

  /* Who still owes, and how much each — one line per person, not per transfer:
     a debtor paying two people is one person being reminded, once. */
  const owing = new Map<PlayerId, number>();
  for (const tr of result.transfers) {
    if (night.paidAt.has(transferKey(tr.fromPlayerId, tr.toPlayerId))) continue;
    owing.set(tr.fromPlayerId, (owing.get(tr.fromPlayerId) ?? 0) + tr.amount);
  }
  const people = [...owing].sort((a, b) => b[1] - a[1]);

  /* Who is collecting: whoever is owed the most of what is still outstanding.
     The message names one person, and it has to be the one to pay. */
  const collecting = new Map<PlayerId, number>();
  for (const tr of result.transfers) {
    if (night.paidAt.has(transferKey(tr.fromPlayerId, tr.toPlayerId))) continue;
    collecting.set(tr.toPlayerId, (collecting.get(tr.toPlayerId) ?? 0) + tr.amount);
  }
  const collector = [...collecting].sort((a, b) => b[1] - a[1])[0]?.[0];

  const date = formatDate(night.endedAt ?? night.startedAt);

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      // One message for everybody, which is what "goes out once" means here:
      // the app cannot address people individually, so what it composes is
      // the group's own message with each amount named in it.
      await Share.share({ message: groupMessage() });
      router.back();
    } catch {
      // The host dismissed the share sheet. Nothing was sent and nothing
      // changed; the screen stays where it was.
    } finally {
      setBusy(false);
    }
  }

  /** What one person would read. Drawn on the sheet as the sample. */
  function personalMessage(amount: number): string {
    return `${night!.groupName} · ${date}. You owe ${formatMoney(amount as Money)}. ${
      collector === undefined ? 'Nobody' : nameOf(night!, collector)
    } is collecting.`;
  }

  function groupMessage(): string {
    const lines = people.map(
      ([id, amount]) => `${nameOf(night!, id)} — ${formatMoney(amount as Money)}`,
    );
    return [
      `${night!.groupName} · ${date}.`,
      ...lines,
      `${collector === undefined ? 'Nobody' : nameOf(night!, collector)} is collecting.`,
    ].join('\n');
  }

  const count = words(people.length);

  return (
    <Sheet
      title="Nudge the table"
      sub={
        people.length === 0
          ? 'Everyone has paid. There is nobody left to remind.'
          : `One message, to the ${count} who ${
              people.length === 1 ? 'has' : 'have'
            } not paid. It says the amount and who is collecting — nothing else.`
      }
      sentence
      footer={
        people.length === 0 ? (
          <Button label="Back to the payments" variant="secondary" onPress={() => router.back()} />
        ) : (
          <Button
            label={`Send to ${count}`}
            variant="primary"
            disabled={busy}
            onPress={() => void send()}
          />
        )
      }
    >
      {people.length > 0 && (
        <>
          <View style={[styles.sample, { backgroundColor: t.surface, borderColor: t.hairline }]}>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>What they get</Text>
            <Text style={[styles.message, { color: t.text }]}>
              {personalMessage(people[0]![1])}
            </Text>
          </View>

          <Text style={[styles.goesTo, { color: t.muted }]}>Goes to</Text>
          <View style={styles.list}>
            {people.map(([id, amount], i) => (
              <View
                key={id}
                style={[
                  styles.row,
                  {
                    borderBottomColor: t.hairline,
                    borderBottomWidth: i === people.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {nameOf(night, id)}
                </Text>
                <Text style={[styles.amount, { color: t.loss }]}>
                  {formatMoney(amount as Money)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[styles.footnote, { color: t.muted }]}>
            A nudge never marks anything paid, and it goes out once. Whoever has paid already is
            left out of it.
          </Text>
        </>
      )}
    </Sheet>
  );
}

/** "three", up to the size of a table; a number past that. */
const words = (n: number): string =>
  ['nobody', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ??
  String(n);

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const styles = StyleSheet.create({
  sample: {
    marginHorizontal: space.page,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: radius.card,
    gap: 10,
  },
  sectionLabel: type.sectionLabel,
  message: { fontSize: 15, fontWeight: '400', lineHeight: 22 },

  goesTo: { ...type.sectionLabel, marginHorizontal: space.page, paddingHorizontal: 4, paddingBottom: 6 },
  list: { marginHorizontal: space.page },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  name: { ...type.rowName, flexShrink: 1 },
  amount: { fontSize: 15, fontWeight: '700', marginLeft: 'auto' },

  footnote: { ...type.footnote, marginTop: 20, marginHorizontal: space.page, paddingHorizontal: 4 },
});
