import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Text, TextInput } from '../src/components/Text';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { SPOTS, type SpotPlace } from '../src/art/spots';
import { useTheme } from '../src/design/useTheme';
import { L, T, z } from '../src/design/scale';
import { switchClub, useClubs, type Standing } from '../src/lib/clubStore';
import { useNight } from '../src/lib/nightStore';

/**
 * Your groups — GR2. The ONLY cross-group screen in the app.
 *
 * Everything else below Home belongs to one club, and tapping a card here swaps
 * all of it — roster, nights, rules, book — and returns Home. That is why the
 * standing sits on the card: the same person is admin of one club and a name in
 * another, and which one you are about to become matters before you switch.
 *
 * THE FULL BOARD (`groups`, the owner's pick of four, 22 November, approved):
 * each group a card with its NAME AS THE HEADLINE and your standing above it;
 * no picture and NO CURRENCY — the row used to read "6 players · USD", and
 * dropping the currency is the owner's call, made on that pick. The group you
 * are in is the ink card. A group with a night running says so instead of how
 * many play there. No chevrons. New group is the bar.
 *
 * With no groups it is the walkthrough (`groups-empty` … `-4`, approved): four
 * pages swiped through, both ways in — New group and I have a code — as equal
 * halves of the bar on every page.
 */
export default function YourGroups() {
  const t = useTheme();
  const { clubs, currentId } = useClubs();
  const night = useNight();

  const liveIn = night !== null && night.status !== 'settled' ? night.groupName : null;

  if (clubs.length === 0) return <Walkthrough />;

  return (
    <Screen
      title="Your groups"
      backTo="the club"
      bar={[{ label: 'New group', onPress: () => router.push('/new-group') }]}
    >
      <View style={styles.list}>
        {clubs.map((c) => {
          const current = c.id === currentId;
          const live = c.name === liveIn;
          /* The ink card reads in the fill's own colours; every other card in the sheet's. */
          const ink = current ? t.onFill : t.text;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: current }}
              onPress={() => {
                void switchClub(c.id);
                router.dismissTo('/');
              }}
              style={({ pressed }) => [
                styles.group,
                { backgroundColor: current ? t.text : t.surface, boxShadow: t.lift },
                pressed && { opacity: 0.6 },
              ]}
            >
              <View style={styles.groupTop}>
                <View style={styles.standing}>
                  {/* On the ink the tag is the fill's own colour, faint, so it reads in both themes. */}
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.standingFill,
                      current ? { backgroundColor: t.onFill, opacity: 0.16 } : { backgroundColor: t.raised },
                    ]}
                  />
                  <Text style={[styles.standingText, { color: current ? t.onFill : t.muted }]}>
                    {standingWord(standingOfMine(c.members)).toUpperCase()}
                  </Text>
                </View>
                {live ? (
                  <View style={styles.liveLine}>
                    <View style={[styles.liveDot, { backgroundColor: current ? t.onFillWin : t.win }]} />
                    <Text style={[styles.line, { color: current ? t.onFillWin : t.win }]} numberOfLines={1}>
                      a night is running
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.line, styles.quietLine, { color: ink }]} numberOfLines={1}>
                    {`${c.members.length} ${c.members.length === 1 ? 'player' : 'players'}`}
                  </Text>
                )}
              </View>
              <Text style={[styles.name, { color: ink }]} numberOfLines={2}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

/**
 * Your own standing in a club.
 *
 * Only one row on this phone can be an admin today, so the first one is the
 * answer. When members claim their own places this becomes a lookup by the
 * device's player id.
 */
const standingOfMine = (members: ReadonlyArray<{ standing: Standing }>): Standing =>
  members.find((m) => m.standing === 'admin')?.standing ?? 'member';

const standingWord = (s: Standing): string =>
  s === 'admin' ? 'admin' : s === 'member' ? 'member' : 'name only';

/**
 * Your groups, empty: the walkthrough the owner picked (concept B, 22 November),
 * with D's two ways in folded into it. Four pages, swiped through, one idea and
 * one large drawing each: the group's chips, the session stack, Sessions, and
 * then the choice itself.
 *
 * ⚠ DRAFT COPY. The board writes every word of the first three pages and the
 * last page's heading and card for this walkthrough, and flags all of it as
 * draft; the screens are approved, so the words are used as drawn and each is
 * marked where it stands. The app's own are "No groups yet. A group needs only
 * a name to exist.", "New group", "Check the code" and "I have an invite code".
 *
 * BOTH WAYS IN CARRY EQUAL WEIGHT (owner, 22 November: "the invite code should
 * be no less important than creating the group"): the bar is two halves on
 * every page. On the last page the right half is the code form's own action.
 *
 * NOT BUILT: the board's "Scan the QR code" under the boxes. The app has a QR
 * to show (the invite) but no scanner, and the board flags it as needing one.
 */
