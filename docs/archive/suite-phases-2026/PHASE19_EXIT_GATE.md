> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Phase 19 Exit Gate — iOS Alpha (Capacitor + TestFlight)

**Branch:** `phase19-ios-alpha`  
**Date:** 2026-07-30  
**Base:** `main` @ `v1.1.0-beta1A-phase18`  
**Authority:** Owner Phase 19 iOS Alpha prompt

## Adaptations vs prompt

| Prompt | Repo truth |
|--------|------------|
| Detox device suite | Vitest **contract** + Playwright `e2e/ios-alpha.spec.ts` (no Detox runner in CI) |
| Jest Keychain | Vitest `keychainPreferences.test.ts` (AES-GCM seal + memory Kv) |
| Firebase device tokens | Cap Push → `registerDeviceToken({ platform: "ios" })` (APNs); FCM optional later |
| IPA hash file | `ios/signing/IOS_BUILDS.json` via `smoke:ios:ipa` |

## Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| Capacitor `ios/App` + `ios:build` scripts | **Pass** | `cap add ios` · package.json |
| Signing secrets wiring | **Pass** | `ios.yml` · IOS_CERT_* |
| CI archive / IPA + TestFlight on tag | **Pass** | `.github/workflows/ios.yml` · fastlane |
| Push + `vybz://` + Universal Links | **Pass** | entitlements · AASA · PlatformProvider |
| Background upload (URLSession plugin) | **Pass** | `VybzBackgroundUpload` + upload queue |
| AES-GCM Keychain prefs | **Pass** | `VybzSecureStore` · `keychainPreferences.ts` |
| IOS_BUILDS.json | **Pass** | smoke script (toolchain_missing until mac CI) |
| Docs / ADR-033 | **Pass** | this file + `ADR_IOS_ALPHA.md` |
| Unpushed until owner approval | **Pass** | |

## Validation (2026-07-30 local)

```text
npm run lint               ✓
npm run test               ✓ 141 tests (≥ 140)
npm run build              ✓
npm run test:e2e           ✓ 26 passed (≥ 24; ios-alpha + a11y)
npm run smoke:ios:ipa      ✓ toolchain_missing stub → IOS_BUILDS.json
npm run test:ios           ✓ Detox contract + Keychain AES-GCM
npm run perf:audit         ✓ mobile ≥ 100 / desktop ≥ 99
```

## Owner secrets

| Secret | Role |
|--------|------|
| `IOS_CERT_BASE64` | Distribution .p12 |
| `IOS_CERT_PWD` | p12 password |
| `IOS_PROV_PROFILE_BASE64` | App Store provisioning profile |
| `APPLE_TEAM_ID` | Team ID (signing + AASA TEAMID placeholder) |
| `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` | Optional TestFlight |
| `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_CONTENT` | Preferred ASC API key (base64) |

Replace `TEAMID` in `public/.well-known/apple-app-site-association` before prod Universal Links.

## Follow-up — TestFlight deferred (OR-012)

Live signing / TestFlight / AASA Team ID **paused** (Apple Developer cost). Phase 19 code exit remains satisfied.
Resume from [`IOS_RELEASE.md`](../operations/IOS_RELEASE.md) when owner budgets Apple membership.
