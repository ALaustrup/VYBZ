# iOS Alpha — device scenarios (Phase 19)

CI runs Vitest Detox **contracts** + Playwright `e2e/ios-alpha.spec.ts`.
Full XCUITest / Detox device suite is owner-run until a macOS device farm is wired.

## Manual / Detox checklist

1. Install TestFlight build → open `vybz://release/{id}` → lands on `/release/:id`.
2. Open Universal Link `https://vybz.cloud/release/{id}` from Notes → same route.
3. Allow push → APNs token stored (`registerDeviceToken` platform `ios`).
4. Enqueue upload on `/mobile/uploads` → background → reconnect → completes.
5. Kill app → relaunch → sealed session still present (Keychain + AES-GCM).
