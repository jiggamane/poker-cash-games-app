import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE TOUCH-FREE END OF A QUICK REBUY, HELD BY SOMETHING THAT RUNS IN SECONDS.
 *
 * Two decisions. 3 September: holding Rebuy on the player card writes the
 * entry, states what just happened, and dismisses the sheet onto Tonight
 * without anybody tapping anything. 5 September, on the owner's instruction:
 * the same sentence appears on Tonight — because the sheet is auto-closed and
 * the confirmation would otherwise leave with it — and everything the mark
 * touches is green, and fades after two seconds.
 *
 * NO OTHER CHECK CAN SEE ANY OF IT. `ui-audit.mjs` opens `/player` and
 * `/session` at a URL, and none of this exists until a one-second hold has
 * been completed; `ui-journeys.mjs` logs its rebuys through the dock, which is
 * the other route in entirely. So the whole flow is reachable by nothing this
 * repo runs, which by `CLAUDE.md`'s own rule is screen behaviour that is not
 * finished being built — and a footer is exactly the kind of thing a later
 * session rewrites while fixing something else.
 *
 * This reads the source, and is deliberately blunt about it, the same way
 * `moneyScreens.contract.test.ts` is: every assertion below is about A STRING
 * BEING THERE OR NOT BEING THERE, which is the one question source can answer
 * honestly. Whether a block is the right height, whether the sweep runs — the
 * components' own geometry is `HoldButton`'s and their headers say so.
 */

const root = path.resolve(__dirname, '../../../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

/** A file with its comments taken out — only what the screen actually draws. */
const drawn = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const card = drawn(read('apps/mobile/app/player.tsx'));
const tonight = drawn(read('apps/mobile/app/session.tsx'));
const handoff = drawn(read('apps/mobile/src/components/Handoff.tsx'));
const strip = drawn(read('apps/mobile/src/components/JustAddedStrip.tsx'));
const mark = drawn(read('apps/mobile/src/lib/justAdded.ts'));
const list = drawn(read('apps/mobile/src/components/PlayerList.tsx'));

describe('the quick rebuy hands the screen back by itself', () => {
  it('draws the status where the hold was, and keeps the hold', () => {
    expect(card).toContain('<Handoff');
    expect(card).toContain('<HoldButton');
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
    expect(card).toContain('handedOff === null && r.entryId !== undefined');
    expect(card.match(/disabled=\{handedOff !== null\}/g)).toHaveLength(2);
  });

  it('stops the sweep if the sheet leaves first', () => {
    expect(handoff).toContain('return () => sweep.stop()');
  });
});

describe('and the sentence survives the sheet closing', () => {
  it('is marked on the write and cleared by the screen that showed it', () => {
    expect(card).toContain('markAdded(playerId, rebuy)');
    expect(tonight).toContain('onDone={clearAdded}');
  });

  it('says the same thing in both places, from one source', () => {
    /* The verb is the host's own — what gets said at the table when the chips
       go across — and it is composed once so the sheet and Tonight cannot
       drift into two different sentences about one rebuy. */
    expect(mark).toMatch(/addedLead = \(name: string\): string => `\$\{name\} added`/);
    expect(card).toContain('lead={addedLead(player.name)}');
    expect(tonight).toContain('lead={addedLead(nameOf(night, justAdded.playerId))}');
  });

  it('holds for two seconds, then fades', () => {
    const ms = /JUST_ADDED_MS = ([\d_]+)/.exec(mark);
    expect(ms).not.toBeNull();
    expect(Number(ms![1].replace(/_/g, ''))).toBe(2000);
    /* It fades rather than blinking out, and the fade is its own number so the
       hold can be read as the two seconds it is. */
    expect(mark).toMatch(/JUST_ADDED_FADE_MS = \d+/);
    expect(strip).toContain('JUST_ADDED_MS');
    expect(strip).toContain('JUST_ADDED_FADE_MS');
  });

  it('starts its two seconds when Tonight is actually being looked at', () => {
    /* `/player` is a transparent modal, so this screen renders underneath one.
       Mounting the strip on the mark alone would spend most of its two seconds
       behind the sheet. */
    expect(tonight).toContain('{focused && justAdded !== null && (');
    expect(tonight).toContain('return () => setFocused(false)');
  });

  it('marks the row the rebuy moved, and the treatment lives in one file', () => {
    expect(tonight).toContain('fresh={justAdded?.playerId === p.id}');
    expect(list).toContain('fresh = false');
    /* The wash is defined by the list, never by the screen asking for it —
       six screens draw this row. */
    expect(tonight).not.toContain('winWash');
  });
});

/**
 * THE ONE RULE THE COLOUR IS ALLOWED ON.
 *
 * `tokens.ts` reserves green and red for money won and money lost. A rebuy is
 * money IN, and what keeps this green from reading as a WIN is that no figure
 * inside a tinted block is ever signed: `Petr added $500`, never `+$500`.
 *
 * That is not only a matter of taste — `ui-audit.mjs`'s `tinted-result-row`
 * check fails the gate on a signed figure inside a translucent row (B23), so a
 * `formatSigned` reaching one of these blocks turns `npm run check:ui` red.
 * This says it in seconds instead of in two minutes.
 */
describe('nothing green ever states a result', () => {
  it('keeps signed figures out of the tinted blocks', () => {
    for (const [name, source] of [
      ['Handoff.tsx', handoff],
      ['JustAddedStrip.tsx', strip],
    ] as const) {
      expect(source, `${name} must not sign its figure`).not.toContain('formatSigned');
    }
    /* And the figure Tonight hands the strip is the unsigned formatter. */
    expect(tonight).toContain('figure={formatToFit(justAdded.amount, ROW_FITS)}');
  });

  it('washes the row that moved, never a row that states a result', () => {
    /* `fresh` is offered by ActiveRow — money in, unsigned — and not by
       FinishedSlab, whose right-hand column is a signed result. */
    const slab = list.slice(
      list.indexOf('export function FinishedSlab'),
      list.indexOf('const styles = StyleSheet.create'),
    );
    expect(slab).not.toContain('fresh');
  });
});