function Walkthrough() {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [code, setCode] = useState('');
  const last = page === PAGES.length;

  return (
    <Screen
      title="Your groups"
      backTo="the club"
      scroll={false}
      bar={[
        { label: 'New group', icon: 'plus', onPress: () => router.push('/new-group') },
        last
          ? {
              label: 'Check the code',
              icon: 'qr',
              disabled: code.length !== 10,
              /* `/claim` checks a code it is handed exactly as it checks one from a link. */
              onPress: () => router.push({ pathname: '/claim', params: { c: code } }),
            }
          : {
              // board draft copy (groups-empty-1): the app's "I have an invite code", shortened to fit half the bar
              label: 'I have a code',
              icon: 'qr',
              accessibilityLabel: 'I have an invite code',
              onPress: () => router.push('/claim'),
            },
      ]}
    >
      <View style={styles.walk} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {PAGES.map((p, i) => (
              <View key={p.place} style={[styles.page, { width }]}>
                <Art place={p.place} size={150} />
                <Text style={[styles.walkTitle, { color: t.text }]}>{p.title}</Text>
                <Text style={[styles.walkBody, { color: t.muted }]}>{p.body}</Text>
                <Dots on={i} />
              </View>
            ))}
            <View style={[styles.page, styles.lastPage, { width }]}>
              {/* board draft copy (groups-empty-4) */}
              <Text style={[styles.walkTitle, styles.lastTitle, { color: t.text }]}>How do you want to start?</Text>
              <Card pad style={styles.codeCard}>
                <View style={styles.codeHead}>
                  <Art place="group" size={62} />
                  <View style={styles.codeWords}>
                    <Text style={[styles.codeTitle, { color: t.text }]}>I have an invite code</Text>
                    {/* board draft copy (groups-empty-4) */}
                    <Text style={[styles.codeSub, { color: t.muted }]}>
                      Somebody added you to their table. Type the code from their invite.
                    </Text>
                  </View>
                </View>
                <CodeBoxes code={code} setCode={setCode} />
              </Card>
              <Text style={[styles.empty, { color: t.muted }]}>
                No groups yet. A group needs only a name to exist.
              </Text>
              <Dots on={PAGES.length} />
            </View>
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const PAGES: { place: SpotPlace; title: string; body: string }[] = [
  {
    place: 'group',
    // board draft copy (groups-empty-1)
    title: 'Your game, in one place',
    // board draft copy (groups-empty-1)
    body: 'A group is your table: its players, its buy-in and its rules. Start one and every night you play is kept in it.',
  },
  {
    place: 'session',
    // board draft copy (groups-empty-2)
    title: 'Every buy-in, logged',
    // board draft copy (groups-empty-2)
    body: 'Record each buy-in and rebuy as it happens. At the end of the night, the app counts it up and settles who pays whom.',
  },
  {
    place: 'sessions',
    // board draft copy (groups-empty-3)
    title: 'Every night, kept',
    // board draft copy (groups-empty-3)
    body: 'Each night is saved with its results, so the group’s history and everyone’s stats are always there.',
  },
];

/**
 * An approved drawing at a set size (the kit's `art()`): the board's large
 * picture on a walkthrough page is bigger than any of `Spot`'s levels.
 */
function Art({ place, size }: { place: SpotPlace; size: number }) {
  const t = useTheme();
  const art = SPOTS[place];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.art}>
      <SvgXml xml={t.name === 'dark' ? art.dark : art.light} width={z(size)} height={z(size)} />
    </View>
  );
}

/** Where you are in the four pages: the current one a bar, the rest dots. */
function Dots({ on }: { on: number }) {
  const t = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: PAGES.length + 1 }, (_, i) => (
        <View
          key={i}
          style={[styles.dotMark, { width: i === on ? z(18) : z(6), backgroundColor: i === on ? t.text : t.hairline }]}
        />
      ))}
    </View>
  );
}

/**
 * The claim's two boxes, in place on the last page: five and five, because the
 * server issues ten (the board draws three and three, the owner's six-character
 * code, which is a server change and a security decision). Filled, the bar's
 * Check the code hands the code to `/claim`, which checks it as a link would.
 */
