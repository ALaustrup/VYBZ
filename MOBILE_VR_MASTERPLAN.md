# MYVYB — Mobile & VR App Masterplan (Android · iOS · Quest 2/3/3S)

Strategy: **one codebase, many shells.** The existing React/Vite PWA is wrapped
with **Capacitor** for iOS + Android (and Android-based Quest), so ~100% of the
web app is reused. WebXR (`/xr`) powers the VR experience. This avoids a React
Native rewrite while giving native push, camera, haptics, geolocation, share, and
in-app purchase.

Foundation already in this repo:
- `capacitor.config.ts` (appId `app.myvyb`, `webDir: dist`).
- `@capacitor/core` + `@capacitor/cli` installed.
- Unified push backend (`push_subscriptions` table + `push-send` Edge Function)
  designed to also accept `platform = 'ios' | 'android'` tokens.

> Native builds + store submission require toolchains/accounts **not** available
> in the cloud agent VM (macOS/Xcode, Android Studio, Meta/Apple/Google dev
> accounts). The steps below are the runbook for a machine that has them.

---

## Phase 0 — Prerequisites
- Apple Developer account ($99/yr), Google Play Console ($25 once), Meta Horizon
  developer account.
- macOS + Xcode (iOS), Android Studio + JDK 17 (Android/Quest).
- Decide **IAP**: Apple/Google require in-app purchase for digital goods, so
  Godmode must move from Stripe to StoreKit (iOS) / Play Billing (Android). This
  is the single biggest commercial change — model the ~15–30% fee.

## Phase 1 — Wrappable PWA (done / in progress)
- PWA installable + offline (done). Web Push (done). Keep the web build the
  source of truth; native shells load `dist/`.

## Phase 2 — Android (Capacitor)
```bash
cd apps/veiled
npm i @capacitor/android @capacitor/app @capacitor/haptics @capacitor/share \
      @capacitor/camera @capacitor/geolocation @capacitor/push-notifications
npm run build
npx cap add android
npx cap sync android
npx cap open android   # build/run in Android Studio
```
- Push: FCM. Register the device token via the existing `savePushSubscription`
  with `platform: 'android'`; extend `push-send` to deliver FCM for those rows.
- Billing: Play Billing for Godmode.
- Permissions + Data Safety form (camera, location-approx, notifications).
- Release: Play Internal testing → Closed → Production.

## Phase 3 — iOS (Capacitor)
```bash
npm i @capacitor/ios
npx cap add ios && npx cap sync ios && npx cap open ios
```
- Push: APNs (Capacitor Push Notifications); store the token with `platform:'ios'`.
- Billing: StoreKit IAP for Godmode (required).
- Privacy: `PrivacyInfo.xcprivacy` manifest + App Store nutrition labels;
  NSCamera/NSLocation usage strings; Sign in with Apple only if other social
  logins are added (email/passkey today, so likely not required).
- Age rating: 17+ (opt-in NSFW + random chat).
- Release: TestFlight → App Store review.

## Phase 4 — VR (Quest 2/3/3S)
Quest runs Android, and `/xr` is already WebXR (Three.js). Two routes:
- **Fast:** ship `/xr` as a PWA in the Meta Quest Browser (no store review).
- **Store:** wrap a WebXR-loading Android APK (Capacitor) and submit to the Meta
  Horizon Store / App Lab.
- Optimize: foveated rendering, 72/90/120 Hz targets, draw-call budget; Quest
  3/3S get color passthrough / mixed reality.

## Cross-cutting
- **Unified push service:** one `push-send` fans out to Web Push + APNs + FCM by
  `platform`. Build once, reuse everywhere.
- **Deep links / universal links** for notification taps + sharing.
- **CI/CD:** Fastlane or EAS/Xcode Cloud + GitHub Actions; beta channels
  (TestFlight, Play Internal, Quest release channels).
- **Observability:** privacy-respecting analytics + crash reporting.

## ⚠️ Store-policy risks to validate early
- User-generated **NSFW** + **random chat** are heavily scrutinized by Apple,
  Google, and Meta. Our age layers + email/age/sex verification help, but stores
  may require stronger gating, human-moderation SLAs, or disabling NSFW on iOS.
  Validate policy fit **before** investing in store builds.
- **IAP migration** for Godmode is mandatory on iOS/Android.
