import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE TOUCH-FREE END OF A QUICK REBUY, HELD BY SOMETHING THAT RUNS IN SECONDS.
 *
 * The decision of 3 September: holding Rebuy on the player card writes the
 * entry, states what just happened — who added how much — and then dismisses
 * the sheet onto Tonight without anybody tapping anything.
 *
 * NO OTHER CHECK CAN SEE IT. `ui-audit.mjs` opens `/player` at a URL, and the
 * status only exists after a one-second hold; `ui-journeys.mjs` logs its rebuys
 * through the dock, which is the other route in entirely. So the state is
 * reachable by nothing this repo runs, which by `CLAUDE.md`'s own rule is a
 * screen behaviour that is not finished being built — and a footer is exactly
 * the kind of thing a later session rewrites while fixing something else.
 *
 * This reads the source, and it is deliberately blunt about it, the same way
 * `moneyScreens.contract.test.ts` is: every assertion below is about A STRING
 * BEING THERE OR NOT BEING THERE, which is the one question source can answer
 * honestly. Whether the block is the right height, whether the sweep runs — the
 * component's own geometry is `HoldButton`'s and its note says so.
 */

const root = path.resolve(__dirname, '../../../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

/** A file with its comments taken out — only what the screen actually draws. */
const drawn = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const card = drawn(read('apps/mobile/app/player.tsx'));
const handoff = drawn(read('apps/mobile/src/components/Handoff.tsx'));

describe('the quick rebuy hands the screen back by itself', () => {
  it('draws the status where the hold was, and keeps the hold', () => {
    expect(card).toContain('<Handoff');
    expect(card).toContain('<HoldButton');
  });

  it('names who added how much, and what they are in for now', () => {
    /* The verb is the host's own — what gets said at the table when the chips
       go across — and the figure beside it is the amount that was written. */
    expect(card).toMatch(/lead=\{`\$\{player\.name\} added`\}/);
    /* IN FOR is the card's own label, and the figure under it is read off the
       store rather than added up here. */
    expect(card).toMatch(/detail=\{`In for \$\{formatToFit\(inFor, HANDOFF_FITS\)\}/);
  });

  it('says where it is going, and goes there', () => {
    expect(card).toContain('back to Tonight');
    /* `router.back()` rather than a route by name, so the handoff cannot land
       somewhere the sheet's own Close and Back to table do not. */
    expect(card).toMatch(/onDone=\{\(\) => router\.back\(\)\}/);
  });

  it('is fast, and is one number rather than several', () => {
    const ms = /HANDOFF_MS = (\d+)/.exec(handoff);
    expect(ms).not.toBeNull();
    const duration = Number(ms![1]);
    /* Under about 700 nobody reads four words; over about two seconds the
       thumb starts trying to dismiss it, which is the touch being removed. */
    expect(duration).toBeGreaterThanOrEqual(700);
    expect(duration).toBeLessThanOrEqual(2000);
    /* The card takes the timing from the component and never states its own:
       two clocks for one transition is how they end up disagreeing. */
    expect(card).not.toContain('setTimeout');
  });

  it('posts the status only once the write has landed', () => {
    /* The status names IN FOR, which is read off the store. Posted a frame
       early it would put the amount BEFORE the rebuy under a sentence
       announcing the rebuy. */
    const written = card.indexOf('await writeRebuy(');
    const posted = card.indexOf('setHandedOff(rebuy)');
    expect(written).toBeGreaterThan(-1);
    expect(posted).toBeGreaterThan(written);
  });

  it('lets nothing on the sheet navigate while it is closing', () => {
    /* A row tapped during the sweep would push the correction screen, and the
       sweep would then pop it back off under the host's thumb. */
    expect(card).toContain('handedOff === null && r.entryId !== undefined');
    /* Both footer secondaries go inert with it — and stay drawn, so the panel
       does not shrink a row on its way out. */
    expect(card.match(/disabled=\{handedOff !== null\}/g)).toHaveLength(2);
  });

  it('stops the sweep if the sheet leaves first', () => {
    /* Swipe down, or the close: the timer goes with the sheet rather than
       firing into whatever screen the host reached instead. */
    expect(handoff).toContain('return () => sweep.stop()');
  });
});
