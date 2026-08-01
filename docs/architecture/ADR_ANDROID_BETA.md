# ADR-027 — Android Beta / Play-Store readiness

**Status:** Accepted  
**Date:** 2026-07-30  
**Phase:** 13 (Beta-1A)

## Context

Phase 6 shipped Capacitor Android alpha (`cloud.vybz.app`) with debug APK
smoke, local FCM stub, and `vybz://` intents. Desktop Beta (Phase 12) established
signed channel + CI artefact + updater patterns. Android needs the same for
Play closed/beta testing.

## Decision

1. **Artefact:** Release **AAB** via `./gradlew bundleRelease` (AGP task; not
   `assembleReleaseBundle`). Hash table:
   `android/signing/ANDROID_BUNDLES.json`.
2. **Signing:** Upload keystore from GH secrets
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PWD`, `KEY_ALIAS`,
   `KEY_ALIAS_PWD` → ephemeral `android/key.properties` on CI. Never commit.
3. **In-app updates:** Native `VybzAppUpdate` plugin → Play Core **flexible**
   updates on the **beta** track; TS
   [`src/platform/android/inAppUpdate.ts`](../../src/platform/android/inAppUpdate.ts).
4. **Sealed prefs:** `VybzSecureStore` uses Android KeyStore via
   EncryptedSharedPreferences (AES256-GCM); app seal layer remains
   `createSecurePreferences`.
5. **Metadata:** Fastlane-compatible strings under
   `play/fastlane/metadata/android/en-US/`; Data safety YAML at
   `docs/compliance/google-play-data-safety.yml`.
6. **Detox:** Device Detox remains optional; Vitest contract under
   `src/platform/android/offline-sync.contract.test.ts` is the merge gate.

## Consequences

- CI job `.github/workflows/android.yml` builds AAB on PR/main/phase13 tags.
- Sideload / unsigned CI still produces an AAB when secrets are absent.
- Push Notifications package is optional at runtime; missing
  `google-services.json` → permission `unavailable`.

## Related

- [`ADR_ANDROID_CAPACITOR.md`](./ADR_ANDROID_CAPACITOR.md) (ADR-012 / ADR-019)
- [`PHASE13_EXIT_GATE.md`](../archive/suite-phases-2026/PHASE13_EXIT_GATE.md)
- [`ANDROID_RELEASE.md`](../operations/ANDROID_RELEASE.md)
