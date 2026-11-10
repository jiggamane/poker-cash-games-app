# TestFlight — getting the iPhone app to testers

The repository side is `.github/workflows/testflight.yml` (**Actions → Put the
app in TestFlight → Run workflow**). It runs `npm run check`, builds the app on
Expo's macOS machines and submits it to App Store Connect. No Mac needed.

Three things only the owner can do, because they are signing in to Apple.
Steps 1 and 2 happen once; step 3 is every build.

## 1 · App Store Connect (browser, once)

1. <https://appstoreconnect.apple.com> → **Apps → + → New App**.
   - Platform iOS · Name *The Poker Club* (if taken, pick the fallback —
     `app-store-launch.md` A8) · Language English · Bundle ID
     **`com.pokerclub.app`** · SKU anything, e.g. `pokerclub`.
   - If the bundle ID is not in the list, register it first at
     <https://developer.apple.com/account/resources/identifiers/add/bundleId>
     (App IDs → App → explicit `com.pokerclub.app`).
2. Open the new app → **App Information** → copy **Apple ID** (a number like
   `6740000000`).
3. GitHub → this repo → **Settings → Secrets and variables → Actions →
   Variables → New repository variable**: `ASC_APP_ID` = that number.

The secrets `EXPO_TOKEN`, `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` are the ones `expo-go.yml` already uses; nothing
new there.

## 2 · Signing credentials on expo.dev (a computer, once, ~5 minutes)

EAS will not create an Apple distribution certificate without a person signed
in to Apple, so this one step is interactive. Any computer with Node 22 —
Windows and Linux are fine:

```bash
git clone https://github.com/jiggamane/poker-cash-games-app && cd poker-cash-games-app && npm ci
```

```bash
cd apps/mobile && EAS_PROJECT=build npx eas-cli@latest credentials -p ios
```

Log in to Expo as **decusgames** when asked, choose the **production** profile,
log in with the Apple ID of the developer account (2FA code on your phone), and
then:

- **Build Credentials → All: Set up all the required credentials** — creates the
  distribution certificate and the App Store provisioning profile.
- **App Store Connect: Manage your API Key → Set up your project to use an API
  Key for EAS Submit** — let it generate one.

Both are stored on expo.dev; the workflow reuses them from then on. A
certificate lasts a year.

## 3 · Build (phone or browser, every time)

GitHub → **Actions → Put the app in TestFlight → Run workflow**. About 15–25
minutes. When green, Apple processes the build for another 5–30 minutes, then:

- **Internal testers** (up to 100 people on your App Store Connect team, no
  review): App Store Connect → Users and Access → add them, then TestFlight →
  Internal Testing → + group → add testers and the build.
- **External testers** (anyone, by email or a **public link**): TestFlight →
  External Testing → + group → add the build. The first build of each version
  goes through Beta App Review (about a day), which asks for a sign-in for the
  reviewer — the same open question as `app-store-launch.md` A4/D3.

Testers install the **TestFlight** app from the App Store and accept the
invite or open the link.

Build numbers increment on Expo's side (`appVersionSource: remote`), so every
run is a new TestFlight build of version 0.1.0 without touching the repo.

## Known gaps in these builds

Fine for friends, not yet for a public link — `app-store-launch.md` §2 has the
full list. The ones a tester will notice: the seeded demo night on first launch
(A7), the default Expo splash (B4), and `pokerclub://auth-callback` must be on
the Supabase redirect allow-list or magic-link sign-in returns to the wrong
place (B2).
