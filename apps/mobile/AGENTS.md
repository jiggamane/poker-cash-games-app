# This app is on Expo SDK 54

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code. Expo's API changes between SDK versions, and guessing from a
newer version's docs produces code that does not run.

**Do not upgrade the SDK casually.** The version is pinned to whatever Expo Go
in the App Store supports — at the time of writing, Expo Go 54.0.2. Moving ahead
of it means the app can no longer be opened by scanning a QR code, and testing
then requires a paid Apple Developer account to install a development build.

Every dependency version in `package.json` comes from SDK 54's own
`bundledNativeModules.json`. Bump them together, from that manifest, or not at
all.
