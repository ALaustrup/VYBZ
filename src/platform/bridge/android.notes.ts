/**
 * Capacitor Android bridge notes — Phase 6 / Masterplan 2.A
 *
 * - Seed: repo-root `android/` + `capacitor.config.ts` (`cloud.vybz.app`)
 * - Bridge: `src/platform/bridge/android.ts` (`createAndroidBridge`)
 * - Detection: `detectPlatformKind()` via Capacitor native + android platform
 * - Scripts: `npm run sync:android` · `npm run build:android:apk` · `smoke:android:apk`
 * - Deep links: `vybz://release/{id}` + https App Links intent-filters
 * - Push: local FCM token registration only (no server send)
 * - Signing: see `docs/operations/ANDROID_RELEASE.md` — never commit keystores
 */
export const ANDROID_BRIDGE_PHASE = "6-alpha" as const;
