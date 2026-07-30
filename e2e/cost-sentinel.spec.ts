/**
 * Playwright — Cost Sentinel dashboard chart + ≥90% alert banner (seeded fixture).
 */
import { expect, test } from "@playwright/test";

test.describe("Cost Sentinel dashboard", () => {
  test("seeded fixture shows stacked chart and cap alert banner", async ({ page }) => {
    await page.goto("/__e2e__/cost-sentinel");
    await expect(page.getByTestId("cost-sentinel-e2e-fixture")).toBeVisible();
    await expect(page.getByTestId("cost-sentinel-page")).toBeVisible();
    await expect(page.getByTestId("cost-stacked-chart")).toBeVisible();
    await expect(page.getByTestId("cost-chart-bar").first()).toBeVisible();
    await expect(page.getByTestId("cost-cap-alert-banner")).toBeVisible();
    await expect(page.getByTestId("cost-events-table")).toBeVisible();
    await expect(page.getByTestId("cost-event-row").first()).toBeVisible();
  });

  test("settings costs path still exposes Usage heading when reachable", async ({ page }) => {
    await page.goto("/settings/costs");
    await expect(page.locator("body")).toBeVisible();
    const sentinel = page.getByTestId("cost-sentinel-page");
    if ((await sentinel.count()) > 0) {
      await expect(page.getByRole("heading", { name: /Usage/i })).toBeVisible();
    }
  });
});
