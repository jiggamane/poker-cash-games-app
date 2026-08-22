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

bash scripts/ui-build.sh

exec node scripts/ui-serve.mjs "$BUILD" "${UI_CHECK_PORT:-4321}"
