#!/usr/bin/env bash
#
# The screen half of the merge gate, in one command and one shell.
#
# `npm run check` proves the arithmetic. It cannot see a screen: every test it
# runs is over `packages/core` or `src/lib`, and none of the 37 screens has one.
# The tools that CAN see a screen already exist — `ui-audit.mjs` holds every
# route to the handoff's stated rules and measures all 21 sheets across six
# devices, `ui-journeys.mjs` plays a big night through and checks that no figure
# is cut off — and both already exit non-zero when they find something.
#
# What they did not have is a way to run without a person. Each needed a server
# already up in another shell, which meant they ran when somebody remembered,
# and between the times anybody remembered the drift walked back in. Every bug
# either of them was written for was found on a phone first.
#
# So this owns the whole lifecycle: build if stale, serve, run both passes,
# stop the server, and exit non-zero if either pass found anything.
#
#   npm run check:ui
#   npm run check:all          # the arithmetic and the screens together
#
# NOT folded into `npm run check`. That one is seconds and is run constantly;
# this one builds the app and drives a browser, and putting them behind a single
# name would make the fast check slow enough to start being skipped. The rule is
# in CLAUDE.md: `check` before every commit, `check:ui` before a merge.
#
# Playwright is needed and is not a dependency of this repo, deliberately — see
# the note at the top of `ui-check.mjs`. Use the machine's, or
# `npm i -g playwright` and run with NODE_PATH="$(npm root -g)".
set -uo pipefail

cd "$(dirname "$0")/.."

PORT="${UI_CHECK_PORT:-4321}"
BUILD=apps/mobile/.web

# --- and the passes have to be pointed at the same port ---------------------
# `ui-serve.mjs` and `ui-currency.mjs` take `UI_CHECK_PORT`; `ui-audit.mjs`,
# `ui-journeys.mjs`, `ui-frames.mjs` and `ui-shots.mjs` take `UI_CHECK_BASE` and
# hard-default it to 4321. So setting the port alone served on one port and
# pointed two of the three passes at another — which does not fail loudly: on a
# machine with a stale server on 4321 it QUIETLY AUDITS THE WRONG BUILD, and
# that is a green run that proves nothing.
#
# Two agents building different halves of a handoff in parallel hit it on the
# same afternoon, each having been told to use a port of their own, and both had
# to work it out from a connection error. Derived here rather than in six
# scripts, and only when it is not already set, so an explicit base still wins.
export UI_CHECK_BASE="${UI_CHECK_BASE:-http://127.0.0.1:${PORT}}"

# --- the typeface and the build, the same way `npm run ui` gets them ---------
bash scripts/ui-build.sh

# --- serve, and take the server down however this script ends ----------------
node scripts/ui-serve.mjs "$BUILD" "$PORT" >/dev/null 2>&1 &
SERVER=$!
cleanup() { kill "$SERVER" 2>/dev/null || true; wait "$SERVER" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

# Wait for it to answer rather than sleeping a guessed number of seconds.
up=0
for _ in $(seq 1 50); do
  if node -e "
    require('node:http').get('http://127.0.0.1:${PORT}/', r => process.exit(r.statusCode < 500 ? 0 : 1))
      .on('error', () => process.exit(1));
  " 2>/dev/null; then up=1; break; fi
  sleep 0.2
done

if [ "$up" != 1 ]; then
  echo "the server never came up on port ${PORT}" >&2
  exit 1
fi

# --- all three passes; each runs even if the one before it failed ------------
# A run that stops at the first failure hides the rest, and the whole point is
# to see everything that is wrong in one go rather than one bug per round trip.
failed=0

echo
echo "── every route against the handoff's rules, and 21 sheets across 6 devices ──"
node scripts/ui-audit.mjs || failed=1

echo
echo "── a big night played through, checking no figure is cut off ──"
node scripts/ui-journeys.mjs || failed=1

echo
echo "── the same screens in a three-letter currency ──"
node scripts/ui-currency.mjs || failed=1

echo
if [ "$failed" = 0 ]; then
  echo "screens: clean."
else
  echo "screens: findings above. Nothing merges on this." >&2
fi
exit "$failed"
