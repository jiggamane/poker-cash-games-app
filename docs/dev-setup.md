# Dev setup

Written for someone who is not a professional developer and is building this
with Claude Code. Everything here is a command you paste; nothing assumes you
know what it does.

---

## What you need installed once

| Thing | Why | Get it |
|---|---|---|
| **Node.js 20+** | Runs the tooling | <https://nodejs.org> (pick "LTS") |
| **Expo Go** app | Shows the app on your phone with no build | App Store / Play Store |
| **Docker Desktop** *(optional)* | Runs a throwaway database for `npm run db:verify` | <https://docker.com> |

You do **not** need Xcode, Android Studio, or a Mac. That is the point of the
Expo setup (see `build-plan.md` §1).

---

## First run

```bash
npm install          # once, from the repo root
npm run check        # typecheck everything + run the money tests
```

`npm run check` should end with tests passing. If it does, your machine is set
up correctly.

---

## The commands you will actually use

| Command | What it does |
|---|---|
| `npm run check` | Typecheck + all tests. **Run this before every commit.** |
| `npm test` | Just the money tests |
| `npm run test:watch` | Re-runs tests as you edit — good while working on money logic |
| `npm run typecheck` | Catches type mistakes without running anything |
| `npm run db:verify` | Applies the database schema to a throwaway database and proves the money rules hold |
| `npm start` *(in `apps/mobile`)* | Starts the app; scan the QR code with Expo Go |

### Seeing the app on your phone

```bash
cd apps/mobile
npm start
```

Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android).
The app opens on your phone and reloads as you edit. No build, no cable.

**Away from this computer?** The QR code needs the dev server running on the
same wifi, so it is no use from a train. Every merge to `main` also publishes
the app to <https://jiggamane.github.io/poker-cash-games-app/app/>, which opens
on any phone with nothing running anywhere. Read `phone-preview.md` first — it
is the real app, but a browser cannot keep its data and cannot do the native
gestures.

Right now this shows a **scaffold smoke screen**, not a designed screen — it
exists to prove the plumbing works. The real screens come from
`design/Style Guide v2.dc.html`.

---

## How the repo is laid out

```
apps/mobile/        The Expo app (what people install)
packages/core/      Money + settlement logic — SHARED by app and server
supabase/
  migrations/       The database schema. Numbered, applied in order.
  test/             Proves the money invariants actually hold
scripts/            Helper scripts
design/             The original design references
docs/               The plan and this guide
```

### Why `packages/core` is separate

The settlement math has to run in two places — in the app (so the host sees
numbers instantly) and on the server (so the result is canonical and
auditable). Keeping it in its own package means it is written **once** and both
sides import the same code, so the two can never disagree. This is the main
reason the project is TypeScript on both ends.

**Rule: nothing in `packages/core` may touch the network, the filesystem, the
clock, or any phone API.** It takes numbers in and returns numbers out. That is
what makes it testable and reproducible.

---

## The money rules, in short

If you only remember three things:

1. **Money is always a whole number.** Never a decimal. `packages/core/src/money.ts`
   is the only place that can create a `Money` value, and it throws on anything
   fractional. If you find yourself wanting `10.5`, the answer is elsewhere.
2. **The ledger is append-only.** You never edit or delete a ledger entry. To fix
   a mistake you add a *correction* that points at the original. The database
   physically refuses updates and deletes, so this isn't a convention you can
   forget.
3. **Splitting money uses `allocate()`.** It guarantees the parts add back up to
   the whole exactly — no unit invented, none lost. Never split money by hand
   with `/` and `Math.round`.

---

## Working on the database

The schema lives in `supabase/migrations/`, applied in filename order.

**Never edit a migration that has already run on a real database.** Add a new
numbered file instead (`0002_...sql`). Editing an applied migration means your
database and your code silently disagree.

To check your changes:

```bash
npm run db:verify
```

This spins up a throwaway database, applies every migration from scratch, then
runs the assertions in `supabase/test/01_invariants.sql` — that the ledger
really is append-only, that a negative buy-in is rejected, that a watcher can
only see the one session they were given, and so on. It prints
`ALL SCHEMA INVARIANT TESTS PASSED` or fails loudly.

`supabase/test/00_supabase_shim.sql` fakes the small parts of Supabase (the
`auth` schema) that a bare Postgres doesn't have. It is **test-only** and never
runs against the real thing.

### When you connect a real Supabase project

1. Create a project at <https://supabase.com> (free tier is fine).
2. Install the CLI: `npm install -g supabase`
3. `supabase link --project-ref <your-ref>` then `supabase db push`.
4. Put the project URL and the **anon** key in `apps/mobile/.env`
   (`.env` is gitignored — never commit keys).

The `service_role` key must never appear in the app. It bypasses every
security rule in the database. It belongs only in server-side edge functions.

---

## Notes and gotchas

- **Stay on managed Expo.** Don't add native libraries that require `prebuild`
  or ejecting unless there's no alternative — that's where the "no developer
  needed" property breaks down. The Expo SDK plus Supabase covers everything v1
  needs.
- **Imports in `packages/core` have no file extension** (`./money`, not
  `./money.js`). Metro, the React Native bundler, resolves it that way.
- **`apps/mobile/AGENTS.md`** tells Claude Code to check the versioned Expo docs
  before writing app code. Expo's API changes between SDK versions, and this is
  what stops it guessing from an older version.
