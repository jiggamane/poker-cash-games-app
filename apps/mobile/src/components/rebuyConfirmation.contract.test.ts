import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  BAR_LEAVE_MS,
  BAR_LIVE_MS,
  announceRebuy,
  currentAnnouncement,
  endAnnouncement,
  takeAnnouncement,
} from './rebuyAnnouncement';
import type { Money, PlayerId } from '@poker-club/core';

/**
 * THE REBUY CONFIRMATION, HELD BY SOMETHING THAT RUNS IN SECONDS.
 *
 * This replaces `handoff.contract.test.ts`, which held the version of this
 * behaviour that lived inside the player sheet — the status in the button, the
 * sweep, the sheet dismissing itself. That whole block is deleted; the handoff
 * of 5 September puts the confirmation on Tonight instead, with an Undo.
 *
 * NO OTHER CHECK CAN SEE IT, and that is why this file is as blunt as it is.
 * `ui-audit.mjs` opens `/session` at a URL, where nothing has just been
 * rebought and no bar exists; `ui-journeys.mjs` logs its rebuys through the
 * dock, which is the other route in entirely. So the state is reachable by
 * nothing this repo runs, which by `CLAUDE.md`'s own rule is a screen
 * behaviour that is not finished being built — and a confirmation is exactly
 * the kind of thing a later session rewrites while fixing something else.
 *
 * Two halves, deliberately:
 *
 *   - the STORE is tested for real. `rebuyAnnouncement.ts` imports nothing but
 *     React and a type, so the collapse rule and both clocks run here.
 *   - the SCREENS are read as source, the way `moneyScreens.contract.test.ts`
 *     is: every assertion is about a string being there or not being there,
 *     which is the one question source can answer honestly.
 */

const root = path.resolve(__dirname, '../../../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

/** A file with its comments taken out — only what the screen actually does. */
const drawn = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const card = drawn(read('apps/mobile/app/player.tsx'));
const tonight = drawn(read('apps/mobile/app/session.tsx'));
const bar = drawn(read('apps/mobile/src/components/RebuyConfirmation.tsx'));
const store = drawn(read('apps/mobile/src/lib/nightStore.ts'));

const rebuy = (name: string, amount: number, entryId: string) =>
  announceRebuy({
    playerId: name.toLowerCase() as PlayerId,
    name,
    amount: amount as Money,
    entryId,
  });

afterEach(() => {
  endAnnouncement();
  vi.useRealTimers();
});

describe('the bar, and the two seconds it is up for', () => {
  it('holds for two seconds, leaves in 160ms, and is gone', () => {
    vi.useFakeTimers();
    rebuy('Petr', 50_000, 'e1');
    expect(currentAnnouncement()?.leaving).toBe(false);

    vi.advanceTimersByTime(BAR_LIVE_MS - 1);
    /* Undo is live for the whole hold — the handoff says so in as many words. */
    expect(currentAnnouncement()?.leaving).toBe(false);

    vi.advanceTimersByTime(1);
    expect(currentAnnouncement()?.leaving).toBe(true);

    vi.advanceTimersByTime(BAR_LEAVE_MS);
    expect(currentAnnouncement()).toBeNull();
  });

  it('dies with the bar: nothing to undo once it is leaving', () => {
    vi.useFakeTimers();
    rebuy('Petr', 50_000, 'e1');
    vi.advanceTimersByTime(BAR_LIVE_MS);
    expect(takeAnnouncement()).toBeNull();
  });

  it('hands Undo every entry it announced, oldest first', () => {
    rebuy('Petr', 50_000, 'e1');
    rebuy('Petr', 50_000, 'e2');
    expect(takeAnnouncement()?.entryIds).toEqual(['e1', 'e2']);
    /* Taken once. A second tap on a bar that has gone reverses nothing. */
    expect(takeAnnouncement()).toBeNull();
  });
});

describe('two taps inside two seconds are one bar', () => {
  it('adds the figures up and counts the entries', () => {
    rebuy('Petr', 50_000, 'e1');
    rebuy('Petr', 50_000, 'e2');
    const it = currentAnnouncement();
    expect(it?.amount).toBe(100_000);
    expect(it?.entryIds).toHaveLength(2);
  });

  it('restarts the clock, so the second rebuy gets its own two seconds', () => {
    vi.useFakeTimers();
    rebuy('Petr', 50_000, 'e1');
    vi.advanceTimersByTime(BAR_LIVE_MS - 100);
    rebuy('Petr', 50_000, 'e2');
    vi.advanceTimersByTime(BAR_LIVE_MS - 100);
    expect(currentAnnouncement()?.leaving).toBe(false);
    expect(currentAnnouncement()?.entryIds).toHaveLength(2);
  });

  it('bumps the token, which is what restarts the tags', () => {
    rebuy('Petr', 50_000, 'e1');
    const first = currentAnnouncement()!.token;
    rebuy('Petr', 50_000, 'e2');
    expect(currentAnnouncement()!.token).toBeGreaterThan(first);
  });

  it('does not collapse into a bar that is already leaving', () => {
    /* Undo dies with the bar. A rebuy landing during those 160ms is its own
       announcement, and its Undo reverses its own entry and no other. */
    vi.useFakeTimers();
    rebuy('Petr', 50_000, 'e1');
    vi.advanceTimersByTime(BAR_LIVE_MS + 20);
    rebuy('Petr', 50_000, 'e2');
    expect(currentAnnouncement()?.entryIds).toEqual(['e2']);
    expect(currentAnnouncement()?.amount).toBe(50_000);
  });

  it('does not collapse two different people into one sentence', () => {
    /* The handoff's collapsed copy names one person, so there is no sentence
       for two and none is invented. The newer announcement wins outright. */
    rebuy('Petr', 50_000, 'e1');
    rebuy('Ivo', 50_000, 'e2');
    expect(currentAnnouncement()?.name).toBe('Ivo');
    expect(currentAnnouncement()?.entryIds).toEqual(['e2']);
  });
});

describe('the entry is written on the tap, and Undo voids it', () => {
  it('writes first, announces second, and only then leaves', () => {
    /* The order is the whole of "the entry is written on tap, not on animation
       end": kill the app while the sheet is still sliding and the rebuy is in
       the ledger, because it was in the ledger before anything moved. */
    const written = card.indexOf('await writeRebuy(');
    const announced = card.indexOf('announceRebuy(');
    const left = card.indexOf('router.back()', announced);
    expect(written).toBeGreaterThan(-1);
    expect(announced).toBeGreaterThan(written);
    expect(left).toBeGreaterThan(announced);
  });

  it('takes the id of the row it wrote rather than guessing at one later', () => {
    expect(card).toMatch(/const entryId = await writeRebuy\(/);
    expect(store).toMatch(/export async function rebuy\([^)]*\): Promise<string>/);
  });

  it('undoes by appending a void, and never by deleting', () => {
    /* The ledger is append-only on the device and on the server. Undo writes a
       reversal against every entry the bar carries — the same call `/entry`'s
       own "Void this entry" makes — and touches nothing that is already in it. */
    const undo = /export async function undoRebuy[\s\S]*?\n}/.exec(bar)?.[0] ?? '';
    expect(undo).toContain('await voidEntry(id)');
    expect(undo).not.toMatch(/delete|splice|filter|correctEntry/i);
  });

  it('is a tap now, and the hold is gone', () => {
    /* Reversed on 5 September: Undo replaces the hold as what guards a write
       that lands without asking. Two 1s holds do not fit inside a 2s bar, so
       the handoff's rapid-tap rule needs the tap. */
    expect(card).not.toContain('HoldButton');
    expect(card).toMatch(/label=\{`Rebuy \$\{formatMoney\(rebuy\)\}`\}/);
  });
});

