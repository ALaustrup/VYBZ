# Detox scenario — Android Alpha (Phase 6 / 2.A)

**Contract test (no device):** `src/platform/android/offline-sync.contract.test.ts` (Vitest)

Kept out of Playwright `e2e/` so web e2e does not load Vitest files.

**Full Detox (optional when SDK + Detox installed):**

1. Import a WAV into a release
2. Toggle airplane mode / offline
3. Edit credits draft (sealed prefs)
4. Reconnect
5. Assert upload queue drains and mutations remain flushable
