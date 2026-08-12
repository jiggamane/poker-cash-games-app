#!/usr/bin/env bash
# Concatenate every migration into supabase/schema.sql, for setting up a fresh
# Supabase project in one paste. Run after adding a migration.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/supabase/schema.sql"

{
  cat <<'HDR'
-- =============================================================================
-- The Poker Club — complete schema
-- =============================================================================
-- GENERATED FILE. Do not edit.
--   Regenerate with:  npm run db:bundle
--   Source of truth:  supabase/migrations/*.sql
--
-- Every migration, concatenated in order, so a fresh project can be set up in
-- one paste. Run this ONCE in the Supabase SQL Editor.
--
-- Applying it twice will fail on "type already exists" — that is correct
-- behaviour, not a problem to work around. If you need to change the schema
-- later, add a new numbered migration and run only that.
-- =============================================================================

HDR
  for f in "$ROOT"/supabase/migrations/*.sql; do
    echo ""
    echo "-- ===== $(basename "$f") ============================================="
    echo ""
    cat "$f"
  done
} > "$OUT"

echo "Wrote $OUT ($(wc -l < "$OUT") lines from $(ls "$ROOT"/supabase/migrations/*.sql | wc -l) migrations)"
