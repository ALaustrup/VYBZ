# iOS Release — VYBZ Alpha (TestFlight)

**Bundle ID:** `cloud.vybz.app` · **Version:** 1.1.0 (build 119)

## Local (macOS)

```bash
npm run ios:sync          # build web + cap sync ios
npm run ios:open          # Xcode
npm run build:ios         # archive helper
npm run smoke:ios:ipa     # write ios/signing/IOS_BUILDS.json
```

## CI

Workflow: `.github/workflows/ios.yml` (`macos-15`).

Without signing secrets, the job records a `toolchain_missing` stub (merge still OK).
With secrets, archives → exports IPA → uploads artefact → on phase19 tag, fastlane TestFlight.

## Deep links

| Kind | Example |
|------|---------|
| Custom | `vybz://release/{id}` |
| Universal | `https://vybz.cloud/release/{id}` |

Host files:

- `public/.well-known/apple-app-site-association` (set real Team ID)
- `public/.well-known/assetlinks.json` (Android twin; set cert fingerprint)

## Push

Capacitor Push Notifications → `registerDeviceToken({ platform: "ios" })`.
APNs capability via `App.entitlements` (`aps-environment`).

## Secure prefs

Native Keychain plugin `VybzSecureStore` + TS seal in
`src/platform/ios/keychainPreferences.ts`.

## Background uploads

`VybzBackgroundUpload` schedules `URLSession` background uploads; UI at `/mobile/uploads`.
