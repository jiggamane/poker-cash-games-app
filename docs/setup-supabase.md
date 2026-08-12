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

The schema is `supabase/schema.sql` — every migration in
`supabase/migrations/` concatenated, in order, for a project that has none of
them yet. It has never been applied to this project, so it needs running once.
(The instructions below name `0001_init.sql`, which was the whole schema when
they were written; run the bundle instead, and see
[`auth-test-period.md`](auth-test-period.md) for the dashboard settings that
`0004_watcher_access.sql` needs turned on.)

Use whichever of these works:

**a. Supabase MCP server** (already configured in `.mcp.json`). Authenticate
with `/mcp`, then apply the contents of `supabase/migrations/0001_init.sql` to
project `eciozeeqywpgqlxqmprl`.

**b. Supabase CLI:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref eciozeeqywpgqlxqmprl
supabase db push
```

**c. By hand:** open the project's SQL Editor in the dashboard, paste the whole
of `supabase/migrations/0001_init.sql`, and run it.

### Expected result

It should complete with no errors and create these tables in `public`:
`book`, `player`, `session`, `session_seat`, `ledger_entry`, `money_rule`,
`final_count`, `settlement`.

### If it fails

- **"type ... already exists"** or **"relation ... already exists"** — some of it
  ran before. Do not blindly re-run. Report exactly which object it complains
  about, so a follow-up migration can be written rather than the file edited.
- **"permission denied for schema extensions"** — run just the first two lines
  as the dashboard's SQL Editor (which runs with higher privileges), then the
  rest.
- Anything else — copy the exact error text back. Do not edit
  `0001_init.sql` to make an error go away; the file is verified against real
  Postgres by `npm run db:verify` and an edit will silently diverge from what the
  tests check.

### Verify it worked

In the SQL Editor, this must return 8 rows:
```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

And this must show `rowsecurity = true` for every one of them:
```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

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
npm run check      # 82 tests + typecheck, should pass
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
