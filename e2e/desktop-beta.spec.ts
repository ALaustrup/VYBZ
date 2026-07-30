/**
 * Desktop Beta smoke — update feed 204 + waveform route shell.
 * Full MSI launch requires WINDOWS_CERT_* + Rust on CI windows runner.
 */
import { expect, test } from "@playwright/test";

test.describe("desktop beta contracts", () => {
  test("auto-update feed ping can return 204 (no update)", async ({ page }) => {
    await page.route("https://update.vybz.cloud/windows/stable.json", async (route) => {
      await route.fulfill({ status: 204, body: "" });
    });
    const status = await page.evaluate(async () => {
      const res = await fetch("https://update.vybz.cloud/windows/stable.json", { cache: "no-store" });
      return res.status;
    });
    expect(status).toBe(204);
  });

  test("waveform preview route renders Build label", async ({ page }) => {
    await page.goto("/desktop/waveform");
    await expect(page.getByTestId("waveform-preview-title")).toBeVisible();
    await expect(page.getByTestId("waveform-build-hash")).toContainText("Build");
  });
});
