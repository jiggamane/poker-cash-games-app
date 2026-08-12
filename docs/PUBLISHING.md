# Publishing the design boards

Four self-contained HTML files, served as a static site from this folder.

They need no build step, no server-side anything, and no network at runtime — fonts,
scripts and styles are inlined. Treat them as build artifacts: **never hand-edit them.**
They are regenerated wholesale from the design source (`design/*.dc.html`) when the design
changes.

## The files

| File | What it is | Size |
| --- | --- | --- |
| `index.html` | The index. Every screen listed in the order it is met, plus the assumptions the set is drawn around. **This is the entry point.** | 168 KB |
| `before.html` | Before the night — home, groups, membership, the group, opening a night. 28 screens. | 525 KB |
| `night.html` | The night — the live session and everything that writes to the ledger. 16 screens. | 386 KB |
| `after.html` | After the night — the close, and the view from outside. 10 screens. | 351 KB |

Total ~1.4 MB. They cross-link by relative filename, so **keep all four in the same
directory and keep the names exactly as they are.**

## How this repo serves them

GitHub Pages, in **branch mode**, pointed at this repository's `/docs` folder. That puts
`index.html` at the site root, so the link is short enough to paste into a message:

```
https://jiggamane.github.io/poker-cash-games-app/
```

with the rest at `/before.html`, `/night.html`, `/after.html`.

To turn it on (one time, in the GitHub UI):

1. **Settings → Pages**
2. **Source:** *Deploy from a branch*
3. **Branch:** the branch holding these files, **Folder:** `/docs`
4. **Save.** First build takes a minute or two.

`.nojekyll` sits beside the boards so Pages copies the files through untouched instead of
running them past Jekyll.

Nothing here is specific to GitHub Pages — Netlify, Vercel, Cloudflare Pages, or an S3
bucket with public read all work the same way. Serve the folder, no framework preset, no
redirects, no rewrites, no trailing-slash rules. Four files, served as-is.

## What to know before looking at them

- **The boards are wider than a viewport by design.** Colleagues pan horizontally. Section
  headers and lane titles stick to the left edge so they stay readable while panning.
- **Every screen is drawn twice** — dark above, light below. That is intentional, not a
  duplicate.
- Each screen is 402 × 874, iPhone logical points, at ship size.
- The nav row at the top of each board moves between the four.

## When the design changes

Regenerate rather than patch. The source lives in `design/` as `.dc.html` files; the
published files are produced from them with the cross-links rewritten to `index.html` /
`before.html` / `night.html` / `after.html`. Replace all four together — the index quotes
screen counts that the boards must agree with.

## Access

Pages on a public repository is public, and these contain the product design in full.
There is no unlisted tier: anyone who finds the URL can read them. If that matters, host
them somewhere with basic-auth or a Cloudflare Access rule instead — nothing in the files
depends on being public.
