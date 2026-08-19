import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, type MoneyRule } from '@poker-club/core';
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
      meta="what every new night starts from"
    >
      <Text style={[styles.caption, { color: t.muted }]}>Group defaults</Text>

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
                borderBottomWidth: StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.rowText}>
              <View style={styles.nameLine}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{r.name}</Text>
                <Icon name="chevron" color={t.muted} size={15} />
              </View>
              <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>
                {describe(r)}
              </Text>
            </View>
          </Pressable>
        ))}

        {/* A DESTINATION THE CLUB HAS NOT SET IS STILL A ROW. GR8 draws it —
            "Host fee · not set" — because the absence is the setting: a night
            opens with that option unselected, and a reader who cannot see the
            row cannot know that. */}
        {(['bill', 'kitty', 'host_fee'] as const)
          .filter((d) => !rules.some((r) => r.destination === d))
          .map((d) => (
            <Pressable
              key={d}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/rule',
                  params: { scope: 'club', destination: d, order: String(rules.length + 1) },
                })
              }
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: t.hairline,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.rowText}>
                <View style={styles.nameLine}>
                  <Text style={[styles.name, { color: t.muted }]} numberOfLines={1}>
                    {d === 'bill' ? 'Food & drinks' : d === 'kitty' ? 'Group piggy bank' : 'Host fee'}
                  </Text>
                  <Icon name="chevron" color={t.muted} size={15} />
                </View>
                <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>
                  not set — a night opens with nothing selected
                </Text>
              </View>
            </Pressable>
          ))}

        {/* The list ends where the reader is already looking. */}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/rule',
              params: { scope: 'club', destination: 'kitty', order: String(rules.length + 1) },
            })
          }
          style={({ pressed }) => [styles.row, styles.addRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="plus" color={t.text} size={15} />
          <Text style={[styles.addLabel, { color: t.text }]}>Add a rule</Text>
        </Pressable>
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
        <Text style={[styles.blockTitle, { color: t.text }]}>Group default, not law</Text>
        <Text style={[styles.blockBody, { color: t.muted }]}>
          A night copies these when it opens and can override any of them from the house rules.
          Changing them here never touches a night already running, or a night already settled.
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
        ? 'the piggy bank'
        : r.destination === 'host_fee'
          ? 'the host'
          : 'the next pot';
  return `${amount} · ${who} · ${where}`;
}

const styles = StyleSheet.create({
  caption: { ...type.sectionLabel, marginTop: 20, marginHorizontal: space.page, marginBottom: 2 },
  list: { marginHorizontal: space.page },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addRow: { gap: 11, borderBottomWidth: 0 },
  addLabel: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 4 },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  name: type.rowName,
  detail: type.rowDetail,

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
