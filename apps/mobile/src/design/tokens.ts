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
   * beside a disclosure row.
   *
   * "Never used for anything a person has to read" was the intent and it was
   * not true — it carried the seat count, the start time, the dock's own hint
   * and the bill's spend count, all of which a host reads at a table in bad
   * light. At its drawn values it measured 3.54:1 on a card in the dark theme
   * and 2.96:1 in the light one, against a floor of 4.5.
   *
   * It clears the floor now on every ground it is drawn on, which costs it
   * some of its distance from `muted`. The separation between the two tiers is
   * carried by size and weight, and a tone that cannot be read is not a tier.
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

  /**
   * A control the reader cannot use, and its icon.
   *
   * Distinct from `muted`, which is quiet but readable, and from `dim`, which
   * is de-emphasis rather than refusal. A power the reader does not HAVE is
   * removed from the screen entirely; this is for one they have and cannot use
   * right now — start a game with no connection — where the control has to
   * stay put and say why.
   */
  disabled: string;
  /** The fill behind a dock pill and the theme button: the opposite colour, faint. */
  dockFill: string;

  /** The 1.5px border of the end-the-night row: the loss colour at 55%. */
  dangerStrong: string;
  /** What the hold wipes across that row: the same colour at 34%. */
  dangerWipe: string;
  /** A row inside the table-admin drawer. */
  drawerFill: string;
  /** The drawer's own edge, one step stronger than a hairline. */
  drawerEdge: string;

  /**
   * The lighter of the two off-the-table column tints on the deductions
   * preview. Two strengths of one hue let the eye follow a single rule down a
   * table of six people without a second colour entering the design.
   */
  offTableFaint: string;
  /** The rule between rows inside that table: stronger than a hairline. */
  previewRule: string;
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
  dashed: 'rgba(255,255,255,0.26)',
  win: '#6FCF97',
  loss: '#F0705C',
  winWash: 'rgba(111,207,151,0.13)',
  lossWash: 'rgba(240,112,92,0.12)',
  winTint: 'rgba(111,207,151,0.14)',
  offTable: '#D9D3C4',
  offTableWash: 'rgba(217,211,196,0.09)',
  onFillWin: '#0E8A4F',
  dangerWash: 'rgba(240,112,92,0.12)',
  dangerEdge: 'rgba(240,112,92,0.35)',
  onFill: '#0C0D0F',
  keyline: '#0A0A0B',
  danger: '#F0705C',
  dim: '#7F8187',
  roundFill: 'rgba(255,255,255,0.09)',
  sheet: '#101013',
  sheetEdge: 'rgba(255,255,255,0.12)',
  grabber: 'rgba(255,255,255,0.22)',
  scrim: 'rgba(10,10,11,0.68)',
  amber: '#E8B455',
  disabled: '#5C5E64',
  dockFill: 'rgba(255,255,255,0.08)',
  dangerStrong: 'rgba(240,112,92,0.55)',
  dangerWipe: 'rgba(240,112,92,0.34)',
  drawerFill: 'rgba(255,255,255,0.07)',
  drawerEdge: 'rgba(255,255,255,0.16)',
  offTableFaint: 'rgba(217,211,196,0.055)',
  previewRule: 'rgba(255,255,255,0.13)',
};

export const lightTheme: Theme = {
  name: 'light',
  ground: '#FFFFFF',
  surface: '#F4F4F6',
  raised: '#EDEDF0',
  text: '#0C0D0F',
  muted: '#6B6F76',
  hairline: 'rgba(12,13,15,0.1)',
  outline: '#0C0D0F',
  quietOutline: 'rgba(12,13,15,0.24)',
  dashed: 'rgba(12,13,15,0.3)',
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
  dim: '#6A6E75',
  roundFill: 'rgba(12,13,15,0.06)',
  sheet: '#FFFFFF',
  sheetEdge: 'rgba(12,13,15,0.1)',
  grabber: 'rgba(12,13,15,0.18)',
  scrim: 'rgba(255,255,255,0.68)',
  amber: '#7A5410',
  disabled: '#A2A6AD',
  dockFill: 'rgba(12,13,15,0.06)',
  dangerStrong: 'rgba(176,58,40,0.55)',
  dangerWipe: 'rgba(176,58,40,0.34)',
  drawerFill: 'rgba(12,13,15,0.05)',
  drawerEdge: 'rgba(12,13,15,0.15)',
  offTableFaint: 'rgba(120,102,68,0.05)',
  previewRule: 'rgba(12,13,15,0.13)',
};