function CodeBoxes({ code, setCode }: { code: string; setCode: (v: string) => void }) {
  const t = useTheme();
  const second = useRef<TextInputInstance>(null);
  const [focus, setFocus] = useState<0 | 1 | 2>(0);
  const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const first = code.slice(0, 5);
  const rest = code.slice(5, 10);
  const box = (which: 1 | 2) => [
    styles.box,
    { backgroundColor: t.surface, borderColor: focus === which ? t.text : t.outline, color: t.text },
    focus === which && styles.boxFocused,
  ];
  return (
    <View style={styles.boxes}>
      <TextInput
        style={box(1)}
        value={first}
        onChangeText={(v) => {
          setCode(clean(v).slice(0, 5) + rest);
          if (clean(v).length >= 5) second.current?.focus();
        }}
        onFocus={() => setFocus(1)}
        onBlur={() => setFocus(0)}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={5}
        accessibilityLabel="First five characters"
      />
      <Text style={[styles.dash, { color: t.muted }]}>–</Text>
      <TextInput
        ref={second}
        style={box(2)}
        value={rest}
        onChangeText={(v) => setCode(first + clean(v).slice(0, 5))}
        onFocus={() => setFocus(2)}
        onBlur={() => setFocus(0)}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={5}
        accessibilityLabel="Last five characters"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: z(18), paddingTop: z(12), gap: z(12) },

  /* The board's `headlineGroup`: 14 / 16, 8 between the tag line and the name. */
  group: { borderRadius: L.cardRadius, paddingVertical: z(14), paddingHorizontal: z(16), gap: z(8) },
  groupTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: z(8) },
  standing: { paddingVertical: z(4), paddingHorizontal: z(7), flexShrink: 0 },
  standingFill: { borderRadius: 999 },
  standingText: { fontSize: z(10), fontWeight: '700', letterSpacing: z(0.9), lineHeight: z(12) },
  liveLine: { flexDirection: 'row', alignItems: 'center', gap: z(6), flexShrink: 1 },
  liveDot: { width: z(7), height: z(7), borderRadius: z(3.5) },
  line: { fontSize: z(12), fontWeight: '400', flexShrink: 1 },
  quietLine: { opacity: 0.6 },
  name: { fontFamily: 'head', fontSize: z(22), fontWeight: '800', letterSpacing: z(-0.44), lineHeight: z(24.2) },

  /* The walkthrough. */
  walk: { flex: 1 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: z(18), paddingHorizontal: z(24) },
  lastPage: { alignItems: 'stretch', gap: z(14), paddingHorizontal: z(18) },
  art: { alignSelf: 'center' },
  walkTitle: {
    fontFamily: 'head',
    fontSize: z(24),
    fontWeight: '800',
    letterSpacing: z(-0.48),
    lineHeight: z(26.9),
    textAlign: 'center',
  },
  lastTitle: { fontSize: z(22), letterSpacing: z(-0.44), lineHeight: z(24.6), textAlign: 'left' },
  walkBody: { ...T.lookSheetSub, fontSize: z(13.5), lineHeight: z(19.6), textAlign: 'center', maxWidth: z(250) },
  dots: { flexDirection: 'row', gap: z(6), justifyContent: 'center' },
  dotMark: { height: z(6), borderRadius: z(3) },
  empty: { fontSize: z(13), fontWeight: '400', lineHeight: z(18.85), textAlign: 'center' },

  codeCard: { gap: z(12) },
  codeHead: { flexDirection: 'row', alignItems: 'center', gap: z(12) },
  codeWords: { flex: 1, minWidth: 0 },
  codeTitle: { fontFamily: 'head', fontSize: z(18), fontWeight: '700', lineHeight: z(20.7) },
  codeSub: { fontSize: z(12.5), fontWeight: '400', lineHeight: z(17.5), marginTop: z(4) },
  boxes: { flexDirection: 'row', alignItems: 'center', gap: z(10) },
  box: {
    flex: 1,
    minWidth: 0,
    height: z(62),
    borderRadius: L.fieldRadius,
    borderWidth: 1.5,
    textAlign: 'center',
    fontFamily: 'head',
    fontSize: z(24),
    fontWeight: '700',
    letterSpacing: z(3.36),
    paddingHorizontal: z(6),
  },
  boxFocused: { borderWidth: 2 },
  dash: { fontFamily: 'head', fontSize: z(24), fontWeight: '700' },
});
