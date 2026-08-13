/**
 * Design tokens, taken from design/Style Guide v2.dc.html.
 *
 * Two themes, and NO BRAND ACCENT on purpose. Actions are carried by fill and
 * weight, which leaves green and red free to mean exactly one thing: money won
 * and money lost. If something in this app is coloured, it is money.
 *
 * Values here are the shipped ones. Don't invent new colours — if a screen
 * seems to need one, it probably needs a different weight or fill instead.
 */

import type { TextStyle } from 'react-native';

export interface Theme {
  name: 'dark' | 'light';

  /** Page background. */
  ground: string;
  /** A card or grouped block sitting on the ground. */
  surface: string;
  /** A block raised above a surface. */
  raised: string;
  /** Primary text, and the fill of a primary button. */
  text: string;
  /** Secondary text: times, counts, explanations. */
  muted: string;

  /** The line between rows. Never a box inside a box. */
  hairline: string;
  /** 2px outline of a secondary button. */
  outline: string;
  /** 1.5px outline of a quiet chip action. */
  quietOutline: string;
  /** 1.5px dashed outline — dashed always means "creates something". */
  dashed: string;

  /** Money, and nothing else. */
  win: string;
  loss: string;
  /**
   * A faint wash behind a net row, so a win or a loss registers at arm's
   * length rather than only on close reading of the figure. Net rows only —
   * transfer rows stay neutral, and no control is ever tinted.
   */
  winWash: string;
  lossWash: string;
  /** A LIVE badge's fill — the win colour at 14%. Tinted, never outlined:
   *  an outline reads as a control, a tint reads as a state. */
  winTint: string;
  /** Money leaving the table: bill, kitty, host fee. */
  offTable: string;
  /**
   * A row of off-the-table money is a rounded washed block, in BOTH themes —
   * radius 8, inset by 12 past the list, so it reads as a different kind of
   * money rather than a de-emphasised one.
   */
  offTableWash: string;

  /**
   * The inverted card on the home screen — ink on white, white on ink. Its
   * green has to read against the FILL, not the ground, which is why it is a
   * token of its own rather than `win`.
   */
  onFillWin: string;

  /** A warning block: 12% fill, 35% border, both in the loss colour. */
  dangerWash: string;
  dangerEdge: string;

  /** Text sitting on a filled primary button. */
  onFill: string;
  /** The 2px keyline set INSIDE a primary button's fill. */
  keyline: string;
  /** Outline and text of a destructive action. Never filled. */
  danger: string;

  /**
   * A third text tone, below `muted`: the seat count beside a figure, the hint
   * beside a disclosure row. Never used for anything a person has to read.
   */
  dim: string;

  /** Fill of a round chrome button — the 36px back, the 30px sheet close. */
  roundFill: string;

  /*
   * Chrome B. A sheet is not a card: it is lighter than the ground in the dark
   * theme and white in the light one, so the screen it covers reads as being
   * behind it rather than beside it.
   */
  sheet: string;
  sheetEdge: string;
  grabber: string;
  /**
   * What is behind a sheet sits at opacity .32, which is the ground showing
   * through at 68% — so the scrim IS the ground colour at that alpha.
   */
  scrim: string;

  /** Pending, unclaimed, unpaid. Text and 1px border on a pill, never a fill. */
  amber: string;
}

export const darkTheme: Theme = {
  name: 'dark',
  ground: '#0A0A0B',
  surface: '#16161A',
  raised: '#26262B',
  text: '#FFFFFF',
  muted: '#8B8D93',
  hairline: 'rgba(255,255,255,0.11)',
  outline: 'rgba(255,255,255,0.55)',
  quietOutline: 'rgba(255,255,255,0.28)',
  dashed: 'rgba(255,255,255,0.30)',
  win: '#6FCF97',
  loss: '#F0705C',
  winWash: 'rgba(111,207,151,0.13)',
  lossWash: 'rgba(240,112,92,0.12)',
  winTint: 'rgba(111,207,151,0.14)',
  offTable: '#D9D3C4',
  offTableWash: 'rgba(217,211,196,0.09)',
  onFillWin: '#0A7A3D',
  dangerWash: 'rgba(240,112,92,0.12)',
  dangerEdge: 'rgba(240,112,92,0.35)',
  onFill: '#0C0D0F',
  keyline: '#0A0A0B',
  danger: '#F0705C',
  dim: '#6C6E74',
  roundFill: 'rgba(255,255,255,0.09)',
  sheet: '#101013',
  sheetEdge: 'rgba(255,255,255,0.12)',
  grabber: 'rgba(255,255,255,0.22)',
  scrim: 'rgba(10,10,11,0.68)',
  amber: '#E8B455',
};

