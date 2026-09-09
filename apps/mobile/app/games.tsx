import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Dropdown, MENU_DIM, type DropdownItem } from '../src/components/Dropdown';
import { GameRow } from '../src/components/GameRow';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { space, type } from '../src/design/tokens';
import { ALL_GROUPS, scopeLabel, setScope, useScope } from '../src/lib/bookStore';
import { SAMPLE_HISTORY } from '../src/data/sampleHistory';
import { formatNightDate, mostRecentFirst, readBook } from '../src/lib/myStats';
import { myNights, useNight } from '../src/lib/nightStore';

/**
 * SESSIONS — `design/handoff-sessions-stats/`, frame `1a`, cut 9 September.
 *
 * Every night they have played, newest first, one row each, and tapping a row
 * opens that night's result. It is the destination My stats' `See all` leads
 * to, and it is a PUSH from the club root with **nothing in the top-right**.
 *
 * THE WHOLE SCREEN IS THE LIST. A back row, a title, a meta line with the group
 * dropdown pushed right, and then rows — no card, no summary, no chart. My
 * stats is where the figures are; this is where the nights are, and the two
 * exist separately so that neither has to be a worse version of the other.
 *
 * ⚠ IT WAS `My games` UNTIL TODAY, with a 40-point period total at the top of
 * it and three period tabs of its own. Both moved to My stats, which is where
 * the handoff puts every figure and where the app already drew the same three
 * tabs — two screens each carrying their own copy of one total is the drift
 * this cut ends. The screen is `Sessions` now, top to bottom, and the club
 * root's row has said `Sessions` since rev 10.
 *
 * NOTHING HERE ADDS ANYTHING UP. Every net is `myNights`', off the engine.
 */
export default function Sessions() {
  const t = useTheme();
  const night = useNight();
  const scope = useScope();
  const [menuOpen, setMenuOpen] = useState(false);

  /*
   * EVERY NIGHT THIS READER HAS PLAYED, newest first — the phone's own settled
   * night and the seeded history behind it, assembled by `readBook` so that
   * this screen and My stats cannot hold different books. `See all` leading
   * from a list of eight to a list of none is what that function is for.
   */
  const all = useMemo(() => {
    const mine = myNights(night, null)
      .filter((n) => n.played)
      .map((n) => ({
        id: n.sessionId,
        startedAt: n.startedAt,
        group: n.groupName,
        net: n.result,
        minutes: n.minutes,
        players: n.players,
        terms: n.terms,
      }));
    return mostRecentFirst(readBook(mine, SAMPLE_HISTORY));
  }, [night]);

  /* Every club the reader has a night in, in the order they last played one.
     A reader with one club sees the control as a label — see `Dropdown`. */
  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const n of all) if (!seen.includes(n.group)) seen.push(n.group);
    return seen;
  }, [all]);

  const nights = scope === ALL_GROUPS ? all : all.filter((n) => n.group === scope);

  const options: Array<DropdownItem<string>> = [
    { value: ALL_GROUPS, label: scopeLabel(ALL_GROUPS) },
    ...groups.map((g) => ({ value: g, label: g })),
  ];

  return (
    <Screen
      title="Sessions"
      meta={metaLine(nights.length)}
      metaTrailing={
        <Dropdown
          testID="sessions-scope"
          items={options}
          value={scope}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onPick={setScope}
          accessibilityLabel={`Showing ${scopeLabel(scope)}. Change the group.`}
        />
      }
      backTo="the club"
      /* The list IS the screen, so the head goes down with it: one flick clears
         the chrome instead of scrolling rows under a pinned title. */
      headScroll="all"
    >
      {/* Everything behind an open menu drops to 32%, and tapping it closes the
          menu rather than opening a night. */}
      <View style={menuOpen && { opacity: MENU_DIM }} pointerEvents={menuOpen ? 'none' : 'auto'}>
        <View style={styles.list}>
          {nights.map((n) => (
            <GameRow
              key={n.id}
              date={formatNightDate(n.startedAt, true)}
              net={n.net}
              /* NO GROUP NAME HERE. Under `All groups` the list mixes clubs and
                 the row could say which — but Sessions is where a reader goes
                 to find one night among many, and eight repetitions of the same
                 club name is the noise the cut took the rules out for. `Last
                 games` on My stats is the sample that names them. */
              {...(n.players === undefined ? {} : { players: n.players })}
              minutes={n.minutes}
              testID="games-night"
              onPress={() => router.push('/settled')}
            />
          ))}
        </View>

        {nights.length === 0 && (
          <Text style={[styles.empty, { color: t.muted }]}>
            {scope === ALL_GROUPS
              ? 'No nights yet. One appears here the moment it is settled.'
              : `No nights with ${scope} yet.`}
          </Text>
        )}
      </View>
    </Screen>
  );
}

/**
 * `28 nights · newest first`.
 *
 * THE COUNT IS THE COUNT OF ROWS DRAWN, not of nights that exist: it is under
 * a group filter, and a line saying 28 over a list of 6 would be the header
 * disagreeing with the screen. `newest first` is the order stated rather than
 * implied, because the alternative is a reader checking the first two dates.
 */
function metaLine(nights: number): string {
  if (nights === 0) return 'no nights yet';
  return `${nights} ${nights === 1 ? 'night' : 'nights'} · newest first`;
}

const styles = StyleSheet.create({
  /* Side margin 22, and no gap: the rows are 60 tall and their own height is
     the separation. Anything added here is the fencing the cut removed. */
  list: { marginHorizontal: space.page },
  empty: { ...type.footnote, marginHorizontal: space.page, paddingTop: 8 },
});
