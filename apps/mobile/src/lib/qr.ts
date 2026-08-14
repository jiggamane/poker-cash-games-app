// eslint-disable-next-line @typescript-eslint/no-var-requires
const encode = require('qrcode/lib/core/qrcode.js') as {
  create: (
    text: string,
    opts: { errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' },
  ) => {
    modules: {
      size: number;
      /**
       * 1 or 0, NOT true or false — the package's own typings say boolean and
       * they are wrong. Declaring it honestly here is the point: a `boolean`
       * annotation over a number makes `=== true` silently false everywhere
       * downstream, which is a blank square rather than an error.
       */
      get: (row: number, col: number) => number;
    };
  };
};

/**
 * A QR code as a grid of black and white squares, and nothing else.
 *
 * C3d needs one square to draw. THIS FILE IS THE SEAM THAT KEEPS IT THAT WAY:
 * the screen asks for a matrix and draws rectangles, and has no idea what
 * produced them. Swapping the encoder later — a different library, or one
 * written here — is a change to this file and to nothing else, and the tests
 * beside it apply unchanged to whatever is behind it. That is the whole reason
 * the dependency is not imported directly by the component.
 *
 * WHY `qrcode/lib/core/qrcode.js` AND NOT `qrcode`. The package's main entry
 * resolves to renderers — canvas in a browser, `fs` and `pngjs` in Node — none
 * of which exist in React Native, and the CLI half drags `yargs` behind it. The
 * core module is the encoder alone: pure JavaScript, no platform API, and its
 * only transitive dependency is `dijkstrajs`, which it uses to choose how to
 * segment the text. That import path is internal to the package, so the version
 * is pinned exactly and `qr.test.ts` fails loudly if it ever stops behaving.
 *
 * ERROR CORRECTION IS M — about 15% of the code can be obscured and still read.
 * L would make a smaller square and is the wrong trade for something held up
 * across a table and photographed off a screen by whatever phone somebody has.
 */

/** Row-major, `true` where a module is dark. Always square. */
export type QrMatrix = readonly (readonly boolean[])[];

export function qrMatrix(text: string): QrMatrix {
  if (text === '') throw new Error('A QR code needs something to encode.');

  const { modules } = encode.create(text, { errorCorrectionLevel: 'M' });
  const size = modules.size;

  const rows: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < size; col++) line.push(modules.get(row, col) === 1);
    rows.push(line);
  }
  return rows;
}

/**
 * The quiet zone, in modules.
 *
 * Four is what the specification requires, and it is the part everybody drops
 * because the code still looks right without it. A code printed flush to the
 * edge of a dark card is the classic "my phone will not scan it" — the scanner
 * cannot find the finder patterns without blank space around them. C3d draws it
 * as a white block larger than the live area for exactly this reason: 250
 * outside, 210 of code inside.
 */
export const QUIET_ZONE = 4;
