import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Rect, Svg } from 'react-native-svg';
import { QUIET_ZONE, qrMatrix } from '../lib/qr';

/**
 * A QR code, drawn as squares. C3d.
 *
 * WHITE IN BOTH THEMES, and that is not an oversight in the dark theme — a
 * dark-inverted code is a scanning risk on cheap cameras, so the block keeps
 * its own colours regardless of what the rest of the app is doing. It is the
 * one element in this app that ignores the theme, and it does so for a reason
 * that has nothing to do with taste.
 *
 * The geometry is the drawing's: a 250 white block with a 210 live area, which
 * is where the four-module quiet zone comes from. The gap is not padding — a
 * scanner cannot find the finder patterns without blank space around them, and
 * a code drawn flush to the edge of its block is the classic "it looks right
 * and my phone will not read it".
 *
 * One deliberate detail: adjacent dark modules are drawn as overlapping
 * rectangles half a pixel oversized. At 210/29 ≈ 7.2 device pixels per module,
 * exact rectangles leave hairline seams where rounding falls between them, and
 * a camera reads those seams as light. Overlapping closes them without moving
 * any module's centre.
 */
export function QrCode({
  value,
  size = 250,
  live = 210,
}: {
  value: string;
  /** The white block. */
  size?: number;
  /** The code inside it; the difference is the quiet zone. */
  live?: number;
}) {
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
    borderRadius: 14,
    alignSelf: 'center',
    overflow: 'hidden',
  },
});
