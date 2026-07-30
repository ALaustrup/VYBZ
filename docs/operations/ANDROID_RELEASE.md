# Android release guide (Phase 13 / Play-Store readiness)

**Product:** VYBZ for Android · `applicationId` / `appId` **`cloud.vybz.app`** ·
version **1.1.0** (`versionCode` **113**)  
**Exit gate:** [`docs/architecture/PHASE13_EXIT_GATE.md`](../architecture/PHASE13_EXIT_GATE.md)  
**ADR:** [`ADR_ANDROID_BETA.md`](../architecture/ADR_ANDROID_BETA.md)

## Build

```bash
npm run build:web
npm run sync:android          # Capacitor copy + update
npm run build:android:apk     # assembleDebug
npm run build:android:aab     # bundleRelease (signed if key.properties present)
npm run smoke:android:apk     # debug APK hash
npm run smoke:android:aab     # release AAB → ANDROID_BUNDLES.json
```

Artifacts:

- Debug APK: `android/app/build/outputs/apk/debug/*.apk`
- Release AAB: `android/app/build/outputs/bundle/release/*.aab`
- Hash tables: `android/signing/APK_HASHES.json`, `ANDROID_BUNDLES.json`

## Signing (CI / Play)

GitHub Actions secrets (never commit):

| Secret | Role |
|--------|------|
| `ANDROID_KEYSTORE_BASE64` | Upload keystore (.jks/.keystore) base64 |
| `ANDROID_KEYSTORE_PWD` | Keystore password |
| `KEY_ALIAS` | Key alias |
| `KEY_ALIAS_PWD` | Key password |

Local: copy `android/key.properties.example` → `android/key.properties` (gitignored).

## In-app updates

Flexible Play Core updates via `VybzAppUpdate` plugin. Prompt UI:
`InAppUpdateBanner` on `/mobile/uploads` when beta track has an available build.

## Deep links

| Scheme | Example |
|--------|---------|
| Custom | `vybz://release/{id}` |
| HTTPS | `https://vybz.cloud/release/{id}` |

## Push (FCM)

- `@capacitor/push-notifications` + `registerDeviceToken`
- Requires local `android/app/google-services.json` (not committed)
- Optional `onRegistered` hook for server POST

## Offline / upload queue

- Sealed prefs: Android KeyStore (`VybzSecureStore`) + AES-GCM app seal
- UI: `/mobile/uploads` · `UploadQueuePanel` (retry + progress)

## Play Console

- Listing copy: `play/fastlane/metadata/android/en-US/`
- Data safety: `docs/compliance/google-play-data-safety.yml`
- Track: **beta** (closed testing) before production staged rollout
