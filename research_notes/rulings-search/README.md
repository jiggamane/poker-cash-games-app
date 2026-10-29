# Rulings search — the description test

The evidence behind `docs/rulings-find.md`. Fifty-four things a host might
type into the Rules field, each written as a sentence about what happened
rather than a keyword, with the situation it should find.

```bash
npx vite-node research_notes/rulings-search/run.ts
```

`queries.ts` is the set. `describe.ts` is the prototype matcher the doc
proposes (OR-matching, stopwords, a light stemmer, IDF weighting, the answer
bodies indexed, a phrasebook of synonyms). `run.ts` scores the app's current
`searchSituations` and the prototype side by side: first-hit rate, top-three
rate, and how often nothing at all came back.

Run on 29 October 2026 against `main` at `a0755ac`:

| | first hit | in top three | nothing returned |
|---|---|---|---|
| current `search.ts` | 1 / 54 | 1 / 54 | 53 / 54 |
| prototype | 39 / 54 | 49 / 54 | 0 / 54 |

Caveat, stated in the doc too: the same person wrote the queries and the
phrasebook, so the prototype's figure is a ceiling for this set, not a
forecast. The five misses are listed by the run.
