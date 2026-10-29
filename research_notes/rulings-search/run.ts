import { searchSituations } from '../../apps/mobile/src/lib/rulings/search';
import { describeSearch } from './describe';
import { QUERIES } from './queries';

function evalRanker(name: string, rank: (q: string) => string[]) {
  let hit1 = 0, hit3 = 0, none = 0;
  const misses: string[] = [];
  for (const { q, want } of QUERIES) {
    const ids = rank(q);
    if (ids.length === 0) none++;
    if (ids[0] === want) hit1++;
    if (ids.slice(0, 3).includes(want)) hit3++;
    else misses.push(`  ✗ "${q}" → ${ids.slice(0, 3).join(', ') || '(nothing)'}   wanted ${want}`);
  }
  const n = QUERIES.length;
  console.log(`\n${name}: hit@1 ${hit1}/${n} (${Math.round(100 * hit1 / n)}%) · hit@3 ${hit3}/${n} (${Math.round(100 * hit3 / n)}%) · no result ${none}/${n}`);
  console.log(misses.join('\n'));
}

evalRanker('CURRENT (AND, prefix/substring, title/alias/keyword)', (q) => searchSituations(q).map((s) => s.id));
evalRanker('PROTOTYPE (OR + IDF + stopwords + stem + body + synonyms)', (q) => describeSearch(q).map((r) => r.s.id));

// Keyword queries from the existing tests must still work.
const kw = ['muck', 'string', 'bank short', 'rathole', 'hit and run', 'wheel', 'Said "RAISE" chip'];
console.log('\nkeyword sanity (prototype):');
for (const q of kw) console.log(`  ${q} → ${describeSearch(q).slice(0, 3).map((r) => r.s.id).join(', ')}`);
