#!/usr/bin/env bash
#
# Put the handoff's fonts on this machine, so a screenshot measures the type it
# was drawn in.
#
# The boards ask for `-apple-system, 'SF Pro Text', 'Figtree', sans-serif`. A
# Linux box has none of those, so both the app and the board fall back to
# whatever fontconfig picks — DejaVu Sans, on a stock container. That is not
# fatal for `ui-check`, because both sides fall back the same way and layout,
# colour and ordering still compare honestly. It is fatal for anything the type
# itself causes: a label that wraps a word early, a figure that outgrows its
# column, a row of tabular figures that stops lining up.
#
# Figtree is the stack's third entry and the one the design intends off Apple
# platforms. It is SIL OFL, so it downloads and installs without ceremony.
# SF Pro cannot be had — Apple licenses it and does not permit redistribution —
# so iOS-exact type stays a real-device check. Figtree is much closer to SF
# than DejaVu is, and it is exactly right for Android and web.
#
# Idempotent: re-running when the fonts are already registered does nothing.
#
#   bash scripts/ui-fonts.sh          # install
#   bash scripts/ui-fonts.sh --check  # report, install nothing
set -euo pipefail

DEST="${UI_FONTS_DIR:-$HOME/.local/share/fonts/figtree}"
BASE="https://fonts.gstatic.com/s/figtree/v9"

# Weight → the file Google serves for it. The boards use 400 through 800.
WEIGHTS=(
  "400:_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_d_QF5e.ttf"
  "500:_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_dNQF5e.ttf"
  "600:_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_ehR15e.ttf"
  "700:_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_eYR15e.ttf"
  "800:_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_f_R15e.ttf"
)

resolved() { fc-match Figtree 2>/dev/null | sed 's/.*"\(.*\)" ".*/\1/'; }

if [ "${1:-}" = "--check" ]; then
  got="$(resolved)"
  if [ "$got" = "Figtree" ]; then
    echo "Figtree is installed — screenshots render the drawn typeface."
  else
    echo "Figtree is NOT installed. 'Figtree' currently resolves to: ${got:-unknown}"
    echo "Type metrics in ui-check output do not match the boards. Run: bash scripts/ui-fonts.sh"
  fi
  exit 0
fi

if [ "$(resolved)" = "Figtree" ]; then
  echo "Figtree already installed ($DEST) — nothing to do."
  exit 0
fi

command -v fc-cache >/dev/null || {
  echo "fontconfig is missing (no fc-cache). Install fontconfig, then re-run." >&2
  exit 1
}

mkdir -p "$DEST"
for entry in "${WEIGHTS[@]}"; do
  weight="${entry%%:*}"
  file="${entry#*:}"
  out="$DEST/Figtree-$weight.ttf"
  [ -s "$out" ] && continue
  echo "  fetching Figtree $weight"
  # Four tries, backing off: this runs in sandboxes with flaky egress.
  for attempt in 1 2 3 4; do
    if curl -fsSL --max-time 30 -o "$out" "$BASE/$file"; then break; fi
    [ "$attempt" = 4 ] && { echo "could not fetch Figtree $weight from $BASE/$file" >&2; exit 1; }
    sleep $((attempt * 2))
  done
done

fc-cache -f "$DEST" >/dev/null
got="$(resolved)"
if [ "$got" != "Figtree" ]; then
  echo "installed into $DEST but fontconfig still resolves Figtree to '$got'." >&2
  exit 1
fi
echo "Figtree installed ($DEST). Screenshots now render the drawn typeface."
