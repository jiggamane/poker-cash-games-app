import { Circle, Path, Rect, Svg } from 'react-native-svg';

/**
 * The drawn glyphs, copied path-for-path out of the design boards.
 *
 * The boards ship inline SVG, so there is no icon set to choose and no
 * approximation to make: `d` below is the same string the designer drew with.
 * Stroke widths differ per glyph on purpose — the back chevron is 2.3, the home
 * roof 1.9, the settings gear 1.8 — and copying them keeps the weights matched
 * the way they are on the board.
 */

export type IconName =
  /** A row's "go here" arrow, and the payer → payee arrow on a transfer. */
  | 'arrow'
  /** Back, in the navigation bar. */
  | 'back'
  /** The small chevron at the end of a tappable row. */
  | 'chevron'
  /** The club, always one tap away. */
  | 'home'
  /** House rules. */
  | 'info'
  /** The rule book, in the night's bar. */
  | 'rules'
  | 'settings'
  | 'invite'
  /** The time an entry is stamped with. */
  | 'clock'
  /** The keypad's delete key. */
  | 'backspace'
  /** Adds something — always paired with a dashed outline. */
  | 'plus'
  /** A sheet's close. The only glyph that dismisses rather than navigates. */
  | 'close'
  /** The dock's disclosure, pointing at the drawer it opens. */
  | 'chevronUp'
  /** Its opposite: a row that opens downward into itself — E6's receipt. */
  | 'chevronDown'
  /** Seat a player. */
  | 'person'
  /** Cash a player out — a seat emptying, not a warning. */
  | 'cashOut'
  /** The bill. */
  | 'receipt'
  /** Settled. */
  | 'check'
  /** Change this figure — one per editable row in the ending flow. */
  | 'pencil'
  /*
   * C3a's four share chips, in the fixed order Copy · Message · Share · QR
   * code. Copied path-for-path out of `screens-invite-and-watcher.html`, where
   * all four are drawn at 17px on a 24 viewBox with a 1.9 stroke.
   */
  | 'copy'
  | 'message'
  | 'share'
  | 'qr'
  /*
   * The theme button's two faces. It shows the theme you will GET, so the sun
   * paints while the app is dark and the moon while it is light.
   *
   * `settings` had been a circle with rays — a sun in everything but name —
   * which was fine while it was the only round glyph on home and is not fine
   * now that the two sit in the same dock row. It is a cog below; this is the
   * sun.
   */
  | 'sun'
  | 'moon';

