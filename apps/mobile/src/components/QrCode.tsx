import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Rect, Svg } from 'react-native-svg';
import { QUIET_ZONE, qrMatrix } from '../lib/qr';
import { z } from '../design/scale';

/**
 * A QR code, drawn as squares. C3d.
 *
 * WHITE IN BOTH THEMES, and that is not an oversight in the dark theme — a
 * dark-inverted code is a scanning risk on cheap cameras, so the block keeps
 * its own colours regardless of what the rest of the app is doing. It is the
 * one element in this app that ignores the theme, and it does so for a reason
 * that has nothing to do with taste.
 *
 * The geometry is the full board's (`invite-qr`, approved; square, the owner's
 * pick of four on 22 November): a 188 white block with 12 corners, blown up to
 * the phone through `z()`. It used to be C3d's 250 block around a 210 live
 * area; the 20 points of extra margin are gone, and the four-module quiet zone
 * inside the block stays (`QUIET_ZONE`) — wider than the board's two modules,
 * on purpose. The gap is not padding — a scanner cannot find the finder
 * patterns without blank space around them, and a code drawn flush to the edge
 * of its block is the classic "it looks right and my phone will not read it".
 *
 * WHAT IT ENCODES IS NOT DECIDED HERE: the caller passes the invite's link
 * (`inviteLinkFor`), exactly as before.
 *
 * One deliberate detail: adjacent dark modules are drawn as overlapping
 * rectangles half a pixel oversized. At about 229/37 ≈ 6.2 points per module,
 * exact rectangles leave hairline seams where rounding falls between them, and
 * a camera reads those seams as light. Overlapping closes them without moving
 * any module's centre.
 */
export function QrCode({
  value,
  size = z(188),
  live,
}: {
  value: string;
  /** The white block. */
  size?: number;
  /** The code inside it, quiet zone included; defaults to the whole block. */
  live?: number;
}) {
  live ??= size;
  const matrix = useMemo(() => {
    try {
      return qrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (matrix === null) return <View style={[styles.block, { width: size, height: size }]} />;

  const modules = matrix.length;
  /* The quiet zone is measured in modules, so it scales with the code. */
  const unit = live / (modules + QUIET_ZONE * 2);
  const origin = (size - live) / 2 + unit * QUIET_ZONE;
  const overlap = 0.5;

  return (
    <View style={[styles.block, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {matrix.flatMap((row, r) =>
          row.map((on, c) =>
            on ? (
              <Rect
                key={`${r}-${c}`}
                x={origin + c * unit}
                y={origin + r * unit}
                width={unit + overlap}
                height={unit + overlap}
                fill="#000000"
              />
            ) : null,
          ),
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#FFFFFF',
    borderRadius: z(12),
    alignSelf: 'center',
    overflow: 'hidden',
  },
});