describe('what Tonight draws, and where', () => {
  it('draws both tags and the bar', () => {
    expect(tonight).toContain('<TotalTag');
    expect(tonight).toContain('<NameTag');
    expect(tonight).toContain('<RebuyBar');
  });

  it('keeps the tag on the player rather than on a position in the list', () => {
    /* The seated group is sorted by what people are in for, so a rebuy moves
       its own row up the list. A tag keyed to anything but the player would
       land on whoever that push moved down. */
    expect(tonight).toContain('<NameTag playerId={p.id}');
  });

  it('reads its figures off the store, so the fade takes the announcement only', () => {
    /* The handoff: "the row and total change stay after the tags fade. The
       fade removes the announcement, not the fact." Both figures are the
       ledger's, and neither is passed through the announcement. */
    expect(tonight).toContain('{formatToFit(onTable, CARD_FITS)}');
    expect(tonight).toContain('{formatToFit(p.boughtIn, ROW_FITS)}');
  });

  it('never lets the total’s tag land on the money beside it', () => {
    /* The card measures itself and hands the tag what is left over; the tag
       stands aside when that is not enough. On a 360 phone it usually is not —
       the arithmetic is in `TotalTag`'s own note, and it is the handoff's rule
       that a confirmation may cover chrome and never money. */
    expect(tonight).toContain('onLayout={(e) => setFigureRoom(e.nativeEvent.layout.width)}');
    expect(tonight).toContain('room={figureRoom - figureWidth - FIGURE_TAG_GAP}');
    expect(bar).toMatch(/if \(room < figure\.length \* [\d.]+\) return null;/);
  });

  it('clears the dock rather than covering it', () => {
    /* `bottom: 122` on the board is the bar hung above the dock, and the
       reason is stated twice in the handoff: a second rebuy stays one tap away
       while the bar is up. Here it is the dock's own sibling, so it cannot
       drift out of step with the dock's height. */
    expect(tonight).toMatch(/<RebuyBar \/>\s*<Dock/);
    expect(bar).toContain("bottom: '100%'");
  });

  it('says both of the handoff’s sentences and invents neither', () => {
    expect(bar).toContain('`${it.name} rebought ${formatToFit(it.amount, BAR_FITS)} · ${it.entryIds.length} entries`');
    expect(bar).toContain('`Rebuy ${formatToFit(it.amount, BAR_FITS)} added to ${it.name}`');
    expect(bar).toContain('Undo');
  });

  it('is said out loud, on a screen that did not ask for it', () => {
    /* The bar arrives under a reader who is already somewhere else. Both
       halves, for the same reason `Handoff.tsx` took both: a live region for
       Android and the web, an announcement for iOS. */
    expect(bar).toContain('AccessibilityInfo.announceForAccessibility(line)');
    expect(bar).toContain('accessibilityLiveRegion="polite"');
  });

  it('takes the travel away for a reader who asked for less, and never the time', () => {
    /* The two seconds are how long Undo is reachable. Shortening them would
       take a control away from the reader who asked for less movement. */
    expect(bar).toContain('AccessibilityInfo.isReduceMotionEnabled()');
    expect(bar).toContain('duration: calm ? 0 : TAG_IN_MS');
    expect(bar).not.toMatch(/calm \? 0 : BAR_LEAVE_MS|calm \? 0 : BAR_LIVE_MS/);
  });
});
