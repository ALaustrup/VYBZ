# Detox scenario — Android Beta (Phase 13)

**Contract test (no device):** `src/platform/android/offline-sync.contract.test.ts` (Vitest)

Covers: offline import → sealed prefs → reconnect sync · upload retry.

Kept out of Playwright `e2e/` Vitest-style files. Web smoke:
`e2e/android-beta.spec.ts`.

**Full Detox (optional when SDK + Detox installed):**

1. Import a WAV into a release
2. Toggle airplane mode / offline
3. Edit credits draft (KeyStore sealed prefs)
4. Enqueue upload; observe progress UI on `/mobile/uploads`
5. Reconnect → assert queue drains and mutations remain flushable
6. Open `vybz://release/{id}` and land on `/release/{id}`
