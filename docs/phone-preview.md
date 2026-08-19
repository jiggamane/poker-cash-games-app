# Seeing the app on a phone, without the machine that builds it

`dev-setup.md` says: run `npm start`, scan the QR code. That is the right loop
and it stays the right loop — but it needs the computer running the dev server
to be on, awake, and on the same wifi as the phone. Away from it, the QR code is
worth nothing.

So the app is also published to the web on every merge, and that copy needs
nothing but a phone:

**<https://jiggamane.github.io/poker-cash-games-app/app/>**

The design boards keep the address they always had, one level up, at
<https://jiggamane.github.io/poker-cash-games-app/>.

## It rebuilds itself

`.github/workflows/pages.yml` runs on every push to `main`. It runs
`npm run check` first — the same gate as a merge, because a preview that settles
a night wrongly is worse than no preview — then exports the app for the browser
and republishes. Nothing to run, nobody to ask. **A merge to `main` is on that
URL a few minutes later**, which is the point: work finished while you are out
is testable while you are out.

Nothing else about the repo changes. `npm start` and Expo Go are untouched, and
so is `npm run ui`.

## Put it on the home screen

In Safari or Chrome, share → **Add to Home Screen**. It then opens without a
browser bar, full-bleed under the notch, at the size the screens were drawn. The
navigation is the whole design here — a sheet has to *look* like a sheet — and a
browser's own chrome on top of Chrome A and Chrome B tells you nothing true.

On an iPhone the type is right: the design's font stack starts at
`-apple-system`, which in Safari is SF Pro, the face the boards were drawn in.
On Android and on a desktop browser it falls back, and the type is close but not
the drawn thing.

## What this copy cannot tell you

It is the real app — the same screens, the same components, the same
`@poker-club/core` doing the arithmetic. Four things differ, and all four are
the browser, not the code:

- **Nothing is kept.** On the web the database is opened `:memory:`
  (`src/lib/nightStore.ts` says why), so a reload starts again from the seeded
  canonical night. Fine for walking a night through; useless for "is it still
  there tomorrow". A real build is the only answer to that one.
- **Sign-in and sync are off** unless `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set as repository secrets — Settings →
  Secrets and variables → Actions. Both are safe to publish
  (`apps/mobile/.env.example` explains why), and the next merge picks them up.
  Without them the app is on-device only, which is a mode worth testing anyway.
- **Native gestures are not native.** Swipe-down-to-dismiss on a sheet, the back
  gesture, and anything that asks the OS for something — screen brightness for
  the QR code, keep-awake during a night — are stubs or absent in a browser.
- **A reload away from the root is a 404.** The export is one page and the
  router reads the URL after it boots; a static host has no `/app/session` to
  serve. Open the root and navigate in the app. Add-to-Home-Screen always opens
  the root, so this stops mattering once it is on the home screen.

## When a real build is wanted

Everything above is a preview. The app on a phone, keeping its data, is an
**EAS build** — cloud-built, so still no Mac and no Xcode:

- **Android** is the short path: `eas build --profile preview --platform android`
  produces an APK that installs from a link. It needs an Expo account, and
  `EXPO_TOKEN` as a repository secret is what would let this repo build one
  without anybody at a keyboard.
- **iOS** needs a paid Apple Developer account before a build can be installed
  on a phone at all — cloud-built or not. There is no way around that one.

Both also need the three lines `apps/mobile/app.json` is deliberately holding
back — the EAS project id, `updates.url` and `runtimeVersion` — which the file
says to restore together with the first real build. Read that note before
running `eas build`; it explains what each one breaks in Expo Go.
