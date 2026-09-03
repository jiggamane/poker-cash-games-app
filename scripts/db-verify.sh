#!/usr/bin/env bash
# =============================================================================
# db-verify.sh — apply the migrations to a throwaway database and assert that
# the money invariants hold.
#
# Run it with:   npm run db:verify
#
# It picks a database in this order:
#   1. $DATABASE_URL, if you set one (e.g. a local `supabase start` instance)
#   2. a throwaway Postgres container, if Docker is available
#   3. a local PostgreSQL installation, via pg_ctl
#
# This is a TEST database. It gets wiped. Never point DATABASE_URL at anything
# you care about.
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$REPO_ROOT/supabase/migrations"
TESTS="$REPO_ROOT/supabase/test"

CONTAINER_NAME="poker-club-verify-db"
CLEANUP=""

cleanup() {
  if [ -n "$CLEANUP" ]; then eval "$CLEANUP" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

# --- 1. Caller-supplied database ---------------------------------------------
if [ -n "${DATABASE_URL:-}" ]; then
  echo "==> Using DATABASE_URL"
  PSQL=(psql "$DATABASE_URL")

# --- 2. Docker ---------------------------------------------------------------
elif docker info >/dev/null 2>&1 && \
     docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1; \
     docker run -d --name "$CONTAINER_NAME" \
       -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=poker \
       -p 55432:5432 postgres:16-alpine >/dev/null 2>&1; then
  echo "==> Started a throwaway Postgres container"
  CLEANUP="docker rm -f $CONTAINER_NAME"

  for _ in $(seq 1 40); do
    if docker exec "$CONTAINER_NAME" pg_isready -U postgres -d poker >/dev/null 2>&1; then break; fi
    sleep 1
  done
  PSQL=(docker exec -i "$CONTAINER_NAME" psql -U postgres -d poker)

# --- 3. Local PostgreSQL ------------------------------------------------------
elif command -v pg_ctl >/dev/null 2>&1 || ls /usr/lib/postgresql/*/bin/pg_ctl >/dev/null 2>&1; then
  echo "==> Starting a local PostgreSQL instance"
  PGBIN="$(dirname "$(ls /usr/lib/postgresql/*/bin/pg_ctl 2>/dev/null | head -1 || command -v pg_ctl)")"
  PGDATA="${PGDATA:-/var/lib/postgresql/verifydata}"
  rm -rf "$PGDATA"; mkdir -p "$PGDATA"
  chown -R postgres:postgres "$(dirname "$PGDATA")"
  su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres" >/dev/null 2>&1
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p 55432 -k /tmp' -l /tmp/pg-verify.log start" >/dev/null 2>&1
  CLEANUP="su postgres -c '$PGBIN/pg_ctl -D $PGDATA stop'"
  sleep 3
  su postgres -c "psql -h /tmp -p 55432 -U postgres -c 'create database poker'" >/dev/null
  PSQL=(su postgres -c "psql -h /tmp -p 55432 -U postgres -d poker")

else
  echo "No database available. Install Docker, or the Supabase CLI, or PostgreSQL." >&2
  exit 1
fi

run_sql_file() {
  local file="$1"
  if [ "${PSQL[0]}" = "su" ]; then
    # the postgres user needs to be able to read the file
    local tmp="/tmp/$(basename "$file")"
    cp "$file" "$tmp"; chmod 644 "$tmp"
    su postgres -c "psql -h /tmp -p 55432 -U postgres -d poker -v ON_ERROR_STOP=1 -q -f $tmp"
  else
    "${PSQL[@]}" -v ON_ERROR_STOP=1 -q < "$file"
  fi
}

# Same, but hands the output back instead of printing it.
capture_sql_file() {
  local file="$1"
  if [ "${PSQL[0]}" = "su" ]; then
    local tmp="/tmp/$(basename "$file")"
    cp "$file" "$tmp"; chmod 644 "$tmp"
    su postgres -c "psql -h /tmp -p 55432 -U postgres -d poker -v ON_ERROR_STOP=1 -q -f $tmp"
  else
    "${PSQL[@]}" -v ON_ERROR_STOP=1 -q < "$file"
  fi
}

echo "==> Applying the Supabase shim (local only — the real Supabase provides this)"
run_sql_file "$TESTS/00_supabase_shim.sql"

echo "==> Applying migrations"
for f in "$MIGRATIONS"/*.sql; do
  echo "    $(basename "$f")"
  run_sql_file "$f"
done

echo "==> Asserting invariants"
for f in "$TESTS"/*.sql; do
  # 00 is the shim, already applied above.
  case "$(basename "$f")" in 00_*) continue ;; esac
  echo "    $(basename "$f")"
  run_sql_file "$f"
done

# --- The state check has to be right about a database it can see ------------
# supabase/state-check.sql is what tells a person which migrations their real
# project is missing. A probe that never matches anything would report a fully
# migrated project as broken, and one that matches too loosely would report a
# stale project as fine — the second is how a night gets played against a schema
# that cannot store its rounding. This database has every migration, so every
# row must come back `ok`.
echo "==> Holding supabase/state-check.sql against a fully-migrated database"
STATE_OUT="$(capture_sql_file "$REPO_ROOT/supabase/state-check.sql")"
# STATE_CHECK_SHOW=1 prints the table this file would print in the SQL Editor.
if [ -n "${STATE_CHECK_SHOW:-}" ]; then printf '%s\n' "$STATE_OUT"; fi
# Row 93 is the pair of dashboard toggles, which no query can see; it prints as
# `by hand` rather than a verdict. Every other row is a probe and must be ok.
if printf '%s\n' "$STATE_OUT" | grep -q 'MISSING'; then
  printf '%s\n' "$STATE_OUT"
  echo "" >&2
  echo "state-check.sql calls a migration missing on a database that has all of them." >&2
  echo "The probe is wrong, not the database. Fix supabase/state-check.sql." >&2
  exit 1
fi

echo ""
echo "OK — schema applies cleanly, every invariant holds, and the state check reads it correctly."
