#!/usr/bin/env bash
#
# Everything `ui-check` needs, in one command.
#
# Installs the handoff's typeface, builds the app for the browser, and serves
# it. Leaves the server in the foreground — Ctrl-C stops it. Run `ui-check` in
# another shell.
#
#   npm run ui
#   node scripts/ui-check.mjs shot /session       # in another shell
#
# The build is skipped when it is newer than the app source, so the common case
# — a server that was stopped and wants restarting — is quick.
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

exec node scripts/ui-serve.mjs "$BUILD" "${UI_CHECK_PORT:-4321}"
