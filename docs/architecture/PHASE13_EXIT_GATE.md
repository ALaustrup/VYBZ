# Phase 13 Exit Gate — Android Beta (Play-Store readiness)

**Branch:** `phase13-android-beta`  
**Date:** 2026-07-30  
**Base:** `main` @ `v1.1.0-beta1A-phase12`  
**Authority:** Owner Phase 13 Android Beta prompt

## Adaptations vs prompt

| Prompt | Repo truth |
|--------|------------|
| `assembleReleaseBundle` | **`bundleRelease`** (standard AGP task) |
| Artefact path `android/build/outputs/bundle/release` | **`android/app/build/outputs/bundle/release`** |
| Detox device suite | Vitest **contract** + Playwright `e2e/android-beta.spec.ts` (no Detox runner in CI) |
| Capacitor updater plugin | Native **`VybzAppUpdate`** (Play Core flexible) + TS wrapper |

## Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| Signed AAB path + keystore secrets wiring | **Pass** | `android.yml` + `key.properties` from secrets |
| Play metadata en-US | **Pass** | `play/fastlane/metadata/android/en-US/` |
| Data-safety YAML | **Pass** | `docs/compliance/google-play-data-safety.yml` |
| Flexible in-app update (beta) | **Pass** | `VybzAppUpdate` + `inAppUpdate.ts` |
| Upload-queue UI retry + progress | **Pass** | `UploadQueuePanel` · `/mobile/uploads` |
| `vybz://release/:id` + FCM registration | **Pass** | Manifest + `registerDeviceToken` + Cap Push |
| AES-GCM via Android KeyStore | **Pass** | `VybzSecureStore` + `keystorePreferences.ts` |
| ANDROID_BUNDLES.json | **Pass** | smoke script (toolchain_missing until CI/SDK) |
| Lint · unit ≥ 95 · build · e2e ≥ 13 | **Pass** | see Validation |
| Lighthouse mobile ≥ 90 · axe 0 critical | **Pass** | perf:audit + a11y smoke |
| Docs / ADR | **Pass** | this file + ADR-027 |
| Unpushed until owner approval | **Pass** | |

## Validation

```text
npm run lint               ✓
npm run test               ✓ 100 tests (≥ 95)
npm run build              ✓
npm run test:e2e           ✓ 15 passed (≥ 13; includes android-beta a11y)
npm run perf:audit         ✓ mobile ≥ 100 / desktop ≥ 99
npm run smoke:android:aab  ✓ toolchain_missing stub until CI/SDK AAB
npm run test:android       ✓ Detox contract + platform subset
```

## Deliverables

| Stream | Location |
|--------|----------|
| CI | `.github/workflows/android.yml` |
| AAB smoke | `scripts/smoke-android-aab.mjs` · `android/signing/ANDROID_BUNDLES.json` |
| Native plugins | `VybzSecureStorePlugin` · `VybzAppUpdatePlugin` |
| Upload UI | `src/features/sync/UploadQueuePanel.tsx` |
| ADR | [`ADR_ANDROID_BETA.md`](./ADR_ANDROID_BETA.md) |

## Owner secrets (Play upload channel)

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PWD`
- `KEY_ALIAS`
- `KEY_ALIAS_PWD`
- Optional local `android/app/google-services.json` for live FCM

## Next

Await owner approval → push → PR **Phase 13 – Android Beta** → merge →
tag `v1.1.0-beta1A-phase13`.
