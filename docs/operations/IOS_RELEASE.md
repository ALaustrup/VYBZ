# iOS Release — VYBZ Alpha (TestFlight)

**Bundle ID:** `cloud.vybz.app` · **Version:** 1.1.0 (build 119)

> **Status (2026-07-30): DEFERRED.** Phase 19 code + CI are on `main` (`v1.1.0-beta1A-phase19`).
> Live TestFlight is parked until Apple Developer Program (~$99/yr) and signing secrets
> are provisioned. Unsigned CI continues to record a `toolchain_missing` stub — that is OK.
> Resume via Opportunity Register **OR-012**. Do not block Suite / UI-polish work on this.

## Resume when ready (owner)

1. Enroll Apple Developer Program; create Distribution cert + App Store profile for `cloud.vybz.app`.
2. GitHub → Settings → Secrets → Actions — add:

| Secret | Value |
|--------|--------|
| `IOS_CERT_BASE64` | Base64 of Apple Distribution `.p12` |
| `IOS_CERT_PWD` | Password for the `.p12` |
| `IOS_PROV_PROFILE_BASE64` | Base64 of `.mobileprovision` |
| `APPLE_TEAM_ID` | 10-char team ID |

3. Replace `TEAMID` in `public/.well-known/apple-app-site-association` → commit + redeploy Vercel.
4. Re-run `.github/workflows/ios.yml` (or empty commit) → IPA → TestFlight Internal.
5. Smoke: launch UI · `vybz://release/123` · background upload.

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
