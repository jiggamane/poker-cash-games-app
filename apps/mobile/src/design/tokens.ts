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
   * Bone is distinctive enough on its own in the dark theme. In the bright one
   * the spec falls the text back to ink and marks the row with a tint instead,
   * so the figure still reads as a different KIND of money rather than as a
   * de-emphasised one.
   */
  offTableWash: string;

  /** Text sitting on a filled primary button. */
  onFill: string;
  /** The 2px keyline set INSIDE a primary button's fill. */
  keyline: string;
  /** Outline and text of a destructive action. Never filled. */
  danger: string;
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
  winWash: 'rgba(111,207,151,0.10)',
  lossWash: 'rgba(240,112,92,0.10)',
  winTint: 'rgba(111,207,151,0.14)',
  offTable: '#D9D3C4',
  offTableWash: 'transparent',
  onFill: '#0C0D0F',
  keyline: '#0A0A0B',
  danger: '#F0705C',
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
  loss: '#C0341B',
  // Lighter again after seeing it on a phone: on white, a wash strong enough to
  // notice turns a run of rows into one solid block and swallows the hairlines
  // between them, which reads as a card — the one thing the row system forbids.
  winWash: 'rgba(10,122,61,0.05)',
  lossWash: 'rgba(192,52,27,0.05)',
  winTint: 'rgba(10,122,61,0.12)',
  // Bone falls back to INK here, with the row carrying the bone instead.
  offTable: '#0C0D0F',
  // Bone is the worst offender here: two adjacent deduction rows became a single
  // beige rectangle. Halved, so the rows read as rows again.
  offTableWash: 'rgba(217,211,196,0.18)',
  onFill: '#FFFFFF',
  keyline: '#FFFFFF',
  danger: '#C0341B',
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
  /** Screen title. 800 32/1.05, -.03em. */
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.96 },
  /** Home-screen destination names. */
  destination: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  /** The group's name above a title. Body weight, not meta. */
  eyebrow: { fontSize: 17, fontWeight: '500' },
  /** Amounts in rows. */
  figure: { fontSize: 19, fontWeight: '700', ...tabular },
  /** A figure in a stat pair. */
  statValue: { fontSize: 18, fontWeight: '700', ...tabular },
  /** The caption under it. */
  statLabel: { fontSize: 11.5, fontWeight: '500' },
  /** Row labels and buttons. */
  body: { fontSize: 17, fontWeight: '500' },
  /** The small print under a row: "second rebuy", "left the table". */
  detail: { fontSize: 12.5, fontWeight: '400', lineHeight: 18 },
  /** Times, counts, explanations. */
  meta: { fontSize: 13, fontWeight: '400' },
  /** Section headers. 11px on the board, not 12. */
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  /** A quiet chip action — "House rules". */
  chip: { fontSize: 12.5, fontWeight: '600' },
  /** A tab, unselected then selected. */
  tab: { fontSize: 14, fontWeight: '600' },
  tabOn: { fontSize: 14, fontWeight: '700' },
  /** A state badge — LIVE. */
  badge: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
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
  /** Cards and tab tracks — two less than the list beside them. */
  card: 20,
  /** Below a card or a tab track. */
  belowCard: 14,
  /** Inside a card. */
  cardPadV: 18,
  cardPadH: 20,
  /** Between the blocks inside a card. */
  cardGap: 12,
  /** Between a pair of stats. */
  statGap: 22,
  /** Vertical padding inside a row. */
  row: 13,
  /** Above a section's caps header. */
  section: 22,
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
  /** Primary, secondary and destructive buttons. */
  height: 56,
  /** Preset chips ($50 / $100). */
  presetHeight: 44,
  /** The keyline set inside a primary button's fill. */
  keylineWidth: 2,
  outlineWidth: 2,
  quietWidth: 1.5,
} as const;
