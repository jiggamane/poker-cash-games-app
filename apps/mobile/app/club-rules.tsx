import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, type MoneyRule } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { block, radius, space, type } from '../src/design/tokens';
import { setClubRules, useClub } from '../src/lib/clubStore';
import { useNight } from '../src/lib/nightStore';

/**
 * Money rules — GR8. The CLUB's defaults, and the deepest route in the section:
 * two pushes below the root, which is the limit.
 *
 * What is set here is only ever the third layer of the chain:
 *
 *   this game → last game → club default → app default
 *
 * So changing a rule here does nothing to the night running in the kitchen and
 * nothing at all to a night already settled. It changes what the NEXT night
 * opens with, once the last game has stopped having an opinion — which is why
 * the note at the bottom is on the screen rather than in a changelog.
 */
export default function ClubMoneyRules() {
  const t = useTheme();
  const club = useClub();
  const night = useNight();

  if (club === null) return <Screen title="Money rules" backTo="Settings">{null}</Screen>;

  const rules = [...club.rules].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Screen
      title="Money rules"
      backTo="Settings"
      meta={`${club.name} · what a new night opens with`}
      footer={
        <Button
          label="Add a rule"
          variant="primary"
          onPress={() =>
            router.push({
              pathname: '/rule',
              params: { scope: 'club', destination: 'kitty', order: String(rules.length + 1) },
            })
          }
        />
      }
    >
      <View style={styles.list}>
        {rules.map((r, i) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/rule', params: { id: r.id, scope: 'club' } })}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: t.hairline,
                borderBottomWidth: i === rules.length - 1 ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: t.text }]}>{r.name}</Text>
              <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>
                {describe(r)}
              </Text>
            </View>
            <Icon name="chevron" color={t.muted} />
          </Pressable>
        ))}

        {rules.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            This club takes nothing off the table. Every night opens with no deductions until a
            rule is added here.
          </Text>
        )}
      </View>

      {/* The one honest way to promote what a night actually ran with into the
          club's own layer. Without it the middle layer would quietly outrank
          this screen for ever. */}
      {night !== null && night.rules.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void setClubRules(club.id, night.rules)}
          style={({ pressed }) => [
            styles.promote,
            { borderColor: t.quietOutline, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.promoteLabel, { color: t.text }]}>
            Use tonight’s rules as the club default
          </Text>
        </Pressable>
      )}

      <View style={[styles.block, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <Text style={[styles.blockTitle, { color: t.text }]}>Where a night gets its rules</Text>
        <Text style={[styles.blockBody, { color: t.muted }]}>
          A night copies these when it opens and then owns its copy. Changing a rule here never
          reaches a night that is already running, and can never reach one that has been settled.
          What the last game ran with — including anything overridden that evening — is what the
          next night is offered first; this screen is what it falls back to.
        </Text>
      </View>
    </Screen>
  );
}

/** "10% off each win · winners · held by Radka". */
function describe(r: MoneyRule): string {
  const amount = r.amountKind === 'percent' ? `${r.amount}% off each win` : formatMoney(r.amount);
  const who =
    r.charge === 'everyone_flat'
      ? 'everyone at the table'
      : r.split === 'by_percent'
        ? 'winners, by size of win'
        : 'winners, evenly';
  const where =
    r.destination === 'bill'
      ? 'the bill'
      : r.destination === 'kitty'
        ? 'the kitty'
        : r.destination === 'host_fee'
          ? 'the host'
          : 'the next pot';
  return `${amount} · ${who} · ${where}`;
}

const styles = StyleSheet.create({
  list: { marginTop: 20, marginHorizontal: space.page },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 4 },
  rowText: { gap: 4, flexShrink: 1 },
  name: type.rowName,
  detail: type.rowDetail,
  empty: { ...type.footnote, paddingHorizontal: 4 },

  promote: {
    alignSelf: 'flex-start',
    marginTop: 18,
    marginHorizontal: space.card,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radius.pressable,
    borderWidth: 1.5,
  },
  promoteLabel: { fontSize: 15, fontWeight: '700' },

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
});
