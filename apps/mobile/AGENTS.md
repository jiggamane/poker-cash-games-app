# This app is on Expo SDK 57

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing any code. Expo's API changes between SDK versions, and guessing from a
different version's docs produces code that does not run.

**Do not upgrade the SDK casually.** The version is pinned to whatever Expo Go
in the App Store supports. Moving ahead of it means the app can no longer be
opened by scanning a QR code, and testing then requires a paid Apple Developer
account to install a development build.

**And do not fall behind it either, which is how this file was wrong.** It said
SDK 54 until 5 September, by which time Expo had shipped 55, 56 and 57. Expo Go
is one fixed native build that supports the current SDK, so a repo three
versions back is not conservatively pinned — it is a repo no phone in the App
Store can open. The rule is *match* Expo Go, in both directions, and the cost of
being behind is silent: `exposdk:` mismatches are refused with nothing on the
screen (`docs/live-test.md`).

So when this file and the App Store disagree, check which way round it is before
concluding the pin is protecting anything.

Every dependency version in `package.json` comes from SDK 57's own
`bundledNativeModules.json` — read it out of the installed `expo` package, at
`node_modules/expo/bundledNativeModules.json`. Bump them together, from that
manifest, or not at all.

`app.config.js` stamps `exposdk:57.0.0` for the Expo Go publish, and that line
moves in the same commit as the SDK or the publish breaks silently.

## What SDK 57 changed under us, 54 → 57

- **The `expo-*` packages are on the SDK's own version number now.** They read
  `~57.x` rather than a version apiece, which is why the diff looks larger than
  it is.
- **React Native 0.81 → 0.86.** `StyleSheet.absoluteFillObject` is gone;
  `StyleSheet.absoluteFill` is the spreadable object it used to be, and the
  three call sites (`Dock`, `HoldButton`, `Sheet`) were renamed to it.
- **React 19.1 → 19.2**, with `@types/react` moved to match.
