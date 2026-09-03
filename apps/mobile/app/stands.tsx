import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { endedWith, resolveLedger, resultBeforeDeductions } from '@poker-club/core';
import { formatToFit } from '../src/lib/money';
import { Button } from '../src/components/Button';
import { ActiveRow, FinishedSlab, PlayerGroup, Rank } from '../src/components/PlayerList';
import { Screen } from '../src/components/Screen';
import { clockLabel } from '../src/lib/elapsed';
import { cashedOutAt, standingsOf, useNight } from '../src/lib/nightStore';

/**
 * Where everyone stands — E2b, on the mixed player list rule.
 * `design/handoff-player-list/`, frames `2c`/`2d`, cut 3 September.
 *
 * Read-only, and reached mid-count from E2. It answers the question a room
 * starts asking long before the last stack is counted, without pretending the
 * answer is final.
 *
 * THIS IS THE ONE SCREEN WHERE THE RULE INVERTS: the finished group comes
 * FIRST, because only a final result can be ranked. Everywhere else in the app
 * the active group leads, since it is the work still to do; here the work is
 * not the point — the standing is — and a ranked list that started with the
 * unranked would be a leaderboard with its unplaced entries on top.
 *
 * AND A CASHED-OUT PLAYER RANKS ALONGSIDE A COUNTED ONE. Their result is
 * equally final: the money is off the table either way, and the flag that puts
 * a row in this group is the same one that draws it as a slab. Ranking counted
 * players only — which this screen did until today — treated somebody who left
 * at eleven as less finished than somebody counted at one.
 *
 * NOTHING HERE IS TAPPABLE, on either treatment. The active rows keep their em
 * dash in the rank column and take no affordance at all: this screen reads, and
 * counting happens on the one behind it.
 */
export default function Stands() {
  const night = useNight();

  const ledger = useMemo(() => (night === null ? null : resolveLedger(night.entries)), [night]);

  if (night === null || ledger === null) {
    return <Screen title="Where everyone stands" backTo="Count up">{null}</Screen>;
  }

  const played = standingsOf(night, ledger).filter((s) => s.played);

  /* Finished means their chips have been seen: either they cashed out during
     play, or the host has taken their final count. One flag, and it is the same
     one that chooses the treatment — see `PlayerList.tsx`. */
  const ranked = played
    .filter((s) => !s.atTable || night.finalCounts.has(s.id))
    .map((s) => {
      const out = endedWith(ledger, s.id, night.finalCounts);
      /* The same subtraction E2 and Tonight print on their settled rows, and
         the same function — one figure, one implementation. See `CLAUDE.md`. */
      return { ...s, out, result: resultBeforeDeductions(s.boughtIn, out) };
    })
    .sort((a, b) => b.result - a.result || (a.name < b.name ? -1 : 1));

  const waiting = played.filter((s) => s.atTable && !night.finalCounts.has(s.id));

  return (
    <Screen
      title="Where everyone stands"
      backTo="Count up"
      /* Both sentences in the lede, which is where the handoff puts them. The
         second used to be a dashed note under the list; it is the caveat on the
         whole screen rather than a footnote to one group, and a reader who has
         scrolled past the ranking has already believed it by then. */
      lede="Nothing has come off the table yet — the bill and the piggy bank land at the next step. Ranks are provisional until every stack is counted."
      footer={<Button label="Back to the count" variant="secondary" onPress={() => router.back()} />}
    >
      <View style={styles.groups}>
        <PlayerGroup label="Ranked" count={ranked.length} first>
          {ranked.map((s, i) => (
            <FinishedSlab
              key={s.id}
              name={s.name}
              fact={
                s.atTable
                  ? `counted ${formatToFit(s.out, ROW_FITS)}`
                  : finishedAt(cashedOutAt(night, s.id), s.out)
              }
              result={s.result}
              lead={<Rank n={i + 1} />}
              fits={ROW_FITS}
            />
          ))}
        </PlayerGroup>

        <PlayerGroup label="Not counted yet" count={waiting.length}>
          {waiting.map((s, i) => (
            <ActiveRow
              key={s.id}
              name={s.name}
              fact={`in ${formatToFit(s.boughtIn, ROW_FITS)}`}
              lead={<Rank />}
              last={i === waiting.length - 1}
            />
          ))}
        </PlayerGroup>
      </View>
    </Screen>
  );
}

/**
 * When they left, and what with — but only the time where there is room.
 *
 * The handoff draws `23:15` alone on this screen and `23:15 · out $2,120` on
 * Tonight, and the difference is the rank column: 16 points and its gap come
 * off the same line. Where the clock is missing — an imported night, or one
 * closed before the field existed — the cash-out is what is left to say.
 */
const finishedAt = (at: string | undefined, out: ReturnType<typeof endedWith>): string =>
  at === undefined ? `out ${formatToFit(out, ROW_FITS)}` : clockLabel(at);

const styles = StyleSheet.create({
  /* The rows' own 22, carried once for both groups. */
  groups: { marginTop: 4, marginHorizontal: 22 },
});

/*
 * WHERE A RANKED SLAB RUNS OUT OF ROOM.
 *
 * The tightest line in the app's lists: a 16-point rank column, the name, the
 * fact and the result, all on one line inside a slab's own `8 14`. At 360 that
 * leaves about 262 points for the four of them, and the result at 19/700 never
 * gives — `−$99,999` is about 98 of it, and the name and the fact share what is
 * left. Six digits fit and seven do not.
 *
 * E5's counted list takes the same threshold and always has: they are the same
 * six rows a host reads twice within a minute of each other, and a list that
 * abbreviated on one and not the other reads as a figure that changed rather
 * than a column that is narrower.
 */
const ROW_FITS = 10_000;
