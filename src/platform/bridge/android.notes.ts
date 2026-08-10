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
 * - M9 audio focus (authorised 2026-08-10): native `VybzAudioFocus` plugin
 *   (`AudioManager` / `AudioFocusRequest`) + `bindAudioFocus` → dry pause/resume.
 *   Transient loss pauses (no duck DSP). `PlaybackCapabilities.audioFocus` is true
 *   only when the native plugin reports available. Hardware call-interrupt smoke:
 *   Not measured until verified on device.
 */
export const ANDROID_BRIDGE_PHASE = "13-beta" as const;
