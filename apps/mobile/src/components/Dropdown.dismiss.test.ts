import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TAPPING PAST AN OPEN MENU CLOSES IT — B77, on every screen that has a menu.
 *
 * The fix has two halves and only one of them is visible to a check that can
 * drive a browser:
 *
 *   1. `Dropdown` draws a backdrop while it is open, and the backdrop closes
 *      the menu.
 *   2. The backdrop is PAINTED ABOVE THE BODY of the screen. It hangs off the
 *      control's anchor, and the anchor sits in one of `Screen`'s two chrome
 *      slots — `trailing` on the title row, `metaTrailing` on the meta line.
 *      The body is a later sibling of both, so without a `zIndex` on the slot
 *      the body paints over the backdrop and swallows every tap meant for it.
 *      It swallows the menu's own rows with it: before this, not one of the
 *      three rows on My stats answered a tap in its own middle.
 *
 * `ui-journeys.mjs` holds half 1 where it can reach a menu — the view control
 * on the settled night, which has three items whatever is in the book. It
 * cannot reach the other two: the group control on Sessions and on My stats
 * draws as plain text until the reader has a night in the book, and the
 * journey's night is the seeded demo one, which `myNights` keeps out of it. So
 * the group menus were checked by hand in the built app on 16 September — open
 * the control, tap the foot of the screen, and the backdrop is what is under
 * the finger — and what is pinned here is the property that made them work, so
 * a change that takes it away goes red in seconds rather than on a phone.
 *
 * THE THIRD ASSERTION IS THE ONE FOR THE SCREEN NOBODY HAS WRITTEN YET. A
 * fifth `Dropdown` dropped into some other slot would have the backdrop and
 * not the paint order, which is the failure that looks like nothing at all:
 * the menu opens, and tapping past it does nothing.
 */

const here = path.dirname(new URL(import.meta.url).pathname);
const read = (rel: string): string => fs.readFileSync(path.join(here, rel), 'utf8');

describe('the menu closes on a tap outside', () => {
  it('draws a backdrop while it is open, and the backdrop closes it', () => {
    const src = read('Dropdown.tsx');
    const drawn = src.indexOf('style={[styles.backdrop');
    expect(drawn, 'Dropdown no longer draws a backdrop').toBeGreaterThan(-1);

    /* The element itself, read backwards from where it takes the style: what
       puts it on the screen, what it is, and what it does when it is tapped. */
    const element = src.slice(0, drawn).slice(-900);
    expect(element, 'the backdrop is not tied to `open`').toContain('{open && (');
    expect(element, 'the backdrop is not something a tap can land on').toContain('<Pressable');
    expect(element, 'the backdrop does not close the menu').toContain('onOpenChange(false)');

    const style = src.slice(src.indexOf('  backdrop: {'));
    expect(
      style.slice(0, style.indexOf('},')),
      'the backdrop is not positioned over the screen',
    ).toMatch(/position: 'absolute'/);
  });

  /*
   * A phone's width and height past every edge of the anchor. The anchor is in
   * a corner of the screen, so the backdrop reaches the whole of it from
   * wherever the control happens to be put, without measuring where that is.
   */
  it('reaches past every edge of its anchor', () => {
    expect(read('Dropdown.tsx')).toMatch(
      /top: -height, bottom: -height, left: -width, right: -width/,
    );
  });

  it('is painted above the body from either chrome slot', () => {
    const src = read('Screen.tsx');
    /* Both slots, read out of the stylesheet rather than assumed: the title row
       carries `trailing` and the meta row carries `metaTrailing`, and a screen
       may put the control in either. */
    for (const slot of ['titleRow', 'metaRow']) {
      const block = src.slice(src.indexOf(`  ${slot}: {`));
      const declared = /zIndex: (\d+)/.exec(block.slice(0, block.indexOf('},')));
      expect(declared, `${slot} has no zIndex — the body will paint over the menu`).not.toBeNull();
      expect(Number(declared![1]), `${slot} is not above the body`).toBeGreaterThan(0);
    }
  });

  it('is only ever put in one of those two slots', () => {
    const screens = path.join(here, '..', '..', 'app');
    const offenders: string[] = [];
    for (const file of fs.readdirSync(screens).filter((f) => f.endsWith('.tsx'))) {
      const src = fs.readFileSync(path.join(screens, file), 'utf8');
      if (!/<Dropdown|<ViewControl/.test(src)) continue;
      if (!/trailing=\{|metaTrailing: \(|metaTrailing=\{/.test(src)) offenders.push(file);
    }
    expect(
      offenders,
      'a menu outside `trailing` or `metaTrailing` opens over a body that ' +
        'paints on top of it — see the note at the top of this file',
    ).toEqual([]);
  });
});
