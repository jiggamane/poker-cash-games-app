import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * B103 — MY STATS' GRAPH SHOWS NO FIGURE UNTIL A COLUMN IS TAPPED.
 *
 * The break-even column used to label itself `$0` permanently, while every
 * other night waited for a tap. No browser check can see it: after B79 the
 * `ui-journeys` My stats stop has no nights to draw. So the component is read
 * as source, and the one question source answers honestly is where a figure is
 * written: in the tapped readout and the spoken label, and nowhere else.
 */
const src = fs.readFileSync(path.join(__dirname, 'NightsChart.tsx'), 'utf8');

describe('NightsChart', () => {
  it('writes a figure only in the readout and the accessibility label', () => {
    const uses = src.match(/formatSigned\(/g) ?? [];
    // one in the readout, one in accessibilityLabel
    expect(uses).toHaveLength(2);
    expect(src).toMatch(/accessibilityLabel=\{`\$\{night\.label\}, \$\{formatSigned\(night\.net\)\}`\}/);
    expect(src).toMatch(/\{shown !== null && \([\s\S]*?formatSigned\(shown\.net\)/);
  });

  it('draws no break-even label over the column', () => {
    expect(src).not.toMatch(/styles\.zero/);
    expect(src).not.toMatch(/formatSigned\(0/);
  });
});
