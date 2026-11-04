# Legacy "Poker Chips" (2014–2017) — reference material

Research only. Nothing here is wired into the app, and nothing here is a design
handoff: `design/` still governs every screen. This is the prior product (a
virtual-chips tournament app for a physical card game) kept so a tournament mode,
if one is ever built, starts from what was already designed and decided.

## Sources

| What | Where | Notes |
|---|---|---|
| Server, 2017 | `jiggamane/server-poker-chips` | Python 2 / Flask / gevent-socketio. Game rules live in `chips/game/table.py`, `io.py`, `pot.py`. **Its `*.env` files hold live-looking AWS, Facebook, Twitter and DB credentials — rotate them.** |
| Web/Cordova client, 2015 | `jiggamane/client-poker-chips` | AngularJS prototype. Speaks ~7 of the server's events; no real table screen. |
| Native client, Dec 2016–Jan 2017 | Owner's Drive, folder `1gpYwYRliRPg7sS5Ou8A7FCLHMXwNYVh3` | cocos2d-x JS (iOS/Android/web). **The client that matches the 2017 server**: 93 of its 97 socket event names exist in `io.py`. ~24k lines in `src/`; 459 English UI strings plus `ru` and `uk` in `Assets/Data/strings/`; seat coordinates per player count in `res/table_2..10.json`; tutorial videos; sprite sources. |
| Design PSDs, 2014–2015 | Drive, owner `anya.chuyko@gmail.com` | 66 Photoshop files. Extracted in `psd-specs/`. Rights to reuse them are unconfirmed. |

## `psd-specs/`

Machine-extracted with `psd-tools` (`extract.py`, then `summarize.py`).

- `SPECS.md` — index of all 66 files (canvas, target device, layer counts), the
  tokens used across them (fonts, sizes, colours), and per file every visible
  text layer with its position, font, size, colour and alignment.
- `tokens.json` — the same token counts, machine-readable.
- `layers/*.json` — the full layer tree per PSD: every layer's bbox, visibility,
  opacity, blend mode, text runs, fills and effects.
- `img/*.jpg` — a flattened render of each PSD, at most 1600 px.

Coordinates are canvas pixels. Frames at 640×1136 / 1136×640 are iPhone 5 @2x
(halve for points); 1242×2208 / 2208×1242 are iPhone 6 Plus @3x. Most files are
multi-frame boards rather than single screens.

### What the files say, in short

- **Palette** (from `ui.psd`, the style sheet): yellow `#FFDB3C`, blue `#1159F0`,
  red `#E7583F`, teal `#4FBAA7`, greys `#E9E9E9` / `#C2C2C2`, black, white.
- **Type:** Univers Condensed (Light / Regular / Bold) on the 2015 screens, Roboto
  Condensed on the 2014 ones. Univers is a commercial font; Roboto is Apache-2.0.
- **Landscape table** for 2–10 players, the chip tray (5/25/100/500/1000), winner
  select, passing admin rights, player statuses, What Hand Wins, lobby, create
  wizard (game type → rebuys → payouts), registration, side menu, splash.
- Prompt text in the table frames is Lorem ipsum. The native client's strings
  files hold the real copy.

### Limits of the extraction

- Fill colours come from solid-fill shape layers only. Gradients and bitmap
  layers are in the JSON as effects/raw values, not resolved to tokens.
- Font sizes are as set in Photoshop, multiplied by the layer's vertical
  transform. Check against a render before trusting one to the pixel.
- The player photos in the table frames look like real people. Don't ship them.
