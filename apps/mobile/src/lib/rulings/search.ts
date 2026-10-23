/**
 * Offline search over the library — `docs/rulings.md` § 3.1.
 *
 * A host who knows what happened types two words. Nothing here touches the
 * network: the library is in the bundle, and this is string matching over its
 * titles, aliases and keywords. Ranking is prefix match on a word first, then
 * substring, with the title weighted above an alias and an alias above a
 * keyword, so "muck" finds "Winning hand hit the muck" before "Dealer mucked a
 * hand by mistake" and both before anything that merely mentions the muck.
 */

import { SITUATIONS, byAreaThenOrder, type Situation } from '@poker-club/core';

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[“”"'’‘]/g, '');

const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 0);

function score(s: Situation, terms: string[]): number {
  const title = words(s.title);
  const aliases = s.aliases.flatMap(words);
  const keywords = s.keywords.flatMap(words);
  let total = 0;
  for (const term of terms) {
    let best = 0;
    const hit = (pool: string[], prefixWeight: number, insideWeight: number) => {
      for (const w of pool) {
        if (w === term || w.startsWith(term)) best = Math.max(best, prefixWeight);
        else if (w.includes(term)) best = Math.max(best, insideWeight);
      }
    };
    hit(title, 6, 3);
    hit(aliases, 4, 2);
    hit(keywords, 3, 1);
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

/** The situations matching `query`, best first, at most `limit`. Empty for an empty query. */
export function searchSituations(query: string, limit = 6, pool: readonly Situation[] = SITUATIONS): Situation[] {
  const terms = words(query);
  if (terms.length === 0) return [];
  return pool
    .map((s) => ({ s, score: score(s, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || byAreaThenOrder(a.s, b.s))
    .slice(0, limit)
    .map((r) => r.s);
}
