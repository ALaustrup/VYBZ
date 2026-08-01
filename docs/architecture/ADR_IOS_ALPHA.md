# ADR-033 — iOS Alpha (Capacitor + TestFlight)

**Status:** Accepted  
**Date:** 2026-07-30  
**Phase:** 19 (Beta-1A)

## Context

Android Capacitor (`cloud.vybz.app`) shipped in Phases 6/13. iOS needs the same
shared SPA wrapped for TestFlight, with Keychain-backed prefs, APNs push,
`vybz://` + Universal Links, and background-safe uploads.

## Decision

1. **Shell:** Capacitor 8 `ios/` project — same `dist/` webDir as Android.
2. **Signing:** CI secrets `IOS_CERT_BASE64`, `IOS_CERT_PWD`, `IOS_PROV_PROFILE_BASE64`
   (+ optional ASC API key / `APPLE_ID` for TestFlight).
3. **CI:** `.github/workflows/ios.yml` on `macos-15` — archive → IPA →
   `IOS_BUILDS.json` → TestFlight on `v1.1.0-beta1A-phase19*` tags.
4. **Security:** Native `VybzSecureStore` (Keychain) + shared AES-GCM seal
   (`createIosSecurePreferences`).
5. **Uploads:** Shared TS `uploadQueue` + Cap `VybzBackgroundUpload`
   (URLSession background configuration).
6. **Links:** Info.plist URL types (`vybz`); Associated Domains
   `applinks:vybz.cloud`; host AASA at `/.well-known/apple-app-site-association`.
7. **Testing:** Vitest Detox **contracts** + Playwright `e2e/ios-alpha.spec.ts`
   (no Detox runner in CI until device farm).

## Non-goals

- App Store production submit (TestFlight alpha only)
- StoreKit IAP / AI minute packs via Apple (Stripe web remains)
- React Native rewrite

## Related

- [`PHASE19_EXIT_GATE.md`](../archive/suite-phases-2026/PHASE19_EXIT_GATE.md)
- [`IOS_RELEASE.md`](../operations/IOS_RELEASE.md)
- Prior: ADR-012 Android Capacitor · ADR-027 Android Beta
