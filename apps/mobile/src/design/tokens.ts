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
  // The bright theme shows a tint more strongly, so the wash is lighter.
  winWash: 'rgba(10,122,61,0.07)',
  lossWash: 'rgba(192,52,27,0.07)',
  // Bone falls back to INK here, with the row carrying the bone instead.
  offTable: '#0C0D0F',
  offTableWash: 'rgba(217,211,196,0.38)',
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
 * Where the token doc gives a RANGE, these sit at the bottom of it — checked on
 * a real phone, where the middle of each range read slightly too large. Display,
 * body and label are single fixed values in the doc and are not ours to move.
 */
export const type = {
  /** Hero amount. One per screen, never two. Fixed at 64 by the spec. */
  display: { fontSize: 64, fontWeight: '800', letterSpacing: -1, ...tabular },
  /** Large screen title, always top-left. Spec 32–34. */
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  /** Home-screen destination names. A name, never a figure. Spec 28–30. */
  destination: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  /** Amounts in rows and strips. Spec 19–24. */
  figure: { fontSize: 19, fontWeight: '700', ...tabular },
  /** Row labels and buttons. Fixed at 17 by the spec. */
  body: { fontSize: 17, fontWeight: '500' },
  /** Times, counts, explanations. Spec 13–15. */
  meta: { fontSize: 13, fontWeight: '400' },
  /** Section headers. Fixed at 12 by the spec. */
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

/** 8 on everything pressable, 14 on cards, 46 on the screen, 999 on the live badge only. */
export const radius = {
  pressable: 8,
  card: 14,
  screen: 46,
  badge: 999,
} as const;

export const space = {
  /** Page margin. */
  page: 22,
  /** Inside cards and button rows. */
  card: 20,
  /** Between cards. */
  betweenCards: 12,
  /** Vertical padding inside a row. Spec 13–17; at the tight end. */
  row: 13,
  /** Gap above a section's caps header. Not specified — tuned on device. */
  section: 26,
} as const;

export const control = {
  /** Primary, secondary and destructive buttons. */
  height: 56,
  /** Preset chips ($50 / $100). */
  presetHeight: 44,
  /** The keyline set inside a primary button's fill. */
  keylineWidth: 2,
  outlineWidth: 2,
  quietWidth: 1.5,
} as const;
