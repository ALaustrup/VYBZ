/**
 * Capacitor Android bridge notes — Phase 1.5
 *
 * - Seed: repo-root `android/` + `capacitor.config.ts` (`cloud.vybz.app`)
 * - Bridge: `src/platform/bridge/android.ts` (`createAndroidBridge`)
 * - Detection: `detectPlatformKind()` via Capacitor native + android platform
 * - Scripts: `npm run sync:android` · `npm run dev:android` · `npm run build:android:apk`
 *
 * Phase 2.A: document picker, secure storage plugin, App Links, push foundation.
 */
export const ANDROID_BRIDGE_PHASE = "1.5-stub" as const;