/**
 * Type scale.
 *
 * THE TYPEFACE IS SF PRO, AND NO WEB FONT SHIPS. The home handoff § 0 made
 * this a decision rather than an accident: every board hands over
 * `-apple-system, 'SF Pro Text', 'Figtree', sans-serif`, which resolves to SF
 * on the Mac a design is approved on and to Figtree on a device that has it —
 * so no width on any board was a fact. One family, in one place: this file.
 *
 * In practice that means **no entry below sets a fontFamily**, because leaving
 * it undefined is what gives the platform's own face — SF Pro on iOS. Do not
 * add one, and do not add a per-screen stack: a second family that can win is
 * the thing the decision exists to prevent. Android falls back to Roboto and
 * is a known gap, not a licence to load a second family on one screen.
 *
 * `scripts/ui-check.mjs` paints Figtree with `--figtree` to preview what
 * bundling it would do. That is a preview; the build does not load it.
 *
 * Sizes are what the boards specify. LETTER-SPACING AND SIZE ARE NEVER USED TO
 * MAKE TEXT FIT A BOX — fit is a layout problem, and the layout has to give.
 *
 * EVERY figure is tabular so columns line up down a list, and so a running
 * clock does not shuffle sideways as it ticks.
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
  /**
   * Screen title on a pushed screen.
   *
   * 33.6 is 32 × 1.05, and it is a deliberate departure: Chrome A says 800 32/1
   * and every drawn frame agrees with it — `font:800 32px/1` on the h2, with no
   * 1.05 anywhere in the handoff. We set 1.05 anyway, because at a flat 1 the
   * descender of a "p" leaves the text box and lands on whatever the screen
   * puts underneath.
   *
   * So `ui-check` will report this line as 33.6 against the board's 32. That is
   * the one place a title is meant to disagree with its frame. Do not "fix" it.
   */
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.96, lineHeight: 33.6 },
  /** The line under it: club · elapsed · since, indented to the title. */
  pushMeta: { fontSize: 13, fontWeight: '500', ...tabular },
  /** A sheet's title. Chrome B: 800 34/1, and 30/1.05 when a sub-line follows. */
  sheetTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1.02, lineHeight: 34 },
  sheetTitleSub: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 31.5 },
  /** A sheet's sub-line: a phrase at 500, a sentence at 400 and 1.5. */
  sheetSub: { fontSize: 13, fontWeight: '500' },
  sheetSentence: { fontSize: 13, fontWeight: '400', lineHeight: 19.5 },
  /*
   * CLUB HOME, in the order it is read. Home handoff § 1, and nothing on that
   * screen is below 12.5 — the 11 of `cardStatus` is uppercase and tracked,
   * which is what makes it legible, and no other role may use it.
   */
  /** The club's name. 800 30/1.06, -.03em. Two lines, then an ellipsis. */
  homeTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 31.8 },
  /** A card's title — "Start a session", "Tonight". 800 21, -.022em. Never wraps. */
  cardTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.462 },
  /** The line under it: seats, stakes, what the ledger is doing. Truncates. */
  cardMeta: { fontSize: 13, fontWeight: '400', ...tabular },
  /**
   * A home destination — "The group", "My stats". 800 21, -.022em. Never wraps.
   *
   * The line heights below are what make a row measure what the handoff says a
   * row measures: 17 + 21 + 4 + 15 + 17. They are set rather than left to the
   * platform, which gives a 21px line a box of about 26 and a row of 79 — five
   * points of nothing, four times over, which is where a fold goes. The 22 is
   * the same 1.05 the pushed title takes and for the same reason: at a flat 21
   * the descender of the "p" in "The group" leaves the box.
   */
  destination: { fontSize: 21, fontWeight: '800', letterSpacing: -0.462, lineHeight: 22 },
  /** The line under it. One line, truncates. */
  destinationSub: { fontSize: 12.5, fontWeight: '400', lineHeight: 15 },
  /** "Start another game" — a secondary row, a step down from a destination. */
  secondary: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.155 },
  /** The group's name in a pushed screen's back bar. */
  eyebrow: { fontSize: 17, fontWeight: '500' },
  /** "Your group", above the club's name on home. Body weight, muted colour. */
  groupLabel: { fontSize: 13, fontWeight: '400' },
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

  /*
   * The explainer block — "How it will be split", "When it is charged".
   * Drawn identically on L1, L5 and GR8: a bordered block with a line of its
   * own over a paragraph. Four screens had hand-copied it and all four had
   * drifted, which is exactly the "assembled rather than designed" failure
   * `docs/ui-guide.md` was written about. See `block` below for its shape.
   */
  blockTitle: { fontSize: 16.5, fontWeight: '600' },
  blockBody: { fontSize: 12.5, fontWeight: '400', lineHeight: 19.4 },

  /*
   * Tonight — 08-tonight-home.md. The session screen runs its own scale: it is
   * read across a room at arm's length, so the figure is bigger and the labels
   * are smaller than anywhere else in the app.
   */
  /** The elapsed time inside the green pill. It IS the live tag. */
  liveTag: { fontSize: 13, fontWeight: '700', letterSpacing: -0.13, ...tabular },
  /** "started 20:05", under the seat count on the On-the-table card. */
  startedAt: { fontSize: 13, fontWeight: '400', ...tabular },
  /** "On the table" — sentence case, and deliberately not the caps eyebrow. */
  tableLabel: { fontSize: 12.5, fontWeight: '600' },
  /** The figure under it. */
  tableFigure: { fontSize: 44, fontWeight: '800', letterSpacing: -1.76, lineHeight: 44, ...tabular },
  /** "$5,000 total in", and the seat count beneath it. */
  tableTotal: { fontSize: 13, fontWeight: '500', ...tabular },
  tableSeats: { fontSize: 13, fontWeight: '400' },
  /** A player row on Tonight: bigger than a totals row, and further apart. */
  tableName: { fontSize: 17, fontWeight: '600' },
  tableAmount: { fontSize: 19, fontWeight: '700', ...tabular },

  /** The dock's disclosure row, closed then open. */
  dockLabel: { fontSize: 14.5, fontWeight: '600' },
  dockLabelOpen: { fontSize: 14.5, fontWeight: '700' },
  dockHint: { fontSize: 13, fontWeight: '400' },
  dockPrimary: { fontSize: 19, fontWeight: '700' },
  dockSecondary: { fontSize: 14.5, fontWeight: '700' },
  dockRow: { fontSize: 16.5, fontWeight: '600' },
  dockEnd: { fontSize: 16.5, fontWeight: '700' },
  dockEndSub: { fontSize: 12.5, fontWeight: '400' },

  /** The player card's stat pairs, at two and at three across. */
  statPairLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  statPairValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1.28, lineHeight: 32, ...tabular },
  statPairValueTight: { fontSize: 30, fontWeight: '800', letterSpacing: -1.2, lineHeight: 30, ...tabular },
  /** The note beside them, at 104 wide. */
  statPairNote: { fontSize: 12, fontWeight: '400', lineHeight: 16.8 },
  /** An entry on the player card: what it was, over where it came from. */
  entryType: { fontSize: 16, fontWeight: '600' },
  entryProvenance: { fontSize: 12.5, fontWeight: '400' },
  entryAmount: { fontSize: 17, fontWeight: '700', ...tabular },
  /** A name inside a net chip, then the figure beside it. */
  netName: { fontSize: 14, fontWeight: '600' },
  netFigure: { fontSize: 14, fontWeight: '700', ...tabular },
  /** A tab, unselected then selected. */
  tab: { fontSize: 14, fontWeight: '600' },
  tabOn: { fontSize: 14, fontWeight: '700' },
  /** A state badge — LIVE. */
  badge: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  /**
   * The status line inside home's filled card — "PLAYING NOW · 3H 17M".
   *
   * 11/700 uppercase at .1em. It carries a running clock, so it is tabular and
   * it NEVER wraps and NEVER truncates: a status that says "PLAYING NOW · 3H…"
   * is worse than no status at all.
   */
  cardStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, ...tabular },
  /** The line under a filled card's name. */
  cardLede: { fontSize: 14, fontWeight: '500' },
  /**
   * A home dock pill's label. Always visible — the dock is never icon-only,
   * and never a tab bar. (The session screen's dock is a different object at a
   * different size: `dockLabel`, above.)
   */
  homeDock: { fontSize: 13.5, fontWeight: '600' },
  /** A quiet outlined action. */
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

