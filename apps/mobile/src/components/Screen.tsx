import type { ComponentRef, ReactNode, RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../design/useTheme';
import { L, T, z } from '../design/scale';
import { useMoneySymbol } from '../lib/money';
import { chrome, space, type } from '../design/tokens';
import { Bar, type BarAction } from './Bar';
import { Icon } from './Icon';
import { Pill } from './Pill';

/**
 * Chrome A — a pushed screen. 09-navigation.md.
 *
 * A screen you navigate TO is pushed and says so with a round back button on
 * its title line. A screen you open to DO ONE THING is a sheet — see `Sheet` —
 * and the two vocabularies must never mix, because which one is on screen is
 * the only thing telling a person whether to swipe down or tap back.
 *
 *   title row   26 / 20 / 0    back 36×36, title 800 32/1, badge after it
 *   meta line    8 / 20 / 0 / 68   500 13 muted, indented under the title
 *
 * THE TOP-RIGHT CORNER IS EMPTY. No actions, no overflow, no icons — not even
 * the home glyph this component used to carry, and not the receipt and house
 * that used to sit on the night screen. Bill lives in the dock; the club is
 * what back returns to. An action that wants a corner wants to be a sheet.
 */
export function Screen({
  title,
  badge,
  trailing,
  meta,
  metaNode,
  metaTrailing,
  backTo,
  lede,
  children,
  footer,
  bar,
  barLine,
  footerPad = true,
  scroll = true,
  headScroll = 'none',
  dimmed = false,
  scrollRef,
  onScrollY,
}: {
  title: string;
  /**
   * After the title, in the same row. A string becomes a status pill; anything
   * else is drawn as given — Tonight's running-time tag is its own element.
   */
  badge?: ReactNode;
  /**
   * The right edge of the title row: the state of the screen, not part of its
   * name. Two things are drawn there — the step count in the ending flow
   * ("1 of 3") and Tonight's running-time tag.
   *
   * NO CONTROLS, ever. Text or a tag, nothing you can press. That rule is what
   * keeps a push and a sheet telling different stories.
   *
   * ONE THING AT A TIME, and never alongside a badge. Two elements pulling at
   * opposite ends of the row leave the title — the one child that shrinks — to
   * absorb what is left, and on Tonight that broke "Tonight" mid-word. Where a
   * screen seems to want both, one of them belongs somewhere else: Tonight's
   * start time is a line on the On-the-table card. docs/tonight-title-row.md
   * has the arithmetic.
   */
  trailing?: ReactNode;
  /** Club · elapsed · since. One line, and it may be a fragment. */
  meta?: string;
  /**
   * The meta line as an element rather than a string — Tonight's role line
   * (`design/handoff-game-admin/` § 4): "**You’re recording** · started 20:05",
   * where the first word is 600 in the primary colour, the rest 500 muted, and
   * a long name truncates while the time and the first word never do. One
   * string cannot say which part gives, so the screen builds the row and this
   * draws it in the meta line's slot, at the meta line's indent, with the meta
   * line's name for `ui-audit.mjs`. `meta` is ignored when it is given;
   * `metaTrailing` is not, since 26 October — Tonight's role line carries the
   * poker tools' icon at its right end on every phone (`ToolsButton`), and
   * the row then takes the floor a meta line with a control takes (B68).
   */
  metaNode?: ReactNode;
  /**
   * A control sharing the meta line, pushed to its right-hand end.
   *
   * THREE SCREENS USE IT — the past session's view control and `/watch`
   * reading the same night (`design/handoff-session-views/`), and Sessions'
   * group scope (`design/handoff-sessions-stats/`), both cut 9 September. Both
   * cuts put the control ON the meta line rather than under it. It is a prop
   * rather than a second meta row because the line has to stay one line: the
   * control is the state of the list below, and a state that wraps onto its
   * own row reads as a heading for the list instead.
   *
   * `meta` still truncates to one line and this does not shrink, which is the
   * same bargain every figure in this app makes against every name.
   *
   * ⚠ THE ROW CARRIES ITS OWN FLOOR and the text-only line does not — see
   * `styles.metaRow`, and B68.
   */
  metaTrailing?: ReactNode;
  /**
   * Where back goes, for the screen reader. The button itself is a bare
   * chevron now — the label that used to sit beside it is gone.
   */
  backTo?: string;
  /** One paragraph under the title, saying what the screen is showing. */
  lede?: string;
  children: ReactNode;
  /** Pinned below the scroll area, where the one primary action lives. */
  footer?: ReactNode;
  /**
   * THE ONE PRIMARY ACTION, as the bar at the bottom edge (F3, the full
   * board). One action, or two of equal weight. `footer` still holds what is
   * not the primary — an outlined secondary, a quiet line — on the sheet above
   * the bar; a screen with a `bar` never puts a filled button in `footer`.
   */
  bar?: BarAction[];
  /** A quiet line inside the bar, above its words. */
  barLine?: string;
  /** Off when the footer carries its own margins — the dock does. */
  footerPad?: boolean;
  /** Off when the screen manages its own scrolling — a list with a dock. */
  scroll?: boolean;
  /**
   * The scroller and how far it is scrolled, for a screen that has to bring
   * something into view itself — the odds calculator's amount above its keypad.
   */
  scrollRef?: RefObject<ComponentRef<typeof ScrollView> | null>;
  onScrollY?: (y: number) => void;
  /**
   * HOW MUCH OF THE HEAD THE BODY CARRIES AWAY WITH IT.
   *
   * `none` — the default, and what doc 15 § 5 check 1 states as the rule: the title,
   * the meta line and the lede stay put and only the body moves.
   *
   * `meta` — the title row is pinned and the line under it scrolls away. The
   * thing that says WHERE YOU ARE stays; the thing that says what you are
   * looking at is part of what you are looking at, and on a screen a person
   * scrolls for a while it is a strip of chrome held over the content for no
   * reason. My stats is the first screen on it.
   *
   * `all` — the whole head goes with the body, back button included. For a
   * screen that is a single long list and nothing else: the roster reaches
   * about thirty rows and pinning 90 points of chrome over them costs a row
   * and a half on every phone. Back is still there — it is one flick up.
   *
   * `scroll={false}` screens do their own scrolling and always keep the whole
   * head, because there is no scroller here to put it in.
   */
  headScroll?: 'none' | 'meta' | 'all';
  /**
   * Everything above the footer drops to .4 while the table-admin drawer is
   * open. The drawer is not a navigation state — it is the dock expanding in
   * place — so the screen stays mounted and simply steps back.
   */
  dimmed?: boolean;
}) {
  const t = useTheme();
  /* SUBSCRIBED, NOT READ. `money.ts` reads the group's symbol at call time, so
     the figures below are right whenever they are drawn — but nothing would
     redraw them when the currency changes. Both chromes take the subscription
     instead of every screen taking it, which is thirty-seven screens covered by
     two lines. */
  useMoneySymbol();

  const badgeNode = typeof badge === 'string' ? <Pill label={badge} onTop /> : badge;

  const titleRow = (
    <View style={styles.titleRow}>
      {backTo !== undefined && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Back to ${backTo}`}
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={styles.flip}>
            <Icon name="chevron" color={t.onTopMuted} />
          </View>
        </Pressable>
      )}
      {/* The frames draw a title on one line because their back chevron sits
          on a row of its own; Chrome A puts the two together, which costs the
          title 48pt. Where that is not enough it WRAPS — an ellipsis would
          drop a word, and "Where everyone st…" is not a screen title. */}
      {/* Named so `scripts/ui-audit.mjs` can tell a screen's own title from a
          big figure inside its body, and hold the rule that a screen never
          scrolls as a whole. */}
      <Text nativeID="screen-title" style={[styles.title, { color: t.onTop }]} numberOfLines={2}>
        {title}
      </Text>

      {badgeNode}
      {trailing !== undefined && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );

  /* The second line, and the paragraph under it when a screen has one. Named
     so `ui-audit.mjs` can say which side of the scroller it ended up on. */
  const sub = (
    <>
      {metaNode !== undefined && metaTrailing === undefined && (
        <View nativeID="screen-meta" style={styles.metaNode}>
          {metaNode}
        </View>
      )}

      {metaNode !== undefined && metaTrailing !== undefined && (
        <View style={styles.metaRow}>
          <View nativeID="screen-meta" style={styles.metaNodeShared}>
            {metaNode}
          </View>
          {metaTrailing}
        </View>
      )}

      {metaNode === undefined && meta !== undefined && metaTrailing === undefined && (
        <Text
          nativeID="screen-meta"
          style={[styles.meta, { color: t.onTopMuted }, backTo === undefined && styles.noIndent]}
          numberOfLines={1}
        >
          {meta}
        </Text>
      )}

      {metaNode === undefined && meta !== undefined && metaTrailing !== undefined && (
        <View style={styles.metaRow}>
          <Text
            nativeID="screen-meta"
            style={[styles.metaShared, { color: t.onTopMuted }]}
            numberOfLines={1}
          >
            {meta}
          </Text>
          {metaTrailing}
        </View>
      )}

      {lede !== undefined && <Text style={[styles.lede, { color: t.onTopMuted }]}>{lede}</Text>}
    </>
  );

  const insets = useSafeAreaInsets();
  /*
   * THE HEAD STAYS ON THE INK, whatever `headScroll` asks (the full board).
   * The title is white on the ink top; carried into the scroller it would be
   * white on the white sheet. `headScroll` is kept so the screens that asked
   * for it still say so, and `ui-audit.mjs` holds them to the pinned head.
   */
  void headScroll;
  const hasBar = bar !== undefined && bar.length > 0;
  const bottomClear = hasBar || footer !== undefined ? 0 : insets.bottom;

  return (
    <View
      // `scripts/ui-frames.mjs` measures the screen's ground here. Without it
      // the tool reads the page's own body colour, which belongs to the
      // browser and not to the design.
      nativeID="app-root"
      style={[styles.screen, { backgroundColor: t.top, paddingTop: insets.top }]}
    >
      {/*
       * THE INK TOP AND THE SHEET THAT RISES OVER IT. The title row and the
       * line under it sit on the ink in white; the body is one sheet in the
       * ground colour, 26 points into the ink with round corners, and only it
       * scrolls — a screen never scrolls its own title away.
       *
       * `flexShrink` bounds the scroller. A ScrollView is as tall as its
       * content unless something says otherwise, and in a column with a pinned
       * footer that means a long screen pushes its own primary action off the
       * bottom of the phone. Sheets had the same bug and it is the same fix.
       */}
      <View style={[styles.fixed, dimmed && styles.dimmed]}>
        {/* BOX-NONE: the top is raised over the sheet so a menu hung from the
            title row or the meta line draws over the body, and its last 26
            points of padding sit over the sheet's first 26. Without this they
            caught every tap there — the odds calculator's Board label went
            dead (ui-odds, 24 November). Only the rows inside it take a touch. */}
        <View style={styles.top} pointerEvents="box-none">
          {titleRow}
          {sub}
        </View>
        <View style={[styles.sheet, { backgroundColor: t.ground }]}>
          {scroll ? (
            <ScrollView
              ref={scrollRef}
              onScroll={onScrollY === undefined ? undefined : (e) => onScrollY(e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
              contentContainerStyle={[styles.content, { paddingBottom: 24 + bottomClear }]}
              showsVerticalScrollIndicator={false}
              style={styles.body}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, { paddingBottom: bottomClear }]}>{children}</View>
          )}
        </View>
      </View>

      {footer !== undefined && (
        <View
          style={[
            footerPad ? styles.footer : undefined,
            { backgroundColor: t.ground },
            !hasBar && footerPad && { paddingBottom: 6 + insets.bottom },
          ]}
        >
          {footer}
        </View>
      )}
      {hasBar && <Bar actions={bar} line={barLine} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixed: { flex: 1 },
  top: { paddingHorizontal: L.topPadH, paddingTop: L.topPadTop, paddingBottom: L.topPadBottom, zIndex: 20 },
  sheet: {
    flex: 1,
    marginTop: -L.sheetOverlap,
    borderTopLeftRadius: L.sheetRadius,
    borderTopRightRadius: L.sheetRadius,
    overflow: 'hidden',
    paddingTop: z(6),
  },
  flip: { transform: [{ scaleX: -1 }] },
  noIndent: { paddingLeft: z(0) },
  // A pushed screen fills the phone, so its scroll area takes what is left
  // after the footer and the footer stays at the foot. (A sheet does the
  // opposite — it shrinks to its content; see `Sheet`.)
  body: { flexGrow: 1, flexShrink: 1 },
  content: {},
  dimmed: { opacity: chrome.behindDrawer },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: z(10),
    /*
     * ABOVE THE BODY, for the same reason `metaRow` below is and it took
     * longer to find here. The one screen that fills `trailing` puts a
     * dropdown in it, and a dropdown hangs a menu — and a backdrop — down over
     * the body. The body is a LATER SIBLING of this row and later siblings
     * paint on top, so without this the menu is drawn under the first card on
     * the screen and the backdrop under the whole scroller: the menu looks
     * right in a screenshot and a tap meant for it lands on whatever is
     * behind. B77.
     *
     * It changes nothing else. This row and the body do not overlap — they are
     * two boxes in a column — so the order only ever decides what happens to
     * the things this row hangs OUTSIDE itself.
     */
    zIndex: 20,
    minHeight: L.titleRowMin,
  },
  /* A bare chevron in the ink's quieter white, 18 wide, pulled 5 into the margin (the kit's `.bk`). */
  back: {
    width: L.backWidth,
    height: L.titleRowMin,
    marginLeft: z(-5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...T.lookTitle, flexShrink: 1 },
  trailing: { marginLeft: 'auto' },
  meta: {
    ...T.lookMeta,
    paddingTop: L.metaGap,
    paddingLeft: L.metaIndent,
    /* NOT A SHRINKING CHILD OF THE COLUMN. On the web a Text shrinks by
       default, and this one sits above a scroller that is allowed to: a body
       taller than the phone took a third of this line's height and the
       descenders with it, on every long pushed screen. B100. */
    flexShrink: 0,
  },
  /* The same slot as `meta`, holding a row rather than a string. */
  metaNode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: L.metaGap,
    paddingLeft: L.metaIndent,
  },
  /* The same line with something on the end of it. The padding moves to the
     row so the control sits at the page's edge and the text keeps its indent. */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    /*
     * 8 RATHER THAN THE TITLE ROW'S 12, and the four points are not cosmetic —
     * B82. This row is the only place in the app where a line of text and a
     * control compete for one width: the indent takes 68 from the left so the
     * text sits under the title, the control takes what its longest item needs
     * from the right, and what is left is about 145 points at the reader's
     * larger text settings. `9 nights · newest first` wants 147 of them.
     *
     * Nothing between the two is drawn by a board — the boards place the text
     * at the left and the control at the right — so the gap is the one
     * dimension here that can be spent, and it buys the line back. Do not
     * raise it to match the title row: nothing competes for width up there.
     */
    gap: z(8),
    /*
     * ABOVE THE BODY, because the one control that uses this line opens a menu
     * that hangs below it and the list is a LATER SIBLING. Later siblings paint
     * on top, so without this the menu is drawn and then covered by the first
     * two rows of the list — visible in a screenshot, unclickable on a phone,
     * which is the worst of both.
     */
    zIndex: 20,
    paddingTop: L.metaGap,
    paddingLeft: L.metaIndent,
    /* AND A FLOOR, which `styles.meta` above deliberately has not got. The
       control is 34 points tall where the text is 16, so what the first row of
       the body meets is the button's edge rather than a baseline with air
       under it. B68. */
  },
  metaShared: { ...T.lookMeta, flexShrink: 1 },
  /* The element form of `metaShared`: it takes what the control leaves and
     its own text shrinks inside it, which is what `minWidth: 0` is for. */
  metaNodeShared: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  lede: { ...type.lede, marginTop: z(8), flexShrink: 0 },

  // Every board draws the footer `14px 20px 0` with `gap: 10` — E2b, E4, E5,
  // L1, N5, N7, GR4. The 16 and the 12 here were neither, and a two-pixel
  // error on the one block that sits on every screen is the most visible
  // place in the app to have one. The 6 at the foot stays: it is clearance
  // over the safe-area inset, which the drawn frames do not have.
  // doc 15 § 2 and § 5 check 2: 14 / 20 above, and the button's bottom edge 28
  // above the screen bottom — 6 of pad plus the 22 the indicator band takes.
  // The safe-area inset covers the band on a phone, so `Screen` adds the 6 and
  // the inset does the rest.
  footer: {
    paddingHorizontal: space.card,
    paddingTop: z(14),
    paddingBottom: z(14),
    gap: z(10),
  },
});