export const lightTheme: Theme = {
  name: 'light',
  ground: '#FFFFFF',
  surface: '#F4F4F6',
  raised: '#EDEDF0',
  text: '#0C0D0F',
  muted: '#6B6F76',
  hairline: '#E2E3E7',
  outline: '#0C0D0F',
  quietOutline: 'rgba(12,13,15,0.24)',
  dashed: 'rgba(12,13,15,0.28)',
  win: '#0A7A3D',
  // #B03A28 on every bright board. The token doc says #C0341B; the board wins.
  loss: '#B03A28',
  winWash: 'rgba(10,122,61,0.13)',
  lossWash: 'rgba(176,58,40,0.12)',
  winTint: 'rgba(10,122,61,0.12)',
  // Bone does NOT fall back to ink, whatever the token doc says: the bright
  // boards draw off-table money in a warm brown, on a wash of the same hue.
  // That was the fix for two deduction rows merging into one beige rectangle —
  // the wash is the same 9% as the dark theme, only the hue changes.
  offTable: '#786644',
  offTableWash: 'rgba(120,102,68,0.09)',
  // DELIBERATE DEVIATION. Both boards draw this dot #0A7A3D, but here the card
  // is filled with ink, so the board's value is a dark green on near-black —
  // about 2.5:1. Read as the intent ("green that reads on the fill") rather
  // than the literal value, which flips it to the dark theme's green.
  onFillWin: '#6FCF97',
  dangerWash: 'rgba(176,58,40,0.12)',
  dangerEdge: 'rgba(176,58,40,0.35)',
  onFill: '#FFFFFF',
  keyline: '#FFFFFF',
  danger: '#B03A28',
  dim: '#8A8F96',
  roundFill: 'rgba(12,13,15,0.06)',
  sheet: '#FFFFFF',
  sheetEdge: 'rgba(12,13,15,0.1)',
  grabber: 'rgba(12,13,15,0.18)',
  scrim: 'rgba(255,255,255,0.68)',
  amber: '#8A5A00',
};

/**
 * Type scale.
 *
 * SF on Apple platforms, Figtree everywhere else. Leaving fontFamily undefined
 * gives the system font, which is SF on iOS — correct. Android currently falls
 * back to Roboto; loading Figtree via expo-font is a small follow-up for parity.
 *
 * EVERY figure is tabular so columns line up down a list.
 */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/*
 * Taken from the drawn screens, not from the token doc.
 *
 * docs/screen-specs/ holds the exact inline styles from every board. Where the
 * two disagree the board wins: the section label, for instance, is 11px there
 * and 12 in the doc. See docs/ui-guide.md.
 */
export const type = {
  /** A settled result. The one 64px figure, on the last screen of a night. */
  display: { fontSize: 64, fontWeight: '800', letterSpacing: -2.5, ...tabular },
  /** The figure inside a surface card — "On the table". 800 48/1, -.04em. */
  cardFigure: { fontSize: 48, fontWeight: '800', letterSpacing: -1.9, ...tabular },
  /** Screen title on a pushed screen. Chrome A: 800 32/1, -.03em. */
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.96, lineHeight: 32 },
  /** The line under it: club · elapsed · since, indented to the title. */
  pushMeta: { fontSize: 13, fontWeight: '500', ...tabular },
  /** A sheet's title. Chrome B: 800 34/1, and 30/1.05 when a sub-line follows. */
  sheetTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1.02, lineHeight: 34 },
  sheetTitleSub: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 31.5 },
  /** A sheet's sub-line: a phrase at 500, a sentence at 400 and 1.5. */
  sheetSub: { fontSize: 13, fontWeight: '500' },
  sheetSentence: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },
  /** The group's name on home. 800 30/1.05 — two smaller than a pushed title. */
  homeTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 32 },
  /** A home destination — "The group", "My stats". 800 30, -.03em. */
  destination: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9 },
  /** The line under it. */
  destinationSub: { fontSize: 14, fontWeight: '400' },
  /** The group's name in a pushed screen's back bar. */
  eyebrow: { fontSize: 17, fontWeight: '500' },
  /** "Your group", above the name on home. Small and semibold, not body. */
  groupLabel: { fontSize: 13, fontWeight: '600' },
  /** Amounts in a totals or transfer row. */
  figure: { fontSize: 19, fontWeight: '700', ...tabular },
  /** Amounts in the feed, which runs one step smaller throughout. */
  feedFigure: { fontSize: 18, fontWeight: '700', ...tabular },
  /** A figure in a stat pair. */
  statValue: { fontSize: 18, fontWeight: '700', ...tabular },
  /** The caption under it. */
  statLabel: { fontSize: 11.5, fontWeight: '500' },
  /** A person's name in a row. 600, not the 500 of body text. */
  rowName: { fontSize: 17, fontWeight: '600' },
  /** What happened, in the feed. */
  feedName: { fontSize: 16, fontWeight: '600' },
  /** Row labels and buttons. */
  body: { fontSize: 17, fontWeight: '500' },
  /** The small print under a totals row. */
  rowDetail: { fontSize: 13, fontWeight: '400', ...tabular },
  /** The small print under a feed row: "second rebuy", "left the table". */
  detail: { fontSize: 12.5, fontWeight: '400', lineHeight: 18 },
  /** A time in the feed's left column. */
  time: { fontSize: 13, fontWeight: '600', ...tabular },
  /** Times, counts, explanations. */
  meta: { fontSize: 13, fontWeight: '400' },
  /** A paragraph of explanation under a title. */
  lede: { fontSize: 14.5, fontWeight: '400', lineHeight: 22 },
  /** The same, smaller — a footnote under a list. */
  footnote: { fontSize: 12.5, fontWeight: '400', lineHeight: 19 },
  /** A label inside a card — "ON THE TABLE". 11px, .1em. */
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  /** A section header over a list — "NIGHT'S NET". A whole point larger. */
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  /** A quiet chip action — "House rules". */
  chip: { fontSize: 12.5, fontWeight: '600' },
  /** A name inside a net chip, then the figure beside it. */
  netName: { fontSize: 14, fontWeight: '600' },
  netFigure: { fontSize: 14, fontWeight: '700', ...tabular },
  /** A tab, unselected then selected. */
  tab: { fontSize: 14, fontWeight: '600' },
  tabOn: { fontSize: 14, fontWeight: '700' },
  /** A state badge — LIVE. */
  badge: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  /** The status line inside home's filled card — "PLAYING NOW · 3H 17M". */
  cardStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 1.32 },
  /** The line under a filled card's name. */
  cardLede: { fontSize: 14, fontWeight: '500' },
  /** A quiet outlined action in home's bottom bar. */
  quietAction: { fontSize: 15, fontWeight: '700' },
  /** A text action in a navigation bar — "Edit", "Cancel". */
  barAction: { fontSize: 16, fontWeight: '700' },
} satisfies Record<string, TextStyle>;