export function Icon({
  name,
  color,
  size,
}: {
  name: IconName;
  color: string;
  /** Omit to get the size it is drawn at on the board. */
  size?: number;
}) {
  switch (name) {
    case 'arrow': {
      const s = size ?? 18;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 12h13M12.5 6l6 6-6 6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );
    }

    case 'back': {
      // The only glyph drawn on a 12 × 20 box rather than 24 × 24.
      const h = size ?? 18;
      return (
        <Svg width={(h * 11) / 18} height={h} viewBox="0 0 12 20" fill="none">
          <Path
            d="M9.5 2L2 10l7.5 8"
            stroke={color}
            strokeWidth={2.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'chevron': {
      // Drawn on a 8 × 13 box: it is a hair, not a glyph.
      const h = size ?? 13;
      return (
        <Svg width={(h * 8) / 13} height={h} viewBox="0 0 8 13" fill="none">
          <Path d="M1.5 1.5L6.5 6.5l-5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'home': {
      const s = size ?? 19;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path d="M12 3.9l8 6.7v9.9H4v-9.9z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
        </Svg>
      );
    }

    case 'info': {
      const s = size ?? 15;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.9} />
          <Path d="M12 11v5.5M12 7.8v.4" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'rules': {
      const s = size ?? 19;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 3.5h12v17l-3-1.6-3 1.6-3-1.6-3 1.6z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M9.5 8h5M9.5 12h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'settings': {
      // A cog. It was a circle with eight rays, which is a sun — unremarkable
      // while nothing else on the screen was round, and unusable next to the
      // theme button, whose whole job is to be a sun. Same size, same stroke.
      const s = size ?? 17;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={3.1} stroke={color} strokeWidth={1.8} />
          <Path
            d="M19.2 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0V20a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H4a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V4a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6H20a1.5 1.5 0 0 0-1.4.9Z"
            stroke={color}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'sun': {
      const s = size ?? 18;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={4.6} stroke={color} strokeWidth={1.9} />
          <Path
            d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
            stroke={color}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
        </Svg>
      );
    }

    case 'moon': {
      const s = size ?? 18;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 14.4A8.6 8.6 0 0 1 9.6 4a8.6 8.6 0 1 0 10.4 10.4Z"
            stroke={color}
            strokeWidth={1.9}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'clock': {
      const s = size ?? 17;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.9} />
          <Path d="M12 7.5V12l3 2" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'backspace': {
      const w = size ?? 26;
      return (
        <Svg width={w} height={(w * 20) / 26} viewBox="0 0 26 20" fill="none">
          <Path
            d="M8.5 2h15v16h-15L1.5 10z"
            stroke={color}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
          <Path d="M13 7l6 6M19 7l-6 6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'plus': {
      const s = size ?? 15;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'close': {
      const s = size ?? 12;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path d="M5 5l14 14M19 5L5 19" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'chevronUp': {
      const s = size ?? 16;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 15l7-7 7 7"
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    /* The same glyph the other way up, at the same weight, because a row that
       opens and closes may not appear to change its stroke while doing it.
       `Result Formula Options.dc.html` draws the pair at 13 on a 24 box. */
    case 'chevronDown': {
      const s = size ?? 16;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 9l7 7 7-7"
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'person': {
      const s = size ?? 19;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={8.5} r={3.6} stroke={color} strokeWidth={1.8} />
          <Path
            d="M4.8 20c.9-3.4 3.6-5.3 7.2-5.3s6.3 1.9 7.2 5.3"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    }

    case 'cashOut': {
      // A seat with an arrow leaving it. Never red: cashing out is expected,
      // and only ending the night is destructive.
      const s = size ?? 19;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M13.5 4.5H5.5v15h8"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M11 12h8.5M16.5 8.5l3.5 3.5-3.5 3.5"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'receipt': {
      const s = size ?? 20;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 3.5h14v17l-2.3-1.5-2.4 1.5-2.3-1.5-2.4 1.5L7.3 19 5 20.5z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path d="M8.5 8.5h7M8.5 12.5h7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'check': {
      const s = size ?? 15;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4.5 12.5l5 5 10-11"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'pencil': {
      const s = size ?? 15;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 20h4L20 8l-4-4L4 16z"
            stroke={color}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'invite': {
      const s = size ?? 17;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Circle cx={10} cy={9} r={3.4} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path
            d="M4 19.5c.8-3.1 3.1-4.8 6-4.8 1 0 2 .2 2.8.55"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Path d="M18 14.5v6M15 17.5h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    }

    case 'copy': {
      const s = size ?? 17;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Rect
            x={8.5}
            y={8.5}
            width={12}
            height={12}
            rx={2.5}
            stroke={color}
            strokeWidth={1.9}
            strokeLinejoin="round"
          />
          <Path
            d="M15.5 4.5H5.5a1 1 0 00-1 1v10"
            stroke={color}
            strokeWidth={1.9}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'message': {
      const s = size ?? 17;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 12.5c0 4-3.6 7-8 7a9.6 9.6 0 01-2.6-.35L4.5 21l1.2-3.4A6.9 6.9 0 014 12.5c0-4 3.6-7 8-7s8 3 8 7z"
            stroke={color}
            strokeWidth={1.9}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'share': {
      const s = size ?? 17;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 15V4m0 0L8 8m4-4l4 4"
            stroke={color}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M5 14v5.5h14V14"
            stroke={color}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    case 'qr': {
      const s = size ?? 17;
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          {[
            { x: 4, y: 4 },
            { x: 13.5, y: 4 },
            { x: 4, y: 13.5 },
          ].map((r) => (
            <Rect
              key={`${r.x}-${r.y}`}
              x={r.x}
              y={r.y}
              width={6.5}
              height={6.5}
              rx={1.4}
              stroke={color}
              strokeWidth={1.9}
              strokeLinejoin="round"
            />
          ))}
          <Path
            d="M14 14h2m4 0h-2m0 3v3m-4 0h2"
            stroke={color}
            strokeWidth={1.9}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
  }
}
