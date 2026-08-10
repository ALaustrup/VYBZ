/**
 * Capacitor Android bridge notes — Phase 13 / Play-Store readiness
 *
 * - Seed: repo-root `android/` + `capacitor.config.ts` (`cloud.vybz.app`)
 * - Bridge: `src/platform/bridge/android.ts` (`createAndroidBridge`)
 * - KeyStore prefs: `VybzSecureStore` + `src/platform/android/keystorePreferences.ts`
 * - In-app update: `VybzAppUpdate` flexible / beta track
 * - Scripts: `npm run sync:android` · `build:android:aab` · `smoke:android:aab`
 * - Deep links: `vybz://release/{id}` + https App Links intent-filters
 * - Push: FCM token registration (+ optional onRegistered server hook)
 * - Signing: ANDROID_KEYSTORE_* GH secrets — never commit keystores
 * - M9 playback: dry HTMLAudioElement via AudioBus; `bindPlaybackLifecycle` pauses on
 *   Capacitor appStateChange / bfcache pagehide and resumes only if it paused.
 *   `PlaybackCapabilities.audioFocus` remains false until a native AudioManager
 *   adapter is authorised and measured on device (do not claim call-interrupt focus).
 */
export const ANDROID_BRIDGE_PHASE = "13-beta" as const;