/** 8 on everything pressable, 14 on cards, 46 on the screen, 999 on the live badge only. */
export const radius = {
  pressable: 8,
  card: 14,
  screen: 46,
  badge: 999,
} as const;

/*
 * There is NO single page margin. The board insets a card by 20 and the list
 * beneath it by 22, and that 2px difference is visible. Measured, not rounded.
 */
export const space = {
  /** Lists, and the title row. */
  page: 22,
  /** Cards, tab tracks, bars — two less than the list beside them. */
  card: 20,
  /** The home screen's own inset: its header and its destination list. */
  home: 24,
  /** Below a card or a tab track. */
  belowCard: 14,
  /** Inside a card. */
  cardPadV: 18,
  cardPadH: 20,
  /** Between the blocks inside a card. */
  cardGap: 12,
  /** Between a pair of stats. */
  statGap: 22,
  /**
   * Vertical padding inside a row, which is NOT one number:
   * a totals row is tight, a transfer row is open, the feed sits between.
   */
  totalsRow: 9,
  feedRow: 13,
  transferRow: 15,
  /** A row's own horizontal inset, inside the list's margin. */
  rowInset: 4,
  /** Above a section's caps header. */
  section: 22,
} as const;

/**
 * The two chromes, from 09-navigation.md.
 *
 * A pushed screen carries a round back button and nothing at all in the
 * top-right corner. A sheet carries a grabber and a round close and never a
 * chevron. Mixing the two vocabularies is the one thing that would leave a
 * person unsure which gesture takes them back, so these numbers are the whole
 * signal and are kept together rather than inlined per screen.
 */
export const chrome = {
  /** Title row: 26 / 20 / 0, centred, gap 12. */
  titlePadTop: 26,
  titlePadH: 20,
  titleGap: 12,
  /** The round back button, and the chevron inside it. */
  back: 36,
  /** 8 / 20 / 0 / 68 — the 68 puts it under the title, not under the button. */
  metaPadTop: 8,
  metaIndent: 68,

  /** The sheet panel. */
  sheetTop: 18,
  sheetRadius: 26,
  sheetTitlePadTop: 12,
  sheetTitlePadH: 22,
  sheetTitleGap: 11,
  grabberWidth: 38,
  grabberHeight: 5,
  close: 30,
  /** What is behind a sheet, and behind the table-admin drawer. */
  behindSheet: 0.32,
  behindDrawer: 0.4,
} as const;

export const control = {
  /** Tab track: radius 10, 3 of padding; each tab radius 7, 10 of padding. */
  tabTrackRadius: 10,
  tabTrackPad: 3,
  tabRadius: 7,
  tabPadV: 10,
  /** A chip action. */
  chipPadV: 8,
  chipPadH: 11,
  /** A state badge. */
  badgePadV: 6,
  badgePadH: 11,
  /** A quiet outlined action on home: 13/18, radius 8, 1.5px. */
  quietPadV: 13,
  quietPadH: 18,
  /** Primary, secondary and destructive buttons. 18 + 20 + 18 on the board. */
  height: 56,
  /** Preset chips ($50 / $100). */
  presetHeight: 44,
  /** The keyline set inside a primary button's fill. */
  keylineWidth: 2,
  outlineWidth: 2,
  quietWidth: 1.5,
} as const;
