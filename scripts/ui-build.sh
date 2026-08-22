#!/usr/bin/env bash
#
# The typeface and the web export — everything that has to exist before a
# browser can be pointed at this app.
#
# Two things need it and they need it identically: `ui-up.sh`, which serves the
# build for a person to drive, and `ui-gate.sh`, which serves it for the audit
# and the journeys. The staleness test below is a heuristic with a real edge to
# it — it compares mtimes under app/, src/ and packages against the built
# index.html — and a heuristic written out twice is one that drifts. This is the
# same reason `packages/core` exists: one implementation, or two that disagree.
#
#   bash scripts/ui-build.sh          # then serve it yourself
#
# Prints what it did. Leaves the build at apps/mobile/.web.
set -euo pipefail

cd "$(dirname "$0")/.."

BUILD=apps/mobile/.web

bash scripts/ui-fonts.sh

stale=1
if [ -f "$BUILD/index.html" ]; then
  # Anything under app/ or src/ newer than the build means the build is old.
  newer="$(find apps/mobile/app apps/mobile/src packages -newer "$BUILD/index.html" \
            -name '*.ts' -o -newer "$BUILD/index.html" -name '*.tsx' 2>/dev/null | head -1)"
  [ -z "$newer" ] && stale=0
fi

if [ "$stale" = 1 ]; then
  echo "building the web export…"
  npm --workspace @poker-club/mobile run export:web >/dev/null
else
  echo "web export is current — skipping the build (delete $BUILD to force one)."
fi
