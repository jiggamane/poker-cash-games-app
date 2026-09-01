import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { columnsFit, settle } from '@poker-club/core';
import { Button } from '../src/components/Button';
import { ColumnTable } from '../src/components/NightResult';
import { Screen } from '../src/components/Screen';
import { space } from '../src/design/tokens';
import { settlementInput, useNight } from '../src/lib/nightStore';

/**
 * Full ledger — format `7e`, the four-column table.
 * `design/handoff-count-up-to-settled/docs/02-E6-results-row.md`, cut 1 Sept.
 *
 * WHY IT IS A SCREEN OF ITS OWN. The handoff kept two of the six formats it
 * drew: `7a` is the row E6 lists at rest, and `7e` "stays as the full-screen
 * variant behind the *Full ledger* button, where columns are worth the width".
 * Full-screen is the word the doc uses, and `09-navigation.md` decides what
 * kind of full screen: this is a place you stay in and read, it ends in no
 * Save, no Add and no confirm, so it is a PUSH and its top-right corner is
 * empty. A sheet would give it a grabber and ask to be dismissed, which is the
 * wrong verb for a ledger.
 *
 * ⚠ NOT DRAWN AS A SCREEN. The board draws `7e` inside the E6 frame, with a
 * *Full ledger* button and a *Close* beneath it; it does not draw where the
 * button goes or what the destination's chrome is, and its own *Still to draw*
 * says as much — "where the *Full ledger* button lands, and whether `7e` there
 * is scrollable or paged". So: the chrome is this app's own push, the title is
 * the button's own words rather than invented copy, and the list scrolls,
 * because paging a table nobody has drawn a pager for would be inventing two
 * things instead of one. `docs/screens.md` carries it as open.
 *
 * THE TABLE ITSELF IS NOT REBUILT HERE. It is the same `ColumnTable` E6 drew
 * until this cut, unchanged, off the same `resultColumns` — which is the only
 * way `7a` and `7e` can be trusted to be two drawings of one night rather than
 * two answers about it.
 */
export default function FullLedger() {
  const night = useNight();

  const result = useMemo(() => {
    if (night === null) return null;
    try {
      return settle(settlementInput(night));
    } catch {
      return null;
    }
  }, [night]);

  /*
   * A NIGHT THAT CANNOT BE DRAWN IN COLUMNS HAS NO LEDGER TO OPEN — `columnsFit`
   * again, and the same answer as on E6: rules that reach past the bill and the
   * piggy bank have no fifth column. E6 does not draw the chip in that case, so
   * this is only reachable by URL, and it says what it is rather than drawing a
   * table with a term missing from it.
   */
  if (night === null || result === null || !columnsFit(result)) {
    return (
      <Screen
        title="Full ledger"
        backTo="the night"
        lede="This night's rules take money somewhere the four columns cannot show. Each person's row on the night itself has a line for every one of them."
        footer={<Button label="Back to the night" variant="primary" onPress={() => router.back()} />}
      >
        {null}
      </Screen>
    );
  }

  return (
    <Screen
      title="Full ledger"
      backTo="the night"
      footer={<Button label="Back to the night" variant="primary" onPress={() => router.back()} />}
    >
      {/* The table's own gutter, which E6 gives it from the block it sits in.
          A screen of its own has to state it, and it is the same 20 every
          other list in the app is inset by. */}
      <View style={styles.table}>
        <ColumnTable result={result} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  table: { marginHorizontal: space.card, marginTop: 4 },
});
