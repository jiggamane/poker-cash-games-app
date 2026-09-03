# Connecting the app to Supabase

Instructions for a Claude Code session running on the user's own computer.
The remote session that wrote this code cannot reach `supabase.co` — that
container's network policy denies it — so these two steps have to happen here.

**Project ref:** `eciozeeqywpgqlxqmprl`
**Project URL:** `https://eciozeeqywpgqlxqmprl.supabase.co`

---

## Safety rules — read first

- The **anon** key (labelled `anon` / `public` in the dashboard) is *designed to
  be public*. It ships inside the app bundle. It is fine in `.env`.
- The **`service_role`** key must NEVER be put in `.env`, in `apps/`, in a
  commit, or in a chat message. It bypasses every security policy in the
  database. If it is ever exposed, rotate it in the dashboard immediately.
- `apps/mobile/.env` is gitignored. Keep it that way. Never `git add -f` it.

---

## Step 1 — apply the database schema

**Before anything else, find out what is already there.** This project has been
set up more than once and the schema has grown to thirteen migrations, so the
question is never "has it been applied" but "how far".

Paste the whole of `supabase/state-check.sql` into the SQL Editor and run it. It
is read-only — it writes nothing and locks nothing — and it returns one row per
migration saying `ok` or `MISSING`, with the file to run in the last column.

```
 n  | item                                      | state   | fix
----+-------------------------------------------+---------+-----------------------------------
  1 | 0001 schema, append-only ledger, policies | ok      | run supabase/migrations/0001_init.sql
 ...
 13 | 0013 the night carries its rounding       | MISSING | run supabase/migrations/0013_night_rounding.sql
```

Then:

- **Every row `ok`** — the database is current. Nothing to run. Go to step 2.
- **Some rows `MISSING`** — run exactly those files, in numeric order, in the SQL
  Editor. Migrations are not idempotent; running one that is already applied
  fails on "already exists", which is the file telling you it was not needed.
- **Every row `MISSING`** — a fresh project. `supabase/schema.sql` is all
  thirteen concatenated, for one paste. Run it **once**.

Re-run `state-check.sql` afterwards; everything except row 93 must say `ok`.

Row 93 is the two dashboard toggles, which no query can see. They are step 2 and
step 3 of `auth-test-period.md`, and the second of them is the one that fails
silently: without the access-token hook a watcher's screen is simply empty and
nothing anywhere reports an error.

Instead of pasting by hand you can use the **Supabase CLI**:

```bash
npm install -g supabase
supabase login
supabase link --project-ref eciozeeqywpgqlxqmprl
supabase db push
```

The **Supabase MCP server** in `.mcp.json` is the third route — authenticate with
`/mcp` and apply the files to project `eciozeeqywpgqlxqmprl`. Neither the MCP
server nor `supabase.co` is reachable from a remote Claude session; that network
is denied at the proxy, so a session in the cloud can prepare the SQL but a
person or a session on your own machine has to run it.

### If it fails

- **"type ... already exists"** or **"relation ... already exists"** — that file
  had already run. Re-run `state-check.sql` rather than picking through the
  error; it will tell you which files are genuinely outstanding.
- **"permission denied for schema extensions"** — run just the first two lines of
  `0001_init.sql` in the dashboard's SQL Editor, which has higher privileges,
  then the rest.
- Anything else — copy the exact error text back. Do not edit a migration to make
  an error go away; the files are verified against real Postgres by
  `npm run db:verify` and an edit will silently diverge from what the tests
  check. Fix it forward, in a new numbered migration.

---

## Step 2 — create the environment file

Create `apps/mobile/.env` (it is gitignored, so it exists only on this machine):

```
EXPO_PUBLIC_SUPABASE_URL=https://eciozeeqywpgqlxqmprl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<paste the anon key here>
```

The anon key is in the dashboard under **Project Settings → API → Project API
keys → `anon` `public`**. It is a long string starting with `eyJ`.

Do not put the `service_role` key here.

---

## Step 3 — check it all works

```bash
npm install
npm run check      # typecheck + the money tests, all green
```

Then start the app:

```bash
cd apps/mobile
npm start
```

Scan the QR code with the iPhone camera, or with the Expo Go app on Android.

**What to look for:** the Settle up screen, and at the bottom of it the line
should now read **"Connected to Supabase."** rather than "No Supabase project
yet". If it still says the latter, the `.env` was not picked up — stop the
server and start it again, since environment variables are read at startup.

---

## Step 4 — report back

Send these to the remote session so it can carry on:

1. Whether the schema applied cleanly, and the exact error text if not.
2. Whether the footer says "Connected to Supabase."
3. **A screenshot of the app on the phone.** This is the important one — the
   remote session has no device and has never seen any of this rendered. The
   colours, type scale and spacing are its reading of `Style Guide v2.dc.html`
   and almost certainly need adjusting against the real thing.
4. Anything that looks wrong: text too big or small, wrong weights, cramped or
   loose spacing, colours that do not match the style guide.

Do not commit `.env`. Committing the schema changes is not needed — nothing in
the repo changes during this setup.
