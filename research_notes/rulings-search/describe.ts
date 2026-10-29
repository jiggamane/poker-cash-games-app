/**
 * Prototype: search that takes a DESCRIPTION, not a keyword.
 * OR-matching with IDF weighting over title, aliases, keywords AND the answer
 * body, with stopwords dropped and a light stemmer, so a sentence finds the
 * situation that shares its rare words rather than failing on its common ones.
 */
import { SITUATIONS, byAreaThenOrder, type Situation } from '@poker-club/core';

const STOP = new Set(('a an the and or but so then if is are was were be been being am do does did doing have has had ' +
  'he she it they them his her their him we us our you your i me my mine someone somebody anyone everyone nobody guy guys ' +
  'player players people person one ones this that these those there here what which who whom whose when where why how ' +
  'can could should would will shall may might must to of in on at by for from with without into onto over under about ' +
  'after before during while as than too very just only also still already yet now not no yes dont didnt doesnt wasnt isnt ' +
  'cant wont hasnt havent its im hes shes theyre were youre ive actually really want wants wanted says said say told tell ' +
  'get got gets going went go come came put puts putting does do did happen happened happens allowed allow ok okay ' +
  'poker game hand hands table tonight us'
).split(/\s+/));

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”"'’‘]/g, '');
const stem = (w: string) => {
  if (w.length <= 3) return w;
  for (const suf of ['ing', 'ed', 'es', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) { w = w.slice(0, -suf.length); break; }
  }
  return w;
};
const terms = (s: string, dropStop = true) =>
  fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 0 && (!dropStop || !STOP.has(w))).map(stem);

/* A few ways a host says it that no title or alias carries. Data, not code: lives beside the library. */
const SYNONYMS: Record<string, string[]> = {
  venmo: ['app', 'transfer'], zelle: ['app', 'transfer'], revolut: ['app', 'transfer'], paypal: ['app', 'transfer'],
  cash: ['money', 'bank'], pocket: ['south', 'off'], leave: ['leaving'], left: ['leaving', 'paying'],
  flip: ['exposed', 'flash'], flipped: ['exposed', 'flash'], redeal: ['misdeal'], split: ['tie', 'split'],
  coin: ['change', 'rounding'], owe: ['unpaid', 'credit'], ages: ['slow'], forever: ['slow'],
  nut: ['slow', 'nuts'], pile: ['muck'], threw: ['muck'], away: ['muck'], swept: ['muck'],
  row: ['straight'], order: ['first'], blind: ['blinds', 'straddle'],
};

interface Doc { s: Situation; bags: { tf: Map<string, number>; w: number }[]; }

const DOCS: Doc[] = SITUATIONS.map((s) => {
  const bag = (text: string, w: number) => {
    const tf = new Map<string, number>();
    for (const t of terms(text)) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { tf, w };
  };
  return {
    s,
    bags: [bag(s.title, 6), bag(s.aliases.join(' '), 4), bag(s.keywords.join(' '), 3), bag(s.cash.body, 1)],
  };
});

/* Document frequency across all fields, for IDF: "card" is in half the library and should count for little. */
const DF = new Map<string, number>();
for (const d of DOCS) {
  const seen = new Set<string>();
  for (const b of d.bags) for (const t of b.tf.keys()) seen.add(t);
  for (const t of seen) DF.set(t, (DF.get(t) ?? 0) + 1);
}
const N = DOCS.length;
const idf = (t: string) => Math.log(1 + (N - (DF.get(t) ?? 0) + 0.5) / ((DF.get(t) ?? 0) + 0.5));

function matchWeight(d: Doc, t: string): number {
  let best = 0;
  for (const b of d.bags) {
    for (const [w] of b.tf) {
      if (w === t) best = Math.max(best, b.w);
      else if (t.length >= 4 && (w.startsWith(t) || t.startsWith(w)) && Math.min(w.length, t.length) >= 4) best = Math.max(best, b.w * 0.7);
    }
  }
  return best;
}

export function describeSearch(query: string, limit = 6): { s: Situation; score: number }[] {
  const raw = terms(query);
  if (raw.length === 0) return [];
  const expanded = new Set<string>(raw);
  for (const t of raw) for (const syn of SYNONYMS[t] ?? []) expanded.add(stem(syn));
  const qs = [...expanded];
  const scored = DOCS.map((d) => {
    let score = 0;
    let matched = 0;
    for (const t of qs) {
      const w = matchWeight(d, t);
      if (w > 0) { score += w * idf(t); matched++; }
    }
    // Coverage: a document that explains several of the words beats one that nails one.
    const coverage = matched / qs.length;
    return { s: d.s, score: score * (0.5 + coverage) };
  }).filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score || byAreaThenOrder(a.s, b.s));
  // Cut the long tail: anything under a third of the best is noise.
  const top = scored[0]?.score ?? 0;
  return scored.filter((r) => r.score >= top * 0.33).slice(0, limit);
}
