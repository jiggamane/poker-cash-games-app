# 15 · Screen geometry, sheets and other resolutions

Reference device changed on 18 Aug 2026. Every board frame was 402 × 874 (iPhone 16 **Pro**).
All boards are now drawn at **393 × 852** — the standard iPhone (16, 15, 14, 13) — so a build
that matches the drawing 1:1 on the base device is guaranteed to fit the larger ones.

Everything below is in **points**. Board pixels = points.

---

## 1 · The frame

| | value |
|---|---|
| Screen | 393 × 852 |
| Screen corner radius | 46 |
| Board bezel (drawing only) | 11 pad, radius 57, width 415 |
| Top safe inset assumed | 59 (Dynamic Island) — 47 on notch phones |
| Bottom safe inset assumed | 34 |
| Usable height | 852 − 59 − 34 = **759** |

The status row in the boards (time + battery, `padding: 20 30 0`, time 15/600, battery 13/400)
is a **drawing of the system status bar**. Do not build it. Content begins under the top inset.

## 2 · The root screen (home, group, sessions, stats)

```
top inset ........................ 59
title block ...................... 96   ← 26 top pad, h1 30/800 (line 1.0), 8 sub-line, 13/500
content .......................... flexible
dock / footer .................... 62   ← pills 44 tall + 14 bottom pad
home indicator band .............. 22   ← 8 top pad, bar 140 × 5 r3, 9 bottom pad
```

* Side margin: **20** for card stacks, **22** for plain rows and body text.
  (Cards carry 16 inner padding, so 20 + 16 reads optically the same as a 22 row.)
* Rows are **intrinsic height** (≈74 for a two-line row). Never stretch a row to fill.
* All vertical slack goes into **one** flexible spacer, between the last row and the dock.
* Minimum hit target 44.

## 3 · The sheet

Every modal in the app is the same object. These numbers are the spec.

| part | value |
|---|---|
| Corner radius | 26 26 0 0 |
| Top hairline | 1px, `rgba(255,255,255,.11)` dark / `rgba(12,13,15,.1)` light |
| Grabber row | padding 9 0 2, bar 38 × 5 r3, `rgba(255,255,255,.22)` / `rgba(12,13,15,.18)` |
| Header row | padding 12 22 · title 32/800 line 1.05 tracking −.03em · close 30 circle, glyph 12, stroke 2.6 |
| Header bottom pad | **8** when a subhead follows, **14** when the body follows directly |
| Subhead | margin 0 22 14 · 13.5/400 line 1.5 · muted |
| Body — rows | margin 0 22 · row padding 15 4 · 1px hairline between |
| Body — cards | margin 0 20 · gap 10 · card padding 14 16 · radius 14 |
| Chips | padding 7 10 · radius 6 · 11/700 tracking .06em |
| Toggle | track 44 × 26 r13, pad 3, knob 20 |
| Footer | `margin-top:auto` · padding 14 20 6 · button padding 17 0 · radius 8 · 17/700 |
| Secondary button | same box, 2px border instead of fill |
| Home indicator | padding 8 0 9 · bar 140 × 5 r3 |

Reserved bottom block (footer + indicator) = **82**. Body height available in a
peek sheet = 852 − 59 (peek top) − 82 ≈ 711 minus header.

**A sheet never scrolls as a whole.** If the body does not fit, the sheet becomes
full-height (top edge at inset + 10) and only the **body** scrolls; grabber, header
and footer stay put.

## 3b · Surfaces, and what white means in the light theme

Three levels, in both themes. The light theme is **not** "white everywhere" — white is what
raises a surface, so a screen with a raised panel needs a grey base for the panel to read against.

