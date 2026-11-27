import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Dropdown, MENU_DIM, type DropdownItem } from '../src/components/Dropdown';
import { GameRow } from '../src/components/GameRow';
import { Card } from '../src/components/Card';
import { GhostGames } from '../src/components/GhostGames';
import { z } from '../src/design/scale';
import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design/useTheme';
import { ALL_GROUPS, scopeLabel, setScope, useScope } from '../src/lib/bookStore';
import { formatNightDate, mostRecentFirst, readBook } from '../src/lib/myStats';
import { openNightById, useMyNights } from '../src/lib/nightStore';

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
 * NOTHING HERE ADDS ANYTHING UP. Every net is `useMyNights`', off the engine.
 */
export default function Sessions() {
  const t = useTheme();
  const mine = useMyNights();
  const scope = useScope();
  const [menuOpen, setMenuOpen] = useState(false);

  /*
   * EVERY NIGHT THIS READER HAS PLAYED, newest first — every settled night on
   * this phone, which is every one the host recorded and every one the pull
   * brought back off the server. `useMyNights` and `readBook` are what stop
   * this screen and My stats holding different books; `See all` leading from a
   * list of eight to a list of none is what they are both for.
   */
  const all = useMemo(() => mostRecentFirst(readBook(mine)), [mine]);

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
      /*
       * NO TEXT ON THE META LINE, only the group control — owner, 4 November.
       * `9 nights · newest first` said what the list already shows, and it was
       * the line B82 had to win width back for. The row stays, empty on the
       * left, because the control lives on it; `metaNode` is how `Screen`
       * draws that row without a string.
       */
      metaNode={<View />}
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
        {/* One card of nights, as My stats' Last games draws them (the full board). */}
        {nights.length > 0 && (
        <Card style={styles.list}>
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
              onPress={() => void openNight(n.id)}
            />
          ))}
        </Card>
        )}

        {/* NO NIGHTS: the placeholder My stats draws under `LAST GAMES` —
            two ghost rows in the faint grey, and the note under them — in the
            place the card of nights would be, at its margins. */}
        {nights.length === 0 && (
          <View style={styles.none}>
            <GhostGames />
            <Text style={[styles.empty, { color: t.muted }]}>
              {scope === ALL_GROUPS
                ? 'No nights yet. One appears here the moment it is settled.'
                : `No nights with ${scope} yet.`}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* Side margin 22, and no gap: the rows are 60 tall and their own height is
     the separation. Anything added here is the fencing the cut removed. */
  list: { marginHorizontal: z(18), marginTop: z(12) },
  /* My stats' body: 18 in, 12 down, 12 between the card and the note. */
  none: { marginHorizontal: z(18), marginTop: z(12), gap: z(12) },
  /* The kit's `note`: 13/1.45, muted — as My stats sets it. */
  empty: { fontSize: z(13), lineHeight: z(18.85) },
});

/**
 * Open one night of the reader's own.
 *
 * ⚠ EVERY ROW USED TO OPEN WHICHEVER NIGHT THE STORE HAPPENED TO HOLD, which
 * `docs/screens.md` recorded as open and which cost nothing while eight of the
 * nine rows were invented anyway. Now that the list is the reader's real
 * history it is the whole screen: nine nights that all open the same one is a
 * list of nine nights you cannot read.
 *
 * The swap comes first and the push second — the same order, and for the same
 * reason, as `goTo` on home: every screen below reads the night the store
 * holds, so pushing first paints the night you were looking at a moment ago.
 */
async function openNight(sessionId: string): Promise<void> {
  await openNightById(sessionId);
  router.push('/settled');
}
