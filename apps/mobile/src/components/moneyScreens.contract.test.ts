import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  granularityOf,
  money,
  roundingChoices,
  roundingLabel,
  roundingRowLabel,
  roundingRowValue,
} from '@poker-club/core';
import { currencyFor } from '../data/currencies';

/**
 * THREE DECISIONS OF 30 AUGUST, HELD BY SOMETHING THAT RUNS IN SECONDS.
 *
 * `npm run check:ui` sees all three properly — it opens the screens, so it can
 * say whether a row is on one — but it builds the app and drives a browser, and
 * `CLAUDE.md` is explicit that the fast check is the one that runs constantly.
 * A decision that only a two-minute tool can defend is a decision that gets
 * quietly undone between merges.
 *
 * So this reads the source. That is a blunter instrument than a rendered screen
 * and it is deliberately used bluntly: every assertion below is about a STRING
 * BEING THERE OR NOT BEING THERE, which is the one thing source can answer
 * honestly. Whether the row is laid out correctly, whether the chip fits its
 * box, whether the pad is reachable — `ui-audit.mjs` and `ui-journeys.mjs` own
 * all of that, and the maps they own are read back here so the two tools cannot
 * drift apart in silence, the same way `Sheet.geometry.test.ts` reads the cap
 * back out of the audit script.
 */