| level | dark | light |
|---|---|---|
| Base (screen) | `#0C0D0F` / `#0A0A0B` | **`#FFFFFF`** on a plain push screen · **`#F4F4F6`** on any screen carrying a sheet or drawer |
| Raised panel — sheet, drawer, card stack | `#101013` | `#FFFFFF` |
| Card / field inside a panel | `#16161A` | `#F4F4F6` |
| Chip / stepper inside a card | `#26262B` | `#E8E8ED` |
| Hairline | `rgba(255,255,255,.11)` | `rgba(12,13,15,.1)` |

Rule: **no surface ever sits on a surface of its own colour.** A white card on a white sheet
becomes a grey card; a grey card on a grey base becomes a white card. Checked mechanically —
resolve each element's background against its nearest painted ancestor and assert they differ.

## 4 · Rules for other resolutions

1. **Type never scales with the screen.** The scale in `07-design-tokens.md` is fixed.
2. **Side margins never scale.** 20 / 22 at every width. Wider phones get wider content, not wider gutters.
3. **Vertical difference goes to the one flexible spacer.** Nothing redistributes into rows, cards or gaps.
4. **Lists scroll, sheets fit.** A clipped list is correct. A clipped sheet is a bug.
5. **Footer block is pinned, always 82.** It is never scrolled away and never overlapped by the keyboard — see 6.
6. **Keyboard / keypad up:** the footer block rises with it and sits directly on the keyboard's top edge; body compresses (spacer collapses first, then the list scrolls). Money entry uses a **digits-only** keypad.
7. **Below 700 points of height** (SE, mini) every peek sheet promotes to full-height.

### Worked examples

| device | screen | insets t/b | usable | home rows visible (74) | sheets |
|---|---|---|---|---|---|
| iPhone SE 3 | 375 × 667 | 20 / 0 | 647 | 6 | all full-height |
| 13 mini | 375 × 812 | 50 / 34 | 728 | 7 | peek allowed |
| **16 / 15 / 14 — reference, and the only device the test round runs on** | **393 × 852** | **59 / 34** | **759** | **8** | peek allowed |
| 16 Pro | 402 × 874 | 62 / 34 | 778 | 8 | peek allowed |
| 16 Pro Max | 430 × 932 | 62 / 34 | 836 | 9 | peek allowed |

Home rows visible = usable − title 96 − dock 62, divided by 74.
The count changing between devices is expected. A row rendering at a *different height*
between devices is a bug.

## 5 · Acceptance checks

Run these against the built screen at 393 × 852, both themes:

1. No screen scrolls as a whole. Only lists scroll.
2. Footer button's bottom edge sits 28 above the screen bottom; indicator band below it.
3. Every sheet's grabber, header, footer and indicator match §3 to the point.
4. Rows measure the same on SE and Pro Max; only the count differs.
5. Nothing sits under the status bar or the home indicator.
6. Text never breaks mid-word. Titles and pills are `flex:none` + `nowrap`; only a start time may truncate.
7. Keypad up: footer button visible and tappable, body compressed, digits only.
8. Light theme: home indicator is `rgba(12,13,15,.85)`, never white on white.
9. **Accent text meets 4.5:1 against its own background in both themes.** The dark mint `#6FCF97`
   and dark amber `#E8B455` are dark-theme values only — light uses `#0A7A3D` and `#7A5410`.

## 6 · What changed in the boards on this pass

* All 130+ frames retargeted 402 × 874 → 393 × 852.
* `E3 Deductions` / `E3b`: the preview table was 29 over. Row padding 5 → 3, block padding 10/9 → 8/7. Fits with the Confirm button visible.
* `C7 Settlement due`: 19 over. Option rows 14 → 11, plain-words card 16 → 13.
* `P1 Membership`: 10 over. Tier cards 18 → 15, note 16 → 13.
* 24 missing light frames generated (list in `CC-HANDOUT.md`).
* 66 light frames had a white-on-white home indicator. Fixed to `rgba(12,13,15,.85)`.
* 13 light frames still carried dark-theme accents (mint `#6FCF97` at 1.73:1, amber `#E8B455` at 1.89:1). Mapped to `#0A7A3D` and `#7A5410`.
