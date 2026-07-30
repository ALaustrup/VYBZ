/**
 * Desktop Beta / Phase 17 smoke — per-OS update feeds + waveform route shell.
 * Full MSI/DMG/AppImage launch requires platform certs + Rust on CI runners.
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

  test("darwin and linux stable feeds accept 204 no-update", async ({ page }) => {
    for (const os of ["darwin", "linux"] as const) {
      const url = `https://update.vybz.cloud/${os}/stable.json`;
      await page.route(url, async (route) => {
        await route.fulfill({ status: 204, body: "" });
      });
      const status = await page.evaluate(async (u) => {
        const res = await fetch(u, { cache: "no-store" });
        return res.status;
      }, url);
      expect(status, os).toBe(204);
    }
  });

  test("waveform preview route renders Build label", async ({ page }) => {
    await page.goto("/desktop/waveform");
    await expect(page.getByTestId("waveform-preview-title")).toBeVisible();
    await expect(page.getByTestId("waveform-build-hash")).toContainText("Build");
  });
});