const root = path.resolve(__dirname, '../../../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

/** A file with its comments taken out — only what the screen actually draws. */
const drawn = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Every screen and shared component the app draws. */
const screens = (): Array<{ file: string; source: string }> => {
  const dirs = ['apps/mobile/app', 'apps/mobile/src/components'];
  const out: Array<{ file: string; source: string }> = [];
  for (const dir of dirs) {
    for (const name of fs.readdirSync(path.join(root, dir))) {
      if (!name.endsWith('.tsx')) continue;
      out.push({ file: `${dir}/${name}`, source: read(`${dir}/${name}`) });
    }
  }
  return out;
};

/**
 * The audit's own list of copy a decision has taken out of the app.
 *
 * Read rather than repeated: the browser pass checks these against what is on a
 * rendered screen, this one checks them against what is in the source, and a
 * word added to one list has to reach both or it defends nothing.
 */
const goneFromTheAudit = (): string[] => {
  const audit = read('scripts/ui-audit.mjs');
  const block = /const GONE = \[([\s\S]*?)\n\];/.exec(audit);
  if (block === null) throw new Error('scripts/ui-audit.mjs no longer declares GONE');
  return [...block[1]!.matchAll(/^\s*'([^']+)',/gm)].map((m) => m[1]!);
};

describe('“Taken from” is gone from the app', () => {
  /*
   * It was a segmented control in the rule editor AND two sentences explaining
   * the setting behind it, on the house rules and on the piggy-bank rules. The
   * control is the obvious half; the sentences are the half that survives a
   * deletion, because a screen explaining a setting that no longer exists is
   * perfectly laid out and every other check passes over it.
   */
  it('no screen offers the choice or describes it', () => {
    const guilty: string[] = [];
    for (const word of goneFromTheAudit()) {
      for (const { file, source } of screens()) {
        // Comments are how the removal is explained; only drawn copy counts.
        if (drawn(source).toLowerCase().includes(word.toLowerCase())) {
          guilty.push(`${file} still says “${word}”`);
        }
      }
    }
    expect(guilty).toEqual([]);
  });

  it('nothing in the interface writes a rule’s basis any more', () => {
    const writers = screens().filter(({ source }) => /onChange\(\{[^}]*\bbasis\b/.test(source));
    expect(writers.map((w) => w.file)).toEqual([]);
  });

  /*
   * The type and the engine keep it. `book.rules` on the server carries a basis
   * per rule, and a night already stored as `net_after_others` has to go on
   * settling exactly as it did — an app that quietly re-settled it on the gross
   * would restate money people have already paid each other.
   */
  it('the engine still honours a basis stored on an older night', () => {
    expect(read('packages/core/src/types.ts')).toContain("'net_after_others'");
    expect(read('packages/core/src/settlement.ts')).toContain("rule.basis === 'gross'");
  });
});

describe('the spend entry types its amount on the app’s own pad', () => {
  const spend = read('apps/mobile/app/spend.tsx');

  /*
   * B24. The pad used to be drawn only when adding, so L3 — "Rows: Amount,
   * Note, then Covered by" — had a figure on it and no way to change it: a
   * spend logged at $1,200 instead of $120 could only be voided and typed
   * again, and the void is a line in an append-only ledger for ever.
   */
  it('draws the keypad whether the spend is new or being corrected', () => {
    expect(spend).toContain('<Keypad {...field.keys} />');
    expect(spend).not.toMatch(/existing === undefined && \(\s*<Keypad/);
  });

  /* An offer, not text the host typed — B20, `typedAmount.ts`. The first key
     replaces the whole figure, so correcting $1,200 to $120 is three keys. */
  it('opens on what was logged, as an offer', () => {
    expect(spend).toContain('useTypedAmount(existing?.amount ?? 0)');
    expect(spend).toContain('field.offer(existing.amount)');
  });

  /* No preset amounts: the only chip row left on the sheet is Covered by, and
     the row of note prefills that read as three preset figures is gone. */
  it('offers no preset figures above the note', () => {
    expect(drawn(spend)).not.toContain('PREFILLS');
    expect(drawn(spend)).not.toContain('Drinks');
  });
});

describe('the game settings set how coarsely the table settles', () => {
  const setup = read('apps/mobile/app/new-night.tsx');

  /*
   * THE FOUR `E2-rounding.md` NAMES, cut 31 August: Off, $10, $50, $100. They
   * were Dollar · 10s · 100s · 1k while the setting only reached what a rule
   * divides at; now it snaps the stacks themselves, and the steps are the ones
   * a room actually counts in. `thousands` still resolves for an old night —
   * it is simply no longer offered.
   */
  it('offers off, ten, fifty and a hundred', () => {
    expect(roundingChoices().map((c) => c.mode)).toEqual([
      'dollars',
      'tens',
      'fifties',
      'hundreds',
    ]);
    expect(roundingChoices().map((c) => granularityOf(c.mode))).toEqual([1, 10, 50, 100]);
    expect(roundingChoices().map((c) => c.chip)).toEqual([
      'Off',
      'Nearest $10',
      'Nearest $50',
      'Nearest $100',
    ]);
  });

  it('names each of them the way every other screen does', () => {
    expect(roundingChoices().map((c) => roundingLabel(c.mode))).toEqual([
      'Whole dollars',
      'Nearest 10',
      'Nearest 50',
      'Nearest 100',
    ]);
  });

  it('says what the night is set to, in the words the row uses', () => {
    // One string for E2, E4 and E6 — a second spelling on any of them is the
    // app disagreeing with itself about what the night is set to.
    expect(roundingRowLabel(null)).toBe('Rounding · off');
    expect(roundingRowLabel('tens')).toBe('Rounding · nearest $10');
    /* Rewritten 2 September with the rule they describe. The step lands the
       NETS, never a stack, and there is no remainder state at all — the third
       assertion here used to be `+$16 → piggy`. */
    expect(roundingRowValue(null)).toBe('to the dollar');
    expect(roundingRowValue('tens')).toBe('on the nets');
  });

  it('has a rounding step of its own, reached from the game', () => {
    expect(setup).toContain("| 'rounding'");
    expect(setup).toContain("rounding: 'game',");
    expect(setup).toContain("go('rounding')");
  });

  /*
   * AND WRITES IT ONTO THE NIGHT. A row that opens a step, sets some state and
   * never reaches `startNight` is the whole bug wearing the fix's clothes: the
   * setting appears to take, and the table opens on whatever was inherited.
   *
   * `storedRounding` is the normalisation — the chips offer 'dollars' as a
   * value and the night stores whole dollars as null, which is how the server
   * column has always spelled it.
   */
  it('opens the table on what was picked, and remembers it for next time', () => {
    expect(setup).toContain('roundingMode: storedRounding,');
    expect(setup).toMatch(/rememberLastGame\(\s*club\.id,\s*liveBuyIn,\s*liveRules,\s*storedRounding,/);
  });
});

describe('the deductions settings reach the bill and the person who paid', () => {
  /*
   * Both the in-game rules and the post-game step. The engine has always
   * allowed a spend added during settle-up — 11-bill-and-piggy-bank.md, "After
   * the count" — and no screen in the ending flow could reach it.
   */
  it('tonight’s money rules and the deductions step both list the spends', () => {
    for (const route of ['apps/mobile/app/money-rules.tsx', 'apps/mobile/app/deductions.tsx']) {
      expect(read(route)).toContain('<SpendList');
    }
  });

  /* One implementation of the sentence, for the same reason `Preset.tsx` is one
     component: for a week it was two, one of them fixed. B14. */
  it('says who fronted a spend in one place', () => {
    expect(read('apps/mobile/app/bill.tsx')).toContain('frontedSentence');
    expect(read('apps/mobile/src/components/SpendList.tsx')).toContain(
      'export function frontedSentence',
    );
  });

  /*
   * The audit opens the two routes it can and asks for the rows by name.
   *
   * /deductions is not one of them and cannot be: the seeded night is
   * mid-count, so the bare route renders E3's "Not yet" state, which correctly
   * has no bill on it. That screen is `ui-journeys.mjs`'s — it reaches it with
   * a night counted, adds a spend from it and checks the spend arrives.
   */
  it('is named in the tools that open these screens', () => {
    const audit = read('scripts/ui-audit.mjs');
    const block = /const DECIDED = \{([\s\S]*?)\n\};/.exec(audit);
    expect(block).not.toBeNull();
    expect(block![1]).toContain("'/money-rules': ['The bill', 'Add a spend']");
    expect(block![1]).toContain("'/new-night': ['Rounding']");

    const journeys = read('scripts/ui-journeys.mjs');
    expect(journeys).toContain("await tap('Add a spend'");
    expect(journeys).toContain('the spend reaches the bill');
  });
});

describe('every figure in the app is written in the group’s own currency', () => {
  /*
   * B32. `formatMoney(amount)` has taken a currency symbol since the day it was
   * written and defaulted to `$` when nobody passed one — and for thirty-one
   * screens, nobody ever did. A club keeping its book in koruna picked its
   * currency at setup, saw it on the settings screen, and settled up in
   * dollars everywhere else.
   *
   * THE FIX IS AN IMPORT, so this is a test about imports. `src/lib/money.ts`
   * binds every formatter to the club's own symbol and has no default to fall
   * back on; a screen that reaches past it to core gets the dollar back, and
   * that is exactly the kind of thing that returns one file at a time.
   */
  const MONEY_FORMATTERS = [
    'formatMoney',
    'formatSigned',
    'formatToFit',
    'formatSignedToFit',
    'formatCompact',
    'formatSignedCompact',
    'stakesLabel',
    'straddleLabel',
    'stakesSummary',
    'roundingChoices',
    'roundingRowLabel',
    'roundingRowValue',
    'roundingSentence',
    'ruleDetail',
  ];

  /** Every screen and component, which is where a figure is drawn. */
  const screens = (): string[] => {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(full);
      }
    };
    walk(path.join(root, 'apps/mobile/app'));
    walk(path.join(root, 'apps/mobile/src'));
    return out.filter((f) => !f.endsWith(path.join('src', 'lib', 'money.ts')));
  };

  it('takes its formatters from src/lib/money, never straight from core', () => {
    const offenders: string[] = [];

    for (const file of screens()) {
      const source = fs.readFileSync(file, 'utf8');
      /* The core import block, if there is one. Only its named imports matter:
         a type import of `Money` is not a formatter. */
      const block = /import \{([^}]*)\} from '@poker-club\/core';/.exec(source);
      if (block === null) continue;
      const named = block[1]!.split(',').map((n) => n.trim());
      const wrong = named.filter((n) => MONEY_FORMATTERS.includes(n));
      if (wrong.length > 0) {
        offenders.push(`${path.relative(root, file)} → ${wrong.join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('and no screen writes a currency symbol into its own markup', () => {
    /*
     * The other way a dollar sign survives a sweep: a `$` typed straight into
     * the JSX, with no formatter anywhere near it. There was exactly one — the
     * buy-in field on the seat sheet, where the symbol stands alone in front of
     * a text input rather than in front of a figure, which is why every grep
     * for a formatter missed it for a month.
     */
    const offenders: string[] = [];
    for (const file of screens()) {
      /* The ISO table is the one place a currency symbol is DATA. Every glyph
         in the app comes out of it, `$` included. */
      if (file.endsWith(path.join('src', 'data', 'currencies.ts'))) continue;
      const source = fs.readFileSync(file, 'utf8');
      const lines = source.split('\n');
      lines.forEach((line, i) => {
        if (/^\s*[*/]/.test(line)) return; // a comment may say $ as much as it likes
        if (/>\s*\$\s*<|['\"]\$['\"]/.test(line)) {
          offenders.push(`${path.relative(root, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('and the module it takes them from has no default to fall back on', () => {
    // A default is what let this happen the first time. If one comes back, a
    // screen that says nothing gets a dollar sign again and nothing goes red.
    const money = read('apps/mobile/src/lib/money.ts');
    expect(money).not.toMatch(/currencySymbol = '\$'/);
    expect(money).toContain('currentClub()?.currency');
  });

  it('draws the currency the club is actually keeping its book in', () => {
    // The symbol comes off the stored ISO code, through the same table the
    // setup sheet picks from — not off a list this file keeps.
    expect(currencyFor('CZK').symbol).toBe('Kč');
    expect(currencyFor('EUR').symbol).toBe('€');
    expect(currencyFor('GBP').symbol).toBe('£');
    expect(currencyFor('USD').symbol).toBe('$');
  });

  it('names the group’s money in the rounding copy too', () => {
    // The step is an amount, so it is written in the group's currency wherever
    // it is named — the row, its value, the four rows of the sheet.
    expect(roundingRowLabel('tens', 'Kč')).toBe('Rounding · nearest Kč10');
    /* The value names no amount, so it takes no symbol — the label beside it
       does, and that is where the row states the group's money. */
    expect(roundingChoices('€').map((c) => c.chip)).toEqual([
      'Off',
      'Nearest €10',
      'Nearest €50',
      'Nearest €100',
    ]);
  });
});
