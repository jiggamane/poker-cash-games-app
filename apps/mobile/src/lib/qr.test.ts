import { describe, expect, it } from 'vitest';
import { QUIET_ZONE, qrMatrix } from './qr';

/**
 * The QR encoder, and the fact that it is behind a seam.
 *
 * WHAT WAS ACTUALLY VERIFIED, and how, because none of it can be re-run here:
 * the encoder's output was round-tripped through **zxing** — the decoder behind
 * most real scanners — across 120 payloads covering the ten-character code
 * alone, the code in its two-groups-of-five form, and both deep-link wrappers
 * (`pokerclub://claim?c=…` and the `exp://` dev URL). 120 of 120 decoded back
 * to exactly the string they were made from.
 *
 * Two things that came out of doing it, worth writing down so nobody repeats
 * the afternoon:
 *
 *   · MATRIX EQUALITY AGAINST ANOTHER ENCODER IS THE WRONG TEST. Two conformant
 *     encoders legitimately disagree — on how the text is split into segments
 *     and on which of eight masks scores best — and produce different squares
 *     that decode to the same string. Comparing against `segno` reported eight
 *     failures that were all correct codes.
 *
 *   · OpenCV's detector is not a reliable oracle at this size. It failed to
 *     find three codes that zxing read perfectly, and truncated a fourth
 *     produced by a completely different encoder. Scanners differ; that is why
 *     C3d keeps the ten characters printed underneath.
 *
 * What is left here is what a unit test can actually hold: the structure of the
 * output, and two frozen squares. The goldens are the point of the seam — if
 * the encoder behind `qr.ts` is ever swapped, these say whether the new one
 * agrees with the one that was validated, and if it does not, the answer is to
 * re-run the round-trip rather than to edit the expectation.
 */

const render = (text: string): string[] =>
  qrMatrix(text).map((row) => row.map((on) => (on ? '#' : '.')).join(''));

describe('the QR encoder', () => {
  it('is square, and a size the specification allows', () => {
    for (const text of ['A', 'K7M4XP29QT', 'pokerclub://claim?c=K7M4XP29QT']) {
      const m = qrMatrix(text);
      expect(m.length).toBeGreaterThan(0);
      for (const row of m) expect(row).toHaveLength(m.length);
      // Versions 1..40 are 21, 25, 29 … 177 — always 4n + 17.
      expect((m.length - 17) % 4).toBe(0);
      expect(m.length).toBeGreaterThanOrEqual(21);
      expect(m.length).toBeLessThanOrEqual(177);
    }
  });

  it('puts a finder pattern in three corners and not the fourth', () => {
    // The three squares a scanner looks for first. Their absence is the single
    // most common reason a generated code "looks fine and will not scan".
    const m = qrMatrix('K7M4XP29QT');
    const n = m.length;
    const finder = (top: number, left: number): boolean => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const edge = r === 0 || r === 6 || c === 0 || c === 6;
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (m[top + r][left + c] !== (edge || core)) return false;
        }
      }
      return true;
    };

    expect(finder(0, 0)).toBe(true);
    expect(finder(0, n - 7)).toBe(true);
    expect(finder(n - 7, 0)).toBe(true);
    // Bottom-right must NOT have one — that asymmetry is how a scanner works
    // out which way up the code is.
    expect(finder(n - 7, n - 7)).toBe(false);
  });

  it('grows with the payload rather than losing any of it', () => {
    const short = qrMatrix('K7M4XP29QT').length;
    const long = qrMatrix('exp://192.168.1.24:8081/--/claim?c=K7M4XP29QT').length;
    expect(long).toBeGreaterThan(short);
  });

  it('is deterministic — the same code draws the same square every time', () => {
    expect(render('K7M4XP29QT')).toEqual(render('K7M4XP29QT'));
  });

  it('refuses to encode nothing rather than drawing an empty square', () => {
    expect(() => qrMatrix('')).toThrow();
  });

  it('keeps the specification’s four-module quiet zone', () => {
    // Dropping it is the other classic "why will it not scan": the scanner
    // cannot find the finder patterns without blank space around them.
    expect(QUIET_ZONE).toBe(4);
  });
});

describe('the goldens — validated by round-trip, frozen here', () => {
  it('draws a bare ten-character code at version 1', () => {
    expect(render('K7M4XP29QT')).toEqual([
      '#######...#...#######',
      '#.....#..##...#.....#',
      '#.###.#.#..##.#.###.#',
      '#.###.#.###.#.#.###.#',
      '#.###.#.#...#.#.###.#',
      '#.....#.#.##..#.....#',
      '#######.#.#.#.#######',
      '........#.#..........',
      '#.#####...##..#####..',
      '#.........######.####',
      '..#...##....#.##.#..#',
      '###.#..#.#.####.##...',
      '.#..#.###.#.#...#.#.#',
      '........##..#..######',
      '#######..#.#.#.####..',
      '#.....#.##.....#.###.',
      '#.###.#.#..#.#..##.#.',
      '#.###.#.#..####......',
      '#.###.#.#.#.#.##.##..',
      '#.....#....####.#...#',
      '#######.##..#..#..#..',
    ]);
  });

  it('draws the deep link a shared code travels in, at version 3', () => {
    expect(render('pokerclub://claim?c=K7M4XP29QT')).toEqual([
      '#######....##.#..##.#.#######',
      '#.....#.##.#.#......#.#.....#',
      '#.###.#...#....#...##.#.###.#',
      '#.###.#..#.###..#.###.#.###.#',
      '#.###.#.#...##..##....#.###.#',
      '#.....#..#....######..#.....#',
      '#######.#.#.#.#.#.#.#.#######',
      '.........##....#.#.#.........',
      '#.#.#.#..##.....#...#...#..#.',
      '#.#.....####.#.####..##....##',
      '####.##.##....####....##.####',
      '#.#..#.#...#.##.#.###.#.#...#',
      '.#..###.#.#...##..##.##..#...',
      '#...##..#...#.##..#..###.#.##',
      '#...#######..#....#..#.#...##',
      '.#...#.###..#..#.#...#..#...#',
      '.###########....###.###....#.',
      '....##.#####.#.####.####.#.##',
      '#.#.###....##.###.#...#..#.##',
      '.#.#...########.#.#.#..##..#.',
      '#.....##.##...##...######...#',
      '........#..#..##....#...#.#.#',
      '#######...#.##...####.#.#.###',
      '#.....#..#.##..#...##...#..#.',
      '#.###.#.#####...##..######.##',
      '#.###.#..#.#.#.####.....#....',
      '#.###.#.#......##.##....###.#',
      '#.....#....####.##.######..#.',
      '#######.#...#..##.#####.#..##',
    ]);
  });
});
