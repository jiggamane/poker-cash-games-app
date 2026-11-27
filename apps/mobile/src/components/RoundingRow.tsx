import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { roundingLabel, type RoundingMode } from '@poker-club/core';
import { roundingSentence } from '../lib/money';
import { Card, CardRow, SectionLabel } from './Card';
import { z } from '../design/scale';

/**
 * How coarsely the group settles, as a row under the money rules.
 *
 * IT IS A MONEY RULE AND IT IS NOT A RULE ROW. It changes what people actually
 * pay, so it belongs on the money-rules screen and not in a list of display
 * preferences — but it has no destination, no collector and nobody it charges,
 * and it governs every rule above it at once. So it sits under its own caption
 * in its own card rather than inside the rules' list, where a reader scanning
 * for a switch would find one thing that does not have one.
 *
 * The same row at both levels of the chain, for the same reason `RuleList`
 * is one component: the club's default and tonight's snapshot are the same
 * question asked at two moments, and a sentence written twice is two sentences.
 *
 * THE FULL BOARD (`money-rules`, `club-rules`, approved): a quiet caption over
 * a one-row card, the sentence wrapping under the name, no chevron. Like
 * `RuleList` it carries the sheet's 20 side inset itself.
 */
export function RoundingRow({
  mode,
  scope,
  caption = 'How it is rounded',
}: {
  mode: RoundingMode | null;
  /** Which layer of the chain the sheet will write. */
  scope: 'club' | 'night';
  caption?: string;
}) {
  return (
    <View style={styles.block}>
      <SectionLabel text={caption} quiet />
      <Card>
        <CardRow
          last
          onPress={() => router.push({ pathname: '/rounding', params: { scope } })}
          name={roundingLabel(mode)}
          meta={roundingSentence(mode)}
          wrapMeta
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginHorizontal: z(20), gap: z(12) },
});
