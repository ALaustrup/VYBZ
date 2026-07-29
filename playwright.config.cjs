const { defineConfig, devices } = require("@playwright/test");

const PREVIEW_HOST = "127.0.0.1";
const PREVIEW_PORT = 4173;
const PREVIEW_ORIGIN = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;
/** Concrete readiness probe — must return 200 once Vite preview is serving dist. */
const PREVIEW_READY_URL = `${PREVIEW_ORIGIN}/index.html`;

/**
 * Suite Genesis e2e / a11y smoke against production `dist/` via Vite preview.
 *
 * Prefer `npm run test:e2e` (scripts/run-e2e.mjs), which builds dist, starts
 * preview, waits for PREVIEW_READY_URL, runs Playwright, then stops preview.
 * When PLAYWRIGHT_SKIP_WEBSERVER is unset, Playwright can also start preview.
 */
module.exports = defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? PREVIEW_ORIGIN,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `node ./node_modules/vite/bin/vite.js preview --host ${PREVIEW_HOST} --port ${PREVIEW_PORT} --strictPort`,
        url: PREVIEW_READY_URL,
        reuseExistingServer: false,
        timeout: 60_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