/**
 * The explainer block, from `L1`, `L5` and `GR8` — all three draw it the same.
 *
 * It is NOT a card: 12 rather than 14, and 18 of horizontal padding rather
 * than a card's 20. Two pixels each way, and copying a card instead is what
 * had it looking almost right on four different screens.
 */
export const block = {
  padV: 16,
  padH: 18,
  gap: 8,
  radius: 12,
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
 * Club home, measured from the safe-area inset down. Home handoff § 2.
 *
 * Two gutters, both fixed and neither scaling with the screen: content sits in
 * 20, the row list in 22, so the hairlines are inset from the cards above them.
 *
 * THE ONE RULE THAT KEEPS THE SCREEN HONEST: a row is intrinsic height —
 * 17 + 21 + 4 + 15 + 17 ≈ 74pt — and never stretches. Every leftover point on
 * a tall screen goes into ONE flexible spacer between the row list and the
 * dock. Spread the slack into the rows instead and a six-player table shows
 * five, because the rows have quietly eaten the fold.
 */
export const home = {
  /** Content gutter, and the row list's own two-larger one. */
  gutter: 20,
  rowGutter: 22,

  /** Header: 26 from the inset, 5 under the eyebrow, 20 under the name. */
  padTop: 26,
  eyebrowGap: 5,
  nameGap: 20,

  /** The primary card: 14 / 18 / 16, and 18 at the top when it is the idle one. */
  cardPadTop: 14,
  cardPadH: 18,
  cardPadBottom: 16,
  cardPadTopIdle: 18,
  /** Between the label, the title and the meta inside it — 7 on the idle card. */
  cardGap: 9,
  cardGapIdle: 7,
  /** Card to card, and card to "Start another game". */
  cardGapOuter: 10,
  /** "Start another game" — 14 / 16, dashed. */
  secondaryPadV: 14,
  secondaryPadH: 16,
  /** The last card down to the row list. */
  listGap: 20,

  /** A row: 17 above and below, 4 between its two lines. */
  rowPadV: 17,
  rowGap: 4,
  /** What a row must measure. Asserted, not hoped for. */
  rowHeight: 74,

  /** The dock: pills at 13/16, 8 icon to label, 10 pill to pill, 4 off the foot. */
  dockPadV: 13,
  dockPadH: 16,
  dockIconGap: 8,
  dockGap: 10,
  dockBottom: 4,
  /** The theme button, and the floor under every tappable thing on this screen. */
  tap: 44,
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
  /** The gap every pushed screen keeps between its title and its content. */
  titlePadBottom: 6,
  /** 8 / 20 / 0 / 68 — the 68 puts it under the title, not under the button. */
  metaPadTop: 2,
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
